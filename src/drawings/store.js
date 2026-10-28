/** Image metadata only. File coordinates are pixels, never ship/design coordinates. */
export function parseDrawingFilename(name){
  const match=/^(V\d{2}_\d{2}_\d{3}_\d{3})(?:_([1-9]\d*))?\.(png|jpe?g)$/i.exec(name);
  return match?{drawingId:match[1].toUpperCase(),part:match[2]?Number(match[2]):null}:null;
}
export function createDrawingStore({release=()=>{}}={}){
  let fragments=[],dbDocuments=[],drawingId=null,fragmentId=null;const listeners=new Set();
  const emit=kind=>listeners.forEach(fn=>fn({kind,drawingId,fragmentId}));
  function documents(){const map=new Map(dbDocuments.map(d=>[d.id,{...structuredClone(d),fragments:[]}]));for(const f of fragments)if(f.drawingId){if(!map.has(f.drawingId))map.set(f.drawingId,{id:f.drawingId,metadata:null,referenceOnly:false,fragments:[]});map.get(f.drawingId).fragments.push({...f});}for(const d of map.values())d.fragments.sort((a,b)=>(a.part??0)-(b.part??0)||a.name.localeCompare(b.name));return [...map.values()];}
  function select(id,preferred){if(id!==null&&!documents().some(d=>d.id===id))throw TypeError('알 수 없는 도면 ID');drawingId=id;const available=id===null?[]:fragments.filter(f=>f.drawingId===id);fragmentId=available.find(f=>f.id===preferred)?.id||available[0]?.id||null;}
  return Object.freeze({
    get:()=>({fragments:fragments.map(f=>({...f})),drawingId,fragmentId}),documents,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    setDbDocuments(list){dbDocuments=structuredClone(list);emit('db');},
    add(entries){const added=[];for(const entry of entries){if(fragments.some(f=>f.signature===entry.signature)){release(entry.url);continue;}const parsed=parseDrawingFilename(entry.name),f={...entry,drawingId:parsed?.drawingId||null,part:parsed?.part??null,manual:false};fragments.push(f);added.push(f);}if(!drawingId&&added.some(f=>f.drawingId)){const first=added.find(f=>f.drawingId);select(first.drawingId,first.id);}else if(drawingId&&!fragmentId)select(drawingId);emit('files');return added.map(f=>({...f}));},
    selectDrawing(id){select(id,fragmentId);emit('selection');},
    selectFragment(id){const f=fragments.find(f=>f.id===id);if(!f||f.drawingId!==drawingId)throw TypeError('현재 도면의 조각이 아닙니다');fragmentId=id;emit('fragment');},
    assign(id,manualId){const normalized=String(manualId).trim();if(!normalized||normalized.length>128||/[\x00-\x1f]/.test(normalized))throw TypeError('명확한 도면 ID를 입력하세요');const f=fragments.find(f=>f.id===id);if(!f)throw TypeError('첨부 파일을 찾을 수 없습니다');f.drawingId=normalized;f.manual=true;select(normalized,f.id);emit('assignment');},
    remove(id){const f=fragments.find(f=>f.id===id);if(!f)return;fragments=fragments.filter(v=>v.id!==id);release(f.url);if(!documents().some(d=>d.id===drawingId))select(null);else if(fragmentId===id)select(drawingId);emit('files');},
    destroy(){fragments.forEach(f=>release(f.url));fragments=[];listeners.clear();}
  });
}

/** Deduplicate logical connection rows, independent of the number of uploaded fragments. */
export function uniqueConnectionRows(rows){const seen=new Set();return rows.filter(row=>{const key=JSON.stringify([row.LineID,row.from,row.to,row.basis,row.evidence,[...row.ids].sort()]);if(seen.has(key))return false;seen.add(key);return true;});}
