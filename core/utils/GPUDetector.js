// GPU Detection and Status Class
class GPUDetector {
  constructor() {
    this.webGPUSupported = false;
    this.webGLSupported = false;
    this.gpuAdapter = null;
    this.gpuDevice = null;
    this.webGLContext = null;
    this.statusCallback = null;
    this.status = null;
  }

  // Set callback for status updates
  onStatusUpdate(callback) {
    this.statusCallback = callback;
  }

  // Update status and call callback if set
  updateStatus(status, details = "") {
    this.status = status;
    if (this.statusCallback) {
      this.statusCallback(status, details);
    }
  }

  // Test WebGPU support
  async testWebGPU() {
    try {
      if (!navigator.gpu) {
        console.log("WebGPU not supported by browser");
        return false;
      }

      this.gpuAdapter = await navigator.gpu.requestAdapter();
      if (!this.gpuAdapter) {
        console.log("WebGPU adapter not available");
        return false;
      }

      this.gpuDevice = await this.gpuAdapter.requestDevice();
      if (!this.gpuDevice) {
        console.log("WebGPU device not available");
        return false;
      }

      console.log("WebGPU supported and available");
      console.log("GPU Adapter:", this.gpuAdapter);
      console.log("GPU Device:", this.gpuDevice);

      this.webGPUSupported = true;
      return true;
    } catch (error) {
      console.log("WebGPU test failed:", error.message);
      return false;
    }
  }

  // Test WebGL support
  testWebGL() {
    try {
      const canvas = document.createElement("canvas");
      const contexts = ["webgl2", "webgl", "experimental-webgl"];

      for (const contextType of contexts) {
        this.webGLContext = canvas.getContext(contextType);
        if (this.webGLContext) {
          console.log(`${contextType} supported`);
          this.webGLSupported = true;
          return true;
        }
      }

      console.log("WebGL not supported");
      return false;
    } catch (error) {
      console.log("WebGL test failed:", error.message);
      return false;
    }
  }

  // Get GPU info if available
  getGPUInfo() {
    const info = {
      webGPU: this.webGPUSupported,
      webGL: this.webGLSupported,
      adapter: null,
      renderer: null,
    };

    if (this.webGPUSupported && this.gpuAdapter) {
      // Note: GPU adapter info might be limited for privacy reasons
      info.adapter = "WebGPU Adapter Available";
    }

    if (this.webGLSupported && this.webGLContext) {
      const debugInfo = this.webGLContext.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        info.renderer = this.webGLContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      } else {
        info.renderer = this.webGLContext.getParameter(this.webGLContext.RENDERER);
      }
    }

    return info;
  }

  // Run comprehensive GPU detection
  async detectGPU() {
    this.updateStatus("checking", "Checking GPU support...");

    const webGPUAvailable = await this.testWebGPU();
    const webGLAvailable = this.testWebGL();

    const gpuInfo = this.getGPUInfo();

    if (webGPUAvailable) {
      this.updateStatus("webgpu", `WebGPU Available${gpuInfo.renderer ? ` (${gpuInfo.renderer})` : ""}`);
    } else if (webGLAvailable) {
      this.updateStatus("webgl", `WebGL Available${gpuInfo.renderer ? ` (${gpuInfo.renderer})` : ""}`);
    } else {
      this.updateStatus("none", "No GPU acceleration available");
    }

    return {
      webGPU: webGPUAvailable,
      webGL: webGLAvailable,
      info: gpuInfo,
    };
  }

  // Clean up resources
  destroy() {
    if (this.gpuDevice) {
      this.gpuDevice.destroy();
    }
    this.gpuAdapter = null;
    this.gpuDevice = null;
    this.webGLContext = null;
  }
}

const gpuDetector = new GPUDetector();
// Start GPU detection
gpuDetector.detectGPU().then((result) => {
  console.log("GPU Detection Results:", result);
});
