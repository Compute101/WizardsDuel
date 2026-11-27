#!/usr/bin/env node
// Renders the Remnant Library's wall charts (the maps you can look at but not take) from the design
// sketch of the known world, docs/world-map.html, so the charts always match the world as planned.
//
//   node tools/render_lore_maps.js [id ...]      → backgrounds/charts/<id>.jpg
//
// The sketch is drawn as an in-world chart: placeholder "?"s dropped, every town in the same ink (no
// built / planned colours), no green ring round the Vale; then each chart is a crop of it, aged
// (parchment wash, foxing, a fold, a vignette), with a title cartouche, a compass, the library's stamp
// and a reader's notes pencilled in the margins. CHARTS below: what each crop is and what's written on
// it. Chromium via Playwright (preinstalled); the sketch's Google fonts are fetched if the network allows.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'backgrounds', 'charts');
const SCALE = 2;                       // canvas pixels per world unit before cropping

// x0, y0, x1, y1 in the sketch's world units; w = output width in px
const CHARTS = {
  albra: {
    box: [545, 55, 1575, 560], w: 2060,
    title: 'Albra', sub: 'the Isle, its Vale and its Fells · after the survey of Penrose, copied',
    notes: [
      [778, 594, 'we are here', -4], [1200, 342, 'ORCS. go with the carters, never alone', 3],
      [1451, 464, 'the sky-ships come no further', -2], [1343, 508, 'searched to the skin. leave your staff', 2],
      [930, 228, 'gatehouses only', 0], [710, 215, 'who lives here?', -6], [1520, 360, 'pay the toll', 8],
    ],
    stamp: [610, 505],
  },
  mainland: {
    box: [-260, 470, 3490, 2690], w: 2600,
    title: 'The Mainland', sub: 'the Kingdoms over the Narrows · from a gnomish sky-chart, much folded',
    notes: [
      [930, 900, 'witch-finders! not a spark', -3], [1960, 860, 'they will draft you', 4],
      [1034, 1324, 'night market at the Deepgate', -2], [250, 2150, 'the dead keep the roads', 5],
      [2404, 1896, 'best price for spill', -3], [3020, 1900, 'an audience? don\'t', 6],
      [2329, 2271, 'who holds the channel?', -4], [115, 1033, 'nothing written here', -8],
    ],
    stamp: [3300, 2560],
  },
  southlands: {
    box: [-300, 2560, 3500, 3360], w: 2600,
    title: 'The Southlands', sub: 'over the Middle Sea · as the sailors tell it',
    notes: [
      [1100, 3245, 'snake-temples, they say', -3], [2350, 3110, 'the laughing clans', 4],
      [-100, 3150, 'the copy ends here', -6], [3200, 3200, 'and beyond?', 5],
    ],
    stamp: [2740, 2750],
  },
  world: {
    box: [-300, -250, 3500, 3350], w: 2200,
    title: 'The Known World', sub: 'a sky-chart of the gnome routes · Gimbal press, third state',
    notes: [
      [90, 600, 'here the chart ends', -8], [1230, 340, 'home', -4], [2380, 2770, 'beyond the jungle: no one has come back to say', -2],
    ],
    stamp: [3200, 3150],
  },
};

function sketchSource() {
  let src = fs.readFileSync(path.join(ROOT, 'docs', 'world-map.html'), 'utf8');
  const must = (from, to) => { if (!src.includes(from)) throw new Error('world-map.html changed: missing ' + from.slice(0, 60)); src = src.replace(from, to); };
  must('S=0.9,', 'S=' + SCALE + ',');
  must('width="3420" height="3240"', `width="${3800 * SCALE}" height="${3600 * SCALE}"`);
  must("const bc=isl([880,505]);ctx.ellipse(bc[0],bc[1],165,62,-.18,0,Math.PI*2);ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(47,107,58,.9)';ctx.lineWidth=3;ctx.stroke();", '');
  must("draw();show('vale');", 'window.__C={N,LABELS,COL,draw,cv,W,H,OX,OY,S,rng};');
  must('scaleBar(-240,-170);compass(3380,3020);', '');          // the chart draws its own compass (and the scale bar falls outside every crop)
  must('if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);', '');
  return src;
}

