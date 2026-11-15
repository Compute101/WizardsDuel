// ═══════════════════════════════════════════════════════════════════
//  EXPLORE — walk a wizard around the ruined town of Hollowmere.
//  Self-contained: builds its own full-screen overlay, loads the
//  tileset atlases (sprites/ruins/ruins*.png and their .json,
//  cut by tools/cut_ruins_tileset.py) and characters.json for the wizards.
//  The map is generated from a fixed seed, so it's the same town every time.
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';

const T = 64;                 // ground tile size, world px
const COLS = 48, ROWS = 34;
const RIVER = {c0:28, c1:30};  // the Hollow, a river running north–south (tile columns)
const WORLD_W = COLS*T, WORLD_H = ROWS*T;
const PS = 0.62;              // prop scale: atlas px → world px (a ground tile is ~100 atlas px)
const WIZ_H = 62;             // wizard drawn height, world px (a door is ~70 atlas px → ~43, shoulders reach the lintel)
const SPEED = 175;            // world px / s
const INSPECT_R = 46;         // how close (to its footprint's edge) to stand to inspect something
const TOWN = 'Hollowmere';

// ── footprints: the part of each piece you can't walk through ──
// ox = centre across the width (0–1), w = width fraction, h = depth in world px
const FOOT = {
  house:   [{w:.9, h:.5}],      // h < 1 → fraction of the drawn height
  tree:    [{w:.22,h:16}], deadtree:[{w:.2,h:16}],
  bush:    [{w:.7,h:20}],  flowerbush:[{w:.7,h:20}],
  crate1:  [{w:.85,h:24}], crate2:[{w:.85,h:22}], barrel:[{w:.8,h:20}],
  rubble:  [{w:.88,h:26}], ruinWall:[{w:.9,h:30}], wallLow:[{w:.95,h:22}], lowwall:[{w:.95,h:22}],
  rocks:   [{w:.85,h:18}], stone:[{w:.7,h:12}], stump:[{w:.6,h:14}],
  lamppost:[{ox:.2,w:.18,h:10}], post:[{ox:.22,w:.2,h:10}], banner:[{ox:.19,w:.18,h:10}],
  statue:  [{w:.85,h:28}], shrine:[{w:.85,h:26}], brokenStatue:[{w:.85,h:26}],
  pillar:  [{w:.85,h:18}],
  arch:    [{ox:.11,w:.22,h:22},{ox:.89,w:.22,h:22}],
  fence:   [{w:.95,h:14}], brokenFence:[{w:.9,h:14}], logs:[{w:.8,h:16}], wheel:[{w:.7,h:12}],
  // river & docks sheet
  crate:[{w:.85,h:22}], crateStand:[{w:.85,h:20}], sacks:[{w:.85,h:18}], planks:[{w:.8,h:14}],
  wagon:[{w:.85,h:26}], cart:[{w:.8,h:22}], brokenCart:[{w:.8,h:22}], gravel:[{w:.7,h:10}],
  chainFence:[{w:.95,h:12}], postTall:[{w:.8,h:14}], post2:[{w:.8,h:12}], postRing:[{w:.8,h:12}],
  bannerP:[{ox:.5,w:.2,h:10}], bannerTorn:[{ox:.5,w:.2,h:10}],
  lamp2:[{ox:.72,w:.2,h:10}], lamp3:[{ox:.5,w:.3,h:10}], lamp4:[{ox:.72,w:.2,h:10}],
  blocks:[{w:.85,h:20}], stoneArch:[{ox:.12,w:.24,h:22},{ox:.88,w:.24,h:22}], woodArch:[{ox:.15,w:.2,h:12},{ox:.85,w:.2,h:12}],
  brokenArch:[{ox:.2,w:.34,h:20},{ox:.82,w:.34,h:20}],
  crane:[{ox:.07,w:.12,h:14},{ox:.93,w:.12,h:14},{ox:.5,w:.34,h:14}],
  craneBroken:[{ox:.3,w:.2,h:14},{ox:.75,w:.15,h:14}], gallowsHook:[{ox:.2,w:.15,h:14},{ox:.7,w:.15,h:14}],
  gallows:[{ox:.85,w:.18,h:14}],
  // buildings sheet: backs, sides, the big three
  back:[{w:.9,h:.45}], side:[{w:.88,h:.45}],
  tavern:[{w:.86,h:.4}], chapel:[{w:.82,h:.4}], tower:[{ox:.4,w:.62,h:.32},{ox:.82,w:.34,h:.22}],
};
function footOf(kind){
  if(FOOT[kind]) return FOOT[kind];
  let best=null; for(const k in FOOT) if(kind.startsWith(k) && (!best||k.length>best.length)) best=k;
  return best?FOOT[best]:[{w:.8,h:16}];
}

// light sources inside a piece, in atlas px of its trimmed crop
const LIGHTS = {
  house1:[[165,208]], house2:[[70,205],[158,205]], house3:[[170,205]],
  house4:[[170,208]], house5:[[180,190]], house6:[[77,185]],
  tavern:[[114,218],[288,218],[92,332],[153,332],[280,332],[337,330,'lamp']],
  chapel:[[196,175],[128,258],[273,258],[124,364],[274,362]],
  tower:[[106,234],[198,330],[232,326],[106,406]],
  backTerra1:[[142,176]], backSlate:[[116,173]], backPurple:[[76,178],[155,178]], sideSlate:[[92,138]],
  lamppost:[[79,65,'lamp']], lamp2:[[23,45,'lamp']], lamp3:[[20,41,'lamp']], lamp4:[[21,41,'lamp']],
};

