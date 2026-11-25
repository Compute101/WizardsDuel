// Elfhome: the elves' town at the heart of the Moriquende, and Sylvara's "central command" for the
// forest year (js/explore_elfhome.js says who's here and what they do; js/forest.js is the year itself).
// A glade round the Heart Tree, with the Watch Table under it, and a place for each of the six houses
// round it, joined by mossy flagstone paths. The user's two sheets (27: buildings, 28: props and ground;
// pieces ef*, ground L forest floor, J flowered grass, Y the path with its edge set) cut by
// tools/cut_ruins_tileset.py; the wood round the edge is the town tileset's trees.
'use strict';
const {MapBuilder, T, P} = require('./builder');

const LORE = {
  heart:     ['The Heart Tree', 'An oak so old its lowest branches are wider than a Wrenford street. Lanterns hang in it, and walkways, and somewhere high up a child is singing. The elves say Elfhome grew round it, not the other way about.'],
  watchtable:['The Watch Table', 'A great round of oak with the whole Moriquende carved into its top, hex by hex. Little wooden figures stand on it: elves, deer, wolves, goblins. Someone has carved a tiny orc and left it, face down, at the eastern edge.'],
  elders:    ['The Elders\' Stone', 'Where the Council of Elders sits: six carved seats round a stone table, under an arch of living branches. One seat for each house of Elfhome.'],
  seers:     ['The Seers\' Talan', 'A lookout platform high in the trees, with a ladder that sways. From the top, they say, a Seer can see three hexes of the wood, and a little of tomorrow.'],
  healing:   ['The Healing House', 'Grown, not built: two trees lean together for its roof. Bundles of herbs hang under the eaves, and it smells of mint and woodsmoke. Mother Agathe\'s herbs come from here.'],
  talons:    ['The Talons\' Lodge', 'Longbows racked inside, a target of plaited straw, a board of notches: orcs, the Talons say, though they won\'t say whether the notches count the living or the dead.'],
  guild:     ['The Guild\'s Workshop', 'Half-made platforms, coils of rope, pegs of seasoned yew, a pole-lathe. Everything here is built to be carried up a tree.'],
  lodge:     ['The Beast-speakers\' Lodge', 'A lodge of hide and wicker that smells of wet dog. Antlers over the door, and a trough of water left out for whatever comes.'],
  herbs:     ['Drying Herbs', 'Feverfew, comfrey, woundwort. A label in a neat hand: "For the Varg. Do NOT give to the Varg."'],
  well:      ['The Spring', 'Cold, clear and very deep. The elves drink from it and leave the first cup for the wood.'],
  stone:     ['A Standing Stone', 'Carved with a single leaf. It\'s warm to the touch, even at night.'],
  cottage:   ['An Elven Cottage', 'Leaf-shingled, its windows lit gold. Someone inside is singing in a language you don\'t know.'],
  target:    ['Archery Target', 'Straw, plaited tight. Every arrow in it is in the middle ring.'],
};

