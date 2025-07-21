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

  getDartScores(calibPts, tipsPts, numeric = false) {
    // Implémentation simplifiée du calcul des scores
    const scores = [];
    tipsPts.forEach((tip) => {
      // Calcul basique - à améliorer selon la logique métier
      const distance = Math.sqrt(tip[0] * tip[0] + tip[1] * tip[1]);
      if (distance > this.r_double) {
        scores.push("0");
      } else if (distance <= this.r_inner_bull) {
        scores.push("DB");
      } else if (distance <= this.r_outer_bull) {
        scores.push("B");
      } else {
        scores.push("20"); // Valeur par défaut
      }
    });
    return scores;
  }
}
