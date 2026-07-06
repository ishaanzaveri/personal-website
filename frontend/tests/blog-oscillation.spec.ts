import { test, expect } from '@playwright/test';
import posts from '../mock-server/data/posts.json' assert { type: 'json' };

const listPosts = posts.map(({ body: _body, words: _words, commit: _commit, tags: _tags, ...rest }) => rest);

test('blog post frozen header does not oscillate near sticky threshold on mobile', async ({ page }) => {
  await page.route('**/api/posts', async (route) => route.fulfill({ json: listPosts }));
  await page.route('**/api/posts/*', async (route) => {
    const slug = route.request().url().split('/api/posts/')[1].split(/[?#]/)[0];
    const post = posts.find((p) => p.slug === slug);
    await route.fulfill({ json: post });
  });

  await page.goto('/blog/why-i-am-finally-making-my-website');
  await expect(page.getByRole('heading', { name: 'why i am finally making my website' })).toBeVisible();

  // Reproduce the user's mobile symptom: stop where the condensed header appears.
  // Before the fix, the header expanded in normal document flow above the article,
  // so scroll anchoring pushed the page from 500px to ~583px (the visible bounce).
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);

  const samples = await page.evaluate(async () => {
    const rows: Array<{ scrollY: number; frozenHeight: string; articleTop: number }> = [];
    const pane = Array.from(document.querySelectorAll('body *')).find((el) => {
      const style = getComputedStyle(el as Element);
      return style.zIndex === '45';
    }) as HTMLElement | undefined;
    const article = document.querySelector('.markdown-body') as HTMLElement;
    for (let i = 0; i < 24; i += 1) {
      const style = pane ? getComputedStyle(pane) : null;
      rows.push({
        scrollY: window.scrollY,
        frozenHeight: style?.maxHeight ?? 'missing',
        articleTop: article.getBoundingClientRect().top,
      });
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
    return rows;
  });

  const distinctHeights = new Set(samples.map((s) => s.frozenHeight));
  const articleTopRange = Math.max(...samples.map((s) => s.articleTop)) - Math.min(...samples.map((s) => s.articleTop));

  expect(distinctHeights.size, 'frozen pane max-height should not flap').toBe(1);
  expect(Math.abs(samples[0].scrollY - 500), 'scroll anchoring should not push the viewport after the header appears').toBeLessThan(5);
  expect(articleTopRange, 'content should not jump while scrollY is fixed').toBeLessThan(2);
});
