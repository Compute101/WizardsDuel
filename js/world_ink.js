// ═══ WORLD INK ═══════════════════════════════════════════════════════
// The world map drawn in the manner of an old hand-inked chart (Thror's Map, the Shire maps):
// mountain ranges hatched on their shadow side, woods as massed tree-crowns, ripple lines along the
// coast, wobbly hand-drawn rivers, spaced capitals for regions, red ink for danger, a rune border of
// the Arcana glyphs, a title cartouche, a compass rose, a scale in leagues, and moon-letters that show
// only by night. Everything that never changes is drawn once into a cached canvas (`base`); names and
// the moon-letters are drawn every frame (fonts may arrive late, and the moon-letters fade with the clock).
// Data: maps/world.json `features` (ranges, zones, rivers, sea, labels, ruins, title, compass, scale, moon).
const WorldInk=(()=>{
const LEAF='rgba(95,115,50,0.17)', INK='#3b2a14', RED='#8e1f14', WATER='#3f6488';
let PAPER='#dcc898';   // while the base is built, a pattern of the parchment itself, so symbols hide what's behind them seamlessly
const FELL='"IM Fell English", Georgia, serif', FELL_SC='"IM Fell English SC", "IM Fell English", Georgia, serif';
const GLYPHS='ϟΔ∇ΨΩ∞☽✸⊕⊗θΦ', HALO='rgba(228,212,168,0.85)';
let halo=true;   // letters get a paper halo so they read over woods and hatching
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const hashStr=s=>{ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };

// ── lines ──
// a Catmull-Rom curve through the points, sampled about every `step` units
function smooth(pts,step=6){
  if(pts.length<3) return densify(pts,step);
  const out=[], P=i=>pts[Math.max(0,Math.min(pts.length-1,i))];
  for(let i=0;i<pts.length-1;i++){
    const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2), n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
    for(let k=0;k<n;k++){ const t=k/n, t2=t*t, t3=t2*t;
      out.push([0,1].map(j=>0.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3))); }
  }
  out.push(pts[pts.length-1]); return out;
}
function densify(pts,step){
  const out=[];
  for(let i=0;i<pts.length-1;i++){ const [ax,ay]=pts[i],[bx,by]=pts[i+1], n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/step));
    for(let k=0;k<n;k++) out.push([ax+(bx-ax)*k/n, ay+(by-ay)*k/n]); }
  out.push(pts[pts.length-1]); return out;
}
// a pen's wobble: each point nudged sideways by a smooth seeded wave (two sines), ends kept still
function wobble(pts,seed,amt=1.6){
  const r=rng(seed), f1=0.03+r()*0.03, f2=0.11+r()*0.08, a1=r()*6.3, a2=r()*6.3;
  let s=0; return pts.map((p,i)=>{
    if(i) s+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);
    const q=pts[Math.min(pts.length-1,i+1)], o=pts[Math.max(0,i-1)], dx=q[0]-o[0], dy=q[1]-o[1], L=Math.hypot(dx,dy)||1;
    const end=Math.min(1,i/3,(pts.length-1-i)/3), w=amt*end*(0.65*Math.sin(s*f1+a1)+0.35*Math.sin(s*f2+a2));
    return [p[0]-dy/L*w, p[1]+dx/L*w];
  });
}
function path(g,pts){ g.beginPath(); pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); }
function inPoly(x,y,poly){ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) c=!c; } return c; }

