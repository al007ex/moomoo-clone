import { Structure, StructureFactory } from "../entities/structure.js";
import type { Player } from "../entities/player.js";

export interface StructureRepository {
  all(): ReadonlyArray<Structure>;
  visibleTo(player: Player): ReadonlyArray<Structure>;
}

export interface LegacyStructureRepositoryOptions {
  readonly source: () => Iterable<any>;
  readonly factory: StructureFactory;
}

export class LegacyStructureRepository implements StructureRepository {
  private readonly source: () => Iterable<any>;
  private readonly factory: StructureFactory;
  private readonly store = new Map<any, Structure>();

  constructor(options: LegacyStructureRepositoryOptions) {
    this.source = options.source;
    this.factory = options.factory;
  }

  all(): ReadonlyArray<Structure> {
    const results: Structure[] = [];
    const seen = new Set<any>();
    for (const raw of this.source()) {
      seen.add(raw);
      let structure = this.store.get(raw);
      if (!structure) {
        structure = this.factory.fromRaw(raw);
        this.store.set(raw, structure);
      } else {
        structure.refreshFromRaw();
      }
      results.push(structure);
    }

    for (const raw of Array.from(this.store.keys())) {
      if (!seen.has(raw)) {
        this.store.delete(raw);
      }
    }

    return results;
  }

  visibleTo(player: Player): ReadonlyArray<Structure> {
    return this.all().filter(structure => structure.isActive() && structure.canBeSeenBy(player));
  }
}
