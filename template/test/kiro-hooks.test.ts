import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const hooksDir = path.join(root, '.kiro', 'hooks');
const files = readdirSync(hooksDir);

interface CliHook {
  name: string;
  trigger: string;
  matcher?: string;
  action: { type: string; prompt?: string; command?: string };
  enabled: boolean;
}

/** Files each CLI hook is meant to cover, relative to the workspace root. */
const covered: Record<string, { yes: string[]; no: string[] }> = {
  'engine-purity-guard.json': {
    yes: ['template/src/core/geofence.ts', 'template/src/core/smoothing.ts'],
    no: ['template/src/adapters/position.ts', 'apps/ghost-walk/src/tour.ts', 'template/src/core/readme.md'],
  },
  'legend-source-guard.json': {
    yes: ['apps/ghost-walk/src/tour.ts'],
    no: ['apps/scavenger-hunt/src/hunt.ts', 'apps/ghost-walk/src/App.tsx'],
  },
  'test-on-save.json': {
    yes: [
      'template/src/core/geofence.ts',
      'template/src/react/TourMap.tsx',
      'template/test/geo.test.ts',
      'template/scripts/create-tour-app.mjs',
      'template/starter/starter-tour.ts',
      'apps/scavenger-hunt/src/hunt-codec.ts',
      'apps/ghost-walk/test/tour.test.ts',
    ],
    no: ['README.md', 'e2e/site.spec.ts', 'template/src/react/haunt-kit.css'],
  },
};

describe('CLI hooks (.kiro/hooks/*.json)', () => {
  const cliFiles = files.filter((f) => f.endsWith('.json'));

  it('has a coverage table entry for every hook file', () => {
    expect(cliFiles.sort()).toEqual(Object.keys(covered).sort());
  });

  for (const file of cliFiles) {
    const parsed = JSON.parse(readFileSync(path.join(hooksDir, file), 'utf8')) as { version: string; hooks: CliHook[] };

    it(`${file}: every matcher matches absolute and relative paths it covers`, () => {
      expect(parsed.hooks.length).toBeGreaterThan(0);
      const table = covered[file];
      expect(table).toBeDefined();
      for (const hook of parsed.hooks) {
        expect(hook.matcher).toBeTruthy();
        const re = new RegExp(hook.matcher as string);
        for (const rel of table!.yes) {
          expect(re.test(path.join(root, rel)), `absolute ${rel}`).toBe(true);
          expect(re.test(rel), `relative ${rel}`).toBe(true);
        }
        for (const rel of table!.no) {
          expect(re.test(path.join(root, rel)), `absolute ${rel}`).toBe(false);
        }
      }
    });
  }
});

describe('Kiro IDE hooks (.kiro/hooks/*.kiro.hook)', () => {
  const ideFiles = files.filter((f) => f.endsWith('.kiro.hook'));

  it('has a copy of each CLI hook plus the agentStop check', () => {
    expect(ideFiles.sort()).toEqual([
      'check-on-stop.kiro.hook',
      'engine-purity-guard.kiro.hook',
      'legend-source-guard.kiro.hook',
      'test-on-save.kiro.hook',
    ]);
  });

  for (const file of ideFiles) {
    it(`${file}: parses and has the required fields`, () => {
      const hook = JSON.parse(readFileSync(path.join(hooksDir, file), 'utf8'));
      expect(typeof hook.enabled).toBe('boolean');
      expect(hook.name).toEqual(expect.any(String));
      expect(hook.description).toEqual(expect.any(String));
      expect(hook.version).toBe('1');
      expect(hook.when?.type).toEqual(expect.any(String));
      if (hook.when.type === 'fileEdited') {
        expect(hook.when.patterns.length).toBeGreaterThan(0);
        for (const p of hook.when.patterns) expect(path.isAbsolute(p)).toBe(false);
      }
      if (hook.then.type === 'askAgent') expect(hook.then.prompt).toEqual(expect.any(String));
      else if (hook.then.type === 'runCommand') expect(hook.then.command).toEqual(expect.any(String));
      else throw new Error(`unknown then.type ${hook.then.type}`);
    });
  }

  it('file patterns point at real folders', () => {
    for (const file of ideFiles) {
      const hook = JSON.parse(readFileSync(path.join(hooksDir, file), 'utf8'));
      if (hook.when.type !== 'fileEdited') continue;
      for (const p of hook.when.patterns as string[]) {
        const firstFolder = p.split('/').slice(0, 2).join('/');
        if (!firstFolder.includes('*')) expect(existsSync(path.join(root, firstFolder)), p).toBe(true);
      }
    }
  });
});
