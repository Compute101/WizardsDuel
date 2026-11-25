# The Moriquende — design

Step 1 is built (see "As built" at the end); the rest is plan.

The next place after Wrenford: a great forest some way west, where the player meets Sylvara.
It is a different kind of game from the rest of Explore: a **hex-map strategy layer** about
keeping a forest in balance. Grown from the user's old project *Moriquende Mardi* (Elfhome,
2022, Java, `Compute101/moriquende-mardi`), in which elves started a colony in a great forest
on a procedurally made hex map.

## The pitch in one line

A 4X turned inside out: you must not expand. You hold a small elven settlement, you can't watch
the whole wood, and you keep goblins, Varg and incoming orcs **in check against each other**
until the year turns. Wiping something out is possible, but it costs a lot and puts the balance
at risk.

## What makes it fun (the design pillars)

1. **You can't see everything.** There is always less watch than wood. Where you look is the main
   decision every turn.
2. **Fog that talks.** You can't see unwatched hexes, but you can hear and see signs from them:
   smoke, howls, war drums, a flock of birds startled up, the crash of a felled oak. Reading the
   signs is a skill, and it pays.
3. **An ecology, not an enemy list.** Every faction holds another in check. Whatever you do
   spreads to the others: kill the Varg and the goblins boom; hunt too much and the Varg
   starve and come for you.
4. **Steer, don't conquer.** Your best moves are often indirect: lure a herd toward a goblin
   warren so the Varg follow it there, ward a path so the orcs go the other way, let two
   enemies wear each other down.
5. **The Wood is a character.** The forest has moods. It rewards balance and punishes greed,
   including yours (in the spirit of the Old World's living forests, with our own names).

## Where it sits in the world

- **Place:** far west of Wrenford, off the left edge of today's world map (`maps/world.json`
  would grow west, or the wood gets its own inset map). A road from Wrenford to the forest's
  edge, then only elven paths.
- **Lore hook:** the Unweaving drove the nomad orc tribes west out of the lands around Corvanthe.
  This year they reach the wood. Sylvara has kept the balance for centuries with only a few
  wardens, but she can't hold back a migration.
