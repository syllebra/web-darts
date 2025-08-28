class DartboardRenderer {
  constructor() {
    // Color constants
    this.COLORS = {
      LIGHT: "#fff6d5",
      DARK: "#000",
      GREEN: "#008000",
      RED: "#ff0000",
      WHITE: "#ffffff",
    };

    this.centerX = 0;
    this.centerY = 0;
    this.radius = 500; // Add padding

    // Create message element
    this.message = document.createElement("div");
    this.message.className = "dartboard-message";
    document.body.appendChild(this.message);

    // Animation variables
    this.particles = [];
    this.hoverInfo = null;
    this.numberOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    this.numberOrderInv = this.numberOrder.reduce((inv, val, i) => ((inv[val] = i), inv), []);
    this.sectorCount = 20;
    this.sectorAngle = (2 * Math.PI) / this.sectorCount;
    this.angleOffset = -Math.PI / 2 - this.sectorAngle / 2;

    const ratio = 1 / 0.2255;
    this.ringRadii = {
      bull: 0.00635 * ratio,
      outerBull: 0.0159 * ratio,
      innerSingle: 0.0974 * ratio,
      tripleInner: 0.0974 * ratio,
      tripleOuter: 0.1074 * ratio,
      outerSingle: 0.15 * ratio,
      doubleInner: 0.16 * ratio,
      doubleOuter: 0.17 * ratio,
      board: 0.2255 * ratio,
    };

    //"r_board": 0.2255, "r_double": 0.17, "r_treble": 0.1074, "r_outer_bull": 0.0159, "r_inner_bull": 0.00635, "w_double_treble": 0.01

    // Bigger radii for tactile (TODO: detect tactile)
    // this.ringRadii = {
    //     bull: 0.1,
    //     outerBull: 0.2,
    //     innerSingle: 0.4,
    //     tripleInner: 0.4,
    //     tripleOuter: 0.5,
    //     outerSingle: 0.65,
    //     doubleInner: 0.65,
    //     doubleOuter: 0.76,
    //     board: 0.76,
    // };

    // Wire configuration parameters
    this.wireConfig = {
      enabled: true,
      width: 1.2, // Base wire width in pixels
      color: "#C0C0C0", // Silver/metallic color
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffset: 1,
      opacity: 0.9,

      // Wire specific settings
      radial: {
        enabled: true,
        width: 1.2,
        segments: 20, // Number of radial wires (sector dividers)
      },

      circular: {
        enabled: true,
        width: 0.8,
        rings: ["outerBull", "tripleInner", "tripleOuter", "doubleInner", "doubleOuter"],
      },

      // Advanced rendering options
      antiAlias: true,
      metallic: {
        enabled: true,
        highlightColor: "#F8F8F8",
        highlightWidth: 0.3, // Fraction of wire width for highlight
      },
    };
  }

  drawBoard(ctx, renderHover = true) {
    this.ctx = ctx;
    const center = 0;

    // Draw board background
    this.ctx.shadowBlur = 120;
    this.ctx.shadowColor = "rgba(0,0,0,0.7)";
    this.ctx.fillStyle = this.COLORS.DARK;
    this.ctx.beginPath();
    this.ctx.arc(center, center, this.radius, 0, Math.PI * 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw sectors
    for (let i = 0; i < this.sectorCount; i++) {
      this.drawSector(i, center, this.radius);
    }

    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "rgba(0,255,0,0.5)";
    this.ctx.fillStyle = "#008000";
    this.drawBull(center, this.radius, "outerBull");
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "rgba(255,0,0,0.5)";
    this.ctx.fillStyle = "#ff0000";
    this.drawBull(center, this.radius, "bull");

    // Draw wires on top of everything else
    this.drawWires(ctx, center, this.radius);

    // Draw particles
    this.drawParticles();
    if (renderHover && this.hoverInfo) this.enlightZone(this.hoverInfo.short); //, "rgba(0,255,255,0.8)", "rgba(0,255,255,1.0)");
  }

  drawSector(i, center, radius) {
    const startAngle = this.angleOffset + i * this.sectorAngle;
    const endAngle = startAngle + this.sectorAngle;
    const color = i % 2 === 0 ? this.COLORS.LIGHT : this.COLORS.DARK;

    // Draw inner single area
    if (i % 2 === 0) {
      // Dark is already underlying color of the board
      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = "transparent";
      this.drawRing(center, radius, startAngle, endAngle, this.ringRadii.outerBull, this.ringRadii.innerSingle);

      // Draw outer single area
      this.drawRing(center, radius, startAngle, endAngle, this.ringRadii.tripleOuter, this.ringRadii.doubleInner);
    }
    this.ctx.fillStyle = i % 2 === 0 ? this.COLORS.RED : this.COLORS.GREEN;
    this.ctx.shadowBlur = 50;
    this.ctx.shadowColor = i % 2 === 0 ? "rgba(255,0,0,0.5)" : "rgba(0,255,0,0.5)";
    // Draw triple ring
    this.drawRing(center, radius, startAngle, endAngle, this.ringRadii.tripleInner, this.ringRadii.tripleOuter);

    // Draw double ring
    this.drawRing(center, radius, startAngle, endAngle, this.ringRadii.doubleInner, this.ringRadii.doubleOuter);

    // Draw number labels
    this.drawNumber(i, center, radius, startAngle);
  }

  drawRing(center, radius, startAngle, endAngle, inner, outer) {
    this.ctx.beginPath();
    this.ctx.arc(center, center, outer * radius, startAngle, endAngle);
    this.ctx.arc(center, center, inner * radius, endAngle, startAngle, true);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawBull(center, radius, type) {
    this.ctx.beginPath();
    this.ctx.arc(center, center, this.ringRadii[type] * radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  enlightZone(zoneStr, fillColor = "rgba(255,255,0,0.6)", glowColor = "rgba(255,255,0,0.7)", glowRadiusMult = 3.0) {
    const zoneInfos = Throw.parseZoneStr(zoneStr);

    const sector = this.numberOrderInv[zoneInfos.sector];
    console.log(zoneInfos);

    let startAngle = this.angleOffset + sector * this.sectorAngle;
    let endAngle = startAngle + this.sectorAngle;

    let startD = this.ringRadii.outerBull;
    let endD = this.ringRadii.innerSingle;

    switch (zoneInfos.type) {
      case "bull":
        startD = zoneInfos.multiplier == 2 ? 0 : this.ringRadii.bull;
        endD = zoneInfos.multiplier == 2 ? this.ringRadii.bull : this.ringRadii.outerBull;
        startAngle = 0;
        endAngle = Math.PI * 2;
        break;
      case "treble":
        startD = this.ringRadii.tripleInner;
        endD = this.ringRadii.tripleOuter;
        break;
      case "double":
        startD = this.ringRadii.doubleInner;
        endD = this.ringRadii.doubleOuter;
        break;
      case "single":
        startD = zoneInfos.region.toLowerCase() == "out" ? this.ringRadii.tripleOuter : this.ringRadii.outerBull;
        endD = zoneInfos.region.toLowerCase() == "out" ? this.ringRadii.doubleInner : this.ringRadii.tripleInner;
        break;
    }

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
    this.ctx.fillStyle = "black";
    this.drawRing(0, this.radius, startAngle, endAngle, startD, endD);
    if (zoneInfos.type === "bull") this.ctx.shadowBlur = (zoneInfos.multiplier == 2 ? 25 : 30) * glowRadiusMult;
    else this.ctx.shadowBlur = (zoneInfos.type === "treble" || zoneInfos.type === "double" ? 20 : 15) * glowRadiusMult;
    this.ctx.shadowColor = glowColor;
    this.ctx.fillStyle = fillColor;
    this.drawRing(0, this.radius, startAngle, endAngle, startD, endD);
  }

  drawNumber(i, center, radius, startAngle) {
    const angle = startAngle + this.sectorAngle / 2;
    let d = (this.ringRadii.doubleOuter + 0.11) * radius;
    if (i >= 6 && i <= 14) d = (this.ringRadii.doubleOuter + 0.13) * radius;

    const x = center + Math.cos(angle) * d;
    const y = center + Math.sin(angle) * d;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle + Math.PI / 2);
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "white";
    const sz = this.radius * 2 * 0.05;
    this.ctx.font = `bold ${sz}px "Shadows Into Light Two", cursive`;

    if (i >= 6 && i <= 14) {
      this.ctx.save();
      this.ctx.rotate(Math.PI);
      this.ctx.fillText(this.numberOrder[i], 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.fillText(this.numberOrder[i], 0, 0);
    }
    this.ctx.restore();
  }

  // Add this method to draw all wires
  drawWires(ctx, center, radius) {
    if (!this.wireConfig.enabled) return;

    ctx.save();

    // Set up wire rendering context
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (this.wireConfig.antiAlias) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    // Draw circular wires first (behind radial wires)
    if (this.wireConfig.circular.enabled) {
      this.drawCircularWires(ctx, center, radius);
    }

    // Draw radial wires
    if (this.wireConfig.radial.enabled) {
      this.drawRadialWires(ctx, center, radius);
    }

    ctx.restore();
  }

  // Draw the circular ring wires
  drawCircularWires(ctx, center, radius) {
    const rings = this.wireConfig.circular.rings;

    rings.forEach((ringName) => {
      if (this.ringRadii[ringName]) {
        this.drawCircularWire(ctx, center, radius, this.ringRadii[ringName]);
      }
    });
  }

  // Draw a single circular wire
  drawCircularWire(ctx, center, radius, ringRadius) {
    const actualRadius = ringRadius * radius;
    const wireWidth = this.wireConfig.circular.width;

    // Draw wire shadow
    ctx.save();
    ctx.shadowColor = this.wireConfig.shadowColor;
    ctx.shadowBlur = this.wireConfig.shadowBlur;
    ctx.shadowOffsetX = this.wireConfig.shadowOffset;
    ctx.shadowOffsetY = this.wireConfig.shadowOffset;

    ctx.globalAlpha = this.wireConfig.opacity;
    ctx.strokeStyle = this.wireConfig.color;
    ctx.lineWidth = wireWidth;

    ctx.beginPath();
    ctx.arc(center, center, actualRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw metallic highlight if enabled
    if (this.wireConfig.metallic.enabled) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = this.wireConfig.metallic.highlightColor;
      ctx.lineWidth = wireWidth * this.wireConfig.metallic.highlightWidth;

      ctx.beginPath();
      ctx.arc(center, center, actualRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw the radial sector divider wires
  drawRadialWires(ctx, center, radius) {
    const wireWidth = this.wireConfig.radial.width;
    const segments = this.wireConfig.radial.segments;

    for (let i = 0; i < segments; i++) {
      const angle = this.angleOffset + i * this.sectorAngle;
      this.drawRadialWire(ctx, center, radius, angle, wireWidth);
    }
  }

  // Draw a single radial wire
  drawRadialWire(ctx, center, radius, angle, wireWidth) {
    const startRadius = this.ringRadii.outerBull * radius;
    const endRadius = this.ringRadii.doubleOuter * radius;

    const startX = center + Math.cos(angle) * startRadius;
    const startY = center + Math.sin(angle) * startRadius;
    const endX = center + Math.cos(angle) * endRadius;
    const endY = center + Math.sin(angle) * endRadius;

    // Draw wire shadow
    ctx.save();
    ctx.shadowColor = this.wireConfig.shadowColor;
    ctx.shadowBlur = this.wireConfig.shadowBlur;
    ctx.shadowOffsetX = this.wireConfig.shadowOffset * Math.cos(angle + Math.PI / 4);
    ctx.shadowOffsetY = this.wireConfig.shadowOffset * Math.sin(angle + Math.PI / 4);

    ctx.globalAlpha = this.wireConfig.opacity;
    ctx.strokeStyle = this.wireConfig.color;
    ctx.lineWidth = wireWidth;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw metallic highlight if enabled
    if (this.wireConfig.metallic.enabled) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = this.wireConfig.metallic.highlightColor;
      ctx.lineWidth = wireWidth * this.wireConfig.metallic.highlightWidth;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  getScoreInfo(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) / this.radius;
    let angle = Math.atan2(dy, dx);
    angle = (angle + 2 * Math.PI - this.angleOffset) % (2 * Math.PI);
    const index = Math.floor(angle / this.sectorAngle);
    const baseScore = this.numberOrder[index];

    if (dist <= this.ringRadii.bull) return { score: 50, index, label: "Inner Bull", ring: "bull", short: "DB" };
    if (dist <= this.ringRadii.outerBull)
      return { score: 25, index, label: "Outer Bull", ring: "outerBull", short: "SB" };
    if (dist >= this.ringRadii.tripleInner && dist <= this.ringRadii.tripleOuter)
      return { score: baseScore * 3, index, label: "Treble " + baseScore, ring: "triple", short: "T" + baseScore };
    if (dist >= this.ringRadii.doubleInner && dist <= this.ringRadii.doubleOuter)
      return { score: baseScore * 2, index, label: "Double " + baseScore, ring: "double", short: "D" + baseScore };
    if (dist > this.ringRadii.outerBull && dist < this.ringRadii.tripleInner)
      return {
        score: baseScore,
        index,
        label: baseScore.toString(),
        ring: "innerSingle",
        short: "S" + baseScore + "IN",
      };
    if (dist > this.ringRadii.tripleOuter && dist < this.ringRadii.doubleInner)
      return {
        score: baseScore,
        index,
        label: baseScore.toString(),
        ring: "outerSingle",
        short: "S" + baseScore + "OUT",
      };
    return { score: 0, index: null, label: "Miss", ring: null, short: "OUT" };
  }

  getThrowFromClick(x, y) {
    const clickX = x;
    const clickY = y;
    const info = this.getScoreInfo(x, y);

    // Add particles for visual feedback
    const color =
      info.ring === "bull"
        ? "#ff0000"
        : info.ring === "outerBull"
        ? "#00ff00"
        : info.ring === "triple" || info.ring === "double"
        ? "#ffff00"
        : "#ffffff";
    this.createParticles(x, y, color);

    // Convert cartesian coordinates to normalized angular coordinates
    const d = Math.sqrt(clickX * clickX + clickY * clickY) / (this.radius * this.ringRadii.doubleOuter);
    let alpha = (Math.atan2(clickY, clickX) * 180) / Math.PI;
    if (alpha < 0) alpha += 360; // Normalize to 0-360

    // Generate zone string based on the hit information
    let zone;
    if (info.score === 0) {
      zone = "OUT";
    } else if (info.score === 50) {
      zone = "DB"; // Bull's eye
    } else if (info.score === 25) {
      zone = "B"; // Simple bull
    } else if (info.ring === "triple") {
      zone = `T${this.numberOrder[info.index]}`;
    } else if (info.ring === "double") {
      zone = `D${this.numberOrder[info.index]}`;
    } else {
      // Single areas (inner or outer)
      const region = info.ring === "innerSingle" ? "IN" : "OUT";
      zone = `S${this.numberOrder[info.index]}${region}`;
    }

    return new Throw(alpha, d, zone);
  }

  handleMouseMove(x, y) {
    this.hoverInfo = this.getScoreInfo(x, y);
  }

  handleMouseLeave() {
    this.hoverInfo = null;
  }

  createParticles(x, y, color) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        size: Math.random() * 3 + 1,
        color: color || `hsl(${Math.random() * 60 + 10}, 100%, 50%)`,
        speed: Math.random() * 2 + 1,
        angle: Math.random() * Math.PI * 2,
        life: 30 + Math.random() * 20,
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particles.forEach((p) => {
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      p.life--;
      p.size *= 0.97;
    });
  }

  drawParticles() {
    this.particles.forEach((p) => {
      this.ctx.globalAlpha = p.life / 50;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }
}
