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
  which removes curses such as Chill.
- **Minigames:** Damage uses its element's minigame. Physical has its own Rockfall minigame and Dark
  its own Shadow Circle, each with its own glyph set. Protection uses the tile-match and Dispel uses the
  Dispel minigame. A failed minigame fizzles and costs 1 mana.
- **Mana:** everyone starts with 6 and gains +4 at the end of every round. The cheapest spell costs 1,
  so you can always cast something.
- **Meditate** (🧘 on the action bar) replaces the old Channel: skip your spell and gain +3 mana on top
  of income (`MEDITATE` in `js/game.js`). It's a bet that the foe won't strike: you cast nothing, so
  nothing stops their spell. It resolves after every Damage, so this round's mana burns can't touch the
  gain. Not two rounds in a row, and not with a free spell pending. As Channel did in Classic, the
  income-drain curses (Time Drain, Corruption, Maggot Cloud) cut the gain by the same amount, and
  Cinder's Candle burns a wizard who meditates as well as one who wards. The AI meditates when short of
  mana, more readily when its foe can't afford a strike or its ward, buffs and curses are working for
  it, and rarely under a drain or Candle.
- **Paying:** every seat pays for its pick as the round begins, before anything resolves (`payForAction`).
  The picks were simultaneous, so a mana burn or drain this round can't stop a spell that was already
  paid for, whatever the seat order. A failed ritual costs 1 mana instead. **Quick** spells (`quick` on
  the spell; only Ponder's Mana Siphon) are paid first and steal at once, so their target pays from
  what's left — if they can no longer afford their pick, it fails.
- **Wards:** recasting the element already up tops it up, and a ward in a new element goes on over it,
  up to 2 layers (see "Layered wards" below). A ward stops damage in the same round it's raised.
  Like tabletop mode, a ward has **no round timer**: it lasts until it runs out. It loses a flat
  **4 HP at every round end** (`ELEM_WARD_WEAR`, about one tabletop wink), and strikes, ticks and
  dispels wear it too; Counter stops the round-end wear while it lasts. (It used to last 3 rounds and
  keep 75% of its HP each round: `ELEM_WARD_ROUNDS` 0 and `ELEM_WARD_DECAY` 1 now.)
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
- **Ice:** a middle- or outer-ring hit that reaches HP **frostbites** the target. If they pick Damage
  next round, a coin flip at the reveal decides whether it freezes and is lost (no mana spent,
  `ELEM_FROSTBITE_PCT`). Plain element strikes never lock: a hard lock hands the caster a pick that
  can't lose, which breaks the guessing game for a round. Rolling at the reveal keeps both sides
  guessing. Chill (a hard lock: can't pick Damage next round) is Skadi's Ice Lance's own rider
  (`"chill": true`, middle ring and up, reaching HP).
- **Dark:** the mirror of Ice. A middle- or outer-ring hit that reaches HP fills the target with
  **dread**: if they pick Protection next round, a coin flip at the reveal decides whether it falters
  and is lost (`ELEM_RISK_PCT`).
- **Fire:** a middle- or outer-ring hit that reaches HP **scorches**: a burn of 2 a round × 2 (outer
  ring 3 × 2, `ELEM_SCORCH`). A strike with its own DoT (Wyrmfire Breath) doesn't also scorch.
- **Physical:** **crushes** wards. A Physical strike wears an off-element ward at 100% instead of 75%
  (`ELEM_WARD_TAKE.crush`); a Physical ward still unravels at 150%. Strikes only, not minions or ticks.
- **Arcane:** a middle-ring hit that reaches HP **unweaves** the target's newest buff: a round off a
  timed one, or it frays an untimed one, which unravels once frayed twice (`ELEM_UNWEAVE_FRAYS`). An
  outer-ring hit does that to every buff.
- Every rider applies to signature strikes of that element too. `ELEM_RIDERS` switches each one off,
  for testing in the balance simulator.
- **Character stats:** each character's HP and damage multiplier apply. (Eldrin's wards used to cost
  1 less, `shieldCostMod` in `characters.json`; dropped when wards stopped expiring, see below.) Character spells: see Phase 4.
- **AI:** a weighted mixed strategy. It dispels when you have a ward, and on Normal it matches your
  ward's element. It wards more when you can afford a strong hit or its HP is low. On Normal it strikes
  with your ward's own element when it can. It prefers wards in elements you can't cast (70% Normal,
  25% Easy), and otherwise avoids warding in the element you last used. It never casts a plain dispel
  at a foe with no ward or buff when it has a curse to cast instead, and it meditates through Agony. Its minigame success rate is 90% on Normal and 78% on Easy.

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
- **Mana**: fixed income every round (about +4). **Channel is removed** (Meditate later brought back a riskier version), and so are free (0-cost) spells.
- **Piercing is removed** (Lightning, Radiant, Feint, Charge). Those spells get a mana-burn rider instead.
- **Freeze** no longer skips a turn. Instead, next round you can't pick one category, and everyone can see which.
- **Haste is removed.**
- **Everyone gets Shields.**

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
- **Strikes** follow the normal damage rules (wards, matching elements, Lightning burn, Ice frostbite) plus
  their own riders: lifesteal, damage-over-time, mana burn, random power, % of foe's HP, recoil, arcing.
  **Piercing is gone:** Radiant, Feint and Charge burn mana instead.
- **Signature wards** are wards with a twist: Flame Shield hits back; Reinforce grows with skeletons;
  **Rewind** (Aurelia, replacing Haste) is an Arcane ward that also heals what you lost last round.
- **Buffs** (Protection wheel): most have no round timer, as in tabletop: armour (resist buffs), Ward
  and Arcane Weave last until dispelled, Empower-style buffs until used. Buffs that pay out every round
  (Regen, Simulacrum, Danse Macabre) and short bursts (Frenzy, Blink, Counter) keep a timer
  (`timed:true` on the effect). Curses keep their timers. A foe's Dispel hits your ward first; with no ward up it strips your newest buff, and a
  Greater (outer ring) dispel strips all of them — so wards protect your buffs.
- **Curses** (Dispel wheel) resolve with Dispels. Besides the hex, each is a weak dispel: it hits the
  foe's ward with half a dispel's power for that ring (double vs a matching ward) but never strips
  buffs (`ELEM_CURSE_DISPEL`). **Cleanse Self** removes only your newest curse; Mary's Purge removes every curse on you. Silence can
  block a Cleanse Self like any other spell.
- **Locks** (Ice Lance's chill, Entangle) come only from signature spells. They block one category
  for your next pick, and can't be applied two rounds running, so nobody can be locked forever.
- **Enthral** (Thessaly) is a called shot, not a lock: the caster secretly names a category, hidden
  until it plays out. If the foe's next pick is that category, the spell is lost as it's paid for and
  its mana goes to the caster (up to `steal`). Otherwise it's a misread and nothing happens. It springs
  at payment, so Cleanse can't remove it in time (`cleansableCurses` keeps the AI from trying).
  Meditating dodges it, as it casts nothing. The AI's call (`aiEnthralCall`) reads the same pressures
  that steer its own picks; Easy guesses at random.
- **Valdris no longer has Deathless.** The skeleton rework (matching tabletop mode) removed it, along with Reinforce; Soul Tithe took Reinforce's place.
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
| Eldrin | ⚡ Counter | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 3 / 5 | 3 rounds: strikers take 10, and your ward doesn't wear at round end |
| Eldrin | 🔰 Ward | 🛡 Protection | ❄️ Ice | Enchantment (self) | 1 / 2 / 3 | 3 rounds: immune to curses (and their wear on wards); the next dispel only removes the Ward |
| Malachar | 💪 Empower | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | Next strike +50% |
| Malachar | 🩸 Blood Pact | 🛡 Protection | 💀 Dark | Instant | 0 | Lose 9 HP, gain 8 mana |
| Malachar | 💀 Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 45% of HP damage |
| Sylvara | 💚 Regen | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 4 / 6 | Heal 5 a round for 5 rounds |
| Sylvara | 🌿 Entangle | ✦ Dispel | 👊 Physical | Curse (foe) | 1 / 2 / 3 | 55%: foe can't pick Damage next round |
| Sylvara | 🌱 Vine Whip | ⚔️ Damage | 👊 Physical | Strike | 2 / 4 / 6 | 10 physical + vines 3 a round × 3 |
| Aurelia | 🔮 Foresight | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 2 / 4 / 6 | The next strike within 3 rounds does nothing |
| Aurelia | ⏳ Time Drain | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | Foe gains 2 less mana a round (and from Meditate) × 3 |
| Aurelia | ⏪ Rewind | 🛡 Protection | 🌀 Arcane | Ward | 4 / 7 / 11 | Arcane ward of 25 + heal what you lost last round (max 20) |
| Gnash | 🩸 War Paint | 🛡 Protection | 👊 Physical | Enchantment (self) | 2 / 3 / 5 | Take 33% less damage × 3 rounds |
| Gnash | ⚔️ Savage Charge | ⚔️ Damage | 👊 Physical | Strike | 3 / 5 / 8 | 16 physical; burns 2 mana |
| Gnash | 💢 Frenzy | 🛡 Protection | 🔥 Fire | Enchantment (self) | 1 / 2 / 3 | 2 rounds: strikes +40%, each costs 4 HP |
| Cinder | 🎱 Fireball | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 12–24 random fire |
| Cinder | 🛡️ Flame Shield | 🛡 Protection | 🔥 Fire | Ward | 4 / 7 / 11 | Fire ward of 30; strikers take 8 |
| Cinder | 🕯️ Candle | ✦ Dispel | 🔥 Fire | Curse (foe) | 1 / 2 / 3 | 3 rounds: foe burns for 8 when they ward or meditate |
| Skadi | 🧊 Ice Lance | ⚔️ Damage | ❄️ Ice | Strike | 4 / 6 / 10 | 18 ice; chills (middle ring and up) |
| Skadi | 🛡️ Frost Armor | 🛡 Protection | ❄️ Ice | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −30% damage, strikers take 4 |
| Skadi | 🌨️ Blizzard | ✦ Dispel | ❄️ Ice | Curse (foe) | 2 / 4 / 6 | 4 a round + 1 mana drain × 4 |
| Zakkit | 🔋 Warp-Charge | 🛡 Protection | ⚡ Lightning | Enchantment (self) | 1 / 2 / 3 | Next Lightning strike +60% |
| Zakkit | 🌩️ Warp Lightning | ⚔️ Damage | ⚡ Lightning | Strike | 3 / 5 / 8 | 14 lightning; 35% to arc for 8 more |
| Zakkit | 🟢 Warpstone Curse | ✦ Dispel | ⚡ Lightning | Curse (foe) | 2 / 3 / 5 | Foe takes +35% damage × 3 rounds |
| Mary | 💛 Heal | 🛡 Protection | 🌀 Arcane | Instant | 4 / 6 / 10 | Heal 25 now |
| Mary | ✨ Purge | ✦ Dispel | 🌀 Arcane | Instant | 1 / 2 / 3 | Remove your curses and heal 12 |
| Mary | ☀️ Radiant | ⚔️ Damage | 🌀 Arcane | Strike | 2 / 4 / 6 | 12 holy; burns 2 mana |
| Mordant | 💀 Agony | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 4 / 6 | 4 rounds: foe takes 7 whatever they do (Meditate escapes it, unless Corrupted) |
| Mordant | 🔇 Silence | ✦ Dispel | 🌀 Arcane | Curse (foe) | 2 / 3 / 5 | 3 rounds: foe's spells fail 50% |
| Mordant | ☠️ Corruption | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Foe gains 3 less mana a round (and from Meditate) × 3; meditating while Corrupted triggers Agony |
| Ponder | 👻 Vanish | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 3 / 5 | The next strike within 2 rounds misses |
| Ponder | 🌀 Mana Siphon | ✦ Dispel | 🌀 Arcane | Instant (quick) | 2 / 3 / 5 | Steal 3 mana as the round begins, before they pay |
| Ponder | 💫 Blink | 🛡 Protection | ⚡ Lightning | Enchantment (self) + ward | 2 / 4 / 6 | 45% dodge × 3 rounds, plus a 10 HP Lightning ward. Dodge rolls before Vanish, so a dodged strike keeps Vanish up |
| Durin | 🧱 Stoneskin | 🛡 Protection | 👊 Physical | Ward | 4 / 6 / 10 | Physical ward of 40 |
| Durin | 💎 Stonesoul | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | −35% damage × 3 |
| Durin | ⛰️ Rockfall | ⚔️ Damage | 👊 Physical | Strike | 4 / 6 / 10 | 22 physical |
| Weizan | 🗡️ Conjure Blade | 🛡 Protection | 👊 Physical | Enchantment (self) | 1 / 2 / 3 | Blade (max 3): 4 a round |
| Weizan | 💫 Bladestorm | ⚔️ Damage | 👊 Physical | Strike | 1 / 2 / 3 | Launch all blades: 10 each |
| Weizan | 🧘 Iron Patience | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 1 / 2 / 3 | Take 30% less damage × 3 |
| Gretch | ☠️ Plague | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 3 a round × 4 |
| Gretch | 🪲 Maggot Cloud | ✦ Dispel | 👊 Physical | Curse (foe) | 2 / 3 / 5 | Drain 2 mana; −3 income and Meditate × 2 |
| Gretch | 💀 Bone Totem | 🛡 Protection | 💀 Dark | Totem (soak minion, self) | 4 / 6 / 10 | One totem: 15 HP, heals 2 a round until smashed; dispels can't touch it |
| Valdris | 💀 Raise Dead | 🛡 Protection | 💀 Dark | Minions (self) | 3 / 5 / 8 | Raise 2 / 3 / 4 skeletons (max 5): each soaks 3 damage in front of the ward and strikes for 3 a round; dispels can't touch them |
| Valdris | 🩸 Necrotic Drain | ⚔️ Damage | 💀 Dark | Strike | 3 / 5 / 8 | 15 dark; heal 40% of HP damage |
| Valdris | 🪙 Soul Tithe | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | 4 rounds: the foe loses 1 mana (2 at the outer ring) for each of your skeletons they kill |
| Mirel | 🪞 Simulacrum | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | Simulacrum (max 2) for 3 rounds: 4 a round |
| Mirel | 🪄 Bewitch | ✦ Dispel | 🌀 Arcane | Curse (foe) | 1 / 2 / 3 | Foe's next strike within 2 rounds hits themselves |
| Mirel | 🗡️ Feint | ⚔️ Damage | 🌀 Arcane | Strike | 3 / 5 / 8 | 11 arcane; burns 2 mana |
| Thessaly | 🌀 Enthral | ✦ Dispel | 🌀 Arcane | Curse (foe) | 1 / 2 / 3 | Call the foe's next category: if right, it's lost and up to 3 of its mana is yours |
| Thessaly | 🌟 Arcane Weave | 🛡 Protection | 🌀 Arcane | Enchantment (self) | 2 / 4 / 6 | Next 3 strikes +5 and burn 2 mana, plus a 10 HP Arcane ward |
| Thessaly | 🔒 Spellbind | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 3 / 5 | Foe's most-used category costs +3 × 4 |
| Korvath | 🐉 Dragon Scales | 🛡 Protection | 🔥 Fire | Enchantment (self) | 2 / 4 / 6 | 3 rounds: −25% damage, strikers take 4 |
| Korvath | 🌋 Wyrmfire Breath | ⚔️ Damage | 🔥 Fire | Strike | 3 / 5 / 8 | 13 fire + burn 5 a round × 2 |
| Korvath | 💥 Ancient Wrath | ⚔️ Damage | 👊 Physical | Strike | 5 / 9 / 14 | 35 physical — once per duel |
| Fizzwick | 🧪 Caustic Bomb | ⚔️ Damage | 💀 Dark | Strike | 2 / 4 / 6 | 8 + poison 5 a round × 3 — if it reaches HP, the poison seeps past wards |
| Fizzwick | ⚗️ Volatile Tonic | 🛡 Protection | 👊 Physical | Instant | 2 / 3 / 5 | 50%: heal 20 · 50%: next strike +50% |
| Fizzwick | 🧫 Unstable Concoction | ⚔️ Damage | 🌀 Arcane | Strike | 3 / 5 / 8 | 6–30 random arcane |
| Nyxara | 🌀 Singularity | ✦ Dispel | 💀 Dark | Curse (foe) | 2 / 4 / 6 | Rift: 4, 8, 11 over 3 rounds |
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
| Zakkit | Warp-Charge (was Galvanize) 3 → 2 mana |
| Durin | Rockfall 20 → 22 |

After the element riders (Frostbite, Dread, Scorch, Crush, Unweave), the wizards who can't cast
Fire or Dark fell behind (Mary and Gretch 44.9%, Sylvara 48.3%):

| Character | Change |
|---|---|
| Mary | Heal 21 → 22 · Purge heals 8 → 12 (she clears the new curses best) |
| Gretch | HP 85 → 89 |
| Sylvara | Regen 5 × 4 → 5 × 5 rounds (Unweave shortens it) |

Mordant's curses were reworked: Agony bites whatever the foe does (Meditate escapes it, unless the
foe is Corrupted), and Cleanse Self clears only the newest curse. Then two AI fixes: it no longer
casts a plain dispel at a foe with no ward or buff (it casts a curse instead; before, curse-casters
wasted about 2.5 rounds a duel this way), and it meditates through Agony (70% on Normal whenever it
may: even a light Agony is worth resting through, since Meditate also banks mana).
That made every curse-caster much stronger (Gretch 64.8%, Mordant 62.4%; Valdris 39.2%, Mary 40.6%),
so (Normal AI, 200 games per matchup, after: 47.1–54.7%, Mordant highest as an arcade boss):

| Character | Change |
|---|---|
| Mordant | Agony 8 → 6, then 7 and 3 → 4 mana once the AI rested through it as often as it may (70%) |
| Gretch | HP 89 → 85 · Plague 4 → 3 a round · Maggot Cloud drains 3 → 2 |
| Nyxara | Singularity 5, 9, 13 → 4, 8, 11 |
| Mirel | Simulacrum 4 → 3 rounds |
| Thessaly | Spellbind +4 → +3 |
| Aurelia | Foresight 3 → 4 mana |
| Mary | Heal 22 → 25 |
| Valdris | HP 82 → 88 |
| Fizzwick | HP 80 → 85 |
| Gnash | HP 105 → 110 |
| Weizan | HP 90 → 94 |
| Korvath | HP 95 → 98 |

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
| Zakkit | Physical | stone grounds the storm |
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

### Thessaly's Enthral reworked (called shot)

Thessaly sat at 44.0% (Normal, 200 games per matchup), the lowest. Her kit no longer fit her theme
("every spell you cast was mine to exploit"): Classic Enthral cost the foe a whole turn, but the port
became "no Protection next round", which a foe rarely minded. A hard "repeat your last category" was
rejected because it takes the foe's choice away. Instead Enthral became a called shot (see Core
rules): the foe keeps full choice, and Thessaly wins by reading them.
- Normal AI calls right 33% of the time (no better than chance yet), Easy 26%.
- Steal 5: Thessaly 54.5%. **Steal 3: 52.6%**, every character 46–54% on Normal. Easy: Thessaly 57.7%.
- Cancelling the spell is most of its value; the mana steal is a small lever for tuning.

