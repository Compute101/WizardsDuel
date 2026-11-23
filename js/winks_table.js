// ── WINKS TABLE ────────────────────────────────────────────
// A tabletop you can play the Winks game on (docs/winks-rules.md) against one AI player, to see how the
// real-world game would go before making the hand-made cards. Everything is laid out as it would be
// on a real table: your wizard sheet with its HP and mana tokens, a painted miniature of your wizard
// standing on a paper ward circle, the command cards and a hand of element cards (a standard deck,
// each suit one of the four elements picked at the start), the shared draw pile and discards, and a
// tiddlywinks cup with six winks each. You flick on screen (drag back and let go, like a squidger)
// or flick real winks and enter how many went in.
// The rules are the tabletop engine's 'winks' rule set (js/tabletop.js, window.TT): this file only
// draws the table and turns taps into picks. Opened from the title screen's Test menu (🃏 Winks
// Table). It never touches the standard game.
(function(){
'use strict';

const SIX=['eldrin','mal','gnash','valdris','cinder','skadi','mary','sylvara'];   // four men, four women
const EL={
  fire:{name:'Fire', icon:'🔥', col:'#ff6622'},   air:{name:'Air', icon:'💨', col:'#9fe8dc'},
  lightning:{name:'Lightning', icon:'⚡', col:'#f5d400'}, arcane:{name:'Arcane', icon:'🌀', col:'#b77cff'},
  water:{name:'Water', icon:'🌊', col:'#3a8cff'}, earth:{name:'Earth', icon:'🪨', col:'#b8864a'},
  ice:{name:'Ice', icon:'❄️', col:'#6cc8f0'},     dark:{name:'Dark', icon:'💀', col:'#8a3cc4'},
};
// Suits as text, never emoji (the U+2660 block has emoji forms): FE0E asks for the text glyph
const SUITS=[{s:'♠︎', red:false, name:'Spades'},{s:'♥︎', red:true, name:'Hearts'},
  {s:'♦︎', red:true, name:'Diamonds'},{s:'♣︎', red:false, name:'Clubs'}];
// The hand-made command cards
const CMDS=[
  {id:'strike',  name:'Strike',  icon:'💥', kind:'spell', cat:'damage'},
  {id:'ward',    name:'Ward',    icon:'🛡️', kind:'spell', cat:'protect'},
  {id:'dispel',  name:'Dispel',  icon:'🧶', kind:'spell', cat:'dispel'},
  {id:'ab1',     name:'Ability', num:1, icon:'📜', kind:'ability'},
  {id:'ab2',     name:'Ability', num:2, icon:'📜', kind:'ability'},
  {id:'ab3',     name:'Ability', num:3, icon:'📜', kind:'ability'},
  {id:'attack',  name:'Attack',  icon:'⚔️', kind:'decoy', pick:{cat:'damage', act:'attack'}},
  {id:'guard',   name:'Guard',   icon:'✋', kind:'decoy', pick:{cat:'protect', act:'guard'}},
  {id:'grapple', name:'Grapple', icon:'🤼', kind:'decoy', pick:{cat:'dispel', act:'grapple'}},
  {id:'meditate',name:'Meditate',icon:'🧘', kind:'decoy', pick:{cat:'meditate'}},
  {id:'cleanse', name:'Cleanse', icon:'✨', kind:'decoy', pick:{cat:'dispel', self:true, ring:1}},
];
const cmdById=id=>CMDS.find(c=>c.id===id);
// Ability texts as the Winks rulebook words them (flat cost, a ward holds 12 at most)
const TEXT={
  shield:'An Arcane ward of 12 (the most a ward can hold).',
  counter:'Buff: anyone who strikes you takes 4, and your ward doesn\'t wear down.',
  ward:'Buff: curses can\'t touch you, and the next dispel at you only removes this Ward.',
  empower:'Buff: your next strike deals double damage.',
  bloodpact:'Before you pay, turn 3 HP into 3 mana. If it goes off, gain 4 more mana.',
  drain:'A Dark strike of 5. Heal half the HP damage it deals.',
  fireball:'A Fire strike of 4.',
  flameshield:'A Fire ward of 8. While it holds, anyone who strikes you takes 2.',
  candle:'Curse: the foe takes 2 each time they cast Protection or Meditate.',
  icelance:'An Ice strike of 5. If it reaches HP, the foe can\'t pick Damage next round.',
  frostarmor:'Buff: every hit on you deals 1 less (at least 1), and strikers take 1.',
  blizzard:'Curse: at every round end the foe takes 1 and loses 1 mana.',
  warpaint:'Buff: every hit on you deals 1 less (at least 1).',
  charge:'A blow of 5 (wards don\'t stop it). The foe loses 2 mana.',
  frenzy:'Buff: your strikes deal +2, but each costs you 1 HP.',
  raisedead:'Raise 3 skeletons (5 at most). Guarding, each soaks a point of damage; attacking, each bites for 1. Aim at them to sweep them: one dies per point.',
  necroticdrain:'A Dark strike of 4. Heal half the HP damage it deals.',
  soultithe:'Curse: the foe loses 1 mana for each of your skeletons they kill.',
  divineheal:'Heal 6.',
  purge:'Remove all your curses and heal 3.',
  radiant:'An Arcane strike of 3. The foe loses 2 mana.',
  smite:'Buff: your next 3 Attacks are Arcane magic and deal 3 (a ward stops them, a Guard doesn\'t). A yellow token per Attack left.',
  heal:'Buff: heal 1 at every round end.',
  entangle:'Curse: roll a die; on 4+ the foe can\'t pick Damage next round.',
  vinewhip:'A blow of 3 (wards don\'t stop it). Curse: vines deal 1 blow to the foe at every round end.',
};
// How the AI player flicks: one of the user's real 12-round games (rounds shuffled), or a steady rate
const FOE_SKILL={
  daddy:{label:'Daddy\'s games (about 2 a round)'},
  b:{label:'B\'s games (about 3 a round)'},
  steady:{label:'A steady 40% flicker', rate:0.4},
};
// On-screen flick: how far a wink strays (scatter, design px) by difficulty
const AIM={easy:{sd:13, guide:true}, normal:{sd:21, guide:false}, hard:{sd:30, guide:false}};
const CUP_R=30, RIM=9, MAX_PULL=130;

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let CHARS=null, loading=null;
let G=null;            // the table: {human, ai, phase, sel, ...}
let opts={me:'cinder', foe:'random', skill:'daddy', flick:'screen', aim:'normal', foeName:'Squop'};
try{ Object.assign(opts, JSON.parse(localStorage.getItem('wd-winks-table')||'{}')); }catch(e){}
const saveOpts=()=>{ try{ localStorage.setItem('wd-winks-table', JSON.stringify(opts)); }catch(e){} };

function load(){
  if(loading) return loading;
  const get=u=>fetch(u,{cache:'no-cache'}).then(r=>{ if(!r.ok) throw new Error(u+' '+r.status); return r.json(); });
  loading=Promise.all([get('characters.json'),get('tabletop.json'),get('fighters.json')]).then(([c,t,f])=>{
    CHARS=c; TT.load(c,t,f);
  }).catch(e=>{ loading=null; throw e; });
  return loading;
}
const S=()=>TT.state;
const st=w=>TT.state[w];
const who=w=>w===G.human?'You':G.foeName;
const suitOf=e=>{ const i=S().elems.indexOf(e); return i<0?null:SUITS[i]; };
const spells=w=>st(w).c.spells;
const charOf=k=>CHARS[k]||{};

// ── Tavern music ───────────────────────────────────────────
// A playlist (audio/tavern/, tools/music/tavern.py and tavern_set.py): Squop's jigs, a reel, a waltz, a
// polka and a slip jig, at different tempos, quiet and cheery. Each ends with a pause of its own, and the
// next one starts when it's over; the order is shuffled each time round, never the same tune twice running.
// Web Audio (the next tune is fetched while one plays), an <audio> element if that's missing; fades in and
// out. The ♪ button turns it off (opts.music). It starts from the tap that opened the table, so phones allow it.
const TAVERN_TUNES=['jigs','reel','waltz','polka','slipjig'], TAVERN_VOL=0.55;
const tavernSrc=n=>'audio/tavern/'+n+'.mp3?v=1';
const Tavern=(()=>{
  let ctx=null, gain=null, src=null, el=null, want=false, order=[], pos=-1, token=0;
  const bufs={};
  const load=n=>bufs[n]||(bufs[n]=fetch(tavernSrc(n)).then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>ctx.decodeAudioData(b,ok,no))));
  function next(){
    pos++;
    if(pos>=order.length){
      const last=order[order.length-1];
      order=TAVERN_TUNES.slice().sort(()=>Math.random()-0.5);
      if(order[0]===last) order.push(order.shift());
      pos=0;
    }
    return order[pos];
  }
  function startTune(n){
    const my=++token;
    load(n).then(buf=>{
      if(!want||my!==token) return;
      src=ctx.createBufferSource(); src.buffer=buf; src.connect(gain);
      const s=src; s.onended=()=>{ if(want&&my===token&&src===s){ src=null; startTune(next()); } };
      s.start();
      load(order[pos+1]||order[0]).catch(()=>{});            // the next one, ready in time
    }).catch(fallback);
  }
  function play(){
    want=true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) throw 0;
      if(!ctx){ ctx=new AC(); gain=ctx.createGain(); gain.gain.value=0; gain.connect(ctx.destination); }
      if(ctx.state==='suspended') ctx.resume();
      const t=ctx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value,t);
      gain.gain.linearRampToValueAtTime(TAVERN_VOL,t+1.5);
      if(!src) startTune(next());
    }catch(e){ fallback(); }
  }
  function fallback(){
    if(!want) return;
    if(!el){ el=new Audio(); el.onended=()=>{ if(want){ el.src=tavernSrc(next()); const p=el.play(); if(p&&p.catch) p.catch(()=>{}); } }; }
    if(!el.src||el.ended) el.src=tavernSrc(next());
    el.volume=TAVERN_VOL; const p=el.play(); if(p&&p.catch) p.catch(()=>{});
  }
  function stop(){
    want=false; token++;
    if(el) el.pause();
    if(ctx&&gain&&src){
      const t=ctx.currentTime, s=src; src=null;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value,t); gain.gain.linearRampToValueAtTime(0,t+0.8);
      setTimeout(()=>{ try{ s.stop(); }catch(e){} },900);
    }
  }
  // a start the browser blocked gets another go at the next tap
  window.addEventListener('pointerdown',()=>{ if(want&&ctx&&ctx.state==='suspended') ctx.resume(); },true);
  return {play, stop, _now:()=>order[pos]};
})();
function musicBtn(){ const b=$('wk-music'); if(b){ b.textContent=opts.music===false?'\u266A\uFE0E off':'\u266A\uFE0E'; b.style.opacity=opts.music===false?0.55:1; } }

