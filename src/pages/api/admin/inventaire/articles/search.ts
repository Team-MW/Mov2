export const prerender = false;
import { findArticleByCode } from '@/lib/inventaire-db.js';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// GET /api/articles/search?q=MDM-260518-742193
// Looks up an article by its numero_article first, then by code_barres.
// Returns the matching article (decorated with `statut`) or null.
//
// Implémentation : on délègue à findArticleByCode() qui fait
//   1) deux .eq() en parallèle côté Postgres (match exact, payload minimal),
//   2) en dernier recours, un scan léger SANS photo_url + un getArticle()
//      pour la seule ligne matchée. Évite de transférer toutes les photos
//      du catalogue à chaque scan de code-barres.
export async function GET({ url }: { url: URL }) {
  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return json({ error: 'Paramètre `q` requis' }, 400);

  try {
    const result = await findArticleByCode(q);
    return json(result);
  } catch (err: any) {
    return json({ error: err.message || 'Erreur de recherche' }, 500);
  }
}
