# WizardsDuel: Winks — design proposal

The tiddlywinks game becomes its own thing, playable at a real table with a box of bits most homes have. The app's standard game is untouched. This replaces the counter-winks tabletop design (`docs/tabletop-rules.md`), which needed about 100 winks in four colours.

Status: **proposal, with a first simulation** (see **First simulation**). Open questions are at the end.

---

## The kit

| Bit | How many | What it does |
|---|---|---|
| Big Jigs tiddlywinks set | 5 colours × 6 winks, a squidger each, a pot | **Casting only.** Each player owns one colour: their 6 winks are their spell. Up to 5 players. |
| Standard deck of cards | 1 per duel | **Element cards:** each suit is one of the four elements in play; 2–10 make a shared pile, the Aces mark the suits. |
| Hand-made cards | 11 command cards a player, 1 sheet a wizard | Strike, Ward, Dispel, Attack, Guard, Grapple, Meditate, Cleanse, Ability 1–3. |
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

- **Cost 3**, **recoup 2**, income 4 a round, Meditate +3 (simulated, see **First simulation**).
- Mana's job becomes "can I cast this round, or must I Meditate / use an Action", rather than "how big".

### Ability spells (signature cards)

No levels. Each card has a **difficulty**: pot at least that many winks and it goes off, at the card's one fixed strength. It costs the same flat cost as any spell (decided: the difficulty is the balancing lever, not the price; a few cards may need a cost of their own). Fewer and it fizzles. Extra pots do nothing (decided: one number to remember).

From today's cards (69 cards: 15 Lesser, 50 Normal, 4 Greater): **Lesser → difficulty 1, Normal → 2, Greater → 3** (2 / 3 / 4 was tried: at the user's pot rate a difficulty-3 ability went off about 1 time in 3, and Valdris, all abilities, won 35%). A card can set its own `difficulty`. A card's difficulty is printed on it in place of its level.

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

## Cards: command cards and a shared hand of elements

### Command cards (hand-made, 11 a player, kept all game)

**Strike · Ward · Dispel · Attack · Guard · Grapple · Meditate · Cleanse · Ability 1 · Ability 2 · Ability 3**

The ability cards are generic (just a number); your wizard sheet says what 1, 2 and 3 are. Seal Ward waits until layered wards come back; it would be a twelfth card.

### Setup: four elements, one per suit

- **Pick the elements in turn** (a duel: A, B, B, A), two each, and mark one **Ace** per suit with its element (a sticky note, or a token on it). Lay the four Aces face up as the reminder. The other four elements aren't in play this game.
- You can't pick an element you're barred from; you can pick one your foe is barred from.
- Opposites (+2 against a ward) count when both of a pair are picked: Fire ↔ Water, Air ↔ Earth, Lightning ↔ Ice, Arcane ↔ Dark.
- **The element pile** is the rest of one deck, 2–10 (36 cards, 9 of each element; the courts stay in the box), shuffled and **shared**. Each player draws **7**. When it runs out, shuffle the discards. The rank doesn't matter.

### Picking: one command card and one element card, face down

| Command card | Pick | The element card |
|---|---|---|
| **Strike / Ward / Dispel** | that spell in the card's suit's element | is used up (a ward's sits under its pile as the marker, discarded when the pile is gone) |
| **Ability 1 / 2 / 3** | that ability from your sheet | must be **the ability's element**, and is used up. If that element isn't in play, the ability can't be cast this game |
| **Attack / Guard / Grapple / Meditate / Cleanse** | that | is a decoy, back to your hand |

- Always laying two cards keeps the pick secret. With no element card left, lay a face-down card from the pile as the decoy.
- A card of an element you're barred from is only good as a decoy (or trade a pair of them when you Meditate).

### Abilities are as well as, never instead of

An ability doesn't take over any element: your plain spells in its element are still there (Cinder keeps a plain Fire strike as well as Fireball). It **does need a card of its element**, like any spell, so pick your abilities' elements at setup and hold on to them. **No fallback:** an ability whose element nobody picked can't be cast that game. Which elements you pick is your choice (Eldrin's abilities are Arcane, Lightning and Ice, so with two picks he chooses which two he wants, or hopes his foe picks the third). Its element also counts for opposites against a ward. This is the user's rule: an ability replacing its own element's plain spell made a wizard worse at their own magic (Daveron's Dark).

### Meditate

Skip your spell: **draw 2 element cards and gain 3 mana**. Not two rounds running.

- **One trade per Meditate**, either:
  - **with the pile:** discard **2 cards of the same element** to draw 1 more; or
  - **with another player:** offer them a swap, one card for one, and haggle openly ("my Fire for your Ice"). They can say no, and a no doesn't use up your trade (you can still trade with the pile). In a duel it happens when both of you hold cards the other wants (a card you're barred from is worth something to your foe); with 3–5 players it's table talk.
