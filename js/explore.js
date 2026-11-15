// ═══════════════════════════════════════════════════════════════════
//  EXPLORE — walk a wizard around the world, map by map.
//  Self-contained: builds its own full-screen overlay. Loads the
//  tileset atlases (sprites/ruins/ruins*.png + .json, cut by
//  tools/cut_ruins_tileset.py), the maps (maps/<id>.json, built by
//  tools/build_maps.js from tools/mapgen/), the world map
//  (maps/world.json) and characters.json for the wizards.
//  What each piece is (footprints, lights, bridge decks) is in
//  js/explore_pieces.js, shared with the map generators.
//  The world plan is docs/world-design.md.
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';

const P = window.ExplorePieces;
const {T, PS} = P;
const WIZ_H = 62;             // wizard drawn height, world px (a door is ~70 atlas px → ~43, shoulders reach the lintel)
const SPEED = 175;            // world px / s
const INSPECT_R = 46;         // how close (to its footprint's edge) to stand to inspect something
const START = {map:'hollowmere', spawn:'start'};
const SAVE_KEY = 'wd-explore-state';   // {map, x, y, found:[location ids]}; per device for now
const FADE_MS = 280;

// ── state ──
let atlases=[], rects=null, chars=null, wizKeys=[], wizIdx=0, wizImg=null, world=null;
const mapCache={};
let MAP=null, COLS=0, ROWS=0, WORLD_W=0, WORLD_H=0;
let ground=null, groundKind=null, objs=[], boxes=[], bridges=[], fireflies=[], embers=[], mini=null;
let built=false, running=false, busy=false, last=0, night=true, saveT=0;
let el={}, ctx=null, dark=null, dctx=null;
const wiz={x:0,y:0,face:1,walk:0,moving:false};
const keys=new Set();
let target=null, stuckT=0, near=null, nearExit=null, exitArmed=false, dpr=1, zoom=1, cam={x:0,y:0}, vw=0, vh=0;
let found=new Set();

const sizeOf=(kind,sc)=>P.sizeOf(rects,kind,sc);
const overlap=P.overlap;
const inside=(px,py,b)=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;

// ═══ MAP SETUP ═════════════════════════════════════════════════════
// A map file holds ground kinds and placed pieces (format in tools/mapgen/builder.js);
// which grass or cobble drawing each tile gets is picked here, from the map's seed.
function setupMap(data){
  MAP=data; COLS=data.cols; ROWS=data.rows; WORLD_W=COLS*T; WORLD_H=ROWS*T;
  groundKind=data.ground.map(row=>row.split(''));
  const r=P.rng(data.seed*7+13);
  ground=groundKind.map((row,y)=>row.map((c,x)=>{
    switch(c){
      case 'G': return r()<.8?'grass':'grass2';
      case 'd': return 'dirtGrass';
      case 'D': return 'tr_dirt_11';
      case 'P': return r()<.7?'flagCracked':'flagMoss';
      case 'W': return 'tr_quay_11';
      case 'O': return 'tr_shore_11';
      case 'K': { const q=r(); return q<.06?'planksBroken':q<.09?'planksHole':y%2?'planksH':'planksV'; }
      // roads use the transition set's cobble throughout, so edges and junctions match
      case 'R': return r()<.03?(r()<.5?'grate1':'grate2'):'tr_cobble_11';    // the odd drain
      case 'M': return 'tr_cobble_11';
      // burnt ground (Cindergate)
      case 'a': r(); return 'grass_ash';            // (grass2 burns paler and reads as patches)
      case 'e': return 'dirtGrass_ash';
      case 'c': return 'tr_cobble_11_ash';
      case 'f': return r()<.7?'flagCracked_ash':'flagMoss_ash';
      default:  return 'grass';
    }
  }));
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const set=EDGE_SET[groundKind[y][x]]; if(!set) continue;
    const t=edgeTile(set,x,y,r); if(t) ground[y][x]=t;
  }
  objs=[]; boxes=[]; bridges=[];
  data.objects.forEach(([kind,x,y,e],i)=>{
    if(!rects[kind]){ console.warn('explore: no piece',kind); return; }
    const o={kind,x,y,id:i,lore:e&&e.lore,scale:e&&e.scale,decal:!!(e&&e.decal)};
    if(o.decal){ o.fb=P.bridgeDeck(rects,o); bridges.push(o); }
    else for(const b of P.footBoxes(rects,o)) boxes.push(b);
    objs.push(o);
  });
  fireflies=[];
  if(data.fx!=='embers') for(let i=0;i<Math.round(COLS*ROWS/23);i++) fireflies.push({x:r()*WORLD_W,y:r()*WORLD_H,a:r()*6.28,s:8+r()*14,p:r()*6.28});
  embers=[];
  if(data.fx==='embers') for(let i=0;i<Math.round(COLS*ROWS/6);i++) embers.push({x:r()*WORLD_W,y:r()*WORLD_H,v:18+r()*30,p:r(),w:r()*6.28,s:1+r()*1.6});
  buildMinimap();
  if(el.title){ el.title.textContent=data.name; sizeMini(); }
}

