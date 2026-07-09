import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  return {
    base: mode === 'production' ? '/georgia-speedtest-map/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            if (id.includes('Sidebar')) return 'sidebar';
            if (id.includes('Legend')) return 'legend';
            if (id.includes('MapComponent')) return 'map';
          }
        }
      }
    },
    server: {
      port: 3000,
      host: "0.0.0.0",
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: "0.0.0.0",
      allowedHosts: true,
    }
  };
});
