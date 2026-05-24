// ====================================================================
// scripts/seed-settings.mjs
//
// Seed initial settings into the public.site_settings table in Supabase.
//
// Usage :
//   1. Lancer :
//        node --env-file=.env.local scripts/seed-settings.mjs
// ====================================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Missing env vars. Required: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.\n" +
      "   Run with:  node --env-file=.env.local scripts/seed-settings.mjs"
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_SETTINGS = [
  {
    key: "home_seo_title",
    value: "Marché de Mo' — Plus grand supermarché ethnique d'Occitanie · Toulouse",
    description: "Titre de la page d'accueil (Title tag)"
  },
  {
    key: "home_seo_description",
    value: "Boucherie halal sur carcasse, fruits & légumes exotiques, épices du monde — Toulouse. Ouvert 7j/7, même dimanche matin.",
    description: "Description de la page d'accueil (Meta description)"
  },
  {
    key: "home_seo_og_image",
    value: "/logos/logo-marchedemo-rond-contourgreen.png",
    description: "Image de partage social Open Graph pour la page d'accueil"
  }
];

async function seedSettings() {
  console.log(`\n▶ Seeding site_settings into Supabase...\n`);

  let ok = 0;
  let ko = 0;

  for (const s of DEFAULT_SETTINGS) {
    const { error } = await sb.from("site_settings").upsert(s, { onConflict: "key" });
    if (error) {
      if (error.code === "PGRST204" || error.message.includes("does not exist")) {
        console.error("❌ Table public.site_settings not found.");
        console.error("   Please execute the migration 'supabase/migrations/007_add_site_settings.sql' first.");
        process.exit(1);
      }
      console.error(`  ❌ ${s.key} → ${error.message}`);
      ko++;
    } else {
      console.log(`  ✓  ${s.key} → seeded`);
      ok++;
    }
  }

  console.log(`\n✓ Done. ${ok} seeded, ${ko} failed.`);
}

try {
  await seedSettings();
} catch (err) {
  console.error("❌ Seed failed:", err);
  process.exit(1);
}
