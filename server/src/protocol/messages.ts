import { decode } from "msgpack-lite";
import { ZodError, ZodType, z } from "zod";

export enum ClientMessageType {
  Spawn = "sp",
  SetMoveDirection = "33",
  Action = "c",
  ToggleAutoGather = "7",
  SetDirection = "2",
  SelectItem = "5",
  CustomizeAppearance = "13c",
  Upgrade = "6",
  Chat = "ch",
  KeepAlive = "pp",
  CreateClan = "8",
  LeaveClan = "9",
  InviteClan = "10",
  AcceptClanInvite = "11",
  KickClanMember = "12",
  MapPing = "14",
  ResetMoveDirection = "rmd"
}

function createZodError(message: string, path: (string | number)[] = []): ZodError {
  return new ZodError([{ code: "custom", path, message }]);
}

const booleanLike = z.union([z.boolean(), z.number(), z.string(), z.null()]).transform(value => {
  if (value === null) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "0" || normalized === "false") {
      return false;
    }
    if (normalized === "1" || normalized === "true") {
      return true;
    }
    return Boolean(normalized);
  }
  return value;
});

const optionalBooleanLike = booleanLike.optional();

const userDataSchema = z
  .object({
    name: z.string().optional(),
    skin: z.number().optional(),
    hat: z.number().optional(),
    accessory: z.number().optional(),
    color: z.number().optional(),
    moofoll: optionalBooleanLike
  })
  .optional()
  .transform(value => value ?? {});

const spawnPayloadSchema = z
  .tuple([userDataSchema])
  .transform(([userData]) => ({ userData }));

const moveDirectionPayloadSchema = z
  .tuple([z.union([z.number(), z.literal(null)]).optional()])
  .transform(([direction]) => ({
    direction: typeof direction === "number" ? direction : null
  }));

const angleLike = z.union([z.number(), z.literal(null)]).optional();

const actionPayloadSchema = z
  .tuple([optionalBooleanLike, angleLike])
  .transform(([state, angle]) => ({
    active: typeof state === "boolean" ? state : state === undefined ? false : Boolean(state),
    angle: typeof angle === "number" ? angle : null
  }));

const toggleAutoGatherPayloadSchema = z
  .tuple([optionalBooleanLike])
  .transform(([flag]) => ({ toggle: Boolean(flag) }));

const setDirectionPayloadSchema = z
  .tuple([z.number()])
  .transform(([direction]) => ({ direction }));

const selectItemPayloadSchema = z
  .tuple([z.number(), optionalBooleanLike])
  .transform(([itemId, isWeapon]) => ({
    itemId,
    equipWeapon: Boolean(isWeapon)
  }));

const customizePayloadSchema = z
  .tuple([optionalBooleanLike, z.number(), optionalBooleanLike])
  .transform(([purchase, itemId, isAccessory]) => ({
    purchase: Boolean(purchase),
    itemId,
    isAccessory: Boolean(isAccessory)
  }));

const upgradePayloadSchema = z
  .tuple([z.union([z.number(), z.string()])])
  .transform(([choice]) => {
    const parsed = typeof choice === "string" ? Number.parseInt(choice, 10) : choice;
    if (!Number.isFinite(parsed)) {
      throw createZodError("Invalid upgrade choice");
    }
    return { choice: parsed };
  });

const chatPayloadSchema = z.tuple([z.string()]).transform(([message]) => ({ message }));

const singleStringPayloadSchema = z
  .tuple([z.string()])
  .transform(([value]) => ({ value }));

const inviteClanPayloadSchema = z
  .tuple([z.union([z.string(), z.number()])])
  .transform(([value]) => ({ value: String(value) }));

const acceptClanPayloadSchema = z
  .tuple([z.union([z.string(), z.number()]), z.union([z.string(), z.number(), z.null()]).optional()])
  .transform(([target, leader]) => ({ target, leader: leader ?? null }));

const kickClanPayloadSchema = z
  .tuple([z.union([z.string(), z.number()])])
  .transform(([target]) => ({ target }));

const mapPingPayloadSchema = z
  .tuple([optionalBooleanLike])
  .transform(([flag]) => ({ active: flag === undefined ? true : Boolean(flag) }));

const emptyPayloadSchema = z.tuple([]).transform(() => ({}));

export interface SpawnPayload {
  userData: Record<string, unknown> & {
    name?: string;
    skin?: number;
    hat?: number;
    accessory?: number;
    color?: number;
    moofoll?: boolean;
  };
}

export interface MoveDirectionPayload {
  direction: number | null;
}

