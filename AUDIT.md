# Marché de Mo' V2 — Technical Audit & Technological Watch

> Prepared by Cascade. Single deliverable requested before any code change.
> Date: 2026-06-08. Scope: full codebase (`src/**`), config, content model,
> services, analytics/privacy, accessibility/legibility, plus a technological
> watch on the stack. **No code was modified to produce this report.**

---

## 0. How to read this document
fr
- Findings are grouped by area (A–K) and tagged with a **severity**:
  - **P0 — Critical**: broken in production, data loss, or crash.
  - **P1 — High**: significant incoherence, compliance gap, or broken UX.
  - **P2 — Medium**: legibility, consistency, or quality improvements.
  - **P3 — Low**: polish, repo hygiene, future-proofing.
- Each finding has a stable ID (e.g. `F-03`) so we can track fixes.
- Locations use `path:line`. Line numbers are from the audited snapshot.
- A consolidated, ordered action plan is in **§J**.
- Form wiring to `logiciel-formulaire` is intentionally kept for **last** (§I).

### Coverage note (honesty about depth)
Deeply audited: global layout/header/footer, home, the 6 public forms, the
rayons drill-down, search, the legal/RGPD pages, the data services
(`site`, `geo`, `supabase`, `promos-repo`, `produits-repo`, `home-content`,
`schema`, `banners`, `rate-limit`), styling tokens, and the analytics/privacy
posture. Audited at a **subsystem level** (not line-by-line): the `/admin`
React managers and the `inventaire-*` AI-vision pipeline — these are behind
auth and large; the report flags their one critical issue (F-01) and their
overall health, and I can deep-dive them on request.

---

## A. What is already good (so we don't regress it)

This is a genuinely high-craft codebase. Worth preserving:

- **Resilient data layer**: `promos-repo`, `produits-repo`, `home-content`
  all fall back from Supabase → Content Collections / local JSON, so a DB
  outage degrades to stale content instead of a white page.
- **Performance plumbing**: View Transitions + branded page loader, deferred
  image loading, `preconnect` to Typekit/Supabase, hero `preload`, prefetch.
- **Accessibility groundwork**: `prefers-reduced-motion` respected throughout,
  `inert` on carousel clones (per `DEPLOY.md`), focus-visible rings, sr-only labels.
- **SEO/structured data**: per-page OG/Twitter, JSON-LD (Organization, WebSite,
  GroceryStore, FAQ, Breadcrumb, Offer, Recipe, JobPosting), sitemap + robots.
- **AI-vision robustness** (`inventaire-*`): multi-provider chain
  (Gemini→Groq→Mistral) with per-key cooldown/rotation and graceful fallbacks.

---

## B. Critical bugs (P0)

### F-01 — Middleware crashes every authenticated inventaire request — **P0**
`src/middleware.js:83-85` does `locals.authExpiresAt = …` but `locals` is never
destructured from `context` (only `{ cookies, redirect, url }` are). Referencing
an undefined `locals` throws `ReferenceError: locals is not defined` whenever a
session **is valid** — i.e. exactly when a logged-in user browses
`/admin/inventaire/*`. The unauthenticated path works (it returns/redirects
before this line), which can mask the bug in casual testing.
- **Impact**: the protected inventaire area 500s for authenticated users.
- **Fix**: `const { cookies, redirect, url, locals } = context;` (or use
  `context.locals.*`).

### F-02 — All public form endpoints are stubs; submissions are lost — **P0**
`src/pages/api/contact.ts:68`, `newsletter.ts:71`, `candidature.ts:78`,
`fidelite.ts:33` validate input then only `console.log` with
`// TODO (prod) — forward to …`. `DEPLOY.md` confirms it: *"the four form
endpoints only log to the console"*, and `BREVO_*`/`RESEND_API_KEY` are
documented as *"not consumed by any shipping code path yet"*.
- **Impact**: contact messages, newsletter sign-ups, **job applications + CVs**,
  and loyalty sign-ups all go nowhere. This is the core reason for the
  `logiciel-formulaire` wiring task (§I).

