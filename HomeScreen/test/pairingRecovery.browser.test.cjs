const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {chromium} = require('playwright');
let browser;
before(async () => {browser = await chromium.launch({headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});});
after(async () => browser?.close());
const modules = Object.fromEntries([
  ['react', 'react/cjs/react.production.js'], ['react/jsx-runtime', 'react/cjs/react-jsx-runtime.production.js'],
  ['react-dom', 'react-dom/cjs/react-dom.production.js'], ['react-dom/client', 'react-dom/cjs/react-dom-client.production.js'],
  ['scheduler', 'scheduler/cjs/scheduler.production.js'],
].map(([name, file]) => {
  const root = file.split('/')[0];
  return [name, fs.readFileSync(path.join(path.dirname(require.resolve(root)), ...file.split('/').slice(1)), 'utf8')];
}));
for (const [name, file] of Object.entries({AuthContext:'context/AuthContext.tsx', PairingScreen:'screens/PairingScreen.tsx'})) {
  modules[name] = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src',file),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
}

async function fixture(t) {
  const page=await browser.newPage(); t.after(()=>page.close());
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(({modules})=>{
    const loaded={}, aliases={'../services/firebase':'firebase', '../services/api':'api',
      '../services/localUserData':'localData', '../services/startupTiming':'startup',
      '../context/AuthContext':'AuthContext','../theme/ThemeContext':'theme',
      '../components/shared/ReadingText':'text','../components/shared/NarratedPressable':'pressable'};
    function load(name) {
      name=aliases[name]||name;if(loaded[name])return loaded[name].exports;
      if(!modules[name])throw Error(`Unexpected import: ${name}`);
      const module=loaded[name]={exports:{}};new Function('module','exports','require',modules[name])(module,module.exports,load);return module.exports;
    }
    const React=load('react');
    const originalSet=window.setTimeout.bind(window), originalClear=window.clearTimeout.bind(window);
    let next=1000000;const scheduled=new Map();
    window.setTimeout=(fn,ms,...args)=>{if([15000,30000,60000,120000,240000,300000].includes(ms)){
      const id=next++;scheduled.set(id,{ms,fn:()=>fn(...args)});return id;}return originalSet(fn,ms,...args);};
    window.clearTimeout=id=>{if(scheduled.delete(id))return;originalClear(id);};
    window.retryTimers=()=>[...scheduled.values()].filter(item=>item.ms>=30000).length;
    window.retryDelay=()=>[...scheduled.values()].find(item=>item.ms>=30000)?.ms;
    window.runRetry=()=>{const item=[...scheduled.entries()].find(([,value])=>value.ms>=30000);if(item){scheduled.delete(item[0]);item[1].fn();}};
    window.runDeadline=()=>{const item=[...scheduled.entries()].find(([,value])=>value.ms===15000);if(item){scheduled.delete(item[0]);item[1].fn();}};
    const originalInterval=window.setInterval.bind(window), originalClearInterval=window.clearInterval.bind(window);
    const polls=new Set();
    window.setInterval=(fn,ms,...args)=>{const id=originalInterval(fn,ms,...args);if(ms===3000)polls.add(id);return id;};
    window.clearInterval=id=>{polls.delete(id);originalClearInterval(id);};window.pollTimers=()=>polls.size;
    window.online=false;window.calls=0;window.hold=false;window.pendingResolve=null;window.signals=[];
    const pair={code:'TEST42',pollSecret:'secret',verificationUrl:'https://example.test/pair'};
    const appListeners=new Set();
    const appState={currentState:'active',addEventListener:(_name,fn)=>{appListeners.add(fn);return {remove:()=>appListeners.delete(fn)};}};
    window.setAppState=state=>{appState.currentState=state;appListeners.forEach(fn=>fn(state));};
    loaded['react-native']={exports:{AppState:appState,Platform:{OS:'android',isTV:true},
      StyleSheet:{create:value=>value},useWindowDimensions:()=>({width:1920,height:1080}),
      View:({children})=>React.createElement('div',null,children)}};
    loaded.text={exports:{__esModule:true,default:({children})=>React.createElement('span',null,children)}};
    loaded.pressable={exports:{__esModule:true,default:({children,onPress,accessibilityLabel})=>React.createElement('button',{'aria-label':accessibilityLabel,onClick:onPress},children)}};
    loaded['react-native-qrcode-svg']={exports:{__esModule:true,default:()=>React.createElement('div',{'data-qr':'visible'})}};
    loaded['firebase/auth']={exports:{onAuthStateChanged:(_auth,fn)=>{queueMicrotask(()=>fn(null));return ()=>{};},
      signInWithCustomToken:async()=>{},signOut:async()=>{}}};
    loaded.firebase={exports:{auth:{currentUser:null}}};
    loaded.api={exports:{requestDevicePairing:signal=>{window.calls++;window.signals.push(signal);if(!window.online)return Promise.reject(new Error('RAW_NETWORK_FAILURE'));
      if(window.hold)return new Promise(resolve=>{window.pendingResolve=()=>resolve({...pair,code:'LATE01'});});return Promise.resolve(pair);},
      pollDevicePairing:async()=>({status:'pending'}),disconnectCurrentDevice:async()=>{}}};
    loaded.localData={exports:{clearLocalUserData:async()=>{}}};loaded.startup={exports:{markStartup:()=>{}}};
    loaded.theme={exports:{useTheme:()=>({colors:{textPrimary:'#fff',textSecondary:'#ddd',accent:'#aaa',focusRing:'#fff',glassSurface:'#111'}})}};
    const {AuthProvider,useAuth}=load('AuthContext'), Screen=load('PairingScreen').default;
    function Probe(){const value=useAuth();window.pairingState=value;return React.createElement(Screen);}
    const root=load('react-dom/client').createRoot(document.getElementById('root'));
    window.unmountPairing=()=>root.render(null);
    root.render(React.createElement(AuthProvider,null,React.createElement(Probe)));
  },{modules});
  try {await page.waitForFunction(()=>window.pairingState?.pairingError,null,{timeout:5000});}
  catch (error) {throw new Error(`Pairing fixture failed: ${errors.join('; ') || error.message}`);}
  return {page,errors};
}

