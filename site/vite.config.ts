import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The landing page at the root of the hosted site. `npm run build:site` builds it into dist/
// and puts the two apps beside it in dist/ghost-walk/ and dist/spook-hunt/.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: { outDir: fileURLToPath(new URL('../dist', import.meta.url)), emptyOutDir: true },
  preview: { port: 3175, strictPort: true },
});
