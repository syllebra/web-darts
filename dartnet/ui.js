function initializeSettingsUI() {
  // Make button draggable
  makeDraggable("settingsButton", openSettingsModal);

  settingsManager = new SettingsManager();

  function updatepSecificDartDetectorSettings() {
    const vaiVisible = settingsManager.getSetting("dart", "type") == "vai";
    const vaiSpecificSettings = document.getElementById("vaiSpecificSettings");
    if (vaiSpecificSettings) vaiSpecificSettings.style.display = vaiVisible ? "block" : "none";
  }

  function updateCalibrationSettings() {
    if (dartnet) dartnet.calibrationPairFactor = settingsManager.getSetting("calibration", "tolerance") * 0.1;
  }

  // Example usage - register callbacks
  settingsManager.onSettingsChange((data) => {
    console.log(`🔄 Change: ${data.category}.${data.key} = ${data.value}`);
    if (data.category == "dart" && data.key == "type") updatepSecificDartDetectorSettings();
    if (data.category == "calibration" && data.key == "tolerance") updateCalibrationSettings();
  });

  settingsManager.onSettingsSave((data) => {
    console.log("💾 Settings saved");
  });

  settingsManager.onSettingsLoad((data) => {
    console.log("📁 Settings loaded");
    updatepSecificDartDetectorSettings();
    updateCalibrationSettings();
  });

  settingsManager.onSettingsReset((data) => {
    console.log("🔄 Settings reset");
  });

  settingsManager.onSettingsExport((data) => {
    console.log("📤 Settings exported");
  });

  console.log("SettingsManager initialized with callbacks");
  console.log("Settings panel ready with working callbacks!");

  // Load saved settings or defaults
  settingsManager.loadSettings();
  console.log("Settings loaded");
}

function openSettingsModal() {
  console.log("Opening settings modal...");
  const modal = new bootstrap.Modal(document.getElementById("settingsModal"));
  modal.show();
}

function initializeMainVariables() {
  // Detector
  gpuDetector = new GPUDetector();

  // Init main class instance
  dartnet = new DartNet(document.getElementById("videoElement"));
}

function initializeToggleButtonGroups() {
  // Set up main button click handlers
  document.getElementById("cameraMainBtn").addEventListener("click", () => {
    toggleButtonGroup("camera");
  });

  document.getElementById("videoMainBtn").addEventListener("click", () => {
    toggleButtonGroup("video");
  });

  // Hide expanded groups when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".control-group-expandable")) {
      document.querySelectorAll(".expanded-buttons.show").forEach((group) => {
        group.classList.remove("show");
      });
    }
  });
}

