# 05 — SERVICES, APIs & DATA SYNC

> Covers: **F-12** (supabase import-time throw), **F-13** (promos empty-state),
> **F-14** (promos leak into catalogue), **F-15** (two divergent searches),
> **F-16** (recipe category hardcoded), **F-17** (in-memory rate limit — note only).
> Read `00-MASTER-INDEX.md` first. These are correctness bugs in the data layer; test
> each with `npm run dev` after editing.

---

## SECTION A — F-12: Supabase client must not throw at import

**Problem:** `src/lib/supabase.ts` (~lines 19–24) throws if `SUPABASE_URL`/`ANON_KEY`
are missing. Repos `import { supabase }` at the **top**, so the throw fires at
module-eval **before** any per-call `try/catch` can drive the documented graceful
fallback. Result: a missing `.env` white-pages the whole site instead of degrading.

### A.1 — Replace the throw with a guarded, nullable client
- **File:** `src/lib/supabase.ts`
- **Find:** the block that does `throw new Error(...)` when `SUPABASE_URL` / the anon
  key are missing (and the `createClient(...)` call that follows it).
- **Replace with** a guard that warns and exports `null` when env is absent:

  ```ts
  const SUPABASE_URL = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  export const supabase =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { /* keep existing options */ })
      : (console.warn(
          "[supabase] SUPABASE_URL/ANON_KEY missing — running in fallback mode (Content Collections / local JSON)."
        ),
        null);
  ```
- Do the **same** for the **admin** client (`supabaseAdmin` / service-role) if this
  file also throws for the service key: guard it and export `null` when missing.
- **Why:** the import no longer crashes; the existing fallbacks now actually run.

### A.2 — Make every call site null-safe
- **Find all usages:** `rg -n "supabase\\.|supabaseAdmin\\.|supabase\\b" src/`
- For each usage, ensure it is **either**:
  - inside a `try/catch` that already falls back (most repos are), **or**
  - guarded with an early `if (!supabase) return <fallback>;`.
- The repos `promos-repo.ts`, `produits-repo.ts`, `home-content.ts` already have
  try/catch + fallback — confirm a thrown "cannot read .from of null" lands in that
  catch and returns the fallback (it will, because the call is inside `try`).
- **Admin API routes** (`src/pages/api/admin/**`) use the admin client: guard those
  with `if (!supabaseAdmin) return new Response('Service indisponible', { status: 503 })`
  so they fail cleanly instead of 500-crashing.

**Acceptance check (F-12):** temporarily rename `.env` (or unset the two vars) and run
`npm run dev` — the public site renders with fallback content (no white page); admin
API routes return a clean 503, not a crash. Restore `.env` after.

---

## SECTION B — F-13: "zero active promos" must mean zero (not stale)

**Problem:** `src/lib/promos-repo.ts` (~lines 126–129):
`if (supa && supa.length > 0) return supa; return fromContentCollection();`
A **legitimately empty** Supabase result (admin disabled all promos) falls through to
the **stale JSON** collection, so old promos reappear.

### B.1 — Distinguish "DB error" from "DB returned 0 rows"
- **File:** `src/lib/promos-repo.ts`
- **Restructure** the fetch so:
  - On a **successful** query (no exception) → return the mapped result **even if it's
    empty** (`[]`).
  - Only on a **thrown error / unreachable DB / null client** → return
    `fromContentCollection()`.
- Pattern:

  ```ts
  if (!supabase) return fromContentCollection();      // F-12: no client → fallback
  try {
    const { data, error } = await supabase.from("promos")./* …existing query… */;
    if (error) return fromContentCollection();        // real DB error → fallback
    return (data ?? []).map(/* …existing mapping… */); // success (incl. empty) → trust DB
  } catch {
    return fromContentCollection();                    // unreachable → fallback
  }
  ```
- **Why:** an intentional empty promo set now shows **nothing**, not resurrected promos.
- **Watch-out:** keep the existing mapping/active-filter logic; only change the
  empty-vs-error branching. If the active filter happens **after** the fetch in JS,
  keep filtering, just don't treat "filtered to 0" as "fetch failed".

**Acceptance check (F-13):** with Supabase reachable but **0 active promos**, the home
ticker/promo strip shows nothing (no JSON fallback promos). With Supabase
**unreachable**, the JSON fallback still shows.

---

## SECTION C — F-14: promos must not appear as products

**Problem:** `src/lib/produits-repo.ts` injects active promos into the product
catalogue:
- `getAllProduits()` (~lines 256–268) maps promos into `ProduitPublic` (slug + `-X%`),
- `getProduitBySlug()` (~lines 366–381) resolves promo slugs to a product page.
So promos show up in `/produits`, in search, and get their own `/produits/[slug]`.

### C.1 — Stop creating product entries from promos
- **File:** `src/lib/produits-repo.ts`
- **In `getAllProduits()`:** remove (or gate behind an explicit, default-off flag) the
  block that maps **promos → product objects**. Keep all the real product sources
  (V2 produits, inventaire articles, local JSON, vedettes).
