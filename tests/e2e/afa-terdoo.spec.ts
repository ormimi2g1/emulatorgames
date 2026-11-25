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
  await page.getByRole('checkbox', { name: /wrote it down/i }).check();
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /afa & terdoo/i }).click();
  // Wait for the player picker, so the next click can't hit the "Afa & Terdoo" button again.
  await expect(page.getByRole('heading', { level: 1, name: "Who's playing?" })).toBeVisible();
  await page.getByRole('button', { name: /afa/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Afa');
}

interface State {
  x: number;
  y: number;
  tileX: number;
  onGround: boolean;
  hearts: number;
  stars: number;
  crystal: boolean;
  secret: boolean;
  bossHits: number;
  gateOpen: boolean;
  finished: boolean;
  boss: { x: number; y: number } | null;
}

const state = (page: Page) => page.evaluate(() => (window as unknown as { __afa: { state(): State } }).__afa.state());
const teleport = (page: Page, tx: number, ty: number) =>
  page.evaluate(([x, y]) => (window as unknown as { __afa: { teleport(x: number, y: number): void } }).__afa.teleport(x, y), [tx, ty]);

async function startLevel(page: Page, hero: RegExp, world: RegExp) {
  await page.goto('/play/afa-terdoo?testhooks=1');
  await page.getByRole('button', { name: hero }).click();
  await page.getByRole('button', { name: world }).click();
  await expect(page.getByTestId('game-canvas').locator('canvas')).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { __afa?: unknown }).__afa);
  await expect.poll(async () => (await state(page)).onGround, { timeout: 10_000 }).toBe(true);
}

test('Afa runs, jumps, finds the crystal and finishes World 1; World 2 unlocks', async ({ page }, info) => {
  test.setTimeout(90_000);
  await setup(page);
  await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible();
  await startLevel(page, /play as afa/i, /world 1/i);

  // Keyboard: run right and jump.
  const start = await state(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await state(page)).x, { timeout: 5000 }).toBeGreaterThan(start.x + 40);
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await state(page)).onGround).toBe(true);
  const moved = await state(page);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await state(page)).y, { timeout: 5000 }).toBeLessThan(moved.y - 30);
  await page.keyboard.up('Space');
  await info.attach('world-1', { body: await page.screenshot(), contentType: 'image/png' });

  // The secret ledge with the rainbow crystal (row 3, x 56-58).
  await teleport(page, 56, 3);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await state(page)).crystal).toBe(true);
  expect((await state(page)).secret).toBe(true);

  // Pause menu
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: /keep playing/i }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();

  // Walk into the rainbow gate.
  await teleport(page, 131, 12);
  await page.keyboard.down('ArrowRight');
  await expect(page.getByText(/you finished sunshine meadows/i)).toBeVisible({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.getByText(/rainbow crystal found/i)).toBeVisible();
  await info.attach('results', { body: await page.screenshot(), contentType: 'image/png' });

  // Progress is saved: World 2 is open on the world map.
  await page.getByRole('button', { name: /world map/i }).click();
  await expect(page.getByRole('button', { name: /play world 2/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /world 3.*locked/i })).toBeDisabled();

  // Badges were unlocked.
  await page.goto('/achievements');
  await expect(page.getByText('Rainbow Collector')).toBeVisible();
});

test('Terdoo fits through the Tunnel Tree; the Gloomy Cloud opens the gate', async ({ page }) => {
  test.setTimeout(90_000);
  await setup(page);
  await startLevel(page, /play as terdoo/i, /world 1/i);
  await teleport(page, 131, 12);
  await page.keyboard.down('ArrowRight');
  await expect(page.getByText(/you finished/i)).toBeVisible({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: /next: magical forest/i }).click();
  await page.waitForFunction(() => (window as unknown as { __afa?: { state(): { level: string } } }).__afa?.state().level === 'w2-magical-forest');
  await expect.poll(async () => (await state(page)).onGround, { timeout: 10_000 }).toBe(true);

  // Terdoo is small enough to walk into the one-tile tunnel and reach the secret.
  await teleport(page, 38, 12);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await state(page)).secret, { timeout: 5000 }).toBe(true);
  await expect.poll(async () => (await state(page)).crystal, { timeout: 5000 }).toBe(true);
  await page.keyboard.up('ArrowRight');

  // Finish World 2 to reach the boss in World 3.
  await teleport(page, 141, 12);
  await page.keyboard.down('ArrowRight');
  await expect(page.getByText(/you finished magical forest/i)).toBeVisible({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: /next: crystal caverns/i }).click();
  await page.waitForFunction(() => (window as unknown as { __afa?: { state(): { level: string } } }).__afa?.state().level === 'w3-crystal-caverns');
  await expect.poll(async () => (await state(page)).onGround, { timeout: 10_000 }).toBe(true);

  // The gate is closed until the cloud cheers up.
  expect((await state(page)).gateOpen).toBe(false);
  await teleport(page, 142, 12);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  expect((await state(page)).finished).toBe(false);
  // Bounce on the cloud three times: drop the hero just above it and let gravity do the rest.
  for (let i = 0; i < 20 && (await state(page)).bossHits < 3; i++) {
    const b = (await state(page)).boss!;
    await teleport(page, Math.floor(b.x / 32), Math.floor((b.y - 60) / 32));
    await page.waitForTimeout(1100);
  }
  expect((await state(page)).bossHits).toBe(3);
  await expect.poll(async () => (await state(page)).gateOpen).toBe(true);
  await teleport(page, 142, 12);
  await page.keyboard.down('ArrowRight');
  await expect(page.getByText(/every rainbow crystal home/i)).toBeVisible({ timeout: 15_000 });
  await page.keyboard.up('ArrowRight');
});
