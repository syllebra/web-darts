// Toggle Button Class
class ToggleButton {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      onChange: options.onChange || null,
      animationDuration: options.animationDuration || 300,
      ...options,
    };

    this.init();
  }

  init() {
    this.onChangeCallbacks = [];
    if (this.onChange) this.onChangeCallbacks.push(this.onChange);
    // Add click listeners to toggle buttons
    const buttons = this.element.querySelectorAll(".toggle-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (!btn.disabled && !btn.classList.contains("active")) {
          this.setValue(btn.dataset.value);
        }
      });
    });
  }

  getValue() {
    return this.element.dataset.value;
  }

  setValue(value, avoidCallbacks = false, animate = true) {
    const buttons = this.element.querySelectorAll(".toggle-btn");
    const currentActive = this.element.querySelector(".toggle-btn.active");
    const newActive = this.element.querySelector(`[data-value="${value}"]`);

    if (!newActive || newActive.disabled) return;

    // Animation
    if (animate && currentActive && currentActive !== newActive) {
      currentActive.classList.add("changing");
      newActive.classList.add("changing");

      setTimeout(() => {
        currentActive.classList.remove("changing");
        newActive.classList.remove("changing");
      }, this.options.animationDuration);
    }

    // Update active state
    buttons.forEach((btn) => btn.classList.remove("active"));
    newActive.classList.add("active");

    // Update data attribute
    this.element.dataset.value = value;

    // Trigger callback
    if (this.onChangeCallbacks && !avoidCallbacks) {
      this.onChangeCallbacks.forEach((cb) => cb(value, this.element));
    }
  }

  setDisabled(disabled) {
    const buttons = this.element.querySelectorAll(".toggle-btn");
    buttons.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  isDisabled() {
    const firstBtn = this.element.querySelector(".toggle-btn");
    return firstBtn ? firstBtn.disabled : false;
  }

  toggle() {
    const buttons = this.element.querySelectorAll(".toggle-btn");
    const currentActive = this.element.querySelector(".toggle-btn.active");

    if (buttons.length === 2 && currentActive) {
      const otherButton = Array.from(buttons).find((btn) => btn !== currentActive);
      if (otherButton && !otherButton.disabled) {
        this.setValue(otherButton.dataset.value);
      }
    }
  }
}

// Initialize toggle buttons
const toggleButtons = {};

// Initialize all toggle button groups
document.addEventListener("DOMContentLoaded", () => {
  const toggleGroups = document.querySelectorAll(".toggle-btn-group");

  toggleGroups.forEach((group) => {
    const id = group.id;
    toggleButtons[id] = new ToggleButton(group, {
      onChange: (value, element) => {
        // Update display
        const valueDisplay = document.getElementById(id + "Value");
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
        //console.log(`${id} changed to: ${value}`);
      },
    });
  });
});

// Demo functions
function toggleState(id) {
  if (toggleButtons[id]) {
    toggleButtons[id].toggle();
  }
}

function setDisabled(id, disabled) {
  if (toggleButtons[id]) {
    toggleButtons[id].setDisabled(disabled);
  }
}

function getValue(id) {
  if (toggleButtons[id]) {
    return toggleButtons[id].getValue();
  }
}

function setValue(id, value) {
  if (toggleButtons[id]) {
    toggleButtons[id].setValue(value);
  }
}
