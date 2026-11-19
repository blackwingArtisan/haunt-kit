import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The landing page at the root of the hosted site. `npm run build:site` builds it into dist/
// (with poster.html beside it) and puts the two apps in dist/ghost-walk/ and dist/spook-hunt/.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    emptyOutDir: true,
    // Two pages: the landing page and the printable posters.
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        poster: fileURLToPath(new URL('poster.html', import.meta.url)),
      },
    },
  },
  preview: { port: 3169, strictPort: true },
});
