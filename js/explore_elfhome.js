// ═══════════════════════════════════════════════════════════════════════
// ELFHOME: the Moriquende's town, walked in Explore (maps/elfhome.json, tools/mapgen/elfhome.js), and
// Sylvara's central command for the forest year (js/forest.js). Who's here and what they say:
// Sylvara (the Warden: she meets you and gives you the watch; away tending the trees most of the year),
// one leader for each of the six houses of the old Elfhome project (Elders, Seers, Talons, Healers, Guild,
// Charming), the Watch Table (opens the year) and the Healing House (heals you and shortens wounds).
// Hooked into js/explore_folk.js like the University Year: knows, title, sprite, face, talk, inspect,
// absent. The leaders are painted from the elf hero figures when you first enter (prep).
// ═══════════════════════════════════════════════════════════════════════
(function(){
'use strict';

// names from the old project's lists (Elders and Healers Welsh, Seers Manx, Talons Breton, Guild Irish);
// none shares a name or near-spelling with the creator's (js/explore_hero.js NAMES)
const PEOPLE = {
  warden:     {name:'Sylvara', title:'Warden of the Moriquende', roster:'sylvara'},
  elf_elder:  {name:'Olwen Derwen', title:'Eldest of the Elders', house:'Elders',
    look:{name:'Olwen', sex:'f', age:'old', race:'elf', fig:'elf_woman_3', robe:'Ash', trim:'Gold', hair:'White', skin:'Fair', eyes:'Grey', elem:'arcane', staff:'Silverwood', topper:'crescent'}},
  elf_seer:   {name:'Calybride Seren', title:'Seer-Captain', house:'Seers',
    look:{name:'Calybride', sex:'f', age:'young', race:'elf', fig:'elf_woman_5', robe:'Midnight', trim:'Silver', hair:'Blonde', skin:'Pale', eyes:'Blue', elem:'air', staff:'Ash', topper:'crystal'}},
  elf_talon:  {name:'Gwilherm Hebog', title:'Talon-Captain', house:'Talons',
    look:{name:'Gwilherm', sex:'m', age:'young', race:'elf', fig:'elf_man_4', robe:'Forest', trim:'Copper', hair:'Brown', skin:'Tan', eyes:'Green', elem:'earth', staff:'Blackthorn', topper:''}},
  elf_healer: {name:'Essyllt Celyn', title:'Mistress of the Healing House', house:'Healers',
    look:{name:'Essyllt', sex:'f', age:'middle', race:'elf', fig:'elf_woman_2', robe:'Teal', trim:'Bone', hair:'Auburn', skin:'Olive', eyes:'Hazel', elem:'water', staff:'Driftwood', topper:'hoop'}},
  elf_guild:  {name:'Kennan Saer', title:'Guildmaster', house:'Guild',
    look:{name:'Kennan', sex:'m', age:'middle', race:'elf', fig:'elf_man_6', robe:'Russet', trim:'Copper', hair:'Black', skin:'Natural', eyes:'Brown', elem:'earth', staff:'Oak', topper:''}},
  elf_charm:  {name:'Ifan Bedw', title:'Beast-speaker', house:'Charming',
    look:{name:'Ifan', sex:'m', age:'young', race:'elf', fig:'elf_man_2', robe:'Ochre', trim:'Jade', hair:'Copper', skin:'Fair', eyes:'Amber', elem:'air', staff:'Driftwood', topper:'crook'}},
};
const HEAL_WEEKS = 2;    // the Healing House takes this many weeks off a wound (once a week)
const up = s => s.charAt(0).toUpperCase()+s.slice(1);

const yearOf = api => { const q=api.quest('forest'); return q.S||null; };
const running = api => { const S=yearOf(api); return !!(S&&!S.over); };
const FE = () => window.ForestEngine||null;
const sylOf = S => S&&S.elves.find(e=>e.role==='sylvara');

function knows(role){ return !!PEOPLE[role]; }
function title(n){ const P=PEOPLE[n.role]; return P?P.title+' ('+P.name+')':null; }
function sprite(n, api){ const P=PEOPLE[n.role]; if(!P) return null; if(P.roster){ const c=api.chars[P.roster]; return c&&c.sprite||null; } return P._sprite||null; }
function face(n){ const P=PEOPLE[n.role]; if(!P) return null; return P.roster?'portraits/small/'+P.roster+'.jpg':P._face||null; }
// Sylvara is out tending the trees most of the year: she's in Elfhome before it, after it, and in weeks
// she's home (wounded, or between trees)
function absent(n, api){
  if(n.role!=='warden') return false;
  const S=yearOf(api); if(!S||S.over) return false;
  const s=sylOf(S); return !(s&&(s.pos===FE().HOME||s.wounded));
}
// paint the elves before Elfhome's first draw
async function prep(api){
  const jobs=Object.values(PEOPLE).filter(P=>P.look&&!P._sprite).map(async P=>{
    try{ const d=await api.heroDef(P.look); if(d){ P._sprite=d.sprite; P._face=d.face; } }catch(e){}
  });
  await Promise.all(jobs);
}

// ── the year, as Elfhome sees it ──
function weekLine(S){ const F=FE(); return F.SEASONS[F.seasonOf(S.turn)]+', week '+F.weekOf(S.turn)+' of the year ('+S.turn+' of '+F.YEAR+')'; }
function treesLine(S){ const done=S.trees.filter(t=>t.done&&!t.dead).length, dead=S.trees.filter(t=>t.dead).length; return done+' of '+S.trees.length+' ancient trees tended'+(dead?', '+dead+' lost':''); }

function talk(n, api){
  const P=PEOPLE[n.role], S=yearOf(api), F=FE(), me=api.wizName();
  const say=(x,ch)=>api.dialog(title(n),x,ch||[]);
  const watch={label:'🗺 To the Watch Table', fn:()=>api.openForest()};
  switch(n.role){
  case 'warden': {
    if(!S){
      say('A tall woman in bark-brown robes takes Mother Agathe\'s letter from your hand and reads it twice. "So Agathe sent me a wizard." Sylvara, the Warden of the Moriquende, looks you over. "Good. I asked for one. The orcs the Unweaving drove out of the east will be in my wood by midsummer, and I can\'t watch for them: the four eldest trees must be tended before the year turns, or they die, and only I can tend them." She nods at the great table under the Heart Tree. "Keep Elfhome standing. Keep the wood in balance. And keep me alive while I walk. The Watch Table is yours."',
        [{label:'I\'ll keep the watch', fn:()=>api.openForest()},{label:'Not yet'}]);
      return;
    }
    if(S.over){
      const E=F.ENDINGS[F.score(S).ending];
      say(E.text+(S.over==='fallen'?' "Come back in the spring. We\'ll build it again."':''),S.over!=='fallen'&&F.score(S).ending==='song'?[]:[{label:'Try another year', fn:()=>api.openForest({fresh:true})},{label:'Not now'}]);
      return;
    }
    const s=sylOf(S);
    if(s.wounded) say('Sylvara is lying on a pallet in the Healing House doorway, a bandage round her ribs. "'+(s.wounded>1?s.wounded+' more weeks, Essyllt says.':'Next week, Essyllt says.')+' The trees won\'t wait. Neither will I." '+treesLine(S)+'.',[watch]);
    else say('Sylvara is back between trees, washing the moss from her hands at the spring. "'+treesLine(S)+'. '+(S.trees.every(t=>t.done||t.dead)?'That\'s all of them. Now we only have to hold.':'I go out again as soon as the way is clear.')+' Watch the road for me, '+me+'."',[watch]);
    return;
  }
  case 'elf_elder': {
    const intro='An old elf with a face like folded paper sits on the worn bench. "The Council of Elders. Six houses, one Elfhome. We don\'t expand, wizard: that\'s the first thing the young ones forget. We keep. The wood keeps us."';
    if(!S||S.over){ say(intro+' "The goblins breed, the Varg eat goblins, the orcs eat everything. Keep each in check by the others and the wood will thank you."'); return; }
    const mood=F.mood(S);
    const state=weekLine(S)+'. The wood is '+(mood==='content'?'content: the old trees will fight for us':mood==='uneasy'?'uneasy: paths shift, and mist sits where it shouldn\'t':'angry: our hunters come home empty')+'. Food in the stores: '+Math.floor(S.food)+'.';
    say(intro+' "'+state+'"',[{label:'🌿 Ask for counsel', fn:()=>counsel(n,api,0)},watch]);
    return;
  }
  case 'elf_seer': {
    const intro='A young elf with frost-pale hair and a lantern that burns blue. "We are the Seers. We can\'t watch the whole wood, nobody can. So we choose. Put a Seer up a sentry post and she sees a ring of hexes clearly and two dimly; on a hill, more. Old growth hides what\'s inside it from everyone outside."';
    if(!S||S.over){ say(intro+' "And listen. Smoke, drums, howling, birds starting up: the wood tells you what your eyes can\'t. Goblin shamans light false fires, though."'); return; }
    const seers=S.elves.filter(e=>e.role==='seer'&&!e.wounded).length;
    say(intro+' "'+seers+' of us on watch this week, and we see '+Math.round(F.coverage(S)*100)+'% of the wood clearly, '+Math.round(F.coverage(S,true)*100)+'% at all."',[watch]);
    return;
  }
  case 'elf_talon': {
    const intro='A lean elf restringing a longbow, a row of notches on the door behind him. "Talons. We fight, we hunt, we hold the sentry posts: a Talon in a post shoots whatever walks past it at night. And we harry. An orc camp with Talons in the trees all round it doesn\'t sleep, and orcs who don\'t sleep move on."';
    if(!S||S.over){ say(intro+' "Watch for the drums. Ten orcs or more with a war-totem beat them, and three weeks later they march on Elfhome. Break the totem and the drums stop."'); return; }
    const orcs=S.bands.filter(b=>b.fac==='orc'&&b.n>0), seen=orcs.filter(b=>S.vis[b.k]==='clear'), drums=orcs.some(b=>b.drums>0), march=orcs.some(b=>b.state==='march');
    say(intro+' "'+(march?'They\'re marching on us. Every bow to Elfhome.':drums?'War drums, somewhere. A Warhost is gathering. Find the totem.':orcs.length?(seen.length?seen.length+' orc band'+(seen.length>1?'s':'')+' in sight.':'There are orcs in the wood. We just can\'t see them.'):F.seasonOf(S.turn)===0?'No orcs yet. They\'ll come from the east by summer.':'No orcs in the wood that we know of.')+'"',[watch]);
    return;
  }
  case 'elf_healer': {
    const intro='A calm elf with stained hands and a sprig of woundwort behind one ear. "The Healing House. Lie down, wizard. Everyone who walks through that door thinks they\'re fine."';
    const ch=[{label:'🛏 Sleep in the Healing House ('+api.hp()+' → '+api.maxHp()+' HP)', disabled:api.hp()>=api.maxHp()&&!woundsToMend(S)&&!(api.sleepy&&api.sleepy()), fn:()=>rest(n,api)}];
    if(S&&!S.over) ch.push(watch);
    const hurt=S&&!S.over?S.elves.filter(e=>e.wounded).length:0;
    say(intro+(hurt?' "'+hurt+' in my beds this week. I\'m doing what I can."':''),ch);
    return;
  }
  case 'elf_guild': {
    const intro='A broad elf in a leather apron with rope over both shoulders. "Guild. We build. A sentry post takes two weeks, and a Seer in it sees twice as far. A thorn hedge takes one, and anything that walks into it stops a week to cut its way out."';
    if(!S||S.over){ say(intro+' "Hills for the posts, if you can. And not where the orcs will chop the tree down under you."'); return; }
    const posts=Object.values(S.hexes).filter(h=>h.talan&&!h.build).length-1, building=Object.values(S.hexes).filter(h=>h.build>0).length;
    say(intro+' "'+posts+' sentry post'+(posts===1?'':'s')+' up in the wood'+(building?', and '+building+' going up':'')+'."',[watch]);
    return;
  }
  case 'elf_charm': {
    const intro='A young elf with antlers sewn onto his hood is feeding something you can\'t see under the cart. "Beast-speakers. I can walk a herd of deer a hex at a time, and sing a Varg pack quiet for a few weeks. The Varg belong here, wizard. They\'re the only thing keeping the goblins down."';
    if(!S||S.over){ say(intro+' "Feed the Varg and they leave us be. Starve them, by hunting the deer out, and they come for us."'); return; }
    const game=F.gameTotal(S), packs=S.bands.filter(b=>b.fac==='varg'&&b.n>0), hungry=packs.filter(b=>b.hunger>=3&&!b.calm).length;
    say(intro+' "'+game+' deer in the wood, '+(game<F.BANDS.game[0]?'too few: the Varg will go hungry':game>F.BANDS.game[1]?'too many: they\'re stripping the glades':'about right')+'. '+packs.length+' Varg pack'+(packs.length===1?'':'s')+(hungry?', '+hungry+' of them hungry':'')+'."',[watch]);
    return;
  }
  }
}
// Olwen's counsel: ForestEngine.counsel reads the board as your watchers see it and ranks what to do;
// she gives it COUNSEL_PAGE at a time, most urgent first
const COUNSEL_PAGE = 3;
const HOUSE_TAG = {Talons:'🏹', Seers:'👁', Guild:'🔨', Charming:'🦌', Healers:'🌿', Elders:'📜', Sylvara:'🌳', Spell:'✨'};
function counsel(n, api, from){
  const S=yearOf(api), F=FE(); if(!S||S.over) return;
  const all=F.counsel(S), page=all.slice(from, from+COUNSEL_PAGE);
  const open=from===0?'Olwen spreads her thin hands on the bench as if it were the Watch Table. "Here is how the wood looks from where I sit."':'"There\'s more, if you\'ve the patience for an old woman."';
  const body=page.map(a=>(HOUSE_TAG[a.house]||'•')+' '+a.text).join('\n\n');
  const more=from+COUNSEL_PAGE<all.length;
  const close=more?'':' "That\'s all I have. The rest is yours to judge."';
  api.dialog(title(n), open+'\n\n'+body+(close?'\n\n'+close.trim():''),
    [...(more?[{label:'📜 What else?', fn:()=>counsel(n,api,from+COUNSEL_PAGE)}]:[]), {label:'🗺 To the Watch Table', fn:()=>api.openForest()}, {label:'Thank you'}]);
}

// the Healing House: rest to full, and once a week the healers take weeks off the wounded's mending
function woundsToMend(S){ return !!(S&&!S.over&&S.healedWeek!==S.turn&&S.elves.some(e=>e.wounded>1)); }
function rest(n, api){
  const S=yearOf(api); const out=[];
  if(api.feedHorse) api.feedHorse(); const t=api.sleep?api.sleep(1):(api.healFull(),null); out.push('You sleep among the herbs and wake whole'+(t?' at '+t:'')+'.');
  if(woundsToMend(S)){
    S.healedWeek=S.turn; let k=0;
    for(const e of S.elves) if(e.wounded>1){ e.wounded=Math.max(1,e.wounded-HEAL_WEEKS); k++; }
    out.push('Essyllt and her healers work through the night: '+k+' of the wounded will be back on their feet sooner.');
  }
  const me=S&&S.elves.find(e=>e.role==='wizard'); if(me&&!me.wounded){ me.hp=FE().ROLES.wizard.hp; S.wizHpSync=me.hp; }
  api.save(); api.toast(out.join(' '));
}
// the Watch Table opens the year (only once Sylvara has given you the watch)
function inspect(o, api){
  if(o.lore!=='watchtable') return false;
  const L=api.lore(o.lore), S=yearOf(api);
  if(!S) api.dialog(L[0],L[1]+' Sylvara will want to give you the watch herself. She\'s by the Heart Tree.',[]);
  else api.dialog(L[0],L[1]+(S.over?' The year is done.':' '+weekLine(S)+'; '+treesLine(S)+'.'),[{label:'🗺 Take the watch', fn:()=>api.openForest()},{label:'Not now'}]);
  return true;
}
// arriving: Sylvara is waiting
function onMap(api){ if(api.mapId()==='elfhome'&&!yearOf(api)) api.toast('Sylvara is waiting for you by the Heart Tree.'); }

window.ExploreElfhome={knows, title, sprite, face, talk, inspect, absent, prep, onMap, PEOPLE};
})();
