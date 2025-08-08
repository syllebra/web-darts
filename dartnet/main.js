async function reinitDetectorsCallbacks() {
  //dartnet.initDetectors();
  if (!dartnet?.dartDetector?.onDetectionCallbacks.includes(onDartDetected))
    dartnet.dartDetector.onDetectionCallbacks.push(onDartDetected);
  console.log("Ondetection callbacks:", dartnet?.dartDetector?.onDetectionCallbacks);
}

window.addEventListener("DOMContentLoaded", () => {
  reinitDetectorsCallbacks();

  // Fake calibration Init (basic)
  // const initCalibPts = [
  //   [640, 320],
  //   [320, 640],
  //   [0, 320],
  //   [320, 0],
  // ];

  const alpha = -Math.PI / 20;
  const initCalibPts = [0, 0.5, 1, 1.5].map((a) => [
    Math.cos(a * Math.PI + alpha) * 320 + 320,
    Math.sin(a * Math.PI + alpha) * 320 + 320,
  ]);

  dartnet.cropArea = [-150, -150, 800, 800];
  dartnet.updateCalibPoints(initCalibPts);
  onCalibrationSuccess(initCalibPts, false, true);
});

let animationId = null;
async function processFrame() {
  let wait = false;
  if (
    dartnet?.dartDetector &&
    dartnet?.dartDetector.currentStatus != DartDetectorStatus.DETECTING &&
    dartnet?.dartDetector.currentStatus != DartDetectorStatus.DETECTED
  )
    wait = true;
  if (
    !dartnet?.videoSource ||
    dartnet?.dartDetector?.pauseDetection ||
    dartnet.videoSource.readyState !== dartnet.videoSource.HAVE_ENOUGH_DATA
  )
    wait = true;
  if (!wait) {
    try {
      dartnet?.detectDartImpact();
    } catch (err) {
      console.error("Error processing frame:", err);
    }
  }
  animationId = requestAnimationFrame(processFrame);
}
processFrame();

function recomputeUpTextPos() {
  const upText = PerspectiveUtils.transformPoints(
    [
      [
        Math.cos(Math.PI * 1.5 + Math.PI / 20) * dartnet.board.r_double * 1.2,
        Math.sin(Math.PI * 1.5 + Math.PI / 20) * dartnet.board.r_double * 1.2,
      ],
    ],
    dartnet.Mi
  )[0];
  let el = zoomableCanvas.getOverlayElement("20");
  el.x = upText[0];
  el.y = upText[1];
}

function onCalibrationSuccess(calibPts, log = true, autozoom = true) {
  if (log) console.log("Calibration succeed:", calibPts);
  for (let i = 0; i < calibPts.length; i++) {
    const p = calibPts[i];
    let el = zoomableCanvas.getOverlayElement(`calib${i}`);
    el.x = p[0];
    el.y = p[1];
  }
  recomputeUpTextPos();
  if (autozoom) zoomableCanvas.autoZoomVideo(20, true, dartnet.cropArea);
}

document.getElementById("videoCanvas").addEventListener("mousemove", (event) => {
  const srcP = zoomableCanvas.canvasToWorld(event.clientX, event.clientY);
  const score = dartnet.sourceCalibPts
    ? dartnet.board.getDartScores(dartnet.sourceCalibPts, [[srcP.x, srcP.y]])[0]
    : null;
  let element = zoomableCanvas.getOverlayElement("scoreViewer");
  element.x = srcP.x + 40 / zoomableCanvas.scale;
  element.y = srcP.y;
  element.text = score;
});

function onDartDetected(data) {
  console.log("DartImpact main:", data);

  zoomableCanvas
    .getOverlayElement("dartImpactDebug")
    ?.setDetected(data.delta, dartnet.dartDetector.modelSize, dartnet.dartDetector.modelSize);

  const tips = data.boxes.filter((b) => b[4] == 0);
  const confidencesTips = tips.map((b) => (b[4] == 0 ? b[5] : -1.0));
  if (dartnet.targetDetector && confidencesTips && confidencesTips.length) {
    var indexMax = confidencesTips.indexOf(Math.max(...confidencesTips));
    const b = tips[indexMax];
    const croppedP = [
      ((b[0] + b[2]) * 0.5) / dartnet.dartDetector.modelSize,
      ((b[1] + b[3]) * 0.5) / dartnet.dartDetector.modelSize,
    ];
    const srcP = dartnet.normalizedToSource(croppedP);
    const tipEl = zoomableCanvas.getOverlayElement("dartTip");
    if (tipEl) {
      tipEl.x = srcP[0];
      tipEl.y = srcP[1];
    }
    //console.log(dartnet.sourceCalibPts, srcP);
    var score = dartnet.sourceCalibPts
      ? dartnet.board.getDartScores(dartnet.sourceCalibPts, [[srcP[0], srcP[1]]])[0]
      : null;
    console.log("HIT ZONE:", score);
    Sound.zone(score);
    const cartesian = PerspectiveUtils.transformPoints([srcP], dartnet.M)[0];
    const hit = Throw.fromCartesian(cartesian[0], cartesian[1], dartnet.board.r_double, score, null);
    const message = new Paho.MQTT.Message(JSON.stringify(hit));
    message.destinationName = "dartnet/hit";
    dartnet.mqttClient?.send(message);
  }

  const dartDbg = zoomableCanvas.getOverlayElement("dartDebug");
  dartDbg.boxes = data.boxes.map((b) => {
    let tl = dartnet.normalizedToSource([b[0] / dartnet.dartDetector.modelSize, b[1] / dartnet.dartDetector.modelSize]);
    let br = dartnet.normalizedToSource([b[2] / dartnet.dartDetector.modelSize, b[3] / dartnet.dartDetector.modelSize]);
    return [tl[0], tl[1], br[0], br[1], b[4], b[5]];
  });
}
