import type { PlayerState } from "../game/state.js";
import type { VisibleEntity } from "./types.js";

export interface PlayerProps {
  readonly id: string;
  readonly sid: number;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly kills: number;
  readonly points: number;
  readonly alive: boolean;
  readonly iconIndex: number;
}

export interface PlayerContext {
  readonly raw?: any;
  readonly messenger?: PlayerMessenger;
}

export interface PlayerMessenger {
  send(player: Player, type: string, payload: unknown, isSelf?: boolean): void;
}

export interface PlayerFactoryOptions {
  readonly mapBounds: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };
  readonly minIconIndex?: number;
  readonly maxIconIndex?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export class PlayerFactory {
  private readonly bounds: PlayerFactoryOptions["mapBounds"];
  private readonly minIcon: number;
  private readonly maxIcon: number;

  constructor(private readonly options: PlayerFactoryOptions) {
    this.bounds = options.mapBounds;
    this.minIcon = options.minIconIndex ?? 0;
    this.maxIcon = options.maxIconIndex ?? 255;
  }

  fromRaw(raw: any): Player {
    return Player.create(
      {
        id: String(raw?.id ?? ""),
        sid: sanitizeFinite(Number(raw?.sid ?? -1), -1),
        name: String(raw?.name ?? ""),
        position: {
          x: clamp(sanitizeFinite(Number(raw?.x ?? 0)), this.bounds.minX, this.bounds.maxX),
          y: clamp(sanitizeFinite(Number(raw?.y ?? 0)), this.bounds.minY, this.bounds.maxY)
        },
        kills: Math.max(0, Math.floor(sanitizeFinite(Number(raw?.kills ?? 0), 0))),
        points: Math.max(0, Math.floor(sanitizeFinite(Number(raw?.points ?? 0), 0))),
        alive: Boolean(raw?.alive ?? true),
        iconIndex: clamp(Math.floor(sanitizeFinite(Number(raw?.iconIndex ?? 0), 0)), this.minIcon, this.maxIcon)
      },
      { raw }
    );
  }
}

export class Player {
  private _props: PlayerProps;
  private readonly context: PlayerContext;

  private constructor(props: PlayerProps, context: PlayerContext) {
    this._props = props;
    this.context = context;
    this.syncToRaw();
  }

  static create(props: PlayerProps, context: PlayerContext = {}): Player {
    const normalized = Player.normalize(props);
    return new Player(normalized, context);
  }

  private static normalize(props: PlayerProps): PlayerProps {
    const kills = Math.max(0, Math.floor(sanitizeFinite(props.kills, 0)));
    const points = Math.max(0, Math.floor(sanitizeFinite(props.points, 0)));
    const alive = Boolean(props.alive);
    const iconIndex = Math.max(0, Math.floor(sanitizeFinite(props.iconIndex, 0)));
    return {
      id: String(props.id),
      sid: sanitizeFinite(Number(props.sid), -1),
      name: String(props.name ?? ""),
      position: {
        x: sanitizeFinite(props.position?.x ?? 0),
        y: sanitizeFinite(props.position?.y ?? 0)
      },
      kills,
      points,
      alive,
      iconIndex
    };
  }

  get id(): string {
    return this._props.id;
  }

  get sid(): number {
    return this._props.sid;
  }

  get name(): string {
    return this._props.name;
  }

  get position(): { readonly x: number; readonly y: number } {
    return this._props.position;
  }

  get kills(): number {
    return this._props.kills;
  }

  get points(): number {
    return this._props.points;
  }

  get alive(): boolean {
    return this._props.alive;
  }

  get iconIndex(): number {
    return this._props.iconIndex;
  }

  get raw(): any {
    return this.context.raw;
  }

