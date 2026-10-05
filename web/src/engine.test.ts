import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, resolveLanding, foundation, parseBest, INITIAL_WIDTH } from './engine.ts';
function settle(game: Game) { for(let i=0;i<30;i++)game.tick(1/60); }
test('perfect placements snap to the support without shrinking',()=>{
  for(const offset of [-7,-1,0,1,7]) {
    const b=foundation(), result=resolveLanding(b.x+offset,b.width,b);
    assert.equal(result.kind,'perfect');
    assert.deepEqual(result.block,{...b,floor:1});
  }
});
test('left and right overhang trim by the exact geometric overlap',()=>{
  const b=foundation();
  for(const offset of [-100,-30,30,100]) {
    const r=resolveLanding(b.x+offset,b.width,b);
    assert.equal(r.kind,'trimmed');
    assert.equal(r.block.width,INITIAL_WIDTH-Math.abs(offset));
    assert.equal(r.cut?.width,Math.abs(offset));
    assert.equal(r.block.x,Math.max(b.x,b.x+offset));
  }
});
test('non-overlapping and subpixel placements are misses',()=>{
  const b=foundation();
  for(const offset of [-143,-142,-141.1,141.1,142,143])assert.equal(resolveLanding(b.x+offset,b.width,b).kind,'miss');
});
test('generated overlap cases preserve boundaries and width',()=>{
  let seed=12345;
  for(let i=0;i<10000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const width=1+seed%142, support={x:200,width,floor:5};
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const x=100+(seed%342), r=resolveLanding(x,width,support);
    if(r.kind==='miss')continue;
    assert.ok(r.block.width>=1 && r.block.width<=width);
    assert.ok(r.block.x>=support.x && r.block.x+r.block.width<=support.x+support.width+1e-8);
    if(r.kind==='trimmed')assert.ok(Math.abs(r.block.width+(r.cut?.width||0)-width)<1e-8);
  }
});
test('only one drop can be accepted at a time',()=>{
  const g=new Game();assert.equal(g.drop(),false);g.start();g.x=foundation().x;
  assert.equal(g.drop(),true);assert.equal(g.drop(),false);settle(g);
  assert.equal(g.score,1);assert.equal(g.blocks.length,2);
});
test('pausing freezes a falling block and resumes its progress',()=>{
  const g=new Game();g.start();g.x=foundation().x;g.drop();g.tick(.05);g.pause();
  const time=g.fallTime;settle(g);assert.equal(g.fallTime,time);assert.equal(g.score,0);
  g.resume();settle(g);assert.equal(g.score,1);
});
test('a miss ends the game without scoring; restart clears the run',()=>{
  const g=new Game();g.start();g.x=0;g.drop();settle(g);
  assert.equal(g.mode,'over');assert.equal(g.score,0);assert.equal(g.drop(),false);
  g.start();assert.equal(g.mode,'playing');assert.equal(g.width,INITIAL_WIDTH);assert.equal(g.blocks.length,1);
});
test('hundreds of floors remain playable with bounded memory',()=>{
  const g=new Game();g.start();
  for(let i=0;i<300;i++) {g.x=g.blocks.at(-1)!.x;g.drop();settle(g);}
  assert.equal(g.score,300);assert.equal(g.mode,'playing');assert.equal(g.width,INITIAL_WIDTH);
  assert.equal(g.blocks.length,24);assert.equal(g.blocks.at(-1)!.floor,300);
});
test('corrupt, negative and unsafe best scores are rejected',()=>{
  for(const v of [null,'','-1','NaN','Infinity','1.2','100x','9007199254740992'])assert.equal(parseBest(v),0);
  assert.equal(parseBest('57'),57);assert.equal(parseBest('0'),0);
});
