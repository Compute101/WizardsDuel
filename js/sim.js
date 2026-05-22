// sim.js — Headless battle simulation engine
// Mirrors the game logic from game.js without any visual/DOM calls.
// Used by tournament mode to instantly resolve AI vs AI matches.

// ── STATE FACTORY ──────────────────────────────────────────
function simNewState(c1, c2) {
  function blank(cfg) {
    return {
      hp: cfg.hp, maxHp: cfg.hp, mana: cfg.startMana,
      shield: 0, shieldHp: 0, burn: 0, frozen: 0, regen: null,
      counter: false, empowered: false, foresight: false, timeDrain: 0,
      resist: 0, invisible: 0, ward: 0, vineWhip: 0, haste: 0, frenzied: 0,
      blink: 0, frostArmor: 0, blizzard: 0, flameShield: 0, candle: 0,
      charge: 0, conductivity: 0, agony: 0, agonyDmg: 0, silence: 0,
      corruption: 0, stoneskin: 0, stoneskinHp: 0, stonesoul: 0,
    };
  }
  return { p1: blank(c1), p2: blank(c2) };
}

// ── PURE HELPERS ───────────────────────────────────────────
const SIM_MAX_MANA = 20;
const SIM_BURN_DMG = 5;
const SIM_BURN_ROUNDS = 2;

const SIM_STATUS_TIMERS = [
  'timeDrain','resist','ward','haste','frenzied','frostArmor','flameShield',
  'candle','conductivity','agony','silence','corruption','blink','stonesoul','stoneskin',
];

function simTickStatuses(s) {
  SIM_STATUS_TIMERS.forEach(k => { if (s[k] > 0) s[k]--; });
  if (s.stoneskin <= 0) s.stoneskinHp = 0;
}

function simApplySkins(t, dmg, isPhys) {
  if (!isPhys && t.stonesoul > 0) dmg = Math.round(dmg * 0.6);
  let absorbed = 0;
  if (t.stoneskin > 0 && t.stoneskinHp > 0) {
    absorbed = Math.min(10, Math.min(t.stoneskinHp, dmg));
    t.stoneskinHp = Math.max(0, t.stoneskinHp - absorbed);
    dmg = Math.max(0, dmg - absorbed);
    if (t.stoneskinHp <= 0) t.stoneskin = 0;
  }
  return dmg;
}

function simFrostRetal(caster, targetCfg) {
  caster.hp = Math.max(0, caster.hp - (targetCfg.frostArmorRetaliationDmg || 8));
}

function simFlameRetal(caster) {
  caster.hp = Math.max(0, caster.hp - 16);
}

function simDischarge(target, caster) {
  const d = target.charge;
  target.charge = Math.floor(target.charge / 2);
  caster.hp = Math.max(0, caster.hp - d);
}

function simProcessBurn(t) {
  if (t.burn <= 0) return;
  t.hp = Math.max(0, t.hp - SIM_BURN_DMG);
  t.burn--;
}

function simProcessRegen(t) {
  if (!t.regen) return;
  const h = Math.ceil(t.regen.remaining / t.regen.turns);
  t.regen.remaining -= h;
  t.regen.turns--;
  if (t.regen.turns <= 0) t.regen = null;
  t.hp = Math.min(t.maxHp, t.hp + h);
}

function simProcessVineWhip(t) {
  if (!t.vineWhip || t.vineWhip <= 0) return;
  let dmg = 7;
  t.vineWhip--;
  if (t.shield > 0) {
    const a = Math.min(dmg, t.shieldHp);
    t.shieldHp -= a; dmg -= a;
    if (t.shieldHp <= 0) t.shield = 0;
  }
  if (dmg > 0) t.hp = Math.max(0, t.hp - dmg);
}

function simProcessBlizzard(t) {
  if (!t.blizzard || t.blizzard <= 0) return;
  t.hp = Math.max(0, t.hp - 5);
  const d = Math.min(2, t.mana);
  t.mana = Math.max(0, t.mana - d);
  t.blizzard--;
  if (Math.random() < 0.15 && t.frozen <= 0) t.frozen = 1;
}

function simCandleBurn(t) {
  t.burn = SIM_BURN_ROUNDS;
}

