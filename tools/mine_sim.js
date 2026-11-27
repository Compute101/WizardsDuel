// The Stoneheart Delve in Node: plays a scripted plan and prints how the crew got on.
// node tools/mine_sim.js [days] [seed]
const M = require('../js/mine_engine.js');
const days = +process.argv[2] || 6,
  seed = +process.argv[3] || 7;
const S = M.newGame(seed),
  gy = Math.floor(M.H / 2);
// a main gallery east from the gate, a hall north of it with a pillar lattice, bedrooms south
M.designate(S, 'dig', 3, gy - 1, 30, gy);
M.designate(S, 'dig', 6, gy - 7, 14, gy - 3);
M.designate(S, 'dig', 10, gy - 2, 10, gy - 2);
for (const [x, y] of [
  [8, gy - 6],
  [12, gy - 6],
  [8, gy - 4],
  [12, gy - 4]
])
  M.designate(S, 'pillar', x, y, x, y);
for (let k = 0; k < 4; k++) {
  const x = 6 + k * 4;
  M.designate(S, 'dig', x, gy + 2, x + 2, gy + 3);
  M.designate(S, 'dig', x + 1, gy + 1, x + 1, gy + 1);
}
M.designate(S, 'dig', 18, gy + 1, 26, gy + 6);
const plan = [
  [0.4, () => M.designate(S, 'room:workshop', 23, gy + 4, 26, gy + 6)],
  [0.6, () => M.designate(S, 'room:stockpile', 18, gy + 1, 22, gy + 6)],
  ...[0, 1, 2, 3].map(k => [0.9, () => M.designate(S, 'room:bedroom', 6 + k * 4, gy + 2, 8 + k * 4, gy + 3)]),
  [1.1, () => M.designate(S, 'room:dining', 6, gy - 7, 14, gy - 3)],
  [1.2, () => M.designate(S, 'smooth', 5, gy - 8, 15, gy - 2)],
  [1.3, () => M.designate(S, 'room:brewery', 23, gy + 1, 26, gy + 3)]
];
let logged = 0;
for (let s = 0; s < days * M.DAY; s += 1) {
  for (const p of plan)
    if (!p.done && s >= p[0] * M.DAY && s % 20 === 0) {
      const r = p[1]();
      if (!r || r.ok !== false) p.done = 1;
    }
  // a farm wherever soil got dug out, and a brewery once there's room
  if (s % 30 === 0) {
    S.tiles.forEach((t, i) => {
      if (t.k === 'f' && t.o === 'soil' && !t.r) {
        const x = i % M.W,
          y = (i / M.W) | 0;
        // not where the plan's own rooms are meant to go (the workshop, stockpile and brewery corner)
        if (!(x >= 18 && x <= 26 && y >= gy + 1 && y <= gy + 6)) M.designate(S, 'room:farm', x, y, x, y);
      }
    });
  }
  M.tick(S, 1);
}
const eye = M.notePatterns(S).eye;
const dug = S.tiles.filter(t => t.k === 'f').length,
  left = S.tiles.filter(t => t.d).length;
console.log(`day ${M.dayOf(S)}: dug ${dug}, still marked ${left}, items lying ${S.items.length}`);
console.log('stock', JSON.stringify(S.stock));
console.log('rooms', S.rooms.map(r => r.type + ':' + M.roomStars(S, r) + '★').join(' '));
console.log(
  'eye',
  eye.score,
  JSON.stringify(Object.fromEntries(Object.entries(eye.parts).map(([k, v]) => [k, +v.toFixed(2)]))),
  'waste',
  eye.waste,
  'patterns',
  eye.patterns.join(',')
);
for (const d of S.dwarves)
  console.log(
    ' ',
    d.name.padEnd(22),
    d.trade.padEnd(7),
    M.levelOf(d).name.padEnd(10),
    'grudges',
    d.grudges.length,
    'needs',
    Object.values(d.needs)
      .map(v => v | 0)
      .join('/'),
    '|',
    d.act
  );
console.log('log tail:');
S.log.slice(-8).forEach(l => console.log('  d' + (Math.floor(l.t / M.DAY) + 1), l.msg));
