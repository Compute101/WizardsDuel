// ── ARCHIVE: CLASSIC RULES SPELL CODE ──────────────────────
// NOT LOADED BY THE GAME. This is the per-character spell code from the original "Classic" rules
// (removed when the game moved to Damage / Protection / Dispel), kept as a reference.
//
// Its visual effects have been ported into the VFX LIBRARY section of js/game.js (SPELL_VFX,
// VFX, ELEM_IMPACT_VFX, TICK_VFX, MINION_VFX), which the current rules play. Look here when you
// want an effect in its original context — e.g. how Frenzy chained three lunging hits, how
// Rockfall timed its boulders, or the original Classic numbers and AI heuristics.
//
// It references Classic-only state (gs.p1.burn, casterCfg.chargeDmg, …) and won't run as-is.

const SPELLS=[
  {name:'Inferno',        element:'fire',      icon:'🔥', dmg:38, cost:12, col:'#ff6622',
   effectLabel:'Burns 5 dmg × 2 rounds', area:true},
  {name:'Lightning Bolt', element:'lightning', icon:'⚡', dmg:30, cost:9,  col:'#ffee44',
   effectLabel:'Pierces shields fully'},
  {name:'Frost Nova',     element:'ice',       icon:'❄️',  dmg:18, cost:6,  col:'#88ddff',
   effectLabel:'Freezes — skip next turn'},
  {name:'Arcane Surge',   element:'arcane',    icon:'🌀', dmg:0,  cost:9,  col:'#cc88ff',
   effectLabel:'Wild: 15–55 damage'},
  {name:'Dispel',         element:'dispel',    icon:'🌸', dmg:0,  cost:5,  col:'#ffaaff',
   effectLabel:'Choose: cleanse 1 own debuff, or 70% strip one opp buff'},
  {name:'Mana Burn',      element:'manaburn',  icon:'🔮', dmg:0,  cost:8,  col:'#cc44ff',
   effectLabel:'Deal 2× opp mana as dmg; drain 4 mana (pierces shields)'},
];


const CHAR_DISPLAY={
  eldrad:{
    stats:[['❤ HP','115'],['🛡 Shield','60 HP / 10T'],['⚡ Counter','20 reflect / 2M'],['🔰 Ward','Block next status / 3T']],
    flavour:'Outlast your foe with arcane endurance.'
  },
  mal:{
    stats:[['❤ HP','80'],['💪 Empower','+50% / Free'],['🩸 Blood Pact','−22/+15 mana'],['💀 Drain','~20 dmg, heal 45%']],
    flavour:'Strike hard. Strike first. No mercy.'
  },
  sylvara:{
    stats:[['❤ HP','92'],['💚 Regen','+40 HP/10T'],['🌿 Entangle','75% freeze 1-3T'],['🌱 Vine Whip','~10 dmg/turn × 3T']],
    flavour:"Sustain and control with nature's power."
  },
  aurelia:{
    stats:[['❤ HP','90'],['🔮 Foresight','Block next spell'],['⏳ Time Drain','to +2 ch / 5T'],['💨 Haste','25% dodge / 3T']],
    flavour:'Bend time — foresee attacks and drain your foe.'
  },
  gnash:{
    stats:[['❤ HP','105'],['🩸 War Paint','3 mana → 33% resist + reduces self-harm / 5T'],['⚔️ Charge','15 HP (10 w/ War Paint) → 32 pierce all'],['💢 Frenzy','15 HP (10 w/ War Paint) → 3× rapid strikes']],
    flavour:'Blood and bone. No magic — just fury.'
  },
  cinder:{
    stats:[['❤ HP','83'],['🎱 Fireball','18–28 random fire dmg'],['🛡️ Flame Shield','16 fire retaliate / 5T'],['🕯️ Candle','Channel → catch fire / 4T']],
    flavour:'Roll the dice. Fan the flames. Win big or burn together.'
  },
  skadi:{
    stats:[['❤ HP','88'],['🧊 Ice Lance','28 dmg / 35% freeze'],['🛡️ Frost Armor','30% resist + 8 retaliate / 4T'],['🌨️ Blizzard','5 dmg + 3 mana drain / turn × 5T']],
    flavour:'Glacial patience. Frozen fury. Every strike against her has a price.'
  },
  zacharius:{
    stats:[['❤ HP','86'],['🔋 Galvanize','4 mana → 8 charge; discharge on phys hit'],['🌩️ Chain Lightning','24 dmg + 35% arc 10 more (costs 8 charge)'],['💡 Conductivity','+35% dmg taken / 3T']],
    flavour:'Store the storm. Spend it wisely. Let them come to you.'
  },
  mary:{
    stats:[['❤ HP','88'],['💛 Heal','4 mana → instantly restore 40 HP'],['✨ Purge','2 mana → remove all active debuffs'],['☀️ Radiant','3 mana → 12 holy damage']],
    flavour:'Faith is the only shield that never breaks.'
  },
  mordant:{
    stats:[['❤ HP','82'],['💀 Agony','3 mana → 12 dmg on any non-channel action / 5T'],['🔇 Silence','2 mana → 45% spell failure / 5T'],['☠️ Corruption','3 mana → −2 mana per channel / 3T']],
    flavour:'The hex is already written. You just haven\'t felt it yet.'
  },
  ponder:{
    stats:[['❤ HP','85'],['👻 Vanish','Invisible 3T'],['🌀 Siphon','Steal 4 mana'],['💫 Blink','Next hit auto-misses']],
    flavour:"Young but fierce — vanish from sight and plunder your foe's magic."
  },
  durin:{
    stats:[['❤ HP','110'],['🧱 Stoneskin','10 absorb/hit, 30 HP total, 10T'],['💎 Stonesoul','40% magic reduction / 5T'],['⛰️ Rockfall','3×9 phys dmg']],
    flavour:'The mountain endures. Outlast every spell — stone by stone.'
  },
  weizan:{
    stats:[['❤ HP','90'],['🗡️ Conjure Blade','2M → +1 blade (max 3); each deals 4 phys dmg/turn'],['💫 Bladestorm','Free (costs all blades) → 12 phys dmg per blade'],['🧘 Iron Patience','2M → 30% dmg reduction / 3T']],
    flavour:'Build blades slowly. Release all at once. Dispel kills your investment — protect it.'
  },
  gretch:{
    stats:[['❤ HP','85'],['☠️ Plague','3M → 6 dmg/turn×5T; casting while plagued = +8 dmg'],['🪲 Maggot Cloud','2M → drain 3 mana + −3 channel/turn for 3T'],['💀 Bone Totem','3M → 5 HP regen/turn×4T; active totem blocks enemy Purge']],
    flavour:'Infect and drain. The totem heals you — but Dispelling it skips Purge. Choose wisely.'
  },
  valdris:{
    stats:[['❤ HP','82'],['💀 Raise Dead','4M → skeleton: 25 HP shield, 7 phys dmg/turn, heals 8 on death'],['🩸 Necrotic Drain','3M → ~18 dmg + heal 8 HP'],['🔧 Reinforce','2M → restore 15 HP to weakest skeleton']],
    flavour:'Deathless: cannot die while mana > 0 (costs 6 mana). Drain his mana to kill him. Dispel his skeletons — but each dying skeleton heals him.'
  },
  mirel:{
    stats:[['❤ HP','85'],['🪞 Simulacrum','3M → autonomous copy (max 2): 20 HP, 6 mana, casts any spell, 50% redirect'],['🪄 Bewitch','3M → enemy\'s next active spell reflects back on them'],['🗡️ Feint','2M → 15 dmg bypassing all shields and defences']],
    flavour:'Simulacra start with mana and act every turn — destroy them fast or they Dispel your buffs. Bewitch punishes any spell cast while active.'
  },
  thessaly:{
    stats:[['❤ HP','88'],['🌀 Enthral','3M → enemy forced to channel next turn'],['🌟 Arcane Weave','2M → next 3 basic attacks: +6 dmg, drain 2 mana each'],['🔒 Spellbind','3M → one enemy spell costs +3 mana for 5 turns']],
    flavour:'Enthral wastes their turn. Spellbind targets their most expensive spell. Weave turns basic attacks into mana denial.'
  },
  korvath:{
    stats:[['❤ HP','95'],['🐉 Dragon Scales','4M → 33% dmg reduction / 5T; attacker takes 5 fire dmg'],['🌋 Wyrmfire Breath','4M → 16 fire dmg + 5 dmg/turn × 2T burn'],['💥 Ancient Wrath','6M → 35 fire damage. Once per duel.']],
    flavour:'A dragon-bonded sorcerer who endures and burns. Save Ancient Wrath for the killing blow — you only get one.'
  },
  fizzwick:{
    stats:[['❤ HP','80'],['🧪 Caustic Bomb','4M → 10 dmg + poison 5 dmg/turn × 3T'],['⚗️ Volatile Tonic','3M → 50% heal 20 HP, 50% Empowered'],['🧫 Unstable Concoction','5M → random 10-30 dmg']],
    flavour:'A goblin alchemist whose kit is a gamble — Caustic Bomb wears them down, Volatile Tonic patches you up or arms your next hit, and Unstable Concoction can swing wildly either way.'
  },
  nyxara:{
    stats:[['❤ HP','78'],['🌀 Singularity','4M → collapsing rift: 4/8/12 dmg over 3T (24 total)'],['🌑 Gravity Well','4M → 25% of target\'s current HP (min 5)'],['🕳️ Event Horizon','10M → 40% of target\'s current HP (min 10); 6 recoil dmg to self']],
    flavour:'A void sorceress whose damage scales with what remains — Gravity Well and Event Horizon hit hardest early and taper off as HP drops, while Singularity grinds them down over time.'
  }
};


function act(type){
  if(!gs.myTurn||gs.busy) return;
  resizeBC();

  const who=twoPlayerMode?gs.turnPlayer:'p1';
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const cx=who==='p1'?bW*.22:bW*.78;
  const tx=who==='p1'?bW*.78:bW*.22;

  // Commit the action face-down; nothing resolves until every seat has picked.
  const commitAction=action=>commitPick(who,action);

  if(type==='channel'){
    commitAction({type:'channel', channelGain:whoState.timeDrain>0?2:whoCfg.channelAmt});
    return;
  }

  // Enthralled: forced to channel
  if(whoState.enthralled>0){
    addFloat(cx,bH*.33,'🌀 Enthralled!','#cc88ff',13);
    commitAction({type:'channel', channelGain:whoState.timeDrain>0?2:whoCfg.channelAmt});
    return;
  }

  // Universal spell (with puzzle minigame)
  const spell=SPELLS.find(s=>s.element===type);
  if(spell){
    if(whoState.mana<spell.cost) return;
    if(whoState.frenzied>0) return;
    if(whoState.silence>0&&_rng()<0.45){
      commitAction({type, ok:false, silenced:true});
      return;
    }
    const launchers={
      fire:      launchPatternEcho,
      lightning: launchLightningPattern,
      ice:       launchIcePattern,
      arcane:    launchArcanePattern,
      dispel:    launchDispelPattern,
      manaburn:  launchManaBurnPattern,
    };
    const doLaunch=()=>{
      gs.busy=true;
      launchers[type](spell, ok=>{
        commitAction({type, ok, dispelSelf});
      });
    };
    if(type==='dispel'){
      gs.busy=true;
      showDispelTarget(selfTarget=>{ gs.busy=false; dispelSelf=selfTarget; doLaunch(); });
    } else {
      doLaunch();
    }
    return;
  }

  // Character spell
  const charSpell=whoCfg.spells&&whoCfg.spells.find(s=>s.id===type);
  if(charSpell){
    if(whoState.mana<charSpell.cost) return;
    if(charSpellBlocked(type,whoState,whoCfg,oppState)) return;
    if(charSpell.cost>0&&whoState.silence>0&&_rng()<0.45){
      commitAction({type, ok:false, silenced:true});
      return;
    }
    if(BUFF_TILE_GLYPHS[type]){
      gs.busy=true;
      launchBuffTileMatch(charSpell,type,who,(ok,perfect)=>{
        commitAction({type, ok, perfect, isCharSpell:true});
      });
      return;
    }
    commitAction({type, ok:true, isCharSpell:true});
  }
}


