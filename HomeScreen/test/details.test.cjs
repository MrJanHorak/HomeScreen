const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => {await browser?.close();});
async function open(t, topic, width, reading = false, busy = false) {
  const page = await browser.newPage({viewport: {width, height: width === 960 ? 540 : 1080}});
  t.after(() => page.close()); const errors = [];
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const voices = ['ar', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'].flatMap((language) => Array.from({length: 8}, (_, i) => ({voiceURI: `${language}-${i}`, name: `${language.toLowerCase()}-x-test-${i}-local`, lang: language})));
    Object.defineProperty(window, 'speechSynthesis', {value: {getVoices: () => voices, addEventListener() {}, removeEventListener() {}, speak() {}, cancel() {}}});
    window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
  });
  await page.goto(`http://127.0.0.1:5177/details.html?topic=${topic}${reading ? '&reading' : ''}${busy ? '&busy' : ''}`);
  await page.getByTestId('detail-content').waitFor();
  await page.getByRole('dialog').waitFor();
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(100);
  return {page, errors};
}

for (const width of [960, 1920]) for (const reading of [false, true]) {
  test(`meal menu scrolls independently of tonight at ${width}, reading ${reading}`, async t => {
    const {page, errors} = await open(t, 'meal', width, reading, true);
    await page.setViewportSize({width, height: 540});
    const dinner = page.getByTestId('meal-detail-dinner');
    const menu = page.getByTestId('meal-detail-menu-scroll');
    const rows = page.getByTestId('meal-detail-following-dinner');
    await menu.waitFor();
    assert.equal(await rows.count(), 13);
    const before = await dinner.boundingBox();
    await menu.focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('[data-testid="meal-detail-menu-scroll"]').scrollTop > 0);
    await menu.evaluate(node => node.scrollTop = node.scrollHeight);
    const after = await dinner.boundingBox();
    assert.ok(Math.abs(after.y - before.y) < 1, 'Tonight stays at the same position');
    assert.equal(await page.getByTestId('meal-detail-dinner-scroll').evaluate(node => node.scrollTop), 0);
    const last = await rows.last().boundingBox(), frame = await menu.boundingBox();
    assert.ok(last.y >= frame.y && last.y + last.height <= frame.y + frame.height + 1, 'The final dinner remains reachable');
    if (process.env.TV_MEAL_SCREENSHOTS) await page.screenshot({path: `../artifacts/meal-pinned-${width}-${reading ? 'reading' : 'system'}.png`});
    assert.deepEqual(errors, []);
  });
}

test('long tonight details remain reachable without moving the following dinners', async t => {
  const {page, errors} = await open(t, 'meal&longMealNote', 960, true, true);
  const dinner = page.getByTestId('meal-detail-dinner-scroll');
  const menu = page.getByTestId('meal-detail-menu-scroll');
  const before = await menu.boundingBox();
  assert.ok(await dinner.evaluate(node => node.scrollHeight > node.clientHeight));
  await dinner.focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('[data-testid="meal-detail-dinner-scroll"]').scrollTop > 0);
  await dinner.evaluate(node => node.scrollTop = node.scrollHeight);
  const note = await page.getByText(/Ready to serve/).boundingBox(), frame = await dinner.boundingBox();
  assert.ok(note.y + note.height <= frame.y + frame.height + 1, 'The end of tonight’s note remains reachable');
  assert.equal(await menu.evaluate(node => node.scrollTop), 0);
  assert.deepEqual(await menu.boundingBox(), before);
  assert.deepEqual(errors, []);
});

test('narrow meal layout keeps a single scroll area with every dinner reachable', async t => {
  const {page, errors} = await open(t, 'meal', 600, false, true);
  await page.setViewportSize({width: 600, height: 540});
  const scroll = page.getByTestId('meal-detail-scroll');
  await scroll.waitFor();
  assert.equal(await page.getByTestId('meal-detail-menu-scroll').count(), 0);
  assert.equal(await page.getByTestId('meal-detail-following-dinner').count(), 13);
  await scroll.evaluate(node => node.scrollTop = node.scrollHeight);
  const last = await page.getByTestId('meal-detail-following-dinner').last().boundingBox(), frame = await scroll.boundingBox();
  assert.ok(last.y + last.height <= frame.y + frame.height + 1);
  assert.deepEqual(errors, []);
});

