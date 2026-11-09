# WizardsDuel — Notes for Claude

## What this is
A browser-based 1v1 wizard duel game. Each round both wizards secretly pick a Damage, Protection or Dispel spell (rock-paper-scissors), cast it via a short glyph minigame, then the picks are revealed and play out together. Built with vanilla JS/Canvas, no framework. Main logic lives in `js/game.js` (~5700 lines). Character stats and each character's three signature spells are in `characters.json`.

---

## The Arcana Alphabet

Every spell's casting minigame uses glyphs from a shared 12-symbol alphabet. This was designed deliberately — do not change the symbols without considering the full system.

### The 12 glyphs

| # | Glyph | Unicode | Name | Shape |
|---|-------|---------|------|-------|
| 1 | ϟ | U+03DF | Koppa | zigzag bolt |
| 2 | Δ | U+0394 | Delta | triangle up |
| 3 | ∇ | U+2207 | Nabla | triangle down |
| 4 | Ψ | U+03A8 | Psi | trident / fork |
| 5 | Ω | U+03A9 | Omega | horseshoe arch |
| 6 | ∞ | U+221E | Lemniscate | figure-eight |
| 7 | ☽ | U+263D | Crescent | open curve |
| 8 | ✸ | U+2738 | Octagram | 8-pointed star |
| 9 | ⊕ | U+2295 | Circled plus | cross in circle |
| 10 | ⊗ | U+2297 | Circled cross | X in circle |
| 11 | θ | U+03B8 | Theta | H-bar in circle |
| 12 | Φ | U+03A6 | Phi | V-bar through circle |

