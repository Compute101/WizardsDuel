// ── TABLETOP MODE ──────────────────────────────────────────
// The simplified rules for playing WizardsDuel on a real table with counters: HP, mana and wards are
// whole counters (max 12 HP, 20 mana and ward), signature spells are fixed cards, and the casting minigame is a
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
// As written, these are the Advanced rules; PRESETS below switches to Normal (the default) or Beginner.
const RULES={
  max:20,                      // max counters of mana and ward
  maxHp:12,                    // max HP: both players share one colour of 25 health winks
  startMana:6,
  income:4,                    // mana each wizard gains at the end of every round
  meditate:3,                  // Meditate: skip your spell for this much mana (not two rounds running)
  // Spell levels: Lesser / Normal / Greater (index 0 / 1 / 2). Easy to remember:
  // every spell costs 2 mana per wink to pot; damage equals the cost; wards and dispels are double it.
  cats:{
    //        mana cost and power for Lesser / Normal / Greater; stage = resolution order
    protect:{cost:[2,4,6], power:[4,8,12], stage:1},
    dispel: {cost:[2,4,6], power:[4,8,12], stage:2},
    damage: {cost:[2,4,6], power:[2,4,6],  stage:3},
  },
  wardWear:1,                  // a ward loses this many counters at every round end; it lasts until it runs out
  wardMatch:2,                 // a strike or dispel in the ward's own element counts this much more against it
  // Layered wards and seals (the standard game's WARD_RULES, in counters):
  //  boost:    a ward in the element of one already up tops that one up instead: + the new ward's winks,
  //            up to boostCap × them (Lesser 6, Normal 12, Greater 18), never fewer than it has
  //  layers:   up to this many wards at once, each its own pile; a new element goes on the outside.
  //            Strikes and ticks hit the outer pile first, and what breaks it carries on into the next.
  //            A Lesser or Normal dispel stops at the pile it breaks; a Greater one carries on, and if
  //            it breaks 2+ piles with power to spare (dispelStrips) it strips every buff too.
  //            Every pile wears at round end. All the piles together hold at most `max` winks.
  //  seals:    Seal Ward (a Protection pick at yourself, Lesser flick, sealCost mana) seals the outer
  //            pile: a sealed pile doesn't wear, and a dispel that meets a seal only breaks the seal,
  //            whatever its level. Strikes ignore seals. A pile put on over a sealed one keeps it.
  wards:{boost:true, boostCap:1.5, layers:2, seals:true, sealCost:1, dispelStrips:true},
  dispelAllRing:3,
  // Cleanse (a Dispel at yourself): Lesser removes 1 curse, Normal 2, Greater all of them; it costs
  // 1 mana per level, and the usual 1 / 2 / 3 winks to pot.
  cleanseCost:[1,2,3],
  cleanseCount:[1,2,Infinity],             // a Greater dispel removes every buff, not just the newest
  // Tiddlywink cast. Every caster flicks from their own handicap line (set per player, so everyone
  // pots about as often), and must pot `winks` winks for the level. After a miss, pay retryCost mana
  // to have another go, or stop and the spell fizzles (its cost is lost). Missed winks stay on the
  // table, round after round, until someone squops them.
  winks:[1,2,3],
  retryCost:1,
  pot:0.75,                    // simulator: chance a flick pots from your handicap line
  // Squops, after the spells resolve: the wizards take turns, squops attempts each, at any missed
  // winks on the table (their own or the foe's), gaining squopGain mana for each one squopped.
  // Turn order: the closer handicap line first (gs.handicap), then whoever potted more winks this
  // round, then whoever has less HP.
  squops:3,
  squop:0.4,                   // simulator: chance a squop attempt lands
  squopGain:1,
  // Sudden death keeps games short: from this round, both wizards lose dmg HP at every round end,
  // 1 more every `every` rounds after that.
  suddenDeath:{round:15, dmg:1, every:3},
  maxRounds:40,                // the simulator calls it a timeout after this
  // How the flick works:
  //  'pot'     pot `winks` winks to cast, paying retryCost after each miss (the rules above).
  //  'chances' (Beginner and Normal) up to `chances` flicks; the first pot casts the spell, no pot and it
  //            fizzles (the mana is lost). `chances` is a number, an array by level, or {budget:n}
  //            for n minus the spell's cost, so cheaper spells get more flicks.
  flickMode:'pot',
  chances:5,
};
// Named rule sets, from fewest rules to most. The RULES block above is the Advanced rules; the others
// override some of it. useRules(name) switches (the simulator, balance tools and real play all read
// RULES). The default is 'normal'.
//  beginner  the Normal flick, with fewer rules to learn: one ward at a time (a new ward replaces it;
//            no top-ups, layers or seals), no +2 for a ward's own element, and one Cleanse that
//            clears every curse.
//  normal    calibrated to a first-time player's flicking: 7 pots in 57 flicks (about 12%). Flick 10
//            minus the spell's cost (Lesser 8, Normal 6, Greater 4); the first pot casts it, no pot
//            and it fizzles. No retries and no squops: missed winks are picked up. Every other rule.
//  advanced  for expert flickers (about 3 pots in 4): pot 1 / 2 / 3 winks by level, pay to retry
//            after a miss, and squop the missed winks left on the table for mana.
const PRESETS={
  beginner:{flickMode:'chances', chances:{budget:10}, pot:0.12, squops:0,
    wardMatch:0, wards:{boost:false, layers:1, seals:false, dispelStrips:false},
    cleanseCost:[2,2,2], cleanseCount:[Infinity,Infinity,Infinity]},
  normal:{flickMode:'chances', chances:{budget:10}, pot:0.12, squops:0},
  advanced:{},
};
const RULE_SETS=['beginner','normal','advanced'];   // the order players learn them in
const DEFAULTS=JSON.parse(JSON.stringify(RULES));
function useRules(name){
  if(name==='standard') name='advanced';   // the old name for these rules
  const P=PRESETS[name];
  if(!P) throw new Error('unknown rules: '+name);
  Object.keys(RULES).forEach(k=>delete RULES[k]);
  Object.assign(RULES,JSON.parse(JSON.stringify(DEFAULTS)));
  // Infinity doesn't survive JSON
  RULES.cleanseCount=DEFAULTS.cleanseCount.map(n=>n==null?Infinity:n);
  Object.keys(P).forEach(k=>{
    const v=P[k];
    RULES[k]=Array.isArray(v)?v.slice():v&&typeof v==='object'?Object.assign({},DEFAULTS[k],v):v;
  });
  rulesName=name;
  applyCharRules();
  return RULES;
}
// A copy of a rule set's numbers, without switching the current rules (for the tutorial)
function rulesOf(name){
  const cur=rulesName, out=JSON.parse(JSON.stringify(useRules(name)));
  out.cleanseCount=RULES.cleanseCount.slice();
  useRules(cur);
  return out;
}
// A character's "hp" in tabletop.json is for the Normal rules (Beginner uses it too); it can change
// it under a named rule set: "rules":{"advanced":{"hp":17}}. Only HP for now.
function applyCharRules(){
  Object.values(CHARS).forEach(c=>{ const o=c.alt[rulesName]||{}; c.hp=Math.min(RULES.maxHp,o.hp!=null?o.hp:c.baseHp); });
}
const ELEMENTS=['fire','ice','lightning','arcane','physical','dark'];
const CATS=['protect','dispel','damage'];