function resolveCharSpell(spellId,caster,perfect=false){
  const casterState=caster==='p1'?gs.p1:gs.p2;
  const casterCfg  =caster==='p1'?p1Cfg:p2Cfg;
  const targetState=caster==='p1'?gs.p2:gs.p1;
  const targetCfg  =caster==='p1'?p2Cfg:p1Cfg;
  const cx=caster==='p1'?bW*.22:bW*.78;
  const tx=caster==='p1'?bW*.78:bW*.22;

  const spell=casterCfg.spells.find(s=>s.id===spellId);
  // Apply spellbound extra cost
  if(casterState.spellbound&&casterState.spellbound.spellId===spellId&&casterState.spellbound.turns>0){
    casterState.mana=Math.max(0,casterState.mana-(spell.cost+casterState.spellbound.extraCost));
  } else {
    casterState.mana=Math.max(0,casterState.mana-spell.cost);
  }

  // Plague punish: casting any spell while plagued deals extra damage to caster
  if(casterState.plague>0){
    const pDmg=casterState.plagueSpellDmg||8;
    casterState.hp=Math.max(0,casterState.hp-pDmg);
    addFloat(cx,bH*.33,'☠️ Plague Punish! −'+pDmg,'#55aa33',12);
    spawnParts(cx,bH*.38,'#55aa33',10);
    checkWin(); if(!battleRunning) return;
  }

  // Bewitch: reflect active spells (non-basic) back on caster
  if(casterState.bewitched&&spellId!=='basicattack'){
    casterState.bewitched=false;
    addFloat(cx,bH*.33,'🪄 Bewitched! Reflected!','#b86ef4',14);
    spawnParts(cx,bH*.38,'#b86ef4',20); spawnParts(cx,bH*.38,'#ffffff',8);
    flash('#b86ef4');
    // Refund mana and cancel spell
    casterState.mana=Math.min(MAX_MANA,casterState.mana+spell.cost);
    // Deal a portion of the spell cost as reflected damage (approx)
    const reflectDmg=10+spell.cost*3;
    casterState.hp=Math.max(0,casterState.hp-reflectDmg);
    addFloat(cx,bH*.38,'−'+reflectDmg+' (Reflected!)','#b86ef4',14);
    if(caster==='p1'){anim('p1','hit',800);} else {anim('p2','hit',800);}
    refreshHUD(); checkWin(); if(!battleRunning) return;
    return; // spell does not resolve normally
  }

  if(spellId==='shield'){
    casterState.shield=casterCfg.shieldDuration||10;
    casterState.shieldHp=(casterCfg.shieldMaxHp||60)+(perfect?5:0);
    addFloat(cx,bH*.33,'🛡 Shielded! ('+casterState.shieldHp+' HP)','#4af0ff',12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +5 HP','#ffff88',11);
    anim(caster,'shield',700);
  } else if(spellId==='counter'){
    casterState.counter=true;
    addFloat(cx,bH*.33,'⚡ Counter Ready!','#4af0ff',16);
    spawnParts(cx,bH*.38,'#4af0ff',16); spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='empower'){
    casterState.empowered=true;
    addFloat(cx,bH*.33,'💪 Empowered!',casterCfg.col,12);
    spawnParts(cx,bH*.38,casterCfg.col,10);
    anim(caster,'cast',700);
  } else if(spellId==='bloodpact'){
    casterState.hp=Math.max(1,casterState.hp-casterCfg.bpCost);
    casterState.mana=Math.min(MAX_MANA,casterState.mana+casterCfg.bpGain);
    addFloat(cx,bH*.33,'🩸 -'+casterCfg.bpCost+'HP +'+casterCfg.bpGain+' Mana',casterCfg.col,11);
    for(let i=0;i<8;i++)
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:'#cc1111',
        vx:(_rng()-.5),vy:1.5+_rng()*3,sz:2+_rng()*2,life:1,dec:.02});
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+(-0.6+_rng()*1.2), sp=1.5+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,col:'#8844ff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*2,life:1,dec:.02,noGrav:true});
    }
    anim(caster,'cast',700); refreshHUD();
  } else if(spellId==='heal'){
    casterState.regen={remaining:casterCfg.healAmt,turns:10};
    addFloat(cx,bH*.33,'💚 Regenerating!','#44cc88',14);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-0.8+_rng()*1.6), sp=1+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#44ee88':'#88ffcc',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.014,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='entangle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      if(_rng()<0.75){
        targetState.frozen=Math.floor(_rng()*3)+1;
        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
            vx:Math.cos(a+Math.PI)*.9,vy:Math.sin(a+Math.PI)*.9,sz:2+_rng()*2,life:1,dec:.02});
        }
        spawnParts(tx,bH*.38,'#44cc88',8);
        addFloat(tx,bH*.33,'🌿 Entangled!','#44cc88',13);
      } else {
        for(let i=0;i<8;i++)
          gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:bH*.38-bH*.04,col:'#665522',
            vx:(_rng()-.5)*1.5,vy:_rng()*2,sz:2,life:1,dec:.025});
        addFloat(tx,bH*.33,'🌿 Resisted!','#888866',11);
      }
      anim(caster,'cast',800);
    }
  } else if(spellId==='foresight'){
    casterState.foresight=true;
    addFloat(cx,bH*.33,'🔮 Foresight Active!',casterCfg.col,12);
    spawnParts(cx,bH*.38,casterCfg.col,14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='timedrain'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.timeDrain=casterCfg.timeDrainTurns;
      addFloat(tx,bH*.33,'⏳ Time Drain!',casterCfg.col,12);
      spawnParts(tx,bH*.38,'#cc88ff',12);
      spawnParts(tx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',700);
    }
  } else if(spellId==='vanish'){
    casterState.invisible=3;
    addFloat(cx,bH*.33,'👻 Vanished! (3T)','#b8a0e8',12);
    spawnParts(cx,bH*.38,'#b8a0e8',14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='manasiphon'){
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Absorbed!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      spawnParts(cx,bH*.38,'#b8a0e8',6);
      anim(caster,'cast',600);
    } else if(targetState.shield>0){
      addFloat(tx,bH*.33,'🛡 Shielded!','#4af0ff',12);
      spawnParts(tx,bH*.38,'#4af0ff',10);
      anim(caster,'cast',600);
    } else {
      const steal=Math.min(4,targetState.mana);
      targetState.mana=Math.max(0,targetState.mana-steal);
      casterState.mana=Math.min(MAX_MANA,casterState.mana+steal);
      addFloat(cx,bH*.33,'🌀 +'+steal+' Mana Stolen!','#b8a0e8',13);
      addFloat(tx,bH*.33,'−'+steal+' Mana','#b8a0e8',11);
      spawnParts(tx,bH*.38,'#b8a0e8',14);
      spawnParts(cx,bH*.38,'#b8a0e8',8);
      anim(caster,'cast',700);
      refreshHUD();
    }
  } else if(spellId==='warpaint'){
    casterState.resist=5+(perfect?1:0);
    addFloat(cx,bH*.33,'🩸 War Paint! -33% dmg',casterCfg.col,12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<8;i++)
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.35,col:'#cc1111',
        vx:(_rng()-.5)*1.5,vy:1+_rng()*2.5,sz:2+_rng()*2,life:1,dec:.025});
    spawnParts(cx,bH*.38,casterCfg.col,10);
    anim(caster,'shield',700);
    refreshHUD();
  } else if(spellId==='charge'){
    const chargeSelfCost=casterState.resist>0?Math.round(casterCfg.frenzyHpCost*0.67):casterCfg.frenzyHpCost;
    casterState.hp=Math.max(1,casterState.hp-chargeSelfCost);
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round(casterCfg.chargeDmg*casterCfg.dmgMult);
    gs.busy=true;
    lunge(caster,()=>{
      if(!battleRunning) return;
      if(targetState.foresight){
        addFloat(tx,bH*.38-20,'🔮 Foreseen!','#ffcc44',15);
        targetState.foresight=false;
        spawnParts(tx,bH*.38,'#ffcc44',18);
        spawnParts(tx,bH*.38,casterCfg.col,10);
        spawnParts(tx,bH*.38,'#ffffff',6);
      } else if(targetState.invisible>0){
        addFloat(tx,bH*.38-20,'👻 Missed!','#b8a0e8',15);
        spawnParts(tx,bH*.38,'#b8a0e8',12);
      } else if(targetState.haste>0&&_rng()<0.25){
        addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',12);
      } else if(targetState.blink>0&&_rng()<0.5){
        addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
        spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
        flash('#9988cc');
      } else {
        if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
        if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
        const [chDmg,chSkin]=applyTargetSkins(targetState,dmg,true);
        dmg=chDmg;
        if(chSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+chSkin+' Skin','#b08040',10);
        if(targetState.shield>0){
          const absorbed=Math.min(dmg,targetState.shieldHp);
          targetState.shieldHp-=absorbed;
          dmg-=absorbed;
          if(targetState.shieldHp<=0){
            targetState.shield=0; targetState.counter=false;
            addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
            spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
          } else {
            addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
            spawnParts(tx,bH*.38,'#4af0ff',8); spawnParts(tx,bH*.38,'#ffffff',4);
          }
        }
        targetState.hp=Math.max(0,targetState.hp-dmg);
        if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
        if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
        if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
        if(targetState.charge>0){
          applyDischarge(targetState,casterState,cx,tx);
          checkWin(); if(!battleRunning) return;
        }
        spawnParts(tx,bH*.38,casterCfg.col,22);
        addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,22);
        flash(casterCfg.col);
        if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
        else             {anim('p2','cast',800); anim('p1','hit',800);}
      }
      refreshHUD(); checkWin(); if(!battleRunning) return;
      if(caster==='p1'||twoPlayerMode){ endMyTurn(); }
      else { if(!simCallback) tickStatuses(casterState); combatTimeout(finishAI,900); }
    });
    return;
  } else if(spellId==='ward'){
    casterState.ward=3;
    addFloat(cx,bH*.33,'🔰 Warded! (3T)',casterCfg.col,13);
    spawnParts(cx,bH*.38,'#ffcc44',14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='drain'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      let dmg=Math.round(18*casterCfg.dmgMult);
      if(casterState.empowered){
        dmg=Math.round(dmg*(casterCfg.empowerMult||1.5));
        casterState.empowered=false;
        addFloat(tx,bH*.33-20,'💪 Empowered!',casterCfg.col,10);
      }
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [drainDmg2,drainSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=drainDmg2;
      if(drainSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+drainSkin+' Skin','#b08040',10);
      let drainBase=dmg;
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed; drainBase-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      const healAmt=Math.max(0,Math.round(drainBase*0.45));
      casterState.hp=Math.min(casterState.maxHp,casterState.hp+healAmt);
      spawnBeam(cx,bH*.38,tx,bH*.38,'#cc1111');
      spawnParts(tx,bH*.38,'#cc1111',18);
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+(-0.6+_rng()*1.2),sp=1.5+_rng()*2.5;
        gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,col:'#cc1111',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*2,life:1,dec:.018,noGrav:true});
      }
      addFloat(tx,bH*.38,'-'+dmg,'#cc1111',20);
      addFloat(cx,bH*.33,'+'+healAmt+' 🩸',casterCfg.col,14);
      flash('#cc1111');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='vinewhip'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      targetState.vineWhip=3;
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.07,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+_rng()*2,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#44cc88',10);
      addFloat(tx,bH*.33,'🌱 Vine Whip! (3T)','#44cc88',13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='haste'){
    casterState.haste=3;
    addFloat(cx,bH*.33,'💨 Haste! (3T)',casterCfg.col,13);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-1.0+_rng()*2.0),sp=1.5+_rng()*3;
      gs.parts.push({x:cx,y:bH*.38,col:i%2?casterCfg.col:'#ffffff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*2.5,life:1,dec:.016,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='frenzy'){
    const frenzySelfCost=casterState.resist>0?Math.round(casterCfg.frenzyHpCost*0.67):casterCfg.frenzyHpCost;
    casterState.hp=Math.max(1,casterState.hp-frenzySelfCost);
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    gs.busy=true;
    addFloat(cx,bH*.28,'💢 FRENZY!',casterCfg.col,16);
    spawnParts(cx,bH*.38,casterCfg.col,18);
    let frenzyHitsDone=0;
    function doFrenzyStrike(){
      if(!battleRunning) return;
      lunge(caster,0.12,()=>{
        if(!battleRunning) return;
        doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
        refreshHUD(); checkWin(); if(!battleRunning) return;
        frenzyHitsDone++;
        if(frenzyHitsDone<3){
          combatTimeout(doFrenzyStrike,300);
        } else {
          if(caster==='p1'||twoPlayerMode){
            endMyTurn();
          } else {
            if(!simCallback) tickStatuses(casterState);
            combatTimeout(finishAI,900);
          }
        }
      });
    }
    doFrenzyStrike();
    return;
  } else if(spellId==='blink'){
    casterState.blink=3;
    addFloat(cx,bH*.33,'💫 Blink! (3T)',casterCfg.col,17);
    spawnParts(cx,bH*.38,'#9988cc',22); spawnParts(cx,bH*.38,'#ffffff',8);
    anim(caster,'shield',700);
  } else if(spellId==='fireball'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const baseRoll=16+Math.floor(_rng()*9);
    let dmg=Math.round(baseRoll*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6600',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [fbDmg,fbSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=fbDmg;
      if(fbSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+fbSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#ff6600':'#ffaa00',
          vx:Math.cos(a+Math.PI)*1.4,vy:Math.sin(a+Math.PI)*1.4-0.5,sz:2+_rng()*3,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#ff6600',20);
      addFloat(tx,bH*.38,'-'+dmg,'#ff6600',20);
      flash('#ff6600');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='flameshield'){
    casterState.flameShield=5+(perfect?1:0);
    addFloat(cx,bH*.33,'🔥 Flame Shield! ('+casterState.flameShield+'T)',casterCfg.col,13);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#ff6600':'#ffaa00',
        vx:Math.cos(a)*1.0,vy:Math.sin(a)*1.0-0.5,sz:2+_rng()*2.5,life:1,dec:.018,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#ff6600',8); spawnParts(cx,bH*.38,'#ffaa00',4);
    anim(caster,'shield',700);
  } else if(spellId==='candle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6600',6);
      anim(caster,'cast',600);
    } else {
      targetState.candle=3;
      for(let i=0;i<12;i++){
        const a=_rng()*Math.PI*2;
        gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#ff6600':'#ffaa00',
          vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-1.5,sz:1.5+_rng()*2,life:1,dec:.018,noGrav:true});
      }
      spawnParts(tx,bH*.38,'#ff6600',10);
      addFloat(tx,bH*.33,'🕯️ Candle! (4T)',casterCfg.col,13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='icelance'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round((casterCfg.iceLanceDmg||28)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#88ddff',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [ilDmg,ilSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=ilDmg;
      if(ilSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+ilSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      for(let i=0;i<16;i++){
        const a=i/16*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.05,y:bH*.38+Math.sin(a)*bH*.03,col:'#88ddff',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+_rng()*2.5,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#88ddff',18);
      addFloat(tx,bH*.38,'-'+dmg,'#88ddff',20);
      flash('#88ddff');
      if(_rng()<(casterCfg.iceLanceFreeze||0.35)&&targetState.frozen<=0){
        if(targetState.ward>0){
          targetState.ward=0;
          addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
        } else {
          targetState.frozen=1;
          addFloat(tx,bH*.33+20,'❄️ Frozen!','#88ddff',12);
        }
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='frostarmor'){
    casterState.frostArmor=(casterCfg.frostArmorDur||4)+(perfect?1:0);
    addFloat(cx,bH*.33,'❄️ Frost Armor! ('+casterState.frostArmor+'T)','#88ddff',13);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#88ddff',
        vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-0.5,sz:2+_rng()*2.5,life:1,dec:.016,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#aaeeff',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  } else if(spellId==='blizzard'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#88ddff',6);
      anim(caster,'cast',600);
    } else {
      targetState.blizzard=casterCfg.blizzardDur||5;
      for(let i=0;i<20;i++){
        const a=_rng()*Math.PI*2, r=bH*(0.05+_rng()*0.08);
        gs.parts.push({x:tx+Math.cos(a)*r,y:bH*.38+Math.sin(a)*r*0.5,col:'#88ddff',
          vx:Math.cos(a)*0.6+(_rng()-.5)*0.8,vy:Math.sin(a)*0.6-1-_rng()*2,
          sz:1.5+_rng()*2.5,life:1,dec:.012,noGrav:true});
      }
      spawnParts(tx,bH*.38,'#88ddff',12); spawnParts(tx,bH*.38,'#aaeeff',6);
      addFloat(tx,bH*.33,'🌨️ Blizzard! ('+targetState.blizzard+'T)','#88ddff',13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='galvanize'){
    const gain=casterCfg.galvanizeChargeGain||8;
    casterState.charge=(casterState.charge||0)+gain;
    addFloat(cx,bH*.33,'🔋 +'+gain+' Charge!',casterCfg.col,13);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#aaff44':'#88ffcc',
        vx:Math.cos(a)*0.9,vy:Math.sin(a)*0.9-0.5,sz:2+_rng()*2.5,life:1,dec:.018,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#aaff44',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  } else if(spellId==='chainlightning'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    const chargeCost=casterCfg.chainLightningChargeCost||8;
    casterState.charge=Math.max(0,casterState.charge-chargeCost);
    let dmg=Math.round((casterCfg.chainLightningDmg||24)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)       dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0)   dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [clDmg,clSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=clDmg;
      if(clSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+clSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      // Lightning arc visual
      for(let i=0;i<14;i++){
        const a=i/14*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.05,y:bH*.38+Math.sin(a)*bH*.03,col:i%2?'#aaff44':'#ffffff',
          vx:Math.cos(a+Math.PI)*1.5,vy:Math.sin(a+Math.PI)*1.5,sz:2+_rng()*2,life:1,dec:.022});
      }
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col);
      spawnParts(tx,bH*.38,casterCfg.col,18);
      addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,20);
      flash(casterCfg.col);
      // Arc chance
      if(_rng()<(casterCfg.chainArcChance||0.35)){
        const arcDmg=casterCfg.chainArcDmg||10;
        if(targetState.hp>0){
          targetState.hp=Math.max(0,targetState.hp-arcDmg);
          addFloat(tx,bH*.33+20,'⚡ Arc! −'+arcDmg,casterCfg.col,13);
          spawnParts(tx,bH*.38,casterCfg.col,8);
        }
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='conductivity'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',600);
    } else {
      targetState.conductivity=casterCfg.conductivityDur||3;
      for(let i=0;i<14;i++){
        const a=_rng()*Math.PI*2;
        gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:bH*.38,col:i%2?'#aaff44':'#88ffcc',
          vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-1.2,sz:1.5+_rng()*2,life:1,dec:.016,noGrav:true});
      }
      spawnParts(tx,bH*.38,casterCfg.col,10);
      addFloat(tx,bH*.33,'💡 Conductive! ('+targetState.conductivity+'T)',casterCfg.col,13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='agony'||spellId==='silence'||spellId==='corruption'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false; spawnParts(tx,bH*.38,'#ffcc44',14); anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12); anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15); spawnParts(tx,bH*.38,'#ffcc44',12); anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward--;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14); anim(caster,'cast',600);
    } else {
      if(spellId==='agony'){
        targetState.agony=casterCfg.agonyDur||4; targetState.agonyDmg=casterCfg.agonyDmg||12;
        addFloat(tx,bH*.33,'💀 Agony! ('+targetState.agony+'T)',casterCfg.col,14);
      } else if(spellId==='silence'){
        targetState.silence=casterCfg.silenceDur||4;
        addFloat(tx,bH*.33,'🔇 Silenced! ('+targetState.silence+'T)',casterCfg.col,14);
      } else {
        targetState.corruption=casterCfg.corruptionDur||3;
        addFloat(tx,bH*.33,'☠️ Corrupted! ('+targetState.corruption+'T)',casterCfg.col,14);
      }
      spawnParts(tx,bH*.38,casterCfg.col,18); spawnParts(tx,bH*.38,'#110011',8);
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col); flash(casterCfg.col);
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
    refreshHUD();
  } else if(spellId==='divineheal'){
    const healAmt=casterCfg.healAmt||40;
    const actual=Math.min(healAmt, casterState.maxHp-casterState.hp);
    casterState.hp=Math.min(casterState.maxHp, casterState.hp+healAmt);
    addFloat(cx,bH*.33,'💛 +'+actual+' Healed!',casterCfg.col,14);
    for(let i=0;i<16;i++){
      const a=-Math.PI/2+(-0.9+_rng()*1.8), sp=1+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#ffe090':'#fff8c0',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.014,noGrav:true});
    }
    flash(casterCfg.col);
    anim(caster,'cast',700); refreshHUD();
  } else if(spellId==='purge'){
    const cleared=[];
    if(casterState.burn>0)        {casterState.burn=0;         cleared.push('🔥');}
    if(casterState.poison>0)      {casterState.poison=0;       cleared.push('🧪');}
    if(casterState.voidCollapse>0){casterState.voidCollapse=0; casterState.voidCollapseTick=0; cleared.push('🌀');}
    if(casterState.frozen>0)      {casterState.frozen=0;       cleared.push('❄️');}
    if(casterState.blizzard>0)    {casterState.blizzard=0;     cleared.push('🌨️');}
    if(casterState.vineWhip>0)    {casterState.vineWhip=0;     cleared.push('🌿');}
    if(casterState.timeDrain>0)   {casterState.timeDrain=0;    cleared.push('⏳');}
    if(casterState.conductivity>0){casterState.conductivity=0; cleared.push('💡');}
    if(casterState.candle>0)      {casterState.candle=0;       cleared.push('🕯️');}
    if(casterState.agony>0)       {casterState.agony=0;        cleared.push('💀');}
    if(casterState.corruption>0)  {casterState.corruption=0;   cleared.push('☠️');}
    if(casterState.silence>0)     {casterState.silence=0;      cleared.push('🔇');}
    if(casterState.plague>0)      {casterState.plague=0;       cleared.push('🦠');}
    if(casterState.maggotCloud>0) {casterState.maggotCloud=0;  cleared.push('🪲');}
    addFloat(cx,bH*.33,'✨ Purged! '+cleared.join(''),casterCfg.col,13);
    spawnParts(cx,bH*.38,'#fffde0',18); spawnParts(cx,bH*.38,'#ffffff',8);
    flash('#fffff0');
    anim(caster,'shield',700);
    refreshHUD();
  } else if(spellId==='radiant'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    let dmg=Math.round((casterCfg.radiantDmg||12)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      const counterTriggered=targetState.counter&&targetState.shield>0;
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        addFloat(tx,bH*.38-20,'☀️ Bypassed!',casterCfg.col,15);
        spawnParts(tx,bH*.38,casterCfg.col,12); spawnParts(tx,bH*.38,'#ffffff',6);
      }
      if(counterTriggered){
        casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
        targetState.counter=false;
        addFloat(cx,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
        spawnParts(cx,bH*.38,'#4af0ff',16);
        spawnBeam(tx,bH*.38,cx,bH*.38,'#4af0ff');
        checkWin(); if(!battleRunning) return;
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      spawnParts(tx,bH*.38,casterCfg.col,16);
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col);
      addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
      flash(casterCfg.col);
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
    refreshHUD(); checkWin();
  } else if(spellId==='stoneskin'){
    casterState.stoneskin=casterCfg.stoneskinDuration||10;
    casterState.stoneskinHp=(casterCfg.stoneskinHpMax||30)+(perfect?5:0);
    addFloat(cx,bH*.33,'🧱 Stoneskin! ('+casterState.stoneskin+'T / '+casterState.stoneskinHp+' HP)',casterCfg.col,12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +5 HP','#ffff88',11);
    // Three waves of rocks fly inward and "coat" the caster
    [0,220,440].forEach((delay,wave)=>{
      setTimeout(()=>{
        if(!battleRunning) return;
        const angle=wave/3*Math.PI*2+Math.PI/6;
        const srcDist=bH*0.22;
        for(let j=0;j<4;j++){
          const a=angle+j/4*Math.PI*2;
          const srcX=cx+Math.cos(a)*srcDist, srcY=bH*.38+Math.sin(a)*srcDist*0.55;
          const speed=0.06+_rng()*0.04;
          gs.parts.push({x:srcX,y:srcY,col:j%2?'#8b7355':'#a08060',
            vx:(cx-srcX)*speed,vy:(bH*.38-srcY)*speed,
            sz:3+_rng()*3,life:1,dec:.028,noGrav:true});
        }
        spawnParts(cx,bH*.38,casterCfg.col,4);
      },delay);
    });
    anim(caster,'shield',900);
  } else if(spellId==='stonesoul'){
    casterState.stonesoul=casterCfg.stonesoulDuration||4;
    addFloat(cx,bH*.33,'💎 Stonesoul! ('+casterState.stonesoul+'T)',casterCfg.col,12);
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.07,y:bH*.38+Math.sin(a)*bH*.05,
        col:i%3===0?'#b08040':i%3===1?'#8b6914':'#c8a060',
        vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-0.3,
        sz:1.5+_rng()*2.5,life:1,dec:.015,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#c8a060',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  // ── WEIZAN ──────────────────────────────────────────────────
  } else if(spellId==='conjureblade'){
    casterState.blades++;
    addFloat(cx,bH*.33,'🗡️ Blade Conjured! ('+casterState.blades+')','#66aa88',12);
    spawnParts(cx,bH*.38,'#aaaadd',14); spawnParts(cx,bH*.38,'#ffffff',5);
    anim(caster,'cast',700);
  } else if(spellId==='bladestorm'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    gs.busy=true;
    const numBlades=casterState.blades;
    casterState.blades=0;
    addFloat(cx,bH*.28,'💫 BLADESTORM! ('+numBlades+'×)','#66aa88',16);
    spawnParts(cx,bH*.38,'#aaaadd',16);
    anim(caster,'cast',900);
    let bladesDone=0;
    function fireBlade(){
      if(!battleRunning) return;
      const yOff=bH*(bladesDone===0?-0.04:bladesDone===1?0:0.04);
      spawnProj(cx,bH*.38+yOff,tx,bH*.38+yOff,'physical','#aaaadd',()=>{
        if(!battleRunning) return;
        let bDmg=casterCfg.bladestormDmg||12;
        if(targetState.resist>0) bDmg=Math.round(bDmg*0.67);
        if(targetState.conductivity>0) bDmg=Math.round(bDmg*1.35);
        const targetWho=caster==='p1'?'p2':'p1';
        dealDmgToPlayer(targetWho,bDmg,tx,bH*.38+yOff,false,false);
        if(targetState.frostArmor>0&&bDmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
        addFloat(tx,bH*.38+yOff,'🗡️ −'+bDmg,casterCfg.col,14);
        spawnParts(tx,bH*.38+yOff,casterCfg.col,10);
        refreshHUD(); checkWin(); if(!battleRunning) return;
        bladesDone++;
        if(bladesDone<numBlades){ combatTimeout(fireBlade,320); }
        else {
          flash(casterCfg.col);
          if(caster==='p1'||twoPlayerMode){ endMyTurn(); }
          else { if(!simCallback) tickStatuses(casterState); combatTimeout(finishAI,900); }
        }
      });
    }
    fireBlade();
    return;
  } else if(spellId==='ironpatience'){
    casterState.resist=3;
    addFloat(cx,bH*.33,'🧘 Iron Patience! −30% dmg','#66aa88',12);
    spawnParts(cx,bH*.38,'#888899',12); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);

  // ── GRETCH ──────────────────────────────────────────────────
  } else if(spellId==='plague'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.plague=casterCfg.plagueDoTDur||5;
      targetState.plagueDoTDmg=casterCfg.plagueDoTDmg||6;
      targetState.plagueSpellDmg=casterCfg.plagueSpellDmg||8;
      addFloat(tx,bH*.33,'☠️ Plagued! ('+targetState.plague+'T)','#55aa33',13);
      spawnParts(tx,bH*.38,'#55aa33',16); spawnParts(tx,bH*.38,'#aaddaa',5);
      anim(caster,'cast',800);
    }
  } else if(spellId==='maggotcloud'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      const drained=Math.min(casterCfg.maggotCloudDrain||3,targetState.mana);
      targetState.mana=Math.max(0,targetState.mana-drained);
      targetState.maggotCloud=casterCfg.maggotCloudDur||3;
      addFloat(tx,bH*.33,'🪲 Maggot Cloud!','#55aa33',12);
      if(drained>0) addFloat(tx,bH*.38+22,'−'+drained+' Mana','#55aa33',11);
      spawnParts(tx,bH*.38,'#55aa33',14); spawnParts(tx,bH*.38,'#aaddaa',5);
      anim(caster,'cast',800);
    }
  } else if(spellId==='bonetotem'){
    casterState.boneTotem=casterCfg.boneTotemDur||4;
    addFloat(cx,bH*.33,'💀 Bone Totem Raised!','#55aa33',13);
    spawnParts(cx,bH*.38,'#55aa33',14); spawnParts(cx,bH*.38,'#aaddaa',6);
    anim(caster,'shield',700);

  // ── VALDRIS ─────────────────────────────────────────────────
  } else if(spellId==='raisedead'){
    casterState.skeletons.push({hp:casterCfg.skelMaxHp||25, maxHp:casterCfg.skelMaxHp||25});
    addFloat(cx,bH*.33,'💀 Skeleton Raised! ('+casterState.skeletons.length+')','#8844cc',12);
    spawnParts(cx,bH*.38,'#8844cc',14); spawnParts(cx,bH*.38,'#ffffff',5);
    anim(caster,'cast',800);
  } else if(spellId==='necroticdrain'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15); spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      const counterTriggered=targetState.counter&&targetState.shield>0;
      let drainDmg=Math.round((casterCfg.necroticDrainDmg||18)*casterCfg.dmgMult);
      if(targetState.resist>0) drainDmg=Math.round(drainDmg*0.67);
      if(targetState.frostArmor>0) drainDmg=Math.round(drainDmg*0.70);
      if(targetState.conductivity>0) drainDmg=Math.round(drainDmg*1.35);
      if(counterTriggered){
        casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
        targetState.counter=false;
        addFloat(cx,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
        spawnParts(cx,bH*.38,'#4af0ff',16);
        spawnBeam(tx,bH*.38,cx,bH*.38,'#4af0ff');
        checkWin(); if(!battleRunning) return;
      }
      const targetWho=caster==='p1'?'p2':'p1';
      dealDmgToPlayer(targetWho,drainDmg,tx,bH*.38,false,false);
      if(targetState.frostArmor>0&&drainDmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&drainDmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&drainDmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      const healAmt=casterCfg.necroticDrainHeal||8;
      casterState.hp=Math.min(casterState.maxHp,casterState.hp+healAmt);
      addFloat(tx,bH*.33,'🩸 Drain! −'+drainDmg,casterCfg.col,16);
      addFloat(cx,bH*.38,'+'+healAmt+' HP','#8844cc',13);
      spawnParts(tx,bH*.38,'#8844cc',16);
      spawnBeam(cx,bH*.38,tx,bH*.38,'#8844cc');
      flash('#8844cc');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin(); if(!battleRunning) return;
    }
  } else if(spellId==='reinforce'){
    const reinAmt=casterCfg.skelReinforceAmt||15;
    const weakest=casterState.skeletons.reduce((a,b)=>b.hp<a.hp?b:a);
    weakest.hp=Math.min(weakest.maxHp,weakest.hp+reinAmt);
    addFloat(cx,bH*.33,'🔧 Reinforced! +'+reinAmt+' HP','#8844cc',12);
    spawnParts(cx,bH*.38,'#8844cc',10);
    anim(caster,'cast',700);

  // ── MIREL ───────────────────────────────────────────────────
  } else if(spellId==='simulacrum'){
    casterState.simulacra.push({hp:casterCfg.simulacrumMaxHp||20, maxHp:casterCfg.simulacrumMaxHp||20, mana:casterCfg.simulacrumStartMana||6});
    addFloat(cx,bH*.33,'👁 Simulacrum! ('+casterState.simulacra.length+')','#b86ef4',13);
    spawnParts(cx,bH*.38,'#b86ef4',16); spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',800);
  } else if(spellId==='bewitch'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.bewitched=true;
      addFloat(tx,bH*.33,'🪄 Bewitched!',casterCfg.col,14);
      spawnParts(tx,bH*.38,casterCfg.col,18); spawnParts(tx,bH*.38,'#ffffff',6);
      anim(caster,'cast',800);
    }
  } else if(spellId==='feint'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15); spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      let feintDmg=casterCfg.feintDmg||15;
      if(casterState.empowered){ feintDmg=Math.round(feintDmg*(casterCfg.empowerMult||1.5)); casterState.empowered=false; addFloat(tx,bH*.33,'💪 Empowered!',casterCfg.col,10); }
      if(targetState.conductivity>0) feintDmg=Math.round(feintDmg*1.35);
      // Feint bypasses shield, foresight, ward, stoneskin, skeletons, simulacra — pure deception
      const targetWho=caster==='p1'?'p2':'p1';
      dealDmgToPlayer(targetWho,feintDmg,tx,bH*.38,true,true);
      if(targetState.flameShield>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      addFloat(tx,bH*.33,'🗡️ Feint! −'+feintDmg,casterCfg.col,16);
      spawnParts(tx,bH*.38,casterCfg.col,18);
      flash(casterCfg.col);
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin(); if(!battleRunning) return;
    }

  // ── THESSALY ─────────────────────────────────────────────────
  } else if(spellId==='enthral'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.enthralled=1;
      addFloat(tx,bH*.33,'🌀 Enthralled!',casterCfg.col,14);
      spawnParts(tx,bH*.38,casterCfg.col,18); spawnParts(tx,bH*.38,'#ffffff',6);
      anim(caster,'cast',800);
    }
  } else if(spellId==='arcaneweave'){
    casterState.arcaneWeave=casterCfg.arcaneWeaveAttacks||3;
    addFloat(cx,bH*.33,'🌟 Arcane Weave! ('+casterState.arcaneWeave+'× atk)',casterCfg.col,12);
    spawnParts(cx,bH*.38,casterCfg.col,14); spawnParts(cx,bH*.38,'#ffdd88',5);
    anim(caster,'cast',700);
  } else if(spellId==='spellbind'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      const bindableCfg=caster==='p1'?p2Cfg:p1Cfg;
      const bindable=(bindableCfg.spells||[]).filter(s=>s.cost>0&&(!targetState.spellbound||targetState.spellbound.spellId!==s.id));
      if(bindable.length>0){
        const tgt=bindable.reduce((a,b)=>b.cost>a.cost?b:a);
        targetState.spellbound={spellId:tgt.id, extraCost:casterCfg.spellbindExtraCost||3, turns:casterCfg.spellbindDur||5};
        addFloat(tx,bH*.33,'🔒 '+tgt.name+' Bound! (+'+targetState.spellbound.extraCost+' cost)',casterCfg.col,13);
        spawnParts(tx,bH*.38,casterCfg.col,16); spawnParts(tx,bH*.38,'#ffdd88',5);
        anim(caster,'cast',800);
      } else {
        addFloat(tx,bH*.33,'🔒 Nothing to Bind!','#888888',11);
        anim(caster,'cast',400);
        casterState.mana=Math.min(MAX_MANA,casterState.mana+spell.cost); // refund
      }
    }
  } else if(spellId==='rockfall'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    gs.busy=true;
    addFloat(cx,bH*.28,'⛰️ ROCKFALL!',casterCfg.col,16);
    spawnParts(cx,bH*.38,casterCfg.col,12);
    anim(caster,'cast',900);
    let rocksDone=0;
    function fireRock(){
      if(!battleRunning) return;
      const yOff=bH*(rocksDone===0?-0.04:rocksDone===1?0:0.04);
      spawnProj(cx,bH*.38+yOff,tx,bH*.38+yOff,'physical',casterCfg.col,()=>{
        if(!battleRunning) return;
        doRockfallHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
        refreshHUD(); checkWin(); if(!battleRunning) return;
        rocksDone++;
        if(rocksDone<3){
          combatTimeout(fireRock,350);
        } else {
          if(caster==='p1'||twoPlayerMode){
            endMyTurn();
          } else {
            if(!simCallback) tickStatuses(casterState);
            combatTimeout(finishAI,900);
          }
        }
      });
    }
    fireRock();
    return;
  // ── KORVATH ──────────────────────────────────────────────────
  } else if(spellId==='dragonscales'){
    casterState.resist=(casterCfg.dragonScalesDur||5)+(perfect?1:0);
    casterState.dragonScales=casterState.resist;
    addFloat(cx,bH*.33,'🐉 Dragon Scales! ('+casterState.resist+'T)',casterCfg.col,13);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#cc6622',
        vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-0.5,sz:2+_rng()*2.5,life:1,dec:.016,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#dd8844',8); spawnParts(cx,bH*.38,'#ffcc88',4);
    anim(caster,'shield',700);
  } else if(spellId==='wyrmfirebreath'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round((casterCfg.wyrmfireDmg||16)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6622',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [wfDmg,wfSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=wfDmg;
      if(wfSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+wfSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      spawnParts(tx,bH*.38,'#ff6622',18); spawnParts(tx,bH*.38,'#ffaa44',8);
      addFloat(tx,bH*.38,'-'+dmg,'#ff6622',20);
      flash('#ff6622');
      if(targetState.ward>0){
        targetState.ward=0;
        addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
      } else if(dmg>0){
        targetState.burn=BURN_ROUNDS;
        addFloat(tx,bH*.33+20,'🔥 Ablaze! ('+BURN_ROUNDS+'T)','#ff6622',12);
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
  } else if(spellId==='ancientwrath'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    casterState.usedSpells=casterState.usedSpells||{};
    casterState.usedSpells.ancientwrath=true;
    let dmg=Math.round((casterCfg.ancientWrathDmg||35)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff4400',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [awDmg,awSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=awDmg;
      if(awSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+awSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      addFloat(cx,bH*.26,'💥 ANCIENT WRATH!',casterCfg.col,16);
      spawnParts(tx,bH*.38,'#ff4400',24); spawnParts(tx,bH*.38,'#ffaa00',10);
      addFloat(tx,bH*.38,'-'+dmg,'#ff4400',24);
      flash('#ff4400');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
  // ── FIZZWICK ─────────────────────────────────────────────────
  } else if(spellId==='causticbomb'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round((casterCfg.causticBombDmg||10)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#88dd44',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [cbDmg,cbSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=cbDmg;
      if(cbSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+cbSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      spawnParts(tx,bH*.38,'#88dd44',18); spawnParts(tx,bH*.38,'#55aa33',8);
      addFloat(tx,bH*.38,'-'+dmg,'#88dd44',20);
      flash('#88dd44');
      if(targetState.ward>0){
        targetState.ward=0;
        addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
      } else if(dmg>0){
        targetState.poison=POISON_ROUNDS;
        addFloat(tx,bH*.33+20,'🧪 Poisoned! ('+POISON_ROUNDS+'T)','#88dd44',12);
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
  } else if(spellId==='volatiletonic'){
    if(_rng()<0.5){
      const healAmt=casterCfg.volatileTonicHeal||20;
      casterState.hp=Math.min(casterState.maxHp,casterState.hp+healAmt);
      addFloat(cx,bH*.33,'💚 +'+healAmt+' HP!','#44cc88',16);
      for(let i=0;i<14;i++){
        const a=-Math.PI/2+(-0.8+_rng()*1.6), sp=1+_rng()*2.5;
        gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#44ee88':'#88ffcc',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.014,noGrav:true});
      }
    } else {
      casterState.empowered=true;
      addFloat(cx,bH*.33,'💪 Empowered!','#88dd44',16);
      spawnParts(cx,bH*.38,'#88dd44',10); spawnParts(cx,bH*.38,'#55aa33',6);
    }
    addFloat(cx,bH*.26,'🧪 Volatile Tonic!',casterCfg.col,12);
    anim(caster,'cast',700);
  } else if(spellId==='unstableconcoction'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const [lo,hi]=casterCfg.unstableConcoctionDmgRange||[10,30];
    let dmg=Math.round((lo+_rng()*(hi-lo))*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#cc66ff',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [ucDmg,ucSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=ucDmg;
      if(ucSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+ucSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      addFloat(cx,bH*.26,'⚗️ UNSTABLE CONCOCTION!',casterCfg.col,14);
      spawnParts(tx,bH*.38,'#cc66ff',22); spawnParts(tx,bH*.38,'#88dd44',8);
      addFloat(tx,bH*.38,'-'+dmg,'#cc66ff',22);
      flash('#cc66ff');
      if(targetState.ward>0){
        targetState.ward=0;
        addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
  // ── NYXARA ───────────────────────────────────────────────────
  } else if(spellId==='singularity'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#aa66ff',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.voidCollapse=VOID_COLLAPSE_ROUNDS;
      targetState.voidCollapseTick=0;
      addFloat(tx,bH*.33,'🌀 Singularity! ('+VOID_COLLAPSE_ROUNDS+'T)','#aa66ff',13);
      for(let i=0;i<16;i++){
        const a=i/16*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#6633aa',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+_rng()*2.5,life:1,dec:.018});
      }
      spawnParts(tx,bH*.38,'#aa66ff',10); spawnParts(tx,bH*.38,'#330055',6);
      anim(caster,'cast',800);
    }
  } else if(spellId==='gravitywell'||spellId==='eventhorizon'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const pct=spellId==='gravitywell'?(casterCfg.gravityWellPct||0.25):(casterCfg.eventHorizonPct||0.40);
    const minDmg=spellId==='gravitywell'?(casterCfg.gravityWellMin||5):(casterCfg.eventHorizonMin||10);
    let dmg=Math.max(minDmg,Math.round(targetState.hp*pct));
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#aa66ff',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [gwDmg,gwSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=gwDmg;
      if(gwSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+gwSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
      if(spellId==='eventhorizon'){
        const recoil=casterCfg.eventHorizonRecoil||6;
        casterState.hp=Math.max(0,casterState.hp-recoil);
        addFloat(cx,bH*.26,'🕳 EVENT HORIZON!',casterCfg.col,16);
        addFloat(cx,bH*.33,'-'+recoil+' Recoil','#aa66ff',12);
        spawnParts(cx,bH*.38,'#6633aa',12);
      } else {
        addFloat(cx,bH*.26,'🌑 GRAVITY WELL!',casterCfg.col,14);
      }
      spawnParts(tx,bH*.38,'#aa66ff',22); spawnParts(tx,bH*.38,'#6633aa',8);
      addFloat(tx,bH*.38,'-'+dmg,'#aa66ff',22);
      flash('#6633aa');
      if(targetState.ward>0){
        targetState.ward=0;
        addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
  } else if(spellId==='basicattack'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const basicSpell=casterCfg.spells.find(s=>s.id==='basicattack');
    let dmg=Math.round((basicSpell.dmg||8)*casterCfg.dmgMult);
    const isPhysical=!!basicSpell.physical;
    // Arcane Weave bonus
    let arcaneWeaveBonusDmg=0, arcaneWeaveManaDrain=0;
    if(casterState.arcaneWeave>0){ arcaneWeaveBonusDmg=casterCfg.arcaneWeaveDmgBonus||6; arcaneWeaveManaDrain=casterCfg.arcaneWeaveManaDrain||2; casterState.arcaneWeave--; }
    if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
    if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
    if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
    function resolveBasicAttack(){
      if(targetState.foresight){
        addFloat(tx,bH*.38-20,'🔮 Absorbed!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',18);
        spawnParts(tx,bH*.38,casterCfg.col,10);
        spawnParts(tx,bH*.38,'#ffffff',6);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.invisible>0){
        addFloat(tx,bH*.38-20,'👻 Missed!','#b8a0e8',15);
        spawnParts(tx,bH*.38,'#b8a0e8',12);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.haste>0&&_rng()<0.25){
        addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',12);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.blink>0&&_rng()<0.5){
        addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
        spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
        flash('#9988cc');
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else {
        const [baDmg,baSkin]=applyTargetSkins(targetState,dmg,isPhysical);
        dmg=baDmg;
        if(baSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+baSkin+' Skin','#b08040',10);
        const counterTriggered=!isPhysical&&targetState.counter&&targetState.shield>0;
        if(targetState.shield>0){
          const absorbed=Math.min(dmg,targetState.shieldHp);
          targetState.shieldHp-=absorbed;
          dmg-=absorbed;
          if(targetState.shieldHp<=0){
            targetState.shield=0; targetState.counter=false;
            addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
            spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
          } else {
            addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
            spawnParts(tx,bH*.38,'#4af0ff',8); spawnParts(tx,bH*.38,'#ffffff',4);
          }
        }
        if(counterTriggered){
          const casterX=cx;
          casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
          targetState.counter=false;
          addFloat(casterX,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
          spawnParts(casterX,bH*.38,'#4af0ff',16);
          spawnBeam(tx,bH*.38,casterX,bH*.38,'#4af0ff');
          checkWin(); if(!battleRunning) return;
        }
        // Arcane Weave: bonus damage + mana drain
        if(arcaneWeaveBonusDmg>0){ dmg+=arcaneWeaveBonusDmg; const md=Math.min(arcaneWeaveManaDrain,targetState.mana); targetState.mana=Math.max(0,targetState.mana-md); addFloat(cx,bH*.38-20,'🌟 Weave +'+arcaneWeaveBonusDmg+', −'+md+' Mana','#ddaa22',10); }
        const targetWhoBA=caster==='p1'?'p2':'p1';
        dealDmgToPlayer(targetWhoBA,dmg,tx,bH*.38,false,false);
        if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
        if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
        if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
        if(isPhysical&&!basicSpell.piercesDischarge&&targetState.charge>0){
          applyDischarge(targetState,casterState,cx,tx);
          checkWin(); if(!battleRunning) return;
        }
        spawnParts(tx,bH*.38,casterCfg.col,14);
        addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
        flash(casterCfg.col);
        if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
        else             {anim('p2','cast',800); anim('p1','hit',800);}
      }
      refreshHUD();
      checkWin();
      if(!battleRunning) return;
      if(basicSpell.lungeAmt){
        if(caster==='p1'||twoPlayerMode){ endMyTurn(); }
        else { if(!simCallback) tickStatuses(casterState); combatTimeout(finishAI,900); }
      }
    }
    if(basicSpell.lungeAmt){
      gs.busy=true;
      lunge(caster,basicSpell.lungeAmt,resolveBasicAttack);
      return;
    } else {
      resolveBasicAttack();
    }
  }

  if(caster==='p1'||twoPlayerMode){
    endMyTurn(spellId==='counter');
  } else {
    if(!simCallback){
      if(spellId!=='counter' && casterState.shield>0){
        casterState.shield--;
        if(casterState.shield<=0){ casterState.shieldHp=0; casterState.counter=false; }
      }
      tickStatuses(casterState);
    }
    combatTimeout(finishAI,900);
  }
}


function castSpell(spell,target,tx,ty,caster){
  const casterCfg=caster==='p1'?p1Cfg:p2Cfg;
  const casterState=caster==='p1'?gs.p1:gs.p2;
  const targetState=target; // gs.p1 or gs.p2 passed directly

  const targetCfg=target===gs.p1?p1Cfg:p2Cfg;
  const oppCfg   =caster==='p1'?p2Cfg:p1Cfg;

  // Dispel: player chose to cleanse self OR strip one opp buff (dispelSelf flag set at targeting)
  if(spell.element==='dispel'){
    const casterX=caster==='p1'?bW*.22:bW*.78;
    flash('#ffaaff');
    if(dispelSelf){
      const DEBUFF_NAMES={agony:'Agony',corruption:'Corruption',silence:'Silence',burn:'Burn',poison:'Poison',voidCollapse:'Singularity',
        frozen:'Freeze',blizzard:'Blizzard',vineWhip:'Vine Whip',timeDrain:'Time Drain',
        conductivity:'Conductivity',candle:'Candle',plague:'Plague',maggotCloud:'Maggot Cloud'};
      const activeDebuffs=[];
      ['agony','corruption','silence','burn','poison','voidCollapse','frozen','blizzard','vineWhip','timeDrain','conductivity','candle','plague','maggotCloud'].forEach(s=>{
        if(casterState[s]) activeDebuffs.push(s);
      });
      spawnParts(casterX,bH*.38,'#ffaaff',30);
      for(let i=0;i<32;i++){
        const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.6+_rng()*1.8;
        gs.parts.push({x:casterX+(_rng()-.5)*bH*.08,y:bH*.38+(_rng()-.5)*bH*.05,
          col:i%4===0?'#ffddee':'#ffffff',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.010+_rng()*.009,noGrav:true});
      }
      if(activeDebuffs.length>0){
        const cleansed=activeDebuffs[Math.floor(_rng()*activeDebuffs.length)];
        casterState[cleansed]=0;
        if(cleansed==='voidCollapse') casterState.voidCollapseTick=0;
        addFloat(casterX,bH*.38,'🌸 '+DEBUFF_NAMES[cleansed]+' Cleansed!','#ffaaff',18);
      } else {
        addFloat(casterX,bH*.38,'🌸 Nothing to Cleanse!','#cc88aa',18);
      }
    } else {
      const dispelTargetX=caster==='p1'?bW*.78:bW*.22;
      const BUFF_NAMES={shield:'Shield',foresight:'Foresight',regen:'Regen',resist:'Resist',
        frostArmor:'Frost Armor',flameShield:'Flame Shield',empowered:'Empower',
        ward:'Ward',haste:'Haste',blink:'Blink',invisible:'Vanish',counter:'Counter',
        stoneskin:'Stoneskin',stonesoul:'Stonesoul',blades:'Blades',boneTotem:'Bone Totem',
        skeletons:'Skeletons',simulacra:'Simulacra',bewitched:'Bewitch',
        arcaneWeave:'Arcane Weave',spellbound:'Spellbound',dragonScales:'Dragon Scales'};
      const oppBuffs=[];
      if(targetState.shield>0)      oppBuffs.push('shield');
      if(targetState.foresight)     oppBuffs.push('foresight');
      if(targetState.regen)         oppBuffs.push('regen');
      if(targetState.resist>0)      oppBuffs.push('resist');
      if(targetState.frostArmor>0)  oppBuffs.push('frostArmor');
      if(targetState.flameShield>0) oppBuffs.push('flameShield');
      if(targetState.empowered)     oppBuffs.push('empowered');
      if(targetState.ward>0)        oppBuffs.push('ward');
      if(targetState.haste>0)       oppBuffs.push('haste');
      if(targetState.blink>0)       oppBuffs.push('blink');
      if(targetState.invisible>0)   oppBuffs.push('invisible');
      if(targetState.counter)       oppBuffs.push('counter');
      if(targetState.stoneskin>0)   oppBuffs.push('stoneskin');
      if(targetState.stonesoul>0)   oppBuffs.push('stonesoul');
      if(targetState.blades>0)      oppBuffs.push('blades');
      if(targetState.boneTotem>0)   oppBuffs.push('boneTotem');
      if(targetState.skeletons&&targetState.skeletons.length>0) oppBuffs.push('skeletons');
      if(targetState.simulacra&&targetState.simulacra.length>0) oppBuffs.push('simulacra');
      if(targetState.bewitched)     oppBuffs.push('bewitched');
      if(targetState.arcaneWeave>0) oppBuffs.push('arcaneWeave');
      if(targetState.spellbound)    oppBuffs.push('spellbound');
      if(targetState.dragonScales>0) oppBuffs.push('dragonScales');
      spawnParts(dispelTargetX,ty,'#ffaaff',20);
      if(oppBuffs.length>0){
        if(_rng()<0.70){
          const stripped=oppBuffs[Math.floor(_rng()*oppBuffs.length)];
          if(stripped==='shield'){targetState.shield=0; targetState.shieldHp=0; targetState.counter=false;}
          else if(stripped==='foresight') targetState.foresight=false;
          else if(stripped==='regen')     targetState.regen=null;
          else if(stripped==='empowered') targetState.empowered=false;
          else if(stripped==='counter')   targetState.counter=false;
          else if(stripped==='skeletons') targetState.skeletons=[];
          else if(stripped==='simulacra') targetState.simulacra=[];
          else if(stripped==='bewitched') targetState.bewitched=false;
          else if(stripped==='spellbound') targetState.spellbound=null;
          else if(stripped==='dragonScales'){targetState.dragonScales=0; targetState.resist=0;}
          else targetState[stripped]=0;
          for(let i=0;i<28;i++){
            const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.7+_rng()*1.8;
            gs.parts.push({x:dispelTargetX+(_rng()-.5)*bH*.08,y:ty+(_rng()-.5)*bH*.05,
              col:i%4===0?'#ffddee':'#ffffff',
              vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.010+_rng()*.009,noGrav:true});
          }
          addFloat(dispelTargetX,ty,'🌸 '+BUFF_NAMES[stripped]+' Stripped!','#ffaaff',14);
        } else {
          addFloat(dispelTargetX,ty,'🌸 Resisted!','#cc88aa',13);
        }
      } else {
        addFloat(dispelTargetX,ty,'🌸 No Buffs to Strip!','#cc88aa',13);
      }
    }
    if(caster==='p1'){anim('p1','cast',800);}else{anim('p2','cast',800);}
    return;
  }

  let dmg=Math.round(spell.dmg*casterCfg.dmgMult);
  if(spell.element==='arcane') dmg=Math.round((15+Math.floor(_rng()*41))*casterCfg.dmgMult);

  let impactCount=22;

  // Caster: Empower
  if(casterState.empowered){
    const pct=Math.round((casterCfg.empowerMult-1)*100);
    dmg=Math.round(dmg*casterCfg.empowerMult);
    casterState.empowered=false;
    addFloat(tx,ty-36,'💪 +'+pct+'% Empowered!',casterCfg.col,10);
    impactCount=38;
  }

  // Target: Damage Resistance
  if(targetState.resist>0){
    dmg=Math.round(dmg*0.67);
    addFloat(tx,ty-36,'🩸 -33% Resist!',targetCfg.col,10);
  }
  if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);

  // Target: Foresight — fully blocks the incoming spell
  if(targetState.foresight){
    addFloat(tx,ty-20,'🔮 Foreseen!','#ffcc44',15);
    targetState.foresight=false;
    spawnParts(tx,ty,'#ffcc44',18);
    spawnParts(tx,ty,spell.col,12);
    spawnParts(tx,ty,'#ffffff',6);
    if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    return;
  }

  // Mana Burn: psychic drain — bypasses invisibility, haste, shields; blocked by foresight
  if(spell.element==='manaburn'){
    let burnDmg=Math.round(targetState.mana*2*casterCfg.dmgMult);
    if(casterState.empowered){
      burnDmg=Math.round(burnDmg*(casterCfg.empowerMult||1.5));
      casterState.empowered=false;
      addFloat(tx,ty-36,'💪 Empowered!',casterCfg.col,10);
    }
    if(targetState.conductivity>0) burnDmg=Math.round(burnDmg*1.35);
    const drained=Math.min(4,targetState.mana);
    targetState.mana=Math.max(0,targetState.mana-drained);
    targetState.hp=Math.max(0,targetState.hp-burnDmg);
    spawnParts(tx,ty,'#cc44ff',22); spawnParts(tx,ty,'#ff88ff',10);
    const mbFireX=caster==='p1'?bW*.78:bW*.22;
    gs.manaBurnFires.push({x:mbFireX, y:ty, end:Date.now()+2800});
    addFloat(tx,ty,'-'+burnDmg,'#cc44ff',22);
    if(drained>0) addFloat(tx,ty+28,'🔮 −'+drained+' Mana','#cc44ff',14);
    flash('#cc44ff');
    if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
    else             {anim('p2','cast',800); anim('p1','hit',800);}
    checkWin();
    return;
  }

  // Target: Invisible — area spells hit anyway, others miss
  if(targetState.invisible>0){
    if(spell.area){
      addFloat(tx,ty-20,'🔥 Area!','#ff6622',13);
    } else {
      addFloat(tx,ty,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,ty,'#b8a0e8',12);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      return;
    }
  }

  // Target: Haste — 25% dodge
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,ty,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,ty,'#ffcc44',12);
    if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    return;
  }

  // Stonesoul (50% magic reduction) + Stoneskin (10 per-hit absorption)
  const [csDmg,csSkin]=applyTargetSkins(targetState,dmg,false); // universal spells are magical
  dmg=csDmg;
  if(csSkin>0) addFloat(tx,ty-20,'🧱 -'+csSkin+' Skin','#b08040',10);

  // Target: Counter (check BEFORE shield breaks)
  const counterTriggered=targetState.counter&&targetState.shield>0;

  // Target: Shield
  if(targetState.shield>0){
    if(spell.element==='lightning'){
      targetState.shield=0; targetState.counter=false;
      targetState.shieldHp=0;
      addFloat(tx,ty-20,'⚡ Pierced!','#ffee44',15);
      spawnParts(tx,ty,'#ffee44',18); spawnParts(tx,ty,'#4af0ff',12); spawnParts(tx,ty,'#ffffff',8);
    } else {
      const absorbed=Math.min(dmg,targetState.shieldHp);
      targetState.shieldHp-=absorbed;
      dmg-=absorbed;
      if(targetState.shieldHp<=0){
        targetState.shield=0; targetState.counter=false;
        addFloat(tx,ty-20,'🛡 SHATTERED!','#88ffff',22);
        spawnParts(tx,ty,'#4af0ff',24); spawnParts(tx,ty,'#ffffff',10);
      } else {
        addFloat(tx,ty-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
        spawnParts(tx,ty,'#4af0ff',8); spawnParts(tx,ty,'#ffffff',4);
      }
    }
  }

  // Counter reflect
  if(counterTriggered){
    const casterX=caster==='p1'?bW*.22:bW*.78;
    casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
    targetState.counter=false;
    addFloat(casterX,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
    spawnParts(casterX,bH*.38,'#4af0ff',16);
    spawnBeam(tx,bH*.38,casterX,bH*.38,'#4af0ff');
    checkWin(); if(!battleRunning) return;
  }

  targetState.hp=Math.max(0,targetState.hp-dmg);
  const rx=caster==='p1'?bW*.22:bW*.78;
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,rx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,rx);
  if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,rx);
  spawnParts(tx,ty,spell.col,impactCount);
  addFloat(tx,ty,'-'+dmg,spell.col,22);
  flash(spell.col);

  if(spell.element==='fire'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,ty+28,'🔰 Warded!','#ffcc44',10);
    } else {
      targetState.burn=BURN_ROUNDS;
      addFloat(tx,ty+28,'🔥 Burning!','#ff6622',10);
    }
  }
  if(spell.element==='ice'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,ty+28,'🔰 Warded!','#ffcc44',10);
    } else {
      targetState.frozen=Math.max(targetState.frozen,1);
      addFloat(tx,ty+28,'❄️ Frozen!','#88ddff',10);
    }
  }

  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
  checkWin();
}


function doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx){
  const basicSpell=casterCfg.spells.find(s=>s.id==='basicattack');
  let dmg=Math.round((basicSpell.dmg||9)*casterCfg.dmgMult);
  if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
  if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
  if(targetState.foresight){
    addFloat(tx,bH*.38-20,'🔮 Absorbed!','#ffcc44',15);
    spawnParts(tx,bH*.38,'#ffcc44',14);
    if(caster==='p1') anim('p1','cast',600); else anim('p2','cast',600);
    return;
  }
  if(targetState.invisible>0){
    addFloat(tx,bH*.38,'👻 Missed!','#b8a0e8',15);
    spawnParts(tx,bH*.38,'#b8a0e8',10);
    return;
  }
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,bH*.38,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,bH*.38,'#ffcc44',10);
    return;
  }
  if(targetState.blink>0&&_rng()<0.5){
    addFloat(tx,bH*.38,'💫 Blinked!','#cc99ff',18);
    spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
    flash('#9988cc');
    return;
  }
  const [fDmg,fSkin]=applyTargetSkins(targetState,dmg,!!basicSpell.physical);
  dmg=fDmg;
  if(fSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+fSkin+' Skin','#b08040',10);
  if(targetState.shield>0){
    const absorbed=Math.min(dmg,targetState.shieldHp);
    targetState.shieldHp-=absorbed; dmg-=absorbed;
    if(targetState.shieldHp<=0){
      targetState.shield=0; targetState.counter=false;
      addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
      spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
    } else {
      addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
      spawnParts(tx,bH*.38,'#4af0ff',8);
    }
  }
  targetState.hp=Math.max(0,targetState.hp-dmg);
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
  if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
  if(basicSpell.physical&&!basicSpell.piercesDischarge&&targetState.charge>0){
    applyDischarge(targetState,casterState,cx,tx);
  }
  spawnParts(tx,bH*.38,casterCfg.col,14);
  addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
  flash(casterCfg.col);
  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
}


function doRockfallHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx){
  let dmg=Math.round((casterCfg.rockfallDmg||9)*casterCfg.dmgMult);
  if(targetState.resist>0)       dmg=Math.round(dmg*0.67);
  if(targetState.frostArmor>0)   dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
  if(targetState.foresight){
    targetState.foresight=false;
    addFloat(tx,bH*.38,'🔮 Absorbed!','#ffcc44',13);
    spawnParts(tx,bH*.38,'#ffcc44',10);
    return;
  }
  if(targetState.invisible>0){
    addFloat(tx,bH*.38,'👻 Missed!','#b8a0e8',13);
    spawnParts(tx,bH*.38,'#b8a0e8',8);
    return;
  }
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,bH*.38,'💨 Dodged!','#ffcc44',13);
    spawnParts(tx,bH*.38,'#ffcc44',8);
    return;
  }
  if(targetState.blink>0&&_rng()<0.5){
    addFloat(tx,bH*.38,'💫 Blinked!','#cc99ff',15);
    spawnParts(tx,bH*.38,'#9988cc',14); spawnParts(tx,bH*.38,'#ffffff',5);
    flash('#9988cc');
    return;
  }
  const [rDmg,rSkin]=applyTargetSkins(targetState,dmg,true); // physical
  dmg=rDmg;
  if(rSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+rSkin+' Skin','#b08040',10);
  if(targetState.shield>0){
    const absorbed=Math.min(dmg,targetState.shieldHp);
    targetState.shieldHp-=absorbed; dmg-=absorbed;
    if(targetState.shieldHp<=0){
      targetState.shield=0; targetState.counter=false;
      addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',18);
      spawnParts(tx,bH*.38,'#4af0ff',18); spawnParts(tx,bH*.38,'#ffffff',6);
    } else {
      addFloat(tx,bH*.38-20,'🛡 -'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',9);
      spawnParts(tx,bH*.38,'#4af0ff',5);
    }
  }
  targetState.hp=Math.max(0,targetState.hp-dmg);
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
  if(targetState.dragonScales>0&&dmg>0) applyDragonScalesRetaliation(casterState,casterCfg,cx);
  if(targetState.charge>0) applyDischarge(targetState,casterState,cx,tx);
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    gs.parts.push({x:tx+Math.cos(a)*bH*.04,y:bH*.38+Math.sin(a)*bH*.03,
      col:i%2?'#b08040':'#8b6914',vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2-0.3,
      sz:2+_rng()*3,life:1,dec:.022});
  }
  spawnParts(tx,bH*.38,casterCfg.col,10);
  addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,16);
  flash(casterCfg.col);
  if(caster==='p1'){anim('p1','cast',600); anim('p2','hit',600);}
  else             {anim('p2','cast',600); anim('p1','hit',600);}
}


