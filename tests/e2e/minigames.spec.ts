import { expect, test, type Page } from '@playwright/test';

async function pressPin(page: Page, pin: string, submit: RegExp) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: submit }).click();
}

/** First-run setup with the demo players; Terdoo plays on Little Explorer. */
async function setup(page: Page, player: 'Terdoo' | 'Afa' = 'Terdoo') {
  await page.goto('/');
  await page.getByRole('button', { name: /let's set up/i }).click();
  await pressPin(page, '2580', /next/i);
  await pressPin(page, '2580', /save/i);
  await page.getByRole('checkbox', { name: /wrote it down/i }).check();
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /afa & terdoo/i }).click();
  await page.getByRole('button', { name: new RegExp(player, 'i') }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(player);
}

test('Memory Magic: find every pair and earn the Puzzle Master badge', async ({ page }, info) => {
  await setup(page);
  await page.goto('/play/memory-magic?seed=11');
  await page.getByRole('button', { name: /1 player/i }).click();
  const cards = page.getByTestId('memory-card');
  await expect(cards).toHaveCount(8);
  await info.attach('memory', { body: await page.screenshot(), contentType: 'image/png' });
  const symbols = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-symbol')!));
  const done = new Set<number>();
  for (let i = 0; i < symbols.length; i++) {
    if (done.has(i)) continue;
    const j = symbols.findIndex((s, k) => k !== i && s === symbols[i]);
    await cards.nth(i).click();
    await cards.nth(j).click();
    done.add(i).add(j);
  }
  await expect(page.getByText(/you found all 4 pairs in 4 turns/i)).toBeVisible();
  await expect(page.getByRole('img', { name: /3 of 3 stars/i })).toBeVisible();
  await page.goto('/achievements');
  await expect(page.locator('li', { hasText: 'Puzzle Master' })).toContainText('Collected');
});

test('Math Quest: open all eight doors', async ({ page }, info) => {
  await setup(page);
  await page.goto('/play/math-quest?seed=5');
  await page.getByRole('button', { name: /start the quest/i }).click();
  for (let d = 0; d < 8; d++) {
    const q = page.getByTestId('question');
    await expect(q).toBeVisible();
    const text = (await q.textContent())!;
    let answer: number;
    const sum = text.match(/(\d+) \+ (\d+)/);
    if (sum) answer = Number(sum[1]) + Number(sum[2]);
    else {
      const label = await page.getByTestId('door').locator('[aria-label$="pictures"]').getAttribute('aria-label');
      answer = Number(label!.split(' ')[0]);
    }
    if (d === 0) await info.attach('math', { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: String(answer), exact: true }).click();
    if (d < 7) await expect(page.getByRole('list', { name: `Door ${d + 2} of 8` })).toBeVisible();
  }
  await expect(page.getByText(/opened all 8 magic doors! 8 on the first try/i)).toBeVisible();
});

test('Word Adventure: pick the first letter of each picture', async ({ page }, info) => {
  await setup(page);
  await page.goto('/play/word-adventure?seed=3');
  await page.getByRole('button', { name: /let's go/i }).click();
  for (let r = 0; r < 8; r++) {
    await expect(page.getByText(`Word ${r + 1} of 8`)).toBeVisible();
    const word = await page.locator('span[role="img"]').first().getAttribute('aria-label');
    if (r === 0) await info.attach('words', { body: await page.screenshot(), contentType: 'image/png' });
    // A wrong letter first: it is gently disabled.
    if (r === 0) {
      const wrong = page.getByRole('button', { name: /^Letter / }).filter({ hasNotText: word![0].toUpperCase() }).first();
      await wrong.click();
      await expect(wrong).toBeDisabled();
    }
    await page.getByRole('button', { name: `Letter ${word![0].toUpperCase()}` }).click();
  }
  await expect(page.getByText(/finished all 8 words! 7 on the first try/i)).toBeVisible();
});

test('Word Adventure (Adventurer): spell each word with letter tiles', async ({ page }, info) => {
  await setup(page, 'Afa');
  await page.goto('/play/word-adventure?seed=8');
  await page.getByRole('button', { name: /let's go/i }).click();
  for (let r = 0; r < 8; r++) {
    await expect(page.getByText(`Word ${r + 1} of 8`)).toBeVisible();
    const word = (await page.locator('span[role="img"]').first().getAttribute('aria-label'))!.toUpperCase();
    if (r === 0) await info.attach('spelling', { body: await page.screenshot(), contentType: 'image/png' });
    for (const ch of word) await page.getByRole('button', { name: `Letter ${ch}` }).and(page.locator(':enabled')).first().click();
    await expect(page.getByText(/you spelled it/i).or(page.getByText(/finished all 8/i))).toBeVisible();
  }
  await expect(page.getByText(/finished all 8 words! 8 on the first try/i)).toBeVisible();
});

test('Space Explorer: fly the rocket and visit three planets', async ({ page }, info) => {
  await setup(page);
  await page.goto('/play/space-explorer?seed=2&testhooks=1');
  await page.getByRole('button', { name: /blast off/i }).click();
  await page.waitForFunction(() => !!(window as unknown as { __space?: unknown }).__space);
  const y = () => page.evaluate(() => (window as unknown as { __space: { state(): { y: number } } }).__space.state().y);
  const y0 = await y();
  await page.keyboard.down('ArrowUp');
  await expect.poll(y).toBeLessThan(y0 - 40);
  await page.keyboard.up('ArrowUp');
  await info.attach('space', { body: await page.screenshot(), contentType: 'image/png' });
  for (const planet of ['Mars', 'Jupiter', 'Saturn']) {
    await page.evaluate(() => (window as unknown as { __space: { visitPlanet(): void } }).__space.visitPlanet());
    await expect(page.getByRole('dialog', { name: `You reached ${planet}` })).toBeVisible();
    await page.getByRole('button', { name: /fly on|finish the trip/i }).click();
  }
  await expect(page.getByText(/you visited 3 planets/i)).toBeVisible();
});

test('Rainbow Kart: the kart drives, laps count and the race finishes', async ({ page }, info) => {
  test.setTimeout(60_000);
  await setup(page);
  await page.goto('/play/rainbow-kart?testhooks=1');
  await page.getByRole('button', { name: /start race/i }).click();
  await page.waitForFunction(() => !!(window as unknown as { __kart?: unknown }).__kart);
  const st = () => page.evaluate(() => (window as unknown as { __kart: { state(): { progress: number; speed: number } } }).__kart.state());
  await expect.poll(async () => (await st()).progress, { timeout: 15_000 }).toBeGreaterThan(5);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowLeft');
  await info.attach('kart', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(page.getByTestId('kart-lap')).toHaveText('Lap 1/2');
  await page.evaluate(() => (window as unknown as { __kart: { nearFinish(): void } }).__kart.nearFinish());
  await expect(page.getByText(/you finished (1st|2nd|3rd)/i)).toBeVisible({ timeout: 15_000 });
  await page.goto('/achievements');
  await expect(page.locator('li', { hasText: 'Racing Champion' })).toContainText('Collected');
});
