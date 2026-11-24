# The Wood — design (plan, nothing built)

The next place after Wrenford: a great forest some way west, where the player meets Sylvara.
It is a different kind of game from the rest of Explore: a **hex-map strategy layer** about
keeping a forest in balance. Grown from the user's old project *Moriquende Mardi* (Elfhome,
2022, Java, `Compute101/moriquende-mardi`), in which elves started a colony in a great forest
on a procedurally made hex map.

## The pitch in one line

A 4X turned inside out: you must not expand. You hold a small elven settlement, you can't watch
the whole wood, and you keep goblins, gnolls and incoming orcs **in check against each other**
until the year turns. Wiping something out is possible, but it costs a lot and puts the balance
at risk.

## What makes it fun (the design pillars)

1. **You can't see everything.** There is always less watch than wood. Where you look is the main
   decision every turn.
2. **Fog that talks.** You can't see unwatched hexes, but you can hear and see signs from them:
   smoke, howls, war drums, a flock of birds startled up, the crash of a felled oak. Reading the
   signs is a skill, and it pays.
3. **An ecology, not an enemy list.** Every faction holds another in check. Whatever you do
   spreads to the others: kill the gnolls and the goblins boom; hunt too much and the gnolls
   starve and come for you.
4. **Steer, don't conquer.** Your best moves are often indirect: lure a herd toward a goblin
   warren so the gnolls follow it there, ward a path so the orcs go the other way, let two
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
- **How you get there:** the first University **field trip** after graduating (Fizzwick, the
  Master of the Laboratory, wants the wood's greenglass, Earth quintessence; Weizan can come
  later). Sylvara asks the visiting wizard to stay for a year as war-mage and adviser.
- **Sylvara:** the Warden of the grove. She is on the map as a hero unit (wide sight, strong in a
  fight, can't be everywhere). She judges you at the year's end, and if you kept the balance she
  joins you as a companion (`allies`, `wizard:true`).

### Name candidates
- The forest: **the Moriquende** (from the old project), Mardiwood, the Verdance, the Eldwold.
- The settlement at the centre: **Elfhome** (the old project's name), the Heartgrove, Mardi.

## The map

- A hex grid, about **91 hexes** (radius 5) for the first version, generated from a seed like
  the city maps. Terrain kinds from Elfhome: **old growth** (deep forest, sight 0 into it),
  **woodland**, **glade** (open, where game grazes and orcs like to camp), **hills** (+1 sight),
  **marsh** (goblins' favourite), **crags** (gnoll dens), **river and lake** (cut across the map,
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
  - War drums (goblins gathering, or a Waaagh brewing): a direction only.
  - Howls (gnolls on the hunt): a direction, at night.
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
| **Charming** | Beast-speakers: **herd** game (move a herd one hex), **calm** a gnoll pack for a few turns, **lure**. |
| **Guild** | Builders: talans, thorn hedges, hidden caches. |
| **Healers** | Bring wounded elves back (an elf at 0 is wounded, not dead, if a healer reaches them in time). |
| **Elders** | The council: one seasonal choice (see Council below). |

**Food:** each elf eats 1 a turn. Hunting takes game from a hex, foraging from living forest
(nothing from stumps). Winter halves foraging. Stores carry over.

## The others

Every faction runs on a few plain rules, so the player can learn them, and fight each other by
the same rules that apply to you.

### Game (deer, boar), not a faction but the base of everything
Herds graze glades and move between them, breeding in spring. Eaten by gnolls, elves and orcs.
Too few and the gnolls get hungry; too many and they strip the glades (forest health falls).

### Gnolls (wolfmen), native, belong here
- Packs den in crags and **follow the herds**. Their numbers are capped by the game.
- **Fed gnolls leave elves alone.** When game runs short they range wider, then raid hunters,
  then hamlets.
- They **hunt goblins.** Gnolls are the goblins' main check.
- Sylvara counts them as part of the wood. Wiping out a den angers the Wood.

### Goblins, native, multiply
- Warrens in marsh and crags. Numbers grow fast (about +15% a turn per warren).
- When a warren is full it **splits**: a band goes off to dig a new warren 1–2 hexes away. Left
  alone, they spread across the map like a rash.
- They raid lone hunters and watchers, steal food, and foul glades.
- Their shamans (with mushroom fetishes) light decoy fires and can ward a warren.
- **The danger:** goblins that meet orcs **join them** (see Waaagh). Keeping goblins away from
  the orcs matters more than killing goblins.

### Orcs, newcomers from season 2
- Warbands arrive at the map edge (east first, from Corvanthe's way), one or two a season.
- They camp in a glade and **fell the hexes round it**, one a turn. Felling is the real harm.
- They fight anything nearby: gnolls, goblins they don't take in, elves.
- **Nomads:** harried enough (camp raided, felled wood burned, chiefs struck) a band **moves on**.
  You don't have to kill them, just make staying cost more than leaving.
- **Waaagh!** A band that takes in goblins grows. Past a size threshold the drums start (a sign
  you can hear from anywhere), and two turns later it stops felling and **marches on Elfhome**.
  That's the big set-piece fight, and the reason you watch the orcs.

### The food web, in short

```
  elves ──hunt──▶ game ◀──hunt── gnolls ──hunt──▶ goblins ──join──▶ orcs
    ▲                                                   │             │
    └──────────── raids if starving / swarming ─────────┴─── fell ───▶ forest
```

Each faction keeps another down, and you hold the joints. Kill the gnolls and the goblins boom,
the goblins reach the orcs, and a Waaagh follows. Overhunt and the gnolls starve and raid you.
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
- **Faction bands:** each native population has a healthy band (gnolls 2–4 packs, goblins 3–6
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
| **Dispel** | Break a goblin shaman's fetish (stop a split or a decoy), break an orc war-totem (delay a Waaagh), cleanse blight. |

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
| Gnoll | pack hunter: **Pack**, hits harder at a wounded target |
| Gnoll alpha | leads a pack |
| Orc | tough brute, Attack 6 |
| Orc big'un | leads a band, Shield Wall-like |
| Orc warboss | the Waaagh's leader, a set-piece fight |
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
| Spring | Learn the map. Herds breed, goblins split for the first time. One gnoll pack is hungry. |
| Summer | Goblins spread; gnolls at their peak. First orc band arrives at the season's end. |
| Autumn | Two or three orc bands; felling; the first Waaagh threat. |
| Winter | Game and foraging fall. Hungry gnolls, desperate goblins, a Waaagh if you let one build. Snow shows tracks: unwatched hexes give better signs. |

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
- Fighters: goblin, goblin archer, goblin shaman, gnoll, gnoll alpha, orc, orc big'un, orc
  warboss, elf Talon (male and female).
- Map tokens: herds, warrens, dens, orc camp, treant.

## Open questions for the user
1. **Turn-based or real-time with pause?** The plan assumes turns (one week each), which fits
   the duel game's secret-pick rhythm and touchscreens.
2. **How much fighting by hand?** Auto-resolve the small ones and fight the big ones, or
   fight everything?
3. **One year, or a sandbox?** The plan is a fixed year with an ending; a longer campaign could
   follow.
4. **Names:** the forest and the settlement (see the candidates above).
5. **Is Sylvara the Warden who stays, or is she away for part of the year** (lost on a long
   errand, so the grove is yours alone until she returns)?
