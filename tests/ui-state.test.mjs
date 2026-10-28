import test from 'node:test';
import assert from 'node:assert/strict';
import { createUIState } from '../src/state.js';
test('mode changes preserve category and view independently',()=>{const s=createUIState();s.set({category:'equipment',view:'2d'});s.set({mode:'review'});assert.deepEqual(s.get(),{mode:'review',category:'equipment',view:'2d',rotating:false});});
test('invalid changes are atomic and state cannot be mutated externally',()=>{const s=createUIState();const before=s.get();assert.throws(()=>s.set({mode:'legacy'}));assert.equal(s.get(),before);assert.throws(()=>{s.get().mode='review';});assert.throws(()=>s.set({shipWidth:100}));});
test('subscriptions can be removed',()=>{const s=createUIState();let count=0;const stop=s.subscribe(()=>count++);s.set({mode:'improve'});stop();s.set({mode:'explore'});assert.equal(count,1);});