let CHARS={};   // key -> merged tabletop character
let rulesName='normal';
let rng=Math.random;

// Merge characters.json (names, colours, forbidden) with tabletop.json (the counter numbers)
function load(chars,tt){
  CHARS={};
  Object.keys(tt).forEach(k=>{
    if(k.startsWith('_')||!chars[k]) return;
    const c=chars[k], t=tt[k];
    CHARS[k]={key:k, name:c.name, title:c.title, col:c.col, sealAll:!!c.sealAll, sealCostMod:c.sealCostMod||0,
      hp:Math.min(RULES.maxHp,t.hp), baseHp:Math.min(RULES.maxHp,t.hp), alt:t.rules||{},
      deathless:t.deathless||0, forbidden:t.forbidden||c.forbidden||[], spells:t.spells||[]};
  });
  applyCharRules();
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
  const seat=(k,w)=>({w, key:k, c:CHARS[k], hp:CHARS[k].hp, mana:RULES.startMana, ward:null, wardInner:[],
    wardStats:{raised:0, boosted:0, layered:0, sealed:0, sealsBroken:0}, effects:[],
    medRound:-9, potted:0, catCounts:{}, lostLast:0, hpAtStart:0, used:{}, meditated:false});
  gs={round:1, p1:seat(k1,'p1'), p2:seat(k2,'p2'), table:0, over:null, log:[]};
  return gs;
}
const foe=w=>w==='p1'?'p2':'p1';
const fx=(st,type)=>st.effects.filter(e=>e.type===type);
const buffs=st=>st.effects.filter(e=>e.kind==='buff');
const curses=st=>st.effects.filter(e=>e.kind==='curse');
const minions=(st,m)=>st.effects.filter(e=>e.type==='minion'&&(!m||e.minion===m));
const sigById=(st,id)=>st.c.spells.find(s=>s.id===id);
function log(s){ if(gs.verbose) gs.log.push('R'+gs.round+' '+s); }

