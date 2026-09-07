/**
 * One analytics entry point for every component that reports an event.
 *
 * GoogleAnalytics.astro boots gtag three seconds after `load`, so anything that
 * happens before that used to fall through to a `dataLayer.push({ event })` that
 * gtag.js (as opposed to GTM) never reads. Those events were lost silently.
 * Here they are queued instead and replayed once the tracker exists.
 */

type Params = Record<string, unknown>;

const QUEUE: Array<[string, Params]> = [];
/** Long enough to cover the 3s GA delay plus a slow connection, short enough to give up. */
const MAX_WAIT_MS = 30_000;
const RETRY_MS = 500;
let draining = false;

function deliver(name: string, params: Params): boolean {
  const w = window as unknown as {
    peTrack?: (n: string, p: Params) => void;
    gtag?: (kind: string, n: string, p: Params) => void;
  };
  if (typeof w.peTrack === 'function') {
    w.peTrack(name, params);
    return true;
  }
  if (typeof w.gtag === 'function') {
    w.gtag('event', name, params);
    return true;
  }
  return false;
}

function drain(startedAt: number) {
  while (QUEUE.length) {
    const [name, params] = QUEUE[0];
    if (!deliver(name, params)) break;
    QUEUE.shift();
  }
  if (QUEUE.length && Date.now() - startedAt < MAX_WAIT_MS) {
    window.setTimeout(() => drain(startedAt), RETRY_MS);
    return;
  }
  QUEUE.length = 0;
  draining = false;
}

export function track(name: string, params: Params = {}): void {
  try {
    if (deliver(name, params)) return;
    QUEUE.push([name, params]);
    if (draining) return;
    draining = true;
    const startedAt = Date.now();
    window.setTimeout(() => drain(startedAt), RETRY_MS);
  } catch {
    // Analytics must never break a form.
  }
}
