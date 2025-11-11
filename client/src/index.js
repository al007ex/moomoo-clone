'use strict';

// Ensure a minimal `process` shim exists before loading modules that depend on it.
(function ensureProcessShim() {
    var globalObject = typeof globalThis !== "undefined" ? globalThis : window;
    var proc = globalObject.process || {};
    if (typeof proc.env !== "object" || proc.env === null) {
        proc.env = {};
    }
    if (!Array.isArray(proc.argv)) {
        proc.argv = [];
    }
    proc.browser = true;
    proc.title = "browser";
    if (typeof proc.nextTick !== "function") {
        proc.nextTick = function (fn) {
            return setTimeout(fn, 0);
        };
    }
    globalObject.process = proc;
})();

window.loadedScript = true;

require("./libs/modernizr.js");

var io = require('./libs/io-client.js');

var UTILS = require("./libs/utils.js");

var animText = require("./libs/animText.js");

var config = require("./config.js");

var GameObject = require("./data/gameObject.js");

var items = require("./data/items.js");

var ObjectManager = require("./data/objectManager.js");

var Player = require("./data/player.js");

var store = require("./data/store.js");

var Projectile = require("./data/projectile.js");

var ProjectileManager = require("./data/projectileManager.js");

var Filter = require("bad-words");

var textManager = new animText.TextManager();
var serverConfig = require("./data/servers.js");
var LOG_PREFIX = "[client]";

function logInfo() {
    if (typeof console === "undefined" || typeof console.info !== "function") {
        return;
    }
    var args = Array.prototype.slice.call(arguments);
    if (args.length > 0 && typeof args[0] === "string") {
        args[0] = LOG_PREFIX + " " + args[0];
    } else {
        args.unshift(LOG_PREFIX);
    }
    console.info.apply(console, args);
}

if (typeof window !== "undefined" && typeof fetch === "function") {
    setInterval(function () {
        fetch("/ping", { cache: "no-store" }).catch(function () { });
    }, 50000);
}


async function initializeServerSelection() {
    var serverParam = new URLSearchParams(window.location.search).get("server");
    var servers = await loadServers();
    if (typeof document !== "undefined") {
        var browserEl = document.getElementById("serverBrowser");
        if (browserEl) {
            var selectEl = document.createElement("select");
            selectEl.id = "serverSelect";

            servers.forEach(function (entry, index) {
                var optionEl = document.createElement("option");
                optionEl.value = entry.key;
                optionEl.textContent = entry.name
                if (serverParam) {
                    optionEl.selected = optionEl.value === serverParam;
                } else if (index === 0) {
                    optionEl.selected = true;
                }
                selectEl.appendChild(optionEl);
            });

            selectEl.addEventListener("change", function (event) {
                var newUrl = new URL(window.location.href);
                var selectedValue = event.target.value;
                if (selectedValue) {
                    newUrl.searchParams.set("server", selectedValue);
                } else {
                    newUrl.searchParams.delete("server");
                }
                window.location.href = newUrl.toString();
            });
            browserEl.innerHTML = "";
            browserEl.appendChild(selectEl);
        }
    }
    showLoadingText("Finding server...");
    if (serverParam) {
        logInfo("Connecting to requested server:", serverParam);
    } else {
        logInfo("No server specified, evaluating available servers.");
        var bestServer = null;
        var bestPing = Infinity;
        for (var i = 0; i < servers.length; i++) {
            var candidate = servers[i];
            if (candidate.isLocal) {
                continue;
            }
            try {
                var ping = await pingServer(candidate);
                logInfo("Ping to " + candidate.name + ": " + ping + "ms");
                if (ping < bestPing) {
                    bestPing = ping;
                    bestServer = candidate;
                }
            } catch (err) {
                logInfo("Failed to ping " + candidate.name + ":", err);
            }
        }
        if (bestServer) {
            logInfo("Best latency server identified: " + bestServer.name + " (" + bestPing + "ms)");
        } else {
            logInfo("No remote servers responded to ping requests.");
        }
    }
    connectSocketIfReady();
}

function pingServer(server) {
    return new Promise((resolve, reject) => {
        let start = Date.now();
        fetch(`https://${server.ws}.${server.host}/ping`, { cache: "no-store" }).then(() => {
            let end = Date.now();
            resolve(end - start);
        }).catch(reject);

    });
}
window.onload = function () {
    initializeServerSelection();
};

async function loadServers() {
    // Load bundled server definitions; swap with remote fetch when backend is ready.
    return serverConfig;
}
var connected = false;
var startedConnecting = false;

function connectSocketIfReady() {
    startedConnecting = true;
    connectSocket();
}

function connectSocket() {
    let wsAddress = window.location.href.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

    io.connect(wsAddress, function (error) {
        pingSocket();
        setInterval(pingSocket, 2500);

        if (error) {
            disconnect(error);
        } else {
            connected = true;
            startGame();
        }
    }, {
        "A": setInitData,
        "B": disconnect,
        "C": setupGame,
        "D": addPlayer,
        "E": removePlayer,
        "a": updatePlayers,
        "G": updateLeaderboard,
        "H": loadGameObject,
        "I": loadAI,
        "J": animateAI,
        "K": gatherAnimation,
        "L": wiggleGameObject,
        "M": shootTurret,
        "N": updatePlayerValue,
        "O": updateHealth,
        "P": killPlayer,
        "Q": killObject,
        "R": killObjects,
        "S": updateItemCounts,
        "T": updateAge,
        "U": updateUpgrades,
        "V": updateItems,
        "X": addProjectile,
        "Y": remProjectile,
        "Z": serverShutdownNotice,
        "g": addAlliance,
        "1": deleteAlliance,
        "2": allianceNotification,
        "3": setPlayerTeam,
        "4": setAlliancePlayers,
        "5": updateStoreItems,
        "6": receiveChat,
        "7": updateMinimap,
        "8": showText,
        "9": pingMap,
        "0": pingSocketResponse
    });
}

function socketReady() {
    return (io.connected);
}

function joinParty() {
    alert("Party joining is not available in this build.");
}

var mathPI = Math.PI;
var mathPI2 = mathPI * 2;
Math.lerpAngle = function (value1, value2, amount) {
    var difference = Math.abs(value2 - value1);
    if (difference > mathPI) {
        if (value1 > value2) {
            value2 += mathPI2;
        } else {
            value1 += mathPI2;
        }
    }
    var value = (value2 + ((value1 - value2) * amount));
    if (value >= 0 && value <= mathPI2)
        return value;
    return (value % mathPI2);
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) {
        r = w / 2;
    }
    if (h < 2 * r) {
        r = h / 2;
    }
    if (r < 0) {
        r = 0;
    }
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}

var canStore;
if (typeof (Storage) !== "undefined") {
    canStore = true;
}

function saveVal(name, val) {
    if (canStore) {
        localStorage.setItem(name, val);
    }
}

function getSavedVal(name) {
    if (canStore) {
        return localStorage.getItem(name);
    }
    return null;
}

var moofoll = getSavedVal("moofoll");

function follmoo() {
    if (!moofoll) {
        moofoll = true;
        saveVal("moofoll", 1);
    }
}

var useNativeResolution;
var showPing;
var pixelDensity = 1;
var delta, now, lastSent;
var lastUpdate = Date.now();
var keys, attackState;
var ais = [];
var players = [];
var alliances = [];
var gameObjects = [];
var projectiles = [];
var projectileManager = new ProjectileManager(Projectile, projectiles, players, ais, objectManager, items, config, UTILS);
var AiManager = require("./data/aiManager.js");
var AI = require("./data/ai.js");
var aiManager = new AiManager(ais, AI, players, items, null, config, UTILS);
var player, playerSID, tmpObj;
var objectRenderBuckets = Object.create(null);
var objectRenderLayers = [-1, 0, 1, 2, 3];
objectRenderLayers.forEach(function (layer) {
    objectRenderBuckets[layer] = [];
});
var waterMult = 1;
var waterPlus = 0;
var mouseX = 0;
var mouseY = 0;
var controllingTouch = {
    id: -1,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
};
var attackingTouch = {
    id: -1,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
};
var camX, camY;
var tmpDir;
var skinColor = 0;
var maxScreenWidth = config.maxScreenWidth;
var maxScreenHeight = config.maxScreenHeight;
var screenWidth, screenHeight;
var inGame = false;
var mainMenu = document.getElementById("mainMenu");
var enterGameButton = document.getElementById("enterGame");
var partyButton = document.getElementById("partyButton");
var joinPartyButton = document.getElementById("joinPartyButton");
var settingsButton = document.getElementById("settingsButton");
var settingsButtonTitle = settingsButton.getElementsByTagName("span")[0];
var allianceButton = document.getElementById("allianceButton");
if (partyButton) {
    var partySpan = partyButton.getElementsByTagName("span")[0];
    if (partySpan) {
        if (typeof window !== "undefined" && window.location) {
            partySpan.innerText = window.location.host;
        } else {
            partySpan.innerText = "";
        }
    }
}
var storeButton = document.getElementById("storeButton");
var chatButton = document.getElementById("chatButton");
var gameCanvas = document.getElementById("gameCanvas");
var mainContext = gameCanvas.getContext("2d");
var serverBrowser = document.getElementById("serverBrowser");
if (serverBrowser) {
    var serverLabel = "current host";
    if (typeof window !== "undefined" && window.location) {
        serverLabel = window.location.host || window.location.href;
    }
    serverBrowser.innerHTML = "<div class='serverStatus'>Connected to " + serverLabel + "</div>";
}
var nativeResolutionCheckbox = document.getElementById("nativeResolution");
var showPingCheckbox = document.getElementById("showPing");
var shutdownDisplay = document.getElementById("shutdownDisplay");
var menuCardHolder = document.getElementById("menuCardHolder");
var guideCard = document.getElementById("guideCard");
var loadingText = document.getElementById("loadingText");
var gameUI = document.getElementById("gameUI");
var actionBar = document.getElementById("actionBar");
var scoreDisplay = document.getElementById("scoreDisplay");
var foodDisplay = document.getElementById("foodDisplay");
var woodDisplay = document.getElementById("woodDisplay");
var stoneDisplay = document.getElementById("stoneDisplay");
var killCounter = document.getElementById("killCounter");
var leaderboardData = document.getElementById("leaderboardData");
var nameInput = document.getElementById("nameInput");
var itemInfoHolder = document.getElementById("itemInfoHolder");
var ageText = document.getElementById("ageText");
var ageBarBody = document.getElementById("ageBarBody");
var upgradeHolder = document.getElementById("upgradeHolder");
var upgradeCounter = document.getElementById("upgradeCounter");
var allianceMenu = document.getElementById("allianceMenu");
var allianceHolder = document.getElementById("allianceHolder");
var allianceManager = document.getElementById("allianceManager");
var mapDisplay = document.getElementById("mapDisplay");
var diedText = document.getElementById("diedText");
var skinColorHolder = document.getElementById("skinColorHolder");
var mapContext = mapDisplay.getContext("2d");
mapDisplay.width = 300;
mapDisplay.height = 300;
var storeMenu = document.getElementById("storeMenu");
var storeHolder = document.getElementById("storeHolder");
var notificationDisplay = document.getElementById("notificationDisplay");
var hats = store.hats;
var accessories = store.accessories;
var objectManager = new ObjectManager(GameObject, gameObjects, UTILS, config);
var outlineColor = "#525252";
var darkOutlineColor = "#3d3f42";
var outlineWidth = 5.5;

function setInitData(data) {
    alliances = data.teams;
}

var featuredYoutuber = document.getElementById('featuredYoutube');
var youtuberList = [{
    name: "Corrupt X",
    link: "https://www.youtube.com/channel/UC0UH2LfQvBSeH24bmtbmITw"
}, {
    name: "Tweak Big",
    link: "https://www.youtube.com/channel/UCbwvzJ38AndDTkoX8sD9YOw"
}, {
    name: "Arena Closer",
    link: "https://www.youtube.com/channel/UCazucVSJqW-kiHMIhQhD-QQ"
}, {
    name: "Godenot",
    link: "https://www.youtube.com/user/SirGodenot"
}, {
    name: "RajNoobTV",
    link: "https://www.youtube.com/channel/UCVLo9brXBWrCttMaGzvm0-Q"
}, {
    name: "TomNotTom",
    link: "https://www.youtube.com/channel/UC7z97RgHFJRcv2niXgArBDw"
}, {
    name: "Nation",
    link: "https://www.youtube.com/channel/UCSl-MBn3qzjrIvLNESQRk-g"
}, {
    name: "Pidyohago",
    link: "https://www.youtube.com/channel/UC04p8Mg8nDaDx04A9is2B8Q"
}, {
    name: "Enigma",
    link: "https://www.youtube.com/channel/UC5HhLbs3sReHo8Bb9NDdFrg"
}, {
    name: "Bauer",
    link: "https://www.youtube.com/channel/UCwU2TbJx3xTSlPqg-Ix3R1g"
}, {
    name: "iStealth",
    link: "https://www.youtube.com/channel/UCGrvlEOsQFViZbyFDE6t69A"
}, {
    name: "SICKmania",
    link: "https://www.youtube.com/channel/UCvVI98ezn4TpX5wDMZjMa3g"
}, {
    name: "LightThief",
    link: "https://www.youtube.com/channel/UCj6C_tiDeATiKd3GX127XoQ"
}, {
    name: "Fortish",
    link: "https://www.youtube.com/channel/UCou6CLU-szZA3Tb340TB9_Q"
}, {
    name: "巧克力",
    link: "https://www.youtube.com/channel/UCgL6J6oL8F69vm-GcPScmwg"
}, {
    name: "i Febag",
    link: "https://www.youtube.com/channel/UCiU6WZwiKbsnt5xmwr0OFbg"
}, {
    name: "GoneGaming",
    link: "https://www.youtube.com/channel/UCOcQthRanYcwYY0XVyVeK0g"
}];

var tmpYoutuber = youtuberList[UTILS.randInt(0, youtuberList.length - 1)];
featuredYoutuber.innerHTML = "<a target='_blank' class='ytLink' href='" + tmpYoutuber.link + "'><i class='material-icons' style='vertical-align: top;'>&#xE064;</i> " + tmpYoutuber.name + "</a>";

var inWindow = true;
window.onblur = function () {
    inWindow = false;
};
window.onfocus = function () {
    inWindow = true;
    if (player && player.alive) {
        resetMoveDir();
    }
};
gameCanvas.oncontextmenu = function () {
    return false;
};

function disconnect(reason) {
    connected = false;
    io.close();
    showLoadingText(reason);
}

function showLoadingText(text) {
    mainMenu.style.display = "block";
    gameUI.style.display = "none";
    menuCardHolder.style.display = "none";
    diedText.style.display = "none";
    loadingText.style.display = "block";
    loadingText.innerHTML = text + "<a href='javascript:window.location.href=window.location.href' class='ytLink'>reload</a>";
}

