import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const words = JSON.parse(readFileSync(new URL('../src/game/ocean/words.json', import.meta.url), 'utf8')) as { id: string; english: string; chinese: string }[];
async function dialogFits(page: Page) {
  await expect.poll(() => page.getByRole('dialog').evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1;
  })).toBe(true);
}
async function gameFits(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const within = (el: Element) => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; };
    const els = [...document.querySelectorAll('.board-cell, .direction-pad button, .energy-section, .energy-section strong, .mini-stats strong, .game-heading-actions')];
    const energy = document.querySelector('.energy-section')!.getBoundingClientRect(), stats = document.querySelector('.mini-stats')!.getBoundingClientRect();
    return els.every(within) && energy.bottom <= stats.top + 1 && document.documentElement.scrollHeight <= innerHeight;
  })).toBe(true);
}
async function enter(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '关闭声音', exact: true }).click();
  await page.getByRole('button', { name: '开始深海单词寻宝', exact: true }).click();
  await expect(page.locator('.ocean-shell .board-cell')).toHaveCount(20);
}
async function solve(page: Page) {
  const dialog = page.getByRole('dialog', { name: '章鱼守卫的单词挑战' });
  if (await dialog.isVisible()) {
    const id = await page.locator('.word-prompt strong').textContent();
    const target = words.find(w => w.english === id)!;
    await page.getByRole('button', { name: new RegExp(`图片 \\d：${target.chinese}$`) }).click();
    await expect(dialog).toHaveCount(0);
  }
}
test('ocean entrance, correct and wrong answers, rewards and isolated persistence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await enter(page);
  await page.locator('[data-index="1"]').click(); await page.locator('[data-index="2"]').click();
  await expect(page.locator('.word-choices')).toHaveAttribute('aria-busy', 'false');
  const id = await page.locator('.word-prompt strong').textContent();
  const target = words.find(w => w.english === id)!;
  const wrong = page.locator('.word-choices button').filter({ hasNot: page.locator(`[role="img"][aria-label="${target.chinese}"]`) }).first();
  await wrong.click(); await expect(wrong).toBeDisabled();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65');
  await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
  await solve(page);
  await expect(page.locator('[data-index="2"]')).toHaveClass(/current/);
  for (const index of [3, 4, 9, 14, 19]) { await page.locator(`[data-index="${index}"]`).click(); await solve(page); }
  await expect(page.getByRole('heading', { name: '太棒啦，找到宝藏！' })).toBeVisible();
  await expect(page.locator('.ocean-word-review .word-review-sprite').first()).toBeVisible();
  for (const size of [{width:320,height:568},{width:852,height:393},{width:1024,height:768}]) { await page.setViewportSize(size); await dialogFits(page); }
  await page.getByRole('button', { name: '探索下一关' }).click();
  await expect(page.locator('.level-chip')).toContainText('02');
  await page.getByRole('link', { name: '我的成就' }).click();
  await expect(page.locator('.ocean-achievements')).toContainText('1 次寻宝成功');
  const stored = await page.evaluate(() => ({ math: JSON.parse(localStorage.getItem('little-explorer-v1')!), ocean: JSON.parse(localStorage.getItem('little-explorer-ocean-v1')!) }));
  expect(stored.math.wins).toBe(0); expect(stored.math.monsters).toBe(0); expect(stored.ocean.correct).toBeGreaterThan(0);
  await page.reload(); await expect(page.locator('.ocean-achievements')).toContainText('1 次寻宝成功');
  expect(errors).toEqual([]);
});
test('broken images prevent answering and can be retried without charging energy', async ({ page }) => {
  await page.route('**/assets/words/*.webp', route => route.abort());
  await enter(page); await page.locator('[data-index="1"]').click(); await page.locator('[data-index="2"]').click();
  await expect(page.getByRole('button', { name: '重新加载图片' })).toBeVisible();
  await expect(page.locator('.word-choices button')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  await page.unroute('**/assets/words/*.webp');
  await page.getByRole('button', { name: '重新加载图片' }).click();
  await expect(page.locator('.word-choices')).toHaveAttribute('aria-busy', 'false');
  await solve(page); await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
});
test('help, abandon and keyboard gating', async ({ page }) => {
  await enter(page); await page.getByRole('button', { name: '怎么玩', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('读单词，选图片');
  await page.keyboard.press('ArrowRight'); await expect(page.locator('[data-index="0"]')).toHaveClass(/current/);
  await page.getByRole('button', { name: '明白啦，出发！' }).click();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: /放弃挑战/ }).click();
  await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '74');
  await expect(page.locator('[data-index="2"]')).not.toHaveClass(/visited/);
});
for (const size of [{width:1440,height:1000},{width:1366,height:650},{width:1024,height:768},{width:768,height:1024},{width:1180,height:720},{width:820,height:1180},{width:393,height:852},{width:320,height:568},{width:852,height:393}]) {
  test(`ocean board fits ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size); await enter(page);
    for (const [label, count] of [['轻松探索',20],['勇敢冒险',30],['超级挑战',42]] as const) {
      await page.getByRole('button', { name:'地图设置', exact:true }).click();
      await dialogFits(page);
      await page.getByRole('button', { name:new RegExp(label) }).click();
      await page.getByRole('button', { name:'开始新的探险' }).click();
      await expect(page.locator('.board-cell')).toHaveCount(count);
      await gameFits(page);
      const board = await page.locator('.board').boundingBox();
      expect(board!.x).toBeGreaterThanOrEqual(0); expect(board!.y).toBeGreaterThanOrEqual(0);
      expect(board!.x + board!.width).toBeLessThanOrEqual(size.width); expect(board!.y + board!.height).toBeLessThanOrEqual(size.height);
    }
    await page.getByRole('button', { name: '怎么玩', exact: true }).click(); await dialogFits(page);
    await page.getByRole('button', { name: '明白啦，出发！' }).click();
    await page.screenshot({ path: info.outputPath('ocean-board.png') });
  });
  test(`word cards fit ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size); await enter(page);
    await page.locator('[data-index="1"]').click(); await page.locator('[data-index="2"]').click();
    await expect(page.locator('.word-choices')).toHaveAttribute('aria-busy', 'false');
    await dialogFits(page);
    const abandon = await page.getByRole('button', { name:/放弃挑战/ }).boundingBox();
    expect(abandon!.y + abandon!.height).toBeLessThanOrEqual(size.height);
    for (const button of await page.locator('.word-choices button').all()) {
      const rect = await button.boundingBox(); expect(rect!.width).toBeGreaterThanOrEqual(44); expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('ocean-challenge.png') });
  });
}

