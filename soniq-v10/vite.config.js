import { defineConfig } from 'vite';

export default defineConfig({
  base: '/soniq/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
