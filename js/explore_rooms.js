// ═══════════════════════════════════════════════════════════════════
//  EXPLORE ROOMS — house interiors. Every enterable house on a map has a
//  room, built here from a seed when you walk in (nothing is stored but
//  what you changed: rooms[id] in the save). A room has a type (its
//  furniture), a style (floor and walls), may be ruined, and holds one
//  encounter rolled from the sector and how near the Wound it is:
//  nothing, treasure, spill, Echoes, a rival gleaner party (sometimes led
//  by a wizard), or wounded gleaners who won't fight. A lore book may lie
//  about anywhere. Some rooms are fixed: the safe house, the inn, the
//  library, the homes of named Echoes.
//  build(spec, rects) → a map object js/explore.js loads like any other,
//  plus `ev` (the encounter) and `npcs`. Pieces come from sheets 10–13.
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';
const P = window.ExplorePieces;
const {T} = P;
const RS = 0.5;                       // interior prop scale (the sheets' floor tile is ~124 px → 62)
// Small things are drawn as big as furniture on their sheets (a letter ~180 px, nearly a floor tile),
// so they get their own scale, judged against the 124 px floor tile and a bed about two tiles long.
const ITEM_SCALE = {
  letter:0.2, scroll:0.2, scrollPinned:0.2, journal:0.2, bookOpen:0.2, bookClosed:0.2, key:0.18,
  potionRed:0.2, potionBlue:0.2, potionGreen:0.2, pouch:0.2, coinsS:0.22, coinsM:0.22,
  coinsL:0.25, coinSack:0.25, ironBox:0.26, chest:0.3, chestOpen:0.3,
  q_fire:0.3, q_water:0.3, q_ice:0.3, q_lightning:0.3, q_earth:0.3, q_air:0.3, q_arcane:0.3, q_dark:0.3,
  crockery:0.26, bookPile:0.3, cauldron:0.38, lectern:0.4, alembic:0.36, herbs:0.4, washtub:0.4,
};
const scaleOf = k => ITEM_SCALE[k] || RS;

// furniture by room type: back = against the back wall, floor = about the room
const TYPES = {
  cottage:  {name:'A Cottage',      floor:'w', wall:'plaster', back:[['cupboard','wardrobe'],['hearthPot']], floor_:[['bed','cot'],['roundTable'],['rug'],['rockingChair','cradle']]},
  workshop: {name:'A Workshop',     floor:'l', wall:'stone',   back:[['workbench'],['cupboard']], floor_:[['pantry'],['spinningWheel','washtub'],['cot']]},
  alchemist:{name:'An Alchemist\'s',floor:'l', wall:'stone',   back:[['jarShelf'],['herbs']], floor_:[['alembic'],['cauldron'],['bookPile']]},
  rich:     {name:'A Fine House',   floor:'y', wall:'panel',   back:[['wardrobe'],['bookcase'],['readingDesk']], floor_:[['bed'],['rug'],['diningTable']]},
  shop:     {name:'A Shop',         floor:'y', wall:'panel',   back:[['jarShelf'],['crystalDisplay']], floor_:[['counter'],['pantry']]},
  tavern:   {name:'A Tavern',       floor:'w', wall:'plaster', back:[['pantry'],['cupboard'],['hearthPot']], floor_:[['diningTable'],['roundTable'],['roundTable']]},
  chapel:   {name:'A Chapel',       floor:'l', wall:'stone',   back:[['altar']], floor_:[['pew'],['pew2'],['pew'],['pew2']], rows:true},
  study:    {name:'A Study',        floor:'w', wall:'panel',   back:[['bookcase2'],['bookLadder']], floor_:[['lectern'],['readingDesk'],['bookPile']]},
  forge:    {name:'A Forge',        floor:'l', wall:'stone',   back:[['hearthPot'],['workbench']], floor_:[['pantry'],['washtub']]},
  crypt:    {name:'A Crypt',        floor:'l', wall:'stone',   back:[['altar']], floor_:[['pew'],['bookPile']]},
  // fixed rooms
  safehouse:{name:'The Gleaners\' Rest', floor:'w', wall:'stone', back:[['safeHearth'],['weaponRack'],['barricade']], floor_:[['safeTable'],['bedrolls'],['bedrolls']], big:true},
  inn:      {name:'The Drowned Crow',   floor:'w', wall:'plaster', back:[['hearthPot'],['cupboard'],['pantry']], floor_:[['diningTable'],['roundTable'],['bed']], big:true},
  library:  {name:'The Collegium Library', floor:'y', wall:'panel', back:[['bookcase2'],['bookLadder'],['bookcase2'],['bookcase']], floor_:[['lectern'],['readingDesk'],['bookPile'],['bookPile'],['rug']], big:true},
  wenna:    {name:'Wenna\'s Bakehouse', floor:'l', wall:'plaster', back:[['hearthPot'],['cupboard']], floor_:[['diningTable'],['pantry']]},
  lamplighter:{name:'The Lamplighter\'s House', floor:'w', wall:'stone', back:[['bookcase'],['cupboard']], floor_:[['roundTable'],['rockingChair'],['bookPile']]},
};
const BROKEN = {bed:'brokenBed', cot:'brokenBed', diningTable:'brokenTable', roundTable:'brokenTable', rockingChair:'brokenChair', cradle:'brokenChair', spinningWheel:'brokenChair'};
const WALLS = {plaster:['wallPlaster','wallPlasterWin'], stone:['wallStone','wallStoneWin'], panel:['wallPanel','wallPanel']};
const SIDES = {plaster:'sidePlaster', stone:'sideStone', panel:'sidePlaster'};
const FRONTS = {plaster:'frontPlaster', stone:'frontStone', panel:'frontPlaster2'};