function applyTargetSkins(targetState,dmg,isPhysical){
  if(!isPhysical&&targetState.stonesoul>0) dmg=Math.round(dmg*0.6);
  let skinAbsorbed=0;
  if(targetState.stoneskin>0&&targetState.stoneskinHp>0){
    skinAbsorbed=Math.min(10,Math.min(targetState.stoneskinHp,dmg));
    targetState.stoneskinHp=Math.max(0,targetState.stoneskinHp-skinAbsorbed);
    dmg=Math.max(0,dmg-skinAbsorbed);
    if(targetState.stoneskinHp<=0) targetState.stoneskin=0;
  }
  return [dmg,skinAbsorbed];
}


function triggerCandleBurn(state,cx){
  state.burn=BURN_ROUNDS;
  addFloat(cx,bH*.38,'🕯️ Candle!','#ff6622',12);
  for(let i=0;i<8;i++){
    const a=-Math.PI/2+(-0.7+_rng()*1.4),sp=1.5+_rng()*2.5;
    gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,
      col:i%2?'#ff6622':'#ff9900',vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      sz:1.5+_rng()*2.5,life:1,dec:.02,noGrav:true});
  }
}


function applyFrostArmorRetaliation(casterState,targetCfg,cx){
  const retDmg=targetCfg.frostArmorRetaliationDmg||8;
  casterState.hp=Math.max(0,casterState.hp-retDmg);
  addFloat(cx,bH*.33,'❄️ Frost! −'+retDmg,'#88ddff',12);
  spawnParts(cx,bH*.38,'#88ddff',8);
}


