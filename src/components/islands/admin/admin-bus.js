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

import { supabase } from "@/lib/supabase";

/**
 * Subscribe to admin sync events. Returns a teardown function suitable
 * for `useEffect` cleanups.
 *
 * Now enhanced with Supabase Realtime `postgres_changes` to sync across
 * different devices automatically (coupled with BroadcastChannel for instant local sync).
 *
 * @param {string[]} types  list of event types to listen for
 * @param {(event: { type: string; entity?: string; ids?: string[]; senderId: string; ts: number }) => void} handler
 * @returns {() => void} teardown
 */
export function subscribeAdminEvents(types, handler) {
  if (typeof window === "undefined") return () => {};
  
  const myId = ensureSenderId();
  
  // 1. BroadcastChannel (Instant local cross-tab)
  let bc = null;
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

  if (typeof BroadcastChannel === "function") {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.addEventListener("message", onMessage);
  }

  // 2. Supabase Realtime (Global cross-device)
  // We debounce the handler because a CSV import or bulk delete will trigger many row changes.
  let timeout;
  const debouncedHandler = (type) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      try { 
        handler({ type, entity: "realtime", senderId: "supabase", ts: Date.now() }); 
      } catch (err) {
        console.warn("[admin-bus] realtime handler threw", err);
      }
    }, 800);
  };

  let rtChannel = null;
  if (supabase) {
    // Generate a unique channel name per component instance to avoid conflicts
    rtChannel = supabase.channel(`admin-sync-${Math.random().toString(36).slice(2)}`);
    
    if (types.includes("PRODUITS_UPDATED")) {
      rtChannel.on("postgres_changes", { event: "*", schema: "public", table: "produits" }, () => debouncedHandler("PRODUITS_UPDATED"));
    }
    if (types.includes("PROMOS_UPDATED")) {
      rtChannel.on("postgres_changes", { event: "*", schema: "public", table: "promos" }, () => debouncedHandler("PROMOS_UPDATED"));
    }
    if (types.includes("ACTUS_UPDATED")) {
      rtChannel.on("postgres_changes", { event: "*", schema: "public", table: "actus" }, () => debouncedHandler("ACTUS_UPDATED"));
    }
    // "MEDIAS_UPDATED" relies on local BroadcastChannel since it's Storage, not Database.
    
    rtChannel.subscribe();
  }

  return () => {
    if (bc) {
      bc.removeEventListener("message", onMessage);
      try { bc.close(); } catch { /* no-op */ }
    }
    if (rtChannel) {
      supabase.removeChannel(rtChannel);
    }
    clearTimeout(timeout);
  };
}

/* Constant exports for grep-ability and IDE autocompletion. */
export const ADMIN_EVENT = Object.freeze({
  PRODUITS_UPDATED: "PRODUITS_UPDATED",
  PROMOS_UPDATED: "PROMOS_UPDATED",
  ACTUS_UPDATED: "ACTUS_UPDATED",
  MEDIAS_UPDATED: "MEDIAS_UPDATED",
});
