# WizardsDuel — Tabletop Rules

A simplified version of WizardsDuel for playing on a real table with counters, dice and tiddlywinks.
The app's standard game is unchanged: this is a separate rule set.

- **Rules engine and simulator:** `js/tabletop.js`. Every number in this document comes from the `RULES` block there or from `tabletop.json`.
- **Rule sets:** the full rules, and **Beginner rules** for new flickers (see **Beginner rules**).
- **Balance passes:** open `tools/balance.html` and set **Mode** to **Tabletop** (or one of the **Tabletop (Beginner)** modes). Keep every wizard within ±8% of 50%. After changing numbers, run `node tools/tabletop_doc.js` to regenerate the base-spell and character sections below.

---

## What you need

- Tiddlywinks in three colours, up to 20 of each per player: **HP** (red), **Mana** (blue), **Ward** (white). The counters are the winks: you cast spells by potting your mana winks.
- A pot, and a squidger each.
- A six-sided die (d6).
- A way to pick secretly: a dial, or face-down cards for Damage / Protection / Dispel / Meditate plus a note of the element and level.
- A token or the spell card to mark each buff and curse while it's in play (no round counting needed).

## Setup

- Each player picks a wizard and takes **HP winks equal to that wizard's HP** (16–20), plus **6 mana**.
- Nobody can ever hold more than **20** HP, mana or ward winks.
- Agree each player's **handicap line** (see **The flick**).

## A round

1. **Pick in secret.** Choose one of these:
   - **Damage**, **Protection** or **Dispel**, plus an **element** and a **level**: **Lesser**, **Normal** or **Greater**. You can't use elements your wizard can't cast.
   - One of your wizard's **signature spells**. Each card has its own cost and level.
   - **Cleanse:** a Dispel at yourself that removes your curses (see **Buffs and curses**).
   - **Meditate:** skip your spell and gain 3 mana. You can't Meditate two rounds running.
2. **Reveal** both picks.
3. **Pay.** Mana Siphon is a quick spell: it's paid and steals before anyone else pays. Then check curses that react to your pick (Enthral, then Silence). Then pay the spell's cost in mana winks. If you can't afford your spell, it's lost (you pay nothing).
4. **Flick.** Pot the winks your spell needs, flicking the mana winks you just paid (see **The flick**).
5. **Resolve, in this order:** every **Protection**, then every **Dispel**, then every **Damage**, then **Meditate**. Within a stage, both spells happen together.
6. **Squops:** take turns squopping missed winks for mana (see **Squops**). Beginner rules skip this.
7. **Round end** (see below).

When a wizard reaches 0 HP, the game ends straight away. If both fall at the same moment, it's a draw.

## Base spells

Easy to remember: **every spell costs 2 mana per wink you have to pot.** **Damage equals the cost. Wards and Dispels are double the cost.**

<!-- base-spells:start -->
| Level | Winks to pot | Cost | Damage | Ward | Dispel |
|---|---|---|---|---|---|
| Lesser | 1 | 2 | 2 | 4 | 4 |
| Normal | 2 | 4 | 4 | 8 | 8 |
| Greater | 3 | 6 | 6 | 12 | 12 |
<!-- base-spells:end -->

## The flick

The flick replaces the app's glyph minigames.

- **Distance is your handicap.** Each player flicks from their own line, set before the game so everyone pots about as often. For example, a beginner might flick from 15 cm, a regular player from 25 cm and an expert from 35 cm. Adjust the lines between games until wins even out.
- **The level sets how many winks you must pot:** **1** for Lesser, **2** for Normal, **3** for Greater. Signature spells use their card's level.
- **After a miss, pay 1 more mana wink to have another go.** Your run carries on: a Normal spell needs 2 potted winks however many misses come between. If you can't pay, or don't want to, the spell **fizzles** and the mana you paid for it is lost.
- **Missed winks stay where they land, round after round,** until someone squops them.

## Squops

After the spells resolve, the players take turns squopping (landing a wink on top of) **any missed mana wink on the table**: their own or the other player's, from this round or earlier ones.

- **Each player gets 3 attempts a round.** Take turns, one attempt each.
- **Each wink you squop is yours:** add it to your mana. Unsquopped winks stay where they are for next round.
- **Who goes first:** the player with the closer handicap line. If the lines are the same, whoever potted more winks this round. If that's tied too, whoever has less HP.