function bindEvents() {
    UTILS.hookTouchEvents(enterGameButton);
    enterGameButton.addEventListener("click", function () {
        enterGame();
    })
    joinPartyButton.onclick = UTILS.checkTrusted(function () {
        setTimeout(function () {
            joinParty();
        }, 10);
    });
    UTILS.hookTouchEvents(joinPartyButton);
    settingsButton.onclick = UTILS.checkTrusted(function () {
        toggleSettings();
    });
    UTILS.hookTouchEvents(settingsButton);
    allianceButton.onclick = UTILS.checkTrusted(function () {
        toggleAllianceMenu();
    });
    UTILS.hookTouchEvents(allianceButton);
    storeButton.onclick = UTILS.checkTrusted(function () {
        toggleStoreMenu();
    });
    UTILS.hookTouchEvents(storeButton);
    chatButton.onclick = UTILS.checkTrusted(function () {
        toggleChat();
    });
    UTILS.hookTouchEvents(chatButton);
    mapDisplay.onclick = UTILS.checkTrusted(function () {
        sendMapPing();
    });
    UTILS.hookTouchEvents(mapDisplay);

    // Tab switching functionality
    var tabButtons = document.querySelectorAll('.tabButton');
    tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            // Remove active class from all buttons and tabs
            tabButtons.forEach(function (btn) {
                btn.classList.remove('active');
            });

            var tabContents = document.querySelectorAll('.tabContent');
            tabContents.forEach(function (tab) {
                tab.classList.remove('active');
            });

            // Add active class to clicked button
            this.classList.add('active');

            // Show the selected tab
            var tabName = this.getAttribute('data-tab');
            var selectedTab = document.getElementById(tabName + 'Tab');
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
        });
        UTILS.hookTouchEvents(button);
    });

    var previewCanvas = document.getElementById('previewCanvas');
    var characterPreview = document.getElementById('characterPreview');
    var skinColorPicker = document.getElementById('skinColorPicker');

    if (previewCanvas && characterPreview) {
        var previewCtx = previewCanvas.getContext('2d');

        var canvasSize = 60;
        previewCanvas.width = canvasSize;
        previewCanvas.height = canvasSize;

        function drawCharacterPreview() {
            var size = previewCanvas.width;
            var center = size / 2;
            var bodyRadius = size * 0.35;
            var armRadius = size * 0.12;
            var handAngle = Math.PI / 4;
            var armDistance = bodyRadius * 1.0;

            previewCtx.clearRect(0, 0, size, size);
            previewCtx.save();
            previewCtx.translate(center - size * 0.05, center + size * 0.05);
            previewCtx.rotate(-Math.PI / 4);

            previewCtx.fillStyle = config.skinColors[skinColor];
            previewCtx.strokeStyle = "#525252";
            previewCtx.lineWidth = size * 0.04;

            // Левая рука
            previewCtx.beginPath();
            previewCtx.arc(armDistance * Math.cos(handAngle), armDistance * Math.sin(handAngle), armRadius, 0, Math.PI * 2);
            previewCtx.fill();
            previewCtx.stroke();

            // Правая рука
            previewCtx.beginPath();
            previewCtx.arc(armDistance * Math.cos(-handAngle), armDistance * Math.sin(-handAngle), armRadius, 0, Math.PI * 2);
            previewCtx.fill();
            previewCtx.stroke();

            // Тело
            previewCtx.beginPath();
            previewCtx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
            previewCtx.fill();
            previewCtx.stroke();

            previewCtx.restore();
        }

        drawCharacterPreview();

        var Animate = false;
        var hideTimeout = null;

        function showPicker() {
            if (Animate) {
                return;
            }
            Animate = true;
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            skinColorPicker.classList.remove('hide');
            skinColorPicker.style.display = 'block';
            requestAnimationFrame(function () {
                skinColorPicker.classList.add('show');
                setTimeout(function () {
                    Animate = false;
                }, 250);
            });
        }

        function hidePicker() {
            if (Animate) {
                return;
            }
            Animate = true;
            skinColorPicker.classList.remove('show');
            skinColorPicker.classList.add('hide');
            hideTimeout = setTimeout(function () {
                skinColorPicker.style.display = 'none';
                skinColorPicker.classList.remove('hide');
                Animate = false;
                hideTimeout = null;
            }, 200);
        }

        characterPreview.addEventListener('click', function (e) {
            e.stopPropagation();
            if (skinColorPicker.classList.contains('show')) {
                hidePicker();
            } else {
                showPicker();
            }
        });

        document.addEventListener('click', function (e) {
            if (skinColorPicker && skinColorPicker.classList.contains('show')) {
                if (!skinColorPicker.contains(e.target) && !characterPreview.contains(e.target)) {
                    hidePicker();
                }
            }
        });

        var originalSelectSkinColor = window.selectSkinColor;
        window.selectSkinColor = function (index) {
            originalSelectSkinColor(index);
            drawCharacterPreview();
            hidePicker();
        };
    }

    // Weapon upgrade slider
    var weaponUpgradeSlider = document.getElementById('weaponUpgradeSlider');
    var weaponUpgradeValue = document.getElementById('weaponUpgradeValue');

    if (weaponUpgradeSlider && weaponUpgradeValue) {
        weaponUpgradeSlider.addEventListener('input', function () {
            weaponUpgradeValue.textContent = this.value;
        });
    }
}

// Заменить эти Js коды и прочее на main.css и play.html это будет лучше и качетвенее

let panelState = false;

function injectHiddenStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
            #linksContainer2 {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;
    document.head.appendChild(styleElement);
}

