import type { Player } from "./player.js";
import type { Position, VisibleEntity } from "./types.js";

export interface NpcProps {
  readonly sid: number;
  readonly index: number;
  readonly position: Position;
  readonly direction: number;
  readonly health: number;
  readonly nameIndex: number;
  readonly alive: boolean;
}

function sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export class NpcFactory {
  fromRaw(raw: any): Npc {
    return Npc.create(
      {
        sid: sanitizeFinite(Number(raw?.sid ?? -1), -1),
        index: sanitizeFinite(Number(raw?.index ?? 0), 0),
        position: {
          x: sanitizeFinite(Number(raw?.x ?? 0)),
          y: sanitizeFinite(Number(raw?.y ?? 0))
        },
        direction: sanitizeFinite(Number(raw?.dir ?? 0), 0),
        health: Math.max(0, sanitizeFinite(Number(raw?.health ?? 0), 0)),
        nameIndex: Math.max(0, Math.floor(sanitizeFinite(Number(raw?.nameIndex ?? 0), 0))),
        alive: Boolean(raw?.alive ?? true)
      },
      { raw }
    );
  }
}

export class Npc implements VisibleEntity {
  private _props: NpcProps;
  readonly raw?: any;

  private constructor(props: NpcProps, raw?: any) {
    this._props = props;
    this.raw = raw;
  }

  static create(props: NpcProps, context: { raw?: any } = {}): Npc {
    const normalized = Npc.normalize(props);
    return new Npc(normalized, context.raw);
  }

  private static normalize(props: NpcProps): NpcProps {
    return {
      sid: sanitizeFinite(Number(props.sid), -1),
      index: sanitizeFinite(Number(props.index), 0),
      position: {
        x: sanitizeFinite(props.position?.x ?? 0),
        y: sanitizeFinite(props.position?.y ?? 0)
      },
      direction: sanitizeFinite(props.direction ?? 0, 0),
      health: Math.max(0, sanitizeFinite(props.health ?? 0, 0)),
      nameIndex: Math.max(0, Math.floor(sanitizeFinite(props.nameIndex ?? 0, 0))),
      alive: Boolean(props.alive)
    };
  }

  refreshFromRaw(): void {
    if (!this.raw) {
      return;
    }
    this._props = Npc.normalize({
      sid: sanitizeFinite(Number(this.raw.sid ?? this._props.sid), this._props.sid),
      index: sanitizeFinite(Number(this.raw.index ?? this._props.index), this._props.index),
      position: {
        x: sanitizeFinite(Number(this.raw.x ?? this._props.position.x), this._props.position.x),
        y: sanitizeFinite(Number(this.raw.y ?? this._props.position.y), this._props.position.y)
      },
      direction: sanitizeFinite(Number(this.raw.dir ?? this._props.direction), this._props.direction),
      health: Math.max(0, sanitizeFinite(Number(this.raw.health ?? this._props.health), this._props.health)),
      nameIndex: Math.max(0, Math.floor(sanitizeFinite(Number(this.raw.nameIndex ?? this._props.nameIndex), this._props.nameIndex))),
      alive: Boolean(this.raw.alive ?? this._props.alive)
    });
  }

  tick(dt: number): void {
    if (typeof this.raw?.update === "function") {
      this.raw.update(dt);
    }
    this.refreshFromRaw();
  }

  isAlive(): boolean {
    return this._props.alive;
  }

  canBeSeenBy(player: Player): boolean {
    if (typeof player.raw?.canSee === "function") {
      return Boolean(player.raw.canSee(this.raw ?? this));
    }
    return true;
  }

  toNetworkPayload(utils: { fixTo?: (value: number, precision: number) => number } = {}): number[] {
    const fix = (value: number, precision: number) =>
      typeof utils.fixTo === "function" ? utils.fixTo(value, precision) : value;
    return [
      this._props.sid,
      this._props.index,
      fix(this._props.position.x, 1),
      fix(this._props.position.y, 1),
      fix(this._props.direction, 3),
      Math.round(this._props.health),
      this._props.nameIndex
    ];
  }
}
