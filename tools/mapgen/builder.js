// Map builder shared by the map generators (tools/mapgen/*.js, run by tools/build_maps.js).
// A generator fills a ground grid and places pieces; toJSON() gives the map file
// that js/explore.js loads (format in the comment on toJSON).
'use strict';
const P = require('../../js/explore_pieces.js');
const {T} = P;
const GRASSY=['G','d','a','e','S','L','J'];   // ground scatter may stand on: grass, worn grass, ash, ash dirt, snow, Elfhome's floor and grass

class MapBuilder {
  constructor(rects, {id, name, cols, rows, seed}){
    this.rects=rects; this.id=id; this.name=name; this.cols=cols; this.rows=rows; this.seed=seed;
    this.W=cols*T; this.H=rows*T;
    this.r=P.rng(seed);
    this.k=[]; for(let y=0;y<rows;y++) this.k.push(new Array(cols).fill('G'));
    this.objs=[]; this.boxes=[];
    this.lore={}; this.spawns={}; this.exits=[]; this.blocks=[]; this.glows=[]; this.echoes=[]; this.walk=[];
  }
  // ── ground kinds: G grass, d worn grass, D dirt lane, R road, M mossy road, P plaza flags,
  //    W river water, O pond water, K plank docks; Elfhome: L forest floor, J flowered grass, Y mossy flagstone path; burnt (Cindergate): a ash, e ash dirt,
  //    c ash cobble street, f ash flagstones; inner districts: S snow, F flooded street (walkable), X the Wound's edge ──
  fill(x0,y0,x1,y1,c){ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(this.k[y]&&this.k[y][x]!==undefined) this.k[y][x]=c; }
  at(x,y){ return (this.k[y]||[])[x]; }
  tileAt(px,py){ return this.at(Math.floor(px/T),Math.floor(py/T)); }
  wornPatches(n){ for(let i=0;i<n;i++){ const x=Math.floor(this.r()*this.cols), y=Math.floor(this.r()*this.rows); if(this.k[y][x]==='G') this.k[y][x]='d'; } }

