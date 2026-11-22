# WizardsDuel: Winks — Rulebook

A wizard duel for two, played with tiddlywinks, a deck of cards and a handful of tokens. Each round you both pick a spell in secret, reveal, then flick your six winks at the pot: the more you pot, the stronger the spell. A game is at most **12 rounds**, about 10–15 minutes.

These are the **Normal rules**, for two players. Rules for more players come later.

<!-- dev:start (left out if the app shows this rulebook) -->
- **Design and history:** `docs/winks-design.md`. **Engine and simulator:** the `winks` rule set in `js/tabletop.js`; wizards' numbers in `tabletop.json` (a `"rules":{"winks":{...}}` entry overrides the Normal one).
- **Balance check:** `node tools/winks_sim.js 200 daddy` (or `b`, `pooled`). The simulator flicks with real recorded games. Last run (eight wizards): 44.9–53.5% with Daddy's games, 46.7–52.9% with B's, about 10 rounds, about half the games decided on HP after round 12.
- Keep this rulebook to the Markdown the app's rules screen renders: headings, lists, tables, bold.
<!-- dev:end -->

---

## What you need

| Bit | How many | Used for |
|---|---|---|
| Tiddlywinks | **6 winks of your own colour** each, a squidger each, one pot | Casting |
| A deck of cards | 1 | Element cards (2–10) and the four Aces |
| Hand-made command cards | **11 each** | Your secret pick: Strike, Ward, Dispel, Attack, Guard, Grapple, Meditate, Cleanse, Ability 1, Ability 2, Ability 3 |
| Wizard sheets | 1 per wizard | HP, Attack, barred elements and three abilities |
| Tokens | 25 each of red, blue, green, yellow | **Red** HP, **blue** mana, **green** wards, **yellow** skeletons and markers |
| A coin | 1 | Who picks first |
| Dice | a few | Spare counters (a die showing 4 stands for 4 tokens) |

## The wizards

Eight wizards to start, four men and four women. Each has HP, an **Attack** (how hard they hit with their hands), **barred** elements they can never cast, and three **abilities**. Copy each one onto its wizard sheet.

| Wizard | HP | Attack | Barred | Plays like |
|---|---|---|---|---|
| **Eldrin** the Stalwart | 11 | 1 | none | Big wards, punishes strikers |
| **Malachar** the Relentless | 11 | 1 | Arcane | Double strikes, drains life |
| **Cinder** the Volatile | 11 | 1 | Ice, Water | Cheap fireballs, burning curses |
| **Skadi** the Permafrost | 11 | 1 | Lightning | Armour, freezing strikes, slow drain |
| **Gnash** the Feral | 10 | **2** | Arcane, Ice | Brawler: blows that ignore wards |
| **Valdris** the Undying | 11 | 1 | Fire | Skeletons that shield him and bite |
| **Mary** the Devoted | 11 | 1 | Dark, Lightning | Healing, cleansing, mana-burning light |
| **Sylvara** the Verdant | 11 | 1 | Fire, Dark | Regrowth, entangling, whipping vines |

Their abilities are listed at the end (**Wizard sheets**).

## Setup

1. **Pick wizards.** Take HP tokens (red) equal to your wizard's HP, and **6 mana** (blue).
2. **Pick the four elements.** There are eight elements, but only four are in play each game, one per suit. Toss the coin; the winner picks first, then the other player picks two, then the first player picks the last one (**A, B, B, A**).
   - You can't pick an element your wizard is barred from. You can pick one your foe is barred from.
   - Your abilities need their elements (see **Abilities**), so pick those first. If you leave one out, that ability can't be cast this game.
   - Mark each suit's **Ace** with its element (a sticky note, or a token on it) and lay the four Aces face up where both of you can see them.
3. **Make the element pile.** Shuffle all the **2–10** cards together (36 cards, 9 of each element). This pile is shared. The courts (J, Q, K) stay in the box.
4. **Draw 7** element cards each. Keep them hidden.
5. Agree your **handicap lines** (see **Handicap**).

