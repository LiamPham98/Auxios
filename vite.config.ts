import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: false, // We'll handle this manually
      rollupTypes: true,
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      outDir: 'dist',
      include: ['src/**/*'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        core: resolve(__dirname, 'src/core.ts'),
        storage: resolve(__dirname, 'src/storage.ts'),
        react: resolve(__dirname, 'src/react.ts'),
        utils: resolve(__dirname, 'src/utils.ts'),
      },
      name: 'Auxios',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['axios', 'react'],
      output: {
        globals: {
          axios: 'axios',
          react: 'React',
        },
        // Better tree-shaking
        compact: true,
        generatedCode: 'es2015',
        // Preserve modules structure for better tree-shaking
        preserveModules: false,
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'es2020',
    // Enable CSS code splitting (not relevant for this library but good practice)
    cssCodeSplit: true,
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    // Enable rollup logging for debugging
    reportCompressedSize: false,
  },
  // Define global constants for better tree-shaking
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});
