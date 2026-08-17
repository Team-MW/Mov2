/**
 * Banners registry — vertical "bookmark"-style banners that anchor
 * cultural and category identities across the site.
 *
 * Two kinds:
 *   - "culture"   : a national/regional identity (Créole, Maghreb,
 *                   Italie, Inde, Asie). Shown as a chip on its parent
 *                   rayon page + optionally cross-referenced inside
 *                   another rayon's narrative (e.g. Inde in
 *                   `epices-du-monde`) via `crossRefRayons`.
 *   - "category"  : a transversal grouping (Hygiène, Sauces & Soupes,
 *                   Huiles & Condiments). Shown either on its parent
 *                   rayon or on the /rayons index (when rayonScope is
 *                   empty), since these cut across multiple rayons.
 *
 * Each banner carries a `palette` derived from the source artwork. The
 * palette is exposed both inline (CSS custom props on the chip itself)
 * AND as scoped tokens via [data-culture="slug"] in
 * `src/styles/rayons/cultural-palettes.css`. That lets us tint badges,
 * sub-section backgrounds and decorative elements anywhere the slug
 * is set on a container.
 *
 * The artwork itself already embeds the Marché de Mo' lockup (cartoon
 * mascot lower-left + green logo lower-right), so brand DA is preserved
 * by design — we only borrow the cultural top half for palette tokens.
 *
 * To add a new banner :
 *   1. Drop the JPG in `public/images/banners/<slug>.jpg`
 *   2. Add an entry below with kind, scope, and palette.
 *   3. (Optional) cross-reference it from another rayon via
 *      `crossRefRayons`.
 *   4. If it's a true new rayon, also update `RAYONS` in `site.ts`.
 */

import type { RayonSlug } from "./site";

export type BannerKind = "culture" | "category";

export interface BannerPalette {
  /** Gradient stop 1 — sampled from the upper half of the banner. */
  from: string;
  /** Gradient stop 2 — sampled from the lower half / accent zone. */
  to: string;
  /** Solid accent color — used for borders, badges, focus rings.
   *  Always pair with one of the brand neutrals (white/noir) for contrast. */
  accent: string;
  /** Whether overlay text on top of the gradient should be light or dark. */
  text: "light" | "dark";
}

export interface Banner {
  /** Unique kebab-case slug; also used as the `data-culture` attribute. */
  slug: string;
  /** Display label rendered on the chip ("Créole", "Maghreb", ...). */
  label: string;
  /** Banner kind — drives placement logic. */
  kind: BannerKind;
  /** Public path of the artwork. */
  image: string;
  /** One-line tagline displayed under the label. */
  tagline: string;
  /** Rayon pages where this banner appears as a *primary* chip. */
  rayonScope: RayonSlug[];
  /** Rayon pages where this banner is *cross-referenced* (DA reuse).
   *  Example: Inde + Maghreb get a smaller chip set on epices-du-monde. */
  crossRefRayons?: RayonSlug[];
  /** Color palette tokens derived from the artwork. */
  palette: BannerPalette;
}

export const BANNERS: Banner[] = [
  /* ------------------------- Cultures ------------------------- */
  {
    slug: "creole",
    label: "Créole",
    kind: "culture",
    image: "/images/banners/creole.jpg",
    tagline: "Antilles & Caraïbes — le soleil dans l'assiette",
    rayonScope: ["cremerie"],
    palette: {
      from: "#E8C390",
      to: "#7FBED4",
      accent: "#1C6B35",
      text: "light",
    },
  },
  {
    slug: "asie",
    label: "Asie",
    kind: "culture",
    image: "/images/banners/asie.jpg",
    tagline: "Tokyo · Séoul · Bangkok — l'Asie au complet",
    rayonScope: ["saveurs-asie"],
    palette: {
      from: "#F2EDD8",
      to: "#A3B85C",
      accent: "#4F6E1C",
      text: "dark",
    },
  },
  {
    slug: "inde",
    label: "Inde",
    kind: "culture",
    image: "/images/banners/inde.jpg",
    tagline: "Mumbai à Madras — épices royales et currys",
    rayonScope: ["saveurs-asie"],
    crossRefRayons: ["epices-du-monde"],
    palette: {
      from: "#5C1A1F",
      to: "#C09060",
      accent: "#A86B1E",
      text: "light",
    },
  },
  {
    slug: "maghreb",
    label: "Maghreb",
    kind: "culture",
    image: "/images/banners/maghreb.jpg",
    tagline: "Du Sahel à la Méditerranée — l'art des épices",
    rayonScope: ["saveur-mediterranee"],
    crossRefRayons: ["epices-du-monde"],
    palette: {
      from: "#F4A37A",
      to: "#E2735C",
      accent: "#8B2500",
      text: "light",
    },
  },
  {
    slug: "italie",
    label: "Italie",
    kind: "culture",
    image: "/images/banners/italie.jpg",
    tagline: "La Dolce Vita — pâtes, huiles, antipasti",
    rayonScope: ["saveur-mediterranee"],
    palette: {
      from: "#009246",
      to: "#CE2B37",
      accent: "#009246",
      text: "light",
    },
  },

  /* ------------------------- Categories ------------------------- */
  {
    slug: "hygiene",
    label: "Hygiène",
    kind: "category",
    image: "/images/banners/hygiene.jpg",
    tagline: "Soins, savon, entretien — prix discount",
    rayonScope: ["produits-courants"],
    palette: {
      from: "#F5C7C9",
      to: "#FFE8EA",
      accent: "#B85257",
      text: "dark",
    },
  },
  {
    slug: "sauces-soupes",
    label: "Sauces & Soupes",
    kind: "category",
    image: "/images/banners/sauces-soupes.jpg",
    tagline: "Le réconfort du monde — bocaux et briques",
    /* Transversal — surfaced on /rayons index (no rayonScope). */
    rayonScope: [],
    palette: {
      from: "#F4C7B5",
      to: "#FFE8DC",
      accent: "#A85710",
      text: "dark",
    },
  },
  {
    slug: "huiles-condiments",
    label: "Huiles & Condiments",
    kind: "category",
    image: "/images/banners/huiles-condiments.jpg",
    tagline: "Olives, vinaigres, harissas, sauces piquantes",
    /* Transversal — surfaced on /rayons index. */
    rayonScope: [],
    palette: {
      from: "#A8D85F",
      to: "#7BC141",
      accent: "#2E8B4A",
      text: "light",
    },
  },
];

/* ---------------------------------------------------------------
   Helpers
---------------------------------------------------------------- */

/** Banners shown as primary chips on a given rayon page. */
export function bannersForRayon(rayon: RayonSlug): Banner[] {
  return BANNERS.filter((b) => b.rayonScope.includes(rayon));
}

/** Banners cross-referenced on a rayon page (smaller, narrative DA reuse). */
export function crossRefBannersForRayon(rayon: RayonSlug): Banner[] {
  return BANNERS.filter((b) => b.crossRefRayons?.includes(rayon) ?? false);
}

/** Transversal category banners — shown on /rayons index. */
export function transversalCategoryBanners(): Banner[] {
  return BANNERS.filter((b) => b.kind === "category" && b.rayonScope.length === 0);
}

/** Lookup by slug (e.g. for admin gallery, posters). */
export function getBanner(slug: string): Banner | undefined {
  return BANNERS.find((b) => b.slug === slug);
}

/** All registered slugs (useful for type narrowing or seed data). */
export function allBannerSlugs(): string[] {
  return BANNERS.map((b) => b.slug);
}
