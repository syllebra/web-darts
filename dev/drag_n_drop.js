class DragDropSystem {
  constructor() {
    this.draggedElement = null;
    this.placeholder = null;
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.isDragging = false;
    this.callbacks = {};
    this.init();
  }

  registerCallback(eventName, callback) {
    this.callbacks[eventName] = callback;
  }

  init() {
    this.setupEventListeners();
    this.createPlaceholder();
  }

  createPlaceholder() {
    this.placeholder = document.createElement("div");
    this.placeholder.className = "card-placeholder";
    this.placeholder.innerHTML = "&nbsp;";
  }

  setupEventListeners() {
    // Desktop drag events
    document.addEventListener("dragstart", this.handleDragStart.bind(this));
    document.addEventListener("dragover", this.handleDragOver.bind(this));
    document.addEventListener("drop", this.handleDrop.bind(this));
    document.addEventListener("dragend", this.handleDragEnd.bind(this));
    document.addEventListener("dragenter", this.handleDragEnter.bind(this));
    document.addEventListener("dragleave", this.handleDragLeave.bind(this));

    // Touch events for mobile
    document.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
  }

  handleDragStart(e) {
    if (!e.target.classList.contains("draggable-card")) return;

    this.draggedElement = e.target;
    e.target.classList.add("dragging");
    this.showDeleteZone();

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);

    if (this.callbacks.onDragStart) {
      this.callbacks.onDragStart(this.draggedElement);
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const container = e.target.closest(".card-container");
    const deleteZone = e.target.closest(".delete-zone");

    if (container) {
      this.handleContainerDragOver(e, container);
    } else if (deleteZone) {
      deleteZone.classList.add("drag-over");
    }
  }

  handleContainerDragOver(e, container) {
    const afterElement = this.getDragAfterElement(container, e.clientY);
    const dragging = document.querySelector(".dragging");

    if (!dragging) return;

    this.placeholder.classList.add("active");

    // console.log("Container:", container);
    // console.log("afterElement:", afterElement);

    try {
      if (afterElement == null) {
        container.appendChild(this.placeholder);
      } else if (container.contains(afterElement)) {
        container.insertBefore(this.placeholder, afterElement);
      } else {
        container.appendChild(this.placeholder);
      }
    } catch (error) {
      console.warn("Drag drop error:", error);
      container.appendChild(this.placeholder);
    }
  }

  handleDragEnter(e) {
    const container = e.target.closest(".card-container");
    const deleteZone = e.target.closest(".delete-zone");

    if (container) {
      container.classList.add("drag-over");
    } else if (deleteZone) {
      deleteZone.classList.add("drag-over");
    }
  }

  handleDragLeave(e) {
    const container = e.target.closest(".card-container");
    const deleteZone = e.target.closest(".delete-zone");

    if (container && !container.contains(e.relatedTarget)) {
      container.classList.remove("drag-over");
    }

    if (deleteZone && !deleteZone.contains(e.relatedTarget)) {
      deleteZone.classList.remove("drag-over");
    }
  }

  handleDrop(e) {
    e.preventDefault();

    const container = e.target.closest(".card-container");
    const deleteZone = e.target.closest(".delete-zone");

    if (deleteZone && this.draggedElement) {
      this.deleteCard(this.draggedElement);
      if (this.callbacks.onDelete) {
        this.callbacks.onDelete(this.draggedElement);
      }
    } else if (container && this.draggedElement) {
      this.moveCard(container);
      if (this.callbacks.onDrop) {
        this.callbacks.onDrop(this.draggedElement, container);
      }
    }

    this.cleanup();
  }

  handleDragEnd(e) {
    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd(this.draggedElement);
    }
    this.cleanup();
  }

  // Touch event handlers
  handleTouchStart(e) {
    const card = e.target.closest(".draggable-card");
    if (!card) return;

    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.potentialDrag = card;

    setTimeout(() => {
      if (this.potentialDrag === card) {
        this.startTouchDrag(card, e);
      }
    }, 200);
  }

  startTouchDrag(card, e) {
    e.preventDefault();
    this.isDragging = true;
    this.draggedElement = card;
    card.classList.add("dragging");
    this.showDeleteZone();
  }

  handleTouchMove(e) {
    if (!this.isDragging) {
      const deltaX = Math.abs(e.touches[0].clientX - this.touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);

      if (deltaX > 10 || deltaY > 10) {
        this.potentialDrag = null;
      }
      return;
    }

    e.preventDefault();

    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const container = elementBelow?.closest(".card-container");
    const deleteZone = elementBelow?.closest(".delete-zone");

    // Clear previous highlights
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));

    if (container) {
      container.classList.add("drag-over");
      this.handleContainerDragOver({ clientY: touch.clientY }, container);
    } else if (deleteZone) {
      deleteZone.classList.add("drag-over");
    }
  }

  handleTouchEnd(e) {
    if (!this.isDragging) {
      this.potentialDrag = null;
      return;
    }

    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const container = elementBelow?.closest(".card-container");
    const deleteZone = elementBelow?.closest(".delete-zone");

    if (deleteZone && this.draggedElement) {
      this.deleteCard(this.draggedElement);
      if (this.callbacks.onDelete) {
        this.callbacks.onDelete(this.draggedElement);
      }
    } else if (container && this.draggedElement) {
      this.moveCard(container);
      if (this.callbacks.onDrop) {
        this.callbacks.onDrop(this.draggedElement, container);
      }
    }

    this.isDragging = false;
    this.cleanup();

    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd(this.draggedElement);
    }
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".draggable-card:not(.dragging)")];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  moveCard(container) {
    if (this.placeholder.parentNode === container) {
      container.insertBefore(this.draggedElement, this.placeholder);
    } else {
      container.appendChild(this.draggedElement);
    }
  }

  deleteCard(card) {
    card.remove();
    this.showNotification("Player removed from team");
  }

  showDeleteZone() {
    document.getElementById("deleteZone").classList.add("active");
  }

  hideDeleteZone() {
    const deleteZone = document.getElementById("deleteZone");
    deleteZone.classList.remove("active", "drag-over");
  }

  cleanup() {
    // Remove dragging state
    document.querySelectorAll(".dragging").forEach((el) => {
      el.classList.remove("dragging");
    });

    // Remove drag-over states
    document.querySelectorAll(".drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });

    // Hide placeholder
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }
    this.placeholder.classList.remove("active");

    // Hide delete zone
    this.hideDeleteZone();

    // Reset state
    this.draggedElement = null;
    this.potentialDrag = null;
  }

  showNotification(message) {
    // Simple notification - you can enhance this
    const notification = document.createElement("div");
    notification.className = "alert alert-info position-fixed";
    notification.style.cssText = "top: 20px; right: 20px; z-index: 1050; min-width: 200px;";
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the drag-drop system
const dragDropSystem = new DragDropSystem();
