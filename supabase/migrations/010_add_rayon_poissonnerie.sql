-- Ajoute les rayons « poissonnerie » et « cremerie » aux contraintes CHECK des tables
-- promos, produits et actus (cf. src/lib/site.ts → RAYONS).

do $$
declare
  t text;
  c text;
begin
  foreach t in array array['promos', 'produits', 'actus'] loop
    for c in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = t
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%rayon%boucherie-halal%'
    loop
      execute format('alter table public.%I drop constraint %I', t, c);
    end loop;
  end loop;
end $$;

alter table public.promos add constraint promos_rayon_check check (rayon in (
  'boucherie-halal','fruits-legumes','poissonnerie','epices-du-monde',
  'cremerie','saveurs-afrique','saveurs-asie','saveur-mediterranee',
  'saveur-sud-amer','balkans-turques','produits-courants','surgeles',
  'boulangerie','produits-laitiers'
));

alter table public.produits add constraint produits_rayon_check check (rayon in (
  'boucherie-halal','fruits-legumes','poissonnerie','epices-du-monde',
  'cremerie','saveurs-afrique','saveurs-asie','saveur-mediterranee',
  'saveur-sud-amer','balkans-turques','produits-courants','surgeles',
  'boulangerie','produits-laitiers'
));

alter table public.actus add constraint actus_rayon_check check (rayon is null or rayon in (
  'boucherie-halal','fruits-legumes','poissonnerie','epices-du-monde',
  'cremerie','saveurs-afrique','saveurs-asie','saveur-mediterranee',
  'saveur-sud-amer','balkans-turques','produits-courants','surgeles',
  'boulangerie','produits-laitiers'
));