- **How you get there:** someone at the University with a connection to Sylvara (Mother Agathe
  the herbwife, who trades with Elfhome's healers) passes on her plea for a wizard; you walk there on
  the world map. Sylvara asks you to keep the watch for a year.
- **Sylvara:** the Warden of the grove. She guides you for the first week, then walks the wood
  tending its four ancient trees (see Decided). At the year's end she judges you, and if you kept the
  balance she joins you as a companion (`allies`, `wizard:true`).

### Name candidates
- Chosen: the forest is **the Moriquende**, the settlement **Elfhome**.

## The map

- A hex grid, about **91 hexes** (radius 5) for the first version, generated from a seed like
  the city maps. Terrain kinds from Elfhome: **old growth** (deep forest, sight 0 into it),
  **woodland**, **glade** (open, where game grazes and orcs like to camp), **hills** (+1 sight),
  **marsh** (goblins' favourite), **crags** (Varg dens), **river and lake** (cut across the map,
  fords are choke points).
- **Elfhome** in the centre, plus **2–3 outlying hamlets** (a herb garden, a shrine, a
  beast-speakers' lodge) that are also worth protecting.
- **Felled hexes** (orc work) become stumps: no food, no cover, and they regrow only slowly, faster
  with Sylvara's help. They're the scar the year leaves.
- **Phase 2:** a hex can be entered as a small walkable Explore map (Elfhome as a town, the odd
  ruin or den), the same way Elfhome let you open a hex into a 7-hex local map.

## A turn (one week; a year is 4 seasons × 6 weeks = 24 turns)

1. **Dawn reports.** Watched hexes show what is there now. Unwatched hexes give only **signs**,
   and old sightings fade (a ghost icon marked "seen 3 weeks ago: goblins ×4").
2. **Orders.** Place your watchers; send patrols, hunters and beast-speakers; build; cast **one**
   spell.
3. **Dusk.** Everything else moves in secret. Factions clash with each other (you see it if it
   happens under watch, otherwise you get a sign).
4. **Night.** Raids. Sentry posts shoot at bands passing through their hexes (the tower-defence
   part). A raid that reaches a hamlet or Elfhome becomes a battle.

Target: 30–45 minutes for the year. Saved per profile like the rest of Explore.

## Watch: the core resource

- A **watcher** on a hex sees that hex clearly and its 6 neighbours dimly (dimly = "something
  moved", no numbers or kind).
- A **talan** (a sentry post up a tree, built by the Guild) lets the watcher in it see 2 hexes
  out clearly. On a hill, 3.
- Starting watch covers about **30%** of the wood; the most you can reach in a year is about
  **60%**. There is never enough.
- **Signs** from unwatched hexes, each with a range and a reliability:
  - Smoke (orc camps, fires): seen 3 hexes away, gives the exact hex.
  - War drums (goblins gathering, or a Warhost brewing): a direction only.
  - Howls (Varg on the hunt): a direction, at night.
  - Startled birds: a hex something big moved through this turn. It might be a herd.
  - Falling timber: the hex where orcs are felling.
  - Silence (game gone quiet): something's been hunted out.
- **Lies:** goblin shamans light decoy campfires, so a sign can be false. Only watchers confirm.

## The elves (your side)

Population is small and grows **slowly** (elves are long-lived): a youth trains for 3 turns before
taking a post, and new elves come mostly from events (other groves sending help). Every loss hurts.
The six houses from Elfhome become the roles:

| House | Role on the map |
|-------|------------------|
| **Seers** | Watchers. The only source of clear sight. |
| **Talons** | Wardens: patrol (move 2), fight, garrison talans so they shoot. |
| **Charming** | Beast-speakers: **herd** game (move a herd one hex), **calm** a Varg pack for a few turns, **lure**. |
| **Guild** | Builders: talans, thorn hedges, hidden caches. |
| **Healers** | Bring wounded elves back (an elf at 0 is wounded, not dead, if a healer reaches them in time). |
| **Elders** | The council: one seasonal choice (see Council below). |

**Food:** each elf eats 1 a turn. Hunting takes game from a hex, foraging from living forest
(nothing from stumps). Winter halves foraging. Stores carry over.

## The others

Every faction runs on a few plain rules, so the player can learn them, and fight each other by
the same rules that apply to you.

### Game (deer, boar), not a faction but the base of everything
Herds graze glades and move between them, breeding in spring. Eaten by Varg, elves and orcs.
Too few and the Varg get hungry; too many and they strip the glades (forest health falls).

### Varg (wolfmen), native, belong here
- Packs den in crags and **follow the herds**. Their numbers are capped by the game.
- **Fed Varg leave elves alone.** When game runs short they range wider, then raid hunters,
  then hamlets.
- They **hunt goblins.** Varg are the goblins' main check.
- Sylvara counts them as part of the wood. Wiping out a den angers the Wood.

### Goblins, native, multiply
- Warrens in marsh and crags. Numbers grow fast (about +15% a turn per warren).
- When a warren is full it **splits**: a band goes off to dig a new warren 1–2 hexes away. Left
  alone, they spread across the map like a rash.
- They raid lone hunters and watchers, steal food, and foul glades.
- Their shamans (with mushroom fetishes) light decoy fires and can ward a warren.
- **The danger:** goblins that meet orcs **join them** (see Warhost). Keeping goblins away from
  the orcs matters more than killing goblins.

### Orcs, newcomers from season 2
- Warbands arrive at the map edge (east first, from Corvanthe's way), one or two a season.
- They camp in a glade and **fell the hexes round it**, one a turn. Felling is the real harm.
- They fight anything nearby: Varg, goblins they don't take in, elves.
- **Nomads:** harried enough (camp raided, felled wood burned, chiefs struck) a band **moves on**.
  You don't have to kill them, just make staying cost more than leaving.
- **The Warhost.** A band that takes in goblins grows. Past a size threshold the drums start (a sign
  you can hear from anywhere), and two turns later it stops felling and **marches on Elfhome**.
  That's the big set-piece fight, and the reason you watch the orcs.

### The food web, in short

```
  elves ──hunt──▶ game ◀──hunt── Varg ──hunt──▶ goblins ──join──▶ orcs
    ▲                                                   │             │
    └──────────── raids if starving / swarming ─────────┴─── fell ───▶ forest
```

Each faction keeps another down, and you hold the joints. Kill the Varg and the goblins boom,
the goblins reach the orcs, and a Warhost follows. Overhunt and the Varg starve and raid you.
Ignore the orcs and the wood falls.

## The Wood (the balance meter)

- **Forest health** (0–100): down for every felled hex, overgrazed glade, blighted or fouled hex,
  and slaughter of native folk; up slowly with regrowth and quiet weeks.
- **The Wood's mood** follows it, and changes the rules:
  - *Content:* treants wake in old-growth hexes and fight anything raiding through them (yours
    excepted).
  - *Uneasy:* paths shift: one random hex a turn swaps its neighbours' sight lines (watch range
    −1 there).
  - *Angry:* the wood turns on everyone, elves included: patrols get lost, and hunters come back
    empty.
- **Faction bands:** each native population has a healthy band (Varg 2–4 packs, goblins 3–6
  warrens, game 5–9 herds). Each week inside it scores; outside it costs.

### How the year ends
- **Elfhome falls:** a loss (wake at the forest's edge, Sylvara tells you what went wrong).
- **Survive the year:** Sylvara's judgement from forest health, bands kept and elves lost:
  *Wood in Song* (joins you, plus a reward such as a living-wood staff topper), *Wood Endures*
  (she thanks you, comes later), *Wood Scarred* (she stays to mend it).
- Score per run, best per profile (like Survival's best wave).

## The wizard's part (your magic on the map)

One spell a turn from Elfhome's mana. It uses the duel game's categories, so it already feels familiar:

| Category | On the map |
|----------|-----------|
| **Damage** | Strike a band in a **watched** hex (you must see it). Inner / middle / outer ring = harm and cost. |
| **Protection** | Ward a hex: a thicket that slows bands (one extra turn to cross) and shields a talan or hamlet. Wards wear like duel wards. |
| **Dispel** | Break a goblin shaman's fetish (stop a split or a decoy), break an orc war-totem (delay a Warhost), cleanse blight. |

Casting is the real minigame, so learning glyphs at the University pays off here.
**Your element matters:** a Fire wizard's Damage risks a **forest fire** (it spreads to
neighbouring hexes unless warded). Sylvara is barred from Fire and Dark for a reason, and she'll
say so the first time.

## Battles

A raid that reaches a hamlet or Elfhome, a patrol that meets a band, or an attack you choose to
launch becomes a fight in the duel engine (`startExploreBattle`), with you plus the elves in
that hex as allies (Talons as archer-like fighters), or Sylvara if she's there. Wounds carry over
as in Explore. Small skirmishes can be **auto-resolved** (option on, by default, for anything
below a set size), so the year doesn't turn into 40 battles.

New fighters for `fighters.json` (art needed; see Art):

| Fighter | Notes |
|---------|-------|
| Goblin | weak, cheap, comes in threes; **Swarm**: +1 Attack for each other goblin |
| Goblin archer | slips past Guard like the Archer |
| Goblin shaman | a small wizard: wards, a curse |
| Varg | pack hunter: **Pack**, hits harder at a wounded target |
| Varg alpha | leads a pack |
| Orc | tough brute, Attack 6 |
| Orc brute | leads a band, Shield Wall-like |
| Orc warchief | the Warhost's leader, a set-piece fight |
| Elf Talon | ally (longbow) |

## Council of the Elders (one choice a season)

Small dilemmas that colour the run, e.g.:
- **Wrenford's timber merchants** offer silver for the eastern edge. Gold and goodwill for the
  University, or the Wood's favour.
- **A white hart** has been seen. Guard it (watch tied up) for a big mood boost.
- **Another grove** offers to send five elves if you send them food in winter.
- **Parley with an orc band:** show them a way out of the wood (they leave, but take two glades'
  game with them).

## Seasons (the difficulty curve)

| Season | What's new |
|--------|-----------|
| Spring | Learn the map. Herds breed, goblins split for the first time. One Varg pack is hungry. |
| Summer | Goblins spread; Varg at their peak. First orc band arrives at the season's end. |
| Autumn | Two or three orc bands; felling; the first Warhost threat. |
| Winter | Game and foraging fall. Hungry Varg, desperate goblins, a Warhost if you let one build. Snow shows tracks: unwatched hexes give better signs. |

## Testing it (the same way as the duel game)

A Node sim, `tools/forest_sim.js`, plays the year with scripted strategies, and the numbers are
tuned until these hold:
- **Do nothing:** Elfhome falls in late autumn or winter, nearly always.
- **Kill everything native:** you survive but score badly (the goblins boom from warrens you never
  found, the Wood turns angry). It should be clearly worse than balancing.
- **Turtle** (all watch round Elfhome): you survive, but the wood is scarred.
- **A good balancing bot:** *Wood in Song* about half the time.
- Watch coverage starts at about 30% and peaks at about 60% at most.

## Build order

1. **The strategy layer on its own** (`js/forest.js`, its own screen like the Winks table):
   hex map generation, watch and fog with signs, the four factions' rules, food, and
   auto-resolved fights. Plus `tools/forest_sim.js` for tuning. Placeholder art (coloured hexes
   and tokens).
2. **Battles** through the duel engine with the new fighters (placeholder sprites).
3. **Story:** the field trip from Wrenford, Sylvara, the Council, endings, saved in the Explore
   save.
4. **Art and sound:** hex tiles in the house style, fighter sprites, a forest theme (the
   Corvanthe theme's motif on recorder and harp?).
5. **Walkable hexes:** Elfhome as an Explore town, dens and ruins.

## Art needed (later, briefs to `docs/art-prompts.md`)
- Hex tiles: old growth, woodland, glade, hills, marsh, crags, river / ford, lake, stumps, Elfhome,
  hamlet, talan. (Elfhome had its own hex art, which may still be useful as a style reference.)
- Fighters: goblin, goblin archer, goblin shaman, Varg, Varg alpha, orc, orc brute, orc
  warboss, elf Talon (male and female).
- Map tokens: herds, warrens, dens, orc camp, treant.

## Decided (the user's answers)
- **Turn-based**, a week a turn.
- **Fighting is your choice.** A clever player can win the year with watchers and elves alone;
  the wizard is the strongest piece and big warbands are much likelier to be beaten if you take a
  personal hand (step 2 makes that a real duel; step 1 settles it with the wizard's numbers).
- **Names:** the forest is **the Moriquende**, the settlement **Elfhome**.
- **Sylvara** guides you for the first week, then gets busy: she walks the wood tending its **four
  ancient trees**, each of which must be tended before the year ends or it dies. Keeping her safe
  on the way is part of the job (she avoids danger your watchers can see, and only that).
- **Wolfmen, not hyena-men:** called **Varg** for now (Old Norse for wolf; one name in
  `FAC.varg.name` to change).
- **The hook** is not Fizzwick's field trip (that one goes to Corvanthe): someone at the University
  with a connection to Sylvara starts it, and you travel there on the world map. Suggested: **Mother
  Agathe** the herbwife, who has traded with Elfhome's healers for years and hears from them that
  Sylvara needs a wizard.
- **New art** for the map; the old Elfhome map code (Java) isn't reused, only its ideas, its six
  houses and its names (`NAMES` in the engine: Seers Manx, Talons Breton, Guild Irish, the rest
  Welsh, from `Elfhome/src/Config/Names/elven.txt`; checked against the creator's names).

## As built (step 1)
- **Engine:** `js/forest_engine.js` (`ForestEngine`, also `require`d by Node): map generation from
  a seed (`makeMap`: 91 hexes, old growth, marsh, hills, lakes, crags, glades; Elfhome in the middle,
  three hamlets two out, four ancient trees three to four out), sight (`vision`: Elfhome 1 clear / 2
  dim, hamlets 0 / 1, a Seer on foot 0 / 1, in a sentry post 1 / 2, +1 on a hill; old growth is
  only ever dim from outside; an uneasy wood puts a random hex in mist), memory (`intel`, faded on
  the map with its age), signs (`sign`, `SIGN_TEXT`), orders (`move`, `tasksFor` / `setTask`,
  `cast`, `train`) and `endTurn` (orders → Sylvara → herds → Varg → goblins → orcs → movement →
  the wild meeting the wild → night: sentry posts shoot, Talons harry orc camps, treants, fire,
  raids → upkeep). All the numbers are at the top of the file.
- **Fights** are settled by `fightElves` / `clash` (three exchanges; a side below 40% breaks; an
  elf at 0 is wounded for 3 weeks, or killed 20% of the time). Your wizard is attack 7, HP 12, the
  same as Sylvara; a Talon 4 / 6.
- **Spells** (one a week, mana 10, +2 a week): Strike 2 / 3 / 5 mana for 3 / 6 / 10 (needs clear
  sight; a Fire wizard can set the trees alight), Ward (a thicket for 5 weeks: bands that enter stop
  a week, defenders there take 2 less an exchange), Dispel (a goblin fetish, an orc war-totem, a
  fire). No minigame yet.
- **Orcs:** five bands of 6–8 from weeks 7, 10, 13, 16 and 19, walking in from the east and
  camping on glades ever nearer Elfhome; they fell a hex a week, raid elves within 2 of camp
  (Sylvara first), take in goblins (3 a week from warrens within 2, whole bands that touch them),
  merge with other bands, fight the Varg. Size 10+ (goblins count half) with a war-totem beats the
  drums: 3 weeks later they march, and every orc band within 3 rallies to them. Harried to 1.5× their
  size (damage taken, Talons beside the camp at night) they leave by the nearest edge.
- **The screen:** `js/forest.js` and `css/forest.css`, 🌲 Moriquende in the title screen's Test
  menu (`Forest.open()`). The canvas map (pan, pinch, wheel and + / −), the side panel (under
  the map on a phone) for the hex and the elf you've picked, Elves (roster and training), Spell,
  ↶ (take back this week's orders), End week, and a dawn report of the week and its signs. Saved in
  `localStorage` `wd-forest-save`.
- **Tuning:** `node tools/forest_sim.js [games] [bots]`. Last run (200 games each): **idle** falls
  69% (about week 19), the rest scarred; **turtle** (everyone at home) falls 33%, mostly scarred;
  **exterminate** scores 103 (the best ending 9%, the Varg wiped out, the wood angry at slaughter);
  **balance** scores 138, the best ending 60%, sees 37% of the wood clearly on average (73% at all).
- **Not yet:** healers (wounds just take 3 weeks), the Council of Elders, the seasonal events,
  the story and the Explore save (step 3), art and music (step 4), river hexes and fords.

## As built (step 2: leading a fight yourself)
- **When:** a fight your wizard stands in (your attack order, or a raid on your hex, Elfhome included)
  pauses the week (`S.pending`, only with `S.handFights`, the setup's "Offer me the fight" box; the
  sim leaves it off). The prompt says what you face, who's with you and how likely it is to go your
  way if left to play out (`autoOdds`: the same fight on 40 copies). **⚔ Lead it yourself** or **Let
  it play out**; "Don't ask again this year" turns it off. The week then carries on from the phase it
  stopped in (`endTurn` runs `PHASES` from `S.step`; each pausing phase marks what it has done:
  `t.week` on tasks, `b.raided` on bands). ↶ can't take back a week that's under way.
- **Your wizard** is picked on the setup screen from the roster (Sylvara excepted; remembered in
  `wd-forest-wiz`). Step 3 swaps in the Explore save's own wizard.
- **The duel** (`battleSetup` in the engine, `duelSpec` in `js/forest.js`, then `startExploreBattle`
  on the forest backdrop, `backgrounds/forest.jpg`): the band becomes up to three seats,
  one per `DUEL.per` of them (goblins 2, Varg 2, orcs 2.5, plus a goblin seat for an orc band's 3+
  goblins), each a level up by how many it stands for (`levelAt`) and `hpMul` past four; a band of 4+
  Varg is led by an alpha, an orc band of 5+ by a brute, a Warhost by the warchief. Beside you, one
  seat: Sylvara herself if she's there, else the Talons in the hex (a level for each beyond the first,
  +2 behind Elfhome's walls, +1 at a hamlet, and more HP for walls, `wallHp`). You start at your
  forest HP's share of your wizard's HP.
- **Afterwards** (`resolvePending`): the band loses what the duel took from it (all of it if you won,
  else the share of its seats' HP you knocked off; `foeLeft` from `startExploreBattle`'s `onEnd`).
  Your forest HP is what you finished on; elves whose seat fell are wounded. Lose, and you're carried
  home wounded and **whoever's left fights on** as usual against the weakened band (Elfhome's walls
  too), so leading is never worse than standing back.
- **New fighters** (`fighters.json`, `explore:true`, placeholder art by
  `python3 tools/make_forest_placeholders.py` into `sprites/forest/` and `portraits/small/`): Goblin
  HP 14 / atk 3, **Swarm** (+1 Attack for every other goblin beside him); Varg 28 / 5 and Varg Alpha
  40 / 6, **Pack Hunter** (Attack ×1.5 at a target under half HP); Orc 34 / 6, Brute 46 / 7,
  Warchief 64 / 8, **Brute** (a Grapple lands in full); Talons 24 / 5, at range (the ally).
- **Tuning:** `node tools/forest_duel_sim.js [duels per wizard]` plays each typical fight as a duel
  across the roster (AI on your side) and settles it in the forest. Last run (4 a wizard): small fights
  the same either way (a goblin raid 100% left / 99% led, four hungry Varg alone 99 / 97%); big ones
  far better led: an orc camp with two Talons 19 → 86%, orcs raiding Sylvara with you beside her
  46 → 99%, a Warhost of 16 + 4 at Elfhome 68 → 99%; caught alone by seven orcs, 0 → 10%.

## As built (step 3: the story)
- **The hook:** Mother Agathe, the herbwife in Wrenford (`westWood` in `js/explore_folk.js`, a ★ choice in
  her talk until asked). She buys her best herbs from Elfhome's healers; their last bundle came with
  Sylvara's letter asking for a wizard. Before you may leave Wrenford (the Proctors' licence,
  `ExploreYear.blockExit`) she only hints at it; after, she gives you the letter and **I'll go** puts the
  Moriquende on the world map (`folkApi.reveal`). Later she asks how it's going, and after the year she
  answers your ending. Playing as Sylvara, she just tells you to go home.
- **The journey:** the Moriquende is a world-map place with no map (`maps/world.json`: `forest:true`,
  `kind:'forest'`, drawn as a stand of trees; a road from Wrenford). Travelling there from the West Road
  (`worldGo` → `openForest` in `js/explore.js`) hides Explore and opens the forest screen with
  `Forest.open({explore:{…}})`: your Explore wizard (the hero's element, or a roster wizard's first
  signature element), the year from `quests.forest.S`, fights offered by default. A wizard still at the
  University casts only the spell categories and rings it has learnt (`cats` / `rings`). The first visit
  opens with Sylvara meeting you (`beginStory`). ✕ (or the year's end) brings you back where you set out;
  the year waits in the save, and the journal shows the week and the trees tended.
- **The ending pays once** (`forestEnd`, `FOREST_PRIZE`): only an ending better than your best pays, and
  only the difference (The Wood in Song 60 gold and 6 lodestone, Endures 30 / 3, Scarred 10). The Wood in
  Song brings **Sylvara into your companions** (`addAlly`, a wizard ally). Short of that, the year can be
  tried again (Try another year); after it there's no new year to start.
- **Not yet:** (the music, backdrop and art have since arrived: `audio/moriquende_theme.mp3`, `tools/music/moriquende.py`); your Explore wounds don't carry into the
  forest's fights or back (the forest keeps its own HP for your wizard).

## As built (step 3, revised after the user's feedback)
- **Elfhome is a place you walk** (`maps/elfhome.json` from `tools/mapgen/elfhome.js`; its people in
  `js/explore_elfhome.js`, `ExploreElfhome`, hooked into `js/explore_folk.js` like the University Year):
  the user didn't want the town reduced to a dialog box. A glade round the **Heart Tree** (a grove of
  trees at their crisp scale), the **Watch Table** under it (inspect it: 🗺 Take the watch opens the year;
  it's the central command), and a place for each house round the edge, each with its leader to talk to:
  the Elders' Stone (Olwen Derwen: the wood's mood, the stores), the Seers' talan (Calybride Seren: how
  much of the wood you see), the Healing House (Essyllt Celyn), the Talons' lodge (Gwilherm Hebog: orcs,
  drums, a march), the Guild's workshop (Kennan Saer: sentry posts), the Beast-speakers' lodge (Ifan Bedw:
  deer and Varg). Their reports read the year live. Names from the old project's lists, three women and
  three men, painted from the elf hero figures when you first enter (`prep`, so they don't slow other
  loads). **Sylvara** waits by the Heart Tree when you arrive and gives you the watch; during the year
  she's only in Elfhome when the forest has her home (`absent`). The West Road leads back out east. No
  strolling peasants (`noStroll`). Stand-in buildings from the town tilesets (`docs/art-prompts.md`).
- **The world map:** the Moriquende now lies west of Wrenford (its label above it, `labelDx` / `labelDy`)
  and leads to Elfhome like any place (`map:'elfhome'`). Closing the forest leaves you in Elfhome.
- **After Finals only:** Agathe offers the errand once you've graduated (`api.fullMagic()`), the hero
  only; roster wizards don't get it, and the Test menu's quick year has no wizard picker (its fights play
  themselves out).
- **One HP pool:** your wizard's HP in the forest is your Explore HP. The year starts from it (`syncIn`),
  a duel starts at it and writes its exact result back, and auto-settled wounds go back after each week
  (`syncOut`, `S.wizHpSync`); a wound leaves you at a quarter. The forest no longer heals your wizard by
  itself (`selfHeal:false`, `S.wizSelfHeal`): rest at the **Healing House**, which heals you to full and,
  once a week, takes two weeks off every wound in Elfhome (`HEAL_WEEKS`, `S.healedWeek`).

## Olwen's counsel (advice from the board)
The user didn't know how to use the elves or whether to fight the goblins, and the leaders only
report their own house. Olwen Derwen, the Eldest, now has **Ask for counsel**: `counsel(S)` in
`js/forest_engine.js` ranks advice from what the player can know (clear sight, memory up to 3 weeks
old, this week's signs, public news; never the hidden state) and she gives three at a time, most
urgent first. It follows the `balance` bot's priorities: Warhost and totems, Sylvara's danger and
escort, harrying orc camps, keeping goblins from the orcs (the one time to fight them), posts and
Seers, hungry Varg, deer, food, youths, the Wood's mood, wounds. Numbers in `COUNSEL`.

## Map art (from the user)
- Two sheets in `sprites/forest/source/`: 13 pointy-top hex tiles (old growth, woodland, glade, hills,
  marsh, crags with a cave, lake, felled clearing, burnt clearing, Elfhome's tree-town, a hamlet, a
  sentry-post tree, the ancient tree) and 10 map figures (goblin, goblin shaman, Varg, orc, war-totem,
  deer, and the Seer, Talon, Beast-speaker and Builder). `python3 tools/cut_forest_art.py` cuts them:
  each hex masked to an exact pointy-top hexagon at a regular hexagon's proportions (240 × 277), each
  figure keyed off black and trimmed (256 tall); 256 colours, about 700 KB in all.
- `js/forest.js`: `hexArt` picks a hex's tile (burnt, felled, Elfhome, hamlet, the ancient tree (felled
  if it died), a finished sentry post, else the terrain) and draws it in place of the flat colour; only
  what changes during the year goes on top (a tree's tending ring, a post being built). `figure` stands a
  figure on a small round base in place of an emoji token: the wild (a warren is a goblin, or the shaman
  when it has a fetish; an orc band with a war-totem has the totem beside it), the deer, the four
  callings, and your wizard and Sylvara as their own battle sprites (`elfArt`). Everything falls back to
  the old canvas drawing until its picture has loaded (`art`, `preloadArt`).

## Elfhome's own art (from the user)
- Sheets 27 (buildings) and 28 (props and ground) cut into `ruins27` / `ruins28` by
  `tools/cut_ruins_tileset.py` (`RECTS27` / `RECTS28`; `holes:40` clears background enclosed inside a piece,
  e.g. between the Heart Tree's branches). Elfhome (`tools/mapgen/elfhome.js`) is rebuilt from them: the Heart
  Tree (1.5×) over a glade of flowered grass (`J`) with the Watch Table and two lantern posts before it and the
  spring beside it; mossy flagstone paths (`Y`, edges from `tr_elfpath_*`) out to the Elders' Stone, the Seers'
  talan, the Healing House (herb rack, beehive), the Talons' lodge (target, bow rack), the Guild's workshop
  (ladders, rope), the Beast-speakers' lodge and four cottages; forest floor (`L`) everywhere else, ferns,
  foxgloves, toadstools, stumps and logs in it, and the town tileset's trees round the edge.
  Nothing stands behind the Heart Tree: its canopy covers cols 12–27, rows 3–14, so the Elders' Stone (west)
  and the Seers' talan and Healing House (east) sit clear of it, with the paths going round (the user found
  them hidden).