// ── Screen ─────────────────────────────────────────────────
function build(){
  const d=document.createElement('div');
  d.id='wk-screen'; d.className='wk';
  d.innerHTML=`
    <div class="wk-top">
      <div class="wk-title">🃏 Winks <span id="wk-round"></span></div>
      <div class="wk-top-btns">
        <button class="wk-btn" id="wk-music" type="button" title="Tavern music on / off">\u266A\uFE0E</button>
        <button class="wk-btn" id="wk-help" type="button">? Rules</button>
        <button class="wk-btn" id="wk-new" type="button">↺ New</button>
        <button class="wk-btn" id="wk-close" type="button">✕</button>
      </div>
    </div>
    <div class="wk-view" id="wk-view"><div class="wk-stage" id="wk-stage">
      <div class="wk-mat">
        <div class="wk-a osheet" id="wk-osheet"></div>
        <div class="wk-a omodel" id="wk-omodel"></div>
        <div class="wk-a oplay" id="wk-oplay"></div>
        <div class="wk-a legend" id="wk-legend"></div>
        <div class="wk-a cup" id="wk-cupzone"></div>
        <div class="wk-a log" id="wk-log"></div>
        <div class="wk-a yplay" id="wk-yplay"></div>
        <div class="wk-a ymodel" id="wk-ymodel"></div>
        <div class="wk-a ysheet" id="wk-ysheet"></div>
        <div class="wk-a cmds" id="wk-cmds"></div>
        <div class="wk-a hand" id="wk-hand"></div>
      </div>
      <canvas class="wk-fx" id="wk-fx"></canvas>
    </div></div>
    <div class="wk-bar"><div class="wk-hint" id="wk-hint"></div><div class="wk-actions" id="wk-actions"></div></div>
    <div class="wk-panel" id="wk-panel" hidden></div>`;
  document.body.appendChild(d);
  $('wk-close').onclick=close;
  $('wk-music').onclick=()=>{ opts.music=opts.music===false; saveOpts(); musicBtn(); if(opts.music===false) Tavern.stop(); else Tavern.play(); };
  $('wk-new').onclick=()=>setupPanel();
  $('wk-help').onclick=helpPanel;
  window.addEventListener('resize',()=>{ if(isOpen()) fit(); });
  const cv=$('wk-fx');
  cv.addEventListener('pointerdown',flickDown);
  cv.addEventListener('pointermove',flickMove);
  window.addEventListener('pointerup',flickUp);
  window.addEventListener('pointercancel',flickUp);
  return d;
}
const isOpen=()=>{ const d=$('wk-screen'); return !!d&&d.classList.contains('active'); };
function open(){
  const d=$('wk-screen')||build();
  d.classList.add('active');
  if(window.Explore&&Explore.titleMusic) Explore.titleMusic();   // the title theme makes way
  musicBtn(); if(opts.music!==false) Tavern.play();
  $('wk-hint').textContent='Shuffling the deck…';
  load().then(()=>{ TT.useRules('winks'); if(G&&!S().over&&G.phase!=='setup'){ render(); fit(); } else setupPanel(); })
    .catch(e=>{ $('wk-hint').textContent='Couldn\'t load the wizards: '+e.message; console.error(e); });
}
function close(){
  const d=$('wk-screen'); if(d) d.classList.remove('active');
  stopFx();
  Tavern.stop();
  if(window.Explore&&Explore.titleMusic) Explore.titleMusic();
  if(window.TT) TT.useRules('normal');   // the Tabletop screen and the pub expect Normal
}

// Fit the stage (designed at a fixed width) to the window
let scale=1;
function fit(){
  const v=$('wk-view'), sg=$('wk-stage');
  if(!v||!sg) return;
  const portrait=v.clientWidth<v.clientHeight*0.95;
  const W=portrait?580:1180;
  sg.style.width=W+'px';
  sg.classList.toggle('portrait',portrait);
  sg.style.transform='none';
  const H=sg.offsetHeight;
  scale=Math.min(v.clientWidth/W, v.clientHeight/H);
  sg.style.transform=`scale(${scale})`;
  sg.style.left=Math.max(0,(v.clientWidth-W*scale)/2)+'px';
  sg.style.top=Math.max(0,(v.clientHeight-H*scale)/2)+'px';
  const cv=$('wk-fx'), dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  cv._dpr=dpr;
  placeWinks();
}

