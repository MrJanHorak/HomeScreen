const {test}=require('node:test');const assert=require('node:assert/strict');const load=require('./loadPureModule.cjs');
const {pollCardLayout}=load('src/components/dashboard/polls/pollCardLayout.ts');const {gridRect}=load('../server/functions/src/utils/dashboardLayout.ts');
test('poll essentials, result budgets, and QR reservations fit all 100 footprint/profile boxes',()=>{
  for(const [A,B,g,p,scale] of [[900,340,8,12,1],[1800,740,12,20,1.4]])for(let w=3;w<=12;w++)for(let h=2;h<=6;h++)for(const title of ['Movie night?','An unusually long household decision with many names and options that must remain readable on the television']){
    const r=gridRect({x:0,y:0,width:w,height:h},A,B,g);const width=r.width-p*2-3,height=r.height-p*2-3;
    for(const variant of ['auto','results','join']){
      const plan=pollCardLayout(width,height,scale,title,true,variant);
      assert.ok(plan.hero<=height,`${w}x${h}: essentials overflow`);assert.ok(plan.titleSize>=18*scale);assert.ok(plan.rows<=4);
      assert.ok(plan.contentTop+plan.rows*(plan.rowHeight+plan.gap)<=height);
      if(plan.qrSize){assert.ok(plan.qrSize>=160*scale);assert.ok(plan.hero+plan.gap+plan.qrSize+18*scale<=height);assert.ok(plan.rowWidth>=150*scale);}
      if(variant==='results')assert.equal(plan.qrSize,0);
    }
  }
});
