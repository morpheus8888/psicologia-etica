import { expect, test } from '@playwright/test';

const diaryEmail = process.env.E2E_DIARY_EMAIL;
const diaryPassword = process.env.E2E_DIARY_PASSWORD;
const diaryPassphrase = process.env.E2E_DIARY_PASSPHRASE ?? process.env.E2E_DIARY_PASSWORD;

test.describe('Diary editor', () => {
  test('keeps focus and preserves typing after delay', async ({ page, baseURL }) => {
    test.fail(!diaryEmail || !diaryPassword, 'Diary credentials are not configured');

    await page.goto(`${baseURL}/sign-in`);

    await page.getByTestId('signin-email').fill(diaryEmail!);
    await page.getByTestId('signin-password').fill(diaryPassword!);
    await page.getByTestId('signin-submit').click();

    await page.waitForURL(`${baseURL}/`);

    await page.goto(`${baseURL}/dashboard/diary`);

    const unlockInput = page.locator('#diary-password');
    try {
      await unlockInput.fill(diaryPassphrase ?? diaryPassword ?? 'test-diary-password', { timeout: 3000 });
      await unlockInput.press('Enter', { timeout: 3000 });
    } catch {
      // already unlocked
    }

    const editor = page.locator('.diary-entry-content[contenteditable="true"]');

    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await editor.type('Hello');

    await editor.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    await editor.type(' world');

    await expect(editor).toHaveText('Hello world');
  });
});
