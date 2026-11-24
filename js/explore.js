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
const START = {map:'wrenford', spawn:'start'};   // a new game starts in Wrenford, the University town (the tutorial)
// Save slots: each player profile (js/profiles.js, Guest included) keeps one save per wizard it has made,
// wd-explore-save:<profile id>:<slot>, holding where you are, what you carry, what you've found and done.
// New Game makes a slot; Load Game lists them. The older single save per profile (wd-explore-save:<id>)
// and the device-wide one before that (wd-explore-state) become slots the first time the list is read.
const LEGACY_SAVE = 'wd-explore-state';
const saveKeyFor = id => 'wd-explore-save:'+id;
const slotPrefix = id => 'wd-explore-save:'+id+':';
const newSlotKey = id => slotPrefix(id)+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function slotsOf(id){
  try{
    for(const old of [saveKeyFor(id),LEGACY_SAVE]){
      const v=localStorage.getItem(old);
      if(v){ localStorage.setItem(newSlotKey(id),v); localStorage.removeItem(old); }
    }
  }catch(e){}
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i); if(!k||!k.startsWith(slotPrefix(id))) continue;
      try{ const v=JSON.parse(localStorage.getItem(k)); if(v&&v.map) out.push({key:k,s:v}); }catch(e){}
    }
  }catch(e){}
  return out.sort((a,b)=>(b.s.t||0)-(a.s.t||0));
}
function profileNow(){ try{ const p=typeof Profiles!=='undefined'&&Profiles.active(); return p?{id:p.id,name:p.name}:{id:'guest',name:'Guest'}; }catch(e){ return {id:'guest',name:'Guest'}; } }
const MAP_NAMES = {wrenford:'Wrenford', hollowmere:'Hollowmere', corvanthe_road:'the Corvanthe Road', cindergate:'Cindergate', heights:'the Heights', spirewatch:'Spirewatch',
  collegium:'the Collegium', drowned_quarter:'the Drowned Quarter', quarry_ward:'the Quarry Ward', frostmarket:'Frostmarket', gloamside:'Gloamside'};
const RING_ELS = ['fire','air','lightning','arcane','water','earth','ice','dark'];   // the spell wheel's order, as the sectors lie
const FADE_MS = 280;
// ── Echoes on the map ──
const ECHO = {wander:42, chase:118, sight:210, touch:26, respawnMs:8*60*1000, grace:2.5};
// what a destroyed Echo leaves: quintessence, 'spill' (docs/world-design.md); a strong Echo leaves more
const SPILL = {fire:['cinderglass','#ff8a3a'], water:['tideglass','#4aa8e0'], ice:['rimeheart','#a8e0ff'], lightning:['stormglass','#9aa8ff'],
  earth:['lodestone','#b89a70'], air:['galesilk','#e0dcf4'], arcane:['aether','#b07aff'], dark:['nightglass','#9a6ac8']};
const SPILL_YIELD = {weak:1, strong:3};

// ── state ──
let atlases=[], rects=null, chars=null, wizKeys=[], wizIdx=0, wizImg=null, world=null;
const mapCache={};
let MAP=null, COLS=0, ROWS=0, WORLD_W=0, WORLD_H=0;
let ground=null, groundKind=null, objs=[], boxes=[], bridges=[], fireflies=[], embers=[], mini=null;
let built=false, running=false, busy=false, last=0, saveT=0;
// ── the clock: a day passes in DAY_MS of play (paused during battles). lightMode: 'auto' follows it,
//    'day' / 'night' hold it (the ☀ button cycles them).
const DAY_MS = 16*60*1000;
let clock=9*60, lightMode='auto';            // minutes since midnight
function darkness(){
  if(lightMode==='day') return 0; if(lightMode==='night') return 1;
  const h=clock/60;
  if(h>=7&&h<18) return 0;                    // day
  if(h>=18&&h<20.5) return (h-18)/2.5;        // dusk
  if(h>=5&&h<7) return 1-(h-5)/2;             // dawn
  return 1;                                    // night
}
function clockLabel(){ const h=Math.floor(clock/60), m=Math.floor(clock%60); return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; }
// ── wounds: each wizard's HP carries from fight to fight; healing in battle only buys time (after a
//    win you keep the lowest you fell to). Rest at a safe place to recover (REST).
let vit={};                                   // key → hp
const REST = {hollowmere:{tavern:[1,'You take a room at the Drowned Crow and sleep till morning. The chairs still face the door.']},
  corvanthe_road:{camp:[0.6,'You sleep a few hours by the gleaners\' cold firepit, one eye open.']},
  cindergate:{camp:[0.6,'You rest in the gate\'s shadow. The pot on the fire is still warm.']},
  wrenford:{inn:[1,'You take a room at the Wren\'s Nest and sleep till morning. Somewhere a bell is ringing, a long time, for the Absent.']}};
function maxHp(key){ return (chars[key]&&chars[key].hp)||50; }
function hpOf(key){ return vit[key]==null?maxHp(key):vit[key]; }
let el={}, ctx=null, dark=null, dctx=null;
const wiz={x:0,y:0,face:1,walk:0,moving:false};
const keys=new Set();
let target=null, stuckT=0, near=null, nearLook=null, nearExit=null, exitArmed=false, dpr=1, zoom=1, baseZoom=1, cam={x:0,y:0}, vw=0, vh=0;
let PAL='', fighters={};
// ── what you carry (saved): gold, potions, allies who follow you, rescues to report, rooms you changed, books read
let gold=0, potions=0, allies=[], rescues=[], rooms={}, booksRead=[], roomSpec=null, doors=[], npcs=[], nearDoor=null, quests={};
const POTION_HEAL=0.3, POTION_PRICE={shop:8, safehouse:10}, MAX_ALLIES=2;
let found=new Set(), spill={}, cleared={}, actors=[], grace=0, crews=[], bandState={}, parley=null, clashes=[], visited=new Set(), saveOwner=null, saveKey=null, lastPlace='', hero=null, magic=null, yearT=0, creating=false, bagOpen=false, bagTab='pack', bagRead=null, bagConfirm=null;
const imgCache={};
function imgOf(src){ if(!imgCache[src]){ const i=new Image(); i.src=src; imgCache[src]=i; } return imgCache[src]; }

const sizeOf=(kind,sc)=>P.sizeOf(rects,kind,sc);
const overlap=P.overlap;
const inside=(px,py,b)=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;

// ═══ MAP SETUP ═════════════════════════════════════════════════════
// A map file holds ground kinds and placed pieces (format in tools/mapgen/builder.js);
// which grass or cobble drawing each tile gets is picked here, from the map's seed.
function setupMap(data){
  MAP=data; COLS=data.cols; ROWS=data.rows; WORLD_W=COLS*T; WORLD_H=ROWS*T; navGrid=null;
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
      // inner districts: snow (the Winter Fair), flooded streets you wade through (the Sunken Harbour), the Wound's edge
      case 'S': return 'tr_snow_11';
      case 'F': return 'tr_flood_11';
      case 'X': return 'tr_wound_21';
      // interiors (js/explore_rooms.js): floors, and the dark beyond the walls
      case 'w': return 'floorWood'+(1+Math.floor(r()*4));
      case 'l': return 'floorFlag'+(1+Math.floor(r()*4));
      case 'y': return 'floorTerra'+(1+Math.floor(r()*4));
      case 'b': return r()<.3?'floorBroken'+(1+Math.floor(r()*3)):'floorWood'+(1+Math.floor(r()*4));
      // the Undercroft (sheet 24): sewer brick, wet in places, and its water channel
      case 'u': return r()<.12?'floorSewerWet':'floorSewer';
      case 'q': return 'sewerChannel';
      case 'v': return null;
      default:  return 'grass';
    }
  }));
  // a sector's palette: every ground tile that has a recolour in its atlas uses it
  PAL=data.palette&&rects['grass_'+data.palette]?'_'+data.palette:'';
  if(PAL) ground=ground.map(row=>row.map(n=>rects[n+PAL]?n+PAL:n));
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const set=EDGE_SET[groundKind[y][x]]; if(!set) continue;
    const t=edgeTile(set,x,y,r); if(t) ground[y][x]=t;
  }
  objs=[]; boxes=[]; bridges=[];
  data.objects.forEach(([kind,x,y,e],i)=>{
    if(!rects[kind]){ console.warn('explore: no piece',kind); return; }
    const o={kind,x,y,id:i,lore:e&&e.lore,scale:e&&e.scale,decal:!!(e&&e.decal)};
    if(o.lore&&Folk&&Folk.hidden(o,folkApi)) return;                   // a quest item you already took
    if(o.decal){ o.fb=P.BRIDGE[kind]?P.bridgeDeck(rects,o):[]; bridges.push(o); }   // a bridge, or flat ground art (a crack, glazed cobbles)
    else for(const b of P.footBoxes(rects,o)) boxes.push(b);
    objs.push(o);
  });
  fireflies=[];
  if(!data.fx) for(let i=0;i<Math.round(COLS*ROWS/23);i++) fireflies.push({x:r()*WORLD_W,y:r()*WORLD_H,a:r()*6.28,s:8+r()*14,p:r()*6.28});
  embers=[];
  const FX=FX_TYPES[data.fx];
  if(FX) for(let i=0;i<Math.round(COLS*ROWS*FX.n);i++) embers.push({x:r()*WORLD_W,y:r()*WORLD_H,v:FX.v[0]+r()*FX.v[1],p:r(),w:r()*6.28,s:1+r()*1.6});
  findDoors();
  npcs=(data.npcs||[]).map(n=>Object.assign({},n));
  applyRoomState();
  spawnEchoes();
  spawnBands();
  spawnStrollers();
  buildMinimap();
  if(el.title){ el.title.textContent=data.name; sizeMini(); }
}

