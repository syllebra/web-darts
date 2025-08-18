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

  static grayscaleToYOLOInput(grayImg, width, height) {
    const data = grayImg.data;
    const c = [];
    for (let index = 0; index < data.length; index++) {
      c.push(data[index] / 255.0);
    }
    const ret = [...c, ...c, ...c];
    return {
      data: ret,
      width: width,
      height: height,
    };
  }

  static normalizeToYOLOinput(imageData) {
    const data = imageData.data;

    const red = [],
      green = [],
      blue = [];
    for (let index = 0; index < data.length; index += 4) {
      red.push(data[index] / 255.0);
      green.push(data[index + 1] / 255.0);
      blue.push(data[index + 2] / 255.0);
    }
    const ret = [...red, ...green, ...blue];
    return {
      data: ret,
      width: imageData.width,
      height: imageData.height,
    };
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

  static imageDataToImage(imageData) {
    var canvas = document.getElementById("toImageCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "toImageCanvas";
    }
    if (!canvas) return null;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
  }

  static computeGrayscaleThresholdBox(grayImg, width, height, threshold = 40) {
    let l = width - 1;
    let r = 0;
    let t = height - 1;
    let b = 0;
    let x = 0;
    let y = 0;
    let foundAny = false;

    for (let index = 0; index < grayImg.length; index++) {
      if (grayImg[index] >= threshold) {
        foundAny = true;
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
      x++;
      if (x >= width) {
        x = 0;
        y++;
      }
    }

    return foundAny ? [l, t, r, b] : [0, 0, width, height];
  }
}
