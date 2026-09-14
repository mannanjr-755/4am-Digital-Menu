import { Suspense } from "react";
import type { Metadata } from "next";
import OfflineClient from "./OfflineClient";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
          <p className="text-sm">Loading menu…</p>
        </div>
      }
    >
      <OfflineClient />
    </Suspense>
  );
}
