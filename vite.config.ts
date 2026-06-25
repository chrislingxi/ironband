import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base: './' → 同时适配本地预览与 GitHub Pages 项目站 (chrislingxi.github.io/ironband/)
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@game': resolve(__dirname, 'src/game'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
