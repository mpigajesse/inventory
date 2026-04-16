/**
 * NAOSERVICES INVENTORY — Backend Proxy Worker
 * URL stable permanente → tunnel éphémère Django
 */

export interface Env {
  TUNNEL_URL: string;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.ngrok-free.app') ||
    origin.endsWith('.ngrok-free.dev') ||
    origin.endsWith('.trycloudflare.com') ||
    origin === 'http://localhost:8080' ||
    origin === 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    if (!env.TUNNEL_URL) {
      return new Response(JSON.stringify({
        error: 'Backend non disponible',
        hint: 'Lancez start-server.bat sur le PC serveur',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, env.TUNNEL_URL);

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
    headers.delete('Host');

    try {
      const response = await fetch(new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'manual',
      }));

      const responseHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Connexion backend échouée',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        hint: 'Vérifiez que Django tourne sur le port 8000',
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
