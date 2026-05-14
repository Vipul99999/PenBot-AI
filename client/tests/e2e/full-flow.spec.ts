import { test, expect } from '@playwright/test';

test('register, upload sample, edit converted document, preview PDF', async ({ page }) => {
  const email = `e2e-${Date.now()}@penbot.local`;
  await page.goto('/register');
  await page.getByPlaceholder('Name').fill('E2E User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('Strong123');
  await page.getByRole('button', { name: /create workspace/i }).click();

  await expect(page.getByText(/My Notes/i)).toBeVisible({ timeout: 30000 });
  await page.goto('/dashboard/upload');
  await page.getByRole('button', { name: /network sample/i }).click();
  await page.getByRole('button', { name: /start conversion/i }).click();

  await expect(page.getByText(/Status:/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Editable document/i)).toBeVisible({ timeout: 120000 });
  await expect(page.getByText(/OCR result score/i)).toBeVisible({ timeout: 120000 });

  const editable = page.locator('[contenteditable="true"]').first();
  await editable.click();
  await editable.pressSequentially(' updated');
  await page.getByRole('button', { name: /save all pages/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: /preview pdf/i }).click();
  await expect(page.getByText(/PDF export preview/i)).toBeVisible({ timeout: 30000 });

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PDF$/i }).click();
  expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);

  const docxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /DOCX/i }).click();
  expect((await docxDownload).suggestedFilename()).toMatch(/\.docx$/);
});
