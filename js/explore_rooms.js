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
const RS = 0.5;                       // interior walls (the sheets' floor tile is ~124 px → 62)
// Furniture is drawn smaller than the walls: at RS a wardrobe stood twice the wizard's height (WIZ_H 62)
// and a bed was three wizards long. At FS a wardrobe is about 1.3× the wizard and a bed about one tall.
const FS = 0.32;
// Small things are drawn as big as furniture on their sheets (a letter ~180 px, nearly a floor tile),
// so they get their own scale, judged against the 124 px floor tile and a bed about two tiles long.
const ITEM_SCALE = {
  letter:0.2, scroll:0.2, scrollPinned:0.2, journal:0.2, bookOpen:0.2, bookClosed:0.2, key:0.18,
  potionRed:0.2, potionBlue:0.2, potionGreen:0.2, pouch:0.2, coinsS:0.22, coinsM:0.22,
  coinsL:0.25, coinSack:0.25, ironBox:0.26, chest:0.3, chestOpen:0.3,
  q_fire:0.3, q_water:0.3, q_ice:0.3, q_lightning:0.3, q_earth:0.3, q_air:0.3, q_arcane:0.3, q_dark:0.3,
  crockery:0.2, bookPile:0.22, cauldron:0.26, lectern:0.27, alembic:0.25, herbs:0.27, washtub:0.27,
  // the Undercroft (sheet 24, already shrunk to sheets 10–13's scale by the cutter)
  sewerCrates:0.36, crystalChest:0.3, sewerCandles:0.24, ratRun:0.2, ratSit:0.2, drainGrate:0.34, ritualCircle:0.72,
};
// flat things laid on the floor (drawn under everything, never in the way)
const DECALS = new Set(['rug','ritualCircle','drainGrate','ratRun','ratSit']);
// wall pieces drawn at their own scale rather than RS: the sewer's ladder and side wall are drawn
// taller than its brick walls on the sheet
const WALL_SCALE = {sewerLadder:0.6, sewerSide:0.31};
const scaleOf = k => ITEM_SCALE[k] || FS;

