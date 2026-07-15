import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@saiji/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  server: {
    port: 5173,
    // 開発中はワークスペースルートまでのファイルアクセスを許可 (shared 参照のため)
    fs: { allow: [path.resolve(__dirname, '..')] },
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
    },
  },
});
