import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Runs axe-core (WCAG 2.1 A and AA rules) against each screen after real use, not just on first paint.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Fails with a readable list of WCAG A/AA violations, or passes when there are none. */
export async function audit(page: Page) {
  // Let entrance animations (a dialog fading in) finish, or axe measures half-transparent text.
  // Looping decoration such as candle flicker never finishes, so it is skipped.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'),
  );
  const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
  expect(summary).toEqual([]);
}

