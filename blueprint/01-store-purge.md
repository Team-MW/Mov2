# 01 — STORE PURGE (single-store truth)

> Covers: **F-05** (split-brain store model), **F-07** (stale opening timeline),
> **F-23** (single-option store dropdowns).
> Binding decisions: **D1** (Portet is GONE — purge it), **D3** (do NOT show opening dates).
> Read `00-MASTER-INDEX.md` first. Source of truth = `src/lib/site.ts` (`toulouse-sud` only).

**Goal end-state:** the entire codebase agrees there is exactly **one** store
(`toulouse-sud`). No "portet" anywhere. No second-store UI. No opening dates.

---

## STEP 0 — Discovery (do this BEFORE editing anything)

Run these searches (ripgrep / the grep tool) over `src/` and record every hit. The
known hits are listed in the sections below; if you find **extra** hits, apply the
matching rule or STOP and ask.

```
rg -ni "portet" src/
rg -ni "deux magasins|nos magasins|magasins/portet" src/
rg -n "getNearestStore|haversine|preferred_magasin|preferredMagasin" src/
rg -n "dateOuverture|Avril 2026|ao(û|u)t 2024|ouvert en|ouverture prochaine" src/
rg -n "MagasinSlug" src/
```

Build a checklist from the hits. You are done with this blueprint only when all of
them are resolved per the rules below and `npm run build` is green.

---

## SECTION A — Remove `"portet"` from types, enums & validators (F-05)

**Rule:** wherever a union type, enum, array, or validator lists the store slug,
`"portet"` must be removed so only `"toulouse-sud"` remains. Do **not** widen to a
free string — keep it a single literal.

Known locations (verify each with the **Find**, then apply):

### A.1 — `src/lib/supabase.ts` (~line 59)
- **Find:** the DB type that includes `'portet'`, e.g.
  `magasin: 'toulouse-sud' | 'portet'`
- **Replace with:** `magasin: 'toulouse-sud'`
- **Why:** the DB row type must reflect one store; stops invalid `portet` values typechecking.
- **Watch-out:** there may be more than one occurrence in this file (promos & produits & actus types). Fix **each** `'toulouse-sud' | 'portet'` you find here.

### A.2 — `src/lib/promos-repo.ts` (~line 28)
- **Find:** the `magasin` field type listing `'portet'` (same pattern as A.1).
- **Replace with:** the `'toulouse-sud'`-only version.
- **Why:** promo objects can no longer be tagged to a dead store.

### A.3 — `src/content/config.ts` (~lines 30 and 74)
- **Find:** the zod/enum that allows the store slug, e.g.
  `z.enum(['toulouse-sud', 'portet'])` (appears **twice** — promos schema and one more collection).
- **Replace with:** `z.enum(['toulouse-sud'])`
- **Why:** content-collection validation rejects `portet` going forward.
- **Watch-out:** after this, run `npx astro check` — if any existing content file
  (`src/content/**`) is tagged `portet`, the build will flag it; fix that content
  file's `magasin` to `toulouse-sud` (see Section C) or remove the dead entry.

### A.4 — Promos admin API
- **Files:** `src/pages/api/admin/promos/index.ts` (~line 38) and
  `src/pages/api/admin/promos/[id].ts` (~line 49)
- **Find:** the server-side validation array/enum that accepts `'portet'`.
- **Replace with:** the `'toulouse-sud'`-only list.
- **Why:** the admin API must not let an editor re-introduce a `portet` promo.

**Acceptance check (Section A):** `rg -ni "portet" src/lib src/content src/pages/api`
returns **zero** hits. `npx astro check` shows no new type errors.

---

## SECTION B — Fix the JobPosting schema (F-05 concrete breakage)

### B.1 — `src/lib/schema.ts` (~lines 103–109, `jobPostingSchema`)
- **Context:** the function builds `jobLocation[]` from a `magasin` argument. With
  `magasin: "portet"` it produced an **empty `jobLocation`** → invalid Google JobPosting.
- **Find:** the parameter default and/or branch that references `portet` and the
  `jobLocation` construction (look for `magasin` and `jobLocation`).
