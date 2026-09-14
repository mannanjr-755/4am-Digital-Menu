"use client";

import { useEffect } from "react";

/**
 * Registers the Digital Menu service worker in production builds only.
 * Failures are swallowed so online usage is never blocked.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    async function register() {
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
    };
  }, []);

  return null;
}
