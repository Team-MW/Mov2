import { useEffect, useMemo, useState } from "react";
import InlineImageUpload from "./InlineImageUpload.jsx";
import EmptyState from "./EmptyState.jsx";
import { adminFetch } from "./adminFetch.js";
import { humanizeError } from "../../../lib/admin-errors";
import { publishAdminEvent, subscribeAdminEvents, ADMIN_EVENT } from "./admin-bus.js";

/**
 * HomeContentManager — single admin island that bundles two editors :
 *
 *   1. Editorial slides (PromoHero injects them after mise_en_avant
 *      promos). Stored in `home_editorial_slides`.
 *   2. Marquee items (KineticMarquee labels). Stored in
 *      `home_marquee_items`.
 *
 * Two tabs share toast + cross-tab sync wiring. The bus uses the
 * `MEDIAS_UPDATED` event for both kinds — the underlying APIs are
 * separate so a mutation to slides doesn't cause a marquee refetch
 * (we publish + subscribe the same channel but discriminate via
 * `event.entity`).
 *
 * Props
 * -----
 *   initialSlides   : slide rows from the admin GET (full DB shape,
 *                     not the public-facing one).
 *   initialMarquee  : marquee item rows (id + label + ordre + actif).
 */

const EMPTY_SLIDE = {
  id: null,
  slug: "",
  eyebrow: "",
  titre: "",
  description: "",
  image: "",
  image_alt: "",
  video_url: null,
  cta_label: "",
  cta_href: "",
  accent: "#1C6B35",
  ordre: 0,
  actif: true,
};

