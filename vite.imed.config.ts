import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// ============================================================
// iMED — დამოუკიდებელი build კონფიგი (IMED458/iMED რეპოსთვის)
// base: /iMED/  ·  მხოლოდ iMED აპლიკაცია
// ============================================================
export default defineConfig({
  base: '/iMED/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'imed/index.html'),
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
