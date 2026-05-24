/**
 * /api/admin/home/editorial
 *
 * Admin CRUD for `public.home_editorial_slides` — the editorial slides
 * the homepage PromoHero injects between mise_en_avant promos.
 *
 *   GET    : list every slide (active + inactive)
 *   POST   : create one — body = full row minus id/timestamps
 *   PUT    : bulk replace — body = { slides: [...] }, upsert by slug
 *   PATCH  : partial update — body = { id, ...patch }
 *   DELETE : hard delete — body = { id } OR querystring ?id=...
 *
 * All routes require the admin cookie (isAuthenticated).
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";
import { slugifyKey } from "@/lib/slug";

export const prerender = false;

const ALLOWED_FIELDS = new Set([
  "slug",
  "eyebrow",
  "titre",
  "description",
  "image",
  "image_alt",
  "cta_label",
  "cta_href",
  "accent",
  "ordre",
  "actif",
]);

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

function normalize(raw: any) {
  const slug = slugifyKey(raw.slug || raw.titre || "");
  if (!slug) throw new Error("Slug invalide : doit contenir au moins un caractère alphanumérique.");
  if (!raw.titre || !String(raw.titre).trim()) throw new Error("Le titre est obligatoire.");
  if (!raw.image || !String(raw.image).trim()) throw new Error("L'image est obligatoire.");

  return {
    slug,
    eyebrow: raw.eyebrow != null ? String(raw.eyebrow).trim() : "",
    titre: String(raw.titre).trim(),
    description: raw.description != null ? String(raw.description).trim() : "",
    image: String(raw.image).trim(),
    image_alt: raw.image_alt != null ? String(raw.image_alt).trim() : "",
    cta_label: raw.cta_label != null ? String(raw.cta_label).trim() : "",
    cta_href: raw.cta_href != null ? String(raw.cta_href).trim() : "",
    accent: raw.accent != null && String(raw.accent).trim() !== "" ? String(raw.accent).trim() : "#1C6B35",
    ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : 0,
    actif: raw.actif !== false,
  };
}

/* ----------------------------------------------------------------- */
/* GET — list                                                         */
/* ----------------------------------------------------------------- */
export const GET: APIRoute = async ({ cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const { data, error } = await supabaseAdmin!
    .from("home_editorial_slides")
    .select("*")
    .order("ordre", { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json({ slides: data ?? [] });
};

/* ----------------------------------------------------------------- */
/* POST — create one                                                  */
/* ----------------------------------------------------------------- */
export const POST: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    const row = normalize(body);
    const { data, error } = await supabaseAdmin!
      .from("home_editorial_slides")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "home_slide",
      entity_id: data?.id ?? null,
      entity_label: data?.titre ?? row.slug,
      action: "create",
      payload: { slug: data?.slug },
    });
    return json({ slide: data }, 201);
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PUT — bulk replace (upsert by slug)                                */
/* ----------------------------------------------------------------- */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    if (!Array.isArray(body.slides)) {
      return json({ error: "Format attendu : { slides: [...] }" }, 400);
    }
    const rows = body.slides.map(normalize);
    const { data, error } = await supabaseAdmin!
      .from("home_editorial_slides")
      .upsert(rows, { onConflict: "slug" })
      .select();
    if (error) throw error;
    logActivity({
      entity: "home_slide",
      action: "import",
      entity_label: `${data?.length ?? 0} slide(s)`,
      payload: { count: data?.length ?? 0, slugs: (data ?? []).map((r: any) => r.slug) },
    });
    return json({ slides: data ?? [], count: data?.length ?? 0 });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PATCH — partial update                                             */
/* ----------------------------------------------------------------- */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return json({ error: "Missing id" }, 400);

    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "id") continue;
      if (!ALLOWED_FIELDS.has(k)) continue;
      patch[k] = v;
    }
    if ("slug" in patch) {
      patch.slug = slugifyKey(patch.slug);
      if (!patch.slug) return json({ error: "Slug invalide" }, 400);
    }
    if ("ordre" in patch) {
      const n = Number(patch.ordre);
      if (!Number.isFinite(n)) return json({ error: "Ordre doit être un nombre" }, 400);
      patch.ordre = n;
    }

    const { data, error } = await supabaseAdmin!
      .from("home_editorial_slides")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "home_slide",
      entity_id: id,
      entity_label: data?.titre ?? null,
      action: "update",
      payload: { fields: Object.keys(patch) },
    });
    return json({ slide: data });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* DELETE — hard delete                                               */
/* ----------------------------------------------------------------- */
export const DELETE: APIRoute = async ({ request, url, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  let id: string | null = null;
  try {
    const body = await request.json();
    id = body?.id ?? null;
  } catch {
    /* No body — fall through to querystring. */
  }
  if (!id) id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400);

  const { data: snap } = await supabaseAdmin!
    .from("home_editorial_slides")
    .select("id, titre, slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin!
    .from("home_editorial_slides")
    .delete()
    .eq("id", id);
  if (error) return json({ error: error.message }, 500);
  logActivity({
    entity: "home_slide",
    entity_id: id,
    entity_label: snap?.titre ?? snap?.slug ?? null,
    action: "delete",
    payload: {},
  });
  return new Response(null, { status: 204 });
};
