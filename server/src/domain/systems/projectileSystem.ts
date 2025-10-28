import type { GameSystem } from "../game/gameEngine.js";
import type { GameState } from "../game/state.js";
import { serializeProjectileState } from "../../application/serialization/index.js";
import type { ProjectileRepository } from "../repositories/projectileRepository.js";

export interface ProjectileSystemOptions {
  readonly projectiles: ProjectileRepository;
}

export class ProjectileSystem implements GameSystem {
  private readonly projectiles: ProjectileRepository;

  constructor(options: ProjectileSystemOptions) {
    this.projectiles = options.projectiles;
  }

  update(state: GameState, dt: number): GameState {
    const projectiles = Array.from(this.projectiles.all());
    const snapshots = projectiles.map(projectile => {
      projectile.tick(dt);
      return serializeProjectileState(projectile);
    });
    return state.withEntities("projectiles", snapshots);
  }
}