function initializeCameraManagementUI() {
  // Get DOM elements for camera manager
  const elements = {
    cameraSelect: document.getElementById("cameraSelect"),
    webcamPlayBtn: document.getElementById("webcamPlayBtn"),
    webcamStopBtn: document.getElementById("webcamStopBtn"),
    videoElement: document.getElementById("videoElement"),
  };

  // Configuration options
  const options = {
    // Basic options
    autoSelectFirstCamera: true,

    onWebcamReady: (videoElement, resolution) => {
      console.log("Webcam ready with resolution:", resolution);
      if (zoomableCanvas) {
        zoomableCanvas.setVideoSource(videoElement);
      }
    },

    onError: (error) => {
      console.error("Camera error:", error);
      // Custom error handling
      showErrorNotification(error.message);
    },
  };

  // Initialize CameraManager
  const cameraModal = new bootstrap.Modal(document.getElementById("cameraModal"));
  cameraManager = new CameraManager(
    {
      cameraSelect: null,
      webcamPlayBtn: document.getElementById("webcamPlayBtn"),
      webcamStopBtn: document.getElementById("webcamStopBtn"),
      videoElement: document.getElementById("videoElement"),
    },
    options
  );

  // Camera selection button handler
  document.getElementById("cameraSelectBtn").addEventListener("click", () => {
    showGroupSpinner("camera");
    cameraModal.show();
  });

  // Update camera manager to populate modal instead of dropdown
  options.onCamerasEnumerated = (cameras) => {
    const cameraList = document.getElementById("cameraList");
    cameraList.innerHTML = "";

    hideGroupSpinner("camera");

    if (cameras.length === 0) {
      cameraList.innerHTML = '<div class="text-center">No cameras found</div>';
      return;
    }

    // Enable camera select button now that we have cameras
    const btn = document.getElementById("cameraSelectBtn");
    btn.disabled = false;

    cameras.forEach((camera, index) => {
      const cameraCard = document.createElement("div");
      cameraCard.className = "card bg-secondary text-white";
      cameraCard.style.width = "300px";
      cameraCard.style.cursor = "pointer";
      cameraCard.innerHTML = `
                        <div class="card-body text-center">
                            <i class="fas fa-camera fa-3x mb-3"></i>
                            <h5 class="card-title">${camera.label || `Camera ${index + 1}`}</h5>
                        </div>
                    `;
      cameraCard.addEventListener("click", () => {
        cameraManager.selectCamera(camera.deviceId);
        cameraModal.hide();
        cameraManager.startWebcam(hideGroupSpinner("camera"));
      });
      cameraList.appendChild(cameraCard);
    });

    // Enable camera select button now that we have cameras
    document.getElementById("cameraSelectBtn").disabled = false;
  };

  // Update camera manager options to handle webcam state changes
  options.onWebcamReady = (videoElement, resolution) => {
    console.log("Webcam ready with resolution:", resolution);
    if (zoomableCanvas) {
      zoomableCanvas.setVideoSource(videoElement);
    }
    updateAutoCalibButtonState();
    // Update button states
    elements.webcamPlayBtn.disabled = true;
    elements.webcamStopBtn.disabled = false;
  };

  options.onWebcamStopped = () => {
    // Re-enable video file controls when webcam stops
    videoFilePlayBtn.disabled = false;
    // Update webcam button states
    elements.webcamPlayBtn.disabled = false;
    elements.webcamStopBtn.disabled = true;

    updateAutoCalibButtonState();
  };

  // Reinitialize CameraManager with updated options
  cameraManager = new CameraManager(
    {
      cameraSelect: null,
      webcamPlayBtn: document.getElementById("webcamPlayBtn"),
      webcamStopBtn: document.getElementById("webcamStopBtn"),
      videoElement: document.getElementById("videoElement"),
    },
    options
  );

  // Setup webcam button handlers
  elements.webcamPlayBtn.onclick = () => {
    cameraManager.startWebcam();
    // Disable video file controls
    videoFilePlayBtn.disabled = true;
    videoFilePauseBtn.disabled = true;
    videoFileStopBtn.disabled = true;
    // Clear any video file
    document.getElementById("videoElement").src = "";
  };
  elements.webcamStopBtn.onclick = () => cameraManager.stopWebcam();

  // Set initial button states
  elements.webcamPlayBtn.disabled = true;
  elements.webcamStopBtn.disabled = true;

  // Show group spinner and disable main button initially
  showGroupSpinner("camera");
}

function calibrateCamAndUpdateUI() {
  showGroupSpinner("autoCalib");
  setTimeout(() => {
    dartnet
      ?.calibrate()
      .then(() => {
        onCalibrationSuccess(dartnet.sourceCalibPts);
      })
      .catch((error) => {
        console.trace(error);
      })
      .finally(() => {
        hideGroupSpinner("autoCalib");
      });
  }, 300);
}
function intializeAutoCalibUI() {
  if (dartnet) dartnet.calibrationPairFactor = settingsManager.getSetting("calibration", "tolerance") * 0.1;
  // Auto calib
  const autoCalibBtn = document.getElementById("autoCalibMainBtn");
  autoCalibBtn.addEventListener("click", () => {
    calibrateCamAndUpdateUI();
  });
}

