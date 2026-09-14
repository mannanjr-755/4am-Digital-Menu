"use client";

import { useEffect } from "react";
import { syncPendingActions } from "@/lib/action-queue";

/**
 * Registers the Digital Menu service worker in production builds only.
 * Failures are swallowed so online usage is never blocked.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "SYNC_OFFLINE_ACTIONS") {
        void syncPendingActions();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);

    async function register() {
      // Register in production; in dev still listen for messages if SW exists
      if (process.env.NODE_ENV !== "production") return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch {
        // Registration failure must not break the menu.
      }
    }

    register();
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
