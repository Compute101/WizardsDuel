# The Stoneheart Delve — design

Step 1 is built (see "As built (step 1)" at the end); the rest is plan. The user's answers so far are under "Decided". A light Dwarf-Fortress-style mining game for **Durin**, played in Explore the
way the Moriquende is: its own screen, its own engine, your wizard's HP and gold carried in and out.

## The pitch in one line

Carve a dwarf mine down through five layers of a mountain: dig handsome halls and straight galleries,
house and feed your dwarves, forge their gear, and deal with the earth elementals sleeping in the
stone — and make it *look* like dwarves built it.

## What makes it fun (the design pillars)

1. **Digging is drawing.** The heart of the game is laying out a mine on a grid and watching it get
   carved. Good patterns are rewarded (see "The Mason's Eye"), so the player has a reason to make a
   cloister of pillars instead of a ragged hole.
2. **Every pattern is also a decision.** Pillars hold the roof up, worked walls keep elementals out,
   short walks keep dwarves fed and rested. A beautiful plan and a sound plan should mostly be the
   same plan, with just enough tension to make greed tempting.
3. **The stone is alive.** Earth elementals swim through raw rock. You hear them before you see them
   (tremors, like the Moriquende's signs), and where you dig decides where they can reach.
4. **Greed is the enemy.** The richest ore is in the pillars, under the lake, next to the sleeping
   chamber. Taking it is always possible, and always a risk.
5. **Dwarves are characters.** Each has a name, a trade, a mood and a grudge or two. Losing one is felt.
6. **Light, not Dwarf Fortress.** No z-level spaghetti, no 40 needs, no wiki required. A layer should
   be understandable in a minute and finished in 10–15.

## Where it sits in the world

- **Place:** **Stonedeep?**, the oldest and deepest of the three holds in the Anvilfells, above
  Copperhythe in copper country: the delvers' hold, Durin's home (called **the hold** below). Outsiders get only as far as the gatehouse — you're
  the exception, because Durin asks for you.
- **The mountain:** a peak the hold has never worked, called **the Greyhorn?**. The
  mine is **the Stoneheart Delve** after Durin's title.
- **Lore hook:** since the Unweaving, spilt magic has seeped down through the deep stone, and the earth
  elementals that slept in the roots of the mountains are waking (*stonewakes*). Stonedeep's old
  workings were the first the stonewakes overran, so Durin is digging to win his hold back. The Thane wants a new delve dug, and the hold's runesmiths are too few to
  hold the elementals off. Durin, the Stoneheart, has the Thane's leave to dig it and wants a wizard
  beside him: someone who can fight with elements the stone doesn't shrug off.
- **How you get there:** Torvi Anvilson, the Anvilmoot smith who trades in Hollowmere's market, carries
  Durin's letter (the holds' traders all pass through Hollowmere) once you've graduated (like Mother Agathe and Sylvara's letter). The hold goes on the
  world map, up the mountain path from Copperhythe.
