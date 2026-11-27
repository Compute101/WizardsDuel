// Hollowmere: the last town before Corvanthe. Its west still stands; east of the river
// (the Hollow) it is falling down. Generated from fixed seeds, so it's the same town every time.
'use strict';
const {MapBuilder, T, P} = require('./builder');

const RIVER = {c0:28, c1:30};
// house colour schemes by district (recolours made by tools/cut_ruins_tileset.py,
// named '<house>_<style>'; '' is the original terracotta and grey stone)
const HOUSE_STYLES = {
  west: ['', '', 'slate', 'slate', 'sand', 'moss'],   // the standing town
  east: ['char', 'char', 'dusk', ''],                 // burnt-out, and the old college's purple
};
const LORE = {
  statue:      ['The Hooded Watcher', 'Rain has worn its face away. Someone still leaves candle stubs at its feet, and the wax is fresh.'],
  shrine:      ['Wayside Shrine', 'The offering bowl is cracked, but it holds a single copper coin and a sprig of rosemary. Somebody here still prays.'],
  brokenStatue:['Fallen Hero', 'Only the boots remain. The plaque reads: "…ER THE BOLD, WHO HELD THE BRIDGE UNTIL THE LAST."'],
  banner:      ['Town Banner', 'A gold cross on crimson, the arms of Hollowmere. Someone kept it raised through the empty years after the Unweaving, when the town all but died. Now there are crowds under it again.'],
  deadtree:    ['Scarred Oak', 'A rune is cut deep into the bark: Ω, the sign of endings. The sap still weeps from it.'],
  wheel:       ['Cart Wheel', 'Splintered, the iron rim gone. Whoever fled with that cart did not get far.'],
  arch:        ['North Gate', 'The gate itself is long gone. Scorch marks lick up both pillars, higher than any torch could reach.'],
  well:        ['Old Well', 'Your voice comes back from the dark, a moment too late, and not quite in your own words.'],
  house1:      ['The Lit House', 'Locked. Warm light behind the shutters, and someone inside is humming an old duelling song.'],
  lamppost:    ['Lantern', 'Still burning. The lamplighter does the west bank. The lamps across the river burn too, and nobody admits to lighting those.'],
  crane:       ['Dock Crane', 'A crate still hangs from the hook, swaying though there is no wind. You decide not to open it.'],
  gallows:     ['The Gallows', 'Nobody has lived on this bank for years. The rope is new.'],
  wagon:       ['Covered Wagon', 'Packed for a journey: blankets, salt pork, a lute with no strings. Whoever owned it left on foot.'],
  sacks:       ['Grain Sacks', 'Rye, gone to black mould. Something has been nibbling at the corner of one, and it wasn\'t a rat.'],
  bridgeBanner:['Banner Bridge', 'Purple and gold: the colours of the old duelling college that stood across the river. Duels were fought on this bridge at midsummer.'],
  bridgeBannerBroken:['Fallen Bridge', 'Brought down on purpose. The keystones were cut through, and the cuts glow faintly when you look away.'],
  bridgeWood:  ['Mill Bridge', 'The planks flex under you. Far below, something pale turns over in the water and is gone.'],
  bridgeStone: ['Old Stone Bridge', 'Older than the town. The mason\'s marks on the parapet are Arcana glyphs: θ Φ ☽ ∞, the Ice word.'],
  bridgeWoodBroken:['Broken Footbridge', 'Snapped in the middle. The far half still creaks as though someone were crossing it.'],
  tavern:      ['The Drowned Crow', 'The tavern that never closed, not even in the empty years. Now every bench is full of gleaners and carters, and still the old regulars sit with their chairs turned to face the door.'],
  chapel:      ['Chapel of the Watcher', 'The hooded figure in the niche matches the statue in the plaza. The pews are dusty, all but the front one.'],
  tower:       ['The College Tower', 'All that stands of the duelling college. The brass orrery on its roof still turns, tracking stars that are not in the sky.'],
  pond:        ['Mill Pond', 'Fat carp circle in the shallows, unafraid. Someone still comes down here to feed them.'],
  notices:     ['The Market Board', 'Carters wanted for Gilden, two days, good pay. Gleaners wanted, Cindergate, ask at the Crow. House Ashcombe buys quintessence. LOST: one crew, four men, went in by the Wardgate a week since. Under it, in a different hand: not lost.'],
  market:      ['Hollowmere Market', 'Crates and carts where the stalls used to stand, and everything for sale: rope, lamps, salt pork, crowbars, charms of very doubtful use. Prices are what the gleaners will pay, which is a great deal.'],
  river:       ['The Hollow', 'Black water, slow and cold. It runs north to Corvanthe, and the townsfolk said it ran the other way at night.'],
};
// these kinds only carry lore where it's placed by hand
const LORE_BY_HAND = ['house1','crane','gallows','wagon','sacks'];

