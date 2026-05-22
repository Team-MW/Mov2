-- ================================================================
-- Migration 004 — Ajout des colonnes contenu et auteur à la table actus
--
-- Permet de stocker le corps de l'article (Markdown/texte) et l'auteur
-- directement dans Supabase afin de rendre les articles entièrement dynamiques
-- et éditables via le panel d'administration.
--
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

ALTER TABLE public.actus ADD COLUMN IF NOT EXISTS contenu TEXT DEFAULT '';
ALTER TABLE public.actus ADD COLUMN IF NOT EXISTS auteur TEXT DEFAULT 'L''équipe Marché de Mo''';

-- Mise à jour des commentaires de documentation
COMMENT ON COLUMN public.actus.contenu IS 'Le contenu textuel complet de l''actualité ou de la recette (formate en Markdown).';
COMMENT ON COLUMN public.actus.auteur IS 'Le nom de l''auteur de l''article.';
