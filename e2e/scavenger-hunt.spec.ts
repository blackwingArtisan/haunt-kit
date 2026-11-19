import { expect, test } from '@playwright/test';

const YARD = { latitude: 41.6005, longitude: -93.6091 };

test('a host builds a hunt, shares it, and a player races it with a simulated walk', async ({ page, context }) => {
  await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write']);
  await context.setGeolocation({ ...YARD, accuracy: 6 });

  await page.goto('/#/host');
  await page.getByRole('button', { name: 'Start a blank hunt' }).click();
  await page.getByLabel('Hunt title').fill('Backyard Boo');
  await page.getByLabel('Hosted by (optional)').fill('The Maple Court Kids');

  // Spot 1: "record my current spot" uses the browser's real geolocation.
  await page.getByRole('button', { name: 'Record my current spot' }).click();
  await expect(page.getByText(/Got it, within about/)).toBeVisible();
  const stops = page.locator('.sh-stop');
  await expect(stops).toHaveCount(1);
  await stops.nth(0).getByLabel(/Spot name/).fill('The Porch Pumpkin');
  await stops.nth(0).getByLabel('Clue to find it').fill('Where trick-or-treaters ring the bell.');
  await stops.nth(0).getByLabel('Question at the spot (optional)').fill('What is carved on the pumpkin?');
  await stops.nth(0).getByLabel('Accepted answers, comma-separated').fill('a cat, cat');
  await expect(Number(await stops.nth(0).getByLabel('Latitude').inputValue())).toBeCloseTo(YARD.latitude, 4);

  // Spot 2: drop a pin by tapping the map.
  const map = page.getByTestId('tour-map');
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.78, y: box.height * 0.3 } });
  await expect(stops).toHaveCount(2);
  await stops.nth(1).getByLabel(/Spot name/).fill('The Old Shed');
  await stops.nth(1).getByLabel('Clue to find it').fill('Where the rakes sleep.');

  await page.getByRole('button', { name: 'Make the share link' }).click();
  const url = await page.getByTestId('share-url').inputValue();
  expect(url).toMatch(/#\/play\/1[0-9A-Za-z_-]+$/);
  expect(url).not.toContain('cat');
  await expect(page.getByTestId('qr').locator('svg')).toBeVisible();

  // The player opens the shared link (fast simulated walk for the test).
  const playUrl = url.replace('#', '?speed=150#');
  const player = await context.newPage();
  await player.goto(playUrl);
  await expect(player.getByRole('heading', { name: 'Backyard Boo' })).toBeVisible();
  await expect(player.getByText('The Maple Court Kids presents')).toBeVisible();
  await player.getByLabel('Player or team name').fill('Team Cauldron');
  await player.getByRole('button', { name: 'Start the hunt' }).click();

  await expect(player.getByTestId('clue')).toContainText('Where trick-or-treaters ring the bell.');
  // Hidden spots are not drawn on the map.
  await expect(player.locator('.hk-marker')).toHaveCount(0);

  await player.getByRole('button', { name: 'Practice run (simulated)' }).click();
  const challenge = player.getByTestId('challenge');
  await expect(challenge).toContainText('The Porch Pumpkin', { timeout: 20_000 });
  await challenge.getByLabel('What is carved on the pumpkin?').fill('dog');
  await challenge.getByRole('button', { name: 'Check answer' }).click();
  await expect(challenge).toContainText('Not quite');
  await challenge.getByLabel('What is carved on the pumpkin?').fill('A CAT!');
  await challenge.getByRole('button', { name: 'Check answer' }).click();

  await expect(player.getByTestId('finished')).toContainText('Team Cauldron escaped!', { timeout: 30_000 });
  await expect(player.getByTestId('finished')).toContainText('1 wrong answers');
  await expect(player.getByTestId('leaderboard')).toContainText('Team Cauldron');
  await expect(player.getByLabel('Next player or team')).toBeVisible();
});

test('a player who cannot reach a spot can unlock it from the list', async ({ page }) => {
  await page.goto('/#/host');
  await page.getByRole('button', { name: 'Load the demo hunt' }).click();
  await page.getByRole('button', { name: 'Make the share link' }).click();
  const url = await page.getByTestId('share-url').inputValue();
  await page.goto(url);
  await page.getByLabel('Player or team name').fill('Ghoul Gang');
  await page.getByRole('button', { name: 'Start the hunt' }).click();

  const firstSpot = page.locator('.hk-list__item').first();
  await firstSpot.getByRole('button', { name: /Can't reach it\? Unlock/ }).click();
  const challenge = page.getByTestId('challenge');
  await expect(challenge).toContainText('The Crooked Bench');
  await challenge.getByRole('button', { name: 'Hint (+30 s)' }).click();
  await expect(challenge).toContainText('Hint: Same color as a pumpkin.');
  await challenge.getByLabel(/ribbon/).fill('orange');
  await challenge.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByTestId('clue')).toContainText('Head north to the tallest tree');
  // The second spot stays locked in the list until the first is solved; now it is open.
  await expect(page.locator('.hk-list__item').nth(1).getByRole('button')).toBeEnabled();
});

test('the hot and cold meter reacts to real geolocation', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await page.goto('/#/host');
  await page.getByRole('button', { name: 'Load the demo hunt' }).click();
  await page.getByRole('button', { name: 'Make the share link' }).click();
  const url = await page.getByTestId('share-url').inputValue();

  // About 200 m south of the first spot.
  await context.setGeolocation({ latitude: 41.5701, longitude: -93.6441, accuracy: 5 });
  await page.goto(url);
  await page.getByLabel('Player or team name').fill('Night Owls');
  await page.getByRole('button', { name: 'Start the hunt' }).click();
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByTestId('thermometer')).toHaveAttribute('data-heat', 'cool');
  // Walk up to the first spot at a believable pace: a fix every 400 ms, 0.5 m apart, then stand still there.
  const target = 41.5719;
  for (let lat = 41.5701, i = 0; i < 60 && !(await page.getByTestId('challenge').isVisible()); i++) {
    lat = Math.min(target, lat + 0.0003);
    await context.setGeolocation({ latitude: lat + (i % 2) * 0.000004, longitude: -93.6441, accuracy: 5 });
    await page.waitForTimeout(400);
  }
  await expect(page.getByTestId('challenge')).toContainText('The Crooked Bench', { timeout: 15_000 });
});

test('a damaged hunt link shows a friendly error', async ({ page }) => {
  await page.goto('/#/play/1ThisIsNotAHunt');
  await expect(page.getByRole('heading', { name: 'This hunt link is cursed' })).toBeVisible();
});
