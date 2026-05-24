import React, { useState, useEffect, useRef } from 'react';
import { subscribeAdminEvents, ADMIN_EVENT } from './admin-bus.js';

// Standard Rayon mappings from Slug to Short French names
const RAYONS_NAMES = {
  'boucherie-halal': 'Boucherie Halal',
  'fruits-legumes': 'Fruits & Légumes',
  'epices-du-monde': 'Épices du Monde',
  'saveurs-afrique': 'Saveurs d\'Afrique',
  'saveurs-asie': 'Saveurs d\'Asie',
  'saveur-mediterranee': 'Saveur Méditerranée',
  'saveur-sud-amer': 'Saveur Sud Amér.',
  'balkans-turques': 'Balkans & Turques',
  'produits-courants': 'Produits Courants',
  'surgeles': 'Surgelés',
  'boulangerie': 'Boulangerie',
  'produits-laitiers': 'Produits Laitiers'
};

const STORAGE_KEY = 'marchedemo_affiche_draft_v1';
const POSTER_PX_WIDTH = (297 * 96) / 25.4; // 1122.52px real A4 landscape

// Theme definitions for seasonal and cultural designs
const THEMES = {
  default: {
    id: 'default',
    name: 'Standard',
    category: 'default',
    colors: {
      primary: '#1C6B35',
      secondary: '#0f4c21',
      accent: '#8B1919',
      gold: '#FACC15'
    },
    icon: null
  },
  spring: {
    id: 'spring',
    name: 'Printemps',
    category: 'seasonal',
    colors: {
      primary: '#7CB342',
      secondary: '#558B2F',
      accent: '#FF7043',
      gold: '#FFD54F'
    },
    icon: '🌸'
  },
  summer: {
    id: 'summer',
    name: 'Été',
    category: 'seasonal',
    colors: {
      primary: '#FF9800',
      secondary: '#F57C00',
      accent: '#E91E63',
      gold: '#FFEB3B'
    },
    icon: '☀️'
  },
  autumn: {
    id: 'autumn',
    name: 'Automne',
    category: 'seasonal',
    colors: {
      primary: '#D84315',
      secondary: '#BF360C',
      accent: '#FF6F00',
      gold: '#FFCA28'
    },
    icon: '🍂'
  },
  winter: {
    id: 'winter',
    name: 'Hiver',
    category: 'seasonal',
    colors: {
      primary: '#1976D2',
      secondary: '#0D47A1',
      accent: '#E53935',
      gold: '#90CAF9'
    },
    icon: '❄️'
  },
  ramadan: {
    id: 'ramadan',
    name: 'Ramadan',
    category: 'cultural',
    colors: {
      primary: '#1C6B35',
      secondary: '#0f4c21',
      accent: '#C6A700',
      gold: '#FFD700'
    },
    icon: '🌙'
  },
  christmas: {
    id: 'christmas',
    name: 'Noël',
    category: 'cultural',
    colors: {
      primary: '#C62828',
      secondary: '#8E0000',
      accent: '#2E7D32',
      gold: '#FFD700'
    },
    icon: '🎄'
  },
  easter: {
    id: 'easter',
    name: 'Pâques',
    category: 'cultural',
    colors: {
      primary: '#9C27B0',
      secondary: '#7B1FA2',
      accent: '#FFEB3B',
      gold: '#E1BEE7'
    },
    icon: '🐰'
  }
};