function initializeVideoFileUI() {
  // Video file functionality
  const videoFilePlayBtn = document.getElementById("videoFilePlayBtn");
  const videoFilePauseBtn = document.getElementById("videoFilePauseBtn");
  const videoFileStopBtn = document.getElementById("videoFileStopBtn");
  const videoFileSelectBtn = document.getElementById("videoFileSelectBtn");
  const testVideoFileSelectBtn = document.getElementById("testVideoFileSelectBtn");

  const elements = {
    cameraSelect: document.getElementById("cameraSelect"),
    webcamPlayBtn: document.getElementById("webcamPlayBtn"),
    webcamStopBtn: document.getElementById("webcamStopBtn"),
    videoElement: document.getElementById("videoElement"),
  };

  // Handle video file selection button click
  videoFileSelectBtn.addEventListener("click", () => {
    document.getElementById("videoFile").click();
  });

  function loadVideoUrl(url) {
    videoElement.src = url;
    videoElement.loop = true;

    // Enable controls immediately when file is selected
    videoFilePlayBtn.disabled = false;
    videoFilePauseBtn.disabled = true;
    videoFileStopBtn.disabled = false;

    videoElement.addEventListener(
      "loadedmetadata",
      () => {
        hideGroupSpinner("video");
        updateAutoCalibButtonState();
        videoElement
          .play()
          .then(() => {
            zoomableCanvas.setVideoSource(videoElement);
            updateAutoCalibButtonState();
            console.log("Video loaded.");

            // Update video controls
            videoFilePlayBtn.disabled = true;
            videoFilePauseBtn.disabled = false;
            videoFileStopBtn.disabled = false;

            // Disable webcam controls
            elements.webcamPlayBtn.disabled = true;
            elements.webcamStopBtn.disabled = true;

            cameraManager.stopWebcam();
          })
          .catch((err) => {
            console.error("Error playing video:", err);
            hideGroupSpinner("video");
            updateAutoCalibButtonState();
          });
      },
      { once: true }
    );

    videoElement.addEventListener("play", () => {
      videoFilePlayBtn.disabled = true;
      videoFilePauseBtn.disabled = false;
    });

    videoElement.addEventListener("pause", () => {
      videoFilePlayBtn.disabled = false;
      videoFilePauseBtn.disabled = true;
    });

    videoElement.addEventListener("ended", () => {
      videoFilePlayBtn.disabled = false;
      videoFilePauseBtn.disabled = true;
    });

    // videoElement.addEventListener('error', (e) => {
    //     console.error('Video loading error:', e);
    //     alert('Could not load video file');
    //     // Reset controls on error
    //     videoFilePlayBtn.disabled = true;
    //     videoFilePauseBtn.disabled = true;
    //     videoFileStopBtn.disabled = true;
    //     hideGroupSpinner('video');
    // });
  }
  document.getElementById("videoFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      showGroupSpinner("video");
      const videoElement = document.getElementById("videoElement");
      const url = URL.createObjectURL(file);
      loadVideoUrl(url);
    }
  });

  testVideoFileSelectBtn.addEventListener("click", (e) => {
    showGroupSpinner("video");
    loadVideoUrl("../dev/darts_detectors_test/home03.avi");
  });

  // Video file control handlers
  videoFilePlayBtn.addEventListener("click", () => {
    const videoElement = document.getElementById("videoElement");
    videoElement.play();
    videoFilePlayBtn.disabled = true;
    videoFilePauseBtn.disabled = false;
  });

  videoFilePauseBtn.addEventListener("click", () => {
    const videoElement = document.getElementById("videoElement");
    videoElement.pause();
    videoFilePlayBtn.disabled = false;
    videoFilePauseBtn.disabled = true;
  });

  videoFileStopBtn.addEventListener("click", () => {
    const videoElement = document.getElementById("videoElement");

    // First clear the src to prevent further loading
    videoElement.src = "";

    // Then pause the video
    videoElement.pause();

    // Update UI controls
    videoFilePlayBtn.disabled = true;
    videoFilePauseBtn.disabled = true;
    videoFileStopBtn.disabled = true;
    updateAutoCalibButtonState();

    // Re-enable webcam controls
    elements.webcamPlayBtn.disabled = false;
  });
}

