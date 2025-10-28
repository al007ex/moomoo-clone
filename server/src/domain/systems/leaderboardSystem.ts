import type { GameSystem } from "../game/gameEngine.js";
import type { GameState, LeaderboardEntry } from "../game/state.js";

type Broadcast = (type: string, ...payload: unknown[]) => Promise<void> | void;

export interface LeaderboardSystemOptions {
  readonly broadcast: Broadcast;
  readonly topEntries?: number;
}

export class LeaderboardSystem implements GameSystem {
  private readonly broadcast: Broadcast;
  private readonly topEntries: number;

  constructor(options: LeaderboardSystemOptions) {
    this.broadcast = options.broadcast;
    this.topEntries = options.topEntries ?? 10;
  }

  update(state: GameState, _dt: number): GameState {
    const entries: LeaderboardEntry[] = Array.from(state.players.values())
      .filter(player => player.alive)
      .sort((a, b) => b.points - a.points)
      .slice(0, this.topEntries)
      .map(player => ({
        sid: player.sid,
        name: player.name,
        points: player.points
      }));

    const flat = entries.flatMap(entry => [entry.sid, entry.name, entry.points]);
    void this.broadcast("5", flat);

    return state.withLeaderboard(entries);
  }
}
