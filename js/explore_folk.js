// ═══════════════════════════════════════════════════════════════════
//  EXPLORE FOLK — the people standing about in a town (a map's `npcs`),
//  what they say, and the quests they give. Wrenford's dons and the
//  Matriculation quest live here. js/explore.js asks this module for an
//  NPC's title and sprite, and hands talk() an `api` to act through
//  (dialogs, gold, potions, spill, healing, practice duels, quest state).
//  Three kinds of people (FOLK[role].kind), so the town has continuity:
//   - 'local': Wrenford's own people (the dons, the Porter, the Bulldogs),
//     who stay here for good (the invented dons use recolours of Eldrin's old art, sprites/folk/).
//   - 'roster' with fate 'metLater': a roster wizard who is here now, doesn't
//     join you, and turns up later elsewhere ("we met at uni"). Absent if
//     you're playing them.
//   - 'roster' with fate 'fieldTrip': a roster wizard who stays at the
//     University and joins you later, on University quests (field trips).
//     The job is what matters, so if you're playing them the next in
//     `cast` stands in.
//  Talking to a roster wizard here records it in quests.met[key]
//  (metAtUni), for those later meetings to remember.
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';

const cap = s => s.charAt(0)+s.slice(1).toLowerCase();

// the Matriculation quest: the Senior Tutor sends you to the Schools, the Library and the Laboratory
const MATRIC = {
  tasks: [
    ['schools', 'Pass a bout at the Schools (the Master of the Schools, the duelling court off Pembroke Street)'],
    ['library', 'Read three books in the Remnant Library (Broad Street)'],
    ['lab',     'Pass the Laboratory\'s safety test (the Warded Laboratory, in the Parks)'],
  ],
  reward: {gold:30, potions:2},
  booksNeeded: 3,
};
const LAB_BREW = 2;
const SHARD_SPILL = 6;               // spill Fizzwick fuses into the quintessence shard topper                  // spill (any kind) the Laboratory takes to distil a potion
const SPILL_PRICE = 4;               // what the licensed dealer pays a piece
const MARKET_POTION = 8;