### F-03 — The one "wired" form (contact) is broken in production — **P0**
`src/pages/service-client.astro:13` defaults
`FORM_ID = "http://localhost:3000/api/submit/90571e4a-…"` (a full localhost URL,
not a UUID). The submit code at `:204` builds
`fetch(\`${apiUrl}/submit/${formId}\`)`, yielding
`https://logiciel-formulaire.vercel.app/api/submit/http://localhost:3000/…`
— a malformed URL. `PUBLIC_FORM_API_URL` / `PUBLIC_FORM_ID` are **absent from
`.env.example`**, so the broken default is what ships.
- **Secondary bug**: `:165` calls `window.showToast(…, "info")`, but the toast
  engine (`Layout.astro:952`) only knows `success`/`error` — so the "Calcul de
  sécurité en cours…" message renders with a **red error** icon.
- **Fix**: `FORM_ID` must be just the UUID; document both env vars; map `info`
  to a neutral toast style.

### F-04 — Franchise form fakes success and discards data — **P0**
`src/pages/franchise.astro:330-354` POSTs `{nom,email,tel,region,apport,message,
type:"franchise"}` to `/api/contact`. But `/api/contact` requires `prenom`
**and** `sujet` (`contact.ts:57`) → returns **400**. The script never checks
`res.ok` and uses `.catch(() => ({ ok:true }))`, so it **always** shows
*"Candidature reçue avec succès !"*. The comment even says *"Simule l'appel API"*.
- **Impact**: franchise leads (high-value: €150k+ applicants) are silently lost
  while the user is told it worked.

---

## C. Data-model & content coherence (P1)

### F-05 — "Split-brain" store model: 1 store vs 3 — **P1**
The brief (`PROMPT-MAITRE.md`) describes **2 stores** (Portet + Toulouse Sud).
The implementation diverged inconsistently:
- `src/lib/site.ts:39` — `MagasinSlug = "toulouse-sud"` (**1** store only).
- `src/lib/supabase.ts:59`, `promos-repo.ts:28`, `schema.ts:103`,
  `content/config.ts:30,74`, and the promos admin API
  (`api/admin/promos/index.ts:38`, `[id].ts:49`) — all still allow `"portet"`.
- **Concrete breakage**: `schema.ts:106-109` `jobPostingSchema` with
  `magasin:"portet"` produces an **empty `jobLocation[]`** → invalid Google
  JobPosting. A promo/job tagged `portet` cannot be resolved by the front-end.
- **Stale Portet content still live**: `notre-enseigne.astro:22-25` narrates the
  Portet opening; `lib/actus.ts:122` says *"Les deux magasins"*;
  `index.astro:757` falls back to `/images/magasins/portet.jpg`.
- **Dead code**: `src/lib/geo.ts:24-41` (`getNearestStore` + haversine) and the
  cookie "remember last store" machinery are meaningless with one store.
- **Decision needed**: is Portet (a) gone, (b) coming, or (c) the current store
  mislabeled? Then make `site.ts`, the DB enums, content, schema, geo, and copy
  all agree. This is the single largest consistency debt.

### F-06 — "60 ans d'expérience" vs `foundedYear: 2024` — **P1 (claims/consistency)**
`home-content.ts:119` marquee says *"60 ans d'expérience"*; `franchise.astro`
repeats it 3× (`:24,:74,:96,:134`). Meanwhile `site.ts:22` `foundedYear: 2024`
and `index.astro:574` says *"Samir a ouvert le magasin en août 2024"*. Franchise
copy clarifies it as *"trois générations / expertise familiale"*, but the
home marquee states a bare *"60 ans d'expérience"* next to a 2024 founding.
- **Risk**: advertising-claim inconsistency (DGCCRF sensitivity in FR retail).
- **Fix**: standardize the framing everywhere → *"60 ans d'expérience familiale
  (3 générations)"* or similar, and never the bare "60 ans" without context.

### F-07 — Stale / contradictory opening timeline — **P1**
`site.ts:107` `dateOuverture: "Avril 2026"` (now in the past). The home story
says the magasin opened **août 2024** (that was Portet). The only store in data
is Toulouse Sud (Avril 2026). A visitor reading "ouvert en août 2024" then
landing on `/magasins` (Toulouse Sud, Avril 2026) gets a confused chronology.
- **Fix**: one coherent timeline tied to the real store(s); drop "ouverture
  prochaine"-style framing now that the date has passed.

