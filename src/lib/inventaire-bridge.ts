/**
 * inventaire-bridge.ts — Read-only client for the Marché de Mo' inventaire Supabase.
 *
 * Why
 * ---
 * V2 (this project) has its own curated `produits` table for marketing.
 * The standalone inventory app (Supabase project `mbqfsibfsmnagzscrxic`)
 * has an `articles` table fed by the in-store filming workflow — live
 * stock, DLC, magasin, photo from camera. This bridge lets V2 read the
 * articles flagged `publie_sur_site=true` so a single filming action
 * produces both stock tracking AND public visibility on marchedemo.com.
 *
 * The bridge is the 2nd layer of the public-site fallback chain in
 * `produits-repo.ts` :
 *   1. V2 `produits`   — curated, marketing copy, badges, ordre.        (wins)
 *   2. Inventaire `articles WHERE publie_sur_site` — raw filmed items.  (this file)
 *   3. Local JSON catalogue                                              (seed)
 *   4. Static vedettes list                                              (emergency)
 *
 * Safety contract
 * ---------------
 * - Returns [] / null (never throws) when env vars are missing or the
 *   inventaire Supabase is unreachable. V2 keeps rendering normally.
 * - The anon key only sees `articles WHERE publie_sur_site = true`
 *   (RLS policy "articles_read_published" — see migration
 *   `Gestion_inventaire_marchedemo/supabase/migrations/003_trio_bridge.sql`).
 *   No filter needed on this side ; Postgres enforces it.
 * - All queries restrict to rows with a non-null slug because slug is
 *   the V2 routing key (`/produits/[slug]`).
 *
 * Env vars (V2 `.env.local` and Vercel env) :
 *   INVENTAIRE_SUPABASE_URL=https://mbqfsibfsmnagzscrxic.supabase.co
 *   INVENTAIRE_SUPABASE_ANON_KEY=<anon key of the inventaire project>
 *
 * Both must be set together. If either is missing, the bridge stays
 * dormant and the public site behaves exactly like before — no break.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProduitPublic } from "@/lib/produits-repo";

const inventaireUrl = import.meta.env.INVENTAIRE_SUPABASE_URL;
const inventaireKey = import.meta.env.INVENTAIRE_SUPABASE_ANON_KEY;

/**
 * Inventaire Supabase client (anon, read-only, RLS-restricted to
 * `publie_sur_site = true`). `null` when env vars are missing — callers
 * MUST handle the null case and fall back gracefully.
 */
export const supabaseInventaire: SupabaseClient | null =
  inventaireUrl && inventaireKey
    ? createClient(inventaireUrl, inventaireKey, {
        auth: { persistSession: false },
      })
    : null;

/* --------------------------------------------------------------------
   Raw row shape — mirrors `public.articles` selected columns.
   -------------------------------------------------------------------- */

interface ArticleRow {
  slug: string;
  nom_produit: string;
  description: string;
  marque: string;
  rayon: string;
  format: string;
  origine: string;
  photo_url: string;
  prix_vente: number;
}

/**
 * Map an inventory article to the V2 `ProduitPublic` shape.
 *
 * Schema asymmetry notes
 * ----------------------
 * - articles lack `categorie` / `sous_categorie` → null. The
 *   `/produits/[rayon]` page groups by `sous_categorie || categorie ||
 *   "Autres"`, so unmapped articles cluster under "Autres" — acceptable
 *   until Phase 2 lets a curator promote them into V2 with full taxonomy.
 * - articles don't have an explicit `badge` column → we surface the
 *   `marque` in that slot so brands like "Maggi" or "Yobé" appear as a
 *   small pill on the ProduitCard. When a curator promotes the article
 *   into V2.produits, the V2 row wins and can carry a custom badge.
 * - `ordre = 1000` (large) so V2-curated produits naturally sort first
 *   by default, with inventaire fillers below. Curators editing V2
 *   keep their relative order (typically 0–500).
 * - `photo_url` may be a `data:image/...;base64,...` URL (legacy base64
 *   storage in the inventory DB), a Cloudinary URL, or a Supabase
 *   Storage URL. `image-cdn.ts#supabaseSrcSet` returns non-Supabase URLs
 *   unchanged, so all three render correctly without extra work.
 */
let isTrioBridgeMigrationApplied = true;

/**
 * Probe to check if a DB error is caused by missing bridge migration columns.
 * If so, deactivates the bridge queries to save bandwidth and prevent log spam.
 *
 * Migration 003_trio_bridge.sql adds 4 columns to public.articles :
 *   slug, origine, publie_sur_site, sync_v2_at
 * A missing-column error on ANY of them means the migration hasn't run on
 * the inventaire Supabase project. We catch all four so the bridge falls
 * dormant on the very first error instead of hammering the DB once per
 * column (the previous regex only checked slug + publie_sur_site, which
 * is why "column articles.origine does not exist" kept surfacing).
 */
const MIGRATION_003_COLUMNS = ["slug", "origine", "publie_sur_site", "sync_v2_at"] as const;

let hasLoggedFetchError = false;

