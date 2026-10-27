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
with the Classic-only matchup analyzer. Their visual effects were kept: each signature spell plays
its original look (`SPELL_VFX` in the VFX LIBRARY section of `js/game.js`), plain element strikes use
the old Inferno / Lightning Bolt / Frost Nova / Arcane Surge / Mana Burn impacts, and the original
Classic spell code is archived, unloaded, in `js/legacy/classic_spells.js`. All the numbers below are
constants at the top of the `ELEMENTAL DUEL` section of `js/game.js`.

What was built, including choices made while building:
- **Picking:** three buttons (⚔️ Damage, 🛡 Protection, ✦ Dispel), then the strength wheel: 6 element
  sectors × 3 rings. A ring you can't afford is greyed out. Dispel also has a **Cleanse Self** button,
  which removes Chill.
- **Minigames:** Damage uses its element's minigame. Physical borrows Inferno's minigame and Dark
  borrows Mana Burn's, each with its own glyph set. Protection uses the tile-match and Dispel uses the
  Dispel minigame. A failed minigame fizzles and costs 1 mana.
- **Mana:** everyone starts with 6 and gains +4 at the end of every round. There's no Channel, and the
  cheapest spell costs 1, so you can always cast something.
- **Paying:** every seat pays for its pick as the round begins, before anything resolves (`payForAction`).
  The picks were simultaneous, so a mana burn or drain this round can't stop a spell that was already
  paid for, whatever the seat order. A failed ritual costs 1 mana instead. **Quick** spells (`quick` on
  the spell; only Ponder's Mana Siphon) are paid first and steal at once, so their target pays from
  what's left — if they can no longer afford their pick, it fails.
- **Wards:** raising one replaces any existing ward. A ward stops damage in the same round it's raised.
  A ward **resists every element but its own**: other elements wear it down at 75%, while a strike in
  its own element **unravels** it at 150% (`ELEM_WARD_TAKE`). A dispel of its element does double.
- **Damage over time** (poison, burns, vines, Plague, Singularity, Blizzard) hits a ward first at each
  tick, using the ward's element rules, just as minions do. The one exception is Fizzwick's Caustic Bomb:
  if the bomb itself reaches HP, its poison seeps past wards (`bypassWard` on the spell's `dot`).
- **Forbidden elements:** some characters can't cast certain elements (`forbidden` in
  `characters.json`). Those sectors are greyed out with ⛔ on their wheel and the character sheet.
  A ward in an element your rival can't cast can never be unravelled or matched, so it naturally lasts
  longer. That rewards knowing the roster.
- **Lightning** burns 1 / 2 / 3 mana, even when it hits a ward.
- **Ice:** a middle- or outer-ring hit that reaches HP **chills** the target. A chilled player can't
  pick Damage next round. This replaces Freeze.
- **Character stats:** each character's HP and damage multiplier apply. Eldrin's wards cost 1 less
  (`shieldCostMod` in `characters.json`). Character spells: see Phase 4.
- **AI:** a weighted mixed strategy. It dispels when you have a ward, and on Normal it matches your
  ward's element. It wards more when you can afford a strong hit or its HP is low. On Normal it strikes
  with your ward's own element when it can. It prefers wards in elements you can't cast (70% Normal,
  25% Easy), and otherwise avoids warding in the element you last used. Its minigame success rate is 90% on Normal and 78% on Easy.

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
  The wheel sets `spell.tier` (1–3) on the spell passed to the launcher.
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
- **Balance pass:** done; see below.

| Character | Spell | Wheel | Sector | Kind | Mana (inner / middle / outer) | Effect (middle ring) |
|---|---|---|---|---|---|---|
| Eldrin | 🛡 Shield | 🛡 Protection | 🌀 Arcane | Ward | 5 / 9 / 14 | Arcane ward of 45 |
| Eldrin | ⚡ Counter | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | 3 rounds: strikers take 10 |
| Eldrin | 🔰 Ward | 🛡 Protection | ❄️ Ice | Enchantment (self) | 1 / 2 / 3 | 3 rounds: immune to curses |
| Malachar | 💪 Empower | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | Next strike +50% |
| Malachar | 🩸 Blood Pact | 🛡 Protection | 💀 Dark | Instant | 0 | Lose 15 HP, gain 8 mana |
| Malachar | 💀 Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 45% of HP damage |
| Sylvara | 💚 Regen | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 4 / 6 | Heal 5 a round for 4 rounds |
| Sylvara | 🌿 Entangle | ✦ Dispel | 👊 Physical | Curse (foe) | 1 / 2 / 3 | 55%: foe can't pick Damage next round |
| Sylvara | 🌱 Vine Whip | ⚔️ Damage | 👊 Physical | Strike | 2 / 4 / 6 | 10 physical + vines 3 a round × 3 |
| Aurelia | 🔮 Foresight | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | The next strike within 3 rounds does nothing |
| Aurelia | ⏳ Time Drain | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | Foe gains 2 less mana a round × 3 |
| Aurelia | ⏪ Rewind | 🛡 Protection | 🌀 Arcane | Ward | 4 / 7 / 11 | Arcane ward of 25 + heal what you lost last round (max 20) |
| Gnash | 🩸 War Paint | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 3 / 5 | Take 33% less damage × 3 rounds |
| Gnash | ⚔️ Savage Charge | ⚔️ Damage | 👊 Physical | Strike | 3 / 5 / 8 | 16 physical; burns 2 mana |
| Gnash | 💢 Frenzy | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | 2 rounds: strikes +40%, each costs 4 HP |
| Cinder | 🎱 Fireball | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 12–24 random fire |
| Cinder | 🛡️ Flame Shield | 🛡 Protection | 🔥 Fire | Ward | 4 / 7 / 11 | Fire ward of 30; strikers take 8 |
| Cinder | 🕯️ Candle | ✦ Dispel | 🔥 Fire | Curse (foe) | 1 / 2 / 3 | 3 rounds: foe burns for 8 when they ward |
| Skadi | 🧊 Ice Lance | ⚔️ Damage | ❄️ Ice | Strike | 4 / 6 / 10 | 18 ice; chills (middle ring and up) |
| Skadi | 🛡️ Frost Armor | 🛡 Protection | ❄️ Ice | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −30% damage, strikers take 4 |
| Skadi | 🌨️ Blizzard | ✦ Dispel | ❄️ Ice | Curse (foe) | 2 / 4 / 6 | 4 a round + 1 mana drain × 4 |
| Zacharius | 🔋 Galvanize | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 1 / 2 / 3 | Next Lightning strike +60% |
| Zacharius | 🌩️ Chain Lightning | ⚔️ Damage | ⚡ Lightning | Strike | 3 / 5 / 8 | 14 lightning; 35% to arc for 8 more |
| Zacharius | 💡 Conductivity | ✦ Dispel | ⚡ Lightning | Curse (foe) | 2 / 3 / 5 | Foe takes +35% damage × 3 rounds |
| Mary | 💛 Heal | 🛡 Protection | 🌀 Arcane | Instant | 4 / 6 / 10 | Heal 21 now |
| Mary | ✨ Purge | ✦ Dispel | 🌀 Arcane | Instant | 1 / 2 / 3 | Remove your curses and heal 8 |
| Mary | ☀️ Radiant | ⚔️ Damage | 🌀 Arcane | Strike | 2 / 4 / 6 | 12 holy; burns 2 mana |
| Mordant | 💀 Agony | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 4 rounds: foe takes 8 whenever they cast |
| Mordant | 🔇 Silence | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | 3 rounds: foe's spells fail 50% |
| Mordant | ☠️ Corruption | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Foe gains 3 less mana a round × 3 |
| Ponder | 👻 Vanish | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 3 / 5 | The next strike within 2 rounds misses |
| Ponder | 🌀 Mana Siphon | ✦ Dispel | 🌀 Arcane | Instant (quick) | 2 / 3 / 5 | Steal 3 mana as the round begins, before they pay |
| Ponder | 💫 Blink | 🛡 Protection | ⚡ Lightning | Enchantment (self) + ward | 2 / 4 / 6 | 45% dodge × 3 rounds, plus a 10 HP Lightning ward. Dodge rolls before Vanish, so a dodged strike keeps Vanish up |
| Durin | 🧱 Stoneskin | 🛡 Protection | 👊 Physical | Ward | 4 / 6 / 10 | Physical ward of 40 |
| Durin | 💎 Stonesoul | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | −35% damage × 3 |
| Durin | ⛰️ Rockfall | ⚔️ Damage | 👊 Physical | Strike | 4 / 6 / 10 | 22 physical |
| Weizan | 🗡️ Conjure Blade | 🛡 Protection | 👊 Physical | Enchantment (self) | 1 / 2 / 3 | Blade (max 3): 4 a round |
| Weizan | 💫 Bladestorm | ⚔️ Damage | 👊 Physical | Strike | 1 / 2 / 3 | Launch all blades: 10 each |
| Weizan | 🧘 Iron Patience | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 1 / 2 / 3 | Take 30% less damage × 3 |
| Gretch | ☠️ Plague | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 4 a round × 4 |
| Gretch | 🪲 Maggot Cloud | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Drain 3 mana; −3 income × 2 |
| Gretch | 💀 Bone Totem | 🛡 Protection | 💀 Dark | Enchantment (self) | 2 / 4 / 6 | Heal 4 a round × 4 |
| Valdris | 💀 Raise Dead | 🛡 Protection | 💀 Dark | Enchantment (self) | 2 / 4 / 6 | Skeleton (max 2) for 4 rounds: 5 a round; heals 8 if destroyed |
| Valdris | 🩸 Necrotic Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 40% of HP damage |
| Valdris | 🔧 Reinforce | 🛡 Protection | 👊 Physical | Ward | 3 / 5 / 8 | Physical ward of 20 +12 per skeleton |
| Mirel | 🪞 Simulacrum | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | Simulacrum (max 2) for 4 rounds: 4 a round |
| Mirel | 🪄 Bewitch | ✦ Dispel | 🌀 Arcane | Curse (foe) | 1 / 2 / 3 | Foe's next strike within 2 rounds hits themselves |
| Mirel | 🗡️ Feint | ⚔️ Damage | 🌀 Arcane | Strike | 3 / 5 / 8 | 11 arcane; burns 2 mana |
| Thessaly | 🌀 Enthral | ✦ Dispel | 🌀 Arcane | Curse (foe) | 1 / 2 / 3 | Foe can't pick Protection next round |
| Thessaly | 🌟 Arcane Weave | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 1 / 2 / 3 | Next 3 strikes +8 and burn 3 mana |
| Thessaly | 🔒 Spellbind | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | Foe's last category costs +4 × 4 |
| Korvath | 🐉 Dragon Scales | 🛡 Protection | 🔥 Fire | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −25% damage, strikers take 4 |
| Korvath | 🌋 Wyrmfire Breath | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 13 fire + burn 5 a round × 2 |
| Korvath | 💥 Ancient Wrath | ⚔️ Damage | 👊 Physical | Strike | 5 / 9 / 14 | 35 physical — once per duel |
| Fizzwick | 🧪 Caustic Bomb | ⚔️ Damage | 💀 Dark | Strike | 2 / 4 / 6 | 8 + poison 5 a round × 3 — if it reaches HP, the poison seeps past wards |
| Fizzwick | ⚗️ Volatile Tonic | 🛡 Protection | 👊 Physical | Instant | 2 / 3 / 5 | 50%: heal 20 · 50%: next strike +50% |
| Fizzwick | 🧫 Unstable Concoction | ⚔️ Damage | 🌀 Arcane | Strike | 3 / 5 / 8 | 6–30 random arcane |
| Nyxara | 🌀 Singularity | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 4 / 6 | Rift: 5, 9, 13 over 3 rounds |
| Nyxara | 🌑 Gravity Well | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 30% of foe's HP (min 10) |
| Nyxara | 🕳️ Event Horizon | ⚔️ Damage | 🌀 Arcane | Strike | 5 / 9 / 14 | 40% of foe's HP (min 16); 6 recoil |

## Balance pass (done)

**Tool:** `tools/balance.html` (serve the repo over http and open it). It loads the real game in a hidden
iframe and plays AI-vs-AI duels for every pair of characters on both sides (`simMatch` in `js/game.js`
resolves a duel instantly). It shows each character's overall win rate with outliers flagged, a matchup
grid, and what the AI picks for each character. About 19,000 duels take around 20 seconds.

**Target:** every character within ±8% of 50% overall with the Normal AI. Individual lopsided matchups
are fine as long as no character is bad overall.

**Result:** 42–58% with the Normal AI (from 24–85% before tuning), 42–61% with the Easy AI. Only three
matchups are worse than 25/75 (the worst is Malachar vs Gnash, 22%).

**Rule and AI fixes the sim exposed:**
- **Minions never expired.** Simulacra and skeletons now last 4 rounds (blades stay until launched).
- **Deathless was near-permanent:** any mana at all saved Valdris. It now needs enough mana to pay,
  and costs 8.
- **The AI wasted strike boosts.** It now strikes right after Empower / Galvanize / Frenzy / Arcane
  Weave, in Galvanize's element.
- **The AI hardly ever cast curses,** because it only opened the Dispel wheel to break wards.
  Curse-casters now use it for their hexes.

**Number changes** (all in `characters.json`):

| Character | Change |
|---|---|
| Eldrin | damage ×1.2 → ×1.1 · wards −2 → −1 mana · Shield 60 → 45 |
| Gnash | damage ×1.15 → ×1.05 · Savage Charge 18 → 16 |
| Mirel | Simulacrum 6 a round forever → 4 a round for 4 rounds · Feint 4 → 5 mana |
| Valdris | Raise Dead 6 a round forever → 5 a round for 4 rounds · Deathless (above) |
| Sylvara | Regen 6 × 5 → 5 × 4 · Vine Whip vines 5 → 4 · Entangle 75% → 65% |
| Gretch | Bone Totem 5 a round for 3 mana → 4 a round for 4 · Plague 5 → 4 a round |
| Mary | Divine Heal 25 for 5 mana → 22 for 6 |
| Korvath | Dragon Scales −33% / 5 back → −25% / 4 back |
| Mordant | HP 82 → 88 · Agony 6 × 3 → 8 × 4 rounds · Silence 40% × 2 → 50% × 3 · Corruption −2 → −3 income |
| Thessaly | HP 88 → 92 · Enthral 3 → 2 mana · Arcane Weave 3 → 2 mana, +5 / burn 2 → +8 / burn 3 · Spellbind +3 × 3 → +4 × 4 |
| Nyxara | HP 78 → 86 · Gravity Well 25% → 30% of HP |
| Aurelia | Foresight 4 → 3 mana |
| Ponder | Mana Siphon 3 → 4 · Blink 40% → 45%; later Blink rolls before Vanish and adds a 10 HP ward, 3 → 4 mana, HP 85 → 78; the AI then learned to siphon foes who saved up, so Mana Siphon 2 → 3 mana |
| Zacharius | Galvanize 3 → 2 mana |
| Durin | Rockfall 20 → 22 |

### Forbidden elements (thematic)

Most wizards are barred from one or two elements that clash with who they are. Only Eldrin, Aurelia,
Thessaly and Fizzwick can cast every element. This is theme first; balance is kept with numbers.
Signature elements are never forbidden. Fire is the most common ban, so a Fire ward is often safe.

| Character | Can't cast | Why |
|---|---|---|
| Malachar | Arcane | blood magic, not scholarship |
| Sylvara | Fire, Dark | fire burns the forest, dark is rot |
| Gnash | Arcane, Ice | no magic, just fury — and no patience |
| Cinder | Ice | |
| Skadi | Fire | |
| Zacharius | Physical | stone grounds the storm |
| Mary | Dark, Fire | a healer shuns dark and destruction |
| Mordant | Lightning | |
| Ponder | Dark, Fire | forbidden arts — and not trusted with fire yet |
| Durin | Lightning | dwarven stone grounds the storm |
| Weizan | Dark | martial discipline |
| Gretch | Fire, Arcane | fire purges plague |
| Valdris | Fire | the undead fear fire |
| Mirel | Physical, Fire | an illusionist never uses brute force |
| Korvath | Ice | |
| Nyxara | Lightning | the void swallows energy |

Number changes made alongside: Mary's Heal 22 → 19 and HP 88 → 85; Entangle 65% → 55%; Feint 12 → 11;
Stoneskin 35 → 40; Stonesoul −40% non-Physical → −35% all damage; Nyxara HP 86 → 90; Thessaly HP 92 → 95.
After damage over time started hitting wards — Normal AI (100 games per matchup): **43.6–56.6%**, no
matchup under 25%. Easy: 40.9–61.7%. Nyxara fell most (50 → 44), as Singularity's ramp now meets wards, so Singularity
went from 4 / 8 / 12 to 5 / 9 / 13: Normal **45.8–56.4%**, no matchup under 25%; Easy 40.2–60.5%.

Paying up front removed a seat-order advantage (player 2 still had its mana when player 1's blow
landed, so Deathless saved Valdris 3× as often from that seat). It also took away Ponder's accidental
edge — Mana Siphon used to land before the foe paid only when the order allowed — so he fell to 34%.
Making Siphon **quick** on purpose, stealing 3 instead of 4: Normal **44.8–55.2%**, no matchup under
25%; Easy 38.4–59.0%.

### Thessaly vs Mirel (fixed)

Thessaly won only 24% against Mirel. 21% of the damage Thessaly took was her own strikes bouncing back
off **Bewitch**, and her Arcane Weave made each rebound worse (+8 damage and a 3-mana burn on herself).
Two causes:
- The AI ignored being Bewitched and kept striking. It now holds its strikes and cleanses instead, as a
  person would. Bewitch still works within the same round — it's Mirel's sucker punch. Making it wait a
  round (or rebound only half) was tried, but then it barely ever landed and Mirel fell to 28%.
- With the AI playing around it, Mirel dropped to ~44%, so **Bewitch costs 2 instead of 3**.
Thessaly vs Mirel is now 39%. With draws as the default, Sylvara rose to 58%, so **Vine Whip's vines
went 4 → 3**. Normal AI: **44.4–55.4%** (sd 2.8), no matchup under 29%.

**Caveats:** this is the AI's skill level, not a human's. Characters whose strength is in reading the
opponent may play better in human hands. Re-run the tool after any number change, and playtest.

## Multiplayer (Phase 6) — in progress

Free-for-all first; teams (2v2) are supported by the same code. Seats with the same `team` are allies.

**Done — seats and targeting:**
- `setupSeats([{key,team}])` makes a 3–4 seat duel (`p1`…`p4`); `setupSeats(null)` goes back to the two
  picked seats. Each seat carries its own character and team.
- `foesOf` / `alliesOf` / `activeSeats` replace "the other seat". A knocked-out seat is `out`: it no
  longer picks, acts, is targeted, or keeps its enchantments and minions.
- **Targeting:** after the ritual, a pick that aims at a foe (strike, dispel, curse, Mana Siphon) opens
  a target picker when there's more than one foe. It shows each foe's HP, ward and banned elements.
  Wards, buffs and heals don't ask. The reveal cards say who each spell is aimed at.
- **Greater strikes hit every foe:** with more than one foe, an outer-ring Damage pick (plain or
  signature) hits all of them in full, so it skips the target picker and the reveal says "→ All foes".
  Allies are spared. The caster's Empower / Frenzy / Weave, Bewitch and recoil count once for the cast;
  Nyxara's share-of-HP strikes use each target's own HP. Dispels still hit one foe. Games got shorter:
  4-player free-for-all 30 → 26 rounds on average.
- If a target is knocked out earlier in the round, the spell goes to the weakest remaining foe.
- **Minions** attack whoever their owner last aimed at, else the weakest foe.
- **AI** aims at the weakest-looking foe (HP plus ward, with some noise), and wards when any foe can
  afford a strong hit.
- **Ending:** the duel ends when one team is left (or nobody: a draw). `simMatchN(seats, ai)` runs
  3–4 seat AI games. Wins by seat over 1,500 four-player games: 343–379 each, so no seat is favoured.

**Done — ganging up** (tested with AIs that always aim at one wizard; 800–1,500 games each):
- Ganging up wins: the focused wizard wins ~0% and lasts 6–10 rounds (16 when nobody gangs). Greater
  strikes hitting every foe, damage falloff on a focused wizard and extra mana for the focused wizard
  were all tried; none moved that, so only the first was kept. Two wizards simply beat one.
- In 4 seats ganging barely pays: two allies go from 25% to ~29% each while the wizard left out gets ~38%.
- **Knock-out bounty** (`ELEM_KO_BOUNTY`, +20 HP +5 mana): whoever dealt the most damage to a wizard in
  the round they fell (damage in a round is simultaneous, so not whoever hit last) claims it. In a 3-seat
  alliance the ally who lands the kill then wins the final duel 71% of the time, so allies race each
  other for it. Credit by "last hit" gave the last seat in resolution order a big edge, hence "most".
- **The AI notices being ganged up on**: when two or more foes aimed at it last round (`gs.focus`) it
  turtles (more and bigger wards), hits back at the weakest of them, and casts Greater strikes. Against
  a committed gang this only buys about half a round — a ward can't stop a dispel and a strike together.

**Done — protecting an ally:** in team games a Protection pick (plain ward, signature ward, buff,
Heal or Volatile Tonic) asks "Protect who?" after the ritual, listing you and your team-mates; the reveal
card shows who it's for. Minion buffs, Blood Pact and Purge stay with the caster. The AI shields a
team-mate who's worse off (lower HP, unwarded, or the one the foes went for).

**Options** (⚙ on the title screen, `GAME_OPTIONS`, kept in the browser's local storage): **Difficulty** (the
rituals: Easy / Normal / Hard), **Opponent AI** (Easy / Normal), and **Long duels** —
*Draw* (default) ends a duel still going at the **round limit** (30 / 40 / **50**) as a draw ("⌛ Time's Up");
*Sudden death* uses the ramp below instead. Draw rates measured with the AI: at round 50, 1v1 7%, 3 seats 8%,
4 seats 10% (at 40 it's 9% / 20% / 24%, at 30 18% / 43% / 47%, so 50 is the default). An Arcade draw no
longer counts as a win: it goes to the retry screen.

**Done — sudden death** (`SUDDEN_DEATH`, an option): from round **30** in a duel, round **20** with 3–4 wizards,
each round adds +15% to every strike, tick and minion hit and +1 mana income (up to +5). Wards and heals
don't grow, so the end comes quickly. A "⚡ SUDDEN DEATH ⚡" banner opens it and a status tag shows the
current level. Simulated: no more 60-round timeouts (1v1 was 5 in 800, 4 seats 18 in 500); 4-seat games
30 → 23 rounds on average, 3-seat 27 → 22; a typical duel is unchanged (median 19). Draws (double
knock-outs) rise a little to 5–7% with 3–4 wizards. It cut short Mary's long healing games (46% → 41%),
so Heal went back up 19 → 21: Normal AI **44.4–55.8%**, one matchup under 25% (Thessaly vs Mirel, 24).

**Done — Phase Shift** (🌀 Phase, the fourth button in 3–4 seat games; `PHASE` in `js/game.js`):
- A bet that you're about to be targeted, for 4 mana, no ritual, no cooldown, any round. Everything
  aimed at you that round misses and you gain the mana each caster spent on it (a Greater strike pays
  your share). Catch **two or more** spells and your next pick is **free, at any ring**.
- Priced near a typical aimed spell (about 4 mana): nobody aiming at you is a loss of mana and your
  turn, one attacker is roughly break-even, a gang pays you.
- AI: phases when it expects two or more spells its way (from how many aimed at it in the last 3
  rounds, capped by how many foes can afford to), more readily when hurt, and spends a free spell on a
  big strike. Attackers track how often each wizard phases and hold off on the ones who do.
- Simulated (700 games each, AIs forced to gang up): the victim wins 0% → **4%** and lasts ~50% longer
  (4 seats, 2 gang: 8 → 13 rounds); with nobody ganging every seat stays even. Games get longer
  (4 seats 26 → 29 rounds). Variants tried and dropped: a cooldown, needing to have been ganged first,
  reflecting the spells back, and an automatic riposte strike — the gang adapts before those pay out.
  No rule tried lets one wizard reliably beat two; Phase makes ganging up a gamble instead of a sure thing.

**Done — playing it:** Duel → **👥 3–4 Wizards**.
- Setup screen: 3 or 4 wizards, Free-for-all or 2 v 2 (4 only; wizards 1–2 are Team A, 3–4 Team B),
  and Player or AI for each seat (wizard 1 is always a player). Then each seat picks on the character
  screen in turn.
- With more than one player the phone is passed between picks, like the 2-player mode; with one, the
  AIs pick straight away.
- Battle screen: a row of HUD cards (portrait, HP, mana, ward; "OUT" when knocked out) replaces the
  two big HUDs. The wizards stand in a row across the arena at a smaller size, team-mates side by side,
  each with a name tag; the left half faces right and the right half faces left.
- A knocked-out player is out: their go is skipped (no hand-off, no reveal card) and they watch. Once
  only one player is left standing among the people at the table, the phone stops being handed over.
- End screen: the winner (or "Team A Wins!"), then placings by when each wizard was knocked out
  (same round = same place).

**Still to do:**
- kingmaking counter-play (Greater strikes hitting every foe already make ganging up harder)
- no balance passes for 3–4 players: too many variables

Also in place from earlier: per-seat `gs.pending`, `tickRound(who)`, tiered resolution, and paying up front.
