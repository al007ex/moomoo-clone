
import { Player } from "./modules/player.js";
import { AI } from "./modules/ai.js";
import { UTILS } from "./libs/utils.js";
import { config } from "./config.js";
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

export class Game {

    // var
    players = [];
    ais = [];
    projectiles = [];
    game_objects = [];

    server = {
        broadcast: async (type, ...data) => {
            for (const player of this.players) {
                if (!player.socket) continue;
                player.socket.send(encode([
                    type,
                    data
                ]));
            }

        },
        send: async (playerId, type, ...data) => {
            if (!playerId) return;
            const target = this.players.find(p => p.id === playerId);
            if (!target || !target.socket) return;
            target.socket.send(encode([type, data]));
        }
    };

    // managers
    ai_manager = null;
    object_manager = null;
    projectile_manager = null;
    clan_manager = null;

    id_storage = new Array(config.maxPlayersHard).fill(true);

    constructor() {

        this.object_manager = new ObjectManager(GameObject, this.game_objects, UTILS, config, this.players, this.server);
        this.ai_manager = new AiManager(this.ais, AI, this.players, items, this.object_manager, config, UTILS, (player, score) => {
            if (player && player.addResource) {
                player.addResource(3, score); // 3 = points/gold
            }
        }, this.server);
        this.projectile_manager = new ProjectileManager(Projectile, this.projectiles, this.players, this.ais, this.object_manager, items, config, UTILS, this.server);
        this.clan_manager = new ClanManager(this.players, this.server);
        this.aiSpawnPlan = this.buildAiSpawnPlan();
        this.aiSpawnCheckTimer = 0;

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

            this.updateAnimals(delta);

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

            const activeAis = this.ais.filter(ai => ai.active);

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
                const aiPayload = [];
                for (const ai of activeAis) {
                    if (!ai.alive) continue;
                    if (!player.canSee(ai)) {
                        continue;
                    }
                    aiPayload.push(
                        ai.sid,
                        ai.index,
                        UTILS.fixTo(ai.x, 1),
                        UTILS.fixTo(ai.y, 1),
                        UTILS.fixTo(ai.dir, 3),
                        Math.round(ai.health),
                        ai.nameIndex ?? 0
                    );
                }
                player.send("a", aiPayload.length > 0 ? aiPayload : null);

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

            let treesPerArea = config.treesPerArea;
            let bushesPerArea = config.bushesPerArea;
            let totalRocks = config.totalRocks;
            let goldOres = config.goldOres;
            let treeScales = config.treeScales;
            let bushScales = config.bushScales;
            let rockScales = config.rockScales;
            let cLoc = function () {
                return Math.round(Math.random() * config.mapScale);
            };
            let rScale = function (scales) {
                return scales[Math.floor(Math.random() * scales.length)];
            };
            for (let i = 0; i < treesPerArea * config.areaCount;) {
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
            for (let i = 0; i < bushesPerArea * config.areaCount;) {
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
        this.ensureAnimals();

    }

    buildAiSpawnPlan() {
        const map = config.mapScale;
        return [{
            index: 0,
            desired: 6
        }, {
            index: 1,
            desired: 4
        }, {
            index: 4,
            desired: 3
        }, {
            index: 5,
            desired: 2
        }, {
            index: 2,
            desired: 2
        }, {
            index: 3,
            desired: 1
        }, {
            index: 6,
            desired: 1,
            positions: [{
                x: Math.round(map * 0.42),
                y: Math.round(map * 0.72)
            }]
        }, {
            index: 7,
            desired: 1,
            positions: [{
                x: Math.round(map * 0.18),
                y: Math.round(map * 0.22)
            }]
        }, {
            index: 8,
            desired: 1,
            positions: [{
                x: Math.round(map * 0.78),
                y: Math.round(map * 0.64)
            }]
        }].map(plan => ({
            ...plan,
            nextPosition: 0
        }));
    }

    ensureAnimals() {
        if (!this.ai_manager || !this.aiSpawnPlan) return;
        for (const plan of this.aiSpawnPlan) {
            let activeOfType = 0;
            for (const ai of this.ais) {
                if (ai.active && ai.index === plan.index) {
                    activeOfType++;
                }
            }
            let safety = 0;
            while (activeOfType < plan.desired && safety < plan.desired * 3) {
                const spawnPos = this.nextAnimalPosition(plan);
                if (!spawnPos) break;
                const dir = UTILS.randFloat(-Math.PI, Math.PI);
                this.ai_manager.spawn(spawnPos.x, spawnPos.y, dir, plan.index);
                activeOfType++;
                safety++;
            }
        }
    }

    nextAnimalPosition(plan) {
        const type = this.ai_manager.aiTypes[plan.index];
        if (!type) {
            return null;
        }
        if (plan.positions && plan.positions.length) {
            const pos = plan.positions[plan.nextPosition % plan.positions.length];
            plan.nextPosition = (plan.nextPosition + 1) % plan.positions.length;
            if (this.validateAnimalSpawn(plan.index, pos.x, pos.y)) {
                return {
                    x: pos.x,
                    y: pos.y
                };
            }
        }
        return this.randomAnimalPosition(plan.index);
    }

    validateAnimalSpawn(index, x, y) {
        const type = this.ai_manager.aiTypes[index];
        if (!type) return false;
        const scale = type.scale;
        if (x < scale || y < scale || x > config.mapScale - scale || y > config.mapScale - scale) {
            return false;
        }
        if (!this.object_manager.checkItemLocation(x, y, scale, 0.6, null, false, null)) {
            return false;
        }
        for (const ai of this.ais) {
            if (!ai.active) continue;
            if (UTILS.getDistance(x, y, ai.x, ai.y) < ai.scale + scale) {
                return false;
            }
        }
        return true;
    }

    randomAnimalPosition(index) {
        const type = this.ai_manager.aiTypes[index];
        if (!type) return null;
        for (let attempt = 0; attempt < 40; attempt++) {
            const x = UTILS.randInt(type.scale, config.mapScale - type.scale);
            const y = UTILS.randInt(type.scale, config.mapScale - type.scale);
            if (this.validateAnimalSpawn(index, x, y)) {
                return {
                    x,
                    y
                };
            }
        }
        return {
            x: UTILS.randInt(type.scale, config.mapScale - type.scale),
            y: UTILS.randInt(type.scale, config.mapScale - type.scale)
        };
    }

    updateAnimals(delta) {
        for (const ai of this.ais) {
            if (ai.active) {
                ai.update(delta);
            }
        }
        this.aiSpawnCheckTimer -= delta;
        if (this.aiSpawnCheckTimer <= 0) {
            this.aiSpawnCheckTimer = 1000;
            this.ensureAnimals();
        }
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
            (player, score) => {
                if (player && player.addResource) {
                    player.addResource(3, score); // 3 = points/gold
                }
            },
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
