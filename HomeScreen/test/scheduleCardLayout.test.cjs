const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadPureModule.cjs');
const {planScheduleCard} = load('src/components/dashboard/schedule/scheduleCardLayout.ts');
const {schedulePreview, scheduleEventState, scheduleDate, scheduleTime, scheduleEnd} = load('src/components/dashboard/schedule/schedulePresentation.ts');
const {gridRect} = load('../server/functions/src/utils/dashboardLayout.ts');
const event = (id, extra={}) => ({id,title:`Appointment ${id}`,time:'10:30 AM',endTime:'11:30 AM',category:'Personal',color:'#38BDF8',...extra});
const today = Array.from({length:20},(_,i)=>event(`today-${i}`));
const upcoming = Array.from({length:20},(_,i)=>event(`future-${i}`,{date:`2026-10-${String(7+i).padStart(2,'0')}`}));
const defaults={scale:1,title:'Family appointment',hasEvent:true,hasDetail:true,today,upcoming};

test('all 100 schedule reference boxes fit empty, sparse and busy calendars',()=>{
  for(const [A,B,g,p,scale] of [[900,340,8,12,1],[1800,740,12,20,1.4]]) {
    for(let w=3;w<=12;w++)for(let h=2;h<=6;h++) {
      const r=gridRect({x:0,y:0,width:w,height:h},A,B,g);
      for(const patch of [defaults,{...defaults,title:'A very long family appointment with household planning and several details'},
        {...defaults,today:[],upcoming:[]},{...defaults,today:[],upcoming:upcoming.slice(0,1)},
        {...defaults,title:'No events to show',hasEvent:false,today:[],upcoming:[]}]) {
        const plan=planScheduleCard({...patch,scale,width:r.width-2*p-3,height:r.height-2*p-3});
        assert.ok(plan.used<=r.height-2*p-3+0.01,`${scale} ${w}x${h} ${patch.title}`);
        assert.ok(plan.todayCount+plan.upcomingCount<=4);
        assert.ok(plan.titleSize>=18*scale);
      }
    }
  }
});

test('growing a schedule retains its visible groups and earlier events',()=>{
  for(const patch of [defaults,{...defaults,upcoming:[]}, {...defaults,today:[]},
    {...defaults,title:'A long featured name that wraps and uses two lines'}]) {
    for(const width of [192,284,419,550,873,1255]) {
      let previous={todayCount:0,upcomingCount:0};
      for(let height=81;height<=500;height++) {
        const plan=planScheduleCard({...patch,width,height});
        assert.ok(plan.todayCount>=previous.todayCount&&plan.upcomingCount>=previous.upcomingCount,`${width}x${height} lost an event`);
        previous=plan;
      }
    }
    for(const height of [81,139,197,255,313,498]) {
      let previous={todayCount:0,upcomingCount:0};
      for(let width=192;width<=1255;width+=3) {
        const plan=planScheduleCard({...patch,width,height});
        assert.ok(plan.todayCount>=previous.todayCount&&plan.upcomingCount>=previous.upcomingCount,`${width}x${height} lost an event as width grew`);
        previous=plan;
      }
    }
  }
});

test('preview is a balanced prefix without duplicating the featured event or mutating the feed',()=>{
  const data=schedulePreview([today[0],today[0],today[1]], [today[0],upcoming[1],upcoming[0]]);
  assert.equal(data.first.id,today[0].id);
  assert.deepEqual(data.today.map(e=>e.id),[today[1].id]);
  assert.deepEqual(data.upcoming.map(e=>e.id),[upcoming[0].id,upcoming[1].id]);
  const plan=planScheduleCard({...defaults,width:873,height:313});
  assert.ok(plan.todayCount>0&&plan.upcomingCount>0);
  assert.equal(today.length,20);
});

test('date-only labels, all-day events, continuations and missing time stay truthful',()=>{
  assert.equal(scheduleDate('2026-10-07'),'Wed, Oct 7');
  for(const date of [undefined,'not-a-date','2026-02-31']) assert.equal(scheduleDate(date),'Date unavailable');
  assert.equal(scheduleTime(event('day',{time:'All Day'})),'All day');
  assert.equal(scheduleEnd(event('day',{time:'All Day',endTime:'All Day'})),'');
  assert.equal(scheduleEnd(event('next',{endTime:'Continues'})),'Continues');
  assert.equal(scheduleTime(event('unknown',{time:''})),'Time unavailable');
});

test('device time uses exact start-inclusive/end-exclusive instants and retains legacy/invalid data',()=>{
  const sample=event('timed',{startMs:1000,endMs:2000});
  assert.equal(scheduleEventState(sample,999),'upcoming');
  assert.equal(scheduleEventState(sample,1000),'in-progress');
  assert.equal(scheduleEventState(sample,1999),'in-progress');
  assert.equal(scheduleEventState(sample,2000),'ended');
  assert.equal(scheduleEventState({...sample,allDay:true},1000),'all-day');
  for(const sample of [event('legacy'),event('invalid',{startMs:2000,endMs:1000}),event('invalid',{startMs:NaN,endMs:2000})]) {
    assert.equal(scheduleEventState(sample,1500),'unknown');
    assert.equal(schedulePreview([sample],[],1500).first.id,sample.id);
  }
});

test('current events lead, ended events leave only the preview, and future occurrences move into today at midnight',()=>{
  const now=Date.parse('2026-10-07T04:30:00Z'); // Oct 7, 00:30 New York
  const items=[
    event('ended',{date:'2026-10-06',startMs:now-7200000,endMs:now-3600000,timeZone:'America/New_York'}),
    event('overnight',{date:'2026-10-07',startMs:now-1800000,endMs:now+1800000,timeZone:'America/New_York'}),
    event('later',{date:'2026-10-07',startMs:now+3600000,endMs:now+7200000,timeZone:'America/New_York'}),
    event('day',{date:'2026-10-07',startMs:now-1800000,endMs:now+84600000,timeZone:'America/New_York',allDay:true}),
  ];
  const preview=schedulePreview([items[0]],items.slice(1),now);
  assert.equal(preview.first.id,'overnight');
  assert.equal(preview.firstIsToday,true);
  assert.deepEqual(preview.today.map(e=>e.id),['later','day']);
  assert.equal(preview.upcoming.length,0);
  assert.equal(items.length,4,'full detail source is retained');
});