// ── ground transitions ──
// Each set is a 3x3 block (tr_<set>_<row><col>, 1 = centre) from tileset3. A tile's
// four quarters are chosen separately: the top-left quarter looks north and west, and
// takes the top-left quarter of the edge, corner or centre cell that matches, and so on.
// That covers one-tile lanes, ends and junctions too, which a plain 3x3 can't.
const EDGE_SET = {
  R:{set:'cobble', out:c=>c==='G'||c==='d'}, M:{set:'cobble', out:c=>c==='G'||c==='d'},
  D:{set:'dirt',   out:c=>c==='G'||c==='d'},
  W:{set:'quay',   out:c=>c!=='W'},
  O:{set:'shore',  out:c=>c!=='O'},
  c:{set:'cobble', sfx:'_ash', out:c=>c==='a'||c==='e'},
};
function edgeTile(E,x,y,r){
  const k=groundKind, at=(xx,yy)=>(k[yy]||[])[xx];
  const out=(xx,yy)=>{ const c=at(xx,yy); return c!==undefined && E.out(c); };   // off the map counts as more of the same
  const n=out(x,y-1), s=out(x,y+1), w=out(x-1,y), e=out(x+1,y);
  if(!n&&!s&&!w&&!e) return null;                     // keep the plain tile (and its variety)
  const cell=(v,h,dy,dx)=>(v?(dy?2:0):1)+''+(h?(dx?2:0):1);
  const cells=[cell(n,w,0,0),cell(n,e,0,1),cell(s,w,1,0),cell(s,e,1,1)];
  if(cells.every(c=>c===cells[0])){
    const c=cells[0];
    const sfx=E.sfx||'';
    if(c[0]!=='1'&&c[1]!=='1'&&r()<.5) return 'tr_'+E.set+'_alt'+c+sfx;   // a second drawing of that corner
    return 'tr_'+E.set+'_'+c+sfx;
  }
  return {set:E.set, sfx:E.sfx||'', cells};
}
const quarterCache=new Map();
function quarterTile(g){
  const key=g.set+g.sfx+g.cells.join('');
  let c=quarterCache.get(key);
  if(!c){
    c=document.createElement('canvas'); c.width=c.height=120;
    const m=c.getContext('2d');
    g.cells.forEach((cc,i)=>{
      const q=rects['tr_'+g.set+'_'+cc+g.sfx], dx=i%2, dy=i>>1, hw=q[2]/2, hh=q[3]/2;
      m.drawImage(atlases[q[4]],q[0]+dx*hw,q[1]+dy*hh,hw,hh,dx*60,dy*60,60,60);
    });
    quarterCache.set(key,c);
  }
  return c;
}

function tileAt(px,py){ const x=Math.floor(px/T), y=Math.floor(py/T); return (groundKind[y]||[])[x]; }
// water you can't stand in: rivers less whatever a bridge spans, and ponds less their grassy rim
function wet(px,py){
  const t=tileAt(px,py);
  if(t==='O'){
    const tx=Math.floor(px/T), ty=Math.floor(py/T), fx=px-tx*T, fy=py-ty*T, R=T*0.36;
    const dry=(xx,yy)=>(groundKind[yy]||[])[xx]!=='O';
    return !((dry(tx-1,ty)&&fx<R)||(dry(tx+1,ty)&&fx>T-R)||(dry(tx,ty-1)&&fy<R)||(dry(tx,ty+1)&&fy>T-R));
  }
  if(t!=='W') return false;
  for(const b of bridges) for(const w of b.fb) if(inside(px,py,w)) return false;
  return true;
}

function buildMinimap(){
  const S=4, c=document.createElement('canvas'); c.width=COLS*S; c.height=ROWS*S;
  const m=c.getContext('2d');
  const col={G:'#3f6a2a',d:'#5d6a33',D:'#7a5a3a',R:'#8a8a94',M:'#6f7d63',P:'#a69a8e',W:'#1d4a70',K:'#8a5a30',O:'#24557a',a:'#3d3a32',e:'#4e4034',c:'#6a6560',f:'#857b70'};
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ m.fillStyle=col[groundKind[y][x]]||col.G; m.fillRect(x*S,y*S,S,S); }
  const k=S/T;
  for(const b of MAP.blocks||[]){ m.fillStyle='rgba(10,8,20,0.55)'; m.fillRect(b.x*k,b.y*k,b.w*k,b.h*k); }
  for(const o of objs){
    const s=sizeOf(o.kind,o.scale);
    if(o.decal){ m.fillStyle=o.kind.endsWith('Broken')?'#5a4a3a':'#b7a58a'; for(const b of o.fb) m.fillRect(b.x*k,b.y*k,b.w*k,Math.max(2,b.h*k)); }
    else if(/^(house|back|side|tavern|chapel|tower)/.test(o.kind)){ m.fillStyle={slate:'#7d8ea6',moss:'#5f8a4a',dusk:'#7a55a0',char:'#5e5650',burnt:'#4a4038'}[o.kind.split('_')[1]]||(/Slate/.test(o.kind)?'#7d8ea6':/Purple|tower/.test(o.kind)?'#7a55a0':o.kind==='chapel'?'#9a948a':'#b4582e'); m.fillRect((o.x-s.w/2)*k,(o.y-s.h*.6)*k,s.w*k,s.h*.6*k); }
    else if(o.kind==='tree'||o.kind==='bush'){ m.fillStyle='#1f3d16'; m.fillRect(o.x*k-1,o.y*k-2,2,2); }
    else if(o.kind==='deadtree'){ m.fillStyle='#4a3424'; m.fillRect(o.x*k-1,o.y*k-2,2,2); }
    else if(o.kind.match(/^(rubble|ruinWall|wallLow|lowwall|arch)/)){ m.fillStyle='#c9c3b6'; m.fillRect((o.x-s.w/2)*k,o.y*k-2,s.w*k,2); }
    else if(o.lore){ m.fillStyle='#ffd866'; m.fillRect(o.x*k-1,o.y*k-2,3,3); }
  }
  for(const x of MAP.exits||[]){ m.fillStyle='#ffd866'; m.fillRect(x.x*k,x.y*k,Math.max(3,x.w*k),Math.max(3,x.h*k)); }
  mini=c;
}

