import type { Projectile } from "../../domain/entities/projectile.js";
import type { EntityState } from "../../domain/game/state.js";

export function serializeProjectileState(projectile: Projectile): EntityState {
  return projectile.toState();
}
