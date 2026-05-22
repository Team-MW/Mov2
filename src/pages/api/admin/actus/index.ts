/**
 * /api/admin/actus
 *
 * Admin CRUD for the public.actus table in Supabase.
 * Protected by the admin cookie (isAuthenticated).
 * Writes use the service_role key so they bypass RLS.
 *
 *   GET    : list all actus (active + inactive)
 *   POST   : create a single actu
 *   PUT    : bulk upsert (import), body = { actus: [...] }
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin, type RayonSlug, type ActuType } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";
import { slugifyKey } from "@/lib/slug";

export const prerender = false;

const ALLOWED_TYPES: readonly ActuType[] = ["article", "recette", "arrivage", "nouveaute", "evenement"];

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

function normalizeActu(raw: any) {
  const required = [
    "slug",
    "type",
    "titre",
    "image",
  ];
  for (const f of required) {
    if (raw[f] === undefined || raw[f] === null || String(raw[f]).trim() === "") {
      throw new Error(`Champ obligatoire manquant : ${f}`);
    }
  }

  const type = String(raw.type).trim() as ActuType;
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error(`Type d'actualité invalide : ${type}`);
  }

  let rayon: RayonSlug | null = null;
  if (raw.rayon && String(raw.rayon).trim() !== "") {
    const r = String(raw.rayon).trim();
    if (!ALLOWED_RAYONS.includes(r as RayonSlug)) {
      throw new Error(`Rayon invalide : ${r}`);
    }
    rayon = r as RayonSlug;
  }

  const slug = slugifyKey(raw.slug);
  if (!slug) {
    throw new Error("Slug invalide : doit contenir au moins un caractère alphanumérique");
  }

  // Parse or format date
  let dateStr = new Date().toISOString();
  if (raw.date) {
    const d = new Date(raw.date);
    if (!isNaN(d.getTime())) {
      dateStr = d.toISOString();
    }
  }

  return {
    slug,
    type,
    titre: String(raw.titre).trim(),
    resume: raw.resume != null ? String(raw.resume).trim() : "",
    image: String(raw.image).trim(),
    image_alt: raw.image_alt != null ? String(raw.image_alt).trim() : "",
    rayon,
    date: dateStr,
    href: raw.href != null ? String(raw.href).trim() : "",
    badge_label: raw.badge_label != null ? String(raw.badge_label).trim() : "",
    actif: raw.actif !== false,
    contenu: raw.contenu != null ? String(raw.contenu).trim() : "",
    auteur: raw.auteur != null ? String(raw.auteur).trim() : "L'équipe Marché de Mo'",
  };
}

/* ----------------------------------------------------------------- */
/* GET — list all actus                                               */
/* ----------------------------------------------------------------- */
export const GET: APIRoute = async ({ cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const { data, error } = await supabaseAdmin!
    .from("actus")
    .select("*")
    .order("date", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ actus: data ?? [] });
};

/* ----------------------------------------------------------------- */
/* POST — create a single actu                                        */
/* ----------------------------------------------------------------- */
export const POST: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    console.log("[actus POST] Received body:", JSON.stringify(body, null, 2));
    
    const row = normalizeActu(body);
    console.log("[actus POST] Normalized row:", JSON.stringify(row, null, 2));
    
    const { data, error } = await supabaseAdmin!
      .from("actus")
      .insert(row)
      .select()
      .single();
    
    if (error) {
      console.error("[actus POST] Supabase error:", error);
      throw error;
    }
    
    logActivity({
      entity: "actu",
      entity_id: data?.id ?? null,
      entity_label: data?.titre ?? row.slug,
      action: "create",
      payload: { type: data?.type, slug: data?.slug, rayon: data?.rayon },
    });
    return json({ actu: data }, 201);
  } catch (err: any) {
    console.error("[actus POST] Error:", err);
    return json({ error: err.message || String(err), details: err.toString() }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PUT — bulk upsert (import)                                         */
/* Body : { actus: [...] }                                            */
/* ----------------------------------------------------------------- */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    if (!Array.isArray(body.actus)) {
      return json({ error: "Format attendu : { actus: [...] }" }, 400);
    }
    const rows = body.actus.map(normalizeActu);
    const { data, error } = await supabaseAdmin!
      .from("actus")
      .upsert(rows, { onConflict: "slug" })
      .select();
    if (error) throw error;
    logActivity({
      entity: "actu",
      action: "import",
      entity_label: `${data?.length ?? 0} actualité(s)`,
      payload: {
        count: data?.length ?? 0,
        slugs: (data ?? []).slice(0, 50).map((r: any) => r.slug),
      },
    });
    return json({ actus: data ?? [], count: data?.length ?? 0 });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};
