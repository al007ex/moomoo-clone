import e from "express";
import path from "node:path";
import fs from "node:fs";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { decode, encode } from "msgpack-lite";
import { Game } from "./moomoo/server.js";
import { Player } from "./moomoo/modules/player.js";
import { items } from "./moomoo/modules/items.js";
import { UTILS } from "./moomoo/libs/utils.js";
import { hats, accessories } from "./moomoo/modules/store.js";
import { filter_chat } from "./moomoo/libs/filterchat.js";
import { config } from "./moomoo/config.js";
import { ConnectionLimit } from "./moomoo/libs/limit.js";
import { fileURLToPath } from "node:url";
import cors from "cors";

const app = e();

app.use(cors()); 

const colimit = new ConnectionLimit(4);

const server = createServer(app);
const wss = new WebSocketServer({
    server
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIST_DIR = path.resolve(__dirname, "../../dist/client");
const INDEX = path.join(CLIENT_DIST_DIR, "index.html");
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";

if (!fs.existsSync(INDEX)) {
    console.warn("[server] Client build not found. Run `npm run build --workspace client` first.");
}

app.get("/", (req, res) => {
    res.sendFile(INDEX);
});

app.get("/ping", (_req, res) => {
    res.send("Ok");
});

app.use(e.static(CLIENT_DIST_DIR));

const game = new Game;

wss.on("connection", async (socket, req) => {

    if (
        game.players.length > config.maxPlayersHard
    ) {
        return void socket.close();
    }

    const addr = req.headers["x-forwarded-for"]?.split(",")[0] ?? req.socket.remoteAddress;

    if (
        colimit.check(addr)
    ) {
        return void socket.close(4001);
    }

    colimit.up(addr);

    const player = game.addPlayer(socket);

    const emit = async (type, ...data) => {

        if (!player.socket) return;
        socket.send(encode([type, data]));
    };

    const handleInvalidPacket = reason => {

        const identifier = typeof player.sid !== "undefined" ? player.sid : "unknown";
        console.warn(`[server] Closing connection for player ${identifier} at ${addr}: ${reason}`);

        if (player.socket) {
            try {
                player.socket.close(4002);
            } catch (closeError) {
                console.error("Failed to close socket after invalid packet:", closeError);
            } finally {
                player.socket = null;
            }
        }

    };

    socket.on("message", async msg => {

        try {

            const now = Date.now();
            if (!player.packetWindowStart || (now - player.packetWindowStart) >= 1000) {
                player.packetWindowStart = now;
                player.packetCounter = 0;
            }
            player.packetCounter++;
            if (player.packetCounter > 1000) {
                handleInvalidPacket(`packet rate limit exceeded (${player.packetCounter} > 1000)`);
                return;
            }

            const decoded = decode(new Uint8Array(msg));

            if (!Array.isArray(decoded) || decoded.length < 2) {
                handleInvalidPacket("malformed packet structure");
                return;
            }

            const rawType = decoded[0];
            const payload = decoded[1];

            const t = typeof rawType === "string"
                ? rawType
                : (typeof rawType === "number" || typeof rawType === "bigint")
                    ? rawType.toString()
                    : null;

            if (!t || t.length === 0 || t.length > 3) {
                handleInvalidPacket("invalid packet identifier");
                return;
            }

            if (!Array.isArray(payload)) {
                handleInvalidPacket("packet payload is not an array");
                return;
            }

            const data = payload;

            switch(t) {
                case "M": {

                    if (player.alive) {
                        break;
                    }

                    player.setUserData(data[0]);
                    player.spawn(data[0]?.moofoll);
                    player.send("C", player.sid);

                    break;
                }
                case "9": {

                    if (!player.alive) {
                        break;
                    }

                    if (!(data[0] === undefined || data[0] === null) && !UTILS.isNumber(data[0])) break;

                    player.moveDir = data[0];
                    break;

                }
                case "F": {

                    if (!player.alive) {
                        break;
                    }

                    player.mouseState = data[0];
                    if (data[0] && player.buildIndex === -1) {
                        player.hits++;
                    }
    
                    if (UTILS.isNumber(data[1])) {
                        player.dir = data[1];
                    }
    
                    if (player.buildIndex >= 0) {
                        const item = items.list[player.buildIndex];
                        if (data[0]) {

                            player.packet_spam++;

                            if (player.packet_spam >= 10000) {
                                if (player.socket) {
                                    player.socket.close();
                                    player.socket = null;
                                }
                            }

                            player.buildItem(item);
                            
                        }
                        player.mouseState = 0;
                        player.hits = 0;
                    }
                    break;

                }
                case "K": {
                    if (!player.alive) {
                        break;
                    }

                    if (data[0]) {
                        player.autoGather = !player.autoGather;
                    }
                    break;

                }
                case "D": {

                    if (!player.alive) {
                        break;
                    }

                    if (!UTILS.isNumber(data[0])) break;

                    player.dir = data[0];
                    break;

                }
                case "z": {

                    if (!player.alive) {
                        break;
                    }

                    if (!UTILS.isNumber(data[0])) {
                        break;
                    }

                    if (data[1]) {

                        const wpn = items.weapons[data[0]];

                        if (!wpn) {
                            break;
                        }

                        if (player.weapons[wpn.type] !== data[0]) {
                            break;
                        }

                        player.buildIndex = -1;
                        player.weaponIndex = data[0];
                        break;
                    }

                    const item = items.list[data[0]];

                    if (!item) {
                        break;
                    }

                    if (player.buildIndex === data[0]) {
                        player.buildIndex = -1;
                        player.mouseState = 0;
                        break;
                    }

                    player.buildIndex = data[0];
                    player.mouseState = 0;
                    break;

                }
                case "c": {

                    if (!player.alive) {
                        break;
                    }

                    const [type, id, index] = data;

                    if (index) {
                        let tail = accessories.find(acc => acc.id == id);
            
                        if (tail) {
                            if (type) {
                                if (!player.tails[id] && player.points >= tail.price) {
                                    player.tails[id] = 1;
                                    emit("5", 0, id, 1);
                                }
                            } else {
                                if (player.tails[id]) {
                                    player.tail = tail;
                                    player.tailIndex = player.tail.id;
                                    emit("5", 1, id, 1);
                                }
                            }
                        } else {
                            if (id == 0) {
                                player.tail = {};
                                player.tailIndex = 0;
                                emit("5", 1, 0, 1);
                            }
                        }
                    } else {
                        let hat = hats.find(hat => hat.id == id);
            
                        if (hat) {
                            if (type) {
                                if (!player.skins[id] && player.points >= hat.price) {
                                    player.skins[id] = 1;
                                    emit("5", 0, id, 0);
                                }
                            } else {
                                if (player.skins[id]) {
                                    player.skin = hat;
                                    player.skinIndex = player.skin.id;
                                    emit("5", 1, id, 0);
                                }
                            }
                        } else {
                            if (id == 0) {
                                player.skin = {};
                                player.skinIndex = 0;
                                emit("5", 1, 0, 0);
                            }
                        }
                    }

                    break;

                }
                case "H": {

                    if (!player.alive) {
                        break;
                    }

                    if (player.upgradePoints <= 0) break;

                    const item = Number.parseInt(data[0]);

                    const upgr_items = items.list.filter(x => x.age === player.upgrAge);
                    const upgr_weapons = items.weapons.filter(x => x.age === player.upgrAge);

                    const update = (() => {

                        if (item < items.weapons.length) {

                            const wpn = upgr_weapons.find(x => x.id === item);

                            if (!wpn) return false;

                            player.weapons[wpn.type] = wpn.id;
                            player.weaponXP[wpn.type] = 0;

                            const type = player.weaponIndex < 9 ? 0 : 1;

                            if (wpn.type === type) {
                                player.weaponIndex = wpn.id;
                            }

                            return true;

                        }

                        const i2 = item - items.weapons.length;

                        if (!upgr_items.some(x => x.id === i2)) return false;

                        player.addItem(i2);

                        return true;
                        
                    })();

                    if (!update) break;

                    player.upgrAge++;
                    player.upgradePoints--;

                    player.send("V", player.items, 0);
                    player.send("V", player.weapons, 1);

                    if (player.age >= 0) {
                        player.send("U", player.upgradePoints, player.upgrAge);
                    } else {
                        player.send("U", 0, 0);
                    }

                    break;
                }
                case "6": {

                    if (!player.alive) {
                        break;
                    }

                    if (player.chat_cooldown > 0) {
                        break;
                    }

                    if (typeof data[0] !== "string") {
                        break;
                    }

                    const chat = filter_chat(data[0]);

                    if (chat.length === 0) {
                        break;
                    }

                    game.server.broadcast("6", player.sid, chat);
                    player.chat_cooldown = 300;

                    break;
                }
                case "0": {
                    emit("0");
                    break;
                }
                case "L": {

                    if (!player.alive) break;

                    if (player.team) break;

                    if (player.clan_cooldown > 0) break;

                    if (typeof data[0] !== "string") break;

                    if (data[0].length < 1 || data[0].length > 7) break;

                    const _created = game.clan_manager.create(data[0], player);

                    break;
                }
                case "N": {

                    if (!player.alive) break;

                    if (!player.team) break;

                    if (player.clan_cooldown > 0) break;

                    player.clan_cooldown = 200;

                    if (player.is_owner) {
                        game.clan_manager.remove(player.team);
                        break;
                    }
                    
                    game.clan_manager.kick(player.team, player.sid);
                    break;

                }
                case "b": {

                    if (!player.alive) break;

                    if (player.team) break;

                    if (player.clan_cooldown > 0) break;

                    player.clan_cooldown = 200;

                    game.clan_manager.add_notify(data[0], player.sid);
                    break;

                }
                case "P": {

                    if (!player.alive) break;

                    if (!player.team) break;

                    if (player.clan_cooldown > 0) break;

                    const [targetSid, joinDecision] = data ?? [];

                    if (typeof targetSid === "undefined") break;

                    if (typeof joinDecision !== "undefined") {

                        player.clan_cooldown = 200;

                        game.clan_manager.confirm_join(player.team, targetSid, joinDecision);
                        player.notify.delete(targetSid);
                        break;
                    }

                    if (!player.is_owner) break;

                    player.clan_cooldown = 200;

                    game.clan_manager.kick(player.team, targetSid);
                    break;

                }
                case "S": {

                    if (!player.alive) break;

                    if (player.ping_cooldown > 0) break;

                    player.ping_cooldown = config.mapPingTime;

                    game.server.broadcast("9", player.x, player.y);

                    break;
                }
                case "e": {

                    if (!player.alive) break;

                    player.resetMoveDir();

                    break;
                }
                default:
                    handleInvalidPacket(`unknown packet type "${t}"`);
                    return;
            }

        } catch(e) {

            // no need error handling i guess... but hmm
            console.error(e);
            handleInvalidPacket(`exception while handling packet: ${e?.message ?? e}`);

            // so okok
            // socket.close();

        }

    });

    socket.on("close", reason => {

        colimit.down(addr);

        if (player.team) {

            if (player.is_owner) {
                game.clan_manager.remove(player.team);
            } else {
                game.clan_manager.kick(player.team, player.sid);
            }

        }

        game.removePlayer(player.id);

    });

});

server.listen(PORT, HOST, (error) => {

    if (error) {
        throw error;
    }

    const address = server.address();
    const listenHost = typeof address === "string" ? address : address?.address ?? HOST;
    const listenPort = typeof address === "string" ? PORT : address?.port ?? PORT;
    console.log(`Server listening at http://${listenHost}:${listenPort}`);

});