// ── Echoes ──
function echoLeader(e){ const k=e.foes.find(f=>f[0].endsWith('_strong'))||e.foes[0]; return k[0]; }
function spawnEchoes(){
  const now=Date.now();
  // a rival crew in a room: they fight on sight
  const party=MAP.interior&&!roomState().done&&(MAP.ev||{}).type==='party'?npcs.filter(n=>n.role==='party'):[];
  npcs=npcs.filter(n=>n.role!=='party');
  const crews=party.map(n=>{ const ev=MAP.ev, lead=ev.wizard&&chars[ev.wizard]?chars[ev.wizard].sprite:(fighters[ev.foes[0][0]]||{}).sprite;
    return {e:{id:'party', party:true, x:n.x, y:n.y, r:40, foes:ev.foes, wizard:ev.wizard}, x:n.x, y:n.y, tx:n.x, ty:n.y, wait:1, face:-1, walk:0,
      strong:false, img:imgOf(lead), n:ev.foes.length+(ev.wizard?1:0)}; });
  actors=crews.concat((MAP.echoes||[]).filter(e=>!(cleared[MAP.id+':'+e.id]>now-ECHO.respawnMs)).map(e=>{
    const strong=echoLeader(e).endsWith('_strong');
    return {e, x:e.x, y:e.y, tx:e.x, ty:e.y, wait:Math.random()*2, face:Math.random()<.5?1:-1, walk:Math.random()*6,
      strong, img:imgOf('sprites/echoes/'+e.el+'_'+(strong?'strong':'weak')+'.png'), n:e.foes.length};
  }));
}
function updateEchoes(dt){
  for(const a of actors){
    if(a.clash){ a.moving=false; continue; }          // busy with a warband
    const d=Math.hypot(wiz.x-a.x,(wiz.y-a.y)*1.3);
    const chasing=grace<=0&&(d<ECHO.sight||MAP.interior);   // indoors there's nowhere to hide
    if(chasing){ a.tx=wiz.x; a.ty=wiz.y; }
    else if(Math.hypot(a.tx-a.x,a.ty-a.y)<6){
      a.wait-=dt;
      if(a.wait<=0){ const ang=Math.random()*Math.PI*2, r=Math.random()*a.e.r; a.tx=a.e.x+Math.cos(ang)*r; a.ty=a.e.y+Math.sin(ang)*r*0.6; a.wait=1+Math.random()*2.5; }
    }
    const w=chasing?routeStep(a,a.tx,a.ty):{x:a.tx,y:a.ty};
    const dx=w.x-a.x, dy=w.y-a.y, len=Math.hypot(dx,dy)||1;
    a.moving=Math.hypot(a.tx-a.x,a.ty-a.y)>6;
    if(a.moving){
      const step=(chasing?ECHO.chase:ECHO.wander)*dt, ux=dx/len, uy=dy/len;
      const ox=a.x, oy=a.y;
      if(!blocked(a.x+ux*step,a.y)) a.x+=ux*step;
      if(!blocked(a.x,a.y+uy*step)) a.y+=uy*step;
      if(Math.abs(ux)>0.2) a.face=ux>0?1:-1;
      if(Math.hypot(a.x-ox,a.y-oy)<step*0.2&&!chasing){ a.tx=a.x; a.ty=a.y; }   // stuck: wait and pick again
      a.walk+=dt*6;
    }
    if(grace<=0&&Math.abs(wiz.x-a.x)<ECHO.touch&&Math.abs(wiz.y-a.y)<18){ fight(a); return; }
  }
}
// ── Warbands (js/explore_bands.js): rival gleaner crews on the streets ──
// A crew walks the map's streets (ROAD ground kinds, on a tile grid), now and then making for the nearest
// Echo group to hunt it. Meeting one plays out on the map (CLASH): the odds come from both sides' weight
// (ExploreBands.clashOdds); a winning crew takes the spill and may lose a member, a losing one is broken.
// Toll crews stop you and ask for gold or spill; hostile ones charge. bandState[id] (saved): beaten (time),
// lost (fallen members), gold, spill, tollUntil, met.
const ROAD_KINDS='RMcPfDF';
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
let roadSet=null, roadList=[];
function bandRec(b){
  const B=window.ExploreBands.BAND_RULES;
  let st=bandState[b.id];
  if(!st||(st.beaten&&Date.now()-st.beaten>B.respawnMs)){
    const met=st&&st.met;
    st=bandState[b.id]={lost:[], gold:B.gold[b.level]+Math.floor(Math.random()*8), spill:{}, met:!!met};
  }
  return st;
}
const aliveOf=(b,st)=>b.members.filter((m,i)=>!st.lost.includes(i));
function roadsOf(){
  roadSet=new Set(); roadList=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const k=MAP.ground[r][c];
    if(ROAD_KINDS.includes(k)||(k==='W'&&!wet(c*T+T/2,r*T+T/2))){ roadSet.add(r*COLS+c); roadList.push(r*COLS+c); }
  }
}
function roadPath(from,to){                       // tile indices along the streets, BFS
  const prev=new Map([[from,from]]), q=[from];
  for(let h=0;h<q.length;h++){ const c=q[h]; if(c===to) break; const x=c%COLS;
    for(const n of [c-COLS,c+COLS,x>0?c-1:-1,x<COLS-1?c+1:-1]) if(n>=0&&roadSet.has(n)&&!prev.has(n)){ prev.set(n,c); q.push(n); } }
  if(!prev.has(to)) return null;
  const out=[]; for(let c=to;c!==from;c=prev.get(c)) out.unshift({x:(c%COLS)*T+T/2+(Math.random()-0.5)*20, y:Math.floor(c/COLS)*T+T/2+(Math.random()-0.5)*14});
  return out;
}
const roadIdx=(x,y)=>Math.floor(y/T)*COLS+Math.floor(x/T);
function spawnBands(){
  crews=[]; parley=null; clashes=[];
  if(MAP.interior||!window.ExploreBands) return;
  const here=window.ExploreBands.BANDS.filter(b=>b.map===MAP.id);
  if(!here.length) return;
  roadsOf(); if(!roadList.length) return;
  const sp=[wiz.x,wiz.y];
  for(const b of here){
    const st=bandRec(b); if(st.beaten) continue;
    const far=roadList.filter(c=>Math.hypot((c%COLS)*T-sp[0],Math.floor(c/COLS)*T-sp[1])>700);
    const c=(far.length?far:roadList)[Math.floor(Math.random()*(far.length||roadList.length))];
    const x=(c%COLS)*T+T/2, y=Math.floor(c/COLS)*T+T/2;
    crews.push({b, x, y, path:null, wait:1+Math.random()*2, face:1, walk:0, trail:[], moving:false, clash:null,
      imgs:(b.wizard&&chars[b.wizard]?[chars[b.wizard].sprite]:[]).concat(aliveOf(b,st).map(k=>(fighters[k]||{}).sprite)).filter(Boolean).map(imgOf)});
  }
}
function crewFoes(b,st){ return aliveOf(b,st).map(k=>[k,b.level]); }
function updateBands(dt){
  if(!crews.length) return;
  const B=window.ExploreBands.BAND_RULES, now=Date.now();
  // a toll crew is waiting on your answer; walk away and that's an answer
  if(parley&&el.say.hidden){ const c=parley; parley=null; toast(cap(c.b.name)+' take that as a no.'); bandFight(c); return; }
  for(const c of crews){
    const st=bandRec(c.b);
    if(c.clash){                                   // fighting Echoes: stand and trade blows, then settle it
      c.clash.t-=dt*1000; c.moving=false;
      if(c.clash.t<=0) settleClash(c,st);
      continue;
    }
    if(parley===c) continue;
    const d=Math.hypot(wiz.x-c.x,(wiz.y-c.y)*1.3);
    const wants=grace<=0&&!(st.tollUntil>now);
    let tx=null, ty=null, speed=B.wander;
    if(wants&&d<B.sight){ tx=wiz.x; ty=wiz.y; speed=B.chase; c.path=null; st.met=true; }
    else {
      if(!c.path||!c.path.length){
        c.wait-=dt; if(c.wait>0){ c.moving=false; continue; }
        c.wait=1.5+Math.random()*3;
        const from=roadIdx(c.x,c.y); let to=null;
        const prey=actors.filter(a=>a.e.el&&!a.clash);
        if(prey.length&&Math.random()<B.hunt){ const p=prey.sort((p,q)=>Math.hypot(p.x-c.x,p.y-c.y)-Math.hypot(q.x-c.x,q.y-c.y))[0];
          let best=null, bd=1e9; for(const r of roadList){ const dd=Math.hypot((r%COLS)*T+T/2-p.x,Math.floor(r/COLS)*T+T/2-p.y); if(dd<bd){ bd=dd; best=r; } } to=best; }
        else { const near=roadList.filter(r=>{ const dd=Math.hypot((r%COLS)*T-c.x,Math.floor(r/COLS)*T-c.y); return dd>T*6&&dd<T*22; }); to=near[Math.floor(Math.random()*near.length)]; }
        if(roadSet.has(from)&&to!=null) c.path=roadPath(from,to);
        if(!c.path){ const r=roadList[Math.floor(Math.random()*roadList.length)]; c.x=(r%COLS)*T+T/2; c.y=Math.floor(r/COLS)*T+T/2; continue; }   // off the streets somehow: back on them
      }
      if(c.path&&c.path.length){ tx=c.path[0].x; ty=c.path[0].y; if(Math.hypot(tx-c.x,ty-c.y)<8){ c.path.shift(); continue; } }
    }
    if(tx==null){ c.moving=false; continue; }
    const dx=tx-c.x, dy=ty-c.y, len=Math.hypot(dx,dy)||1, step=speed*dt;
    if(speed===B.chase){ if(!blocked(c.x+dx/len*step,c.y)) c.x+=dx/len*step; if(!blocked(c.x,c.y+dy/len*step)) c.y+=dy/len*step; }
    else { c.x+=dx/len*Math.min(step,len); c.y+=dy/len*Math.min(step,len); }
    c.moving=true; c.walk+=dt*6; if(Math.abs(dx)>4) c.face=dx>0?1:-1;
    c.trail.unshift({x:c.x,y:c.y}); if(c.trail.length>60) c.trail.pop();
    // they reach you
    if(wants&&Math.abs(wiz.x-c.x)<B.touch&&Math.abs(wiz.y-c.y)<20){ meetBand(c,st); return; }
    // they reach an Echo group
    for(const a of actors) if(a.e.el&&!a.clash&&Math.hypot(a.x-c.x,a.y-c.y)<70){
      c.clash=a.clash={t:B.clashMs, a, odds:window.ExploreBands.clashOdds(fighters,chars,c.b,aliveOf(c.b,st),a.e.foes)};
      clashes.push({x:(a.x+c.x)/2,y:(a.y+c.y)/2,t0:performance.now(),c}); c.path=null;
      if(Math.hypot(wiz.x-a.x,wiz.y-a.y)<700) toast(cap(c.b.name)+' fall on '+(a.n>1?'a pack of':'an')+' '+a.e.el+' Echo'+(a.n>1?'es':'')+'!');
      break;
    }
  }
}
function settleClash(c,st){
  const a=c.clash.a, win=Math.random()<c.clash.odds, close=Math.hypot(wiz.x-c.x,wiz.y-c.y)<800;
  c.clash=null; a.clash=null; clashes=clashes.filter(k=>k.c!==c);
  if(win){
    cleared[MAP.id+':'+a.e.id]=Date.now(); actors=actors.filter(x=>x!==a);
    const got=a.e.foes.reduce((n,[k])=>n+SPILL_YIELD[k.endsWith('_strong')?'strong':'weak'],0);
    st.spill[a.e.el]=(st.spill[a.e.el]||0)+got;
    // the Echoes took someone with them? never the last one standing
    const alive=c.b.members.map((m,i)=>i).filter(i=>!st.lost.includes(i));
    if(alive.length>1&&Math.random()<0.3){ st.lost.push(alive[alive.length-1]); c.imgs.pop(); }
    if(close) toast(cap(c.b.name)+' break the Echoes and take the spill.');
  } else {
    st.beaten=Date.now(); crews=crews.filter(x=>x!==c);
    if(close) toast('The Echoes tear through '+c.b.name+'.');
  }
  save();
}
function meetBand(c,st){
  const B=window.ExploreBands.BAND_RULES, b=c.b;
  keys.clear(); target=null; st.met=true;
  if(b.mood==='hostile'){ toast(b.leader+': '+b.shout); bandFight(c); return; }
  const toll=B.toll[b.level], spillHave=Object.values(spill).reduce((x,y)=>x+y,0), inSpill=Math.max(1,Math.ceil(toll/5));
  parley=c; talkFocus={x:c.x, y:c.y}; sayFace=b.wizard?faceSrc(b.wizard):'portraits/small/'+b.members[0]+'.jpg';
  showDialog(b.leader+', of '+b.name, b.toll+'\n\nThe toll is '+toll+' gold.',[
    {label:'Pay '+toll+' gold', disabled:gold<toll, fn:()=>{ parley=null; st.robbed=false; gold-=toll; st.gold+=toll; st.tollUntil=Date.now()+B.tollMs; toast('They step aside. "Pleasure doing business."'); }},
    {label:'Pay in spill ('+inSpill+')', disabled:spillHave<inSpill, fn:()=>{ parley=null; payInSpill(inSpill,st); st.tollUntil=Date.now()+B.tollMs; toast('They weigh the crystals and wave you on.'); }},
    {label:'Fight', fn:()=>{ parley=null; bandFight(c); }}]);
}
function payInSpill(n,st){                          // the commonest first
  while(n>0){ const k=Object.keys(spill).filter(e=>spill[e]>0).sort((p,q)=>spill[q]-spill[p])[0]; if(!k) break; spill[k]--; st.spill[k]=(st.spill[k]||0)+1; n--; }
  renderSpill();
}
function bandFight(c){
  const st=bandRec(c.b);
  fight({e:{band:c.b, crew:c, id:'band:'+c.b.id, foes:crewFoes(c.b,st), wizard:c.b.wizard&&chars[c.b.wizard]?c.b.wizard:null, x:c.x, y:c.y}, x:c.x, y:c.y});
}
function afterBandFight(a,won){
  const b=a.e.band, st=bandRec(b), B=window.ExploreBands.BAND_RULES;
  if(won){
    gold+=st.gold; const got=[];
    for(const k in st.spill) if(st.spill[k]>0){ spill[k]=(spill[k]||0)+st.spill[k]; got.push(st.spill[k]+' '+SPILL[k][0]); }
    toast('+'+st.gold+' gold'+(got.length?', '+got.join(', '):'')+' from '+b.name);
    st.beaten=Date.now(); crews=crews.filter(x=>x!==a.e.crew);
    if(b.bandit) setTimeout(()=>earnTopper(b.bandit.topper,b.bandit.name+' drops a staff as the crew breaks. The head comes off in your hand'),900);
  } else {
    const g=Math.floor(gold*B.robGold); gold-=g; st.gold+=g;
    for(const k in spill){ const n=Math.floor(spill[k]*B.robSpill); spill[k]-=n; st.spill[k]=(st.spill[k]||0)+n; }
    setTimeout(()=>toast(cap(b.name)+' went through your pockets'+(g?': '+g+' gold gone.':'.')),2600);
    st.tollUntil=Date.now()+B.tollMs; st.robbed=true;  // they've had their fill of you for a while
  }
  renderSpill();
}
function drawCrew(c,t){
  const st=bandState[c.b.id]; const n=c.imgs.length;
  for(let i=n-1;i>=0;i--){                         // followers trail behind the leader
    const img=c.imgs[i]; if(!img.complete||!img.naturalWidth) continue;
    const p=i===0?c:(c.trail[Math.min(c.trail.length-1,i*14)]||c);
    const h=WIZ_H*(i===0&&c.b.wizard?1.0:0.96), w=h*img.naturalWidth/img.naturalHeight, bob=c.moving?Math.abs(Math.sin(c.walk+i))*3:0;
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x,p.y-2,w*0.3,5,0,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(p.x,p.y-bob); if(c.face<0) ctx.scale(-1,1); ctx.drawImage(img,-w/2,-h,w,h); ctx.restore();
  }
  // the crew's colours over the leader, and its name when you're close
  const d=Math.hypot(wiz.x-c.x,wiz.y-c.y);
  ctx.fillStyle=c.b.col; ctx.beginPath(); ctx.moveTo(c.x-6,c.y-WIZ_H-14); ctx.lineTo(c.x+6,c.y-WIZ_H-14); ctx.lineTo(c.x,c.y-WIZ_H-5); ctx.fill();
  if(d<380){
    ctx.font='12px Cinzel, serif'; ctx.textAlign='center';
    const label=cap(c.b.name)+(c.b.mood==='hostile'?' ⚔':'');
    const w=ctx.measureText(label).width+12;
    ctx.fillStyle='rgba(14,10,30,0.8)'; ctx.fillRect(c.x-w/2,c.y-WIZ_H-34,w,17);
    ctx.fillStyle=c.b.col; ctx.fillText(label,c.x,c.y-WIZ_H-21);
  }
}
// ── Strollers: townsfolk who walk a safe town's streets by day (Wrenford), for bustle ──
// Peasants (sprites/folk/peasant_*.png, cut by tools/cut_peasants.py) come out of house doors in the
// morning, wander the streets (roadPath, like the warbands) with the odd stop to look about, and as
// dusk falls make for the nearest door and go in; at dawn they come out again. They don't block you;
// pass close and one may greet you (a speech bubble: the map's `greet` lines, else GREET). Count by daylight: STROLL.n × (1 − darkness).
const STROLL = {n:16, speed:[34,48], greetR:70, greetGap:9000};
const STROLL_SPRITES = ['man_1','man_2','man_3','man_4','woman_1','woman_2','woman_3','woman_4'].map(k=>'sprites/folk/peasant_'+k+'.png');
const GREET = ['Morning!','Good day.','Afternoon.','Lovely day.','Mind your step.'];   // a map's own `greet` lines replace these
let strollers=[], strollT=0;
function nearestRoad(x,y){ let best=null, bd=1e9; for(const r of roadList){ const d=Math.hypot((r%COLS)*T+T/2-x,Math.floor(r/COLS)*T+T/2-y); if(d<bd){ bd=d; best=r; } } return best; }
function strollDoors(){ return doors.filter(d=>!d.spec||!d.spec.fixed); }
function newStroller(atDoor){
  const ds=strollDoors(); let x, y, door=null;
  if(atDoor&&ds.length){ door=ds[Math.floor(Math.random()*ds.length)]; x=door.x; y=door.y; }
  else { const r=roadList[Math.floor(Math.random()*roadList.length)]; x=(r%COLS)*T+T/2+(Math.random()-0.5)*30; y=Math.floor(r/COLS)*T+T/2+(Math.random()-0.5)*20; }
  const s={x, y, img:imgOf(STROLL_SPRITES[Math.floor(Math.random()*STROLL_SPRITES.length)]), face:Math.random()<0.5?1:-1, walk:Math.random()*6,
    moving:false, path:null, wait:Math.random()*2, speed:STROLL.speed[0]+Math.random()*(STROLL.speed[1]-STROLL.speed[0]),
    h:WIZ_H*(0.92+Math.random()*0.1), home:null, fade:atDoor?0:1, greet:null, greetAt:0};
  if(door){ const r=nearestRoad(door.x,door.y); s.path=r==null?null:[{x:(r%COLS)*T+T/2,y:Math.floor(r/COLS)*T+T/2}]; }
  return s;
}
function spawnStrollers(){
  strollers=[];
  if(!MAP.safe||MAP.interior||MAP.noStroll) return;   // (Elfhome has its own people, not Wrenford's peasants)
  roadsOf(); if(!roadList.length) return;
  const n=Math.round(STROLL.n*(1-darkness()));
  for(let i=0;i<n;i++) strollers.push(newStroller(false));
}
function updateStrollers(dt){
  if(!MAP.safe||MAP.interior||!roadList.length) return;
  // how many should be out: fewer as the light goes; the extra ones head home, new ones come out of doors
  strollT-=dt;
  if(strollT<=0){
    strollT=1.5+Math.random()*2;
    const want=Math.round(STROLL.n*(1-darkness())), out=strollers.filter(s=>!s.home);
    if(out.length>want){ const s=out[Math.floor(Math.random()*out.length)], ds=strollDoors();
      if(ds.length){ const d=ds.sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0]; s.home=d;
        const from=roadIdx(s.x,s.y), to=nearestRoad(d.x,d.y); s.path=(roadSet.has(from)&&to!=null&&roadPath(from,to))||[]; s.path.push({x:d.x,y:d.y}); s.wait=0; }
      else s.home={x:s.x,y:s.y}; }
    else if(out.length<want) strollers.push(newStroller(true));
  }
  const now=performance.now();
  for(const s of strollers){
    s.fade=Math.min(1,s.fade+dt*1.5);
    if(s.greet&&now-s.greetAt>2600) s.greet=null;
    const dw=Math.hypot(wiz.x-s.x,(wiz.y-s.y)*1.3);
    if(!s.greet&&dw<STROLL.greetR&&now-s.greetAt>STROLL.greetGap&&!strollers.some(o=>o.greet)&&!busy&&el.say.hidden&&Math.random()<dt*1.2){
      const L=MAP.greet&&MAP.greet.length?MAP.greet:GREET; s.greet=L[Math.floor(Math.random()*L.length)]; s.greetAt=now; if(!s.moving) s.face=wiz.x>s.x?1:-1; }
    if(!s.path||!s.path.length){
      if(s.home){ s.gone=true; continue; }                      // in through the door
      s.moving=false; s.wait-=dt; if(s.wait>0) continue;
      s.wait=Math.random()<0.35?2+Math.random()*5:0.3+Math.random();   // now and then a longer stop, to look about
      const from=roadIdx(s.x,s.y);
      const near=roadList.filter(r=>{ const d=Math.hypot((r%COLS)*T-s.x,Math.floor(r/COLS)*T-s.y); return d>T*4&&d<T*16; });
      const to=near[Math.floor(Math.random()*near.length)];
      s.path=roadSet.has(from)&&to!=null?roadPath(from,to):null;
      if(!s.path){ const r=nearestRoad(s.x,s.y); s.path=r==null?[]:[{x:(r%COLS)*T+T/2,y:Math.floor(r/COLS)*T+T/2}]; }
      continue;
    }
    const p=s.path[0], dx=p.x-s.x, dy=p.y-s.y, len=Math.hypot(dx,dy);
    if(len<6){ s.path.shift(); continue; }
    const step=Math.min(len,s.speed*dt); s.x+=dx/len*step; s.y+=dy/len*step;
    s.moving=true; s.walk+=dt*5; if(Math.abs(dx)>3) s.face=dx>0?1:-1;
    if(s.home&&s.path.length===1&&len<30) s.fade=Math.min(s.fade,len/30);   // stepping indoors
  }
  strollers=strollers.filter(s=>!s.gone);
}
function drawStroller(s,t){
  const img=s.img; if(!img.complete||!img.naturalWidth) return;
  const h=s.h, w=h*img.naturalWidth/img.naturalHeight, bob=s.moving?Math.abs(Math.sin(s.walk))*2.5:0;
  ctx.save(); ctx.globalAlpha=s.fade;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x,s.y-2,w*0.3,5,0,0,Math.PI*2); ctx.fill();
  ctx.translate(s.x,s.y-bob); if(s.face<0) ctx.scale(-1,1);
  if(s.moving) ctx.rotate(Math.sin(s.walk)*0.025);               // a little sway as they walk
  ctx.drawImage(img,-w/2,-h,w,h);
  ctx.restore();
}
// greetings are drawn last (over buildings and the night) at a fixed size on screen, not in world
// pixels: zoomed out on a phone a 9 px world font came out about 5 px and couldn't be read
const GREET_PX=15;                                             // the bubble's text size on screen
function drawGreetings(cw){
  for(const s of strollers){
    if(!s.greet||!s.img.naturalWidth) continue;
    const a=Math.max(0,Math.min(1,(2600-(performance.now()-s.greetAt))/400))*s.fade; if(a<=0) continue;
    const k=1/zoom, fs=GREET_PX*k;                             // screen px → world units
    ctx.save(); ctx.globalAlpha=a; ctx.font=`${fs.toFixed(2)}px Cinzel, serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    const tw=ctx.measureText(s.greet).width+12*k, bh=fs+10*k;
    const bx=Math.max(cam.x+tw/2+4*k,Math.min(cam.x+cw-tw/2-4*k,s.x)), by=Math.max(cam.y+bh+4*k,s.y-s.h-6*k);   // keep it on screen
    ctx.fillStyle='rgba(250,240,215,0.95)'; ctx.strokeStyle='rgba(60,40,20,0.85)'; ctx.lineWidth=1.5*k;
    ctx.beginPath(); ctx.rect(bx-tw/2,by-bh,tw,bh); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx-5*k,by); ctx.lineTo(bx+5*k,by); ctx.lineTo(bx,by+6*k); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#3a2810'; ctx.fillText(s.greet,bx,by-bh/2); ctx.restore();
  }
}
function drawClashes(t){                           // a crew and Echoes trading blows: sparks and steel
  for(const k of clashes){
    const e=(t-k.t0)/1000;
    for(let i=0;i<6;i++){
      const a=e*7+i*1.05, r=10+((e*40+i*13)%26);
      ctx.fillStyle=i%2?'rgba(255,230,160,0.9)':'rgba(255,140,60,0.8)';
      ctx.fillRect(k.x+Math.cos(a)*r,k.y-30+Math.sin(a)*r*0.6,3,3);
    }
    if(Math.floor(e*3)%2===0){ ctx.font='bold 14px Cinzel, serif'; ctx.textAlign='center'; ctx.fillStyle='#ffe0a0'; ctx.fillText('⚔',k.x,k.y-60); }
  }
}
function drawEcho(a,t){
  const img=a.img; if(!img.complete||!img.naturalWidth) return;
  const h=WIZ_H*(a.strong?1.35:1.0), w=h*img.naturalWidth/img.naturalHeight;
  const bob=a.moving?Math.abs(Math.sin(a.walk))*3:Math.sin(t/500+a.e.x)*1.5;
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(a.x,a.y-2,w*0.32,6,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(a.x,a.y-bob); if(a.face<0) ctx.scale(-1,1);
  ctx.globalAlpha=a.e.el?0.88+0.12*Math.sin(t/180+a.e.y):1;          // Echoes flicker, a little
  ctx.drawImage(img,-w/2,-h,w,h);
  ctx.restore();
  if(a.n>1){                                                // how many in the group
    ctx.font='bold 13px Cinzel, serif'; ctx.textAlign='center';
    ctx.fillStyle='rgba(14,10,30,0.8)'; ctx.fillRect(a.x+w*0.25,a.y-h-4,22,17);
    ctx.fillStyle=a.e.el?SPILL[a.e.el][1]:'#ff8060'; ctx.fillText('×'+a.n,a.x+w*0.25+11,a.y-h+9);
  }
}
// the battle backdrop (backgrounds/<name>.jpg) for a fight here: a story room's own, else the place's
// (a room fights on its town's ground), Wrenford's by the time of day; anywhere else the ruined streets
const ARENA_ROOMS={undercroft:'wren_undercroft', undercroft2:'wren_orrery', lectures:'wren_schools', library:'library', remnant:'library'};
const ARENA_MAPS={hollowmere:'hollowmere', corvanthe_road:'road', elfhome:'road', spirewatch:'spirewatch', conductory:'spirewatch', collegium:'collegium', old_schools:'collegium',
  cindergate:'cindergate', crucible:'cindergate', heights:'heights', drift:'heights', drowned_quarter:'drowned', sunken_harbour:'drowned',
  quarry_ward:'quarry', deep_cut:'quarry', frostmarket:'frost', winter_fair:'frost', gloamside:'gloam', necropolis:'gloam'};
function arenaHere(){
  if(MAP.interior&&ARENA_ROOMS[MAP.type]) return ARENA_ROOMS[MAP.type];
  const id=MAP.id.startsWith('room:')?MAP.id.slice(5).split('#')[0]:MAP.id;
  if(id==='wrenford') return darkness()>0.5?'wren_quad':'wren_schools';
  return ARENA_MAPS[id]||'ruins';
}
// walk into an Echo: the battle plays on the duel screen, then we come back here
function fight(a){
  if(busy||typeof window.startExploreBattle!=='function') return;
  busy=true; keys.clear(); target=null; hideSay(); save();
  const foes=(a.e.wizard?[{key:a.e.wizard,wizard:true}]:[]).concat(a.e.foes.map(([key,level])=>({key,level})));
  const fighting=allies.slice();
  const text=a.e.band?{winTitle:cap(a.e.band.name)+' Broken', win:a.e.band.beaten+' They scatter, leaving their purse and their haul.'}
    :a.e.party?{winTitle:'The Crew Breaks', win:'They scatter into the dark streets, leaving their takings behind.'}:null;
  fade(true).then(()=>{
    running=false; el.root.classList.remove('active'); fade(false); syncMusic();
    const key=wizKeys[wizIdx];
    if(key==='hero'&&typeof CHAR_DEFS!=='undefined') CHAR_DEFS.hero=chars.hero;
    window.startExploreBattle({wizKey:key, foes, hp:hpOf(key), allies:fighting.map(x=>({key:x.key,level:x.level,name:x.name,hp:x.hp,wizard:x.wizard,known:x.wizard&&Year?Year.allyKnown(x,folkApi):undefined})), text, arena:arenaHere(),
      onEnd:(won,low,allyHp)=>afterFight(a,won,low,key,fighting,allyHp)});
  });
}
function afterFight(a,won,low,key,fighting,allyHp){
  el.root.classList.add('active'); running=true; busy=false; resize(); syncMusic();
  navGrid=null;                                // the door may have just opened
  clock=(clock+20)%1440;                       // a fight takes a while
  if(won) vit[key]=Math.max(1,Math.round(Math.min(isFinite(low)?low:hpOf(key),hpOf(key))));
  else vit[key]=Math.max(1,Math.round(maxHp(key)*0.25));
  renderHp();
  // allies who fought: they keep their wounds; the fallen are gone
  (allyHp||[]).forEach((hp,i)=>{ const al=fighting[i]; if(!al) return; if(hp<=0){ allies=allies.filter(x=>x!==al); toast(al.name+' fell. You leave them where they lie.'); } else al.hp=hp; });
  if(a.e.band){ afterBandFight(a,won); }
  if(won&&a.e.incident){ actors=actors.filter(x=>x!==a); a.e.onWin&&a.e.onWin(); grace=ECHO.grace; }
  else if(won&&a.e.band){ grace=ECHO.grace; }
  else if(won&&a.e.party){
    roomState().done=true; actors=actors.filter(x=>x!==a); gold+=(MAP.ev||{}).gold||0;
    toast('+'+((MAP.ev||{}).gold||0)+' gold from their packs'); grace=ECHO.grace;
  } else if(won){
    cleared[MAP.id+':'+a.e.id]=Date.now();
    actors=actors.filter(x=>x!==a);
    const got=a.e.foes.reduce((n,[k])=>n+SPILL_YIELD[k.endsWith('_strong')?'strong':'weak'],0);
    spill[a.e.el]=(spill[a.e.el]||0)+got;
    toast('+'+got+' '+SPILL[a.e.el][0]);
    grace=ECHO.grace;
  } else {
    const p=MAP.spawns.gate||MAP.spawns.start||Object.values(MAP.spawns)[0];
    wiz.x=p[0]; wiz.y=p[1];
    if(MAP.interior) setTimeout(()=>takeExit({to:'out'}),50);     // thrown out into the street
    a.x=a.e.x; a.y=a.e.y; a.tx=a.x; a.ty=a.y;
    toast('You come to, singed and aching, with a quarter of your strength. Find somewhere to rest.');
    grace=ECHO.grace*2;
  }
  if(Year) Year.afterFight(folkApi,{won, party:!!a.e.party, incident:a.e.incident||null, map:MAP.id, type:MAP.type});
  renderSpill(); save();
  last=performance.now(); requestAnimationFrame(frame);
}
function renderHp(){
  if(!el.hp||!chars) return;
  const key=wizKeys[wizIdx], hp=hpOf(key), mx=maxHp(key), f=hp/mx;
  el.hp.querySelector('i').style.width=Math.round(f*100)+'%';
  el.hp.querySelector('i').style.background=f>0.6?'#4caf50':f>0.3?'#e0a030':'#d04040';
  el.hp.querySelector('b').textContent=hp+'/'+mx;
  el.hp.title='HP '+hp+' of '+mx+(hp<mx?': rest at the Wren\'s Nest in Wrenford, the Drowned Crow in Hollowmere, or a gleaner camp':'');
}
function renderClock(){
  if(!el.night) return;
  const d=darkness();
  const SUN='\u2600\uFE0E', MOON='\u263E\uFE0E';   // text forms, never emoji
  el.night.textContent=lightMode==='day'?SUN+' Day':lightMode==='night'?MOON+' Night':(d>0.5?MOON:d>0?'\u25D0':SUN)+' '+clockLabel();
}
function renderSpill(){
  if(!el.spill) return;
  const keys=Object.keys(spill).filter(k=>spill[k]>0);
  const parts=keys.map(k=>`<span title="${SPILL[k][0]}"><i style="background:${SPILL[k][1]}"></i>${spill[k]}</span>`);
  if(gold) parts.unshift(`<span title="gold"><i style="background:#f0c040;border-radius:50%;transform:none"></i>${gold}</span>`);
  if(potions) parts.push(`<span title="potions">🧪${potions}</span>`);
  if(allies.length) parts.push(`<span title="allies">⚔${allies.length}</span>`);
  el.spill.hidden=!parts.length;
  el.spill.innerHTML=parts.join('');
  el.spill.title='What you carry (tap)';
}


// ═══ DOORS AND ROOMS ═══════════════════════════════════════════════
// Every house front, tavern, chapel and the like can be entered (js/explore_rooms.js builds the room
// from its seed). Some are always the same place (FIXED_DOORS).
const DOOR_BASES = ['house1','house2','house3','house4','house5','house6','tavern','chapel','hall','temple','townhouse','forge','tiltedHouse','sunkHouse','mausoleum','tower',
  'tomb','tombGrand','spireTower','foundry'];
const FIXED_LABEL = {safehouse:'Enter the Gleaners\' Rest', inn:'Enter the Drowned Crow', library:'Enter the Collegium Library',
  wrenInn:'Enter the Wren\'s Nest', remnant:'Enter the Remnant Library', lab:'Enter the Warded Laboratory', lectures:'Enter the Examination Schools',
  wenna:'Knock at Wenna\'s Bakehouse', lamplighter:'Knock at the Lamplighter\'s House'};
const CITY_MAPS = ['cindergate','heights','spirewatch','collegium','drowned_quarter','quarry_ward','frostmarket','gloamside'];
function findDoors(){
  doors=[];
  if(MAP.interior) return;
  const bases=MAP.safe?DOOR_BASES.concat('watchTower'):DOOR_BASES;      // a safe town's towers have doors too
  const fronts=objs.filter(o=>!o.decal&&bases.includes(P.baseKind(o.kind)));
  const fixed={};
  const nearestTo=(x,y,test)=>fronts.filter(test).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  const tav=fronts.find(o=>o.lore==='tavern');
  if(MAP.id==='hollowmere'&&tav) fixed[tav.id]='inn';
  if(MAP.id==='cindergate'&&tav) fixed[tav.id]='safehouse';
  if(MAP.id==='cindergate'){ const w=nearestTo(28*T,38*T,o=>/^house/.test(o.kind)&&o!==tav); if(w) fixed[w.id]='wenna'; }
  if(MAP.id==='collegium'){ const h=fronts.find(o=>P.baseKind(o.kind)==='hall'); if(h) fixed[h.id]='library'; }
  if(MAP.id==='wrenford') for(const o of fronts){ const f={inn:'wrenInn', library:'remnant', lab:'lab'}[o.lore]; if(f) fixed[o.id]=f; }
  if(MAP.id==='gloamside'){ const sp=MAP.spawns.west||[0,0], l=nearestTo(sp[0],sp[1],o=>/^house/.test(o.kind)); if(l) fixed[l.id]='lamplighter'; }
  const els={}; for(const e of MAP.echoes||[]) els[e.el]=(els[e.el]||0)+1;
  const el=Object.keys(els).sort((a,b)=>els[b]-els[a])[0]||'fire';
  if(MAP.id==='wrenford') for(const o of fronts){ if(o.lore==='schools') fixed[o.id]='lectures'; }
  objs=objs.filter(o=>!o.yearDoor); bridges=bridges.filter(o=>!o.yearDoor);
  if(Year) for(const d of Year.doors(folkApi)){
    const mark={kind:'trapdoor', x:d.x, y:d.y-6, id:'yd:'+d.id, decal:true, fb:[], scale:0.3, yearDoor:true};
    if(rects.trapdoor){ objs.push(mark); bridges.push(mark); }
    doors.push({x:d.x, y:d.y, label:d.label,
    spec:{id:'room:'+MAP.id+'#'+d.id, base:'crypt', outside:{map:MAP.id,x:d.x,y:d.y-8}, el:d.el||'dark', depth:0, city:false, ruined:false,
      fixed:d.type, ev:d.ev||null, label:d.name, wizards:[], safe:true}});
  }
  for(const o of fronts){
    const base=P.baseKind(o.kind), f=fixed[o.id];
    // how near the Wound: by height on the map, within the map's own range (an inner district's is 0.55–1)
    const dr=MAP.depth||[0,1], depth=dr[0]+(dr[1]-dr[0])*Math.max(0,Math.min(1,(1-o.y/WORLD_H)*1.15-0.12));
    const ruined=/_(burnt|char)$/.test(o.kind)||['house5','house6','tiltedHouse','sunkHouse'].includes(base);
    const spec={id:'room:'+MAP.id+'#'+o.id, base, outside:{map:MAP.id,x:o.x,y:o.y+6}, el, depth, city:CITY_MAPS.includes(MAP.id)||!!MAP.city,
      ruined, fixed:f||null, wizards:wizKeys.filter(k=>k!=='hero'), safe:!!MAP.safe};
    doors.push({x:o.x, y:o.y+14, spec, obj:o, label:f?FIXED_LABEL[f]:'Enter'});
  }
}
function enterDoor(dr){
  roomSpec=Object.assign({},dr.spec,{wizards:Object.keys(chars).filter(k=>k.startsWith('rogue_'))});   // a rival crew in a room is led by a bandit mage
  enterMap(roomSpec.id,'door').then(()=>{ grace=1.5; });
}
function roomState(){ return rooms[MAP.id]||(rooms[MAP.id]={}); }
function removeObj(o){ objs=objs.filter(x=>x!==o); boxes=boxes.filter(b=>!o.lb||!o.lb.includes(b)); }
// a room's state: what you already took, who you already met
function applyRoomState(){
  if(!MAP.interior) return;
  const st=roomState();
  if(st.done){ objs.filter(o=>o.lore==='ev').forEach(removeObj); npcs.forEach(n=>{ if(n.role==='party'||n.role==='wounded') n.gone=true; }); }
  if(st.taken) objs.filter(o=>o.lore==='ev').forEach(removeObj);
}

// ── dialogs: the inspect box with buttons ──
// sayFace: whose face the box shows (set by inspect() when you talk to someone, null for things)
let sayFace=null;
function setSayFace(src){
  const f=el.say.querySelector('.ex-say-face');
  if(src){ f.onerror=()=>{ f.hidden=true; el.say.classList.remove('has-face'); }; f.src=src; f.hidden=false; el.say.classList.add('has-face'); }
  else { f.hidden=true; f.removeAttribute('src'); el.say.classList.remove('has-face'); }
}
function showDialog(title,text,choices){
  setSayFace(sayFace);
  el.say.querySelector('.ex-say-name').textContent=title;
  el.say.querySelector('.ex-say-text').textContent=text;
  el.say.querySelectorAll('.ex-rest,.ex-choice').forEach(b=>b.remove());
  const row=document.createElement('div'); row.className='ex-choice';
  for(const c of choices||[]){
    const b=document.createElement('button'); b.className='ex-btn'; b.type='button'; b.textContent=c.label; b.disabled=!!c.disabled;
    b.onclick=ev=>{ ev.stopPropagation(); hideSay(); c.fn&&c.fn(); renderSpill(); renderHp(); save(); };
    row.appendChild(b);
  }
  if(choices&&choices.length) el.say.appendChild(row);
  el.say.hidden=false; el.hint.classList.add('fade');
}
const heal=(key,amt)=>{ vit[key]=Math.min(maxHp(key),hpOf(key)+amt); };
function drinkPotion(){ if(potions<1) return; const key=wizKeys[wizIdx]; potions--; heal(key,Math.ceil(maxHp(key)*POTION_HEAL)); toast('You drink the potion. Warmth spreads through you.'); }
function restFull(morning){ const key=wizKeys[wizIdx]; vit[key]=maxHp(key); allies.forEach(a=>a.hp=null); if(morning) clock=7*60; renderClock(); }
const buyPotion=price=>({label:'Buy a potion ('+price+' gold)', disabled:gold<price, fn:()=>{ gold-=price; potions++; toast('A potion, wrapped in a rag.'); }});

// ── townsfolk (js/explore_folk.js): what they need to act on the world ──
const Folk = window.ExploreFolk||null;
const Year = window.ExploreYear||null;    // the University Year's terms, lectures, exams, clubs and plot (js/explore_year.js)
const Lecture = window.ExploreLecture||null;  // the lecture theatre's decor and the lectures played in it (js/explore_lecture.js)
// a scene: a little scripted play on the map (a lecture). While one runs you don't walk, the clock
// stops, taps and E go to it and Escape skips it; it adds its own actors, effects and camera.
// scene = {update(dt), actors() → [{y, draw(ctx,t)}], over(ctx,t,view), cam(vw,vh,baseZoom) → {x,y,zoom}, dim(), shake(), tap(), skip()}
let scene=null, sceneBlend=0, sceneLast=null, sceneDrag=null, scenePan={x:0,y:0,t:0};   // dragging looks around; it eases back to the action 3 s after you let go
function setScene(s){ scene=s||null; sceneDrag=null; scenePan={x:0,y:0,t:0}; busy=!!s; keys.clear(); target=null; if(s){ hideSay(); el.act.hidden=true; el.look.hidden=true; el.hint.classList.add('fade'); } else { wiz.seated=false; sayFace=null; last=performance.now(); } }
const folkApi = {
  get chars(){ return chars; }, get fighters(){ return fighters; },
  wizKey:()=>wizKeys[wizIdx], wizName:()=>{ const n=chars[wizKeys[wizIdx]].name; return n.charAt(0)+n.slice(1).toLowerCase(); },
  dialog:(t,x,ch)=>showDialog(t,x,ch), toast:m=>toast(m), save:()=>{ renderSpill(); renderHp(); save(); },
  quest:id=>quests[id]||(quests[id]={}), booksRead:()=>booksRead, lore:k=>(MAP.lore||{})[k],
  gold:()=>gold, addGold:n=>{ gold=Math.max(0,gold+n); }, addPotions:n=>{ potions+=n; },
  hp:()=>hpOf(wizKeys[wizIdx]), maxHp:()=>maxHp(wizKeys[wizIdx]), healFull:()=>{ restFull(false); renderHp(); save(); },
  spillTotal:()=>Object.values(spill).reduce((a,n)=>a+n,0),
  addSpill:(e,n)=>{ spill[e]=(spill[e]||0)+n; },
  takeSpill:n=>{ for(const k of Object.keys(spill).sort((a,b)=>spill[b]-spill[a])){ const t=Math.min(n,spill[k]); spill[k]-=t; n-=t; if(!n) break; } },
  sellSpill:price=>{ const n=Object.values(spill).reduce((a,v)=>a+v,0); spill={}; gold+=n*price; return n*price; },
  removeObj:o=>removeObj(o),
  spar:o=>spar(o),
  // the University Year: what the hero knows (null when walking as a roster wizard, who knows it all)
  magic:()=>wizKeys[wizIdx]==='hero'?magic:null, homeElem:()=>hero&&hero.elem, barred:()=>hero&&oppOf(hero.elem),
  get elems(){ return ELEM_IDS; }, get glyphSets(){ return GLYPH_SETS; }, get glyphs(){ return GLYPHS; },
  learn:o=>{ if(wizKeys[wizIdx]==='hero') learn(o); }, graduate:els=>graduate(els),
  primer:id=>primerTest(id), practise:o=>practise(o),
  // the Year's own needs (js/explore_year.js)
  battle:o=>battle(o), mapId:()=>MAP&&MAP.id, interior:()=>!!(MAP&&MAP.interior), clock:()=>clock, night:()=>darkness()>0.5,
  setClock:m=>{ clock=((m%1440)+1440)%1440; renderClock(); },
  addNpc:n=>{ if(!npcs.some(x=>x.role===n.role&&!x.gone)) npcs.push(Object.assign({},n)); },
  dropNpc:role=>{ npcs.forEach(n=>{ if(n.role===role) n.gone=true; }); },
  spawnEcho:e=>spawnIncidentEcho(e),
  dropEcho:id=>{ actors=actors.filter(a=>!(a.e.incident===id)); },
  registerChar:(key,d)=>{ chars[key]=d; if(typeof CHAR_DEFS!=='undefined') CHAR_DEFS[key]=d; },
  hero:()=>hero, heroDef:rec=>window.ExploreHero?window.ExploreHero.def(rec):Promise.resolve(null),
  reveal:id=>{ found.add(id); }, openForest:o=>{ hideSay(); openForest(o); }, allies:()=>allies, addAlly:a=>{ if(!allies.some(x=>x.key===a.key)) allies.push(Object.assign({level:0,hp:null},a)); },
  bodies:()=>wizKeys[wizIdx]==='hero', walkTo:(x,y)=>{ wiz.x=x; wiz.y=y; },
  enterMap:(id,at)=>enterMap(id,at), fullMagic:()=>!!(magic&&magic.grad), refreshDoors:()=>{ if(MAP&&!MAP.interior) findDoors(); },
  earnTopper:(id,how)=>earnTopper(id,how), hasTopper:id=>toppers.includes(id)||!!(window.ExploreHero&&ExploreHero.STARTER_TOPPERS.includes(id)),
  topperName:id=>{ const t=window.ExploreHero&&ExploreHero.TOPPERS.find(q=>q.id===id); return t?t.name:id; },
  heal:n=>{ heal(wizKeys[wizIdx],n); renderHp(); },
  // scenes (a lecture, js/explore_lecture.js)
  scene:s=>setScene(s), room:()=>MAP, img:src=>imgOf(src), face:src=>{ sayFace=src||null; }, WIZ_H,
  seat:(x,y,face,lift,scale,crop)=>{ wiz.x=x; wiz.y=y; wiz.face=face||1; wiz.seated=true; wiz.seatLift=lift||0; wiz.seatScale=scale||1; wiz.seatCrop=crop||SEAT_CROP; wiz.moving=false; },
  stand:(x,y)=>{ wiz.seated=false; if(x!=null){ wiz.x=x; wiz.y=y; } },
  wizPos:()=>({x:wiz.x, y:wiz.y, face:wiz.face, glow:wizGlow}),
  passTime:m=>{ clock=(clock+m)%1440; renderClock(); },
};
// a practice bout (the Schools, the Laboratory): fought at full strength, and you come back as you went
// in (the University's healers see to that); nothing is lost on a defeat
function spar({foes, text, onWin, onLose, fists, allies:al}){
  if(busy||typeof window.startExploreBattle!=='function') return;
  busy=true; keys.clear(); target=null; hideSay(); save();
  const key=wizKeys[wizIdx], before=hpOf(key);
  fade(true).then(()=>{
    running=false; el.root.classList.remove('active'); fade(false); syncMusic();
    if(key==='hero'&&typeof CHAR_DEFS!=='undefined') CHAR_DEFS.hero=chars.hero;
    window.startExploreBattle({wizKey:key, foes, hp:maxHp(key), allies:al||[], text, fists, arena:arenaHere(),
      onEnd:won=>{
        el.root.classList.add('active'); running=true; busy=false; resize(); syncMusic();
        clock=(clock+20)%1440; vit[key]=Math.max(before,1);
        if(won){ onWin&&onWin(); } else { onLose&&onLose(); }
        renderHp(); renderSpill(); save(); grace=1.5;
        last=performance.now(); requestAnimationFrame(frame);
      }});
  });
}

// the Keeper's primer test (js/explore_study.js): resolves {passed, score, of}
async function primerTest(id){
  if(busy||!window.ExploreStudy) return {passed:false};
  busy=true; keys.clear(); target=null; hideSay();
  try{ return await window.ExploreStudy.primer(el.root,{id, keeper:'Mr Quill'}); }
  finally{ busy=false; last=performance.now(); }
}
// a Laboratory practical: one cast's minigame, outside any battle (game.js practiseCast); resolves ok
function practise(o){
  if(busy||typeof window.practiseCast!=='function') return Promise.resolve(false);
  busy=true; keys.clear(); target=null; hideSay();
  return new Promise(res=>{
    fade(true).then(()=>{
      running=false; el.root.classList.remove('active'); fade(false);
      window.practiseCast(Object.assign({known:magic},o), ok=>{
        el.root.classList.add('active'); running=true; busy=false; resize();
        last=performance.now(); requestAnimationFrame(frame);
        res(ok);
      });
    });
  });
}

// a real fight from a story or an incident (not a spar): wounds carry, as in any fight on the map; a loss
// leaves you at a quarter of your HP where you stand (Wrenford is safe), and the clock moves on
function battle({foes, allies:al, text, onWin, onLose, fists}){
  if(busy||typeof window.startExploreBattle!=='function') return;
  busy=true; keys.clear(); target=null; hideSay(); save();
  const key=wizKeys[wizIdx];
  fade(true).then(()=>{
    running=false; el.root.classList.remove('active'); fade(false); syncMusic();
    if(key==='hero'&&typeof CHAR_DEFS!=='undefined') CHAR_DEFS.hero=chars.hero;
    window.startExploreBattle({wizKey:key, foes, hp:hpOf(key), allies:al||[], text, fists, arena:arenaHere(),
      onEnd:(won,low)=>{
        el.root.classList.add('active'); running=true; busy=false; resize(); syncMusic();
        clock=(clock+20)%1440; navGrid=null;
        if(won) vit[key]=Math.max(1,Math.round(Math.min(isFinite(low)?low:hpOf(key),hpOf(key))));
        else vit[key]=Math.max(1,Math.round(maxHp(key)*0.25));
        if(won){ onWin&&onWin(); } else { onLose&&onLose(); }
        renderHp(); renderSpill(); save(); grace=ECHO.grace;
        last=performance.now(); requestAnimationFrame(frame);
      }});
  });
}
// an incident's Echo (the Year): roams near its spot and charges like any; onWin when it's beaten
function spawnIncidentEcho(e){
  if(actors.some(a=>a.e.incident===e.id)) return;
  const strong=echoLeader(e).endsWith('_strong');
  actors.push({e:Object.assign({r:60},e,{incident:e.id}), x:e.x, y:e.y, tx:e.x, ty:e.y, wait:1, face:-1, walk:0,
    strong, img:imgOf('sprites/echoes/'+e.el+'_'+(strong?'strong':'weak')+'.png'), n:e.foes.length});
}

// things in rooms: returns true if it handled the inspect
function roomAct(o){
  if(!MAP.interior) return false;
  const ev=MAP.ev||{}, st=roomState(), key=wizKeys[wizIdx];
  if(o.lore&&o.lore.startsWith('book:')){
    const id=o.lore.slice(5), L=MAP.lore[o.lore], fresh=!booksRead.includes(id);
    if(fresh) booksRead.push(id);
    showDialog(L[0],L[1]+(fresh?'\n\n(Lore found: '+booksRead.length+' of '+window.ExploreRooms.BOOKS.length+')':''),[]);
    save(); return true;
  }
  if(o.lore==='ev'&&ev.type==='treasure'){
    showDialog(MAP.lore.ev[0],MAP.lore.ev[1],[{label:ev.chest?'Open it':'Take it', fn:()=>{
      gold+=ev.gold; if(ev.potion) potions++; st.taken=true; removeObj(o);
      toast('+'+ev.gold+' gold'+(ev.potion?' and a potion':''));
    }}]); return true;
  }
  if(o.lore==='ev'&&ev.type==='spill'){
    showDialog(MAP.lore.ev[0],MAP.lore.ev[1],[{label:'Prise it loose', fn:()=>{
      spill[ev.el]=(spill[ev.el]||0)+ev.n; st.taken=true; removeObj(o); toast('+'+ev.n+' '+SPILL[ev.el][0]);
    }}]); return true;
  }
  if(o.lore==='shop'){ showDialog(MAP.lore.shop[0],MAP.lore.shop[1],[buyPotion(POTION_PRICE.shop)]); return true; }
  if(o.lore==='rest'){
    const L=MAP.lore.rest, ch=[{label:'🛏 Rest till morning ('+hpOf(key)+' → '+maxHp(key)+' HP)', disabled:hpOf(key)>=maxHp(key)&&allies.every(a=>a.hp==null), fn:()=>{ restFull(true); toast(MAP.type==='safehouse'?'You sleep by Marda\'s fire. Nothing comes to the door.':'You sleep in a real bed. It is morning.'); }}];
    if(MAP.type==='wrenInn') ch.push(buyPotion(POTION_PRICE.shop));
    if(MAP.type==='safehouse'){
      ch.push(buyPotion(POTION_PRICE.safehouse));
      rescues.forEach((rs,i)=>ch.push({label:'Tell Marda about '+rs.name, fn:()=>{
        rescues.splice(i,1); gold+=15; potions++; (rooms[rs.room]||(rooms[rs.room]={})).done=true;
        toast('Marda sends two of hers for '+rs.name+'. She presses 15 gold and a potion on you.');
      }}));
    }
    showDialog(L[0],L[1],ch); return true;
  }
  return false;
}

// ── people in rooms ──
const NPC_SPRITE = {wenna:'sprites/echoes/fire_weak.png', lamplighter:'sprites/echoes/air_weak.png'};   // stand-ins until their own art
const NPC_FACE = {wenna:'echo_fire_weak', lamplighter:'echo_air_weak'};                          // ditto
function npcFace(n){
  if(fatBulldog(n)) return FAT_BULLDOG.face;
  if(Folk&&Folk.knows(n.role)) return Folk.face(n,folkApi);
  const k=n.role==='wounded'?(MAP.ev||{}).key:NPC_FACE[n.role];
  return k?'portraits/small/'+k+'.jpg':null;
}
function npcTitle(n){ const ev=MAP.ev||{};
  if(Folk&&Folk.knows(n.role)) return Folk.title(n,folkApi);
  return n.role==='wounded'?ev.name+', wounded':n.role==='wenna'?'Wenna the Baker':n.role==='lamplighter'?'The Lamplighter':'Someone'; }
function talkTo(n){
  if(Folk&&Folk.knows(n.role)){ Folk.talk(n,folkApi); return; }
  const ev=MAP.ev||{}, st=roomState();
  if(n.role==='wounded'){
    if(ev.mode==='join'){
      showDialog(ev.name+', wounded', ev.name+' is propped against the wall, a leg bound with a torn sleeve. "Don\'t. I\'m done fighting. My crew left me." A pause. "Take me with you? I can still '+(ev.key==='archer'?'draw a bow':'swing a sword')+'."',[
        {label:'Take '+ev.name+' with you', disabled:allies.length>=MAX_ALLIES, fn:()=>{ allies.push({key:ev.key, level:0, name:ev.name, hp:null}); st.done=true; n.gone=true; toast(ev.name+' limps after you. (Allies fight beside you when there is room.)'); }},
        {label:'Leave them some bread', fn:()=>{ st.done=true; }}]);
    } else {
      const promised=rescues.some(r=>r.room===MAP.id);
      showDialog(ev.name+', wounded', promised?'"You\'ll tell Marda? At the Gleaners\' Rest, inside the Wardgate. Please."':
        ev.name+' cannot stand. "There\'s a safe house in Cindergate, the Gleaners\' Rest. Tell old Marda where I am. She\'ll send someone. She always sends someone."',
        promised?[]:[{label:'I\'ll tell her', fn:()=>{ rescues.push({name:ev.name, room:MAP.id, where:roomSpec&&roomSpec.outside.map}); toast('Find Marda at the Gleaners\' Rest, in Cindergate.'); }}, {label:'Not my problem'}]);
    }
    return;
  }
  if(n.role==='wenna'){
    showDialog('Wenna the Baker','A round woman of ember-light, kneading dough that glows. "Customers! Nobody comes any more but the gleaners, and they never pay." She doesn\'t seem to know what she is. "Bring me two of the little orange stones and you shall have a loaf, still warm."',[
      {label:'Trade 2 cinderglass for a loaf (+20 HP)', disabled:(spill.fire||0)<2, fn:()=>{ spill.fire-=2; heal(wizKeys[wizIdx],20); toast('The bread is hot enough to burn. It is the best thing you have ever eaten.'); }},
      {label:'Ask about the city', fn:()=>showDialog('Wenna the Baker','"The Collegium bought forty loaves every Thursday. Then one Thursday the sky went white, and now it is always Thursday." She smiles. "Isn\'t that nice?"',[])}]);
    return;
  }
  if(n.role==='lamplighter'){
    showDialog('The Lamplighter','A tall, gentle figure of soft golden light, his pole still in his hand. "Every lamp in the city, every night. Somebody has to." He tips his hat. "The dark ones will trade for nightglass, if you have it. I will trade you light."',[
      {label:'Trade 2 nightglass for a potion', disabled:(spill.dark||0)<2, fn:()=>{ spill.dark-=2; potions++; toast('He pours a little of his own light into a bottle.'); }},
      {label:'Ask about Hollowmere\'s lanterns', fn:()=>showDialog('The Lamplighter','"Hollowmere? I walk out there some nights. Old habits. They never see me, but the lamps get lit." He looks pleased. "Somebody has to."',[])}]);
    return;
  }
}
// someone standing about: not gone, and not the wizard you're playing (ExploreFolk.absent)
function present(n){ return !n.gone&&!(Folk&&Folk.absent(n,folkApi)); }
// fat Bulldogs (by request): about half of Wrenford's Bulldogs, picked once per Bulldog, are the fat one
const FAT_BULLDOG={sprite:'sprites/halberdier_fat.png', face:'portraits/small/halberdier_fat.jpg'};
function fatBulldog(n){ if(n._fat===undefined) n._fat=/^bulldog/.test(n.role)&&Math.random()<0.5; return n._fat; }
function drawNpc(n,t){
  let src=NPC_SPRITE[n.role];
  if(!src&&Folk&&Folk.knows(n.role)) src=fatBulldog(n)?FAT_BULLDOG.sprite:Folk.sprite(n,folkApi);
  if(n.role==='wounded'){ const f=fighters[(MAP.ev||{}).key]; src=f&&f.sprite; }
  if(!src) return;
  const img=imgOf(src); if(!img.complete||!img.naturalWidth) return;
  // an old 192×320 mage spritesheet (stand-ins for townsfolk without art): its first frame, 48×64, facing left
  const sheet=img.naturalWidth===192&&img.naturalHeight===320, sw=sheet?48:img.naturalWidth, sh=sheet?64:img.naturalHeight;
  const h=WIZ_H*(n.role==='wounded'?0.8:1.05)*(MAP.people||1), w=h*sw/sh;
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(n.x,n.y-2,w*0.3,5,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(n.x,n.y);
  if(n.role==='wounded'){ ctx.filter='saturate(0.5) brightness(0.85)'; ctx.scale(-1,0.8); }   // slumped, facing in
  else if(NPC_SPRITE[n.role]) ctx.globalAlpha=0.9+0.1*Math.sin(t/200);                       // named Echoes shimmer; people don't
  if(sheet) ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,0,0,sw,sh,-w/2,-h,w,h);
  ctx.restore();
}

// ── the satchel: what you carry, who's with you, what you've found ──
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const crystalCache={};
function crystalSrc(elm){                      // the loot sheet's quintessence crystal, as a small image
  if(crystalCache[elm]) return crystalCache[elm];
  const q=rects['q_'+elm]; if(!q||!atlases[q[4]]) return '';
  const c=document.createElement('canvas'); c.width=q[2]; c.height=q[3];
  c.getContext('2d').drawImage(atlases[q[4]],q[0],q[1],q[2],q[3],0,0,q[2],q[3]);
  return crystalCache[elm]=c.toDataURL();
}
function allyMax(a){ if(a.wizard&&chars[a.key]) return chars[a.key].hp; const f=fighters[a.key]; return f?f.hp:30; }
function openBag(tab){ bagOpen=true; keys.clear(); target=null; hideSay(); if(tab) bagTab=tab; bagRead=null; bagConfirm=null; renderBag(); el.bag.hidden=false; }
function closeBag(){ bagOpen=false; el.bag.hidden=true; bagConfirm=null; }
function bar(hp,mx){ const f=Math.max(0,Math.min(1,hp/mx)); return `<span class="ex-bag-bar"><i style="width:${Math.round(f*100)}%;background:${f>0.5?'#5cc85c':f>0.25?'#e0b040':'#e05050'}"></i></span><small>${Math.round(hp)} / ${mx}</small>`; }
function renderBag(){
  const who=profileNow();
  el.bagWho.textContent=who.id==='guest'?'Guest (not saved to a profile)':who.name+'’s game';
  const tabs=[['pack','Pack'],['party','Companions'],['journal','Journal']];
  el.bagTabs.innerHTML=tabs.map(([k,n])=>`<button class="ex-bag-tab${bagTab===k?' on':''}" data-tab="${k}" type="button">${n}</button>`).join('');
  const key=wizKeys[wizIdx];
  let h='';
  if(bagTab==='pack'){
    h+=`<div class="ex-bag-row"><span class="ex-bag-coin"></span><b>${gold}</b> gold</div>`;
    h+=`<div class="ex-bag-row"><span class="ex-bag-ico">🧪</span><b>${potions}</b> potion${potions===1?'':'s'}<span class="ex-bag-sp"></span>`+
       `<button class="ex-btn" data-act="drink" type="button"${potions<1||hpOf(key)>=maxHp(key)?' disabled':''}>Drink (+${Math.round(POTION_HEAL*100)}% HP)</button></div>`;
    h+=`<div class="ex-bag-sec">Quintessence</div><div class="ex-bag-grid">`+RING_ELS.map(e=>{ const n=spill[e]||0;
      return `<div class="ex-bag-q${n?'':' none'}"><img src="${crystalSrc(e)}" alt=""><b>${n}</b><small style="color:${SPILL[e][1]}">${SPILL[e][0]}</small></div>`; }).join('')+`</div>`;
    h+=`<div class="ex-bag-note">Spill from broken Echoes. Wenna in Cindergate bakes with cinderglass; the Lamplighter in Gloamside trades for nightglass.</div>`;
  } else if(bagTab==='party'){
    const wizzes=wizKeys.filter(k=>k===key||(vit[k]!=null&&vit[k]<maxHp(k)));
    h+=`<div class="ex-bag-sec">Wizards</div>`+wizzes.map(k=>`<div class="ex-bag-row"><img class="ex-bag-face" src="${faceSrc(k)}" alt=""><span class="ex-bag-name">${esc(chars[k].name)}${k===key?' <em>(walking)</em>':''}</span>${bar(hpOf(k),maxHp(k))}</div>`).join('');
    if(hero) h+=`<div class="ex-bag-row"><span class="ex-bag-name"><small>${esc(hero.name)}, ${esc(chars.hero.title)}</small></span><button class="ex-btn" data-act="look" type="button">Change look</button></div>`+
      `<div class="ex-bag-note">${esc(magicLine())}</div>`;
    h+=`<div class="ex-bag-note">Wounds carry from fight to fight. Rest at an inn or a gleaner camp, or drink a potion.</div>`;
    h+=`<div class="ex-bag-sec">Allies · ${allies.length} / ${MAX_ALLIES}</div>`;
    h+=allies.length?allies.map((a,i)=>{ const f=fighters[a.key]||{}, mx=allyMax(a);
      return `<div class="ex-bag-row"><img class="ex-bag-face" src="${a.wizard?faceSrc(a.key):'portraits/small/'+esc(a.key)+'.jpg'}" alt=""><span class="ex-bag-name">${esc(a.name)}<small>${esc(f.title||f.name||a.key)}</small></span>${bar(a.hp==null?mx:a.hp,mx)}`+
        `<button class="ex-btn" data-act="dismiss" data-i="${i}" type="button">${bagConfirm==='dismiss'+i?'Sure?':'Send home'}</button></div>`; }).join('')
      :'<div class="ex-bag-empty">Nobody. Wounded gleaners in the ruins may join you.</div>';
  } else {
    const quest=Folk?Folk.journal(folkApi).split('\n').filter(Boolean).map(l=>`<div class="ex-bag-task">${esc(l)}</div>`).join(''):'';
    h+=`<div class="ex-bag-sec">Tasks</div>`+quest+(rescues.length?rescues.map(r=>`<div class="ex-bag-task">Tell Old Marda at the Gleaners’ Rest, in Cindergate, that <b>${esc(r.name)}</b> is alive${r.where&&MAP_NAMES[r.where]?' in '+MAP_NAMES[r.where]:''}.</div>`).join('')
      :quest?'':'<div class="ex-bag-empty">Nothing promised.</div>');
    const places=Object.keys(MAP_NAMES);
    h+=`<div class="ex-bag-sec">Places · ${places.filter(p=>visited.has(p)).length} / ${places.length}</div><div class="ex-bag-places">`+
      places.map(p=>`<span class="${visited.has(p)?'':'none'}">${visited.has(p)?esc(MAP_NAMES[p].replace(/^the /,'The ')):'???'}</span>`).join('')+`</div>`;
    const met=window.ExploreBands?window.ExploreBands.BANDS.filter(b=>bandState[b.id]&&bandState[b.id].met):[];
    if(met.length){
      const now=Date.now(), R=window.ExploreBands.BAND_RULES;
      h+=`<div class="ex-bag-sec">Warbands</div>`+met.map(b=>{ const st=bandState[b.id];
        const how=st.beaten&&now-st.beaten<R.respawnMs?'broken, for now':st.tollUntil>now?(st.robbed?'robbed you blind':'paid off, for now'):b.mood==='hostile'?'out for blood':'want their toll';
        return `<div class="ex-bag-task"><b style="color:${b.col}">${esc(cap(b.name))}</b> · ${esc(MAP_NAMES[b.map]||b.map)} · ${how}</div>`; }).join('');
    }
    const B=window.ExploreRooms.BOOKS, read=B.filter(b=>booksRead.includes(b.id));
    h+=`<div class="ex-bag-sec">Lore · ${read.length} / ${B.length}</div>`;
    if(bagRead){ const b=B.find(x=>x.id===bagRead); h+=`<div class="ex-bag-book"><b>${esc(b.title)}</b><p>${esc(b.text)}</p><button class="ex-btn" data-act="unread" type="button">← All lore</button></div>`; }
    else h+=read.length?`<div class="ex-bag-books">`+read.map(b=>`<button class="ex-bag-bk" data-book="${b.id}" type="button">📜 ${esc(b.title)}</button>`).join('')+`</div>`
      :'<div class="ex-bag-empty">Books, letters and scraps turn up in the houses. The Collegium Library keeps its own.</div>';
    h+=`<div class="ex-bag-sec">Game</div><div class="ex-bag-row"><span class="ex-bag-name"><small>Saved automatically${who.id==='guest'?' on this device as Guest':' to '+esc(who.name)+'’s profile'}.</small></span>`+
      `<button class="ex-btn ex-bag-danger" data-act="restart" type="button">${bagConfirm==='restart'?'Lose everything? Tap again':'Start over'}</button></div>`;
  }
  el.bagBody.innerHTML=h;
}
function bagClick(e){
  const t=e.target.closest('[data-tab],[data-act],[data-book]'); if(!t) return;
  if(t.dataset.tab){ bagTab=t.dataset.tab; bagRead=null; bagConfirm=null; }
  else if(t.dataset.book){ bagRead=t.dataset.book; }
  else {
    const a=t.dataset.act;
    if(a==='drink'){ drinkPotion(); renderHp(); renderSpill(); save(); }
    else if(a==='look'){ closeBag(); createHero(true); return; }
    else if(a==='unread') bagRead=null;
    else if(a==='dismiss'){ const i=+t.dataset.i;
      if(bagConfirm==='dismiss'+i){ const al=allies[i]; allies.splice(i,1); bagConfirm=null; toast(al.name+' heads back to the gate.'); renderSpill(); save(); }
      else { bagConfirm='dismiss'+i; } }
    else if(a==='restart'){
      if(bagConfirm==='restart'){ bagConfirm=null; startOver(); return; }
      bagConfirm='restart';
    }
  }
  renderBag();
}
async function startOver(){
  closeBag();
  try{ if(saveKey) localStorage.removeItem(saveKey); }catch(e){}
  applySave(null); renderSpill(); renderHp(); renderClock();
  await createHero(false);
  await enterMap(START.map,START.spawn);
  toast('A fresh start, at the gates of Wrenford.');
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
  S:{set:'snow',   out:c=>c!=='S'},
  F:{set:'flood',  out:c=>c!=='F'&&c!=='W'},
  X:{set:'wound',  out:c=>c!=='X'},
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
    const sfx=E.sfx||(PAL&&rects['tr_'+E.set+'_11'+PAL]?PAL:'');
    if(c[0]!=='1'&&c[1]!=='1'&&r()<.5) return 'tr_'+E.set+'_alt'+c+sfx;   // a second drawing of that corner
    return 'tr_'+E.set+'_'+c+sfx;
  }
  return {set:E.set, sfx:E.sfx||(PAL&&rects['tr_'+E.set+'_11'+PAL]?PAL:''), cells};
}
const quarterCache=new Map(), BLANK_TILE=document.createElement('canvas');
function quarterTile(g){
  const key=g.set+g.sfx+g.cells.join('');
  let c=quarterCache.get(key);
  if(!c){
    if(g.cells.some(cc=>!atlases[rects['tr_'+g.set+'_'+cc+g.sfx][4]])) return BLANK_TILE;   // not loaded yet: don't cache it
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
  if(t==='q') return true;                          // the Undercroft's channel: no bridge crosses it
  if(t!=='W'&&t!=='X') return false;                 // X: a hole onto the Wound (inner districts), crossed by rope bridges
  for(const b of bridges) for(const w of b.fb) if(inside(px,py,w)) return false;
  for(const w of MAP.walk||[]) if(inside(px,py,w)) return false;
  return true;
}

// a sector palette's ground colours on the minimap
const MINI_PAL = {
  frost:{G:'#c4ccd6',d:'#b4bcc6',R:'#8e98a8',P:'#a8b0bc'}, drowned:{G:'#24403c',R:'#4c6670',P:'#5a7078',O:'#1d4a70'},
  storm:{G:'#2c3040',R:'#555a74',P:'#62667e'},             quarry:{G:'#6a6030',R:'#9a8664',P:'#a8946e'},
  gale:{G:'#8a9068',R:'#a8a49a',P:'#b8b4aa'},              aether:{G:'#3a3050',R:'#6a5490',P:'#7a64a0'},
  gloom:{G:'#1c1824',R:'#3a3048',P:'#443a52'},
};
function buildMinimap(){
  const S=4, c=document.createElement('canvas'); c.width=COLS*S; c.height=ROWS*S;
  const m=c.getContext('2d');
  const col={G:'#3f6a2a',d:'#5d6a33',D:'#7a5a3a',R:'#8a8a94',M:'#6f7d63',P:'#a69a8e',W:'#1d4a70',K:'#8a5a30',O:'#24557a',a:'#3d3a32',e:'#4e4034',c:'#6a6560',f:'#857b70',S:'#dfe6f0',F:'#2f6a78',X:'#7a2ab0'};
  Object.assign(col,MINI_PAL[MAP.palette]||{});
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
// a sector's recoloured atlas (sprites/ruins/sector_<palette>), loaded the first time you go there
const palettesLoaded={};
async function loadPalette(pal){
  if(!pal||palettesLoaded[pal]) return;
  const [img,rj]=await Promise.all([LoadBar.image('sprites/ruins/sector_'+pal+'.png',PALETTE_EST), LoadBar.json('sprites/ruins/sector_'+pal+'.json',NC)]);
  const i=atlases.length; atlases.push(img);
  for(const k in rj) rects[k]=[...rj[k],i];
  palettesLoaded[pal]=true;
}
function locationOfMap(id){ return world&&world.locations.find(l=>l.map===id); }
async function getMap(id){
  if(id.startsWith('room:')){
    const spec=roomSpec&&roomSpec.id===id?roomSpec:null;
    if(!spec) throw new Error('no room '+id);
    return window.ExploreRooms.build(spec,rects);
  }
  if(!mapCache[id]) mapCache[id]=await LoadBar.json('maps/'+id+'.json',NC,MAP_EST).catch(()=>{ throw new Error('map '+id); });
  return mapCache[id];
}
function fade(on){ el.fade.classList.toggle('on',on); return new Promise(res=>setTimeout(res,on?FADE_MS:0)); }
// ── loading screens: a painting (backgrounds/loading_<name>.jpg, 600×800, ~125 KB each, so they show at
// once), the place's name, a bar and a tip. Shown when Explore opens and whenever a map isn't cached yet
// or takes a moment to load; a revisit that loads at once is just the fade. The paintings are fetched
// in the background as soon as this script loads.
const LOADING_PICS = ['duel','wrenford','corvanthe','gleaners','wound','library','tabletop'];
const LOADING_MIN_MS = 900, LOADING_SLOW_MS = 150;
const INNER_MAPS = ['crucible','drift','conductory','old_schools','sunken_harbour','deep_cut','winter_fair','necropolis'];
function loadingPicFor(id){
  if(!id) return LOADING_PICS[Math.random()*LOADING_PICS.length|0];
  if(id==='wrenford') return Math.random()<0.75?'wrenford':'library';
  if(id==='old_schools') return 'library';
  if(id==='hollowmere'||id==='corvanthe_road') return 'corvanthe';
  if(INNER_MAPS.includes(id)) return 'wound';
  return Math.random()<0.6?'gleaners':'corvanthe';    // the outer sectors
}
const TIPS = [
  'Damage beats Protection, Protection beats Dispel, Dispel beats Damage. Pick in secret, then both spells play out together.',
  'Each spell has its own glyphs. Watch the white glyphs rise, then tap them back in order before the timer runs out.',
  'The ring you cast from sets the strength: the inner ring is two glyphs, the outer ring four.',
  'A ward lasts until it runs out, but it wears a little every round.',
  'A strike in a ward\'s opposite element unravels it faster: Fire and Water, Air and Earth, Lightning and Ice, Arcane and Dark.',
  'Attack, Guard and Grapple cost no mana. A Guard blocks an Attack and hits back; a Grapple goes straight through a Guard.',
  'Wards stop magic, not blows. Against swords and arrows, Ironskin or a Guard serves you better.',
  'Meditate to skip your spell for +3 mana, but not two rounds running.',
  'A Seal keeps your ward from wearing, and a dispel must break the seal before it can touch the ward.',
  'Your wounds carry from fight to fight. Rest at an inn or a gleaners\' camp to recover.',
  'Potions restore a good part of your HP. Drink them from the satchel (🎒 or I).',
  'Walk into the gold chevrons, or press the action button near them, to take a road out.',
  'Destroyed Echoes leave spill, the quintessence of their element. Widow Coyle buys it in Wrenford.',
  'An Echo shrugs off its own element and is torn apart by its opposite.',
  'Toll crews will let you pass for gold. Hostile crews won\'t ask.',
  'Close in with 🔍, Z, the mouse wheel or a pinch to see people up close.',
  'Echoes sometimes stray across from the sector next door. Look at the colour before you charge in.',
  'Everything is magic, Earth included. Only blows, from fists, blades and arrows, get past a ward.',
  'The deeper you go toward the Wound, the stronger the Echoes and the richer the spill.',
  'A sealed ward takes two dispels: one for the seal, one for the ward.',
];
let loadingShownAt=0;
// The bar is LoadBar's (js/load_bar.js): it moves with the bytes really downloaded and the figures
// really painted, stage by stage (plan: estimated bytes per stage, in the order they run). The
// estimates below only set how much of the bar each stage gets.
const ATLAS_EST=520000, PALETTE_EST=950000, MAP_EST=33000, DATA_EST=82000, CORE_EST=2480000;
const NPC_FIG_EST=500000, NPC_PAINT=120000;   // a painted townsfolk: its share of the figures, toppers and masks (measured); painting it
function sheetsEst(data){                         // what a map still has to fetch: its sheets and palette not yet loaded
  const need=new Set(CORE_ATLASES.map(n=>ATLAS_NAMES.indexOf(n)));
  for(const o of data.objects||[]){ const q=rects[o[0]]; if(q&&q[4]<ATLAS_NAMES.length) need.add(q[4]); }
  for(const c of new Set((data.ground||[]).join(''))){ const q=rects[GROUND_PIECE[c]]; if(q) need.add(q[4]); }
  let n=0; for(const i of need) if(!atlases[i]) n++;
  return n*ATLAS_EST+(data.palette&&!palettesLoaded[data.palette]?PALETTE_EST:0)+20000;
}
function showLoading(id, name, plan){
  el.lPic.src='backgrounds/loading_'+loadingPicFor(id)+'.jpg';
  el.lName.textContent=name||MAP_NAMES[id]||'';
  el.lTip.textContent=TIPS[Math.random()*TIPS.length|0];
  LoadBar.begin(el.lFill, plan||[MAP_EST, 4*ATLAS_EST]);
  el.loading.classList.remove('out'); el.loading.hidden=false;
  loadingShownAt=performance.now();
}
async function hideLoading(){
  if(el.loading.hidden) return;
  const wait=LOADING_MIN_MS-(performance.now()-loadingShownAt);
  await LoadBar.finish(180);
  if(wait>0) await new Promise(r=>setTimeout(r,wait));
  el.loading.classList.add('out');
  await new Promise(r=>setTimeout(r,300));
  el.loading.hidden=true; el.loading.classList.remove('out');
}
(function preloadLoading(){
  const go=()=>LOADING_PICS.forEach(n=>{ const i=new Image(); i.src='backgrounds/loading_'+n+'.jpg'; });
  if(window.requestIdleCallback) requestIdleCallback(go,{timeout:3000}); else setTimeout(go,1000);
})();
// go to a map; at = a spawn name or [x, y]
async function enterMap(id,at,instant){
  if(busy) return; busy=true;
  keys.clear(); target=null; hideSay();
  // a map that isn't cached (or is slow) gets a loading painting over the fade; rooms are built at once
  let slow=null;
  const room=id.startsWith('room:');
  try{
    if(!instant) await fade(true);
    if(!room&&el.loading.hidden){
      if(!mapCache[id]) showLoading(id);
      else slow=setTimeout(()=>{ showLoading(id,null,[1,sheetsEst(mapCache[id])]); LoadBar.next(); },LOADING_SLOW_MS);
    }
    else if(instant) LoadBar.next();                // opening Explore: its plan's map stage
    const data=await getMap(id);
    if((!room||instant)&&!el.loading.hidden) LoadBar.next(sheetsEst(data));
    if(!room&&!el.loading.hidden&&data.name) el.lName.textContent=data.name;
    if(data.interior&&roomSpec&&roomSpec.outside) await getMap(roomSpec.outside.map).catch(()=>{});   // a room plays its town's theme
    await Promise.all([loadPalette(data.palette),atlasesFor(data)]);   // this map's sheets, before anything draws from them
    if(id==='elfhome'&&window.ExploreElfhome) await window.ExploreElfhome.prep(folkApi);   // paint Elfhome's people
    setupMap(data);
    prefetchAround(data);
    { const im=new Image(); im.src='backgrounds/'+arenaHere()+'.jpg'; }   // this place's battle backdrop, so a fight opens on it
    resize();
    const p=Array.isArray(at)?at:(data.spawns[at]||data.spawns.start||Object.values(data.spawns)[0]);
    wiz.x=p[0]; wiz.y=p[1]; wiz.face=1;
    unstick();                                // never set down inside a wall (a stall's crates by the Undercroft's trapdoor)
    exitArmed=false;                          // arriving in an exit doesn't send you straight back
    const loc=locationOfMap(id); if(loc) found.add(loc.id);
    if(!id.startsWith('room:')) visited.add(id);
    if(Year) Year.onMap(folkApi);
    if(window.ExploreElfhome) window.ExploreElfhome.onMap(folkApi);
    save(); syncMusic();
  }catch(err){ console.error(err); toast('That way is blocked.'); }
  finally{ clearTimeout(slow); if(!instant) await hideLoading(); busy=false; fade(false); }
}
// if you're standing somewhere you can't move from (a footprint, water), step to the nearest open spot
function unstick(){
  if(!blocked(wiz.x,wiz.y)) return;
  for(let r=8;r<=6*T;r+=8){
    const n=Math.max(8,Math.round(r/4));
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, x=wiz.x+Math.cos(a)*r, y=wiz.y+Math.sin(a)*r;
      if(!blocked(x,y)){ wiz.x=x; wiz.y=y; return; } }
  }
}
function save(){
  if(!MAP||!saveKey||!hero) return;                // nothing is kept until the wizard has been made
  if(!MAP.interior&&MAP.name) lastPlace=MAP.name;    // a room is listed under the town it's in
  try{ localStorage.setItem(saveKey,JSON.stringify({v:2, t:Date.now(), place:lastPlace, map:MAP.id,x:Math.round(wiz.x),y:Math.round(wiz.y),found:[...found],visited:[...visited],spill,cleared,clock:Math.round(clock),lightMode,vit,gold,potions,allies,rescues,rooms,booksRead,quests,bands:bandState,hero,magic,toppers,roomSpec:MAP.interior?roomSpec:null,wiz:wizKeys[wizIdx]})); }catch(e){}
}
function loadSave(key){
  try{ return key?JSON.parse(localStorage.getItem(key)||'null'):null; }catch(e){ return null; }
}
// everything a save holds, from a save (or a fresh start with none)
function applySave(s){
  s=s||{};
  found=new Set(s.found||[]); visited=new Set(s.visited||[]); spill=s.spill||{}; cleared=s.cleared||{};
  clock=s.clock!=null?s.clock:9*60; lightMode=s.lightMode||'auto'; vit=s.vit||{};
  gold=s.gold||0; potions=s.potions||0; allies=s.allies||[]; rescues=s.rescues||[]; rooms=s.rooms||{}; booksRead=s.booksRead||[]; quests=s.quests||{}; hero=s.hero||null; magic=hero?(s.magic||fullMagic(hero.elem)):freshMagic(); roomSpec=s.roomSpec||null; bandState=s.bands||{}; lastPlace=s.place||''; toppers=s.toppers||[];
  if(s.map&&!s.map.startsWith('room:')) visited.add(s.map);
  for(const id of found){ const l=world&&world.locations.find(x=>x.id===id); if(l&&l.map) visited.add(l.map); }   // older saves knew only world-map places
}
function takeExit(x){
  if(Year&&!MAP.interior){ const no=Year.blockExit(folkApi,x); if(no){ toast(no); return; } }
  if(x.to==='out'){ const o=roomSpec.outside; enterMap(o.map,[o.x,o.y+30]); return; }
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

// ═══ THE MORIQUENDE ═════════════════════════════════════════════════
// Mother Agathe's errand (js/explore_folk.js, after Finals) leads to Elfhome (maps/elfhome.json; its people
// in js/explore_elfhome.js). The forest year (js/forest.js) opens from the Watch Table there, fought by your
// own wizard; it lives in quests.forest.S, and closing it leaves you standing in Elfhome. Your HP is one
// pool: the year starts its fights from it and writes their wounds back (hp / setHp); the Healing House
// heals it. Each ending pays once, only when it beats your best (FOREST_PRIZE); the best of all brings
// Sylvara into your companions.
const FOREST_PRIZE={song:{gold:60,spill:6}, endures:{gold:30,spill:3}, scarred:{gold:10,spill:0}, fallen:{gold:0,spill:0}};
const FOREST_RANK=['fallen','scarred','endures','song'];
function openForest(o){
  if(!window.Forest||busy||!hero) return;
  const key=wizKeys[wizIdx], q=quests.forest||(quests.forest={});
  if(o&&o.fresh&&q.S&&q.S.over) q.S=null;   // another year (Sylvara offers it after one that fell short)
  busy=true; keys.clear(); target=null; hideSay(); save();
  fade(true).then(()=>{
    running=false; el.root.classList.remove('active'); fade(false); syncMusic();
    if(typeof CHAR_DEFS!=='undefined') CHAR_DEFS[key]=chars[key];
    window.Forest.open({explore:{wizKey:key, name:folkApi.wizName(), element:hero.elem,
      hp:()=>hpOf(key), maxHp:()=>maxHp(key), setHp:v=>{ vit[key]=Math.max(0,Math.min(maxHp(key),Math.round(v))); },
      state:q.S||null, cats:key==='hero'&&magic&&!magic.grad?(magic.cats||[]):null, rings:key==='hero'&&magic&&!magic.grad?(magic.rings||1):null,
      onSave:S=>{ q.S=S; save(); },
      onEnd:(S,sc)=>forestEnd(q,sc),
      onClose:()=>{
        el.root.classList.add('active'); running=true; busy=false; resize(); syncMusic();
        renderHp(); renderSpill(); save(); grace=1.5; last=performance.now(); requestAnimationFrame(frame);
      }}});
  });
}
function forestEnd(q,sc){
  q.years=(q.years||0)+1;
  const was=q.best?FOREST_RANK.indexOf(q.best):-1, now=FOREST_RANK.indexOf(sc.ending), out=[];
  if(now>was){
    const P=FOREST_PRIZE[sc.ending], O=was>=0?FOREST_PRIZE[q.best]:{gold:0,spill:0};
    const g=P.gold-O.gold, sp=P.spill-O.spill;
    if(g>0){ gold+=g; out.push(g+' gold'); }
    if(sp>0){ spill.earth=(spill.earth||0)+sp; out.push(sp+' '+SPILL.earth[0]); }
    q.best=sc.ending;
  }
  if(sc.ending==='song'&&!q.sylvara){ q.sylvara=true; folkApi.addAlly({key:'sylvara', wizard:true, name:'Sylvara'}); out.push('Sylvara herself, who joins your companions'); }
  save();
  return out.length?'You leave the Moriquende with '+out.join(', ')+'.':'';
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
    } else if(l.kind==='university'){
      // dreaming spires: a ring of towers, standing, with a warm light among them
      const gl=g.createRadialGradient(l.x,l.y,4,l.x,l.y,60);
      gl.addColorStop(0,'rgba(255,215,130,0.45)'); gl.addColorStop(1,'rgba(255,215,130,0)');
      g.fillStyle=gl; g.fillRect(l.x-60,l.y-60,120,120);
      g.fillStyle='#3a2810';
      for(const [dx,h,w] of [[-18,16,6],[-9,24,5],[0,30,6],[9,20,5],[18,14,6]]){
        g.fillRect(l.x+dx-w/2,l.y+8-h,w,h);
        g.beginPath(); g.moveTo(l.x+dx-w/2-1,l.y+8-h); g.lineTo(l.x+dx,l.y+8-h-9); g.lineTo(l.x+dx+w/2+1,l.y+8-h); g.fill();
      }
      g.fillRect(l.x-24,l.y+6,48,5);
    } else if(l.kind==='forest'){
      g.fillStyle='#2f4a1c';
      for(const [dx,dy,r] of [[-16,6,9],[0,-4,11],[15,5,9],[-6,14,7],[9,15,7]]){ g.beginPath(); g.moveTo(l.x+dx,l.y+dy-r*1.6); g.lineTo(l.x+dx+r,l.y+dy+r*0.6); g.lineTo(l.x+dx-r,l.y+dy+r*0.6); g.fill(); }
    } else if(l.kind==='town'){
      g.fillStyle='#3a2810';
      for(const [dx,dy] of [[-10,4],[2,-6],[12,6]]){ g.fillRect(l.x+dx-5,l.y+dy-3,10,8); g.beginPath(); g.moveTo(l.x+dx-7,l.y+dy-3); g.lineTo(l.x+dx,l.y+dy-10); g.lineTo(l.x+dx+7,l.y+dy-3); g.fill(); }
    } else {
      g.fillStyle='#3a2810'; g.beginPath(); g.arc(l.x,l.y,6,0,Math.PI*2); g.fill();
    }
    g.font='bold 17px Cinzel, serif'; g.textAlign='center';
    g.fillStyle=l.locked?'rgba(58,40,16,0.7)':'#2a1c08';
    g.fillText(l.name,l.x+(l.labelDx||0),l.y+(l.labelDy!=null?l.labelDy:l.kind==='city'?60:30));
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
        <img id="ex-face" alt=""><span class="ex-who"><span id="ex-name"></span><span class="ex-hp" id="ex-hp"><i></i><b></b></span></span>
        <button class="ex-btn ex-arrow" id="ex-next" type="button" aria-label="Next wizard">▶</button>
      </div>
      <div class="ex-spill" id="ex-spill" hidden></div>
      <button class="ex-btn" id="ex-bagbtn" type="button" title="Satchel (I)">🎒</button>
      <button class="ex-btn" id="ex-mapbtn" type="button" title="World map">🗺</button>
      <button class="ex-btn" id="ex-zoom" type="button" title="Zoom in for a closer look (Z, mouse wheel or pinch)">🔍</button>
      <button class="ex-btn" id="ex-night" type="button" title="Time of day: auto / day / night"></button>
    </div>
    <canvas id="ex-mini" aria-hidden="true"></canvas>
    <div class="ex-hint" id="ex-hint">WASD / arrows to walk · tap or click to walk there · E to inspect or enter · Q to inspect a building at its door · Z, wheel or pinch to zoom · walk off a road to travel</div>
    <button class="ex-btn ex-act" id="ex-act" type="button" hidden>✋ Inspect</button>
    <button class="ex-btn ex-look" id="ex-look" type="button" hidden>✋ Inspect</button>
    <div class="ex-say" id="ex-say" hidden><img class="ex-say-face" alt="" hidden><div class="ex-say-name"></div><div class="ex-say-text"></div></div>
    <div class="ex-toast" id="ex-toast" hidden></div>
    <div class="ex-world" id="ex-world" hidden>
      <div class="ex-world-head"><span id="ex-world-title"></span><button class="ex-btn" id="ex-world-close" type="button">✕ Close</button></div>
      <canvas id="ex-world-cv"></canvas>
      <div class="ex-world-panel"><div class="ex-wp-name" id="ex-wp-name"></div><div class="ex-wp-text" id="ex-wp-text"></div>
        <button class="ex-btn ex-wp-go" id="ex-wp-go" type="button">Travel</button></div>
    </div>
    <div class="ex-bag" id="ex-bag" hidden>
      <div class="ex-bag-box">
        <div class="ex-bag-head"><span class="ex-bag-title">Satchel</span><span class="ex-bag-who" id="ex-bag-who"></span><button class="ex-btn" id="ex-bag-close" type="button">✕</button></div>
        <div class="ex-bag-tabs" id="ex-bag-tabs"></div>
        <div class="ex-bag-body" id="ex-bag-body"></div>
      </div>
    </div>
    <div class="ex-fade" id="ex-fade"></div>
    <div class="ex-loading" id="ex-loading"><img class="exl-pic" id="exl-pic" alt="">
      <div class="exl-name" id="exl-name"></div>
      <div class="exl-foot"><div class="exl-bar"><i id="exl-fill"></i></div><div class="exl-tip" id="exl-tip"></div></div></div>`;
  document.getElementById('app').appendChild(d);
  const $=s=>d.querySelector(s);
  el={root:d, cv:$('#ex-canvas'), mini:$('#ex-mini'), say:$('#ex-say'), act:$('#ex-act'), look:$('#ex-look'), hint:$('#ex-hint'),
      face:$('#ex-face'), name:$('#ex-name'), night:$('#ex-night'), zoom:$('#ex-zoom'), loading:$('#ex-loading'), lPic:$('#exl-pic'), lName:$('#exl-name'), lFill:$('#exl-fill'), lTip:$('#exl-tip'), title:$('#ex-title'),
      fade:$('#ex-fade'), toast:$('#ex-toast'), world:$('#ex-world'), worldCv:$('#ex-world-cv'), worldTitle:$('#ex-world-title'),
      hp:$('#ex-hp'), spill:$('#ex-spill'), bag:$('#ex-bag'), bagBody:$('#ex-bag-body'), bagTabs:$('#ex-bag-tabs'), bagWho:$('#ex-bag-who'), wpName:$('#ex-wp-name'), wpText:$('#ex-wp-text'), wpGo:$('#ex-wp-go')};
  ctx=el.cv.getContext('2d');
  dark=document.createElement('canvas'); dctx=dark.getContext('2d');
  $('#ex-back').onclick=close;
  el.toast.onclick=e=>{ e.stopPropagation(); toastNext(); };
  $('#ex-prev').onclick=()=>setWizard(wizIdx-1);
  $('#ex-next').onclick=()=>setWizard(wizIdx+1);
  $('#ex-mapbtn').onclick=()=>{ if(!busy&&MAP) openWorld('view'); };
  $('#ex-world-close').onclick=closeWorld;
  el.wpGo.onclick=worldGo;
  el.worldCv.addEventListener('click',worldClick);
  el.night.onclick=()=>{ lightMode={auto:'day',day:'night',night:'auto'}[lightMode]; renderClock(); save(); };
  el.spill.onclick=()=>{ if(!busy) openBag('pack'); };
  $('#ex-bagbtn').onclick=()=>{ if(!busy&&MAP) openBag(); };
  $('#ex-bag-close').onclick=closeBag;
  el.bag.addEventListener('click',e=>{ if(e.target===el.bag) closeBag(); else bagClick(e); });
  el.look.onclick=()=>{ lookAtDoor(); dropFocus(); };
  el.act.onclick=()=>{ if(near) inspect(); else if(nearDoor&&!busy) enterDoor(nearDoor); else if(nearExit&&!busy&&!roomLocked()) takeExit(nearExit); dropFocus(); };
  el.say.onclick=hideSay;
  el.zoom.onclick=()=>stepZoom(); renderZoom();
  // two fingers pinch the zoom instead of walking
  const touches=new Map(); let pinch=null;
  const spread=()=>{ const [a,b]=[...touches.values()]; return Math.hypot(a.x-b.x,a.y-b.y)||1; };
  el.cv.addEventListener('pointerdown',e=>{
    if(scene){ el.cv.setPointerCapture(e.pointerId); sceneDrag={x:e.clientX, y:e.clientY, moved:0}; return; }
    el.cv.setPointerCapture(e.pointerId); touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===2){ pinch={d:spread(), z:zoomGoal}; dragging=false; target=null; return; }
    if(touches.size>2) return;
    setTarget(e); hideSay(); dragging=true; });
  el.cv.addEventListener('pointermove',e=>{
    if(scene&&sceneDrag){ const dx=e.clientX-sceneDrag.x, dy=e.clientY-sceneDrag.y; sceneDrag.moved+=Math.abs(dx)+Math.abs(dy);
      if(sceneDrag.moved>10){ scenePan.x-=dx/zoom; scenePan.y-=dy/zoom; scenePan.t=performance.now(); } sceneDrag.x=e.clientX; sceneDrag.y=e.clientY; return; }
    if(touches.has(e.pointerId)) touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&touches.size===2){ setZoom(pinch.z*spread()/pinch.d,true); return; }
    if(dragging) setTarget(e); });
  el.cv.addEventListener('wheel',e=>{ e.preventDefault(); setZoom(zoomGoal*Math.exp(-e.deltaY*0.0015)); },{passive:false});
  const up=e=>{ if(scene&&sceneDrag){ if(sceneDrag.moved<=10&&scene.tap) scene.tap(); sceneDrag=null; return; } touches.delete(e.pointerId); if(touches.size<2) pinch=null; dragging=false; };
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
  if(creating) return;
  if(scene){ if(k==='e'||k===' '||k==='enter'){ if(el.say.hidden&&scene.tap) scene.tap(); else return; e.preventDefault(); }
    else if(k==='escape'){ if(scene.skip) scene.skip(); e.preventDefault(); } return; }
  if(bagOpen){ if(k==='escape'||k==='i'){ closeBag(); e.preventDefault(); } return; }
  if(worldOpen){
    if(k==='escape'){ closeWorld(); e.preventDefault(); }
    else if(k==='enter'&&!el.wpGo.disabled){ worldGo(); e.preventDefault(); }
    return;
  }
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ keys.add(k); target=null; hideSay(); e.preventDefault(); }
  else if(k==='e'||k===' '||k==='enter'){ if(!el.say.hidden) hideSay(); else if(near) inspect(); else if(nearDoor) enterDoor(nearDoor); e.preventDefault(); }
  else if(k==='q'){ if(!el.say.hidden) hideSay(); else lookAtDoor(); e.preventDefault(); }
  else if(k==='m'){ if(!busy&&MAP) openWorld('view'); }
  else if(k==='z'){ stepZoom(); }
  else if(k==='i'){ if(!busy&&MAP) openBag(); }
  else if(k==='escape'){ if(!el.say.hidden) hideSay(); else close(); }
}
function resize(){
  if(!running) return;
  dpr=Math.min(window.devicePixelRatio||1,2);
  vw=window.innerWidth; vh=window.innerHeight;
  for(const c of [el.cv,dark]){ c.width=Math.round(vw*dpr); c.height=Math.round(vh*dpr); }
  el.cv.style.width=vw+'px'; el.cv.style.height=vh+'px';
  baseZoom=Math.max(0.62,Math.min(1.35,Math.min(vw/620,vh/620)));
  // a room fits the screen, walls and all
  if(MAP&&MAP.interior) baseZoom=Math.max(0.55,Math.min(1.6,Math.min(vw/(WORLD_W+20),(vh-70)/(WORLD_H-T*0.6))));
  // a wide room on a narrow screen (the lecture theatre on a phone): fit its height and follow the wizard
  if(MAP&&MAP.fitTall&&vw<vh) baseZoom=Math.max(baseZoom,Math.min(1.6,(vh-70)/(WORLD_H-T*0.6)));
  zoom=baseZoom*zoomMul;
  if(el.mini) el.mini.style.display=MAP&&MAP.interior?'none':'';
  sizeMini();
}
function sizeMini(){
  if(!COLS) return;
  const mw=Math.round(Math.min(176,vw*0.3)); el.mini.width=COLS*4; el.mini.height=ROWS*4;
  el.mini.style.width=mw+'px'; el.mini.style.height=Math.round(mw*ROWS/COLS)+'px';
}

