// Survival balance: every wizard runs the wave ladder (SURVIVAL_WAVES in js/game.js) `runs` times, AI on
// both sides. There's no 50% target: a wizard should swat the early waves, most runs should end somewhere
// in the second half, and a full clear should be an achievement.
//
//   node tools/encounter_sim.js [runsPerWizard=20] [ai=normal]
//
// Prints, for the whole roster: the share of runs that clear each wave, the average waves cleared and the
// full-clear rate, then each wizard's average. PRE='js code' runs in the page first, e.g.
//   PRE="FIGHTER_DEFS.soldier.phys.atk=6" node tools/encounter_sim.js 10
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const { chromium } = require('playwright');
const runs = +(process.argv[2] || 20),
  ai = process.argv[3] || 'normal';
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
  if (process.env.PRE) await page.evaluate(process.env.PRE);
  const out = await page.evaluate(
    ([runs, ai]) => {
      const n = SURVIVAL_WAVES.length,
        reach = Array(n + 1).fill(0),
        per = {};
      let total = 0,
        all = 0,
        rounds = 0;
      Object.keys(CHAR_DEFS).forEach(k => {
        let sum = 0;
        for (let i = 0; i < runs; i++) {
          const r = simSurvival(k, ai);
          sum += r.cleared;
          total += r.cleared;
          rounds += r.rounds;
          reach[r.cleared]++;
          if (r.won) all++;
        }
        per[k] = sum / runs;
      });
      const count = runs * Object.keys(CHAR_DEFS).length;
      return {
        n,
        waves: SURVIVAL_WAVES.map(w => w.name),
        reach,
        per,
        avg: total / count,
        full: all / count,
        rounds: rounds / count,
        count
      };
    },
    [runs, ai]
  );
  await browser.close();
  server.close();
  // reach[c] = runs that cleared exactly c waves; the share that cleared at least wave i
  let left = out.count;
  const cleared = [];
  for (let i = 0; i < out.n; i++) {
    left -= out.reach[i];
    cleared.push(left / out.count);
  }
  console.log(
    `\n${out.count} runs (${runs} per wizard), AI ${ai}: average ${out.avg.toFixed(1)} of ${out.n} waves cleared, ${(out.full * 100).toFixed(0)}% full clears, ${out.rounds.toFixed(0)} rounds a run\n`
  );
  out.waves.forEach((w, i) =>
    console.log(
      `  wave ${String(i + 1).padStart(2)} ${w.padEnd(18)} cleared by ${(cleared[i] * 100).toFixed(0).padStart(3)}%`
    )
  );
  console.log(
    '\n  ' +
      Object.entries(out.per)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v.toFixed(1)}`)
        .join(' · ')
  );
})();
