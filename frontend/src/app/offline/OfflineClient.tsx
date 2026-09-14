"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerMenu } from "@/components/CustomerMenu";
import {
  loadMenuSnapshot,
  menuCacheKey,
  type MenuSnapshot,
} from "@/lib/menu-cache";

/**
 * Offline fallback when a menu route was not previously cached as HTML.
 * Renders the existing CustomerMenu from IndexedDB when available.
 */
export default function OfflineClient() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const match = from.match(/^\/r\/([^/]+)\/t\/(\d+)/);
      if (match) {
        const key = menuCacheKey(match[1], Number(match[2]));
        const data = await loadMenuSnapshot(key);
        if (!cancelled) setSnapshot(data);
      } else {
        for (const table of [1, 2, 3, 4]) {
          const data = await loadMenuSnapshot(menuCacheKey("bon-panier", table));
          if (data) {
            if (!cancelled) setSnapshot(data);
            break;
          }
        }
      }
      if (!cancelled) setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [from]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        <p className="text-sm">Loading menu…</p>
      </div>
    );
  }

  if (snapshot) {
    return (
      <CustomerMenu
        restaurant={snapshot.restaurant}
        categories={snapshot.categories}
        tableNumber={snapshot.tableNumber}
        activeOrder={null}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-[var(--text)]">
      <div className="max-w-sm text-center">
        <p className="font-display text-2xl text-[var(--gold-bright)]">Bon Panier</p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          You are offline and this menu has not been saved on this device yet.
          Connect to the internet once, open your table QR/NFC link, then you can
          use the menu offline.
        </p>
      </div>
    </div>
  );
}
