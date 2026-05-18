export const prerender = false;
import { listArticles, createArticle } from '@/lib/inventaire-db.js';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function GET({ url }: { url: URL }) {
  try {
    // Par défaut, on allège la liste pour éviter les photos Base64 lourdes
    // Sauf si ?full=1 est spécifié.
    const full = url.searchParams.get('full') === '1';
    return json({ articles: await listArticles({ lite: !full }) });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();
    if (Array.isArray(data)) {
      const { createArticles } = await import('@/lib/inventaire-db.js');
      const results = await createArticles(data);
      return json({ articles: results, count: results.length }, 201);
    }
    const article = await createArticle(data);
    return json({ article }, 201);
  } catch (e: any) {
    const msg = /UNIQUE.*numero_article/i.test(e.message)
      ? `Le numéro d'article existe déjà.`
      : e.message;
    return json({ error: msg }, 400);
  }
}