### F-08 — Placeholder copy violates the brief — **P2/P1**
`PROMPT-MAITRE.md` Interdits: *"Pas de contenu placeholder « À suivre… »"*. Yet
"Bientôt en ligne / arrive bientôt" (`rayons/[...path].astro:977-983`),
"Photo à venir" (`ProduitCard.astro:74`, `produits/[slug].astro:135`,
`rayons/[...path].astro:941`), and "revenez bientôt"
(`recettes/index.astro:195`) ship. Decide: honor the brief (remove) or formally
amend the brief.

---

## D. Forms inventory & behavior (P0–P1)

Six public forms; current routing/behavior:

| Form | File | Posts to | Honeypot | res.ok checked? | Feedback | State |
|---|---|---|---|---|---|---|
| Contact | `service-client.astro` | microservice (PoW) | `_gotcha` | yes | toast | **broken URL (F-03)** |
| Suggestion | `index.astro:867` | `/api/contact` stub | `phone_confirm` | yes | toast | data lost (F-02) |
| Newsletter (footer) | `Footer.astro:198` | `/api/newsletter` stub | `phone_confirm` | yes | toast | data lost (F-02) |
| Newsletter (inline) | `NewsletterInline.astro` | `/api/newsletter` stub | `phone_confirm` | — | toast/redirect | data lost (F-02) |
| Fidélité | `programme-fidelite.astro:96` | `/api/fidelite` stub (native POST) | none | n/a | **none (F-09)** | data lost (F-02) |
| Candidature | `islands/ApplicationForm.jsx` | `/api/candidature` stub | `phone_confirm` | yes | inline | data + CV lost (F-02) |
| Franchise | `franchise.astro:218` | `/api/contact` (400) | none | **no** | fake toast | **F-04** |

### F-09 — Fidélité sign-up gives no feedback — **P1**
`programme-fidelite.astro:96` is a native POST; `api/fidelite.ts:30,41`
303-redirects to `/programme-fidelite?fidelite=ok|error`. But
`Layout.astro:980-1019` `checkUrlParams` only handles `newsletter` and
`contact` — **`fidelite` is ignored**, so no toast fires. The user sees a page
reload with a leftover `?fidelite=ok` and zero confirmation.

### F-10 — Honeypot field name inconsistency — **P1 (matters for wiring)**
Contact uses `_gotcha` (the microservice convention); suggestion/newsletter/
candidature use `phone_confirm`; franchise/fidélité have none. The
`logiciel-formulaire` API only honors **`_gotcha`**. When wiring (§I), every
form must switch to `_gotcha` or spam protection silently won't apply.

### F-11 — `fidelite.ts` weaker than its siblings — **P2**
Unlike `contact/newsletter/candidature`, `api/fidelite.ts` has **no rate-limit,
no honeypot check, no email-format validation**. Align it (or retire it once
forms are wired to the microservice).

---

## E. Services, APIs & sync issues

### F-12 — `supabase.ts` throws at import when env is missing — **P1**
`src/lib/supabase.ts:19-24` throws on missing `SUPABASE_URL`/`ANON_KEY` at
**module-eval time**. Because repos `import { supabase }` at the top, this
contradicts the documented *"preview deploys / local dev without `.env` fall
back gracefully"* claim (`home-content.ts:8-11`, `Layout.astro:91`): the import
crashes before any try/catch runs.
- **Fix**: construct a lazy/guarded client (return a null-ish client and let the
  existing per-call try/catch drive the fallback), or make the throw a warn.

### F-13 — Promos: "zero active promos" is impossible — **P2**
`promos-repo.ts:126-129`: `if (supa && supa.length > 0) return supa; return
fromContentCollection();`. A **legitimate empty** Supabase result (admin
deactivated all promos) falls through to the **stale JSON** collection, so old
promos reappear on the home/ticker. Distinguish "DB error/unreachable" (→
fallback) from "DB returned 0 rows" (→ show nothing).

### F-14 — Promos leak into the product catalogue — **P2**
`produits-repo.ts:256-268` maps active promos into `ProduitPublic` (slug + `-X%`
badge) inside `getAllProduits()`, and `getProduitBySlug()` resolves promo slugs
(`:366-381`). Result: promotions appear as **products** in `/produits`, in
search, and get their own `/produits/[slug]` page. Likely unintended; at minimum
it pollutes the catalogue/search and can create duplicate-looking entries.

