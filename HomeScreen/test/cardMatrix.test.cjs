const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
for (const layout of ['rows', 'grid']) test(`dashboard ${layout} reuse labeled cards and open the selected details`, async (t) => {
  const page = await browser.newPage({viewport:{width:960,height:1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:5174/?layout=${layout}`);
  const area = page.locator('[data-dashboard-layout]');
  await area.locator('[data-testid="adaptive-meal"]').waitFor();
  assert.equal(await area.getByRole('button').count(), 6);
  const weather = area.getByRole('button', {name:'Weather. Open details', exact:true});
  await weather.focus();
  await page.keyboard.press('Enter');
  assert.equal(await area.getAttribute('data-opened'), 'weather');
  await area.getByRole('button', {name:'Meals. Open details', exact:true}).click();
  assert.equal(await area.getAttribute('data-opened'), 'meal');
  assert.deepEqual(errors, []);
});
for (const mode of ['compact', 'full']) test(`all six cards, all 50 grid footprints: ${mode}`, async (t) => {
  const page = await browser.newPage({viewport:{width:mode==='compact'?960:1920,height:1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror',(error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:5174/?mode=${mode}`);
  await page.locator('[data-measured] [data-testid="adaptive-meal"]').waitFor({timeout:10000}).catch(()=>assert.fail(JSON.stringify(errors)));
  // Wait for onLayout to settle without allowing hidden content to mask overflow.
  await page.waitForTimeout(800);
  assert.deepEqual(errors, []);
  const report = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="adaptive-"]')].map((card) => {
    const box = card.getBoundingClientRect();
    const outside = [...card.querySelectorAll('[data-testid="card-row"], [data-testid="activity-metric"], [data-testid="activity-stats"], [data-testid="activity-weekly-chart"], [data-testid="activity-weekly-summary"], [data-testid="card-hero"]')].filter((node) => {
      const r=node.getBoundingClientRect(); return r.bottom>box.bottom+1 || r.right>box.right+1 || r.left<box.left-1;
    });
    return {id:card.dataset.testid, size:card.closest('article')?.dataset.size, rows:card.querySelectorAll('[data-testid="card-row"]').length,
      text:card.textContent, outside:outside.map((node)=>node.textContent)};
  }));
  assert.equal(report.length,301);
  assert.deepEqual(report.filter((card)=>card.outside.length), [], 'visible rows/hero/metrics must fit');
  for (const card of report.filter((c)=>c.id==='adaptive-activity')) {
    for (const expected of ['1,843','2.3','94','1,256']) assert.ok(card.text.includes(expected), `${card.size} missing ${expected}`);
  }
  const meal = report.find((c)=>c.id==='adaptive-meal'&&c.size==='6x4');
  assert.ok(meal.rows>=1 && meal.rows<=4, `6x4 Meals should show a few readable previews, got ${meal.rows}`);
  const media = report.find((c)=>c.id==='adaptive-media'&&c.size==='3x6');
  assert.ok(media.rows>=1 && media.rows<=3, `3x6 Media should show large queue previews, got ${media.rows}`);
  const tallActivity = report.find((c)=>c.id==='adaptive-activity'&&c.size==='3x4');
  assert.ok(tallActivity.text.includes('45,500 steps'), 'medium tall Activity retains weekly steps before the chart breakpoint');
  for (let w=3; w<=12; w++) {
    let hadWeekly = false;
    for (let h=2; h<=6; h++) {
      const card = report.find((c)=>c.id==='adaptive-activity'&&c.size===`${w}x${h}`);
      const hasWeekly = card.text.includes('45,500 steps');
      assert.ok(!hadWeekly || hasWeekly, `${w}x${h} lost weekly total as height increased`);
      hadWeekly ||= hasWeekly;
    }
  }
  for (let h=2; h<=6; h++) {
    let hadWeekly = false;
    for (let w=3; w<=12; w++) {
      const card = report.find((c)=>c.id==='adaptive-activity'&&c.size===`${w}x${h}`);
      const hasWeekly = card.text.includes('45,500 steps');
      assert.ok(!hadWeekly || hasWeekly, `${w}x${h} lost weekly total as width increased`);
      hadWeekly ||= hasWeekly;
    }
  }
  const previewStyles = await page.evaluate(() => [...document.querySelectorAll('[data-card="meal"] [data-testid="card-row"], [data-card="media"] [data-testid="card-row"]')].map((row)=>({
    font:parseFloat(getComputedStyle(row.querySelector('[data-testid="card-row-title"]')).fontSize), height:row.getBoundingClientRect().height,
    media:row.closest('[data-card]').dataset.card==='media'
  })));
  for (const row of previewStyles) {
    assert.ok(row.font >= (mode==='compact'?14:19.6)-0.01, 'preview titles must remain readable');
    if(row.media) assert.ok(row.height >= (mode==='compact'?64:89.6)-0.01, 'queue artwork must retain its large height');
  }
  const activity = report.find((c)=>c.id==='adaptive-activity'&&c.size==='3x3');
  assert.ok(activity.text.includes('18%'), 'medium Activity retains centered percentage ring');
  const minimumTasks = report.find((c)=>c.id==='adaptive-todo'&&c.size==='3x2');
  assert.ok(minimumTasks.rows>=2, 'smallest Tasks should still list multiple tasks');
  assert.equal(await page.locator('[data-card="media"] [data-size="3x2"] [role="progressbar"]').getAttribute('aria-valuenow'),'0','real zero playback position remains visible in the smallest card');
  if(process.env.CARD_SCREENSHOT_DIR) {
    for(const [id,size] of [['meal','6x3'],['meal','6x4'],['activity','3x4'],['activity','3x6'],['media','3x5'],['media','3x6'],['weather','6x4'],['schedule','6x4'],['todo','3x2']]) {
      await page.locator(`[data-card="${id}"] [data-size="${size}"]`).screenshot({path:`${process.env.CARD_SCREENSHOT_DIR}/${mode}-${id}-${size}.png`});
    }
  }
  // Empty, unavailable and absent optional data must be truthful, with no fabricated zeros.
  await page.evaluate(()=>window.updateFixture({schedule:[], tasks:[], meals:{status:'not_connected',items:[]},health:{status:'unavailable'}}));
  await page.waitForFunction(()=>document.querySelector('[data-testid="adaptive-todo"]').textContent.includes('All caught up'));
  assert.match(await page.locator('[data-testid="adaptive-meal"]').first().textContent(),/Connect a meal sheet/);
  assert.match(await page.locator('[data-testid="adaptive-activity"]').first().textContent(),/Activity unavailable/);
  assert.match(await page.locator('[data-testid="adaptive-schedule"]').first().textContent(),/Upcoming appointment/,'tomorrow becomes primary when today is empty');
  assert.deepEqual(errors, []);
});