// house colour schemes by district (recolours made by tools/cut_ruins_tileset.py,
// named '<house>_<style>'; '' is the original terracotta and grey stone)
const HOUSE_STYLES = {
  west: ['', '', 'slate', 'slate', 'sand', 'moss'],   // the standing town
  east: ['char', 'char', 'dusk', ''],                 // burnt-out, and the old college's purple
};
const baseKind=k=>k.split('_')[0];

// things to inspect (the first piece of that kind near you)
const LORE = {
  statue:      ['The Hooded Watcher', 'Rain has worn its face away. Someone still leaves candle stubs at its feet, and the wax is fresh.'],
  shrine:      ['Wayside Shrine', 'The offering bowl is cracked, but it holds a single copper coin and a sprig of rosemary. Somebody here still prays.'],
  brokenStatue:['Fallen Hero', 'Only the boots remain. The plaque reads: "…ER THE BOLD, WHO HELD THE BRIDGE UNTIL THE LAST."'],
  banner:      ['Town Banner', 'A gold cross on crimson, the arms of Hollowmere. The town is dead, yet someone keeps the banner raised.'],
  deadtree:    ['Scarred Oak', 'A rune is cut deep into the bark: Ω, the sign of endings. The sap still weeps from it.'],
  wheel:       ['Cart Wheel', 'Splintered, the iron rim gone. Whoever fled with that cart did not get far.'],
  arch:        ['North Gate', 'The gate itself is long gone. Scorch marks lick up both pillars, higher than any torch could reach.'],
  well:        ['Old Well', 'Your voice comes back from the dark, a moment too late, and not quite in your own words.'],
  house1:      ['The Lit House', 'Locked. Warm light behind the shutters, and someone inside is humming an old duelling song.'],
  lamppost:    ['Lantern', 'Still burning. No one in Hollowmere admits to lighting them.'],
  crane:       ['Dock Crane', 'A crate still hangs from the hook, swaying though there is no wind. You decide not to open it.'],
  gallows:     ['The Gallows', 'The town has been empty for years. The rope is new.'],
  wagon:       ['Covered Wagon', 'Packed for a journey: blankets, salt pork, a lute with no strings. Whoever owned it left on foot.'],
  sacks:       ['Grain Sacks', 'Rye, gone to black mould. Something has been nibbling at the corner of one, and it wasn\'t a rat.'],
  bridgeBanner:['Banner Bridge', 'Purple and gold: the colours of the old duelling college that stood across the river. Duels were fought on this bridge at midsummer.'],
  bridgeBannerBroken:['Fallen Bridge', 'Brought down on purpose. The keystones were cut through, and the cuts glow faintly when you look away.'],
  bridgeWood:  ['Mill Bridge', 'The planks flex under you. Far below, something pale turns over in the water and is gone.'],
  bridgeStone: ['Old Stone Bridge', 'Older than the town. The mason\'s marks on the parapet are Arcana glyphs: θ Φ ☽ ∞, the Ice word.'],
  bridgeWoodBroken:['Broken Footbridge', 'Snapped in the middle. The far half still creaks as though someone were crossing it.'],
  tavern:      ['The Drowned Crow', 'The last tavern in Hollowmere. The fire is lit, the tankards are clean, and the chairs are all turned to face the door.'],
  chapel:      ['Chapel of the Watcher', 'The hooded figure in the niche matches the statue in the plaza. The pews are dusty, all but the front one.'],
  tower:       ['The College Tower', 'All that stands of the duelling college. The brass orrery on its roof still turns, tracking stars that are not in the sky.'],
  pond:        ['Mill Pond', 'Fat carp circle in the shallows, unafraid. Someone still comes down here to feed them.'],
  river:       ['The Hollow', 'Black water, slow and cold. It runs north to south, and the townsfolk said it ran the other way at night.'],
};

// ── seeded random ──
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const pick=(r,a)=>a[Math.floor(r()*a.length)];

// ── state ──
let atlases=[], rects=null, bridges=[], chars=null, wizKeys=[], wizIdx=0, wizImg=null;
let ground=null, groundKind=null, objs=[], boxes=[], fireflies=[];
let built=false, running=false, last=0, night=true;
let el={}, ctx=null, dark=null, dctx=null, mini=null;
const wiz={x:0,y:0,face:1,walk:0,moving:false};
const keys=new Set();
let target=null, stuckT=0, sayingObj=null, near=null, dpr=1, zoom=1, cam={x:0,y:0}, vw=0, vh=0;