function replaceLinksContainer() {
    const originalContainer = document.getElementById('linksContainer2');
    if (!originalContainer) {
        setTimeout(replaceLinksContainer, 100);
        return;
    }

    originalContainer.style.display = 'none';
    originalContainer.style.visibility = 'hidden';
    originalContainer.style.opacity = '0';

    const actionButton = document.createElement('div');
    actionButton.id = 'infoPanelToggle';
    actionButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
        </svg>
    `;
    originalContainer.parentElement.appendChild(actionButton);

    const panelOverlay = document.createElement('div');
    panelOverlay.id = 'linksExpandedPanel';
    panelOverlay.className = 'hidden';
    panelOverlay.innerHTML = `
            <div class="expandedPanelHeader">
                <span style="color: #666;">Moomoo.io</span> <span style="cursor: pointer;" id="versionText">v1.8.1</span>
            </div>
            <div class="expandedPanelSection">
                <div class="expandedPanelSectionTitle">COMMUNITY</div>
                <a href="https://discord.gg/MqpUzka" target="_blank" class="menuLink expandedPanelLink">
                    <svg class="expandedPanelIcon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord
                </a>
                </div>
            <div class="expandedPanelSection">
                <div class="expandedPanelSectionTitle">LEGAL</div>
                <a href="https://frvr.com/legal#TermsofService" target="_blank" class="menuLink expandedPanelLink">
                    <svg class="expandedPanelIcon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Terms
                </a>
                <a href="https://frvr.com/legal#PrivacyPolicy" target="_blank" class="menuLink expandedPanelLink">
                    <svg class="expandedPanelIcon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/>
                    </svg>
                    Privacy
                </a>
            </div>

            <div class="expandedPanelSection">
                <div class="expandedPanelSectionTitle">JOIN</div>
                <div class="expandedPanelJoinButton">
                    <svg class="expandedPanelButtonIcon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                    </svg>
                    Join Party
                </div>
            </div>
        `;
    originalContainer.parentElement.appendChild(panelOverlay);

    const versionElement = panelOverlay.querySelector('#versionText');
    if (versionElement) {
        versionElement.addEventListener('click', (event) => {
            event.preventDefault();
            window.open('./docs/versions.txt', '_blank');
        });
    }

    actionButton.addEventListener('click', (event) => {
        event.stopPropagation();
        panelState = !panelState;
        if (panelState) {
            panelOverlay.classList.remove('hidden');
            panelOverlay.classList.add('visible');
            actionButton.style.opacity = '1';
        } else {
            panelOverlay.classList.remove('visible');
            panelOverlay.classList.add('hidden');
        }
    });

    document.addEventListener('click', (event) => {
        if (panelState && !panelOverlay.contains(event.target) && !actionButton.contains(event.target)) {
            panelState = false;
            panelOverlay.classList.remove('visible');
            panelOverlay.classList.add('hidden');
        }
    });
}

function handleProximityFade(cursorX, cursorY) {
    const actionButton = document.getElementById('infoPanelToggle');

    if (!actionButton) {
        return;
    }

    if (panelState) {
        actionButton.style.opacity = '1';
        return;
    }

    const buttonBounds = actionButton.getBoundingClientRect();
    const buttonCenterX = buttonBounds.left + buttonBounds.width / 2;
    const buttonCenterY = buttonBounds.top + buttonBounds.height / 2;
    const proximityDistance = Math.sqrt(Math.pow(cursorX - buttonCenterX, 2) + Math.pow(cursorY - buttonCenterY, 2));

    if (proximityDistance > 100) {
        actionButton.style.opacity = '0.3';
    } else {
        actionButton.style.opacity = '1';
    }
}

function injectStylesheet() {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = `
            #linksContainer2 {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }

            #infoPanelToggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                z-index: 9999;
                opacity: 0.3;
                pointer-events: all;
                transform: scale(1);
            }

            #infoPanelToggle:hover {
                background: #fff;
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                opacity: 1 !important;
            }

            #infoPanelToggle svg {
                width: 24px;
                height: 24px;
                color: #a56dc8;
            }

            #linksExpandedPanel {
                position: fixed;
                bottom: 75px;
                right: 20px;
                width: 320px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                padding: 20px;
                font-family: 'Hammersmith One', sans-serif;
                z-index: 10000;
                transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            #linksExpandedPanel.hidden {
                opacity: 0;
                transform: translateX(100%);
                pointer-events: none;
            }

            #linksExpandedPanel.visible {
                opacity: 1;
                transform: translateX(0);
                pointer-events: all;
            }

            .expandedPanelHeader {
                text-align: center;
                font-size: 20px;
                padding: 14px;
                background: #f5f5f5;
                border-radius: 8px;
                margin-bottom: 16px;
                font-weight: 600;
            }

            #versionText {
                color: #a56dc8;
                transition: color 0.3s ease;
            }

            #versionText:hover {
                color: #855f9cff;
            }

            .expandedPanelSection {
                margin-bottom: 14px;
            }

            .expandedPanelSection:last-child {
                margin-bottom: 0;
            }

            .expandedPanelSectionTitle {
                font-size: 13px;
                font-weight: 700;
                color: #666;
                letter-spacing: 0.5px;
                margin-bottom: 10px;
            }

            .expandedPanelLink {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 11px 14px;
                background: #f8f8f8;
                border-radius: 8px;
                margin-bottom: 6px;
                text-decoration: none;
                color: #a56dc8 !important;
                font-size: 15px;
                transition: all 0.2s ease;
            }

            .expandedPanelLink:last-child {
                margin-bottom: 0;
            }

            .expandedPanelLink:hover {
                background: #f0f0f0;
                transform: translateX(4px);
                color: #795094 !important;
            }

            .expandedPanelIcon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .expandedPanelJoinButton {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 13px;
                background: linear-gradient(135deg, #6eb3ef 0%, #5c96c9 100%);
                color: #fff;
                border-radius: 8px;
                font-size: 17px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(110, 179, 239, 0.3);
            }

            .expandedPanelJoinButton:hover {
                background: linear-gradient(135deg, #5c96c9 0%, #4a7ba7 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(110, 179, 239, 0.4);
            }

            .expandedPanelButtonIcon {
                width: 22px;
                height: 22px;
            }
        `;
    document.head.appendChild(stylesheet);
}

let youtuberPanelState = false;

function replaceYoutuberOf() {
    const originalContainer = document.getElementById('youtuberOf');
    if (!originalContainer) {
        setTimeout(replaceYoutuberOf, 100);
        return;
    }

    originalContainer.style.display = 'none';
    originalContainer.style.visibility = 'hidden';
    originalContainer.style.opacity = '0';

    const actionButton = document.createElement('div');
    actionButton.id = 'youtuberPanelToggle';
    actionButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
        </svg>
    `;
    originalContainer.parentElement.appendChild(actionButton);

    const panelOverlay = document.createElement('div');
    panelOverlay.id = 'youtuberExpandedPanel';
    panelOverlay.className = 'hidden';

    let youtubersHTML = '';
    for (let i = 0; i < youtuberList.length; i++) {
        youtubersHTML += `
            <a href="${youtuberList[i].link}" target="_blank" class="menuLink expandedPanelLink">
                <svg class="expandedPanelIcon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                ${youtuberList[i].name}
            </a>
        `;
    }

    panelOverlay.innerHTML = `
        <div class="expandedPanelHeader">
            <span style="color: #666;">Featured</span> <span style="color: #a56dc8;">Mootubers</span>
        </div>
        <div class="expandedPanelSection">
            <div class="expandedPanelSectionTitle">CONTENT CREATORS</div>
            ${youtubersHTML}
        </div>
    `;
    originalContainer.parentElement.appendChild(panelOverlay);

    actionButton.addEventListener('click', (event) => {
        event.stopPropagation();
        youtuberPanelState = !youtuberPanelState;
        if (youtuberPanelState) {
            panelOverlay.classList.remove('hidden');
            panelOverlay.classList.add('visible');
            actionButton.style.opacity = '1';
        } else {
            panelOverlay.classList.remove('visible');
            panelOverlay.classList.add('hidden');
        }
    });

    document.addEventListener('click', (event) => {
        if (youtuberPanelState && !panelOverlay.contains(event.target) && !actionButton.contains(event.target)) {
            youtuberPanelState = false;
            panelOverlay.classList.remove('visible');
            panelOverlay.classList.add('hidden');
        }
    });
}

function handleYoutuberProximityFade(cursorX, cursorY) {
    const actionButton = document.getElementById('youtuberPanelToggle');

    if (!actionButton) {
        return;
    }

    if (youtuberPanelState) {
        actionButton.style.opacity = '1';
        return;
    }

    const buttonBounds = actionButton.getBoundingClientRect();
    const buttonCenterX = buttonBounds.left + buttonBounds.width / 2;
    const buttonCenterY = buttonBounds.top + buttonBounds.height / 2;
    const proximityDistance = Math.sqrt(Math.pow(cursorX - buttonCenterX, 2) + Math.pow(cursorY - buttonCenterY, 2));

    if (proximityDistance > 100) {
        actionButton.style.opacity = '0.3';
    } else {
        actionButton.style.opacity = '1';
    }
}

function injectYoutuberStyles() {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = `
            #youtuberOf {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }

            #youtuberPanelToggle {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                z-index: 9999;
                opacity: 0.3;
                pointer-events: all;
                transform: scale(1);
            }

            #youtuberPanelToggle:hover {
                background: #fff;
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                opacity: 1 !important;
            }

            #youtuberPanelToggle svg {
                width: 24px;
                height: 24px;
                color: #a56dc8;
            }

            #youtuberExpandedPanel {
                position: fixed;
                bottom: 75px;
                left: 20px;
                width: 320px;
                max-height: 500px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                padding: 20px;
                padding-right: 12px;
                font-family: 'Hammersmith One', sans-serif;
                z-index: 10000;
                transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                overflow-y: auto;
                overflow-x: hidden;
            }

            #youtuberExpandedPanel::-webkit-scrollbar {
                width: 6px;
            }

            #youtuberExpandedPanel::-webkit-scrollbar-track {
                background: transparent;
                margin: 8px 0;
            }

            #youtuberExpandedPanel::-webkit-scrollbar-thumb {
                background: #a56dc8;
                border-radius: 3px;
            }

            #youtuberExpandedPanel::-webkit-scrollbar-thumb:hover {
                background: #795094;
            }
            
            #youtuberExpandedPanel .expandedPanelSection {
                padding-right: 8px;
            }

            #youtuberExpandedPanel.hidden {
                opacity: 0;
                transform: translateX(-100%);
                pointer-events: none;
            }

            #youtuberExpandedPanel.visible {
                opacity: 1;
                transform: translateX(0);
                pointer-events: all;
            }
        `;
    document.head.appendChild(stylesheet);
}

function bootstrap() {
    injectHiddenStyles();
    injectStylesheet();
    injectYoutuberStyles();
    replaceLinksContainer();
    replaceYoutuberOf();
    document.addEventListener('mousemove', (event) => {
        handleProximityFade(event.clientX, event.clientY);
        handleYoutuberProximityFade(event.clientX, event.clientY);
    });
}

injectHiddenStyles();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

function showItemInfo(item, isWeapon, isStoreItem) {
    if (player && item) {
        UTILS.removeAllChildren(itemInfoHolder);
        itemInfoHolder.classList.add("visible");
        UTILS.generateElement({
            id: "itemInfoName",
            text: UTILS.capitalizeFirst(item.name),
            parent: itemInfoHolder
        });
        UTILS.generateElement({
            id: "itemInfoDesc",
            text: item.desc,
            parent: itemInfoHolder
        });
        if (isStoreItem && item.price) {
            UTILS.generateElement({
                class: "itemInfoReq",
                text: "Price: " + item.price + " coins",
                parent: itemInfoHolder
            });
        } else if (isWeapon) {
            UTILS.generateElement({
                class: "itemInfoReq",
                text: !item.type ? "primary" : "secondary",
                parent: itemInfoHolder
            });
        } else {
            for (var i = 0; i < item.req.length; i += 2) {
                UTILS.generateElement({
                    class: "itemInfoReq",
                    html: item.req[i] + "<span class='itemInfoReqVal'> x" + item.req[i + 1] + "</span>",
                    parent: itemInfoHolder
                });
            }
            if (item.group.limit) {
                UTILS.generateElement({
                    class: "itemInfoLmt",
                    text: (player.itemCounts[item.group.id] || 0) + "/" + item.group.limit,
                    parent: itemInfoHolder
                });
            }
        }
    } else {
        itemInfoHolder.classList.remove("visible");
    }
}

var allianceNotifications = [];
var alliancePlayers = [];

function allianceNotification(sid, name) {
    allianceNotifications.push({
        sid: sid,
        name: name
    });
    updateNotifications();
}

function updateNotifications() {
    if (allianceNotifications[0]) {
        var tmpN = allianceNotifications[0];
        UTILS.removeAllChildren(notificationDisplay);
        notificationDisplay.style.display = "block";
        UTILS.generateElement({
            class: "notificationText",
            text: tmpN.name,
            parent: notificationDisplay
        });
        UTILS.generateElement({
            class: "notifButton",
            html: "<i class='material-icons' style='font-size:28px;color:#cc5151;'>&#xE14C;</i>",
            parent: notificationDisplay,
            onclick: function () {
                aJoinReq(0);
            },
            hookTouch: true
        });
        UTILS.generateElement({
            class: "notifButton",
            html: "<i class='material-icons' style='font-size:28px;color:#8ecc51;'>&#xE876;</i>",
            parent: notificationDisplay,
            onclick: function () {
                aJoinReq(1);
            },
            hookTouch: true
        });
    } else {
        notificationDisplay.style.display = "none";
    }
}

function addAlliance(data) {
    alliances.push(data);
    if (allianceMenu.style.display == "block") {
        showAllianceMenu();
    }
}

function setPlayerTeam(team, isOwner) {
    if (player) {
        player.team = team;
        player.isOwner = isOwner;
        if (allianceMenu.style.display == "block") {
            showAllianceMenu();
        }
    }
}

function setAlliancePlayers(data) {
    alliancePlayers = data;
    if (allianceMenu.style.display == "block") {
        showAllianceMenu();
    }
}

function deleteAlliance(sid) {
    for (var i = alliances.length - 1; i >= 0; i--) {
        if (alliances[i].sid == sid)
            alliances.splice(i, 1);
    }
    if (allianceMenu.style.display == "block") {
        showAllianceMenu();
    }
}

// Ограничение для allianceMenu, чтобы двигаться
function toggleAllianceMenu() {
    if (allianceMenu.style.display != "block") {
        showAllianceMenu();
    } else {
        allianceMenu.style.display = "none";
    }
}

function showAllianceMenu() {
    if (player && player.alive) {
        closeChat();
        storeMenu.style.display = "none";
        allianceMenu.style.display = "block";
        UTILS.removeAllChildren(allianceHolder);
        if (player.team) {
            for (var i = 0; i < alliancePlayers.length; i += 2) {
                (function (i) {
                    var tmp = UTILS.generateElement({
                        class: "allianceItem",
                        style: "color:" + (alliancePlayers[i] == player.sid ? "#fff" : "rgba(255,255,255,0.6)"),
                        text: alliancePlayers[i + 1],
                        parent: allianceHolder
                    });
                    if (player.isOwner && alliancePlayers[i] != player.sid) {
                        UTILS.generateElement({
                            class: "joinAlBtn",
                            text: "Kick",
                            onclick: function () {
                                kickFromClan(alliancePlayers[i]);
                            },
                            hookTouch: true,
                            parent: tmp
                        });
                    }
                })(i);
            }
        } else {
            if (alliances.length) {
                for (var i = 0; i < alliances.length; ++i) {
                    (function (i) {
                        var tmp = UTILS.generateElement({
                            class: "allianceItem",
                            style: "color:" + (alliances[i].sid == player.team ? "#fff" : "rgba(255,255,255,0.6)"),
                            text: alliances[i].sid,
                            parent: allianceHolder
                        });
                        UTILS.generateElement({
                            class: "joinAlBtn",
                            text: "Join",
                            onclick: function () {
                                sendJoin(i);
                            },
                            hookTouch: true,
                            parent: tmp
                        });
                    })(i);
                }
            } else {
                UTILS.generateElement({
                    class: "allianceItem",
                    text: "No Tribes Yet",
                    parent: allianceHolder
                });
            }
        }
        UTILS.removeAllChildren(allianceManager);
        if (player.team) {
            UTILS.generateElement({
                class: "allianceButtonM",
                style: "width: 360px",
                text: player.isOwner ? "Delete Tribe" : "Leave Tribe",
                onclick: function () {
                    leaveAlliance()
                },
                hookTouch: true,
                parent: allianceManager
            });
        } else {
            UTILS.generateElement({
                tag: "input",
                type: "text",
                id: "allianceInput",
                maxLength: 7,
                placeholder: "unique name",
                ontouchstart: function (ev) {
                    ev.preventDefault();
                    var newValue = prompt("unique name", ev.currentTarget.value);
                    ev.currentTarget.value = newValue.slice(0, 7);
                },
                parent: allianceManager
            });
            UTILS.generateElement({
                tag: "div",
                class: "allianceButtonM",
                style: "width: 140px;",
                text: "Create",
                onclick: function () {
                    createAlliance();
                },
                hookTouch: true,
                parent: allianceManager
            });
        }
    }
}

function aJoinReq(join) {
    io.send("P", allianceNotifications[0].sid, join);
    allianceNotifications.splice(0, 1);
    updateNotifications();
}

function kickFromClan(sid) {
    io.send("P", sid);
}

function sendJoin(index) {
    io.send("b", alliances[index].sid);
}

function createAlliance() {
    io.send("L", document.getElementById("allianceInput").value);
}

function leaveAlliance() {
    allianceNotifications = [];
    updateNotifications();
    io.send("N");
}

var lastDeath;
var minimapData;
var mapMarker;
var mapPings = [];
var tmpPing;

class MapPing {
    constructor() {
        this.init = function (x, y) {
            this.scale = 0;
            this.x = x;
            this.y = y;
            this.active = true;
        };
        this.update = function (ctxt, delta) {
            if (this.active) {
                this.scale += 0.05 * delta;
                if (this.scale >= config.mapPingScale) {
                    this.active = false;
                } else {
                    ctxt.globalAlpha = (1 - Math.max(0, this.scale / config.mapPingScale));
                    ctxt.beginPath();
                    ctxt.arc((this.x / config.mapScale) * mapDisplay.width, (this.y / config.mapScale) * mapDisplay.width, this.scale, 0, 2 * Math.PI);
                    ctxt.stroke();
                }
            }
        };
    }
}

var MiniMapPing = new MapPing();

(function () {
    if (MiniMapPing == undefined || MiniMapPing == null) {
        return false;
    }
    return true;
})();

function pingMap(x, y) {
    for (var i = 0; i < mapPings.length; ++i) {
        if (!mapPings[i].active) {
            tmpPing = mapPings[i];
            break;
        }
    }
    if (!tmpPing) {
        tmpPing = new MapPing();
        mapPings.push(tmpPing);
    }
    tmpPing.init(x, y);
}

function updateMapMarker() {
    if (!mapMarker) {
        mapMarker = {};
    }
    mapMarker.x = player.x;
    mapMarker.y = player.y;
}

function updateMinimap(data) {
    minimapData = data;
}

function renderMinimap(delta) {
    if (player && player.alive) {
        mapContext.clearRect(0, 0, mapDisplay.width, mapDisplay.height);

        mapContext.strokeStyle = "#fff";
        mapContext.lineWidth = 4;
        for (var i = 0; i < mapPings.length; ++i) {
            tmpPing = mapPings[i];
            tmpPing.update(mapContext, delta);
        }

        mapContext.globalAlpha = 1;
        mapContext.fillStyle = "#fff";
        renderCircle((player.x / config.mapScale) * mapDisplay.width, (player.y / config.mapScale) * mapDisplay.height, 7, mapContext, true);
        mapContext.fillStyle = "rgba(255,255,255,0.35)";
        if ((player.team || config.isSandbox) && minimapData) {
            for (var i = 0; i < minimapData.length;) {
                renderCircle((minimapData[i] / config.mapScale) * mapDisplay.width, (minimapData[i + 1] / config.mapScale) * mapDisplay.height, 7, mapContext, true);
                i += 2;
            }
        }

        if (lastDeath) {
            mapContext.fillStyle = "#fc5553";
            mapContext.font = "34px Hammersmith One";
            mapContext.textBaseline = "middle";
            mapContext.textAlign = "center";
            mapContext.fillText("x", (lastDeath.x / config.mapScale) * mapDisplay.width, (lastDeath.y / config.mapScale) * mapDisplay.height);
        }

        if (mapMarker) {
            mapContext.fillStyle = "#fff";
            mapContext.font = "34px Hammersmith One";
            mapContext.textBaseline = "middle";
            mapContext.textAlign = "center";
            mapContext.fillText("x", (mapMarker.x / config.mapScale) * mapDisplay.width, (mapMarker.y / config.mapScale) * mapDisplay.height);
        }
    }
}

var currentStoreIndex = 0;

function changeStoreIndex(index) {
    if (currentStoreIndex != index) {
        currentStoreIndex = index;
        generateStoreList();
    }
    updateStoreTabs();
}

function toggleStoreMenu() {
    if (storeMenu.style.display != "block") {
        storeMenu.style.display = "block";
        allianceMenu.style.display = "none";
        closeChat();
        generateStoreList();
        updateStoreTabs();
    } else {
        storeMenu.style.display = "none";
    }
}

function updateStoreItems(type, id, index) {
    if (index) {
        if (!type) {
            player.tails[id] = 1;
        } else {
            player.tailIndex = id;
        }
    } else {
        if (!type) {
            player.skins[id] = 1;
        } else {
            player.skinIndex = id;
        }
    }
    if (storeMenu.style.display == "block") {
        generateStoreList();
    }
}

function updateStoreTabs() {
    if (!storeMenu) return;
    var tabs = storeMenu.querySelectorAll(".overlay-tab");
    for (var i = 0; i < tabs.length; i++) {
        if (i === currentStoreIndex) {
            tabs[i].classList.add("active");
        } else {
            tabs[i].classList.remove("active");
        }
    }
}

function generateStoreList() {
    if (player) {
        UTILS.removeAllChildren(storeHolder);
        var index = currentStoreIndex;
        var tmpArray = index ? accessories : hats;
        for (var i = 0; i < tmpArray.length; ++i) {
            if (!tmpArray[i].dontSell) {
                (function (i) {
                    var tmp = UTILS.generateElement({
                        id: "storeDisplay" + i,
                        class: "storeItem",
                        onmouseout: function () {
                            showItemInfo();
                        },
                        onmouseover: function () {
                            showItemInfo(tmpArray[i], false, true);
                        },
                        parent: storeHolder
                    });
                    UTILS.hookTouchEvents(tmp, true);
                    UTILS.generateElement({
                        tag: "img",
                        class: "hatPreview",
                        src: "../img/" + (index ? "accessories/access_" : "hats/hat_") + tmpArray[i].id + (tmpArray[i].topSprite ? "_p" : "") + ".png",
                        parent: tmp
                    });
                    UTILS.generateElement({
                        tag: "span",
                        text: tmpArray[i].name,
                        parent: tmp
                    });
                    if (index ? (!player.tails[tmpArray[i].id]) : (!player.skins[tmpArray[i].id])) {
                        UTILS.generateElement({
                            class: "joinAlBtn",
                            style: "margin-top: 5px",
                            text: "Buy",
                            onclick: function () {
                                storeBuy(tmpArray[i].id, index);
                            },
                            hookTouch: true,
                            parent: tmp
                        });
                        UTILS.generateElement({
                            tag: "span",
                            class: "itemPrice",
                            text: tmpArray[i].price,
                            parent: tmp
                        })
                    } else if ((index ? player.tailIndex : player.skinIndex) == tmpArray[i].id) {
                        UTILS.generateElement({
                            class: "joinAlBtn",
                            style: "margin-top: 5px",
                            text: "Unequip",
                            onclick: function () {
                                storeEquip(0, index);
                            },
                            hookTouch: true,
                            parent: tmp
                        });
                    } else {
                        UTILS.generateElement({
                            class: "joinAlBtn",
                            style: "margin-top: 5px",
                            text: "Equip",
                            onclick: function () {
                                storeEquip(tmpArray[i].id, index);
                            },
                            hookTouch: true,
                            parent: tmp
                        });
                    }
                })(i);
            }
        }
    }
}

function storeEquip(id, index) {
    io.send("c", 0, id, index);
}

function storeBuy(id, index) {
    io.send("c", 1, id, index);
}

function hideAllWindows() {
    storeMenu.style.display = "none";
    allianceMenu.style.display = "none";
    closeChat();
}

function prepareUI() {
    var savedNativeValue = getSavedVal("native_resolution");
    if (!savedNativeValue) {
        setUseNativeResolution(typeof cordova !== "undefined"); // Only default to native if on mobile
    } else {
        setUseNativeResolution(savedNativeValue == "true");
    }

    showPing = getSavedVal("show_ping") == "true";
    updatePerformancePanelVisibility();

    setInterval(function () {
        if (window.cordova) {
            document.getElementById("downloadButtonContainer").classList.add("cordova");
            document.getElementById("mobileDownloadButtonContainer").classList.add("cordova");
        }
    }, 1000);

    updateSkinColorPicker();

    UTILS.removeAllChildren(actionBar);
    for (var i = 0; i < (items.weapons.length + items.list.length); ++i) {
        (function (i) {
            UTILS.generateElement({
                id: "actionBarItem" + i,
                class: "actionBarItem",
                style: "display:none",
                onmouseout: function () {
                    showItemInfo();
                },
                parent: actionBar
            });
        })(i);
    }
    for (var i = 0; i < (items.list.length + items.weapons.length); ++i) {
        (function (i) {
            var tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = tmpCanvas.height = 66;
            var tmpContext = tmpCanvas.getContext('2d');
            tmpContext.translate((tmpCanvas.width / 2), (tmpCanvas.height / 2));
            tmpContext.imageSmoothingEnabled = false;
            tmpContext.webkitImageSmoothingEnabled = false;
            tmpContext.mozImageSmoothingEnabled = false;
            if (items.weapons[i]) {
                tmpContext.rotate((Math.PI / 4) + Math.PI);
                var tmpSprite = new Image();
                toolSprites[items.weapons[i].src] = tmpSprite;
                tmpSprite.onload = function () {
                    this.isLoaded = true;
                    var tmpPad = 1 / (this.height / this.width);
                    var tmpMlt = (items.weapons[i].iPad || 1);
                    tmpContext.drawImage(this, -(tmpCanvas.width * tmpMlt * config.iconPad * tmpPad) / 2, -(tmpCanvas.height * tmpMlt * config.iconPad) / 2, tmpCanvas.width * tmpMlt * tmpPad * config.iconPad, tmpCanvas.height * tmpMlt * config.iconPad);
                    tmpContext.fillStyle = "rgba(0, 0, 70, 0.1)";
                    tmpContext.globalCompositeOperation = "source-atop";
                    tmpContext.fillRect(-tmpCanvas.width / 2, -tmpCanvas.height / 2, tmpCanvas.width, tmpCanvas.height);
                    document.getElementById('actionBarItem' + i).style.backgroundImage = "url(" + tmpCanvas.toDataURL() + ")";
                };
                tmpSprite.src = ".././img/weapons/" + items.weapons[i].src + ".png";
                var tmpUnit = document.getElementById('actionBarItem' + i);
                tmpUnit.onmouseover = UTILS.checkTrusted(function () {
                    showItemInfo(items.weapons[i], true);
                });
                tmpUnit.onclick = UTILS.checkTrusted(function () {
                    selectToBuild(i, true);
                });
                UTILS.hookTouchEvents(tmpUnit);
            } else {
                var tmpSprite = getItemSprite(items.list[i - items.weapons.length], true);
                var tmpScale = Math.min(tmpCanvas.width - config.iconPadding, tmpSprite.width);
                tmpContext.globalAlpha = 1;
                tmpContext.drawImage(tmpSprite, -tmpScale / 2, -tmpScale / 2, tmpScale, tmpScale);
                tmpContext.fillStyle = "rgba(0, 0, 70, 0.1)";
                tmpContext.globalCompositeOperation = "source-atop";
                tmpContext.fillRect(-tmpScale / 2, -tmpScale / 2, tmpScale, tmpScale);
                document.getElementById('actionBarItem' + i).style.backgroundImage = "url(" + tmpCanvas.toDataURL() + ")";
                var tmpUnit = document.getElementById('actionBarItem' + i);
                tmpUnit.onmouseover = UTILS.checkTrusted(function () {
                    showItemInfo(items.list[i - items.weapons.length]);
                });
                tmpUnit.onclick = UTILS.checkTrusted(function () {
                    selectToBuild(i - items.weapons.length);
                });
                UTILS.hookTouchEvents(tmpUnit);
            }
        })(i);
    }

    nameInput.ontouchstart = UTILS.checkTrusted(function (e) {
        e.preventDefault();
        var newValue = prompt("enter name", e.currentTarget.value);
        e.currentTarget.value = newValue.slice(0, 15);
    });

    nativeResolutionCheckbox.checked = useNativeResolution;
    nativeResolutionCheckbox.onchange = UTILS.checkTrusted(function (e) {
        setUseNativeResolution(e.target.checked);
    });
    showPingCheckbox.checked = showPing;
    showPingCheckbox.onchange = UTILS.checkTrusted(function (e) {
        showPing = showPingCheckbox.checked;
        saveVal("show_ping", showPing ? "true" : "false");
        updatePerformancePanelVisibility();
    });
}

function updateItems(data, wpn) {
    if (data) {
        if (wpn) {
            player.weapons = data;
        } else player.items = data;
    }
    for (var i = 0; i < items.list.length; ++i) {
        var tmpI = (items.weapons.length + i);
        document.getElementById("actionBarItem" + tmpI).style.display = (player.items.indexOf(items.list[i].id) >= 0) ? "inline-block" : "none";
    }
    for (var i = 0; i < items.weapons.length; ++i) {
        document.getElementById("actionBarItem" + i).style.display = (player.weapons[items.weapons[i].type] == items.weapons[i].id) ? "inline-block" : "none";
    }
}

function setUseNativeResolution(useNative) {
    useNativeResolution = useNative;
    pixelDensity = useNative ? (window.devicePixelRatio || 1) : 1;
    nativeResolutionCheckbox.checked = useNative;
    saveVal("native_resolution", useNative.toString());
    resize();
}

function updateGuide() {
    if (usingTouch) {
        guideCard.classList.add("touch");
    } else {
        guideCard.classList.remove("touch");
    }
}

function toggleSettings() {
    if (guideCard.classList.contains("showing")) {
        guideCard.classList.remove("showing");
        settingsButtonTitle.innerText = "Settings";
    } else {
        guideCard.classList.add("showing");
        settingsButtonTitle.innerText = "Close";
    }
}

function updateSkinColorPicker() {
    var tmpHTML = "";
    for (var i = 0; i < config.skinColors.length; ++i) {
        if (i == skinColor) {
            tmpHTML += ("<div class='skinColorItem activeSkin' style='background-color:" + config.skinColors[i] + "' onclick='selectSkinColor(" + i + ")'> </div>");
        } else {
            tmpHTML += ("<div class='skinColorItem' style='background-color:" + config.skinColors[i] + "' onclick='selectSkinColor(" + i + ")'> </div>");
        }
    }
    skinColorHolder.innerHTML = tmpHTML;
}

function selectSkinColor(index) {
    skinColor = index;
    updateSkinColorPicker();
}

var chatBox = document.getElementById("chatBox");
var chatHolder = document.getElementById("chatHolder");
var chatFilter = new Filter();

function toggleChat() {
    if (!usingTouch) {
        if (chatHolder.style.display == "block") {
            if (chatBox.value) {
                sendChat(chatBox.value);
            }
            closeChat();
        } else {
            storeMenu.style.display = "none";
            allianceMenu.style.display = "none";
            chatHolder.style.display = "block";
            chatBox.focus();
            resetMoveDir();
            // И нужно ещё убрать это для чата
        }
    } else {
        setTimeout(function () { // Timeout lets the `hookTouchEvents` function exit
            var chatMessage = prompt("chat message");
            if (chatMessage) {
                sendChat(chatMessage);
            }
        }, 1);
    }
    chatBox.value = "";
}

function sendChat(message) {
    io.send("6", message.slice(0, 30));
}

function closeChat() {
    chatBox.value = "";
    chatHolder.style.display = "none";
}

function checkProfanityString(text) {
    var result = text;
    for (var i = 0; i < chatFilter.list.length; ++i) {
        var term = chatFilter.list[i];
        if (!term) {
            continue;
        }
        var mask = buildProfanityMask(term.length);
        var escapedTerm = escapeRegExp(term);
        var re = new RegExp(escapedTerm, "gi");
        result = result.replace(re, mask);
    }
    return result;
}

function buildProfanityMask(length) {
    if (!length) {
        return "";
    }
    var mask = "M";
    for (var i = 1; i < length; i++) {
        mask += "o";
    }
    return mask;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function receiveChat(sid, message) {
    var tmpPlayer = findPlayerBySID(sid);
    if (tmpPlayer) {
        tmpPlayer.chatMessage = checkProfanityString(message);
        tmpPlayer.chatCountdown = config.chatCountdown;
    }
}

window.addEventListener('resize', UTILS.checkTrusted(resize));

function resize() {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    var scaleFillNative = Math.max(screenWidth / maxScreenWidth, screenHeight / maxScreenHeight) * pixelDensity;
    gameCanvas.width = screenWidth * pixelDensity;
    gameCanvas.height = screenHeight * pixelDensity;
    gameCanvas.style.width = screenWidth + "px";
    gameCanvas.style.height = screenHeight + "px";
    mainContext.setTransform(scaleFillNative, 0, 0, scaleFillNative, (screenWidth * pixelDensity - (maxScreenWidth * scaleFillNative)) / 2, (screenHeight * pixelDensity - (maxScreenHeight * scaleFillNative)) / 2);
}

resize();

var usingTouch;
setUsingTouch(false);

function setUsingTouch(using) {
    usingTouch = using;
    updateGuide();
}

window.setUsingTouch = setUsingTouch;

gameCanvas.addEventListener('touchmove', UTILS.checkTrusted(touchMove), false);

function touchMove(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    setUsingTouch(true);
    for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (t.identifier == controllingTouch.id) {
            controllingTouch.currentX = t.pageX;
            controllingTouch.currentY = t.pageY;
            sendMoveDir();
        } else if (t.identifier == attackingTouch.id) {
            attackingTouch.currentX = t.pageX;
            attackingTouch.currentY = t.pageY;
            attackState = 1;
        }
    }
}

gameCanvas.addEventListener('touchstart', UTILS.checkTrusted(touchStart), false);

function touchStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    setUsingTouch(true);
    for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (t.pageX < document.body.scrollWidth / 2 && controllingTouch.id == -1) {
            controllingTouch.id = t.identifier;
            controllingTouch.startX = controllingTouch.currentX = t.pageX;
            controllingTouch.startY = controllingTouch.currentY = t.pageY;
            sendMoveDir();
        } else if (t.pageX > document.body.scrollWidth / 2 && attackingTouch.id == -1) {
            attackingTouch.id = t.identifier;
            attackingTouch.startX = attackingTouch.currentX = t.pageX;
            attackingTouch.startY = attackingTouch.currentY = t.pageY;
            if (player.buildIndex < 0) {
                attackState = 1;
                sendAtckState();
            }
        }
    }
}

