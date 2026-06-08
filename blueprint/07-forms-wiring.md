# 07 — FORMS WIRING → `logiciel-formulaire` microservice (DO THIS LAST)

> Covers: **F-02** (endpoints are stubs), **F-03** (contact broken URL/env),
> **F-04** (franchise — already fixed; repoint here), **F-09** (fidélité no feedback),
> **F-10** (honeypot name), **F-11** (`fidelite.ts` weak).
> Binding decision **D4**: this is the **LAST** task; wire only when the owner gives
> **one UUID per form**; include the **fidélité** sign-up. Read `00-MASTER-INDEX.md` first.

---

## STOP — preconditions (do not start without these)

1. **One form UUID per form**, created in the microservice admin panel, for:
   `contact`, `newsletter`, `fidelite`, `candidature`, `suggestion`, `franchise`.
   - Verify whether the existing `90571e4a-d9db-4fa0-bfb1-b95eaf887631` is a real,
     valid **contact** UUID; if not, get a fresh one.
2. **PoW on/off decision per form** (the backend supports optional Proof-of-Work).
   Recommended: PoW **on** for `contact`, `franchise`, `candidature` (higher-value,
   spam-prone); **off** is acceptable for `newsletter`, `fidelite`, `suggestion`.

If you don't have the UUIDs, **STOP and ask the owner.** Do not point forms at the
microservice with placeholder UUIDs.

---

## THE CONTRACT (from `logiciel-formulaire/README.md`)

- **Submit:** `POST https://logiciel-formulaire.vercel.app/api/submit/{FORM_UUID}`
  with `Content-Type: application/json`.
- **Honeypot:** a field named **`_gotcha`** (must be **empty** for humans). This is the
  ONLY honeypot the backend honours — every form must use it (F-10).
- **Auto-reply language:** field **`_lang`** = `"fr"` (or `"en"`). `{{name}}`/`{{nom}}`
  are injected into the auto-reply, so send a name field when you have one.
- **Optional PoW:**
  1. `GET https://logiciel-formulaire.vercel.app/api/challenge`
     → `{ challenge, timestamp, difficulty }`.
  2. Find a `nonce` such that `sha256(`${challenge}:${nonce}`)` (hex) **starts with
     `difficulty` leading `0` characters**.
  3. Send `pow_challenge`, `pow_timestamp`, `pow_nonce` alongside the payload.
- **Response:** JSON. Non-2xx includes `{ error, remedy }` — show `remedy` (fallback
  `error`) to the user.
- **Candidature/CV caveat:** file uploads are handled as **Base64 → Supabase Storage**.
  Confirm the exact file-field contract in the README **before** migrating that form
  (it is the riskiest — do it last, see §G).

---

## STEP 1 — Environment variables

### 1.1 — Add to `.env.example` (and set real values in Vercel)
```
# --- Form microservice (logiciel-formulaire) ---
PUBLIC_FORM_API_URL="https://logiciel-formulaire.vercel.app/api"
PUBLIC_FORM_ID_CONTACT=""        # UUID from the microservice admin
PUBLIC_FORM_ID_NEWSLETTER=""
PUBLIC_FORM_ID_FIDELITE=""
PUBLIC_FORM_ID_CANDIDATURE=""
PUBLIC_FORM_ID_SUGGESTION=""
PUBLIC_FORM_ID_FRANCHISE=""
```
- `PUBLIC_` prefix = exposed to the client (required, forms submit from the browser).
- Leave the UUID values **empty** in `.env.example`; real UUIDs go in Vercel envs and
  the local `.env` only.
- **Why:** centralizes the endpoint + per-form IDs; kills the F-03 hardcoded localhost default.

---

## STEP 2 — Create ONE shared client helper (avoid duplicating PoW)

Create **`src/lib/forms-client.ts`** (new file). Both Astro inline `<script>` blocks
and the React island can `import` it.

