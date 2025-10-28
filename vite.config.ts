import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auxios',
      formats: ['es', 'cjs'],
      fileName: (format) => `auxios.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['axios', 'react'],
      output: {
        globals: {
          axios: 'axios',
          react: 'React',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
