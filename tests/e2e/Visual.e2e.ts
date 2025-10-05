import percySnapshot from '@percy/playwright';
import { expect, test } from '@playwright/test';

test.describe('Visual testing', () => {
  test.describe('Static pages', () => {
    test('should take screenshot of the Italian homepage', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('Ultimi articoli')).toBeVisible();

      await percySnapshot(page, 'Homepage - it');
    });

    test('should take screenshot of the English homepage', async ({ page }) => {
      await page.goto('/en');

      await expect(page.getByText('Latest posts')).toBeVisible();

      await percySnapshot(page, 'Homepage - en');
    });
  });
});
