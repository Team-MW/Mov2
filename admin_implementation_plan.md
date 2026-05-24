# Administrative System & Multi-Island State Orchestration (Admin Upgrade V2)

This implementation plan details the technical roadmap to audit and upgrade the **Admin & Backend** of the Marché de Mo' V2 monolithic codebase. It details how we will link independent React islands in real time, integrate a global branding theme system matching the company's Artistic Direction (DA), and implement a database-backed storefront config for the red line ticker under the PromoHero.

---

## User Review Required

> [!IMPORTANT]
> - **Executing the Migration**: The dynamic red line ticker relies on the database column `ticker_semaine` in the `public.promos` table. We have pre-authored **[005_add_ticker_semaine.sql](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/supabase/migrations/005_add_ticker_semaine.sql)**. You will need to copy and execute this file in your **Supabase Studio → SQL Editor**.
> - **Self-Cleaning Constraint**: To guarantee that *only one* active promotion occupies the homepage's red line ticker at a time, the promos API endpoints will automatically execute a reset statement setting `ticker_semaine = false` for all other promotions in the DB before saving a promotion with `ticker_semaine` checked.
> - **Real-Time cross-island Sync**: Data changes in *any* admin island (e.g. adding a product in the catalog tree or bulk importing a CSV) will instantly propagate to the Poster Generator's autocomplete list and the other open managers in other tabs using the browser's high-speed `BroadcastChannel` API, requiring zero manual refreshes.

---

## Technical Audit & Structural Linkages

### 1. What is Good (Strengths)
* **Pre-Compiled Server Shell**: The pages are fully server-side rendered with dynamic database states on initial paint, avoiding blank screens and speeding up administrative workflows.
* **Granular Scoped Management**: The `/admin/catalogue` folder utilizes deep nested dynamic routing (`/admin/catalogue/[...path].astro`) to slice and manage products under a tree arborescence mirroring the public site taxonomy (`src/lib/taxonomie.ts`), complete with a dedicated orphans cleanup view.
* **Differential Checking**: `CSVImporter` reads the active catalog and highlights structural updates versus plain inserts, helping maintain catalogue integrity.

### ⚠️ 2. What Isn't Good (UX Gaps & Flaws)
* **Siloed Client State (Major Structural Flaw)**: The islands mounted inside the Astro pages are client-side sandboxed. If an admin modifies a promo in `PromosManager` or imports a spreadsheet in `CSVImporter`, `AfficheGenerator` has no awareness of it. It continues to query its static `initialProduits` / `initialPromos` cache loaded from server-side rendering hours prior, leading to desynchronization.
* **Statically Stamped urgent banner**: The red banner `Offre de la semaine` is statically determined in `index.astro` based on the first `mise_en_avant` promotion, preventing active merchandising control.
* **Standard Visual Identity**: The admin dashboard is styled with generic grays and whites, which conflicts with the company's rich corporate color DA (emerald `#1C6B35`, bordeaux `#8B1919`, and historical gold).

---

## Proposed Changes & Logical File Links

```mermaid
graph TD
    AdminTopbar[AdminTopbar.astro] -- Sets localStorage Theme --> HTMLNode[html data-admin-theme]
    HTMLNode -- Overrides CSS Variables --> CSS[tokens.css]
    CSS -- Propagates Colors --> Tailwind[tailwind.config.mjs]
    
    CSVImporter[CSVImporter.jsx] -- postMessage --> BC[BroadcastChannel: sync]
    ProduitsManager[ProduitsManager.jsx] -- postMessage --> BC
    PromosManager[PromosManager.jsx] -- postMessage --> BC
    
    BC -- onmessage: refetch --> AfficheGen[AfficheGenerator.jsx]
    BC -- onmessage: refetch --> ProduitsManager
    BC -- onmessage: refetch --> PromosManager
    
    PromosAPI[promos/id.ts] -- Updates ticker_semaine --DB--> Supabase[Supabase DB]
    IndexAstro[index.astro] -- Queries ticker_semaine = true --> Supabase
```