// runs in the page: draws the sketch as a chart, then one aged crop
function renderChart(spec) {
  const C = window.__C;
  if (!C.__inked) {
    for (const t of Object.values(C.N)) t.n = t.n.replace(/\?/g, '');
    for (const l of C.LABELS) l[0] = l[0].replace(/\?/g, '');
    C.COL.built = C.COL.planned = C.COL.open = '#8a6a44';
    C.draw(); C.__inked = true;
  }
  const [x0, y0, x1, y1] = spec.box, S = C.S;
  const sx = (x0 + C.OX) * S, sy = (y0 + C.OY) * S, sw = (x1 - x0) * S, sh = (y1 - y0) * S;
  const w = spec.w, h = Math.round(w * sh / sw), k = w / (x1 - x0);       // k: output px per world unit
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(C.cv, sx, sy, sw, sh, 0, 0, w, h);
  const P = (x, y) => [(x - x0) * k, (y - y0) * k];
  const r = C.rng(w * 7 + h);
  const u = Math.max(w, h) / 2000;                                        // a size unit for the decoration
  // age: a warm wash, foxing, a fold, a vignette
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#f0dcb0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = r() * h, rad = (20 + r() * 110) * u;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(150,105,50,${0.08 + r() * 0.12})`); gr.addColorStop(1, 'rgba(150,105,50,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  for (let i = 0; i < 2; i++) {                                           // a cup ring or two
    const x = (0.15 + r() * 0.7) * w, y = (0.15 + r() * 0.7) * h, rad = (55 + r() * 30) * u;
    g.strokeStyle = 'rgba(120,75,30,.14)'; g.lineWidth = 6 * u; g.beginPath(); g.arc(x, y, rad, r(), r() + 5.2); g.stroke();
  }
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(95,60,25,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const fold = (x, vert) => {                                             // a crease: a dark line beside a light one
    g.lineWidth = 3 * u;
    g.strokeStyle = 'rgba(90,60,30,.22)'; g.beginPath(); vert ? (g.moveTo(x, 0), g.lineTo(x + 6 * u, h)) : (g.moveTo(0, x), g.lineTo(w, x - 5 * u)); g.stroke();
    g.strokeStyle = 'rgba(255,245,220,.35)'; g.beginPath(); vert ? (g.moveTo(x + 4 * u, 0), g.lineTo(x + 10 * u, h)) : (g.moveTo(0, x + 4 * u), g.lineTo(w, x - 1 * u)); g.stroke();
  };
  fold(w * (0.48 + r() * 0.06), true); if (h > w * 0.6) fold(h * (0.48 + r() * 0.05), false);
  // the reader's notes, pencilled in an untidy hand
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [x, y, t, rot] of spec.notes) {
    const [px, py] = P(x, y); g.save(); g.translate(px, py); g.rotate((rot || 0) * Math.PI / 180);
    g.font = `italic ${Math.round(30 * u)}px "IM Fell English", Georgia, serif`;
    g.fillStyle = 'rgba(122,40,24,.86)'; g.fillText(t, 0, 0);
    g.strokeStyle = 'rgba(122,40,24,.6)'; g.lineWidth = 1.6 * u; const tw = g.measureText(t).width;
    g.beginPath(); g.moveTo(-tw / 2, 17 * u); g.quadraticCurveTo(0, 21 * u, tw / 2, 15 * u); g.stroke();
    g.restore();
  }
  // the title cartouche, top left
  const tf = Math.round(62 * u), sf = Math.round(24 * u);
  g.font = `${tf}px "IM Fell English SC", Georgia, serif`; const twd = g.measureText(spec.title).width;
  g.font = `italic ${sf}px "IM Fell English", Georgia, serif`; const swd = g.measureText(spec.sub).width;
  const cw = Math.max(twd, swd) + 70 * u, ch = tf + sf + 64 * u, cx = 48 * u, cy = 44 * u;
  g.fillStyle = 'rgba(240,226,190,.93)'; g.strokeStyle = '#3b2a1a';
  g.beginPath(); g.roundRect(cx, cy, cw, ch, 10 * u); g.fill(); g.lineWidth = 3 * u; g.stroke();
  g.beginPath(); g.roundRect(cx + 7 * u, cy + 7 * u, cw - 14 * u, ch - 14 * u, 6 * u); g.lineWidth = 1.2 * u; g.stroke();
  g.fillStyle = '#3b2a1a'; g.textAlign = 'center';
  g.font = `${tf}px "IM Fell English SC", Georgia, serif`; g.fillText(spec.title, cx + cw / 2, cy + 30 * u + tf / 2);
  g.font = `italic ${sf}px "IM Fell English", Georgia, serif`; g.fillStyle = '#6b5236'; g.fillText(spec.sub, cx + cw / 2, cy + 40 * u + tf + sf / 2);
  // a compass, top right
  g.save(); g.translate(w - 110 * u, 130 * u); g.strokeStyle = g.fillStyle = '#3b2a1a'; g.lineWidth = 2.4 * u;
  g.beginPath(); g.arc(0, 0, 48 * u, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); const L = i % 2 ? 40 * u : 68 * u;
    g.beginPath(); g.moveTo(0, -L); g.lineTo(9 * u, 0); g.lineTo(-9 * u, 0); g.closePath(); i === 0 ? g.fill() : g.stroke(); g.restore(); }
  g.font = `${Math.round(32 * u)}px "IM Fell English SC", Georgia, serif`; g.textAlign = 'center'; g.fillText('N', 0, -84 * u); g.restore();
  // the library's stamp
  { const [px, py] = P(...spec.stamp); g.save(); g.translate(px, py); g.rotate(-0.21);
    g.strokeStyle = g.fillStyle = 'rgba(128,30,40,.62)'; g.lineWidth = 4 * u;
    g.beginPath(); g.arc(0, 0, 70 * u, 0, 7); g.stroke(); g.lineWidth = 1.6 * u; g.beginPath(); g.arc(0, 0, 60 * u, 0, 7); g.stroke();
    g.font = `${Math.round(19 * u)}px "IM Fell English SC", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('REMNANT', 0, -22 * u); g.fillText('LIBRARY', 0, 0); g.font = `italic ${Math.round(13 * u)}px "IM Fell English", Georgia, serif`;
    g.fillText('not to be removed', 0, 22 * u); g.restore(); }
  // a ruled border
  g.strokeStyle = '#3b2a1a'; g.lineWidth = 6 * u; g.strokeRect(9 * u, 9 * u, w - 18 * u, h - 18 * u);
  g.lineWidth = 1.6 * u; g.strokeRect(20 * u, 20 * u, w - 40 * u, h - 40 * u);
  return c.toDataURL('image/jpeg', 0.84);
}

(async () => {
  const want = process.argv.slice(2), ids = want.length ? want : Object.keys(CHARTS);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('page:', e.message));
  await page.setContent(sketchSource(), { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(async () => { try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 4000))]);
    await Promise.all(['46px "IM Fell English SC"', 'italic 30px "IM Fell English"'].map(f => document.fonts.load(f))); } catch (e) {} });
  for (const id of ids) {
    const spec = CHARTS[id]; if (!spec) { console.error('no chart', id); continue; }
    const url = await page.evaluate(renderChart, spec);
    const file = path.join(OUT, id + '.jpg');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file, Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  await browser.close();
})();