// ── lettering ──
// text laid along a polyline, a letter at a time (so it can curve and be spaced: canvas letterSpacing
// isn't everywhere yet). `sp` is extra space between letters, in units.
function textAlong(g,text,pts,sp=0,upto=Infinity){
  const line=densify(pts,2), seg=[]; let total=0;
  for(let i=1;i<line.length;i++){ const d=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]); seg.push(d); total+=d; }
  const ws=[...text].map(c=>g.measureText(c).width), tw=ws.reduce((a,b)=>a+b,0)+sp*(ws.length-1);
  let at=(total-tw)/2, i=0, run=0;
  const pointAt=d=>{ while(i<seg.length-1&&run+seg[i]<d){ run+=seg[i]; i++; } const t=seg[i]?(d-run)/seg[i]:0, a=line[i], b=line[i+1]||a;
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, Math.atan2(b[1]-a[1],b[0]-a[0])]; };
  const al=g.textAlign; g.textAlign='center';
  [...text].forEach((c,k)=>{ if(k>=upto) return; const [x,y,ang]=pointAt(Math.max(0,at+ws[k]/2)); g.save(); g.translate(x,y); g.rotate(ang);
    if(halo){ g.strokeStyle=HALO; g.lineWidth=3.2; g.lineJoin='round'; g.strokeText(c,0,0); } g.fillText(c,0,0); g.restore(); at+=ws[k]+sp; });
  g.textAlign=al;
}
// a straight label centred on x,y, turned by rot degrees, letters spaced
function spaced(g,text,x,y,sp=0,rot=0,upto){
  const a=rot*Math.PI/180, w=[...text].reduce((s,c)=>s+g.measureText(c).width,0)+sp*([...text].length-1), c=Math.cos(a)*w/2, s=Math.sin(a)*w/2;
  textAlong(g,text,[[x-c,y-s],[x+c,y+s]],sp,upto);
}
const LABEL={
  region:{font:s=>`${s||19}px ${FELL_SC}`, col:'rgba(59,42,20,0.82)', sp:0.42, caps:true},
  danger:{font:s=>`${s||19}px ${FELL_SC}`, col:RED, sp:0.42, caps:true},
  sea:   {font:s=>`${s||22}px ${FELL_SC}`, col:'rgba(40,66,92,0.8)', sp:0.5, caps:true},
  river: {font:s=>`italic ${s||14}px ${FELL}`, col:'rgba(48,80,112,0.92)', sp:0.08},
  note:  {font:s=>`italic ${s||13}px ${FELL}`, col:'rgba(59,42,20,0.78)', sp:0},
  rednote:{font:s=>`italic ${s||13}px ${FELL}`, col:'rgba(142,31,20,0.88)', sp:0},
};
// a label: [text, x, y, rot] (old form: a region), or {text, x, y, rot, style, size, path}
function label(g,L){
  if(Array.isArray(L)) L={text:L[0],x:L[1],y:L[2],rot:L[3]};
  const st=LABEL[L.style||'region']||LABEL.region, size=L.size;
  g.font=st.font(size); g.fillStyle=st.col; g.textBaseline='middle';
  const fs=parseFloat(g.font)||16, sp=st.sp*fs, txt=st.caps?L.text.toUpperCase():L.text;
  if(L.path){ textAlong(g,txt,L.path,sp); }
  else { const lines=txt.split('\n'); lines.forEach((ln,i)=>spaced(g,ln,L.x,L.y+(i-(lines.length-1)/2)*fs*1.15,sp,L.rot||0,L.upto)); }
  g.textBaseline='alphabetic';
}

