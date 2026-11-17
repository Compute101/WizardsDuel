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
  // inner districts (sheets 14–23): town props for all of them, then one sheet a district
  sign:[{ox:.12,w:.14,h:10}], cratesProduce:[{w:.9,h:24}], washLine:[{ox:.05,w:.07,h:10},{ox:.95,w:.07,h:10}], well:[{w:.75,h:.3}],
  noticeBoard:[{w:.85,h:14}], lanternPost:[{ox:.16,w:.2,h:10}], lanternSmashed:[{w:.5,h:6}], cat:[{w:.5,h:6}], crow:[{w:.4,h:6}],
  crowFlying:[{w:.1,h:2}], handcart:[{w:.85,h:22}], barrowStone:[{w:.85,h:20}], tableBooks:[{w:.85,h:18}], basketApples:[{w:.7,h:14}],
  crystal:[{w:.6,h:16}], crystalDisplay:[{w:.8,h:16}], floatIsle:[{w:.3,h:6}], floatHouse:[{w:.3,h:6}], floatStairway:[{w:.2,h:6}],
  cemeteryGate:[{w:.95,h:20}], cemeteryFence:[{w:.95,h:14}], cemeteryWicket:[{w:.9,h:14}], tomb:[{w:.85,h:.3}],
  grave:[{w:.75,h:14}], brazier:[{w:.5,h:12}], gloomLamp:[{w:.35,h:10}], gloomTree:[{w:.25,h:16}], gloomStump:[{w:.5,h:16}],
  crowPost:[{w:.5,h:16}], crowArch:[{ox:.2,w:.3,h:16},{ox:.85,w:.25,h:16}], crowRubble:[{w:.85,h:18}], cryptGate:[{w:.9,h:.3}],
  stall:[{w:.9,h:24}], frostLamp:[{w:.3,h:10}], frostLamp3:[{ox:.3,w:.3,h:10}], iceFountain:[{w:.85,h:.3}], iceCrystal:[{w:.7,h:16}],
  sled:[{w:.85,h:14}], iceBarrel:[{w:.8,h:18}], furTent:[{w:.9,h:.3}],
  boulder:[{w:.85,h:.3}], mineHead:[{w:.9,h:.3}], masonBench:[{w:.9,h:20}], grindstone:[{w:.9,h:20}], stonePallet:[{w:.9,h:20}],
  scaffold:[{w:.9,h:.25}], giantHead:[{w:.85,h:.35}],
  rowboat:[{w:.85,h:22}], pile:[{w:.5,h:10}], pilesRope:[{ox:.15,w:.25,h:10},{ox:.85,w:.25,h:10}], netFrame:[{ox:.1,w:.12,h:12},{ox:.9,w:.12,h:12}],
  seaGod:[{w:.7,h:24}], seaMaiden:[{w:.7,h:24}], lobsterPot:[{w:.85,h:16}], drownedShrine:[{w:.8,h:.35}], wreckMarket:[{w:.9,h:.35}],
  flyingBooks:[{w:.3,h:6}], armillary:[{w:.7,h:.25}], lectureBenches:[{w:.9,h:.4}], portalRuin:[{ox:.2,w:.25,h:22},{ox:.82,w:.25,h:22}],
  scholarHeadless:[{w:.6,h:22}], scrollRack:[{w:.9,h:20}], scrollBin:[{w:.9,h:18}], arcCrystal:[{w:.7,h:16}],
  windmillSails:[{w:.4,h:14}], sail:[{w:.6,h:10}], ropeBridge:[{ox:.08,w:.14,h:18},{ox:.92,w:.14,h:18}], kite:[{w:.3,h:12}],
  vane:[{w:.4,h:12}], skyRock:[{w:.4,h:8}], fallenDome:[{w:.85,h:.3}], awning:[{ox:.08,w:.08,h:10},{ox:.92,w:.08,h:10}],
  bannerFrame:[{ox:.1,w:.12,h:10},{ox:.9,w:.12,h:10}],
  rod:[{w:.4,h:12}], spireTower:[{w:.8,h:.15}], fallenSpire:[{w:.85,h:.3}], coil:[{w:.6,h:16}], stormLamp:[{w:.3,h:10}],
  stormLamp3:[{ox:.35,w:.3,h:10}], rainBarrel:[{w:.8,h:20}], cartWrecked:[{w:.85,h:24}],
  slagHeap:[{w:.85,h:.3}], foundry:[{w:.9,h:.35}], chainHoist:[{ox:.08,w:.12,h:12},{ox:.92,w:.12,h:12}], oreCart:[{w:.85,h:20}],
  crucibleHoist:[{ox:.1,w:.12,h:12},{ox:.9,w:.12,h:12}], lavaWell:[{w:.75,h:.3}], lavaSpring:[{w:.85,h:.3}], bannerHung:[{w:.2,h:4}],
  // interiors (sheets 10–13; drawn at ExploreRooms.RS)
  bed:[{w:.85,h:.4}], diningTable:[{w:.9,h:.3}], roundTable:[{w:.8,h:.3}], counter:[{w:.95,h:.35}], safeTable:[{w:.9,h:.3}],
  hearthPot:[{w:.9,h:.25}], workbench:[{w:.9,h:.25}], pantry:[{w:.9,h:.3}], bookcase:[{w:.9,h:.15}], wardrobe:[{w:.9,h:.15}],
  cupboard:[{w:.9,h:.15}], altar:[{w:.9,h:.2}], pew:[{w:.9,h:.35}], brokenBed:[{w:.85,h:.3}], brokenTable:[{w:.8,h:.3}],
  wallRubble:[{w:.5,h:.2}], chest:[{w:.85,h:.4}], q_:[{w:.6,h:.3}],
  // small things on the floor (ExploreRooms.ITEM_SCALE): a sliver to stand by, barely in the way
  letter:[{w:.6,h:6}], scroll:[{w:.6,h:6}], journal:[{w:.6,h:6}], bookOpen:[{w:.6,h:6}], bookClosed:[{w:.6,h:6}],
  key:[{w:.6,h:6}], coins:[{w:.6,h:6}], pouch:[{w:.6,h:6}], potion:[{w:.6,h:6}], crockery:[{w:.7,h:6}],
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
  wallPlasterWin:[[.5,.4]], wallStoneWin:[[.5,.4]], wallHearth:[[.5,.75,'lamp']], hearthPot:[[.5,.6,'lamp']], safeHearth:[[.5,.65,'lamp']],
  readingDesk:[[.8,.12]], diningTable:[[.45,.08]], roundTable:[[.5,.12]], altar:[[.5,.4,'lamp']], cauldron:[[.5,.7]], crystalDisplay:[[.5,.35]],
  safeTable:[[.45,.25]], q_fire:[[.5,.5]], q_water:[[.5,.5]], q_ice:[[.5,.5]], q_lightning:[[.5,.5]], q_earth:[[.5,.5]], q_air:[[.5,.5]], q_arcane:[[.5,.5]], q_dark:[[.5,.5]],
  // inner districts
  lanternPost:[[.72,.55,'lamp']], cartPotions:[[.5,.35]], crystalFire:[[.5,.45]], crystalWater:[[.5,.45]], crystalIce:[[.5,.45]],
  crystalLightning:[[.5,.45]], crystalEarth:[[.5,.45]], crystalAir:[[.5,.45]], crystalArcane:[[.5,.45]], crystalDark:[[.5,.45]],
  floatHouse1:[[.45,.35],[.25,.6]], floatHouse2:[[.5,.4]], floatHouse3:[[.55,.4]],
  cemeteryGate:[[.12,.55],[.88,.55]], brazier:[[.5,.12,'lamp']], gloomLamp1:[[.75,.45,'lamp']], gloomLamp2:[[.22,.45,'lamp']],
  gloomLamp3:[[.12,.4],[.88,.4]], cryptGate:[[.5,.6]], tombGrand:[[.5,.65]],
  frostLamp1:[[.5,.2,'lamp']], frostLamp2:[[.15,.35],[.85,.35]], frostLamp3:[[.8,.45,'lamp']], stallStripe:[[.12,.5]], furTent:[[.5,.65]],
  iceCrystal1:[[.5,.5]], iceCrystal2:[[.5,.5]], iceFountain:[[.5,.6]], mineHead:[[.4,.62]], drownedShrine:[[.48,.78,'lamp']],
  runeCircleL:[[.5,.5,'lamp']], runeCircleM:[[.5,.5,'lamp']], runeCircleS:[[.5,.5]], portalRuin:[[.5,.6,'lamp']], arcCrystal1:[[.5,.5]],
  arcCrystal2:[[.5,.5]], arcCrystal3:[[.5,.5]], flyingBooks:[[.5,.5]], coil1:[[.5,.15,'lamp']], coil2:[[.5,.15,'lamp']], coilBig:[[.5,.1,'lamp']],
  stormLamp1:[[.5,.15,'lamp']], glaze3:[[.5,.5]], glaze4:[[.5,.5]], spireTower:[[.5,.55]], kite3:[[.5,.2]],
  slagHeap1:[[.5,.5]], slagHeap2:[[.5,.5]], slagHeap3:[[.5,.5]], lavaRun:[[.5,.5,'lamp']], lavaBend:[[.5,.5,'lamp']], lavaEnd:[[.5,.5,'lamp']],
  foundry:[[.48,.75,'lamp']], oreCartHot:[[.5,.3]], crucibleHoist:[[.5,.78]], stallBurnt:[[.5,.6]], lavaWell:[[.5,.62,'lamp']], lavaSpring:[[.6,.72,'lamp']],
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
  const s=sizeOf(rects,o.kind,o.scale), out=[];   // o.scale: interiors draw smaller
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
