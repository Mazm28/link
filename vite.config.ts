import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@app': r('./src/app'),
      '@core': r('./src/core'),
      '@ui': r('./src/ui'),
      '@infra': r('./src/infra'),
      '@features': r('./src/features'),
      '@tests': r('./tests'),
    },
  },

  define: {
    /* The dev menu can reset and reseed the store. Shipping that control to
     * users would be a defect, so it is compiled out of production builds
     * entirely rather than hidden at runtime. See frontend-components.md 4.6. */
    __DEV_MENU__: JSON.stringify(mode !== 'production'),
  },

  build: {
    /* NFR-P1/NFR-P3: the target is a mid-range Android phone on a constrained
     * Iranian mobile network. es2022 is supported by every browser we care
     * about and avoids shipping transpilation weight for browsers we do not. */
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        /* Route-level code splitting keeps the initial bundle under the
         * 250 KB gzipped budget (NFR-P3). Vendor code changes rarely, so
         * splitting it also preserves cache across app deploys. */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-dates': ['date-fns', 'date-fns-jalali'],
        },
      },
    },
  },

  server: {
    // Honour PORT when something else already holds the default.
    port: Number(process.env['PORT']) || 5173,
    host: true,
  },
}));