// ── the land's symbols ──
function crown(g,x,y,k){   // one tree-top of a massed wood: three lobes over a flat-ish foot, a trunk tick under it
  const r=5.2*k;
  g.beginPath(); g.moveTo(x,y+r*0.55); g.lineTo(x,y+r*1.35); g.stroke();
  g.beginPath(); g.moveTo(x-r*1.05,y+r*0.6);
  g.arc(x-r*0.55,y+r*0.05,r*0.62,Math.PI*0.85,Math.PI*1.55);
  g.arc(x,y-r*0.35,r*0.7,Math.PI*1.2,Math.PI*1.8);
  g.arc(x+r*0.55,y+r*0.05,r*0.62,Math.PI*1.45,Math.PI*0.15);
  g.quadraticCurveTo(x,y+r*0.85,x-r*1.05,y+r*0.6);
  g.fillStyle=PAPER; g.fill(); g.fillStyle=LEAF; g.fill(); g.stroke();
}
function lone(g,x,y,k){   // a lone tree in open country
  const r=4*k; g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+r*1.9); g.stroke();
  g.beginPath(); g.arc(x,y-r*0.2,r,0,Math.PI*2); g.fillStyle=PAPER; g.fill(); g.fillStyle=LEAF; g.fill(); g.stroke();
}
function hill(g,x,y,k,r){   // a foothill: a hump, shaded on its east side
  const w=13*k, h=7*k;
  g.beginPath(); g.moveTo(x-w,y); g.bezierCurveTo(x-w*0.6,y-h*1.3,x+w*0.5,y-h*1.3,x+w,y); g.fillStyle=PAPER; g.fill();
  g.stroke();
  g.save(); g.globalAlpha*=0.6; g.lineWidth=0.7;
  for(let i=0;i<3;i++){ const hx=x+w*(0.2+i*0.22); g.beginPath(); g.moveTo(hx,y-h*(0.75-i*0.22)); g.lineTo(hx-1.5,y-0.5); g.stroke(); }
  g.restore();
}
function tuft(g,x,y,k){ g.beginPath(); for(let i=-1;i<=1;i++){ g.moveTo(x+i*2.6*k,y); g.lineTo(x+i*4*k,y-6*k); } g.stroke(); }
function marsh(g,x,y,k,r){   // marsh: stacked dashes with a reed tuft
  g.beginPath(); for(let i=0;i<3;i++){ const w=(9-i*2.5)*k, ox=(r()-0.5)*3; g.moveTo(x-w+ox,y+i*3*k); g.lineTo(x+w+ox,y+i*3*k); } g.stroke();
  g.save(); g.lineWidth=0.8; tuft(g,x,y-1,k*0.8); g.restore();
}
function peak(g,x,y,H,r){   // one mountain: ridges up to a summit, the east face hatched, its foot open
  const W=H*(0.78+r()*0.25), sx=x+(r()-0.5)*W*0.3, sy=y-H;
  const ls=[x-W*(0.45+r()*0.1), y-H*(0.45+r()*0.2)], rs=[x+W*(0.38+r()*0.12), y-H*(0.42+r()*0.2)], div=[sx+W*(0.12+r()*0.16), y];
  const outline=[[x-W,y],ls,[sx,sy],rs,[x+W,y]];
  g.fillStyle=PAPER; path(g,outline); g.closePath(); g.fill();
  g.save(); path(g,[[sx,sy],rs,[x+W,y],div]); g.closePath(); g.clip();
  g.lineWidth=0.75; g.globalAlpha*=0.7; g.beginPath();
  for(let hx=sx+1.6;hx<x+W;hx+=2.4){ g.moveTo(hx,sy-2); g.lineTo(hx-H*0.12,y+1); }
  g.stroke(); g.restore();
  g.lineWidth=1.35; path(g,outline); g.stroke();
  g.lineWidth=0.9; g.beginPath(); g.moveTo(sx,sy); g.quadraticCurveTo((sx+div[0])/2+2,(sy+y)/2,div[0],y-H*0.12); g.stroke();
  if(H>26&&r()<0.6){ g.lineWidth=0.8; g.beginPath(); g.moveTo(sx-W*0.18,sy+H*0.2); g.lineTo(sx-W*0.05,sy+H*0.1); g.lineTo(sx+W*0.06,sy+H*0.22); g.stroke(); }   // a snow line
}
function ruin(g,x,y){   // a broken tower
  g.fillStyle=PAPER; g.lineWidth=1.2;
  g.beginPath(); g.moveTo(x-5,y+6); g.lineTo(x-5,y-8); g.lineTo(x-2,y-6); g.lineTo(x,y-10); g.lineTo(x+2,y-4); g.lineTo(x+5,y-5); g.lineTo(x+5,y+6); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x-1.2,y-1); g.lineTo(x-1.2,y+2.5); g.moveTo(x+7,y+6); g.lineTo(x+9,y+4); g.lineTo(x+11,y+6); g.stroke();
}
function rose(g,x,y,R){   // the compass rose (its N is lettered with the labels)
  g.lineWidth=1; g.strokeStyle=INK;
  g.beginPath(); g.arc(x,y,R*0.78,0,Math.PI*2); g.stroke(); g.beginPath(); g.arc(x,y,R*0.7,0,Math.PI*2); g.stroke();
  for(let i=0;i<32;i++){ const a=i/32*Math.PI*2, r0=R*0.7, r1=R*(i%4?0.74:0.78); g.beginPath(); g.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0); g.lineTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1); g.stroke(); }
  const point=(a,len,wid)=>{ const tip=[x+Math.cos(a)*len,y+Math.sin(a)*len], l=[x+Math.cos(a-Math.PI/2)*wid,y+Math.sin(a-Math.PI/2)*wid], rr=[x+Math.cos(a+Math.PI/2)*wid,y+Math.sin(a+Math.PI/2)*wid];
    g.fillStyle=PAPER; path(g,[[x,y],l,tip,rr]); g.closePath(); g.fill();
    g.fillStyle=INK; path(g,[[x,y],tip,rr]); g.closePath(); g.fill();
    path(g,[[x,y],l,tip,rr]); g.closePath(); g.stroke(); };
  for(let i=0;i<4;i++) point(Math.PI/4+i*Math.PI/2,R*0.55,R*0.1);
  for(let i=0;i<4;i++) point(-Math.PI/2+i*Math.PI/2,i?R*0.95:R*1.1,R*0.15);
  g.beginPath(); g.arc(x,y,R*0.07,0,Math.PI*2); g.fillStyle=PAPER; g.fill(); g.stroke();
}

