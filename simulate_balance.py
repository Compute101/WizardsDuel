"""
Balance simulation for WizardsDuel v0.8.
Models all 4 characters with their specials; runs 1000 AI-vs-AI battles
per matchup (6 combinations) and reports win rates.

Characters:
  ELDRIN   (eldrad) — Shield + Counter
  MALACHAR (mal)    — Empower + Blood Pact
  SYLVARA  (sylvara)— Heal + Entangle
  AURELIA  (aurelia)— Ward + Weaken

Usage:
  python3 simulate_balance.py
"""

import random
from itertools import combinations
from dataclasses import dataclass, field

# ── Constants ────────────────────────────────────────────────
MAX_MANA    = 20
BURN_DMG    = 5
BURN_ROUNDS = 2
SPELL_HIT   = 0.80   # probability AI casts a spell successfully

SPELLS = [
    dict(name='Inferno',        element='fire',      dmg=38, cost=12),
    dict(name='Lightning Bolt', element='lightning', dmg=30, cost=9 ),
    dict(name='Frost Nova',     element='ice',       dmg=18, cost=6 ),
    dict(name='Arcane Surge',   element='arcane',    dmg=0,  cost=9 ),
]

CHARS = {
    # Tank: reliable shield + counter, strong damage to compensate for being reactive
    'eldrad':  dict(name='ELDRIN',   hp=115, startMana=5,  channelAmt=4, dmgMult=1.20,
                    shieldHits=2, shieldAbsorb=0.70, counterDmg=20),
    # Burst: free empower +50% = 38*1.10*1.50 ≈ 63 dmg ≈ Inferno+free FrostNova
    'mal':     dict(name='MALACHAR', hp=80,  startMana=7,  channelAmt=4, dmgMult=1.10,
                    empowerMult=1.50, bpCost=22, bpGain=7),
    # Sustain: heal is decent; Entangle enables tempo plays
    'sylvara': dict(name='SYLVARA',  hp=92,  startMana=6,  channelAmt=4, dmgMult=1.0,
                    healAmt=20, entangleCost=5),
    # Control: weaker ward (25% absorb), moderate weaken (-35%)
    'aurelia': dict(name='AURELIA',  hp=90,  startMana=6,  channelAmt=4, dmgMult=1.10,
                    wardTurns=2, wardCost=3, wardAbsorb=0.25, weakenCost=3, weakenMult=0.65),
}

# ── Player state ─────────────────────────────────────────────
@dataclass
class PS:
    hp:       int
    max_hp:   int
    mana:     int
    char_key: str
    shield:   int   = 0      # ELDRIN: remaining hit count (shieldHits on activation)
    burn:     int   = 0
    frozen:   bool  = False
    counter:  bool  = False   # ELDRIN: reflects 15 on hit while shielded
    empowered:bool  = False   # MALACHAR: next spell +50%
    ward:     int   = 0       # AURELIA: turns of 50%-absorb+15%-fizzle barrier
    weakened: bool  = False   # Any: this player's next spell −40%

def make_ps(key):
    c = CHARS[key]
    return PS(hp=c['hp'], max_hp=c['hp'], mana=c['startMana'], char_key=key)

# ── Spell resolution ─────────────────────────────────────────
def resolve_spell(spell, caster: PS, target: PS):
    """Apply a spell from caster to target. Returns actual dmg dealt."""
    c = CHARS[caster.char_key]
    if spell['element'] == 'arcane':
        dmg = round((15 + random.randint(0, 40)) * c['dmgMult'])
    else:
        dmg = round(spell['dmg'] * c['dmgMult'])

    cc = CHARS[caster.char_key]
    tc = CHARS[target.char_key]

    # Caster modifiers
    if caster.empowered:
        dmg = round(dmg * cc.get('empowerMult', 1.5))
        caster.empowered = False
    if caster.weakened:
        # weakenMult stored on the opponent (Aurelia) who applied Weaken
        dmg = round(dmg * 0.60)
        caster.weakened = False

    # Target: Ward (check before shield)
    if target.ward > 0:
        if random.random() < 0.15:        # fizzle
            target.ward -= 1
            return 0
        dmg = round(dmg * (1.0 - CHARS[target.char_key].get('wardAbsorb', 0.5)))
        target.ward -= 1

    # Counter check (before shield breaks)
    counter_triggered = False
    if target.shield > 0 and target.counter:
        counter_triggered = True

    # Target: Shield
    if target.shield > 0:
        if spell['element'] == 'lightning':
            pass  # pierces: full dmg, shield decrements
        else:
            absorb = CHARS[target.char_key].get('shieldAbsorb', 0.70)
            dmg = round(dmg * (1.0 - absorb))
        target.shield -= 1

    # Counter reflect (triggers each hit while shielded, but only if counter is still active)
    if counter_triggered:
        caster.hp = max(0, caster.hp - CHARS[target.char_key].get('counterDmg', 15))
        target.counter = False

    target.hp = max(0, target.hp - dmg)

    # Effects
    if spell['element'] == 'fire':
        target.burn = BURN_ROUNDS
    if spell['element'] == 'ice':
        target.frozen = True

    return dmg

