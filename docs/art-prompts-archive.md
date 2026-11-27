# Art prompts: archive

Art that has arrived and is in the game, moved out of `docs/art-prompts.md` so that file only lists what's
still wanted. The prompts are kept here because they worked: reuse them when you want more of the same
(another variant, another sheet in the same style). House rules and shared prompts are in `docs/art-prompts.md`.

---

## People (sprites), done

| File | Who | Stands in now | Used by | [DESCRIPTION] |
|---|---|---|---|---|
| ~~`lect_fire.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Ignatius Pyle, Fire lecturer | | |
| ~~`lect_water.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Miss Perpetua Wells, Water | | |
| ~~`lect_air.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Halcyon Drift, Air | | |
| ~~`lect_earth.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Agnes Barrow, Earth | | |
| ~~`lect_lightning.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Erasmus Fulmer, Lightning | | |
| ~~`lect_ice.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Ingrid Rime, Ice (also On Wards) | | |
| ~~`lect_arcane.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Oriel Nightingale, Arcane (also On Unmaking) | | |
| ~~`lect_dark.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Lavinia Crowe, Dark | | |
| ~~`examiner.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Thorley, Chair of Examiners | | |
| ~~`student_seated_1.png` … `_8.png`~~ | ~~the students at a lecture~~ | **Done:** the art arrived (`sprites/folk/source/student_seated_<n>.png`, cut by `python3 tools/cut_students.py` with two gown recolours each) | `STUDENTS` / `drawStudent` in `js/explore_lecture.js` | the prompt below, kept for more |

**Seated students** (a different pose from the other people, so a prompt of its own; attach the same two
references, one student per image, and ask for four men and four women, varied in hair, skin and gown
colour, mostly black commoners' gowns):

> Pixel-art sprite in exactly the same style, scale and level of detail as the attached two wizards: a
> university student of about 19 SITTING on a bench we can't see, seen in three-quarter view facing right
> as if watching a lecture below and to the right. Upper body to mid-thigh only, the bottom edge of the
> image cuts across the lap. A short black student's gown over [CLOTHES], a quill in the right hand and a
> small open notebook on the lap, a short student's staff leaning on the left shoulder. [HAIR AND FACE].
> Hard pixel edges, no glow halo. Plain flat pure green (#00FF00) background, nothing else in the
> picture, no text. No green anywhere on the figure. The figure about 460 pixels tall (the same scale as
> the references' upper bodies).

A second pose of each (writing, head down) would let them take notes for real; the code bobs them now.

**Fat Bulldogs** (requested by the user's son): ~~done~~, the art arrived. About half the Bulldogs,
picked at random, are the fat halberdier (`sprites/halberdier_fat.png`, cut by `tools/cut_fighters.py`
from `sprites/fighters/source/halberdier_fat.png`, HUD face `portraits/small/halberdier_fat.jpg`):
`fatBulldog` / `FAT_BULLDOG` in `js/explore.js` on the map, and in `startExploreBattle` in `js/game.js`
(a halberdier named "Bulldog …"; a soldier Bulldog such as Hobbes is stretched at most 1.3× instead).
The prompt that made it, for more variants. Attach `sprites/fighters/source/halberdier.png` as the reference:

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

## The Moriquende's battle figures

**Done:** all seven arrived (`sprites/fighters/source/<key>.png`), cut by `python3 tools/cut_fighters.py`
into `sprites/forest/<key>.png` with hand-set faces (`FACES`). The prompts are kept below for more.

The creatures and elves you fight beside in the forest year (`fighters.json`; `docs/forest-design.md`).
Until these arrive the game uses recolours of other art (`python3 tools/make_forest_placeholders.py`:
Gretch for goblins and orcs, Gnash greyed for the Varg, the Archer in green for the Talons), and the
recolours never overwrite real art once it's there.

**Format:** like the soldier, archer and knight: full body, three-quarter view **facing right**, feet
flat on the bottom edge, on a **flat pure black background** (not green: these go through the fighter
cutter, which keys out black). Painted in their final colours. **Every figure fills the height of its
picture**, the little goblin as much as the warchief: the game sets their sizes (goblin 0.7, Varg 1.05,
alpha 1.15, orc 1.0, brute 1.05, warchief 1.2 of a wizard's height, `spriteHeight` in `fighters.json`).
Keep weapons, banners and horns inside the picture.

**Shared prompt** (attach `sprites/fighters/source/soldier.png` and `sprites/fighters/source/knight.png`
as style references; replace `[DESCRIPTION]`):

> Pixel-art full-body battle sprite in exactly the same style, scale, pose conventions and level of
> detail as the attached two figures: three-quarter view facing right, a ready fighting stance, feet
> flat at the bottom of the image. This is [DESCRIPTION]. An original design. Hard pixel edges, a dark
> outline round the figure, no glow, halo or magic effects around it. Plain flat pure black (#000000)
> background, nothing else in the picture, no text, no shadow on the ground. Keep the figure's own
> darkest shadows dark grey or dark brown, never pure black. Portrait image, the figure filling the
> whole height, about 768 pixels tall.

**After:** save each as `sprites/fighters/source/<file>`, run `python3 tools/cut_fighters.py` (it cuts
it into `sprites/forest/<key>.png` and makes a first-guess HUD face in `portraits/small/<key>.jpg`),
then tell Claude, who sets the face crop by hand (`FACES` in the tool) and strikes the row.

| File | Who | Trait to show | Used by | [DESCRIPTION] |
|---|---|---|---|---|
| `goblin.png` | Goblin of the Moriquende | **Swarm**: they come in threes | `fighters.json` `goblin` | a scrawny forest goblin with mottled yellow-green skin, huge pointed ears with notches cut in them, a long hooked nose, a wide grin of needle teeth and small red eyes; a stolen elven cloak far too big for him, moss green, torn and dragging, tied on with string; a necklace of acorns and little bird bones; a crude spear made from a sharpened branch with a flint head bound in sinew; bare clawed feet. Crouched low and eager, spear jabbing forward |
| `varg.png` | Varg (a wolfman) | **Pack Hunter**: goes for the wounded | `fighters.json` `varg` | a Varg, a hulking wolfman of the deep forest, standing upright on long wolf legs, a head taller than a man: a true wolf's head (long narrow snout, tall pointed ears, a thick ruff at the neck, not a hyena), shaggy grey fur darker along the back, pale yellow eyes, bared fangs; a hide loincloth and a belt hung with bone charms and a pouch, leather wraps round the forearms; a heavy stone axe lashed to an antler haft in one clawed hand, the other hand open with long claws. Hunched forward, snarling |
| `varg_alpha.png` | Varg Alpha, leader of the pack | **Pack Hunter** | `fighters.json` `varg_alpha` | the leader of a Varg pack: an older, bigger wolfman with near-black fur and a streak of silver down the muzzle and spine, one ear torn, three long scars across the chest, one eye clouded white; a whole deer hide worn as a cloak with the antlered head as a hood thrown back; a necklace of orc tusks; a great two-handed stone maul. Upright and broad-chested, head raised as if about to howl, proud and menacing |
| `orc.png` | Orc nomad of the east | **Brute**: grapples through a guard | `fighters.json` `orc` | an orc nomad driven west from the eastern plains: taller and much broader than a man, dark olive-green skin, a jutting jaw with two lower tusks, small fierce eyes, a shaved head with a black topknot; travel-worn furs over a patched leather jerkin, rag wraps on the forearms, heavy dusty boots; a big woodsman's felling axe held in both hands, its blade notched from chopping trees; a coil of rope and a waterskin at his belt. A wanderer, not a soldier. Axe raised to swing |
| `orc_bigun.png` | Orc brute, chief of a band | **Brute** | `fighters.json` `orc_bigun` | the chief of an orc nomad band, the biggest of them: dark green skin covered in scars and rough tattooed bands, long tusks capped with bronze, a horned iron helm, a bear-fur mantle over the shoulders, a studded leather hauberk and iron bracers; a heavy cleaver-bladed war axe in one hand and a round wooden shield painted with a red hand print in the other. A swaggering, confident stance, grinning |
| `orc_warboss.png` | Warchief, leader of a Warhost | **Brute** | `fighters.json` `orc_warboss` | an orc warchief, huge and hulking, the strongest orc in the warband: very dark green skin, a massive jaw crowded with tusks, a spiked iron crown-helm, mismatched scavenged armour (a knight's dented breastplate, a cart-wheel rim worn as a shoulder guard, a chainmail skirt), a cloak of wolf pelts; a tall war-totem pole strapped to his back, hung with skulls, feathers and a ragged red banner, all inside the picture; a gigantic two-handed axe held high. Roaring |
| `elf_talon.png` | Talons, the wardens of Elfhome (your ally) | **At Range**: a longbow | `fighters.json` `elf_talon` | an elf woman, a Talon, a warden of the Moriquende: tall and slender, pointed ears, long auburn hair in a warrior's braid, a calm, hard face; a hooded cloak in mottled leaf greens and browns over close-fitting brown leather armour tooled like bark, bracers, soft boots; drawing a tall, elegant pale-yew longbow with a green-fletched arrow nocked and aimed right, a quiver at her hip, a curved long knife at her belt |

The elves you talk to in Elfhome need no art: they're painted from the elf hero figures
(`PEOPLE` in `js/explore_elfhome.js`), and Sylvara is her own sprite.

---

## Places (tilesets), done

**Format:** loose pieces on a flat #101217 background, no labels or dividers, 16 px gaps, the same
scale as the earlier sheets (a floor tile about 100 px). Attach `sprites/ruins/tileset10_source.png`
(floors and walls) and `tileset12_source.png` (special furnishings) as references. Save as
`sprites/ruins/tileset14_source.png`; the cutter (`tools/cut_ruins_tileset.py`) gets a `RECTS14`.

| Sheet | Stands in now | Used by |
|---|---|---|
| ~~The Undercroft: sewers and culverts~~ | **Done:** sheet 24 (`ruins24`), see below | `TYPES.undercroft` in `js/explore_rooms.js` |
| ~~The lecture theatre~~ | **Done:** sheets 25 (furniture) and 26 (back wall) arrived, cut into `ruins25` / `ruins26` (`RECTS25` / `RECTS26`, pieces `lt_*`). Not used yet: `lt_candelabra` (a wall sconce) and `lt_chandelier` (seen from below) | `theatre()` in `js/explore_rooms.js`, `props` in `js/explore_lecture.js` |

**Sewer sheet prompt** (done: `tileset24_source.png`, the Undercroft; kept for reference):

> A sprite sheet of top-down pixel-art pieces for an underground sewer and culvert level, in exactly
> the same style, scale and palette as the attached sheets: brick tunnel floor tiles (dry, and wet with
> puddles), a straight water channel tile and its two edges, a channel corner, brick back-wall pieces
> with NO windows (plain, cracked, with a pipe outlet trickling water, with an iron grille), a side-wall
> piece, an iron ladder going up, a round iron drain grate, a narrow plank walkway over the channel,
> stacked smugglers' crates with straw spilling out, an open crate glowing with coloured crystals, a
> chalk ritual circle drawn on the floor, a cluster of candles on the floor, rats (two small poses).
> Loose pieces with 16 pixel gaps on a flat #101217 background, no labels, no dividers, no text.

**Lecture theatre prompt** (the room is seen from above and slightly in front, like the other interiors;
the stage is at the bottom of the screen and the benches face down towards it, the way the pews on
sheet 12 face; attach `tileset10_source.png` and `tileset12_source.png`):

> A sprite sheet of pixel-art furniture for a university lecture theatre, in exactly the same style,
> scale, palette and top-down-slightly-in-front viewpoint as the attached sheets. Everything faces DOWN
> the picture, towards the viewer: a long tiered lecture bench in three lengths (2, 4 and 6 seats) made of
> dark oak, a backrest with a narrow writing ledge on top for the row behind, inkwells and a few books on
> the ledge; a carved bench end panel; a tier step strip (the edge of a raised wooden floor, a dark
> riser with a lit oak nosing) that tiles left to right; aisle steps with a worn red runner, which tile
> upwards; the stage's front edge: a low stone step with a brass rail on short posts, tiling left to
> right; a raised lecturer's dais; a carved lectern with an open book; a long scorched stone
> demonstration bench with burn marks, a brass brazier, a bowl of water and a stack of rocks on it; a
> large blackboard on an oak easel with chalk glyphs on it; a blank version of the same blackboard; a straw
> training dummy on a wooden stand (pristine), the same dummy charred black and smoking, and the same
> dummy frosted white; a notice board on two posts covered in pinned lecture lists; a tall wall candelabra;
> an iron chandelier with candles seen from below. Loose pieces with 16 pixel gaps on a flat #101217
> background, no labels, no dividers, no text.

**Lecture theatre back wall** (sheet 10's wall pieces are about 150 px wide; ask for the same height):

> Pixel-art back-wall pieces for a grand university lecture theatre, in exactly the same style, scale
> and height as the attached wall pieces: a panelled oak wall with a tall arched leaded window and
> stone mullions, a plain panelled oak wall, a panelled wall with a painted crest of an open book and a
> wren, and a panelled wall with a framed portrait of a stern old scholar. Loose pieces with 16 pixel
> gaps on a flat #101217 background, no labels, no text.


### Elfhome's tileset (sheets 27 and 28)

**Done:** both sheets arrived (`tileset27_source.png`, `tileset28_source.png`), cut into `ruins27` / `ruins28`
(`RECTS27` / `RECTS28`, pieces `ef*`, ground `elfFloor` / `elfGrass` / `elfPath` and the path's
`tr_elfpath_*` set) and built into Elfhome. The prompts are kept below for more.

Elfhome is the elves' town in the Moriquende (`maps/elfhome.json`, `tools/mapgen/elfhome.js`): a glade
round the Heart Tree with the Watch Table under it, and a place for each of the six houses round the
edge. It's built from human town pieces for now (a watchtower, a chapel, mossy cottages; see "Elfhome"
under 3 below). Two sheets replace them, one of buildings and one of props and ground, at the
**outdoor** scale (not the interiors'): the same as `tileset_source.png` and `tileset4_source.png`, where
a cottage is about 220 × 265 px and a ground tile about 100 px.

**Attach:** `sprites/ruins/tileset_source.png` and `sprites/ruins/tileset4_source.png` (for scale, view
and style), and `sprites/forest/source/hexes_source.png` (for the elven look: the tree-town and hamlet
hexes are the town to match). **Save as** `sprites/ruins/tileset27_source.png` and
`tileset28_source.png`; Claude adds `RECTS27` / `RECTS28` to `tools/cut_ruins_tileset.py`, swaps the
pieces into the generator and strikes this entry.

**The look, for both:** wood elves who grow their town rather than build it: living trees shaped into
walls and roofs, curving lines, roofs of overlapping leaf-shaped shingles or living moss, pointed
leaf-shaped windows glowing warm gold, round-arched doors, carved leaf and antler motifs, rope bridges
and ladders, hanging lanterns, moss and ferns everywhere. Greens, browns, warm gold light, a touch of
pale blue for the Seers. No stone castles, nothing human-looking.

**Sheet 27, the buildings** (sizes are rough, in the sheet's own pixels):

> A sprite sheet of top-down three-quarter-view pixel-art buildings for a wood-elf town in an ancient
> forest, in exactly the same style, scale, palette and viewpoint as the attached town sheets, and in
> the elven look of the attached hex tiles (the tree-town and the hamlet). Each a separate piece, its
> base at the bottom, standing on a small patch of mossy ground:
> (1) the Heart Tree, an enormous ancient oak about 550 px tall and 480 px wide, with roots spreading at
> its foot, small round doors and windows in the trunk, a spiral stair round it, walkways and hanging
> gold lanterns in its branches;
> (2) the Seers' talan, a lookout platform high up a tall slender tree (about 300 px tall), a rope ladder
> down to the ground, pale blue lanterns, a green banner with a white leaf;
> (3) the Healing House, a low house grown from two living trees whose branches meet as its roof (about
> 260 × 240), a round-arched door, bundles of herbs hanging under the eaves, warm windows;
> (4) the Talons' lodge, a long timber hall with a curving leaf-shingled roof and carved hawk heads on
> the gable ends (about 280 × 220), longbows racked under the eaves;
> (5) the Guild's workshop, an open-fronted workshop under a broad tree (about 260 × 220), a half-built
> wooden platform on trestles, coils of rope, ladders and a pole-lathe;
> (6) the Beast-speakers' lodge, a round lodge of hide and woven wicker (about 220 × 200), antlers over
> the door, a water trough beside it;
> (7) the Elders' Stone, a ring of mossy stone with six carved seats round a flat stone table, under a
> low arch of living branches (about 260 × 170);
> (8) two small elven cottages, different from each other, with leaf-shingled roofs and pointed
> gold-lit windows (about 200 × 220 each).
> Loose pieces with at least 16 pixel gaps between them on a flat #101217 background. No labels, no
> dividers, no text, no shadows touching other pieces.

**Sheet 28, props and ground:**

> A sprite sheet of top-down three-quarter-view pixel-art props and ground tiles for a wood-elf town in
> an ancient forest, in exactly the same style, scale, palette and viewpoint as the attached town
> sheets, and in the elven look of the attached hex tiles:
> (1) the Watch Table, a round oak table about 150 px across with a map of hexagons carved into its top
> and little wooden figures standing on it;
> (2) three elven lantern posts: a slender carved post with a gold lantern, a curved shepherd's-crook
> post with a hanging lantern, and a short post with a pale blue lantern (each about 60 × 110);
> (3) a plaited-straw archery target on a wooden stand, and a rack of longbows;
> (4) a wooden drying rack hung with herbs, a stone mortar and pestle, and a straw beehive skep;
> (5) coils of rope with a stack of ladders and planks;
> (6) a small spring: a clear pool ringed with mossy stones (about 200 × 140, flat on the ground);
> (7) nature: a mossy fallen log, three clumps of ferns, two rings of red-capped toadstools, two kinds of
> flowering bush (white blossom, purple foxgloves), a tree stump with toadstools on it, and a standing
> stone carved with a leaf rune;
> (8) ground tiles, each exactly 100 × 100 px and seamless when repeated: a mossy forest floor with
> fallen leaves, a soft grass tile, and a mossy flagstone path tile;
> (9) a 3 × 3 set of 100 × 100 tiles for the edges and corners of that mossy flagstone path where it
> meets the forest floor (centre, four edges, four outer corners), the tiles butting together with no
> gaps between them.
> Everything except the 3 × 3 set as loose pieces with at least 16 pixel gaps between them on a flat
> #101217 background. No labels, no dividers, no text.

Tips that worked for the earlier sheets: make one sheet at a time, and if a piece comes out at the
wrong scale, ask for that one again on its own with the cottage from `tileset_source.png` attached.

---

## Other placeholders, done

  - ~~**Hex tiles**~~ and ~~**map figures**~~: **Done.** The user's two sheets
    (`sprites/forest/source/hexes_source.png`: 13 pointy-top tiles; `tokens_source.png`: 10 figures) are
    cut by `python3 tools/cut_forest_art.py` (`--preview out.png`) into `sprites/forest/hex_<kind>.png`
    (old, wood, glade, hill, marsh, crag, lake, felled, burnt, home, hamlet, talan, ancient) and
    `tok_<kind>.png` (goblin, shaman, varg, orc, totem, deer, seer, talon, charm, guild), 256 colours.
  - ~~**Battle backdrop**~~: **Done**, `backgrounds/forest.jpg` (the user's painting: an elven forest clearing with talans, a rope bridge and a waterfall), used by the forest duels (`leadFight`), Elfhome's fights (`ARENA_MAPS.elfhome`) and the forest fighters' `arena`.
- ~~**Elfhome**~~: **Done**, its own sheets 27 and 28 (see section 2). The six house leaders are painted from the elf hero
  figures (`PEOPLE` in `js/explore_elfhome.js`) and need no art.

---

## More art: done

**Done:**
- **Corvanthe tilesets (section 2):** sheets 14–23 (`tileset14..23_source.png`). Sheet 14 holds town props for every district (signs, carts, washing lines, wells, notice boards, cats, crows), sheet 15 the Wound (ground edge set, drifting rocks and houses, a big crystal per element), and the rest are one sheet per district. They build the eight inner districts (`tools/mapgen/inner.js`), joined by the Inner Circuit. The Wound's centre map isn't built yet; its sheet is already cut.
- **Staff toppers** (they replace section 3's staves sheet): 20 toppers from five sheets (`sprites/hero/toppers/`, `tools/cut_toppers.py`), the creator's Topper row and staff wood (`STAVES`), with a living glow on the staff (`js/staff_glow.js`). The prompts are in `docs/world-design.md`, "Staff toppers".
- **More hero figures (section 3):** 33 base figures. Bandit mages, rogues and eight Wrenford townsfolk (students, a herbwife, a gleaner, a don, a punt-keeper) are painted from them, so section 4's Wrenford townsfolk are largely covered.

### Corvanthe: more unique tileset art (done: sheets 6–9 and 14–23)

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

### Character creation: new base figures (done: 33 base figures; staves replaced by staff toppers)

Hero figure rules. The sexes must stay even (one of each per prompt). The slots are `young_man`, `young_woman`, `mid_man`, `mid_woman`, `old_man`, `old_woman`. Vary the silhouette, not the colours:

- "…wearing a wide-brimmed pointed hat, hair in a long braid, a satchel of scrolls."
- "…hooded with a short cape, a staff topped by a crystal, a lantern at the hip."
- "…a battle-mage with a breastplate under the robe, a short staff and a buckler."
- "…a scholar with spectacles and a book chained to the belt, no hat, curly hair."
- "…a hedge-witch with a feather-and-bone staff, bare feet, a herb pouch."
- "…an elegant court mage with a high collar and a long sweeping robe."


- "A sheet of 12 pixel-art wizard staves standing upright, side by side, on a flat #101217 background: crooked wood, crystal-topped, bone, iron, a forked branch, a serpent, a crescent, a lantern-staff…" (for a future staff choice).

### Fantasy races: elves and dwarves (done: 14 elf and 10 dwarf hero figures)

- **Elves**: "…a tall slender elf wizard with long pointed ears, almond eyes, an elegant leaf-embroidered robe, a slim silver-wood staff."
- **Dwarves**: "…a short broad dwarf wizard (about 0.72 the height of a human), a huge braided beard with metal rings, a heavy rune-carved staff, stout boots." (The game already has `spriteHeight` for short races.)

### Arena backdrops for Explore fights, done (`backgrounds/<name>.jpg`)

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

### The world map (superseded: `js/world_ink.js` now inks the map in code, Tolkien-style)

> A hand-drawn fantasy map on aged parchment, 1000×700 (landscape), sepia ink with faint watercolour washes, no text or labels at all (the game adds them). West: a small university town on a river with a bridge. Centre: a market town where the river bends, rolling farmland and woods. East: a great walled city, round, with a dark star-shaped scar at its centre. A river runs from the north, through the city, down past the market town. Hills and a forest to the north, marsh to the south. A compass rose in a corner, sea monsters and decorative flourishes in the margins.

### Loading screens (`backgrounds/loading_<name>.jpg`)

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
