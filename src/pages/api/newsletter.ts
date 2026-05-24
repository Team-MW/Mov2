import type { APIRoute } from "astro";

/**
 * POST /api/newsletter
 * Accepts form-encoded or JSON payload with { email }.
 * In prod, forward to Brevo / Mailchimp using env API key.
 * Here, we simply echo back success to keep the pipeline working in dev.
 *
 * `prerender = false` required in hybrid mode (cf login.ts).
 */
import { isRateLimited } from "../../lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const ct = request.headers.get("content-type") ?? "";
  let email = "";
  let wantsJson = ct.includes("application/json");
  let honeypot = "";

  // 1. Get client IP and rate-limit
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || clientAddress || "127.0.0.1";
  const limitCheck = isRateLimited(ip, 5, 60000); // max 5 per minute

  if (limitCheck.limited) {
    const errorMsg = "Trop de tentatives. Veuillez réessayer plus tard.";
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/?newsletter=error&msg=429", 303);
  }

  // 2. Parse payload
  if (wantsJson) {
    const body = await request.json().catch(() => ({}));
    email = typeof body.email === "string" ? body.email : "";
    honeypot = typeof body.phone_confirm === "string" ? body.phone_confirm : "";
  } else {
    const form = await request.formData();
    email = String(form.get("email") ?? "");
    honeypot = String(form.get("phone_confirm") ?? "");
  }

  // 3. Honeypot check (spam bot detection)
  if (honeypot) {
    console.log("[newsletter] Spam detected (honeypot filled):", honeypot);
    // Silent success to fool bots
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: true, spam: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/?newsletter=ok", 303);
  }

  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!ok) {
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: false, error: "Email invalide" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    return redirect("/?newsletter=error", 303);
  }

  // TODO (prod) — forward to Brevo / Mailchimp
  console.log("[newsletter] subscribe:", email);

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return redirect("/?newsletter=ok", 303);
};