# ── AI decision ──────────────────────────────────────────────
def ai_act(me: PS, opp: PS) -> str:
    """Return action string. 'spell:<element>' for spells."""
    key = me.char_key

    c = CHARS[key]

    # ── ELDRIN ──
    if key == 'eldrad':
        if me.shield == 0 and me.mana >= 3 and me.hp < 75 and random.random() < 0.60:
            return 'special:shield'
        if me.shield > 0 and not me.counter and me.mana >= 3 and random.random() < 0.45:
            return 'special:counter'

    # ── MALACHAR ──
    elif key == 'mal':
        bp_cost = c.get('bpCost', 15)
        if me.mana == 0 and me.hp > bp_cost:
            return 'special:bloodpact'
        affordable_fire = any(s['element'] == 'fire' and me.mana >= s['cost'] for s in SPELLS)
        if not me.empowered and affordable_fire and random.random() < 0.55:
            return 'special:empower'

    # ── SYLVARA ──
    elif key == 'sylvara':
        entangle_cost = c.get('entangleCost', 5)
        if me.hp < 55 and me.mana >= 5 and random.random() < 0.72:
            return 'special:heal'
        if opp.mana >= 9 and me.mana >= entangle_cost and not opp.frozen and random.random() < 0.60:
            return 'special:entangle'

    # ── AURELIA ──
    elif key == 'aurelia':
        ward_cost = c.get('wardCost', 3)
        weaken_cost = c.get('weakenCost', 3)
        if me.ward == 0 and me.mana >= ward_cost and random.random() < 0.45:
            return 'special:ward'
        if not opp.weakened and me.mana >= weaken_cost and opp.mana >= 9 and random.random() < 0.50:
            return 'special:weaken'

    # Spell selection
    affordable = [s for s in SPELLS if me.mana >= s['cost']]
    if affordable:
        spell = None
        if opp.shield > 0:
            spell = next((s for s in affordable if s['element'] == 'lightning'), None)
        if spell is None and opp.shield == 0:
            spell = next((s for s in affordable if s['element'] == 'fire'), None)
        if spell is None and opp.mana >= 3:
            spell = next((s for s in affordable if s['element'] == 'ice'), None)
        if spell is None:
            spell = random.choice(affordable)
        return f"spell:{spell['element']}"

    return 'channel'