// ── lore books: short stories found in rooms. lib:true ones only in the Collegium library ──
const BOOKS = [
  {id:'b1', title:'A Baker\'s Ledger', text:'Forty loaves to the Collegium, as every Thursday. The porter says the scholars have not slept in three days and the great hall hums at night. Paid in full, and a tip. Strange times.'},
  {id:'b2', title:'A Child\'s Slate', text:'Chalked in a child\'s hand: "Mama says the sky went white and then everyone stood still. I am not allowed to go out. The man in our kitchen is made of fire but he is very polite."'},
  {id:'b3', title:'Gleaner\'s Notebook', text:'Rule one: Echoes go back to where they stood. Learn where they stood and you learn where they will be. Rule two: never take spill from a house with a lit window. Rule three: I have forgotten rule three, which is how Harl died.'},
  {id:'b4', title:'Letter, Never Sent', text:'Dearest Ilse. The Wardens have sealed the gates and say it is for our own good. The river runs warm. If you are reading this, do not come for me. Go south, past Hollowmere. Go anywhere.'},
  {id:'b5', title:'Sermon Notes', text:'"Magic is a thread, and the world is cloth." Underlined twice. Beneath, in a shakier hand: "And what happens to the cloth when you pull the thread all the way out?"'},
  {id:'b6', title:'A Watchman\'s Log', text:'Fourth bell: lights over the Collegium, violet. Fifth bell: the river ran backwards for the space of a breath. Sixth bell: I rang every bell in the tower and no one came out. Seventh bell'},
  {id:'b7', title:'Recipe for Ember Bread', text:'Flour, salt, water, a pinch of cinderglass ground very fine. Bake on a hot stone. Do not eat more than one slice. The baker who wrote this underlined the last line several times.'},
  {id:'b8', title:'On the Echoes, by a Gleaner Captain', text:'They are not ghosts. Ghosts want things. An Echo is a moment that will not end, walking. Break it and it walks back from the Wound, a day later, a little more worn. I have killed the same flower-seller eleven times. I no longer sleep well.'},
  {id:'b9', title:'A Merchant\'s Accounts', text:'Bought: 200 weight of tideglass at 3 crowns. Sold to the Wardens at 40. Bought: one bodyguard. Sold: nothing; he left with the tideglass. Note to self: hire the honest-looking ones.'},
  {id:'b10', title:'Torn Page', text:'"…and so the Archmage stood at the centre of the Great Weave and said the Unweaving Word, believing it would undo only the curse upon the city. The word did not know where to stop."'},
  {id:'b11', title:'A Love Letter', text:'Meet me by the frozen fountain at the market. I will be the one holding two apples. You will be the one late, as always. — R. (She waited. She is waiting still, in Frostmarket, under the ice.)'},
  {id:'b12', title:'Hollowmere Parish Record', text:'Births: none this year. Deaths: none this year. Departures: two hundred and six. Arrivals: one, a gleaner who asked where the inn was and left before dawn without paying.'},
  {id:'b13', title:'A Child\'s Primer', text:'F is for Fire, which keeps us warm. W is for Water, which puts out Fire. The opposites hold the world together, as a cloth is held by warp and weft. (Someone has drawn a very good dragon in the margin.)'},
  {id:'b14', title:'Gleaner Tally', text:'Cindergate 14. Frostmarket 9. Spirewatch 3 (bad). Gloamside 0, and we do not go to Gloamside, and that is the end of that, Pell.'},
  {id:'L1', lib:true, title:'The Eight-Fold Weave', text:'Eight strands make the Weave: Fire and Water, Air and Earth, Lightning and Ice, the Arcane and the Dark. Each strand is braided with its opposite; pull one and its partner tightens. A wise wizard strikes a ward with its opposite.'},
  {id:'L2', lib:true, title:'Minutes of the Last Council', text:'Motion: that the Unweaving Word be spoken only once, at the hour of lowest tide, in the Wound beneath the Collegium. Carried, seven to one. Dissent recorded: Magister Orrin, who said only, "You do not know what it will unweave." Meeting closed.'},
  {id:'L3', lib:true, title:'Arcana: The Twelve Glyphs', text:'Every working is written in the twelve glyphs. ϟ for the bolt, Δ for rising, ∇ for descent, Ψ for the fork, Ω for endings, ∞ for the eternal, ☽ the moon, ✸ the burst, ⊕ binding, ⊗ impact, θ the hidden, Φ the axis. Learn them by heart, students; you will not have time to look.'},
  {id:'L4', lib:true, title:'On Quintessence', text:'When a working is unmade, its substance does not vanish; it settles, as frost settles from cold air. The settled stuff, which the vulgar call "spill", is pure element. It will make any spell stronger, and any fool richer, and many fools dead.'},
  {id:'L5', lib:true, title:'The Wound: A Survey', text:'The surveyors who went to the Wound returned with notebooks full of measurements in a handwriting none of them recognised. The figures, when checked, were correct. The surveyors were not.'},
  {id:'L6', lib:true, title:'Catalogue Card', text:'"Hollowmere and its River: a History." Shelved: Aisle 9. Status: Missing. Borrower: Magister Orrin. Due back: the day after the Unweaving.'},
];

