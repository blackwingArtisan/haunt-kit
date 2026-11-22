import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const appCss = readFileSync(join(here, '..', 'src', 'styles.css'), 'utf8');
const skeletonCss = readFileSync(join(here, '..', '..', '..', 'template', 'src', 'react', 'haunt-kit.css'), 'utf8');

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
/** WCAG contrast ratio between two opaque colors. */
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const blend = (fg: Rgb, alpha: number, bg: Rgb): Rgb => fg.map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha))) as Rgb;

/** Reads a `--name: #rrggbb;` declaration from the app stylesheet. */
function color(name: string): Rgb {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(appCss);
  if (!match) throw new Error(`${name} is not a hex color in styles.css`);
  return hex(match[1]!);
}

describe('contrast (Req 8.4)', () => {
  const night = color('--hh-night');
  const panel = color('--hh-panel');
  const ground = color('--hk-ground');

  it('gives text at least 4.5 to 1 on the page, the panels and the map', () => {
    const text: [string, Rgb][] = [
      ['ink', color('--hh-ink')],
      ['muted', color('--hh-muted')],
      ['candle', color('--hh-candle')],
      ['slime', color('--hh-slime')],
      ['red', color('--hh-red')],
    ];
    for (const [name, fg] of text) {
      for (const [place, bg] of [['night', night], ['panel', panel], ['map ground', ground]] as const) {
        expect(contrast(fg, bg), `${name} on ${place}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('gives button and input text at least 4.5 to 1 on their own fills', () => {
    expect(contrast(color('--hh-candle-ink'), color('--hh-candle')), 'button').toBeGreaterThanOrEqual(4.5);
    expect(contrast(color('--hh-candle-ink'), hex('#fff7ea')), 'input').toBeGreaterThanOrEqual(4.5);
    expect(contrast(color('--hh-candle-ink'), color('--hh-slime')), 'skip link').toBeGreaterThanOrEqual(4.5);
  });

  it('gives outlines and the focus ring at least 3 to 1 against what they sit on', () => {
    const line = /--hk-line:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(appCss)!;
    const lineColor: Rgb = [Number(line[1]), Number(line[2]), Number(line[3])];
    const alpha = Number(line[4]);
    for (const [place, bg] of [['night', night], ['panel', panel]] as const) {
      expect(contrast(blend(lineColor, alpha, bg), bg), `line on ${place}`).toBeGreaterThanOrEqual(3);
    }
    for (const [place, bg] of [['night', night], ['panel', panel]] as const) {
      expect(contrast(color('--hk-focus'), bg), `focus on ${place}`).toBeGreaterThanOrEqual(3);
      expect(contrast(color('--hh-candle'), bg), `input border on ${place}`).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(color('--hk-locked'), ground), 'locked marker on map').toBeGreaterThanOrEqual(3);
    expect(contrast(color('--hk-locked'), night), 'locked number ring on page').toBeGreaterThanOrEqual(3);
  });
});

describe('keyboard focus (Req 8.1)', () => {
  it('shows a focus ring on buttons, links and the code field', () => {
    expect(skeletonCss).toMatch(/\.hk-btn:focus-visible[^{]*\{[^}]*outline:\s*3px solid/);
    expect(skeletonCss).toMatch(/a:focus-visible/);
    expect(appCss).toMatch(/\.hh-input:focus-visible\s*\{[^}]*outline:\s*3px solid/);
    expect(appCss).not.toMatch(/outline:\s*(none|0)\b/);
  });

  it('lets the skip link appear on focus', () => {
    expect(appCss).toMatch(/\.hh-skip:focus\s*\{\s*top:\s*12px/);
  });
});

describe('calm (Req 8.3)', () => {
  it('declares no animation or transition of its own, and switches them off for reduced motion', () => {
    const declarations = appCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toMatch(/@keyframes/);
    // The only animation and transition properties are the reduced-motion overrides, set to none.
    for (const match of declarations.matchAll(/\b(animation|transition)\s*:\s*([^;]+);/g)) expect(match[2]).toMatch(/^none\b/);
    expect(declarations).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none !important/);
  });

  it('relies on the skeleton turning off the fog drift and lantern flicker for reduced motion', () => {
    expect(skeletonCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.hk-map__fog-drift, \.hk-map__lantern \{ animation: none; \}/);
  });
});

describe('narrow screens (Req 8.7)', () => {
  it('lets long words wrap and sets no fixed width wider than a 360 px phone', () => {
    expect(appCss).toMatch(/overflow-wrap:\s*break-word/);
    for (const match of appCss.matchAll(/(?<![-\w])(min-width|width)\s*:\s*(\d+)px/g)) {
      expect(Number(match[2]), match[0]).toBeLessThanOrEqual(360);
    }
  });
});