# ── Simulate one battle ───────────────────────────────────────
def simulate_battle(key1, key2):
    """Returns True if key1 wins."""
    p = make_ps(key1)
    ai = make_ps(key2)

    for _ in range(400):   # round cap (shouldn't normally hit)
        # ── P1 burn tick ──
        if p.burn > 0:
            p.hp = max(0, p.hp - BURN_DMG)
            p.burn -= 1
        if p.hp <= 0: return False

        # ── P1 frozen ──
        if p.frozen:
            p.frozen = False
        else:
            # P1 acts
            action = ai_act(p, ai)

            if action == 'channel':
                p.mana = min(MAX_MANA, p.mana + CHARS[key1]['channelAmt'])

            elif action == 'special:shield':
                p.mana -= 3; p.shield = CHARS[key1].get('shieldHits', 1)

            elif action == 'special:counter':
                p.mana -= 3; p.counter = True

            elif action == 'special:empower':
                p.empowered = True

            elif action == 'special:bloodpact':
                c1 = CHARS[key1]
                p.hp = max(1, p.hp - c1.get('bpCost', 15))
                p.mana = min(MAX_MANA, p.mana + c1.get('bpGain', 8))

            elif action == 'special:heal':
                p.mana -= 4
                p.hp = min(p.max_hp, p.hp + CHARS[key1].get('healAmt', 25))

            elif action == 'special:entangle':
                p.mana -= CHARS[key1].get('entangleCost', 5)
                ai.hp = max(0, ai.hp - 12)
                ai.frozen = True
                if ai.hp <= 0: return True

            elif action == 'special:ward':
                c1 = CHARS[key1]
                p.mana -= c1.get('wardCost', 3); p.ward = c1.get('wardTurns', 2)

            elif action == 'special:weaken':
                p.mana -= CHARS[key1].get('weakenCost', 3); ai.weakened = True

            elif action.startswith('spell:'):
                element = action.split(':')[1]
                spell = next(s for s in SPELLS if s['element'] == element)
                if random.random() < SPELL_HIT:
                    p.mana -= spell['cost']
                    resolve_spell(spell, p, ai)
                    if ai.hp <= 0: return True
                else:
                    p.mana = max(0, p.mana - 1)   # fizzle penalty

            # Shield expires end-of-turn if not hit
            if p.shield > 0:
                p.shield -= 1

        # ── AI burn tick ──
        if ai.burn > 0:
            ai.hp = max(0, ai.hp - BURN_DMG)
            ai.burn -= 1
        if ai.hp <= 0: return True

        # ── AI frozen ──
        if ai.frozen:
            ai.frozen = False
        else:
            action = ai_act(ai, p)

            if action == 'channel':
                ai.mana = min(MAX_MANA, ai.mana + CHARS[key2]['channelAmt'])

            elif action == 'special:shield':
                ai.mana -= 3; ai.shield = CHARS[key2].get('shieldHits', 1)

            elif action == 'special:counter':
                ai.mana -= 3; ai.counter = True

            elif action == 'special:empower':
                ai.empowered = True

            elif action == 'special:bloodpact':
                c2 = CHARS[key2]
                ai.hp = max(1, ai.hp - c2.get('bpCost', 15))
                ai.mana = min(MAX_MANA, ai.mana + c2.get('bpGain', 8))

            elif action == 'special:heal':
                ai.mana -= 4
                ai.hp = min(ai.max_hp, ai.hp + CHARS[key2].get('healAmt', 25))

            elif action == 'special:entangle':
                ai.mana -= CHARS[key2].get('entangleCost', 5)
                p.hp = max(0, p.hp - 12)
                p.frozen = True
                if p.hp <= 0: return False

            elif action == 'special:ward':
                c2 = CHARS[key2]
                ai.mana -= c2.get('wardCost', 3); ai.ward = c2.get('wardTurns', 2)

            elif action == 'special:weaken':
                ai.mana -= CHARS[key2].get('weakenCost', 3); p.weakened = True

            elif action.startswith('spell:'):
                element = action.split(':')[1]
                spell = next(s for s in SPELLS if s['element'] == element)
                if random.random() < SPELL_HIT:
                    ai.mana -= spell['cost']
                    resolve_spell(spell, ai, p)
                    if p.hp <= 0: return False
                else:
                    ai.mana = max(0, ai.mana - 1)

            # Shield expires end-of-turn if not hit
            if ai.shield > 0:
                ai.shield -= 1

    # Round cap: whoever has more HP wins
    return p.hp > ai.hp

# ── Main ─────────────────────────────────────────────────────
def run(n=1000):
    keys = list(CHARS.keys())
    names = {k: CHARS[k]['name'] for k in keys}

    print(f"\n=== WizardsDuel Balance Report ({n} battles per matchup) ===\n")

    overall_wins = {k: 0 for k in keys}
    overall_games = {k: 0 for k in keys}

    results = []
    for k1, k2 in combinations(keys, 2):
        w1 = w2 = 0
        for i in range(n):
            # Alternate who goes first to neutralise first-mover advantage
            if i % 2 == 0:
                if simulate_battle(k1, k2): w1 += 1
                else: w2 += 1
            else:
                if simulate_battle(k2, k1): w2 += 1
                else: w1 += 1

        pct1 = w1 / n * 100
        pct2 = w2 / n * 100
        flag = '  [WARNING: possibly OP]' if max(pct1, pct2) > 58 else ''
        results.append((k1, k2, pct1, pct2, flag))

        overall_wins[k1] += w1
        overall_wins[k2] += w2
        overall_games[k1] += n
        overall_games[k2] += n

        print(f"  {names[k1]:<10} vs {names[k2]:<10}:  "
              f"{names[k1]} {pct1:5.1f}%  |  {names[k2]} {pct2:5.1f}%{flag}")

    print(f"\n--- Overall win rates across all matchups ---\n")
    for k in keys:
        pct = overall_wins[k] / overall_games[k] * 100
        flag = '  [WARNING]' if pct > 55 else ('  [WEAK]' if pct < 45 else '')
        print(f"  {names[k]:<10}: {pct:5.1f}%{flag}")

    print()

if __name__ == '__main__':
    random.seed(42)
    run(1000)
