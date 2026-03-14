import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Video Gen Playground - Smoke Tests', () => {
  test('homepage loads with Create Video form', async ({ page }) => {
    await page.goto(BASE);
    // Should show the app title
    await expect(page.locator('text=Video Gen Playground')).toBeVisible();
    // Should show the Create Video heading
    await expect(page.locator('h2:has-text("Create Video")')).toBeVisible();
    // Should have the prompt textarea
    await expect(page.locator('textarea')).toBeVisible();
    // Should have resolution and duration dropdowns
    await expect(page.locator('text=Resolution')).toBeVisible();
    await expect(page.locator('text=Duration')).toBeVisible();
    // Should have the Generate Video button
    await expect(page.locator('button:has-text("Generate Video")')).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto(BASE);

    // Navigate to Jobs
    await page.click('button:has-text("Video Jobs")');
    await expect(page.locator('h2:has-text("Video Jobs")')).toBeVisible();

    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();

    // Navigate back to Create
    await page.click('button:has-text("Create Video")');
    await expect(page.locator('h2:has-text("Create Video")')).toBeVisible();
  });

  test('language toggle switches to Chinese', async ({ page }) => {
    await page.goto(BASE);

    // Click language toggle
    await page.click('button:has-text("中文")');
    // UI should now show Chinese text
    await expect(page.locator('h2:has-text("创建视频")')).toBeVisible();
    await expect(page.locator('text=视频生成实验室')).toBeVisible();

    // Toggle back to English
    await page.click('button:has-text("English")');
    await expect(page.locator('h2:has-text("Create Video")')).toBeVisible();
  });

  test('settings page shows Azure config by default', async ({ page }) => {
    await page.goto(BASE + '/settings');
    // Azure should be the active provider
    await expect(page.locator('text=Azure Endpoint')).toBeVisible();
    await expect(page.locator('text=Deployment Name')).toBeVisible();
    // The endpoint input should have our configured value
    const endpointInput = page.locator('input[placeholder*="azure"]');
    await expect(endpointInput).toBeVisible();
  });

  test('settings page switches to OpenAI provider', async ({ page }) => {
    await page.goto(BASE + '/settings');
    // Click OpenAI button
    await page.click('button:has-text("OpenAI")');
    // Should show OpenAI API Key field
    await expect(page.locator('text=OpenAI API Key')).toBeVisible();
    // Azure fields should be hidden
    await expect(page.locator('text=Azure Endpoint')).not.toBeVisible();
  });

  test('create video form has correct Azure duration options', async ({ page }) => {
    await page.goto(BASE);
    const durationSelect = page.locator('select').nth(1); // second select is duration
    await durationSelect.click();
    const options = durationSelect.locator('option');
    const count = await options.count();
    // Should have 3 options: 4, 8, 12 seconds
    expect(count).toBe(3);
  });

  test('jobs page loads and shows empty state', async ({ page }) => {
    await page.goto(BASE + '/jobs');
    // Should show title
    await expect(page.locator('h2:has-text("Video Jobs")')).toBeVisible();
    // Should show refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('create video submits successfully', async ({ page }) => {
    await page.goto(BASE);

    // Fill in the prompt
    await page.fill('textarea', 'A beautiful sunset over the ocean with gentle waves');

    // Select resolution (first option is fine)
    // Select duration = 4 seconds
    const durationSelect = page.locator('select').nth(1);
    await durationSelect.selectOption('4');

    // Click Generate Video
    await page.click('button:has-text("Generate Video")');

    // Wait a moment and take screenshot to see what happened
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/05-after-submit.png', fullPage: true });

    // Should navigate to jobs page after successful submission
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
  });

  test('screenshot the full app flow', async ({ page }) => {
    // Create Video page
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/01-create-video.png', fullPage: true });

    // Jobs page
    await page.click('button:has-text("Video Jobs")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/02-jobs-list.png', fullPage: true });

    // Settings page
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/03-settings.png', fullPage: true });

    // Chinese language
    await page.click('button:has-text("中文")');
    await page.click('button:has-text("创建视频")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/04-chinese.png', fullPage: true });
  });
});
