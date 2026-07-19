/**
 * Dynamic /ads.txt for Vercel — required by Google AdSense guidelines.
 *
 * The AdSense Publisher ID is admin-configurable (Supabase `app_settings`),
 * not a build-time constant, so this rebuilds live instead of shipping a
 * stale static file. See `api/sitemap.ts` for the sibling pattern.
 */

export const config = {
  runtime: 'edge',
};

const AUTHORIZED_SELLER_ID = 'f08c47fec0942fa0';

function supabaseCreds(): { url: string; key: string } | null {
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

function isValidPublisherId(publisherId: string): boolean {
  const id = publisherId.trim();
  if (!id || id === 'pub-0000000000000000') return false;
  return /^(ca-)?pub-\d{10,20}$/.test(id);
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=0, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const creds = supabaseCreds();
  if (!creds) {
    // No ads configured / no env → empty ads.txt is valid and avoids a 404.
    return textResponse('');
  }

  try {
    const response = await fetch(
      `${creds.url}/rest/v1/app_settings?key=eq.adsense_publisher_id&select=value`,
      {
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );
    if (!response.ok) return textResponse('');

    const rows = (await response.json()) as { value?: string }[];
    const publisherId = (rows[0]?.value || '').trim();
    if (!isValidPublisherId(publisherId)) return textResponse('');

    const pubId = publisherId.startsWith('ca-') ? publisherId.slice(3) : publisherId;
    return textResponse(`google.com, ${pubId}, DIRECT, ${AUTHORIZED_SELLER_ID}\n`);
  } catch {
    return textResponse('');
  }
}
