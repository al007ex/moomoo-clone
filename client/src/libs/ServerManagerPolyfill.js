"use strict";

var REGION_PREFIX = "polyfill:";

var STATIC_REGION_DEFS = [
    { key: "polyfill:frankfurt", slug: "frankfurt", name: "Frankfurt", latitude: 50.1109, longitude: 8.6821 },
    { key: "polyfill:london", slug: "london", name: "London", latitude: 51.5072, longitude: -0.1276 },
    { key: "polyfill:siliconvalley", slug: "siliconvalley", name: "Silicon Valley", latitude: 37.3875, longitude: -122.0575 },
    { key: "polyfill:miami", slug: "miami", name: "Miami", latitude: 25.7617, longitude: -80.1918 },
    { key: "polyfill:sydney", slug: "sydney", name: "Sydney", latitude: -33.8688, longitude: 151.2093 },
    { key: "polyfill:singapore", slug: "singapore", name: "Singapore", latitude: 1.3521, longitude: 103.8198 }
];

var STATIC_SERVER_DEFS = [
    { regionKey: "polyfill:frankfurt", code: "YZ", ping: 85, players: 0 },
    { regionKey: "polyfill:london", code: "XJ", ping: 154, players: 1 },
    { regionKey: "polyfill:siliconvalley", code: "AR", ping: 389, players: 0 },
    { regionKey: "polyfill:miami", code: "UY", ping: 299, players: 0 },
    { regionKey: "polyfill:sydney", code: "KN", ping: 1061, players: 0 },
    { regionKey: "polyfill:singapore", code: "ZB", ping: 417, players: 0 }
];

var STATIC_REGION_INFO = buildRegionInfo(STATIC_REGION_DEFS);
var REGION_SLUG_TO_KEY = buildSlugIndex(STATIC_REGION_DEFS);

/**
 * Tiny server manager polyfill that exposes a static list of fake servers. The
 * client code only needs a structure to render the server browser and a way to
 * initialise a connection, so we keep everything in-memory with zero network
 * calls or dynamic discovery.
 */
function ServerManagerPolyfill(baseUrl, devPort, lobbySize) {
    this.baseUrl = baseUrl;
    this.devPort = devPort;
    this.lobbySize = lobbySize || 50;

    this.debugLog = false;
    this.isPolyfill = true;

    this.servers = {};
    this.server = undefined;
    this.gameIndex = 0;

    this.callback = undefined;
    this.errorCallback = undefined;

    this.regionInfo = STATIC_REGION_INFO;
    this.regionSlugLookup = REGION_SLUG_TO_KEY;
}

ServerManagerPolyfill.prototype.start = function (callback, errorCallback) {
    this.callback = callback;
    this.errorCallback = errorCallback;

    this.servers = buildStaticServerMap(this.lobbySize);

    var regionKeys = Object.keys(this.servers);
    if (regionKeys.length === 0) {
        if (typeof this.errorCallback === "function") {
            this.errorCallback("No polyfill servers configured.");
        }
        return;
    }

    var firstRegion = regionKeys[0];
    var firstServer = this.servers[firstRegion] && this.servers[firstRegion][0];

    if (!firstServer) {
        if (typeof this.errorCallback === "function") {
            this.errorCallback("Polyfill server list is empty.");
        }
        return;
    }

    this.server = firstServer;
    this.gameIndex = 0;

    if (typeof this.callback === "function") {
        var _this = this;
        setTimeout(function () {
            _this.callback(
                _this.serverAddress(firstServer.ip),
                _this.serverPort(),
                _this.gameIndex
            );
        }, 0);
    }
};

ServerManagerPolyfill.prototype.getServerSnapshot = function () {
    return {
        servers: flattenServerMap(this.servers),
        regions: this.regionInfo
    };
};

