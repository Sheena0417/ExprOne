import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    watch: {
      include: 'src/**',
      exclude: 'node_modules/**',
      // Rollup の他の watch オプションもここに追記可能
    },
    lib: {
      entry: 'src/expressionControl.js',
      name: 'MyBundle',
      fileName: () => 'out.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
