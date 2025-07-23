// Board dictionary mapping angle segments to dartboard numbers
// const BOARD_DICT = {
//   0: "6",
//   1: "13",
//   2: "4",
//   3: "18",
//   4: "1",
//   5: "20",
//   6: "5",
//   7: "12",
//   8: "9",
//   9: "14",
//   10: "11",
//   11: "8",
//   12: "16",
//   13: "7",
//   14: "19",
//   15: "3",
//   16: "17",
//   17: "2",
//   18: "15",
//   19: "10",
// };
BOARD_DICT = {
  0: "13",
  1: "4",
  2: "18",
  3: "1",
  4: "20",
  5: "5",
  6: "12",
  7: "9",
  8: "14",
  9: "11",
  10: "8",
  11: "16",
  12: "7",
  13: "19",
  14: "3",
  15: "17",
  16: "2",
  17: "15",
  18: "10",
  19: "6",
};
class Board {
  constructor(boardPath = "dummy") {
    this.boardPath = boardPath;
    this.r_board = 0.2255; //170.0;
    this.r_double = 0.17; //162.0;
    this.r_treble = 0.1064; //107.0;
    this.r_outer_bull = 0.0174; //15.9;
    this.r_inner_bull = 0.007; //6.35;
    this.w_double_treble = 0.01; //8.0;
    this.board_cal_pts = [
      [0.17, 0],
      [0, 0.17],
      [-0.17, 0],
      [0, -0.17],
    ];
    this.initializeCrossSections();
  }

  initializeCrossSections() {
    this.pts = [];
    this.outer_ids = [];

    // Générer les points d'intersection des lignes radiales avec les cercles
    for (let i = 0; i < 20; i++) {
      const angle = (i * 18 * Math.PI) / 180;
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);

      // Points sur différents rayons
      this.outer_ids.push(this.pts.length);
      const radii = [
        this.r_double,
        this.r_double - this.w_double_treble,
        this.r_treble,
        this.r_treble - this.w_double_treble,
      ]; //, this.r_outer_bull];
      radii.forEach((r) => {
        this.pts.push([r * cos_a, r * sin_a]);
      });
    }
  }

  getCrossSectionsPts() {
    return [this.pts, this.outer_ids];
  }

  transformCals(matrix, inverse = false) {
    return this.board_cal_pts.map((pt) => this.transformPoint(pt, matrix));
  }

  transformPoint(point, matrix) {
    // Transformation de point basique avec matrice 3x3
    const [x, y] = point;
    const w = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
    return [
      (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / w,
      (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / w,
    ];
  }

  draw(canvas, pts, detectedCenter = null) {
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;

    // Dessiner les points de calibration
    pts.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 5, 0, 2 * Math.PI);
      ctx.stroke();
    });

    if (detectedCenter) {
      ctx.strokeStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(detectedCenter[0], detectedCenter[1], 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  getDartScores(calibPts, tipsPts, numeric = false, offsetCenter = null) {
    // Get perspective transformation matrix
    const M = PerspectiveUtils.getPerspectiveTransform(calibPts, this.board_cal_pts);
    if (!M) {
      throw new Error("Could not calculate perspective transformation");
    }

    // Transform tips points to board coordinates
    let tipsBoardArray = PerspectiveUtils.transformPoints(tipsPts, M);
    if (offsetCenter) {
      const offsetCenterBoard = PerspectiveUtils.transformPoints([offsetCenter], M)[0];
      tipsBoardArray = tipsBoardArray.map((p) => [p[0] - offsetCenterBoard[0], p[1] - offsetCenterBoard[1]]);
    }

    // Calculate angles and distances
    const angles = tipsBoardArray.map(([x, y]) => {
      let angle = (Math.atan2(-y, x) * 180) / Math.PI - 9;
      return angle < 0 ? angle + 360 : angle; // map to 0-360
    });

    const distances = tipsBoardArray.map(([x, y]) => Math.sqrt(x * x + y * y));

    const scores = [];

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      const dist = distances[i];

      if (dist > this.r_double) {
        scores.push("0");
      } else if (dist <= this.r_inner_bull) {
        scores.push("DB");
      } else if (dist <= this.r_outer_bull) {
        scores.push("B");
      } else {
        // Add 9 degrees (half sector) to center the sectors properly
        const adjustedAngle = (angle + 9) % 360;
        const number = BOARD_DICT[Math.floor(adjustedAngle / 18)];
        //const number = BOARD_DICT[Math.floor(angle / 18)];

        if (dist <= this.r_double && dist > this.r_double - this.w_double_treble) {
          scores.push("D" + number);
        } else if (dist <= this.r_treble && dist > this.r_treble - this.w_double_treble) {
          scores.push("T" + number);
        } else {
          scores.push(number);
        }
      }
    }

    // Convert to numeric if requested
    if (numeric) {
      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        if (s.includes("B")) {
          scores[i] = s.includes("D") ? 50 : 25;
        } else {
          if (s.includes("D") || s.includes("T")) {
            const baseScore = parseInt(s.substring(1));
            scores[i] = s.includes("D") ? baseScore * 2 : baseScore * 3;
          } else {
            scores[i] = parseInt(s);
          }
        }
      }
    }

    return scores;
  }
}
