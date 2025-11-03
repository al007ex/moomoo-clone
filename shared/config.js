"use strict";

var hasProcess = typeof process === "object" && process !== null;
var hasArgv = hasProcess && Array.isArray(process.argv);

function resolveMaxPlayers() {
    if (hasArgv && process.argv.indexOf("--largeserver") !== -1) {
        return 80;
    }
    return 10;
}

var config = {};

// RENDER:
config.maxScreenWidth = 1920;
config.maxScreenHeight = 1080;

// SERVER:
config.serverUpdateRate = 9;
config.maxPlayers = resolveMaxPlayers();
config.maxPlayersHard = config.maxPlayers + 10;
config.collisionDepth = 6;
config.minimapRate = 3000;

// COLLISIONS:
config.colGrid = 10;

// CLIENT:
config.clientSendRate = 5;

// UI:
config.healthBarWidth = 50;
config.healthBarPad = 4.5;
config.iconPadding = 15;
config.iconPad = 0.9;
config.deathFadeout = 3000;
config.crownIconScale = 60;
config.crownPad = 35;

// CHAT:
config.chatCountdown = 3000;
config.chatCooldown = 500;

// SANDBOX:
config.isSandbox = false;

// PLAYER:
config.maxAge = 100;
config.gatherAngle = Math.PI / 2.6;
config.gatherWiggle = 10;
config.hitReturnRatio = 0.25;
config.hitAngle = Math.PI / 2;
config.playerScale = 35;
config.playerSpeed = 0.0016;
config.playerDecel = 0.993;
config.nameY = 34;

// CUSTOMIZATION:
config.skinColors = ["#bf8f54", "#cbb091", "#896c4b", "#fadadc", "#ececec", "#c37373", "#4c4c4c", "#ecaff7", "#738cc3", "#8bc373"];

// ANIMALS:
config.animalCount = 40;
config.aiTurnRandom = 0.06;
config.cowNames = ["Sid", "Steph", "Bmoe", "Romn", "Jononthecool", "Fiona", "Vince", "Nathan", "Nick", "Flappy", "Ronald", "Otis", "Pepe", "Mc Donald", "Theo", "Fabz", "Oliver", "Jeff", "Jimmy", "Helena", "Reaper", "Ben", "Alan", "Naomi", "XYZ", "Clever", "Jeremy", "Mike", "Destined", "Stallion", "Allison", "Meaty", "Sophia", "Vaja", "Joey", "Pendy", "Murdoch", "Theo", "Jared", "July", "Sonia", "Mel", "Dexter", "Quinn", "Milky"];

// WEAPONS:
config.shieldAngle = Math.PI / 3;
config.weaponVariants = [{
    id: 0,
    src: "",
    xp: 0,
    val: 1
}, {
    id: 1,
    src: "_g",
    xp: 3000,
    val: 1.1
}, {
    id: 2,
    src: "_d",
    xp: 7000,
    val: 1.18
}, {
    id: 3,
    src: "_r",
    poison: true,
    xp: 12000,
    val: 1.18
}, {
    id: 4,
    src: "_e",
    poison: true,
    xp: 24000,
    val: 1.18
}];

config.fetchVariant = function (player) {
    var tmpXP = player.weaponXP[player.weaponIndex] || 0;
    for (var i = config.weaponVariants.length - 1; i >= 0; --i) {
        if (tmpXP >= config.weaponVariants[i].xp) {
            return config.weaponVariants[i];
        }
    }
};

// NATURE:
config.resourceTypes = ["wood", "food", "stone", "points"];
config.areaCount = 7;
config.treesPerArea = 30;
config.bushesPerArea = 12;
config.totalRocks = 120;
config.goldOres = 7;
config.riverWidth = 724;
config.riverPadding = 114;
config.waterCurrent = 0.0011;
config.waveSpeed = 0.0001;
config.waveMax = 1.3;
config.treeScales = [150, 160, 165, 175];
config.bushScales = [80, 85, 95];
config.rockScales = [80, 85, 90];

// BIOME DATA:
config.snowBiomeTop = 2400;
config.snowSpeed = 0.75;

// DATA:
config.maxNameLength = 15;

// MAP:
config.mapScale = 14400;
config.mapPingScale = 40;
config.mapPingTime = 2200;

module.exports = config;