// Infernal Gate (Frederick): a Protection card, so it resolves before any Dispel or Damage. He steps through
// the Gate: for the rest of the round nothing aimed at him lands and nothing ticks on him. At round end the
// wizards trade places at the table and he comes out in Infernal Mantle: his next strike ignores the foe's
// ward (until used, or a Dispel strips it). st.gate = {until: this round}. Not two rounds running.
function inGate(w){ const g=gs[w].gate; return !!g&&gs.round<=g.until; }
// Does this pick aim at the foe? (Cleanse, wards, buffs, heals and Meditate don't.)
function aimsAtFoe(st,a){
  if(a.cat==='damage') return true;
  if(a.cat!=='dispel'||a.self) return false;
  const sp=a.sig&&sigById(st,a.sig);
  return !sp||sp.kind==='curse'||!!(sp.action&&sp.action.type==='siphon');
}
function locked(st,cat){ return fx(st,'lock').some(e=>e.cat===cat&&e.from<gs.round); }
function canMeditate(st){ return st.medRound!==gs.round-1&&st.mana<RULES.max; }
function incomeDrain(st){ return fx(st,'incomeDrain').reduce((a,e)=>a+e.n,0); }
function mostUsedCat(st){ return ['damage','protect','dispel'].reduce((a,c)=>(st.catCounts[c]||0)>(st.catCounts[a]||0)?c:a,'damage'); }
function costOf(st,a){
  if(a.cat==='meditate'||a.cat==='pass') return 0;
  const sp=a.sig&&sigById(st,a.sig);
  let c=sp?sp.cost:isSeal(a)?sealCost(st):a.self?RULES.cleanseCost[a.ring-1]:RULES.cats[a.cat].cost[a.ring-1];
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
    // Minions stack: add up to `raise` copies (default 1), never past `max`
    const n=Math.min(eff.max-minions(st,eff.minion).length, eff.raise||1);
    if(n<=0) return false;
    // Soak minions get HP: soak:true is 1 (Valdris's skeletons), a number is tougher (Daveron's graveguard)
    for(let i=0;i<n;i++) st.effects.push(Object.assign({from:gs.round, by:from},eff,eff.soak?{hp:eff.soak===true?1:eff.soak}:{}));
    return true;
  }
  st.effects=st.effects.filter(e=>e.id!==eff.id);
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

// Damage that meets soak minions, then the ward. adj: +n / −n against the ward (element match / off-element).
// own: the damage is the target's own (a Bewitched self-hit), so the foe pays no Soul Tithe.
// Returns the HP damage dealt.
// blast: up to this much of the damage goes around the ward straight to HP (Frederick's strikes)
// elem: the strike's element, so each ward pile it meets counts its own +2 (instead of adj)
function incoming(who,dmg,adj,own,blast,elem){
  const st=gs[who];
  if(dmg<=0) return 0;
  // Soak minions (skeletons) stand in front of the ward, oldest first: each soaks damage up to its HP
  // (1 for a plain skeleton, so every point kills one) and falls when its HP runs out
  const wall=st.effects.filter(e=>e.type==='minion'&&e.soak);
  if(wall.length){
    const dead=[];
    for(const m of wall){
      if(dmg<=0) break;
      const d=Math.min(dmg,m.hp);
      m.hp-=d; dmg-=d;
      if(m.hp<=0) dead.push(m);
    }
    st.effects=st.effects.filter(e=>!dead.includes(e));
    // Soul Tithe: a foe cursed with it loses mana for each skeleton they kill
    if(!own&&dead.length) fx(gs[foe(who)],'tithe').forEach(e=>loseMana(foe(who),dead.length*e.n));
    if(dmg<=0) return 0;
  }
  let around=0;
  if(st.ward&&blast){ around=Math.min(blast,dmg); dmg-=around; }
  // Layered wards: what breaks the outer pile carries on into the next (with that pile's own +2)
  while(st.ward&&dmg>0){
    const a=elem!=null?wardAdj(st,elem):(adj||0), eff=Math.max(1,dmg+a);
    if(eff<st.ward.hp){ st.ward.hp-=eff; dmg=0; break; }
    const over=eff-st.ward.hp;
    dropOuterWard(st);
    dmg=st.ward?Math.max(0,over-a):over;
  }
  dmg+=around;
  loseHp(who,dmg);
  return dmg;
}
function wardAdj(st,elem){ return st.ward&&st.ward.elem===elem?RULES.wardMatch:0; }

// ── Wards: piles of ward winks, outer first (st.ward), the rest beneath (st.wardInner, innermost first)
const wardRules=()=>RULES.wards||{};
function wardLayers(st){ return st.ward?1+st.wardInner.length:0; }
function wardTotal(st){ return st.ward?st.ward.hp+st.wardInner.reduce((a,l)=>a+l.hp,0):0; }
function dropOuterWard(st){ st.ward=st.wardInner.pop()||null; }
const isSeal=a=>a.cat==='protect'&&!!a.self;
function sealCost(st){ return Math.max(0,(wardRules().sealCost||1)+(st.c.sealCostMod||0)); }
// Something to seal: the outer pile, or (sealAll: Eldrin) any pile beneath
function canSeal(st){
  if(!wardRules().seals||!st.ward) return false;
  return !st.ward.sealed||(st.c.sealAll&&st.wardInner.some(l=>!l.sealed));
}
function doSeal(who){
  const st=gs[who];
  if(!st.ward) return;
  const piles=st.c.sealAll?[st.ward].concat(st.wardInner):[st.ward];
  piles.forEach(l=>{ if(!l.sealed){ l.sealed=true; st.wardStats.sealed++; } });
}