const FOLK = {
  // Wrenford's own: they stay
  porter:  {kind:'local', title:'The Head Porter', fighter:'soldier'},
  bulldog: {kind:'local', title:'A Bulldog', sprite:'sprites/halberdier.png', face:'halberdier'},
  bulldog2:{kind:'local', title:'A Bulldog', sprite:'sprites/halberdier.png', face:'halberdier'},
  tutor:   {kind:'local', title:'The Senior Tutor', name:'Dr Penhallow', sprite:'sprites/folk/tutor.png'},
  keeper:  {kind:'local', title:'The Keeper of the Library', name:'Mr Quill', sprite:'sprites/folk/keeper.png'},
  chaplain:{kind:'local', title:'The University Chaplain', name:'Canon Marrow', sprite:'sprites/folk/chaplain.png'},
  dealer:  {kind:'local', title:'A Licensed Dealer', name:'Widow Coyle', sprite:'sprites/folk/dealer.png'},
  // roster wizards who stay, and join you later on University quests (field trips)
  weizan:  {kind:'roster', fate:'fieldTrip', title:'The Master of the Schools',    cast:['weizan','durin','skadi']},
  fizzwick:{kind:'roster', fate:'fieldTrip', title:'The Master of the Laboratory', cast:['fizzwick','zakkit','cinder']},
  // roster wizards you meet here, and again later somewhere else
  aurelia: {kind:'roster', fate:'metLater', title:'A Doctoral Student', cast:['aurelia']},
  ponder:  {kind:'roster', fate:'metLater', title:'A Sleeping Student', cast:['ponder']},
  // Wrenford's townsfolk, painted from the hero figures (look: a creator look; js/explore.js nudges it off
  // yours and sets _sprite / _face). Four men, four women. `lines`: what they say, in turn; `shop`, `heal`: extras.
  corin:  {kind:'local', title:'A Student', name:'Corin', look:{name:'Corin', sex:'m', age:'young', fig:'young_man_3', robe:'Forest', trim:'Gold', hair:'Brown', skin:'Fair', eyes:'Green', elem:'earth', staff:'Ash', topper:'hoop'},
    lines:['A student sits on the Library steps with a book on Dispel open on his knees, mouthing the glyphs. "Infinity, circled plus, nabla, theta. Infinity, circled plus…" He looks up. "Sorry. Exams. Do you know if the Keeper lets you take books out? I\'ve asked four times and I still don\'t know."',
      '"Second year, Founders\'." Corin grins. "My mother wanted me to be a cooper. I said a cooper never made a barrel float. She said a wizard never made a barrel at all."',
      '"Have you been east? Properly east, past Hollowmere?" He lowers his voice. "They say the crews out there have mages with them now. Real ones, with staves. Hedge-wizards who never matriculated anywhere."']},
  isla:   {kind:'local', title:'A Student', name:'Isla', look:{name:'Isla', sex:'f', age:'young', fig:'young_woman_3', robe:'Crimson', trim:'Silver', hair:'Black', skin:'Brown', eyes:'Amber', elem:'fire', staff:'Mahogany', topper:'crescent'},
    lines:['Two students are arguing under the Great Orrery. "Fire is the first element," says Isla, short-haired and certain. "Everything burns. Even water, if you\'re rude enough to it."',
      '"Tamsin says I\'m reckless." Isla shrugs. "Tamsin once spent a week warding a sandwich."',
      '"I\'m going to the Schools next term. The Master says I fight like a forest fire. I think it was a compliment."']},
  tamsin: {kind:'local', title:'A Student', name:'Tamsin', look:{name:'Tamsin', sex:'f', age:'young', fig:'young_woman_4', robe:'Midnight', trim:'Bone', hair:'Blonde', skin:'Pale', eyes:'Blue', elem:'ice', staff:'Silverwood', topper:'crystal'},
    lines:['"Ice," says the other, ponytailed and patient, "is fire\'s answer, not its servant. Opposites across the wheel. Strike a fire ward with frost and watch it come apart." She sighs. "Isla never listens to the second half of anything."',
      '"It was a very good sandwich," Tamsin says, with dignity. "And nobody took it."',
      '"If you\'re going east, ward first and ward often. And seal it. A sealed ward takes two dispels to break. The Master taught us that, and the Master was right."']},
  rook:   {kind:'local', title:'A Duellist of the Schools', name:'Rook', look:{name:'Rook', sex:'m', age:'young', fig:'young_man_4', robe:'Black', trim:'Scarlet', hair:'Black', skin:'Tan', eyes:'Dark', elem:'lightning', staff:'Blackthorn', topper:'crook'},
    lines:['A lean young man in a wide hat is practising guards on the edge of the court, slowly, over and over. "Guard beats Attack. Grapple beats Guard. Attack beats Grapple." He doesn\'t stop. "Say it a thousand times and your feet learn it."',
      '"Rook. Third year. I\'ve lost to the Master forty-one times." A pause in the drill. "I\'m counting up, not down."',
      '"Watch for archers out there. They shoot past a guard, and you can\'t grapple a man who\'s forty paces off."']},
  agathe: {kind:'local', title:'The Herbwife', name:'Mother Agathe', heal:15, healCost:3, look:{name:'Agathe', sex:'f', age:'old', fig:'old_woman_3', robe:'Forest', trim:'Bone', hair:'White', skin:'Olive', eyes:'Brown', elem:'earth', staff:'Oak', topper:'crescent'},
    lines:['An old woman in round spectacles keeps a stall of bundled herbs, the smell of mint and something stranger. "Feverfew for the head, comfrey for the bones, and this one for when you\'ve been arguing with an Echo." A wink. "No licence needed for weeds, dearie."',
      '"I grew herbs for the Collegium kitchens for thirty years. Then one day there was no Collegium and no kitchen, and I still had the herbs." She ties a bundle. "So here I am."',
      '"Mind you eat. Wizards forget. You\'ll cast a thing the size of a house and then fall over for want of a biscuit."']},
  joss:   {kind:'local', title:'A Gleaner, Back from the East', name:'Joss Hale', look:{name:'Joss', sex:'m', age:'middle', fig:'mid_man_3', robe:'Ash', trim:'Copper', hair:'Brown', skin:'Natural', eyes:'Grey', elem:'water', staff:'Driftwood', topper:''},
    lines:['A hooded man with a fresh scar sits on a crate at Carfax, a pack at his feet that smells of smoke. "Just in from Corvanthe. Don\'t ask what\'s in the pack. Don\'t ask what was in it this morning, either."',
      '"The crews have changed." Joss rubs the scar. "Used to be soldiers and archers, gone sour. Now the worst of them have a mage at the front. Eyepatches, rags, stolen staves. Hedge-wizards. Brannoc in Spirewatch. Saltjaw Meg in the Drowned Quarter. A Proctor in the Collegium who never noticed the University ended."',
      '"Beat one, if you can, and take their staff. Every gleaner in Cindergate would buy you a drink to see Brannoc\'s stick over your shoulder."']},
  wrexley:{kind:'local', title:'Fellow of Lantern College', name:'Dr Wrexley', shop:'glyphs', look:{name:'Wrexley', sex:'f', age:'middle', fig:'mid_woman_6', robe:'Rose', trim:'Gold', hair:'Auburn', skin:'Fair', eyes:'Hazel', elem:'arcane', staff:'Mahogany', topper:'star'},
    lines:['A woman in a wide-brimmed hat is sketching the gate of Lantern College, the paper covered in glyphs. "Dr Wrexley. I make staff heads: the twelve glyphs of the Arcana, cast in gold. A glyph on your staff is a promise you can see." A smile. "And they\'re very handsome."',
      '"We\'re building the workshop here, for writing your own workings. Slowly. The Senior Tutor checks every nail."',
      '"Omega for endings, Psi for the forked path, the circled cross for what\'s bound, the eight-pointed star for what bursts." She taps each sketch. "Choose the one you mean."']},
  benedek:{kind:'local', title:'The Punt-Keeper', name:'Old Benedek', look:{name:'Benedek', sex:'m', age:'old', fig:'old_man_3', robe:'Ochre', trim:'Gold', hair:'White', skin:'Tan', eyes:'Blue', elem:'water', staff:'Oak', topper:''},
    lines:['A bald old man with a beard to his belt leans on a punt-pole by the water. "Punts by the hour, a penny a time, and the river does the rest." He squints at you. "The Wren runs east, you know. Down to the Hollow, and the Hollow runs through Corvanthe. Everything in this town floats that way in the end."',
      '"Fished the Hollow sixty years. Since the white day, the fish come up shining." He shakes his head. "I throw them back. Seems polite."',
      '"Students fall in twice a term, regular. I keep a pole for it."']},
};
// what the townsfolk with `lines` say, in turn (quest 'folk' keeps each one's count)
function townTalk(n, api){
  const F=FOLK[n.role], st=api.quest('folk'), i=st[n.role]||0;
  st[n.role]=(i+1)%F.lines.length; api.save();
  const ch=[];
  if(F.heal) ch.push({label:'Buy a herbal tonic (+'+F.heal+' HP, '+F.healCost+' gold)', disabled:api.gold()<F.healCost||api.hp()>=api.maxHp(), fn:()=>{ api.addGold(-F.healCost); api.heal(F.heal); api.save(); api.toast('Bitter, then warm. +'+F.heal+' HP'); }});
  if(F.shop) ch.push({label:'Look at her staff heads', fn:()=>topperShop(n,api,F.shop)});
  api.dialog(title(n,api),F.lines[i],ch);
}
// staff toppers for sale (js/explore.js earnTopper fits them): Dr Wrexley's glyphs, Widow Coyle's curiosities
const SHOPS = {
  glyphs:  {pitch:'"Each one cast here in Lantern, from a sketch of my own."', items:[['omega',25],['psi',25],['cross',25],['star',25]]},
  curios:  {pitch:'"Curiosities, out of the Collegium, all with papers. Mostly with papers."', items:[['wren',30],['hourglass',40],['hand',40],['key',50]]},
};
function topperShop(n, api, id){
  const S=SHOPS[id];
  api.dialog(title(n,api), S.pitch+'\n\nYou have '+api.gold()+' gold.', S.items.map(([t,price])=>{
    const have=api.hasTopper(t);
    return {label:api.topperName(t)+(have?' (yours)':' ('+price+' gold)'), disabled:have||api.gold()<price, fn:()=>{ api.addGold(-price); api.save(); api.earnTopper(t,'Wrapped in brown paper and string'); }};
  }).concat([{label:'Not today'}]));
}