ServerManagerPolyfill.prototype.processServers = function (serverList) {
    if (!Array.isArray(serverList)) {
        this.servers = {};
        return;
    }

    var serversByRegion = {};
    for (var i = 0; i < serverList.length; i++) {
        var normalised = normaliseServer(serverList[i], this.lobbySize);
        if (!normalised.games.length) continue;

        var regionKey = normalised.region;
        if (!serversByRegion.hasOwnProperty(regionKey)) {
            serversByRegion[regionKey] = [];
        }
        serversByRegion[regionKey].push(normalised);
    }

    for (var region in serversByRegion) {
        if (!serversByRegion.hasOwnProperty(region)) continue;
        serversByRegion[region].sort(function (a, b) {
            var aIndex = typeof a.index === "number" ? a.index : 0;
            var bIndex = typeof b.index === "number" ? b.index : 0;
            return aIndex - bIndex;
        });
    }

    this.servers = serversByRegion;

    if (this.server) {
        var replacement = findMatchingServer(this.servers, this.server);
        if (replacement) {
            this.server = replacement;
        }
    } else {
        var keys = Object.keys(this.servers);
        if (keys.length && this.servers[keys[0]].length) {
            this.server = this.servers[keys[0]][0];
        }
    }
};

ServerManagerPolyfill.prototype.serverAddress = function (ip) {
    if (ip === "127.0.0.1") {
        return window.location.hostname || "127.0.0.1";
    }
    return ip;
};

ServerManagerPolyfill.prototype.serverPort = function () {
    return this.devPort;
};

ServerManagerPolyfill.prototype.stripRegion = function (region) {
    return stripRegionKey(region);
};

ServerManagerPolyfill.prototype.generateHref = function (regionSlug, token, game, password) {
    var href = "/?server=" + regionSlug + ":" + token;
    var numericGame = parseInt(game, 10);
    if (!isNaN(numericGame) && numericGame > 0) {
        href += ":" + numericGame;
    }
    if (password) {
        href += "&password=" + encodeURIComponent(password);
    }
    return href;
};

ServerManagerPolyfill.prototype.switchServer = function (regionSlug, token, game, password) {
    var regionKey = this.regionSlugLookup[regionSlug] || (REGION_PREFIX + regionSlug);
    var serverList = this.servers[regionKey] || [];
    var target = findServerByToken(serverList, token);

    if (target) {
        this.server = target;
        var numericGame = parseInt(game, 10);
        this.gameIndex = isNaN(numericGame) ? 0 : numericGame;
    }

    this.switchingServers = true;
    window.location.href = this.generateHref(regionSlug, token, this.gameIndex, password);
};

ServerManagerPolyfill.prototype.log = function () {
    if (this.debugLog) {
        return console.log.apply(console, arguments);
    } else if (console.verbose) {
        return console.verbose.apply(console, arguments);
    }
};

function buildRegionInfo(defs) {
    var info = {};
    for (var i = 0; i < defs.length; i++) {
        var def = defs[i];
        info[def.key] = {
            name: def.name,
            latitude: def.latitude,
            longitude: def.longitude,
            slug: def.slug
        };
    }
    return info;
}

function buildSlugIndex(defs) {
    var index = {};
    for (var i = 0; i < defs.length; i++) {
        index[defs[i].slug] = defs[i].key;
    }
    return index;
}

function buildStaticServerMap(maxPlayers) {
    var map = {};
    var perRegionCounts = {};

    for (var i = 0; i < STATIC_SERVER_DEFS.length; i++) {
        var def = STATIC_SERVER_DEFS[i];
        var regionKey = def.regionKey;

        if (!perRegionCounts.hasOwnProperty(regionKey)) {
            perRegionCounts[regionKey] = 0;
        }

        var index = perRegionCounts[regionKey]++;
        var regionInfo = STATIC_REGION_INFO[regionKey];
        var server = {
            region: regionKey,
            index: index,
            slug: regionInfo ? regionInfo.slug : stripRegionKey(regionKey),
            code: def.code,
            ping: def.ping,
            ip: def.ip || "127.0.0.1",
            scheme: "polyfill",
            games: [
                {
                    playerCount: clampPlayers(def.players, maxPlayers),
                    isPrivate: false
                }
            ],
            lobbySpread: 1
        };

        if (!map.hasOwnProperty(regionKey)) {
            map[regionKey] = [];
        }
        map[regionKey].push(server);
    }

    return map;
}

