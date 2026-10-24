# Elemental Duel — Damage / Protection / Dispel design

Agreed design for moving duels to a rock-paper-scissors core:
**Protection beats Damage, Dispel beats Protection, Damage beats Dispel.**

## Round flow (Phase 1 — implemented)

1. **Pick (secret).** Each seat picks in turn. In pass-the-phone mode every pick sits behind a
   handoff screen, and the minigame runs during the pick. Nothing resolves yet. A frozen seat
   is skipped automatically.
2. **Reveal.** Once every seat has picked: "Place the phone where every wizard can see" → **Reveal!**
   → all cards flip face-up together → **Fight!** (it also starts automatically after a few seconds).
   Against the AI the reveal is a quick, auto-advancing flip.
3. **Resolve** on the shared screen.
4. **Round-end ticks** on the shared screen (DoTs, regen, summons, passive mana), then the next pick phase.

Code: `PLAYERS`, `gs.pending`, `beginPickPhase` → `promptNextPicker` → `commitPick` →
`showReveal` → `resolveSimRound` → `endSimRound` → `runRoundTicks` → `tickRound` in `js/game.js`.
Win checks inside a simultaneous window go through `deferWinCheck` / `settleWin`, so a double KO is a draw.

## Core rules (Phase 3 — implemented)

These are now the only rules: the old Classic rules (per-character spell bars, Channel, free basic
attacks, the shared Inferno/Lightning/Frost Nova/Arcane Surge/Mana Burn spells) were removed, along
with the Classic-only matchup analyzer. All the numbers below are constants at the top of the
`ELEMENTAL DUEL` section of `js/game.js`.

What was built, including choices made while building:
- **Picking:** three buttons (⚔️ Damage, 🛡 Protection, ✦ Dispel), then the strength wheel: 6 element
  sectors × 3 rings. A ring you can't afford is greyed out. Dispel also has a **Cleanse Self** button,
  which removes Chill.
- **Minigames:** Damage uses its element's minigame. Physical borrows Inferno's minigame and Dark
  borrows Mana Burn's, each with its own glyph set. Protection uses the tile-match and Dispel uses the
  Dispel minigame. A failed minigame fizzles and costs 1 mana.
- **Mana:** everyone starts with 6 and gains +4 at the end of every round. There's no Channel, and the
  cheapest spell costs 1, so you can always cast something.
- **Wards:** raising one replaces any existing ward. A ward stops damage in the same round it's raised.
- **Lightning** burns 1 / 2 / 3 mana, even when it hits a ward.
- **Ice:** a middle- or outer-ring hit that reaches HP **chills** the target. A chilled player can't
  pick Damage next round. This replaces Freeze.
- **Character stats:** each character's HP and damage multiplier still apply. Eldrin's wards cost 2
  less (`shieldCostMod` in `characters.json`). Character spell kits are hidden under Elemental rules
  until Phase 4.
- **AI:** a weighted mixed strategy. It dispels when you have a ward, and on Normal it matches your
  ward's element. It wards more when you can afford a strong hit or its HP is low. On Normal it avoids
  striking into your ward's element. Its minigame success rate is 90% on Normal and 78% on Easy.
  Phase 5 replaces this with a better AI.

Original spec:

**Categories**: Damage (medium cost, the only way to win), Protection (high cost, persistent),
Dispel (low cost, strips shields and enchantments, can target self).

**Strength rings**: the radial wheel has one sector per type; clicking nearer the rim casts stronger.

Starting numbers (to be tuned):

| Ring | Damage (cost → dmg) | Shield (cost → shield HP) | Dispel (cost → shield dmg) |
|---|---|---|---|
| Inner  | 3 → 8  | 5 → 20  | 1 → 15 |
| Middle | 5 → 15 | 8 → 35  | 2 → 30 |
| Outer  | 8 → 26 | 12 → 55 | 4 → 50 |

