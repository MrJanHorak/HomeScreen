const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {randomBytes} = require('node:crypto');
const enabled=!!process.env.FIRESTORE_EMULATOR_HOST;
const integration=(name,fn)=>test(name,{skip:!enabled},fn);
let db,auth,handlers;
if(enabled){
  process.env.TOKEN_ENCRYPTION_KEY='poll-emulator-test-only-key';
  process.env.PAIRING_URL='https://demo-polls.firebaseapp.com/pair';
  ({db,auth}=require('../lib/utils/db')); handlers=require('../lib/polls');
}
const definition={question:'Movie night?',description:'',answerMode:'mixed',options:[{id:'a',label:'Comedy'},{id:'b',label:'Drama'}],resultsVisibility:'after-vote',protection:'browser',moderate:true,defaultDurationMinutes:60};
async function fixture(t,overrides={}){
  const uid=`poll-test-${randomBytes(8).toString('hex')}`;const deviceId='d'.repeat(32);
  t.mock.method(auth,'verifyIdToken',async(token)=>({uid:token==='other'?'another-owner':uid,firebase:{sign_in_provider:token==='tv'?'custom':'google.com'},...(token==='tv'?{dashboardDeviceId:deviceId}:{})}));
  const user=db.collection('users').doc(uid);
  await user.set({});await user.collection('devices').doc(deviceId).set({name:'Test TV',revokedAtMs:0,timeZone:'America/New_York',lastSeenAtMs:Date.now()});
  t.after(async()=>{await db.recursiveDelete(user);const links=await db.collection('poll_links').where('userId','==',uid).get();await Promise.all(links.docs.map(d=>d.ref.delete()));});
  async function invoke(handler,method,body={},headers={},query={}){
    const res={statusCode:0,body:null,headers:{},set(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;},send(){}};
    const h={authorization:'Bearer owner',...headers};await handler({method,body,headers:h,query,ip:'127.0.0.1',get(name){return h[name.toLowerCase()];}},res);return res;
  }
  const owner=(body,token='owner')=>invoke(handlers.handlePolls,'POST',body,{authorization:`Bearer ${token}`});
  const saved=await owner({action:'saveTemplate',definition:{...definition,...overrides}});assert.equal(saved.statusCode,200,JSON.stringify(saved.body));
  const started=await owner({action:'startRound',templateId:saved.body.template.id,referenceDeviceId:deviceId});assert.equal(started.statusCode,200,JSON.stringify(started.body));
  const round=started.body.round;const token=round.joinUrl.split('/').pop();
  async function guest(){const r=await invoke(handlers.handlePollParticipant,'GET',{}, {},{token});assert.equal(r.statusCode,200,JSON.stringify(r.body));return {cookie:r.headers['Set-Cookie'].split(';')[0],csrf:r.body.csrf,data:r.body};}
  const vote=(g,body={})=>invoke(handlers.handlePollParticipant,'POST',{token,name:'Alex',optionId:'a',requestId:randomBytes(16).toString('hex'),...body}, {cookie:g.cookie,origin:'https://demo-polls.firebaseapp.com','x-poll-csrf':g.csrf});
  return {uid,user,round,token,owner,invoke,guest,vote,ref:user.collection('pollRounds').doc(round.id),template:saved.body.template};
}
integration('real transaction concurrency accepts one browser ballot and one count',async(t)=>{
  const f=await fixture(t);const g=await f.guest();const results=await Promise.all(Array.from({length:8},()=>f.vote(g)));
  assert.ok(results.every(r=>r.statusCode===200),JSON.stringify(results));
  const round=(await f.ref.get()).data();assert.equal(round.total,1);assert.equal(round.counts.a,1);assert.equal((await f.ref.collection('ballots').get()).size,1);
  assert.equal(new Set(results.map(r=>r.body.receipt.requestId)).size,1);
});
integration('hidden results, private names, and same-origin/CSRF checks apply to public requests',async(t)=>{
  const f=await fixture(t);const g=await f.guest();assert.equal(g.data.poll.results,null);assert.equal(g.data.poll.joinUrl,undefined);
  const bad=await f.invoke(handlers.handlePollParticipant,'POST',{token:f.token,name:'A',optionId:'a',requestId:'a'.repeat(32)},{cookie:g.cookie,origin:'https://evil.test','x-poll-csrf':g.csrf});assert.equal(bad.statusCode,403);
  assert.equal((await f.vote(g)).statusCode,200);
  const read=await f.invoke(handlers.handlePollParticipant,'GET',{}, {cookie:g.cookie},{token:f.token});
  assert.equal(read.body.poll.total,1);assert.equal(read.body.receipt.name,undefined);assert.ok(!JSON.stringify(read.body).includes('Alex'));
  const noCookie=await f.invoke(handlers.handlePollParticipant,'POST',{token:f.token});assert.equal(noCookie.statusCode,403);
});
integration('one invitation cannot be used by two devices racing to vote',async(t)=>{
  const f=await fixture(t,{protection:'invitation'});const codes=await f.owner({action:'invitations',roundId:f.round.id,expectedRevision:1,count:1});assert.equal(codes.statusCode,200);
  const a=await f.guest(),b=await f.guest();const votes=await Promise.all([f.vote(a,{invitation:codes.body.codes[0]}),f.vote(b,{invitation:codes.body.codes[0]})]);
  assert.deepEqual(votes.map(v=>v.statusCode).sort(),[200,409]);assert.equal((await f.ref.get()).data().total,1);
});
integration('reference-TV revocation and account tombstones prohibit guest writes',async(t)=>{
  const f=await fixture(t);const g=await f.guest();await f.user.collection('devices').doc('d'.repeat(32)).update({revokedAtMs:Date.now()});
  assert.equal((await f.vote(g)).statusCode,410);assert.equal((await f.ref.get()).data().total,0);
  await f.user.collection('devices').doc('d'.repeat(32)).update({revokedAtMs:0});
  await db.collection('account_security').doc(f.uid).set({deleted:true});t.after(()=>db.collection('account_security').doc(f.uid).delete());
  assert.notEqual((await f.vote(g)).statusCode,200);assert.equal((await f.ref.get()).data().total,0);
});
integration('deadline validation, link rotation, and idempotent receipts remain consistent',async(t)=>{
  const f=await fixture(t);const g=await f.guest();await f.ref.update({endsAtMs:Date.now()-1});assert.equal((await f.vote(g)).statusCode,410);
  await f.ref.update({endsAtMs:null});assert.equal((await f.vote(g)).statusCode,200);assert.equal((await f.vote(g)).statusCode,200);
  const rotate=await f.owner({action:'rotateLink',roundId:f.round.id,expectedRevision:2});assert.equal(rotate.statusCode,200);
  assert.equal((await f.vote(g)).statusCode,410);assert.equal((await f.ref.get()).data().total,1);
});
integration('write-ins group without publishing private names or unreviewed text',async(t)=>{
  const f=await fixture(t);const a=await f.guest(),b=await f.guest();assert.equal((await f.vote(a,{optionId:null,answer:'Pizza'})).statusCode,200);assert.equal((await f.vote(b,{optionId:null,answer:' pizza '})).statusCode,200);
  const round=(await f.ref.get()).data();assert.equal(round.total,2);assert.equal(round.pendingCount,2);const answers=await f.ref.collection('answers').get();assert.equal(answers.size,1);
  const read=await f.invoke(handlers.handlePollParticipant,'GET',{}, {cookie:a.cookie},{token:f.token});assert.ok(!JSON.stringify(read.body.poll).includes('Pizza'));
  const approved=await f.owner({action:'moderate',roundId:f.round.id,expectedRevision:3,answerId:answers.docs[0].id,status:'approved'});assert.equal(approved.statusCode,200);
  const next=await f.invoke(handlers.handlePollParticipant,'GET',{}, {cookie:a.cookie},{token:f.token});assert.equal(next.body.poll.pendingCount,0);assert.equal(next.body.poll.results.find(r=>r.label==='Pizza').count,2);
});
integration('owners cannot manage another account and TVs cannot manage their owner library',async(t)=>{
  const f=await fixture(t);assert.equal((await f.owner({action:'close',roundId:f.round.id,expectedRevision:1},'tv')).statusCode,403);
  assert.equal((await f.owner({action:'close',roundId:f.round.id,expectedRevision:1},'other')).statusCode,404);
  const updated=await f.owner({action:'saveTemplate',id:f.template.id,expectedRevision:1,definition:{...definition,question:'Changed template'}});assert.equal(updated.statusCode,200);
  assert.equal((await f.ref.get()).data().question,'Movie night?');
});
