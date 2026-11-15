// Each sector's own pieces (sheets 6–9: tileset6..9_source.png), so the sectors look like
// different places and not one city in eight colours.
//   land:   big buildings, set on street-facing plots before the terraces go up (City.landmark)
//   center: what stands in the square instead of the statue
//   props:  [kind, how many] scattered over yards and plots after the houses are built
//   float:  [kind, how many] the Heights' floating ruins: anywhere, streets too (only their shadow touches down)
//   decals: [kind, how many, where, block] flat ground art: on a 'street', open 'ground', 'early' (open ground claimed
//           before the houses go up) or the 'river' (moored along the west bank, walkable); `block` ones can't be crossed
'use strict';
const {T, P} = require('./builder');

const OWN = {
  cindergate: {land:['forge','forge'], props:[['anvil',4],['slag',5],['bellows',2],['swordRack',3]], decals:[['lavaCrack',6,'street']]},
  heights: {land:['townhouse','townhouse','gazebo','townhouse'], center:'weathervane',
    props:[['urn',6],['urnDead',4],['urnBroken',3],['bench',5],['weathervane',2]], float:[['floatRoom',3],['floatStairs',4],['floatRoof',4]]},
  spirewatch: {land:['bellTower','watchTower','watchTower'], center:'fallenBell',
    props:[['lightningRod',6],['bellFrames',3]], decals:[['glassPatch',8,'street']]},
  collegium: {land:['hall','portal','hall'], center:'orrery',
    props:[['bookshelves',7],['runeCircle',3],['scholarStatue',3]]},
  drowned_quarter: {land:['sunkHouse','sunkHouse','sunkHouse','sunkHouse'],
    props:[['boat',5],['nets',6],['figurehead',2],['moorings',4]], decals:[['jetty',2,'river']]},
  quarry_ward: {land:['tiltedHouse','quarryCrane','tiltedHouse','quarryCrane'],
    props:[['rockSpire1',4],['rockSpire2',4],['rockSpire3',3],['stoneYard',2],['mineCart',3]], decals:[['chasm',2,'early',true]]},
  frostmarket: {land:['frostStall','frostStall','frostStall'], center:'frozenFountain',
    props:[['iceSpire1',5],['iceSpire2',4],['iceSpire3',3],['iceCart',2],['iceWall',3],['snowdrift',5],['frostStall',3]]},
  gloamside: {land:['temple','mausoleum','catacomb','mausoleum'],
    props:[['graves',9],['candles',4],['hoodedShrine',2]]},
};

const OWN_LORE = {
  forge:['A Guild Forge', 'The furnace has not gone out since the Unweaving, and nobody feeds it. Something in there is still working the bellows.'],
  townhouse:['A Merchant Prince\'s House', 'The finest house on the hill. The windows are lit, the table is laid for twelve, and the wind has blown every chair to face the Wound.'],
  gazebo:['The Summer Gazebo', 'Half its dome blew away. The musicians\' stands are still set out, the sheet music pinned down by stones.'],
  weathervane:['The Great Weathervane', 'The golden cockerel turns and turns. It points at the Wound every time it passes.'],
  floatRoom:['A Drifting Parlour', 'Somebody\'s drawing room, hanging in the air with the chandelier still lit. The carpet is still on the floor; the floor is not on anything.'],
  bellTower:['The Great Belfry', 'Its bell is the only one in Spirewatch still hanging. It rings by itself when lightning strikes, so it never stops.'],
  watchTower:['A Storm-Watch Tower', 'The watchmen lit their beacon to warn the city. The smoke is still rising from it, the same smoke, years later.'],
  fallenBell:['The Fallen Bell', 'The great bell of Bell Square, cracked through. Lay your hand on it and you can feel it ringing.'],
  hall:['A Lecture Hall', 'The students were taking their examinations. The papers are still on the desks, every one answered in the same handwriting.'],
  portal:['The Unwritten Door', 'An archway onto purple light. The far side of it is the Collegium too, a few seconds earlier.'],
  orrery:['The Great Orrery', 'The college\'s model of the heavens, bent and frozen mid-turn. One of its brass planets is not in our sky.'],
  sunkHouse:['A Sunken House', 'Flooded to the sills, and the lamps still lit inside. Shapes move past the windows, under the water.'],
  tiltedHouse:['A Heaved House', 'The ground stood up under it and tipped it on its side. Its hearth is still burning, at an angle.'],
  quarryCrane:['The Quarry Crane', 'A stone block hangs from it, turning slowly. It was being lowered when the Unweaving came, and it has not finished.'],
  temple:['The Temple of the Veiled Mother', 'The great temple of Gloamside. The rose window is lit from within, by no light anybody can find.'],
  mausoleum:['A Family Mausoleum', 'The iron doors are locked from the inside.'],
  catacomb:['The Catacomb Stair', 'Down into the dark under Gloamside. Torches are lit all the way down, as far as you can see, and further.'],
  frostStall:['A Market Stall', 'Frozen mid-sale: a hand of ice still reaching for a coin on the counter.'],
  frozenFountain:['The Frozen Fountain', 'The fountain froze in the moment the Unweaving struck. You can see the shape of the coin someone was throwing in, caught in the spray.'],
};

