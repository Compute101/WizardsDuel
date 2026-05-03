"""
Balance simulation for WizardsDuel v0.8.
Models all 4 characters with their specials; runs 1000 AI-vs-AI battles
per matchup (6 combinations) and reports win rates.

Character stats are read from characters.json — the single source of truth
shared with the game client.

Usage:
  python3 simulate_balance.py
"""

import json, random, os
from itertools import combinations
from dataclasses import dataclass

# ── Load character definitions ────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
CHAR_DEFS = json.load(open(os.path.join(_here, 'characters.json')))

# ── Constants ────────────────────────────────────────────────
MAX_MANA    = 20
BURN_DMG    = 5
BURN_ROUNDS = 2
SPELL_HIT   = 0.80

SPELLS = [
    dict(name='Inferno',        element='fire',      dmg=38, cost=12),
    dict(name='Lightning Bolt', element='lightning', dmg=30, cost=9 ),
    dict(name='Frost Nova',     element='ice',       dmg=18, cost=6 ),
    dict(name='Arcane Surge',   element='arcane',    dmg=0,  cost=9 ),
]

# ── Player state ─────────────────────────────────────────────
@dataclass
class PS:
    hp:        int
    max_hp:    int
    mana:      int
    char_key:  str
    shield:    int   = 0
    burn:      int   = 0
    frozen:    bool  = False   # from Frost Nova spell — no chain
    entangled: bool  = False   # from Sylvara's Entangle — may chain
    counter:   bool  = False
    empowered: bool  = False
    ward:      int   = 0
    weakened:  bool  = False

def make_ps(key):
    c = CHAR_DEFS[key]
    return PS(hp=c['hp'], max_hp=c['hp'], mana=c['startMana'], char_key=key)

# ── Spell resolution ─────────────────────────────────────────
def resolve_spell(spell, caster: PS, target: PS):
    cc = CHAR_DEFS[caster.char_key]
    tc = CHAR_DEFS[target.char_key]

    if spell['element'] == 'arcane':
        dmg = round((15 + random.randint(0, 40)) * cc['dmgMult'])
    else:
        dmg = round(spell['dmg'] * cc['dmgMult'])

    if caster.empowered:
        dmg = round(dmg * cc.get('empowerMult', 1.5))
        caster.empowered = False
    if caster.weakened:
        dmg = round(dmg * tc.get('weakenMult', 0.65))
        caster.weakened = False

    if target.ward > 0:
        if random.random() < tc.get('wardFizzle', 0.15):
            target.ward -= 1
            return 0
        dmg = round(dmg * (1.0 - tc.get('wardAbsorb', 0.25)))
        target.ward -= 1

    counter_triggered = target.shield > 0 and target.counter

    if target.shield > 0:
        if spell['element'] == 'lightning':
            pass
        else:
            dmg = round(dmg * (1.0 - tc.get('shieldAbsorb', 0.70)))
        target.shield -= 1

    if counter_triggered:
        caster.hp = max(0, caster.hp - tc.get('counterDmg', 20))
        target.counter = False

    target.hp = max(0, target.hp - dmg)

    if spell['element'] == 'fire':
        target.burn = BURN_ROUNDS
    if spell['element'] == 'ice':
        target.frozen = True   # Frost Nova sets frozen, not entangled

    return dmg