// ═══ TRAVEL ════════════════════════════════════════════════════════
function locationOfMap(id){ return world&&world.locations.find(l=>l.map===id); }
async function getMap(id){
  if(!mapCache[id]) mapCache[id]=await fetch('maps/'+id+'.json').then(r=>{ if(!r.ok) throw new Error('map '+id); return r.json(); });
  return mapCache[id];
}
function fade(on){ el.fade.classList.toggle('on',on); return new Promise(res=>setTimeout(res,on?FADE_MS:0)); }
// go to a map; at = a spawn name or [x, y]
async function enterMap(id,at,instant){
  if(busy) return; busy=true;
  keys.clear(); target=null; hideSay();
  try{
    if(!instant) await fade(true);
    const data=await getMap(id);
    setupMap(data);
    const p=Array.isArray(at)?at:(data.spawns[at]||data.spawns.start||Object.values(data.spawns)[0]);
    wiz.x=p[0]; wiz.y=p[1]; wiz.face=1;
    exitArmed=false;                          // arriving in an exit doesn't send you straight back
    const loc=locationOfMap(id); if(loc) found.add(loc.id);
    save();
  }catch(err){ console.error(err); toast('That way is blocked.'); }
  finally{ busy=false; fade(false); }
}
function save(){
  if(!MAP) return;
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify({map:MAP.id,x:Math.round(wiz.x),y:Math.round(wiz.y),found:[...found]})); }catch(e){}
}
function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); }catch(e){ return null; } }
function takeExit(x){
  if(x.to==='world') openWorld('travel');
  else enterMap(x.to.map,x.to.spawn);
}

// ═══ WORLD MAP ═════════════════════════════════════════════════════
// Drawn on a 1000 x 700 parchment. From an exit ('travel') you can travel to a place
// you know; from the 🗺 button ('view') you can only look.
let worldMode='view', worldSel=null, worldOpen=false;
function reachable(l){ return !l.locked && (found.has(l.id) || (l.seenFrom||[]).some(id=>found.has(id))); }
function visible(l){ return l.known || found.has(l.id) || (l.seenFrom||[]).some(id=>found.has(id)); }
function openWorld(mode){
  worldMode=mode; worldOpen=true; keys.clear(); target=null; hideSay();
  const here=locationOfMap(MAP.id);
  worldSel=here||null;
  el.world.hidden=false;
  el.worldTitle.textContent=world.name;
  showWorldPanel();
  requestAnimationFrame(drawWorldLoop);
}
function closeWorld(){ worldOpen=false; el.world.hidden=true; exitArmed=false; }
function showWorldPanel(){
  const l=worldSel, here=locationOfMap(MAP.id);
  el.wpName.textContent=l?l.name:world.name;
  el.wpText.textContent=l?l.blurb:'';
  const isHere=l&&here&&l.id===here.id;
  let can=false, label='Travel';
  if(!l){ label='Travel'; }
  else if(isHere){ label=worldMode==='travel'?'Stay here':'You are here'; can=worldMode==='travel'; }
  else if(l.locked){ label='Not yet'; }
  else if(!reachable(l)){ label='Unknown'; }
  else if(worldMode!=='travel'){ label='Walk to a road out to travel'; }
  else { can=true; }
  el.wpGo.textContent=label; el.wpGo.disabled=!can;
}
function worldGo(){
  const l=worldSel; if(!l) return;
  const here=locationOfMap(MAP.id);
  closeWorld();
  if(here&&l.id===here.id) return;
  enterMap(l.map,l.spawn);
}
function worldXY(e){
  const b=el.worldCv.getBoundingClientRect(), f=worldFit();
  return {x:(e.clientX-b.left-f.ox)/f.s, y:(e.clientY-b.top-f.oy)/f.s};
}
function worldFit(){
  const w=el.worldCv.clientWidth, h=el.worldCv.clientHeight, s=Math.min(w/1000,h/700);
  return {s, ox:(w-1000*s)/2, oy:(h-700*s)/2, w, h};
}
function worldClick(e){
  const p=worldXY(e);
  let best=null, bd=40;
  for(const l of world.locations){ if(!visible(l)) continue; const d=Math.hypot(l.x-p.x,l.y-p.y); if(d<bd){ bd=d; best=l; } }
  if(best){ worldSel=best; showWorldPanel(); }
}
function drawWorldLoop(t){
  if(!worldOpen) return;
  drawWorld(t);
  requestAnimationFrame(drawWorldLoop);
}
function drawWorld(t){
  const cv=el.worldCv, d=Math.min(window.devicePixelRatio||1,2);
  const W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*d)){ cv.width=Math.round(W*d); cv.height=Math.round(H*d); }
  const g=cv.getContext('2d'), f=worldFit();
  g.setTransform(d,0,0,d,0,0); g.fillStyle='#120e08'; g.fillRect(0,0,W,H);
  g.setTransform(d*f.s,0,0,d*f.s,d*f.ox,d*f.oy);
  // parchment
  const bg=g.createRadialGradient(500,350,80,500,350,620);
  bg.addColorStop(0,'#e4d2a6'); bg.addColorStop(0.7,'#cdb27c'); bg.addColorStop(1,'#8c7448');
  g.fillStyle=bg; g.fillRect(0,0,1000,700);
  const r=P.rng(77);
  g.fillStyle='rgba(90,60,30,0.08)';
  for(let i=0;i<900;i++){ g.fillRect(r()*1000,r()*700,1+r()*2,1+r()*2); }
  // woods and hills, in ink
  g.strokeStyle='rgba(70,50,25,0.55)'; g.fillStyle='rgba(70,90,40,0.35)'; g.lineWidth=1.2;
  for(let i=0;i<150;i++){
    const x=r()*1000, y=r()*700;
    if(Math.hypot(x-700,y-230)<130) continue;                       // nothing grows near the Wound
    if(world.locations.some(l=>Math.hypot(l.x-x,l.y-y)<45)) continue;
    if(r()<0.7){ g.beginPath(); g.moveTo(x,y-9); g.lineTo(x-6,y+4); g.lineTo(x+6,y+4); g.closePath(); g.fill(); g.stroke(); }
    else { g.beginPath(); g.arc(x,y+6,12,Math.PI*1.1,Math.PI*1.9); g.stroke(); }
  }
  // the river
  if(world.river){
    g.strokeStyle='rgba(40,80,120,0.75)'; g.lineWidth=4; g.lineCap='round';
    g.beginPath(); world.river.forEach(([x,y],i)=>{ if(!i) g.moveTo(x,y); else { const [px,py]=world.river[i-1]; g.quadraticCurveTo(px+(x-px)*0.5+12,py+(y-py)*0.5,x,y); } }); g.stroke();
  }
  // roads you know
  const L=id=>world.locations.find(l=>l.id===id);
  g.strokeStyle='rgba(95,60,25,0.85)'; g.lineWidth=2.5; g.setLineDash([7,6]);
  for(const [a,b] of world.roads){ const A=L(a), B=L(b); if(!visible(A)||!visible(B)) continue; g.beginPath(); g.moveTo(A.x,A.y); g.lineTo(B.x,B.y); g.stroke(); }
  g.setLineDash([]);
  // places
  const here=locationOfMap(MAP.id);
  for(const l of world.locations){
    if(!visible(l)) continue;
    if(l.kind==='city'){
      // the Wound's light over the dead city
      const pulse=0.75+0.25*Math.sin(t/700);
      const gl=g.createRadialGradient(l.x,l.y,6,l.x,l.y,110);
      gl.addColorStop(0,`rgba(170,110,255,${0.55*pulse})`); gl.addColorStop(1,'rgba(170,110,255,0)');
      g.fillStyle=gl; g.fillRect(l.x-110,l.y-110,220,220);
      g.strokeStyle='#3a2810'; g.lineWidth=3; g.beginPath(); g.arc(l.x,l.y,34,0,Math.PI*2); g.stroke();
      g.lineWidth=1.5; for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; g.beginPath(); g.moveTo(l.x+Math.cos(a)*34,l.y+Math.sin(a)*34); g.lineTo(l.x+Math.cos(a)*40,l.y+Math.sin(a)*40); g.stroke(); }
      g.fillStyle='#3a2810'; for(let i=0;i<6;i++){ const x=l.x-20+i*8, h=8+((i*37)%14); g.fillRect(x,l.y-h/2,5,h); }
    } else if(l.kind==='town'){
      g.fillStyle='#3a2810';
      for(const [dx,dy] of [[-10,4],[2,-6],[12,6]]){ g.fillRect(l.x+dx-5,l.y+dy-3,10,8); g.beginPath(); g.moveTo(l.x+dx-7,l.y+dy-3); g.lineTo(l.x+dx,l.y+dy-10); g.lineTo(l.x+dx+7,l.y+dy-3); g.fill(); }
    } else {
      g.fillStyle='#3a2810'; g.beginPath(); g.arc(l.x,l.y,6,0,Math.PI*2); g.fill();
    }
    g.font='bold 17px Cinzel, serif'; g.textAlign='center';
    g.fillStyle=l.locked?'rgba(58,40,16,0.7)':'#2a1c08';
    g.fillText(l.name,l.x,l.y+(l.kind==='city'?60:30));
    if(worldSel===l){ g.strokeStyle='#9a2a1a'; g.lineWidth=2; g.beginPath(); g.arc(l.x,l.y,l.kind==='city'?48:22,0,Math.PI*2); g.stroke(); }
    if(here===l){
      const pr=16+4*Math.sin(t/250);
      g.strokeStyle='rgba(201,140,40,0.95)'; g.lineWidth=3; g.beginPath(); g.arc(l.x,l.y,pr,0,Math.PI*2); g.stroke();
    }
  }
  // edges fade into the unknown
  const fog=g.createRadialGradient(500,350,300,500,350,640);
  fog.addColorStop(0,'rgba(18,14,8,0)'); fog.addColorStop(1,'rgba(18,14,8,0.85)');
  g.fillStyle=fog; g.fillRect(0,0,1000,700);
}

