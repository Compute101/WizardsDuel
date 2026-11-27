// Quick standard-game duel sim: every ordered pair of wizards, with optional tweaks, printing win rates
// and how often the wizards pick each kind of move (Actions, Ironskin, …).
//
//   node tools/app_sim.js [gamesPerPair=10] ["PRE js run in the page first"]
//   e.g. node tools/app_sim.js 20 "CHAR_DEFS.nerissa.hp=55"
//
// Lighter than tools/ward_compare.js (no ward presets), for testing one change at a time.
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const { chromium } = require('playwright');
const games = +(process.argv[2] || 10),
  pre = process.argv[3] || '';
const root = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch(),
    page = await browser.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(() => Object.keys(CHAR_DEFS).length && Object.keys(FIGHTER_DEFS).length, null, {
    timeout: 60000
  });
  if (pre) await page.evaluate(pre);
  const out = await page.evaluate(games => {
    const keys = Object.keys(CHAR_DEFS),
      w = {},
      n = {},
      picks = {};
    keys.forEach(k => {
      w[k] = 0;
      n[k] = 0;
    });
    keys.forEach(a =>
      keys.forEach(b => {
        if (a === b) return;
        for (let g = 0; g < games; g++) {
          const r = simMatch(a, b, 'normal');
          n[a]++;
          n[b]++;
          if (r.winner === 'p1') w[a]++;
          else if (r.winner === 'p2') w[b]++;
          else {
            w[a] += 0.5;
            w[b] += 0.5;
          }
          ['p1', 'p2'].forEach(s =>
            Object.entries(r.picks[s] || {}).forEach(([k, v]) => (picks[k] = (picks[k] || 0) + v))
          );
        }
      })
    );
    return { rates: keys.map(k => [k, (w[k] / n[k]) * 100]).sort((x, y) => y[1] - x[1]), picks };
  }, games);
  await browser.close();
  server.close();
  const r = out.rates;
  console.log(`range ${r[r.length - 1][1].toFixed(1)}–${r[0][1].toFixed(1)}%`);
  console.log(r.map(([k, v]) => (Math.abs(v - 50) > 8 ? '!' : '') + k + ' ' + v.toFixed(1)).join(' · '));
  const t = Object.values(out.picks).reduce((a, b) => a + b, 0);
  console.log(
    'picks: ' +
      ['attack', 'guard', 'grapple', 'skin']
        .map(k => k + ' ' + (((out.picks[k] || 0) / t) * 100).toFixed(1) + '%')
        .join(' · ')
  );
})();
