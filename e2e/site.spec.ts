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

test('the landing page states the stakes, links the Kiro log, and draws the engine diagram', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('stakes')).toContainText('$749');
  await expect(page.getByTestId('stakes')).toContainText('$0');
  await expect(page.getByTestId('kiro-log')).toHaveAttribute('href', /KIRO-LOG\.md$/);
  const diagram = page.getByTestId('engine-diagram');
  await expect(diagram).toContainText('stepFix(tour, state, fix)');
  for (const img of await diagram.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
});

test('"Make a hunt in 30 seconds" opens the editor, and the word hunt link opens a playable hunt', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('make-hunt').click();
  await expect(page).toHaveURL(/\/spook-hunt\/#\/host$/);
  await expect(page.getByRole('button', { name: /Make the share link/ })).toBeVisible();

  await page.goto('/');
  await page.getByTestId('word-hunt').click();
  await expect(page.getByRole('heading', { name: 'Friday Word Hunt' })).toBeVisible();
});

test('the poster page prints one poster per app with a QR code and the sunset time', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('poster-link').click();
  await expect(page).toHaveURL(/\/poster\.html$/);
  await expect(page.getByTestId('qr')).toHaveCount(2);
  await expect(page.getByTestId('poster-sunset')).toHaveText(/^\d{1,2}:\d{2} (AM|PM) C[SD]T$/);
  await expect(page.getByTestId('poster-ghost')).toContainText("The Ferryman's Bell");
  await audit(page);

  // A host's own link replaces the demo in the hunt poster's QR code.
  await page.getByLabel('Your own Spook Hunt link (optional)').fill('https://example.org/spook-hunt/#/play/abc123');
  await page.getByRole('button', { name: 'Use this link' }).click();
  await expect(page.getByTestId('poster-hunt').getByTestId('qr')).toHaveAttribute('aria-label', /#\/play\/abc123\)$/);

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print the posters' })).toBeHidden();
  await expect(page.getByTestId('poster-ghost')).toBeVisible();
  const pdf = await page.pdf({ format: 'Letter' });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(2);
});

test('the hero plays the real Ghost Walk map behind the title, and holds still under reduced motion', async ({ page, browser }) => {
  await page.goto('/');
  const hero = page.getByTestId('hero-map');
  await expect(hero.getByTestId('tour-map')).toBeVisible();
  // The lantern appears and the first stop unlocks as the simulated walk plays.
  await expect(hero.getByTestId('map-me')).toBeVisible({ timeout: 10_000 });
  await expect(hero.locator('.hk-marker[data-stop="ferrymans-bell"]')).toHaveAttribute('data-status', 'finished', { timeout: 20_000 });

  const still = await browser.newContext({ reducedMotion: 'reduce' });
  const quiet = await still.newPage();
  await quiet.goto(page.url());
  await expect(quiet.getByTestId('hero-map').getByTestId('tour-map')).toBeVisible();
  await quiet.waitForTimeout(3000);
  await expect(quiet.getByTestId('hero-map').getByTestId('map-me')).toHaveCount(0);
  await audit(quiet);
  await still.close();
});

test('on a wide screen the hero map starts beside the text column, so no stop name sits under the tagline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const map = page.getByTestId('hero-map');
  await expect(map.getByTestId('tour-map')).toBeVisible();
  const mapBox = (await map.boundingBox())!;
  for (const selector of ['.lp-lede', '.lp-stakes', '.lp-sub']) {
    const text = (await page.locator(selector).boundingBox())!;
    expect(mapBox.x).toBeGreaterThanOrEqual(text.x + text.width - 1);
  }
});

test('on a phone both demos are on the first screen, over a quiet map with no names on it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('hero-watch')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('hero-play')).toBeInViewport({ ratio: 1 });
  const map = page.getByTestId('hero-map');
  await expect(map).toHaveCSS('opacity', '0.35');
  await expect(map.locator('.hk-marker__name').first()).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByTestId('hero-watch').click();
  await expect(page.getByTestId('walk-status')).toContainText('Watching the walk');
  await page.goto('/');
  await page.getByTestId('hero-play').click();
  await expect(page.getByRole('heading', { name: 'The Pumpkin Patrol' })).toBeVisible();
  await context.close();
});
