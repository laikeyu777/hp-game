const assert = require('assert');
const ArenaBackgrounds = require('./arena-backgrounds.js');

function context() {
  const operations = [];
  return {
    operations, fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    fillRect(x,y,w,h){ operations.push(['fillRect',x,y,w,h,this.fillStyle]); },
    strokeRect(x,y,w,h){ operations.push(['strokeRect',x,y,w,h,this.strokeStyle]); },
    beginPath(){ operations.push(['beginPath']); }, moveTo(x,y){ operations.push(['moveTo',x,y]); },
    lineTo(x,y){ operations.push(['lineTo',x,y]); }, arc(x,y,r,a,b){ operations.push(['arc',x,y,r,a,b]); },
    stroke(){ operations.push(['stroke',this.strokeStyle]); }, fill(){ operations.push(['fill',this.fillStyle]); },
    save(){ operations.push(['save']); }, restore(){ operations.push(['restore']); },
  };
}

const signatures = ['ember','frost','garden','storm','void'].map(chapterId => {
  const ctx = context();
  ArenaBackgrounds.draw(ctx,{chapterId,now:1250,boss:false,reducedMotion:false,width:360,height:390});
  assert.ok(ctx.operations.length > 18);
  return JSON.stringify(ctx.operations);
});
assert.equal(new Set(signatures).size, 5);

const normal = context(), boss = context(), reduced = context();
ArenaBackgrounds.draw(normal,{chapterId:'ember',now:1250,boss:false,reducedMotion:false,width:360,height:390});
ArenaBackgrounds.draw(boss,{chapterId:'ember',now:1250,boss:true,reducedMotion:false,width:360,height:390});
ArenaBackgrounds.draw(reduced,{chapterId:'ember',now:1250,boss:false,reducedMotion:true,width:360,height:390});
assert.notEqual(JSON.stringify(normal.operations), JSON.stringify(boss.operations));
assert.ok(reduced.operations.length < normal.operations.length);

console.log('arena background tests passed');