- **Do:**
  1. Make the `magasin` parameter **default to `'toulouse-sud'`** and type it as the
     single-store slug (no `portet`).
  2. Remove any `portet` branch so `jobLocation` is **always** built from the
     `toulouse-sud` store address from `site.ts`.
- **Why:** every JobPosting now resolves to the real store; no empty `jobLocation`.
- **Acceptance check:** call sites of `jobPostingSchema` build without passing
  `portet`; the emitted JSON-LD has a non-empty `jobLocation`. Verify by viewing a
  recrutement page source for `"jobLocation"`.

---

## SECTION C — Rewrite stale Portet / two-store copy (F-05)

**Rule:** all customer-facing copy must speak of **one** store, in the **singular**
("notre magasin", "le magasin"), and must NOT narrate Portet or "deux magasins".
Keep tone/length similar; just correct the facts.

### C.1 — `src/pages/notre-enseigne.astro` (~lines 22–25)
- **Find:** the sentence(s) narrating the **Portet** opening / two-shop history.
- **Replace with:** a single-store narrative (the family story + the Toulouse Sud
  store). **Do not** add an opening date (per D3). Keep the "60 ans / 3 générations"
  framing if present (see `04-content-claims.md`).
- **Why:** the history must match one live store.

### C.2 — `src/lib/actus.ts` (~line 122)
- **Find:** `Les deux magasins` (and any surrounding plural phrasing).
- **Replace with:** singular phrasing referring to the single store (e.g. "Le magasin").
- **Why:** there is one store; "deux magasins" is now false.

### C.3 — Any extra hits from STEP 0
- For every remaining hit of `deux magasins` / `nos magasins` (plural) / Portet
  copy: rewrite to singular/one-store. If a whole block exists only to describe the
  second store, remove that block.

**Acceptance check (Section C):** `rg -ni "portet|deux magasins"` over `src/pages`,
`src/lib`, `src/content` returns zero customer-facing hits.

---

## SECTION D — Image fallback to the dead store (F-05)

### D.1 — `src/pages/index.astro` (~line 757)
- **Find:** the fallback image path `/images/magasins/portet.jpg`.
- **Replace with:** the Toulouse Sud store image already used elsewhere
  (search `images/magasins` in the repo to find the correct existing filename, e.g.
  `/images/magasins/toulouse-sud.jpg`). If only the Portet asset exists as a generic
  fallback, point to the store's real hero/photo used on `/magasins`.
- **Why:** never render a photo of a closed store.
- **Watch-out:** confirm the replacement file actually exists in `public/images/magasins/`.
  If it doesn't, use whatever store photo `/magasins` renders. Do **not** leave a
  broken `src`.
- **Acceptance check:** load `/` — the relevant section shows the live store image, no 404 in the network panel.

---

## SECTION E — Dead geo / store-switch machinery (F-05)

With one store, "find nearest store" and "remember preferred store" are meaningless.
**Be conservative: simplify, don't mass-delete** (other modules may import these).

### E.1 — Map all usages first
```
rg -n "getNearestStore|haversine|preferred_magasin|preferredMagasin|getStores\\(|stores\\b" src/
```
Record every importer.

### E.2 — `src/lib/geo.ts` (~lines 24–41)
- **Preferred safe fix:** keep the exported function name(s) but make
  `getNearestStore(...)` **always return the single store** from `site.ts`
  (ignore coordinates). Remove the now-unused `haversine` helper **only if** nothing
  else imports it (you checked in E.1); otherwise leave it.
- **Why:** callers keep working; the "nearest" concept collapses to the one store.

### E.3 — Store-switch UI + `preferred_magasin` cookie
- **Find:** any UI that lets the user pick/switch store, and any code that **writes**
  the `preferred_magasin` cookie (check `src/middleware.js`, header/footer, and the
  hits from E.1).
- **Do:** remove the switch UI (one store = no choice). Stop **writing** the
  `preferred_magasin` cookie. If middleware **reads** it only to pick a store, you can
  delete that read; if removal is risky, leave the read but it will simply always
  resolve to `toulouse-sud`.