export interface ActionPayload {
  active: boolean;
  angle: number | null;
}

export interface ToggleAutoGatherPayload {
  toggle: boolean;
}

export interface SetDirectionPayload {
  direction: number;
}

export interface SelectItemPayload {
  itemId: number;
  equipWeapon: boolean;
}

export interface CustomizePayload {
  purchase: boolean;
  itemId: number;
  isAccessory: boolean;
}

export interface UpgradePayload {
  choice: number;
}

export interface ChatPayload {
  message: string;
}

export interface KeepAlivePayload {}

export interface CreateClanPayload {
  value: string;
}

export interface LeaveClanPayload {}

export interface InviteClanPayload {
  value: string;
}

export interface AcceptClanPayload {
  target: string | number;
  leader: string | number | null;
}

export interface KickClanPayload {
  target: string | number;
}

export interface MapPingPayload {
  active: boolean;
}

export interface ResetMovePayload {}

export type ClientMessage =
  | { type: ClientMessageType.Spawn; payload: SpawnPayload }
  | { type: ClientMessageType.SetMoveDirection; payload: MoveDirectionPayload }
  | { type: ClientMessageType.Action; payload: ActionPayload }
  | { type: ClientMessageType.ToggleAutoGather; payload: ToggleAutoGatherPayload }
  | { type: ClientMessageType.SetDirection; payload: SetDirectionPayload }
  | { type: ClientMessageType.SelectItem; payload: SelectItemPayload }
  | { type: ClientMessageType.CustomizeAppearance; payload: CustomizePayload }
  | { type: ClientMessageType.Upgrade; payload: UpgradePayload }
  | { type: ClientMessageType.Chat; payload: ChatPayload }
  | { type: ClientMessageType.KeepAlive; payload: KeepAlivePayload }
  | { type: ClientMessageType.CreateClan; payload: CreateClanPayload }
  | { type: ClientMessageType.LeaveClan; payload: LeaveClanPayload }
  | { type: ClientMessageType.InviteClan; payload: InviteClanPayload }
  | { type: ClientMessageType.AcceptClanInvite; payload: AcceptClanPayload }
  | { type: ClientMessageType.KickClanMember; payload: KickClanPayload }
  | { type: ClientMessageType.MapPing; payload: MapPingPayload }
  | { type: ClientMessageType.ResetMoveDirection; payload: ResetMovePayload };

const payloadParsers: Record<ClientMessageType, ZodType<any>> = {
  [ClientMessageType.Spawn]: spawnPayloadSchema,
  [ClientMessageType.SetMoveDirection]: moveDirectionPayloadSchema,
  [ClientMessageType.Action]: actionPayloadSchema,
  [ClientMessageType.ToggleAutoGather]: toggleAutoGatherPayloadSchema,
  [ClientMessageType.SetDirection]: setDirectionPayloadSchema,
  [ClientMessageType.SelectItem]: selectItemPayloadSchema,
  [ClientMessageType.CustomizeAppearance]: customizePayloadSchema,
  [ClientMessageType.Upgrade]: upgradePayloadSchema,
  [ClientMessageType.Chat]: chatPayloadSchema,
  [ClientMessageType.KeepAlive]: emptyPayloadSchema,
  [ClientMessageType.CreateClan]: singleStringPayloadSchema,
  [ClientMessageType.LeaveClan]: emptyPayloadSchema,
  [ClientMessageType.InviteClan]: inviteClanPayloadSchema,
  [ClientMessageType.AcceptClanInvite]: acceptClanPayloadSchema,
  [ClientMessageType.KickClanMember]: kickClanPayloadSchema,
  [ClientMessageType.MapPing]: mapPingPayloadSchema,
  [ClientMessageType.ResetMoveDirection]: emptyPayloadSchema
};

function parseType(rawType: unknown): ClientMessageType {
  const type = typeof rawType === "string" ? rawType : String(rawType ?? "");
  if (!Object.values(ClientMessageType).includes(type as ClientMessageType)) {
    throw createZodError(`Unknown message type: ${type}`);
  }
  return type as ClientMessageType;
}

function ensureArray(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : [];
}

export function parseClientMessage(buffer: Uint8Array): ClientMessage {
  const decoded = decode(buffer);
  if (!Array.isArray(decoded) || decoded.length < 1) {
    throw createZodError("Invalid message envelope");
  }

  const [rawType, rawPayload] = decoded;
  const type = parseType(rawType);
  const parser = payloadParsers[type];
  const payload = parser.parse(ensureArray(rawPayload ?? []));

  return { type, payload } as ClientMessage;
}
