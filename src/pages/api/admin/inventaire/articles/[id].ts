export const prerender = false;
import { updateArticle, deleteArticle, getArticle } from '@/lib/inventaire-db.js';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function GET({ params }: { params: { id: string } }) {
  const article = await getArticle(params.id);
  if (!article) return json({ error: 'Article introuvable' }, 404);
  return json({ article });
}

export async function PUT({ params, request }: { params: { id: string }; request: Request }) {
  try {
    const data = await request.json();
    const article = await updateArticle(params.id, data);
    if (!article) return json({ error: 'Article introuvable' }, 404);
    return json({ article });
  } catch (e: any) {
    return json({ error: e.message }, 400);
  }
}

export async function DELETE({ params }: { params: { id: string } }) {
  const ok = await deleteArticle(params.id);
  return json({ ok }, ok ? 200 : 404);
}
