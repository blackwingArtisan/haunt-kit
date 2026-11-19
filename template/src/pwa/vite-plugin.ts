import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

export interface HauntKitPwaOptions {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  /** SVG markup for the app icon (used for the favicon and the install icon). */
  iconSvg: string;
}

/**
 * Makes a Haunt Kit app installable and offline-capable with no extra
 * dependencies: writes a web manifest, an SVG icon and a service worker that
 * precaches every file of the build. A walk keeps working when the signal
 * drops between buildings.
 */
export function hauntKitPwa(options: HauntKitPwaOptions): Plugin {
  return {
    name: 'haunt-kit-pwa',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', href: './icon.svg', type: 'image/svg+xml' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: options.themeColor }, injectTo: 'head' },
      ];
    },
    generateBundle(_, bundle) {
      const manifest = {
        name: options.name,
        short_name: options.shortName,
        description: options.description,
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: options.themeColor,
        background_color: options.backgroundColor,
        icons: [{ src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      };
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) });
      this.emitFile({ type: 'asset', fileName: 'icon.svg', source: options.iconSvg });

      const files = ['./', ...Object.keys(bundle).map((f) => `./${f}`), './manifest.webmanifest', './icon.svg'].filter(
        (f) => !f.endsWith('.map'),
      );
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(version, files) });
    },
  };
}

/** The service worker, as source text. Exported for tests. */
export function serviceWorkerSource(version: string, files: string[]): string {
  return `// Haunt Kit service worker. Generated at build time; do not edit.
const CACHE = 'haunt-kit-${version}';
const PRECACHE = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('haunt-kit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Network first for pages so updates arrive; the cached shell when offline.
    event.respondWith(
      fetch(req).catch(() => caches.match('./', { ignoreSearch: true, ignoreVary: true }).then((r) => r || caches.match(req, { ignoreVary: true }))),
    );
    return;
  }
  event.respondWith(
    // ignoreVary: module scripts are requested with an Origin header, the precache without one.
    caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
      return res;
    })),
  );
});
`;
}
