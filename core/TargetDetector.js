// Configuration des secteurs du dartboard
const SECTORS_DICT = {
  0: "20",
  1: "1",
  2: "18",
  3: "4",
  4: "13",
  5: "6",
  6: "10",
  7: "15",
  8: "2",
  9: "17",
  10: "3",
  11: "19",
  12: "7",
  13: "16",
  14: "8",
  15: "11",
  16: "14",
  17: "9",
  18: "12",
  19: "5",
};

class YoloTargetDetector {
  constructor(
    board,
    modelPath = "../../models/best_n_tip_boxes_cross_640_B.onnx",
    modelSize = 640,
    initCallback = null
  ) {
    console.log("Chargement du modèle YoloTargetDetector...");
    this.modelPath = modelPath;
    this.modelSize = modelSize;
    this.session = null;
    this.board = board instanceof Board ? board : new Board();

    this.bouter = null;
    this.binner = null;
    this.ptsCal = null;
    this.coarseCenter = null;

    const [pts, outerIds] = this.board.getCrossSectionsPts();
    this.pts = pts;
    this.outerIds = outerIds;
    this.initCallback = initCallback;
    this.initializeModel();
  }

  async initializeModel() {
    try {
      //this.session = await ort.InferenceSession.create(this.modelPath, { executionProviders: ['webgpu'] });
      this.session = await ort.InferenceSession.create(this.modelPath);
      console.log("Modèle ONNX chargé avec succès", this.session);
      if (this.initCallback) this.initCallback();
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      // Utiliser un modèle de démo si le vrai modèle n'est pas disponible
      this.session = null;
      if (this.initCallback) this.initCallback();
    }
  }

  async infer(imageData) {
    if (!this.session) {
      return null;
    }

    try {
      const tensor = new ort.Tensor(Float32Array.from(imageData), [1, 3, 640, 640]);
      const results = await this.session.run({ images: tensor });

      return this.processOnnxResults(results);
    } catch (error) {
      console.error("Erreur lors de l'inférence:", error);
      return null;
    }
  }

  processOnnxResults(results) {
    const inferedCalib = [null, null, null, null];
    const inferedCalibConf = [0, 0, 0, 0];

    // Traitement des résultats ONNX
    // Cette partie dépend du format de sortie du modèle ONNX
    //const output = results.output;

    /**
     * Function calculates "Intersection-over-union" coefficient for specified two boxes
     * https://pyimagesearch.com/2016/11/07/intersection-over-union-iou-for-object-detection/.
     * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability]
     * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability]
     * @returns Intersection over union ratio as a float number
     */
    function iou(box1, box2) {
      return intersection(box1, box2) / union(box1, box2);
    }

    /**
     * Function calculates union area of two boxes.
     *     :param box1: First box in format [x1,y1,x2,y2,object_class,probability]
     *     :param box2: Second box in format [x1,y1,x2,y2,object_class,probability]
     *     :return: Area of the boxes union as a float number
     * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
     * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
     * @returns Area of the boxes union as a float number
     */
    function union(box1, box2) {
      const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
      const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
      const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
      const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
      return box1_area + box2_area - intersection(box1, box2);
    }

    /**
     * Function calculates intersection area of two boxes
     * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
     * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
     * @returns Area of intersection of the boxes as a float number
     */
    function intersection(box1, box2) {
      const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
      const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
      const x1 = Math.max(box1_x1, box2_x1);
      const y1 = Math.max(box1_y1, box2_y1);
      const x2 = Math.min(box1_x2, box2_x2);
      const y2 = Math.min(box1_y2, box2_y2);
      return (x2 - x1) * (y2 - y1);
    }

    /**
     * Function used to convert RAW output from YOLOv8 to an array of detected objects.
     * Each object contains the bounding box, class, and confidence score.
     * @param output Raw output of YOLOv8 network (Float32Array)
     * @param img_width Width of original image
     * @param img_height Height of original image
     * @returns Array of detected objects in format [[x1,y1,x2,y2,class_id,confidence], ...]
     */
    function process_output(outputs, img_width, img_height, inferred) {
      // YOLOv8 output format explanation:
      // - The output is a flat array of length 8400 * (num_classes + 4)
      // - For each of the 8400 anchor boxes, we have:
      //   - 4 box coordinates (xc, yc, w, h)
      //   - num_classes confidence scores
      // - In your case, num_classes is 9 (from your yolo_classes array)

      const output = outputs["output0"].data;
      const num_classes = outputs["output0"]["dims"][1] - 4; //yolo_classes.length;
      let boxes = [];

      // Iterate through all 8400 anchor boxes
      for (let index = 0; index < 8400; index++) {
        // Get the class with highest confidence
        let max_class = 0;
        let max_confidence = 0;

        // Check class confidences (they start at offset 4*8400)
        for (let class_id = 0; class_id < num_classes; class_id++) {
          const confidence = output[8400 * (4 + class_id) + index];
          if (confidence > max_confidence) {
            max_confidence = confidence;
            max_class = class_id;
          }
        }
        // Skip boxes with low confidence
        if (max_confidence < 0.3) {
          continue;
        }

        const xc = output[index]; // x-center
        const yc = output[8400 + index]; // y-center
        const w = output[2 * 8400 + index]; // width
        const h = output[3 * 8400 + index]; // height

        // Convert from center+width to xyxy format
        const x1 = ((xc - w / 2) * img_width) / 640;
        const y1 = ((yc - h / 2) * img_height) / 640;
        const x2 = ((xc + w / 2) * img_width) / 640;
        const y2 = ((yc + h / 2) * img_height) / 640;
        const box = [x1, y1, x2, y2, max_class, max_confidence];
        boxes.push(box);
      }

      // Non-maximum suppression to remove overlapping boxes
      boxes.sort((a, b) => b[5] - a[5]); // Sort by confidence (descending)

      const final_boxes = [];
      while (boxes.length > 0) {
        final_boxes.push(boxes[0]);
        // Remove boxes that overlap too much with the current box
        boxes = boxes.filter((box) => iou(boxes[0], box) < 0.85);
      }

      return [final_boxes, inferred];
      // return [boxes, inferred];
    }

    var outputs = process_output(results, 640, 640, null);
    var boxes = outputs[0];
    console.log(
      "DETECTED BOXES:",
      boxes.map((b) => b[4])
    );
    const cross = boxes.filter((b) => b[4] === 6).map((b) => [(b[2] + b[0]) * 0.5, (b[3] + b[1]) * 0.5]);
    let binner = boxes.filter((b) => b[4] === 7);
    let bouter = boxes.filter((b) => b[4] === 8);
    binner = binner.length >= 1 ? binner[0] : null;
    bouter = bouter.length >= 1 ? bouter[0] : null;
    console.log(binner);
    console.log(bouter);
    return {
      cross,
      bouter,
      binner,
      inferedCalib,
      inferedCalibConf,
    };
  }

