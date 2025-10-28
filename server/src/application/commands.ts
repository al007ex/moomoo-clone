export enum GameCommandType {
  SpawnPlayer = "game.spawnPlayer",
  SetMoveDirection = "game.setMoveDirection",
  PerformAction = "game.performAction",
  ToggleAutoGather = "game.toggleAutoGather",
  SetDirection = "game.setDirection",
  SelectItem = "game.selectItem",
  CustomizeAppearance = "game.customizeAppearance",
  UpgradeChoice = "game.upgradeChoice",
  SendChat = "game.sendChat",
  KeepAlive = "game.keepAlive",
  CreateClan = "game.createClan",
  LeaveClan = "game.leaveClan",
  InviteClan = "game.inviteClan",
  AcceptClanInvite = "game.acceptClanInvite",
  KickClanMember = "game.kickClanMember",
  MapPing = "game.mapPing",
  ResetMoveDirection = "game.resetMoveDirection"
}

interface CommandBase {
  readonly type: GameCommandType;
  readonly sessionId: string;
}

export interface SpawnPlayerCommand extends CommandBase {
  readonly type: GameCommandType.SpawnPlayer;
  readonly userData: Record<string, unknown> & {
    name?: string;
    skin?: number;
    hat?: number;
    accessory?: number;
    color?: number;
    moofoll?: boolean;
  };
}

export interface SetMoveDirectionCommand extends CommandBase {
  readonly type: GameCommandType.SetMoveDirection;
  readonly direction: number | null;
}

export interface PerformActionCommand extends CommandBase {
  readonly type: GameCommandType.PerformAction;
  readonly active: boolean;
  readonly angle: number | null;
}

export interface ToggleAutoGatherCommand extends CommandBase {
  readonly type: GameCommandType.ToggleAutoGather;
  readonly toggle: boolean;
}

export interface SetDirectionCommand extends CommandBase {
  readonly type: GameCommandType.SetDirection;
  readonly direction: number;
}

export interface SelectItemCommand extends CommandBase {
  readonly type: GameCommandType.SelectItem;
  readonly itemId: number;
  readonly equipWeapon: boolean;
}

export interface CustomizeAppearanceCommand extends CommandBase {
  readonly type: GameCommandType.CustomizeAppearance;
  readonly purchase: boolean;
  readonly itemId: number;
  readonly isAccessory: boolean;
}

export interface UpgradeChoiceCommand extends CommandBase {
  readonly type: GameCommandType.UpgradeChoice;
  readonly choice: number;
}

export interface SendChatCommand extends CommandBase {
  readonly type: GameCommandType.SendChat;
  readonly message: string;
}

export interface KeepAliveCommand extends CommandBase {
  readonly type: GameCommandType.KeepAlive;
}

export interface CreateClanCommand extends CommandBase {
  readonly type: GameCommandType.CreateClan;
  readonly name: string;
}

export interface LeaveClanCommand extends CommandBase {
  readonly type: GameCommandType.LeaveClan;
}

export interface InviteClanCommand extends CommandBase {
  readonly type: GameCommandType.InviteClan;
  readonly target: string;
}

export interface AcceptClanInviteCommand extends CommandBase {
  readonly type: GameCommandType.AcceptClanInvite;
  readonly target: string | number;
  readonly leader: string | number | null;
}

export interface KickClanMemberCommand extends CommandBase {
  readonly type: GameCommandType.KickClanMember;
  readonly target: string | number;
}

export interface MapPingCommand extends CommandBase {
  readonly type: GameCommandType.MapPing;
}

export interface ResetMoveDirectionCommand extends CommandBase {
  readonly type: GameCommandType.ResetMoveDirection;
}

export type GameCommand =
  | SpawnPlayerCommand
  | SetMoveDirectionCommand
  | PerformActionCommand
  | ToggleAutoGatherCommand
  | SetDirectionCommand
  | SelectItemCommand
  | CustomizeAppearanceCommand
  | UpgradeChoiceCommand
  | SendChatCommand
  | KeepAliveCommand
  | CreateClanCommand
  | LeaveClanCommand
  | InviteClanCommand
  | AcceptClanInviteCommand
  | KickClanMemberCommand
  | MapPingCommand
  | ResetMoveDirectionCommand;
