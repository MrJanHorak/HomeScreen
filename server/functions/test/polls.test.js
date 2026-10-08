const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parsePollDefinition, parseBallot, pollState, pollLocalDeadline, resultsAllowed, cleanPollText} = require('../lib/utils/polls');
const {validWidgetLayout, validWidgetGrid, widgetGridFromRows, legacyWidgetProjection, widgetRowWidths} = require('../lib/utils/widgets');
const definition = {question:'Movie night?', description:'', answerMode:'choices', options:[{id:'a',label:'Comedy'},{id:'b',label:'Drama'}], resultsVisibility:'after-vote', protection:'browser', moderate:true, defaultDurationMinutes:60};
const poll = (n) => ({id:`poll_${String(n).padStart(32,'0')}`,kind:'poll',roundId:'a'.repeat(32),visible:true,size:'standard'});

test('all deployed poll endpoints receive the secret required for voting links and cookies', () => {
  const triggers = require('../lib/polls');
  for (const name of ['pollsHandler', 'pollFeedHandler', 'pollParticipantHandler']) {
    assert.ok(triggers[name].__endpoint.secretEnvironmentVariables.some((secret) => secret.key === 'TOKEN_ENCRYPTION_KEY'), name);
  }
});
test('poll definitions reject duplicates, invalid modes, oversized text and ambiguous ballots', () => {
  assert.deepEqual(parsePollDefinition(definition),definition);
  assert.equal(parsePollDefinition({...definition, options:[{id:'a',label:'Comedy'},{id:'b',label:'comedy'}]}),null);
  assert.equal(parsePollDefinition({...definition, options:[{id:'a',label:'Comedy'},{id:'a',label:'Drama'}]}),null);
  assert.equal(parsePollDefinition({...definition, question:'x'.repeat(161)}),null);
  assert.equal(cleanPollText('A\u0000B',60),null);
  const ballot = {name:'  Alex  ',requestId:'a'.repeat(32),optionId:'a'};
  assert.equal(parseBallot(ballot,definition).name,'Alex');
  assert.equal(parseBallot({...ballot,answer:'Another choice'},definition),null);
  assert.equal(parseBallot({...ballot,optionId:'missing'},definition),null);
  assert.equal(parseBallot({...ballot,optionId:null,answer:'Something else'},{...definition,answerMode:'mixed'}).answer,'Something else');
  assert.equal(parsePollDefinition({...definition,answerMode:'written',options:[]}).options.length,0);
});
test('server deadlines are exclusive, survive TV shutdown, and reject DST ambiguity/gaps', () => {
  assert.equal(pollState({state:'open',endsAtMs:100},99),'open');
  assert.equal(pollState({state:'open',endsAtMs:100},100),'closed');
  assert.equal(pollState({state:'archived',endsAtMs:null},100),'archived');
  assert.equal(pollLocalDeadline('2026-10-07T18:30','America/New_York'),Date.parse('2026-10-07T22:30:00Z'));
  assert.throws(() => pollLocalDeadline('2026-03-08T02:30','America/New_York'),/daylight saving/);
  assert.throws(() => pollLocalDeadline('2026-11-01T01:30','America/New_York'),/daylight saving/);
  assert.throws(() => pollLocalDeadline('2026-02-30T12:00','UTC'));
});
test('hidden results are enforced for guest and TV payload policies', () => {
  assert.equal(resultsAllowed({...definition,state:'open'},false,false),false);
  assert.equal(resultsAllowed({...definition,state:'open'},true,false),true);
  assert.equal(resultsAllowed({...definition,state:'open'},false,true),true);
  assert.equal(resultsAllowed({...definition,state:'open',resultsVisibility:'closed'},false,true),false);
  assert.equal(resultsAllowed({...definition,state:'closed',resultsVisibility:'closed'},false,false),true);
});
test('multiple polls retain unique geometry and reject unknown instances and overlaps', () => {
  const widgets=Array.from({length:12},(_,i)=>poll(i)); const grid=widgetGridFromRows(widgets);
  assert.equal(validWidgetLayout({version:1,widgets,grid}),true);
  assert.equal(validWidgetLayout({version:1,widgets,grid:null}),false);
  assert.equal(validWidgetGrid({...grid,items:grid.items.map((i)=>({...i,x:0,y:0}))},widgets),false);
  assert.equal(validWidgetLayout({version:1,widgets:[poll(0),poll(0)],grid:null}),false);
  assert.equal(validWidgetLayout({version:1,widgets:[{...poll(0),kind:'unknown'}],grid:null}),false);
  for(let n=1;n<=8;n++) {
    const subset=widgets.slice(0,n); assert.equal(validWidgetGrid(widgetGridFromRows(subset),subset),true);
  }
  assert.deepEqual(widgetRowWidths([poll(0),{...poll(1),size:'wide'}]),[4,8]);
  assert.deepEqual(widgetRowWidths([poll(0),{...poll(1),size:'wide'},poll(2),poll(3)]),[3,3,3,3]);
});
test('legacy projection never exposes poll IDs to old TVs and retains a usable poll-only fallback', () => {
  const layout={version:1,widgets:[poll(0),poll(1)],grid:widgetGridFromRows([poll(0),poll(1)])};
  const legacy=legacyWidgetProjection(layout);
  assert.equal(legacy.cards.length,6); assert.equal(legacy.cards.some(c=>c.visible),true);
  assert.equal(legacy.grid,null); assert.equal(legacy.cards.some(c=>c.id.startsWith('poll')),false);
});
