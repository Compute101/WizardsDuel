# Art prompts and placeholders

Two parts: **Placeholders** (art the game is using a stand-in for right now) and **More art** (ideas and house rules for new art).
Only what's still wanted is here: when art arrives and is in the game, move its entry (and its prompt, if worth keeping) to
`docs/art-prompts-archive.md`.

# Part 1: Placeholders

Every piece of art the game is using a stand-in for, what stands in now, and a ready-to-paste
prompt for ChatGPT (or any image tool) to make the real thing. When a new placeholder goes into the
game, add it here. When the real art arrives, drop the file where the table says, tell Claude, and
strike the row (the code points at the stand-in in one place, named in the "Used by" column).

**The placeholder registry** (`js/placeholders.js`, used by Gilden so far): each entry names the exact file the
real art goes to. Drop the file there and the game uses it on the next load, with no code to change; a map
piece is used once its sheet is cut and the map rebuilt (`node tools/build_maps.js`). `node tools/placeholders.js
todo` lists what's still standing in; `?placeholders` on the game's URL tags stand-in people on the map in pink.
Also wanted for Gilden's hired mages' battle sprites: `sprites/gilden/gd_hire_<ashcombe|varenne|quarrender>.png`
(facing right, like the roster's stills).

Prompts that have worked: attach the reference images named, generate **one figure at a time**, and
ask for a **flat pure green (#00FF00) background**, which the cutting tools key out. Keep green off
the figures themselves. Each section below opens with its **shared prompt**: section 1 for people,
section 2 for tilesets and battle backdrops.

---

## 1. People (sprites)

**Format:** full body, three-quarter view facing right, feet flat on the bottom edge, about 768 px
tall, pixel art in the house style. Painted in their **final colours** (nothing is recoloured, unlike
the hero base figures). Save as `sprites/folk/source/<file>`; a cutter (green keyed out, cropped,
768 px tall into `sprites/folk/<file>`, like `tools/cut_hero_figures.py`) is written when the first
files arrive.

**Shared prompt** (attach `sprites/folk/source/old_eldrin.png` and `sprites/folk/source/old_witch.png`
as style references; replace `[DESCRIPTION]`):

> Pixel-art full-body sprite in exactly the same style, scale, pose conventions and level of detail as
> the attached two wizards: three-quarter view facing right, feet flat at the bottom of the image. This
> is [DESCRIPTION]. A human, ordinary proportions. Hard pixel edges, no glow halo around the figure.
> Plain flat pure green (#00FF00) background, nothing else in the picture, no text, no shadow on the
> ground. No green anywhere on the figure. Portrait image, the figure about 768 pixels tall.

| File | Who | Stands in now | Used by | [DESCRIPTION] |
|---|---|---|---|---|
| `guide_<name>.png` (eight) | Wrenford's way-pointers: Tull the carter, Dilly Marsh the flower-seller, Nan Pottle the washerwoman, Hob Ferris the lamplighter's boy, Goody Sparrow the baker's wife, Wat Hollis the road-sweeper, Moll Kettle the goose-girl, Ned Pike the cowherd | the strollers' peasants (`sprites/folk/peasant_man_1..4` / `peasant_woman_1..4`), faces `portraits/small/peasant_man.jpg` / `peasant_woman.jpg` | `FOLK.guide_*` in `js/explore_folk.js` (`sprite`, `face`) | one at a time, e.g. a stout old carter in a smock and a straw hat, a straw in his mouth, one hand on a cart-whip; a girl with a basket of violets; a washerwoman with a laundry basket on her hip; a lad with a short ladder over his shoulder; a floury baker's wife in an apron; a road-sweeper with a broom; a goose-girl with a crook; a cowherd with a staff and cap |
| `ostler.png` (and a face crop) | Abel Coppin, the ostler by Wrenford's East Road, who sells you Bramble the mare | the strollers' `sprites/folk/peasant_man_4.png`, face `portraits/small/peasant_man.jpg` | `FOLK.ostler` in `js/explore_folk.js` (`sprite`, `face`) | a wiry ostler in a leather apron and rolled shirtsleeves, straw in his hair, a coil of halter rope over one shoulder and a bridle in his hand; full figure in the same painted style as the townsfolk, standing, facing the viewer |
| `hm_factor.png`, `hm_carter.png`, `hm_pies.png` (and face crops) | Hollowmere's boom-town folk: Master Orme, factor of House Ashcombe of Gilden; Dunnock the ore carter; Bessie Hesketh the pie-seller | the strollers' `sprites/folk/peasant_man_3.png` / `peasant_man_2.png` / `peasant_woman_2.png`, faces `portraits/small/peasant_man.jpg` / `peasant_woman.jpg` | `FOLK.hm_*` in `js/explore_folk.js` (`sprite`, `face`) | one at a time, same painted style as the townsfolk, full figure facing the viewer: a sharp merchant's factor in a good but mud-spattered coat, ledger under his arm, a strongbox at his feet; a burly carter dusted with copper ore, a whip over his shoulder; a broad cheerful pie-seller with a tray of pies on a strap round her neck |
| `hm_smith.png`, `hm_tin.png` | the Anvilfells' dwarves at the market: Torvi Anvilson, an Anvilmoot smith; Grimma, a Coldforge factor | painted from the dwarf hero figures (`look`, so they carry wizards' staves) | `FOLK.hm_smith` / `hm_tin` | stocky dwarves as tall as Durin, no staves: a smith in a leather apron with a hammer and tongs; an old dwarf woman with a ledger and a counting-stick, sitting on a strongbox |
| `bedel.png` | Mr Hobday, the Bedel of the Schools (keeps the lecture list) | `sprites/hero/old_man_3.png` as painted | `PEOPLE.lecturer` in `js/explore_year.js` | an elderly university bedel (usher), a long black gown with silver lace, a black velvet cap, holding a tall silver-topped mace of office and a rolled lecture list, white side-whiskers, dignified and fussy |
| `wil.png` | Wil Ashby, tutorial partner (if you play a woman) | a look painted from the hero creator (`young_man_2`, russet robe) | `ensureChars` in `js/explore_year.js` | a wiry young man about 19, tousled brown hair, freckles, a student's short black commoner's gown thrown over a patched gleaner's leather jerkin and boots, a satchel, a knife at his belt, a cocky grin, fists half-raised |
| `nell.png` | Nell Ashby, tutorial partner (if you play a man) | a look painted from the hero creator (`young_woman_2`, russet robe) | as above | a wiry young woman about 19, cropped brown hair, freckles, a student's short black commoner's gown thrown over a patched gleaner's leather jerkin and boots, a satchel, a knife at her belt, a cocky grin, fists half-raised |
| `ashgrove.png` | Dr Edwin Ashgrove, Sub-Warden of All Absent (the villain) | a look painted from the hero creator (`old_man_1`, ash-grey robe) | as above | a kindly grey-haired man in his sixties, neat beard, a full black doctor's gown with a dove-grey hood, a black mourning band on one sleeve, holding a teacup and saucer, gentle smile, tired eyes |
| `hooded.png` | the hooded figure in Founders' Quad | `sprites/hero/mid_man_2.png` | `PEOPLE.hooded` | a figure in a dark academic gown with the hood pulled up, face in shadow, kneeling with a stick of chalk in one hand, a small sack glittering with crystals beside them |
| `boxer_tolley.png` | Two-Step Tolley | `sprites/soldier.png` | `fighters.json` (`boxer_tolley`, its `sprite` and `face`) | a light, quick bare-knuckle boxer in shirtsleeves and braces, on his toes, fists up, short and wiry, flat cap tucked in his belt |
| `boxer_meg.png` | Mirror Meg | `sprites/soldier.png` | `fighters.json` (`boxer_meg`) | a lean woman bare-knuckle boxer, hair tied back, shirtsleeves and braces, fists up, watchful narrowed eyes |
| `boxer_horace.png` | Horace "the Clinch" Webb | `sprites/soldier.png` | `fighters.json` (`boxer_horace`) | a huge bald bare-knuckle grappler in a vest and braces, arms spread wide ready to grab, broken nose, cheerful |
| `boxer_jem.png` | Gentleman Jem, Champion and Captain of the Fancy | `sprites/soldier.png` | `fighters.json` (`boxer_jem`) and `PEOPLE.fancy` (he stands at the ring) | a tall elegant bare-knuckle boxer, waxed moustache, shirtsleeves rolled, a silk waistcoat, fists up in a classic old-fashioned stance |
| `townie.png` | a townie (Town v Gown brawls) | `sprites/soldier.png` (the brawl, and the townies you fight, are soldier / archer recruits renamed) | `PEOPLE.brawl`; the brawl's foes in `talk` | a burly young carter in a leather apron and rolled sleeves, flat cap, fists up, spoiling for a fight |
| `college_porter.png` | a college porter at a failing gate ward | `sprites/halberdier.png` | `PEOPLE.gateward` | a stout college porter in a bowler hat and a dark coat with brass buttons, both hands pressed against a glowing stone gatepost, looking alarmed |
| `landlady.png` | Mrs Dorcas Pegg, landlady of the Wren's Nest | `sprites/hero/mid_woman_1.png` | `PEOPLE.landlady` | a broad rosy-cheeked woman, apron over a brown dress, sleeves rolled, a tankard in each hand (no gown) |
| `squop.png` | Old Bartholomew "Squop" Finch, winks player | `sprites/hero/old_man_1.png` | `PEOPLE.squop` | a little old man in a shabby tweed coat and flat cap, a small cup and a handful of coloured tiddlywinks counters (no gown) |
| `proctor.png` | Mr Ravel, the Senior Proctor (not in the game yet) | none | planned | a severe thin man, black gown with velvet bands, white bands at the throat, a tall black hat, a short black staff of office |
| `sprites/gilden/<id>.png` + `portraits/small/<id>.jpg` (placeholders `gd_charter`, `gd_ashcombe`, `gd_varenne`, `gd_quarrender`, `gd_harbour`, `gd_fishwife`) | Gilden's people (`docs/gilden-design.md`): Ezra Pollock, Master of the Charterhouse; Dame Constance Ashcombe; Gaspard Varenne; Perpetua Quarrender; Captain Morwen Hask, the Harbourmaster; Mag Thrush, a fishwife | painted from the hero figures (`look` in `PEOPLE`, so they carry wizards' staves) | `PEOPLE.gd_*` in `js/explore_gilden.js` (`sprite`, `face`) | one at a time, the townsfolk's painted style, full figure facing the viewer, no staves: a grey old clerk with a huge ledger chained to his wrist; a small upright old lady in red silk and copper-dusted gloves, a flame-and-hammer brooch; a sleek merchant prince in midnight blue with a silver anchor at his throat; a sharp woman banker in violet with an abacus; a weathered woman harbourmaster in a sea-coat with a spyglass and a slate; a broad fishwife in an apron, gutting knife in hand, a basket of herring |
| `sprites/gilden/gd_sky.png` + `portraits/small/gd_sky.jpg` (placeholder `gd_sky`) | Tibbet Quillaby, the gnome at Gilden's Sky Office | a dwarf hero figure (`dwarf_young_man_1`) painted violet and drawn at 0.6 (`scale` on the map NPC) | `PEOPLE.gd_sky` in `js/explore_gilden.js`; the NPC in `tools/mapgen/gilden.js` | a gnome of Gimbaldry, about half a man's height, big nose, brass goggles pushed up on his forehead, a pencil behind each ear, a neat violet clerk's coat with brass buttons, holding a ticket punch and a bundle of airship tickets |
| `sprites/gd_magus_<house>.png` + `portraits/small/gd_magus_<house>.jpg` (placeholders `gd_magus_quarrender`, `gd_magus_varenne`, `gd_magus_ashcombe`) | Gilden's house wizards (battle sprites, facing right, feet on the bottom edge, like the roster's stills) | the gnome: a dwarf hero figure painted teal and drawn small; the sea-witch: the forest's Varg; the forge mage: the forest's big orc | `MAGI` in `js/explore_gilden.js` | one at a time, the roster's painted style, full figure facing right: a small gnome air mage of Gimbaldry, about half a man's height, big nose, brass flight goggles, a teal flight-coat with brass buttons, wind swirling round a short brass-capped staff, tiny propeller charms; a grey-furred Varg (wolf-headed) sea-witch and pirate, a salt-stained sea-coat hung with fish-bones and silver toll-coins, a wet rope at her belt, a driftwood staff dripping seawater; a huge green-grey orc forge mage, a warrior wizard, scorched leather apron over mail, massive arms, fists glowing orange-hot like iron from the forge, a short heavy hammer-staff on his back |
| `sprites/gilden/gd_guard1.png` / `gd_guard2.png` + faces (placeholders `gd_guard1`, `gd_guard2`) | Thessaly's two hired bodyguards in Gilden (a Varg and a woman) | the halberdier (`sprites/halberdier.png`) | `PEOPLE.gd_guard1` / `gd_guard2` in `js/explore_gilden.js` (`fighter`) | sellswords in gold sashes: a big grey Varg (wolfman) in a breastplate with a halberd grounded; a hard-faced woman in a battered breastplate, a halberd over her shoulder |

