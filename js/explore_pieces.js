// ═══════════════════════════════════════════════════════════════════
//  EXPLORE PIECES — what every map piece is, shared by the game
//  (js/explore.js) and the map generators (tools/mapgen/, run by
//  tools/build_maps.js in Node). Footprints, light spots, bridge decks,
//  the tile size and prop scale, and a seeded random.
//  Piece sizes come from the atlases' .json (sprites/ruins/ruins*.json).
// ═══════════════════════════════════════════════════════════════════
(function(root,factory){
  const m=factory();
  if(typeof module==='object'&&module.exports) module.exports=m; else root.ExplorePieces=m;
})(this,function(){
'use strict';

const T = 64;                 // ground tile size, world px
const PS = 0.62;              // prop scale: atlas px → world px (a ground tile is ~100 atlas px)

// ── footprints: the part of each piece you can't walk through ──
// ox = centre across the width (0–1), w = width fraction, h = depth in world px
// (h < 1 is a fraction of the drawn height). Looked up by exact name, else the
// longest matching prefix (footOf).
const FOOT = {
  house:   [{w:.9, h:.5}],
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
  // each sector's own pieces (sheets 6–9)
  iceSpire:[{w:.6,h:18}], frostStall:[{w:.9,h:24}], frozenFountain:[{w:.8,h:.3}], iceCart:[{w:.85,h:26}],
  iceWall:[{w:.95,h:20}], snowdrift:[{w:.85,h:24}], sunkHouse:[{w:.9,h:.45}], boat:[{w:.8,h:22}], nets:[{w:.85,h:22}],
  figurehead:[{w:.6,h:18}], moorings:[{ox:.12,w:.12,h:10},{ox:.5,w:.12,h:10},{ox:.88,w:.12,h:10}],
  floatRoom:[{w:.4,h:10}], floatStairs:[{w:.4,h:8}], floatRoof:[{w:.4,h:8}],      // only their shadows touch the ground
  townhouse:[{w:.9,h:.4}], gazebo:[{w:.85,h:.25}], weathervane:[{w:.3,h:10}], urn:[{w:.6,h:14}], bench:[{w:.9,h:14}],
  rockSpire:[{w:.7,h:.25}], quarryCrane:[{ox:.2,w:.3,h:16},{ox:.75,w:.25,h:14}], stoneYard:[{w:.9,h:26}],
  tiltedHouse:[{w:.85,h:.4}], mineCart:[{w:.9,h:18}],
  bellTower:[{w:.8,h:.12}], fallenBell:[{w:.85,h:26}], lightningRod:[{w:.3,h:14}], watchTower:[{w:.8,h:.12}],
  bellFrames:[{w:.85,h:22}], hall:[{w:.9,h:.35}], orrery:[{w:.6,h:20}], bookshelves:[{w:.85,h:22}], runeCircle:[{w:.7,h:20}],
  scholarStatue:[{w:.7,h:20}], portal:[{ox:.15,w:.25,h:20},{ox:.85,w:.25,h:20}],
  temple:[{w:.9,h:.3}], catacomb:[{ox:.15,w:.25,h:22},{ox:.85,w:.25,h:22}], graves:[{w:.85,h:24}], mausoleum:[{w:.85,h:.3}],
  candles:[{w:.85,h:20}], hoodedShrine:[{w:.85,h:22}], forge:[{w:.9,h:.35}], anvil:[{w:.8,h:20}], slag:[{w:.8,h:20}],
  bellows:[{w:.85,h:22}], swordRack:[{w:.9,h:18}],
};
function footOf(kind){
  if(FOOT[kind]) return FOOT[kind];
  let best=null; for(const k in FOOT) if(kind.startsWith(k) && (!best||k.length>best.length)) best=k;
  return best?FOOT[best]:[{w:.8,h:16}];
}

// light sources inside a piece, in atlas px of its trimmed crop ('lamp' = a lantern, bigger)
const LIGHTS = {
  house1:[[165,208]], house2:[[70,205],[158,205]], house3:[[170,205]],
  house4:[[170,208]], house5:[[180,190]], house6:[[77,185]],
  tavern:[[114,218],[288,218],[92,332],[153,332],[280,332],[337,330,'lamp']],
  chapel:[[196,175],[128,258],[273,258],[124,364],[274,362]],
  tower:[[106,234],[198,330],[232,326],[106,406]],
  backTerra1:[[142,176]], backSlate:[[116,173]], backPurple:[[76,178],[155,178]], sideSlate:[[92,138]],
  // sheets 6–9: values of 1 or less are fractions of the piece's width / height
  sunkHouse:[[.3,.82],[.62,.82]], townhouse:[[.36,.4],[.62,.4],[.25,.75],[.78,.75]], floatRoom:[[.4,.4,'lamp']],
  forge:[[.5,.75,'lamp']], candles:[[.5,.3,'lamp']], portal:[[.5,.6,'lamp']], runeCircle:[[.5,.6,'lamp']],
  lavaCrack:[[.5,.5,'lamp']], slag:[[.5,.5]], swordRack:[[.5,.6]], hall:[[.5,.55],[.3,.55],[.7,.55]], temple:[[.5,.35]],
  hoodedShrine:[[.5,.75]], bellTower:[[.5,.2],[.5,.85]], watchTower:[[.5,.9]], tiltedHouse:[[.45,.55],[.7,.5]],
  catacomb:[[.5,.6]], lightningRod:[[.5,.08,'lamp']], glassPatch:[[.5,.5]], frozenFountain:[[.5,.4]],
  lamppost:[[79,65,'lamp']], lamp2:[[23,45,'lamp']], lamp3:[[20,41,'lamp']], lamp4:[[21,41,'lamp']],
};
// recoloured pieces ('house1_slate') share their base piece's lights and footprint
const baseKind=k=>k.split('_')[0];
function lightsOf(kind){ return LIGHTS[kind]||LIGHTS[baseKind(kind)]||null; }

// ── bridges, drawn from above and laid across water as walkable decals ──
// walk = spans you can stand on, as fractions of the width (a broken one has a gap);
// band = the deck between the parapets, as fractions of the height from the top.
const BRIDGE = {
  bridgeTopStone:      {walk:[[0,1]],             band:[.3,.8]},
  bridgeTopWood:       {walk:[[0,1]],             band:[.22,.78]},
  bridgeTopStoneBroken:{walk:[[0,.4],[.62,1]],    band:[.3,.8]},
  bridgeTopWoodBroken: {walk:[[0,.37],[.63,1]],   band:[.22,.78]},
};

function sizeOf(rects,kind,sc){ const q=rects[kind]; sc=sc||PS; return {w:q[2]*sc, h:q[3]*sc}; }
// a piece's blocking boxes in world px; o = {kind, x (centre), y (base)}
function footBoxes(rects,o){
  const s=sizeOf(rects,o.kind), out=[];
  for(const f of footOf(o.kind)){
    const fw=f.w*s.w, fh=f.h<1?f.h*s.h:f.h, cx=o.x-s.w/2+(f.ox??.5)*s.w;
    out.push({x:cx-fw/2, y:o.y-fh, w:fw, h:fh});
  }
  return out;
}
// a bridge's walkable deck boxes; o = {kind, x, y, scale}
function bridgeDeck(rects,o){
  const s=sizeOf(rects,o.kind,o.scale), B=BRIDGE[o.kind], top=o.y-s.h;
  return B.walk.map(([a,b])=>({x:o.x-s.w/2+a*s.w, y:top+s.h*B.band[0], w:(b-a)*s.w, h:s.h*(B.band[1]-B.band[0])}));
}
const overlap=(a,b,m=0)=>a.x<b.x+b.w+m && b.x<a.x+a.w+m && a.y<b.y+b.h+m && b.y<a.y+a.h+m;

// ── seeded random ──
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const pick=(r,a)=>a[Math.floor(r()*a.length)];

return {T, PS, FOOT, footOf, LIGHTS, lightsOf, baseKind, BRIDGE, sizeOf, footBoxes, bridgeDeck, overlap, rng, pick};
});
