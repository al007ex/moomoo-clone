import { accessories as legacyAccessories, hats as legacyHats } from "../moomoo/modules/store.js";

export interface StoreItemDefinition {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly description?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StoreConfig {
  readonly hats: ReadonlyArray<StoreItemDefinition>;
  readonly accessories: ReadonlyArray<StoreItemDefinition>;
}

function normalizeStoreItem(raw: any): StoreItemDefinition {
  const metadata = { ...raw };
  delete metadata.id;
  delete metadata.name;
  delete metadata.price;
  delete metadata.desc;
  return Object.freeze({
    id: Number.isFinite(raw?.id) ? Number(raw.id) : -1,
    name: String(raw?.name ?? ""),
    price: Number.isFinite(raw?.price) ? Number(raw.price) : 0,
    description: typeof raw?.desc === "string" ? raw.desc : undefined,
    metadata: Object.freeze(metadata)
  });
}

export const storeConfig: StoreConfig = Object.freeze({
  hats: Object.freeze(Array.from(legacyHats ?? [], normalizeStoreItem)),
  accessories: Object.freeze(Array.from(legacyAccessories ?? [], normalizeStoreItem))
});
