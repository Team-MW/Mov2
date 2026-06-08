/**
 * Produits repository — 4-layer fallback chain.
 *
 * Read order :
 *   1. V2 `produits` table        (curated marketing copy, badges, ordre).
 *   2. Inventaire `articles`      (filmed by ops, only when publie_sur_site).
 *   3. Local JSON catalogue       (seed data baked into the build).
 *   4. Static vedettes list       (emergency last-resort for the home).
 *
 * The bridge to the inventaire Supabase project lives in
 * `src/lib/inventaire-bridge.ts`. It silently returns []/null when its
 * env vars are missing, so the chain naturally collapses to the legacy
 * 3-layer behaviour until INVENTAIRE_SUPABASE_URL is configured.
 *
 * Why a repo layer : the home page used to read PRODUITS_VEDETTES
 * from src/lib/produits-vedettes.ts (static placeholder). Now it
 * should read from Supabase so the admin can curate the showcase
 * without a redeploy.
 *
 * Featured logic : we treat the 8 produits with the smallest `ordre`
 * value (and actif=true) across all rayons as "vedettes". Admins
 * control the showcase by editing `ordre` in /admin/produits —
 * lower = more prominent. Inventaire articles default to ordre=1000
 * so curated V2 produits always lead.
 */
import { supabase } from "@/lib/supabase";
import {
  PRODUITS_VEDETTES as STATIC_FALLBACK,
  type ProduitVedette,
} from "@/lib/produits-vedettes";
import CATALOGUE_JSON from "@/data/produits-catalogue.json";
import {
  getArticleBySlug,
  getArticleSlugs,
  getArticlesPublies,
  getArticlesPubliesByRayon,
} from "@/lib/inventaire-bridge";
import { getActivePromos } from "./promos-repo";

/* --------------------------------------------------------------------
   Local catalogue fallback
   -------------------------------------------------------------------- */

interface CatalogueRow {
  slug: string;
  nom: string;
  description: string;
  image_url: string | null;
  rayon: string;
  categorie: string | null;
  sous_categorie: string | null;
  origine: string | null;
  badge: string | null;
  actif: boolean;
  ordre: number;
  unite?: string | null;
}

const LOCAL_CATALOGUE = (CATALOGUE_JSON as { produits: CatalogueRow[] }).produits
  .filter((r) => r.actif !== false);

interface DbRow {
  slug: string;
  nom: string;
  description: string | null;
  image_url: string | null;
  rayon: string;
  badge: string | null;
  origine: string | null;
  ordre: number;
}

function rowToProduitVedette(r: DbRow): ProduitVedette {
  return {
    id: r.slug,
    nom: r.nom,
    image: r.image_url ?? "",
    rayon: r.rayon as ProduitVedette["rayon"],
    badge: r.badge ?? undefined,
    origine: r.origine ?? undefined,
  };
}

/**
 * Returns up to `limit` featured produits (by ordre asc, nom asc).
 * No longer filters by image_url : the ProduitCard handles missing
 * images with a clean branded placeholder, so returning all actif
 * rows gives better coverage and the admin can upload a real image
 * later without needing to re-rank anything.
 *
 * Read order : V2 produits first, then inventaire articles to fill
 * the slot if V2 has fewer than `limit` rows, then local catalogue,
 * then static placeholders as a last resort.
 */
export async function getProduitsVedettes(limit = 8): Promise<ProduitVedette[]> {
  const v2Rows = await fetchV2Vedettes(limit);
  if (v2Rows.length >= limit) return v2Rows.slice(0, limit);

  /* V2 short → supplement with inventaire articles converted to vedette
   * shape. Skip slugs we've already shown (V2 always wins). */
  const articles = await getArticlesPublies();
  const seen = new Set(v2Rows.map((r) => r.id));
  const fillers: ProduitVedette[] = [];
  for (const p of articles) {
    if (!p.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    fillers.push({
      id: p.slug,
      nom: p.nom,
      image: p.image ?? "",
      rayon: p.rayon as ProduitVedette["rayon"],
      badge: p.badge ?? undefined,
      origine: p.origine ?? undefined,
    });
    if (v2Rows.length + fillers.length >= limit) break;
  }
  const out = [...v2Rows, ...fillers];
  if (out.length > 0) return out.slice(0, limit);
  return vedettesFromLocal(limit);
}

/** Fetch the vedettes from V2 only. Returns [] on error or empty. */
async function fetchV2Vedettes(limit: number): Promise<ProduitVedette[]> {
  try {
    const { data, error } = await supabase
      .from("produits")
      .select("slug, nom, description, image_url, rayon, badge, origine, ordre")
      .eq("actif", true)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true })
      .limit(limit);
    if (error) {
      console.warn("[produits-repo] Supabase error :", error.message);
      return [];
    }
    return ((data ?? []) as DbRow[]).map(rowToProduitVedette);
  } catch (e: any) {
    console.warn("[produits-repo] Supabase unreachable :", e?.message || e);
    return [];
  }
}