### F-15 — Two divergent search systems — **P1**
There are **two** search indexes that have drifted:
- `src/pages/recherche.astro:75` links rayons to **`/produits/${slug}`**.
- `src/pages/api/search.ts:72` (Header autocomplete) links rayons to
  **`/rayons/${slug}`**.
Same entity, two destinations. Also the index is built twice (SSR-embedded JSON
in `recherche.astro` vs the cached API). Consolidate to one source + one URL
convention.

### F-16 — `recipeSchema` hardcodes the category — **P2 (SEO)**
`schema.ts:209` sets `recipeCategory: "Plat principal"` for **every** recipe, so
desserts/entrées are mislabeled in rich results. Drive it from recipe data.

### F-17 — In-memory rate limiting is unreliable on serverless — **P2**
`src/lib/rate-limit.ts` uses a process-local `Map`. On Vercel each invocation may
hit a different/cold instance, so counters don't share state → the 3–5/min
limits are best-effort at best. (Tech-watch §K confirms `@upstash/ratelimit` as
the standard serverless fix.) Lower priority once forms move to the microservice
(which has its own PoW + rate limiting).

---

## F. Analytics & privacy / RGPD

### F-18 — No analytics is active — **P1 (measurement gap)**
`astro.config.mjs:23` `webAnalytics: { enabled: false }`, and there's no GA /
Plausible / other tag anywhere. You currently have **zero traffic/behaviour
data**. `DEPLOY.md §5` documents the (cookieless, RGPD-friendly) Vercel toggle.
Decide on a tool and turn it on.

### F-19 — Cookie policy describes a privacy setup that doesn't exist — **P1 (compliance)**
`politique-de-cookies.astro` is materially inaccurate vs the code:
- `:39-45` claims **Plausible Analytics** — **not installed** anywhere.
- `:35-36` lists cookies `session` + `cookie_consent` — the real cookies are
  `mdm_auth` (admin) and `preferred_magasin` (geo); **no `cookie_consent`** is set.
- `:53-57` (and `mentions-legales.astro:73-77`) tell users to manage preferences
  via *"le bandeau de consentement en bas de votre écran"* — **there is no
  consent banner** in the codebase.
- **Impact**: legally inaccurate public statements. Two valid resolutions:
  (a) keep analytics off/cookieless and rewrite the policy to match reality
  (no banner needed for purely functional cookies), or (b) actually ship the
  named analytics + a consent banner. Today the page promises (b) but ships
  neither.

---

## G. Legibility & accessibility

### F-20 — Low-contrast caption text (`neutral-400` / `slate-400`) — **P2, widespread**
`tailwind.config.mjs` remaps `slate-400 = #999996` (~2.8:1 on white) and the UI
uses `neutral-400 = #a3a3a3` (~2.6:1) for small captions: "Photo à venir"
(`ProduitCard.astro:74`, `produits/[slug].astro:135`, `rayons/[...path].astro:941`),
product origins in the phone sim, the Header subtitle (`Header.astro:90`), and
many more (the grep for these tokens truncated at 1586 matches). All **fail WCAG
AA** for normal text. `DEPLOY.md` shows you already started this work
(neutral-400→500 on promo strikethrough); finish the sweep → `neutral-500`/`600`.

### F-21 — Themed primary buttons can be illegible on cultural sections — **P2**
`cultural-palettes.css:246-251` paints `[data-culture] .btn-primary` with
`background: var(--culture-accent)` and `color: var(--culture-text)`. The
`--culture-text` flag in `banners.ts` is chosen for legibility **on the gradient**,
not on the accent. For `text:"dark"` palettes the result is near-black text on a
**dark accent**: asie `#4F6E1C` + `#0f0f0f` (~2:1), hygiène `#B85257` + `#0f0f0f`
(~3:1), sauces `#A85710` + `#0f0f0f` (~3.3:1) → fail. Use a per-accent computed
on-color (white for dark accents) instead of reusing `--culture-text`.
- **Note (correction)**: the `CultureChip` itself is **fine** — its caption sits
  on a white strip with accent-colored text (`CultureChip.astro:143-154`). The
  risk is only the themed CTA buttons above.

