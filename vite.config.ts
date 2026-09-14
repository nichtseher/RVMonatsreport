import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {readFileSync} from 'fs';
import {defineConfig} from 'vite';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(() => {
  return {
    base: './',
    // Versionsnummer aus package.json, damit sie nur an EINER Stelle gepflegt wird
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify -- file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // ExcelJS ist der groesste Brocken, wird aber dynamisch nachgeladen und
      // nicht mitgestartet. Der frueher hier stehende manuelle xlsx-Chunk ist
      // mit dem Ausbau von SheetJS (0.9.33) gegenstandslos geworden.
      chunkSizeWarningLimit: 1500
    }
  };
});