// ── Setup ──────────────────────────────────────────────────
function panel(html){ const p=$('wk-panel'); p.innerHTML='<div class="wk-panel-box">'+html+'</div>'; p.hidden=false; return p; }
function hidePanel(){ $('wk-panel').hidden=true; }
function setupPanel(){
  G=null; stopFx();
  ['wk-osheet','wk-omodel','wk-oplay','wk-legend','wk-cupzone','wk-log','wk-yplay','wk-ymodel','wk-ysheet','wk-cmds','wk-hand'].forEach(i=>$(i).innerHTML='');
  $('wk-round').textContent=''; $('wk-actions').innerHTML='';
  $('wk-hint').textContent='Choose your wizards.';
  const face=k=>`<img src="portraits/small/${k}.jpg" alt="">`;
  const wizBtn=(k,field)=>`<button type="button" class="wk-wiz ${opts[field]===k?'on':''}" data-f="${field}" data-k="${k}">${face(k)}<span>${esc(TT.chars[k].name)}</span></button>`;
  const opt=(field,val,label)=>`<button type="button" class="wk-chip ${opts[field]===val?'on':''}" data-f="${field}" data-k="${val}">${label}</button>`;
  const p=panel(`<h2>A game of Winks</h2>
    <div class="wk-sub">Your wizard</div><div class="wk-wizrow">${SIX.map(k=>wizBtn(k,'me')).join('')}</div>
    <div class="wk-sub">${esc(opts.foeName)} plays</div><div class="wk-wizrow">${opt('foe','random','🎲 Random')}${SIX.map(k=>wizBtn(k,'foe')).join('')}</div>
    <div class="wk-sub">${esc(opts.foeName)} flicks like</div><div class="wk-row">${Object.keys(FOE_SKILL).map(k=>opt('skill',k,FOE_SKILL[k].label)).join('')}</div>
    <div class="wk-sub">Your flick</div><div class="wk-row">${opt('flick','screen','👆 On screen')}${opt('flick','real','🎯 Real winks (type the count)')}</div>
    <div class="wk-row wk-aimrow" ${opts.flick==='real'?'hidden':''}>${opt('aim','easy','Easy aim')}${opt('aim','normal','Normal aim')}${opt('aim','hard','Hard aim')}</div>
    <div class="wk-row"><button type="button" class="wk-btn big" id="wk-go">Deal the cards ▸</button></div>`);
  p.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ opts[b.dataset.f]=b.dataset.k; saveOpts(); setupPanel(); });
  $('wk-go').onclick=startGame;
}
function startGame(){
  hidePanel();
  const me=opts.me, foe=opts.foe==='random'?SIX.filter(k=>k!==me)[Math.floor(Math.random()*5)]:opts.foe;
  TT.useRules('winks');
  TT.newTable([{key:me},{key:foe}],{noDeal:true});
  const s=S();
  s.p1.human=true;
  s.elems=[]; s.pile=[]; s.discard=[]; s.p1.hand=[]; s.p2.hand=[]; s.p1.wardCards=[]; s.p2.wardCards=[];
  G={human:'p1', ai:'p2', foeName:opts.foeName, phase:'draft', sel:{cmd:null, card:null}, played:{}, log:[],
    stance:'guard', round:1, aiBag:null, flickRes:{}};
  // The AI's real game for this match: one recorded game, rounds shuffled
  const sk=FOE_SKILL[opts.skill]||FOE_SKILL.daddy;
  if(!sk.rate){ const games=TT.WINK_SCORES[opts.skill]||TT.WINK_SCORES.daddy; G.aiBag=shuffle(games[Math.floor(Math.random()*games.length)].slice()); G.aiGame=G.aiBag.slice(); }
  // Draft order: a coin toss, then A B B A
  G.first=Math.random()<0.5?'p1':'p2';
  const o=G.first==='p1'?'p2':'p1';
  G.draftOrder=[G.first,o,o,G.first];
  addLog(`Coin toss: ${G.first==='p1'?'you pick':G.foeName+' picks'} first.`);
  render(); fit();
  draftStep();
}
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

// ── Draft: the four elements ───────────────────────────────
function draftStep(){
  const s=S();
  if(s.elems.length>=4){
    TT.dealWith(s.elems);
    addLog('The deck is shuffled: 7 element cards each.');
    hidePanel(); startRound(); return;
  }
  const w=G.draftOrder[s.elems.length], suit=SUITS[s.elems.length];
  if(w===G.ai){
    $('wk-hint').textContent=`${G.foeName} is choosing an element for ${suit.name}…`;
    hidePanel();
    setTimeout(()=>{ const e=TT.draftPick(G.ai); s.elems.push(e); addLog(`${G.foeName} picks ${EL[e].name} for ${suit.name}.`); render(); draftStep(); },900);
    return;
  }
  $('wk-hint').textContent=`Pick an element for ${suit.name}.`;
  const open=TT.draftOpen(G.human), mine=spells(G.human), theirs=spells(G.ai);
  const btn=e=>{
    const ok=open.includes(e), taken=s.elems.includes(e), barred=st(G.human).c.forbidden.includes(e);
    const notes=[]; mine.filter(sp=>sp.elem===e).forEach(sp=>notes.push('your '+sp.name));
    theirs.filter(sp=>sp.elem===e).forEach(sp=>notes.push(G.foeName+'\'s '+sp.name));
    return `<button type="button" class="wk-elem ${ok?'':'off'}" data-e="${e}" ${ok?'':'disabled'} style="--ec:${EL[e].col}">
      <span class="i">${EL[e].icon}</span><b>${EL[e].name}</b><small>${taken?'taken':barred?'barred':esc(notes.join(', ')||'—')}</small></button>`;
  };
  const p=panel(`<h2><span class="${suit.red?'red':''}">${suit.s}</span> ${suit.name}: pick an element</h2>
    <div class="wk-note">Your abilities need their elements in play. Opposites: Fire ↔ Water, Air ↔ Earth, Lightning ↔ Ice, Arcane ↔ Dark.</div>
    <div class="wk-elems">${TT.ELEMENTS.map(btn).join('')}</div>`);
  p.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ s.elems.push(b.dataset.e); addLog(`You pick ${EL[b.dataset.e].name} for ${suit.name}.`); render(); draftStep(); });
}

