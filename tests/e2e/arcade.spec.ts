import { expect, test, type Page } from '@playwright/test';

async function pressPin(page: Page, pin: string, submit: RegExp) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: submit }).click();
}

async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /let's set up/i }).click();
  await pressPin(page, '2580', /next/i);
  await pressPin(page, '2580', /save/i);
  await expect(page.getByTestId('recovery-code')).toBeVisible();
  await page.getByRole('checkbox', { name: /wrote it down/i }).check();
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /afa & terdoo/i }).click();
  await page.getByRole('button', { name: /afa/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Afa');
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('first-run setup, home, persistence across reload', async ({ page }, info) => {
  await setup(page);
  await expect(page.getByTestId('featured')).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/screens/home-${info.project.name}.png`, fullPage: false });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Afa');
});

test('navigation reaches every section', async ({ page, isMobile }) => {
  await setup(page);
  const sections: [string, RegExp][] = [
    ['Adventure', /adventure/i],
    ['Retro', /retro/i],
    ['Learn', /learn & play/i],
    ['Racing', /racing/i],
    ['Puzzles', /puzzles/i],
    ['My Games', /my games/i],
    ['Achievements', /trophies/i],
  ];
  for (const [label, heading] of sections) {
    const nav = page.getByRole('navigation', { name: 'Main' }).filter({ visible: true });
    const direct = nav.getByRole('link', { name: new RegExp(`^${label}`) });
    if (isMobile && !(await direct.count())) {
      await nav.getByRole('button', { name: 'More' }).click();
      await page.getByRole('menuitem', { name: label, exact: true }).click();
    } else {
      await direct.first().click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    await noHorizontalOverflow(page);
  }
});

test('parent zone requires the PIN and stays locked after reload', async ({ page }, info) => {
  await setup(page);
  await page.goto('/parent');
  await expect(page.getByText(/grown-ups only/i)).toBeVisible();
  await pressPin(page, '9999', /^ok$/i);
  await expect(page.getByRole('alert')).toContainText(/not right/i);
  await pressPin(page, '2580', /^ok$/i);
  await expect(page.getByRole('heading', { name: /parent zone/i })).toBeVisible();
  await page.screenshot({ path: `test-results/screens/parent-${info.project.name}.png` });
  await page.reload();
  await expect(page.getByText(/grown-ups only/i)).toBeVisible();
});

test('PWA manifest and service worker are served', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await page.request.get(href!)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);
  const swReady = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10_000))]);
    return !!reg;
  });
  expect(swReady).toBe(true);
});
