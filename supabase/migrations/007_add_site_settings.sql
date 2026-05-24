-- ================================================================
-- Migration 007 — Table de configuration globale site_settings
--
-- Permet à l'administration d'ajuster dynamiquement :
--   - Le title tag de la page d'accueil (home_seo_title)
--   - La meta description de la page d'accueil (home_seo_description)
--   - L'image de partage social / Open Graph de la page d'accueil (home_seo_og_image)
--
-- RLS : Lecture publique autorisée. Écriture réservée au service_role.
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

create table if not exists public.site_settings (
  key           text         primary key,
  value         text         not null,
  description   text         default '',
  created_at    timestamptz  default now(),
  updated_at    timestamptz  default now()
);

-- RLS Settings
alter table public.site_settings enable row level security;
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings
  for select using (true);

-- Updated_at trigger
drop trigger if exists touch_site_settings_updated on public.site_settings;
create trigger touch_site_settings_updated before update on public.site_settings
  for each row execute procedure public.touch_updated_at();

comment on table public.site_settings is 'Table de configuration clé-valeur globale pour le comportement et le SEO du site.';

-- Seed initial SEO values from public site defaults
insert into public.site_settings (key, value, description) values
  ('home_seo_title', 'Marché de Mo'' — Plus grand supermarché ethnique d''Occitanie · Toulouse', 'Titre de la page d''accueil (Title tag)'),
  ('home_seo_description', 'Boucherie halal sur carcasse, fruits & légumes exotiques, épices du monde — Toulouse. Ouvert 7j/7, même dimanche matin.', 'Description de la page d''accueil (Meta description)'),
  ('home_seo_og_image', '/logos/logo-marchedemo-rond-contourgreen.png', 'Image de partage social Open Graph pour la page d''accueil')
on conflict (key) do nothing;