const NAMES = ['Bram','Tessa','Old Hob','Wil','Mags','Corran','Ysolde','Pip','Garreth','Nell','Fenwick','Dara'];
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

// which room a house holds
function typeFor(spec,r){
  if(spec.fixed) return spec.fixed;
  const b=spec.base;
  if(b==='tavern') return 'tavern';
  if(b==='chapel'||b==='temple') return 'chapel';
  if(b==='hall'||b==='tower') return 'study';
  if(b==='forge') return 'forge';
  if(b==='townhouse') return 'rich';
  if(b==='mausoleum') return 'crypt';
  const q=r();
  return q<0.5?'cottage':q<0.68?'workshop':q<0.8?'rich':q<0.9?'shop':'alchemist';
}

// the encounter: weights by how near the Wound (depth 0..1); outside the city nothing hostile
function rollEvent(spec,r){
  if(spec.fixed) return {type:spec.fixed};
  const d=spec.depth, W=spec.city?{empty:26,treasure:14,spill:14,echoes:16+d*12,party:9+d*9,wounded:8}:{empty:7,treasure:3};
  let tot=0; for(const k in W) tot+=W[k];
  let q=r()*tot, type='empty'; for(const k in W){ if((q-=W[k])<0){ type=k; break; } }
  const lv=d<0.3?0:d<0.55?1:d<0.8?2:3;
  if(type==='treasure') return {type, gold:Math.round((4+r()*10)*(1+d*2.5)), potion:r()<0.25+d*0.3, chest:r()<0.6};
  if(type==='spill') return {type, el:spec.el, n:1+Math.floor(r()*(2+d*3))};
  if(type==='echoes'){
    const w='echo_'+spec.el+'_weak', st='echo_'+spec.el+'_strong';
    const foes=lv===0?[[w,0]]:lv===1?(r()<0.5?[[w,1],[w,1]]:[[st,0]]):lv===2?[[st,1],[w,1]]:[[st,2],[w,2]];
    return {type, el:spec.el, foes};
  }
  if(type==='party'){
    const foes=lv===0?[['soldier',0],['archer',0]]:lv===1?(r()<0.5?[['soldier',1],['archer',1]]:[['soldier',1],['soldier',0],['archer',0]]):
               lv===2?[['soldier',2],['archer',2]]:[['soldier',3],['archer',2]];
    const wizChance=[0,0.2,0.4,0.6][lv];
    const wizard=spec.wizards&&spec.wizards.length&&r()<wizChance?spec.wizards[Math.floor(r()*spec.wizards.length)]:null;
    if(wizard&&foes.length>2) foes.pop();
    return {type, foes, wizard, gold:Math.round(8+d*30+r()*8)};
  }
  if(type==='wounded'){
    const n=NAMES[Math.floor(r()*NAMES.length)];
    return {type, name:n, key:r()<0.55?'soldier':'archer', mode:r()<0.5?'join':'rescue'};
  }
  return {type:'empty'};
}

