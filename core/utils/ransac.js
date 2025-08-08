// Extended Mathematical utilities for perspective transformation
const MathUtils = {
  random: (min, max) => Math.random() * (max - min) + min,

  norm: (vector) => Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)),

  distance: (p1, p2) => Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2),

  angle: (v1, v2) => Math.acos(v1[0] * v2[0] + (v1[1] * v2[1]) / (MathUtils.norm(v1) * MathUtils.norm(v2))),

  randomInt: (min, max) => Math.floor(Math.random() * (max - min) + min),

  mean: (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length,

  log: Math.log,

  pow: Math.pow,

  PI: Math.PI,

  sin: Math.sin,

  cos: Math.cos,

  sqrt: Math.sqrt,

  abs: Math.abs,

  // Matrix operations for perspective transform
  matrixMultiply: (A, B) => {
    const result = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        result[i][j] = 0;
        for (let k = 0; k < B.length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  },

  // Solve linear system Ax = b using Gaussian elimination
  solveLinearSystem: (A, b) => {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make diagonal element 1
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) return null; // Singular matrix

      for (let j = i; j < n + 1; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i];
        for (let j = i; j < n + 1; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
    }

    return x;
  },

  /**
   * Creates a 2D rotation matrix from an angle in degrees
   * @param {number} angleDegrees - The rotation angle in degrees
   * @returns {Array<Array<number>>} - 2x2 rotation matrix
   */
  createRotationMatrix: (angleDegrees) => {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    return [
      [cos, -sin],
      [sin, cos],
    ];
  },

  /**
   * Applies a rotation matrix to a list of 2D points
   * @param {Array<Array<number>>} points - Array of [x, y] coordinate pairs
   * @param {Array<Array<number>>} rotationMatrix - 2x2 rotation matrix
   * @returns {Array<Array<number>>} - Array of rotated [x, y] coordinate pairs
   */
  rotatePoints: (points, rotationMatrix) => {
    return points.map((point) => {
      const [x, y] = point;
      const [[m00, m01], [m10, m11]] = rotationMatrix;

      return [m00 * x + m01 * y, m10 * x + m11 * y];
    });
  },
};

// Abstract Model class
class Model {
  constructor() {
    this.N = 1; // Minimum number of points needed
  }

  build(points) {
    throw new Error("build method must be implemented");
  }

  calcErrors(points) {
    throw new Error("calcErrors method must be implemented");
  }
}

// EllipseModel class extending Model
class EllipseModel extends Model {
  constructor() {
    super();
    this.N = 5; // Minimum 5 points needed to fit an ellipse
    this.ellipse = null; // Will store {center: [x, y], axes: [a, b], angle: θ}
  }

  /**
   * Build ellipse model from points using algebraic fitting
   * @param {Array} points - Array of [x, y] points
   * @returns {boolean} - Success/failure of fitting
   */
  build(points) {
    if (points.length < this.N) {
      return false;
    }

    try {
      this.ellipse = this.fitEllipse(points);
      return this.ellipse !== null;
    } catch (error) {
      console.warn("Ellipse fitting failed:", error);
      this.ellipse = null;
      return false;
    }
  }

  /**
   * Calculate distances from points to the fitted ellipse
   * @param {Array} points - Array of [x, y] points
   * @returns {Array} - Array of distances
   */
  calcErrors(points) {
    if (!this.ellipse) {
      return points.map(() => Infinity);
    }
    const errors = [];
    for (let i = 0; i < points.length; i++) {
      const result = this.pointToEllipseDistance(points[i], this.ellipse);
      errors.push(result.distance);
    }
    return errors;

    // return points.map(point => {
    //     const result = this.pointToEllipseDistance(point, this.ellipse);
    //     console.debug(result.distance)
    //     return result.distance * result.distance;
    // });
  }

  /**
   * Get the current ellipse parameters
   * @returns {Object|null} - Ellipse parameters or null if not fitted
   */
  getEllipse() {
    return this.ellipse;
  }