// ═══ UI ════════════════════════════════════════════════════════════
function buildDom(){
  const d=document.createElement('div');
  d.id='explore-screen';
  d.innerHTML=`
    <canvas id="ex-canvas"></canvas>
    <div class="ex-top">
      <button class="ex-btn" id="ex-back" type="button">← Back</button>
      <div class="ex-title" id="ex-title"></div>
      <div class="ex-wiz">
        <button class="ex-btn ex-arrow" id="ex-prev" type="button" aria-label="Previous wizard">◀</button>
        <img id="ex-face" alt=""><span id="ex-name"></span>
        <button class="ex-btn ex-arrow" id="ex-next" type="button" aria-label="Next wizard">▶</button>
      </div>
      <button class="ex-btn" id="ex-mapbtn" type="button" title="World map">🗺</button>
      <button class="ex-btn" id="ex-night" type="button" title="Day / night">☾</button>
    </div>
    <canvas id="ex-mini" aria-hidden="true"></canvas>
    <div class="ex-hint" id="ex-hint">WASD / arrows to walk · tap or click to walk there · E to inspect · walk off a road to travel</div>
    <button class="ex-btn ex-act" id="ex-act" type="button" hidden>✋ Inspect</button>
    <div class="ex-say" id="ex-say" hidden><div class="ex-say-name"></div><div class="ex-say-text"></div></div>
    <div class="ex-toast" id="ex-toast" hidden></div>
    <div class="ex-world" id="ex-world" hidden>
      <div class="ex-world-head"><span id="ex-world-title"></span><button class="ex-btn" id="ex-world-close" type="button">✕ Close</button></div>
      <canvas id="ex-world-cv"></canvas>
      <div class="ex-world-panel"><div class="ex-wp-name" id="ex-wp-name"></div><div class="ex-wp-text" id="ex-wp-text"></div>
        <button class="ex-btn ex-wp-go" id="ex-wp-go" type="button">Travel</button></div>
    </div>
    <div class="ex-fade" id="ex-fade"></div>
    <div class="ex-loading" id="ex-loading">Loading…</div>`;
  document.getElementById('app').appendChild(d);
  const $=s=>d.querySelector(s);
  el={root:d, cv:$('#ex-canvas'), mini:$('#ex-mini'), say:$('#ex-say'), act:$('#ex-act'), hint:$('#ex-hint'),
      face:$('#ex-face'), name:$('#ex-name'), night:$('#ex-night'), loading:$('#ex-loading'), title:$('#ex-title'),
      fade:$('#ex-fade'), toast:$('#ex-toast'), world:$('#ex-world'), worldCv:$('#ex-world-cv'), worldTitle:$('#ex-world-title'),
      wpName:$('#ex-wp-name'), wpText:$('#ex-wp-text'), wpGo:$('#ex-wp-go')};
  ctx=el.cv.getContext('2d');
  dark=document.createElement('canvas'); dctx=dark.getContext('2d');
  $('#ex-back').onclick=close;
  $('#ex-prev').onclick=()=>setWizard(wizIdx-1);
  $('#ex-next').onclick=()=>setWizard(wizIdx+1);
  $('#ex-mapbtn').onclick=()=>{ if(!busy&&MAP) openWorld('view'); };
  $('#ex-world-close').onclick=closeWorld;
  el.wpGo.onclick=worldGo;
  el.worldCv.addEventListener('click',worldClick);
  el.night.onclick=()=>{ night=!night; el.night.textContent=night?'☾':'☀'; };
  el.act.onclick=inspect;
  el.say.onclick=hideSay;
  el.cv.addEventListener('pointerdown',e=>{ el.cv.setPointerCapture(e.pointerId); setTarget(e); hideSay(); dragging=true; });
  el.cv.addEventListener('pointermove',e=>{ if(dragging) setTarget(e); });
  const up=()=>{ dragging=false; };
  el.cv.addEventListener('pointerup',up); el.cv.addEventListener('pointercancel',up);
  window.addEventListener('keydown',onKey); window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('resize',resize);
}
let dragging=false;
function setTarget(e){
  if(busy) return;
  const b=el.cv.getBoundingClientRect();
  target={x:cam.x+(e.clientX-b.left)/zoom, y:cam.y+(e.clientY-b.top)/zoom};
  stuckT=0;
}
function onKey(e){
  if(!running) return;
  const k=e.key.toLowerCase();
  if(worldOpen){
    if(k==='escape'){ closeWorld(); e.preventDefault(); }
    else if(k==='enter'&&!el.wpGo.disabled){ worldGo(); e.preventDefault(); }
    return;
  }
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ keys.add(k); target=null; hideSay(); e.preventDefault(); }
  else if(k==='e'||k===' '||k==='enter'){ if(!el.say.hidden) hideSay(); else inspect(); e.preventDefault(); }
  else if(k==='m'){ if(!busy&&MAP) openWorld('view'); }
  else if(k==='escape'){ if(!el.say.hidden) hideSay(); else close(); }
}
function resize(){
  if(!running) return;
  dpr=Math.min(window.devicePixelRatio||1,2);
  vw=window.innerWidth; vh=window.innerHeight;
  for(const c of [el.cv,dark]){ c.width=Math.round(vw*dpr); c.height=Math.round(vh*dpr); }
  el.cv.style.width=vw+'px'; el.cv.style.height=vh+'px';
  zoom=Math.max(0.62,Math.min(1.35,Math.min(vw/620,vh/620)));
  sizeMini();
}
function sizeMini(){
  if(!COLS) return;
  const mw=Math.round(Math.min(176,vw*0.3)); el.mini.width=COLS*4; el.mini.height=ROWS*4;
  el.mini.style.width=mw+'px'; el.mini.style.height=Math.round(mw*ROWS/COLS)+'px';
}