  refreshFromRaw(): void {
    const raw = this.context.raw;
    if (!raw) {
      return;
    }
    this._props = Player.normalize({
      id: String(raw.id ?? this._props.id),
      sid: sanitizeFinite(Number(raw.sid ?? this._props.sid), this._props.sid),
      name: String(raw.name ?? this._props.name),
      position: {
        x: sanitizeFinite(Number(raw.x ?? this._props.position.x), this._props.position.x),
        y: sanitizeFinite(Number(raw.y ?? this._props.position.y), this._props.position.y)
      },
      kills: sanitizeFinite(Number(raw.kills ?? this._props.kills), this._props.kills),
      points: sanitizeFinite(Number(raw.points ?? this._props.points), this._props.points),
      alive: Boolean(raw.alive ?? this._props.alive),
      iconIndex: sanitizeFinite(Number(raw.iconIndex ?? this._props.iconIndex), this._props.iconIndex)
    });
  }

  tick(dt: number): void {
    if (typeof this.context.raw?.update === "function") {
      this.context.raw.update(dt);
    }
    this.refreshFromRaw();
  }

  moveTo(x: number, y: number): void {
    this._props = {
      ...this._props,
      position: {
        x: sanitizeFinite(x, this._props.position.x),
        y: sanitizeFinite(y, this._props.position.y)
      }
    };
    this.syncToRaw();
  }

  awardPoints(delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }
    const points = Math.max(0, this._props.points + Math.round(delta));
    this._props = { ...this._props, points };
    this.syncToRaw();
  }

  registerKill(): void {
    this._props = { ...this._props, kills: this._props.kills + 1 };
    this.syncToRaw();
  }

  setAlive(alive: boolean): void {
    this._props = { ...this._props, alive: Boolean(alive) };
    this.syncToRaw();
  }

  setIcon(index: number): void {
    const normalized = Math.max(0, Math.floor(sanitizeFinite(index, this._props.iconIndex)));
    this._props = { ...this._props, iconIndex: normalized };
    this.syncToRaw();
  }

  canSee(entity: VisibleEntity): boolean {
    if (typeof this.context.raw?.canSee === "function") {
      return Boolean(this.context.raw.canSee(entity instanceof Player ? entity.raw ?? entity : entity));
    }
    return true;
  }

  send(type: string, payload: unknown, isSelf = false): void {
    if (typeof this.context.raw?.send === "function") {
      this.context.raw.send(type, payload, isSelf);
      return;
    }
    this.context.messenger?.send(this, type, payload, isSelf);
  }

  markSentTo(observerId: string): boolean {
    const raw = this.context.raw;
    if (!raw) {
      return true;
    }
    if (!raw.sentTo) {
      raw.sentTo = Object.create(null);
    }
    if (raw.sentTo[observerId]) {
      return false;
    }
    raw.sentTo[observerId] = true;
    return true;
  }

  resetSentTo(observerId: string): void {
    const raw = this.context.raw;
    if (raw?.sentTo) {
      delete raw.sentTo[observerId];
    }
  }

  getData(): unknown {
    if (typeof this.context.raw?.getData === "function") {
      return this.context.raw.getData();
    }
    return {
      id: this._props.id,
      sid: this._props.sid,
      name: this._props.name,
      x: this._props.position.x,
      y: this._props.position.y
    };
  }

  getInfo(): number[] | null {
    if (typeof this.context.raw?.getInfo === "function") {
      const result = this.context.raw.getInfo();
      return Array.isArray(result) ? result : null;
    }
    return null;
  }

  toState(): PlayerState {
    return {
      id: this._props.id,
      sid: this._props.sid,
      name: this._props.name,
      x: sanitizeFinite(this._props.position.x),
      y: sanitizeFinite(this._props.position.y),
      kills: this._props.kills,
      points: this._props.points,
      alive: this._props.alive,
      iconIndex: this._props.iconIndex
    };
  }

  private syncToRaw(): void {
    const raw = this.context.raw;
    if (!raw) {
      return;
    }
    raw.id = this._props.id;
    raw.sid = this._props.sid;
    raw.name = this._props.name;
    raw.x = this._props.position.x;
    raw.y = this._props.position.y;
    raw.kills = this._props.kills;
    raw.points = this._props.points;
    raw.alive = this._props.alive;
    raw.iconIndex = this._props.iconIndex;
  }
}
