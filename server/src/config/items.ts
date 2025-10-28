import { items as legacyItems } from "../moomoo/modules/items.js";

export interface ItemGroupDefinition {
  readonly id: number;
  readonly name: string;
  readonly layer: number;
  readonly place?: boolean;
  readonly limit?: number;
}

export interface ItemDefinition {
  readonly id: number;
  readonly groupId: number;
  readonly name: string;
  readonly age?: number;
  readonly type?: number;
  readonly description?: string;
  readonly price?: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface WeaponDefinition extends ItemDefinition {
  readonly damage?: number;
  readonly range?: number;
  readonly speed?: number;
}

export interface ProjectileDefinition {
  readonly id: number;
  readonly index: number;
  readonly type: string;
  readonly damage: number;
  readonly speed: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ItemsConfig {
  readonly groups: ReadonlyArray<ItemGroupDefinition>;
  readonly items: ReadonlyArray<ItemDefinition>;
  readonly weapons: ReadonlyArray<WeaponDefinition>;
  readonly projectiles: ReadonlyArray<ProjectileDefinition>;
}

function normalizeGroup(raw: any): ItemGroupDefinition {
  return Object.freeze({
    id: Number.isFinite(raw?.id) ? Number(raw.id) : -1,
    name: String(raw?.name ?? ""),
    layer: Number.isFinite(raw?.layer) ? Number(raw.layer) : 0,
    place: raw?.place === true,
    limit: Number.isFinite(raw?.limit) ? Number(raw.limit) : undefined
  });
}

function normalizeItem(raw: any): ItemDefinition {
  const groupId = Number.isFinite(raw?.group?.id)
    ? Number(raw.group.id)
    : Number.isFinite(raw?.group)
      ? Number(raw.group)
      : -1;
  const metadata = { ...raw };
  delete metadata.id;
  delete metadata.group;
  delete metadata.name;
  delete metadata.age;
  delete metadata.type;
  delete metadata.desc;
  delete metadata.price;
  return Object.freeze({
    id: Number.isFinite(raw?.id) ? Number(raw.id) : -1,
    groupId,
    name: String(raw?.name ?? ""),
    age: Number.isFinite(raw?.age) ? Number(raw.age) : undefined,
    type: Number.isFinite(raw?.type) ? Number(raw.type) : undefined,
    description: typeof raw?.desc === "string" ? raw.desc : undefined,
    price: Number.isFinite(raw?.price) ? Number(raw.price) : undefined,
    metadata: Object.freeze(metadata)
  });
}

function normalizeWeapon(raw: any): WeaponDefinition {
  const base = normalizeItem(raw);
  const metadata = { ...base.metadata };
  const damage = Number.isFinite(raw?.dmg) ? Number(raw.dmg) : undefined;
  const range = Number.isFinite(raw?.range) ? Number(raw.range) : undefined;
  const speed = Number.isFinite(raw?.speed) ? Number(raw.speed) : undefined;
  return Object.freeze({
    ...base,
    damage,
    range,
    speed,
    metadata: Object.freeze({
      ...metadata,
      dmg: raw?.dmg,
      range: raw?.range,
      speed: raw?.speed
    })
  });
}

function normalizeProjectile(raw: any): ProjectileDefinition {
  const metadata = { ...raw };
  delete metadata.id;
  delete metadata.index;
  delete metadata.type;
  delete metadata.dmg;
  delete metadata.speed;
  return Object.freeze({
    id: Number.isFinite(raw?.id) ? Number(raw.id) : -1,
    index: Number.isFinite(raw?.index) ? Number(raw.index) : -1,
    type: String(raw?.type ?? ""),
    damage: Number.isFinite(raw?.dmg) ? Number(raw.dmg) : 0,
    speed: Number.isFinite(raw?.speed) ? Number(raw.speed) : 0,
    metadata: Object.freeze(metadata)
  });
}

export const itemConfig: ItemsConfig = Object.freeze({
  groups: Object.freeze(Array.from(legacyItems.groups ?? [], normalizeGroup)),
  items: Object.freeze(Array.from(legacyItems.list ?? [], normalizeItem)),
  weapons: Object.freeze(Array.from(legacyItems.weapons ?? [], normalizeWeapon)),
  projectiles: Object.freeze(Array.from(legacyItems.projectiles ?? [], normalizeProjectile))
});
