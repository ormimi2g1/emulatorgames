import { expect, test, type Page } from '@playwright/test';

async function pressPin(page: Page, pin: string, submit: RegExp) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: submit }).click();
}

/** First-run setup with the demo players; Terdoo plays on Little Explorer. */
async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /let's set up/i }).click();
  await pressPin(page, '2580', /next/i);
  await pressPin(page, '2580', /save/i);
  await page.getByRole('checkbox', { name: /wrote it down/i }).check();
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /afa & terdoo/i }).click();
  await page.getByRole('button', { name: /terdoo/i }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Terdoo');
}

async function parentTab(page: Page, tab: string) {
  await page.goto('/parent');
  await pressPin(page, '2580', /^ok$/i);
  await page.getByRole('navigation', { name: 'Parent Zone' }).getByRole('link', { name: tab }).click();
}

/** Limits on for Terdoo, any hour of the day, so the test doesn't depend on the clock. */
async function limitTerdoo(page: Page, minutes: string, breakEvery = 'Off') {
  await parentTab(page, 'Playtime');
  const card = page.getByRole('region', { name: 'Playtime for Terdoo' });
  await card.getByRole('radio', { name: /use time limits/i }).click();
  await card.getByLabel('School days (Mon–Fri) for Terdoo').selectOption({ label: minutes });
  await card.getByLabel('Weekends for Terdoo').selectOption({ label: minutes });
  await card.getByLabel('Games allowed from for Terdoo').fill('00:00');
  await card.getByLabel('Games end at for Terdoo').fill('00:00');
  await card.getByLabel('Break reminder for Terdoo').selectOption({ label: breakEvery });
  return card;
}

