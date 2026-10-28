/** Native WebGL viewport scaffold. Only a UI orientation gizmo is drawn; no design geometry. */
export function createViewport(canvas, { onStatus = () => {} } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) { onStatus('WebGL 미지원 · UI 사용 가능'); return { setView() {},setVisible() {}, setRotating() {}, reset() {}, destroy() {} }; }
  let yaw = .6, pitch = .4, view = '3d', visible=true, rotating = false, animation = 0, last = 0, drag = null, program, buffer;
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function setup() {
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec3 p; attribute vec3 c; uniform mat3 orientation; uniform vec2 size; varying vec3 color; void main(){vec3 q=orientation*p; vec2 anchor=vec2(-1.0+110.0/size.x,-1.0+160.0/size.y); gl_Position=vec4(anchor+q.xy*70.0/size,0.0,1.0); color=c;}');
    const fragment = compile(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec3 color; void main(){gl_FragColor=vec4(color,0.85);}');
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    // Normalized display-space directions only. They carry no physical units or dataset coordinates.
    const points = [0,0,0, .95,.38,.48, 1,0,0, .95,.38,.48, 0,0,0, .35,.85,.78, 0,1,0, .35,.85,.78, 0,0,0, .35,.65,1, 0,0,1, .35,.65,1];
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    onStatus('WebGL 준비 · 모델 없음'); render();
  }
  function render() {
    if (!visible||gl.isContextLost()) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!rect.width || !rect.height) return;
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [attribute, offset] of [['p', 0], ['c', 12]]) { const at = gl.getAttribLocation(program, attribute); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 3, gl.FLOAT, false, 24, offset); }
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'orientation'), false, [cy, sy*sp, -sy*cp, 0, cp, sp, sy, -cy*sp, cy*cp]);
    gl.uniform2f(gl.getUniformLocation(program, 'size'), rect.width, rect.height); gl.drawArrays(gl.LINES, 0, 6);
  }
  function frame(now) { animation = 0; if (!visible||!rotating || document.hidden || gl.isContextLost()) return; yaw += Math.min((now-last)/1000, .05)*.35; last=now; render(); animation=requestAnimationFrame(frame); }
  function setRotating(on) { rotating=on; cancelAnimationFrame(animation); if (on && visible&&!document.hidden) { last=performance.now(); animation=requestAnimationFrame(frame); } }
  const surface = canvas.parentElement;
  function pointerDown(e) { if (e.button !== 0 || e.target !== canvas) return; drag={x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); }
  function pointerMove(e) { if (!drag || view==='2d') return; yaw+=(e.clientX-drag.x)*.008; pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-drag.y)*.008)); drag={x:e.clientX,y:e.clientY}; render(); }
  function pointerUp() { drag=null; }
  function key(e) { if (!visible||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)) return; e.preventDefault(); if(e.key==='Home') reset(); else if(view==='3d'){yaw+=e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));render();} }
  function reset() { yaw=view==='2d'?0:.6; pitch=view==='2d'?Math.PI/2:.4; render(); }
  function lost(e) { e.preventDefault(); cancelAnimationFrame(animation); onStatus('WebGL 연결 중단 · 복구 대기'); }
  function restored() { setup(); setRotating(rotating); }
  function visibility() { setRotating(rotating); }
  canvas.addEventListener('pointerdown',pointerDown); canvas.addEventListener('pointermove',pointerMove); canvas.addEventListener('pointerup',pointerUp); canvas.addEventListener('pointercancel',pointerUp); surface.addEventListener('keydown',key);
  canvas.addEventListener('webglcontextlost',lost); canvas.addEventListener('webglcontextrestored',restored); document.addEventListener('visibilitychange',visibility);
  const observer = new ResizeObserver(render); observer.observe(canvas); setup();
  return {
    setVisible(on){if(visible===on)return;visible=on;drag=null;cancelAnimationFrame(animation);if(on){render();setRotating(rotating);}},
    setView(next) { view=next; reset(); }, setRotating, reset,
    destroy() { cancelAnimationFrame(animation); observer.disconnect(); canvas.removeEventListener('pointerdown',pointerDown); canvas.removeEventListener('pointermove',pointerMove); canvas.removeEventListener('pointerup',pointerUp); canvas.removeEventListener('pointercancel',pointerUp); surface.removeEventListener('keydown',key); canvas.removeEventListener('webglcontextlost',lost); canvas.removeEventListener('webglcontextrestored',restored); document.removeEventListener('visibilitychange',visibility); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
  };
}