---

### Component A: Global Theme System (DA & Aesthetic Upgrade)

We will implement a unified theme selector inside the admin topbar that propagates dynamic styling across the entire admin panel by binding Tailwind utility classes to HSL/HEX CSS custom variables.

#### [MODIFY] [tokens.css](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/styles/tokens.css)
- Define seasonal/cultural variables for the 8 official company themes under `html[data-admin-theme="theme_name"]`:
  - `spring` (Printemps) 🌸: Fresh grass green (`#7CB342`), peach accent (`#FF7043`), light gold.
  - `summer` (Été) ☀️: Radiant orange (`#FF9800`), raspberry pink (`#E91E63`), warm yellow.
  - `autumn` (Automne) 🍂: Deep terracotta (`#D84315`), rich amber (`#FF6F00`), bronze gold.
  - `winter` (Hiver) ❄️: Ice blue (`#1976D2`), crimson red (`#E53935`), light blue.
  - `ramadan` (Ramadan) 🌙: Luxury forest green (`#1C6B35`), emerald accent, crescent gold (`#FFD700`).
  - `christmas` (Noël) 🎄: Pine needle green (`#2E7D32`), ruby bordeaux (`#C62828`), gold.
  - `easter` (Pâques) 🐰: Royal lavender purple (`#9C27B0`), egg yellow (`#FFEB3B`), soft violet.
- Apply subtle glassmorphism borders and custom scrolling bar scrollbar-tints.

#### [MODIFY] [tailwind.config.mjs](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/tailwind.config.mjs)
- Map Tailwind colors `vert` and `rouge` (including their DEFAULT, dark, and light shades) to the dynamic CSS variables (`var(--color-vert)`, `var(--color-rouge)`) with default hex fallbacks. This ensures all layout classes (`bg-vert`, `text-vert-dark`, `border-vert/30`, `hover:bg-rouge`) automatically adapt when the theme changes!

#### [MODIFY] [AdminTopbar.astro](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/admin/AdminTopbar.astro)
- Add a beautiful theme selector dropdown widget next to the administrator menu in the top sticky header.
- On change, execute an inline script saving the option to `localStorage.setItem('admin_selected_theme', selectedTheme)` and update `document.documentElement.setAttribute('data-admin-theme', selectedTheme)`.
- Inject a tiny, synchronous inline blocking `<script>` in the head to apply the saved theme from storage prior to page paint, completely eliminating visual flashing.

---

### Component B: Cross-Island Real-Time State Sync

We will introduce a light pub/sub sync engine using the native browser `BroadcastChannel` API to link independent React islands across Astro shells and open browser tabs.

#### [MODIFY] [AfficheGenerator.jsx](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/islands/admin/AfficheGenerator.jsx)
- Convert static SSR props `initialProduits` and `initialPromos` into react state: `liveProduits` and `livePromos`.
- Subscribe to the `'marchedemo_admin_sync'` `BroadcastChannel`.
- On receiving `'PRODUITS_UPDATED'` or `'PROMOS_UPDATED'`, dynamically execute a background fetch to `/api/admin/produits` or `/api/admin/promos` and update the local search state. This ensures any product imported or promotion created in another window is instantly searchable for printing.

#### [MODIFY] [ProduitsManager.jsx](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/islands/admin/ProduitsManager.jsx)
- Initialize the `BroadcastChannel('marchedemo_admin_sync')` channel.
- After a successful single-row save, bulk delete, manual reordering, auto-matching, or bulk patch operation, invoke `channel.postMessage({ type: 'PRODUITS_UPDATED' })`.
- Subscribe to `'PRODUITS_UPDATED'` and invoke the existing `refreshProduits()` to automatically reload the active grid when changes are made in another window (e.g. Catalogue path tree vs CSV Importer).

