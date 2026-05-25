// ── ACTION PRIORITY ─────────────────────────────────────────
// Lower number = higher priority (acts first in simultaneous resolution)
// Tier 1: Defensive instants — activate before any damage lands
// Tier 2: Control / Freeze — lock down opponent before they strike
// Tier 3: Fast strikes — quick physical/lightning before standard magic
// Tier 4: Standard attacks and utility
// Tier 5: Damage-over-time — commitments that play out slowly
// Tier 6: Resource gathering — lowest stakes, always resolved last
const ACTION_PRIORITY = {
  shield:1, counter:1, ward:1, warpaint:1, frostarmor:1,
  stoneskin:1, flameshield:1, blink:1, stonesoul:1, foresight:1, vanish:1,
  ice:2, entangle:2,
  lightning:3, charge:3, icelance:3, chainlightning:3, galvanize:3,
  arcane:4, dispel:4, manaburn:4, heal:4, drain:4, fireball:4,
  conductivity:4, agony:4, corruption:4, timedrain:4, bloodpact:4,
  empower:4, manasiphon:4, frenzy:4, vinewhip:4, blizzard:4, candle:4,
  divineheal:4, purge:4, radiant:4, silence:4, rockfall:4,
  fire:5,
  channel:6, haste:6,
};

// Mulberry32 seeded PRNG — used to make game-state randomness deterministic
// for replay and P2P synchronisation.
function seededRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
