/**
 * Shared IndexedDB for Digital Menu offline data.
 * Stores: menuSnapshots (browse cache), actionQueue (pending customer actions).
 */

export const OFFLINE_DB_NAME = "digital-menu-offline";
export const OFFLINE_DB_VERSION = 2;
export const MENU_STORE = "menuSnapshots";
export const ACTION_STORE = "actionQueue";

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MENU_STORE)) {
        db.createObjectStore(MENU_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(ACTION_STORE)) {
        const store = db.createObjectStore(ACTION_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("routeKey", "routeKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export function newActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
