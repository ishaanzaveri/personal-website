import { test, expect } from '@playwright/test';
import projects from '../mock-server/data/projects.json' assert { type: 'json' };
import site from '../mock-server/data/site.json' assert { type: 'json' };

const listProjects = projects.map(({ readme: _readme, ...rest }) => rest);

test('selected work cat readme opens the project README page', async ({ page }) => {
  await page.route('**/api/site', async (route) => route.fulfill({ json: site }));
  await page.route('**/api/projects', async (route) => route.fulfill({ json: listProjects }));
  await page.route('**/api/projects/*', async (route) => {
    const slug = route.request().url().split('/api/projects/')[1].split(/[?#]/)[0];
    const project = projects.find((p) => p.slug === slug);
    await route.fulfill({ status: project ? 200 : 404, json: project ?? { error: { message: 'missing' } } });
  });
  await page.route('**/api/frames?*', async (route) => route.fulfill({ json: { data: [], meta: { total: 0 } } }));
  await page.route('**/api/posts?*', async (route) => route.fulfill({ json: [] }));

  await page.goto('/');

  const readmeLink = page.getByRole('link', { name: 'cat readme for personal-website' });
  await expect(readmeLink).toBeVisible();
  await expect(readmeLink).toHaveAttribute('href', '/work/personal-website');

  await readmeLink.click();

  await expect(page).toHaveURL(/\/work\/personal-website$/);
  await expect(page.getByRole('heading', { name: './personal-website' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'personal-website', exact: true })).toBeVisible();
  await expect(page.getByText('The site you are on.')).toBeVisible();
});