function initializeHardwareUI() {
  gpuDetector.detectGPU();
  toggleButtons["gpuToggle"].setDisabled(false);
  console.log("DEBUG: DOMContentLoaded", toggleButtons);
  toggleButtons["gpuToggle"].onChangeCallbacks.push((v, el) => {
    console.log("Switching to ", v);
    g_useGPU = v == "gpu";
    dartnet?.initDetectors();
  });
}

function initializeMqttUI() {
  // MQTT Connection Status Management
  const mqttStatusDot = document.getElementById("mqttStatusDot");
  //const mqttStatusText = document.getElementById("mqttStatusText");

  function updateMqttStatus(status) {
    // Remove all status classes
    mqttStatusDot.className = "status-dot";

    switch (status) {
      case "connected":
        mqttStatusDot.classList.add("mqtt-connected");
        //mqttStatusText.textContent = 'Connected';
        break;
      case "disconnected":
        mqttStatusDot.classList.add("mqtt-disconnected");
        //mqttStatusText.textContent = 'Disconnected';
        break;
      case "connecting":
        mqttStatusDot.classList.add("mqtt-connecting");
        //mqttStatusText.textContent = 'Connecting...';
        break;
      default:
        mqttStatusDot.classList.add("mqtt-disconnected");
      //mqttStatusText.textContent = 'Disconnected';
    }
  }

  // Initialize with disconnected status
  updateMqttStatus("disconnected");

  const mqttBroker = settingsManager.getSetting("mqtt", "brokerIP");
  const mqttPort = settingsManager.getSetting("mqtt", "port");
  const clientId = "DARTNET_" + Math.random().toString(16).substr(2, 8);

  dartnet.mqttClient = new MQTTClient(mqttBroker, mqttPort, {
    clientId: clientId,
    // username: "user",
    // password: "pass",
    //autoReconnect:false,
    onConnected: () => updateMqttStatus("connected"),
    onDisconnected: () => updateMqttStatus("disconnected"),
    onConnectionLost: () => updateMqttStatus("disconnected"),
    onConnecting: () => updateMqttStatus("connecting"),
    onError: (err) => {
      console.error("Error:", err), updateMqttStatus("error");
    },
  });

  dartnet.mqttClient.subscribe("dartnet/ui", (message, topic) => {
    if (message == "calibrate camera") {
      showNotification("Calibrate camera started from MQTT");
      calibrateCamAndUpdateUI();
    }
  });
}

function initializeDartDetectionUI() {
  const dartDetectorIcon = document.getElementById("dartDetectorIcon");
  if (dartDetectorIcon) {
    if (dartnet?.dartDetector instanceof DeltaVideoOnlyDartDetector) dartDetectorIcon.className = "fas fa-eye";
    else if (dartnet?.dartDetector instanceof DeltaVideoAccelImpactDetector)
      dartDetectorIcon.className = "fas fa-wave-square";
    else ddartDetectorIcon.className = "fas fa-eye-slash";
  }
  toggleButtons["dartDetectionToggle"].onChangeCallbacks.push((v, el) => {
    if (v == "off") dartnet?.dartDetector?.onPause();
    else dartnet?.dartDetector?.resume();
  });
}

