class CameraManager {
  constructor(elements, options = {}) {
    // Required DOM elements
    this.elements = {
      cameraSelect: elements.cameraSelect,
      resolutionSelect: elements.resolutionSelect,
      webcamBtn: elements.webcamBtn,
      videoElement: elements.videoElement,
      ...elements, // Allow additional elements
    };

    // Configuration options
    this.options = {
      autoSelectFirstCamera: options.autoSelectFirstCamera !== false,
      defaultResolution: options.defaultResolution || "1920x1080",
      enableOptimalResolution: options.enableOptimalResolution !== false,
      progressDelay: options.progressDelay || 50,
      restartDelay: options.restartDelay || 100,
      ...options,
    };

    // Optional callbacks
    this.callbacks = {
      onCamerasEnumerated: options.onCamerasEnumerated || (() => {}),
      onCameraSelected: options.onCameraSelected || (() => {}),
      onResolutionTestProgress: options.onResolutionTestProgress || (() => {}),
      onResolutionsAvailable: options.onResolutionsAvailable || (() => {}),
      onResolutionSelected: options.onResolutionSelected || (() => {}),
      onWebcamStarted: options.onWebcamStarted || (() => {}),
      onWebcamStopped: options.onWebcamStopped || (() => {}),
      onWebcamReady: options.onWebcamReady || (() => {}),
      onError: options.onError || ((error) => console.error(error)),
    };

    // State
    this.availableCameras = [];
    this.availableResolutions = [];
    this.currentWebcamStream = null;
    this.selectedCameraId = null;
    this.selectedResolution = null;

    // Comprehensive list of video resolutions to test
    this.commonResolutions = [
      // Ultra low resolutions
      { width: 160, height: 120, label: "160x120 (QQVGA)" },
      { width: 176, height: 144, label: "176x144 (QCIF)" },
      { width: 320, height: 240, label: "320x240 (QVGA)" },
      { width: 352, height: 288, label: "352x288 (CIF)" },

      // Standard resolutions
      { width: 480, height: 360, label: "480x360" },
      { width: 640, height: 360, label: "640x360 (nHD)" },
      { width: 640, height: 480, label: "640x480 (VGA)" },
      { width: 720, height: 480, label: "720x480 (NTSC)" },
      { width: 720, height: 576, label: "720x576 (PAL)" },
      { width: 800, height: 600, label: "800x600 (SVGA)" },
      { width: 854, height: 480, label: "854x480 (FWVGA)" },
      { width: 960, height: 540, label: "960x540 (qHD)" },
      { width: 960, height: 720, label: "960x720" },
      { width: 1024, height: 576, label: "1024x576" },
      { width: 1024, height: 768, label: "1024x768 (XGA)" },

      // HD resolutions
      { width: 1280, height: 720, label: "1280x720 (HD)" },
      { width: 1280, height: 800, label: "1280x800 (WXGA)" },
      { width: 1280, height: 960, label: "1280x960" },
      { width: 1280, height: 1024, label: "1280x1024 (SXGA)" },
      { width: 1366, height: 768, label: "1366x768 (WXGA)" },
      { width: 1440, height: 900, label: "1440x900 (WXGA+)" },
      { width: 1440, height: 1080, label: "1440x1080" },
      { width: 1600, height: 900, label: "1600x900 (HD+)" },
      { width: 1600, height: 1200, label: "1600x1200 (UXGA)" },
      { width: 1680, height: 1050, label: "1680x1050 (WSXGA+)" },

      // Full HD and beyond
      { width: 1920, height: 1080, label: "1920x1080 (Full HD)" },
      { width: 1920, height: 1200, label: "1920x1200 (WUXGA)" },
      { width: 2048, height: 1152, label: "2048x1152" },
      { width: 2048, height: 1536, label: "2048x1536 (QXGA)" },
      { width: 2560, height: 1440, label: "2560x1440 (QHD)" },
      { width: 2560, height: 1600, label: "2560x1600 (WQXGA)" },
      { width: 2880, height: 1800, label: "2880x1800" },
      { width: 3200, height: 1800, label: "3200x1800 (QHD+)" },
      { width: 3440, height: 1440, label: "3440x1440 (UWQHD)" },
      { width: 3840, height: 2160, label: "3840x2160 (4K UHD)" },
      { width: 4096, height: 2160, label: "4096x2160 (4K DCI)" },
      { width: 5120, height: 2880, label: "5120x2880 (5K)" },
      { width: 7680, height: 4320, label: "7680x4320 (8K)" },

      // Mobile/tablet resolutions
      { width: 480, height: 800, label: "480x800" },
      { width: 540, height: 960, label: "540x960" },
      { width: 720, height: 1280, label: "720x1280" },
      { width: 750, height: 1334, label: "750x1334" },
      { width: 1080, height: 1920, label: "1080x1920" },
      { width: 1125, height: 2436, label: "1125x2436" },
      { width: 1242, height: 2688, label: "1242x2688" },

      // Ultrawide resolutions
      { width: 2560, height: 1080, label: "2560x1080 (UW-FHD)" },
      { width: 3440, height: 1440, label: "3440x1440 (UW-QHD)" },
      { width: 5120, height: 2160, label: "5120x2160 (UW-5K)" },
    ];

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

    // Resolution selection change handler
    this.elements.resolutionSelect.addEventListener("change", () => {
      const selectedResolution = this.elements.resolutionSelect.value;
      if (selectedResolution) {
        this.selectResolution(selectedResolution);
      }
    });

    // Initial webcam button setup
    this.elements.webcamBtn.onclick = () => this.startWebcam();
  }

