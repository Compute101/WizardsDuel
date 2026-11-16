# The World — design

The long-term plan for turning Explore mode into a large world to explore, in the spirit of
Baldur's Gate: countries, cities, towns and villages, with wizards stationed around the world.
You meet them, they start stories, and some join your party. Battles use the existing duel
screen. Nothing here is built yet beyond Hollowmere (see "Explore mode" in `CLAUDE.md`).

Status: **vision and names agreed; steps 1, 3, 4 and 6 built; step 2 has all eight outer rings (inner rings next); interiors built; Wrenford, the University town and tutorial, built.**

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
   sides of houses face the right way), squares, then hand-placed landmarks. *Started:*
   `tools/mapgen/city.js` and Cindergate's outer ring (`tools/mapgen/cindergate.js`), built from
   burnt recolours of the existing art. *All eight outer rings done* (`tools/mapgen/sector.js`), joined in a
   ring along Wallside in the wheel's order, each from recolours of the existing art plus its own
   weather. Next: the inner rings beyond each sector's north barrier, and sector-specific art
   (ice spires, floating rubble, rock spires, drowned streets) where recolours fall short. *Done:*
   each sector now has its own pieces from four sheets (`tools/mapgen/own.js`).
3. **Elementals on the map:** roaming, battle on contact, loot, respawn. *Done for Cindergate* (see
   "Echoes" in `CLAUDE.md`); balancing the Echo numbers against created wizards waits for step 7.
