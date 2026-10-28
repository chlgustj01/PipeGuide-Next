import { createIntroRenderer } from './renderer.js';
import { icon } from '../icons.js';

/** Landing lifecycle only. It never registers a module or passes artwork to the workspace. */
export function createIntro({ onEnter=()=>{} }={}) {
  const page=document.querySelector('#intro'),canvas=document.querySelector('#intro-canvas'),pause=document.querySelector('#intro-pause'),error=document.querySelector('#intro-error');
  const workspaceSurfaces=[document.querySelector('.header'),document.querySelector('.rail'),document.querySelector('#workspace'),document.querySelector('#drawer')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let playing=!reduced.matches,active=true;
  const renderer=createIntroRenderer(canvas,{onError:message=>{error.textContent=message;error.hidden=!message;}});
  function sync(){pause.setAttribute('aria-pressed',String(playing));pause.setAttribute('aria-label',playing?'선박 회전 일시 정지':'선박 회전 시작');pause.innerHTML=playing?'<span aria-hidden="true">Ⅱ</span>':'<span aria-hidden="true">▶</span>';renderer.setPlaying(playing);}
  function show(){active=true;page.hidden=false;document.body.classList.add('intro-active');workspaceSurfaces.forEach(el=>{el.inert=true;});renderer.reset();renderer.setActive(true);sync();document.querySelector('#explore-ship').focus({preventScroll:true});}
  function enter(){active=false;page.hidden=true;document.body.classList.remove('intro-active');workspaceSurfaces.forEach(el=>{el.inert=false;});renderer.setActive(false);onEnter();document.querySelector('[data-mode="explore"]').focus({preventScroll:true});}
  const enterButton=document.querySelector('#explore-ship');enterButton.onclick=enter;pause.onclick=()=>{playing=!playing;sync();};
  const home=document.createElement('button');home.className='icon-button';home.id='intro-home';home.setAttribute('aria-label','인트로 보기');home.innerHTML=icon('ship');home.onclick=show;document.querySelector('.header-tools').prepend(home);
  const motion=()=>{if(reduced.matches){playing=false;sync();}};reduced.addEventListener('change',motion);
  const escape=e=>{if(active&&e.key==='Escape')enter();};document.addEventListener('keydown',escape);
  show();
  return {destroy(){renderer.destroy();reduced.removeEventListener('change',motion);document.removeEventListener('keydown',escape);home.remove();}};
}
