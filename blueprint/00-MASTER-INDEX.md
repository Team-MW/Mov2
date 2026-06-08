# MASTER INDEX — Fix Blueprint for "Marché de Mo' V2"

> **READ THIS FILE FIRST, FULLY, BEFORE TOUCHING ANY CODE.**
> This folder turns the audit (`../AUDIT.md`) into step-by-step repair instructions.
> It is written so a careful executor can apply every fix **without re-deriving anything**.
> When in doubt, do the smallest change that satisfies the task and STOP to ask.

---

## 0. Who you are and how to behave (executor contract)

You are an implementation agent. You will be handed ONE blueprint file at a time
(`01-…` through `08-…`). Your job is to apply the fixes in that file exactly.

**Golden rules (non-negotiable):**

1. **Never invent.** If a file/line/string in a task does not exist as described,
   STOP and report it. Do not "guess" a nearby change.
2. **Search by anchor, not by line number.** Line numbers in this blueprint are
   *approximate* (the codebase shifts as fixes land). Every task gives you a
   **Find:** string — locate that exact text, then edit it. Use the line number
   only to jump to the right neighbourhood.
3. **Minimal diffs.** Change only what the task says. Do not reformat, re-order
   imports, "tidy", or rename anything that the task did not ask you to.
4. **No new comments or docs** unless the task explicitly says to add them.
5. **One task at a time.** Apply → verify → check the box → next task.
6. **Respect the GUARDRAILS in §3.** Some things look like bugs but are intentional.
7. **Respect the BINDING DECISIONS in §2.** They override the audit wording where
   they conflict (the owner already decided).
8. After finishing a blueprint file, run the **verification** in §6 before moving on.

---

## 1. Project facts (so you don't have to rediscover them)

- **Root:** `c:\Users\Mommy Jayce\Desktop\Microdidact\MarcheDeMoV2`
- **Stack:** Astro `^4.16` (`output: 'hybrid'`), React 18 islands, Tailwind 3,
  TypeScript 5, Supabase JS v2, deployed on **Vercel** (`@astrojs/vercel/serverless`).
- **Node:** `22.x` (see `package.json > engines`).
- **Scripts** (`package.json`):
  - `npm run dev` → `astro dev` (local server)
  - `npm run build` → runs `prebuild` (fetches TikTok thumbs over network) → `astro build` → `postbuild` (Vercel runtime patch)
  - `npm run preview` → serve the built output
  - Type/diagnostic check: `npx astro check` (the `@astrojs/check` package is installed)
  - E2E: **Playwright** is installed (`playwright`), capture script: `npm run capture:mobile`
