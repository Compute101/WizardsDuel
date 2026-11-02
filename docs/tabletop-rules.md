# WizardsDuel — Tabletop Rules

A simplified version of WizardsDuel for playing on a real table with counters, dice and tiddlywinks.
The app's standard game is unchanged: this is a separate rule set.

- **Rules engine and simulator:** `js/tabletop.js`. Every number in this document comes from the `RULES` block there or from `tabletop.json`.
- **Balance passes:** open `tools/balance.html` and set **Mode** to **Tabletop**. Keep every wizard within ±8% of 50%. After changing numbers, run `node tools/tabletop_doc.js` to regenerate the base-spell and character sections below.

---

## What you need

- Counters in three colours, up to 20 of each per player: **HP** (red), **Mana** (blue), **Ward** (white).
- A six-sided die (d6).
- A way to pick secretly: a dial, or face-down cards for Damage / Protection / Dispel / Meditate plus a note of the element and ring.
- Small tokens with a number (or a spare die) to track buffs and curses and how many rounds they have left.
- Tiddlywinks, a pot, and a squidger each (see **The flick**).

## Setup

- Each player picks a wizard and takes **HP counters equal to that wizard's HP** (16–20), plus **6 mana**.
- Nobody can ever hold more than **20** HP, mana or ward counters.

## A round

1. **Pick in secret.** Choose one of these:
   - **Damage**, **Protection** or **Dispel**, plus an **element** and a **ring** (inner, middle or outer). The ring sets cost and strength. You can't use elements your wizard can't cast.
   - One of your wizard's **signature spells**. Each has its own cost and a fixed ring.
   - **Cleanse:** an inner-ring Dispel at yourself that removes your newest curse.
   - **Meditate (channel):** skip your spell and gain 3 mana. You also squop first, with 3 attempts (see **Squops**). You can't Meditate two rounds running.
2. **Reveal** both picks.
3. **Pay.** Mana Siphon is a quick spell: it's paid and steals before anyone else pays. Then check curses that react to your pick: Enthral, Silence, then Frostbite or Dread. Then pay the spell's mana. If you can't afford your spell, it's lost (you pay nothing).
4. **Flick.** Each caster pots winks for their spell: **1 / 2 / 3 winks** for the inner / middle / outer ring (see **The flick**).
5. **Resolve, in this order:** every **Protection**, then every **Dispel**, then every **Damage**, then **Meditate**. Within a stage, both spells happen together.
6. **Squops:** each player squops the other's missed winks for mana (see **Squops**).
7. **Round end** (see below).

When a wizard reaches 0 HP, the game ends straight away. If both fall at the same moment, it's a draw.

## Base spells

<!-- base-spells:start -->
| Ring | Damage (cost → dmg) | Protection (cost → ward) | Dispel (cost → power vs ward) | Winks to pot |
|---|---|---|---|---|
| Inner | 3 → 2 | 5 → 4 | 1 → 3 | 1 |
| Middle | 5 → 4 | 8 → 7 | 2 → 6 | 2 |
| Outer | 8 → 6 | 12 → 11 | 4 → 10 | 3 |
<!-- base-spells:end -->

## The flick

The flick replaces the app's glyph minigames.

- **Distance is your handicap.** Each player flicks from their own line, set before the game so everyone pots about as often. For example, a beginner might flick from 15 cm, a regular player from 25 cm and an expert from 35 cm. Adjust the lines between games until wins even out.
- **The ring sets how many winks you must pot:** **1** for the inner ring, **2** for the middle, **3** for the outer. Signature spells use their card's ring.
- **After a miss, pay 1 mana to have another go.** Your run carries on: a middle-ring spell needs 2 potted winks however many misses come between. If you can't pay, or don't want to, the spell **fizzles** and the mana you paid for it is lost.
- **Missed winks stay where they land, round after round,** until the other player squops them.

## Squops

After the spells resolve, each player can win mana by squopping (landing a wink on top of) the other player's missed winks. Missed winks from earlier rounds count too.

1. **Channelling first:** a player who Meditated this round takes **3 squop attempts** before the other player gets a turn.
2. Then a player who cast gets **one squop attempt for each missed wink** of the other player's that is still on the table, **up to 3 attempts a round**.
3. **Each wink you squop gains you 1 mana.** Take the squopped wink off the table. Unsquopped winks stay where they are for next round.