- Hand limit **7**: discard down at round end. Meditate is the only way to draw.

Target (3+ players, later): point the cards at the player you're aiming at.

## Hand-made cards: as few as possible

The standard deck gives the elements, so the only cards to make are:

- **One wizard sheet per wizard** (a postcard or an index card), not three ability cards: name, HP, Attack, barred elements, its three abilities (each with difficulty, cost if it differs, and what it does; numbered 1–3 for the Ability cards). Ward piles sit on their element card, so the sheet needs no element wheel. Buffs and curses are marked on the ability boxes, so no status cards are needed.
- **11 command cards per player** (Strike, Ward, Dispel, Attack, Guard, Grapple, Meditate, Cleanse, Ability 1–3).
- **One reference card per player** (optional): the six-wink result table and the round order.

**Start with 6 wizards** (agreed) (6 sheets and 22 command cards), not all 23. Pick a spread that shows the system off with simple abilities: for example Eldrin (wards), Malachar (curses and drain), Cinder (big strikes), Skadi (ice and armour), Gnash (blows) and Valdris (skeletons). The simulator balances those 6 against each other first; more sheets come once Normal plays well.

## Counters: tokens, then dice

In a duel, tokens are the counters (you can see a pile at a glance, and paying mana is handing tokens back):

- **HP: red.** 25 covers two wizards while HP stays at 12 or less each (the current tabletop HPs are 8–12).
- **Mana: blue.** Cap **12 each** in a duel so 25 covers both.
- **Ward: green.** Each pile sits on the element card it was cast with, so its element shows. The 25 are shared; cap 12 per wizard across all piles.
- **Yellow:** Ironskin, and each minion's HP (one small stack per body; a skeleton is 1 token).
- **Buffs and curses:** a yellow token on that ability's box on the caster's sheet means it's in play (a buff on the caster, a curse on the foe). A coin on the box for "until used" effects, a die for anything that counts down (Vanish).
- **Chance:** a d6 where the old rules had a percentage; a coin for 50/50.

**3–5 players or when a colour runs out:** use dice instead, totalled (12 HP = two dice showing 6 and 6). Twenty a player covers everything; mixing tokens and dice is fine (a die stands for that many tokens).

## Round flow

1. **Pick:** two cards face down (and your minion stance, if you have bodies).
2. **Reveal** together.
3. **Pay** the flat cost.
4. **Flick:** everyone casting a spell flicks their 6 winks, in turn (the player with the least HP first). Actions and Meditate don't flick.
5. **Resolve:** Protection, then Dispel, then Damage, then Meditate.
6. **Round end:** ticks, ward wear, income (+4 mana), skin upkeep.