function spread(m,city,test,tries,fn){ for(let i=0;i<tries;i++){ const x=T+m.r()*(m.W-2*T), y=6*T+m.r()*(m.H-12*T); if(test(x,y)) fn(x,y); } }

// before the terraces: the big buildings
function placeOwnLand(m,city,id){
  const O=OWN[id]; if(!O) return;
  const spots=[[30,11],[8,19],[48,12],[18,34],[40,30],[6,34],[50,36],[34,20]];
  for(const d of O.decals||[]) if(d[2]==='early') placeDecal(m,city,d,true);
  (O.land||[]).forEach((k,i)=>{
    const [tx,ty]=spots[(i+3)%spots.length];
    try{ city.landmark(k,tx,ty,OWN_LORE[k]?k:undefined); }catch(e){ /* no room: skip it */ }
  });
}
// after the terraces: props, floating ruins, ground art
function placeOwnProps(m,city,id){
  const O=OWN[id]; if(!O) return;
  for(const [k,n] of O.props||[]){
    let left=n; spread(m,city,()=>left>0,n*80,(x,y)=>{ if(m.tryPlace(k,x,y,12)){ left--; const o=m.objs[m.objs.length-1]; if(OWN_LORE[k]) o.lore=k; } });
  }
  for(const [k,n] of O.float||[]){
    let left=n; spread(m,city,()=>left>0,n*60,(x,y)=>{
      const s=m.size(k);
      if(m.objs.some(o=>Math.abs(o.x-x)<s.w*0.8&&Math.abs(o.y-y)<50)) return;
      const o=m.place(k,x,y); if(OWN_LORE[k]) o.lore=k; left--;
    });
  }
  for(const d of O.decals||[]) if(d[2]!=='early') placeDecal(m,city,d,false);
}
function placeDecal(m,city,[k,n,where,block],early){
  const s=m.size(k);
  if(where==='river'){                       // moored along the river's west bank, walkable
    let c0=-1; for(let x=0;x<m.cols;x++) if(m.at(x,20)==='W'){ c0=x; break; }
    if(c0<0) return;
    let placed=0;
    for(let y=10*T;y<36*T&&placed<n;y+=2*T){
      const top=y-s.h, clear=[...Array(Math.ceil(s.h/T)+1)].every((_,i)=>!m.objs.some(o=>o.decal&&o!==null&&Math.abs(o.y-s.h/2-(top+i*T))<T&&Math.abs(o.x-(c0*T+s.w/2))<s.w));
      if(!clear) continue;
      const x=c0*T+s.w/2-6;
      m.place(k,x,y,{decal:1});
      m.walk.push({x:x-s.w*0.28,y:top+8,w:s.w*0.56,h:s.h-16});
      placed++; y+=6*T;
    }
    return;
  }
  let left=n;
  spread(m,city,()=>left>0,n*200,(x,y)=>{
    const x0=x-s.w/2, x1=x+s.w/2, y0=y-s.h;
    const ok=(px,py)=>{ const tx=Math.floor(px/T), ty=Math.floor(py/T); return where==='street'?city.isStreet(tx,ty):['G','d'].includes(m.at(tx,ty)); };
    for(const [px,py] of [[x0,y0],[x1,y0],[x0,y],[x1,y],[x,y-s.h/2],[x0,y-s.h/2],[x1,y-s.h/2]]) if(!ok(px,py)) return;
    const box={x:x0,y:y0,w:s.w,h:s.h};
    if(m.boxes.some(b=>P.overlap(b,box,8))) return;
    if(city.reserved.some(r=>x0<r.x1&&x1>r.x0&&y0<r.y1&&y>r.y0)) return;
    if(m.objs.some(o=>o.decal&&Math.abs(o.x-x)<s.w&&Math.abs(o.y-y)<s.h)) return;
    m.place(k,x,y,{decal:1});
    if(block) m.blocks.push({x:x0+s.w*0.18,y:y0+s.h*0.25,w:s.w*0.64,h:s.h*0.5});
    if(early) city.reserve(x0-20,x1+20,y0-20,y+20);
    left--;
  });
}
module.exports={OWN, OWN_LORE, placeOwnLand, placeOwnProps};