  size(kind,sc){ return P.sizeOf(this.rects,kind,sc); }
  // place a piece; opts: lore (a key into this.lore), scale, decal
  place(kind,x,y,opts){
    if(!this.rects[kind]) throw new Error(this.id+': no piece '+kind);
    const o=Object.assign({kind,x,y},opts||{});
    this.objs.push(o);
    if(!o.decal) for(const b of P.footBoxes(this.rects,o)) this.boxes.push(b);
    return o;
  }
  // place only if it clears everything already down and stays on grass
  tryPlace(kind,x,y,margin=6){
    const o={kind,x,y};
    for(const b of P.footBoxes(this.rects,o)){
      if(b.x<4||b.y<4||b.x+b.w>this.W-4||b.y+b.h>this.H-4) return false;
      for(const c of this.boxes) if(P.overlap(b,c,margin)) return false;
      for(const [px,py] of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]]){ const t=this.tileAt(px,py); if(t&&!GRASSY.includes(t)) return false; }
    }
    for(const b of this.blocks) if(P.overlap({x:x-2,y:y-2,w:4,h:4},b)) return false;
    // a house's image must not swallow anything already placed
    if(/^(house|back|side)/.test(kind)){ const s=this.size(kind); for(const c of this.boxes) if(P.overlap({x:x-s.w/2,y:y-s.h,w:s.w,h:s.h},c,-4)) return false; }
    this.place(kind,x,y); return true;
  }
  // a bridge from above, across water columns c0..c1, its deck centred on world y cy
  placeBridge(kind,c0,c1,cy,lore){
    const span=(c1-c0+1)*T+112, sc=span/this.rects[kind][2], s=this.size(kind,sc), B=P.BRIDGE[kind];
    const top=cy-s.h*(B.band[0]+B.band[1])/2;
    return this.place(kind,(c0+c1+1)/2*T,top+s.h,{scale:sc,decal:true,lore});
  }
  // woods round the edges; kindAt(x,y) picks the tree
  edgeWoods(tries,depth,kindAt){
    for(let i=0;i<tries;i++){
      const side=Math.floor(this.r()*4), d=this.r()*depth;
      const x=side===0?d:side===1?this.W-d:this.r()*this.W, y=side===2?T*1.4+d:side===3?this.H-d:this.r()*this.H;
      this.tryPlace(kindAt(x,y),x,y,2);
    }
  }
  // weighted scatter over the grass; table = [[kind,weight],…]; swap(kind,x,y) may change the pick
  scatter(n,table,swap){
    const tot=table.reduce((a,s)=>a+s[1],0);
    for(let i=0;i<n;i++){
      let q=this.r()*tot, k=table[0][0]; for(const [nm,w] of table){ if((q-=w)<0){ k=nm; break; } }
      const x=T+this.r()*(this.W-2*T), y=T*2+this.r()*(this.H-3*T);
      if(swap) k=swap(k,x,y);
      this.tryPlace(k,x,y,18);
    }
  }
  // a run of broken wall pieces along world y wy from x0 to x1; gaps [[a,b],…] stay open
  // (a piece doesn't start within 110 px before a, and the run resumes at b)
  wallRun(wy,x0,x1,gaps,bits){
    let x=x0;
    while(x<x1){
      const g=gaps.find(([a,b])=>x>a-110&&x<b); if(g){ x=g[1]; continue; }
      const k=P.pick(this.r,bits), s=this.size(k);
      if(this.r()<.18){ x+=s.w*0.8; continue; }
      this.place(k,x+s.w/2,wy+Math.round(this.r()*6)); x+=s.w-6;
    }
  }

  /* Map file format (maps/<id>.json):
     { id, name, cols, rows, seed,
       ground: [rows of ground-kind letters, one string per row],
       objects: [[kind, x, y, {lore, scale, decal}?], …]   x = centre, y = base, world px
       lore:   { key: [title, text] }                     what ✋ Inspect shows
       spawns: { name: [x, y] }                            where you arrive
       exits:  [{x, y, w, h, label, to:{map, spawn} | 'world'}]   walk in to leave
       blocks: [{x, y, w, h}]                              invisible walls
       glows:  [{x, y, r, c}]                              extra night lights, c = 'r,g,b'
       walk:   [{x, y, w, h}]                              water you can stand on (a city bridge's full street width)
       flow:   'S'                                         which way the river's current runs
       fx:     'embers'                                    drifting particles, day and night
       haze:   'r,g,b,a'                                   a colour wash over the whole map
       palette: 'frost'   a sector atlas (sprites/ruins/sector_<palette>): ground tiles take _<palette>
       windowGlow: 'r,g,b'  lit windows of palette houses glow this colour; storm: 1 = lightning flashes
       echoes: [{id, el, foes:[[fighter key, level],…], x, y, r}]   Echo groups: roam within r of
               (x, y); walking into one starts a battle (js/explore.js, game.js startExploreBattle)
       npcs:   [{role, x, y}]   people standing about; what they say is js/explore_folk.js
       safe:   1 = a safe town: rooms hold no fights or loot (Wrenford)
       noStroll: 1 = no strolling peasants in a safe town (Elfhome)
       arena:  the battle backdrop for fights here ('library'; default the ruined streets)
       city:   1 = a Corvanthe district not in CITY_MAPS (the inner districts): its rooms hold the city's encounters
       depth:  [lo, hi] how near the Wound the map's south and north edges are, for rooms' encounters (default [0, 1])
       music:  a theme that loops while you're on the map or in its rooms ('audio/wrenford_theme.mp3')
       greet:  what the townsfolk strolling a safe town's streets say as you pass (else a few generic lines)
       stroll: {maxX, n}: townsfolk stroll this map though it isn't safe, on streets west of maxX (Hollowmere's west bank) } */
  toJSON(){
    const round=v=>Math.round(v*10)/10;
    return {
      id:this.id, name:this.name, cols:this.cols, rows:this.rows, seed:this.seed, flow:this.flow||'S', fx:this.fx||null, haze:this.haze||null, palette:this.palette||null, windowGlow:this.windowGlow||null, storm:this.storm||0,
      ground:this.k.map(r=>r.join('')),
      objects:this.objs.map(o=>{
        const e={}; if(o.lore) e.lore=o.lore; if(o.scale) e.scale=round(o.scale*1000)/1000; if(o.decal) e.decal=1;
        return Object.keys(e).length?[o.kind,round(o.x),round(o.y),e]:[o.kind,round(o.x),round(o.y)];
      }),
      lore:this.lore, spawns:this.spawns, exits:this.exits, blocks:this.blocks, glows:this.glows, echoes:this.echoes, walk:this.walk,
      ...(this.npcs?{npcs:this.npcs.map(n=>Object.assign({},n,{x:round(n.x),y:round(n.y)}))}:{}), ...(this.safe?{safe:1}:{}), ...(this.noStroll?{noStroll:1}:{}), ...(this.stroll?{stroll:this.stroll}:{}), ...(this.arena?{arena:this.arena}:{}), ...(this.music?{music:this.music}:{}), ...(this.greet?{greet:this.greet}:{}), ...(this.city?{city:1}:{}), ...(this.depth?{depth:this.depth}:{}),
    };
  }
}
module.exports={MapBuilder, T, P};
