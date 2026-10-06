const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
async function scheduleReport(page) {
  return page.locator('[data-card="schedule"] [data-testid="adaptive-schedule"]').evaluateAll(cards => cards.map(card => {
    const box = card.getBoundingClientRect();
    const content = card.querySelector('[data-testid="schedule-content"]').getBoundingClientRect();
    const hint = card.querySelector('[data-testid="schedule-details-hint"]')?.getBoundingClientRect();
    const outside = [...card.querySelectorAll('[data-testid^="schedule-"]')].filter(node => {
      const r = node.getBoundingClientRect();
      return r.bottom > box.bottom + 1 || r.right > box.right + 1 || r.left < box.left - 1;
    });
    return {size:card.closest('article').dataset.size, text:card.textContent,
      following:card.querySelectorAll('[data-testid="schedule-event"]').length,
      labels:[...card.querySelectorAll('[data-testid="schedule-featured"], [data-testid="schedule-event"]')].map(n => n.getAttribute('aria-label')),
      font:parseFloat(getComputedStyle(card.querySelector('[data-testid="schedule-featured-title"]')).fontSize),
      overlap:hint ? content.bottom > hint.top - 4 : false, outside:outside.map(n => n.dataset.testid)};
  }));
}

function assertScheduleBounds(report, mode) {
  assert.equal(report.length, 50);
  assert.deepEqual(report.filter(c => c.outside.length || c.overlap), [], 'Schedule content and details hint must fit');
  for (const card of report) {
    assert.ok(card.following <= 4, `${card.size} must cap the preview at five events`);
    assert.ok(card.font >= (mode === 'compact' ? 18 : 25.2) - 0.01, `${card.size} preserves readable primary text`);
    assert.equal(new Set(card.labels).size, card.labels.length, `${card.size} repeats an event`);
    assert.doesNotMatch(card.text, /NaN|undefined/);
  }
}
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
  await area.getByRole('button', {name:'Schedule. Open details', exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await area.getAttribute('data-opened'), 'schedule');
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
    const outside = [...card.querySelectorAll('[data-testid="card-row"], [data-testid="activity-metric"], [data-testid="activity-stats"], [data-testid="activity-weekly-chart"], [data-testid="activity-weekly-summary"], [data-testid="card-hero"], [data-testid^="weather-"], [data-testid^="schedule-"]')].filter((node) => {
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
  for (const expected of ['0°', 'Clear', 'H 0° · L 0°', '0% humidity', 'Feels like 0°', '0 mph wind']) {
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

for (const mode of ['compact', 'full']) test(`weather visual hierarchy, partial data and long labels: ${mode}`, async (t) => {
  const page = await browser.newPage({viewport:{width:mode==='compact'?960:1920,height:1080}});
  t.after(() => page.close());
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:5174/?mode=${mode}`);
  await page.locator('[data-card="weather"] [data-testid="weather-temperature"]').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const cards=page.locator('[data-card="weather"] [data-testid="adaptive-weather"]');
  const report=async()=>cards.evaluateAll(nodes=>nodes.map(card=>{
    const box=card.getBoundingClientRect();
    const content=card.querySelector('[data-testid="weather-content"]').getBoundingClientRect();
    const hint=card.querySelector('[data-testid="weather-details-hint"]')?.getBoundingClientRect();
    const outside=[...card.querySelectorAll('[data-testid^="weather-"]')].filter(node=>{
      const r=node.getBoundingClientRect();return r.bottom>box.bottom+1||r.right>box.right+1||r.left<box.left-1;
    });
    return {size:card.closest('article').dataset.size, text:card.textContent,
      hours:card.querySelectorAll('[data-testid="weather-hour"]').length,
      days:card.querySelectorAll('[data-testid="weather-day"]').length,
      tempFont:parseFloat(getComputedStyle(card.querySelector('[data-testid="weather-temperature"]')).fontSize),
      overlap:hint?content.bottom>hint.top-4:false,outside:outside.map(n=>n.dataset.testid)};
  }));
  let initial=await report();
  assert.equal(initial.length,50);
  assert.deepEqual(initial.filter(c=>c.outside.length||c.overlap),[]);
  for(const card of initial){
    assert.ok(card.text.includes('72°')&&card.text.includes('Partly cloudy'));
    assert.doesNotMatch(card.text,/\+\d+ more/);
    assert.ok(card.hours<=4&&card.days<=4);
    assert.ok(card.tempFont>=(mode==='compact'?32:44.8)-0.01);
  }
  const large=initial.find(c=>c.size==='12x6');
  assert.equal(large.hours,4);assert.equal(large.days,4);
  assert.equal(initial.find(c=>c.size==='3x2').hours,0);
  if(process.env.CARD_SCREENSHOT_DIR) {
    for(const size of ['3x2','3x3','3x4','3x6','7x2','12x6']) {
      await page.locator(`[data-card="weather"] [data-size="${size}"]`).screenshot({path:`${process.env.CARD_SCREENSHOT_DIR}/${mode}-weather-${size}.png`});
    }
  }

  const patch={temp:'-12°',condition:'Thunderstorms with intermittent heavy rain',conditionIcon:'cloud-rain',
    feelsLike:0,high:0,humidity:0,windSpeed:0,
    forecast:[{day:'Wednesday',condition:'Snow',icon:'snowflake',high:0,low:-12}],
    hourly:['12:00 AM','03:00 AM','06:00 AM','09:00 AM'].map((time,i)=>({time,temp:i===0?0:-12,icon:'moon',pop:i===0?'0%':'invalid'}))};
  await page.evaluate(patch=>{
    window.updateFixture({weather:patch,activeLocation:{id:'long',name:'A very long neighborhood and city name',query:'test'}});
  },patch);
  await page.waitForFunction(()=>document.querySelector('[data-testid="weather-temperature"]').textContent==='-12°');
  const partial=await report();
  assert.deepEqual(partial.filter(c=>c.outside.length||c.overlap),[]);
  assert.ok(partial.every(c=>!c.text.includes('L 0°')),'missing low is not copied from high');
  assert.ok(partial.find(c=>c.size==='12x6').text.includes('0%'));
  assert.equal(await cards.last().locator('[data-testid="weather-hour"]').first().getAttribute('aria-label'),'12:00 AM, 0°, 0% chance of rain');
  assert.doesNotMatch(partial.map(c=>c.text).join(''),/NaN|undefined|invalid/);

  await page.evaluate(()=>window.updateFixture({weather:{temp:'0°',condition:'Clear',forecast:[{day:'Tue',condition:'Rain',icon:'cloud-rain',high:0,low:-2}]}}));
  await page.waitForFunction(()=>document.querySelector('[data-testid="weather-temperature"]').textContent==='0°');
  const dailyOnly=await report();
  assert.ok(dailyOnly.every(c=>c.hours===0));
  assert.ok(dailyOnly.find(c=>c.size==='12x6').days>0,'daily forecast replaces missing hourly data');
  assert.deepEqual(dailyOnly.filter(c=>c.outside.length||c.overlap),[]);
  await page.evaluate(()=>window.updateFixture({weather:null}));
  await page.waitForFunction(()=>document.querySelector('[data-testid="weather-condition"]').textContent==='Unavailable');
  assert.equal(await cards.locator('[data-testid="weather-hour"], [data-testid="weather-day"], [data-testid="weather-hero"] [aria-hidden="true"]').count(),0);
  assert.deepEqual(errors,[]);
});

for (const mode of ['compact', 'full']) test(`Schedule sparse, busy and long calendars across all footprints: ${mode}`, async (t) => {
  const page = await browser.newPage({viewport:{width:mode === 'compact' ? 960 : 1920, height:1080}});
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:5174/?mode=${mode}`);
  await page.locator('[data-testid="schedule-time"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const event = {id:'one', title:'Lunch with Alex', time:'12:30 PM', endTime:'1:30 PM', category:'Personal', color:'#49b4e7', date:'2026-10-06'};
  const cases = [
    {schedule:[], upcomingEvents:[]},
    {schedule:[event], upcomingEvents:[]},
    {schedule:[], upcomingEvents:[{...event, date:'2026-10-07'}]},
    {schedule:Array.from({length:24}, (_, i) => ({...event, id:`today${i}`, title:['Lunch with Alex','Dentist appointment','Pick up groceries','Family dinner'][i % 4]})),
      upcomingEvents:Array.from({length:30}, (_, i) => ({...event, id:`future${i}`, title:['Project review','Weekend plans','Annual checkup'][i % 3], date:`2026-10-${String(7 + Math.floor(i / 3)).padStart(2,'0')}`}))},
    {schedule:Array.from({length:8}, (_, i) => ({...event, id:`long${i}`, title:'An unusually long appointment title with several important names and places to preserve',
      time:['All Day','Continues','', '10:30 AM'][i % 4], endTime:'Continues', category:'An unusually long calendar category', color:'invalid'})),
      upcomingEvents:[{...event, id:'undated', date:'invalid', time:''}, {...event, id:'next', date:'2026-10-07'}]},
  ];
  for (const [index, patch] of cases.entries()) {
    await page.evaluate(patch => window.updateFixture(patch), patch);
    await page.waitForTimeout(50);
    const report = await scheduleReport(page);
    assertScheduleBounds(report, mode);
    if (index === 0) assert.ok(report.every(c => c.text.includes('No events to show') && c.following === 0));
    if (index === 1 || index === 2) assert.ok(report.every(c => c.text.includes('Lunch with Alex') && c.following === 0));
    if (index === 3) {
      const large = report.find(c => c.size === '12x6');
      assert.ok(large.text.includes('More today') && large.text.includes('Coming up'));
      assert.equal(large.following, 4);
      if (process.env.CARD_SCREENSHOT_DIR) for (const size of ['3x2','3x3','3x4','3x6','8x2','12x6']) {
        await page.locator(`[data-card="schedule"] [data-size="${size}"]`).screenshot({path:`${process.env.CARD_SCREENSHOT_DIR}/${mode}-schedule-${size}.png`});
      }
    }
    if (index === 1 && process.env.CARD_SCREENSHOT_DIR) await page.locator('[data-card="schedule"] [data-size="6x4"]').screenshot({path:`${process.env.CARD_SCREENSHOT_DIR}/${mode}-schedule-sparse.png`});
  }
  assert.deepEqual(errors, []);
});

test('Schedule follows TV time at start, end and calendar midnight without a feed refresh', async (t) => {
  const page = await browser.newPage({viewport:{width:960,height:1080}});
  t.after(() => page.close());
  await page.clock.install({time:new Date('2026-10-06T13:59:59Z')});
  await page.clock.pauseAt(new Date('2026-10-06T13:59:59Z'));
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('[data-testid="schedule-time"]').first().waitFor();
  const timed = (id, title, start, end, date = '2026-10-06') => ({id, title, time:'10:00 AM', endTime:'11:00 AM', category:'Personal', color:'', date,
    startMs:Date.parse(start), endMs:Date.parse(end), allDay:false, timeZone:'America/New_York'});
  const patch = {schedule:[
    timed('meeting','Morning meeting','2026-10-06T14:00:00Z','2026-10-06T15:00:00Z'),
    timed('next','Next appointment','2026-10-06T15:00:00Z','2026-10-06T16:00:00Z'),
    {...timed('day','All-day reminder','2026-10-06T04:00:00Z','2026-10-07T04:00:00Z'), allDay:true, time:'All Day'},
  ], upcomingEvents:[timed('tomorrow','Tomorrow appointment','2026-10-07T14:00:00Z','2026-10-07T15:00:00Z','2026-10-07')]};
  await page.evaluate(patch => window.updateFixture(patch), patch);
  let report = await scheduleReport(page);
  assert.ok(report.every(c => c.text.includes('Morning meeting') && !c.text.includes('Happening now')));
  await page.clock.fastForward(1000);
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-schedule"]').textContent.includes('Happening now'));
  assertScheduleBounds(await scheduleReport(page), 'compact');
  await page.clock.fastForward(3600000);
  await page.waitForFunction(() => !document.querySelector('[data-testid="adaptive-schedule"]').textContent.includes('Morning meeting'));
  report = await scheduleReport(page);
  assert.ok(report.every(c => c.text.includes('Next appointment') && c.text.includes('Happening now')));
  assertScheduleBounds(report, 'compact');
  await page.clock.fastForward(3600000);
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-schedule"]').textContent.includes('All-day reminder'));
  assert.ok((await scheduleReport(page)).every(c => !c.text.includes('Happening now') && !c.text.includes('Next appointment')));
  await page.clock.fastForward(12 * 3600000);
  await page.waitForFunction(() => document.querySelector('[data-testid="adaptive-schedule"]').textContent.includes('Tomorrow appointment'));
  report = await scheduleReport(page);
  assert.ok(report.every(c => c.text.includes('1 today') && !c.text.includes('All-day reminder')));
  assertScheduleBounds(report, 'compact');
  await page.evaluate(() => window.updateFixture({schedule:[{id:'legacy', title:'Legacy appointment', time:'10:00 AM', endTime:'11:00 AM', date:'2026-10-07', category:'Home',color:''}],upcomingEvents:[]}));
  await page.clock.fastForward(8 * 3600000);
  report = await scheduleReport(page);
  assert.ok(report.every(c => c.text.includes('Legacy appointment') && !c.text.includes('Happening now')));
});