function setWizard(i){
  wizIdx=(i+wizKeys.length)%wizKeys.length;
  const key=wizKeys[wizIdx], c=chars[key];
  el.name.textContent=c.name; el.face.src='portraits/small/'+key+'.jpg';
  try{ localStorage.setItem('wd-explore-wiz',key); }catch(e){}
  const img=new Image(); img.src=c.sprite; img.onload=()=>{ if(wizKeys[wizIdx]===key) wizImg=img; };
}

function loreOf(o){ return (MAP.lore||{})[o.lore]; }
function showSay(o){
  const L=loreOf(o); if(!L) return;
  el.say.querySelector('.ex-say-name').textContent=L[0];
  el.say.querySelector('.ex-say-text').textContent=L[1];
  el.say.hidden=false; el.hint.classList.add('fade');
}
function hideSay(){ if(el.say) el.say.hidden=true; }
function inspect(){ if(near) showSay(near); }
let toastTimer=0;
function toast(msg){ el.toast.textContent=msg; el.toast.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ el.toast.hidden=true; },2200); }

// ═══ LOOP ══════════════════════════════════════════════════════════
function blocked(x,y){
  const b={x:x-12,y:y-9,w:24,h:9};
  if(b.x<T*0.3||b.y<T*0.5||b.x+b.w>WORLD_W-T*0.3||b.y+b.h>WORLD_H-4) return true;
  for(const c of boxes) if(overlap(b,c)) return true;
  for(const c of MAP.blocks||[]) if(overlap(b,c)) return true;
  if(wet(b.x,b.y)||wet(b.x+b.w,b.y)||wet(b.x,b.y+b.h)||wet(b.x+b.w,b.y+b.h)) return true;
  return false;
}
// an exit reaches a little past the map's edge, where you can't walk, so test generously
function exitAt(x,y){
  for(const e of MAP.exits||[]) if(overlap({x:x-14,y:y-10,w:28,h:10},e)) return e;
  return null;
}
function update(dt){
  if(busy||worldOpen){ wiz.moving=false; return; }
  let dx=0, dy=0;
  if(keys.has('arrowleft')||keys.has('a')) dx--;
  if(keys.has('arrowright')||keys.has('d')) dx++;
  if(keys.has('arrowup')||keys.has('w')) dy--;
  if(keys.has('arrowdown')||keys.has('s')) dy++;
  if(!dx&&!dy&&target){
    const tx=target.x-wiz.x, ty=target.y-wiz.y, dist=Math.hypot(tx,ty);
    if(dist<5) target=null; else { dx=tx/dist; dy=ty/dist; }
  }
  const len=Math.hypot(dx,dy);
  wiz.moving=len>0;
  if(len){
    dx/=len; dy/=len;
    const sx=wiz.x, sy=wiz.y, step=SPEED*dt;
    if(!blocked(wiz.x+dx*step,wiz.y)) wiz.x+=dx*step;
    if(!blocked(wiz.x,wiz.y+dy*step)) wiz.y+=dy*step;
    if(Math.abs(dx)>0.2) wiz.face=dx>0?1:-1;
    const moved=Math.hypot(wiz.x-sx,wiz.y-sy);
    if(moved<step*0.2){ stuckT+=dt; if(stuckT>0.35){ target=null; stuckT=0; } } else stuckT=0;
    wiz.walk+=dt*moved/step*10;
    if(moved>0.1) hideSay();
  }
  // a way out? (you must step out of the one you arrived in first)
  const ex=exitAt(wiz.x,wiz.y);
  if(!ex) exitArmed=true;
  else if(exitArmed&&len){ exitArmed=false; takeExit(ex); return; }
  nearExit=null;
  for(const e of MAP.exits||[]) if(Math.hypot(e.x+e.w/2-wiz.x,e.y+e.h/2-wiz.y)<260) nearExit=e;
  // something to inspect nearby?
  near=null; let best=INSPECT_R;
  for(const o of objs){
    if(!o.lore||!loreOf(o)) continue;
    for(const b of o.decal?o.fb:(o.lb||(o.lb=P.footBoxes(rects,o)))){
      const d=Math.hypot(Math.max(b.x-wiz.x,0,wiz.x-b.x-b.w), Math.max(b.y-wiz.y,0,wiz.y-9-b.y-b.h));
      if(d<best){ best=d; near=o; }
    }
  }
  el.act.hidden=!near||!el.say.hidden;
  if(near) el.act.textContent='✋ '+loreOf(near)[0];
  // remember where you are
  saveT+=dt; if(saveT>2){ saveT=0; save(); }
}
function updateCam(){
  const cw=vw/zoom, ch=vh/zoom;
  cam.x=Math.max(0,Math.min(WORLD_W-cw,wiz.x-cw/2));
  cam.y=Math.max(0,Math.min(WORLD_H-ch,wiz.y-WIZ_H/2-ch/2));
  if(cw>WORLD_W) cam.x=(WORLD_W-cw)/2; if(ch>WORLD_H) cam.y=(WORLD_H-ch)/2;
}

