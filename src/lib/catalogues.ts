/**
 * Catalogues hebdomadaires (style prospectus ALDI).
 * Dates calculées dynamiquement : lundi → dimanche.
 * PDF optionnel — tant qu'il n'y en a pas, la page détail
 * affiche les promos actives comme catalogue numérique.
 */

export type CataloguePeriode = "previous" | "current" | "next";

export interface Catalogue {
  slug: string;
  periode: CataloguePeriode;
  titre: string;
  description: string;
  cover: string;
  coverAlt: string;
  accent: string;
  /** Chemin PDF optionnel sous /public (ex. /catalogues/semaine.pdf). */
  pdf?: string | null;
  ctaLabel: string;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // lundi
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function weekRange(periode: CataloguePeriode, from = new Date()): {
  debut: Date;
  fin: Date;
} {
  const monday = startOfWeek(from);
  const offset = periode === "previous" ? -7 : periode === "next" ? 7 : 0;
  const debut = addDays(monday, offset);
  const fin = addDays(debut, 6);
  return { debut, fin };
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const fmtShort = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function formatWeekLabel(periode: CataloguePeriode, from = new Date()): string {
  const { debut, fin } = weekRange(periode, from);
  return `Du ${fmt.format(debut)} au ${fmt.format(fin)}`;
}

export function formatWeekShort(periode: CataloguePeriode, from = new Date()): string {
  const { debut, fin } = weekRange(periode, from);
  return `${fmtShort.format(debut)} → ${fmtShort.format(fin)}`;
}

/** Catalogue definitions — covers reuse existing promo assets until PDFs land. */
export const CATALOGUES: Catalogue[] = [
  {
    slug: "semaine-derniere",
    periode: "previous",
    titre: "Catalogue de la semaine dernière",
    description:
      "Dernière opportunité pour retrouver en magasin nos bons plans de la semaine passée.",
    cover: "/promos/promo_rectangulaire.webp",
    coverAlt: "Catalogue de la semaine dernière — Marché de Mo'",
    accent: "#6B7280",
    pdf: null,
    ctaLabel: "Consulter",
  },
  {
    slug: "cette-semaine",
    periode: "current",
    titre: "Catalogue de cette semaine",
    description:
      "Découvrez nos bons plans en magasin dès maintenant — mis à jour chaque lundi.",
    cover: "/images/promos/promo_marchedemo.jpeg",
    coverAlt: "Catalogue de cette semaine — Marché de Mo'",
    accent: "#1B7A4E",
    pdf: null,
    ctaLabel: "Consulter",
  },
  {
    slug: "semaine-prochaine",
    periode: "next",
    titre: "Catalogue de la semaine prochaine",
    description:
      "En avant-première : recevez le catalogue sur WhatsApp avant tout le monde.",
    cover: "/images/logo-promo.jpeg",
    coverAlt: "Catalogue de la semaine prochaine — Marché de Mo'",
    accent: "#C8102E",
    pdf: null,
    ctaLabel: "Consulter",
  },
];

export function getCatalogue(slug: string): Catalogue | undefined {
  return CATALOGUES.find((c) => c.slug === slug);
}

export function getCatalogueSlugs(): string[] {
  return CATALOGUES.map((c) => c.slug);
}
