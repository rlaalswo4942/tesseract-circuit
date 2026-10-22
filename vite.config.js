import { defineConfig } from 'vite';

// Relative base works for both https://USER.github.io/ and https://USER.github.io/REPO/ (single page, no router).
// Override with BASE_PATH=/repo/ if absolute URLs are ever needed.
export default defineConfig({
  base: process.env.BASE_PATH || './',
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
  test: { include: ['tests/*.test.js'] },
});
