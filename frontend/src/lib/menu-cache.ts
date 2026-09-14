/**
 * IndexedDB menu snapshots for offline Digital Menu.
 * Keys are restaurant/table route ids, e.g. "bon-panier/t/1".
 * Does not store auth tokens, passwords, or admin data.
 */

const DB_NAME = "digital-menu-offline";
const DB_VERSION = 1;
const STORE = "menuSnapshots";

export type OfflineMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  categoryId: string;
  featured: boolean;
  popular: boolean;
  todaySpecial: boolean;
  options: string | null;
};

export type OfflineCategory = {
  id: string;
  name: string;
  items: OfflineMenuItem[];
};

export type OfflineRestaurant = {
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  openingHours: Record<string, string>;
  socialLinks: Record<string, string>;
};

export type MenuSnapshot = {
  key: string;
  restaurant: OfflineRestaurant;
  categories: OfflineCategory[];
  tableNumber: number;
  updatedAt: string;
};

export function menuCacheKey(slug: string, tableNumber: number): string {
  return `${slug}/t/${tableNumber}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
  });
}

export async function saveMenuSnapshot(
  snapshot: Omit<MenuSnapshot, "key" | "updatedAt"> & { key?: string }
): Promise<void> {
  try {
    const key =
      snapshot.key ?? menuCacheKey(snapshot.restaurant.slug, snapshot.tableNumber);
    const record: MenuSnapshot = {
      key,
      restaurant: snapshot.restaurant,
      categories: snapshot.categories,
      tableNumber: snapshot.tableNumber,
      updatedAt: new Date().toISOString(),
    };
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("save failed"));
      tx.objectStore(STORE).put(record);
    });
    db.close();
  } catch {
    // Offline persistence is best-effort; never break the menu UI.
  }
}

export async function loadMenuSnapshot(key: string): Promise<MenuSnapshot | null> {
  try {
    const db = await openDb();
    const result = await new Promise<MenuSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as MenuSnapshot) ?? null);
      req.onerror = () => reject(req.error ?? new Error("load failed"));
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export function collectMenuImageUrls(
  categories: OfflineCategory[],
  restaurant?: OfflineRestaurant | null
): string[] {
  const urls: string[] = ["/logo.png"];
  if (restaurant?.logo) urls.push(restaurant.logo);
  if (restaurant?.coverImage) urls.push(restaurant.coverImage);
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.imageUrl) urls.push(item.imageUrl);
    }
  }
  return [...new Set(urls)];
}

export function requestCacheUrls(urls: string[]): void {
  if (typeof navigator === "undefined" || !urls.length) return;
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  controller.postMessage({ type: "CACHE_URLS", urls });
}