// Dart detection status handler
function updateDartDetectionStatus() {
  // Dart Detection Status Management
  const dartStatusDot = document.getElementById("dartStatusDot");
  const dartStatusText = document.getElementById("dartStatusText");

  const status = dartnet?.dartDetector?.isReady ? dartnet?.dartDetector?.currentStatus : "unknown";
  // Remove all status classes
  dartStatusDot.className = "status-dot";
  let enabled = true;
  switch (status) {
    case DartDetectorStatus.INITIALIZING:
      dartStatusDot.classList.add("dart-initializing");
      dartStatusText.textContent = "⚙️ Initializing...";
      enabled = false;
      break;
    case DartDetectorStatus.DETECTING:
      dartStatusDot.classList.add("dart-detecting");
      dartStatusText.textContent = "🔍 Detecting";
      break;
    case DartDetectorStatus.PAUSE:
      dartStatusDot.classList.add("dart-paused");
      dartStatusText.textContent = "⏸️ Paused";
      break;
    case DartDetectorStatus.DETECTED:
      dartStatusDot.classList.add("dart-detected");
      dartStatusText.textContent = "🎯 Impact Detected!";
      break;
    default:
      dartStatusDot.classList.add("dart-unknown");
      dartStatusText.textContent = "Not Started";
      enabled = false;
      break;
  }
  let onPause = !enabled || status == DartDetectorStatus.PAUSE;
  if (status != DartDetectorStatus.INITIALIZING) {
    toggleButtons["dartDetectionToggle"]?.setValue(onPause ? "off" : "on", true, false);
  }
  toggleButtons["dartDetectionToggle"]?.setDisabled(!enabled);
}

async function periodicUpdateUI() {
  // GPU ui state
  const gpuStatusDot = document.getElementById("gpuStatusDot");
  const gpuStatusText = document.getElementById("gpuStatusText");

  if (gpuStatusDot && gpuStatusText) {
    switch (gpuDetector?.status) {
      case "checking":
        gpuStatusDot.className = "status-dot gpu-unknown";
        gpuStatusText.textContent = "Checking GPU...";
        break;
      case "webgpu":
        gpuStatusDot.className = "status-dot gpu-available";
        gpuStatusText.textContent = "WebGPU";
        gpuStatusDot.title = gpuDetector?.details;
        break;
      case "webgl":
        gpuStatusDot.className = "status-dot gpu-available";
        gpuStatusText.textContent = "WebGL";
        gpuStatusDot.title = gpuDetector?.details;
        break;
      case "none":
        gpuStatusDot.className = "status-dot gpu-unavailable";
        gpuStatusText.textContent = "No GPU";
        gpuStatusDot.title = gpuDetector?.details;
        break;
    }
    // const gpu = status == "webgpu" || status == "webgl";
    // toggleButtons["gpuToggle"].setValue(gpu ? "gpu" : "cpu");
    toggleButtons["gpuToggle"]?.setValue(g_useGPU ? "gpu" : "cpu", true);
    toggleButtons["gpuToggle"]?.setDisabled(gpuDetector?.status != "webgpu" && gpuDetector?.status != "webgl");
  }

  if (dartnet) {
    const dartDetectorDot = document.getElementById("dartDetectorDot");
    dartDetectorDot.className = "status-dot";
    dartDetectorDot.classList.add(!dartnet.dartDetector.isReady() ? "mqtt-disconnected" : "mqtt-connected");
  }

  updateDartDetectionStatus();
  setTimeout(() => periodicUpdateUI(), 200);
}

function updateAutoCalibButtonState() {
  const autoCalibBtn = document.getElementById("autoCalibMainBtn");
  if (autoCalibBtn) autoCalibBtn.disabled = !zoomableCanvas?.videoSource; //!(zoomableCanvas?.videoSource?.videoWidth);
}

