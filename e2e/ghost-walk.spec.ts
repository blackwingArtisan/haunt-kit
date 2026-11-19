import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const STOPS = ['ferrymans-bell', 'one-too-many', 'hoyt-sherman-place', 'lamplighters-round', 'woodland-cemetery', 'terrace-hill'];
const stopRow = (page: Page, id: string) => page.locator(`.hk-list__item[data-stop="${id}"]`);

/** Sends a fix every 400 ms, wobbling by under a meter like a phone at rest, until `done` is true. */
async function feedFixes(context: BrowserContext, at: { latitude: number; longitude: number }, done: () => Promise<boolean>) {
  for (let i = 0; i < 25; i++) {
    await context.setGeolocation({ latitude: at.latitude + (i % 2) * 0.000005, longitude: at.longitude, accuracy: 8 });
    await new Promise((r) => setTimeout(r, 400));
    if (await done()) return;
  }
  throw new Error('The stop did not unlock after 25 fixes');
}

test('a simulated walk unlocks every stop along the route, then the finale', async ({ page }) => {
  await page.goto('/?speed=250');
  await expect(page.getByRole('heading', { name: /Des Moines After Dark/ })).toBeVisible();
  await expect(stopRow(page, 'terrace-hill')).toHaveAttribute('data-status', 'locked');

  await page.getByRole('button', { name: 'Simulate the walk' }).click();
  await expect(page.getByTestId('walk-status')).toContainText('Simulated walk');

  // Stops unlock in route order as the lantern reaches them.
  for (const id of STOPS) {
    await expect(stopRow(page, id)).toHaveAttribute('data-status', 'finished', { timeout: 30_000 });
  }
  await expect(page.getByTestId('finale')).toContainText('The walk is complete');
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', '6 of 6 spirits found');
  await expect(page.locator('.hk-marker[data-stop="terrace-hill"]')).toHaveAttribute('data-status', 'finished');

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', '6 of 6 spirits found');

  // Read a story that unlocked during the walk, with its sources.
  await stopRow(page, 'hoyt-sherman-place').getByRole('button', { name: /Read: Hoyt Sherman Place/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Hoyt Sherman Place' })).toBeVisible();
  await expect(dialog).toContainText('Legend says');
  await expect(dialog.getByRole('link', { name: 'The ghosts of Des Moines' })).toHaveAttribute('href', /timesdelphic\.com/);
});

test('real browser geolocation: standing at Hoyt Sherman Place unlocks it and opens the story', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 41.58861, longitude: -93.63833, accuracy: 8 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Walk with my location' }).click();
  await expect(page.getByTestId('walk-status')).toContainText('Following your lantern');
  // A phone reports a fresh fix every second or so; the engine needs two inside the circle.
  await feedFixes(context, { latitude: 41.58861, longitude: -93.63833 }, () =>
    stopRow(page, 'hoyt-sherman-place').getAttribute('data-status').then((s) => s === 'finished'),
  );

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Hoyt Sherman Place' })).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toContainText('Local legend');
  await expect(stopRow(page, 'hoyt-sherman-place')).toHaveAttribute('data-status', 'finished');
  await expect(stopRow(page, 'ferrymans-bell')).toHaveAttribute('data-status', 'available');
  await dialog.getByRole('button', { name: 'Close' }).click();
  // The compass now points at the next stop: the Ferryman's Bell, down by the river to the east.
  await expect(page.getByTestId('compass')).toContainText("The Ferryman's Bell: 1.8 km east");
});

test('every stop can be read from the list with the keyboard alone', async ({ page }) => {
  await page.goto('/');
  const finale = stopRow(page, 'terrace-hill').getByRole('button');
  await expect(finale).toBeDisabled();
  await expect(stopRow(page, 'terrace-hill')).toContainText('after every other stop');

  for (const id of STOPS.slice(0, 5)) {
    const button = stopRow(page, id).getByRole('button', { name: /Read from here/ });
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // Focus returns to the list so a keyboard user does not lose their place.
    await expect(stopRow(page, id).getByRole('button')).toBeFocused();
  }

  await expect(finale).toBeEnabled();
  await finale.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('legend says a little girl haunts this house'.replace('legend', 'Legend'));
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('finale')).toBeVisible();
});