// who plays a role, given the wizard you are
function castOf(role, api){
  const F=FOLK[role]; if(!F||!F.cast) return null;
  return F.cast.find(k=>k!==api.wizKey()&&api.chars[k])||F.cast[0];
}
function nameOf(role, api){ const F=FOLK[role]; if(F&&F.name) return F.name; const k=castOf(role,api); return k?cap(api.chars[k].name):''; }
// a 'metLater' wizard isn't here if you're playing them
function absent(n, api){ const F=FOLK[n.role]; return !!(F&&F.fate==='metLater'&&F.cast.includes(api.wizKey())); }
// did you meet this roster wizard at the University? (for later meetings: "we met at uni")
function metAtUni(key, api){ return !!api.quest('met')[key]; }
function title(n, api){
  const F=FOLK[n.role]; if(!F) return null;
  const nm=nameOf(n.role,api);
  return nm?F.title+' ('+nm+')':F.title;
}
function sprite(n, api){
  const F=FOLK[n.role]; if(!F) return null;
  if(F.look) return F._sprite||null;
  if(F.sprite) return F.sprite;
  if(F.fighter) return (api.fighters[F.fighter]||{}).sprite||null;
  const k=castOf(n.role,api), c=k&&api.chars[k];
  return c&&c.sprite&&!/mage-/.test(c.sprite)?c.sprite:null;
}
// their face in the dialog box: portraits/small/<key>.jpg (a fighter's or roster wizard's thumbnail;
// the dons' are cropped from their sprites by tools/make_folk_sprites.py, FACES)
function face(n, api){
  const F=FOLK[n.role]; if(!F) return null;
  if(F.look) return F._face||null;
  const k=F.face||F.fighter||(F.cast?castOf(n.role,api):n.role);
  return k?'portraits/small/'+k+'.jpg':null;
}
function knows(role){ return !!FOLK[role]; }

