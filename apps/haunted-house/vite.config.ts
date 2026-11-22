import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { hauntKitPwa } from '@haunt-kit/template/vite';

const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#14161f"/><circle cx="32" cy="34" r="16" fill="#f2a65a"/><rect x="28" y="12" width="8" height="8" rx="2" fill="#f2a65a"/></svg>';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    hauntKitPwa({
      name: 'Haunted House Party',
      shortName: 'Haunted Hous',
      description: 'Haunted House Party: a GPS-triggered story walk built on Haunt Kit.',
      themeColor: '#14161f',
      backgroundColor: '#14161f',
      iconSvg: icon,
    }),
  ],
  define: {
    __HAUNT_POLLY__: JSON.stringify(false),
  },
  server: { port: 3178, strictPort: true },
  preview: { port: 3179, strictPort: true },
});
