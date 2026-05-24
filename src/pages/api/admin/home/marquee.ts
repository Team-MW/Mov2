/**
 * /api/admin/home/marquee
 *
 * Admin CRUD for `public.home_marquee_items` — labels of the
 * KineticMarquee on the homepage.
 *
 *   GET    : list every item
 *   POST   : create one — body = { label, ordre?, actif? }
 *   PUT    : bulk replace — body = { items: [...] }, replaces ordre too
 *   PATCH  : partial update — body = { id, ...patch }
 *   DELETE : hard delete — body = { id } OR ?id=...
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";

export const prerender = false;

const ALLOWED_FIELDS = new Set(["label", "ordre", "actif"]);

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
  const label = raw.label != null ? String(raw.label).trim() : "";
  if (!label) throw new Error("Le libellé est obligatoire.");
  return {
    label,
    ordre: Number.isFinite(Number(raw.ordre)) ? Number(raw.ordre) : 0,
    actif: raw.actif !== false,
  };
}

/* ----------------------------------------------------------------- */
/* GET                                                                */
/* ----------------------------------------------------------------- */
export const GET: APIRoute = async ({ cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const { data, error } = await supabaseAdmin!
    .from("home_marquee_items")
    .select("*")
    .order("ordre", { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json({ items: data ?? [] });
};

/* ----------------------------------------------------------------- */
/* POST                                                               */
/* ----------------------------------------------------------------- */
export const POST: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    const row = normalize(body);
    const { data, error } = await supabaseAdmin!
      .from("home_marquee_items")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "home_marquee",
      entity_id: data?.id ?? null,
      entity_label: data?.label ?? row.label,
      action: "create",
      payload: {},
    });
    return json({ item: data }, 201);
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PUT — bulk replace (delete-then-insert pattern keeps ordre clean)  */
/* ----------------------------------------------------------------- */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return json({ error: "Format attendu : { items: [...] }" }, 400);
    }
    const rows = body.items.map((it: any, i: number) =>
      normalize({ ...it, ordre: it.ordre ?? i }),
    );

    /* Replace strategy : truncate then insert. The marquee is small
     * (typically 4-10 items) so the round-trip cost is negligible and
     * we avoid the upsert "by id" complexity since we let the DB
     * generate UUIDs on insert. RLS bypassed via service_role. */
    const del = await supabaseAdmin!.from("home_marquee_items").delete().not("id", "is", null);
    if (del.error) throw del.error;

    if (rows.length === 0) {
      logActivity({
        entity: "home_marquee",
        action: "import",
        entity_label: "0 item(s)",
        payload: { count: 0 },
      });
      return json({ items: [], count: 0 });
    }

    const { data, error } = await supabaseAdmin!
      .from("home_marquee_items")
      .insert(rows)
      .select();
    if (error) throw error;
    logActivity({
      entity: "home_marquee",
      action: "import",
      entity_label: `${data?.length ?? 0} item(s)`,
      payload: { count: data?.length ?? 0 },
    });
    return json({ items: data ?? [], count: data?.length ?? 0 });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* PATCH                                                              */
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
    if ("ordre" in patch) {
      const n = Number(patch.ordre);
      if (!Number.isFinite(n)) return json({ error: "Ordre doit être un nombre" }, 400);
      patch.ordre = n;
    }
    if ("label" in patch) {
      const l = String(patch.label ?? "").trim();
      if (!l) return json({ error: "Le libellé ne peut pas être vide" }, 400);
      patch.label = l;
    }

    const { data, error } = await supabaseAdmin!
      .from("home_marquee_items")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    logActivity({
      entity: "home_marquee",
      entity_id: id,
      entity_label: data?.label ?? null,
      action: "update",
      payload: { fields: Object.keys(patch) },
    });
    return json({ item: data });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};

/* ----------------------------------------------------------------- */
/* DELETE                                                             */
/* ----------------------------------------------------------------- */
export const DELETE: APIRoute = async ({ request, url, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  let id: string | null = null;
  try {
    const body = await request.json();
    id = body?.id ?? null;
  } catch {
    /* no body */
  }
  if (!id) id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400);

  const { data: snap } = await supabaseAdmin!
    .from("home_marquee_items")
    .select("id, label")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin!
    .from("home_marquee_items")
    .delete()
    .eq("id", id);
  if (error) return json({ error: error.message }, 500);
  logActivity({
    entity: "home_marquee",
    entity_id: id,
    entity_label: snap?.label ?? null,
    action: "delete",
    payload: {},
  });
  return new Response(null, { status: 204 });
};
