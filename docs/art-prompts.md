# Art prompts and placeholders

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
| `squop.png` | Old Bartholomew "Squop" Hale, winks player | `sprites/hero/old_man_1.png` | `PEOPLE.squop` | a little old man in a shabby tweed coat and flat cap, a small cup and a handful of coloured tiddlywinks counters (no gown) |
| `proctor.png` | Mr Ravel, the Senior Proctor (not in the game yet) | none | planned | a severe thin man, black gown with velvet bands, white bands at the throat, a tall black hat, a short black staff of office |

The Bulldogs use the halberdier (`sprites/halberdier.png`), which fits; Clemency's Echo in the finale
uses the weak Water Echo (`sprites/echoes/water_weak.png`), which also fits, though a girl-shaped one
in a student's gown would be better (ask with the Echo brief in `docs/world-design.md`).

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