function applyDischarge(targetState,casterState,casterX,targetX){
  const dischargeDmg=targetState.charge;
  targetState.charge=Math.floor(targetState.charge/2);
  casterState.hp=Math.max(0,casterState.hp-dischargeDmg);
  addFloat(casterX,bH*.33,'⚡ Discharge! −'+dischargeDmg,'#aaff44',14);
  spawnParts(casterX,bH*.38,'#aaff44',14);
  spawnBeam(targetX,bH*.38,casterX,bH*.38,'#aaff44');
  flash('#aaff44');
}


function applyFlameShieldRetaliation(casterState,cx){
  const fireDmg=16;
  casterState.hp=Math.max(0,casterState.hp-fireDmg);
  addFloat(cx,bH*.33,'🔥 Flame! −'+fireDmg,'#ff6622',12);
  spawnParts(cx,bH*.38,'#ff6600',8);
}


function applyDragonScalesRetaliation(casterState,targetCfg,cx){
  const fireDmg=targetCfg.dragonScalesRetaliationDmg||5;
  casterState.hp=Math.max(0,casterState.hp-fireDmg);
  addFloat(cx,bH*.33,'🐉 Scales! −'+fireDmg,'#cc6622',12);
  spawnParts(cx,bH*.38,'#cc6622',8);
}


