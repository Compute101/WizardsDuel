# The World — design

The long-term plan for turning Explore mode into a large world to explore, in the spirit of
Baldur's Gate: countries, cities, towns and villages, with wizards stationed around the world.
You meet them, they start stories, and some join your party. Battles use the existing duel
screen. Nothing here is built yet beyond Hollowmere (see "Explore mode" in `CLAUDE.md`).

Status: **vision and names agreed; step 1 (maps as data, travel, world map) built.**

## Decisions so far

| Question | Decision |
|---|---|
| Who is the player? | A wizard you create yourself. |
| Party? | Yes: wizards you meet can join you, Baldur's Gate style. |
| Battles | On the existing duel screen (wheel, minigames, picks). Not on the map. |
| Difficulty | Rises toward the centre of the accident city: easy at the edge, very hard near the centre. |
| What the element loot buys | Deferred. |
| Names | Chosen: see "Names" below. |

## The first city: Corvanthe and the Unweaving

**Corvanthe**, a great old university city, where magic went wrong in **the Unweaving**: a magical Chernobyl. Ground zero is **the Wound**. The city is in ruins and saturated with
magical energy. The citizens were turned into elementals, the **Echoes**. They can't die: when one is destroyed it
reforms at ground zero and walks back to where it stood when the accident happened. In the game they
simply respawn after a while; the lore doesn't need to be shown.

A destroyed Echo leaves raw elemental matter behind: **quintessence** officially, **spill** on the street. It's in high demand for potions, magic
items and spells, so warbands (**gleaners**) come into the ruins to hunt Echoes for it ("spilling"), and fight each other
over it.

### Eight sectors, one per element

The duel engine has eight elements in four opposite pairs (`ELEMENTS`, `opposedElem`). The blast
split the city into eight sectors, each steeped in one element, laid out round ground zero like the
spell wheel, so opposites face each other across the centre. Each sector looks different, and its
elementals fight in its element, resist it and take extra from its opposite, which the engine
already handles. Bringing the opposite element's magic into a sector pays.

The sectors (old districts):

| Element | Sector | What it was | Look now |
|---|---|---|---|
| Fire | Cindergate | forges and foundries | scorched, embers, lava cracks |
| Water | the Drowned Quarter | the old harbour | flooded streets |
| Ice | Frostmarket | the great market, frozen mid-trade | iced over, frozen stalls |
| Lightning | Spirewatch | towers and bell-spires | lightning crawling over roofs |
| Earth | the Quarry Ward | stonemasons and mines | heaved ground, rock spires |
| Air | the Heights | the wealthy hill houses | houses and rubble floating loose |
| Arcane | the Collegium | the university, where it began | arcane-lit, warped |
| Dark | Gloamside | temples and catacombs | shadow-choked |

Each sector is a dense city map: streets, terraces of houses, alleys, squares, plus the places a
real city has (market, guildhall, temple, baths, gaol, warehouses), abandoned and part ruined.

### Difficulty rings

Each sector runs from the city wall in to ground zero. Its outer streets are fairly easy, the
middle rings harder, and the streets round ground zero very hard. Elementals scale by ring, reusing
Survival's levels (`SURVIVAL_LEVELS`: recruit, veteran, elite, champion, plus whatever is needed
beyond). A fresh wizard can clear the edges and has to grow before pushing in.

### Elementals

- New fighter types (`fighters.json`, like the Survival soldier and archer), eight kinds, one per
  element, weak and strong versions.
- Seen roaming on the map; walking into one starts a battle on the duel screen.
- Its spot refills after a while (respawn timer per spawn point).
- Each one drops that element's matter.

### Warbands

Rival crews scavenging the city: groups of fighters (the Survival soldiers and archers are a start),
sometimes with a hired wizard. They patrol, fight elementals and fight you. Later: they can be
talked to, traded with or hired.

## The player and the party

### Create your own wizard

A created wizard is just another `characters.json` entry, built from your choices.

