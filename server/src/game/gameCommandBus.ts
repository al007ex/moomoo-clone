import type { ConnectionContext, GameCommandBus, PlayerSession } from "../network/contracts.js";
import type { CommandPublishOptions, GameCommandPublisher } from "../network/messageRouter.js";
import { MessageRouter } from "../network/messageRouter.js";
import { LoggingMiddleware } from "../network/middleware/loggingMiddleware.js";
import { ThrottlingMiddleware } from "../network/middleware/throttlingMiddleware.js";
import { AuthenticationMiddleware } from "../network/middleware/authenticationMiddleware.js";
import { createHandlers } from "../application/handlers/index.js";
import {
  GameCommandType,
  type GameCommand,
  type SpawnPlayerCommand,
  type SetMoveDirectionCommand,
  type PerformActionCommand,
  type ToggleAutoGatherCommand,
  type SetDirectionCommand,
  type SelectItemCommand,
  type CustomizeAppearanceCommand,
  type UpgradeChoiceCommand,
  type SendChatCommand,
  type KeepAliveCommand,
  type CreateClanCommand,
  type LeaveClanCommand,
  type InviteClanCommand,
  type AcceptClanInviteCommand,
  type KickClanMemberCommand,
  type MapPingCommand,
  type ResetMoveDirectionCommand
} from "../application/commands.js";
import { ClientMessageType } from "../protocol/messages.js";
import { Game } from "../moomoo/server.js";
import { UTILS } from "../moomoo/libs/utils.js";
import { items } from "../moomoo/modules/items.js";
import { hats, accessories } from "../moomoo/modules/store.js";
import { filter_chat } from "../moomoo/libs/filterchat.js";
import { config } from "../moomoo/config.js";
import type { Logger, MetricsCollector } from "../network/contracts.js";
import type { ActivePlayerSession } from "./session.js";

interface GameCommandBusDependencies {
  logger: Logger;
  metrics: MetricsCollector;
}

type ActiveSession = ActivePlayerSession;

type PublishContext = CommandPublishOptions;

export class DefaultGameCommandBus implements GameCommandBus, GameCommandPublisher {
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly router: MessageRouter;

  constructor(
    private readonly game: Game,
    private readonly deps: GameCommandBusDependencies
  ) {
    const logging = new LoggingMiddleware(deps.logger);
    const throttling = new ThrottlingMiddleware(deps.logger);
    const authentication = new AuthenticationMiddleware([
      ClientMessageType.Spawn,
      ClientMessageType.KeepAlive
    ]);

    this.router = new MessageRouter({
      logger: deps.logger,
      metrics: deps.metrics,
      publisher: this,
      handlers: createHandlers(),
      middleware: [
        logging.handle.bind(logging),
        throttling.handle.bind(throttling),
        authentication.handle.bind(authentication)
      ]
    });
  }

  async registerConnection(context: ConnectionContext): Promise<PlayerSession | null> {
    if (this.game.players.length > config.maxPlayersHard) {
      this.deps.logger.warn("Connection rejected because server is full", {
        players: this.game.players.length
      });
      return null;
    }

    const player = this.game.addPlayer(context.socket);

    const session: ActiveSession = {
      id: player.id,
      socket: context.socket,
      address: context.address,
      player,
      authenticated: false
    };

    this.sessions.set(session.id, session);
    this.deps.metrics.increment("game.connections.opened");

    return session;
  }