  async testResolution(deviceId, width, height) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { exact: width },
          height: { exact: height },
        },
      });

      // Get actual resolution from video track
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const actualWidth = settings.width;
      const actualHeight = settings.height;

      // Clean up
      track.stop();

      // Only consider it supported if we get the exact resolution requested
      const exactMatch = actualWidth === width && actualHeight === height;

      return {
        width: actualWidth,
        height: actualHeight,
        supported: exactMatch,
        requested: { width, height },
      };
    } catch (error) {
      return {
        width,
        height,
        supported: false,
        requested: { width, height },
      };
    }
  }

  async getCapabilitiesResolutions(deviceId) {
    try {
      // Try to get media track capabilities (newer API)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      // Clean up
      track.stop();

      if (capabilities && capabilities.width && capabilities.height) {
        console.log("Camera capabilities:", capabilities);
        return {
          widthRange: capabilities.width,
          heightRange: capabilities.height,
          aspectRatio: capabilities.aspectRatio || null,
        };
      }
    } catch (error) {
      console.log("Could not get camera capabilities:", error.message);
    }
    return null;
  }

  async getSupportedResolutions(deviceId) {
    console.log(`Testing resolutions for camera ${deviceId}...`);

    // First try to get camera capabilities
    const capabilities = await this.getCapabilitiesResolutions(deviceId);

    const supportedResolutions = [];
    let testedCount = 0;
    const totalResolutions = this.commonResolutions.length;

    // Update UI to show progress
    this.updateResolutionSelectProgress(0, totalResolutions);

    // Test each resolution with progress updates
    for (let i = 0; i < this.commonResolutions.length; i++) {
      const resolution = this.commonResolutions[i];

      // Skip resolutions that are clearly outside camera capabilities
      if (capabilities) {
        const { widthRange, heightRange } = capabilities;
        if (widthRange && (resolution.width < widthRange.min || resolution.width > widthRange.max)) {
          testedCount++;
          continue;
        }
        if (heightRange && (resolution.height < heightRange.min || resolution.height > heightRange.max)) {
          testedCount++;
          continue;
        }
      }

      const result = await this.testResolution(deviceId, resolution.width, resolution.height);
      testedCount++;

      // Update progress
      this.updateResolutionSelectProgress(testedCount, totalResolutions);

      if (result.supported) {
        // Use the original label for exact matches
        const label = resolution.label;
        supportedResolutions.push({
          width: result.width,
          height: result.height,
          label: label,
        });
        console.log(`✓ ${resolution.width}x${resolution.height} supported`);
      } else if (
        result.width &&
        result.height &&
        (result.width !== resolution.width || result.height !== resolution.height)
      ) {
        // Camera returned a different resolution - add it too
        const existingRes = supportedResolutions.find((r) => r.width === result.width && r.height === result.height);

        if (!existingRes) {
          supportedResolutions.push({
            width: result.width,
            height: result.height,
            label: `${result.width}x${result.height} (actual)`,
          });
          console.log(`~ ${resolution.width}x${resolution.height} -> ${result.width}x${result.height}`);
        }
      }

      // Small delay to prevent overwhelming the camera
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, this.options.progressDelay));
      }
    }

    // Remove duplicates and sort
    const uniqueResolutions = supportedResolutions.filter(
      (resolution, index, self) =>
        index === self.findIndex((r) => r.width === resolution.width && r.height === resolution.height)
    );

    // Sort by total pixels (ascending)
    uniqueResolutions.sort((a, b) => a.width * a.height - b.width * b.height);

    console.log(`Found ${uniqueResolutions.length} supported resolutions out of ${totalResolutions} tested`);

    if (capabilities) {
      console.log("Camera capabilities summary:", {
        width: capabilities.widthRange,
        height: capabilities.heightRange,
        supportedResolutions: uniqueResolutions.length,
      });
    }

    return uniqueResolutions;
  }

  updateResolutionSelectProgress(current, total) {
    const progress = Math.round((current / total) * 100);
    this.elements.resolutionSelect.innerHTML = `<option value="">Testing resolutions... (${progress}%)</option>`;
    this.elements.resolutionSelect.disabled = true;
    this.callbacks.onResolutionTestProgress(current, total);
  }

  async updateResolutionOptions(deviceId) {
    if (!deviceId) {
      this.availableResolutions = [];
      this.elements.resolutionSelect.innerHTML = '<option value="">Select Resolution...</option>';
      this.elements.resolutionSelect.disabled = true;
      this.callbacks.onResolutionsAvailable([]);
      return;
    }

    this.elements.resolutionSelect.innerHTML = '<option value="">Loading resolutions...</option>';
    this.elements.resolutionSelect.disabled = true;

    try {
      this.availableResolutions = await this.getSupportedResolutions(deviceId);

      // Clear and populate resolution options
      this.elements.resolutionSelect.innerHTML = '<option value="">Select Resolution...</option>';

      this.availableResolutions.forEach((resolution) => {
        const option = document.createElement("option");
        option.value = `${resolution.width}x${resolution.height}`;
        option.textContent = resolution.label;
        this.elements.resolutionSelect.appendChild(option);
      });

      // Add optimal resolution option if enabled
      if (this.options.enableOptimalResolution) {
        const option = document.createElement("option");
        option.value = this.options.defaultResolution;
        option.textContent = "Optimal (auto)";
        this.elements.resolutionSelect.appendChild(option);
      }

      // Select default resolution
      this.elements.resolutionSelect.value = this.options.defaultResolution;
      this.selectedResolution = this.options.defaultResolution;

      this.elements.resolutionSelect.disabled = false;

      // Notify callbacks
      const resolutionsWithOptimal = this.options.enableOptimalResolution
        ? [
            ...this.availableResolutions,
            { width: 1920, height: 1080, label: "Optimal (auto)", value: this.options.defaultResolution },
          ]
        : this.availableResolutions;

      this.callbacks.onResolutionsAvailable(resolutionsWithOptimal);
      this.callbacks.onResolutionSelected(this.options.defaultResolution);
    } catch (error) {
      console.error("Error getting supported resolutions:", error);
      this.elements.resolutionSelect.innerHTML = '<option value="">Error loading resolutions</option>';
      this.callbacks.onError(new Error("Error loading resolutions"));
    }
  }

  async enumerateCameras() {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });

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
    // If webcam is currently running, stop it first
    if (this.currentWebcamStream) {
      this.stopWebcam();
    }

    this.selectedCameraId = deviceId;
    this.elements.cameraSelect.value = deviceId;
    this.callbacks.onCameraSelected(deviceId);

    // Update available resolutions for selected camera
    await this.updateResolutionOptions(deviceId);
  }

  selectResolution(resolution) {
    this.selectedResolution = resolution;
    this.elements.resolutionSelect.value = resolution;
    this.callbacks.onResolutionSelected(resolution);

    // If webcam is currently running, restart with new resolution
    if (this.currentWebcamStream) {
      this.stopWebcam();
      setTimeout(() => this.startWebcam(), this.options.restartDelay);
    }
  }

  async startWebcam() {
    try {
      if (!this.selectedCameraId) {
        throw new Error("Please select a camera first.");
      }

      let constraints = {
        video: { deviceId: { exact: this.selectedCameraId } },
        audio: false,
      };

      // Add resolution constraints if selected
      if (this.selectedResolution) {
        const [width, height] = this.selectedResolution.split("x").map(Number);
        constraints.video.width = { ideal: width };
        constraints.video.height = { ideal: height };
      }

      console.log("Starting webcam with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentWebcamStream = stream;

      // Set up video element
      this.elements.videoElement.srcObject = this.currentWebcamStream;

      const onVideoReady = () => {
        this.elements.videoElement
          .play()
          .then(() => {
            const resolution = {
              width: this.elements.videoElement.videoWidth,
              height: this.elements.videoElement.videoHeight,
            };

            this.callbacks.onWebcamReady(this.elements.videoElement, resolution);
            console.log(`Webcam ready with resolution: ${resolution.width}x${resolution.height}`);
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
      this.elements.resolutionSelect.disabled = true;

      this.callbacks.onWebcamStarted(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing webcam:", err);
      const errorMsg = "Could not access selected camera with chosen resolution";
      alert(errorMsg);
      this.callbacks.onError(new Error(errorMsg));
      throw err;
    }
  }

  stopWebcam() {
    if (this.currentWebcamStream) {
      this.currentWebcamStream.getTracks().forEach((track) => track.stop());
      this.currentWebcamStream = null;
    }

    // Clear video element
    this.elements.videoElement.srcObject = null;

    // Update UI
    this.elements.webcamBtn.textContent = "Start Webcam";
    this.elements.webcamBtn.onclick = () => this.startWebcam();
    this.elements.cameraSelect.disabled = false;
    this.elements.resolutionSelect.disabled = false;

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

  getResolutions() {
    return [...this.availableResolutions];
  }

  getSelectedCamera() {
    return this.selectedCameraId;
  }

  getSelectedResolution() {
    return this.selectedResolution;
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
