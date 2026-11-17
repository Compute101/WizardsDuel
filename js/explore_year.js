// The University Year (docs/world-design.md, "The University Year"): the three terms at Wrenford after
// Matriculation. Lectures in the Examination Schools, practicals (js/explore_folk.js, Fizzwick and the
// Master of the Schools), the Boxing Club, your tutorial partner (Wil or Nell Ashby), the terms' exams
// (Collections, then Finals), incidents in the streets, and the mystery of All Absent underneath it all.
// Runs through folkApi (js/explore.js); its state is quests.year (saved with the game).
// ExploreYear: knows(role) / title / sprite / talk(n, api) for its people; onMap, tick, afterFight,
// doors, blockExit, allyKnown and journal for explore.js.
(function(){
'use strict';

const up = s => s.charAt(0).toUpperCase()+s.slice(1);
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const T = 64;
const TERMS = ['', 'Michaelmas', 'Hilary', 'Trinity'];
const RIDERS = {     // what a strike of each element leaves behind (the lectures' second question)
  fire:'a scorch', water:'a drench: their next Lightning hits harder, their next Fire is doused', air:'a gust that skips over guarding minions',
  earth:'nothing extra, but it is magic: a ward stops it', lightning:'a mana burn', ice:'frostbite', arcane:'it unweaves their enchantments', dark:'dread'};
const REWARD = {partner:5, box:10, coll:{gold:30, potions:2}, first:20, finals:{gold:50, potions:3}, lectPotion:1, brawl:10, gate:15, echo:8, plotGold:40};

// ── who's who (stand-in art until theirs arrives: docs/art-prompts.md) ──
const PEOPLE = {
  lecturer: {title:'The Lecture List', sprite:'sprites/hero/old_man_2.png'},
  examiner: {title:'The Chair of Examiners', name:'Professor Thorley', sprite:'sprites/hero/old_woman_2.png'},
  partner:  {title:'Your Tutorial Partner', sprite:null},          // drawn from their made look (chars.partner)
  partnerLost:{title:'Your Tutorial Partner', sprite:null},
  ashgrove: {title:'The Sub-Warden of All Absent', name:'Dr Edwin Ashgrove', sprite:null},
  fancy:    {title:'The Wrenford Fancy', name:'Gentleman Jem', sprite:'sprites/soldier.png'},
  hooded:   {title:'A Hooded Figure', sprite:'sprites/hero/mid_man_2.png'},
  brawl:    {title:'Town v Gown', sprite:'sprites/soldier.png'},
  gateward: {title:'A Failing Ward', sprite:'sprites/halberdier.png'},
  landlady: {title:'The Landlady of the Wren\'s Nest', name:'Mrs Dorcas Pegg', sprite:'sprites/hero/mid_woman_1.png'},
  squop:    {title:'A Winks Player', name:'Old Bartholomew "Squop" Hale', sprite:'sprites/hero/old_man_1.png'},
};
const knows = role => !!PEOPLE[role];

// ── the lecturers and what they say (each student hears their home element's and three electives') ──
const LECT = {
  fire:{who:'Dr Ignatius Pyle', text:'A stout man with no eyebrows strides to the front. The front row is empty; it always is. "Fire! The most honest of the elements. It wants one thing: more." A flick of the tongs and a ball of flame hangs over the bench, swelling. "Feed it and it grows. Hold it and it grows. Throw it, quickly, before it decides to grow on you." The ball streaks into a dummy, which goes up like a haystack. "Strong strikes leave a scorch behind. And never, ever stand in front of the Water students in an exam."'},
  water:{who:'Miss Perpetua Wells', text:'A tall, damp woman takes the lectern; a drip falls from her hem with every step. "Water does not hit. It arrives." A wave curls out of nothing and crashes over the dummy. "It soaks in, too. Anything a Water strike lands on is drenched: the next Lightning that finds it hits harder, and the next Fire is doused. Remember that when you choose your friends."'},
  air:{who:'Professor Halcyon Drift', text:'An old man in a gown that never stops flapping paces the stage from end to end. His notes keep blowing away; he keeps not picking them up. "Air is the element of getting past. Past walls. Past guards. Past those who stand in the way." A whirlwind lifts the dummy clean off its stand. "An Air strike gusts over the minions guarding a wizard, straight at the wizard. Very rude. Very useful."'},
  earth:{who:'Dr Agnes Barrow', text:'A sturdy, sun-browned woman stands among crates of rocks she has asked you twice not to touch. "Earth. Before the Unweaving we taught it as a separate art, Physical, and the Collegium paid for that mistake." A boulder heaves up over her head and drops on the dummy. "Hear me: Earth is magic. A ward stops it like any other strike. And a blow is not Earth. Don\'t confuse the two in the field."'},
  lightning:{who:'Dr Erasmus Fulmer', text:'A wiry man whose hair stands straight up bounds to the bench, sparks crawling between his fingers. "Lightning! The fastest working there is, and the greediest." A storm cloud gathers over the dummy and splits it with a bolt. "It doesn\'t just hurt. It burns the mana out of whoever it strikes. A wizard with no mana is a wizard with a stick."'},
  ice:{who:'Professor Ingrid Rime', text:'A tall, stern woman in a white fur hat takes the lectern. The inkwells in the front row freeze over. "Ice is patience made solid." A snowflake the size of a cartwheel crystallises over the dummy, turns once and shatters. "A strong Ice strike leaves frostbite in the wound. It will slow them down long after you have stopped." Her breath mists. "Questions?"'},
  arcane:{who:'Dr Oriel Nightingale', text:'A slight scholar of no particular age opens a book, and violet runes drift up off its pages. "The Arcane is the element beneath the other elements (see Collegium, Lectures, vol. IV, sadly lost). It shares a glyph with each of them (see your primer, pp. 1 to 4)." A volley of pulsing blue orbs pours into the dummy. "A strong Arcane strike unweaves its target\'s enchantments, which is to say, footnote one: very annoying for them."'},
  dark:{who:'Dr Lavinia Crowe', text:'The lamps go out. In the dark a calm voice begins. "I am the only Fellow of this University who went into Corvanthe after the Unweaving and came back out." A ring of runes lights on the floor round the dummy, whirls, and burns white. "The Dark is not evil. It is the element of endings, and everything ends. A strong Dark strike leaves dread behind it." The lamps come back on. She is standing exactly where she was.'},
  wards:{who:'Professor Ingrid Rime', text:'"Today: walls." Professor Rime raises a ward round herself, and frost orbits it. "A ward stops magic. It does not stop a fist, a blade or a bite; for those you want Ironskin, and the Master of the Schools will teach you that. A ward resists every element but one: its opposite, across the wheel, unravels it. A sealed ward does not wear, and a dispel must break the seal before it can touch the ward." She taps it. "Build your walls in an element your foe cannot cast."'},
  unmaking:{who:'Dr Oriel Nightingale', text:'"Unmaking (see Statutes, III: no working that cannot be undone)." Dr Nightingale lifts a hand and the ward round a dummy comes apart in threads. "A dispel breaks wards: twice as hard if it is the ward\'s opposite element. With no ward to break, it strips an enchantment instead. And one may unmake one\'s own curses: Cleanse. Footnote: the Dispel glyphs are in the Library. Footnote two: you will need them."'},
};
const QUESTIONS = {
  wards:[['What unravels a ward fastest?',['Its opposite element','Its own element','Any Greater strike','A blow'],0],
         ['What does a ward stop?',['Magic, never blows','Blows, never magic','Everything','Only curses'],0]],
  unmaking:[['What does a dispel do when there is no ward to break?',['Strips an enchantment','Nothing at all','Heals its caster','Breaks a minion'],0],
            ['What does a seal do to a dispel?',['The dispel only breaks the seal','Doubles it','Nothing','Turns it on its caster'],0]],
};
function lectQuestions(id, api){
  if(QUESTIONS[id]) return QUESTIONS[id];
  const opp=api.elems[(api.elems.indexOf(id)+4)%8];
  const others=shuffle(api.elems.filter(e=>e!==id&&e!==opp)).slice(0,3);
  const q1=['What is '+up(id)+'\'s opposite, across the wheel?', shuffle([opp].concat(others)).map(up)];
  q1.push(q1[1].indexOf(up(opp)));
  const wrong=shuffle(Object.keys(RIDERS).filter(e=>e!==id)).slice(0,3).map(e=>RIDERS[e]);
  const opts=shuffle([RIDERS[id]].concat(wrong));
  const q2=['What does a strong '+up(id)+' strike leave behind?', opts.map(up), opts.indexOf(RIDERS[id])];
  return [q1,q2];
}

// ── state ──
function Y(api){
  const y=api.quest('year');
  y.primers=y.primers||{}; y.prac=y.prac||{}; y.lect=y.lect||{}; y.ans=y.ans||{};
  y.plot=y.plot||{}; y.box=y.box||0; y.spars=y.spars||{}; y.exams=y.exams||{}; y.inc=y.inc||{};
  y.winks=y.winks||{wins:0, losses:0};
  return y;
}
const W = api => api.quest('wren');
const mg = api => api.magic&&api.magic();
// the Year runs for a made wizard who hasn't graduated (a roster wizard, or an old save, knows it all)
const learning = api => { const m=mg(api); return !!m&&!m.grad; };
const term = api => Y(api).term||0;
const electives = api => { const m=mg(api); return m?m.elems.filter(e=>e!==api.homeElem()):[]; };
const knowsCat = (api,c) => { const m=mg(api); return !m||m.cats.includes(c); };

// what a term needs before its exam (and what's left), for the examiner and the journal
function termNeeds(api){
  const t=term(api), m=mg(api), y=Y(api), left=[];
  if(!m) return left;
  if(electives(api).length<Math.min(t,3)) left.push('learn '+(t===1?'an elective element':t===2?'a second elective element':'a third elective element')+' (its primer, its lecture and Fizzwick\'s practical)');
  if(t===1&&!y.plot.b2) left.push(y.plot.b1?'find out what the hooded figure was doing in Founders\' Quad (after dark)':'see to the trouble in the Covered Market');
  if(t>=2&&!m.cats.includes('protect')) left.push('learn to ward (the lecture On Wards, then Fizzwick\'s practical)');
  if(t>=2&&!m.skin) left.push('learn Ironskin (the Master of the Schools)');
  if(t===2&&!y.plot.b4) left.push(y.plot.b3?'go down into the Undercroft, under the Covered Market':'see what Mr Quill wants (the Library)');
  if(t>=3&&!m.cats.includes('dispel')) left.push('learn to dispel (Dispel\'s primer, the lecture On Unmaking, then Fizzwick\'s practical)');
  if(t===3&&!y.plot.b6) left.push(y.plot.b5?(y.plot.b6go?'find '+partnerName(api)+': beneath the Orrery, in Radcliffe Square':'finish the term\'s work; then come back to the Examination Schools'):'hear what Aurelia has seen (Radcliffe Square)');
  return left;
}

// ── characters made at run time: Wil / Nell (your partner) and Dr Ashgrove ──
let made=null;
function partnerName(api){ const h=api.hero(); return h&&h.sex==='m'?'Nell':'Wil'; }
function partnerElem(api){ return api.barred()||'water'; }
function ensureChars(api){
  if(made) return made;
  const h=api.hero(); if(!h) return Promise.resolve();
  const sex=h.sex==='m'?'f':'m', name=partnerName(api)+' Ashby';
  made=Promise.all([
    api.heroDef({name, sex, age:'young', fig:sex==='m'?'young_man_2':'young_woman_2', robe:'Russet', trim:'Bone', hair:'Brown', skin:'Fair', eyes:'Hazel', elem:partnerElem(api)}),
    api.heroDef({name:'Edwin Ashgrove', sex:'m', age:'old', fig:'old_man_1', robe:'Ash', trim:'Silver', hair:'Silver', skin:'Pale', eyes:'Grey', elem:'arcane'}),
  ]).then(([p,a])=>{
    if(p) api.registerChar('partner', Object.assign({}, p, {title:'A First-Year, of '+up(partnerElem(api)), hp:44, phys:{atk:5}, hero:false, forbidden:[api.homeElem()].filter(Boolean)}));
    if(a) api.registerChar('ashgrove', Object.assign({}, a, {title:'Sub-Warden of All Absent', hp:72, phys:{atk:3}, hero:false, forbidden:['dark'], arena:'ruins'}));
  }).catch(e=>{ console.error(e); made=null; });
  return made;
}
// your partner learns as you do: their own element plus as many electives as you have, your wheels and rings
const PARTNER_ELECTIVES = ['air','arcane','earth','ice','lightning','fire','dark','water'];
function partnerKnown(api){
  const m=mg(api)||{cats:['damage','protect','dispel'], rings:3, elems:[1,2,3,4], skin:true};
  const own=partnerElem(api), ban=api.homeElem();
  const el=[own].concat(PARTNER_ELECTIVES.filter(e=>e!==own&&e!==ban).slice(0,Math.max(0,m.elems.length-1)));
  return {glyphs:api.glyphs.map((_,i)=>i), elems:el, cats:m.cats.slice(), rings:m.rings||1, skin:!!m.skin};
}
function allyKnown(x, api){ return x.key==='partner'?partnerKnown(api):undefined; }

// ── titles and sprites ──
function title(n, api){
  const P=PEOPLE[n.role]; if(!P) return null;
  if(n.role==='partner'||n.role==='partnerLost') return partnerName(api)+' Ashby, '+P.title.toLowerCase().replace('your ','your ');
  return P.name?P.title+' ('+P.name+')':P.title;
}
function sprite(n, api){
  const P=PEOPLE[n.role]; if(!P) return null;
  if(n.role==='partner'||n.role==='partnerLost'){ const c=api.chars.partner; return c&&c.sprite; }
  if(n.role==='ashgrove'){ const c=api.chars.ashgrove; return c&&c.sprite; }
  return P.sprite;
}

// ── exams: the examiner calls spells, you cast them (practiseCast), then a viva for Finals ──
const TIER_NAME = ['Lesser','','Greater'];
function callName(c){ const w={damage:'strike',protect:'ward',dispel:'dispel'}[c.cat]; return (TIER_NAME[c.tier-1]?TIER_NAME[c.tier-1]+' ':'')+w+', '+up(c.elem); }
function examCalls(api, n){
  const m=mg(api), rings=Math.min(2,m.rings||1), all=[];
  for(const cat of m.cats) for(const elem of m.elems) for(let t=1;t<=rings;t++) all.push({cat, elem, tier:t});
  const out=[]; let pool=shuffle(all);
  while(out.length<n){ if(!pool.length) pool=shuffle(all); out.push(pool.pop()); }
  return out;
}
function runExam(api, kind, done){
  const y=Y(api), n=kind==='finals'?10:6, need=Math.ceil(n*0.7), calls=examCalls(api,n), who='Professor Thorley';
  const tries=(y.exams[kind+'Tries']=(y.exams[kind+'Tries']||0)+1); api.save();
  let i=0, score=0;
  const next=last=>{
    if(i>=n){ done(score>=need, score, n, tries); return; }
    const c=calls[i];
    api.dialog(who+' · '+(kind==='finals'?'Finals':'Collections')+' · '+(i+1)+' of '+n,
      (last||'')+'"'+callName(c)+'."'+(i===0?'\n\n(Cast each call as it\'s given. '+need+' of '+n+' to pass. Retakes whenever you like.)':''),
      [{label:'Cast it', fn:async()=>{ const ok=await api.practise(c); if(ok) score++; i++; next((ok?'A nod, and a mark in the book.':'A pause, and a different mark in the book.')+' '+score+' of '+i+'.\n\n'); }}]);
  };
  next('');
}

// ── talk ──
function talk(n, api){
  if(!PEOPLE[n.role]) return false;
  const y=Y(api), say=(t,x,ch)=>api.dialog(t||title(n,api),x,ch||[]), me=api.wizName();
  switch(n.role){

  case 'lecturer': {
    if(!(W(api).stage>=1)){ say(null,'A board of lecture notices, most of them for a University you aren\'t a member of yet. "Members only. Matriculate first."'); return true; }
    if(!learning(api)){ say(null,'The lecture list for the term, pinned up in a neat hand. You know all of this already; you could give half of these lectures yourself.'); return true; }
    const t=Math.max(1,term(api)), home=api.homeElem(), ban=api.barred(), el=electives(api);
    const heardElect=api.elems.filter(e=>e!==home&&y.lect[e]).length, allowed=Math.min(3,t);
    const list=[];
    const add=(id,label,ok,why)=>list.push({label:(y.lect[id]?'✓ ':'')+label+(ok?'':' ('+why+')'), disabled:!ok, fn:()=>lecture(api,id)});
    add(home, LECT[home].who+': On '+up(home)+' (your element)', true);
    for(const e of api.elems){ if(e===home||e===ban) continue;
      const free=y.lect[e]||heardElect<allowed;
      add(e, LECT[e].who+': On '+up(e), free, heardElect>=3?'your timetable is full':'next term'); }
    add('wards', LECT.wards.who+': On Wards', t>=2, 'Hilary term');
    add('unmaking', LECT.unmaking.who+': On Unmaking', t>=3, 'Trinity term');
    say('The Lecture List','The Examination Schools\' lecture theatre: tiered benches, a long scorched demonstration bench, and a list on the board. '+(t?TERMS[Math.min(3,t)]+' term. ':'')+'You may hear '+allowed+' elective element'+(allowed>1?'s':'')+' by this term (you\'ve heard '+heardElect+'), and your own element whenever you like. '+up(ban)+' isn\'t offered to you: your gift runs the other way.',list.concat({label:'Not now'}));
    return true;
  }

  case 'examiner': {
    if(!learning(api)){ say(null,'Professor Thorley, small and terrifying, looks up from a pile of scripts. "You\'ve graduated. I remember your viva. So, I suspect, do you."'); return true; }
    const t=term(api);
    if(!t){ say(null,'Professor Thorley, small and terrifying, looks up from a pile of scripts. "Matriculate first. Then lectures. Then, at the end of term, me."'); return true; }
    const left=termNeeds(api), kind=t>=3?'finals':'coll'+t, label=t>=3?'Finals':'Collections';
    if(left.length){ say(null,'Professor Thorley looks up from a pile of scripts. "'+TERMS[t]+' term. '+label+' when you\'re ready, and you are not ready. Still to do: '+left.join('; ')+'."'); return true; }
    say(null,'"'+me+'. '+label+'?" Professor Thorley uncaps a pen. "I shall call spells. You will cast them. '+(t>=3?'Ten calls, then a viva: a bout with the Master of the Schools, holding back nothing you have been taught.':'Six calls.')+' Seven in ten to pass, and you may sit again as often as you like. Nobody here has ever failed for good, only for now."',[
      {label:'Sit '+label, fn:()=>runExam(api, kind, (pass,score,n,tries)=>{
        if(!pass){ say(null,score+' of '+n+'. Professor Thorley writes something short. "Not yet. Go and practise; the Laboratory\'s open. Come back whenever you like."'); return; }
        if(t>=3){ viva(api, tries); return; }
        y.exams[kind]=true; y.term=t+1; api.addGold(REWARD.coll.gold+(tries===1?REWARD.first:0)); api.addPotions(REWARD.coll.potions);
        if(t===1) api.learn({rings:2});
        api.save();
        say(null,score+' of '+n+'. "Passed'+(tries===1?', and at the first sitting. A First, in fact':'')+'." Professor Thorley signs the slip. "'+(t===1?'You may cast at the middle ring from today. Use it carefully. ':'')+TERMS[t+1]+' term begins. Off you go."');
        api.toast('Collections passed! +'+(REWARD.coll.gold+(tries===1?REWARD.first:0))+' gold, +'+REWARD.coll.potions+' potions'+(t===1?' · middle ring unlocked':'')+' · '+TERMS[t+1]+' term');
      })},
      {label:'Not yet'}]);
    return true;
  }

  case 'partner': return talkPartner(n, api);
  case 'partnerLost': case 'ashgrove': return talkFinale(n, api);

  case 'fancy': {
    const rungs=['boxer_tolley','boxer_meg','boxer_horace','boxer_jem'];
    const tips=['"Tolley? Two and a breather," says the Head Porter, who coaches the club, leaning on the ropes. "Two jabs, then he covers up. Count them. When he covers, grab him."',
      '"Meg does whatever you just did," the Porter says. "Think about that. What beats what you did last?"',
      '"Horace waits for you to cover up, then he\'s on you like a bear. So don\'t cover up, or cover up and hit him while he grabs at nothing."',
      '"Jem? Attack, Guard, Grapple, Attack, Guard, Grapple, a proper gentleman. Hurt him and he starts reading you instead. Then do what you did on the others: think a move ahead of him."'];
    const r=y.box;
    if(!(W(api).stage>=1)){ say(null,'A chalked ring in the Schools\' yard, ropes slung between posts. A tall, moustached man in shirtsleeves bows. "Gentleman Jem, Captain of the Wrenford Fancy. Members of the University only, I\'m afraid. Matriculate, and come and be hit."'); return true; }
    if(r>=rungs.length){ say(null,'Gentleman Jem bows. "The Champion! Come back any time and keep us honest." He touches his brow. "Nobody here forgets a bout like that."',[
      {label:'A friendly bout with Jem', fn:()=>box(api,'boxer_jem',false)},{label:'Not now'}]); return true; }
    const f=api.fighters[rungs[r]]||{}, nm=(f.name||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    say(null,(r?'"Next on the card: '+nm+'."':'A chalked ring in the Schools\' yard, ropes slung between posts. A tall, moustached man in shirtsleeves bows. "Gentleman Jem, Captain of the Wrenford Fancy. Bare knuckles, no magic, no hard feelings: the Statutes are very clear about magic in the ring. Fists, a guard, a grapple. Every one of us has a way of fighting, and the club\'s secret is that you can learn it." He grins. "First on the card: '+nm+'."')+'\n\n'+tips[r]+'\n\n(Purse: '+REWARD.box+' gold a win. Beat the Champion and you\'ll hit harder for good.)',[
      {label:'Box '+nm, fn:()=>box(api,rungs[r],true)},{label:'Not now'}]);
    return true;
  }

  case 'hooded': {
    say(null,'A figure in a dark gown is kneeling by the chapel wall in Founders\' Quad, chalking something on the stones. Spill glitters in a bag beside them. They look up, see you, and run.\n\nA whistle shrieks. Two Bulldogs come through the gate at a run, see you standing over a bag of contraband spill, and come straight for you.',[
      {label:'Put up your fists', fn:()=>api.battle({fists:true,
        foes:[{key:'halberdier',level:0,name:'Bulldog Pike'},{key:'halberdier',level:0,name:'Bulldog Crane'}],
        text:{winTitle:'Over the Wall', win:'You leave two Bulldogs sitting in the flower bed and are over the wall before the whistles start again. In your hand, without quite knowing how, is something the figure dropped: an old iron key, stamped UNDERCROFT.', loseTitle:'Caught', lose:'The Bulldogs march you to the Proctors, who fine you five gold and believe nothing. In the morning the Head Porter hands you something "found in the Quad, by your feet": an old iron key, stamped UNDERCROFT.'},
        onWin:()=>{ y.plot.b2=true; api.dropNpc('hooded'); api.save(); api.toast('Clue: an iron key stamped UNDERCROFT'); },
        onLose:()=>{ y.plot.b2=true; api.addGold(-5); api.dropNpc('hooded'); api.save(); api.toast('Fined 5 gold. Clue: an iron key stamped UNDERCROFT'); }})},
      {label:'Run', fn:()=>{ api.toast('You slip away. They\'ll be back another night.'); api.dropNpc('hooded'); }}]);
    return true;
  }

  case 'brawl': {
    say(null,'Outside the Bird and Bell, two townies have a student up against the wall by his gown. "Scholars! Prices doubled since you lot came, and your Word blew up a city." One of them turns to you and spits on his palms. "You want some, gown?"\n\n(No spells in the street: Statute the Fourth. Fists only.)',[
      {label:'Step in', fn:()=>api.battle({fists:true, foes:[{key:'soldier',level:0,name:'A Townie'},{key:'archer',level:0,name:'His Mate'}],
        text:{winTitle:'Town Nil, Gown One', win:'They pick themselves up and go off muttering. The student presses some coins on you: "I\'d have been fine. Probably."', loseTitle:'Gown Nil', lose:'You come round in the gutter with the student fanning you with a lecture note.'},
        onWin:()=>{ api.addGold(REWARD.brawl); endIncident(api); api.toast('+'+REWARD.brawl+' gold'); },
        onLose:()=>{ endIncident(api); }})},
      {label:'Fetch a Bulldog instead', fn:()=>{ endIncident(api); api.toast('By the time the Bulldog comes, everyone has gone home.'); }}]);
    return true;
  }

  case 'gateward': {
    const m=mg(api), can=!m||m.cats.includes('protect');
    say(null,'A college porter is pressed against the gate, his hands on the old ward-stones, which are guttering like candles. "The gate ward\'s failing! Something on the other side keeps leaning on it. Can you hold it while I fetch the Fellows?"',[
      {label:can?'Raise a ward on the gate':'You can\'t ward yet', disabled:!can, fn:async()=>{
        const ok=await api.practise({cat:'protect', elem:api.homeElem()||'arcane', tier:2});
        if(ok){ api.addGold(REWARD.gate); endIncident(api); api.toast('The ward holds. +'+REWARD.gate+' gold from a grateful college'); }
        else say(null,'Your ward sputters. The porter is still pushing. "Again! Please!"',[{label:'Again', fn:()=>talk(n,api)}]);
      }},
      {label:'Not my college', fn:()=>{}}]);
    return true;
  }

  case 'landlady': {
    say(null,'Mrs Pegg, broad and rosy, polishes a tankard that was already clean. "Sit down, love, you look like you\'ve walked in from the east road, and everybody who walks in from the east road looks like that." She nods at the corner. "And if you\'ve coin to lose, old Squop\'s at the winks table. He\'s not lost a game since the Unweaving. Says it\'s the only good thing that came out of it."',[
      {label:'Ask about the regulars', fn:()=>say(null,'"The scholars drink in the Bird and Bell, mostly. In here it\'s carters, porters, and Squop. And lately a gentleman from All Absent who sits in the snug with his tea and asks after everybody\'s family." She frowns. "Nice man. Asks a lot about the ones who were in Corvanthe."')},
      {label:'Not now'}]);
    return true;
  }

  case 'squop': {
    const w=y.winks, normal=w.wins>=2, stake=normal?10:5, rules=normal?'normal':'beginner';
    say(null,'A little old man in a flat cap sits at a felt-covered table, a cup in the middle and coloured counters round its edge. "Winks! The Wizard\'s Duel, as played by those of us with no magic and a steady thumb. You pick a wizard\'s card, I pick mine, and we flick for our spells." He rattles the cup. "'+(normal?'You\'ve beaten me twice. Proper rules now, ten gold a game.':'Beginner\'s rules for a beginner. Five gold a game.')+'"'+(w.wins||w.losses?'\n\n(You\'re '+w.wins+'–'+w.losses+' against Squop.)':''),[
      {label:'Play for '+stake+' gold', disabled:api.gold()<stake, fn:()=>{
        if(!window.ExplorePub){ api.toast('The winks table is being re-felted. Come back later.'); return; }
        window.ExplorePub.play(api, {rules, stake, foeName:'Squop'}).then(r=>{
          if(!r) return;
          if(r.won){ w.wins++; api.addGold(stake); api.toast('You beat Squop! +'+stake+' gold'); }
          else { w.losses++; api.addGold(-stake); api.toast('Squop wins. -'+stake+' gold'); }
          api.save();
        });
      }},
      {label:'Ask about the rules', fn:()=>say(null,'"Same as the duel: a strike, a ward or a dispel, picked in secret. A spell costs mana; the bigger it is, the fewer flicks you get to pot it. Pot a wink in the cup and it\'s cast; miss them all and it fizzles. Attack, Guard and Grapple need no flick at all." He winks, which seems appropriate. "There\'s a rulebook in the University bookshop, if you\'re the reading kind."')},
      {label:'Not now'}]);
    return true;
  }
  }
  return false;
}

// ── a lecture: the lecturer's piece, then two questions (a potion for both right, the first time) ──
function lecture(api, id){
  const y=Y(api), L=LECT[id], qs=lectQuestions(id, api);
  api.dialog(L.who, L.text, [{label:'Take notes', fn:()=>ask(0,0)}]);
  function ask(i, right){
    if(i>=qs.length){
      const fresh=!y.lect[id]; y.lect[id]=true;
      const prize=fresh&&right===qs.length&&!y.ans[id];
      if(fresh) y.ans[id]=right;
      if(prize) api.addPotions(REWARD.lectPotion);
      api.save();
      const next=id==='wards'?'Fizzwick will see your first ward in the Laboratory.':id==='unmaking'?'Learn Dispel\'s glyphs in the Library, then Fizzwick will see your first dispel.':id===api.homeElem()?'':'Learn its glyphs in the Library, if you haven\'t, then Fizzwick will see your first '+up(id)+' strike in the Laboratory.';
      api.dialog(L.who, (right===qs.length?'"Quite right." ':'"'+right+' of '+qs.length+'. Read your notes." ')+'The lecture ends; the benches empty.'+(next?'\n\n'+next:''), []);
      api.toast((fresh?'Lecture heard: ':'Heard again: ')+(id==='wards'?'On Wards':id==='unmaking'?'On Unmaking':'On '+up(id))+(prize?' · +1 potion for answering well':''));
      return;
    }
    const [q,opts,good]=qs[i];
    api.dialog(L.who, q, opts.map((o,j)=>({label:o, fn:()=>ask(i+1, right+(j===good?1:0))})));
  }
}

// ── the Boxing Club ──
function box(api, key, ladder){
  const y=Y(api), f=api.fighters[key]||{};
  api.spar({fists:true, foes:[{key, level:0}],
    text:{winTitle:'Bout to You', win:'The crowd round the ropes roars. '+(key==='boxer_jem'&&ladder?'Gentleman Jem picks himself up and raises your hand. "The new Champion of the Fancy!"':'Gentleman Jem holds up your hand.'), loseTitle:'Down', lose:'You sit on the chalk, seeing stars. "Again whenever you\'re ready," says the Head Porter. "Watch what they do."'},
    onWin:()=>{
      if(!ladder) return;
      y.box++; api.addGold(REWARD.box);
      if(key==='boxer_jem'){ api.learn({atk:1}); api.toast('Champion of the Wrenford Fancy! +'+REWARD.box+' gold · your Attack hits 1 harder for good'); }
      else api.toast('Won the bout! +'+REWARD.box+' gold');
      api.save();
    }});
}

// ── your tutorial partner ──
function talkPartner(n, api){
  const y=Y(api), P=partnerName(api), me=api.wizName(), t=term(api), m=mg(api), home=api.homeElem(), pe=partnerElem(api);
  if(!api.chars.partner){ ensureChars(api); api.dialog(title(n,api),'"Hang on, I\'m all over the place." '+P+' is rummaging through a satchel. "Talk in a moment?"',[]); return true; }
  const sparDue=t>=1&&t<=3&&!y.spars[t]&&(t===1?m&&m.cats.includes('damage'):t===2?m&&m.cats.includes('protect'):m&&m.cats.includes('dispel'));
  const spar=(label)=>({label, fn:()=>api.spar({foes:[{key:'partner',wizard:true,known:partnerKnown(api)}],
    text:{winTitle:'Bout to You', win:P+' laughs from the floor. "All right, all right! That one\'s yours. Same again next term."', loseTitle:P+' Wins', lose:'"Ha! Mine." '+P+' helps you up. "You left yourself open. Again?"'},
    onWin:()=>{ if(!y.spars[t]&&t>=1&&t<=3){ y.spars[t]=true; api.addGold(REWARD.partner); api.toast('Won the term\'s spar with '+P+'! +'+REWARD.partner+' gold (the wager)'); api.save(); } }})});
  if(!y.plot.met){
    y.plot.met=true; api.save();
    api.dialog(title(n,api),'A freckled student in a short Commoner\'s gown thrown over a patched gleaner\'s jerkin is sitting on the chapel steps, fists half-raised at nobody. "You\'re the other new one! Penhallow said to find you. '+P+' Ashby. We\'re tutorial partners, apparently: they pair you off with somebody who can do what you can\'t." A grin. "I\'m '+up(pe)+'. You\'re '+up(home||'arcane')+', yeah? So I can\'t ever do yours and you can\'t ever do mine. That\'s going to make sparring interesting."\n\n"My family glean the Corvanthe Road. My sister Clemency was a first-year at the Collegium, on the day." The grin goes. "She\'s down in the Drowned Quarter now. I\'ve seen her. She doesn\'t know me." A shrug that doesn\'t work. "Anyway. Spar with me each term? Five gold says I win."',[{label:'You\'re on'}]);
    return true;
  }
  let line;
  if(y.plot.b6) line='"'+me+'." '+P+' looks better than they have all year. "Still sparring? Good. I\'m coming east with you, you know, when you go. Somebody has to keep you out of cellars."';
  else if(y.plot.b5) line=P+' won\'t quite meet your eye. "Dr Ashgrove says there might be a way. For the Echoes. For Clemency. A proper way, a scholarly one, not like the Word." A pause. "Don\'t look at me like that. You didn\'t lose anybody."';
  else if(y.plot.b4) line='"A ledger marked A.A.?" '+P+' goes quiet. "All Absent. Dr Ashgrove\'s college. He\'s been kind to me, you know. He knew Clemency\'s tutor." A frown. "It\'ll be some porter on the take. It\'ll be nothing."';
  else if(y.plot.b1) line='"An Echo! In Wrenford! In the market!" '+P+' is pale under the freckles. "They don\'t come out here. They walk home. They always walk home. Somebody brought that one."';
  else line='"'+TERMS[Math.max(1,t)]+' term, '+me+'. Library, lectures, Laboratory, and the Fancy in the evenings. I\'ve been hit by Mirror Meg four times. She just does what you did!"';
  const ch=[];
  if(sparDue) ch.push(spar('Spar for the term ('+REWARD.partner+' gold wager)'));
  else if(t>=1&&!y.plot.b6) ch.push(spar('A friendly spar'));
  else if(y.plot.b6) ch.push(spar('A friendly spar'));
  ch.push({label:'Not now'});
  api.dialog(title(n,api), line+(sparDue?'\n\n"Spar? This term\'s bout. Five gold on it."':''), ch);
  return true;
}

// ── the finale: beneath the Orrery ──
function talkFinale(n, api){
  const y=Y(api), P=partnerName(api), me=api.wizName();
  if(y.plot.b6){ api.dialog(title(n,api),'The cellar beneath the Orrery is empty now, the chalk circle scrubbed away by the Proctors\' men.',[]); return true; }
  if(!api.chars.ashgrove||!api.chars.partner){ ensureChars(api); api.dialog('Beneath the Orrery','The candles gutter. Give it a moment.',[]); return true; }
  const fight=turned=>{
    const foes=[{key:'ashgrove',wizard:true,name:'Dr Edwin Ashgrove'}].concat(turned?[{key:'echo_water_weak',level:1,name:'Clemency\'s Echo'}]:[{key:'partner',wizard:true,known:partnerKnown(api)}]);
    api.battle({foes, allies:turned?[{key:'partner',wizard:true,known:partnerKnown(api),name:P+' Ashby'}]:[],
      text:{winTitle:'The Word Unspoken', win:'Ashgrove\'s working comes apart in threads of light, and the circle goes dark. He sits down heavily on the cellar steps. "Margery," he says, to nobody. When the Proctors come down the stairs with their lanterns he holds out his wrists without being asked.', loseTitle:'The Circle Holds', lose:'You come round on the cellar floor, the circle still humming. Ashgrove hasn\'t finished. There\'s still time.'},
      onWin:()=>{
        y.plot.b6=true; api.addGold(REWARD.plotGold); api.addPotions(2);
        if(turned){ api.addAlly({key:'partner', wizard:true, name:P+' Ashby'}); api.toast('The Word is stopped. '+P+' Ashby joins you. +'+REWARD.plotGold+' gold, +2 potions'); }
        else api.toast('The Word is stopped. +'+REWARD.plotGold+' gold, +2 potions');
        api.dropNpc('ashgrove'); api.dropNpc('partnerLost'); api.save();
        api.dialog('Beneath the Orrery', turned?P+' sits beside you on the steps while the Proctors work. "She\'d have hated it," they say at last. "Clemency. A Word. She\'d have called him a fool to his face." A long breath. "When you go east, I\'m coming. We\'ll find her properly. The slow way."\n\nFinals are in the morning.':P+' won\'t look at you as the Proctors lead them up the stairs behind Ashgrove. "I\'m sorry," they say, once, at the top. By the end of the week '+P+' has gone down from Wrenford, and nobody knows where.\n\nFinals are in the morning.',[]);
      }});
  };
  // talk them down: three things to say, two right ones turn them
  const lines=[
    ['"'+P+'. Clemency was a first-year at the Collegium. She\'d have known what this is."', 1],
    ['"It\'s the same kind of Word. It doesn\'t know where to stop. He doesn\'t either."', 1],
    ['"Fine. Bring her back. What\'s one more city?"', 0],
    ['"You\'re the one who told me they walk home. Let\'s go and find her. The slow way."', 1],
  ];
  const ask=(i,score,order)=>{
    if(i>=2){ const turned=score>=2;
      api.dialog('Beneath the Orrery', turned?P+' looks from you to the circle, and steps out of it. "No," '+P+' says, to Ashgrove. "No. Not like this." Ashgrove sighs, like a tutor with a slow pupil, and raises his hands, and the cellar fills with Echo-light.':P+' shakes their head. "You don\'t understand. You didn\'t lose anybody." They turn back to the circle, and Ashgrove raises his hands.',[{label:'Fight', fn:()=>fight(turned)}]);
      return; }
    api.dialog('Beneath the Orrery', i===0?'A cellar under Radcliffe Square, hung with chalked glyphs, crates of spill split open around a circle. In it stands Dr Ashgrove, kindly as ever, a book open on his arm; and beside him, '+P+'.\n\n"Ah, '+me+'." Ashgrove smiles. "You\'ve come to see. Fifteen years I have kept her work. Margery\'s. And it is finished: a Word that does not unweave, but reweaves. Every Echo, a person again." '+P+' says nothing.\n\nWhat do you say to '+P+'?':P+' hesitates. Ashgrove turns a page.\n\nAnd?',
      order.map(([t,good])=>({label:t, fn:()=>ask(i+1,score+good,order.filter(x=>x[0]!==t))})));
  };
  ask(0,0,shuffle(lines));
  return true;
}

// ── incidents: small things that happen in the streets, a few a term ──
// at least `gap` game minutes apart (a game day is 16 real minutes), then `chance` per check (every 2 s)
const INCIDENT = {gap:360, chance:0.02};
const SPOTS = {
  echo:[[29.6,33.4,'Founders\' Quad'],[30.4,20.6,'Radcliffe Square'],[40,43,'the Meadow'],[22,27,'Carfax']],
  brawl:[[19.2,6.6,'outside the Bird and Bell']],
  gateward:[[39.5,40.4,'All Absent\'s gate'],[7,16,'Lantern College\'s gate']],
};
function startIncident(api){
  const y=Y(api), m=mg(api), types=['echo','brawl'].concat(!m||m.cats.includes('protect')?['gateward']:[]);
  const type=pick(types), [x,yy,where]=pick(SPOTS[type]);
  const inc={type, x:x*T, y:yy*T, where, id:'inc'+Date.now(), el:pick(api.elems)};
  y.inc.active=inc; api.save();
  showIncident(api);
  api.toast(type==='echo'?'Screams from '+where+'! Something has got loose.':type==='brawl'?'Shouting '+where+': a Town v Gown brawl!':'A bell clanging at '+where+': a ward is failing!');
}
function showIncident(api){
  const inc=Y(api).inc.active; if(!inc||api.mapId()!=='wrenford') return;
  if(inc.type==='echo') api.spawnEcho({id:inc.id, el:inc.el, foes:[['echo_'+inc.el+'_weak',0]], x:inc.x, y:inc.y, r:70,
    onWin:()=>{ api.addGold(REWARD.echo); endIncident(api); api.toast('The Echo breaks. +'+REWARD.echo+' gold from the Proctors\' reward box'); }});
  else api.addNpc({role:inc.type, x:inc.x, y:inc.y});
}
function endIncident(api){
  const y=Y(api), inc=y.inc.active; if(!inc) return;
  if(inc.type!=='echo') api.dropNpc(inc.type); else api.dropEcho(inc.id);
  y.inc.active=null; y.inc.last=api.clock()+(y.inc.day||0)*1440; y.inc.n=(y.inc.n||0)+1; api.save();
}

// ── the plot's beats that start on their own ──
function plotNpcs(api){
  const y=Y(api), t=term(api);
  if(api.mapId()==='wrenford'){
    // beat 1: the market fire (an Echo, in Wrenford)
    if(t>=1&&!y.plot.b1&&y.plot.b1go) api.spawnEcho({id:'b1', el:'fire', foes:[['echo_fire_weak',0]], x:15.6*T, y:20.4*T, r:50,
      onWin:()=>{ y.plot.b1=true; api.save(); api.toast('An Echo, in Wrenford. The Bulldogs call it a prank. Somebody brought it here.'); }});
    // beat 2: the hooded figure, after dark
    if(t>=1&&y.plot.b1&&!y.plot.b2&&api.night()) api.addNpc({role:'hooded', x:31.2*T, y:32.6*T});
    else if(!api.night()) api.dropNpc('hooded');
    // your partner, in Founders' Quad (gone the night of the finale)
    if(W(api).stage>=1&&!(y.plot.b6go&&!y.plot.b6)) api.addNpc({role:'partner', x:27.6*T, y:35*T}); else api.dropNpc('partner');
  }
}
// doors that open as the story goes: the Undercroft (beat 4) and the cellar beneath the Orrery (beat 6)
function doors(api){
  const y=Y(api), out=[];
  if(api.mapId()!=='wrenford'||!learning(api)) return out;
  if(y.plot.b3) out.push({id:'undercroft', x:14.4*T, y:20.8*T, type:'undercroft', name:'The Undercroft', label:'🗝 Unlock the grate (the Undercroft)', el:'dark',
    ev:{type:'party', foes:[['soldier',1],['archer',0],['soldier',0]], gold:REWARD.plotGold}});
  if(y.plot.b6go) out.push({id:'orrery', x:31*T, y:18.2*T, type:'undercroft2', name:'Beneath the Orrery', label:'🕯 Down the steps beneath the Orrery', el:'arcane', ev:{type:'empty'}});
  return out;
}
function afterFight(api, r){
  const y=Y(api);
  if(r.won&&r.party&&r.type==='undercroft'&&!y.plot.b4){
    y.plot.b4=true; api.addPotions(2);
    for(const e of api.elems) api.addSpill(e,1);
    api.save();
    setTimeout(()=>api.dialog('The Undercroft','The smugglers scatter into the culverts. Their crates are full of spill, every kind, packed in straw: far more than any licensed dealer handles in a year. Under the straw is a ledger. Every delivery is to the same two letters: A. A.\n\n(+1 spill of every kind, +2 potions)',[]), 600);
  }
}

// ── each step's hooks ──
function onMap(api){
  if(!api.hero()) return;
  ensureChars(api);
  const y=Y(api), w=W(api);
  if(!y.term&&w.stage>=2){ y.term=w.finals||!learning(api)?4:1; api.save(); }
  if(api.mapId()==='wrenford'){ plotNpcs(api); showIncident(api); }
}
function tick(api){
  if(!api.hero()||api.mapId()!=='wrenford') return;
  const y=Y(api), w=W(api), m=mg(api);
  if(!y.term&&w.stage>=2){ y.term=w.finals||!learning(api)?4:1; api.save(); if(y.term===1) api.toast('Michaelmas term begins. Lectures in the Examination Schools (by the Schools\' court).'); }
  const t=term(api);
  if(!learning(api)) return;
  // beat 1 starts a while after Matriculation
  if(t>=1&&!y.plot.b1go){ y.plot.b1go=true; api.save(); api.toast('Smoke over the Covered Market! Something is burning in the stalls.'); plotNpcs(api); }
  if(t>=2&&!y.plot.b3go){ y.plot.b3go=true; api.save(); api.toast('A note in your pigeonhole: "Come to the Library. Q."'); }
  if(t>=3&&!y.plot.b5go){ y.plot.b5go=true; api.save(); api.toast('Aurelia is looking for you, in Radcliffe Square.'); }
  // the finale opens once Trinity's work is done and Aurelia has spoken
  if(t>=3&&y.plot.b5&&!y.plot.b6go&&m.cats.includes('dispel')&&electives(api).length>=3){
    y.plot.b6go=true; api.save(); api.setClock(22*60); api.refreshDoors();
    api.toast(partnerName(api)+' is missing. Finals are tomorrow. Aurelia said: beneath the Orrery.');
    plotNpcs(api);
  }
  // the Proctors' licence: once you can ward
  if(m.cats.includes('protect')&&!y.licence){ y.licence=true; api.save(); api.toast('The Proctors\' licence: you may now go out of bounds (beyond Wrenford).'); }
  plotNpcs(api);
  // incidents: now and then, never two at once, not before Michaelmas
  const now=api.clock()+(y.inc.day||0)*1440;
  if(y.inc.lastClock!=null&&api.clock()<y.inc.lastClock) y.inc.day=(y.inc.day||0)+1;
  y.inc.lastClock=api.clock();
  if(t>=1&&y.plot.b1&&!y.inc.active&&!api.interior()&&now-(y.inc.last||0)>INCIDENT.gap&&Math.random()<INCIDENT.chance) startIncident(api);
}
function blockExit(api, x){
  if(api.mapId()!=='wrenford'||x.to!=='world'||!learning(api)) return null;
  const y=Y(api);
  if(y.licence) return null;
  return 'A Bulldog steps across the road. "Out of bounds, Commoner. Not without a Proctors\' licence, and you don\'t get one of those till you can ward."';
}

// ── the journal ──
function journal(api){
  const y=Y(api), t=term(api), out=[];
  if(!learning(api)||!t) return '';
  if(t>=4) return '';
  out.push(TERMS[t]+' term. Still to do before '+(t>=3?'Finals':'Collections')+': '+(termNeeds(api).join('; ')||'nothing. Sit it with Professor Thorley in the Examination Schools.')+'.');
  if(y.box<4) out.push('The Wrenford Fancy (the Schools\' yard): '+y.box+' of 4 bouts won.');
  if(t>=1&&t<=3&&!y.spars[t]) out.push('Spar with '+partnerName(api)+' for the term, in Founders\' Quad.');
  if(y.inc.active) out.push('Trouble at '+y.inc.active.where+'.');
  if(y.plot.b3go&&!y.plot.b3) out.push('Mr Quill left a note: come to the Library.');
  if(y.plot.b5go&&!y.plot.b5) out.push('Aurelia is looking for you in Radcliffe Square.');
  return out.join('\n');
}

// ── Finals' viva: a bout with the Master of the Schools, holding back nothing you've been taught ──
function viva(api, tries){
  const y=Y(api), m=mg(api);
  api.dialog('Professor Thorley','"The calls are passed. Now the viva." The Master of the Schools is waiting in the circle in the yard, sleeves rolled. "Everything you have, '+api.wizName()+'. Everything I have that you have."',[
    {label:'Into the circle', fn:()=>api.spar({foes:[{key:api.chars.weizan?'weizan':'fizzwick', wizard:true, hp:46, known:{glyphs:api.glyphs.map((_,i)=>i), elems:api.elems.slice(), cats:m.cats.slice(), rings:m.rings||2, skin:!!m.skin}}],
      text:{winTitle:'Viva Passed', win:'The Master lowers their hands, and bows. "Pass." Professor Thorley writes one word in the book and underlines it.', loseTitle:'Not Yet', lose:'"Not yet," says the Master, offering a hand up. "The calls stand; come back for the viva whenever you like."'},
      onWin:()=>{
        y.exams.finals=true; y.term=4; api.learn({rings:3, grad:true});
        api.addGold(REWARD.finals.gold+(tries===1?REWARD.first:0)); api.addPotions(REWARD.finals.potions); api.save();
        api.toast('Graduated! The outer ring is yours. +'+(REWARD.finals.gold+(tries===1?REWARD.first:0))+' gold, +'+REWARD.finals.potions+' potions');
        setTimeout(()=>api.dialog('Encaenia','The whole University in Radcliffe Square, under a sky with no fire in it. Your name is read out, in Latin, badly. Dr Penhallow presents you with your hood, and says, quietly: "Bring back what you can. Books, if you find them. Names, if you find those."\n\nThe east road is open. The Master of the Schools and Fizzwick are putting together a party for Corvanthe.',[]),800);
      }})},
    {label:'Later'}]);
}

// ── Mr Quill's slips (beat 3) and Aurelia's vision (beat 5): called from js/explore_folk.js ──
function keeperBeat(api, K){
  const y=Y(api);
  if(!learning(api)||term(api)<2||y.plot.b3) return null;
  return {label:'"You wanted a word?"', fn:()=>{
    y.plot.b3=true; api.save(); api.refreshDoors();
    api.dialog('The Keeper of the Library ('+K+')','"I did." '+K+' takes you behind the desk and lays out a lending slip. "Lantern\'s Formulary of the Reweaving. Forbidden stacks. Borrowed last month, and signed for." He taps the name. "Dr Margery Ashgrove. A Fellow of the Collegium, and lost on the day. Fifteen years ago." He looks at you over his spectacles. "The dead don\'t borrow books. And the stacks are entered from below, by an old door into the Undercroft, under the Covered Market. I gather you have a key."\n\n(The grate in the Covered Market can be unlocked now.)',[]);
    api.toast('The Undercroft can be entered: the grate in the Covered Market.');
  }};
}
function aureliaBeat(api, A){
  const y=Y(api);
  if(!learning(api)||term(api)<3||y.plot.b5) return null;
  y.plot.b5=true; api.save();
  api.dialog('A Doctoral Student ('+A+')',A+' is waiting for you, cards already laid out in a cross. "I\'ve read it four times. Radcliffe Square on fire, on the night of Encaenia. A circle of chalk under the Orrery. And your friend, the freckled one, standing in it." The top card is turned: a tower, falling. "The Proctors laughed at me. You won\'t, will you?"\n\n"When it starts, it starts beneath the Orrery. Go before Finals. Take a coat."',[]);
  api.toast('Aurelia\'s vision: beneath the Orrery, the night before Finals.');
  return true;
}
// Fizzwick's practicals for wards and dispels (js/explore_folk.js asks which are open)
function labPracticals(api){
  const y=Y(api), m=mg(api), out=[];
  if(!learning(api)) return out;
  const home=api.homeElem();
  if(y.lect.wards&&!m.cats.includes('protect')) out.push({cat:'protect', elem:home, name:'your first ward'});
  if(y.lect.unmaking&&!m.cats.includes('dispel')&&api.glyphSets.dispel.every(g=>m.glyphs.includes(g))) out.push({cat:'dispel', elem:home, name:'your first dispel'});
  return out;
}
// the Master of the Schools' Ironskin practical (Hilary)
function skinDue(api){ const m=mg(api); return learning(api)&&term(api)>=2&&!m.skin; }

window.ExploreYear={knows, title, sprite, talk, onMap, tick, afterFight, doors, blockExit, allyKnown, journal, keeperBeat, aureliaBeat, labPracticals, skinDue,
  partnerName, partnerKnown, termNeeds, PEOPLE, LECT, REWARD, _Y:Y};
})();
