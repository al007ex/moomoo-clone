var url = require('url');
var md5 = require('md5');

function VultrClient(baseUrl, devPort, lobbySize, lobbySpread, rawIPs) {
    if (location.hostname == "localhost") {
        window.location.hostname = "127.0.0.1";
    }

    this.debugLog = false;

    this.baseUrl = baseUrl;
    this.lobbySize = lobbySize;
    this.devPort = devPort;
    this.lobbySpread = lobbySpread;
    this.rawIPs = !!rawIPs;

    this.server = undefined;
    this.gameIndex = undefined;

    this.callback = undefined;
    this.errorCallback = undefined;


}

VultrClient.prototype.regionInfo = {
    0: {
        name: "Local",
        latitude: 0,
        longitude: 0
    },
    "vultr:1": {
        name: "New Jersey",
        latitude: 40.1393329,
        longitude: -75.8521818
    },
    "vultr:2": {
        name: "Chicago",
        latitude: 41.8339037,
        longitude: -87.872238
    },
    "vultr:3": {
        name: "Dallas",
        latitude: 32.8208751,
        longitude: -96.8714229
    },
    "vultr:4": {
        name: "Seattle",
        latitude: 47.6149942,
        longitude: -122.4759879
    },
    "vultr:5": {
        name: "Los Angeles",
        latitude: 34.0207504,
        longitude: -118.691914
    },
    "vultr:6": {
        name: "Atlanta",
        latitude: 33.7676334,
        longitude: -84.5610332
    },
    "vultr:7": {
        name: "Amsterdam",
        latitude: 52.3745287,
        longitude: 4.7581878
    },
    "vultr:8": {
        name: "London",
        latitude: 51.5283063,
        longitude: -0.382486
    },
    "vultr:9": {
        name: "Frankfurt",
        latitude: 50.1211273,
        longitude: 8.496137
    },
    "vultr:12": {
        name: "Silicon Valley",
        latitude: 37.4024714,
        longitude: -122.3219752
    },
    "vultr:19": {
        name: "Sydney",
        latitude: -33.8479715,
        longitude: 150.651084
    },
    "vultr:24": {
        name: "Paris",
        latitude: 48.8588376,
        longitude: 2.2773454
    },
    "vultr:25": {
        name: "Tokyo",
        latitude: 35.6732615,
        longitude: 139.569959
    },
    "vultr:39": {
        name: "Miami",
        latitude: 25.7823071,
        longitude: -80.3012156
    },
    "vultr:40": {
        name: "Singapore",
        latitude: 1.3147268,
        longitude: 103.7065876
    }
};

VultrClient.prototype.start = async function (callback, errorCallback) {
    await fetch("./serverData").then(response => response.json()).then(data => {
        this.processServers(data.servers);
    })

    this.callback = callback;
    this.errorCallback = errorCallback;

    var query = this.parseServerQuery();
    if (query) {
        this.log("Found server in query.");
        this.password = query[3];
        this.connect(query[0], query[1], query[2]);
    } else {
        this.log("Pinging servers...");
        this.pingServers();
    }
};

VultrClient.prototype.parseSevers = function () {

}

VultrClient.prototype.parseServerQuery = function () {
    var parsed = url.parse(location.href, true);
    var serverRaw = parsed.query.server;
    if (typeof serverRaw != "string") {
        return;
    }

    var split = serverRaw.split(":");
    if (split.length != 3) {
        this.errorCallback("Invalid number of server parameters in " + serverRaw);
        return;
    }
    var region = split[0];
    var index = parseInt(split[1]);
    var gameIndex = parseInt(split[2]);

    if (region != "0" && !region.startsWith("vultr:")) {
        region = "vultr:" + region;
    }

    return [region, index, gameIndex, parsed.query.password];
};

VultrClient.prototype.findServer = function (region, index) {
    var serverList = this.servers[region];
    if (!Array.isArray(serverList)) {
        this.errorCallback("No server list for region " + region);
        return;
    }

    for (var i = 0; i < serverList.length; i++) {
        var server = serverList[i];

        if (server.index == index) {
            return server;
        }
    }

    console.warn("Could not find server in region " + region + " with index " + index + ".");
    return;
};