```ts
const API_URL = import.meta.env.PUBLIC_FORM_API_URL; // ".../api"

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function solvePow(challenge: string, difficulty: number): Promise<number> {
  const prefix = "0".repeat(difficulty);
  for (let nonce = 0; nonce < 5_000_000; nonce++) {
    if ((await sha256Hex(`${challenge}:${nonce}`)).startsWith(prefix)) return nonce;
  }
  throw new Error("Échec du calcul de sécurité. Réessayez.");
}

export type SubmitOpts = { pow?: boolean; lang?: "fr" | "en" };

export async function submitForm(
  formId: string | undefined,
  payload: Record<string, unknown>,
  opts: SubmitOpts = {}
): Promise<any> {
  if (!API_URL) throw new Error("Configuration du formulaire manquante (API URL).");
  if (!formId) throw new Error("Ce formulaire n'est pas encore configuré.");

  const body: Record<string, unknown> = {
    _gotcha: "",            // honeypot (humans leave empty)
    _lang: opts.lang ?? "fr",
    ...payload,             // payload may override _gotcha with the real field value
  };

  if (opts.pow) {
    const ch = await fetch(`${API_URL}/challenge`).then((r) => r.json());
    body.pow_challenge = ch.challenge;
    body.pow_timestamp = ch.timestamp;
    body.pow_nonce = await solvePow(ch.challenge, ch.difficulty);
  }

  const res = await fetch(`${API_URL}/submit/${formId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.remedy || data.error || "Envoi impossible. Réessayez.");
  return data;
}
```
- **Why:** one tested place for the URL build + PoW + error mapping. Each form just
  builds its `payload` and calls `submitForm(...)`.
- **Honeypot:** the form's visible-but-hidden `_gotcha` field value should be read into
  `payload._gotcha`; if a bot filled it, the backend rejects it.

---

## STEP 3 — Per-form wiring

> For each form: (a) rename the honeypot field to **`_gotcha`** (F-10), (b) build the
> payload, (c) call `submitForm(...)`, (d) check the thrown error and show a toast,
> (e) keep the existing success UX. Field **names** sent should match what the
> microservice form expects (set those up in its admin).

### A — Contact (`src/pages/service-client.astro`) — fixes F-03
- **Remove** the broken `FORM_ID` default (~line 13) that holds a full localhost URL.
  Read the UUID from env instead: `const FORM_ID = import.meta.env.PUBLIC_FORM_ID_CONTACT;`
- **Replace** the manual `fetch(`${apiUrl}/submit/${formId}`)` (~line 204) and inline
  PoW with a call to `submitForm(FORM_ID, payload, { pow: true, lang: "fr" })`.
- **Toast "info" bug (F-03 secondary, ~line 165):** the toast engine
  (`Layout.astro` ~line 952) only knows `success`/`error`. Either:
  - map `info` to a neutral style in `Layout.astro` (add an `info` case), **or**
  - stop calling `showToast(..., "info")` (use `success` for the "calcul en cours"
    note, or a non-toast inline hint).
  Prefer adding the `info` case in `Layout.astro` so future code can use it.
- **Acceptance:** submit a test contact message → 2xx, success toast, the message
  arrives in the microservice admin; the "security calculating" note is not red.

### B — Suggestion (`src/pages/index.astro`, the suggestion form ~line 867)
- Rename honeypot `phone_confirm` → `_gotcha`.
- Build payload from the fields; call `submitForm(import.meta.env.PUBLIC_FORM_ID_SUGGESTION, payload, { pow: false })`.
- Keep the existing toast feedback; on thrown error show `error` toast.
- **Watch-out:** this is inside the home page — **do not touch the phone simulator**
  script/markup nearby (D7). Only the suggestion form's submit handler changes.

### C — Newsletter (footer `src/components/Footer.astro` ~line 198, and inline
`src/components/NewsletterInline.astro`)
- Both currently POST to `/api/newsletter` with honeypot `phone_confirm`.
- Rename honeypot → `_gotcha`; call
  `submitForm(import.meta.env.PUBLIC_FORM_ID_NEWSLETTER, { email, _gotcha }, { pow: false })`.
- The **inline** variant may redirect on success — keep that UX, but only after a 2xx.
- **Acceptance:** both newsletter entry points submit to the same newsletter UUID and
  show success/error correctly.

### D — Fidélité (`src/pages/programme-fidelite.astro` ~line 96) — fixes F-09 + F-11
- It is currently a **native POST** to `/api/fidelite` (full page reload, no toast).
- **Convert to a JS submit** (preventDefault) that calls
  `submitForm(import.meta.env.PUBLIC_FORM_ID_FIDELITE, payload, { pow: false })`,
  then shows a success/error toast (no reload). This removes the F-09 dead
  `?fidelite=ok` redirect entirely.
- Add a `_gotcha` hidden field (it had none).
- Keep the store value from `01-store-purge.md` §G (hidden input "Toulouse Sud").
- **Why F-11 is resolved:** once it goes through the microservice (which has its own
  validation + rate limit + PoW option), the weak local `api/fidelite.ts` is retired
  in §H.
- **Acceptance:** signing up shows an inline success toast, no page reload, no leftover
  `?fidelite=ok` in the URL; the entry lands in the fidélité form's admin.

### E — Franchise (`src/pages/franchise.astro`) — was F-04 (now repoint)
- F-04 is already fixed (honest submit to `/api/contact`). **Repoint** it to the
  microservice: call `submitForm(import.meta.env.PUBLIC_FORM_ID_FRANCHISE, payload, { pow: true })`.
- Keep the field mapping already built (téléphone/apport/région folded into `message`,
  plus `nom`, `email`, `sujet`). Add a `_gotcha` hidden field.
- **Acceptance:** a franchise lead reaches the franchise UUID's inbox; on error the
  user sees an honest error toast (not a fake success).

---

## STEP 4 — G: Candidature with CV upload (RISKIEST — do LAST)

`src/islands/ApplicationForm.jsx` posts to `/api/candidature` and uploads a **CV
file**. The microservice handles files as **Base64 → Supabase Storage**.

### G.1 — Confirm the file contract FIRST
- Re-read the file-upload section of `logiciel-formulaire/README.md`: exact field
  name(s) for the file, whether to send the `data:` prefix or strip it, and whether
  filename/mimetype go in separate fields.

### G.2 — Read the file as Base64 in the browser
```js
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result); // "data:application/pdf;base64,...."
    r.onerror = reject;
    r.readAsDataURL(file);
  });
