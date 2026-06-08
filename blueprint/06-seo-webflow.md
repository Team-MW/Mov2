# 06 — SEO, PERFORMANCE & WEB-FLOW

> Covers: **F-24** (dead `#livraison` anchor — anchor only), **F-25** (simulator
> double-run — **PARKED**), **F-26** (preview domain in `site`), **F-27** (perf
> re-measure).
> Binding decision **D7**: the phone simulator is an intentional demo — **do not touch it.**
> Read `00-MASTER-INDEX.md` first.

---

## SECTION A — F-24: fix the dead "Livraison et retours" anchor (ANCHOR ONLY)

**Reclassified by D7:** the home phone-simulator's ordering/delivery demo is
**intentional and stays**. The only real (minor) issue is a **dead link**: the footer
"Livraison et retours" points to `/service-client#livraison`, but
`src/pages/service-client.astro` has **no** element with `id="livraison"` → clicking
lands at the top of the page with nothing highlighted.

### A.1 — See what anchors actually exist
```
rg -n "id=\"" src/pages/service-client.astro
```

### A.2 — Pick ONE fix
- **Option 1 (preferred, no new claims):** repoint the footer link to a **real
  existing** target.
  - **File:** `src/components/Footer.astro` (~line 103)
  - **Find:** the href `/service-client#livraison`
  - **Replace with:** `/service-client` (drop the fragment) **or** an existing anchor
    found in A.1 (e.g. `/service-client#faq` if a FAQ section exists).
- **Option 2 (if the owner wants a real section):** add an
  `<section id="livraison">…</section>` to `service-client.astro` with
  **owner-approved** delivery/returns copy, then keep the footer fragment. **Do not
  invent** delivery terms/policies — ask the owner for the text first.

**Default:** do **Option 1** now (kills the dead anchor immediately). Only do Option 2
with owner-supplied copy.

- **Why:** removes a broken in-page link without fabricating a service policy.
- **Watch-out:** don't touch the phone simulator markup/script (D7) — this task is
  purely the footer href (and optionally a new content section).

**Acceptance check (F-24):** clicking footer "Livraison et retours" lands on a real
target (top of `/service-client`, or the chosen section), with no dead fragment.

---

## SECTION B — F-25: simulator double-run — PARKED (do NOT change)

**Status: PARKED by decision D7.** The simulator (`src/pages/index.astro`,
init ~lines 1164–1166) calls `runPhoneSimulator()` immediately **and** on
`astro:page-load`, so on first paint two timer loops run. The owner has **not**
greenlit touching the simulator, so **leave it as-is**.

> **If (and only if) the owner later greenlights it**, the safe fix is to register the
> run **once** — either run only on `astro:page-load`, or guard with a module-scoped
> `mounted`/`running` flag and `clearInterval` previous timers before starting new
> ones. Until greenlit: **no change.**

**Acceptance check (F-25):** none — intentionally unchanged.

---

## SECTION C — F-26: real domain for canonicals/OG/sitemap

**Problem:** `astro.config.mjs` (~line 13) `site` and `SITE.url` (`src/lib/site.ts`)
are the `*.vercel.app` preview domain, so canonical URLs, OG tags, and the sitemap
will point at the preview until the final domain is set.

### C.1 — When the final domain is known (ask the owner first)
- **File 1:** `astro.config.mjs` (~line 13) — set `site: "https://<final-domain>"`.
- **File 2:** `src/lib/site.ts` — set `SITE.url` (and any derived absolute-URL helper)
  to the same `https://<final-domain>`.
- Keep the two **identical** (a mismatch breaks canonical/OG consistency).
- **Why:** correct canonical/OG/sitemap = correct indexing + link previews.
- **Watch-out:** do **not** guess the domain. If unknown, **leave as-is** and flag it.
- **Related (forms service, not this site):** the `logiciel-formulaire` README warns a
  `*.vercel.app` address can't be used as an SMTP `FROM`. That's a config note for the
  **form microservice**, not this repo — mention it when wiring (`07-forms-wiring.md`).

**Acceptance check (F-26):** after setting the domain, built pages' `<link rel="canonical">`,
OG `url`, and `sitemap` entries use the final domain.

---

## SECTION D — F-27: re-measure performance on the real deploy

**Problem:** the Lighthouse baseline noted in `DEPLOY.md` (37/31) is a **local-server
artefact** (no Brotli/HTTP2/edge caching). It is not representative.

### D.1 — Process (no code change unless a regression is found)
- After deploying to the Vercel domain, run Lighthouse (mobile) on:
  - the home page (image-heavy + phone simulator), and
  - a cultural rayon page (gradients + banners).
- Watch **LCP** and **TBT** specifically.
- Only then decide if any perf code change is warranted (e.g. image sizing, deferring
  a script). Do **not** pre-optimize blindly now.
- **Watch-out:** keep `PUBLIC_SUPABASE_IMAGE_TRANSFORMS=on` and confirm the Supabase
  image-transform add-on is enabled (the `<Image>` remotePatterns pipeline is already
  well set up — don't dismantle it).

**Acceptance check (F-27):** a Lighthouse run on the **deployed** domain is recorded as
the new baseline; LCP/TBT noted for home + a cultural rayon.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. Footer "Livraison et retours" → real target (F-24); simulator untouched (F-25).
2. `npx astro check` clean; `npm run build` (or `npx astro build`) green.
3. F-26 only applied once the real domain is known (else flagged, not guessed).
4. F-27 measured post-deploy.

Then update `00-MASTER-INDEX.md` §4: **F-24 = DONE**, **F-25 = PARKED**,
**F-26 = pending domain**, **F-27 = measure post-deploy**.
