// City blocks for Corvanthe's sectors: a street grid whose blocks are filled with terraces.
// A block's south edge faces the street below it, so those houses show their fronts; its north
// edge faces the street above, so those show their backs; gable ends stand at the block's
// corners on the cross-streets; the middle is yards. `ruin(x,y)` (0..1, higher nearer the
// Wound) decides how far gone each house is.
'use strict';
const {T, P} = require('./builder');

// house sets by state: [standing, damaged, ruined]
const FRONTS = {
  0:['house1','house2','house4'], 1:['house3','house4','house5'], 2:['house5','house6','house6'],
};
const BACKS  = {0:['backTerra1','backTerra2','backSlate','backPurple'], 1:['backSlate','backPurple','backSlateRuin'], 2:['backSlateRuin','backPurpleRuin']};
const SIDES  = {0:['sideTerra','sideSlate','sidePurple'], 1:['sideSlate','sidePurple','sidePurpleRuin'], 2:['sidePurpleRuin']};
const YARD   = {0:['barrel','crate1','crate2','logs','fence','flowerbush','lowwall'],
                1:['crate3','barrel3','brokenFence','planks1','rubble6','logs','sacks'],
                2:['rubble1','rubble3','rubble5','rubble9','blocks1','crateBroken','barrelsBroken','rocks1','ruinWall1']};

function stateOf(m,ruin,x,y){
  const v=ruin(x,y)+(m.r()-0.5)*0.35;
  return v<0.33?0:v<0.66?1:2;
}
// style: (kind) => recoloured kind (e.g. k => k+'_burnt'), or null for the plain one
// opts: ruin(x,y) 0..1; style(kind) → the kind to draw (a recolour) ; reserved: [{x0,x1,y0,y1}]
// rects no house may cover (landmarks)
function fillBlock(m,{x0,y0,x1,y1},opts){
  const {ruin,style=(k=>k),gaps=0.08,reserved=[]}=opts;
  const W=x1-x0, H=y1-y0;
  const pick=a=>P.pick(m.r,a);
  const free=(ax,bx,ay,by)=>!reserved.some(r=>ax<r.x1&&bx>r.x0&&ay<r.y1&&by>r.y0);
  const put=(kind,x,y)=>{
    const k=style(kind), s=m.size(k);
    if(!free(x-s.w/2,x+s.w/2,y-s.h,y)) return false;
    m.place(k,x,y); return true;
  };
  const row=(set,baseY)=>{
    let x=x0+6;
    while(x<x1-60){
      const st=stateOf(m,ruin,x,baseY), k=pick(set[st]), s=m.size(k);
      if(x+s.w>x1-4) break;
      if(m.r()<gaps+st*0.06){                       // a gap: an alley or a gutted plot
        if(st===2&&m.r()<0.7) m.tryPlace(style(pick(YARD[2])),x+40,baseY-6,4);
        x+=60+m.r()*40; continue;
      }
      if(put(k,x+s.w/2,baseY)) x+=s.w-8; else x+=40;
    }
  };
  row(FRONTS,y1-4);                                 // fronts face the street below
  row(BACKS,y0+84);                                 // backs face the street above; roofs overhang it
  // gable ends at the block's corners, between the rows, when there's room
  if(H>=6.5*T){
    const my=y0+H*0.61;
    for(const sx of [x0+50,x1-50]) if(m.r()<0.75){ const st=stateOf(m,ruin,sx,my); put(pick(SIDES[st]),sx,my); }
  }
  // yards in between
  const lo=y0+130, hi=y1-175;
  if(hi>lo){
    const n=Math.round(W*(hi-lo)/(T*T)/3);
    for(let i=0;i<n;i++){
      const x=x0+60+m.r()*(W-120), y=lo+m.r()*(hi-lo), st=stateOf(m,ruin,x,y);
      if(free(x-30,x+30,y-40,y)) m.tryPlace(style(pick(YARD[st])),x,y,10);
    }
  }
}
module.exports={fillBlock, FRONTS, BACKS, SIDES, YARD};