// ── the cached base ──
function coastOf(sea,W){   // the sea polygon's land-side edge, in order (the points not out past the parchment)
  const n=sea.length, out=sea.map(p=>p[0]>=W);
  let start=out.lastIndexOf(true); if(start<0) return sea.slice();
  const c=[]; for(let k=1;k<=n;k++){ const i=(start+k)%n; if(!out[i]) c.push(sea[i]); } return c;
}
function buildBase(world,scale){
  const W=world.w||1000, H=world.h||700, F=world.features||{};
  const cv=document.createElement('canvas'); cv.width=Math.round(W*scale); cv.height=Math.round(H*scale);
  const pc=document.createElement('canvas'); pc.width=cv.width; pc.height=cv.height;
  let g=pc.getContext('2d'); g.scale(scale,scale);
  const r=rng(77), R=Math.max(W,H);
  // parchment: a warm wash, specks, foxing, two folds and a burnt edge
  const bg=g.createRadialGradient(W/2,H/2,80,W/2,H/2,R*0.62);
  bg.addColorStop(0,'#e6d6ab'); bg.addColorStop(0.72,'#d3bb87'); bg.addColorStop(1,'#a38656');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.fillStyle='rgba(90,60,30,0.08)'; for(let i=0;i<1600;i++) g.fillRect(r()*W,r()*H,1+r()*2,1+r()*2);
  for(let i=0;i<26;i++){ const x=r()*W, y=r()*H, rad=10+r()*55, s=g.createRadialGradient(x,y,0,x,y,rad);
    s.addColorStop(0,`rgba(120,80,35,${0.05+r()*0.07})`); s.addColorStop(0.7,`rgba(120,80,35,${0.03})`); s.addColorStop(1,'rgba(120,80,35,0)'); g.fillStyle=s; g.fillRect(x-rad,y-rad,rad*2,rad*2); }
  for(const [x0,y0,x1,y1] of [[W*0.5,0,W*0.5,H],[0,H*0.5,W,H*0.5]]){
    g.strokeStyle='rgba(255,248,225,0.35)'; g.lineWidth=2; g.beginPath(); g.moveTo(x0+1,y0+1); g.lineTo(x1+1,y1+1); g.stroke();
    g.strokeStyle='rgba(90,60,30,0.14)'; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); }
  // a plain copy of the parchment at map scale, darkened at the edge like the base: what fog is painted with
  paperLow=document.createElement('canvas'); paperLow.width=W; paperLow.height=H;
  { const q=paperLow.getContext('2d'); q.drawImage(pc,0,0,W,H); const e=q.createRadialGradient(W/2,H/2,R*0.36,W/2,H/2,R*0.66);
    e.addColorStop(0,'rgba(70,40,15,0)'); e.addColorStop(1,'rgba(70,40,15,0.42)'); q.fillStyle=e; q.fillRect(0,0,W,H); }
  const main=cv.getContext('2d'); main.drawImage(pc,0,0);
  const pat=main.createPattern(pc,'no-repeat'); if(pat.setTransform) pat.setTransform(new DOMMatrix([1/scale,0,0,1/scale,0,0])); PAPER=pat;
  g=main; g.scale(scale,scale); g.lineCap='round'; g.lineJoin='round';
  const locs=world.locations||[], wound=locs.find(l=>l.kind==='city')||{x:-999,y:-999};
  const sea=F.sea||null, onSea=(x,y)=>sea&&inPoly(x,y,sea);
  const clear=(x,y,rad)=>!locs.some(l=>Math.hypot(l.x-x,l.y-y)<rad)&&Math.hypot(x-wound.x,y-wound.y)>=130&&!onSea(x,y);
  // the sea: a pale wash, the coast inked, ripple lines following it out
  if(sea){
    const coast=wobble(smooth(coastOf(sea,W),5),11,2.4), poly=coast.concat([[W+20,coast[coast.length-1][1]],[W+20,coast[0][1]]]);
    g.fillStyle='rgba(95,130,145,0.22)'; path(g,poly); g.closePath(); g.fill();
    g.save(); path(g,poly); g.closePath(); g.clip(); g.strokeStyle='rgba(40,66,92,0.55)';
    [5,11,19,30].forEach((d,i)=>{ g.lineWidth=1-i*0.15; g.globalAlpha=1-i*0.2; path(g,wobble(coast.map(([x,y])=>[x+d,y]),31+i,1.2+i*0.6)); g.stroke(); });
    g.restore(); g.strokeStyle=INK; g.lineWidth=1.8; path(g,coast); g.stroke();
  }
  // woods: a green wash under each, then crowns packed back to front
  const zones=F.zones||[], inZone=(x,y)=>zones.some(z=>((x-z.x)/z.rx)**2+((y-z.y)/z.ry)**2<1)||(F.ranges||[]).some(rg=>rg.spine.some(([sx,sy])=>Math.hypot(x-sx,y-sy)<(rg.h||30)*1.3));
  const syms=[], zr=rng(91);
  for(const z of zones){
    if(z.t==='wood'){
      const wash=g.createRadialGradient(z.x,z.y,0,z.x,z.y,Math.max(z.rx,z.ry));
      wash.addColorStop(0,'rgba(85,105,45,0.16)'); wash.addColorStop(1,'rgba(85,105,45,0)'); g.save(); g.translate(z.x,z.y); g.scale(z.rx/Math.max(z.rx,z.ry),z.ry/Math.max(z.rx,z.ry)); g.translate(-z.x,-z.y); g.fillStyle=wash; g.fillRect(z.x-z.rx*2,z.y-z.ry*2,z.rx*4,z.ry*4); g.restore();
      const gap=z.gap||11, ph=[zr()*6.3,zr()*6.3,zr()*6.3];
      for(let yy=z.y-z.ry, row=0; yy<z.y+z.ry; yy+=gap*0.72, row++) for(let xx=z.x-z.rx+(row%2)*gap/2; xx<z.x+z.rx; xx+=gap){
        const x=xx+(zr()-0.5)*gap*0.5, y=yy+(zr()-0.5)*gap*0.4, e=((x-z.x)/z.rx)**2+((y-z.y)/z.ry)**2, ang=Math.atan2((y-z.y)/z.ry,(x-z.x)/z.rx);
        const edge=1+0.16*Math.sin(ang*3+ph[0])+0.1*Math.sin(ang*5+ph[1])+0.06*Math.sin(ang*9+ph[2]);   // a ragged, not oval, edge
        if(e>edge*edge*(1-zr()*0.12)||!clear(x,y,30)) continue; syms.push(['crown',x,y,0.85+zr()*0.35]); }
    } else for(let i=0,tries=0;i<z.n&&tries<z.n*6;tries++){
      const a=zr()*Math.PI*2, q=Math.sqrt(zr()), x=z.x+Math.cos(a)*z.rx*q, y=z.y+Math.sin(a)*z.ry*q;
      if(x<0||x>W||y<0||y>H||!clear(x,y,z.t==='tree'?34:42)) continue; syms.push([z.t,x,y,0.8+zr()*0.5]); i++; }
  }
  // mountain ranges: peaks along a spine, biggest in the middle, two staggered rows
  for(const rg of F.ranges||[]){
    const line=densify(smooth(rg.spine,8),rg.gap||15), pr=rng(hashStr(rg.name||'range'));
    const band=rg.band||20;
    line.forEach(([x,y],i)=>{ const t=i/(line.length-1), k=0.3+0.7*Math.pow(Math.sin(Math.PI*t),0.7), n=pr()<0.2?1:pr()<0.6?2:3;
      for(let j=0;j<n;j++){ const off=(pr()-0.5)*band*(0.6+k*0.8), px=x+(pr()-0.5)*14, py=y+off;
        // peaks toward the front of the range are lower, the high ones stand behind
        const H=(rg.h||34)*k*(0.45+pr()*0.7)*(1-0.35*off/band);
        if(!clear(px,py,40)) continue; syms.push(['peak',px,py,H]); } });
  }
  // and a sprinkling of lone trees and hills over the open country
  for(let i=0;i<130;i++){ const x=r()*W, y=r()*H; if(inZone(x,y)||!clear(x,y,45)) continue; syms.push([r()<0.65?'tree':'hill',x,y,0.9]); }
  syms.sort((a,b)=>a[2]-b[2]);
  g.strokeStyle=INK; g.lineWidth=1;
  const sr=rng(5);
  for(const [t,x,y,k] of syms){
    g.strokeStyle=INK; g.lineWidth=1;
    if(t==='peak') peak(g,x,y,k,sr);
    else if(t==='crown'){ crown(g,x,y,k); }
    else if(t==='tree'){ lone(g,x,y,k); }
    else if(t==='hill') hill(g,x,y,k,sr);
    else if(t==='marsh') marsh(g,x,y,k,sr);
    else { g.lineWidth=0.9; tuft(g,x,y,k); }
  }
  for(const [x,y] of F.ruins||[]) ruin(g,x,y);
  // rivers: side streams, then the Hollow, thin at its spring and widening downstream
  const river=(pts,seed,w0,w1,col)=>{ const line=wobble(wobble(smooth(pts,4),seed,6),seed+9,1.1); g.strokeStyle=col;
    for(let i=1;i<line.length;i++){ g.lineWidth=w0+(w1-w0)*i/line.length; g.beginPath(); g.moveTo(...line[i-1]); g.lineTo(...line[i]); g.stroke(); } };
  (F.rivers||[]).forEach((rv,i)=>river(rv,200+i,0.9,2.2,WATER));
  if(world.river){ river(world.river,199,1,4.6,WATER); const [sx,sy]=world.river[0]; g.fillStyle=WATER; g.beginPath(); g.arc(sx,sy,2.6,0,Math.PI*2); g.fill(); }
  // the frame: two rules with the Arcana glyphs running round between them, a star in each corner
  const i0=10, i1=28, mid=(i0+i1)/2;
  g.strokeStyle=INK; g.lineWidth=2; g.strokeRect(i0,i0,W-i0*2,H-i0*2); g.lineWidth=1; g.strokeRect(i1,i1,W-i1*2,H-i1*2);
  g.fillStyle='rgba(225,210,170,0.5)';
  g.fillRect(i0+1,i0+1,W-i0*2-2,i1-i0-2); g.fillRect(i0+1,H-i1+1,W-i0*2-2,i1-i0-2); g.fillRect(i0+1,i1,i1-i0-2,H-i1*2); g.fillRect(W-i1+1,i1,i1-i0-2,H-i1*2);
  g.fillStyle=INK; g.font='12px Georgia, "Times New Roman", serif'; g.textAlign='center'; g.textBaseline='middle';
  let gi=0; const run=(x0,y0,x1,y1)=>{ const L=Math.hypot(x1-x0,y1-y0), n=Math.floor(L/30);
    for(let k=1;k<n;k++){ const t=k/n; g.fillText(GLYPHS[gi++%12],x0+(x1-x0)*t,y0+(y1-y0)*t); } };
  run(i1,mid,W-i1,mid); run(W-mid,i1,W-mid,H-i1); run(W-i1,H-mid,i1,H-mid); run(mid,H-i1,mid,i1);
  for(const [cx,cy] of [[mid,mid],[W-mid,mid],[W-mid,H-mid],[mid,H-mid]]) g.fillText('✸',cx,cy);
  g.textBaseline='alphabetic';
  // the title cartouche: a scroll with curled ends
  const T=F.title;
  if(T){ const {x,y,w,h}=T;
    g.fillStyle='#e9dcb5'; g.strokeStyle=INK; g.lineWidth=1.4;
    g.beginPath(); g.moveTo(x+12,y); g.lineTo(x+w-12,y); g.quadraticCurveTo(x+w,y,x+w,y+12); g.lineTo(x+w,y+h-12); g.quadraticCurveTo(x+w,y+h,x+w-12,y+h); g.lineTo(x+12,y+h); g.quadraticCurveTo(x,y+h,x,y+h-12); g.lineTo(x,y+12); g.quadraticCurveTo(x,y,x+12,y); g.fill(); g.stroke();
    g.lineWidth=0.7; g.strokeRect(x+6,y+6,w-12,h-12);
    for(const [cx,dir] of [[x,-1],[x+w,1]]){ g.beginPath(); g.ellipse(cx,y+h/2,7,h/2-4,0,0,Math.PI*2); g.fillStyle='#d9c896'; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(cx+dir*1.5,y+h/2,3,h/2-12,0,0,Math.PI*2); g.stroke(); }
  }
  if(F.compass){ const [cx,cy,cr]=F.compass; rose(g,cx,cy,cr||40); }
  // the scale: a bar in leagues (a league is an hour's walk, WORLD_SPEED units)
  const S=F.scale;
  if(S){ const {x,y,league,n}=S, seg=league*(n/ (S.marks||5));
    for(let i=0;i<(S.marks||5);i++){ g.fillStyle=i%2?PAPER:INK; g.fillRect(x+i*seg,y,seg,4); }
    g.strokeStyle=INK; g.lineWidth=1; g.strokeRect(x,y,league*n,4); }
  // the edge darkens, as old paper does
  const edge=g.createRadialGradient(W/2,H/2,R*0.36,W/2,H/2,R*0.66);
  edge.addColorStop(0,'rgba(70,40,15,0)'); edge.addColorStop(1,'rgba(70,40,15,0.42)'); g.fillStyle=edge; g.fillRect(0,0,W,H);
  PAPER='#dcc898'; return cv;
}
let base=null, baseScale=0, baseFor=null, paperLow=null;

