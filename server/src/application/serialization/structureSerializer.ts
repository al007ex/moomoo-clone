import type { Structure } from "../../domain/entities/structure.js";
import type { EntityState } from "../../domain/game/state.js";

export function serializeStructureState(structure: Structure): EntityState {
  return structure.toState();
}

export function serializeStructurePayload(
  structure: Structure,
  utils: { fixTo?: (value: number, precision: number) => number }
): number[] {
  return structure.toNetworkPayload(utils);
}
