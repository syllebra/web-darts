// Fullscreen functionality
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("Error attempting to enable fullscreen:", err.message);
    });
  } else {
    document.exitFullscreen();
  }
}

// Update fullscreen button icon
document.addEventListener("fullscreenchange", () => {
  const btn = document.getElementById("fullscreenBtn");
  if (document.fullscreenElement) {
    btn.innerHTML = "⛶"; // Exit fullscreen icon
    btn.title = "Exit Fullscreen";
  } else {
    btn.innerHTML = "⛶"; // Enter fullscreen icon
    btn.title = "Enter Fullscreen";
  }
});

// Set initial tooltip
if (document.fullscreenElement) document.fullscreenElement.title = "Enter Fullscreen";

function makeDraggable(elementId, onClickCB) {
  const button = document.getElementById(elementId);
  let isDragging = false;
  let hasMoved = false;
  let startX, startY;

  button.addEventListener("mousedown", function (e) {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    button.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    const deltaX = Math.abs(e.clientX - startX);
    const deltaY = Math.abs(e.clientY - startY);

    if (deltaX > 5 || deltaY > 5) {
      hasMoved = true;
      button.style.left = e.clientX - 25 + "px";
      button.style.top = e.clientY - 25 + "px";
      button.style.right = "auto";
    }
  });

  document.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      button.style.cursor = "pointer";

      // Override onclick if we dragged
      if (hasMoved) {
        button.onclick = null;
        setTimeout(() => {
          button.onclick = onClickCB;
        }, 100);
      }
    }
  });

  // Touch events
  button.addEventListener("touchstart", function (e) {
    isDragging = true;
    hasMoved = false;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  });

  button.addEventListener("touchmove", function (e) {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);

    if (deltaX > 5 || deltaY > 5) {
      hasMoved = true;
      button.style.left = touch.clientX - 25 + "px";
      button.style.top = touch.clientY - 25 + "px";
      button.style.right = "auto";
      e.preventDefault();
    }
  });

  button.addEventListener("touchend", function () {
    if (isDragging) {
      isDragging = false;

      if (!hasMoved) {
        onClickCB();
      }
    }
  });
}

function showNotification(message, type = "info") {
  const colors = {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  };

  const notification = document.createElement("div");
  notification.style.cssText = `
                position: fixed; top: 80px; right: 20px; z-index: 5001;
                background: rgba(255,255,255,0.15); backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;
                padding: 15px 20px; color: white; font-size: 14px;
                border-left: 4px solid ${colors[type]}; max-width: 300px;
                opacity: 0; transform: translateX(100%); transition: all 0.3s ease;
            `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  }, 10);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
