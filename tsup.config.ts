import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
  },
  {
    entry: ['src/vue/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/vue',
    external: ['vue', '@novasynx/storefront-sdk'],
  },
  {
    entry: ['src/react/index.tsx'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/react',
    external: ['react', '@novasynx/storefront-sdk'],
  },
])
