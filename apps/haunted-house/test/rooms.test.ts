import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRoomIndex, normalizeRoomCode, roomLink } from '@haunt-kit/template/adapters';
import { haversine, parseTour } from '@haunt-kit/template/core';
import { house, POSTER_LINES, ROOM_CODES } from '../src/rooms';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = join(appDir, '..', '..');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('the house tour', () => {
  it('parses again without change and has six rooms (Req 5.3)', () => {
    expect(parseTour(house)).toEqual(house);
    expect(house.stops).toHaveLength(6);
  });

  it('marks every room as fiction, with no sources to cite (Req 7.2)', () => {
    for (const stop of house.stops) {
      expect(stop.kind, stop.id).toBe('fiction');
      expect(stop.sources, stop.id).toEqual([]);
    }
  });

  it('gives every room a clue and a story (Req 5.2)', () => {
    for (const stop of house.stops) {
      expect(stop.clue, stop.id).toBeTruthy();
      expect(stop.story.length, stop.id).toBeGreaterThanOrEqual(1);
      expect(stop.story.length, stop.id).toBeLessThanOrEqual(2);
    }
  });

  it('has valid, unique codes, one per room, and no code for anything else (Req 1.1, 1.3)', () => {
    expect(Object.keys(ROOM_CODES).sort()).toEqual(house.stops.map((s) => s.id).sort());
    for (const code of Object.values(ROOM_CODES)) expect(normalizeRoomCode(code)).toEqual({ ok: true, code });
    expect(new Set(Object.values(ROOM_CODES)).size).toBe(house.stops.length);
    expect(() => createRoomIndex(house, ROOM_CODES)).not.toThrow();
  });

  it('keeps rooms more than 1.3 radii apart, so a scan enters one room only (Req 4.5)', () => {
    for (const a of house.stops) {
      for (const b of house.stops) {
        if (a.id !== b.id) expect(haversine(a.position, b.position), `${a.id} to ${b.id}`).toBeGreaterThan(1.3 * Math.max(a.radius, b.radius));
      }
    }
  });

  it('has an in-character poster line for every room (Req 6.2)', () => {
    for (const stop of house.stops) {
      const line = POSTER_LINES[stop.id as keyof typeof POSTER_LINES];
      expect(line, stop.id).toBeTruthy();
      expect(line.length, stop.id).toBeGreaterThan(20);
    }
  });

  it('uses the ordering rules the design names: the Attic needs the Library, the Cellar is the finale (Req 4.6)', () => {
    expect(house.ordering).toBe('free');
    expect(house.stops.find((s) => s.id === 'attic')!.requires).toEqual(['library']);
    expect(house.stops.filter((s) => s.finale).map((s) => s.id)).toEqual(['cellar']);
  });

  it('sits on an invented floor plan near latitude 0, longitude 0, not at a real address (Req 7.3)', () => {
    for (const stop of house.stops) {
      expect(Math.abs(stop.position.lat), stop.id).toBeLessThan(0.01);
      expect(Math.abs(stop.position.lng), stop.id).toBeLessThan(0.01);
    }
  });

  it('says on its credits line that everything is made up (Req 7.1)', () => {
    expect(house.credits).toBe('Every room, story and ghost here is made up for this game.');
  });

  it('turns every code into a poster link that round-trips (Req 2.1)', () => {
    for (const code of Object.values(ROOM_CODES)) {
      expect(roomLink('https://party.example.com/house/', code)).toBe(`https://party.example.com/house/#/room/${code}`);
    }
  });
});

describe('the app package', () => {
  const pkg = readJson(join(appDir, 'package.json'));

  it('pins qrcode to the exact version the scavenger hunt uses (Req 9.7)', () => {
    const hunt = readJson(join(rootDir, 'apps', 'scavenger-hunt', 'package.json'));
    expect(pkg.dependencies.qrcode).toBe(hunt.dependencies.qrcode);
    expect(pkg.dependencies.qrcode).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('uses dev port 3178 and preview port 3179 (Req 9.3)', () => {
    expect(pkg.scripts.dev).toContain('--port 3178');
    expect(pkg.scripts.preview).toContain('--port 3179');
  });

  it('is listed in the root workspaces (Req 9.8)', () => {
    expect(readJson(join(rootDir, 'package.json')).workspaces).toContain('apps/haunted-house');
  });

  it('imports only from @haunt-kit/template entry points, and never from deep paths (Req 9.3)', () => {
    const entryPoints = ['core', 'adapters', 'react', 'pwa', 'vite', 'styles.css'];
    const files = sourceFiles(join(appDir, 'src'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)) {
        const spec = match[1] ?? match[2]!;
        if (spec.startsWith('@haunt-kit/template/')) expect(entryPoints, `${file}: ${spec}`).toContain(spec.slice('@haunt-kit/template/'.length));
        expect(spec, file).not.toMatch(/template\/src|\.\.\/\.\.\/template/);
      }
    }
  });
});
