/**
 * GAM Frontend Proxy Worker
 * Route les requêtes vers le tunnel frontend Next.js
 * et redirige /api vers le backend Django
 */

export interface Env {
  TUNNEL_URL: string;
  BACKEND_WORKER_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Routage API vers le backend
    if (url.pathname.startsWith('/api')) {
      const backendUrl = env.BACKEND_WORKER_URL || 'https://gam-tunnel-back.geniesafriquemedia.workers.dev';
      const targetUrl = new URL(url.pathname + url.search, backendUrl);

      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.set('X-Forwarded-Host', url.host);
      modifiedHeaders.set('X-Forwarded-Proto', 'https');
      modifiedHeaders.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: modifiedHeaders,
        body: request.body,
        redirect: 'manual',
      });

      return fetch(modifiedRequest);
    }

    // Support WebSocket pour HMR (Hot Module Replacement)
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const tunnelUrl = env.TUNNEL_URL;
      if (!tunnelUrl) {
        return new Response('Tunnel URL not configured', { status: 503 });
      }

      const targetUrl = new URL(url.pathname + url.search, tunnelUrl);
      return fetch(new Request(targetUrl.toString(), request));
    }

    // Requêtes normales vers le frontend Next.js
    const tunnelUrl = env.TUNNEL_URL;
    if (!tunnelUrl) {
      return new Response('Frontend tunnel not available. Please start the tunnel.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const targetUrl = new URL(url.pathname + url.search, tunnelUrl);

    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('X-Forwarded-Host', url.host);
    modifiedHeaders.set('X-Forwarded-Proto', 'https');

    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: modifiedHeaders,
      body: request.body,
      redirect: 'manual',
    });

    const response = await fetch(modifiedRequest);

    // Corriger les redirections pour pointer vers le Worker
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        const newHeaders = new Headers(response.headers);
        const locationUrl = new URL(location, tunnelUrl);
        locationUrl.host = url.host;
        locationUrl.protocol = 'https:';
        newHeaders.set('Location', locationUrl.toString());
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    }

    return response;
  },
};
