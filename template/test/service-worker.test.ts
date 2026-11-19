import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { serviceWorkerSource } from '../src/pwa/vite-plugin';

const ORIGIN = 'https://walk.example.com';
const abs = (u: string) => new URL(u, `${ORIGIN}/`).href;

/** Runs the generated worker in a sandbox with an in-memory Cache Storage and a switchable network. */
function bootWorker(version: string, files: string[], seed: Record<string, Map<string, string>> = {}) {
  const stores = new Map<string, Map<string, string>>(Object.entries(seed));
  let online = true;
  const listeners: Record<string, (e: unknown) => void> = {};
  const url = (r: string | { url: string }) => abs(typeof r === 'string' ? r : r.url);
  const cacheFor = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      addAll: async (list: string[]) => list.forEach((u) => store.set(abs(u), `body of ${abs(u)}`)),
      put: async (r: { url: string }, res: { body: string }) => void store.set(url(r), res.body),
      match: async (r: string | { url: string }) => (store.has(url(r)) ? { ok: true, body: store.get(url(r))!, clone() { return this; } } : undefined),
    };
  };
  const caches = {
    open: async (name: string) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (r: string | { url: string }) => {
      for (const name of stores.keys()) {
        const hit = await cacheFor(name).match(r);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const fetch = async (r: { url: string }) => {
    if (!online) throw new TypeError('Failed to fetch');
    return { ok: true, body: `network ${r.url}`, clone() { return this; } };
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  runInNewContext(serviceWorkerSource(version, files), { self, caches, fetch, URL });

  const dispatch = async (type: string, extra: object = {}) => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]!({ ...extra, waitUntil: (p: Promise<unknown>) => (work = p), respondWith: (p: Promise<unknown>) => (work = p) });
    return work;
  };
  return {
    stores,
    setOnline: (v: boolean) => (online = v),
    install: () => dispatch('install'),
    activate: () => dispatch('activate'),
    get: (path: string, mode = 'cors') =>
      dispatch('fetch', { request: { url: abs(path), method: 'GET', mode } }) as Promise<{ body: string } | undefined>,
  };
}

describe('generated service worker', () => {
  const files = ['./', './assets/app.js', './assets/app.css', './manifest.webmanifest'];

  it('precaches every build file on install', async () => {
    const sw = bootWorker('v1', files);
    await sw.install();
    expect([...sw.stores.get('haunt-kit-v1')!.keys()]).toEqual(files.map(abs));
  });

  it('serves pages from the network when online and the cached shell when offline', async () => {
    const sw = bootWorker('v1', files);
    await sw.install();
    expect((await sw.get('/?speed=20', 'navigate'))?.body).toBe(`network ${abs('/?speed=20')}`);
    sw.setOnline(false);
    expect((await sw.get('/?speed=20', 'navigate'))?.body).toBe(`body of ${abs('./')}`);
  });

  it('serves assets from the cache first, even offline', async () => {
    const sw = bootWorker('v1', files);
    await sw.install();
    sw.setOnline(false);
    expect((await sw.get('/assets/app.js'))?.body).toBe(`body of ${abs('./assets/app.js')}`);
  });

  it('removes caches left by older builds but leaves other caches alone', async () => {
    const sw = bootWorker('v2', files, { 'haunt-kit-v1': new Map(), 'someone-else': new Map() });
    await sw.install();
    await sw.activate();
    expect([...sw.stores.keys()].sort()).toEqual(['haunt-kit-v2', 'someone-else']);
  });
});
