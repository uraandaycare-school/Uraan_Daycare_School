/**
 * build.js — Bundle the Express app for Cloudflare Pages
 *
 * Bundles worker-entry.js + all dependencies into _worker.js
 * which Cloudflare Pages Advanced Mode picks up automatically.
 *
 * Run: node build.js
 */

const esbuild = require('esbuild');
const path    = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'worker-entry.js')],
  bundle:      true,
  outfile:     path.join(__dirname, '_worker.js'),
  platform:    'browser',   // Workers use the browser-like runtime
  format:      'esm',
  target:      'es2022',

  // Cloudflare-native modules — provided by the runtime, do NOT bundle
  external: [
    'cloudflare:node',
    '__STATIC_CONTENT_MANIFEST',
  ],

  // All npm packages are external — nodejs_compat provides Node built-ins at runtime
  // and node_modules are available in the Pages deployment
  packages: 'external',

  define: {
    'process.env.NODE_ENV': '"production"',
  },

  logLevel: 'info',
}).then(() => {
  console.log('\n✅ Build complete → _worker.js');
  console.log('   Cloudflare Pages will automatically use _worker.js (Advanced Mode).');
}).catch((err) => {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
});