```
- Build the payload per the README's file contract (e.g.
  `{ ...fields, cv_base64, cv_filename, cv_mimetype, _gotcha: "" }`), then call
  `submitForm(import.meta.env.PUBLIC_FORM_ID_CANDIDATURE, payload, { pow: true })`.
- Rename any `phone_confirm` honeypot → `_gotcha`.
- Keep the existing inline (non-toast) feedback the island already renders.
- **Watch-outs:** enforce a **file size cap** client-side (Base64 inflates ~33%;
  large CVs can exceed body limits) and an accept list (`.pdf,.doc,.docx`). Test with a
  **small real PDF** end-to-end and confirm it lands in Supabase Storage via the
  microservice admin before declaring done.

---

## STEP 5 — H: Honeypot unification + retire the local stubs

### H.1 — Honeypot (F-10)
- Confirm **every** wired form now uses `_gotcha` (grep `rg -n "phone_confirm" src/`
  → should reach **0** after wiring).

### H.2 — Retire the stubs (F-02 / F-11) — only after ALL forms verified
- Once contact, suggestion, newsletter (×2), fidélité, franchise, candidature are all
  confirmed working against the microservice:
  - Remove or disable `src/pages/api/contact.ts`, `newsletter.ts`, `candidature.ts`,
    `fidelite.ts` (they only `console.log`).
  - If anything still imports them, repoint or delete the import.
- **Watch-out:** do **not** delete the stubs before every form is verified — they're
  the current fallback. Delete last.

---

## FINAL VERIFICATION FOR THIS BLUEPRINT
1. `.env`/Vercel have `PUBLIC_FORM_API_URL` + all six `PUBLIC_FORM_ID_*` set.
2. `rg -n "phone_confirm" src/` → 0; `rg -n "localhost:3000" src/` → 0.
3. `npx astro check` clean; `npm run build` (or `npx astro build`) green.
4. Manual end-to-end for each form → 2xx, correct toast, entry visible in the
   microservice admin (and CV in Storage for candidature).
5. Local `src/pages/api/*` form stubs removed/disabled and nothing imports them.

Then mark **F-02/F-03/F-04/F-09/F-10/F-11 = DONE** in `00-MASTER-INDEX.md` §4.
