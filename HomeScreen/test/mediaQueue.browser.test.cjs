const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

for (const mode of ['compact', 'full']) for (const reading of [false, true]) {
  test(`Media queue fits every ${mode} footprint${reading ? ' with reading font' : ''}`, async t => {
    const browser = await chromium.launch({headless:true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
    t.after(() => browser.close());
    const page = await browser.newPage({viewport:{width:mode === 'compact' ? 1100 : 2000, height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:5174/?mode=${mode}${reading ? '&reading' : ''}`);
    await page.locator('[data-testid="adaptive-media"]').first().waitFor();
    const items = Array.from({length:18}, (_, i) => ({id:i, title:['Columbo', 'The Grand Budapest Hotel', 'Planet Earth', 'Only Murders in the Building'][i % 4],
      appName:'Prime Video', episodeTitle:null, season:'1', episode:'4', positionMs:1500, durationMs:10000,
      posterUri:'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="200"><rect width="140" height="200" fill="${['#75403a','#7c466c','#245a64','#796745'][i % 4]}"/><circle cx="70" cy="80" r="45" fill="#ffffff" opacity=".12"/><path d="M0 200 70 85 140 200" fill="#0f172a" opacity=".4"/></svg>`)}));
    for (const [name, queue] of [['posters',items], ['missing',items.map(item => ({...item,posterUri:null,title:'A long program title with several important names and episode details'}))],
      ['two',items.slice(0,2)], ['one',items.slice(0,1)], ['empty',[]]]) {
      await page.evaluate(items => window.updateWatchFixture({status:'ready', items}), queue);
      await page.waitForTimeout(150);
      const report = await page.locator('[data-card="media"] [data-testid="adaptive-media"]').evaluateAll(cards => cards.map(card => {
        const box = card.getBoundingClientRect();
        const previews = [...card.querySelectorAll('[data-testid="media-queue-item"]')];
        return {size:card.closest('article').dataset.size, text:card.textContent,
          previews:previews.length, titles:card.querySelectorAll('[data-testid="media-queue-title"]').length,
          remaining:card.querySelector('[data-testid="media-remaining"]')?.textContent,
          outside:[...card.querySelectorAll('[data-testid="card-hero"], [data-testid="media-queue"], [data-testid="media-queue-item"], [data-testid="media-progress"], [data-testid="media-art"]')].filter(node => {
            const r = node.getBoundingClientRect();
            return r.bottom > box.bottom + 1 || r.right > box.right + 1 || r.left < box.left - 1;
          }).map(node => node.dataset.testid),
          labels:previews.map(node => node.getAttribute('aria-label'))};
      }));
      assert.equal(report.length,50);
      assert.deepEqual(report.filter(card => card.outside.length), [], name);
      for (const card of report) {
        assert.ok(card.previews <= 3);
        assert.doesNotMatch(card.text,/undefined|NaN/);
        if (card.previews) {
          assert.equal(card.remaining, queue.length > card.previews + 1 ? `+${queue.length - card.previews - 1} more` : undefined);
          assert.ok(card.labels.every(Boolean));
          if (name === 'missing') assert.equal(card.titles,card.previews);
        }
        if (queue.length < 2) assert.equal(card.previews,0);
      }
      if (name === 'posters') {
        assert.equal(report.find(card => card.size === '3x2').previews,0);
        assert.ok(report.find(card => card.size === '12x2').previews > 0);
        if (process.env.CARD_SCREENSHOT_DIR && !reading) {
          for (const size of ['3x2','5x2','7x2','12x2']) await page.locator(`[data-card="media"] [data-size="${size}"]`)
            .screenshot({path:`${process.env.CARD_SCREENSHOT_DIR}/${mode}-media-queue-${size}.png`});
        }
      }
    }
    assert.deepEqual(errors,[]);
  });
}
