import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defineTour } from '../src/core';
import {
  appNameProblem,
  choosePorts,
  CreateAppError,
  createAppFiles,
  defaultAppName,
  folderNameProblem,
  nextSteps,
  workspaceEntry,
  type CreateAppOptions,
} from '../scripts/create-app-files';

const starterApp = readFileSync(new URL('../starter/StarterApp.tsx', import.meta.url), 'utf8');
const starterTour = readFileSync(new URL('../starter/starter-tour.ts', import.meta.url), 'utf8');

const options = (extra: Partial<CreateAppOptions> = {}): CreateAppOptions => ({
  folder: 'river-walk',
  name: 'River Walk',
  ports: { dev: 3174, preview: 3175 },
  starterApp,
  starterTour,
  versions: { template: '0.1.0', react: '19.3.1', reactDom: '19.3.1' },
  existingFolders: ['ghost-walk', 'scavenger-hunt'],
  existingPackageNames: ['@haunt-kit/ghost-walk', '@haunt-kit/scavenger-hunt'],
  ...extra,
});

/** Runs the generated tour file (plain object literal, no type syntax) and returns the parsed tour. */
function evaluateTour(source: string) {
  const body = source.replace(/^import .*$/m, '').replace('export const starterTour =', 'return');
  return new Function('defineTour', body)(defineTour);
}

