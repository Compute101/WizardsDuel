// Corvanthe's sectors, outer ring: one generator for all of them but Cindergate (which has its
// own hand-laid streets). Each sector is an old district steeped in one element since the
// Unweaving: its palette (a recoloured atlas, sprites/ruins/sector_<palette>), weather, light,
// landmarks, Echoes, and a barrier along its north edge where the inner rings begin.
// The sectors stand round the Wound in the spell wheel's order (ELEMENTS in js/game.js), so an
// element's opposite is across the city; Wallside, the street inside the wall, runs west–east
// through each and leads on to its neighbours (RING).
'use strict';
const {MapBuilder, T, P} = require('./builder');
const {City} = require('./city');
const {OWN, OWN_LORE, placeOwnLand, placeOwnProps} = require('./own');

// the ring, in wheel order: east from one leads to the next
const RING = ['cindergate','heights','spirewatch','collegium','drowned_quarter','quarry_ward','frostmarket','gloamside'];
const RING_NAMES = {cindergate:'Cindergate', heights:'The Heights', spirewatch:'Spirewatch', collegium:'The Collegium',
  drowned_quarter:'The Drowned Quarter', quarry_ward:'The Quarry Ward', frostmarket:'Frostmarket', gloamside:'Gloamside'};

const SECTORS = {
  heights: {el:'air', pal:'gale', seed:6101, fx:'wind', haze:'220,225,240,0.08', glow:'210,220,255',
    line:['The Torn Sky', 'Past here the hill houses came loose. Roofs, walls, whole parlours drift overhead on a wind that never drops, turning slowly, still furnished.'],
    arch:['The Weathervane Gate', 'The gate to the upper Heights. Its iron weathervane spins without pause, and always points at you.'],
    square:['Belvedere Square', 'The finest view in Corvanthe, they said. The paving has been scoured smooth as glass by the wind.'],
    statue:['The Lady of the Winds', 'A noblewoman with her veil streaming out behind her, carved in marble so fine the wind seems to move it. It does.'],
    tavern:['The Gilded Kite', 'A wine-house for the rich. Every bottle on the shelves has been uncorked, and every one is empty and singing faintly in the draught.'],
    chapel:['Chapel of the Open Sky', 'The roof was meant to open for the summer festivals. It is open now, for good, and the hymnals turn their own pages.'],
    landmarks:['tavern','chapel','tower'],
    tower:['The Observatory', 'The great brass telescope is aimed straight down, at the Wound.']},
  spirewatch: {el:'lightning', pal:'storm', seed:6201, fx:'rain', storm:true, haze:'40,50,90,0.14', glow:'170,190,255',
    line:['The Stormwall', 'A curtain of lightning stands across the street, fork after fork, never quite still. The cobbles under it have melted into glass.'],
    arch:['The Belfry Arch', 'Every bell in Spirewatch rang at the hour of the Unweaving. Under this arch you can still hear them, very faintly, still ringing.'],
    square:['Bell Square', 'Where the great bell fell. It is still here, cracked through, and it hums when lightning strikes nearby, which is always.'],
    statue:['The Bell-Warden', 'The watchmen who rang the alarm bells. His hand is still raised to the rope.'],
    tavern:['The Copper Rod', 'The watchmen\'s tavern. Every tankard has fused to the bar where lightning found it.'],
    chapel:['Chapel of the Tolling', 'Its spire took the first strike. The bell rope hangs in the nave, charred black and swaying.'],
    landmarks:['tavern','chapel','tower'],
    tower:['The Lightning Spire', 'The tallest tower in the city, crowned with copper. It has been struck so many times the stone glows blue at night.']},
  collegium: {el:'arcane', pal:'aether', seed:6301, fx:'motes', haze:'90,40,140,0.12', glow:'190,140,255',
    line:['The Unwritten Edge', 'Here the Collegium simply stops: the street, the air, the light, cut off as clean as a page torn from a book. This is where it began.'],
    arch:['The Scholars\' Gate', 'The gate of the old university. Its motto is carved over the arch, and the letters rearrange themselves while you read.'],
    square:['The Quadrangle', 'Where students crossed between lectures. Their footprints still glow faintly on the flags, all leading in toward the Wound.'],
    statue:['The First Archmage', 'The founder of the Collegium, book open in one hand. The page is the same spell as the one that undid the city.'],
    tavern:['The Inkwell', 'The students\' tavern. Papers cover every table, every one the same unfinished equation.'],
    chapel:['The Lecture Hall', 'A lecture was under way when it happened. The chalk is still writing on the board, by itself, the same line over and over.'],
    landmarks:['tower','tavern','chapel'],
    tower:['The Hall of Study', 'The college tower. Its orrery counts down to something, and the count is getting low.']},
  drowned_quarter: {el:'water', pal:'drowned', seed:6401, fx:'rain', flood:true, river:'N', haze:'20,60,80,0.16', glow:'110,200,230',
    line:['The Drowning Line', 'The harbour rose and never fell. Past here the streets are under black water, and lanterns still burn beneath it.'],
    arch:['The Harbour Arch', 'The gate to the old docks, half sunk. Something has scored the stone at the waterline, again and again, from the inside.'],
    square:['Fishmarket Square', 'The fishmongers\' slabs are still laid out. What is on them now came up out of the water by itself.'],
    statue:['The Harbour-Master', 'His bronze spyglass points out to sea. Barnacles have grown over it, though the sea is a mile away.'],
    tavern:['The Mermaid\'s Rest', 'Sailors\' tavern. The floor is a hand deep in water, and the tide in it comes and goes on the hour.'],
    chapel:['Chapel of the Drowned', 'Every pew is wet, as though the congregation has only just stood up and walked out of the sea.'],
    landmarks:['tavern','chapel','crane'],
    riverLore:['The Hollow', 'The river comes in under the harbour wall clean and green, and runs north toward the Wound. You do not want to see what comes out the other side.'],
    bridge:['Harbour Bridge', 'Barges once passed under it to the docks. The water underneath is deep and very still, and the reflection of the bridge has people on it.'],
    bridgeBroken:['Fallen Bridge', 'The current took the middle span. Something has tied the two ends together with weed and rope, but it would never take your weight.']},
  quarry_ward: {el:'earth', pal:'quarry', seed:6501, fx:'dust', haze:'120,90,50,0.13', glow:'230,190,120', rubble:true,
    line:['The Upheaval', 'The ground stood up here. Bedrock has broken through the streets in walls and spires, and it is still, slowly, rising.'],
    arch:['The Masons\' Gate', 'The guild of masons built it to last a thousand years. The ground has tilted it over like a doorstop.'],
    square:['Hewers\' Yard', 'Where the great blocks were dressed. Half-finished statues stand in rows, and none of them are where they were yesterday.'],
    statue:['The Unfinished Saint', 'The masons never finished her face. Since the Unweaving, she has been finishing it herself.'],
    tavern:['The Chisel and Pick', 'The quarrymen\'s tavern. Grit falls from the ceiling all the time, and nobody ever came to sweep it.'],
    chapel:['Chapel of the Bedrock', 'Built straight onto the stone. The stone has started growing up through the floor, in shapes like kneeling people.'],
    landmarks:['tavern','chapel','gallows']},
  frostmarket: {el:'ice', pal:'frost', seed:6601, fx:'snow', haze:'190,220,255,0.12', glow:'170,220,255',
    line:['The Rime Wall', 'The great market froze mid-trade. Past here the ice has grown into a wall of glassy spires, and the traders stand inside it, still haggling.'],
    arch:['The Market Gate', 'The tolls are still posted on the gate. Someone has scratched a new line at the bottom: "PRICE OF ENTRY: WARMTH."'],
    square:['The Great Market', 'A thousand stalls under a thousand awnings, every one rimed with frost. The apples are still red under the ice.'],
    statue:['The Alderman', 'The market\'s chief magistrate, with his chain of office and his scales. The scales are frozen tipping, and won\'t say which way.'],
    tavern:['The Hearthstone', 'The traders\' tavern. The fire in the hearth is frozen, every flame of it, in the shape of a fire.'],
    chapel:['Chapel of the Long Winter', 'The candles are frozen alight. You can see the flames, pale blue, perfectly still.'],
    landmarks:['tavern','chapel','wagon']},
  gloamside: {el:'dark', pal:'gloom', seed:6701, fx:'shade', haze:'30,10,50,0.22', glow:'170,90,230',
    line:['The Gloaming', 'The light gives out here. It doesn\'t fade; it stops, like a wall, and the dark beyond it is breathing.'],
    arch:['The Catacomb Gate', 'The old way down to the catacombs. Every name carved on it has been scratched out, and a new one carved in its place: yours.'],
    square:['Candle Square', 'Where the processions gathered. Thousands of candle stubs cover the flags, and every one of them is still warm.'],
    statue:['The Veiled Mother', 'The temple district\'s patron, hooded like the Watcher in Hollowmere. Her shadow falls the wrong way.'],
    tavern:['The Last Lamp', 'The only tavern in Gloamside, and the only lit window. Nobody has worked out who lights it.'],
    chapel:['The Mortuary Chapel', 'Where the dead were laid out for their families. The biers are empty. All of them.'],
    landmarks:['chapel','chapel2','tavern']},
};