// furniture by room type: back = against the back wall, floor = about the room
const TYPES = {
  cottage:  {name:'A Cottage',      floor:'w', wall:'plaster', back:[['cupboard','wardrobe'],['hearthPot']], floor_:[['bed','cot'],['roundTable'],['rug'],['rockingChair','cradle']]},
  workshop: {name:'A Workshop',     floor:'l', wall:'stone',   back:[['workbench'],['cupboard']], floor_:[['pantry'],['spinningWheel','washtub'],['cot']]},
  alchemist:{name:'An Alchemist\'s',floor:'l', wall:'stone',   back:[['jarShelf'],['herbs']], floor_:[['alembic'],['cauldron'],['bookPile']]},
  rich:     {name:'A Fine House',   floor:'y', wall:'panel',   back:[['wardrobe'],['bookcase'],['readingDesk']], floor_:[['bed'],['rug'],['diningTable']]},
  shop:     {name:'A Shop',         floor:'y', wall:'panel',   back:[['jarShelf'],['crystalDisplay']], floor_:[['counter'],['pantry']]},
  tavern:   {name:'A Tavern',       floor:'w', wall:'plaster', back:[['pantry'],['cupboard'],['hearthPot']], floor_:[['diningTable'],['roundTable'],['roundTable']]},
  chapel:   {name:'A Chapel',       floor:'l', wall:'stone',   back:[['altar']], floor_:[['pew'],['pew2'],['pew'],['pew2']], rows:true, open:true},
  study:    {name:'A Study',        floor:'w', wall:'panel',   back:[['bookcase2'],['bookLadder']], floor_:[['lectern'],['readingDesk'],['bookPile'],['bookcase']], more:[['bookcase'],['bookPile'],['readingDesk']]},
  forge:    {name:'A Forge',        floor:'l', wall:'stone',   back:[['hearthPot'],['workbench']], floor_:[['pantry'],['washtub']]},
  crypt:    {name:'A Crypt',        floor:'l', wall:'stone',   back:[['altar']], floor_:[['pew'],['bookPile']], open:true},
  // fixed rooms
  safehouse:{name:'The Gleaners\' Rest', floor:'w', wall:'stone', back:[['safeHearth'],['weaponRack'],['barricade']], floor_:[['safeTable'],['bedrolls'],['bedrolls']], big:true},
  inn:      {name:'The Drowned Crow',   floor:'w', wall:'plaster', back:[['hearthPot'],['cupboard'],['pantry']], floor_:[['diningTable'],['roundTable'],['bed']], big:true},
  library:  {name:'The Collegium Library', floor:'y', wall:'panel', back:[['bookcase2'],['bookLadder'],['bookcase2'],['bookcase']], floor_:[['lectern'],['readingDesk'],['bookPile'],['rug']], big:true, size:[15,10], shelves:true, open:true},
  wenna:    {name:'Wenna\'s Bakehouse', floor:'l', wall:'plaster', back:[['hearthPot'],['cupboard']], floor_:[['diningTable'],['pantry']]},
  // Wrenford (a safe town)
  wrenInn:  {name:'The Wren\'s Nest',     floor:'w', wall:'plaster', back:[['hearthPot'],['cupboard'],['wineRack']], floor_:[['diningTable'],['roundTable'],['bed'],['rug']], big:true, npcs:['landlady','squop']},
  remnant:  {name:'The Remnant Library', floor:'y', wall:'panel', back:[['bookcase2'],['bookLadder'],['bookcase2'],['bookcase']], floor_:[['lectern'],['readingDesk'],['bookPile'],['rug']], big:true, size:[15,10], shelves:true, open:true},
  // the University Year (js/explore_year.js): the lecture theatre and examination hall; the Undercroft
  // a real lecture theatre (theatre: tiers of benches looking down on a stage; the stage is at the front,
  // the south, so the seated students face it as their sprites do): built by `theatre` below
  lectures: {name:'The Examination Schools', floor:'w', wall:'panel', back:[], floor_:[], theatre:true, open:true, big:true, size:[17,10], npcs:[]},
  // under the Covered Market, a sewer culvert (sheet 24: brick floor, a channel down the left wall)
  undercroft:{name:'The Undercroft', floor:'u', wall:'sewer', channel:true, back:[['sewerCrates'],['barricade'],['sewerCrates']], floor_:[['ritualCircle'],['crystalChest'],['sewerCrates'],['sewerCandles'],['drainGrate'],['sewerCandles'],['ratRun'],['ratSit']], big:true, open:true},
  undercroft2:{name:'Beneath the Orrery', floor:'l', wall:'stone', back:[['altar'],['crystalDisplay']], floor_:[['bookPile'],['alembic']], big:true, open:true, npcs:['ashgrove','partnerLost']},
  lab:      {name:'The Warded Laboratory', floor:'l', wall:'stone', back:[['jarShelf'],['crystalDisplay'],['jarShelf']], floor_:[['cauldron'],['alembic'],['workbench'],['herbs'],['alembic']], big:true},
  lamplighter:{name:'The Lamplighter\'s House', floor:'w', wall:'stone', back:[['bookcase'],['cupboard']], floor_:[['roundTable'],['rockingChair'],['bookPile']]},
};
// clutter: what a lived-in room of each type gathers, against the back wall and about the floor
// (FURNISH; how much of it a room gets is rolled in build, from its own random stream)
const CLUTTER = {
  cottage:  {back:['cupboard','pantry','wardrobe','crockery'], floor:['rockingChair','cradle','spinningWheel','washtub','roundTable','cot','crockery']},
  workshop: {back:['workbench','cupboard','weaponRack','pantry'], floor:['workbench','washtub','strongbox','crockery','spinningWheel']},
  alchemist:{back:['jarShelf','herbs','bookcase','crystalDisplay'], floor:['alembic','cauldron','herbs','bookPile','readingDesk']},
  rich:     {back:['bookcase','wineRack','cupboard','bookcase2'], floor:['rockingChair','roundTable','readingDesk','strongbox','rug','bookPile']},
  shop:     {back:['jarShelf','crystalDisplay','pantry','cupboard'], floor:['counter','crockery','strongbox','washtub']},
  tavern:   {back:['wineRack','pantry','cupboard'], floor:['roundTable','diningTable','roundTable','crockery']},
  study:    {back:['bookcase','bookcase2','bookLadder'], floor:['bookPile','readingDesk','lectern','rug']},
  forge:    {back:['weaponRack','workbench'], floor:['workbench','washtub','strongbox']},
  wrenInn:  {back:['wineRack','pantry','cupboard'], floor:['roundTable','roundTable','crockery','rockingChair']},
  lab:      {back:['bookcase','herbs'], floor:['bookPile','crockery','readingDesk']},
  lamplighter:{back:['wardrobe'], floor:['rug','crockery']},
};
// how furnished a room is: extra pieces per 10 floor tiles, by level (sparse / lived-in / cluttered)
const FURNISH = {levels:[0, 0.9, 1.8], odds:[0.25, 0.45, 0.30], safeOdds:[0.1, 0.45, 0.45], ruinedOdds:[0.6, 0.35, 0.05]};
// at most this many of a piece in one room once clutter is added (default 2): a house has one spinning wheel
const MAX_OF = {spinningWheel:1, cauldron:1, strongbox:1, cradle:1, counter:1, lectern:1, alembic:1, wardrobe:1, rug:1,
  crystalDisplay:1, bed:2, cot:1, rockingChair:1, readingDesk:1, washtub:1, roundTable:3, crockery:3, bookPile:3, bookcase:3, bookcase2:3};
// a share of ordinary houses are small: a single room with no inner walls
const SMALL = {odds:0.35, cols:[6,8], rows:[5,6], types:['cottage','workshop','shop','alchemist','rich']};

