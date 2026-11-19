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

test('a player on their own phone sends a result link, and the host adds it to the leaderboard', async ({ browser }) => {
  // Two browser contexts have separate storage, like two phones.
  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    await host.goto('/#/host');
    await host.getByRole('button', { name: 'Load the demo hunt' }).click();
    await host.getByRole('button', { name: 'Make the share link' }).click();
    const huntLink = await host.getByTestId('share-url').inputValue();

    // The player finishes the demo hunt from the list: one hint, one wrong answer, three list unlocks.
    const player = await playerContext.newPage();
    await player.goto(huntLink);
    await player.getByLabel('Player or team name').fill('Team Lantern');
    await player.getByRole('button', { name: 'Start the hunt' }).click();
    const unlock = (n: number) => player.locator('.hk-list__item').nth(n).getByRole('button', { name: /Can't reach it\? Unlock/ }).click();
    const challenge = player.getByTestId('challenge');

    await unlock(0);
    await challenge.getByRole('button', { name: 'Hint (+30 s)' }).click();
    await challenge.getByLabel(/ribbon/).fill('green');
    await challenge.getByRole('button', { name: 'Check answer' }).click();
    await expect(challenge).toContainText('Not quite');
    await challenge.getByLabel(/ribbon/).fill('orange');
    await challenge.getByRole('button', { name: 'Check answer' }).click();
    await unlock(1);
    await challenge.getByLabel(/animal/).fill('a bat');
    await challenge.getByRole('button', { name: 'Check answer' }).click();
    await unlock(2);

    const finished = player.getByTestId('finished');
    await expect(finished).toContainText('Team Lantern escaped!');
    await expect(finished).toContainText('1 hints · 1 wrong answers · 3 unlocked from the list');
    await expect(player.getByRole('link', { name: 'Send my time to the host' })).toBeVisible();
    const resultLink = (await player.getByTestId('result-link').getAttribute('href'))!;
    expect(resultLink).toMatch(/#\/result\/[0-9A-Za-z_-]+$/);
    expect(resultLink.length).toBeLessThan(2000);
    for (const secret of ['orange', 'ribbon', '41.57', '-93.64']) expect(resultLink).not.toContain(secret);

    // The host opens the link on their own device and adds the run.
    await host.goto(resultLink);
    const card = host.getByTestId('result-card');
    await expect(card).toContainText('Team Lantern finished');
    await expect(card).toContainText('1 hints · 1 wrong answers · 3 unlocked from the list');
    await expect(host.getByRole('heading', { name: 'The Pumpkin Patrol' })).toBeVisible();
    await expect(host.getByTestId('leaderboard')).not.toContainText('Team Lantern');
    await host.getByRole('button', { name: 'Add to leaderboard' }).click();
    await expect(host.getByTestId('result-status')).toContainText('Added Team Lantern to the leaderboard');
    await expect(host.getByTestId('leaderboard')).toContainText('Team Lantern');

    // Opening the same link again is refused, and the run is not listed twice.
    await host.reload();
    await expect(host.getByTestId('result-status')).toContainText('already on the leaderboard');
    await expect(host.getByRole('button', { name: 'Add to leaderboard' })).toHaveCount(0);
    await expect(host.getByTestId('leaderboard').locator('li')).toHaveCount(1);

    // A damaged link is refused with a message, and a result for another hunt is not accepted.
    await host.goto(`${resultLink.slice(0, -8)}`);
    await expect(host.getByTestId('result-error')).toContainText('nothing was added');
    await player.goto(resultLink);
    await expect(player.getByTestId('result-status')).toContainText('different hunt');
  } finally {
    await hostContext.close();
    await playerContext.close();
  }
});