The Bulldogs use the halberdier (`sprites/halberdier.png`), which fits; Clemency's Echo in the finale
uses the weak Water Echo (`sprites/echoes/water_weak.png`), which also fits, though a girl-shaped one
in a student's gown would be better (ask with the Echo brief in `docs/world-design.md`).

The fat Bulldogs, the seated students, the lecturers and the examiner are done (prompts in the archive).

---

## 2. Places (tilesets and backdrops)

### Tilesets

**Format:** loose pieces on one sheet, cut by `tools/cut_ruins_tileset.py`. Save as
`sprites/ruins/tileset<N>_source.png` (the next free number), then ask Claude to cut it and place the pieces.

**Shared tileset prompt** (attach two of the earlier sheets as style references, e.g.
`sprites/ruins/tileset_source.png` and `tileset4_source.png`; replace `[PIECES]`):

> Top-down 3/4 view pixel-art game assets in exactly the same style, palette and scale as the attached
> sheets (a ground tile is about 100 px, a cottage about 220 × 265 px). Loose separate pieces on a flat
> #101217 background, 16 px gaps between pieces, no labels, no grid lines, no dividers, no text, no
> shadows touching other pieces. The pieces: [PIECES]

| Sheet / pieces | What | Stands in now | Used by | [PIECES] |
|---|---|---|---|---|
| market stalls (a sheet of their own) | the stalls of Hollowmere's market | carts, crates, sacks and barrels from sheet 14 stand in (`tools/mapgen/hollowmere.js`, the boom-town block) | add the pieces to the cutter, then place them in the plaza | four or five market stalls seen from above at a slight angle, no snow: striped canvas awnings on wooden frames, one with bolts of cloth, one with lamps and rope, one with pies and loaves, one with tools and crowbars, one with charms and bottles |
| `sprites/ruins/tileset29_source.png`, pieces `airship`, `palace`, `warehouse` (placeholders `piece_airship`, `piece_palace`, `piece_warehouse`) | Gilden's Skyport and Hill | the Mooring Mast stands empty (`spireTower`); the palaces are a townhouse, the hall and a damaged house; warehouses are ordinary houses | `tools/mapgen/gilden.js` | a gnome airship moored nose-first at a lattice mast (a gas-bag with brass ribs, a wooden gondola, propellers); a grand merchant palace with a gilt dome and a balcony; a tall dockside warehouse with a hoist beam and loading doors; a merchant ship's stern at a quay |

