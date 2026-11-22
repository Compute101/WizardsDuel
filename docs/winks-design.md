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

**One card per pick.** Each player has their own deck (two decks for a duel).

### Setup: the suits become four elements

- Each game uses **four elements**, one per suit; the other four aren't in play that game.
- **Pick them in turn** (a duel: A, B, B, A), so each player takes two. Pick your wizard's strengths, or take one your foe's best ability relies on. You can't pick one of your own barred elements, but you can pick one your foe is barred from.
- Each player lays their **four Aces face up** in front of them, each marked with its element (a sticky note, or a token of the right colour on it). They're the reminder of which suit is which, and **your ward piles sit on the Ace of their element**.
- Opposites still count (+2 against a ward) when both of a pair are in play.

### Picking: the court card says what, the suit says which element

| Card | Pick | Remember it as |
|---|---|---|
| **Jack** | **Damage** in that suit's element | the knave attacks |
| **Queen** | **Protection** (a ward) | the queen shields |
| **King** | **Dispel** | the king's word undoes |

So the J♥ is a strike in whatever element hearts is this game. That's the only part to memorise: everything else is printed on the reference card and the wizard sheet, with the card to play beside it:

| Card (any suit) | Pick |
|---|---|
| 2 / 3 / 4 | your 1st / 2nd / 3rd ability (the sheet numbers them 2, 3, 4) |
| 5 | Attack |
| 6 | Guard |
| 7 | Grapple |
| 8 | Meditate |
| 9 | Seal Ward (your outer pile) |
| 10 | Cleanse |

Each player keeps **the 12 court cards and one each of 2–10**: 21 cards in hand, the rest of the deck stays boxed.

Target (3+ players, later): point the card at the player you're aiming at.

## Hand-made cards: as few as possible

The standard deck does the picking, so the only cards to make are:

- **One wizard sheet per wizard** (a postcard or an index card), not three ability cards: name, HP, Attack, barred elements, its three abilities (each with difficulty, cost if it differs, and what it does; labelled 2, 3 and 4, the card that picks them), and the Actions' cards (5–10) as a reminder. Ward piles sit on the Aces, so the sheet needs no element wheel. Buffs and curses are marked on the ability boxes, so no status cards are needed.
- **One reference card per player** (optional): the six-wink result table and the two-card pick table.

**Start with 6 wizards** (agreed) (6 sheets, plus 2 reference cards), not all 23. Pick a spread that shows the system off with simple abilities: for example Eldrin (wards), Malachar (curses and drain), Cinder (big strikes), Skadi (ice and armour), Gnash (blows) and Valdris (skeletons). The simulator balances those 6 against each other first; more sheets come once Normal plays well.

## Counters: tokens, then dice

In a duel, tokens are the counters (you can see a pile at a glance, and paying mana is handing tokens back):

- **HP: red.** 25 covers two wizards while HP stays at 12 or less each (the current tabletop HPs are 8–12).
- **Mana: blue.** Cap **12 each** in a duel so 25 covers both.
- **Ward: green.** Each pile sits on the face-up Ace of its element, so its element shows. The 25 are shared; cap 12 per wizard across all piles.
- **Yellow:** Ironskin, and each minion's HP (one small stack per body; a skeleton is 1 token).
- **Buffs and curses:** a yellow token on that ability's box on the caster's sheet means it's in play (a buff on the caster, a curse on the foe). A coin on the box for "until used" effects, a die for anything that counts down (Vanish).
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

- Add a `six` flick mode to `js/tabletop.js` (flat cost paid up front, level and recoup from potted winks, signature `difficulty`), Normal rules only, with the four-element draft (an AI drafter), so the existing simulator and `tools/balance.html` can balance it at several pot rates, keeping every wizard within ±8% of 50% and games near 12 rounds.
- Add `difficulty` to each card in `tabletop.json`.
- Write `docs/winks-rules.md` as the new rulebook (the app's 🎲 Tabletop screen renders it), and retire the old one.

## Open questions

1. **Calibration:** the user is supplying baseline scores (winks potted per round). They set the pot rate the simulator balances for, then the flat cost and recoup.
2. **Recoup size:** 2 back (of 3), or the whole cost back?
3. **Card exceptions:** do any signature cards need their own cost (summons, big heals), or is difficulty enough?
4. **Element pick:** drafted in turn (above), or dealt at random for quicker setup? Abilities keep their own element and work whichever four are in play.
