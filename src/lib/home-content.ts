/**
 * Home Content repository — editable hero editorial slides + KineticMarquee.
 *
 * Both used to be hardcoded in `src/pages/index.astro`. They're now
 * stored in Supabase (`public.home_editorial_slides` and
 * `public.home_marquee_items`) so the admin can edit them at runtime.
 *
 * Each helper is **resilient** : when Supabase is unreachable or the
 * env vars are missing (preview deploys, local dev without `.env`)
 * we silently fall back to the original hardcoded list. That means a
 * DB outage degrades to "yesterday's content" instead of a white page.
 *
 *   getHomeEditorialSlides() → Promise<HomeEditorialSlide[]>
 *   getHomeMarqueeItems()    → Promise<string[]>
 *
 * The shapes are intentionally minimal so consumers don't have to
 * change : `HomeEditorialSlide` is structurally compatible with the
 * `ExtraSlide` interface PromoHero already accepts, and the marquee
 * helper returns plain strings that drop straight into the existing
 * `<KineticMarquee items={...} />` prop.
 */
import { supabase } from "@/lib/supabase";

/* ----------------------------------------------------------------- */
/* Editorial slides                                                    */
/* ----------------------------------------------------------------- */

export interface HomeEditorialSlide {
  /** Always "editorial" — kept so the shape matches PromoHero's `ExtraSlide` discriminator. */
  kind: "editorial";
  eyebrow: string;
  titre: string;
  description: string;
  image: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  /** Hex accent colour used as overlay tint. */
  accent: string;
}

/** Hardcoded fallback used when Supabase is unreachable. Matches the
 *  values shipped in migration 006 so dev/preview look identical to
 *  production after the migration runs. */
const FALLBACK_SLIDES: HomeEditorialSlide[] = [
  {
    kind: "editorial",
    eyebrow: "Dernier-né du Groupe",
    titre: "Toulouse Sud Cépière. Ouvert.",
    description:
      "1 200 m² d'espace de vente, rayon Saveurs d'Asie étendu, espace traiteur halal sur place. Votre nouveau rendez-vous au cœur de l'Hippodrome.",
    image: "/images/magasins/toulouse-sud.jpg",
    imageAlt: "Nouveau magasin Marché de Mo' Toulouse Sud Cépière",
    ctaLabel: "Découvrir le magasin",
    ctaHref: "/magasins/toulouse-sud",
    accent: "#1C6B35",
  },
  {
    kind: "editorial",
    eyebrow: "Programme fidélité",
    titre: "5€ offerts à chaque 100€.",
    description:
      "La carte Marché de Mo' : un avantage direct, sans condition. Vous faites vos courses, on vous remercie.",
    image: "/images/rayons/fruits-legumes.jpg",
    imageAlt: "Carte fidélité Marché de Mo'",
    ctaLabel: "Rejoindre le programme",
    ctaHref: "/fidelite",
    accent: "#C53030",
  },
];

function slideRowToEntry(row: any): HomeEditorialSlide {
  return {
    kind: "editorial",
    eyebrow: row.eyebrow ?? "",
    titre: row.titre ?? "",
    description: row.description ?? "",
    image: row.image ?? "",
    imageAlt: row.image_alt ?? "",
    ctaLabel: row.cta_label ?? "",
    ctaHref: row.cta_href ?? "",
    accent: row.accent || "#1C6B35",
  };
}

/**
 * Returns active editorial slides ordered for display, falling back
 * to the hardcoded list on any failure.
 */
export async function getHomeEditorialSlides(): Promise<HomeEditorialSlide[]> {
  try {
    const { data, error } = await supabase
      .from("home_editorial_slides")
      .select("*")
      .eq("actif", true)
      .order("ordre", { ascending: true });
    if (error || !data) return FALLBACK_SLIDES;
    if (data.length === 0) return FALLBACK_SLIDES;
    return data.map(slideRowToEntry);
  } catch {
    return FALLBACK_SLIDES;
  }
}

/* ----------------------------------------------------------------- */
/* Marquee items                                                       */
/* ----------------------------------------------------------------- */

const FALLBACK_MARQUEE: string[] = [
  "Saveurs du monde",
  "Arrivages quotidiens",
  "Boucherie halal sur carcasse",
  "Fruits exotiques",
  "20 000+ références",
  "60 ans d'expérience",
];

/**
 * Returns active marquee items as plain strings, ordered for display.
 * Drops straight into `<KineticMarquee items={...} />`.
 */
export async function getHomeMarqueeItems(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("home_marquee_items")
      .select("label, ordre")
      .eq("actif", true)
      .order("ordre", { ascending: true });
    if (error || !data) return FALLBACK_MARQUEE;
    if (data.length === 0) return FALLBACK_MARQUEE;
    return data.map((r: any) => String(r.label));
  } catch {
    return FALLBACK_MARQUEE;
  }
}
