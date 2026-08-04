/**
 * worker-entry.js — Cloudflare Pages Advanced Mode entry point
 *
 * Bundled by `node build.js` (esbuild) into `_worker.js`.
 * Wraps the Express app with Cloudflare's httpServerHandler.
 *
 * Requires: compatibility_flags = ["nodejs_compat"] in wrangler.toml
 */

import { httpServerHandler } from 'cloudflare:node';
import app from './server.js';

// Cloudflare Pages / Workers fetch handler
export default {
  fetch: httpServerHandler(app),
};