function normaliseServer(server, maxPlayers) {
    var regionKey = typeof server.region === "string" ? server.region : "";
    var slug = typeof server.slug === "string" ? server.slug : stripRegionKey(regionKey);
    var code = server.code !== undefined ? String(server.code) : String(server.index || 0);

    var games = [];
    if (Array.isArray(server.games)) {
        for (var i = 0; i < server.games.length; i++) {
            var game = server.games[i];
            if (!game) continue;
            var count = clampPlayers(game.playerCount, maxPlayers);
            games.push({
                playerCount: count,
                isPrivate: !!game.isPrivate
            });
        }
    }

    return {
        region: regionKey,
        index: typeof server.index === "number" ? server.index : parseInt(server.index, 10) || 0,
        slug: slug,
        code: code,
        ping: typeof server.ping === "number" ? Math.max(0, Math.round(server.ping)) : undefined,
        ip: server.ip || "127.0.0.1",
        scheme: server.scheme || "polyfill",
        games: games,
        lobbySpread: server.lobbySpread || 1
    };
}

function clampPlayers(count, maxPlayers) {
    var numeric = typeof count === "number" ? count : parseInt(count, 10);
    if (isNaN(numeric)) numeric = 0;
    numeric = Math.max(0, numeric);
    if (typeof maxPlayers === "number" && maxPlayers >= 0) {
        numeric = Math.min(numeric, maxPlayers);
    }
    return Math.round(numeric);
}

function flattenServerMap(serverMap) {
    var list = [];
    for (var region in serverMap) {
        if (!serverMap.hasOwnProperty(region)) continue;
        var servers = serverMap[region];
        for (var i = 0; i < servers.length; i++) {
            list.push(cloneServer(servers[i]));
        }
    }
    return list;
}

function cloneServer(server) {
    return {
        region: server.region,
        index: server.index,
        slug: server.slug,
        code: server.code,
        ping: server.ping,
        ip: server.ip,
        scheme: server.scheme,
        games: server.games.map(function (game) {
            return {
                playerCount: game.playerCount,
                isPrivate: game.isPrivate
            };
        }),
        lobbySpread: server.lobbySpread
    };
}

function findMatchingServer(serversByRegion, previousServer) {
    var regionServers = serversByRegion[previousServer.region] || [];
    var token = previousServer.code !== undefined ? String(previousServer.code) : String(previousServer.index);
    for (var i = 0; i < regionServers.length; i++) {
        var candidate = regionServers[i];
        var candidateToken = candidate.code !== undefined ? String(candidate.code) : String(candidate.index);
        if (candidateToken === token) {
            return candidate;
        }
    }
    return regionServers[0];
}

function findServerByToken(serverList, token) {
    if (!Array.isArray(serverList) || serverList.length === 0) return undefined;
    var desired = token !== undefined ? String(token) : undefined;
    if (desired === undefined || desired === "") {
        return serverList[0];
    }

    for (var i = 0; i < serverList.length; i++) {
        var candidate = serverList[i];
        var candidateToken = candidate.code !== undefined ? String(candidate.code) : String(candidate.index);
        if (candidateToken === desired) {
            return candidate;
        }
    }

    return serverList[0];
}

function stripRegionKey(region) {
    if (typeof region !== "string") return region;
    if (region.indexOf(REGION_PREFIX) === 0) {
        return region.slice(REGION_PREFIX.length);
    }
    return region;
}

module.exports = ServerManagerPolyfill;
