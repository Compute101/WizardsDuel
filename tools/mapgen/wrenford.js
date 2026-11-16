// Wrenford: the new university city, a long way west of Corvanthe. Its scholars were the ones who
// were away when the Unweaving came (on a visit, on a dig, at a funeral), and they founded the
// University of Wrenford a few years after, in a market town on the river Wren. Nothing here is
// ruined; it is a safe place (map `safe`: no Echoes, rooms hold no fights), where a wizard learns
// real magic (the Matriculation quest, js/explore_folk.js) and, later, makes spells.
// Laid out like an old university town: the High curving down to Orrin Bridge, Carfax at the
// crossroads, Broad Street with the Remnant Library, the colleges' quads behind their gate towers,
// the Schools' duelling court, the Physic Garden, the Meadow and the punts on the Wren.
// Buildings face south (we see their fronts), so every college stands north of the street its gate
// opens onto, its quad behind the gate and its chapel at the back, facing in.
'use strict';
const {MapBuilder, T, P} = require('./builder');
const {City} = require('./city');

const COLS=58, ROWS=47;
const RIVER=[50,52];                         // the Wren, flowing south

const LORE = {
  // streets and squares
  high:       ['The High', 'Wrenford\'s great street, curving down from Carfax to Orrin Bridge. Gowns and market carts share it, and nobody casts a spell on it: Statute the Fourth.'],
  carfax:     ['Carfax Tower', 'The town\'s tower at the crossroads, older than the University. The brass orrery on its roof was a gift from the scholars, and it turns the right way, which they are very proud of.'],
  memorial:   ['The Orrin Memorial', 'Magister Orrin, in stone, book closed. He was the one councillor of Corvanthe who voted against the Unweaving Word, and the only one the scholars here will name. Below him: "HE SAID: YOU DO NOT KNOW WHAT IT WILL UNWEAVE."'],
  wreaths:    ['Wreaths', 'Fresh flowers, every day, on the steps of the Memorial. Some carry cards. Most of the cards carry a single name.'],
  market:     ['The Covered Market', 'Butchers, bakers, a man who sells nothing but string. Prices in Wrenford have doubled since the scholars came, and the stallholders have stopped complaining about it.'],
  marketCart: ['A Market Cart', 'Turnips, onions, a sack of oats. The carter is somewhere in the Bird and Bell.'],
  stall:      ['A Stall', 'Jars of honey, pots of ink, quills by the bundle. A card in neat copperplate: "SCHOLARS\' DISCOUNT ABOLISHED. YOU KNOW WHY."'],
  // the University
  library:    ['The Remnant Library', 'Everything the scholars could carry out of Corvanthe, and everything they have written since. The doors stand open from dawn till the evening bell. You may not take a candle in. You may not take a book out. You may not, under any circumstances, read aloud.'],
  church:     ['The University Church', 'Where the University gathers for its sermons and its oaths. The candles in the windows are lit by hand, every one, by the vergers, because nobody here lights anything by magic any more if they can help it.'],
  orrery:     ['The Great Orrery', 'A brass model of the heavens, the size of a cottage, in the middle of Radcliffe Square. It was built to replace the one in the Collegium. This one is wound by a clerk each morning, with a key, by hand.'],
  square:     ['Radcliffe Square', 'The heart of the University, laid with the flags of a demolished cattle market. Scholars cross it with their gowns flapping and their heads down, the way people walk through a churchyard.'],
  heads:      ['The Founders', 'Stone busts of the University\'s founders along Broad Street. Every one of them is looking east, toward Corvanthe, though the sculptor swears he carved them looking south.'],
  proctors:   ['The Proctors\' Office', 'Where the Proctors keep the Statutes, and the Bulldogs keep the Proctors. The board by the door lists the week\'s fines. "Unlicensed conjuring, Broad Street: five crowns. Levitating a bicycle: ten."'],
  statutes:   ['The Statutes of Caution', 'Nailed to the board, in letters an inch high: I. No working larger than its maker. II. No working without a witness. III. No working that cannot be undone. IV. No working in the street. V. No Word is to be spoken that is not understood. Somebody has added, in pencil, VI. Don\'t be clever.'],
  schools:    ['The Schools', 'The examination halls, and the duelling court in front of them where every student is taught to fight before they are taught anything else. "Because they will be fought," says the Master of the Schools, "long before they are wise."'],
  circle:     ['A Duelling Circle', 'Chalk and silver set into the flags. Inside a circle a spell can go off at full strength and stop at the line. Outside it, it is a fine, and a long talk with the Proctors.'],
  lab:        ['The Warded Laboratory', 'Built by statute a long way from anything that matters, behind three wards and a ditch. The smoke from its chimney is a different colour every hour. When it is white the whole University holds its breath.'],
  labRod:     ['A Lightning Rod', 'One of the Laboratory\'s wards: anything that gets loose in there is meant to go up the rod and harmlessly into the sky. "Harmlessly" is underlined on the plans, three times.'],
  labCircle:  ['A Warding Circle', 'A containment ring, glowing faintly even by day. The inscription round its edge reads: IF THIS LIGHT GOES OUT, RUN.'],
  // the colleges
  founders:   ['The Exiles\' Tower', 'The gate tower of Founders\' College, the first college of Wrenford. Its bell rings every evening, once for each scholar of Corvanthe who did not come out. It takes most of an hour.'],
  foundersQuad:['Founders\' Quad', 'The lawn may be walked on by Fellows of the college and by nobody else. The Fellows never walk on it either. It is the only thing in Wrenford anyone agrees on.'],
  foundersChapel:['Founders\' Chapel', 'Plain and white inside, with a long wall of names. There is room on it for more names, and every term the Chaplain hopes there will be no need of it.'],
  orrin:      ['Orrin Tower', 'The tallest tower in Wrenford, at the end of Orrin Bridge. At dawn on the first of May the choir sings from the top of it, and the whole town comes down to the bridge to listen, and nobody jumps in the river. Not since that once.'],
  orrinQuad:  ['Orrin College', 'Named for the one councillor who voted against the Word. Its scholars are the most careful in Wrenford, and the most insufferable about it.'],
  orrinChapel:['Orrin Chapel', 'Above the altar, a window of a man saying no. It is the most visited window in the city.'],
  absent:     ['All Absent College', 'A college with no students: its Fellows are elected to remember. Each keeps the work of a scholar lost in the Unweaving, finishing what can be finished and keeping the rest. The gate is always open, and nobody ever seems to go in.'],
  absentChapel:['All Absent Chapel', 'The candles here are never put out, by tradition, and the Proctors have stopped arguing about it.'],
  lantern:    ['Lantern College', 'The newest college, for the scholars who came after: Wrenford\'s own students, who never saw Corvanthe. Its Fellows say it is the only college that looks forward. The other colleges say that is exactly the problem.'],
  lanternTower:['The Lantern', 'The tower of Lantern College. A light burns at the top all night so that, the founders said, "nobody in this town forgets how far a light can carry, or how far a fire can."'],
  // town
  inn:        ['The Wren\'s Nest', 'The coaching inn on Cornmarket, where every new arrival spends their first night. The landlady keeps a room free for anyone who comes in from the east road looking the way people look who come in from the east road.'],
  pub:        ['The Bird and Bell', 'The scholars\' tavern on St Giles. Arguments here have ended friendships, started colleges, and in one case set fire to the snug.'],
  garden:     ['The Physic Garden', 'The University\'s garden of healing herbs, walled, weeded, labelled in three languages. Nothing in it is magical. That was the point.'],
  meadow:     ['The Meadow', 'Cows, elms and the river. Students come here to read and fall asleep; the cows have learned to step round them.'],
  punts:      ['The Punt Stage', 'Flat boats for hire by the hour, poled along the Wren. You stand at the back, you lean on the pole, and at least once you are left hanging off it in the middle of the river. It is a Wrenford tradition.'],
  bridge:     ['Orrin Bridge', 'Seven arches of honey-coloured stone over the Wren. Coming in over it from the east road, the whole town is in front of you: towers and spires, all of them standing.'],
  footbridge: ['Parks Footbridge', 'A wooden bridge from the University Parks to the far bank. Lovers carve their initials into the rail; the Proctors fine them; the initials stay.'],
  meadowBridge:['Meadow Bridge', 'An old cart bridge at the bottom of the Meadow, for the cows.'],
  river:      ['The Wren', 'A small, clear, lazy river. After the Hollow, it is a strange thing to look at water and see only fish in it.'],
  parks:      ['The University Parks', 'Lawns and great trees, and the cricket ground, where the colleges play the town every summer and the town always wins.'],
  westgate:   ['The West Gate', 'The road out of Wrenford, west. The gate is never shut. The scholars insisted on that: they had seen enough gates shut.'],
  lamp:       ['Gas Lamp', 'Lit at dusk by the lamplighter, with a long pole and a box of matches. Never by a spell. Statute the Fourth.'],
  bench:      ['A Bench', 'A brass plate: "In memory of the Collegium Library, Corvanthe. She sat here and read."'],
  urn:        ['A Stone Urn', 'Geraniums. Someone waters them every morning before the bell.'],
  satchel:    ['A Scholar\'s Satchel', 'Leather, scuffed, stuffed with lecture notes, half of them on the subject of invisibility. A name inside the flap: PONDER, LANTERN COLL. Please return.'],
};