gameCanvas.addEventListener('touchend', UTILS.checkTrusted(touchEnd), false);
gameCanvas.addEventListener('touchcancel', UTILS.checkTrusted(touchEnd), false);
gameCanvas.addEventListener('touchleave', UTILS.checkTrusted(touchEnd), false);

function touchEnd(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    setUsingTouch(true);
    for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (t.identifier == controllingTouch.id) {
            controllingTouch.id = -1;
            sendMoveDir();
        } else if (t.identifier == attackingTouch.id) {
            attackingTouch.id = -1;
            if (player.buildIndex >= 0) {
                attackState = 1;
                sendAtckState();
            }
            attackState = 0;
            sendAtckState();
        }
    }
}

gameCanvas.addEventListener('mousemove', gameInput, false);

function gameInput(e) {
    e.preventDefault();
    e.stopPropagation();
    setUsingTouch(false);
    mouseX = e.clientX;
    mouseY = e.clientY;
}

gameCanvas.addEventListener('mousedown', mouseDown, false);

function mouseDown(e) {
    setUsingTouch(false);
    if (attackState != 1) {
        attackState = 1;
        sendAtckState();
    }
}

gameCanvas.addEventListener('mouseup', mouseUp, false);

function mouseUp(e) {
    setUsingTouch(false);
    if (attackState != 0) {
        attackState = 0;
        sendAtckState();
    }
}

function getMoveDir() {
    var dx = 0;
    var dy = 0;
    if (controllingTouch.id != -1) {
        dx += controllingTouch.currentX - controllingTouch.startX;
        dy += controllingTouch.currentY - controllingTouch.startY;
    } else {
        for (var key in moveKeys) {
            var tmpDir = moveKeys[key];
            dx += !!keys[key] * tmpDir[0];
            dy += !!keys[key] * tmpDir[1];
        }
    }
    return (dx == 0 && dy == 0) ? undefined : UTILS.fixTo(Math.atan2(dy, dx), 2);
}

var lastDir;

function getAttackDir() {
    if (!player)
        return 0;
    if (attackingTouch.id != -1) {
        lastDir = Math.atan2(attackingTouch.currentY - attackingTouch.startY, attackingTouch.currentX - attackingTouch.startX);
    } else if (!player.lockDir && !usingTouch) {
        lastDir = Math.atan2(mouseY - (screenHeight / 2), mouseX - (screenWidth / 2));
    }
    return UTILS.fixTo(lastDir || 0, 2);
}

var keys = {};
var moveKeys = {
    87: [0, -1],
    38: [0, -1],
    83: [0, 1],
    40: [0, 1],
    65: [-1, 0],
    37: [-1, 0],
    68: [1, 0],
    39: [1, 0]
};

function resetMoveDir() {
    keys = {};
    io.send("e");
}

// Тут можно убрать чтобы человек двигался при открытом чате
function keysActive() {
    return (chatHolder.style.display != "block");
}