// ── SPELL-BLOCKED CHECK (mirrors charSpellBlocked) ────────
function simSpellBlocked(id, cs, cfg, ts) {
  if (cs.frenzied > 0 && id !== 'basicattack') return true;
  switch (id) {
    case 'shield':        return cs.shield > 0;
    case 'counter':       return !cs.shield || cs.counter;
    case 'empower':       return cs.empowered;
    case 'bloodpact':     return cs.hp <= (cfg.bpCost || 0);
    case 'heal':          return cs.regen !== null || cs.hp >= cs.maxHp;
    case 'entangle':      return ts.frozen > 0;
    case 'foresight':     return cs.foresight;
    case 'timedrain':     return ts.timeDrain > 0;
    case 'warpaint':      return cs.resist > 0;
    case 'charge':        return cs.hp <= (cfg.frenzyHpCost || 15);
    case 'vanish':        return cs.invisible > 0;
    case 'manasiphon':    return !cs.invisible || ts.mana <= 0;
    case 'ward':          return cs.ward > 0;
    case 'vinewhip':      return ts.vineWhip > 0;
    case 'haste':         return cs.haste > 0;
    case 'frenzy':        return cs.hp <= (cfg.frenzyHpCost || 15);
    case 'blink':         return cs.blink > 0;
    case 'frostarmor':    return cs.frostArmor > 0;
    case 'blizzard':      return ts.blizzard > 0;
    case 'flameshield':   return cs.flameShield > 0;
    case 'candle':        return ts.candle > 0;
    case 'chainlightning':return cs.charge < (cfg.chainLightningChargeCost || 8);
    case 'conductivity':  return ts.conductivity > 0;
    case 'divineheal':    return cs.hp >= cs.maxHp;
    case 'purge':         return !(cs.burn > 0 || cs.frozen > 0 || cs.blizzard > 0 ||
                                   cs.vineWhip > 0 || cs.timeDrain > 0 || cs.conductivity > 0 ||
                                   cs.candle > 0 || cs.agony > 0 || cs.corruption > 0 || cs.silence > 0);
    case 'agony':         return ts.agony > 0;
    case 'silence':       return ts.silence > 0;
    case 'corruption':    return ts.corruption > 0;
    case 'stoneskin':     return cs.stoneskin > 0;
    case 'stonesoul':     return cs.stonesoul > 0;
    default:              return false;
  }
}