module.exports = function sector(rects,id){
  const S=SECTORS[id];
  const m=new MapBuilder(rects,{id, name:'Corvanthe: '+RING_NAMES[id], cols:56, rows:44, seed:S.seed});
  const {W, H} = m;
  m.palette=S.pal; m.fx=S.fx; m.haze=S.haze; m.windowGlow=S.glow; if(S.storm) m.storm=1;
  m.lore={...OWN_LORE, line:S.line, arch:S.arch, square:S.square, statue:S.statue, tavern:S.tavern, chapel:S.chapel, chapel2:S.chapel, tower:S.tower,
    wall:['The City Wall', 'The outer wall of Corvanthe. From this side, every stone is scratched with tally marks, in groups of five.'],
    crane:['The Harbour Crane', 'Its hook hangs in the water of the street below, and the chain is taut. Something down there is holding on.'],
    gallows:['The Quarry Hoist', 'The great hoist that lifted blocks out of the pit. The rope is still running, slowly, up out of the ground.'],
    river:S.riverLore, bridge:S.bridge, bridgeBroken:S.bridgeBroken,
    wagon:['A Trader\'s Wagon', 'Frozen solid with its goods still on it: bolts of cloth, sacks of salt, a cage with a frozen songbird in it, mid-song.']};
  const sty=k=>rects[k+'_'+S.pal]?k+'_'+S.pal:k;
  const ruin=(x,y)=>Math.max(0,Math.min(1,(1-y/H)*1.15-0.12));
  const city=new City(m,{street:'R', square:'P', ruin, style:sty});
  const r=m.r, rnd=(a,b)=>a+r()*(b-a);

  // ── streets: Wallside along the wall, the line street under the north edge, an avenue between
  //    them wandering north, cross streets, lanes ──
  city.road([[0,39],[14,39+Math.round(rnd(-1,1))],[28,40],[42,39+Math.round(rnd(-1,1))],[55,39]],{w:2,bend:1,wander:0.8});
  city.road([[0,5],[18,6],[36,5],[55,6]],{w:2,bend:1,wander:0.6});
  const AX=Math.round(rnd(20,34));
  const avenue=[[AX,40]];
  for(const y of [32,24,15]) avenue.push([Math.round(rnd(16,38)),y]);
  avenue.push([Math.round(rnd(22,32)),5]);
  city.road(avenue,{w:2,bend:1,wander:1.2});
  const crossY=[Math.round(rnd(13,17)),Math.round(rnd(22,26)),Math.round(rnd(30,33))];
  for(const y of crossY){
    const pts=[[0,y]]; for(let x=10;x<55;x+=Math.round(rnd(9,14))) pts.push([x,y+Math.round(rnd(-2,2))]); pts.push([55,y+Math.round(rnd(-1,1))]);
    city.road(pts,{w:2});
  }
  // lanes between the cross streets
  const bands=[5,...crossY,39];
  for(let i=0;i<bands.length-1;i++){
    for(let n=0;n<3;n++){
      const x=Math.round(rnd(3,52)); if(Math.abs(x-AX)<5) continue;
      city.road([[x,bands[i]+1],[x+Math.round(rnd(-3,3)),bands[i+1]]],{w:1});
    }
  }
  // the square, where the avenue crosses the middle cross street
  const mid=avenue[2], SQ={x:mid[0]+1.5,y:crossY[1]+1};
  city.square(SQ.x,SQ.y,rnd(3.6,4.6),rnd(2.8,3.4));
  city.square(rnd(8,14),crossY[0]+1,2.4,1.8,'R');
  city.square(rnd(42,48),crossY[2]+1,2.4,1.8,'R');
  // the Hollow, where it runs through this sector
  const gaps=[];
  if(S.river){ const c0=AX<28?38:15; gaps.push(river(m,city,c0,c0+2,S.river).gap); }
  // the Drowned Quarter's flooded plots: still pools between the houses
  if(S.flood) for(let i=0;i<9;i++){
    const cx=Math.round(rnd(4,51)), cy=Math.round(rnd(8,36));
    if([...Array(4)].some((_,dy)=>[...Array(5)].some((_,dx)=>city.isStreet(cx+dx-1,cy+dy-1)))) continue;
    m.fill(cx,cy,cx+Math.round(rnd(1,3)),cy+Math.round(rnd(1,2)),'O');
  }

  // ── the square and its statue ──
  const SX=SQ.x*T, SY=SQ.y*T;
  city.reserve(SX-4.6*T,SX+4.6*T,SY-4*T,SY+3.4*T);
  const ctr=OWN[id]&&OWN[id].center;
  m.place(ctr||'statue',SX,SY+10,{lore:ctr&&OWN_LORE[ctr]?ctr:'statue'});
  for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) m.place('lamppost',SX+dx*180,SY+dy*110+40);
  m.place('gravel',SX-70,SY-80,{lore:'square'});
  // ── landmarks, each on the nearest street-facing spot to its corner of the map ──
  const spots=[[12,27],[42,20],[20,13],[44,33]];
  S.landmarks.forEach((k,i)=>{
    const [tx,ty]=spots[i];
    if(k==='tavern'||k==='chapel'||k==='chapel2'||k==='tower') city.landmark(sty(k==='chapel2'?'chapel':k),tx,ty,k);
    else city.landmark(k,tx,ty,k);
  });

  // ── the north edge: this sector's barrier, an arch through it to the inner rings ──
  const ARCH_X=avenue[avenue.length-1][0]*T+T;
  m.place('brokenArch',ARCH_X,4*T+20,{lore:'arch'});
  m.wallRun(4*T+20,0,W,[[ARCH_X-90,ARCH_X+90],...gaps],S.rubble?['blocks1','blocks2','rubble3','ruinWall1','rocks2','blocks1','rubble4']:
    ['rubble2','rubble3','ruinWall1','rubble4','blocks1','rubble1','ruinWall2','rubble9']);
  m.objs.filter(o=>o.y<5*T&&/^(rubble2|ruinWall1|blocks1)$/.test(o.kind)).forEach((o,i)=>{ if(i%3===0) o.lore='line'; });
  m.blocks.push({x:0,y:0,w:W,h:4*T+24});
  city.reserve(0,W,0,5*T);
  // ── the city wall to the south (no gate here: the way in is Cindergate's Wardgate) ──
  const WALL_Y=42*T+30;
  m.wallRun(WALL_Y,0,W,gaps,['wallLow1','ruinWall2','wallLow2','ruinWall1','wallLow1','wallLow2']);
  m.objs.filter(o=>o.y>42*T).forEach((o,i)=>{ if(i%5===2) o.lore='wall'; });
  m.blocks.push({x:0,y:42*T+40,w:W,h:2*T});
  city.reserve(0,W,41*T,H);

  placeOwnLand(m,city,id);
  city.build();
  placeOwnProps(m,city,id);
  // quarry rubble everywhere; lights along the north edge in the sector's colour
  if(S.rubble) for(let i=0;i<90;i++) m.tryPlace(P.pick(r,['blocks1','blocks2','rocks1','rocks2','rubble7','rubble9','gravel']),rnd(T,W-T),rnd(6*T,38*T),8);
  for(let x=80;x<W;x+=220+r()*120) m.glows.push({x, y:3*T+r()*T, r:200+r()*80, c:S.glow});
  m.glows.push({x:ARCH_X, y:3*T, r:300, c:S.glow});

  // ── Echoes: this sector's element, a few strays, harder toward the Wound ──
  const open=[];
  for(let y=6;y<38;y++) for(let x=1;x<m.cols-2;x++) if(city.isStreet(x,y)&&city.isStreet(x+1,y)) open.push([x,y]);
  let tries=0;
  while(m.echoes.length<17&&tries++<4000){
    const [tx,ty]=open[Math.floor(r()*open.length)], x=(tx+1)*T, y=ty*T+T/2+10;
    if(y>36*T&&(x<8*T||x>W-8*T)) continue;                                     // the way in from the ring stays quiet
    if(m.echoes.some(e=>Math.hypot(e.x-x,e.y-y)<7*T)) continue;
    const v=ruin(x,y), el=echoElement(id,x,W,r), w='echo_'+el+'_weak', st='echo_'+el+'_strong';
    const foes=v<0.3?(r()<0.5?[[w,0]]:[[w,0],[w,0]]):
               v<0.55?(r()<0.5?[[w,1],[w,1]]:[[st,0]]):
               v<0.8?[[st,1],[w,1]]:
               (r()<0.5?[[st,2],[w,2],[w,2]]:[[st,2],[st,2]]);
    m.echoes.push({id:id.slice(0,3)+m.echoes.length, el, foes, x:Math.round(x), y:Math.round(y), r:150});
  }

  // every piece with a recolour in the sector's palette uses it (yards, rubble, walls, lamps)
  for(const o of m.objs) if(!o.decal) o.kind=sty(o.kind);

  // ── round the ring ──
  ringExits(m,id);
  return m;
};

