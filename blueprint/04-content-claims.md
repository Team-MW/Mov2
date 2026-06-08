# 04 — CONTENT & CLAIMS COHERENCE

> Covers: **F-06** ("60 ans d'expérience" vs `foundedYear: 2024`), and the **F-08**
> placeholder decision.
> Binding decisions: **D2** ("60 ans" is REAL — keep, but always framed as *familiale,
> 3 générations*), **D3** (no opening dates), **D5** (KEEP placeholders).
> Read `00-MASTER-INDEX.md` first. Pairs with `01-store-purge.md` §F (date removal).

---

## CANONICAL WORDING (use these exact phrases)

- **Full form** (default, where there's room):
  `60 ans d'expérience familiale (3 générations)`
- **Short form** (tight UI like the marquee/ticker):
  `60 ans d'expérience familiale`
- **NEVER** ship a bare `60 ans d'expérience` with no family/generations context,
  and **never** place a founding year ("depuis 2024", "fondé en 2024") next to it.

Rationale: the claim is true as **family** experience across **3 generations**; the
bare "60 ans" next to a 2024 store reads as a false advertising claim (DGCCRF risk).

---

## SECTION A — Standardize every "60 ans" mention (F-06)

### A.0 — Find them all
```
rg -n "60 ans" src/
```
Expected hits (verify): `src/lib/home-content.ts` (~line 119, marquee) and
`src/pages/franchise.astro` (~lines 24, 74, 96, 134).

### A.1 — `src/lib/home-content.ts` (~line 119, marquee item)
- **Find:** the marquee string `60 ans d'expérience`
- **Replace with:** `60 ans d'expérience familiale`  *(short form — marquee is tight)*
- **Why:** adds the truthful context inline.

### A.2 — `src/pages/franchise.astro` (~lines 24, 74, 96, 134)
- For **each** of the 4 occurrences:
  - If it already includes "familiale" / "trois générations" / "expertise familiale"
    context → **leave it** (don't duplicate the word).
  - If it's a **bare** "60 ans d'expérience" → change to the **full form**
    `60 ans d'expérience familiale (3 générations)` (or the short form if the layout
    can't fit the parenthetical).
- **Why:** every public instance carries the same defensible framing.
- **Watch-out:** these are in different contexts (hero, body, CTA). Match the
  surrounding sentence grammar — don't paste a phrase that breaks the sentence.

### A.3 — Any other hits from A.0
Apply the same rule. After this, **no bare "60 ans d'expérience"** remains.

**Acceptance check (A):** `rg -n "60 ans" src/` — every hit reads "…familiale…"
(and none sits next to a founding year).

---

## SECTION B — Founding-year coherence (`foundedYear`, F-06)

The conflict is "60 ans" vs `foundedYear: 2024`. We must not publicly assert a 2024
founding that contradicts the 60-years claim.

### B.0 — Find usages
```
rg -n "foundedYear|foundingDate" src/
```
Likely: `src/lib/site.ts` (~line 22 `foundedYear: 2024`) and `src/lib/schema.ts`
(Organization schema may emit `foundingDate`).

### B.1 — Stop asserting a contradictory founding year publicly
- **In `src/lib/schema.ts`:** if the Organization/GroceryStore schema emits
  `foundingDate` derived from `foundedYear`:
  - **Preferred:** set it to the **real** founding year of the family business
    (consistent with "60 ans" → roughly the mid-1960s). **Ask the owner for the exact
    year** before hardcoding it.
  - **Interim safe action (no owner input):** **remove** the `foundingDate` field from
    the emitted schema so the site makes **no** founding-year claim at all. This is
    safe for SEO (the field is optional) and removes the contradiction.
- **In `src/lib/site.ts`:** leave `foundedYear` only if nothing renders it in the UI.
  Run `rg -n "foundedYear" src/pages src/components` — if any **page/component
  displays** it, remove that display (per D3, no opening/founding date in the UI).

- **Why:** removes the "2024 vs 60 ans" contradiction without inventing a date.
- **Watch-out:** removing `foundingDate` from schema must not break the schema
  function's TypeScript (drop the property cleanly, don't leave a dangling comma/key).

**Acceptance check (B):** no UI shows a founding/opening year; the emitted
Organization JSON-LD either omits `foundingDate` or uses an owner-confirmed year that
is consistent with "60 ans". (Pairs with `01-store-purge.md` §F removing
`dateOuverture` and the "août 2024" line.)

---

## SECTION C — F-08 placeholders: NO ACTION (decision D5)

**Do NOT remove** "Bientôt en ligne" or "Photo à venir". The owner decided to **keep**
them (D5). The audit's F-08 ("remove placeholders") is **CANCELLED**.

The only allowed change to these strings is their **text color** for contrast, which
is handled in `02-contrast-accessibility.md` (color only — never delete the words).

**Acceptance check (C):** the placeholder words still appear on the relevant
product/rayon pages; only their color may have changed.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `rg -n "60 ans" src/` → all framed as "familiale" (no bare claim).
2. No UI renders a founding/opening year; schema makes no contradictory 2024 claim.
3. Placeholders intact (text unchanged).
4. `npx astro check` clean; `npm run build` (or `npx astro build`) green.

Then mark **F-06 = DONE** and **F-08 = CANCELLED** in `00-MASTER-INDEX.md` §4.