Every earlier sheet has arrived (the Undercroft, the lecture theatre, Elfhome; prompts in the archive). Wrenford's own
sheet is still wanted: its piece list is in Part 2, 5b.

### Battle backdrops

**Format:** a painting, 1672×941 or 1920×1080 JPEG, saved as `backgrounds/<name>.jpg`.

**Shared backdrop prompt** (attach `backgrounds/ruins.jpg` as the style reference; replace `[SETTING]`):

> Painterly dark-fantasy battle backdrop in the same style, palette and lighting as the attached image.
> Wide 16:9. A flat, open floor across the bottom third where two duelling wizards will stand at the left
> and right. No people, no creatures, no text. Moody, slightly dim, the most detail in the middle
> distance, a calm clear area in the centre for spell effects. Setting: [SETTING]

| File | What | Stands in now | Used by | [SETTING] |
|---|---|---|---|---|
| `backgrounds/gilden.jpg` (1672×941; placeholder `arena_gilden`) | Gilden's battle backdrop (the bravos in town) | Hollowmere's painting (`ARENA_MAPS.gilden` in `js/explore.js`) | `ARENA_MAPS.gilden` | a rich harbour city's quay at dusk: marble warehouses and counting-houses, cranes, a forest of masts, a gilt dome on the hill behind and a gnome airship moored at a lattice mast; cobbles in the foreground for the fighters to stand on |

