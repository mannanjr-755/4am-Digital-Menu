/**
 * Offline-first action queue for customer Digital Menu actions.
 * Persists Place Order / Update Order / Call Waiter / Request Bill until synced.
 */

import {
  ACTION_STORE,
  newActionId,
  openOfflineDb,
} from "@/lib/offline-db";
import { menuCacheKey } from "@/lib/menu-cache";

export type OfflineActionType = "PLACE_ORDER" | "UPDATE_ORDER" | "WAITER" | "BILL";

export type QueuedActionStatus = "pending" | "syncing";

export type PlaceOrderPayload = {
  restaurantSlug: string;
  tableNumber: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  specialRequest: string | null;
  items: { menuItemId: string; quantity: number; itemName?: string; unitPrice?: number }[];
};

export type UpdateOrderPayload = PlaceOrderPayload & {
  orderId: string;
};

export type TableRequestPayload = {
  restaurantSlug: string;
  tableNumber: number;
  type: "WAITER" | "BILL";
};

export type QueuedAction = {
  id: string;
  createdAt: string;
  restaurantSlug: string;
  tableNumber: number;
  routeKey: string;
  type: OfflineActionType;
  payload: PlaceOrderPayload | UpdateOrderPayload | TableRequestPayload;
  status: QueuedActionStatus;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
};

let syncInFlight: Promise<void> | null = null;

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openOfflineDb();
  try {
    const tx = db.transaction(ACTION_STORE, mode);
    const store = tx.objectStore(ACTION_STORE);
    const result = await fn(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("action queue tx failed"));
      tx.onabort = () => reject(tx.error ?? new Error("action queue tx aborted"));
    });
    return result;
  } finally {
    db.close();
  }
}

export async function enqueueAction(
  input: Omit<QueuedAction, "id" | "createdAt" | "routeKey" | "status" | "attempts"> & {
    id?: string;
  }
): Promise<QueuedAction> {
  const action: QueuedAction = {
    id: input.id ?? newActionId(),
    createdAt: new Date().toISOString(),
    restaurantSlug: input.restaurantSlug,
    tableNumber: input.tableNumber,
    routeKey: menuCacheKey(input.restaurantSlug, input.tableNumber),
    type: input.type,
    payload: input.payload,
    status: "pending",
    attempts: 0,
  };

  await withStore("readwrite", (store) => {
    store.put(action);
  });

  return action;
}

export async function listPendingActions(): Promise<QueuedAction[]> {
  try {
    return await withStore("readonly", (store) => {
      return new Promise<QueuedAction[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = (req.result as QueuedAction[]) || [];
          resolve(
            rows
              .filter((a) => a.status === "pending" || a.status === "syncing")
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          );
        };
        req.onerror = () => reject(req.error ?? new Error("list failed"));
      });
    });
  } catch {
    return [];
  }
}

async function updateAction(action: QueuedAction): Promise<void> {
  await withStore("readwrite", (store) => {
    store.put(action);
  });
}

async function removeAction(id: string): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

const SYNC_STALE_MS = 90_000;

async function claimAction(action: QueuedAction): Promise<QueuedAction | null> {
  return withStore("readwrite", (store) => {
    return new Promise<QueuedAction | null>((resolve, reject) => {
      const getReq = store.get(action.id);
      getReq.onerror = () => reject(getReq.error ?? new Error("claim get failed"));
      getReq.onsuccess = () => {
        const current = getReq.result as QueuedAction | undefined;
        if (!current) {
          resolve(null);
          return;
        }
        if (current.status === "syncing") {
          const last = current.lastAttemptAt ? Date.parse(current.lastAttemptAt) : 0;
          if (Date.now() - last < SYNC_STALE_MS) {
            resolve(null);
            return;
          }
        }
        const claimed: QueuedAction = {
          ...current,
          status: "syncing",
          lastAttemptAt: new Date().toISOString(),
          attempts: (current.attempts || 0) + 1,
        };
        const putReq = store.put(claimed);
        putReq.onerror = () => reject(putReq.error ?? new Error("claim put failed"));
        putReq.onsuccess = () => resolve(claimed);
      };
    });
  });
}

async function syncOne(action: QueuedAction): Promise<"ok" | "retry" | "drop"> {
  const claimed = await claimAction(action);
  if (!claimed) return "ok";

  try {
    if (claimed.type === "PLACE_ORDER") {
      const payload = claimed.payload as PlaceOrderPayload;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          items: payload.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          clientActionId: claimed.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 200 || res.status === 201) {
        await removeAction(claimed.id);
        return "ok";
      }
      // Permanent client errors — keep for retry
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        await updateAction({
          ...claimed,
          status: "pending",
          lastError: data.error || `HTTP ${res.status}`,
        });
        return "retry";
      }
      await updateAction({
        ...claimed,
        status: "pending",
        lastError: data.error || `HTTP ${res.status}`,
      });
      return "retry";
    }

    if (claimed.type === "UPDATE_ORDER") {
      const payload = claimed.payload as UpdateOrderPayload;
      const res = await fetch(`/api/orders/${payload.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: payload.restaurantSlug,
          tableNumber: payload.tableNumber,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          specialRequest: payload.specialRequest,
          items: payload.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          clientActionId: claimed.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await removeAction(claimed.id);
        return "ok";
      }
      await updateAction({
        ...claimed,
        status: "pending",
        lastError: data.error || `HTTP ${res.status}`,
      });
      return "retry";
    }

    if (claimed.type === "WAITER" || claimed.type === "BILL") {
      const payload = claimed.payload as TableRequestPayload;
      const res = await fetch("/api/table-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clientActionId: claimed.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 201) {
        await removeAction(claimed.id);
        return "ok";
      }
      await updateAction({
        ...claimed,
        status: "pending",
        lastError: data.error || `HTTP ${res.status}`,
      });
      return "retry";
    }

    await removeAction(claimed.id);
    return "drop";
  } catch (err) {
    await updateAction({
      ...claimed,
      status: "pending",
      lastError: err instanceof Error ? err.message : "Network error",
    });
    return "retry";
  }
}

/** Sync all queued actions. Safe to call often; concurrent calls coalesce. */
export function syncPendingActions(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.resolve();
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const pending = await listPendingActions();
      for (const action of pending) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break;
        await syncOne(action);
      }
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Start listening for online events and run an initial sync. Returns cleanup. */
export function startActionQueueSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const run = () => {
    void syncPendingActions();
  };

  run();
  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });

  return () => {
    window.removeEventListener("online", run);
  };
}
