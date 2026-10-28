import { createPidDbService,createPidDbAdapters,DEMO_DRAWINGS } from './service.js';

const esc=value=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={CONFIRMED:'확정',CANDIDATE:'후보',UNRESOLVED:'미해결',REJECTED:'거부'};

/** Thin UI binding: every result/decision goes through the existing module registry. */
export function connectPidDbExplore({modules,workspace,notify}){
  let state={service:null,documents:[],rows:[],selected:null,scope:'demo',summary:null,busy:false,error:''},unregister=[],pending=null,revision=0,seenProject=workspace.data.get().projectId;
  const ctx=()=>({requestId:crypto.randomUUID(),signal:new AbortController().signal});
  const scopeIds=()=>state.scope==='demo'?DEMO_DRAWINGS:state.scope==='all'?[]:[state.scope];
  const extension={render,bind};
  const repaint=()=>workspace.setExploreExtension(extension);
  function render(){
    let html=`<details class="db-source" ${state.service?'':'open'}><summary><strong>PidDB 연결 판정</strong><span>${state.service?esc(state.service.source):'데이터 미연결'}</span></summary><div class="action-pair"><button class="panel-action" id="load-reference-db" ${state.busy?'disabled':''}>ZIP 참고 DB 열기</button><label class="panel-action db-file">JSON DB 선택<input id="load-json-db" type="file" accept=".json,application/json" ${state.busy?'disabled':''}></label></div><p class="action-reason">원본 도면 이미지·OCR·3D 형상을 로드하지 않습니다.</p></details>`;
    if(state.error)html+=`<p class="db-error" role="alert">${esc(state.error)}</p>`;
    if(state.busy)html+='<p class="action-reason" role="status">DB 계산·기록 처리 중…</p>';
    if(!state.service)return html+'<div class="panel-empty">DB를 선택하면 실제 연결 판정과 근거를 표시합니다.</div><details class="panel-section"><summary>OCR · 3D 생성</summary><p class="action-reason">이번 범위에 포함되지 않습니다.</p></details>';
    if(workspace.data.get().projectId!=='piddb-'+state.service.fingerprint)return html+'<div class="panel-empty">상단에서 이 DB의 프로젝트를 선택하세요. 프로젝트 미선택 상태에서는 연결을 검토하지 않습니다.</div>';
    const sum=state.summary;
    html+=`<label class="panel-label db-scope">도면 범위<select id="db-drawing" ${state.busy?'disabled':''}>${DEMO_DRAWINGS.every(id=>state.documents.some(d=>d.id===id))?'<option value="demo">시연 도면 5장 전체</option>':''}<option value="all">DB 전체 도면 참조</option>${state.documents.map(d=>`<option value="${esc(d.id)}">${esc(d.id)}${d.referenceOnly?' · 참조만':''}</option>`).join('')}</select></label><p class="action-reason">DB 도면 참조 기준이며 도면 파일·인식 완료 수가 아닙니다.</p>`;
    if(sum?.hasData)html+=`<div class="db-counts">확정 ${sum.counts.CONFIRMED} · 후보 ${sum.counts.CANDIDATE} · 미해결 ${sum.counts.UNRESOLVED} · 거부 ${sum.counts.REJECTED}</div><p class="action-reason">Lines.System 기준 시추 라인 ${sum.excluded?.lines??'—'}개 제외 · 원본 엔진 규칙</p>`;
    html+='<h3 class="db-list-title">Line ID · 연결 도면</h3><div class="db-row-list" aria-label="DB 연결 판정 목록">'+(state.rows.map(row=>`<button class="db-row ${row.id===state.selected?'selected':''}" data-db-row="${row.id}" aria-pressed="${row.id===state.selected}" ${state.busy?'disabled':''}><span><b>${esc(row.LineID||'라인 미기재')}</b><em class="db-status ${row.status.toLowerCase()}">${labels[row.status]}</em></span><small>${esc(row.from.drawing||'도면 미기재')} → ${esc(row.to.drawing||'도면 미기재')}</small><small>${esc(row.basis)} · ${esc(row.evidence)}</small></button>`).join('')||'<div class="panel-empty">이 범위에 DB 연결 판정이 없습니다.</div>')+'</div>';
    const row=state.rows.find(r=>r.id===state.selected);
    if(row){html+=`<section class="db-selection" aria-label="선택 연결 근거"><h3>${esc(row.LineID||'라인 미기재')} · ${labels[row.status]}</h3><dl><div class="context-field"><dt>연결 도면</dt><dd>${esc(row.from.drawing)} → ${esc(row.to.drawing)}</dd></div><div class="context-field"><dt>끝점</dt><dd>${esc(row.from.tag||'미기재')} → ${esc(row.to.tag||'미기재')}</dd></div><div class="context-field"><dt>DB 근거</dt><dd>${esc(row.evidence)}</dd></div><div class="context-field"><dt>사용자 결정</dt><dd>${row.decision==='approved'?'승인':row.decision==='rejected'?'거부':'미검토'}</dd></div></dl><details class="db-evidence"><summary>DB 근거 자세히 (${row.details.length})</summary>${row.details.map(b=>`<article><b>${esc(b.src)} · ${esc(b.ref)}</b><p>도면: ${esc(b.drawing)}<br>DB 상태: ${esc(b.dbStatus)}<br>근거: ${esc(b.evidence||'미기재')}<br>${esc(b.note||'')}</p></article>`).join('')}</details>`;
      if(row.actionable)html+=`<div class="action-pair"><button class="panel-action primary" data-db-decision="approved" ${state.busy||row.decision==='approved'?'disabled':''}>승인</button><button class="panel-action" data-db-decision="rejected" ${state.busy||row.decision==='rejected'?'disabled':''}>거부</button><button class="panel-action" data-db-decision="undo" ${state.busy||!row.decision?'disabled':''}>되돌리기</button></div><p class="action-reason">승인은 DB 후보의 사용자 결정이며 배관·3D를 생성하지 않습니다.</p>`;
      else html+='<p class="action-reason">DB 원본 확정·미해결 판정은 후보 승인으로 덮어쓰지 않습니다.</p>';
      html+='</section>';
    }else html+='<p class="action-reason">연결을 선택하면 근거 상세와 검토 동작을 표시합니다.</p>';
    html+=`<p class="db-storage">${sum?.persistence==='available'?'검토 기록: DB별 브라우저 저장 · 원본 DB와 분리':'검토 기록: 이 세션에만 유지 · 브라우저 저장 불가'}</p><details class="panel-section"><summary>OCR · 3D 생성 가능 여부</summary><p class="action-reason">OCR 미연결. DB에 실제 XYZ가 없어 3D 배관을 생성하지 않습니다.</p><button class="panel-action" disabled>3D 생성</button></details>`;
    return html;
  }
  function bind(panel){
    panel.querySelector('#load-reference-db').onclick=async()=>{await load(async()=>{const {referenceDb}=await import('./reference-db.js');return referenceDb;},'ZIP 참고 DB');};
    panel.querySelector('#load-json-db').onchange=e=>{const file=e.target.files[0];if(file)load(async()=>JSON.parse(await file.text()),file.name);};
    const select=panel.querySelector('#db-drawing');if(select){select.value=state.scope;select.onchange=()=>{state.scope=select.value;state.selected=null;workspace.data.selectPipe(null);refresh();};}
    panel.querySelectorAll('[data-db-row]').forEach(button=>{button.onclick=()=>{state.selected=button.dataset.dbRow;const row=state.rows.find(r=>r.id===state.selected);workspace.data.selectPipe(row?.LineID||null);repaint();document.querySelector('.db-selection')?.scrollIntoView({block:'nearest'});};});
    panel.querySelectorAll('[data-db-decision]').forEach(button=>{button.onclick=()=>decide(button.dataset.dbDecision);});
  }
  async function load(read,source){
    if(state.busy)return;state.busy=true;state.error='';repaint();
    try{const db=await read();let storage=null;try{storage=window.localStorage;}catch{/* session-only decisions are explicitly labelled */}
      const service=await createPidDbService({db,source,storage});pending?.abort();revision++;unregister.forEach(fn=>fn());unregister=[];const adapters=createPidDbAdapters(service);for(const [id,adapter]of Object.entries(adapters))unregister.push(modules.register(id,adapter));
      state={...state,service,rows:[],selected:null,summary:null,documents:await modules.invoke('pidDrawings','listDocuments',{},ctx())};state.scope=DEMO_DRAWINGS.every(id=>state.documents.some(d=>d.id===id))?'demo':'all';const id='piddb-'+service.fingerprint;workspace.data.setProjects([{id,name:source}]);workspace.data.selectProject(id);document.querySelector('.empty-model p').textContent='PidDB 도면 참조가 연결되었습니다. 실제 선박·장비 위치·배관 형상은 아직 연결되지 않았습니다.';document.querySelector('.empty-footnote').textContent='연결 판정만 제공 · 3D 모델·좌표 미연결';await refresh();
    }catch(error){state.error=error.message;notify('DB를 연결하지 못했습니다: '+error.message);}finally{state.busy=false;repaint();}
  }
  async function refresh(){
    if(!state.service||workspace.data.get().projectId!=='piddb-'+state.service.fingerprint)return;pending?.abort();const controller=new AbortController();pending=controller;const token=++revision,projectId='piddb-'+state.service.fingerprint;
    try{const result=await modules.invoke('connectionApproval','evaluateConnection',{drawingIds:scopeIds()},{requestId:crypto.randomUUID(),signal:controller.signal});if(token!==revision)return;state.rows=result.rows;state.summary=result.summary;if(!state.rows.some(r=>r.id===state.selected))state.selected=null;
      const source='PidDB '+state.service.fingerprint.slice(0,8),ready=value=>result.summary.hasData?({status:'ready',value,source}):({status:'unavailable'});workspace.data.applyMetrics('explore',{documents:ready(result.summary.documentCount),connections:ready(result.summary.counts.CANDIDATE),approved:ready(result.summary.counts.approved)},{projectId});
      const ledger=await modules.invoke('connectionApproval','getDecisions',{}, {requestId:crypto.randomUUID(),signal:controller.signal});if(token!==revision)return;workspace.setHistory(ledger.history,ledger.history.length?'PidDB 검토 이력 · 원본 DB와 별도 관리':'PidDB 검토 기록 없음 · 원본 DB와 별도 관리');repaint();
    }catch(error){if(error.name!=='AbortError'){state.error=error.message;repaint();}}
  }
  async function decide(decision){if(state.busy||!state.selected)return;state.busy=true;repaint();try{await modules.invoke('connectionApproval','recordDecision',{rowId:state.selected,decision},ctx());await refresh();notify(decision==='undo'?'원본 후보 상태로 되돌렸습니다.':decision==='approved'?'선택한 DB 후보를 승인했습니다.':'선택한 DB 후보를 거부했습니다.');}catch(error){state.error=error.message;}finally{state.busy=false;repaint();}}
  const unsubscribe=workspace.data.subscribe(s=>{if(s.projectId===seenProject)return;seenProject=s.projectId;pending?.abort();revision++;state.selected=null;if(state.service&&s.projectId==='piddb-'+state.service.fingerprint)refresh();else repaint();});
  repaint();
  return {destroy(){unsubscribe();pending?.abort();unregister.forEach(fn=>fn());}};
}
