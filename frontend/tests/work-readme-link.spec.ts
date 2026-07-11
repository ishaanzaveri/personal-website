import { test, expect } from '@playwright/test';
import posts from '../mock-server/data/posts.json' assert { type: 'json' };
import site from '../mock-server/data/site.json' assert { type: 'json' };

const listPosts = posts.map(({ body: _body, words: _words, commit: _commit, tags: _tags, ...rest }) => rest);

test('selected work is sourced from flagged blog posts and opens the blog page', async ({ page }) => {
  await page.route('**/api/site', async (route) => route.fulfill({ json: site }));
  await page.route('**/api/posts', async (route) => route.fulfill({ json: listPosts }));
  await page.route('**/api/posts/*', async (route) => {
    const slug = route.request().url().split('/api/posts/')[1].split(/[?#]/)[0];
    const post = posts.find((p) => p.slug === slug);
    await route.fulfill({ status: post ? 200 : 404, json: post ?? { error: { message: 'missing' } } });
  });
  await page.route('**/api/frames?*', async (route) => route.fulfill({ json: { data: [], meta: { total: 0 } } }));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: './why i am finally making my website' })).toBeVisible();
  const readmeLink = page.getByRole('link', { name: 'cat readme for why i am finally making my website' });
  await expect(readmeLink).toBeVisible();
  await expect(readmeLink).toHaveAttribute('href', '/blog/why-i-am-finally-making-my-website');

  await readmeLink.click();

  await expect(page).toHaveURL(/\/blog\/why-i-am-finally-making-my-website$/);
  await expect(page.getByRole('heading', { name: 'why i am finally making my website', exact: true })).toBeVisible();
  await expect(page.getByText('The site stopped being a wall and started being an afternoon.')).toBeVisible();
});