Also wanted: `wound` (Part 2, 5a) and the duel wizards' own grounds (Part 2, section 1, item 6).

---

## 3. Other placeholders

- **The winks table** (`js/explore_pub.js`): drawn with CSS (a green felt bar, a dashed cup, a red
  wink). Fine as it is; a pixel-art felt table, cup and counters would be a nice touch.
- **Wenna and the Lamplighter** (Cindergate, Gloamside) use Echo sprites as stand-ins: see "Echo art
  brief" in `docs/world-design.md`.
- **The Moriquende:** all its art is in (hex tiles, map figures, battle fighters, backdrop, Elfhome; see the archive).
- **The four invented dons** (Dr Penhallow, Mr Quill, Canon Marrow, Widow Coyle) are recolours of two
  base figures (`tools/make_folk_sprites.py`); their own art would replace them, with the shared people
  prompt above.

---

# Part 2: More art (prompts for image generation)

Written to match the pipelines already in the repo, so the cutting tools work on the results with little or no code change. Attach 1–2 of the existing sheets or sprites as style references every time, which matters more than any wording.

### Status (what's in the game)

What's done is in `docs/art-prompts-archive.md`. **Still to do:**
- Wenna and the Lamplighter, who still use Echo faces (`NPC_FACE` in `js/explore.js`), plus Old Marda and the wounded gleaners (section 1, items 1–4).
- Duel arena backdrops per wizard: only `library`, `ruins` and `forest` are used by the duel characters (section 1, item 6). Explore's places are done but for `wound` (5a).
- Fantasy races other than elves and dwarves as hero figures, and more creatures as fighters (section 4).
- The hats sheet and the creator's parchment panel (section 3).
- **Familiars:** owl, cat, toad and raven. The brief and prompts are in `docs/world-design.md`, "Familiars"; they aren't built yet.