// the town's houses, all standing: house fronts in five colours, townhouses for the rich streets
const SETS = {
  fronts:{0:['house1','house1_slate','house1_sand','house1_moss','house1','house1_slate','townhouse'], 1:['house1_dusk','house1_slate'], 2:['house1']},
  backs: {0:['backTerra1','backTerra2','backSlate','backPurple','backSlate'], 1:['backSlate','backTerra1'], 2:['backSlate']},
  sides: {0:['sideTerra','sideSlate','sidePurple'], 1:['sideSlate'], 2:['sideSlate']},
  yard:  {0:['barrel','crate1','crate2','flowerbush','flowerbush','bush','fence','urn','logs','lowwall','fence2','barrel2'], 1:['barrel','crate1'], 2:['barrel']},
};

module.exports = function wrenford(rects){
  const m=new MapBuilder(rects,{id:'wrenford', name:'Wrenford', cols:COLS, rows:ROWS, seed:7201});
  const {W, H} = m;
  m.lore=LORE; m.safe=true; m.arena='library'; m.music='audio/wrenford_theme.mp3';
  const city=new City(m,{street:'R', square:'P', ruin:()=>0});
  const RES_=(x0,x1,y0,y1)=>city.reserve(x0*T,x1*T,y0*T,y1*T);

  // ── the Wren, down the east side ──
  m.flow='S';
  for(let y=0;y<ROWS;y++){ const off=Math.round(Math.sin(y/7)*0.6); m.fill(RIVER[0]+off,y,RIVER[1]+off,y,'W'); }
  const rx0=y=>{ for(let x=0;x<COLS;x++) if(m.at(x,y)==='W') return x; return RIVER[0]; };

  // ── streets ──
  const road=(pts,o)=>city.road(pts,Object.assign({bend:0},o||{}));
  road([[0,24],[12,24],[22,24]],{w:2});                                     // Queen Street, from the West Gate
  road([[22,24],[30,25],[38,25],[45,24],[COLS-1,24]],{w:2,bend:1,wander:0.5}); // the High, curving down to the bridge
  m.fill(44,24,COLS-1,25,'R');                                               // (straight over the bridge)
  road([[22,13],[22,24]],{w:2});                                            // Cornmarket
  road([[21,0],[21,13]],{w:3});                                             // St Giles, broad
  road([[22,9],[38,9]],{w:3});                                              // Broad Street
  road([[38,9],[38,24]],{w:2});                                             // Catte Street
  road([[38,0],[38,9]],{w:2});                                              // Parks Road
  road([[22,26],[22,39]],{w:2});                                            // St Aldates
  road([[4,39],[22,39],[48,39]],{w:2});                                     // Merton Street
  road([[0,15],[21,15]],{w:2});                                             // George Street
  road([[0,30],[22,30]],{w:2});                                             // Pembroke Street
  road([[11,5],[21,5]],{w:2});                                              // Beaumont Street
  road([[10,15],[10,24]],{w:1}); road([[10,24],[10,30]],{w:1}); road([[4,30],[4,39]],{w:1});
  road([[30,25],[30,30]],{w:1});                                            // Magpie Lane, between the colleges
  m.fill(rx0(39)-1,26,rx0(39)-1,43,'D');                                    // the Meadow walk, by the river
  m.fill(23,40,48,40,'R'); m.fill(36,41,36,45,'D'); m.fill(36,45,rx0(45)-1,45,'D');   // Broad Walk, round the Meadow
  RES_(23.2,rx0(43)-0.2,40.6,ROWS);                                          // the Meadow: open grass, no houses

  // squares: Carfax, Radcliffe Square, the Covered Market, the Schools' court, the foot of St Giles
  city.square(22.8,25,2.6,1.6);                                             // Carfax
  m.fill(26,13,36,21,'P');                                                  // Radcliffe Square
  city.square(15.5,20,3.6,2.2);                                             // the Covered Market
  m.fill(12,33,20,37,'P');                                                  // the Schools' court
  city.square(22.5,12,2.4,1.4);                                             // the Memorial at the foot of St Giles

  // ── the river crossings ──
  const bridge=(kind,y,lore)=>{ const a=rx0(y); m.placeBridge(kind,a,a+2,y*T+T/2,lore); };
  bridge('bridgeTopStone',24.5,'bridge');
  bridge('bridgeTopWood',6,'footbridge');
  bridge('bridgeTopWood',45,'meadowBridge');
  // wide street over the stone bridge
  { const a=rx0(24); m.walk.push({x:a*T,y:24*T,w:3*T,h:2*T}); }

  // ── landmarks ──
  const RES=(x0,x1,y0,y1)=>city.reserve(x0*T,x1*T,y0*T,y1*T);
  const put=(k,tx,ty,lore,o)=>m.place(k,tx*T,ty*T,Object.assign(lore?{lore}:{},o||{}));

  // the Remnant Library faces Broad Street from the north; the Founders' busts beside it
  put('hall',30,9-0.05,'library',{scale:0.9});
  RES(24.5,35.5,2.5,9);
  for(const x of [25.2,26.6,33.8,35.2]) put('scholarStatue',x,8.85,'heads',{scale:0.45});
  for(const x of [27.8,32.2]) put('lamppost',x,8.9,'lamp');
  // Radcliffe Square: the Great Orrery, the University Church facing it from the north
  put('temple',31,15,'church',{scale:0.78});
  put('orrery',31,19.4,'orrery',{scale:0.8});
  for(const [x,y] of [[27.5,17.5],[34.5,17.5],[27.5,21.2],[34.5,21.2]]) put('lamppost',x,y,'lamp');
  for(const [x,y] of [[29,21.5],[33,21.5]]) put('bench',x,y,'bench');
  for(const [x,y] of [[27,14.5],[35,14.5]]) put('urn',x,y,'urn');
  put('gravel',36.2,20.6,'square');
  RES(25.5,37,12.5,22);

  // Carfax: the old town tower, the crossroads in front of it
  put('tower',19.6,24,'carfax',{scale:0.62});
  RES(17.8,21.2,19.8,24.2);
  // the foot of St Giles: Magister Orrin's memorial, wreaths at its feet
  put('scholarStatue',22.6,12.1,'memorial',{scale:0.62});
  for(const [k,x,y] of [['flowerbush',21.5,12.6],['flowerbush',23.7,12.5],['shrine',22.6,12.9]]) put(k,x,y,'wreaths',{scale:k==='shrine'?0.45:0.5});

  // Founders' College: north of Merton Street, the Exiles' Tower at its gate
  const F={x0:23.5,x1:35.5,y0:28,y1:39};
  put('bellTower',24.6,39,'founders',{scale:0.8});
  put('stoneArch',27,39,'foundersQuad');
  m.fill(25,31,35,37,'G'); m.fill(25,38,35,38,'P'); m.fill(26,31,26,37,'P'); m.fill(34,31,34,37,'P'); m.fill(27,31,33,31,'P');
  m.fill(27,32,27,38,'P');
  put('chapel',30.5,31,'foundersChapel',{scale:0.72});
  put('tower',34.2,31,'foundersQuad',{scale:0.55});
  for(const x of [29,31,33,35]) put(x===29?'wallLow2':'wallLow1',x,39.1);
  for(let y=32.4;y<38.5;y+=2) { put('sideSlate',24.3,y); put('sideSlate',36.2,y); }
  put('statue',30.5,35.2,'foundersQuad',{scale:0.5});
  RES(F.x0,F.x1+1.5,F.y0,F.y1+0.4);

  // All Absent College, east of Founders'
  put('stoneArch',39.5,39,'absent');
  m.fill(38,34,46,38,'G'); m.fill(39,34,39,38,'P'); m.fill(39,38,46,38,'P');
  put('chapel',42.5,33.8,'absentChapel',{scale:0.62});
  for(const x of [41,42.5,44,45.5]) put('wallLow1',x,39.1);
  put('wallLow2',37.8,39.1);
  for(let y=34.6;y<38.5;y+=2) put('sidePurple',47.4,y);
  for(const [x,y] of [[41.5,35.5],[44,36.4],[45.3,34.8]]) put('urn',x,y,'urn',{scale:0.45});
  put('bench',42.8,37.6,'bench',{scale:0.45});
  RES(37,48.6,30.5,39.4);

  // Orrin College: north of the High by the bridge; Orrin Tower at the bridge end
  put('bellTower',48.6,24,'orrin',{scale:0.9});
  put('stoneArch',43,24,'orrinQuad');
  m.fill(40.5,15,47.5,23,'G'); m.fill(42,23,47,23,'P'); m.fill(43,17,43,23,'P');
  put('chapel',44.5,17.2,'orrinChapel',{scale:0.68});
  for(const x of [41,45,46.5]) put('wallLow1',x,24.1);
  for(let y=18.4;y<23.5;y+=2) put('sideSlate',41,y);
  for(const [k,x,y] of [['pillar1',45.5,20.8],['pillar2',46.6,20.8],['pillar3',47.7,20.8],['tree',46.8,22.6]]) put(k,x,y,'orrinQuad',{scale:0.5});
  RES(39.6,49.6,12.5,24.4);

  // Lantern College: north of George Street, the Lantern on its corner
  put('tower',3.4,15,'lanternTower',{scale:0.66});
  put('stoneArch',7,15,'lantern');
  m.fill(5,8,9,14,'G'); m.fill(7,9,7,14,'P');
  put('chapel',7.2,9,'lantern',{scale:0.55});
  put('wallLow2',8.6,15.1);
  for(let y=10.4;y<14.5;y+=2) put('sideTerra',9.4,y);
  for(const [x,y] of [[5.4,12.6],[8.4,12.8]]) put('urn',x,y,'urn',{scale:0.45});
  RES(1,10.2,4,15.4);

  // the Schools: the examination halls, the duelling court before them
  put('townhouse',16,33,'schools',{scale:0.82});
  for(const [x,y] of [[13.6,36.6],[18.4,36.6]]) put('runeCircle',x,y,'circle',{scale:0.5});
  for(const [x,y] of [[12.4,33.2],[19.6,33.2]]) put('bannerP',x,y,'schools');
  put('bench',16,37.8,'bench',{scale:0.5});
  RES(11.5,20.5,28.5,38.2);

  // the Covered Market: stalls round the square, the inn and the Proctors nearby
  for(const [k,x,y,l] of [['wagon',13.6,19.6,'marketCart'],['cart',17.5,21.6,'marketCart'],['crateStand',14.4,21.3,'stall'],['crateStand',15.1,21.3,'stall'],
    ['sacks',16.6,19.2,'stall'],['barrel2',18,19.3],['crate3',12.7,21],['crate5',18.6,20.5],['lamp3',15.6,18.7,'market'],['barrel',13.2,22.1]]) put(k,x,y,l);
  RES(11.6,19.6,17.6,22.4);

  // the Warded Laboratory, alone in the Parks: tower, rods, rings, a chain fence
  put('watchTower',45,7,'lab',{scale:0.68});
  for(const [x,y] of [[42.4,7.6],[47.6,7.4]]) put('lightningRod',x,y,'labRod',{scale:0.4});
  for(const [x,y] of [[43,10.6],[47,10.4]]) put('runeCircle',x,y,'labCircle',{scale:0.45});
  for(let x=41.2;x<48.6;x+=1.5) put('chainFence1',x,12);
  RES(40,49,2,12.4);

  // the Physic Garden, walled, by the bridge south of the High
  m.fill(41,27,47,29,'d');
  for(const [k,x,y] of [['flowerbush',42,28],['flowerbush',43.4,27.9],['urn',46.6,28],['flowerbush',41.6,29.3],['flowerbush',46.6,29.4],['bench',44.6,29.2]])
    put(k,x,y,k==='bench'?'garden':k==='urn'?'garden':undefined,{scale:0.5});
  for(const x of [41,42,43,45,46,47]) put('lowwall',x,26.95,x===45?'garden':undefined);
  RES(40.4,48,26.4,30);

  // the punt stage on the Meadow, boats drawn up on the bank
  { const a=rx0(33); m.place('jetty',a*T+44,34*T,{decal:1,lore:'punts'}); const s=m.size('jetty'); m.walk.push({x:a*T+44-s.w*0.28,y:34*T-s.h+8,w:s.w*0.56,h:s.h-16}); }
  for(const [x,y] of [[rx0(29)-1.3,29.6],[rx0(36)-1.2,37.2]]) put('boat',x,y,'punts',{scale:0.5});
  put('postRing',rx0(31)-0.4,31,'river');

  // ── the town: terraces along every street, then the dons' and Bulldogs' furniture ──
  const inn=city.landmark('tavern',20,15,'inn');
  const pub=city.landmark('tavern',19,4,'pub');
  const proc=city.landmark('townhouse',27,24,'proctors');
  m.place('post2',proc.cx+90,proc.base+28,{lore:'statutes'});
  city.build({sets:SETS, gap:0.05, yards:0.25});

  // lamps down the main streets
  for(let x=2;x<COLS-1;x+=6){ const tx=x, ty=23; if(m.at(tx,ty)!=='R'&&m.at(tx,ty+1)==='R') m.tryPlace('lamppost',tx*T+20,(ty+1)*T-2,4); }
  for(let y=1;y<38;y+=6) m.tryPlace('lamppost',20*T+30,y*T,4);
  for(const o of m.objs) if(o.kind==='lamppost'&&!o.lore) o.lore='lamp';
  // the Meadow, the Parks and the far bank: trees, cows' grass
  m.scatter(260,[['tree',6],['bush',2],['flowerbush',1],['stone',0.4]]);
  m.edgeWoods(500,T*1.6,()=>'tree');
  for(const o of m.objs) if(o.kind==='tree'&&!o.lore){ const ty=o.y/T, tx=o.x/T; if(ty>40.5&&tx<49) o.lore='meadow'; else if(ty<12&&tx>36&&tx<49) o.lore='parks'; }
  m.place('stone',rx0(20)*T-30,20*T,{lore:'river'});

  // ── people ──
  m.npcs=[
    {role:'porter',  x:26.2*T, y:40.6*T},          // at the Founders' gate
    {role:'tutor',   x:29.4*T, y:34.2*T},          // the Senior Tutor, in Founders' Quad
    {role:'weizan',  x:16*T,   y:35.4*T},          // on the Schools' court
    {role:'fizzwick',x:45*T,   y:8.4*T},           // at the Laboratory door
    {role:'keeper',  x:31.6*T, y:10.4*T},          // the Keeper, on the Library steps
    {role:'chaplain',x:24.1*T, y:13.4*T},          // the Chaplain, at the Memorial
    {role:'dealer',  x:15.6*T, y:20.6*T},          // the licensed dealer, in the Covered Market
    {role:'aurelia', x:30.2*T, y:21.6*T},          // reading cards in Radcliffe Square (met here, again later)
    {role:'ponder',  x:44*T,   y:43.4*T},          // asleep on the Meadow
    {role:'bulldog', x:proc.cx-40, y:proc.base+44},// outside the Proctors'
    {role:'bulldog2',x:47.2*T, y:26.3*T},          // at the end of Orrin Bridge, greeting arrivals
  ];
  m.place('pouch',44*T,4.6*T,{lore:'q:satchel',scale:0.22});   // Ponder's satchel, lost in the Parks
  m.lore['q:satchel']=LORE.satchel;

  // night light: the Lantern, the Laboratory, the Orrery
  m.glows.push({x:3.4*T,y:7*T,r:260,c:'255,210,120'},{x:45*T,y:3*T,r:240,c:'190,160,255'},{x:31*T,y:17*T,r:200,c:'255,220,150'});

  // ── arrivals and ways out ──
  m.spawns={start:[46*T,25.2*T], west:[2*T,24.8*T], east:[(COLS-1.5)*T,24.9*T], north:[22.5*T,1.6*T]};
  m.exits=[
    {x:0,y:24*T,w:48,h:2*T,label:'The West Road',to:'world'},
    {x:W-48,y:24*T,w:48,h:2*T,label:'The East Road (Hollowmere)',to:'world'},
    {x:21*T,y:0,w:3*T,h:40,label:'The North Road',to:'world'},
  ];
  for(const y of [23.9,26.4]) m.place('bannerP',1.6*T,y*T,{lore:'westgate'});
  return m;
};
