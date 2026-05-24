/**
 * /api/admin/settings
 *
 * Admin API to manage global site configurations in `public.site_settings`.
 * Used for editing dynamic homepage SEO tags (Title, Description, OG Image).
 *
 *   GET   : List all configuration keys and values
 *   PATCH : Update a specific setting key — body = { key, value }
 *
 * Protected by admin authentication.
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/admin-activity";

export const prerender = false;

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

/* ----------------------------------------------------------------- */
/* GET — List settings                                                */
/* ----------------------------------------------------------------- */
export const GET: APIRoute = async ({ cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  const { data, error } = await supabaseAdmin!
    .from("site_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) return json({ error: error.message }, 500);
  return json({ settings: data ?? [] });
};

/* ----------------------------------------------------------------- */
/* PATCH — Update a setting                                           */
/* ----------------------------------------------------------------- */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const deny = await requireAdmin(cookies);
  if (deny) return deny;

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return json({ error: "Clé de configuration manquante ou invalide" }, 400);
    }
    if (value === undefined || value === null) {
      return json({ error: "Valeur manquante" }, 400);
    }

    const { data, error } = await supabaseAdmin!
      .from("site_settings")
      .update({ value: String(value).trim() })
      .eq("key", key)
      .select()
      .single();

    if (error) throw error;

    logActivity({
      entity: "site_setting",
      entity_id: key,
      entity_label: key,
      action: "update",
      payload: { value: String(value).trim() },
    });

    return json({ setting: data });
  } catch (err: any) {
    return json({ error: err.message || String(err) }, 400);
  }
};
