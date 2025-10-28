import type { Npc } from "../../domain/entities/npc.js";

export function serializeNpcPayload(
  npc: Npc,
  utils: { fixTo?: (value: number, precision: number) => number }
): number[] {
  return npc.toNetworkPayload(utils);
}
