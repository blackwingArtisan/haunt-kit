import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Keeps the counts quoted in README.md and KIRO-LOG.md in step with the
// Playwright suite and the recorded Kiro session transcripts.

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
const readme = read('README.md');
const log = read('KIRO-LOG.md');

function match(text: string, re: RegExp): RegExpMatchArray {
  const m = text.match(re);
  if (!m) throw new Error(`no match for ${re}`);
  return m;
}

/** KIRO-LOG's "Sessions 2 to 4" table: one row per transcript in docs/kiro-sessions/. */
const rows = log
  .split('\n')
  .filter((line) => line.startsWith('| [') && line.includes('](docs/kiro-sessions/'))
  .map((line) => {
    const cells = line.split(' | ').map((c) => c.trim());
    return {
      file: match(cells[0]!, /\((docs\/kiro-sessions\/[^)]+)\)/)[1]!,
      minutes: Number(cells[2]),
      credits: Number(cells[3]),
      hooks: Number(match(cells[4]!, /on save (\d+)/)[1]),
      testsAfter: cells[6]!.replace(/\s*\|$/, ''),
    };
  });

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('README and KIRO-LOG counts', () => {
  it('has one session table row per transcript', () => {
    const transcripts = readdirSync(path.join(root, 'docs', 'kiro-sessions')).filter((f) => f.endsWith('.md'));
    expect(rows.map((r) => path.basename(r.file)).sort()).toEqual(transcripts.sort());
    // Session 1 is recorded in KIRO-LOG itself; the rest have transcripts.
    const sessions = { four: 4, five: 5, six: 6 }[match(readme, /(\w+) recorded `kiro-cli` sessions/)[1]!.toLowerCase()];
    expect(sessions).toBe(transcripts.length + 1);
  });

  it("each session row matches its transcript's minutes, credits and hook runs", () => {
    for (const row of rows) {
      const transcript = read(row.file);
      const [, min, sec] = match(transcript, /\((\d+) min (\d+) s wall time/);
      expect(row.minutes, row.file).toBe(Math.round((Number(min) + Number(sec) / 60) * 10) / 10);
      expect(row.credits, row.file).toBe(Number(match(transcript, /Credits used: ([\d.]+)/)[1]));
      expect(row.hooks, row.file).toBe((transcript.match(/^\[hook\] /gm) ?? []).length);
    }
  });

  it('the credit total and the README Kiro figures add up', () => {
    expect(Number(match(log, /\*\*Credits\.\*\* ([\d.]+) in all/)[1])).toBe(Math.round(sum(rows.map((r) => r.credits)) * 100) / 100);
    expect(Number(match(readme, /they ran (\d+) times on the record/)[1])).toBe(sum(rows.map((r) => r.hooks)));

    const [, unitBefore, unitAfter, e2eBefore, e2eAfter] = match(readme, /from (\d+) to (\d+) \(end-to-end (\d+) to (\d+)\) in the three/);
    expect(rows[0]!.testsAfter).toContain(`(${unitBefore} before), ${e2eBefore} e2e`);
    expect(rows.at(-1)!.testsAfter).toBe(`${unitAfter} unit, ${e2eAfter} e2e`);
  });

  it('the end-to-end counts in the docs match `playwright test --list`', () => {
    const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
    const out = execFileSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    interface Suite { specs?: { tests: { projectName: string }[] }[]; suites?: Suite[] }
    const perProject: Record<string, number> = {};
    const walk = (suite: Suite) => {
      for (const spec of suite.specs ?? []) for (const t of spec.tests) perProject[t.projectName] = (perProject[t.projectName] ?? 0) + 1;
      for (const child of suite.suites ?? []) walk(child);
    };
    (JSON.parse(out) as { suites: Suite[] }).suites.forEach(walk);
    const total = sum(Object.values(perProject));

    const [, stated, ghost, phone, hunt, house, site] = match(
      readme,
      /(\d+) end-to-end tests: (\d+) for the Ghost Walk, (\d+) for the Ghost Walk on a phone, (\d+) for Spook Hunt, (\d+) for the Haunted House Party and (\d+) for the hosted site/,
    );
    expect(Number(stated)).toBe(total);
    expect({
      'ghost-walk': Number(ghost),
      'ghost-walk-phone': Number(phone),
      'scavenger-hunt': Number(hunt),
      'haunted-house': Number(house),
      site: Number(site),
    }).toEqual(perProject);
    expect(Number(match(readme, /brings the end-to-end suite to (\d+)/)[1])).toBe(total);
    expect(Number(match(log, /The suite now has (\d+) end-to-end tests/)[1])).toBe(total);
  }, 180_000);
});
