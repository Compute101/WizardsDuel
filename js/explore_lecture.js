// ═══════════════════════════════════════════════════════════════════
//  EXPLORE LECTURE — the lecture theatre in Wrenford's Examination Schools,
//  and the lectures given in it. A lecture is a little scripted play on the
//  room's map (a "scene", run by js/explore.js): the students file in and sit
//  on the tiers, you take your seat (your tutorial partner beside you once
//  you've met them), and the lecturer talks in readable, timed speech
//  bubbles while demonstrating: tracing the spell's glyphs in the air and
//  casting it at a straw dummy on the stage. Students mutter, gasp, laugh
//  and take notes. Tap (or E) to hurry a line along; Escape or the Skip
//  button jumps to the questions. js/explore_year.js asks the questions
//  afterwards (lecture()) and then calls end().
//  Also the pieces of the room that change: the straw dummy (fresh, charred,
//  frosted), the blackboard (chalked afresh by each lecturer) and the lecture
//  list's notice board, from sheet 24 (the rest of the theatre is laid out by
//  theatre() in js/explore_rooms.js).
//  ExploreLecture: play(api, id, L, opts) → Promise<end()>, under(ctx,t,MAP), props(MAP, inScene).
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';

const T = 64;
const GLYPHS = ['ϟ','Δ','∇','Ψ','Ω','∞','☽','✸','⊕','⊗','θ','Φ'];
const GLOW = ['#ccffff','#ff9944','#44aaff','#aaff88','#ff4444','#44ffcc','#aaddff','#ffff55','#ffee77','#ff44aa','#88ff88','#dd88ff'];   // CLAUDE.md, glyph glow colours
const SETS = {fire:[0,1,8,4], lightning:[3,2,9,7], ice:[10,11,6,5], arcane:[4,5,3,10], dispel:[5,8,2,10], earth:[1,2,3,8], dark:[6,9,2,4], air:[1,0,7,11], water:[2,5,4,11]};
const ECOL = {fire:'#ff8a3a', water:'#4aa8e0', air:'#d8f0f8', earth:'#c09058', lightning:'#a8c0ff', ice:'#b8e8ff', arcane:'#6a8aff', dark:'#b070f0', dispel:'#ff88cc'};
const rnd = (a,b) => a+Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const ease = u => u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;

// ── pacing: lines type out, then hold long enough to read (tap to hurry) ──
const TYPE_CPS = 42;                         // characters a second as a line types out
const HOLD = len => 1300+len*32;             // then held: about 18 characters a second of reading, all told
const SAY_PX = 17, SAY_W = 440, MUTTER_PX = 13;   // speech on screen, whatever the zoom
const SEAT_CROP = 0.7;                       // a seated wizard: the upper 70% of their standing figure, down to the lap
const PERSON = 1.25;                         // people in the theatre are drawn this much bigger than on the map, to sit with the seated students' art
const LECTURER = 1.55;                       // the lecturer, standing on the stage, bigger still (the user asked)                       // a seated figure: the upper 60%, the bench hides the rest

// ── who lectures (painted from the hero creator's figures until their own art: docs/art-prompts.md) ──
const LOOKS = {
  fire:     {name:'Ignatius Pyle',    sex:'m', age:'middle', fig:'mid_man_1',   robe:'Black',   trim:'Scarlet', staff:'Ebony',      hair:'Black',  skin:'Tan',   eyes:'Brown', elem:'fire'},
  water:    {name:'Perpetua Wells',   sex:'f', age:'middle', fig:'mid_woman_3', robe:'Teal',    trim:'Silver',  staff:'Driftwood',  hair:'Brown',  skin:'Fair',  eyes:'Grey',  elem:'water'},
  air:      {name:'Halcyon Drift',    sex:'m', age:'old',    fig:'old_man_2',   robe:'Ash',     trim:'Sky',     staff:'Silverwood', hair:'White',  skin:'Pale',  eyes:'Blue',  elem:'air'},
  earth:    {name:'Agnes Barrow',     sex:'f', age:'middle', fig:'mid_woman_2', robe:'Russet',  trim:'Bone',    staff:'Oak',        hair:'Brown',  skin:'Tan',   eyes:'Hazel', elem:'earth'},
  lightning:{name:'Erasmus Fulmer',   sex:'m', age:'young',  fig:'young_man_1', robe:'Black',   trim:'Gold',    staff:'Ash',        hair:'Blonde', skin:'Fair',  eyes:'Blue',  elem:'lightning'},
  ice:      {name:'Ingrid Rime',      sex:'f', age:'old',    fig:'old_woman_3', robe:'Midnight',trim:'Silver',  staff:'Silverwood', hair:'White',  skin:'Pale',  eyes:'Grey',  elem:'ice'},
  arcane:   {name:'Oriel Nightingale',sex:'m', age:'old',    fig:'old_man_4',   robe:'Violet',  trim:'Silver',  staff:'Blackthorn', hair:'Silver', skin:'Natural',eyes:'Blue', elem:'arcane'},
  dark:     {name:'Lavinia Crowe',    sex:'f', age:'old',    fig:'old_woman_4', robe:'Black',   trim:'Silver',  staff:'Ebony',      hair:'Black',  skin:'Pale',  eyes:'Dark',  elem:'dark'},
};
LOOKS.wards=LOOKS.ice; LOOKS.unmaking=LOOKS.arcane;
// the students: the user's seated students (sprites/folk/student_seated_<n>[_<gown>].png, cut by
// tools/cut_students.py: 1-4 women, 5-8 men), in their painted purple and two gown recolours each
const GOWN_OF = {1:['black','midnight'], 2:['crimson','forest'], 3:['black','forest'], 4:['midnight','crimson'],
  5:['black','forest'], 6:['crimson','midnight'], 7:['black','crimson'], 8:['black','midnight']};