// ── the unfinished map ──
// Country far from anywhere you know is only pencilled in: fog is the plain parchment laid back over the
// inked land, up to FOG thick. A hole is {x, y, r}: clear within 45% of r, fading out to r. The frame, the
// cartouche, the compass and the scale are never fogged, nor the mountains (seen from anywhere).
const FOG=0.8;
function holeAt(h,x,y){ if(Math.abs(x-h.x)>=h.r||Math.abs(y-h.y)>=h.r) return 0; const d=Math.hypot(x-h.x,y-h.y)/h.r; if(d<=0.45) return 1; if(d>=1) return 0; const u=(d-0.45)/0.55; return 1-u*u*(3-2*u); }
function furniture(world,x,y){
  const F=world.features||{}, W=world.w||1000, H=world.h||700;
  if(x<30||y<30||x>W-30||y>H-30) return true;
  const T=F.title; if(T&&x>T.x-14&&x<T.x+T.w+14&&y>T.y-6&&y<T.y+T.h+6) return true;
  if(F.compass){ const [cx,cy,cr]=F.compass; if(Math.hypot(x-cx,y-cy)<(cr||40)*1.6) return true; }
  const S=F.scale; if(S&&x>S.x-14&&x<S.x+S.league*S.n+14&&y>S.y-22&&y<S.y+26) return true;
  return false;
}
function fogAt(world,holes,x,y){
  if(furniture(world,x,y)) return 0;
  let clear=1; for(const h of holes){ clear*=1-holeAt(h,x,y); if(clear<=0) return 0; }
  return FOG*clear;
}
// the holes every map has: along the mountain ranges
let fixedFor=null, fixedList=null;
function fixedHoles(world){ if(fixedFor===world) return fixedList; const out=[]; fixedFor=world; fixedList=out; for(const rg of (world.features||{}).ranges||[]) for(const [x,y] of densify(rg.spine,50)) out.push({x,y:y+20,r:230}); return out; }
const fogCv={mask:null, comp:null, key:''};
function drawFog(g,world,holes,key){
  const W=world.w||1000, H=world.h||700;
  if(!paperLow) return;
  if(fogCv.key!==key){
    // a coarse mask (the holes are wide and soft): what the mountains and furniture leave is worked out once
    const K=8, MW=Math.ceil(W/K), MH=Math.ceil(H/K);
    if(!fogCv.mask){ fogCv.mask=document.createElement('canvas'); fogCv.comp=document.createElement('canvas'); }
    if(fogCv.fixedFor!==world){ const fx=new Float32Array(MW*MH), fh=fixedHoles(world);
      for(let j=0;j<MH;j++) for(let i=0;i<MW;i++) fx[j*MW+i]=fogAt(world,fh,i*K+K/2,j*K+K/2)/FOG;
      fogCv.fixed=fx; fogCv.fixedFor=world; }
    const m=fogCv.mask; m.width=MW; m.height=MH; const mg=m.getContext('2d'), img=mg.createImageData(MW,MH), fx=fogCv.fixed;
    for(let j=0;j<MH;j++) for(let i=0;i<MW;i++){ let c=fx[j*MW+i]; const x=i*K+K/2, y=j*K+K/2;
      for(let h=0;h<holes.length&&c>0;h++) c*=1-holeAt(holes[h],x,y);
      img.data[(j*MW+i)*4+3]=Math.round(255*FOG*c); }
    mg.putImageData(img,0,0);
    const c=fogCv.comp; c.width=W; c.height=H; const cg=c.getContext('2d');
    cg.drawImage(paperLow,0,0); cg.globalCompositeOperation='destination-in'; cg.imageSmoothingEnabled=true; cg.drawImage(m,0,0,W,H); cg.globalCompositeOperation='source-over';
    fogCv.key=key;
  }
  g.drawImage(fogCv.comp,0,0,W,H);
}
function drawBase(g,world,need){   // need: device px per map unit; rebuilt sharper when it's wanted (capped for phones' memory)
  const s=Math.min(2.5,Math.max(1,Math.ceil(need*2)/2));
  if(!base||baseFor!==world||s>baseScale){ base=buildBase(world,s); baseScale=s; baseFor=world; }
  g.drawImage(base,0,0,world.w||1000,world.h||700);
}

