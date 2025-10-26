
import { Player } from "./modules/player.js";
import { AI } from "./modules/ai.js";
import { UTILS } from "./libs/utils.js";
import { config, shrink } from "./config.js";
import { ProjectileManager } from "./modules/projectileManager.js";
import { Projectile } from "./modules/projectile.js";
import { ObjectManager } from "./modules/objectManager.js";
import { GameObject } from "./modules/gameObject.js";
import { items } from "./modules/items.js";
import { AiManager } from "./modules/aiMaanager.js";
import { accessories, hats } from "./modules/store.js";
import { ClanManager } from "./modules/clanManager.js";

import NanoTimer from "nanotimer";
import { encode } from "msgpack-lite";
import { delay } from "./modules/delay.js";

export class Game {

    // var
    players = [];
    ais = [];
    projectiles = [];
    game_objects = [];

    server = {
        broadcast: async (type, ...data) => {
            await delay();
            for (const player of this.players) {
                if (!player.socket) continue;
                player.socket.send(encode([
                    type,
                    data
                ]));
            }

        }
    };

    // managers
    ai_manager = new AiManager(this.ais, AI, this.players, items, this.object_manager, config, UTILS, () => {}, this.server);
    object_manager = new ObjectManager(GameObject, this.game_objects, UTILS, config, this.players, this.server);
    projectile_manager = new ProjectileManager(Projectile, this.projectiles, this.players, this.ais, this.object_manager, items, config, UTILS, this.server);
    clan_manager = new ClanManager(this.players, this.server);

    id_storage = new Array(config.maxPlayersHard).fill(true);

