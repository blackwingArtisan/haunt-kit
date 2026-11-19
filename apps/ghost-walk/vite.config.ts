import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { hauntKitPwa } from '@haunt-kit/template/vite';

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0c0e13"/><path d="M32 10c9 0 16 7 16 17v25l-5-4-5 4-6-4-6 4-5-4-5 4V27c0-10 7-17 16-17z" fill="#ece3cf"/><circle cx="26" cy="28" r="3.5" fill="#0c0e13"/><circle cx="38" cy="28" r="3.5" fill="#0c0e13"/><circle cx="50" cy="12" r="5" fill="#ff8a3d"/></svg>`;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    hauntKitPwa({
      name: 'Des Moines After Dark',
      shortName: 'After Dark',
      description: 'A self-guided haunted walk through downtown Des Moines.',
      themeColor: '#0c0e13',
      backgroundColor: '#0c0e13',
      iconSvg: icon,
    }),
  ],
  define: {
    // Build-time switch: only a VITE_HAUNT_NARRATOR=polly build bundles the AWS SDK.
    __HAUNT_POLLY__: JSON.stringify(process.env.VITE_HAUNT_NARRATOR === 'polly'),
  },
  server: { port: 3170, strictPort: true },
  preview: { port: 3171, strictPort: true },
});