for (const width of [960, 1920]) test(`activity shows uncapped progress and aligns the weekly goal at ${width}`, async t => {
  const {page, errors} = await open(t, 'activity&activitySteps=14083', width);
  await page.getByText('4,083 steps over goal · 41% extra', {exact: true}).waitFor();
  assert.equal(await page.getByText('141%', {exact: true}).count(), 2);
  const ring = page.getByTestId('activity-ring-overflow');
  const dash = Number(await ring.getAttribute('stroke-dashoffset'));
  const circumference = Number((await ring.getAttribute('stroke-dasharray')).split(/[ ,]+/)[0]);
  assert.ok(Math.abs(1 - dash / circumference - .4083) < 1e-6);
  assert.equal(await page.getByTestId('activity-day-overflow').count(), 6);
  const plot = await page.getByTestId('activity-chart-plot').boundingBox();
  const line = await page.getByTestId('activity-goal-line').boundingBox();
  assert.ok(Math.abs(line.y + line.height - (plot.y + plot.height * (1 - 10000 / 14305))) < 1);
  for (const box of await page.getByTestId('activity-day-overflow').evaluateAll(nodes => nodes.map(n => {
    const r = n.getBoundingClientRect(); return {bottom: r.bottom, top: r.top};
  }))) {
    assert.ok(Math.abs(box.bottom - (line.y + line.height)) < 1);
    assert.ok(box.top >= plot.y - 1);
  }
  await page.screenshot({path: `../artifacts/activity-goal-${width}.png`});
  for (const [steps, percent] of [[0, '0%'], [10000, '100%'], [20000, '200%'], [25000, '250%']]) {
    await page.goto(`http://127.0.0.1:5177/details.html?topic=activity&activitySteps=${steps}`);
    await page.getByText(percent, {exact: true}).first().waitFor();
    assert.equal(await page.getByTestId('activity-ring-overflow').count(), steps > 10000 ? 1 : 0);
  }
  await page.goto('http://127.0.0.1:5177/details.html?topic=activity&activitySteps=14083&activityGoal=20000&reading');
  await page.getByText('70%', {exact: true}).first().waitFor();
  assert.equal(await page.getByTestId('activity-day-overflow').count(), 0);
  assert.deepEqual(errors, []);
});

test('long lists retain every item and task completion remains reachable by keyboard', async (t) => {
  const {page, errors} = await open(t, 'todo', 960, true, true);
  const tasks = page.getByRole('checkbox');
  assert.equal(await tasks.count(), 30);
  await tasks.last().focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.lastCompletedTask === '29');
  assert.deepEqual(errors, []);
});

