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
  return "toulouse-sud";
}

/**
 * Resolves the visitor's "current" store.
 * Hardcoded to return the single store: toulouse-sud.
 */
export function resolveStore(cookies: any, headers?: Headers | null): Magasin {
  return MAGASINS["toulouse-sud"];
}