// ── A round ────────────────────────────────────────────────
function startRound(){
  G.phase='pick'; G.sel={cmd:null, card:null}; G.played={}; G.flickRes={}; G.result=null; G.aimBodies=false; G.asked=false;
  resetWinks();
  TT.swapRound();   // Squop may offer a swap (no Meditate needed)
  render();
  offerStep();
}
// An offer from Squop, asked before you pick
function offerStep(){
  const s=S(), offer=(s.offers||[]).find(o=>o.to===G.human);
  s.offers=[];
  if(!offer) return;
  panel(`<h2>${esc(G.foeName)} offers a swap</h2>
    <div class="wk-note">“My ${cardChip(offer.give)} for your ${cardChip(offer.want)}?”</div>
    <div class="wk-row"><button class="wk-btn" id="wk-yes">Swap</button><button class="wk-btn" id="wk-no">No thanks</button></div>`);
  $('wk-yes').onclick=()=>{ TT.answerOffer(offer,true,G.human); G.sel.card=null; addLog(`You swap your ${EL[offer.want].name} for ${G.foeName}'s ${EL[offer.give].name}.`); hidePanel(); render(); };
  $('wk-no').onclick=()=>{ TT.answerOffer(offer,false,G.human); addLog(`You turn down ${G.foeName}'s swap.`); hidePanel(); render(); };
}
// Your swap offer: any time you're picking, once a round
function swapPanel(msg){
  const me=st(G.human), give=[...new Set(me.hand)];
  const p=panel(`<h2>Offer ${esc(G.foeName)} a swap</h2>${msg?`<div class="wk-note">${msg}</div>`:''}
    <div class="wk-note">One card for one, once a round. ${esc(G.foeName)} can say no.</div>
    <div class="wk-row">Give <select id="wk-give">${give.map(e=>`<option value="${e}">${EL[e].name}</option>`).join('')}</select>
      for <select id="wk-want">${S().elems.map(e=>`<option value="${e}">${EL[e].name}</option>`).join('')}</select>
      <button class="wk-btn" id="wk-ask" ${give.length?'':'disabled'}>Ask</button><button class="wk-btn" id="wk-cancel">Cancel</button></div>`);
  $('wk-cancel').onclick=hidePanel;
  $('wk-ask').onclick=()=>{
    const g=$('wk-give').value, w=$('wk-want').value;
    if(g===w){ swapPanel('Ask for a different element than the one you give.'); return; }
    G.asked=true; G.sel.card=null;
    if(TT.askSwap(G.human,G.ai,g,w)) addLog(`${G.foeName} swaps their ${EL[w].name} for your ${EL[g].name}.`);
    else addLog(`${G.foeName} says no to your ${EL[g].name} for their ${EL[w].name}.`);
    hidePanel(); render();
  };
}
// The human's selection as an engine pick (or a reason it can't be played)
function humanPick(){
  const c=cmdById(G.sel.cmd), card=G.sel.card, me=st(G.human);
  if(!c) return {err:'Choose a command card.'};
  const hand=me.hand;
  if(c.kind==='spell'){
    if(card==null) return {err:'Add an element card: it gives the spell its element.'};
    const pick={cat:c.cat, elem:hand[card]};
    return check(pick);
  }
  if(c.kind==='ability'){
    const sp=spells(G.human)[c.num-1];
    if(!sp) return {err:'No such ability.'};
    if(!S().elems.includes(sp.elem)) return {err:`${sp.name} needs ${EL[sp.elem].name}, which isn't in play this game.`};
    if(card==null||hand[card]!==sp.elem) return {err:`${sp.name} needs a ${EL[sp.elem].name} card.`};
    return check({cat:sp.cat, sig:sp.id});
  }
  if(card==null&&hand.length) return {err:'Add any element card face down as a decoy (it comes back).'};
  return check(Object.assign({},c.pick));
}
function check(pick){
  const me=st(G.human);
  if(pick.cat==='meditate'&&me.medRound===S().round-1) return {err:'You can\'t Meditate two rounds running.'};
  if(!TT.canPick(me,pick)){
    if(pick.elem&&me.c.forbidden.includes(pick.elem)) return {err:`${me.c.name} is barred from ${EL[pick.elem].name}.`};
    if(me.effects.some(e=>e.type==='lock'&&e.cat===pick.cat)) return {err:'You\'re Chilled: no Damage this round.'};
    if(TT.costOf(me,pick)>me.mana) return {err:`You need ${TT.costOf(me,pick)} mana.`};
    return {err:'You can\'t pick that now.'};
  }
  if(minionsOf(G.human).length) pick.stance=G.stance;
  if(G.aimBodies&&canAimBodies(pick)) pick.minion='all';
  return {pick};
}
// A strike, Attack or Grapple can be aimed at the foe's skeletons: it sweeps them, one per point
function canAimBodies(pick){
  if(!pick||!minionsOf(G.ai).length) return false;
  if(pick.act) return pick.act!=='guard';
  if(pick.cat!=='damage') return false;
  const sp=pick.sig&&TT.sigById(st(G.human),pick.sig);
  return !sp||sp.kind==='strike';
}
function layDown(){
  const r=humanPick();
  if(r.err){ flashHint(r.err); return; }
  const me=st(G.human);
  G.picks={p1:r.pick};
  G.played.p1={cmd:G.sel.cmd, card:G.sel.card!=null?me.hand[G.sel.card]:null, cardIdx:G.sel.card, up:false};
  // The AI's pick, laid as cards
  const ap=TT.aiChoose(G.ai,'normal');
  G.picks.p2=ap;
  G.played.p2={cmd:cmdOfPick(G.ai,ap), card:cardOfPick(G.ai,ap), up:false};
  G.phase='laid';
  addLog('Both picks are face down.');
  render();
  setTimeout(()=>{ if(G&&G.phase==='laid') reveal(); },700);
}
function cmdOfPick(w,a){
  if(a.cat==='pass') return null;
  if(a.act) return a.act;
  if(a.cat==='meditate') return 'meditate';
  if(a.self) return 'cleanse';
  if(a.sig){ const i=spells(w).findIndex(sp=>sp.id===a.sig); return 'ab'+(i+1); }
  return {damage:'strike', protect:'ward', dispel:'dispel'}[a.cat]||'meditate';
}
function cardOfPick(w,a){
  const h=st(w).hand;
  if(a.sig){ const sp=TT.sigById(st(w),a.sig); return sp.elem; }
  if(a.elem&&!a.act) return a.elem;
  return h.length?h[Math.floor(Math.random()*h.length)]:null;
}
function reveal(){
  G.played.p1.up=true; G.played.p2.up=true; G.phase='revealed';
  const say=w=>`${who(w)}: ${pickName(w,G.picks[w])}${G.picks[w].minion?' at the skeletons':''}`;
  addLog(say('p1')+' · '+say('p2'));
  render();
  // Who flicks: anyone casting a spell they can pay for, the one with less HP first
  G.flickers=['p1','p2'].filter(w=>flicks(w,G.picks[w])).sort((a,b)=>st(a).hp-st(b).hp);
  setTimeout(nextFlicker,900);
}
const isSpell=a=>!a.act&&a.cat!=='meditate'&&a.cat!=='pass';
function flicks(w,a){ return isSpell(a)&&TT.canPick(st(w),Object.assign({},a,{stance:undefined})); }
function pickName(w,a){
  const c=cmdById(cmdOfPick(w,a));
  if(!c) return 'passes';
  if(a.sig){ const sp=TT.sigById(st(w),a.sig); return `${sp.name} (Ability ${c.num}, ${EL[sp.elem].icon})`; }
  if(a.elem&&!a.act&&!a.self) return `${c.name} ${EL[a.elem].icon} ${EL[a.elem].name}`;
  return c.name;
}

