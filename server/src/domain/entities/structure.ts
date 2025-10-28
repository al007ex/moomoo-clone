import type { EntityState } from "../game/state.js";
import type { Player } from "./player.js";
import type { Position, VisibleEntity } from "./types.js";

export interface StructureProps {
  readonly id: number;
  readonly sid: number;
  readonly type: number;
  readonly position: Position;
  readonly direction: number;
  readonly scale: number;
  readonly active: boolean;
  readonly ownerSid: number | null;
}

export interface StructureFactoryOptions {
  readonly defaultDirection?: number;
  readonly minScale?: number;
  readonly maxScale?: number;
}

function sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export class StructureFactory {
  private readonly defaultDirection: number;
  private readonly minScale: number;
  private readonly maxScale: number;

  constructor(options: StructureFactoryOptions = {}) {
    this.defaultDirection = sanitizeFinite(options.defaultDirection ?? 0, 0);
    this.minScale = options.minScale ?? 0;
    this.maxScale = options.maxScale ?? Number.POSITIVE_INFINITY;
  }

  fromRaw(raw: any): Structure {
    const position: Position = {
      x: sanitizeFinite(Number(raw?.x ?? 0)),
      y: sanitizeFinite(Number(raw?.y ?? 0))
    };
    return Structure.create(
      {
        id: sanitizeFinite(Number(raw?.id ?? 0), 0),
        sid: sanitizeFinite(Number(raw?.sid ?? -1), -1),
        type: sanitizeFinite(Number(raw?.type ?? 0), 0),
        position,
        direction: sanitizeFinite(Number(raw?.dir ?? this.defaultDirection), this.defaultDirection),
        scale: Math.min(Math.max(sanitizeFinite(Number(raw?.scale ?? 1), 1), this.minScale), this.maxScale),
        active: Boolean(raw?.active ?? true),
        ownerSid: Number.isFinite(raw?.owner?.sid) ? Number(raw.owner.sid) : null
      },
      { raw }
    );
  }
}

export class Structure implements VisibleEntity {
  private _props: StructureProps;
  readonly raw?: any;

  private constructor(props: StructureProps, raw?: any) {
    this._props = props;
    this.raw = raw;
    this.syncToRaw();
  }

  static create(props: StructureProps, context: { raw?: any } = {}): Structure {
    const normalized = Structure.normalize(props);
    return new Structure(normalized, context.raw);
  }

  private static normalize(props: StructureProps): StructureProps {
    return {
      id: sanitizeFinite(props.id ?? 0, 0),
      sid: sanitizeFinite(Number(props.sid), -1),
      type: sanitizeFinite(props.type ?? 0, 0),
      position: {
        x: sanitizeFinite(props.position?.x ?? 0),
        y: sanitizeFinite(props.position?.y ?? 0)
      },
      direction: sanitizeFinite(props.direction ?? 0, 0),
      scale: sanitizeFinite(props.scale ?? 1, 1),
      active: Boolean(props.active),
      ownerSid: props.ownerSid ?? null
    };
  }

  refreshFromRaw(): void {
    if (!this.raw) {
      return;
    }
    this._props = Structure.normalize({
      id: sanitizeFinite(Number(this.raw.id ?? this._props.id), this._props.id),
      sid: sanitizeFinite(Number(this.raw.sid ?? this._props.sid), this._props.sid),
      type: sanitizeFinite(Number(this.raw.type ?? this._props.type), this._props.type),
      position: {
        x: sanitizeFinite(Number(this.raw.x ?? this._props.position.x), this._props.position.x),
        y: sanitizeFinite(Number(this.raw.y ?? this._props.position.y), this._props.position.y)
      },
      direction: sanitizeFinite(Number(this.raw.dir ?? this._props.direction), this._props.direction),
      scale: sanitizeFinite(Number(this.raw.scale ?? this._props.scale), this._props.scale),
      active: Boolean(this.raw.active ?? this._props.active),
      ownerSid: Number.isFinite(this.raw.owner?.sid) ? Number(this.raw.owner.sid) : this._props.ownerSid
    });
  }

  isActive(): boolean {
    return this._props.active;
  }

  canBeSeenBy(player: Player): boolean {
    if (typeof this.raw?.visibleToPlayer === "function") {
      return Boolean(this.raw.visibleToPlayer(player.raw ?? player));
    }
    return player.canSee(this);
  }

  markSentTo(playerId: string): boolean {
    if (!this.raw) {
      return true;
    }
    if (!this.raw.sentTo) {
      this.raw.sentTo = Object.create(null);
    }
    if (this.raw.sentTo[playerId]) {
      return false;
    }
    this.raw.sentTo[playerId] = true;
    return true;
  }

  toState(): EntityState {
    return {
      id: String(this._props.id),
      type: String(this._props.type),
      x: this._props.position.x,
      y: this._props.position.y,
      payload: {
        dir: this._props.direction,
        scale: this._props.scale,
        ownerSid: this._props.ownerSid
      }
    };
  }

  toNetworkPayload(utils: { fixTo?: (value: number, precision: number) => number } = {}): number[] {
    const fix = (value: number, precision: number) =>
      typeof utils.fixTo === "function" ? utils.fixTo(value, precision) : value;
    return [
      this._props.sid,
      fix(this._props.position.x, 1),
      fix(this._props.position.y, 1),
      fix(this._props.direction, 3),
      this._props.scale,
      this._props.type,
      this._props.id,
      this._props.ownerSid ?? -1
    ];
  }

  private syncToRaw(): void {
    if (!this.raw) {
      return;
    }
    this.raw.id = this._props.id;
    this.raw.sid = this._props.sid;
    this.raw.type = this._props.type;
    this.raw.x = this._props.position.x;
    this.raw.y = this._props.position.y;
    this.raw.dir = this._props.direction;
    this.raw.scale = this._props.scale;
    this.raw.active = this._props.active;
    if (this._props.ownerSid !== null) {
      this.raw.owner = { ...(this.raw.owner ?? {}), sid: this._props.ownerSid };
    }
  }
}