// ── Casting ────────────────────────────────────────────────
// noBoost: a buff's light side-ward (Blink, Arcane Weave) never tops up or layers: it replaces the outer pile
function raiseWard(who,elem,hp,ret,noBoost){
  const st=gs[who], R=wardRules();
  const room=()=>Math.max(0,RULES.max-wardTotal(st));
  const same=st.ward&&(st.ward.elem===elem?st.ward:st.wardInner.find(l=>l.elem===elem));
  if(!noBoost&&R.boost&&same){
    const to=Math.max(same.hp,Math.min(same.hp+hp,Math.round(hp*R.boostCap)));
    same.hp=Math.min(to,same.hp+room());
    same.ret=Math.max(same.ret||0,ret||0);
    st.wardStats.boosted++;
    return;
  }
  if(!noBoost&&st.ward&&wardLayers(st)<(R.layers||1)){
    st.wardInner.push(st.ward);
    st.ward=null;
    st.wardStats.layered++;
  }
  // A new outer pile (or one replacing the outer pile), within the 20-wink limit
  const under=wardTotal(st)-(st.ward?st.ward.hp:0);
  const n=Math.min(hp,RULES.max-under);
  st.ward=n>0?{hp:n, elem, ret:ret||0, sealed:false}:null;
  if(!st.ward) dropOuterWard(st);
  st.wardStats.raised++;
}

function doProtect(who,a){
  const st=gs[who], sp=a.sig&&sigById(st,a.sig);
  if(isSeal(a)){ doSeal(who); return; }
  if(!sp){ raiseWard(who,a.elem,RULES.cats.protect.power[a.ring-1]); return; }
  if(sp.kind==='ward'){
    let hp=sp.ward+(sp.perSkeleton||0)*minions(st,'skeleton').length;
    raiseWard(who,sp.elem,hp,sp.retaliate);
    if(sp.rewind) heal(who,Math.min(sp.rewind,st.lostLast));
    return;
  }
  if(sp.kind==='instant'){ doInstant(who,sp); return; }
  if(sp.effect&&sp.effect.type==='gate'){ st.gate={until:gs.round}; st.lastGate=gs.round; return; }
  const e=Object.assign({id:sp.id, kind:'buff', name:sp.name},sp.effect);
  addEffect(who,e,who);
  if(sp.ward&&!(st.ward&&st.ward.hp>=sp.ward)) raiseWard(who,sp.elem,sp.ward,0,true);   // never over a stronger ward
}
function doInstant(who,sp){
  const st=gs[who], x=sp.action;
  if(x.type==='heal') heal(who,x.n);
  else if(x.type==='bloodpact') gainMana(who,x.mana);   // the HP was turned into mana as it was paid
  else if(x.type==='tonic'){
    if(d6()<=3) heal(who,x.heal);
    else addEffect(who,{id:'tonic', type:'empower', kind:'buff', name:'Tonic', bonus:x.bonus},who);
  }
  else if(x.type==='cleanse'){ removeEffects(who,curses(st)); heal(who,x.heal||0); }
}