- **Why:** removes dead UX and a cookie we shouldn't set (also matters for the cookie
  policy rewrite — see `03-analytics-privacy.md`, which says the only remaining cookie
  should be the admin `mdm_auth`).
- **Watch-out:** if you remove the cookie write, tell `03-analytics-privacy.md`'s
  executor so the cookie policy lists only `mdm_auth`.

**Acceptance check (Section E):** site builds; no UI offers a second store; the app
never sets `preferred_magasin`. `rg -n "preferred_magasin"` returns only (at most) a
harmless read or nothing.

---

## SECTION F — Remove opening dates / timeline (F-07 + D3)

**Rule (D3):** do **not** display when the store opened, anywhere.

### F.1 — `src/lib/site.ts` (`dateOuverture`, ~line 107)
- **Step 1 — find usages first:** `rg -n "dateOuverture" src/`
- **Step 2:** remove every **display** usage of `dateOuverture` in `.astro`/`.jsx`
  (delete the line/element that renders it).
- **Step 3:** then remove the `dateOuverture: "Avril 2026"` field from the store
  object in `site.ts`.
- **Why:** order matters — remove consumers before the field, or the build breaks.
- **Watch-out:** if `dateOuverture` feeds structured data (schema), remove it there too.

### F.2 — Home story "ouvert en août 2024" (`src/pages/index.astro` ~line 574)
- **Find:** the sentence stating the magasin opened **août 2024** (this was Portet).
- **Replace with:** a version with **no opening date** — keep the founder/family
  narrative but drop the month/year. (Pairs with `04-content-claims.md` F-06 wording.)
- **Why:** removes the contradictory chronology and complies with D3.

### F.3 — Any "ouverture prochaine" / countdown framing
- For each STEP-0 hit (`ouverture prochaine`, future-dated opening), remove the
  "coming soon" framing — the store is open.

**Acceptance check (Section F):** `rg -ni "dateOuverture|Avril 2026|ao(û|u)t 2024|ouverture prochaine"`
returns zero hits; pages that referenced a date now read cleanly without one.

---

## SECTION G — Single-option store dropdowns (F-23)

With one store, a `<select>` with one `<option>` is dead UI. **Convert to static
text** (preferred — keeps the value submitted with the form) rather than deleting the
field, so the future form-wiring still receives the store.

### G.1 — `src/pages/programme-fidelite.astro` (~line 119)
- **Find:** the `<select>` labelled "Magasin favori/préféré" with the single
  Toulouse Sud `<option>`.
- **Replace with:** either
  - (a) a **hidden input** carrying the store value + a small read-only line of text
    ("Magasin : Toulouse Sud"), or
  - (b) a disabled, pre-selected single-option control.
  Prefer (a). Keep the field **name** identical so form submission is unchanged.
- **Why:** removes a pointless dropdown without losing the submitted store value.

### G.2 — `src/islands/ApplicationForm.jsx` (~line 91)
- **Find:** the same single-option "Magasin préféré" `<select>` (React).
- **Replace with:** the React equivalent of G.1(a) — a hidden field with the store
  value + static label text. Keep the state/field name the form already submits.
- **Why:** same as G.1.
- **Watch-out:** keep the controlled-component contract intact (don't leave a dangling
  `value`/`onChange` referencing a removed element).

**Acceptance check (Section G):** both pages render a static "Toulouse Sud" line
(no dropdown); submitting still includes the store value; no React console warnings.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT

1. `rg -ni "portet"` over the whole repo → **0** hits in `src/` (a comment in this
   blueprint folder doesn't count).
2. `rg -ni "deux magasins|dateOuverture|Avril 2026|ao(û|u)t 2024"` over `src/` → **0** hits.
3. `npx astro check` → no new errors.
4. `npm run build` (or `npx astro build` if prebuild can't reach network) → green.
5. Manual: `/`, `/notre-enseigne`, `/magasins`, `/programme-fidelite`, a recrutement
   page → one store, singular copy, no opening date, no store dropdown, no broken image.

Tick every STEP-0 checklist item, then mark **F-05/F-07/F-23 = DONE** in
`00-MASTER-INDEX.md` §4.
