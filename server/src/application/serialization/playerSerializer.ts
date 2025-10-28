import type { Player } from "../../domain/entities/player.js";
import type { PlayerState } from "../../domain/game/state.js";

export function serializePlayerState(player: Player): PlayerState {
  return player.toState();
}

export function serializePlayerInfo(player: Player): number[] {
  const info = player.getInfo();
  return Array.isArray(info) ? info : [];
}
