import type { EntityState } from "../game/state.js";
import type { Position, VisibleEntity } from "./types.js";

export interface ProjectileProps {
  readonly id: string;
  readonly sid: number;
  readonly position: Position;
  readonly active: boolean;
  readonly ownerSid: number | null;
}

function sanitizeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export class ProjectileFactory {
  fromRaw(raw: any): Projectile {
    return Projectile.create(
      {
        id: String(raw?.id ?? ""),
        sid: sanitizeFinite(Number(raw?.sid ?? raw?.id ?? -1), -1),
        position: {
          x: sanitizeFinite(Number(raw?.x ?? 0)),
          y: sanitizeFinite(Number(raw?.y ?? 0))
        },
        active: Boolean(raw?.active ?? true),
        ownerSid: Number.isFinite(raw?.owner?.sid) ? Number(raw.owner.sid) : null
      },
      { raw }
    );
  }
}

export class Projectile implements VisibleEntity {
  private _props: ProjectileProps;
  readonly raw?: any;

  private constructor(props: ProjectileProps, raw?: any) {
    this._props = props;
    this.raw = raw;
  }

  static create(props: ProjectileProps, context: { raw?: any } = {}): Projectile {
    const normalized = Projectile.normalize(props);
    return new Projectile(normalized, context.raw);
  }

  private static normalize(props: ProjectileProps): ProjectileProps {
    return {
      id: String(props.id),
      sid: sanitizeFinite(Number(props.sid), -1),
      position: {
        x: sanitizeFinite(props.position?.x ?? 0),
        y: sanitizeFinite(props.position?.y ?? 0)
      },
      active: Boolean(props.active),
      ownerSid: props.ownerSid ?? null
    };
  }

  refreshFromRaw(): void {
    if (!this.raw) {
      return;
    }
    this._props = Projectile.normalize({
      id: String(this.raw.id ?? this._props.id),
      sid: sanitizeFinite(Number(this.raw.sid ?? this._props.sid), this._props.sid),
      position: {
        x: sanitizeFinite(Number(this.raw.x ?? this._props.position.x), this._props.position.x),
        y: sanitizeFinite(Number(this.raw.y ?? this._props.position.y), this._props.position.y)
      },
      active: Boolean(this.raw.active ?? this._props.active),
      ownerSid: Number.isFinite(this.raw.owner?.sid) ? Number(this.raw.owner.sid) : this._props.ownerSid
    });
  }

  tick(dt: number): void {
    if (typeof this.raw?.update === "function") {
      this.raw.update(dt);
    }
    this.refreshFromRaw();
  }

  isActive(): boolean {
    return this._props.active;
  }

  toState(): EntityState {
    return {
      id: this._props.id,
      type: "projectile",
      x: this._props.position.x,
      y: this._props.position.y,
      payload: {
        owner: this._props.ownerSid,
        active: this._props.active
      }
    };
  }
}