function processBurn(target,tx,ty){
  if(target.burn<=0) return;
  target.hp=Math.max(0,target.hp-BURN_DMG);
  target.burn--;
  for(let i=0;i<14;i++){
    const a=-Math.PI/2+(-0.75+_rng()*1.5);
    const sp=2+_rng()*3.5;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:i%3?'#ff4400':'#ff9900',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*3,life:1,dec:.026+_rng()*.02});
  }
  addFloat(tx,ty,'🔥 -'+BURN_DMG,'#ff6622',13);
}


function processPoison(target,tx,ty){
  if(target.poison<=0) return;
  target.hp=Math.max(0,target.hp-POISON_DMG);
  target.poison--;
  for(let i=0;i<14;i++){
    const a=-Math.PI/2+(-0.75+_rng()*1.5);
    const sp=2+_rng()*3.5;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:i%3?'#55aa33':'#88dd44',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*3,life:1,dec:.026+_rng()*.02});
  }
  addFloat(tx,ty,'🧪 -'+POISON_DMG,'#88dd44',13);
}


function processVoidCollapse(target,tx,ty){
  if(target.voidCollapse<=0) return;
  target.voidCollapseTick++;
  const dmg=target.voidCollapseTick*VOID_COLLAPSE_DMG_STEP;
  target.hp=Math.max(0,target.hp-dmg);
  target.voidCollapse--;
  if(target.voidCollapse<=0) target.voidCollapseTick=0;
  for(let i=0;i<14;i++){
    const a=-Math.PI/2+(-0.75+_rng()*1.5);
    const sp=2+_rng()*3.5;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:i%3?'#6633aa':'#aa66ff',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*3,life:1,dec:.026+_rng()*.02});
  }
  addFloat(tx,ty,'🌀 -'+dmg,'#aa66ff',13);
}


