class ICPAlgorithm {
  constructor() {
    this.transformationHistory = [];
    this.currentIteration = 0;
    this.pointPairs = [];
    this.rejectedPairs = [];
  }

  static euclideanDistance(point1, point2) {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  static calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  static calculateMAD(values, median) {
    const deviations = values.map((v) => Math.abs(v - median));
    return ICPAlgorithm.calculateMedian(deviations);
  }

  static pointBasedMatching(pointPairs) {
    if (pointPairs.length === 0) {
      return { rotAngle: null, translationX: null, translationY: null };
    }

    let xMean = 0,
      yMean = 0,
      xpMean = 0,
      ypMean = 0;
    const n = pointPairs.length;

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

  static filterPointPairs(points, referencePoints, neighbors, distanceThreshold, useOutlierRejection) {
    const allPairs = [];
    const allDistances = [];

    for (let i = 0; i < neighbors.length; i++) {
      if (neighbors[i].index !== -1) {
        allPairs.push({
          sourcePoint: points[i],
          refPoint: referencePoints[neighbors[i].index],
          sourceIndex: i,
          refIndex: neighbors[i].index,
          distance: neighbors[i].distance,
        });
        allDistances.push(neighbors[i].distance);
      }
    }

    const thresholdFiltered = allPairs.filter((pair) => pair.distance < distanceThreshold);

    if (!useOutlierRejection || thresholdFiltered.length < 4) {
      return {
        validPairs: thresholdFiltered,
        rejectedPairs: allPairs.filter((pair) => pair.distance >= distanceThreshold),
      };
    }

    const filteredDistances = thresholdFiltered.map((p) => p.distance);
    const median = ICPAlgorithm.calculateMedian(filteredDistances);
    const mad = ICPAlgorithm.calculateMAD(filteredDistances, median);
    const outlierThreshold = median + 2.5 * mad;

    const validPairs = thresholdFiltered.filter((pair) => pair.distance <= outlierThreshold);
    const rejectedPairs = allPairs.filter(
      (pair) => pair.distance >= distanceThreshold || pair.distance > outlierThreshold
    );

    return { validPairs, rejectedPairs };
  }

  static transformPoints(points, rotAngle, translationX, translationY) {
    const cos = Math.cos(rotAngle);
    const sin = Math.sin(rotAngle);

    return points.map((point) => [
      point[0] * cos - point[1] * sin + translationX,
      point[0] * sin + point[1] * cos + translationY,
    ]);
  }

  run(
    referencePoints,
    points,
    maxIterations = 100,
    distanceThreshold = 50,
    convergenceTranslationThreshold = 0.1,
    convergenceRotationThreshold = 1e-3,
    pointPairsThreshold = 5,
    useOutlierRejection = true
  ) {
    this.transformationHistory = [];
    let currentPoints = points.map((p) => [...p]);
    let lastValidPairs = [];
    let lastRejectedPairs = [];

    for (let iterNum = 0; iterNum < maxIterations; iterNum++) {
      console.log(iterNum);
      const neighbors = ICPAlgorithm.findNearestNeighbors(currentPoints, referencePoints);
      const { validPairs, rejectedPairs } = ICPAlgorithm.filterPointPairs(
        currentPoints,
        referencePoints,
        neighbors,
        distanceThreshold,
        useOutlierRejection
      );

      if (validPairs.length < pointPairsThreshold) {
        break;
      }

      lastValidPairs = validPairs;
      lastRejectedPairs = rejectedPairs;

      const pointPairs = validPairs.map((pair) => [pair.sourcePoint, pair.refPoint]);
      const { rotAngle, translationX, translationY } = ICPAlgorithm.pointBasedMatching(pointPairs);

      if (rotAngle === null || translationX === null || translationY === null) {
        break;
      }

      currentPoints = ICPAlgorithm.transformPoints(currentPoints, rotAngle, translationX, translationY);

      this.transformationHistory.push({
        rotation: [
          [Math.cos(rotAngle), -Math.sin(rotAngle)],
          [Math.sin(rotAngle), Math.cos(rotAngle)],
        ],
        translation: [translationX, translationY],
        validPairs: validPairs,
        rejectedPairs: rejectedPairs,
      });

      if (
        Math.abs(rotAngle) < convergenceRotationThreshold &&
        Math.abs(translationX) < convergenceTranslationThreshold &&
        Math.abs(translationY) < convergenceTranslationThreshold
      ) {
        break;
      }
    }

    return {
      transformationHistory: this.transformationHistory,
      alignedPoints: currentPoints,
      validPairs: lastValidPairs,
      rejectedPairs: lastRejectedPairs,
    };
  }
}