// extra furniture for the rooms a partitioned house gains (TYPES[t].more overrides)
const MORE = [['cupboard','wardrobe'],['bed','cot'],['washtub','pantry'],['rockingChair','roundTable'],['bookPile','cradle']];
const BROKEN = {bed:'brokenBed', cot:'brokenBed', diningTable:'brokenTable', roundTable:'brokenTable', rockingChair:'brokenChair', cradle:'brokenChair', spinningWheel:'brokenChair'};
const WALLS = {plaster:['wallPlaster','wallPlasterWin'], stone:['wallStone','wallStoneWin'], panel:['wallPanel','wallPanel'], sewer:['sewerWall','sewerWallGrille']};
const SIDES = {plaster:'sidePlaster', stone:'sideStone', panel:'sidePlaster', sewer:'sewerSide'};
const FRONTS = {plaster:'frontPlaster', stone:'frontStone', panel:'frontPlaster2', sewer:'frontStone'};

// ── lore books: short stories found in rooms. lib:true ones only in the Collegium library,
//    lib:'wren' ones only in Wrenford's Remnant Library (three of them count toward Matriculation) ──
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
  {id:'b12', title:'Hollowmere Parish Record', text:'Two pages, in two hands. The first, the year after the Unweaving: "Births: none. Deaths: none. Departures: two hundred and six. Arrivals: one, a gleaner who asked where the inn was and left before dawn without paying." The second, last year, in a clerk\'s hurried hand: "Arrivals: too many to count. Departures: most of them, by the Wardgate. Returned: fewer." At the foot, underlined twice: "Every bed on the west bank taken. Nobody will take a bed on the east."'},
  {id:'b13', title:'A Child\'s Primer', text:'F is for Fire, which keeps us warm. W is for Water, which puts out Fire. The opposites hold the world together, as a cloth is held by warp and weft. (Someone has drawn a very good dragon in the margin.)'},
  {id:'b14', title:'Gleaner Tally', text:'Cindergate 14. Frostmarket 9. Spirewatch 3 (bad). Gloamside 0, and we do not go to Gloamside, and that is the end of that, Pell.'},
  {id:'L1', lib:true, title:'The Eight-Fold Weave', text:'Eight strands make the Weave: Fire and Water, Air and Earth, Lightning and Ice, the Arcane and the Dark. Each strand is braided with its opposite; pull one and its partner tightens. A wise wizard strikes a ward with its opposite.'},
  {id:'L2', lib:true, title:'Minutes of the Last Council', text:'Motion: that the Unweaving Word be spoken only once, at the hour of lowest tide, in the Wound beneath the Collegium. Carried, seven to one. Dissent recorded: Magister Orrin, who said only, "You do not know what it will unweave." Meeting closed.'},
  {id:'L3', lib:true, title:'Arcana: The Twelve Glyphs', text:'Every working is written in the twelve glyphs. ϟ for the bolt, Δ for rising, ∇ for descent, Ψ for the fork, Ω for endings, ∞ for the eternal, ☽ the moon, ✸ the burst, ⊕ binding, ⊗ impact, θ the hidden, Φ the axis. Learn them by heart, students; you will not have time to look.'},
  {id:'L4', lib:true, title:'On Quintessence', text:'When a working is unmade, its substance does not vanish; it settles, as frost settles from cold air. The settled stuff, which the vulgar call "spill", is pure element. It will make any spell stronger, and any fool richer, and many fools dead.'},
  {id:'L5', lib:true, title:'The Wound: A Survey', text:'The surveyors who went to the Wound returned with notebooks full of measurements in a handwriting none of them recognised. The figures, when checked, were correct. The surveyors were not.'},
  {id:'W1', lib:'wren', title:'The Founding of Wrenford', text:'Forty-one scholars of Corvanthe survived the Unweaving by not being in it. They met at a coaching inn in a market town on the Wren, because it was far, and small, and nobody had ever done anything dangerous there. The minutes of that meeting are one line long: "Resolved: that we will teach, and that we will be careful."'},
  {id:'W2', lib:'wren', title:'The Statutes of Caution, with Commentary', text:'I. No working larger than its maker. (Commentary: the Unweaving Word was larger than the whole Council.) II. None without a witness. III. None that cannot be undone. IV. None in the street. V. No Word to be spoken that is not understood. (Commentary, in a different hand: nobody understood it. Everybody voted for it.)'},
  {id:'W3', lib:'wren', title:'A Primer of the Wheel', text:'Every working is one of three: Damage, Protection, Dispel. A ward stops a strike; a dispel tears a ward; a strike punishes the wizard who spent their turn dispelling. Choose in secret, and read your opponent, not your spellbook. Beneath every wheel lie the three Actions, Attack, Guard and Grapple, which need no magic at all and which most wizards forget, fatally.'},
  {id:'W4', lib:'wren', title:'On Opposites', text:'Fire and Water. Air and Earth. Lightning and Ice. The Arcane and the Dark. Each strand of the Weave is braided with the one across from it. Strike a ward with its opposite and the two strands unpick one another. Ward against what your enemy cannot cast. A first-year who learns only this will outlive a Magister who forgets it.'},
  {id:'W5', lib:'wren', title:'Roll of the Absent (vol. III of IX)', text:'Page after page of names, each with a college, a subject and a line: "Collegium, Natural Philosophy; was working on the tides." "Spirewatch Observatory; had just been married." "Third year, Arcane; owed the Inkwell four crowns, which the Inkwell has asked us to forgive." The volume ends mid-page, as if the clerk had to stop.'},
  {id:'W6', lib:'wren', title:'On Echoes, for the Gentle Reader', text:'The Echoes of Corvanthe are not ghosts and not monsters. They are workings that will not finish, wearing the shape of whoever stood in them. You may fight them; you will have to. But you are, in the strict sense, interrupting someone. Be quick, and be sorry.'},
  {id:'W7', lib:'wren', title:'A Letter from Magister Orrin', text:'Found folded in a borrowed book, years after: "If they vote for it, I will stay with my students, because they will be frightened, and frightened students make mistakes. If I am wrong, I will buy everyone a drink at the Inkwell. If I am right, then whoever reads this: be careful. Be so careful it bores you. — O."'},
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
  if(b==='hall'||b==='tower'||b==='spireTower') return 'study';
  if(b==='forge'||b==='foundry') return 'forge';
  if(b==='townhouse') return 'rich';
  if(b==='mausoleum'||b==='tomb'||b==='tombGrand') return 'crypt';
  const q=r();
  return q<0.5?'cottage':q<0.68?'workshop':q<0.8?'rich':q<0.9?'shop':'alchemist';
}

