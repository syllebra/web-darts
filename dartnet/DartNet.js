class DartNet {
  constructor(videoSource, mqttBroker = "192.168.31.120", mqttStatusCallback = null) {
    this.processingCanvas = null;
    this.videoSource = videoSource;
    this.board = new Board();
    this.cropArea = null;
    this.sourceCalibPts = null;
    this.M = null; //Transformation matrix from source image to board ref
    this.Mi = null; //Transformation matrix from board ref to source image
    this.targetDetector = null;
    this.dartDetector = null;
    this.mqttBroker = mqttBroker;
    this.mqttPort = 8083;
    this.mqttClient = null;
    this.mqttStatusCallback = mqttStatusCallback;
    this.calibrationPairFactor = 1.0;
    this.initDetectors();
  }

  initMqtt() {
    try {
      console.log("Starting MQTT client...");
      // Create MQTT client
      const clientId = "DARTNET_" + Math.random().toString(16).substr(2, 8);
      this.mqttClient = new Paho.MQTT.Client(this.mqttBroker, Number(this.mqttPort), clientId);

      // Set callback handlers
      this.mqttClient.onConnectionLost = this.onMqttConnectionLost.bind(this);
      this.mqttClient.onMessageArrived = this.onMqttMessage.bind(this);

      this.updateMqttStatus("connecting");
      // Connect to MQTT broker
      this.mqttClient.connect({
        onSuccess: this.onMqttConnect.bind(this),
        onFailure: this.onMqttConnectFailure.bind(this),
      });
    } catch (error) {
      console.error("Unable to initialize mqtt:", this.mqttBroker, error);
    }
  }

  updateMqttStatus(status) {
    if (this.mqttStatusCallback) this.mqttStatusCallback(status);
  }

  onMqttConnect() {
    console.log("Connected to MQTT broker");
    this.mqttClient.subscribe("#");
    this.isStarted = true;
    this.updateMqttStatus("connected");
  }

  onMqttConnectFailure(error) {
    console.error("Failed to connect to MQTT broker: " + error.errorMessage);
    this.updateMqttStatus("error");
  }

  onMqttConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("Connection lost: " + responseObject.errorMessage);
      this.isStarted = false;
      this.updateMqttStatus("disconnected");
    }
  }

  onMqttMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    console.log(`MQTT: ${topic} - ${payload}`);

    // if (topic.includes("sensors/tap")) {
    //   this.playSound();
    //   this.lastImpact = Date.now();
    //   this.updateStatus(DartDetectorStatus.DETECTED);

    //   // Reset to detecting after a brief period
    //   setTimeout(() => {
    //     if (this.currentStatus === DartDetectorStatus.DETECTED) {
    //       this.updateStatus(DartDetectorStatus.DETECTING);
    //     }
    //   }, 1000);
    // }
  }

  async initDetectors() {
    if (!this.targetDetector) {
      this.targetDetector = new YoloTargetDetector(
        this.board,
        "../models/best_n_tip_boxes_cross_640_B.onnx",
        640,
        false
      );
    } else this.targetDetector.initializeModel();

    if (!this.dartDetector) {
      switch (settingsManager.getSetting("dart", "type")) {
        case "vai":
          this.dartDetector = new DeltaVideoAccelImpactDetector(
            settingsManager.getSetting("dart", "vaiURL"),
            settingsManager.getSetting("mqtt", "brokerIP"),
            settingsManager.getSetting("mqtt", "port"),
            settingsManager.getSetting("dart", "vaiBurstLength"),
            settingsManager.getSetting("dart", "vaiExtraWaitFrames")
          );
          break;

        case "vo":
          this.dartDetector = new DeltaVideoOnlyDartDetector();
          break;
      }

      if (this.dartDetector) {
        this.dartDetector.onDetectionCallbacks.push(this.onDetectedDartImpact);
        this.dartDetector.minConfidence = settingsManager.getSetting("dart", "confidence") * 0.01;
        this.dartDetector.iouThreshold = settingsManager.getSetting("dart", "nms") * 0.01;
      }
    } else this.dartDetector.initializeModel();
    this.dartDetector.start();
  }

  preprocessImageForModel(srcBox = null, modelSize = 640) {
    // const { width, height } = imageData;
    let inputBox = srcBox ? srcBox : [0, 0, this.videoSource.videoWidth, this.videoSource.videoHeight];

    if (!this.processingCanvas) this.processingCanvas = document.getElementById("processingCanvas");
    if (!this.processingCanvas) {
      this.processingCanvas = document.createElement("canvas");
      this.processingCanvas.id = "processingCanvas";
    }
    this.processingCanvas.width = modelSize;
    this.processingCanvas.height = modelSize;

    const cropContext = this.processingCanvas.getContext("2d", { willReadFrequently: true });
    cropContext.drawImage(
      this.videoSource,
      inputBox[0],
      inputBox[1],
      inputBox[2] - inputBox[0],
      inputBox[3] - inputBox[1],
      0,
      0,
      modelSize,
      modelSize
    );

    const imgData = cropContext.getImageData(0, 0, modelSize, modelSize);
    return imgData;
  }

  normalizedToSource(p) {
    // Assumed that p is [0..1,0..1] normalized inside the cropped area
    return [
      this.cropArea[0] + p[0] * (this.cropArea[2] - this.cropArea[0]),
      this.cropArea[1] + p[1] * (this.cropArea[3] - this.cropArea[1]),
    ];
  }

  dartModelToSource(p) {
    const ratio = this.targetDetector.modelSize / this.dartDetector.modelSize;
    const cropped = [p[0] * ratio, p[1] * ratio];
    return croppedToSource(cropped);
  }

  updateCalibPoints(newPts) {
    this.sourceCalibPts = newPts;
    this.M = PerspectiveUtils.getPerspectiveTransform(this.sourceCalibPts, this.board.board_cal_pts);
    this.Mi = PerspectiveUtils.getPerspectiveTransform(this.board.board_cal_pts, this.sourceCalibPts);
  }

  async calibrate() {
    if (!this.targetDetector) {
      throw Error("❌ Target detector not ready");
    }

    if (!this.videoSource.videoWidth) {
      throw Error("❌ Camera not ready");
    }

    console.log("Capturing and analyzing frame");

    this.cropArea = null;
    this.sourceCalibPts = null;
    this.M = null;
    this.Mi = null;

    let imgData = this.preprocessImageForModel(null, this.targetDetector.modelSize);
    let input = ImageProcessor.normalizeToYOLOinput(imgData).data;

    const debugCanvas = null; //document.getElementById("debugCanvas");
    const debugCtx = debugCanvas?.getContext("2d");
    if (debugCanvas) {
      debugCanvas.width = imgData.width;
      debugCanvas.height = imgData.height;
      debugCanvas.style.width = "" + imgData.width + "px";
      debugCanvas.style.height = "" + imgData.height + "px";

      debugCtx.putImageData(imgData, 0, 0);
    }

    // proportional threshold for image width (30px for 640)
    const distanceThreshold = (this.calibrationPairFactor * (30.0 * this.targetDetector.modelSize)) / 640.0;
    console.debug(
      "Calibration pair factor:",
      self.calibrationPairFactor,
      " computed distance threshold:",
      distanceThreshold
    );

    let results = await this.targetDetector.detect(input, debugCtx, distanceThreshold);
    if (results?.calibrationPoints) {
      let sourceCalib = results.calibrationPoints.map((p) => [
        (p[0] * this.videoSource.videoWidth) / this.targetDetector.modelSize,
        (p[1] * this.videoSource.videoHeight) / this.targetDetector.modelSize,
      ]);
      let crop = autoCrop(sourceCalib, this.videoSource.videoWidth, this.videoSource.videoHeight);
      console.debug("Auto Crop:", crop);
      this.cropArea = [crop[0], crop[1], crop[2], crop[3]];
      imgData = this.preprocessImageForModel(this.cropArea, this.targetDetector.modelSize);
      input = ImageProcessor.normalizeToYOLOinput(imgData).data;

      if (debugCanvas) {
        debugCanvas.width = imgData.width;
        debugCanvas.height = imgData.height;
        debugCanvas.style.width = "" + imgData.width + "px";
        debugCanvas.style.height = "" + imgData.height + "px";

        debugCtx.putImageData(imgData, 0, 0);
      }

      let calibration = await this.targetDetector.detect(input, debugCtx, distanceThreshold);
      console.log("Calibration:", calibration);
      if (!calibration) {
        console.warn("Unable to find target in croped area... Using previous (bad) one");
        this.cropArea = [0, 0, this.videoSource.videoWidth, this.videoSource.videoHeight];
        calibration = results;
      }
      console.debug("CALIB POINTS:", calibration.calibrationPoints);
      this.sourceCalibPts = calibration.calibrationPoints.map((p) =>
        this.normalizedToSource([p[0] / this.targetDetector.modelSize, p[1] / this.targetDetector.modelSize])
      );
      console.debug("SOURCE CALIB POINTS:", this.sourceCalibPts);
      this.updateCalibPoints(this.sourceCalibPts);
    } else {
      console.warn("Unable to find initial target to auto crop...");
      throw Error("Unable to find initial target to auto crop...");
    }
  }

  async detectDartImpact() {
    if (!this.dartDetector) return;
    const imgData = this.preprocessImageForModel(this.cropArea, this.dartDetector.modelSize);
    this.dartDetector.onNewFrame(imgData);
  }

  async onDetectedDartImpact(data) {
    console.log("DartImpact:", data);
  }
}
