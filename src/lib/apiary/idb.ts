import Dexie, { type Table } from "dexie";
import type { AppState, Holding, YearClose } from "./types";

const LS_KEY = "mi-apiario:v1";
const SOFT_LIMIT_BYTES = 12_000_000;
const HARD_HINT_BYTES = 50_000_000;

export const STORE_NAMES = [
  "apiaries",
  "colonies",
  "queens",
  "actions",
  "health",
  "production",
  "yearCloses",
] as const;

type StoreName = (typeof STORE_NAMES)[number];

const STORE_KEYS: Record<StoreName, keyof AppState> = {
  apiaries: "apiaries",
  colonies: "colonies",
  queens: "queens",
  actions: "actions",
  health: "health",
  production: "production",
  yearCloses: "yearCloses",
};

export type PersistStatus = {
  ok: boolean;
  bytes: number;
  limit: number;
  nearLimit: boolean;
  failed: boolean;
  engine: "indexeddb";
};

interface Snapshot {
  id: "notebook";
  state: AppState;
}

class NotebookDB extends Dexie {
  notebook!: Table<Snapshot, string>;
  constructor() {
    super("apiario");
    this.version(1).stores({ notebook: "id" });
  }
}

const db = new NotebookDB();

let cache: AppState = emptyClone();
let hydrated = false;
let boot: Promise<void> | null = null;
let writeDepth = 0;
let persistDirty = false;
let pending: Promise<void> = Promise.resolve();
let lastBytes = 0;
let lastFailed = false;

function emptyClone(): AppState {
  return {
    apiaries: [],
    colonies: [],
    queens: [],
    actions: [],
    health: [],
    production: [],
    yearCloses: [],
  };
}

function cloneState(state: AppState): AppState {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(state);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function normalize(parsed: Partial<AppState> | null | undefined): AppState {
  return {
    apiaries: Array.isArray(parsed?.apiaries) ? parsed.apiaries : [],
    colonies: Array.isArray(parsed?.colonies) ? parsed.colonies : [],
    queens: Array.isArray(parsed?.queens) ? parsed.queens : [],
    actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
    health: Array.isArray(parsed?.health) ? parsed.health : [],
    production: Array.isArray(parsed?.production) ? parsed.production : [],
    yearCloses: Array.isArray(parsed?.yearCloses) ? parsed.yearCloses : [],
    holding: parsed?.holding,
  };
}

function hasAnything(state: AppState): boolean {
  return (
    state.apiaries.length +
      state.colonies.length +
      state.queens.length +
      state.actions.length +
      state.health.length +
      state.production.length +
      state.yearCloses.length >
      0 || Boolean(state.holding)
  );
}

function loadFromLocalStorage(): AppState {
  if (typeof window === "undefined") return emptyClone();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return emptyClone();
    lastBytes = byteLength(raw);
    return normalize(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return emptyClone();
  }
}

async function persistNow(): Promise<boolean> {
  persistDirty = false;
  try {
    const snapshot = cloneState(cache);
    lastBytes = byteLength(JSON.stringify(snapshot));
    await db.notebook.put({ id: "notebook", state: snapshot });
    lastFailed = false;
    return true;
  } catch {
    lastFailed = true;
    return false;
  }
}

function queuePersist(): Promise<void> {
  pending = pending.then(() => persistNow()).then(() => undefined);
  return pending;
}

function touch(): void {
  persistDirty = true;
  if (writeDepth === 0) void queuePersist();
}

async function bootNow(): Promise<void> {
  if (hydrated) return;
  try {
    const row = await db.notebook.get("notebook");
    if (row?.state) {
      cache = normalize(row.state);
      lastBytes = byteLength(JSON.stringify(cache));
      hydrated = true;
      return;
    }
  } catch {
    /* try the old localStorage notebook */
  }
  cache = loadFromLocalStorage();
  hydrated = true;
  if (hasAnything(cache)) {
    const ok = await persistNow();
    if (ok && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LS_KEY);
      } catch {
        /* keep the old copy if the browser blocks removal */
      }
    }
  }
}

