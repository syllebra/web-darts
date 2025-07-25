// Status enumeration
const Status = {
  DETECTING: 1,
  PAUSE: 2,
  DETECTED: 3,
};

/**
 * Base class for dart impact detection systems
 */
class DartDetector {
  constructor() {
    this.pauseDetection = false;
  }

  start() {
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
    this.onDetectionCallback = null;
  }

  onPause() {
    this.lastGray = null;
    this.lastDiff = null;
    this.lastDartTime = -1;
  }

  onNewFrame(imageData) {
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
          this.log(`${timestamp}: potential_dart_movement ${pct.toFixed(1)}%`);

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
            this.lastDartTime = -1;
            this.detectionCount++;
            if (this.onDetectionCallback) {
              this.onDetectionCallback(delta, pct);
            }
          }
        }

        // Display debug views
        this.displayGrayscale(delta, "deltaCanvas");
      }

      if (this.lastDiff === null || this.lastDartTime < 0) {
        this.lastDiff = diff;
      }

      this.displayGrayscale(diff, "diffCanvas");
    } else {
      this.lastGray = currentGray;
    }

    return detect;
  }

  displayGrayscale(grayImg, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Resize to canvas dimensions
    const resized = ImageProcessor.resizeGrayscale(grayImg, canvas.width, canvas.height);
    const imageData = ImageProcessor.grayscaleToImageData(resized);

    ctx.putImageData(imageData, 0, 0);
  }

  log(message) {
    const logOutput = document.getElementById("logOutput");
    const timestamp = new Date().toLocaleTimeString();
    logOutput.innerHTML += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
  }

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

      this.log("Starting MQTT client...");
      document.getElementById("startBtn").disabled = true;
      document.getElementById("stopBtn").disabled = false;
    } catch (error) {
      this.log("Error starting detector: " + error.message);
    }
  }

  stop() {
    if (!this.isStarted) return;

    if (this.mqttClient && this.mqttClient.isConnected()) {
      this.mqttClient.disconnect();
    }

    this.isStarted = false;
    this.log("Detector stopped");
    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;
    this.updateStatus(Status.DETECTING);
  }

  async getConfig() {
    try {
      const response = await fetch(`${this.url}/api/config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.config = await response.json();
      this.log("Configuration retrieved successfully");
      console.log("Current config:", this.config);
      return this.config;
    } catch (error) {
      this.log("Failed to get config: " + error.message);
      throw error;
    }
  }

  async setConfig() {
    try {
      const response = await fetch(`${this.url}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.config),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.log("Configuration updated successfully");
    } catch (error) {
      this.log("Failed to set config: " + error.message);
      throw error;
    }
  }

  async calibrate() {
    try {
      const response = await fetch(`${this.url}/api/calibrate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.log("Calibration completed successfully");
    } catch (error) {
      this.log("Failed to calibrate: " + error.message);
    }
  }

  onConnect() {
    this.log("Connected to MQTT broker");
    this.mqttClient.subscribe("#");
    this.isStarted = true;
    this.updateStatus(Status.DETECTING);
  }

  onConnectFailure(error) {
    this.log("Failed to connect to MQTT broker: " + error.errorMessage);
    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;
  }

  onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      this.log("Connection lost: " + responseObject.errorMessage);
      this.isStarted = false;
      document.getElementById("startBtn").disabled = false;
      document.getElementById("stopBtn").disabled = true;
    }
  }

  onMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    this.log(`MQTT: ${topic} - ${payload}`);

    if (topic.includes("sensors/tap")) {
      this.playSound();
      this.lastImpact = Date.now();
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

  log(message) {
    const logElement = document.getElementById("log");
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
  }

  updateStatus(status) {
    const statusElement = document.getElementById("status");
    statusElement.className = "status";

    switch (status) {
      case Status.DETECTING:
        statusElement.classList.add("detecting");
        statusElement.textContent = "🔍 DETECTING";
        break;
      case Status.PAUSE:
        statusElement.classList.add("paused");
        statusElement.textContent = "⏸️ PAUSED";
        break;
      case Status.DETECTED:
        statusElement.classList.add("detected");
        statusElement.textContent = "🎯 IMPACT DETECTED!";
        break;
    }
  }
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
    this.state = Status.DETECTING;
    this.countDownCpt = 0;
  }

  onPause() {
    // Placeholder implementation
  }

  onNewFrame(imageData) {
    let ret = null;
    const maxFrames = this.state === Status.DETECTED ? this.burstLength + this.extraWaitFrames : this.burstLength;

    if (this.burst.qsize() >= maxFrames) {
      this.burst.get();
      if (this.state === Status.DETECTED) {
        ret = this.computeDelta();
        this.state = Status.DETECTING;
        this.updateStatus(Status.DETECTING);
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
      this.log(`DeltaVideo: ${topic} - ${payload}`);
      this.countDownCpt = this.extraWaitFrames;
      this.state = Status.DETECTED;
      this.updateStatus(Status.DETECTED);
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
    this.displayDelta(delta);

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

  displayDelta(deltaImageData) {
    const deltaCanvas = document.getElementById("deltaCanvas");
    const deltaCtx = deltaCanvas.getContext("2d");
    deltaCtx.putImageData(deltaImageData, 0, 0);
  }
}
