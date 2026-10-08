const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');
let browser;before(async()=>{browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});});after(async()=>browser?.close());
const definition={question:'Movie night?',description:'Choose together',answerMode:'mixed',options:[{id:'a',label:'Comedy'},{id:'b',label:'Drama'}],resultsVisibility:'after-vote',protection:'browser',moderate:true,defaultDurationMinutes:60};
const round={...definition,id:'a'.repeat(32),revision:1,total:0,writtenCount:0,pendingCount:0,results:null,state:'open',endsAtMs:Date.now()+600000,timeZone:'America/New_York'};
async function capture(page,name){if(process.env.COMPANION_SCREENSHOTS){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${process.env.COMPANION_SCREENSHOTS}/${name}.png`,fullPage:true});}}
test('phone guest sees only poll, records one ballot, survives refresh, and renders unsafe text literally',async(t)=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});t.after(()=>page.close());let receipt=null;let posts=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/pollParticipant/**',async route=>{if(route.request().method()==='POST'){posts++;const b=route.request().postDataJSON();assert.equal(b.name,'Alex');assert.equal(b.answer,'<img src=x onerror=alert(1)>');assert.equal(b.optionId,null);assert.equal(route.request().headers()['x-poll-csrf'],'csrf');receipt={requestId:b.requestId,receivedAtMs:Date.now()};await route.fulfill({json:{receipt}});}
    else await route.fulfill({json:{poll:{...round,results:receipt?[{id:'a',label:'<script>bad</script>',count:1}]:null,total:receipt?1:0},receipt,csrf:'csrf',serverNowMs:Date.now()}});});
  await page.goto('http://127.0.0.1:5173/test/polls.html?guest=1');await page.getByRole('heading',{name:'Movie night?'}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);assert.equal(await page.getByRole('link').count(),0);
  await page.getByLabel('Your name').fill('Alex');await page.getByLabel('Other · write an answer').check();await page.getByLabel('Your answer').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Vote',exact:true}).click();await page.getByText('Your vote is recorded.').waitFor();assert.equal(posts,1);
  await page.reload();await page.getByText('Your vote is recorded.').waitFor();assert.equal(await page.getByRole('button',{name:'Vote',exact:true}).count(),0);assert.equal(await page.locator('.poll-results script').count(),0);assert.ok((await page.locator('.poll-results').innerText()).includes('<script>bad</script>'));
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
});
test('owner saves, edits, reuses a template and starts a round without publishing a dashboard',async(t)=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});t.after(()=>page.close());const templates=[];const rounds=[];const bodies=[];
  await page.route('**/__fixture-api/polls',async route=>{const b=route.request().postDataJSON();if(!b){await route.fulfill({json:{templates,rounds,devices:[{id:'d'.repeat(32),name:'Living room TV',timeZone:'America/New_York',pollCapable:true,lastSeenAtMs:Date.now()}]}});return;}
    bodies.push(b);if(b.action==='saveTemplate'){const template={...b.definition,id:b.id||'f'.repeat(32),revision:(b.expectedRevision||0)+1,updatedAtMs:Date.now()};const index=templates.findIndex(t=>t.id===template.id);if(index>=0)templates[index]=template;else templates.push(template);await route.fulfill({json:{template}});}
    else if(b.action==='startRound'){rounds.push({...round,results:[],templateId:b.templateId,referenceDeviceId:b.referenceDeviceId,linked:true,displayed:false});await route.fulfill({json:{round:rounds[0]}});}else await route.fulfill({json:{success:true}});});
  await page.goto('http://127.0.0.1:5173/test/polls.html');await page.getByRole('button',{name:'New poll',exact:true}).click();await page.getByLabel('Question', {exact:true}).fill('What is for dinner?');await page.getByLabel('Choice 1', {exact:true}).fill('Pizza');await page.getByLabel('Choice 2', {exact:true}).fill('Pasta');await page.getByRole('button',{name:'Save poll',exact:true}).click();await page.getByText('Poll saved. Choose when voting closes, then start.').waitFor();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('tab',{name:'Saved polls'}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Question', {exact:true}).fill('Dinner tomorrow?');await page.getByRole('button',{name:'Save poll',exact:true}).click();await page.getByText('Poll saved. Choose when voting closes, then start.').waitFor();assert.equal(templates.length,1);assert.equal(templates[0].revision,2);
  await capture(page,'polls-start-390');
  await page.getByRole('button',{name:'Start voting',exact:true}).click();await page.getByText('Voting started. Your poll is ready to add to the dashboard.').waitFor();assert.equal(rounds.length,1);assert.equal(bodies.filter(b=>b.action==='startRound').length,1);assert.ok(bodies.every(b=>b.action!=='publish'));
  assert.equal(await page.getByRole('region',{name:'Poll ready for your TV'}).getByRole('link',{name:/Add to dashboard/}).getAttribute('href'),`/dashboard?poll=${round.id}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  if(process.env.COMPANION_SCREENSHOTS){await capture(page,'polls-voting-390');await page.setViewportSize({width:1440,height:1000});await capture(page,'polls-voting-1440');}
});
test('keyboard library navigation and duplication preserve the original saved question',async(t)=>{
  const page=await browser.newPage();t.after(()=>page.close());const original={...definition,id:'f'.repeat(32),revision:1,updatedAtMs:1};const templates=[original];let saved;
  await page.route('**/__fixture-api/polls',async route=>{
    const body=route.request().postDataJSON();if(body){saved=body;const template={...body.definition,id:'b'.repeat(32),revision:1,updatedAtMs:2};templates.push(template);return route.fulfill({json:{template}});}
    await route.fulfill({json:{templates,rounds:[],devices:[{id:'d'.repeat(32),name:'Living room TV',pollCapable:true}]}});
  });
  await page.goto('http://127.0.0.1:5173/test/polls.html');const live=page.getByRole('tab',{name:/Live polls/});await live.focus();await live.press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Saved polls'}).getAttribute('aria-selected'),'true');
  await page.getByText('More options',{exact:true}).click();await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  assert.equal(await page.getByLabel('Question',{exact:true}).inputValue(),original.question);assert.equal(await page.getByRole('tablist').count(),0);
  await page.getByLabel('Question',{exact:true}).fill('Movie night next week?');await page.getByRole('button',{name:'Save poll',exact:true}).click();await page.getByText('Poll saved. Choose when voting closes, then start.').waitFor();
  assert.equal(saved.id,undefined);assert.equal(templates.length,2);assert.equal(original.question,'Movie night?');
  assert.equal(await page.getByLabel('Saved poll',{exact:true}).inputValue(),'b'.repeat(32));
});
test('failed start retains the form and request ID; a successful start survives a failed library refresh',async(t)=>{
  const page=await browser.newPage();t.after(()=>page.close());const starts=[];let succeeded=false;
  await page.route('**/__fixture-api/polls',async route=>{
    const body=route.request().postDataJSON();
    if(body){starts.push(body);if(starts.length===1)return route.fulfill({status:500,json:{error:'Could not complete the poll request. Try again.'}});succeeded=true;return route.fulfill({json:{round}});}
    if(succeeded)return route.fulfill({status:503,json:{error:'Refresh unavailable'}});
    await route.fulfill({json:{templates:[{...definition,id:'f'.repeat(32),revision:1}],rounds:[],devices:[{id:'d'.repeat(32),name:'Living room TV',timeZone:'America/New_York'}]}});
  });
  await page.goto('http://127.0.0.1:5173/test/polls.html');await page.getByRole('button',{name:'Start a saved poll'}).click();
  await page.getByRole('button',{name:'Start voting',exact:true}).click();await page.getByText('Could not complete the poll request. Try again.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Saved poll',{exact:true}).inputValue(),'f'.repeat(32));
  await page.getByRole('button',{name:'Start voting',exact:true}).click();await page.getByRole('region',{name:'Poll ready for your TV'}).waitFor();
  assert.equal(starts.length,2);assert.equal(starts[0].requestId,starts[1].requestId);
  assert.match(await page.locator('.poll-manager>.status').innerText(),/Voting started.*Refresh polls/);
  assert.equal(await page.getByRole('button',{name:'Start voting',exact:true}).count(),0);
});
test('owner closing time detects the TV clock or labels the automatic companion fallback without a timezone field',async(t)=>{
  const context=await browser.newContext({timezoneId:'Pacific/Honolulu'});t.after(()=>context.close());
  for(const timeZone of [null,'America/New_York']){
    const page=await context.newPage();let sent;
    await page.route('**/__fixture-api/polls',async route=>{
      const body=route.request().postDataJSON();
      if(body){sent=body;await route.fulfill({json:{round}});}
      else await route.fulfill({json:{templates:[{...definition,id:'f'.repeat(32),revision:1}],rounds:[],devices:[{id:'d'.repeat(32),name:'Living room TV',timeZone,pollCapable:true}]}});
    });
    await page.goto('http://127.0.0.1:5173/test/polls.html');
    await page.getByRole('button',{name:'Start a saved poll'}).click();await page.getByLabel('Voting closes').selectOption('scheduled');
    await page.getByLabel('Closing date and time').waitFor();
    assert.equal(await page.getByLabel('TV timezone',{exact:true}).count(),0);
    assert.match(await page.locator('#poll-closing-clock').innerText(),timeZone?/Living room TV's local time \(America\/New_York\)/:/this device's local time \(Pacific\/Honolulu\)/);
    await page.getByLabel('Closing date and time').fill('2030-10-07T18:30');
    await page.getByRole('button',{name:'Start voting',exact:true}).click();
    await page.getByText('Voting started. Your poll is ready to add to the dashboard.').waitFor();
    assert.equal(sent.clientTimeZone,'Pacific/Honolulu');assert.equal(sent.endsLocal,'2030-10-07T18:30');
    assert.equal(sent.deadlineTimeZone,timeZone||'Pacific/Honolulu');
    await page.close();
  }
});
test('dashboard draft supports two independently styled poll instances and restores them from a saved design',async(t)=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});t.after(()=>page.close());
  const base={layout:'balanced',palette:'night',customAccent:'#38BDF8',background:'solid',backgroundColor:'#0F172A',cards:['weather','schedule','activity','media','meal','todo'].map(id=>({id,visible:true,size:'standard'})),grid:null,cardStyles:{}};
  const state={appearance:base,updatedAtMs:1,library:{updatedAtMs:0,designs:[],draft:null},history:[]};let sent=null;
  await page.route('**/__fixture-api/**',async route=>{const url=route.request().url(),b=route.request().postDataJSON();let response;
    if(url.endsWith('/polls'))response={templates:[],rounds:[{...round,id:'b'.repeat(32),question:'Another poll',results:[],linked:true,displayed:false},{...round,results:[],linked:true,displayed:false}],devices:[]};
    else if(url.includes('googlePhotosPicker'))response={photos:[]};
    else if(url.endsWith('appearanceStudio')){if(!b)response=state;else{state.library.updatedAtMs++;if(b.action==='draft')state.library.draft=b.draft;response={library:state.library};}}
    else {sent=b.appearance;state.appearance=sent;state.updatedAtMs++;response={updatedAtMs:state.updatedAtMs};}
    await route.fulfill({json:response});});
  await page.goto(`http://127.0.0.1:5173/test/studio.html?poll=${round.id}`);await page.waitForFunction(()=>!document.querySelector('[aria-label="Poll round to add"]')?.disabled);assert.equal(await page.getByLabel('Poll round to add').inputValue(),round.id);
  assert.equal(await page.getByRole('button',{name:'Enable poll widgets'}).count(),0);
  await page.getByRole('button',{name:'Add poll',exact:true}).click();await page.getByRole('button',{name:'Add poll',exact:true}).click();assert.equal(await page.locator('.widget-row').count(),8);
  const pollRows=page.locator('.widget-row').filter({hasText:'Movie night?'});await pollRows.first().getByRole('button',{name:'Edit widget'}).click();await pollRows.first().getByLabel('Surface preset').selectOption('custom');await pollRows.first().getByLabel('Background color').fill('#abcdef');
  await page.getByRole('button',{name:/Save to TV/}).click();await page.getByText('Saved to TV. Your draft is clear.').waitFor();const polls=sent.widgetLayout.widgets.filter(w=>w.kind==='poll');assert.equal(polls.length,2);assert.notEqual(polls[0].id,polls[1].id);assert.equal(polls[0].style.backgroundColor,'#abcdef');assert.equal(polls[1].style,undefined);
  await page.reload();await page.locator('.widget-row').first().waitFor();assert.equal(await page.locator('.widget-row').count(),8);
});