**The eight elements**, in four opposite pairs: **Fire ↔ Water**, **Air ↔ Earth**, **Lightning ↔ Ice**, **Arcane ↔ Dark**.

**Limits:** nobody can hold more than **12 mana**, and a wizard's wards can't hold more than **12**. You can never heal above your starting HP.

## A round

1. **Pick in secret.** Lay two cards face down: **one command card** and **one element card**.
   - **Strike, Ward or Dispel:** a plain spell in the element card's element.
   - **Ability 1 / 2 / 3:** that ability. The element card must be **the ability's element**.
   - **Attack, Guard, Grapple, Meditate or Cleanse:** the element card is only a decoy, so your foe can't tell what you picked from the number of cards. It goes back to your hand.
   - Valdris also says his skeletons' **stance** (see **Skeletons**).
2. **Reveal** both picks.
3. **Pay.** Every spell, plain or ability, costs **3 mana**. Cleanse costs 3 too. Actions and Meditate are free. If you can't pay, your pick does nothing (take your element card back).
4. **Flick.** Everyone casting a spell flicks **all six** winks at the pot from their handicap line, one at a time. Whoever has less HP flicks first. Count how many went in (see **The flick**).
5. **Spend the element card.** A spell's element card is used up, cast or not: put it on the discard pile. A ward that's cast keeps its card under its pile instead (see **Wards**).
6. **Resolve, in this order:** every **Protection** (wards, Guard, protection abilities), then every **Dispel** (dispels, curses, Cleanse, Grapple), then every **Damage** (strikes, Attack), then **Meditate**. Within a stage, both happen at once.
7. **Round end** (see below).

## The flick

Flick all six. **Plain spells** (Strike, Ward, Dispel and Cleanse) take their level from how many you potted:

| Winks potted | Level | Recoup |
|---|---|---|
| 0 | **Fizzles** (the 3 mana is lost) | |
| 1 | Lesser | |
| 2 | Lesser | **+2 mana back** |
| 3 | Normal | |
| 4 | Normal | **+2 mana back** |
| 5 | Greater | |
| 6 | Greater | **+2 mana back** |

Easy to remember: **odd pots make the level, even pots give 2 mana back.**

**Abilities** have no levels. Each has a **difficulty** (1, 2 or 3 winks): pot at least that many and it goes off, as written on the sheet. Fewer, and it fizzles. Extra winks do nothing, and there's no recoup.

Pick your winks up after flicking. Nothing stays on the table.

## Plain spells

| Level | Strike | Ward | Dispel | Cleanse |
|---|---|---|---|---|
| Lesser | 2 damage | 4 | 4 | 1 curse |
| Normal | 4 damage | 8 | 8 | 2 curses |
| Greater | 6 damage | 12 | 12 | every curse |

Easy to remember: **strikes are 2 / 4 / 6, wards and dispels double that.**

## Wards (Protection)

- A ward is a pile of green tokens. **Its element card sits under it**, so both players can see its element. When the pile is gone, discard the card.
- **Magic hits the ward first.** Strikes and magic curses' damage take ward tokens before HP; whatever breaks through goes to HP.
  - Example: a Normal strike (4) hits a ward of 3. The ward breaks and 1 goes to HP.
- **Blows go past wards** (see **Actions and blows**).
- **Opposites:** a strike or dispel in the **opposite** of a ward's element counts **+2** against it.
  - Example: a Normal Water strike (4) hits a Fire ward of 5. It counts as 6: the ward breaks and 1 goes to HP.
- **Topping up:** a new ward in the **same** element as yours adds to it, up to one and a half times the new ward (Lesser 6, Normal 12). It never makes the pile smaller.
- **One ward at a time:** a ward in a **new** element replaces yours (discard the old card).
- A ward **lasts until it runs out**. It loses **1 token at every round end**.

## Dispels

- A dispel hits the foe's **ward** if they have one, taking away tokens equal to its power (+2 if it's the ward's opposite).
- With no ward up, it removes the foe's **newest buff**. A **Greater** dispel removes **every** buff.
- **Curses** are dispel abilities. They land even through a ward.

