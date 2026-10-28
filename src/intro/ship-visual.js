import { createHullVisual } from './hull-visual.js';
/** Presentation-only LNG tanker. Dimensionless artwork; never exported as design data. */
export function createShipVisual() {
  const solid=[],wire=[],ambient=[];
  const cyan=[.06,.68,.96],blue=[.04,.22,.38],pink=[1,.06,.78],pale=[.25,.8,1];
  const vertex=(target,p,c)=>target.push(...p,...c);
  const line=(a,b,c=cyan,target=wire)=>{vertex(target,a,c);vertex(target,b,c);};
  const triangle=(a,b,c,color=blue)=>{vertex(solid,a,color);vertex(solid,b,color);vertex(solid,c,color);};
  function box(x,y,z,w,h,d,color=cyan,fill=[.015,.06,.105]) {
    const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[x+v[0]*w/2,y+v[1]*h/2,z+v[2]*d/2]);
    for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])line(p[a],p[b],color);
    for(const [a,b,c,d]of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]]){triangle(p[a],p[b],p[c],fill);triangle(p[a],p[c],p[d],fill);}
  }
  const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,s)=>a.map(v=>v*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
  function pipe(points,r=.025,color=pink) {
    const rings=[];
    for(let i=0;i<points.length;i++) { const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],t=unit(b.map((v,k)=>v-a[k])),u=unit(cross(t,Math.abs(t[1])<.9?[0,1,0]:[0,0,1])),v=cross(t,u);rings.push(Array.from({length:10},(_,j)=>add(points[i],add(mul(u,Math.cos(j/10*Math.PI*2)*r),mul(v,Math.sin(j/10*Math.PI*2)*r))))); }
    for(let i=0;i<rings.length;i++)for(let j=0;j<10;j++){if(i%2===0||i===rings.length-1)line(rings[i][j],rings[i][(j+1)%10],color);if(i){if(j%3===0)line(rings[i-1][j],rings[i][j],color);triangle(rings[i-1][j],rings[i][j],rings[i][(j+1)%10],mul(color,.13));triangle(rings[i-1][j],rings[i][(j+1)%10],rings[i-1][(j+1)%10],mul(color,.13));}}
  }
  function smooth(points) {
    const result=[];for(let i=0;i<points.length-1;i++)for(let j=0;j<8;j++){const t=j/8,p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];result.push(p1.map((b,k)=>.5*(2*b+(-p0[k]+p2[k])*t+(2*p0[k]-5*b+4*p2[k]-p3[k])*t*t+(-p0[k]+3*b-3*p2[k]+p3[k])*t*t*t)));}result.push(points.at(-1));return result;
  }
  function ellipsoid(center,radii,color=cyan) {
    const p=(i,j)=>[center[0]+radii[0]*Math.sin(i)*Math.cos(j),center[1]+radii[1]*Math.cos(i),center[2]+radii[2]*Math.sin(i)*Math.sin(j)];
    for(let i=0;i<16;i++)for(let j=0;j<28;j++){const a=p(i/16*Math.PI,j/28*Math.PI*2),b=p((i+1)/16*Math.PI,j/28*Math.PI*2),c=p((i+1)/16*Math.PI,(j+1)/28*Math.PI*2),d=p(i/16*Math.PI,(j+1)/28*Math.PI*2);triangle(a,b,c,[.012,.045,.075]);triangle(a,c,d,[.012,.045,.075]);if(i%2===0)line(a,d,mul(color,.65));if(j%2===0)line(a,b,mul(color,.65));}
  }
  const hull=createHullVisual(),nx=hull.longitudinalSegments,ny=hull.transverseSegments;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=hull.surface(i/nx,j/ny),b=hull.surface((i+1)/nx,j/ny),c=hull.surface((i+1)/nx,(j+1)/ny),d=hull.surface(i/nx,(j+1)/ny);const tint=[.012,.046+j/ny*.012,.085+j/ny*.018];triangle(a,b,c,tint);triangle(a,c,d,tint);if(i%3===0)line(a,d,mul(cyan,.40));if(j%3===0)line(a,b,mul(cyan,j===0?1:.60));}
  // Watertight bow and curved transom end caps, all sharing the shell boundary.
  for(const t of [0,1]){const ring=Array.from({length:ny+1},(_,j)=>hull.surface(t,j/ny));const center=ring.reduce((p,v)=>p.map((n,k)=>n+v[k]/ring.length),[0,0,0]);for(let j=0;j<ny;j++){triangle(center,ring[j],ring[j+1],[.012,.05,.09]);if(j%3===0)line(center,ring[j],mul(cyan,.4));}triangle(center,ring[ny],ring[0],[.012,.05,.09]);}
  for(let i=0;i<nx;i++){const a=hull.surface(i/nx,0),b=hull.surface((i+1)/nx,0),c=hull.surface((i+1)/nx,1),d=hull.surface(i/nx,1);triangle(a,b,c,[.016,.065,.10]);triangle(a,c,d,[.016,.065,.10]);for(const sign of [-1,1]){const p=hull.surface(i/nx,sign===1?0:1),q=hull.surface((i+1)/nx,sign===1?0:1);for(const dy of [.02,.095,.16])line([p[0],p[1]+dy,p[2]],[q[0],q[1]+dy,q[2]],mul(pale,.7));if(i%4===0)line(p,[p[0],p[1]+.16,p[2]],pale);}}
  // Sheer strakes and recessed plating seams follow the curved shell instead of box ribs.
  for(const u of [.12,.22,.78,.88])for(let i=0;i<nx;i++)line(hull.surface(i/nx,u),hull.surface((i+1)/nx,u),mul(cyan,.72));
  for(const t of [0,.012,.025,.045])for(let j=28;j<69;j++)line(hull.surface(t,j/96),hull.surface(t,(j+1)/96),mul(pale,.65));
  // Three long LNG deck tank casings and detailed saddles, access hatches and catwalks.
  for(const x of [-1.65,-.25,1.15]) {
    const rings=Array.from({length:25},(_,i)=>[x-.56+i*(1.12/24),.36,0]);pipe(rings,.27,cyan);
    for(const sign of [-1,1])ellipsoid([x+sign*.56,.36,0],[.065,.268,.268],cyan);
    for(const xx of [x-.45,x+.45]){box(xx,.23,0,.10,.13,.68,cyan);for(const sign of [-1,1])box(xx,.47,sign*.32,.14,.13,.12,pink);}
    box(x,.65,0,.58,.07,.30,pale);for(const z of [-.18,.18]){line([x-.50,.75,z],[x+.50,.75,z],pink);for(let dx=-.5;dx<.51;dx+=.1)line([x+dx,.65,z],[x+dx,.75,z],cyan);}
    for(let dx=-.45;dx<.5;dx+=.12)line([x+dx,.29,-.54],[x+dx,.29,.54],mul(cyan,.5));
  }
  for(const sign of [-1,1]) {
    for(let lane=0;lane<4;lane++) { const z=sign*(.39+lane*.042),y=.35+lane*.032;pipe(smooth([[-2.65,.3,z],[-2.3,y,z],[-1.3,y,z],[-1.12,.68,z],[-.8,.68,z],[-.65,y,z],[1.65,y,z],[1.9,.8,z],[2.35,.8,z]]),.016,lane%2?cyan:pink); }
    for(let x=-2.2;x<2.1;x+=.34){box(x,.36,sign*.51,.025,.31,.025,cyan);line([x-.12,.5,sign*.51],[x+.12,.5,sign*.51],pale);}
    pipe(smooth([[-2,.38,sign*.31],[-1.9,.93,sign*.31],[-.3,.93,sign*.31],[.0,.82,sign*.31],[1.6,.82,sign*.31],[1.8,.4,sign*.31]]),.024,pink);
  }
  // Aft accommodation, broad bridge wings, window bands, funnel and antennas.
  box(2.45,.67,0,.65,.95,.69,cyan);for(let y=.28;y<1.17;y+=.16){box(2.45,y,0,.73,.025,.78,cyan);for(const sign of [-1,1]){line([2.1,y+.07,sign*.39],[2.8,y+.07,sign*.39],pink);for(let x=2.2;x<2.76;x+=.13)box(x,y+.07,sign*.352,.05,.04,.009,pink,[.12,.005,.08]);}}
  box(2.36,1.24,0,.87,.17,1.18,pink,[.04,.008,.085]);box(2.36,1.34,0,.94,.045,1.25,pink);for(let z=-.52;z<.55;z+=.09){box(1.92,1.25,z,.009,.08,.065,pale,[.03,.08,.13]);box(2.8,1.25,z,.009,.08,.065,pale,[.03,.08,.13]);}
  for(const sign of [-1,1]){line([2.18,1.08,sign*.34],[2.1,1.24,sign*.59],cyan);line([2.65,1.08,sign*.34],[2.72,1.24,sign*.59],cyan);}
  box(2.8,1.12,-.20,.25,.67,.24,cyan,[.04,.015,.09]);box(2.8,1.47,-.20,.29,.035,.28,pink);for(let y=.9;y<1.45;y+=.05)line([2.67,y,-.326],[2.93,y,-.326],mul(pink,.7));
  for(const sign of [-1,1]){for(let step=0;step<15;step++){const x=2.08+step*.035,y=.27+step*.045;line([x,y,sign*.41],[x+.11,y,sign*.41],pale);}line([2.08,.36,sign*.42],[2.62,1.03,sign*.42],pink);ellipsoid([2.68,.51,sign*.46],[.22,.075,.06],mul(pink,.7));}
  pipe([[2.35,1.36,0],[2.35,1.92,0]],.012,pink);for(const y of [1.52,1.72,1.84]){line([2.35,y,-.16],[2.35,y,.16],pale);line([2.25,y,0],[2.45,y,0],pink);}for(const z of [-.30,.30])pipe([[2.55,1.36,z],[2.55,1.67,z]],.009,cyan);
  ellipsoid([2.1,1.48,.26],[.065,.065,.065],pink);
  // Foremast, triangulated rigging, winches and bow anchors.
  for(const sign of [-1,1]){line([-2.72,.2,sign*.07],[-2.72,1.35,0],pink);line([-3.1,.25,sign*.18],[-2.72,1.25,0],mul(cyan,.55));line([-2.3,.23,sign*.48],[-2.72,1.25,0],mul(cyan,.55));pipe([[-2.98,.24,sign*.15],[-2.98,.30,sign*.15]],.055,cyan);line([-3,.05,sign*.27],[-2.91,-.10,sign*.36],pink);line([-2.91,-.10,sign*.36],[-2.83,-.04,sign*.38],pink);}
  for(let y=.45;y<1.4;y+=.16){line([-2.72,y,-.1],[-2.72,y,.1],pink);box(-2.72,y,0,.10,.01,.24,pink);}
  for(const x of [-1.1,.8])for(const sign of [-1,1]){box(x,.67,sign*.5,.12,.28,.12,cyan);box(x,.84,sign*.5,.16,.04,.16,pale);pipe([[x,.87,sign*.5],[x,1.06,sign*.5]],.016,cyan);}
  // Shaft, four propeller blades, rudder: presentation geometry only.
  pipe([[2.88,-.52,0],[3.29,-.52,0]],.035,pale);ellipsoid([3.30,-.52,0],[.09,.06,.06],pink);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe([[3.31,-.52,0],[3.32,-.52+Math.cos(a+.3)*.20,Math.sin(a+.3)*.20],[3.35,-.52+Math.cos(a+.7)*.24,Math.sin(a+.7)*.24]],.045,pale);}box(3.48,-.45,0,.18,.44,.025,cyan);
  // Static scene dressing: low-contrast floor grid and abstract circuit towers, never model data.
  for(let i=-16;i<=16;i++){line([i*.4,-1.03,-5],[i*.4,-1.03,5],[.025,.12,.18],ambient);line([-6.4,-1.03,i*.32],[6.4,-1.03,i*.32],[.025,.12,.18],ambient);}
  let seed=13;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<40;i++){const x=(random()-.5)*9,z=.9+random()*3.2,h=.08+random()*.5,w=.07+random()*.07,c=[.025,.10,.16];for(const dx of [-w,w])for(const dz of [-w,w]){line([x+dx,-1,z+dz],[x+dx,-1+h,z+dz],c,ambient);line([x-w,-1+h,z+dz],[x+w,-1+h,z+dz],c,ambient);line([x+dx,-1+h,z-w],[x+dx,-1+h,z+w],c,ambient);}}
  return { solid:new Float32Array(solid),wire:new Float32Array(wire),ambient:new Float32Array(ambient),purpose:'presentation-only' };
}
