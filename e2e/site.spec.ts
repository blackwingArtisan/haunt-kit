import { expect, test } from '@playwright/test';
import { audit } from './axe';

test('the landing page shows both apps with working links and QR codes, and passes axe', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Haunt Kit', level: 1 })).toBeVisible();
  await expect(page.getByText('A haunted tour that fits in a QR code')).toBeVisible();
  const codes = page.getByTestId('qr');
  await expect(codes).toHaveCount(2);
  await expect(codes.nth(0)).toHaveAttribute('aria-label', /\/ghost-walk\/\)$/);
  await expect(codes.nth(1)).toHaveAttribute('aria-label', /\/spook-hunt\/\)$/);
  await expect(codes.nth(0).locator('svg')).toBeVisible();
  await audit(page);
});

test('both apps run from their own folders on the hosted site', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-ghost').click();
  await expect(page).toHaveURL(/\/ghost-walk\/$/);
  await expect(page.getByRole('heading', { name: /Des Moines After Dark/ })).toBeVisible();
  await expect(page.locator('.hk-list__item')).toHaveCount(6);

  await page.goto('/');
  await page.getByTestId('open-hunt').click();
  await expect(page).toHaveURL(/\/spook-hunt\/$/);
  await expect(page.getByRole('button', { name: 'Play the demo hunt' })).toBeVisible();
});

test('one click from the landing page starts each demo', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('watch-ghost').click();
  await expect(page.getByTestId('walk-status')).toContainText('Watching the walk');
  // The ?watch flag is used once and removed, so a reload does not restart the walk.
  await expect(page).toHaveURL(/\/ghost-walk\/$/);

  await page.goto('/');
  await page.getByTestId('play-hunt').click();
  await expect(page).toHaveURL(/\/spook-hunt\/#\/play\//);
  await expect(page.getByRole('heading', { name: 'The Pumpkin Patrol' })).toBeVisible();
});
