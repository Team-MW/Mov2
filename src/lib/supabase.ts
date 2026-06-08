/**
 * Supabase clients.
 *
 * Deux clients distincts :
 *  - `supabase`       : anon/publishable key, lecture publique (RLS : actif = true).
 *                       À utiliser dans toutes les pages publiques (SSR).
 *  - `supabaseAdmin`  : service role key, bypasse RLS.
 *                       À utiliser UNIQUEMENT dans /admin ou /api/admin/*.
 *                       Vaut `null` tant que SUPABASE_SERVICE_ROLE_KEY n'est pas défini.
 *
 * Env vars : cf `.env.local` (dev) et Vercel → Settings → Env (prod).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, { auth: { persistSession: false } })
    : (console.warn(
        "[supabase] SUPABASE_URL/ANON_KEY missing — running in fallback mode (Content Collections / local JSON)."
      ),
      null);

/**
 * Client admin — bypasse RLS, UNIQUEMENT côté serveur (pages /admin, API routes).
 * `null` si la SERVICE_ROLE_KEY n'est pas configurée (= phase bootstrap).
 */
export const supabaseAdmin: SupabaseClient | null = serviceKey && url
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

/* ------------------------------------------------------------------ */
/* Types d'enregistrements (miroir du schéma SQL)                      */
/* ------------------------------------------------------------------ */

export type RayonSlug =
  | "boucherie-halal"
  | "fruits-legumes"
  | "epices-du-monde"
  | "saveurs-afrique"
  | "saveurs-asie"
  | "saveur-mediterranee"
  | "saveur-sud-amer"
  | "balkans-turques"
  | "produits-courants"
  | "surgeles"
  | "boulangerie"
  | "produits-laitiers";

export type MagasinSlug = "toulouse-sud";

export interface PromoRow {
  id: string;
  slug: string;
  titre: string;
  description: string | null;
  image_url: string | null;
  prix_original: number;
  prix_promo: number;
  reduction_pct: number;
  rayon: RayonSlug;
  magasin: MagasinSlug;
  date_debut: string;
  date_fin: string;
  mise_en_avant: boolean;
  actif: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export interface ProduitRow {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  image_url: string | null;
  prix_indicatif: number | null;
  unite: string | null;
  rayon: RayonSlug;
  /** Niveau 1 de la taxonomie (ex : "Fruits" pour fruits-legumes). */
  categorie: string | null;
  /** Niveau 2, optionnel (ex : "Dattes" sous "Fruits"). */
  sous_categorie: string | null;
  origine: string | null;
  badge: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export type ActuType = "article" | "recette" | "arrivage" | "nouveaute" | "evenement";

export interface ActuRow {
  id: string;
  slug: string;
  type: ActuType;
  titre: string;
  resume: string;
  image: string;
  image_alt: string;
  rayon: RayonSlug | null;
  date: string;
  href: string;
  badge_label: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}