test('a fast keyboard user moving straight to the next stop keeps focus and opens the right story', async ({ page }) => {
  await page.goto('/');
  await stopRow(page, 'ferrymans-bell').getByRole('button', { name: /Read from here/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: "The Ferryman's Bell" })).toBeVisible();

  // Close the dialog and open the next stop in the same task, before the
  // dialog's own close event has been delivered.
  await page.evaluate(() => {
    document.querySelector<HTMLDialogElement>('dialog.gw-dialog')!.close();
    const next = document.querySelector<HTMLButtonElement>('.hk-list__item[data-stop="one-too-many"] button')!;
    next.focus();
    next.click();
  });

  await expect(dialog.getByRole('heading', { name: 'One Too Many' })).toBeVisible();
  await expect(stopRow(page, 'one-too-many')).toHaveAttribute('data-status', /unlocked|finished/);
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(stopRow(page, 'one-too-many').getByRole('button')).toBeFocused();
});

test('fiction is labeled as fiction', async ({ page }) => {
  await page.goto('/');
  await stopRow(page, 'one-too-many').getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Fiction');
  await expect(dialog).toContainText('invented for this walk');
  await expect(dialog.getByRole('list', { name: 'Sources' })).toHaveCount(0);
});

test('works offline once visited (service worker)', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Load once more so the worker controls the page and has cached the shell.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Des Moines After Dark/ })).toBeVisible();
  await expect(page.locator('.hk-list__item')).toHaveCount(6);
  await context.setOffline(false);
});

test('reduced motion stops the candle flicker and the dialog animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await stopRow(page, 'ferrymans-bell').getByRole('button', { name: /Read from here/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  await expect(page.locator('.gw-candle--lit .gw-candle__flame').first()).toHaveCSS('animation-name', 'none');
});

test('"Watch the 60-second walk" opens each story on arrival, closes it as the walker moves on, and ends on the finale', async ({ page }) => {
  // The button plays at 60x; ?speed= speeds the same walk up for the test.
  await page.goto('/?speed=250');
  await page.getByTestId('watch').click();
  await expect(page.getByTestId('walk-status')).toContainText('Watching the walk');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: "The Ferryman's Bell" })).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole('heading', { name: 'One Too Many' })).toBeVisible({ timeout: 20_000 });
  // Between stops the story closes, so the map and the lifting fog are in view.
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(dialog.getByRole('heading', { name: 'Terrace Hill' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', '6 of 6 spirits found');
  // The last story gives way to the full-screen finale by itself, and the fog burns off the map.
  const finale = page.getByTestId('finale-overlay');
  await expect(finale).toBeVisible({ timeout: 10_000 });
  await expect(finale.getByRole('heading', { name: 'Every spirit is found' })).toBeVisible();
  await expect(page.getByTestId('tour-map')).toHaveClass(/hk-map--complete/);
  await finale.getByRole('button', { name: 'Walk it again' }).click();
  await expect(finale).toBeHidden();
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', '0 of 6 spirits found');
});

test('the finale plays once: a reload of a finished walk does not open it again', async ({ page }) => {
  await page.goto('/');
  for (const id of STOPS) await stopRow(page, id).getByRole('button', { name: /Read from here/ }).click().then(() => page.keyboard.press('Escape'));
  await expect(page.getByTestId('finale-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('finale-overlay')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('finale')).toBeVisible();
  await expect(page.getByTestId('finale-overlay')).toBeHidden();
});

test('with reduced motion the finale appears in its final state, with nothing animating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const id of STOPS) await stopRow(page, id).getByRole('button', { name: /Read from here/ }).click().then(() => page.keyboard.press('Escape'));
  const finale = page.getByTestId('finale-overlay');
  await expect(finale).toBeVisible();
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  // The tower light is already out.
  await expect(finale.locator('.gw-tower__light')).toHaveCSS('fill', 'rgb(35, 35, 42)');
});