  /**
   * Check if a point is inside the ellipse
   * @param {Array} point - [x, y] point
   * @returns {boolean} - True if inside
   */
  isPointInside(point) {
    if (!this.ellipse) {
      return false;
    }

    const [px, py] = point;
    const [cx, cy] = this.ellipse.center;
    const [a, b] = this.ellipse.axes;
    const angle = this.ellipse.angle;

    // Transform point to ellipse coordinate system
    const cos_angle = Math.cos(-angle);
    const sin_angle = Math.sin(-angle);

    const tx = (px - cx) * cos_angle - (py - cy) * sin_angle;
    const ty = (px - cx) * sin_angle + (py - cy) * cos_angle;

    // Check if point is inside ellipse: (x/a)² + (y/b)² <= 1
    const normalized = (tx * tx) / (a * a) + (ty * ty) / (b * b);
    return normalized <= 1.0;
  }

  /**
   * Get the closest point on the ellipse to a given point
   * @param {Array} point - [x, y] point
   * @returns {Object} - {distance: number, closestPoint: [x, y]}
   */
  getClosestPoint(point) {
    if (!this.ellipse) {
      return { distance: Infinity, closestPoint: null };
    }

    return this.pointToEllipseDistance(point, this.ellipse);
  }

  /**
   * Fit ellipse to points using algebraic method
   * @param {Array} points - Array of [x, y] points
   * @returns {Object|null} - Ellipse parameters or null if failed
   */
  // fitEllipse(points) {
  //     // Use algebraic ellipse fitting (Fitzgibbon method)
  //     // Fit conic: ax² + bxy + cy² + dx + ey + f = 0
  //     // with constraint 4ac - b² = 1 (ellipse constraint)

  //     const n = points.length;
  //     if (n < 5) return null;

  //     // Build design matrix
  //     const D = [];
  //     for (let i = 0; i < n; i++) {
  //         const [x, y] = points[i];
  //         D.push([x*x, x*y, y*y, x, y, 1]);
  //     }

  //     // Solve using least squares with constraint
  //     const result = this.solveConstrainedEllipse(D);
  //     if (!result) return null;

  //     // Convert conic parameters to ellipse parameters
  //     return this.conicToEllipse(result);
  // }

  fitEllipse(points) {
    try {
      // Convert points to OpenCV format
      const cvPoints = new cv.MatVector();
      const pointsMat = cv.matFromArray(
        points.length,
        1,
        cv.CV_32FC2,
        points.flat().map((x) => parseFloat(x))
      );

      // Fit ellipse using OpenCV
      const rotatedRect = cv.fitEllipse(pointsMat);

      // Extract ellipse parameters
      const center = [rotatedRect.center.x, rotatedRect.center.y];
      const axes = [rotatedRect.size.width / 2, rotatedRect.size.height / 2];
      const angle = (rotatedRect.angle * Math.PI) / 180; // Convert to radians

      // Clean up
      pointsMat.delete();

      return {
        center: center,
        axes: axes,
        angle: angle,
      };
    } catch (error) {
      console.error("Error fitting ellipse:", error);
      throw error;
    }
  }

