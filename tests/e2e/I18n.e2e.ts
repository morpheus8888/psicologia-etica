import { expect, test } from '@playwright/test';

test.describe('I18n', () => {
  test.describe('Language Switching', () => {
    test('should switch language from English to Italian using dropdown and verify text on the homepage', async ({ page }) => {
      await page.goto('/en');

      await expect(page.getByText('Latest posts')).toBeVisible();

      await page.getByRole('button', { name: 'lang-switcher' }).click();
      await page.getByText('Italiano').click();

      await expect(page).toHaveURL('/');
      await expect(page.getByText('Ultimi articoli')).toBeVisible();
    });

    test('should expose Italian as default locale and English behind /en', async ({ page }) => {
      await page.goto('/sign-in');

      await expect(page.getByText('Indirizzo email')).toBeVisible();

      await page.goto('/en/sign-in');

      await expect(page.getByText('Email address')).toBeVisible();
    });
  });
});
