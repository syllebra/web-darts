class MQTTClient {
  constructor(brokerUrl, port, clientId, options = {}) {
    this.brokerUrl = brokerUrl;
    this.port = port;
    this.clientId = clientId || "mqtt_client_" + Math.random().toString(36).substr(2, 9);

    // Configuration options
    this.options = {
      useSSL: options.useSSL || false,
      keepAliveInterval: options.keepAliveInterval || 60,
      cleanSession: options.cleanSession !== false,
      timeout: options.timeout || 3,
      userName: options.userName || null,
      password: options.password || null,
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || -1, // -1 for infinite
      autoConnect: options.autoConnect !== false, // Default to true
      ...options,
    };

    // State management
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;

    // Topic subscriptions with callbacks
    this.subscriptions = new Map(); // topic -> Set of callbacks
    this.qosLevels = new Map(); // topic -> qos level

    // Message queues for offline scenarios
    this.messageQueue = [];
    this.subscriptionQueue = [];

    // Event handlers
    this.eventHandlers = {
      onConnect: [],
      onDisconnect: [],
      onError: [],
      onReconnect: [],
    };

    this._createClient();

    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect().catch((error) => {
        // Initial connection failure will trigger retry mechanism
        console.log("Initial connection failed, retry mechanism will handle reconnection");
      });
    }
  }

  _createClient() {
    try {
      this.client = new Paho.MQTT.Client(this.brokerUrl, this.port, this.clientId);
      this._setupEventHandlers();
    } catch (error) {
      this._handleError("Failed to create MQTT client", error);
    }
  }

  _setupEventHandlers() {
    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      this._handleDisconnection(responseObject);
    };

    this.client.onMessageArrived = (message) => {
      this._handleMessage(message);
    };

    this.client.onConnected = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this._clearReconnectTimer();
      this._processQueues();
      this._triggerEvent("onConnect");
    };
  }

  connect() {
    if (this.isConnected || this.isConnecting) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      const connectOptions = {
        timeout: this.options.timeout,
        keepAliveInterval: this.options.keepAliveInterval,
        cleanSession: this.options.cleanSession,
        useSSL: this.options.useSSL,
        onSuccess: () => {
          resolve();
        },
        onFailure: (error) => {
          this.isConnecting = false;
          this._handleError("Connection failed", error);
          // Trigger reconnection if autoConnect is enabled
          if (this.options.autoConnect) {
            this._attemptReconnection();
          }
          reject(error);
        },
      };

      if (this.options.userName) {
        connectOptions.userName = this.options.userName;
      }
      if (this.options.password) {
        connectOptions.password = this.options.password;
      }

      try {
        this.client.connect(connectOptions);
      } catch (error) {
        this.isConnecting = false;
        if (this.options.autoConnect) {
          this._attemptReconnection();
        }
        reject(error);
      }
    });
  }

  disconnect() {
    this._clearReconnectTimer();
    if (this.client && this.isConnected) {
      this.client.disconnect();
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  publish(topic, payload, qos = 0, retained = false) {
    // Auto-serialize objects and arrays to JSON
    let processedPayload = payload;
    if (typeof payload === "object" && payload !== null) {
      processedPayload = JSON.stringify(payload);
    }

    const message = new Paho.MQTT.Message(processedPayload);
    message.destinationName = topic;
    message.qos = qos;
    message.retained = retained;

    if (this.isConnected) {
      try {
        this.client.send(message);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
      // If autoConnect is enabled and not already connecting, start connection
      if (this.options.autoConnect && !this.isConnecting) {
        this.connect().catch(() => {
          // Connection failure will be handled by retry mechanism
        });
      }
      return Promise.resolve(); // Return success since it's queued
    }
  }

  subscribe(topic, callback, qos = 0) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    // Store subscription
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic).add({ callback, parseJson: false });
    this.qosLevels.set(topic, qos);

    if (this.isConnected) {
      return this._performSubscription(topic, qos);
    } else {
      // Queue subscription for later
      this.subscriptionQueue.push({ topic, qos });
      // If autoConnect is enabled and not already connecting, start connection
      if (this.options.autoConnect && !this.isConnecting) {
        this.connect().catch(() => {
          // Connection failure will be handled by retry mechanism
        });
      }
      return Promise.resolve(); // Return success since it's queued
    }
  }

  subscribeJson(topic, callback, qos = 0) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    // Store subscription with JSON parsing flag
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic).add({ callback, parseJson: true });
    this.qosLevels.set(topic, qos);

    if (this.isConnected) {
      return this._performSubscription(topic, qos);
    } else {
      // Queue subscription for later
      this.subscriptionQueue.push({ topic, qos });
      // If autoConnect is enabled and not already connecting, start connection
      if (this.options.autoConnect && !this.isConnecting) {
        this.connect().catch(() => {
          // Connection failure will be handled by retry mechanism
        });
      }
      return Promise.resolve(); // Return success since it's queued
    }
  }

  unsubscribe(topic, callback = null) {
    if (callback) {
      // Remove specific callback
      if (this.subscriptions.has(topic)) {
        const subscriptionSet = this.subscriptions.get(topic);
        for (const sub of subscriptionSet) {
          if (sub.callback === callback || sub === callback) {
            subscriptionSet.delete(sub);
            break;
          }
        }
        if (subscriptionSet.size === 0) {
          this.subscriptions.delete(topic);
          this.qosLevels.delete(topic);
          if (this.isConnected) {
            return this._performUnsubscription(topic);
          }
        }
      }
    } else {
      // Remove all callbacks for topic
      this.subscriptions.delete(topic);
      this.qosLevels.delete(topic);
      if (this.isConnected) {
        return this._performUnsubscription(topic);
      }
    }
    return Promise.resolve();
  }

  _performSubscription(topic, qos) {
    return new Promise((resolve, reject) => {
      try {
        this.client.subscribe(topic, {
          qos: qos,
          onSuccess: () => resolve(),
          onFailure: (error) => reject(error),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  _performUnsubscription(topic) {
    return new Promise((resolve, reject) => {
      try {
        this.client.unsubscribe(topic, {
          onSuccess: () => resolve(),
          onFailure: (error) => reject(error),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  _handleMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // Find matching subscriptions (support wildcards)
    for (const [subscribedTopic, subscriptionSet] of this.subscriptions) {
      if (this._topicMatches(subscribedTopic, topic)) {
        subscriptionSet.forEach((subscription) => {
          try {
            let processedPayload = payload;

            // Parse JSON if requested
            if (subscription.parseJson) {
              try {
                processedPayload = JSON.parse(payload);
              } catch (jsonError) {
                console.error(`Failed to parse JSON for topic ${topic}:`, jsonError);
                // Still call callback with original payload and error info
                subscription.callback(topic, payload, message, {
                  jsonParseError: jsonError,
                });
                return;
              }
            }

            // Call the callback with processed payload
            subscription.callback(topic, processedPayload, message);
          } catch (error) {
            console.error("Error in message callback:", error);
          }
        });
      }
    }
  }

  _topicMatches(pattern, topic) {
    // Convert MQTT wildcards to regex
    const regexPattern = pattern.replace(/\+/g, "[^/]+").replace(/#$/, ".*").replace(/\//g, "\\/");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  _handleDisconnection(responseObject) {
    this.isConnected = false;
    this._triggerEvent("onDisconnect", responseObject);

    if (responseObject.errorCode !== 0) {
      this._handleError("Connection lost", responseObject);
      this._attemptReconnection();
    }
  }

  _attemptReconnection() {
    if (this.reconnectTimer || this.isConnecting) {
      return;
    }

    if (this.options.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this._handleError("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect()
        .then(() => {
          this._triggerEvent("onReconnect");
        })
        .catch(() => {
          this._attemptReconnection();
        });
    }, this.options.reconnectInterval);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _processQueues() {
    // Process queued subscriptions
    const subscriptions = [...this.subscriptionQueue];
    this.subscriptionQueue = [];

    subscriptions.forEach(({ topic, qos }) => {
      this._performSubscription(topic, qos).catch((error) => {
        console.error("Failed to resubscribe to", topic, error);
      });
    });

    // Process queued messages
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      try {
        this.client.send(message);
      } catch (error) {
        console.error("Failed to send queued message:", error);
        // Re-queue on failure
        this.messageQueue.push(message);
      }
    });
  }

  _handleError(message, error = null) {
    const errorObj = { message, error, timestamp: new Date() };
    console.error("MQTT Error:", errorObj);
    this._triggerEvent("onError", errorObj);
  }

  _triggerEvent(eventName, data = null) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      });
    }
  }

  // Event handler management
  on(event, handler) {
    if (this.eventHandlers[event] && typeof handler === "function") {
      this.eventHandlers[event].push(handler);
    }
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  // Utility methods
  isConnectedState() {
    return this.isConnected;
  }

  getClientId() {
    return this.clientId;
  }

  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  getQueuedMessages() {
    return this.messageQueue.length;
  }

  getReconnectAttempts() {
    return this.reconnectAttempts;
  }

  clearQueues() {
    this.messageQueue = [];
    this.subscriptionQueue = [];
  }
}
