import { expect, test } from '@playwright/test';
import { audit } from './axe';

test('Ghost Walk: home, after a simulated walk, and the story dialog pass axe', async ({ page }) => {
  await page.goto('./?speed=500');
  await audit(page);
  await page.getByRole('button', { name: 'Simulate the walk' }).click();
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', '6 of 6 spirits found', { timeout: 60_000 });
  await audit(page);
  await page.getByRole('button', { name: /Read: Hoyt Sherman Place/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
});
