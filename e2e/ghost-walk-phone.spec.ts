import { expect, test } from '@playwright/test';

test('fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Des Moines After Dark/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByTestId('tour-map')).toBeVisible();
});

test('a story opens at its heading on a phone, not scrolled down to the Close button', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hk-list__item[data-stop="ferrymans-bell"]').getByRole('button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  expect(await dialog.evaluate((d) => d.scrollTop)).toBe(0);
  await expect(dialog.getByRole('heading', { name: "The Ferryman's Bell" })).toBeInViewport();
});

test('on a narrow phone each stop keeps its name on one line and puts the button underneath', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('/');
  const row = page.locator('.hk-list__item[data-stop="woodland-cemetery"]');
  const name = (await row.locator('.hk-list__name').boundingBox())!;
  const button = (await row.getByRole('button').boundingBox())!;
  expect(button.y).toBeGreaterThan(name.y + name.height - 1);
  // "Woodland Cemetery" fits on one line once the button is out of the way.
  expect(name.height).toBeLessThan(40);
});

test('map place names and stop names stay at 12 px or larger on a phone', async ({ page }) => {
  await page.goto('/');
  const map = page.getByTestId('tour-map');
  await expect(map).toBeVisible();
  const sizes = await map.evaluate((svg: SVGSVGElement) => {
    const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    return [...svg.querySelectorAll('.hk-map__feature-label, .hk-marker__name')].map((t) => parseFloat(getComputedStyle(t).fontSize) * k);
  });
  expect(sizes.length).toBeGreaterThanOrEqual(3);
  for (const px of sizes) expect(px).toBeGreaterThanOrEqual(11.99);
});