describe('create-app file map', () => {
  it('builds a working Vite app from the starter', () => {
    const files = createAppFiles(options());
    expect(Object.keys(files).sort()).toEqual(['index.html', 'package.json', 'src/StarterApp.tsx', 'src/main.tsx', 'src/starter-tour.ts', 'vite.config.ts']);

    const pkg = JSON.parse(files['package.json']!);
    expect(pkg.name).toBe('@haunt-kit/river-walk');
    expect(pkg.scripts).toEqual({
      dev: 'vite --port 3174 --strictPort',
      build: 'vite build',
      preview: 'vite preview --port 3175 --strictPort',
    });
    expect(pkg.dependencies).toEqual({ '@haunt-kit/template': '0.1.0', react: '19.3.1', 'react-dom': '19.3.1' });

    expect(files['vite.config.ts']).toContain("from '@haunt-kit/template/vite'");
    expect(files['vite.config.ts']).toContain('hauntKitPwa({');
    expect(files['vite.config.ts']).toContain("name: 'River Walk'");
    expect(files['vite.config.ts']).toContain('server: { port: 3174, strictPort: true }');
    expect(files['vite.config.ts']).toContain('preview: { port: 3175, strictPort: true }');
    expect(files['vite.config.ts']).toContain('__HAUNT_POLLY__: JSON.stringify(false)');

    expect(files['src/main.tsx']).toContain("import { StarterApp } from './StarterApp'");
    expect(files['src/main.tsx']).toContain('registerServiceWorker({ enabled: import.meta.env.PROD })');
    expect(files['index.html']).toContain('<title>River Walk</title>');
    expect(files['index.html']).toContain('src="/src/main.tsx"');
  });

  it('imports only from package entry points, never from deep paths', () => {
    const files = createAppFiles(options());
    for (const [path, text] of Object.entries(files)) {
      if (!/\.(ts|tsx)$/.test(path)) continue;
      expect(text, path).not.toMatch(/from '\.\.\//);
      expect(text, path).not.toMatch(/@haunt-kit\/template\/(src|starter)/);
    }
    expect(files['src/StarterApp.tsx']).toContain("from '@haunt-kit/template/adapters'");
    expect(files['src/StarterApp.tsx']).toContain("from '@haunt-kit/template/react'");
    expect(files['src/StarterApp.tsx']).toContain("new LocalStorageStore('river-walk:')");
    expect(files['src/starter-tour.ts']).toContain("from '@haunt-kit/template/core'");
  });

  it('defaults the tour name from the folder', () => {
    expect(defaultAppName('river-walk')).toBe('River Walk');
    const files = createAppFiles(options({ name: undefined, folder: 'ghost-road' }));
    expect(files['index.html']).toContain('<title>Ghost Road</title>');
    expect(evaluateTour(files['src/starter-tour.ts']!).title).toBe('Ghost Road');
  });

  it('generates a tour that passes the tour schema, even for a name with quotes and backslashes', () => {
    for (const name of ['River Walk', `Dana's "Night" Walk \\ part 2`, 'Ünïcode <Walk> & more']) {
      const files = createAppFiles(options({ name }));
      const tour = evaluateTour(files['src/starter-tour.ts']!);
      expect(tour.title).toBe(name);
      expect(tour.id).toBe('river-walk');
      expect(tour.stops).toHaveLength(3);
      expect(files['vite.config.ts']).toContain('hauntKitPwa');
    }
    expect(createAppFiles(options({ name: 'A <b> & "c"' }))['index.html']).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
  });

  it('keeps the starter tour source identical apart from the id, title and import', () => {
    const files = createAppFiles(options());
    const normalize = (s: string) =>
      s.replace("from '../src/core'", 'X').replace("from '@haunt-kit/template/core'", 'X').replace("'my-first-walk'", 'ID').replace("'River Walk'", 'T').replace("'My First Walk'", 'T').replace("'river-walk'", 'ID');
    expect(normalize(files['src/starter-tour.ts']!)).toBe(normalize(starterTour));
  });
});

describe('create-app validation', () => {
  it('accepts kebab-case folder names and rejects everything else with a reason', () => {
    for (const ok of ['river-walk', 'a1', 'trail2-night']) expect(folderNameProblem(ok), ok).toBeNull();
    for (const bad of ['', 'River', 'river walk', 'river_walk', '-river', 'river-', 'river--walk', '1river', '../evil', 'a/b', 'a.b', 'x'.repeat(41), 'node_modules', 'dist']) {
      expect(folderNameProblem(bad), bad).toEqual(expect.any(String));
      expect(() => createAppFiles(options({ folder: bad })), bad).toThrow(CreateAppError);
    }
    expect(folderNameProblem(undefined)).toEqual(expect.any(String));
  });

  it('rejects empty, long and multi-line tour names', () => {
    expect(appNameProblem('River Walk')).toBeNull();
    for (const bad of ['', '   ', 'x'.repeat(61), 'two\nlines', 'tab\there']) {
      expect(appNameProblem(bad), JSON.stringify(bad)).toEqual(expect.any(String));
      expect(() => createAppFiles(options({ name: bad }))).toThrow(CreateAppError);
    }
  });

  it('refuses to overwrite an existing folder, ignoring letter case', () => {
    expect(() => createAppFiles(options({ folder: 'ghost-walk' }))).toThrow(/already exists/);
    expect(() => createAppFiles(options({ existingFolders: ['River-Walk'] }))).toThrow(/already exists/);
    expect(() => createAppFiles(options({ existingPackageNames: ['@haunt-kit/river-walk'] }))).toThrow(/package name/);
  });

  it('fails clearly when the starter no longer has the text the generator rewrites', () => {
    expect(() => createAppFiles(options({ starterApp: starterApp.replace('../src/react', '../src/ui') }))).toThrow(/starter has changed/);
    expect(() => createAppFiles(options({ starterTour: starterTour.replace("'My First Walk'", "'Other'") }))).toThrow(/starter has changed/);
  });

  it('chooses free ports', () => {
    const taken = [3170, 3171, 3172, 3173];
    expect(choosePorts(taken)).toEqual({ dev: 3174, preview: 3175 });
    expect(choosePorts([...taken, 3174, 3175])).toEqual({ dev: 3176, preview: 3177 });
    expect(choosePorts(taken, { dev: 3178 })).toEqual({ dev: 3178, preview: 3179 });
    expect(choosePorts(taken, { dev: 4000, preview: 4100 })).toEqual({ dev: 4000, preview: 4100 });
    expect(() => choosePorts([...taken, 3174, 3175, 3176, 3177, 3178, 3179])).toThrow(CreateAppError);
    expect(() => choosePorts(taken, { dev: 3172 })).toThrow(/already used/);
    expect(() => choosePorts(taken, { dev: 4000, preview: 4000 })).toThrow(/different/);
    expect(() => choosePorts(taken, { dev: 80 })).toThrow(/1024/);
    expect(() => createAppFiles(options({ ports: { dev: 3174, preview: 3174 } }))).toThrow(CreateAppError);
  });

  it('prints the workspace line and next steps', () => {
    expect(workspaceEntry('river-walk')).toBe('"apps/river-walk"');
    const text = nextSteps('river-walk', { dev: 3174, preview: 3175 }).join('\n');
    expect(text).toContain('"apps/river-walk",');
    expect(text).toContain('npm run dev -w apps/river-walk');
    expect(text).toContain('http://localhost:3174');
  });
});