const STUDENTS = []; for(let n=1;n<=8;n++) for(const g of [''].concat(GOWN_OF[n])) STUDENTS.push('sprites/folk/student_seated_'+n+(g?'_'+g:'')+'.png');
const ROOK = 'sprites/folk/student_seated_8_black.png';   // Rook, of On Wards
const cache = {};          // painted looks: key → {img, glow, face, h}
function loadImg(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }); }
async function painted(api, key, rec){
  if(cache[key]) return cache[key];
  const H=window.ExploreHero, d=H&&await api.heroDef(H.avoidLook(rec, api.hero()));
  if(!d) return null;
  const img=await loadImg(d.sprite); if(!img) return null;
  return cache[key]={img, glow:d.glow, face:d.face, h:d.spriteHeight||1};
}
async function seatedLook(src){
  if(cache[src]) return cache[src];
  const img=await loadImg(src); if(!img) return null;
  return cache[src]={img, src, name:src===ROOK?'Rook':'', h:1};
}
// ═══ THE ROOM'S DECOR (always, not only in a lecture) ════════════════
let boardText={title:'Statute IV', sub:'None in the street.', glyphs:null, shown:999};
const dummy={x:0,y:0, char:0, burn:0, wet:0, frost:0, lift:0, spin:0, hit:0, glow:0};
function resetDummy(){ Object.assign(dummy,{char:0,burn:0,wet:0,frost:0,lift:0,spin:0,hit:0,glow:0}); }
// the stage's edge: the tiers end in a step down to the flagstones (the tiers, desks, aisle steps and
// dais are the room's own pieces, sheet 24; js/explore_rooms.js lays them out)
function under(ctx, t, MAP){
  const th=MAP.theatre, X0=T, X1=(MAP.cols-1)*T;
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(X0,th.stageY,X1-X0,10);
  ctx.fillStyle='rgba(255,214,150,0.22)'; ctx.fillRect(X0,th.stageY-2,X1-X0,2);
}
const DUMMY_S=0.25, BOARD_S=0.34, NOTICE_S=0.2;
function props(MAP, inScene, drawPiece){
  const th=MAP.theatre;
  dummy.x=th.dummy[0]; dummy.y=th.dummy[1];
  return [
    {y:th.dummy[1], draw:(ctx,t)=>drawDummy(ctx,t,drawPiece)},
    {y:th.board[1], draw:(ctx,t)=>drawBoard(ctx,t,th.board[0],th.board[1],drawPiece)},
    {y:th.notice[1], draw:ctx=>drawPiece('lt_notice',th.notice[0],th.notice[1],undefined,NOTICE_S)},
  ];
}
function px(ctx,c,x,y,w,h){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
// the straw dummy: fresh, charred (and smoking) once a strike has burnt it, frosted after Ice; it shakes when
// hit, rides a whirlwind (lift, spin) and darkens when drenched
function drawDummy(ctx,t,drawPiece){
  const d=dummy, sh=d.hit>0?Math.sin(t/25)*d.hit*3:0, kind=d.frost>0.35?'lt_dummyFrost':d.char>0.45?'lt_dummyBurnt':'lt_dummy';
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(d.x,d.y-2,16,5,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(d.x+sh,-d.lift); if(d.spin){ ctx.translate(0,d.y); ctx.scale(Math.cos(d.spin),1); ctx.translate(0,-d.y); }
  if(d.wet>0) ctx.filter=`brightness(${1-Math.min(0.3,d.wet*0.06)}) saturate(${1-Math.min(0.4,d.wet*0.08)})`;
  drawPiece(kind,0,d.y,undefined,DUMMY_S); ctx.filter='none';
  if(d.glow>0){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,140,60,${d.glow*0.45})`; ctx.beginPath(); ctx.ellipse(0,d.y-40,14,26,0,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
// the blackboard on its easel: the room's chalked board, or wiped and chalked afresh by the lecturer
function drawBoard(ctx,t,x,y,drawPiece){
  const B=boardText;
  if(!B.title){ drawPiece('lt_board',x,y,undefined,BOARD_S); return; }
  drawPiece('lt_boardBlank',x,y,undefined,BOARD_S);
  const n=Math.floor(B.shown), w=92, h=80, cy=y-h+h*0.36;
  ctx.save(); ctx.fillStyle='rgba(238,236,226,0.92)'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 9px Georgia, serif'; ctx.fillText(B.title.slice(0,n),x,cy-12);
  const m=Math.max(0,n-B.title.length);
  ctx.font='italic 6.5px Georgia, serif'; ctx.fillText(B.sub.slice(0,m),x,cy-2);
  if(B.glyphs&&m>B.sub.length){ ctx.font='10px serif'; B.glyphs.slice(0,Math.floor((m-B.sub.length)/3)).forEach((g,i)=>ctx.fillText(GLYPHS[g],x-21+i*14,cy+11)); }
  ctx.restore(); void w;
}

// ═══ A LECTURE ═══════════════════════════════════════════════════════
// Scripts: steps run in order. ['say',text] the lecturer speaks (waits till read); ['mutter',text] a
// student near you speaks (doesn't wait); ['ask',text] a student speaks (waits); ['partner',text] your
// partner whispers (waits; left out if you haven't met them); ['walk',spot]; ['face','dummy'|'class'];
// ['glyphs',set] the lecturer traces a glyph set in the air (waits); ['fx',name,opts] starts an effect;
// ['wait',ms]; ['crowd','gasp'|'laugh'|'shiver']; ['board',title,sub,set] chalks the board; ['dim',v] the lamps.
const SCRIPTS = {
  fire:[
    ['walk','centre'], ['say','Morning, all! Settle down, settle down. Front row empty again, I see. It always is.'], ['mutter','I wonder why.'],
    ['walk','board'], ['board','ON FIRE','Dr I. Pyle','fire'], ['say','Fire! The most honest of the elements. It wants one thing, and one thing only: more.'],
    ['walk','dummy'], ['face','dummy'], ['glyphs','fire'], ['say','Watch the hand, not the flame. The Bolt, the Peak, the Wheel, the Arch. Written before it is spoken.'],
    ['fx','fireball',{charge:3.4}], ['say','Feed it and it grows. Hold it and it grows. Throw it, quickly...'], ['wait',900], ['crowd','gasp'],
    ['say','...before it decides to grow on you.'], ['mutter','My eyebrows!'],
    ['face','class'], ['say','A strong strike leaves a scorch behind. That one will smoulder until lunch.'],
    ['walk','centre'], ['say','Fire\'s opposite, across the wheel, is Water. And never, ever stand in front of the Water students in an exam.'], ['crowd','laugh'],
    ['partner','See? The front row\'s for the brave. Or the eyebrowless.'],
    ['say','Right! Questions.'],
  ],
  water:[
    ['fx','drips'], ['walk','centre'], ['mutter','She\'s dripping on the stage again.'],
    ['say','Good morning. Today, Water.'], ['board','ON WATER','Miss P. Wells','water'], ['say','Water does not hit.'], ['wait',500], ['say','It arrives.'],
    ['walk','dummy'], ['face','dummy'], ['glyphs','water'], ['say','The Well, the Knot, the Arch, the Spindle. Descent, flow, depths, tide.'],
    ['fx','wave'], ['wait',1700], ['crowd','gasp'], ['mutter','I felt that from here.'],
    ['say','And it soaks in. Anything a Water strike lands on is drenched.'],
    ['fx','spark'], ['say','The next Lightning that finds it hits harder. Like so. And the next Fire is doused.'],
    ['face','class'], ['walk','centre'], ['say','Water\'s opposite is Fire. Remember that when you choose your friends.'],
    ['partner','Note to self: sit next to the Water students. Far from the Fire ones.'],
    ['say','Questions, please.'],
  ],
  air:[
    ['fx','papers',{secs:30}], ['walk','centre'], ['say','Ah! Ah. You\'re here. Good. Don\'t mind the notes, they never stay put.'], ['mutter','Should we pick them up?'], ['mutter','He never does.'],
    ['board','ON AIR','Prof. H. Drift','air'], ['say','Air is the element of getting past. Past walls. Past guards. Past those who stand in the way.'],
    ['walk','dummy'], ['face','dummy'], ['glyphs','air'], ['say','The Peak, the Bolt, the Star, the Spindle. Rising, gust, burst, axis.'],
    ['fx','whirlwind'], ['wait',700], ['say','Up she goes!'], ['crowd','gasp'], ['wait',1400],
    ['face','class'], ['say','An Air strike gusts over the minions guarding a wizard, straight at the wizard. Very rude. Very useful.'],
    ['walk','centre'], ['say','Its opposite is Earth. Dr Barrow and I do not share a staircase.'], ['crowd','laugh'],
    ['partner','I think half his notes are in the Physic Garden by now.'],
    ['say','Questions! Quickly, before they blow away.'],
  ],
  earth:[
    ['walk','centre'], ['say','Hands off the crates. I have asked twice. I shan\'t ask a third time.'], ['mutter','Who touched the crates?'],
    ['board','ON EARTH','Dr A. Barrow','earth'], ['say','Earth. Before the Unweaving we taught it as a separate art, Physical, and the Collegium paid for that mistake.'],
    ['walk','dummy'], ['face','dummy'], ['glyphs','earth'], ['say','The Peak, the Well, the Fork, the Wheel. Stone laid on stone.'],
    ['fx','boulder'], ['wait',2300], ['crowd','gasp'],
    ['face','class'], ['say','Hear me: Earth is magic. A ward stops it like any other strike.'],
    ['say','And a blow is not Earth. A fist is a fist. Don\'t confuse the two in the field.'], ['mutter','Someone\'s going to confuse them.'],
    ['walk','centre'], ['say','Its opposite is Air, which goes over the top of everything. Typical.'],
    ['partner','I\'d not want to be on the wrong end of Barrow. Or that rock.'],
    ['say','Questions.'],
  ],
  lightning:[
    ['fx','handSparks',{secs:40}], ['walk','centre',{fast:true}], ['say','Lightning! The fastest working there is, and the greediest!'], ['mutter','His hair\'s doing it again.'],
    ['board','ON LIGHTNING','Dr E. Fulmer','lightning'],
    ['walk','dummy',{fast:true}], ['face','dummy'], ['glyphs','lightning'], ['say','The Fork, the Well, the Seal, the Star. Strike, descent, impact, burst!'],
    ['fx','storm'], ['wait',2600], ['crowd','gasp'],
    ['face','class'], ['say','It doesn\'t just hurt. It burns the mana out of whoever it strikes.'],
    ['say','A wizard with no mana is a wizard with a stick. A nice stick, perhaps. Still a stick.'], ['crowd','laugh'],
    ['walk','centre',{fast:true}], ['say','Its opposite is Ice. Professor Rime and I are not permitted in the same corridor.'],
    ['partner','I can smell my hair. Can you smell my hair?'],
    ['say','Questions! Fire away! Not literally.'],
  ],
  ice:[
    ['walk','centre',{slow:true}], ['fx','frostFront'], ['mutter','My ink\'s frozen.'],
    ['board','ON ICE','Prof. I. Rime','ice'], ['say','Ice is patience made solid.'],
    ['walk','dummy',{slow:true}], ['face','dummy'], ['glyphs','ice'], ['say','The Eye, the Spindle, the Moon, the Knot. Crystal, axis, frost, the eternal.'],
    ['fx','snowflake'], ['say','Watch it form. Do not rush it. Rushing is for the Fire students.'], ['wait',1500], ['crowd','gasp'],
    ['face','class'], ['say','A strong Ice strike leaves frostbite in the wound. It will slow them down long after you have stopped.'],
    ['say','Its opposite is Lightning, which is impatient, and therefore loses.'],
    ['say','Questions?'], ['wait',900], ['mutter','...no.'],
    ['partner','I can see my breath. In a lecture.'],
    ['say','Then I shall ask them.'],
  ],
  arcane:[
    ['walk','centre'], ['fx','runes',{secs:9}], ['say','The Arcane is the element beneath the other elements. See Collegium Lectures, volume four. Sadly lost.'],
    ['board','ON THE ARCANE','Dr O. Nightingale','arcane'], ['say','It shares a glyph with each of them. See your primer, pages one to four.'],
    ['walk','dummy'], ['face','dummy'], ['glyphs','arcane'], ['say','The Arch, the Knot, the Fork, the Eye. Cosmos, eternity, spirit, the hidden.'],
    ['fx','orbs'], ['wait',2000], ['crowd','gasp'],
    ['face','class'], ['say','A strong Arcane strike unweaves its target\'s enchantments. Footnote one: very annoying for them.'],
    ['walk','centre'], ['say','Its opposite is the Dark. Footnote two: Dr Crowe would like a word about that.'], ['mutter','How do you say a footnote out loud?'],
    ['partner','I\'ve written "footnote" eleven times. I\'ve no idea what any of them are.'],
    ['say','Questions. With references, please.'],
  ],
  dark:[
    ['dim',0.95], ['wait',1400], ['mutter','Who put the lamps out?'], ['wait',600],
    ['say','I am the only Fellow of this University who went into Corvanthe after the Unweaving, and came back out.'],
    ['face','dummy'], ['glyphs','dark'], ['fx','ritual'], ['wait',2900],
    ['say','The Dark is not evil. It is the element of endings, and everything ends.'],
    ['say','A strong Dark strike leaves dread behind it.'],
    ['dim',0.3], ['board','ON THE DARK','Dr L. Crowe','dark'], ['crowd','shiver'], ['mutter','She hasn\'t moved. She hasn\'t moved at all.'],
    ['face','class'], ['say','Its opposite is the Arcane, which believes everything can be footnoted. It cannot.'],
    ['partner','I\'m sleeping with a candle lit tonight.'],
    ['say','Questions.'],
  ],
  wards:[
    ['walk','centre',{slow:true}], ['board','ON WARDS','Prof. I. Rime',null], ['say','Today: walls.'],
    ['glyphs','ice'], ['fx','ward',{on:'lect', elem:'ice', secs:24}], ['wait',800], ['crowd','gasp'],
    ['say','A ward stops magic. It does not stop a fist, a blade or a bite. For those you want Ironskin, and the Master of the Schools.'],
    ['say','Mr Rook. A spark, if you would. At me.'], ['ask','...At you, Professor?'], ['say','At me.'],
    ['fx','studentBolt'], ['wait',1500], ['mutter','It didn\'t even scratch it.'],
    ['say','Resisted. A ward resists every element but one: its opposite, across the wheel, unravels it.'],
    ['fx','seal'], ['say','A sealed ward does not wear, and a dispel must break the seal before it can touch the ward.'],
    ['say','So. Build your walls in an element your foe cannot cast.'],
    ['partner','Rook\'s gone pink. He\'s been wanting to hit her with something all year.'],
    ['say','Questions.'],
  ],
  unmaking:[
    ['walk','dummy'], ['face','dummy'], ['fx','ward',{on:'dummy', elem:'arcane', secs:9}], ['wait',900],
    ['say','Unmaking. See Statutes, three: no working that cannot be undone.'], ['board','ON UNMAKING','Dr O. Nightingale','dispel'],
    ['glyphs','dispel'], ['fx','unravel'], ['wait',2300], ['crowd','gasp'],
    ['face','class'], ['say','A dispel breaks wards. Twice as hard if it is the ward\'s opposite element.'],
    ['say','With no ward to break, it strips an enchantment instead.'],
    ['walk','centre'], ['say','And one may unmake one\'s own curses. That is called Cleanse.'],
    ['say','Footnote: the Dispel glyphs are in the Library. Footnote two: you will need them.'],
    ['partner','Footnote three: I\'m starving.'],
    ['say','Questions.'],
  ],
};
const AT_SPOT = ['face','glyphs','fx','board','walk'];
const STUDENT_GASP = ['Whoa!','Ooh.','Did you see that?','Saints!','Blimey.'];
const STUDENT_LAUGH = ['Ha!','Hah.','*snort*'];
const STUDENT_SHIVER = ['Brr.','I don\'t like this.','...'];

let S=null;             // the lecture running
function play(api, id, L, opts){
  opts=opts||{};
  const MAP=api.room(), th=MAP&&MAP.theatre; if(!th) return null;
  resetDummy(); dummy.x=th.dummy[0]; dummy.y=th.dummy[1];
  return new Promise(resolve=>{
    const sp=k=>{ const p=th.spots[k]||th.spots.centre; return {x:p[0], y:p[1]}; };
    const me=api.wizName(), wing=sp('wing');
    S={api, id, L, th, t:0, ready:false, fadeIn:0, fadeOut:0, steps:(SCRIPTS[id]||[]).filter(s=>s[0]!=='partner'||opts.partner).map(s=>s.slice()),
      i:0, cur:null, done:false, resolve, fx:[], parts:[], bubble:null, mutters:[], dimV:0.55, dimGoal:0.3, shakeV:0, flash:0,
      lect:{x:wing.x, y:wing.y, face:1, img:null, glow:null, tx:null, ty:null, speed:70, walk:0, moving:false, cast:0, staff:{x:wing.x,y:wing.y-50}, name:L.who},
      students:[], partner:null, seatY:0, me, skipBtn:null, onEnd:null};
    if(id==='dark'){ S.lect.x=sp('centre').x; S.lect.y=sp('centre').y; S.dimV=0.55; }   // she is simply there when the lamps come back
    boardText={title:'', sub:'', glyphs:null, shown:0};
    // your seat: the left block, the middle tier, by the aisle; your partner beside you
    const seats=th.seats.slice().sort((a,b)=>Math.abs(a.row-2)-Math.abs(b.row-2)||a.side-b.side||a.toAisle-b.toAisle);
    const mine=seats[0], theirs=seats.find(s=>s!==mine&&s.row===mine.row&&s.side===mine.side);
    S.mine=mine; S.seatLift=4; S.stuLift=8;
    api.seat(mine.x, mine.y+1, mine.side?-1:1, S.seatLift, PERSON, SEAT_CROP);
    api.scene(scene);
    // paint everyone (cached after the first lecture), then let them in
    (async()=>{
      const lk=LOOKS[id]||LOOKS.arcane;
      const [lec, ...rest]=await Promise.all([painted(api,'lect:'+lk.name,lk)].concat(STUDENTS.map(seatedLook)));
      if(lec){ S.lect.img=lec.img; S.lect.glow=lec.glow; S.lect.face=lec.face; S.face=lec.face; }
      const looks=rest.filter(Boolean), rook=looks.find(l=>l.src===ROOK), others=looks.filter(l=>l!==rook).sort(()=>Math.random()-0.5);
      if(opts.partner&&api.chars.partner){ const c=api.chars.partner, img=await loadImg(c.sprite); if(img) S.partnerLook={img, glow:c.glow, name:(c.name||'').split(' ')[0], standing:true}; }
      const used=new Set([mine, theirs]);
      if(theirs&&S.partnerLook){ S.partner=student(theirs, S.partnerLook); S.partner.isPartner=true; }
      const free=th.seats.filter(s=>!used.has(s)&&!(id==='fire'&&s.row===th.rows.length-1));   // nobody sits in Dr Pyle's front row
      const n=Math.round(free.length*0.62);
      const order=free.map(s=>({s, w:Math.random()+s.row*0.18+(s.toAisle<4*T?0.25:0)})).sort((a,b)=>b.w-a.w).slice(0,n);
      order.forEach((o,k)=>{ const look=k===0&&rook?rook:others[k%others.length]; if(look) S.students.push(student(o.s, look)); });
      S.rook=S.students.find(s=>s.look===rook)||S.students[0];
      S.ready=true;
    })().catch(e=>{ console.error(e); S.ready=true; });
    // the skip button
    const root=document.getElementById('explore-screen');
    if(root){ const b=document.createElement('button'); b.className='ex-btn ex-lect-skip'; b.type='button'; b.textContent='Skip lecture ⏭';
      b.style.cssText='position:absolute;right:12px;top:64px;z-index:6;font-size:13px;';
      b.onclick=e=>{ e.stopPropagation(); skip(); }; root.appendChild(b); S.skipBtn=b; }
  });
}
function student(seat, look){
  return {x:seat.x, y:seat.y, seat, look, face:seat.x<S.th.aisle[0]+(S.th.aisle[1]-S.th.aisle[0])/2?1:-1, phase:Math.random()*6.28,
    write:Math.random()*4, jolt:0, nod:Math.random()*3};
}
// the scene js/explore.js runs
const scene = {
  update(dt){ if(S) step(dt*(API.speed||1)); },
  actors(){ if(!S) return []; const a=[]; if(S.ready){ for(const s of S.students) a.push({y:s.y+1, draw:(c,t)=>drawStudent(c,t,s)}); if(S.partner) a.push({y:S.partner.y+1, draw:(c,t)=>drawStudent(c,t,S.partner)}); }
    a.push({y:S.lect.y, draw:(c,t)=>drawLecturer(c,t)}); return a; },
  over(ctx,t,view){ if(S) drawOver(ctx,t,view); },
  cam(vw,vh,bz){ return S?camera(vw,vh):null; },
  dim(){ return S?S.dimV:0.55; },
  shake(){ return S?S.shakeV:0; },
  tap(){ if(!S||!S.ready||S.done) return; const b=S.bubble; if(!b) return; if(b.shown<b.text.length) b.shown=b.text.length; else b.left=0; },
  skip(){ skip(); },
};
function skip(){
  if(!S||S.done) return;
  S.fx=[]; S.parts=[]; S.mutters=[]; S.bubble=null; S.dimGoal=0.3; S.shakeV=0; resetDummy();
  S.i=S.steps.length; S.cur=null; S.lect.tx=null; const c=S.th.spots.centre; S.lect.x=c[0]; S.lect.y=c[1]; S.lect.facing=null;
  S.ready=true; finishTalk();
}
function finishTalk(){
  if(S.done) return; S.done=true;
  if(S.skipBtn){ S.skipBtn.remove(); S.skipBtn=null; }
  const end=cb=>{ if(!S) return; S.fadeOut=0.001; S.onEnd=cb||null; };
  S.resolve(end);
}

// ── the step machine ──
function step(dt){
  const L=S.lect;
  S.t+=dt;
  S.dimV+=(S.dimGoal-S.dimV)*Math.min(1,dt*(S.dimGoal>S.dimV?3:1.4));
  S.shakeV=Math.max(0,S.shakeV-dt*18); S.flash=Math.max(0,S.flash-dt*3);
  if(S.fadeOut){ S.fadeOut+=dt/0.7; if(S.fadeOut>=1){ const c=S.onEnd, api=S.api, m=S.mine, a=S.th.aisle; S=null;
    api.stand((a[0]+a[1])/2, m.y+8); api.passTime(60); api.scene(null); if(c) c(); } return; }
  if(!S.ready) return;
  S.fadeIn=Math.min(1,S.fadeIn+dt/0.8);
  // the lecturer walks, the students fidget and write, effects run
  if(L.tx!=null){ const dx=L.tx-L.x, dy=L.ty-L.y, d=Math.hypot(dx,dy);
    if(d<3){ L.x=L.tx; L.y=L.ty; L.tx=null; L.moving=false; } else { const st=Math.min(d,L.speed*dt); L.x+=dx/d*st; L.y+=dy/d*st; L.moving=true; L.walk+=dt*7; if(Math.abs(dx)>2) L.facing=dx>0?1:-1; } }
  L.cast=Math.max(0,L.cast-dt);
  for(const s of S.students.concat(S.partner?[S.partner]:[])){ s.jolt=Math.max(0,s.jolt-dt*2.5); s.write-=dt; if(s.write<-1.6) s.write=2+Math.random()*6; }
  for(const f of S.fx) f.upd(dt); S.fx=S.fx.filter(f=>!f.dead);
  for(const p of S.parts){ p.life-=dt; p.vx+=(p.ax||0)*dt; p.vy+=(p.ay||0)*dt; if(p.drag){ p.vx*=1-p.drag*dt; p.vy*=1-p.drag*dt; } p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.vr) p.rot+=p.vr*dt; }
  S.parts=S.parts.filter(p=>p.life>0);
  const D=dummy; D.burn=Math.max(0,D.burn-dt); D.wet=Math.max(0,D.wet-dt*0.25); D.frost=Math.max(0,D.frost-dt*0.08); D.hit=Math.max(0,D.hit-dt*2); D.glow=Math.max(0,D.glow-dt*0.6);
  if(D.burn>0&&Math.random()<dt*28) part({x:D.x+rnd(-9,9), y:D.y-rnd(15,50), vx:rnd(-6,6), vy:rnd(-40,-25), life:rnd(0.4,0.8), r:rnd(2,4), col:pick(['#ffcc55','#ff8a3a','#ff5522']), add:true});
  if(D.burn>0&&Math.random()<dt*8) part({x:D.x+rnd(-6,6), y:D.y-58, vx:rnd(-4,4), vy:-18, life:2, r:rnd(4,7), col:'rgba(60,50,45,0.35)', smoke:true, grow:6});
  if(D.wet>0&&Math.random()<dt*6) part({x:D.x+rnd(-9,9), y:D.y-rnd(14,30), vx:0, vy:10, ay:220, life:0.4, r:1.5, col:'#8ac8f0'});
  for(const m of S.mutters) m.left-=dt*1000; S.mutters=S.mutters.filter(m=>m.left>0);
  // the current step
  if(!S.cur){
    if(S.i>=S.steps.length){ if(!S.bubble&&L.tx==null) finishTalk(); return; }
    // the lecturer talks as they walk; what's done at a spot (the board, a casting) waits till they're there
    if(L.tx!=null&&AT_SPOT.includes(S.steps[S.i][0])) return;
    S.cur=start(S.steps[S.i++]);
  }
  if(S.cur&&S.cur.upd(dt)) S.cur=null;
  if(S.bubble){ const b=S.bubble; b.shown=Math.min(b.text.length, b.shown+dt*TYPE_CPS); if(b.shown>=b.text.length) b.left-=dt*1000; }
}
function start(s){
  const [k,a,b,c]=s, L=S.lect, th=S.th;
  const spot=n=>{ const p=th.spots[n]||th.spots.centre; return p; };
  switch(k){
    case 'say': { S.bubble={who:L, name:L.name, text:a, shown:0, left:HOLD(a.length), big:true}; return {upd:()=>speechDone()}; }
    case 'ask': { const s=S.rook; if(!s) return null; s.jolt=1; S.bubble={who:s, name:'Rook', text:a, shown:0, left:HOLD(a.length)}; return {upd:()=>speechDone()}; }
    case 'partner': { const s=S.partner; if(!s) return null; S.bubble={who:s, name:s.look.name+', whispering', text:a, shown:0, left:HOLD(a.length), whisper:true}; return {upd:()=>speechDone()}; }
    case 'mutter': { const s=nearbyStudent(); if(s){ s.jolt=0.6; S.mutters.push({who:s, text:a, left:2600}); } return null; }
    case 'walk': { const p=spot(a); L.tx=p[0]; L.ty=p[1]; L.speed=b&&b.fast?140:b&&b.slow?60:95; return null; }
    case 'face': { L.facing=a==='dummy'?(dummy.x>L.x?1:-1):null; return null; }
    case 'wait': { let left=a; return {upd:dt=>(left-=dt*1000)<=0}; }
    case 'dim': { S.dimGoal=a; return null; }
    case 'board': { boardText={title:a, sub:b, glyphs:c?SETS[c]:null, shown:0}; const tot=a.length+b.length+(c?12:0); return {upd:dt=>(boardText.shown+=dt*14)>tot}; }
    case 'crowd': { crowd(a); return null; }
    case 'glyphs': { const f=glyphTrace(a); return {upd:()=>f.dead}; }
    case 'fx': { const f=FX[a]&&FX[a](b||{}); if(f&&!f.upd){ /* an effect that's only particles */ } return null; }
  }
  return null;
}
function speechDone(){ const b=S.bubble; if(b&&b.shown>=b.text.length&&b.left<=0){ S.bubble=null; return true; } return !b; }
function nearbyStudent(){
  const m=S.mine, near=S.students.filter(s=>Math.abs(s.seat.row-m.row)<=2&&Math.abs(s.x-m.x)<5*T);
  return pick(near.length?near:S.students)||null;
}
function crowd(kind){
  const lines=kind==='laugh'?STUDENT_LAUGH:kind==='shiver'?STUDENT_SHIVER:STUDENT_GASP;
  for(const s of S.students){ if(Math.random()<0.7) s.jolt=kind==='laugh'?0.6:1; }
  const n=kind==='shiver'?1:2;
  for(let i=0;i<n;i++){ const s=nearbyStudent(); if(s&&!S.mutters.some(m=>m.who===s)) S.mutters.push({who:s, text:pick(lines), left:1800+i*300}); }
}

// ── the camera: the stage and the front tiers, wider on a wide screen; on a narrow one it follows the action ──
function camera(vw,vh){
  const th=S.th, a=th.aisle, DX=(a[0]+a[1])/2, y0=th.rows[Math.max(0,S.mine.row-1)]-th.seatH-12, y1=th.stageY+3*T+8, w=15*T, h=y1-y0;
  let z=Math.min(vh/h, Math.max(vw/w, vw/(7*T)));      // a phone shows about seven tiles across and follows the action
  z=clamp(z, 0.6, 2.2);
  const viewW=vw/z, L=S.lect;
  let fx=DX; if(viewW<w){ const act=S.fx.find(f=>f.x!=null); const ax=act?(act.x+L.x)/2:L.x; fx=clamp((ax+S.mine.x)/2, DX-w/2+viewW/2, DX+w/2-viewW/2); }
  const viewH=vh/z; return {x:fx, y:viewH>=h?y1-viewH/2+14/z:y0+h/2, zoom:z};
}

// ── drawing the people ──
function drawLecturer(ctx,t){
  const L=S.lect, img=L.img; if(!img) return;
  const h=S.api.WIZ_H*LECTURER, w=h*img.naturalWidth/img.naturalHeight, bob=L.moving?Math.abs(Math.sin(L.walk))*3:Math.sin(t/500)*0.6;
  const f=L.facing!=null?L.facing:(S.bubble&&S.bubble.who===L?(Math.sin(S.t*0.7)>0?1:-1):1);
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(L.x,L.y-2,17,6,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(L.x,L.y-bob-(L.cast>0?2:0)); if(f<0) ctx.scale(-1,1);
  if(L.moving) ctx.rotate(Math.sin(L.walk)*0.04);
  ctx.drawImage(img,-w/2,-h,w,h);
  const g=L.glow;
  if(g&&window.StaffGlow){ const lx=-w/2+g.x*w, ly=-h+g.y*h; StaffGlow.draw(ctx,lx,ly,Math.max(g.r*h,h*0.03)*(L.cast>0?1.9:1),g.col,g.elem,t,L.cast>0?1.8:1);
    L.staff={x:L.x+(f<0?-lx:lx), y:L.y-bob+ly}; }
  else L.staff={x:L.x+f*w*0.3, y:L.y-h*0.75};
  ctx.restore();
}
const headY = s => s.look&&!s.look.standing?s.y-S.stuLift-S.th.seatH:s.y-S.seatLift-S.api.WIZ_H*PERSON*SEAT_CROP;
function drawStudent(ctx,t,s){
  const img=s.look.img; if(!img||!img.naturalWidth) return;
  const writing=s.write<0, bob=(writing?Math.abs(Math.sin(S.t*9+s.phase))*1.2:0)+Math.sin(t/900+s.phase)*0.5-s.jolt*3;
  ctx.save();
  if(s.look.standing){                                             // your partner: their own figure, cropped at the waist
    const h=S.api.WIZ_H*PERSON, w=h*img.naturalWidth/img.naturalHeight;
    ctx.translate(s.x, s.y-S.seatLift-bob); if(s.face<0) ctx.scale(-1,1);
    ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight*SEAT_CROP,-w/2,-h*SEAT_CROP,w,h*SEAT_CROP);
    const g=s.look.glow;
    if(g&&g.y<SEAT_CROP&&window.StaffGlow) StaffGlow.draw(ctx,-w/2+g.x*w,-h*SEAT_CROP+g.y*h,Math.max(g.r*h,h*0.03)*0.7,g.col,g.elem,t,0.6);
  } else {                                                         // a seated student: the desk in front hides the lap
    const h=S.th.seatH, w=h*img.naturalWidth/img.naturalHeight;
    ctx.translate(s.x, s.y-S.stuLift-bob); if(s.face<0) ctx.scale(-1,1);
    ctx.drawImage(img,-w/2,-h,w,h);
  }
  ctx.restore();
}

// ── particles ──
function part(p){ p.max=p.life; p.vx=p.vx||0; p.vy=p.vy||0; p.rot=p.rot||0; S.parts.push(p); return p; }
function burst(x,y,n,col,o){ o=o||{}; for(let i=0;i<n;i++){ const a=rnd(0,6.28), v=rnd(o.v0||40,o.v1||160);
  part({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*(o.flat||0.7)-(o.up||0),ay:o.g||0,drag:o.drag||2,life:rnd(o.l0||0.3,o.l1||0.8),r:rnd(o.r0||1.5,o.r1||3.5),col:Array.isArray(col)?pick(col):col,add:o.add!==false,shard:o.shard,vr:o.shard?rnd(-10,10):0}); } }
function ring(x,y,col,r1,dur,flat){ S.fx.push(mk({x,y,dur:dur||0.5, draw(ctx,u){ ctx.strokeStyle=col; ctx.globalAlpha=1-u; ctx.lineWidth=3*(1-u)+0.5; ctx.beginPath(); ctx.ellipse(x,y,r1*u+4,(r1*u+4)*(flat||0.45),0,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }, add:true})); }
function mk(o){ o.t=0; o.dead=false; const u0=o.upd; o.upd=dt=>{ o.t+=dt; if(u0) u0.call(o,dt,Math.min(1,o.t/o.dur)); if(o.t>=o.dur) o.dead=true; }; return o; }
const dummyMid = () => ({x:dummy.x, y:dummy.y-34-dummy.lift});
const staff = () => ({x:S.lect.staff.x, y:S.lect.staff.y});
const ELF = (from,to,u,arc) => ({x:from.x+(to.x-from.x)*u, y:from.y+(to.y-from.y)*u-Math.sin(u*Math.PI)*(arc||0)});

// tracing the glyphs: each appears in an arc above the staff in its own glow, then they fold into the staff
function glyphTrace(setId){
  const set=SETS[setId]||SETS.arcane, L=S.lect; L.cast=2.8;
  const f=mk({dur:2.8, add:true, upd(dt){ L.cast=Math.max(L.cast,0.3); },
    draw(ctx){ const o=staff(), u=this.t; ctx.textAlign='center'; ctx.textBaseline='middle';
      set.forEach((g,i)=>{ const at=0.15+i*0.42, k=u-at; if(k<0) return;
        const fold=Math.max(0,(u-2.25)/0.55), a=i/(set.length-1)*Math.PI*0.8+Math.PI*1.1;
        const gx=o.x+Math.cos(a)*38*(1-fold), gy=o.y-20+Math.sin(a)*28*(1-fold)-8*(1-fold);
        const al=Math.min(1,k*4)*(1-fold*0.8), sc=1+Math.max(0,0.4-k)*1.5;
        ctx.save(); ctx.globalAlpha=al; ctx.shadowColor=GLOW[g]; ctx.shadowBlur=14; ctx.fillStyle='#ffffff';
        ctx.font=`bold ${Math.round(22*sc)}px serif`; ctx.fillText(GLYPHS[g],gx,gy); ctx.shadowBlur=24; ctx.fillStyle=GLOW[g]; ctx.globalAlpha=al*0.6; ctx.fillText(GLYPHS[g],gx,gy); ctx.restore();
        if(k<0.05&&Math.random()<0.5) burst(gx,gy,6,GLOW[g],{v0:10,v1:40,l1:0.5,r1:2});
      }); }});
  S.fx.push(f); return f;
}

// ── the demonstrations ──
const FX = {
  // Fire: a ball swells at the staff, is held, then thrown into the dummy, which goes up like a haystack
  fireball(o){
    const charge=o.charge||1.4, fly=0.45; let hit=false, from=null; S.lect.cast=charge+fly;
    return S.fx.push(mk({dur:charge+fly, add:true,
      upd(dt){ const st=staff();
        if(this.t<charge){ S.lect.cast=0.3; this.x=st.x; if(Math.random()<dt*30){ const a=rnd(0,6.28), r=rnd(18,30); part({x:st.x+Math.cos(a)*r, y:st.y-6+Math.sin(a)*r, vx:-Math.cos(a)*45, vy:-Math.sin(a)*45, life:0.45, r:rnd(1.5,3), col:pick(['#ffdd66','#ff8a3a']), add:true}); } }
        else { if(!from) from={x:st.x,y:st.y-6}; const p=ELF(from,dummyMid(),(this.t-charge)/fly,26); this.x=p.x; this.y=p.y; part({x:p.x,y:p.y,vx:rnd(-20,20),vy:rnd(-20,20),life:0.3,r:rnd(2,4),col:'#ff9a3a',add:true}); }
        if(!hit&&this.t>=charge+fly-0.02){ hit=true; const m=dummyMid(); burst(m.x,m.y,40,['#fff2a0','#ffb040','#ff6020'],{v0:60,v1:220,l1:0.9,r1:4.5});
          for(let i=0;i<10;i++) part({x:m.x+rnd(-10,10),y:m.y+rnd(-10,10),vx:rnd(-30,30),vy:rnd(-40,-10),life:rnd(1,2),r:rnd(5,9),col:'rgba(50,40,36,0.45)',smoke:true,grow:10});
          ring(m.x,dummy.y-4,'#ffaa44',60,0.6); S.shakeV=7; S.flash=0.5; dummy.burn=5; dummy.char=Math.min(1,dummy.char+0.6); dummy.hit=1; dummy.glow=1; } },
      draw(ctx){ const st=staff(), grow=Math.min(1,this.t/charge), r=(3+11*ease(grow))*(1+Math.sin(this.t*24)*0.06);
        const p=this.t<charge?{x:st.x,y:st.y-6}:{x:this.x,y:this.y};
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.2); g.addColorStop(0,'rgba(255,255,220,1)'); g.addColorStop(0.3,'rgba(255,200,80,0.95)'); g.addColorStop(0.6,'rgba(255,100,30,0.6)'); g.addColorStop(1,'rgba(255,60,10,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,r*2.2,0,Math.PI*2); ctx.fill(); }}));
  },
  // Water: a wall of water rises beside the dummy, curls over and crashes down on it
  wave(){
    const D=dummy, x0=D.x-62, base=D.y; let crashed=false; S.lect.cast=2.2;
    S.fx.push(mk({x:D.x, dur:2.2, add:false,
      upd(dt,u){ if(u<0.55&&Math.random()<dt*40) part({x:x0+rnd(0,50), y:base-rnd(0,8), vx:rnd(-10,10), vy:rnd(-30,-10), life:0.5, r:rnd(1.5,3), col:'rgba(200,235,255,0.8)'});
        if(!crashed&&u>0.72){ crashed=true; burst(D.x,D.y-30,46,['#bfe6ff','#7ac0ee','#ffffff'],{v0:60,v1:200,g:300,l0:0.5,l1:1.1,r1:3,add:false,up:60});
          D.wet=8; D.hit=1; S.shakeV=4; ring(D.x,D.y-3,'rgba(160,220,255,0.9)',70,0.8); } },
      draw(ctx,_){ const u=Math.min(1,this.t/2.2); if(u>0.9) return;
        const rise=ease(Math.min(1,u/0.5)), curl=Math.max(0,(u-0.45)/0.3), fall=Math.max(0,(u-0.72)/0.18);
        const H=80*rise*(1-fall*0.8), cx=x0+20+curl*40;
        ctx.save(); ctx.globalAlpha=0.85*(1-fall);
        const g=ctx.createLinearGradient(0,base-H,0,base); g.addColorStop(0,'rgba(170,225,255,0.95)'); g.addColorStop(1,'rgba(30,90,170,0.9)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x0-24,base); ctx.quadraticCurveTo(x0-10,base-H*0.7,cx,base-H);
        ctx.quadraticCurveTo(cx+28*curl+10,base-H-6,cx+38*curl+6,base-H+14+fall*30); ctx.quadraticCurveTo(cx+16,base-H*0.6,x0+56+curl*16,base); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(cx-6,base-H+2); ctx.quadraticCurveTo(cx+28*curl+10,base-H-6,cx+38*curl+6,base-H+14+fall*30); ctx.stroke();
        ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1; for(let k=1;k<4;k++){ ctx.beginPath(); ctx.moveTo(x0-16+k*8,base-H*0.2*k); ctx.quadraticCurveTo(cx-10,base-H*(0.25+0.15*k),cx+10,base-H*0.5); ctx.stroke(); }
        ctx.restore(); }}));
  },
  // a spark of Lightning onto the drenched dummy: it crackles twice as hard
  spark(){
    const st=staff(), m=dummyMid(); S.lect.cast=0.6;
    S.fx.push(mk({dur:0.5, add:true, bolt:bolt(st,m,2), draw(ctx,u){ drawBolt(ctx,this.bolt,1-u,2.5); }}));
    burst(m.x,m.y,dummy.wet>0?36:14,['#ffffff','#bcd4ff','#7aa8ff'],{v0:40,v1:dummy.wet>0?200:100,l1:0.5,r1:2.5}); dummy.hit=1; S.flash=0.35; if(dummy.wet>0) S.shakeV=4;
  },
  // Air: a gust from the staff, then a whirlwind that lifts the dummy clean off its stand
  whirlwind(){
    const D=dummy, dur=3.4; S.lect.cast=0.8;
    for(let i=0;i<14;i++){ const st=staff(); part({x:st.x,y:st.y+rnd(-8,8),vx:(D.x-st.x)*rnd(2,2.6),vy:rnd(-12,12),life:0.4,r:1.2,col:'rgba(235,250,255,0.9)',streak:true,add:true}); }
    S.fx.push(mk({x:D.x, dur, add:true,
      upd(dt,u){ const k=u<0.15?0:u<0.8?Math.min(1,(u-0.15)/0.2):Math.max(0,1-(u-0.8)/0.2);
        D.lift=34*ease(k); D.spin+=dt*14*k; if(u>0.95){ D.spin=0; }
        if(Math.random()<dt*30*k){ const a=rnd(0,6.28); part({x:D.x+Math.cos(a)*26, y:D.y-rnd(0,70), vx:-Math.sin(a)*60, vy:-rnd(10,40), life:0.7, r:rnd(1,2.2), col:pick(['rgba(200,180,140,0.8)','rgba(240,250,255,0.9)']), add:false}); }
        if(u>=0.999){ D.lift=0; D.spin=0; D.hit=1; burst(D.x,D.y-4,18,'rgba(220,240,255,0.9)',{v0:40,v1:120,flat:0.3,l1:0.6}); ring(D.x,D.y-3,'rgba(230,245,255,0.9)',60,0.6); } },
      draw(ctx,u){ const k=u<0.15?u/0.15*0.3:u<0.8?0.3+0.7*Math.min(1,(u-0.15)/0.2):Math.max(0,1-(u-0.8)/0.2);
        ctx.lineCap='round';
        for(let i=0;i<14;i++){ const hgt=i/13, y=D.y-4-hgt*92, rx=(12+hgt*30)*(0.6+0.4*k), ry=rx*0.28, a0=this.t*(9+i*0.4)+i*1.3;
          ctx.strokeStyle=`rgba(235,248,255,${0.55*k})`; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(D.x+Math.sin(this.t*3+i)*3,y,rx,ry,0,a0,a0+2.2); ctx.stroke(); } }}));
  },
  // Air's lecturer: his notes keep blowing away
  papers(o){
    const end=S.t+(o.secs||20);
    S.fx.push(mk({dur:o.secs||20, upd(dt){ if(Math.random()<dt*0.9&&S.t<end){ const L=S.lect; part({x:L.x+rnd(-6,6), y:L.y-40, vx:rnd(30,90)*(Math.random()<0.5?-1:1), vy:rnd(-60,-30), ay:30, drag:0.6, life:rnd(2.5,4), r:4, col:'#f2ead6', paper:true, rot:rnd(0,6), vr:rnd(-6,6), add:false}); } }, draw(){}}));
  },
  // Water's lecturer: a drip from her hem with every step
  drips(){
    S.fx.push(mk({dur:120, upd(dt){ const L=S.lect; if(Math.random()<dt*(L.moving?6:1.5)) part({x:L.x+rnd(-10,10), y:L.y-rnd(2,14), vx:0, vy:10, ay:200, life:0.18, r:1.5, col:'#8ac8f0'}); }, draw(){}}));
  },
  // Lightning's lecturer: sparks crawl between his fingers
  handSparks(o){
    S.fx.push(mk({dur:o.secs||30, add:true, upd(dt){ if(Math.random()<dt*10){ const st=staff(); burst(st.x+rnd(-8,8),st.y+rnd(-8,8),3,['#ffffff','#a8c8ff'],{v0:20,v1:70,l1:0.25,r1:1.8}); } },
      draw(ctx){ if(Math.random()<0.25){ const st=staff(), a={x:st.x+rnd(-14,14),y:st.y+rnd(-10,8)}; drawBolt(ctx,bolt(st,a,0),0.9,1); } }}));
  },
  // Lightning: a storm cloud swirls together over the dummy, flickers, and discharges
  storm(){
    const D=dummy, dur=3.2, cx=D.x, cy=D.y-118; let struck=[]; S.lect.cast=1.2;
    const puffs=[]; for(let i=0;i<16;i++) puffs.push({a:rnd(0,6.28), r:rnd(50,90), s:rnd(13,22), hx:rnd(-40,40), hy:rnd(-9,9)});
    S.fx.push(mk({x:cx, dur, add:false,
      upd(dt,u){ for(const [at,str] of [[0.55,0],[0.72,1]]) if(u>at&&!struck[str]){ struck[str]=true; const m=dummyMid();
          this['b'+str]=bolt({x:cx+rnd(-10,10),y:cy+10},{x:m.x,y:m.y-22},4); this['bt'+str]=this.t;
          burst(m.x,m.y-16,30,['#ffffff','#c8d8ff','#7aa0ff'],{v0:50,v1:210,l1:0.6,r1:3}); ring(D.x,D.y-3,'#bcd0ff',50,0.4); S.flash=0.8; S.shakeV=8; D.hit=1; D.char=Math.min(1,D.char+0.2);
          for(let i=0;i<5;i++) part({x:m.x+rnd(-6,6),y:m.y-20,vx:rnd(-8,8),vy:-20,life:1.6,r:5,col:'rgba(60,60,70,0.4)',smoke:true,grow:8}); } },
      draw(ctx,u){ const gather=ease(Math.min(1,u/0.45)), fade=Math.max(0,(u-0.8)/0.2);
        const at=p=>{ const a=p.a+this.t*2.4*(1-gather*0.7), r=p.r*(1-gather); return {x:cx+p.hx*gather+Math.cos(a)*r*1.3, y:cy+p.hy*gather+Math.sin(a)*r*0.35+fade*-10}; };
        for(const [dy,col,k] of [[3,[38,40,54],1],[-3,[92,96,118],0.75]]) for(const p of puffs){ const q=at(p);
          ctx.fillStyle=`rgba(${col[0]+fade*50},${col[1]+fade*50},${col[2]+fade*50},${0.9*(1-fade)})`; ctx.beginPath(); ctx.arc(q.x,q.y+dy,p.s*(0.6+gather*0.5)*k,0,Math.PI*2); ctx.fill(); }
        if(u>0.3&&u<0.85&&Math.random()<0.25){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(170,190,255,0.35)'; ctx.beginPath(); ctx.arc(cx+rnd(-25,25),cy+rnd(-6,6),rnd(10,20),0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
        ctx.globalCompositeOperation='lighter';
        for(const k of [0,1]) if(this['b'+k]){ const age=this.t-this['bt'+k]; if(age<0.35) drawBolt(ctx,this['b'+k],(age<0.08||(age>0.15&&age<0.22))?1:0.45,3.5); }
        ctx.globalCompositeOperation='source-over'; }}));
  },
  // Ice: the front row's inkwells freeze over (frost mist along the front tier)
  frostFront(){
    const th=S.th, y=th.rows[th.rows.length-1];
    for(let i=0;i<60;i++) part({x:rnd(T,(S.api.room().cols-1)*T), y:y-rnd(0,24), vx:rnd(-6,6), vy:rnd(-8,-2), life:rnd(1.5,3), r:rnd(1,2.2), col:pick(['#e8f8ff','#b8e8ff']), add:true});
  },
  // Ice: a snowflake the size of a cartwheel crystallises over the dummy, turns once and shatters
  snowflake(){
    const D=dummy, dur=3.4, cx=D.x, cy=D.y-62; let shattered=false; S.lect.cast=1.4;
    S.fx.push(mk({x:cx, dur, add:true,
      upd(dt,u){ if(!shattered&&u>0.82){ shattered=true; for(let i=0;i<34;i++){ const a=rnd(0,6.28), v=rnd(60,180);
          part({x:cx+Math.cos(a)*12,y:cy+Math.sin(a)*12,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7-30,ay:260,drag:0.5,life:rnd(0.7,1.3),r:rnd(3,6),col:pick(['#ffffff','#c8f0ff','#9ad8ff']),shard:true,rot:a,vr:rnd(-8,8),add:true}); }
          ring(cx,cy,'rgba(220,245,255,0.95)',70,0.5,1); S.flash=0.4; S.shakeV=5; D.frost=1.4; D.hit=1; } },
      draw(ctx,u){ if(u>0.83) return; const grow=ease(Math.min(1,u/0.55)), flare=u>0.7?(u-0.7)/0.12:0, R=46*grow;
        ctx.save(); ctx.translate(cx+(u>0.6?rnd(-1,1)*(u-0.6)*8:0),cy); ctx.rotate(this.t*0.6); ctx.scale(1,0.85);
        ctx.strokeStyle=`rgba(${200+55*flare},${240+15*flare},255,0.95)`; ctx.shadowColor='#a8e0ff'; ctx.shadowBlur=10+flare*20; ctx.lineCap='round';
        for(let i=0;i<6;i++){ ctx.save(); ctx.rotate(i*Math.PI/3); ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(R,0); ctx.stroke();
          ctx.lineWidth=1.8; for(const f of [0.35,0.6,0.82]){ const b=R*f, l=R*0.28*(1-f*0.5)*Math.min(1,grow*1.3); ctx.beginPath(); ctx.moveTo(b,0); ctx.lineTo(b+l*0.7,-l); ctx.moveTo(b,0); ctx.lineTo(b+l*0.7,l); ctx.stroke(); }
          ctx.restore(); }
        ctx.beginPath(); ctx.lineWidth=2; for(let i=0;i<6;i++){ const a=i*Math.PI/3; ctx[i?'lineTo':'moveTo'](Math.cos(a)*R*0.18,Math.sin(a)*R*0.18); } ctx.closePath(); ctx.stroke();
        ctx.restore(); }}));
  },
  // Earth: a boulder gathers over the lecturer's head, is heaved across and dropped on the dummy
  boulder(){
    const dur=2.6, form=1.3; let from=null, landed=false; S.lect.cast=2;
    const shape=[]; for(let i=0;i<9;i++) shape.push(rnd(0.78,1.12));
    S.fx.push(mk({dur, add:false,
      upd(dt,u){ const st=staff(), above={x:st.x, y:st.y-26};
        if(this.t<form){ this.x=above.x; this.y=above.y; if(Math.random()<dt*30){ const a=rnd(0,6.28), r=rnd(26,40); part({x:above.x+Math.cos(a)*r,y:above.y+Math.sin(a)*r*0.7,vx:-Math.cos(a)*55,vy:-Math.sin(a)*40,life:0.5,r:rnd(1.5,3),col:pick(['#a07850','#806040','#c0a070']),add:false}); } }
        else { if(!from) from={x:this.x,y:this.y}; const k=(this.t-form)/(dur-form-0.05), m={x:dummy.x, y:dummy.y-40};
          if(k<0.75){ const p=ELF(from,{x:m.x,y:m.y-46},k/0.75,26); this.x=p.x; this.y=p.y; } else { this.x=m.x; this.y=m.y-46+46*Math.min(1,(k-0.75)/0.25); }
          if(!landed&&k>=1){ landed=true; this.gone=true; burst(m.x,dummy.y-14,30,['#8a6a48','#6a5038','#b09070'],{v0:60,v1:200,g:420,l0:0.5,l1:1,r0:2,r1:5,add:false,shard:true,up:80});
            for(let i=0;i<12;i++) part({x:m.x+rnd(-24,24),y:dummy.y-rnd(0,10),vx:rnd(-50,50),vy:rnd(-20,-5),drag:1.5,life:rnd(1,1.8),r:rnd(6,11),col:'rgba(150,130,100,0.4)',smoke:true,grow:14});
            S.shakeV=11; dummy.hit=1; ring(m.x,dummy.y-3,'rgba(200,170,120,0.9)',80,0.7); } } },
      draw(ctx,u){ if(this.gone) return; const r=18*ease(Math.min(1,this.t/form)); if(r<1) return;
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.t*(this.t>form?5:0.5));
        ctx.fillStyle='#7a5c3e'; ctx.strokeStyle='#2e2014'; ctx.lineWidth=2; ctx.beginPath();
        shape.forEach((k,i)=>{ const a=i/shape.length*6.283; ctx[i?'lineTo':'moveTo'](Math.cos(a)*r*k,Math.sin(a)*r*k); }); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(210,180,130,0.55)'; ctx.beginPath(); ctx.arc(-r*0.3,-r*0.3,r*0.35,0,6.283); ctx.fill();
        ctx.strokeStyle='rgba(40,28,16,0.6)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-r*0.2,r*0.1); ctx.lineTo(r*0.4,r*0.3); ctx.stroke(); ctx.restore(); }}));
  },
  // the Arcane: violet runes drift up off the lecturer's book
  runes(o){
    S.fx.push(mk({dur:o.secs||8, upd(dt){ if(Math.random()<dt*5){ const L=S.lect; part({x:L.x+rnd(-12,12),y:L.y-34,vx:rnd(-6,6),vy:rnd(-26,-14),life:rnd(1.6,2.6),r:9,col:pick(['#c8a0ff','#a080ff','#e0c8ff']),glyph:GLYPHS[Math.floor(rnd(0,12))],add:true}); } }, draw(){}}));
  },
  // the Arcane: a volley of pulsing blue orbs on arcs into the dummy
  orbs(){
    const n=6; S.lect.cast=1.6;
    for(let i=0;i<n;i++){ const delay=0.25+i*0.18, dur=0.7, peak=rnd(30,80); let from=null, hit=false;
      S.fx.push(mk({dur:delay+dur, add:true,
        upd(dt){ if(this.t<delay) return; if(!from){ const st=staff(); from={x:st.x,y:st.y}; } const k=(this.t-delay)/dur, p=ELF(from,dummyMid(),Math.min(1,k),peak); this.x=p.x; this.y=p.y;
          if(Math.random()<dt*40) part({x:p.x,y:p.y,vx:rnd(-10,10),vy:rnd(-10,10),life:0.3,r:rnd(1.5,2.5),col:'#8aa8ff',add:true});
          if(!hit&&k>=0.98){ hit=true; burst(p.x,p.y,12,['#ffffff','#8aa8ff','#5a6aff'],{v0:40,v1:130,l1:0.45,r1:2.5}); dummy.hit=1; S.shakeV=Math.max(S.shakeV,3); if(i===n-1){ ring(dummy.x,dummy.y-3,'#8aa8ff',50,0.5); S.flash=0.3; } } },
        draw(ctx){ if(this.t<delay||hit) return; const r=6+Math.sin(this.t*20)*1.5, g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,r*2.2);
          g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.35,'rgba(150,170,255,0.95)'); g.addColorStop(1,'rgba(60,80,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(this.x,this.y,r*2.2,0,6.283); ctx.fill(); }}));
    }
  },
  // the Dark: a ring of runes at the dummy's feet whirls, slows, burns white and goes out in purple embers
  ritual(){
    const D=dummy, dur=3, runes=[6,9,2,4,6,9,2,4]; let burnt=false;
    S.fx.push(mk({x:D.x, dur, add:true,
      upd(dt,u){ if(!burnt&&u>0.78){ burnt=true; for(let i=0;i<40;i++){ const a=rnd(0,6.28); part({x:D.x+Math.cos(a)*34,y:D.y-3+Math.sin(a)*12,vx:rnd(-8,8),vy:rnd(-60,-20),life:rnd(0.8,1.6),r:rnd(1.5,3),col:pick(['#c080ff','#8040d0','#ffffff']),add:true}); }
          S.flash=0.3; D.hit=1; D.char=Math.min(1,D.char+0.35); } },
      draw(ctx,u){ const appear=Math.min(1,u/0.15), spin=this.t*(10*(1-ease(Math.min(1,u/0.7))))+u*8, hot=u>0.62?Math.min(1,(u-0.62)/0.15):0, out=u>0.8?(u-0.8)/0.2:0;
        ctx.save(); ctx.globalAlpha=appear*(1-out);
        ctx.strokeStyle=`rgba(${160+95*hot},${90+165*hot},255,0.8)`; ctx.lineWidth=2; ctx.shadowColor=hot?'#ffffff':'#a050ff'; ctx.shadowBlur=12+hot*16;
        ctx.beginPath(); ctx.ellipse(D.x,D.y-3,40,14,0,0,6.283); ctx.stroke(); ctx.beginPath(); ctx.ellipse(D.x,D.y-3,28,9.5,0,0,6.283); ctx.stroke();
        ctx.font='bold 13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=hot?`rgb(255,${200+55*hot},255)`:'#d8a8ff';
        runes.forEach((g,i)=>{ const a=spin+i/runes.length*6.283; ctx.fillText(GLYPHS[g],D.x+Math.cos(a)*34,D.y-3+Math.sin(a)*11.7); });
        ctx.restore(); }}));
  },
  // a ward: a bubble with orbiters of its element, on the lecturer or the dummy
  ward(o){
    const on=o.on||'lect', col=ECOL[o.elem]||'#a8e0ff', secs=o.secs||10;
    const w=mk({dur:secs, add:true, ward:true, on, col, elem:o.elem, hitT:-9, sealed:false, unravel:0,
      draw(ctx,u){ const c=on==='dummy'?{x:dummy.x,y:dummy.y-32}:{x:S.lect.x,y:S.lect.y-34}, k=Math.min(1,this.t/0.8)*Math.min(1,(secs-this.t)/0.6)*(1-this.unravel);
        if(k<=0) return; const rip=Math.max(0,1-(this.t-this.hitT)/0.6), rx=30+rip*4*Math.sin(this.t*40), ry=44+rip*3;
        const g=ctx.createRadialGradient(c.x,c.y,rx*0.4,c.x,c.y,rx*1.1); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.75,hexA(col,0.12*k)); g.addColorStop(1,hexA(col,(0.45+rip*0.4)*k));
        ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(c.x,c.y,rx,ry,0,0,6.283); ctx.fill();
        ctx.strokeStyle=hexA(col,0.7*k); ctx.lineWidth=1.5+rip*2; ctx.beginPath(); ctx.ellipse(c.x,c.y,rx,ry,0,0,6.283); ctx.stroke();
        for(let i=0;i<6;i++){ const a=this.t*1.6+i*1.047, x=c.x+Math.cos(a)*rx*1.05, y=c.y+Math.sin(a)*ry*0.35-8+(i%2)*14;
          if(this.elem==='ice'){ ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.fillStyle=`rgba(230,250,255,${0.9*k})`; ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(2,0); ctx.lineTo(0,5); ctx.lineTo(-2,0); ctx.closePath(); ctx.fill(); ctx.restore(); }
          else { ctx.fillStyle=hexA(col,0.9*k); ctx.beginPath(); ctx.arc(x,y,2.5,0,6.283); ctx.fill(); } }
        if(this.sealed){ ctx.save(); ctx.globalAlpha=k*Math.min(1,(this.t-this.sealT)*2); ctx.font='bold 10px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffe080'; ctx.shadowColor='#ffcc40'; ctx.shadowBlur=8;
          for(let i=0;i<8;i++){ const a=-this.t*0.8+i*0.785; ctx.fillText(GLYPHS[[8,9,10,4][i%4]],c.x+Math.cos(a)*rx*0.95,c.y+ry*0.82+Math.sin(a)*6); } ctx.restore(); } }});
    S.fx.push(w); return w;
  },
  seal(){ const w=S.fx.find(f=>f.ward); if(w){ w.sealed=true; w.sealT=w.t; burst(S.lect.x,S.lect.y-4,16,['#ffe080','#ffcc40'],{v0:20,v1:80,flat:0.3,l1:0.6}); } },
  // On Wards: Rook throws a spark at the Professor's ward, which ripples and holds
  studentBolt(){
    const s=S.rook; if(!s) return; s.jolt=1;
    const from={x:s.x+s.face*8, y:headY(s)+18}; let hit=false;
    S.fx.push(mk({dur:0.7, add:true,
      upd(dt,u){ const to={x:S.lect.x, y:S.lect.y-34}, p=ELF(from,to,u,20); this.x=p.x; this.y=p.y; part({x:p.x,y:p.y,vx:rnd(-15,15),vy:rnd(-15,15),life:0.25,r:2,col:'#ffaa44',add:true});
        if(!hit&&u>=0.98){ hit=true; const w=S.fx.find(f=>f.ward); if(w) w.hitT=w.t; burst(p.x,p.y,18,['#ffcc66','#ffffff','#a8e0ff'],{v0:40,v1:140,l1:0.5}); S.shakeV=3; } },
      draw(ctx){ if(hit) return; const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,8); g.addColorStop(0,'#fff6c0'); g.addColorStop(1,'rgba(255,120,40,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(this.x,this.y,8,0,6.283); ctx.fill(); }}));
  },
  // On Unmaking: the dummy's ward comes apart in threads
  unravel(){
    const w=S.fx.find(f=>f.ward&&f.on==='dummy'); if(!w) return; const c={x:dummy.x,y:dummy.y-32};
    S.fx.push(mk({dur:2, add:true, upd(dt,u){ w.unravel=ease(u); if(u>=1) w.dead=true;
        if(Math.random()<dt*30){ const a=rnd(0,6.28); part({x:c.x+Math.cos(a)*30,y:c.y+Math.sin(a)*44,vx:Math.cos(a)*40,vy:Math.sin(a)*30-20,ax:-Math.sin(a)*60,ay:Math.cos(a)*60,life:rnd(0.8,1.3),r:1.6,col:pick([w.col,'#ff88cc','#ffffff']),thread:true,add:true}); } }, draw(){}}));
  },
};
function hexA(h,a){ const n=parseInt(h.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${Math.max(0,Math.min(1,a)).toFixed(3)})`; }
function bolt(a,b,branches){
  const pts=[a], n=9; for(let i=1;i<n;i++){ const u=i/n; pts.push({x:a.x+(b.x-a.x)*u+rnd(-9,9), y:a.y+(b.y-a.y)*u+rnd(-5,5)}); } pts.push(b);
  const br=[]; for(let k=0;k<branches;k++){ const s=pts[2+Math.floor(rnd(0,n-3))], l=[s]; let p=s; for(let i=0;i<3;i++){ p={x:p.x+rnd(-14,14),y:p.y+rnd(4,12)}; l.push(p); } br.push(l); }
  return {pts, br};
}
function drawBolt(ctx,b,a,w){
  const line=(pts,lw,col)=>{ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); pts.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y)); ctx.stroke(); };
  ctx.save(); ctx.globalAlpha=a; ctx.lineJoin='round'; ctx.shadowColor='#9ab8ff'; ctx.shadowBlur=14;
  line(b.pts,w*2.2,'rgba(130,160,255,0.6)'); line(b.pts,w,'#ffffff'); for(const l of b.br) line(l,w*0.5,'#dfe8ff'); ctx.restore();
}

