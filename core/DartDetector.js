// Status enumeration
const DartDetectorStatus = {
  INITIALIZING: 0,
  DETECTING: 1,
  PAUSE: 2,
  DETECTED: 3,
};

/**
 * Base class for dart impact detection systems
 */
class DartDetector {
  constructor(modelPath = "../models/best_temporal_A.onnx", modelSize = 640) {
    this.pauseDetection = false;
    this.currentStatus = DartDetectorStatus.INITIALIZING;
    this.statusChangeCallbacks = [];
    this.onDetectionCallbacks = [];
    this.modelPath = modelPath;
    this.modelSize = modelSize;
    this.initializeModel();
  }

  async initializeModel() {
    try {
      let properties = gpuDetector.status == "webgpu" ? { executionProviders: ["webgpu"] } : null;
      this.session = await ort.InferenceSession.create(this.modelPath, properties);
      console.log("Modèle ONNX chargé avec succès:", this.session);
      if (this.initCallback) this.initCallback();
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      // Utiliser un modèle de démo si le vrai modèle n'est pas disponible
      this.session = null;
      //if (this.initCallback) this.initCallback();
    }
  }

  async infer(obj) {
    if (!this.session) {
      return null;
    }
    var imageData = ImageProcessor.grayscaleToYOLOInput(obj.delta, this.modelSize, this.modelSize);
    try {
      console.log(imageData);
      //const tensor = new ort.Tensor(Float32Array.from(imageData), [1, 3, 640, 640]);
      const tensor = new ort.Tensor(Float32Array.from(imageData.data), [1, 3, this.modelSize, this.modelSize]);
      const results = await this.session.run({ images: tensor });
      //console.log("Results:", results);
      const boxes = YOLO.processYoloOnnxResults(results);
      obj.boxes = boxes;
      this.onDetectionCallbacks.forEach((cb) => cb(obj));
      //return this.processOnnxResults(results);
    } catch (error) {
      console.error("Erreur lors de l'inférence:", error);
      return null;
    }
  }

  /**
   * Add a callback function to be called when status changes
   * @param {Function} callback - Function to call on status change (newStatus, oldStatus) => {}
   */
  addStatusChangeCallback(callback) {
    if (typeof callback === "function") {
      this.statusChangeCallbacks.push(callback);
    }
  }

  /**
   * Remove a status change callback
   * @param {Function} callback - The callback function to remove
   */
  removeStatusChangeCallback(callback) {
    const index = this.statusChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Update the current status and notify callbacks
   * @param {number} newStatus - The new status value
   */
  updateStatus(newStatus) {
    const oldStatus = this.currentStatus;
    if (oldStatus !== newStatus) {
      this.currentStatus = newStatus;

      // Notify all callbacks
      this.statusChangeCallbacks.forEach((callback) => {
        try {
          callback(newStatus, oldStatus);
        } catch (error) {
          console.error("Error in status change callback:", error);
        }
      });
    }
  }

  /**
   * Get the current status
   * @returns {number} Current status
   */
  getStatus() {
    return this.currentStatus;
  }

  /**
   * Get status name as string
   * @param {number} status - Status value
   * @returns {string} Status name
   */
  getStatusName(status) {
    const statusNames = {
      [DartDetectorStatus.INITIALIZING]: "INITIALIZING",
      [DartDetectorStatus.DETECTING]: "DETECTING",
      [DartDetectorStatus.PAUSE]: "PAUSE",
      [DartDetectorStatus.DETECTED]: "DETECTED",
    };
    return statusNames[status] || "UNKNOWN";
  }

  start() {
    this.updateStatus(DartDetectorStatus.INITIALIZING);
    // Placeholder implementation
  }

  stop() {
    // Placeholder implementation
  }

  onNewFrame(canvas) {
    // Process a new video frame
    return null;
  }
}

/**
 * Video-only dart impact detector using pure JavaScript
 */
class DeltaVideoOnlyDartDetector extends DartDetector {
  constructor() {
    super();
    this.lastGray = null;
    this.lastDiff = null;
    this.lastDartTime = -1;
    this.temporalFilter = 200; // ms to wait to validate
    this.minMovementPct = 0.4;
    this.maxMovementPct = 10.0;
    this.threshold = 10.2;
    this.detectionCount = 0;
    this.debug = false;
  }

  start() {
    super.start();
    // Simulate initialization process
    setTimeout(() => {
      this.updateStatus(DartDetectorStatus.DETECTING);
    }, 500);
  }

