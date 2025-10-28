import type { GameSystem } from "../game/gameEngine.js";
import type { GameState, MinimapEntry } from "../game/state.js";
import type { PlayerRepository } from "../repositories/playerRepository.js";

export interface MinimapSystemOptions {
  readonly players: PlayerRepository;
  readonly intervalMs: number;
}

export class MinimapSystem implements GameSystem {
  private readonly players: PlayerRepository;
  private readonly intervalMs: number;
  private elapsed = 0;

  constructor(options: MinimapSystemOptions) {
    this.players = options.players;
    this.intervalMs = Math.max(16, options.intervalMs);
  }

  update(state: GameState, dt: number): GameState {
    this.elapsed += dt;
    if (this.elapsed < this.intervalMs) {
      return state;
    }
    this.elapsed = 0;

    const players = Array.from(this.players.all());

    const minimap: MinimapEntry[] = players
      .filter(player => player.alive)
      .map(player => ({
        sid: player.sid,
        x: player.position.x,
        y: player.position.y
      }));

    for (const player of players) {
      const socket = player.raw?.socket;
      if (!socket || typeof player.send !== "function") continue;
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