function processRegen(target,tx,ty){
  if(!target.regen) return;
  const healThis=Math.ceil(target.regen.remaining/target.regen.turns);
  target.regen.remaining-=healThis;
  target.regen.turns--;
  if(target.regen.turns<=0) target.regen=null;
  target.hp=Math.min(target.maxHp,target.hp+healThis);
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.8+_rng()*1.8;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:i%2?'#44ee88':'#88ffcc',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.5,sz:1.5+_rng()*2.5,life:1,dec:.011+_rng()*.01,noGrav:true});
  }
  addFloat(tx,ty,'+'+healThis+' 💚','#44cc88',12);
}


function processVineWhip(target,tx,ty){
  if(!target.vineWhip||target.vineWhip<=0) return;
  let dmg=7;
  target.vineWhip--;
  if(target.shield>0){
    const absorbed=Math.min(dmg,target.shieldHp);
    target.shieldHp-=absorbed; dmg-=absorbed;
    if(target.shieldHp<=0){
      target.shield=0; target.counter=false;
      addFloat(tx,ty-20,'🛡 SHATTERED!','#88ffff',18);
      spawnParts(tx,ty,'#4af0ff',16);
    } else {
      addFloat(tx,ty-20,'🛡 −'+absorbed+' ('+target.shieldHp+' left)','#4af0ff',10);
      spawnParts(tx,ty,'#4af0ff',6);
    }
  }
  if(dmg>0){
    target.hp=Math.max(0,target.hp-dmg);
    for(let i=0;i<10;i++){
      const a=_rng()*Math.PI*2;
      gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:i%2?'#44cc88':'#22aa66',
        vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2-0.5,sz:2+_rng()*2.5,life:1,dec:.02});
    }
    addFloat(tx,ty,'🌱 -'+dmg,'#44cc88',13);
  }
}


function processBlizzard(target,tx,ty){
  if(!target.blizzard||target.blizzard<=0) return;
  target.hp=Math.max(0,target.hp-5);
  const drained=Math.min(2,target.mana);
  target.mana=Math.max(0,target.mana-drained);
  target.blizzard--;
  for(let i=0;i<10;i++){
    const a=_rng()*Math.PI*2;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:'#88ddff',
      vx:Math.cos(a)*0.6,vy:Math.sin(a)*0.6-1.8,sz:1.5+_rng()*2,life:1,dec:.016,noGrav:true});
  }
  addFloat(tx,ty,'❄️ -5','#88ddff',13);
  if(drained>0) addFloat(tx,ty+22,'−'+drained+' Mana','#88ddff',11);
  if(_rng()<0.15&&target.frozen<=0) target.frozen=1;
}


function processPlagueDoT(target,tx,ty){
  if(!target.plague||target.plague<=0) return;
  const dmg=target.plagueDoTDmg||6;
  target.hp=Math.max(0,target.hp-dmg);
  for(let i=0;i<8;i++){
    const a=_rng()*Math.PI*2;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:'#44bb22',
      vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-1,sz:1.5+_rng()*2,life:1,dec:.02,noGrav:true});
  }
  addFloat(tx,ty,'☠️ −'+dmg+' Plague','#55aa33',12);
}


function processBoneTotem(target,tx,ty){
  if(!target.boneTotem||target.boneTotem<=0) return;
  const healAmt=5;
  target.hp=Math.min(target.maxHp,target.hp+healAmt);
  for(let i=0;i<6;i++){
    const a=-Math.PI/2+(_rng()-.5)*1.2;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.04,y:ty,col:'#55aa33',
      vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-0.3,sz:1.5+_rng()*2,life:1,dec:.016,noGrav:true});
  }
  addFloat(tx,ty,'+'+healAmt+' 💀','#55aa33',11);
}


function processBlades(casterWho,targetState,tx,ty){
  const casterState=gs[casterWho];
  if(!casterState.blades||casterState.blades<=0) return;
  const cfg=casterWho==='p1'?p1Cfg:p2Cfg;
  const dmgPer=cfg.bladeDmgPerTurn||4;
  const total=dmgPer*casterState.blades;
  const targetWho=casterWho==='p1'?'p2':'p1';
  dealDmgToPlayer(targetWho,total,tx,ty,false,false);
  for(let i=0;i<casterState.blades*4;i++){
    const a=_rng()*Math.PI*2;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:'#aaaadd',
      vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2-0.5,sz:1.5+_rng()*2,life:1,dec:.022});
  }
  addFloat(tx,ty,'🗡️ −'+total+' ('+casterState.blades+'× blade)','#66aa88',12);
}


function processSkeletonStrikes(casterWho,targetState,tx,ty){
  const casterState=gs[casterWho];
  if(!casterState.skeletons||casterState.skeletons.length===0) return;
  const cfg=casterWho==='p1'?p1Cfg:p2Cfg;
  const dmgPer=cfg.skelDmgPerTurn||7;
  const targetWho=casterWho==='p1'?'p2':'p1';
  casterState.skeletons.forEach((_skel,i)=>{
    const yOff=bH*(i===0?0:0.05);
    const skDmg=dmgPer;
    dealDmgToPlayer(targetWho,skDmg,tx,ty+yOff,false,false);
    for(let j=0;j<6;j++){
      const a=_rng()*Math.PI*2;
      gs.parts.push({x:tx+(_rng()-.5)*bH*.04,y:ty+yOff,col:'#9966cc',
        vx:Math.cos(a)*1,vy:Math.sin(a)*1-0.5,sz:1.5+_rng()*2,life:1,dec:.022});
    }
    addFloat(tx,ty+yOff-16,'💀 −'+skDmg,'#8844cc',11);
  });
}


function processSimulacra(ownerWho,targetState,tx,ty){
  const ownerState=gs[ownerWho];
  if(!ownerState.simulacra||ownerState.simulacra.length===0) return;
  const targetWho=ownerWho==='p1'?'p2':'p1';
  const ownerCfg=ownerWho==='p1'?p1Cfg:p2Cfg;
  ownerState.simulacra.forEach((sim,idx)=>{
    const simY=ty-bH*0.07*idx;
    if(sim.mana>=3&&_rng()<0.55){
      // Try to cast: prefer Dispel if opponent has buffs, else random global or Feint
      const tState=gs[targetWho];
      const hasOppBuff=tState.shield>0||tState.foresight||tState.regen||tState.resist>0||tState.ward>0||tState.stoneskin>0||tState.stonesoul>0||tState.boneTotem>0;
      let action=null;
      if(hasOppBuff&&_rng()<0.6){ action='dispel'; }
      else if(_rng()<0.4){ action='feint'; }
      else {
        const pool=['fire','ice','lightning','arcane'];
        action=pool[Math.floor(_rng()*pool.length)];
      }
      if(action==='feint'&&sim.mana>=2){
        sim.mana-=2;
        const fDmg=ownerCfg.feintDmg||15;
        dealDmgToPlayer(targetWho,fDmg,tx,simY,true,true);
        addFloat(tx,simY,'👁 Feint! −'+fDmg,'#b86ef4',13);
        spawnParts(tx,simY,'#b86ef4',10);
      } else if(action==='dispel'&&sim.mana>=3){
        sim.mana-=3;
        // Strip a random buff
        const BUFF_KEYS=['shield','foresight','regen','resist','frostArmor','flameShield','empowered','ward','haste','blink','invisible','counter','stoneskin','stonesoul','boneTotem','blades'];
        const active=BUFF_KEYS.filter(k=>tState[k]&&tState[k]!==false&&tState[k]!==null&&tState[k]!==0&&!(Array.isArray(tState[k])&&tState[k].length===0));
        if(active.length>0&&_rng()<0.7){
          const stripped=active[Math.floor(_rng()*active.length)];
          if(stripped==='shield'){tState.shield=0;tState.shieldHp=0;tState.counter=false;}
          else if(stripped==='foresight') tState.foresight=false;
          else if(stripped==='regen') tState.regen=null;
          else if(stripped==='empowered') tState.empowered=false;
          else if(stripped==='blades') tState.blades=0;
          else tState[stripped]=0;
          addFloat(tx,simY,'👁 '+stripped+' Stripped!','#b86ef4',12);
          spawnParts(tx,simY,'#b86ef4',10);
        }
      } else {
        // Global spell — simplified direct damage
        const dmgMap={fire:14,ice:12,lightning:18,arcane:Math.round(15+_rng()*20)};
        const glDmg=dmgMap[action]||12;
        sim.mana-=3;
        dealDmgToPlayer(targetWho,glDmg,tx,simY,false,false);
        const cols={fire:'#ff6622',ice:'#88ddff',lightning:'#aaff44',arcane:'#9944cc'};
        spawnParts(tx,simY,cols[action]||'#b86ef4',14);
        addFloat(tx,simY,'👁 −'+glDmg+' ('+action+')','#b86ef4',12);
      }
    } else {
      // Channel
      sim.mana=Math.min(20,sim.mana+(ownerCfg.simulacrumChannelAmt||5));
      addFloat(tx,simY,'👁 Sim +mana','#b86ef4',9);
    }
  });
}