function keyDown(event) {
    var keyNum = event.which || event.keyCode || 0;
    if (keyNum == 27) {
        hideAllWindows();
    } else if (player && player.alive && keysActive()) {
        if (!keys[keyNum]) {
            keys[keyNum] = 1;
            if (keyNum == 69) {
                sendAutoGather();
            } else if (keyNum == 67) {
                updateMapMarker();
            } else if (keyNum == 88) {
                sendLockDir();
            } else if (player.weapons[keyNum - 49] != undefined) {
                selectToBuild(player.weapons[keyNum - 49], true);
            } else if (player.items[keyNum - 49 - player.weapons.length] != undefined) {
                selectToBuild(player.items[keyNum - 49 - player.weapons.length]);
            } else if (keyNum == 81) {
                selectToBuild(player.items[0]);
            } else if (keyNum == 82) {
                sendMapPing();
            } else if (moveKeys[keyNum]) {
                sendMoveDir();
            } else if (keyNum == 32) {
                attackState = 1;
                sendAtckState();
            }
        }
    }
}

window.addEventListener('keydown', UTILS.checkTrusted(keyDown));

function keyUp(event) {
    if (player && player.alive) {
        var keyNum = event.which || event.keyCode || 0;
        if (keyNum == 13) {
            toggleChat();
        } else if (keysActive()) {
            if (keys[keyNum]) {
                keys[keyNum] = 0;
                if (moveKeys[keyNum]) {
                    sendMoveDir();
                } else if (keyNum == 32) {
                    attackState = 0;
                    sendAtckState();
                }
            }
        }
    }
}

window.addEventListener('keyup', UTILS.checkTrusted(keyUp));

function sendAtckState() {
    if (player && player.alive) {
        io.send("F", attackState, (player.buildIndex >= 0 ? getAttackDir() : null));
    }
}

var lastMoveDir = undefined;

function sendMoveDir() {
    var newMoveDir = getMoveDir();
    if (lastMoveDir == undefined || newMoveDir == undefined || Math.abs(newMoveDir - lastMoveDir) > 0.3) {
        io.send("9", newMoveDir);
        lastMoveDir = newMoveDir;
    }
}

function sendLockDir() {
    player.lockDir = player.lockDir ? 0 : 1;
    io.send("K", 0);
}

function sendMapPing() {
    io.send("S", 1);
}

function sendAutoGather() {
    io.send("K", 1);
}

function selectToBuild(index, wpn) {
    io.send("z", index, wpn);
}

function enterGame() {
    saveVal("moo_name", nameInput.value);
    if (!inGame && socketReady()) {
        inGame = true;
        showLoadingText("Loading...");
        io.send("M", {
            name: nameInput.value,
            moofoll: moofoll,
            skin: skinColor
        });
    }
}

var firstSetup = true;

function setupGame(yourSID) {
    loadingText.style.display = "none";
    menuCardHolder.style.display = "flex";
    mainMenu.style.display = "none";
    keys = {};
    playerSID = yourSID;
    attackState = 0;
    inGame = true;
    if (firstSetup) {
        firstSetup = false;
        gameObjects.length = 0;
    }
}

function showText(x, y, value, type) {
    textManager.showText(x, y, 50, 0.18, 500, Math.abs(value), (value >= 0) ? "#fff" : "#8ecc51");
}

var deathTextScale = 99999;

function killPlayer() {
    inGame = false;
    try {
        factorem.refreshAds([2], true);
    } catch (e) { };
    gameUI.style.display = "none";
    hideAllWindows();
    lastDeath = {
        x: player.x,
        y: player.y
    };
    loadingText.style.display = "none";
    diedText.style.display = "block";
    diedText.style.fontSize = "0px";
    deathTextScale = 0;
    setTimeout(function () {
        menuCardHolder.style.display = "flex";
        mainMenu.style.display = "block";
        diedText.style.display = "none";
    }, config.deathFadeout);
    updateServerList();
}

function killObjects(sid) {
    if (player) {
        objectManager.removeAllItems(sid);
    }
}

function killObject(sid) {
    objectManager.disableBySid(sid);
}

function updateStatusDisplay() {
    scoreDisplay.innerText = player.points;
    foodDisplay.innerText = player.food;;
    woodDisplay.innerText = player.wood;
    stoneDisplay.innerText = player.stone;
    killCounter.innerText = player.kills;
}

var iconSprites = {};
var icons = ["crown", "skull"];

function loadIcons() {
    for (var i = 0; i < icons.length; ++i) {
        var tmpSprite = new Image();
        tmpSprite.onload = function () {
            this.isLoaded = true;
        };
        tmpSprite.src = ".././img/icons/" + icons[i] + ".png";
        iconSprites[icons[i]] = tmpSprite;
    }
}

var tmpList = [];

function updateUpgrades(points, age) {
    player.upgradePoints = points;
    player.upgrAge = age;
    if (points > 0) {
        tmpList.length = 0;
        UTILS.removeAllChildren(upgradeHolder);
        for (var i = 0; i < items.weapons.length; ++i) {
            if (items.weapons[i].age == age && (items.weapons[i].pre == undefined || player.weapons.indexOf(items.weapons[i].pre) >= 0)) {
                var e = UTILS.generateElement({
                    id: "upgradeItem" + i,
                    class: "actionBarItem",
                    onmouseout: function () {
                        showItemInfo();
                    },
                    parent: upgradeHolder
                });
                e.style.backgroundImage = document.getElementById("actionBarItem" + i).style.backgroundImage;
                tmpList.push(i);
            }
        }
        for (var i = 0; i < items.list.length; ++i) {
            if (items.list[i].age == age && (items.list[i].pre == undefined || player.items.indexOf(items.list[i].pre) >= 0)) {
                var tmpI = (items.weapons.length + i);
                var e = UTILS.generateElement({
                    id: "upgradeItem" + tmpI,
                    class: "actionBarItem",
                    onmouseout: function () {
                        showItemInfo();
                    },
                    parent: upgradeHolder
                });
                e.style.backgroundImage = document.getElementById("actionBarItem" + tmpI).style.backgroundImage;
                tmpList.push(tmpI);
            }
        }
        for (var i = 0; i < tmpList.length; i++) {
            (function (i) {
                var tmpItem = document.getElementById('upgradeItem' + i);
                tmpItem.onmouseover = function () {
                    if (items.weapons[i]) {
                        showItemInfo(items.weapons[i], true);
                    } else {
                        showItemInfo(items.list[i - items.weapons.length]);
                    }
                };
                tmpItem.onclick = UTILS.checkTrusted(function () {
                    io.send("H", i);
                });
                UTILS.hookTouchEvents(tmpItem);
            })(tmpList[i]);
        }
        if (tmpList.length) {
            upgradeHolder.style.display = "block";
            upgradeCounter.style.display = "block";
            upgradeCounter.innerHTML = "Select Items (" + points + ")";
        } else {
            upgradeHolder.style.display = "none";
            upgradeCounter.style.display = "none";
            showItemInfo();
        }
    } else {
        upgradeHolder.style.display = "none";
        upgradeCounter.style.display = "none";
        showItemInfo();
    }
}

function updateAge(xp, mxp, age) {
    if (xp != undefined) {
        player.XP = xp;
    }
    if (mxp != undefined) {
        player.maxXP = mxp;
    }
    if (age != undefined) {
        player.age = age;
    }
    if (age == config.maxAge) {
        ageText.innerHTML = "MAX AGE";
        ageBarBody.style.width = "100%";
    } else {
        ageText.innerHTML = "AGE " + player.age;
        ageBarBody.style.width = ((player.XP / player.maxXP) * 100) + "%";
    }
}

function updateLeaderboard(data) {
    UTILS.removeAllChildren(leaderboardData);
    var tmpC = 1;
    for (var i = 0; i < data.length; i += 3) {
        (function (i) {
            UTILS.generateElement({
                class: "leaderHolder",
                parent: leaderboardData,
                children: [
                    UTILS.generateElement({
                        class: "leaderboardItem",
                        style: "color:" + ((data[i] == playerSID) ? "#fff" : "rgba(255,255,255,0.6)"),
                        text: tmpC + ". " + (data[i + 1] != "" ? data[i + 1] : "unknown")
                    }),
                    UTILS.generateElement({
                        class: "leaderScore",
                        text: UTILS.kFormat(data[i + 2]) || "0"
                    })
                ]
            });
        })(i);
        tmpC++;
    }
}

function prepareObjectRenderLists(xOffset, yOffset, delta) {
    for (var layer in objectRenderBuckets) {
        if (Object.prototype.hasOwnProperty.call(objectRenderBuckets, layer)) {
            objectRenderBuckets[layer].length = 0;
        }
    }
    for (var i = 0; i < gameObjects.length; ++i) {
        tmpObj = gameObjects[i];
        if (!tmpObj || !tmpObj.active) {
            continue;
        }
        var layerId = tmpObj.layer;
        if (layerId === undefined) {
            continue;
        }
        if (!objectRenderBuckets[layerId]) {
            objectRenderBuckets[layerId] = [];
        }
        tmpObj.update(delta);
        var tmpX = tmpObj.x + tmpObj.xWiggle - xOffset;
        var tmpY = tmpObj.y + tmpObj.yWiggle - yOffset;
        if (!isOnScreen(tmpX, tmpY, tmpObj.scale + (tmpObj.blocker || 0))) {
            continue;
        }
        objectRenderBuckets[layerId].push({
            obj: tmpObj,
            x: tmpX,
            y: tmpY
        });
    }
}