// ── drawn over everything (after the room's lighting): the effects, speech, the fades ──
function drawOver(ctx,t,v){
  // the lamps out (Dr Crowe): darker than the room's lighting can go, but the magic still shines through
  if(S.dimV>0.6){ ctx.fillStyle=`rgba(4,2,10,${Math.min(0.8,(S.dimV-0.6)*2.4)})`; ctx.fillRect(v.x-2,v.y-2,v.w+4,v.h+4); }
  // effects and particles
  for(const f of S.fx){ ctx.save(); if(f.add) ctx.globalCompositeOperation='lighter'; f.draw(ctx,Math.min(1,f.t/f.dur)); ctx.restore(); }
  for(const p of S.parts){ const k=Math.max(0,p.life/p.max);
    ctx.save(); ctx.globalAlpha=p.smoke?k*0.9:Math.min(1,k*1.4); if(p.add) ctx.globalCompositeOperation='lighter';
    if(p.glyph){ ctx.fillStyle=p.col; ctx.shadowColor=p.col; ctx.shadowBlur=8; ctx.font=`${p.r+3}px serif`; ctx.textAlign='center'; ctx.fillText(p.glyph,p.x,p.y); }
    else if(p.paper){ ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot*2),1); ctx.fillStyle=p.col; ctx.fillRect(-4,-3,8,6); ctx.fillStyle='rgba(60,40,20,0.5)'; ctx.fillRect(-3,-1,6,1); }
    else if(p.shard){ ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col; ctx.fillRect(-p.r,-p.r*0.35,p.r*2,p.r*0.7); }
    else if(p.streak||p.thread){ ctx.strokeStyle=p.col; ctx.lineWidth=p.r; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.05,p.y-p.vy*0.05); ctx.stroke(); }
    else { const r=p.smoke?p.r+(1-k)*(p.grow||0):p.r; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.283); ctx.fill(); }
    ctx.restore(); }
  if(S.flash>0){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,250,235,${S.flash*0.25})`; ctx.fillRect(v.x,v.y,v.w,v.h); ctx.restore(); }
  // speech: a fixed size on screen, whatever the zoom
  const k=1/v.zoom;
  for(const m of S.mutters){ const a=Math.min(1,m.left/300); bubble(ctx,v,k,m.who.x,headY(m.who)-4,m.text,MUTTER_PX,200,a,null,false,true); }
  const b=S.bubble;
  if(b){ const who=b.who, isL=who===S.lect, hx=who.x, hy=isL?who.y-S.api.WIZ_H*LECTURER-4:headY(who)-4;
    bubble(ctx,v,k,hx,hy,b.text.slice(0,Math.floor(b.shown)),isL?SAY_PX:SAY_PX-2,SAY_W,1,b.name,b.whisper,false,b.shown>=b.text.length, b.text); }
  // the fades: in when the students are seated, out at the end
  const black=!S.ready?1:S.fadeOut?Math.min(1,S.fadeOut):1-S.fadeIn;
  if(black>0){ ctx.fillStyle=`rgba(8,8,14,${black})`; ctx.fillRect(v.x-2,v.y-2,v.w+4,v.h+4);
    if(!S.ready){ ctx.save(); ctx.fillStyle='#c9a84c'; ctx.font=`${16*k}px Cinzel, serif`; ctx.textAlign='center'; ctx.fillText('The students file in…',v.x+v.w/2,v.y+v.h/2); ctx.restore(); } }
}
// a speech bubble: wrapped text in a parchment box above (hx, hy), kept on screen; full is the whole
// line, so the box is sized for it from the first letter and doesn't grow as it types
function bubble(ctx,v,k,hx,hy,text,pxSize,maxW,alpha,name,whisper,small,done,full){
  full=full||text;
  const fs=pxSize*k, pad=10*k, lh=fs*1.3, mw=Math.min(maxW, v.w/k-36)*k;
  ctx.save(); ctx.globalAlpha=alpha; ctx.font=`${whisper?'italic ':''}${fs.toFixed(2)}px Georgia, 'Times New Roman', serif`;
  const wrap=s=>{ const out=[]; let line=''; for(const w of s.split(' ')){ const tl=line?line+' '+w:w; if(ctx.measureText(tl).width>mw-pad*2&&line){ out.push(line); line=w; } else line=tl; } if(line) out.push(line); return out; };
  const lines=wrap(full), shown=[]; let left=text.length;
  for(const l of lines){ if(left<=0) break; shown.push(l.slice(0,left)); left-=l.length+1; }
  const tw=Math.max(...lines.map(l=>ctx.measureText(l).width))+pad*2, nh=name?fs*0.85:0, bh=lines.length*lh+pad*1.6+nh;
  const bx=clamp(hx-tw/2, v.x+6*k, v.x+v.w-tw-6*k), by=clamp(hy-bh-8*k, v.y+44*k, v.y+v.h-bh-10*k);
  ctx.fillStyle=whisper?'rgba(232,226,246,0.96)':'rgba(250,242,218,0.97)'; ctx.strokeStyle=whisper?'rgba(80,60,120,0.85)':'rgba(70,46,20,0.9)'; ctx.lineWidth=1.6*k;
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx,by,tw,bh,6*k); else ctx.rect(bx,by,tw,bh); ctx.fill(); ctx.stroke();
  const tx=clamp(hx,bx+10*k,bx+tw-10*k);
  if(hy-8*k>by+bh){ ctx.beginPath(); ctx.moveTo(tx-6*k,by+bh-1); ctx.lineTo(tx+6*k,by+bh-1); ctx.lineTo(tx,by+bh+8*k); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx-6*k,by+bh); ctx.lineTo(tx,by+bh+8*k); ctx.lineTo(tx+6*k,by+bh); ctx.stroke(); }
  if(name){ ctx.fillStyle=whisper?'#5a3a8a':'#8a5a18'; ctx.font=`bold ${(fs*0.68).toFixed(2)}px Cinzel, serif`; ctx.textBaseline='top'; ctx.fillText(name,bx+pad,by+pad*0.6); }
  ctx.fillStyle=whisper?'#3a2858':'#2e1e0c'; ctx.font=`${whisper?'italic ':''}${fs.toFixed(2)}px Georgia, 'Times New Roman', serif`; ctx.textBaseline='top';
  shown.forEach((l,i)=>ctx.fillText(l,bx+pad,by+pad*0.8+nh+i*lh));
  if(done&&!small){ ctx.fillStyle=`rgba(138,90,24,${0.5+0.5*Math.sin(performance.now()/250)})`; ctx.beginPath(); const ax=bx+tw-pad, ay=by+bh-pad*0.7; ctx.moveTo(ax-4*k,ay-3*k); ctx.lineTo(ax+2*k,ay); ctx.lineTo(ax-4*k,ay+3*k); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

const API=window.ExploreLecture={play, under, props, SCRIPTS, LOOKS, face:()=>S&&S.face, speed:1, _S:()=>S, _fx:(n,o)=>{ if(n==='glyphs') glyphTrace(o); else FX[n](o||{}); }};   // speed: tests only
})();
