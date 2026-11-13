# WizardsDuel — Tabletop Rules

A simplified version of WizardsDuel for playing on a real table with counters, dice and tiddlywinks.
The app's standard game is unchanged: this is a separate rule set. You can also read these rules, and a tutorial, in the app: **🎲 Tabletop** on the title screen.

<!-- dev:start (the app's rules screen leaves this out) -->
- **Rules engine and simulator:** `js/tabletop.js`. Every number in this document comes from the `RULES` block and `PRESETS` there or from `tabletop.json`.
- **Balance passes:** open `tools/balance.html` and set **Mode** to **Tabletop (Beginner)**, **Tabletop (Normal)** or **Tabletop (Advanced)**. Keep every wizard within ±8% of 50% in each. After changing numbers, run `node tools/tabletop_doc.js` to regenerate the base-spell and character sections below.
<!-- dev:end -->

---

## Three ways to play

Learn them in this order. You never need better flicking to move from Beginner to Normal: only Advanced asks for that.

| Rules | Who it's for | What changes |
|---|---|---|
| **Beginner** | Your first games | The core rules below, and nothing else: one ward at a time, elements are just for show, one simple Cleanse. |
| **Normal** | Most tables, most of the time | The core rules plus **Normal rules**: elements count against wards, wards top up, layer and seal, Cleanse by level. |
| **Advanced** | Tiddlywinks masters, potting about 3 flicks in 4 | Everything in Normal, plus **Advanced rules**: pot a wink per level, pay to retry, and squop missed winks for mana. |

Both Beginner and Normal use the same flick, tuned for new flickers: **7 pots in 57 flicks (about 12%)** on our first try.

## What you need

- Tiddlywinks in three colours: **HP** (red), **Mana** (blue), **Ward** (white). The counters are the winks: you cast spells by flicking your mana winks.
  - **HP:** 25 red winks cover both players, since nobody ever has more than 12.
  - **Mana and wards:** about 25 of each, shared between you, is enough for most games. If a pile runs out, use spare winks of another colour.
- A pot, and a squidger each.
- A six-sided die (d6).
- A way to pick secretly: a dial, or face-down cards for Damage / Protection / Dispel / Meditate plus a note of the element and level.
- A token or the spell card to mark each buff and curse while it's in play (no round counting needed).

## Setup

- Each player picks a wizard and takes **HP winks equal to that wizard's HP** (8–12), plus **6 mana**.
- Nobody can ever hold more than **12** HP winks, or more than **20** mana or ward winks.
- Agree where each player flicks from: their **handicap line**. A better flicker stands further back.

## A round

1. **Pick in secret.** Choose one of these:
   - **Damage**, **Protection** or **Dispel**, plus an **element** and a **level**: **Lesser**, **Normal** or **Greater**. You can't use elements your wizard can't cast.
   - One of your wizard's **signature spells**. Each card has its own cost and level.
   - **Cleanse:** a Dispel at yourself that removes your curses (see **Buffs and curses**).
   - **Meditate:** skip your spell and gain 3 mana. You can't Meditate two rounds running.
2. **Reveal** both picks.
3. **Pay.** Mana Siphon is a quick spell: it's paid and steals before anyone else pays. Then check curses that react to your pick (Enthral, then Silence). Then pay the spell's cost in mana winks. If you can't afford your spell, it's lost (you pay nothing).
4. **Flick** for your spell, using the mana winks you just paid (see **The flick**).
5. **Resolve, in this order:** every **Protection**, then every **Dispel**, then every **Damage**, then **Meditate**. Within a stage, both spells happen together.
6. **Round end** (see below). In Advanced rules, squops come first (see **Advanced rules**).

When a wizard reaches 0 HP, the game ends straight away. If both fall at the same moment, it's a draw.

## Base spells

Easy to remember: **every spell costs 2 mana per level.** **Damage equals the cost. Wards and Dispels are double the cost.**

<!-- base-spells:start -->
| Level | Cost | Damage | Ward | Dispel | Flicks | Advanced: winks to pot |
|---|---|---|---|---|---|---|
| Lesser | 2 | 2 | 4 | 4 | 8 | 1 |
| Normal | 4 | 4 | 8 | 8 | 6 | 2 |
| Greater | 6 | 6 | 12 | 12 | 4 | 3 |
<!-- base-spells:end -->

## The flick

The flick replaces the app's glyph minigames. Beginner and Normal rules use this flick (Advanced rules have their own, see **Advanced rules**).

- **Flick 10 minus the spell's cost.** Pay the cost, then take up to that many flicks from your handicap line. Cheaper spells get more chances: Lesser (cost 2) gets 8 flicks, Normal (4) gets 6 and Greater (6) gets 4. Signature cards and Cleanse use their own cost.
- **Your first pot casts the spell.** Stop flicking.
- **No pot and the spell fizzles.** The mana you paid is lost.
- **Pick up the winks you missed.** Nothing is left on the table between rounds.

At 12%, a Lesser spell goes off about 2 times in 3, a Normal one about half the time and a Greater one about 2 times in 5. In the simulator, about half of all spells go off, and games last about 8 or 9 rounds (the standard game averages about 20, which is why tabletop games are tuned shorter).

### Optional: near misses

If you want fewer outright fizzles, agree before the game what counts as a **near miss**: for example a wink that rests against the pot or is within a squidger's width of it. If a spell would fizzle but you made a near miss, it **sputters** instead: a Normal or Greater spell is cast one level lower, and a Lesser spell is cast at half power (round down; a Lesser ward or dispel of 4 becomes 2, a Lesser strike of 2 becomes 1). This rule isn't in the simulator's balance yet.

## Wards (Protection)

- A ward is a pile of ward winks.
- **One ward at a time:** casting a new ward replaces the one you have (Normal rules change this, see **Normal rules**).
- **Strikes hit the ward first.** What breaks through goes to HP.
  - Example: a Normal strike (4) hits a ward of 3. The ward breaks and 1 goes through to HP.
- A ward **lasts until it runs out**. It loses **1 wink at every round end**, and strikes and dispels take it down.
- Ticks (burns, poison, minions) also hit the ward first.
- **Skeletons stand in front of the ward.** Each skeleton has 1 HP: every point of damage (strikes and ticks) kills one skeleton before anything reaches the ward. Only what gets past the skeletons meets the ward.
  - Example: a Normal strike (4) hits 3 skeletons and a ward of 5. 3 skeletons fall, and the last 1 takes the ward down to 4.
- **Graveguard** (Daveron's elite skeletons) work the same way but have **3 HP each**: damage wears down the oldest graveguard first, and each one falls when its HP runs out. Keep a die or extra winks by each one to track its HP.
  - Example: a Normal strike (4) hits 2 graveguard (3 HP each) and a ward of 5. The first graveguard falls (3), the second drops to 2 HP (1), and nothing reaches the ward.

## Dispels

- A Dispel hits the foe's **ward** if they have one, removing ward winks equal to its power.
- With no ward up, it removes the foe's **newest buff**. A **Greater** Dispel removes **every** buff.
- Curses are Dispel-type signature spells. They land on the foe even through a ward.

## Buffs and curses

There are no round counters. **Buffs last until a Dispel removes them**, and **curses last until the cursed wizard Cleanses**.

- **Cleanse** is a Dispel at yourself: **2 mana** (8 flicks), and it removes **all** your curses. (Normal rules give it levels, see **Normal rules**.)
- "Next strike" and "next pick" effects (Empower, Foresight, Vanish, Bewitch, Enthral and similar) go as soon as they're used.
- "Can't pick Damage next round" lasts for that one round only.
- Skeletons and graveguard aren't buffs: a Dispel never removes them, only damage does. Danse Macabre *is* a buff, so a Dispel can stop it.
- Casting a buff or curse that's already in play does nothing extra; minions (blades, skeletons, simulacra) stack up to their card's max.

## Round end

1. **Ticks:** curses on each wizard (burns, poison, plague, Agony and similar), then their regeneration, then their minions strike the foe.
2. **Sudden death:** from **round 8**, both wizards lose 1 HP at every round end, +1 more every 3 rounds after that (2 HP from round 11).
3. **Wards wear:** every ward loses 1 wink (in Normal rules, not a sealed one). A ward with no winks left is gone.
4. **Income:** each wizard gains **4 mana**, less any curse that cuts income.

## Keywords

- **Strikers take N:** whenever the foe strikes you, they lose N HP (straight to HP).
- **Every hit deals N less (min 1):** applies to strikes, after any +damage bonuses.
- **Can't pick Damage next round:** a lock. A wizard can't be locked two rounds running.
- **Heal:** never above your starting HP.
- **Blast N:** up to N of the strike's damage goes around the foe's ward straight to HP. Skeletons still soak it first; the rest of the strike meets the ward as usual.
  - Example: Blue Fire (7, blast 3) hits a ward of 8. 3 go straight to HP; the other 4 take the ward down to 4.
- **Teleport** (Frederick's Infernal Gate, a Protection card, so it resolves before any Dispel or Damage): he steps through the Gate. For the rest of that round nothing aimed at him lands (strikes, dispels and curses all fizzle) and nothing ticks on him. At round end, after the ticks, the players trade places at the table and he comes out in **Infernal Mantle**: his next strike ignores the foe's ward completely (skeletons still soak it). The Mantle is a buff, so a Dispel can strip it before he strikes. He can't cast the Gate two rounds running. Put a wink on his Gate card while the Mantle is on.

---

## Normal rules

Once the Beginner game feels easy, add these. The flick doesn't change.

### Elements

- A strike or Dispel in **a ward's own element** counts **+2** against it.
  - Example: a Normal Fire strike (4) hits a Fire ward of 5. It counts as 6, so the ward breaks and 1 goes through to HP.
  - Against skeletons, the +2 only applies to what gets past them and meets the ward.
- Remember (or mark) each ward pile's element.

### Topping up and layers

These replace "one ward at a time".

- **Top up:** casting a ward in the element of a pile you already have adds its winks to that pile, up to **one and a half times** the new ward (Lesser 6, Normal 12, Greater 18). It never makes the pile smaller.
  - Example: your Fire ward is down to 3 and you cast a Normal Fire ward (8). It becomes 11. Cast another and it stays at 12.
- **Layers:** casting a ward in a **new** element puts a second pile **on the outside** of the first. You can have **2 piles** at most; a third new element replaces the outer pile. All your piles together hold at most 20 winks.
- **Strikes hit the outer pile first.** If it runs out, the rest carries on into the pile beneath (with that pile's own +2), then to HP.
- Every pile wears at round end.

### Seals

- **Seal Ward** is a Protection you cast at yourself: **1 mana** and a Lesser flick. It seals your **outer** ward pile. Put a coin or a spare wink of another colour on the pile to mark it.
- A sealed pile **doesn't wear** at round end.
- A Dispel that meets a seal **only breaks the seal**, whatever its level, even a Greater one. So a sealed ward takes **two** Dispels: a cheap one for the seal, then one for the ward.
- Strikes ignore seals: they hit the pile as usual. A seal goes when its pile does.
- Putting a new pile on over a sealed one leaves the seal on the pile beneath, so you can seal, layer and seal again. Topping up a pile keeps its seal.

### Greater Dispels

- A Dispel hits the **outer** pile. A Lesser or Normal Dispel stops at the pile it breaks. A **Greater** Dispel carries what's left into the next pile (a seal there stops it), and if it breaks **both** piles with power to spare, it removes **every** buff too.
  - Example: a Greater Arcane Dispel (12) meets a Fire pile of 5 over an Arcane pile of 9. The Fire pile breaks with 7 to spare, which counts as 9 against the Arcane pile, and that breaks too.

### Cleanse by level

This replaces the Beginner Cleanse. Cleanse costs **1 mana per level**, and you flick for it as usual:

| Cleanse | Cost | Flicks | Removes |
|---|---|---|---|
| Lesser | 1 | 9 | 1 curse of your choice |
| Normal | 2 | 8 | 2 curses of your choice |
| Greater | 3 | 7 | all your curses |

---

## Advanced rules

For masters of tiddlywinks, potting about 3 flicks in 4 from their handicap line. Every Normal rule stays; these replace **The flick**, and add squops. A few wizards start with different HP (shown in **Wizards**).

### The Advanced flick

- **The level sets how many winks you must pot:** **1** for Lesser, **2** for Normal, **3** for Greater. Signature spells use their card's level; Seal Ward is Lesser.
- **After a miss, pay 1 more mana wink to have another go.** Your run carries on: a Normal spell needs 2 potted winks however many misses come between. If you can't pay, or don't want to, the spell **fizzles** and the mana you paid for it is lost.
- **Missed winks stay where they land, round after round,** until someone squops them.
- **Distance is your handicap.** For example, a beginner might flick from 15 cm, a regular player from 25 cm and an expert from 35 cm. Adjust the lines between games until wins even out.

### Squops

After the spells resolve, before the round end, the players take turns squopping (landing a wink on top of) **any missed mana wink on the table**: their own or the other player's, from this round or earlier ones.

- **Each player gets 3 attempts a round.** Take turns, one attempt each.
- **Each wink you squop is yours:** add it to your mana. Unsquopped winks stay where they are for next round.
- **Who goes first:** the player with the closer handicap line. If the lines are the same, whoever potted more winks this round. If that's tied too, whoever has less HP.

The simulator assumes an Advanced player pots **75%** of flicks from their handicap line and lands **40%** of squop attempts. Advanced games average about 8 rounds.
<!-- dev:start -->
(`RULES.pot` and `RULES.squop` in `js/tabletop.js`.) Change them once you know your real rates, then re-run the balance check.
<!-- dev:end -->

---

## Wizards

<!-- characters:start -->
### ELDRIN — The Stalwart
**HP 11** · Normal rules: Seal Ward seals every one of your ward piles at once

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Shield** | Protection | Arcane | Normal | 4 | Arcane ward of 16 for 4 mana (a Greater ward is only 12, for 6). |
| **Counter** | Protection | Lightning | Normal | 2 | Until dispelled: anyone who strikes you takes 4, and your wards don't wear down. |
| **Ward** | Protection | Ice | Normal | 2 | Until dispelled: curses can't touch you. A dispel at you only removes this Ward. |

### MALACHAR — The Relentless
**HP 11** (Advanced rules: **10**) · Can't cast: Arcane

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Empower** | Protection | Fire | Lesser | 2 | Your next strike deals double damage. |
| **Blood Pact** | Protection | Dark | Lesser | 1 | Turn 3 HP winks into mana winks before you flick, and pot with them. If it is cast, gain 4 more mana. |
| **Drain** | Damage | Dark | Normal | 4 | Dark strike of 5. Heal half the HP damage it deals (round down). |

### SYLVARA — The Verdant
**HP 11** · Can't cast: Fire, Dark

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Regen** | Protection | Physical | Normal | 3 | Until dispelled: heal 1 at every round end. |
| **Entangle** | Dispel | Physical | Lesser | 2 | Roll a die: on 4+ the foe can't pick Damage next round. |
| **Vine Whip** | Damage | Physical | Normal | 3 | Physical strike of 3. Until cleansed, vines deal 1 to the foe at every round end. |

### AURELIA — The Radiant
**HP 12**

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Foresight** | Protection | Lightning | Normal | 2 | The next strike at you does nothing. |
| **Time Drain** | Dispel | Arcane | Normal | 2 | Until cleansed: the foe gains 1 less mana each round (and from Meditate). |
| **Rewind** | Protection | Arcane | Normal | 6 | Arcane ward of 7, and heal the HP you lost last round (max 5). |

### GNASH — The Feral
**HP 11** · Can't cast: Arcane, Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **War Paint** | Protection | Physical | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |
| **Savage Charge** | Damage | Physical | Normal | 4 | Physical strike of 5. The foe loses 2 mana. |
| **Frenzy** | Protection | Fire | Lesser | 2 | Until dispelled: your strikes deal +2, but each costs you 1 HP. |

### CINDER — The Volatile
**HP 11** (Advanced rules: **10**) · Can't cast: Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Fireball** | Damage | Fire | Lesser | 2 | Fire strike of 4 (a Lesser strike is 2). |
| **Flame Shield** | Protection | Fire | Normal | 5 | Fire ward of 8. While it holds, anyone who strikes you takes 2. |
| **Candle** | Dispel | Fire | Normal | 2 | Until cleansed: the foe takes 2 each time they cast Protection or Meditate. |

### SKADI — The Permafrost
**HP 11** · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Ice Lance** | Damage | Ice | Normal | 5 | Ice strike of 5. If it reaches HP, the foe can't pick Damage next round. |
| **Frost Armor** | Protection | Ice | Normal | 3 | Until dispelled: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Blizzard** | Dispel | Ice | Normal | 3 | Until cleansed: at every round end the foe takes 1 and loses 1 mana. |

### ZAKKIT — The Warpstorm
**HP 11** · Can't cast: Physical

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Warp-Charge** | Protection | Lightning | Lesser | 2 | Your next Lightning strike deals +4. |
| **Warp Lightning** | Damage | Lightning | Normal | 4 | Lightning strike of 4. Roll a die: on 3+ it arcs for 2 more. |
| **Warpstone Curse** | Dispel | Lightning | Normal | 2 | Until cleansed: every strike on the foe deals +1. |

### MARY — The Devoted
**HP 11** · Can't cast: Dark, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Heal** | Protection | Arcane | Normal | 5 | Heal 6. |
| **Purge** | Dispel | Arcane | Lesser | 2 | Remove all your curses and heal 3. |
| **Radiant** | Damage | Arcane | Normal | 3 | Arcane strike of 3. The foe loses 2 mana. |

### MORDANT — The Defiler
**HP 11** · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Agony** | Dispel | Dark | Normal | 4 | Until cleansed: the foe takes 2 at every round end, unless they Meditated that round (Corruption stops Meditate escaping it). |
| **Silence** | Dispel | Arcane | Normal | 2 | Until cleansed: each spell the foe casts, they roll a die: on 1–2 it fails (no mana spent). |
| **Corruption** | Dispel | Physical | Normal | 2 | Until cleansed: the foe gains 1 less mana each round (and from Meditate), and Meditate doesn't escape Agony. |

### PONDER — The Apprentice
**HP 12** (Advanced rules: **10**) · Can't cast: Dark, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Vanish** | Protection | Arcane | Normal | 2 | The next strike at you misses. |
| **Mana Siphon** | Dispel | Arcane | Lesser | 2 | Quick: before anyone pays, steal 4 mana from the foe. |
| **Blink** | Protection | Lightning | Normal | 3 | Until dispelled: roll a die for each strike at you, on 4+ it misses. Plus a Lightning ward of 3. |

### DURIN — The Stoneheart
**HP 12** · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Stoneskin** | Protection | Physical | Normal | 5 | Physical ward of 9. |
| **Stonesoul** | Protection | Arcane | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |
| **Rockfall** | Damage | Physical | Greater | 5 | Physical strike of 7. |

### WEIZAN — The Bladecaller
**HP 11** (Advanced rules: **12**) · Can't cast: Dark

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Conjure Blade** | Protection | Physical | Normal | 2 | Conjure a blade (max 3). Until dispelled, each blade deals 1 to the foe at every round end. |
| **Bladestorm** | Damage | Physical | Normal | 2 | Needs a blade. Launch all your blades: a Physical strike of 3 per blade. The blades are used up. |
| **Iron Patience** | Protection | Arcane | Normal | 2 | Until dispelled: every hit on you deals 1 less (min 1). |

### GRETCH — The Festering
**HP 10** · Can't cast: Fire, Arcane

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Plague** | Dispel | Dark | Normal | 3 | Until cleansed: the foe takes 1 at every round end. |
| **Maggot Cloud** | Dispel | Physical | Normal | 2 | The foe loses 3 mana now. Until cleansed, they gain 1 less mana each round (and from Meditate). |
| **Bone Totem** | Protection | Dark | Normal | 4 | Plant a bone totem (one at a time). It has 4 HP and stands in front of your ward: damage (strikes and ticks) wears it down before anything reaches your ward. Dispels can't touch it. While it stands, heal 1 at every round end. |

### VALDRIS — The Undying
**HP 8** (Advanced rules: **9**) · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Raise Dead** | Protection | Dark | Normal | 4 | Raise 3 skeletons (max 5 on the table). Each has 1 HP and stands in front of your ward: every point of damage (strikes and ticks) kills one skeleton before anything reaches your ward. Dispels can't touch them. Each skeleton still standing deals 1 to the foe at every round end. |
| **Necrotic Drain** | Damage | Dark | Normal | 4 | Dark strike of 4. Heal half the HP damage it deals (round down). |
| **Soul Tithe** | Dispel | Dark | Lesser | 2 | Until cleansed: the foe loses 1 mana for each of your skeletons they kill. |

### MIREL — The Deceiver
**HP 10** · Can't cast: Physical, Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Simulacrum** | Protection | Arcane | Normal | 5 | Summon a simulacrum (max 2). Until dispelled, each deals 1 to the foe at every round end. |
| **Bewitch** | Dispel | Arcane | Normal | 2 | The foe's next strike hits themselves instead. |
| **Feint** | Damage | Arcane | Normal | 4 | Arcane strike of 4. The foe loses 2 mana. |

### THESSALY — The Gilded
**HP 12** (Advanced rules: **11**)

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Enthral** | Dispel | Arcane | Lesser | 2 | Secretly write down Damage, Protection or Dispel. If the foe's next pick is that, it's lost and you take up to 3 of the mana they paid. |
| **Arcane Weave** | Protection | Arcane | Normal | 2 | Your next strike deals +3 and makes the foe lose 2 mana. Plus an Arcane ward of 4. |
| **Spellbind** | Dispel | Dark | Normal | 2 | Until cleansed: the foe's most-cast category (Damage, Protection or Dispel) costs 3 more. |

### KORVATH — The Wyrmlord
**HP 11** · Can't cast: Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Dragon Scales** | Protection | Fire | Normal | 5 | Until dispelled: every hit on you deals 1 less (min 1), and strikers take 1. |
| **Wyrmfire Breath** | Damage | Fire | Normal | 4 | Fire strike of 4. Until cleansed, the foe burns for 1 at every round end. |
| **Ancient Wrath** | Damage | Physical | Greater | 7 | Physical strike of 9. Once per game. |

### FIZZWICK — The Concoctor
**HP 11**

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Caustic Bomb** | Damage | Dark | Normal | 3 | Dark strike of 3. Until cleansed, poison deals 1 to the foe at every round end. If the strike reached HP, the poison ignores wards. |
| **Volatile Tonic** | Protection | Physical | Lesser | 2 | Roll a die: on 1–3 heal 6; on 4–6 your next strike deals +3. |
| **Unstable Concoction** | Damage | Arcane | Normal | 4 | Arcane strike: roll a die and deal that much. On a 6, roll again and add it (keep going on 6s). |

### NYXARA — The Hollow
**HP 10** (Advanced rules: **12**) · Can't cast: Lightning

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Singularity** | Dispel | Dark | Normal | 3 | Until cleansed: a rift deals 2 to the foe at every round end. |
| **Gravity Well** | Damage | Dark | Normal | 3 | Dark strike of a third of the foe's HP (round down, min 3). |
| **Event Horizon** | Damage | Arcane | Greater | 7 | Arcane strike of half the foe's HP (round down, min 4). You take 2. |

### DAVERON — The Gravelord
**HP 9** (Advanced rules: **10**) · Can't cast: Fire

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Raise Graveguard** | Protection | Dark | Normal | 4 | Raise 1 graveguard (max 3 on the table). Each has 3 HP and stands in front of your ward: damage (strikes and ticks) wears down the oldest graveguard first, and only what gets past them reaches your ward. Dispels can't touch them. Each graveguard still standing deals 1 to the foe at every round end. |
| **Vanhal's Danse Macabre** | Protection | Arcane | Lesser | 2 | Needs a graveguard on the table. Until dispelled: each of your graveguard deals 1 more at every round end. |
| **Curse of the Years** | Dispel | Dark | Normal | 4 | Until cleansed: the foe takes 2 at every round end, whatever they did. Unlike Agony, Meditating doesn't escape it. |

### FREDERICK — The Black
**HP 10** · Can't cast: Ice

| Spell | Type | Element | Level | Cost | Effect |
|---|---|---|---|---|---|
| **Doom Bolt** | Damage | Dark | Lesser | 2 | Dark strike of 3. Blast: 1 of it goes around a ward straight to HP. |
| **Infernal Gate** | Protection | Fire | Lesser | 2 | Teleport: nothing aimed at you this round lands, and nothing ticks on you. At round end, trade places at the table: you come out in Infernal Mantle, and your next strike ignores the foe's ward (a Dispel can strip the Mantle first). Not two rounds running. |
| **Blue Fire** | Damage | Fire | Greater | 6 | Fire strike of 7. Big blast: 3 of it goes around a ward straight to HP. |

<!-- characters:end -->