function drawPiece(kind,x,y,alpha,sc){
  sc=sc||PS;
  const q=rects[kind], w=q[2]*sc, h=q[3]*sc;
  if(alpha!==undefined) ctx.globalAlpha=alpha;
  ctx.drawImage(atlases[q[4]],q[0],q[1],q[2],q[3],x-w/2,y-h,w,h);
  ctx.globalAlpha=1;
}
function drawWizard(t){
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(wiz.x,wiz.y-2,17,6,0,0,Math.PI*2); ctx.fill();
  if(!wizImg) return;
  const c=chars[wizKeys[wizIdx]];
  const sheet=wizImg.width===192&&wizImg.height===320;
  const sw=sheet?48:wizImg.width, sh=sheet?64:wizImg.height;
  const h=WIZ_H*(c.spriteHeight||1), w=h*sw/sh*(c.spriteWidth||1);
  const bob=wiz.moving?Math.abs(Math.sin(wiz.walk))*3.5:Math.sin(t/600)*0.8;
  const tilt=wiz.moving?Math.sin(wiz.walk)*0.05:0;
  ctx.save();
  ctx.translate(wiz.x,wiz.y-bob);
  ctx.rotate(tilt);
  const flip=sheet?wiz.face>0:wiz.face<0;    // stills face right, the old sheets face left
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(wizImg,0,0,sw,sh,-w/2,-h,w,h);
  ctx.restore();
}
// running water: the quay tiles draw the water and its stone banks; this adds the current,
// light streaks drifting downstream (MAP.flow: S or N) inside the quays
const QUAY = 0.4;               // the quay stone's share of an edge tile
function drawCurrent(t,x0,x1,y0,y1){
  const k=groundKind, flow=t*0.025*(MAP.flow==='N'?-1:1);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    if(k[y][x]!=='W') continue;
    const L=x*T+((k[y][x-1]!==undefined&&k[y][x-1]!=='W')?QUAY*T:0)+4;
    const R=(x+1)*T-((k[y][x+1]!==undefined&&k[y][x+1]!=='W')?QUAY*T:0)-4;
    for(let lx=Math.ceil(L/14)*14; lx<R; lx+=14){
      const lane=lx/14, sp=0.7+((lane*37)%10)/14, phase=((lane*53+flow*sp)%90+90)%90;
      for(let yy=Math.floor(y*T/90)*90+phase-90; yy<(y+1)*T; yy+=90){
        if(yy<y*T-14) continue;
        const kk=Math.floor(yy/90), len=8+((lane*13+kk*7)%3+3)%3*5, a=0.14+(((lane+kk)%3)+3)%3*0.07;
        const top=Math.max(yy,y*T), bot=Math.min(yy+len,(y+1)*T); if(bot<=top) continue;
        ctx.fillStyle=`rgba(120,190,225,${a})`; ctx.fillRect(Math.round(lx),Math.round(top),2,bot-top);
      }
    }
  }
}
function draw(t){
  updateCam();
  const cw=vw/zoom, ch=vh/zoom;
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,-cam.x*dpr*zoom,-cam.y*dpr*zoom);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#10131a'; ctx.fillRect(cam.x,cam.y,cw,ch);
  // ground
  const x0=Math.max(0,Math.floor(cam.x/T)), x1=Math.min(COLS-1,Math.floor((cam.x+cw)/T));
  const y0=Math.max(0,Math.floor(cam.y/T)), y1=Math.min(ROWS-1,Math.floor((cam.y+ch)/T));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const g=ground[y][x];
    if(typeof g==='object'){ ctx.drawImage(quarterTile(g),x*T,y*T,T+0.6,T+0.6); continue; }
    const q=rects[g];
    ctx.drawImage(atlases[q[4]],q[0]+1,q[1]+1,q[2]-2,q[3]-2,x*T,y*T,T+0.6,T+0.6);
  }
  drawCurrent(t,x0,x1,y0,y1);
  for(const b of bridges){
    const s=sizeOf(b.kind,b.scale);
    if(b.y<cam.y||b.y-s.h>cam.y+ch) continue;
    drawPiece(b.kind,b.x,b.y,undefined,b.scale);
  }
  drawExits(t);
  // walk-to marker
  if(target){
    ctx.strokeStyle='rgba(201,168,76,0.8)'; ctx.lineWidth=2;
    const r=8+Math.sin(t/120)*2;
    ctx.beginPath(); ctx.ellipse(target.x,target.y,r,r*0.45,0,0,Math.PI*2); ctx.stroke();
  }
  // props and wizard, back to front
  const wizBox={x:wiz.x-16,y:wiz.y-WIZ_H,w:32,h:WIZ_H};
  const list=[];
  for(const o of objs){
    if(o.decal) continue;
    const s=sizeOf(o.kind);
    if(o.x+s.w/2<cam.x||o.x-s.w/2>cam.x+cw||o.y-s.h>cam.y+ch||o.y<cam.y) continue;
    list.push(o);
  }
  list.push({wiz:true,y:wiz.y});
  list.sort((a,b)=>a.y-b.y);
  for(const o of list){
    if(o.wiz){ drawWizard(t); continue; }
    const s=sizeOf(o.kind);
    // a tall piece in front of the wizard turns see-through
    const hides=o.y>wiz.y && s.h>90 && overlap(wizBox,{x:o.x-s.w/2,y:o.y-s.h,w:s.w,h:s.h-12});
    drawPiece(o.kind,o.x,o.y,hides?0.5:undefined);
  }
  // inspect marker
  if(near && el.say.hidden){
    const s=near.decal?{h:40}:sizeOf(near.kind), bob=Math.sin(t/250)*3;
    ctx.fillStyle='#ffd866'; ctx.strokeStyle='#3a2a08'; ctx.lineWidth=2;
    ctx.font='bold 18px Cinzel, serif'; ctx.textAlign='center';
    const my=(near.decal?near.fb[0].y:near.y-Math.min(s.h,120))-8+bob;
    ctx.strokeText('?',near.x,my); ctx.fillText('?',near.x,my);
  }
  if(MAP.haze){ const [r,g,b,a]=MAP.haze.split(','); ctx.fillStyle=`rgba(${r},${g},${b},${a})`; ctx.fillRect(cam.x,cam.y,cw,ch); }
  if(night) drawNight(t,cw,ch);
  if(embers.length) drawEmbers(t,cw,ch);
  drawExitLabel();
  drawMini();
}
// ways out: gold chevrons on the ground pointing off the map
function exitDir(e){
  if(e.dir) return {N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[e.dir];
  if(e.x<=1) return [-1,0]; if(e.x+e.w>=WORLD_W-1) return [1,0];
  if(e.y<=1) return [0,-1]; return [0,1];
}
function drawExits(t){
  for(const e of MAP.exits||[]){
    const [dx,dy]=exitDir(e), cx=e.x+e.w/2-dx*40, cy=e.y+e.h/2-dy*40;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.atan2(dy,dx));
    for(let i=0;i<3;i++){
      const a=0.25+0.55*Math.max(0,Math.sin(t/300-i*0.9));
      ctx.strokeStyle=`rgba(255,216,102,${a})`; ctx.lineWidth=4; ctx.lineCap='round';
      const ox=-20+i*16;
      ctx.beginPath(); ctx.moveTo(ox-6,-12); ctx.lineTo(ox+6,0); ctx.lineTo(ox-6,12); ctx.stroke();
    }
    ctx.restore();
  }
}
function drawExitLabel(){
  const e=nearExit; if(!e) return;
  const [dx,dy]=exitDir(e), x=e.x+e.w/2-dx*90, y=e.y+e.h/2-dy*70-28;
  ctx.font='bold 15px Cinzel, serif'; ctx.textAlign='center';
  const text=e.to==='world'?'⟶ '+(e.label||'Travel')+' (world map)':'⟶ '+e.label;
  const w=ctx.measureText(text).width+18;
  ctx.fillStyle='rgba(14,10,30,0.82)'; ctx.fillRect(x-w/2,y-17,w,24);
  ctx.strokeStyle='rgba(201,168,76,0.8)'; ctx.lineWidth=1; ctx.strokeRect(x-w/2+0.5,y-16.5,w-1,23);
  ctx.fillStyle='#f0e0b0'; ctx.fillText(text,x,y);
}
function lightsInView(cw,ch){
  const out=[];
  const near=(x,y)=>!(x<cam.x-300||x>cam.x+cw+300||y<cam.y-300||y>cam.y+ch+300);
  for(const o of objs){
    const L=P.lightsOf(o.kind); if(!L||o.decal) continue;
    const s=sizeOf(o.kind);
    for(const [lx,ly,type] of L){
      const x=o.x-s.w/2+lx*PS, y=o.y-s.h+ly*PS;
      // a burnt house's windows glow ember-orange: what's inside isn't a hearth
      if(near(x,y)) out.push({x,y,r:type==='lamp'?150:105,seed:o.id,c:o.kind.endsWith('_burnt')&&type!=='lamp'?'255,120,50':undefined});
    }
  }
  for(const g of MAP.glows||[]) if(near(g.x,g.y)) out.push({x:g.x,y:g.y,r:g.r,c:g.c,seed:g.x});
  return out;
}
function drawNight(t,cw,ch){
  const lights=lightsInView(cw,ch);
  lights.push({x:wiz.x,y:wiz.y-WIZ_H*0.6,r:140,wiz:true,seed:0});
  dctx.setTransform(dpr*zoom,0,0,dpr*zoom,-cam.x*dpr*zoom,-cam.y*dpr*zoom);
  dctx.globalCompositeOperation='source-over';
  dctx.clearRect(cam.x,cam.y,cw,ch);
  dctx.fillStyle='rgba(8,12,36,0.66)'; dctx.fillRect(cam.x,cam.y,cw,ch);
  dctx.globalCompositeOperation='destination-out';
  for(const L of lights){
    const r=L.r*(1+Math.sin(t/140+L.seed*1.7)*0.04);
    const g=dctx.createRadialGradient(L.x,L.y,0,L.x,L.y,r);
    const a=L.c?0.6:0.95;
    g.addColorStop(0,`rgba(0,0,0,${a})`); g.addColorStop(0.5,`rgba(0,0,0,${a/2})`); g.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=g; dctx.fillRect(L.x-r,L.y-r,r*2,r*2);
  }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(dark,0,0); ctx.restore();
  // a glow on top: warm for lamps and windows, a map's own colour for its glows
  ctx.globalCompositeOperation='lighter';
  for(const L of lights){
    if(L.wiz) continue;
    const flick=L.c?0.6+0.4*Math.sin(t/420+L.seed)*Math.sin(t/170+L.seed*3):1;
    const r=L.r*(L.c?0.7:0.45)*(1+Math.sin(t/110+L.seed)*0.08);
    const g=ctx.createRadialGradient(L.x,L.y,0,L.x,L.y,r);
    const c=L.c||'255,190,90';
    g.addColorStop(0,`rgba(${c},${(L.c?0.3:0.38)*flick})`); g.addColorStop(1,`rgba(${c},0)`);
    ctx.fillStyle=g; ctx.fillRect(L.x-r,L.y-r,r*2,r*2);
  }
  for(const f of fireflies){
    const x=f.x+Math.sin(t/1900+f.a)*f.s*3, y=f.y+Math.cos(t/2300+f.a)*f.s*2;
    if(x<cam.x||x>cam.x+cw||y<cam.y||y>cam.y+ch) continue;
    const a=0.5+0.5*Math.sin(t/400+f.p);
    const g=ctx.createRadialGradient(x,y,0,x,y,7);
    g.addColorStop(0,`rgba(220,255,140,${0.9*a})`); g.addColorStop(1,'rgba(160,255,80,0)');
    ctx.fillStyle=g; ctx.fillRect(x-7,y-7,14,14);
  }
  ctx.globalCompositeOperation='source-over';
}
// rising embers: each climbs 300 px over its life, drifting and flickering, then starts again
function drawEmbers(t,cw,ch){
  ctx.globalCompositeOperation='lighter';
  for(const e of embers){
    const life=((t/1000*e.v/300)+e.p)%1, x=e.x+Math.sin(t/900+e.w)*14+life*30, y=e.y-life*300;
    if(x<cam.x-10||x>cam.x+cw+10||y<cam.y-10||y>cam.y+ch+10) continue;
    const a=Math.sin(life*Math.PI)*(0.55+0.45*Math.sin(t/90+e.w*7));
    ctx.fillStyle=`rgba(255,${120+Math.round(80*(1-life))},40,${a.toFixed(2)})`;
    ctx.fillRect(x,y,e.s*1.6,e.s*1.6);
  }
  ctx.globalCompositeOperation='source-over';
}
function drawMini(){
  const m=el.mini.getContext('2d');
  m.drawImage(mini,0,0);
  const k=4/T;
  m.strokeStyle='rgba(255,255,255,0.7)'; m.lineWidth=1;
  m.strokeRect(cam.x*k+0.5,cam.y*k+0.5,vw/zoom*k,vh/zoom*k);
  m.fillStyle='#fff'; m.beginPath(); m.arc(wiz.x*k,wiz.y*k,2.5,0,Math.PI*2); m.fill();
}
function frame(now){
  if(!running) return;
  const dt=Math.min(0.05,(now-last)/1000||0); last=now;
  if(MAP){ update(dt); draw(now); }
  requestAnimationFrame(frame);
}

