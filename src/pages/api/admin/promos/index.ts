/**
 * /api/admin/promos
 *
 * Admin CRUD for the public.promos table in Supabase.
 * Protected by the admin cookie (isAuthenticated).
 * Writes use the service_role key so they bypass RLS.
 *
 *   GET    : list all promos (active + inactive)
 *   POST   : create a single promo
 *   PUT    : bulk upsert (import), body = { promos: [...] }
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin, type RayonSlug, type MagasinSlug } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";
import { slugifyKey } from "@/lib/slug";

export const prerender = false;

/* ----------------------------------------------------------------- */
/* Helpers                                                            */
/* ----------------------------------------------------------------- */

const ALLOWED_RAYONS: readonly RayonSlug[] = [
  "boucherie-halal",
  "fruits-legumes",
  "epices-du-monde",
  "saveurs-afrique",
  "saveurs-asie",
  "saveur-mediterranee",
  "saveur-sud-amer",
  "balkans-turques",
  "produits-courants",
  "surgeles",
  "boulangerie",
  "produits-laitiers",
];
const ALLOWED_MAGASINS: readonly MagasinSlug[] = ["toulouse-sud"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function requireAdmin(cookies: import("astro").AstroCookies): Promise<Response | null> {
  if (!(await isAuthenticated(cookies))) return json({ error: "Unauthorized" }, 401);
  if (!supabaseAdmin) return json({ error: "Supabase service_role key missing" }, 500);
  return null;
}

function normalizePromo(raw: any) {
  const required = [
    "slug",
    "titre",
    "prix_original",
    "prix_promo",
    "reduction_pct",
    "rayon",
    "date_debut",
    "date_fin",
  ];
  for (const f of required) {
    if (raw[f] === undefined || raw[f] === null || raw[f] === "") {
      throw new Error(`Champ obligatoire manquant : ${f}`);
    }
  }
  const rayon = String(raw.rayon).trim();
  if (!ALLOWED_RAYONS.includes(rayon as RayonSlug)) {
    throw new Error(`Rayon invalide : ${rayon}`);
  }
  const magasin = String(raw.magasin ?? "tous").trim();
  if (!ALLOWED_MAGASINS.includes(magasin as MagasinSlug)) {
    throw new Error(`Magasin invalide : ${magasin}`);
  }
  const prix_original = Number(raw.prix_original);
  const prix_promo = Number(raw.prix_promo);
  const reduction_pct = Math.round(Number(raw.reduction_pct));
  if (!Number.isFinite(prix_original) || prix_original <= 0) {
    throw new Error(`prix_original doit être un nombre > 0`);
  }
  if (!Number.isFinite(prix_promo) || prix_promo < 0) {
    throw new Error(`prix_promo doit être un nombre >= 0`);
  }
  if (!Number.isFinite(reduction_pct) || reduction_pct < 0 || reduction_pct > 99) {
    throw new Error(`reduction_pct doit être entre 0 et 99`);
  }

  /* Same NFD-strip normalisation as produits — matches `slugifyLocal()`
   * in `PromosManager.jsx` so client-side and server-side stay
   * byte-for-byte aligned on round-trip. */
  const slug = slugifyKey(raw.slug);
  if (!slug) {
    throw new Error("Slug invalide : doit contenir au moins un caractère alphanumérique");
  }
  return {
    slug,
    titre: String(raw.titre).trim(),
    description: raw.description != null ? String(raw.description) : "",
    image_url: raw.image_url || raw.image || null,
    prix_original,
    prix_promo,
    reduction_pct,
    rayon,
    magasin,
    date_debut: String(raw.date_debut),
    date_fin: String(raw.date_fin),
    mise_en_avant: !!raw.mise_en_avant,
    ticker_semaine: !!raw.ticker_semaine,
    actif: raw.actif !== false,
    ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : 0,
  };
}

/**
 * Enforce single-slot constraint on the urgent ticker banner.
 * If the row(s) about to be saved set ticker_semaine = true, every
 * OTHER row in the table is forced to false BEFORE the insert/upsert
 * lands. Excluding the slugs we're saving avoids a self-erase.
 */
async function clearOtherTickers(slugsBeingSaved: string[]): Promise<void> {
  if (!supabaseAdmin) return;
  const update = supabaseAdmin
    .from("promos")
    .update({ ticker_semaine: false });
  const filtered =
    slugsBeingSaved.length > 0
      ? update.not("slug", "in", `(${slugsBeingSaved.map((s) => `"${s}"`).join(",")})`)
      : update.eq("ticker_semaine", true); /* defensive : if no slugs, clear all */
  await filtered;
}

/* ----------------------------------------------------------------- */
/* GET — list all promos                                              */
/* ----------------------------------------------------------------- */
export const GET: APIRoute = async ({ cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const { data, error } = await supabaseAdmin!
    .from("promos")
    .select("*")
    .order("ordre", { ascending: true })
    .order("date_fin", { ascending: true });

  if (error) return json({ error: error.message }, 500);
  return json({ promos: data ?? [] });
};

/* ----------------------------------------------------------------- */
/* POST — create a single promo                                       */
/* ----------------------------------------------------------------- */
export const POST: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    const row = normalizePromo(body);
    /* Enforce “one-and-only-one” ticker before the insert lands. */
    if (row.ticker_semaine) {
      await clearOtherTickers([row.slug]);
    }
    const { data, error } = await supabaseAdmin!
      .from("promos")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "promo",
      entity_id: data?.id ?? null,
      entity_label: data?.titre ?? row.slug,
      action: "create",
      payload: {
        rayon: data?.rayon,
        slug: data?.slug,
        magasin: data?.magasin,
        ticker_semaine: !!data?.ticker_semaine,
      },
    });
    return json({ promo: data }, 201);
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PUT — bulk upsert (import)                                         */
/* Body : { promos: [...] }                                           */
/* ----------------------------------------------------------------- */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    if (!Array.isArray(body.promos)) {
      return json({ error: "Format attendu : { promos: [...] }" }, 400);
    }
    const rows = body.promos.map(normalizePromo);
    /* Bulk imports may carry multiple ticker_semaine=true entries by
     * mistake. Keep ONLY the LAST one as authoritative; force the
     * earlier ones to false so the DB can never end up with two
     * tickers visible at the same time on the homepage. */
    const tickerIndices: number[] = [];
    rows.forEach((r: any, i: number) => {
      if (r.ticker_semaine) tickerIndices.push(i);
    });
    if (tickerIndices.length > 1) {
      const winner = tickerIndices[tickerIndices.length - 1];
      tickerIndices.forEach((i) => {
        if (i !== winner) rows[i].ticker_semaine = false;
      });
    }
    const winnerSlugs = rows.filter((r: any) => r.ticker_semaine).map((r: any) => r.slug);
    if (winnerSlugs.length > 0) {
      await clearOtherTickers(winnerSlugs);
    }
    const { data, error } = await supabaseAdmin!
      .from("promos")
      .upsert(rows, { onConflict: "slug" })
      .select();
    if (error) throw error;
    logActivity({
      entity: "promo",
      action: "import",
      entity_label: `${data?.length ?? 0} promo(s)`,
      payload: {
        count: data?.length ?? 0,
        slugs: (data ?? []).slice(0, 50).map((r: any) => r.slug),
        ticker_winner: winnerSlugs[0] ?? null,
      },
    });
    return json({ promos: data ?? [], count: data?.length ?? 0 });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};
