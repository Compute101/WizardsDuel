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
// north of the gallery: kitchen, forge and tavern, the Great Hall and barracks behind them; an infirmary south-east
M.designate(S, 'dig', 16, gy - 3, 18, gy - 2);
M.designate(S, 'dig', 20, gy - 3, 23, gy - 2);
M.designate(S, 'dig', 25, gy - 3, 29, gy - 2);
M.designate(S, 'dig', 19, gy - 5, 19, gy - 2);
M.designate(S, 'dig', 17, gy - 9, 26, gy - 6);
M.designate(S, 'dig', 29, gy - 5, 29, gy - 4);
M.designate(S, 'dig', 28, gy - 9, 30, gy - 6);
M.designate(S, 'dig', 28, gy + 1, 30, gy + 3);
// a dormitory behind the bedrooms for the rest of the crew
M.designate(S, 'dig', 7, gy + 4, 7, gy + 4);
M.designate(S, 'dig', 6, gy + 5, 14, gy + 6);
const plan = [
  [0.4, () => M.designate(S, 'room:workshop', 23, gy + 4, 26, gy + 6)],
  [0.6, () => M.designate(S, 'room:stockpile', 18, gy + 1, 22, gy + 6)],
  ...[0, 1, 2, 3].map(k => [0.9, () => M.designate(S, 'room:bedroom', 6 + k * 4, gy + 2, 8 + k * 4, gy + 3)]),
  [1.0, () => M.designate(S, 'room:dorm', 6, gy + 5, 14, gy + 6)],
  [1.1, () => M.designate(S, 'room:dining', 6, gy - 7, 14, gy - 3)],
  [1.2, () => M.designate(S, 'smooth', 5, gy - 8, 15, gy - 2)],
  [1.3, () => M.designate(S, 'room:brewery', 23, gy + 1, 26, gy + 3)],
  [1.4, () => M.designate(S, 'room:kitchen', 16, gy - 3, 18, gy - 2)],
  [1.5, () => M.designate(S, 'room:forge', 20, gy - 3, 23, gy - 2)],
  [1.6, () => M.designate(S, 'room:tavern', 25, gy - 3, 29, gy - 2)],
  [1.7, () => M.designate(S, 'room:infirmary', 28, gy + 1, 30, gy + 3)],
  [2.0, () => M.designate(S, 'room:greathall', 17, gy - 9, 26, gy - 6)],
  [2.2, () => M.designate(S, 'room:barracks', 28, gy - 9, 30, gy - 6)]
];
// every room the plan will make, read back from its calls, so the farms keep off them
const planned = [];
for (const p of plan) {
  const m = /room:\w+', ([^)]*)\)/.exec(p[1].toString());
  if (m) planned.push(m[1].split(',').map(v => eval(v.replace(/k/g, '0'))));
}
for (let k = 0; k < 4; k++) planned.push([6 + k * 4, gy + 2, 8 + k * 4, gy + 3]);
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
        // not where the plan's own rooms are meant to go
        if (!planned.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1))
          M.designate(S, 'room:farm', x, y, x, y);
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
    d.act,
    d.pick ? '| ' + d.pick.kind + ' pick ' + d.pick.uses : '',
    d.hurt ? '| hurt' : ''
  );
console.log('log tail:');
S.log.slice(-14).forEach(l => console.log('  d' + (Math.floor(l.t / M.DAY) + 1), l.msg));
