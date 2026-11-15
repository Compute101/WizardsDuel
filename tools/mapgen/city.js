// An old city's streets for Corvanthe's sectors. Streets are painted as wandering roads between
// waypoints (each road gets random bends between them), squares as ragged blobs where roads
// meet, and whatever is left between them becomes irregular blocks. Houses then line every
// street edge they can fit on: fronts on a block's edge above a street (they face it), backs on
// its edge below one (roofs overhanging), gable ends beside north–south streets, clutter in the
// yards. `ruin(x,y)` (0..1, higher nearer the Wound) decides how far gone each house is.
'use strict';
const {T, P} = require('./builder');

// house sets by state: [standing, damaged, ruined]
const FRONTS = {0:['house1','house2','house4'], 1:['house3','house4','house5'], 2:['house5','house6','house6']};
const BACKS  = {0:['backTerra1','backTerra2','backSlate','backPurple'], 1:['backSlate','backPurple','backSlateRuin'], 2:['backSlateRuin','backPurpleRuin']};
const SIDES  = {0:['sideTerra','sideSlate','sidePurple'], 1:['sideSlate','sidePurple','sidePurpleRuin'], 2:['sidePurpleRuin']};
const YARD   = {0:['barrel','crate1','crate2','logs','fence','flowerbush','lowwall'],
                1:['crate3','barrel3','brokenFence','planks1','rubble6','logs','sacks'],
                2:['rubble1','rubble3','rubble5','rubble9','blocks1','crateBroken','barrelsBroken','rocks1','ruinWall1']};

class City {
  // opts: streets (ground kinds that count as street), ruin(x,y), style(kind) → the kind to draw
  constructor(m,{street='c', square='f', ruin=()=>0, style=k=>k}={}){
    this.m=m; this.street=street; this.squareKind=square; this.ruin=ruin; this.style=style;
    this.reserved=[];
  }
  isStreet(tx,ty){ const k=this.m.at(tx,ty); return k===this.street||k===this.squareKind; }
  // ── painting ──
  // a road through waypoints [[tx,ty],…] (tile coords of the brush's top-left), w tiles wide;
  // `bend` adds that many random kinks (up to ±wander tiles) between each pair of waypoints
  road(pts,{w=2,bend=2,wander=1.6}={}){
    const m=this.m, way=[pts[0]];
    for(let i=1;i<pts.length;i++){
      const [ax,ay]=pts[i-1], [bx,by]=pts[i], len=Math.hypot(bx-ax,by-ay)||1, nx=-(by-ay)/len, ny=(bx-ax)/len;
      for(let k=1;k<=bend;k++){ const f=k/(bend+1), o=(m.r()*2-1)*wander; way.push([ax+(bx-ax)*f+nx*o, ay+(by-ay)*f+ny*o]); }
      way.push(pts[i]);
    }
    for(let i=1;i<way.length;i++){
      const [ax,ay]=way[i-1], [bx,by]=way[i], n=Math.ceil(Math.hypot(bx-ax,by-ay)*3);
      for(let s=0;s<=n;s++){
        const x=Math.round(ax+(bx-ax)*s/n), y=Math.round(ay+(by-ay)*s/n);
        m.fill(x,y,x+w-1,y+w-1,this.street);
      }
    }
  }
  // a square: a ragged blob of radius rx × ry tiles round (cx, cy)
  square(cx,cy,rx,ry,kind){
    const m=this.m;
    for(let y=Math.floor(cy-ry-1);y<=cy+ry+1;y++) for(let x=Math.floor(cx-rx-1);x<=cx+rx+1;x++){
      const d=Math.hypot((x+0.5-cx)/rx,(y+0.5-cy)/ry);
      if(d<1-0.18*m.r()) m.fill(x,y,x,y,kind||this.squareKind);
    }
  }
  reserve(x0,x1,y0,y1){ this.reserved.push({x0,x1,y0,y1}); }