// ── what your wizard knows (the University Year, docs/world-design.md) ──
// `magic` (saved): {glyphs (indices into the 12), elems, cats, rings, skin, grad}. A new wizard knows
// nothing but the Actions; the Library, Laboratory, lectures and exams teach the rest. It goes into
// battle as chars.hero.known (game.js: elemUnlearnt / ringUnlearnt / mgKnows), with the home element's
// opposite barred for good. Saves from before the Year know everything but the barred element.
const ELEM_IDS=['fire','air','lightning','arcane','water','earth','ice','dark'];   // the wheel's order
const oppOf=e=>ELEM_IDS[(ELEM_IDS.indexOf(e)+4)%8];
const GLYPH_SETS={fire:[0,1,8,4], lightning:[3,2,9,7], ice:[10,11,6,5], arcane:[4,5,3,10],
  earth:[1,2,3,8], dark:[6,9,2,4], air:[1,0,7,11], water:[2,5,4,11], dispel:[5,8,2,10]};   // as in game.js
const GLYPHS=['ϟ','Δ','∇','Ψ','Ω','∞','☽','✸','⊕','⊗','θ','Φ'];
function freshMagic(){ return {glyphs:[], elems:[], cats:[], rings:1, skin:false}; }
function fullMagic(home,electives){
  const ban=oppOf(home), els=electives?[home].concat(electives):ELEM_IDS.filter(e=>e!==ban);
  return {glyphs:GLYPHS.map((_,i)=>i), elems:els, cats:['damage','protect','dispel'], rings:3, skin:true, grad:true};
}
function applyMagic(){
  const d=chars&&chars.hero; if(!d||!hero) return;
  if(!magic) magic=freshMagic();
  d.known=magic; d.forbidden=[oppOf(hero.elem)];
  if(d._atk0==null) d._atk0=(d.phys&&d.phys.atk)||4;
  d.phys=Object.assign({},d.phys,{atk:d._atk0+(magic.atk||0)});   // the Boxing Club's champion hits harder
}
// add to what you know: {glyphs, elems, cats, rings, skin}
function learn(o){
  if(!magic) magic=freshMagic();
  ['glyphs','elems','cats'].forEach(k=>{ (o[k]||[]).forEach(v=>{ if(!magic[k].includes(v)) magic[k].push(v); }); });
  if(o.rings) magic.rings=Math.max(magic.rings||1,o.rings);
  if(o.skin) magic.skin=true;
  if(o.atk) magic.atk=(magic.atk||0)+o.atk;
  if(o.grad) magic.grad=true;
  applyMagic(); save();
}
function graduate(electives){ magic=fullMagic(hero.elem,electives); applyMagic(); save(); }
// a random wizard who has sat Finals, as the Senior Tutor records it: three electives (never the barred
// one) and Matriculation's tasks done
async function randomGraduate(){
  stopTheme();
  hero=await window.ExploreHero.randomHero(); await useHero();
  const ban=oppOf(hero.elem), pool=ELEM_IDS.filter(e=>e!==hero.elem&&e!==ban);
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  graduate(pool.slice(0,3));
  Object.assign(quests.wren||(quests.wren={}),{stage:2, finals:true, library:true, lab:true, schools:true, spar1:true});
  save();
  toast(hero.name+', a graduate of '+[hero.elem].concat(pool.slice(0,3)).map(cap).join(', ')+'. Barred: '+cap(ban)+'.');
}
// one line for the satchel: what you can cast
function magicLine(){
  if(!hero||!magic) return '';
  if(magic.grad&&magic.rings>=3) return 'Graduate: '+magic.elems.map(e=>cap(e)).join(', ')+'; every wheel and ring. Barred: '+cap(oppOf(hero.elem))+'.';
  const cats=magic.cats.map(c=>({damage:'strikes',protect:'wards',dispel:'dispels'}[c]));
  return (cats.length?'You can cast '+cats.join(', ')+' ('+['inner','middle','outer'][(magic.rings||1)-1]+' ring)'+(magic.elems.length?' in '+magic.elems.map(cap).join(', '):'')+'.':'No magic yet: Attack, Guard and Grapple only.')+
    (magic.glyphs.length?' Glyphs: '+magic.glyphs.map(i=>GLYPHS[i]).join(' ')+'.':'')+' Barred: '+cap(oppOf(hero.elem))+'.';
}

