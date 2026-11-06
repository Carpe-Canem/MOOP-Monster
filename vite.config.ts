import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.5 MB
});