// ── drawn every frame ──
function drawLetters(g,world,holes){
  const F=world.features||{}, all=holes?holes.concat(fixedHoles(world)):null;
  for(const L of F.labels||[]){
    const at=Array.isArray(L)?[L[1],L[2]]:L.path?L.path[Math.floor(L.path.length/2)]:[L.x,L.y];
    g.save(); if(all) g.globalAlpha=Math.max(0.12,1-fogAt(world,all,at[0],at[1])*1.1); label(g,L); g.restore(); }
  const T=F.title;
  if(T){ g.textAlign='center'; const cx=T.x+T.w/2;
    (T.lines||[]).forEach(([txt,style,size,dy])=>label(g,{text:txt,x:cx,y:T.y+dy,style,size})); }
  if(F.compass){ const [cx,cy,cr]=F.compass; g.font=`${Math.round((cr||40)*0.42)}px ${FELL_SC}`; g.fillStyle=INK; g.textAlign='center'; g.textBaseline='middle';
    g.fillText('N',cx,cy-(cr||40)*1.3); g.textBaseline='alphabetic'; }
  const S=F.scale;
  if(S){ g.font=`italic 12px ${FELL}`; g.fillStyle=INK; g.textAlign='center';
    const marks=S.marks||5; for(let i=0;i<=marks;i+=marks/ (S.numbers||1)){ g.fillText(String(Math.round(S.n*i/marks)),S.x+S.league*S.n*i/marks,S.y-4); }
    g.fillText(S.label||'Leagues',S.x+S.league*S.n/2,S.y+17); }
}
// moon-letters: Arcana glyphs that can be seen only by night, glowing faintly silver
function drawMoon(g,world,dark,t){
  const M=(world.features||{}).moon; if(!M||dark<=0.35) return;
  const a=Math.min(1,(dark-0.35)/0.4)*(0.75+0.12*Math.sin(t/900));
  g.save(); g.globalAlpha=a; g.translate(M.x,M.y); g.rotate((M.rot||0)*Math.PI/180);
  g.font=`${M.size||18}px Georgia, "Times New Roman", serif`; g.textAlign='center'; g.textBaseline='middle';
  halo=false; g.shadowColor='rgba(190,220,255,0.95)'; g.shadowBlur=10; g.fillStyle='rgba(225,240,255,0.95)';
  (M.lines||[]).forEach((ln,i,all)=>spaced(g,ln,0,(i-(all.length-1)/2)*(M.size||18)*1.5,(M.size||18)*0.35));
  halo=true; g.restore();
}
function moonAt(world,x,y){ const M=(world.features||{}).moon; return M&&Math.abs(x-M.x)<(M.w||120)&&Math.abs(y-M.y)<(M.h||35)?M:null; }
// a road between two places: a hand-drawn dotted line in red-brown, bowed a little, the same bow every time
function road(g,A,B,prog=1){
  const r=rng(hashStr(A.id+'>'+B.id)), mx=(A.x+B.x)/2, my=(A.y+B.y)/2, dx=B.x-A.x, dy=B.y-A.y, L=Math.hypot(dx,dy)||1, bow=(r()-0.5)*0.16*L;
  const line=wobble(smooth([[A.x,A.y],[mx-dy/L*bow,my+dx/L*bow],[B.x,B.y]],4),hashStr(A.id+B.id),1.1);
  if(prog<=0) return;
  const part=prog>=1?line:line.slice(0,Math.max(2,Math.ceil(line.length*prog)));
  g.save(); g.strokeStyle='rgba(122,42,24,0.85)'; g.lineWidth=2; g.lineCap='round'; g.setLineDash([1.5,5]); path(g,part); g.stroke();
  if(prog<1){ const [x,y]=part[part.length-1]; g.setLineDash([]); g.fillStyle='rgba(60,25,12,0.9)'; g.beginPath(); g.arc(x,y,2.6,0,Math.PI*2); g.fill(); }   // the quill's wet tip
  g.restore();
}
let fontsAsked=false;
function loadFonts(){ if(fontsAsked||!document.fonts||!document.fonts.load) return; fontsAsked=true;
  ['16px "IM Fell English"','italic 16px "IM Fell English"','16px "IM Fell English SC"'].forEach(f=>document.fonts.load(f).catch(()=>{})); }
return {drawBase, drawFog, fogAt, drawLetters, drawMoon, moonAt, road, label, spaced, loadFonts, INK, RED, FELL, FELL_SC, _base:()=>base};
})();
if(typeof module!=='undefined') module.exports=WorldInk;
