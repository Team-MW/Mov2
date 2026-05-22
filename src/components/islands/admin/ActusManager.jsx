import { useEffect, useMemo, useRef, useState } from "react";
import InlineImageUpload from "./InlineImageUpload.jsx";
import SortableHeader from "./SortableHeader.jsx";
import FilterChip from "./FilterChip.jsx";
import EmptyState from "./EmptyState.jsx";
import { adminFetch } from "./adminFetch.js";
import { useAdminListState, compareRows } from "./useAdminListState.js";

const EMPTY_ACTU = {
  id: null,
  slug: "",
  type: "article",
  titre: "",
  resume: "",
  image: "",
  image_alt: "",
  rayon: "",
  date: "",
  href: "",
  badge_label: "",
  actif: true,
  contenu: "",
  auteur: "L'équipe Marché de Mo'",
};

const ACTU_TYPES = [
  { slug: "article", nom: "Actualité / Blog" },
  { slug: "recette", nom: "Recette" },
  { slug: "arrivage", nom: "Arrivage" },
  { slug: "nouveaute", nom: "Nouveauté" },
  { slug: "evenement", nom: "Événement" },
];

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

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const PREVIEW_CATEGORIES = {
  promos: { label: "Promos", color: "#8B1919", bg: "#FCE7E7" },
  nouveautes: { label: "Nouveautés", color: "#1C6B35", bg: "#E5F3EB" },
  recettes: { label: "Recettes", color: "#A68332", bg: "#FAF4E4" },
  engagements: { label: "Engagements", color: "#2563EB", bg: "#E3EBFB" },
  evenements: { label: "Événements", color: "#7D4500", bg: "#F5E9D4" },
  article: { label: "Actualité", color: "#1C6B35", bg: "#E5F3EB" },
  recette: { label: "Recette", color: "#A68332", bg: "#FAF4E4" },
  arrivage: { label: "Arrivage", color: "#8B1919", bg: "#FCE7E7" },
  nouveaute: { label: "Nouveauté", color: "#1C6B35", bg: "#E5F3EB" },
  evenement: { label: "Événement", color: "#7D4500", bg: "#F5E9D4" },
};

function renderMarkdown(text) {
  if (!text) return "";
  
  // Basic markdown parser
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // Handle headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Handle blockquotes
  html = html.replace(/^\s*&gt;\s*(.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Handle bullet lists
  let lines = html.split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.substring(2);
      if (!inList) {
        lines[i] = '<ul><li>' + content + '</li>';
        inList = true;
      } else {
        lines[i] = '<li>' + content + '</li>';
      }
    } else {
      if (inList) {
        lines[i - 1] = lines[i - 1] + '</ul>';
        inList = false;
      }
    }
  }
  if (inList) {
    lines[lines.length - 1] = lines[lines.length - 1] + '</ul>';
  }
  html = lines.join('\n');
  
  // Handle paragraphs
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<blockquote')) {
      return block;
    }
    return '<p>' + block + '</p>';
  }).join('\n');
  
  // Inline formatting
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Single newlines
  html = html.replace(/\n/g, '<br />');
  
  return html;
}

