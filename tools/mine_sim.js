// The Stoneheart Delve in Node: plays a scripted plan and prints how the crew got on.
// node tools/mine_sim.js [days] [seed]
const M = require('../js/mine_engine.js');
const days = +process.argv[2] || 6,
  seed = +process.argv[3] || 7;
const S = M.newGame(seed),
  gy = Math.floor(M.LH / 2);
// A main gallery east from the gate, with every room set back from it behind a one-tile doorway (where the
// script hangs its doors): north, a pillared dining hall, a kitchen, a forge and a tavern, the Great Hall and
// the barracks behind them; south, four bedrooms and a dormitory, a stockpile, a brewery, the mason's
// workshop and an infirmary.
const dig = (x0, y0, x1 = x0, y1 = y0) => M.designate(S, 'dig', x0, y0, x1, y1);
dig(3, gy - 1, 31, gy);
dig(6, gy - 7, 14, gy - 3); // dining hall
dig(10, gy - 2, 10, gy - 2);
for (const [x, y] of [
  [8, gy - 6],
  [12, gy - 6],
  [8, gy - 4],
  [12, gy - 4]
])
  M.designate(S, 'pillar', x, y, x, y);
dig(16, gy - 4, 18, gy - 3); // kitchen
dig(17, gy - 2);
dig(22, gy - 4, 25, gy - 3); // forge
dig(23, gy - 2);
dig(27, gy - 4, 31, gy - 3); // tavern
dig(29, gy - 2);
dig(17, gy - 12, 26, gy - 7); // the Great Hall (10 × 6, 60 tiles, enough for its second star), up a passage from the gallery
dig(20, gy - 6, 20, gy - 2);
dig(28, gy - 12, 30, gy - 7); // barracks, through a door from the Great Hall
dig(27, gy - 8);
for (let k = 0; k < 4; k++) {
  const x = 3 + k * 4;
  dig(x, gy + 2, x + 2, gy + 3); // bedrooms
  dig(x + 1, gy + 1);
}
dig(4, gy + 4); // the dormitory, behind the first bedroom
dig(3, gy + 5, 13, gy + 6);
dig(19, gy + 1, 22, gy + 6); // stockpile (open to the gallery: it needs no door)
dig(24, gy + 2, 27, gy + 3); // brewery
dig(25, gy + 1);
dig(24, gy + 5, 27, gy + 7); // workshop, through a door from the stockpile
dig(23, gy + 6);
dig(29, gy + 2, 31, gy + 4); // infirmary
dig(30, gy + 1);
const plan = [
  [0.4, () => M.designate(S, 'room:workshop', 24, gy + 5, 27, gy + 7)],
  [0.6, () => M.designate(S, 'room:stockpile', 19, gy + 1, 22, gy + 6)],
  ...[0, 1, 2, 3].map(k => [0.9, () => M.designate(S, 'room:bedroom', 3 + k * 4, gy + 2, 5 + k * 4, gy + 3)]),
  [1.0, () => M.designate(S, 'room:dorm', 3, gy + 5, 13, gy + 6)],
  [1.1, () => M.designate(S, 'room:dining', 6, gy - 7, 14, gy - 3)],
  [1.2, () => M.designate(S, 'smooth', 5, gy - 8, 15, gy - 2)],
  [1.3, () => M.designate(S, 'room:brewery', 24, gy + 2, 27, gy + 3)],
  [1.4, () => M.designate(S, 'room:kitchen', 16, gy - 4, 18, gy - 3)],
  [1.5, () => M.designate(S, 'room:forge', 22, gy - 4, 25, gy - 3)],
  [1.6, () => M.designate(S, 'room:tavern', 27, gy - 4, 31, gy - 3)],
  [1.7, () => M.designate(S, 'room:infirmary', 29, gy + 2, 31, gy + 4)],
  [2.0, () => M.designate(S, 'room:greathall', 17, gy - 12, 26, gy - 7)],
  [2.2, () => M.designate(S, 'room:barracks', 28, gy - 12, 30, gy - 7)]
];
// every room the plan will make, read back from its calls, so the farms keep off them
const planned = [];
for (const p of plan) {
  const m = /room:\w+', ([^)]*)\)/.exec(p[1].toString());
  if (m) planned.push(m[1].split(',').map(v => eval(v.replace(/k/g, '0'))));
}
for (let k = 0; k < 4; k++) planned.push([3 + k * 4, gy + 2, 5 + k * 4, gy + 3]);
const deepCut = {};
let logged = 0;
for (let s = 0; s < days * M.DAY; s += 1) {
  for (const p of plan)
    if (!p.done && s >= p[0] * M.DAY && s % 20 === 0) {
      const r = p[1]();
      if (!r || r.ok !== false) p.done = 1;
    }
  // like a player: follow any ore in sight, cut a passage to the deep spot once it's known (or to where
  // Durin will find it), and the stair down as soon as the quota allows; then the same on the next layer
  if (s % 30 === 5) {
    const z = S.depth;
    S.tiles.forEach((t, i) => {
      if (t.s && t.k === 'r' && t.o && t.o !== 'soil' && !t.d && !t.sr && M.layerOf((i / M.W) | 0) >= 0) {
        const x = i % M.W,
          y = (i / M.W) | 0;
        if (
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ].some(([a, b]) => M.isFloor(S, x + a, y + b))
        )
          M.designate(S, 'dig', x, y, x, y);
      }
    });
    const dc = S.deep[z];
    if (dc != null && !deepCut[z] && (z > 0 || s > M.DAY * 2.5)) {
      deepCut[z] = 1;
      const dx = dc % M.W,
        dy = (dc / M.W) | 0,
        from = z ? S.links[z - 1][1] : M.idx(3, gy),
        fx = from % M.W,
        fy = (from / M.W) | 0;
      // an L: along the row, then up or down to the spot's side
      M.designate(S, 'dig', Math.min(fx, dx), fy, Math.max(fx, dx), fy);
      M.designate(S, 'dig', dx, Math.min(fy, dy + 2), dx, Math.max(fy, dy + 2));
    }
    if (!M.stairWhy(S, z) && !M.stairOf(S, z)) M.cutStair(S, z);
  }
  // a door on every way into a room (the way a player would, before it can earn a second star)
  if (s % 30 === 15)
    for (const r of S.rooms)
      for (const i of M.roomOpenings(S, r))
        M.designate(S, 'build:door', i % M.W, (i / M.W) | 0, i % M.W, (i / M.W) | 0);
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
  'depth',
  S.depth + 1,
  'quota',
  M.quotaOf(S, S.depth)
    .map(q => q.kind + ' ' + q.got + '/' + q.need)
    .join(', '),
  'cave-ins',
  S.caveIns || 0,
  'dead',
  S.dead.map(d => d.name).join(', ') || 'none'
);
console.log(
  'doors',
  S.tiles.filter(t => t.dr).length,
  'open ways in',
  S.rooms.reduce((n, r) => n + M.roomOpenings(S, r).length, 0)
);
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
