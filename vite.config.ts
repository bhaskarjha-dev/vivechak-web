import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: isSsrBuild
      ? {}
      : {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('/three/')) return 'three';
              if (id.includes('/framer-motion/')) return 'motion';
              if (id.includes('/lucide-react/')) return 'icons';
              if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
                return 'react-vendor';
              }
              return undefined;
            },
          },
        },
  },
}));