function absorbWithSkeletons(who,dmg,x,y){
  const state=gs[who];
  if(!state.skeletons||state.skeletons.length===0) return dmg;
  const cfg=who==='p1'?p1Cfg:p2Cfg;
  const healAmt=cfg.skelHealOnDeath||8;
  while(state.skeletons.length>0&&dmg>0){
    const skel=state.skeletons[0];
    if(skel.hp>=dmg){
      skel.hp-=dmg;
      addFloat(x,y-20,'💀 −'+dmg+' (Skeleton '+(skel.hp)+' HP)','#8844cc',10);
      if(skel.hp<=0){
        state.skeletons.shift();
        state.hp=Math.min(state.maxHp,state.hp+healAmt);
        addFloat(x,y-35,'💀 Skeleton Slain! +'+healAmt+' HP','#8844cc',12);
        spawnParts(x,y,'#8844cc',10);
      }
      return 0;
    } else {
      dmg-=skel.hp;
      state.skeletons.shift();
      state.hp=Math.min(state.maxHp,state.hp+healAmt);
      addFloat(x,y-35,'💀 Skeleton Slain! +'+healAmt+' HP','#8844cc',12);
      spawnParts(x,y,'#8844cc',10);
    }
  }
  return dmg;
}


function trySimulacrumRedirect(who,dmg,x,y){
  const state=gs[who];
  const key=who==='p1'?p1Key:p2Key;
  if(key!=='mirel'||!state.simulacra||state.simulacra.length===0) return dmg;
  for(let i=0;i<state.simulacra.length;i++){
    if(_rng()<0.5){
      const sim=state.simulacra[i];
      sim.hp-=dmg;
      addFloat(x,y-20,'👁 −'+dmg+' (Simulacrum)','#b86ef4',12);
      if(sim.hp<=0){
        state.simulacra.splice(i,1);
        addFloat(x,y-36,'👁 Simulacrum Shattered!','#b86ef4',14);
        spawnParts(x,y,'#b86ef4',14);
      }
      return 0;
    }
  }
  return dmg;
}