// ═══ MAP ═══════════════════════════════════════════════════════════
function buildGround(){
  const r=rng(1427);
  const k=[]; for(let y=0;y<ROWS;y++){ k.push(new Array(COLS).fill('G')); }
  const fill=(x0,y0,x1,y1,c)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(k[y]&&k[y][x]!==undefined) k[y][x]=c; };
  fill(3,7,44,7,'D'); fill(3,26,44,26,'D');          // lanes
  fill(8,3,8,30,'D'); fill(39,3,39,30,'D');
  fill(23,30,39,30,'D');                            // the path to the old stone bridge
  fill(0,16,COLS-1,17,'R');                         // main street
  fill(21,0,22,ROWS-1,'R');                         // market street
  fill(17,13,26,20,'P');                            // plaza
  for(let y=0;y<ROWS;y++) for(let x=RIVER.c1+1;x<COLS;x++) if(k[y][x]==='R') k[y][x]='M';   // the ruined east
  fill(RIVER.c0,0,RIVER.c1,ROWS-1,'W');             // the river
  fill(RIVER.c1+1,9,RIVER.c1+6,12,'K');             // the docks on its east bank
  for(let y=0;y<7;y++) for(let x=21;x<=22;x++) k[y][x]='M';
  for(let y=28;y<ROWS;y++) for(let x=21;x<=22;x++) k[y][x]='M';
  // a few worn patches
  for(let i=0;i<14;i++){ const x=Math.floor(r()*COLS), y=Math.floor(r()*ROWS); if(k[y][x]==='G') k[y][x]='d'; }
  fill(13,22,17,24,'O');                            // the mill pond
  groundKind=k;
  ground=k.map((row,y)=>row.map((c,x)=>{
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
    }
  }));
  // edges: where a road, lane, river or pond meets something else, build the tile
  // from quarters of a 3x3 transition set (see edgeTile)
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const set=EDGE_SET[k[y][x]]; if(!set) continue;
    const t=edgeTile(set,x,y,r); if(t) ground[y][x]=t;
  }
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
    if(c[0]!=='1'&&c[1]!=='1'&&r()<.5) return 'tr_'+E.set+'_alt'+c;   // a second drawing of that corner
    return 'tr_'+E.set+'_'+c;
  }
  return {set:E.set, cells};
}
const quarterCache=new Map();
function quarterTile(g){
  const key=g.set+g.cells.join('');
  let c=quarterCache.get(key);
  if(!c){
    c=document.createElement('canvas'); c.width=c.height=120;
    const m=c.getContext('2d');
    g.cells.forEach((cc,i)=>{
      const q=rects['tr_'+g.set+'_'+cc], dx=i%2, dy=i>>1, hw=q[2]/2, hh=q[3]/2;
      m.drawImage(atlases[q[4]],q[0]+dx*hw,q[1]+dy*hh,hw,hh,dx*60,dy*60,60,60);
    });
    quarterCache.set(key,c);
  }
  return c;
}

function sizeOf(kind,sc=PS){ const q=rects[kind]; return {w:q[2]*sc, h:q[3]*sc}; }
function footBoxes(o){
  const s=sizeOf(o.kind), out=[];
  for(const f of footOf(o.kind)){
    const fw=f.w*s.w, fh=f.h<1?f.h*s.h:f.h, cx=o.x-s.w/2+(f.ox??.5)*s.w;
    out.push({x:cx-fw/2, y:o.y-fh, w:fw, h:fh});
  }
  return out;
}
const overlap=(a,b,m=0)=>a.x<b.x+b.w+m && b.x<a.x+a.w+m && a.y<b.y+b.h+m && b.y<a.y+a.h+m;
function tileAt(px,py){ const x=Math.floor(px/T), y=Math.floor(py/T); return (groundKind[y]||[])[x]; }
const inside=(px,py,b)=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;
// water you can't stand in: the river, less whatever a bridge spans
function wet(px,py){
  const t=tileAt(px,py);
  if(t==='O'){                     // the pond: its shore tiles' grassy rim is dry land
    const tx=Math.floor(px/T), ty=Math.floor(py/T), fx=px-tx*T, fy=py-ty*T, R=T*0.36;
    const dry=(xx,yy)=>(groundKind[yy]||[])[xx]!=='O';
    return !((dry(tx-1,ty)&&fx<R)||(dry(tx+1,ty)&&fx>T-R)||(dry(tx,ty-1)&&fy<R)||(dry(tx,ty+1)&&fy>T-R));
  }
  if(t!=='W') return false;
  for(const b of bridges) for(const w of b.fb) if(inside(px,py,w)) return false;
  return true;
}

// ── bridges: drawn from above, laid across the river as walkable decals ──
// walk = spans you can stand on, as fractions of the width (a broken one has a gap);
// band = the deck between the parapets, as fractions of the height from the top.
const BRIDGE = {
  bridgeTopStone:      {walk:[[0,1]],             band:[.3,.8]},
  bridgeTopWood:       {walk:[[0,1]],             band:[.22,.78]},
  bridgeTopStoneBroken:{walk:[[0,.4],[.62,1]],    band:[.3,.8]},
  bridgeTopWoodBroken: {walk:[[0,.37],[.63,1]],   band:[.22,.78]},
};
function placeBridge(kind,cy,lore){
  const span=(RIVER.c1-RIVER.c0+1)*T+112, sc=span/rects[kind][2], s=sizeOf(kind,sc), B=BRIDGE[kind];
  const cx=(RIVER.c0+RIVER.c1+1)/2*T, top=cy-s.h*(B.band[0]+B.band[1])/2;
  const fb=B.walk.map(([a,b])=>({x:cx-s.w/2+a*s.w, y:top+s.h*B.band[0], w:(b-a)*s.w, h:s.h*(B.band[1]-B.band[0])}));
  const o={kind,x:cx,y:top+s.h,scale:sc,decal:true,fb,lore};
  bridges.push(o); objs.push(o); return o;
}

