// Color utility functions to compute light and dark variants
class ColorUtils {
  // Convert hex to HSL
  static hexToHsl(hex) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  }

  static hslToRGB(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }

  // Convert HSL to hex
  static hslToHex(h, s, l) {
    const col = this.hslToRGB(h, s, l);
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(col.r)}${toHex(col.g)}${toHex(col.b)}`;
  }

  static hslToRGBstr(h, s, l) {
    const col = this.hslToRGB(h, s, l);
    return `${Math.floor(col.r * 255)}, ${Math.floor(col.g * 255)}, ${Math.floor(col.b * 255)}`;
  }

  // Generate light variant (increase lightness)
  static getLightVariant(hexColor, lightnessIncrease = 20, hexFormat = true) {
    const [h, s, l] = this.hexToHsl(hexColor);
    const newL = Math.min(100, l + lightnessIncrease);
    return hexFormat ? this.hslToHex(h, s, newL) : this.hslToRGBstr(h, s, newL);
  }

  // Generate dark variant (decrease lightness)
  static getDarkVariant(hexColor, lightnessDecrease = 20, hexFormat = true) {
    const [h, s, l] = this.hexToHsl(hexColor);
    const newL = Math.max(0, l - lightnessDecrease);
    return hexFormat ? this.hslToHex(h, s, newL) : this.hslToRGBstr(h, s, newL);
  }

  // Generate color palette from a base color
  static generateColorPalette(baseColorHex) {
    var col = baseColorHex;
    if ((typeof col === "string" || col instanceof String) && col.includes("#")) {
      const [h, s, l] = this.hexToHsl(col);
      col = this.hslToRGBstr(h, s, l);
    }
    return {
      main: col,
      light: this.getLightVariant(baseColorHex, 25, false),
      dark: this.getDarkVariant(baseColorHex, 25, false),
    };
  }

  // Alternative method using saturation adjustments
  static generateEnhancedPalette(baseColorHex) {
    var col = baseColorHex;
    if ((typeof col === "string" || col instanceof String) && col.includes("#")) {
      const [h, s, l] = this.hexToHsl(col);
      col = this.hslToRGBstr(h, s, l);
    }
    return {
      main: col,
      light: this.hslToRGBstr(h, Math.max(0, s - 15), Math.min(100, l + 25)),
      dark: this.hslToRGBstr(h, Math.min(100, s + 10), Math.max(0, l - 30)),
    };
  }
}