for (const width of [960, 1920]) for (const reading of [false, true]) {
  test(`schedule agenda keeps chronological flow, private labels and full scrolling at ${width}, reading ${reading}`, async t => {
    const {page, errors} = await open(t, 'schedule', width, reading, true);
    await page.evaluate(() => {
      const now = Date.now();
      const event = (id, patch = {}) => ({id,title:id,time:'10:30 AM',endTime:'11:30 AM',category:'owner@example.com',color:'#d50000', ...patch});
      window.updateScheduleFixture({schedule: [
        event('Later appointment', {startMs:now+3600000,endMs:now+7200000}),
        event('Earlier appointment', {startMs:now-7200000,endMs:now-3600000}),
        event('All-day reminder', {allDay:true,time:'All Day',endTime:'All Day'}),
        event('Current appointment', {startMs:now-1000,endMs:now+3600000}),
        ...Array.from({length:16},(_,i) => event(`Planning appointment ${i} with a long title that should wrap without hiding any of the important event information`, {category:'Family and household planning'})),
      ],upcomingEvents:[event('Undated appointment'), event('Invalid date appointment', {date:'2026-02-31'}), event('Tomorrow appointment', {date:'2026-10-13'})]});
    });
    const rows = page.getByTestId('schedule-detail-event');
    await page.getByRole('button', {name:'Today, 20 events', exact:true}).waitFor();
    assert.deepEqual((await page.getByTestId('schedule-detail-title').allTextContents()).slice(0,4),
      ['All-day reminder','Earlier appointment','Current appointment','Later appointment']);
    assert.equal(await rows.count(),20);
    assert.doesNotMatch(await page.getByTestId('detail-content').textContent(), /@|OWNER|10:30 AM –/);
    for(const label of await rows.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))) assert.doesNotMatch(label,/@/);
    await page.getByText('Happening now',{exact:true}).waitFor();
    await page.getByText('Ended',{exact:true}).waitFor();
    const overflow = await rows.evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+2).length);
    assert.equal(overflow,0);
    const scroll = page.getByTestId('schedule-detail-scroll');
    await scroll.focus(); await page.keyboard.press('End');
    await page.waitForFunction(()=>document.querySelector('[data-testid="schedule-detail-scroll"]').scrollTop>0);
    await scroll.evaluate(node=>node.scrollTop=node.scrollHeight);
    const last = await rows.last().boundingBox(), frame = await scroll.boundingBox();
    assert.ok(last.y+last.height<=frame.y+frame.height+1,'The last appointment can be reached');
    const upcoming = page.getByRole('button',{name:'Upcoming, 3 events',exact:true});
    await upcoming.focus(); await page.keyboard.press('Enter');
    await page.getByText('Date unavailable',{exact:true}).waitFor();
    assert.equal(await rows.count(),3);
    assert.deepEqual(await page.getByTestId('schedule-detail-title').allTextContents(), ['Tomorrow appointment','Undated appointment','Invalid date appointment']);
    assert.equal(await scroll.evaluate(node=>node.scrollTop),0,'Changing views starts at the first day');
    await page.screenshot({path:`../artifacts/schedule-review/upcoming-${width}-${reading?'reading':'system'}.png`});
    await page.evaluate(()=>window.updateScheduleFixture({schedule:[],upcomingEvents:[]}));
    await page.getByText('No upcoming events to show',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
  });
}
for (const width of [960, 1920]) for (const reading of [false, true]) {
  test(`settings sidebar and paged language/voice choices fit ${width}, ${reading ? 'OpenDyslexic' : 'system'}`, async (t) => {
    const {page, errors} = await open(t, 'settings', width, reading);
    const menu = page.getByRole('tablist', {name: 'Settings sections'});
    const menuBox = await menu.boundingBox();
    const contentBox = await page.getByTestId('detail-content').boundingBox();
    assert.ok(menuBox.width < contentBox.width / 3);
    await page.getByRole('tab', {name: 'Accessibility settings', exact: true}).click();
    const choose = page.getByRole('button', {name: 'Choose a voice', exact: true});
    const box = await choose.boundingBox(); assert.ok(box.y + box.height <= contentBox.y + contentBox.height, 'Voice settings visible without scrolling');
    await choose.click();
    await page.getByRole('button', {name: 'English, 16 voices', exact: true}).click();
    assert.equal(await page.getByTestId('voice-picker').getByRole('button', {name: /^Voice \d/}).count(), 6);
    assert.equal(await page.getByTestId('voice-picker').getByRole('button', {name: /^Spanish/}).count(), 0);
    await page.getByRole('button', {name: 'Next voice page', exact: true}).click();
    const voice = page.getByTestId('voice-picker').getByRole('button', {name: /^Voice \d/}).first();
    await voice.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('@tv_narration_v1')).voice !== null);
    const picker = await page.getByTestId('voice-picker').boundingBox();
    assert.ok(picker.y + picker.height <= contentBox.y + contentBox.height, 'Six choices and paging fit inside the modal');
    await page.screenshot({path: `../artifacts/tv-settings-voices-${width}-${reading ? 'dyslexic' : 'system'}.png`});
    await page.getByRole('button', {name: 'Back from Settings', exact: true}).click();
    await page.getByText('Choose a language', {exact: true}).waitFor();
    await page.getByRole('button', {name: 'English, 16 voices', exact: true}).click();
    await page.keyboard.press('Escape'); await page.getByText('Choose a language', {exact: true}).waitFor();
    await page.keyboard.press('Escape'); await page.getByText('Spoken navigation', {exact: true}).waitFor();
    await page.screenshot({path: `../artifacts/tv-settings-sidebar-${width}-${reading ? 'dyslexic' : 'system'}.png`});
    assert.deepEqual(errors, []);
  });
  for (const topic of ['weather', 'activity', 'meal', 'schedule', 'todo', 'media', 'poll']) {
    test(`${topic} uses a compact header and stays within ${width}, ${reading ? 'OpenDyslexic' : 'system'}`, async (t) => {
      const {page, errors} = await open(t, topic, width, reading);
      const header = await page.getByTestId('detail-header').boundingBox();
      const content = await page.getByTestId('detail-content').boundingBox();
      assert.ok(header.height < 80, 'Header should leave room for detail content');
      assert.ok(content.height > (width === 960 ? 400 : 880));
      const horizontalOverflow = await page.getByTestId('detail-content').evaluate((root) => [...root.querySelectorAll('div')].filter((node) => {
        const style = getComputedStyle(node);
        return style.overflowX !== 'scroll' && style.overflowX !== 'auto' && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 3 && style.overflow !== 'hidden';
      }).map((node) => node.textContent.slice(0, 100)));
      assert.deepEqual(horizontalOverflow, [], 'Text and panels must not spill horizontally');
      if (width === 960 && topic === 'weather') {
        const lastDay = await page.getByTestId('weather-detail-day').last().boundingBox();
        assert.ok(lastDay.y + lastDay.height <= content.y + content.height, 'All five forecast days fit on the first screen');
        const pressure = await page.getByText('1012 hPa', {exact: true}).boundingBox();
        assert.ok(pressure.y + pressure.height <= content.y + content.height, 'Weather metrics fit alongside the forecast');
        const hero = await page.getByTestId('weather-overview-hero').boundingBox();
        const temperature = await page.getByTestId('weather-overview-temperature').boundingBox();
        const metrics = await page.getByTestId('weather-overview-metrics').boundingBox();
        assert.ok(hero.height >= temperature.height && hero.height > 0, 'Current weather occupies its full height');
        assert.ok(hero.y + hero.height <= metrics.y, 'Current weather must not overlap its metrics');
      }
      if (width === 960 && topic === 'activity') {
        const calories = await page.getByText('1720 kcal', {exact: true}).boundingBox();
        assert.ok(calories.y + calories.height <= content.y + content.height, 'All activity metrics fit on the first screen');
      }
      await page.screenshot({path: `../artifacts/tv-detail-${topic}-${width}-${reading ? 'dyslexic' : 'system'}.png`});
      await page.keyboard.press('Escape'); await page.getByTestId('detail-content').waitFor({state:'hidden'});
      assert.deepEqual(errors, []);
    });
  }
}