- **Your part and Durin's:** you're the **Delve-planner** (Durin's "you've a straight eye for a
  wizard"). Durin is the mine's master on the map, a piece like Sylvara: he walks the workings,
  prospects, and fights. At the end, if the Delve does him proud, he joins your companions
  (`allies`, `wizard:true`).
- **Why Durin needs you in fights:** an elemental is an Earth Echo in battle (own element ×0.5,
  opposite ×1.5, `ECHO_RULES`). Durin's best spells are Earth, and he's **banned from Air and
  Lightning** — so he can't use Earth's opposite. Your wizard can. That's the reason he wrote to you.

## The map: five layers

Each layer is a top-down grid, about **36 × 26 tiles**, generated from a seed (like the forest and the
city maps). You start at the top layer's entrance tunnel; a layer's **shaft** leads down to the next.
Earlier layers stay live: your dwarves sleep, eat and work across all of them, so where you put
things matters.

| # | Layer | Stone | Ores and finds | New trouble |
|---|---|---|---|---|
| 1 | **The Topstone** | granite | copper, tin, coal | weak elementals (shard-wights); learning the ropes |
| 2 | **The Ironroots** | dark basalt | iron, more coal, limestone (for mortar) | an **underground stream**: water for farms, floods if you break into it badly |
| 3 | **The Glimmerdark** | quartz-shot stone | silver, gems, **galestone** (air-touched ore) | gas pockets? (optional); **geodes**: crystal chambers with stronger elementals |
| 4 | **The Emberdeep** | hot stone | gold, **magma veins** (a free forge fire) | heat: tiles by magma tire dwarves; fire-touched elementals wander in |
| 5 | **The Heartstone** | living rock | **heartsilver?** (the best metal) | **the Mountain's Heart**, the great elemental at the bottom (see "The end") |

- **Tile kinds:** raw stone (soft / hard / very hard: dig time), ore veins, water, magma, soil (the
  only ground farms take, found near water), chambers (hidden voids), and the things you make: floor,
  smoothed wall, engraved wall, pillar, built wall, door, stair.
- **Ore lies in veins:** a vein is a wandering line or blob, so a few exposed ore tiles hint where it
  runs. Following a vein in a straight gallery is the dwarf way, and good for the Mason's Eye.
- **Fog:** you see only tiles your dwarves have dug beside. Unknown stone is dark. **Stone-sense**
  (your miners' skill) shows a faint shimmer one tile into the dark: ore colour, damp, warmth, a
  hollow ring. **Prospecting** (Durin's job, once a day) reveals a circle around him.

## Going down a layer

- The Thane sets each layer a **quota** (copper and tin for the first, iron for the second, …): the ore
  the hold needs, carried to the stockpile. Meet it and the stair down can be cut.
- The shaft must be dug in the layer's **deep spot** (marked by Durin's prospecting: the stone thins
  there). It's a 3 × 3 stair, so it's another thing to place well.
- Layers don't close behind you. You can keep mining an upper layer for its rest, and you'll want to:
  a layer is never mined out by the quota alone.
- Rough length: 5 layers × 10–15 minutes, about an hour for the whole Delve.

## Dwarves

- Start with **6**, up to about **20**. New dwarves arrive from the hold when the quota is met and
  when the Delve's **renown** is high (see the end of each layer).
- Each has a name (dwarf names, never the creator's list or Durin), a **trade** (miner, mason, farmer,
  brewer, smith, warrior) and can haul. Trades level up by use (Novice → Journeyman → Master).
- **Needs, kept to four:** **food**, **ale**, **sleep** (in a bed, or grumpily on the floor), and **a
  hall** (a dining hall to eat in together). That's it.
- **Mood** comes from needs met, the rooms they use (quality, see below), and what happens to them.
- **The Ledger of Grudges** (Durin's: "Fetch the big grudge book!"): bad things go in the ledger by
  name — a friend killed, a cave-in, a meal missed, sleeping on the floor, digging into a flood. A
  dwarf with 3 open grudges **grumbles** (works slowly); with 5 he **downs tools**. Grudges are struck
  out by **settling** them: kill the elemental that killed his kin, a feast in the hall, a fine
  room, a mug of the good ale, a promotion. It's the mood system with a face on it, and very dwarf.
- Dwarves you lose are lost. They get a carved name on a **Wall of Remembrance** if you build one
  (and it settles the grudges of their friends).

## Digging and designating (the controls)

- **Drag a rectangle to dig** (or tap tiles); drag a line for a corridor. Designations queue and dwarves
  take the nearest. Undo before it's dug.
- **Leave pillars:** dig a room and tap tiles to keep as pillars, or use the **pillar brush** (every
  2nd / 3rd tile in a grid).
- **Smooth / engrave walls:** a mason's job, after digging. Smoothed walls raise room quality and are
  **worked stone** (see the elementals). Engraved walls are finer still and slower.
- **Mark rooms:** drag over dug floor and pick a room. Rooms need furniture the smith or mason makes
  from stone blocks (mined stone isn't wasted: it's the building material).
- Pause any time; speed ×1 / ×2 / ×4. Big buttons for phones, as everywhere else.

### Rooms

| Room | Needs | Does |
|---|---|---|
| **Bedrooms** (1 dwarf, 2 × 2 up) or **a dormitory** (cheaper, worse) | beds | sleep; a private room settles grudges faster |
| **Dining hall** | tables, benches | the "hall" need; feasts are held here |
| **Mushroom farm** | **soil** + water within a few tiles | food (deepcaps), and **cave barley** for ale; bigger farms, more food |
| **Brewery** | a still, barley | ale (no ale: a grudge a day) |
| **Stockpiles** | floor | ore, stone, food; long hauls are the hidden cost of a spread-out mine |
| **Forge** | anvil, fire (coal; magma on layer 4 and below needs none) | tools, armour, weapons |
| **Barracks** | weapon racks, beds | warriors train and live there; the alarm sends them from here |
| **Masons' workshop** | a bench | furniture, doors, built walls |
| **Runesmith's hall** (layer 3 on) | an anvil, galestone | Air-runed weapons (see Equipment) |
| **Wall of Remembrance** | an engraved wall | names of the dead; mood |
| **The Great Hall** (one per Delve, optional) | a room of 12 × 8 up with a pillar colonnade | renown and a big mood lift; the showpiece |

**Room quality** is its size, shape (a clean rectangle beats a blob), smoothed / engraved walls,
pillars in a regular grid, and furniture. Shown as stars on the room.

## The Mason's Eye (scoring patterns)

The bit that makes it about *designing a nice mine*. Durin judges the workings as you go (a live
score, and a comment when you do something he likes or hates):

- **True lines:** corridors that run straight and turn at right angles. A jagged tunnel loses marks.
- **Square rooms:** rectangles, or deliberate shapes (cross, octagon), not blobs.
- **Symmetry:** a hall or a hub mirrored about an axis scores well. A four-way symmetric hub is
  **the Thane's Cross**, named in the ledger.
- **Pillars in rhythm:** a regular grid or colonnade.
- **No waste:** digging that leads nowhere costs a little (but prospecting tunnels into the dark are
  forgiven once they find ore).
- **Worked stone:** smoothed and engraved walls.

**Named patterns** (achievements Durin spots on his own; the player discovers them, the help lists only
their names): the Thane's Cross, the Long Gallery (a straight corridor of 20+), the Colonnade, the
Spiral Stair (the shaft dug as a spiral), the Cloister (a square of rooms around a pillared court),
the Ninefold Hall (3 × 3 rooms), the Vein-follower (a straight gallery along a whole vein).

The Mason's Eye feeds **renown** (more dwarves join), dwarves' mood (they like fine halls) and the
layer's stars.

## The stone fights back

### Cave-ins (why pillars matter)

- An open span wider than **5 tiles** without a pillar or wall is **unsound**: a crack hairline shows
  on the map, and each day it may come down (falls of rock, injuries, a grudge, buried ore).
- Better stone holds more: granite spans 5, basalt 6, quartz 4, the hot stone 3. So the right
  pattern changes as you go down.
- **The greed rule:** an ore vein often runs through where a pillar should be. Mine the pillar and you
  get the ore and an unsound roof. Dwarves can **shore** a span with timber (bought, not mined: wood is
  scarce underground) — a temporary fix.

### Water and magma

- Breaking into the stream (layer 2) or a water pocket floods nearby tiles. A tile dug *beside* water
  leaks slowly instead, and the stone-sense shimmer warns you. Channelled properly (dig a channel
  with a flood-gate), water is what makes farms possible.
- Magma (layer 4) is a free forge fire next to it, heat that tires dwarves, and lava that runs if you
  breach it.

### Earth elementals

- **They swim through raw stone, but not through worked stone.** Smoothed and engraved walls, built
  walls and pillars stop them. So working the walls of your living quarters is defence as well as
  beauty — the two pillars of the game meet here. Unworked corridors are where they come in.
- **Sleeping chambers:** each layer has a few hidden voids (geodes on layer 3) with elementals asleep
  in them. Digging close sends **tremors** (a shaking marker in the dark, stronger as you get closer,
  like the Moriquende's signs); breaking in wakes them.
- **Wanderers:** stonewakes rise through the rock now and then, more on lower layers and more the more
  noise you make (lots of digging at once). The tremor marker shows roughly where.
- **Three choices** with a chamber: **leave it** (dig round it, keep a worked wall between you),
  **fight it** (send the barracks; or lead the fight, below), or **have Durin bind it** (see "Durin's
  binding").
- **Kinds** (all Earth fighters with `ECHO_RULES`): shard-wight (weak), stonewake (strong), crystal
  wight (layer 3, reflects some magic?), ember-wake (layer 4, a Fire stray, as Echoes stray between
  sectors), and the Mountain's Heart.

## Durin's binding (decided: Durin binds)

Binding is Durin's alone: the old runecraft of the holds, and the thing that makes him the most
valuable piece on the map. It's the answer that keeps the mountain whole rather than killing it.

- **How:** select Durin, tap an elemental. He walks there and starts the binding, a channel of a
  few seconds (longer for bigger elementals) shown as a ring of runes filling round him. While he
  binds he can't move or fight, and the elemental fights back at him, so **someone has to hold it**:
  warriors in front of him, or your wizard.
- **It must be worn down first:** a binding only takes on an elemental below half its strength
  (shown on its bar). So it's a team job: warriors (or your wizard's Air strikes) beat it down, Durin
  binds it before they finish it off. Kill it by accident and the chance is gone.
- **Worked stone helps:** binding inside a room with smoothed walls is quicker (the elemental can't
  sink back into the rock to escape). In a raw tunnel it may slip away into the stone mid-binding.
- **Runes:** each binding uses a rune-stone (cut from the layer's stone at the mason's bench; from
  layer 3 the bigger elementals need **silver** runes). A cheap, steady cost, so you can't bind
  everything.
- **Interrupted:** if Durin is struck hard enough while binding (or the elemental's friends join in),
  the binding breaks and the elemental is enraged (stronger for a while). If Durin is downed he's out
  of the Delve until he's rested in his bed, and no bindings happen meanwhile: protect him.
- **What you get:** a bound elemental becomes a **stone-servant** for a while (a few days of game
  time): it digs very fast and can't be hurt by cave-ins, then sinks back into the mountain at
  peace. Each binding also settles a grudge (the dwarves are proud of it) and counts toward the
  Assay's "stone" stars. A bound guardian leaves its chamber safe to work.
- **In a duel you lead:** Durin is a seat beside your wizard; binding is a signature-like pick
  (a Dispel-category action against an elemental at or below half HP, if the duel engine can carry
  it), which ends the fight as a binding instead of a kill.
- **The Mountain's Heart** is the last binding: the finale (see "The end").

## Equipment

The smith turns ore into gear, and gear is what lets warriors survive. Kept to a few lines:

| Metal | From | Makes |
|---|---|---|
| **Bronze** | copper + tin (layer 1) | picks, axes, shields, scale |
| **Iron / steel** | iron + coal (layer 2) | better picks (dig faster), mail, hammers |
| **Silver** | layer 3 | runes hold in it: needed for runed gear |
| **Air-runed** | steel + galestone, at the Runesmith's hall | weapons that strike as **Air**: ×1.5 on elementals |
| **Heartsilver?** | layer 5 | the best of everything; Durin's own gear at the end |

- **Hammers beat axes** against elementals (stone shrugs off edges): a simple, learnable rule.
- **Picks wear out.** A miner without a pick digs with his hands, slowly. Keeping tools stocked is a
  quiet pressure on the forge.
- **The equipment plan:** each warrior has a loadout slot (weapon, shield, armour); the barracks screen
  shows them all and what each warrior's gear is worth against the next layer's elementals (a simple
  bar: "ready for the Ironroots" / "outmatched"). Planning gear before you dig into a geode is the
  point.
- In battle, gear maps onto the fighter levels (`SURVIVAL_LEVELS`: bronze recruit, steel veteran,
  runed elite, heartsilver champion).

## Battles

As in the Moriquende (`docs/forest-design.md`, "Leading a fight yourself"):
- **Small fights play out on the map:** warriors and an elemental trade blows by the numbers (gear,
  numbers, hammers, Air runes). Quick and readable, with a log line.
- **Big fights** (a chamber's guardian, a breach into the quarters, the Heart) pause the Delve and
  offer **⚔ Lead it yourself**: a real duel through `startExploreBattle`, your wizard with Durin and up
  to two dwarf warriors as seats, against the elementals. Or let it play out at the odds shown.
- New fighters: **dwarf warrior** (Shield Wall like the soldier, a hammer), the elementals above.
  Placeholder art: the Echo Earth sprites (`sprites/echoes/earth_*.png`) for elementals, the dwarf
  hero figures for warriors.
- One HP pool with Explore, as the forest does: your wizard's wounds come in and go out.

## Trade and the outside

- **Caravans** come up from Varg's Delve every few days: sell ore and gems for food, ale (until your
  farms and brewery manage), timber and new picks. Prices favour finished goods (a bronze shield sells
  for more than its copper), so the forge is worth running.
- The Thane's share of the quota goes to the hold; what's over is the Delve's to trade, and some of
  it pays you in gold back in Explore.

## The end of each layer: the Thane's Assay

When the quota's met and the stair's cut, the Thane's assayer comes down and gives the layer **1–3
stars** on four things: ore (quota and over), the Mason's Eye, the dwarves (alive, mood, open grudges)
and the stone (cave-ins, floods, elementals loose). Stars bring renown (more dwarves), a gift (a
blueprint, a rune, a topper for your staff?), and Durin's verdict in his own voice.

## The end: the Mountain's Heart

At the bottom of the Heartstone sleeps the great elemental whose waking stirs all the others. You
choose: **fight it** (the hardest battle; Air-runed warriors and your wizard), **have Durin bind it**
(needs a chamber of engraved walls built round it first, a construction puzzle under pressure as it
stirs, then the battle of your life to wear it down while Durin binds), or
**leave it sealed** (wall it in with worked stone and go no further; the Delve ends without
heartsilver but the mountain stays quiet). Binding is the best ending, like the forest's Wood in Song.

**Endings:** the Delve's total stars name it (a Hole in the Hill → a Fair Working → a Hold of Renown →
**a Wonder of the Hammerfells**). The best ending puts Durin in your companions and carves your name
in the hold's Hall of Delvers (and a stair from the gatehouse is now open to you).

## Difficulty curve

- **Layer 1** teaches: dig, rooms, farms, the first quota, one sleeping chamber easy to avoid.
- **Layer 2** adds water and the first real elemental fight; iron gear.
- **Layer 3** adds geodes, binding and runes; spans get shorter.
- **Layer 4** adds magma, heat and stray Fire elementals; long hauls start to bite (build new
  quarters lower down?).
- **Layer 5** is the finale.

## Testing it (the same way as the duel game and the forest)

A pure engine in Node (`js/mine_engine.js`) and `node tools/mine_sim.js [games] [bots]` with bots:
- **idle** (does nothing useful): must fail on layer 1 or 2.
- **greedy** (mines every ore tile, pillars included, no smoothing): must get cave-ins and breaches,
  and score worse than balanced despite more ore.
- **turtle** (smooths everything, digs little): safe but misses quotas.
- **balanced** (pillared rooms, worked quarters, follows veins): about 2 stars a layer, reaches the
  Heart most games.

Targets get written here once the first numbers are in.

## Build order

1. **One layer, no enemies:** the grid, fog, digging, dwarves walking and hauling, stockpiles, rooms,
   food, sleep, ale. The Mason's Eye score. Test menu ⛏ entry, saved in `localStorage`.
2. **Cave-ins and pillars**, the quota and the stair, all five layers' stone and ore.
3. **Elementals:** tremors, chambers, worked stone stopping them, map fights, barracks and gear.
4. **Lead it yourself** (`startExploreBattle`), the new fighters, binding.
5. **Grudges, renown, caravans, the Assay.**
6. **The story:** Torvi's letter, the hold on the world map (gatehouse map), Durin, the Heart, the
   endings; one HP pool and gold with Explore (`quests.mine`).
7. Art, music (a dwarf variation of the Corvanthe theme? low brass and anvils), sound.

Files (planned): `js/mine_engine.js`, `js/mine.js`, `css/mine.css`, `tools/mine_sim.js`; a gatehouse map
`tools/mapgen/hammerhall.js` later.

## Art needed (later, briefs to `docs/art-prompts.md`)

Until then the map is drawn in canvas (as the forest was at first).
- **Tiles (top-down, the Explore tilesets' scale):** raw stone in five colours, ore veins (copper,
  tin, coal, iron, silver, gems, galestone, gold, heartsilver), dug floor, smoothed and engraved
  walls, pillars, water, magma, soil, mushroom farm, doors, the stair.
- **Furniture:** bed, table, bench, still, anvil and forge, weapon rack, mason's bench, rune anvil,
  stockpile crates.
- **Dwarves on the map:** small figures per trade (pick, trowel, hoe, mug, hammer, shield).
- **Elementals:** shard-wight, stonewake, crystal wight, ember-wake, the Mountain's Heart (battle
  sprites in the Echo style).
- **A battle backdrop:** a pillared dwarf hall underground.

## Decided (the user's answers)

1. **Real time** (with pause and speed buttons).
2. **A top-down grid** for each layer.
3. **Stonedeep.** The great hold was renamed **Anvilmoot** (the user didn't like *Hammerhall*, too
   close to Age of Sigmar's Hammerhal) and the range **the Anvilfells** (*the Hammerfells* was too close
   to the Elder Scrolls' Hammerfell), everywhere.
4. **You plan the Delve; Durin is a piece** on the map, and he's the one who binds elementals.
5. **Durin binds** (see "Durin's binding").

## The three holds

- **Stonedeep?** (above Copperhythe; copper): the oldest and deepest hold, the delvers' hold. **The
  Delve's hold**, and Durin's.
- **Anvilmoot** (above Varg's Delve; the greatest, where the holds meet, which named the range): the biggest and the
  proudest, its smiths sell in Hollowmere (Torvi).
- **Coldforge?** (above Tinwell, over the Grey Sea; tin): cold, sea-facing and mercantile, its
  factors count the Ore Road's trade (Grimma).

## As built (step 1)

One layer, no enemies. ⛏ Stoneheart Delve in the title screen's Test menu (`Mine.open()`), saved on the
device in `localStorage` `wd-mine-save`; not joined to Explore yet.

- **Files:** `js/mine_engine.js` (`MineEngine`: pure, runs in Node, every number at the top), `js/mine.js`
  (the screen, drawn on a canvas), `css/mine.css`, `tools/mine_sim.js` (`node tools/mine_sim.js [days] [seed]`
  plays a scripted plan: a gallery, a pillared dining hall, bedrooms, a stockpile, a brewery, farms on
  whatever loam gets dug, and prints the stock, rooms, the Mason's Eye and each dwarf).
- **The layer:** 36 × 26 tiles from a seed: rock soft / firm / hard (dig 2.5 / 4 / 6 s, ore ×1.5) from a
  noise field that hardens further in, copper and tin veins, coal blobs, two loam pockets (the first always
  within reach of the gate), the gate tunnel on the west edge with the wagon's supplies (36 food, 28 ale,
  4 stone). Fog: you see stone beside dug floor; ore glints faintly one tile further into the dark.
- **Time:** real time, a day is 4 minutes at ×1, ⏸ ▶ ×2 ×4 (Space pauses).
- **Tools:** ✋ Look (tap a dwarf, Durin, a room or a tile; drag pans), ⛏ Dig, 🏛 Pillar, ✨ Smooth, 🏠 Room
  (stockpile, bedroom, dormitory, dining hall, mushroom farm, brewery; more below), ✖ Clear; drag a rectangle; pinch,
  wheel or + / − to zoom (a phone opens zoomed in on the gate). Keys D P S R C L.
- **The crew:** six dwarves (three miners, a mason, a farmer, a brewer; names from their own list, none
  shared with the hero creator's dwarf names). Each picks its own work: needs first (sleep below 25, food
  and ale below 35), then its trade (miners dig; the mason builds furniture from stone blocks and smooths;
  the farmer plants and harvests soil tiles, deepcaps and cave barley turn about; the brewer turns a barley
  into 3 ale at a still), then hauling, then digging at 0.6 speed. Paths are a breadth-first search over
  floor. Skill: Novice → Journeyman (40 xp, ×1.3) → Master (140, ×1.6).
- **Rooms:** must be dug floor and pillars, no overlap, a farm needs soil. Furniture is placed on a 2-tile
  grid (a bed per bedroom, one per 3 tiles in a dormitory, a table per 6 in a dining hall, a still per
  brewery). Stars: 1, +1 furnished and big enough (`good`), +1 with 80% of its walls and pillars smoothed.
- **The Ledger of Grudges:** hungry, dry, a floor meal or a floor bed (the last two only after a day and a
  half) puts a grudge in; one a day of each kind. 3 open: grumbling (×0.6 speed); 5: downs tools. A grudge
  fades after 3 days, or a meal in a 2★ hall (half the time) or a night in a 2★ bedroom strikes one out.
- **Durin:** a piece; tap him, then tap floor to send him. 🔍 Prospect reveals 5 tiles round him once a day.
- **The Mason's Eye** (score 0–100 once 30 floor tiles are dug): true lines (corners per passage tile),
  order (passage in 3 × 3 open blobs), symmetry (each room mirrored either way), pillars in rhythm (a full
  even lattice), worked stone (room walls smoothed); −3 for each dead end that found no ore (most 15). 👁
  marks corners, blobs and dead ends on the map. Named patterns found so far: the Long Gallery, the
  Thane's Cross, the Colonnade, the Ninefold Hall (rooms 2 × 2 and up with a wall between); the Cloister,
  the Spiral Stair and the Vein-follower are names only.
- **Last sim** (8 days, seed 7): every marked tile dug, 85 food and 91 ale in store, 3 / 3 dining hall,
  2★ bedrooms, Mason's Eye 69–81, the Long Gallery and the Colonnade.
- **After the user's first play (November 2026):**
  - *"I can't build walls, doors or pillars, so I can't correct mistakes."* The mason now builds on dug floor,
    a stone block each: 🧱 **Wall** (not inside a room; worked stone, drawn as masonry), 🚪 **Door** (stays
    walkable; later it'll stop elementals) and 🏛 **Pillar**, which now works on both rock (keep it) and dug
    floor (build one). He stands beside the tile, never on it; anything lying there goes to the stock and
    anyone standing there steps aside. To undo: dig a built wall or pillar out (the stone comes back), and
    ✖ Clear takes out a door or any mark. Engine: `BUILDS`, `t.b` (ordered), `construct`, `t.bt` (built),
    `t.dr` (a door); the mason's work order is furniture, then building, then smoothing.
  - *"Most of the patterns Durin wants, I don't know what they are."* The Mason's Eye tab has
    📖 **The Delve-book**: every named pattern, what makes it, and a little plan of one (`BOOK` in
    `js/mine.js`). The user suggested a lore book; this is it, Durin's own. The Cloister (a pillared court
    with a room on each side) and the Vein-follower (a straight passage along a vein of ore) are now
    spotted too; the Spiral Stair waits for the stair.
  - *"The helper message doesn't go away."* A tool's instructions are now a steady line over the tool bar
    that changes with the tool (`#mn-hint`), not a toast. Toasts (the log's news) are shorter (2.2 s + 25 ms a
    character, 6 s at most), at most three wait, the same message never queues twice, and a tap dismisses
    one.
  - *"The UI won't work for mobile, so you need a build menu where you can select the subtype."* The tool
    bar is down to six buttons: Look, Dig, 🧱 **Build ▴**, Smooth, 🏠 **Room ▴**, Clear. Build and Room each open
    a menu of big buttons over the tool bar (Wall / Pillar / Door; the six rooms with their colours), and the
    button then shows what it's set to ("🧱 Wall", "🏠 Dining"). Tapping it again closes the menu without
    changing the tool; only the open menu's button is lit. The room list left the side panel. Keys: B and R
    open the menus, W / P / O pick a build straight away (`BUILD_MENU`, `ui.menu`, `pickFromMenu`,
    `#mn-menu`).
  - *"I made some dormitories, then some nice bedrooms, but the dwarves don't use the bedrooms."* A dwarf
    used to keep the first bed they got for good, and took the nearest one. Now at bedtime each takes the best
    free bed (`bedWorth`: a bedroom 100, a dormitory 50, +10 a star; `BED_NEAR` 0.2 a tile of walk against it)
    and moves out of the one they have for a clearly better one (`BED_MOVE` 5), with a line in the log.
    Checked: six dwarves in two dormitories all moved into six new bedrooms within a night.
  - *"We need more rooms, like a mason's workshop that allows you to do the actual building."* A new room,
    the **Mason's workshop** (one bench, `ROOMS.workshop`). Digging gives **rough stone**; at the bench the
    mason cuts it into **dressed blocks** (`cut`, `CUT_S` 3 s), and every bed, table, still, wall, pillar and
    door takes a block (`matOf`); only the bench itself is roughed out of rough stone, so the first one can
    be made. He cuts only what the building ordered needs, plus `BLOCK_SPARE` (3) ahead (`blocksWanted`).
    Built walls and pillars dug out, doors cleared and rooms removed give their blocks back. The stock bar
    shows 🪨 rough stone and 🧱 blocks; marking a room or a build with no blocks says what's missing (no
    workshop, no bench yet, no rough stone; `blockNews`), and Durin's opening line says to make one early.
    Room names now sit on the wall just above the room, so they don't cover its corner furniture.
  - *"Yes, do all of them"* (the rooms proposed above). Six more rooms, each with work to do now
    (`ROOMS` in `js/mine_engine.js`; their help is `ROOM_HELP` in `js/mine.js`), and a **smith**, a seventh
    dwarf (an older save gets him at the gate, `migrate`). Crafts are one job now, `craft`, driven by
    `RECIPES` (what it's made at, what it takes from the stock, what it makes, how long, and when it's
    wanted): the dwarf takes the inputs, carries them to the furniture, works, and leaves the goods to be
    hauled. Cutting and brewing moved onto it too. If the job's dropped, its inputs go back (`j.took`).
    - **Kitchen** (one hearth): the farmer or brewer cooks 2 deepcaps into 3 meals 🍲 while there are fewer
      than two a dwarf. Meals are eaten before raw deepcaps; a meal at any table strikes out a grudge 40% of
      the time (on top of a 2★ hall's 50%).
    - **Forge** (one anvil): the smith smelts a copper, a tin and a coal into 2 bronze 🟫 (while under 2)
      and forges a bronze pick ⛏ from one (while under 2 in the stock). **Picks wear out:** the crew arrive
      with old iron picks (speed 1, 70 tiles); a bronze pick digs at 1.4 for 90 tiles (`PICKS`); a miner with
      none digs at 0.45 (`NO_PICK`) and fetches a bronze one from the stock as soon as there is one
      (`getpick`, also swapping out an old iron pick). The log says when a pick wears out. 70 because at 45
      every seed's old picks were gone on day 2, before anyone could have found three ores and built an anvil.
    - **Tavern hall** (a keg every 8 tiles): the crew drink at a keg before anywhere else; a pint there
      strikes out a grudge 40% of the time (`TAVERN_SETTLE`).
    - **Infirmary** (a cot every 4 tiles): digging hard rock (hardness 3) or ore hurts a dwarf 4% of the time
      (`HURT_CHANCE`): half pace (`HURT_SPEED`) until mended. A hurt dwarf goes to a free cot after eating and
      drinking and is mended in a quarter of a day (`HEAL_COT`); with no cot they walk it off in a day and a
      half (`HEAL_WALK`), and, after the first day and a half, with no cot built anywhere, hold a grudge for
      it. Hurt dwarves wear a bandage on the map. The cave-ins of step 2 will hurt dwarves too.
    - **Barracks** (a weapon rack every 4 tiles): nothing to guard against yet; it's where the warriors of
      step 3 will stand.
    - **The Great Hall:** one a Delve, at least 40 tiles (`GREAT_HALL_MIN`; `one` and `min` on a room type,
      checked in `makeRoom`), a table every 6, 2★ only at 60 tiles. The crew eat there before anywhere else,
      and every meal in it strikes out a grudge.
    - **The Wall of Remembrance** waits for step 2: it needs dwarves who die.
    - The stock bar adds 🍲 meals, 🟫 bronze and ⛏ picks; a dwarf's panel shows their pick and any hurt;
      on a phone the room menu runs four across, the map's width.
    - **Sim** (`tools/mine_sim.js` now also digs a kitchen, forge, tavern, infirmary, a Great Hall, barracks
      and a dormitory for the seventh dwarf, and keeps its auto-farms off every planned room, which used to
      steal seed 7's dining hall): 10 days, seed 7: every room made, 2★ but the Great Hall, picks forged,
      every grudge but one struck out, Mason's Eye 81, three patterns. Across seeds 1–9 (7 days) the old picks
      wear out around day 4 and bronze picks reach the miners on most seeds; where they don't, coal is short
      (prospect for it). Wounds come mostly in the first days, while the hard rock is dug, so in the sim they
      are walked off before an infirmary is furnished; a dwarf hurt later goes to a cot and is mended
      (checked). Seed 3 runs out of food by day 8, as before: its loam lies where the script never farms.
  - *"If rooms don't have a door they shouldn't be considered good."* A room's second star now also needs
    a door on every way in (`roomOpenings`: floor outside the room beside its floor, where neither tile is a
    built door; a door can hang on the room's edge or just outside it). Anything else must be walled up or
    left undug. Stockpiles and farms (`open` on the room type) need no door. Tapping a room marks its open
    ways in red on the map and its panel counts them. Since bed choice and grudge-settling go by stars, an
    open-sided bedroom or hall is now worth less to the crew too. The sim was relaid out the way a player
    would build: every room set back from the gallery behind a one-tile doorway, where it orders a door
    (14 doors; with the old layout, rooms open along whole sides of the gallery wanted 54). 10 days, seed 7:
    every room 2★ (the dining hall 3★), but the Great Hall, at 40 tiles short of its 60; seeds 1, 2 and 5
    run short of food (their loam is outside the script's farms), seed 2 so badly that the grudging crew
    built only one door.
    *"Do workshops have that? They're generally quite open."* No longer: the mason's workshop, brewery, kitchen
    and forge are `open` too, like the stockpile and farms. Rooms to live, eat, drink, heal and muster in still
    need their doors.
    *"No, taverns should have doors too. Although I guess you could have a taproom, but they won't be as
    good!"* (I'd first misread it as "no taverns should have doors".) The tavern hall needs its doors again,
    and there's a new room, the **Taproom** (`ROOMS.taproom`: kegs, `open`, so no door wanted, `good` 6), which
    is never as good: a pint there strikes out a grudge 20% of the time (`TAPROOM_SETTLE`) against the
    tavern's 40%, and the crew go to a tavern's keg before a taproom's.
    *"The tavern needs a dwarf to serve, I guess, but the taproom doesn't."* A new trade, the **Tavern keeper**
    (`TRADES.keeper`, 🍻): when the first tavern is furnished, one comes up from Stonedeep (`hireKeeper`; an
    older save with a furnished tavern gets one, `migrate` v5). The keeper's work is to stand behind the bar
    (`serve`: a floor tile of the tavern beside a keg, `SERVE_S` 30 s a stint), else haul. A tavern pours only
    while its keeper is there (`served`), so it shuts while they eat or sleep and the crew drink at a taproom or
    a table instead; a taproom's kegs serve themselves.
    The sim's Great Hall was only 40 tiles (10 × 4), the minimum, so it never earned a second star; there was
    room for 10 × 6 (rows 1–6), so it's 60 tiles now and reaches 2★ on seeds 7 and 9 in 10 days.

## As built (step 2: the layers, the quota and the stair, cave-ins)

- **Five layers in one grid:** each layer is 36 × 26 (`LH`), stacked in one tall grid with a row of bedrock
  between layers (`STRIDE` 27; bedrock is tile kind `x`, never dug, never shown), so a tile's x and y mean
  the same everywhere and a layer is a band of rows (`layerOf`, `topOf`). All five are made from the seed at
  the start (`genLayer`, from `LAYERS[z].gen`); you see one at a time (▲ ▼ by the map, or [ ]; the layer's
  name over the map). Older saves get layers 2–5 appended below (`migrate`, v3), so nothing on the first
  layer moves.
- **`LAYERS`:** the Topstone (granite, roof 3, copper, tin, coal, loam; quota copper 8, tin 6), the
  Ironroots (basalt, roof 4, harder, iron, coal, limestone, a little loam; iron 10), the Glimmerdark
  (quartz-shot, roof 2, silver, gems, galestone; silver 6, gems 3), the Emberdeep (hot stone, roof 2, gold,
  coal; gold 6) and the Heartstone (living rock, roof 3, heartsilver, a little gold; heartsilver 3). Deeper
  is harder rock (`hard`). Each has its own stone colours on the map (`ROCKS` in `js/mine.js`).
- **The quota:** ore carried into the stock counts, all told (`S.got`, `addStock`), so the smith using
  copper doesn't set you back. The Quota tab shows the deepest layer's bars.
- **The deep spot and the stair:** each layer but the last has a 3 × 3 deep spot of undug rock
  (`placeDeep`, `S.deep`). It's found when Durin prospects within 7 tiles of it, or anyone digs beside it
  (`deepKnown`), and then shows on the map as a pulsing dashed square. With the quota met, 🪜 Cut the stair
  down (Quota tab; `cutStair`, `stairWhy` says what's missing) marks the nine tiles; once the miners have
  dug them all (`stairCheck`), the landing below is carved out, the two middles are linked (`S.links`) and
  the next layer opens (`S.depth`). Paths and hauls run through stairs (`distMap`, a stair is
  `STAIR_STEPS` 6 tiles of walking), so the crew still go up to eat, drink and sleep, and long hauls start
  to tell. Stair tiles take no rooms, building or marks.
- **Cave-ins:** the roof holds `roof` tiles (king's moves) from anything that isn't floor: rock, a pillar, a
  wall, the stair, bedrock (`roofDist`). Floor further than that is unsound. Every 10 s (`CAVE.check`) the
  roof is looked over: unsound floor shows red hairline cracks that darken as its timer runs (`t.cr`), and
  a span unsound for half a day (`CAVE.grace`) comes down 8% of each look (`CAVE.chance`), never before
  three quarters of the first day. It becomes rubble (`t.rb`: quick to dig, all rough stone; dig it out and
  the span is open again), burying what lay there (items, furniture, a door, a crop); anyone under it dies
  30% of the time (`CAVE.kill`), else is hurt and thrown clear; everyone holds a grudge ("The roof came
  down"). A 9 × 9 hall comes down at its middle in about a day; five pillars hold it. The long, narrow
  halls of the sim never do (a hall six wide on the Topstone is sound however long).
- **The fallen and the Wall of Remembrance:** a dwarf who dies is gone for good (`killDwarf`, `S.dead`,
  listed under 🕯 The fallen in the Ledger); every other dwarf mourns ("Mourning X", a grudge). The **Wall
  of Remembrance** (`ROOMS.memorial`, one carved plaque, open) is where a mourner goes to carve a word for
  the dead (`mourn`, 5 s), striking that grudge out. No new dwarves come yet (renown and migrants are
  step 5).
- **The Mason's Eye** judges the layer on screen (`masonEye(S, z)`); named patterns count on any layer.
- **Not built (later steps):** water (the Ironroots' stream, floods, channels) and magma, shoring with timber,
  the Thane's Assay of each layer, the Mountain's Heart.
- **Sim** (`tools/mine_sim.js` now follows any ore it can see, cuts a passage to the deep spot, and cuts the
  stair when it can): 14 days, seed 7 reaches layer 3 with silver met; seeds 1–9 reach layers 1–3. It
  stalls at iron on layer 2 on most seeds: it only digs to the deep spot and follows ore it already sees, so
  it rarely finds a vein (a player would explore). No cave-ins in its halls.
- **Water and wells** (the user asked where the brewer's water comes from, and didn't want Dwarf Fortress's
  well that freezes in winter and kills everyone of thirst): brewing now takes a barley **and a bucket of
  water** (`RECIPES.brew`). Water never fails: the Delve has no winter, and the crew drink ale, not water, so
  a dry spell only slows the brewery. Sources: the wagon's 6 buckets (`START_STOCK.water`); **meltwater**
  fetched from outside the gate (`RECIPES.melt`, 30 s a bucket, only while there's no well); and a **well**
  (`RECIPES.draw`, 2 buckets in 3 s), which the mason sinks on dug **damp** floor (🧱 Build ▴ → 💧 Well,
  `BUILDS.well` with `damp`, a dressed block; ✖ Clear takes it out; a cave-in buries it). Each layer has
  `DAMP` (4) small damp patches (`t.dm`, `damp`): blue flecks on the map, a faint blue shimmer one tile into
  the dark (stone-sense), and Durin's prospecting shows them. Water is drawn only while the brewery has fewer
  than 4 buckets (`waterWanted`). A recipe with nothing to carry goes straight to its tile (`atTile`). New
  named pattern: **the Wellhead Court** (a room odd-sized both ways, 3 × 3 or more, a well on its middle
  tile). Sim (10 days): seed 7 makes 143 ale with a well and 77 without (barley piles up waiting for water);
  at 9 s a meltwater bucket the well made no difference, so it's 30 s. Older saves get damp patches in stone
  not yet dug, and the 6 buckets (`migrate`, v4). The Ironroots' stream (a free well along its bank, floods
  if broken into badly) is still to come.
- **Next (step 3):** the elementals.
