// Cindergate, outer ring: Corvanthe's forge district, the Fire sector. You come in from the
// Corvanthe Road through the Wardgate (south). Winding streets run north toward the Wound;
// the nearer it, the more burnt-out the terraces. The Burning Line closes the north edge:
// past it the streets still burn (the inner rings, later).
'use strict';
const {MapBuilder, T, P} = require('./builder');
const {City} = require('./city');

const LORE = {
  gate:    ['The Wardgate', 'Cut open from the inside, not the outside. The gleaners only widened the hole.'],
  camp:    ['Gleaner Camp', 'A crew has made camp in the gate\'s shadow. The pot on the fire is still warm and nobody is here. Their tally board counts cinderglass by the hundredweight.'],
  burning: ['The Burning Line', 'Past here every street is burning, and has been since the Unweaving. The fire gives off no heat until you are standing in it.'],
  furnace: ['The Furnace Arch', 'The old gate to the inner forges. Beyond it the light is the colour of a furnace mouth, and something walks there, and walks back.'],
  smith:   ['The Smith-Father', 'Patron of Cindergate\'s forges. The bronze ran in the heat; his hammer has melted into his hand, the way the Echoes\' tools have.'],
  square:  ['Forge Square', 'Where the guild forges stood round a square of iron-grey flags. The flags are cracked in rings, as if something very hot had walked in circles here.'],
  tavern:  ['The Anvil and Ember', 'The forgers\' tavern. Tankards stand half-full on every table, the ale boiled away inside them.'],
  chapel:  ['Chapel of the Hearth', 'Every candle in the chapel is lit, and none of them burns down.'],
  lamppost:['Lantern', 'The glass is black with soot, but something inside is still burning.'],
};

