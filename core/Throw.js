// Throw class
class Throw {
  constructor(alpha, d, zone, targetZone = null) {
    // Normalized angular coordinates
    this.alpha = alpha; // Angle in degrees (0-360)
    this.d = d; // Distance to center normalized by distance to outer double line (0-1+)

    // Zone encoding:
    // T<number> for trebles (e.g., T20)
    // D<number> for doubles (e.g., D20)
    // S<sector><IN or OUT> for simple (e.g., S20IN, S20OUT)
    // "DB" for bull's eye (double bull)
    // "B" for simple bull
    // "OUT" for throws outside the dartboard
    this.zone = zone;

    // Optional target zone (same encoding as zone)
    this.targetZone = targetZone;

    // Metadata
    this.timestamp = Date.now();
    this.id = this.generateId();
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Helper method to parse zone information
  static parseZoneStr(zone) {
    if (zone === "OUT") {
      return { type: "out", sector: null, multiplier: 0 };
    }
    if (zone === "DB") {
      return { type: "bull", sector: 25, multiplier: 2 };
    }
    if (zone === "B" || zone === "SB") {
      return { type: "bull", sector: 25, multiplier: 1 };
    }

    const firstChar = zone.charAt(0);
    if (firstChar === "T") {
      const sector = parseInt(zone.substring(1));
      return { type: "treble", sector: sector, multiplier: 3 };
    }
    if (firstChar === "D") {
      const sector = parseInt(zone.substring(1));
      return { type: "double", sector: sector, multiplier: 2 };
    }
    if (firstChar === "S") {
      const match = zone.match(/^S(\d+)(IN|OUT)$/);
      if (match) {
        const sector = parseInt(match[1]);
        const region = match[2];
        return {
          type: "single",
          sector: sector,
          multiplier: 1,
          region: region,
        };
      }
    }

    // Invalid zone format
    return { type: "invalid", sector: null, multiplier: 0 };
  }

  parseZone() {
    return this.parseZoneStr(this.zone);
  }

  // Helper method to get cartesian coordinates from angular coordinates
  // Assumes dartboard radius of 1 unit for outer double line
  getCartesianCoordinates(scale) {
    const angleRad = (this.alpha * Math.PI) / 180;
    const x = this.d * Math.cos(angleRad) * scale;
    const y = this.d * Math.sin(angleRad) * scale;
    return { x, y };
  }

  // Static method to create a Throw from cartesian coordinates
  static fromCartesian(x, y, scale, zone, targetZone = null) {
    const d = Math.sqrt(x * x + y * y);
    let alpha = (Math.atan2(y, x) * 180) / Math.PI;
    if (alpha < 0) alpha += 360; // Normalize to 0-360

    return new Throw(alpha, d / scale, zone, targetZone);
  }

  // Method to check if throw hit the target zone
  hitTarget() {
    return this.targetZone && this.zone === this.targetZone;
  }

  getStandardZoneScore() {
    const lz = this.zone.toLowerCase();
    if (lz == "db") return 50;
    if (lz == "b" || lz == "sb") return 25;
    if (lz == "out") return 0;
    let mult = 1;
    if (lz.charAt(0) == "d") mult = 2;
    if (lz.charAt(0) == "t") mult = 3;

    const num = parseInt(lz.replace("t", "").replace("d", "").replace("s", ""));
    return num * mult;
  }

  // Method to get a human-readable description of the throw
  getDescription() {
    const zoneInfo = this.parseZone();

    switch (zoneInfo.type) {
      case "out":
        return "Outside dartboard";
      case "bull":
        return zoneInfo.multiplier === 2 ? "Bull's eye" : "Single bull";
      case "treble":
        return `Treble ${zoneInfo.sector}`;
      case "double":
        return `Double ${zoneInfo.sector}`;
      case "single":
        return `Single ${zoneInfo.sector} (${zoneInfo.region})`;
      default:
        return "Invalid throw";
    }
  }
}