// ── the Matriculation quest's state (saved by explore.js under quests.wren) ──
function q(api){ return api.quest('wren'); }
function libBooks(api){ return api.booksRead().filter(id=>/^W/.test(id)).length; }
function tasksLeft(api){ const s=q(api); return MATRIC.tasks.filter(([k])=>!s[k]); }
// a line for the inventory: where you are with it
function journal(api){
  const s=q(api), out=[];
  if(!s.stage) out.push('Matriculation: see the Senior Tutor in Founders\' Quad, Wrenford.');
  else if(s.stage===1){
    const left=tasksLeft(api);
    out.push(left.length?'Matriculation: '+left.map(t=>t[1]+(t[0]==='library'?' ('+Math.min(libBooks(api),MATRIC.booksNeeded)+' of '+MATRIC.booksNeeded+')':'')).join('; ')+'.':'Matriculation: everything done. Go back to the Senior Tutor.');
  } else out.push('Matriculated at the University of Wrenford.');
  if(s.satchel&&!s.satchelDone) out.push('Ponder\'s satchel: take it back to its owner, asleep on the Meadow.');
  return out.join('\n');
}

// ── what they say ──
function talk(n, api){
  const s=q(api), me=api.wizName(), say=(_,x,ch)=>api.dialog(title(n,api),x,ch||[]);
  const nm=r=>nameOf(r,api), F_=FOLK[n.role];
  if(F_&&F_.kind==='roster'){ const k=castOf(n.role,api), met=api.quest('met'); if(k&&!met[k]){ met[k]=true; api.save(); } }
  if(F_&&F_.lines){ townTalk(n,api); return; }
  switch(n.role){

  case 'porter': {
    const where=[
      {label:'Where is the Library?', fn:()=>say(0,'"The Remnant? Up Cornmarket to Broad Street, the big domed place with the stone heads outside. Wipe your feet. The Keeper notices."',dirs())},
      {label:'Where are the Schools?', fn:()=>say(0,'"West along Merton Street, then up St Aldates and left at Pembroke Street. The duelling court\'s in front of the examination halls. You\'ll hear it."',dirs())},
      {label:'Where is the Laboratory?', fn:()=>say(0,'"In the Parks, top of Parks Road, past the Library. As far from the colleges as the Statutes allow. If the smoke\'s white, come back tomorrow."',dirs())},
      {label:'Where can I sleep?', fn:()=>say(0,'"The Wren\'s Nest, on George Street off Cornmarket. Tell them the Lodge sent you. It won\'t make any difference, but they like to hear it."',dirs())},
    ];
    function dirs(){ return where; }
    if(!s.stage) say(0,'A broad old man in a bowler hat, with a soldier\'s back and a sword he plainly still knows how to use. "Morning. New, are you? Everyone new comes in from the east road looking like that." He nods at the arch. "You\'ll want to matriculate. The Senior Tutor, '+nm('tutor')+', in Founders\' Quad, through there. Keep off the grass."',where);
    else if(s.stage===1){ const left=tasksLeft(api);
      say(0,'"Getting on all right, '+me+'? '+(left.length?'You\'ve still to see to: '+left.map(t=>t[0]==='schools'?'the Schools':t[0]==='library'?'the Library':'the Laboratory').join(', ')+'."':'That\'s the lot, is it? Back to the Senior Tutor with you, then."')+' He taps the side of his nose. "And keep off the grass."',where); }
    else say(0,'"Morning, '+me+'." The Porter almost smiles. "Most of the Porters here held the Wardgate at Corvanthe, you know. We held it from the wrong side, as it turned out. Mind how you go out there."',where);
    return;
  }

  case 'bulldog':
    say(0,'One of the Proctors\' constables, in a bowler and a dark coat, with a halberd that has never been used on a student, quite. "Afternoon. Statute the Fourth: no working in the street. That includes lights, that includes warming your hands, that includes \'only a little one\'." He looks at you hard. "We had a little one, once. It took a city."');
    return;
  case 'bulldog2':
    say(0,'"Welcome to Wrenford." The Bulldog at the bridge looks you up and down. "Wands, staves and familiars are permitted. Spells in the street are not. Quintessence is to be sold only to licensed dealers, Covered Market, off the High. Enjoy your stay."');
    return;

  case 'tutor': {
    const D=nm('tutor');
    if(!s.stage){
      say(0,D+', small and grey and very upright, is reading on the bench by the chapel, an unlit lamp alongside. The book closes on a finger. "Another one from the east road. Sit." A long look at you for a long moment, as if reading the end of the story first.\n\n"Everyone who teaches here was away from Corvanthe on the day. A visit, a dig, a funeral. We came here because it was far, and small, and nobody had ever done anything dangerous in it. We teach what we should have been taught: that a working is a promise you make to the world, and the world holds you to it."\n\n"Matriculate, and we will teach you to keep it."',[
        {label:'Matriculate', fn:()=>{ s.stage=1; api.save();
          say(0,'"Good." '+D+' writes your name in a ledger, slowly, in ink. "Three things before you are one of us. Pass a bout at the Schools: the Master will teach you to fight, because you will be fought. Read in the Remnant Library: the Keeper will tell you what we lost. And pass the Laboratory\'s safety test: the Master there will show you what a working really is, which nobody ever believes until they see it." A card with a crest on it is pressed into your hand. "Come back when it\'s done."');
          api.toast('Matriculation begun: the Schools, the Library and the Laboratory.'); }},
        {label:'Not yet'}]);
      return;
    }
    if(s.stage===1){
      const left=tasksLeft(api);
      if(left.length){ say(0,'"Still to do: '+left.map(t=>t[1]).join('; ')+'." Back to the book, then, without looking up: "There\'s no hurry. Hurry is how we got here."'); return; }
      say(0,D+' reads the card back, each mark on it, and nods. "The Master of the Schools says you fight like someone who means to come home. The Keeper says you read like someone who is listening. And the Laboratory says you are still alive, which from them is high praise."\n\n"Then by the authority of the University, '+me+', you are matriculated." For a moment the lamp on the bench lights itself, very softly, and goes out again. "There. You saw nothing."',[
        {label:'Take your gown', fn:()=>{ s.stage=2; api.addGold(MATRIC.reward.gold); api.addPotions(MATRIC.reward.potions); api.save();
          api.toast('Matriculated! +'+MATRIC.reward.gold+' gold and '+MATRIC.reward.potions+' potions.');
          setTimeout(()=>api.earnTopper('lantern','The Senior Tutor adds something from a drawer: a little gold lantern, made to sit on a staff. "Every Finder carries one. You\'ll be finding things now"'),1800);
          say(0,'"The east road goes to Hollowmere, and past Hollowmere to Corvanthe. You\'ll go, I expect. They all go." A quiet moment. "Bring back what you can. Books, if you find them. Names, if you find those. And when you are ready to write workings of your own, come and find me: we are building a workshop for it, at Lantern College. It isn\'t ready. Neither are you."'); }}]);
      return;
    }
    say(0,'"'+me+'." '+D+' marks a place in the book. "The workshop at Lantern College is not ready yet. When it is, you\'ll write your own workings there, and we\'ll see whether you\'ve listened." A pause. "Have you been east?"',[
      {label:'Ask about Corvanthe', fn:()=>say(0,'"It was the greatest university in the world, and it knew it. That was the trouble. Every one of us here could have been in the Collegium that day. Some of us were meant to be." The book opens again. "I was meant to be."')},
      {label:'Ask about the Statutes', fn:()=>say(0,'"Five rules, and a sixth in pencil. No working larger than its maker; none without a witness; none that cannot be undone; none in the street; no Word spoken that is not understood. The sixth says don\'t be clever. That one\'s mine."')}]);
    return;
  }

  case 'weizan': {
    const M=nm('weizan'), mk=castOf('weizan',api);
    if(!s.stage){ say(0,M+' is drilling three students on the court, slowly, over and over. "Not matriculated? Then you\'re not mine to teach yet. Founders\' Quad: the Senior Tutor. Go on."'); return; }
    const sparHobbes={label:s.spar1?'Spar with Bulldog Hobbes again':'Spar with Bulldog Hobbes', fn:()=>api.spar({
      foes:[{key:'soldier',level:0,name:'Bulldog Hobbes'}],
      text:{winTitle:'A Clean Bout', win:'Hobbes picks himself up and shakes your hand. "Not bad. You looked at my feet."', loseTitle:'Down in the Chalk', lose:'Hobbes helps you up. "Again. Watch my feet, not my sword."'},
      onWin:()=>{ if(!s.spar1){ s.spar1=true; api.save(); api.toast('The Master nods. Now a bout with the Master.'); } }})};
    const duelMaster={label:s.schools?'Duel the Master again':'Duel the Master', fn:()=>api.spar({
      foes:[{key:mk,wizard:true}],
      text:{winTitle:'Bout to You', win:M+' lowers '+'the guard'+'. "Good. You struck the ward with its opposite, you guarded when I meant to strike, and you didn\'t do anything clever. Pass."', loseTitle:'Not Yet', lose:'"Again, when you\'re ready," says '+M+'. "There\'s no shame on this court. The shame is out there, if you go before you\'re ready."'},
      onWin:()=>{ if(!s.schools){ s.schools=true; api.save(); api.toast('The Schools: passed.'); } }})};
    if(!s.spar1){
      say(0,M+' looks you over. "Most wizards die to a man with a stick. You\'re clever, so you think about the spell, and he\'s already hit you." '+M+' taps the court with a foot.\n\n"Three things you can always do, free, and they always go off: Attack, Guard, Grapple. Guard beats Attack, and hits back. Grapple beats Guard. Attack beats Grapple. They sit in the middle of your three wheels. Learn them before you learn anything else."\n\n"Bulldog Hobbes has kindly volunteered. He hasn\'t, but he will. Inside the circle nothing you do will last past the bout, and the University\'s healers will patch you up after."',[sparHobbes,{label:'Not now'}]);
      return;
    }
    if(!s.schools){
      say(0,'"Now me." '+M+' steps into the circle. "The wheel: Damage, Protection, Dispel, chosen in secret, and they meet. A ward stops a strike; a dispel tears a ward; a strike punishes a dispel. Each element has its opposite across the wheel: Fire and Water, Air and Earth, Lightning and Ice, the Arcane and the Dark. Strike a ward with its opposite and it comes apart in your hands."\n\n"Show me you were listening."',[duelMaster,sparHobbes,{label:'Not now'}]);
      return;
    }
    say(0,'"'+me+'." '+M+' doesn\'t stop the drill. "The court is open whenever you want it. Use it. The Echoes in Corvanthe don\'t give second bouts."'+(s.stage>=2?'\n\n"And keep yourself sharp. When the Schools next take a party east, to walk the Corvanthe Road and see what we\'re training for, I\'ll want students who can hold a line. I\'ll be going. You might be."':''),[duelMaster,sparHobbes,{label:'Not now'}]);
    return;
  }

  case 'keeper': {
    const K=nm('keeper'), read=libBooks(api);
    if(!s.stage){ say(0,K+' stands on the Library steps with a ring of keys, watching readers in and out like a shepherd counting sheep. "The Remnant is open to members of the University. You are not one yet. The Senior Tutor, in Founders\' Quad, can mend that."'); return; }
    if(!s.library){
      if(read>=MATRIC.booksNeeded){
        say(0,'"You read them." '+K+' looks almost surprised. "Most skim. You can tell: they come out talking." A long breath. "Every book in there came out of Corvanthe in somebody\'s arms, or was written here since by somebody who should have been there. That is what a library is, now. A list of the people who were carrying things."',[
          {label:'Take your reader\'s ticket', fn:()=>{ s.library=true; api.save(); api.toast('The Library: done.'); }}]);
      } else say(0,'"Inside, through the doors behind me. The reading room is at the front; the stacks go back further than they should. Read '+MATRIC.booksNeeded+' of the Remnant books and come and tell me about them." '+(read?K+' checks a slip. "You\'ve read '+read+'."':'"No candles. No reading aloud."'));
      return;
    }
    if(read>=7&&!api.hasTopper('orrery')){ say(0,'"All seven." '+K+' looks at you over the keys for a long moment. "Nobody reads all seven." A small gold orrery comes out of a coat pocket, three rings round a little glowing heart. "This sat on the Collegium librarian\'s staff. She would want a reader to have it."',[{label:'Take it', fn:()=>api.earnTopper('orrery','Its rings turn on their own, very slowly')}]); return; }
    say(0,'"'+me+'." '+K+' unlocks a door for someone without looking. "Forty years I\'ve kept libraries, and I never kept one that was all lost property before." A sniff. "If you find books in Corvanthe, bring them here. If you find a Collegium seal on them, bring them here faster. Some of our colleagues\' last work is still lying in those streets."');
    return;
  }

  case 'fizzwick': {
    const F=nm('fizzwick');
    if(!s.stage){ say(0,F+' is sitting on an upturned bucket outside the Laboratory, eyebrows singed, drinking tea that smokes. "No, no. Matriculate first. The Statutes won\'t let me blow up anyone who isn\'t a member of the University." A beam. "Founders\' Quad."'); return; }
    const brew={label:'Distil a potion ('+LAB_BREW+' spill of any kind)', disabled:api.spillTotal()<LAB_BREW, fn:()=>{ api.takeSpill(LAB_BREW); api.addPotions(1); api.save(); api.toast('Bubbling, a flash, a smell of burnt sugar: one potion.'); }};
    const shard=s.lab&&!api.hasTopper('shard')?[{label:'Fuse a quintessence shard for your staff ('+SHARD_SPILL+' spill)', disabled:api.spillTotal()<SHARD_SPILL, fn:()=>{ api.takeSpill(SHARD_SPILL); api.save(); api.earnTopper('shard','The spill runs together in the crucible into one long crystal, and Fizzwick binds it in gold wire'); }}]:[];
    if(!s.lab){
      say(0,F+' bounds up. "The safety test! Wonderful. Nobody\'s failed it in weeks." You are led to a warded ring in the grass, where a bottle sits on a stone. Inside it something small and orange is pacing.\n\n"An Echo. A little one, out of Cindergate: a baker\'s boy, we think. Everyone here thinks a spell is a thing you do. It isn\'t. It\'s a thing you let loose, and this is what it looks like when it won\'t go back. Fire, so: what\'s its opposite? Yes. Water. And a strong ward, and a quick dispel. Ready?"\n\n'+F+' unstoppers it before you can answer.',[
        {label:'Face the bottled Echo', fn:()=>api.spar({
          foes:[{key:'echo_fire_weak',level:0,name:'The Bottled Echo'}],
          text:{winTitle:'Back in the Bottle', win:'It flickers and shrinks and pours itself back into the bottle like a sulking cat. '+F+' corks it, delighted. "Passed! It always reforms. It leaves a little behind, though; here, keep that."', loseTitle:'Singed', lose:'The wards flare and the Echo is back in its bottle, sulking. '+F+' pats out your sleeve. "Everybody fails the first time. Except the ones who fail the second."'},
          onWin:()=>{ if(!s.lab){ s.lab=true; api.addSpill('fire',1); api.save(); api.toast('The Laboratory: passed. +1 cinderglass'); setTimeout(()=>api.earnTopper('cage','Fizzwick hands over a little gold cage with a wisp inside. "A souvenir! It\'s quite safe. Mostly"'),1800); } }})},
        {label:'Not now'}]);
      return;
    }
    say(0,'"'+me+'! Still in one piece, I see." '+F+' waves at the smoking chimney. "Bring me spill from Corvanthe, any kind, and I\'ll distil you a potion. Two pieces a bottle. The Statutes say I mustn\'t do anything more interesting with it, and I never do anything they say I mustn\'t." A pause. "Lately."'+(s.stage>=2?'\n\n"Oh! And the Laboratory wants fresh samples from Cindergate, properly collected, by somebody with a licence and an escort. Field work. I\'ve put my name down. When it\'s approved, I\'ll want a pair of hands that has passed the safety test."':''),[brew].concat(shard,[{label:'Ask about spill', fn:()=>say(0,'"Quintessence. What\'s left when a working is unmade: pure element, settled out like frost. Every bit of it in Corvanthe was a person, once, more or less." A sip of tea. "We try not to think about it. We\'re very good at not thinking about things, here. It\'s the one thing we learned."',[brew])}]));
    return;
  }

  case 'chaplain': {
    const C=nm('chaplain'), hurt=api.hp()<api.maxHp();
    say(0,C+' is laying fresh flowers at the foot of the Memorial, one bunch at a time, reading the cards. "There\'s a card for every one of them, in the end." "Some years it takes a while."\n\n'+(hurt?C+' sees how you are standing. "You\'ve been hurt. Kneel a moment."':'"Go gently out there. And come back."'),[
      {label:hurt?'Kneel and be healed ('+api.hp()+' → '+api.maxHp()+' HP)':'Light a candle', fn:()=>{ if(hurt){ api.healFull(); api.toast('A warmth, very quiet, nothing anyone could call a spell. You are whole.'); } else api.toast('You light a candle for the Absent. It does not go out.'); }},
      {label:'Ask about the Memorial', fn:()=>say(0,'"Magister Orrin. He voted against the Word, and lost the vote, and stayed in the Collegium anyway because his students were there." A wreath is set straight. "We put up a statue of the one man who said no. It\'s a poor sort of apology, but it\'s the one we could afford."')}]);
    return;
  }

  case 'dealer': {
    const D=nm('dealer'), n=api.spillTotal();
    say(0,D+' keeps a stall hung with oilcloth and a licence in a gilt frame, and a ledger chained to the counter. "Quintessence bought, by licence of the University, at a fair price, '+SPILL_PRICE+' gold a piece, which is to say mine." A smile like a ledger. "And potions, for those who\'d rather not brew."',[
      {label:'Sell your spill ('+n+' × '+SPILL_PRICE+' = '+n*SPILL_PRICE+' gold)', disabled:n<1, fn:()=>{ const g=api.sellSpill(SPILL_PRICE); api.save(); api.toast('+'+g+' gold. The spill vanishes into a lead-lined box.'); }},
      {label:'Buy a potion ('+MARKET_POTION+' gold)', disabled:api.gold()<MARKET_POTION, fn:()=>{ api.addGold(-MARKET_POTION); api.addPotions(1); api.save(); api.toast('A potion, sealed with the University crest.'); }},
      {label:'Look at her curiosities (staff heads)', fn:()=>topperShop(n,api,'curios')},
      {label:'Not today'}]);
    return;
  }

  case 'aurelia': {
    const A=nm('aurelia');
    if(s.aureliaMet){
      say(0,A+' looks up from the cards spread on the bench before you can speak. "You\'re about to ask whether I\'ll still be here next term." A small smile. "No. I\'m going east, when the reading says so. And so are you." The top card is turned over: a tower, standing. "We\'ll meet again, further along. I\'ve seen it. You looked tired. I looked worse."');
      return;
    }
    s.aureliaMet=true; api.save();
    say(0,'A scholar in a doctoral gown sits on a bench in Radcliffe Square, laying out cards in rows under the Great Orrery and frowning at them. "Sit, if you like. Doctoral student: Foresight, which is the study of what hasn\'t happened yet, which the Statutes are very nervous about." '+A+' taps a card. "This one is you. It isn\'t supposed to be in this reading at all. It turns up in a much later one."',[
      {label:'Ask about Foresight', fn:()=>{ say(0,'"Everyone in Corvanthe who could see the future saw the Unweaving coming. Every one. And they all thought someone else would stop it." The cards are swept up. "So here we read the future the way you\'d read a weather glass. Carefully, and then you take a coat." A pause. "Take a coat, '+me+'."'); }},
      {label:'Leave the cards be'}]);
    return;
  }

  case 'ponder': {
    const P_=nm('ponder');
    if(s.satchelDone){ say(0,P_+' is asleep again, a book open face-down on top. Under the book the sleeper is very slightly see-through, and murmuring: "…three hundred words on invisibility, by Friday…"'); return; }
    if(s.satchel){
      say(0,'You hand back the satchel. '+P_+' clutches it as if it might vanish too. "My notes! I\'ve been invisible on and off for a week trying to find them, which, I can tell you, does not help." Something is pressed into your hand. "My tutor gave me this for emergencies. This is the emergency I\'d have had."',[
        {label:'Take it', fn:()=>{ s.satchelDone=true; s.satchel=false; api.addPotions(1); api.addGold(10); api.save(); api.toast('+1 potion, +10 gold'); }}]);
      return;
    }
    say(0,'A student is asleep under the tree, gown for a pillow. As you come near the student wakes with a start, and for a moment you can see the grass through the sleeper. "I\'m not here. I mean, I am. Sorry. Third year, Lantern." '+P_+' rubs at both eyes. "I\'ve lost my satchel. All my notes. I was in the Parks, practising, and I vanished, and when I came back it hadn\'t. Somewhere near the Laboratory. If you see it…"',[{label:'I\'ll keep an eye out', fn:()=>{ s.satchelAsked=true; api.save(); }}]);
    return;
  }
  }
}

// inspecting a quest object on the map; returns true if handled
function inspect(o, api){
  if(o.lore!=='q:satchel') return false;
  const s=q(api), L=api.lore(o.lore);
  if(s.satchel||s.satchelDone){ api.removeObj(o); return true; }
  api.dialog(L[0],L[1],[{label:'Take it to Ponder', fn:()=>{ s.satchel=true; api.removeObj(o); api.save(); api.toast('Ponder was asleep on the Meadow, by the river.'); }},{label:'Leave it'}]);
  return true;
}
// things already taken stay taken
function hidden(o, api){ const s=q(api); return o.lore==='q:satchel'&&(s.satchel||s.satchelDone); }

window.ExploreFolk={knows, title, sprite, face, talk, inspect, hidden, absent, metAtUni, journal, MATRIC, FOLK};
})();
