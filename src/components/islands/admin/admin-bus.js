/**
 * admin-bus.js — shared real-time pub/sub for admin React islands.
 *
 * Built on the native BroadcastChannel API. One channel
 * (`marchedemo_admin_sync`) is shared by every island, with a small
 * payload schema that lets receivers scope their refetch to the
 * relevant entity and skip self-echoes (a publisher receives its own
 * messages too — without a senderId guard, every save would trigger
 * a needless self-refetch).
 *
 * Payload shape : { type, entity?, ids?, senderId, ts }
 *   type     : "PRODUITS_UPDATED" | "PROMOS_UPDATED" | "ACTUS_UPDATED" | "MEDIAS_UPDATED"
 *   entity   : freeform tag (e.g. "promo:created", "produit:reordered")
 *   ids      : optional list of affected ids — receivers can decide
 *              whether to delta-refresh or do a full refetch
 *   senderId : random per-tab token; receivers use this to skip echoes
 *   ts       : Date.now() for debugging / replay protection
 *
 * Channel name is intentionally hard-coded across the codebase so
 * cross-tab sync works regardless of which page hosts which island.
 */

const CHANNEL_NAME = "marchedemo_admin_sync";

/* Per-tab id, regenerated on every page load. We don't persist it —
 * every fresh tab is a fresh sender. */
let SENDER_ID = "";
function ensureSenderId() {
  if (SENDER_ID) return SENDER_ID;
  try {
    const a = new Uint8Array(8);
    (globalThis.crypto || globalThis.msCrypto).getRandomValues(a);
    SENDER_ID = Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    SENDER_ID = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return SENDER_ID;
}

/**
 * Publish a message on the admin sync bus.
 * Safe to call in SSR contexts — no-ops when window is undefined or
 * BroadcastChannel isn't available (older Safari fallback handled
 * silently — receivers simply won't get the event, but the publisher
 * doesn't crash).
 */
export function publishAdminEvent(type, extra = {}) {
  if (typeof window === "undefined") return;
  if (typeof BroadcastChannel !== "function") return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({
      type,
      ...extra,
      senderId: ensureSenderId(),
      ts: Date.now(),
    });
    channel.close();
  } catch {
    /* benign — older browsers or sandboxed contexts */
  }
}

/**
 * Subscribe to admin sync events. Returns a teardown function suitable
 * for `useEffect` cleanups.
 *
 *   useEffect(() => subscribeAdminEvents(["PRODUITS_UPDATED"], handler), []);
 *
 * @param {string[]} types  list of event types to listen for
 * @param {(event: { type: string; entity?: string; ids?: string[]; senderId: string; ts: number }) => void} handler
 * @returns {() => void} teardown
 */
export function subscribeAdminEvents(types, handler) {
  if (typeof window === "undefined") return () => {};
  if (typeof BroadcastChannel !== "function") return () => {};
  const myId = ensureSenderId();
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const onMessage = (e) => {
    const data = e?.data;
    if (!data || typeof data.type !== "string") return;
    if (data.senderId === myId) return; // skip self-echo
    if (!types.includes(data.type)) return;
    try {
      handler(data);
    } catch (err) {
      console.warn("[admin-bus] handler threw", err);
    }
  };
  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    try { channel.close(); } catch { /* no-op */ }
  };
}

/* Constant exports for grep-ability and IDE autocompletion. */
export const ADMIN_EVENT = Object.freeze({
  PRODUITS_UPDATED: "PRODUITS_UPDATED",
  PROMOS_UPDATED: "PROMOS_UPDATED",
  ACTUS_UPDATED: "ACTUS_UPDATED",
  MEDIAS_UPDATED: "MEDIAS_UPDATED",
});
