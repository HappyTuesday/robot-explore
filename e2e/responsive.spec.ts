import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    const within = (el: Element) => { const r=el.getBoundingClientRect(); return r.left>=-1 && r.top>=-1 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1; };
    const cells=Array.from(document.querySelectorAll('.board-cell'));
    const controls=Array.from(document.querySelectorAll('.direction-pad button, .energy-section, .energy-section strong, .mini-stats strong, .game-heading-actions'));
    const energy=document.querySelector('.energy-section')!.getBoundingClientRect();
    const stats=document.querySelector('.mini-stats')!.getBoundingClientRect();
    return root.scrollWidth<=innerWidth && root.scrollHeight<=innerHeight && cells.length>0 && [...cells,...controls].every(within) && energy.bottom<=stats.top+1;
  })).toBe(true);
}
async function dialogFits(page: Page) {
  await expect.poll(() => page.getByRole('dialog').evaluate(el => {
    const r=el.getBoundingClientRect();
    return el.scrollHeight<=el.clientHeight+1 && el.scrollWidth<=el.clientWidth+1 && r.top>=0 && r.bottom<=innerHeight+1;
  })).toBe(true);
}
test('all map sizes fit after landscape/portrait resize without hiding cells or controls',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/#/games/energy');
  for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:1180,height:720},{width:820,height:1180},{width:1366,height:650},{width:393,height:852},{width:320,height:568},{width:852,height:393}]) {
    await page.setViewportSize(viewport);
    for(const label of ['轻松探索','勇敢冒险','超级挑战']) {
      await page.getByRole('button',{name:'地图设置',exact:true}).click();
      await dialogFits(page);
      await page.getByRole('button',{name:new RegExp(label)}).click();
      await page.getByRole('button',{name:'开始新的探险'}).click();
      await expect(page.locator('.board-cell')).toHaveCount(label==='轻松探索'?20:label==='勇敢冒险'?30:42);
      await fits(page);
    }
    await page.getByRole('button',{name:'怎么玩',exact:true}).click();await dialogFits(page);
    await page.getByRole('button',{name:'明白啦，出发！'}).click();
    await page.locator('[data-index="1"]').click();await page.locator('[data-index="2"]').click();await dialogFits(page);
    await expect(page.getByRole('button',{name:/放弃挑战/})).toBeInViewport();
    const equation=(await page.locator('.equation').textContent())!.match(/(\d+)\s*([+−])\s*(\d+)/)!;
    const correct=equation[2]==='+'?+equation[1]+ +equation[3]:+equation[1]- +equation[3];
    const choices=await page.locator('.answer-grid button').allTextContents();
    const wrong=choices.find(n=>Number(n)!==correct)!;
    await page.locator('.answer-grid').getByRole('button',{name:wrong,exact:true}).click();
    await expect(page.getByRole('heading',{name:'再接再厉，你一定可以！'})).toBeVisible();await dialogFits(page);
    await page.getByRole('button',{name:'再试一次',exact:true}).click();
  }
});
test('entering the game never requests browser fullscreen and the current tile is borderless',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window, '__fullscreenCalls', {value:0,writable:true});
    Element.prototype.requestFullscreen=function(){Reflect.set(window,'__fullscreenCalls',Reflect.get(window,'__fullscreenCalls')+1);return Promise.resolve();};
  });
  await page.goto('/');await page.getByRole('button',{name:'开始我的探险'}).click();await fits(page);
  await expect(page.getByRole('button',{name:/进入全屏|退出全屏/})).toHaveCount(0);
  expect(await page.evaluate(()=>Reflect.get(window,'__fullscreenCalls'))).toBe(0);
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
  const tileStyle=await page.locator('.board-cell.current').evaluate(el=>{
    const style=getComputedStyle(el);return {border:style.borderTopWidth,outline:style.outlineStyle,shadow:style.boxShadow};
  });
  expect(tileStyle).toEqual({border:'0px',outline:'none',shadow:'none'});
  await page.setViewportSize({width:1024,height:768});await fits(page);
  await expect.poll(()=>page.locator('.board-cell').first().evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(105);
  expect(await page.locator('.energy-section strong').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(30);
  expect(await page.locator('.mini-stats strong').last().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(30);
  await page.getByRole('link',{name:'返回探索乐园'}).click();
  await expect(page.getByRole('heading',{name:'挑一个世界，出发吧'})).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflow)).not.toBe('hidden');
});
test('rotation preserves the current run and victory actions fit short screens',async({page})=>{
  await page.goto('/#/games/energy');
  await page.setViewportSize({width:1024,height:768});
  await page.locator('[data-index="1"]').click();
  await page.setViewportSize({width:768,height:1024});
  await expect(page.locator('[data-index="1"]')).toHaveClass(/current/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','75');
  for(const index of [2,3,4,9,14,19]) {
    await page.locator(`[data-index="${index}"]`).click();
    if(await page.locator('.equation').isVisible()) {
      const parts=(await page.locator('.equation').textContent())!.match(/(\d+)\s*([+−])\s*(\d+)/)!;
      const answer=parts[2]==='+'?+parts[1]+ +parts[3]:+parts[1]- +parts[3];
      await page.locator('.answer-grid').getByRole('button',{name:String(answer),exact:true}).click();
      await expect(page.locator('.equation')).toHaveCount(0);
    }
  }
  await expect(page.getByRole('heading',{name:'太棒啦，探险成功！'})).toBeVisible();
  for(const size of [{width:1024,height:768},{width:320,height:568},{width:667,height:375},{width:852,height:393}]) {
    await page.setViewportSize(size);await dialogFits(page);
    await expect(page.getByRole('button',{name:'探索下一关'})).toBeInViewport();
  }
  await page.getByRole('button',{name:'探索下一关'}).click();await fits(page);
});