  /**
   * Solve constrained ellipse fitting problem
   * @param {Array} D - Design matrix
   * @returns {Array|null} - Conic coefficients [a, b, c, d, e, f]
   */
  solveConstrainedEllipse(D) {
    const n = D.length;

    // Create scatter matrix S = D^T * D
    const S = Array(6)
      .fill(0)
      .map(() => Array(6).fill(0));

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        for (let k = 0; k < n; k++) {
          S[i][j] += D[k][i] * D[k][j];
        }
      }
    }

    // Constraint matrix C for ellipse constraint 4ac - b² = 1
    const C = Array(6)
      .fill(0)
      .map(() => Array(6).fill(0));
    C[0][2] = 2; // 4ac term (coefficient of a*c)
    C[2][0] = 2; // 4ac term (coefficient of c*a)
    C[1][1] = -1; // -b² term

    // Solve generalized eigenvalue problem: S*v = λ*C*v
    // For simplicity, we'll use a direct algebraic approach
    // This is a simplified version - in practice, you might want to use a proper eigenvalue solver

    try {
      // Use Cholesky decomposition approach for stability
      const result = this.solveEllipseAlgebraic(S, C);
      return result;
    } catch (error) {
      console.warn("Algebraic ellipse fitting failed, using fallback method");
      return this.fitEllipseFallback(D);
    }
  }

  /**
   * Solve ellipse fitting using algebraic method
   * @param {Array} S - Scatter matrix
   * @param {Array} C - Constraint matrix
   * @returns {Array|null} - Solution vector
   */
  solveEllipseAlgebraic(S, C) {
    // Simplified direct solution for ellipse fitting
    // This implements a basic version of the Fitzgibbon method

    // For robustness, we'll use a different approach:
    // Minimize ||D*a||² subject to constraint

    // Use the fact that for an ellipse, we can normalize
    // Let's solve it directly using the method of Lagrange multipliers

    // Build augmented system
    const A = Array(7)
      .fill(0)
      .map(() => Array(7).fill(0));

    // Copy S matrix
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        A[i][j] = S[i][j];
      }
    }

    // Add constraint row/column
    A[0][6] = 4; // ∂(4ac-b²)/∂a = 4c
    A[6][0] = 4;
    A[1][6] = -2; // ∂(4ac-b²)/∂b = -2b
    A[6][1] = -2;
    A[2][6] = 4; // ∂(4ac-b²)/∂c = 4a
    A[6][2] = 4;

    // Solve using Gaussian elimination
    const solution = this.gaussianElimination(A);

    if (!solution) return null;

    // Return the first 6 components (ellipse parameters)
    return solution.slice(0, 6);
  }

  /**
   * Fallback ellipse fitting method
   * @param {Array} D - Design matrix
   * @returns {Array|null} - Conic coefficients
   */
  fitEllipseFallback(D) {
    // Simple least squares without constraint
    // Normalize by setting one coefficient to 1

    const n = D.length;
    if (n < 5) return null;

    // Set f = 1 and solve for other coefficients
    const A = [];
    const b = [];

    for (let i = 0; i < n; i++) {
      const [x, y] = [D[i][0], D[i][1]]; // x², xy from D matrix construction
      const row = [Math.sqrt(D[i][0]), D[i][1], D[i][2], D[i][3], D[i][4]]; // [x², xy, y², x, y]
      A.push(row);
      b.push(-1); // -f where f = 1
    }

    // Solve using least squares
    const solution = this.leastSquares(A, b);
    if (!solution) return null;

    return [...solution, 1]; // [a, b, c, d, e, f]
  }

  /**
   * Simple least squares solver
   * @param {Array} A - Coefficient matrix
   * @param {Array} b - Right-hand side
   * @returns {Array|null} - Solution vector
   */
  leastSquares(A, b) {
    const m = A.length;
    const n = A[0].length;

    // Build normal equations: A^T * A * x = A^T * b
    const AtA = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));
    const Atb = Array(n).fill(0);

    // Compute A^T * A
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < m; k++) {
          AtA[i][j] += A[k][i] * A[k][j];
        }
      }
    }

    // Compute A^T * b
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < m; k++) {
        Atb[i] += A[k][i] * b[k];
      }
    }

    // Solve AtA * x = Atb
    return this.solveLinearSystem(AtA, Atb);
  }

  /**
   * Solve linear system using Gaussian elimination
   * @param {Array} A - Coefficient matrix
   * @param {Array} b - Right-hand side
   * @returns {Array|null} - Solution vector
   */
  solveLinearSystem(A, b) {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      }

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        return null;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < n + 1; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  }

  /**
   * Gaussian elimination for augmented matrix
   * @param {Array} A - Augmented matrix
   * @returns {Array|null} - Solution vector
   */
  gaussianElimination(A) {
    const n = A.length;
    const m = A[0].length;

    // Forward elimination
    for (let i = 0; i < n - 1; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
      }

      // Check for singular matrix
      if (Math.abs(A[i][i]) < 1e-10) {
        return null;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = A[k][i] / A[i][i];
        for (let j = i; j < m; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }

    // Back substitution
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = A[i][m - 1];
      for (let j = i + 1; j < n; j++) {
        x[i] -= A[i][j] * x[j];
      }
      if (Math.abs(A[i][i]) < 1e-10) {
        return null;
      }
      x[i] /= A[i][i];
    }

    return x;
  }

  /**
   * Convert conic parameters to ellipse parameters
   * @param {Array} conic - [a, b, c, d, e, f] coefficients
   * @returns {Object|null} - Ellipse parameters
   */
  conicToEllipse(conic) {
    const [a, b, c, d, e, f] = conic;

    // Check if it's actually an ellipse
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      console.warn("Conic is not an ellipse (discriminant >= 0)");
      return null;
    }

    // Calculate center
    const denominator = b * b - 4 * a * c;
    const cx = (2 * c * d - b * e) / denominator;
    const cy = (2 * a * e - b * d) / denominator;

    // Calculate angle
    let angle = 0;
    if (Math.abs(b) > 1e-10) {
      angle = Math.atan2(c - a - Math.sqrt((a - c) * (a - c) + b * b), b);
    }

    // Calculate axes lengths
    const numerator = 2 * (a * e * e + c * d * d + f * b * b - 2 * b * d * e - 4 * a * c * f);
    const denominator1 = (b * b - 4 * a * c) * (Math.sqrt((a - c) * (a - c) + b * b) - (a + c));
    const denominator2 = (b * b - 4 * a * c) * (-Math.sqrt((a - c) * (a - c) + b * b) - (a + c));

    if (denominator1 <= 0 || denominator2 <= 0) {
      console.warn("Invalid ellipse parameters");
      return null;
    }

    const axisA = Math.sqrt(numerator / denominator1);
    const axisB = Math.sqrt(numerator / denominator2);

    // Ensure axes are positive and ordered (major, minor)
    if (axisA <= 0 || axisB <= 0) {
      console.warn("Negative axis lengths");
      return null;
    }

    const majorAxis = Math.max(axisA, axisB);
    const minorAxis = Math.min(axisA, axisB);

    // Adjust angle if we swapped axes
    if (axisB > axisA) {
      angle += Math.PI / 2;
    }

    // Normalize angle to [0, 2π)
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    return {
      center: [cx, cy],
      axes: [majorAxis, minorAxis],
      angle: angle,
    };
  }

  /**
   * Robust distance calculation from point to ellipse
   * @param {Array} point - [x, y] point
   * @param {Object} ellipse - Ellipse parameters
   * @returns {Object} - {distance: number, closestPoint: [x, y]}
   */
  pointToEllipseDistance(point, ellipse) {
    const [px, py] = point;
    const [cx, cy] = ellipse.center;
    const [a, b] = ellipse.axes;
    const angle = ellipse.angle;

    // Transform point to ellipse coordinate system
    const cos_angle = Math.cos(-angle);
    const sin_angle = Math.sin(-angle);

    const tx = (px - cx) * cos_angle - (py - cy) * sin_angle;
    const ty = (px - cx) * sin_angle + (py - cy) * cos_angle;

    // Find closest point on ellipse using robust algorithm
    const closest = this.robustClosestPointOnEllipse(tx, ty, a, b);

    // Transform closest point back to original coordinate system
    const cos_angle_back = Math.cos(angle);
    const sin_angle_back = Math.sin(angle);

    const closest_x = closest[0] * cos_angle_back - closest[1] * sin_angle_back + cx;
    const closest_y = closest[0] * sin_angle_back + closest[1] * cos_angle_back + cy;

    // Calculate Euclidean distance
    const dx = px - closest_x;
    const dy = py - closest_y;

    return {
      distance: Math.sqrt(dx * dx + dy * dy),
      closestPoint: [closest_x, closest_y],
    };
  }

  /**
   * Robust closest point calculation on ellipse
   * @param {number} px - X coordinate in ellipse space
   * @param {number} py - Y coordinate in ellipse space
   * @param {number} a - Semi-major axis
   * @param {number} b - Semi-minor axis
   * @returns {Array} - [x, y] closest point
   */
  robustClosestPointOnEllipse(px, py, a, b) {
    // Handle degenerate cases
    if (a <= 0 || b <= 0) {
      return [0, 0];
    }

    // Ensure a >= b for consistency (swap if needed)
    let swapped = false;
    if (b > a) {
      [a, b] = [b, a];
      [px, py] = [py, px];
      swapped = true;
    }

    // Work with absolute values and restore signs later
    const sign_x = Math.sign(px);
    const sign_y = Math.sign(py);
    px = Math.abs(px);
    py = Math.abs(py);

    // Special cases
    if (px === 0 && py === 0) {
      let result = [a, 0];
      if (swapped) result = [result[1], result[0]];
      return [result[0] * sign_x, result[1] * sign_y];
    }

    if (py === 0) {
      let result = [a, 0];
      if (swapped) result = [result[1], result[0]];
      return [result[0] * sign_x, result[1] * sign_y];
    }

    if (px === 0) {
      let result = [0, b];
      if (swapped) result = [result[1], result[0]];
      return [result[0] * sign_x, result[1] * sign_y];
    }

    // Check if the closest point might be at vertices
    const vertices = [
      [a, 0], // Right vertex
      [0, b], // Top vertex
      [-a, 0], // Left vertex
      [0, -b], // Bottom vertex
    ];

    let bestDistance = Infinity;
    let bestPoint = [a, 0];

    // Check all vertices
    for (const vertex of vertices) {
      const vx = Math.abs(vertex[0]);
      const vy = Math.abs(vertex[1]);
      const dist = Math.sqrt((px - vx) * (px - vx) + (py - vy) * (py - vy));
      if (dist < bestDistance) {
        bestDistance = dist;
        bestPoint = [vx, vy];
      }
    }

    // Use Newton-Raphson to find the closest point
    let t = Math.atan2(py * a, px * b); // Initial guess

    for (let iteration = 0; iteration < 50; iteration++) {
      const cos_t = Math.cos(t);
      const sin_t = Math.sin(t);

      const ex = a * cos_t;
      const ey = b * sin_t;

      // Vector from ellipse point to target point
      const rx = ex - px;
      const ry = ey - py;

      // Tangent vector
      const qx = -a * sin_t;
      const qy = b * cos_t;

      // First derivative of distance squared
      const f = rx * qx + ry * qy;

      // Second derivative of distance squared
      const df = qx * qx + qy * qy + rx * (-a * cos_t) + ry * (-b * sin_t);

      if (Math.abs(f) < 1e-12 || Math.abs(df) < 1e-12) {
        break;
      }

      const delta = f / df;
      t = t - delta;

      if (Math.abs(delta) < 1e-12) {
        break;
      }
    }

    // Calculate the candidate point from Newton-Raphson
    const candidate_x = a * Math.cos(t);
    const candidate_y = b * Math.sin(t);

    // Check if the Newton-Raphson solution is better
    const nr_dist = Math.sqrt((px - candidate_x) * (px - candidate_x) + (py - candidate_y) * (py - candidate_y));

    if (nr_dist < bestDistance) {
      bestPoint = [candidate_x, candidate_y];
      bestDistance = nr_dist;
    }

    // Additional robustness: try multiple starting points for Newton-Raphson
    const startingAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, Math.atan2(py, px)];

    for (const startAngle of startingAngles) {
      t = startAngle;

      for (let iteration = 0; iteration < 30; iteration++) {
        const cos_t = Math.cos(t);
        const sin_t = Math.sin(t);

        const ex = a * cos_t;
        const ey = b * sin_t;

        const rx = ex - px;
        const ry = ey - py;

        const qx = -a * sin_t;
        const qy = b * cos_t;

        const f = rx * qx + ry * qy;
        const df = qx * qx + qy * qy + rx * (-a * cos_t) + ry * (-b * sin_t);

        if (Math.abs(f) < 1e-12 || Math.abs(df) < 1e-12) {
          break;
        }

        const delta = f / df;
        t = t - delta;

        if (Math.abs(delta) < 1e-12) {
          break;
        }
      }

      const test_x = a * Math.cos(t);
      const test_y = b * Math.sin(t);
      const test_dist = Math.sqrt((px - test_x) * (px - test_x) + (py - test_y) * (py - test_y));

      if (test_dist < bestDistance) {
        bestPoint = [test_x, test_y];
        bestDistance = test_dist;
      }
    }

    // Restore signs
    bestPoint[0] *= sign_x;
    bestPoint[1] *= sign_y;

    // Restore coordinate order if we swapped
    if (swapped) {
      bestPoint = [bestPoint[1], bestPoint[0]];
    }

    return bestPoint;
  }
}

