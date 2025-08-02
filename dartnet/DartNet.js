class DartNet {
  constructor(videoSource, mqttBroker = "192.168.10.25", mqttStatusCallback = null) {
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

    if (!this.dartDetectorVAI) {
      this.dartDetectorVAI = new DeltaVideoAccelImpactDetector(); //new DeltaVideoOnlyDartDetector();
      this.dartDetectorVAI.onDetectionCallbacks.push(this.onDetectedDartImpact);
    } else this.dartDetectorVAI.initializeModel();

    if (!this.dartDetectorVO) {
      this.dartDetectorVO = new DeltaVideoOnlyDartDetector();
      this.dartDetectorVO.onDetectionCallbacks.push(this.onDetectedDartImpact);
    } else this.dartDetectorVO.initializeModel();

    this.dartDetector = this.dartDetectorVO;
    this.dartDetector.start();
  }

  switchDartDetector() {
    if (this.dartDetector) this.dartDetector.stop();
    this.dartDetector = this.dartDetector == this.dartDetectorVAI ? this.dartDetectorVO : this.dartDetectorVAI;
    console.log("Starting " + (this.dartDetector == this.dartDetectorVAI ? "VAI" : "VO"));
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
      inputBox[2],
      inputBox[3],
      0,
      0,
      modelSize,
      modelSize
    );

    const imgData = cropContext.getImageData(0, 0, modelSize, modelSize);
    return imgData;
  }

  cropppedToSource(p) {
    return [
      this.cropArea[0] + (p[0] * this.cropArea[2]) / this.targetDetector.modelSize,
      this.cropArea[1] + (p[1] * this.cropArea[3]) / this.targetDetector.modelSize,
    ];
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

    //this.showLoading(true);
    console.log("Capturing and analyzing frame");

    this.cropArea = null;
    this.sourceCalibPts = null;
    this.M = null;
    this.Mi = null;
    // try {
    let imgData = this.preprocessImageForModel(null, this.targetDetector.modelSize);
    let input = ImageProcessor.normalizeToYOLOinput(imgData).data;
    //const cropContext = zoomableCanvas.getOverlayContext();
    const cropContext = this.processingCanvas.getContext("2d", { willReadFrequently: true });
    let results = await this.targetDetector.detect(input, cropContext);
    if (results?.calibrationPoints) {
      let sourceCalib = results.calibrationPoints.map((p) => [
        (p[0] * this.videoSource.videoWidth) / this.targetDetector.modelSize,
        (p[1] * this.videoSource.videoHeight) / this.targetDetector.modelSize,
      ]);
      //   console.log(this.targetDetector.modelSize);
      //   console.log(this.videoSource.videoWidth, this.videoSource.videoHeight);
      //   console.log(results.calibrationPoints);
      //   console.log(sourceCalib);
      let crop = autoCrop(sourceCalib, this.videoSource.videoWidth, this.videoSource.videoHeight);
      console.log("Auto Crop:", crop);
      this.cropArea = [crop[0], crop[1], crop[2], crop[3]];
      imgData = this.preprocessImageForModel(this.cropArea, this.targetDetector.modelSize);
      input = ImageProcessor.normalizeToYOLOinput(imgData).data;
      let calibration = await this.targetDetector.detect(input, cropContext);
      console.log("Calibration:", calibration);
      if (!calibration) {
        console.warn("Unable to find target in croped area... Using previous (bad) one");
        this.cropArea = [0, 0, this.videoSource.videoWidth, this.videoSource.videoHeight];
        calibration = results;
      }
      this.sourceCalibPts = calibration.calibrationPoints.map((p) => this.cropppedToSource(p));
      this.updateCalibPoints(this.sourceCalibPts);
    } else {
      console.warn("Unable to find initial target to auto crop...");
      throw Error("Unable to find initial target to auto crop...");
    }
    //zoomableCanvas.getOverlayContext();

    //     if (this.onnxSession) {
    //         await this.runInference();
    //     }
    // } catch (error) {
    //     this.log('Capture and analyze error: ' + error.message);
    //     this.updateStatus('❌ Error during processing: ' + error.message, 'error');
    // } finally {
    //     this.showLoading(false);
    // }
    //this.showLoading(false);
  }

  async detectDartImpact() {
    if (!this.dartDetector) return;
    const imgData = this.preprocessImageForModel(this.cropArea, this.targetDetector.modelSize);
    this.dartDetector.onNewFrame(imgData);
  }

  async onDetectedDartImpact(data) {
    //console.log("DartImpact:", data);
  }
}
