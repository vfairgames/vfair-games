import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/fake-partner-web',
  server: {
    port: 4400,
    host: 'localhost',
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
  preview: {
    port: 4400,
    host: 'localhost',
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  build: {
    outDir: '../../dist/apps/fake-partner-web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