#### [MODIFY] [PromosManager.jsx](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/islands/admin/PromosManager.jsx)
- Add a helper function `refreshPromos()` that calls `adminFetch('/api/admin/promos')` and updates local state.
- After a successful promotion save, deletion, toggle, or reorder, invoke `channel.postMessage({ type: 'PROMOS_UPDATED' })`.
- Listen to `'PROMOS_UPDATED'` and invoke `refreshPromos()` to keep promotions tables completely synchronized.

#### [MODIFY] [CSVImporter.jsx](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/islands/admin/CSVImporter.jsx)
- Immediately after bulk imports are completed, invoke `channel.postMessage({ type: 'PRODUITS_UPDATED' })`.

---

### Component C: Database-Backed Front Ticker Banner

We will make the prominent red storefront ticker banner fully configurable in the admin dashboard, maintaining a strict business constraint that only a single promotion can occupy this banner at once.

#### [MODIFY] [index.ts (promos API)](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/pages/api/admin/promos/index.ts)
- Support validation and mapping of the new `ticker_semaine` column.
- Inside `POST` and `PUT` (import) handlers, if a promotion is inserted with `ticker_semaine = true`, execute a database query setting `ticker_semaine = false` for all other rows first to enforce the constraint.

#### [MODIFY] [[id].ts (promos API)](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/pages/api/admin/promos/%5Bid%5D.ts)
- Inside the `PATCH` (partial update) handler, if `ticker_semaine` is set to `true`, execute a database reset:
  ```typescript
  if (patch.ticker_semaine === true) {
    await supabaseAdmin!
      .from("promos")
      .update({ ticker_semaine: false })
      .neq("id", uuid);
  }
  ```

#### [MODIFY] [PromosManager.jsx](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/components/islands/admin/PromosManager.jsx)
- Add a custom toggle switch named "Offre de la semaine (Bandeau rouge)" to the edit/create modal.
- Render a vibrant red `Offre Semaine` badge next to the featured promotion's title in the promotions table to give the administrator clear visibility.

#### [MODIFY] [promos-repo.ts](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/lib/promos-repo.ts)
- Update `rowToEntry` to parse and map `ticker_semaine: !!row.ticker_semaine` from Supabase rows.

#### [MODIFY] [index.astro (storefront)](file:///c:/Users/Mommy%20Jayce/Desktop/Microdidact/MarcheDeMoV2/src/pages/index.astro)
- Change `featuredPromo` lookup logic to locate the dynamic database-selected promo:
  ```javascript
  const featuredPromo = allPromos.find((p) => p.data.ticker_semaine) ?? allPromos.find((p) => p.data.mise_en_avant) ?? allPromos[0];
  ```

---

## Verification & Deployment Plan

### Automated Checks
1. **TypeScript checking**: Run `npx astro check` to verify all components compile with clean typings.
2. **Production Bundle Compilation**: Run `npm run build` to guarantee complete build stability.

### Manual Verification
1. **Seasonal/Cultural Branding**:
   - Open `/admin` and select `Ramadan` from the Topbar. Confirm that all buttons (`bg-vert`), headers, and hover colors immediately shift to dark green and gold.
   - Click "Catalogue". Confirm the theme is preserved with zero visual flashing.
2. **Independent Island Sync**:
   - Open `/admin/import-produits` and `/admin/generateur-affiche` side-by-side.
   - Upload a test CSV containing a brand new product (e.g. "Riz Basmati Impérial").
   - Immediately switch to the Poster Generator tab and search "Impérial" in autocomplete. It must appear and resolve its rayon/price instantly without any page refresh!
3. **Only-One urgent Ticker constraint**:
   - Open `/admin/promos` and check "Offre de la semaine" on a promotion. Save it.
   - Visit the public homepage; verify the red banner displays this promotion.
   - Select "Offre de la semaine" on a *different* promotion in the admin. Verify that the previous promotion's badge disappears and the homepage red banner updates instantly to show the newly selected item.
