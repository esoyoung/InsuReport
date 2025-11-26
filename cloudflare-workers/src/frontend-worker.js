/**
 * Cloudflare Workers Sites - Frontend Worker
 * Serves static files from dist/ directory
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      // Serve static assets from dist/
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
        }
      );
    } catch (error) {
      // Fallback to index.html for SPA routing
      if (error.status === 404) {
        try {
          const indexRequest = new Request(
            new URL('/index.html', request.url),
            request
          );
          return await getAssetFromKV(
            {
              request: indexRequest,
              waitUntil: ctx.waitUntil.bind(ctx),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
            }
          );
        } catch (e) {
          return new Response('Not Found', { status: 404 });
        }
      }

      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