The simulator assumes a player pots **75%** of flicks from their handicap line and lands **40%** of squop attempts (`RULES.pot` and `RULES.squop` in `js/tabletop.js`). Change them once you know your real rates, then re-run the balance check.

Flicking takes longer than the app's minigame, which is why tabletop games are tuned shorter. They average about 11 rounds in the simulator; the standard game averages about 20.

## Wards (Protection)

- A ward is a pile of ward counters. Casting a new ward replaces the old one.
- **Strikes hit the ward first.** If the ward runs out, the rest goes to HP:
  - A strike in **the ward's own element** deals **+1** to the ward.
  - **Any other element** deals **−1** to the ward (but at least 1).
  - **Physical** strikes crush through: no adjustment.
  - Example: a 4-damage Fire strike hits a 2-counter Ice ward. It counts as 3 against the ward, so the ward breaks and 1 goes through to HP.
- A ward lasts **3 rounds** (the round it went up and 2 more) and loses **1 counter at every round end**.
- Ticks (burns, poison, minions) also hit the ward first, with no element adjustment.

## Dispels

- A Dispel hits the foe's **ward** if they have one: it removes ward counters equal to its power, **doubled if it's the ward's own element**.
- With no ward up, it removes the foe's **newest buff**. An **outer-ring** Dispel removes **every** buff.
- Curses are Dispel-type signature spells. They land on the foe even through a ward.

## Element riders

These apply when a **middle- or outer-ring** strike (base or signature) **reaches HP**. Physical and Lightning work at any ring.

| Element | Rider |
|---|---|
| Fire | **Scorch:** 1 damage at round end, for 1 round (outer ring: 2). Not on spells that already burn. |
| Ice | **Frostbite:** the foe's next **Damage** pick: roll a die, on 1–3 it's lost. |
| Dark | **Dread:** the foe's next **Protection** pick: roll a die, on 1–3 it's lost. |
| Arcane | **Unweave:** the foe's newest timed buff loses 1 round (outer ring: every buff). |
| Lightning | The foe loses **1 / 1 / 2 mana** (inner / middle / outer), **even if the ward held**. |
| Physical | **Crush:** ignores the ward's element adjustment. |

Frostbite, Dread and Scorch are curses: Cleanse removes them.

## Round end

1. **Ticks:** curses on each wizard (burns, poison, plague, Agony and similar), then their regeneration, then their minions strike the foe.
2. **Sudden death:** from **round 8**, both wizards lose 1 HP at every round end, +1 more every 3 rounds after that (2 HP from round 11).
3. **Wards wear** by 1 counter and run down a round. A ward at 0 counters or 0 rounds is gone.
4. **Buffs and curses** run down a round. "3 rounds" includes the round the spell was cast.
5. **Income:** each wizard gains **4 mana** (less any curse that cuts income).

## Keywords

- **Strikers take N:** whenever the foe strikes you, they lose N HP (straight to HP).
- **Every hit deals N less (min 1):** applies to strikes, after any +damage bonuses.
- **Can't pick Damage next round:** a lock. A wizard can't be locked two rounds running.
- **Strike bonus:** some wizards add +1 to strikes at certain rings (shown on their card).
- **Heal:** never above your starting HP.

---

## Wizards

<!-- characters:start -->
### ELDRIN — The Stalwart
**HP 18** · Strikes: outer +1 · Protection costs -1

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Shield** | Protection | Arcane | Outer | 9 | Arcane ward of 11. |
| **Counter** | Protection | Lightning | Middle | 3 | 3 rounds: anyone who strikes you takes 2, and your ward doesn't wear down. A ward already up lasts 1 round longer. |
| **Ward** | Protection | Ice | Middle | 2 | 3 rounds: curses can't touch you. The next dispel only removes this Ward. |

### MALACHAR — The Relentless
**HP 16** · Strikes: middle +1, outer +1 · Can't cast: Arcane

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Empower** | Protection | Fire | Middle | 2 | Your next strike deals +2. |
| **Blood Pact** | Protection | Dark | Inner | 0 | Lose 3 HP, gain 8 mana. |
| **Drain** | Damage | Dark | Middle | 5 | Dark strike of 4. Heal half the HP damage it deals (round down). |

### SYLVARA — The Verdant
**HP 18** · Can't cast: Fire, Dark

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Regen** | Protection | Physical | Middle | 4 | Heal 1 at the end of each round for 5 rounds. |
| **Entangle** | Dispel | Physical | Middle | 2 | Roll a die: on 4+ the foe can't pick Damage next round. |
| **Vine Whip** | Damage | Physical | Middle | 4 | Physical strike of 3, then vines deal 1 at the end of each round for 3 rounds. |

