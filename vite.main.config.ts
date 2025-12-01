import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: {
        main: 'electron/main.ts',
        preload: 'electron/preload.ts',
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.cjs`,
    },
    outDir: 'dist-electron',
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        'simple-git',
        'adm-zip',
        'axios'
      ],
    },
    emptyOutDir: true,
    minify: false,
  },
});
