import type { APIRoute } from "astro";
import { isRateLimited } from "../../lib/rate-limit";

/**
 * POST /api/contact — service client form.
 * Fields: prenom, nom, email, sujet, message, rgpd.
 * Logs + returns JSON (or redirect for form-encoded).
 *
 * `prerender = false` required in hybrid mode (cf login.ts).
 */
export const prerender = false;


export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const ct = request.headers.get("content-type") ?? "";
  const wantsJson = ct.includes("application/json");
  let payload: Record<string, string> = {};

  // 1. Get client IP and rate-limit (e.g. max 3 messages per minute)
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || clientAddress || "127.0.0.1";
  const limitCheck = isRateLimited(ip, 3, 60000); 

  if (limitCheck.limited) {
    const errorMsg = "Trop de tentatives. Veuillez réessayer plus tard.";
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/service-client?contact=error&msg=429", 303);
  }

  // 2. Parse payload
  if (wantsJson) {
    payload = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) payload[k] = String(v);
  }

  const { prenom, nom, email, sujet, message, phone_confirm } = payload;

  // 3. Honeypot check (spam bot detection)
  if (phone_confirm) {
    console.log("[contact] Spam detected (honeypot filled):", phone_confirm);
    // Silent success to fool bots
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: true, spam: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/service-client?contact=ok", 303);
  }

  if (!prenom || !nom || !email || !sujet || !message) {
    const err = "Tous les champs obligatoires doivent être remplis";
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/service-client?contact=error", 303);
  }

  // TODO (prod) — forward to email service (Resend, SendGrid…)
  console.log("[contact]", { prenom, nom, email, sujet });

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return redirect("/service-client?contact=ok", 303);
};

