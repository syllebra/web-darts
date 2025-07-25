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