function place(kind,x,y,opts){
  if(!rects[kind]) return null;
  const o=Object.assign({kind,x,y},opts||{});
  objs.push(o); for(const b of footBoxes(o)) boxes.push(b);
  return o;
}
// place only if it clears everything already down and stays off the roads
function tryPlace(kind,x,y,margin=6){
  const o={kind,x,y}, fb=footBoxes(o);
  for(const b of fb){
    if(b.x<4||b.y<4||b.x+b.w>WORLD_W-4||b.y+b.h>WORLD_H-4) return false;
    for(const c of boxes) if(overlap(b,c,margin)) return false;
    for(const [px,py] of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]]){ const t=tileAt(px,py); if(t&&t!=='G'&&t!=='d') return false; }
  }
  // the image too must not swallow a road you walk on
  if(kind.startsWith('house')){ const s=sizeOf(kind); for(const c of boxes) if(overlap({x:x-s.w/2,y:y-s.h,w:s.w,h:s.h},c,-4)) return false; }
  place(kind,x,y); return true;
}

function buildObjects(){
  objs=[]; boxes=[]; bridges=[];
  const r=rng(9031);
  const STREET_N=16*T-6, STREET_S=17*T+T+4, LANE_N=7*T-6, LANE_S=26*T-6;
  // houses: the west stands, the east is falling down
  const west=[180,360,700,880], east=[2136,2316,2696,2876];
  place('house1',west[0],STREET_N,{lore:'house1'}); place('house2',west[1],STREET_N);
  place('tavern',790,STREET_N,{lore:'tavern'});      // the Drowned Crow, where two houses stood
  ['house3','house4','house5','house6'].forEach((k,j)=>place(k,east[j],STREET_N));
  ['house4','house1','house2'].forEach((k,j)=>place(k,west[j],LANE_N));
  ['house6','house5','house3'].forEach((k,j)=>place(k,[2136,2696,2876][j],LANE_N));
  ['house2','house1','house3','house2'].forEach((k,j)=>place(k,west[j],LANE_S));
  ['house5','house6','house6'].forEach((k,j)=>place(k,[2136,2316,2876][j],LANE_S));
  place('ruinWall1',2656,LANE_S); place('rubble3',2726,LANE_S+8);
  // houses south of the main street face it, so we see their backs; the roofs overlap the
  // street's far edge, as they would from up here
  const BACK_Y=STREET_S+80;
  [['backTerra1',180],['backSlate',360],['backTerra2',700],['backTerra1',880],
   ['backPurple',2136],['backPurpleRuin',2316],['backSlateRuin',2696]].forEach(([k,x])=>place(k,x,BACK_Y));
  // gable ends onto the lanes
  place('sideTerra',8*T-62,12*T); place('sideSlate',9*T+70,22*T);
  place('sidePurple',39*T-70,21*T); place('sidePurpleRuin',40*T+80,11*T);
  // the big three: the tavern (above), the chapel by the garden, the college tower east of the river
  place('chapel',1150,31*T-10,{lore:'chapel'});
  place('tower',2860,13*T-12,{lore:'tower'});

  // plaza: the Watcher, the banner, lanterns at its corners
  const PX=(17*T+27*T)/2, PY=(13*T+21*T)/2;
  place('statue',PX,PY-8);
  place('banner',17*T+40,13*T+70); place('banner',27*T-24,13*T+70);
  for(const [x,y] of [[17*T+18,21*T-6],[27*T-46,21*T-6]]) place('lamppost',x,y);
  place('barrel',17*T+90,21*T-10); place('crate2',17*T+130,21*T-8); place('crate1',27*T-110,13*T+40);
  // lanterns down the main street
  for(const x of [270,990,2226,2786]) place('lamppost',x,STREET_N+2);

  // the broken town wall and its gate, north
  const WALL_Y=4*T+30;
  place('arch',22*T,WALL_Y);
  const wallBits=['wallLow1','ruinWall2','rubble2','wallLow2','rubble4','wallLow1','rubble1','ruinWall1','wallLow2','rubble2'];
  let x=60;
  while(x<WORLD_W-60){
    if(x>22*T-120 && x<22*T+120){ x=22*T+120; continue; }        // the gate
    if(x>RIVER.c0*T-110 && x<(RIVER.c1+1)*T+10){ x=(RIVER.c1+1)*T+14; continue; }   // the river
    const lane=[8*T,39*T].find(l=>x>l-110 && x<l+T+10);             // leave the lanes open
    if(lane!==undefined){ x=lane+T+14; continue; }
    const k=wallBits[Math.floor(r()*wallBits.length)], s=sizeOf(k);
    if(r()<.18){ x+=s.w*0.8; continue; }          // gaps in the wall
    place(k,x+s.w/2,WALL_Y+Math.round(r()*6)); x+=s.w-6;
  }

  // the west: tidy yards
  for(const [k,x,y] of [['crate1',100,STREET_N-8],['barrel',460,STREET_N-6],['crate2',500,STREET_N-4],['flowerbush',780,LANE_N+60],
    ['fence',560,LANE_N+170],['fence',614,LANE_N+170],['fence',668,LANE_N+170],['barrel',1000,STREET_N-10],['lowwall',1010,LANE_S-10],
    ['flowerbush',260,LANE_S+90],['flowerbush',980,LANE_S+120],['crate1',1040,LANE_N-4]]) place(k,x,y);
  // the east: what's left
  for(const [k,x,y] of [['rubble5',2016,STREET_N-4],['wheel',2506,STREET_N-6],['logs',2446,STREET_N+2],['brokenFence',3016,STREET_N-10],
    ['rocks2',2556,LANE_N+90],['rubble6',2986,LANE_N-4],['logs',2216,LANE_S+100],['rocks1',2816,STREET_S+220],['brokenFence',2556,LANE_S-6],
    ['rubble1',3026,LANE_S+140],['deadtree',2436,LANE_N+150],['pillar2',2956,STREET_S+40],['pillar3',3036,STREET_S+44],['pillar1',2876,STREET_S+300]]) place(k,x,y);

  // the south: a garden of remembrance — shrine, the fallen hero, a well of stones
  place('shrine',600,30*T+20); place('brokenStatue',RIVER.c0*T-70,27*T+70);
  for(const [k,x,y] of [['stone',560,30*T+40],['flowerbush',690,30*T+30],['bush',1640,29*T+40],['rocks1',1640,28*T+40],['post',1310,28*T+20]]) place(k,x,y);
  place('rocks2',2606,30*T+30,{lore:'well'});

  // the river: five crossings, two of them down
  const LANE_C=k=>k*T+T/2;
  placeBridge('bridgeTopWoodBroken',LANE_C(2),'bridgeWoodBroken');
  placeBridge('bridgeTopWood',LANE_C(7),'bridgeWood');
  placeBridge('bridgeTopStone',17*T,'bridgeBanner');
  placeBridge('bridgeTopStoneBroken',LANE_C(26),'bridgeBannerBroken');
  placeBridge('bridgeTopStone',LANE_C(30),'bridgeStone');
  const RX0=RIVER.c0*T, RX1=(RIVER.c1+1)*T;
  for(const [k,x,y] of [['bannerP',RX0-26,16*T-4],['bannerTorn',RX1+28,16*T-4],['lamp2',RX0-30,18*T+20],['lamp4',RX1+12,18*T+20],
    ['lamp3',RX0-24,8*T+24],['lamp3',RX0-24,24*T],['lamp2',RX1+14,31*T+30],['postTall',RX0-20,26*T+6],['postTall',RX1+20,26*T+6]]) place(k,x,y);
  place('postRing',RX0-14,12*T,{lore:'river'});
  place('stone',18*T+30,22*T+20,{lore:'pond'});      // a sitting stone by the mill pond     // a mooring ring on the west bank
  // the docks: a crane over the water, cargo nobody came back for
  const DX=RX1, DY0=9*T, DY1=13*T;
  place('crane',DX+70,DY0+90,{lore:'crane'});
  for(const [k,x,y,o] of [['sacks',DX+180,DY0+70,{lore:'sacks'}],['crate3',DX+250,DY0+62],['crate5',DX+300,DY0+66],['barrel2',DX+350,DY0+60],
    ['crateStand',DX+190,DY1-30],['barrel3',DX+250,DY1-26],['planksPile',DX+320,DY1-30],['cart',DX+120,DY1-14],['chainFence1',DX+90,DY1+18],
    ['crate4',DX+380,DY1-40],['lamp4',DX+12,DY1-6]]) place(k,x,y,o);
  // the west: more of the market
  place('wagon',1010,21*T+60,{lore:'wagon'});
  for(const [k,x,y] of [['sacks',560,STREET_N-2],['crate3',620,STREET_N-6],['barrel3',1040,STREET_N-40],['fence2',210,LANE_N+170],['fence3',320,LANE_N+170],
    ['fence4',820,LANE_S+170],['crate6',1060,LANE_S-40],['chainFence2',17*T+60,21*T+40],['chainFence2',27*T-60,21*T+40],['postRing',1150,LANE_N-6],
    ['stoneArch',8*T+T/2,4*T+30],['woodArch',22*T,27*T+30]]) place(k,x,y);
  // the east: worse
  for(const [k,x,y] of [['brokenCart',2620,STREET_N+40],['barrelsBroken',2400,LANE_N-6],['crateBroken',2700,STREET_N-8],['planks2',2960,LANE_N+120],
    ['blocks1',2440,STREET_S+230],['blocks2',3000,STREET_S+330],['rubble7',2620,LANE_S+120],['rubble9',2780,LANE_S+40],['rubble10',2900,LANE_N+80],
    ['wheel3',2720,STREET_N+56],['craneBroken1',2420,13*T+10],['craneBroken2',2960,13*T+20],['gallowsHook',2200,23*T],['brokenArch',39*T+T/2,4*T+30],
    ['gravel',2500,22*T],['barrelBroken',2230,STREET_S+150]]) place(k,x,y);
  place('gallows',2560,22*T+10,{lore:'gallows'});

  // the edges: woods, thinning to dead trees in the east
  const edgeTries=900;
  for(let i=0;i<edgeTries;i++){
    const side=Math.floor(r()*4), d=r()*T*2.4;
    const x=side===0?d:side===1?WORLD_W-d:r()*WORLD_W, y=side===2?T*1.4+d:side===3?WORLD_H-d:r()*WORLD_H;
    tryPlace(x>WORLD_W*0.62&&r()<.7?'deadtree':'tree',x,y,2);
  }
  // scatter in the grass
  const scatter=[['bush',5],['flowerbush',3],['tree',4],['stump',2],['stone',2],['rocks1',1],['deadtree',1]];
  const tot=scatter.reduce((a,s)=>a+s[1],0);
  for(let i=0;i<500;i++){
    let q=r()*tot, k='bush'; for(const [n,w] of scatter){ if((q-=w)<0){ k=n; break; } }
    const x=T+r()*(WORLD_W-2*T), y=T*2+r()*(WORLD_H-3*T);
    if(x>WORLD_W*0.62&&k==='flowerbush') k='rocks1';
    tryPlace(k,x,y,18);
  }
  // paint the houses by district (the Lit House keeps its terracotta)
  const rs=rng(5150);
  for(const o of objs) if(/^house\d$/.test(o.kind) && o.lore!=='house1'){
    const st=pick(rs,HOUSE_STYLES[o.x<RIVER.c0*T?'west':'east']);
    if(st) o.kind+='_'+st;
  }
  objs.forEach((o,i)=>{ o.id=i; if(!o.lore&&LORE[o.kind]&&!['house1','crane','gallows','wagon','sacks'].includes(o.kind)) o.lore=o.kind; });
  // fireflies drift over the grass
  fireflies=[]; for(let i=0;i<70;i++) fireflies.push({x:r()*WORLD_W,y:r()*WORLD_H,a:r()*6.28,s:8+r()*14,p:r()*6.28});
  // start on the plaza, south of the Watcher
  wiz.x=PX; wiz.y=PY+150; wiz.face=1;
}