test('offline first pairing retries after reconnect and pauses retries in background',async(t)=>{
  const {page,errors}=await fixture(t);
  assert.equal(await page.evaluate(()=>window.calls),1);
  assert.equal(await page.evaluate(()=>window.retryTimers()),1);
  assert.equal(await page.evaluate(()=>window.retryDelay()),30000);
  assert.equal(await page.getByRole('button',{name:'Retry pairing'}).count(),1);
  assert.doesNotMatch(await page.locator('body').innerText(),/RAW_NETWORK_FAILURE|Getting a pairing code/);
  await page.evaluate(()=>window.runRetry());
  await page.waitForFunction(()=>window.calls===2 && window.retryDelay()===60000);
  await page.evaluate(()=>window.setAppState('background'));
  await page.waitForFunction(()=>window.retryTimers()===0);
  await page.evaluate(()=>{window.online=true;window.setAppState('active');});
  await page.waitForFunction(()=>window.retryTimers()===1);
  await page.evaluate(()=>window.runRetry());
  await page.waitForFunction(()=>window.pairingState?.pairing?.code==='TEST42');
  assert.equal(await page.evaluate(()=>window.calls),3);
  assert.equal(await page.evaluate(()=>window.retryTimers()),0);
  assert.equal(await page.evaluate(()=>window.pollTimers()),1);
  assert.deepEqual(errors,[]);
});

test('repeated failures back off to a five-minute limit',async(t)=>{
  const {page,errors}=await fixture(t);
  for (const [calls,delay] of [[2,60000],[3,120000],[4,240000],[5,300000],[6,300000]]) {
    await page.evaluate(()=>window.runRetry());
    await page.waitForFunction(({calls,delay})=>window.calls===calls && window.retryDelay()===delay,{calls,delay});
  }
  assert.deepEqual(errors,[]);
});

test('manual retries do not overlap and timed-out responses cannot start polling',async(t)=>{
  const {page,errors}=await fixture(t);
  await page.evaluate(()=>{window.online=true;window.hold=true;});
  await page.getByRole('button',{name:'Retry pairing'}).click();
  await page.waitForFunction(()=>typeof window.pendingResolve==='function');
  await page.evaluate(()=>{void window.pairingState.startPairing();void window.pairingState.startPairing();});
  assert.equal(await page.evaluate(()=>window.calls),2);
  await page.evaluate(()=>window.runDeadline());
  await page.waitForFunction(()=>window.pairingState?.pairingError && window.retryTimers()===1);
  assert.equal(await page.evaluate(()=>window.signals[1].aborted),true);
  await page.evaluate(()=>{window.hold=false;window.runRetry();});
  await page.waitForFunction(()=>window.pairingState?.pairing?.code==='TEST42');
  await page.evaluate(()=>window.pendingResolve()); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.pairingState.pairing.code),'TEST42');
  assert.equal(await page.evaluate(()=>window.pollTimers()),1);
  assert.deepEqual(errors,[]);
});

test('unmount aborts a pending request without starting a polling timer',async(t)=>{
  const {page,errors}=await fixture(t);
  await page.evaluate(()=>{window.online=true;window.hold=true;});
  await page.getByRole('button',{name:'Retry pairing'}).click();
  await page.waitForFunction(()=>typeof window.pendingResolve==='function');
  await page.evaluate(()=>window.unmountPairing());
  await page.waitForFunction(()=>document.getElementById('root').childNodes.length===0);
  assert.equal(await page.evaluate(()=>window.signals[1].aborted),true);
  await page.evaluate(()=>window.pendingResolve()); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.retryTimers()),0);
  assert.equal(await page.evaluate(()=>window.pollTimers()),0);
  assert.deepEqual(errors,[]);
});