// ── The flick ──────────────────────────────────────────────
// Winks on the canvas, in stage coordinates: six in each player's row, flown at the cup
let winks=[], fxRaf=0, drag=null, cupAt={x:0,y:0}, rows={};
function placeWinks(){
  const sg=$('wk-stage'), cup=$('wk-cup');
  if(!sg||!cup) return;
  const r=sg.getBoundingClientRect(), c=cup.getBoundingClientRect();
  const loc=(el)=>{ const b=el.getBoundingClientRect(); return {x:(b.left+b.width/2-r.left)/scale, y:(b.top+b.height/2-r.top)/scale, w:b.width/scale}; };
  const cc=loc(cup); cupAt={x:cc.x, y:cc.y};
  ['p1','p2'].forEach(w=>{ const el=$('wk-wrow-'+w); if(el) rows[w]=loc(el); });
  winks.forEach(k=>{ if(k.state==='ready'){ const h=homeOf(k.w,k.i); k.x=h.x; k.y=h.y; } });
  if(!winks.length) resetWinks();
  drawFx();
}
function homeOf(w,i){ const r=rows[w]||{x:0,y:0,w:200}; const gap=Math.min(34,(r.w-20)/6); return {x:r.x+(i-2.5)*gap, y:r.y}; }
function resetWinks(){
  winks=[];
  ['p1','p2'].forEach(w=>{ for(let i=0;i<6;i++){ const h=homeOf(w,i); winks.push({w,i,x:h.x,y:h.y,state:'ready',z:0}); } });
  drawFx();
}
function nextFlicker(){
  if(!G) return;
  const w=G.flickers.shift();
  if(!w){ if(!chooseCleanse()) resolve(); return; }
  if(w===G.ai) aiFlick(); else humanFlick();
}
function aiPots(){
  const sk=FOE_SKILL[opts.skill];
  if(sk&&sk.rate){ let n=0; for(let i=0;i<6;i++) if(Math.random()<sk.rate) n++; return n; }
  if(!G.aiBag.length) G.aiBag=shuffle(G.aiGame.slice());
  return G.aiBag.pop();
}
function aiFlick(){
  const n=aiPots();
  G.flickRes[G.ai]=n;
  $('wk-hint').textContent=`${G.foeName} flicks…`;
  $('wk-actions').innerHTML='';
  const mine=winks.filter(k=>k.w===G.ai&&k.state==='ready');
  const ins=new Set(shuffle([0,1,2,3,4,5]).slice(0,n));
  mine.forEach((k,j)=>setTimeout(()=>{
    let to;
    if(ins.has(j)) to=inCupSpot();
    else { const a=Math.random()*Math.PI*2, d=CUP_R+RIM+12+Math.random()*70; to={x:cupAt.x+Math.cos(a)*d, y:cupAt.y+Math.sin(a)*d*0.8}; }
    fly(k,to,ins.has(j));
  },350*j));
  setTimeout(()=>{ addLog(`${G.foeName} pots ${n} of 6.`); render(); setTimeout(nextFlicker,700); },350*6+800);
}
function humanFlick(){
  G.phase='flick'; G.potted=0; G.flicked=0;
  if(opts.flick==='real'){
    $('wk-hint').textContent='Flick your six real winks, then tap how many went in.';
    $('wk-actions').innerHTML=[0,1,2,3,4,5,6].map(n=>`<button type="button" class="wk-btn num" data-n="${n}">${n}</button>`).join('');
    $('wk-actions').querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{ G.flickRes[G.human]=+b.dataset.n; showRealPots(+b.dataset.n); });
    return;
  }
  $('wk-fx').classList.add('live');
  flickHint();
}
function showRealPots(n){
  const mine=winks.filter(k=>k.w===G.human);
  mine.forEach((k,j)=>{ if(j<n) fly(k,inCupSpot(),true); else { const a=Math.random()*Math.PI*2, d=CUP_R+RIM+15+Math.random()*60; fly(k,{x:cupAt.x+Math.cos(a)*d,y:cupAt.y+Math.sin(a)*d*0.8},false); } });
  $('wk-actions').innerHTML='';
  addLog(`You pot ${n} of 6.`);
  setTimeout(()=>{ render(); nextFlicker(); },900);
}
function flickHint(){
  const left=6-G.flicked;
  $('wk-hint').textContent=left?`Flick! Drag back from a wink and let go. ${left} left · ${G.potted} in the cup.`:`${G.potted} in the cup.`;
  $('wk-actions').innerHTML='';
}
const inCupSpot=()=>{ const a=Math.random()*Math.PI*2, d=Math.random()*(CUP_R-10); return {x:cupAt.x+Math.cos(a)*d, y:cupAt.y+Math.sin(a)*d*0.6}; };
function fly(k,to,inCup,ms){
  k.state='flying'; k.from={x:k.x,y:k.y}; k.to=to; k.t0=performance.now(); k.ms=ms||620; k.inCup=inCup;
  loopFx();
}
function stagePoint(e){ const r=$('wk-stage').getBoundingClientRect(); return {x:(e.clientX-r.left)/scale, y:(e.clientY-r.top)/scale}; }
function flickDown(e){
  if(!G||G.phase!=='flick'||opts.flick==='real') return;
  const p=stagePoint(e);
  const k=winks.filter(x=>x.w===G.human&&x.state==='ready').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  if(!k||Math.hypot(k.x-p.x,k.y-p.y)>40) return;
  drag={k, p};
  e.preventDefault();
  try{ $('wk-fx').setPointerCapture(e.pointerId); }catch(_){}
  drawFx();
}
function flickMove(e){ if(!drag) return; drag.p=stagePoint(e); drawFx(); }
const gauss=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function aimOf(k,p){
  const dx=k.x-p.x, dy=k.y-p.y, len=Math.hypot(dx,dy);
  const pull=Math.min(MAX_PULL,len), power=pull/MAX_PULL;
  const reach=Math.hypot(cupAt.x-k.x,cupAt.y-k.y)*1.45;   // a full pull overshoots the cup a long way
  return {len, power, ux:len?dx/len:0, uy:len?dy/len:0, dist:power*reach};
}
function flickUp(){
  if(!drag) return;
  const {k,p}=drag; drag=null;
  const a=aimOf(k,p);
  if(a.len<12){ drawFx(); return; }
  const sd=AIM[opts.aim].sd*(0.55+a.power*0.7);
  const land={x:k.x+a.ux*a.dist+gauss()*sd, y:k.y+a.uy*a.dist+gauss()*sd};
  const d=Math.hypot(land.x-cupAt.x,(land.y-cupAt.y)/0.75);
  let inCup=d<CUP_R, to=land;
  if(!inCup&&d<CUP_R+RIM&&Math.random()<0.45) inCup=true;      // rattles round the rim and drops
  else if(!inCup&&d<CUP_R+RIM){ const ox=(land.x-cupAt.x)/(d||1), oy=(land.y-cupAt.y)/(d||1); to={x:land.x+ox*22, y:land.y+oy*18}; }   // bounces off the rim
  if(inCup) to=inCupSpot();
  fly(k,to,inCup,380+a.dist*0.9);
  G.flicked++; if(inCup) G.potted++;
  setTimeout(()=>{
    if(!G||G.phase!=='flick') return;
    flickHint();
    if(G.flicked>=6){
      $('wk-fx').classList.remove('live');
      G.flickRes[G.human]=G.potted;
      addLog(`You pot ${G.potted} of 6.`);
      G.phase='revealed';
      setTimeout(()=>{ render(); nextFlicker(); },700);
    }
  },420+a.dist*0.9);
}
function loopFx(){ if(!fxRaf) fxRaf=requestAnimationFrame(tickFx); }
function tickFx(now){
  fxRaf=0;
  let moving=false;
  winks.forEach(k=>{
    if(k.state!=='flying') return;
    const t=Math.min(1,(now-k.t0)/k.ms);
    const e=1-Math.pow(1-t,2);
    k.x=k.from.x+(k.to.x-k.from.x)*e; k.y=k.from.y+(k.to.y-k.from.y)*e;
    k.z=Math.sin(Math.PI*t)*Math.min(90,Math.hypot(k.to.x-k.from.x,k.to.y-k.from.y)*0.35);
    if(t>=1){ k.state=k.inCup?'in':'out'; k.z=0; } else moving=true;
  });
  drawFx();
  if(moving) loopFx();
}
function stopFx(){ if(fxRaf) cancelAnimationFrame(fxRaf); fxRaf=0; drag=null; const cv=$('wk-fx'); if(cv) cv.classList.remove('live'); }
const WINK_COL={p1:['#d9b3ff','#8a3cd8','#4b1a80'], p2:['#ffd1a0','#ff7a1a','#a14000']};
function drawWink(g,k){
  const c=WINK_COL[k.w], r=11*(1+k.z/160);
  if(k.z>0){ g.fillStyle='rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(k.x+k.z*0.25,k.y+k.z*0.35,11,7,0,0,7); g.fill(); }
  const y=k.y-k.z;
  const gr=g.createRadialGradient(k.x-r*0.35,y-r*0.4,1,k.x,y,r);
  gr.addColorStop(0,c[0]); gr.addColorStop(0.55,c[1]); gr.addColorStop(1,c[2]);
  g.fillStyle=gr; g.beginPath(); g.ellipse(k.x,y,r,r*0.86,0,0,7); g.fill();
  g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=1; g.stroke();
}
function drawFx(){
  const cv=$('wk-fx'); if(!cv) return;
  const g=cv.getContext('2d'), dpr=cv._dpr||1;
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,cv.width,cv.height);
  // Winks in the cup sit below the rim; the rest on the table
  winks.filter(k=>k.state==='in').forEach(k=>{ g.save(); g.globalAlpha=0.9; drawWink(g,k); g.restore(); });
  winks.filter(k=>k.state!=='in').sort((a,b)=>a.z-b.z).forEach(k=>drawWink(g,k));
  if(drag){
    const k=drag.k, p=drag.p, a=aimOf(k,p);
    // The squidger pressing the wink's edge, the pull, and (easy aim) where it would land
    g.strokeStyle='rgba(255,255,255,0.5)'; g.setLineDash([5,5]); g.lineWidth=2;
    g.beginPath(); g.moveTo(k.x,k.y); g.lineTo(k.x+a.ux*Math.min(80,a.dist*0.3),k.y+a.uy*Math.min(80,a.dist*0.3)); g.stroke(); g.setLineDash([]);
    g.fillStyle='rgba(30,30,30,0.85)'; g.beginPath(); g.arc(p.x,p.y,17,0,7); g.fill();
    g.strokeStyle='#c9a84c'; g.lineWidth=2; g.stroke();
    g.fillStyle=`hsl(${120-a.power*120},80%,55%)`; g.fillRect(k.x-22,k.y+18,44*a.power,5);
    g.strokeStyle='rgba(255,255,255,0.4)'; g.strokeRect(k.x-22,k.y+18,44,5);
    if(AIM[opts.aim].guide){ g.strokeStyle='rgba(255,255,160,0.7)'; g.beginPath(); g.ellipse(k.x+a.ux*a.dist,k.y+a.uy*a.dist,12,9,0,0,7); g.stroke(); }
  }
}