// ── AI DECISION (mirrors doAI heuristics) ─────────────────
function simDecide(cs, ck, cfg, ts, tk, tcfg) {
  // cs = caster state, ck = caster key, cfg = caster config
  // ts = target state, tk = target key, tcfg = target config
  const SPELLS_SIM = [
    { element: 'fire',      cost: 12, dmg: 38, area: true },
    { element: 'lightning', cost: 9,  dmg: 30 },
    { element: 'ice',       cost: 6,  dmg: 18 },
    { element: 'arcane',    cost: 9,  dmg: 0  },
    { element: 'dispel',    cost: 5,  dmg: 0  },
    { element: 'manaburn',  cost: 8,  dmg: 0  },
  ];

  const all = [...SPELLS_SIM, ...(cfg.spells || [])];
  const avail = all.filter(s => {
    if (cs.mana < s.cost) return false;
    if (s.id && simSpellBlocked(s.id, cs, cfg, ts)) return false;
    if (s.aiHint === 'mana_restore' && cs.mana >= 10) return false;
    if (s.aiHint === 'mana_steal' && !cs.invisible) return false;
    if (s.aiHint === 'drain' && cs.hp > cs.maxHp * 0.75) return false;
    if (cs.frenzied > 0 && s.element) return false;
    // Can't target invisible opponent with non-area targeted spells
    if (ts.invisible > 0 && s.element && !s.area &&
        s.element !== 'dispel' && s.element !== 'manaburn') return false;
    if (ts.invisible > 0 && s.id &&
        ['basicattack','charge','entangle','timedrain','drain',
         'vinewhip','agony','silence','corruption','rockfall'].includes(s.id)) return false;
    return true;
  });

  const charSpells = avail.filter(s => s.id);
  const univSpells = avail.filter(s => s.element);

  let chosen = null;
  let dispelSelf = false;

  // Character-specific strategies (mirrors doAI)
  if (ck === 'mordant' && cs.agony > 0) { /* channel */ }
  else if (ck === 'mordant') {
    const hexes = charSpells.filter(s => ['agony','silence','corruption'].includes(s.id));
    if (hexes.length > 0 && Math.random() < 0.65)
      chosen = hexes[Math.floor(Math.random() * hexes.length)];
  }
  if (ck === 'mary') {
    const debuff = cs.burn > 0 || cs.frozen > 0 || cs.blizzard > 0 || cs.vineWhip > 0 ||
                   cs.timeDrain > 0 || cs.conductivity > 0 || cs.candle > 0 ||
                   cs.agony > 0 || cs.corruption > 0 || cs.silence > 0;
    const purge = charSpells.find(s => s.id === 'purge');
    const heal  = charSpells.find(s => s.id === 'divineheal');
    if (debuff && purge) chosen = purge;
    else if (cs.hp < cs.maxHp * 0.60 && heal) chosen = heal;
  }
  if (ck === 'zacharius') {
    const chain = charSpells.find(s => s.id === 'chainlightning');
    const galv  = charSpells.find(s => s.id === 'galvanize');
    const cond  = charSpells.find(s => s.id === 'conductivity');
    if (chain && cs.charge >= (cfg.chainLightningChargeCost || 8)) chosen = chain;
    else if (cond && !ts.conductivity && cs.mana >= cond.cost) chosen = cond;
    else if (galv) chosen = galv;
  }
  if (ck === 'durin') {
    const sk = charSpells.find(s => s.id === 'stoneskin');
    const ss = charSpells.find(s => s.id === 'stonesoul');
    const rf = charSpells.find(s => s.id === 'rockfall');
    if (!cs.stoneskin && sk && cs.hp < cs.maxHp * 0.85) chosen = sk;
    else if (!cs.stonesoul && ss && cs.hp < cs.maxHp * 0.70) chosen = ss;
    else if (rf && Math.random() < 0.55) chosen = rf;
  }

  // Dispel
  if (!chosen) {
    const d = univSpells.find(s => s.element === 'dispel');
    if (d) {
      const needsCleanse = cs.agony > 0 || cs.corruption > 0 || cs.silence > 2 ||
                           cs.blizzard > 1 || cs.vineWhip > 1 || cs.candle > 1;
      const oppBuff = ts.shield > 0 || ts.foresight || ts.resist > 1 || ts.invisible > 1 ||
                      ts.stoneskin > 0 || ts.stonesoul > 0 || ts.ward > 0 || ts.counter;
      if (needsCleanse || (oppBuff && Math.random() < 0.35)) {
        chosen = d;
        dispelSelf = needsCleanse;
      }
    }
  }
  // Mana Burn
  if (!chosen) {
    const mb = univSpells.find(s => s.element === 'manaburn');
    if (mb && ts.mana >= 8) chosen = mb;
  }
  // General
  if (!chosen && avail.length > 0) {
    if (charSpells.length > 0 && Math.random() < 0.40) {
      chosen = charSpells[Math.floor(Math.random() * charSpells.length)];
    } else if (univSpells.length > 0) {
      if (ts.shield > 0 && univSpells.find(s => s.element === 'lightning'))
        chosen = univSpells.find(s => s.element === 'lightning');
      else if (!ts.shield && univSpells.find(s => s.element === 'fire'))
        chosen = univSpells.find(s => s.element === 'fire');
      else if (ts.mana >= 3 && univSpells.find(s => s.element === 'ice'))
        chosen = univSpells.find(s => s.element === 'ice');
      else {
        const pool = univSpells.filter(s => s.element !== 'dispel');
        if (pool.length > 0) chosen = pool[Math.floor(Math.random() * pool.length)];
      }
    } else if (charSpells.length > 0) {
      chosen = charSpells[Math.floor(Math.random() * charSpells.length)];
    }
  }

  return { chosen, dispelSelf };
}

