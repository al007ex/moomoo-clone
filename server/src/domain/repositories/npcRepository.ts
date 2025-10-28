import { Npc, NpcFactory } from "../entities/npc.js";
import type { Player } from "../entities/player.js";

export interface NpcRepository {
  all(): ReadonlyArray<Npc>;
  alive(): ReadonlyArray<Npc>;
  visibleTo(player: Player): ReadonlyArray<Npc>;
}

export interface LegacyNpcRepositoryOptions {
  readonly source: () => Iterable<any>;
  readonly factory: NpcFactory;
}

export class LegacyNpcRepository implements NpcRepository {
  private readonly source: () => Iterable<any>;
  private readonly factory: NpcFactory;
  private readonly store = new Map<any, Npc>();

  constructor(options: LegacyNpcRepositoryOptions) {
    this.source = options.source;
    this.factory = options.factory;
  }

  all(): ReadonlyArray<Npc> {
    const results: Npc[] = [];
    const seen = new Set<any>();
    for (const raw of this.source()) {
      seen.add(raw);
      let npc = this.store.get(raw);
      if (!npc) {
        npc = this.factory.fromRaw(raw);
        this.store.set(raw, npc);
      } else {
        npc.refreshFromRaw();
      }
      results.push(npc);
    }

    for (const raw of Array.from(this.store.keys())) {
      if (!seen.has(raw)) {
        this.store.delete(raw);
      }
    }

    return results;
  }

  alive(): ReadonlyArray<Npc> {
    return this.all().filter(npc => npc.isAlive());
  }

  visibleTo(player: Player): ReadonlyArray<Npc> {
    return this.alive().filter(npc => npc.canBeSeenBy(player));
  }
}
