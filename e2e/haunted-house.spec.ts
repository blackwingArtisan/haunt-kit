import { expect, test, type Page } from '@playwright/test';

const ROOMS = [
  { name: 'Front Hall', code: 'BATS' },
  { name: 'Parlor', code: 'MUMS' },
  { name: 'Library', code: 'EERY' },
  { name: 'Kitchen', code: 'STEW' },
  { name: 'Attic', code: 'WEBS' },
  { name: 'Cellar', code: 'CRYP' },
];

const dialog = (page: Page) => page.locator('dialog[open]');
const polite = (page: Page) => page.locator('.hh-message:not(.hh-message--error)');
const count = (page: Page) => page.locator('.hh-count');

/** Types a code the way a guest does. A room's story is a modal dialog, so close it first. */
async function typeCode(page: Page, code: string) {
  if (await dialog(page).count()) await dialog(page).getByRole('button', { name: 'Close' }).click();
  await page.getByLabel('Room code').fill(code);
  await page.getByRole('button', { name: 'Enter room' }).click();
}

test.describe('the party', () => {
  test('a room link opens the room on a fresh browser, then clears the hash (Req 2.2, 2.3, 2.4, 5.2)', async ({ page }) => {
    await page.goto('/#/room/BATS');
    await expect(dialog(page)).toContainText('Front Hall');
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(polite(page)).toContainText('The Front Hall is open');
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/');
    // Reloading does not enter the code again: the count stays at one and nothing is announced.
    await page.reload();
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(dialog(page)).toHaveCount(0);
    await expect(polite(page)).toHaveText('');
  });

  test('a later room link changes the hash and opens that room (Req 2.2, 2.3)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.location.hash = '#/room/mums';
    });
    await expect(dialog(page)).toContainText('Parlor');
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/');
  });

  test('typed codes: spaces and lower case, repeats, refusals, and state kept on refusal (Req 1.2, 1.4 to 1.7, 3.1 to 3.4, 3.6, 4.8)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Room code')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter room' })).toBeVisible();
    await expect(page.getByText('Every room, story and ghost here is made up for this game.').first()).toBeVisible();

    await page.getByLabel('Room code').fill('ba ts');
    await page.getByLabel('Room code').press('Enter'); // Req 3.2
    await expect(dialog(page)).toContainText('Front Hall');
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(page.getByLabel('Room code')).toHaveValue('');

    // Repeat: said so, nothing changes, the field is cleared and keeps focus (Req 3.6).
    await typeCode(page, 'BA-TS');
    await expect(polite(page)).toHaveText('You have already visited the Front Hall.');
    await expect(dialog(page)).toHaveCount(0);
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(page.getByLabel('Room code')).toHaveValue('');
    await expect(page.getByLabel('Room code')).toBeFocused();

    // Refusals leave the count alone and are announced with the alert role.
    await typeCode(page, '');
    await expect(page.getByRole('alert')).toHaveText('Type the four-character code printed on the poster.');
    await typeCode(page, 'NOPE');
    await expect(page.getByRole('alert')).toHaveText(
      'A room code has four characters: letters, and the digits 2 to 9. Check the poster and try again.',
    );
    await typeCode(page, 'zzzz');
    await expect(page.getByRole('alert')).toHaveText('No room has the code ZZZZ. Check the poster and try again.');
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByLabel('Room code')).toBeFocused();
  });

  test('the Attic waits for the Library, and opens when the Library is visited from the list (Req 4.6, 4.7, 5.4)', async ({ page }) => {
    await page.goto('/');
    await typeCode(page, 'WEBS');
    await expect(polite(page)).toHaveText('The Attic is not open yet. Visit the Library first.');
    await expect(dialog(page)).toHaveCount(0);
    await expect(count(page)).toHaveText('0 of 6 rooms open');

    await page.getByRole('button', { name: 'Visit from here: Library' }).click();
    // The guest's last scan was the Attic, so the engine opens it once the Library is done.
    await expect(page.locator('li[data-stop="attic"]')).toHaveAttribute('data-status', /unlocked|finished/);
    await expect(page.locator('li[data-stop="library"]')).toHaveAttribute('data-status', /unlocked|finished/);
    await expect(count(page)).toHaveText('2 of 6 rooms open');
  });

  test('a guest can open any allowed room from the list without scanning (Req 5.3, 5.4)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Visit from here: Kitchen' }).click();
    await expect(dialog(page)).toContainText('Kitchen');
    await expect(count(page)).toHaveText('1 of 6 rooms open');
    await expect(page.getByRole('button', { name: 'Visit from here: Attic' })).toBeDisabled();
  });

  test('finishing every room shows the finish card, progress survives a reload, Start over clears it (Req 4.4, 5.5, 5.6, 5.7)', async ({ page }) => {
    await page.goto('/');
    for (const room of ROOMS) {
      await typeCode(page, room.code);
      await expect(dialog(page)).toContainText(room.name);
    }
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(count(page)).toHaveText('6 of 6 rooms open');
    const finish = page.getByRole('region', { name: 'You found every room' });
    await expect(finish).toContainText('All 6 rooms are open.');
    await expect(finish.locator('strong')).toHaveText(/^\d+ s$|^\d+ min \d+ s$/);

    await page.reload();
    await expect(count(page)).toHaveText('6 of 6 rooms open');
    await expect(page.getByRole('region', { name: 'You found every room' })).toBeVisible();

    await page.getByRole('button', { name: 'Start over' }).click();
    await page.getByRole('button', { name: 'Yes, start over' }).click();
    await expect(count(page)).toHaveText('0 of 6 rooms open');
    await page.reload();
    await expect(count(page)).toHaveText('0 of 6 rooms open');
    // A scan still works after starting over.
    await typeCode(page, 'BATS');
    await expect(dialog(page)).toContainText('Front Hall');
  });
});

