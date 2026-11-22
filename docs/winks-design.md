# WizardsDuel: Winks — design proposal

The tiddlywinks game becomes its own thing, playable at a real table with a box of bits most homes have. The app's standard game is untouched. This replaces the counter-winks tabletop design (`docs/tabletop-rules.md`), which needed about 100 winks in four colours.

Status: **proposal**. Open questions are at the end; nothing here is built yet.

---

## The kit

| Bit | How many | What it does |
|---|---|---|
| Big Jigs tiddlywinks set | 5 colours × 6 winks, a squidger each, a pot | **Casting only.** Each player owns one colour: their 6 winks are their spell. Up to 5 players. |
| Standard deck of cards | 1 (up to 4 players), 2 (5+) | **Secret picks.** Each player takes one suit (13 cards). |
| Coin | 1–2 | 50/50 effects (Undertow, Blink), first player, seal markers. |
| Tokens | 25 each of red, blue, green, yellow | **Counters in a duel:** red HP, blue mana, green ward, yellow skin and minion HP. |
| Six-sided dice | up to 20 per player | Chance rolls, and **counters when tokens run out** (3+ players, or a big pile). |

Winks are no longer counters: with 6 a player there aren't enough, and it keeps the table clear for flicking.

## The cast: flick all six

Every spell is cast the same way: **flick all 6 of your winks at the pot**, from your handicap line, and count how many went in.

### Standard spells (Damage, Protection, Dispel)

You pick the category and element in secret. **How well you flick decides how strong it is**:

| Winks potted | Result |
|---|---|
| 0 | Fizzles |
| 1 | Lesser |
| 2 | Lesser + **recoup** |
| 3 | Normal |
| 4 | Normal + **recoup** |
| 5 | Greater |
| 6 | Greater + **recoup** |

Easy to remember: **odd is the level, even is the level below with mana back.** (Every 2 pots climbs a level; the in-between pot pays you.)

Strengths stay as now: Lesser / Normal / Greater strike 2 / 4 / 6, wards and dispels double that.

**Payment: one flat cost.** Every spell costs the same mana to cast, paid before you flick, whatever level you reach: the level is earned by skill, not bought. **Recoup** gives some of it back. A fizzle loses the cost.

- Starting numbers for the simulator: **cost 3**, **recoup 2**, income 4 a round. Tuned against the user's baseline scores.
- Mana's job becomes "can I cast this round, or must I Meditate / use an Action", rather than "how big".

### Ability spells (signature cards)

No levels. Each card has a **difficulty**: pot at least that many winks and it goes off, at the card's one fixed strength. It costs the same flat cost as any spell (decided: the difficulty is the balancing lever, not the price; a few cards may need a cost of their own). Fewer and it fizzles. Extra pots do nothing (decided: one number to remember).

A first mapping from today's cards (69 cards: 15 Lesser, 50 Normal, 4 Greater): **Lesser → difficulty 2, Normal → 3, Greater → 4**, then tuned per card by the simulator. A card's difficulty is printed on it in place of its level.

### What the flick odds mean

Chance of each result with 6 winks, by how often a player pots a single flick:

| Pot rate | 0 (fizzle) | 1 | 2 | 3 | 4 | 5 | 6 | Normal or better | Greater |
|---|---|---|---|---|---|---|---|---|---|
| 12% | 46% | 38% | 13% | 2% | 0% | 0% | 0% | 3% | 0% |
| 25% | 18% | 36% | 30% | 13% | 3% | 0% | 0% | 17% | 0% |
| 40% | 5% | 19% | 31% | 28% | 14% | 4% | 0% | 46% | 4% |
| 55% | 1% | 6% | 19% | 30% | 28% | 14% | 3% | 74% | 16% |
| 70% | 0% | 1% | 6% | 19% | 32% | 30% | 12% | 93% | 42% |

The table only plays well if most flicks land in the 1–4 range, which needs a pot rate of roughly **30–55%** from the handicap line. The first counter-winks trial was 12% (7 in 57); at that rate half of all casts fizzle and Greater never happens. **The handicap line is the dial:** move closer until a typical round pots 2–3.

