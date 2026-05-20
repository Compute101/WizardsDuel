# WizardsDuel — Notes for Claude

## What this is
A browser-based 1v1 wizard duel game. Two players pick spells and cast them via minigames. Built with vanilla JS/Canvas, no framework. Main logic lives in `js/game.js` (~4000 lines). Spell definitions are in `characters.json`.

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

Arcane deliberately shares one glyph with each other element — it's the underlying force of all magic, and the hardest set to memorise in hard mode.

### Planned future spells (not yet assigned)
Suggested glyph sets for when these are implemented:
- **Necromancy** → `☽ ⊗ ∇ Ω`  (moon / void / descent / ending)
- **Enchantment** → `∞ Φ ✸ ⊕`  (endless / harmony / radiance / binding)
- **Polymorph**   → `Δ ∇ ϟ ∞`  (up / down / flux / cycle)

---

## Minigame difficulty system

Each spell's minigame has three difficulty modes. Difficulty is set globally in `diffName` (`'easy'` / `'normal'` / `'hard'`).

### Inferno (launchPatternEcho) — the reference implementation
The Inferno minigame was redesigned as an animated rising-glyph mechanic and serves as the model for how the new system should work in all spells.

**Watch phase:**
- Red glyphs (noise) rise continuously from the bottom — visual distraction.
- White glyphs (the sequence) rise one at a time, staggered 3 s apart, with a coloured glow unique to each glyph and a small order-number badge.
- 4 seconds of viewing time after the last glyph appears before input phase begins.

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

| Mode | Sequence length | Keyboard | Fixed or random |
|------|-----------------|----------|-----------------|
| Easy | 4 | 3×4 grid (all 12 glyphs), non-spell glyphs greyed out | Fixed canonical word |
| Normal | 5 | 3×4 grid, non-spell glyphs greyed out | Random from spell's 4 |
| Hard | 7 | 3×4 grid, nothing greyed out — all 12 active | Random from spell's 4 |

**Easy mode canonical words** (the fixed sequence a player can learn for each spell):

| Spell | Canonical sequence |
|-------|--------------------|
| Inferno | ϟ Δ ⊕ Ω (in that order) |
| Lightning | *(define when implementing)* |
| Ice | *(define when implementing)* |
| Arcane | *(define when implementing)* |

---

## Key file locations

| Thing | File | Approx. lines |
|-------|------|---------------|
| All game logic | `js/game.js` | ~4000 |
| Inferno minigame | `js/game.js` | 3071–3306 |
| Lightning minigame | `js/game.js` | ~3308+ |
| Ice minigame | `js/game.js` | further below |
| Arcane minigame | `js/game.js` | further below |
| Spell definitions | `characters.json` | whole file |
| Puzzle screen HTML | `index.html` | ~174–193 |
| Canvas styling | `css/style.css` | ~374–423 |

---

## Symbol safety rule
Before adding any new Unicode symbol to the game, check it is **not** in the emoji presentation set. Risky blocks: U+2600–U+26FF. Safe blocks: Greek (U+0370–U+03FF), Mathematical Operators (U+2200–U+22FF), Dingbats (U+2700–U+27BF, mostly safe). When in doubt, append U+FE0E (text variation selector) or pick a different symbol.