// ── APPLY UNIVERSAL SPELL ─────────────────────────────────
function simCastUniversal(spell, cs, cfg, ts, tcfg, dispelSelf) {
  if (spell.element === 'dispel') {
    if (dispelSelf) {
      const debuffs = ['agony','corruption','silence','burn','frozen','blizzard',
                       'vineWhip','timeDrain','conductivity','candle'];
      const active = debuffs.filter(d => cs[d]);
      if (active.length > 0) cs[active[Math.floor(Math.random() * active.length)]] = 0;
    } else {
      const buffs = ['shield','foresight','regen','resist','frostArmor','flameShield',
                     'empowered','ward','haste','blink','invisible','counter','stoneskin','stonesoul'];
      const active = buffs.filter(b => {
        if (['foresight','empowered','counter'].includes(b)) return !!ts[b];
        if (b === 'regen') return ts.regen !== null;
        return ts[b] > 0;
      });
      if (active.length > 0 && Math.random() < 0.70) {
        const pick = active[Math.floor(Math.random() * active.length)];
        if (pick === 'shield') { ts.shield = 0; ts.shieldHp = 0; }
        else if (pick === 'foresight') ts.foresight = false;
        else if (pick === 'regen') ts.regen = null;
        else if (pick === 'empowered') ts.empowered = false;
        else if (pick === 'counter') ts.counter = false;
        else ts[pick] = 0;
      }
    }
    return;
  }

  let dmg = Math.round(spell.dmg * cfg.dmgMult);
  if (spell.element === 'arcane') dmg = Math.round((15 + Math.floor(Math.random() * 41)) * cfg.dmgMult);

  if (cs.empowered) {
    dmg = Math.round(dmg * (cfg.empowerMult || 1.5));
    cs.empowered = false;
  }
  if (ts.resist > 0) dmg = Math.round(dmg * 0.67);
  if (ts.frostArmor > 0) dmg = Math.round(dmg * 0.70);
  if (ts.conductivity > 0) dmg = Math.round(dmg * 1.35);

  if (ts.foresight) { ts.foresight = false; return; }

  if (spell.element === 'manaburn') {
    let bd = Math.round(ts.mana * 2 * cfg.dmgMult);
    if (cs.empowered) { bd = Math.round(bd * (cfg.empowerMult || 1.5)); cs.empowered = false; }
    if (ts.conductivity > 0) bd = Math.round(bd * 1.35);
    const dr = Math.min(4, ts.mana);
    ts.mana = Math.max(0, ts.mana - dr);
    ts.hp = Math.max(0, ts.hp - bd);
    return;
  }

  if (ts.invisible > 0 && !spell.area) return;
  if (ts.haste > 0 && Math.random() < 0.25) return;

  dmg = simApplySkins(ts, dmg, false);

  const counterTriggered = ts.counter && ts.shield > 0;
  if (ts.shield > 0) {
    if (spell.element === 'lightning') {
      ts.shield = 0; ts.shieldHp = 0;
    } else {
      const a = Math.min(dmg, ts.shieldHp);
      ts.shieldHp -= a; dmg -= a;
      if (ts.shieldHp <= 0) ts.shield = 0;
    }
  }
  if (counterTriggered) {
    cs.hp = Math.max(0, cs.hp - (tcfg.counterDmg || 20));
    ts.counter = false;
  }

  ts.hp = Math.max(0, ts.hp - dmg);
  if (ts.frostArmor > 0 && dmg > 0) simFrostRetal(cs, tcfg);
  if (ts.flameShield > 0 && dmg > 0) simFlameRetal(cs);

  if (spell.element === 'fire') {
    if (ts.ward > 0) ts.ward = 0; else ts.burn = SIM_BURN_ROUNDS;
  }
  if (spell.element === 'ice') {
    if (ts.ward > 0) ts.ward = 0; else ts.frozen = Math.max(ts.frozen, 1);
  }
}

