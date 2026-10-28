import { PidDB } from './engine.js';

export const DEMO_DRAWINGS=Object.freeze(['V02_04_010_137','V02_04_010_179','V02_04_010_150','V02_04_010_151','V02_04_010_193']);
const clone=value=>structuredClone(value);
const immutable=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(immutable);Object.freeze(o);}return o;};

/** DB is immutable; PidDB.apply only sees a cloned calculation graph. No geometry is generated. */
export async function createPidDbService({db,source='사용자 DB',storage=null,now=()=>new Date().toISOString()}){
  if(!db||!Array.isArray(db.Lines)||!Array.isArray(db.Connections)||!Array.isArray(db.Equipment_Refs))throw TypeError('Lines·Connections·Equipment_Refs 배열이 필요합니다.');
  const original=immutable(clone(db));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({db:original,excludeDrill:true})));
  const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const storageKey=`pipeguide-next:piddb-decisions:v1:${fingerprint}`;
  const base=PidDB.fromJson(original,{excludeDrill:true}),baseRows=PidDB.linksFor(base),linksById=new Map(base.links.map(l=>[l.id,l]));
  let decisions={},history=[],persistence=storage?'available':'memory-only';
  try{const saved=JSON.parse(storage?.getItem(storageKey)||'null');if(saved?.version===1&&saved.fingerprint===fingerprint){for(const [id,value]of Object.entries(saved.decisions||{}))if(linksById.get(id)?.base==='CANDIDATE'&&['approved','rejected'].includes(value))decisions[id]=value;history=Array.isArray(saved.history)?saved.history.filter(h=>h&&typeof h.at==='string'&&['approved','rejected','undo'].includes(h.action)&&Array.isArray(h.ids)&&h.ids.length&&h.ids.every(id=>linksById.get(id)?.base==='CANDIDATE')).map(h=>({at:h.at,action:h.action,ids:[...h.ids],rowId:typeof h.rowId==='string'?h.rowId:'',reason:typeof h.reason==='string'?h.reason:''})):[];}}catch{persistence='memory-only';}
  const documents=new Map((original.Drawings||[]).filter(d=>d.DrawingID).map(d=>[d.DrawingID,{id:d.DrawingID,metadata:clone(d),referenceOnly:false}]));
  for(const row of baseRows)for(const id of [row.from.drawing,row.to.drawing])if(id&&!documents.has(id))documents.set(id,{id,metadata:null,referenceOnly:true});
  const current=()=>PidDB.apply(clone(base),decisions);
  function rows(drawingIds){const allowed=drawingIds?.length?new Set(drawingIds):null,net=current();return PidDB.linksFor(net).map((row,i)=>{const ids=row.ids.filter(id=>linksById.get(id)?.base==='CANDIDATE');return {...row,id:`db-row-${i}`,baseStatus:baseRows[i].status,decision:ids.length&&ids.every(id=>decisions[id]==='approved')?'approved':ids.length&&ids.every(id=>decisions[id]==='rejected')?'rejected':null,actionable:baseRows[i].status==='CANDIDATE'&&ids.length>0,details:row.ids.flatMap(id=>(linksById.get(id)?.basis||[]).map(b=>({...clone(b),linkId:id}))),source,fingerprint};}).filter(r=>!allowed||allowed.has(r.from.drawing)||allowed.has(r.to.drawing));}
  function summary(drawingIds){const selected=rows(drawingIds);return {source,fingerprint,persistence,hasData:base.lines.length>0||base.links.length>0||documents.size>0,documentCount:drawingIds?.length?[...new Set(drawingIds)].filter(id=>documents.has(id)).length:documents.size,rowCount:selected.length,counts:{CONFIRMED:selected.filter(r=>r.status==='CONFIRMED').length,CANDIDATE:selected.filter(r=>r.status==='CANDIDATE').length,UNRESOLVED:selected.filter(r=>r.status==='UNRESOLVED').length,REJECTED:selected.filter(r=>r.status==='REJECTED').length,approved:selected.filter(r=>r.decision==='approved'&&r.status==='CONFIRMED').length},rawCounts:clone(current().count),excluded:clone(base.meta.excluded)};}
  function record({rowId,decision,reason=''}){
    if(!['approved','rejected','undo'].includes(decision))throw TypeError('승인·거부·되돌리기 중 하나를 선택하세요.');
    const row=rows().find(r=>r.id===rowId);if(!row||!row.actionable)throw Error('DB에 있는 연결 후보만 검토할 수 있습니다.');
    const ids=row.ids.filter(id=>linksById.get(id)?.base==='CANDIDATE');
    if(decision==='undo'&&!ids.some(id=>decisions[id]))throw Error('되돌릴 사용자 결정이 없습니다.');
    if(decision!=='undo'&&ids.every(id=>decisions[id]===decision))return {summary:summary(),changed:false};
    const next={...decisions};for(const id of ids){if(decision==='undo')delete next[id];else next[id]=decision;}
    const entry={at:now(),rowId,ids,action:decision,reason:String(reason)};decisions=next;history=[...history,entry];
    if(storage)try{storage.setItem(storageKey,JSON.stringify({version:1,fingerprint,decisions,history}));persistence='available';}catch{persistence='memory-only';}
    return {changed:true,entry:clone(entry),summary:summary()};
  }
  return Object.freeze({fingerprint,source,storageKey,rows,summary,record,listDocuments:()=>clone([...documents.values()]),getDocument:id=>clone(documents.get(id)||null),getDecisions:()=>({fingerprint,decisions:clone(decisions),history:clone(history),persistence})});
}

/** Preserve existing registry method names and RequestContext cancellation boundaries. */
export function createPidDbAdapters(service){return {
  connectionApproval:{schemaVersion:'1',name:'PidDB 연결 판정',capabilities:['evaluateConnection','getDecisions','recordDecision'],async invoke(method,input={},context){context.signal.throwIfAborted();if(method==='evaluateConnection')return {rows:service.rows(input.drawingIds).filter(r=>!input.lineId||r.LineID===input.lineId),summary:service.summary(input.drawingIds)};if(method==='getDecisions')return service.getDecisions();if(method==='recordDecision')return service.record(input);throw Error('지원하지 않는 PidDB 작업');}},
  pidDrawings:{schemaVersion:'1',name:'PidDB 도면 참조 메타데이터',capabilities:['listDocuments','getDocument'],async invoke(method,input={},context){context.signal.throwIfAborted();if(method==='listDocuments')return service.listDocuments();if(method==='getDocument')return service.getDocument(input.id);throw Error('지원하지 않는 도면 작업');}}
};}
