import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AdaptiveDashboardCard from '../src/components/dashboard/AdaptiveDashboardCard';
import DashboardCard from '../src/components/dashboard/DashboardCard';
import DashboardLayout from '../src/components/dashboard/DashboardLayout';
import WeatherDetailView from '../src/components/details/weather/WeatherDetailView';
import {gridRect, DASHBOARD_CARD_IDS} from '../../server/functions/src/utils/dashboardLayout';
import {FixtureProvider} from './fixtureHooks';
import type {FixtureDashboard, FixtureWatch} from './fixtureHooks';
import PollDashboardCard from '../src/components/dashboard/polls/PollDashboardCard';
import type {PollView} from '../../server/functions/src/utils/polls';
import {DEFAULT_APPEARANCE} from '../src/theme/appearance';
const poll: PollView = {id: 'a'.repeat(32), revision: 1, question: 'What should we watch Friday?', description: '', answerMode: 'mixed',
  options: [{id:'a',label:'Comedy'},{id:'b',label:'Adventure'},{id:'c',label:'Mystery'}], resultsVisibility:'live',protection:'browser',moderate:true,defaultDurationMinutes:60,
  total:12,pendingCount:1,writtenCount:1,results:[{id:'a',label:'Comedy',count:6},{id:'b',label:'Adventure',count:3},{id:'c',label:'Mystery',count:2}],
  state:'open',endsAtMs:Date.now()+3600000,timeZone:'America/New_York',joinUrl:'https://demo-polls.firebaseapp.com/vote/'+ 'a'.repeat(48)};