test.describe('the posters', () => {
  test('six posters with QR, name, code and line (Req 6.1, 6.2, 6.3, 6.9, 6.11, 8.6)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Print room posters' }).click();
    await expect(page).toHaveURL(/#\/posters$/);
    const posters = page.locator('.hh-poster');
    await expect(posters).toHaveCount(6);
    await expect(page.getByTestId('qr')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    for (const [i, room] of ROOMS.entries()) {
      const poster = posters.nth(i);
      await expect(poster).toContainText(room.name);
      await expect(poster.getByTestId('poster-code')).toHaveText(room.code);
      await expect(poster).toContainText('If the code does not scan, type the room code');
      await expect(poster.getByTestId('poster-address')).toContainText('http');
      await expect(poster.getByTestId('qr')).toHaveAttribute('aria-label', new RegExp(`${room.name}.*${room.code.split('').join(' ')}`));
      await expect(poster.getByTestId('qr')).toHaveAttribute('data-link', new RegExp(`#/room/${room.code}$`));
      expect(await poster.locator('p').nth(1).textContent()).toBeTruthy(); // the in-character line
    }
    await expect(page.getByText('Put posters only in rooms guests are welcome to enter, and keep walkways clear.')).toBeVisible();
  });

  test('the Print button opens the print dialog (Req 6.11)', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.goto('/#/posters');
    await page.getByRole('button', { name: 'Print' }).focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  });

  test('print media: a page break after every poster but the last, nothing else printed, code at 64 pt or more (Req 6.4, 6.5)', async ({ page }) => {
    await page.goto('/#/posters');
    await expect(page.getByTestId('qr')).toHaveCount(6);
    await page.emulateMedia({ media: 'print' });
    const posters = page.locator('.hh-poster');
    for (let i = 0; i < 6; i += 1) {
      const after = await posters.nth(i).evaluate((el) => getComputedStyle(el).breakAfter);
      expect(after, `poster ${i + 1}`).toBe(i < 5 ? 'page' : 'auto');
    }
    // Everything that is not a poster is hidden.
    for (const el of await page.locator('.hh-screen-only').all()) await expect(el).toBeHidden();
    const sizes = await page.getByTestId('poster-code').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    for (const px of sizes) expect(px).toBeGreaterThanOrEqual((64 * 96) / 72);
  });

  for (const format of ['A4', 'Letter'] as const) {
    test(`printing on ${format} gives six pages (Req 6.4, 6.10)`, async ({ page }) => {
      await page.goto('/#/posters');
      await expect(page.getByTestId('qr')).toHaveCount(6);
      const pdf = await page.pdf({ format });
      const text = pdf.toString('latin1');
      const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages).toBe(6);
    });
  }

  test('a localhost address shows the warning, and the QR codes follow the address (Req 6.6, 6.7, 6.8)', async ({ page }) => {
    await page.goto('/#/posters');
    const address = page.getByLabel('Address the QR codes open');
    await expect(address).toHaveValue(/^http:\/\/localhost:\d+\/$/);
    await expect(page.getByText('Guests\u2019 phones cannot open it', { exact: false })).toBeVisible();

    const first = page.getByTestId('qr').first();
    const before = await first.innerHTML();
    await address.fill('https://party.example.com/house/');
    await expect(page.getByText('cannot open it', { exact: false })).toHaveCount(0);
    await expect(first).toHaveAttribute('data-link', 'https://party.example.com/house/#/room/BATS');
    await expect(page.getByTestId('poster-address').first()).toHaveText('https://party.example.com/house/');
    expect(await first.innerHTML()).not.toBe(before);
  });
});

test.describe('privacy and calm', () => {
  test('after the first load every request is same-origin, with no query string or body (Req 7.5)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const seen: { url: string; body: string | null }[] = [];
    page.on('request', (r) => seen.push({ url: r.url(), body: r.postData() }));
    await typeCode(page, 'BATS');
    await typeCode(page, 'MUMS');
    await page.goto('/#/posters');
    await expect(page.getByTestId('qr')).toHaveCount(6);
    await page.goto('/#/room/EERY');
    await expect(dialog(page)).toContainText('Library');
    const origin = new URL(page.url()).origin;
    for (const r of seen) {
      if (r.url.startsWith('data:') || r.url.startsWith('blob:')) continue;
      const url = new URL(r.url);
      expect(url.origin, r.url).toBe(origin);
      expect(url.search, r.url).toBe('');
      expect(r.body, r.url).toBeNull();
    }
  });

  test('the app never asks for location, camera or microphone (Req 7.4)', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: string[] = [];
      (window as unknown as { __asked: string[] }).__asked = calls;
      const geo = navigator.geolocation;
      if (geo) {
        geo.getCurrentPosition = () => void calls.push('getCurrentPosition');
        geo.watchPosition = () => {
          calls.push('watchPosition');
          return 0;
        };
      }
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => (calls.push('getUserMedia'), Promise.reject(new Error('no')));
    });
    await page.goto('/#/room/BATS');
    await expect(dialog(page)).toContainText('Front Hall');
    await typeCode(page, 'MUMS');
    await page.goto('/#/posters');
    await expect(page.getByTestId('qr')).toHaveCount(6);
    expect(await page.evaluate(() => (window as unknown as { __asked: string[] }).__asked)).toEqual([]);
  });

  test('with reduced motion asked for, no animation runs (Req 8.3)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/room/BATS');
    await expect(dialog(page)).toContainText('Front Hall');
    await typeCode(page, 'WEBS');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  });
});