// The Hollow through the city: water from edge to edge in columns c0..c1, flowing `flow` ('N' / 'S'),
// and a bridge wherever a street meets both banks (broken ones nearer the Wound). Call it after the
// streets are painted and before landmarks and houses.
function river(m,city,c0,c1,flow){
  // a meander: the channel drifts up to 2 tiles either side of c0, at most one tile every few rows
  const w=c1-c0, off=[], ph=m.r()*6.28, ph2=m.r()*6.28;
  let o=0;
  for(let y=0;y<m.rows;y++){
    const want=Math.round(1.6*Math.sin(y/6.5+ph)+0.6*Math.sin(y/2.7+ph2));
    if(want>o&&(y%2===0)) o++; else if(want<o&&(y%2===0)) o--;
    off.push(Math.max(-2,Math.min(2,o)));
  }
  const L=y=>c0+off[y], R=y=>c0+off[y]+w;
  for(let y=0;y<m.rows;y++) m.fill(L(y),y,R(y),y,'W');
  m.flow=flow;
  // bridges: rows where a street meets both banks
  const rows=[];
  for(let y=6;y<m.rows-2;y++) if(city.isStreet(L(y)-1,y)&&city.isStreet(R(y)+1,y)) rows.push(y);
  const groups=[]; for(const y of rows){ const g=groups[groups.length-1]; if(g&&y-g[g.length-1]<=1) g.push(y); else groups.push([y]); }
  groups.forEach((g,i)=>{
    const a=Math.min(...g.map(L)), b=Math.max(...g.map(R));
    const cy=(g[0]+g[g.length-1]+1)/2*T, near=cy<15*T;
    const kind=near?(i%2?'bridgeTopWoodBroken':'bridgeTopStoneBroken'):(i%2?'bridgeTopWood':'bridgeTopStone');
    m.placeBridge(kind,a,b,cy,near?'bridgeBroken':'bridge');
    // the whole street's width is walkable over a sound bridge, not just the drawn deck
    if(!near) m.walk.push({x:a*T-8, y:g[0]*T-6, w:(b-a+1)*T+16, h:g.length*T+12});
  });
  for(let y=0;y<m.rows;y++) city.reserve(L(y)*T-30,(R(y)+1)*T+30,y*T,(y+1)*T);
  m.place('postRing',L(22)*T-14,22*T,{lore:'river'});
  const ends=[3,4,5,41,42,43];
  return {gap:[Math.min(...ends.map(L))*T-20,(Math.max(...ends.map(R))+1)*T+20], mid:y=>(L(y)+R(y)+1)/2*T};
}
// an Echo's element: its sector's, except near the Wallside ends, where some have wandered over
// from the neighbouring sector (so a stranger in the street always came from next door)
function echoElement(id,x,W,r){
  const i=RING.indexOf(id), west=RING[(i+RING.length-1)%RING.length], east=RING[(i+1)%RING.length];
  const elOf=k=>k==='cindergate'?'fire':SECTORS[k].el;
  if(x<10*T&&r()<0.45) return elOf(west);
  if(x>W-10*T&&r()<0.45) return elOf(east);
  return elOf(id);
}
// Wallside's two ends lead on to the neighbouring sectors (Cindergate uses this too)
function ringExits(m,id){
  const i=RING.indexOf(id), west=RING[(i+RING.length-1)%RING.length], east=RING[(i+1)%RING.length];
  m.spawns.west=[90,39.5*T+10]; m.spawns.east=[m.W-90,39.5*T+10];
  if(!m.spawns.start) m.spawns.start=m.spawns.west;
  m.exits.push({x:0,y:38*T,w:48,h:4*T,label:'Wallside to '+RING_NAMES[west],to:{map:west,spawn:'east'}});
  m.exits.push({x:m.W-48,y:38*T,w:48,h:4*T,label:'Wallside to '+RING_NAMES[east],to:{map:east,spawn:'west'}});
}
module.exports.river=river; module.exports.echoElement=echoElement; module.exports.SECTORS=SECTORS; module.exports.RING=RING; module.exports.ringExits=ringExits;