  async handleMessage(session: PlayerSession, payload: Uint8Array): Promise<void> {
    const active = this.sessions.get(session.id) ?? (session as ActiveSession);

    if (!active) {
      this.deps.logger.warn("Received message for unknown session", {
        sessionId: session.id
      });
      return;
    }

    await this.router.route(active, payload);
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

  async publish(command: GameCommand, context: PublishContext): Promise<void> {
    const session = this.sessions.get(command.sessionId);
    if (!session || session !== context.session) {
      this.deps.logger.warn("Discarding command for inactive session", {
        sessionId: command.sessionId,
        type: command.type
      });
      return;
    }

    await this.executeCommand(session, command, context);
  }

  private async executeCommand(session: ActiveSession, command: GameCommand, context: PublishContext): Promise<void> {
    switch (command.type) {
      case GameCommandType.SpawnPlayer:
        this.handleSpawn(session, command as SpawnPlayerCommand, context);
        session.authenticated = true;
        return;
      case GameCommandType.SetMoveDirection:
        this.handleMoveDirection(session, command as SetMoveDirectionCommand);
        return;
      case GameCommandType.PerformAction:
        this.handleAction(session, command as PerformActionCommand);
        return;
      case GameCommandType.ToggleAutoGather:
        this.handleToggleAutoGather(session, command as ToggleAutoGatherCommand);
        return;
      case GameCommandType.SetDirection:
        this.handleSetDirection(session, command as SetDirectionCommand);
        return;
      case GameCommandType.SelectItem:
        this.handleSelectItem(session, command as SelectItemCommand);
        return;
      case GameCommandType.CustomizeAppearance:
        this.handleCustomize(session, command as CustomizeAppearanceCommand, context);
        return;
      case GameCommandType.UpgradeChoice:
        this.handleUpgrade(session, command as UpgradeChoiceCommand, context);
        return;
      case GameCommandType.SendChat:
        this.handleChat(session, command as SendChatCommand);
        return;
      case GameCommandType.KeepAlive:
        this.handleKeepAlive(context);
        return;
      case GameCommandType.CreateClan:
        this.handleCreateClan(session, command as CreateClanCommand);
        return;
      case GameCommandType.LeaveClan:
        this.handleLeaveClan(session, command as LeaveClanCommand);
        return;
      case GameCommandType.InviteClan:
        this.handleInviteClan(session, command as InviteClanCommand);
        return;
      case GameCommandType.AcceptClanInvite:
        this.handleAcceptClan(session, command as AcceptClanInviteCommand);
        return;
      case GameCommandType.KickClanMember:
        this.handleKickClan(session, command as KickClanMemberCommand);
        return;
      case GameCommandType.MapPing:
        this.handleMapPing(session);
        return;
      case GameCommandType.ResetMoveDirection:
        this.handleResetMove(session);
        return;
      default: {
        const unknown = command as GameCommand;
        this.deps.logger.warn("Unhandled command type", { type: unknown.type });
        return;
      }
    }
  }

  private handleSpawn(session: ActiveSession, command: SpawnPlayerCommand, context: PublishContext): void {
    const player = session.player;
    if (player.alive) {
      return;
    }

    player.setUserData(command.userData);
    player.spawn(Boolean(command.userData.moofoll));
    context.queue.enqueue("1", player.sid);
  }

  private handleMoveDirection(session: ActiveSession, command: SetMoveDirectionCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    player.moveDir = command.direction ?? undefined;
  }

  private handleAction(session: ActiveSession, command: PerformActionCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    player.mouseState = command.active ? 1 : 0;
    if (command.active && player.buildIndex === -1) {
      player.hits++;
    }

    if (typeof command.angle === "number" && Number.isFinite(command.angle)) {
      player.dir = command.angle;
    }

    if (player.buildIndex >= 0) {
      const item = items.list[player.buildIndex];
      if (command.active) {
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
  }

  private handleToggleAutoGather(session: ActiveSession, command: ToggleAutoGatherCommand): void {
    const player = session.player;
    if (!player.alive || !command.toggle) {
      return;
    }
    player.autoGather = !player.autoGather;
  }

  private handleSetDirection(session: ActiveSession, command: SetDirectionCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (!UTILS.isNumber(command.direction)) {
      return;
    }
    player.dir = command.direction;
  }

  private handleSelectItem(session: ActiveSession, command: SelectItemCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    const index = command.itemId;

    if (!UTILS.isNumber(index)) {
      return;
    }

    if (command.equipWeapon) {
      const weapon = items.weapons[index];
      if (!weapon) {
        return;
      }
      if (player.weapons[weapon.type] !== index) {
        return;
      }
      player.buildIndex = -1;
      player.weaponIndex = index;
      return;
    }

    const item = items.list[index];
    if (!item) {
      return;
    }

    if (player.buildIndex === index) {
      player.buildIndex = -1;
      player.mouseState = 0;
      return;
    }

    player.buildIndex = index;
    player.mouseState = 0;
  }

  private handleCustomize(session: ActiveSession, command: CustomizeAppearanceCommand, context: PublishContext): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    const { purchase, itemId, isAccessory } = command;

    const emit = (type: string, ...payload: unknown[]) => {
      context.queue.enqueue(type, ...payload);
    };

    if (isAccessory) {
      const tail = accessories.find(acc => acc.id === itemId);
      if (tail) {
        if (purchase) {
          if (!player.tails[itemId] && player.points >= tail.price) {
            player.tails[itemId] = 1;
            emit("us", 0, itemId, 1);
          }
        } else if (player.tails[itemId]) {
          player.tail = tail;
          player.tailIndex = tail.id;
          emit("us", 1, itemId, 1);
        }
      } else if (itemId === 0) {
        player.tail = {};
        player.tailIndex = 0;
        emit("us", 1, 0, 1);
      }
      return;
    }

    const hat = hats.find(h => h.id === itemId);
    if (hat) {
      if (purchase) {
        if (!player.skins[itemId] && player.points >= hat.price) {
          player.skins[itemId] = 1;
          emit("us", 0, itemId, 0);
        }
      } else if (player.skins[itemId]) {
        player.skin = hat;
        player.skinIndex = hat.id;
        emit("us", 1, itemId, 0);
      }
    } else if (itemId === 0) {
      player.skin = {};
      player.skinIndex = 0;
      emit("us", 1, 0, 0);
    }
  }

  private handleUpgrade(session: ActiveSession, command: UpgradeChoiceCommand, context: PublishContext): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    if (player.upgradePoints <= 0) {
      return;
    }

    const choice = Number.parseInt(String(command.choice), 10);
    if (!Number.isFinite(choice)) {
      return;
    }

    const upgrItems = items.list.filter(item => item.age === player.upgrAge);
    const upgrWeapons = items.weapons.filter(weapon => weapon.age === player.upgrAge);

    const updated = (() => {
      if (choice < items.weapons.length) {
        const weapon = upgrWeapons.find(w => w.id === choice);
        if (!weapon) {
          return false;
        }
        player.weapons[weapon.type] = weapon.id;
        player.weaponXP[weapon.type] = 0;
        const type = player.weaponIndex < 9 ? 0 : 1;
        if (weapon.type === type) {
          player.weaponIndex = weapon.id;
        }
        return true;
      }

      const itemIndex = choice - items.weapons.length;
      if (!upgrItems.some(item => item.id === itemIndex)) {
        return false;
      }
      player.addItem(itemIndex);
      return true;
    })();

    if (!updated) {
      return;
    }

    player.upgrAge++;
    player.upgradePoints--;

    context.queue.enqueue("17", player.items, 0);
    context.queue.enqueue("17", player.weapons, 1);

    if (player.age >= 0) {
      context.queue.enqueue("16", player.upgradePoints, player.upgrAge);
    } else {
      context.queue.enqueue("16", 0, 0);
    }
  }

  private handleChat(session: ActiveSession, command: SendChatCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }

    if (player.chat_cooldown > 0) {
      return;
    }

    if (typeof command.message !== "string") {
      return;
    }

    const chat = filter_chat(command.message);
    if (chat.length === 0) {
      return;
    }

    this.game.server.broadcast("ch", player.sid, chat);
    player.chat_cooldown = 300;
  }

