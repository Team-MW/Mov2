# 02 — CONTRAST & ACCESSIBILITY

> Covers: **F-20** (low-contrast caption text, widespread), **F-21** (themed primary
> buttons illegible on cultural sections), **F-22** (footer fine print).
> Target: **WCAG 2.2 AA** — body/caption text ≥ **4.5:1**, large text (≥24px or ≥19px bold) ≥ **3:1**.
> Read `00-MASTER-INDEX.md` first.

**Why this matters:** `tailwind.config.mjs` remaps `slate-400 = #999996` (~2.8:1 on
white) and the UI uses `neutral-400 = #a3a3a3` (~2.6:1). Both **fail AA** for normal
text on light backgrounds.

---

## GUARDRAILS for this file (read before editing)

- **Do NOT change text inside the phone simulator** in `src/pages/index.astro`
  (the cart/order/delivery demo). It is an intentional brand demo (D7). If its
  product-origin text is low-contrast, **leave it**.
- **Color-only changes.** Never change the words — especially keep "Photo à venir"
  and "Bientôt en ligne" (D5). You only adjust the Tailwind text-color class.
- **Light backgrounds only for F-20.** Dark-surface text is handled separately
  (F-22 for the footer). Do not bump a `neutral-400` that sits on a dark/black bg.

---

## ALREADY DONE (do NOT redo — verify only)

These were already bumped `neutral-400 → neutral-500`. Just confirm they still read 500:

- `src/components/ProduitCard.astro` — "Photo à venir" caption + product `origine`.
- `src/components/Header.astro` — subtitle "Supermarché du Monde".
- `src/pages/recherche.astro` — search input icon.

---

## SECTION A — F-20 contrast sweep

### A.0 — The rule (apply to every hit)
- On a **light** background (white / `bg-neutral-50` / `bg-creme` / default page bg):
  - `text-neutral-400` → **`text-neutral-500`** (use **`text-neutral-600`** if the
    text is very small, ≤ 11px, or italic fine print, to be safely ≥ 4.5:1).
  - `text-slate-400` → **`text-slate-600`** (slate-400 is `#999996`; slate-500 is
    borderline, so prefer **600** on white).
- On a **dark** background: **skip** (see F-22 for the footer).
- Inside the **phone simulator**: **skip** (guardrail).

### A.1 — Known pending hits (apply A.0)
Locate each by its **Find** string; line numbers are approximate.

| File | ~line | Find (anchor) | Action |
|---|---|---|---|
| `src/pages/produits/[slug].astro` | 135 | `text-neutral-400 italic font-pro` (the "Photo à venir" caption) | → `text-neutral-500` |
| `src/pages/produits/[rayon].astro` | ~150 | search icon `w-5 h-5 text-neutral-400 pointer-events-none` | → `text-neutral-500` |
| `src/pages/produits/index.astro` | ~86 | search icon `w-5 h-5 text-neutral-400 pointer-events-none` | → `text-neutral-500` |
| `src/pages/rayons/[...path].astro` | 941 | `text-[9.5px] text-neutral-400 italic` ("Photo à venir") | → `text-neutral-500` |
| `src/pages/nos-engagements.astro` | ~28 | `<span class="text-neutral-400">n'importe</span>` | → `text-neutral-500` |

> Note: these five edits were prepared previously but **not yet applied** — apply them now.

### A.2 — Full sweep (find the rest)
The audit notes many more occurrences. Find them and triage with A.0:

```
rg -n "text-neutral-400" src/
rg -n "text-slate-400" src/
```

For **each** hit:
1. Open the file at that line; determine the background of the element/ancestor.
2. If **light bg & not in the phone simulator** → apply A.0.
3. If **dark bg** → skip (or, for the footer specifically, see F-22).
4. If unsure, paste the fg/bg hex into a contrast checker; only keep colors ≥ 4.5:1
   (normal text) or ≥ 3:1 (large text).

**Do NOT** mass replace-all blindly — some `neutral-400`/`slate-400` are on dark
surfaces or are borders (`border-neutral-400`), which this rule does not touch.
Only `text-*` utilities on light backgrounds are in scope.

