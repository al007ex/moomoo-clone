import { Projectile, ProjectileFactory } from "../entities/projectile.js";

export interface ProjectileRepository {
  all(): ReadonlyArray<Projectile>;
}

export interface LegacyProjectileRepositoryOptions {
  readonly source: () => Iterable<any>;
  readonly factory: ProjectileFactory;
}

export class LegacyProjectileRepository implements ProjectileRepository {
  private readonly source: () => Iterable<any>;
  private readonly factory: ProjectileFactory;
  private readonly store = new Map<any, Projectile>();

  constructor(options: LegacyProjectileRepositoryOptions) {
    this.source = options.source;
    this.factory = options.factory;
  }

  all(): ReadonlyArray<Projectile> {
    const results: Projectile[] = [];
    const seen = new Set<any>();
    for (const raw of this.source()) {
      seen.add(raw);
      let projectile = this.store.get(raw);
      if (!projectile) {
        projectile = this.factory.fromRaw(raw);
        this.store.set(raw, projectile);
      } else {
        projectile.refreshFromRaw();
      }
      results.push(projectile);
    }

    for (const raw of Array.from(this.store.keys())) {
      if (!seen.has(raw)) {
        this.store.delete(raw);
      }
    }

    return results;
  }
}
