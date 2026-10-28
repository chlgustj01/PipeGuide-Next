import { hydrateIcons, icon } from './icons.js';
import { createUIState, modes, categories } from './state.js';
import { createViewport } from './viewport.js';
import { createModuleRegistry } from './modules/registry.js';
import { createIntro } from './intro/intro.js';
import { createModeWorkspace } from './workspace-panels.js';

const $ = selector => document.querySelector(selector);
const ui = createUIState();
// Composition root: future adapters are registered here, individually. No global singleton exported.
const modules = createModuleRegistry();
hydrateIcons();
const viewport = createViewport($('#viewport-canvas'), { onStatus: status => { $('#renderer-status').textContent=status; } });
let drawerOpener, toastTimer;
function notify(text) { const el=$('#toast'); el.textContent=text; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{el.hidden=true;},4200); }
function showDrawer(kind='modules', opener=document.activeElement) {
  drawerOpener=opener; $('#drawer').hidden=false; $('#modules-button').setAttribute('aria-expanded','true');
  $('#drawer-title').textContent=kind==='help'?'워크스페이스 안내':'모듈 · 데이터';
  const content=$('#drawer-content'); content.replaceChildren();
  if(kind==='help') {
    content.innerHTML='<p class="drawer-intro">기존 설계 코드에 의존하지 않는 PipeGuide-Next UI MVP입니다.</p><div class="info-box">이 화면의 방향 표시에는 실제 설계 좌표·치수·단위가 없습니다. 연결된 모델, 도면, 장비, 배관과 검사 결과도 없습니다.</div><h3>화면 사용</h3><ul class="help-list"><li>왼쪽 메뉴: 탐색 · 문제 검토 · 경로 개선</li><li>하단 탭: 배관 · 장비 · 공간</li><li>/ 키: 검색 · Esc 키: 패널 닫기</li><li>뷰포트 드래그 또는 방향키: 보기 방향 변경</li><li>2D: 평면 보기 방향 · 3D: 입체 보기 방향</li></ul><p class="muted">실제 기능은 모듈 계약을 통해 별도 단계에서 연결합니다.</p>';
  } else {
    const intro=document.createElement('p');intro.className='drawer-intro';intro.textContent='각 데이터와 기능은 독립 모듈로 연결합니다. 이번 MVP에서는 연결 인터페이스만 준비했습니다.';content.append(intro);
    for(const module of modules.list()) { const row=document.createElement('article');row.className='module-card';const heading=document.createElement('h3');heading.textContent=module.name;const badge=document.createElement('span');badge.className='module-status';badge.textContent='미연결';const description=document.createElement('p');description.textContent=module.description;row.append(heading,badge,description);content.append(row); }
    const note=document.createElement('div');note.className='info-box';note.textContent='외부 모델 연결 시 출처·버전·단위·좌표계와 변환 정보를 명시해야 합니다. 기존 GA 좌표나 전역 선박 치수를 가져오지 않습니다.';content.append(note);
  }
  $('#close-drawer').focus();
}
function closeDrawer() { if($('#drawer').hidden)return;$('#drawer').hidden=true;$('#modules-button').setAttribute('aria-expanded','false');drawerOpener?.focus(); }
const modeWorkspace=createModeWorkspace({getMode:()=>ui.get().mode,onModeChange:mode=>setMode(mode),openSettings:opener=>showDrawer('modules',opener)});
function update(state) {
  const mode=modes[state.mode]; $('#mode-heading').textContent=mode.title;$('#mode-kicker').textContent=mode.kicker;$('#mode-description').textContent=mode.description;
  document.querySelectorAll('[data-mode]').forEach(el=>{if(el.dataset.mode===state.mode)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===state.category)));
  document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===state.view)));
  $('#rotate-view').setAttribute('aria-pressed',String(state.rotating)); $('#view-caption').textContent=`${state.view.toUpperCase()} 뷰포트`;
  modeWorkspace.render();
}
ui.subscribe(update);update(ui.get());
function setMode(mode, writeHash=true) { ui.set({mode});$('#search-results').hidden=true;if(writeHash)history.replaceState(null,'',`#${mode}`); }
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>setMode(el.dataset.mode));
document.querySelectorAll('[data-category]').forEach(el=>el.onclick=()=>{ui.set({category:el.dataset.category});notify(`${categories[el.dataset.category]} 데이터가 아직 연결되지 않았습니다.`);});
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{ui.set({view:el.dataset.view});viewport.setView(el.dataset.view);});
$('#rotate-view').onclick=()=>{const rotating=!ui.get().rotating;ui.set({rotating});viewport.setRotating(rotating);};
$('#reset-view').onclick=()=>{ui.set({rotating:false});viewport.setRotating(false);viewport.reset();notify('보기 방향을 초기화했습니다.');};
$('#connect-button').onclick=e=>showDrawer('modules',e.currentTarget);$('#modules-button').onclick=e=>$('#drawer').hidden?showDrawer('modules',e.currentTarget):closeDrawer();$('#help-button').onclick=e=>showDrawer('help',e.currentTarget);$('#close-drawer').onclick=closeDrawer;
$('#layers-button').onclick=()=>notify('모델이 연결되면 구조·장비·배관 레이어를 표시합니다.');
$('#search-form').onsubmit=e=>{e.preventDefault();const text=$('#object-search').value.trim();const results=$('#search-results');results.replaceChildren();results.hidden=!text;if(!text)return;const title=document.createElement('strong');title.textContent=`“${text}” 검색`;const message=document.createElement('p');message.textContent='연결된 설계 데이터가 없어 검색할 수 없습니다. 검색 모듈이 연결되면 실제 결과를 표시합니다.';const close=document.createElement('button');close.className='plain-button result-close';close.setAttribute('aria-label','검색 결과 닫기');close.innerHTML=icon('close');close.onclick=()=>{results.hidden=true;$('#object-search').focus();};results.append(title,message,close);};
$('#object-search').oninput=()=>{if(!$('#object-search').value)$('#search-results').hidden=true;};
window.addEventListener('hashchange',()=>{const mode=location.hash.slice(1);if(modes[mode])setMode(mode,false);});
const initialMode=location.hash.slice(1);if(modes[initialMode])setMode(initialMode,false);
document.addEventListener('keydown',e=>{if(document.body.classList.contains('intro-active'))return;if(e.key==='Escape'){closeDrawer();$('#search-results').hidden=true;}if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#object-search').focus();}});
const intro=createIntro({onEnter:()=>{setMode('explore');}});
// A nonmodal drawer keeps the canvas accessible; Escape returns focus to its opener.
window.addEventListener('pagehide',event=>{if(!event.persisted){intro.destroy();viewport.destroy();clearTimeout(toastTimer);}});