test('summary loading does not hide independently loaded Play Next and cards recover on refresh', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  await page.evaluate(() => window.updateFixture({isLoading: true}));
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-weather"]').textContent.includes('Loading…'));
  for (const id of ['weather', 'schedule', 'activity', 'meal', 'todo']) {
    assert.match(await page.locator(`[data-testid="adaptive-${id}"]`).first().textContent(), /Loading…/);
  }
  assert.match(await page.locator('[data-testid="adaptive-media"]').first().textContent(), /Only Murders/);
  await page.evaluate(() => window.updateFixture({isLoading: false, tasks: [{id: 'new', title: 'New task after refresh', due: null}]}));
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-todo"]').textContent.includes('1 task to do'));
  assert.match(await page.locator('[data-card="todo"] [data-size="6x4"]').textContent(), /New task after refresh/);
  assert.doesNotMatch(await page.locator('[data-testid="adaptive-weather"]').first().textContent(), /Loading…/);
  assert.deepEqual(errors, []);
});

test('meal dates, completed tasks and zero weather values remain truthful after data changes', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 1080}});
  t.after(() => page.close());
  await page.goto('http://127.0.0.1:5174/');
  await page.evaluate(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    window.updateFixture({
      meals: {status: 'ok', items: [
        {date: '2999-01-01', title: 'Later dinner'},
        {date: '2000-01-01', title: 'Past dinner'},
        {date: today, title: 'Dinner tonight', servings: '0', cook: 'Alex'},
      ]},
      tasks: [{id: 'done', title: 'Already finished', due: null, completed: true}, {id: 'pending', title: 'Pending task', due: null}],
      weather: {temp: '0', condition: 'Clear', high: 0, low: 0, humidity: 0, feelsLike: 0, windSpeed: 0},
    });
  });
  const meal = page.locator('[data-card="meal"] [data-size="6x4"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-meal"]').textContent.includes('Dinner tonight'));
  const mealText = await meal.textContent();
  assert.ok(mealText.indexOf('Dinner tonight') < mealText.indexOf('Later dinner'));
  assert.match(mealText, /Tonight · Serves 0 · Cook: Alex/);
  assert.doesNotMatch(mealText, /Past dinner/);
  const tasks = await page.locator('[data-card="todo"] [data-size="6x4"]').textContent();
  assert.match(tasks, /1 task to do.*Pending task/);
  assert.doesNotMatch(tasks, /Already finished|Due /);
  const weather = await page.locator('[data-card="weather"] [data-size="12x6"]').textContent();
  for (const expected of ['0° · Clear', 'H 0° · L 0°', '0% humidity', 'Feels like 0°', '0 mph wind']) {
    assert.ok(weather.includes(expected), `missing real zero value: ${expected}`);
  }
});

