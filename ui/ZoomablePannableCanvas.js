class ZoomablePannableCanvas {
  constructor(canvasId, containerId, overlayCanvasId = null) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    this.ctx = this.canvas.getContext("2d");

    // Overlay canvas setup
    this.overlayCanvas = overlayCanvasId ? document.getElementById(overlayCanvasId) : null;
    this.overlayCtx = this.overlayCanvas ? this.overlayCanvas.getContext("2d") : null;

    // Transform properties
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.isDragging = false;

    // Drawable elements
    this.elements = new Map(); // Map of element ID to element data
    this.elementDrawCallbacks = new Map(); // Map of element ID to draw callback

    // Video properties (kept for backward compatibility)
    this.videoSource = null;
    this.isPlaying = false;

    // Touch handling
    this.touches = [];
    this.lastTouchDistance = 0;

    // Animation optimization
    this.needsRedraw = false;
    this.animationId = null;
    this.isAnimating = false;

    // Overlay callbacks
    this.overlayDrawCallbacks = [];

    this.init();
  }

  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.requestRedraw();
  }

  setupCanvas() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;

    // Setup overlay canvas with same dimensions
    if (this.overlayCanvas) {
      this.overlayCanvas.width = this.container.clientWidth;
      this.overlayCanvas.height = this.container.clientHeight;
    }

    // Initialize translation to show (0,0) at canvas center by default
    this.translateX = this.canvas.width / 2;
    this.translateY = this.canvas.height / 2;

    this.requestRedraw();
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    // Touch events
    this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Prevent context menu on right click
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Resize handling
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  // Animation optimization methods
  requestRedraw() {
    if (!this.needsRedraw) {
      this.needsRedraw = true;
      if (!this.isAnimating) {
        this.startAnimation();
      }
    }
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  handleMouseDown(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;

    this.translateX += deltaX;
    this.translateY += deltaY;

    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.requestRedraw();
  }

  handleMouseUp(e) {
    this.isDragging = false;
  }

  handleWheel(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wheel = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAt(mouseX, mouseY, wheel);
  }

  handleTouchStart(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);

    if (this.touches.length === 1) {
      this.isDragging = true;
      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;
    } else if (this.touches.length === 2) {
      this.isDragging = false;
      this.lastTouchDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);

    if (this.touches.length === 1 && this.isDragging) {
      const deltaX = this.touches[0].clientX - this.lastX;
      const deltaY = this.touches[0].clientY - this.lastY;

      this.translateX += deltaX;
      this.translateY += deltaY;

      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;

      this.requestRedraw();
    } else if (this.touches.length === 2) {
      const currentDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
      const scale = currentDistance / this.lastTouchDistance;

      const centerX = (this.touches[0].clientX + this.touches[1].clientX) / 2;
      const centerY = (this.touches[0].clientY + this.touches[1].clientY) / 2;

      const rect = this.canvas.getBoundingClientRect();
      const canvasX = centerX - rect.left;
      const canvasY = centerY - rect.top;

      this.zoomAt(canvasX, canvasY, scale);
      this.lastTouchDistance = currentDistance;
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);

    if (this.touches.length === 0) {
      this.isDragging = false;
    } else if (this.touches.length === 1) {
      this.isDragging = true;
      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;
    }
  }

  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  zoomAt(x, y, scale) {
    // Calculate the point in world coordinates before zoom
    const worldX = (x - this.translateX) / this.scale;
    const worldY = (y - this.translateY) / this.scale;

    // Apply zoom
    this.scale *= scale;
    this.scale = Math.max(0.1, Math.min(10, this.scale)); // Limit zoom range

    // Adjust translation to keep the world point under the cursor
    this.translateX = x - worldX * this.scale;
    this.translateY = y - worldY * this.scale;

    this.requestRedraw();
  }

  handleResize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;

    if (this.overlayCanvas) {
      this.overlayCanvas.width = this.container.clientWidth;
      this.overlayCanvas.height = this.container.clientHeight;
    }

    this.requestRedraw();
  }

  // Element management methods
  addElement(id, element, drawCallback) {
    this.elements.set(id, element);
    this.elementDrawCallbacks.set(id, drawCallback);
    this.requestRedraw();
  }

  removeElement(id) {
    this.elements.delete(id);
    this.elementDrawCallbacks.delete(id);
    this.requestRedraw();
  }

  updateElement(id, element) {
    if (this.elements.has(id)) {
      this.elements.set(id, element);
      this.requestRedraw();
    }
  }

  getElement(id) {
    return this.elements.get(id);
  }

  clearElements() {
    this.elements.clear();
    this.elementDrawCallbacks.clear();
    this.requestRedraw();
  }

  // Video methods (for backward compatibility)
  setVideoSource(videoElement) {
    this.videoElement = videoElement;
    this.addElement("__video__", videoElement, (ctx, element) => {
      const videoWidth = element.videoWidth || element.width;
      const videoHeight = element.videoHeight || element.height;

      if (videoWidth && videoHeight) {
        // Draw video at (0,0) instead of centered
        ctx.drawImage(element, 0, 0, videoWidth, videoHeight);
      }
    });
    this.videoSource = videoElement;
    this.isPlaying = true;

    // Center the view on the video when it's loaded
    this.centerViewOnVideo();

    // For video, we need continuous animation
    this.startAnimation();
  }

  // Helper method to center the view on the video
  centerViewOnVideo() {
    if (!this.videoElement) return;

    const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
    const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

    if (videoWidth && videoHeight) {
      // We want world coordinate (0,0) to correspond to the video's top-left corner
      // AND we want the video to be visually centered on the canvas
      // So we translate so that world (0,0) appears at the position where
      // we want the video's top-left corner to be

      // Calculate where video top-left should be to center the video on canvas
      const videoTopLeftCanvasX = (this.canvas.width - videoWidth * this.scale) / 2;
      const videoTopLeftCanvasY = (this.canvas.height - videoHeight * this.scale) / 2;

      // Set translation so world (0,0) maps to that canvas position
      this.translateX = videoTopLeftCanvasX;
      this.translateY = videoTopLeftCanvasY;

      this.requestRedraw();
    }
  }

  clearVideoSource() {
    this.removeElement("__video__");
    this.videoSource = null;
    this.isPlaying = false;
  }

  // Transform utility methods
  getTransform() {
    return {
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY,
    };
  }

  canvasToWorld(canvasX, canvasY) {
    return {
      x: (canvasX - this.translateX) / this.scale,
      y: (canvasY - this.translateY) / this.scale,
    };
  }

  worldToCanvas(worldX, worldY) {
    return {
      x: worldX * this.scale + this.translateX,
      y: worldY * this.scale + this.translateY,
    };
  }

  // Overlay canvas methods
  clearOverlayCanvas() {
    if (this.overlayCtx) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  // Fixed method: Now properly synchronizes overlay context with main canvas transforms
  getOverlayContext() {
    if (!this.overlayCtx) return null;

    // Apply the EXACT same transform as the main canvas
    this.overlayCtx.save();
    this.overlayCtx.translate(this.translateX, this.translateY);
    this.overlayCtx.scale(this.scale, this.scale);

    return this.overlayCtx;
  }

  // Helper method to get video center in world coordinates
  getVideoCenterWorldCoords() {
    if (!this.videoElement) return { x: 0, y: 0 };

    const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
    const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

    // Video is drawn at (-videoWidth/2, -videoHeight/2), so center is at (0, 0)
    return { x: 0, y: 0 };
  }

  // Helper method to convert video pixel coordinates to world coordinates
  videoToWorldCoords(videoX, videoY) {
    if (!this.videoElement) return { x: videoX, y: videoY };

    const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
    const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

    // Video is drawn from (-videoWidth/2, -videoHeight/2) to (videoWidth/2, videoHeight/2)
    return {
      x: videoX - videoWidth / 2,
      y: videoY - videoHeight / 2,
    };
  }

  restoreOverlayContext() {
    if (this.overlayCtx) {
      this.overlayCtx.restore();
    }
  }

  // Overlay drawing methods in world coordinates
  drawOverlayPoint(x, y, color = "red", size = 5) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / this.scale, 0, 2 * Math.PI); // Adjust size for scale
    ctx.fill();

    this.restoreOverlayContext();
  }

  drawOverlayLine(x1, y1, x2, y2, color = "red", width = 2) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width / this.scale; // Adjust width for scale
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    this.restoreOverlayContext();
  }

  drawOverlayRect(x, y, width, height, color = "red", lineWidth = 2, fill = false) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    if (fill) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth / this.scale; // Adjust width for scale
      ctx.strokeRect(x, y, width, height);
    }

    this.restoreOverlayContext();
  }

  drawOverlayText(text, x, y, color = "red", fontSize = 16, font = "Arial") {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.font = `${fontSize / this.scale}px ${font}`; // Adjust font size for scale
    ctx.fillText(text, x, y);

    this.restoreOverlayContext();
  }

  drawOverlayCircle(x, y, radius, color = "red", lineWidth = 2, fill = false) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    if (fill) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth / this.scale; // Adjust width for scale
      ctx.stroke();
    }

    this.restoreOverlayContext();
  }

  // Overlay callback management
  addOverlayCallback(callback) {
    this.overlayDrawCallbacks.push(callback);
    this.requestRedraw();
  }

  removeOverlayCallback(callback) {
    const index = this.overlayDrawCallbacks.indexOf(callback);
    if (index > -1) {
      this.overlayDrawCallbacks.splice(index, 1);
      this.requestRedraw();
    }
  }

  clearOverlayCallbacks() {
    this.overlayDrawCallbacks = [];
    this.requestRedraw();
  }

  animate() {
    if (!this.needsRedraw && !this.isPlaying) {
      // Stop animation if nothing needs updating and no video is playing
      this.stopAnimation();
      return;
    }

    // Clear main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply transforms for main canvas
    this.ctx.save();
    this.ctx.translate(this.translateX, this.translateY);
    this.ctx.scale(this.scale, this.scale);

    // Draw all elements
    for (const [id, element] of this.elements) {
      const drawCallback = this.elementDrawCallbacks.get(id);
      if (drawCallback) {
        drawCallback(this.ctx, element);
      }
    }

    this.ctx.restore();

    // Draw overlay elements - now properly synchronized
    if (this.overlayCtx) {
      // Don't automatically clear - let user manage overlay clearing manually
      // this.clearOverlayCanvas();

      // Execute all overlay callbacks with properly synchronized transforms
      this.overlayDrawCallbacks.forEach((callback) => {
        callback(this);
      });
    }

    // Draw debug info on main canvas (in screen coordinates)
    this.ctx.fillStyle = "white";
    this.ctx.font = "14px monospace";
    if (this.videoElement)
      this.ctx.fillText(
        `Video Resolution: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
        10,
        this.canvas.height - 100
      );
    this.ctx.fillText(`Scale: ${this.scale.toFixed(2)}`, 10, this.canvas.height - 80);
    this.ctx.fillText(`X: ${this.translateX.toFixed(0)}`, 10, this.canvas.height - 60);
    this.ctx.fillText(`Y: ${this.translateY.toFixed(0)}`, 10, this.canvas.height - 40);
    this.ctx.fillText(`Elements: ${this.elements.size}`, 10, this.canvas.height - 20);

    this.needsRedraw = false;

    // Continue animation if video is playing or if continuous updates are needed
    if (this.isPlaying || this.needsRedraw) {
      this.animationId = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.stopAnimation();
    }
  }

  // Utility method to force continuous animation (useful for dynamic content)
  startContinuousAnimation() {
    this.startAnimation();
  }

  stopContinuousAnimation() {
    if (!this.isPlaying) {
      this.stopAnimation();
    }
  }
}
