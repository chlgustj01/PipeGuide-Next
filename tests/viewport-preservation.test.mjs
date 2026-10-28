import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewport} from '../src/viewport.js';
test('2D visibility and mode transitions preserve WebGL resources and camera orientation',()=>{
  let matrix,programs=0,buffers=0;const handlers={};
  const noop=()=>{},gl=new Proxy({createShader:()=>({}),getShaderParameter:()=>true,createProgram:()=>{programs++;return {};},getProgramParameter:()=>true,createBuffer:()=>{buffers++;return {};},isContextLost:()=>false,getAttribLocation:()=>0,getUniformLocation:(_,name)=>name,uniformMatrix3fv:(_,__,value)=>{matrix=[...value];}},{get:(o,k)=>o[k]??noop});
  const surface={addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:noop};
  const canvas={getContext:()=>gl,parentElement:surface,addEventListener:noop,removeEventListener:noop,getBoundingClientRect:()=>({width:900,height:600})};
  const originals=Object.fromEntries(['window','document','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.assign(globalThis,{window:{devicePixelRatio:1},document:{hidden:false,addEventListener:noop,removeEventListener:noop},ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame:noop});
  try{const viewport=createViewport(canvas);handlers.keydown({key:'ArrowRight',preventDefault:noop});const camera=[...matrix];viewport.setVisible(false);handlers.keydown({key:'ArrowLeft',preventDefault:noop});viewport.setVisible(true);assert.deepEqual(matrix,camera);assert.equal(programs,1);assert.equal(buffers,1);viewport.destroy();}
  finally{for(const [k,descriptor]of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}}
});