// ── APPLY CHARACTER SPELL ─────────────────────────────────
function simApplyCharSpell(id, cs, cfg, ts, tcfg) {
  const spellDef = cfg.spells.find(s => s.id === id);
  if (!spellDef) return;
  cs.mana = Math.max(0, cs.mana - spellDef.cost);

  // Helper: apply a basic physical/magical hit
  function doHit(dmg, isPhys, piercesDischarge) {
    if (ts.resist > 0) dmg = Math.round(dmg * 0.67);
    if (ts.frostArmor > 0) dmg = Math.round(dmg * 0.70);
    if (ts.conductivity > 0) dmg = Math.round(dmg * 1.35);
    if (ts.foresight) { ts.foresight = false; return 0; }
    if (ts.invisible > 0) return 0;
    if (ts.haste > 0 && Math.random() < 0.25) return 0;
    if (ts.blink > 0 && Math.random() < 0.5) return 0;
    dmg = simApplySkins(ts, dmg, isPhys);
    const notPhysCounter = !isPhys && ts.counter && ts.shield > 0;
    if (ts.shield > 0) {
      const a = Math.min(dmg, ts.shieldHp);
      ts.shieldHp -= a; dmg -= a;
      if (ts.shieldHp <= 0) ts.shield = 0;
    }
    if (notPhysCounter) { cs.hp = Math.max(0, cs.hp - (tcfg.counterDmg || 20)); ts.counter = false; }
    ts.hp = Math.max(0, ts.hp - dmg);
    if (ts.frostArmor > 0 && dmg > 0) simFrostRetal(cs, tcfg);
    if (ts.flameShield > 0 && dmg > 0) simFlameRetal(cs);
    if (isPhys && !piercesDischarge && ts.charge > 0) simDischarge(ts, cs);
    return dmg;
  }

  switch (id) {
    case 'shield':
      cs.shield = cfg.shieldDuration || 10;
      cs.shieldHp = cfg.shieldMaxHp || 60;
      break;
    case 'counter':
      cs.counter = true;
      break;
    case 'empower':
      cs.empowered = true;
      break;
    case 'bloodpact':
      cs.hp = Math.max(1, cs.hp - cfg.bpCost);
      cs.mana = Math.min(SIM_MAX_MANA, cs.mana + cfg.bpGain);
      break;
    case 'heal':
      cs.regen = { remaining: cfg.healAmt || 40, turns: 10 };
      break;
    case 'entangle':
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward = 0; break; }
      if (Math.random() < 0.75) ts.frozen = Math.floor(Math.random() * 3) + 1;
      break;
    case 'foresight':
      cs.foresight = true;
      break;
    case 'timedrain':
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward = 0; break; }
      ts.timeDrain = cfg.timeDrainTurns || 5;
      break;
    case 'vanish':
      cs.invisible = 3;
      break;
    case 'manasiphon':
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.shield > 0) break;
      {
        const steal = Math.min(4, ts.mana);
        ts.mana = Math.max(0, ts.mana - steal);
        cs.mana = Math.min(SIM_MAX_MANA, cs.mana + steal);
      }
      break;
    case 'warpaint':
      cs.resist = 5;
      break;
    case 'charge': {
      cs.hp = Math.max(1, cs.hp - (cfg.frenzyHpCost || 15));
      if (cs.invisible > 0) cs.invisible = 0;
      let cdmg = Math.round((cfg.chargeDmg || 32) * cfg.dmgMult);
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.blink > 0 && Math.random() < 0.5) break;
      if (ts.frostArmor > 0) cdmg = Math.round(cdmg * 0.70);
      if (ts.conductivity > 0) cdmg = Math.round(cdmg * 1.35);
      cdmg = simApplySkins(ts, cdmg, true);
      if (ts.shield > 0) {
        const a = Math.min(cdmg, ts.shieldHp);
        ts.shieldHp -= a; cdmg -= a;
        if (ts.shieldHp <= 0) ts.shield = 0;
      }
      ts.hp = Math.max(0, ts.hp - cdmg);
      if (ts.frostArmor > 0 && cdmg > 0) simFrostRetal(cs, tcfg);
      if (ts.flameShield > 0 && cdmg > 0) simFlameRetal(cs);
      if (ts.charge > 0) simDischarge(ts, cs);
      break;
    }
    case 'ward':
      cs.ward = 3;
      break;
    case 'drain': {
      if (cs.invisible > 0) cs.invisible = 0;
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      let ddmg = Math.round(18 * cfg.dmgMult);
      if (cs.empowered) { ddmg = Math.round(ddmg * (cfg.empowerMult || 1.5)); cs.empowered = false; }
      if (ts.resist > 0) ddmg = Math.round(ddmg * 0.67);
      if (ts.frostArmor > 0) ddmg = Math.round(ddmg * 0.70);
      if (ts.conductivity > 0) ddmg = Math.round(ddmg * 1.35);
      ddmg = simApplySkins(ts, ddmg, false);
      let base = ddmg;
      if (ts.shield > 0) {
        const a = Math.min(base, ts.shieldHp);
        ts.shieldHp -= a; base -= a;
        if (ts.shieldHp <= 0) ts.shield = 0;
      }
      ts.hp = Math.max(0, ts.hp - base);
      if (ts.frostArmor > 0 && base > 0) simFrostRetal(cs, tcfg);
      cs.hp = Math.min(cs.maxHp, cs.hp + Math.max(0, Math.round(base * 0.45)));
      break;
    }
    case 'vinewhip':
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      ts.vineWhip = 3;
      break;
    case 'haste':
      cs.haste = 3;
      break;
    case 'frenzy': {
      cs.hp = Math.max(1, cs.hp - (cfg.frenzyHpCost || 15));
      if (cs.invisible > 0) cs.invisible = 0;
      const ba = cfg.spells.find(s => s.id === 'basicattack');
      for (let i = 0; i < 3; i++) {
        const d = Math.round((ba ? ba.dmg : 9) * cfg.dmgMult);
        doHit(d, !!(ba && ba.physical), !!(ba && ba.piercesDischarge));
        if (ts.hp <= 0 || cs.hp <= 0) break;
      }
      break;
    }
    case 'blink':
      cs.blink = 3;
      break;
    case 'fireball': {
      if (cs.invisible > 0) cs.invisible = 0;
      const fdmg = Math.round((16 + Math.floor(Math.random() * 9)) * cfg.dmgMult);
      doHit(fdmg, false, false);
      break;
    }
    case 'flameshield':
      cs.flameShield = 5;
      break;
    case 'candle':
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward = 0; break; }
      ts.candle = 3;
      break;
    case 'icelance': {
      if (cs.invisible > 0) cs.invisible = 0;
      let ild = Math.round((cfg.iceLanceDmg || 28) * cfg.dmgMult);
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.blink > 0 && Math.random() < 0.5) break;
      if (ts.resist > 0) ild = Math.round(ild * 0.67);
      if (ts.frostArmor > 0) ild = Math.round(ild * 0.70);
      if (ts.conductivity > 0) ild = Math.round(ild * 1.35);
      ild = simApplySkins(ts, ild, false);
      if (ts.shield > 0) {
        const a = Math.min(ild, ts.shieldHp);
        ts.shieldHp -= a; ild -= a;
        if (ts.shieldHp <= 0) ts.shield = 0;
      }
      ts.hp = Math.max(0, ts.hp - ild);
      if (ts.frostArmor > 0 && ild > 0) simFrostRetal(cs, tcfg);
      if (Math.random() < (cfg.iceLanceFreeze || 0.35) && ts.frozen <= 0) {
        if (ts.ward > 0) ts.ward = 0; else ts.frozen = 1;
      }
      break;
    }
    case 'frostarmor':
      cs.frostArmor = cfg.frostArmorDur || 4;
      break;
    case 'blizzard':
      if (ts.invisible > 0) break;
      if (ts.ward > 0) { ts.ward = 0; break; }
      ts.blizzard = cfg.blizzardDur || 5;
      break;
    case 'galvanize':
      cs.charge = (cs.charge || 0) + (cfg.galvanizeChargeGain || 16);
      break;
    case 'chainlightning': {
      cs.charge = Math.max(0, cs.charge - (cfg.chainLightningChargeCost || 8));
      let cld = Math.round((cfg.chainLightningDmg || 24) * cfg.dmgMult);
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.blink > 0 && Math.random() < 0.5) break;
      if (ts.resist > 0) cld = Math.round(cld * 0.67);
      if (ts.frostArmor > 0) cld = Math.round(cld * 0.70);
      if (ts.conductivity > 0) cld = Math.round(cld * 1.35);
      cld = simApplySkins(ts, cld, false);
      // Chain lightning pierces shield
      ts.shield = 0; ts.shieldHp = 0;
      ts.hp = Math.max(0, ts.hp - cld);
      if (ts.frostArmor > 0 && cld > 0) simFrostRetal(cs, tcfg);
      if (ts.flameShield > 0 && cld > 0) simFlameRetal(cs);
      if (Math.random() < (cfg.chainArcChance || 0.35)) {
        const arc = Math.round((cfg.chainArcDmg || 10) * cfg.dmgMult);
        ts.hp = Math.max(0, ts.hp - arc);
      }
      break;
    }
    case 'conductivity':
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward = 0; break; }
      ts.conductivity = cfg.conductivityDur || 3;
      break;
    case 'divineheal':
      cs.hp = Math.min(cs.maxHp, cs.hp + (cfg.healAmt || 40));
      break;
    case 'purge':
      ['burn','frozen','blizzard','vineWhip','timeDrain','conductivity',
       'candle','agony','corruption','silence'].forEach(d => { cs[d] = 0; });
      break;
    case 'radiant': {
      // Bypasses shields and resistance; blocked by foresight/invisible/haste/blink
      if (cs.invisible > 0) cs.invisible = 0;
      let rd = Math.round((cfg.radiantDmg || 15) * cfg.dmgMult);
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.invisible > 0) break;
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.blink > 0 && Math.random() < 0.5) break;
      if (ts.conductivity > 0) rd = Math.round(rd * 1.35);
      // Counter still triggers (shield doesn't block it)
      const rct = ts.counter && ts.shield > 0;
      if (rct) { cs.hp = Math.max(0, cs.hp - (tcfg.counterDmg || 20)); ts.counter = false; }
      ts.hp = Math.max(0, ts.hp - rd);
      if (ts.flameShield > 0 && rd > 0) simFlameRetal(cs);
      break;
    }
    case 'agony':
      if (ts.invisible > 0) break;
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward--; break; }
      ts.agony = cfg.agonyDur || 5;
      ts.agonyDmg = cfg.agonyDmg || 12;
      break;
    case 'silence':
      if (ts.invisible > 0) break;
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward--; break; }
      ts.silence = cfg.silenceDur || 5;
      break;
    case 'corruption':
      if (ts.invisible > 0) break;
      if (ts.foresight) { ts.foresight = false; break; }
      if (ts.haste > 0 && Math.random() < 0.25) break;
      if (ts.ward > 0) { ts.ward--; break; }
      ts.corruption = cfg.corruptionDur || 3;
      break;
    case 'stoneskin':
      cs.stoneskin = cfg.stoneskinDuration || 10;
      cs.stoneskinHp = cfg.stoneskinHpMax || 30;
      break;
    case 'stonesoul':
      cs.stonesoul = cfg.stonesoulDuration || 5;
      break;
    case 'rockfall': {
      if (cs.invisible > 0) cs.invisible = 0;
      const rdmg = Math.round((cfg.rockfallDmg || 9) * cfg.dmgMult);
      for (let i = 0; i < 3; i++) {
        doHit(rdmg, true, false);
        if (ts.hp <= 0 || cs.hp <= 0) break;
      }
      break;
    }
    case 'basicattack': {
      if (cs.invisible > 0) cs.invisible = 0;
      const ba = spellDef;
      doHit(Math.round((ba.dmg || 8) * cfg.dmgMult), !!ba.physical, !!ba.piercesDischarge);
      break;
    }
  }
}