function initZoomableCanvasUI() {
  // Initialize the canvas with debug overlay
  zoomableCanvas = new ZoomablePannableCanvas("videoCanvas", "canvasContainer", "overlayCanvas");

  for (let i = 0; i < 4; i++) {
    // Add interactive elements
    zoomableCanvas.addOverlayElement(
      `calib${i}`,
      { num: i, x: 100 + i * 20, y: -150, pt_radius: 2, circle_radius: i == 0 ? 14 : 10, color: classes_colors[i + 1] },
      // Draw callback
      (ctx, element, isSelected) => {
        ctx.fillStyle = isSelected ? "rgba(255, 255, 0, 0.7)" : element.color;
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.pt_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = (element.num == 0 ? 4 : 2) / zoomableCanvas.scale;
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.circle_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
        ctx.stroke();
      },
      // Hit test callback (optional - defaults to circular)
      (element, worldX, worldY) => {
        const dx = worldX - element.x;
        const dy = worldY - element.y;
        return Math.sqrt(dx * dx + dy * dy) <= element.circle_radius / zoomableCanvas.scale;
      }
    );
  }

  // Add Element to visualize crop area
  zoomableCanvas.addOverlayElement(
    "cropMask",
    {
      net: dartnet,
      x: 0,
      y: 0,
      color: "rgba(0, 0, 0, 0.6)",
    },
    // Draw callback
    (ctx, element) => {
      const ca = element.net?.cropArea;
      if (!zoomableCanvas.videoElement || !ca) return;
      ctx.fillStyle = element.color;
      //ctx.lineWidth = 2 / zoomableCanvas.scale;
      ctx.fillRect(0, 0, zoomableCanvas.videoElement.videoWidth, ca[1]);
      ctx.fillRect(0, ca[3], zoomableCanvas.videoElement.videoWidth, zoomableCanvas.videoElement.videoHeight - ca[3]);
      ctx.fillRect(0, ca[1], 0, ca[3]);
      ctx.fillRect(ca[2], ca[1], zoomableCanvas.videoElement.videoWidth - ca[2], ca[3] - ca[1]);

      // ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      // ctx.strokeRect(ca[0], ca[1], ca[2]-ca[0], ca[3]-ca[1]);
    }
  );

  // Add "20" Element to help reorient in case it is needed
  zoomableCanvas.addOverlayElement(
    "20",
    {
      net: dartnet,
      x: 0,
      y: 0,
      radius: 30,
      color: "rgba(0, 255, 255, 0.5)",
      compute_possible: () => {
        return PerspectiveUtils.transformPoints(
          [...Array(20).keys()].map((i) => {
            const angle = (Math.PI * 2 * i) / 20 + Math.PI / 20;
            const dis = dartnet.board.r_double * 1.2;
            return [Math.cos(angle) * dis, Math.sin(angle) * dis];
          }),
          dartnet.Mi
        );
      },
    },
    // Draw callback
    (ctx, element, isSelected) => {
      ctx.fillStyle = isSelected ? "rgba(128, 255, 128, 0.7)" : element.color;
      ctx.lineWidth = 2 / zoomableCanvas.scale;
      ctx.beginPath();
      ctx.arc(element.x, element.y, element.radius / zoomableCanvas.scale, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.font = `bold ${40 / zoomableCanvas.scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("20", element.x, element.y + 14 / zoomableCanvas.scale);

      if (isSelected && element.net?.Mi) {
        const possible = element.compute_possible();

        possible.forEach((p) => {
          ctx.fillStyle = "rgba(0, 255, 255, 0.25)";
          ctx.beginPath();
          ctx.arc(p[0], p[1], 8 / zoomableCanvas.scale, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    },
    // Hit test callback (optional - defaults to circular)
    (element, worldX, worldY) => {
      const dx = worldX - element.x;
      const dy = worldY - element.y;
      return Math.sqrt(dx * dx + dy * dy) <= element.radius / zoomableCanvas.scale;
    }
  );

  // Add a virtual target visualizer
  zoomableCanvas.addOverlayElement(
    "virtual_target",
    { net: dartnet, x: 10, y: 200, lineWidth: 2, color: "rgba(0, 255, 255, 0.2)" },
    // Draw callback
    (ctx, element) => {
      const pts = element.net?.sourceCalibPts;
      const Mi = element.net?.Mi;
      const board = element.net?.board;
      if (!pts || !Mi || !board) return;
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.lineWidth / zoomableCanvas.scale;

      // Center drawing
      const srcCenter = PerspectiveUtils.transformPoints([[0, 0]], Mi)[0];
      ctx.beginPath();
      ctx.arc(srcCenter[0], srcCenter[1], 1 / zoomableCanvas.scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(srcCenter[0], srcCenter[1], 4 / zoomableCanvas.scale, 0, 2 * Math.PI);
      ctx.stroke();

      // Segments drawing
      const boardOuter = board.getOuterPts();
      const srcOuter = PerspectiveUtils.transformPoints(boardOuter, Mi);
      const segStart = PerspectiveUtils.transformPoints(
        boardOuter.map((p) => {
          const ratio = board.r_outer_bull / Math.sqrt(p[0] * p[0] + p[1] * p[1]);
          return [p[0] * ratio, p[1] * ratio];
        }),
        Mi
      );
      ctx.beginPath();
      for (let i = 0; i < segStart.length; i++) {
        ctx.moveTo(segStart[i][0], segStart[i][1]);
        ctx.lineTo(srcOuter[i][0], srcOuter[i][1]);
      }
      ctx.stroke();

      // Circles drawing
      const radii = [
        board.r_inner_bull,
        board.r_outer_bull,
        board.r_double - board.w_double_treble,
        board.r_double,
        board.r_treble - board.w_double_treble,
        board.r_treble,
      ];

      radii.forEach((r) => {
        const num = Math.max(Math.ceil(r * 200 * (zoomableCanvas.scale < 1 ? 1 : zoomableCanvas.scale)), 20);
        const pts = [...Array(num).keys()].map((i) => [
          Math.cos((Math.PI * 2 * i) / num) * r,
          Math.sin((Math.PI * 2 * i) / num) * r,
        ]);
        const srcPts = PerspectiveUtils.transformPoints(pts, Mi);
        ctx.beginPath();
        ctx.moveTo(srcPts[0], srcPts[1]);
        for (let i = 0; i <= srcPts.length; i++) {
          p = srcPts[(i + 1) % srcPts.length];
          ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      });
    }
  );

  // Add score viewer on mouse hover
  zoomableCanvas.addOverlayElement(
    "scoreViewer",
    { x: 0, y: 0, color: "rgba(0, 255, 128, 0.75)", text: null },
    // Draw callback
    (ctx, element) => {
      if (!element.text) return;
      ctx.fillStyle = element.color;
      ctx.font = `bold ${20 / zoomableCanvas.scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(element.text, element.x, element.y + 14 / zoomableCanvas.scale);
    },
    (element, worldX, worldY) => false // Disable picking drag and drop
  );

  // Add Dart tip debug viewer
  zoomableCanvas.addOverlayElement(
    "dartTip",
    { x: 40, y: 0, pt_radius: 1.5, radius: 10, color: "rgba(0, 128, 255, 0.5)" },
    // Draw callback
    (ctx, element) => {
      //if(!element.text) return;
      ctx.fillStyle = element.color;
      ctx.beginPath();
      ctx.arc(element.x, element.y, element.pt_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = element.color;
      ctx.lineWidth = 1 / zoomableCanvas.scale;
      ctx.beginPath();
      let dec = element.radius / zoomableCanvas.scale;
      ctx.moveTo(element.x - dec, element.y - dec);
      ctx.lineTo(element.x + dec, element.y + dec);
      ctx.moveTo(element.x + dec, element.y - dec);
      ctx.lineTo(element.x - dec, element.y + dec);
      ctx.stroke();

      // ctx.font = `bold ${20 / zoomableCanvas.scale}px Arial`;
      // ctx.textAlign = 'center';
      // ctx.fillText(element.text, element.x, element.y + 14/ zoomableCanvas.scale);
    },
    (element, worldX, worldY) => false // Disable picking drag and drop
  );

  // Add Dart tip debug viewer
  zoomableCanvas.addOverlayElement(
    "dartDebug",
    { x: 0, y: 0, boxes: null },
    // Draw callback
    (ctx, element) => {
      if (!element.boxes) return;
      element.boxes.forEach((b) => {
        ctx.strokeStyle = classes_colors[b[4]];
        ctx.lineWidth = 1.5 / zoomableCanvas.scale;
        ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
      });

      // ctx.font = `bold ${20 / zoomableCanvas.scale}px Arial`;
      // ctx.textAlign = 'center';
      // ctx.fillText(element.text, element.x, element.y + 14/ zoomableCanvas.scale);
    },
    (element, worldX, worldY) => false // Disable picking drag and drop
  );

  // Add Debug Element to help detect problems of dazrt detection
  zoomableCanvas.addOverlayElement(
    "dartImpactDebug",
    {
      imgs: [null, null, null, null, null],
      width: 0,
      height: 0,
      net: dartnet,
      x: 0,
      y: 0,
      current: 0,
      color: [255, 0, 0, 0.8],
      bb: null,
      setDetected(grayImg, width, height) {
        const imageData = new ImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < grayImg.data.length; i++) {
          const value = grayImg.data[i];
          data[i * 4] = Math.floor(((255 - value) * this.color[0]) / 255); // R
          data[i * 4 + 1] = Math.floor(((255 - value) * this.color[1]) / 255); // G
          data[i * 4 + 2] = Math.floor(((255 - value) * this.color[2]) / 255); // B
          data[i * 4 + 3] = 255; //Math.floor((value < 20 ? 0 : 1) * this.color[3] * 255); // A
        }
        this.imgs[this.current] = ImageProcessor.imageDataToImage(imageData);
        this.current = (this.current + 1) % this.imgs.length;

        const bb = ImageProcessor.computeGrayscaleThresholdBox(grayImg.data, width, height, 40);
        this.bb = [bb[0] / width, bb[1] / height, bb[2] / width, bb[3] / height];
        console.log("THRESHOLD BOUNDING BOX:", this.bb);
      },
    },
    // Draw callback
    (ctx, element) => {
      const ca = element.net?.cropArea;
      if (!ca) return;

      let x = 0;
      let y = dartnet.videoSource.videoHeight + 10;
      element.imgs.forEach((img) => {
        if (img) {
          //ctx.drawImage(element.img, 0, 0, element.width, element.height, ca[0], ca[1], ca[2], ca[3]);
          //console.log(img, x, y);
          ctx.drawImage(img, 0, 0, img.width, img.height, x, y, ca[2], ca[3]);

          if (img.bb) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.strokeRect(
              x + img.bb[0] * ca[2],
              y + img.bb[1] * ca[3],
              (img.bb[2] - img.bb[0]) * ca[2],
              (img.bb[3] - img.bb[1]) * ca[3]
            );
          }

          x += img.width + 10;
        }
      });
    }
  );

  // Set up event callbacks
  zoomableCanvas.addOnElementSelected((id, element) => {
    console.debug(`Selected element: ${id}`, element);
  });

  zoomableCanvas.addOnElementDrag((id, element, worldCoords) => {
    console.debug(`Dragging ${id} to:`, element.x, element.y);

    if (id.includes("calib")) {
      console.debug(`Moving calibration point ${element.num}`);
      if (dartnet.sourceCalibPts) {
        dartnet.sourceCalibPts[element.num] = [element.x, element.y];
        dartnet.updateCalibPoints(dartnet.sourceCalibPts);
        recomputeUpTextPos();
      }
    } else if (id == "20") {
      const possible = element.compute_possible();
      const distances = possible.map((p) => MathUtils.distance(p, [element.x, element.y]));
      var indexMin = distances.indexOf(Math.min(...distances));
      var rotMatrix = MathUtils.createRotationMatrix((((indexMin + 5) % 30) * 360) / 20);
      var boardRotated = MathUtils.rotatePoints(dartnet.board.board_cal_pts, rotMatrix);
      var newCalib = PerspectiveUtils.transformPoints(boardRotated, dartnet.Mi);
      dartnet.updateCalibPoints(newCalib);
      onCalibrationSuccess(newCalib, false, false);
    }
  });

  zoomableCanvas.addOnElementDragEnd((id, element, worldCoords) => {
    console.debug(`Finished dragging ${id}`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing UI...");

  initializeSettingsUI();
  initializeMainVariables();

  initializeToggleButtons();
  initializeToggleButtonGroups();
  initializeHardwareUI();

  initializeVideoFileUI();
  initializeCameraManagementUI();
  intializeAutoCalibUI();

  initializeMqttUI();
  initializeDartDetectionUI();

  initZoomableCanvasUI();

  periodicUpdateUI();
});
