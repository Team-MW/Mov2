# 03 — ANALYTICS & PRIVACY (RGPD)

> Covers: **F-18** (no analytics active), **F-19** (cookie policy describes a setup
> that doesn't exist).
> Binding decision **D6**: enable **cookieless Vercel Web Analytics** and **rewrite**
> the cookie/legal pages to match reality. **No consent banner.**
> Read `00-MASTER-INDEX.md` first.

**Reality after this blueprint:**
- Analytics = **Vercel Web Analytics** (cookieless, aggregated, RGPD-friendly).
- Cookies actually set by the site = **only `mdm_auth`** (admin session). *(The geo
  cookie `preferred_magasin` is being removed in `01-store-purge.md` §E.3 — if for any
  reason it still exists when you do this file, list it too; otherwise omit it.)*
- **No** Plausible. **No** `cookie_consent` cookie. **No** consent banner.

---

## SECTION A — F-18: turn on cookieless analytics

### A.1 — `astro.config.mjs` (~line 23)
- **Find:** `webAnalytics: { enabled: false }`
- **Replace with:** `webAnalytics: { enabled: true }`
- **Why:** the `@astrojs/vercel` adapter then injects Vercel's cookieless analytics
  script automatically on Vercel deploys. No tracking cookie, no banner required.
- **Watch-out:**
  - This is inside the `vercel({ … })` adapter options object — make sure you edit the
    one under the adapter, not invent a new key.
  - You do **not** need to import `@vercel/analytics` manually; the adapter handles it.
  - Analytics only emit on the **Vercel deployment**, not `localhost`. Don't expect
    local hits.

**Acceptance check (F-18):** after `npm run build`, the generated HTML/headers
reference Vercel insights (e.g. a request to `/_vercel/insights/script.js` once
deployed). Locally, just confirm the build is green and the config parses.

---

## SECTION B — F-19: rewrite `politique-de-cookies.astro`

**File:** `src/pages/politique-de-cookies.astro` (~83 lines).
Keep the page's layout/components; only correct the **content** in three spots.

### B.1 — Remove the false "Plausible" claim (~lines 39–45)
- **Find:** the paragraph/section naming **Plausible Analytics**.
- **Replace with** copy describing the real setup, e.g.:

  ```
  <h2>Mesure d'audience</h2>
  <p>
    Nous utilisons <strong>Vercel Web Analytics</strong>, une solution de mesure
    d'audience <strong>sans cookie</strong>. Les données collectées sont agrégées et
    anonymes (pages vues, pays, type d'appareil) ; elles ne permettent pas de vous
    identifier et ne sont pas utilisées à des fins publicitaires.
  </p>
  ```

### B.2 — Fix the cookie list (~lines 35–36)
- **Find:** the list/table citing cookies `session` and `cookie_consent`.
- **Replace with** the real, single essential cookie:

  ```
  <h2>Cookies strictement nécessaires</h2>
  <ul>
    <li>
      <strong>mdm_auth</strong> — cookie de session réservé à l'espace
      d'administration du site (connexion sécurisée). Il n'est déposé que pour les
      personnes qui se connectent à l'administration.
    </li>
  </ul>
  <p>
    Aucun cookie publicitaire ou de suivi tiers n'est déposé. Notre mesure d'audience
    (Vercel Web Analytics) fonctionne sans cookie.
  </p>
  ```
  *(If `preferred_magasin` was NOT removed by `01-store-purge.md`, add it here as a
  functional cookie. After the purge it should be gone — then omit it.)*

### B.3 — Remove the "consent banner" instructions (~lines 53–57)
- **Find:** the sentence telling users to manage preferences via *"le bandeau de
  consentement en bas de votre écran"*.
- **Replace with** browser-based management copy (true, since all cookies are essential):

  ```
  <p>
    Le cookie strictement nécessaire ci-dessus ne requiert pas de consentement
    préalable. Vous pouvez à tout moment gérer ou supprimer les cookies depuis les
    réglages de votre navigateur. La désactivation du cookie d'administration empêche
    seulement la connexion à l'espace d'administration et n'affecte pas la navigation.
  </p>
  ```

**Acceptance check (B):** the page no longer mentions Plausible, `cookie_consent`,
`session`, or a consent banner; it names `mdm_auth` + cookieless Vercel analytics.
`rg -ni "plausible|cookie_consent|bandeau de consentement" src/pages/politique-de-cookies.astro`
→ 0 hits.

---

## SECTION C — mentions-legales: remove the consent-banner reference

### C.1 — `src/pages/mentions-legales.astro` (~lines 73–77)
- **Find:** the cookies/consent paragraph that also refers users to a *"bandeau de
  consentement"*.
- **Replace with** a short, accurate paragraph + a link to the cookie policy:

  ```
  <p>
    Le site dépose uniquement un cookie strictement nécessaire au fonctionnement de
    l'espace d'administration et utilise une mesure d'audience sans cookie. Aucun
    consentement préalable n'est requis. Pour plus de détails, consultez notre
    <a href="/politique-de-cookies">politique de cookies</a>.
  </p>
  ```
- **Why:** keeps the two legal pages consistent and truthful.

**Acceptance check (C):**
`rg -ni "bandeau de consentement|plausible" src/pages/mentions-legales.astro` → 0 hits.

---

## CROSS-FILE CONSISTENCY (do this last)
Sweep the whole repo for leftover false privacy claims:
```
rg -ni "plausible|cookie_consent|bandeau de consentement" src/
```
Every hit must be gone or corrected. If you find a consent-banner **component** that
is imported anywhere, confirm it's not actually mounted; we are intentionally
**not** shipping a banner (D6).

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `astro.config.mjs` has `webAnalytics: { enabled: true }`.
2. `npx astro check` → no new errors; `npm run build` (or `npx astro build`) → green.
3. `/politique-de-cookies` and `/mentions-legales` read truthfully: cookieless
   analytics, single `mdm_auth` cookie, no banner.
4. Repo-wide grep (above) returns 0 stale claims.

Then mark **F-18/F-19 = DONE** in `00-MASTER-INDEX.md` §4.
