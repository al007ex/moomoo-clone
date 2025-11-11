var msgpack = require("msgpack-lite");

var NO_OP = function () { };

function IoClient() {
    this.socket = null;
    this.connected = false;
    this.socketId = -1;

    this._callback = NO_OP;
    this._handlers = Object.create(null);
    this._suppressCloseNotification = false;

    this._handleOpen = this._handleOpen.bind(this);
    this._handleClose = this._handleClose.bind(this);
    this._handleError = this._handleError.bind(this);
    this._handleMessage = this._handleMessage.bind(this);
}

IoClient.prototype.connect = function (address, callback, events) {
    if (!address) {
        throw new Error("connect(address) requires a WebSocket address.");
    }

    this._callback = typeof callback === "function" ? callback : NO_OP;
    this._handlers = this._normalizeHandlers(events);
    this._suppressCloseNotification = false;

    if (this.socket) {
        this.close();
    }

    try {
        this.socket = new WebSocket(address);
    } catch (error) {
        console.error("Socket creation failed:", error);
        this._notifyCallback(error || "Socket error");
        return;
    }

    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = this._handleOpen;
    this.socket.onclose = this._handleClose;
    this.socket.onerror = this._handleError;
    this.socket.onmessage = this._handleMessage;
};

IoClient.prototype.send = function (type) {
    if (!this.socketReady()) {
        console.warn("Attempted to send packet before socket was ready:", type);
        return;
    }

    var payload = Array.prototype.slice.call(arguments, 1);

    try {
        var binary = msgpack.encode([type, payload]);
        this.socket.send(binary);
    } catch (error) {
        console.error("Failed to send packet:", error);
        return;
    }

    if (typeof window !== "undefined" && typeof window.incrementPacketCounter === "function") {
        window.incrementPacketCounter();
    }
};

IoClient.prototype.socketReady = function () {
    return Boolean(this.socket && this.connected);
};

IoClient.prototype.close = function () {
    if (!this.socket) {
        this.connected = false;
        return;
    }

    this.socket.close();
};

IoClient.prototype._handleOpen = function () {
    this.connected = true;
    this._notifyCallback();
};

IoClient.prototype._handleClose = function (event) {
    this.connected = false;
    this.socketId = -1;

    var reason;
    var skipNotification = this._suppressCloseNotification;
    this._suppressCloseNotification = false;

    if (event && event.code === 4001) {
        reason = "Invalid Connection";
    } else if (event && event.reason) {
        reason = event.reason;
    } else {
        reason = "disconnected";
    }

    if (!skipNotification) {
        this._notifyCallback(reason);
    }
    this._detachSocket();
};

IoClient.prototype._handleError = function (error) {
    this._suppressCloseNotification = true;
    console.error("Socket error:", error);
    this._notifyCallback("Socket error");
};

IoClient.prototype._handleMessage = function (message) {
    var data;
    try {
        data = new Uint8Array(message.data);
    } catch (error) {
        console.warn("Invalid socket payload:", error);
        return;
    }

    var parsed;
    try {
        parsed = msgpack.decode(data);
    } catch (error) {
        console.warn("Failed to decode socket payload:", error);
        return;
    }

    var type = parsed && parsed[0];
    var payload = parsed && parsed[1];

    if (type === "io-init") {
        this.socketId = Array.isArray(payload) ? payload[0] : payload;
        return;
    }

    var handler = this._handlers[type];
    if (!handler) {
        console.warn("Unhandled packet type:", type);
        return;
    }

    var args = Array.isArray(payload) ? payload : [payload];
    try {
        handler.apply(undefined, args);
    } catch (error) {
        console.error("Handler for packet type '" + type + "' failed:", error);
    }
};

IoClient.prototype._normalizeHandlers = function (events) {
    var handlers = Object.create(null);
    if (!events) {
        return handlers;
    }

    for (var key in events) {
        if (!Object.prototype.hasOwnProperty.call(events, key)) {
            continue;
        }
        if (typeof events[key] === "function") {
            handlers[key] = events[key];
        } else {
            console.warn("Ignoring non-function handler for packet type:", key);
        }
    }

    return handlers;
};

IoClient.prototype._notifyCallback = function (message) {
    try {
        this._callback(message);
    } catch (error) {
        console.error("Socket callback failed:", error);
    }
};

IoClient.prototype._detachSocket = function () {
    if (!this.socket) {
        return;
    }

    this.socket.onopen = null;
    this.socket.onclose = null;
    this.socket.onerror = null;
    this.socket.onmessage = null;
    this.socket = null;
};

module.exports = new IoClient();
module.exports.IoClient = IoClient;
