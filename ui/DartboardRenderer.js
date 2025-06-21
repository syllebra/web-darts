class DartboardRenderer {
  constructor(canvas) {
    // Color constants
    this.COLORS = {
      LIGHT: "#fff6d5",
      DARK: "#000",
      GREEN: "#008000",
      RED: "#ff0000",
      WHITE: "#ffffff",
    };

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.canvas.classList.add("dartboard");

    // Make canvas responsive
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.radius = Math.min(canvas.width, canvas.height) / 2 - 10; // Add padding

    // Create message element
    this.message = document.createElement("div");
    this.message.className = "dartboard-message";
    document.body.appendChild(this.message);

    // Animation variables
    this.particles = [];
    this.hoverInfo = null;
    this.numberOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    this.sectorCount = 20;
    this.sectorAngle = (2 * Math.PI) / this.sectorCount;
    this.angleOffset = -Math.PI / 2 - this.sectorAngle / 2;

    this.ringRadii = {
      bull: 0.024,
      outerBull: 0.06,
      innerSingle: 0.4,
      tripleInner: 0.4,
      tripleOuter: 0.44,
      outerSingle: 0.72,
      doubleInner: 0.72,
      doubleOuter: 0.76,
      board: 0.76,
    };

    // Setup event listeners
    canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    canvas.addEventListener("mouseleave", () => this.handleMouseLeave());

    // Start animation loop
    this.animate();
  }

  resizeCanvas() {
    // Get the container size
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Calculate optimal size based on viewport and container
    const maxSize = Math.min(
      window.innerWidth * 0.8,
      window.innerHeight * 0.8,
      containerRect.width,
      containerRect.height
    );

    // Set canvas size
    this.canvas.width = maxSize;
    this.canvas.height = maxSize;

    // Update center and radius
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 10;
  }

  animate() {
    this.updateParticles();
    this.drawBoard();
    requestAnimationFrame(() => this.animate());
  }

  drawBoard() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const center = this.canvas.width / 2;
    const radius = center;

    // Draw sectors
    for (let i = 0; i < this.sectorCount; i++) {
      this.drawSector(i, center, radius);
    }

    // Draw bulls
    this.drawBull(center, radius, "outerBull");
    this.drawBull(center, radius, "bull");

    // Draw particles
    this.drawParticles();
  }

  drawSector(i, center, radius) {
    const startAngle = this.angleOffset + i * this.sectorAngle;
    const endAngle = startAngle + this.sectorAngle;
    const color = i % 2 === 0 ? this.COLORS.LIGHT : this.COLORS.DARK;

    // Draw inner single area
    this.drawRing(
      center,
      radius,
      startAngle,
      endAngle,
      this.ringRadii.outerBull,
      this.ringRadii.innerSingle,
      color,
      i,
      "innerSingle"
    );

    // Draw outer single area
    this.drawRing(
      center,
      radius,
      startAngle,
      endAngle,
      this.ringRadii.tripleOuter,
      this.ringRadii.doubleInner,
      color,
      i,
      "outerSingle"
    );

    // Draw triple ring
    this.drawRing(
      center,
      radius,
      startAngle,
      endAngle,
      this.ringRadii.tripleInner,
      this.ringRadii.tripleOuter,
      i % 2 === 0 ? this.COLORS.RED : this.COLORS.GREEN,
      i,
      "triple"
    );

    // Draw double ring
    this.drawRing(
      center,
      radius,
      startAngle,
      endAngle,
      this.ringRadii.doubleInner,
      this.ringRadii.doubleOuter,
      i % 2 === 0 ? this.COLORS.RED : this.COLORS.GREEN,
      i,
      "double"
    );

    // Draw number labels
    this.drawNumber(i, center, radius, startAngle);
  }

  drawRing(center, radius, startAngle, endAngle, inner, outer, color, index, ringType) {
    this.ctx.beginPath();
    this.ctx.arc(center, center, outer * radius, startAngle, endAngle);
    this.ctx.arc(center, center, inner * radius, endAngle, startAngle, true);
    this.ctx.closePath();

    if (this.hoverInfo && this.hoverInfo.index === index && this.hoverInfo.ring === ringType) {
      this.ctx.shadowBlur =
        ringType === "bull"
          ? 30
          : ringType === "outerBull"
          ? 25
          : ringType === "triple" || ringType === "double"
          ? 20
          : 15;
      this.ctx.shadowColor = "rgba(255,255,0,0.7)";
      this.ctx.fillStyle = "rgba(255,255,0,0.6)";
    } else {
      this.ctx.shadowBlur =
        ringType === "bull"
          ? 15
          : ringType === "outerBull"
          ? 10
          : ringType === "triple" || ringType === "double"
          ? 5
          : 0;
      this.ctx.shadowColor =
        color === this.COLORS.RED
          ? "rgba(255,0,0,0.5)"
          : color === this.COLORS.GREEN
          ? "rgba(0,255,0,0.5)"
          : "transparent";
      this.ctx.fillStyle = color;
    }
    this.ctx.fill();
  }

  drawBull(center, radius, type) {
    this.ctx.beginPath();
    this.ctx.arc(center, center, this.ringRadii[type] * radius, 0, 2 * Math.PI);

    if (this.hoverInfo && this.hoverInfo.ring === type) {
      this.ctx.shadowBlur = type === "bull" ? 30 : 25;
      this.ctx.shadowColor = "rgba(255,255,0,0.7)";
      this.ctx.fillStyle = "rgba(255,255,0,0.6)";
    } else {
      this.ctx.shadowBlur = type === "bull" ? 15 : 10;
      this.ctx.shadowColor = type === "bull" ? "rgba(255,0,0,0.5)" : "rgba(0,255,0,0.5)";
      this.ctx.fillStyle = type === "bull" ? "#ff0000" : "#008000";
    }
    this.ctx.fill();
  }

  drawNumber(i, center, radius, startAngle) {
    const angle = startAngle + this.sectorAngle / 2;
    let d = (this.ringRadii.doubleOuter + 0.1) * radius;
    if (i >= 6 && i <= 14) d = (this.ringRadii.doubleOuter + 0.13) * radius;

    const x = center + Math.cos(angle) * d;
    const y = center + Math.sin(angle) * d;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle + Math.PI / 2);
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "white";
    const sz = this.canvas.width * 0.07;
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

  getScoreInfo(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) / this.radius;
    let angle = Math.atan2(dy, dx);
    angle = (angle + 2 * Math.PI - this.angleOffset) % (2 * Math.PI);
    const index = Math.floor(angle / this.sectorAngle);
    const baseScore = this.numberOrder[index];

    if (dist <= this.ringRadii.bull) return { score: 50, index, label: "Inner Bull", ring: "bull" };
    if (dist <= this.ringRadii.outerBull) return { score: 25, index, label: "Outer Bull", ring: "outerBull" };
    if (dist >= this.ringRadii.tripleInner && dist <= this.ringRadii.tripleOuter)
      return { score: baseScore * 3, index, label: "Treble " + baseScore, ring: "triple" };
    if (dist >= this.ringRadii.doubleInner && dist <= this.ringRadii.doubleOuter)
      return { score: baseScore * 2, index, label: "Double " + baseScore, ring: "double" };
    if (dist > this.ringRadii.outerBull && dist < this.ringRadii.tripleInner)
      return { score: baseScore, index, label: baseScore.toString(), ring: "innerSingle" };
    if (dist > this.ringRadii.tripleOuter && dist < this.ringRadii.doubleInner)
      return { score: baseScore, index, label: baseScore.toString(), ring: "outerSingle" };
    return { score: 0, index: null, label: "Miss", ring: null };
  }

  getThrowFromClick(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = x - rect.left - this.centerX;
    const clickY = y - rect.top - this.centerY;
    const info = this.getScoreInfo(x - rect.left, y - rect.top);

    // Add particles for visual feedback
    const color =
      info.ring === "bull"
        ? "#ff0000"
        : info.ring === "outerBull"
        ? "#00ff00"
        : info.ring === "triple" || info.ring === "double"
        ? "#ffff00"
        : "#ffffff";
    this.createParticles(x - rect.left, y - rect.top, color);

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

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