4. **Inventory and save game**, per profile. *Done:* one Explore save per profile (Guest too), the satchel (pack, companions, journal with lore to reread), Start over, and a Corvanthe section on the profile page. What quintessence buys is still deferred.
5. **Characters, dialogue and quests:** wizards in places, conversations, quest state.
6. **Warbands.** *Done:* 17 named crews (`js/explore_bands.js`) walk the streets, hunt Echoes for spill, take tolls or attack, and can be robbed or rob you; the halberdier joins the soldiers and archers. Talking, trading and hiring them waits for step 5.
7. **Character creation and the party** (needs the 6-seat battle work) can start any time after 1. *Started:* the look (see "Character creation" below); the magic (a starting element's spells, the barred opposite, growth) and the party come next.

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

## Wrenford, the University town

Far west of Corvanthe (as far as two English cities apart), on the river Wren: the new University,
founded by the scholars of Corvanthe who weren't in the city on the day. As if Oxford had blown up
and its survivors had founded the next university somewhere quiet; Oxford-coded throughout (the
High, Carfax, Broad Street, quads behind gate towers, Bulldogs and Proctors, the Meadow and punts).
It is not ruined, and it is chastened: the Statutes of Caution (no working larger than its maker,
none without a witness, none that can't be undone, none in the street, no Word not understood; "VI.
Don't be clever" in pencil), a memorial to Magister Orrin (the one councillor who voted against the
Word), All Absent College (Fellows who keep the work of the lost), a bell rung nightly for the dead.

It is the safe zone and the giant tutorial: a new game starts here, the dons (roster wizards) teach
the basics through the Matriculation quest, and later it is where you make spells (a workshop at
Lantern College, not built yet). Built: see "Wrenford" in `CLAUDE.md`. Next: more quests and
colourful characters, the spell workshop, and a road map between Wrenford and Hollowmere.

## Wrenford's people

About half of Wrenford is roster wizards; the rest are its own people, who stay there so the town
feels the same each time you come back. Roster wizards here follow one of two threads.

| Person | Who | Thread |
|---|---|---|
| The Head Porter | local (an old Wardgate soldier) | stays |
| The Bulldogs | local (the Proctors' constables) | stay |
| Dr Penhallow, Senior Tutor | local (invented) | stays; runs Matriculation, later the spell workshop |
| Mr Quill, Keeper of the Library | local (invented) | stays |
| Canon Marrow, Chaplain | local (invented) | stays; heals |
| Widow Coyle, licensed dealer | local (invented) | stays; buys spill, sells potions |
| Weizan, Master of the Schools | roster | **field trip**: stays, joins you on a University quest (a Schools party walking the Corvanthe Road) |
| Fizzwick, Master of the Laboratory | roster | **field trip**: stays, joins you on a University quest (collecting samples in Cindergate) |
| Aurelia, doctoral student | roster | **met at uni**: met again later, further east (her reading says so) |
| Ponder, third-year student | roster | **met at uni**: met again later elsewhere |

Still to do: their own art for the four invented dons (for now, recolours of Eldrin's old sprite and a female wizard in the same style: Dr Penhallow in a black gown and Widow Coyle in bottle green on the female figure, Mr Quill in russet and Canon Marrow in crimson on Eldrin's; `tools/make_folk_sprites.py`); the field
trip quests (the party work, step 7, lets these two fight beside you); the later meetings, which can
check `ExploreFolk.metAtUni(key)` to say "we met at uni"; and more townsfolk, not yet invented
(students, a rival, the landlady of the Wren's Nest, the Proctors themselves).

## The Hollow

The river of Hollowmere rises north of Corvanthe and runs through the city: in under the harbour wall
in the Drowned Quarter, through the Wound, and out of Cindergate boiling, then south-west to
Hollowmere. That is why Hollowmere's folk say it runs the other way at night. Only those two sectors
(opposites, Water and Fire) carry it; the inner rings will carry it on to the Wound.

## Interiors

Houses can be entered; each room is generated from its seed and holds one encounter, rolled by how
near the Wound it is: nothing, treasure, spill, Echoes, a rival gleaner crew (sometimes led by a
wizard; they always fight), or wounded gleaners who won't fight (one may join you, one may ask you to
fetch help from the safe house). Lore books, short stories, turn up anywhere. Fixed places: the
Gleaners' Rest safe house (Cindergate), the Drowned Crow (Hollowmere), the Collegium Library, and the
homes of named Echoes you can talk and trade with (Wenna the Baker in Cindergate, the Lamplighter in
Gloamside). Built (see "Interiors" in `CLAUDE.md`); floors, walls, furniture and loot art in; the
character art is still to come: gleaner adventurers, wounded gleaners, the safe-house keeper, a
trader, and the named Echoes (sheets 5–10 of the interior brief).

## Character creation

Built so far (`js/explore_hero.js`): a new game asks who you are. Name, man or woman, young / middle-aged
/ old (humans only for now), a figure, robes (10 colours), trim (8), hair (7), skin (7 tones) and an element, whose colour
your magic takes. The look is a recolour of a base figure, done in the browser. A new wizard fights with
the plain wheel and the Actions; their element's first spells, the barred opposite and levelling up are
the next part of step 7.

### Base figures (the art brief, delivered)

All twelve are in: eleven from the brief below plus the old witch (`tools/cut_hero_figures.py`).

Twelve figures, two for each sex and age, so the Figure choice has something to choose between:

| Slot | Figure 1 | Figure 2 |
|---|---|---|
| Young man | slim, clean-shaven, short hair, pointed hat | broader, different skin tone, hair tied back, hood instead of a hat |
| Young woman | long loose hair, pointed hat | darker skin, a braid over one shoulder, hood |
| Middle-aged man | short beard, pointed hat | balding, moustache, no hat |
| Middle-aged woman | hair in a bun, wide-brimmed hat | shoulder-length hair, a circlet, no hat |
| Old man | long beard, pointed hat (a human, not Eldrin's elf) | short beard, stooped, hood |
| Old woman | (have: the old witch) | hunched, shawl over the head, walking stick |

The game recolours three things, so they must be painted in **key colours**: robes and hat in purple
(only), the magic in blue (only), and hair and beard in silver-grey (only), even on the young figures.
No other purple, blue or grey anywhere on them. The trim must be gold (it is recoloured too, as gold on the robe), and skin can be any natural tone (it is recoloured inside face and hand boxes set per figure). Put
each file in `sprites/hero/source/` and they get cut, sized and added to `BASES` with their hair and
face boxes.

Prompt for ChatGPT (one figure at a time; attach `sprites/folk/source/old_eldrin.png` and
`old_witch.png` as references):

> Pixel-art full-body wizard sprite in exactly the same style, scale, pose and level of detail as the
> attached two wizards: three-quarter view facing right, holding a gnarled wooden staff in the hand on
> the left of the picture with a small magic flame at its top, the other hand raised with a swirl of
> magic above the palm, feet flat at the bottom of the image. This one is a [YOUNG MAN: slim,
> clean-shaven, short hair, pointed wizard hat]. A human, ordinary proportions. Colour rules, very
> important: the robes, sleeves and hat (or hood) are purple and only purple, in its light and dark
> shades, with gold trim; the magic (staff flame and hand swirl) is bright blue and only blue; the hair
> and any beard are silver-grey and only silver-grey, even though the character is young. Use no other
> purple, blue or grey anywhere. Leather belt and pouches brown, skin natural. Hard pixel edges, no glow
> halo around the figure or the magic. Plain flat pure green (#00FF00) background, nothing else in the
> picture, no text, no shadow on the ground. Portrait image, the figure about 768 pixels tall.

Change the bracketed part for each slot in the table.

### Base figures, round 2 (more variety)

Four figures per slot, so the Figure choice is a real choice; the middle-aged man first (the user
plays one, and had only a bearded man in a hat and a bald man with a moustache). New figures vary
the **head and face**, not the body: same pose, staff hand, robe cut and key colours as round 1.

Use the round 1 prompt above, with two changes:

- Attach two of round 1's figures as the style references instead of the old sprites:
  `sprites/hero/source/mid_man_1.png` and `sprites/hero/source/old_man_2.png` (the hooded one).
- Add this after the colour rules: *A hood, hat, scarf or shawl is part of the robe: purple only.
  Jewellery, circlets, buckles and spectacle frames are gold. No grey metal, no blue gems, no
  coloured headwear.*

Name the files `<slot>_<n>.png`, carrying on from the numbers already used (`old_woman_1` is the
witch, so the old woman's new ones are 3 and 4). Then run `python3 tools/cut_hero_figures.py` and check
`--preview`.

| File | Bracketed part |
|---|---|
| `mid_man_3.png` | MIDDLE-AGED MAN: hood up and shadowing the brow, short full beard, weathered face, a small scar across one cheek |
| `mid_man_4.png` | MIDDLE-AGED MAN: no hat, long hair tied back, a forked beard, sharp features |
| `mid_man_5.png` | MIDDLE-AGED MAN: wide-brimmed wizard hat, a neat goatee, lean face, high cheekbones |
| `mid_man_6.png` | MIDDLE-AGED MAN: stocky and broad-shouldered, no hat, close-cropped hair, a thick full beard, a battle-mage look |
| `young_man_3.png` | YOUNG MAN: no hat, messy curly hair, light stubble, cheerful face |
| `young_man_4.png` | YOUNG MAN: wide-brimmed wizard hat, long straight hair to the shoulders, clean-shaven |
| `young_woman_3.png` | YOUNG WOMAN: no hat, short cropped hair, freckles, determined face |
| `young_woman_4.png` | YOUNG WOMAN: wide-brimmed wizard hat, hair in a high ponytail |
| `mid_woman_3.png` | MIDDLE-AGED WOMAN: hood up, hair in a long braid over the shoulder, stern face |
| `mid_woman_4.png` | MIDDLE-AGED WOMAN: pointed wizard hat, hair in two braids, laugh lines |
| `old_man_3.png` | OLD MAN: bald, no hat, a very long beard to the belt, bushy eyebrows |
| `old_man_4.png` | OLD MAN: wide-brimmed wizard hat, a big drooping moustache, no beard, upright and wiry |
| `old_woman_3.png` | OLD WOMAN: no hat, hair in a bun, small round gold-framed spectacles, kindly face |
| `old_woman_4.png` | OLD WOMAN: pointed wizard hat, long loose hair, tall and upright, sharp-eyed |

**Delivered (round 2):** all fourteen. Twelve are in the game, giving four figures in every slot (the old
witch counts as old woman 1). **Equal for both sexes:** there are never more male figures than female ones, and the user wants it that way. So
`mid_man_5` (wide-brimmed hat, goatee) and `mid_man_6` (stocky battle-mage) wait in
`sprites/hero/source/pending/` (the cutter skips sub-folders) until two more middle-aged women come.
Move them up beside the new women and re-run the cutter. Prompts for the two women:

| File | Bracketed part |
|---|---|
| `mid_woman_5.png` | MIDDLE-AGED WOMAN: no hat, short practical hair swept back, a strong jaw, a battle-mage look, broad-shouldered |
| `mid_woman_6.png` | MIDDLE-AGED WOMAN: wide-brimmed wizard hat, long hair tied in a low knot, a sharp knowing smile |

Old man 4 and old woman 4's hat brims (gold-orange underneath) fooled the skin finder, so their face
and neck boxes are set by hand (`FIX` in `tools/cut_hero_figures.py`).
