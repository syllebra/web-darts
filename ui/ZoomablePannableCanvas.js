class ZoomablePannableCanvas {
  constructor(canvasId, containerId, overlayCanvasId = null) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    this.ctx = this.canvas?.getContext("2d");

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

    // Interactive overlay elements
    this.overlayElements = new Map(); // Map of overlay element ID to element data
    this.overlayElementCallbacks = new Map(); // Map of overlay element ID to draw/hit test callbacks
    this.selectedOverlayElement = null;
    this.isDraggingOverlayElement = false;
    this.overlayElementOffset = { x: 0, y: 0 };

    // Video properties (kept for backward compatibility)
    this.videoSource = null;
    this.isPlaying = false;

    // Touch handling
    this.touches = [];
    this.lastTouchDistance = 0;
    this.multiTouchStartTime = 0;
    this.multiTouchThreshold = 150; // ms to wait before deciding gesture type
    this.multiTouchStartDistance = 0;
    this.multiTouchStartCenter = { x: 0, y: 0 };
    this.isMultiTouchGesture = false;
    this.multiTouchGestureType = null; // 'zoom' or 'pan'
    this.multiTouchDistanceThreshold = 20; // pixels movement to determine zoom vs pan

    // Animation optimization
    this.needsRedraw = false;
    this.animationId = null;
    this.isAnimating = false;

    // Overlay callbacks
    this.overlayDrawCallbacks = [];

    // Event callbacks for interactive elements
    this.onElementSelected = [];
    this.onElementDragStart = [];
    this.onElementDrag = [];
    this.onElementDragEnd = [];

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
    // Always attach events to the main canvas for consistent behavior
    // The overlay canvas is just for drawing, not for events
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

  // Enhanced mouse handling with overlay element interaction
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.canvasToWorld(canvasX, canvasY);

    // Check if clicking on an overlay element
    const hitElement = this.getOverlayElementAt(worldCoords.x, worldCoords.y);

    // Not pick using middle mouse (reserved for canvas drag only)
    if (hitElement && e.button != 1) {
      this.selectedOverlayElement = hitElement.id;
      this.isDraggingOverlayElement = true;
      this.isDragging = false; // Don't drag canvas when dragging element

      // Calculate offset from element center to click point
      const element = this.overlayElements.get(hitElement.id);
      this.overlayElementOffset = {
        x: worldCoords.x - element.x,
        y: worldCoords.y - element.y,
      };

      // Trigger callbacks
      this.onElementSelected.forEach((cb) => cb(hitElement.id, element));
      this.onElementDragStart.forEach((cb) => cb(hitElement.id, element, worldCoords));
    } else {
      // No overlay element hit, proceed with canvas dragging
      this.selectedOverlayElement = null;
      this.isDraggingOverlayElement = false;
      this.isDragging = true;
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldCoords = this.canvasToWorld(canvasX, canvasY);

    if (this.isDraggingOverlayElement && this.selectedOverlayElement) {
      // Drag overlay element
      const element = this.overlayElements.get(this.selectedOverlayElement);
      if (element) {
        element.x = worldCoords.x - this.overlayElementOffset.x;
        element.y = worldCoords.y - this.overlayElementOffset.y;

        this.onElementDrag.forEach((cb) => cb(this.selectedOverlayElement, element, worldCoords));

        this.requestRedraw();
      }
    } else if (this.isDragging) {
      // Drag canvas
      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;

      this.translateX += deltaX;
      this.translateY += deltaY;

      this.requestRedraw();
    } else {
      // Update cursor based on what's under mouse
      const hitElement = this.getOverlayElementAt(worldCoords.x, worldCoords.y);
      this.canvas.style.cursor = hitElement ? "pointer" : "default";
    }

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  handleMouseUp(e) {
    if (this.isDraggingOverlayElement && this.selectedOverlayElement) {
      const element = this.overlayElements.get(this.selectedOverlayElement);
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const worldCoords = this.canvasToWorld(canvasX, canvasY);

      this.onElementDragEnd.forEach((cb) => cb(this.selectedOverlayElement, element, worldCoords));
    }

    this.isDragging = false;
    this.isDraggingOverlayElement = false;
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
      // Single finger - same as before but reset multi-touch flags
      this.isMultiTouchGesture = false;
      this.multiTouchGestureType = null;

      const rect = this.canvas.getBoundingClientRect();
      const canvasX = this.touches[0].clientX - rect.left;
      const canvasY = this.touches[0].clientY - rect.top;
      const worldCoords = this.canvasToWorld(canvasX, canvasY);

      // Check for overlay element hit
      const hitElement = this.getOverlayElementAt(worldCoords.x, worldCoords.y);

      if (hitElement) {
        this.selectedOverlayElement = hitElement.id;
        this.isDraggingOverlayElement = true;
        this.isDragging = false;

        const element = this.overlayElements.get(hitElement.id);
        this.overlayElementOffset = {
          x: worldCoords.x - element.x,
          y: worldCoords.y - element.y,
        };

        this.onElementSelected.forEach((cb) => cb(hitElement.id, element));
        this.onElementDragStart.forEach((cb) => cb(hitElement.id, element, worldCoords));
      } else {
        this.selectedOverlayElement = null;
        this.isDraggingOverlayElement = false;
        this.isDragging = true;
      }

      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;
    } else if (this.touches.length === 2) {
      // Multi-touch started - initialize gesture detection
      this.isDragging = false;
      this.isDraggingOverlayElement = false;
      this.isMultiTouchGesture = true;
      this.multiTouchGestureType = null; // Will be determined in handleTouchMove
      this.multiTouchStartTime = Date.now();

      // Store initial state for gesture detection
      this.multiTouchStartDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
      this.multiTouchStartCenter = {
        x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
        y: (this.touches[0].clientY + this.touches[1].clientY) / 2,
      };

      this.lastTouchDistance = this.multiTouchStartDistance;
    } else {
      // 3+ fingers - treat as multi-touch gesture
      this.isDragging = false;
      this.isDraggingOverlayElement = false;
      this.isMultiTouchGesture = true;
      this.multiTouchGestureType = "pan"; // Default to pan for 3+ fingers
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);

    if (this.touches.length === 1 && !this.isMultiTouchGesture) {
      // Single finger movement - same as before
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = this.touches[0].clientX - rect.left;
      const canvasY = this.touches[0].clientY - rect.top;
      const worldCoords = this.canvasToWorld(canvasX, canvasY);

      if (this.isDraggingOverlayElement && this.selectedOverlayElement) {
        // Touch drag overlay element
        const element = this.overlayElements.get(this.selectedOverlayElement);
        if (element) {
          element.x = worldCoords.x - this.overlayElementOffset.x;
          element.y = worldCoords.y - this.overlayElementOffset.y;

          this.onElementDrag.forEach((cb) => cb(this.selectedOverlayElement, element, worldCoords));

          this.requestRedraw();
        }
      } else if (this.isDragging) {
        // Touch drag canvas
        const deltaX = this.touches[0].clientX - this.lastX;
        const deltaY = this.touches[0].clientY - this.lastY;

        this.translateX += deltaX;
        this.translateY += deltaY;

        this.requestRedraw();
      }

      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;
    } else if (this.touches.length === 2) {
      // Two finger gesture - determine if zoom or pan
      const currentDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
      const currentCenter = {
        x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
        y: (this.touches[0].clientY + this.touches[1].clientY) / 2,
      };

      if (this.multiTouchGestureType === null) {
        // Determine gesture type based on movement
        const distanceChange = Math.abs(currentDistance - this.multiTouchStartDistance);
        const centerMovement = Math.sqrt(
          Math.pow(currentCenter.x - this.multiTouchStartCenter.x, 2) +
            Math.pow(currentCenter.y - this.multiTouchStartCenter.y, 2)
        );

        // If distance changed more than threshold, it's a zoom
        // If center moved more than threshold with minimal distance change, it's a pan
        if (distanceChange > this.multiTouchDistanceThreshold) {
          this.multiTouchGestureType = "zoom";
        } else if (centerMovement > this.multiTouchDistanceThreshold) {
          this.multiTouchGestureType = "pan";
        }
        // If neither threshold is met, keep waiting
      }

      // Execute the determined gesture
      if (this.multiTouchGestureType === "zoom") {
        // Zoom gesture
        const scale = currentDistance / this.lastTouchDistance;
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = currentCenter.x - rect.left;
        const canvasY = currentCenter.y - rect.top;

        this.zoomAt(canvasX, canvasY, scale);
        this.lastTouchDistance = currentDistance;
      } else if (this.multiTouchGestureType === "pan") {
        // Pan gesture - move canvas based on center movement
        const deltaX = currentCenter.x - this.multiTouchStartCenter.x;
        const deltaY = currentCenter.y - this.multiTouchStartCenter.y;

        // Apply the pan movement (reset to start center to avoid accumulation)
        this.translateX += deltaX;
        this.translateY += deltaY;

        // Update start center to current for next movement
        this.multiTouchStartCenter = currentCenter;
        this.requestRedraw();
      }
    } else if (this.touches.length > 2) {
      // 3+ finger pan
      const currentCenter = {
        x: this.touches.reduce((sum, touch) => sum + touch.clientX, 0) / this.touches.length,
        y: this.touches.reduce((sum, touch) => sum + touch.clientY, 0) / this.touches.length,
      };

      if (this.multiTouchStartCenter) {
        const deltaX = currentCenter.x - this.multiTouchStartCenter.x;
        const deltaY = currentCenter.y - this.multiTouchStartCenter.y;

        this.translateX += deltaX;
        this.translateY += deltaY;
        this.requestRedraw();
      }

      this.multiTouchStartCenter = currentCenter;
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();

    const prevTouchCount = this.touches.length;
    this.touches = Array.from(e.touches);

    // If we were in a multi-touch gesture and now have 0 or 1 fingers, end the gesture
    if (this.isMultiTouchGesture && this.touches.length <= 1) {
      // End multi-touch gesture
      if (this.isDraggingOverlayElement && this.selectedOverlayElement) {
        // Only trigger drag end if we were actually dragging an overlay element
        // before the multi-touch started (this shouldn't happen in current logic,
        // but keeping for safety)
        const element = this.overlayElements.get(this.selectedOverlayElement);
        if (element) {
          // Use last known position
          const rect = this.canvas.getBoundingClientRect();
          const worldCoords = this.canvasToWorld(this.lastX - rect.left, this.lastY - rect.top);
          this.onElementDragEnd.forEach((cb) => cb(this.selectedOverlayElement, element, worldCoords));
        }
      }

      // Reset all gesture states
      this.isMultiTouchGesture = false;
      this.multiTouchGestureType = null;
      this.isDragging = false;
      this.isDraggingOverlayElement = false;
      this.selectedOverlayElement = null;

      // If we still have one finger down, check what's under it but DON'T start dragging
      // This prevents the "phantom click" issue you mentioned
      if (this.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = this.touches[0].clientX - rect.left;
        const canvasY = this.touches[0].clientY - rect.top;

        this.lastX = this.touches[0].clientX;
        this.lastY = this.touches[0].clientY;

        // Don't start any new interaction - user needs to lift and tap again
        // This prevents the unwanted single-finger behavior after multi-touch
      }
    } else if (this.touches.length === 0) {
      // All fingers lifted
      if (this.isDraggingOverlayElement && this.selectedOverlayElement && !this.isMultiTouchGesture) {
        // Only trigger drag end for single-finger overlay dragging
        const element = this.overlayElements.get(this.selectedOverlayElement);
        const rect = this.canvas.getBoundingClientRect();
        const worldCoords = this.canvasToWorld(this.lastX - rect.left, this.lastY - rect.top);

        this.onElementDragEnd.forEach((cb) => cb(this.selectedOverlayElement, element, worldCoords));
      }

      // Reset all states
      this.isDragging = false;
      this.isDraggingOverlayElement = false;
      this.isMultiTouchGesture = false;
      this.multiTouchGestureType = null;
      this.selectedOverlayElement = null;
    } else if (this.touches.length === 1 && prevTouchCount > 1) {
      // Went from multi-touch to single finger
      // Reset multi-touch state but don't start new single-finger interaction
      this.isMultiTouchGesture = false;
      this.multiTouchGestureType = null;

      this.lastX = this.touches[0].clientX;
      this.lastY = this.touches[0].clientY;

      // Important: Don't start dragging here - this prevents phantom interactions
      // User must lift finger completely and tap again for new interaction
    } else if (this.touches.length === 2 && prevTouchCount > 2) {
      // Went from 3+ fingers to 2 fingers - switch to 2-finger gesture detection
      this.multiTouchGestureType = null; // Reset to re-detect
      this.multiTouchStartTime = Date.now();
      this.multiTouchStartDistance = this.getTouchDistance(this.touches[0], this.touches[1]);
      this.multiTouchStartCenter = {
        x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
        y: (this.touches[0].clientY + this.touches[1].clientY) / 2,
      };
      this.lastTouchDistance = this.multiTouchStartDistance;
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

  // Interactive overlay element management
  addOverlayElement(id, element, drawCallback, hitTestCallback = null) {
    this.overlayElements.set(id, element);
    this.overlayElementCallbacks.set(id, {
      draw: drawCallback,
      hitTest: hitTestCallback || this.defaultHitTest.bind(this),
    });
    this.requestRedraw();
  }

  removeOverlayElement(id) {
    this.overlayElements.delete(id);
    this.overlayElementCallbacks.delete(id);
    if (this.selectedOverlayElement === id) {
      this.selectedOverlayElement = null;
      this.isDraggingOverlayElement = false;
    }
    this.requestRedraw();
  }

  updateOverlayElement(id, element) {
    if (this.overlayElements.has(id)) {
      this.overlayElements.set(id, element);
      this.requestRedraw();
    }
  }

  getOverlayElement(id) {
    return this.overlayElements.get(id);
  }

  clearOverlayElements() {
    this.overlayElements.clear();
    this.overlayElementCallbacks.clear();
    this.selectedOverlayElement = null;
    this.isDraggingOverlayElement = false;
    this.requestRedraw();
  }

  // Hit testing for overlay elements
  getOverlayElementAt(worldX, worldY) {
    // Test elements in reverse order (top to bottom)
    const elementIds = Array.from(this.overlayElements.keys()).reverse();

    for (const id of elementIds) {
      const element = this.overlayElements.get(id);
      const callbacks = this.overlayElementCallbacks.get(id);

      if (callbacks && callbacks.hitTest(element, worldX, worldY)) {
        return { id, element };
      }
    }

    return null;
  }

  // Default hit test for circular elements
  defaultHitTest(element, worldX, worldY) {
    const dx = worldX - element.x;
    const dy = worldY - element.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (element.radius || element.size || 10);
  }

  // Event callback setters
  addOnElementSelected(callback) {
    this.onElementSelected.push(callback);
  }

  addOnElementDragStart(callback) {
    this.onElementDragStart.push(callback);
  }

  addOnElementDrag(callback) {
    this.onElementDrag.push(callback);
  }

  addOnElementDragEnd(callback) {
    this.onElementDragEnd.push(callback);
  }

  // Video methods (for backward compatibility)
  setVideoSource(videoElement) {
    this.videoElement = videoElement;
    this.addElement("__video__", videoElement, (ctx, element) => {
      const videoWidth = element.videoWidth || element.width;
      const videoHeight = element.videoHeight || element.height;

      if (videoWidth && videoHeight) {
        ctx.drawImage(element, 0, 0, videoWidth, videoHeight);
      }
    });
    this.videoSource = videoElement;
    this.isPlaying = true;

    this.centerViewOnVideo();
    this.autoZoomVideo(20, true);
    this.startAnimation();
  }

  centerViewOnVideo() {
    if (!this.videoElement) return;

    const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
    const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

    if (videoWidth && videoHeight) {
      const videoTopLeftCanvasX = (this.canvas.width - videoWidth * this.scale) / 2;
      const videoTopLeftCanvasY = (this.canvas.height - videoHeight * this.scale) / 2;

      this.translateX = videoTopLeftCanvasX;
      this.translateY = videoTopLeftCanvasY;

      this.requestRedraw();
    }
  }

  /**
   * Auto-zoom the video to fit within the canvas viewport while maintaining aspect ratio
   * @param {number} padding - Optional padding in pixels around the video (default: 20)
   * @param {boolean} animated - Whether to animate the zoom transition (default: false)
   */
  autoZoomVideo(padding = 20, animated = false, srcCrop = null) {
    let x, y, w, h;
    if (srcCrop) {
      [x, y, w, h] = [srcCrop[0], srcCrop[1], srcCrop[2] - srcCrop[0], srcCrop[3] - srcCrop[1]];
    } else {
      if (!this.videoElement) {
        console.warn("No video element set. Cannot auto-zoom.");
        return;
      }

      const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
      const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

      if (!videoWidth || !videoHeight) {
        console.warn("Video dimensions not available. Cannot auto-zoom.");
        return;
      }

      [x, y, w, h] = [0, 0, videoWidth, videoHeight];
    }

    console.debug("AUTO-ZOOM:", [x, y, w, h]);
    // Calculate available canvas space (minus padding)
    const availableWidth = this.canvas.width - padding * 2;
    const availableHeight = this.canvas.height - padding * 2;

    // Calculate scale to fit video within available space
    const scaleX = availableWidth / w;
    const scaleY = availableHeight / h;
    const targetScale = Math.min(scaleX, scaleY);

    // Calculate center position
    const targetTranslateX = this.canvas.width * 0.5 - (x + w * 0.5) * targetScale;
    const targetTranslateY = this.canvas.height * 0.5 - (y + h * 0.5) * targetScale;

    if (animated) {
      // Animate the transition
      this.animateToTransform(targetScale, targetTranslateX, targetTranslateY, 300);
    } else {
      // Set immediately
      this.scale = targetScale;
      this.translateX = targetTranslateX;
      this.translateY = targetTranslateY;
      this.requestRedraw();
    }
  }

  /**
   * Animate to a specific transform state
   * @param {number} targetScale - Target scale value
   * @param {number} targetTranslateX - Target X translation
   * @param {number} targetTranslateY - Target Y translation
   * @param {number} duration - Animation duration in milliseconds
   */
  animateToTransform(targetScale, targetTranslateX, targetTranslateY, duration = 300) {
    const startTime = Date.now();
    const startScale = this.scale;
    const startTranslateX = this.translateX;
    const startTranslateY = this.translateY;

    // Easing function (ease-out)
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animateStep = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      // Interpolate values
      this.scale = startScale + (targetScale - startScale) * easedProgress;
      this.translateX = startTranslateX + (targetTranslateX - startTranslateX) * easedProgress;
      this.translateY = startTranslateY + (targetTranslateY - startTranslateY) * easedProgress;

      this.requestRedraw();

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      }
    };

    requestAnimationFrame(animateStep);
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

  getOverlayContext() {
    if (!this.overlayCtx) return null;

    this.overlayCtx.save();
    this.overlayCtx.translate(this.translateX, this.translateY);
    this.overlayCtx.scale(this.scale, this.scale);

    return this.overlayCtx;
  }

  restoreOverlayContext() {
    if (this.overlayCtx) {
      this.overlayCtx.restore();
    }
  }

  // Helper methods for video coordinates
  getVideoCenterWorldCoords() {
    if (!this.videoElement) return { x: 0, y: 0 };
    return { x: 0, y: 0 };
  }

  videoToWorldCoords(videoX, videoY) {
    if (!this.videoElement) return { x: videoX, y: videoY };

    const videoWidth = this.videoElement.videoWidth || this.videoElement.width;
    const videoHeight = this.videoElement.videoHeight || this.videoElement.height;

    return {
      x: videoX - videoWidth / 2,
      y: videoY - videoHeight / 2,
    };
  }

  // Enhanced overlay drawing methods
  drawOverlayPoint(x, y, color = "red", size = 5) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / this.scale, 0, 2 * Math.PI);
    ctx.fill();

    this.restoreOverlayContext();
  }

  drawOverlayLine(x1, y1, x2, y2, color = "red", width = 2) {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width / this.scale;
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
      ctx.lineWidth = lineWidth / this.scale;
      ctx.strokeRect(x, y, width, height);
    }

    this.restoreOverlayContext();
  }

  drawOverlayText(text, x, y, color = "red", fontSize = 16, font = "Arial") {
    const ctx = this.getOverlayContext();
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.font = `${fontSize / this.scale}px ${font}`;
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
      ctx.lineWidth = lineWidth / this.scale;
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
      this.stopAnimation();
      return;
    }

    // Clear main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply transforms for main canvas
    this.ctx.save();
    this.ctx.translate(this.translateX, this.translateY);
    this.ctx.scale(this.scale, this.scale);

    // Draw all background elements
    for (const [id, element] of this.elements) {
      const drawCallback = this.elementDrawCallbacks.get(id);
      if (drawCallback) {
        drawCallback(this.ctx, element);
      }
    }

    this.ctx.restore();

    // Draw overlay elements and callbacks
    if (this.overlayCtx) {
      this.clearOverlayCanvas();

      // Draw interactive overlay elements
      const ctx = this.getOverlayContext();
      if (ctx) {
        for (const [id, element] of this.overlayElements) {
          const callbacks = this.overlayElementCallbacks.get(id);
          if (callbacks && callbacks.draw) {
            // Highlight selected element
            if (id === this.selectedOverlayElement) {
              ctx.save();
              ctx.shadowColor = "rgba(0, 123, 255, 0.5)";
              ctx.shadowBlur = 10 / this.scale;
              callbacks.draw(ctx, element, true); // Pass selected flag
              ctx.restore();
            } else {
              callbacks.draw(ctx, element, false);
            }
          }
        }
        this.restoreOverlayContext();
      }

      // Execute overlay callbacks
      this.overlayDrawCallbacks.forEach((callback) => {
        callback(this);
      });
    }

    // Draw debug info
    this.ctx.fillStyle = "white";
    this.ctx.font = "14px monospace";
    if (this.videoElement) {
      this.ctx.fillText(
        `Video: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
        10,
        this.canvas.height - 120
      );
    }
    this.ctx.fillText(`Scale: ${this.scale.toFixed(2)}`, 10, this.canvas.height - 100);
    this.ctx.fillText(`X: ${this.translateX.toFixed(0)}`, 10, this.canvas.height - 80);
    this.ctx.fillText(`Y: ${this.translateY.toFixed(0)}`, 10, this.canvas.height - 60);
    this.ctx.fillText(`Elements: ${this.elements.size}`, 10, this.canvas.height - 40);
    this.ctx.fillText(`Overlay: ${this.overlayElements.size}`, 10, this.canvas.height - 20);

    this.needsRedraw = false;

    if (this.isPlaying || this.needsRedraw) {
      this.animationId = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.stopAnimation();
    }
  }

  // Utility methods
  startContinuousAnimation() {
    this.startAnimation();
  }

  stopContinuousAnimation() {
    if (!this.isPlaying) {
      this.stopAnimation();
    }
  }
}