function updateGame() {
    if (true) {
        if (player) {
            if (!lastSent || now - lastSent >= (1000 / config.clientSendRate)) {
                lastSent = now;
                io.send("D", getAttackDir());
            }
        }
        if (deathTextScale < 120) {
            deathTextScale += 0.1 * delta;
            diedText.style.fontSize = Math.min(Math.round(deathTextScale), 120) + "px";
        }
        if (player) {
            var tmpDist = UTILS.getDistance(camX, camY, player.x, player.y);
            var tmpDir = UTILS.getDirection(player.x, player.y, camX, camY);
            var camSpd = Math.min(tmpDist * 0.01 * delta, tmpDist);
            if (tmpDist > 0.05) {
                camX += camSpd * Math.cos(tmpDir);
                camY += camSpd * Math.sin(tmpDir);
            } else {
                camX = player.x;
                camY = player.y;
            }
        } else {
            camX = config.mapScale / 2;
            camY = config.mapScale / 2;
        }
        var lastTime = now - (1000 / config.serverUpdateRate);
        var tmpDiff;
        for (var i = 0; i < players.length + ais.length; ++i) {
            tmpObj = players[i] || ais[i - players.length];
            if (tmpObj && tmpObj.visible) {
                if (tmpObj.forcePos) {
                    tmpObj.x = tmpObj.x2;
                    tmpObj.y = tmpObj.y2;
                    tmpObj.dir = tmpObj.d2;
                } else {
                    var total = tmpObj.t2 - tmpObj.t1;
                    var fraction = lastTime - tmpObj.t1;
                    var ratio = (fraction / total);
                    var rate = 170;
                    tmpObj.dt += delta;
                    var tmpRate = Math.min(1.7, tmpObj.dt / rate);
                    var tmpDiff = (tmpObj.x2 - tmpObj.x1);
                    tmpObj.x = tmpObj.x1 + (tmpDiff * tmpRate);
                    tmpDiff = (tmpObj.y2 - tmpObj.y1);
                    tmpObj.y = tmpObj.y1 + (tmpDiff * tmpRate);
                    tmpObj.dir = Math.lerpAngle(tmpObj.d2, tmpObj.d1, Math.min(1.2, ratio));
                }
            }
        }

        var xOffset = camX - (maxScreenWidth / 2);
        var yOffset = camY - (maxScreenHeight / 2);

        prepareObjectRenderLists(xOffset, yOffset, delta);

        if (config.snowBiomeTop - yOffset <= 0 && config.mapScale - config.snowBiomeTop - yOffset >= maxScreenHeight) {
            mainContext.fillStyle = "#b6db66";
            mainContext.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
        } else if (config.mapScale - config.snowBiomeTop - yOffset <= 0) {
            mainContext.fillStyle = "#dbc666";
            mainContext.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
        } else if (config.snowBiomeTop - yOffset >= maxScreenHeight) {
            mainContext.fillStyle = "#fff";
            mainContext.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
        } else if (config.snowBiomeTop - yOffset >= 0) {
            mainContext.fillStyle = "#fff";
            mainContext.fillRect(0, 0, maxScreenWidth, config.snowBiomeTop - yOffset);
            mainContext.fillStyle = "#b6db66";
            mainContext.fillRect(0, config.snowBiomeTop - yOffset, maxScreenWidth, maxScreenHeight - (config.snowBiomeTop - yOffset));
        } else {
            mainContext.fillStyle = "#b6db66";
            mainContext.fillRect(0, 0, maxScreenWidth, (config.mapScale - config.snowBiomeTop - yOffset));
            mainContext.fillStyle = "#dbc666";
            mainContext.fillRect(0, (config.mapScale - config.snowBiomeTop - yOffset), maxScreenWidth, maxScreenHeight - (config.mapScale - config.snowBiomeTop - yOffset));
        }

        if (!firstSetup) {
            waterMult += waterPlus * config.waveSpeed * delta;
            if (waterMult >= config.waveMax) {
                waterMult = config.waveMax;
                waterPlus = -1;
            } else if (waterMult <= 1) {
                waterMult = waterPlus = 1;
            }
            mainContext.globalAlpha = 1;
            mainContext.fillStyle = "#dbc666";
            renderWaterBodies(xOffset, yOffset, mainContext, config.riverPadding);
            mainContext.fillStyle = "#91b2db";
            renderWaterBodies(xOffset, yOffset, mainContext, (waterMult - 1) * 250);
        }

        mainContext.lineWidth = 4;
        mainContext.strokeStyle = "#000";
        mainContext.globalAlpha = 0.06;
        mainContext.beginPath();

        // Add grind checkbox in main menu
        for (var x = -camX; x < maxScreenWidth; x += maxScreenHeight / 18) {
            if (x > 0) {
                mainContext.moveTo(x, 0);
                mainContext.lineTo(x, maxScreenHeight);
            }
        }

        for (var y = -camY; y < maxScreenHeight; y += maxScreenHeight / 18) {
            if (x > 0) {
                mainContext.moveTo(0, y);
                mainContext.lineTo(maxScreenWidth, y);
            }
        }

        mainContext.stroke();

        mainContext.globalAlpha = 1;
        mainContext.strokeStyle = outlineColor;
        renderGameObjects(-1, xOffset, yOffset);

        mainContext.globalAlpha = 1;
        mainContext.lineWidth = outlineWidth;
        renderProjectiles(0, xOffset, yOffset);

        renderPlayers(xOffset, yOffset, 0);

        mainContext.globalAlpha = 1;
        for (var i = 0; i < ais.length; ++i) {
            tmpObj = ais[i];
            if (tmpObj.active && tmpObj.visible) {
                tmpObj.animate(delta);
                mainContext.save();
                mainContext.translate(tmpObj.x - xOffset, tmpObj.y - yOffset);
                mainContext.rotate(tmpObj.dir + tmpObj.dirPlus - (Math.PI / 2));
                renderAI(tmpObj, mainContext);
                mainContext.restore();
            }
        }

        renderGameObjects(0, xOffset, yOffset);
        renderProjectiles(1, xOffset, yOffset);
        renderGameObjects(1, xOffset, yOffset);
        renderPlayers(xOffset, yOffset, 1);
        renderGameObjects(2, xOffset, yOffset);
        renderGameObjects(3, xOffset, yOffset);

        mainContext.fillStyle = "#000";
        mainContext.globalAlpha = 0.09;
        if (xOffset <= 0) {
            mainContext.fillRect(0, 0, -xOffset, maxScreenHeight);
        }
        if (config.mapScale - xOffset <= maxScreenWidth) {
            var tmpY = Math.max(0, -yOffset);
            mainContext.fillRect(config.mapScale - xOffset, tmpY, maxScreenWidth - (config.mapScale - xOffset), maxScreenHeight - tmpY);
        }
        if (yOffset <= 0) {
            mainContext.fillRect(-xOffset, 0, maxScreenWidth + xOffset, -yOffset);
        }
        if (config.mapScale - yOffset <= maxScreenHeight) {
            var tmpX = Math.max(0, -xOffset);
            var tmpMin = 0;
            if (config.mapScale - xOffset <= maxScreenWidth) {
                tmpMin = maxScreenWidth - (config.mapScale - xOffset);
            }
            mainContext.fillRect(tmpX, config.mapScale - yOffset, (maxScreenWidth - tmpX) - tmpMin, maxScreenHeight - (config.mapScale - yOffset));
        }

        mainContext.globalAlpha = 1;
        mainContext.fillStyle = "rgba(0, 0, 70, 0.35)";
        mainContext.fillRect(0, 0, maxScreenWidth, maxScreenHeight);

        mainContext.strokeStyle = darkOutlineColor;
        for (var i = 0; i < players.length + ais.length; ++i) {
            tmpObj = players[i] || ais[i - players.length];
            if (tmpObj.visible) {

                if (tmpObj.skinIndex != 10 || (tmpObj == player) || (tmpObj.team && tmpObj.team == player.team)) {
                    var tmpText = (tmpObj.team ? "[" + tmpObj.team + "] " : "") + (tmpObj.name || "");
                    if (tmpText != "") {
                        mainContext.font = (tmpObj.nameScale || 30) + "px Hammersmith One";
                        mainContext.fillStyle = "#fff";
                        mainContext.textBaseline = "middle";
                        mainContext.textAlign = "center";
                        mainContext.lineWidth = (tmpObj.nameScale ? 11 : 8);
                        mainContext.lineJoin = "round";
                        mainContext.strokeText(tmpText, tmpObj.x - xOffset, (tmpObj.y - yOffset - tmpObj.scale) - config.nameY);
                        mainContext.fillText(tmpText, tmpObj.x - xOffset, (tmpObj.y - yOffset - tmpObj.scale) - config.nameY);
                        if (tmpObj.isLeader && iconSprites["crown"].isLoaded) {
                            var tmpS = config.crownIconScale;
                            var tmpX = tmpObj.x - xOffset - (tmpS / 2) - (mainContext.measureText(tmpText).width / 2) - config.crownPad;
                            mainContext.drawImage(iconSprites["crown"], tmpX, (tmpObj.y - yOffset - tmpObj.scale) -
                                config.nameY - (tmpS / 2) - 5, tmpS, tmpS);
                        }
                        if (tmpObj.iconIndex == 1 && iconSprites["skull"].isLoaded) {
                            var tmpS = config.crownIconScale;
                            var tmpX = tmpObj.x - xOffset - (tmpS / 2) + (mainContext.measureText(tmpText).width / 2) + config.crownPad;
                            mainContext.drawImage(iconSprites["skull"], tmpX, (tmpObj.y - yOffset - tmpObj.scale) - config.nameY - (tmpS / 2) - 5, tmpS, tmpS);
                        }
                    }
                    if (tmpObj.health > 0) {

                        mainContext.fillStyle = darkOutlineColor;
                        mainContext.roundRect(tmpObj.x - xOffset - config.healthBarWidth - config.healthBarPad, (tmpObj.y - yOffset + tmpObj.scale) + config.nameY, (config.healthBarWidth * 2) + (config.healthBarPad * 2), 17, 8);
                        mainContext.fill();

                        mainContext.fillStyle = (tmpObj == player || (tmpObj.team && tmpObj.team == player.team)) ? "#8ecc51" : "#cc5151";
                        mainContext.roundRect(tmpObj.x - xOffset - config.healthBarWidth, (tmpObj.y - yOffset + tmpObj.scale) + config.nameY + config.healthBarPad, ((config.healthBarWidth * 2) * (tmpObj.health / tmpObj.maxHealth)), 17 - config.healthBarPad * 2, 7);
                        mainContext.fill();
                    }
                }
            }
        }

        textManager.update(delta, mainContext, xOffset, yOffset);

        for (var i = 0; i < players.length; ++i) {
            tmpObj = players[i];
            if (tmpObj.visible && tmpObj.chatCountdown > 0) {
                tmpObj.chatCountdown -= delta;
                if (tmpObj.chatCountdown <= 0) {
                    tmpObj.chatCountdown = 0;
                }
                mainContext.font = "32px Hammersmith One";
                var tmpSize = mainContext.measureText(tmpObj.chatMessage);
                mainContext.textBaseline = "middle";
                mainContext.textAlign = "center";
                var tmpX = tmpObj.x - xOffset;
                var tmpY = tmpObj.y - tmpObj.scale - yOffset - 90;
                var tmpH = 47;
                var tmpW = tmpSize.width + 17;
                mainContext.fillStyle = "rgba(0,0,0,0.2)";
                mainContext.roundRect(tmpX - tmpW / 2, tmpY - tmpH / 2, tmpW, tmpH, 6);
                mainContext.fill();
                mainContext.fillStyle = "#fff";
                mainContext.fillText(tmpObj.chatMessage, tmpX, tmpY);
            }
        }
    }

    renderMinimap(delta);

    if (controllingTouch.id !== -1) {
        renderControl(controllingTouch.startX, controllingTouch.startY, controllingTouch.currentX, controllingTouch.currentY);
    }
    if (attackingTouch.id !== -1) {
        renderControl(attackingTouch.startX, attackingTouch.startY, attackingTouch.currentX, attackingTouch.currentY);
    }
}

function renderControl(startX, startY, currentX, currentY) {
    mainContext.save();
    mainContext.setTransform(1, 0, 0, 1, 0, 0);

    mainContext.scale(pixelDensity, pixelDensity);
    var controlRadius = 50;
    mainContext.beginPath();
    mainContext.arc(startX, startY, controlRadius, 0, Math.PI * 2, false);
    mainContext.closePath();
    mainContext.fillStyle = "rgba(255, 255, 255, 0.3)";
    mainContext.fill();
    var controlRadius = 50;
    var offsetX = currentX - startX;
    var offsetY = currentY - startY;
    var mag = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
    var divisor = mag > controlRadius ? (mag / controlRadius) : 1;
    offsetX /= divisor;
    offsetY /= divisor;
    mainContext.beginPath();
    mainContext.arc(startX + offsetX, startY + offsetY, controlRadius * 0.5, 0, Math.PI * 2, false);
    mainContext.closePath();
    mainContext.fillStyle = "white";
    mainContext.fill();
    mainContext.restore();
}

function renderProjectiles(layer, xOffset, yOffset) {
    for (var i = 0; i < projectiles.length; ++i) {
        tmpObj = projectiles[i];
        if (tmpObj.active && tmpObj.layer == layer) {
            tmpObj.update(delta);
            if (tmpObj.active && isOnScreen(tmpObj.x - xOffset, tmpObj.y - yOffset, tmpObj.scale)) {
                mainContext.save();
                mainContext.translate(tmpObj.x - xOffset, tmpObj.y - yOffset);
                mainContext.rotate(tmpObj.dir);
                renderProjectile(0, 0, tmpObj, mainContext, 1);
                mainContext.restore();
            }
        }
    }
}

var projectileSprites = {};

function renderProjectile(x, y, obj, ctxt, debug) {
    if (obj.src) {
        var tmpSrc = items.projectiles[obj.indx].src;
        var tmpSprite = projectileSprites[tmpSrc];
        if (!tmpSprite) {
            tmpSprite = new Image();
            tmpSprite.onload = function () {
                this.isLoaded = true;
            }
            tmpSprite.src = ".././img/weapons/" + tmpSrc + ".png";
            projectileSprites[tmpSrc] = tmpSprite;
        }
        if (tmpSprite.isLoaded)
            ctxt.drawImage(tmpSprite, x - (obj.scale / 2), y - (obj.scale / 2), obj.scale, obj.scale);
    } else if (obj.indx == 1) {
        ctxt.fillStyle = "#939393";
        renderCircle(x, y, obj.scale, ctxt);
    }
}

function renderWaterBodies(xOffset, yOffset, ctxt, padding) {
    var tmpW = config.riverWidth + padding;
    var tmpY = (config.mapScale / 2) - yOffset - (tmpW / 2);
    if (tmpY < maxScreenHeight && tmpY + tmpW > 0) {
        ctxt.fillRect(0, tmpY, maxScreenWidth, tmpW);
    }
}

function renderGameObjects(layer, xOffset, yOffset) {
    var tmpSprite;
    var bucket = objectRenderBuckets[layer];
    if (!bucket || !bucket.length) {
        return;
    }
    for (var i = 0; i < bucket.length; ++i) {
        var entry = bucket[i];
        tmpObj = entry.obj;
        var tmpX = entry.x;
        var tmpY = entry.y;
        mainContext.globalAlpha = tmpObj.hideFromEnemy ? 0.6 : 1;
        if (tmpObj.isItem) {
            tmpSprite = getItemSprite(tmpObj);
            mainContext.save();
            mainContext.translate(tmpX, tmpY);
            mainContext.rotate(tmpObj.dir);
            mainContext.drawImage(tmpSprite, -(tmpSprite.width / 2), -(tmpSprite.height / 2));
            if (tmpObj.blocker) {
                mainContext.strokeStyle = "#db6e6e";
                mainContext.globalAlpha = 0.3;
                mainContext.lineWidth = 6;
                renderCircle(0, 0, tmpObj.blocker, mainContext, false, true);
            }
            mainContext.restore();
        } else {
            tmpSprite = getResSprite(tmpObj);
            mainContext.drawImage(tmpSprite, tmpX - (tmpSprite.width / 2), tmpY - (tmpSprite.height / 2));
        }
    }
}

function gatherAnimation(sid, didHit, index) {
    tmpObj = findPlayerBySID(sid);
    if (tmpObj) {
        tmpObj.startAnim(didHit, index);
    };
}

function renderPlayers(xOffset, yOffset, zIndex) {
    mainContext.globalAlpha = 1;
    for (var i = 0; i < players.length; ++i) {
        tmpObj = players[i];
        if (tmpObj.zIndex == zIndex) {
            tmpObj.animate(delta);
            if (tmpObj.visible) {
                tmpObj.skinRot += (0.002 * delta);
                tmpDir = ((tmpObj == player) ? getAttackDir() : tmpObj.dir) + tmpObj.dirPlus;
                mainContext.save();
                mainContext.translate(tmpObj.x - xOffset, tmpObj.y - yOffset);
                mainContext.rotate(tmpDir);
                renderPlayer(tmpObj, mainContext);
                mainContext.restore();
            }
        }
    }
}

function renderPlayer(obj, ctxt) {
    ctxt = ctxt || mainContext;
    ctxt.lineWidth = outlineWidth;
    ctxt.lineJoin = "miter";
    var handAngle = (Math.PI / 4) * (items.weapons[obj.weaponIndex].armS || 1);
    var oHandAngle = (obj.buildIndex < 0) ? (items.weapons[obj.weaponIndex].hndS || 1) : 1;
    var oHandDist = (obj.buildIndex < 0) ? (items.weapons[obj.weaponIndex].hndD || 1) : 1;

    if (obj.tailIndex > 0) {
        renderTail(obj.tailIndex, ctxt, obj);
    }

    if (obj.buildIndex < 0 && !items.weapons[obj.weaponIndex].aboveHand) {
        renderTool(items.weapons[obj.weaponIndex], config.weaponVariants[obj.weaponVariant].src, obj.scale, 0, ctxt);
        if (items.weapons[obj.weaponIndex].projectile != undefined && !items.weapons[obj.weaponIndex].hideProjectile) {
            renderProjectile(obj.scale, 0, items.projectiles[items.weapons[obj.weaponIndex].projectile], mainContext);
        }
    }

    ctxt.fillStyle = config.skinColors[obj.skinColor];
    renderCircle(obj.scale * Math.cos(handAngle), (obj.scale * Math.sin(handAngle)), 14);
    renderCircle((obj.scale * oHandDist) * Math.cos(-handAngle * oHandAngle), (obj.scale * oHandDist) * Math.sin(-handAngle * oHandAngle), 14);

    if (obj.buildIndex < 0 && items.weapons[obj.weaponIndex].aboveHand) {
        renderTool(items.weapons[obj.weaponIndex], config.weaponVariants[obj.weaponVariant].src, obj.scale, 0, ctxt);
        if (items.weapons[obj.weaponIndex].projectile != undefined && !items.weapons[obj.weaponIndex].hideProjectile) {
            renderProjectile(obj.scale, 0, items.projectiles[items.weapons[obj.weaponIndex].projectile], mainContext);
        }
    }

    if (obj.buildIndex >= 0) {
        var tmpSprite = getItemSprite(items.list[obj.buildIndex]);
        ctxt.drawImage(tmpSprite, obj.scale - items.list[obj.buildIndex].holdOffset, -tmpSprite.width / 2);
    }

    renderCircle(0, 0, obj.scale, ctxt);

    if (obj.skinIndex > 0) {
        ctxt.rotate(Math.PI / 2);
        renderSkin(obj.skinIndex, ctxt, null, obj);
    }
}

var skinSprites = {};
var skinPointers = {};
var tmpSkin;

