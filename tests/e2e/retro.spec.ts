import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const ROM = resolve(process.cwd(), 'tests/fixtures/color-test.nes');
const SNES_ZIP = resolve(process.cwd(), 'tests/fixtures/color-test-sfc.zip');

async function pressPin(page: Page, pin: string, submit: RegExp) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: submit }).click();
}

async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /let's set up/i }).click();
  await pressPin(page, '2580', /next/i);
  await pressPin(page, '2580', /save/i);
  await page.getByRole('checkbox', { name: /wrote it down/i }).check();
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /afa & terdoo/i }).click();
  // Wait for the player picker, so the next click can't hit the "Afa & Terdoo" button again.
  await expect(page.getByRole('heading', { level: 1, name: "Who's playing?" })).toBeVisible();
  await page.getByRole('button', { name: /afa/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Afa');
}

/** Average colour of the middle of the game screen. */
async function screenColor(page: Page): Promise<[number, number, number]> {
  // Bounding boxes are relative to the main page, even for elements inside the iframe.
  const canvas = await page.frameLocator('iframe').locator('canvas').first().boundingBox();
  if (!canvas) return [0, 0, 0];
  const cx = canvas.x + canvas.width / 2;
  // On tall phone screens the picture sits at the top, with touch buttons below it.
  const cy = canvas.y + Math.min(canvas.height, canvas.width * 0.75) / 2;
  const shot = await page.screenshot({ clip: { x: cx - 20, y: cy - 20, width: 40, height: 40 } });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return [r / n, g / n, b / n] as [number, number, number];
  }, shot.toString('base64'));
}

const isBlue = ([r, , b]: number[]) => b > 200 && r < 120;
const isGreen = ([r, g, b]: number[]) => g > 180 && r < 140 && b < 140;

test('parent imports, tests and enables a retro game; a child plays, saves and continues', async ({ page }, info) => {
  test.setTimeout(120_000);
  await setup(page);

  // Parent-only import
  await page.goto('/parent/retro');
  await expect(page.getByText(/grown-ups only/i)).toBeVisible();
  await pressPin(page, '2580', /^ok$/i);
  await page.getByTestId('rom-input').setInputFiles(ROM);
  await expect(page.getByText(/valid NES game/i)).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Color Test');
  await page.getByRole('button', { name: 'Add game' }).click();
  await expect(page.getByText(/not tested yet/i)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /kids can play/i })).toBeDisabled();

  // Test launch
  await page.getByRole('button', { name: '▶ Test' }).click();
  await expect(page.getByTestId('retro-console')).toBeVisible();
  await expect(page.getByText(/loading the console/i)).toBeHidden({ timeout: 30_000 });
  await expect.poll(() => screenColor(page).then(isBlue), { timeout: 20_000 }).toBe(true);
  await page.getByRole('button', { name: 'Exit' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await page.getByRole('checkbox', { name: /kids can play/i }).click();
  await expect(page.getByRole('checkbox', { name: /kids can play/i })).toBeChecked();
  await expect(page.getByText(/kids can play/i).first()).toBeVisible();

  // Child plays
  await page.getByRole('button', { name: 'Lock' }).click();
  await page.goto('/retro');
  await page.getByRole('button', { name: '▶ Play' }).first().click();
  await expect(page.getByText(/loading the console/i)).toBeHidden({ timeout: 30_000 });
  await expect.poll(() => screenColor(page).then(isBlue), { timeout: 20_000 }).toBe(true);

  // Keyboard input reaches the game: holding Z (the A button) turns the screen green
  await page.locator('iframe').click();
  await page.keyboard.down('z');
  await expect.poll(() => screenColor(page).then(isGreen), { timeout: 5000 }).toBe(true);
  await page.screenshot({ path: `test-results/screens/retro-${info.project.name}.png` });
  await page.keyboard.up('z');
  await expect.poll(() => screenColor(page).then(isBlue), { timeout: 5000 }).toBe(true);

  // Pause / resume
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: /tap to keep playing/i })).toBeVisible();
  await page.getByRole('button', { name: /tap to keep playing/i }).click();

  // Save to slot 1, then exit (auto-saves) and come back
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: /slot 1/i }).click();
  await expect(page.getByText(/saved in slot 1/i)).toBeVisible();
  await page.getByRole('button', { name: 'Exit' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/retro/i);

  await page.goto('/');
  await expect(page.getByTestId('row-retro')).toContainText('Color Test');
  await page.getByTestId('row-retro').getByRole('button', { name: '▶ Play' }).click();
  await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/loading the console/i)).toBeHidden({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Load' }).click();
  await page.getByRole('button', { name: /slot 1/i }).click();
  await expect(page.getByText(/loaded slot 1/i)).toBeVisible();
});

test.describe('SNES', () => {
  // Without the offline service worker, so the test can see (and refuse) every page load.
  test.use({ serviceWorkers: 'block' });

  test('a parent imports a zipped Super Nintendo game; a child plays it with the keyboard and saves', async ({ page }) => {
    test.setTimeout(120_000);
    // Like Replit's workspace preview: opening the console page as its own page inside a
    // frame is refused, while normal file requests work. The console must still start.
    const pageLoads: string[] = [];
    await page.route('**/emulatorjs/player.html', (route) => {
      if (route.request().resourceType() === 'document') {
        pageLoads.push(route.request().url());
        return route.fulfill({ status: 403, contentType: 'text/html', body: 'refused to connect' });
      }
      return route.continue();
    });
    await setup(page);
    await page.goto('/parent/retro');
    await pressPin(page, '2580', /^ok$/i);
    await page.getByLabel(/1\. system/i).selectOption('snes');
    await page.getByTestId('rom-input').setInputFiles(SNES_ZIP);
    await expect(page.getByText(/valid SNES game/i)).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue('Color Test');
    await page.getByRole('button', { name: 'Add game' }).click();
    await page.getByRole('button', { name: '▶ Test' }).click();
    await expect(page.getByText(/loading the console/i)).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => screenColor(page).then(isBlue), { timeout: 30_000 }).toBe(true);
    await page.getByRole('button', { name: 'Exit' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await page.getByRole('checkbox', { name: /kids can play/i }).click();
    await expect(page.getByRole('checkbox', { name: /kids can play/i })).toBeChecked();
    await page.getByRole('button', { name: 'Lock' }).click();

    await page.goto('/retro');
    await page.getByRole('button', { name: '▶ Play' }).first().click();
    await expect(page.getByText(/loading the console/i)).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => screenColor(page).then(isBlue), { timeout: 30_000 }).toBe(true);
    await page.locator('iframe').click();
    await page.keyboard.down('z');
    await expect.poll(() => screenColor(page).then(isGreen), { timeout: 5000 }).toBe(true);
    await page.keyboard.up('z');
    await expect.poll(() => screenColor(page).then(isBlue), { timeout: 5000 }).toBe(true);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: /slot 1/i }).click();
    await expect(page.getByText(/saved in slot 1/i)).toBeVisible();
    // The console never needed to be opened as its own page.
    expect(pageLoads).toEqual([]);
  });
});

test('the retro console page cannot be opened for a game that is not enabled', async ({ page }) => {
  await setup(page);
  await page.goto('/play/rom%3Adoes-not-exist');
  await expect(page.getByText(/isn't available/i)).toBeVisible();
});
