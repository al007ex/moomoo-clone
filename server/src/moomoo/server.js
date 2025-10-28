
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

import { encode } from "msgpack-lite";
import { delay } from "./modules/delay.js";
import { GameEngine } from "../domain/game/gameEngine.js";
import { GameState } from "../domain/game/state.js";
import { FixedTimestepScheduler } from "../infrastructure/scheduler.js";
import { PlayerSystem } from "../domain/systems/playerSystem.js";
import { ProjectileSystem } from "../domain/systems/projectileSystem.js";
import { LeaderboardSystem } from "../domain/systems/leaderboardSystem.js";
import { MinimapSystem } from "../domain/systems/minimapSystem.js";
import { AiSystem } from "../domain/systems/aiSystem.js";
import { MapSystem } from "../domain/systems/mapSystem.js";

export class Game {

    // var
    players = [];
    ais = [];
    projectiles = [];
    game_objects = [];
    running = false;
    scheduler = null;
    engine = null;
    state = GameState.empty();
    lastSnapshot = null;

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

        },
        send: async (playerId, type, ...data) => {
            if (!playerId) return;
            const target = this.players.find(p => p.id === playerId);
            if (!target || !target.socket) return;
            await delay();
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

        this.initializeEngine();

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

    initializeEngine() {
        const timestep = 1000 / config.serverUpdateRate;
        this.scheduler = new FixedTimestepScheduler({
            timestep,
            maxUpdatesPerFrame: 8,
            lagCompensationThreshold: timestep * 8
        });
        this.engine = new GameEngine(this.scheduler, this.state);
        for (const system of this.buildSystems()) {
            this.engine.addSystem(system);
        }
        this.engine.onSnapshot(snapshot => {
            this.lastSnapshot = snapshot;
            this.state = GameState.fromSnapshot(snapshot);
        });
        this.engine.start();
        this.running = true;
    }

    buildSystems() {
        return [
            new PlayerSystem({
                getPlayers: () => this.players,
                getGameObjects: () => this.game_objects,
                getAis: () => this.ais,
                utils: UTILS
            }),
            new ProjectileSystem({
                getProjectiles: () => this.projectiles
            }),
            new AiSystem({
                updateAnimals: delta => this.updateAnimals(delta)
            }),
            new LeaderboardSystem({
                broadcast: this.server.broadcast
            }),
            new MinimapSystem({
                getPlayers: () => this.players,
                intervalMs: config.minimapRate
            }),
            new MapSystem({
                getMapCells: () => []
            })
        ];
    }

    createSnapshot() {
        return this.engine ? this.engine.createSnapshot() : null;
    }

    rollbackToSnapshot(snapshot) {
        if (!this.engine || !snapshot) {
            return;
        }
        this.engine.rollback(snapshot);
    }

    stop() {
        this.running = false;
        if (this.engine) {
            this.engine.stop();
        }
        if (this.scheduler && this.scheduler.isRunning?.()) {
            this.scheduler.stop();
        }
        for (const player of this.players) {
            const socket = player.socket;
            if (socket && typeof socket.close === "function") {
                try {
                    socket.close(1001, "Server shutting down");
                } catch {
                    // ignore socket close errors during shutdown cleanup
                }
            }
        }
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
