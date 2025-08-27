class DartboardLayer {
  constructor() {
    this.createStyles();
    this.createDomElements();

    this.zoomableCanvas = new ZoomablePannableCanvas(
      "dartboardVideoCanvas",
      "dartboardCanvasContainer",
      "dartboardOverlayCanvas"
    );
    this.zoomableCanvas.isPlaying = true;
    this.zoomableCanvas.startAnimation();
    this.zoomableCanvas.autoZoomVideo(20, true, [-500, -500, 500, 500]);

    this.dartboardRenderer = new DartboardRenderer(document.getElementById("dartboardVideoCanvas"));

    this.initInteractivity();

    this.zoomCanvas = document.getElementById("dartboardZoomCanvas");
    this.zoomCtx = this.zoomCanvas.getContext("2d");

    this.updateZoom(0, 0);
  }

  createStyles() {}

  createDomElements() {}

  initInteractivity() {
    const dartboardRenderer = this.dartboardRenderer;
    const zoomableCanvas = this.zoomableCanvas;
    const updateZoomView = this.updateZoom.bind(this);
    const nbThrows = 3;

    this.zoomableCanvas.addOverlayElement(
      `Dartboard`,
      { dbr: dartboardRenderer, x: 0, y: 0, color: "#FF0000" },
      // Draw callback
      (ctx, element, isSelected) => {
        element.dbr.drawBoard(ctx);
        element.dbr.updateParticles();
      },
      // Hit test callback (optional - defaults to circular)
      (element, worldX, worldY) => {
        const dx = worldX; // - element.x;
        const dy = worldY; //- element.y;
        const ret = Math.sqrt(dx * dx + dy * dy) <= element.dbr.radius;
        if (ret) {
          updateZoomView(dx, dy);
        }
        return ret;
      }
    );

    for (let i = 0; i < nbThrows; i++) {
      // Add interactive elements
      this.zoomableCanvas.addOverlayElement(
        `throw${i}`,
        {
          num: i,
          x: 100 + i * 20,
          y: -150,
          pt_radius: 2,
          circle_radius: 25,
          color: "#00FFFF",
          opacity: 0.0,
          hit: null,
          animation: null,
          setThrow(thr) {
            this.hit = thr;
            const pt = this.hit.getCartesianCoordinates(
              dartboardRenderer.ringRadii.doubleOuter * dartboardRenderer.radius
            );
            this.x = pt.x;
            this.y = pt.y;
            if (this.animation) {
              this.animation.pause();
            }
            this.circle_radius = 50;
            this.opacity = 0;
            this.animation = gsap.to(this, {
              circle_radius: 25,
              duration: 2,
              opacity: 0.4,
              ease: "elastic.out",
            });
          },
        },
        // Draw callback
        (ctx, element, isSelected) => {
          if (!element.hit) return;
          ctx.shadowBlur = 20 / zoomableCanvas.scale;
          ctx.shadowColor = `rgba(0,0,0,1)`;

          ctx.fillStyle = `rgba(0,0,0,${element.opacity * 0.75})`;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.circle_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
          ctx.fill();

          const gap = (5 * element.circle_radius) / (25 * zoomableCanvas.scale);
          ctx.fillStyle = isSelected ? `rgba(255,255,0,1.0)` : `rgba(0,255,255,1.0)`;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.pt_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1.5 / zoomableCanvas.scale;
          ctx.beginPath();
          ctx.moveTo(element.x - gap, element.y);
          ctx.lineTo(element.x - gap * 3, element.y);
          ctx.moveTo(element.x + gap, element.y);
          ctx.lineTo(element.x + gap * 3, element.y);
          ctx.moveTo(element.x, element.y - gap);
          ctx.lineTo(element.x, element.y - gap * 3);
          ctx.moveTo(element.x, element.y + gap);
          ctx.lineTo(element.x, element.y + gap * 3);
          ctx.stroke();

          ctx.strokeStyle = isSelected ? `rgba(255,255,0,${element.opacity})` : `rgba(0,255,255,${element.opacity})`;
          ctx.lineWidth = 2 / zoomableCanvas.scale;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.circle_radius / zoomableCanvas.scale, 0, 2 * Math.PI);
          ctx.stroke();
        },
        // Hit test callback (optional - defaults to circular)
        (element, worldX, worldY) => {
          if (!element.hit) return false;
          const dx = worldX - element.x;
          const dy = worldY - element.y;
          return Math.sqrt(dx * dx + dy * dy) <= element.circle_radius / zoomableCanvas.scale;
        }
      );
    }

    // Set up event callbacks
    this.zoomableCanvas.setOnElementSelected((id, element) => {
      console.debug(`Selected element: ${id}`, element);
      if (id != "Dartboard") updateZoomView(element.x, element.y);
    });

    this.zoomableCanvas.setOnElementDrag((id, element, worldCoords) => {
      console.debug(`Dragging ${id} to:`, element.x, element.y);

      if (id == "Dartboard") {
        element.dbr.handleMouseMove(worldCoords.x, worldCoords.y);
        updateZoomView(worldCoords.x, worldCoords.y);
      } else updateZoomView(element.x, element.y);
    });

    let nextHit = 0;
    this.zoomableCanvas.setOnElementDragEnd((id, element, worldCoords) => {
      if (id == "Dartboard") {
        let thr = element.dbr.getThrowFromClick(worldCoords.x, worldCoords.y);
        zoomableCanvas.getOverlayElement(`throw${nextHit}`).setThrow(thr);
        nextHit = (nextHit + 1) % nbThrows;
        updateZoomView(worldCoords.x, worldCoords.y);
      } else updateZoomView(element.x, element.y);
    });
  }

  updateZoom(xx, yy, scale = 3) {
    this.dartboardRenderer.handleMouseMove(xx, yy);
    const zoom = Math.max(scale, scale * this.zoomableCanvas.scale);
    var rect = this.zoomCanvas.getBoundingClientRect();
    this.zoomCanvas.width = rect.width;
    this.zoomCanvas.height = rect.height;
    this.zoomCtx.clearRect(0, 0, rect.width, rect.height);
    this.zoomCtx.save();
    this.zoomCtx.translate(rect.width * 0.5, rect.height * 0.5);
    this.zoomCtx.scale(zoom, zoom);
    this.zoomCtx.translate(-xx, -yy);

    this.dartboardRenderer.drawBoard(this.zoomCtx, false);

    this.zoomCtx.restore();

    let x = this.zoomCanvas.width * 0.5;
    let y = this.zoomCanvas.height * 0.5;

    this.zoomCtx.shadowColor = `rgba(0,0,0,1.0)`;
    this.zoomCtx.shadowBlur = 6;
    this.zoomCtx.fillStyle = "rgba(255, 200, 60, 0.8)";
    this.zoomCtx.lineWidth = 2;
    this.zoomCtx.beginPath();
    this.zoomCtx.arc(x, y, 2, 0, Math.PI * 2.0);
    this.zoomCtx.fill();

    this.zoomCtx.strokeStyle = this.zoomCtx.fillStyle;
    this.zoomCtx.beginPath();
    const dec = 5;
    this.zoomCtx.moveTo(x, y - dec);
    this.zoomCtx.lineTo(x, y - dec * 3);
    this.zoomCtx.moveTo(x, y + dec);
    this.zoomCtx.lineTo(x, y + dec * 3);
    this.zoomCtx.moveTo(x - dec, y);
    this.zoomCtx.lineTo(x - dec * 3, y);
    this.zoomCtx.moveTo(x + dec, y);
    this.zoomCtx.lineTo(x + dec * 3, y);
    this.zoomCtx.stroke();

    const score = this.dartboardRenderer.getScoreInfo(xx, yy);
    document.getElementById("dartboardZoneDisplay").innerText = score.short;
  }
}
