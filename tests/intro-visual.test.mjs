import test from 'node:test';
import assert from 'node:assert/strict';
import { createShipVisual } from '../src/intro/ship-visual.js';
import { presentationCamera, multiply } from '../src/intro/renderer.js';

test('intro artwork buffers contain finite interleaved geometry without design metadata',()=>{
  const visual=createShipVisual();
  assert.equal(visual.purpose,'presentation-only');
  for(const key of ['solid','wire','ambient']){assert.ok(visual[key] instanceof Float32Array);assert.ok(visual[key].length>0);assert.equal(visual[key].length%6,0);assert.ok(visual[key].every(Number.isFinite));}
  assert.equal(visual.solid.length%18,0);assert.equal(visual.wire.length%12,0);
  assert.deepEqual(Object.keys(visual).sort(),['ambient','purpose','solid','wire']);
});
test('intro geometry generation is deterministic and isolated per instance',()=>{
  const a=createShipVisual(),b=createShipVisual();assert.deepEqual(a.ambient,b.ambient);a.solid[0]=999;assert.notEqual(b.solid[0],999);
});
test('presentation cameras remain finite in landscape and portrait layouts',()=>{
  for(const [aspect,portrait]of [[16/9,false],[9/16,true]]){const matrix=presentationCamera(aspect,portrait);assert.equal(matrix.length,16);assert.ok(matrix.every(Number.isFinite));}
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];assert.deepEqual([...multiply(identity,identity)],identity);
});
