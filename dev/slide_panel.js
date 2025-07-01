// Simple Panel Manager - Class-based approach
class SimplePanelManager {
  constructor() {
    this.openPanels = new Set();
    this.zIndexCounter = 1000;
    this.init();
  }

  init() {
    // Handle keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTopPanel();
      }
    });

    // Update panel count
    this.updatePanelCount();
  }

  togglePanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;

    if (panel.classList.contains("slidep-open")) {
      this.closePanel(id);
    } else {
      this.openPanel(id);
    }
  }

  openPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;

    // Set z-index for stacking
    panel.style.zIndex = this.zIndexCounter++;

    // Add to open panels
    this.openPanels.add(id);

    // Open the panel
    panel.classList.add("slidep-open");

    // Handle stacking
    this.updateStacking();

    // Hide toggle buttons
    this.updateToggleVisibility();

    // Update panel count
    this.updatePanelCount();
  }

  closePanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;

    // Remove from open panels
    this.openPanels.delete(id);

    // Close the panel
    panel.classList.remove("slidep-open");

    // Handle stacking
    setTimeout(() => {
      this.updateStacking();
      this.updateToggleVisibility();
    }, 100);

    // Update panel count
    this.updatePanelCount();
  }

  closeTopPanel() {
    if (this.openPanels.size === 0) return;

    // Find the panel with highest z-index
    let topPanel = null;
    let highestZIndex = -1;

    this.openPanels.forEach((id) => {
      const panel = document.getElementById(id);
      const zIndex = parseInt(panel.style.zIndex || 1000);
      if (zIndex > highestZIndex) {
        highestZIndex = zIndex;
        topPanel = id;
      }
    });

    if (topPanel) {
      this.closePanel(topPanel);
    }
  }

  closeAllPanels() {
    const panelIds = Array.from(this.openPanels);
    panelIds.forEach((id) => this.closePanel(id));
  }

  updateStacking() {
    // Handle left panels
    const leftPanels = Array.from(this.openPanels)
      .map((id) => document.getElementById(id))
      .filter((panel) => panel.classList.contains("slidep-left"))
      .sort((a, b) => parseInt(a.style.zIndex) - parseInt(b.style.zIndex));

    leftPanels.forEach((panel, index) => {
      if (index < leftPanels.length - 1) {
        panel.classList.add("slidep-stacked");
      } else {
        panel.classList.remove("slidep-stacked");
      }
    });

    // Handle right panels
    const rightPanels = Array.from(this.openPanels)
      .map((id) => document.getElementById(id))
      .filter((panel) => panel.classList.contains("slidep-right"))
      .sort((a, b) => parseInt(a.style.zIndex) - parseInt(b.style.zIndex));

    rightPanels.forEach((panel, index) => {
      if (index < rightPanels.length - 1) {
        panel.classList.add("slidep-stacked");
      } else {
        panel.classList.remove("slidep-stacked");
      }
    });
  }

  updateToggleVisibility() {
    const leftToggle = document.querySelector(".slidep-toggle-group.slidep-left");
    const rightToggle = document.querySelector(".slidep-toggle-group.slidep-right");

    const hasLeftPanels = Array.from(this.openPanels).some((id) =>
      document.getElementById(id).classList.contains("slidep-left")
    );

    const hasRightPanels = Array.from(this.openPanels).some((id) =>
      document.getElementById(id).classList.contains("slidep-right")
    );

    if (hasLeftPanels) {
      leftToggle.classList.remove("slidep-visible");
    } else {
      leftToggle.classList.add("slidep-visible");
    }

    if (hasRightPanels) {
      rightToggle.classList.remove("slidep-visible");
    } else {
      rightToggle.classList.add("slidep-visible");
    }
  }

  updatePanelCount() {
    const countElement = document.getElementById("panelCount");
    if (countElement) {
      countElement.textContent = this.openPanels.size;
    }
  }

  getPanelTitle(id) {
    const panel = document.getElementById(id);
    const titleElement = panel.querySelector(".slidep-panel-title");
    return titleElement ? titleElement.textContent.replace("Close", "").trim() : id;
  }
}

// Initialize the panel manager
let panelManager;

// Global helper functions
function togglePanel(id) {
  if (panelManager) {
    panelManager.togglePanel(id);
  }
}

function closePanel(id) {
  if (panelManager) {
    panelManager.closePanel(id);
  }
}

function closeAllPanels() {
  if (panelManager) {
    panelManager.closeAllPanels();
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  panelManager = new SimplePanelManager();
  window.panelManager = panelManager;

  // Demo button interactivity
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("slidep-control-button") && !e.target.onclick) {
      const originalText = e.target.textContent;
      e.target.textContent = "Processing...";
      e.target.disabled = true;

      setTimeout(() => {
        e.target.textContent = originalText;
        e.target.disabled = false;
      }, 1000);
    }
  });
});
