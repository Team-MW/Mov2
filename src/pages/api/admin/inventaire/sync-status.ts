export const prerender = false;
import { getSyncStatus } from '@/lib/inventaire-db.js';

export async function GET() {
  try {
    const status = await getSyncStatus();
    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