function build(spec,rects){
  const r=P.rng(hash(spec.id));
  const type=typeFor(spec,r), D=TYPES[type];
  const ruined=!D.big&&!['wenna','lamplighter'].includes(type)&&(spec.ruined||spec.depth>0.6&&r()<0.6);
  const C=D.big?13:9+Math.floor(r()*3), R=D.big?8:6+Math.floor(r()*2);
  const cols=C+2, rows=R+4, W=cols*T, H=rows*T;
  const floor=ruined&&D.floor==='w'?'b':D.floor;
  const ground=[]; for(let y=0;y<rows;y++){ let row=''; for(let x=0;x<cols;x++) row+=(x>=1&&x<=C&&y>=2&&y<2+R)?floor:'v'; ground.push(row); }
  const objects=[], boxes=[], lore={}, ev=rollEvent(spec,r);
  const sz=k=>{ const q=rects[k]; return {w:q[2]*scaleOf(k), h:q[3]*scaleOf(k)}; };
  const put=(k,x,y,extra)=>{ if(!rects[k]) return null; const e=Object.assign({scale:scaleOf(k)},extra||{}); objects.push([k,Math.round(x),Math.round(y),e]);
    const o={kind:k,x,y,scale:scaleOf(k)}; for(const b of P.footBoxes(rects,o)) boxes.push(b); return o; };
  const X0=T, X1=(C+1)*T, Y0=2*T, Y1=(2+R)*T, DX=W/2;
  // back wall
  const walls=WALLS[D.wall]; let wx=X0-8, i=0;
  const rubbleAt=ruined&&r()<0.5?Math.floor(r()*Math.max(1,Math.floor(C*T/72)-3)):-1;
  const hearthAt=D.wall==='plaster'&&!ruined&&type!=='chapel'&&r()<0.3?1+Math.floor(r()*2):-1;
  while(wx<X1-10){
    let k=i%3===1?walls[1]:walls[0];
    if(ruined&&r()<0.3) k='wallCracked';
    if(i===rubbleAt){ k='wallRubble'; }
    if(i===hearthAt) k='wallHearth';
    const s=sz(k);
    objects.push([k,Math.round(wx+s.w/2),Y0+6,{scale:RS}]);
    wx+=s.w-4; i++;
  }
  // side and front walls
  for(let y=Y0+T;y<=Y1;y+=T){ const k=SIDES[D.wall]; objects.push([k,X0-6,y,{scale:RS}]); objects.push([k,X1+6,y,{scale:RS}]); }
  const fk=FRONTS[D.wall], fw=sz(fk).w;
  for(let x=X0-8;x<X1;x+=fw-4){ if(x+fw>DX-T&&x<DX+T) continue; objects.push([fk,Math.round(x+fw/2),Y1+24,{scale:RS}]); }
  const blocks=[{x:0,y:0,w:W,h:Y0+14},{x:0,y:0,w:X0-4,h:H},{x:X1+4,y:0,w:W,h:H},
    {x:0,y:Y1+4,w:DX-T,h:H},{x:DX+T,y:Y1+4,w:W,h:H}];
  // furniture
  const pick=a=>a[Math.floor(r()*a.length)];
  let bx=X0+20;
  for(const choices of D.back){
    const k=pick(choices), s=sz(k);
    if(bx+s.w>X1-10) break;
    const x=bx+s.w/2+r()*20; if(Math.abs(x-DX)<s.w/2+10&&D.back.length<3){ bx+=s.w+20; }
    put(k,x,Y0+34); bx=x+s.w/2+14+r()*30;
  }
  const free=(x,y,w,h,m)=>{
    if(x-w/2<X0+6||x+w/2>X1-6||y-h<Y0+20||y>Y1-6) return false;
    if(Math.abs(x-DX)<T*0.9&&y>Y0+(Y1-Y0)*0.45) return false;          // the way in stays clear
    const fb={x:x-w*0.45,y:y-Math.min(h,30),w:w*0.9,h:Math.min(h,30)};
    return !boxes.some(b=>P.overlap(b,fb,m));
  };
  const spot=(w,h,m,tries)=>{ for(let t=0;t<(tries||80);t++){ const x=X0+w/2+r()*(C*T-w), y=Y0+h*0.6+40+r()*(R*T-60-h*0.6); if(free(x,y,w,h,m)) return [x,y]; } return null; };
  if(D.rows){                                       // chapel pews in two columns of rows
    for(let y=Y0+2.4*T;y<Y1-T*0.6;y+=T*1.15){ put(pick(['pew','pew2']),DX-T*2.1,y); put(pick(['pew','pew2']),DX+T*2.1,y); }
  } else {
    for(const choices of D.floor_){
      let k=pick(choices); if(ruined&&BROKEN[k]&&r()<0.7) k=BROKEN[k];
      const s=sz(k), p=spot(s.w,s.h,12);
      if(p){ if(k==='rug') objects.push([k,Math.round(p[0]),Math.round(p[1]),{scale:RS,decal:1}]); else put(k,p[0],p[1]); }
    }
  }
  if(ruined) for(let n=0;n<2;n++){ const p=spot(60,30,6); if(p) put('crockery',p[0],p[1]); }
  // the encounter's pieces
  const centre=[DX,Y0+(Y1-Y0)*0.55];
  const npcs=[], echoes=[];
  if(ev.type==='treasure'){
    const p=spot(80,60,10)||centre;
    put(ev.chest?'chest':(ev.gold>20?'coinsL':'coinsM'),p[0],p[1],{lore:'ev'});
    lore.ev=[ev.chest?'A Chest':'Coins','Somebody\'s savings, left behind when they ran.'];
  } else if(ev.type==='spill'){
    const p=spot(50,60,10)||centre;
    put('q_'+ev.el,p[0],p[1],{lore:'ev'});
    lore.ev=['Quintessence','Raw '+ev.el+', grown out of the floor like a crystal where something was unmade.'];
  } else if(ev.type==='echoes'){
    echoes.push({id:'in', el:ev.el, foes:ev.foes, x:centre[0], y:Y0+(Y1-Y0)*0.4, r:50});
  } else if(ev.type==='party'){
    npcs.push({role:'party', x:centre[0], y:Y0+(Y1-Y0)*0.4});
  } else if(ev.type==='wounded'){
    const p=spot(70,80,24)||centre;
    npcs.push({role:'wounded', x:p[0], y:p[1]}); boxes.push({x:p[0]-20,y:p[1]-60,w:40,h:60});
  } else if(type==='wenna'||type==='lamplighter'){
    const p=spot(70,80,24)||centre;
    npcs.push({role:type, x:p[0], y:p[1]}); boxes.push({x:p[0]-20,y:p[1]-60,w:40,h:60});
  } else if(type==='safehouse'||type==='inn'){
    lore.rest=[type==='inn'?'The Fire':'The Keeper\'s Hearth', type==='inn'?'A good fire and a bed upstairs. The landlady asks no questions.':'Old Marda keeps the Rest for any gleaner who keeps the peace inside it. "No blades drawn under my roof, and no spill sold either. Sit. Eat."'];
    const k=objects.find(o=>o[0]==='safeHearth'||o[0]==='hearthPot'); if(k) k[3].lore='rest';
  }
  // lore books
  const books=[];
  const nBooks=type==='library'?6:type==='study'?2:(r()<0.38?1:0);
  const pool=BOOKS.filter(b=>type==='library'?b.lib:!b.lib);
  for(let n=0;n<nBooks;n++){
    const b=pool[(hash(spec.id+':'+n)+n*7)%pool.length]; if(books.includes(b.id)) continue;
    const k=pick(['bookOpen','bookClosed','scroll','letter','journal']), p=spot(50,40,8);
    if(!p) continue;
    put(k,p[0],p[1],{lore:'book:'+b.id}); books.push(b.id);
    lore['book:'+b.id]=[b.title,b.text];
  }
  if(type==='shop'){ const c=objects.find(o=>o[0]==='counter'); if(c){ c[3].lore='shop'; lore.shop=['An Honesty Box','The shopkeeper fled, but the box on the counter still reads "PAY WHAT IS FAIR". A few potions are left on the shelf.']; } }
  const name=ruined?D.name.replace(/^An? /,'A Ruined ').replace('A Ruined Alchemist','A Ruined Alchemist'):D.name;
  return {id:spec.id, name:(spec.label||name), cols, rows, seed:hash(spec.id)&0xffff, ground, objects, lore, blocks, glows:[], echoes, walk:[],
    spawns:{door:[DX,Y1-12]}, exits:[{x:DX-T,y:Y1+8,w:2*T,h:T*0.8,dir:'S',label:'Outside',to:'out'}],
    interior:true, type, ev, npcs, flow:'S'};
}

window.ExploreRooms={build, BOOKS, TYPES, RS, ITEM_SCALE, hash};
})();
