// SettingsManager Class - Enhanced with proper event handling
class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.callbacks = {};
    this.setupEventListeners();
    this.needRestart = false;
  }

  // Setup event listeners for all form elements
  setupEventListeners() {
    // Get all setting elements
    const settingElements = document.querySelectorAll(
      ".settings_form-control, .settings_form-select, .settings_slider"
    );

    settingElements.forEach((element) => {
      const eventType = element.type === "range" ? "input" : "change";
      element.addEventListener(eventType, (e) => {
        this.handleSettingChange(e);
      });
    });

    console.log("Event listeners setup complete");
  }

  // Handle individual setting changes
  handleSettingChange(event) {
    const element = event.target;
    const elementId = element.id;

    // Parse category and key from element ID
    const { category, key } = this.parseElementId(elementId);

    if (category && key) {
      let value = element.value;

      // Convert numeric values
      if (element.type === "number" || element.type === "range") {
        value = parseInt(value) || 0;
      }

      const arns = this.getAllRestartNeedSettings();
      let nr = false;
      console.log("arns[category]:", arns[category], typeof arns[category]);
      if (arns[category]) {
        if (typeof arns[category] == "boolean") nr = arns[category];
        else nr = arns[category][key];
      }

      console.log(`Setting changed: ${category}.${key} = ${value} ${nr ? " (Need Restart)" : "(No restart need)"}`);
      this.needRestart |= nr;

      // Trigger change callback
      this.triggerCallback("change", {
        category,
        key,
        value,
        elementId,
        element,
      });

      // Update slider values if it's a range input
      if (element.type === "range") {
        this.updateSliderValues();
      }
    }
  }

  // Parse element ID to get category and key
  parseElementId(elementId) {
    const categoryMap = {
      mqtt: "mqtt",
      dart: "dart",
      calibration: "calibration",
      general: "general",
    };

    for (const [prefix, category] of Object.entries(categoryMap)) {
      if (elementId.startsWith(prefix)) {
        const key = elementId.replace(prefix, "");
        // Convert first letter to lowercase
        const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
        return { category, key: normalizedKey };
      }
    }

    return { category: null, key: null };
  }

  getDefaultSettings() {
    return {
      mqtt: { brokerIP: "192.168.1.100", port: 8083, username: "", password: "" },
      dart: {
        type: "vo",
        vaiURL: "http://192.168.1.100:80",
        vaiBurstLength: 20,
        vaiExtraWaitFrames: 10,
        confidence: 25,
        nms: 45,
        model: "yolo",
      },
      calibration: { type: "automatic", points: 9, accuracy: 7, tolerance: 10 },
      general: { language: "en", theme: "dark", updateInterval: 100, logLevel: 3 },
    };
  }

  getAllRestartNeedSettings() {
    return {
      mqtt: true,
      dart: {
        type: true,
        vaiURL: true,
        vaiBurstLength: true, // TODO false,
        vaiExtraWaitFrames: true, // TODO false,
        confidence: false,
        nms: false,
        model: true,
      },
      calibration: { type: true, points: true, accuracy: true, tolerance: false },
      // general: { language: "en", theme: "dark", updateInterval: 100, logLevel: 3 },
    };
  }

  getAllSettings() {
    return {
      mqtt: {
        brokerIP: document.getElementById("mqttBrokerIP").value,
        port: parseInt(document.getElementById("mqttPort").value) || 1883,
        username: document.getElementById("mqttUsername").value,
        password: document.getElementById("mqttPassword").value,
      },
      dart: {
        type: document.getElementById("dartType").value,
        vaiURL: document.getElementById("dartvaiURL").value,
        vaiBurstLength: parseInt(document.getElementById("dartvaiBurstLength").value),
        vaiExtraWaitFrames: parseInt(document.getElementById("dartvaiExtraWaitFrames").value),
        confidence: parseInt(document.getElementById("dartConfidence").value),
        nms: parseInt(document.getElementById("dartNMS").value),
        model: document.getElementById("dartModel").value,
      },
      calibration: {
        type: document.getElementById("calibrationType").value,
        points: parseInt(document.getElementById("calibrationPoints").value),
        accuracy: parseInt(document.getElementById("calibrationAccuracy").value),
        tolerance: parseInt(document.getElementById("calibrationTolerance").value),
      },
      general: {
        language: document.getElementById("generalLanguage").value,
        theme: document.getElementById("generalTheme").value,
        updateInterval: parseInt(document.getElementById("generalUpdateInterval").value),
        logLevel: parseInt(document.getElementById("generalLogLevel").value),
      },
    };
  }

  populateSettings(settings) {
    // MQTT
    if (document.getElementById("mqttBrokerIP")) document.getElementById("mqttBrokerIP").value = settings.mqtt.brokerIP;
    if (document.getElementById("mqttPort")) document.getElementById("mqttPort").value = settings.mqtt.port;
    if (document.getElementById("mqttUsername")) document.getElementById("mqttUsername").value = settings.mqtt.username;
    if (document.getElementById("mqttPassword")) document.getElementById("mqttPassword").value = settings.mqtt.password;

    // Dart detector

    if (document.getElementById("dartType")) document.getElementById("dartType").value = settings.dart.type;
    if (document.getElementById("dartvaiURL")) document.getElementById("dartvaiURL").value = settings.dart.vaiURL;
    if (document.getElementById("dartvaiBurstLength"))
      document.getElementById("dartvaiBurstLength").value = settings.dart.vaiBurstLength;
    if (document.getElementById("dartvaiExtraWaitFrames"))
      document.getElementById("dartvaiExtraWaitFrames").value = settings.dart.vaiExtraWaitFrames;
    if (document.getElementById("dartConfidence"))
      document.getElementById("dartConfidence").value = settings.dart.confidence;
    if (document.getElementById("dartNMS")) document.getElementById("dartNMS").value = settings.dart.nms;
    if (document.getElementById("dartModel")) document.getElementById("dartModel").value = settings.dart.model;

    // Calibration
    if (document.getElementById("calibrationType"))
      document.getElementById("calibrationType").value = settings.calibration.type;
    if (document.getElementById("calibrationPoints"))
      document.getElementById("calibrationPoints").value = settings.calibration.points;
    if (document.getElementById("calibrationAccuracy"))
      document.getElementById("calibrationAccuracy").value = settings.calibration.accuracy;
    if (document.getElementById("calibrationTolerance"))
      document.getElementById("calibrationTolerance").value = settings.calibration.tolerance;

    // General
    if (document.getElementById("generalLanguage"))
      document.getElementById("generalLanguage").value = settings.general.language;
    if (document.getElementById("generalTheme")) document.getElementById("generalTheme").value = settings.general.theme;
    if (document.getElementById("generalUpdateInterval"))
      document.getElementById("generalUpdateInterval").value = settings.general.updateInterval;
    if (document.getElementById("generalLogLevel"))
      document.getElementById("generalLogLevel").value = settings.general.logLevel;

    // Update sliders
    this.updateSliderValues();
  }

  updateSliderValues() {
    const sliders = [
      { id: "dartConfidence", suffix: "%" },
      { id: "dartNMS", suffix: "%" },
      { id: "dartvaiBurstLength", suffix: "" },
      { id: "dartvaiExtraWaitFrames", suffix: "" },
      { id: "calibrationAccuracy", suffix: "" },
      { id: "calibrationTolerance", suffix: "", transform: (v) => (v / 10).toFixed(1) },
      { id: "generalUpdateInterval", suffix: "ms" },
      { id: "generalLogLevel", transform: (v) => ["", "Error", "Warn", "Info", "Debug", "Trace"][v] },
    ];

    sliders.forEach((slider) => {
      const element = document.getElementById(slider.id);
      const valueElement = document.getElementById(slider.id + "Value");
      if (element && valueElement) {
        let displayValue = element.value;
        if (slider.transform) {
          displayValue = slider.transform(element.value);
        } else if (slider.suffix) {
          displayValue += slider.suffix;
        }
        valueElement.textContent = displayValue;
      }
    });
  }

  // Get specific setting
  getSetting(category, key) {
    const settings = this.getAllSettings();
    return settings[category] ? settings[category][key] : undefined;
  }

  // Set specific setting programmatically
  setSetting(category, key, value) {
    const elementId = category + key.charAt(0).toUpperCase() + key.slice(1);
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value;
      if (element.type === "range") {
        this.updateSliderValues();
      }

      // Trigger change event programmatically
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  saveSettings() {
    console.log("Save settings clicked");
    try {
      const settings = this.getAllSettings();
      localStorage.setItem("dartnetSettings", JSON.stringify(settings));
      showNotification("Settings saved to browser storage!", "success");
      settingsManager.triggerCallback("save", settings);
      if (this.needRestart) showNotification("Reload to apply", "warning");
    } catch (error) {
      console.error("Error saving settings:", error);
      showNotification("Error saving settings: " + error.message, "error");
    }
  }

  loadSettings() {
    console.log("Load settings clicked");
    try {
      const savedSettings = localStorage.getItem("dartnetSettings");
      const settings = savedSettings ? JSON.parse(savedSettings) : this.getDefaultSettings();
      this.populateSettings(settings);
      showNotification(
        savedSettings ? "Settings loaded!" : "Default settings loaded (no saved settings found)",
        "success"
      );
      settingsManager.triggerCallback("load", settings);
    } catch (error) {
      console.error("Error loading settings:", error);
      showNotification("Error loading settings: " + error.message, "error");
    }
  }
  // Reset settings
  resetSettings() {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      const defaultSettings = this.getDefaultSettings();
      this.populateSettings(defaultSettings);
      console.log("Settings reset to defaults");
      showNotification("Settings reset to default values!", "info");
      this.triggerCallback("reset", defaultSettings);
    }
  }

  // Export settings
  exportSettings() {
    const settings = this.getAllSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dartnet-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    console.log("Settings exported");
    showNotification("Settings exported successfully!", "success");
    this.triggerCallback("export", settings);
  }

  // Register callbacks
  onSettingsChange(callback) {
    this.registerCallback("change", callback);
  }
  onSettingsSave(callback) {
    this.registerCallback("save", callback);
  }
  onSettingsLoad(callback) {
    this.registerCallback("load", callback);
  }
  onSettingsReset(callback) {
    this.registerCallback("reset", callback);
  }
  onSettingsExport(callback) {
    this.registerCallback("export", callback);
  }

  registerCallback(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
    console.log(`Callback registered for '${event}' event`);
  }

  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Utility method to get all registered callbacks
  getCallbacks() {
    return Object.keys(this.callbacks).map((event) => ({
      event,
      count: this.callbacks[event].length,
    }));
  }
}
