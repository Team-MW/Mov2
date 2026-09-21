import { useMemo, useState } from "react";

/**
 * JotformSubmissionsView — liste les soumissions Jotform dans l'admin.
 * Les données sont chargées côté serveur (Astro) puis passées en props.
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

export default function JotformSubmissionsView({
  forms,
  initialKey,
  configured,
}) {
  const [active, setActive] = useState(initialKey);
  const [openId, setOpenId] = useState(null);

  const current = useMemo(
    () => forms.find((f) => f.key === active) ?? forms[0],
    [forms, active]
  );

  if (!configured) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 md:p-8 space-y-3">
        <p className="font-bold text-[15px] text-orange-900">
          Clé API Jotform manquante
        </p>
        <ol className="list-decimal pl-5 text-[14px] text-orange-800 space-y-2 leading-relaxed">
          <li>
            Sur{" "}
            <a
              href="https://www.jotform.com/myaccount/api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              jotform.com → My Account → API
            </a>
            , créez une clé (lecture seule suffit).
          </li>
          <li>
            Ajoutez{" "}
            <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">
              JOTFORM_API_KEY=votre_cle
            </code>{" "}
            et{" "}
            <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">
              JOTFORM_API_BASE=https://eu-api.jotform.com
            </code>{" "}
            dans <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">.env.local</code>{" "}
            (et dans Vercel → Environment Variables pour la prod).
          </li>
          <li>Redémarrez le serveur / redéployez, puis rechargez cette page.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Formulaires Jotform"
      >
        {forms.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={active === f.key}
            onClick={() => {
              setActive(f.key);
              setOpenId(null);
            }}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition border",
              active === f.key
                ? "bg-noir text-white border-noir"
                : "bg-white text-neutral-700 border-black/10 hover:border-vert/40",
            ].join(" ")}
          >
            {f.label}
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

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="font-soft font-bold text-[20px]">{current.label}</h2>
          <p className="text-[13.5px] text-neutral-500 mt-1">
            {current.description} ·{" "}
            <a
              href={current.page}
              className="text-vert font-bold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir le formulaire ↗
            </a>
          </p>
        </div>
        <p className="text-[12.5px] text-neutral-400">
          {current.total} soumission{current.total > 1 ? "s" : ""} · synchro Jotform live
        </p>
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
      ) : (
        <ul className="space-y-3">
          {current.submissions.map((s) => {
            const open = openId === s.id;
            return (
              <li
                key={s.id}
                className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-neutral-50/80 transition"
                  onClick={() => setOpenId(open ? null : s.id)}
                  aria-expanded={open}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14.5px] text-neutral-900 truncate">
                      {s.preview || `Soumission #${s.id}`}
                    </p>
                    <p className="text-[12.5px] text-neutral-500 mt-0.5">
                      {formatDate(s.created_at)} · ID {s.id}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-500 shrink-0">
                    {open ? "Masquer" : "Détails"}
                    <svg
                      className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {open && (
                  <div className="border-t border-black/5 bg-neutral-50/60 px-5 py-4">
                    <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                      {s.answers.map((row, i) => (
                        <div key={`${s.id}-${i}`}>
                          <dt className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">
                            {row.label}
                          </dt>
                          <dd className="text-[14px] text-neutral-800 mt-0.5 break-words whitespace-pre-wrap">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <a
                      href={`https://www.jotform.com/inbox/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex mt-4 text-[12.5px] font-bold text-vert hover:underline"
                    >
                      Ouvrir dans Jotform Inbox ↗
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