test('Play Next status changes distinguish access, empty queues and missing playback duration', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 1080}});
  t.after(() => page.close());
  await page.goto('http://127.0.0.1:5174/');
  for (const [status, message] of [
    ['permission', 'Open to enable TV listings access'],
    ['ready', 'No unfinished programs'],
    ['error', 'Currently unavailable'],
    ['loading', 'Loading your queue…'],
    ['web', 'Programs are available on Android TV'],
  ]) {
    await page.evaluate((status) => window.updateWatchFixture({items: [], status}), status);
    await page.waitForFunction((message) => document.querySelector('[data-testid="adaptive-media"]').textContent.includes(message), message);
    assert.equal(await page.locator('[data-card="media"] [role="progressbar"]').count(), 0);
  }
  await page.evaluate(() => window.updateWatchFixture({status: 'ready', items: [{
    id: 1, title: 'Undated progress', appName: 'TV app', packageName: 'tv.app', episodeTitle: null,
    season: '2', episode: '3', posterUri: null, lastEngagementMs: null, positionMs: 0, durationMs: null,
  }]}));
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-media"]').textContent.includes('Undated progress'));
  assert.match(await page.locator('[data-card="media"] [data-size="6x4"]').textContent(), /TV app · S2 · E3/);
  assert.equal(await page.locator('[data-card="media"] [role="progressbar"]').count(), 0);
});

test('weather details retain forecasts, accessible city selection and keyboard focus', async (t) => {
  const page = await browser.newPage({viewport: {width: 960, height: 1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  const detail = page.locator('[data-weather-detail]');
  await detail.getByText('Hourly Forecast', {exact: true}).waitFor();
  assert.match(await detail.textContent(), /2 PM.*73°.*10%/);
  assert.match(await detail.textContent(), /Extended Forecast.*Day 0.*Clear.*61°.*78°/);
  const work = detail.getByRole('tab', {name: 'Show weather for Work'});
  await work.focus();
  assert.equal(await work.evaluate((node) => getComputedStyle(node).borderTopWidth), '3px');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-weather-detail]').textContent.includes('📍 Work'));
  assert.equal(await work.getAttribute('aria-selected'), 'true');
  assert.equal(await detail.getByRole('tab', {name: 'Show weather for Home'}).getAttribute('aria-selected'), 'false');
  await page.evaluate(() => window.updateFixture({weather: {temp: '0°', condition: 'Clear', humidity: 0, windSpeed: 0, pressure: 0}}));
  await page.waitForFunction(() => document.querySelector('[data-weather-detail]').textContent.includes('Hourly forecast unavailable.'));
  const text = await detail.textContent();
  assert.match(text, /Humidity0%/);
  assert.match(text, /Wind0 mph/);
  assert.match(text, /Air Pressure0 hPa/);
  assert.match(text, /Extended forecast unavailable./);
  assert.doesNotMatch(text, /undefined|NaN|Feels like/);
  assert.deepEqual(errors, []);
});
