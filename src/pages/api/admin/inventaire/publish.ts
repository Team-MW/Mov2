export const prerender = false;
import { getArticle } from '@/lib/inventaire-db.js';
import { supabaseAdmin } from '@/lib/supabase';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function POST({ request }: { request: Request }) {
  try {
    const { id } = await request.json();
    if (!id) return json({ error: "ID manquant" }, 400);

    if (!supabaseAdmin) {
      return json({ error: "Configuration Supabase manquante (service_role)" }, 500);
    }

    // 1. Lire l'article depuis l'inventaire
    const article = await getArticle(id);
    if (!article) return json({ error: "Article non trouvé dans l'inventaire" }, 404);

    // 2. Préparer les données pour le catalogue
    // Générer un slug si absent ou basé sur le nom
    const slug = article.code_barres || `prod-${article.id}`;
    
    const catalogData = {
      slug: slug,
      nom: article.nom_produit || "Produit sans nom",
      description: article.description || "",
      image_url: article.photo_url || null,
      prix_indicatif: article.prix_vente || null,
      rayon: article.rayon,
      actif: true, // Par défaut actif dans le catalogue
      ordre: 0,    // Par défaut en haut ou trié plus tard
    };

    // 3. Insérer dans le catalogue (Supabase 1)
    const { data, error } = await supabaseAdmin
      .from('produits')
      .upsert(catalogData, { onConflict: 'slug' }) // Upsert basé sur le slug (code-barres)
      .select('*')
      .single();

    if (error) {
      console.error("Erreur d'insertion catalogue:", error);
      return json({ error: `Erreur d'insertion : ${error.message}` }, 500);
    }

    return json({ success: true, product: data }, 200);
  } catch (e: any) {
    console.error("Erreur publish API:", e);
    return json({ error: e.message }, 500);
  }
}
