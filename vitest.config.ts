import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/* No @vitejs/plugin-react here on purpose. Its only job in tests would be fast
 * refresh, which nothing uses, and vitest bundles its own Vite major — passing
 * a plugin built against the app's Vite across that boundary is a type error
 * with no runtime benefit. JSX is transformed by esbuild from the `jsx`
 * setting in tsconfig.json. */
export default defineConfig({
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
    __DEV_MENU__: JSON.stringify(true),
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,pbt.test}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
});