- **Data layer:** Supabase with graceful fallback to local Content Collections / JSON.
  A missing `.env` should degrade gracefully (see F-12 — it currently doesn't).
- **Sibling project (forms backend):** `c:\Users\Mommy Jayce\Desktop\Microdidact\logiciel-formulaire`
  - Prod submit endpoint: `https://logiciel-formulaire.vercel.app/api/submit/{FORM_UUID}`
  - PoW challenge endpoint: `https://logiciel-formulaire.vercel.app/api/challenge`
  - Honeypot field name the backend honours: **`_gotcha`**

---

## 2. BINDING DECISIONS (owner-approved — these WIN over the audit)

These were decided by the project owner after the audit. Where the audit text and
these decisions disagree, **follow the decision.**

| # | Topic | DECISION (do this) |
|---|---|---|
| D1 | **Stores** | There is **ONE** store only. **Portet-sur-Garonne is permanently closed/gone.** **Purge every Portet remnant** (DB enums, schema, content, geo code, copy, image fallbacks). `site.ts` (`toulouse-sud` only) is the source of truth. → `01-store-purge.md` |
| D2 | **"60 ans d'expérience"** | It is **REAL** (family business, **3 generations**). **KEEP it**, but always frame it with context: *"60 ans d'expérience familiale (3 générations)"*. **Never** show a bare "60 ans" next to a founding year. → `04-content-claims.md` |
| D3 | **Opening dates** | **Do NOT display when the store opened.** Remove `dateOuverture` ("Avril 2026") and "ouvert en août 2024"-style copy/timeline. → `01-store-purge.md` (timeline) + `04-content-claims.md` |
| D4 | **Forms wiring** | Wire **LATER**, as the **LAST** task. Owner supplies one **UUID per form** later. For now leave **env placeholders**. **Include the fidélité sign-up** in the wiring set. → `07-forms-wiring.md` |
| D5 | **Placeholders** | **KEEP** "Bientôt en ligne" and "Photo à venir". (You may change their text *color* for contrast, but **do not remove the words**.) This **cancels audit finding F-08.** |
| D6 | **Analytics** | Enable **cookieless Vercel Web Analytics** (`astro.config.mjs` → `webAnalytics: { enabled: true }`). Then **rewrite** the cookie + legal pages to match reality (remove the false Plausible / consent-banner / `cookie_consent` claims). **No consent banner needed.** → `03-analytics-privacy.md` |
| D7 | **Phone simulator** | The home phone-simulator (cart, "Ajouter", "Suivi de commande #MO-892", "Préparation/Colis livré") is an **INTENTIONAL DEMO** of the brand's real app. **DO NOT remove or alter its behaviour.** Only *ameliorate* if explicitly asked. This **reclassifies F-24/F-25** (see §3 + `06-seo-webflow.md`). |

---

## 3. GUARDRAILS — DO NOT TOUCH (looks like a bug, is intentional)

- **Phone simulator markup + script** in `src/pages/index.astro` (≈ lines 250–390
  markup and ≈ 980–1166 script). Do not delete cart logic, "Ajouter" buttons,
  order-tracking, or delivery states. (Per D7.)
  - **F-25** (simulator double-init on first load) is **PARKED**. Do **not** modify
    the simulator init without an explicit, separate go-ahead.
- **Placeholder words** "Bientôt en ligne" / "Photo à venir" stay (per D5). Color-only changes allowed.
- **`inventaire-bridge.ts` dormancy** is **by design** (it stays off until
  `INVENTAIRE_SUPABASE_URL` + migration `003_trio_bridge.sql` exist). Do not "wake" it.
- **Forms** stay on their current behaviour until the wiring task is greenlit with
  real UUIDs (per D4). Do not point forms at the microservice early.
- **Do not weaken or delete tests/checks.** Add tests if asked; never remove them.
- **Do not change the public domain / `site` URL** except as described in F-26, and
  only when the final domain is known.

---

## 4. STATUS TRACKER (update as you go)

| Finding | Title | Priority | Status | Blueprint |
|---|---|---|---|---|
| F-01 | Middleware `locals` crash | P0 | ✅ DONE | (fixed in `src/middleware.js`) |
| F-04 | Franchise form fake-success | P0 | ✅ DONE | (fixed in `src/pages/franchise.astro`) |
| F-20 | Low-contrast caption text | P2 | 🟡 PARTIAL | `02-contrast-accessibility.md` |
| F-02 | Form endpoints are stubs | P0 | ⏳ wiring (LAST) | `07-forms-wiring.md` |
| F-03 | Contact form broken URL/env | P0 | ⏳ wiring (LAST) | `07-forms-wiring.md` |
| F-05 | Split-brain store model | P1 | ✅ DONE | `01-store-purge.md` |
| F-06 | "60 ans" vs founded 2024 | P1 | ✅ DONE | `04-content-claims.md` |
| F-07 | Stale opening timeline | P1 | ✅ DONE | `01-store-purge.md` + `04` |
| F-08 | Placeholder copy | — | ❎ CANCELLED (D5) | — |
| F-09 | Fidélité no feedback | P1 | ⏳ wiring (LAST) | `07-forms-wiring.md` |
| F-10 | Honeypot name mismatch | P1 | ⏳ wiring (LAST) | `07-forms-wiring.md` |
| F-11 | `fidelite.ts` weak | P2 | ⏳ wiring (LAST) | `07-forms-wiring.md` |
| F-12 | Supabase import-time throw | P1 | ✅ DONE | `05-services-apis.md` |
| F-13 | Promos empty-state | P2 | ✅ DONE | `05-services-apis.md` |
| F-14 | Promos leak into catalogue | P2 | ✅ DONE | `05-services-apis.md` |
| F-15 | Two divergent searches | P1 | ✅ DONE | `05-services-apis.md` |
| F-16 | Recipe category hardcoded | P2 | ✅ DONE | `05-services-apis.md` |
| F-17 | In-memory rate limit | P2 | 📌 NOTED | `05-services-apis.md` |
| F-18 | No analytics active | P1 | ✅ DONE | `03-analytics-privacy.md` |
| F-19 | Cookie policy inaccurate | P1 | ✅ DONE | `03-analytics-privacy.md` |
| F-20 | Low-contrast caption text | P1 | ✅ DONE | `02-contrast-accessibility.md` |
| F-21 | Themed buttons illegible | P2 | ✅ DONE | `02-contrast-accessibility.md` |
| F-22 | Footer fine print | P3 | ✅ DONE | `02-contrast-accessibility.md` |
| F-23 | Single-option store dropdowns | P3 | ✅ DONE | `01-store-purge.md` |
| F-24 | Dead anchor `#livraison` | P2 | ✅ DONE | `06-seo-webflow.md` |
| F-25 | Simulator double-run | P2 | ⏸️ PARKED (D7) | `06-seo-webflow.md` |
| F-26 | Preview domain in `site` | P3 | ✅ DONE | `06-seo-webflow.md` |
| F-27 | Perf re-measure | P3 | 📌 NOTED | `06-seo-webflow.md` |
| — | Repo hygiene + stack watch | P3 | ✅ DONE | `08-repo-hygiene-stack.md` |

Legend: ✅ done · 🟡 partial · ⏳ deferred to wiring · 🅿️ parked · ❎ cancelled · ⬜ todo

---

## 5. RECOMMENDED ORDER OF EXECUTION

Do them in this order. Each blueprint file is self-contained; finish one, verify, commit, move on.

1. **`01-store-purge.md`** (F-05/F-07/F-23) — biggest blast radius; do it first so
   later edits sit on a coherent one-store model.
2. **`04-content-claims.md`** (F-06 + D2/D3) — small copy fixes that pair with the purge.
3. **`05-services-apis.md`** (F-12–F-17) — data-layer correctness bugs.
4. **`03-analytics-privacy.md`** (F-18/F-19) — enable analytics + fix legal text.
5. **`02-contrast-accessibility.md`** (F-20/F-21/F-22) — mechanical, widespread, low-risk.
6. **`06-seo-webflow.md`** (F-24/F-26/F-27; F-25 parked) — small web-flow polish.
7. **`08-repo-hygiene-stack.md`** — cleanup + stack-currency notes.
8. **`07-forms-wiring.md`** — **LAST**, and only once the owner provides form UUIDs.

---

## 6. VERIFICATION (run after EACH blueprint file)

Run from the project root. **Never** `cd` inside a chained command; set the working
directory to the project root instead.

1. **Type / template check (fast, no network):**
   ```
   npx astro check
   ```
   Expect: no new errors. (Pre-existing warnings unrelated to your change are OK —
   note them, don't fix-creep.)

2. **Full build:**
   ```
   npm run build
   ```
   - If `prebuild` fails because it can't reach the network (TikTok thumb fetch),
     run the build step directly instead: `npx astro build`, and report that the
     prebuild network step was skipped.
   - Expect: build completes with no new errors.

3. **Manual smoke (when a task touched a page):**
   ```
   npm run dev
   ```
   Then open the affected route(s) and confirm the specific fix visually. Each
   blueprint lists its **Acceptance check** per task.

4. **Optional E2E:** Playwright is available if a task says to add/run a test.

**Definition of done for a blueprint file:** every task's checkbox ticked, `astro
check` clean, `npm run build` (or `npx astro build`) green, and each Acceptance
check confirmed.

---

## 7. CONVENTIONS used in every blueprint file

Each task is written like this:

> ### F-XX.n — Short title
> - **File:** `relative/path.ext` (~line N)
> - **Find:** the exact current text to locate
> - **Replace with:** the exact new text
> - **Why:** one line of rationale
> - **Acceptance check:** how to confirm it worked
> - **Risk / watch-out:** anything that could break

Rules for applying:
- The **Find** string must match the file **exactly** (including indentation). If it
  doesn't match, the file already changed — re-read that region and adapt, or STOP.
- If a **Find** appears **multiple times**, the task will say so and give extra
  surrounding context to disambiguate. Never blind-replace-all unless told to.
- Prefer the editor's exact-string replace. Keep surrounding lines intact.

---

## 8. WHEN TO STOP AND ASK (escalation)

Stop and ask the owner (do **not** improvise) if:

- A **Find** string is missing or appears in unexpected places.
- A task conflicts with a GUARDRAIL (§3) or BINDING DECISION (§2).
- A fix would require changing a public claim, price, legal text, or the DB schema
  in a way not spelled out here.
- A form task asks for a UUID you don't have (per D4, you don't have them yet).
- `npm run build` fails in a way the task didn't predict.

---

## 9. FILE INDEX (what each blueprint covers)

- **`01-store-purge.md`** — F-05, F-07, F-23. Remove Portet everywhere; drop opening
  dates; neutralize one-store dead UI (geo, dropdowns).
- **`02-contrast-accessibility.md`** — F-20, F-21, F-22. Contrast sweep
  (`neutral-400`/`slate-400` → `500/600` on light bg), themed CTA on-colors, footer fine print.
- **`03-analytics-privacy.md`** — F-18, F-19. Turn on cookieless Vercel Analytics;
  rewrite `politique-de-cookies` + `mentions-legales` to match reality.
- **`04-content-claims.md`** — F-06 (+ D2/D3). Standardize the "60 ans" framing; strip
  founding-year/opening-date copy.
- **`05-services-apis.md`** — F-12–F-17. Supabase lazy client, promos empty-state,
  promos-in-catalogue, search unification, recipe category, rate-limit note.
- **`06-seo-webflow.md`** — F-24 (footer `#livraison` anchor only), F-25 (PARKED note),
  F-26 (domain), F-27 (perf re-measure).
- **`07-forms-wiring.md`** — F-02, F-03, F-04(done), F-09, F-10, F-11. Full
  microservice integration contract. **LAST task; needs UUIDs.**
- **`08-repo-hygiene-stack.md`** — corrupted root `README.md` (null bytes), stray temp
  files, `Header.astro` rayon-color gaps, Astro 5 / Vercel adapter v8 migration watch.

> Source of truth for *findings* = `../AUDIT.md`. Source of truth for *decisions* =
> §2 of this file. If they disagree, §2 wins.