function buildMinimap(){
  const S=4, c=document.createElement('canvas'); c.width=COLS*S; c.height=ROWS*S;
  const m=c.getContext('2d');
  const col={G:'#3f6a2a',d:'#5d6a33',D:'#7a5a3a',R:'#8a8a94',M:'#6f7d63',P:'#a69a8e',W:'#1d4a70',K:'#8a5a30',O:'#24557a'};
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ m.fillStyle=col[groundKind[y][x]]; m.fillRect(x*S,y*S,S,S); }
  const k=S/T;
  for(const o of objs){
    const s=sizeOf(o.kind,o.scale);
    if(o.decal){ m.fillStyle=o.kind.endsWith('Broken')?'#5a4a3a':'#b7a58a'; for(const b of o.fb) m.fillRect(b.x*k,b.y*k,b.w*k,Math.max(2,b.h*k)); }
    else if(/^(house|back|side|tavern|chapel|tower)/.test(o.kind)){ m.fillStyle={slate:'#7d8ea6',moss:'#5f8a4a',dusk:'#7a55a0',char:'#5e5650'}[o.kind.split('_')[1]]||(/Slate/.test(o.kind)?'#7d8ea6':/Purple|tower/.test(o.kind)?'#7a55a0':o.kind==='chapel'?'#9a948a':'#b4582e'); m.fillRect((o.x-s.w/2)*k,(o.y-s.h*.6)*k,s.w*k,s.h*.6*k); }
    else if(o.kind==='tree'||o.kind==='bush'){ m.fillStyle='#1f3d16'; m.fillRect(o.x*k-1,o.y*k-2,2,2); }
    else if(o.kind==='deadtree'){ m.fillStyle='#4a3424'; m.fillRect(o.x*k-1,o.y*k-2,2,2); }
    else if(o.kind.match(/^(rubble|ruinWall|wallLow|lowwall|arch)/)){ m.fillStyle='#c9c3b6'; m.fillRect((o.x-s.w/2)*k,o.y*k-2,s.w*k,2); }
    else if(o.lore){ m.fillStyle='#ffd866'; m.fillRect(o.x*k-1,o.y*k-2,3,3); }
  }
  mini=c;
}

