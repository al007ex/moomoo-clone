import { decode, encode } from "msgpack-lite";
import type { WebSocket } from "ws";

import { Game } from "../moomoo/server.js";
import { UTILS } from "../moomoo/libs/utils.js";
import { items } from "../moomoo/modules/items.js";
import { hats, accessories } from "../moomoo/modules/store.js";
import { delay } from "../moomoo/modules/delay.js";
import { filter_chat } from "../moomoo/libs/filterchat.js";
import { config } from "../moomoo/config.js";
import type { ConnectionContext, GameCommandBus, Logger, MetricsCollector, PlayerSession } from "../network/contracts.js";

interface ActiveSession extends PlayerSession {
  socket: WebSocket;
  player: any;
}

interface GameCommandBusDependencies {
  logger: Logger;
  metrics: MetricsCollector;
}

export class DefaultGameCommandBus implements GameCommandBus {
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(
    private readonly game: Game,
    private readonly deps: GameCommandBusDependencies
  ) {}

  async registerConnection(context: ConnectionContext): Promise<PlayerSession | null> {
    if (this.game.players.length > config.maxPlayersHard) {
      this.deps.logger.warn("Connection rejected because server is full", { players: this.game.players.length });
      return null;
    }

    const player = this.game.addPlayer(context.socket);

    const session: ActiveSession = {
      id: player.id,
      socket: context.socket,
      address: context.address,
      player
    };

    this.sessions.set(session.id, session);
    this.deps.metrics.increment("game.connections.opened");

    return session;
  }