// Example usage:
/*
const ellipseModel = new EllipseModel();

// Generate some sample points (in practice, these would be your data points)
const points = [
    [100, 50], [120, 80], [140, 100], [160, 110], [180, 100],
    [200, 80], [220, 50], [200, 20], [180, 0], [160, -10],
    [140, 0], [120, 20]
];

// Fit the ellipse
if (ellipseModel.build(points)) {
    console.debug('Ellipse fitted successfully:', ellipseModel.getEllipse());
    
    // Calculate errors for all points
    const errors = ellipseModel.calcErrors(points);
    console.debug('Errors:', errors);
    
    // Test a specific point
    const testPoint = [150, 60];
    const result = ellipseModel.getClosestPoint(testPoint);
    console.debug('Closest point result:', result);
    
    // Check if point is inside
    const isInside = ellipseModel.isPointInside(testPoint);
    console.debug('Point inside ellipse:', isInside);
} else {
    console.debug('Failed to fit ellipse');
}
*/
// Fixed Center Circle Model Implementation
class FixedCenterCircleModel extends Model {
  constructor(center) {
    super();
    this.N = 1;
    this.center = center || [0, 0];
    this.radius = 0;
  }

  build(points) {
    if (points.length > 0) {
      this.radius = MathUtils.distance(points[0], this.center);
    }
    return this.radius;
  }