  filterPercentiles(distances) {
    const sorted = [...distances].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return distances.map((d, i) => (d < lowerBound || d > upperBound ? i : -1)).filter((i) => i !== -1);
  }

  // RGB float (0..1)
  async detect(input, canvasContext = null, imgData = null) {
    this.bouter = null;
    this.binner = null;
    this.ptsCal = null;

    // Step 1: Infer using trained model to find board intersections
    //  -------------
    const inferenceResults = await this.infer(input);
    const { cross: corners, bouter, binner, inferedCalib, inferedCalibConf } = inferenceResults;

    this.bouter = bouter;
    this.binner = binner;

    if (canvasContext) {
      console.log(canvasContext);
      //if (imgData) canvasContext.putImageData(imgData, 0, 0);
      canvasContext.strokeStyle = "#ffff00";
      corners.forEach((corner) => {
        canvasContext.beginPath();
        canvasContext.arc(corner[0], corner[1], 3, 0, 2 * Math.PI);
        canvasContext.stroke();
      });
    }

    // Step 2: Coarse initialisation using rough center/scale
    // -------------
    let orig = this.pts.map((pt) => [pt[0] / this.board.r_double, pt[1] / this.board.r_double]);

    const rotMat = MathUtils.createRotationMatrix(-360 / 40);
    orig = MathUtils.rotatePoints(orig, rotMat);

    let center = [0, 0];

    if (corners.length > 0) {
      center = corners.reduce((acc, corner) => [acc[0] + corner[0], acc[1] + corner[1]], [0, 0]);
      center = [center[0] / corners.length, center[1] / corners.length];
    }

    // try finer center
    let finer = false;
    if (bouter) {
      center = [(bouter[0] + bouter[2]) * 0.5, (bouter[1] + bouter[3]) * 0.5];
      finer = true;
    } else if (binner) {
      center = [(binner[0] + binner[2]) * 0.5, (binner[1] + binner[3]) * 0.5];
      finer = true;
    }

    // try removing outliers for better finding in more global captures
    const distances = corners.map((corner) =>
      Math.sqrt(Math.pow(corner[0] - center[0], 2) + Math.pow(corner[1] - center[1], 2))
    );
    const filteredIndices = this.filterPercentiles(distances);
    const filteredCorners = corners.filter((_, i) => !filteredIndices.includes(i));
    if (canvasContext) {
      canvasContext.fillStyle = "#ff8800";
      filteredCorners.forEach((corner) => {
        canvasContext.beginPath();
        canvasContext.arc(corner[0], corner[1], 3, 0, 2 * Math.PI);
        canvasContext.fill();
      });
    }

    if (!finer && filteredCorners.length > 0) {
      center = filteredCorners.reduce((acc, corner) => [acc[0] + corner[0], acc[1] + corner[1]], [0, 0]);
      center = [center[0] / filteredCorners.length, center[1] / filteredCorners.length];
    }

    // Calcul de l'échelle
    const maxDistances = filteredCorners.reduce(
      (max, corner) => {
        const dx = Math.abs(corner[0] - center[0]);
        const dy = Math.abs(corner[1] - center[1]);
        return [Math.max(max[0], dx), Math.max(max[1], dy)];
      },
      [0, 0]
    );

    const scale = [Math.max(maxDistances[0]), Math.max(maxDistances[1])];
    const mult = 1.0;
    const pts = orig.map((pt) => [pt[0] * scale[0] * mult + center[0], pt[1] * scale[1] * mult + center[1]]);

    // if (canvasContext) {
    //     canvasContext.strokeStyle = '#0088FF';
    //     pts.forEach(corner => {
    //         canvasContext.beginPath();
    //         canvasContext.arc(corner[0], corner[1], 5, 0, 2 * Math.PI);
    //         canvasContext.stroke();
    //     });
    // }

    // Step 3: Iterative closest point algorithm to find some matching pairs
    // -------------
    // transformation_history, aligned_points, closest_point_pairs = icp(
    //     pts, corners, distance_threshold=15, point_pairs_threshold=10, verbose=False
    // )
    let icpInstance = new ICPAlgorithm();
    const result = icpInstance.icp(pts, filteredCorners, {
      maxIterations: 100,
      distanceThreshold: 15,
      convergenceTranslationThreshold: 1e-3,
      convergenceRotationThreshold: 1e-4,
      pointPairsThreshold: 10,
      verbose: true,
    });
    console.log(result);

    const alignedPoints = result.alignedPoints;
    const pointPairs = result.closestPointPairsId;
    const rejectedPairs = result.rejectedPairs;

    // if (canvasContext) {
    //     canvasContext.strokeStyle = '#FF88FF';
    //     pointPairs.forEach(pair => {
    //         const corner = alignedPoints[pair[1]];
    //         const orig = filteredCorners[pair[1]]
    //         canvasContext.beginPath();
    //         canvasContext.arc(corner[0], corner[1], 5, 0, 2 * Math.PI);
    //         canvasContext.stroke();
    //         canvasContext.moveTo(corner[0], corner[1]); // Move the pen to (30, 50)
    //         canvasContext.lineTo(orig[0], orig[1]); // Draw a line to (150, 100)
    //         canvasContext.stroke();
    //     });
    // }

    // Step 4: First ransac fitting to find reasonable target pose
    // -------------
    let M = ransacFit(new PerspectiveBoardFit(this.pts, filteredCorners), pointPairs, 0.99, 0.7, 5);
    if (M == null)
      return {
        calibrationPoints: null,
        transformation: null,
        confidence: 0.0,
      };

    this.ptsCal = PerspectiveUtils.transformPoints(this.board.board_cal_pts, M.model);
    if (canvasContext) {
      canvasContext.fillStyle = "#FFFFFF";
      this.ptsCal.forEach((p, i) => {
        canvasContext.fillRect(p[0] - 5, p[1] - 5, 10, 10);
      });
    }
    // Step 5: match 4 calibrations points to refine pose
    // -------------
    //const nbrs = new NearestNeighbors(corners);

    // Step 6: Second ransac fitting using more correspondence pair for finer fit
    // -------------
    const projected = PerspectiveUtils.transformPoints(this.pts, M.model);
    const nn = ICPAlgorithm.findNearestNeighbors(corners, projected);
    console.log(nn);
    let validPairs = [];
    for (let i = 0; i < nn.length; i++)
      if (nn[i].distance < 10 && this.outerIds.includes(i)) validPairs.push([nn[i].index, i]);

    console.log("Valid Pairs:", validPairs);

    if (canvasContext) {
      // projected.forEach( (p,i) => {
      //     canvasContext.strokeStyle = this.outerIds.includes(i) ? '#FFFFFF' : '#FF88FF';
      //     canvasContext.strokeRect(p[0]-5,p[1]-5,10,10)
      // })

      validPairs.forEach((pair) => {
        //console.log(pair)
        canvasContext.strokeStyle = this.outerIds.includes(pair[0]) ? "#FFFFFF" : "#FF88FF";
        // const corner = corners[pair[1]];
        // const orig = projected[pair[0]]
        // canvasContext.fillRect(orig[0]-5,orig[1]-5,10,10)

        // canvasContext.strokeStyle = ctx.fillStyle;
        // canvasContext.fillStyle ='#88FFFF'
        // canvasContext.fillRect(corner[0]-5,corner[1]-5,10,10)

        // canvasContext.beginPath();
        // canvasContext.moveTo(corner[0], corner[1]); // Move the pen to (30, 50)
        // canvasContext.lineTo(orig[0], orig[1]); // Draw a line to (150, 100)
        // canvasContext.stroke();

        const corner = corners[pair[1]];
        const orig = projected[pair[0]];
        canvasContext.beginPath();
        canvasContext.arc(corner[0], corner[1], 10, 0, 2 * Math.PI);
        canvasContext.stroke();
        canvasContext.moveTo(corner[0], corner[1]); // Move the pen to (30, 50)
        canvasContext.lineTo(orig[0], orig[1]); // Draw a line to (150, 100)
        canvasContext.stroke();
      });
    }

    let M_fit = ransacFit(new PerspectiveBoardFit(this.pts, corners), validPairs, 0.999, 0.7, 1.5);
    if (M_fit == null) console.warn("Unable to improve accuracy...");
    else M = M_fit;

    // tr_xy = this.board.transformCals(M, False)
    // if len(tr_xy) < 4:
    //     return None, None, 0

    this.coarseCenter = center;
    console.log(this.coarseCenter);
    // Étapes 5-8: Algorithmes de correspondance et RANSAC
    // Implémentation simplifiée - dans un vrai projet, il faudrait implémenter ICP, RANSAC, etc.

    // Simulation d'une transformation perspective

    console.log("Perspective Matrix:", M.model);
    this.ptsCal = PerspectiveUtils.transformPoints(this.board.board_cal_pts, M.model);
    this.coarseCenter = PerspectiveUtils.transformPoints([[0, 0]], M.model)[0];
    //this.ptsCal = this.board.transformCals(M.model);
    console.log("Points cal:", this.ptsCal);

    if (canvasContext) {
      this.drawBoard(canvasContext);
    }

    return {
      calibrationPoints: this.ptsCal,
      transformation: M.model,
      confidence: filteredCorners.length,
    };
  }

