-- ================================================================
-- Migration 009 — Trigger d'unicité pour ticker_semaine
--
-- Remplace la logique applicative (API) fragile par un trigger
-- robuste côté base de données pour garantir qu'une seule promo
-- à la fois peut avoir ticker_semaine = true.
--
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

-- 1. Création de la fonction déclencheur
CREATE OR REPLACE FUNCTION public.enforce_single_ticker_semaine()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la ligne modifiée ou insérée a ticker_semaine = true
  IF NEW.ticker_semaine = true THEN
    -- Mettre ticker_semaine = false sur toutes les autres lignes
    UPDATE public.promos
    SET ticker_semaine = false
    WHERE id <> NEW.id AND ticker_semaine = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Création du Trigger
DROP TRIGGER IF EXISTS trigger_single_ticker_semaine ON public.promos;

CREATE TRIGGER trigger_single_ticker_semaine
BEFORE INSERT OR UPDATE OF ticker_semaine
ON public.promos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_ticker_semaine();

-- Commentaire de documentation
COMMENT ON FUNCTION public.enforce_single_ticker_semaine() IS 'Force l''unicité de ticker_semaine: met à false les autres promos quand une est passée à true.';
