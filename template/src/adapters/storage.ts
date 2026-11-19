import { reconcileSession, type SessionState } from '../core/session';
import type { Tour } from '../core/tour';

/** Where progress, drafts and leaderboards are kept. Local only, by design. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();
  get(key: string) {
    return this.data.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
  remove(key: string) {
    this.data.delete(key);
  }
}

/**
 * localStorage, with a memory fallback when storage is blocked (private
 * windows, storage disabled, quota full) so the walk still works for the visit.
 */
export class LocalStorageStore implements KeyValueStore {
  private readonly fallback = new MemoryStore();
  constructor(private readonly prefix = 'haunt-kit:') {}

  private get storage(): Storage | null {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
  get(key: string) {
    try {
      return this.storage?.getItem(this.prefix + key) ?? this.fallback.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }
  set(key: string, value: string) {
    try {
      if (!this.storage) throw new Error('no storage');
      this.storage.setItem(this.prefix + key, value);
    } catch {
      this.fallback.set(key, value);
    }
  }
  remove(key: string) {
    try {
      this.storage?.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
    this.fallback.remove(key);
  }
}

/** Reads and writes JSON values with a parse guard. */
export function readJson<T>(store: KeyValueStore, key: string): T | null {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}

/** Saves and restores a walk so closing the tab never loses progress. */
export class ProgressStore {
  constructor(private readonly store: KeyValueStore) {}

  private key(tourId: string) {
    return `progress:${tourId}`;
  }
  load(tour: Tour): SessionState {
    return reconcileSession(tour, readJson<SessionState>(this.store, this.key(tour.id)));
  }
  save(state: SessionState): void {
    writeJson(this.store, this.key(state.tourId), state);
  }
  clear(tourId: string): void {
    this.store.remove(this.key(tourId));
  }
}