  calcErrors(points) {
    const errors = [];
    for (let i = 0; i < points.length; i++) {
      const distance = MathUtils.distance(points[i], this.center);
      errors.push(MathUtils.abs(distance - this.radius));
    }
    return errors;
  }
}

// Perspective transformation utilities
const PerspectiveUtils = {
  // Calculate perspective transform matrix from 4 point correspondences
  getPerspectiveTransform: (src, dst) => {
    if (src.length !== 4 || dst.length !== 4) {
      throw new Error("Need exactly 4 point correspondences");
    }

    // Set up the system of equations for perspective transformation
    // We need to solve for 8 unknowns (h11, h12, h13, h21, h22, h23, h31, h32)
    // h33 is set to 1 for normalization
    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i];
      const [u, v] = dst[i];

      // First equation: u = (h11*x + h12*y + h13) / (h31*x + h32*y + 1)
      // Rearranged: h11*x + h12*y + h13 - u*h31*x - u*h32*y = u
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      b.push(u);

      // Second equation: v = (h21*x + h22*y + h23) / (h31*x + h32*y + 1)
      // Rearranged: h21*x + h22*y + h23 - v*h31*x - v*h32*y = v
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      b.push(v);
    }

    const solution = MathUtils.solveLinearSystem(A, b);
    if (!solution) return null;

    // Construct the 3x3 transformation matrix
    return [
      [solution[0], solution[1], solution[2]],
      [solution[3], solution[4], solution[5]],
      [solution[6], solution[7], 1],
    ];
  },

  // Transform points using perspective transformation matrix
  transformPoints: (points, matrix) => {
    if (!matrix) return null;

    return points.map((point) => {
      const [x, y] = point;
      const w = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
      const u = (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / w;
      const v = (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / w;
      return [u, v];
    });
  },
};

// Simple nearest neighbor implementation
class NearestNeighbors {
  constructor(points) {
    this.points = points;
  }

  kneighbors(queryPoints, k = 1) {
    const distances = [];
    const indices = [];

    queryPoints.forEach((queryPoint) => {
      const pointDistances = this.points.map((point, index) => ({
        distance: MathUtils.distance(queryPoint, point),
        index: index,
      }));

      pointDistances.sort((a, b) => a.distance - b.distance);

      distances.push([pointDistances[0].distance]);
      indices.push(pointDistances[0].index);
    });

    return { distances, indices };
  }
}

// PerspectiveBoardFit model implementation
class PerspectiveBoardFit extends Model {
  constructor(src, dst, minDist = 5) {
    super();
    this.N = 4; // Need 4 point correspondences for perspective transform
    this.M = null; // Transformation matrix
    this.src = src; // Source points
    this.dst = dst; // Destination points
    this.minDist = minDist;
  }

  build(pairs) {
    if (pairs.length !== 4) {
      return null;
    }

    // Extract source and destination points from pairs
    const srcPoints = pairs.map((pair) => this.src[pair[0]]);
    const dstPoints = pairs.map((pair) => this.dst[pair[1]]);

    // Validate that we have exactly 4 points
    if (srcPoints.length !== 4 || dstPoints.length !== 4) {
      return null;
    }

    // Calculate perspective transformation matrix
    this.M = PerspectiveUtils.getPerspectiveTransform(srcPoints, dstPoints);
    return this.M;
  }

  calcErrors(pairs) {
    if (!this.M) {
      //throw new Error("Model not built yet. Call build() first.");
      return Array(this.dst.length).fill(10000);
    }

    // Transform all source points using the perspective matrix
    const projectedPoints = PerspectiveUtils.transformPoints(this.src, this.M);

    if (!projectedPoints) {
      return Array(this.dst.length).fill(10000);
    }

    // Find nearest neighbors
    const nbrs = new NearestNeighbors(projectedPoints);
    const { distances, indices } = nbrs.kneighbors(this.dst, 1);

    // Count occurrences of each index to detect multiple matches
    const indexCounts = {};
    indices.forEach((idx) => {
      indexCounts[idx] = (indexCounts[idx] || 0) + 1;
    });

    // Penalize points that are matched multiple times
    const penalizedDistances = distances.map((dist, i) => {
      const idx = indices[i];
      if (indexCounts[idx] !== 1) {
        return 10000; // High error for multiple matches
      }
      return dist[0];
    });

    return penalizedDistances;
  }
}

// RANSAC Implementation
function ransacFit(
  model,
  points,
  successProbability = 0.98,
  outlierRatio = 0.45,
  inlierThreshold = 3.0,
  debugCb = null
) {
  const maxNormErrSq = inlierThreshold * inlierThreshold;

  let bestModelPtsIds = null;
  let bestNInliers = 0;
  let bestInliersError = Infinity;

  const nPnts = points.length;

  // Break if too few points to fit model
  if (nPnts < model.N) {
    return null;
  }

  // Compute maximum iterations
  const maxIters = Math.round(
    MathUtils.log(1 - successProbability) / MathUtils.log(1 - MathUtils.pow(1 - outlierRatio, model.N))
  );
  console.debug(maxIters);

  // RANSAC iterations
  for (let iter = 0; iter < maxIters; iter++) {
    //console.debug("Ransac iteration: ", iter, "/", maxIters);
    // Select N points at random
    const pntsId = [];
    for (let i = 0; i < model.N; i++) {
      pntsId.push(MathUtils.randomInt(0, nPnts));
    }

    const samplePnts = pntsId.map((id) => points[id]);

    // Build model from selected points
    try {
      model.build(samplePnts);
    } catch (e) {
      continue;
    }

    // Calculate errors for all points
    const errors = model.calcErrors(points);

    // Identify inliers
    const inliers = [];
    for (let i = 0; i < errors.length; i++) {
      if (errors[i] * errors[i] < maxNormErrSq) {
        inliers.push(i);
      }
    }

    //console.debug("Iteration ", iter, ": Inliers:", inliers.length, "/", errors.length);
    const nInliers = inliers.length;

    // Protect fitting from too few points
    if (nInliers < model.N) {
      continue;
    }

    // Update best model
    if (nInliers > bestNInliers) {
      bestNInliers = nInliers;
      bestModelPtsIds = pntsId.slice();
      bestInliersError = MathUtils.mean(inliers.map((i) => errors[i]));
    } else if (nInliers === bestNInliers) {
      const meanErr = MathUtils.mean(inliers.map((i) => errors[i]));
      if (meanErr < bestInliersError) {
        bestInliersError = meanErr;
        bestModelPtsIds = pntsId.slice();
      }
    }
  }
  console.debug("bestModelPtsIds:", bestModelPtsIds);
  console.debug("bestNInliers:", bestNInliers);
  console.debug("bestInliersError:", bestInliersError);
  if (bestModelPtsIds) {
    const bestPoints = bestModelPtsIds.map((id) => points[id]);
    return {
      model: model.build(bestPoints),
      inliers: bestNInliers,
      error: bestInliersError,
    };
  }

  return null;
}