// ═══ UI ════════════════════════════════════════════════════════════
function buildDom(){
  const d=document.createElement('div');
  d.id='explore-screen';
  d.innerHTML=`
    <canvas id="ex-canvas"></canvas>
    <div class="ex-top">
      <button class="ex-btn" id="ex-back" type="button">← Back</button>
      <div class="ex-title">${TOWN}</div>
      <div class="ex-wiz">
        <button class="ex-btn ex-arrow" id="ex-prev" type="button" aria-label="Previous wizard">◀</button>
        <img id="ex-face" alt=""><span id="ex-name"></span>
        <button class="ex-btn ex-arrow" id="ex-next" type="button" aria-label="Next wizard">▶</button>
      </div>
      <button class="ex-btn" id="ex-night" type="button" title="Day / night">☾</button>
    </div>
    <canvas id="ex-mini" aria-hidden="true"></canvas>
    <div class="ex-hint" id="ex-hint">WASD / arrows to walk · tap or click to walk there · E to inspect</div>
    <button class="ex-btn ex-act" id="ex-act" type="button" hidden>✋ Inspect</button>
    <div class="ex-say" id="ex-say" hidden><div class="ex-say-name"></div><div class="ex-say-text"></div></div>
    <div class="ex-loading" id="ex-loading">Loading ${TOWN}…</div>`;
  document.getElementById('app').appendChild(d);
  el={root:d, cv:d.querySelector('#ex-canvas'), mini:d.querySelector('#ex-mini'), say:d.querySelector('#ex-say'),
      act:d.querySelector('#ex-act'), hint:d.querySelector('#ex-hint'), face:d.querySelector('#ex-face'), name:d.querySelector('#ex-name'),
      night:d.querySelector('#ex-night'), loading:d.querySelector('#ex-loading')};
  ctx=el.cv.getContext('2d');
  dark=document.createElement('canvas'); dctx=dark.getContext('2d');
  d.querySelector('#ex-back').onclick=close;
  d.querySelector('#ex-prev').onclick=()=>setWizard(wizIdx-1);
  d.querySelector('#ex-next').onclick=()=>setWizard(wizIdx+1);
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
  const b=el.cv.getBoundingClientRect();
  target={x:cam.x+(e.clientX-b.left)/zoom, y:cam.y+(e.clientY-b.top)/zoom};
  stuckT=0;
}
function onKey(e){
  if(!running) return;
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ keys.add(k); target=null; hideSay(); e.preventDefault(); }
  else if(k==='e'||k===' '||k==='enter'){ if(!el.say.hidden) hideSay(); else inspect(); e.preventDefault(); }
  else if(k==='escape'){ if(!el.say.hidden) hideSay(); else close(); }
}
function resize(){
  if(!running) return;
  dpr=Math.min(window.devicePixelRatio||1,2);
  vw=window.innerWidth; vh=window.innerHeight;
  for(const c of [el.cv,dark]){ c.width=Math.round(vw*dpr); c.height=Math.round(vh*dpr); }
  el.cv.style.width=vw+'px'; el.cv.style.height=vh+'px';
  zoom=Math.max(0.62,Math.min(1.35,Math.min(vw/620,vh/620)));
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

function showSay(o){
  const [name,text]=LORE[o.lore];
  el.say.querySelector('.ex-say-name').textContent=name;
  el.say.querySelector('.ex-say-text').textContent=text;
  el.say.hidden=false; sayingObj=o; el.hint.classList.add('fade');
}
function hideSay(){ if(el.say) el.say.hidden=true; sayingObj=null; }
function inspect(){ if(near) showSay(near); }

// ═══ LOOP ══════════════════════════════════════════════════════════
function blocked(x,y){
  const b={x:x-12,y:y-9,w:24,h:9};
  if(b.x<T*0.3||b.y<T*0.5||b.x+b.w>WORLD_W-T*0.3||b.y+b.h>WORLD_H-4) return true;
  for(const c of boxes) if(overlap(b,c)) return true;
  if(wet(b.x,b.y)||wet(b.x+b.w,b.y)||wet(b.x,b.y+b.h)||wet(b.x+b.w,b.y+b.h)) return true;
  return false;
}
function update(dt){
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
  // something to inspect nearby?
  near=null; let best=INSPECT_R;
  for(const o of objs){
    if(!o.lore) continue;
    for(const b of o.fb||(o.fb=footBoxes(o))){
      const d=Math.hypot(Math.max(b.x-wiz.x,0,wiz.x-b.x-b.w), Math.max(b.y-wiz.y,0,wiz.y-9-b.y-b.h));
      if(d<best){ best=d; near=o; }
    }
  }
  el.act.hidden=!near||!el.say.hidden;
  if(near) el.act.textContent='✋ '+LORE[near.lore][0];
  // camera
  const cw=vw/zoom, ch=vh/zoom;
  cam.x=Math.max(0,Math.min(WORLD_W-cw,wiz.x-cw/2));
  cam.y=Math.max(0,Math.min(WORLD_H-ch,wiz.y-WIZ_H/2-ch/2));
  if(cw>WORLD_W) cam.x=(WORLD_W-cw)/2; if(ch>WORLD_H) cam.y=(WORLD_H-ch)/2;
}

function drawPiece(kind,x,y,alpha,sc=PS){
  const q=rects[kind], w=q[2]*sc, h=q[3]*sc;
  if(alpha!==undefined) ctx.globalAlpha=alpha;
  ctx.drawImage(atlases[q[4]],q[0],q[1],q[2],q[3],x-w/2,y-h,w,h);
  ctx.globalAlpha=1;
}
function drawWizard(t){
  // shadow
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
// the Hollow: the quay tiles draw the water and its stone banks; this adds the
// current, light streaks drifting south inside the quays
const QUAY = 0.4;               // the quay stone's share of an edge tile
function drawRiver(t,y0,y1){
  const X0=RIVER.c0*T+QUAY*T, X1=(RIVER.c1+1)*T-QUAY*T, W=X1-X0;
  const flow=t*0.025;
  for(let lane=0;lane<9;lane++){
    const lx=X0+6+lane*(W-12)/8, sp=0.7+((lane*37)%10)/14;
    for(let k=-1;k<(y1-y0+2)*T/90;k++){
      const y=Math.floor(y0*T/90)*90+k*90+((lane*53+flow*sp)%90);
      if(y<y0*T-20||y>(y1+1)*T) continue;
      const len=8+((lane*13+k*7)%3)*5, a=0.14+((lane+k)%3)*0.07;
      ctx.fillStyle=`rgba(120,190,225,${a})`; ctx.fillRect(Math.round(lx),Math.round(y),2,len);
      if((lane+k)%5===0){ ctx.fillStyle='rgba(190,235,240,0.5)'; ctx.fillRect(Math.round(lx)+3,Math.round(y)+len/2,2,3); }
    }
  }
}
function draw(t){
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
  drawRiver(t,y0,y1);
  for(const b of bridges){
    const s=sizeOf(b.kind,b.scale);
    if(b.y<cam.y||b.y-s.h>cam.y+ch) continue;
    drawPiece(b.kind,b.x,b.y,undefined,b.scale);
  }
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
    const s=sizeOf(near.kind), bob=Math.sin(t/250)*3;
    ctx.fillStyle='#ffd866'; ctx.strokeStyle='#3a2a08'; ctx.lineWidth=2;
    ctx.font='bold 18px Cinzel, serif'; ctx.textAlign='center';
    const my=near.y-Math.min(s.h,120)-8+bob;
    ctx.strokeText('?',near.x,my); ctx.fillText('?',near.x,my);
  }
  if(night) drawNight(t,cw,ch);
  drawMini();
}
function lightsInView(cw,ch){
  const out=[];
  for(const o of objs){
    const L=LIGHTS[o.kind]||LIGHTS[baseKind(o.kind)]; if(!L) continue;
    const s=sizeOf(o.kind);   // (no bridge carries a light)
    for(const [lx,ly,type] of L){
      const x=o.x-s.w/2+lx*PS, y=o.y-s.h+ly*PS;
      if(x<cam.x-200||x>cam.x+cw+200||y<cam.y-200||y>cam.y+ch+200) continue;
      out.push({x,y,r:type==='lamp'?150:105,lamp:type==='lamp',seed:o.id});
    }
  }
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
    g.addColorStop(0,'rgba(0,0,0,0.95)'); g.addColorStop(0.5,'rgba(0,0,0,0.5)'); g.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=g; dctx.fillRect(L.x-r,L.y-r,r*2,r*2);
  }
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(dark,0,0); ctx.restore();
  // warm glow on top
  ctx.globalCompositeOperation='lighter';
  for(const L of lights){
    if(L.wiz) continue;
    const r=L.r*0.45*(1+Math.sin(t/110+L.seed)*0.08);
    const g=ctx.createRadialGradient(L.x,L.y,0,L.x,L.y,r);
    g.addColorStop(0,'rgba(255,190,90,0.38)'); g.addColorStop(1,'rgba(255,140,40,0)');
    ctx.fillStyle=g; ctx.fillRect(L.x-r,L.y-r,r*2,r*2);
  }
  // fireflies
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
  update(dt); draw(now);
  requestAnimationFrame(frame);
}

