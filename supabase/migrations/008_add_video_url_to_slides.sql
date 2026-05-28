-- ================================================================
-- Migration 008 — Ajoute la colonne video_url à home_editorial_slides
--
-- Permet à l'administration d'associer un fichier vidéo Cloudinary
-- à n'importe quelle slide éditoriale de la page d'accueil.
--
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

alter table public.home_editorial_slides add column if not exists video_url text default null;
comment on column public.home_editorial_slides.video_url is 'URL Cloudinary du fichier vidéo (MP4/WebM) optionnel pour la slide.';
