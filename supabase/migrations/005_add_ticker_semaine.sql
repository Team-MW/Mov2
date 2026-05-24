-- ================================================================
-- Migration 005 — Ajout de la colonne ticker_semaine à la table promos
--
-- Permet de spécifier quelle promotion active est affichée sur
-- le bandeau défilant rouge "Offre de la semaine" sous le PromoHero.
-- Une seule promotion peut être sélectionnée à la fois (géré par l'API).
--
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS ticker_semaine BOOLEAN DEFAULT FALSE;

-- Index pour accélérer le lookup du bandeau d'accueil
CREATE INDEX IF NOT EXISTS idx_promos_ticker_semaine ON public.promos(ticker_semaine) WHERE ticker_semaine = true;

-- Commentaire de documentation
COMMENT ON COLUMN public.promos.ticker_semaine IS 'Indique si cette promotion spécifique est affichée sur le bandeau d''accueil (Offre de la semaine).';
