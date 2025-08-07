function isMobile() {
  const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return regex.test(navigator.userAgent);
}

if (isMobile()) console.log("Mobile device detected");
else console.log("Desktop device detected");

var g_useGPU = false;
var gpuDetector = null;
var dartnet = null;
var zoomableCanvas = null;
var cameraManager = null;
var settingsManager = null;