export default function ActusManager({ initialActus, rayonsOptions }) {
  const [actus, setActus] = useState(initialActus ?? []);
  const [editing, setEditing] = useState(null); // null | EMPTY_ACTU | existing actu row
  const [toast, setToast] = useState(null); // { type: 'ok' | 'err', msg }
  const [pendingDelete, setPendingDelete] = useState(null); // id of row about to be deleted
  const [formTab, setFormTab] = useState("form"); // "form" | "preview"
  const searchInputRef = useRef(null);

  const TYPE_LABELS = useMemo(() => {
    const m = new Map();
    ACTU_TYPES.forEach((t) => m.set(t.slug, t.nom));
    return (slug) => m.get(slug) ?? slug;
  }, []);

  const RAYON_LABELS = useMemo(() => {
    const m = new Map();
    rayonsOptions.forEach((r) => m.set(r.slug, r.nom));
    return (slug) => m.get(slug) ?? slug;
  }, [rayonsOptions]);

  // Filters + sorting URL state
  const STATUT_OPTS = ["all", "active", "inactive"];
  const TYPE_OPTS = ["all", ...ACTU_TYPES.map((t) => t.slug)];
  const SORT_OPTS = ["date", "titre", "type", "rayon", "actif"];

  const { state: listState, set: setFilter, reset: resetFilter, activeCount } = useAdminListState({
    defaults: { q: "", type: "all", rayon: "", statut: "all", sort: "date", dir: "desc" },
    allowed: { statut: STATUT_OPTS, type: TYPE_OPTS, dir: ["asc", "desc"], sort: SORT_OPTS },
    storageKey: "admin.actus.list",
  });

  const filter = listState;
  const sort = useMemo(() => ({ field: listState.sort, dir: listState.dir }), [listState.sort, listState.dir]);

  function setSort(field, dir) {
    setFilter({ sort: field, dir });
  }

  const filtered = useMemo(() => {
    const base = actus.filter((a) => {
      if (filter.type !== "all" && a.type !== filter.type) return false;
      if (filter.rayon && a.rayon !== filter.rayon) return false;
      if (filter.statut === "active" && !a.actif) return false;
      if (filter.statut === "inactive" && a.actif) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        const hay = `${a.titre} ${a.slug} ${a.resume ?? ""} ${a.badge_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort.field) {
      base.sort((a, b) => compareRows(a, b, sort.field, sort.dir));
    }
    return base;
  }, [actus, filter, sort]);

  function notify(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3800);
  }

  // Quick toggling of the active state
  async function toggleActuActive(row) {
    const nextActif = !row.actif;
    // Optimistic UI update
    setActus((cur) => cur.map((item) => (item.id === row.id ? { ...item, actif: nextActif } : item)));

    try {
      const res = await adminFetch(`/api/admin/actus/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: nextActif }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      notify("ok", `Actualité ${nextActif ? "activée" : "masquée"} avec succès.`);
    } catch (e) {
      // Revert optimistic change
      setActus((cur) => cur.map((item) => (item.id === row.id ? { ...item, actif: row.actif } : item)));
      notify("err", `Erreur : ${e.message}`);
    }
  }

  // Save changes (Create or Edit)
  async function handleSave(e) {
    e.preventDefault();
    if (!editing) return;

    if (!editing.titre.trim()) return notify("err", "Le titre est obligatoire.");
    if (!editing.slug.trim()) return notify("err", "Le slug est obligatoire.");
    if (!editing.image.trim()) return notify("err", "L'image est obligatoire.");

    const isNew = !editing.id;
    const url = isNew ? "/api/admin/actus" : `/api/admin/actus/${editing.id}`;
    const method = isNew ? "POST" : "PATCH";

    // Format fields for API
    const payload = {
      ...editing,
      rayon: editing.rayon || null,
      badge_label: editing.badge_label || null,
      date: editing.date ? new Date(editing.date).toISOString() : new Date().toISOString(),
    };

    try {
      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);

      const saved = data.actu;
      if (isNew) {
        setActus((cur) => [saved, ...cur]);
        notify("ok", "Actualité créée avec succès !");
      } else {
        setActus((cur) => cur.map((item) => (item.id === saved.id ? saved : item)));
        notify("ok", "Actualité modifiée avec succès !");
      }
      setEditing(null);
    } catch (err) {
      notify("err", `Erreur d'enregistrement : ${err.message}`);
    }
  }

  // Handle deletion
  async function handleDelete(id) {
    try {
      const res = await adminFetch(`/api/admin/actus/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setActus((cur) => cur.filter((item) => item.id !== id));
      notify("ok", "Actualité supprimée avec succès.");
      setPendingDelete(null);
    } catch (e) {
      notify("err", `Erreur de suppression : ${e.message}`);
    }
  }

  // Auto-slug generation helper
  function handleSuggestSlug() {
    if (!editing) return;
    setEditing((cur) => ({
      ...cur,
      slug: slugifyLocal(cur.titre),
    }));
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl transition-all border",
            toast.type === "ok"
              ? "bg-vert/10 border-vert/30 text-vert-dark"
              : "bg-rouge/10 border-rouge/30 text-rouge",
          ].join(" ")}
          role="alert"
        >
          <span className="text-[14px] font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-neutral-50 p-4 rounded-3xl border border-neutral-100">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={filter.q}
              onChange={(e) => setFilter("q", e.target.value)}
              className="w-full bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-full py-2.5 pl-10 pr-4 text-[13px] outline-none"
              placeholder="Rechercher par titre, résumé..."
            />
            <svg
              className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {filter.q && (
              <button
                onClick={() => setFilter("q", "")}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 text-[12px] font-bold"
              >
                Vider
              </button>
            )}
          </div>

          {/* Filters trigger or selection */}
          <div className="flex flex-wrap gap-2">
            {/* Filter by Type */}
            <select
              value={filter.type}
              onChange={(e) => setFilter("type", e.target.value)}
              className="bg-white border border-black/10 rounded-full py-2.5 px-4 text-[13px] font-medium outline-none focus:border-noir transition"
            >
              <option value="all">Tous les types</option>
              {ACTU_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.nom}
                </option>
              ))}
            </select>

            {/* Filter by Rayon */}
            <select
              value={filter.rayon}
              onChange={(e) => setFilter("rayon", e.target.value)}
              className="bg-white border border-black/10 rounded-full py-2.5 px-4 text-[13px] font-medium outline-none focus:border-noir transition"
            >
              <option value="">Tous les rayons</option>
              {rayonsOptions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.nom}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={filter.statut}
              onChange={(e) => setFilter("statut", e.target.value)}
              className="bg-white border border-black/10 rounded-full py-2.5 px-4 text-[13px] font-medium outline-none focus:border-noir transition"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Masqué</option>
            </select>

            {activeCount > 0 && (
              <button
                onClick={resetFilter}
                className="text-[12px] font-bold text-neutral-500 hover:text-noir px-2 transition"
              >
                Réinitialiser ({activeCount})
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            const defaultDate = new Date();
            // Local timezone iso-like datetime format for datetime-local inputs
            const tzOffset = defaultDate.getTimezoneOffset() * 60000;
            const localISOTime = new Date(defaultDate.getTime() - tzOffset).toISOString().slice(0, 16);
            setEditing({ ...EMPTY_ACTU, date: localISOTime });
            setFormTab("form");
          }}
          className="px-5 py-2.5 rounded-full bg-vert text-white text-[13px] font-bold hover:bg-vert-dark transition shadow-md hover:shadow-lg flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5v14" />
          </svg>
          Nouvelle actualité
        </button>
      </div>

      {/* Main Table View */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune actualité trouvée"
          desc="Essayez de modifier vos filtres ou créez une nouvelle actualité."
          onClear={activeCount > 0 ? resetFilter : null}
        />
      ) : (
        <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-bold">
                  <th className="p-4 w-20">Image</th>
                  <th className="p-4">
                    <SortableHeader
                      label="Titre"
                      field="titre"
                      currentField={sort.field}
                      currentDir={sort.dir}
                      onSort={setSort}
                    />
                  </th>
                  <th className="p-4">
                    <SortableHeader
                      label="Type"
                      field="type"
                      currentField={sort.field}
                      currentDir={sort.dir}
                      onSort={setSort}
                    />
                  </th>
                  <th className="p-4">
                    <SortableHeader
                      label="Rayon"
                      field="rayon"
                      currentField={sort.field}
                      currentDir={sort.dir}
                      onSort={setSort}
                    />
                  </th>
                  <th className="p-4">
                    <SortableHeader
                      label="Date"
                      field="date"
                      currentField={sort.field}
                      currentDir={sort.dir}
                      onSort={setSort}
                    />
                  </th>
                  <th className="p-4 text-center">
                    <SortableHeader
                      label="Actif"
                      field="actif"
                      currentField={sort.field}
                      currentDir={sort.dir}
                      onSort={setSort}
                    />
                  </th>
                  <th className="p-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((actu) => (
                  <tr key={actu.id || actu.slug} className="hover:bg-neutral-50/50 group transition">
                    <td className="p-4">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden border border-black/5">
                        {actu.image ? (
                          <img src={actu.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 font-bold">
                            N/A
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-noir truncate" title={actu.titre}>
                        {actu.titre}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate font-mono">
                        {actu.slug}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-neutral-100 font-medium text-neutral-600 text-[11px]">
                        {TYPE_LABELS(actu.type)}
                      </span>
                    </td>
                    <td className="p-4">
                      {actu.rayon ? (
                        <span className="px-2.5 py-1 rounded-full bg-vert-light/35 text-vert-dark font-medium text-[11px]">
                          {RAYON_LABELS(actu.rayon)}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-600 font-medium">
                      {fmtDate(actu.date)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActuActive(actu)}
                        className={[
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-vert/20",
                          actu.actif ? "bg-vert" : "bg-neutral-200",
                        ].join(" ")}
                        role="switch"
                        aria-checked={actu.actif}
                      >
                        <span
                          className={[
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            actu.actif ? "translate-x-4" : "translate-x-0",
                          ].join(" ")}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => {
                            // Convert Date from DB to ISO string suited for input type="datetime-local" (YYYY-MM-DDThh:mm)
                            const dateObj = new Date(actu.date);
                            const tzOffset = dateObj.getTimezoneOffset() * 60000;
                            const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
                            setEditing({
                              ...actu,
                              rayon: actu.rayon || "",
                              date: localISOTime,
                              badge_label: actu.badge_label || "",
                              resume: actu.resume || "",
                              image_alt: actu.image_alt || "",
                              href: actu.href || "",
                              contenu: actu.contenu || "",
                              auteur: actu.auteur || "L'équipe Marché de Mo'",
                            });
                            setFormTab("form");
                          }}
                          className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-noir transition"
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setPendingDelete(actu.id)}
                          className="p-1.5 rounded-full hover:bg-rouge/10 text-neutral-400 hover:text-rouge transition"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Drawer/Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-slide-in relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="text-[16px] font-bold text-noir">
                {editing.id ? "Modifier l'actualité" : "Nouvelle actualité"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-noir transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs switcher */}
            <div className="flex border-b border-neutral-100 bg-neutral-50 px-6">
              <button
                type="button"
                onClick={() => setFormTab("form")}
                className={`py-3 px-5 text-[13px] font-bold border-b-2 transition-all ${
                  formTab === "form"
                    ? "border-vert text-vert"
                    : "border-transparent text-neutral-500 hover:text-noir"
                }`}
              >
                Édition de l'article
              </button>
              <button
                type="button"
                onClick={() => setFormTab("preview")}
                className={`py-3 px-5 text-[13px] font-bold border-b-2 transition-all ${
                  formTab === "preview"
                    ? "border-vert text-vert"
                    : "border-transparent text-neutral-500 hover:text-noir"
                }`}
              >
                Aperçu Visuel
              </button>
            </div>

            {formTab === "form" ? (
              /* Form Pane */
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Titre */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Titre
                    </label>
                    <input
                      type="text"
                      required
                      value={editing.titre}
                      onChange={(e) => setEditing((cur) => ({ ...cur, titre: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                      placeholder="Ex : Arrivage de Dattes Medjool"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                        Slug
                      </label>
                      <button
                        type="button"
                        onClick={handleSuggestSlug}
                        className="text-[11px] font-bold text-vert hover:text-vert-dark transition"
                      >
                        Générer depuis le titre
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={editing.slug}
                      onChange={(e) => setEditing((cur) => ({ ...cur, slug: e.target.value.toLowerCase() }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none font-mono"
                      placeholder="dattes-medjool-arrivage"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Type
                    </label>
                    <select
                      value={editing.type}
                      onChange={(e) => setEditing((cur) => ({ ...cur, type: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                    >
                      {ACTU_TYPES.map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rayon */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Rayon associé (Optionnel)
                    </label>
                    <select
                      value={editing.rayon}
                      onChange={(e) => setEditing((cur) => ({ ...cur, rayon: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                    >
                      <option value="">Aucun rayon</option>
                      {rayonsOptions.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Date de publication
                    </label>
                    <input
                      type="datetime-local"
                      value={editing.date}
                      onChange={(e) => setEditing((cur) => ({ ...cur, date: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                    />
                  </div>

                  {/* Auteur */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Auteur
                    </label>
                    <input
                      type="text"
                      value={editing.auteur}
                      onChange={(e) => setEditing((cur) => ({ ...cur, auteur: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                      placeholder="Ex : L'équipe Marché de Mo'"
                    />
                  </div>

                  {/* Custom Badge override */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Badge personnalisé (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={editing.badge_label}
                      onChange={(e) => setEditing((cur) => ({ ...cur, badge_label: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                      placeholder="Ex : Exclu Web"
                    />
                  </div>

                  {/* Href link */}
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                      Lien redirection (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={editing.href}
                      onChange={(e) => setEditing((cur) => ({ ...cur, href: e.target.value }))}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                      placeholder="Ex : /rayons/fruits-legumes"
                    />
                  </div>
                </div>

                {/* Résumé */}
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                    Résumé / Description courte
                  </label>
                  <textarea
                    value={editing.resume}
                    onChange={(e) => setEditing((cur) => ({ ...cur, resume: e.target.value }))}
                    rows="3"
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none resize-y"
                    placeholder="Courte description d'accroche..."
                  />
                </div>

                {/* Contenu (Corps de l'article) */}
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Corps de l'article (Markdown)</span>
                    <span className="text-[10px] text-neutral-400 normal-case font-normal">
                      Supporte : #, ##, ###, **, *, [liens](url), listes (-)
                    </span>
                  </label>
                  <textarea
                    value={editing.contenu}
                    onChange={(e) => setEditing((cur) => ({ ...cur, contenu: e.target.value }))}
                    rows="10"
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none resize-y font-mono"
                    placeholder="Écrivez le corps de l'article en Markdown ici..."
                  />
                </div>

                {/* Image upload */}
                <div className="border border-neutral-100 rounded-3xl p-4 bg-neutral-50/30">
                  <InlineImageUpload
                    folder="actus"
                    value={editing.image}
                    onChange={(url) => setEditing((cur) => ({ ...cur, image: url }))}
                    renameTo={editing.slug}
                    label="Image d'illustration"
                    hint="Sélectionnez une image d'illustration. Recommandé : format rectangulaire."
                  />
                </div>

                {/* Image Alt */}
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-neutral-500 uppercase tracking-wider">
                    Texte alternatif de l'image (Accessibilité)
                  </label>
                  <input
                    type="text"
                    value={editing.image_alt}
                    onChange={(e) => setEditing((cur) => ({ ...cur, image_alt: e.target.value }))}
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-black/10 hover:border-black/20 focus:border-noir focus:ring-1 focus:ring-noir transition rounded-2xl py-2.5 px-4 text-[13px] outline-none"
                    placeholder="Ex : Cagette de dattes fraîches"
                  />
                </div>

                {/* Actif Checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="actu-actif"
                    checked={editing.actif}
                    onChange={(e) => setEditing((cur) => ({ ...cur, actif: e.target.checked }))}
                    className="w-4 h-4 rounded text-vert focus:ring-vert border-black/15 transition cursor-pointer"
                  />
                  <label htmlFor="actu-actif" className="text-[13px] font-bold text-noir select-none cursor-pointer">
                    Activer immédiatement (visible sur le site)
                  </label>
                </div>
              </form>
            ) : (
              /* Preview Pane */
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-[#FFFFFF]">
                <style dangerouslySetInnerHTML={{ __html: `
                  .preview-prose h2 {
                    font-family: system-ui, -apple-system, sans-serif;
                    font-weight: 700;
                    font-size: 24px;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    color: #0A0A0A;
                    position: relative;
                    padding-left: 1rem;
                  }
                  .preview-prose h2::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0.4rem;
                    bottom: 0.4rem;
                    width: 4px;
                    background: #1C6B35;
                    border-radius: 2px;
                  }
                  .preview-prose h3 {
                    font-weight: 700;
                    font-size: 18px;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                    color: #0A0A0A;
                  }
                  .preview-prose p {
                    font-size: 15px;
                    line-height: 1.7;
                    color: rgb(64, 64, 64);
                    margin: 0.8rem 0;
                  }
                  .preview-prose ul {
                    margin: 0.75rem 0 1rem 1.25rem;
                    list-style-type: disc;
                  }
                  .preview-prose li {
                    font-size: 15px;
                    line-height: 1.7;
                    margin: 0.3rem 0;
                    color: rgb(64, 64, 64);
                  }
                  .preview-prose strong {
                    color: #0A0A0A;
                    font-weight: 700;
                  }
                  .preview-prose a {
                    color: #1C6B35;
                    text-decoration: underline;
                    text-underline-offset: 3px;
                  }
                  .preview-prose blockquote {
                    margin: 1.25rem 0;
                    padding: 0.75rem 1rem;
                    border-left: 3px solid #1C6B35;
                    background: #F6F2EB;
                    border-radius: 0 0.5rem 0.5rem 0;
                    font-style: italic;
                    color: #3A3A3A;
                  }
                `}} />

                {/* Metadata Line */}
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: (PREVIEW_CATEGORIES[editing.type] || PREVIEW_CATEGORIES.article).color,
                      backgroundColor: (PREVIEW_CATEGORIES[editing.type] || PREVIEW_CATEGORIES.article).bg
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: (PREVIEW_CATEGORIES[editing.type] || PREVIEW_CATEGORIES.article).color }}
                    ></span>
                    {editing.badge_label || (PREVIEW_CATEGORIES[editing.type] || PREVIEW_CATEGORIES.article).label}
                  </span>
                  <span className="text-[12px] text-neutral-500">
                    {Math.max(1, Math.round((editing.contenu || "").split(/\s+/).filter(Boolean).length / 230))} min de lecture
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-soft font-bold text-[28px] md:text-[36px] text-neutral-900 leading-tight">
                  {editing.titre || "Titre de l'actualité"}
                </h1>

                {/* Auteur and Date */}
                <div className="flex items-center gap-4 text-[13px] text-neutral-500">
                  <span>{editing.auteur || "L'équipe Marché de Mo'"}</span>
                  <span>·</span>
                  <span>{fmtDate(editing.date || new Date().toISOString())}</span>
                </div>

                {/* Image */}
                {editing.image && (
                  <div className="aspect-[16/9] md:aspect-[2/1] rounded-3xl overflow-hidden shadow-sm bg-neutral-100">
                    <img
                      src={editing.image}
                      alt={editing.image_alt || editing.titre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Resume block */}
                {editing.resume && (
                  <p className="font-soft text-[18px] md:text-[21px] leading-relaxed text-neutral-800 font-medium border-l-4 border-vert pl-4 italic bg-neutral-50/50 py-3 pr-4 rounded-r-2xl">
                    {editing.resume}
                  </p>
                )}

                {/* Contenu Markdown */}
                <div
                  className="preview-prose mt-6"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editing.contenu) }}
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-full border border-black/10 hover:border-noir hover:bg-neutral-100 text-[13px] font-bold text-neutral-600 hover:text-noir transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-full bg-vert hover:bg-vert-dark text-white text-[13px] font-bold transition shadow-md hover:shadow-lg"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-[16px] font-bold text-noir">Supprimer cette actualité ?</h3>
            <p className="text-[13px] text-neutral-500 leading-normal">
              Cette action est irréversible. L'actualité sera définitivement retirée de Supabase et n'apparaîtra plus sur le site.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-full border border-black/10 text-[12px] font-bold text-neutral-600 hover:text-noir transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(pendingDelete)}
                className="px-4 py-2 rounded-full bg-rouge text-white text-[12px] font-bold hover:bg-rouge-soft transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
