import { useMemo, useState } from "react";

/**
 * JotformSubmissionsView — toutes les réponses affichées en entier dans l'admin.
 * Pas de lien vers Jotform : tout se lit ici.
 */

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso.replace(" ", "T")));
  } catch {
    return iso;
  }
}

function isUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function AnswerValue({ value }) {
  if (!value) return <span className="text-neutral-400">—</span>;

  // Plusieurs URLs (fichiers) séparées par des sauts de ligne
  const lines = String(value).split("\n").filter(Boolean);
  if (lines.length > 0 && lines.every(isUrl)) {
    return (
      <ul className="space-y-1.5">
        {lines.map((url, i) => {
          const name = decodeURIComponent(url.split("/").pop() || `Fichier ${i + 1}`);
          return (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vert font-bold underline break-all"
              >
                {name}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-vert font-bold underline break-all"
      >
        {value}
      </a>
    );
  }

  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed">
      {value}
    </span>
  );
}

export default function JotformSubmissionsView({
  forms,
  initialKey,
  configured,
  setupHint = null,
}) {
  const [active, setActive] = useState(initialKey);
  const [query, setQuery] = useState("");

  const current = useMemo(
    () => forms.find((f) => f.key === active) ?? forms[0],
    [forms, active]
  );

  const filtered = useMemo(() => {
    if (!current?.submissions) return [];
    const q = query.trim().toLowerCase();
    if (!q) return current.submissions;
    return current.submissions.filter((s) => {
      if ((s.preview || "").toLowerCase().includes(q)) return true;
      return (s.answers || []).some((row) => {
        const label = (row.label || "").toLowerCase();
        const value = (row.value || "").toLowerCase();
        const isNameField = /nom|name|prénom|prenom|email|mail|téléphone|telephone|phone/i.test(
          row.label || ""
        );
        if (isNameField && value.includes(q)) return true;
        // Aussi chercher dans le libellé + valeur pour plus de souplesse
        return label.includes(q) || value.includes(q);
      });
    });
  }, [current, query]);

  if (!configured) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 md:p-8 space-y-3">
        <p className="font-bold text-[15px] text-orange-900">
          Clé API Jotform manquante sur ce serveur
        </p>
        {setupHint && (
          <p className="text-[14px] text-orange-800 leading-relaxed">{setupHint}</p>
        )}
        <ol className="list-decimal pl-5 text-[14px] text-orange-800 space-y-2 leading-relaxed">
          <li>
            Ouvre <strong>Vercel</strong> → Settings → Environment Variables
          </li>
          <li>
            Ajoute <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">JOTFORM_API_KEY</code> et{" "}
            <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">JOTFORM_API_BASE=https://eu-api.jotform.com</code>
          </li>
          <li>Redéploie, puis recharge cette page.</li>
        </ol>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center text-neutral-500 text-[14px]">
        Aucun formulaire Marché de Mo’ trouvé sur le compte Jotform.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Formulaires Marché de Mo'"
      >
        {forms.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={active === f.key}
            onClick={() => {
              setActive(f.key);
              setQuery("");
            }}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition border",
              active === f.key
                ? "bg-noir text-white border-noir"
                : "bg-white text-neutral-700 border-black/10 hover:border-vert/40",
              f.disabled ? "opacity-70" : "",
            ].join(" ")}
          >
            {f.label}
            {f.disabled && (
              <span className="text-[10px] uppercase tracking-wider opacity-80">
                archivé
              </span>
            )}
            <span
              className={[
                "text-[11px] px-1.5 py-0.5 rounded-full font-bold",
                active === f.key
                  ? "bg-white/20 text-white"
                  : "bg-neutral-100 text-neutral-500",
              ].join(" ")}
            >
              {f.total}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-soft font-bold text-[20px]">{current.label}</h2>
          <p className="text-[13.5px] text-neutral-500 mt-1">
            {current.description}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Rechercher un nom</span>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-black/10 bg-white text-[13.5px] outline-none focus:border-vert/40 focus:ring-2 focus:ring-vert/15 placeholder:text-neutral-400"
            />
          </label>
          <p className="text-[12.5px] text-neutral-400">
            {query.trim()
              ? `${filtered.length} résultat${filtered.length > 1 ? "s" : ""} sur ${current.total}`
              : `${current.total} réponse${current.total > 1 ? "s" : ""} affichée${current.total > 1 ? "s" : ""} en entier`}
          </p>
        </div>
      </div>

      {current.error ? (
        <div className="bg-rouge/5 border border-rouge/30 text-rouge rounded-2xl p-5 text-[14px]">
          <p className="font-bold mb-1">Impossible de charger les soumissions</p>
          <p className="leading-relaxed">{current.error}</p>
        </div>
      ) : current.submissions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center text-neutral-500 text-[14px]">
          Aucune soumission pour l’instant.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center text-neutral-500 text-[14px]">
          Aucun résultat pour « {query.trim()} ».
        </div>
      ) : (
        <ul className="space-y-5">
          {filtered.map((s, index) => (
            <li
              key={s.id}
              className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-black/5 bg-neutral-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <p className="font-bold text-[15px] text-neutral-900">
                    {s.preview || `Réponse #${filtered.length - index}`}
                  </p>
                  <p className="text-[12.5px] text-neutral-500 mt-0.5">
                    Reçue le {formatDate(s.created_at)}
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  #{filtered.length - index}
                </span>
              </div>

              <dl className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {s.answers.map((row, i) => (
                  <div
                    key={`${s.id}-${i}`}
                    className={row.fullWidth ? "sm:col-span-2" : undefined}
                  >
                    <dt className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 mb-1">
                      {row.label}
                    </dt>
                    <dd className="text-[14.5px] text-neutral-800">
                      <AnswerValue value={row.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