The simulator assumes a player pots **75%** of flicks from their handicap line and lands **40%** of squop attempts (`RULES.pot` and `RULES.squop` in `js/tabletop.js`). Change them once you know your real rates, then re-run the balance check.

Flicking takes longer than the app's minigame, which is why tabletop games are tuned shorter. They average about 10 rounds in the simulator; the standard game averages about 20.

## Beginner rules

For players still learning to flick. The full rules assume you pot about 3 flicks in 4; Beginner rules are calibrated to a first trial of **7 pots in 57 flicks (about 12%)**. Spells can still fizzle. There are **no squops**: missed winks are picked up with the rest of the mana you paid, so nothing is left on the table (skip step 6 of the round). Everything else in this rulebook stays the same.

There are two ways to flick, still being tried out. Agree which one before the game.

### Five Chances

- Pay the spell's cost, then take **up to 5 flicks**. **Your first pot casts the spell**; stop flicking.
- **No pot in 5 flicks and the spell fizzles.** The mana you paid is lost.
- The level doesn't change the flicks: a Greater spell is as easy to cast as a Lesser one, so the risk is losing more mana.
- At 12%, about **half** your spells go off (47%).

### Flick Your Mana

- Pay the spell's cost, then **flick every mana wink you paid**: 2 for a Lesser spell, 4 for Normal, 6 for Greater (a signature spell's card cost).
- **If any of them pots, the spell is cast**, and **every wink you pot comes back to your mana.**
- **No pot and the spell fizzles.** How much mana you get back depends on the level:

| Level | Mana back when it fizzles |
|---|---|
| Lesser | all of it |
| Normal | half (round down) |
| Greater | none |

- Signature spells and Cleanse use their level.
- So a Lesser spell is a safe try, a Normal one a fair risk and a Greater one a big gamble. At 12%: Lesser goes off about 1 time in 4, Normal about 2 in 5 and Greater about 1 in 2.
- Example: a Normal Fire strike costs 4. You flick all 4 and pot 1: the strike is cast, and that wink goes back to your mana, so it cost you 3. If none had potted, you'd get 2 back.

### Optional: near misses

If you want fewer outright fizzles, agree before the game what counts as a **near miss**: for example a wink that rests against the pot or is within a squidger's width of it. If a spell would fizzle but you made a near miss, it **sputters** instead: a Normal or Greater spell is cast one level lower, and a Lesser spell is cast at half power (round down; a Lesser ward or dispel of 4 becomes 2, a Lesser strike of 2 becomes 1). A sputtering spell gives no fizzle refund. This rule isn't in the simulator's balance yet.

### Beginner HP

**Some wizards start with different HP** in Beginner rules, shown next to their HP in **Wizards** for each way of flicking. The simulator balanced them separately.

In the simulator, about half of Five Chances spells and two in five Flick Your Mana spells go off, and games last about 11 rounds. When you're potting about half your flicks, move up to the full rules (or keep Beginner rules and move your handicap line back).

## Wards (Protection)

- A ward is a pile of ward winks. Casting a new ward replaces the old one.
- **Strikes hit the ward first.** If the ward runs out, the rest goes to HP.
- A strike in **the ward's own element** counts **+2** against the ward.
  - Example: a Normal Fire strike (4) hits a Fire ward of 5. It counts as 6, so the ward breaks and 1 goes through to HP.
- A ward **lasts until it runs out**. It loses **1 wink at every round end**, and strikes and dispels take it down.
- Ticks (burns, poison, minions) also hit the ward first.
- **Skeletons stand in front of the ward.** Each skeleton has 1 HP: every point of damage (strikes and ticks) kills one skeleton before anything reaches the ward. Only what gets past the skeletons meets the ward, and the ward's +2 element bonus applies only to that.
  - Example: a Normal Fire strike (4) hits 3 skeletons and a Fire ward of 5. 3 skeletons fall, the last 1 counts as 3 against the ward, and the ward drops to 2.
