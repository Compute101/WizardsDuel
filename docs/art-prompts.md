# Art prompts (for image generation)

Written to match the pipelines already in the repo, so the cutting tools work on the results with little or no code change. Attach 1–2 of the existing sheets or sprites as style references every time, which matters more than any wording.

## House rules (paste into every prompt)

- **Tilesets** (`tools/cut_ruins_tileset.py`): "Top-down 3/4 view pixel-art game assets, same scale as the attached sheets (a ground tile is about 100 px, a cottage about 220 × 265 px). Loose separate pieces on a flat #101217 background, 16 px gaps between pieces, no labels, no grid lines, no text, no shadows touching other pieces."
- **Hero base figures** (`tools/cut_hero_figures.py`, drop them in `sprites/hero/source/<slot>_<n>.png`): "Full-body pixel-art fantasy wizard, standing, facing right, 3/4 view, feet at the bottom, on a flat pure green (#00FF00) background. **Purple robe and hat, gold trim, silver-grey hair, blue magic glow** in one hand, a wooden staff in the other. Same style and proportions as the attached figure." The recolouring needs those exact colours: purple becomes the robe colour, blue the element, silver the hair and gold the trim.
- **Fighters / creatures** (`tools/cut_fighters.py`): "Full-body pixel-art, facing right, feet at the bottom edge, on a flat black background, no glow touching the edge, about 768 px tall."

---

## 1. Cheap, high-value first (one image each)

1. **Wenna the baker** (she currently uses an Echo sprite as a stand-in): fighter rules + "a stout middle-aged woman baker in a soot-stained apron, flour on her arms, holding a long bread peel, warm ember-lit, living in a burnt fire-district."
2. **The Lamplighter** (also a stand-in): fighter rules + "a thin old lamplighter in a dark hooded coat, carrying a long brass lamp-pole with a pale violet flame, a lantern at the belt."
3. **Old Marda** (Gleaners' Rest landlady): fighter rules + "a tough grey-haired tavern keeper, sleeves rolled, a ladle in one hand, a scar across the cheek."
4. **Wounded gleaner**: fighter rules + "a scavenger in patched leathers and a satchel of glowing crystals, bandaged arm, kneeling and leaning on a crowbar."
5. **Rival gleaner captain** (warband leader): fighter rules + "a mercenary captain in a dyed tabard, sword on the shoulder, a pouch of glowing quintessence crystals at the belt."
6. **Arena backdrops** (`backgrounds/<name>.jpg`, one per wizard is the plan): "Painterly dark-fantasy battle backdrop, wide 16:9, a flat floor across the bottom third, no figures, moody lighting." Then add the setting: *a dwarven forge hall* (Durin), *a frozen fjord shrine* (Skadi), *a sunken sea temple with kelp* (Nerissa), *a necromancer's crypt with green candles* (Valdris / Daveron), *a cluttered gnome alchemy lab* (Fizzwick), *a noble's marble ballroom* (Thessaly).

## 2. Corvanthe: more unique tileset art

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

## 3. Character creation: new base figures

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

## 4. Fantasy races (hero bases and NPCs)

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

---

When you're back with usage: drop new tilesets in `sprites/ruins/` as `tileset<N>_source.png`, hero figures in `sprites/hero/source/`, and fighters / NPCs in `sprites/fighters/source/`, then ask Claude to cut them and wire them in.
