-- ================================================================
-- Migration 003 — Ajout table actus/blog
--
-- Aggrège différents types de contenu (article, recette, arrivage, nouveauté, événement)
-- sous un affichage uniforme. Permet la gestion dynamique par l'admin.
--
-- Idempotent : `create if not exists`, `drop policy if exists`.
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

create table if not exists public.actus (
  id              uuid         primary key default uuid_generate_v4(),
  slug            text         unique not null,
  type            text         not null check (type in ('article', 'recette', 'arrivage', 'nouveaute', 'evenement')),
  titre           text         not null,
  resume          text         default '',
  image           text         not null,
  image_alt       text         default '',
  rayon           text         check (rayon in (
                    'boucherie-halal','fruits-legumes','epices-du-monde',
                    'saveurs-afrique','saveurs-asie','saveur-mediterranee',
                    'saveur-sud-amer','balkans-turques','produits-courants','surgeles',
                    'boulangerie','produits-laitiers'
                  )),
  date            timestamptz  not null default now(),
  href            text         not null default '',
  badge_label     text         default '',
  actif           boolean      default true,
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Index pour accélérer les tris et filtrages
create index if not exists idx_actus_actif on public.actus(actif) where actif = true;
create index if not exists idx_actus_date on public.actus(date desc);
create index if not exists idx_actus_rayon on public.actus(rayon);

-- Row-Level Security (RLS)
alter table public.actus enable row level security;

-- Lecture publique : uniquement les actus actives
drop policy if exists "public read active actus" on public.actus;
create policy "public read active actus" on public.actus
  for select using (actif = true);

-- Déclencheur updated_at
drop trigger if exists touch_actus_updated on public.actus;
create trigger touch_actus_updated before update on public.actus
  for each row execute procedure public.touch_updated_at();

-- Commentaires de documentation
comment on table public.actus is 'Actualités, blog, arrivages et nouveautés. Lecture publique filtrée (actif = true).';
comment on column public.actus.type is 'Type d''actu : article, recette, arrivage, nouveaute, evenement.';
comment on column public.actus.rayon is 'Rayon associé pour colorer le badge. Optionnel.';