// ═══ OPEN / CLOSE ══════════════════════════════════════════════════
function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
async function load(){
  if(built) return;
  const names=['ruins','ruins2','ruins3','ruins4','ruins5'];
  const [cj,wj,...sheets]=await Promise.all([
    fetch('characters.json').then(r=>r.json()),
    fetch('maps/world.json').then(r=>r.json()),
    ...names.map(n=>Promise.all([loadImage('sprites/ruins/'+n+'.png'), fetch('sprites/ruins/'+n+'.json').then(r=>r.json())])),
  ]);
  // one name space across every sheet: [x, y, w, h, atlas index]
  atlases=sheets.map(s=>s[0]); rects={};
  sheets.forEach(([,rj],i)=>{ for(const k in rj) rects[k]=[...rj[k],i]; });
  chars=cj; world=wj;
  wizKeys=Object.keys(chars).filter(k=>chars[k].sprite);
  built=true;
}
async function open(){
  if(!el.root) buildDom();
  el.root.classList.add('active'); el.loading.hidden=false;
  running=true; resize();
  try{
    await load();
    const s=loadSave();
    found=new Set(s&&s.found||[]);
    if(!MAP){
      if(s&&s.map) await enterMap(s.map,[s.x,s.y],true);
      else await enterMap(START.map,START.spawn,true);
      if(!MAP) await enterMap(START.map,START.spawn,true);
    }
  }
  catch(err){ el.loading.textContent='Couldn\'t load the map.'; console.error(err); return; }
  el.loading.hidden=true;
  sizeMini();
  let saved=null; try{ saved=localStorage.getItem('wd-explore-wiz'); }catch(e){}
  setWizard(Math.max(0,wizKeys.indexOf(saved||'eldrin')));
  last=performance.now(); requestAnimationFrame(frame);
  el.hint.classList.remove('fade');
  setTimeout(()=>{ if(el.hint) el.hint.classList.add('fade'); },7000);
}
function close(){
  save();
  running=false; keys.clear(); target=null; hideSay(); closeWorld();
  el.root.classList.remove('active');
}

window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-explore');
  if(b) b.addEventListener('click',open);
});
window.Explore={open, close, enterMap:(id,at)=>enterMap(id,at||'start')};
})();
