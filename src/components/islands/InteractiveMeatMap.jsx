import React, { useState } from 'react';
import { animalsData } from '../../data/animalsCuts';
import { animalsZones } from '../../data/animalsZones';

/**
 * Carte des découpes — boucherie halal.
 *
 * - Onglets animaux (coins nets, rouge boucherie sur l'onglet actif).
 * - Schéma : repères NUMÉROTÉS posés sur la silhouette (coordonnées en %
 *   de l'image 1376×768, affichée à son ratio exact → pas de décalage).
 * - Légende numérotée sous le schéma : tous les noms sont visibles sans
 *   avoir à deviner où cliquer.
 * - Fiche « conseil du boucher » : nom, description, morceaux en vitrine,
 *   modes de cuisson, navigation précédent / suivant.
 */
/* Les silhouettes n'occupent qu'une partie de l'image 1376×768 : on zoome
 * chaque animal pour qu'il remplisse le cadre (valeurs mesurées sur grille). */
const ZOOM = { agneau: 1.25, boeuf: 1, veau: 1.15, poulet: 1.25, dinde: 1.2, lapin: 1.3, chevre: 1.15 };

export default function InteractiveMeatMap() {
  const [animalId, setAnimalId] = useState('agneau');
  const animal = animalsData.find((a) => a.id === animalId) || animalsData[0];
  const [cutIndex, setCutIndex] = useState(0);
  const cut = animal.cuts[cutIndex] || animal.cuts[0];
  const total = animal.cuts.length;

  const selectAnimal = (id) => {
    setAnimalId(id);
    setCutIndex(0);
  };
  const go = (delta) => setCutIndex((i) => (i + delta + total) % total);

  return (
    <div className="meatmap rounded-lg bg-white ring-1 ring-black/10 overflow-hidden">
      {/* Onglets animaux */}
      <div
        className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-black/10 px-3 md:px-6 bg-neutral-50"
        role="tablist"
        aria-label="Choisir un animal"
      >
        {animalsData.map((a) => {
          const active = a.id === animalId;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectAnimal(a.id)}
              className={`relative px-4 md:px-5 py-4 text-[14px] md:text-[15px] font-bold whitespace-nowrap transition-colors ${
                active ? 'text-rouge' : 'text-neutral-500 hover:text-noir'
              }`}
            >
              {a.name}
              <span
                className={`absolute left-3 right-3 bottom-0 h-[3px] bg-rouge transition-opacity ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        {/* Schéma + légende */}
        <div className="p-5 md:p-8 lg:border-r border-black/10">
          <div className="relative w-full aspect-[1376/768] overflow-hidden" key={animal.id}>
           <div
            className="absolute inset-0"
            style={{ transform: `scale(${ZOOM[animal.id] || 1})`, '--z': ZOOM[animal.id] || 1 }}
           >
            <img
              src={animal.image}
              alt={`${animal.name} — schéma des découpes`}
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
              draggable="false"
            />
            {animalsZones[animal.id] && (
              <div
                className="meatmap-zones"
                style={{
                  WebkitMaskImage: `url(/images/decoupe/${animal.id}-mask.png)`,
                  maskImage: `url(/images/decoupe/${animal.id}-mask.png)`,
                }}
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {animal.cuts.map((c, i) => {
                    const pts = animalsZones[animal.id][c.id];
                    if (!pts) return null;
                    return (
                      <polygon
                        key={c.id}
                        points={pts}
                        className="meatmap-zone"
                        data-active={i === cutIndex || undefined}
                        onClick={() => setCutIndex(i)}
                      />
                    );
                  })}
                </svg>
              </div>
            )}
            {animal.cuts.map((c, i) => {
              const active = i === cutIndex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCutIndex(i)}
                  aria-label={`${i + 1}. ${c.name}`}
                  aria-pressed={active}
                  className="meatmap-pin absolute"
                  style={{ top: c.top, left: c.left }}
                  data-active={active || undefined}
                >
                  {i + 1}
                  {active && <span className="meatmap-pin-label">{c.name}</span>}
                </button>
              );
            })}
           </div>
          </div>

          {/* Légende numérotée */}
          <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {animal.cuts.map((c, i) => {
              const active = i === cutIndex;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCutIndex(i)}
                    className={`w-full flex items-center gap-3 py-2 text-left text-[14.5px] border-b transition-colors ${
                      active
                        ? 'border-rouge text-rouge font-bold'
                        : 'border-black/5 text-neutral-700 hover:text-noir'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0 ${
                        active ? 'bg-rouge text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    {c.name}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Fiche conseil du boucher */}
        <div className="p-5 md:p-8 bg-neutral-50 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <span className="eyebrow eyebrow--rouge">Le conseil du boucher</span>
            <img
              src="/images/halal-logo.png"
              alt="Certifié halal"
              className="w-12 h-12 object-contain shrink-0"
            />
          </div>

          <p className="mt-5 text-[13px] font-bold text-neutral-500">
            {animal.name} · morceau {cutIndex + 1} sur {total}
          </p>
          <h3 className="mt-1 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.02] text-noir text-balance">
            {cut.name}
          </h3>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-700">{cut.description}</p>

          <dl className="mt-7 space-y-5">
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500 mb-2">
                En vitrine
              </dt>
              <dd className="flex flex-wrap gap-2">
                {cut.availableMeats.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1.5 bg-white ring-1 ring-black/10 rounded-md text-[14px] text-noir font-medium"
                  >
                    {m}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500 mb-2">
                Idéal pour
              </dt>
              <dd className="flex flex-wrap gap-2">
                {cut.cookingMethods.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1.5 bg-rouge text-white rounded-md text-[14px] font-bold"
                  >
                    {m}
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md ring-1 ring-black/15 bg-white text-[14px] font-bold text-noir hover:ring-rouge hover:text-rouge transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Précédent
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-rouge text-white text-[14px] font-bold hover:bg-rouge-dark transition-colors"
            >
              Morceau suivant
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .meatmap-pin {
          transform: translate(-50%, -50%) scale(calc(1 / var(--z, 1)));
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: 700 13px/1 var(--font-body, system-ui);
          color: var(--color-rouge, #8B1919);
          background: #fff;
          border: 2px solid var(--color-rouge, #8B1919);
          transition: background-color .15s ease, color .15s ease, transform .15s ease;
          z-index: 1;
        }
        .meatmap-pin:hover { background: #FCEEEE; }
        /* Zones de découpe : découpées au contour exact par le masque du corps */
        .meatmap-zones {
          position: absolute;
          inset: 0;
          -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
        }
        .meatmap-zones svg { width: 100%; height: 100%; display: block; }
        .meatmap-zone {
          fill: rgba(139, 25, 25, 0);
          stroke: var(--color-rouge, #8B1919);
          stroke-width: 1.6px;
          stroke-dasharray: 6 4;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
          cursor: pointer;
          transition: fill .15s ease;
        }
        .meatmap-zone:hover { fill: rgba(139, 25, 25, 0.10); }
        .meatmap-zone[data-active] { fill: rgba(139, 25, 25, 0.26); }
        .meatmap-pin[data-active] {
          background: var(--color-rouge, #8B1919);
          color: #fff;
          transform: translate(-50%, -50%) scale(calc(1.15 / var(--z, 1)));
          z-index: 2;
        }
        .meatmap-pin:focus-visible { outline: 3px solid var(--color-noir, #0F0F0F); outline-offset: 2px; }
        .meatmap-pin-label {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          transform: translateX(-50%);
          white-space: nowrap;
          background: var(--color-noir, #0F0F0F);
          color: #fff;
          font: 700 12.5px/1 var(--font-body, system-ui);
          padding: 6px 9px;
          border-radius: 4px;
          pointer-events: none;
        }
        /* Mobile : seul le repère actif est numéroté, les autres deviennent
           de petits points pour ne pas se chevaucher. */
        @media (max-width: 640px) {
          .meatmap-pin { width: 12px; height: 12px; font-size: 0; border-width: 2px; }
          .meatmap-pin[data-active] { width: 26px; height: 26px; font-size: 12px; }
          .meatmap-pin-label { display: none; }
        }
      `}</style>
    </div>
  );
}