// a small face: the portrait thumbnail, or a made wizard's own
function faceSrc(key){ const c=chars&&chars[key]; return c&&c.face||'portraits/small/'+key+'.jpg'; }
// ── your own wizard (js/explore_hero.js) ──
// hero (saved) is the record from the creator; its character entry goes in as 'hero' here and in the
// duel engine's CHAR_DEFS, first in wizKeys. While you have one, the roster switcher is hidden.
async function useHero(){
  if(!hero||!window.ExploreHero) return;
  const d=await window.ExploreHero.def(hero);
  chars.hero=d; if(typeof CHAR_DEFS!=='undefined') CHAR_DEFS.hero=d;
  applyMagic();
  if(wizKeys[0]!=='hero') wizKeys.unshift('hero');
  el.root.querySelectorAll('#ex-prev,#ex-next').forEach(b=>b.hidden=true);
  setWizard(0);
  if(npcLookFor!==lookKey()){ await prepNpcs(); if(MAP&&!MAP.interior) spawnBands(); }
}
// ── people painted from the hero figures (js/explore_hero.js), always nudged off your own look ──
// The hostile crews' bandit mages ('bandit_<id>', ExploreBands BANDS' `bandit`), the lone bandit mages who
// lead crews in rooms ('rogue_<n>', ROGUES) and Wrenford's townsfolk with a `look` (ExploreFolk FOLK).
// Each becomes a character entry in chars and the duel engine's CHAR_DEFS; folk keep their sprite and face.
let toppers=[];             // the staff toppers this wizard has earned (saved); the starters are always there
// a topper won (from a bandit mage, a quest, a shop): it's yours to fit now, or later with Change look
function earnTopper(id, how){
  const H=window.ExploreHero, t=H&&H.TOPPERS.find(q=>q.id===id); if(!t) return false;
  if(toppers.includes(id)||H.STARTER_TOPPERS.includes(id)) return false;
  toppers.push(id); save();
  if(!hero){ toast('A staff topper: '+t.name+'.'); return true; }
  showDialog('A Staff Topper: '+t.name, (how?how+'. ':'')+'It would fit your staff. (You can change it any time with Change look, in the satchel.)',[
    {label:'Fit it now', fn:async()=>{ hero.topper=id; await useHero(); save(); toast('Your staff wears the '+t.name+' now.'); }},
    {label:'Keep it for later', fn:()=>toast('The '+t.name+' goes in your satchel.')}]);
  return true;
}
let npcLookFor=null;
const lookKey=()=>JSON.stringify(hero?[hero.fig,hero.robe]:null);
async function prepNpcs(){
  const H=window.ExploreHero; if(!H) return;
  npcLookFor=lookKey();
  const reg=async(key,look,o)=>{
    const d=await H.def(H.avoidLook(look,hero)), el_=H.ELEMS.find(e=>e.id===look.elem)||H.ELEMS[0];
    const c=Object.assign({},d,{name:look.name.toUpperCase(), title:o.title||('Bandit Mage of '+el_.name), hp:o.hp||48, phys:{atk:o.atk||4}, hero:false, bandit:true, arena:'ruins'});
    chars[key]=c; if(typeof CHAR_DEFS!=='undefined') CHAR_DEFS[key]=c;
    return c;
  };
  // four at a time, so the figures download side by side and the painting (CPU work) is spread
  // among the downloads instead of piling up after them; each one painted moves the loading bar
  const jobs=[], counted=fn=>jobs.push({fn, done:LoadBar.step(NPC_PAINT)});
  const B=window.ExploreBands;
  if(B){
    for(const b of B.BANDS) if(b.bandit){ b.wizard='bandit_'+b.id; counted(()=>reg('bandit_'+b.id,b.bandit,{hp:b.level>=3?60:54})); }
    (B.ROGUES||[]).forEach((r,i)=>counted(()=>reg('rogue_'+i,r,{hp:46, title:'Leading a Rival Crew'})));
  }
  const F=Folk&&Folk.FOLK;
  if(F) for(const role in F) if(F[role].look) counted(async()=>{
    const d=await H.def(H.avoidLook(F[role].look,hero));
    F[role]._sprite=d.sprite; F[role]._face=d.face; F[role]._glow=d.glow;
  });
  let k=0;
  const worker=async()=>{ while(k<jobs.length){ const j=jobs[k++]; await j.fn(); j.done(); } };
  await Promise.all([worker(),worker(),worker(),worker()]);
}
function npcCount(){                              // how many prepNpcs paints
  const B=window.ExploreBands, F=window.ExploreFolk&&ExploreFolk.FOLK;
  return (B?B.BANDS.filter(b=>b.bandit).length+(B.ROGUES||[]).length:0)+(F?Object.values(F).filter(f=>f.look).length:0);
}
// The main theme plays on the title screen and carries on, unbroken, through the character
// creator and the introduction scroll, fading out as the first map's own music comes in.
// playTheme doesn't restart a theme that's already playing. It's also called straight from the
// New Game tap, so phones count it as user-started; a browser that blocked it before any tap
// gets another go at the next tap or key (themeBlocked).
const THEME_SRC='audio/main_theme.mp3', THEME_VOL=0.7;
let theme=null, themeFade=0, themeBlocked=false;
function playTheme(){
  try{
    if(!theme){ theme=new Audio(THEME_SRC); theme.loop=true; theme.preload='auto'; }
    clearInterval(themeFade); theme.volume=THEME_VOL;
    if(!theme.paused) return;
    theme.currentTime=0;
    const p=theme.play(); if(p&&p.catch) p.catch(()=>{ themeBlocked=true; });
  }catch(e){}
}
// the title screen's share: playing while it shows and Explore isn't open, else fading out
// (the creator keeps it going itself)
function titleMusic(){
  const t=document.getElementById('title-screen');
  const wk=document.getElementById('wk-screen');   // the Winks Table plays its own tavern music
  const fr=document.getElementById('fr-screen');   // the Moriquende (silent for now)
  if(t&&t.classList.contains('active')&&!running&&!(wk&&wk.classList.contains('active'))&&!(fr&&fr.classList.contains('active'))) playTheme();
  else if(!creating) stopTheme();
}
['pointerdown','keydown'].forEach(t=>window.addEventListener(t,()=>{
  if(themeBlocked){ themeBlocked=false; if(creating) playTheme(); else titleMusic(); }
},true));
function stopTheme(){
  if(!theme||theme.paused) return;
  clearInterval(themeFade);
  themeFade=setInterval(()=>{
    theme.volume=Math.max(0,theme.volume-0.05);
    if(theme.volume<=0){ clearInterval(themeFade); theme.pause(); }
  },40);
}
// A map's own theme (`music` in its file; a room plays its town's) loops while you walk there,
// fading in and out. It stays quiet during battles, the creator (which has its own theme) and
// once Explore closes; syncMusic() works out what should be playing and is called at each change.
const MUSIC_VOL=0.55;
let music=null, musicSrc=null, musicFade=0;
function mapMusic(){
  if(!MAP) return null;
  if(MAP.interior){ const o=roomSpec&&roomSpec.outside, d=o&&mapCache[o.map]; return d&&d.music||null; }
  return MAP.music||null;
}
function fadeMusic(to,done){
  clearInterval(musicFade);
  const a=music; if(!a) return;
  musicFade=setInterval(()=>{
    const v=a.volume+(to>a.volume?0.03:-0.05);
    a.volume=Math.max(0,Math.min(MUSIC_VOL,to>a.volume?Math.min(v,to):Math.max(v,to)));
    if(Math.abs(a.volume-to)<0.001){ clearInterval(musicFade); if(done) done(); }
  },40);
}
function syncMusic(){
  const want=(running&&!creating&&hero)?mapMusic():null;
  try{
    if(want&&music&&musicSrc===want){
      if(music.paused){ const p=music.play(); if(p&&p.catch) p.catch(()=>{}); }
      fadeMusic(MUSIC_VOL); return;
    }
    if(music&&!music.paused){ const a=music; fadeMusic(0,()=>{ a.pause(); if(want) syncMusic(); }); if(want) musicSrc=null; return; }
    if(!want) return;
    if(musicSrc!==want){ music=new Audio(want); music.loop=true; music.preload='auto'; musicSrc=want; }
    music.volume=0; music.currentTime=0;
    const p=music.play(); if(p&&p.catch) p.catch(()=>{ musicBlocked=true; });
    fadeMusic(MUSIC_VOL);
  }catch(e){}
}
// a browser that refused to start it (no tap yet) gets another go at the next tap or key
let musicBlocked=false;
['pointerdown','keydown'].forEach(t=>window.addEventListener(t,()=>{ if(musicBlocked){ musicBlocked=false; syncMusic(); } },true));
async function createHero(edit){
  creating=true; keys.clear(); target=null; hideSay();
  syncMusic(); playTheme();
  let h;
  try{
    h=await window.ExploreHero.open(el.root,{hero:edit?hero:null, edit:!!edit, toppers:edit?toppers:[]});
    if(h){ hero=h; await useHero(); save(); }          // saved before the intro, so closing during it loses nothing
    // a new wizard gets the introduction scroll, with the theme playing on under it
    if(h&&!edit&&window.ExploreIntro) await window.ExploreIntro.play(el.root,h);
  }
  finally{ stopTheme(); creating=false; syncMusic(); }
  return h;
}
function setWizard(i){
  wizIdx=(i+wizKeys.length)%wizKeys.length;
  const key=wizKeys[wizIdx], c=chars[key];
  el.name.textContent=c.name; el.face.src=faceSrc(key); renderHp();
  try{ localStorage.setItem('wd-explore-wiz',key); }catch(e){}
  const img=new Image(); img.src=c.sprite; img.onload=()=>{ if(wizKeys[wizIdx]===key) wizImg=img; };
}

