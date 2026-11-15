// The Corvanthe Road: from Hollowmere's east gate to the walls of Corvanthe. The old road
// runs east, then north to the Wardgate, barred since the Unweaving. Beyond the wall, the
// backs of the city's outermost houses; a gleaner camp sits abandoned by the track.
'use strict';
const {MapBuilder, T, P} = require('./builder');

const LORE = {
  gate:   ['The Wardgate of Corvanthe', 'Barred from the outside, under a city watch seal gone green with age. Bruise-coloured light flickers along the top of the wall, and the air tastes of copper. Not yet.'],
  camp:   ['Gleaner Camp', 'Bedrolls, a cold firepit, crates stencilled with a crowned skull. Whoever camped here went over the wall and left their supper on the coals.'],
  sign:   ['Waymarker', '"CORVANTHE, 2 MILES." Someone has scratched out the 2 and carved NEVER.'],
  debris: ['Blast Debris', 'Stones from inside the city, thrown clean over the wall. Each one is glassy on the side that faced the Wound.'],
  lamp4:  ['Gleaners\' Lantern', 'Still lit. Gleaners leave their lanterns burning so the Echoes go for the light and not for them.'],
};

module.exports = function corvantheRoad(rects){
  const m=new MapBuilder(rects,{id:'corvanthe_road', name:'The Corvanthe Road', cols:44, rows:26, seed:2207});
  const {W, H} = m;
  m.lore=LORE;
  const GATE_X=34*T, WALL_Y=5*T+40;

  // ── ground: the old road, mossy since the city fell ──
  m.fill(0,18,34,19,'M');                     // east from Hollowmere
  m.fill(33,6,34,19,'M');                     // north to the gate
  m.fill(35,12,40,12,'D');                    // a track to the gleaner camp
  m.wornPatches(18);
  m.fill(14,0,43,4,'M');                      // inside the wall: the city's streets

  // ── the walls of Corvanthe, and what shows over them ──
  // beyond the wall we see the backs of the city's outer houses (their fronts face in)
  const skyline=['backSlateRuin','backPurpleRuin','sidePurpleRuin','backPurple','ruinWall1','backSlateRuin','sidePurple','ruinWall2','backPurpleRuin'];
  for(let x=15*T, i=0; x<W-40; i++){
    const k=skyline[i%skyline.length], s=m.size(k);
    if(Math.abs(x+s.w/2-GATE_X)>70) m.place(k,x+s.w/2,WALL_Y-26-Math.round(m.r()*24));
    x+=s.w*0.85+m.r()*30;
  }
  // and a second, further row deeper in, over the rooftops
  const far=['house6_char','house5_dusk','backPurpleRuin','house3_char','sidePurpleRuin','house4_dusk','backSlateRuin','house6_dusk'];
  for(let x=14*T+60, i=0; x<W-60; i++){
    const k=far[i%far.length], s=m.size(k);
    m.place(k,x+s.w/2,WALL_Y-150-Math.round(m.r()*30)); x+=s.w*0.9+m.r()*60;
  }
  m.place('arch',GATE_X,WALL_Y,{lore:'gate'});
  m.wallRun(WALL_Y,14*T,W-30,[[GATE_X-50,GATE_X+50]],
    ['wallLow1','ruinWall2','wallLow2','ruinWall1','wallLow1','rubble2','wallLow2']);
  m.blocks.push({x:0,y:0,w:W,h:WALL_Y+2});      // nobody goes over the wall. Yet.
  // the Unweaving's light, flickering over the city at night
  for(const x of [18*T,26*T,GATE_X,40*T]) m.glows.push({x, y:WALL_Y-140, r:300, c:'170,110,255'});
  m.glows.push({x:GATE_X, y:WALL_Y-40, r:160, c:'200,150,255'});

  // debris thrown out by the blast
  for(const [k,x,y,o] of [['blocks2',29*T,7*T+20,{lore:'debris'}],['blocks1',37*T,7*T],['rubble7',24*T,7*T+40],['rubble9',41*T,8*T],
    ['rubble10',31*T,9*T],['gravel',36*T,9*T+20],['rocks3',22*T,9*T],['rubble8',27*T,10*T+20]]) m.place(k,x,y,o);

  // ── the gleaner camp ──
  const CX=38*T, CY=11*T;
  for(const [k,x,y,o] of [['wagon',CX+40,CY+10,{lore:'camp'}],['cart',CX+170,CY+100],['crate3',CX-60,CY],['crate5',CX-20,CY+4],
    ['sacks',CX+130,CY+10],['barrel2',CX+190,CY+20],['crateBroken',CX-40,CY+130],['planksPile',CX+60,CY+140],
    ['lamp4',CX-90,CY+70,{lore:'lamp4'}],['bannerTorn',CX+230,CY+70],['chainFence1',CX+120,CY+175]]) m.place(k,x,y,o);

  // the waymarker by the road from Hollowmere
  m.place('post',3*T,18*T-6,{lore:'sign'});
  m.place('lamp3',12*T,18*T-4);

  // ── woods and scrub, dying toward the city ──
  m.edgeWoods(700,T*2.4,(x,y)=>(x>W*0.5||y<H*0.45)&&m.r()<.75?'deadtree':'tree');
  m.scatter(260,[['bush',3],['stump',3],['rocks1',2],['stone',2],['deadtree',3],['tree',2],['rocks2',1]],
    (k,x,y)=>y<H*0.5&&k==='bush'?'rocks1':k);

  // ── arrivals and ways out ──
  m.spawns={west:[100,19*T+10], gate:[GATE_X,WALL_Y+120]};
  m.exits=[{x:0,y:18*T,w:48,h:2*T,label:'Hollowmere',to:{map:'hollowmere',spawn:'east'}}];
  return m;
};