### F-22 — Dark-surface fine print — **P3**
Footer credit/legal use `text-white/45`–`/50` at 12–12.5px
(`Footer.astro:66,172,182`) → ~3.4–4:1 on `#0F0F0F`. Bump to `/65`+ for the
agency credit and legal line.

### F-23 — Single-option store dropdowns — **P3 (UX)**
`programme-fidelite.astro:119` and `ApplicationForm.jsx:91` render a "Magasin
favori/préféré" `<select>` with exactly one option (Toulouse Sud). With one
store this is dead UI — hide it or show it as static text (ties to F-05).

---

## H. SEO, performance & web-flow

- **F-24 (P2)** — Dead anchor + phantom service: Footer "Livraison et retours" →
  `/service-client#livraison` (`Footer.astro:103`), but `service-client.astro`
  has **no `#livraison`** section. Combined with the home phone simulator's
  "Suivi de commande / Colis livré" (`index.astro:362-375,1154`), the site
  implies an **online ordering + delivery** service that doesn't exist. Either
  build/clarify it or remove the cues to avoid customer-expectation mismatch.
- **F-25 (P2)** — Phone simulator double-runs: `index.astro:1164-1166` calls
  `runPhoneSimulator()` immediately **and** on `astro:page-load`, so on the first
  paint two independent timer loops run concurrently → animation jank and wasted
  CPU. Register once (page-load only) or guard with a mounted flag.
- **F-26 (P3)** — `astro.config.mjs:13` `site` and `SITE.url` are the
  `*.vercel.app` preview domain. Fine for now, but canonicals/OG/sitemap will be
  wrong until the final domain is set (`DEPLOY.md §2`). Also note: the
  `logiciel-formulaire` README warns `*.vercel.app` can't be used as an SMTP
  `FROM` — unrelated to the site, but relevant when configuring the form service.
- **F-27 (P3)** — Lighthouse perf baseline (`DEPLOY.md`: 37/31 local) is a
  local-server artefact; re-measure on the Vercel domain (Brotli/HTTP2/edge) and
  watch LCP/TBT on the image-heavy home + cultural rayons.

---

## I. Admin & inventaire subsystem (high-level) + FORM WIRING (last)

### Admin / inventaire health
- The AI-vision pipeline (`inventaire-analyze/gemini/groq/mistral`) is robust:
  provider chain with per-key cooldown + rotation, masked keys in logs.
- `inventaire-bridge.ts` is **dormant by design** until
  `INVENTAIRE_SUPABASE_URL` + migration `003_trio_bridge.sql` exist — it logs a
  single warning and returns empty, so the site behaves as a curated catalogue
  meanwhile. Good.
- The one **blocking** admin issue is **F-01** (middleware crash). Fix that first
  or the inventaire UI is unusable when logged in.
- Recommend a focused follow-up pass on the `/admin` React managers
  (`PromosManager`, `ProduitsManager`, `ActusManager`, `HomeContentManager`,
  `AfficheGenerator`) — not yet line-audited here.

### Form wiring plan → `logiciel-formulaire` (do LAST, after sign-off)
Target (confirmed): `https://logiciel-formulaire.vercel.app/api/submit/{UUID}`,
challenge at `…/api/challenge`. Contract (from its README): JSON POST, honeypot
field **`_gotcha`**, optional PoW (`pow_challenge/pow_timestamp/pow_nonce`),
`_lang` for the auto-reply, errors return `{error, remedy}`.

Prereqs from you before wiring:
1. **One form UUID per form** created in the microservice admin (contact,
   newsletter, fidélité, candidature, suggestion, franchise). Confirm whether the
   existing `90571e4a-…` is a real contact UUID.
2. Decide PoW on/off per form (the README shows the PoW flow).

Wiring tasks (when greenlit):
- Add `PUBLIC_FORM_API_URL` + per-form `PUBLIC_FORM_ID_*` to `.env.example`/Vercel.
- Fix F-03 (UUID-only `FORM_ID`, correct URL build).
- Repoint suggestion/newsletter/fidélité/candidature/franchise from the local
  stubs to the microservice; standardize honeypot to `_gotcha` (F-10); add real
  `res.ok` handling to franchise (F-04) and a feedback path to fidélité (F-09).