**Arcane Weave gets a ward.** Weave sat on the Protection wheel but raised no ward, so it lost to both
a strike (nothing blocked it) and a dispel (which stripped it at once). It now raises a light Arcane
ward, like Blink, which also guards it from Dispel. The ward made Weave far stronger, so its numbers
came down:
- Ward 15, unchanged otherwise (2 mana, +8 / burn 3): Thessaly **74.6%**. Cost 4–5 alone still left her at 61–68%.
- Cost 2 → 4, ward 10, +8 / burn 3 → **+5 / burn 2**, still 3 strikes; HP 95 → **90** (the HP buffs
  were compensating for a kit that didn't work).
- Normal AI: **Thessaly 49.5%**, every character 46.1–54.1%. Easy: Thessaly 50.9%.

**Spellbind binds the most-used category.** It used to bind whatever the foe resolved last, which
depended on stage order: a ward cast that round, otherwise last round's pick. Thessaly couldn't aim
it. Now it binds the category the foe has cast most this duel (`catCounts`, ties go to Damage), so
a foe who spams Damage pays for it, and the status tag shows which category is bound.
The AI also plays her combos now:
- It opens Dispel for Enthral more readily, and prefers Enthral, while its ward invites a dispel or a
  Spellbind is steering the foe.
- Its call also weighs the foe's habits (`catCounts`).
- Enthral picks went 7% → 13%. Calls still land only 32% of the time against the AI, which is close
  to chance: the read is made a round ahead, and wards and HP change in between.
- Normal AI: **Thessaly 52.2%**, every character 45.4–53.6%. Easy: Thessaly 52.9%.

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
- **Knock-out bounty** (`ELEM_KO_BOUNTY`, +12 HP +5 mana; was +20 before the HP cut): whoever dealt the most damage to a wizard in
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

### Bone Totem rework (Gretch)
The Bone Totem was a dispellable regen buff (4 a round × 4 = 16). It's a physical totem, so it is now
a soak minion like the skeletons: `type:"minion"`, `minion:"totem"`, `kind:"minion"` (dispels can't
touch it), one at a time (`max:1`), no round timer. It has `soak` HP and stands in front of the ward,
wearing down first (strikes, arcane orbs and ticks), and heals its owner `heal` at every round end
while it stands (`elemTickEffects`); with no `dmg` it never strikes. `elite:true` makes the ring scale
its HP and heal (now inner / middle / outer: 9 / 15 / 23 HP, heal 1 / 2 / 3). The AI keeps one up
through `guardSpell` / `guardLow`.
- Tuning (Normal AI, 60 games a matchup, Gretch only): heal 5 / 12 HP 84.5% · 4 / 6 46.2% ·
  4 / 7 55.8% · 3 / 8 53.1% · **5 / 6 50.9%** · 6 / 4 38.6%.
- Whole roster at 200 games a matchup: Gretch 52.2% (51.0% before), everyone 45.6–53.6%. Totem is
  about 28% of his picks.
- Tabletop mirrors it: one totem, 4 HP, heal 1 a round while it stands. Gretch 53.8% (52.5% before),
  everyone 46–54% (400 games).
- Matched to tabletop: there the totem takes a whole Normal strike (4) to smash, but the first
  standard version (6 HP) broke to any hit. Now it's 15 HP, a whole middle-ring strike, with less
  heal and a higher cost. Soak is the strong part: 15 HP with no heal at all was 65%, heal 2 at 4
  mana 84%. Gretch only, 80 games: heal 2 / cost 6 54.8% · heal 2 / cost 7 47.1% · heal 3 / cost 7
  56.1% · heal 3 / cost 8 41.7%. Whole roster at 200 games: **heal 2, 15 HP, cost 6** puts Gretch at
  53.7%, everyone 47.5–53.7% (heal 3 at cost 7: Gretch 56.3%). Totem about 24% of his picks.

### Wards last until worn down (tabletop rules)
Wards used to last 3 rounds and keep 75% of their HP at each round end. Like tabletop mode, they now
have no timer and don't fade: a ward stays up until strikes, ticks and dispels wear it down, or a new
ward replaces it. `ELEM_WARD_ROUNDS` 0 means no timer (`shield` then just marks a ward as up) and
`ELEM_WARD_DECAY` 1 means no fading; setting them back restores the old wards. Eldrin's Counter loses
its ward-bracing (`holdWard` / `extend` only act with a timer); it still retaliates.
- First run (100 games a matchup): Eldrin 60–61%, Ponder 41–42%, Daveron 39–41%; the rest in band.
  Games stay about 20.6 rounds long.
- Changes: Eldrin's wards no longer cost 1 less (`shieldCostMod` dropped) · Ponder HP 78 → 84 ·
  Daveron 85 → 95 · Thessaly 90 → 86 · Aurelia 90 → 86 · Mordant 88 → 84.
- Result (200 games a matchup): everyone 45.7–54.8% (Eldrin 54.7, Thessaly 54.8, Valdris 45.7,
  Sylvara 45.8, Gretch 51.0, Daveron 49.0, Ponder 49.5); games average 20.7 rounds.
- **Revised:** wards still have no timer, but they now lose a flat 4 HP at every round end
  (`ELEM_WARD_WEAR`), like the tabletop ward's 1 wink a round (a Normal tabletop ward is 8 winks to the
  standard 35 HP, a Normal strike 4 to 15, so a wink is about 4 HP). A ward breaks when it reaches 0.
  Counter's `holdWard` stops the wear again. From the numbers above (100 games): everyone 45.1–57.0%
  (Daveron 57.0, Gretch 55.9, Aurelia 45.1), so Daveron went 95 → 90 HP and Aurelia back to 90.
  Result at 200 games a matchup: everyone **47.0–54.5%** (Gretch 54.5, Daveron 53.3, Fizzwick 47.0),
  games about 20.2 rounds. Net HP changes from the timed wards: Ponder 78 → 84, Daveron 85 → 90,
  Thessaly 90 → 86, Mordant 88 → 84; Eldrin's wards no longer cost 1 less.