test('rotation preserves challenge and repeated mistakes eventually allow same-map retry', async ({ page }) => {
  await enter(page); const layout = await page.locator('.board-cell').evaluateAll(cells => cells.map(c => c.getAttribute('data-kind')));
  await page.locator('[data-index="1"]').click(); await page.locator('[data-index="2"]').click();
  const word = await page.locator('.word-prompt strong').textContent();
  await page.setViewportSize({width:768,height:1024});
  await expect(page.locator('.word-prompt strong')).toHaveText(word!); await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','75');
  await page.setViewportSize({width:1024,height:768}); await dialogFits(page);
  // Three wrong options, retreat, and re-enter until oxygen is exhausted.
  while (!(await page.getByRole('heading',{name:'再接再厉，你一定可以！'}).isVisible())) {
    const id = await page.locator('.word-prompt strong').textContent(); const target = words.find(w => w.id === id)!;
    const wrong = page.locator('.word-choices button:not(:disabled)').filter({hasNot:page.locator(`[role="img"][aria-label="${target.chinese}"]`)});
    await expect(page.locator('.word-choices')).toHaveAttribute('aria-busy','false');
    if (await wrong.count()) { await wrong.first().click(); }
    else { await page.getByRole('button',{name:/放弃挑战/}).click(); await page.locator('[data-index="2"]').click(); }
    if (!(await page.locator('.word-prompt').count())) break;
  }
  await expect(page.getByRole('heading',{name:'再接再厉，你一定可以！'})).toBeVisible();
  await dialogFits(page); await page.getByRole('button',{name:'再试一次',exact:true}).click();
  await expect(page.locator('[data-index="0"]')).toHaveClass(/current/);
  expect(await page.locator('.board-cell').evaluateAll(cells => cells.map(c => c.getAttribute('data-kind')))).toEqual(layout);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','60');
});
