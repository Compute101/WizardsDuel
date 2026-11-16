// ═══════════════════════════════════════════════════════════════════
//  STAFF GLOW — the living light on a made wizard's staff (Explore's hero).
//  ExploreHero.def gives the hero a `glow`: where the staff's magic sits on the
//  sprite (fractions of its width and height), how big it is, and the element.
//  StaffGlow.draw paints a pulsing halo in the element's colour plus a few
//  particles of that element, with no state: everything comes from the time,
//  so the battle (js/game.js), Explore (js/explore.js) and the creator share it.
//  `boost` above 1 is a flare (casting in battle).
// ═══════════════════════════════════════════════════════════════════
(function(){
const rgb=hex=>{ const n=parseInt(hex.slice(1),16); return [n>>16,(n>>8)&255,n&255]; };
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const hash=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
// per element: particle count, cycle ms, and how a particle moves (life 0→1, seed s) → [dx, dy, size, alpha] in units of R
const PARTS = {
  fire:     {n:6, ms:1400, f:(l,s)=>[Math.sin(l*6+s*9)*0.25+(s-0.5)*0.5, -l*2.4, 0.09*(1-l), Math.sin(l*Math.PI)]},
  ice:      {n:5, ms:2600, f:(l,s)=>[(s-0.5)*1.4+Math.sin(l*4+s*7)*0.2, l*1.8-0.2, 0.07, Math.sin(l*Math.PI)*0.9]},
  lightning:{n:5, ms:420,  f:(l,s)=>{ const a=s*6.283+Math.floor(l*3)*2.1, d=0.5+hash(s*31+Math.floor(l*3))*0.6; return [Math.cos(a)*d, Math.sin(a)*d, 0.06, l<0.4?1:0]; }},
  water:    {n:4, ms:1800, f:(l,s)=>[(s-0.5)*0.9, 0.3+l*l*2.4, 0.07, Math.min(1,(1-l)*2)]},
  arcane:   {n:6, ms:3000, f:(l,s)=>{ const a=l*6.283+s*6.283; return [Math.cos(a)*0.9, Math.sin(a)*0.45, 0.07, 0.6+0.4*Math.sin(l*12+s*5)]; }},
  dark:     {n:5, ms:2400, f:(l,s)=>[Math.sin(l*5+s*8)*0.4+(s-0.5)*0.6, -l*1.8+0.3, 0.14*(0.5+l), Math.sin(l*Math.PI)*0.7]},
  earth:    {n:4, ms:2200, f:(l,s)=>[(s-0.5)*1.2, l*2.2, 0.06, Math.sin(l*Math.PI)*0.8]},
  air:      {n:4, ms:1200, f:(l,s)=>[-1.2+l*2.4, (s-0.5)*1.2+Math.sin(l*6+s*4)*0.15, 0.05, Math.sin(l*Math.PI)*0.8]},
};
function draw(ctx, x, y, R, col, elem, t, boost){
  boost=boost||1;
  const c=rgb(col), hot=mix(c,[255,255,255],0.55);
  const pulse=(0.78+0.22*Math.sin(t/650))*(0.9+0.1*Math.sin(t/97)*Math.sin(t/61));   // a slow breath and a little flicker
  const k=Math.min(1,pulse*boost);
  const r=R*(1+0.12*Math.sin(t/650))*(boost>1?1+0.6*(boost-1):1);
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  let g=ctx.createRadialGradient(x,y,0,x,y,r*3.4);
  g.addColorStop(0,`rgba(${c},${0.5*k})`); g.addColorStop(0.35,`rgba(${c},${0.2*k})`); g.addColorStop(1,`rgba(${c},0)`);
  ctx.fillStyle=g; ctx.fillRect(x-r*3.4,y-r*3.4,r*6.8,r*6.8);
  g=ctx.createRadialGradient(x,y,0,x,y,r*1.1);
  g.addColorStop(0,`rgba(${hot},${0.6*k})`); g.addColorStop(1,`rgba(${c},0)`);
  ctx.fillStyle=g; ctx.fillRect(x-r*1.1,y-r*1.1,r*2.2,r*2.2);
  const P=PARTS[elem]||PARTS.arcane;
  if(elem==='dark') ctx.globalCompositeOperation='source-over';
  for(let i=0;i<P.n;i++){
    const s=hash(i+1), cyc=t/P.ms+i/P.n, l=cyc%1, s2=hash(i+Math.floor(cyc)*7.3);
    const [dx,dy,sz,a]=P.f(l,s2);
    if(a<=0.02) continue;
    const px=x+dx*R*1.6, py=y+dy*R*1.6, pr=Math.max(1,sz*R*1.6);
    if(elem==='air'){ ctx.strokeStyle=`rgba(${hot},${0.5*a})`; ctx.lineWidth=Math.max(1,pr*0.6); ctx.beginPath(); ctx.moveTo(px-pr*4,py); ctx.lineTo(px,py); ctx.stroke(); continue; }
    const pc=elem==='dark'?'40,10,60':elem==='earth'?mix(c,[90,60,30],0.4):hot;
    const pg=ctx.createRadialGradient(px,py,0,px,py,pr*2);
    pg.addColorStop(0,`rgba(${pc},${(elem==='dark'?0.35:0.9)*a})`); pg.addColorStop(1,`rgba(${pc},0)`);
    ctx.fillStyle=pg; ctx.fillRect(px-pr*2,py-pr*2,pr*4,pr*4);
  }
  ctx.restore();
}
window.StaffGlow={draw, rgb};
})();
