var msgpack = require("msgpack-lite");

module.exports = {
    socket: null,
    connected: false,
    socketId: -1,
    connect: function (address, callback, events) {
        if (this.socket) return;

        var _this = this;
        try {
            var socketError = false;
            var socketAddress = address;
            this.socket = new WebSocket(socketAddress);
            this.socket.binaryType = "arraybuffer";
            this.socket.onmessage = function (message) {

                var data = new Uint8Array(message.data);
                var parsed = msgpack.decode(data);
                var type = parsed[0];
                var data = parsed[1];

                if (type == "io-init") {
                    _this.socketId = data[0];
                } else {
                    events[type].apply(undefined, data);
                }
            };
            this.socket.onopen = function () {
                _this.connected = true;
                callback();
            };
            this.socket.onclose = function (event) {
                _this.connected = false;
                if (event.code == 4001) {
                    callback("Invalid Connection");
                } else if (!socketError) {
                    callback("disconnected");
                }
            };
            this.socket.onerror = function (error) {
                if (this.socket && this.socket.readyState != WebSocket.OPEN) {
                    socketError = true;
                    console.error("Socket error", arguments);
                    callback("Socket error");
                }
            };
        } catch (e) {
            console.warn("Socket connection error:", e);
            callback(e);
        }
    },
    send: function (type) {

        var data = Array.prototype.slice.call(arguments, 1);

        var binary = msgpack.encode([type, data]);
        this.socket.send(binary);
    },
    socketReady: function () {
        return (this.socket && this.connected);
    },
    close: function () {
        this.socket && this.socket.close();
    }
};