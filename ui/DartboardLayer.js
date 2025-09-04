class DartboardLayer {
  constructor(container = document.body) {
    this.injectCSS();
    this.createDomElements(container);

    this.zoomableCanvas = new ZoomablePannableCanvas(
      "dartboardVideoCanvas",
      "dartboardCanvasContainer",
      "dartboardOverlayCanvas"
    );
    this.zoomableCanvas.isPlaying = true;
    this.zoomableCanvas.startAnimation();
    this.zoomableCanvas.autoZoomVideo(20, false, [-500, -500, 500, 500]);

    this.dartboardRenderer = new DartboardRenderer(document.getElementById("dartboardVideoCanvas"));

    this.initInteractivity();

    this.initZonesLights();

    this.zoomCanvas = document.getElementById("dartboardZoomCanvas");
    this.zoomCtx = this.zoomCanvas.getContext("2d");

    this.updateZoom(0, 0);
  }

  injectCSS() {
    const css = `
          #dartboardCanvasContainer {
              position: absolute;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
              background-color: #00000088
          }


          #dartboardVideoCanvas,
          #dartboardOverlayCanvas {
              position: absolute;
              cursor: grab;
          }

          #videoCanvas:active,
          #dartboardOverlayCanvas:active {
              cursor: grabbing;
          }

          #dartboardOverlayCanvas {
              pointer-events: none;
          }

          #dartboardZoomContainer {
              position: absolute;
              top: 10px;
              left: 10px;
              width: 15vh;
              height: auto;
              box-shadow: 0 0 30px rgba(255, 255, 255, 0.8),
                  0 15px 35px rgba(0, 0, 0, 0.1);
              margin: 0px;
              padding: 0;
              border-radius: 8px;
              /* Add this to round the container */
              overflow: hidden;
              /* Add this to ensure clean edges */
          }

          #dartboardZoomCanvas {
              width: 100%;
              height: 15vh;
              display: block;
              /* Add this - removes default inline spacing */
              margin: 0;
              /* Add this */
              padding: 0;
              /* Add this */
          }

          #dartboardZoneDisplay {
              background: rgba(0, 0, 0, 0.8);
              padding: 8px 12px;
              border-radius: 0 0 8px 8px;
              font-family: 'Arial', sans-serif;
              font-weight: bold;
              font-size: 14px;
              color: #ffffff;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
              backdrop-filter: blur(5px);
              text-align: center;
              width: 100%;
              margin: 0;
              /* Add this */
              box-sizing: border-box;
              /* Add this to include padding in width calculation */
          }
        `;

    // Check if styles already exist
    if (!document.getElementById("dartboard-layer-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "dartboard-layer-styles";
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  }

  createDomElements(container) {
    container.innerHTML =
      `
    <div id="dartboardCanvasContainer">
      <canvas id="dartboardVideoCanvas"></canvas>
      <canvas id="dartboardOverlayCanvas"></canvas>
      <div id="dartboardZoomContainer">
        <canvas id="dartboardZoomCanvas"></canvas>
        <div id="dartboardZoneDisplay" class="badge">
          ZONE
        </div>
      </div>
    </div>
    ` + container.innerHTML;
  }

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
    this.zoomableCanvas.addOnElementSelected((id, element) => {
      console.debug(`Selected element: ${id}`, element);
      if (id != "Dartboard") updateZoomView(element.x, element.y);
    });

    this.zoomableCanvas.addOnElementDrag((id, element, worldCoords) => {
      console.debug(`Dragging ${id} to:`, element.x, element.y);

      if (id == "Dartboard") {
        element.dbr.handleMouseMove(worldCoords.x, worldCoords.y);
        updateZoomView(worldCoords.x, worldCoords.y);
      } else updateZoomView(element.x, element.y);
    });

    let nextHit = 0;
    this.zoomableCanvas.addOnElementDragEnd((id, element, worldCoords) => {
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

  /// LIGHTS

  initZonesLights() {
    let zones = ["DB", "B"];
    for (let i = 1; i <= 20; i++) {
      zones.push(`S${i}IN`, `D${i}`, `S${i}OUT`, `T${i}`);
    }

    this.lights = {};

    zones.forEach((z) => {
      const v = { zone: z, opacity: 0.0, r: 0, g: 255, b: 255 };
      this.lights[z] = v;
      this.dartboardRenderer.extraRenderingFunctions.push(() => {
        if (v.opacity > 0.0)
          this.dartboardRenderer.enlightZone(
            v.zone,
            false,
            `rgba(${v.r},${v.g},${v.b},${v.opacity * 0.95})`,
            `rgba(${v.r},${v.g},${v.b},${v.opacity})`,
            1.5
          );
      });
    });
  }

  flickZone(zone) {
    if (this.lights[zone])
      gsap
        .to(this.lights[zone], {
          opacity: 1.0,
          repeat: 11,
          yoyo: true,
          duration: 0.08,
          ease: "power2.inout",
        })
        .then(() => {
          this.lights[zone].opacity = 0;
        });
  }
}