- **Shields** take half damage from their chosen type, last **3 rounds**, and **decay** each round.
- **Dispels** deal double to a shield of the matching type.
- **Resolution stages** replace `ACTION_PRIORITY`: start-of-round → all Protection → all Dispel → all Damage → end-of-round.
- **Mana**: fixed income every round (about +4). **Channel is removed**, and so are free (0-cost) spells.
- **Piercing is removed** (Lightning, Radiant, Feint, Charge). Those spells get a mana-burn rider instead.
- **Freeze** no longer skips a turn. Instead, next round you can't pick one category, and everyone can see which.
- **Haste is removed.**
- **Everyone gets Shields.** Eldrin's cost less.

**Damage types** (6, one wheel sector each): fire, ice, lightning, arcane, physical, dark/necrotic.

## Minigames (Phase 2 — implemented)

- 5 s to watch the glyphs, then 5 s to enter them. This applies to all seven minigames, including the tile-match, which used to have no time limit.
- The minigame decides success or fizzle. The strength ring sets its difficulty: inner is 2 glyphs, outer is 4.
  The wheel will set `spell.tier` (1–3) on the spell passed to the launcher. Until then every cast is tier 2.
- The Arcana alphabet and the canonical words in CLAUDE.md still apply.

## Characters (Phase 4 — implemented) — option B + C

Every character's three signature spells are back. Each one has an `el` block in `characters.json`,
so each spell's numbers can be tuned there.

- **Wheel sectors:** a signature spell takes over its element's sector on its category's wheel (gold
  outline, ★ name), with all three rings. Its `el` numbers are for the middle ring; the inner ring costs
  ×0.6 and is ×0.6 as strong, the outer costs ×1.6 and is ×1.5 as strong (`SIG_COST_SCALE`,
  `SIG_POWER_SCALE`). The ring also sets the minigame length as usual. Taking a sector means that
  character can't cast the plain element there — Cinder's Fire strike *is* Fireball.
- **One spell per sector:** where a character had two spells in the same category and element, one
  was rethemed: Eldrin's Counter → Lightning and Ward → Ice, Malachar's Empower → Fire, Aurelia's
  Foresight → Lightning, Gnash's Frenzy → Fire, Mordant's Silence → Arcane and Corruption → Physical,
  Ponder's Blink → Lightning, Durin's Stonesoul → Arcane, Weizan's Iron Patience → Arcane, Gretch's
  Maggot Cloud → Physical, Valdris's Reinforce → Physical, Thessaly's Spellbind → Dark, Korvath's
  Ancient Wrath → Physical, Nyxara's Event Horizon → Arcane.
- **Strikes** follow the normal damage rules (wards, matching elements, Lightning burn, Ice chill) plus
  their own riders: lifesteal, damage-over-time, mana burn, random power, % of foe's HP, recoil, arcing.
  **Piercing is gone:** Radiant, Feint and Charge burn mana instead.
- **Signature wards** are wards with a twist: Flame Shield hits back; Reinforce grows with skeletons;
  **Rewind** (Aurelia, replacing Haste) is an Arcane ward that also heals what you lost last round.
- **Buffs** (Protection wheel) last a set number of rounds; minions and Empower-style buffs last until
  used or removed. A foe's Dispel hits your ward first; with no ward up it strips your newest buff, and a
  Greater (outer ring) dispel strips all of them — so wards protect your buffs.
- **Curses** (Dispel wheel) resolve with Dispels. Besides the hex, each is a weak dispel: it hits the
  foe's ward with half a dispel's power for that ring (double vs a matching ward) but never strips
  buffs (`ELEM_CURSE_DISPEL`). **Cleanse Self** and Mary's Purge remove every curse on you.
- **Locks** (Ice chill, Entangle, Enthral) block one category for your next pick, and can't be
  applied two rounds running, so nobody can be locked forever.
- **Valdris's Deathless passive still applies.**
- **AI:** treats signature sectors like any other sector, preferring them (30–45%) when they'd do
  something useful: it won't recast an active buff, heals only when hurt, cleanses when cursed, and
  dispels your buffs when you have no ward.
- **Tutorial and character select** describe these rules. The character guides describe effects and
  wheel sectors without exact numbers, and character stats are generated from the `el` blocks, so both
  stay correct after tuning.
- **Balance pass:** still to do once all phases are in.