  private handleKeepAlive(context: PublishContext): void {
    context.queue.enqueue("pp");
  }

  private handleCreateClan(session: ActiveSession, command: CreateClanCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (player.team) {
      return;
    }
    if (player.clan_cooldown > 0) {
      return;
    }
    const name = command.name;
    if (typeof name !== "string" || name.length < 1 || name.length > 7) {
      return;
    }
    this.game.clan_manager.create(name, player);
  }

  private handleLeaveClan(session: ActiveSession, _command: LeaveClanCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (!player.team) {
      return;
    }
    if (player.clan_cooldown > 0) {
      return;
    }
    player.clan_cooldown = 200;
    if (player.is_owner) {
      this.game.clan_manager.remove(player.team);
      return;
    }
    this.game.clan_manager.kick(player.team, player.sid);
  }

  private handleInviteClan(session: ActiveSession, command: InviteClanCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (player.team) {
      return;
    }
    if (player.clan_cooldown > 0) {
      return;
    }
    player.clan_cooldown = 200;
    this.game.clan_manager.add_notify(command.target, player.sid);
  }

  private handleAcceptClan(session: ActiveSession, command: AcceptClanInviteCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (!player.team) {
      return;
    }
    if (player.clan_cooldown > 0) {
      return;
    }
    player.clan_cooldown = 200;
    this.game.clan_manager.confirm_join(player.team, command.target, command.leader);
    player.notify.delete(command.target);
  }

  private handleKickClan(session: ActiveSession, command: KickClanMemberCommand): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (!player.team) {
      return;
    }
    if (!player.is_owner) {
      return;
    }
    if (player.clan_cooldown > 0) {
      return;
    }
    player.clan_cooldown = 200;
    this.game.clan_manager.kick(player.team, command.target);
  }

  private handleMapPing(session: ActiveSession): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    if (player.ping_cooldown > 0) {
      return;
    }
    player.ping_cooldown = config.mapPingTime;
    this.game.server.broadcast("p", player.x, player.y);
  }

  private handleResetMove(session: ActiveSession): void {
    const player = session.player;
    if (!player.alive) {
      return;
    }
    player.resetMoveDir();
  }
}