### House rules (paste into every prompt)

- **Tilesets** (`tools/cut_ruins_tileset.py`; the full shared prompt is in Part 1, section 2): "Top-down 3/4 view pixel-art game assets, same scale as the attached sheets (a ground tile is about 100 px, a cottage about 220 × 265 px). Loose separate pieces on a flat #101217 background, 16 px gaps between pieces, no labels, no grid lines, no text, no shadows touching other pieces."
- **Hero base figures** (`tools/cut_hero_figures.py`, drop them in `sprites/hero/source/<slot>_<n>.png`): "Full-body pixel-art fantasy wizard, standing, facing right, 3/4 view, feet at the bottom, on a flat pure green (#00FF00) background. **Purple robe and hat, gold trim, silver-grey hair, blue magic glow** in one hand, a wooden staff in the other. Same style and proportions as the attached figure." The recolouring needs those exact colours: purple becomes the robe colour, blue the element, silver the hair and gold the trim.
- **Fighters / creatures** (`tools/cut_fighters.py`): "Full-body pixel-art, facing right, feet at the bottom edge, on a flat black background, no glow touching the edge, about 768 px tall."

---

### 1. Cheap, high-value first (one image each)

1. **Wenna the baker** (she currently uses an Echo sprite as a stand-in): fighter rules + "a stout middle-aged woman baker in a soot-stained apron, flour on her arms, holding a long bread peel, warm ember-lit, living in a burnt fire-district."
2. **The Lamplighter** (also a stand-in): fighter rules + "a thin old lamplighter in a dark hooded coat, carrying a long brass lamp-pole with a pale violet flame, a lantern at the belt."
3. **Old Marda** (Gleaners' Rest landlady): fighter rules + "a tough grey-haired tavern keeper, sleeves rolled, a ladle in one hand, a scar across the cheek."
4. **Wounded gleaner**: fighter rules + "a scavenger in patched leathers and a satchel of glowing crystals, bandaged arm, kneeling and leaning on a crowbar."
5. **Rival gleaner captain** (warband leader): fighter rules + "a mercenary captain in a dyed tabard, sword on the shoulder, a pouch of glowing quintessence crystals at the belt."
6. **Arena backdrops** (`backgrounds/<name>.jpg`, one per wizard is the plan): "Painterly dark-fantasy battle backdrop, wide 16:9, a flat floor across the bottom third, no figures, moody lighting." Then add the setting: *a dwarven forge hall* (Durin), *a frozen fjord shrine* (Skadi), *a sunken sea temple with kelp* (Nerissa), *a necromancer's crypt with green candles* (Valdris / Daveron), *a cluttered gnome alchemy lab* (Fizzwick), *a noble's marble ballroom* (Thessaly).

### 2. Corvanthe: more unique tileset art

Done (sheets 6–9 and 14–23; prompts in the archive). Still wanted: the Wound's centre map isn't built, though its sheet (15) is cut.

### 3. Character creation

The base figures and staves are done (33 figures, 20 staff toppers; prompts in the archive). Still wanted:
- "A sheet of 12 pixel-art wizard hats and hoods, front-facing, on a flat green background."
- "A parchment UI panel with an ornate gold-and-leather border, a blank centre, 9-slice friendly" (for the creator's background).


### 4. Fantasy races (hero bases and NPCs)

Make each one with the hero rules (purple / gold / silver / blue), one male and one female, young, middle-aged and old. Ask for **human-range skin tones** (pale to dark brown), because the recolouring tells skin from the rest by its warm hue. Green or grey skin (orcs, goblins, golems) won't recolour until the code learns a per-race skin range, so treat those as NPCs or fighters for now.

- **Gnomes, in Fizzwick's style** (attach `sprites/fizzwick.png`): "…a tiny gnome tinker-wizard, big nose, wild hair, goggles on the hat, potion bottles on a bandolier, a staff with a brass gadget on top."
- **Halflings**: "…a small barefoot halfling hedge-mage with curly hair, a pipe, a walking-stick staff and a pack."
- **Tieflings / fae-touched** (keep the skin human-range): "…small curled horns, a long tail, gold eyes."

**NPC and fighter races** (fighter rules, black background):
- **Orcs**: "a hulking green-skinned orc warrior with a cleaver and spiked pauldrons" / "an orc shaman with bone fetishes and a smoking skull staff" / "an orc archer with a crude longbow."
- **Goblins**: "a skinny goblin scavenger with a sack of stolen crystals and a rusty knife" / "a goblin firebomber holding a lit bomb" / "a goblin boss riding a giant rat."
- **Golems** (if "golly" meant golem): "a hulking stone golem, rune-carved, glowing cracks in the element colour" (make 8: fire, air, lightning, arcane, water, earth, ice, dark) / "a small clockwork brass golem servant."
- **Ratmen** (like Zakkit): "a hunched ratman thief with a hooked dagger" / "a ratman plague-priest with a censer."
- **Corvanthe creatures**: "a spill-mutated stray dog with glowing crystal growths", "a giant crow pecking at crystals", "a lurking sewer eel-thing rising from a grate", "a wandering animated suit of armour (an Echo of a dead guard)", "a will-o'-wisp in each element colour", "a spill-drunk troll sleeping under a bridge", "a ghostly drowned harbourmaster (Drowned Quarter)", "a forge-imp made of embers (Cindergate)".
- **Townsfolk for Wrenford** (fighter rules, a calm pose): "a university porter in a bowler hat", "a student in a gown with an armful of books", "a market trader", "a punt-poler", "a college cook", "a street urchin", "a city watchman with a lantern".


### 5. More prompts (round 2)

Nothing in this section is in the game yet. Use the house rules above, plus the extra notes on each item.

#### 5a. Arena backdrops for Explore fights (`backgrounds/<name>.jpg`)

Every place's backdrop is done but one (the done ones and their settings are in the archive). Still to make: `wound` (for the Wound itself, once it's built). When one arrives, add it to `ARENA_MAPS`. Attach `backgrounds/ruins.jpg` as the style reference and use this base prompt:

> Painterly dark-fantasy battle backdrop in the same style, palette and lighting as the attached image. Wide 16:9, 1920×1080. A flat, open floor across the bottom third where two duelling wizards will stand at the left and right. No people, no creatures, no text. Moody, slightly dim, the most detail in the middle distance, a calm clear area in the centre for spell effects. Setting: [SETTING]

| Name | [SETTING] |
|---|---|
| `wound` | the edge of the Wound: a glowing purple-white rift, floating rubble and inside-out houses, crystal spill in all eight element colours, a huge barred gate (the Last Gate) far behind |

#### 5b. Wrenford's own tileset (one sheet, tileset house rules)

Wrenford is built from Hollowmere's houses at the moment. A sheet of its own would make it look like a university town. Attach `tileset4_source.png` and `tileset16_source.png` as references.

> …pieces for a prosperous Oxford-style university town, honey-coloured limestone, slate and lead roofs, nothing ruined: a college gate tower with an arched gateway and a clock (front view), a stretch of college wall with a small door, a cloister walk segment, a domed round library (like a rotunda), a gothic chapel front with a tall window, a quad lawn tile with a 3×3 stone-kerb edge set, a stone bust on a plinth, a sundial, a wrought-iron lamp post, a bench, a bookseller's stall, a covered-market arcade front, glasshouse frames for a physic garden, raised herb beds, a punt moored at a wooden landing stage, a boathouse, a notice board covered in lecture lists, a pile of books on a handcart.

#### 5c. The introduction scroll's drawings (replacing the SVG line art)

`js/explore_intro.js` draws its five illustrations as SVG code (`INK`) "until drawn art arrives". These would replace them. Make them one at a time, landscape 3:2, and save as `sprites/intro/<name>.png`.

> A sepia ink illustration on aged parchment, in the style of a 17th-century woodcut or an old natural-history engraving: fine hatched lines, a little ink wash, no colour except brown ink, a soft vignette into the parchment at the edges. No text, no border. Subject: [SUBJECT]

- `wound`: a great walled city seen from a hill, a jagged rift glowing through its centre, houses lifting into the air above it
- `scales`: a merchant's balance with a small glowing crystal far outweighing a heap of gold coins
- `finder`: a hooded scholar with a lantern at a cottage door at night, a child peering out
- `wrenford`: a university town's gate tower and a stone bridge over a river, a small wren on the parapet in the foreground
- `council`: seven robed mages around a round table, the one standing at the head with an open book, light bursting from its pages

#### 5e. Greater Elementals (bosses, fighter rules, black background)

The Echoes are the citizens. Each inner district could have a boss at its heart. Make all eight in one style and attach two Echo sprites (`sprites/echoes/fire_strong.png`, `water_strong.png`) as references. They should be about one and a half times the height of the strong Echoes.

> …a towering Greater Elemental, the [ELEMENT] heart of a ruined district, shaped from [MATERIAL], with the faint outline of the citizen it once was, a glowing core in the chest.

Fire: molten slag and forge chains · Air: a whirlwind of roof tiles and torn sails · Lightning: copper rods and a storm cloud for a head · Arcane: floating book pages and orbiting rune rings · Water: harbour water with a sunken ship's figurehead for a face · Earth: cut quarry blocks and mine rails · Ice: icicles and a frozen market awning as a cloak · Dark: grave soil and tattered shrouds with violet eyes.

#### 5f. Smaller items

- **Clemency's Echo** (the finale, which uses the weak Water Echo now): fighter rules plus the weak Water Echo as a reference: "a young woman student in a short academic gown, made of translucent water, hair drifting as if underwater, sorrowful, reaching out."
- **Rank badges** for the profile page (one sheet, green background, 8 round pixel-art medallions in a row, from plain to grand): Novice (candle), Apprentice (scroll), Initiate (crystal ball), Adept (four-point star), Magus (crescent moon), Sorcerer (flame), Archmage (lightning bolt), Grand Archmage (crown over a staff). They would replace the emoji in `RANKS` in `js/profiles.js`.
- **Tabletop card frame and card back**: "a blank fantasy trading-card frame, portrait 5:7, ornate gold-and-leather border, a parchment text box in the lower half, an empty art window in the upper half, a small round gem socket top-left for the mana cost; and a matching card back with the 12-glyph Arcana circle in gold on deep purple." Use them in the Tabletop tutorial and for printing cards.
- **A winks table** (`js/explore_pub.js`, drawn in CSS now): "top-down pixel art of a green baize pub table on a dark wooden floor, a small brass cup in the middle, a scatter of red, blue, green and yellow tiddlywinks, a tankard ring stain on the edge."
- **Element icons** (one sheet, black background, 8 round pixel-art icons with a thin gold rim: flame, swirl of wind, lightning bolt, violet star rune, wave, rock, snowflake, crescent moon with a skull). They could replace the emoji on the wheel and in the satchel.
- **Spell minigame backdrops** (one each, 9:16 portrait, very dark so the glyphs show up): a forge's fire pit (Inferno), a storm sky (Lightning), a frozen lake from above (Ice), a starfield nebula (Arcane), a cracked quaking stone floor (Rockfall), a purple moon circle (Shadow), a pale windy sky (Gale), a dark rippling pool (Tide), an unravelling violet veil (Dispel). The code draws these now, so they're optional polish.

---

When you're back with usage: drop new tilesets in `sprites/ruins/` as `tileset<N>_source.png`, hero figures in `sprites/hero/source/`, and fighters / NPCs in `sprites/fighters/source/`, then ask Claude to cut them and wire them in.
