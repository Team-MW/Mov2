export const prerender = false;

import {
  getRoleForCode,
  makeSessionToken,
  COOKIE_NAME,
  SESSION_TTL_MS,
} from '../../../../../lib/admin/auth.js';

export async function POST({ request, url, cookies }: { request: Request; url: URL; cookies: any }) {
  let code = '';
  try {
    const data = await request.json();
    code = String(data?.code ?? '').trim();
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // Format attendu : 6 chiffres exactement
  const role = getRoleForCode(code);
  if (!/^\d{6}$/.test(code) || !role) {
    return new Response(JSON.stringify({ error: 'invalid_code' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const token = makeSessionToken(role);
  const secure = url.protocol === 'https:';
  
  cookies.set(COOKIE_NAME, token, {
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });

  return new Response(
    JSON.stringify({ ok: true, expiresIn: SESSION_TTL_MS }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
}