module.exports = function elfhome(rects){
  const m=new MapBuilder(rects,{id:'elfhome', name:'Elfhome', cols:40, rows:28, seed:5150});
  const {W, H} = m;
  m.lore=LORE;
  const CX=20*T, CY=14*T;

  // ── ground: forest floor, the glade's flowered grass round the Heart Tree, flagstone paths ──
  m.fill(0,0,m.cols-1,m.rows-1,'L');
  for(let y=0;y<m.rows;y++) for(let x=0;x<m.cols;x++){ const dx=x-20, dy=(y-14)*1.2; if(dx*dx+dy*dy<=40) m.k[y][x]='J'; }
  const path=(x0,y0,x1,y1)=>m.fill(Math.min(x0,x1),Math.min(y0,y1),Math.max(x0,x1),Math.max(y0,y1),'Y');
  path(23,16,39,17);                           // the West Road in from the east
  path(14,16,26,17);                           // across the glade, under the Watch Table
  path(12,8,13,17); path(12,8,15,9);           // to the Elders' Stone
  path(27,8,28,17); path(27,9,30,10);          // to the Seers' talan and the Healing House
  path(10,17,11,21); path(29,17,30,21);        // to the Talons' lodge and the Guild's workshop
  path(19,17,20,23);                           // south to the Beast-speakers

  // ── the heart of it ──
  m.place('efHeartTree',CX,CY+20,{scale:1.5,lore:'heart'});
  m.place('efWatchTable',CX,CY+155,{scale:0.7,lore:'watchtable'});
  m.place('efLantern',CX-120,CY+170); m.place('efLanternCrook',CX+125,CY+170);
  m.place('efSpring',CX+330,CY+60,{lore:'well'});

  // ── the six houses ──
  m.place('efElders',13*T,8*T,{lore:'elders'});
  m.place('efTalan',26*T,8*T,{lore:'seers'}); m.place('efLanternBlue',24*T+20,8*T+30);
  m.place('efHealing',32*T,10*T+10,{lore:'healing'});
  m.place('efHerbRack',35*T+20,11*T,{lore:'herbs'}); m.place('efBeehive',29*T+20,11*T);
  m.place('efLodge',9*T,22*T+10,{lore:'talons'});
  m.place('efTarget',14*T+10,22*T,{lore:'target'}); m.place('efBowRack',4*T,22*T+30);
  m.place('efWorkshop',31*T,22*T+20,{lore:'guild'});
  m.place('efLadders',35*T+40,23*T); m.place('efRope',27*T,23*T+10);
  m.place('efBeastLodge',CX,25*T+20,{lore:'lodge'});
  m.place('efCottage1',6*T,13*T,{lore:'cottage'}); m.place('efCottage2',34*T,16*T-10,{lore:'cottage'});
  m.place('efCottage2',23*T+40,26*T-10,{lore:'cottage'}); m.place('efCottage1',16*T,26*T-10,{lore:'cottage'});
  m.place('efStone',7*T,17*T+20,{lore:'stone'});
  for(const [x,y] of [[11*T,10*T],[29*T,13*T],[13*T,19*T],[27*T,19*T]]) m.place('efLantern',x,y);

  // ── the wood all round, and its undergrowth ──
  const keep=[[CX-7*T,CY-7*T,14*T,12*T],[9*T,5*T,8*T,5*T],[23*T,4*T,12*T,8*T],[3*T,18*T,13*T,6*T],[25*T,18*T,13*T,6*T],
    [CX-5*T,22*T,10*T,5*T],[3*T,10*T,6*T,4*T],[31*T,13*T,6*T,4*T],[22*T,14*T,18*T,5*T]].map(([x,y,w,h])=>({x,y,w,h}));
  m.blocks.push(...keep);
  m.edgeWoods(1100,T*3.2,()=>m.r()<.92?'tree':'deadtree');
  m.scatter(260,[['tree',5],['efFern1',3],['efFern2',3],['efFernBig',2],['efBlossom',2],['efFoxgloves',2],
    ['efToadstools1',1],['efToadstools2',1],['efStump',1],['efLog',1],['bush',1]]);
  m.blocks.splice(m.blocks.length-keep.length,keep.length);
  // a few flowers in the glade itself
  for(const [k,x,y] of [['efFoxgloves',CX-280,CY+120],['efBlossom',CX+240,CY+180],['efToadstools2',CX-200,CY+230],['efFern2',CX+300,CY-60],['efToadstools1',CX-330,CY-40]]) m.place(k,x,y);

  // the Heart Tree's own green glow at night, and the lanterns' warm light (LIGHTS does the windows)
  m.glows.push({x:CX, y:CY-260, r:300, c:'150,255,170'});

  // ── who stands where (js/explore_elfhome.js) ──
  m.npcs=[
    {role:'warden', x:CX+230, y:CY+215},
    {role:'elf_elder', x:13*T+70, y:8*T+40},
    {role:'elf_seer', x:26*T+70, y:8*T+50},
    {role:'elf_healer', x:31*T, y:10*T+60},
    {role:'elf_talon', x:12*T, y:22*T+60},
    {role:'elf_guild', x:29*T, y:22*T+70},
    {role:'elf_charm', x:CX+150, y:25*T+40},
  ];
  m.safe=1; m.noStroll=1; m.music='audio/moriquende_theme.mp3';
  m.spawns={road:[37*T,16*T+40], centre:[CX+120,CY+220]};
  m.exits=[{x:W-48, y:15*T, w:48, h:4*T, label:'The West Road (Wrenford)', to:'world'}];
  return m;
};
