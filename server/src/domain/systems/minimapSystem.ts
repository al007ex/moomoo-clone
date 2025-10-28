import type { GameSystem } from "../game/gameEngine.js";
import type { GameState, MinimapEntry } from "../game/state.js";

export interface MinimapSystemOptions {
  readonly getPlayers: () => Iterable<any>;
  readonly intervalMs: number;
}

export class MinimapSystem implements GameSystem {
  private readonly getPlayers: () => Iterable<any>;
  private readonly intervalMs: number;
  private elapsed = 0;

  constructor(options: MinimapSystemOptions) {
    this.getPlayers = options.getPlayers;
    this.intervalMs = Math.max(16, options.intervalMs);
  }

  update(state: GameState, dt: number): GameState {
    this.elapsed += dt;
    if (this.elapsed < this.intervalMs) {
      return state;
    }
    this.elapsed = 0;

    const minimap: MinimapEntry[] = Array.from(state.players.values())
      .filter(player => player.alive)
      .map(player => ({
        sid: player.sid,
        x: player.x,
        y: player.y
      }));

    for (const player of this.getPlayers()) {
      if (!player?.socket || typeof player.send !== "function") continue;
      const payload = minimap
        .filter(entry => entry.sid !== player.sid)
        .flatMap(entry => [entry.x, entry.y]);
      if (payload.length > 0) {
        player.send("mm", payload);
      }
    }

    return state.withMinimap(minimap);
  }
}