  onPause() {
    this.updateStatus(DartDetectorStatus.PAUSE);
    this.lastGray = null;
    this.lastDiff = null;
    this.lastDartTime = -1;
  }

  resume() {
    this.updateStatus(DartDetectorStatus.DETECTING);
  }

  onNewFrame(imageData) {
    if (this.currentStatus === DartDetectorStatus.INITIALIZING || this.currentStatus === DartDetectorStatus.PAUSE) {
      return false;
    }

    let detect = false;

    // Convert to grayscale
    const currentGray = ImageProcessor.rgbToGrayscale(imageData);

    if (this.lastGray !== null) {
      // Compute difference between current and last frame
      const diff = ImageProcessor.absDiff(currentGray, this.lastGray);

      if (this.lastDiff !== null) {
        // Compute delta between current and last difference
        const delta = ImageProcessor.absDiff(diff, this.lastDiff);

        // Apply threshold and count significant changes
        const thresholded = ImageProcessor.threshold(delta, this.threshold);
        const nonZero = ImageProcessor.countNonZero(thresholded);
        const pct = (nonZero * 100.0) / (delta.width * delta.height);

        const potentialDartMovement = pct > this.minMovementPct && pct < this.maxMovementPct;

        if (potentialDartMovement) {
          const timestamp = Date.now();
          if (this.debug) console.log(`${timestamp}: potential_dart_movement ${pct.toFixed(1)}%`);

          // Temporal filtering
          detect = false;
          if (this.temporalFilter < 0) {
            detect = true;
          } else {
            if (this.lastDartTime < 0) {
              this.lastDartTime = Date.now();
            } else {
              const elapsed = Date.now() - this.lastDartTime;
              detect = elapsed >= this.temporalFilter;
            }
          }

          if (detect) {
            this.updateStatus(DartDetectorStatus.DETECTED);
            this.lastDartTime = -1;
            this.detectionCount++;
            this.infer({ delta: delta, pct: pct });
            // Reset to detecting after a brief period
            setTimeout(() => {
              if (this.currentStatus === DartDetectorStatus.DETECTED) {
                this.updateStatus(DartDetectorStatus.DETECTING);
              }
            }, 1000);
          }
        }

        // Display debug views
        //this.displayGrayscale(delta, "deltaCanvas");
      }

      if (this.lastDiff === null || this.lastDartTime < 0) {
        this.lastDiff = diff;
      }

      //this.displayGrayscale(diff, "diffCanvas");
    } else {
      this.lastGray = currentGray;
    }

    return detect;
  }

  // displayGrayscale(grayImg, canvasId) {
  //   const canvas = document.getElementById(canvasId);
  //   const ctx = canvas.getContext("2d");

  //   // Resize to canvas dimensions
  //   const resized = ImageProcessor.resizeGrayscale(grayImg, canvas.width, canvas.height);
  //   const imageData = ImageProcessor.grayscaleToImageData(resized);

  //   ctx.putImageData(imageData, 0, 0);
  // }

  updateSettings(temporalFilter, minMovement, maxMovement, threshold) {
    this.temporalFilter = temporalFilter;
    this.minMovementPct = minMovement;
    this.maxMovementPct = maxMovement;
    this.threshold = threshold;
  }
}

// Accelerometer Dart Impact Detector
class AccelerometerDartImpactDetector extends DartDetector {
  constructor(detectorUrl = "http://192.168.31.102:80", mqttBroker = location.hostname, mqttPort = 8083) {
    super();
    this.url = detectorUrl;
    this.mqttBroker = mqttBroker;
    this.mqttPort = mqttPort;
    this.config = {
      threshold: 0.03,
      min_delay_between_taps: 150,
      tap_duration_min: 2,
      tap_duration_max: 150,
      enable_filtering: true,
      filter_alpha: 0.7,
      sensitivity: 50,
      debug: false,
      use_adaptive_threshold: true,
      noise_window: 0.2,
      peak_ratio: 1.2,
      use_derivative: true,
      derivative_threshold: 0.8,
    };

    this.mqttClient = null;
    this.lastImpact = null;
    this.isStarted = false;
  }

