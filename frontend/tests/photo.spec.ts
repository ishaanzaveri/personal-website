import { test, expect } from '@playwright/test';
import frames from '../mock-server/data/frames.json' with { type: 'json' };
import albums from '../mock-server/data/albums.json' with { type: 'json' };
import site from '../mock-server/data/site.json' with { type: 'json' };

const portrait = { ...frames[0], id: 'portrait', aspectRatio: '2/3', image: { ...frames[0].image, src: '/fixture-portrait.svg', variants: [], width: 200, height: 300, alt: 'Test portrait' } };
const album = { ...albums[0], id: portrait.album, coverFrameId: portrait.id };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split('/api/')[1];
    const json = endpoint === 'site' ? site : endpoint === 'albums' ? { data: [album], meta: { total: 1 } } : endpoint === 'frames/meta' ? { tags: [], cameras: [], locations: [] } : endpoint === `albums/${album.id}` ? { ...album, frames: [portrait, { ...portrait, id: 'next' }], meta: { total: 2 } } : endpoint.startsWith('frames/') ? portrait : { data: [portrait], meta: { total: 1 } };
    await route.fulfill({ json });
  });
  await page.route('**/fixture-portrait.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="teal"/></svg>' }));
});

for (const route of ['/photo', '/photo/albums', `/photo/albums/${album.id}`, '/photo/portrait']) {
  test(`${route} fits a mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.getByRole('img', { name: 'Test portrait' }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test('detail preserves full portrait aspect ratio', async ({ page }) => {
  await page.goto('/photo/portrait');
  const image = page.getByRole('img', { name: 'Test portrait' }).first();
  await expect(image).toHaveCSS('object-fit', 'contain');
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(2 / 3, 2);
});

test('failed photo retains an accessible placeholder', async ({ page }) => {
  await page.route('**/fixture-portrait.svg', (route) => route.abort());
  await page.goto('/photo/portrait');
  await expect(page.getByRole('img', { name: 'Test portrait — image unavailable' }).first()).toBeVisible();
});

test('album request errors are not reported as nonexistent albums', async ({ page }) => {
  await page.route('**/api/albums', (route) => route.fulfill({ status: 500, json: { error: { message: 'album service unavailable' } } }));
  await page.goto(`/photo/albums/${album.id}`);
  await expect(page.getByText('album service unavailable')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`no album '${album.id}'`)).toHaveCount(0);
});
