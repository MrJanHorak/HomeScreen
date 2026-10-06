const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  const result = {exports:{}};
  new Function('module', 'exports', 'require', code)(result, result.exports,
    id => id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : require(id));
  return result.exports;
}
const {planWeatherCard, weatherFamily} = load('src/components/dashboard/weather/weatherCardLayout.ts');
const {formatTemperature, rainProbability, weatherConditionIcon} = load('src/helpers/weatherHelpers.ts');
const {gridRect} = load('../server/functions/src/utils/dashboardLayout.ts');
const defaults = {scale:1, temperature:'84°', hasContext:true, hourlyCount:7, dailyCount:4, hasMetrics:true, hasIcon:true};

test('weather budgets fit every footprint in both profiles and cap forecast strips', () => {
  for (const [A,B,g,p,scale] of [[900,340,8,12,1],[1800,740,12,20,1.4]]) {
    for (let w=3;w<=12;w++) for(let h=2;h<=6;h++) {
      const r=gridRect({x:0,y:0,width:w,height:h},A,B,g);
      const plan=planWeatherCard({...defaults,scale,width:r.width-p*2-3,height:r.height-p*2-3});
      assert.ok(plan.used <= r.height-p*2-3+0.01, `${scale}: ${w}x${h}`);
      assert.ok(plan.hours<=4 && plan.days<=4);
      assert.ok(plan.temperatureSize>=28*scale);
      if(plan.shallow) assert.equal(plan.context,false);
    }
  }
});

test('layout transitions reflect both dimensions; forecasts survive growth', () => {
  assert.equal(weatherFamily(192,81),'essential');
  assert.equal(weatherFamily(192,139),'current');
  assert.equal(weatherFamily(192,197),'forecast');
  assert.equal(weatherFamily(192,313),'tall');
  assert.equal(weatherFamily(495,81),'wide-short');
  assert.equal(weatherFamily(495,313),'large');
  for(const width of [192,284,430,650]) {
    let hours=0,days=0;
    for(let height=81;height<=500;height++) {
      const p=planWeatherCard({...defaults,width,height});
      assert.ok(p.hours>=hours, `${width}x${height} lost nearest hours`);
      assert.ok(p.days>=days, `${width}x${height} lost days`);
      hours=p.hours;days=p.days;
    }
  }
  for(const height of [81,139,197,313,498]) {
    let hours=0,days=0;
    for(let width=192;width<=1260;width++) {
      const p=planWeatherCard({...defaults,width,height});
      assert.ok(p.hours>=hours, `${width}x${height} lost hours as width grew`);
      assert.ok(p.days>=days, `${width}x${height} lost days as width grew`);
      hours=p.hours;days=p.days;
    }
  }
});

test('partial weather uses available data without synthesizing forecasts', () => {
  const p=planWeatherCard({...defaults,width:420,height:255,hourlyCount:0});
  assert.equal(p.hours,0); assert.ok(p.days>0);
  const empty=planWeatherCard({...defaults,width:873,height:313,hourlyCount:0,dailyCount:0});
  assert.equal(empty.hours,0);assert.equal(empty.days,0);
  const shallow=planWeatherCard({...defaults,width:495,height:81,hourlyCount:0});
  assert.equal(shallow.sideBySide,false,'daily-only strip must not overflow the shallow column');
});

test('weather formatting preserves zeros and does not invent values or conditions', () => {
  assert.equal(formatTemperature(0),'0°');
  assert.equal(formatTemperature(-12.4),'-12°');
  assert.equal(formatTemperature(undefined),'--°');
  assert.equal(formatTemperature(NaN),'--°');
  assert.equal(rainProbability('0%'),0);
  assert.equal(rainProbability('66%'),66);
  for(const value of ['',undefined,'101%','-1%','rain','0']) assert.equal(rainProbability(value),null);
  assert.equal(weatherConditionIcon('cloud-moon'),'weather-night-partly-cloudy');
  assert.equal(weatherConditionIcon('cloud-rain','Thunderstorm'),'weather-lightning');
  assert.equal(weatherConditionIcon('snowflake'),'weather-snowy');
  assert.equal(weatherConditionIcon(undefined,'Unavailable'),undefined);
});
