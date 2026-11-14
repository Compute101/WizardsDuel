// ── TABLETOP MODE ──────────────────────────────────────────
// The simplified rules for playing WizardsDuel on a real table with counters: HP, mana and wards are
// whole counters (max 12 HP, 20 mana and ward), signature spells are fixed cards, and the casting minigame is a
// tiddlywink flick. This file is the rules engine, a simple AI and the AI-vs-AI simulator that
// tools/balance.html runs in Tabletop mode. The human-readable rules are docs/tabletop-rules.md —
// keep the two in step. Character numbers live in tabletop.json.
//
// It is self-contained: the standard game (js/game.js) never loads it and none of its rules change.
// Works in the browser (window.TT) and in Node (module.exports) for quick balance runs:
//   node -e "const TT=require('./js/tabletop.js'); TT.load(require('./characters.json'),require('./tabletop.json'),require('./fighters.json')); console.log(TT.balance(40))"
// Encounters (a wizard against a band of fighters): TT.encounterBalance(games) after TT.useRules(name).
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
  wardMatch:2,                 // a strike or dispel in the ward's OPPOSITE element (across the wheel) counts this much more
  // Actions (everyone, free, no winks, last the round they're made): Attack hits for your atk (+1 into a foe
  // grappling you); a Guard blocks every blow aimed at you that round and counters an Attack for your atk;
  // a Grapple hits a Guard for your atk, anyone else for half (rounded down), and fails against an Attack at you.
  // Wards stop magic only: blows (Attacks, minion bites, physical cards) go past them. Ironskin soaks blows.
  skin:{name:'Ironskin', cost:2, soak:3, upkeep:1},   // upkeep: mana at every round end (after income) to keep it, or it fades
  // Minions as bodies (Normal and Advanced): each round you set your bodies' stance, free. Guard: they stand in
  // front of you and take hits first, braced (each stops 2 damage per wink of its HP), and don't bite.
  // Attack: they bite at round end and shield no one. A strike, Attack or Grapple can be aimed at one body.
  // Beginner (stances:false): bodies always soak (1 per wink) and always bite.
  minions:{stances:true, brace:1, target:true},
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
  // Strikes, as in the app: a minion's strike is a strike (Vanish, Foresight, Blink's dodge, Stonesoul-type
  // resist and Warpstone-type vuln meet it; retaliation doesn't), Vanish turns a curse aside (used up), and a
  // dispel at a Vanished wizard only removes the Vanish, like a seal.
  strikes:{minions:true, vanishCurses:true, vanishDispel:true},
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
    wardMatch:0, wards:{boost:false, layers:1, seals:false, dispelStrips:false}, minions:{stances:false, brace:1, target:false},
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
  // Fighters (no HP cap: they keep their own counters): "rules":{"advanced":{"hp":n,"atk":n}} in fighters.json's "tabletop"
  Object.values(FIGHTERS).forEach(c=>{ const o=c.alt[rulesName]||{}; c.hp=o.hp!=null?o.hp:c.baseHp; c.atk=o.atk!=null?o.atk:c.baseAtk; });
}
// Eight elements, each across the wheel from its opposite (index + 4): Fire / Water, Air / Earth,
// Lightning / Ice, Arcane / Dark. A ward's opposite counts +wardMatch against it.
const ELEMENTS=['fire','air','lightning','arcane','water','earth','ice','dark'];
const opposite=e=>{ const i=ELEMENTS.indexOf(e); return i<0?null:ELEMENTS[(i+ELEMENTS.length/2)%ELEMENTS.length]; };
const CATS=['protect','dispel','damage'];

let CHARS={};   // key -> merged tabletop character
let FIGHTERS={};   // key -> tabletop fighter (Encounters)
let rulesName='normal';
let rng=Math.random;