// ── MAIN SIMULATION ───────────────────────────────────────
// Returns the winning character key.
function simulateMatch(k1, k2) {
  const c1 = CHAR_DEFS[k1], c2 = CHAR_DEFS[k2];
  if (!c1 || !c2) return k1;

  const st = simNewState(c1, c2);
  const p1 = st.p1, p2 = st.p2;
  let safety = 400; // max half-turns before declaring by HP

  while (safety-- > 0) {
    // ── P1's turn ───────────────────────────────────────
    // (DOTs applied before actor acts — symmetric to how finishAI sets up player's turn)
    if (p1.invisible > 0) p1.invisible--;
    if (p2.invisible > 0) p2.invisible--;
    if (p1.vineWhip > 0) { simProcessVineWhip(p1); if (p1.hp <= 0) return k2; }
    if (p1.blizzard > 0) { simProcessBlizzard(p1); if (p1.hp <= 0) return k2; }
    if (p1.burn > 0)     { simProcessBurn(p1);     if (p1.hp <= 0) return k2; }
    if (p1.regen)          simProcessRegen(p1);
    p1.mana = Math.min(SIM_MAX_MANA, p1.mana + 1);

    if (p1.frozen > 0) {
      p1.frozen--;
    } else {
      if (p1.agony > 0) {
        p1.hp = Math.max(0, p1.hp - (p1.agonyDmg || 12));
        if (p1.hp <= 0) return k2;
      }
      const { chosen: ch1, dispelSelf: ds1 } = simDecide(p1, k1, c1, p2, k2, c2);
      if (!ch1) {
        // Channel
        let gain = p1.timeDrain > 0 ? 2 : c1.channelAmt;
        if (p1.corruption > 0) gain = Math.max(0, gain - 2);
        p1.mana = Math.min(SIM_MAX_MANA, p1.mana + gain);
        if (p1.candle > 0) simCandleBurn(p1);
      } else if (ch1.id) {
        // Character spell — silence fizzle
        if (ch1.cost > 0 && p1.silence > 0 && Math.random() < 0.45) {
          p1.mana = Math.max(0, p1.mana - 1);
        } else {
          simApplyCharSpell(ch1.id, p1, c1, p2, c2);
          if (p1.candle > 0) simCandleBurn(p1);
        }
      } else {
        // Universal spell — silence fizzle + 80% success
        if (p1.silence > 0 && Math.random() < 0.45) {
          p1.mana = Math.max(0, p1.mana - 1);
        } else if (Math.random() < 0.80) {
          p1.mana = Math.max(0, p1.mana - ch1.cost);
          simCastUniversal(ch1, p1, c1, p2, c2, ds1);
          if (p1.candle > 0) simCandleBurn(p1);
        } else {
          p1.mana = Math.max(0, p1.mana - 1);
        }
      }
    }
    if (p1.hp <= 0) return k2;
    if (p2.hp <= 0) return k1;

    // P1 end-of-turn cleanup
    if (p1.shield > 0) { p1.shield--; if (p1.shield <= 0) p1.shieldHp = 0; }
    simTickStatuses(p1);

    // ── P2's turn ───────────────────────────────────────
    if (p2.vineWhip > 0) { simProcessVineWhip(p2); if (p2.hp <= 0) return k1; }
    if (p2.blizzard > 0) { simProcessBlizzard(p2); if (p2.hp <= 0) return k1; }
    if (p2.burn > 0)     { simProcessBurn(p2);     if (p2.hp <= 0) return k1; }
    if (p2.regen)          simProcessRegen(p2);
    p2.mana = Math.min(SIM_MAX_MANA, p2.mana + 1);

    if (p2.frozen > 0) {
      p2.frozen--;
    } else {
      if (p2.agony > 0) {
        p2.hp = Math.max(0, p2.hp - (p2.agonyDmg || 12));
        if (p2.hp <= 0) return k1;
      }
      const { chosen: ch2, dispelSelf: ds2 } = simDecide(p2, k2, c2, p1, k1, c1);
      if (!ch2) {
        let gain = p2.timeDrain > 0 ? 2 : c2.channelAmt;
        if (p2.corruption > 0) gain = Math.max(0, gain - 2);
        p2.mana = Math.min(SIM_MAX_MANA, p2.mana + gain);
        if (p2.candle > 0) simCandleBurn(p2);
      } else if (ch2.id) {
        if (ch2.cost > 0 && p2.silence > 0 && Math.random() < 0.45) {
          p2.mana = Math.max(0, p2.mana - 1);
        } else {
          simApplyCharSpell(ch2.id, p2, c2, p1, c1);
          if (p2.candle > 0) simCandleBurn(p2);
        }
      } else {
        if (p2.silence > 0 && Math.random() < 0.45) {
          p2.mana = Math.max(0, p2.mana - 1);
        } else if (Math.random() < 0.80) {
          p2.mana = Math.max(0, p2.mana - ch2.cost);
          simCastUniversal(ch2, p2, c2, p1, c1, ds2);
          if (p2.candle > 0) simCandleBurn(p2);
        } else {
          p2.mana = Math.max(0, p2.mana - 1);
        }
      }
    }
    if (p2.hp <= 0) return k1;
    if (p1.hp <= 0) return k2;

    if (p2.shield > 0) { p2.shield--; if (p2.shield <= 0) p2.shieldHp = 0; }
    simTickStatuses(p2);
  }

  // Timeout: highest HP wins
  return p1.hp >= p2.hp ? k1 : k2;
}