function executeQueuedSpell(who, action, cb){
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const cx=who==='p1'?bW*.22:bW*.78;
  const tx=who==='p1'?bW*.78:bW*.22;

  if(action.type==='el'){ executeElemental(who,action,cb); return; }

  if(action.type==='__frozen__'){
    addFloat(cx,bH*.38,'❄️ Frozen — turn skipped!','#88ddff',13);
    combatTimeout(cb,1200);
    return;
  }

  // Agony: damage for any non-channel action
  if(action.type!=='channel'&&whoState.agony>0){
    const agonDmg=whoState.agonyDmg||12;
    whoState.hp=Math.max(0,whoState.hp-agonDmg);
    addFloat(cx,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(cx,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }

  if(action.type==='channel'){
    let channelGain=action.channelGain!=null?action.channelGain:(whoState.timeDrain>0?2:whoCfg.channelAmt);
    if(whoState.corruption>0){ const d=Math.min(channelGain,2); channelGain=Math.max(0,channelGain-2); addFloat(cx,bH*.5,'☠️ −'+d+' Corrupted!','#9944cc',12); }
    if(whoState.maggotCloud>0){ const drain=Math.min(3,channelGain); channelGain=Math.max(0,channelGain-drain); addFloat(cx,bH*.5,'🪲 −'+drain+' Drained!','#55aa33',12); }
    whoState.mana=Math.min(MAX_MANA,whoState.mana+channelGain);
    addFloat(cx,bH*.38,'+'+(channelGain)+' Mana','#88aaff',13);
    if(whoState.candle>0) triggerCandleBurn(whoState,cx);
    anim(who,'cast',700);
    combatTimeout(cb,800);
    return;
  }

  // Universal spell
  const spell=SPELLS.find(s=>s.element===action.type);
  if(spell){
    if(!action.ok){
      addFloat(cx,bH*.33,'Fizzled!','#ff8844',13);
      whoState.mana=Math.max(0,whoState.mana-1);
      combatTimeout(cb,600);
      return;
    }
    if(action.silenced){
      showSilenceBlock(cx,bH*.33); anim(who,'cast',600);
      combatTimeout(cb,1200);
      return;
    }
    whoState.mana-=spell.cost;
    if(whoState.invisible>0){ whoState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    if(action.type==='dispel'&&action.dispelSelf){
      castSpell(spell,whoState,cx,bH*.38,who);
      combatTimeout(cb,500);
    } else {
      spawnProj(cx,bH*.38,tx,bH*.38,spell.element,spell.col,()=>{
        castSpell(spell,oppState,tx,bH*.38,who);
        combatTimeout(cb,500);
      });
    }
    return;
  }

  // Character spell
  const charSpell=whoCfg.spells&&whoCfg.spells.find(s=>s.id===action.type);
  if(charSpell){
    if(!action.ok){
      addFloat(cx,bH*.33,'Ritual Failed!','#ff8844',13);
      whoState.mana=Math.max(0,whoState.mana-1);
      combatTimeout(cb,600);
      return;
    }
    if(action.silenced){
      showSilenceBlock(cx,bH*.33); anim(who,'cast',600);
      combatTimeout(cb,1200);
      return;
    }
    // resolveCharSpell ends by calling endMyTurn/finishAI — intercept with simCallback
    simCallback=cb;
    resolveCharSpell(action.type,who,action.perfect||false);
    return;
  }

  combatTimeout(cb,200);
}


function aiDecideEasy(who){
  const opp=who==='p2'?'p1':'p2';
  const aiCfg=who==='p2'?p2Cfg:p1Cfg;
  const aiKey=who==='p2'?p2Key:p1Key;
  const ai=gs[who];
  const allSpells=[...SPELLS,...(aiCfg.spells||[])];
  const available=allSpells.filter(s=>{
    if(ai.mana<s.cost) return false;
    if(s.id&&charSpellBlocked(s.id,ai,aiCfg,gs[opp])) return false;
    if(s.aiHint==='mana_restore'&&ai.mana>=10) return false;
    if(s.aiHint==='mana_steal'&&!ai.invisible) return false;
    if(s.aiHint==='drain'&&ai.hp>ai.maxHp*0.75) return false;
    if(ai.frenzied>0&&s.element) return false;
    if(gs[opp].invisible>0&&(s.element&&!s.area&&s.element!=='dispel'&&s.element!=='manaburn'||s.id==='basicattack'||s.id==='charge'||s.id==='entangle'||s.id==='timedrain'||s.id==='drain'||s.id==='vinewhip'||s.id==='agony'||s.id==='silence'||s.id==='corruption'||s.id==='rockfall')) return false;
    return true;
  });
  const charSpells=available.filter(s=>s.id);
  const universalSpells=available.filter(s=>s.element);
  let chosen=null, aiDispelSelf=false;
  if(ai.enthralled>0) return {chosen:null, aiDispelSelf:false, forceChannel:true};
  if(aiKey==='mordant'&&ai.agony>0) chosen=null;
  else if(aiKey==='mordant'){
    const hexSpells=charSpells.filter(s=>['agony','silence','corruption'].includes(s.id));
    if(hexSpells.length>0&&_rng()<0.65) chosen=hexSpells[Math.floor(_rng()*hexSpells.length)];
  }
  if(aiKey==='mary'){
    const hasDebuff=ai.burn>0||ai.poison>0||ai.voidCollapse>0||ai.frozen>0||ai.blizzard>0||ai.vineWhip>0||ai.timeDrain>0||ai.conductivity>0||ai.candle>0||ai.agony>0||ai.corruption>0||ai.silence>0;
    const canPurge=charSpells.find(s=>s.id==='purge');
    const canHeal=charSpells.find(s=>s.id==='divineheal');
    if(hasDebuff&&canPurge) chosen=canPurge;
    else if(ai.hp<ai.maxHp*0.60&&canHeal) chosen=canHeal;
  }
  if(aiKey==='zacharius'){
    const chainReady=charSpells.find(s=>s.id==='chainlightning');
    const canGalvanize=charSpells.find(s=>s.id==='galvanize');
    const canConductivity=charSpells.find(s=>s.id==='conductivity');
    if(chainReady&&ai.charge>=(aiCfg.chainLightningChargeCost||8)) chosen=chainReady;
    else if(canConductivity&&!gs[opp].conductivity&&ai.mana>=canConductivity.cost) chosen=canConductivity;
    else if(canGalvanize) chosen=canGalvanize;
  }
  if(aiKey==='durin'){
    const canStoneskin=charSpells.find(s=>s.id==='stoneskin');
    const canStonesoul=charSpells.find(s=>s.id==='stonesoul');
    const canRockfall=charSpells.find(s=>s.id==='rockfall');
    if(ai.stoneskin<=0&&canStoneskin&&ai.hp<ai.maxHp*0.85) chosen=canStoneskin;
    else if(ai.stonesoul<=0&&canStonesoul&&ai.hp<ai.maxHp*0.70) chosen=canStonesoul;
    else if(canRockfall&&_rng()<0.55) chosen=canRockfall;
  }
  if(aiKey==='weizan'){
    const canConjure=charSpells.find(s=>s.id==='conjureblade');
    const canBladestorm=charSpells.find(s=>s.id==='bladestorm');
    const canPatience=charSpells.find(s=>s.id==='ironpatience');
    if(canBladestorm&&ai.blades>=(aiCfg.maxBlades||3)) chosen=canBladestorm;
    else if(canPatience&&ai.hp<ai.maxHp*0.60&&!ai.resist) chosen=canPatience;
    else if(canConjure&&ai.blades<(aiCfg.maxBlades||3)) chosen=canConjure;
  }
  if(aiKey==='gretch'){
    const canPlague=charSpells.find(s=>s.id==='plague');
    const canMaggot=charSpells.find(s=>s.id==='maggotcloud');
    const canTotem=charSpells.find(s=>s.id==='bonetotem');
    if(canPlague&&!gs[opp].plague) chosen=canPlague;
    else if(canTotem&&!ai.boneTotem&&ai.hp<ai.maxHp*0.75) chosen=canTotem;
    else if(canMaggot&&!gs[opp].maggotCloud) chosen=canMaggot;
  }
  if(aiKey==='valdris'){
    const canRaise=charSpells.find(s=>s.id==='raisedead');
    const canDrain=charSpells.find(s=>s.id==='necroticdrain');
    const canReinforce=charSpells.find(s=>s.id==='reinforce');
    const skelCount=ai.skeletons?ai.skeletons.length:0;
    const skelHpLow=ai.skeletons&&ai.skeletons.some(s=>s.hp<(aiCfg.skelMaxHp||25)*0.5);
    if(canReinforce&&skelHpLow) chosen=canReinforce;
    else if(canRaise&&skelCount<2) chosen=canRaise;
    else if(canDrain&&ai.hp<ai.maxHp*0.65) chosen=canDrain;
  }
  if(aiKey==='mirel'){
    const canSim=charSpells.find(s=>s.id==='simulacrum');
    const canBewitch=charSpells.find(s=>s.id==='bewitch');
    const canFeint=charSpells.find(s=>s.id==='feint');
    const simCount=ai.simulacra?ai.simulacra.length:0;
    if(canSim&&simCount<2) chosen=canSim;
    else if(canBewitch&&!gs[opp].bewitched&&_rng()<0.55) chosen=canBewitch;
    else if(canFeint&&ai.hp<ai.maxHp*0.65) chosen=canFeint;
  }
  if(aiKey==='thessaly'){
    const canEnthral=charSpells.find(s=>s.id==='enthral');
    const canWeave=charSpells.find(s=>s.id==='arcaneweave');
    const canSpellbind=charSpells.find(s=>s.id==='spellbind');
    if(canSpellbind&&!gs[opp].spellbound&&_rng()<0.60) chosen=canSpellbind;
    else if(canWeave&&!ai.arcaneWeave) chosen=canWeave;
    else if(canEnthral&&!gs[opp].enthralled&&_rng()<0.50) chosen=canEnthral;
  }
  if(aiKey==='korvath'){
    const canScales=charSpells.find(s=>s.id==='dragonscales');
    const canWyrmfire=charSpells.find(s=>s.id==='wyrmfirebreath');
    const canWrath=charSpells.find(s=>s.id==='ancientwrath');
    if(canWrath&&gs[opp].hp<=(aiCfg.ancientWrathDmg||35)) chosen=canWrath;
    else if(canScales&&ai.resist<=0&&ai.hp<ai.maxHp*0.75) chosen=canScales;
    else if(canWyrmfire&&gs[opp].burn<=0) chosen=canWyrmfire;
  }
  if(aiKey==='fizzwick'){
    const canBomb=charSpells.find(s=>s.id==='causticbomb');
    const canTonic=charSpells.find(s=>s.id==='volatiletonic');
    const canConcoction=charSpells.find(s=>s.id==='unstableconcoction');
    if(canTonic&&ai.hp<ai.maxHp*0.5&&!ai.empowered) chosen=canTonic;
    else if(canBomb&&gs[opp].poison<=0) chosen=canBomb;
    else if(canConcoction) chosen=canConcoction;
  }
  if(aiKey==='nyxara'){
    const canSingularity=charSpells.find(s=>s.id==='singularity');
    const canGravityWell=charSpells.find(s=>s.id==='gravitywell');
    const canEventHorizon=charSpells.find(s=>s.id==='eventhorizon');
    if(canEventHorizon&&ai.mana>=canEventHorizon.cost) chosen=canEventHorizon;
    else if(canGravityWell) chosen=canGravityWell;
    else if(canSingularity&&gs[opp].voidCollapse<=0) chosen=canSingularity;
  }
  if(!chosen){
    const dispelSpell=universalSpells.find(s=>s.element==='dispel');
    if(dispelSpell){
      const needsCleanse=ai.agony>0||ai.corruption>0||ai.silence>2||ai.blizzard>1||ai.vineWhip>1||ai.candle>1;
      const oppHasKeyBuff=gs[opp].shield>0||gs[opp].foresight||gs[opp].resist>1||gs[opp].invisible>1||gs[opp].stoneskin>0||gs[opp].stonesoul>0||gs[opp].ward>0||gs[opp].counter;
      if(needsCleanse||(oppHasKeyBuff&&_rng()<0.35)){ chosen=dispelSpell; aiDispelSelf=needsCleanse; }
    }
  }
  if(!chosen){
    const manaBurnSpell=universalSpells.find(s=>s.element==='manaburn');
    if(manaBurnSpell&&gs[opp].mana>=8) chosen=manaBurnSpell;
  }
  if(!chosen&&available.length>0){
    if(charSpells.length>0&&_rng()<0.40){
      chosen=charSpells[Math.floor(_rng()*charSpells.length)];
    } else if(universalSpells.length>0){
      if(gs[opp].shield>0&&universalSpells.find(s=>s.element==='lightning')) chosen=universalSpells.find(s=>s.element==='lightning');
      else if(!gs[opp].shield&&universalSpells.find(s=>s.element==='fire')) chosen=universalSpells.find(s=>s.element==='fire');
      else if(gs[opp].mana>=3&&universalSpells.find(s=>s.element==='ice')) chosen=universalSpells.find(s=>s.element==='ice');
      else { const randPool=universalSpells.filter(s=>s.element!=='dispel'); if(randPool.length>0) chosen=randPool[Math.floor(_rng()*randPool.length)]; }
    } else { chosen=charSpells[Math.floor(_rng()*charSpells.length)]; }
  }
  return {chosen, aiDispelSelf};
}


function aiDecideNormal(who){
  const opp=who==='p2'?'p1':'p2';
  const aiCfg=who==='p2'?p2Cfg:p1Cfg;
  const aiKey=who==='p2'?p2Key:p1Key;
  const ai=gs[who];
  const p1=gs[opp];
  const allSpells=[...SPELLS,...(aiCfg.spells||[])];
  const available=allSpells.filter(s=>{
    if(ai.mana<s.cost) return false;
    if(s.id&&charSpellBlocked(s.id,ai,aiCfg,p1)) return false;
    if(s.aiHint==='mana_restore'&&ai.mana>=10) return false;
    if(s.aiHint==='mana_steal'&&!ai.invisible) return false;
    if(s.aiHint==='drain'&&aiKey!=='mal'&&ai.hp>ai.maxHp*0.75) return false;
    if(ai.frenzied>0&&s.element) return false;
    if(p1.invisible>0&&(s.element&&!s.area&&s.element!=='dispel'&&s.element!=='manaburn'||s.id==='basicattack'||s.id==='charge'||s.id==='entangle'||s.id==='timedrain'||s.id==='drain'||s.id==='vinewhip'||s.id==='agony'||s.id==='silence'||s.id==='corruption'||s.id==='rockfall')) return false;
    return true;
  });
  const charSpells=available.filter(s=>s.id);
  const universalSpells=available.filter(s=>s.element);
  let chosen=null, aiDispelSelf=false, forceChannel=false;
  if(ai.enthralled>0) return {chosen:null, aiDispelSelf:false, forceChannel:true};
  if(aiKey==='eldrad'&&!chosen){
    const canShield=charSpells.find(s=>s.id==='shield');
    const canCounter=charSpells.find(s=>s.id==='counter');
    const canWard=charSpells.find(s=>s.id==='ward');
    if(canShield) chosen=canShield;
    else if(canCounter) chosen=canCounter;
    else if(canWard) chosen=canWard;
    else if(!ai.shieldHp&&ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='mal'&&!chosen){
    const canBloodPact=charSpells.find(s=>s.id==='bloodpact');
    const canEmpower=charSpells.find(s=>s.id==='empower');
    const canDrain=charSpells.find(s=>s.id==='drain');
    if(ai.empowered&&canDrain) chosen=canDrain;
    else if(!ai.empowered&&canEmpower) chosen=canEmpower;
    else if(canBloodPact&&ai.mana<5&&ai.hp>(aiCfg.bpCost||22)+15) chosen=canBloodPact;
    else if(canDrain) chosen=canDrain;
    else if(ai.empowered&&ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='sylvara'&&!chosen){
    const canEntangle=charSpells.find(s=>s.id==='entangle');
    const canVineWhip=charSpells.find(s=>s.id==='vinewhip');
    const canRegen=charSpells.find(s=>s.id==='heal');
    if(ai.hp<ai.maxHp*0.50&&canRegen) chosen=canRegen;
    else if(canEntangle) chosen=canEntangle;
    else if(canVineWhip&&!p1.shield) chosen=canVineWhip;
    else if(!ai.regen&&canRegen&&ai.hp<ai.maxHp*0.80) chosen=canRegen;
    else if(!ai.regen&&ai.hp<ai.maxHp*0.65&&ai.mana<4&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='aurelia'&&!chosen){
    const canForesight=charSpells.find(s=>s.id==='foresight');
    const canTimeDrain=charSpells.find(s=>s.id==='timedrain');
    const canHaste=charSpells.find(s=>s.id==='haste');
    if(canForesight) chosen=canForesight;
    else if(canTimeDrain) chosen=canTimeDrain;
    else if(canHaste) chosen=canHaste;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='gnash'&&!chosen){
    const canWarpaint=charSpells.find(s=>s.id==='warpaint');
    const canFrenzy=charSpells.find(s=>s.id==='frenzy');
    const canCharge=charSpells.find(s=>s.id==='charge');
    if(canWarpaint) chosen=canWarpaint;
    else if(ai.resist>0){ if(canFrenzy) chosen=canFrenzy; else if(canCharge) chosen=canCharge; }
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.55) forceChannel=true;
    else { if(canFrenzy) chosen=canFrenzy; else if(canCharge) chosen=canCharge; }
  }
  if(aiKey==='cinder'&&!chosen){
    const canCandle=charSpells.find(s=>s.id==='candle');
    const canFlameShield=charSpells.find(s=>s.id==='flameshield');
    const canFireball=charSpells.find(s=>s.id==='fireball');
    if(canCandle) chosen=canCandle;
    else if(canFlameShield) chosen=canFlameShield;
    else if(canFireball) chosen=canFireball;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='skadi'&&!chosen){
    const canBlizzard=charSpells.find(s=>s.id==='blizzard');
    const canFrostArmor=charSpells.find(s=>s.id==='frostarmor');
    const canIceLance=charSpells.find(s=>s.id==='icelance');
    if(canBlizzard) chosen=canBlizzard;
    else if(canFrostArmor) chosen=canFrostArmor;
    else if(canIceLance) chosen=canIceLance;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.65) forceChannel=true;
  }
  if(aiKey==='zacharius'&&!chosen){
    const chainReady=charSpells.find(s=>s.id==='chainlightning');
    const canGalvanize=charSpells.find(s=>s.id==='galvanize');
    const canConductivity=charSpells.find(s=>s.id==='conductivity');
    if(chainReady&&ai.charge>=(aiCfg.chainLightningChargeCost||8)) chosen=chainReady;
    else if(canConductivity&&(!p1.conductivity||p1.conductivity<=1)) chosen=canConductivity;
    else if(canGalvanize) chosen=canGalvanize;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='mary'&&!chosen){
    const canRadiant=charSpells.find(s=>s.id==='radiant');
    const canHeal=charSpells.find(s=>s.id==='divineheal');
    const canPurge=charSpells.find(s=>s.id==='purge');
    const hasDebuff=ai.burn>0||ai.poison>0||ai.voidCollapse>0||ai.frozen>0||ai.blizzard>0||ai.vineWhip>0||ai.timeDrain>0||ai.conductivity>0||ai.candle>0||ai.agony>0||ai.corruption>0||ai.silence>0;
    if(hasDebuff&&canPurge) chosen=canPurge;
    else if(ai.hp<ai.maxHp*0.55&&canHeal) chosen=canHeal;
    else if(canRadiant&&(p1.shield>0||p1.resist>0||p1.frostArmor>0)) chosen=canRadiant;
    else if(canRadiant&&_rng()<0.55) chosen=canRadiant;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='mordant'&&!chosen){
    const canCorruption=charSpells.find(s=>s.id==='corruption');
    const canAgony=charSpells.find(s=>s.id==='agony');
    const canSilence=charSpells.find(s=>s.id==='silence');
    if(!ai.agony){
      if(canCorruption) chosen=canCorruption;
      else if(canAgony) chosen=canAgony;
      else if(canSilence) chosen=canSilence;
      else if(ai.mana<2&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
    }
  }
  if(aiKey==='ponder'&&!chosen){
    const canVanish=charSpells.find(s=>s.id==='vanish');
    const canManaSiphon=charSpells.find(s=>s.id==='manasiphon');
    const canBlink=charSpells.find(s=>s.id==='blink');
    if(ai.invisible>0){ if(canManaSiphon) chosen=canManaSiphon; }
    else { if(canVanish) chosen=canVanish; else if(canBlink) chosen=canBlink; else if(ai.mana<2&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true; }
  }
  if(aiKey==='durin'&&!chosen){
    const canStoneskin=charSpells.find(s=>s.id==='stoneskin');
    const canStonesoul=charSpells.find(s=>s.id==='stonesoul');
    const canRockfall=charSpells.find(s=>s.id==='rockfall');
    if(canStoneskin) chosen=canStoneskin;
    else if(canStonesoul) chosen=canStonesoul;
    else if(canRockfall&&_rng()<0.70) chosen=canRockfall;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.40&&_rng()<0.65) forceChannel=true;
  }
  if(aiKey==='weizan'&&!chosen){
    const canConjure=charSpells.find(s=>s.id==='conjureblade');
    const canBladestorm=charSpells.find(s=>s.id==='bladestorm');
    const canPatience=charSpells.find(s=>s.id==='ironpatience');
    if(canBladestorm&&ai.blades>=(aiCfg.maxBlades||3)) chosen=canBladestorm;
    else if(canPatience&&ai.hp<ai.maxHp*0.55&&!ai.resist) chosen=canPatience;
    else if(canConjure&&ai.blades<(aiCfg.maxBlades||3)) chosen=canConjure;
    else if(ai.mana<2&&ai.hp>ai.maxHp*0.40&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='gretch'&&!chosen){
    const canPlague=charSpells.find(s=>s.id==='plague');
    const canMaggot=charSpells.find(s=>s.id==='maggotcloud');
    const canTotem=charSpells.find(s=>s.id==='bonetotem');
    if(canPlague&&!p1.plague) chosen=canPlague;
    else if(canTotem&&!ai.boneTotem&&ai.hp<ai.maxHp*0.70) chosen=canTotem;
    else if(canMaggot&&!p1.maggotCloud) chosen=canMaggot;
    else if(ai.mana<2&&ai.hp>ai.maxHp*0.40&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='valdris'&&!chosen){
    const canRaise=charSpells.find(s=>s.id==='raisedead');
    const canDrain=charSpells.find(s=>s.id==='necroticdrain');
    const canReinforce=charSpells.find(s=>s.id==='reinforce');
    const skelCount=ai.skeletons?ai.skeletons.length:0;
    const skelHpLow=ai.skeletons&&ai.skeletons.some(s=>s.hp<(aiCfg.skelMaxHp||25)*0.5);
    if(canReinforce&&skelHpLow) chosen=canReinforce;
    else if(canRaise&&skelCount<2) chosen=canRaise;
    else if(canDrain&&ai.hp<ai.maxHp*0.60) chosen=canDrain;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.40&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='mirel'&&!chosen){
    const canSim=charSpells.find(s=>s.id==='simulacrum');
    const canBewitch=charSpells.find(s=>s.id==='bewitch');
    const canFeint=charSpells.find(s=>s.id==='feint');
    const simCount=ai.simulacra?ai.simulacra.length:0;
    if(canSim&&simCount<2) chosen=canSim;
    else if(canBewitch&&!p1.bewitched&&_rng()<0.60) chosen=canBewitch;
    else if(canFeint&&ai.hp<ai.maxHp*0.60) chosen=canFeint;
    else if(ai.mana<2&&ai.hp>ai.maxHp*0.40&&_rng()<0.50) forceChannel=true;
  }
  if(aiKey==='thessaly'&&!chosen){
    const canEnthral=charSpells.find(s=>s.id==='enthral');
    const canWeave=charSpells.find(s=>s.id==='arcaneweave');
    const canSpellbind=charSpells.find(s=>s.id==='spellbind');
    if(canSpellbind&&!p1.spellbound&&_rng()<0.65) chosen=canSpellbind;
    else if(canWeave&&!ai.arcaneWeave) chosen=canWeave;
    else if(canEnthral&&!p1.enthralled&&_rng()<0.55) chosen=canEnthral;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='korvath'&&!chosen){
    const canScales=charSpells.find(s=>s.id==='dragonscales');
    const canWyrmfire=charSpells.find(s=>s.id==='wyrmfirebreath');
    const canWrath=charSpells.find(s=>s.id==='ancientwrath');
    if(canWrath&&p1.hp<=(aiCfg.ancientWrathDmg||35)) chosen=canWrath;
    else if(canScales&&ai.resist<=0&&ai.hp<ai.maxHp*0.75) chosen=canScales;
    else if(canWyrmfire&&p1.burn<=0) chosen=canWyrmfire;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.45) forceChannel=true;
  }
  if(aiKey==='nyxara'&&!chosen){
    const canSingularity=charSpells.find(s=>s.id==='singularity');
    const canGravityWell=charSpells.find(s=>s.id==='gravitywell');
    const canEventHorizon=charSpells.find(s=>s.id==='eventhorizon');
    if(canEventHorizon&&ai.mana>=canEventHorizon.cost) chosen=canEventHorizon;
    else if(canGravityWell&&ai.mana>=canGravityWell.cost) chosen=canGravityWell;
    else if(canSingularity&&p1.voidCollapse<=0&&ai.mana>=canSingularity.cost) chosen=canSingularity;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.45) forceChannel=true;
  }
  if(aiKey==='fizzwick'&&!chosen){
    const canBomb=charSpells.find(s=>s.id==='causticbomb');
    const canTonic=charSpells.find(s=>s.id==='volatiletonic');
    const canConcoction=charSpells.find(s=>s.id==='unstableconcoction');
    if(canTonic&&ai.hp<ai.maxHp*0.5&&!ai.empowered) chosen=canTonic;
    else if(canBomb&&p1.poison<=0&&ai.mana>=canBomb.cost) chosen=canBomb;
    else if(canConcoction&&ai.mana>=canConcoction.cost&&_rng()<0.55) chosen=canConcoction;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.45) forceChannel=true;
  }
  if(!chosen){
    const dispelSpell=universalSpells.find(s=>s.element==='dispel');
    if(dispelSpell){
      const needsCleanse=ai.agony>0||ai.corruption>0||ai.silence>2||ai.blizzard>1||ai.vineWhip>1||ai.candle>1;
      const oppHasKeyBuff=p1.shield>0||p1.foresight||p1.resist>1||p1.invisible>1||p1.stoneskin>0||p1.stonesoul>0||p1.ward>0||p1.counter;
      if(needsCleanse){ chosen=dispelSpell; aiDispelSelf=true; forceChannel=false; }
      else if(!forceChannel&&oppHasKeyBuff&&_rng()<0.45){ chosen=dispelSpell; aiDispelSelf=false; }
    }
  }
  if(!chosen&&!forceChannel){
    const manaBurnSpell=universalSpells.find(s=>s.element==='manaburn');
    if(manaBurnSpell&&p1.mana>=7) chosen=manaBurnSpell;
  }
  if(!chosen&&!forceChannel&&available.length>0){
    if(charSpells.length>0&&_rng()<0.50){
      chosen=charSpells[Math.floor(_rng()*charSpells.length)];
    } else if(universalSpells.length>0){
      if(p1.shield>0&&universalSpells.find(s=>s.element==='lightning')) chosen=universalSpells.find(s=>s.element==='lightning');
      else if(!p1.shield&&universalSpells.find(s=>s.element==='fire')) chosen=universalSpells.find(s=>s.element==='fire');
      else if(p1.mana>=3&&universalSpells.find(s=>s.element==='ice')) chosen=universalSpells.find(s=>s.element==='ice');
      else { const randPool=universalSpells.filter(s=>s.element!=='dispel'); if(randPool.length>0) chosen=randPool[Math.floor(_rng()*randPool.length)]; }
    } else { chosen=charSpells[Math.floor(_rng()*charSpells.length)]; }
  }
  return {chosen, aiDispelSelf, forceChannel};
}
