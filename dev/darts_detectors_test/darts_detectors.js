// Status enumeration
const Status = {
  DETECTING: 1,
  PAUSE: 2,
  DETECTED: 3,
};

/**
 * Base class for dart impact detection systems
 */
class DartDetector {
  constructor() {
    this.pauseDetection = false;
  }

  start() {
    // Placeholder implementation
  }

  stop() {
    // Placeholder implementation
  }

  onNewFrame(canvas) {
    // Process a new video frame
    return null;
  }
}

/**
 * Pure JavaScript implementation for image processing
 */
class ImageProcessor {
  static rgbToGrayscale(imageData) {
    const data = imageData.data;
    const grayscale = new Uint8Array(imageData.width * imageData.height);

    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to grayscale using luminance formula
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayscale[i / 4] = gray;
    }

    return {
      data: grayscale,
      width: imageData.width,
      height: imageData.height,
    };
  }

  static absDiff(img1, img2) {
    if (img1.width !== img2.width || img1.height !== img2.height) {
      throw new Error("Images must have the same dimensions");
    }

    const diff = new Uint8Array(img1.width * img1.height);
    for (let i = 0; i < diff.length; i++) {
      diff[i] = Math.abs(img1.data[i] - img2.data[i]);
    }

    return {
      data: diff,
      width: img1.width,
      height: img1.height,
    };
  }

  static threshold(img, threshValue) {
    const result = new Uint8Array(img.data.length);
    for (let i = 0; i < img.data.length; i++) {
      result[i] = img.data[i] > threshValue ? 255 : 0;
    }

    return {
      data: result,
      width: img.width,
      height: img.height,
    };
  }

  static countNonZero(img) {
    let count = 0;
    for (let i = 0; i < img.data.length; i++) {
      if (img.data[i] > 0) count++;
    }
    return count;
  }

  static grayscaleToImageData(grayImg) {
    const imageData = new ImageData(grayImg.width, grayImg.height);
    const data = imageData.data;

    for (let i = 0; i < grayImg.data.length; i++) {
      const value = grayImg.data[i];
      data[i * 4] = value; // R
      data[i * 4 + 1] = value; // G
      data[i * 4 + 2] = value; // B
      data[i * 4 + 3] = 255; // A
    }

    return imageData;
  }

  static resizeGrayscale(grayImg, newWidth, newHeight) {
    const resized = new Uint8Array(newWidth * newHeight);
    const scaleX = grayImg.width / newWidth;
    const scaleY = grayImg.height / newHeight;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIndex = srcY * grayImg.width + srcX;
        const destIndex = y * newWidth + x;
        resized[destIndex] = grayImg.data[srcIndex];
      }
    }

    return {
      data: resized,
      width: newWidth,
      height: newHeight,
    };
  }
}

/**
 * Video-only dart impact detector using pure JavaScript
 */
class DeltaVideoOnlyDartDetector extends DartDetector {
  constructor() {
    super();
    this.lastGray = null;
    this.lastDiff = null;
    this.lastDartTime = -1;
    this.temporalFilter = 200; // ms to wait to validate
    this.minMovementPct = 0.4;
    this.maxMovementPct = 10.0;
    this.threshold = 10.2;
    this.detectionCount = 0;
    this.onDetectionCallback = null;
    this.processingCanvas = document.createElement("canvas");
    this.processingCtx = this.processingCanvas.getContext("2d", { willReadFrequently: true });
  }

  onPause() {
    this.lastGray = null;
    this.lastDiff = null;
    this.lastDartTime = -1;
  }

  onNewFrame(video) {
    let detect = false;

    let maxD = Math.max(video.videoWidth, video.videoHeight);
    let W = Math.floor((video.videoWidth * 640) / maxD);
    let H = Math.floor((video.videoHeight * 640) / maxD);
    // console.log("Source:", video.videoWidth, video.videoHeight);
    // console.log("Processing:", W, H);

    // Set canvas size to match video
    this.processingCanvas.width = W;
    this.processingCanvas.height = H;

    // Draw current frame to canvas
    this.processingCtx.drawImage(video, 0, 0, this.processingCanvas.width, this.processingCanvas.height);
    const imageData = this.processingCtx.getImageData(0, 0, this.processingCanvas.width, this.processingCanvas.height);

    // Convert to grayscale
    const currentGray = ImageProcessor.rgbToGrayscale(imageData);

    if (this.lastGray !== null) {
      // Compute difference between current and last frame
      const diff = ImageProcessor.absDiff(currentGray, this.lastGray);

      if (this.lastDiff !== null) {
        // Compute delta between current and last difference
        const delta = ImageProcessor.absDiff(diff, this.lastDiff);

        // Apply threshold and count significant changes
        const thresholded = ImageProcessor.threshold(delta, this.threshold);
        const nonZero = ImageProcessor.countNonZero(thresholded);
        const pct = (nonZero * 100.0) / (delta.width * delta.height);

        const potentialDartMovement = pct > this.minMovementPct && pct < this.maxMovementPct;

        if (potentialDartMovement) {
          const timestamp = Date.now();
          this.log(`${timestamp}: potential_dart_movement ${pct.toFixed(1)}%`);

          // Temporal filtering
          detect = false;
          if (this.temporalFilter < 0) {
            detect = true;
          } else {
            if (this.lastDartTime < 0) {
              this.lastDartTime = Date.now();
            } else {
              const elapsed = Date.now() - this.lastDartTime;
              detect = elapsed >= this.temporalFilter;
            }
          }

          if (detect) {
            this.lastDartTime = -1;
            this.detectionCount++;
            if (this.onDetectionCallback) {
              this.onDetectionCallback(delta, pct);
            }
          }
        }

        // Display debug views
        this.displayGrayscale(delta, "deltaCanvas");
      }

      if (this.lastDiff === null || this.lastDartTime < 0) {
        this.lastDiff = diff;
      }

      this.displayGrayscale(diff, "diffCanvas");
    } else {
      this.lastGray = currentGray;
    }

    return detect;
  }

  displayGrayscale(grayImg, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Resize to canvas dimensions
    const resized = ImageProcessor.resizeGrayscale(grayImg, canvas.width, canvas.height);
    const imageData = ImageProcessor.grayscaleToImageData(resized);

    ctx.putImageData(imageData, 0, 0);
  }

  log(message) {
    const logOutput = document.getElementById("logOutput");
    const timestamp = new Date().toLocaleTimeString();
    logOutput.innerHTML += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  updateSettings(temporalFilter, minMovement, maxMovement, threshold) {
    this.temporalFilter = temporalFilter;
    this.minMovementPct = minMovement;
    this.maxMovementPct = maxMovement;
    this.threshold = threshold;
  }
}