  // ── building ──
  state(x,y){ const v=this.ruin(x,y)+(this.m.r()-0.5)*0.35; return v<0.33?0:v<0.66?1:2; }
  // can this piece stand here? its footprint must be on block ground and clear of everything;
  // `clearBelow` (0..1) also keeps that share of its picture, from the base up, off the streets
  fits(kind,x,base,clearBelow=0){
    const m=this.m, s=m.size(kind);
    for(const b of P.footBoxes(m.rects,{kind,x,y:base})){
      if(b.x<4||b.x+b.w>m.W-4||b.y<4||b.y+b.h>m.H-4) return false;
      for(const c of m.boxes) if(P.overlap(b,c,6)) return false;
      for(const c of m.blocks) if(P.overlap(b,c)) return false;
      for(let px=b.x;px<=b.x+b.w;px+=Math.min(T/2,b.w)) for(const py of [b.y,b.y+b.h]){
        const tx=Math.floor(px/T), ty=Math.floor(py/T), k=m.at(tx,ty);
        if(this.isStreet(tx,ty)||k==='O'||k==='W') return false;
      }
    }
    const img={x0:x-s.w/2,x1:x+s.w/2,y0:base-s.h,y1:base};
    if(this.reserved.some(r=>img.x0<r.x1&&img.x1>r.x0&&img.y0<r.y1&&img.y1>r.y0)) return false;
    if(clearBelow) for(let py=base-s.h*clearBelow;py<base;py+=T/2) for(let px=img.x0+8;px<img.x1-8;px+=T/2)
      if(this.isStreet(Math.floor(px/T),Math.floor(py/T))) return false;
    return true;
  }
  put(kind,x,base,opts){ const k=this.style(kind); this.m.place(k,x,base,opts); return k; }
  // a landmark facing a street (front edge), placed on the best fit nearest (tx, ty)
  landmark(kind,tx,ty,lore){
    const m=this.m, s=m.size(kind); let best=null;
    for(let y=1;y<m.rows-1;y++) for(let x=1;x<m.cols-1;x++){
      if(this.isStreet(x,y)||!this.isStreet(x,y+1)) continue;
      for(const dx of [0,T/2]){
        const cx=x*T+dx, base=(y+1)*T-4, d=Math.hypot(cx/T-tx,y-ty);
        if(best&&d>=best.d) continue;
        if(this.fits(kind,cx,base,0.6)) best={cx,base,d};
      }
    }
    if(!best) throw new Error(m.id+': no room for '+kind);
    m.place(kind,best.cx,best.base,{lore});
    this.reserve(best.cx-s.w/2-12,best.cx+s.w/2+12,best.base-s.h,best.base+8);
    return best;
  }
  // terraces along every street edge, then gable ends and yards; `sets` swaps in other house sets
  // ({fronts, backs, sides, yard}, each keyed by state 0–2, like FRONTS) for a town that isn't ruined
  build({gap=0.07, yards=0.35, sets={}}={}){
    const m=this.m, pick=a=>P.pick(m.r,a);
    const FRONTS=sets.fronts||FRONTS_, BACKS=sets.backs||BACKS_, SIDES=sets.sides||SIDES_, YARD=sets.yard||YARD_;
    const edgeRows=(test,baseOf,set,clear)=>{
      for(let y=1;y<m.rows-1;y++){
        let x=0;
        while(x<m.W-40){
          const tx=Math.floor(x/T);
          if(!test(tx,y)){ x=(tx+1)*T; continue; }
          const base=baseOf(y), st=this.state(x,base), k=pick(set[st]), sk=this.style(k), s=m.size(sk);
          const cx=x+s.w/2;
          if(m.r()<gap+st*0.07){
            if(st===2&&m.r()<0.6) m.tryPlace(this.style(pick(YARD[2])),cx,base-6,4);
            x+=s.w*0.6; continue;
          }
          if(this.fits(sk,cx,base,clear)){ m.place(sk,cx,base); x+=s.w-10; }
          else x+=T/3;
        }
      }
    };
    // fronts: block ground with a street just below; backs: with a street just above
    edgeRows((tx,y)=>!this.isStreet(tx,y)&&this.isStreet(tx,y+1), y=>(y+1)*T-4, FRONTS, 0.55);
    edgeRows((tx,y)=>!this.isStreet(tx,y)&&this.isStreet(tx,y-1)&&!this.isStreet(tx,y+1), y=>y*T+84, BACKS, 0);
    // gable ends beside north–south streets
    for(let x=1;x<m.cols-1;x++){
      for(let y=2;y<m.rows-1;y++){
        if(this.isStreet(x,y)) continue;
        const westSt=this.isStreet(x-1,y), eastSt=this.isStreet(x+1,y);
        if(!westSt&&!eastSt) continue;
        const st=this.state(x*T,y*T), sk=this.style(pick(SIDES[st])), s=m.size(sk);
        const cx=westSt?x*T+s.w/2+2:(x+1)*T-s.w/2-2, base=(y+1)*T-6;
        if(m.r()<0.8&&this.fits(sk,cx,base,0.45)){ m.place(sk,cx,base); y+=1; }
      }
    }
    // yards
    const n=Math.round(m.cols*m.rows*yards);
    for(let i=0;i<n;i++){
      const x=T+m.r()*(m.W-2*T), y=T*2+m.r()*(m.H-3*T), tx=Math.floor(x/T), ty=Math.floor(y/T);
      if(this.isStreet(tx,ty)) continue;
      if(this.reserved.some(r=>x>r.x0&&x<r.x1&&y>r.y0&&y<r.y1)) continue;
      m.tryPlace(this.style(pick(YARD[this.state(x,y)])),x,y,10);
    }
  }
}
const FRONTS_=FRONTS, BACKS_=BACKS, SIDES_=SIDES, YARD_=YARD;
module.exports={City, FRONTS, BACKS, SIDES, YARD};