function handleBridgeError(err: any, context: string) {
  const msg = err?.message ?? "";
  const isMigrationMissing = MIGRATION_003_COLUMNS.some((col) =>
    msg.includes(`column articles.${col} does not exist`),
  );
  if (isMigrationMissing && isTrioBridgeMigrationApplied) {
    console.warn(
      "[inventaire-bridge] ⚠️ La migration 003_trio_bridge.sql n'a pas été appliquée sur la base inventaire.",
      "Le pont d'inventaire est temporairement mis en sommeil. Voir Gestion_inventaire_marchedemo/supabase/migrations/003_trio_bridge.sql.",
    );
    isTrioBridgeMigrationApplied = false;
  }
}

function handleFetchError(e: any, context: string) {
  if (!hasLoggedFetchError) {
    console.warn(`[inventaire-bridge] ${context} error :`, e?.message || e);
    console.warn("[inventaire-bridge] Note: Subsequent fetch errors will be silenced to prevent log spam during build.");
    hasLoggedFetchError = true;
  }
}

function articleToProduitPublic(a: ArticleRow): ProduitPublic {
  const fallbackDesc = [a.marque, a.format].filter(Boolean).join(" · ");
  const description = a.description?.trim() || fallbackDesc;
  return {
    slug: a.slug,
    nom: a.nom_produit,
    description,
    image: a.photo_url || null,
    rayon: a.rayon,
    categorie: null,
    sous_categorie: null,
    origine: a.origine || null,
    badge: a.marque || null,
    ordre: 1000,
  };
}

const SELECT_COLS =
  "slug, nom_produit, description, marque, rayon, format, origine, photo_url, prix_vente";

/* --------------------------------------------------------------------
   Public API — mirrors the four shapes consumed by produits-repo.
   -------------------------------------------------------------------- */

/**
 * Every published article, ordered by rayon then nom_produit.
 * Used by `produits-repo.getAllProduits` to fill the catalogue grid.
 */
export async function getArticlesPublies(): Promise<ProduitPublic[]> {
  if (!supabaseInventaire || !isTrioBridgeMigrationApplied) return [];
  try {
    const { data, error } = await supabaseInventaire
      .from("articles")
      .select(SELECT_COLS)
      .not("slug", "is", null)
      .order("rayon", { ascending: true })
      .order("nom_produit", { ascending: true });
    if (error) {
      handleBridgeError(error, "getArticlesPublies");
      if (isTrioBridgeMigrationApplied) handleFetchError(error, "getArticlesPublies");
      return [];
    }
    return ((data ?? []) as ArticleRow[]).map(articleToProduitPublic);
  } catch (e: any) {
    handleFetchError(e, "getArticlesPublies (exception)");
    return [];
  }
}

/**
 * Published articles for a single rayon.
 * Used by `produits-repo.getProduitsByRayon`.
 */
export async function getArticlesPubliesByRayon(
  rayon: string,
): Promise<ProduitPublic[]> {
  if (!supabaseInventaire || !isTrioBridgeMigrationApplied) return [];
  try {
    const { data, error } = await supabaseInventaire
      .from("articles")
      .select(SELECT_COLS)
      .eq("rayon", rayon)
      .not("slug", "is", null)
      .order("nom_produit", { ascending: true });
    if (error) {
      handleBridgeError(error, "getArticlesPubliesByRayon");
      if (isTrioBridgeMigrationApplied) handleFetchError(error, "getArticlesPubliesByRayon");
      return [];
    }
    return ((data ?? []) as ArticleRow[]).map(articleToProduitPublic);
  } catch (e: any) {
    handleFetchError(e, "getArticlesPubliesByRayon (exception)");
    return [];
  }
}

/**
 * Single published article by slug. Returns null if not found, not
 * published, or the bridge is unconfigured.
 * Used by `produits-repo.getProduitBySlug` as the 2nd fallback.
 */
export async function getArticleBySlug(
  slug: string,
): Promise<ProduitPublic | null> {
  if (!supabaseInventaire || !isTrioBridgeMigrationApplied) return null;
  try {
    const { data, error } = await supabaseInventaire
      .from("articles")
      .select(SELECT_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      if (error) {
        handleBridgeError(error, "getArticleBySlug");
        if (isTrioBridgeMigrationApplied) handleFetchError(error, "getArticleBySlug");
      }
      return null;
    }
    return articleToProduitPublic(data as ArticleRow);
  } catch (e: any) {
    handleFetchError(e, "getArticleBySlug (exception)");
    return null;
  }
}

/**
 * Every published article slug — used by `produits-repo.getAllProduitSlugs`
 * which feeds the `getStaticPaths()` of `/produits/[slug].astro` so the
 * SSG step pre-renders one page per article.
 */
export async function getArticleSlugs(): Promise<string[]> {
  if (!supabaseInventaire || !isTrioBridgeMigrationApplied) return [];
  try {
    const { data, error } = await supabaseInventaire
      .from("articles")
      .select("slug")
      .not("slug", "is", null);
    if (error) {
      handleBridgeError(error, "getArticleSlugs");
      if (isTrioBridgeMigrationApplied) handleFetchError(error, "getArticleSlugs");
      return [];
    }
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  } catch (e: any) {
    handleFetchError(e, "getArticleSlugs (exception)");
    return [];
  }
}

/**
 * Truthy iff the env vars are configured and the migration is applied.
 */
export function isBridgeAvailable(): boolean {
  return supabaseInventaire !== null && isTrioBridgeMigrationApplied;
}