function loreOf(o){ return o.npc?['…','']:(MAP.lore||{})[o.lore]; }
function showSay(o){
  const L=loreOf(o); if(!L) return;
  setSayFace(null);
  el.say.querySelector('.ex-say-name').textContent=L[0];
  el.say.querySelector('.ex-say-text').textContent=L[1];
  const R=(REST[MAP.id]||{})[o.lore], key=wizKeys[wizIdx];
  el.say.querySelectorAll('.ex-rest,.ex-choice').forEach(b=>b.remove()); let btn;
  if(R){
    btn=document.createElement('button'); btn.className='ex-btn ex-rest'; btn.type='button';
    const to=Math.max(hpOf(key),Math.ceil(maxHp(key)*R[0]));
    btn.textContent=to>hpOf(key)?'🛏 Rest ('+hpOf(key)+' → '+to+' HP)':'🛏 Rested';
    btn.disabled=to<=hpOf(key);
    btn.onclick=ev=>{ ev.stopPropagation(); vit[key]=to; clock=R[0]>=1?7*60:(clock+240)%1440; renderHp(); renderClock(); save(); hideSay(); toast(R[1]); };
    el.say.appendChild(btn);
  }
  el.say.hidden=false; el.hint.classList.add('fade');
}
// at a door, the building (or the lamp or statue by it) can still be inspected: the second button, or Q
function lookAtDoor(){ if(!nearLook||busy) return; near=nearLook; inspect(); }
function hideSay(){ if(el.say) el.say.hidden=true; dropFocus(); }
// a tapped button (✋ Inspect, a dialog choice) keeps focus after it hides, and Chrome then flashes
// a highlight on later taps; hand focus back to the page
function dropFocus(){ const a=document.activeElement; if(a&&a!==document.body&&el.root&&el.root.contains(a)&&a.blur) a.blur(); }
function inspect(){ if(!near) return; sayFace=near.npc?npcFace(near.npc):null;
  talkFocus=near.npc?{x:near.npc.x, y:near.npc.y, who:near.npc}:null;
  if(near.npc&&Math.abs(near.npc.x-wiz.x)>4) wiz.face=near.npc.x>wiz.x?1:-1;     // turn to them
  if(near.npc) talkTo(near.npc); else if(!(Folk&&Folk.inspect(near,folkApi))&&!roomAct(near)) showSay(near); }