// How much a curse hurts, so the AI (and a sensible player) cleanses the worst first
function curseHarm(e){
  return {agony:5, dot:4, silence:4, incomeDrain:3, vuln:3, spellbind:3, candle:2, bewitch:2, lock:1, enthral:1}[e.type]||1;
}
function doDispel(who,a){
  const st=gs[who], t=foe(who), ts=gs[t], sp=a.sig&&sigById(st,a.sig);
  if(a.self){   // Cleanse: the worst curses first (a player picks which)
    const list=curses(st).sort((x,y)=>curseHarm(y)-curseHarm(x)).slice(0,RULES.cleanseCount[a.ring-1]);
    removeEffects(who,list); return;
  }
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
    // A seal stops the whole dispel: it breaks the seal and goes no further. A Greater dispel that
    // breaks a pile carries on into the next; a Lesser or Normal one stops at the pile it breaks.
    const R=wardRules(), through=(R.layers||1)>1&&a.ring>=RULES.dispelAllRing, stack=wardLayers(ts);
    let p=power;
    while(ts.ward&&p>0){
      if(ts.ward.sealed){ ts.ward.sealed=false; ts.wardStats.sealsBroken++; return; }
      const adj=wardAdj(ts,a.elem), hit=p+adj, had=ts.ward.hp;
      ts.ward.hp-=hit;
      if(ts.ward.hp>0) return;
      dropOuterWard(ts);
      if(!through) return;
      p=Math.max(0,hit-had-adj);
    }
    // Broke a whole stack with power to spare: the buffs behind it go too
    if(through&&p>0&&stack>1&&R.dispelStrips){ const b=buffs(ts); if(b.length) removeEffects(t,b); }
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
  let burn=0;
  const emp=st.effects.find(e=>e.type==='empower'&&(!e.elem||e.elem===elem));
  const pierce=!!(emp&&emp.pierce);   // Infernal Mantle: this strike ignores the ward
  if(emp){ dmg=emp.double?dmg*2:dmg+emp.bonus; removeEffects(who,[emp]); }
  fx(st,'frenzy').forEach(e=>{ dmg+=e.bonus; loseHp(who,e.selfDmg); });
  const weave=fx(st,'weave')[0];
  if(weave){ dmg+=weave.bonus; burn+=weave.burn; if(--weave.charges<=0) removeEffects(who,[weave]); }
  if(sp&&sp.recoil) loseHp(who,sp.recoil);
  if(tgt===who){ incoming(who,dmg,0,true); return; }
  // Misses
  const abs=fx(ts,'absorbNext')[0];
  if(abs){ removeEffects(tgt,[abs]); return; }
  if(fx(ts,'dodge').some(e=>rolls(e.roll))) return;
  dmg+=fx(ts,'vuln').reduce((s,e)=>s+e.n,0);
  const res=fx(ts,'resist').reduce((s,e)=>s+e.n,0);
  if(res) dmg=Math.max(1,dmg-res);
  const retaliate=fx(ts,'resist').concat(fx(ts,'counter')).reduce((s,e)=>s+(e.retaliate||0),0)+(ts.ward?ts.ward.ret:0);
  const hp=incoming(tgt,dmg,0,false,pierce?dmg:sp&&sp.blast,elem);
  if(hp>0){
    if(sp&&sp.lifesteal) heal(who,Math.floor(hp/2));
    if(sp&&sp.dot) addEffect(tgt,{id:sp.id+'-dot', type:'dot', kind:'curse', name:sp.name, dmg:sp.dot.dmg, bypassWard:sp.dot.bypassWard},who);
    if(sp&&sp.chill) addEffect(tgt,{id:'chill', type:'lock', kind:'curse', name:'Chilled', cat:'damage'},who);
  }
  // Mana burn lands whether or not the ward held
  burn+=sp&&sp.manaburn||0;
  loseMana(tgt,burn);
  if(sp&&sp.arc&&rolls(sp.arc.roll)) incoming(tgt,sp.arc.dmg,0);
  if(retaliate) loseHp(who,retaliate);
}
// ── A round ────────────────────────────────────────────────
// picks: {p1:action, p2:action}. action: {cat:'damage'|'protect'|'dispel', elem, ring} or
// {cat, sig:'spellId'} or {cat:'dispel', self:true, ring:1} (cleanse) or {cat:'meditate'} / {cat:'pass'}.
// flicks (optional, for real play): {p1:{cast:true|false, missed:n}, ...} the tiddlywink results
// (Beginner and Normal rules: {p1:{cast:bool}});
// otherwise they are rolled from RULES.pot. squops (optional): {p1:winks squopped, ...}; otherwise
// rolled from RULES.squop.
function playRound(picks,flicks,squops){
  const W=['p1','p2'];
  W.forEach(w=>{ gs[w].hpAtStart=gs[w].hp; gs[w].meditated=false; gs[w].potted=0; });
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
    seats.forEach(w=>{
      if(gs.over||inGate(w)) return;                                    // he's gone through the Gate
      if(aimsAtFoe(gs[w],picks[w])&&inGate(foe(w))&&!fx(gs[w],'bewitch').length) return;   // into the Gate: fizzles
      (cat==='protect'?doProtect:cat==='dispel'?doDispel:doDamage)(w,picks[w]);
    });
    if(checkOver()) return outcome;
  }
  W.forEach(w=>{ if(picks[w].cat==='meditate'&&outcome[w]==='cast') gainMana(w,Math.max(0,RULES.meditate-incomeDrain(gs[w]))); });
  squopPhase(squops);
  endRound();
  return outcome;
}
// Squops: the wizards take turns, RULES.squops attempts each, at any missed winks on the table.
// given (real play): {p1:winks squopped, p2:...}.
function squopPhase(given){
  const W=['p1','p2'];
  if(given){
    W.forEach(w=>{ const got=Math.min(gs.table,given[w]||0); gs.table-=got; gainMana(w,got*RULES.squopGain); });
    return;
  }
  const hc=w=>gs.handicap&&gs.handicap[w]!=null?gs.handicap[w]:0;
  const order=W.slice().sort((a,b)=>hc(a)-hc(b)||gs[b].potted-gs[a].potted||gs[a].hp-gs[b].hp||(rng()<0.5?-1:1));
  for(let i=0;i<RULES.squops&&gs.table>0;i++){
    order.forEach(w=>{
      if(gs.table>0&&rng()<squopChance(w)){ gs.table--; gainMana(w,RULES.squopGain); gs[w].squopped=(gs[w].squopped||0)+1; }
    });
  }
}
const potChance=w=>gs.pot&&gs.pot[w]!=null?gs.pot[w]:RULES.pot;
const squopChance=w=>gs.squop&&gs.squop[w]!=null?gs.squop[w]:RULES.squop;
// The flick: pot RULES.winks[ring] winks; after each miss, pay retryCost to go again or give up.
// Returns true when the spell is cast. Missed winks are left on the table (gs.table).
function flickCast(w,ring,given,paid){
  const st=gs[w], need=RULES.winks[ring-1];
  if(RULES.flickMode==='chances'){
    // Beginner and Normal: up to RULES.chances flicks, and the first pot casts. given (real play): {cast:bool}.
    // Missed winks are picked up, so nothing builds up on the table.
    if(given) return !!given.cast;
    // chances: a number, an array by level, or {budget:n} for n minus the spell's cost
    const c=RULES.chances, tries=typeof c==='number'?c:Array.isArray(c)?c[ring-1]:Math.max(1,c.budget-paid);
    for(let i=0;i<tries;i++){ st.flicks=(st.flicks||0)+1; if(rng()<potChance(w)){ st.potted++; return true; } }
    return false;
  }
  if(given){
    const retries=given.cast?given.missed:Math.max(0,given.missed-1);
    loseMana(w,retries*RULES.retryCost);
    gs.table+=given.missed;
    if(given.cast) st.potted+=need;
    return !!given.cast;
  }
  let potted=0;
  while(potted<need){
    if(rng()<potChance(w)){ potted++; st.potted++; continue; }
    gs.table++;
    if(st.mana<RULES.retryCost) return false;
    st.mana-=RULES.retryCost;
  }
  return true;
}
// Curses that bite as the spell is picked (Enthral, Silence), then the mana, then the flick
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
  // Blood Pact: the HP counters are turned into mana first, so they can be potted
  const sp=a.sig&&sigById(st,a.sig);
  if(sp&&sp.action&&sp.action.type==='bloodpact'){ loseHp(w,sp.action.hp); gainMana(w,sp.action.hp); }
  if(cost>st.mana) return 'nomana';
  st.mana-=cost;
  if(!flickCast(w,ringOf(st,a),flick,cost)) return 'fizzle';
  if(a.cat==='protect'&&!isSeal(a)) fx(st,'candle').forEach(e=>loseHp(w,e.dmg));   // a seal isn't a new ward
  return 'cast';
}