**Acceptance check (F-20):** after the sweep, every remaining `text-neutral-400` /
`text-slate-400` in `src/` is either on a dark surface, inside the phone simulator,
or otherwise verified ≥ AA. Spot-check `/produits`, a product page, a rayon page,
`/recherche`, `/nos-engagements` at 100% zoom.

---

## SECTION B — F-21 themed primary buttons on cultural sections

**Problem:** `src/styles/rayons/cultural-palettes.css` (~lines 246–251) sets
`[data-culture] .btn-primary { background: var(--culture-accent); color: var(--culture-text); }`.
`--culture-text` was chosen to read on the **gradient**, not on the **accent**. For
dark accents the button becomes near-black text on a dark fill and fails:
- `asie` accent `#4F6E1C`, `hygiène` `#B85257`, `sauces` `#A85710` (with `text:"dark"`).

**Fix = introduce a dedicated on-accent color** instead of reusing `--culture-text`.

### B.1 — Add a `--culture-on-accent` token per palette
- **File:** `src/styles/rayons/cultural-palettes.css`
- For **each** `[data-culture="…"] { … }` block, add a `--culture-on-accent` variable:
  - If the block's `--culture-accent` is **dark** → `--culture-on-accent: #ffffff;`
  - If the block's `--culture-accent` is **light** → `--culture-on-accent: #0f0f0f;`
- **How to decide dark vs light** (simple, deterministic): compute relative luminance
  of the accent hex. Quick rule of thumb that's safe for these saturated brand colors:
  treat it as **dark** (use white text) unless the accent is a pale/pastel tint.
  Known **dark** (use `#ffffff`): `asie #4F6E1C`, `hygiène #B85257`, `sauces #A85710`.
  For every other culture, read its accent hex (in this file or `src/lib/banners.ts`)
  and pick white for deep/saturated colors, `#0f0f0f` only for genuinely pale accents.
  **Verify each** chosen pair reaches ≥ 4.5:1 with a contrast checker.

### B.2 — Point the button at the new token
- **Find:** `[data-culture] .btn-primary { … color: var(--culture-text); … }`
- **Replace** the `color` line with: `color: var(--culture-on-accent, #ffffff);`
  (white fallback is the safe default for missing tokens.)
- **Why:** the CTA text color is now tuned to the **accent**, not the gradient.
- **Watch-out:** do not change the `background: var(--culture-accent)` line; only the
  text color. Leave `--culture-text` as-is (it's still correct for text on gradients).

**Acceptance check (F-21):** on each cultural rayon page (e.g. `/rayons/asie`,
`/rayons/hygiene`, `/rayons/sauces`), the primary CTA text is clearly legible on its
button (white on the dark accents). Verify ≥ 4.5:1.

> **Correction from the audit:** the `CultureChip` component is **fine** (its caption
> is accent-colored text on a white strip). **Do not** change `CultureChip.astro`.

---

## SECTION C — F-22 footer fine print (dark surface)

**Problem:** on the black footer (`#0F0F0F`), credit/legal text uses
`text-white/45`–`/50` at 12–12.5px → ~3.4–4:1 (fails AA for normal text).

### C.1 — `src/components/Footer.astro` (~lines 66, 172, 182)
- **Find:** the low-opacity classes `text-white/45` and `text-white/50` on the agency
  credit and the legal/mentions line (three spots).
- **Replace with:** **`text-white/70`** (≈ 5:1 on `#0F0F0F`, passes AA).
- **Why:** brings dark-surface fine print to AA without changing layout.
- **Watch-out:** only bump these fine-print lines. Don't globally change every
  `text-white/xx` in the footer (some are larger/decorative and already pass).

**Acceptance check (F-22):** footer credit + legal line are clearly readable; verify
white@70% on `#0F0F0F` ≥ 4.5:1.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `npx astro check` → no new errors.
2. `npm run build` (or `npx astro build`) → green.
3. Manual @100% zoom: `/produits`, a product page, a rayon page, `/recherche`,
   `/nos-engagements`, the three cultural rayons (asie/hygiène/sauces), and the footer.
4. Spot-check a couple of fixed colors in a contrast checker to confirm ≥ AA.

Then mark **F-20/F-21/F-22 = DONE** in `00-MASTER-INDEX.md` §4 (F-20 was 🟡 PARTIAL).