# ── AI decision ──────────────────────────────────────────────
def ai_act(me: PS, opp: PS) -> str:
    key = me.char_key
    c   = CHAR_DEFS[key]
    sp  = c['specials']

    if key == 'eldrad':
        if me.shield == 0 and me.mana >= sp[0]['cost'] and me.hp < 75 and random.random() < 0.60:
            return 'special:shield'
        if me.shield > 0 and not me.counter and me.mana >= sp[1]['cost'] and random.random() < 0.45:
            return 'special:counter'

    elif key == 'mal':
        if me.mana == 0 and me.hp > c['bpCost']:
            return 'special:bloodpact'
        affordable_fire = any(s['element'] == 'fire' and me.mana >= s['cost'] for s in SPELLS)
        if not me.empowered and affordable_fire and random.random() < 0.55:
            return 'special:empower'

    elif key == 'sylvara':
        if me.hp < 55 and me.mana >= sp[0]['cost'] and random.random() < 0.72:
            return 'special:heal'
        if (opp.mana >= 9 and me.mana >= sp[1]['cost']
                and not opp.frozen and not opp.entangled and random.random() < 0.60):
            return 'special:entangle'

    elif key == 'aurelia':
        if me.ward == 0 and me.mana >= sp[0]['cost'] and random.random() < 0.45:
            return 'special:ward'
        if not opp.weakened and me.mana >= sp[1]['cost'] and opp.mana >= 9 and random.random() < 0.50:
            return 'special:weaken'

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
    p  = make_ps(key1)
    ai = make_ps(key2)
    c1 = CHAR_DEFS[key1]
    c2 = CHAR_DEFS[key2]

    for _ in range(400):
        # ── P1 burn tick ──
        if p.burn > 0:
            p.hp = max(0, p.hp - BURN_DMG); p.burn -= 1
        if p.hp <= 0: return False

        # ── P1 turn ──
        if p.frozen:
            p.frozen = False                          # Frost Nova: clears, no chain
        elif p.entangled:
            chain = c2.get('entangleChain', 0)
            p.entangled = False
            if chain > 0 and random.random() < chain: # only rolls RNG when Sylvara is opponent
                p.entangled = True
        else:
            action = ai_act(p, ai)
            if action == 'channel':
                p.mana = min(MAX_MANA, p.mana + c1['channelAmt'])
            elif action == 'special:shield':
                p.mana -= c1['specials'][0]['cost']; p.shield = c1['shieldHits']
            elif action == 'special:counter':
                p.mana -= c1['specials'][1]['cost']; p.counter = True
            elif action == 'special:empower':
                p.empowered = True
            elif action == 'special:bloodpact':
                p.hp = max(1, p.hp - c1['bpCost'])
                p.mana = min(MAX_MANA, p.mana + c1['bpGain'])
            elif action == 'special:heal':
                p.mana -= c1['specials'][0]['cost']
                p.hp = min(p.max_hp, p.hp + c1['healAmt'])
            elif action == 'special:entangle':
                p.mana -= c1['specials'][1]['cost']
                ai.hp = max(0, ai.hp - c1['entangleDmg']); ai.entangled = True
                if ai.hp <= 0: return True
            elif action == 'special:ward':
                p.mana -= c1['specials'][0]['cost']; p.ward = c1['wardTurns']
            elif action == 'special:weaken':
                p.mana -= c1['specials'][1]['cost']; ai.weakened = True
            elif action.startswith('spell:'):
                element = action.split(':')[1]
                spell = next(s for s in SPELLS if s['element'] == element)
                if random.random() < SPELL_HIT:
                    p.mana -= spell['cost']
                    resolve_spell(spell, p, ai)
                    if ai.hp <= 0: return True
                else:
                    p.mana = max(0, p.mana - 1)
            if p.shield > 0: p.shield -= 1

        # ── AI burn tick ──
        if ai.burn > 0:
            ai.hp = max(0, ai.hp - BURN_DMG); ai.burn -= 1
        if ai.hp <= 0: return True

        # ── AI turn ──
        if ai.frozen:
            ai.frozen = False                         # Frost Nova: clears, no chain
        elif ai.entangled:
            chain = c1.get('entangleChain', 0)
            ai.entangled = False
            if chain > 0 and random.random() < chain:
                ai.entangled = True
        else:
            action = ai_act(ai, p)
            if action == 'channel':
                ai.mana = min(MAX_MANA, ai.mana + c2['channelAmt'])
            elif action == 'special:shield':
                ai.mana -= c2['specials'][0]['cost']; ai.shield = c2['shieldHits']
            elif action == 'special:counter':
                ai.mana -= c2['specials'][1]['cost']; ai.counter = True
            elif action == 'special:empower':
                ai.empowered = True
            elif action == 'special:bloodpact':
                ai.hp = max(1, ai.hp - c2['bpCost'])
                ai.mana = min(MAX_MANA, ai.mana + c2['bpGain'])
            elif action == 'special:heal':
                ai.mana -= c2['specials'][0]['cost']
                ai.hp = min(ai.max_hp, ai.hp + c2['healAmt'])
            elif action == 'special:entangle':
                ai.mana -= c2['specials'][1]['cost']
                p.hp = max(0, p.hp - c2['entangleDmg']); p.entangled = True
                if p.hp <= 0: return False
            elif action == 'special:ward':
                ai.mana -= c2['specials'][0]['cost']; ai.ward = c2['wardTurns']
            elif action == 'special:weaken':
                ai.mana -= c2['specials'][1]['cost']; p.weakened = True
            elif action.startswith('spell:'):
                element = action.split(':')[1]
                spell = next(s for s in SPELLS if s['element'] == element)
                if random.random() < SPELL_HIT:
                    ai.mana -= spell['cost']
                    resolve_spell(spell, ai, p)
                    if p.hp <= 0: return False
                else:
                    ai.mana = max(0, ai.mana - 1)
            if ai.shield > 0: ai.shield -= 1

    return p.hp > ai.hp

# ── Main ─────────────────────────────────────────────────────
def run(n=1000):
    keys  = list(CHAR_DEFS.keys())
    names = {k: CHAR_DEFS[k]['name'] for k in keys}

    print(f"\n=== WizardsDuel Balance Report ({n} battles per matchup) ===\n")

    overall_wins  = {k: 0 for k in keys}
    overall_games = {k: 0 for k in keys}

    for k1, k2 in combinations(keys, 2):
        w1 = w2 = 0
        for i in range(n):
            if i % 2 == 0:
                if simulate_battle(k1, k2): w1 += 1
                else: w2 += 1
            else:
                if simulate_battle(k2, k1): w2 += 1
                else: w1 += 1

        pct1 = w1 / n * 100
        pct2 = w2 / n * 100
        flag = '  [WARNING: possibly OP]' if max(pct1, pct2) > 58 else ''
        overall_wins[k1] += w1;  overall_wins[k2] += w2
        overall_games[k1] += n;  overall_games[k2] += n
        print(f"  {names[k1]:<10} vs {names[k2]:<10}:  "
              f"{names[k1]} {pct1:5.1f}%  |  {names[k2]} {pct2:5.1f}%{flag}")

    print(f"\n--- Overall win rates across all matchups ---\n")
    for k in keys:
        pct  = overall_wins[k] / overall_games[k] * 100
        flag = '  [WARNING]' if pct > 55 else ('  [WEAK]' if pct < 45 else '')
        print(f"  {names[k]:<10}: {pct:5.1f}%{flag}")
    print()

if __name__ == '__main__':
    random.seed(42)
    run(1000)