function renderSkin(index, ctxt, parentSkin, owner) {
    tmpSkin = skinSprites[index];
    if (!tmpSkin) {
        var tmpImage = new Image();
        tmpImage.onload = function () {
            this.isLoaded = true;
            this.onload = null;
        };
        tmpImage.src = ".././img/hats/hat_" + index + ".png";
        skinSprites[index] = tmpImage;
        tmpSkin = tmpImage;
    }
    var tmpObj = parentSkin || skinPointers[index];
    if (!tmpObj) {
        for (var i = 0; i < hats.length; ++i) {
            if (hats[i].id == index) {
                tmpObj = hats[i];
                break;
            }
        }
        skinPointers[index] = tmpObj;
    }
    if (tmpSkin.isLoaded) {
        ctxt.drawImage(tmpSkin, -tmpObj.scale / 2, -tmpObj.scale / 2, tmpObj.scale, tmpObj.scale);
    }
    if (!parentSkin && tmpObj.topSprite) {
        ctxt.save();
        ctxt.rotate(owner.skinRot);
        renderSkin(index + "_top", ctxt, tmpObj, owner);
        ctxt.restore();
    }
}

var accessSprites = {};
var accessPointers = {};

function renderTail(index, ctxt, owner) {
    tmpSkin = accessSprites[index];
    if (!tmpSkin) {
        var tmpImage = new Image();
        tmpImage.onload = function () {
            this.isLoaded = true;
            this.onload = null;
        };
        tmpImage.src = ".././img/accessories/access_" + index + ".png";
        accessSprites[index] = tmpImage;
        tmpSkin = tmpImage;
    }
    var tmpObj = accessPointers[index];
    if (!tmpObj) {
        for (var i = 0; i < accessories.length; ++i) {
            if (accessories[i].id == index) {
                tmpObj = accessories[i];
                break;
            }
        }
        accessPointers[index] = tmpObj;
    }
    if (tmpSkin.isLoaded) {
        ctxt.save();
        ctxt.translate(-20 - (tmpObj.xOff || 0), 0);
        if (tmpObj.spin) {
            ctxt.rotate(owner.skinRot);
        }
        ctxt.drawImage(tmpSkin, -(tmpObj.scale / 2), -(tmpObj.scale / 2), tmpObj.scale, tmpObj.scale);
        ctxt.restore();
    }
}

var toolSprites = {};

function renderTool(obj, variant, x, y, ctxt) {
    var tmpSrc = obj.src + (variant || "");
    var tmpSprite = toolSprites[tmpSrc];
    if (!tmpSprite) {
        tmpSprite = new Image();
        tmpSprite.onload = function () {
            this.isLoaded = true;
        }
        tmpSprite.src = ".././img/weapons/" + tmpSrc + ".png";
        toolSprites[tmpSrc] = tmpSprite;
    }
    if (tmpSprite.isLoaded) {
        ctxt.drawImage(tmpSprite, x + obj.xOff - (obj.length / 2), y + obj.yOff - (obj.width / 2), obj.length, obj.width);
    }
}

var gameObjectSprites = {};

function getResSprite(obj) {
    var biomeID = (obj.y >= config.mapScale - config.snowBiomeTop) ? 2 : ((obj.y <= config.snowBiomeTop) ? 1 : 0);
    var tmpIndex = (obj.type + "_" + obj.scale + "_" + biomeID);
    var tmpSprite = gameObjectSprites[tmpIndex];
    if (!tmpSprite) {
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = tmpCanvas.height = (obj.scale * 2.1) + outlineWidth;
        var tmpContext = tmpCanvas.getContext('2d');
        tmpContext.translate((tmpCanvas.width / 2), (tmpCanvas.height / 2));
        tmpContext.rotate(UTILS.randFloat(0, Math.PI));
        tmpContext.strokeStyle = outlineColor;
        tmpContext.lineWidth = outlineWidth;
        tmpContext.lineJoin = "round";
        tmpContext.lineCap = "round";
        if (obj.type == 0) {
            var tmpScale;
            for (var i = 0; i < 2; ++i) {
                tmpScale = tmpObj.scale * (!i ? 1 : 0.5);
                renderStar(tmpContext, 7, tmpScale, tmpScale * 0.7);
                tmpContext.fillStyle = !biomeID ? (!i ? "#9ebf57" : "#b4db62") : (!i ? "#e3f1f4" : "#fff");
                tmpContext.fill();
                if (!i) {
                    tmpContext.stroke();
                }
            }
        } else if (obj.type == 1) {
            if (biomeID == 2) {
                tmpContext.fillStyle = "#606060";
                renderStar(tmpContext, 6, obj.scale * 0.3, obj.scale * 0.71);
                tmpContext.fill();
                tmpContext.stroke();
                tmpContext.fillStyle = "#89a54c";
                renderCircle(0, 0, obj.scale * 0.55, tmpContext);
                tmpContext.fillStyle = "#a5c65b";
                renderCircle(0, 0, obj.scale * 0.3, tmpContext, true);
            } else {
                renderBlob(tmpContext, 6, tmpObj.scale, tmpObj.scale * 0.7);
                tmpContext.fillStyle = biomeID ? "#e3f1f4" : "#89a54c";
                tmpContext.fill();
                tmpContext.stroke();
                tmpContext.fillStyle = biomeID ? "#6a64af" : "#c15555";
                var tmpRange;
                var berries = 4;
                var rotVal = mathPI2 / berries;
                for (var i = 0; i < berries; ++i) {
                    tmpRange = UTILS.randInt(tmpObj.scale / 3.5, tmpObj.scale / 2.3);
                    renderCircle(tmpRange * Math.cos(rotVal * i), tmpRange * Math.sin(rotVal * i), UTILS.randInt(10, 12), tmpContext);
                }
            }
        } else if (obj.type == 2 || obj.type == 3) {
            tmpContext.fillStyle = (obj.type == 2) ? (biomeID == 2 ? "#938d77" : "#939393") : "#e0c655";
            renderStar(tmpContext, 3, obj.scale, obj.scale);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = (obj.type == 2) ? (biomeID == 2 ? "#b2ab90" : "#bcbcbc") : "#ebdca3";
            renderStar(tmpContext, 3, obj.scale * 0.55, obj.scale * 0.65);
            tmpContext.fill();
        }
        tmpSprite = tmpCanvas;
        gameObjectSprites[tmpIndex] = tmpSprite;
    }
    return tmpSprite;
}

var itemSprites = [];