// Banners queue rather than overwrite each other, stay up long enough to read
// (by length: TOAST_MS + TOAST_PER_CHAR, up to TOAST_MAX_MS), only count down
// while the map is on screen (not during a fight or with the tab hidden), and
// a tap dismisses one early.
const TOAST_MS=2500, TOAST_PER_CHAR=65, TOAST_MIN_MS=3500, TOAST_MAX_MS=11000;
let toastTimer=0, toastLeft=0, toastQ=[];
function toastShowing(){ return !el.toast.hidden&&el.toast.offsetParent!==null&&!document.hidden; }
function toastNext(){
  const msg=toastQ.shift();
  if(msg==null){ el.toast.hidden=true; clearInterval(toastTimer); toastTimer=0; return; }
  el.toast.textContent=msg; el.toast.hidden=false;
  toastLeft=Math.min(TOAST_MAX_MS,Math.max(TOAST_MIN_MS,TOAST_MS+msg.length*TOAST_PER_CHAR));
  if(!toastTimer) toastTimer=setInterval(()=>{ if(toastShowing()&&(toastLeft-=200)<=0) toastNext(); },200);
}
function toast(msg){
  msg=String(msg);
  if(el.toast.hidden){ toastQ=[msg]; toastNext(); return; }
  if(el.toast.textContent===msg||toastQ.includes(msg)) return;
  toastQ.push(msg);
  if(toastQ.length>1) toastLeft=Math.min(toastLeft,1500);   // a backlog moves things on a little
}

