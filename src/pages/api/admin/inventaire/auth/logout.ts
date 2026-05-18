export const prerender = false;

import { COOKIE_NAME } from '../../../../../lib/admin/auth.js';

export async function POST({ cookies }: { cookies: any }) {
  cookies.delete(COOKIE_NAME, { path: '/' });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