### AURELIA — The Radiant
**HP 19**

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Foresight** | Protection | Lightning | Middle | 3 | The next strike at you within 3 rounds does nothing. |
| **Time Drain** | Dispel | Arcane | Middle | 3 | 3 rounds: the foe gains 2 less mana each round (and from Meditate). |
| **Rewind** | Protection | Arcane | Middle | 7 | Arcane ward of 7, and heal the HP you lost last round (max 5). |

### GNASH — The Feral
**HP 19** · Can't cast: Arcane, Ice

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **War Paint** | Protection | Physical | Middle | 3 | 3 rounds: every hit on you deals 1 less (min 1). |
| **Savage Charge** | Damage | Physical | Middle | 5 | Physical strike of 5. The foe loses 2 mana. |
| **Frenzy** | Protection | Fire | Middle | 2 | 2 rounds: your strikes deal +2, but each costs you 1 HP. |

### CINDER — The Volatile
**HP 17** · Strikes: outer +1 · Can't cast: Ice

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Fireball** | Damage | Fire | Middle | 5 | Fire strike: roll a die, deal that +2. |
| **Flame Shield** | Protection | Fire | Middle | 7 | Fire ward of 8. While it holds, anyone who strikes you takes 2. |
| **Candle** | Dispel | Fire | Middle | 2 | 3 rounds: the foe takes 2 each time they cast Protection or Meditate. |

### SKADI — The Permafrost
**HP 18** · Can't cast: Fire

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Ice Lance** | Damage | Ice | Middle | 6 | Ice strike of 5. If it reaches HP, the foe can't pick Damage next round. |
| **Frost Armor** | Protection | Ice | Middle | 4 | 3 rounds: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Blizzard** | Dispel | Ice | Middle | 4 | 4 rounds: at the end of each round the foe takes 1 and loses 1 mana. |

### ZACHARIUS — The Conductor
**HP 18** · Strikes: outer +1 · Can't cast: Physical

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Galvanize** | Protection | Lightning | Middle | 2 | Your next Lightning strike deals +3. |
| **Chain Lightning** | Damage | Lightning | Middle | 5 | Lightning strike of 4. Roll a die: on 4+ it arcs for 2 more. |
| **Conductivity** | Dispel | Lightning | Middle | 3 | 4 rounds: every strike on the foe deals +1. |

### MARY — The Devoted
**HP 17** · Can't cast: Dark, Fire

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Heal** | Protection | Arcane | Inner | 6 | Heal 6. |
| **Purge** | Dispel | Arcane | Inner | 2 | Remove all your curses and heal 3. |
| **Radiant** | Damage | Arcane | Middle | 4 | Arcane strike of 3. The foe loses 2 mana. |