// Merge characters.json (names, colours, forbidden) with tabletop.json (the counter numbers)
// A wizard's Attack: 2 for the brutes (the app's atk 5+), 1 for everyone else; tabletop.json's "atk" overrides
const tableAtk=(c,t)=>t.atk!=null?t.atk:((c.phys&&c.phys.atk)||4)>=5?2:1;
function load(chars,tt,fighters){
  CHARS={};
  Object.keys(tt).forEach(k=>{
    if(k.startsWith('_')||!chars[k]) return;
    const c=chars[k], t=tt[k];
    CHARS[k]={key:k, name:c.name, title:c.title, col:c.col, sealAll:!!c.sealAll, sealCostMod:c.sealCostMod||0,
      hp:Math.min(RULES.maxHp,t.hp), baseHp:Math.min(RULES.maxHp,t.hp), alt:t.rules||{},
      atk:tableAtk(c,t), skin:t.skin||null,
      deathless:t.deathless||0, forbidden:(t.forbidden||c.forbidden||[]).map(e=>e==='physical'?'earth':e).filter(e=>ELEMENTS.includes(e)),
      spells:t.spells||[]};
  });
  // Non-wizard fighters (fighters.json, "tabletop" numbers): Actions only, one trait each
  FIGHTERS={};
  Object.keys(fighters||{}).forEach(k=>{
    const f=fighters[k], t=f.tabletop||{};
    FIGHTERS[k]={key:k, name:f.name, title:f.title, col:f.col, fighter:true, trait:f.trait, hp:t.hp||8, baseHp:t.hp||8,
      atk:t.atk||1, baseAtk:t.atk||1, alt:t.rules||{}, skin:null, deathless:0, forbidden:ELEMENTS.slice(), spells:[]};
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
// A table of seats p1, p2, … : list [{key, c?, team?}]. With no team every seat is its own side.
function newTable(list){
  const seat=(c,k,w)=>({w, key:k, c, hp:c.hp, mana:c.fighter?0:RULES.startMana, ward:null, wardInner:[],
    wardStats:{raised:0, boosted:0, layered:0, sealed:0, sealsBroken:0}, effects:[],
    medRound:-9, potted:0, catCounts:{}, lostLast:0, hpAtStart:0, used:{}, meditated:false, stance:'guard'});
  gs={round:1, seats:[], table:0, over:null, log:[], acts:{}};
  list.forEach((x,i)=>{ const w='p'+(i+1); gs[w]=seat(x.c||CHARS[x.key],x.key,w); gs[w].team=x.team||w; gs.seats.push(w); });
  return gs;
}
function newGame(k1,k2){ return newTable([{key:k1},{key:k2}]); }
const active=()=>gs.seats.filter(w=>!gs[w].out);
const foes=w=>active().filter(x=>gs[x].team!==gs[w].team);
// The foe to aim at by default: the only one in a duel; in an encounter the weakest
const foe=w=>{ const f=foes(w); return f.length?f.reduce((a,b)=>gs[a].hp<=gs[b].hp?a:b):null; };
// The target of a pick: its own target if still standing, else the default foe
function tgtOf(w,a){ const t=a&&a.target; return t&&gs[t]&&!gs[t].out&&gs[t].team!==gs[w].team?t:foe(w); }
const isFighter=w=>!!gs[w].c.fighter;
const traitOf=w=>gs[w].c.trait||null;
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
  if(a.act) return a.act!=='guard';
  if(a.skin) return false;
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
  if(a.cat==='meditate'||a.cat==='pass'||a.act) return 0;
  if(a.skin) return skinOf(st).cost;
  const sp=a.sig&&sigById(st,a.sig);
  let c=sp?sp.cost:isSeal(a)?sealCost(st):a.self?RULES.cleanseCost[a.ring-1]:RULES.cats[a.cat].cost[a.ring-1];
  if(!sp) c=Math.max(1,c);
  c+=fx(st,'spellbind').filter(e=>e.cat===a.cat).reduce((s,e)=>s+e.extra,0);
  return c;
}
function ringOf(st,a){ const sp=a.sig&&sigById(st,a.sig); return sp?sp.ring:a.skin?1:a.ring; }
// Ironskin (or a character's own skin card): a Lesser flick, soaks blows until used up or dispelled
const skinOf=st=>Object.assign({},RULES.skin,st.c.skin||{});
const skinOn=st=>st.effects.find(e=>e.type==='skin');
// This round's Actions (gs.acts): who Guards, who Grapples whom
const actOf=w=>gs.acts&&gs.acts[w];
const guarding=w=>{ const a=actOf(w); return !!a&&a.act==='guard'; };
// Bodies: soak minions. Guarding ones stand in front of their master (stances), else (Beginner) all of them
const bodies=st=>st.effects.filter(e=>e.type==='minion'&&e.soak);
const stancesOn=()=>!!(RULES.minions&&RULES.minions.stances);
function screen(st){ const b=bodies(st); return !stancesOn()?b:b.filter(m=>st.stance==='guard'||!m.dmg); }
function biters(st){ return minions(st).filter(m=>m.dmg&&(!stancesOn()||!m.soak||st.stance==='attack')); }

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
    for(let i=0;i<n;i++) st.effects.push(Object.assign({from:gs.round, by:from, uid:++gs.uid||(gs.uid=1)},eff,eff.soak?{hp:eff.soak===true?1:eff.soak}:{}));
    return true;
  }
  st.effects=st.effects.filter(e=>e.id!==eff.id);
  st.effects.push(Object.assign({from:gs.round, by:from},eff,eff.type==='vanish'?{until:gs.round+1}:{}));
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
// kind: 'physical' for blows (Attacks, minion bites, physical cards): wards don't stop them, a skin soaks them
function incoming(who,dmg,adj,own,blast,elem,kind){
  const st=gs[who];
  if(dmg<=0) return 0;
  // Soak minions (skeletons) stand in front of the ward, oldest first: each soaks damage up to its HP
  // (1 for a plain skeleton, so every point kills one) and falls when its HP runs out. Braced (a guarding
  // stance): each wink of a body's HP stops `brace` damage
  const wall=screen(st), brace=stancesOn()?(RULES.minions.brace||1):1;
  if(wall.length){
    const dead=[];
    for(const m of wall){
      if(dmg<=0) break;
      const d=Math.min(dmg,m.hp*brace);
      m.hp-=Math.ceil(d/brace); dmg-=d;
      if(m.hp<=0) dead.push(m);
    }
    st.effects=st.effects.filter(e=>!dead.includes(e));
    if(!own) titheFor(who,dead.length);
    if(dmg<=0) return 0;
  }
  if(kind==='physical'){
    const sk=skinOn(st);
    if(sk){ const d=Math.min(dmg,sk.hp); sk.hp-=d; dmg-=d; if(sk.hp<=0) removeEffects(who,[sk]); }
    loseHp(who,dmg);
    return dmg;
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
function wardAdj(st,elem){ return st.ward&&elem&&opposite(st.ward.elem)===elem?RULES.wardMatch:0; }
// Soul Tithe: whoever killed the bodies loses mana for each, if cursed with it by their owner
function titheFor(who,n){
  const k=gs.src&&gs.src!==who?gs.src:foe(who);
  if(n&&k) fx(gs[k],'tithe').forEach(e=>loseMana(k,n*e.n));
}
// A strike, Attack or Grapple aimed at one body (minions.target): it hits that body alone, no ward,
// no riders. False when the body is gone (the hit goes to its master instead).
function hitBody(who,t,uid,d){
  const ts=gs[t], m=uid!=null&&ts.effects.find(e=>e.uid===uid&&e.type==='minion'&&e.soak);
  if(!m) return false;
  m.hp-=d;
  if(m.hp<=0){ removeEffects(t,[m]); titheFor(t,1); }
  return true;
}

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
  if(a.skin){ const k=skinOf(st); addEffect(who,{id:'skin', type:'skin', kind:'buff', name:k.name, hp:k.soak},who); return; }
  if(!sp){ raiseWard(who,a.elem,RULES.cats.protect.power[a.ring-1]); return; }
  if(sp.kind==='ward'){
    let hp=sp.ward+(sp.perSkeleton||0)*minions(st,'skeleton').length;
    raiseWard(who,sp.elem,hp,sp.retaliate);
    if(sp.holdWear){ const l=st.ward&&st.ward.elem===sp.elem?st.ward:st.wardInner.find(x=>x.elem===sp.elem); if(l) l.hold=true; }
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
// A strike at w misses: Vanish, then Foresight (used up), then dodge rolls
function strikeMisses(w){
  const ts=gs[w];
  if(vanishOf(ts)) return true;   // not used up
  const abs=fx(ts,'absorbNext')[0];
  if(abs){ removeEffects(w,[abs]); return true; }
  return fx(ts,'dodge').some(e=>rolls(e.roll));
}
function hitAdjust(ts,dmg,kind){
  dmg+=fx(ts,'vuln').reduce((s,e)=>s+e.n,0);
  const res=fx(ts,'resist').filter(e=>!(e.physOnly&&kind!=='physical')&&!(e.magicOnly&&kind==='physical')).reduce((s,e)=>s+e.n,0);
  return res?Math.max(1,dmg-res):dmg;
}
// Vanish (Ponder): this round and the next, every strike at him misses (minions' too) and curses find
// nothing. Picking Damage reveals him (playRound); a dispel only removes it (doDispel).
const vanishOf=st=>st.effects.find(e=>e.type==='vanish');
function doDispel(who,a){
  const st=gs[who], t=tgtOf(who,a), ts=gs[t], sp=a.sig&&sigById(st,a.sig);
  if(a.self){   // Cleanse: the worst curses first (a player picks which)
    const list=curses(st).sort((x,y)=>curseHarm(y)-curseHarm(x)).slice(0,RULES.cleanseCount[a.ring-1]);
    removeEffects(who,list); return;
  }
  if(sp){
    if(sp.kind==='instant'){ if(!sp.quick) doInstant(who,sp); return; }
    // A curse: it can't find a Vanished wizard
    if(RULES.strikes.vanishCurses&&vanishOf(ts)){ log(sp.name+' finds nothing: '+ts.key+' has Vanished'); return; }
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
  // Vanish works like a seal: the dispel only removes it, and the ward and other buffs stay
  const veil=RULES.strikes.vanishDispel&&vanishOf(ts);
  if(veil){ removeEffects(t,[veil]); return; }
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
  let tgt=tgtOf(who,a);
  const bew=fx(st,'bewitch')[0];
  if(bew){ removeEffects(who,[bew]); tgt=who; }
  const ts=gs[tgt];
  const elem=sp?sp.elem:a.elem, kind=sp&&sp.dmgKind==='physical'?'physical':'magic';
  gs.src=who;
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
  if(tgt===who){ incoming(who,dmg,0,true,0,elem,kind); return; }
  // Aimed at one body: it takes the hit alone
  if(a.minion!=null&&RULES.minions.target&&hitBody(who,tgt,a.minion,dmg)) return;
  // A Guard this round blocks a blow (no counter: only an Attack is countered)
  if(kind==='physical'&&guarding(tgt)) return;
  // Misses
  if(strikeMisses(tgt)) return;
  dmg=hitAdjust(ts,dmg,kind);
  // Shield Wall: a guarding soldier's shield halves a spell
  if(kind!=='physical'&&guarding(tgt)&&ts.c.trait==='shieldwall') dmg=Math.floor(dmg/2);
  const retaliate=fx(ts,'resist').concat(fx(ts,'counter')).reduce((s,e)=>s+(e.retaliate||0),0)+(ts.ward&&kind!=='physical'?ts.ward.ret:0);
  const hp=incoming(tgt,dmg,0,false,pierce?dmg:sp&&sp.blast,elem,kind);
  if(hp>0){
    if(sp&&sp.lifesteal) heal(who,Math.floor(hp/2));
    if(sp&&sp.dot) addEffect(tgt,{id:sp.id+'-dot', type:'dot', kind:'curse', name:sp.name, dmg:sp.dot.dmg, bypassWard:sp.dot.bypassWard, dmgKind:sp.dmgKind},who);
    if(sp&&sp.chill) addEffect(tgt,{id:'chill', type:'lock', kind:'curse', name:'Chilled', cat:'damage'},who);
  }
  // Mana burn lands whether or not the ward held
  burn+=sp&&sp.manaburn||0;
  loseMana(tgt,burn);
  if(sp&&sp.arc&&rolls(sp.arc.roll)) incoming(tgt,sp.arc.dmg,0,false,0,elem);
  if(retaliate) loseHp(who,retaliate);
}
// ── Actions ────────────────────────────────────────────────
// Free, no winks, this round only. They answer each other through gs.acts (everyone's Action this round).
function doAction(who,a){
  if(a.act==='guard') return;   // read by the others' Attacks, Grapples and blows
  const st=gs[who], t=tgtOf(who,a);
  if(!t) return;
  const ts=gs[t], ta=actOf(t), atk=st.c.atk, atMe=ta&&tgtOf(t,ta)===who;
  gs.src=who;
  if(a.act==='grapple'){
    if(ta&&ta.act==='attack'&&atMe) return;                 // caught mid-grapple: it fails
    const d=guarding(t)?atk:Math.floor(atk/2);
    if(a.minion!=null&&RULES.minions.target&&hitBody(who,t,a.minion,d)) return;
    if(vanishOf(ts)||ts.c.trait==='ranged') return;          // nothing to hold / she keeps her distance
    if(d>0) incoming(t,d,0,false,0,null,'physical');
    return;
  }
  // Attack (an archer's is a bow shot: it slips past a Guard)
  if(a.minion!=null&&RULES.minions.target&&hitBody(who,t,a.minion,atk)) return;
  if(guarding(t)&&st.c.trait!=='ranged'){ gs.src=t; incoming(who,ts.c.atk,0,false,0,null,'physical'); return; }   // blocked and countered
  if(strikeMisses(t)) return;
  const d=hitAdjust(ts,atk+(ta&&ta.act==='grapple'&&atMe?1:0),'physical');
  incoming(t,d,0,false,0,null,'physical');
}
// ── A round ────────────────────────────────────────────────
// picks: {p1:action, p2:action}. action: {cat:'damage'|'protect'|'dispel', elem, ring} or
// {cat, sig:'spellId'} or {cat:'dispel', self:true, ring:1} (cleanse) or {cat:'meditate'} / {cat:'pass'}.
// flicks (optional, for real play): {p1:{cast:true|false, missed:n}, ...} the tiddlywink results
// (Beginner and Normal rules: {p1:{cast:bool}});
// otherwise they are rolled from RULES.pot. squops (optional): {p1:winks squopped, ...}; otherwise
// rolled from RULES.squop.
function playRound(picks,flicks,squops){
  const W=active();
  W.forEach(w=>{ gs[w].hpAtStart=gs[w].hp; gs[w].meditated=false; gs[w].potted=0; if(!picks[w]) picks[w]={cat:'pass'}; });
  gs.acts={}; W.forEach(w=>{ if(picks[w].act) gs.acts[w]=picks[w]; });
  // Stances (free): a pick may carry the seat's stance for its bodies this round
  W.forEach(w=>{ if(picks[w].stance) gs[w].stance=picks[w].stance; });
  const outcome={};
  // Quick spells (Mana Siphon) are paid and steal before anyone else pays
  const quick=w=>{ const sp=picks[w].sig&&sigById(gs[w],picks[w].sig); return !!(sp&&sp.quick); };
  const order=W.filter(quick).concat(W.filter(w=>!quick(w)));
  order.forEach(w=>{
    outcome[w]=pay(w,picks[w],flicks&&flicks[w]);
    if(outcome[w]==='cast'&&quick(w)){
      const t=tgtOf(w,picks[w]), sp=sigById(gs[w],picks[w].sig), n=Math.min(sp.action.n,gs[t].mana);
      loseMana(t,n); gainMana(w,n);
    }
    if(picks[w].cat!=='meditate'&&picks[w].cat!=='pass') gs[w].lastPick={act:picks[w].act||null, cat:picks[w].cat, target:aimsAtFoe(gs[w],picks[w])?tgtOf(w,picks[w]):null};
    if(aimsAtFoe(gs[w],picks[w])) gs[w].lastTarget=tgtOf(w,picks[w]);
  });
  // No striking from hiding: picking Damage reveals a Vanished wizard for the whole round
  W.forEach(w=>{ if(picks[w].cat==='damage'){ const v=vanishOf(gs[w]); if(v) removeEffects(w,[v]); } });
  // Stages: every Protection, then every Dispel, then every Damage, then Meditate
  for(const cat of ['protect','dispel','damage']){
    const seats=W.filter(w=>outcome[w]==='cast'&&picks[w].cat===cat);
    if(rng()<0.5) seats.reverse();
    seats.forEach(w=>{
      if(gs.over||gs[w].out||inGate(w)) return;                         // he's gone through the Gate
      if(aimsAtFoe(gs[w],picks[w])&&inGate(tgtOf(w,picks[w]))&&!fx(gs[w],'bewitch').length) return;   // into the Gate: fizzles
      if(picks[w].act) doAction(w,picks[w]);
      else (cat==='protect'?doProtect:cat==='dispel'?doDispel:doDamage)(w,picks[w]);
      checkOver();
    });
    if(checkOver()) return outcome;
  }
  W.forEach(w=>{ if(picks[w].cat==='meditate'&&outcome[w]==='cast'&&!gs[w].out) gainMana(w,Math.max(0,RULES.meditate-incomeDrain(gs[w]))); });
  squopPhase(squops);
  endRound();
  return outcome;
}
// Squops: the wizards take turns, RULES.squops attempts each, at any missed winks on the table.
// given (real play): {p1:winks squopped, p2:...}.
function squopPhase(given){
  const W=active().filter(w=>!isFighter(w));
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
  if(a.act) return 'cast';   // an Action just goes off
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
      loseMana(w,cost); if(ent.by&&gs[ent.by]) gainMana(ent.by,steal);
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
  const W=active();
  // Ticks: curses on you, then your buffs (regen) and minions
  W.forEach(w=>{
    const st=gs[w];
    if(st.out) return;
    // Minions bite their master's last target (or the default foe)
    const f=st.lastTarget&&gs[st.lastTarget]&&!gs[st.lastTarget].out?st.lastTarget:foe(w);
    if(inGate(w)){ fx(st,'regen').forEach(e=>heal(w,e.heal)); return; }   // nothing reaches him in the Gate
    fx(st,'dot').forEach(e=>{
      const n=e.ramp?e.ramp[Math.min(e.ramp.length-1,e.step++)]:e.dmg;
      gs.src=e.by;
      if(e.bypassWard) loseHp(w,n); else incoming(w,n,0,false,0,null,e.dmgKind);
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
    // A totem doesn't strike; nothing reaches him in the Gate. Each minion's strike is a strike (RULES.strikes)
    // Bites are blows: wards don't stop them, a Guard (this round) or a skin does
    if(f&&!inGate(f)) biters(st).forEach(m=>{
      if(gs[f].hp<=0) return;
      const d=m.dmg+(m.minion==='skeleton'?danse:0);
      gs.src=w;
      if(guarding(f)) return;
      if(!RULES.strikes.minions){ incoming(f,d,0,false,0,null,'physical'); return; }
      if(strikeMisses(f)) return;
      incoming(f,hitAdjust(gs[f],d,'physical'),0,false,0,null,'physical');
    });
  });
  // Sudden death
  const sd=RULES.suddenDeath;
  if(sd&&gs.round>=sd.round){
    const n=sd.dmg+Math.floor((gs.round-sd.round)/sd.every);
    W.forEach(w=>{ if(!inGate(w)&&!isFighter(w)) loseHp(w,n); });
  }
  if(checkOver()) return;
  // Vanish lasts this round and the next
  W.forEach(w=>{ const v=vanishOf(gs[w]); if(v&&v.until<=gs.round) removeEffects(w,[v]); });
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
      st.wardInner=st.wardInner.filter(l=>l.sealed||l.hold||(l.hp-=RULES.wardWear)>0);
      if(!st.ward.sealed&&!st.ward.hold){ st.ward.hp-=RULES.wardWear; if(st.ward.hp<=0) dropOuterWard(st); }
    }
    // Timed enchantments run down
    // Buffs and curses have no timers: they last until a Dispel or Cleanse removes them, or (for
    // "next strike" / "next pick" effects) until used. A lock lasts for the one round it blocks.
    st.effects=st.effects.filter(e=>!(e.type==='lock'&&e.from<gs.round));
    if(!isFighter(w)) gainMana(w,Math.max(0,RULES.income-incomeDrain(st)));
    // Skin upkeep: pay it or the skin fades (worth it against blows, not against a wizard who casts)
    const sk=skinOn(st), up=RULES.skin.upkeep||0;
    if(sk&&up){ if(st.mana>=up) st.mana-=up; else removeEffects(w,[sk]); }
    st.lostLast=Math.max(0,st.hpAtStart-st.hp);
  });
  gs.round++;
}
// A seat at 0 HP is out; the game is over when one side (or none) is left. gs.over: the winning team
// ('p1' / 'p2' in a duel, 'A' / 'B' in an encounter) or 'draw'.
function checkOver(){
  if(gs.over) return true;
  active().forEach(w=>{ if(gs[w].hp<=0) gs[w].out=true; });
  const teams=[...new Set(active().map(w=>gs[w].team))];
  if(teams.length<=1&&gs.seats.some(w=>gs[w].out)) gs.over=teams[0]||'draw';
  return !!gs.over;
}

// ── AI ─────────────────────────────────────────────────────
// A plain heuristic player, like the standard game's Normal AI: smart = 'normal', otherwise 'easy'.
function canPick(st,a){
  if(a.cat==='meditate') return !st.c.fighter&&canMeditate(st);
  if(a.cat==='pass') return true;
  if(locked(st,a.cat)) return false;
  if(a.act) return true;
  if(st.c.fighter) return false;
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
    if(RULES.strikes.vanishCurses&&vanishOf(ts)) return false;   // it would only use up the Vanish
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
  if(e.type==='vanish') return !vanishOf(st);
  if(e.type==='absorbNext'||e.type==='dodge') return !fx(st,'absorbNext').length;
  if(e.type==='gate') return !st.effects.some(f=>f.pierce)&&ts.mana>=costOf(ts,{cat:'damage',ring:1});
  if(sp.pctHp) return Math.floor(ts.hp/sp.pctHp.div)>=sp.pctHp.min||ts.hp<=sp.pctHp.min+1;
  return true;
}
const guardSpell=st=>st.c.spells.find(s=>s.effect&&s.effect.type==='minion'&&s.effect.soak);
const guards=st=>st.effects.filter(e=>e.type==='minion'&&e.soak).length;
// Screen running thin: at or below half the card's max (Valdris: 2 of 5; Daveron's graveguard: 1 of 3)
const guardLow=st=>{ const g=guardSpell(st); return !!g&&guards(st)<=Math.floor(g.effect.max/2); };
// The AI's pick, with its target (the default foe) and its bodies' stance filled in
function aiChoose(w,level){
  const smart=level!=='easy';
  const a=isFighter(w)?fighterChoose(w,smart):aiChooseCore(w,level);
  if(!a.target&&aimsAtFoe(gs[w],a)) a.target=foe(w);
  if(!isFighter(w)){ const sc=aiStance(w,smart); if(sc) a.stance=sc; }
  aiAimAtBody(w,a,smart);
  return a;
}
// Physical threat from a foe: fighters are all blows; else their Attack, physical cards and biting minions
function physThreat(f){
  const st=gs[f];
  if(st.c.fighter) return 0.9;
  let t=0.05+st.c.atk*0.1;
  if(st.c.spells.some(sp=>sp.dmgKind==='physical'||(sp.effect&&sp.effect.type==='minion'&&sp.effect.dmg))) t+=0.25;
  t+=0.15*minions(st).filter(m=>m.dmg).length;
  return Math.min(0.9,t);
}
const allBlows=w=>foes(w).length>0&&foes(w).every(isFighter);
// Bodies guard when hurt or facing a big strike, else bite (AI_MINIONS); a totem only guards
const AI_MINIONS={guardBase:.25, guardHurt:.4, guardThreat:.25, targetKill:.6};
function aiStance(w,smart){
  const st=gs[w];
  if(!stancesOn()||!bodies(st).some(m=>m.dmg)) return null;
  let p=AI_MINIONS.guardBase;
  if(st.hp<st.c.hp*.45) p+=AI_MINIONS.guardHurt;
  if(foes(w).some(f=>!isFighter(f)&&gs[f].mana>=RULES.cats.damage.cost[2])||allBlows(w)) p+=AI_MINIONS.guardThreat;
  if(!smart) p=.5;
  return rng()<p?'guard':'attack';
}
// Aim a strike or Attack at a biting body the hit would kill
function aiAimAtBody(w,a,smart){
  if(!RULES.minions.target||!a.target||!(a.cat==='damage')||!smart||rng()>AI_MINIONS.targetKill) return;
  const ts=gs[a.target];
  if(!stancesOn()||ts.stance!=='attack') return;
  const sp=a.sig&&sigById(gs[w],a.sig);
  const d=a.act==='attack'?gs[w].c.atk:sp?(sp.dmg||0):RULES.cats.damage.power[(a.ring||1)-1];
  const prey=bodies(ts).filter(m=>m.dmg&&m.hp<=d).sort((x,y)=>y.dmg-x.dmg)[0];
  if(prey) a.minion=prey.uid;
}
// Fighters: mostly Attack; Guard a foe who Attacked me; a soldier Guards when he was aimed at; Grapple a
// habitual guard (an archer never Grapples)
const AI_FIGHTERS={attack:.72, guardRead:.5, guardFocus:.35, grappleRead:.5, grapple:.08, guard:.08};
function fighterChoose(w,smart){
  const tgt=foe(w), last=(tgt&&gs[tgt].lastPick)||{}, A=AI_FIGHTERS, tr=traitOf(w);
  const act=(c,x)=>({cat:c, act:x, target:tgt});
  let guard=A.guard, grapple=tr==='ranged'?0:A.grapple;
  if(smart){
    if(last.act==='attack'&&last.target===w) guard+=A.guardRead;
    if(tr==='shieldwall'&&tgt&&gs[tgt].lastTarget===w) guard+=A.guardFocus;
    if(tr!=='ranged'&&last.act==='guard') grapple+=A.grappleRead;
  }
  if(locked(gs[w],'damage')) return act('protect','guard');
  const r=rng()*(A.attack+guard+grapple);
  return r<A.attack?act('damage','attack'):r<A.attack+guard?act('protect','guard'):act('dispel','grapple');
}
// The wizard's Actions and Ironskin, read from the foe's last pick (like the app's aiPhysAction)
const AI_ACTIONS={attackBase:0.08, attackOpen:0.25, guardBase:0.04, guardRead:0.45, guardBroke:0.3,
  grappleBase:0.03, grappleRead:0.5, skinThreat:0.6, skinCast:0.6, skinWeight:0.5};
function aiPhys(w,cat,smart){
  const st=gs[w], t=foe(w), ts=gs[t], last=ts.lastPick||{}, A=AI_ACTIONS;
  const act=x=>({cat, act:x, target:t});
  const broke=!ts.c.fighter&&ts.mana<costOf(ts,{cat:'damage',ring:1});
  if(cat==='damage'){
    if(vanishOf(st)||vanishOf(ts)) return null;
    if(!canPick(st,{cat,elem:ELEMENTS.find(e=>!st.c.forbidden.includes(e)),ring:1})) return act('attack');
    let p=A.attackBase;
    if(ts.ward&&!skinOn(ts)) p+=A.attackOpen;
    if(skinOn(ts)) p*=0.5;
    if(last.act==='guard') p*=0.3;
    if(last.act==='grapple') p+=0.2;
    if(!smart) p*=0.6;
    return rng()<p?act('attack'):null;
  }
  if(cat==='protect'){
    const sk=skinOn(st), want=!sk||sk.hp<skinOf(st).soak*0.4;
    if(want&&canPick(st,{cat,skin:true})&&physThreat(t)>=A.skinThreat&&rng()<(smart?A.skinCast:A.skinCast*0.5)) return {cat,skin:true};
    let p=A.guardBase;
    if(last.act==='attack'&&last.target===w&&traitOf(t)!=='ranged') p+=A.guardRead;
    if(broke) p+=A.guardBroke;
    if(!smart) p*=0.5;
    return rng()<p?act('guard'):null;
  }
  if(cat==='dispel'){
    let p=A.grappleBase;
    if(last.act==='guard'&&traitOf(t)!=='ranged') p+=A.grappleRead;
    if(!canPick(st,{cat,self:true,ring:1})) p=Math.max(p,0.4);
    if(!smart) p*=0.6;
    return rng()<p?act('grapple'):null;
  }
  return null;
}
// An encounter (every foe a fighter): wards and seals are wasted on blows, so keep a skin up, Guard a
// swordsman who just Attacked me, and strike
const AI_ENCOUNTER={skin:1.4, protect:0.35, guardRead:0.6};
function aiEncounterProtect(w,smart){
  const st=gs[w], sk=skinOn(st);
  if((!sk||sk.hp<skinOf(st).soak*0.5)&&canPick(st,{cat:'protect',skin:true})) return {cat:'protect',skin:true};
  const melee=foes(w).filter(f=>traitOf(f)!=='ranged'&&(gs[f].lastPick||{}).act==='attack'&&gs[f].lastPick.target===w);
  if(melee.length&&rng()<AI_ENCOUNTER.guardRead) return {cat:'protect',act:'guard'};
  const sigs=st.c.spells.filter(sp=>sp.cat==='protect'&&sp.kind!=='ward'&&!sp.ward&&canPick(st,{cat:'protect',sig:sp.id})&&sigSensible(w,sp));
  if(sigs.length&&rng()<0.5) return {cat:'protect',sig:sigs[Math.floor(rng()*sigs.length)].id};
  return {cat:'protect',act:'guard'};
}
function aiChooseCore(w,level){
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
  // A Vanished foe: strikes only miss, so dispel the Vanish or do something else
  if(vanishOf(ts)){ w8.damage*=smart?0.2:0.6; w8.dispel+=smart?0.6:0.2; }
  // Vanished myself: a strike reveals me, so hold off, except in its last round (a foe facing a Vanish
  // rarely picks a strike, so the reveal seldom costs anything then)
  const veil=vanishOf(st);
  if(veil&&smart&&veil.until<=gs.round) w8.damage+=0.8;
  else if(veil){ w8.damage*=smart?0.3:0.7; w8.dispel+=smart?0.4:0.1; }
  if(canSeal(st)&&st.ward.hp>=AI_WARDS.sealHp&&!locked(st,'protect')){
    w8.seal=AI_WARDS.seal*(smart?1:0.5);
    if(smart&&wardLayers(st)>1) w8.seal+=0.3;
    if(smart&&st.hp<st.c.hp*0.5) w8.seal+=0.3;
  }
  if(smart&&allBlows(w)){
    const sk=skinOn(st);
    delete w8.seal;
    w8.protect=(!sk||sk.hp<skinOf(st).soak*0.5)?AI_ENCOUNTER.skin:AI_ENCOUNTER.protect;
    if(guardLow(st)) w8.protect+=1.2;
    if(st.hp<st.c.hp*0.35) w8.protect+=0.3;
    w8.dispel=nCurses?0.5:hexes?0.25*hexes:0;
  } else if(smart&&!skinOn(st)&&physThreat(foe(w))>=AI_ACTIONS.skinThreat) w8.protect+=AI_ACTIONS.skinWeight;
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
  if(cat==='protect'&&smart&&allBlows(w)&&!(guardLow(st)&&guardSpell(st))) return aiEncounterProtect(w,smart);
  if(!(cat==='dispel'&&curses(st).length)){ const pa=aiPhys(w,cat,smart); if(pa) return pa; }
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
  if(smart&&ts.ward&&(cat==='dispel'||cat==='damage')&&elems.includes(opposite(ts.ward.elem))&&rng()<0.8) elem=opposite(ts.ward.elem);
  if(cat==='protect'&&smart){
    const safe=elems.filter(e=>ts.c.forbidden.includes(opposite(e)));
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
    ['p1','p2'].forEach(w=>{ const k=a[w].act||(a[w].skin?'skin':null)||a[w].sig||(a[w].self?(a[w].cat==='protect'?'seal':'cleanse'):a[w].cat); picks[w][k]=(picks[w][k]||0)+1; });
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

// ── Encounters: one wizard (team A) against a band of fighters (team B) ──
// A fighter's HP and Attack come from fighters.json ("tabletop", with per-rule-set "rules"); a band can set
// its fighters' HP per rule set (hp) or scale them. Tuned so an average wizard wins about half the time
// against each band with the Normal AI (encounterBalance). Archers have 1 HP in Beginner and Normal: three
// archers chip a wizard who fizzles half their flicks down fast, so one hit drops each.
const BANDS=[
  {id:'patrol', name:'Patrol', members:['soldier','soldier'], scale:1},
  {id:'skirmish', name:'Skirmishers', members:['archer','archer','archer'], scale:1},
  {id:'warband', name:'Warband', members:['soldier','archer','archer'], scale:1,
    hp:{beginner:{soldier:4}, normal:{soldier:4}, advanced:{soldier:6, archer:7}}},
];
function bandSeats(wizKey,band){
  return [{key:wizKey,team:'A'}].concat(band.members.map(k=>{
    const f=FIGHTERS[k];
    // band.hp[rule set][fighter] sets a fighter's HP in this band; otherwise its own HP × scale
    const set=band.hp&&band.hp[rulesName]&&band.hp[rulesName][k];
    const sc=typeof band.scale==='object'?(band.scale[rulesName]||1):(band.scale||1);
    return {key:k, team:'B', c:Object.assign({},f,{hp:set!=null?set:Math.max(1,Math.round(f.hp*sc))})};
  }));
}
function encounter(wizKey,bandId,ai){
  const band=BANDS.find(b=>b.id===bandId);
  newTable(bandSeats(wizKey,band));
  const picks={};
  while(!gs.over&&gs.round<=RULES.maxRounds){
    const a={};
    active().forEach(w=>{ a[w]=aiChoose(w,ai); });
    const k=a.p1&&(a.p1.act||(a.p1.skin?'skin':null)||a.p1.sig||a.p1.cat);
    if(k) picks[k]=(picks[k]||0)+1;
    playRound(a);
  }
  return {won:gs.over==='A', rounds:gs.round, picks};
}
// Every wizard against a band, `games` each: {band:{winRate, rounds, per:{key:rate}, picks}}
function encounterBalance(games,ai,bandIds){
  const out={};
  (bandIds||BANDS.map(b=>b.id)).forEach(id=>{
    let won=0, n=0, rounds=0; const per={}, picks={};
    Object.keys(CHARS).forEach(k=>{
      let w=0;
      for(let g=0;g<games;g++){ const r=encounter(k,id,ai||'normal'); if(r.won) w++; rounds+=r.rounds; Object.entries(r.picks).forEach(([x,c])=>picks[x]=(picks[x]||0)+c); }
      per[k]=+(w/games*100).toFixed(0); won+=w; n+=games;
    });
    out[id]={winRate:+(won/n*100).toFixed(1), rounds:+(rounds/n).toFixed(1), per, picks};
  });
  return out;
}

useRules('normal');

const TT={RULES, PRESETS, RULE_SETS, useRules, rulesOf, AI_WARDS, AI_FIGHTERS, AI_ACTIONS, AI_MINIONS, AI_ENCOUNTER, BANDS,
  get rulesName(){ return rulesName; }, ELEMENTS, opposite, load, newGame, newTable, playRound, aiChoose, simMatch, balance,
  encounter, encounterBalance, get chars(){ return CHARS; }, get fighters(){ return FIGHTERS; }, get state(){ return gs; }, setRng(f){ rng=f||Math.random; }};
if(typeof module!=='undefined'&&module.exports) module.exports=TT;
else root.TT=TT;
})(typeof window!=='undefined'?window:this);
