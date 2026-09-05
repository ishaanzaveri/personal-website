import { test, expect } from '@playwright/test';
import site from '../mock-server/data/site.json';

test('contact email follows the API and reports a request failure', async ({ page }) => {
  await page.route('**/api/site', route => route.fulfill({ json: { ...site, email: 'hello@example.com' } }));
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'hello@example.com' })).toHaveAttribute('href', 'mailto:hello@example.com');
  await page.route('**/api/site', route => route.fulfill({ status: 503, json: { error: { message: 'offline' } } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('offline');
  await expect(page.getByRole('button', { name: 'retry', exact: true })).toBeVisible();
});

test('mobile menu closes on Escape and restores trigger focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'menu', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('link', { name: 'skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
