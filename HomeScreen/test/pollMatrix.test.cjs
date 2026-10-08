const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});});
after(async()=>{await browser?.close();});
for(const mode of ['compact','full'])test(`polls: all 50 footprints, QR bounds, live totals, zero/hidden/closed and long labels: ${mode}`,async(t)=>{
  const page=await browser.newPage({viewport:{width:mode==='compact'?960:1920,height:1080}});t.after(()=>page.close());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:5174/?polls=1&mode=${mode}`);await page.locator('[data-card=poll] [data-testid=poll-question]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  const report=()=>page.locator('[data-card=poll] article [data-testid=adaptive-poll]').evaluateAll(nodes=>nodes.map(card=>{
    const box=card.getBoundingClientRect();const outside=[...card.querySelectorAll('[data-testid=poll-question],[data-testid=poll-status],[data-testid=poll-result],[data-testid=poll-qr],[data-testid=poll-hint]')].filter(n=>{const r=n.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1||r.bottom>box.bottom+1;});
    const hint=card.querySelector('[data-testid=poll-hint]');const body=card.querySelector('[data-testid=poll-body]');
    return {size:card.closest('article').dataset.size,text:card.textContent,outside:outside.map(n=>n.dataset.testid),overlap:hint&&body.getBoundingClientRect().bottom>hint.getBoundingClientRect().top-2,rows:card.querySelectorAll('[data-testid=poll-result]').length,qr:!!card.querySelector('[data-testid=poll-qr]')};
  }));
  for(const patch of [null,{question:'A very long household poll question with several important choices and names to preserve without shrinking the primary text',results:[{id:'a',label:'An exceptionally long choice with several details',count:12}],total:12},{total:0,results:[]},{results:null},{state:'closed',endsAtMs:Date.now()-10000,total:12,results:[{id:'a',label:'Comedy',count:6},{id:'b',label:'Mystery',count:6}]}]){
    if(patch){await page.evaluate(p=>window.updatePollFixture(p),patch);await page.waitForTimeout(80);}
    const rows=await report();assert.equal(rows.length,50);assert.deepEqual(rows.filter(r=>r.outside.length||r.overlap),[],JSON.stringify(rows.filter(r=>r.outside.length||r.overlap)));
    assert.ok(rows.every(r=>r.rows<=4&&!/undefined|NaN/.test(r.text)));if(patch?.state==='closed')assert.ok(rows.every(r=>!r.qr));
  }
  const cards=page.locator('[data-multiple-polls] [role=button]');assert.equal(await cards.count(),2);assert.match(await cards.nth(1).getAttribute('aria-label'),/What is for dinner/);await cards.nth(1).click();assert.equal(await page.locator('[data-multiple-polls]').getAttribute('data-opened'),'poll_'+'b'.repeat(32));
  assert.deepEqual(errors,[]);
});
