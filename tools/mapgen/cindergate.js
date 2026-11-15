// Cindergate, outer ring: Corvanthe's forge district, the Fire sector. You come in from the
// Corvanthe Road through the Wardgate (south). The street grid runs north toward the Wound;
// the nearer it, the more burnt-out the terraces. The Burning Line closes the north edge:
// past it the streets still burn (the inner rings, later).
'use strict';
const {MapBuilder, T, P} = require('./builder');
const {fillBlock} = require('./city');

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
  // how far gone: worse toward the Wound (north), a little worse near the avenue's fires
  const ruin=(x,y)=>Math.max(0,Math.min(1,(1-y/H)*1.15-0.12));

  // ── street grid ──
  const HS=[[4,5],[12,13],[21,22],[30,31],[38,41]];           // east–west streets (tile rows)
  const VS=[[5,6],[16,17],[27,28],[38,39],[49,50]];            // north–south streets (tile cols); 27–28 the avenue
  m.fill(0,0,m.cols-1,m.rows-1,'a');
  for(const [a,b] of HS) m.fill(0,a,m.cols-1,b,'c');
  for(const [a,b] of VS) m.fill(a,4,b,41,'c');
  const SQ={c0:29,c1:37,r0:23,r1:29};                          // Forge Square
  m.fill(SQ.c0,SQ.r0,SQ.c1,SQ.r1,'f');

  // ── landmarks first, so the terraces leave room ──
  const reserved=[];
  const land=(kind,x,y,lore)=>{ const o=m.place(kind,x,y,{lore}); const s=m.size(kind); reserved.push({x0:x-s.w/2-10,x1:x+s.w/2+10,y0:y-s.h,y1:y+4}); return o; };
  land('tavern_burnt',22*T,38*T-4,'tavern');                   // facing the gate street
  land('chapel_burnt',11*T,30*T-4,'chapel');
  // Forge Square
  const SX=(SQ.c0+SQ.c1+1)/2*T, SY=(SQ.r0+SQ.r1+1)/2*T;
  reserved.push({x0:SQ.c0*T,x1:(SQ.c1+1)*T,y0:SQ.r0*T-40,y1:(SQ.r1+1)*T});
  m.place('brokenStatue',SX,SY+10,{lore:'smith'});
  for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) m.place('lamppost',SX+dx*230,SY+dy*170+40);
  for(const [k,x,y,o] of [['blocks2',SX-170,SY-60],['logs',SX+170,SY-70],['barrelBroken',SX-200,SY+150],['planksPile',SX+200,SY+150],
    ['wheel3',SX+90,SY+120],['gravel',SX-80,SY-110,{lore:'square'}]]) m.place(k,x,y,o);

  // ── the terraces ──
  const xs=[[0,VS[0][0]*T]]; for(let i=0;i<VS.length-1;i++) xs.push([(VS[i][1]+1)*T,VS[i+1][0]*T]); xs.push([(VS[VS.length-1][1]+1)*T,W]);
  for(let j=0;j<HS.length-1;j++){
    const y0=(HS[j][1]+1)*T, y1=HS[j+1][0]*T;
    for(const [x0,x1] of xs) fillBlock(m,{x0,y0,x1,y1},{ruin,style:burnt,reserved});
  }

  // ── the Burning Line: the north edge, rubble and fire ──
  m.place('brokenArch',28*T,4*T+20,{lore:'furnace'});
  m.wallRun(4*T+20,0,W,[[28*T-90,28*T+90]],['rubble2','rubble3','ruinWall1','rubble4','blocks1','rubble1','ruinWall2','rubble9']);
  m.objs.filter(o=>/^(rubble2|ruinWall1)$/.test(o.kind)&&o.y<5*T).forEach((o,i)=>{ if(i%3===0) o.lore='burning'; });
  m.blocks.push({x:0,y:0,w:W,h:4*T+24});
  for(let x=80;x<W;x+=210+m.r()*120) m.glows.push({x, y:3*T+m.r()*T, r:200+m.r()*80, c:'255,110,30'});
  m.glows.push({x:28*T, y:3*T, r:300, c:'255,140,50'});
  // smouldering ruins deeper in
  for(const o of m.objs) if(/^(rubble|blocks|ruinWall)/.test(o.kind) && o.y<22*T && m.r()<0.35)
    m.glows.push({x:o.x, y:o.y-20, r:110+m.r()*60, c:'255,100,30'});

  // ── the city wall, the Wardgate, the gleaners' camp ──
  const WALL_Y=42*T+30, GX=28*T;
  m.place('arch',GX,WALL_Y,{lore:'gate'});
  m.wallRun(WALL_Y,0,W,[[GX-60,GX+80]],['wallLow1','ruinWall2','wallLow2','ruinWall1','wallLow1','wallLow2']);
  m.blocks.push({x:0,y:42*T+40,w:W,h:2*T});
  const CX=31*T, CY=40*T+20;
  for(const [k,x,y,o] of [['wagon',CX+60,CY,{lore:'camp'}],['crate3',CX+170,CY-10],['crate5',CX+210,CY-6],['sacks',CX+280,CY],
    ['lamp4',CX-30,CY-30,{lore:'lamppost'}],['bannerTorn',CX+340,CY-20],['barrel2',CX+150,CY+60],['planksPile',CX+240,CY+64]]) m.place(k,x,y,o);
  m.glows.push({x:CX+110,y:CY+40,r:130,c:'255,170,80'});        // their fire
  for(const x of [10*T,18*T,40*T,47*T]) m.place('lamp3',x,38*T-6);

  m.spawns={gate:[GX,40*T+40], start:[GX,40*T+40]};
  m.exits=[{x:GX-40,y:42*T+14,w:80,h:40,dir:'S',label:'The Corvanthe Road',to:{map:'corvanthe_road',spawn:'gate'}}];
  return m;
};
