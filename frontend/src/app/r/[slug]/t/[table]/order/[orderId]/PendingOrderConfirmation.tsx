"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { listPendingActions, type PlaceOrderPayload, type QueuedAction } from "@/lib/action-queue";

export function PendingOrderConfirmation({
  slug,
  table,
  actionId,
}: {
  slug: string;
  table: string;
  actionId: string;
}) {
  const [action, setAction] = useState<QueuedAction | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await listPendingActions();
      const found = all.find((a) => a.id === actionId) || null;
      if (!cancelled) {
        setAction(found);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actionId]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        <p className="text-sm">Loading order…</p>
      </div>
    );
  }

  const payload = action?.payload as PlaceOrderPayload | undefined;
  const tableNumber = payload?.tableNumber ?? Number(table);
  const total = (payload?.items || []).reduce(
    (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
            Order saved offline — it will sync when you are back online
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Order confirmed
          </p>
          <h1 className="font-display mt-2 text-3xl text-[var(--gold-bright)]">PENDING</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Table {tableNumber}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <p className="text-xs text-[var(--text-dim)]">Customer</p>
              <p className="font-medium">{payload?.customerName || "—"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <p className="text-xs text-[var(--text-dim)]">Status</p>
              <p className="font-medium text-[var(--gold-bright)]">Queued</p>
            </div>
            {payload?.specialRequest && (
              <div className="col-span-2 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-3">
                <p className="text-xs text-[var(--gold)]">Special request</p>
                <p className="font-medium">{payload.specialRequest}</p>
              </div>
            )}
          </div>

          <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
            {(payload?.items || []).map((item) => (
              <li key={item.menuItemId} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium text-[var(--gold-bright)]">{item.quantity}×</span>{" "}
                  {item.itemName || "Item"}
                </span>
                <span className="shrink-0 text-[var(--gold-bright)]">
                  {formatMoney((item.unitPrice || 0) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 text-base font-semibold">
            <span>Total</span>
            <span className="text-[var(--gold-bright)]">{formatMoney(total)}</span>
          </div>
        </div>

        <Link
          href={`/r/${slug}/t/${table}`}
          className="mt-6 block text-center text-sm font-medium text-[var(--gold)] underline-offset-2 hover:underline"
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