  start() {
    if (this.isStarted) return;

    super.start(); // This sets status to INITIALIZING

    try {
      // Create MQTT client
      const clientId = "dartDetector_" + Math.random().toString(16).substr(2, 8);
      this.mqttClient = new Paho.MQTT.Client(this.mqttBroker, Number(this.mqttPort), clientId);

      // Set callback handlers
      this.mqttClient.onConnectionLost = this.onConnectionLost.bind(this);
      this.mqttClient.onMessageArrived = this.onMessage.bind(this);

      // Connect to MQTT broker
      this.mqttClient.connect({
        onSuccess: this.onConnect.bind(this),
        onFailure: this.onConnectFailure.bind(this),
      });

      console.log("Starting MQTT client...");
      document.getElementById("startBtn").disabled = true;
      document.getElementById("stopBtn").disabled = false;
    } catch (error) {
      console.log("Error starting detector: " + error.message);
      this.updateStatus(DartDetectorStatus.PAUSE);
    }
  }

  stop() {
    if (!this.isStarted) return;

    if (this.mqttClient && this.mqttClient.isConnected()) {
      this.mqttClient.disconnect();
    }

    this.isStarted = false;
    console.log("Detector stopped");
    this.updateStatus(DartDetectorStatus.PAUSE);
  }

  async getConfig() {
    try {
      this.updateStatus(DartDetectorStatus.INITIALIZING);
      const response = await fetch(`${this.url}/api/config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.config = await response.json();
      console.log("Configuration retrieved successfully");
      console.log("Current config:", this.config);
      return this.config;
    } catch (error) {
      console.log("Failed to get config: " + error.message);
      throw error;
    }
  }

  async setConfig() {
    try {
      this.updateStatus(DartDetectorStatus.INITIALIZING);
      const response = await fetch(`${this.url}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.config),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      console.log("Configuration updated successfully");
    } catch (error) {
      console.log("Failed to set config: " + error.message);
      throw error;
    }
  }