// Cleanse: you choose which curses go, when the winks you potted don't clear them all
function chooseCleanse(){
  const a=G.picks[G.human], n=G.flickRes[G.human];
  if(!a||!a.self||a.cat!=='dispel'||!n) return false;
  const cs=st(G.human).effects.filter(e=>e.kind==='curse'), count=[1,2,99][Math.min(3,Math.ceil(n/2))-1];
  if(cs.length<=count) return false;
  const chosen=[];
  const draw=()=>{
    panel(`<h2>Cleanse: remove ${count} curse${count>1?'s':''}</h2><div class="wk-note">You potted ${n}. Choose which go.</div>
      <div class="wk-row">${cs.map(e=>`<button class="wk-chip ${chosen.includes(e.id)?'on':''}" data-c="${e.id}">${esc(e.name||e.id)}</button>`).join('')}</div>
      <div class="wk-row"><button class="wk-btn big" id="wk-cl" ${chosen.length===count?'':'disabled'}>Cleanse these</button></div>`);
    $('wk-panel').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.c, i=chosen.indexOf(id);
      if(i>=0) chosen.splice(i,1); else if(chosen.length<count) chosen.push(id);
      draw();
    });
    $('wk-cl').onclick=()=>{ a.cleanse=chosen.slice(); hidePanel(); resolve(); };
  };
  draw();
  return true;
}

// ── Resolve ────────────────────────────────────────────────
function snapshot(w){ const s=st(w); return {hp:s.hp, mana:s.mana, ward:s.ward?s.ward.hp:0, sk:minionsOf(w).length, eff:s.effects.map(e=>e.name)}; }
function resolve(){
  G.phase='resolving';
  const before={p1:snapshot('p1'), p2:snapshot('p2')};
  const flicksGiven={};
  Object.keys(G.flickRes).forEach(w=>flicksGiven[w]={potted:G.flickRes[w]});
  const picks={p1:Object.assign({},G.picks.p1), p2:Object.assign({},G.picks.p2)};
  const roundNo=S().round;
  const out=TT.playRound(picks,flicksGiven);
  G.played.p1.cardIdx=-1;
  // What each cast came to
  ['p1','p2'].forEach(w=>{
    const a=picks[w], o=out[w], n=G.flickRes[w];
    let line;
    if(o==='fizzle') line=`${who(w)}: ${pickName(w,a)} fizzles (${n} of 6).`;
    else if(o==='nomana') line=`${who(w)}: not enough mana, nothing happens.`;
    else if(o==='cast'&&isSpell(a)&&!a.sig){
      const lv=['Lesser','Normal','Greater'][(a.ring||1)-1];
      line=`${who(w)}: ${lv} ${pickName(w,a)} (${n} of 6)${n%2===0?', 2 mana back':''}.`;
    }
    else if(o==='cast'&&a.sig) line=`${who(w)}: ${TT.sigById(st(w),a.sig).name} goes off (${n} of 6).`;
    else line=`${who(w)}: ${pickName(w,a)}.`;
    addLog(line);
  });
  const after={p1:snapshot('p1'), p2:snapshot('p2')};
  ['p1','p2'].forEach(w=>{
    const b=before[w], f=after[w], fl=[];
    if(f.hp<b.hp) fl.push(['−'+(b.hp-f.hp)+' HP','hurt']);
    if(f.hp>b.hp) fl.push(['+'+(f.hp-b.hp)+' HP','heal']);
    if(f.ward!==b.ward) fl.push([(f.ward>b.ward?'+':'−')+Math.abs(f.ward-b.ward)+' ward','ward']);
    if(f.sk!==b.sk) fl.push([(f.sk>b.sk?'+':'−')+Math.abs(f.sk-b.sk)+' skeleton'+(Math.abs(f.sk-b.sk)>1?'s':''),'skel']);
    if(out[w]==='fizzle') fl.unshift(['Fizzled!','fizz']);
    G.floats=G.floats||{}; G.floats[w]=fl;
  });
  G.lastOut=out; G.lastPicks=picks; G.resolvedRound=roundNo;
  render();
  setTimeout(()=>{ if(G){ G.floats={}; afterRound(); } },1600);
}
// After the round: an offer from the AI, your Meditate trade, the hand limit, then the next round
function afterRound(){
  const s=S();
  if(s.over){ s.offers=[]; overPanel(); return; }
  const offer=null;
  if(offer){
    s.offers=s.offers.filter(o=>o!==offer);
    const p=panel(`<h2>${esc(G.foeName)} offers a swap</h2>
      <div class="wk-note">“My ${cardChip(offer.give)} for your ${cardChip(offer.want)}?”</div>
      <div class="wk-row"><button class="wk-btn" id="wk-yes">Swap</button><button class="wk-btn" id="wk-no">No thanks</button></div>`);
    $('wk-yes').onclick=()=>{ TT.answerOffer(offer,true,G.human); addLog(`You swap your ${EL[offer.want].name} for ${G.foeName}'s ${EL[offer.give].name}.`); hidePanel(); render(); afterRound(); };
    $('wk-no').onclick=()=>{ TT.answerOffer(offer,false,G.human); addLog(`You turn down ${G.foeName}'s swap.`); hidePanel(); render(); afterRound(); };
    return;
  }
  s.offers=[];
  if(G.lastPicks.p1.cat==='meditate'&&G.lastOut.p1==='cast'&&!G.traded){ G.traded=true; tradePanel(); return; }
  if(st(G.human).hand.length>7){ G.phase='discard'; render(); return; }
  G.traded=false;
  if(s.over){ overPanel(); return; }
  G.round=s.round;
  startRound();
}
const cardChip=e=>{ const su=suitOf(e); return `<span class="wk-cchip" style="--ec:${EL[e].col}"><span class="${su&&su.red?'red':''}">${su?su.s:''}</span>${EL[e].icon} ${EL[e].name}</span>`; };
function tradePanel(){
  const me=st(G.human), cnt={};
  me.hand.forEach(e=>cnt[e]=(cnt[e]||0)+1);
  const pairs=Object.keys(cnt).filter(e=>cnt[e]>=2);
  const p=panel(`<h2>Meditate: trade with the pile</h2>
    <div class="wk-note">Discard two cards of the same element to draw one more (once). Swaps with ${esc(G.foeName)} don't need a Meditate: offer one while you pick.</div>
    <div class="wk-row">${pairs.length?pairs.map(e=>`<button class="wk-btn" data-pair="${e}">Trade two ${cardChip(e)}</button>`).join(''):'<span class="wk-note">No pairs in your hand.</span>'}</div>
    <div class="wk-row"><button class="wk-btn" id="wk-skip">No trade</button></div>`);
  p.querySelectorAll('[data-pair]').forEach(b=>b.onclick=()=>{ TT.pileTrade(G.human,b.dataset.pair); addLog(`You trade two ${EL[b.dataset.pair].name} for a draw.`); hidePanel(); render(); afterRound(); });
  $('wk-skip').onclick=()=>{ hidePanel(); afterRound(); };
}
function overPanel(){
  const s=S(), won=s.over===G.human, draw=s.over==='draw';
  G.phase='over';
  const how=s.onPoints?`after 12 rounds, ${st('p1').hp} HP to ${st('p2').hp}`:'by knockout';
  addLog(draw?'A draw.':won?'You win '+how+'.':G.foeName+' wins '+how+'.');
  render();
  panel(`<h2>${draw?'A draw':won?'You win!':esc(G.foeName)+' wins'}</h2>
    <div class="wk-note">${draw?'Level at the end.':esc(how[0].toUpperCase()+how.slice(1))+'.'}</div>
    <div class="wk-row"><button class="wk-btn big" id="wk-again">Play again</button><button class="wk-btn" id="wk-look">Look at the table</button></div>`);
  $('wk-again').onclick=setupPanel;
  $('wk-look').onclick=hidePanel;
}
function helpPanel(){
  panel(`<h2>Quick rules</h2>
    <div class="wk-note"><b>Pick:</b> a command card and an element card, face down. Strike, Ward, Dispel, abilities and Cleanse cost 3 mana. For Attack, Guard, Grapple, Meditate and Cleanse the element card is a decoy and comes back.</div>
    <div class="wk-note"><b>Flick all six:</b> 0 fizzles · 1–2 Lesser · 3–4 Normal · 5–6 Greater · even counts give 2 mana back. An ability goes off if you pot its difficulty (⦿).</div>
    <div class="wk-note"><b>Strength:</b> strikes 2 / 4 / 6 · wards and dispels 4 / 8 / 12 · Cleanse 1 / 2 / all curses. A strike or dispel in a ward's opposite element counts +2.</div>
    <div class="wk-note"><b>Order:</b> Protection and Guard → Dispel and Grapple → Damage and Attack → Meditate.</div>
    <div class="wk-note"><b>Meditate:</b> +3 mana, draw 2, one trade. <b>Round end:</b> wards lose 1, +4 mana (12 at most), hand down to 7.</div>
    <div class="wk-note"><b>Win:</b> a knockout, or the most HP after round 12. The full rulebook is docs/winks-rules.md.</div>
    <div class="wk-row"><button class="wk-btn" id="wk-ok">Back to the table</button></div>`);
  $('wk-ok').onclick=()=>{ if(G&&G.phase==='draft') draftStep(); else if(!G) setupPanel(); else hidePanel(); };
}