// ═══ OPEN / CLOSE ══════════════════════════════════════════════════
function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
async function load(){
  if(built) return;
  const names=['ruins','ruins2','ruins3','ruins4','ruins5'];
  const [cj,...sheets]=await Promise.all([
    fetch('characters.json').then(r=>r.json()),
    ...names.map(n=>Promise.all([loadImage('sprites/ruins/'+n+'.png'), fetch('sprites/ruins/'+n+'.json').then(r=>r.json())])),
  ]);
  // one name space across every sheet: [x, y, w, h, atlas index]
  atlases=sheets.map(s=>s[0]); rects={};
  sheets.forEach(([,rj],i)=>{ for(const k in rj) rects[k]=[...rj[k],i]; });
  chars=cj;
  wizKeys=Object.keys(chars).filter(k=>chars[k].sprite);
  buildGround(); buildObjects(); buildMinimap();
  built=true;
}
async function open(){
  if(!el.root) buildDom();
  el.root.classList.add('active'); el.loading.hidden=false;
  running=true; resize();
  try{ await load(); }
  catch(err){ el.loading.textContent='Couldn\'t load the map.'; console.error(err); return; }
  el.loading.hidden=true;
  let saved=null; try{ saved=localStorage.getItem('wd-explore-wiz'); }catch(e){}
  setWizard(Math.max(0,wizKeys.indexOf(saved||'eldrin')));
  last=performance.now(); requestAnimationFrame(frame);
  setTimeout(()=>{ if(el.hint) el.hint.classList.add('fade'); },6000);
}
function close(){
  running=false; keys.clear(); target=null; hideSay();
  el.root.classList.remove('active');
}

window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-explore');
  if(b) b.addEventListener('click',open);
});
window.Explore={open, close};
})();
