/**
 * Shared helpers for offline-capable customer actions.
 */

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Treat failed fetches / 5xx / timeouts as queueable. */
export function shouldQueueFailedResponse(res: Response | null): boolean {
  if (!res) return true;
  if (res.status === 0) return true;
  if (res.status >= 500) return true;
  if (res.status === 408 || res.status === 429) return true;
  return false;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
