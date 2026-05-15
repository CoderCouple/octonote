import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // TEMPORARY: disable minification while diagnosing the BlockNote renderSpec
  // crash so stack traces have readable function names.
  build: {
    minify: false,
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4242',
      '/ws': {
        target: 'ws://localhost:4242',
        ws: true,
      },
    },
  },
});