function getItemSprite(obj, asIcon) {
    var tmpSprite = itemSprites[obj.id];
    if (!tmpSprite || asIcon) {
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = tmpCanvas.height = (obj.scale * 2.5) + outlineWidth + (items.list[obj.id].spritePadding || 0);
        var tmpContext = tmpCanvas.getContext('2d');
        tmpContext.translate((tmpCanvas.width / 2), (tmpCanvas.height / 2));
        tmpContext.rotate(asIcon ? 0 : (Math.PI / 2));
        tmpContext.strokeStyle = outlineColor;
        tmpContext.lineWidth = outlineWidth * (asIcon ? (tmpCanvas.width / 81) : 1);
        tmpContext.lineJoin = "round";
        tmpContext.lineCap = "round";
        if (obj.name == "apple") {
            tmpContext.fillStyle = "#c15555";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fillStyle = "#89a54c";
            var leafDir = -(Math.PI / 2);
            renderLeaf(obj.scale * Math.cos(leafDir), obj.scale * Math.sin(leafDir), 25, leafDir + Math.PI / 2, tmpContext);
        } else if (obj.name == "cookie") {
            tmpContext.fillStyle = "#cca861";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fillStyle = "#937c4b";
            var chips = 4;
            var rotVal = mathPI2 / chips;
            var tmpRange;
            for (var i = 0; i < chips; ++i) {
                tmpRange = UTILS.randInt(obj.scale / 2.5, obj.scale / 1.7);
                renderCircle(tmpRange * Math.cos(rotVal * i), tmpRange * Math.sin(rotVal * i), UTILS.randInt(4, 5), tmpContext, true);
            }
        } else if (obj.name == "cheese") {
            tmpContext.fillStyle = "#f4f3ac";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fillStyle = "#c3c28b";
            var chips = 4;
            var rotVal = mathPI2 / chips;
            var tmpRange;
            for (var i = 0; i < chips; ++i) {
                tmpRange = UTILS.randInt(obj.scale / 2.5, obj.scale / 1.7);
                renderCircle(tmpRange * Math.cos(rotVal * i), tmpRange * Math.sin(rotVal * i), UTILS.randInt(4, 5), tmpContext, true);
            }
        } else if (obj.name == "wood wall" || obj.name == "stone wall" || obj.name == "castle wall") {
            tmpContext.fillStyle = (obj.name == "castle wall") ? "#83898e" : (obj.name == "wood wall") ? "#a5974c" : "#939393";
            var sides = (obj.name == "castle wall") ? 4 : 3;
            renderStar(tmpContext, sides, obj.scale * 1.1, obj.scale * 1.1);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = (obj.name == "castle wall") ? "#9da4aa" : (obj.name == "wood wall") ? "#c9b758" : "#bcbcbc";
            renderStar(tmpContext, sides, obj.scale * 0.65, obj.scale * 0.65);
            tmpContext.fill();
        } else if (obj.name == "spikes" || obj.name == "greater spikes" || obj.name == "poison spikes" ||
            obj.name == "spinning spikes") {
            tmpContext.fillStyle = (obj.name == "poison spikes") ? "#7b935d" : "#939393";
            var tmpScale = (obj.scale * 0.6);
            renderStar(tmpContext, (obj.name == "spikes") ? 5 : 6, obj.scale, tmpScale);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#a5974c";
            renderCircle(0, 0, tmpScale, tmpContext);
            tmpContext.fillStyle = "#c9b758";
            renderCircle(0, 0, tmpScale / 2, tmpContext, true);
        } else if (obj.name == "windmill" || obj.name == "faster windmill" || obj.name == "power mill") {
            tmpContext.fillStyle = "#a5974c";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fillStyle = "#c9b758";
            renderRectCircle(0, 0, obj.scale * 1.5, 29, 4, tmpContext);
            tmpContext.fillStyle = "#a5974c";
            renderCircle(0, 0, obj.scale * 0.5, tmpContext);
        } else if (obj.name == "mine") {
            tmpContext.fillStyle = "#939393";
            renderStar(tmpContext, 3, obj.scale, obj.scale);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#bcbcbc";
            renderStar(tmpContext, 3, obj.scale * 0.55, obj.scale * 0.65);
            tmpContext.fill();
        } else if (obj.name == "sapling") {
            for (var i = 0; i < 2; ++i) {
                var tmpScale = obj.scale * (!i ? 1 : 0.5);
                renderStar(tmpContext, 7, tmpScale, tmpScale * 0.7);
                tmpContext.fillStyle = (!i ? "#9ebf57" : "#b4db62");
                tmpContext.fill();
                if (!i) tmpContext.stroke();
            }
        } else if (obj.name == "pit trap") {
            tmpContext.fillStyle = "#a5974c";
            renderStar(tmpContext, 3, obj.scale * 1.1, obj.scale * 1.1);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = outlineColor;
            renderStar(tmpContext, 3, obj.scale * 0.65, obj.scale * 0.65);
            tmpContext.fill();
        } else if (obj.name == "boost pad") {
            tmpContext.fillStyle = "#7e7f82";
            renderRect(0, 0, obj.scale * 2, obj.scale * 2, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#dbd97d";
            renderTriangle(obj.scale * 1, tmpContext);
        } else if (obj.name == "turret") {
            tmpContext.fillStyle = "#a5974c";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#939393";
            var tmpLen = 50;
            renderRect(0, -tmpLen / 2, obj.scale * 0.9, tmpLen, tmpContext);
            renderCircle(0, 0, obj.scale * 0.6, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
        } else if (obj.name == "platform") {
            tmpContext.fillStyle = "#cebd5f";
            var tmpCount = 4;
            var tmpS = obj.scale * 2;
            var tmpW = tmpS / tmpCount;
            var tmpX = -(obj.scale / 2);
            for (var i = 0; i < tmpCount; ++i) {
                renderRect(tmpX - (tmpW / 2), 0, tmpW, obj.scale * 2, tmpContext);
                tmpContext.fill();
                tmpContext.stroke();
                tmpX += tmpS / tmpCount;
            }
        } else if (obj.name == "healing pad") {
            tmpContext.fillStyle = "#7e7f82";
            renderRect(0, 0, obj.scale * 2, obj.scale * 2, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#db6e6e";
            renderRectCircle(0, 0, obj.scale * 0.65, 20, 4, tmpContext, true);
        } else if (obj.name == "spawn pad") {
            tmpContext.fillStyle = "#7e7f82";
            renderRect(0, 0, obj.scale * 2, obj.scale * 2, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.fillStyle = "#71aad6";
            renderCircle(0, 0, obj.scale * 0.6, tmpContext);
        } else if (obj.name == "blocker") {
            tmpContext.fillStyle = "#7e7f82";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.rotate(Math.PI / 4);
            tmpContext.fillStyle = "#db6e6e";
            renderRectCircle(0, 0, obj.scale * 0.65, 20, 4, tmpContext, true);
        } else if (obj.name == "teleporter") {
            tmpContext.fillStyle = "#7e7f82";
            renderCircle(0, 0, obj.scale, tmpContext);
            tmpContext.fill();
            tmpContext.stroke();
            tmpContext.rotate(Math.PI / 4);
            tmpContext.fillStyle = "#d76edb";
            renderCircle(0, 0, obj.scale * 0.5, tmpContext, true);
        }
        tmpSprite = tmpCanvas;
        if (!asIcon) {
            itemSprites[obj.id] = tmpSprite;
        }
    }
    return tmpSprite;
}

function renderLeaf(x, y, l, r, ctxt) {
    var endX = x + (l * Math.cos(r));
    var endY = y + (l * Math.sin(r));
    var width = l * 0.4;
    ctxt.moveTo(x, y);
    ctxt.beginPath();
    ctxt.quadraticCurveTo(((x + endX) / 2) + (width * Math.cos(r + Math.PI / 2)), ((y + endY) / 2) + (width * Math.sin(r + Math.PI / 2)), endX, endY);
    ctxt.quadraticCurveTo(((x + endX) / 2) - (width * Math.cos(r + Math.PI / 2)), ((y + endY) / 2) - (width * Math.sin(r + Math.PI / 2)), x, y);
    ctxt.closePath();
    ctxt.fill();
    ctxt.stroke();
}

function renderCircle(x, y, scale, tmpContext, dontStroke, dontFill) {
    tmpContext = tmpContext || mainContext;
    tmpContext.beginPath();
    tmpContext.arc(x, y, scale, 0, 2 * Math.PI);
    if (!dontFill) {
        tmpContext.fill();
    }
    if (!dontStroke) {
        tmpContext.stroke();
    }
}

function renderStar(ctxt, spikes, outer, inner) {
    var rot = Math.PI / 2 * 3;
    var x, y;
    var step = Math.PI / spikes;
    ctxt.beginPath();
    if (Math.abs(inner - outer) < 0.001) {
        ctxt.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
        for (var i = 0; i < spikes * 2; i++) {
            rot += step;
            x = Math.cos(rot) * outer;
            y = Math.sin(rot) * outer;
            ctxt.lineTo(x, y);
        }
        ctxt.closePath();
        return;
    }
    ctxt.moveTo(0, -outer);
    for (var i = 0; i < spikes; i++) {
        x = Math.cos(rot) * outer;
        y = Math.sin(rot) * outer;
        ctxt.lineTo(x, y);
        rot += step;
        x = Math.cos(rot) * inner;
        y = Math.sin(rot) * inner;
        ctxt.lineTo(x, y);
        rot += step;
    }
    ctxt.lineTo(0, -outer);
    ctxt.closePath();
}

function renderRect(x, y, w, h, ctxt, stroke) {
    ctxt.fillRect(x - (w / 2), y - (h / 2), w, h);
    if (!stroke) {
        ctxt.strokeRect(x - (w / 2), y - (h / 2), w, h);
    }
}


function renderRectCircle(x, y, s, sw, seg, ctxt, stroke) {
    ctxt.save();
    ctxt.translate(x, y);
    seg = Math.ceil(seg / 2);
    for (var i = 0; i < seg; i++) {
        renderRect(0, 0, s * 2, sw, ctxt, stroke);
        ctxt.rotate(Math.PI / seg);
    }
    ctxt.restore();
}

function renderBlob(ctxt, spikes, outer, inner) {
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;
    var tmpOuter;
    ctxt.beginPath();
    ctxt.moveTo(0, -inner);
    for (var i = 0; i < spikes; i++) {
        tmpOuter = UTILS.randInt(outer + 0.9, outer * 1.2);
        ctxt.quadraticCurveTo(Math.cos(rot + step) * tmpOuter, Math.sin(rot + step) * tmpOuter, Math.cos(rot + (step * 2)) * inner, Math.sin(rot + (step * 2)) * inner);
        rot += step * 2;
    }
    ctxt.lineTo(0, -inner);
    ctxt.closePath();
}

function renderTriangle(s, ctx) {
    ctx = ctx || mainContext;
    var h = s * (Math.sqrt(3) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-s / 2, h / 2);
    ctx.lineTo(s / 2, h / 2);
    ctx.lineTo(0, -h / 2);
    ctx.fill();
    ctx.closePath();
}

function prepareMenuBackground() {
    var tmpMid = config.mapScale / 2;
    objectManager.add(0, tmpMid, tmpMid + 200, 0, config.treeScales[3], 0);
    objectManager.add(1, tmpMid, tmpMid - 480, 0, config.treeScales[3], 0);
    objectManager.add(2, tmpMid + 300, tmpMid + 450, 0, config.treeScales[3], 0);
    objectManager.add(3, tmpMid - 950, tmpMid - 130, 0, config.treeScales[2], 0);
    objectManager.add(4, tmpMid - 750, tmpMid - 400, 0, config.treeScales[3], 0);
    objectManager.add(5, tmpMid - 700, tmpMid + 400, 0, config.treeScales[2], 0);
    objectManager.add(6, tmpMid + 800, tmpMid - 200, 0, config.treeScales[3], 0);
    objectManager.add(7, tmpMid - 260, tmpMid + 340, 0, config.bushScales[3], 1);
    objectManager.add(8, tmpMid + 760, tmpMid + 310, 0, config.bushScales[3], 1);
    objectManager.add(9, tmpMid - 800, tmpMid + 100, 0, config.bushScales[3], 1);
    objectManager.add(10, tmpMid - 800, tmpMid + 300, 0, items.list[4].scale, items.list[4].id, items.list[10]);
    objectManager.add(11, tmpMid + 650, tmpMid - 390, 0, items.list[4].scale, items.list[4].id, items.list[10]);
    objectManager.add(12, tmpMid - 400, tmpMid - 450, 0, config.rockScales[2], 2);
}

function loadGameObject(data) {
    for (var i = 0; i < data.length;) {
        objectManager.add(data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5], items.list[data[i + 6]], true, (data[i + 7] >= 0 ? {
            sid: data[i + 7]
        } : null));
        i += 8;
    }
}

function wiggleGameObject(dir, sid) {
    tmpObj = findObjectBySid(sid);
    if (tmpObj) {
        tmpObj.xWiggle += config.gatherWiggle * Math.cos(dir);
        tmpObj.yWiggle += config.gatherWiggle * Math.sin(dir);
    }
}

function shootTurret(sid, dir) {
    tmpObj = findObjectBySid(sid);
    if (tmpObj) {
        tmpObj.dir = dir;
        tmpObj.xWiggle += config.gatherWiggle * Math.cos(dir + Math.PI);
        tmpObj.yWiggle += config.gatherWiggle * Math.sin(dir + Math.PI);
    }
}

function addProjectile(x, y, dir, range, speed, indx, layer, sid) {
    if (inWindow) {
        projectileManager.addProjectile(x, y, dir, range, speed, indx, null, null, layer).sid = sid;
    }
}

function remProjectile(sid, range) {
    for (var i = 0; i < projectiles.length; ++i) {
        if (projectiles[i].sid == sid) {
            projectiles[i].range = range;
        }
    }
}

function animateAI(sid) {
    tmpObj = findAIBySID(sid);
    if (tmpObj) {
        tmpObj.startAnim();
    }
}

function loadAI(data) {
    for (var i = 0; i < ais.length; ++i) {
        ais[i].forcePos = !ais[i].visible;
        ais[i].visible = false;
    }
    if (data) {
        var tmpTime = Date.now();
        for (var i = 0; i < data.length;) {
            tmpObj = findAIBySID(data[i]);
            if (tmpObj) {
                tmpObj.index = data[i + 1];
                tmpObj.t1 = (tmpObj.t2 === undefined) ? tmpTime : tmpObj.t2;
                tmpObj.t2 = tmpTime;
                tmpObj.x1 = tmpObj.x;
                tmpObj.y1 = tmpObj.y;
                tmpObj.x2 = data[i + 2];
                tmpObj.y2 = data[i + 3];
                tmpObj.d1 = (tmpObj.d2 === undefined) ? data[i + 4] : tmpObj.d2;
                tmpObj.d2 = data[i + 4];
                tmpObj.health = data[i + 5];
                tmpObj.dt = 0;
                tmpObj.visible = true;
            } else {
                tmpObj = aiManager.spawn(data[i + 2], data[i + 3], data[i + 4], data[i + 1]);
                tmpObj.x2 = tmpObj.x;
                tmpObj.y2 = tmpObj.y;
                tmpObj.d2 = tmpObj.dir;
                tmpObj.health = data[i + 5];
                if (!aiManager.aiTypes[data[i + 1]].name) {
                    tmpObj.name = config.cowNames[data[i + 6]];
                }
                tmpObj.forcePos = true;
                tmpObj.sid = data[i];
                tmpObj.visible = true;
            }
            i += 7;
        }
    }
}

var aiSprites = {};

function renderAI(obj, ctxt) {
    var tmpIndx = obj.index;
    var tmpSprite = aiSprites[tmpIndx];
    if (!tmpSprite) {
        var tmpImg = new Image();
        tmpImg.onload = function () {
            this.isLoaded = true;
            this.onload = null;
        };
        tmpImg.src = ".././img/animals/" + obj.src + ".png";
        tmpSprite = tmpImg;
        aiSprites[tmpIndx] = tmpSprite;
    }
    if (tmpSprite.isLoaded) {
        var tmpScale = obj.scale * 1.2 * (obj.spriteMlt || 1);
        ctxt.drawImage(tmpSprite, -tmpScale, -tmpScale, tmpScale * 2, tmpScale * 2);
    }
}

function isOnScreen(x, y, s) {
    return (x + s >= 0 && x - s <= maxScreenWidth && y + s >= 0 && y - s <= maxScreenHeight)
}

function addPlayer(data, isYou) {
    var tmpPlayer = findPlayerByID(data[0]);
    if (!tmpPlayer) {
        tmpPlayer = new Player(data[0], data[1], config, UTILS, projectileManager, objectManager, players, ais, items, hats, accessories);
        players.push(tmpPlayer);
    }
    tmpPlayer.spawn(isYou ? moofoll : null);
    tmpPlayer.visible = false;
    tmpPlayer.x2 = undefined;
    tmpPlayer.y2 = undefined;
    tmpPlayer.setData(data);
    if (isYou) {
        player = tmpPlayer;
        camX = player.x;
        camY = player.y;
        updateItems();
        updateStatusDisplay();
        updateAge();
        updateUpgrades(0);
        gameUI.style.display = "block";
    }
}

function removePlayer(id) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].id == id) {
            players.splice(i, 1);
            break;
        }
    }
}

function updateItemCounts(index, value) {
    if (player) {
        player.itemCounts[index] = value;
    }
}

function updatePlayerValue(index, value, updateView) {
    if (player) {
        player[index] = value;
        if (updateView) {
            updateStatusDisplay();
        }
    }
}

function updateHealth(sid, value) {
    tmpObj = findPlayerBySID(sid);
    if (tmpObj) {
        tmpObj.health = value;
    }
}

function updatePlayers(data) {
    var tmpTime = Date.now();
    for (var i = 0; i < players.length; ++i) {
        players[i].forcePos = !players[i].visible;
        players[i].visible = false;
    }
    for (var i = 0; i < data.length;) {
        tmpObj = findPlayerBySID(data[i]);
        if (tmpObj) {
            tmpObj.t1 = (tmpObj.t2 === undefined) ? tmpTime : tmpObj.t2;
            tmpObj.t2 = tmpTime;
            tmpObj.x1 = tmpObj.x;
            tmpObj.y1 = tmpObj.y;
            tmpObj.x2 = data[i + 1];
            tmpObj.y2 = data[i + 2];
            tmpObj.d1 = (tmpObj.d2 === undefined) ? data[i + 3] : tmpObj.d2;
            tmpObj.d2 = data[i + 3];
            tmpObj.dt = 0;
            tmpObj.buildIndex = data[i + 4];
            tmpObj.weaponIndex = data[i + 5];
            tmpObj.weaponVariant = data[i + 6];
            tmpObj.team = data[i + 7];
            tmpObj.isLeader = data[i + 8];
            tmpObj.skinIndex = data[i + 9];
            tmpObj.tailIndex = data[i + 10];
            tmpObj.iconIndex = data[i + 11];
            tmpObj.zIndex = data[i + 12];
            tmpObj.visible = true;
        }
        i += 13;
    }
}

function findPlayerByID(id) {
    for (var i = 0; i < players.length; ++i) {
        if (players[i].id == id) {
            return players[i];
        }
    }
    return null;
}

function findPlayerBySID(sid) {
    for (var i = 0; i < players.length; ++i) {
        if (players[i].sid == sid) {
            return players[i];
        }
    }
    return null;
}

function findAIBySID(sid) {
    for (var i = 0; i < ais.length; ++i) {
        if (ais[i].sid == sid) {
            return ais[i];
        }
    }
    return null;
}

function findObjectBySid(sid) {
    for (var i = 0; i < gameObjects.length; ++i) {
        if (gameObjects[i].sid == sid) {
            return gameObjects[i];
        }
    }
    return null;
}

var lastPing = -1;
var fpsCounter = 0;
var lastFpsTime = Date.now();
var packetCounter = 0;
var packetCounterDisplay = 0;
var lastPacketTime = Date.now();
var performanceDisplay = null;
var pingValueElement = null;
var fpsValueElement = null;
var packetValueElement = null;

function initPerformanceDisplay() {
    performanceDisplay = document.getElementById("performanceDisplay");
    pingValueElement = document.getElementById("pingValue");
    fpsValueElement = document.getElementById("fpsValue");
    packetValueElement = document.getElementById("packetValue");
    updatePerformancePanelVisibility();
}

function updatePerformancePanelVisibility() {
    if (performanceDisplay) {
        performanceDisplay.style.display = showPing ? "flex" : "none";
    }
}

function incrementPacketCounter() {
    packetCounter++;
}

function updatePerformanceDisplay() {
    if (!performanceDisplay) {
        return;
    }
    // Update fps
    fpsCounter++;
    var currentTime = Date.now();
    if (currentTime - lastFpsTime >= 1000) {
        if (fpsValueElement) {
            fpsValueElement.textContent = fpsCounter;
        }
        fpsCounter = 0;
        lastFpsTime = currentTime;
    }
    if (currentTime - lastPacketTime >= 1000) {
        packetCounterDisplay = packetCounter;
        packetCounter = 0;
        lastPacketTime = currentTime;
        if (packetValueElement) {
            packetValueElement.textContent = packetCounterDisplay + "/s";
        }
    }
}

function pingSocketResponse() {
    var pingTime = Date.now() - lastPing;
    window.pingTime = pingTime;
    if (pingValueElement) {
        pingValueElement.textContent = pingTime + "ms";
    }
}

function pingSocket() {
    lastPing = Date.now();
    io.send("0");
}

function serverShutdownNotice(countdown) {
    if (countdown < 0) return;
    var minutes = Math.floor(countdown / 60);
    var seconds = countdown % 60;
    seconds = ("0" + seconds).slice(-2);
    shutdownDisplay.innerText = "Server restarting in " + minutes + ":" + seconds;
    shutdownDisplay.hidden = false;
}

window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

function doUpdate() {
    now = Date.now();
    delta = now - lastUpdate;
    lastUpdate = now;
    updateGame();
    updatePerformanceDisplay();
    window.requestAnimationFrame(doUpdate);
}

function startGame() {
    bindEvents();
    loadIcons();
    loadingText.style.display = "none";
    menuCardHolder.style.display = "flex";
    nameInput.value = getSavedVal("moo_name") || "";
    prepareUI();
    initPerformanceDisplay();
}

prepareMenuBackground();
doUpdate();

function openLink(link) {
    window.open(link, "_blank")
}

function switchServerMode(mode) {
    if (mode === "sandbox") {
        window.location.href = "//sandbox.moomoo.io/";
    } else {
        window.location.href = "//moomoo.io/";
    }
}

window.openLink = openLink;
window.aJoinReq = aJoinReq;
window.follmoo = follmoo;
window.kickFromClan = kickFromClan;
window.sendJoin = sendJoin;
window.leaveAlliance = leaveAlliance;
window.createAlliance = createAlliance;
window.storeBuy = storeBuy;
window.storeEquip = storeEquip;
window.showItemInfo = showItemInfo;
window.selectSkinColor = selectSkinColor;
window.changeStoreIndex = changeStoreIndex;
window.switchServerMode = switchServerMode;
window.incrementPacketCounter = incrementPacketCounter;
window.config = config;
