class MQTTClient {
  constructor(brokerHost, brokerPort = 8000, options = {}) {
    this.brokerHost = brokerHost;
    this.brokerPort = brokerPort;
    this.clientId = options.clientId || `mqtt_client_${Math.random().toString(36).substr(2, 9)}`;
    this.username = options.username || null;
    this.password = options.password || null;
    this.useSSL = options.useSSL || false;
    this.keepAliveInterval = options.keepAliveInterval || 60;
    this.cleanSession = options.cleanSession !== false;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || -1; // -1 for infinite

    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.subscriptions = new Map(); // topic -> callback
    this.messageQueue = []; // Queue for messages to send when disconnected
    this.autoReconnect = options.autoReconnect !== false;

    // Event callbacks
    this.onConnected = options.onConnected || (() => {});
    this.onDisconnected = options.onDisconnected || (() => {});
    this.onConnectionLost = options.onConnectionLost || (() => {});
    this.onConnecting = options.onConnecting || (() => {});
    this.onError = options.onError || ((error) => console.error("MQTT Error:", error));

    this._initializeClient();
    this._connect();
  }

  _initializeClient() {
    this.client = new Paho.MQTT.Client(this.brokerHost, Number(this.brokerPort), this.clientId);

    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      this.isConnecting = false;
      console.warn("MQTT Connection Lost:", responseObject.errorMessage);
      this.onConnectionLost(responseObject);

      if (this.autoReconnect && responseObject.errorCode !== 0) {
        this._scheduleReconnect();
      }
    };

    this.client.onMessageArrived = (message) => {
      this._handleMessage(message);
    };
  }

  _connect() {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.onConnecting();

    const connectOptions = {
      onSuccess: () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log("MQTT Connected successfully");
        this.onConnected();
        this._resubscribeAll();
        this._flushMessageQueue();
      },
      onFailure: (error) => {
        this.isConnected = false;
        this.isConnecting = false;
        console.error("MQTT Connection failed:", error.errorMessage);
        this.onError(error);

        if (this.autoReconnect) {
          this._scheduleReconnect();
        }
      },
      keepAliveInterval: this.keepAliveInterval,
      cleanSession: this.cleanSession,
      useSSL: this.useSSL,
    };

    if (this.username) {
      connectOptions.userName = this.username;
    }
    if (this.password) {
      connectOptions.password = this.password;
    }

    try {
      this.client.connect(connectOptions);
    } catch (error) {
      this.isConnecting = false;
      console.error("MQTT Connection error:", error);
      this.onError(error);
      if (this.autoReconnect) {
        this._scheduleReconnect();
      }
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this._connect();
    }, delay);
  }

  _resubscribeAll() {
    for (const [topic, callback] of this.subscriptions) {
      this._doSubscribe(topic, callback);
    }
  }

  _doSubscribe(topic, callback) {
    if (!this.isConnected) {
      return;
    }

    this.client.subscribe(topic, {
      onSuccess: () => {
        console.log(`Successfully subscribed to topic: ${topic}`);
      },
      onFailure: (error) => {
        console.error(`Failed to subscribe to topic ${topic}:`, error);
        this.onError(error);
      },
    });
  }

  _handleMessage(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // Find matching subscription
    for (const [subscribedTopic, callback] of this.subscriptions) {
      if (this._topicMatches(topic, subscribedTopic)) {
        try {
          // Try to parse as JSON first
          let data;
          try {
            data = JSON.parse(payload);
          } catch (e) {
            // If JSON parsing fails, use raw string
            data = payload;
          }

          callback(data, topic, message);
        } catch (error) {
          console.error(`Error in message callback for topic ${topic}:`, error);
          this.onError(error);
        }
      }
    }
  }

  _topicMatches(actualTopic, subscribedTopic) {
    // Handle MQTT wildcards
    const actualParts = actualTopic.split("/");
    const subscribedParts = subscribedTopic.split("/");

    // Handle # wildcard
    if (subscribedParts[subscribedParts.length - 1] === "#") {
      const baseSubscribed = subscribedParts.slice(0, -1);
      const baseActual = actualParts.slice(0, baseSubscribed.length);
      return (
        baseSubscribed.every((part, i) => part === "+" || part === baseActual[i]) &&
        actualParts.length >= baseSubscribed.length
      );
    }

    // Handle exact match and + wildcards
    if (actualParts.length !== subscribedParts.length) {
      return false;
    }

    return subscribedParts.every((part, i) => part === "+" || part === actualParts[i]);
  }

  _flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const { topic, message, options } = this.messageQueue.shift();
      this._doPublish(topic, message, options);
    }
  }

  _doPublish(topic, message, options = {}) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const mqttMessage = new Paho.MQTT.Message(message);
      mqttMessage.destinationName = topic;
      mqttMessage.qos = options.qos || 0;
      mqttMessage.retained = options.retained || false;

      this.client.send(mqttMessage);
      return true;
    } catch (error) {
      console.error("Error publishing message:", error);
      this.onError(error);
      return false;
    }
  }

  // Public methods

  subscribe(topic, callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.subscriptions.set(topic, callback);

    if (this.isConnected) {
      this._doSubscribe(topic, callback);
    }
    // If not connected, subscription will happen automatically on reconnection
  }

  unsubscribe(topic) {
    this.subscriptions.delete(topic);

    if (this.isConnected) {
      this.client.unsubscribe(topic, {
        onSuccess: () => {
          console.log(`Successfully unsubscribed from topic: ${topic}`);
        },
        onFailure: (error) => {
          console.error(`Failed to unsubscribe from topic ${topic}:`, error);
          this.onError(error);
        },
      });
    }
  }

  publish(topic, data, options = {}) {
    let message;

    // Auto-serialize objects to JSON
    if (typeof data === "object" && data !== null) {
      try {
        message = JSON.stringify(data);
      } catch (error) {
        console.error("Error serializing message to JSON:", error);
        this.onError(error);
        return false;
      }
    } else {
      message = String(data);
    }

    if (this.isConnected) {
      return this._doPublish(topic, message, options);
    } else {
      // Queue message for later sending
      this.messageQueue.push({ topic, message, options });
      console.log(`Message queued for topic ${topic} (not connected)`);
      return true;
    }
  }

  disconnect() {
    this.autoReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.isConnected) {
      this.client.disconnect();
      this.onDisconnected();
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  reconnect() {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.autoReconnect = true;
    this.reconnectAttempts = 0;
    this._connect();
  }

  isClientConnected() {
    return this.isConnected;
  }

  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  clearSubscriptions() {
    for (const topic of this.subscriptions.keys()) {
      this.unsubscribe(topic);
    }
  }
}
