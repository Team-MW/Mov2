// Middleware Astro : protège toutes les pages et toutes les routes /api/* de l'inventaire
// avec le cookie de session "mdm_auth". Tout visiteur sans session valide est
// redirigé vers /admin/inventaire/code (ou reçoit un 401 JSON pour les appels API).

import { COOKIE_NAME, verifySessionToken } from './lib/admin/auth.js';

// Chemins toujours accessibles pour l'admin
const PUBLIC_PATHS = new Set([
  '/admin/inventaire/code',
  '/api/admin/inventaire/auth/login',
  '/api/admin/inventaire/auth/logout',
  '/favicon.svg',
  '/favicon.ico',
  '/robots.txt',
]);

function isPublic(pathname) {
  // Normalisation du chemin : supprime le slash de fin s'il y en a un (sauf pour '/')
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') 
    ? pathname.slice(0, -1) 
    : pathname;

  // On protège tout ce qui touche à l'inventaire
  const isInventairePath = 
    cleanPath === '/admin/inventaire' || 
    cleanPath.startsWith('/admin/inventaire/') || 
    cleanPath.startsWith('/api/admin/inventaire/');

  if (!isInventairePath) {
    return true;
  }

  if (PUBLIC_PATHS.has(cleanPath)) return true;

  // Astro/Vite assets et endpoints internes
  if (pathname.startsWith('/_astro/')) return true;
  if (pathname.startsWith('/_image')) return true;
  if (pathname.startsWith('/_actions/')) return true;
  return false;
}

export const onRequest = async (context, next) => {
  const { cookies, redirect, url } = context;
  const pathname = url.pathname;

  /* NOTE on geo-IP detection : we intentionally don't expose
   * `request.headers` via locals from middleware. Doing so triggers
   * the noisy "Astro.request.headers is unavailable in static output
   * mode" warning during build (middleware runs at prerender time
   * with a fake Request whose .headers getter complains). On-demand
   * pages that need IP geolocation can read `Astro.request.headers`
   * directly without warning. Prerendered pages fall back to the
   * cookie + default-store resolution in `resolveStore()`, which is
   * what we want anyway since their HTML is cached. */

  if (isPublic(pathname)) {
    return next();
  }

  const cookie = cookies.get(COOKIE_NAME);
  const session = verifySessionToken(cookie?.value || '');

  if (!session.ok) {
    // Pour les appels API on renvoie un JSON 401 au lieu de rediriger,
    // sinon les fetch() côté client recevraient du HTML.
    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', code: 'AUTH_REQUIRED' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        },
      );
    }
    // Pour une navigation classique, on redirige vers /admin/inventaire/code en gardant
    // l'URL d'origine pour pouvoir y revenir après authentification.
    const back = encodeURIComponent(pathname + url.search);
    return redirect(`/admin/inventaire/code?next=${back}`, 302);
  }

  // Expose l'expiration aux pages (utilisé par Layout.astro pour planifier
  // une auto-déconnexion côté client pile à l'expiration).
  locals.authExpiresAt = session.expiresAt;
  locals.authIssuedAt = session.issuedAt;
  locals.userRole = session.role;

  return next();
};