function endRound(){
  const W=['p1','p2'];
  // Ticks: curses on you, then your buffs (regen) and minions
  W.forEach(w=>{
    const st=gs[w], f=foe(w);
    if(inGate(w)){ fx(st,'regen').forEach(e=>heal(w,e.heal)); return; }   // nothing reaches him in the Gate
    fx(st,'dot').forEach(e=>{
      const n=e.ramp?e.ramp[Math.min(e.ramp.length-1,e.step++)]:e.dmg;
      if(e.bypassWard) loseHp(w,n); else incoming(w,n,0);
      if(e.manaDrain) loseMana(w,e.manaDrain);
    });
    fx(st,'agony').forEach(e=>{
      const corrupt=fx(st,'incomeDrain').some(c=>c.corrupt);
      if(!st.meditated||corrupt||e.inescapable) loseHp(w,e.dmg);   // Curse of the Years: no escape
    });
    fx(st,'regen').forEach(e=>heal(w,e.heal));
    // Healing minions (Gretch's Bone Totem) heal their owner while they stand
    minions(st).filter(m=>m.heal).forEach(m=>heal(w,m.heal));
    // Danse Macabre (Daveron): each of your skeletons deals its bonus more
    const danse=fx(st,'danse').reduce((a,e)=>a+e.bonus,0);
    if(!inGate(f)) minions(st).filter(m=>m.dmg).forEach(m=>incoming(f,m.dmg+(m.minion==='skeleton'?danse:0),0));   // a totem doesn't strike; nothing reaches him in the Gate
  });
  // Sudden death
  const sd=RULES.suddenDeath;
  if(sd&&gs.round>=sd.round){
    const n=sd.dmg+Math.floor((gs.round-sd.round)/sd.every);
    W.forEach(w=>{ if(!inGate(w)) loseHp(w,n); });
  }
  if(checkOver()) return;
  // Out of the Gate: trade places at the table, wreathed in Infernal Mantle
  W.forEach(w=>{
    const g=gs[w].gate;
    if(!g||g.until!==gs.round) return;
    gs[w].gate=null;
    addEffect(w,{id:'infernalmantle', type:'empower', kind:'buff', name:'Infernal Mantle', bonus:0, pierce:true},w);
  });
  if(checkOver()) return;
  W.forEach(w=>{
    const st=gs[w];
    // Wards wear down, every pile, and last until they run out. A sealed pile doesn't wear;
    // Eldrin's Counter braces them all.
    if(st.ward&&!fx(st,'counter').some(e=>e.holdWard)){
      st.wardInner=st.wardInner.filter(l=>l.sealed||(l.hp-=RULES.wardWear)>0);
      if(!st.ward.sealed){ st.ward.hp-=RULES.wardWear; if(st.ward.hp<=0) dropOuterWard(st); }
    }
    // Timed enchantments run down
    // Buffs and curses have no timers: they last until a Dispel or Cleanse removes them, or (for
    // "next strike" / "next pick" effects) until used. A lock lasts for the one round it blocks.
    st.effects=st.effects.filter(e=>!(e.type==='lock'&&e.from<gs.round));
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
  if(isSeal(a)) return canSeal(st)&&sealCost(st)<=st.mana;
  if(a.elem&&!a.sig&&st.c.forbidden.includes(a.elem)) return false;
  const sp=a.sig&&sigById(st,a.sig);
  if(sp&&sp.effect&&sp.effect.type==='gate'&&st.lastGate===gs.round-1) return false;   // not two rounds running
  if(sp&&sp.requires==='skeleton'&&!minions(st,'skeleton').length) return false;   // Danse Macabre needs a dancer
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
    if(e.type==='agony'&&!e.inescapable&&ts.mana<3) return true;
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
  if(e.type==='gate') return !st.effects.some(f=>f.pierce)&&ts.mana>=costOf(ts,{cat:'damage',ring:1});
  if(sp.pctHp) return Math.floor(ts.hp/sp.pctHp.div)>=sp.pctHp.min||ts.hp<=sp.pctHp.min+1;
  return true;
}
const guardSpell=st=>st.c.spells.find(s=>s.effect&&s.effect.type==='minion'&&s.effect.soak);
const guards=st=>st.effects.filter(e=>e.type==='minion'&&e.soak).length;
// Screen running thin: at or below half the card's max (Valdris: 2 of 5; Daveron's graveguard: 1 of 3)
const guardLow=st=>{ const g=guardSpell(st); return !!g&&guards(st)<=Math.floor(g.effect.max/2); };
function aiChoose(w,level){
  const st=gs[w], ts=gs[foe(w)], smart=level!=='easy';
  // Meditate when short of mana
  if(canMeditate(st)&&st.mana<costOf(st,{cat:'damage',ring:2})){
    let p=st.mana<costOf(st,{cat:'damage',ring:1})?0.5:0.25;
    if(ts.mana<costOf(ts,{cat:'damage',ring:1})) p+=0.3;
    if(st.ward&&st.ward.hp>=3) p+=0.15;
    if(fx(st,'agony').some(e=>!e.inescapable)&&!fx(st,'incomeDrain').some(e=>e.corrupt)) p+=0.4;
    if(fx(st,'candle').length) p*=0.3;
    if(st.hp<st.c.hp*0.3) p*=0.5;
    if(!smart) p*=0.6;
    if(rng()<p) return {cat:'meditate'};
  }
  const w8={damage:1.0, protect:0.55, dispel:0.08};
  if(ts.ward){ w8.dispel=smart?1.6:1.0; w8.damage=0.6; }
  else if(buffs(ts).length) w8.dispel+=smart?0.9:0.4;
  // Curses never wear off on their own: clear them, more urgently the more there are
  const nCurses=curses(st).length;
  if(nCurses) w8.dispel+=smart?0.6+0.5*nCurses:0.4;
  if(st.effects.some(e=>e.type==='empower'||e.type==='frenzy'||e.type==='weave')) w8.damage+=0.9;
  if(st.effects.some(e=>e.pierce)) w8.damage+=smart?1.2:0.5;   // Infernal Mantle: strike through their ward
  if(minions(st,'blade').length>=2) w8.damage+=0.6;
  const hexes=st.c.spells.filter(s=>s.cat==='dispel'&&s.kind==='curse'&&sigSensible(w,s)).length;
  w8.dispel+=(smart?0.35:0.2)*hexes;
  // A healthy ward with room for another pile still invites one; a sealable one invites a seal
  if(st.ward&&st.ward.hp>=4) w8.protect=wardLayers(st)<(wardRules().layers||1)?AI_WARDS.layer:0.2;
  else {
    if(ts.mana>=costOf(ts,{cat:'damage',ring:2})) w8.protect+=0.35;
    if(st.hp<st.c.hp*0.35) w8.protect+=0.35;
  }
  // Soak minions: keep a screen of skeletons up; batter through the foe's
  if(guardLow(st)) w8.protect+=smart?1.2:0.6;
  const tg=guards(ts);
  if(tg){ w8.damage+=(smart?0.25:0.1)*tg; if(!ts.ward) w8.dispel*=0.5; }
  if(fx(st,'bewitch').length){ w8.damage*=smart?0.15:0.6; w8.dispel+=smart?0.8:0.3; }
  if(canSeal(st)&&st.ward.hp>=AI_WARDS.sealHp&&!locked(st,'protect')){
    w8.seal=AI_WARDS.seal*(smart?1:0.5);
    if(smart&&wardLayers(st)>1) w8.seal+=0.3;
    if(smart&&st.hp<st.c.hp*0.5) w8.seal+=0.3;
  }
  const cats=CATS.concat(w8.seal?['seal']:[]).filter(c=>(c==='seal'||!locked(st,c))&&w8[c]>0);
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
// The AI's ward play (sim knobs, like the standard game's WARD_LAYER_AI / WARD_SEAL_AI):
// layer: Protection weight with a healthy ward and room for another pile; seal / sealHp: Seal Ward's
// weight and the least winks on the outer pile worth sealing; boostHp: top up the outer pile below this
const AI_WARDS={layer:0.4, seal:1.0, sealHp:4, boostHp:6};
function aiInCat(w,cat,smart){
  const st=gs[w], ts=gs[foe(w)];
  if(cat==='seal') return canPick(st,{cat:'protect',self:true,ring:1})?{cat:'protect',self:true,ring:1}:null;
  // Cleanse a curse
  const nc=curses(st).length;
  if(cat==='dispel'&&nc&&canPick(st,{cat,self:true,ring:1})&&rng()<(smart?(!ts.ward&&!buffs(ts).length?0.9:0.6):0.5)){
    // Clear as many as are worth it (Greater clears them all), at a level we can afford
    let ring=Math.min(3,nc);
    while(ring>1&&!canPick(st,{cat,self:true,ring})) ring--;
    return {cat,self:true,ring};
  }
  const gsp=guardSpell(st);
  // Danse Macabre: set the dead dancing while there are dancers, more readily the more there are
  const dsp=st.c.spells.find(s=>s.effect&&s.effect.type==='danse');
  if(cat==='protect'&&dsp&&guards(st)&&!fx(st,'danse').length&&canPick(st,{cat,sig:dsp.id})&&rng()<(smart?0.35+0.15*guards(st):0.25)) return {cat,sig:dsp.id};
  if(cat==='protect'&&guardLow(st)&&canPick(st,{cat,sig:gsp.id})&&rng()<(smart?0.85:0.5)) return {cat,sig:gsp.id};
  const sigs=st.c.spells.filter(s=>s.cat===cat&&canPick(st,{cat,sig:s.id})&&sigSensible(w,s));
  // Infernal Mantle on: put the biggest strike we can afford through their ward
  if(cat==='damage'&&smart&&st.effects.some(e=>e.pierce)&&sigs.length&&rng()<0.8)
    return {cat,sig:sigs.reduce((a,b)=>(b.dmg||0)>(a.dmg||0)?b:a).id};
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
  // Wards up: a worn one gets topped up; a healthy one with room for another pile gets a new element over it
  if(cat==='protect'&&st.ward){
    const R=wardRules(), mine=[st.ward.elem].concat(st.wardInner.map(l=>l.elem));
    const room=wardLayers(st)<(R.layers||1);
    if(room&&st.ward.hp>=AI_WARDS.boostHp){ const off=elems.filter(e=>!mine.includes(e)); if(off.length&&mine.includes(elem)) elem=off[Math.floor(rng()*off.length)]; }
    else if(R.boost&&elems.includes(st.ward.elem)&&rng()<(smart?0.75:0.4)) elem=st.ward.elem;
  }
  // A sealed ward: any dispel only breaks the seal, so break it with the cheapest
  if(cat==='dispel'&&smart&&ts.ward&&ts.ward.sealed&&canPick(st,{cat,elem,ring:1})) return {cat,elem,ring:1};
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
    ['p1','p2'].forEach(w=>{ const k=a[w].sig||(a[w].self?(a[w].cat==='protect'?'seal':'cleanse'):a[w].cat); picks[w][k]=(picks[w][k]||0)+1; });
    playRound(a);
  }
  return {winner:gs.over||'timeout', rounds:gs.over?gs.round:gs.round-1, hp:{p1:gs.p1.hp,p2:gs.p2.hp}, picks,
    wards:{p1:{...gs.p1.wardStats}, p2:{...gs.p2.wardStats}}};
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

useRules('normal');

const TT={RULES, PRESETS, RULE_SETS, useRules, rulesOf, AI_WARDS, get rulesName(){ return rulesName; }, ELEMENTS, load, newGame, playRound, aiChoose, simMatch, balance,
  get chars(){ return CHARS; }, get state(){ return gs; }, setRng(f){ rng=f||Math.random; }};
if(typeof module!=='undefined'&&module.exports) module.exports=TT;
else root.TT=TT;
})(typeof window!=='undefined'?window:this);
