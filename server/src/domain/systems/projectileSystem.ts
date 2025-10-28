import type { GameSystem } from "../game/gameEngine.js";
import type { EntityState, GameState } from "../game/state.js";

export interface ProjectileSystemOptions {
  readonly getProjectiles: () => Iterable<any>;
}

export class ProjectileSystem implements GameSystem {
  private readonly getProjectiles: () => Iterable<any>;

  constructor(options: ProjectileSystemOptions) {
    this.getProjectiles = options.getProjectiles;
  }

  update(state: GameState, dt: number): GameState {
    const projectiles = Array.from(this.getProjectiles());
    const snapshots: EntityState[] = [];

    for (const projectile of projectiles) {
      if (typeof projectile.update === "function") {
        projectile.update(dt);
      }
      snapshots.push({
        id: projectile.sid ?? projectile.id ?? String(projectile?.id ?? snapshots.length),
        type: "projectile",
        x: projectile.x,
        y: projectile.y,
        payload: {
          owner: projectile.owner?.sid ?? null,
          active: projectile.active ?? true
        }
      });
    }

    return state.withEntities("projectiles", snapshots);
  }
}
