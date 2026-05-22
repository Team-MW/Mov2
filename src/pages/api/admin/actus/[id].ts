/**
 * /api/admin/actus/[id]
 *
 * Per-row operations on an actu :
 *   PATCH  : partial update (any subset of allowed fields)
 *   DELETE : hard delete (use PATCH actif=false for soft-hide)
 *
 * The [id] segment accepts either the UUID primary key OR the slug.
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin, type RayonSlug, type ActuType } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";

export const prerender = false;

const ALLOWED_FIELDS = new Set([
  "titre",
  "resume",
  "image",
  "image_alt",
  "type",
  "rayon",
  "date",
  "href",
  "badge_label",
  "actif",
  "slug",
  "contenu",
  "auteur",
]);

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

/* Try id as uuid, fall back to slug. Returns the canonical uuid or null. */
async function resolveIdToUuid(idOrSlug: string): Promise<string | null> {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(idOrSlug)) return idOrSlug;
  const { data } = await supabaseAdmin!
    .from("actus")
    .select("id")
    .eq("slug", idOrSlug)
    .maybeSingle();
  return data?.id ?? null;
}

/* ----------------------------------------------------------------- */
/* PATCH — partial update                                             */
/* ----------------------------------------------------------------- */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const rawId = params.id;
  if (!rawId) return json({ error: "Missing id" }, 400);

  const uuid = await resolveIdToUuid(rawId);
  if (!uuid) return json({ error: "Actualité introuvable" }, 404);

  try {
    const body = await request.json();
    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      patch[k] = v;
    }

    if ("type" in patch) {
      const type = String(patch.type).trim() as ActuType;
      if (!ALLOWED_TYPES.includes(type)) {
        return json({ error: `Type d'actualité invalide : ${type}` }, 400);
      }
      patch.type = type;
    }

    if ("rayon" in patch) {
      if (patch.rayon && String(patch.rayon).trim() !== "") {
        const r = String(patch.rayon).trim();
        if (!ALLOWED_RAYONS.includes(r as RayonSlug)) {
          return json({ error: `Rayon invalide : ${r}` }, 400);
        }
        patch.rayon = r;
      } else {
        patch.rayon = null;
      }
    }

    if ("date" in patch && patch.date) {
      const d = new Date(patch.date);
      if (isNaN(d.getTime())) {
        return json({ error: "Format de date invalide" }, 400);
      }
      patch.date = d.toISOString();
    }

    if ("slug" in patch) {
      patch.slug = String(patch.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!patch.slug) {
        return json({ error: "Slug invalide" }, 400);
      }
    }

    const { data, error } = await supabaseAdmin!
      .from("actus")
      .update(patch)
      .eq("id", uuid)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "actu",
      entity_id: data?.id ?? uuid,
      entity_label: data?.titre ?? null,
      action: "update",
      payload: { fields: Object.keys(patch), patch },
    });
    return json({ actu: data });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* DELETE — hard delete                                               */
/* ----------------------------------------------------------------- */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const rawId = params.id;
  if (!rawId) return json({ error: "Missing id" }, 400);

  const uuid = await resolveIdToUuid(rawId);
  if (!uuid) return json({ error: "Actualité introuvable" }, 404);

  /* Snapshot for the audit feed before the row vanishes. */
  const { data: snap } = await supabaseAdmin!
    .from("actus")
    .select("id, titre, slug, type")
    .eq("id", uuid)
    .maybeSingle();

  const { error } = await supabaseAdmin!.from("actus").delete().eq("id", uuid);
  if (error) return json({ error: error.message }, 500);
  logActivity({
    entity: "actu",
    entity_id: uuid,
    entity_label: snap?.titre ?? snap?.slug ?? null,
    action: "delete",
    payload: { type: snap?.type ?? null, slug: snap?.slug ?? null },
  });
  return new Response(null, { status: 204 });
};