- **Candidature caveat**: it uploads a **CV file**. The microservice README
  describes Base64→Supabase Storage handling — confirm the file-field contract
  before migrating that form (it's the riskiest one).
- Then retire/disable the now-unused `src/pages/api/*` stubs.

---

## J. Prioritized action plan

**P0 — fix first (broken in prod):**
1. F-01 middleware `locals` crash.
2. F-04 franchise fake-success / data loss.
3. F-03 contact form URL + env (folds into the wiring task).
4. F-02 decide the forms backend (this IS the wiring task) — keep last per your
   instruction, but it's the highest-value functional gap.

**P1 — high (coherence / compliance / UX):**
5. F-05 resolve the store model end-to-end (data, enums, content, schema, geo).
6. F-19 + F-18 align cookie/legal pages with the real analytics/cookies (and pick
   an analytics tool).
7. F-09 fidélité feedback; F-10 honeypot unification; F-15 unify search.
8. F-12 supabase import-time throw; F-06/F-07 "60 ans"/timeline consistency.

**P2 — medium (quality):**
9. F-20 contrast sweep (neutral/slate-400 → 500/600); F-21 themed-button color.
10. F-13 promos empty-state; F-14 promos-in-catalogue; F-16 recipe category;
    F-24 delivery/anchor; F-25 simulator double-run; F-11 fidelite hardening.

**P3 — low (polish / future-proofing):**
11. F-22 footer fine print; F-23 store dropdowns; F-26 domain; F-27 perf re-measure.
12. Repo hygiene: root `README.md` contains **null bytes** (corrupted/UTF-16);
    stray `temp-match-*.txt`, `temp-simulator.txt`, `test-search.js` clutter the
    root; `Header.astro` `BUTTON_COLORS`/`TWEMOJI_IDS` only cover 6 of 12 rayons.
13. Stack currency (see §K).

---

## K. Technological watch (stack currency & pragmatic recommendations)

Grounded in current docs/community (June 2026):

- **Astro 5 removed `output: 'hybrid'`.** This project pins `astro ^4.16` with
  `output: 'hybrid'`. Migration is **low-risk here** because the code already
  uses `export const prerender = false` on dynamic pages (`index.astro:2`,
  `api/*`): Astro 5 wants `output: 'static'` (default) + per-route
  `prerender = false`, or `output: 'server'`. Plan the bump before 4.x drops off
  support. (Ref: Astro v5 upgrade guide.)
- **`@astrojs/vercel` v8** consolidated the adapter: the old
  `@astrojs/vercel/serverless` sub-path import (`astro.config.mjs:6`) changes to
  `@astrojs/vercel`. Coordinate with the Astro 5 bump. Also re-evaluate whether
  the `postbuild` runtime patch (`scripts/fix-vercel-runtime.mjs`) is still
  needed on current adapter/Node 22.
- **Rate limiting** (F-17): move to `@upstash/ratelimit` + Upstash Redis (HTTP,
  serverless-friendly) if you keep any first-party POST endpoints. Largely moot
  once forms go through the microservice.
- **Analytics** (F-18/F-19): Vercel Web Analytics (cookieless, already wired) or
  self-hosted Plausible are both RGPD-friendly without a banner. Pick one,
  enable it, and make the cookie policy match. Only add a consent banner if you
  introduce non-essential/identifying cookies.
- **Accessibility**: target WCAG 2.2 AA (≥4.5:1 body text). The contrast sweep
  (F-20/F-21/F-22) plus the work already logged in `DEPLOY.md` gets you there.
- **Images**: the Supabase image-transform pipeline + `<Image>` remotePatterns
  are well set up; keep `PUBLIC_SUPABASE_IMAGE_TRANSFORMS=on` and verify the
  transform add-on is enabled on the Supabase project.

---

## L. Open questions for you (unblockers)

1. **Stores**: is Portet gone, upcoming, or is the live store mislabeled? (F-05)
2. **Analytics**: Vercel Web Analytics, Plausible, or none? (drives F-18/F-19)
3. **Delivery/ordering**: real roadmap item or remove the cues? (F-24)
4. **"60 ans"**: confirm the exact, defensible wording. (F-06)
5. **Form UUIDs**: provide one per form from the microservice admin. (§I)
6. **Brief**: honor "no placeholder" (remove "Bientôt en ligne"/"Photo à venir")
   or amend the brief? (F-08)
