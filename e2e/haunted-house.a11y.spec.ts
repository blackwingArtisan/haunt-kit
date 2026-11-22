import { expect, test, type Page } from '@playwright/test';
import { audit } from './axe';

const CODES = ['BATS', 'MUMS', 'EERY', 'STEW', 'WEBS', 'CRYP'];
const dialog = (page: Page) => page.locator('dialog[open]');

test('Haunted House: main screen, refusal, story, finish card and posters pass axe (Req 8.2, 8.4)', async ({ page }) => {
  await page.goto('/');
  await audit(page);

  await page.getByLabel('Room code').fill('ZZZZ');
  await page.getByRole('button', { name: 'Enter room' }).click();
  await expect(page.getByRole('alert')).toContainText('No room has the code ZZZZ');
  await audit(page);

  await page.getByLabel('Room code').fill('BATS');
  await page.getByRole('button', { name: 'Enter room' }).click();
  await expect(dialog(page)).toContainText('Front Hall');
  await audit(page);
  await dialog(page).getByRole('button', { name: 'Close' }).click();

  for (const code of CODES.slice(1)) {
    await page.getByLabel('Room code').fill(code);
    await page.getByRole('button', { name: 'Enter room' }).click();
    await dialog(page).getByRole('button', { name: 'Close' }).click();
  }
  await expect(page.getByRole('region', { name: 'You found every room' })).toBeVisible();
  await audit(page);

  await page.goto('/#/posters');
  await expect(page.getByTestId('qr')).toHaveCount(6);
  await audit(page);
  await page.getByLabel('Address the QR codes open').fill('https://party.example.com/house/');
  await audit(page);
});

test('the whole party can be played with the keyboard alone (Req 3.1, 3.2, 8.1, 8.5)', async ({ page }) => {
  await page.goto('/');
  // Tab from the top of the page: the skip link first, then the field, then its button.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to the party' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Room code')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Enter room' })).toBeFocused();

  for (const code of CODES) {
    await page.getByLabel('Room code').focus();
    await page.keyboard.type(code.toLowerCase());
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
  }
  await expect(page.locator('.hh-count')).toHaveText('6 of 6 rooms open');

  // A refusal is announced in the alert region and the focus ring is visible on the field.
  await page.getByLabel('Room code').focus();
  await page.keyboard.type('zzzz');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('No room has the code ZZZZ');
  const outline = await page.getByLabel('Room code').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('the main screen fits 360 CSS pixels with no horizontal scroll (Req 8.7)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(await fits()).toBe(true);
  await page.getByLabel('Room code').fill('BATS');
  await page.getByRole('button', { name: 'Enter room' }).click();
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  expect(await fits()).toBe(true);
});
