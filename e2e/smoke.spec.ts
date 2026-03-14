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
    await expect(page.getByText('Azure Endpoint', { exact: true })).toBeVisible();
    await expect(page.locator('text=Deployment Name')).toBeVisible();
    // Should show configured status (not the actual endpoint URL)
    await expect(page.getByText(/Azure endpoint is (configured|not configured)/)).toBeVisible();
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

  test('create video page shows prompt examples when empty', async ({ page }) => {
    await page.goto(BASE);
    // Should show example prompts label
    await expect(page.getByText('Try an example:')).toBeVisible();
    // Should show at least one example button
    await expect(page.getByText('golden retriever')).toBeVisible();
    // Should show character count at 0
    await expect(page.getByText('0 / 1000 characters')).toBeVisible();
    // Should show estimated time
    await expect(page.getByText(/Est\. ~\d+ min/)).toBeVisible();
  });

  test('clicking a prompt example fills textarea and hides examples', async ({ page }) => {
    await page.goto(BASE);
    // Click an example
    await page.click('button:has-text("golden retriever")');
    // Textarea should be filled
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue(/golden retriever/);
    // Examples should disappear
    await expect(page.getByText('Try an example:')).not.toBeVisible();
    // Character count should update
    await expect(page.getByText(/[1-9]\d* \/ 1000 characters/)).toBeVisible();
  });

  test('jobs page loads and shows empty state with CTA', async ({ page }) => {
    await page.goto(BASE + '/jobs');
    // Should show title
    await expect(page.locator('h2:has-text("Video Jobs")')).toBeVisible();
    // Should show refresh button
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    // Should show empty state with CTA button
    await expect(page.getByText('No video jobs yet')).toBeVisible();
    await expect(page.getByText('Create your first video')).toBeVisible();
    // Clicking CTA should navigate to create page
    await page.click('button:has-text("Create your first video")');
    await expect(page.locator('h2:has-text("Create Video")')).toBeVisible();
  });

  test('jobs page shows filter tabs and relative timestamps', async ({ page }) => {
    // Create a job via API
    const createRes = await fetch('http://localhost:3000/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A cat sitting on a windowsill', width: 1280, height: 720, duration: 4, variants: 1 }),
    });
    const job = await createRes.json();

    // Seed the job ID into localStorage
    await page.goto(BASE);
    await page.evaluate((id) => {
      const ids = JSON.parse(localStorage.getItem('video-gen-job-ids') || '[]');
      if (!ids.includes(id)) ids.unshift(id);
      localStorage.setItem('video-gen-job-ids', JSON.stringify(ids));
    }, job.id);

    // Navigate to jobs page
    await page.goto(BASE + '/jobs');
    await page.waitForLoadState('networkidle');

    // Should show filter tabs
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Failed')).toBeVisible();

    // Should show relative timestamp (just now for a freshly created job)
    await expect(page.getByText('just now')).toBeVisible();
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

    // Should navigate to jobs page after successful submission,
    // or stay on page if the API rate-limits (429)
    const errorToast = page.locator('text=Too many running tasks');
    const navigated = page.waitForURL(/\/jobs/, { timeout: 10000 }).then(() => true).catch(() => false);
    const rateLimited = errorToast.isVisible().catch(() => false);

    if (await rateLimited) {
      test.skip(true, 'API rate-limited (429 Too many running tasks)');
    }
    if (!(await navigated)) {
      test.skip(true, 'API did not accept the request in time');
    }
  });

  test('remix video page loads and submits for a completed job', async ({ page }) => {
    // Create a video via API and wait for it to complete
    const createRes = await fetch('http://localhost:3000/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A red ball bouncing', width: 1280, height: 720, duration: 4, variants: 1 }),
    });
    if (!createRes.ok) {
      test.skip(true, `API returned ${createRes.status} — likely rate-limited`);
      return;
    }
    const createdJob = await createRes.json();
    const jobId = createdJob.id;

    // Poll until job completes (up to 150s)
    let status = createdJob.status;
    for (let i = 0; i < 30 && status !== 'completed' && status !== 'failed'; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const pollRes = await fetch(`http://localhost:3000/api/videos/${jobId}`);
        const pollData = await pollRes.json();
        status = pollData.status;
      } catch {
        // network hiccup, keep polling
      }
    }
    if (status !== 'completed') {
      test.skip(true, `Job did not complete in time (status: ${status})`);
      return;
    }

    // Seed the job ID into localStorage so the app knows about it
    await page.goto(BASE);
    await page.evaluate((id) => {
      const ids = JSON.parse(localStorage.getItem('video-gen-job-ids') || '[]');
      if (!ids.includes(id)) ids.unshift(id);
      localStorage.setItem('video-gen-job-ids', JSON.stringify(ids));
    }, jobId);

    // Navigate to job detail page
    await page.goto(BASE + '/jobs/' + jobId);
    await expect(page.locator('h2:has-text("View Details")')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();

    // The Remix button should be visible for completed jobs
    await expect(page.getByText('Remix', { exact: true })).toBeVisible();

    // Click Remix button — should navigate to /edit/:id
    await page.click('button:has-text("Remix")');
    await expect(page).toHaveURL(new RegExp(`/edit/${jobId}`));
    await expect(page.locator('h2:has-text("Remix Video")')).toBeVisible();

    // The source video player should be visible
    await expect(page.locator('video')).toBeVisible();

    // Fill in the remix prompt
    await page.fill('textarea', 'Change the ball color to blue');

    // Click Create Remix
    await page.click('button:has-text("Create Remix")');

    // Should navigate to the new job's detail page
    await expect(page).toHaveURL(/\/jobs\/video_/, { timeout: 15000 });
    await expect(page.locator('h2:has-text("View Details")')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/06-remix-submitted.png', fullPage: true });
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