VultrClient.prototype.pingServers = function () {
    var _this = this;

    var requests = [];
    for (var region in this.servers) {
        if (!this.servers.hasOwnProperty(region))
            continue;
        var serverList = this.servers[region];
        var targetServer = serverList[Math.floor(Math.random() * serverList.length)];

        if (targetServer == undefined) {
            console.log("No target server for region " + region);
            continue;
        }

        (function (serverList, targetServer) {
            var request = new XMLHttpRequest();
            request.onreadystatechange = function (requestEvent) {
                var request = requestEvent.target;

                if (request.readyState != 4)
                    return;

                if (request.status == 200) {
                    for (var i = 0; i < requests.length; i++) {
                        requests[i].abort();
                    }

                    _this.log("Connecting to region", targetServer.region);

                    var targetGame = _this.seekServer(targetServer.region);
                    _this.connect(targetGame[0], targetGame[1], targetGame[2]);
                } else {
                    console.warn("Error pinging " + targetServer.ip + " in region " + region);
                }
            };
            var targetAddress = "//" + _this.serverAddress(targetServer.ip, true) + ":" + _this.serverPort(targetServer) + "/ping";
            request.open("GET", targetAddress, true);
            request.send(null);

            _this.log("Pinging", targetAddress);

            requests.push(request);
        })(serverList, targetServer);
    }
};

VultrClient.prototype.seekServer = function (region, isPrivate, gameMode) {
    if (gameMode == undefined) {
        gameMode = "random";
    }
    if (isPrivate == undefined) {
        isPrivate = false;
    }

    const gameModeList = ["random"];
    var lobbySize = this.lobbySize;
    var lobbySpread = this.lobbySpread;

    var servers = this.servers[region].flatMap(function (s) {
        var gameIndex = 0;
        return s.games.map(function (g) {
            var currentGameIndex = gameIndex++;
            return {
                region: s.region,
                index: s.index * s.games.length + currentGameIndex,
                gameIndex: currentGameIndex,
                gameCount: s.games.length,
                playerCount: g.playerCount,
                isPrivate: g.isPrivate
            }
        });
    }).filter(function (s) {
        return !s.isPrivate;
    }).filter(function (s) {
        if (isPrivate) {
            return s.playerCount == 0 && s.gameIndex >= s.gameCount / 2;
        } else {
            return true;
        }
    }).filter(function (s) {

        if (gameMode == "random") {
            return true;
        } else {
            return gameModeList[s.index % gameModeList.length].key == gameMode;
        }
    }).sort(function (a, b) {
        return b.playerCount - a.playerCount
    }).filter(function (s) {
        return s.playerCount < lobbySize
    });

    if (isPrivate) {
        servers.reverse();
    }

    if (servers.length == 0) {
        this.errorCallback("No open servers.");
        return;
    }


    var randomSpread = Math.min(lobbySpread, servers.length);
    var serverIndex = Math.floor(Math.random() * randomSpread);
    serverIndex = Math.min(serverIndex, servers.length - 1);
    var rawServer = servers[serverIndex];

    var serverRegion = rawServer.region;
    var serverIndex = Math.floor(rawServer.index / rawServer.gameCount);
    var gameIndex = rawServer.index % rawServer.gameCount;
    this.log("Found server.");

    return [serverRegion, serverIndex, gameIndex];
};

VultrClient.prototype.connect = function (region, index, game) {

    if (this.connected) {
        return;
    }

    var server = this.findServer(region, index);
    if (server == undefined) {
        this.errorCallback("Failed to find server for region " + region + " and index " + index);
        return;
    }

    this.log("Connecting to server", server, "with game index", game);

    if (server.games[game].playerCount >= this.lobbySize) {
        this.errorCallback("Server is already full.");
        return;
    }

    window.history.replaceState(document.title, document.title, this.generateHref(region, index, game, this.password));

    this.server = server;
    this.gameIndex = game;

    this.log("Calling callback with address", this.serverAddress(server.ip), "on port", this.serverPort(server), "with game index", game);
    this.callback(this.serverAddress(server.ip), this.serverPort(server), game);
};

VultrClient.prototype.switchServer = function (region, index, game, password) {

    this.switchingServers = true;

    window.location.href = this.generateHref(region, index, game, password);
};

VultrClient.prototype.generateHref = function (region, index, game, password) {
    region = this.stripRegion(region);

    var href = "/?server=" + region + ":" + index + ":" + game;
    if (password) {
        href += "&password=" + encodeURIComponent(password);
    }
    return href;
};


VultrClient.prototype.serverAddress = function (ip, forceSecure) {


    if (ip == "127.0.0.1" || ip == "7f000001" || ip == "903d62ef5d1c2fecdcaeb5e7dd485eff") {

        return window.location.hostname;

    } else if (this.rawIPs) {
        if (forceSecure) {
            return "ip_" + this.hashIP(ip) + "." + this.baseUrl;
        } else {
            return ip;
        }
    } else {
        return "ip_" + ip + "." + this.baseUrl;
    }
};

