// Elfhome: the elves' town at the heart of the Moriquende, and Sylvara's "central command" for the
// forest year (js/explore_elfhome.js says who's here and what they do; js/forest.js is the year itself).
// A glade round the Heart Tree, with the Watch Table under it, and a place for each of the six houses
// round the edge. Built from the town tilesets until the elves' own art arrives (docs/art-prompts.md,
// "Elfhome"): the watchtower stands in for the Seers' talan, the chapel for the Healing House, mossy
// cottages for the Talons' lodge and the Guild's workshop, a fur tent for the Beast-speakers.
'use strict';
const {MapBuilder, T, P} = require('./builder');

const LORE = {
  heart:     ['The Heart Tree', 'An oak so old its lowest branches are wider than a Wrenford street. Lanterns hang in it, and walkways, and somewhere high up a child is singing. The elves say Elfhome grew round it, not the other way about.'],
  watchtable:['The Watch Table', 'A great round of oak with the whole Moriquende carved into its top, hex by hex. Little wooden figures stand on it: elves, deer, wolves, goblins. Someone has carved a tiny orc and left it, face down, at the eastern edge.'],
  elders:    ['The Elders\' Stone', 'Where the Council of Elders sits. The bench is worn into six hollows, one for each house of Elfhome.'],
  seers:     ['The Seers\' Talan', 'A lookout platform high in the trees, with a ladder that sways. From the top, they say, a Seer can see three hexes of the wood, and a little of tomorrow.'],
  healing:   ['The Healing House', 'Bundles of herbs hang from every beam. It smells of mint and woodsmoke and something cleaner than either. Mother Agathe\'s herbs come from here.'],
  talons:    ['The Talons\' Lodge', 'Longbows racked by the door, a target of plaited straw, a board of notches: orcs, the Talons say, though they won\'t say whether the notches count the living or the dead.'],
  guild:     ['The Guild\'s Workshop', 'Half-made platforms, coils of rope, pegs of seasoned yew. Everything here is built to be carried up a tree.'],
  lodge:     ['The Beast-speakers\' Lodge', 'A hide tent that smells of wet dog. Antlers over the door, and a bowl of water left out for whatever comes.'],
  herbs:     ['Drying Herbs', 'Feverfew, comfrey, woundwort. A label in a neat hand: "For the Varg. Do NOT give to the Varg."'],
  well:      ['The Spring', 'Cold, clear and very deep. The elves drink from it and leave the first cup for the wood.'],
  road:      ['The West Road', 'The road from Wrenford gives up a little way back, at a stile. The elves never fixed it, on purpose.'],
};