// ═══ LOOP ══════════════════════════════════════════════════════════
// a room with foes still in it can't be left: they're between you and the door (no slipping in
// and out to dodge a fight; losing still throws you out, through takeExit directly)
function roomLocked(){ return !!(MAP&&MAP.interior&&actors.length); }
let lockToastT=0;
function blocked(x,y){
  const b={x:x-12,y:y-9,w:24,h:9};
  if(roomLocked()) for(const e of MAP.exits||[]) if(overlap(b,{x:e.x,y:e.y-14,w:e.w,h:e.h+14})) return true;
  if(b.x<T*0.3||b.y<T*0.5||b.x+b.w>WORLD_W-T*0.3||b.y+b.h>WORLD_H-4) return true;
  for(const c of boxes) if(overlap(b,c)) return true;
  for(const c of MAP.blocks||[]) if(overlap(b,c)) return true;
  if(wet(b.x,b.y)||wet(b.x+b.w,b.y)||wet(b.x,b.y+b.h)||wet(b.x+b.w,b.y+b.h)) return true;
  return false;
}
// Indoors, interior walls split the rooms: anything walking somewhere (you by tap, a charging Echo)
// finds its way round them on a coarse grid (NAV px cells, worked out once per room), then heads for
// the farthest point along the way it can walk straight to.
const NAV=24; let navGrid=null;
function navOpen(){
  if(navGrid) return navGrid;
  const nc=Math.ceil(WORLD_W/NAV), nr=Math.ceil(WORLD_H/NAV), g=new Uint8Array(nc*nr);
  for(let j=0;j<nr;j++) for(let i=0;i<nc;i++) g[j*nc+i]=blocked(i*NAV+NAV/2,j*NAV+NAV/2)?0:1;
  return navGrid={nc,nr,g};
}
function clearLine(x0,y0,x1,y1){ const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/8); for(let k=1;k<=n;k++) if(blocked(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n)) return false; return true; }
function navPath(x0,y0,x1,y1){
  const {nc,nr,g}=navOpen(), cl=(v,m)=>Math.max(0,Math.min(m-1,v));
  const s=cl(Math.floor(y0/NAV),nr)*nc+cl(Math.floor(x0/NAV),nc), e=cl(Math.floor(y1/NAV),nr)*nc+cl(Math.floor(x1/NAV),nc);
  const prev=new Int32Array(nc*nr).fill(-1), q=[s]; prev[s]=s;
  for(let h=0;h<q.length;h++){ const c=q[h]; if(c===e) break; const cx=c%nc;
    for(const n of [c-nc,c+nc,cx>0?c-1:-1,cx<nc-1?c+1:-1]) if(n>=0&&n<nc*nr&&prev[n]<0&&(g[n]||n===e)){ prev[n]=c; q.push(n); } }
  if(prev[e]<0) return null;
  const out=[{x:x1,y:y1}]; for(let c=prev[e];c!==s;c=prev[c]) out.unshift({x:(c%nc)*NAV+NAV/2,y:Math.floor(c/nc)*NAV+NAV/2});
  return out;
}
function routeStep(m,tx,ty){   // m = a mover with x, y; where it should head next to reach (tx, ty)
  if(!MAP.interior||clearLine(m.x,m.y,tx,ty)){ m.path=null; return {x:tx,y:ty}; }
  const now=performance.now();
  if(!m.path||now-(m.pathT||0)>300){ m.path=navPath(m.x,m.y,tx,ty); m.pathT=now; }
  if(!m.path) return {x:tx,y:ty};
  while(m.path.length>1&&Math.hypot(m.path[0].x-m.x,m.path[0].y-m.y)<8) m.path.shift();
  for(let k=Math.min(m.path.length-1,10);k>0;k--) if(clearLine(m.x,m.y,m.path[k].x,m.path[k].y)) return m.path[k];
  return m.path[0];
}
// an exit reaches a little past the map's edge, where you can't walk, so test generously
function exitAt(x,y){
  for(const e of MAP.exits||[]) if(overlap({x:x-14,y:y-10,w:28,h:10},e)) return e;
  return null;
}
function update(dt){
  if(scene){ wiz.moving=false; el.act.hidden=true; el.look.hidden=true; scene.update(dt); return; }
  if(busy||worldOpen||bagOpen||creating){ wiz.moving=false; return; }
  let dx=0, dy=0;
  if(keys.has('arrowleft')||keys.has('a')) dx--;
  if(keys.has('arrowright')||keys.has('d')) dx++;
  if(keys.has('arrowup')||keys.has('w')) dy--;
  if(keys.has('arrowdown')||keys.has('s')) dy++;
  if(!dx&&!dy&&target){
    const dist=Math.hypot(target.x-wiz.x,target.y-wiz.y), w=dist<5?null:routeStep(wiz,target.x,target.y);
    if(!w) target=null; else { const tx=w.x-wiz.x, ty=w.y-wiz.y, d=Math.hypot(tx,ty)||1; dx=tx/d; dy=ty/d; }
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
  if(grace>0) grace-=dt;
  if(Year&&(yearT+=dt)>2){ yearT=0; Year.tick(folkApi); if(busy) return; }
  updateEchoes(dt); if(busy) return;
  updateBands(dt); if(busy) return;
  updateStrollers(dt);
  // a way out? (you must step out of the one you arrived in first)
  const ex=exitAt(wiz.x,wiz.y);
  if(!ex) exitArmed=true;
  else if(exitArmed&&!roomLocked()){ exitArmed=false; takeExit(ex); return; }
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
  for(const n of npcs){ if(!present(n)) continue; const d=Math.hypot(n.x-wiz.x,(n.y-wiz.y)*1.3); if(d<best+12){ best=d-12; near=Object.assign(n,{npc:n,lore:'npc'}); } }
  // a door beats inspecting things: standing at it, the building itself (and the lamps and statues by
  // it) are always in inspect range, which used to hide the door (Wrenford's Remnant Library); people still win
  nearDoor=null;
  if(!near||!near.npc){ let bd=40; for(const dr of doors){ const d=Math.hypot(dr.x-wiz.x,(dr.y-wiz.y)*1.4); if(d<bd){ bd=d; nearDoor=dr; } } }
  nearLook=null;
  if(nearDoor&&near){ nearLook=near; near=null; }
  // the action button: inspect what's near, enter a door, or take the way out you're close to
  if(roomLocked()&&nearExit&&wiz.moving&&Math.hypot(nearExit.x+nearExit.w/2-wiz.x,nearExit.y-wiz.y)<50&&performance.now()>lockToastT){
    lockToastT=performance.now()+3000; toast(MAP.ev&&MAP.ev.type==='party'?'They\'ve got the door. No way out but through them.':'The Echoes won\'t let you leave. Deal with them first.');
  }
  const exitClose=!roomLocked()&&nearExit&&Math.hypot(nearExit.x+nearExit.w/2-wiz.x,nearExit.y+nearExit.h/2-wiz.y)<(MAP.interior?110:170);
  el.act.hidden=!(near||nearDoor||exitClose)||!el.say.hidden;
  el.look.hidden=!nearLook||!el.say.hidden;
  if(nearLook) el.look.textContent='✋ '+loreOf(nearLook)[0];
  if(near) el.act.textContent=(near.npc?'💬 ':'✋ ')+(near.npc?npcTitle(near.npc):loreOf(near)[0]);
  else if(nearDoor) el.act.textContent='🚪 '+(nearDoor.label||'Enter');
  else if(exitClose) el.act.textContent='⟶ '+(nearExit.to==='world'?(nearExit.label||'Travel')+' (world map)':nearExit.label);
  // remember where you are
  saveT+=dt; if(saveT>2){ saveT=0; save(); }
}
// ── close-up zoom: on top of the fitted view (baseZoom, the most usable, and the default), so people
// can be seen more clearly. 🔍 / Z steps through ZOOM_STEPS, the mouse wheel and a pinch zoom freely
// between 1 and ZOOM_MAX; it eases there (zoomMul → zoomGoal). Remembered on this device.
const ZOOM_STEPS=[1,1.5,2.1], ZOOM_MAX=2.4;
let zoomMul=1, zoomGoal=1, zoomT=0;
try{ zoomGoal=zoomMul=Math.max(1,Math.min(ZOOM_MAX,+localStorage.getItem('wd-explore-zoom')||1)); }catch(e){}
function setZoom(z,now){
  zoomGoal=Math.max(1,Math.min(ZOOM_MAX,z)); if(now) zoomMul=zoomGoal;
  try{ localStorage.setItem('wd-explore-zoom',zoomGoal.toFixed(2)); }catch(e){}
  renderZoom();
}
function stepZoom(){ setZoom(ZOOM_STEPS.find(z=>z>zoomGoal+0.05)||1); }
function renderZoom(){ if(el&&el.zoom){ el.zoom.textContent=zoomGoal>1.05?'🔍 ×'+(Math.round(zoomGoal*10)/10):'🔍'; el.zoom.classList.toggle('on',zoomGoal>1.05); } }
// ── a close-up while you talk: the camera eases in on you and whoever you're talking to (talkFocus, set
// by inspect() / meetBand), framed above the dialog box, and back out when the box closes. It never
// changes your own zoom setting: it's TALK_ZOOM × the fitted view (at least TALK_ABS), or yours if that's closer.
const TALK_ZOOM=2, TALK_ABS=1.7;   // ×2 on your view, and at least 1.7 drawn size (phones start at 0.62)
let talkFocus=null, talkLast=null, talkBlend=0;
function updateCam(){
  const t=performance.now(), dt=Math.min(0.1,(t-(zoomT||t))/1000); zoomT=t;
  if(talkFocus&&el.say.hidden) talkFocus=null;
  if(talkFocus&&talkFocus.who&&talkFocus.who.gone) talkFocus=null;
  talkBlend+=((talkFocus?1:0)-talkBlend)*Math.min(1,dt*6); if(talkBlend<0.002) talkBlend=0;
  const sc=scene&&scene.cam?scene.cam(vw,vh,baseZoom):null; if(sc) sceneLast=sc;
  sceneBlend+=((sc?1:0)-sceneBlend)*Math.min(1,dt*2.5); if(sceneBlend<0.002){ sceneBlend=0; if(!sc) sceneLast=null; } if(sceneBlend>0.998&&sc) sceneBlend=1;
  const goal=sc?sc.zoom/baseZoom:talkFocus?Math.max(zoomGoal,Math.min(3,Math.max(TALK_ZOOM,TALK_ABS/baseZoom))):zoomGoal;   // phones start further out
  zoomMul+=(goal-zoomMul)*Math.min(1,dt*6); if(Math.abs(goal-zoomMul)<0.002) zoomMul=goal;
  zoom=baseZoom*zoomMul;
  const cw=vw/zoom, ch=vh/zoom;
  if(talkFocus) talkLast=talkFocus;                     // keep easing away from them after the box closes
  const b=talkLast?talkBlend:0, mx=talkLast?(wiz.x+talkLast.x)/2:wiz.x, my=talkLast?(wiz.y+talkLast.y)/2:wiz.y;
  if(!b) talkLast=null;
  const fx=wiz.x+(mx-wiz.x)*b, fy=wiz.y+(my-wiz.y)*b;
  let cx=fx-cw/2, cy=fy-WIZ_H/2-ch*(0.5-0.14*b);                    // the pair sits above the box
  if(sceneBlend){ const s=sceneLast; cx+=(s.x-cw/2-cx)*sceneBlend; cy+=(s.y-ch/2-cy)*sceneBlend; }   // a scene frames itself
  if(scene){ if(!sceneDrag&&t-scenePan.t>3000){ const k=Math.min(1,dt*2); scenePan.x-=scenePan.x*k; scenePan.y-=scenePan.y*k; }
    scenePan.x=Math.max(-cw-cx,Math.min(WORLD_W-cx,scenePan.x)); scenePan.y=Math.max(-ch-cy,Math.min(WORLD_H-cy,scenePan.y)); cx+=scenePan.x; cy+=scenePan.y; }
  cam.x=Math.max(0,Math.min(WORLD_W-cw,cx));
  cam.y=Math.max(0,Math.min(WORLD_H-ch,cy));
  if(cw>WORLD_W) cam.x=(WORLD_W-cw)/2; if(ch>WORLD_H) cam.y=(WORLD_H-ch)/2;
  if(scene&&scene.shake){ const q=scene.shake(); if(q){ cam.x+=(Math.random()-0.5)*q; cam.y+=(Math.random()-0.5)*q; } }
}

function drawPiece(kind,x,y,alpha,sc){
  sc=P.scaleOf(kind,sc);
  const q=rects[kind], w=q[2]*sc, h=q[3]*sc;
  const A=atlases[q[4]]; if(!A) return;            // its sheet is still on the way
  if(alpha!==undefined) ctx.globalAlpha=alpha;
  ctx.drawImage(A,q[0],q[1],q[2],q[3],x-w/2,y-h,w,h);
  ctx.globalAlpha=1;
}
const SEAT_CROP=0.6;          // seated on a bench (a lecture): the upper body, the bench hides the rest
function drawWizard(t){
  if(!wiz.seated){ ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(wiz.x,wiz.y-2,17,6,0,0,Math.PI*2); ctx.fill(); }
  if(!wizImg) return;
  const c=chars[wizKeys[wizIdx]];
  const sheet=wizImg.width===192&&wizImg.height===320;
  const sw=sheet?48:wizImg.width, sh=sheet?64:wizImg.height;
  const h=WIZ_H*(c.spriteHeight||1)*(wiz.seated?wiz.seatScale||1:MAP.people||1), w=h*sw/sh*(c.spriteWidth||1);
  const bob=wiz.moving?Math.abs(Math.sin(wiz.walk))*3.5:Math.sin(t/600)*0.8, k=wiz.seated?wiz.seatCrop||SEAT_CROP:1;
  const tilt=wiz.moving?Math.sin(wiz.walk)*0.05:0;
  ctx.save();
  ctx.translate(wiz.x,wiz.y-bob-(wiz.seated?wiz.seatLift||0:0));
  ctx.rotate(tilt);
  const flip=sheet?wiz.face>0:wiz.face<0;    // stills face right, the old sheets face left
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(wizImg,0,0,sw,sh*k,-w/2,-h*k,w,h*k);
  const g=c.glow; wizGlow=null;
  if(g&&!sheet&&window.StaffGlow&&g.y<k){                          // a made wizard's staff light (js/staff_glow.js)
    const lx=-w/2+g.x*w, ly=-h*k+g.y*h;
    StaffGlow.draw(ctx,lx,ly,Math.max(g.r*h,h*0.03),g.col,g.elem,t,1);
    wizGlow={x:wiz.x+(flip?-lx:lx), y:wiz.y-bob-(wiz.seated?wiz.seatLift||0:0)+ly, c:StaffGlow.rgb(g.col).join(','), lamp:g.lamp};
  }
  ctx.restore();
}
let wizGlow=null;    // where the hero's staff light was drawn this frame (world px), for the night (drawNight)
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
    const g=ground[y][x]; if(!g) continue;
    if(typeof g==='object'){ ctx.drawImage(quarterTile(g),x*T,y*T,T+0.6,T+0.6); continue; }
    const q=rects[g]; if(!atlases[q[4]]) continue;
    ctx.drawImage(atlases[q[4]],q[0]+1,q[1]+1,q[2]-2,q[3]-2,x*T,y*T,T+0.6,T+0.6);
  }
  drawCurrent(t,x0,x1,y0,y1);
  for(const b of bridges){
    const s=sizeOf(b.kind,b.scale);
    if(b.y<cam.y||b.y-s.h>cam.y+ch) continue;
    drawPiece(b.kind,b.x,b.y,undefined,b.scale);
  }
  if(MAP.theatre&&Lecture) Lecture.under(ctx,t,MAP,drawPiece);           // the theatre's tiers and the stage's edge
  if(!scene) drawExits(t);
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
    const s=sizeOf(o.kind,o.scale);
    if(o.x+s.w/2<cam.x||o.x-s.w/2>cam.x+cw||o.y-s.h>cam.y+ch||o.y<cam.y) continue;
    list.push(o);
  }
  list.push({wiz:true,y:wiz.y});
  for(const a of actors) if(a.x>cam.x-80&&a.x<cam.x+cw+80&&a.y>cam.y&&a.y<cam.y+ch+120) list.push({actor:a,y:a.y});
  for(const c of crews) if(c.x>cam.x-120&&c.x<cam.x+cw+120&&c.y>cam.y&&c.y<cam.y+ch+160) list.push({crew:c,y:c.y});
  for(const n of npcs) if(present(n)) list.push({npc:n,y:n.y});
  for(const s of strollers) if(s.x>cam.x-80&&s.x<cam.x+cw+80&&s.y>cam.y&&s.y<cam.y+ch+120) list.push({stroll:s,y:s.y});
  if(MAP.theatre&&Lecture) for(const a of Lecture.props(MAP,!!scene,drawPiece)) list.push({sc:a,y:a.y});
  if(scene) for(const a of scene.actors()) list.push({sc:a,y:a.y});
  list.sort((a,b)=>a.y-b.y);
  for(const o of list){
    if(o.sc){ o.sc.draw(ctx,t); continue; }
    if(o.wiz){ drawWizard(t); continue; }
    if(o.actor){ drawEcho(o.actor,t); continue; }
    if(o.crew){ drawCrew(o.crew,t); continue; }
    if(o.npc){ drawNpc(o.npc,t); continue; }
    if(o.stroll){ drawStroller(o.stroll,t); continue; }
    const s=sizeOf(o.kind,o.scale);
    // a tall piece in front of the wizard turns see-through
    const hides=o.y>wiz.y && s.h>90 && overlap(wizBox,{x:o.x-s.w/2,y:o.y-s.h,w:s.w,h:s.h-12});
    drawPiece(o.kind,o.x,o.y,hides?0.5:undefined,o.scale);
  }
  drawClashes(t);
  // inspect marker
  if(near && el.say.hidden && !scene){
    const s=near.npc?{h:WIZ_H}:near.decal?{h:40}:sizeOf(near.kind,near.scale), bob=Math.sin(t/250)*3;
    ctx.fillStyle='#ffd866'; ctx.strokeStyle='#3a2a08'; ctx.lineWidth=2;
    ctx.font='bold 18px Cinzel, serif'; ctx.textAlign='center';
    const my=(near.decal&&near.fb&&near.fb[0]?near.fb[0].y:near.y-Math.min(s.h,120))-8+bob;
    ctx.strokeText('?',near.x,my); ctx.fillText('?',near.x,my);
  }
  if(MAP.haze){ const [r,g,b,a]=MAP.haze.split(','); ctx.fillStyle=`rgba(${r},${g},${b},${a})`; ctx.fillRect(cam.x,cam.y,cw,ch); }
  const D=scene&&scene.dim?scene.dim():MAP.interior?0.55:darkness();
  if(D>0) drawNight(t,cw,ch,D);
  else if(MAP.storm) drawNight(t,cw,ch,0.25);   // Spirewatch is never quite light
  if(embers.length) drawEmbers(t,cw,ch);
  if(scene) scene.over(ctx,t,{x:cam.x, y:cam.y, w:cw, h:ch, zoom});
  drawGreetings(cw);
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
  const e=nearExit; if(!e||MAP.interior) return;
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
    const L=P.lightsOf(o.kind); if(!L||(o.decal&&P.BRIDGE[o.kind])) continue;
    const s=sizeOf(o.kind,o.scale);
    for(const [lx,ly,type] of L){
      const sc=P.scaleOf(o.kind,o.scale), fr=lx<=1&&ly<=1, x=o.x-s.w/2+(fr?lx*s.w:lx*sc), y=o.y-s.h+(fr?ly*s.h:ly*sc);
      // a burnt house's windows glow ember-orange: what's inside isn't a hearth
      if(near(x,y)) out.push({x,y,r:(type==='lamp'?150:105)*(MAP.interior?0.8:1),seed:o.id,c:type==='lamp'?undefined:o.kind.endsWith('_burnt')?'255,120,50':MAP.windowGlow&&PAL&&o.kind.endsWith(PAL)?MAP.windowGlow:undefined});
    }
  }
  for(const g of MAP.glows||[]) if(near(g.x,g.y)) out.push({x:g.x,y:g.y,r:g.r,c:g.c,seed:g.x});
  for(const n of npcs) if(!n.gone&&NPC_SPRITE[n.role]&&near(n.x,n.y)) out.push({x:n.x,y:n.y-WIZ_H*0.6,r:120,c:n.role==='wenna'?'255,140,60':'255,215,120',seed:n.x});
  for(const a of actors) if(a.e.el&&near(a.x,a.y)){ const h=parseInt(SPILL[a.e.el][1].slice(1),16); out.push({x:a.x,y:a.y-WIZ_H*0.6,r:a.strong?150:110,c:[h>>16,(h>>8)&255,h&255].join(','),seed:a.e.x}); }
  return out;
}
function drawNight(t,cw,ch,D){
  const lights=lightsInView(cw,ch);
  lights.push({x:wiz.x,y:wiz.y-WIZ_H*0.6,r:140,wiz:true,seed:0});
  if(wizGlow) lights.push({x:wizGlow.x,y:wizGlow.y,r:wizGlow.lamp?190:120,c:wizGlow.c,seed:7});   // your staff lights the street
  dctx.setTransform(dpr*zoom,0,0,dpr*zoom,-cam.x*dpr*zoom,-cam.y*dpr*zoom);
  dctx.globalCompositeOperation='source-over';
  dctx.clearRect(cam.x,cam.y,cw,ch);
  dctx.fillStyle=`rgba(${Math.round(8+40*(1-D))},${Math.round(12+10*(1-D))},${Math.round(36-6*(1-D))},${(0.66*D).toFixed(3)})`; dctx.fillRect(cam.x,cam.y,cw,ch);   // dusk is warmer
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
    g.addColorStop(0,`rgba(${c},${(L.c?0.3:0.38)*flick*D})`); g.addColorStop(1,`rgba(${c},0)`);
    ctx.fillStyle=g; ctx.fillRect(L.x-r,L.y-r,r*2,r*2);
  }
  for(const f of fireflies){
    const x=f.x+Math.sin(t/1900+f.a)*f.s*3, y=f.y+Math.cos(t/2300+f.a)*f.s*2;
    if(x<cam.x||x>cam.x+cw||y<cam.y||y>cam.y+ch) continue;
    const a=(0.5+0.5*Math.sin(t/400+f.p))*D;
    const g=ctx.createRadialGradient(x,y,0,x,y,7);
    g.addColorStop(0,`rgba(220,255,140,${0.9*a})`); g.addColorStop(1,'rgba(160,255,80,0)');
    ctx.fillStyle=g; ctx.fillRect(x-7,y-7,14,14);
  }
  ctx.globalCompositeOperation='source-over';
}
// each map's weather (MAP.fx): particles that drift through it, day and night.
// n = particles per tile, v = [min speed, extra] in px/s along their path
const FX_TYPES = {
  embers:{n:1/6, v:[18,30]}, motes:{n:1/7, v:[12,22]}, snow:{n:1/4, v:[25,30]}, rain:{n:1/3, v:[420,200]},
  dust:{n:1/8, v:[10,20]},   wind:{n:1/9, v:[260,160]}, shade:{n:1/14, v:[6,10]},
};
function drawEmbers(t,cw,ch){
  const fx=MAP.fx, sec=t/1000;
  const vis=(x,y,m)=>!(x<cam.x-m||x>cam.x+cw+m||y<cam.y-m||y>cam.y+ch+m);
  ctx.globalCompositeOperation=fx==='shade'||fx==='dust'?'source-over':'lighter';
  for(const e of embers){
    const life=((sec*e.v/300)+e.p)%1;
    if(fx==='embers'||fx==='motes'){                              // rise and flicker
      const x=e.x+Math.sin(t/900+e.w)*14+life*30, y=e.y-life*300; if(!vis(x,y,10)) continue;
      const a=Math.sin(life*Math.PI)*(0.55+0.45*Math.sin(t/90+e.w*7));
      ctx.fillStyle=fx==='embers'?`rgba(255,${120+Math.round(80*(1-life))},40,${a.toFixed(2)})`:`rgba(${170+Math.round(60*life)},120,255,${a.toFixed(2)})`;
      ctx.fillRect(x,y,e.s*1.6,e.s*1.6);
    } else if(fx==='snow'){                                       // fall, swaying
      const x=e.x+Math.sin(t/1300+e.w)*22, y=e.y-150+life*300; if(!vis(x,y,10)) continue;
      ctx.fillStyle=`rgba(240,248,255,${(0.75*Math.sin(life*Math.PI)).toFixed(2)})`; ctx.fillRect(x,y,e.s*1.8,e.s*1.8);
    } else if(fx==='rain'){                                       // fast, slanted streaks
      const x=e.x+life*80, y=e.y-150+life*300; if(!vis(x,y,20)) continue;
      ctx.strokeStyle='rgba(170,200,240,0.32)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y-14); ctx.stroke();
    } else if(fx==='dust'){                                       // drifting grit
      const x=e.x+life*300, y=e.y+Math.sin(t/1700+e.w)*18; if(!vis(x,y,10)) continue;
      ctx.fillStyle=`rgba(200,170,110,${(0.45*Math.sin(life*Math.PI)).toFixed(2)})`; ctx.fillRect(x,y,e.s*2,e.s*2);
    } else if(fx==='wind'){                                       // gusts: long streaks and blown leaves
      const x=e.x-150+life*300, y=e.y+Math.sin(life*6+e.w)*10; if(!vis(x,y,40)) continue;
      const a=Math.sin(life*Math.PI);
      if(e.s>2.2){ ctx.fillStyle=`rgba(230,170,90,${(0.8*a).toFixed(2)})`; ctx.fillRect(x,y,3,2); }
      else { ctx.strokeStyle=`rgba(240,245,255,${(0.3*a).toFixed(2)})`; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-36,y-2); ctx.stroke(); }
    } else if(fx==='shade'){                                      // slow drifting smudges of dark
      const x=e.x+Math.sin(t/2500+e.w)*30, y=e.y-life*120; if(!vis(x,y,40)) continue;
      const g=ctx.createRadialGradient(x,y,0,x,y,22+e.s*8);
      g.addColorStop(0,`rgba(20,0,35,${(0.35*Math.sin(life*Math.PI)).toFixed(2)})`); g.addColorStop(1,'rgba(20,0,35,0)');
      ctx.fillStyle=g; ctx.fillRect(x-40,y-40,80,80);
    }
  }
  ctx.globalCompositeOperation='source-over';
  // Spirewatch's lightning: a flash, a second flicker, every few seconds
  if(MAP.storm){
    const k=t%6300, f=k<90?1:k>200&&k<260?0.6:0;
    if(f){ ctx.fillStyle=`rgba(200,215,255,${0.28*f})`; ctx.fillRect(cam.x,cam.y,cw,ch); }
  }
}
function drawMini(){
  const m=el.mini.getContext('2d');
  m.drawImage(mini,0,0);
  const k=4/T;
  m.strokeStyle='rgba(255,255,255,0.7)'; m.lineWidth=1;
  m.strokeRect(cam.x*k+0.5,cam.y*k+0.5,vw/zoom*k,vh/zoom*k);
  for(const a of actors){ m.fillStyle=a.e.el?SPILL[a.e.el][1]:'#ff5050'; m.fillRect(a.x*k-1.5,a.y*k-1.5,3,3); }
  for(const c of crews){ m.fillStyle=c.b.col; m.strokeStyle='#000'; m.fillRect(c.x*k-2.5,c.y*k-2.5,5,5); m.strokeRect(c.x*k-2.5,c.y*k-2.5,5,5); }
  m.fillStyle='#fff'; m.beginPath(); m.arc(wiz.x*k,wiz.y*k,2.5,0,Math.PI*2); m.fill();
}
let clockT=0;
function frame(now){
  if(!running) return;
  const dt=Math.min(0.05,(now-last)/1000||0); last=now;
  if(MAP){ if(!busy&&!worldOpen) clock=(clock+dt*1000*1440/DAY_MS)%1440; update(dt); draw(now); }
  if((clockT+=dt)>1){ clockT=0; renderClock(); }
  requestAnimationFrame(frame);
}