- **Look:** a set of base figures in the house style (young / old, builds, faces, human / elf /
  dwarf), recoloured robes and trim (the recolour tool in `tools/cut_ruins_tileset.py` already does
  roof colours this way), a matching portrait, a name. Figures assembled from separate hats, robes
  and staffs were ruled out: generated art rarely lines up layer to layer.
- **Magic:** a starting element (with a matching banned element, the engine's usual balancing
  lever) and three signature spells (one Damage, one Protection, one Dispel) from a pool built from
  the existing ones, so they come pre-balanced. More are learned along the way.
- **Growth:** starts weaker than the roster wizards and levels up.

### Party

The roster wizards become people in the world, stationed in its places. Talk to them to start
their stories; some join you. Their data already holds personality (`aiStyle`) and rivals
(`rivals`): rivals in the same party bicker, or refuse to travel together.

**Engine limit:** battles hold up to four seats today (3–4 wizard games, Survival). A party of
three against three elementals needs six, so the battle screen and seat code must grow. Companions
in battle: you pick for each, or set one to AI.

## Build order

1. **Maps as data, and travel.** *Done.* Maps are files (`maps/`, built by `tools/build_maps.js`
   from `tools/mapgen/`), with exits to other maps or the world map (`maps/world.json`).
   Hollowmere is the last town outside Corvanthe; the Corvanthe Road leads from it to the city's
   barred gate. See "Explore mode" in `CLAUDE.md`.
2. **City-block generator** for the sectors: streets, blocks filled with terraces (fronts, backs and
   sides of houses face the right way), squares, then hand-placed landmarks.
3. **Elementals on the map:** roaming, battle on contact, loot, respawn.
4. **Inventory and save game**, per profile.
5. **Characters, dialogue and quests:** wizards in places, conversations, quest state.
6. **Warbands.**
7. **Character creation and the party** (needs the 6-seat battle work) can start any time after 1.

1 and 3 are the backbone.

## Art needed

- City pieces: terraced and two-storey houses, a city wall and gate, alleys, a market square, a
  guildhall, a temple; each also in ruined form.
- Eight elemental creatures as battle sprites (stills like the character sprites, facing right,
  feet on the bottom edge), weak and strong versions.
- Each sector's look. The recolour tool can make frosted or scorched versions of every building,
  and night lighting and map effects can add embers, frost mist and sparks; some sectors want their
  own pieces (ice formations, lava cracks, floating rocks, drowned streets).
- Base wizard figures and portraits for character creation.
- From the earlier labelled sheet, not yet cut: cemetery, market stalls, well, rune circles,
  campfire, tent, cage, portal, braziers, mill and waterwheel, rowing boat, fog. Several suit warband
  camps and ground zero, so they wait for the city.

Prompt rules that worked for generated sheets are in `CLAUDE.md` (Explore mode, Art).

## Names

Chosen (all from the earlier candidates). Keep names our own: the idea of warbands scavenging a
ruined city is generic, but nothing should be borrowed from an existing setting.

| Thing | Name |
|---|---|
| The city | Corvanthe |
| The accident | the Unweaving (survivors also say "the Bright Hour") |
| Ground zero | the Wound |
| The elementals | Echoes |
| The element matter | quintessence; "spill" on the street, "spilling" for the hunt |
| Per element | cinderglass (Fire), tideglass (Water), rimeheart (Ice), stormglass (Lightning), lodestone (Earth), galesilk (Air), aether (Arcane), nightglass (Dark) |
| The warbands | gleaners |
| The sectors | Cindergate, the Drowned Quarter, Frostmarket, Spirewatch, the Quarry Ward, the Heights, the Collegium, Gloamside (table above) |

## Echo art brief

An Echo is a citizen remade in one element, still roughly human-shaped and carrying traces of who
they were (an apron, a guard's helmet, a lamplighter's pole). The weak kind is an ordinary citizen;
the strong kind is bigger and more monstrous, someone who was powerful or near the Wound. Battle
sprites in the same format as the character stills: full body, facing right, feet on the bottom
edge, about 512 × 768 for the weak kind (taller for the strong kind), detailed pixel art like
`sprites/eldrin.png` and `sprites/gretch.png`.
