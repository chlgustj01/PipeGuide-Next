import test from 'node:test';
import assert from 'node:assert/strict';
import { createHullVisual } from '../src/intro/hull-visual.js';
test('presentation shell is symmetric and finite through the full rotation silhouette',()=>{const h=createHullVisual();for(let i=0;i<=64;i++)for(let j=0;j<=24;j++){const a=h.surface(i/64,j/24),b=h.surface(i/64,1-j/24);assert.ok(a.every(Number.isFinite));assert.ok(Math.abs(a[0]-b[0])<1e-9);assert.ok(Math.abs(a[1]-b[1])<1e-9);assert.ok(Math.abs(a[2]+b[2])<1e-9);}});
test('bulb and raked stem are one continuous surface rather than detached meshes',()=>{const h=createHullVisual(),upper=h.surface(0,0),neck=h.surface(0,.25),foot=h.surface(0,.5);assert.ok(neck[0]>upper[0]);assert.ok(foot[0]<upper[0]);for(let u=0;u<1;u+=.01){const a=h.surface(0,u),b=h.surface(0,u+.0001);assert.ok(Math.hypot(...a.map((v,k)=>v-b[k]))<.02);}});
test('fair stations stay within the presentation beam and depth envelope',()=>{const h=createHullVisual();for(let i=0;i<=1000;i++){const [,w,d]=h.section(i/1000);assert.ok(w>0&&w<=.641);assert.ok(d>=.589&&d<=.871);}assert.equal(h.purpose,'presentation-only');});
