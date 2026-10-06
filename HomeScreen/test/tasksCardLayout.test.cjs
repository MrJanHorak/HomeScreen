const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadPureModule.cjs');
const {planTasksCard, pendingTasks, taskDue} = load('src/components/dashboard/tasks/tasksCardLayout.ts');
const {gridRect} = load('../server/functions/src/utils/dashboardLayout.ts');
const tasks = Array.from({length:30}, (_, i) => ({id:String(i), title:`Task ${i} to complete`, due:i % 2 ? null : '2026-10-07'}));
const long = tasks.map(task => ({...task, title:'A long task name with important household details and several errands to finish'}));

test('Tasks fits all 100 reference sizes with bounded, readable checklists', () => {
  for (const [A,B,g,p,scale] of [[900,340,8,12,1],[1800,740,12,20,1.4]]) {
    for (let w=3; w<=12; w++) for (let h=2; h<=6; h++) {
      const r = gridRect({x:0,y:0,width:w,height:h}, A,B,g);
      for (const data of [tasks,long,tasks.slice(0,1),[]]) {
        const plan = planTasksCard({width:r.width-2*p-3, height:r.height-2*p-3, scale, tasks:data});
        assert.ok(plan.used <= r.height-2*p-3 + 0.01);
        assert.ok(plan.count <= 6 && plan.count <= data.length);
        assert.ok(plan.row.titleSize >= 14 && plan.columns <= 2);
        if (data.length) assert.ok(plan.count >= 1);
      }
    }
  }
});

test('Checklist previews retain their prefix as width/height grow; metadata and enlargement yield first', () => {
  for (const data of [tasks,long,tasks.map(task => ({...task,due:null}))]) {
    for (const width of [192,284,419,550,873,1255]) {
      let previous = 0;
      for (let height=81; height<=500; height++) {
        const plan = planTasksCard({width,height,scale:1,tasks:data});
        assert.ok(plan.count >= previous, `${width}x${height} lost a task`);
        previous = plan.count;
      }
    }
    for (const height of [81,139,197,255,313,498]) {
      let previous = 0;
      for (let width=192; width<=1255; width+=3) {
        const plan = planTasksCard({width,height,scale:1,tasks:data});
        assert.ok(plan.count >= previous, `${width}x${height} lost a task as width grew`);
        previous = plan.count;
      }
    }
  }
});

test('Task identity includes its list, completed tasks leave the preview, provider order and arrays remain intact', () => {
  const data = [tasks[0],tasks[0],{...tasks[0],tasklistId:'another'}, {...tasks[1],completed:true},tasks[2]];
  assert.deepEqual(pendingTasks(data), [tasks[0],data[2],tasks[2]]);
  assert.equal(data.length,5);
});

test('Date labels preserve calendar days and yearless provider labels without inferred urgency', () => {
  assert.equal(taskDue({...tasks[0],due:'2026-10-07'}),'Due Oct 7');
  assert.equal(taskDue({...tasks[0],due:'Sep 28'}),'Due Sep 28');
  assert.equal(taskDue({...tasks[0],due:'2026-02-31'}),'Due 2026-02-31');
  assert.equal(taskDue({...tasks[0],due:'  '}),undefined);
});
