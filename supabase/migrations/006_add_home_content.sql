-- ================================================================
-- Migration 006 — Tables de contenu éditorial pour la page d'accueil
--
-- Permet à l'admin d'éditer dynamiquement :
--   - home_editorial_slides : les slides "éditoriales" du PromoHero
--     (Cépière, fidélité, etc.) qui s'intercalent avec les promos.
--   - home_marquee_items : les items du grand marquee défilant
--     ("Saveurs du monde", "Arrivages quotidiens", etc.) entre la
--     grille des rayons et la section actus.
--
-- Les deux tables sont seedées avec les valeurs actuellement
-- hardcodées dans `src/pages/index.astro` afin que la migration soit
-- non-régressive : sitôt déployée, le rendu est identique à avant.
--
-- Idempotent : `create if not exists`, `drop policy if exists`.
-- À exécuter dans Supabase Studio → SQL Editor.
-- ================================================================

-- ---------------------------------------------------------------- --
--  home_editorial_slides                                            --
-- ---------------------------------------------------------------- --
create table if not exists public.home_editorial_slides (
  id            uuid         primary key default uuid_generate_v4(),
  slug          text         unique not null,
  eyebrow       text         default '',
  titre         text         not null,
  description   text         default '',
  image         text         not null,
  image_alt     text         default '',
  cta_label     text         default '',
  cta_href      text         default '',
  /* Hex accent colour used as overlay tint. Default = vert primaire. */
  accent        text         default '#1C6B35',
  ordre         integer      default 0,
  actif         boolean      default true,
  created_at    timestamptz  default now(),
  updated_at    timestamptz  default now()
);

create index if not exists idx_home_slides_actif
  on public.home_editorial_slides(actif) where actif = true;
create index if not exists idx_home_slides_ordre
  on public.home_editorial_slides(ordre);

-- RLS : lecture publique uniquement des slides actives.
alter table public.home_editorial_slides enable row level security;
drop policy if exists "public read active home slides" on public.home_editorial_slides;
create policy "public read active home slides" on public.home_editorial_slides
  for select using (actif = true);

drop trigger if exists touch_home_slides_updated on public.home_editorial_slides;
create trigger touch_home_slides_updated before update on public.home_editorial_slides
  for each row execute procedure public.touch_updated_at();

comment on table public.home_editorial_slides is
  'Slides éditoriales (Cépière, fidélité, etc.) injectées dans le PromoHero après les promos mise_en_avant.';

-- ---------------------------------------------------------------- --
--  home_marquee_items                                               --
-- ---------------------------------------------------------------- --
create table if not exists public.home_marquee_items (
  id            uuid         primary key default uuid_generate_v4(),
  label         text         not null,
  ordre         integer      default 0,
  actif         boolean      default true,
  created_at    timestamptz  default now(),
  updated_at    timestamptz  default now()
);

create index if not exists idx_home_marquee_actif
  on public.home_marquee_items(actif) where actif = true;
create index if not exists idx_home_marquee_ordre
  on public.home_marquee_items(ordre);

alter table public.home_marquee_items enable row level security;
drop policy if exists "public read active marquee" on public.home_marquee_items;
create policy "public read active marquee" on public.home_marquee_items
  for select using (actif = true);

drop trigger if exists touch_home_marquee_updated on public.home_marquee_items;
create trigger touch_home_marquee_updated before update on public.home_marquee_items
  for each row execute procedure public.touch_updated_at();

comment on table public.home_marquee_items is
  'Items du KineticMarquee défilant en signature après le mur des rayons.';

-- ---------------------------------------------------------------- --
--  Seed initial — non-destructif (insert only if missing)           --
-- ---------------------------------------------------------------- --
insert into public.home_editorial_slides
  (slug, eyebrow, titre, description, image, image_alt, cta_label, cta_href, accent, ordre, actif)
values
  (
    'toulouse-sud-cepiere',
    'Dernier-né du Groupe',
    'Toulouse Sud Cépière. Ouvert.',
    '1 200 m² d''espace de vente, rayon Saveurs d''Asie étendu, espace traiteur halal sur place. Votre nouveau rendez-vous au cœur de l''Hippodrome.',
    '/images/magasins/toulouse-sud.jpg',
    'Nouveau magasin Marché de Mo'' Toulouse Sud Cépière',
    'Découvrir le magasin',
    '/magasins/toulouse-sud',
    '#1C6B35',
    0,
    true
  ),
  (
    'fidelite-100-5',
    'Programme fidélité',
    '5€ offerts à chaque 100€.',
    'La carte Marché de Mo'' : un avantage direct, sans condition. Vous faites vos courses, on vous remercie.',
    '/images/rayons/fruits-legumes.jpg',
    'Carte fidélité Marché de Mo''',
    'Rejoindre le programme',
    '/fidelite',
    '#C53030',
    1,
    true
  )
on conflict (slug) do nothing;

insert into public.home_marquee_items (label, ordre, actif) values
  ('Saveurs du monde',              0, true),
  ('Arrivages quotidiens',          1, true),
  ('Boucherie halal sur carcasse',  2, true),
  ('Fruits exotiques',              3, true),
  ('20 000+ références',            4, true),
  ('60 ans d''expérience',          5, true)
on conflict do nothing;
