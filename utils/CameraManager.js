class CameraManager {
  constructor(elements, options = {}) {
    // Required DOM elements
    this.elements = {
      cameraSelect: elements.cameraSelect,
      webcamBtn: elements.webcamBtn,
      videoElement: elements.videoElement,
      ...elements,
    };

    // Configuration options
    this.options = {
      autoSelectFirstCamera: options.autoSelectFirstCamera !== false,
      ...options,
    };

    // Optional callbacks
    this.callbacks = {
      onCamerasEnumerated: options.onCamerasEnumerated || (() => {}),
      onCameraSelected: options.onCameraSelected || (() => {}),
      onWebcamStarted: options.onWebcamStarted || (() => {}),
      onWebcamStopped: options.onWebcamStopped || (() => {}),
      onWebcamReady: options.onWebcamReady || (() => {}),
      onError: options.onError || ((error) => console.error(error)),
    };

    // State
    this.availableCameras = [];
    this.currentWebcamStream = null;
    this.selectedCameraId = null;

    // Initialize
    this.initialize();
  }

  async initialize() {
    this.setupEventListeners();
    await this.enumerateCameras();
  }

  setupEventListeners() {
    // Camera selection change handler
    this.elements.cameraSelect.addEventListener("change", async () => {
      const selectedCameraId = this.elements.cameraSelect.value;
      if (selectedCameraId) {
        await this.selectCamera(selectedCameraId);
      }
    });

    // Initial webcam button setup
    this.elements.webcamBtn.onclick = () => this.startWebcam();
  }

  async ensureAllTracksStop() {
    // Stop any existing stream first
    if (this.currentWebcamStream) {
      this.currentWebcamStream.getTracks().forEach((track) => {
        console.log("Stopping existing track:", track.kind, track.label);
        track.stop();
      });
      this.currentWebcamStream = null;
    }

    // Clear video element
    this.elements.videoElement.srcObject = null;

    // Get all active media tracks and stop them
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");

      // Create a temporary stream for each camera to ensure all tracks are stopped
      for (const device of videoDevices) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId } },
          });
          tempStream.getTracks().forEach((track) => {
            console.log("Stopping temp track:", track.kind, track.label);
            track.stop();
          });
        } catch (e) {
          // Ignore errors for inaccessible cameras
          console.log("Could not access camera for cleanup:", device.label || device.deviceId);
        }
      }
    } catch (e) {
      console.log("Error during track cleanup:", e);
    }

    // Wait a moment for tracks to fully release
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  async getMaxResolutionForCamera(deviceId) {
    return { width: 1920, height: 1080 };
  }

  async enumerateCameras() {
    try {
      // Ensure all tracks are stopped first
      await this.ensureAllTracksStop();

      // Request permission first
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
      permissionStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter((device) => device.kind === "videoinput");

      // Clear existing options
      this.elements.cameraSelect.innerHTML = '<option value="">Select Camera...</option>';

      // Add camera options
      this.availableCameras.forEach((camera, index) => {
        const option = document.createElement("option");
        option.value = camera.deviceId;
        option.textContent = camera.label || `Camera ${index + 1}`;
        this.elements.cameraSelect.appendChild(option);
      });

      // Select first camera by default if enabled
      if (this.options.autoSelectFirstCamera && this.availableCameras.length > 0) {
        this.elements.cameraSelect.value = this.availableCameras[0].deviceId;
        await this.selectCamera(this.availableCameras[0].deviceId);
      }

      // Format cameras for callback
      const formattedCameras = this.availableCameras.map((camera, index) => ({
        deviceId: camera.deviceId,
        label: camera.label || `Camera ${index + 1}`,
        groupId: camera.groupId,
      }));

      this.callbacks.onCamerasEnumerated(formattedCameras);
      console.log(`Found ${this.availableCameras.length} cameras`);
    } catch (err) {
      console.error("Error enumerating cameras:", err);
      this.callbacks.onError(new Error("Could not enumerate cameras"));
    }
  }

  async selectCamera(deviceId) {
    // Stop any existing webcam stream
    if (this.currentWebcamStream) {
      this.stopWebcam();
    }

    this.selectedCameraId = deviceId;
    this.elements.cameraSelect.value = deviceId;

    this.callbacks.onCameraSelected(deviceId);
    console.log(`Selected camera: ${deviceId}`);
  }

  async startWebcam() {
    try {
      if (!this.selectedCameraId) {
        throw new Error("Please select a camera first.");
      }

      // Ensure all tracks are stopped before starting
      await this.ensureAllTracksStop();

      // Get maximum resolution for the selected camera
      const maxResolution = await this.getMaxResolutionForCamera(this.selectedCameraId);

      const constraints = {
        video: {
          deviceId: { exact: this.selectedCameraId },
          width: { ideal: maxResolution.width }, //, min: maxResolution.width },
          height: { ideal: maxResolution.height }, //, min: maxResolution.height },
          frameRate: { ideal: 10, max: 60 },
        },
        audio: false,
      };

      console.log("Starting webcam with max resolution constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentWebcamStream = stream;

      // Set up video element
      this.elements.videoElement.srcObject = this.currentWebcamStream;

      const onVideoReady = () => {
        this.elements.videoElement
          .play()
          .then(() => {
            const actualResolution = {
              width: this.elements.videoElement.videoWidth,
              height: this.elements.videoElement.videoHeight,
            };

            this.callbacks.onWebcamReady(this.elements.videoElement, actualResolution);
            console.log(`Webcam ready with resolution: ${actualResolution.width}x${actualResolution.height}`);
          })
          .catch((err) => {
            console.error("Error playing webcam:", err);
            this.callbacks.onError(new Error("Error playing webcam"));
          });
      };

      if (this.elements.videoElement.readyState >= 2) {
        onVideoReady();
      } else {
        this.elements.videoElement.addEventListener("loadedmetadata", onVideoReady, { once: true });
      }

      // Update UI
      this.elements.webcamBtn.textContent = "Stop Webcam";
      this.elements.webcamBtn.onclick = () => this.stopWebcam();
      this.elements.cameraSelect.disabled = true;

      this.callbacks.onWebcamStarted(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing webcam:", err);
      const errorMsg = "Could not access selected camera";
      alert(errorMsg);
      this.callbacks.onError(new Error(errorMsg));
      throw err;
    }
  }

  stopWebcam() {
    if (this.currentWebcamStream) {
      this.currentWebcamStream.getTracks().forEach((track) => {
        console.log("Stopping webcam track:", track.kind, track.label);
        track.stop();
      });
      this.currentWebcamStream = null;
    }

    // Clear video element
    this.elements.videoElement.srcObject = null;

    // Update UI
    this.elements.webcamBtn.textContent = "Start Webcam";
    this.elements.webcamBtn.onclick = () => this.startWebcam();
    this.elements.cameraSelect.disabled = false;

    this.callbacks.onWebcamStopped();
  }

  // Getter methods for current state
  getCameras() {
    return this.availableCameras.map((camera, index) => ({
      deviceId: camera.deviceId,
      label: camera.label || `Camera ${index + 1}`,
      groupId: camera.groupId,
    }));
  }

  getSelectedCamera() {
    return this.selectedCameraId;
  }

  isWebcamActive() {
    return this.currentWebcamStream !== null;
  }

  getCurrentStream() {
    return this.currentWebcamStream;
  }

  getVideoElement() {
    return this.elements.videoElement;
  }

  // Method to update callbacks after initialization
  updateCallbacks(newCallbacks) {
    this.callbacks = { ...this.callbacks, ...newCallbacks };
  }

  // Method to update options after initialization
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}

// Export for use
// export default CameraManager;
