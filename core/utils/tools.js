function segmentIntersection(seg1, seg2) {
  // Extract coordinates for readability
  const [x1, y1] = seg1.start;
  const [x2, y2] = seg1.end;
  const [x3, y3] = seg2.start;
  const [x4, y4] = seg2.end;

  // Calculate direction vectors
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x4 - x3;
  const dy2 = y4 - y3;

  // Calculate the denominator for the parametric equations
  const denominator = dx1 * dy2 - dy1 * dx2;

  // Check if lines are parallel (denominator is 0)
  if (Math.abs(denominator) < 1e-10) {
    // Lines are parallel - check if they're collinear
    const dx3 = x3 - x1;
    const dy3 = y3 - y1;

    // Check if points are collinear using cross product
    const crossProduct = dx3 * dy1 - dy3 * dx1;

    if (Math.abs(crossProduct) < 1e-10) {
      // Lines are collinear - check for overlap
      return checkCollinearOverlap(seg1, seg2);
    } else {
      // Lines are parallel but not collinear - no intersection
      return { intersects: false };
    }
  }

  // Calculate parameters for intersection point
  const t1 = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denominator;
  const t2 = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denominator;

  // Check if intersection point lies within both segments
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    // Calculate intersection point
    const x = x1 + t1 * dx1;
    const y = y1 + t1 * dy1;

    return {
      intersects: true,
      point: [x, y],
      t1: t1,
      t2: t2,
    };
  } else {
    // Lines intersect but not within the segment bounds
    return { intersects: false };
  }
}

function checkCollinearOverlap(seg1, seg2) {
  // For collinear segments, project onto the axis with larger range
  const dx1 = Math.abs(seg1.end[0] - seg1.start[0]);
  const dy1 = Math.abs(seg1.end[1] - seg1.start[1]);

  let axis = dx1 >= dy1 ? 0 : 1; // 0 for x-axis, 1 for y-axis

  // Get segment ranges on the chosen axis
  let [a1, a2] = [seg1.start[axis], seg1.end[axis]];
  let [b1, b2] = [seg2.start[axis], seg2.end[axis]];

  // Ensure ranges are ordered (min, max)
  if (a1 > a2) [a1, a2] = [a2, a1];
  if (b1 > b2) [b1, b2] = [b2, b1];

  // Check for overlap
  const overlapStart = Math.max(a1, b1);
  const overlapEnd = Math.min(a2, b2);

  if (overlapStart <= overlapEnd) {
    // There is overlap
    if (Math.abs(overlapStart - overlapEnd) < 1e-10) {
      // Single point overlap
      const point = axis === 0 ? [overlapStart, seg1.start[1]] : [seg1.start[0], overlapStart];
      return {
        intersects: true,
        point: point,
        type: "point",
      };
    } else {
      // Segment overlap
      const startPoint = axis === 0 ? [overlapStart, seg1.start[1]] : [seg1.start[0], overlapStart];
      const endPoint = axis === 0 ? [overlapEnd, seg1.start[1]] : [seg1.start[0], overlapEnd];

      return {
        intersects: true,
        segment: { start: startPoint, end: endPoint },
        type: "segment",
      };
    }
  } else {
    return { intersects: false };
  }
}

// Helper function to convert segments for segmentIntersection
function seg_intersect(seg1_start, seg1_end, seg2_start, seg2_end) {
  const segment1 = { start: seg1_start, end: seg1_end };
  const segment2 = { start: seg2_start, end: seg2_end };

  const result = segmentIntersection(segment1, segment2);

  if (result.intersects && result.point) {
    return result.point;
  } else {
    throw new Error("Segments do not intersect at a single point");
  }
}

function autoCrop(pts_cal, width, height) {
  // Get intersection center point
  const center = seg_intersect(pts_cal[0], pts_cal[2], pts_cal[1], pts_cal[3]);

  // Calculate basic crop bounds (not used in mode 0, but matching original)
  const x1 = Math.floor(center[0] - 12);
  const y1 = Math.floor(center[1] - 12);
  const x2 = Math.floor(center[0] + 12);
  const y2 = Math.floor(center[1] + 12);

  const mode = 0;

  if (mode === 0) {
    // Calculate distances from center to all points, scaled by 1.35
    const distances = pts_cal.map((point) => [(point[0] - center[0]) * 1.35, (point[1] - center[1]) * 1.35]);

    // Find maximum absolute distance
    let maxDist = 0;
    for (const dist of distances) {
      maxDist = Math.max(maxDist, Math.abs(dist[0]), Math.abs(dist[1]));
    }

    // Create crop bounds with clipping
    const crop = [
      Math.floor(Math.max(0, Math.min(width, center[0] - maxDist))), // left
      Math.floor(Math.max(0, Math.min(height, center[1] - maxDist))), // top
      Math.floor(Math.max(0, Math.min(width, center[0] + maxDist))), // right
      Math.floor(Math.max(0, Math.min(height, center[1] + maxDist))), // bottom
    ];

    return crop;
  }

  // If mode is not 0, return basic crop bounds
  return [x1, y1, x2, y2];
}
