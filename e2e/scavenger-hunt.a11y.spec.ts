import { expect, test } from '@playwright/test';
import { audit } from './axe';

test('Spook Hunt: home, editor with the demo hunt, and the player pass axe', async ({ page }) => {
  await page.goto('./');
  await audit(page);
  await page.goto('./#/host');
  await page.getByRole('button', { name: 'Load the demo hunt' }).click();
  await page.getByRole('button', { name: 'Make the share link' }).click();
  await expect(page.getByTestId('qr')).toBeVisible();
  await audit(page);
  const url = await page.getByTestId('share-url').inputValue();
  await page.goto(url);
  await page.getByLabel('Player or team name').fill('Team Bat');
  await page.getByRole('button', { name: 'Start the hunt' }).click();
  await expect(page.getByTestId('clue')).toBeVisible();
  await audit(page);
});
