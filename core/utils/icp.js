class ICPAlgorithm {
  constructor() {
    this.transformationHistory = [];
    this.verbose = false;
  }

  static euclideanDistance(point1, point2) {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  static pointBasedMatching(pointPairs) {
    const n = pointPairs.length;

    if (n === 0) {
      return { rotAngle: null, translationX: null, translationY: null };
    }

    let xMean = 0,
      yMean = 0,
      xpMean = 0,
      ypMean = 0;

    // Calculate means
    for (let pair of pointPairs) {
      const [x, y] = pair[0];
      const [xp, yp] = pair[1];
      xMean += x;
      yMean += y;
      xpMean += xp;
      ypMean += yp;
    }

    xMean /= n;
    yMean /= n;
    xpMean /= n;
    ypMean /= n;

    // Calculate covariance terms
    let sXXp = 0,
      sYYp = 0,
      sXYp = 0,
      sYXp = 0;
    for (let pair of pointPairs) {
      const [x, y] = pair[0];
      const [xp, yp] = pair[1];
      sXXp += (x - xMean) * (xp - xpMean);
      sYYp += (y - yMean) * (yp - ypMean);
      sXYp += (x - xMean) * (yp - ypMean);
      sYXp += (y - yMean) * (xp - xpMean);
    }

    const rotAngle = Math.atan2(sXYp - sYXp, sXXp + sYYp);
    const translationX = xpMean - (xMean * Math.cos(rotAngle) - yMean * Math.sin(rotAngle));
    const translationY = ypMean - (xMean * Math.sin(rotAngle) + yMean * Math.cos(rotAngle));

    return { rotAngle, translationX, translationY };
  }

  static findNearestNeighbors(points, referencePoints) {
    const neighbors = [];

    for (let i = 0; i < points.length; i++) {
      let minDistance = Infinity;
      let nearestIndex = -1;

      for (let j = 0; j < referencePoints.length; j++) {
        const distance = ICPAlgorithm.euclideanDistance(points[i], referencePoints[j]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = j;
        }
      }
      neighbors.push({ distance: minDistance, index: nearestIndex });
    }
    return neighbors;
  }

  static transformPoints(points, rotAngle, translationX, translationY) {
    const cos = Math.cos(rotAngle);
    const sin = Math.sin(rotAngle);

    return points.map((point) => [
      point[0] * cos - point[1] * sin + translationX,
      point[0] * sin + point[1] * cos + translationY,
    ]);
  }

  static degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  static radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
  }

  icp(referencePoints, points, options = {}) {
    // Set default parameters to match Python version
    const {
      maxIterations = 100,
      distanceThreshold = 0.3,
      convergenceTranslationThreshold = 1e-3,
      convergenceRotationThreshold = 1e-4,
      pointPairsThreshold = 10,
      verbose = false,
    } = options;

    this.verbose = verbose;
    this.transformationHistory = [];

    // Create a copy of points to avoid modifying the original
    let currentPoints = points.map((p) => [...p]);
    let closestPointPairsId = [];

    for (let iterNum = 0; iterNum < maxIterations; iterNum++) {
      if (this.verbose) {
        console.log(`------ iteration ${iterNum} ------`);
      }

      // Find nearest neighbors
      const neighbors = ICPAlgorithm.findNearestNeighbors(currentPoints, referencePoints);

      // Filter point pairs based on distance threshold
      const closestPointPairs = [];
      closestPointPairsId = [];

      for (let i = 0; i < neighbors.length; i++) {
        if (neighbors[i].distance < distanceThreshold) {
          closestPointPairs.push([currentPoints[i], referencePoints[neighbors[i].index]]);
          closestPointPairsId.push([neighbors[i].index, i]);
        }
      }

      if (this.verbose) {
        console.log(`number of pairs found: ${closestPointPairs.length}`);
      }

      // Check if we have enough point pairs
      if (closestPointPairs.length < pointPairsThreshold) {
        if (this.verbose) {
          console.log("No better solution can be found (very few point pairs)!");
        }
        break;
      }

      // Compute transformation using point correspondences
      const { rotAngle, translationX, translationY } = ICPAlgorithm.pointBasedMatching(closestPointPairs);

      if (this.verbose && rotAngle !== null) {
        console.log(`Rotation: ${ICPAlgorithm.radiansToDegrees(rotAngle)} degrees`);
        console.log(`Translation: ${translationX} ${translationY}`);
      }

      if (rotAngle === null || translationX === null || translationY === null) {
        if (this.verbose) {
          console.log("No better solution can be found!");
        }
        break;
      }

      // Transform points
      currentPoints = ICPAlgorithm.transformPoints(currentPoints, rotAngle, translationX, translationY);

      // Store transformation history in the same format as Python version
      const cos = Math.cos(rotAngle);
      const sin = Math.sin(rotAngle);
      const transformationMatrix = [
        [cos, -sin, translationX],
        [sin, cos, translationY],
        [0, 0, 1],
      ];

      this.transformationHistory.push(transformationMatrix);

      // Check convergence
      if (
        Math.abs(rotAngle) < convergenceRotationThreshold &&
        Math.abs(translationX) < convergenceTranslationThreshold &&
        Math.abs(translationY) < convergenceTranslationThreshold
      ) {
        if (this.verbose) {
          console.log("Converged!");
        }
        break;
      }
    }

    return {
      transformationHistory: this.transformationHistory,
      alignedPoints: currentPoints,
      closestPointPairsId: closestPointPairsId,
    };
  }

  // Convenience method to run ICP with the same interface as the old version
  run(
    referencePoints,
    points,
    maxIterations = 100,
    distanceThreshold = 0.3,
    convergenceTranslationThreshold = 1e-3,
    convergenceRotationThreshold = 1e-4,
    pointPairsThreshold = 10,
    useOutlierRejection = false,
    verbose = false
  ) {
    const options = {
      maxIterations,
      distanceThreshold,
      convergenceTranslationThreshold,
      convergenceRotationThreshold,
      pointPairsThreshold,
      verbose,
    };

    return this.icp(referencePoints, points, options);
  }
}

// Example usage:
/*
const icp = new ICPAlgorithm();

// Reference points and points to align
const referencePoints = [[0, 0], [1, 0], [0, 1], [1, 1]];
const points = [[0.1, 0.1], [1.1, 0.1], [0.1, 1.1], [1.1, 1.1]];

// Run ICP
const result = icp.icp(referencePoints, points, {
  maxIterations: 100,
  distanceThreshold: 0.3,
  convergenceTranslationThreshold: 1e-3,
  convergenceRotationThreshold: 1e-4,
  pointPairsThreshold: 10,
  verbose: true
});

console.log('Transformation history:', result.transformationHistory);
console.log('Aligned points:', result.alignedPoints);
console.log('Point pairs IDs:', result.closestPointPairsId);
*/