const pollWidget = {id: 'poll_'+ 'a'.repeat(32), kind:'poll' as const, roundId:poll.id,visible:true,size:'standard' as const};
const secondPoll = {...poll,id:'b'.repeat(32),question:'What is for dinner?'};
declare global {
  interface Window {
    updateFixture: (patch: Partial<FixtureDashboard>) => void;
    updateWatchFixture: (patch: Partial<FixtureWatch>) => void;
    updatePollFixture: (patch: Partial<PollView>) => void;
  }
}
const date = (days: number) => {const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const data: FixtureDashboard = {
  isLoading: false, activeLocation: {id: 'home', name: 'Home', query: 'Home'},
  savedLocations: [{id: 'home', name: 'Home', query: 'Home'}, {id: 'work', name: 'Work', query: 'Work'}],
  getWeatherForLoc: (location) => ({...(data.weather || {temp: '--', condition: 'Unavailable'}), location: location.name}),
  setActiveLocation: () => undefined,
  meals: {status: 'ok', items: Array.from({length: 8}, (_, i) => ({date: date(i), title: i ? `Dinner ${i} · Roasted vegetables and chicken` : 'High-Protein Turkey & Beef Quick Chili', servings: '6', note: 'A long preparation note should never hide the following dinners', side: 'Green salad'}))},
  schedule: Array.from({length: 6}, (_, i) => ({id: String(i), title: `Household appointment ${i}`, time: '10:30 AM', endTime: '11:30 AM', category: 'Home', color: '', date: date(0)})),
  upcomingEvents: Array.from({length: 8}, (_, i) => ({id: `next${i}`, title: `Upcoming appointment ${i}`, time: '11:00 AM', endTime: '', category: 'Home', color: '', date: date(i+1)})),
  tasks: Array.from({length: 16}, (_, i) => ({id: String(i), title: `Task ${i} · Pick up household supplies`, due: date(i)})),
  weather: {temp: '72°', condition: 'Partly cloudy', conditionIcon: 'cloud-sun', high: 78, low: 61, feelsLike: 70, humidity: 54, windSpeed: 4, windDirection: 'NW', forecast: Array.from({length: 5}, (_, i) => ({day: `Day ${i}`, high: 78, low: 61, condition: 'Clear', icon: 'sun'})), hourly: ['2 PM', '5 PM', '8 PM', '11 PM', '2 AM', '5 AM', '8 AM'].map((time, i) => ({time, temp: 73-i, pop: `${i ? 66-i*9 : 10}%`, icon: i > 2 ? 'moon' : 'sun'}))},
  health: {status: 'ok', steps: 1843, stepGoal: 10000, distance: 2.3, distanceGoal: 8, calories: 1256, activeMinutes: 94, progress: 0.1843, estimatedRestingCalories: 800,
    weekly: Array.from({length: 7}, (_, i) => ({date: date(-6+i), steps: 5000+i*500, distance: 3, calories: 1400, activeMinutes: 70}))},
};
const watch: FixtureWatch = {status: 'ready', items: Array.from({length: 15}, (_, i) => ({id: i, title: i ? `Queued program ${i}` : 'Only Murders in the Building', appName: 'Hulu', packageName: 'hulu', episodeTitle: 'Rigor', season: null, episode: null, lastEngagementMs: null, positionMs: i ? null : 0, durationMs: 10000, posterUri: null}))};
function Matrix() {
  const [revision, setRevision] = useState(0);
  window.updateFixture = (patch) => {Object.assign(data, patch); setRevision((n) => n+1);};
  window.updateWatchFixture = (patch) => {Object.assign(watch, patch); setRevision((n) => n+1);};
  window.updatePollFixture = (patch) => {Object.assign(poll, patch); setRevision((n) => n+1);};
  data.setActiveLocation = (location) => {data.activeLocation = location; setRevision((n) => n+1);};
  const compact = new URLSearchParams(location.search).get('mode') !== 'full';
  const [areaWidth, areaHeight, gap, padding] = compact ? [900, 340, 8, 12] : [1800, 740, 12, 20];
  return <FixtureProvider value={{data, watch, compact, polls:{[poll.id]:poll,[secondPoll.id]:secondPoll}, appearance:DEFAULT_APPEARANCE}}><main data-revision={revision}>
    {new URLSearchParams(location.search).has('polls') && <section data-card="poll"><h2>Polls</h2><div style={{display:'flex',flexWrap:'wrap',gap:16}}>
      {Array.from({length:50},(_,i) => [3+Math.floor(i/5),2+i%5]).map(([w,h]) => {const r=gridRect({x:0,y:0,width:w,height:h},areaWidth,areaHeight,gap);
        return <article key={`${w}x${h}`} data-size={`${w}x${h}`} style={{background:'#192638',border:'1px solid #57657c',padding:12}}><p>{w} × {h}</p>
          <PollDashboardCard widget={pollWidget} width={r.width-padding*2-3} height={r.height-padding*2-3}/></article>;
      })}</div><section data-multiple-polls style={{display:'flex',flexDirection:'column',width:areaWidth,height:areaHeight}}><DashboardLayout cards={DEFAULT_APPEARANCE.cards} grid={null}
        widgetLayout={{version:1,widgets:[pollWidget,{...pollWidget,id:'poll_'+secondPoll.id,roundId:secondPoll.id,style:{backgroundColor:'#412b42',opacity:1}}],grid:null}}
        onOpen={(id)=>document.querySelector('[data-multiple-polls]')?.setAttribute('data-opened',id)}/></section></section>}
    {new URLSearchParams(location.search).has('small-visuals') && <section data-small-visuals style={{display:'flex',gap:16,alignItems:'flex-start'}}>
      {([['media',265,80],['activity',346,200]] as const).map(([id,width,height]) => <article key={id} data-visual={id}
        style={{padding:12,border:'1px solid #57657c',borderRadius:14,background:'#192638'}}>
        <AdaptiveDashboardCard id={id} width={width} height={height} />
      </article>)}
    </section>}
    {DASHBOARD_CARD_IDS.map((id) => <section key={id} data-card={id}>
      <h2>{id}</h2><div style={{display:'flex',flexWrap:'wrap',gap:16}}>
        {Array.from({length:50},(_,i) => [3+Math.floor(i/5), 2+i%5]).map(([w,h]) => {
          const rect = gridRect({id,x:0,y:0,width:w,height:h},areaWidth,areaHeight,gap);
          const width=rect.width-padding*2-3; const height=rect.height-padding*2-3;
          return <article key={`${w}x${h}`} data-size={`${w}x${h}`} style={{alignSelf:'flex-start',background:'#192638',border:'1px solid #57657c',padding:12}}>
            <p>{w} × {h} · {Math.round(width)} × {Math.round(height)}</p><AdaptiveDashboardCard id={id} width={width} height={height}/>
          </article>;
        })}
      </div>
    </section>)}
    <section data-measured style={{display:'flex',flexDirection:'column',width:425,height:199}}><DashboardCard id="meal" style={{flex: 1}} onOpen={() => undefined} /></section>
    {new URLSearchParams(location.search).has('layout') && <section data-dashboard-layout
      style={{display: 'flex', flexDirection: 'column', width: areaWidth, height: areaHeight}}>
      <DashboardLayout cards={DASHBOARD_CARD_IDS.map((id) => ({id, visible: true, size: 'standard'}))}
        grid={new URLSearchParams(location.search).get('layout') === 'grid' ? {
          version: 1, columns: 12, rows: 6,
          items: DASHBOARD_CARD_IDS.map((id, index) => ({id, x: index % 3 * 4, y: Math.floor(index / 3) * 3, width: 4, height: 3}))
        } : null} onOpen={(id) => document.querySelector('[data-dashboard-layout]')?.setAttribute('data-opened', id)} />
    </section>}
    <section data-weather-detail style={{display:'flex',flexDirection:'column',width:900,height:600}}><WeatherDetailView /></section>
  </main></FixtureProvider>;
}
createRoot(document.querySelector('#root')!).render(<Matrix/>);
