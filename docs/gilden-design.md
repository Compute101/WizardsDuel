# Gilden — design

Albra's richest city, on the south-east coast where the Narrows meet the Wolf Sea (`docs/world-design.md`,
"Albra and its seas"). The Ore Road comes down to it from Hollowmere through Chepstead; the Mainland's trade
comes ashore on its quay; the gnome airships moor on its Skyport and fly no further north. The name was a
placeholder ("Gilden?") until now; it's used as is.

The user's brief (November 2026):
- a rich merchant city with **a large docks district**;
- **charter as an escort** for merchant caravans of one of the houses, working the Ore Road from the mountains
  (stone, ore and other goods);
- **merchant families at each other's throats**: jobs for one upset the others; **each house has a powerful
  wizard and employs lesser wizards**;
- the houses may **enlist bandits** to attack your caravan, or **attack you themselves** if they really
  don't like you;
- **Thessaly** is there with her quest (not decided yet);
- from here you can **charter a boat to the Mainland**, or buy **a ticket on a gnome airship** if you have
  the gold.

## The city

`tools/mapgen/gilden.js` → `maps/gilden.json`, 64 × 50 tiles, a safe town (`safe`: no Echoes, rooms hold no
fights). North to south:

| Where | What's there |
|---|---|
| **The Caravanserai** (north-west, in at the Ore Gate) | the caravans' yard: covered wagons, ore carts, sacks; **the Charterhouse** and **the Charter Board** (Ezra Pollock, Master of the Charterhouse) |
| **The Hill** (Hill Street, along the north) | four palaces in their gardens, each with its banners: **Ashcombe Hall**, **Vellacourt House** (Thessaly's: banners down, gate chained), **Varenne House**, **Quarrender House** |
| **The Skyport** (Beacon Hill, north-east) | the gnomes' **Mooring Mast**, wind kites, porters' cargo, **the Sky Office** (Tibbet Quillaby) |
| **The middle** | **Exchange Square** with **the Gilded Exchange** (the houses shout prices under its dome at noon) and **the Guildhall**; **Counting-house Row** |
| **The Docks** (the whole south half) | **the Ropewalk** (chandlers, dockers' lodgings), **the Salt Purse** (the dockers' tavern: sleep there), **the Fish Market** (Mag Thrush the fishwife, who hears everything), **Customs Square** and **the Customs House**, the Old Man of the Narrows (a sea-god statue), **the Narrows Office** (Varenne's shipping office), a harbour tower, **Fettle's Yard** (the last independent shipyard: a hull on the slip), **the Long Quay** (three rows of granite with cranes, cargo, nets, a quintessence strongbox under guard; Captain Morwen Hask, the Harbourmaster), **five piers** into the harbour with boats, and **the mole** with **the Harbour Light** |

Ways out: the Ore Road north (to the world map: Chepstead, Hollowmere) and the Coast Road west (to
Ferryhythe, not built). On the world map Gilden is a new place kind, `port` (a ring wall, towers, a dome and an
anchor, a gold glow), and the sea now has a southern coast with **the Narrows**; **Chepstead** is a wayside inn
(`kind:'inn'`) between it and Hollowmere, about 10 hours on foot each way.

## The houses

Three great houses and a fallen fourth. Each great house has a head, a **house wizard** (its "powerful
wizard"; see House wizards below) and a **hired mage** of its own (a painted wizard, `gd_hire_<house>`, the "lesser wizards"
that ride with bandits for it). Each feuds hardest with one other (a cycle):

| House | Mark | Trade | Head | House wizard | Feuds hardest with |
|---|---|---|---|---|---|
| **Ashcombe** | a flame over a hammer (red) | copper, tin and quintessence down the Ore Road | Dame Constance Ashcombe | **Grozdak Emberfist**, the Forge-Mage (an orc) | Varenne (who toll every cart that reaches the quay) |
| **Varenne** | a silver anchor (blue) | the fleet, the Varg sea-toll, the southern run | Gaspard Varenne | **Vigdis Tidegrim**, the Sea-Witch (a Varg) | Quarrender (airships against ships) |
| **Quarrender** | a winged scale (purple) | banking; agents of the gnome airships | Perpetua Quarrender | **Nimble Cogglesworth**, the Windwright (a gnome) | Ashcombe (both want the quintessence) |
| **Vellacourt** (fallen) | a gold coin | none now | **Thessaly** | herself | all three |

House Ashcombe was already in the game: Master Orme in Hollowmere is its factor. The Remnant Library's book
*Gilden: the Golden Ledger* has a chapter on "the House of the Gilded Daughter" cut out with a razor; that is
the Vellacourts.

### House wizards

**Three original wizards, designed by the user** (November 2026; the names are Claude's placeholders, to rename
freely). Frederick the Black and Malachar the Relentless were the first idea; the user moved them to the Brazen
Dominion's service on the Mainland instead (`docs/world-design.md`). Korvath was on Quarrender's board at first;
the user replaced him too.

**The rule (the user's):** house wizards are Gilden's own characters, never roster wizards, because the roster
are wizards you can play or recruit and a house wizard never joins you (riding with one caravan isn't joining).
They live only in Explore, like the bandit mages: not on the character screen, no tabletop cards, and not held to
the roster's ±8%.

| House | Wizard | Who | Kit (`MAGI` in `js/explore_gilden.js`) | HP / Attack | Barred |
|---|---|---|---|---|---|
| Quarrender | **Nimble Cogglesworth**, the Windwright | a gnome air mage of Gimbaldry. Gnome airships fly by Air magic and must carry an air mage at all times; he's done the Varrow run ninety times, and Quarrender rents him between ships | **Gale** (his own: a Dispel curse, 4 air a round × 4); Downdraught (Air strike 15); The Envelope (Air ward 30) | 66 / 3, drawn small (0.6) | Earth |
| Varenne | **Vigdis Tidegrim**, the Sea-Witch | a Varg pirate witch who came over to Varenne: she collects her own people's sea-toll now, and keeps a share | **Drown** (her own: a Dispel curse, 4 water a round × 3 and a silence, half the foe's spells fail × 2); Rogue Wave (Water strike 16); Sea-Fog (Water ward 30) | 72 / 5 | Fire |
| Ashcombe | **Grozdak Emberfist**, the Forge-Mage | an orc forge mage, a warrior wizard: strong and tough. He weathers your magic and blows and beats you hand to hand | **Forge-Fists** (a Protection buff: every Attack also burns for 6 fire, magic so a ward stops it, until dispelled); **Forged Hide** (his Ironskin: 2 mana, soaks 25); the usual wheel wards; the **brawler** AI | 80 / 6 | Water |

New in the battle engine for them (`js/game.js`): a curse can carry more effects (`also` on a signature's `el`,
each added with its own id and scaled by ring: Drown's silence); the `forgefist` buff (`fire` added to every plain
Attack that isn't Guarded or Vanished, after the blow, as magic fire; in `executeAction`); and `aiBrawler` on a
character (`AI_BRAWLER`: more Damage and Protection picks, Attacks 55% of his Damage picks and 85% with Forge-Fists
lit, keeps his skin up whatever's coming, lights his fists before anything else). In the sim his picks are Attack
26%, Ward 16%, Ironskin 14%, Forge-Fists 9%.

**Strength** (`simMatch`, 160 games each against ten roster wizards, Normal AI; Malachar, a balanced roster wizard,
wins 43% against the same field): Cogglesworth 43% at HP 66 (22% at 46), Grozdak 43% at HP 80, Vigdis about 35%
at HP 72 with 17% stalemates (Drown's silence and her ward drag games out; more HP barely moved her wins).

What each does in the game:
- stands on the Hill outside the house's palace, and talks (friendly, then cold below −3);
- rides with the bandits against your caravan when the house's standing with you is −8 or worse (at −6 and −7
  it sends its hired mage instead);
- rides with your caravan as an ally, once a run, when the house is Favoured (+6).

### Standing

`quests.gilden.st[house]`, from −10 to +10, starting at 0 (`TIERS` in `js/explore_gilden.js`):

| Standing | Tier | What it means |
|---|---|---|
| −6 or less | **Enemy** | its bravos jump you in Gilden's streets (at most every 12 minutes of play); its hired mage rides with the bandits on your charters, and at −8 its house wizard |
| −5 to −3 | **Cold** | it won't hire you; it pays bandits to hit your caravans |
| −2 to +2 | **Neutral** | business is business |
| +3 to +5 | **Trusted** | its charters pay 25% more; Varenne's passage is cheaper |
| +6 or more | **Favoured** | its house wizard rides with your caravan once a run; Quarrender's airship tickets are cheaper |

A charter for a house: **+2** with it, **−2** with the house it feuds hardest with, **−1** with the third. A
lost cargo: **−2** with your employer. A **gift** to a head (20 gold) mends one point, only while below 0.
Mag Thrush the fishwife tells you where you stand; so does the satchel's journal.

## Charters (escorting caravans)

The Charterhouse posts one charter per house that will hire you (`offers`), reposted every 15 minutes of play
and after every run:
- **the Chepstead run**: 2 days (to Chepstead and back), base pay 22;
- **the Hollowmere run**: 4 days (Chepstead, Hollowmere, Chepstead, home), base pay 44;
- danger 1–3 (⚔), +9 gold a point; strongbox, coin and credit cargoes +6; Trusted ×1.25.

Taking one: you sleep in the Charterhouse loft and leave at 06:00. Each leg is half a day on the road, a
chance of **ambush**, the other half, then a night at the stop (sleep to 60%). Ambush odds: 22% + 10% a point
of danger, +12% for each Cold house and +22% for each Enemy house that isn't your employer, at most 80%.

An ambush is a battle on the road backdrop: 2 bandits (3 at danger 3, or when a house is paying), soldiers,
archers and halberdiers at a level set by the danger and how far into the run you are; the caravan's guard
fights beside you when there's a seat; a Favoured employer's house wizard takes that seat instead. Win:
the bandits' purses, and if a house paid them, **a purse of new coin stamped with its mark** (you've caught
it: `sponsors`). Lose: the cargo is gone, no pay, −2 with your employer, and you're brought home.

### Tuning (first pass, not yet simulated)

Pay is about a potion and a half a day at danger 1, three at danger 3. A wizard who only rides for one house
drifts to Cold with that house's rival in about three runs, and Enemy in five, which is the point: you have to
choose, or spread your work, or pay gifts. Worth a sim later (`tools/`), like the forest's.

## Passage

- **The Narrows Office** (the Harbourmaster): Halemouth 40 gold (2 days; Hallowmark: magic banned, baggage
  searched), Brassmouth 70 (5 days; the Dominion drafts wizards), the Reaver Isles 90 (4 days). Varenne Trusted
  ×0.8, Cold ×1.5.
- **The Sky Office** (the gnome): Varrow over the Greatspine 250 gold (2 days aloft), Gimbal 400 (4 days).
  Quarrender Favoured ×0.8, Cold ×1.5.

**Nothing sails or flies yet**: the Mainland isn't built, so the buttons show the prices greyed out.

## Thessaly

Thessaly Vellacourt stands outside her own chained gate with her two hired bodyguards (Brask, a Varg, and
Oddny; halberdier stand-ins, as at her duels). Built: her introduction and her house's story. Seven years ago
every Vellacourt ship sank on one calm night; by morning Ashcombe had their quay, Varenne their ships' names
(new hulls sailing under them), Quarrender their debts, and someone cut them out of the Golden Ledger. She
means to find out which house did it, and to have it all back. She'll have work "when you've earned enough of
their trust to be let into their counting-rooms". If you met Ponder at Wrenford she tells you he has something
of hers (her duel rival line: "Thief! Hand back what you pocketed.").

**Her quest is the user's to choose.** Some shapes it could take, all using what's now built:

1. **The Drowned Fleet (an investigation):** charters and Trusted standing get you into each house's
   counting-room; each holds one piece (a ledger page, a bill of sale, a salvage licence). The fleet was sunk by
   a sea-mage (Varenne's house wizard? a hireling?) paid with Quarrender credit, on Ashcombe's information. Ends with a
   choice: give the proof to the Exchange (all three houses fall a tier and Vellacourt reopens), sell it to one
   house, or burn it.
2. **The Pocketed Seal (with Ponder):** what Ponder pocketed was the Vellacourt seal, which proves the house's
   charter and is worth a fortune to whichever house holds it. Find Ponder (met at Wrenford, `metLater`),
   get it back or let him keep it; the houses send bandits after whoever carries it.
3. **Rebuilding a House:** Thessaly hires you as the house's first escort: her own charters (run from the
   Charterhouse, standing with "Vellacourt"), and every run for her lowers all three great houses. Ends with her
   gate unchained and a fourth palace back on the Hill (a big end-game for the city).
4. A mix: 1 to find the truth, 3 to rebuild, 2 as a side thread when Ponder turns up.

## Running the Narrows (the sailing minigame)

**Captain Nan Crake** of the *Kittiwake* stands on the Long Quay by Fettle's Yard. Fettle built her ship, so
she belongs to no house, and she won't pay the Varg sea-toll (a tenth of every hold that passes the Teeth,
unless it flies Varenne's anchor: Varenne pays the Varg off each spring and bills everyone else). She runs it:
you sail her ship west from Gilden down the Narrows, past the Varg picket at the Teeth, to a Halemouth
lugger waiting off Gull Head, and you're on deck as her wizard. The user asked for it to be a playable
minigame (November 2026), and gave two more sailing games for later (below).

**How it plays** (`js/sailing.js`, `css/sailing.css`; ⛵ Run the Narrows in the title screen's Test menu
too, which sails as Nerissa):
- A top-down sea with the ships drawn upright, from the user's art (`sprites/ships/`, cut by
  `python3 tools/cut_ships.py [--preview out.png]`: five views a ship, the merchantman and a Varg raider,
  with background and sail holes cleared, quantised to 256 colours; mirroring gives eight headings,
  `viewFor`; `ships.json` holds each view's size and waterline). A ship crossfades between views as it
  turns, bobs and rolls, draws its hull below the waterline faint, leaves a wake and a shadow.
- Steer with ◀ ▶ / A D / the arrows, or hold a finger on the sea; sails − / + or W / S (reefed / half /
  full: faster, but turns wider; `SAILS`). Speed comes from the wind (`POLAR`: almost nothing within 40° of
  it, in irons; best across it); the wind wanders about 75° either side of a north-easterly and gusts
  (`windNow`). A rose shows it, with your point of sail and knots.
- The course (`buildCourse`, a new seed each run): coasts from sums of sines, pinching to the Narrows proper
  at the Teeth (a rock field), scattered rocks, islets, sandbars, eight drifting fog banks. A safe lane
  wanders down the channel and no rock is put in it, so every run can be won. Rocks and the coast hole the
  hull by impact speed (`ROCK_HIT`); shallow water (pale, off the coasts, round rocks, sandbars) slows you
  and scrapes the hull at speed. Hull 0: foundered.
- **The Varg** (`RAIDER`, `placeRaiders`, `raiderStep`): three raiders on the first run (two across the
  Teeth, one off Gull Head), a fourth lurking behind an islet from the second run, a fifth from the third,
  and stronger crews after that (Crake's `won` count). A raider patrols until it sees you (720 px, 240 in a
  fog bank), then chases, leading its aim; it gives up after 5 s out of sight or 4200 px from its post.
  The Varg **row**, so they never stall into the wind (a floor of 95 px/s in a chase), but a reach outruns
  them. Alongside (125 px) for 2.2 s, they grapple and board: **Repel boarders** is a real battle
  (`startExploreBattle`, the forest's `varg` / `varg_alpha` fighters, 2–3 by level; your Explore HP, wounds
  kept) and a win sends that raider off for good; **Let her pay the toll** ends the run unpaid.
- **Deck magic** (1 / 2 / 3, `SPELLS`, cooldowns): Fill the Sails (6 s, never in irons, ×1.35), Strike the
  Rigging (a bolt in your element's colour at the nearest raider within 700: it crawls for 8 s and lets go
  its hooks), Sea-Mist (a fog bank round you for 22 s). A made wizard needs Damage for the strike and
  Protection for the mist; too tired, no magic.
- **Pay** (`PAY`): 25 gold, +15 the first time, +10 for a hull at 75%+, +10 for never being boarded; every
  run that gets through costs a point with Varenne (the toll is their bargain). Six hours pass. Foundering
  costs a quarter of your HP. Saved in `quests.gilden.narrows` (`runs`, `won`, `lost`, `met`); the journal
  says how many runs.
- Music: Gilden's theme under sail, the battle theme while a raider chases.
- Explore side: `folkApi.sail(o)` → `openSailing` in `js/explore.js` (steps aside like the Moriquende).
- Tested (Playwright, page.route, no server): an autopilot that follows the safe lane wins every course in
  about 95 s with the hull untouched; with the raiders in and no dodging or magic it's boarded in about 4
  runs in 10. From Gilden: talk to Crake, sail, paid 60 on a clean first run, Varenne −1.

**Stand-in art:** Crake is painted from a hero figure (`gd_crake`); boarding fights use the Drowned
Quarter's painting until a ship's-deck backdrop (`arena_deck`, `backgrounds/deck.jpg`). The Varg bow and
stern views show one mast where the side view has three; the user will judge whether that needs redoing.

**Later sailing games (the user's ideas):**
- **A Varg pirate game in the Reaver Isles:** you sail the raider, hunting merchantmen (the other side of
  this one).
- **A trade game at the freeports:** carry cargo between ports, buying low and selling high, with the same
  sailing.
- (A broadside sea battle, manoeuvring for the wind and casting through the spell wheel, was offered too.)
- Ships sailing about Gilden's harbour on the map itself (the same art) is still to do.

## Build order

1. **Built:** the map, the world map (Gilden, Chepstead, the Narrows), the houses and their people, standing,
   charters with sponsored ambushes, the bravos, gifts, the passage offices (prices only), Thessaly's opening.
2. Thessaly's quest (once chosen).
3. More jobs from the houses inside the city (guard a ship's unloading on the quay, collect a debt for
   Quarrender, a night watch at Ashcombe's warehouse, find out who's selling quintessence on the side), each
   moving standing; sabotage jobs (burn a rival's cargo) that move it a lot more.
4. Caravans that end elsewhere (a one-way run to Hollowmere; Master Orme posting runs south from Hollowmere)
   and Harrowgate on the world map.
5. Rooms of their own: the Charterhouse, the Salt Purse, the Exchange floor, the four palaces' counting-rooms
   (where Thessaly's clues are).
6. Passage working, once the Mainland (or the Reaver Isles) has a first map.
7. Art (below) and a Gilden theme (the Corvanthe theme's tools, `tools/music/`; Hollowmere has none yet either).

## Art wanted (`docs/art-prompts.md`, "Placeholders")

Every stand-in here is registered in `js/placeholders.js` with the exact path its real art goes to: drop the
file there and the game uses it (pieces: cut the sheet and re-run `node tools/build_maps.js gilden`).
`node tools/placeholders.js todo` lists what's left.

A Gilden battle backdrop (the city fights on Hollowmere's), a moored gnome airship (the mast has nothing on
it), a merchant palace and a warehouse (a townhouse, the hall and a damaged house stand in), market stalls,
a gnome (a dwarf figure drawn small stands in for the Sky Office clerk), and Thessaly's two bodyguards
(halberdiers).

## As built

- Code: `js/explore_gilden.js` (`ExploreGilden`: `HOUSES`, `TIERS`, `CHARTER`, `PEOPLE`, `offers`,
  `runLeg`, `ambushFor`, `finishCharter`, `onMap`, `journal`), hooked into `js/explore_folk.js` like
  Elfhome (a shared dispatcher, `Elf()`, now asks both), `prep` and `onMap` from `enterMap` in `js/explore.js`.
  State in `quests.gilden` (`st`, `done`, `lost`, `sponsors`, `offers`, `run`, `bravoAt`, `metThess`).
  A run in progress survives a reload: arriving in Gilden with `run` set offers "On the road" again.
- `battle()` in `js/explore.js` takes an `arena` (charters fight on `road`).
- A map NPC may carry `scale` (the gnome clerk: 0.6), read by `drawNpc` after `FOLK[role].scale`.
- `REST.gilden.saltpurse` (sleep to full at the Salt Purse); `ARENA_MAPS.gilden` is `hollowmere` until
  Gilden's own painting; the loading screen shows `tabletop` or `duel`.
- Tests: Playwright, serving the repo's files through `page.route` (no web server), `Explore.open({random:true})`,
  `Explore.enterMap('gilden','north')`, `Explore._talk({role})`, and a forced battle result
  (`showMultiEnd('A')`, then `#btn-continue`): a quiet Chepstead run paid 46 gold and moved standing
  +2 / −2 / −1; an ambush with Varenne at −7 brought a Varenne hireling and two bandits, and the purse named
  Varenne; Ashcombe at −8 sent its bravos on arrival.
- Fixed on the way: the world map threw on its first look when nothing was inked yet (`drawFog`'s cache key
  started as `''`, which an empty hole list also gives).
