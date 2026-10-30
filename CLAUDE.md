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

---

## Visual effects
Keep VFX: when changing or removing a spell, keep its look. Every spell's visual is in the "VFX LIBRARY" section of `js/game.js`:
- `SPELL_VFX[spellId]` is each signature spell's own look. `self` plays when cast on yourself, `hit` when it lands on the target, and `delivery` handles lunges and volleys.
- `ELEM_IMPACT_VFX` holds the plain element strikes; `TICK_VFX` / `MINION_VFX` the round-end ticks; `VFX` the shared reactions (ward block/shatter, dodge, dispel, retaliation, …).
- Dark strikes travel as a shadow orb with the four Dark runes circling it and land as a Shadow Circle (`spawnShadowCircle`: the runes rise, orbit the target, then collapse). Mana Burn's blue fire column (`spawnManaBurnFire`) is kept in the library but no longer used.
- Primitives: `spawnBeam`, `lunge`, `spawnManaBurnFire`, `vfxRing` / `vfxFountain` / `vfxDrift` / `vfxDrip` / `vfxPhaseIn`. `drawWiz` draws status auras from `wizVisuals()`.
- Wards and buffs phase in (`vfxPhaseIn`: motes fade in and settle inward; `auraFade` grows the ward bubble in) — never use `spawnParts` bursts or `flash` for them, since a burst on yourself reads as taking a hit.
- Battle sprites: each character's `sprite` in `characters.json`. Either an old 192×320 spritesheet (`mage-*.png`, 48×64 frames, facing left) or a single full-body still named after the character key (`sprites/<key>.png`, 512×768, facing right). `drawSprite` handles both.
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
| Puzzle screen HTML | `index.html` | ~242 |
| Canvas styling | `css/style.css` | ~530–560 |

---

## Symbol safety rule
Before adding any new Unicode symbol to the game, check it is **not** in the emoji presentation set. Risky blocks: U+2600–U+26FF. Safe blocks: Greek (U+0370–U+03FF), Mathematical Operators (U+2200–U+22FF), Dingbats (U+2700–U+27BF, mostly safe). When in doubt, append U+FE0E (text variation selector) or pick a different symbol.