function slugifyLocal(raw) {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function HomeContentManager({ initialSlides = [], initialMarquee = [] }) {
  const [tab, setTab] = useState("slides"); // "slides" | "marquee"
  const [slides, setSlides] = useState(() => initialSlides.slice().sort(byOrdre));
  const [marquee, setMarquee] = useState(() => initialMarquee.slice().sort(byOrdre));
  const [editingSlide, setEditingSlide] = useState(null);
  const [toast, setToast] = useState(null);

  function notify(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3800);
  }

  /* ---------------- Cross-tab sync ---------------- */
  useEffect(() => {
    return subscribeAdminEvents([ADMIN_EVENT.MEDIAS_UPDATED], (ev) => {
      if (!ev?.entity) return;
      if (ev.entity.startsWith("home_slide")) void refreshSlides();
      else if (ev.entity.startsWith("home_marquee")) void refreshMarquee();
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  /* ---------------- Slide refetch + mutations ---------------- */
  async function refreshSlides() {
    try {
      const res = await adminFetch("/api/admin/home/editorial");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setSlides((data.slides ?? []).slice().sort(byOrdre));
    } catch (err) {
      notify("err", `Erreur rafraîchissement slides : ${humanizeError(err)}`);
    }
  }

  async function refreshMarquee() {
    try {
      const res = await adminFetch("/api/admin/home/marquee");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setMarquee((data.items ?? []).slice().sort(byOrdre));
    } catch (err) {
      notify("err", `Erreur rafraîchissement marquee : ${humanizeError(err)}`);
    }
  }

  function openNewSlide() {
    setEditingSlide({
      ...EMPTY_SLIDE,
      ordre: slides.length > 0 ? Math.max(...slides.map((s) => s.ordre ?? 0)) + 1 : 0,
    });
  }

  async function toggleSlideActive(row) {
    const nextActif = !row.actif;
    setSlides((cur) =>
      cur.map((s) => (s.id === row.id ? { ...s, actif: nextActif } : s)),
    );
    try {
      const res = await adminFetch("/api/admin/home/editorial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, actif: nextActif }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: "home_slide:toggle",
        ids: [row.id],
      });
    } catch (err) {
      setSlides((cur) =>
        cur.map((s) => (s.id === row.id ? { ...s, actif: row.actif } : s)),
      );
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  async function deleteSlide(row) {
    if (!confirm(`Supprimer la slide « ${row.titre} » ?`)) return;
    /* Optimistic remove. */
    const snapshot = slides;
    setSlides((cur) => cur.filter((s) => s.id !== row.id));
    try {
      const res = await adminFetch("/api/admin/home/editorial", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      }
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: "home_slide:deleted",
        ids: [row.id],
      });
      notify("ok", `« ${row.titre} » supprimé.`);
    } catch (err) {
      setSlides(snapshot);
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  async function saveSlide(form) {
    const isNew = !form.id;
    const payload = { ...form, slug: form.slug || slugifyLocal(form.titre) };
    try {
      let res;
      if (isNew) {
        res = await adminFetch("/api/admin/home/editorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await adminFetch("/api/admin/home/editorial", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      const data = await res.json();
      const saved = data.slide;
      if (isNew) {
        setSlides((cur) => [...cur, saved].sort(byOrdre));
      } else {
        setSlides((cur) =>
          cur.map((s) => (s.id === saved.id ? saved : s)).sort(byOrdre),
        );
      }
      setEditingSlide(null);
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: isNew ? "home_slide:created" : "home_slide:updated",
        ids: saved?.id ? [saved.id] : undefined,
      });
      notify("ok", isNew ? "Slide créée." : "Slide mise à jour.");
    } catch (err) {
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  /* ---------------- Marquee mutations ---------------- */
  async function saveMarqueeItem(idx, patch) {
    const row = marquee[idx];
    if (!row) return;
    const next = { ...row, ...patch };
    setMarquee((cur) => cur.map((m, i) => (i === idx ? next : m)));
    try {
      const res = await adminFetch("/api/admin/home/marquee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...patch }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: "home_marquee:updated",
        ids: [row.id],
      });
    } catch (err) {
      setMarquee((cur) => cur.map((m, i) => (i === idx ? row : m)));
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  async function addMarqueeItem() {
    const label = prompt("Nouveau libellé :");
    if (!label || !label.trim()) return;
    try {
      const res = await adminFetch("/api/admin/home/marquee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          ordre: marquee.length > 0 ? Math.max(...marquee.map((m) => m.ordre ?? 0)) + 1 : 0,
          actif: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      const { item } = await res.json();
      setMarquee((cur) => [...cur, item].sort(byOrdre));
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: "home_marquee:created",
        ids: [item.id],
      });
      notify("ok", "Item ajouté.");
    } catch (err) {
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  async function deleteMarqueeItem(row) {
    if (!confirm(`Supprimer « ${row.label} » ?`)) return;
    const snapshot = marquee;
    setMarquee((cur) => cur.filter((m) => m.id !== row.id));
    try {
      const res = await adminFetch("/api/admin/home/marquee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      }
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, {
        entity: "home_marquee:deleted",
        ids: [row.id],
      });
      notify("ok", "Item supprimé.");
    } catch (err) {
      setMarquee(snapshot);
      notify("err", `Erreur : ${humanizeError(err)}`);
    }
  }

  async function moveMarquee(idx, delta) {
    const target = idx + delta;
    if (target < 0 || target >= marquee.length) return;
    const next = marquee.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    /* Re-index ordre across the whole array so gaps disappear. */
    const reindexed = next.map((m, i) => ({ ...m, ordre: i }));
    setMarquee(reindexed);
    /* Persist via PUT bulk replace (small list, single round-trip). */
    try {
      const res = await adminFetch("/api/admin/home/marquee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reindexed }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      const { items } = await res.json();
      setMarquee((items ?? []).slice().sort(byOrdre));
      publishAdminEvent(ADMIN_EVENT.MEDIAS_UPDATED, { entity: "home_marquee:reordered" });
    } catch (err) {
      notify("err", `Erreur réorganisation : ${humanizeError(err)}`);
      void refreshMarquee();
    }
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="pb-16">
      {/* Tab switcher */}
      <div className="bg-white rounded-3xl shadow-card p-2 inline-flex gap-1 mb-6 border border-black/5">
        {[
          { v: "slides", label: "Slides éditoriales", count: slides.length },
          { v: "marquee", label: "Marquise", count: marquee.length },
          { v: "seo", label: "SEO & Métadonnées", count: null },
        ].map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-2xl text-[13px] font-bold transition flex items-center gap-2 ${
              tab === t.v
                ? "bg-noir text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <span>{t.label}</span>
            {t.count !== null && (
              <span
                className={`text-[11px] px-1.5 rounded-full ${
                  tab === t.v ? "bg-white/20" : "bg-neutral-200"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "slides" && (
        <SlidesPanel
          slides={slides}
          onNew={openNewSlide}
          onEdit={setEditingSlide}
          onToggleActive={toggleSlideActive}
          onDelete={deleteSlide}
        />
      )}

      {tab === "marquee" && (
        <MarqueePanel
          items={marquee}
          onAdd={addMarqueeItem}
          onPatch={saveMarqueeItem}
          onMove={moveMarquee}
          onDelete={deleteMarqueeItem}
        />
      )}

      {tab === "seo" && (
        <SeoPanel notify={notify} />
      )}

      {editingSlide && (
        <SlideEditModal
          slide={editingSlide}
          onCancel={() => setEditingSlide(null)}
          onSave={saveSlide}
        />
      )}

      {toast && (
        <div
          role={toast.type === "err" ? "alert" : "status"}
          aria-live={toast.type === "err" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full font-bold text-[13px] shadow-card ${
            toast.type === "ok" ? "bg-vert text-white" : "bg-rouge text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function byOrdre(a, b) {
  return (a.ordre ?? 0) - (b.ordre ?? 0);
}

/* ================================================================ */
/* Slides panel                                                       */
/* ================================================================ */
function SlidesPanel({ slides, onNew, onEdit, onToggleActive, onDelete }) {
  if (slides.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-8">
        <EmptyState
          title="Aucune slide éditoriale"
          message="Ajoutez une slide pour qu'elle apparaisse dans le carrousel d'accueil entre les promotions vedettes."
          ctaLabel="Nouvelle slide"
          onCta={onNew}
        />
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12.5px] text-neutral-500">
          Slides intercalées dans le PromoHero après les promos « Mise en avant ».
        </p>
        <button
          type="button"
          onClick={onNew}
          className="px-4 py-2 rounded-full bg-vert text-white font-bold text-[13px] hover:bg-vert-dark transition"
        >
          + Nouvelle slide
        </button>
      </div>
      <div className="grid gap-3">
        {slides.map((s) => (
          <article
            key={s.id}
            className={`bg-white rounded-3xl shadow-card border ${
              s.actif ? "border-black/5" : "border-rouge/30 opacity-60"
            } p-4 flex gap-4 items-center`}
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 ring-1 ring-black/5 shrink-0">
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.image_alt ?? ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                  —
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.accent || "#1C6B35" }}
                  aria-hidden="true"
                />
                <p className="text-[10.5px] uppercase tracking-wider font-bold text-neutral-500">
                  {s.eyebrow || "—"}
                </p>
              </div>
              <h3 className="font-soft font-bold text-[16px] leading-tight truncate">{s.titre}</h3>
              <p className="text-[12.5px] text-neutral-500 line-clamp-2 mt-1">{s.description}</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                <code className="font-mono">{s.cta_href || "—"}</code> · ordre {s.ordre}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleActive(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  s.actif
                    ? "bg-vert/15 text-vert-dark hover:bg-vert/25"
                    : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
                }`}
              >
                {s.actif ? "● Active" : "○ Inactive"}
              </button>
              <button
                type="button"
                onClick={() => onEdit(s)}
                className="px-3 py-1 rounded-full bg-noir text-white text-[12px] font-bold hover:bg-noir-soft transition"
              >
                Éditer
              </button>
              <button
                type="button"
                onClick={() => onDelete(s)}
                className="px-3 py-1 rounded-full bg-white border border-rouge/30 text-rouge text-[12px] font-bold hover:bg-rouge hover:text-white transition"
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/* ================================================================ */
/* Slide edit modal                                                   */
/* ================================================================ */
function SlideEditModal({ slide, onCancel, onSave }) {
  const isNew = !slide.id;
  const [form, setForm] = useState(() => ({ ...slide }));
  const [slugTouched, setSlugTouched] = useState(!isNew || !!slide.slug);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "titre" && isNew && !slugTouched) {
        next.slug = slugifyLocal(value);
      }
      return next;
    });
  }

  /* Esc to cancel, Cmd/Ctrl+S to save. */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if ((e.key === "s" || e.key === "S") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!saving) submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [form, saving]);

  async function submit() {
    if (!form.titre.trim()) return;
    if (!form.image.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onCancel}
    >
      <form
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-card w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-black/5 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-soft font-bold text-[18px]">
            {isNew ? "Nouvelle slide éditoriale" : "Éditer la slide"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-neutral-400 hover:text-noir transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 grid gap-4">
          <Field label="Eyebrow (sur-titre)" hint="Ex. : « Programme fidélité »">
            <input
              type="text"
              value={form.eyebrow ?? ""}
              onChange={(e) => set("eyebrow", e.target.value)}
              className="input"
              maxLength={80}
            />
          </Field>

          <Field label="Titre" required>
            <input
              type="text"
              required
              value={form.titre ?? ""}
              onChange={(e) => set("titre", e.target.value)}
              className="input"
              maxLength={120}
            />
          </Field>

          <Field
            label="Slug"
            hint="Identifiant URL-safe. Auto-généré depuis le titre tant que vous ne le modifiez pas."
          >
            <input
              type="text"
              value={form.slug ?? ""}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyLocal(e.target.value));
              }}
              className="input font-mono text-[13px]"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="input min-h-[80px]"
              maxLength={400}
            />
          </Field>

          <InlineImageUpload
            folder="home"
            label="Image"
            hint="Recommandé : 1600×900 px, < 200 Ko après optimisation."
            value={form.image ?? ""}
            onChange={(v) => set("image", v)}
            renameTo={form.slug || slugifyLocal(form.titre || "slide")}
          />

          <Field label="Texte alternatif de l'image">
            <input
              type="text"
              value={form.image_alt ?? ""}
              onChange={(e) => set("image_alt", e.target.value)}
              className="input"
              maxLength={150}
            />
          </Field>

          <InlineImageUpload
            folder="home"
            label="Fichier Vidéo (Optionnel)"
            hint="Si spécifié, cette slide s'affiche sous forme de vidéo dans le split-screen PromoHero. Uploadé sur Cloudinary."
            value={form.video_url ?? ""}
            onChange={(v) => set("video_url", v)}
            renameTo={(form.slug || slugifyLocal(form.titre || "slide")) + "-video"}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Libellé du bouton">
              <input
                type="text"
                value={form.cta_label ?? ""}
                onChange={(e) => set("cta_label", e.target.value)}
                className="input"
                maxLength={40}
              />
            </Field>
            <Field label="Lien du bouton" hint="Chemin interne (/fidelite) ou URL absolue.">
              <input
                type="text"
                value={form.cta_href ?? ""}
                onChange={(e) => set("cta_href", e.target.value)}
                className="input font-mono text-[13px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Couleur d'accent" hint="Hexadécimal — overlay tint du slide.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent || "#1C6B35"}
                  onChange={(e) => set("accent", e.target.value)}
                  className="h-9 w-14 rounded cursor-pointer border border-black/10"
                />
                <input
                  type="text"
                  value={form.accent || ""}
                  onChange={(e) => set("accent", e.target.value)}
                  className="input flex-1 font-mono text-[13px]"
                  pattern="^#[0-9A-Fa-f]{3,8}$"
                  placeholder="#1C6B35"
                />
              </div>
            </Field>
            <Field label="Ordre" hint="Petit = en premier.">
              <input
                type="number"
                value={form.ordre ?? 0}
                onChange={(e) => set("ordre", Number(e.target.value) || 0)}
                className="input w-24"
              />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={!!form.actif}
              onChange={(e) => set("actif", e.target.checked)}
              className="w-4 h-4 rounded accent-vert"
            />
            <span>Active (visible sur le site)</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/5 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-full bg-white border-2 border-black/10 font-bold text-[13px] hover:border-noir transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !form.titre.trim() || !form.image.trim()}
            className="flex-1 px-5 py-2 rounded-full bg-vert text-white font-bold text-[13px] hover:bg-vert-dark transition disabled:opacity-50"
            title="Cmd/Ctrl + S"
          >
            {saving ? "Enregistrement…" : isNew ? "Créer la slide" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================================================================ */
/* Marquee panel                                                      */
/* ================================================================ */
function MarqueePanel({ items, onAdd, onPatch, onMove, onDelete }) {
  const [editing, setEditing] = useState({});

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-8">
        <EmptyState
          title="Aucun item dans la marquise"
          message="Ajoutez quelques mots-clés (« Saveurs du monde », « Arrivages quotidiens »…) pour le marquee défilant après les rayons."
          ctaLabel="Ajouter un item"
          onCta={onAdd}
        />
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12.5px] text-neutral-500">
          Items du marquee défilant entre la grille des rayons et les actus.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2 rounded-full bg-vert text-white font-bold text-[13px] hover:bg-vert-dark transition"
        >
          + Ajouter
        </button>
      </div>
      <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-black/5">
        <ul className="divide-y divide-black/5">
          {items.map((item, idx) => {
            const draft = editing[item.id];
            const value = draft != null ? draft : item.label;
            const dirty = draft != null && draft !== item.label;
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMove(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-5 rounded text-[14px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition"
                    aria-label="Monter"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(idx, +1)}
                    disabled={idx === items.length - 1}
                    className="w-7 h-5 rounded text-[14px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition"
                    aria-label="Descendre"
                  >
                    ▼
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono w-6 shrink-0 text-right">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    setEditing((cur) => ({ ...cur, [item.id]: e.target.value }))
                  }
                  onBlur={() => {
                    if (dirty) {
                      onPatch(idx, { label: value });
                    }
                    setEditing((cur) => {
                      const next = { ...cur };
                      delete next[item.id];
                      return next;
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setEditing((cur) => {
                        const next = { ...cur };
                        delete next[item.id];
                        return next;
                      });
                    }
                  }}
                  className="input flex-1"
                  maxLength={80}
                />
                <button
                  type="button"
                  onClick={() => onPatch(idx, { actif: !item.actif })}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition shrink-0 ${
                    item.actif
                      ? "bg-vert/15 text-vert-dark hover:bg-vert/25"
                      : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
                  }`}
                >
                  {item.actif ? "● Actif" : "○ Masqué"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="px-2 py-1 rounded-full bg-white border border-rouge/30 text-rouge text-[12px] font-bold hover:bg-rouge hover:text-white transition shrink-0"
                  aria-label={`Supprimer ${item.label}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/* ================================================================ */
/* Reusable Field shell                                               */
/* ================================================================ */
function Field({ label, hint, required, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-neutral-700">
        {label} {required && <span className="text-rouge">*</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-neutral-400">{hint}</span>}
    </label>
  );
}

/* ================================================================ */
/* SEO / Metadata panel                                              */
/* ================================================================ */
function SeoPanel({ notify }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminFetch("/api/admin/settings");
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || res.statusText);
        }
        const data = await res.json();
        setSettings(data.settings ?? []);
      } catch (err) {
        setDbError(err.message || String(err));
        notify("err", `Erreur chargement des paramètres SEO : ${humanizeError(err)}`);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [notify]);

  const seoTitle = settings.find((s) => s.key === "home_seo_title")?.value ?? "";
  const seoDesc = settings.find((s) => s.key === "home_seo_description")?.value ?? "";
  const seoImage = settings.find((s) => s.key === "home_seo_og_image")?.value ?? "";

  async function updateSetting(key, val) {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: val }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || res.statusText);
      }
      const data = await res.json();
      setSettings((cur) =>
        cur.map((s) => (s.key === key ? data.setting : s))
      );
      notify("ok", "Configuration SEO mise à jour.");
    } catch (err) {
      notify("err", `Erreur de sauvegarde SEO : ${humanizeError(err)}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-400 italic text-[13px] py-8">Chargement de la configuration SEO...</div>;
  }

  if (dbError) {
    const isMissingTable = dbError.includes("site_settings") || dbError.includes("does not exist") || dbError.includes("relation");
    return (
      <div className="bg-rouge/5 border border-rouge/20 text-rouge rounded-3xl p-6 border-dashed flex flex-col gap-3">
        <h3 className="font-bold text-[15px]">⚠️ Configuration SEO non disponible</h3>
        <p className="text-[13px] text-neutral-600 leading-relaxed">
          {isMissingTable ? (
            <>
              La table <code className="bg-rouge/5 px-1 py-0.5 rounded font-mono font-bold text-rouge">public.site_settings</code> est absente de la base de données.
              Pour activer la configuration dynamique de l'accueil, veuillez appliquer la migration{" "}
              <code className="bg-rouge/5 px-1 py-0.5 rounded font-mono font-bold text-rouge">supabase/migrations/007_add_site_settings.sql</code> dans l'éditeur SQL de votre Supabase Studio.
            </>
          ) : (
            `Impossible de charger les paramètres SEO : ${dbError}`
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-card p-6 border border-black/5 flex flex-col gap-6">
      <div>
        <h2 className="text-[16px] font-bold text-neutral-900">Métadonnées de la page d'accueil</h2>
        <p className="text-[12.5px] text-neutral-500 mt-1">
          Ajustez en temps réel le titre, la description de recherche et l'image de partage Open Graph (Facebook, WhatsApp, LinkedIn, X).
        </p>
      </div>

      <Field label="Titre de la page (Title tag)" required hint="Recommandé : entre 50 et 60 caractères.">
        <input
          type="text"
          className="input font-bold"
          value={seoTitle}
          onChange={(e) => {
            const val = e.target.value;
            setSettings((cur) => cur.map((s) => (s.key === "home_seo_title" ? { ...s, value: val } : s)));
          }}
          onBlur={() => updateSetting("home_seo_title", seoTitle)}
          maxLength={150}
          disabled={saving}
        />
      </Field>

      <Field label="Meta Description" required hint="Recommandé : entre 150 et 160 caractères.">
        <textarea
          rows={3}
          className="input min-h-[80px]"
          value={seoDesc}
          onChange={(e) => {
            const val = e.target.value;
            setSettings((cur) => cur.map((s) => (s.key === "home_seo_description" ? { ...s, value: val } : s)));
          }}
          onBlur={() => updateSetting("home_seo_description", seoDesc)}
          maxLength={300}
          disabled={saving}
        />
      </Field>

      <InlineImageUpload
        folder="logos"
        label="Image de partage social (Open Graph)"
        hint="Image affichée sur les réseaux lors du partage du site. Recommandé : 1200×630 px."
        value={seoImage}
        onChange={(val) => {
          setSettings((cur) => cur.map((s) => (s.key === "home_seo_og_image" ? { ...s, value: val } : s)));
          void updateSetting("home_seo_og_image", val);
        }}
        renameTo="home-og-share"
        disabled={saving}
      />
    </div>
  );
}