## Secret picks with cards

Each player takes **one suit, all 13 cards**, and picks by laying **two cards face down**: a *what* card and a *which* card.

| What | Which | Pick |
|---|---|---|
| **J** Damage | **A–8** element | a strike in that element |
| **Q** Protection | **A–8** element | a ward in that element |
| **K** Dispel | **A–8** element | a dispel in that element |
| **10** Ability | **A / 2 / 3** | your 1st / 2nd / 3rd signature card |
| **9** Body | **A / 2 / 3 / 4** | Attack / Guard / Grapple / Meditate |
| **Q** | **9** | Seal Ward (yourself) |
| **K** | **9** | Cleanse (yourself) |

Elements by rank, in wheel order so **opposites are 4 apart**: A Fire, 2 Air, 3 Lightning, 4 Arcane, 5 Water, 6 Earth, 7 Ice, 8 Dark (A ↔ 5, 2 ↔ 6, 3 ↔ 7, 4 ↔ 8). Barred elements: set those cards aside at setup.

Target (3+ players): point the pair at the player you're aiming at.

## Counters: tokens, then dice

In a duel, tokens are the counters (you can see a pile at a glance, and paying mana is handing tokens back):

- **HP: red.** 25 covers two wizards while HP stays at 12 or less each (the current tabletop HPs are 8–12).
- **Mana: blue.** Cap **12 each** in a duel so 25 covers both.
- **Ward: green.** Each pile sits on that element's card (the A–8 you cast it with), so its element shows. The 25 are shared; cap 12 per wizard across all piles.
- **Yellow:** Ironskin, and each minion's HP (one small stack per body; a skeleton is 1 token).
- **Buffs and curses:** the signature card face up in front of whoever it's on; a coin on it for "until used" effects, a die for anything that counts down (Vanish).
- **Chance:** a d6 where the old rules had a percentage; a coin for 50/50.

**3–5 players or when a colour runs out:** use dice instead, totalled (12 HP = two dice showing 6 and 6). Twenty a player covers everything; mixing tokens and dice is fine (a die stands for that many tokens).

## Round flow

1. **Pick:** two cards face down (and your minion stance, if you have bodies).
2. **Reveal** together.
3. **Pay** the flat cost.
4. **Flick:** everyone casting a spell flicks their 6 winks, in turn (the player with the least HP first). Actions and Meditate don't flick.
5. **Resolve:** Protection, then Dispel, then Damage, then Meditate, as now.
6. **Round end:** ticks, ward wear, income (+4 mana), skin upkeep.

Aim: **about 12 rounds, 10–15 minutes** — the length of the user's 12-round flicking trial.

## What carries over, what goes

- **Carries over:** costs and strengths, eight elements and opposites (+2), Actions and blows, Ironskin, minions as bodies and stances, wards lasting until worn down, buffs until dispelled, curses until cleansed, the wizards and their cards (with a difficulty instead of a level).
- **Goes:** wink counters, choosing a level, "flick 10 minus the cost", retries, missed winks left on the table, and squops (a squop can't become mana when winks aren't mana).
- **One rule set to start: Normal.** This is a rewrite, so the other modes (Beginner, Survival, the app's tutorial) are redone later, once Normal plays well.

## Building it

- Add a `six` flick mode to `js/tabletop.js` (flat cost paid up front, level and recoup from potted winks, signature `difficulty`), Normal rules only, so the existing simulator and `tools/balance.html` can balance it at several pot rates, keeping every wizard within ±8% of 50% and games near 12 rounds.
- Add `difficulty` to each card in `tabletop.json`.
- Write `docs/winks-rules.md` as the new rulebook (the app's 🎲 Tabletop screen renders it), and retire the old one.

## Open questions

1. **Calibration:** the user is supplying baseline scores (winks potted per round). They set the pot rate the simulator balances for, then the flat cost and recoup.
2. **Recoup size:** 2 back (of 3), or the whole cost back?
3. **Card exceptions:** do any signature cards need their own cost (summons, big heals), or is difficulty enough?