**All 12 are text-only — no emoji presentation variants.** Never replace any with a symbol from the U+2600–U+26FF Miscellaneous Symbols block without checking for emoji variants first (e.g. ⚡ U+26A1 looks like a bolt but renders as a colour emoji on iOS — that's why ϟ is used instead).

### Spell glyph assignments (4 per spell)

| Spell | Element | Glyphs | Notes |
|-------|---------|--------|-------|
| Inferno | fire | `ϟ Δ ⊕ Ω` | bolt / rising flame / solar / consuming end |
| Lightning | lightning | `Ψ ∇ ⊗ ✸` | forked strike / descent / impact / burst |
| Ice | ice | `θ Φ ☽ ∞` | crystal / polar axis / frost moon / eternal |
| Arcane | arcane | `Ω ∞ Ψ θ` | cosmos / eternity / spirit / hidden |
| Dispel | dispel | `∞ ⊕ ∇ θ` | eternal cycle / unbinding / descent / dissolution |
| Physical (Elemental rules) | physical | `Δ ∇ Ψ ⊕` | stone layers / fork / binding — Rockfall minigame (rune stones fall into shuffled spots on a quaking floor) |
| Dark (Elemental rules) | dark | `☽ ⊗ ∇ Ω` | the Necromancy set — Shadow Circle minigame (runes rise from a purple moon circle and orbit it) |

Arcane deliberately shares one glyph with each other element — it's the underlying force of all magic, and the hardest set to memorise in hard mode. Dispel similarly draws one glyph from each elemental set (∞ from Ice, ⊕ from Inferno, ∇ from Lightning, θ from Ice/Arcane), fitting its role as a universal spell that dissolves any type of magic.

### Planned future spells (not yet assigned)
Suggested glyph sets for when these are implemented:
- **Necromancy** → `☽ ⊗ ∇ Ω`  (moon / void / descent / ending) — now used by the Dark element
- **Enchantment** → `∞ Φ ✸ ⊕`  (endless / harmony / radiance / binding)
- **Polymorph**   → `Δ ∇ ϟ ∞`  (up / down / flux / cycle)

---

## Minigame difficulty system

Each spell's minigame has three difficulty modes. Difficulty is set globally in `diffName` (`'easy'` / `'normal'` / `'hard'`).

**Pacing (all minigames):** 5 s to watch (`MG_WATCH_MS`), then 5 s to enter (`MG_INPUT_S`). Sequence length comes from cast strength, not difficulty: `spell.tier` 1 / 2 / 3 (inner / middle / outer strength ring) means 2 / 3 / 4 glyphs. The tile-match uses 2 / 3 / 4 pairs. With no tier, a cast uses the middle ring. The shared helpers `mgSeqLen` / `mgSeq` / `mgSpawnInterval` sit just above `launchBuffTileMatch`.

**Ending (all minigames):** every minigame ends through `mgEnd(ok, info, cb)` instead of calling `puzzleFinish` directly, and never cuts straight back to the battle. Failure holds for `MG_FAIL_MS` (1.3 s): the canvas greys out and shakes, the wrong key is crossed out in red, the key that was wanted pulses gold, the slot row shows the rest of the answer, and a FIZZLED banner gives the reason (`wrong` / `forbidden` / `timeout` / `strikes`, see `MG_REASONS`). Phones also vibrate. Success holds for `MG_WIN_MS` (0.75 s) with a gold flash and SPELL WOVEN. During input, glyph games draw the sequence as a row of slots (`mgDrawSlots`) that fill in as you tap. Pass the reason (and the wrong glyph) to `finish(ok, reason, wrongAi)`.

### Inferno (launchPatternEcho) — the reference implementation
The Inferno minigame was redesigned as an animated rising-glyph mechanic and serves as the model for how the new system should work in all spells.

**Watch phase:**
- Red glyphs (noise) rise continuously from the bottom — visual distraction.
- White glyphs (the sequence) rise one at a time, spread evenly across the 5 s watch window, with a coloured glow unique to each glyph and a small order-number badge.
- Every sequence glyph stays on screen for at least half the watch window (`MG_GLYPH_MS` = 2.5 s): the last one spawns at the halfway mark. Glyph motion and fades are time-based (ms), not per-frame, so high-refresh screens don't speed them up.

**Glyph glow colours** (used on white sequence glyphs during watch phase — defined for all 12):

| # | Glyph | Glow colour |
|---|-------|-------------|
| 0 | ϟ | `#ccffff` cyan |
| 1 | Δ | `#ff9944` orange |
| 2 | ∇ | `#44aaff` blue |
| 3 | Ψ | `#aaff88` lime |
| 4 | Ω | `#ff4444` red |
| 5 | ∞ | `#44ffcc` teal |
| 6 | ☽ | `#aaddff` ice-blue |
| 7 | ✸ | `#ffff55` yellow |
| 8 | ⊕ | `#ffee77` gold |
| 9 | ⊗ | `#ff44aa` pink |
| 10 | θ | `#88ff88` green |
| 11 | Φ | `#dd88ff` violet |

**Input phase — difficulty rules:**

| Mode | Keyboard | Fixed or random |
|------|----------|-----------------|
| Easy | 3×4 grid (all 12 glyphs), non-spell glyphs greyed out | Fixed canonical word (first 2–4 glyphs, by strength) |
| Normal | 3×4 grid, non-spell glyphs greyed out | Random from spell's 4 |
| Hard | 3×4 grid, nothing greyed out — all 12 active; a wrong glyph fails | Random from spell's 4 |

### Dispel (launchDispelPattern) — Veil Unravelling
Made harder than the others on purpose (Dispels were too easy). The sequence glyphs are unveiled **one at a time** (fade in / hold / fade out, `MG_GLYPH_MS` each) in **shuffled slots** of a 6-slot inner ring that rotates, with **no order badges** — the order is only shown by when each one appears. Brighter, faster noise rings stay up for most of the watch, and violet **decoy flares** of Dispel's own glyphs appear in the middle ring (2 / 3 / 5 on easy / normal / hard), so the greyed-out keyboard can't rule them out.

**Easy mode canonical words** (the fixed sequence a player can learn for each spell):

| Spell | Canonical sequence |
|-------|--------------------|
| Inferno | ϟ Δ ⊕ Ω (in that order) |
| Lightning | Ψ ∇ ⊗ ✸ (in that order) |
| Ice | θ Φ ☽ ∞ (in that order) |
| Arcane | Ω ∞ Ψ θ (in that order) |
| Dispel | ∞ ⊕ ∇ θ (in that order) |

---

## Round flow & RPS redesign
Every round goes: secret picks → simultaneous reveal → resolution → round-end ticks. Resolution runs in stages (the "ELEMENTAL DUEL" section): every Protection, then every Dispel, then every Damage. Each character spell's `el` block in `characters.json` defines it (category, element sector it takes over on that wheel, kind, middle-ring cost and effect — `sigAtTier` scales the other rings). Keep one signature spell per category + element per character. A character's `forbidden` elements (greyed out on its wheel) are a balancing lever: restrict strong characters, never their signature elements. After changing any numbers, re-run `tools/balance.html` and keep every character within ±8% of 50% with the Normal AI. (The old "Classic" rules — per-character spell bars, Channel, free basic attacks — were removed. Meditate — skip your spell for +3 mana, not two rounds in a row — is the Elemental replacement for Channel.) That flow is the "ROUND FLOW" section of `js/game.js`. Loop over `PLAYERS` and `gs.pending`; don't hard-code p1/p2 in new round logic. The agreed Damage / Protection / Dispel design, and the phases still to build, are in `docs/rps-duel-design.md`.

**Valdris's skeletons (soak minions)** work the same way in both rule sets, so players moving between them aren't confused. In the standard game the `minion` effect has `kind:"minion"` (so `buffsOf` skips it and dispels can't touch it), `soak` (each skeleton's HP), `raise` (how many per cast; `sigAtTier` changes this, 2 / 3 / 4, instead of scaling bite or HP) and `max`, with no round timer. `soakMinions()` runs at the top of `elemIncoming()`, so strikes, arcane orbs and ticks wear skeletons down (oldest first) before the ward; it also charges Soul Tithe (`tithe` curse) to `dmgSource`. DoTs on a wizard with skeletons go through `elemIncoming` even without a ward. The AI keeps a screen up via `guardSpell` / `guardCount` in `elemAIChoose`. Valdris has no Deathless in either mode (the engine code stays, keyed on `deathlessCost`). Last balance run: Valdris 51.2%, Raise Dead about 41% of his picks.

**Daveron's graveguard** (both rule sets) are the same soak skeletons, but elite: `elite:true` on the effect makes `sigAtTier` scale each one's `soak` and `dmg` by ring (soak 6 / 10 / 15, strike 2 / 4 / 6) and keep `raise` at 1, max 3. `look:2` pins their sprite to the armoured `skeleton2.png` (`syncMinionVisuals`). Vanhal's Danse Macabre is a `danse` buff (`requires:"skeletons"`, dispellable): while it lasts, each of the owner's skeletons adds its `bonus` to its round-end strike (`elemTickEffects`). Curse of the Years is an `agony`-type curse with `inescapable:true`: same bite, but Meditate doesn't escape it (`agonyBites(who,action,agony)`; the AI only meditates through an escapable one). Each Agony-type curse on a wizard bites separately, floats its own name and uses `TICK_VFX[id]` when there is one. Being inescapable, it's 4 a round (6 put Daveron at 61%). The AI tops up skeletons while `guardLow` (at or below half the spell's `max`) and favours Danse while skeletons stand. Last balance run: Daveron about 51% at HP 85 (whole roster 44–54%), Raise Graveguard about 37% of his picks, Danse about 10%.

**Xerrakh** (placeholder name; standard game only, no tabletop card yet) is the furious one. Doom Bolt (Dark) and Blue Fire (Fire) are strikes with `blast`: that much of the damage washes around a ward straight to HP (`elemIncoming`'s `blast` argument, after skeletons soak), and in 3–4 seat games a blast strike hits every foe at any ring (`hitsAllFoes`). `sigAtTier` scales `blast`. Infernal Gate is an `absorbNext` buff with `retaliate`: the strike it swallows misses (`miss:'gate'`) and the striker takes `retaliate` (`strikeMiss`). Last balance run: Xerrakh 49.3% at HP 90 (whole roster 47–54%), Gate about 18% of his picks, Doom Bolt about 11%, Blue Fire about 7%.

---

## Tabletop mode
A separate, simplified rule set for playing on a real table. HP, mana and wards are whole counters (max 20 each), and the counters are the tiddlywinks. Spells have three levels, Lesser / Normal / Greater (stored as `ring` 1–3), with a memorable rule: cost is 2 mana per wink to pot, damage equals the cost, and wards and dispels are double the cost. Signature spells are fixed cards. To cast, you flick from your handicap distance and pot 1 / 2 / 3 winks by level (`RULES.winks`). Each miss costs 1 mana to go again, or the spell fizzles. Missed winks stay on the table between rounds, and each round both players take turns, 3 attempts each, squopping any of them for mana. Nothing has a round timer: wards last until worn down or broken, buffs until dispelled, curses until cleansed (Cleanse costs 1 / 2 / 3 mana and pots 1 / 2 / 3 winks to remove 1 / 2 / all curses, `RULES.cleanseCost`), and "next strike" effects until used. Wizards have no general strike bonuses. a ward's own element counts +2 against it (strikes and dispels), and there are no element riders. `RULES.pot` / `RULES.squop` are the success rates the sim assumes. Games are tuned shorter (about 11 rounds against about 20 in the standard game). **It never touches the standard game:** `js/game.js` doesn't load it, and the standard game stays the default.
- `js/tabletop.js`: rules (`RULES`), engine, AI and `simMatch`. Self-contained, and runs in Node too.
- `tabletop.json`: each character's counter numbers and spell card text. Names, colours and `forbidden` come from `characters.json`.
- `docs/tabletop-rules.md`: the rulebook. After changing numbers, run `node tools/tabletop_doc.js` to regenerate its base-spell and character sections, and keep the hand-written rules in step with the engine.
- Soak minions (Valdris's skeletons; the standard game mirrors this, see Round flow): an effect with `soak:true` and `kind:"minion"` absorbs 1 damage per minion in `incoming()` before the ward (the ward's +2 element bonus only applies to what gets past), and `kind:"minion"` keeps them out of `buffs()`, so dispels can't touch them. `raise` sets how many come per cast (capped by `max`). The AI plays them through `guardSpell` in `aiChoose` / `aiInCat`. Soul Tithe (a `tithe` curse) makes the foe lose `n` mana per skeleton they kill, also in `incoming()` (not for a Bewitched self-hit, `own`). After AI changes, check the sim still raises skeletons often (they were on the table in about 40% of Valdris's rounds, and Raise Dead was about 39% of his picks).
- Daveron's graveguard: `soak` can be a number, each minion's HP (`soak:true` is 1, so Valdris is unchanged); `incoming()` wears the oldest down first and Soul Tithe counts the ones that fall. Danse Macabre is a `danse` buff whose `bonus` adds to each skeleton's round-end hit in `endRound()`; its card has `requires:"skeleton"`, enforced in `canPick`. Curse of the Years is an `agony` curse with `inescapable:true` (Meditate doesn't escape it, in `endRound()`). The AI tops up while `guardLow` (at or below half the card's `max`) and favours Danse while skeletons stand. Last run: Daveron about 50% (HP 18), Raise Graveguard about 40% of his picks, Danse about 7%.
- Balance: in `tools/balance.html`, set **Mode** to **Tabletop**, or run `TT.balance(games)` in Node. `node tools/tabletop_matchups.js` prints the full matchup table. Keep every character within ±8% of 50%, the same target as the standard game.

---

## Visual effects
Keep VFX: when changing or removing a spell, keep its look. Every spell's visual is in the "VFX LIBRARY" section of `js/game.js`:
- `SPELL_VFX[spellId]` is each signature spell's own look. `self` plays when cast on yourself, `hit` when it lands on the target, and `delivery` handles lunges and volleys.
- `ELEM_IMPACT_VFX` holds the plain element strikes; `TICK_VFX` / `MINION_VFX` the round-end ticks; `VFX` the shared reactions (ward block/shatter, dodge, dispel, retaliation, …).
- Arcane strikes (wheel and signature, unless the spell has its own `delivery`) go through `elemStrikeVolley`: the strike is resolved once up front (`strikeResolve`: dodge, Vanish, vuln, resist), then the damage arrives as a volley of pulsating blue orbs (`spawnArcaneVolley`, drawn as the `arcaneOrb` projectile), one 5-HP hit per orb (`ARCANE_ORB_DMG`, last orb takes the remainder), fired `ARCANE_ORB_GAP` ms apart, each on a parabola with a random peak height (`spawnProj`'s `arc` option). A shared `wear` object makes a ward wear exactly as from one big hit. Riders (mana burn, lifesteal, DoTs, arcs, retaliation) run once in `strikeFinish` after the last orb. A Deathless save (no character uses it now) or knock-out ends that target's volley, so splitting never changes the total. Other elements use `strikeOne` (resolve → `strikeChunk` → `strikeFinish` in one go).
- Counter's retaliation (Eldrin, a Lightning buff) is a charged electrical arc from his ward bubble (or the gold Counter ring with no ward) to the striker (`counterArc` → `spawnCounterArc` / `tickCounterArcs`, called from `strikeFinish`): a short pause so the strike that set it off is seen (`COUNTER_WAIT_MS`), sparks crawl over the bubble and gather into a ball on the striker's side (`COUNTER_CHARGE_MS`), then a forked bolt arcs across (`makeArcBolt`) and the damage lands with it. It holds the round with `holdFx(ms)` (`gs.fxHold`, which the tier runner's `next()` waits on), so the next action doesn't start until it lands. Other retaliation keeps its `VFX.retaliate` look.
- Fire strikes (plain wheel Fire damage) are a charged fireball: `spawnFireball` swells it in front of the caster to a size set by the damage (`previewStrikeDmg` → `fireballRadius`), fires it across, and the impact is `spawnFireExplosion` scaled by the damage dealt (`tickFireballs` / `tickExplosions`).
- Ice strikes (plain wheel Ice damage) have no projectile: `spawnIceCrystals` crystallises a six-armed snowflake over the target (arms grow from a hexagonal core and sprout side branches; size set by the damage, `iceScale`). It turns slowly, trembles and flares white, then the strike lands and the impact is `spawnIceShatter`: glowing snowflake-arm fragments fly out and fall (`tickIceCrystals` / `tickIceShards`). Ice Lance keeps its own projectile.
- Lightning strikes (plain wheel Lightning damage) have no projectile: `spawnStormCloud` swirls a dark storm cloud together over the target's head (puffs spiral inward, flickering inside as it charges; size set by the damage, `stormScale`), then it discharges: a jagged, forked bolt (`boltPath` / `makeBolt`, width `boltWidth(dmg)`, more branches for more damage) cracks down into the target and flickers twice as the strike lands, and the cloud breaks up (`tickStorms`). The impact is `spawnLightningImpact`: sparks, a crackling ring and, for big hits, a short quake. Lightning signature spells keep their own looks.
- The fireball and its explosion take a palette (`FIRE_PALETTES`: `fire`, `doom` purple, `blue`). Xerrakh's Doom Bolt and Blue Fire use them via `SPELL_VFX[id].delivery = {fireball:'<palette>'}`; Blue Fire's blast is drawn 1.7× bigger with a quake. Infernal Gate draws a burning ring at his feet while it lasts (`infernalGate` in `drawWiz`) and `VFX.gateSlip` when it swallows a strike.
- Physical strikes (plain wheel Physical damage) are a falling boulder: `spawnBoulder` forms it above the caster's head (earth motes spiral in) at a size set by the damage (`previewStrikeDmg` → `boulderRadius`), heaves it across and drops it near-vertically onto the target (`tickBoulders`). The impact is `spawnBoulderImpact`: rock shards, a dust cloud and a short screen shake (`quake` / `quakeOffset`, applied to the whole scene in `battleLoop`). Physical signature spells keep their own looks.
- Dark strikes (wheel and signature, unless the spell has its own `delivery`) have no projectile: a ritual circle of the Dark runes appears on the ground at each target's feet (`spawnDarkRitual` / `tickDarkRituals`), whirls around them fast and slows to a stop, glows white-hot, then burns out in purple embers. The damage lands as it burns (the callback). The old shadow orb projectile and Shadow Circle impact (`spawnShadowCircle`) stay in the library but are no longer used for strikes, as is Mana Burn's blue fire column (`spawnManaBurnFire`).
- Wizard placement: `wizFeetY()` / `wizSize()` (scaled by `WIZ_GROW`) set where and how big the wizards are drawn; effects that play on a wizard use `wizMidY()` (upper body), not a fixed fraction of `bH`. `drawWiz` squashes its round auras into an upright oval (`AURA_SX` / `AURA_SY`); minions keep the original size.
- Time-based rotations: use `spinAngle(t, periodMs)`, never `Date.now()/n` straight into `arc()` or `rotate()`. Canvas arc angles are 32-bit floats, so an angle of billions of radians collapses and the arc draws nothing (this hid Counter's gold ring and Enthral's swirl).
- Primitives: `spawnBeam`, `lunge`, `spawnManaBurnFire`, `vfxRing` / `vfxFountain` / `vfxDrift` / `vfxDrip` / `vfxPhaseIn`. `drawWiz` draws status auras from `wizVisuals()`.
- Ward orbiters (`drawWardOrbiters`, just above `drawWiz`): every ward has one elemental object per 10 ward HP left (rounded up, max 9) orbiting on three tilted atom-style rings — boulders (Physical), ice shards (Ice), glowing Dark runes, flickering flames (Fire), sparks running along faint wires (Lightning), pulsing blue spheres (Arcane). The far side draws behind the sprite, the near side in front. Slots are fixed, so losing HP just drops the last orbiter. They replace Stoneskin's old fixed three rocks.
- Lifesteal (Malachar's Drain, Necrotic Drain, any strike with `lifesteal`): `VFX.lifesteal(who,tgt,heal)` → `spawnSiphon` / `tickSiphons`, a stream of blood motes torn from the target that arcs across and soaks into the caster (more healing, more motes). Not a fountain on the caster. Blood red by default; a spell can set its own colours with `SPELL_VFX[id].siphon` (Necrotic Drain is purple).
- Dispels and curses that hit a ward never burst or flash: the ward unravels (`spawnWardUnravel` / `tickWardUnravels`, via `VFX.wardUnravel`), with threads of its colour and dispel pink peeling off the bubble and spiralling away. When a dispel breaks the ward, `breakWard(st,x,true)` shows UNRAVELLED! and a bigger unravel instead of the shatter burst.
- Wards and buffs phase in (`vfxPhaseIn`: motes fade in and settle inward; `auraFade` grows the ward bubble in) — never use `spawnParts` bursts or `flash` for them, since a burst on yourself reads as taking a hit.
- Portraits: `portraits/<key>.png` is the full-size source art and the game never loads it. The UI uses `portraits/small/<key>.jpg` (a 256×256 close-up of the face, for every small icon) and, for the character detail panel, `portraits/medium/<key>.jpg` (whole portrait, 720 px). Each face crop is set by hand in `FACES` in `tools/make_portrait_thumbs.py`. The icons are plain hi-res crops of the source art (no pixelating). Daveron's portrait is the full artist painting (1122×1402); his sprite was cut from a mock-up screenshot (background removed with rembg u2net plus hand-tuned mask fixes) — a cleaner source from the artist should replace it. Xerrakh's (placeholder name) 703×768 sprite was cut from a mock-up with a baked-in checkerboard (flood-filled out from the edges, plus the enclosed checker holes in his staff wheel); his flame is purple in the sprite but green in the portrait. After adding or changing a portrait, add or adjust its `FACES` entry, run `python3 tools/make_portrait_thumbs.py`, and check the crops with `--preview out.png`.
- Battle sprites: each character's `sprite` in `characters.json`. Either an old 192×320 spritesheet (`mage-*.png`, 48×64 frames, facing left) or a single full-body still named after the character key (`sprites/<key>.png`, 512×768, facing right). `drawSprite` handles both; stills are sized by height and keep their aspect ratio, so a wide pose can use a wider canvas (Daveron is 607×768 so his flame and staff fit at full height). An optional `spriteHeight` (e.g. Durin, a dwarf: 0.72) and `spriteWidth` (Durin: 1.2, stretches the sprite sideways) shrinks that character's battle sprite, feet staying on the floor (`seatSpriteHeight`). Its auras, ward and the effects aimed at it shrink too: `wizSize(at)` / `wizMidY(at)` take a seat or an x position (nearest seat), and `vfxCtx` gives `cy` / `ty` for the caster's and target's heights. Use those, not the no-argument forms, for anything that plays on a wizard.
- Skeleton summons (Valdris's Raise Dead): `sprites/skeleton1.png` / `skeleton2.png` / `skeleton3.png` for the inner / middle / outer ring (the ring only changes how many rise, 2 / 3 / 4): a ragged skeleton, an armoured spearman and a crowned wight. `drawSkeletons` draws them after Valdris and his front ward orbiters, so they stand in front of him and the ward; up to five go in `SKELETON_SLOTS` (front row of three, smaller back row of two), sized from his drawn height (`SKELETON_HEIGHT`). Same format as the character stills (facing right, feet at the bottom edge); height by tier is `SKELETON_HEIGHT`. A missing file falls back to the bone circle. Each summon effect records its `tier`, and `syncMinionVisuals` passes it to `drawWiz`.
- `js/legacy/` holds code the game doesn't load: the original Classic spell code (`classic_spells.js`, with every effect in context) and the old puzzle minigames, including Mana Burn (`puzzles_legacy.js`).

---

## Key file locations

| Thing | File | Approx. lines |
|-------|------|---------------|
| All game logic | `js/game.js` | ~5700 |
| VFX library | `js/game.js` | ~1500 |
| Round flow (pick → reveal → resolve) | `js/game.js` | ~1740 |
| Elemental rules, wheel, AI | `js/game.js` | ~1915 |
| Tile-match (wards / buffs) minigame | `js/game.js` | ~2840 |
| Inferno minigame (Fire) | `js/game.js` | ~3600 |
| Rockfall minigame (Physical) | `js/game.js` | ~3885 |
| Lightning minigame | `js/game.js` | ~3380 |
| Shadow Circle minigame (Dark) | `js/game.js` | ~4570 |
| Ice minigame | `js/game.js` | ~4035 |
| Arcane minigame | `js/game.js` | ~4335 |
| Dispel minigame | `js/game.js` | ~4630 |
| Tutorial text | `js/game.js` | ~5160 |
| Characters and signature spells | `characters.json` | whole file |
| Archived Classic spell code (not loaded) | `js/legacy/classic_spells.js` | whole file |
| Balance simulator (AI-vs-AI win rates) | `tools/balance.html`, `simMatch` in `js/game.js` | whole file |
| Tabletop mode (rules, engine, AI, sim) | `js/tabletop.js`, `tabletop.json`, `docs/tabletop-rules.md` | whole files |
| Puzzle screen HTML | `index.html` | ~242 |
| Canvas styling | `css/style.css` | ~530–560 |

---

## Symbol safety rule
Before adding any new Unicode symbol to the game, check it is **not** in the emoji presentation set. Risky blocks: U+2600–U+26FF. Safe blocks: Greek (U+0370–U+03FF), Mathematical Operators (U+2200–U+22FF), Dingbats (U+2700–U+27BF, mostly safe). When in doubt, append U+FE0E (text variation selector) or pick a different symbol.
