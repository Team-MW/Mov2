# 08 — REPO HYGIENE & STACK-CURRENCY WATCH

> Covers the §J repo-hygiene items and the §K technological watch from `../AUDIT.md`:
> corrupted root `README.md`, stray temp files, `Header.astro` rayon-color gaps, and
> the Astro 5 / `@astrojs/vercel` v8 migration plan.
> Read `00-MASTER-INDEX.md` first. These are **low priority** (P3) — do them after the
> functional fixes, and treat the framework upgrade as a **separate, greenlit** task.

---

## SECTION A — Corrupted root `README.md` (null bytes / UTF-16)

**Problem:** the root `README.md` contains **null bytes** (it was saved as UTF-16 /
got corrupted). It renders as garbage and can break tooling that expects UTF-8.

### A.1 — Confirm corruption
```
rg -n "\\x00" README.md         # any match = null bytes present
```
(or check the file size vs visible content; UTF-16 doubles ASCII byte size.)

### A.2 — Rewrite as clean UTF-8
- **Recreate** `README.md` as plain UTF-8 (no BOM). Minimum useful content:

  ```md
  # Marché de Mo' V2

  Site Astro du plus grand supermarché ethnique d'Occitanie. Par Microdidact.

  ## Stack
  Astro 4 (hybrid) · React 18 (islands) · Tailwind 3 · TypeScript · Supabase · Vercel.

  ## Démarrage
  - `npm install`
  - `npm run dev` — serveur local
  - `npm run build` — build de production (prebuild: vignettes TikTok ; postbuild: patch runtime Vercel)
  - `npm run preview` — prévisualiser le build
  - `npx astro check` — vérification des types/templates

  ## Configuration
  Copier `.env.example` vers `.env` et renseigner les clés (Supabase, formulaires, etc.).

  ## Déploiement
  Voir `DEPLOY.md`. Audit technique : `AUDIT.md`. Plan de corrections : `blueprint/00-MASTER-INDEX.md`.
  ```
- **Why:** restores a readable, tool-safe README.
- **Watch-out:** save as **UTF-8** (no UTF-16, no BOM). After saving, re-run the §A.1
  null-byte check → must be 0 matches.

**Acceptance check (A):** `rg -n "\\x00" README.md` → 0; the file reads cleanly.

---

## SECTION B — Stray temp files at repo root

**Problem:** clutter at the project root: `temp-match-*.txt`, `temp-simulator.txt`,
`test-search.js`.

### B.1 — Confirm they're unreferenced, then delete
- Check nothing imports/reads them:
  ```
  rg -n "temp-match|temp-simulator|test-search" .
  ```
- If the only hits are the files themselves (and this blueprint), **delete** them.
- **Watch-out:** `test-search.js` — make sure it isn't a referenced npm script or test
  fixture (it isn't in `package.json`, but confirm). If unused, remove it.

**Acceptance check (B):** the three temp artefacts are gone; `git status` shows only
intended deletions; build unaffected.

---

## SECTION C — `Header.astro` rayon coverage gap

**Problem:** `src/components/Header.astro` defines `BUTTON_COLORS` and `TWEMOJI_IDS`
that only cover **6 of 12** rayons, so the other six render without their color/emoji.

### C.1 — Get the full rayon list
- The 12 rayons live in `src/lib/site.ts` (the rayons array). List their **slugs**.
- Cross-reference accent colors in `src/lib/banners.ts` (each culture/rayon has an
  accent hex) so the button colors stay on-brand.

### C.2 — Complete both maps
- **File:** `src/components/Header.astro`
- Add entries to **`BUTTON_COLORS`** and **`TWEMOJI_IDS`** for **every** rayon slug
  that's currently missing (the 6 uncovered ones).
  - `BUTTON_COLORS[slug]` = the rayon's brand accent (from `banners.ts`).
  - `TWEMOJI_IDS[slug]` = the Twemoji codepoint id for a representative emoji.
- **Why:** consistent header styling across all 12 rayons.
- **Watch-out:** match the **exact** slug strings used in `site.ts` (a typo silently
  falls back to default). Verify each rayon's header button shows its color + icon.

**Acceptance check (C):** open the header nav — all 12 rayons show a color + emoji; no
defaults/blanks.

---

## SECTION D — Astro 5 / `@astrojs/vercel` v8 migration (PLAN ONLY — needs go-ahead)

**Do NOT perform this casually.** It's a coordinated framework upgrade that must be
tested end-to-end. Only execute with an explicit greenlight, on a branch.

Current state: `astro ^4.16` with `output: 'hybrid'`, adapter import
`@astrojs/vercel/serverless` (v7), Node 22.

### When greenlit, the plan:
1. **`output`:** Astro 5 **removed `'hybrid'`**. The code already uses
   `export const prerender = false` on dynamic pages (`index.astro`, `api/*`). Switch
   `astro.config.mjs` to **`output: 'static'`** (default) and rely on per-route
   `prerender = false`, **or** use `output: 'server'`. Audit it route-by-route.
2. **Adapter:** `@astrojs/vercel` **v8** consolidated the package — change the import
   from `@astrojs/vercel/serverless` to **`@astrojs/vercel`**. Bump the dependency.
3. **Postbuild patch:** re-evaluate whether `scripts/fix-vercel-runtime.mjs`
   (the `postbuild` step) is still needed on the current adapter + Node 22. Remove it
   if the adapter no longer requires the runtime patch.
4. **Verify:** full `npm run build`, deploy to a preview, smoke-test SSR routes, API
   routes, image transforms, and View Transitions.

- **Watch-out:** do this on a separate branch; keep `4.x` working until the `5.x`
  build + preview deploy are fully green. Don't mix this with functional fixes.

### Related: rate limiting (F-17)
- If any first-party POST endpoint survives the forms wiring (`07-forms-wiring.md`),
  migrate `src/lib/rate-limit.ts` to **`@upstash/ratelimit` + Upstash Redis** (HTTP,
  serverless-safe). Otherwise it's moot (the microservice handles spam/rate limiting).

**Acceptance check (D):** none until greenlit. When done: `5.x` build green, preview
deploy passes the smoke tests above, no `serverless` subpath import remains.

---

## SECTION E — Images sanity (keep, don't break)
- The Supabase image-transform pipeline + `<Image>` `remotePatterns` are well set up.
  Keep `PUBLIC_SUPABASE_IMAGE_TRANSFORMS=on` and confirm the transform add-on is
  enabled on the Supabase project. **No change** unless a transform 404s.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `rg -n "\\x00" README.md` → 0; README reads cleanly (A).
2. Temp files removed; `rg -n "temp-match|temp-simulator|test-search" .` → only this
   blueprint, if anything (B).
3. All 12 rayons styled in the header (C).
4. Astro 5 migration left as a planned, branch-only task unless greenlit (D).
5. `npx astro check` clean; `npm run build` (or `npx astro build`) green.

Then update `00-MASTER-INDEX.md` §4: hygiene items DONE; stack migration = PLANNED.
