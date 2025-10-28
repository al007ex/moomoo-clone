import type { GameSystem } from "../game/gameEngine.js";
import type { GameState, PlayerState } from "../game/state.js";

export interface PlayerSystemOptions {
  readonly getPlayers: () => Iterable<any>;
  readonly getGameObjects: () => Iterable<any>;
  readonly getAis: () => Iterable<any>;
  readonly utils: any;
}

export class PlayerSystem implements GameSystem {
  private readonly getPlayers: () => Iterable<any>;
  private readonly getGameObjects: () => Iterable<any>;
  private readonly getAis: () => Iterable<any>;
  private readonly utils: any;

  constructor(options: PlayerSystemOptions) {
    this.getPlayers = options.getPlayers;
    this.getGameObjects = options.getGameObjects;
    this.getAis = options.getAis;
    this.utils = options.utils;
  }

  update(state: GameState, dt: number): GameState {
    const players = Array.from(this.getPlayers());
    const objects = Array.from(this.getGameObjects());
    const activeAis = Array.from(this.getAis()).filter(ai => ai?.active);

    let leader: any = null;
    let maxKills = -Infinity;

    for (const player of players) {
      if (typeof player.update === "function") {
        player.update(dt);
      }
      if (player) {
        player.iconIndex = 0;
        if (player.alive && typeof player.kills === "number" && player.kills > maxKills) {
          maxKills = player.kills;
          leader = player;
        }
      }
    }

    if (leader) {
      leader.iconIndex = 1;
    }

    const snapshots: PlayerState[] = players.map(player => ({
      id: player.id,
      sid: player.sid,
      name: player.name,
      x: player.x,
      y: player.y,
      kills: player.kills ?? 0,
      points: player.points ?? 0,
      alive: Boolean(player.alive),
      iconIndex: player.iconIndex ?? 0
    }));

    for (const player of players) {
      const sentPlayers: number[] = [];
      const sentObjects: any[] = [];

      for (const other of players) {
        if (typeof player.canSee === "function" && !player.canSee(other)) {
          continue;
        }
        if (!other?.alive) {
          continue;
        }
        if (!other.sentTo) {
          other.sentTo = Object.create(null);
        }
        if (!other.sentTo[player.id]) {
          other.sentTo[player.id] = true;
          if (typeof player.send === "function") {
            player.send("2", typeof other.getData === "function" ? other.getData() : null, player.id === other.id);
          }
        }
        if (typeof other.getInfo === "function") {
          const info = other.getInfo();
          if (Array.isArray(info)) {
            sentPlayers.push(...info);
          }
        }
      }

      for (const object of objects) {
        if (!object) continue;
        if (!object.sentTo) {
          object.sentTo = Object.create(null);
        }
        if (
          !object.sentTo[player.id] &&
          object.active &&
          typeof object.visibleToPlayer === "function" &&
          object.visibleToPlayer(player) &&
          typeof player.canSee === "function" &&
          player.canSee(object)
        ) {
          object.sentTo[player.id] = true;
          sentObjects.push(object);
        }
      }

      if (typeof player.send === "function") {
        player.send("33", sentPlayers);
      }

      if (sentObjects.length > 0 && typeof player.send === "function") {
        const payload = sentObjects.flatMap(object => [
          object.sid,
          this.utils?.fixTo ? this.utils.fixTo(object.x, 1) : object.x,
          this.utils?.fixTo ? this.utils.fixTo(object.y, 1) : object.y,
          object.dir,
          object.scale,
          object.type,
          object.id,
          object.owner ? object.owner.sid : -1
        ]);
        player.send("6", payload);
      }

      const aiPayload: number[] = [];
      for (const ai of activeAis) {
        if (!ai?.alive) continue;
        if (typeof player.canSee === "function" && !player.canSee(ai)) {
          continue;
        }
        aiPayload.push(
          ai.sid,
          ai.index,
          this.utils?.fixTo ? this.utils.fixTo(ai.x, 1) : ai.x,
          this.utils?.fixTo ? this.utils.fixTo(ai.y, 1) : ai.y,
          this.utils?.fixTo ? this.utils.fixTo(ai.dir, 3) : ai.dir,
          Math.round(ai.health ?? 0),
          ai.nameIndex ?? 0
        );
      }
      if (typeof player.send === "function") {
        player.send("a", aiPayload.length > 0 ? aiPayload : null);
      }
    }

    return state.withPlayers(snapshots);
  }
}
