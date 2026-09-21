/**
 * Jotform API client — lit les soumissions des 3 formulaires du site
 * (recrutement, franchise, fidélité) pour l'admin.
 *
 * Clé : JOTFORM_API_KEY (My Account → API → Full Access)
 * Base EU optionnelle : JOTFORM_API_BASE=https://eu-api.jotform.com
 */

export const JOTFORM_FORMS = [
  {
    id: "262253636484361",
    key: "recrutement",
    label: "Recrutement",
    description: "Candidatures (boucher, polyvalent, apprentissage…)",
    page: "/recrutement",
  },
  {
    id: "262254008330345",
    key: "franchise",
    label: "Franchise",
    description: "Demandes de franchise",
    page: "/franchise",
  },
  {
    id: "262253577205356",
    key: "fidelite",
    label: "Fidélité",
    description: "Inscriptions programme de fidélité",
    page: "/programme-fidelite",
  },
] as const;

export type JotformFormKey = (typeof JOTFORM_FORMS)[number]["key"];

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

function apiBase(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env?.JOTFORM_API_BASE) || "";
  if (fromEnv.trim()) return fromEnv.replace(/\/$/, "");
  // Compte Marché de Mo' = EU Safe mode (eu-api.jotform.com)
  return "https://eu-api.jotform.com";
}

export function getJotformApiKey(): string | null {
  const key =
    (typeof process !== "undefined" && process.env?.JOTFORM_API_KEY) || "";
  return key.trim() || null;
}

function formatAnswerValue(
  a: JotformAnswer
): string {
  if (a.prettyFormat) return String(a.prettyFormat);
  const v = a.answer;
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || "—";
  if (typeof v === "object") {
    // name / address fields often land as { first, last } etc.
    const parts = Object.values(v).filter(
      (x) => typeof x === "string" && x.trim()
    );
    return parts.length ? parts.join(" ") : "—";
  }
  return String(v);
}

/** Flatten answers into ordered { label, value } for UI. */
export function flattenAnswers(
  answers: Record<string, JotformAnswer>
): { label: string; value: string }[] {
  return Object.values(answers)
    .filter((a) => a && a.text && a.type !== "control_button" && a.type !== "control_head")
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((a) => ({
      label: a.text,
      value: formatAnswerValue(a),
    }));
}

export function getFormByKey(key: string) {
  return JOTFORM_FORMS.find((f) => f.key === key) ?? JOTFORM_FORMS[0];
}

/**
 * Fetch latest submissions for a form.
 * Docs: GET /form/{id}/submissions
 */
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
        "JOTFORM_API_KEY manquante. Créez une clé Full Access sur jotform.com → My Account → API, puis ajoutez-la dans .env.local et Vercel.",
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
          `Jotform a renvoyé ${res.status}. Vérifiez la clé API et les droits Full Access.`,
      };
    }

    const submissions = Array.isArray(json.content) ? json.content : [];
    const totalRaw = json.resultSet?.total ?? json.resultSet?.count ?? submissions.length;
    const total = typeof totalRaw === "string" ? parseInt(totalRaw, 10) || submissions.length : Number(totalRaw) || submissions.length;

    return { submissions, total };
  } catch (e) {
    return {
      submissions: [],
      total: 0,
      error: e instanceof Error ? e.message : "Erreur réseau Jotform",
    };
  }
}