module.exports = function elfhome(rects){
  const m=new MapBuilder(rects,{id:'elfhome', name:'Elfhome', cols:40, rows:28, seed:5150});
  const {W, H} = m;
  m.lore=LORE;
  const CX=20*T, CY=14*T;

  // ── ground: grass, a dirt glade round the Heart Tree, paths out to each house and the road ──
  m.wornPatches(8);
  // the glade: trodden grass round the Heart Tree, a dirt ring where the paths meet
  for(let y=0;y<m.rows;y++) for(let x=0;x<m.cols;x++){ const dx=x-20, dy=(y-14)*1.25, d=dx*dx+dy*dy; if(d<=30) m.k[y][x]=d>=14&&d<=20?'D':'G'; }
  m.fill(24,14,39,15,'D');                     // the West Road in from the east
  m.fill(19,4,20,9,'D');                       // north to the Elders' Stone
  m.fill(11,10,16,11,'D'); m.fill(24,10,29,11,'D');   // to the Seers and the Healing House
  m.fill(11,17,16,18,'D'); m.fill(24,17,29,18,'D');   // to the Talons and the Guild
  m.fill(19,18,20,22,'D');                     // south to the Beast-speakers

  // ── the heart of it ──
  // the Heart Tree: the oldest of a grove (the tree art stays crisp up to about 1.6×)
  for(const [dx,dy,sc] of [[-150,-70,1.25],[150,-75,1.3],[-95,-120,1.1],[100,-125,1.15],[0,-150,1.2]]) m.place('tree',CX+dx,CY+dy,{scale:sc});
  m.place('tree',CX,CY-10,{scale:1.6,lore:'heart'});
  m.place('roundTable',CX,CY+110,{scale:0.62,lore:'watchtable'});
  m.place('lanternPost',CX-95,CY+130); m.place('lanternPost',CX+95,CY+130);
  m.place('well',CX+260,CY+10,{scale:0.8,lore:'well'});

  // ── the six houses ──
  m.place('hoodedShrine',CX,4*T+20,{scale:0.7,lore:'elders'});
  m.place('masonBench',CX-120,4*T+40,{scale:0.7}); m.place('masonBench',CX+120,4*T+40,{scale:0.7});
  m.place('watchTower',11*T,10*T,{lore:'seers'});
  m.place('chapel',29*T,10*T,{scale:0.8,lore:'healing'});
  m.place('herbs',26*T,10*T+30,{scale:0.55,lore:'herbs'}); m.place('cauldron',32*T-10,10*T+30,{scale:0.45});
  m.place('house2_moss',10*T,18*T+40,{lore:'talons'});
  m.place('logs',12*T+40,19*T+20); m.place('benchPlain',8*T,19*T+30);
  m.place('house5_moss',30*T,18*T+40,{lore:'guild'});
  m.place('workbench',27*T,19*T+30,{scale:0.55}); m.place('grindstone',32*T+20,19*T+30,{scale:0.55}); m.place('logs',33*T,18*T+50);
  m.place('house3_moss',CX,23*T+40,{lore:'lodge'});
  m.place('wagonCovered',CX-160,23*T+40); m.place('herbs',CX+150,23*T+30,{scale:0.45});

  // ── the wood all round ──
  // keep the glade, the paths' mouths and the houses' yards clear while the wood grows in
  const keep=[[CX-6*T,CY-5*T,12*T,10*T],[9*T,8*T,6*T,4*T],[25*T,8*T,7*T,4*T],[8*T,16*T,7*T,5*T],[25*T,16*T,8*T,5*T],[CX-4*T,20*T,8*T,5*T],[CX-3*T,3*T,6*T,4*T],[24*T,13*T,16*T,4*T]].map(([x,y,w,h])=>({x,y,w,h}));
  m.blocks.push(...keep);
  m.edgeWoods(1100,T*3.2,()=>m.r()<.9?'tree':'deadtree');
  m.scatter(320,[['tree',6],['bush',4],['flowerbush',4],['stump',2],['logs',1],['rocks1',1]]);
  m.blocks.splice(m.blocks.length-keep.length,keep.length);

  // lanterns in the trees at night, and the Heart Tree's own green glow
  m.glows.push({x:CX, y:CY-200, r:260, c:'150,255,170'});
  for(const [x,y] of [[CX-90,CY+90],[CX+90,CY+90],[11*T,7*T],[29*T,8*T],[10*T,17*T],[30*T,17*T],[CX,22*T]]) m.glows.push({x, y, r:130, c:'255,210,130'});

  // ── who stands where (js/explore_elfhome.js) ──
  m.npcs=[
    {role:'warden', x:CX+70, y:CY+60},
    {role:'elf_elder', x:CX+50, y:5*T+10},
    {role:'elf_seer', x:12*T+30, y:11*T},
    {role:'elf_healer', x:27*T+40, y:11*T+10},
    {role:'elf_talon', x:12*T+20, y:18*T+60},
    {role:'elf_guild', x:28*T, y:18*T+60},
    {role:'elf_charm', x:CX+110, y:22*T+60},
  ];
  m.safe=1; m.noStroll=1;
  m.spawns={road:[37*T,15*T], centre:[CX+120,CY+150]};
  m.exits=[{x:W-48, y:13*T, w:48, h:4*T, label:'The West Road (Wrenford)', to:'world'}];
  return m;
};
