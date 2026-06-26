import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

// 单文件自包含构建: 所有 JS 内联进一个 index.html。
// 这样 GitHub Pages「从分支根目录」发布时, 根目录的 index.html 即可独立运行,
// 彻底绕开 base 路径 / 源码vs产物 的问题。
// 入口为 web/index.html (与根目录的"已构建产物 index.html"分离, 避免互相覆盖)。
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@game': resolve(__dirname, 'src/game'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'web/index.html'),
    },
  },
});
