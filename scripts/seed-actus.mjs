import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load env vars
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Erreur: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

// 2. Parse frontmatter helper
function parseMarkdownFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContent.match(frontmatterRegex);
  
  if (!match) {
    return { data: {}, content: fileContent };
  }
  
  const frontmatterStr = match[1];
  const bodyContent = fileContent.substring(match[0].length).trim();
  
  const data = {};
  frontmatterStr.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim();
      // Remove surrounding quotes if any
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      data[key] = value;
    }
  });
  
  return { data, content: bodyContent };
}

// Map categories to database types
function mapCategorieToType(cat) {
  if (cat === 'recettes') return 'recette';
  if (cat === 'nouveautes') return 'nouveaute';
  if (cat === 'evenements') return 'evenement';
  return 'article'; // Fallback for promos, engagements, articles
}

async function run() {
  const articlesDir = 'src/content/articles';
  if (!fs.existsSync(articlesDir)) {
    console.error(`Le dossier ${articlesDir} n'existe pas.`);
    return;
  }
  
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
  console.log(`Trouvé ${files.length} article(s) à migrer.`);
  
  const rows = [];
  for (const file of files) {
    const slug = path.basename(file, '.md');
    const filePath = path.join(articlesDir, file);
    const { data, content } = parseMarkdownFile(filePath);
    
    // Normalize date
    let dateStr = new Date().toISOString();
    if (data.date_publication) {
      const d = new Date(data.date_publication);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString();
      }
    }
    
    const type = mapCategorieToType(data.categorie);
    
    rows.push({
      slug,
      type,
      titre: data.titre || slug,
      resume: data.resume || '',
      image: data.image || '',
      image_alt: data.image_alt || '',
      rayon: null,
      date: dateStr,
      href: `/actualites/${slug}`,
      badge_label: data.categorie ? data.categorie.charAt(0).toUpperCase() + data.categorie.slice(1) : '',
      actif: data.actif !== false,
      contenu: content,
      auteur: data.auteur || "L'équipe Marché de Mo'"
    });
  }
  
  console.log("Envoi des données vers Supabase (table actus)...");
  
  const { data: insertedData, error } = await supabase
    .from('actus')
    .upsert(rows, { onConflict: 'slug' })
    .select();
    
  if (error) {
    console.error("Erreur lors de la migration/upsert dans Supabase :");
    console.error(error);
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      console.warn("\n💡 SUGGESTION : Veuillez vous assurer que vous avez exécuté la migration SQL : ");
      console.warn("supabase/migrations/004_add_contenu_and_auteur_to_actus.sql dans votre SQL Editor sur Supabase Studio !");
    }
  } else {
    console.log(`Migration réussie ! ${insertedData?.length ?? 0} article(s) inséré(s) ou mis à jour.`);
  }
}

run();