  drawBoard(canvasContext) {
    if (this.ptsCal) {
      const detectedCenter = this.bouter
        ? [(this.bouter[0] + this.bouter[2]) * 0.5, (this.bouter[1] + this.bouter[3]) * 0.5]
        : null;

      this.board.draw(canvasContext, this.ptsCal, detectedCenter);
    }

    if (this.bouter) {
      canvasContext.strokeStyle = "#00ff00";
      canvasContext.lineWidth = 1;
      canvasContext.strokeRect(
        this.bouter[0],
        this.bouter[1],
        this.bouter[2] - this.bouter[0],
        this.bouter[3] - this.bouter[1]
      );
    }

    if (this.binner) {
      canvasContext.strokeStyle = "#ff0000ff";
      canvasContext.lineWidth = 1;
      canvasContext.strokeRect(
        this.binner[0],
        this.binner[1],
        this.binner[2] - this.binner[0],
        this.binner[3] - this.binner[1]
      );
    }

    if (this.coarseCenter) {
      canvasContext.strokeStyle = "ffF00ff";
      canvasContext.lineWidth = 3;
      canvasContext.beginPath();
      canvasContext.arc(this.coarseCenter[0], this.coarseCenter[1], 5, 0, 2 * Math.PI);
      canvasContext.stroke();
    }
  }

  getDartScores(tipsPts, numeric = false) {
    // Implémentation plus précise avec le centre détecté
    let detectedCenter = null;
    if (this.bouter) {
      detectedCenter = [(this.bouter[0] + this.bouter[2]) * 0.5, (this.bouter[1] + this.bouter[3]) * 0.5];
    } else if (this.binner) {
      detectedCenter = [(this.binner[0] + this.binner[2]) * 0.5, (this.binner[1] + this.binner[3]) * 0.5];
    }

    return this.board.getDartScores(this.ptsCal, tipsPts, numeric, detectedCenter);
  }
}