// ── Drawing the table ──────────────────────────────────────
function addLog(t){ if(!G) return; G.log.push(t); if(G.log.length>40) G.log.shift(); }
function flashHint(t){ const h=$('wk-hint'); h.textContent=t; h.classList.remove('bad'); void h.offsetWidth; h.classList.add('bad'); }
const minionsOf=w=>st(w).effects.filter(e=>e.type==='minion');
function tokens(cls,n,cap){
  n=Math.max(0,n|0); const show=Math.min(n,cap||12);
  let h='<span class="wk-toks">';
  for(let i=0;i<show;i++) h+=`<i class="wk-tok ${cls}" style="--i:${i}"></i>`;
  return h+`</span><b class="wk-n">${n}</b>`;
}
function elemCard(e,o){
  o=o||{};
  const su=suitOf(e), E=EL[e];
  const rank=o.rank||'';
  return `<div class="wk-card ${o.cls||''} ${su&&su.red?'red':''}" style="--ec:${E.col}" ${o.attr||''}>
    <span class="c tl">${rank}${su?su.s:''}</span><span class="c br">${rank}${su?su.s:''}</span>
    <span class="pip">${su?su.s:''}</span><span class="ei">${E.icon}</span><span class="en">${E.name}</span></div>`;
}
const backCard=(cls,attr)=>`<div class="wk-card back ${cls||''}" ${attr||''}></div>`;
function cmdCard(id,w,o){
  o=o||{};
  const c=cmdById(id); if(!c) return '';
  let sub='';
  if(c.kind==='ability'&&w){ const sp=spells(w)[c.num-1]; if(sp) sub=`<span class="sub">${esc(sp.name)}</span>`; }
  return `<div class="wk-cmd ${o.cls||''}" ${o.attr||''}><span class="ci">${c.icon}</span><span class="cn">${c.name}${c.num?' '+c.num:''}</span>${sub}</div>`;
}
function sheet(w){
  const s=st(w), c=s.c, f=w===G.human?G.ai:G.human, foeSt=st(f);
  const ab=c.spells.map((sp,i)=>{
    const on=sp.kind==='curse'?foeSt.effects.some(e=>e.id===sp.id):sp.effect&&sp.effect.type==='minion'?0:s.effects.some(e=>e.id===sp.id);
    const own=s.effects.find(e=>e.id===sp.id);
    const sk=sp.effect&&sp.effect.type==='minion'?minionsOf(w).length:own&&own.charges!=null?own.charges:0;
    const inPlay=S().elems.length<4||S().elems.includes(sp.elem);
    return `<div class="wk-ab ${inPlay?'':'out'}"><div class="h"><b>${i+1} ${esc(sp.name)}</b><span>${EL[sp.elem].icon} ⦿${TT.difficultyOf(sp)}</span></div>
      <div class="t">${esc(TEXT[sp.id]||sp.text)}</div>${on||sk?`<div class="mk">${tokens('y',sk||1,6)}</div>`:''}</div>`;
  }).join('');
  const chips=s.effects.filter(e=>e.type!=='minion'&&e.kind).map(e=>`<span class="wk-eff ${e.kind}">${esc(e.name||e.id)}</span>`).join('');
  return `<div class="wk-sheet" style="--wc:${charOf(s.key).col||'#c9a84c'}">
    <div class="wk-sh-head"><img src="portraits/small/${s.key}.jpg" alt=""><div><b>${esc(c.name)}</b><small>${esc(c.title||'')}${w===G.ai?' · '+esc(G.foeName):' · you'}</small></div></div>
    <div class="wk-boxes"><div class="wk-box hp"><span>HP</span>${tokens('r',s.hp)}</div><div class="wk-box mana"><span>Mana</span>${tokens('b',s.mana)}</div></div>
    <div class="wk-meta">Attack ${c.atk} · Barred: ${c.forbidden.length?c.forbidden.map(e=>EL[e].icon+' '+EL[e].name).join(', '):'none'}</div>
    <div class="wk-abs">${ab}</div>${chips?`<div class="wk-effs">${chips}</div>`:''}</div>`;
}
function model(w){
  const s=st(w), ch=charOf(s.key), fl=(G.floats&&G.floats[w])||[];
  const ward=s.ward?`<div class="wk-paper" style="--ec:${EL[s.ward.elem].col}">
      ${s.wardCards&&s.wardCards.length?elemCard(s.wardCards[s.wardCards.length-1],{cls:'tuck'}):''}
      <div class="ring"></div><span class="pi">${EL[s.ward.elem].icon}</span>
      <div class="wt">${tokens('g',s.ward.hp)}</div></div>`:'';
  const sk=minionsOf(w);
  const skel=sk.length?`<div class="wk-skels">${sk.map(()=>`<div class="wk-skel"><img src="sprites/skeleton1.png" alt=""><i class="wk-tok y"></i></div>`).join('')}</div>`:'';
  const stance=(w===G.human&&sk.length&&G.phase==='pick')?`<button type="button" class="wk-stance" id="wk-stance">Skeletons: ${G.stance==='guard'?'🛡 guard':'⚔ attack'}</button>`
    :sk.length?`<div class="wk-stance ro">${s.stance==='guard'?'🛡 guarding':'⚔ attacking'}</div>`:'';
  const guard=G.lastOut&&G.phase!=='pick'&&G.lastPicks&&G.lastPicks[w]&&G.lastPicks[w].act==='guard';
  return `<div class="wk-mzone ${w===G.ai?'foe':''}">${ward}
    <div class="wk-mini ${guard?'guard':''}"><div class="base" style="--wc:${ch.col||'#888'}"></div><img src="${ch.sprite||''}" alt="${esc(s.c.name)}"></div>
    ${skel}${stance}<div class="wk-floats">${fl.map((x,i)=>`<span class="wk-float ${x[1]}" style="--d:${i*0.25}s">${x[0]}</span>`).join('')}</div></div>`;
}
function played(w){
  const p=G.played[w];
  const slot=(inner,label)=>`<div class="wk-slot">${inner||'<div class="wk-card ghost"></div>'}<small>${label}</small></div>`;
  if(!p) return `<div class="wk-play">${slot('', 'command')}${slot('', 'element')}</div>`;
  const cmd=p.up?cmdCard(p.cmd,w,{cls:'flip'}):backCard('cmdback');
  const card=p.card==null?'':(p.up?elemCard(p.card,{cls:'flip'}):backCard());
  return `<div class="wk-play">${slot(cmd,'command')}${slot(card,'element')}</div>`;
}
function render(){
  if(!G) return;
  const s=S();
  $('wk-round').textContent=G.phase==='draft'?'· the draw':`· Round ${Math.min(12,s.round)} of 12`;
  $('wk-osheet').innerHTML=sheet(G.ai);
  $('wk-ysheet').innerHTML=sheet(G.human);
  $('wk-omodel').innerHTML=model(G.ai);
  $('wk-ymodel').innerHTML=model(G.human);
  $('wk-oplay').innerHTML=`<div class="wk-foehand">${(st(G.ai).hand||[]).map(()=>backCard('small')).join('')}<small>${(st(G.ai).hand||[]).length} cards</small></div>`+played(G.ai);
  $('wk-yplay').innerHTML=played(G.human);
  // The four Aces, the pile and the discards
  const aces=SUITS.map((su,i)=>{
    const e=s.elems[i];
    return e?`<div class="wk-ace ${su.red?'red':''}" style="--ec:${EL[e].col}"><span class="c tl">A${su.s}</span><span class="pip">${su.s}</span><span class="sticker">${EL[e].icon}<b>${EL[e].name}</b></span></div>`
      :`<div class="wk-ace empty ${su.red?'red':''}"><span class="pip">${su.s}</span><small>?</small></div>`;
  }).join('');
  const top=s.discard&&s.discard.length?s.discard[s.discard.length-1]:null;
  $('wk-legend').innerHTML=`<div class="wk-aces">${aces}</div><div class="wk-piles">
    <div class="wk-pile"><div class="stack">${(s.pile||[]).length?backCard('top'):'<div class="wk-card ghost"></div>'}</div><small>Pile · ${(s.pile||[]).length}</small></div>
    <div class="wk-pile"><div class="stack">${top?elemCard(top,{cls:'top'}):'<div class="wk-card ghost"></div>'}</div><small>Discards · ${(s.discard||[]).length}</small></div></div>`;
  $('wk-cupzone').innerHTML=`<div class="wk-wrow" id="wk-wrow-p2"></div><div class="wk-cupwrap"><div class="wk-cup" id="wk-cup"><div class="in"></div></div></div><div class="wk-wrow" id="wk-wrow-p1"></div>
    <div class="wk-track">${Array.from({length:12},(_,i)=>`<i class="${i+1===Math.min(12,s.round)&&G.phase!=='draft'?'on':i+1<s.round?'done':''}">${i+1}</i>`).join('')}</div>`;
  $('wk-log').innerHTML=`<div class="wk-logbox">${G.log.slice(-9).map(t=>`<div>${esc(t)}</div>`).join('')}</div>`;
  // Your cards
  const me=st(G.human), picking=G.phase==='pick', discarding=G.phase==='discard';
  $('wk-cmds').innerHTML=`<div class="wk-cmdrow">${CMDS.map(c=>cmdCard(c.id,G.human,{cls:(G.sel.cmd===c.id?'sel ':'')+(picking?'':'dim')+(G.played.p1&&G.played.p1.cmd===c.id?' gone':''),attr:`data-cmd="${c.id}"`})).join('')}</div>`;
  const hand=(me.hand||[]).map((e,i)=>elemCard(e,{cls:(G.sel.card===i?'sel ':'')+(me.c.forbidden.includes(e)?'barred ':'')+(picking||discarding?'':'dim ')+(G.played.p1&&G.played.p1.cardIdx===i?'gone':''),attr:`data-card="${i}"`})).join('');
  $('wk-hand').innerHTML=`<div class="wk-handrow">${hand||'<small class="wk-note">No element cards: Meditate to draw.</small>'}</div>`;
  $('wk-cmds').querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{ if(G.phase!=='pick') return; G.sel.cmd=G.sel.cmd===b.dataset.cmd?null:b.dataset.cmd; autoCard(); render(); });
  $('wk-hand').querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.card;
    if(G.phase==='discard'){ const e=me.hand[i]; TT.discardCard(G.human,e); addLog(`You discard ${EL[e].name}.`); if(me.hand.length<=7){ G.phase='pick'; afterRound(); } else render(); return; }
    if(G.phase!=='pick') return; G.sel.card=G.sel.card===i?null:i; render();
  });
  const sb=$('wk-stance'); if(sb) sb.onclick=()=>{ G.stance=G.stance==='guard'?'attack':'guard'; render(); };
  actions();
  requestAnimationFrame(fit);   // the table's height changes with what's on it
}
// Picking an ability card selects a matching element card for you
function autoCard(){
  const c=cmdById(G.sel.cmd), h=st(G.human).hand;
  if(!c) return;
  if(c.kind==='ability'){ const sp=spells(G.human)[c.num-1]; const i=h.indexOf(sp.elem); if(i>=0&&h[G.sel.card]!==sp.elem) G.sel.card=i; }
  else if(c.kind==='decoy'&&G.sel.card==null&&h.length) G.sel.card=0;
}
function actions(){
  const a=$('wk-actions'), h=$('wk-hint');
  h.classList.remove('bad');
  if(G.phase==='pick'){
    const r=humanPick();
    h.textContent=r.err||`Lay down: ${pickName(G.human,r.pick)}${r.pick.minion?' at the skeletons':''}${isSpell(r.pick)?' (3 mana, then flick)':''}.`;
    const aimable=r.pick&&canAimBodies(Object.assign({},r.pick,{minion:undefined}));
    a.innerHTML=`<button type="button" class="wk-btn" id="wk-swap" ${G.asked||!st(G.human).hand.length?'disabled':''}>🤝 Offer a swap</button>`
      +(aimable?`<button type="button" class="wk-btn" id="wk-aim">Aim: ${G.aimBodies?'💀 the skeletons':'🧙 '+esc(st(G.ai).c.name)}</button>`:'')
      +`<button type="button" class="wk-btn big" id="wk-lay" ${r.err?'disabled':''}>Lay face down</button>`;
    $('wk-lay').onclick=layDown;
    $('wk-swap').onclick=()=>swapPanel();
    if(aimable) $('wk-aim').onclick=()=>{ G.aimBodies=!G.aimBodies; render(); };
  } else if(G.phase==='discard'){
    h.textContent=`Hand limit: tap ${st(G.human).hand.length-7} element card${st(G.human).hand.length-7>1?'s':''} to discard.`;
    a.innerHTML='';
  } else if(G.phase==='laid'||G.phase==='revealed'||G.phase==='resolving'){
    if(G.phase==='laid') h.textContent='Revealing…';
    if(G.phase==='resolving') h.textContent='The spells go off…';
    a.innerHTML='';
  } else if(G.phase==='over'){
    a.innerHTML=`<button type="button" class="wk-btn big" id="wk-again2">Play again</button>`;
    $('wk-again2').onclick=setupPanel;
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-winks');
  if(b) b.addEventListener('click',open);
});
window.WinksTable={open, close, _peek:()=>({G, winks, scale, cupAt})};   // _peek: for tests
})();
