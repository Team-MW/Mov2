import { MAGASINS, type Magasin, type MagasinSlug } from "./site";

/** Default store used for SSR / prerender output. Overridden on the
 *  client by `enhanceStoreFromCookie()` (see Layout) when a returning
 *  visitor has a `preferred_magasin` cookie. Centralised here so the
 *  default is consistent across Layout, Header, and any future caller. */
export const DEFAULT_STORE: Magasin = MAGASINS["toulouse-sud"];

// Haversine distance formula in km
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getNearestStore(lat: number, lon: number): MagasinSlug {
  let nearestSlug: MagasinSlug = "toulouse-sud";
  let minDistance = Infinity;

  for (const key of Object.keys(MAGASINS)) {
    const slug = key as MagasinSlug;
    const store = MAGASINS[slug];
    if (store && store.coords) {
      const dist = haversineDistance(lat, lon, store.coords.lat, store.coords.lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestSlug = slug;
      }
    }
  }

  return nearestSlug;
}

/**
 * Resolves the visitor's "current" store based on (in order):
 *   1. The `preferred_magasin` cookie if set.
 *   2. Vercel edge geolocation headers (`x-vercel-ip-latitude/longitude`)
 *      when running on-demand. Headers may be `null` for prerendered
 *      pages — that's expected and we silently fall through.
 *   3. The default store (`toulouse-sud`).
 *
 * `headers` is optional and tolerates `null`/`undefined` so prerendered
 * callers don't have to wrap the call in a try/catch around
 * `Astro.request.headers` (which logs a warning in `output: "hybrid"`
 * for non-on-demand pages).
 */
export function resolveStore(cookies: any, headers?: Headers | null): Magasin {
  // Check if there is a cookie preference
  let preferred: string | undefined;
  if (typeof cookies?.get === "function") {
    preferred = cookies.get("preferred_magasin")?.value;
  } else if (cookies && typeof cookies === "object") {
    preferred = cookies["preferred_magasin"];
  }

  if (preferred && preferred in MAGASINS) {
    return MAGASINS[preferred as MagasinSlug];
  }

  // Check Vercel geolocation headers (only available on-demand).
  if (headers && typeof headers.get === "function") {
    const latStr = headers.get("x-vercel-ip-latitude");
    const lonStr = headers.get("x-vercel-ip-longitude");

    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lon)) {
        const nearest = getNearestStore(lat, lon);
        // Attempt to set cookie if cookies object supports setting
        if (typeof cookies?.set === "function") {
          try {
            cookies.set("preferred_magasin", nearest, {
              path: "/",
              maxAge: 60 * 60 * 24 * 365, // 1 year
              httpOnly: false, // Accessible client-side too
            });
          } catch (e) {
            // ignore
          }
        }
        return MAGASINS[nearest];
      }
    }
  }

  // Default store
  return MAGASINS["toulouse-sud"];
}