  async calibrate() {
    try {
      this.updateStatus(DartDetectorStatus.INITIALIZING);
      const response = await fetch(`${this.url}/api/calibrate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      console.log("Calibration completed successfully");
    } catch (error) {
      console.log("Failed to calibrate: " + error.message);
    }
  }

  onConnect() {
    console.log("Connected to MQTT broker");
    this.mqttClient.subscribe("#");
    this.isStarted = true;
    this.updateStatus(DartDetectorStatus.DETECTING);
  }

  onConnectFailure(error) {
    console.log("Failed to connect to MQTT broker: " + error.errorMessage);
    this.updateStatus(DartDetectorStatus.PAUSE);
  }

  onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("Connection lost: " + responseObject.errorMessage);
      this.isStarted = false;
      this.updateStatus(DartDetectorStatus.PAUSE);
    }
  }

  onMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    console.log(`MQTT: ${topic} - ${payload}`);

    if (topic.includes("sensors/tap")) {
      this.playSound();
      this.lastImpact = Date.now();
      this.updateStatus(DartDetectorStatus.DETECTED);

      // Reset to detecting after a brief period
      setTimeout(() => {
        if (this.currentStatus === DartDetectorStatus.DETECTED) {
          this.updateStatus(DartDetectorStatus.DETECTING);
        }
      }, 1000);
    }
  }

  playSound() {
    // Create and play a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  // Override the updateStatus method to also update UI
  updateStatus(newStatus) {
    super.updateStatus(newStatus);
    this.updateStatusDisplay(newStatus);
  }

  //   updateStatusDisplay(status) {
  //     const statusElement = document.getElementById("status");
  //     if (!statusElement) return;

  //     statusElement.className = "status";

  //     switch (status) {
  //       case DartDetectorStatus.INITIALIZING:
  //         statusElement.classList.add("initializing");
  //         statusElement.textContent = "⚙️ INITIALIZING";
  //         break;
  //       case DartDetectorStatus.DETECTING:
  //         statusElement.classList.add("detecting");
  //         statusElement.textContent = "🔍 DETECTING";
  //         break;
  //       case DartDetectorStatus.PAUSE:
  //         statusElement.classList.add("paused");
  //         statusElement.textContent = "⏸️ PAUSED";
  //         break;
  //       case DartDetectorStatus.DETECTED:
  //         statusElement.classList.add("detected");
  //         statusElement.textContent = "🎯 IMPACT DETECTED!";
  //         break;
  //     }
  //   }
}

// Queue implementation for frame buffering
class Queue {
  constructor(maxSize) {
    this.items = [];
    this.maxSize = maxSize;
  }

  put(item) {
    if (this.items.length >= this.maxSize) {
      this.items.shift(); // Remove oldest item
    }
    this.items.push(item);
  }

  get() {
    return this.items.shift();
  }

  qsize() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

// Delta Video Accelerometer Impact Detector
class DeltaVideoAccelImpactDetector extends AccelerometerDartImpactDetector {
  constructor(
    detectorUrl = "http://192.168.31.102:80",
    mqttBroker = location.hostname,
    mqttPort = 8083,
    burstLength = 20,
    extraWaitFrames = 10
  ) {
    super(detectorUrl, mqttBroker, mqttPort);
    this.burstLength = burstLength;
    this.extraWaitFrames = extraWaitFrames;
    this.burst = new Queue(burstLength + extraWaitFrames);
    this.countDownCpt = 0;
  }

  start() {
    super.start();
    this.burst.clear();
  }

  onPause() {
    this.updateStatus(DartDetectorStatus.PAUSE);
    this.burst.clear();
  }

  resume() {
    this.updateStatus(DartDetectorStatus.DETECTING);
  }

  onNewFrame(imageData) {
    if (this.currentStatus === DartDetectorStatus.INITIALIZING || this.currentStatus === DartDetectorStatus.PAUSE) {
      return null;
    }

    let ret = null;
    const maxFrames =
      this.currentStatus === DartDetectorStatus.DETECTED ? this.burstLength + this.extraWaitFrames : this.burstLength;

    if (this.burst.qsize() >= maxFrames) {
      this.burst.get();
      if (this.currentStatus === DartDetectorStatus.DETECTED) {
        ret = this.computeDelta();
        this.updateStatus(DartDetectorStatus.DETECTING);
      }
    }

    this.burst.put(imageData);
    return ret;
  }

  onMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    if (topic.includes("sensors/tap")) {
      this.playSound();
      console.log(`DeltaVideo: ${topic} - ${payload}`);
      this.countDownCpt = this.extraWaitFrames;
      this.updateStatus(DartDetectorStatus.DETECTED);
    }
  }

  computeDelta() {
    if (this.burst.qsize() < 2) return null;

    const first = this.burst.get();
    let last = null;

    while (this.burst.qsize() > 0) {
      last = this.burst.get();
    }

    if (!first || !last) return null;

    // Compute difference between first and last frames
    const delta = this.computeImageDifference(first, last);
    //this.displayDelta(delta);

    return delta;
  }

  computeImageDifference(img1, img2) {
    const width = img1.width;
    const height = img1.height;
    const deltaCanvas = document.getElementById("deltaCanvas");
    const deltaCtx = deltaCanvas.getContext("2d");

    deltaCanvas.width = width;
    deltaCanvas.height = height;

    const deltaImageData = deltaCtx.createImageData(width, height);
    const data1 = img1.data;
    const data2 = img2.data;
    const deltaData = deltaImageData.data;

    for (let i = 0; i < data1.length; i += 4) {
      // Convert to grayscale and compute absolute difference
      const gray1 = (data1[i] * 0.299 + data1[i + 1] * 0.587 + data1[i + 2] * 0.114) / 255.0;
      const gray2 = (data2[i] * 0.299 + data2[i + 1] * 0.587 + data2[i + 2] * 0.114) / 255.0;
      const diff = Math.abs(gray1 - gray2) * 255;

      deltaData[i] = diff; // R
      deltaData[i + 1] = diff; // G
      deltaData[i + 2] = diff; // B
      deltaData[i + 3] = 255; // A
    }

    return deltaImageData;
  }
}

// Example usage of status callbacks
function setupStatusCallbacks(detector) {
  // Add a callback to log status changes
  detector.addStatusChangeCallback((newStatus, oldStatus) => {
    console.log(`Status changed from ${detector.getStatusName(oldStatus)} to ${detector.getStatusName(newStatus)}`);
  });

  // Add a callback to update UI elements based on status
  detector.addStatusChangeCallback((newStatus, oldStatus) => {
    const statusIndicator = document.getElementById("statusIndicator");
    if (statusIndicator) {
      statusIndicator.style.backgroundColor = getStatusColor(newStatus);
    }
  });
}

function getStatusColor(status) {
  switch (status) {
    case DartDetectorStatus.INITIALIZING:
      return "#FFA500"; // Orange
    case DartDetectorStatus.DETECTING:
      return "#00FF00"; // Green
    case DartDetectorStatus.PAUSE:
      return "#FFFF00"; // Yellow
    case DartDetectorStatus.DETECTED:
      return "#FF0000"; // Red
    default:
      return "#808080"; // Gray
  }
}