| Character | Spell | Wheel | Sector | Kind | Mana (inner / middle / outer) | Effect (middle ring) |
|---|---|---|---|---|---|---|
| Eldrin | 🛡 Shield | 🛡 Protection | 🌀 Arcane | Ward | 5 / 9 / 14 | Arcane ward of 60 |
| Eldrin | ⚡ Counter | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | 3 rounds: strikers take 10 |
| Eldrin | 🔰 Ward | 🛡 Protection | ❄️ Ice | Enchantment (self) | 1 / 2 / 3 | 3 rounds: immune to curses |
| Malachar | 💪 Empower | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | Next strike +50% |
| Malachar | 🩸 Blood Pact | 🛡 Protection | 💀 Dark | Instant | 0 | Lose 15 HP, gain 8 mana |
| Malachar | 💀 Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 45% of HP damage |
| Sylvara | 💚 Regen | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 4 / 6 | Heal 6 a round for 5 rounds |
| Sylvara | 🌿 Entangle | ✦ Dispel | 👊 Physical | Curse (foe) | 1 / 2 / 3 | 75%: foe can't pick Damage next round |
| Sylvara | 🌱 Vine Whip | ⚔️ Damage | 👊 Physical | Strike | 2 / 4 / 6 | 10 physical + vines 5 a round × 3 |
| Aurelia | 🔮 Foresight | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 4 / 6 | The next strike within 3 rounds does nothing |
| Aurelia | ⏳ Time Drain | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | Foe gains 2 less mana a round × 3 |
| Aurelia | ⏪ Rewind | 🛡 Protection | 🌀 Arcane | Ward | 4 / 7 / 11 | Arcane ward of 25 + heal what you lost last round (max 20) |
| Gnash | 🩸 War Paint | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 3 / 5 | Take 33% less damage × 3 rounds |
| Gnash | ⚔️ Savage Charge | ⚔️ Damage | 👊 Physical | Strike | 3 / 5 / 8 | 18 physical; burns 2 mana |
| Gnash | 💢 Frenzy | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | 2 rounds: strikes +40%, each costs 4 HP |
| Cinder | 🎱 Fireball | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 12–24 random fire |
| Cinder | 🛡️ Flame Shield | 🛡 Protection | 🔥 Fire | Ward | 4 / 7 / 11 | Fire ward of 30; strikers take 8 |
| Cinder | 🕯️ Candle | ✦ Dispel | 🔥 Fire | Curse (foe) | 1 / 2 / 3 | 3 rounds: foe burns for 8 when they ward |
| Skadi | 🧊 Ice Lance | ⚔️ Damage | ❄️ Ice | Strike | 4 / 6 / 10 | 18 ice; chills |
| Skadi | 🛡️ Frost Armor | 🛡 Protection | ❄️ Ice | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −30% damage, strikers take 4 |
| Skadi | 🌨️ Blizzard | ✦ Dispel | ❄️ Ice | Curse (foe) | 2 / 4 / 6 | 4 a round + 1 mana drain × 4 |
| Zacharius | 🔋 Galvanize | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | Next Lightning strike +60% |
| Zacharius | 🌩️ Chain Lightning | ⚔️ Damage | ⚡ Lightning | Strike | 3 / 5 / 8 | 14 lightning; 35% to arc for 8 more |
| Zacharius | 💡 Conductivity | ✦ Dispel | ⚡ Lightning | Curse (foe) | 2 / 3 / 5 | Foe takes +35% damage × 3 rounds |
| Mary | 💛 Heal | 🛡 Protection | 🌀 Arcane | Instant | 3 / 5 / 8 | Heal 25 now |
| Mary | ✨ Purge | ✦ Dispel | 🌀 Arcane | Instant | 1 / 2 / 3 | Remove your curses and heal 8 |
| Mary | ☀️ Radiant | ⚔️ Damage | 🌀 Arcane | Strike | 2 / 4 / 6 | 12 holy; burns 2 mana |
| Mordant | 💀 Agony | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 3 rounds: foe takes 6 whenever they cast |
| Mordant | 🔇 Silence | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | 2 rounds: foe's spells fail 40% |
| Mordant | ☠️ Corruption | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Foe gains 2 less mana a round × 3 |
| Ponder | 👻 Vanish | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 3 / 5 | The next strike within 2 rounds misses |
| Ponder | 🌀 Mana Siphon | ✦ Dispel | 🌀 Arcane | Instant | 1 / 2 / 3 | Steal 3 mana |
| Ponder | 💫 Blink | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | 40% dodge × 3 rounds |
| Durin | 🧱 Stoneskin | 🛡 Protection | 👊 Physical | Ward | 4 / 6 / 10 | Physical ward of 35 |
| Durin | 💎 Stonesoul | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | −40% non-physical damage × 3 |
| Durin | ⛰️ Rockfall | ⚔️ Damage | 👊 Physical | Strike | 4 / 6 / 10 | 20 physical |
| Weizan | 🗡️ Conjure Blade | 🛡 Protection | 👊 Physical | Enchantment (self) | 1 / 2 / 3 | Blade (max 3): 4 a round |
| Weizan | 💫 Bladestorm | ⚔️ Damage | 👊 Physical | Strike | 1 / 2 / 3 | Launch all blades: 10 each |
| Weizan | 🧘 Iron Patience | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 1 / 2 / 3 | Take 30% less damage × 3 |
| Gretch | ☠️ Plague | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 5 a round × 4 |
| Gretch | 🪲 Maggot Cloud | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Drain 3 mana; −3 income × 2 |
| Gretch | 💀 Bone Totem | 🛡 Protection | 💀 Dark | Enchantment (self) | 2 / 3 / 5 | Heal 5 a round × 4 |
| Valdris | 💀 Raise Dead | 🛡 Protection | 💀 Dark | Enchantment (self) | 2 / 4 / 6 | Skeleton (max 2): 6 a round; heals 8 when destroyed |
| Valdris | 🩸 Necrotic Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 40% of HP damage |
| Valdris | 🔧 Reinforce | 🛡 Protection | 👊 Physical | Ward | 3 / 5 / 8 | Dark ward of 20 +12 per skeleton |
| Mirel | 🪞 Simulacrum | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | Simulacrum (max 2): 6 a round |
| Mirel | 🪄 Bewitch | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | Foe's next strike within 2 rounds hits themselves |
| Mirel | 🗡️ Feint | ⚔️ Damage | 🌀 Arcane | Strike | 2 / 4 / 6 | 12 arcane; burns 2 mana |
| Thessaly | 🌀 Enthral | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | Foe can't pick Protection next round |
| Thessaly | 🌟 Arcane Weave | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 3 / 5 | Next 3 strikes +5 and burn 2 mana |
| Thessaly | 🔒 Spellbind | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | Foe's last category costs +3 × 3 |
| Korvath | 🐉 Dragon Scales | 🛡 Protection | 🔥 Fire | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −33% damage, strikers take 5 |
| Korvath | 🌋 Wyrmfire Breath | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 13 fire + burn 5 a round × 2 |
| Korvath | 💥 Ancient Wrath | ⚔️ Damage | 👊 Physical | Strike | 5 / 9 / 14 | 35 fire — once per duel |
| Fizzwick | 🧪 Caustic Bomb | ⚔️ Damage | 💀 Dark | Strike | 2 / 4 / 6 | 8 + poison 5 a round × 3 |
| Fizzwick | ⚗️ Volatile Tonic | 🛡 Protection | 👊 Physical | Instant | 2 / 3 / 5 | 50%: heal 20 · 50%: next strike +50% |
| Fizzwick | 🧫 Unstable Concoction | ⚔️ Damage | 🌀 Arcane | Strike | 3 / 5 / 8 | 6–30 random arcane |
| Nyxara | 🌀 Singularity | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 4 / 6 | Rift: 4, 8, 12 over 3 rounds |
| Nyxara | 🌑 Gravity Well | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 25% of foe's HP (min 10) |
| Nyxara | 🕳️ Event Horizon | ⚔️ Damage | 🌀 Arcane | Strike | 5 / 9 / 14 | 40% of foe's HP (min 16); 6 recoil |

## Multiplayer (Phase 6)

3–4 seats use the same pick → reveal → resolve flow. Still to do:
- target selection for Damage and Dispel
- seat layout
- N-player win conditions
- kingmaking counter-play

Foundations already in place: `PLAYERS`, per-seat `gs.pending`, `tickRound(who)`, and tiered resolution.