/* Vedettes from local catalogue — pick lowest `ordre` per rayon up to
   `limit`, preferring rows with an image. Falls back to STATIC_FALLBACK
   if the local catalogue itself is missing (shouldn't happen). */
function vedettesFromLocal(limit: number): ProduitVedette[] {
  if (LOCAL_CATALOGUE.length === 0) return STATIC_FALLBACK.slice(0, limit);
  const sorted = [...LOCAL_CATALOGUE].sort((a, b) => {
    const ai = a.image_url ? 0 : 1;
    const bi = b.image_url ? 0 : 1;
    if (ai !== bi) return ai - bi;
    if (a.ordre !== b.ordre) return a.ordre - b.ordre;
    return a.nom.localeCompare(b.nom, "fr");
  });
  return sorted.slice(0, limit).map((r) => ({
    id: r.slug,
    nom: r.nom,
    image: r.image_url ?? "",
    rayon: r.rayon as ProduitVedette["rayon"],
    badge: r.badge ?? undefined,
    origine: r.origine ?? undefined,
  }));
}

/* --------------------------------------------------------------------
   Full catalogue helpers — power the public /produits page.
   -------------------------------------------------------------------- */

export interface ProduitPublic {
  slug: string;
  nom: string;
  description: string;
  image: string | null;
  rayon: string;
  categorie: string | null;
  sous_categorie: string | null;
  origine: string | null;
  badge: string | null;
  ordre: number;
}

interface DbRowFull extends DbRow {
  categorie: string | null;
  sous_categorie: string | null;
}

function rowToProduitPublic(r: DbRowFull): ProduitPublic {
  return {
    slug: r.slug,
    nom: r.nom,
    description: r.description ?? "",
    image: r.image_url,
    rayon: r.rayon,
    categorie: r.categorie,
    sous_categorie: r.sous_categorie,
    origine: r.origine,
    badge: r.badge,
    ordre: r.ordre,
  };
}

/* --------------------------------------------------------------------
   Merge helpers — V2 wins on slug collision, inventaire fills gaps.
   -------------------------------------------------------------------- */

/** Sort across rayons : rayon → ordre → nom (FR collation). */
function byRayonOrdreNom(a: ProduitPublic, b: ProduitPublic): number {
  if (a.rayon !== b.rayon) return a.rayon.localeCompare(b.rayon, "fr");
  if (a.ordre !== b.ordre) return a.ordre - b.ordre;
  return a.nom.localeCompare(b.nom, "fr");
}

/** Sort within one rayon : ordre → nom. */
function byOrdreNom(a: ProduitPublic, b: ProduitPublic): number {
  if (a.ordre !== b.ordre) return a.ordre - b.ordre;
  return a.nom.localeCompare(b.nom, "fr");
}

/**
 * Merge two ProduitPublic lists, V2 winning on slug collision.
 * Empty / null slugs are dropped because slug is the routing key
 * for /produits/[slug] — we never want an unroutable row in the grid.
 */
