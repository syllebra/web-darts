class YOLO {
  static processYoloOnnxResults(results) {
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
    return boxes;
  }
}