- **In `getProduitBySlug()`:** remove the branch that resolves a **promo slug** into a
  product. A promo slug should **not** produce a product page.
- **Why:** promotions belong on the promo strip/ticker (served by `promos-repo`), not
  in the product catalogue or search.
- **IMPORTANT distinction — do NOT over-delete:** if there is logic that attaches a
  **discount/badge to a matching *real* product** (same article gains a `-X%`), that
  is fine — **keep** it. Only remove the code that fabricates a **standalone product
  from a promo** that has no real product behind it.
- **Watch-out:** confirm the home promo ticker still works afterwards (it reads
  `promos-repo`, not `produits-repo`, so it should be unaffected — verify).

**Acceptance check (F-14):** `/produits` and `/recherche` no longer list promo-only
entries; visiting a former promo slug under `/produits/<promo-slug>` 404s (or
redirects), not renders a fake product. Real products still list normally.

---

## SECTION D — F-15: unify the two search systems

**Problem:** two indexes drifted on rayon URLs:
- `src/pages/recherche.astro` (~line 75) links rayons to **`/produits/${slug}`** (wrong).
- `src/pages/api/search.ts` (~line 72) links rayons to **`/rayons/${slug}`** (correct).

### D.1 — Align the URL convention (low-risk, do this now)
- **File:** `src/pages/recherche.astro` (~line 75)
- **Find:** the rayon result link building `/produits/${slug}` (or `/produits/` + slug).
- **Replace with:** `/rayons/${slug}` so a **rayon** result points to the rayon
  drill-down page (matching `api/search.ts`).
- **Why:** same entity → one destination. A rayon is not a product.
- **Watch-out:** only change the **rayon** entries' URL. Leave **product** results
  pointing at `/produits/${slug}` and **recette/actu** results at their own routes.

### D.2 — (Optional, larger) consolidate to one index
- The index is built twice (SSR-embedded JSON in `recherche.astro` vs the cached
  `api/search.ts`). A full consolidation (single shared builder both import) is a
  **refactor** — only do it if explicitly asked. For now, D.1 removes the
  user-visible inconsistency. Leave a note; don't refactor unprompted.

**Acceptance check (F-15):** search a rayon name on `/recherche` and via the header
autocomplete — **both** navigate to `/rayons/<slug>` and land on the same page.

---

## SECTION E — F-16: recipe category must come from data

**Problem:** `src/lib/schema.ts` (~line 209) hardcodes
`recipeCategory: "Plat principal"` for **every** recipe → desserts/entrées mislabeled.

### E.1 — Drive `recipeCategory` from the recipe
- **First, find the field name:** open `src/content/config.ts` and the recettes
  collection schema to see what category field recipes carry (e.g. `categorie`,
  `type`, `cours`). Also check the `recipeSchema(...)` signature in `schema.ts`.
- **File:** `src/lib/schema.ts` (~line 209)
- **Find:** `recipeCategory: "Plat principal"`
- **Replace with:** `recipeCategory: recipe.<categoryField> ?? "Plat principal"`
  (use the real field discovered above; keep the string fallback for recipes lacking one).
- **Why:** correct schema.org category per recipe → correct rich results.
- **Watch-out:** if `recipeSchema` doesn't currently receive the category, thread it
  through from the call site (the recette page passing the recipe data). Keep the
  fallback so nothing breaks for recipes without a category.

**Acceptance check (F-16):** view a dessert recipe page source; its Recipe JSON-LD
`recipeCategory` reflects the dessert category, not "Plat principal".

---

## SECTION F — F-17: serverless rate limiting (NOTE — no code change now)

**Problem:** `src/lib/rate-limit.ts` uses a process-local `Map`. On Vercel each
invocation can hit a different/cold instance, so counters don't share state — the
3–5/min limits are best-effort only.

**Decision for now:** **do nothing in code.** This becomes largely **moot** once the
forms move to the `logiciel-formulaire` microservice (which has its own PoW + rate
limiting) — see `07-forms-wiring.md`. After wiring, if **any** first-party POST
endpoint remains, migrate it to `@upstash/ratelimit` + Upstash Redis (HTTP,
serverless-friendly). Until then, leave `rate-limit.ts` as-is.

**Acceptance check (F-17):** none (documented decision). Revisit during/after forms wiring.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `npx astro check` → no new type errors (watch the supabase null-guards).
2. `npm run build` (or `npx astro build`) → green.
3. Manual (`npm run dev`):
   - Unset env → site renders fallback, admin APIs 503 (F-12). Restore env.
   - 0 active promos → empty promo strip, not stale (F-13).
   - `/produits` + `/recherche` have no promo-as-product entries (F-14).
   - Rayon search → `/rayons/<slug>` from both search UIs (F-15).
   - Dessert recipe JSON-LD category correct (F-16).

Then mark **F-12/F-13/F-14/F-15/F-16 = DONE** and **F-17 = NOTED** in `00-MASTER-INDEX.md` §4.
