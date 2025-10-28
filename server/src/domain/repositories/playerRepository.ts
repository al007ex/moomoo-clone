import { Player, PlayerFactory } from "../entities/player.js";

export interface PlayerRepository {
  all(): ReadonlyArray<Player>;
  findById(id: string): Player | undefined;
}

export interface LegacyPlayerRepositoryOptions {
  readonly source: () => Iterable<any>;
  readonly factory: PlayerFactory;
}

export class LegacyPlayerRepository implements PlayerRepository {
  private readonly source: () => Iterable<any>;
  private readonly factory: PlayerFactory;
  private readonly store = new Map<any, Player>();
  private readonly byId = new Map<string, Player>();

  constructor(options: LegacyPlayerRepositoryOptions) {
    this.source = options.source;
    this.factory = options.factory;
  }

  all(): ReadonlyArray<Player> {
    const results: Player[] = [];
    const seen = new Set<any>();
    for (const raw of this.source()) {
      seen.add(raw);
      let player = this.store.get(raw);
      if (!player) {
        player = this.factory.fromRaw(raw);
        this.store.set(raw, player);
      } else {
        player.refreshFromRaw();
      }
      results.push(player);
      this.byId.set(player.id, player);
    }

    for (const [raw, player] of Array.from(this.store.entries())) {
      if (!seen.has(raw)) {
        this.store.delete(raw);
        this.byId.delete(player.id);
      }
    }

    return results;
  }

  findById(id: string): Player | undefined {
    const player = this.byId.get(id);
    if (player) {
      player.refreshFromRaw();
      return player;
    }
    for (const raw of this.source()) {
      const candidate = this.store.get(raw);
      if (candidate?.id === id) {
        candidate.refreshFromRaw();
        return candidate;
      }
    }
    return undefined;
  }
}