function mergeBySlug(
  v2: ProduitPublic[],
  inventaire: ProduitPublic[],
): ProduitPublic[] {
  const seen = new Set<string>();
  const merged: ProduitPublic[] = [];
  for (const p of v2) {
    if (!p.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    merged.push(p);
  }
  for (const p of inventaire) {
    if (!p.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    merged.push(p);
  }
  return merged;
}

/**
 * Full catalogue — V2 curated rows + inventaire fillers, deduped by slug.
 * Used by /produits to build the client-side filterable grid.
 *
 * This may return hundreds of rows after seeding. Supabase's default
 * row cap is 1000 which is more than enough; beyond that we'd paginate.
 */
export async function getAllProduits(): Promise<ProduitPublic[]> {
  const [v2, inv] = await Promise.all([
    fetchV2AllProduits(),
    getArticlesPublies(),
  ]);
  const merged = mergeBySlug(v2, [...inv]);
  if (merged.length > 0) return merged.sort(byRayonOrdreNom);
  return allFromLocal();
}

/** Fetch the full catalogue from V2 only. Returns [] on error or empty. */
async function fetchV2AllProduits(): Promise<ProduitPublic[]> {
  try {
    const { data, error } = await supabase
      .from("produits")
      .select(
        "slug, nom, description, image_url, rayon, categorie, sous_categorie, origine, badge, ordre",
      )
      .eq("actif", true)
      .order("rayon", { ascending: true })
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    if (error || !data) {
      if (error) console.warn("[produits-repo] getAllProduits error :", error.message);
      return [];
    }
    return data.map((r) => rowToProduitPublic(r as DbRowFull));
  } catch (e: any) {
    console.warn("[produits-repo] Supabase unreachable :", e?.message || e);
    return [];
  }
}

function allFromLocal(): ProduitPublic[] {
  return LOCAL_CATALOGUE.map(localToPublic);
}

function localToPublic(r: CatalogueRow): ProduitPublic {
  return {
    slug: r.slug,
    nom: r.nom,
    description: r.description ?? "",
    image: r.image_url,
    rayon: r.rayon,
    categorie: r.categorie,
    sous_categorie: r.sous_categorie,
    origine: r.origine,
    badge: r.badge,
    ordre: r.ordre,
  };
}

/**
 * Every produit for one rayon, drill-down filterable.
 * Used by /produits/[rayon] and the rayon-page deep dive section.
 * V2 + inventaire merge, deduped by slug.
 */
export async function getProduitsByRayon(rayon: string): Promise<ProduitPublic[]> {
  const [v2, inv] = await Promise.all([
    fetchV2ByRayon(rayon),
    getArticlesPubliesByRayon(rayon),
  ]);
  const merged = mergeBySlug(v2, inv);
  if (merged.length > 0) return merged.sort(byOrdreNom);
  return LOCAL_CATALOGUE.filter((r) => r.rayon === rayon).map(localToPublic);
}

/** Fetch produits for a rayon from V2 only. Returns [] on error or empty. */
async function fetchV2ByRayon(rayon: string): Promise<ProduitPublic[]> {
  try {
    const { data, error } = await supabase
      .from("produits")
      .select(
        "slug, nom, description, image_url, rayon, categorie, sous_categorie, origine, badge, ordre",
      )
      .eq("actif", true)
      .eq("rayon", rayon)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    if (error || !data) {
      if (error) console.warn("[produits-repo] getProduitsByRayon error :", error.message);
      return [];
    }
    return data.map((r) => rowToProduitPublic(r as DbRowFull));
  } catch (e: any) {
    console.warn("[produits-repo] Supabase unreachable :", e?.message || e);
    return [];
  }
}

/**
 * Single produit by slug — used by /produits/[slug].
 * V2 first, inventaire fallback, local catalogue fallback. Returns null
 * if not found anywhere.
 */
export async function getProduitBySlug(
  slug: string,
): Promise<ProduitPublic | null> {
  const v2 = await fetchV2BySlug(slug);
  if (v2) return v2;
  const inv = await getArticleBySlug(slug);
  if (inv) return inv;

  const local = LOCAL_CATALOGUE.find((r) => r.slug === slug);
  return local ? localToPublic(local) : null;
}

/** Fetch a single produit by slug from V2 only. Returns null on miss. */
async function fetchV2BySlug(slug: string): Promise<ProduitPublic | null> {
  try {
    const { data, error } = await supabase
      .from("produits")
      .select(
        "slug, nom, description, image_url, rayon, categorie, sous_categorie, origine, badge, ordre",
      )
      .eq("actif", true)
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      if (error) console.warn("[produits-repo] getProduitBySlug error :", error.message);
      return null;
    }
    return rowToProduitPublic(data as DbRowFull);
  } catch (e: any) {
    console.warn("[produits-repo] Supabase unreachable :", e?.message || e);
    return null;
  }
}

/**
 * Every distinct slug across V2 + inventaire. Used by getStaticPaths
 * in /produits/[slug] so every published item is pre-rendered.
 * Falls back to the local catalogue slugs if both sources are empty.
 */
export async function getAllProduitSlugs(): Promise<string[]> {
  const [v2, inv] = await Promise.all([fetchV2Slugs(), getArticleSlugs()]);
  const union = new Set<string>([...v2, ...inv].filter(Boolean));
  if (union.size > 0) return [...union];
  return LOCAL_CATALOGUE.map((r) => r.slug);
}

/** Fetch all slugs from V2 only. Returns [] on error or empty. */
async function fetchV2Slugs(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("produits")
      .select("slug")
      .eq("actif", true);
    if (error || !data) return [];
    return (data as { slug: string }[]).map((r) => r.slug).filter(Boolean);
  } catch {
    return [];
  }
}