function whenReady(): Promise<void> {
  if (!boot) boot = bootNow();
  return boot;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function getPersistStatus(): PersistStatus {
  return {
    ok: !lastFailed,
    bytes: lastBytes,
    limit: HARD_HINT_BYTES,
    nearLimit: lastBytes >= SOFT_LIMIT_BYTES,
    failed: lastFailed,
    engine: "indexeddb",
  };
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB`;
}

export async function runWrite<T>(fn: () => Promise<T> | T): Promise<T> {
  await whenReady();
  writeDepth += 1;
  try {
    return await fn();
  } finally {
    writeDepth -= 1;
    if (writeDepth === 0 && persistDirty) await queuePersist();
  }
}

export async function loadState(): Promise<AppState> {
  await whenReady();
  await pending;
  return cloneState(cache);
}

export async function replaceAll(state: AppState): Promise<void> {
  await whenReady();
  cache = cloneState(normalize(state));
  await persistNow();
}

export async function saveHolding(holding: Holding): Promise<void> {
  await runWrite(() => {
    cache.holding = holding;
    persistDirty = true;
  });
}

export async function putRecord<T>(store: StoreName, row: T): Promise<void> {
  await whenReady();
  const keyName = store === "yearCloses" ? "year" : "id";
  const list = cache[STORE_KEYS[store]] as unknown as Array<Record<string, unknown>>;
  const key = (row as Record<string, unknown>)[keyName];
  const index = list.findIndex((item) => item[keyName] === key);
  if (index >= 0) list[index] = row as Record<string, unknown>;
  else list.push(row as Record<string, unknown>);
  touch();
}

export async function deleteRecord(store: StoreName, id: IDBValidKey): Promise<void> {
  await whenReady();
  switch (store) {
    case "apiaries":
      cache.apiaries = cache.apiaries.filter((item) => item.id !== id);
      break;
    case "colonies":
      cache.colonies = cache.colonies.filter((item) => item.id !== id);
      break;
    case "queens":
      cache.queens = cache.queens.filter((item) => item.id !== id);
      break;
    case "actions":
      cache.actions = cache.actions.filter((item) => item.id !== id);
      break;
    case "health":
      cache.health = cache.health.filter((item) => item.id !== id);
      break;
    case "production":
      cache.production = cache.production.filter((item) => item.id !== id);
      break;
    case "yearCloses":
      cache.yearCloses = cache.yearCloses.filter((item) => item.year !== id);
      break;
  }
  touch();
}

export async function deleteApiaryCascade(_state: AppState, apiaryId: string): Promise<void> {
  await runWrite(() => {
    const colonyIds = new Set(
      cache.colonies.filter((item) => item.apiaryId === apiaryId).map((item) => item.id),
    );
    cache.apiaries = cache.apiaries.filter((item) => item.id !== apiaryId);
    cache.colonies = cache.colonies.filter((item) => item.apiaryId !== apiaryId);
    cache.queens = cache.queens.filter((item) => !colonyIds.has(item.colonyId));
    cache.actions = cache.actions.filter((item) => !colonyIds.has(item.colonyId));
    cache.health = cache.health.filter((item) => !colonyIds.has(item.colonyId));
    cache.production = cache.production.map((item) =>
      item.apiaryId === apiaryId ? { ...item, apiaryId: undefined } : item,
    );
    persistDirty = true;
  });
}

export async function deleteColonyCascade(_state: AppState, colonyId: string): Promise<void> {
  await runWrite(() => {
    cache.colonies = cache.colonies.filter((item) => item.id !== colonyId);
    cache.queens = cache.queens.filter((item) => item.colonyId !== colonyId);
    cache.actions = cache.actions.filter((item) => item.colonyId !== colonyId);
    cache.health = cache.health.filter((item) => item.colonyId !== colonyId);
    persistDirty = true;
  });
}

export async function upsertYearClose(row: YearClose): Promise<void> {
  await putRecord("yearCloses", row);
}
