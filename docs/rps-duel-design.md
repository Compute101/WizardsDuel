# Elemental Duel — Damage / Protection / Dispel design

Agreed design for moving duels to a rock-paper-scissors core:
**Protection beats Damage, Dispel beats Protection, Damage beats Dispel.**

## Round flow (Phase 1 — implemented)

1. **Pick (secret).** Each seat picks in turn. In pass-the-phone mode every pick sits behind a
   handoff screen, and the minigame runs during the pick. Nothing resolves yet. A frozen seat
   is skipped automatically.
2. **Reveal.** Once every seat has picked: "Place the phone where every wizard can see" → **Reveal!**
   → all cards flip face-up together → **Fight!** (it also starts automatically after a few seconds).
   Against the AI the reveal is a quick, auto-advancing flip.
3. **Resolve** on the shared screen.
4. **Round-end ticks** on the shared screen (DoTs, regen, summons, passive mana), then the next pick phase.

Code: `PLAYERS`, `gs.pending`, `beginPickPhase` → `promptNextPicker` → `commitPick` →
`showReveal` → `resolveSimRound` → `endSimRound` → `runRoundTicks` → `tickRound` in `js/game.js`.
Win checks inside a simultaneous window go through `deferWinCheck` / `settleWin`, so a double KO is a draw.

## Core rules (Phase 3 — to build)

**Categories**: Damage (medium cost, the only way to win), Protection (high cost, persistent),
Dispel (low cost, strips shields and enchantments, can target self).

**Strength rings**: the radial wheel has one sector per type; clicking nearer the rim casts stronger.

Starting numbers (to be tuned):

| Ring | Damage (cost → dmg) | Shield (cost → shield HP) | Dispel (cost → shield dmg) |
|---|---|---|---|
| Inner  | 3 → 8  | 5 → 20  | 1 → 15 |
| Middle | 5 → 15 | 8 → 35  | 2 → 30 |
| Outer  | 8 → 26 | 12 → 55 | 4 → 50 |

- **Shields** take half damage from their chosen type, last **3 rounds**, and **decay** each round.
- **Dispels** deal double to a shield of the matching type.
- **Resolution stages** replace `ACTION_PRIORITY`: start-of-round → all Protection → all Dispel → all Damage → end-of-round.
- **Mana**: fixed income every round (about +4). **Channel is removed**, and so are free (0-cost) spells.
- **Piercing is removed** (Lightning, Radiant, Feint, Charge). Those spells get a mana-burn rider instead.
- **Freeze** no longer skips a turn. Instead, next round you can't pick one category, and everyone can see which.
- **Haste is removed.**
- **Everyone gets Shields.** Eldrin's cost less.

**Damage types** (6, one wheel sector each): fire, ice, lightning, arcane, physical, dark/necrotic.

## Minigames (Phase 2)

- 5 s to watch the glyphs, then 5 s to enter them.
- The minigame decides success or fizzle. The strength ring sets its difficulty: inner is 2 glyphs, outer is 4.
- The Arcana alphabet and the canonical words in CLAUDE.md still apply.

## Characters (Phase 4) — option B + C

- Each signature spell becomes a *flavoured* sector of a category. For example, Flame Shield is a fire
  shield that burns attackers, and Drain is dark damage with lifesteal.
- Spells that fit no category (Heal, Empower, Silence, Raise Dead, Simulacrum, …) become
  **enchantments**: they sit in the protection tier and Dispel can remove them.

## Multiplayer (Phase 6)

3–4 seats use the same pick → reveal → resolve flow. Still to do:
- target selection for Damage and Dispel
- seat layout
- N-player win conditions
- kingmaking counter-play

Foundations already in place: `PLAYERS`, per-seat `gs.pending`, `tickRound(who)`, and tiered resolution.
