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
| ~~`lect_fire.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Ignatius Pyle, Fire lecturer | | |
| ~~`lect_water.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Miss Perpetua Wells, Water | | |
| ~~`lect_air.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Halcyon Drift, Air | | |
| ~~`lect_earth.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Agnes Barrow, Earth | | |
| ~~`lect_lightning.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Erasmus Fulmer, Lightning | | |
| ~~`lect_ice.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Ingrid Rime, Ice (also On Wards) | | |
| ~~`lect_arcane.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Oriel Nightingale, Arcane (also On Unmaking) | | |
| ~~`lect_dark.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Dr Lavinia Crowe, Dark | | |
| `bedel.png` | Mr Hobday, the Bedel of the Schools (keeps the lecture list) | `sprites/hero/old_man_3.png` as painted | `PEOPLE.lecturer` in `js/explore_year.js` | an elderly university bedel (usher), a long black gown with silver lace, a black velvet cap, holding a tall silver-topped mace of office and a rolled lecture list, white side-whiskers, dignified and fussy |
| ~~`examiner.png`~~ | **Done:** the art arrived (cut by `python3 tools/cut_lecturers.py` into `sprites/folk/`) | Professor Thorley, Chair of Examiners | | |
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
| ~~`student_seated_1.png` … `_8.png`~~ | ~~the students at a lecture~~ | **Done:** the art arrived (`sprites/folk/source/student_seated_<n>.png`, cut by `python3 tools/cut_students.py` with two gown recolours each) | `STUDENTS` / `drawStudent` in `js/explore_lecture.js` | the prompt below, kept for more |
| `proctor.png` | Mr Ravel, the Senior Proctor (not in the game yet) | none | planned | a severe thin man, black gown with velvet bands, white bands at the throat, a tall black hat, a short black staff of office |

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

The Bulldogs use the halberdier (`sprites/halberdier.png`), which fits; Clemency's Echo in the finale
uses the weak Water Echo (`sprites/echoes/water_weak.png`), which also fits, though a girl-shaped one
in a student's gown would be better (ask with the Echo brief in `docs/world-design.md`).

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

## 1b. The Moriquende's battle figures

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

## 2. Places (tilesets)

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

## 3. Other placeholders

- **The winks table** (`js/explore_pub.js`): drawn with CSS (a green felt bar, a dashed cup, a red
  wink). Fine as it is; a pixel-art felt table, cup and counters would be a nice touch.
- **Wenna and the Lamplighter** (Cindergate, Gloamside) use Echo sprites as stand-ins: see "Echo art
  brief" in `docs/world-design.md`.
- **The Moriquende** (`js/forest.js`, the forest strategy year):
  - ~~**Hex tiles**~~ and ~~**map figures**~~: **Done.** The user's two sheets
    (`sprites/forest/source/hexes_source.png`: 13 pointy-top tiles; `tokens_source.png`: 10 figures) are
    cut by `python3 tools/cut_forest_art.py` (`--preview out.png`) into `sprites/forest/hex_<kind>.png`
    (old, wood, glade, hill, marsh, crag, lake, felled, burnt, home, hamlet, talan, ancient) and
    `tok_<kind>.png` (goblin, shaman, varg, orc, totem, deer, seer, talon, charm, guild), 256 colours.
  - **Battle fighters:** a prompt per figure in "1b. The Moriquende's battle figures" above.
  - ~~**Battle backdrop**~~: **Done**, `backgrounds/forest.jpg` (the user's painting: an elven forest clearing with talans, a rope bridge and a waterfall), used by the forest duels (`leadFight`), Elfhome's fights (`ARENA_MAPS.elfhome`) and the forest fighters' `arena`.
- ~~**Elfhome**~~: **Done**, its own sheets 27 and 28 (see section 2). The six house leaders are painted from the elf hero
  figures (`PEOPLE` in `js/explore_elfhome.js`) and need no art.
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

Done so far (in `backgrounds/`, picked by `arenaHere` in `js/explore.js`): `wren_schools`, `wren_quad`, `wren_undercroft`, `wren_orrery`, `hollowmere`, `road`, `spirewatch`, `collegium`, `cindergate`, `heights`, `drowned`, `quarry`, `frost`, `gloam`, `forest` (each sector's also used by its inner district). Still to make: `wound` (for the Wound itself, once it's built). When one arrives, add it to `ARENA_MAPS`. Attach `backgrounds/ruins.jpg` as the style reference and use this base prompt:

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