module.exports = function cindergate(rects){
  const m=new MapBuilder(rects,{id:'cindergate', name:'Corvanthe: Cindergate', cols:56, rows:44, seed:5101});
  const {W, H} = m;
  m.lore=LORE; m.fx='embers'; m.haze='70,30,10,0.16';
  const burnt=k=>rects[k+'_burnt']?k+'_burnt':k;
  // how far gone: worse toward the Wound (north)
  const ruin=(x,y)=>Math.max(0,Math.min(1,(1-y/H)*1.15-0.12));
  const city=new City(m,{street:'c', square:'f', ruin, style:burnt});
  m.fill(0,0,m.cols-1,m.rows-1,'a');

  // ── streets: an old city's, grown rather than planned ──
  // the Forge Road, from the Wardgate up to the Furnace Arch, bending round Forge Square
  city.road([[27,41],[27,35],[30,28],[25,19],[28,11],[27,4]],{w:2,bend:1,wander:1.2});
  city.road([[0,39],[14,40],[27,39],[42,40],[55,39]],{w:2,bend:1,wander:0.8});      // Wallside, inside the wall
  city.road([[0,5],[18,6],[36,5],[55,6]],{w:2,bend:1,wander:0.6});                  // under the Burning Line
  city.road([[0,16],[10,14],[19,17],[26,15],[40,13],[55,15]],{w:2});                // Bellows Street
  city.road([[0,28],[12,26],[22,29],[30,27],[46,27],[55,24]],{w:2});                // Slag Street
  // lanes and alleys between them
  city.road([[8,6],[6,16],[9,27],[7,39]],{w:2});
  city.road([[17,16],[15,22],[18,28]],{w:1});
  city.road([[21,6],[22,11],[20,16]],{w:1});
  city.road([[41,6],[42,13]],{w:1});
  city.road([[38,15],[41,25],[39,39]],{w:2});
  city.road([[50,6],[48,15],[51,27],[49,39]],{w:1});
  city.road([[12,27],[20,34],[24,39]],{w:1});
  city.road([[33,28],[33,33],[36,39]],{w:1});
  city.road([[45,14],[46,20],[44,27]],{w:1});
  city.road([[2,21],[6,22]],{w:1,bend:0});
  // squares where the roads meet
  const SQ={x:31.5,y:27.5};
  city.square(SQ.x,SQ.y,4.4,3.3);                                              // Forge Square
  city.square(9.5,15.5,2.8,2.2,'c');                                           // Tinkers' Corner
  city.square(28.5,39.5,3.5,1.8,'c');                                          // inside the gate

  // ── landmarks, then the terraces round them ──
  const SX=SQ.x*T, SY=SQ.y*T;
  city.reserve(SX-5*T,SX+5*T,SY-4.5*T,SY+3.6*T);
  m.place('brokenStatue',SX,SY+20,{lore:'smith'});
  for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) m.place('lamppost',SX+dx*190,SY+dy*120+40);
  for(const [k,x,y,o] of [['blocks2',SX-150,SY-40],['logs',SX+150,SY-50],['barrelBroken',SX-170,SY+130],['planksPile',SX+170,SY+130],
    ['wheel3',SX+80,SY+100],['gravel',SX-70,SY-90,{lore:'square'}]]) m.place(k,x,y,o);
  city.landmark('tavern_burnt',20,38,'tavern');
  city.landmark('chapel_burnt',10,26,'chapel');

  // ── the Burning Line: the north edge, rubble and fire ──
  m.place('brokenArch',28*T,4*T+20,{lore:'furnace'});
  m.wallRun(4*T+20,0,W,[[28*T-90,28*T+90]],['rubble2','rubble3','ruinWall1','rubble4','blocks1','rubble1','ruinWall2','rubble9']);
  m.objs.filter(o=>/^(rubble2|ruinWall1)$/.test(o.kind)&&o.y<5*T).forEach((o,i)=>{ if(i%3===0) o.lore='burning'; });
  m.blocks.push({x:0,y:0,w:W,h:4*T+24});
  city.reserve(0,W,0,5*T);

  // ── the city wall, the Wardgate, the gleaners' camp ──
  const WALL_Y=42*T+30, GX=28*T;
  m.place('arch',GX,WALL_Y,{lore:'gate'});
  m.wallRun(WALL_Y,0,W,[[GX-60,GX+80]],['wallLow1','ruinWall2','wallLow2','ruinWall1','wallLow1','wallLow2']);
  m.blocks.push({x:0,y:42*T+40,w:W,h:2*T});
  city.reserve(0,W,41*T,H);
  const CX=30*T, CY=40*T+40;
  for(const [k,x,y,o] of [['wagon',CX+60,CY,{lore:'camp'}],['crate3',CX+170,CY-10],['crate5',CX+210,CY-6],['sacks',CX+150,CY+50],
    ['lamp4',CX-20,CY-20,{lore:'lamppost'}],['barrel2',CX+230,CY+40]]) m.place(k,x,y,o);
  m.glows.push({x:CX+110,y:CY+30,r:130,c:'255,170,80'});        // their fire

  city.build();

  // fire along the Burning Line, and smouldering ruins deeper in
  for(let x=80;x<W;x+=210+m.r()*120) m.glows.push({x, y:3*T+m.r()*T, r:200+m.r()*80, c:'255,110,30'});
  m.glows.push({x:28*T, y:3*T, r:300, c:'255,140,50'});
  for(const o of m.objs) if(/^(rubble|blocks|ruinWall)/.test(o.kind) && o.y>5*T && o.y<22*T && m.r()<0.35)
    m.glows.push({x:o.x, y:o.y-20, r:110+m.r()*60, c:'255,100,30'});

  // ── Echoes: Cindergate's forge-folk, weak and few by the gate, strong and many toward the Wound ──
  // a few strays from other sectors have drifted in
  const STRAYS=['earth','lightning','dark'];
  const open=[];
  for(let y=6;y<38;y++) for(let x=1;x<m.cols-2;x++) if(city.isStreet(x,y)&&city.isStreet(x+1,y)) open.push([x,y]);
  let tries=0;
  while(m.echoes.length<17&&tries++<4000){
    const [tx,ty]=open[Math.floor(m.r()*open.length)], x=(tx+1)*T, y=ty*T+T/2+10;
    if(Math.hypot(x-GX,y-40*T)<9*T) continue;                                   // a quiet street inside the gate
    if(m.echoes.some(e=>Math.hypot(e.x-x,e.y-y)<7*T)) continue;
    const v=ruin(x,y), el=m.r()<0.15?P.pick(m.r,STRAYS):'fire', w='echo_'+el+'_weak', st='echo_'+el+'_strong';
    const foes=v<0.3?(m.r()<0.5?[[w,0]]:[[w,0],[w,0]]):
               v<0.55?(m.r()<0.5?[[w,1],[w,1]]:[[st,0]]):
               v<0.8?[[st,1],[w,1]]:
               (m.r()<0.5?[[st,2],[w,2],[w,2]]:[[st,2],[st,2]]);
    m.echoes.push({id:'cg'+m.echoes.length, el, foes, x:Math.round(x), y:Math.round(y), r:150});
  }

  m.spawns={gate:[GX,40*T+20], start:[GX,40*T+20]};
  m.exits=[{x:GX-40,y:42*T+14,w:80,h:40,dir:'S',label:'The Corvanthe Road',to:{map:'corvanthe_road',spawn:'gate'}}];
  require('./sector').ringExits(m,'cindergate');   // Wallside, west and east, round the ring of sectors
  return m;
};