### Eldrin: the brace moves to Ward

The ward-bracing (`holdWard`: the ward doesn't wear at round end) moved from Counter to Eldrin's Ward.
Ward is a timed buff (`timed:true`, 3 rounds, 4 from the outer ring): immune to curses, the ward doesn't
wear, and the next dispel only removes the Ward. Counter is untimed now: strikers take 5 until it's
dispelled (was 10 for 3 rounds). Balance (100 games a pairing, Normal AI): Eldrin 50.3%, roster 44.0–56.2%.

### Ponder: Vanish lasts, and isn't used up

Vanish is a timed buff now (`timed:true`, 2 rounds, 1 / 2 / 3 by ring) with `keep:true`: while it lasts every
strike at Ponder misses, and a miss doesn't use it up. It's checked before Blink's dodge in `strikeResolve`.
Ticks, minion strikes, dispels and curses still reach him, and a Dispel can strip it. Foresight (also
`absorbNext`, no `keep`) is still used up by the next strike. The AI cuts its Damage weight against a
Vanished foe (×0.2 Normal, ×0.6 Easy) and adds to Dispel. Cost 3. Ponder 48.5%, roster 44.5–56.4%.

No striking from hiding: if Ponder picks a Damage spell while Vanished, the Vanish drops as the round's picks
resolve (`revealVanished`, called in `resolveSimRound` before any stage), so he's exposed for that whole round
whatever order the strikes land in. Other picks (Protection, Dispel, Meditate) keep him hidden. The AI on his
side rarely strikes while Vanished. Vanish cost 3→2 to make up for it: Ponder 49.9%, roster 42.7–57.0%.

### Layered wards
The goal: wizards can build defences up in layers, like a real wizards' duel, while Dispel stays a
counter and games don't stall. Built in steps, each behind a switch in `WARD_RULES` (`js/game.js`) and
balanced on its own before the next:

1. **Recast to boost (built, on).** Recasting a ward of the element already up tops it up instead of
   replacing it: it gains the new cast's HP, up to `boostCap` (1.5) × that cast's HP, and never drops
   below what's there (`wardBoostTo`). It keeps its signature twist (Flame Shield, Stoneskin, …); a
   signature recast sets its own. A buff's light side-ward (Blink) never boosts. A ward in a different
   element still replaces the old one. The AI tops up a ward below `WARD_BOOST_AI_HP` (25) HP and, when
   it wards, picks its own ward's element 75% of the time (Normal; 40% Easy) unless the foe just used
   that element.
2. **Seals (built, on).** 🔒 **Seal Ward** is a button on the Protection wheel, as Cleanse Self is on the
   Dispel wheel: a Protection pick with `self:true` (`isSeal`), `SEAL.cost` 1 mana (the round spent is the real cost), cast with the
   inner-ring tile-match in the ward's element, resolved in the Protection stage (`executeSeal`). It
   seals the outer layer (`st.wardSealed`; a layer beneath keeps its own `sealed`).
   - A sealed layer doesn't wear at round end. Strikes ignore seals.
   - A dispel that meets a seal breaks it and stops (`elemWardDispel`); a Greater one breaks it and
     goes on into the ward, and on through the layers as before. Curses that hit wards only break seals.
     `sealSoak` (15) is the least dispel power that breaks a seal: weaker hits (a curse's ward hit) bounce
     off. `sealBlocks` (on): a seal stops the whole dispel, Greater included: it breaks the seal and goes
     no further, so a sealed ward takes two dispels, a cheap one for the seal, then one for the ward.
     The AI breaks a seal with its cheapest ring that's strong enough. Playtesting showed why: with a
     Greater dispel going on through (50 power, 100 matched, against wards of 20 / 35 / 55 after a 15
     soak), a seal only meant "cast Greater", and a ward that took two rounds and more mana to raise and
     seal fell to one. Sim (60 games): Greater goes through 43.6–56.3%; seals block 43.5–57.4%, about
     22 rounds (+0.6). Eldrin 56.5–57.4% (57.1% without `sealAll`, so it's not the perk). He's an elf, so he
     should be frail: HP 90 → 82 (86: 52.2%, 84: 50.8%, 82: 48.4%, 80: 45.9%), level with Aurelia near the
     bottom of the roster's HP. Roster after: 43.5–56.9%. His tabletop HP (18) is unchanged. At 1 mana: seals 44.4–56.7%, soak 15 44.8–56.7%, soak 30
     41.7–57.5% (Zakkit out of band).
   - Putting a ward on over a sealed one keeps the seal beneath (seal, layer, seal again). Topping up
     keeps the seal; a ward that replaces the outer layer at the limit comes unsealed.
   - Dread and locks on Protection cover it (it's a Protection pick); Enthral calling Protection takes it.
   - **Eldrin** (`sealAll` in `characters.json`): his Seal Ward seals every layer at once. A character's
     `sealCostMod` changes the cost (none use it). His Ward spell still braces and takes the next dispel.
   - AI: seals an unsealed ward of at least `WARD_SEAL_AI_HP` (15) HP, weight `WARD_SEAL_AI` (1.0; half on
     Easy; on Normal +0.3 over a layered stack, +0.3 below half HP; +0.2 with 45+ ward HP in all), and on
     Normal it doesn't hold back to a lesser dispel against a sealed ward. The first version (25+ HP only,
     weight 0.6, ×0.6 while a foe could afford a Greater dispel) sealed about 0.1–0.4 times a game: 79% of
     AI picks have no ward up, 16% a ward under 25 HP, so it had a chance in only 4% of picks and took it
     14% of the time. Now it takes about 30% of its chances and seals about 0.4–1.2 times a game. Win rates
     barely moved between seal weights 0.5 and 1.6 (`sealsShy` / `sealsKeen`).
   - Frederick crept to 57–59% with layers (his blast goes around every layer, and there are more of
     them now): HP 93 → 90 put him at 54.6% (88: 52.4%). Roster after: 44.3–56.2%, about 21.4 rounds.
   - Looks: a sealed layer gets a slowly turning ring of gold Arcana glyphs (`drawWardSeal`, `SEAL_GLYPHS`
     ⊕ θ Φ ∞ Ω ✸, all text-only); sealing phases in gold motes; a broken seal unravels in gold threads
     with 🔒 SEAL BROKEN. Labels: `🔒55 ‹🔒🔥35›`.
3. **Layers (built, on, `layers:2`).** A ward in a new element goes on over the one already up while
   there's room; at the limit it replaces the outer layer. Recasting either layer's element tops that
   layer up. The outer layer is the old single-ward state (`shield` / `shieldHp` / `shieldType` /
   `wardRetaliate` / `wardSig`), so everything that reads "the ward" (element matching, the AI,
   retaliation, signature twists) reads the one you'd hit; the layers beneath sit in `st.wardInner`
   (innermost first) and step out when it falls (`clearOuterWard`, from `breakWard`).
   - Strikes, ticks and minions: what breaks the outer layer carries on into the next, on that layer's
     own element rules (`elemIncoming` loops; an arcane volley's shared `wear` restarts per layer).
   - Dispels: a lesser one stops at the layer it breaks. A Greater one (`ELEM_DISPEL_ALL_TIER`) carries
     its leftover power into the next layer, and if it breaks a stack of 2+ with power to spare it strips
     every buff too (`dispelStrips`), so buffs behind a stack stay reachable. Doing that behind a
     *single* ward was tried first and moved balance a lot (Thessaly 40.5%, Mary and Frederick about
     58–60%), so it's limited to real stacks.
   - Round-end wear hits every layer (`ELEM_WARD_WEAR` each), so a stack costs upkeep; Eldrin's Ward
     braces them all.
   - Blast and Infernal Mantle go around every layer. Riders read the outer layer.
   - AI: with a ward of at least `WARD_BOOST_AI_HP` and room for a layer, its Protection weight is
     `WARD_LAYER_AI` (0.4, else 0.2) and it picks a new element; with a worn ward it tops up instead.
   - Looks: each layer beneath gets its own orbiters on tighter rings (`WARD_INNER_SCALE`) and a thin
     dashed ring in its colour drawn in front of the sprite (`drawInnerWardRings`). Labels read
     `55 ‹🔥35›` (outer HP, then each layer beneath; `wardLabel`).

Sim scaffolding: `tools/balance.html` has a **Wards** selector (presets in `WARD_PRESETS`) and a Wards
table (raised, boosted, peak ward HP per game). `node tools/ward_compare.js 40 off,boost` runs the
presets headless and prints the win rates side by side. At 40 games per matchup two runs of the
same rules differ by up to about 3 points per character.

Tabletop mode has the same rules in winks (`RULES.wards` in `js/tabletop.js`; see CLAUDE.md and the
rulebook's Wards / Seals / Dispels sections), with Eldrin made frail there too (HP 18 → 17, Shield and
Counter strengthened to match).

Seals result (Normal AI, 60 games per matchup): boost + layers 43.7–55.8%; with seals 43.4–56.4% (one
run had Weizan at 58.1%, another nobody outside the band; the 56–58% edge moves between Frederick and
Weizan from run to run). The AI seals about 0.1–0.4 times a game; even an AI that seals at every chance
(`sealsMax`) only gets to 0.7, since a ward has to survive a round with 25+ HP first, and stays in band.
Eldrin with `sealAll`: 51.4 → 54.3% (the same with a seal 1 cheaper, so it stays at full cost). A human
will likely seal more than the AI does: watch Eldrin and the ward-heavy wizards (Durin, Cinder, Mary)
in play.

Layers result (Normal AI, 60 games per matchup): off 42.4–56.0%, shipped rules (boost + 2 layers)
44.0–54.9%, every character within ±8%, games 20.2 → 20.9 rounds. The AI layers about 0.1–0.8 times a
game (Durin and Cinder most); 3 layers (`layers3` preset) played about the same as 2.

Step 1 results (Normal AI, 40 games per matchup): off 43.9–57.0%, boost 42.6–56.9%, every character
within ±8% for every cap tried (1×, 1.5×, 2×, except Durin 58.2% once at 2×) and AI threshold (15, 25,
35 HP). Games 20.2 → 20.5 rounds. Topping up is rare, about 0.1–0.8 a game: most wards are dispelled
or broken before they're worth recasting, so step 1 alone barely moves balance. Seals are where it
will.


## HP in proportion with tabletop

The standard game's wizards had about 8× their tabletop HP, while strikes are only about 3.75× (a
middle-ring strike is 15 against a Normal tabletop strike of 4), so a duel took about twice as many hits
as at the table (about 22 rounds against 10–11). Every wizard's HP was scaled ×0.6 (the same factor
tabletop HP took for the winks), leaving strikes, wards, heals and costs alone. Flat numbers sized
against HP went with it: Blood Pact costs 9 HP (was 15), the 3–4 seat knock-out bounty heals 12 (was
20), and the AI's Blood Pact check is half its max HP (was a flat 40).

Uniform scales tried (Normal AI): ×1 22 rounds · ×0.7 15 · ×0.6 13 · ×0.55 7 · ×0.5 7.5. Below about
×0.6 games collapse to a few rounds and 4–7 wizards fall outside ±8%, so ×0.6 it is. Fixes after the
cut (60–80 games a matchup): Mordant 58.1% → Agony back to 4 rounds (absolute curse damage is worth
more against smaller pools); Nyxara 41.5% (her strike takes a share of the target's HP, so it shrank
with them) → HP 59; Mary 55, Fizzwick 54, Sylvara 58, Ponder 53 (low edge); Frederick 52, Durin 63
(high edge). Result: 44.8–55.6%, about 13.3 rounds.

## Bigger wards, smaller dispels

Wards felt poor value for their mana (a middle ward, 8 mana for 35 HP, was mostly undone by a 2-mana
dispel of 30), so the AI seldom layered them (0.17 layers a game). Wheel wards went 20 / 35 / 55 →
**25 / 45 / 70** (costs unchanged, 5 / 8 / 12) and dispels 15 / 30 / 50 → **10 / 20 / 35** (1 / 2 / 4).
Dispels stay the more efficient answer to a ward: about 9–10 power a mana against 5–6 ward HP a mana,
so a middle dispel takes 44% of a middle ward for a quarter of its cost (89% if matched, ×2), and it
takes two to clear one. `WARD_RULES.sealSoak` follows the curse ward hit (half a middle dispel): 15 → 10.
Signature wards were left alone.

Options tried (Normal AI, 30 games a matchup; range / outside ±8% / rounds / layers a game):
base 44.7–54.7 / 0 / 13.2 / 0.17 · wards 25/45/70 + dispels 12/24/40: 43.7–57.9 / 0 / 14.4 / 0.22 ·
30/50/80 + 12/24/40: 39.9–58.6 / 3 / 15.2 / 0.27 · **25/45/70 + 10/20/35: 43.7–57.6 / 0 / 14.8 / 0.24** ·
30/55/85 + 10/20/35: 40.6–60.2 / 4 / 15.7 / 0.31. Bigger wards lifted Mordant (curses go around wards)
to about 58% in every option and pushed down the minion casters (who don't use wheel wards) and Sylvara.
HP after: Mordant 50 → 47, Sylvara 58 → 61, Zakkit 55 → 58, Valdris 48 → 51, Daveron 54 → 57,
Gretch 51 → 53, Skadi 53 → 51. Result (80 games a matchup): 45.9–55.4%, about 14.8 rounds; Protection
and Dispel picks each about 30% / 28%, peak ward 27 → 36 HP, seals about 0.4 → 0.7 a game.
