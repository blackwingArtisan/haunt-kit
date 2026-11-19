import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { hauntKitPwa } from '@haunt-kit/template/vite';

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1d1030"/><path d="M32 18c-3-6-2-9 1-11" stroke="#a6f15b" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="38" rx="22" ry="18" fill="#ff7518"/><path d="M21 34l5-6 5 6zM33 34l5-6 5 6zM20 44c6 6 18 6 24 0l-4 1-2 3-3-3-3 3-3-3-3 3-2-3z" fill="#1d1030"/></svg>`;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    hauntKitPwa({
      name: 'Spook Hunt',
      shortName: 'Spook Hunt',
      description: 'A Halloween scavenger hunt for your own street or yard.',
      themeColor: '#1d1030',
      backgroundColor: '#1d1030',
      iconSvg: icon,
    }),
  ],
  define: {
    __HAUNT_POLLY__: JSON.stringify(false),
  },
  server: { port: 3172, strictPort: true },
  preview: { port: 3173, strictPort: true },
});