module.exports = function hollowmere(rects){
  const m=new MapBuilder(rects,{id:'hollowmere', name:'Hollowmere', cols:48, rows:34, seed:9031});
  m.flow='N';                                          // the Hollow runs north, to Corvanthe and on to the Wolf Sea
  const {cols:COLS, rows:ROWS, W:WORLD_W} = m;
  m.lore=LORE;

  // ── ground ──
  m.r=P.rng(1427);
  m.fill(3,7,44,7,'D'); m.fill(3,26,44,26,'D');          // lanes
  m.fill(8,3,8,30,'D'); m.fill(39,3,39,30,'D');
  m.fill(23,30,39,30,'D');                               // the path to the old stone bridge
  m.fill(0,16,COLS-1,17,'R');                            // main street
  m.fill(21,0,22,ROWS-1,'R');                            // market street
  m.fill(17,13,26,20,'P');                               // plaza
  for(let y=0;y<ROWS;y++) for(let x=RIVER.c1+1;x<COLS;x++) if(m.k[y][x]==='R') m.k[y][x]='M';   // the ruined east
  m.fill(RIVER.c0,0,RIVER.c1,ROWS-1,'W');                // the river
  m.fill(RIVER.c1+1,9,RIVER.c1+6,12,'K');                // the docks on its east bank
  for(let y=0;y<7;y++) for(let x=21;x<=22;x++) m.k[y][x]='M';
  for(let y=28;y<ROWS;y++) for(let x=21;x<=22;x++) m.k[y][x]='M';
  m.wornPatches(14);
  m.fill(13,22,17,24,'O');                               // the mill pond

  // ── pieces ──
  m.r=P.rng(9031);
  const place=m.place.bind(m);
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
  // the boom town: the plaza is a market again, crates and carts where the stalls stood, and the ore carts on their way
  // from the Anvilfells to Gilden stop here (no stall art yet: docs/art-prompts.md)
  for(const [k,x,y,o] of [['cratesProduce',17.9*T,14.3*T,{lore:'market'}],['sacksGrain',19.4*T,14.1*T],['cartLoaded',24.6*T,14.4*T],
    ['basketApples',20.4*T,19.7*T],['handcartSacks',17.5*T,18.0*T],['anvilBlock',24.6*T,17.7*T,{scale:0.26}],['barrelsTrio',23.9*T,19.9*T],['noticeBoard',25.3*T,13.6*T,{lore:'notices'}],['oreCart',25.9*T,18.8*T]]) place(k,x,y,o);
  // its people: townsfolk walk the west bank's streets by day, never the east (map.stroll), and a few stand to talk
  m.stroll={maxX:RIVER.c0*T-24, n:14};
  m.greet=['Mind the cart!','Pies, hot pies!','Going in? Good luck to you.','Ore for Gilden, out the way!','Ashcombe pays best, tell your crew.','Don\'t cross after dark.','Spill? Ask at the Crow.','Another one for the Wardgate.'];
  m.npcs=[{role:'hm_factor',x:19.3*T,y:16.2*T},{role:'hm_carter',x:24.4*T,y:15.4*T},{role:'hm_pies',x:18.6*T,y:19.5*T},
    {role:'hm_smith',x:25.0*T,y:18.3*T},{role:'hm_tin',x:24.2*T,y:19.3*T},{role:'hm_furs',x:17.4*T,y:16.9*T},{role:'hm_fish',x:18.3*T,y:15.4*T}];
  // lanterns down the main street
  for(const x of [270,990,2226,2786]) place('lamppost',x,STREET_N+2);

  // the broken town wall and its gate, north
  const WALL_Y=4*T+30;
  place('arch',22*T,WALL_Y);
  m.wallRun(WALL_Y,60,WORLD_W-60,[[22*T-10,22*T+120],[RIVER.c0*T,(RIVER.c1+1)*T+14],[8*T,9*T+14],[39*T,40*T+14]],
    ['wallLow1','ruinWall2','rubble2','wallLow2','rubble4','wallLow1','rubble1','ruinWall1','wallLow2','rubble2']);

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
  m.placeBridge('bridgeTopWoodBroken',RIVER.c0,RIVER.c1,LANE_C(2),'bridgeWoodBroken');
  m.placeBridge('bridgeTopWood',RIVER.c0,RIVER.c1,LANE_C(7),'bridgeWood');
  m.placeBridge('bridgeTopStone',RIVER.c0,RIVER.c1,17*T,'bridgeBanner');
  m.placeBridge('bridgeTopStoneBroken',RIVER.c0,RIVER.c1,LANE_C(26),'bridgeBannerBroken');
  m.placeBridge('bridgeTopStone',RIVER.c0,RIVER.c1,LANE_C(30),'bridgeStone');
  const RX0=RIVER.c0*T, RX1=(RIVER.c1+1)*T;
  for(const [k,x,y] of [['bannerP',RX0-26,16*T-4],['bannerTorn',RX1+28,16*T-4],['lamp2',RX0-30,18*T+20],['lamp4',RX1+12,18*T+20],
    ['lamp3',RX0-24,8*T+24],['lamp3',RX0-24,24*T],['lamp2',RX1+14,31*T+30],['postTall',RX0-20,26*T+6],['postTall',RX1+20,26*T+6]]) place(k,x,y);
  place('postRing',RX0-14,12*T,{lore:'river'});        // a mooring ring on the west bank
  place('stone',18*T+30,22*T+20,{lore:'pond'});        // a sitting stone by the mill pond
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
  m.edgeWoods(900,T*2.4,(x)=>x>WORLD_W*0.62&&m.r()<.7?'deadtree':'tree');
  // scatter in the grass
  m.scatter(500,[['bush',5],['flowerbush',3],['tree',4],['stump',2],['stone',2],['rocks1',1],['deadtree',1]],
    (k,x)=>x>WORLD_W*0.62&&k==='flowerbush'?'rocks1':k);
  // paint the houses by district (the Lit House keeps its terracotta)
  const rs=P.rng(5150);
  for(const o of m.objs) if(/^house\d$/.test(o.kind) && o.lore!=='house1'){
    const st=P.pick(rs,HOUSE_STYLES[o.x<RIVER.c0*T?'west':'east']);
    if(st) o.kind+='_'+st;
  }
  for(const o of m.objs) if(!o.lore && LORE[o.kind] && !LORE_BY_HAND.includes(o.kind)) o.lore=o.kind;

  // ── arrivals and ways out ──
  m.spawns={start:[PX,PY+150], east:[WORLD_W-100,17*T+10], west:[100,17*T+10]};
  m.exits=[
    {x:WORLD_W-48,y:16*T,w:48,h:2*T,label:'The Corvanthe Road',to:{map:'corvanthe_road',spawn:'west'}},
    {x:0,y:16*T,w:48,h:2*T,label:'Travel',to:'world'},
  ];
  return m;
};