  async handleMessage(session: PlayerSession, payload: Uint8Array): Promise<void> {
    const active = this.sessions.get(session.id) ?? (session as ActiveSession);
    if (!active) {
      this.deps.logger.warn("Received message for unknown session", { sessionId: session.id });
      return;
    }
    const player = active.player;
    const socket = active.socket;

    const emit = async (type: string, ...data: any[]) => {
      await delay();
      if (!player.socket) return;
      socket.send(encode([type, data]));
    };

    try {
      const decoded = decode(payload) as [unknown, unknown[]];
      const type = decoded?.[0];
      const data = Array.isArray(decoded?.[1]) ? (decoded[1] as any[]) : [];
      const t = type?.toString();

      await delay();

      switch (t) {
        case "sp": {
          if (player.alive) {
            break;
          }

          player.setUserData(data[0]);
          player.spawn(data[0]?.moofoll);
          player.send("1", player.sid);

          break;
        }
        case "33": {
          if (!player.alive) {
            break;
          }

          if (!(data[0] === undefined || data[0] === null) && !UTILS.isNumber(data[0])) break;

          player.moveDir = data[0];
          break;
        }
        case "c": {
          if (!player.alive) {
            break;
          }

          player.mouseState = data[0];
          if (data[0] && player.buildIndex === -1) {
            player.hits++;
          }

          if (UTILS.isNumber(data[1])) {
            player.dir = data[1];
          }

          if (player.buildIndex >= 0) {
            const item = items.list[player.buildIndex];
            if (data[0]) {
              player.packet_spam++;

              if (player.packet_spam >= 10000) {
                if (player.socket) {
                  player.socket.close();
                  player.socket = null;
                }
              }

              player.buildItem(item);
            }
            player.mouseState = 0;
            player.hits = 0;
          }
          break;
        }
        case "7": {
          if (!player.alive) {
            break;
          }

          if (data[0]) {
            player.autoGather = !player.autoGather;
          }
          break;
        }
        case "2": {
          if (!player.alive) {
            break;
          }

          if (!UTILS.isNumber(data[0])) break;

          player.dir = data[0];
          break;
        }
        case "5": {
          if (!player.alive) {
            break;
          }

          if (!UTILS.isNumber(data[0])) {
            break;
          }

          if (data[1]) {
            const wpn = items.weapons[data[0]];

            if (!wpn) {
              break;
            }

            if (player.weapons[wpn.type] !== data[0]) {
              break;
            }

            player.buildIndex = -1;
            player.weaponIndex = data[0];
            break;
          }

          const item = items.list[data[0]];

          if (!item) {
            break;
          }

          if (player.buildIndex === data[0]) {
            player.buildIndex = -1;
            player.mouseState = 0;
            break;
          }

          player.buildIndex = data[0];
          player.mouseState = 0;
          break;
        }
        case "13c": {
          if (!player.alive) {
            break;
          }

          const [type, id, index] = data;

          if (index) {
            const tail = accessories.find(acc => acc.id == id);

            if (tail) {
              if (type) {
                if (!player.tails[id] && player.points >= tail.price) {
                  player.tails[id] = 1;
                  emit("us", 0, id, 1);
                }
              } else {
                if (player.tails[id]) {
                  player.tail = tail;
                  player.tailIndex = player.tail.id;
                  emit("us", 1, id, 1);
                }
              }
            } else if (id == 0) {
              player.tail = {};
              player.tailIndex = 0;
              emit("us", 1, 0, 1);
            }
          } else {
            const hat = hats.find(h => h.id == id);

            if (hat) {
              if (type) {
                if (!player.skins[id] && player.points >= hat.price) {
                  player.skins[id] = 1;
                  emit("us", 0, id, 0);
                }
              } else {
                if (player.skins[id]) {
                  player.skin = hat;
                  player.skinIndex = player.skin.id;
                  emit("us", 1, id, 0);
                }
              }
            } else if (id == 0) {
              player.skin = {};
              player.skinIndex = 0;
              emit("us", 1, 0, 0);
            }
          }

          break;
        }
        case "6": {
          if (!player.alive) {
            break;
          }

          if (player.upgradePoints <= 0) break;

          const item = Number.parseInt(data[0]);

          const upgr_items = items.list.filter((x: any) => x.age === player.upgrAge);
          const upgr_weapons = items.weapons.filter((x: any) => x.age === player.upgrAge);

          const update = (() => {
            if (item < items.weapons.length) {
              const wpn = upgr_weapons.find((x: any) => x.id === item);

              if (!wpn) return false;

              player.weapons[wpn.type] = wpn.id;
              player.weaponXP[wpn.type] = 0;

              const type = player.weaponIndex < 9 ? 0 : 1;
              if (wpn.type === type) {
                player.weaponIndex = wpn.id;
              }

              return true;
            }

            const i2 = item - items.weapons.length;

            if (!upgr_items.some((x: any) => x.id === i2)) return false;

            player.addItem(i2);

            return true;
          })();

          if (!update) break;

          player.upgrAge++;
          player.upgradePoints--;

          player.send("17", player.items, 0);
          player.send("17", player.weapons, 1);

          if (player.age >= 0) {
            player.send("16", player.upgradePoints, player.upgrAge);
          } else {
            player.send("16", 0, 0);
          }

          break;
        }
        case "ch": {
          if (!player.alive) {
            break;
          }

          if (player.chat_cooldown > 0) {
            break;
          }

          if (typeof data[0] !== "string") {
            break;
          }

          const chat = filter_chat(data[0]);

          if (chat.length === 0) {
            break;
          }

          this.game.server.broadcast("ch", player.sid, chat);
          player.chat_cooldown = 300;

          break;
        }
        case "pp": {
          emit("pp");
          break;
        }
        case "8": {
          if (!player.alive) break;
          if (player.team) break;
          if (player.clan_cooldown > 0) break;
          if (typeof data[0] !== "string") break;
          if (data[0].length < 1 || data[0].length > 7) break;
          this.game.clan_manager.create(data[0], player);
          break;
        }
        case "9": {
          if (!player.alive) break;
          if (!player.team) break;
          if (player.clan_cooldown > 0) break;
          player.clan_cooldown = 200;
          if (player.is_owner) {
            this.game.clan_manager.remove(player.team);
            break;
          }

          this.game.clan_manager.kick(player.team, player.sid);
          break;
        }
        case "10": {
          if (!player.alive) break;
          if (player.team) break;
          if (player.clan_cooldown > 0) break;
          player.clan_cooldown = 200;
          this.game.clan_manager.add_notify(data[0], player.sid);
          break;
        }
        case "11": {
          if (!player.alive) break;
          if (!player.team) break;
          if (player.clan_cooldown > 0) break;
          player.clan_cooldown = 200;
          this.game.clan_manager.confirm_join(player.team, data[0], data[1]);
          player.notify.delete(data[0]);
          break;
        }
        case "12": {
          if (!player.alive) break;
          if (!player.team) break;
          if (!player.is_owner) break;
          if (player.clan_cooldown > 0) break;
          player.clan_cooldown = 200;
          this.game.clan_manager.kick(player.team, data[0]);
          break;
        }
        case "14": {
          if (!player.alive) break;
          if (player.ping_cooldown > 0) break;
          player.ping_cooldown = config.mapPingTime;
          this.game.server.broadcast("p", player.x, player.y);
          break;
        }
        case "rmd": {
          if (!player.alive) break;
          player.resetMoveDir();
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.deps.logger.error(error instanceof Error ? error : String(error));
    }
  }

  async handleDisconnect(session: PlayerSession, _code: number): Promise<void> {
    const active = this.sessions.get(session.id);
    if (!active) {
      return;
    }

    const player = active.player;

    if (player.team) {
      if (player.is_owner) {
        this.game.clan_manager.remove(player.team);
      } else {
        this.game.clan_manager.kick(player.team, player.sid);
      }
    }

    this.game.removePlayer(player.id);
    this.sessions.delete(session.id);
    this.deps.metrics.increment("game.connections.closed");
  }
}
