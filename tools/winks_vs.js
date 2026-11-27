// Winks: one player's real games against another's, every pairing of wizards.
//   node tools/winks_vs.js [games a pairing] [player A] [player B]     (default 200 daddy b)
// Rows are A's wizard, columns B's; each cell is A's win rate (a draw counts half).
const TT = require('../js/tabletop.js');
TT.load(require('../characters.json'), require('../tabletop.json'), require('../fighters.json'));
TT.useRules('winks');
const EIGHT = ['eldrin', 'mal', 'gnash', 'valdris', 'cinder', 'skadi', 'mary', 'sylvara'];
const games = +process.argv[2] || 200,
  A = process.argv[3] || 'daddy',
  B = process.argv[4] || 'b';
const name = k => TT.chars[k].name[0] + TT.chars[k].name.slice(1).toLowerCase();
const res = {};
EIGHT.forEach(a =>
  EIGHT.forEach(b => {
    let w = 0;
    for (let g = 0; g < games; g++) {
      const r = TT.simMatch(a, b, 'normal', { scores: { p1: TT.WINK_SCORES[A], p2: TT.WINK_SCORES[B] } });
      if (r.winner === 'p1') w++;
      else if (r.winner === 'draw') w += 0.5;
    }
    res[a + '|' + b] = (w / games) * 100;
  })
);
const pad = (s, n) => String(s).padEnd(n);
console.log(`${A}'s wizard (rows) against ${B}'s (columns): ${A}'s win %, ${games} games a pairing`);
console.log(pad('', 10) + EIGHT.map(k => pad(name(k).slice(0, 8), 9)).join('') + 'avg');
EIGHT.forEach(a => {
  const row = EIGHT.map(b => res[a + '|' + b]);
  console.log(
    pad(name(a), 10) +
      row.map(v => pad(v.toFixed(0), 9)).join('') +
      (row.reduce((x, y) => x + y, 0) / row.length).toFixed(1)
  );
});
console.log(
  pad('avg', 10) +
    EIGHT.map(b => pad((EIGHT.reduce((s, a) => s + res[a + '|' + b], 0) / EIGHT.length).toFixed(1), 9)).join(
      ''
    )
);
const all = Object.entries(res).sort((x, y) => x[1] - y[1]);
console.log(
  `\nWorst for ${A}:`,
  all
    .slice(0, 8)
    .map(([k, v]) => k.split('|').map(name).join(' v ') + ' ' + v.toFixed(0) + '%')
    .join(', ')
);
console.log(
  `Best for ${A}:`,
  all
    .slice(-8)
    .reverse()
    .map(([k, v]) => k.split('|').map(name).join(' v ') + ' ' + v.toFixed(0) + '%')
    .join(', ')
);