## Buffs and curses

- When an ability puts a buff on you, or a curse on your foe, **put a yellow token on that ability on your sheet**. Take it off when it ends.
- There are no round counters. **Buffs last until dispelled. Curses last until cleansed.** "Next strike" buffs (like Empower) go when used.
- **Cleanse** (a command card) removes your own curses: 1, 2 or all of them, by the winks you pot. You choose which.
- Casting a buff or curse that's already in play does nothing extra.

## Actions and blows

Every wizard can fight with their hands. Most are poor at it.

- **Attack, Guard and Grapple** cost nothing, need no flick and always go off. They last only the round you pick them. Your **Attack** number is on your sheet (Gnash 2, everyone else 1).
  - **Attack:** hit the foe for your Attack. **+1** if they Grapple this round (and their Grapple fails).
  - **Guard:** block every blow aimed at you this round. An Attack into your Guard misses, and you **counter** for your own Attack.
  - **Grapple:** against a Guard, hit for your Attack; against anything else, half your Attack (round down, so 0 for most wizards). A Grapple at someone who Attacks you fails.
  - They go round in a circle: **Attack beats Grapple, Grapple beats Guard, Guard beats Attack.**
- **Blows** are Attacks, skeletons' bites and abilities that say "a blow" (Savage Charge). **A ward never stops a blow. A Guard stops blows, never magic.**

## Swaps

**You can offer your foe a swap any time you're picking**, once a round: one element card for one, out loud ("my Fire for your Ice"). They can say no. You don't need to Meditate for it.

## Meditate

Skip your spell to **gain 3 mana and draw 2 element cards**. You can't Meditate two rounds running. Then you may make **one trade with the pile**: discard **two cards of the same element** to draw one more.

Meditate is the only way to draw cards, so watch your hand.

## Skeletons (Valdris)

- Raise Dead puts **skeletons** on the table: one yellow token each, **1 HP** each, at most 5.
- **Stance:** each round, when you pick, say whether your skeletons **guard** or **attack**. It's free.
  - **Guard:** they stand in front of you. Every point of damage, magic or blow, kills one skeleton before anything reaches your ward or you.
  - **Attack:** each skeleton bites the foe for 1 (a blow) at round end. They shield no one.
- **Aim at the skeletons:** a strike, Attack or Grapple can be aimed at the skeletons instead of the wizard. It **sweeps** them: one skeleton dies for each point of damage, and anything left over is lost. Worth it when they're attacking and there are several; a waste on one.
- Dispels can't touch skeletons; only damage can.

## Round end