    constructor() {

        const nano = (1000 / config.serverUpdateRate);
        const timer = new NanoTimer;

        let last = 0;
        let minimap_cd = config.minimapRate;

        setInterval(() => {

            const t = performance.now();

            const delta = t - last;
            last = t;

            let kills = 0;
            let leader = null;

            const updt_map = minimap_cd <= 0;

            if (updt_map) {
                minimap_cd = config.minimapRate;
            } else {
                minimap_cd -= delta;
            }

            const minimap_ext = [];

            for (const player of this.players) {

                player.update(delta);
                player.iconIndex = 0;

                if (!player.alive) continue;

                if (kills < player.kills) {
                    kills = player.kills;
                    leader = player;
                }

                if (updt_map) {
                    minimap_ext.push({
                        sid: player.sid,
                        x: player.x,
                        y: player.y
                    });
                }

            }

            if (leader) leader.iconIndex = 1;

            for (const projectile of this.projectiles)
                projectile.update(delta);

            /*for (const object of this.game_objects) 
                object.update(delta);*/

            // leaderboard
            {

                const sort = this.players.filter(x => x.alive).sort((a, b) => {
                    return b.points - a.points;
                });
                const sorts = [];
                for (let i = 0; i < Math.min(10, sort.length); i++) {
                    sorts.push(sort[i]);
                }

                this.server.broadcast("5", sorts.flatMap(p => [p.sid, p.name, p.points]));

            }

            for (const player of this.players) {

                const sent_players = [];
                const sent_objects = [];
            
                for (const player2 of this.players) {

                    if (!player.canSee(player2) || !player2.alive) {
                        continue;
                    }

                    if (!player2.sentTo[player.id]) {
                        player2.sentTo[player.id] = true;
                        player.send("2", player2.getData(), player.id === player2.id);
                    }
                    sent_players.push(player2.getInfo());

                }

                for (const object of this.game_objects) {

                    if (
                        !object.sentTo[player.id] && object.active && object.visibleToPlayer(player) && player.canSee(object)
                    ) {
                        sent_objects.push(object);
                        object.sentTo[player.id] = true;
                    }

                }

                player.send("33", sent_players.flatMap(data => data));

                // ais
                player.send("a", null);

                if (sent_objects.length > 0) {
                    player.send("6", sent_objects.flatMap(object => [
                        object.sid,
                        UTILS.fixTo(object.x, 1),
                        UTILS.fixTo(object.y, 1),
                        object.dir,
                        object.scale,
                        object.type,
                        object.id,
                        object.owner ? object.owner.sid : -1
                    ]));
                }

                if (minimap_ext.length === 0) continue;

                player.send("mm", minimap_ext.filter(x => x.sid !== player.sid).flatMap(x => [x.x, x.y]));

            }

        }, nano);

        const init_objects = () => {

            const s2 = shrink <= 1 ? shrink * .25 : shrink;

            let treesPerArea = 9 * 2 * s2;
            let bushesPerArea = 3 * 2 * s2;
            let totalRocks = 32 * 2 * s2;
            let goldOres = 7 * 2 * s2;
            let treeScales = [150, 160, 165, 175];
            let bushScales = [80, 85, 95];
            let rockScales = [80, 85, 90];
            let cLoc = function () {
                return Math.round(Math.random() * config.mapScale);
            };
            let rScale = function (scales) {
                return scales[Math.floor(Math.random() * scales.length)];
            };
            for (let i = 0; i < treesPerArea * 7;) {
                let newObject = [this.game_objects.length, cLoc(), cLoc(), 0, rScale(treeScales), 0, undefined, false, null];
                if (newObject[2] >= config.mapScale / 2 - config.riverWidth / 2 && newObject[2] <= config.mapScale / 2 + config.riverWidth / 2) continue;
                if (newObject[2] >= config.mapScale - config.snowBiomeTop) continue;
                if (this.object_manager.checkItemLocation(newObject[1], newObject[2], newObject[4], 0.6, null, false, null, true)) {
                    this.object_manager.add(...newObject);
                } else {
                    continue;
                }
                i++;
            };
            for (let i = 0; i < bushesPerArea * 7;) {
                let newObject = [this.game_objects.length, cLoc(), cLoc(), 0, rScale(bushScales), 1, undefined, false, null];
                if (newObject[2] >= config.mapScale / 2 - config.riverWidth / 2 && newObject[2] <= config.mapScale / 2 + config.riverWidth / 2) continue;
                if (this.object_manager.checkItemLocation(newObject[1], newObject[2], newObject[4], 0.6, null, false, null, true)) {
                    this.object_manager.add(...newObject);
                } else {
                    continue;
                }
                i++;
            };
            for (let i = 0; i < totalRocks;) {
                let newObject = [this.game_objects.length, cLoc(), cLoc(), 0, rScale(rockScales), 2, undefined, false, null];
                if (this.object_manager.checkItemLocation(newObject[1], newObject[2], newObject[4], 0.6, null, true, null, true)) {
                    this.object_manager.add(...newObject);
                } else {
                    continue;
                }
                i++;
            };
            for (let i = 0; i < goldOres;) {
                let newObject = [this.game_objects.length, cLoc(), cLoc(), 0, rScale(rockScales), 3, undefined, false, null];
                if (this.object_manager.checkItemLocation(newObject[1], newObject[2], newObject[4], 0.6, null, true, null, true)) {
                    this.object_manager.add(...newObject);
                } else {
                    continue;
                }
                i++;
            };
        };

        init_objects();

    }

    addPlayer(socket) {

        const string_id = UTILS.randomString(16);
        const sid = this.id_storage.findIndex(bool => bool);
        const player = new Player(
            string_id,
            sid,
            config,
            UTILS,
            this.projectile_manager,
            this.object_manager,
            this.players,
            this.ais,
            items,
            hats,
            accessories,
            socket,
            () => {},
            () => {}
        );

        player.send("io-init", player.id);
        player.send("id", {
            teams: this.clan_manager.ext()
        });

        this.id_storage[sid] = false;
        this.players.push(player);

        return player;

    }

    removePlayer(id) {

        for (let i = 0; i < this.players.length; i++) {

            const player = this.players[i];

            if (player.id === id) {
                this.server.broadcast("4", player.id);
                this.object_manager.removeAllItems(player.sid, this.server);
                this.players.splice(i, 1);
                this.id_storage[player.sid] = true;
                break;
            }

        }

    }

}