// the encounter: weights by how near the Wound (depth 0..1); outside the city nothing hostile
function rollEvent(spec,r){
  if(spec.ev) return spec.ev;                         // a story room says what's in it (the Undercroft's smugglers)
  if(spec.fixed) return {type:spec.fixed};
  if(spec.safe) return {type:'empty'};                // a safe town: people's houses, nothing to fight or take
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
  const ruined=!D.big&&!spec.safe&&!['wenna','lamplighter'].includes(type)&&(spec.ruined||spec.depth>0.6&&r()<0.6);
  let C=D.size?D.size[0]:D.big?13:D.open?9+Math.floor(r()*3):10+Math.floor(r()*4), R=D.size?D.size[1]:D.big?8:D.open?6+Math.floor(r()*2):7+Math.floor(r()*2);
  // the look of the room (size, how furnished) comes from its own stream, so the main one, and with it
  // every room's encounter, is the same as before these were added
  const r2=P.rng(hash(spec.id+':look'));
  const small=!D.size&&!D.big&&!spec.fixed&&SMALL.types.includes(type)&&r2()<SMALL.odds;
  if(small){ C=SMALL.cols[0]+Math.floor(r2()*(SMALL.cols[1]-SMALL.cols[0]+1)); R=SMALL.rows[0]+Math.floor(r2()*(SMALL.rows[1]-SMALL.rows[0]+1)); }
  const fOdds=ruined?FURNISH.ruinedOdds:spec.safe?FURNISH.safeOdds:FURNISH.odds;
  let fq=r2(), furnish=0; for(let n=0;n<fOdds.length;n++){ if((fq-=fOdds[n])<0){ furnish=n; break; } }
  const cols=C+2, rows=R+4, W=cols*T, H=rows*T;
  const floor=ruined&&D.floor==='w'?'b':D.floor;
  const ground=[]; for(let y=0;y<rows;y++){ let row=''; for(let x=0;x<cols;x++) row+=(x>=1&&x<=C&&y>=2&&y<2+R)?(D.channel&&x===1?'q':floor):'v'; ground.push(row); }
  if(D.theatre) for(let y=0;y<rows;y++) if(y>=2+R-3&&y<2+R) ground[y]=ground[y].replace(/[^v]/g,'l');   // the stage: flagstones
  const objects=[], boxes=[], lore={}, npcs=[], ev=rollEvent(spec,r);
  const sz=k=>{ const q=rects[k]; return {w:q[2]*scaleOf(k), h:q[3]*scaleOf(k)}; };
  const put=(k,x,y,extra)=>{ if(!rects[k]) return null; const e=Object.assign({scale:scaleOf(k)},extra||{}); objects.push([k,Math.round(x),Math.round(y),e]);
    const o={kind:k,x,y,scale:e.scale}; for(const b of P.footBoxes(rects,o)) boxes.push(b); return o; };
  const X0=T, X1=(C+1)*T, Y0=2*T, Y1=(2+R)*T, DX=W/2;
  // back wall
  const TWALL=['lt_wallWindow','lt_wallPlain','lt_wallCrest','lt_wallWindow','lt_wallPlain','lt_wallPortrait'];   // the theatre's panelled back wall
  if(D.theatre&&rects.lt_wallPlain){ let x=X0-8, n=0; const ws=0.19;
    while(x<X1-10){ const k=TWALL[n%TWALL.length], w=rects[k][2]*ws; objects.push([k,Math.round(x+w/2),Y0+6,{scale:ws}]); x+=w-3; n++; } }
  const walls=WALLS[D.wall]; let wx=D.theatre&&rects.lt_wallPlain?X1:X0-8, i=0;
  const rubbleAt=ruined&&r()<0.5?Math.floor(r()*Math.max(1,Math.floor(C*T/72)-3)):-1;
  const hearthAt=D.wall==='plaster'&&!ruined&&type!=='chapel'&&r()<0.3?1+Math.floor(r()*2):-1;
  if(D.wall==='sewer'){
    // the culvert: a pipe pouring into the channel (its spout over the channel's middle, 39% across the
    // piece), the ladder down from the grate, then brick, grilles and cracks, spaced by drawn width
    const ws=k=>WALL_SCALE[k]||RS;
    wx=X0+T/2-rects.sewerWallPipe[2]*RS*0.39;
    for(;wx<X1-10;i++){
      const k=i===0?'sewerWallPipe':i===2?'sewerLadder':i%3===1?walls[1]:r()<0.35?'sewerWallCrack':walls[0];
      const w=rects[k][2]*ws(k), x=Math.min(wx+w/2,X1+8-w/2);
      objects.push([k,Math.round(x),Y0+6,{scale:ws(k)}]); wx+=w-4;
    }
    boxes.push({x:X0,y:Y0,w:T,h:Y1-Y0});              // nothing stands in the channel
  }
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
  for(let y=Y0+T;y<=Y1;y+=T){ const k=SIDES[D.wall], sc=WALL_SCALE[k]||RS; objects.push([k,X0-6,y,{scale:sc}]); objects.push([k,X1+6,y,{scale:sc}]); }
  const fk=FRONTS[D.wall], fw=sz(fk).w;
  for(let x0=X0-8;x0<X1;x0+=fw-4){ const x=Math.min(x0,X1+8-fw); if(x+fw>DX-T&&x<DX+T) continue; objects.push([fk,Math.round(x+fw/2),Y1+24,{scale:RS}]); }   // the last piece tucks in, not past the corner
  const blocks=[{x:0,y:0,w:W,h:Y0+14},{x:0,y:0,w:X0-4,h:H},{x:X1+4,y:0,w:W,h:H},
    {x:0,y:Y1+4,w:DX-T,h:H},{x:DX+T,y:Y1+4,w:W,h:H}];
  const pick=a=>a[Math.floor(r()*a.length)];
  // interior walls, cut away like the front wall: one running across (low front-wall pieces) splits
  // a hall at the front from the rooms behind, one running front to back (side-wall pieces) splits
  // left from right. Every room gets a doorway; ruined houses lose a few pieces as well.
  let vx=null, hy=null;
  const wallBlock=(x,y,w,h)=>{ blocks.push({x,y,w,h}); boxes.push({x,y,w,h}); };
  const keepClear=(x,y,w,h)=>boxes.push({x,y,w,h});
  if(!D.open){
    const big=C>=11&&R>=7;
    if(big&&r()<0.7) hy=Y0+Math.round(R*0.5+(r()<0.5?0:1)-0.5)*T;
    if(hy&&Y1-hy<3*T) hy=Y1-3*T;
    if(C>=10&&(!hy||r()<0.75)){
      const lo=Math.ceil(X0/T+3), hi=Math.floor(X1/T-3), opts=[];
      for(let c=lo;c<=hi;c++) if(Math.abs(c*T-DX)>1.4*T) opts.push(c*T);
      if(opts.length) vx=pick(opts);
    }
    if(hy){                                            // across: a doorway into each room behind it
      const fk2=FRONTS[D.wall], fw2=sz(fk2).w, gaps=[];
      const spans=vx?[[X0,vx],[vx,X1]]:[[X0,X1]];
      for(const [a,b] of spans){ const g=a+T*1.2+r()*Math.max(0,b-a-T*2.4); gaps.push([g-T*0.75,g+T*0.75]); keepClear(g-T,hy-T*1.1,2*T,T*2.2); }
      for(let x0=X0-8;x0<X1;x0+=fw2-4){
        const x=Math.min(x0,X1+8-fw2), a=x, b=x+fw2; if(gaps.some(g=>b>g[0]&&a<g[1])) continue;
        if(ruined&&r()<0.15) continue;
        objects.push([fk2,Math.round(x+fw2/2),hy+18,{scale:RS}]); wallBlock(a,hy-6,fw2,18);
      }
    }
    if(vx){                                            // front to back, with a door
      const yEnd=hy||Y1, n=Math.round((yEnd-Y0)/T), door=1+Math.floor(r()*Math.max(1,n-1)), sk=SIDES[D.wall];
      for(let k=1;k<=n;k++){
        const y=Y0+k*T;
        if(k===door&&(hy||n>2)){ keepClear(vx-T*1.1,y-T,2.2*T,T); continue; }
        if(!hy&&k===n&&Math.abs(vx-DX)<2*T) continue;
        if(ruined&&r()<0.15) continue;
        objects.push([sk,vx,y,{scale:RS}]); wallBlock(vx-10,y-T,20,T);
      }
    }
  }
  // the lecture theatre (js/explore_lecture.js plays the lectures in it): seven tiers of benches either
  // side of a stepped aisle, then the stage across the front: the lectern, the demonstration bench, a
  // straw dummy and a blackboard (both drawn by js/explore_lecture.js until their art arrives,
  // docs/art-prompts.md), the lecture list by the door and Professor Thorley at her desk
  let theatreInfo=null;
  function theatre(){
    const DW=0.16, SH=43, nRows=5, aisle=0.75*T, stageY=Y1-3*T, top=Y0+1.55*T, step=(stageY-40-top)/(nRows-1);
    const dh=Math.round(rects.lt_bench6[3]*DW), rowYs=[], seats=[];
    const sides=[[X0+0.3*T, DX-aisle],[DX+aisle, X1-0.3*T]];
    const deck=(k,x,y,sc)=>objects.push([k,Math.round(x),Math.round(y),{scale:sc,decal:1}]);
    // the aisle's carpeted steps, from the stage up to the back
    const sw=rects.lt_steps, ss=(2*aisle)/sw[2], sh=sw[3]*ss;
    for(let y=stageY+6;y>top-dh-sh*0.5;y-=sh*0.92) deck('lt_steps',DX,y,ss);
    for(let k=0;k<nRows;k++){
      const y=Math.round(top+k*step); rowYs.push(y);
      // the tier's step edge under the desks
      const tw=rects.lt_tier[2]*0.3;
      for(const [a,b] of sides) for(let x=a;x<b;x+=tw-2) deck('lt_tier',Math.min(x+tw/2,b-tw/2),y+14,0.3);
      sides.forEach(([a,b],side)=>{
        // desks from the aisle out: long ones of three seats, a short one of two to finish the row
        const w6=rects.lt_bench6[2]*DW, w4=rects.lt_bench4[2]*DW, ew=rects.lt_benchEnd[2]*DW;
        let x=side?a+ew:b-ew;
        put('lt_benchEnd',side?a+ew/2:b-ew/2,y,{scale:DW});
        while(true){
          const left=side?b-x:x-a, k6=left>=w6+4, k4=!k6&&left>=w4+4; if(!k6&&!k4) break;
          const w=k6?w6:w4, cx=side?x+w/2:x-w/2, n=k6?3:2;
          put(k6?'lt_bench6':'lt_bench4',cx,y,{scale:DW});
          for(let i=0;i<n;i++){ const sx=cx+(i-(n-1)/2)*w/n; seats.push({x:Math.round(sx), y, row:k, side, toAisle:Math.abs(sx-DX)}); }
          x+=side?w+2:-w-2;
        }
      });
    }
    // the stage: a dais with its lectern on the left, the demonstration bench, the dummy and the board
    const DAIS=0.53, dx=DX-3.4*T;
    deck('lt_dais',dx,Y1-4,DAIS);
    put('lt_lectern',DX-4.7*T,Y1-0.75*T,{scale:0.28});
    put('lt_demo',DX+3.5*T,Y1-0.2*T,{scale:0.3});
    put('readingDesk',X1-1.3*T,Y1-0.55*T);
    const dummy=[Math.round(DX+5.4*T),Math.round(stageY+1.45*T)], board=[Math.round(X0+1.1*T),Math.round(stageY+1.35*T)], notice=[Math.round(DX+1.3*T),Math.round(Y1-0.15*T)];
    blocks.push({x:dummy[0]-16,y:dummy[1]-10,w:32,h:12},{x:board[0]-44,y:board[1]-10,w:88,h:12},{x:notice[0]-26,y:notice[1]-10,w:52,h:12});
    npcs.push({role:'lecturer', x:notice[0]-38, y:notice[1]+4}, {role:'examiner', x:Math.round(X1-2.4*T), y:Math.round(Y1-0.3*T)});
    return {rows:rowYs, seats, stageY, deskH:dh, seatH:SH, aisle:[DX-aisle,DX+aisle], dummy, board, notice,
      spots:{centre:[dx+0.3*T,Y1-0.75*T], lectern:[DX-4.0*T,Y1-0.8*T], bench:[DX+3.5*T,Y1-1.2*T], dummy:[DX+4.1*T,stageY+1.4*T], board:[X0+2.4*T,stageY+1.45*T],
        wing:[X0+0.5*T,Y1-0.5*T], door:[DX,Y1-0.2*T]}};
  }
  // furniture
  let bx=X0+(D.channel?T+12:20);
  for(const choices of D.back){
    const k=pick(choices), s=sz(k);
    if(bx+s.w>X1-10) break;
    let x=bx+s.w/2+r()*20; if(Math.abs(x-DX)<s.w/2+10&&D.back.length<3){ bx+=s.w+20; }
    if(vx&&Math.abs(x-vx)<s.w/2+14){ x=vx+s.w/2+16; if(x+s.w/2>X1-10) break; }
    put(k,x,Y0+34); bx=x+s.w/2+14+r()*30;
  }
  const free=(x,y,w,h,m)=>{
    if(x-w/2<X0+6||x+w/2>X1-6||y-h<Y0+20||y>Y1-6) return false;
    const fb={x:x-w*0.45,y:y-Math.min(h,30),w:w*0.9,h:Math.min(h,30)};
    if(P.overlap(fb,{x:DX-T*0.9,y:Y0+(Y1-Y0)*0.45,w:T*1.8,h:Y1})) return false;   // the way in stays clear, the whole piece, not just its middle
    return !boxes.some(b=>P.overlap(b,fb,m));
  };
  let yMin=0;                                        // the library keeps its tables in the reading area, out of the stacks
  const spot=(w,h,m,tries)=>{ for(let t=0;t<(tries||80);t++){ const x=X0+w/2+r()*(C*T-w), y=Y0+h*0.6+40+r()*(R*T-60-h*0.6); if(y-h<yMin) continue; if(free(x,y,w,h,m)) return [x,y]; } return null; };
  if(D.shelves){                                    // the library: aisles of shelving either side of a walk up the middle
    let last=Y0;
    for(let y=Y0+T*2.3;y<Y1-T*3;y+=T*1.85){ last=y;
      for(const [a,b] of [[X0+T*0.4,DX-T*1.1],[DX+T*1.1,X1-T*0.4]]){
        let x=a; while(true){ const k=r()<0.15?'bookLadder':r()<0.5?'bookcase2':'bookcase', w=sz(k).w; if(x+w>b) break; put(k,x+w/2,y); x+=w-2; }
      }
    }
    yMin=last+12;
    for(const choices of D.floor_){ const k=pick(choices), s=sz(k), p=spot(s.w,s.h,12,200);
      if(p){ if(k==='rug') objects.push([k,Math.round(p[0]),Math.round(p[1]),{scale:FS,decal:1}]); else put(k,p[0],p[1]); } }
    yMin=0;                                         // books may lie anywhere, aisles included
  } else if(D.theatre){
    theatreInfo=theatre();
  } else if(D.rows){                                       // chapel pews in two columns of rows
    for(let y=Y0+2.4*T;y<Y1-T*0.6;y+=T*1.15){ put(pick(['pew','pew2']),DX-T*2.1,y); put(pick(['pew','pew2']),DX+T*2.1,y); }
  } else {
    for(const choices of D.floor_){
      let k=pick(choices); if(ruined&&BROKEN[k]&&r()<0.7) k=BROKEN[k];
      const s=sz(k), p=spot(s.w,s.h,DECALS.has(k)&&k!=='rug'?2:12);
      if(p){ if(DECALS.has(k)) objects.push([k,Math.round(p[0]),Math.round(p[1]),{scale:scaleOf(k),decal:1}]); else put(k,p[0],p[1]); }
    }
    if(vx||hy) for(const choices of (D.more||MORE).slice(0,(vx&&hy)?4:2)){   // the extra rooms want furnishing too
      let k=pick(choices); if(ruined&&BROKEN[k]&&r()<0.7) k=BROKEN[k];
      const s=sz(k), p=spot(s.w,s.h,12); if(p) put(k,p[0],p[1]);
    }
  }
  if(ruined) for(let n=0;n<2;n++){ const p=spot(60,30,6); if(p) put('crockery',p[0],p[1]); }
  // the encounter's pieces
  const centre=spot(50,60,16)||[DX,Y1-T*1.5];
  const echoes=[];
  if(ev.type==='treasure'){
    const p=spot(80,60,10)||centre;
    put(ev.chest?'chest':(ev.gold>20?'coinsL':'coinsM'),p[0],p[1],{lore:'ev'});
    lore.ev=[ev.chest?'A Chest':'Coins','Somebody\'s savings, left behind when they ran.'];
  } else if(ev.type==='spill'){
    const p=spot(50,60,10)||centre;
    put('q_'+ev.el,p[0],p[1],{lore:'ev'});
    lore.ev=['Quintessence','Raw '+ev.el+', grown out of the floor like a crystal where something was unmade.'];
  } else if(ev.type==='echoes'){
    echoes.push({id:'in', el:ev.el, foes:ev.foes, x:centre[0], y:centre[1], r:40});
  } else if(ev.type==='party'){
    npcs.push({role:'party', x:centre[0], y:centre[1]});
  } else if(ev.type==='wounded'){
    const p=spot(70,80,24)||centre;
    npcs.push({role:'wounded', x:p[0], y:p[1]}); boxes.push({x:p[0]-20,y:p[1]-60,w:40,h:60});
  } else if(type==='wenna'||type==='lamplighter'){
    const p=spot(70,80,24)||centre;
    npcs.push({role:type, x:p[0], y:p[1]}); boxes.push({x:p[0]-20,y:p[1]-60,w:40,h:60});
  } else if(type==='safehouse'||type==='inn'||type==='wrenInn'){
    lore.rest=[type==='safehouse'?'The Keeper\'s Hearth':'The Fire', type==='wrenInn'?'A good fire, a bed upstairs and a landlady who has seen every kind of traveller come in off the east road. "Potions behind the bar, if you need one. Eight gold."':type==='inn'?'A good fire and a bed upstairs. The landlady asks no questions.':'Old Marda keeps the Rest for any gleaner who keeps the peace inside it. "No blades drawn under my roof, and no spill sold either. Sit. Eat."'];
    const k=objects.find(o=>o[0]==='safeHearth'||o[0]==='hearthPot'); if(k) k[3].lore='rest';
  }
  // a fixed room's own people (the lecturer and examiner, the landlady and the winks players)
  for(const role of D.npcs||[]){
    const p=spot(70,80,24)||centre;
    npcs.push({role, x:p[0], y:p[1]}); boxes.push({x:p[0]-20,y:p[1]-60,w:40,h:60});
  }
  // lore books
  const books=[];
  const nBooks=type==='library'?6:type==='remnant'?7:type==='study'?2:(r()<0.38?1:0);
  const pool=BOOKS.filter(b=>type==='library'?b.lib===true:type==='remnant'?b.lib==='wren':!b.lib);
  for(let n=0;n<nBooks;n++){
    const b=pool[(hash(spec.id+':'+n)+n*7)%pool.length]; if(books.includes(b.id)) continue;
    const k=pick(['bookOpen','bookClosed','scroll','letter','journal']), p=spot(50,40,8);
    if(!p) continue;
    put(k,p[0],p[1],{lore:'book:'+b.id}); books.push(b.id);
    lore['book:'+b.id]=[b.title,b.text];
  }
  // clutter, last, so it fits round everything else (the encounter, books, people) and never moves them
  const CL=CLUTTER[type];
  if(CL&&!D.shelves&&!D.rows&&FURNISH.levels[furnish]>0){
    for(const e of echoes) boxes.push({x:e.x-50,y:e.y-70,w:100,h:90});
    const count=k=>objects.filter(o=>o[0]===k).length, full=k=>count(k)>=(MAX_OF[k]||2);
    const pk=a=>{ const ok=a.filter(k=>rects[k]&&!full(k)); return ok.length?ok[Math.floor(r2()*ok.length)]:null; };
    // the back wall: fill the gaps between what stands there
    const wantBack=Math.round(FURNISH.levels[furnish]*C/5);
    for(let n=0,tries=0;n<wantBack&&tries<30;tries++){
      const k=pk(CL.back); if(!k) break; const s=sz(k), x=X0+s.w/2+10+r2()*(C*T-s.w-20), y=Y0+34;
      if(Math.abs(x-DX)<s.w/2+T*0.9&&!hy) continue;                 // keep the line in from the door clear
      if(vx&&Math.abs(x-vx)<s.w/2+14) continue;
      const fb={x:x-s.w*0.45,y:y-Math.min(s.h,30),w:s.w*0.9,h:Math.min(s.h,30)};
      if(boxes.some(b=>P.overlap(b,fb,10))) continue;
      put(k,x,y); n++;
    }
    const wantFloor=Math.round(FURNISH.levels[furnish]*C*R/10);
    for(let n=0;n<wantFloor;n++){
      let k=pk(CL.floor); if(!k) break; if(ruined&&BROKEN[k]&&r2()<0.7) k=BROKEN[k]; if(!rects[k]||full(k)) continue;
      const s=sz(k), p=spot(s.w,s.h,14,40); if(!p) continue;
      if(k==='rug') objects.push([k,Math.round(p[0]),Math.round(p[1]),{scale:FS,decal:1}]); else put(k,p[0],p[1]);
    }
  }
  if(type==='undercroft'){ const c=objects.find(o=>o[0]==='crystalChest'); if(c){ c[3].lore='haul'; lore.haul=['The Smugglers\' Haul','A crate of raw quintessence, packed in straw for the night barges. Every crystal in it is somebody\'s street in Corvanthe.']; } }
  if(type==='shop'){ const c=objects.find(o=>o[0]==='counter'); if(c){ c[3].lore='shop'; lore.shop=['An Honesty Box','The shopkeeper fled, but the box on the counter still reads "PAY WHAT IS FAIR". A few potions are left on the shelf.']; } }
  const name=ruined?D.name.replace(/^An? /,'A Ruined ').replace('A Ruined Alchemist','A Ruined Alchemist'):D.name;
  return {id:spec.id, name:(spec.label||name), cols, rows, seed:hash(spec.id)&0xffff, ground, objects, lore, blocks, glows:[], echoes, walk:[],
    spawns:{door:[DX,Y1-12]}, exits:[{x:DX-T,y:Y1+8,w:2*T,h:T*0.8,dir:'S',label:'Outside',to:'out'}],
    interior:true, type, ev, npcs, flow:'S', theatre:theatreInfo, people:theatreInfo?1.4:undefined, fitTall:!!theatreInfo};   // the theatre's furniture is drawn big, so its people are too
}

window.ExploreRooms={build, BOOKS, TYPES, RS, FS, ITEM_SCALE, hash};
})();
