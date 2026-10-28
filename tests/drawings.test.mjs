import test from 'node:test';
import assert from 'node:assert/strict';
import {createDrawingStore,parseDrawingFilename,uniqueConnectionRows} from '../src/drawings/store.js';
import {PidDB} from '../src/piddb/engine.js';
import {referenceDb} from '../src/piddb/reference-db.js';
const entry=(id,name)=>({id,name,url:'blob:'+id,signature:id,width:100,height:80});
test('only explicit complete drawing names and numbered fragments are grouped',()=>{
  for(const name of ['V02_04_010_137_1.png','v02_04_010_137_2.JPG','V02_04_010_137.jpeg'])assert.equal(parseDrawingFilename(name).drawingId,'V02_04_010_137');
  for(const name of ['137_1.png','V02_04_010_137_01.png','V02_04_010_137_0.png','V02_04_010_137_copy.png','unknown.jpg','V02_04_010_137_1.pdf'])assert.equal(parseDrawingFilename(name),null);
});
test('image groups are separate from DB references and ambiguous files require assignment',()=>{
  const store=createDrawingStore();store.setDbDocuments([{id:'V02_04_010_193'}]);
  store.add([entry('b','V02_04_010_137_2.png'),entry('a','V02_04_010_137_1.png'),entry('c','unknown.jpg')]);
  assert.equal(store.documents().length,2);assert.equal(store.documents()[0].fragments.length,0);
  assert.deepEqual(store.documents()[1].fragments.map(f=>f.part),[1,2]);
  assert.equal(store.get().fragments[2].drawingId,null);store.assign('c','V02_04_010_193');
  assert.equal(store.get().drawingId,'V02_04_010_193');assert.equal(store.get().fragmentId,'c');
  store.selectDrawing('V02_04_010_137');store.selectFragment('a');assert.equal(store.get().fragmentId,'a');
  assert.throws(()=>store.selectFragment('c'));assert.throws(()=>store.assign('a',' '));
  const copy=store.get();copy.fragments[0].name='changed';assert.notEqual(store.get().fragments[0].name,'changed');
});
test('duplicate uploads release unused URL; removing images preserves missing DB originals',()=>{
  const released=[],store=createDrawingStore({release:url=>released.push(url)});store.setDbDocuments([{id:'V02_04_010_137'}]);
  const a=entry('a','V02_04_010_137_1.png');store.add([a]);store.add([{...a,url:'blob:duplicate'}]);
  assert.equal(store.get().fragments.length,1);assert.deepEqual(released,['blob:duplicate']);
  store.remove('a');assert.equal(store.get().drawingId,'V02_04_010_137');assert.equal(store.get().fragmentId,null);assert.equal(store.documents()[0].fragments.length,0);
});
test('connection deduplication is independent of fragment count and preserves distinct evidence',()=>{
  const row={LineID:'actual-test',from:{drawing:'A'},to:{drawing:'B'},basis:'candidate',evidence:'DB',ids:['b','a']};
  assert.equal(uniqueConnectionRows([row,{...row,ids:['a','b']},row]).length,1);
  assert.equal(uniqueConnectionRows([row,{...row,evidence:'other source'}]).length,2);
});
test('actual drawing fragments filter the original engine once per drawing ID',()=>{
  const store=createDrawingStore();store.add([entry('a','V02_04_010_179_1.png'),entry('b','V02_04_010_179_2.png')]);
  const net=PidDB.fromJson(referenceDb,{excludeDrill:true}),rows=PidDB.linksFor(net,store.documents().map(d=>d.id));
  assert.equal(rows.length,5);assert.equal(uniqueConnectionRows([...rows,...rows]).length,5);
  assert.ok(rows.every(row=>[row.from.drawing,row.to.drawing].includes('V02_04_010_179')));
});
