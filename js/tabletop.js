// ── TABLETOP MODE ──────────────────────────────────────────
// The simplified rules for playing WizardsDuel on a real table with counters: HP, mana and wards are
// whole counters (max 20 each), signature spells are fixed cards, and the casting minigame is a
// tiddlywink flick. This file is the rules engine, a simple AI and the AI-vs-AI simulator that
// tools/balance.html runs in Tabletop mode. The human-readable rules are docs/tabletop-rules.md —
// keep the two in step. Character numbers live in tabletop.json.
//
// It is self-contained: the standard game (js/game.js) never loads it and none of its rules change.
// Works in the browser (window.TT) and in Node (module.exports) for quick balance runs:
//   node -e "const TT=require('./js/tabletop.js'); TT.load(require('./characters.json'),require('./tabletop.json')); console.log(TT.balance(40))"
(function(root){
'use strict';

// ── Rules (all numbers in counters / mana) ─────────────────
const RULES={
  max:20,                      // max counters of HP, mana and ward
  startMana:6,
  income:4,                    // mana each wizard gains at the end of every round
  meditate:3,                  // Meditate: skip your spell for this much mana (not two rounds running)
  cats:{
    //        mana cost and power for the inner / middle / outer ring; stage = resolution order
    protect:{cost:[5,8,12], power:[4,7,11], stage:1},
    dispel: {cost:[1,2,4],  power:[3,6,10], stage:2},
    damage: {cost:[3,5,8],  power:[2,4,6],  stage:3},
  },
  wardRounds:3,                // a ward lasts the round it goes up + 2 more
  wardWear:1,                  // a ward loses this many counters at every round end
  wardMatch:1,                 // a strike in the ward's own element hits the ward this much harder
  wardOff:1,                   // ...and any other element (not Physical) this much softer (min 1)
  dispelMatch:2,               // a dispel in the ward's own element strips this many times its power
  dispelAllRing:3,             // an outer-ring dispel removes every buff, not just the newest
  // Tiddlywink cast. Every caster flicks from their handicap line (set per player, so everyone
  // pots about as often), and must pot `winks` winks for the ring (inner / middle / outer). After a
  // miss, pay retryCost mana to have another go, or stop and the spell fizzles (its cost is lost).
  // Missed winks stay on the table for the foe to squop at the end of the round.
  winks:[1,2,3],
  retryCost:1,
  pot:0.75,                    // simulator: chance a flick pots from your handicap line
  // Squops, after the spells resolve: the foe gets one squop attempt at each of your missed winks
  // on the table, and gains squopGain mana for each one they squop. Missed winks carry over between
  // rounds until squopped. A wizard who Meditates (channels) instead takes channelSquops attempts,
  // before the foe's turn.
  squop:0.4,                   // simulator: chance a squop attempt lands
  squopGain:1,
  channelSquops:3,
  riderRing:2,                 // element riders need a strike from this ring or more that reached HP
  scorch:[0,1,2],              // Fire: burn 1 at round end for this many rounds, by ring
  lightningBurn:[1,1,2],       // Lightning: mana the foe loses, by ring (even through a ward)
  riskRoll:4,                  // Ice frostbite / Dark dread: the covered pick is lost on a die roll under this
  // Sudden death keeps games short: from this round, both wizards lose dmg HP at every round end,
  // 1 more every `every` rounds after that.
  suddenDeath:{round:8, dmg:1, every:3},
  maxRounds:40,                // the simulator calls it a timeout after this
};
const ELEMENTS=['fire','ice','lightning','arcane','physical','dark'];
const CATS=['protect','dispel','damage'];

let CHARS={};   // key -> merged tabletop character
let rng=Math.random;

// Merge characters.json (names, colours, forbidden) with tabletop.json (the counter numbers)
function load(chars,tt){
  CHARS={};
  Object.keys(tt).forEach(k=>{
    if(k.startsWith('_')||!chars[k]) return;
    const c=chars[k], t=tt[k];
    CHARS[k]={key:k, name:c.name, title:c.title, col:c.col,
      hp:Math.min(RULES.max,t.hp), strikeBonus:t.strikeBonus||[0,0,0], wardCostMod:t.wardCostMod||0,
      deathless:t.deathless||0, forbidden:t.forbidden||c.forbidden||[], spells:t.spells||[]};
  });
  return CHARS;
}

// ── Dice ───────────────────────────────────────────────────
const d6=()=>1+Math.floor(rng()*6);
const rolls=n=>d6()>=n;            // "on n+"
function rollDice(spec){
  if(spec==='d6!'){ let t=0, r; do{ r=d6(); t+=r; }while(r===6); return t; }
  const m=/^d6([+-]\d+)?$/.exec(spec);
  return d6()+(m&&m[1]?+m[1]:0);
}
const clamp=v=>Math.max(0,Math.min(RULES.max,v));

// ── State ──────────────────────────────────────────────────
let gs=null;
function newGame(k1,k2){
  const seat=k=>({key:k, c:CHARS[k], hp:CHARS[k].hp, mana:RULES.startMana, ward:null, effects:[],
    medRound:-9, missed:0, catCounts:{}, lostLast:0, hpAtStart:0, used:{}, meditated:false});
  gs={round:1, p1:seat(k1), p2:seat(k2), over:null, log:[]};
  return gs;
}
const foe=w=>w==='p1'?'p2':'p1';
const fx=(st,type)=>st.effects.filter(e=>e.type===type);
const buffs=st=>st.effects.filter(e=>e.kind==='buff');
const curses=st=>st.effects.filter(e=>e.kind==='curse');
const minions=(st,m)=>st.effects.filter(e=>e.type==='minion'&&(!m||e.minion===m));
const sigById=(st,id)=>st.c.spells.find(s=>s.id===id);
function log(s){ if(gs.verbose) gs.log.push('R'+gs.round+' '+s); }

function locked(st,cat){ return fx(st,'lock').some(e=>e.cat===cat&&e.from<gs.round); }
function canMeditate(st){ return st.medRound!==gs.round-1&&st.mana<RULES.max; }
function incomeDrain(st){ return fx(st,'incomeDrain').reduce((a,e)=>a+e.n,0); }
function mostUsedCat(st){ return ['damage','protect','dispel'].reduce((a,c)=>(st.catCounts[c]||0)>(st.catCounts[a]||0)?c:a,'damage'); }
function costOf(st,a){
  if(a.cat==='meditate'||a.cat==='pass') return 0;
  const sp=a.sig&&sigById(st,a.sig);
  let c=sp?sp.cost:RULES.cats[a.cat].cost[a.ring-1]+(a.cat==='protect'?st.c.wardCostMod:0);
  if(!sp) c=Math.max(1,c);
  c+=fx(st,'spellbind').filter(e=>e.cat===a.cat).reduce((s,e)=>s+e.extra,0);
  return c;
}
function ringOf(st,a){ const sp=a.sig&&sigById(st,a.sig); return sp?sp.ring:a.ring; }

// ── Effects ────────────────────────────────────────────────
function addEffect(who,eff,from){
  const st=gs[who];
  if(eff.kind==='curse'&&fx(st,'warding').length){ log(st.key+' resists '+eff.name); return false; }
  if(eff.type==='lock'){
    if(st.lastLocked!=null&&gs.round+1-st.lastLocked<2) return false;   // no back-to-back locks
    st.lastLocked=gs.round+1;
  }
  if(eff.type==='minion'){
    if(minions(st,eff.minion).length>=eff.max) return false;
  } else st.effects=st.effects.filter(e=>e.id!==eff.id);
  st.effects.push(Object.assign({from:gs.round, by:from},eff));
  return true;
}
function removeEffects(who,list){
  const st=gs[who];
  list.forEach(e=>{
    st.effects=st.effects.filter(f=>f!==e);
    if(e.type==='minion'&&e.healOnRemove) heal(who,e.healOnRemove);
  });
}

// ── HP ─────────────────────────────────────────────────────
function heal(who,n){ const st=gs[who]; st.hp=Math.min(st.c.hp,st.hp+n); }
function loseHp(who,n){
  const st=gs[who];
  if(n<=0) return;
  st.hp-=n;
  if(st.hp<=0&&st.c.deathless&&st.mana>=st.c.deathless){ st.mana-=st.c.deathless; st.hp=1; log(st.key+' DEATHLESS'); }
}
function loseMana(who,n){ gs[who].mana=Math.max(0,gs[who].mana-n); }
function gainMana(who,n){ gs[who].mana=clamp(gs[who].mana+n); }

// Damage that meets the ward first. adj: +n / −n against the ward (element match / off-element).
// Returns the HP damage dealt.
function incoming(who,dmg,adj){
  const st=gs[who];
  if(dmg<=0) return 0;
  if(st.ward){
    const eff=Math.max(1,dmg+(adj||0));
    if(eff<st.ward.hp){ st.ward.hp-=eff; return 0; }
    const over=eff-st.ward.hp;
    st.ward=null;
    dmg=over;
  }
  loseHp(who,dmg);
  return dmg;
}
function wardAdj(st,elem){
  if(!st.ward) return 0;
  if(st.ward.elem===elem) return RULES.wardMatch;
  return elem==='physical'?0:-RULES.wardOff;
}

// ── Casting ────────────────────────────────────────────────
function raiseWard(who,elem,hp,ret){
  gs[who].ward={hp:Math.min(RULES.max,hp), elem, rounds:RULES.wardRounds, ret:ret||0};
}

function doProtect(who,a){
  const st=gs[who], sp=a.sig&&sigById(st,a.sig);
  if(!sp){ raiseWard(who,a.elem,RULES.cats.protect.power[a.ring-1]); return; }
  if(sp.kind==='ward'){
    let hp=sp.ward+(sp.perSkeleton||0)*minions(st,'skeleton').length;
    raiseWard(who,sp.elem,hp,sp.retaliate);
    if(sp.rewind) heal(who,Math.min(sp.rewind,st.lostLast));
    return;
  }
  if(sp.kind==='instant'){ doInstant(who,sp); return; }
  const e=Object.assign({id:sp.id, kind:'buff', name:sp.name},sp.effect);
  if(e.type==='counter'&&e.extend&&st.ward) st.ward.rounds+=e.extend;
  addEffect(who,e,who);
  if(sp.ward) raiseWard(who,sp.elem,sp.ward);
}
function doInstant(who,sp){
  const st=gs[who], x=sp.action;
  if(x.type==='heal') heal(who,x.n);
  else if(x.type==='bloodpact'){ loseHp(who,x.hp); gainMana(who,x.mana); }
  else if(x.type==='tonic'){
    if(d6()<=3) heal(who,x.heal);
    else addEffect(who,{id:'tonic', type:'empower', kind:'buff', name:'Tonic', bonus:x.bonus, rounds:null},who);
  }
  else if(x.type==='cleanse'){ removeEffects(who,curses(st)); heal(who,x.heal||0); }
}

function doDispel(who,a){
  const st=gs[who], t=foe(who), ts=gs[t], sp=a.sig&&sigById(st,a.sig);
  if(a.self){ const c=curses(st); if(c.length) removeEffects(who,[c[c.length-1]]); return; }
  if(sp){
    if(sp.kind==='instant'){ if(!sp.quick) doInstant(who,sp); return; }
    // A curse
    if(sp.drainNow) loseMana(t,sp.drainNow);
    if(sp.roll&&!rolls(sp.roll)) return;
    const e=Object.assign({id:sp.id, kind:'curse', name:sp.name},sp.effect);
    if(e.type==='spellbind') e.cat=mostUsedCat(ts);
    if(e.type==='enthral') e.call=a.call||'damage';
    if(e.type==='dot'&&e.ramp) e.step=0;
    addEffect(t,e,who);
    return;
  }
  const power=RULES.cats.dispel.power[a.ring-1];
  const warding=fx(ts,'warding');
  if(warding.length){ removeEffects(t,warding); return; }
  if(ts.ward){
    ts.ward.hp-=power*(ts.ward.elem===a.elem?RULES.dispelMatch:1);
    if(ts.ward.hp<=0) ts.ward=null;
    return;
  }
  const b=buffs(ts);
  if(b.length) removeEffects(t,a.ring>=RULES.dispelAllRing?b:[b[b.length-1]]);
}

function doDamage(who,a){
  const st=gs[who], sp=a.sig&&sigById(st,a.sig);
  const ring=ringOf(st,a);
  let tgt=foe(who);
  const bew=fx(st,'bewitch')[0];
  if(bew){ removeEffects(who,[bew]); tgt=who; }
  const ts=gs[tgt];
  const elem=sp?sp.elem:a.elem;
  let dmg;
  if(sp){
    if(sp.once) st.used[sp.id]=true;
    if(sp.dice) dmg=rollDice(sp.dice);
    else if(sp.pctHp) dmg=Math.max(sp.pctHp.min,Math.floor(ts.hp/sp.pctHp.div));
    else if(sp.perBlade){ const bl=minions(st,'blade'); dmg=sp.perBlade*bl.length; st.effects=st.effects.filter(e=>!bl.includes(e)); }
    else dmg=sp.dmg;
  } else dmg=RULES.cats.damage.power[ring-1];
  // The caster's boosts
  dmg+=st.c.strikeBonus[ring-1]||0;
  let burn=0;
  const emp=st.effects.find(e=>e.type==='empower'&&(!e.elem||e.elem===elem));
  if(emp){ dmg+=emp.bonus; removeEffects(who,[emp]); }
  fx(st,'frenzy').forEach(e=>{ dmg+=e.bonus; loseHp(who,e.selfDmg); });
  const weave=fx(st,'weave')[0];
  if(weave){ dmg+=weave.bonus; burn+=weave.burn; if(--weave.charges<=0) removeEffects(who,[weave]); }
  if(sp&&sp.recoil) loseHp(who,sp.recoil);
  if(tgt===who){ incoming(who,dmg,0); return; }
  // Misses
  const abs=fx(ts,'absorbNext')[0];
  if(abs){ removeEffects(tgt,[abs]); return; }
  if(fx(ts,'dodge').some(e=>rolls(e.roll))) return;
  dmg+=fx(ts,'vuln').reduce((s,e)=>s+e.n,0);
  const res=fx(ts,'resist').reduce((s,e)=>s+e.n,0);
  if(res) dmg=Math.max(1,dmg-res);
  const retaliate=fx(ts,'resist').concat(fx(ts,'counter')).reduce((s,e)=>s+(e.retaliate||0),0)+(ts.ward?ts.ward.ret:0);
  const hp=incoming(tgt,dmg,wardAdj(ts,elem));
  if(hp>0){
    if(sp&&sp.lifesteal) heal(who,Math.floor(hp/2));
    if(sp&&sp.dot) addEffect(tgt,{id:sp.id+'-dot', type:'dot', kind:'curse', name:sp.name, dmg:sp.dot.dmg, rounds:sp.dot.rounds, bypassWard:sp.dot.bypassWard},who);
    riders(who,tgt,elem,ring,sp);
  }
  // Mana burn lands whether or not the ward held
  burn+=(sp&&sp.manaburn||0)+(elem==='lightning'?RULES.lightningBurn[ring-1]:0);
  loseMana(tgt,burn);
  if(sp&&sp.arc&&rolls(sp.arc.roll)) incoming(tgt,sp.arc.dmg,0);
  if(retaliate) loseHp(who,retaliate);
}
function riders(who,tgt,elem,ring,sp){
  if(sp&&sp.chill&&ring>=RULES.riderRing){ addEffect(tgt,{id:'chill', type:'lock', kind:'curse', name:'Chilled', cat:'damage', rounds:2},who); return; }
  if(ring<RULES.riderRing) return;
  const ts=gs[tgt];
  if(elem==='fire'&&!(sp&&sp.dot)&&RULES.scorch[ring-1]) addEffect(tgt,{id:'scorch', type:'dot', kind:'curse', name:'Scorched', dmg:1, rounds:RULES.scorch[ring-1]},who);
  if(elem==='ice'&&!locked(ts,'damage')) addEffect(tgt,{id:'frostbite', type:'risk', kind:'curse', name:'Frostbitten', cat:'damage', rounds:2},who);
  if(elem==='dark'&&!locked(ts,'protect')) addEffect(tgt,{id:'dread', type:'risk', kind:'curse', name:'Dread', cat:'protect', rounds:2},who);
  if(elem==='arcane'){
    const timed=buffs(ts).filter(e=>e.rounds!=null);
    const hit=ring>=3?timed:timed.slice(-1);
    hit.forEach(e=>e.rounds--);
    removeEffects(tgt,hit.filter(e=>e.rounds<=0));
  }
}

// ── A round ────────────────────────────────────────────────
// picks: {p1:action, p2:action}. action: {cat:'damage'|'protect'|'dispel', elem, ring} or
// {cat, sig:'spellId'} or {cat:'dispel', self:true, ring:1} (cleanse) or {cat:'meditate'} / {cat:'pass'}.
// flicks (optional, for real play): {p1:{cast:true|false, missed:n}, ...} the tiddlywink results;
// otherwise they are rolled from RULES.pot. squops (optional): {p1:winks squopped, ...}; otherwise
// rolled from RULES.squop.
function playRound(picks,flicks,squops){
  const W=['p1','p2'];
  W.forEach(w=>{ gs[w].hpAtStart=gs[w].hp; gs[w].meditated=false; });
  const outcome={};
  // Quick spells (Mana Siphon) are paid and steal before anyone else pays
  const quick=w=>{ const sp=picks[w].sig&&sigById(gs[w],picks[w].sig); return !!(sp&&sp.quick); };
  const order=W.filter(quick).concat(W.filter(w=>!quick(w)));
  order.forEach(w=>{
    outcome[w]=pay(w,picks[w],flicks&&flicks[w]);
    if(outcome[w]==='cast'&&quick(w)){
      const sp=sigById(gs[w],picks[w].sig), n=Math.min(sp.action.n,gs[foe(w)].mana);
      loseMana(foe(w),n); gainMana(w,n);
    }
  });
  // Stages: every Protection, then every Dispel, then every Damage, then Meditate
  for(const cat of ['protect','dispel','damage']){
    const seats=W.filter(w=>outcome[w]==='cast'&&picks[w].cat===cat);
    if(rng()<0.5) seats.reverse();
    seats.forEach(w=>{ if(!gs.over) (cat==='protect'?doProtect:cat==='dispel'?doDispel:doDamage)(w,picks[w]); });
    if(checkOver()) return outcome;
  }
  W.forEach(w=>{ if(picks[w].cat==='meditate'&&outcome[w]==='cast') gainMana(w,Math.max(0,RULES.meditate-incomeDrain(gs[w]))); });
  squopPhase(squops);
  endRound();
  return outcome;
}
// Each wizard squops the foe's missed winks for mana: channellers (Meditate) first, with
// channelSquops attempts, then everyone else with one attempt per missed wink still there.
function squopPhase(given){
  const W=['p1','p2'];
  const go=w=>{
    const f=foe(w), left=gs[f].missed;
    if(!left) return;
    let got;
    if(given&&given[w]!=null) got=Math.min(left,given[w]);
    else {
      const tries=gs[w].meditated?RULES.channelSquops:left;
      got=0;
      for(let i=0;i<tries&&got<left;i++) if(rng()<squopChance(w)) got++;
    }
    gs[f].missed-=got;
    gainMana(w,got*RULES.squopGain);
    gs[w].squopped=(gs[w].squopped||0)+got;
  };
  W.filter(w=>gs[w].meditated).forEach(go);
  W.filter(w=>!gs[w].meditated).forEach(go);
}
const potChance=w=>gs.pot&&gs.pot[w]!=null?gs.pot[w]:RULES.pot;
const squopChance=w=>gs.squop&&gs.squop[w]!=null?gs.squop[w]:RULES.squop;
// The flick: pot RULES.winks[ring] winks; after each miss, pay retryCost to go again or give up.
// Returns true when the spell is cast. Missed winks are left on the table (st.missed).
function flickCast(w,ring,given){
  const st=gs[w], need=RULES.winks[ring-1];
  if(given){
    const retries=given.cast?given.missed:Math.max(0,given.missed-1);
    loseMana(w,retries*RULES.retryCost);
    st.missed+=given.missed;
    return !!given.cast;
  }
  let potted=0;
  while(potted<need){
    if(rng()<potChance(w)){ potted++; continue; }
    st.missed++;
    if(st.mana<RULES.retryCost) return false;
    st.mana-=RULES.retryCost;
  }
  return true;
}
// Curses that bite as the spell is picked, then the mana, then the flick
function pay(w,a,flick){
  const st=gs[w];
  if(a.cat==='pass') return 'pass';
  if(a.cat==='meditate'){
    st.medRound=gs.round; st.meditated=true;
    fx(st,'candle').forEach(e=>loseHp(w,e.dmg));
    return 'cast';
  }
  st.catCounts[a.cat]=(st.catCounts[a.cat]||0)+1;
  const cost=costOf(st,a);
  const ent=fx(st,'enthral')[0];
  if(ent){
    removeEffects(w,[ent]);
    if(ent.call===a.cat&&cost<=st.mana){
      const steal=Math.min(cost,ent.steal);
      loseMana(w,cost); gainMana(foe(w),steal);
      return 'enthralled';
    }
  }
  const sil=fx(st,'silence')[0];
  if(sil&&!rolls(sil.roll)) return 'silenced';
  const risk=st.effects.find(e=>e.type==='risk'&&e.cat===a.cat);
  if(risk){ removeEffects(w,[risk]); if(d6()<RULES.riskRoll) return 'risked'; }
  if(cost>st.mana) return 'nomana';
  st.mana-=cost;
  if(!flickCast(w,ringOf(st,a),flick)) return 'fizzle';
  if(a.cat==='protect') fx(st,'candle').forEach(e=>loseHp(w,e.dmg));
  return 'cast';
}

function endRound(){
  const W=['p1','p2'];
  // Ticks: curses on you, then your buffs (regen) and minions
  W.forEach(w=>{
    const st=gs[w], f=foe(w);
    fx(st,'dot').forEach(e=>{
      const n=e.ramp?e.ramp[Math.min(e.ramp.length-1,e.step++)]:e.dmg;
      if(e.bypassWard) loseHp(w,n); else incoming(w,n,0);
      if(e.manaDrain) loseMana(w,e.manaDrain);
    });
    fx(st,'agony').forEach(e=>{
      const corrupt=fx(st,'incomeDrain').some(c=>c.corrupt);
      if(!st.meditated||corrupt) loseHp(w,e.dmg);
    });
    fx(st,'regen').forEach(e=>heal(w,e.heal));
    minions(st).forEach(m=>incoming(f,m.dmg,0));
  });
  // Sudden death
  const sd=RULES.suddenDeath;
  if(sd&&gs.round>=sd.round){
    const n=sd.dmg+Math.floor((gs.round-sd.round)/sd.every);
    W.forEach(w=>loseHp(w,n));
  }
  if(checkOver()) return;
  W.forEach(w=>{
    const st=gs[w];
    // Wards wear and expire
    if(st.ward){
      if(!fx(st,'counter').some(e=>e.holdWard)) st.ward.hp-=RULES.wardWear;
      if(--st.ward.rounds<=0||st.ward.hp<=0) st.ward=null;
    }
    // Timed enchantments run down
    st.effects.forEach(e=>{ if(e.rounds!=null) e.rounds--; });
    st.effects=st.effects.filter(e=>e.rounds==null||e.rounds>0);
    gainMana(w,Math.max(0,RULES.income-incomeDrain(st)));
    st.lostLast=Math.max(0,st.hpAtStart-st.hp);
  });
  gs.round++;
}
function checkOver(){
  const d1=gs.p1.hp<=0, d2=gs.p2.hp<=0;
  if(d1||d2) gs.over=d1&&d2?'draw':d1?'p2':'p1';
  return !!gs.over;
}

// ── AI ─────────────────────────────────────────────────────
// A plain heuristic player, like the standard game's Normal AI: smart = 'normal', otherwise 'easy'.
function canPick(st,a){
  if(a.cat==='meditate') return canMeditate(st);
  if(a.cat==='pass') return true;
  if(locked(st,a.cat)) return false;
  if(a.elem&&!a.sig&&st.c.forbidden.includes(a.elem)) return false;
  return costOf(st,a)<=st.mana;
}
function sigSensible(w,sp){
  const st=gs[w], ts=gs[foe(w)], e=sp.effect||{}, x=sp.action||{};
  if(sp.once&&st.used[sp.id]) return false;
  if(sp.requires==='blade') return minions(st,'blade').length>=2||(minions(st,'blade').length>=1&&ts.hp<=6);
  if(e.type==='minion') return minions(st,e.minion).length<e.max;
  if(sp.kind==='buff'&&st.effects.some(f=>f.id===sp.id)) return false;
  if(sp.kind==='curse'){
    if(fx(ts,'warding').length) return false;
    if(ts.effects.some(f=>f.id===sp.id)) return false;
    if(e.type==='agony'&&ts.mana<3) return true;
  }
  if(x.type==='heal') return st.hp<=st.c.hp-x.n;
  if(x.type==='tonic') return st.hp<=st.c.hp-4;
  if(x.type==='cleanse') return curses(st).length>0||st.hp<=st.c.hp-x.heal;
  if(x.type==='bloodpact') return st.hp>x.hp+5&&st.mana<8;
  if(x.type==='siphon') return ts.mana>=4;
  if(sp.rewind) return st.lostLast>=3||!st.ward;
  if(sp.perSkeleton) return minions(st,'skeleton').length>0||!st.ward;
  if(e.type==='counter') return true;
  if(e.type==='absorbNext'||e.type==='dodge') return !fx(st,'absorbNext').length;
  if(sp.pctHp) return Math.floor(ts.hp/sp.pctHp.div)>=sp.pctHp.min||ts.hp<=sp.pctHp.min+1;
  return true;
}
function aiChoose(w,level){
  const st=gs[w], ts=gs[foe(w)], smart=level!=='easy';
  // Meditate when short of mana
  if(canMeditate(st)&&st.mana<costOf(st,{cat:'damage',ring:2})){
    let p=st.mana<costOf(st,{cat:'damage',ring:1})?0.5:0.25;
    if(ts.mana<costOf(ts,{cat:'damage',ring:1})) p+=0.3;
    if(st.ward&&st.ward.hp>=3) p+=0.15;
    if(fx(st,'agony').length&&!fx(st,'incomeDrain').some(e=>e.corrupt)) p+=0.4;
    if(fx(st,'candle').length) p*=0.3;
    if(st.hp<st.c.hp*0.3) p*=0.5;
    if(!smart) p*=0.6;
    if(rng()<p) return {cat:'meditate'};
  }
  const w8={damage:1.0, protect:0.55, dispel:0.08};
  if(ts.ward){ w8.dispel=smart?1.6:1.0; w8.damage=0.6; }
  else if(buffs(ts).length) w8.dispel+=smart?0.9:0.4;
  if(curses(st).length) w8.dispel+=0.4;
  if(st.effects.some(e=>e.type==='empower'||e.type==='frenzy'||e.type==='weave')) w8.damage+=0.9;
  if(minions(st,'blade').length>=2) w8.damage+=0.6;
  const hexes=st.c.spells.filter(s=>s.cat==='dispel'&&s.kind==='curse'&&sigSensible(w,s)).length;
  w8.dispel+=(smart?0.35:0.2)*hexes;
  if(st.ward&&st.ward.hp>=4) w8.protect=0.2;
  else {
    if(ts.mana>=costOf(ts,{cat:'damage',ring:2})) w8.protect+=0.35;
    if(st.hp<st.c.hp*0.35) w8.protect+=0.35;
  }
  if(fx(st,'bewitch').length){ w8.damage*=smart?0.15:0.6; w8.dispel+=smart?0.8:0.3; }
  const cats=CATS.filter(c=>!locked(st,c)&&w8[c]>0);
  // Pick a category, then a spell in it that we can afford; fall back through the others
  const pickW=list=>{ let r=rng()*list.reduce((s,c)=>s+w8[c],0); for(const c of list){ r-=w8[c]; if(r<=0) return c; } return list[0]; };
  let left=cats.slice();
  while(left.length){
    const cat=pickW(left);
    left=left.filter(c=>c!==cat);
    const a=aiInCat(w,cat,smart);
    if(a) return a;
  }
  if(canMeditate(st)) return {cat:'meditate'};
  return {cat:'pass'};
}
function aiInCat(w,cat,smart){
  const st=gs[w], ts=gs[foe(w)];
  // Cleanse a curse
  if(cat==='dispel'&&curses(st).length&&!ts.ward&&!buffs(ts).length&&canPick(st,{cat,self:true,ring:1})&&rng()<0.7)
    return {cat,self:true,ring:1};
  const sigs=st.c.spells.filter(s=>s.cat===cat&&canPick(st,{cat,sig:s.id})&&sigSensible(w,s));
  const idleDispel=cat==='dispel'&&!ts.ward&&!buffs(ts).length;
  if(sigs.length&&(idleDispel||rng()<(smart?0.5:0.3))){
    const sp=sigs[Math.floor(rng()*sigs.length)];
    const a={cat,sig:sp.id};
    if(sp.effect&&sp.effect.type==='enthral') a.call=aiCall(w);
    return a;
  }
  if(idleDispel) return null;
  const elems=ELEMENTS.filter(e=>!st.c.forbidden.includes(e));
  let elem=elems[Math.floor(rng()*elems.length)];
  if(smart&&ts.ward&&(cat==='dispel'||cat==='damage')&&elems.includes(ts.ward.elem)&&rng()<0.8) elem=ts.ward.elem;
  if(cat==='protect'&&smart){
    const safe=elems.filter(e=>ts.c.forbidden.includes(e));
    if(safe.length&&rng()<0.7) elem=safe[Math.floor(rng()*safe.length)];
  }
  let ring=3;
  while(ring>1&&!canPick(st,{cat,elem,ring})) ring--;
  if(!canPick(st,{cat,elem,ring})) return null;
  if(ring>1&&rng()<0.4) ring--;
  return {cat,elem,ring};
}
function aiCall(w){
  const ts=gs[foe(w)];
  if(gs[w].ward) return 'dispel';
  if(ts.mana<5) return rng()<0.5?'dispel':'damage';
  return mostUsedCat(ts);
}

// ── Simulator ──────────────────────────────────────────────
// Same result shape as the standard game's simMatch, so tools/balance.html can show either.
function simMatch(k1,k2,ai){
  newGame(k1,k2);
  const picks={p1:{},p2:{}};
  while(!gs.over&&gs.round<=RULES.maxRounds){
    const a={p1:aiChoose('p1',ai), p2:aiChoose('p2',ai)};
    ['p1','p2'].forEach(w=>{ const k=a[w].sig||(a[w].self?'cleanse':a[w].cat); picks[w][k]=(picks[w][k]||0)+1; });
    playRound(a);
  }
  return {winner:gs.over||'timeout', rounds:gs.over?gs.round:gs.round-1, hp:{p1:gs.p1.hp,p2:gs.p2.hp}, picks};
}
// Every ordered pair, `games` per matchup (half on each side). Returns [{key,name,winRate,rounds}], strongest first.
function balance(games,ai){
  const keys=Object.keys(CHARS), s={};
  keys.forEach(k=>s[k]={w:0,n:0,rounds:0});
  keys.forEach(a=>keys.forEach(b=>{
    if(a===b) return;
    for(let g=0;g<games/2;g++){
      const r=simMatch(a,b,ai||'normal');
      s[a].n++; s[b].n++; s[a].rounds+=r.rounds; s[b].rounds+=r.rounds;
      if(r.winner==='p1') s[a].w++; else if(r.winner==='p2') s[b].w++; else { s[a].w+=0.5; s[b].w+=0.5; }
    }
  }));
  return keys.map(k=>({key:k, name:CHARS[k].name, winRate:+(s[k].w/s[k].n*100).toFixed(1), rounds:+(s[k].rounds/s[k].n).toFixed(1)}))
    .sort((a,b)=>b.winRate-a.winRate);
}

const TT={RULES, ELEMENTS, load, newGame, playRound, aiChoose, simMatch, balance,
  get chars(){ return CHARS; }, get state(){ return gs; }, setRng(f){ rng=f||Math.random; }};
if(typeof module!=='undefined'&&module.exports) module.exports=TT;
else root.TT=TT;
})(typeof window!=='undefined'?window:this);