test('daily limit: warning, friendly stop, and a grown-up adds time with the PIN', async ({ page }, info) => {
  await setup(page);
  await limitTerdoo(page, '15 min');
  await page.goto('/');
  await expect(page.getByTestId('playtime-badge')).toContainText('15 min of playtime left today');

  await page.goto('/play/memory-magic?testhooks=1');
  await page.getByRole('button', { name: /1 player/i }).click();
  await expect.poll(() => page.evaluate(() => !!(window as never as { __playtime?: unknown }).__playtime)).toBe(true);
  await page.evaluate(() => (window as never as { __playtime: { play: (s: number) => void } }).__playtime.play(11 * 60));
  await expect(page.getByTestId('playtime-warning')).toContainText(/left\. find a good place to stop/i);
  await info.attach('warning', { body: await page.screenshot(), contentType: 'image/png' });

  await page.evaluate(() => (window as never as { __playtime: { play: (s: number) => void } }).__playtime.play(4 * 60));
  const stop = page.getByTestId('playtime-stop');
  await expect(stop).toContainText("That's all the playtime for today!");
  await info.attach('time-up', { body: await page.screenshot(), contentType: 'image/png' });

  // A wrong PIN doesn't help; the right one does.
  await stop.getByRole('button', { name: /grown-up: more time/i }).click();
  await pressPin(page, '1111', /^ok$/i);
  await expect(stop.getByRole('alert')).toContainText(/not right/i);
  await pressPin(page, '2580', /^ok$/i);
  await stop.getByRole('button', { name: '+10 min' }).click();
  await expect(stop).toBeHidden();
  await expect(page.getByTestId('memory-card').first()).toBeVisible();

  // Time is saved: after a reload the extension and the used time are still there.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => (window as never as { __playtime?: { state: () => { extraMinutes: number; seconds: number } } }).__playtime?.state()))
    .toMatchObject({ extraMinutes: 10 });

  // The dashboard shows the time and the game.
  await parentTab(page, 'Dashboard');
  await expect(page.getByRole('region', { name: 'Most played games' })).toContainText('Memory Magic');
  await expect(page.getByTestId('progress-Terdoo')).toContainText(/today 15 min/i);
  await info.attach('dashboard', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('break reminder pauses Space Explorer, then play goes on', async ({ page }, info) => {
  await setup(page);
  await limitTerdoo(page, '1 h', 'Every 15 min');
  await page.goto('/play/space-explorer?testhooks=1&seed=3');
  await page.getByRole('button', { name: /blast off/i }).click();
  await expect.poll(() => page.evaluate(() => !!(window as never as { __space?: unknown }).__space)).toBe(true);
  await page.evaluate(() => (window as never as { __playtime: { play: (s: number) => void } }).__playtime.play(15 * 60));
  await expect(page.getByTestId('playtime-break')).toContainText(/break time/i);
  await info.attach('break', { body: await page.screenshot(), contentType: 'image/png' });
  // The ship is frozen during the break.
  const y = await page.evaluate(() => (window as never as { __space: { state: () => { y: number } } }).__space.state().y);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowDown');
  expect(await page.evaluate(() => (window as never as { __space: { state: () => { y: number } } }).__space.state().y)).toBe(y);
  await page.evaluate(() => (window as never as { __playtime: { endBreak: () => void } }).__playtime.endBreak());
  await expect(page.getByTestId('playtime-break')).toBeHidden();
});

test('"Pause play now" stops games until the parent switches it off', async ({ page }) => {
  await setup(page);
  await parentTab(page, 'Playtime');
  const pauseBox = page.getByRole('checkbox', { name: 'Pause play now for Terdoo' });
  await pauseBox.click();
  await expect(pauseBox).toBeChecked();
  await page.goto('/play/math-quest');
  const stop = page.getByTestId('playtime-stop');
  await expect(stop).toContainText('A grown-up paused the games.');
  await expect(stop.getByRole('button', { name: /more time/i })).toHaveCount(0);
  await stop.getByRole('button', { name: /back to the arcade/i }).click();
  await expect(page.getByTestId('playtime-badge')).toContainText(/grown-up paused/i);
  await parentTab(page, 'Playtime');
  await pauseBox.click();
  await expect(pauseBox).not.toBeChecked();
  await page.goto('/play/math-quest');
  await expect(page.getByRole('button', { name: /start the quest/i })).toBeVisible();
  await expect(page.getByTestId('playtime-stop')).toHaveCount(0);
});

test('controllers: live test and button mapping (simulated gamepad)', async ({ page }, info) => {
  // Browsers only show real controllers; this fake one stands in for the Gamepad API.
  await page.addInitScript(() => {
    const w = window as never as { __fakePad: number[] };
    w.__fakePad = [];
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          index: 0,
          id: 'Test Pad (simulated)',
          connected: true,
          axes: [0, 0, 0, 0],
          buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: w.__fakePad.includes(i), touched: false, value: 0 })),
        },
      ],
    });
  });
  await setup(page);
  await parentTab(page, 'Controllers');
  await expect(page.getByTestId('pad')).toContainText('Test Pad (simulated)');
  await page.evaluate(() => ((window as never as { __fakePad: number[] }).__fakePad = [0]));
  await expect(page.getByTestId('pad')).toContainText('Pressed: A / Cross (button 0)');
  await page.evaluate(() => ((window as never as { __fakePad: number[] }).__fakePad = []));

  await page.getByRole('button', { name: 'Change controller button for jump' }).click();
  await page.evaluate(() => ((window as never as { __fakePad: number[] }).__fakePad = [3]));
  await expect(page.getByRole('button', { name: 'Change controller button for jump' })).toHaveText('Y / Triangle (button 3)');
  await page.evaluate(() => ((window as never as { __fakePad: number[] }).__fakePad = []));

  await page.getByRole('button', { name: 'Change keyboard key for jump' }).click();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('status').filter({ hasText: /pick another key/i })).toBeVisible();
  await page.keyboard.press('KeyJ');
  await expect(page.getByRole('button', { name: 'Change keyboard key for jump' })).toHaveText('J');
  await info.attach('controllers', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  // Saved for next time.
  await parentTab(page, 'Controllers');
  await expect(page.getByRole('button', { name: 'Change keyboard key for jump' })).toHaveText('J');
  await page.getByRole('button', { name: /use the usual buttons/i }).click();
  await expect(page.getByRole('button', { name: 'Change keyboard key for jump' })).toHaveText('Space');
});