VultrClient.prototype.serverPort = function (server) {

    if (server.region == 0) {
        return this.devPort;
    }

    return location.protocol.startsWith("https") ? 443 : 80;
};

VultrClient.prototype.processServers = function (serverList) {

    var servers = {};
    for (var i = 0; i < serverList.length; i++) {
        var server = serverList[i];

        var list = servers[server.region];
        if (list == undefined) {
            list = [];
            servers[server.region] = list;
        }

        list.push(server);
    }

    for (var region in servers) {

        servers[region] = servers[region].sort(function (a, b) {
            return a.index - b.index
        });
    }

    this.servers = servers;
};


VultrClient.prototype.ipToHex = function (ip) {
    const encoded = ip.split(".") // Split by components
        .map((component) => ("00" + parseInt(component).toString(16)) // Parses the component then converts it to a hex
            .substr(-2) // Ensures there's 2 characters
        ).join("") // Join the string
        .toLowerCase();

    return encoded;
};




VultrClient.prototype.hashIP = function (ip) {
    return md5(this.ipToHex(ip));
};

VultrClient.prototype.log = function () {
    if (this.debugLog) {
        return console.log.apply(undefined, arguments);
    } else if (console.verbose) {
        return console.verbose.apply(undefined, arguments);
    }
};

VultrClient.prototype.stripRegion = function (region) {
    if (region.startsWith("vultr:")) {
        region = region.slice(6);
    } else if (region.startsWith("do:")) {
        region = region.slice(3);
    }
    return region;
};

window.testVultrClient = function () {
    var assertIndex = 1;

    function assert(actual, expected) {
        actual = `${actual}`;
        expected = `${expected}`;
        if (actual == expected) {
            console.log(`Assert ${assertIndex} passed.`)
        } else {
            console.warn(`Assert ${assertIndex} failed. Expected ${expected}, got ${actual}.`)
        }
        assertIndex++;
    }

    function generateServerList(regions) {
        var servers = [];
        for (var region in regions) {
            var regionServers = regions[region];
            for (var i = 0; i < regionServers.length; i++) {
                servers.push({
                    ip: region + ":" + i,
                    scheme: "testing",
                    region: region,
                    index: i,
                    games: regionServers[i].map(p => {
                        return {
                            playerCount: p,
                            isPrivate: false
                        };
                    })
                });
            }
        }
        return servers;
    }

    var maxPlayers = 5;
    var client1 = new VultrClient("test.io", -1, maxPlayers, 1, false);
    var lastError = undefined;
    client1.errorCallback = function (error) {
        lastError = error
    };
    client1.processServers(generateServerList({
        1: [
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        2: [
            [maxPlayers, 1, 0, 0],
            [0, 0, 0, 0]
        ],
        3: [
            [maxPlayers, 0, 1, maxPlayers],
            [0, 0, 0, 0]
        ],
        4: [
            [maxPlayers, 1, 1, maxPlayers],
            [1, 0, 0, 0]
        ],
        5: [
            [maxPlayers, 1, 1, maxPlayers],
            [1, 0, maxPlayers - 1, 0]
        ],
        6: [
            [maxPlayers, maxPlayers, maxPlayers, maxPlayers],
            [2, 3, 1, 4]
        ],
        7: [
            [maxPlayers, maxPlayers, maxPlayers, maxPlayers],
            [maxPlayers, maxPlayers, maxPlayers, maxPlayers]
        ],
    }));
    assert(client1.seekServer(1, false), [1, 0, 0]);
    assert(client1.seekServer(1, true), [1, 1, 3]);
    assert(client1.seekServer(2, false), [2, 0, 1]);
    assert(client1.seekServer(2, true), [2, 1, 3]);
    assert(client1.seekServer(3, false), [3, 0, 2]);
    assert(client1.seekServer(3, true), [3, 1, 3]);
    assert(client1.seekServer(4, false), [4, 0, 1]);
    assert(client1.seekServer(4, true), [4, 1, 3]);
    assert(client1.seekServer(5, false), [5, 1, 2]);
    assert(client1.seekServer(5, true), [5, 1, 3]);
    assert(client1.seekServer(6, false), [6, 1, 3]);
    assert(client1.seekServer(6, true), undefined);
    assert(client1.seekServer(7, false), undefined);
    assert(client1.seekServer(7, true), undefined);

    console.log("Tests passed.");
};

var concat = function (x, y) {
    return x.concat(y)
};

var flatMap = function (f, xs) {
    return xs.map(f).reduce(concat, []);
};

Array.prototype.flatMap = function (f) {
    return flatMap(f, this)
};

module.exports = VultrClient;