1. **Ticks:** curses that bite each round (Blizzard), then skeletons bite (attack stance).
2. **Wards wear:** every ward loses 1 token (not while Eldrin's Counter is up).
3. **Income:** each wizard gains **4 mana** (no more than 12).
4. **Hand limit:** discard down to **7** element cards.

## Winning

- **Knockout:** a wizard at 0 HP loses at once. If both fall at the same moment, it's a draw.
- **After round 12:** whoever has **more HP** wins. Level HP is a draw.

## Handicap

The flick is the whole skill of the game, so even it out with distance. Each player flicks from their own **handicap line**: the better flicker stands further back.

- Start everyone at the same distance. After a few games, move the winner back (a hand's width is a good step) until games feel even.
- A good line is one where you usually pot **2–3 of your 6** winks. If you pot 5 or 6 most rounds, step back; if you often pot 0, step in.

---

## Wizard sheets

Each ability is listed with **the element card it needs** and its **difficulty** (the winks you must pot). Every ability costs 3 mana, like any spell.

### ELDRIN — The Stalwart

HP 11 · Attack 1 · Barred: none

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Shield** | Arcane | 2 | An Arcane ward of 12 (the most a ward can hold). |
| **2 Counter** | Lightning | 2 | Buff, until dispelled: anyone who strikes you takes 4, and your ward doesn't wear down. |
| **3 Ward** | Ice | 2 | Buff, until dispelled: curses can't touch you, and the next dispel at you only removes this Ward. |

### MALACHAR — The Relentless

HP 11 · Attack 1 · Barred: Arcane

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Empower** | Fire | 1 | Buff: your next strike deals double damage. |
| **2 Blood Pact** | Dark | 1 | Before you pay, turn 3 HP into 3 mana. If it goes off, gain 4 more mana. |
| **3 Drain** | Dark | 2 | A Dark strike of 5. Heal half the HP damage it deals (round down). |

### CINDER — The Volatile

HP 11 · Attack 1 · Barred: Ice, Water

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Fireball** | Fire | 1 | A Fire strike of 4. |
| **2 Flame Shield** | Fire | 2 | A Fire ward of 8. While it holds, anyone who strikes you takes 2. |
| **3 Candle** | Fire | 2 | Curse, until cleansed: the foe takes 2 each time they cast Protection or Meditate. |

### SKADI — The Permafrost

HP 11 · Attack 1 · Barred: Lightning

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Ice Lance** | Ice | 2 | An Ice strike of 5. If it reaches HP, the foe can't pick Damage next round. |
| **2 Frost Armor** | Ice | 2 | Buff, until dispelled: every hit on you deals 1 less (at least 1), and strikers take 1. |
| **3 Blizzard** | Ice | 2 | Curse, until cleansed: at every round end the foe takes 1 and loses 1 mana. |

### GNASH — The Feral

HP 10 · Attack 2 · Barred: Arcane, Ice

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 War Paint** | Earth | 2 | Buff, until dispelled: every hit on you deals 1 less (at least 1). |
| **2 Savage Charge** | Earth | 2 | A blow of 5 (wards don't stop it). The foe loses 2 mana. |
| **3 Frenzy** | Fire | 1 | Buff, until dispelled: your strikes deal +2, but each costs you 1 HP. |

### VALDRIS — The Undying

HP 11 · Attack 1 · Barred: Fire

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Raise Dead** | Dark | 2 | Raise 3 skeletons (at most 5 on the table). See **Skeletons**. |
| **2 Necrotic Drain** | Dark | 2 | A Dark strike of 4. Heal half the HP damage it deals (round down). |
| **3 Soul Tithe** | Dark | 1 | Curse, until cleansed: the foe loses 1 mana for each of your skeletons they kill. |

### MARY — The Devoted

HP 11 · Attack 1 · Barred: Dark, Lightning

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Heal** | Arcane | 2 | Heal 6. |
| **2 Purge** | Arcane | 1 | Remove all your curses and heal 3. |
| **3 Radiant** | Arcane | 2 | An Arcane strike of 3. The foe loses 2 mana. |

### SYLVARA — The Verdant

HP 11 · Attack 1 · Barred: Fire, Dark

| Ability | Needs | Difficulty | Effect |
|---|---|---|---|
| **1 Regen** | Earth | 2 | Buff, until dispelled: heal 1 at every round end. |
| **2 Entangle** | Earth | 1 | Curse: roll a die; on 4+ the foe can't pick Damage next round. |
| **3 Vine Whip** | Earth | 2 | A blow of 3 (wards don't stop it). Curse, until cleansed: vines deal 1 blow to the foe at every round end. |

---

## Quick reference

**Pick:** a command card and an element card, face down. Spells, abilities and Cleanse cost **3 mana**.

**Flick all six:** 0 fizzles · 1–2 Lesser · 3–4 Normal · 5–6 Greater · **even = +2 mana back**. Abilities: pot their difficulty.

**Strength:** strikes 2 / 4 / 6 · wards and dispels 4 / 8 / 12 · Cleanse 1 / 2 / all curses.

**Order:** Protection (and Guard) → Dispel (and Grapple) → Damage (and Attack) → Meditate.

**Wards:** magic hits them first, blows go past · opposite element +2 · same element tops up · new element replaces · −1 every round end.

**Meditate:** +3 mana, draw 2, one pile trade (a pair for a draw) · not two rounds running. **Swaps** with your foe: any round, one offer each.

**Round end:** ticks and bites → wards wear → +4 mana (max 12) → hand down to 7.

**Win:** knockout, or the most HP after round 12.
