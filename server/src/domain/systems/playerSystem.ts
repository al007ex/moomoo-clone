import type { GameSystem } from "../game/gameEngine.js";
import type { GameState } from "../game/state.js";
import { serializeNpcPayload, serializePlayerInfo, serializePlayerState, serializeStructurePayload } from "../../application/serialization/index.js";
import type { PlayerRepository } from "../repositories/playerRepository.js";
import type { StructureRepository } from "../repositories/structureRepository.js";
import type { NpcRepository } from "../repositories/npcRepository.js";

export interface PlayerSystemOptions {
  readonly players: PlayerRepository;
  readonly structures: StructureRepository;
  readonly npcs: NpcRepository;
  readonly utils: { fixTo?: (value: number, precision: number) => number };
}

export class PlayerSystem implements GameSystem {
  private readonly players: PlayerRepository;
  private readonly structures: StructureRepository;
  private readonly npcs: NpcRepository;
  private readonly utils: { fixTo?: (value: number, precision: number) => number };

  constructor(options: PlayerSystemOptions) {
    this.players = options.players;
    this.structures = options.structures;
    this.npcs = options.npcs;
    this.utils = options.utils;
  }

  update(state: GameState, dt: number): GameState {
    const players = Array.from(this.players.all());

    let leader: typeof players[number] | null = null;
    let maxKills = -Infinity;

    for (const player of players) {
      player.tick(dt);
      player.setIcon(0);
      if (player.alive && player.kills > maxKills) {
        leader = player;
        maxKills = player.kills;
      }
    }

    if (leader) {
      leader.setIcon(1);
    }

    const snapshots = players.map(player => serializePlayerState(player));

    for (const player of players) {
      const sentPlayers: number[] = [];

      for (const other of players) {
        if (!player.canSee(other) || !other.alive) {
          continue;
        }
        if (other.markSentTo(player.id)) {
          player.send("2", other.getData(), player.id === other.id);
        }
        const info = serializePlayerInfo(other);
        if (info.length > 0) {
          sentPlayers.push(...info);
        }
      }

      player.send("33", sentPlayers);

      const visibleStructures = this.structures.visibleTo(player);
      const structurePayload = visibleStructures
        .filter(structure => structure.markSentTo(player.id))
        .flatMap(structure => serializeStructurePayload(structure, this.utils));

      if (structurePayload.length > 0) {
        player.send("6", structurePayload);
      }

      const aiPayload: number[] = [];
      for (const npc of this.npcs.visibleTo(player)) {
        if (!npc.isAlive()) continue;
        aiPayload.push(...serializeNpcPayload(npc, this.utils));
      }
      player.send("a", aiPayload.length > 0 ? aiPayload : null);
    }

    return state.withPlayers(snapshots);
  }
}
