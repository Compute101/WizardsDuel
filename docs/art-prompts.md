# Art prompts and placeholders

Two parts: **Placeholders** (art the game is using a stand-in for right now) and **More art** (ideas and house rules for new art).

# Part 1: Placeholders

Every piece of art the game is using a stand-in for, what stands in now, and a ready-to-paste
prompt for ChatGPT (or any image tool) to make the real thing. When a new placeholder goes into the
game, add it here. When the real art arrives, drop the file where the table says, tell Claude, and
strike the row (the code points at the stand-in in one place, named in the "Used by" column).

Prompts that have worked: attach the reference images named, generate **one figure at a time**, and
ask for a **flat pure green (#00FF00) background**, which the cutting tools key out. Keep green off
the figures themselves.

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
| `lect_fire.png` | Dr Ignatius Pyle, Fire lecturer | the lecture list's figure (`sprites/hero/old_man_2.png`) | `PEOPLE.lecturer` in `js/explore_year.js` (one figure stands for all lecturers until theirs arrive) | a stout middle-aged man, bald, no eyebrows, soot smudges on his face, a scorched black academic gown with a singed hem over a red waistcoat, holding long iron tongs with a small flame at their tip, cheerful |
| `lect_water.png` | Miss Perpetua Wells, Water | as above | as above | a tall thin woman in her forties, damp hair plastered flat in a bun, a sea-blue gown dripping at the hem, sleeves rolled up, a punt pole over her shoulder, a small swirl of water above her other palm |
| `lect_air.png` | Professor Halcyon Drift, Air | as above | as above | a lanky old man mid-stride, long white hair and gown swept sideways by wind, loose papers flying from his hand, a pale grey-white waistcoat, a small whirl of wind at his fingertips |
| `lect_earth.png` | Dr Agnes Barrow, Earth | as above | as above | a sturdy middle-aged woman, sun-browned, short practical hair under a wide-brimmed brown field hat, a brown canvas coat with many pockets over a black gown, a geologist's hammer in one hand and a rough stone in the other, dusty boots |
| `lect_lightning.png` | Dr Erasmus Fulmer, Lightning | as above | as above | a wiry young-looking man, wild hair standing straight up on end, round spectacles, a yellow-and-black waistcoat under a black gown, small blue-white sparks crackling between his raised fingers, an eager grin |
| `lect_ice.png` | Professor Ingrid Rime, Ice (also On Wards) | as above | as above | a tall stern woman in her fifties, a big white fur hat and a fur-collared pale blue coat over a black gown, frost on her shoulders, a slim staff tipped with an ice crystal, breath misting |
| `lect_arcane.png` | Dr Oriel Nightingale, Arcane (also On Unmaking) | as above | as above | a slight elderly scholar of no particular age, neat silver hair, a deep violet gown embroidered with tiny stars, half-moon spectacles, an open book in one hand with glowing violet runes floating off its pages |
| `lect_dark.png` | Dr Lavinia Crowe, Dark | as above | as above | a gaunt woman in her sixties, a white streak in black hair, a high-collared black gown, a faint scar over one eye, a hooded shuttered lantern held low giving almost no light, purple shadow curling at her feet, calm and unsettling |
| `examiner.png` | Professor Thorley, Chair of Examiners | `sprites/hero/old_woman_2.png` | `PEOPLE.examiner` | a small, terrifying elderly don, black gown with a scarlet-lined hood, a mortarboard, a fat ledger under one arm and a pen in the other hand, peering over spectacles |
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

The Bulldogs use the halberdier (`sprites/halberdier.png`), which fits; Clemency's Echo in the finale
uses the weak Water Echo (`sprites/echoes/water_weak.png`), which also fits, though a girl-shaped one
in a student's gown would be better (ask with the Echo brief in `docs/world-design.md`).

**Fat Bulldogs** (requested by the user's son): about half the Bulldogs are drawn fat, but for now
that's the halberdier stretched sideways (1.2–1.3×, `n._fat` in `drawNpc` in `js/explore.js`, and
`cfg.spriteWidth` for fighters named "Bulldog …" in `startExploreBattle` in `js/game.js`). Stretching
more than that squashes his head and flattens the halberd. A real fat one has a big belly and a
normal-sized head. Generate it on **black**, not green, as the source for the fighters' cutter
(`sprites/fighters/source/halberdier_fat.png` → `python3 tools/cut_fighters.py`, after adding it to
`CUTS` → `sprites/halberdier_fat.png`). When it arrives, use the sprite instead of the stretch.
Attach `sprites/fighters/source/halberdier.png` as the reference:

> Pixel-art full-body sprite in exactly the same style, scale, pose, colours and level of detail as
> the attached halberdier, the same man's uniform: the same round steel kettle helmet, mail coif and
> sleeves, cream tabard with blue trim, brown leather belt, pouch, gauntlets and boots, holding the
> same halberd the same way. But this guard is **very fat**: a huge round belly pushing the tabard
> out and straining the belt, wide hips, thick legs, broad sloping shoulders, chubby red cheeks and a
> double chin under the coif. His head, helmet and halberd stay the **normal size**; only his body is
> fat. A cheerful, well-fed town watchman, comic but not grotesque. Three-quarter view facing right,
> mid-stride like the reference, feet flat at the bottom of the image. Hard pixel edges, the same
> black outline as the reference. Plain flat pure black background, nothing else in the picture, no
> text, no shadow on the ground. Portrait image, the figure about 768 pixels tall.

---

## 2. Places (tilesets)

**Format:** loose pieces on a flat #101217 background, no labels or dividers, 16 px gaps, the same
scale as the earlier sheets (a floor tile about 100 px). Attach `sprites/ruins/tileset10_source.png`
(floors and walls) and `tileset12_source.png` (special furnishings) as references. Save as
`sprites/ruins/tileset14_source.png`; the cutter (`tools/cut_ruins_tileset.py`) gets a `RECTS14`.

| Sheet | Stands in now | Used by |
|---|---|---|
| The Undercroft: sewers and culverts | the crypt room (stone walls, which have windows, and flagstones) | `TYPES.undercroft` / `undercroft2` in `js/explore_rooms.js` |
| The lecture theatre | the chapel's pews and a lectern | `TYPES.lectures` |

**Sewer sheet prompt:**

> A sprite sheet of top-down pixel-art pieces for an underground sewer and culvert level, in exactly
> the same style, scale and palette as the attached sheets: brick tunnel floor tiles (dry, and wet with
> puddles), a straight water channel tile and its two edges, a channel corner, brick back-wall pieces
> with NO windows (plain, cracked, with a pipe outlet trickling water, with an iron grille), a side-wall
> piece, an iron ladder going up, a round iron drain grate, a narrow plank walkway over the channel,
> stacked smugglers' crates with straw spilling out, an open crate glowing with coloured crystals, a
> chalk ritual circle drawn on the floor, a cluster of candles on the floor, rats (two small poses).
> Loose pieces with 16 pixel gaps on a flat #101217 background, no labels, no dividers, no text.

**Lecture theatre prompt:**

> A sprite sheet of top-down pixel-art furniture for a university lecture theatre, in exactly the same
> style, scale and palette as the attached sheets: a long scorched stone demonstration bench, a raised
> lectern on a step, tiered wooden benches in three lengths (seen from above and slightly in front), a
> large blackboard on an easel covered in glyphs, a straw training dummy on a stand, a burnt straw
> dummy. Loose pieces with 16 pixel gaps on a flat #101217 background, no labels, no dividers, no text.

---

## 3. Other placeholders

- **The winks table** (`js/explore_pub.js`): drawn with CSS (a green felt bar, a dashed cup, a red
  wink). Fine as it is; a pixel-art felt table, cup and counters would be a nice touch.
- **Wenna and the Lamplighter** (Cindergate, Gloamside) use Echo sprites as stand-ins: see "Echo art
  brief" in `docs/world-design.md`.
- **The four invented dons** (Dr Penhallow, Mr Quill, Canon Marrow, Widow Coyle) are recolours of two
  base figures (`tools/make_folk_sprites.py`); their own art would replace them, with the shared people
  prompt above.

---

# Part 2: More art (prompts for image generation)

Written to match the pipelines already in the repo, so the cutting tools work on the results with little or no code change. Attach 1–2 of the existing sheets or sprites as style references every time, which matters more than any wording.

### Status (what's in the game)

**Done:**
- **Corvanthe tilesets (section 2):** sheets 14–23 (`tileset14..23_source.png`). Sheet 14 holds town props for every district (signs, carts, washing lines, wells, notice boards, cats, crows), sheet 15 the Wound (ground edge set, drifting rocks and houses, a big crystal per element), and the rest are one sheet per district. They build the eight inner districts (`tools/mapgen/inner.js`), joined by the Inner Circuit. The Wound's centre map isn't built yet; its sheet is already cut.
- **Staff toppers** (they replace section 3's staves sheet): 20 toppers from five sheets (`sprites/hero/toppers/`, `tools/cut_toppers.py`), the creator's Topper row and staff wood (`STAVES`), with a living glow on the staff (`js/staff_glow.js`). The prompts are in `docs/world-design.md`, "Staff toppers".
- **More hero figures (section 3):** 33 base figures. Bandit mages, rogues and eight Wrenford townsfolk (students, a herbwife, a gleaner, a don, a punt-keeper) are painted from them, so section 4's Wrenford townsfolk are largely covered.

**Still to do:**
- Wenna and the Lamplighter, who still use Echo faces (`NPC_FACE` in `js/explore.js`), plus Old Marda and the wounded gleaners (section 1, items 1–4).
- Arena backdrops: only `library` and `ruins` exist (section 1, item 6).
- Fantasy races as hero figures, and orcs, goblins, golems and other creatures as fighters (section 4).
- The hats sheet and the creator's parchment panel (section 3).
- **Familiars:** owl, cat, toad and raven. The brief and prompts are in `docs/world-design.md`, "Familiars"; they aren't built yet.

### House rules (paste into every prompt)

- **Tilesets** (`tools/cut_ruins_tileset.py`): "Top-down 3/4 view pixel-art game assets, same scale as the attached sheets (a ground tile is about 100 px, a cottage about 220 × 265 px). Loose separate pieces on a flat #101217 background, 16 px gaps between pieces, no labels, no grid lines, no text, no shadows touching other pieces."
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

One sheet per prompt, using the tileset house rules. Each district already has a palette, so ask for the *base colours* below.

- **Cindergate (Fire)**: "slag-heap piles, a cooling-lava channel tile set (straight, corner, end), a smashed smithy with an open furnace glowing, anvil stand, bellows, coal carts, chain hoists, a burnt market stall, a well with a red-hot rim, scorched banners."
- **The Heights (Air)**: "broken wind-mill sails, rope bridges seen from above, kite-shrines, weathervanes in three sizes, floating stepping-stones with shadows, a toppled bell-tower top, cloth awnings torn by wind."
- **Spirewatch (Lightning)**: "copper lightning rods, cracked glass-glazed cobble tiles, a fallen spire tip, Tesla-like coil pylons, burnt-out street lamps, rain barrels, scorched cart, a lookout tower with a broken roof."
- **The Collegium (Arcane)**: "floating books, a broken orrery, rune-circle floor decals in three sizes, lecture-hall benches, a shattered portal arch, scroll racks, glowing blue crystal clusters, a statue of a robed scholar missing its head."
- **The Drowned Quarter (Water)**: "half-sunk rowing boats, mooring posts, fishing nets on frames, barnacled statues, flooded-street tiles with ripples (3×3 edge set), a sunken shrine, crab traps, a capsized market barge."
- **The Quarry Ward (Earth)**: "boulders in five sizes, mine-cart rails (straight, curve, crossing), a pit-head winch, stone-cutters' benches, cracked-ground chasm decals, scaffolds, a toppled giant stone head."
- **Frostmarket (Ice)**: "frozen market stalls, icicle-hung lamp posts, snow-drift tiles (3×3 edge set), a frozen fountain, ice-crystal growths in four sizes, sleds, frozen barrels, a fur trader's tent."
- **Gloamside (Dark)**: "black iron gates, mausoleums, gravestones (8 kinds), dead trees, violet-flame lamps, a collapsed catacomb entrance, raven perches, shadow-pool ground decals."
- **The Wound (centre, not built yet)**: "a rift in the ground glowing purple-white (3×3 edge set), floating rubble with shadows, inside-out houses, a broken stair going into the sky, crystallised spill formations in all eight element colours."
- **Street life (all districts)**: "market crates, sacks, hanging signs (tavern, apothecary, smith, bakery, bookshop, temple), washing lines, carts, barrels, a well, benches, a notice board, broken lanterns, cats and crows."

### 3. Character creation: new base figures

Hero figure rules. The sexes must stay even (one of each per prompt). The slots are `young_man`, `young_woman`, `mid_man`, `mid_woman`, `old_man`, `old_woman`. Vary the silhouette, not the colours:

- "…wearing a wide-brimmed pointed hat, hair in a long braid, a satchel of scrolls."
- "…hooded with a short cape, a staff topped by a crystal, a lantern at the hip."
- "…a battle-mage with a breastplate under the robe, a short staff and a buckler."
- "…a scholar with spectacles and a book chained to the belt, no hat, curly hair."
- "…a hedge-witch with a feather-and-bone staff, bare feet, a herb pouch."
- "…an elegant court mage with a high collar and a long sweeping robe."

**Extra creator assets (cheap):**
- "A sheet of 12 pixel-art wizard staves standing upright, side by side, on a flat #101217 background: crooked wood, crystal-topped, bone, iron, a forked branch, a serpent, a crescent, a lantern-staff…" (for a future staff choice).
- "A sheet of 12 pixel-art wizard hats and hoods, front-facing, on a flat green background."
- "A parchment UI panel with an ornate gold-and-leather border, a blank centre, 9-slice friendly" (for the creator's background).

### 4. Fantasy races (hero bases and NPCs)

Make each one with the hero rules (purple / gold / silver / blue), one male and one female, young, middle-aged and old. Ask for **human-range skin tones** (pale to dark brown), because the recolouring tells skin from the rest by its warm hue. Green or grey skin (orcs, goblins, golems) won't recolour until the code learns a per-race skin range, so treat those as NPCs or fighters for now.

- **Elves**: "…a tall slender elf wizard with long pointed ears, almond eyes, an elegant leaf-embroidered robe, a slim silver-wood staff."
- **Dwarves**: "…a short broad dwarf wizard (about 0.72 the height of a human), a huge braided beard with metal rings, a heavy rune-carved staff, stout boots." (The game already has `spriteHeight` for short races.)
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

Every Explore fight now happens in `ruins` (Corvanthe) or `library` (Wrenford). If each place had its own backdrop, fights would feel like they happen where you are. Attach `backgrounds/ruins.jpg` as the style reference and use this base prompt:

> Painterly dark-fantasy battle backdrop in the same style, palette and lighting as the attached image. Wide 16:9, 1920×1080. A flat, open floor across the bottom third where two duelling wizards will stand at the left and right. No people, no creatures, no text. Moody, slightly dim, the most detail in the middle distance, a calm clear area in the centre for spell effects. Setting: [SETTING]

| Name | [SETTING] |
|---|---|
| `wren_schools` | an Oxford-style college duelling court: a sanded square ringed by honey-coloured stone cloisters, a gothic window behind, chalked circles on the sand, a few spectator benches, late afternoon sun |
| `wren_quad` | a moonlit college quadrangle: a neat lawn, gothic stone walls with lit leaded windows, a gate tower with a clock, mist on the grass |
| `wren_undercroft` | a brick sewer culvert under a university town: a channel of dark water, an iron ladder, smugglers' crates with glowing crystals, a chalk ritual circle on the floor, lanterns |
| `wren_orrery` | a vast vaulted chamber under a great brass orrery: planets on arms overhead, crystal lamps, a cracked mosaic floor with a summoning circle, violet light |
| `hollowmere` | a half-ruined riverside market town at dusk: timbered houses, a stone bridge, a gallows and broken cranes in the distance, crows |
| `road` | a lonely old road under a stormy sky: broken milestones, a burnt-out cart, far off on the horizon the great wall of a ruined city with a purple glow above it |
| `cindergate` | a burnt forge street: glowing cracks of lava in the cobbles, charred timber houses, falling embers, an orange sky |
| `heights` | a ruined cliff-top street with houses and stairs floating overhead, torn awnings, pale wind-swept sky |
| `spirewatch` | a ruined street of copper spires in a thunderstorm, rain, lightning rods crackling, glazed cobbles shining |
| `collegium` | a ruined academic plaza: floating books, a broken orrery, blue rune circles on the paving, a headless scholar statue |
| `drowned` | a flooded harbour street, knee-deep water, half-sunk boats, barnacled statues, green-blue gloom |
| `quarry` | a dusty quarry district: cut stone, mine-cart rails, a pit-head winch, a giant toppled stone face |
| `frost` | a frozen market square: icicle-hung stalls, snowdrifts, a frozen fountain, pale blue light |
| `gloam` | a graveyard district: mausoleums, black iron gates, violet-flame lamps, drifting shade |
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

#### 5d. The world map (`maps/world.json` is drawn on a plain parchment)

> A hand-drawn fantasy map on aged parchment, 1000×700 (landscape), sepia ink with faint watercolour washes, no text or labels at all (the game adds them). West: a small university town on a river with a bridge. Centre: a market town where the river bends, rolling farmland and woods. East: a great walled city, round, with a dark star-shaped scar at its centre. A river runs from the north, through the city, down past the market town. Hills and a forest to the north, marsh to the south. A compass rose in a corner, sea monsters and decorative flourishes in the margins.

#### 5e. Greater Elementals (bosses, fighter rules, black background)

The Echoes are the citizens. Each inner district could have a boss at its heart. Make all eight in one style and attach two Echo sprites (`sprites/echoes/fire_strong.png`, `water_strong.png`) as references. They should be about one and a half times the height of the strong Echoes.

> …a towering Greater Elemental, the [ELEMENT] heart of a ruined district, shaped from [MATERIAL], with the faint outline of the citizen it once was, a glowing core in the chest.

Fire: molten slag and forge chains · Air: a whirlwind of roof tiles and torn sails · Lightning: copper rods and a storm cloud for a head · Arcane: floating book pages and orbiting rune rings · Water: harbour water with a sunken ship's figurehead for a face · Earth: cut quarry blocks and mine rails · Ice: icicles and a frozen market awning as a cloak · Dark: grave soil and tattered shrouds with violet eyes.

#### 5e½. Loading screens (`backgrounds/loading_<name>.jpg`)

**Done:** all seven arrived (one 3:4 portrait shape each, 1086×1448) and are in as `backgrounds/loading_<name>.jpg`, shrunk to 600×800 (about 125 KB each, so they show at once). Explore shows one (`showLoading` / `hideLoading`, `loadingPicFor`, `TIPS` in `js/explore.js`) when it opens and when a map isn't cached yet or is slow. The original brief follows.

Before, Explore showed a plain "Loading…" (`#ex-loading` in `js/explore.js`) while a map's sheets loaded, and the game has only the splash (`backgrounds/splash.jpg` / `splash_portrait.jpg`). A few loading paintings, one picked at random (or one per region), with a progress bar and a tip drawn on top by the code. Make each in **two shapes**, landscape 16:9 (1920×1080) and portrait 9:16 (1080×1920) for phones, saved as `loading_<name>.jpg` and `loading_<name>_portrait.jpg`. Attach `backgrounds/splash.jpg` as the style reference.

> A painterly dark-fantasy loading-screen illustration in the same style, palette and lighting as the attached image. [SUBJECT]. Leave the bottom fifth calm and dark (a progress bar and a line of text go there) and the top fifth fairly plain (a title may go there). No text, no logo, no UI, no border. Rich, atmospheric, a single clear focal point.

| Name | [SUBJECT] |
|---|---|
| `duel` | two wizards facing each other across a ruined hall at the moment of casting, one with fire, one with ice, their spells meeting in the centre in a burst of light, glowing glyphs hanging in the air between them |
| `wrenford` | a university town at dawn seen across a river: honey-stone towers and spires, a stone bridge, punts on the water, mist, a wren on a branch in the foreground |
| `corvanthe` | a great ruined city at night seen from the road, its wall broken, houses floating up from a glowing purple-white rift at its heart, small figures of gleaners with lanterns on the road |
| `gleaners` | a band of gleaners in patched leathers prising a glowing crystal from rubble in a burnt street, an Echo made of fire watching from a doorway |
| `wound` | standing on the rim of the Wound looking in: a vast glowing chasm, inside-out houses and stairs drifting in the air, crystals in eight colours, a huge barred gate on the far side |
| `library` | a gothic library at night, a lone young wizard reading by a floating light, books drifting off the shelves, glyphs glowing on the open page |
| `tabletop` | a pub table seen from above at a slant: tiddlywinks, spell cards, a tankard, a candle, two players' hands mid-flick (warm, cosy, lighter in mood) |

The tip under the bar comes from `TIPS` in `js/explore.js` (rules, lore, controls).

#### 5f. Smaller items

- **Clemency's Echo** (the finale, which uses the weak Water Echo now): fighter rules plus the weak Water Echo as a reference: "a young woman student in a short academic gown, made of translucent water, hair drifting as if underwater, sorrowful, reaching out."
- **Rank badges** for the profile page (one sheet, green background, 8 round pixel-art medallions in a row, from plain to grand): Novice (candle), Apprentice (scroll), Initiate (crystal ball), Adept (four-point star), Magus (crescent moon), Sorcerer (flame), Archmage (lightning bolt), Grand Archmage (crown over a staff). They would replace the emoji in `RANKS` in `js/profiles.js`.
- **Tabletop card frame and card back**: "a blank fantasy trading-card frame, portrait 5:7, ornate gold-and-leather border, a parchment text box in the lower half, an empty art window in the upper half, a small round gem socket top-left for the mana cost; and a matching card back with the 12-glyph Arcana circle in gold on deep purple." Use them in the Tabletop tutorial and for printing cards.
- **A winks table** (`js/explore_pub.js`, drawn in CSS now): "top-down pixel art of a green baize pub table on a dark wooden floor, a small brass cup in the middle, a scatter of red, blue, green and yellow tiddlywinks, a tankard ring stain on the edge."
- **Element icons** (one sheet, black background, 8 round pixel-art icons with a thin gold rim: flame, swirl of wind, lightning bolt, violet star rune, wave, rock, snowflake, crescent moon with a skull). They could replace the emoji on the wheel and in the satchel.
- **Spell minigame backdrops** (one each, 9:16 portrait, very dark so the glyphs show up): a forge's fire pit (Inferno), a storm sky (Lightning), a frozen lake from above (Ice), a starfield nebula (Arcane), a cracked quaking stone floor (Rockfall), a purple moon circle (Shadow), a pale windy sky (Gale), a dark rippling pool (Tide), an unravelling violet veil (Dispel). The code draws these now, so they're optional polish.

---

When you're back with usage: drop new tilesets in `sprites/ruins/` as `tileset<N>_source.png`, hero figures in `sprites/hero/source/`, and fighters / NPCs in `sprites/fighters/source/`, then ask Claude to cut them and wire them in.