### MORDANT — The Defiler
**HP 18** · Can't cast: Lightning

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Agony** | Dispel | Dark | Middle | 4 | 3 rounds: the foe takes 2 at the end of each round, unless they Meditated that round (while Corrupted, Meditate doesn't escape it). |
| **Silence** | Dispel | Arcane | Middle | 3 | 3 rounds: each spell the foe casts, they roll a die: on 1–3 it fails (no mana spent). |
| **Corruption** | Dispel | Physical | Middle | 3 | 3 rounds: the foe gains 3 less mana each round (and from Meditate), and Meditate doesn't escape Agony. |

### PONDER — The Apprentice
**HP 17** · Can't cast: Dark, Fire

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Vanish** | Protection | Arcane | Middle | 2 | The next strike at you within 3 rounds misses. |
| **Mana Siphon** | Dispel | Arcane | Inner | 3 | Quick: before anyone pays, steal 4 mana from the foe. |
| **Blink** | Protection | Lightning | Middle | 4 | 3 rounds: roll a die for each strike at you, on 4+ it misses. Plus a Lightning ward of 3. |

### DURIN — The Stoneheart
**HP 20** · Can't cast: Lightning

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Stoneskin** | Protection | Physical | Middle | 6 | Physical ward of 9. |
| **Stonesoul** | Protection | Arcane | Middle | 4 | 3 rounds: every hit on you deals 1 less (min 1). |
| **Rockfall** | Damage | Physical | Outer | 6 | Physical strike of 6. |

### WEIZAN — The Bladecaller
**HP 19** · Can't cast: Dark

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Conjure Blade** | Protection | Physical | Middle | 2 | Conjure a blade (max 3). Each blade deals 1 to the foe at the end of every round. |
| **Bladestorm** | Damage | Physical | Middle | 2 | Needs a blade. Launch all your blades: a Physical strike of 3 per blade. The blades are used up. |
| **Iron Patience** | Protection | Arcane | Middle | 3 | 3 rounds: every hit on you deals 1 less (min 1). |

### GRETCH — The Festering
**HP 18** · Can't cast: Fire, Arcane

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Plague** | Dispel | Dark | Middle | 3 | 4 rounds: the foe takes 1 at the end of each round. |
| **Maggot Cloud** | Dispel | Physical | Middle | 3 | The foe loses 2 mana now, and gains 3 less each round (and from Meditate) for 2 rounds. |
| **Bone Totem** | Protection | Dark | Middle | 4 | Heal 1 at the end of each round for 4 rounds. |

### VALDRIS — The Undying
**HP 18** · Deathless: when knocked to 0 HP, pay 12 mana to stay on 1 HP · Can't cast: Fire

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Raise Dead** | Protection | Dark | Middle | 4 | Raise a skeleton (max 2) for 3 rounds. Each deals 1 to the foe at the end of every round. If one is dispelled, heal 2. |
| **Necrotic Drain** | Damage | Dark | Middle | 5 | Dark strike of 4. Heal half the HP damage it deals (round down). |
| **Reinforce** | Protection | Physical | Middle | 5 | Physical ward of 5, +3 for each skeleton you have. |

### MIREL — The Deceiver
**HP 17** · Can't cast: Physical, Fire

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Simulacrum** | Protection | Arcane | Middle | 4 | Summon a simulacrum (max 2) for 3 rounds. Each deals 1 to the foe at the end of every round. |
| **Bewitch** | Dispel | Arcane | Middle | 2 | The foe's next strike within 2 rounds hits themselves instead. |
| **Feint** | Damage | Arcane | Middle | 5 | Arcane strike of 4. The foe loses 2 mana. |

### THESSALY — The Gilded
**HP 18**

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Enthral** | Dispel | Arcane | Middle | 2 | Secretly write down Damage, Protection or Dispel. If the foe's next pick is that, it's lost and you take up to 3 of the mana they paid. |
| **Arcane Weave** | Protection | Arcane | Middle | 4 | Your next 3 strikes deal +1 and make the foe lose 2 mana. Plus an Arcane ward of 3. |
| **Spellbind** | Dispel | Dark | Middle | 3 | 4 rounds: the foe's most-cast category (Damage, Protection or Dispel) costs 3 more. |

### KORVATH — The Wyrmlord
**HP 19** · Can't cast: Ice

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Dragon Scales** | Protection | Fire | Middle | 4 | 3 rounds: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Wyrmfire Breath** | Damage | Fire | Middle | 5 | Fire strike of 3, then the foe burns for 1 at the end of each round for 2 rounds. |
| **Ancient Wrath** | Damage | Physical | Outer | 9 | Physical strike of 9. Once per game. |

### FIZZWICK — The Concoctor
**HP 17**

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Caustic Bomb** | Damage | Dark | Middle | 4 | Dark strike of 2, then poison deals 1 at the end of each round for 3 rounds. If the strike reached HP, the poison ignores wards. |
| **Volatile Tonic** | Protection | Physical | Inner | 3 | Roll a die: on 1–3 heal 5; on 4–6 your next strike deals +2. |
| **Unstable Concoction** | Damage | Arcane | Middle | 5 | Arcane strike: roll a die and deal that much. On a 6, roll again and add it (keep going on 6s). |

### NYXARA — The Hollow
**HP 18** · Can't cast: Lightning

| Spell | Type | Element | Ring | Cost | Effect |
|---|---|---|---|---|---|
| **Singularity** | Dispel | Dark | Middle | 4 | A rift: the foe takes 1, then 2, then 3 at the end of the next 3 rounds. |
| **Gravity Well** | Damage | Dark | Middle | 5 | Dark strike of a third of the foe's HP (round down, min 3). |
| **Event Horizon** | Damage | Arcane | Outer | 9 | Arcane strike of half the foe's HP (round down, min 4). You take 2. |

<!-- characters:end -->