// ═══ OPEN / CLOSE ══════════════════════════════════════════════════
function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
// Atlases load when a map needs them, not all at start: the names (rects) come from every sheet's
// small .json up front, but a sheet's image is fetched the first time a map uses one of its pieces
// (atlasesFor, from enterMap), and the maps next door are fetched in the background (prefetchAround).
// data files have no ?v= of their own: revalidate them, so a cached old copy never meets newer code
const NC={cache:'no-cache'};
// CORE sheets are the ground and the loot every map and the satchel use.
const ATLAS_NAMES=['ruins','ruins2','ruins3','ruins4','ruins5','ruins6','ruins7','ruins8','ruins9','ruins10','ruins11','ruins12','ruins13',
  'ruins14','ruins15','ruins16','ruins17','ruins18','ruins19','ruins20','ruins21','ruins22','ruins23','ruins24','ruins25','ruins26'];
const CORE_ATLASES=['ruins','ruins2','ruins3','ruins13'];
const atlasLoading={};
function loadAtlas(i){
  if(!atlasLoading[i]) atlasLoading[i]=LoadBar.image('sprites/ruins/'+ATLAS_NAMES[i]+'.png',ATLAS_EST).then(img=>{ atlases[i]=img; quarterCache.clear(); return img; });
  return atlasLoading[i];
}
// the sheets a map draws from: its pieces' and its ground's (the ground letters that aren't on a core sheet)
const GROUND_PIECE={S:'tr_snow_11',F:'tr_flood_11',X:'tr_wound_21',w:'floorWood1',l:'floorFlag1',y:'floorTerra1',b:'floorBroken1',u:'floorSewer',q:'sewerChannel'};
function atlasesFor(data){
  const need=new Set(CORE_ATLASES.map(n=>ATLAS_NAMES.indexOf(n)));
  for(const o of data.objects||[]){ const q=rects[o[0]]; if(q&&q[4]<ATLAS_NAMES.length) need.add(q[4]); }
  const letters=new Set((data.ground||[]).join(''));
  for(const c of letters){ const q=rects[GROUND_PIECE[c]]; if(q) need.add(q[4]); }
  return Promise.all([...need].map(loadAtlas));
}
// while you walk about, quietly fetch the maps your exits lead to and their sheets
function prefetchAround(data){
  if(!data||data.interior) return;
  const ids=[...new Set((data.exits||[]).map(e=>e.to&&e.to.map).filter(Boolean))];
  const go=()=>ids.forEach(id=>getMap(id).then(d=>{ atlasesFor(d); if(d.palette) loadPalette(d.palette); }).catch(()=>{}));
  if(window.requestIdleCallback) requestIdleCallback(go,{timeout:4000}); else setTimeout(go,1500);
}
async function load(){
  if(built) return;
  const [cj,wj,fj,...sheets]=await Promise.all([
    LoadBar.json('characters.json',NC,30000),
    LoadBar.json('maps/world.json',NC,8000),
    LoadBar.json('fighters.json',NC,8000),
    ...ATLAS_NAMES.map(n=>LoadBar.json('sprites/ruins/'+n+'.json',NC,1500)),
  ]);
  LoadBar.next();                                   // on to the core sheets
  // one name space across every sheet: [x, y, w, h, atlas index]
  atlases=ATLAS_NAMES.map(()=>null); rects={};
  sheets.forEach((rj,i)=>{ for(const k in rj) rects[k]=[...rj[k],i]; });
  await Promise.all(CORE_ATLASES.map(n=>loadAtlas(ATLAS_NAMES.indexOf(n))));
  chars=cj; world=wj; fighters=fj;
  wizKeys=Object.keys(chars).filter(k=>chars[k].sprite);
  built=true;
}
// open({fresh:true}) is New Game: a new save slot, so the creator opens in Wrenford.
// open({random:true}) (Test → 🎲 Random Graduate) is a new slot with a random wizard who has already sat
// Finals: no creator or introduction, three random electives (randomGraduate).
// open({slot:key}) loads that slot (Load Game); open() (Test → Explore) the profile's latest, or a new one.
async function open(opts){
  opts=opts||{};
  if(!el.root) buildDom();
  el.root.classList.add('active');
  if(opts.random) opts.fresh=true;
  { const who=profileNow(), k=opts.fresh?null:(opts.slot||(who.id===saveOwner&&saveKey)||((slotsOf(who.id)[0]||{}).key));
    const sv=k&&!opts.fresh?loadSave(k):null, warm=MAP&&k===saveKey&&who.id===saveOwner, m=sv&&sv.map?(sv.map.startsWith('room:')&&sv.roomSpec&&sv.roomSpec.outside?sv.roomSpec.outside.map:sv.map):null;
    if(!warm){
      const n=window.ExploreHero?npcCount():0, plan=[n*((built?0:NPC_FIG_EST)+NPC_PAINT)+1, MAP_EST, 4*ATLAS_EST];   // townsfolk, map, its sheets
      if(!built) plan.unshift(DATA_EST, CORE_EST);
      showLoading(m&&!m.startsWith('room:')?m:(opts.fresh?'wrenford':null), sv?sv.place:(opts.fresh?'Wrenford':''), plan);
    } }
  running=true; resize();
  try{
    if(!built){ await load(); LoadBar.next(); }      // on to the townsfolk
    const who=profileNow();
    let key=opts.fresh?newSlotKey(who.id):opts.slot;
    if(!key) key=(who.id===saveOwner&&saveKey)||((slotsOf(who.id)[0]||{}).key)||newSlotKey(who.id);
    if(key!==saveKey||who.id!==saveOwner) MAP=null;  // another game: load it from the start
    saveOwner=who.id; saveKey=key;
    var s=loadSave(key);
    applySave(s); renderSpill();
    await prepNpcs();
    if(!MAP){
      if(s&&s.map) await enterMap(s.map,[s.x,s.y],true);
      else await enterMap(START.map,START.spawn,true);
      if(!MAP) await enterMap(START.map,START.spawn,true);
    }
  }
  catch(err){ el.lTip.textContent='Couldn\'t load the map. ('+((err&&err.message)||err)+') Try reloading the page.'; LoadBar.stop(); el.lFill.style.width='0%'; console.error(err); return; }
  await hideLoading();
  sizeMini();
  let saved=s&&s.wiz; if(!saved) try{ saved=localStorage.getItem('wd-explore-wiz'); }catch(e){}
  setWizard(Math.max(0,wizKeys.indexOf(saved||'eldrin'))); renderClock();
  if(!hero&&window.ExploreHero&&opts.random) await randomGraduate();
  else if(!hero&&window.ExploreHero) await createHero(false); else { stopTheme(); await useHero(); }
  last=performance.now(); requestAnimationFrame(frame);
  el.hint.classList.remove('fade');
  setTimeout(()=>{ if(el.hint) el.hint.classList.add('fade'); },7000);
}
function close(){
  save(); stopTheme();
  running=false; keys.clear(); target=null; hideSay(); closeWorld(); syncMusic();
  el.root.classList.remove('active');
  refreshTitle(); titleMusic();
}

// ── title screen: New Game, Load Game (a list of this profile's wizards), the rest behind Test ──
function refreshTitle(){
  const load=document.getElementById('btn-load-game'), note=document.getElementById('title-load-note');
  if(!load) return;
  const n=slotsOf(profileNow().id).length;
  load.disabled=!n;
  if(note) note.textContent=n?n+' saved wizard'+(n>1?'s':''):'No saved game yet';
}
const escHtml=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let loadEl=null, loadConfirm=null;
function openLoad(){
  if(!loadEl){
    loadEl=document.createElement('div'); loadEl.id='load-overlay';
    loadEl.innerHTML='<div class="pf-box ld-box"><div class="ld-head">Load Game</div><div class="ld-sub"></div><div class="ld-list"></div><button class="btn wd-back-btn ld-back" type="button">← Back</button></div>';
    document.body.appendChild(loadEl);
    loadEl.addEventListener('click',e=>{
      const t=e.target.closest('button'); if(!t) return;
      if(t.classList.contains('ld-back')){ closeLoad(); return; }
      const key=t.dataset.key; if(!key) return;
      if(t.classList.contains('ld-del')){
        if(loadConfirm!==key){ loadConfirm=key; renderLoad(); return; }
        try{ localStorage.removeItem(key); }catch(e){}
        if(key===saveKey){ saveKey=null; MAP=null; }
        loadConfirm=null; renderLoad(); refreshTitle();
        if(!slotsOf(profileNow().id).length) closeLoad();
        return;
      }
      closeLoad(); open({slot:key});
    });
  }
  loadConfirm=null; renderLoad(); loadEl.classList.add('show');
}
function closeLoad(){ if(loadEl) loadEl.classList.remove('show'); loadConfirm=null; refreshTitle(); }
function renderLoad(){
  const who=profileNow(), list=slotsOf(who.id), H=window.ExploreHero;
  loadEl.querySelector('.ld-sub').textContent=who.name+'’s wizards';
  const ago=t=>t?new Date(t).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  loadEl.querySelector('.ld-list').innerHTML=list.length?list.map(({key,s})=>{
    const h=s.hero, el=H&&h?(H.ELEMS.find(e=>e.id===h.elem)||{}):{};
    const title=h?({young:'Novice',middle:'Journeyman',old:'Hedge-Mage'}[h.age]||'Wizard')+' of '+(el.name||'?'):'Not made yet';
    const where=[s.place, ago(s.t)].filter(Boolean).join(' · ');
    const conf=loadConfirm===key;
    return `<div class="ld-slot"><button type="button" class="pf-row ld-row" data-key="${key}">`+
      `<span class="ld-face" style="--ec:${el.col||'#c9a84c'}"><img alt="" data-face="${key}"></span>`+
      `<span class="pf-row-txt"><b>${escHtml(h&&h.name||'Unnamed wizard')}</b><small>${escHtml(title)}</small><small>${escHtml(where)}</small></span>`+
      `<span class="ld-gold">${s.gold||0} gold</span></button>`+
      `<button type="button" class="ld-del${conf?' on':''}" data-key="${key}" title="Delete this save">${conf?'Delete?':'🗑'}</button></div>`;
  }).join(''):'<div class="pf-empty">No saved wizards yet. Start a New Game.</div>';
  // faces are painted from each hero's look (as in the game), after the list is up
  if(H) list.forEach(({key,s})=>{ if(!s.hero) return;
    H.def(s.hero).then(d=>{ const img=loadEl.querySelector(`img[data-face="${key}"]`); if(img) img.src=d.face; }).catch(()=>{}); });
}
window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-explore');
  if(b) b.addEventListener('click',()=>open());
  const rg=document.getElementById('btn-random-grad');
  if(rg) rg.addEventListener('click',()=>open({random:true}));
  const nb=document.getElementById('btn-new-game'), lb=document.getElementById('btn-load-game');
  const tb=document.getElementById('btn-test'), tp=document.getElementById('title-test');
  if(nb) nb.addEventListener('click',()=>{ playTheme(); open({fresh:true}); });
  if(lb) lb.addEventListener('click',()=>{ if(!lb.disabled) openLoad(); });
  if(tb&&tp) tb.addEventListener('click',()=>{
    tp.hidden=!tp.hidden; tb.setAttribute('aria-expanded',String(!tp.hidden));
  });
  refreshTitle();
  document.addEventListener('wd-profile-changed',refreshTitle);
  // the main theme follows the title screen as other screens come and go
  const ts=document.getElementById('title-screen');
  if(ts) new MutationObserver(titleMusic).observe(ts,{attributes:true,attributeFilter:['class']});
  // the splash's Play tap leads to the title: start the theme inside that tap, so phones allow it
  const sp=document.getElementById('btn-splash-play');
  if(sp) sp.addEventListener('click',playTheme);
  titleMusic();
});
window.Explore={open, close, refreshTitle, titleMusic:()=>titleMusic(),
  _talk:n=>talkTo(n), _magic:()=>magic, _folk:()=>folkApi,
  _setClock:m=>folkApi.setClock(m),
  _fightActor:id=>{ const a=actors.find(x=>x.e.incident===id||x.e.id===id); if(a) fight(a); return !!a; }, _actorIds:()=>actors.map(a=>a.e.incident||a.e.id), _quests:()=>quests, _allies:()=>allies, _tick:()=>Year&&Year.tick(folkApi),
  knowAll:()=>{ if(!hero) return false; magic=fullMagic(hero.elem); applyMagic(); save(); return true; },   // testing: the whole Year at once
  enterMap:(id,at)=>enterMap(id,at||'start'), _doors:()=>doors, _rects:()=>rects, _enterDoor:d=>enterDoor(d), _state:()=>({gold,potions,allies,rescues,spill,booksRead,vit}), _objs:()=>objs, _npcs:()=>npcs, _strollers:()=>strollers, _present:n=>present(n), _mapId:()=>MAP.id, _exit:()=>MAP.exits[0],
  _actors:()=>actors.map(a=>({x:Math.round(a.x),y:Math.round(a.y)})), _wiz:()=>({x:Math.round(wiz.x),y:Math.round(wiz.y)}), _place:(x,y)=>{ wiz.x=x; wiz.y=y; target=null; }, _blocked:(x,y)=>blocked(x,y), _crews:()=>crews, _hero:()=>hero, _bands:()=>bandState, _echoes:()=>actors,
  // cells of the room you can't reach from the door; the doorway out (barred while foes remain) doesn't count
  _reach:()=>{ const {nc,nr,g}=navOpen(), sp=MAP.spawns.door||MAP.spawns.start, s=Math.floor(sp[1]/NAV)*nc+Math.floor(sp[0]/NAV), seen=new Uint8Array(nc*nr), q=[s]; seen[s]=1;
    for(let h=0;h<q.length;h++){ const c=q[h], cx=c%nc; for(const n of [c-nc,c+nc,cx>0?c-1:-1,cx<nc-1?c+1:-1]) if(n>=0&&n<nc*nr&&!seen[n]&&g[n]){ seen[n]=1; q.push(n); } }
    let open=0, un=0; for(let i=0;i<g.length;i++) if(g[i]&&Math.floor(i/nc)*NAV<sp[1]){ open++; if(!seen[i]) un++; }
    return {open, unreached:un}; }};
})();
