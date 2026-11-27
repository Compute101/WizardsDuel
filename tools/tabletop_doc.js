// Rewrites the character section of docs/tabletop-rules.md from tabletop.json (and the base-spell
// table from the rules in js/tabletop.js), so the rulebook always matches what the simulator balanced.
// Run after any tabletop balance change:   node tools/tabletop_doc.js
const fs = require('fs'),
  path = require('path');
const root = path.join(__dirname, '..');
const TT = require(path.join(root, 'js/tabletop.js'));
const chars = TT.load(
  require(path.join(root, 'characters.json')),
  require(path.join(root, 'tabletop.json')),
  require(path.join(root, 'fighters.json'))
);
const R = TT.RULES;
const RING = ['Lesser', 'Normal', 'Greater'];
const ELEM = {
  fire: 'Fire',
  ice: 'Ice',
  lightning: 'Lightning',
  arcane: 'Arcane',
  earth: 'Earth',
  dark: 'Dark',
  water: 'Water',
  air: 'Air'
};
const CAT = { damage: 'Damage', protect: 'Protection', dispel: 'Dispel' };

// Base spells are the same in every rule set; Beginner and Normal flick budget minus the cost,
// Advanced pots a wink per level
const budget = TT.PRESETS.normal.chances.budget;
let base =
  '| Level | Cost | Damage | Ward | Dispel | Flicks | Advanced: winks to pot |\n|---|---|---|---|---|---|---|\n';
[0, 1, 2].forEach(i => {
  const c = R.cats;
  base += `| ${RING[i]} | ${c.damage.cost[i]} | ${c.damage.power[i]} | ${c.protect.power[i]} | ${c.dispel.power[i]} | ${budget - c.damage.cost[i]} | ${R.winks[i]} |\n`;
});

let out = '';
Object.values(chars).forEach(c => {
  const notes = [`Attack **${c.atk}**`];
  if (c.skin)
    notes.push(
      `Skin: **${c.skin.name}** (${c.skin.cost} mana, soaks ${c.skin.soak} blows) instead of Ironskin`
    );
  if (c.deathless) notes.push(`Deathless: when knocked to 0 HP, pay ${c.deathless} mana to stay on 1 HP`);
  if (c.sealAll) notes.push('Normal rules: Seal Ward seals every one of your ward piles at once');
  if (c.forbidden.length) notes.push("Can't cast: " + c.forbidden.map(e => ELEM[e]).join(', '));
  // "hp" is the Normal rules' (Beginner uses it too); other rule sets can change it
  const alt = ['beginner', 'normal', 'advanced']
    .filter(r => c.alt[r] && c.alt[r].hp != null && c.alt[r].hp !== c.baseHp)
    .map(r => `${r[0].toUpperCase() + r.slice(1)} rules: **${c.alt[r].hp}**`);
  out += `### ${c.name} — ${c.title}\n**HP ${c.baseHp}**${alt.length ? ` (${alt.join(', ')})` : ''} · ${notes.join(' · ')}\n\n`;
  out += '| Spell | Type | Element | Level | Cost | Effect |\n|---|---|---|---|---|---|\n';
  c.spells.forEach(s => {
    out += `| **${s.name}** | ${CAT[s.cat]} | ${ELEM[s.elem]} | ${RING[s.ring - 1]} | ${s.cost} | ${s.text} |\n`;
  });
  out += '\n';
});

const file = path.join(root, 'docs/tabletop-rules.md');
let doc = fs.readFileSync(file, 'utf8');
const swap = (name, body) => {
  const re = new RegExp(`(<!-- ${name}:start -->\\n)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(doc)) throw new Error('markers missing: ' + name);
  doc = doc.replace(re, `$1${body}$2`);
};
swap('base-spells', base);
swap('characters', out);

// Survival: the wave ladder, with each wave's fighters in each rule set
const RS = TT.RULE_SETS,
  cap = r => r[0].toUpperCase() + r.slice(1);
const nm = k => k[0].toUpperCase() + k.slice(1);
let enc =
  '| Wave | Fighters | ' + RS.map(cap).join(' | ') + ' |\n|---|---|' + RS.map(() => '---|').join('') + '\n';
TT.WAVES.forEach((w, i) => {
  const counts = {};
  w.members.forEach(k => (counts[k] = (counts[k] || 0) + 1));
  const L = TT.LEVELS[w.level].name;
  const who = Object.keys(counts)
    .map(
      k => (counts[k] > 1 ? counts[k] + ' ' : '') + (L ? L + ' ' : '') + nm(k) + (counts[k] > 1 ? 's' : '')
    )
    .join(', ');
  const cells = RS.map(r => {
    TT.useRules(r);
    return Object.keys(counts)
      .map(k => {
        const f = TT.fighters[k],
          lv = TT.LEVELS[w.level];
        return `${nm(k)} ${Math.max(1, Math.round(f.hp * lv.hp))} HP, Attack ${f.atk + lv.atk}`;
      })
      .join('; ');
  });
  enc += `| **${i + 1}. ${w.name}** | ${who} | ${cells.join(' | ')} |\n`;
});
TT.useRules('normal');
swap('encounters', enc);
fs.writeFileSync(file, doc);
console.log('Updated', path.relative(root, file), '—', Object.keys(chars).length, 'characters');
