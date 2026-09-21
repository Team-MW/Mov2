/**
 * Jotform API client — soumissions des formulaires Marché de Mo'
 * visibles dans /admin/formulaires.
 *
 * Clé : JOTFORM_API_KEY (lecture seule suffit)
 * Base EU (compte Safe mode) : JOTFORM_API_BASE=https://eu-api.jotform.com
 */

/** Formulaires connus du site public — enrichis avec page + libellé court. */
export const KNOWN_SITE_FORMS: Record<
  string,
  { key: string; label: string; description: string; page: string }
> = {
  "262253636484361": {
    key: "recrutement",
    label: "Recrutement",
    description: "Candidatures (boucher, polyvalent, apprentissage…)",
    page: "/recrutement",
  },
  "262254008330345": {
    key: "franchise",
    label: "Franchise",
    description: "Demandes de franchise",
    page: "/franchise",
  },
  "262253577205356": {
    key: "fidelite",
    label: "Fidélité",
    description: "Inscriptions programme de fidélité",
    page: "/programme-fidelite",
  },
};

/** Fallback si l'API /user/forms est indisponible. */
export const JOTFORM_FORMS = Object.entries(KNOWN_SITE_FORMS).map(
  ([id, meta]) => ({ id, ...meta })
);

export interface JotformFormMeta {
  id: string;
  key: string;
  label: string;
  description: string;
  page: string;
  status?: string;
  count?: number;
}

export interface JotformAnswer {
  name: string;
  order: string;
  text: string;
  type: string;
  answer?: string | string[] | Record<string, string> | number | boolean;
  prettyFormat?: string;
}

export interface JotformSubmission {
  id: string;
  form_id: string;
  created_at: string;
  status: string;
  answers: Record<string, JotformAnswer>;
}

export interface JotformListResult {
  submissions: JotformSubmission[];
  total: number;
  error?: string;
}

export function getJotformApiKey(): string | null {
  const key =
    import.meta.env.JOTFORM_API_KEY ||
    (typeof process !== "undefined" && process.env?.JOTFORM_API_KEY) ||
    "";
  return String(key).trim() || null;
}

function apiBase(): string {
  const fromEnv =
    import.meta.env.JOTFORM_API_BASE ||
    (typeof process !== "undefined" && process.env?.JOTFORM_API_BASE) ||
    "";
  if (String(fromEnv).trim()) return String(fromEnv).replace(/\/$/, "");
  return "https://eu-api.jotform.com";
}

function formatAnswerValue(a: JotformAnswer): string {
  const v = a.answer;
  if (v == null || v === "" || v === "None") {
    // Prefer structured name over prettyFormat when empty answer
    if (a.prettyFormat && a.prettyFormat !== "None") return String(a.prettyFormat);
    return "";
  }
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    const s = String(v);
    return s === "None" ? "" : s;
  }
  if (Array.isArray(v)) {
    // File uploads often come as URL arrays
    return v.filter(Boolean).join("\n") || "";
  }
  if (typeof v === "object") {
    const obj = v as Record<string, string>;
    if (obj.full) return String(obj.full);
    if (obj.first || obj.last) {
      return [obj.first, obj.last].filter(Boolean).join(" ").trim();
    }
    const parts = Object.values(obj).filter(
      (x) => typeof x === "string" && x.trim() && x !== "None"
    );
    return parts.length ? parts.join(" ") : "";
  }
  if (a.prettyFormat && a.prettyFormat !== "None") return String(a.prettyFormat);
  return "";
}

const SKIP_TYPES = new Set([
  "control_button",
  "control_head",
  "control_divider",
  "control_pagebreak",
]);

export function flattenAnswers(
  answers: Record<string, JotformAnswer>
): { label: string; value: string; fullWidth?: boolean }[] {
  return Object.values(answers)
    .filter((a) => a && a.text && !SKIP_TYPES.has(a.type || ""))
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((a) => {
      const value = formatAnswerValue(a);
      return {
        label: a.text.replace(/bbbb$/i, "").trim(),
        value,
        fullWidth:
          a.type === "control_textarea" ||
          a.type === "control_fileupload" ||
          value.length > 120,
      };
    })
    .filter((row) => row.value.length > 0);
}


function slugifyKey(title: string, id: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/marche de mo['']?\s*[-x:]?\s*/i, "")
    .replace(/fomu?laire/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `form-${id.slice(-6)}`;
}

function cleanLabel(title: string): string {
  return title
    .replace(/MARCHE DE MO\s*[-–:]?\s*/i, "")
    .replace(/Marché de Mo['']?\s*[-x:]\s*/i, "")
    .replace(/FOMULAIRE|FORMULAIRE/gi, "")
    .replace(/\s+/g, " ")
    .trim() || title;
}

