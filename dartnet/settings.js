// SettingsManager Class - Enhanced with proper event handling
class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.callbacks = {};
    this.setupEventListeners();
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

      console.log(`Setting changed: ${category}.${key} = ${value}`);

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
      dartvo: "dartvo",
      dartvai: "dartvai",
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
      mqtt: { brokerIP: "192.168.1.100", port: 1883, username: "", password: "" },
      dartvo: { model: "yolo", source: "camera0", confidence: 75, nms: 45 },
      dartvai: {
        url: "http://192.168.1.100:80",
        modelType: "transformer",
        mode: "realtime",
        learningRate: 30,
        batchSize: 16,
      },
      calibration: { type: "automatic", points: 9, accuracy: 7, tolerance: 5 },
      general: { language: "en", theme: "dark", updateInterval: 100, logLevel: 3 },
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
      dartvo: {
        model: document.getElementById("dartvoModel").value,
        source: document.getElementById("dartvoSource").value,
        confidence: parseInt(document.getElementById("dartvoConfidence").value),
        nms: parseInt(document.getElementById("dartvoNMS").value),
      },
      dartvai: {
        url: document.getElementById("dartvaiURL").value,
        modelType: document.getElementById("dartvaiModelType").value,
        mode: document.getElementById("dartvaiMode").value,
        learningRate: parseInt(document.getElementById("dartvaiLearningRate").value),
        batchSize: parseInt(document.getElementById("dartvaiBatchSize").value),
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
    document.getElementById("mqttBrokerIP").value = settings.mqtt.brokerIP;
    document.getElementById("mqttPort").value = settings.mqtt.port;
    document.getElementById("mqttUsername").value = settings.mqtt.username;
    document.getElementById("mqttPassword").value = settings.mqtt.password;

    // DartVO
    document.getElementById("dartvoModel").value = settings.dartvo.model;
    document.getElementById("dartvoSource").value = settings.dartvo.source;
    document.getElementById("dartvoConfidence").value = settings.dartvo.confidence;
    document.getElementById("dartvoNMS").value = settings.dartvo.nms;

    // DartVAI
    document.getElementById("dartvaiURL").value = settings.dartvai.url;
    document.getElementById("dartvaiModelType").value = settings.dartvai.modelType;
    document.getElementById("dartvaiMode").value = settings.dartvai.mode;
    document.getElementById("dartvaiLearningRate").value = settings.dartvai.learningRate;
    document.getElementById("dartvaiBatchSize").value = settings.dartvai.batchSize;

    // Calibration
    document.getElementById("calibrationType").value = settings.calibration.type;
    document.getElementById("calibrationPoints").value = settings.calibration.points;
    document.getElementById("calibrationAccuracy").value = settings.calibration.accuracy;
    document.getElementById("calibrationTolerance").value = settings.calibration.tolerance;

    // General
    document.getElementById("generalLanguage").value = settings.general.language;
    document.getElementById("generalTheme").value = settings.general.theme;
    document.getElementById("generalUpdateInterval").value = settings.general.updateInterval;
    document.getElementById("generalLogLevel").value = settings.general.logLevel;

    // Update sliders
    this.updateSliderValues();
  }

  updateSliderValues() {
    const sliders = [
      { id: "dartvoConfidence", suffix: "%" },
      { id: "dartvoNMS", suffix: "%" },
      { id: "dartvaiLearningRate", transform: (v) => (v / 10000).toFixed(4) },
      { id: "dartvaiBatchSize", suffix: "" },
      { id: "calibrationAccuracy", suffix: "" },
      { id: "calibrationTolerance", suffix: "px" },
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
