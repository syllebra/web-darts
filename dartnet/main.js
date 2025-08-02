// Init main class instance
const dartnet = new DartNet(document.getElementById("videoElement"));

// Initialize the canvas with debug overlay
const zoomableCanvas = new ZoomablePannableCanvas("videoCanvas", "canvasContainer", "overlayCanvas");

let animationId = null;
async function processFrame() {
  let wait = false;
  if (
    dartnet.dartDetector &&
    dartnet.dartDetector.currentStatus != DartDetectorStatus.DETECTING &&
    dartnet.dartDetector.currentStatus != DartDetectorStatus.DETECTED
  )
    wait = true;
  if (
    !dartnet.videoSource ||
    dartnet.dartDetector?.pauseDetection ||
    dartnet.videoSource.readyState !== dartnet.videoSource.HAVE_ENOUGH_DATA
  )
    wait = true;
  if (!wait) {
    try {
      dartnet.detectDartImpact();
    } catch (err) {
      console.error("Error processing frame:", err);
    }
  }
  animationId = requestAnimationFrame(processFrame);
}
processFrame();

const autoCalib = async () => {
  console.log("Auto-calib start");
  return dartnet.calibrate();
};

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

function onCalibrationSuccess(calibPts) {
  console.log("Calibration succeed:", calibPts);
  for (let i = 0; i < calibPts.length; i++) {
    const p = calibPts[i];
    let el = zoomableCanvas.getOverlayElement(`calib${i}`);
    el.x = p[0];
    el.y = p[1];
  }
  recomputeUpTextPos();
  zoomableCanvas.autoZoomVideo(20, true, dartnet.cropArea);
}

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
      return Math.sqrt(dx * dx + dy * dy) <= element.circle_radius;
    }
  );
}

// Add "20" Element to help reorient in case it is needed
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
    if (!ca) return;
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

// Add "20" Element to help reorient in case it is needed
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
        x += img.width + 10;
      }
    });
  }
);

// Set up event callbacks
zoomableCanvas.setOnElementSelected((id, element) => {
  console.log(`Selected element: ${id}`, element);
});

zoomableCanvas.setOnElementDrag((id, element, worldCoords) => {
  console.log(`Dragging ${id} to:`, element.x, element.y);

  if (id.includes("calib")) {
    console.log(`Moving calibration point ${element.num}`);
    if (dartnet.sourceCalibPts) {
      dartnet.sourceCalibPts[element.num] = [element.x, element.y];
      dartnet.updateCalibPoints(dartnet.sourceCalibPts);
    }
  } else if (id == "20") {
    const possible = element.compute_possible();
    const distances = possible.map((p) => MathUtils.distance(p, [element.x, element.y]));
    var indexMin = distances.indexOf(Math.min(...distances));
    var rotMatrix = MathUtils.createRotationMatrix((((indexMin + 5) % 30) * 360) / 20);
    var boardRotated = MathUtils.rotatePoints(dartnet.board.board_cal_pts, rotMatrix);
    var newCalib = PerspectiveUtils.transformPoints(boardRotated, dartnet.Mi);
    dartnet.updateCalibPoints(newCalib);
    onCalibrationSuccess(newCalib);
  }
});

zoomableCanvas.setOnElementDragEnd((id, element, worldCoords) => {
  console.log(`Finished dragging ${id}`);
});

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
  //console.log("DartImpact:", data);

  const debugCanvas = document.getElementById("debugCanvas");
  if (debugCanvas) {
    debugCanvas.width = 640;
    debugCanvas.height = 640;

    const debugCtx = debugCanvas.getContext("2d");
    debugCtx.putImageData(ImageProcessor.grayscaleToImageData(data.delta), 0, 0);
    debugCtx.strokeStyle = "rgba(255, 255, 0, 1.0)";
    data.boxes.forEach((b) => {
      debugCtx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    });
  }

  zoomableCanvas
    .getOverlayElement("dartImpactDebug")
    ?.setDetected(data.delta, dartnet.dartDetector.modelSize, dartnet.dartDetector.modelSize);

  const confidencesTips = data.boxes.map((b) => (b[4] == 0 ? b[5] : -1.0));
  if (dartnet.targetDetector && confidencesTips && confidencesTips.length) {
    var indexMax = confidencesTips.indexOf(Math.max(...confidencesTips));
    const b = data.boxes[indexMax];
    const croppedP = [(b[0] + b[2]) * 0.5, (b[1] + b[3]) * 0.5];
    const srcP = dartnet.cropppedToSource(croppedP);
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
    let tl = dartnet.cropppedToSource([b[0], b[1]]);
    let br = dartnet.cropppedToSource([b[2], b[3]]);
    return [tl[0], tl[1], br[0], br[1], b[4], b[5]];
  });
}
