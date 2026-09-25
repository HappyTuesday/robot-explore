import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
async function solveQuestion(page: Page) {
  const equation = page.locator('.equation');
  if (await equation.isVisible()) {
    const text = (await equation.textContent())!;
    const match = text.match(/(\d+)\s*([+−])\s*(\d+)/)!;
    const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);
    await page.locator('.answer-grid').getByRole('button', { name: String(answer), exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
}
async function enter(page: Page) { await page.goto('/'); await page.getByRole('button',{name:'关闭声音',exact:true}).click(); await page.getByRole('button',{name:'开始我的探险'}).click(); await expect(page.locator('.board-cell')).toHaveCount(20); }
test('lobby, navigation, help, and responsive layout', async ({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'挑一个世界，出发吧'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'给家长的话'}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'一起守护好奇心'}).click();
  await page.getByRole('link',{name:'我的成就'}).click();await expect(page.getByText('等待你的探索')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('energy, correct math, win, saved achievements, and next level',async({page})=>{
  await enter(page);
  await page.locator('[data-index="1"]').click();await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','75');
  await page.locator('[data-index="2"]').click();await expect(page.getByRole('dialog',{name:'小怪兽的数学挑战'})).toBeVisible();
  await solveQuestion(page);
  for(const index of [3,4,9,14,19]){await page.locator(`[data-index="${index}"]`).click();await solveQuestion(page);}
  await expect(page.getByRole('heading',{name:'太棒啦，探险成功！'})).toBeVisible();
  await page.getByRole('button',{name:'探索下一关'}).click();await expect(page.locator('.level-chip')).toContainText('02');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','60');
  await page.getByRole('link',{name:'我的成就'}).click();await expect(page.getByText('已获得 · 你真棒！')).toHaveCount(1);
  await page.reload();await expect(page.getByText('已获得 · 你真棒！')).toHaveCount(1);
});
test('wrong answer triggers explosion and same-map retry',async({page})=>{
  await enter(page);const layout=await page.locator('.board-cell').evaluateAll(cells=>cells.map(c=>c.getAttribute('data-kind')));
  await page.locator('[data-index="1"]').click();await page.locator('[data-index="2"]').click();
  const text=(await page.locator('.equation').textContent())!;const match=text.match(/(\d+)\s*([+−])\s*(\d+)/)!;
  const answer=match[2]==='+'?+match[1]+ +match[3]:+match[1]- +match[3];
  for(const button of await page.locator('.answer-grid button').all()){if(Number(await button.textContent())!==answer){await button.click();break;}}
  await expect(page.locator('.explosion')).toBeAttached();
  await expect(page.getByRole('heading',{name:'再接再厉，你一定可以！'})).toBeVisible();
  await page.getByRole('button',{name:'再试一次',exact:true}).click();
  await expect(page.locator('[data-index="0"]')).toHaveClass(/current/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','60');
  expect(await page.locator('.board-cell').evaluateAll(cells=>cells.map(c=>c.getAttribute('data-kind')))).toEqual(layout);
});
test('map sizes, dialog keyboard gating, and accessible navigation',async({page})=>{
  await enter(page);
  await page.getByRole('button',{name:'怎么玩',exact:true}).click();await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-index="0"]')).toHaveClass(/current/);
  await page.getByRole('button',{name:'明白啦，出发！'}).click();
  await page.getByRole('button',{name:'地图设置',exact:true}).click();await page.getByRole('button',{name:/超级挑战/}).click();
  await page.getByRole('button',{name:'开始新的探险'}).click();await expect(page.locator('.board-cell')).toHaveCount(42);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('ArrowRight');await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
  await page.getByRole('button',{name:'重新开始本关',exact:true}).click();await page.getByRole('button',{name:'准备好了，重新出发'}).click();await expect(page.locator('[data-index="0"]')).toHaveClass(/current/);
});
test('abandoning keeps the original tile, costs one energy, and requires a new challenge to pass',async({page})=>{
  await enter(page);
  await page.locator('[data-index="1"]').click();
  for(const energy of [74,73]) {
    await page.locator('[data-index="2"]').click();
    await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
    await expect(page.locator('[data-index="2"] .cell-monster')).toBeAttached();
    await page.getByRole('button',{name:/放弃挑战/}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(energy));
    await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
    await expect(page.locator('[data-index="2"]')).not.toHaveClass(/visited/);
    await expect(page.locator('[data-index="3"]')).toBeDisabled();
    await expect(page.locator('.mini-stats strong').first()).toHaveText('1');
    await expect(page.locator('.mini-stats strong').last()).toHaveText('0');
  }
  await page.locator('[data-index="2"]').click();await solveQuestion(page);
  await expect(page.locator('[data-index="2"]')).toHaveClass(/current/);
  await expect(page.locator('.mini-stats strong').last()).toHaveText('1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','73');
  await page.locator('[data-index="1"]').click();await page.locator('[data-index="2"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
