/** Fair presentation surface, inspired by station-loft mesh construction. No design units. */
export function createHullVisual() {
  const sections=[
    [-3.25,.004,.84],[-3.10,.17,.85],[-2.85,.40,.86],[-2.48,.56,.87],
    [-1.94,.625,.87],[-1.10,.64,.87],[1.20,.64,.87],[2.05,.62,.84],
    [2.55,.57,.76],[2.93,.52,.65],[3.14,.50,.59]
  ];
  // Slope-limited Hermite fairing keeps station tangents continuous without overshoot.
  function slope(i,k){if(i===0)return (sections[1][k]-sections[0][k])/(sections[1][0]-sections[0][0]);if(i===sections.length-1)return (sections[i][k]-sections[i-1][k])/(sections[i][0]-sections[i-1][0]);const a=(sections[i][k]-sections[i-1][k])/(sections[i][0]-sections[i-1][0]),b=(sections[i+1][k]-sections[i][k])/(sections[i+1][0]-sections[i][0]);if(a*b<=0)return 0;return Math.sign(a)*Math.min(Math.abs((a+b)/2),3*Math.abs(a),3*Math.abs(b));}
  function section(t){const x=sections[0][0]+(sections.at(-1)[0]-sections[0][0])*t;let i=0;while(i<sections.length-2&&sections[i+1][0]<x)i++;const a=sections[i],b=sections[i+1],dx=b[0]-a[0],u=(x-a[0])/dx,h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;return [x,...[1,2].map(k=>h00*a[k]+h10*dx*slope(i,k)+h01*b[k]+h11*dx*slope(i+1,k))];}
  function sheer(t){return .18+.045*Math.exp(-t*13)+.016*Math.exp(-(1-t)*18);}
  function surface(t,u){const [base,w,d]=section(t),a=u*Math.PI,s=Math.max(0,Math.sin(a)),c=Math.cos(a),bow=Math.exp(-t*18),stern=Math.exp(-(1-t)*23);
    // One continuous shell contains the raked stem AND bulbous forefoot. No separate sphere.
    const rake=bow*(.48*s*s-.71*Math.pow(s,10))-.31*stern*s*s;
    const flare=.92+.08*Math.pow(Math.abs(c),3),bulb=.30*Math.exp(-t*30)*Math.exp(-Math.pow((s-.965)/.12,2));
    const z=Math.sign(c)*(w*flare+bulb)*Math.pow(Math.abs(c),.57);
    return [base+rake,sheer(t)-d*Math.pow(s,.63),z];
  }
  return Object.freeze({surface,section,sheer,longitudinalSegments:192,transverseSegments:48,purpose:'presentation-only'});
}
