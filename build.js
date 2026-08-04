/**
 * build.js — Bundle the Express app for Cloudflare Pages
 *
 * Uses esbuild to bundle server.js + all dependencies into a single _worker.js
 * that Cloudflare Pages Advanced Mode can deploy.
 *
 * Run: node build.js
 */

const esbuild = require('esbuild');
const path    = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, '_worker.js')],
  bundle:      true,
  outfile:     path.join(__dirname, '_worker.bundle.js'),
  platform:    'browser',     // Workers are browser-like, not Node
  format:      'esm',
  target:      'es2022',
  external: [
    // Cloudflare-native — do NOT bundle these
    'cloudflare:node',
    '__STATIC_CONTENT_MANIFEST',
  ],
  // Mark Node built-ins as external — nodejs_compat provides them at runtime
  packages: 'external',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
}).then(() => {
  console.log('\n✅ Build complete → _worker.bundle.js');
  console.log('   Deploy via: wrangler pages deploy .');
}).catch((err) => {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
});