function isMarcheDeMoForm(title: string): boolean {
  return /march[eé]\s*de\s*mo/i.test(title);
}

/**
 * Tous les formulaires Jotform « Marché de Mo' » du compte
 * (site + éventuels concours / anciens).
 */
export async function listMarcheDeMoForms(): Promise<{
  forms: JotformFormMeta[];
  error?: string;
}> {
  const apiKey = getJotformApiKey();
  if (!apiKey) {
    return {
      forms: JOTFORM_FORMS,
      error:
        "JOTFORM_API_KEY manquante sur ce serveur. Ajoutez-la dans Vercel → Settings → Environment Variables (Production), puis redéployez.",
    };
  }

  try {
    const url = new URL(`${apiBase()}/user/forms`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    const json = (await res.json()) as {
      responseCode?: number;
      message?: string;
      content?: Array<{
        id: string;
        title: string;
        status: string;
        count?: string | number;
      }>;
    };

    if (!res.ok || (json.responseCode && json.responseCode >= 400)) {
      return {
        forms: JOTFORM_FORMS,
        error: json.message || `Jotform ${res.status}`,
      };
    }

    const raw = (json.content || []).filter((f) => isMarcheDeMoForm(f.title));

    // Toujours inclure les 3 formulaires du site même s'ils changent de titre
    const byId = new Map(raw.map((f) => [f.id, f]));
    for (const id of Object.keys(KNOWN_SITE_FORMS)) {
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          title: KNOWN_SITE_FORMS[id].label,
          status: "ENABLED",
          count: 0,
        });
      }
    }

    const forms: JotformFormMeta[] = [...byId.values()]
      .map((f) => {
        const known = KNOWN_SITE_FORMS[f.id];
        const count =
          typeof f.count === "string" ? parseInt(f.count, 10) : Number(f.count) || 0;
        return {
          id: f.id,
          key: known?.key ?? slugifyKey(f.title, f.id),
          label: known?.label ?? cleanLabel(f.title),
          description:
            known?.description ??
            (f.status === "DISABLED"
              ? "Formulaire archivé / désactivé"
              : "Formulaire Marché de Mo'"),
          page: known?.page ?? "#",
          status: f.status,
          count,
        };
      })
      // Actifs d'abord, puis plus de réponses
      .sort((a, b) => {
        const aOff = a.status === "DISABLED" ? 1 : 0;
        const bOff = b.status === "DISABLED" ? 1 : 0;
        if (aOff !== bOff) return aOff - bOff;
        return (b.count ?? 0) - (a.count ?? 0);
      });

    return { forms };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const detail =
      err.cause?.code ||
      err.cause?.message ||
      (e instanceof Error ? e.message : "Erreur réseau Jotform");
    return {
      forms: JOTFORM_FORMS,
      error: `Connexion Jotform impossible (${detail}). Vérifie ta connexion internet ou relance npm run dev dans ton terminal.`,
    };
  }
}

export function getFormByKey(
  forms: JotformFormMeta[],
  key: string
): JotformFormMeta {
  return forms.find((f) => f.key === key || f.id === key) ?? forms[0];
}

export async function fetchFormSubmissions(
  formId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<JotformListResult> {
  const apiKey = getJotformApiKey();
  if (!apiKey) {
    return {
      submissions: [],
      total: 0,
      error:
        "JOTFORM_API_KEY manquante. Ajoutez-la dans Vercel (Production) et redéployez.",
    };
  }

  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const url = new URL(`${apiBase()}/form/${formId}/submissions`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("orderby", "created_at");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    const json = (await res.json()) as {
      responseCode?: number;
      message?: string;
      content?: JotformSubmission[];
      resultSet?: { count?: number; total?: number | string };
    };

    if (!res.ok || (json.responseCode && json.responseCode >= 400)) {
      return {
        submissions: [],
        total: 0,
        error:
          json.message ||
          `Jotform a renvoyé ${res.status}. Vérifiez la clé API.`,
      };
    }

    const submissions = Array.isArray(json.content) ? json.content : [];
    const totalRaw =
      json.resultSet?.total ?? json.resultSet?.count ?? submissions.length;
    const total =
      typeof totalRaw === "string"
        ? parseInt(totalRaw, 10) || submissions.length
        : Number(totalRaw) || submissions.length;

    return { submissions, total };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const detail =
      err.cause?.code ||
      err.cause?.message ||
      (e instanceof Error ? e.message : "Erreur réseau Jotform");
    return {
      submissions: [],
      total: 0,
      error: `Connexion Jotform impossible (${detail}).`,
    };
  }
}