export default function AfficheGenerator({ initialProduits = [], initialPromos = [], initialArticles = [] }) {
  // ----- Dynamic Synchronized State -----
  const [liveProduits, setLiveProduits] = useState(initialProduits);
  const [livePromos, setLivePromos] = useState(initialPromos);
  const [liveArticles, setLiveArticles] = useState(initialArticles);

  // ----- Form State -----
  const [name, setName] = useState('Nom du Produit');
  const [eyebrow, setEyebrow] = useState('Nouveauté');
  const [pitch, setPitch] = useState('Sélectionné avec soin pour sa qualité supérieure.');
  const [rayon, setRayon] = useState('fruits-legumes');
  const [format, setFormat] = useState('Le kg');
  const [origine, setOrigine] = useState('France');
  const [marque, setMarque] = useState('');
  const [price, setPrice] = useState('3.99');
  const [oldPrice, setOldPrice] = useState('5.99');
  const [promo, setPromo] = useState(false);
  const [expo, setExpo] = useState(false);
  const [productUrl, setProductUrl] = useState('https://www.marchedemo.com');
  const [qrUrlGenerated, setQrUrlGenerated] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('default');

  // ----- UI State -----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChip, setSelectedChip] = useState(null);
  const [scale, setScale] = useState(0.5);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // ----- Refs -----
  const previewWrapRef = useRef(null);

  // ----- Real-time cross-island sync via shared admin-bus -----
  // Refetches produits / promos / actus when ANY other admin window
  // (or React island) reports a mutation. Self-echoes are filtered out
  // by the bus' senderId guard.
  useEffect(() => {
    return subscribeAdminEvents(
      [
        ADMIN_EVENT.PRODUITS_UPDATED,
        ADMIN_EVENT.PROMOS_UPDATED,
        ADMIN_EVENT.ACTUS_UPDATED,
      ],
      async (event) => {
        if (event.type === ADMIN_EVENT.PRODUITS_UPDATED) {
          try {
            const res = await fetch('/api/admin/produits');
            if (res.ok) {
              const data = await res.json();
              setLiveProduits(data.produits || []);
            }
          } catch (err) {
            console.warn('[affiche-gen-sync] failed to refresh products', err);
          }
        } else if (event.type === ADMIN_EVENT.PROMOS_UPDATED) {
          try {
            const res = await fetch('/api/admin/promos');
            if (res.ok) {
              const data = await res.json();
              setLivePromos(data.promos || []);
            }
          } catch (err) {
            console.warn('[affiche-gen-sync] failed to refresh promos', err);
          }
        } else if (event.type === ADMIN_EVENT.ACTUS_UPDATED) {
          try {
            const res = await fetch('/api/admin/actus');
            if (res.ok) {
              const data = await res.json();
              setLiveArticles(data.actus || data.articles || []);
            }
          } catch (err) {
            console.warn('[affiche-gen-sync] failed to refresh actus', err);
          }
        }
      },
    );
  }, []);

  // Combine and normalize all initial data sources for quick local search
  const allSearchableItems = React.useMemo(() => {
    const list = [];
    
    // 1. Promos
    livePromos.forEach(p => {
      list.push({
        id: `promo-${p.slug}`,
        slug: p.slug,
        title: p.titre,
        type: 'promo',
        price: p.prix_promo,
        oldPrice: p.prix_original,
        description: p.description || '',
        rayon: p.rayon,
        sourceLabel: 'Promotion active V2',
        image: p.image_url
      });
    });

    // 2. Produits
    liveProduits.forEach(p => {
      list.push({
        id: `prod-${p.slug}`,
        slug: p.slug,
        title: p.nom,
        type: 'product',
        price: p.prix_indicatif || '',
        oldPrice: '',
        description: p.description || '',
        rayon: p.rayon,
        origine: p.origine || '',
        badge: p.badge || '',
        sourceLabel: 'Catalogue vitrine V2',
        image: p.image_url
      });
    });

    // 3. Articles (Bridged inventory)
    liveArticles.forEach(a => {
      list.push({
        id: `art-${a.slug}`,
        slug: a.slug,
        title: a.nom,
        type: 'inventory',
        price: a.prix_vente || '',
        oldPrice: '',
        description: a.description || '',
        rayon: a.rayon,
        origine: a.origine || '',
        badge: a.badge || '', // badge represents marque/brand in bridge
        format: a.format || '',
        sourceLabel: 'Inventaire ponté',
        image: a.image
      });
    });

    return list;
  }, [liveProduits, livePromos, liveArticles]);

  // ----- Autocomplete Filter -----
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const filtered = allSearchableItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.slug.toLowerCase().includes(q) ||
      (item.rayon && item.rayon.toLowerCase().includes(q))
    ).slice(0, 8); // Cap at 8 results for speed
    setSearchResults(filtered);
  }, [searchQuery, allSearchableItems]);

  // ----- Load State from LocalStorage -----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.name) setName(d.name);
        if (d.eyebrow) setEyebrow(d.eyebrow);
        if (d.pitch) setPitch(d.pitch);
        if (d.rayon) setRayon(d.rayon);
        if (d.format) setFormat(d.format);
        if (d.origine) setOrigine(d.origine);
        if (d.marque) setMarque(d.marque);
        if (d.price) setPrice(d.price);
        if (d.oldPrice) setOldPrice(d.oldPrice);
        if (d.promo !== undefined) setPromo(d.promo);
        if (d.expo !== undefined) setExpo(d.expo);
        if (d.productUrl) setProductUrl(d.productUrl);
        if (d.qrUrlGenerated) setQrUrlGenerated(d.qrUrlGenerated);
        if (d.selectedChip) setSelectedChip(d.selectedChip);
        if (d.showImage !== undefined) setShowImage(d.showImage);
        if (d.imageUrl !== undefined) setImageUrl(d.imageUrl);
        if (d.selectedTheme) setSelectedTheme(d.selectedTheme);
      }
    } catch (_) {}
  }, []);

  // ----- Save State on Change -----
  useEffect(() => {
    const state = {
      name, eyebrow, pitch, rayon, format, origine, marque,
      price, oldPrice, promo, expo, productUrl, qrUrlGenerated, selectedChip,
      showImage, imageUrl, selectedTheme
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }, [name, eyebrow, pitch, rayon, format, origine, marque, price, oldPrice, promo, expo, productUrl, qrUrlGenerated, selectedChip, showImage, imageUrl, selectedTheme]);

  // ----- Resize / Scale Preview -----
  useEffect(() => {
    const updateScale = () => {
      if (!previewWrapRef.current) return;
      const wrapW = previewWrapRef.current.clientWidth;
      if (wrapW) {
        setScale(wrapW / POSTER_PX_WIDTH);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    
    let observer;
    if ('ResizeObserver' in window && previewWrapRef.current) {
      observer = new ResizeObserver(updateScale);
      observer.observe(previewWrapRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      if (observer) observer.disconnect();
    };
  }, []);

  // ----- QR Code Generation -----
  useEffect(() => {
    if (!qrUrlGenerated || !/^https?:\/\//i.test(qrUrlGenerated)) {
      setQrCodeDataUrl('');
      return;
    }
    if (typeof window === 'undefined' || !window.QRCode) {
      // If QRCode script is not fully loaded, retry shortly
      const timer = setTimeout(() => setQrUrlGenerated(qrUrlGenerated + ' '), 400);
      return () => clearTimeout(timer);
    }

    window.QRCode.toDataURL(qrUrlGenerated, {
      width: 600,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F0F0F', light: '#ffffff' } // Strict black on white QR Code
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.warn('[qr] echec', err));
  }, [qrUrlGenerated]);

  // ----- Handle Autocomplete Select -----
  const handleSelectItem = (item) => {
    setSelectedChip(item);
    setName(item.title);
    setRayon(item.rayon || 'fruits-legumes');
    setPitch(item.description ? item.description.substring(0, 100) : 'Produit de qualité supérieure.');
    
    // Formatting prices nicely (e.g. 5 => '5.00')
    const formatPriceStr = (val) => {
      if (val === null || val === undefined || val === '') return '';
      const num = Number(val);
      return isNaN(num) ? '' : num.toString();
    };

    setPrice(formatPriceStr(item.price));
    setOldPrice(formatPriceStr(item.oldPrice));

    if (item.type === 'promo') {
      setPromo(true);
      setEyebrow('PROMOTION');
      setProductUrl(`https://www.marchedemo.com/promos`);
      setQrUrlGenerated(`https://www.marchedemo.com/promos`);
    } else {
      setPromo(false);
      setEyebrow(item.type === 'inventory' ? 'EN STOCK' : 'COUP DE COEUR');
      setProductUrl(`https://www.marchedemo.com/produits/${item.slug}`);
      setQrUrlGenerated(`https://www.marchedemo.com/produits/${item.slug}`);
    }

    if (item.origine) setOrigine(item.origine);
    if (item.format) setFormat(item.format);
    if (item.badge) {
      setMarque(item.badge); // In inventory, badge is the brand
    } else {
      setMarque('');
    }

    if (item.image) {
      setImageUrl(item.image);
      setShowImage(true);
    } else {
      setImageUrl('');
      setShowImage(false);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  // ----- Reset Form -----
  const handleReset = () => {
    setName('Nom du Produit');
    setEyebrow('Nouveauté');
    setPitch('Sélectionné avec soin pour sa qualité supérieure.');
    setRayon('fruits-legumes');
    setFormat('Le kg');
    setOrigine('France');
    setMarque('');
    setPrice('3.99');
    setOldPrice('5.99');
    setPromo(false);
    setExpo(false);
    setProductUrl('https://www.marchedemo.com');
    setQrUrlGenerated('');
    setQrCodeDataUrl('');
    setSelectedChip(null);
    setSearchQuery('');
    setImageUrl('');
    setShowImage(false);
    setSelectedTheme('default');
  };

  // ----- Print Action -----
  const handlePrint = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Le nom du produit est obligatoire.');
      return;
    }
    if (!price || isNaN(Number(price))) {
      alert('Le prix est obligatoire et doit être un nombre.');
      return;
    }
    // Generate QR code if url entered but not saved yet
    if (productUrl && productUrl !== qrUrlGenerated) {
      setQrUrlGenerated(productUrl);
    }
    
    // Quick timeout to let DOM stabilize with QR code
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // ----- Price Formatting Helpers for Render -----
  const getPriceParts = (val) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) return { integer: '0', decimal: '' };
    const formatted = num.toFixed(2);
    const [intPart, decPart] = formatted.split('.');
    return {
      integer: intPart,
      decimal: decPart && decPart !== '00' ? `,${decPart}` : ''
    };
  };

  const getDiscountPercent = () => {
    const p = Number(price);
    const op = Number(oldPrice);
    if (!promo || isNaN(p) || isNaN(op) || op <= p) return 0;
    return Math.round(((op - p) / op) * 100);
  };

  const priceParts = getPriceParts(price);
  const oldPriceParts = getPriceParts(oldPrice);
  const discountPct = getDiscountPercent();

  // Price digits check to resize large prices
  const priceDigits = priceParts.integer.length + (priceParts.decimal ? 2 : 0);

  // Product name length check for auto-shrink
  let nameLengthClass = 'normal';
  if (name.length > 32) {
    nameLengthClass = 'xlarge';
  } else if (name.length > 18) {
    nameLengthClass = 'long';
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
      {/* ============================================================
         LEFT PANEL: Form & Control Dashboard
         ============================================================ */}
      <div className="xl:col-span-2 flex flex-col gap-6 no-print">
        
        {/* Autocomplete Search Bar */}
        <div className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm">
          <h2 className="text-[17px] font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-mo-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            Recherche de produit & autofill
          </h2>
          <p className="text-[13px] text-neutral-500 mb-4 leading-relaxed">
            Recherchez dans le <strong>catalogue vitrine</strong>, les <strong>promos actives</strong> ou l'<strong>inventaire</strong> pour préremplir l'affiche instantanément.
          </p>

          <div className="relative">
            <input
              type="text"
              className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-4 py-3 pl-11 text-[14px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white transition-all"
              placeholder="Saisissez un nom, un rayon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-4 top-3.5">
              <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3.5 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <ul className="mt-3 border border-neutral-100 rounded-2xl bg-white shadow-xl max-h-72 overflow-y-auto divide-y divide-neutral-50 z-50 relative">
              {searchResults.map(item => (
                <li 
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-neutral-50 transition-all text-left"
                >
                  {item.image ? (
                    <img src={item.image} className="w-10 h-10 rounded-lg object-cover bg-neutral-100 flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-400 flex items-center justify-center flex-shrink-0 font-bold text-[12px]">
                      MO
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[13.5px] font-bold text-neutral-800 truncate block">{item.title}</strong>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.type === 'promo' ? 'bg-rouge/10 text-rouge' : 
                        item.type === 'inventory' ? 'bg-mo-green/10 text-mo-green' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {item.type === 'promo' ? 'Promo' : item.type === 'inventory' ? 'Inv' : 'Vitrine'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-neutral-500 truncate">
                      {RAYONS_NAMES[item.rayon] || item.rayon} {item.price ? `· ${item.price} €` : ''} {item.format ? `· ${item.format}` : ''} {item.origine ? `· ${item.origine}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {searchQuery && searchResults.length === 0 && searchQuery.length >= 2 && (
            <p className="mt-3 text-[12px] text-neutral-400 text-center italic py-2">
              Aucun produit trouvé dans les bases locales.
            </p>
          )}

          {/* Selected Product Chip */}
          {selectedChip && (
            <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-mo-green/5 border border-mo-green/20 rounded-2xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-mo-green animate-pulse flex-shrink-0" />
                <span className="text-[12.5px] text-mo-green-dark font-bold truncate">
                  Lié à : {selectedChip.title} ({selectedChip.sourceLabel})
                </span>
              </div>
              <button 
                onClick={() => setSelectedChip(null)}
                className="text-neutral-400 hover:text-neutral-600 text-[11px] font-bold underline"
              >
                Détacher
              </button>
            </div>
          )}
        </div>

        {/* Editor Form */}
        <form onSubmit={handlePrint} className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-[17px] font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-50 pb-3">
            <svg className="w-5 h-5 text-mo-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/>
            </svg>
            Configuration de l'affiche
          </h2>

          {/* Theme Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-neutral-700">Thème de l'affiche</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEMES).map(([id, theme]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedTheme(id)}
                  className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                    selectedTheme === id
                      ? 'border-mo-green bg-mo-green/5 text-mo-green-dark'
                      : 'border-neutral-100 bg-neutral-50 text-neutral-600 hover:border-neutral-200'
                  }`}
                >
                  <span className="text-xl">{theme.icon}</span>
                  <span className="font-bold text-[13px]">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Eyebrow & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-neutral-700">Chapeau éditorial</label>
              <input
                type="text"
                maxLength={40}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder="Ex. Nouveauté, Bio..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-neutral-700">Rayon (icône & en-tête)</label>
              <select
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white"
                value={rayon}
                onChange={(e) => setRayon(e.target.value)}
              >
                {Object.entries(RAYONS_NAMES).map(([slug, name]) => (
                  <option key={slug} value={slug}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-neutral-700">Nom du produit <span className="text-rouge">*</span></label>
            <input
              type="text"
              required
              maxLength={70}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white font-bold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Huile de Tournesol 1L"
            />
          </div>

          {/* Origin & Format & Brand */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-neutral-700">Origine</label>
              <input
                type="text"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white"
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
                placeholder="Ex. Maroc"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-neutral-700">Format</label>
              <input
                type="text"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Ex. Le kg, 500g"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-neutral-700">Marque</label>
              <input
                type="text"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white"
                value={marque}
                onChange={(e) => setMarque(e.target.value)}
                placeholder="Ex. Yari"
              />
            </div>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-neutral-700">Mode tarifaire</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPromo(false)}
                className={`flex flex-col items-start p-3 border-2 rounded-2xl transition-all ${
                  !promo 
                    ? 'border-mo-green bg-mo-green/5 text-mo-green-dark' 
                    : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                }`}
              >
                <span className="font-bold text-[13.5px]">Plein tarif</span>
                <span className="text-[11px] opacity-80 mt-1">Fond vert, prix standard</span>
              </button>
              <button
                type="button"
                onClick={() => setPromo(true)}
                className={`flex flex-col items-start p-3 border-2 rounded-2xl transition-all ${
                  promo 
                    ? 'border-rouge bg-rouge/5 text-rouge' 
                    : 'border-neutral-100 bg-neutral-50 text-neutral-500 hover:border-neutral-200'
                }`}
              >
                <span className="font-bold text-[13.5px]">Promotion</span>
                <span className="text-[11px] opacity-80 mt-1">Fond rouge, ruban & prix barré</span>
              </button>
            </div>
          </div>

          {/* Prices input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-neutral-700">
                {promo ? 'Prix promotionnel' : 'Prix de vente'} (€) <span className="text-rouge">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[14px] text-neutral-800 font-bold focus:outline-none focus:border-mo-green focus:bg-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex. 3.99"
              />
            </div>
            {promo && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-neutral-700">Prix d'origine (€) <span className="text-rouge">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  required={promo}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[14px] text-neutral-800 font-bold focus:outline-none focus:border-mo-green focus:bg-white"
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="Ex. 5.99"
                />
              </div>
            )}
          </div>

          {/* Editorial Pitch */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-neutral-700">Accroche / Descriptif court</label>
            <textarea
              rows={2}
              maxLength={120}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:border-mo-green focus:bg-white resize-none"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Ex. Arrivage direct, idéal pour préparer vos recettes d'été."
            />
          </div>

          {/* Product Image Section */}
          <div className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="f-show-image" className="text-[13px] font-bold text-neutral-700 cursor-pointer flex items-center gap-2">
                <input
                  id="f-show-image"
                  type="checkbox"
                  className="w-4 h-4 accent-mo-green rounded"
                  checked={showImage}
                  onChange={(e) => setShowImage(e.target.checked)}
                />
                Afficher l'image du produit
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-neutral-400 hover:text-rouge text-[11px] font-bold"
                >
                  Effacer
                </button>
              )}
            </div>
            {showImage && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[12.5px] text-neutral-800 focus:outline-none focus:border-mo-green"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL de l'image (Supabase, external...)"
                  />
                </div>
                <span className="text-[10px] text-neutral-400 leading-normal">
                  💡 *Privilégiez les formats transparents (PNG détouré) ou sur fond blanc pur pour économiser l'encre.*
                </span>
                {imageUrl && (
                  <div className="mt-2 w-16 h-16 rounded-xl border border-neutral-200 bg-white p-1 flex items-center justify-center overflow-hidden">
                    <img src={imageUrl} className="max-w-full max-h-full object-contain rounded" alt="Preview" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expo & QR Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 border border-neutral-200 rounded-xl p-3 bg-neutral-50">
              <input
                id="f-expo"
                type="checkbox"
                className="w-4 h-4 accent-mo-green"
                checked={expo}
                onChange={(e) => setExpo(e.target.checked)}
              />
              <label htmlFor="f-expo" className="text-[12.5px] text-neutral-700 cursor-pointer font-bold">
                Modèle d'exposition
              </label>
            </div>
            
            <div className="flex flex-col gap-1">
              <input
                type="text"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[12px] text-neutral-800 focus:outline-none focus:border-mo-green"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="Ex. https://marchedemo.com/..."
              />
              <span className="text-[9.5px] text-neutral-400 pl-1 leading-none">URL cible du QR Code</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col md:flex-row gap-3 mt-2 border-t border-neutral-50 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 border-2 border-neutral-100 hover:border-neutral-200 text-neutral-600 rounded-2xl py-3 text-[14px] font-bold transition-all"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setQrUrlGenerated(productUrl)}
              className="flex-1 bg-mo-green/10 text-mo-green hover:bg-mo-green/20 rounded-2xl py-3 text-[14px] font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><path d="M14 14h3v3h-3z"/>
              </svg>
              Générer QR
            </button>
            <button
              type="submit"
              className={`flex-1 text-white rounded-2xl py-3 text-[14px] font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                promo 
                  ? 'bg-rouge hover:bg-rouge/95 shadow-rouge/10' 
                  : 'bg-mo-green hover:bg-mo-green/95 shadow-mo-green/10'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>
              </svg>
              Imprimer
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================
         RIGHT PANEL: Interactive Millimeter Live Preview (Sticky)
         ============================================================ */}
      <div className="xl:col-span-3 flex flex-col gap-4 sticky top-6">
        <div className="flex items-center justify-between no-print px-1">
          <h2 className="text-[17px] font-bold text-neutral-900 flex items-center gap-2">
            Aperçu A4 Paysage
            <span className="text-[12px] font-normal text-neutral-400">({Math.round(scale * 100)}%)</span>
          </h2>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-[13px] font-bold text-mo-green hover:text-mo-green-dark flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            Guide d'impression
          </button>
        </div>

        {showHelp && (
          <div className="bg-mo-green/5 border border-mo-green/20 rounded-2xl p-4 text-[12.5px] text-mo-green-dark leading-relaxed no-print">
            <strong className="block mb-1 text-[13.5px]">💡 Astuces pour une impression parfaite :</strong>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Cliquez sur <strong>"Générer QR"</strong> si vous souhaitez faire apparaître le QR Code de redirection.</li>
              <li>Dans la boîte de dialogue d'impression, réglez la mise en page sur <strong>Paysage (Landscape)</strong>.</li>
              <li>Définissez les marges sur <strong>"Aucune" (None)</strong> pour laisser l'affiche occuper tout l'espace A4.</li>
              <li>Cochez la case <strong>"Graphiques d'arrière-plan" (Background graphics)</strong> pour imprimer les fonds vert et rouge.</li>
            </ul>
          </div>
        )}

        {/* Scaled Preview Frame */}
        <div ref={previewWrapRef} className="mo-preview-wrap">
          <div 
            className="mo-poster" 
            data-promo={promo ? "true" : "false"}
            data-has-image={showImage && !!imageUrl ? "true" : "false"}
            data-theme={selectedTheme}
            style={{ 
              transform: `scale(${scale})`,
              '--theme-primary': THEMES[selectedTheme].colors.primary,
              '--theme-secondary': THEMES[selectedTheme].colors.secondary,
              '--theme-accent': THEMES[selectedTheme].colors.accent,
              '--theme-gold': THEMES[selectedTheme].colors.gold
            }}
          >
            
            {/* 1. TOP BAR */}
            <header className="mo-poster__top">
              <div className="mo-poster__brand">
                <img 
                  src="/logos/logo-marchedemo-rec-contourwh.png" 
                  className="mo-poster__brand-logo" 
                  alt="Logo Marché de Mo'" 
                />
                <div className="mo-poster__brand-text">
                  <span className="mo-poster__brand-name">MARCHÉ DE MO'</span>
                  <span className="mo-poster__brand-city">Toulouse · Vos supermarchés du monde</span>
                </div>
              </div>
              
              <span className="mo-poster__top-badge">
                {RAYONS_NAMES[rayon] || 'Épicerie'}
              </span>
            </header>

            {/* 2. MAIN SECTION */}
            <main className="mo-poster__main">
              
              {/* Left Column Content */}
              <div className="mo-poster__content" data-has-image={showImage && !!imageUrl ? "true" : "false"}>
                {showImage && imageUrl ? (
                  <div className="mo-poster__content-body-grid">
                    {/* Left Column: Details */}
                    <div className="mo-poster__content-text-side">
                      <div className="mo-poster__content-top">
                        {eyebrow && (
                          <span className="mo-poster__eyebrow">
                            {eyebrow}
                          </span>
                        )}

                        <h1 className="mo-poster__name" data-length={nameLengthClass}>
                          {name || 'Nom du Produit'}
                        </h1>

                        <div className="mo-poster__meta">
                          {marque && (
                            <span className="mo-poster__meta-item">Marque : <strong>{marque}</strong></span>
                          )}
                          {origine && (
                            <span className="mo-poster__meta-item">Origine : <strong>{origine}</strong></span>
                          )}
                          {format && (
                            <span className="mo-poster__meta-item">Format : <strong>{format}</strong></span>
                          )}
                        </div>

                        {pitch && (
                          <p className="mo-poster__pitch">
                            {pitch}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Image Frame */}
                    <div className="mo-poster__content-image-side">
                      <div className="mo-poster__image-frame">
                        <img 
                          src={imageUrl} 
                          className="mo-poster__product-image" 
                          crossOrigin="anonymous"
                          alt={name} 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mo-poster__content-top">
                    {/* Eyebrow Label */}
                    {eyebrow && (
                      <span className="mo-poster__eyebrow">
                        {eyebrow}
                      </span>
                    )}

                    {/* Product Title */}
                    <h1 className="mo-poster__name" data-length={nameLengthClass}>
                      {name || 'Nom du Produit'}
                    </h1>

                    {/* Product Metadata (Format, Origin, Brand) */}
                    <div className="mo-poster__meta">
                      {marque && (
                        <span className="mo-poster__meta-item">Marque : <strong>{marque}</strong></span>
                      )}
                      {origine && (
                        <span className="mo-poster__meta-item">Origine : <strong>{origine}</strong></span>
                      )}
                      {format && (
                        <span className="mo-poster__meta-item">Format : <strong>{format}</strong></span>
                      )}
                    </div>

                    {/* Short Pitch description */}
                    {pitch && (
                      <p className="mo-poster__pitch">
                        {pitch}
                      </p>
                    )}
                  </div>
                )}

                {/* QR Code Section */}
                <div className="mo-poster__qr">
                  <div className="mo-poster__qr-code">
                    {qrCodeDataUrl && (
                      <img src={qrCodeDataUrl} alt="QR Code produit" />
                    )}
                  </div>
                  <div className="mo-poster__qr-label">
                    <strong>Scanner pour plus d'infos</strong>
                    <span>Recettes, allergènes et avis sur <strong>marchedemo.com</strong></span>
                  </div>
                </div>

              </div>

              {/* Right Column Price Hero Block */}
              <div className="mo-poster__price-block" data-digits={priceDigits}>
                
                {/* Old Price crossed out */}
                <div className="mo-poster__old">
                  <span>{oldPriceParts.integer}</span>
                  {oldPriceParts.decimal && <span className="mo-poster__old-currency">{oldPriceParts.decimal}</span>}
                  <span className="mo-poster__old-currency">€</span>
                </div>

                {/* Current Selling Price */}
                <div className="mo-poster__price" data-digits={priceDigits}>
                  <span className="mo-poster__price-integer">{priceParts.integer}</span>
                  {priceParts.decimal && <span className="mo-poster__price-decimal">{priceParts.decimal}</span>}
                  <span className="mo-poster__price-currency">€</span>
                </div>

                <div className="mo-poster__price-label">
                  {format ? format : 'La Pièce'}
                </div>

                {/* Diagonal Ribbon for PROMO */}
                <div className="mo-poster__promo-ribbon">
                  PROMO
                </div>

                {/* Pastille Discount */}
                {discountPct > 0 && (
                  <div className="mo-poster__discount">
                    -{discountPct}%
                  </div>
                )}
                
                {/* Expo Indicator Overlap */}
                {expo && (
                  <div className="absolute top-4 left-4 bg-white text-mo-green-dark border-2 border-mo-gold rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase z-20 shadow-md">
                    EXPO
                  </div>
                )}

              </div>

            </main>

            {/* 3. BOTTOM BAR */}
            <footer className="mo-poster__bottom">
              <div className="mo-poster__bottom-left">
                Votre magasin : <strong>Toulouse Cépière (Hippodrome)</strong>
              </div>
              <div className="mo-poster__bottom-right">
                Le plein de saveurs du monde
              </div>
            </footer>

          </div>
        </div>

        <p className="text-[12.5px] text-neutral-400 italic text-center no-print leading-relaxed">
          L'aperçu reflète fidèlement l'impression physique en A4 Paysage (297 × 210 mm).
        </p>
      </div>
    </div>
  );
}
