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
document.getElementById("fullscreenBtn").title = "Enter Fullscreen";