**At most 12 rounds** (10–15 minutes, the length of the user's 12-round flicking trials). A knockout wins at once; otherwise, after round 12, **the most HP wins**, and level HP is a draw. No sudden death.

## What carries over, what goes

- **Carries over:** costs and strengths, eight elements and opposites (+2), Actions and blows, Ironskin, minions as bodies and stances, wards lasting until worn down, buffs until dispelled, curses until cleansed, the wizards and their cards (with a difficulty instead of a level).
- **Goes:** wink counters, choosing a level, "flick 10 minus the cost", retries, missed winks left on the table, and squops (a squop can't become mana when winks aren't mana).
- **One rule set to start: Normal.** This is a rewrite, so the other modes (Beginner, Survival, the app's tutorial) are redone later, once Normal plays well.

## First simulation (built)

The Winks rules are a rule set in the tabletop engine: `TT.useRules('winks')` in `js/tabletop.js` (flick mode `six`, `flatCost`, `recoup`, `difficulty`, and `cards` for the draft, the shared pile, hands, Meditate's draw and trade). Run `node tools/winks_sim.js [games] [daddy|b|pooled|rate:0.4]`.

**The AI flicks with the user's real scores** (`WINK_SCORES`, kept game by game; `simMatch(…, {scores:{p1, p2}})`). Each simulated match draws **one** of that player's real 12-round games and plays its rounds in shuffled order. Rounds are never mixed between games (the user's rule): a good run stays a good run.

| Player | Rounds | 0 | 1 | 2 | 3 | 4 | 5 | 6 | Average | Pot rate |
|---|---|---|---|---|---|---|---|---|---|---|
| Daddy (practice and both matches) | 72 | 7 | 25 | 17 | 16 | 6 | 1 | 0 | 1.9 | 31% |
| B (both matches) | 24 | 0 | 2 | 5 | 7 | 9 | 0 | 1 | 3.1 | 52% |

**Results** (the starting six, 200 games a matchup, both sides drawing from the same player's games, 12-round limit):

| Scores | Win rates | Rounds | Knockouts | On HP after 12 | Draws |
|---|---|---|---|---|---|
| Daddy | 45.9–53.3% (Gnash top, Skadi bottom) | 10.1 (median 12) | 50% | 50% | 5% |
| B | 46.7–53.6% (Eldrin top, Malachar bottom) | 8.8 | 68% | 32% | 4% |

- **Game length:** about half of Daddy-level games reach round 12 and go to HP; B-level games end in a knockout more often.
- **Picks** (Daddy's scores): Damage 22%, Protection 21%, Meditate 18%, Dispel 13%, abilities about 16% in all, Attack 5%, Guard 2%.
- **Skill matters a lot** (and B is the better flicker): with Daddy's games against B's, Daddy wins **about 19%**. That's what the handicap line is for: B flicks from further back until it's near 50%.
- **Changes the simulator needed:** Meditate is allowed at full mana (it's how you draw; with income 4 and cost 3 mana was always full, hands ran dry and the AI just Attacked); Valdris HP 7 → **11** (his skeletons need Dark cards now), Skadi 11 → **10** (`"rules":{"winks":{"hp":n}}` in `tabletop.json`).
- **Swaps with the other player** are simulated (`cards.swap`, `trySwap`): the Meditating AI offers its least useful card for the element it wants most (`cardWorth`: nothing for a barred element, more for its abilities' elements, less for each it already holds); the other side agrees only if the card it gets is worth more to it than the one it gives, counting a little for helping its foe. About 1 ask a game (Daddy's games), 0.4 agreed; pile trades 1.1 a game.
- **The ward's card stays under its pile** until the pile is gone (`cards.wardCard`, `st.wardCards`, `syncWardCards`), so those cards are out of the pile meanwhile.
- **Effect of both:** within noise. With both off, the same run gave 46.9–53.4%; Malachar gains most from swaps (46.9 → 51.9%, he wants Fire and Dark for his abilities). Switch them off to compare: `node tools/winks_sim.js 200 daddy noswap,nowardcard`.
- **The decoy card** only keeps a pick secret; it changes no numbers, so the sim leaves it out.

## Open questions

1. **Handicap:** how far back should a stronger flicker stand? Measuring a few rounds from two distances would let the simulator suggest a line.
2. **Recoup size:** 2 back (of 3), or the whole cost back?
3. **Card exceptions:** do any signature cards need their own cost (summons, big heals), or is difficulty enough?
4. **Mana vs cards:** with a flat cost of 3 and income of 4, mana barely limits you, so cards do. Lower income (3), or a cost of 4? The simulator will show which keeps games near 12 rounds.
5. **Card draw:** is Meditate's 2 cards right, or should round end also draw 1?