- **Graveguard** (Daveron's elite skeletons) work the same way but have **3 HP each**: damage wears down the oldest graveguard first, and each one falls when its HP runs out. Keep a die or extra winks by each one to track its HP.
  - Example: a Normal Fire strike (4) hits 2 graveguard (3 HP each) and a Fire ward of 5. The first graveguard falls (3), the second drops to 2 HP (1), and nothing reaches the ward.

## Dispels

- A Dispel hits the foe's **ward** if they have one, removing ward winks equal to its power. A Dispel in **the ward's own element** counts **+2**, the same as a strike.
- With no ward up, it removes the foe's **newest buff**. A **Greater** Dispel removes **every** buff.
- Curses are Dispel-type signature spells. They land on the foe even through a ward.

## Buffs and curses

There are no round counters. **Buffs last until a Dispel removes them**, and **curses last until the cursed wizard Cleanses**.

Cleanse costs **1 mana per level**, and you pot the usual winks for the level:

| Cleanse | Winks to pot | Cost | Removes |
|---|---|---|---|
| Lesser | 1 | 1 | 1 curse of your choice |
| Normal | 2 | 2 | 2 curses of your choice |
| Greater | 3 | 3 | all your curses |

- "Next strike" and "next pick" effects (Empower, Foresight, Vanish, Bewitch, Enthral and similar) go as soon as they're used.
- "Can't pick Damage next round" lasts for that one round only.
- Skeletons and graveguard aren't buffs: a Dispel never removes them, only damage does. Danse Macabre *is* a buff, so a Dispel can stop it.
- Casting a buff or curse that's already in play does nothing extra; minions (blades, skeletons, simulacra) stack up to their card's max.

## Round end

1. **Ticks:** curses on each wizard (burns, poison, plague, Agony and similar), then their regeneration, then their minions strike the foe.
2. **Sudden death:** from **round 8**, both wizards lose 1 HP at every round end, +1 more every 3 rounds after that (2 HP from round 11).
3. **Wards wear** by 1 wink. A ward with no winks left is gone.
4. **Income:** each wizard gains **4 mana**, less any curse that cuts income.

## Keywords

- **Strikers take N:** whenever the foe strikes you, they lose N HP (straight to HP).
- **Every hit deals N less (min 1):** applies to strikes, after any +damage bonuses.
- **Can't pick Damage next round:** a lock. A wizard can't be locked two rounds running.
- **Heal:** never above your starting HP.

---

## Wizards

<!-- characters:start -->
### ELDRIN — The Stalwart
**HP 18**

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Shield** | Protection | Arcane | Normal | 5 | Arcane ward of 14, for a Normal flick (a Greater ward is 12 and needs 3 winks). |
| **Counter** | Protection | Lightning | Normal | 2 | Until dispelled: anyone who strikes you takes 3, and your ward doesn't wear down. |
| **Ward** | Protection | Ice | Normal | 2 | Until dispelled: curses can't touch you. A dispel at you only removes this Ward. |

### MALACHAR — The Relentless
**HP 17** (Beginner: Five Chances **18**, Flick Your Mana **18**) · Can't cast: Arcane

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Empower** | Protection | Fire | Lesser | 2 | Your next strike deals double damage. |
| **Blood Pact** | Protection | Dark | Lesser | 1 | Turn 3 HP winks into mana winks before you flick, and pot with them. If it is cast, gain 4 more mana. |
| **Drain** | Damage | Dark | Normal | 4 | Dark strike of 5. Heal half the HP damage it deals (round down). |

### SYLVARA — The Verdant
**HP 18** (Beginner: Five Chances **18**, Flick Your Mana **19**) · Can't cast: Fire, Dark

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Regen** | Protection | Physical | Normal | 3 | Until dispelled: heal 1 at every round end. |
| **Entangle** | Dispel | Physical | Lesser | 2 | Roll a die: on 4+ the foe can't pick Damage next round. |
| **Vine Whip** | Damage | Physical | Normal | 3 | Physical strike of 3. Until cleansed, vines deal 1 to the foe at every round end. |

### AURELIA — The Radiant
**HP 19**

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Foresight** | Protection | Lightning | Normal | 2 | The next strike at you does nothing. |
| **Time Drain** | Dispel | Arcane | Normal | 2 | Until cleansed: the foe gains 1 less mana each round (and from Meditate). |
| **Rewind** | Protection | Arcane | Normal | 6 | Arcane ward of 7, and heal the HP you lost last round (max 5). |

### GNASH — The Feral
**HP 19** · Can't cast: Arcane, Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **War Paint** | Protection | Physical | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |
| **Savage Charge** | Damage | Physical | Normal | 4 | Physical strike of 5. The foe loses 2 mana. |
| **Frenzy** | Protection | Fire | Lesser | 2 | Until dispelled: your strikes deal +2, but each costs you 1 HP. |

### CINDER — The Volatile
**HP 17** (Beginner: Five Chances **18**, Flick Your Mana **20**) · Can't cast: Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Fireball** | Damage | Fire | Lesser | 2 | Fire strike of 4 (a Lesser strike is 2). |
| **Flame Shield** | Protection | Fire | Normal | 5 | Fire ward of 8. While it holds, anyone who strikes you takes 2. |
| **Candle** | Dispel | Fire | Normal | 2 | Until cleansed: the foe takes 2 each time they cast Protection or Meditate. |

### SKADI — The Permafrost
**HP 18** · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Ice Lance** | Damage | Ice | Normal | 5 | Ice strike of 5. If it reaches HP, the foe can't pick Damage next round. |
| **Frost Armor** | Protection | Ice | Normal | 3 | Until dispelled: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Blizzard** | Dispel | Ice | Normal | 3 | Until cleansed: at every round end the foe takes 1 and loses 1 mana. |

### ZACHARIUS — The Conductor
**HP 19** (Beginner: Five Chances **19**, Flick Your Mana **20**) · Can't cast: Physical

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Galvanize** | Protection | Lightning | Lesser | 2 | Your next Lightning strike deals +4. |
| **Chain Lightning** | Damage | Lightning | Normal | 4 | Lightning strike of 4. Roll a die: on 3+ it arcs for 2 more. |
| **Conductivity** | Dispel | Lightning | Normal | 2 | Until cleansed: every strike on the foe deals +1. |

### MARY — The Devoted
**HP 17** (Beginner: Five Chances **18**, Flick Your Mana **18**) · Can't cast: Dark, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Heal** | Protection | Arcane | Normal | 5 | Heal 6. |
| **Purge** | Dispel | Arcane | Lesser | 2 | Remove all your curses and heal 3. |
| **Radiant** | Damage | Arcane | Normal | 3 | Arcane strike of 3. The foe loses 2 mana. |

### MORDANT — The Defiler
**HP 18** (Beginner: Five Chances **18**, Flick Your Mana **17**) · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Agony** | Dispel | Dark | Normal | 4 | Until cleansed: the foe takes 2 at every round end, unless they Meditated that round (Corruption stops Meditate escaping it). |
| **Silence** | Dispel | Arcane | Normal | 2 | Until cleansed: each spell the foe casts, they roll a die: on 1–2 it fails (no mana spent). |
| **Corruption** | Dispel | Physical | Normal | 2 | Until cleansed: the foe gains 1 less mana each round (and from Meditate), and Meditate doesn't escape Agony. |

### PONDER — The Apprentice
**HP 17** (Beginner: Five Chances **18**, Flick Your Mana **19**) · Can't cast: Dark, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Vanish** | Protection | Arcane | Normal | 2 | The next strike at you misses. |
| **Mana Siphon** | Dispel | Arcane | Lesser | 2 | Quick: before anyone pays, steal 4 mana from the foe. |
| **Blink** | Protection | Lightning | Normal | 3 | Until dispelled: roll a die for each strike at you, on 4+ it misses. Plus a Lightning ward of 3. |

### DURIN — The Stoneheart
**HP 20** (Beginner: Five Chances **19**, Flick Your Mana **18**) · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Stoneskin** | Protection | Physical | Normal | 5 | Physical ward of 9. |
| **Stonesoul** | Protection | Arcane | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |
| **Rockfall** | Damage | Physical | Greater | 5 | Physical strike of 7. |

### WEIZAN — The Bladecaller
**HP 19** · Can't cast: Dark

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Conjure Blade** | Protection | Physical | Normal | 2 | Conjure a blade (max 3). Until dispelled, each blade deals 1 to the foe at every round end. |
| **Bladestorm** | Damage | Physical | Normal | 2 | Needs a blade. Launch all your blades: a Physical strike of 3 per blade. The blades are used up. |
| **Iron Patience** | Protection | Arcane | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |

### GRETCH — The Festering
**HP 18** · Can't cast: Fire, Arcane

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Plague** | Dispel | Dark | Normal | 3 | Until cleansed: the foe takes 1 at every round end. |
| **Maggot Cloud** | Dispel | Physical | Normal | 2 | The foe loses 3 mana now. Until cleansed, they gain 1 less mana each round (and from Meditate). |
| **Bone Totem** | Protection | Dark | Normal | 4 | Until dispelled: heal 1 at every round end. |

### VALDRIS — The Undying
**HP 16** (Beginner: Five Chances **14**, Flick Your Mana **16**) · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Raise Dead** | Protection | Dark | Normal | 4 | Raise 3 skeletons (max 5 on the table). Each has 1 HP and stands in front of your ward: every point of damage (strikes and ticks) kills one skeleton before anything reaches your ward. Dispels can't touch them. Each skeleton still standing deals 1 to the foe at every round end. |
| **Necrotic Drain** | Damage | Dark | Normal | 4 | Dark strike of 4. Heal half the HP damage it deals (round down). |
| **Soul Tithe** | Dispel | Dark | Lesser | 2 | Until cleansed: the foe loses 1 mana for each of your skeletons they kill. |

### MIREL — The Deceiver
**HP 17** · Can't cast: Physical, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Simulacrum** | Protection | Arcane | Normal | 5 | Summon a simulacrum (max 2). Until dispelled, each deals 1 to the foe at every round end. |
| **Bewitch** | Dispel | Arcane | Normal | 2 | The foe's next strike hits themselves instead. |
| **Feint** | Damage | Arcane | Normal | 4 | Arcane strike of 4. The foe loses 2 mana. |

### THESSALY — The Gilded
**HP 18** (Beginner: Five Chances **19**, Flick Your Mana **20**)

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Enthral** | Dispel | Arcane | Lesser | 2 | Secretly write down Damage, Protection or Dispel. If the foe's next pick is that, it's lost and you take up to 3 of the mana they paid. |
| **Arcane Weave** | Protection | Arcane | Normal | 2 | Your next strike deals +3 and makes the foe lose 2 mana. Plus an Arcane ward of 4. |
| **Spellbind** | Dispel | Dark | Normal | 2 | Until cleansed: the foe's most-cast category (Damage, Protection or Dispel) costs 3 more. |

### KORVATH — The Wyrmlord
**HP 19** (Beginner: Five Chances **18**, Flick Your Mana **15**) · Can't cast: Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Dragon Scales** | Protection | Fire | Normal | 5 | Until dispelled: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Wyrmfire Breath** | Damage | Fire | Normal | 4 | Fire strike of 4. Until cleansed, the foe burns for 1 at every round end. |
| **Ancient Wrath** | Damage | Physical | Greater | 7 | Physical strike of 9. Once per game. |

### FIZZWICK — The Concoctor
**HP 18**

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Caustic Bomb** | Damage | Dark | Normal | 3 | Dark strike of 3. Until cleansed, poison deals 1 to the foe at every round end. If the strike reached HP, the poison ignores wards. |
| **Volatile Tonic** | Protection | Physical | Lesser | 2 | Roll a die: on 1–3 heal 6; on 4–6 your next strike deals +3. |
| **Unstable Concoction** | Damage | Arcane | Normal | 4 | Arcane strike: roll a die and deal that much. On a 6, roll again and add it (keep going on 6s). |

### NYXARA — The Hollow
**HP 18** (Beginner: Five Chances **17**, Flick Your Mana **16**) · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Singularity** | Dispel | Dark | Normal | 3 | Until cleansed: a rift deals 2 to the foe at every round end. |
| **Gravity Well** | Damage | Dark | Normal | 3 | Dark strike of a third of the foe's HP (round down, min 3). |
| **Event Horizon** | Damage | Arcane | Greater | 7 | Arcane strike of half the foe's HP (round down, min 4). You take 2. |

### DAVERON — The Gravelord
**HP 18** (Beginner: Five Chances **16**, Flick Your Mana **17**) · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Raise Graveguard** | Protection | Dark | Normal | 4 | Raise 1 graveguard (max 3 on the table). Each has 3 HP and stands in front of your ward: damage (strikes and ticks) wears down the oldest graveguard first, and only what gets past them reaches your ward. Dispels can't touch them. Each graveguard still standing deals 1 to the foe at every round end. |
| **Vanhal's Danse Macabre** | Protection | Arcane | Lesser | 2 | Needs a graveguard on the table. Until dispelled: each of your graveguard deals 1 more at every round end. |
| **Curse of the Years** | Dispel | Dark | Normal | 4 | Until cleansed: the foe takes 2 at every round end, whatever they did. Unlike Agony, Meditating doesn't escape it. |

<!-- characters:end -->
