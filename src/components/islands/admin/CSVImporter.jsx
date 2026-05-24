import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "./adminFetch.js";
import { publishAdminEvent, ADMIN_EVENT } from "./admin-bus.js";

const ALLOWED_RAYONS = [
  "boucherie-halal",
  "fruits-legumes",
  "epices-du-monde",
  "saveurs-afrique",
  "saveurs-asie",
  "saveur-mediterranee",
  "saveur-sud-amer",
  "balkans-turques",
  "produits-courants",
  "surgeles",
  "boulangerie",
  "produits-laitiers",
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

function norm(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v === "number" && isNaN(v)) return null;
  return v;
}

export default function CSVImporter({ rayonsOptions }) {
  const [existingProduits, setExistingProduits] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // CSV file parsing & diff analysis
  const [papa, setPapa] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState([]); // Raw parsed objects
  const [analysis, setAnalysis] = useState({
    inserts: [],
    updates: [],
    unchanged: [],
    invalid: [],
  });
  
  // Active step & tab preview
  const [activeTab, setActiveTab] = useState("inserts"); // inserts | updates | unchanged | invalid
  const [toast, setToast] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] });
  const [importFinished, setImportFinished] = useState(false);

  const fileInputRef = useRef(null);

  const RAYON_LABELS = useMemo(() => {
    const m = new Map();
    rayonsOptions.forEach((r) => m.set(r.slug, r.nom));
    return (slug) => m.get(slug) ?? slug;
  }, [rayonsOptions]);

  // Load existing products on mount
  useEffect(() => {
    async function fetchDb() {
      try {
        const res = await adminFetch("/api/admin/produits");
        if (!res.ok) {
          throw new Error(`Erreur lors du chargement du catalogue : ${res.statusText}`);
        }
        const data = await res.json();
        setExistingProduits(data.produits ?? []);
      } catch (err) {
        setDbError(err.message);
      } finally {
        setLoadingDb(false);
      }
    }

    fetchDb();

    // Dynamically load Papa Parse ESM from CDN
    import("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm")
      .then((m) => setPapa(m.default))
      .catch((err) => console.error("Échec du chargement de Papa Parse", err));
  }, []);

  function notify(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // Normalize column headers
  function mapHeaders(headers) {
    const mapping = {
      nom: ["nom", "name", "title", "titre", "designation", "produit"],
      slug: ["slug", "id", "identifiant"],
      description: ["description", "desc", "details", "detail"],
      image_url: ["image_url", "image", "imageurl", "photo", "url_image", "url"],
      prix_indicatif: ["prix_indicatif", "prixindicatif", "prix", "prix_vente", "tarif"],
      unite: ["unite", "unit", "conditionnement", "mesure"],
      rayon: ["rayon", "rayon_slug", "rayon-slug", "department", "rayonslug"],
      categorie: ["categorie", "category", "catégorie"],
      sous_categorie: ["sous_categorie", "souscategorie", "subcategory", "sous_category", "sous-categorie"],
      origine: ["origine", "origin", "pays"],
      badge: ["badge", "label", "tag", "etoile"],
      actif: ["actif", "active", "publie", "publié"],
      ordre: ["ordre", "order", "tri", "position"],
    };

    const headerMap = {};
    headers.forEach((h, index) => {
      const normalized = h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .trim();

      let found = false;
      for (const [field, aliases] of Object.entries(mapping)) {
        if (normalized === field || aliases.includes(normalized) || aliases.includes(h.toLowerCase().trim())) {
          headerMap[field] = index;
          found = true;
          break;
        }
      }
      if (!found) {
        headerMap[normalized] = index;
      }
    });

    return headerMap;
  }

  // Main file parsing
  function parseCSV(file) {
    if (!papa) {
      notify("err", "L'outil de lecture CSV n'est pas encore prêt. Veuillez patienter.");
      return;
    }

    setFileName(file.name);
    papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      // Support both comma (EN) and semicolon (FR) delimiters
      delimiter: "",
      // Strip UTF-8 BOM if present
      skipLinesWithEmptyValues: false,
      complete: (results) => {
        if (results.data.length < 2) {
          notify("err", "Le fichier CSV doit contenir une ligne d'en-têtes et au moins une ligne de données.");
          return;
        }

        // Strip UTF-8 BOM from first header if present
        const headers = results.data[0];
        if (headers[0] && typeof headers[0] === 'string' && headers[0].startsWith('\uFEFF')) {
          headers[0] = headers[0].replace(/^\uFEFF/, '');
        }

        const headerMap = mapHeaders(headers);
        
        // Ensure minimal fields are present (nom and rayon or we need to try mapping)
        if (headerMap.nom === undefined) {
          notify("err", "Impossible de trouver une colonne pour le Nom du produit (ex: 'nom', 'titre', 'designation').");
          return;
        }

        const rows = results.data.slice(1).map((rowArr, rowIndex) => {
          const rawItem = {};
          Object.keys(headerMap).forEach((field) => {
            const index = headerMap[field];
            rawItem[field] = rowArr[index] !== undefined ? String(rowArr[index]).trim() : "";
          });
          return { raw: rawItem, lineIndex: rowIndex + 2 };
        });

        setParsedRows(rows);
        analyzeDiff(rows);
      },
      error: (error) => {
        notify("err", `Erreur lors de la lecture du fichier : ${error.message}`);
      }
    });
  }

  // Differential Sync logic
  function analyzeDiff(rows) {
    const dbMap = new Map(existingProduits.map((p) => [p.slug, p]));
    
    const inserts = [];
    const updates = [];
    const unchanged = [];
    const invalid = [];

    rows.forEach(({ raw, lineIndex }) => {
      const errors = [];
      const nom = raw.nom || "";
      let rayon = raw.rayon || "";
      
      // Basic validations
      if (!nom) {
        errors.push("Le nom du produit est obligatoire.");
      }

      // Rayon normalization & validation
      if (!rayon) {
        errors.push("Le rayon est obligatoire.");
      } else {
        // Try mapping or slugifying rayon
        const mappedRayon = slugifyLocal(rayon);
        if (ALLOWED_RAYONS.includes(mappedRayon)) {
          rayon = mappedRayon;
        } else if (!ALLOWED_RAYONS.includes(rayon)) {
          errors.push(`Rayon inconnu : "${rayon}". Doit être l'un des rayons configurés.`);
        }
      }

      let prix_indicatif = null;
      if (raw.prix_indicatif !== undefined && raw.prix_indicatif !== "") {
        // Clean French decimal comma to dot
        const cleanPrice = String(raw.prix_indicatif).replace(",", ".").replace(/[^0-9.]/g, "");
        const parsedPrice = parseFloat(cleanPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          errors.push(`Prix indicatif invalide : "${raw.prix_indicatif}".`);
        } else {
          prix_indicatif = parsedPrice;
        }
      }

      // Generate slug if absent
      let slug = raw.slug ? slugifyLocal(raw.slug) : slugifyLocal(nom);
      if (!slug && nom) {
        slug = slugifyLocal(nom);
      }
      if (!slug) {
        errors.push("Impossible de dériver un slug valide pour ce produit.");
      }

      const active = raw.actif !== undefined && raw.actif !== "" 
        ? !(raw.actif.toLowerCase() === "false" || raw.actif === "0" || raw.actif.toLowerCase() === "non")
        : true;

      const orderVal = parseInt(raw.ordre, 10);
      const ordre = isNaN(orderVal) ? 0 : orderVal;

      const normalizedItem = {
        slug,
        nom,
        description: raw.description || "",
        image_url: raw.image_url || null,
        prix_indicatif,
        unite: raw.unite || null,
        rayon,
        categorie: raw.categorie || null,
        sous_categorie: raw.sous_categorie || null,
        origine: raw.origine || null,
        badge: raw.badge || null,
        actif: active,
        ordre,
      };

      if (errors.length > 0) {
        invalid.push({ item: normalizedItem, line: lineIndex, errors });
        return;
      }

      // Compare with DB
      const existing = dbMap.get(slug);
      if (!existing) {
        inserts.push({ item: normalizedItem, line: lineIndex });
      } else {
        const diffs = {};
        const compareFields = [
          "nom", "description", "image_url", "prix_indicatif", "unite", 
          "rayon", "categorie", "sous_categorie", "origine", "badge", "actif", "ordre"
        ];

        compareFields.forEach((f) => {
          const next = norm(normalizedItem[f]);
          const prev = norm(existing[f]);

          // Loose numeric comparison for floats
          if (f === "prix_indicatif") {
            const nextNum = next !== null ? Number(next).toFixed(2) : null;
            const prevNum = prev !== null ? Number(prev).toFixed(2) : null;
            if (nextNum !== prevNum) {
              diffs[f] = { prev, next };
            }
          } else {
            if (next !== prev) {
              diffs[f] = { prev, next };
            }
          }
        });

        if (Object.keys(diffs).length > 0) {
          updates.push({ item: normalizedItem, line: lineIndex, diffs, id: existing.id });
        } else {
          unchanged.push({ item: normalizedItem, line: lineIndex });
        }
      }
    });

    setAnalysis({ inserts, updates, unchanged, invalid });
    
    // Choose active tab based on contents
    if (inserts.length > 0) setActiveTab("inserts");
    else if (updates.length > 0) setActiveTab("updates");
    else if (invalid.length > 0) setActiveTab("invalid");
    else setActiveTab("unchanged");
  }

  // Drag and Drop Zone events
  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        parseCSV(file);
      } else {
        notify("err", "Format invalide. Veuillez téléverser un fichier .csv uniquement.");
      }
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".csv")) {
        parseCSV(file);
      } else {
        notify("err", "Format invalide. Veuillez sélectionner un fichier .csv.");
      }
    }
  }

  // Chunked batch importation
  async function triggerImport() {
    const toImport = [
      ...analysis.inserts.map((i) => i.item),
      ...analysis.updates.map((u) => u.item),
    ];

    if (toImport.length === 0) {
      notify("err", "Aucun produit à importer (0 insertions, 0 modifications).");
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: toImport.length, errors: [] });
    setImportFinished(false);

    const CHUNK_SIZE = 50;
    const errors = [];
    let successfulCount = 0;

    for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
      const chunk = toImport.slice(i, i + CHUNK_SIZE);
      try {
        const res = await adminFetch("/api/admin/produits", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produits: chunk }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur serveur (HTTP ${res.status})`);
        }

        successfulCount += chunk.length;
      } catch (err) {
        errors.push(`Lot ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk[0]?.nom || "sans nom"}...) : ${err.message}`);
      }

      setImportProgress((cur) => ({
        ...cur,
        current: Math.min(i + CHUNK_SIZE, toImport.length),
        errors: [...errors],
      }));
    }

    setImporting(false);
    setImportFinished(true);

    if (errors.length === 0) {
      notify("ok", `Importation terminée ! ${successfulCount} produits synchronisés.`);
    } else {
      notify("err", `Importation terminée avec des erreurs (${errors.length} lots échoués).`);
    }

    // Refresh Db cache
    try {
      const res = await adminFetch("/api/admin/produits");
      if (res.ok) {
        const data = await res.json();
        setExistingProduits(data.produits ?? []);
      }
    } catch {
      // harmless
    }

    /* Broadcast to other admin tabs / islands so AfficheGenerator,
     * ProduitsManager, etc. instantly reflect the new catalogue
     * state without a manual reload. Skipped if absolutely no chunk
     * succeeded — nothing changed in the DB. */
    if (successfulCount > 0) {
      publishAdminEvent(ADMIN_EVENT.PRODUITS_UPDATED, {
        entity: "produit:csv-import",
      });
    }
  }

  function handleReset() {
    setFileName("");
    setParsedRows([]);
    setAnalysis({ inserts: [], updates: [], unchanged: [], invalid: [] });
    setImportFinished(false);
  }

  if (loadingDb) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-neutral-100 border-t-vert animate-spin"></div>
        <p className="text-[13px] text-neutral-500 font-bold">Chargement du catalogue actuel...</p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="bg-rouge/5 border border-rouge/30 text-rouge rounded-3xl p-6 md:p-8 space-y-4">
        <p className="font-bold text-[15px]">⚠ Impossible d'accéder à Supabase</p>
        <p className="text-[14px] leading-relaxed">{dbError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div
          className={[
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl transition-all border",
            toast.type === "ok" ? "bg-vert/10 border-vert/30 text-vert-dark" : "bg-rouge/10 border-rouge/30 text-rouge",
          ].join(" ")}
          role="alert"
        >
          <span className="text-[14px] font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Control bar */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <a
            href="/admin/produits"
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-noir transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Importateur</span>
            <h2 className="text-[18px] font-bold text-noir">Mise à jour en masse du catalogue</h2>
          </div>
        </div>

        {fileName && !importing && !importFinished && (
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-black/10 hover:border-noir text-[12px] font-bold rounded-full transition"
          >
            Réinitialiser / Changer de fichier
          </button>
        )}
      </div>

      {/* STEP 1: Upload or Progress panel */}
      {!fileName ? (
        <div className="space-y-6">
          <div className="bg-neutral-50 border border-neutral-100 p-6 rounded-3xl text-[13px] text-neutral-600 max-w-3xl leading-relaxed space-y-3">
            <h3 className="font-bold text-noir text-[14px]">💡 Instructions et format attendu :</h3>
            <p>
              Téléversez un fichier <strong>CSV</strong> contenant votre catalogue. Le script de synchronisation
              effectuera une analyse différentielle avant toute écriture pour n'injecter que les lignes ajoutées ou modifiées.
            </p>
            <p className="font-medium text-noir">Noms de colonnes supportés (insensibles à la casse et accents) :</p>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 font-mono text-[11px] text-neutral-500">
              <li>• nom (obligatoire)</li>
              <li>• rayon (obligatoire)</li>
              <li>• slug (optionnel)</li>
              <li>• description</li>
              <li>• image_url / photo</li>
              <li>• prix_indicatif</li>
              <li>• unite / unit</li>
              <li>• categorie</li>
              <li>• sous_categorie</li>
              <li>• origine / pays</li>
              <li>• badge</li>
              <li>• actif (true/false)</li>
              <li>• ordre (numérique)</li>
            </ul>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={[
              "border-2 border-dashed rounded-3xl p-12 text-center transition flex flex-col items-center justify-center gap-4 cursor-pointer",
              dragActive ? "border-vert bg-vert/5" : "border-neutral-200 bg-white hover:border-neutral-300",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-full bg-neutral-50 border border-black/5 flex items-center justify-center text-[28px]">
              📥
            </div>
            <div>
              <p className="font-bold text-[14px] text-noir">Déposez votre fichier CSV ici</p>
              <p className="text-[12px] text-neutral-400 mt-1">ou cliquez pour parcourir vos fichiers (.csv)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File summary & actions banner */}
          <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">📄</span>
                <span className="font-mono text-[13px] font-bold text-noir">{fileName}</span>
              </div>
              <p className="text-[12.5px] text-neutral-500">
                {parsedRows.length} lignes de données analysées.
              </p>
            </div>

            {!importing && !importFinished && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-bold text-noir">
                    {analysis.inserts.length + analysis.updates.length} changements à appliquer
                  </p>
                  <p className="text-[11.5px] text-neutral-400">
                    ({analysis.inserts.length} insertions, {analysis.updates.length} modifications)
                  </p>
                </div>
                <button
                  onClick={triggerImport}
                  disabled={analysis.inserts.length + analysis.updates.length === 0}
                  className="px-6 py-3 rounded-full bg-vert text-white text-[13px] font-bold hover:bg-vert-dark transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  <span>Lancer l'importation</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Import progress bar */}
          {(importing || importFinished) && (
            <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[14px] text-noir">
                    {importing ? "Importation en cours..." : "Importation terminée"}
                  </h3>
                  <p className="text-[12px] text-neutral-500 mt-0.5">
                    Traitement des produits par lots de 50 pour éviter les timeouts Supabase.
                  </p>
                </div>
                <span className="text-[13px] font-bold text-noir tabular-nums">
                  {importProgress.current} / {importProgress.total} produits ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                </span>
              </div>

              {/* Bar track */}
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-vert transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>

              {importProgress.errors.length > 0 && (
                <div className="bg-rouge/5 border border-rouge/20 text-rouge rounded-2xl p-4 text-[12.5px] space-y-2">
                  <p className="font-bold">⚠ Échecs d'importation :</p>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                    {importProgress.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importFinished && (
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="/admin/produits"
                    className="px-5 py-2.5 rounded-full bg-noir text-white text-[13px] font-bold hover:bg-neutral-800 transition"
                  >
                    Retour au catalogue
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-full border border-black/10 hover:border-noir text-[13px] font-bold text-neutral-600 hover:text-noir transition"
                  >
                    Importer un autre fichier
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Differential Preview Tabs */}
          <div className="space-y-4">
            <div className="flex items-center border-b border-neutral-100">
              <button
                onClick={() => setActiveTab("inserts")}
                className={[
                  "px-5 py-3 text-[13px] font-bold border-b-2 transition -mb-px flex items-center gap-2",
                  activeTab === "inserts"
                    ? "border-vert text-vert"
                    : "border-transparent text-neutral-400 hover:text-neutral-600",
                ].join(" ")}
              >
                <span>Nouveaux produits</span>
                <span className={[
                  "text-[11px] px-2 py-0.5 rounded-full font-bold",
                  analysis.inserts.length > 0 ? "bg-vert/10 text-vert" : "bg-neutral-100 text-neutral-400",
                ].join(" ")}>
                  {analysis.inserts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("updates")}
                className={[
                  "px-5 py-3 text-[13px] font-bold border-b-2 transition -mb-px flex items-center gap-2",
                  activeTab === "updates"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-neutral-400 hover:text-neutral-600",
                ].join(" ")}
              >
                <span>Produits à modifier</span>
                <span className={[
                  "text-[11px] px-2 py-0.5 rounded-full font-bold",
                  analysis.updates.length > 0 ? "bg-orange-50 text-orange-600" : "bg-neutral-100 text-neutral-400",
                ].join(" ")}>
                  {analysis.updates.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("invalid")}
                className={[
                  "px-5 py-3 text-[13px] font-bold border-b-2 transition -mb-px flex items-center gap-2",
                  activeTab === "invalid"
                    ? "border-rouge text-rouge"
                    : "border-transparent text-neutral-400 hover:text-neutral-600",
                ].join(" ")}
              >
                <span>Lignes invalides</span>
                <span className={[
                  "text-[11px] px-2 py-0.5 rounded-full font-bold",
                  analysis.invalid.length > 0 ? "bg-rouge/10 text-rouge" : "bg-neutral-100 text-neutral-400",
                ].join(" ")}>
                  {analysis.invalid.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("unchanged")}
                className={[
                  "px-5 py-3 text-[13px] font-bold border-b-2 transition -mb-px flex items-center gap-2",
                  activeTab === "unchanged"
                    ? "border-neutral-500 text-noir"
                    : "border-transparent text-neutral-400 hover:text-neutral-600",
                ].join(" ")}
              >
                <span>Identiques</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400 font-bold">
                  {analysis.unchanged.length}
                </span>
              </button>
            </div>

            {/* Tab contents */}
            <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
              {activeTab === "inserts" && (
                <div>
                  {analysis.inserts.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 text-[13px]">
                      Aucun nouveau produit dans ce fichier.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-bold">
                            <th className="p-4 w-12">Ligne</th>
                            <th className="p-4">Nom</th>
                            <th className="p-4">Rayon</th>
                            <th className="p-4">Catégorie</th>
                            <th className="p-4 text-right">Prix indicatif</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {analysis.inserts.map(({ item, line }) => (
                            <tr key={item.slug} className="hover:bg-neutral-50/50 transition">
                              <td className="p-4 text-neutral-400 font-mono text-[11px]">{line}</td>
                              <td className="p-4">
                                <div className="font-bold text-noir">{item.nom}</div>
                                <div className="text-[11px] text-neutral-400 font-mono">{item.slug}</div>
                              </td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-full bg-vert-light/35 text-vert-dark font-medium text-[11px]">
                                  {RAYON_LABELS(item.rayon)}
                                </span>
                              </td>
                              <td className="p-4 text-neutral-600 font-medium">
                                {item.categorie || <span className="text-neutral-300">—</span>}
                                {item.sous_categorie && <span className="text-neutral-400 text-[11px] ml-1">({item.sous_categorie})</span>}
                              </td>
                              <td className="p-4 text-right font-bold text-noir tabular-nums">
                                {item.prix_indicatif !== null ? `${item.prix_indicatif.toFixed(2)} €` : "—"}
                                {item.unite && <span className="text-[11px] text-neutral-400 font-normal ml-0.5">/ {item.unite}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "updates" && (
                <div>
                  {analysis.updates.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 text-[13px]">
                      Aucune modification détectée dans ce fichier.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-bold">
                            <th className="p-4 w-12">Ligne</th>
                            <th className="p-4">Produit</th>
                            <th className="p-4">Changements détectés</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {analysis.updates.map(({ item, line, diffs }) => (
                            <tr key={item.slug} className="hover:bg-neutral-50/50 transition">
                              <td className="p-4 text-neutral-400 font-mono text-[11px]">{line}</td>
                              <td className="p-4 max-w-xs">
                                <div className="font-bold text-noir">{item.nom}</div>
                                <div className="text-[11px] text-neutral-400 font-mono">{item.slug}</div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(diffs).map(([field, { prev, next }]) => (
                                    <div
                                      key={field}
                                      className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200/50 rounded-xl px-3 py-1 text-[11.5px]"
                                    >
                                      <span className="font-bold text-orange-800 uppercase tracking-wider text-[9.5px]">
                                        {field === "prix_indicatif" ? "Prix" : field} :
                                      </span>
                                      <span className="text-neutral-400 line-through">
                                        {prev === null || prev === "" ? "vide" : String(prev)}
                                      </span>
                                      <span className="text-orange-900 font-bold">→</span>
                                      <span className="text-orange-950 font-bold bg-orange-100 px-1 py-0.5 rounded">
                                        {next === null || next === "" ? "vide" : String(next)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "invalid" && (
                <div>
                  {analysis.invalid.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 text-[13px]">
                      Aucune ligne invalide détectée. Félicitations !
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      <div className="bg-rouge/5 px-4 py-3 text-[12px] text-rouge font-bold border-b border-rouge/10">
                        ⚠ Les lignes ci-dessous comportent des erreurs de validation et seront ignorées lors de l'importation.
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-neutral-50/70 text-neutral-500 font-bold">
                              <th className="p-4 w-12">Ligne</th>
                              <th className="p-4">Produit saisi</th>
                              <th className="p-4 text-rouge">Erreurs de validation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {analysis.invalid.map(({ item, line, errors }) => (
                              <tr key={line} className="hover:bg-neutral-50/50 transition">
                                <td className="p-4 text-neutral-400 font-mono text-[11px]">{line}</td>
                                <td className="p-4 max-w-xs">
                                  <div className="font-bold text-noir">{item.nom || <span className="text-neutral-300 italic">sans nom</span>}</div>
                                  <div className="text-[11px] text-neutral-400 font-mono">Rayon : {item.rayon || "—"}</div>
                                </td>
                                <td className="p-4">
                                  <ul className="list-disc pl-4 space-y-1 font-medium text-rouge text-[12px]">
                                    {errors.map((e, idx) => (
                                      <li key={idx}>{e}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "unchanged" && (
                <div>
                  {analysis.unchanged.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 text-[13px]">
                      Aucun produit identique dans ce fichier.
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[13px] text-neutral-500 leading-relaxed max-w-md mx-auto space-y-2">
                      <p className="font-bold text-noir text-[14px]">🔄 {analysis.unchanged.length} produits identiques</p>
                      <p>
                        Ces produits existent déjà dans la base de données de Marché de Mo' et possèdent exactement
                        les mêmes valeurs pour toutes les colonnes. Ils ne seront pas modifiés.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
