// ═══════════════════════════════════════════════════════════════════════
// RUN THE NARROWS: a sailing minigame (design and "As built": docs/gilden-design.md, "Running the Narrows").
// Captain Nan Crake of the Kittiwake, who flies no house's flag, won't pay the Varg sea-toll: you sail her
// ship west from Gilden down the Narrows, past the Varg picket at the Teeth, to a Halemouth lugger waiting
// off Gull Head. Top-down sea, the ship drawn upright from the user's art (sprites/ships/, cut by
// tools/cut_ships.py: five views a ship, mirrored into eight headings, HEADINGS).
// - Sailing: you steer (A/D, arrows, or hold a finger on the sea) and set the sails (W/S: reefed / half /
//   full); speed comes from the wind (POLAR: in irons into it, fastest across it). The wind wanders.
// - Rocks and the coast hold you up and hole the hull; shallows slow you and scrape it. Hull 0: foundered.
// - Varg raiders patrol the picket; one that sees you (less far in a fog bank) gives chase. The Varg row,
//   so they never stall in irons. Alongside long enough, they grapple and board: fight them off (a real
//   battle through startExploreBattle) or let the captain pay the toll, which ends the run.
// - Deck magic (cooldowns): Fill the Sails, a strike that cripples a raider's rigging, and a sea-mist.
// Open with Sailing.open({explore, onEnd}) (js/explore.js openSailing, from Captain Crake in Gilden), or
// standalone from the title screen's Test menu.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  // ── the numbers ──
  const L = 18000; // the course, east to west (world px): about 95 s on the safe lane at full sail
  const GOAL_X = 700; // the lugger waits beyond this
  const START_X = L - 700;
  const MAX_SPD = 240; // px a second, full sail on a beam reach
  const SAILS = [
    ['Reefed', 0.45, 1.25],
    ['Half sail', 0.75, 1.1],
    ['Full sail', 1, 1]
  ]; // name, speed, turning
  const TURN = 0.95; // radians a second at speed
  const HULL = 100;
  const SHIP_R = 42; // the hull's collision radius round the waterline point
  const SHALLOW = 120; // shallows band off the coast
  const ROCK_HIT = { base: 8, perSpd: 0.07, gap: 0.7 };
  const SCRAPE = 3; // hull a second scraping a shallow at speed
  const RAIDER = {
    sight: 720,
    fogSight: 240,
    speed: 0.9, // of your MAX_SPD
    row: 95, // they row: never slower than this while chasing
    giveUp: 1600, // lose sight of you this far off for…
    giveUpS: 5,
    leash: 4200, // …or this far from their post
    grapple: 125, // within this they throw hooks…
    grappleS: 2.2, // …and board after this long
    slowedS: 8,
    slowedMul: 0.4
  };
  const SPELLS = {
    gust: { name: 'Fill the Sails', icon: '🌬', cd: 28, dur: 6, mul: 1.35 },
    strike: { name: 'Strike the Rigging', icon: '✦', cd: 16, range: 700 },
    mist: { name: 'Sea-Mist', icon: '🌫', cd: 40, r: 420, life: 22 }
  };
  const PAY = { base: 25, first: 15, clean: 10, unboarded: 10, cleanHull: 75 };
  const SHIP_H = { merchant: 210, varg: 200 }; // drawn height, world px

  // headings: 0 east, then clockwise on screen (y down): SE, S, SW, W, NW, N, NE
  // [view, mirrored]; the stern-near view is the merchant's NE and the Varg's NW (ships.json `away`)
  function viewFor(ship, oct) {
    const away = SHIPS && SHIPS[ship] ? SHIPS[ship].away : 'ne';
    switch (oct) {
      case 0:
        return ['side', false];
      case 1:
        return ['quarter_near', true];
      case 2:
        return ['bow', false];
      case 3:
        return ['quarter_near', false];
      case 4:
        return ['side', true];
      case 5:
        return ['quarter_away', away !== 'nw'];
      case 6:
        return ['stern', false];
      default:
        return ['quarter_away', away === 'nw'];
    }
  }

  // ── small helpers ──
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  // speed from the angle off the wind (0 = straight into it, π = dead downwind)
  function polar(off, rows) {
    const a = Math.abs(off);
    const irons = rows ? 0.6 : 0.7;
    let p;
    if (a < irons) p = 0.1;
    else if (a < 1.05) p = lerp(0.1, 0.75, (a - irons) / (1.05 - irons));
    else if (a < 1.9) p = lerp(0.75, 1, (a - 1.05) / 0.85);
    else p = lerp(1, 0.8, (a - 1.9) / (Math.PI - 1.9));
    return p;
  }
  function pointOfSail(off) {
    const a = Math.abs(off);
    return a < 0.7
      ? 'In irons'
      : a < 1.05
        ? 'Close-hauled'
        : a < 1.9
          ? 'Beam reach'
          : a < 2.6
            ? 'Broad reach'
            : 'Running';
  }

  // ── art ──
  let SHIPS = null;
  const imgs = {};
  function img(src) {
    if (!imgs[src]) {
      const i = new Image();
      i.src = src;
      imgs[src] = i;
    }
    return imgs[src];
  }
  async function loadArt() {
    if (SHIPS) return;
    try {
      SHIPS = await (await fetch('sprites/ships/ships.json', { cache: 'no-cache' })).json();
      for (const s of Object.values(SHIPS)) for (const v of Object.values(s.views)) img(v.src);
    } catch (e) {
      SHIPS = {};
    }
  }

  // ── the course ──
  // The coasts are sums of sines (seeded); the channel pinches to the Narrows proper at the Teeth, where
  // the picket waits. A safe lane wanders down the middle and no rock is put in it, so every run can be won.
  function buildCourse(seed) {
    const r = rng(seed);
    const ph = () => r() * Math.PI * 2;
    const nw = [ph(), ph(), ph(), ph()],
      sw = [ph(), ph(), ph(), ph()],
      lw = [ph(), ph()];
    const pinch = x => {
      const t = x / L;
      // wide off Gilden, narrow at the Teeth (t 0.45..0.65), opening toward Gull Head
      return (
        1 - 0.55 * Math.exp(-Math.pow((t - 0.55) / 0.12, 2)) - 0.2 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2))
      );
    };
    const half = x => 1150 * pinch(x);
    const mid = x => 160 * Math.sin(x / 2300 + nw[0]) + 90 * Math.sin(x / 900 + sw[0]);
    const north = x =>
      mid(x) -
      half(x) +
      70 * Math.sin(x / 610 + nw[1]) +
      40 * Math.sin(x / 230 + nw[2]) +
      18 * Math.sin(x / 90 + nw[3]);
    const south = x =>
      mid(x) +
      half(x) +
      70 * Math.sin(x / 540 + sw[1]) +
      40 * Math.sin(x / 260 + sw[2]) +
      18 * Math.sin(x / 80 + sw[3]);
    const lane = x => mid(x) + 0.45 * half(x) * Math.sin(x / 1700 + lw[0]) * Math.sin(x / 4100 + lw[1]);
    const C = { seed, north, south, mid, lane, half, rocks: [], bars: [], fog: [], isles: [], marks: [] };
    const okRock = (x, y, rr) =>
      Math.abs(y - lane(x)) > rr + 190 &&
      y - north(x) > rr + 60 &&
      south(x) - y > rr + 60 &&
      !C.rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + rr + 30);
    // the Teeth: a field of rocks across the Narrows
    for (let i = 0; i < 400 && C.rocks.length < 34; i++) {
      const x = L * (0.44 + r() * 0.24),
        y = lerp(north(x), south(x), r()),
        rr = 22 + r() * 46;
      if (okRock(x, y, rr)) C.rocks.push({ x, y, r: rr, k: r() });
    }
    // scattered rocks the rest of the way
    for (let i = 0; i < 600 && C.rocks.length < 70; i++) {
      const x = 1200 + r() * (L - 2600),
        y = lerp(north(x), south(x), r()),
        rr = 18 + r() * 36;
      if (okRock(x, y, rr)) C.rocks.push({ x, y, r: rr, k: r() });
    }
    // islets (bigger, green on top): cover for an ambush
    for (let i = 0; i < 300 && C.isles.length < 4; i++) {
      const x = L * (0.15 + r() * 0.65),
        y = lerp(north(x), south(x), r() < 0.5 ? 0.22 : 0.78),
        rr = 110 + r() * 70;
      if (okRock(x, y, rr) && !C.isles.some(o => Math.abs(o.x - x) < 2000)) {
        const o = { x, y, r: rr, k: r(), isle: true };
        C.isles.push(o);
        C.rocks.push(o);
      }
    }
    // sandbars: shallow, not deadly
    for (let i = 0; i < 300 && C.bars.length < 9; i++) {
      const x = 900 + r() * (L - 1800),
        y = lerp(north(x), south(x), 0.15 + r() * 0.7),
        rx = 160 + r() * 200,
        ry = 50 + r() * 50;
      if (Math.abs(y - lane(x)) > ry + 120) C.bars.push({ x, y, rx, ry, a: (r() - 0.5) * 0.6 });
    }
    // fog banks drifting on the wind
    for (let i = 0; i < 8; i++) {
      const x = L * (0.1 + i * 0.11 + r() * 0.05);
      C.fog.push({ x, y: lerp(north(x), south(x), 0.2 + r() * 0.6), r: 380 + r() * 260, ph: r() * 6 });
    }
    // named marks on the way (the progress bar and the shore)
    C.marks = [
      { x: L - 400, name: 'Gilden', side: 'n' },
      { x: L * 0.55, name: 'the Teeth', side: 's' },
      { x: L * 0.2, name: 'Gull Head', side: 'n' },
      { x: GOAL_X - 200, name: 'the lugger', side: 'm' }
    ];
    return C;
  }

  // the raiders' posts: two across the Narrows, one lurking behind an islet, one off Gull Head;
  // more (and stronger crews) on later runs
  function placeRaiders(C, runs, r) {
    const R = [];
    const at = (x, f) => ({ x, y: lerp(C.north(x), C.south(x), f) });
    const posts = [
      [L * 0.6, 0.3, 0.75, 0],
      [L * 0.5, 0.7, 0.25, 0],
      [L * 0.3, 0.4, 0.65, 1]
    ];
    const isle = C.isles.find(o => o.x > L * 0.62 && o.x < L * 0.85) || C.isles[0];
    if (runs >= 1 && isle) posts.push([isle.x - isle.r - 160, null, null, 1, isle]);
    if (runs >= 2) posts.push([L * 0.15, 0.25, 0.75, 2]);
    for (const [x, f1, f2, lvl, hide] of posts) {
      const a = hide ? { x: x, y: hide.y } : at(x, f1),
        b = hide ? { x: x + 40, y: hide.y + 30 } : at(x + 300, f2);
      R.push({
        kind: 'varg',
        x: a.x,
        y: a.y,
        hd: Math.PI / 2,
        spd: 0,
        post: { a, b, leg: 0 },
        home: { x: a.x, y: a.y },
        state: 'patrol',
        level: Math.min(2, lvl + (runs >= 3 ? 1 : 0)),
        lost: 0,
        hook: 0,
        slowed: 0,
        view: null,
        bob: r() * 6,
        name: VARG_SHIPS[R.length % VARG_SHIPS.length]
      });
    }
    return R;
  }
  const VARG_SHIPS = ['Grey Bitch', 'Hrafn', 'Skull-Biter', 'Ulfhild', 'Sea-Fang'];

  // ── state ──
  let ctx = null; // Explore's hooks, or null standalone
  let S = null; // the run
  let raf = 0,
    last = 0;
  let cv, c2;
  let vw = 0,
    vh = 0,
    dpr = 1,
    zoom = 1;
  const keys = new Set();
  let pointer = null; // {x, y} screen px while held on the sea
  const MUS_KEY = 'wd-sail-music';
  const musicOn = () => {
    try {
      return localStorage.getItem(MUS_KEY) !== '0';
    } catch (e) {
      return true;
    }
  };

  function newRun(opts) {
    const runs = (opts && opts.runs) || 0,
      seed = (Math.random() * 1e9) | 0;
    const C = buildCourse(seed),
      r = rng(seed ^ 0x5eed);
    const me = {
      kind: 'merchant',
      x: START_X,
      y: C.lane(START_X),
      hd: Math.PI,
      spd: 60,
      sail: 1,
      hull: HULL,
      hitT: 0,
      view: null,
      bob: 0
    };
    return {
      C,
      me,
      raiders: placeRaiders(C, runs, r),
      t: 0,
      wind: { from: -Math.PI / 4, base: -Math.PI / 4 + (r() - 0.5) * 0.8, str: 1, ph: r() * 9 },
      cool: { gust: 0, strike: 0, mist: 0 },
      gust: 0,
      mists: [],
      wake: [],
      bolts: [],
      floats: [],
      boarded: 0,
      clean: true,
      over: null,
      paused: true,
      runs,
      spotted: false,
      shake: 0
    };
  }

  // ── building the screen ──
  function build() {
    const d = document.createElement('div');
    d.id = 'sl-screen';
    d.className = 'sl';
    d.innerHTML = `
      <div class="sl-top">
        <div class="sl-title">⛵ Run the Narrows <span id="sl-sub">the Kittiwake</span></div>
        <div class="sl-hull" title="The hull"><span>Hull</span><b><i id="sl-hull"></i></b></div>
        <div class="sl-prog" id="sl-prog" title="The way to the lugger"></div>
        <div class="sl-top-btns">
          <button class="sl-btn sl-sm" id="sl-help" title="How to sail">?</button>
          <button class="sl-btn sl-sm" id="sl-mus" title="Music">♪</button>
          <button class="sl-btn sl-sm" id="sl-x" title="Turn back">✕</button>
        </div>
      </div>
      <div class="sl-stage" id="sl-stage">
        <canvas id="sl-cv"></canvas>
        <div class="sl-wind" id="sl-wind"><canvas id="sl-rose" width="96" height="96"></canvas><div id="sl-pos"></div></div>
        <div class="sl-hint" id="sl-hint"></div>
      </div>
      <div class="sl-bar">
        <div class="sl-sails"><button class="sl-btn" id="sl-down" title="Shorten sail (S)">−</button><span id="sl-sail"></span><button class="sl-btn" id="sl-up" title="Make sail (W)">+</button></div>
        <div class="sl-rud"><button class="sl-btn" id="sl-left" title="Port (A)">◀</button><button class="sl-btn" id="sl-right" title="Starboard (D)">▶</button></div>
        <div class="sl-spells" id="sl-spells"></div>
      </div>
      <div class="sl-modal" id="sl-modal" hidden><div class="sl-card" id="sl-card"></div></div>`;
    document.body.appendChild(d);
    cv = $('sl-cv');
    c2 = cv.getContext('2d');
    $('sl-x').onclick = () => (S && !S.over ? confirmTurnBack() : close());
    $('sl-help').onclick = () => help(false);
    $('sl-mus').onclick = () => {
      try {
        localStorage.setItem(MUS_KEY, musicOn() ? '0' : '1');
      } catch (e) {}
      renderMus();
      Music.sync();
    };
    $('sl-up').onclick = () => setSail(1);
    $('sl-down').onclick = () => setSail(-1);
    const hold = (id, k) => {
      const b = $(id);
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        keys.add(k);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(t =>
        b.addEventListener(t, () => keys.delete(k))
      );
    };
    hold('sl-left', 'ArrowLeft');
    hold('sl-right', 'ArrowRight');
    cv.addEventListener('pointerdown', e => {
      pointer = { x: e.offsetX, y: e.offsetY };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (pointer) pointer = { x: e.offsetX, y: e.offsetY };
    });
    ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => (pointer = null)));
    window.addEventListener('keydown', e => {
      if (!isOpen()) return;
      const k = e.key;
      if (k === 'Escape') {
        if (!$('sl-modal').hidden) return;
        S && !S.over ? confirmTurnBack() : close();
        return;
      }
      if (!$('sl-modal').hidden) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) {
        keys.add(k.length === 1 ? (k.toLowerCase() === 'a' ? 'ArrowLeft' : 'ArrowRight') : k);
        e.preventDefault();
      } else if (['ArrowUp', 'w', 'W'].includes(k)) {
        setSail(1);
        e.preventDefault();
      } else if (['ArrowDown', 's', 'S'].includes(k)) {
        setSail(-1);
        e.preventDefault();
      } else if (k === '1') cast('gust');
      else if (k === '2') cast('strike');
      else if (k === '3') cast('mist');
    });
    window.addEventListener('keyup', e => {
      const k = e.key;
      if (k === 'a' || k === 'A') keys.delete('ArrowLeft');
      else if (k === 'd' || k === 'D') keys.delete('ArrowRight');
      else keys.delete(k);
    });
    window.addEventListener('resize', () => isOpen() && fit());
    new ResizeObserver(() => isOpen() && fit()).observe($('sl-stage'));
  }
  const isOpen = () => !!$('sl-screen') && $('sl-screen').classList.contains('active');

  function fit() {
    const st = $('sl-stage');
    const w = st.clientWidth,
      h = st.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = w;
    vh = h;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    // see about 1100 world px across the shorter side on a big screen; a phone sees less but keeps the
    // ships a readable size (the camera looks ahead of the ship, cam())
    zoom = clamp(Math.min(w, h * 1.3) / (w < 700 ? 820 : 1150), 0.42, 1);
  }

  // ── open / close ──
  async function open(opts) {
    opts = opts || {};
    ctx = opts.explore || null;
    if (!$('sl-screen')) build();
    await loadArt();
    S = newRun({ runs: ctx ? ctx.runs || 0 : 0 });
    $('sl-screen').classList.add('active');
    if (window.Explore && Explore.titleMusic)
      try {
        Explore.titleMusic();
      } catch (e) {}
    fit();
    renderMus();
    renderSpells();
    renderSail();
    keys.clear();
    pointer = null;
    Music.sync();
    help(true);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  function close() {
    cancelAnimationFrame(raf);
    raf = 0;
    if ($('sl-screen')) $('sl-screen').classList.remove('active');
    Music.stop();
    const c = ctx;
    ctx = null;
    if (c && c.onClose) c.onClose();
    if (window.Explore && Explore.titleMusic)
      try {
        Explore.titleMusic();
      } catch (e) {}
  }

  // ── modal cards ──
  function card(html, buttons) {
    const m = $('sl-modal');
    $('sl-card').innerHTML =
      html +
      '<div class="sl-card-btns">' +
      buttons
        .map((b, i) => `<button class="sl-btn${b.main ? ' sl-main' : ''}" data-i="${i}">${b.label}</button>`)
        .join('') +
      '</div>';
    $('sl-card')
      .querySelectorAll('button[data-i]')
      .forEach(b => {
        b.onclick = () => {
          m.hidden = true;
          const f = buttons[+b.dataset.i].fn;
          if (f) f();
        };
      });
    m.hidden = false;
    keys.clear();
    pointer = null;
  }
  function help(first) {
    if (!S) return;
    S.paused = true;
    const brief = first
      ? `<h2>The Kittiwake</h2><p>"The Varg take a tenth of every hold that passes the Teeth, unless it flies Varenne's anchor. Varenne pays them off each spring and sends the bill to the rest of us." Captain Crake spits over the rail. "I fly nobody's flag. Get me past their picket to the Halemouth lugger off Gull Head, and she pays in coin, no questions."</p>`
      : '<h2>How to sail</h2>';
    card(
      brief +
        `<ul class="sl-help">
        <li><b>Steer:</b> ◀ ▶, A / D or the arrow keys, or hold a finger on the sea and the ship turns toward it.</li>
        <li><b>Sails:</b> − / +, or W / S. Full sail is fastest but turns widest.</li>
        <li><b>Wind:</b> the rose top left shows where it blows from. Sail across it for speed; you can't sail into it (in irons). It shifts as you go.</li>
        <li><b>Rocks and coast</b> hole the hull. <b>Pale water</b> is shallow: it slows you and scrapes the hull.</li>
        <li><b>Varg raiders</b> chase what they see; in a <b>fog bank</b> they see much less. They row, so they never stall into the wind. Let one stay alongside and they board.</li>
        <li><b>Magic</b> (1 / 2 / 3): Fill the Sails, Strike the Rigging (cripples a raider), Sea-Mist (a fog bank round you).</li>
        </ul>`,
      [{ label: first ? '⛵ Cast off' : 'Back to the helm', main: true, fn: () => (S.paused = false) }]
    );
  }
  function confirmTurnBack() {
    S.paused = true;
    card('<h2>Turn back?</h2><p>Crake will put about for Gilden. No run, no pay.</p>', [
      { label: 'Hold the course', main: true, fn: () => (S.paused = false) },
      { label: 'Turn back', fn: () => finish('turned') }
    ]);
  }

  // ── controls ──
  function setSail(d) {
    if (!S || S.over) return;
    S.me.sail = clamp(S.me.sail + d, 0, 2);
    renderSail();
  }
  function renderSail() {
    if (S) $('sl-sail').textContent = SAILS[S.me.sail][0];
  }
  function renderMus() {
    $('sl-mus').classList.toggle('off', !musicOn());
  }
  // which deck spells the wizard has: everything for a roster wizard or standalone; a made wizard
  // needs the category (strike: Damage, mist: Protection); too tired, nothing
  function spellOk(id) {
    if (!ctx) return true;
    if (ctx.tired && ctx.tired()) return false;
    const cats = ctx.cats;
    if (!cats) return true;
    if (id === 'strike') return cats.includes('damage');
    if (id === 'mist') return cats.includes('protect');
    return true;
  }
  function renderSpells() {
    const box = $('sl-spells');
    box.innerHTML = Object.entries(SPELLS)
      .map(
        ([id, s], i) =>
          `<button class="sl-btn sl-spell" id="sl-sp-${id}" title="${s.name} (${i + 1})"><span>${s.icon}</span><em>${s.name}</em><i></i></button>`
      )
      .join('');
    for (const id of Object.keys(SPELLS)) $('sl-sp-' + id).onclick = () => cast(id);
  }
  function updateSpellBtns() {
    for (const [id, s] of Object.entries(SPELLS)) {
      const b = $('sl-sp-' + id);
      if (!b) continue;
      const ok = spellOk(id),
        cd = S.cool[id];
      b.disabled = !ok || cd > 0 || !!S.over;
      b.querySelector('i').style.width = ok && cd > 0 ? (100 * cd) / s.cd + '%' : '0';
      b.classList.toggle('sl-locked', !ok);
    }
  }
  function cast(id) {
    if (!S || S.over || S.paused || S.cool[id] > 0) return;
    if (!spellOk(id)) {
      hint(
        ctx && ctx.tired && ctx.tired() ? "You're too tired to cast." : "You haven't learnt that magic yet."
      );
      return;
    }
    const me = S.me,
      col = elemCol();
    if (id === 'gust') {
      S.gust = SPELLS.gust.dur;
      float(me.x, me.y - 230, 'Fill the Sails!', col);
    } else if (id === 'strike') {
      const t = S.raiders
        .filter(r => r.state !== 'gone' && Math.hypot(r.x - me.x, r.y - me.y) < SPELLS.strike.range)
        .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (!t) {
        hint('No raider within reach of a strike.');
        return;
      }
      S.bolts.push({ x: me.x, y: me.y - 150, t, life: 0, col });
    } else if (id === 'mist') {
      S.mists.push({ x: me.x, y: me.y, r: SPELLS.mist.r, life: SPELLS.mist.life, age: 0 });
      float(me.x, me.y - 230, 'Sea-Mist!', '#dfe8f0');
    }
    S.cool[id] = SPELLS[id].cd;
  }
  const ELEM_COL = {
    fire: '#ff8a3c',
    air: '#cfefff',
    lightning: '#fff27a',
    arcane: '#8fb8ff',
    water: '#5ad0ff',
    earth: '#c9a066',
    ice: '#bff4ff',
    dark: '#c48cff'
  };
  const elemCol = () => ELEM_COL[(ctx && ctx.element) || 'water'] || '#8fe0ff';

  let hintT = 0;
  function hint(s) {
    const h = $('sl-hint');
    h.textContent = s;
    h.classList.add('on');
    hintT = 3;
  }
  function float(x, y, text, col) {
    S.floats.push({ x, y, text, col, life: 1.6 });
  }

  // ── the world ──
  function fogAt(x, y) {
    let f = 0;
    for (const b of S.C.fog) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r) f = Math.max(f, 1 - d / b.r);
    }
    for (const m of S.mists) {
      const d = Math.hypot(x - m.x, y - m.y),
        a = Math.min(1, m.age / 1.5, m.life / 3);
      if (d < m.r) f = Math.max(f, (1 - d / m.r) * a * 1.2);
    }
    return clamp(f, 0, 1);
  }
  // how far into land / rock a point is (positive = aground), and whether it's shallow
  function seabed(x, y, rad) {
    const C = S.C;
    let hit = null,
      shallow = false;
    const n = C.north(x),
      s = C.south(x);
    if (y - rad < n) hit = { nx: 0, ny: 1, d: n - (y - rad) };
    else if (y + rad > s) hit = { nx: 0, ny: -1, d: y + rad - s };
    if (y - n < SHALLOW + rad || s - y < SHALLOW + rad) shallow = true;
    if (x > L + 200) hit = { nx: -1, ny: 0, d: x - L - 200 };
    if (x < -300) hit = { nx: 1, ny: 0, d: -300 - x };
    for (const o of C.rocks) {
      const dx = x - o.x,
        dy = y - o.y,
        d = Math.hypot(dx, dy);
      if (d < o.r + rad) hit = { nx: dx / (d || 1), ny: dy / (d || 1), d: o.r + rad - d };
      else if (d < o.r + rad + 50) shallow = true;
    }
    for (const b of C.bars) {
      const ca = Math.cos(-b.a),
        sa = Math.sin(-b.a),
        dx = x - b.x,
        dy = y - b.y;
      const u = (dx * ca - dy * sa) / b.rx,
        v = (dx * sa + dy * ca) / b.ry;
      if (u * u + v * v < 1) shallow = true;
    }
    return { hit, shallow };
  }

  function windNow(t) {
    const w = S.wind;
    // wanders round its base, up to about 75° either way, with gusts
    w.from = w.base + 0.85 * Math.sin(t / 37 + w.ph) + 0.45 * Math.sin(t / 13 + w.ph * 2);
    w.str = 0.85 + 0.15 * Math.sin(t / 7 + w.ph) + 0.1 * Math.sin(t / 2.3);
    return w;
  }

  // ── the clock ──
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!isOpen() || !vw) return;
    if (S && !S.paused && !S.over) step(dt);
    if (S) {
      S.vis = (S.vis || 0) + dt; // drawing time runs on while paused (waves, bobbing)
      moveCam(dt);
      draw();
      hud();
    }
    if (hintT > 0 && (hintT -= dt) <= 0) $('sl-hint').classList.remove('on');
  }

  function step(dt) {
    S.t += dt;
    const me = S.me,
      w = windNow(S.t);
    for (const k of Object.keys(S.cool)) S.cool[k] = Math.max(0, S.cool[k] - dt);
    S.gust = Math.max(0, S.gust - dt);
    // steering
    let rud = 0;
    if (keys.has('ArrowLeft')) rud -= 1;
    if (keys.has('ArrowRight')) rud += 1;
    if (pointer) {
      const cm = cam(),
        wx = cm.x + (pointer.x - vw / 2) / zoom,
        wy = cm.y + (pointer.y - vh / 2) / zoom;
      const want = Math.atan2(wy - me.y, wx - me.x),
        d = angDiff(me.hd, want);
      if (Math.abs(d) > 0.04) rud = clamp(d * 3, -1, 1);
    }
    const sail = SAILS[me.sail];
    const way = clamp(me.spd / (MAX_SPD * 0.5), 0.35, 1);
    me.hd += rud * TURN * sail[2] * way * dt;
    // speed from the wind
    const off = angDiff(me.hd, w.from);
    let p = S.gust > 0 ? Math.max(polar(off), 0.95) * SPELLS.gust.mul : polar(off);
    let target = MAX_SPD * sail[1] * p * w.str;
    if (me.hull < 50) target *= 0.75 + me.hull / 200;
    const bed = seabed(me.x, me.y, SHIP_R);
    if (bed.shallow) target *= 0.55;
    me.spd = lerp(me.spd, target, 1 - Math.exp(-dt * 0.7));
    me.x += Math.cos(me.hd) * me.spd * dt;
    me.y += Math.sin(me.hd) * me.spd * dt;
    me.hitT = Math.max(0, me.hitT - dt);
    const b2 = seabed(me.x, me.y, SHIP_R);
    if (b2.hit) {
      me.x += b2.hit.nx * (b2.hit.d + 2);
      me.y += b2.hit.ny * (b2.hit.d + 2);
      if (me.hitT <= 0 && me.spd > 25) {
        const dmg = Math.round(ROCK_HIT.base + me.spd * ROCK_HIT.perSpd);
        damage(dmg, 'Struck rock! −' + dmg);
        me.hitT = ROCK_HIT.gap;
        S.shake = 0.4;
      }
      // glance off: turn along the obstacle
      const along = Math.atan2(b2.hit.nx, -b2.hit.ny);
      const a1 = angDiff(me.hd, along),
        a2 = angDiff(me.hd, along + Math.PI);
      me.hd += (Math.abs(a1) < Math.abs(a2) ? a1 : a2) * 0.25;
      me.spd *= 0.35;
    } else if (b2.shallow && me.spd > 70) {
      S.scrape = (S.scrape || 0) + SCRAPE * dt;
      if (S.scrape >= 1) {
        S.scrape -= 1;
        damage(1);
        if (Math.random() < 0.3) hint('Shoal water! The keel is scraping.');
      }
    }
    wakeFor(me, dt);
    // raiders
    for (const r of S.raiders) raiderStep(r, dt, w);
    // spells in flight
    for (const b of S.bolts) {
      b.life += dt;
      const tx = b.t.x,
        ty = b.t.y - 120,
        d = Math.hypot(tx - b.x, ty - b.y);
      const v = 1300 * dt;
      if (d < v + 10) {
        b.done = true;
        b.t.slowed = RAIDER.slowedS;
        b.t.hook = 0;
        float(b.t.x, b.t.y - 230, 'Rigging torn!', b.col);
        burst(b.t.x, b.t.y - 120, b.col);
      } else {
        b.x += ((tx - b.x) / d) * v;
        b.y += ((ty - b.y) / d) * v;
      }
    }
    S.bolts = S.bolts.filter(b => !b.done);
    for (const m of S.mists) {
      m.age += dt;
      m.life -= dt;
      m.x += Math.cos(w.from + Math.PI) * 12 * dt;
      m.y += Math.sin(w.from + Math.PI) * 12 * dt;
    }
    S.mists = S.mists.filter(m => m.life > 0);
    for (const f of S.C.fog) {
      f.x += Math.cos(w.from + Math.PI) * 9 * dt;
      f.y += Math.sin(w.from + Math.PI) * 9 * dt;
      f.y = clamp(f.y, S.C.north(f.x) + 100, S.C.south(f.x) - 100);
    }
    S.shake = Math.max(0, S.shake - dt);
    if (me.x < GOAL_X) finish('won');
  }

  function damage(n, msg) {
    const me = S.me;
    me.hull = Math.max(0, me.hull - n);
    if (n >= 3) S.clean = S.clean && me.hull >= PAY.cleanHull;
    if (msg) float(me.x, me.y - 230, msg, '#ff9a7a');
    if (navigator.vibrate && n >= 5)
      try {
        navigator.vibrate(60);
      } catch (e) {}
    if (me.hull <= 0) finish('sunk');
  }

  function wakeFor(s, dt) {
    s.wakeAcc = (s.wakeAcc || 0) + dt * (s.spd / 30);
    while (s.wakeAcc > 1) {
      s.wakeAcc -= 1;
      const back = 60 + Math.random() * 10,
        side = (Math.random() - 0.5) * 30;
      S.wake.push({
        x: s.x - Math.cos(s.hd) * back - Math.sin(s.hd) * side,
        y: s.y - Math.sin(s.hd) * back + Math.cos(s.hd) * side,
        life: 1,
        r: 10 + Math.random() * 8,
        vx: -Math.sin(s.hd) * (side > 0 ? 1 : -1) * 14,
        vy: Math.cos(s.hd) * (side > 0 ? 1 : -1) * 14
      });
    }
  }
  function burst(x, y, col) {
    for (let i = 0; i < 14; i++)
      S.wake.push({
        x,
        y,
        life: 0.8,
        r: 4 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        col
      });
  }

  // ── the Varg ──
  function raiderStep(r, dt, w) {
    if (r.state === 'gone') {
      // driven off: sheer away north and fade
      r.hd += angDiff(r.hd, -Math.PI / 2) * dt;
      r.spd = lerp(r.spd, 140, dt);
      r.x += Math.cos(r.hd) * r.spd * dt;
      r.y += Math.sin(r.hd) * r.spd * dt;
      r.fade = Math.max(0, (r.fade == null ? 1 : r.fade) - dt / 6);
      return;
    }
    const me = S.me,
      dist = Math.hypot(me.x - r.x, me.y - r.y);
    r.slowed = Math.max(0, r.slowed - dt);
    const fog = Math.max(fogAt(me.x, me.y), fogAt(r.x, r.y) * 0.6);
    const sight = lerp(RAIDER.sight, RAIDER.fogSight, fog);
    const sees = dist < sight;
    let goal = null,
      lazy = true;
    if (r.state === 'patrol') {
      if (sees) {
        r.state = 'chase';
        r.lost = 0;
        S.spotted = true;
        float(r.x, r.y - 230, 'A horn!', '#ffb08a');
        hint('The ' + r.name + ' gives chase! Run, or lose her in the fog.');
        Music.sync();
      } else {
        const p = r.post.leg ? r.post.b : r.post.a;
        if (Math.hypot(p.x - r.x, p.y - r.y) < 90) r.post.leg ^= 1;
        goal = p;
      }
    }
    if (r.state === 'chase') {
      lazy = false;
      r.lost = sees ? 0 : r.lost + dt;
      if (r.lost > RAIDER.giveUpS || Math.hypot(r.x - r.home.x, r.y - r.home.y) > RAIDER.leash) {
        r.state = 'return';
        float(r.x, r.y - 230, 'Lost you!', '#c8d8e0');
        hint('The ' + r.name + ' gives up the chase.');
        Music.sync();
      } else {
        // aim where you'll be
        const lead = clamp(dist / (MAX_SPD * 0.9), 0, 3);
        goal = { x: me.x + Math.cos(me.hd) * me.spd * lead, y: me.y + Math.sin(me.hd) * me.spd * lead };
      }
    }
    if (r.state === 'return') {
      goal = r.home;
      if (sees && dist < sight * 0.7) {
        r.state = 'chase';
        r.lost = 0;
      } else if (Math.hypot(r.home.x - r.x, r.home.y - r.y) < 120) r.state = 'patrol';
    }
    // steer for the goal, round rocks and the coast: try headings fanning out from the wanted one
    const want = goal ? Math.atan2(goal.y - r.y, goal.x - r.x) : r.hd;
    let best = want;
    for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2]) {
      const h = want + da;
      let clear = true;
      for (const look of [90, 180, 280]) {
        const s = seabed(r.x + Math.cos(h) * look, r.y + Math.sin(h) * look, SHIP_R + 10);
        if (s.hit) {
          clear = false;
          break;
        }
      }
      if (clear) {
        best = h;
        break;
      }
    }
    r.hd += clamp(angDiff(r.hd, best), -1, 1) * TURN * 1.1 * dt;
    const off = angDiff(r.hd, w.from);
    let target = MAX_SPD * RAIDER.speed * polar(off, true) * w.str * (lazy ? 0.5 : 1);
    if (!lazy) target = Math.max(target, RAIDER.row);
    if (r.slowed > 0) target *= RAIDER.slowedMul;
    r.spd = lerp(r.spd, target, 1 - Math.exp(-dt * 0.8));
    r.x += Math.cos(r.hd) * r.spd * dt;
    r.y += Math.sin(r.hd) * r.spd * dt;
    const s = seabed(r.x, r.y, SHIP_R);
    if (s.hit) {
      r.x += s.hit.nx * (s.hit.d + 2);
      r.y += s.hit.ny * (s.hit.d + 2);
      r.spd *= 0.5;
    }
    wakeFor(r, dt);
    // grappling
    if (r.state === 'chase' && dist < RAIDER.grapple && r.slowed <= 0) {
      if (!r.hook) hint('Grappling hooks! Pull away before they board!');
      r.hook += dt;
      if (r.hook >= RAIDER.grappleS) board(r);
    } else r.hook = Math.max(0, r.hook - dt * 1.5);
  }

  // ── boarding ──
  function tollOf() {
    return 'a tenth of the hold';
  }
  function board(r) {
    S.paused = true;
    r.hook = 0;
    S.boarded++;
    S.clean = false;
    const crew = crewOf(r);
    card(
      `<h2>Boarders!</h2><p>Hooks bite the Kittiwake's rail and the ${r.name} grinds alongside. Varg swarm over the gap, axes up: ${crew.length} of them, ${r.level ? 'hard-bitten reavers' : 'young bloods'}.</p><p>Crake grips your arm. "Fight them off, and they'll sheer away. Or I pay ${tollOf()}, and the lugger gets nothing worth the trip."</p>`,
      [
        { label: '⚔ Repel boarders', main: true, fn: () => fight(r, crew) },
        { label: '💰 Let her pay the toll', fn: () => finish('paid') }
      ]
    );
  }
  function crewOf(r) {
    const lv = r.level;
    return lv >= 2
      ? [
          { key: 'varg_alpha', level: 1, name: 'Varg Reaver-Chief' },
          { key: 'varg', level: 1 },
          { key: 'varg', level: 1 }
        ]
      : lv === 1
        ? [
            { key: 'varg_alpha', level: 0, name: 'Varg Helmsman' },
            { key: 'varg', level: 0 }
          ]
        : [
            { key: 'varg', level: 0, name: 'Varg Reaver' },
            { key: 'varg', level: 0, name: 'Varg Reaver' }
          ];
  }
  function fight(r, crew) {
    const wk = ctx ? ctx.wizKey : 'nerissa';
    if (typeof startExploreBattle !== 'function' || typeof CHAR_DEFS === 'undefined' || !CHAR_DEFS[wk]) {
      // no battle engine (a test page): a coin flip weighted by the crew
      return afterFight(r, Math.random() < 0.7 - 0.15 * r.level, null);
    }
    $('sl-screen').classList.remove('active');
    Music.stop();
    if (ctx && ctx.beforeBattle) ctx.beforeBattle();
    const deck = window.Placeholders && Placeholders.real && Placeholders.real('arena_deck');
    startExploreBattle({
      wizKey: wk,
      foes: crew,
      hp: ctx ? Math.max(1, ctx.hp()) : CHAR_DEFS[wk].hp,
      arena: deck ? 'deck' : 'drowned',
      fists: ctx && ctx.tired ? ctx.tired() : false,
      text: {
        winTitle: 'Boarders Repelled',
        win: 'The last Varg goes over the rail. Their ship cuts the hooks and sheers away.',
        loseTitle: 'Taken',
        lose: "You go down on the deck. The Varg empty the Kittiwake's hold."
      },
      onEnd: (won, low, allyHp, info) => {
        $('sl-screen').classList.add('active');
        fit();
        last = performance.now();
        if (window.Explore && Explore.titleMusic) Explore.titleMusic();
        afterFight(r, won, info);
      }
    });
  }
  function afterFight(r, won, info) {
    if (ctx && info) ctx.setHp(Math.max(1, info.hpEnd));
    if (won) {
      r.state = 'gone';
      r.hook = 0;
      // the struggle cost way: the Kittiwake drifts while the hooks are cut
      S.me.spd *= 0.3;
      float(r.x, r.y - 230, 'Sheering away!', '#ffe08a');
      S.paused = false;
      Music.sync();
    } else finish('taken');
  }

  // ── the end ──
  function finish(how) {
    if (S.over) return;
    S.over = how;
    S.paused = true;
    Music.sync();
    const me = S.me;
    let pay = 0,
      lines = [];
    if (how === 'won') {
      pay = PAY.base + (S.runs ? 0 : PAY.first);
      lines.push(`The lugger's fee: ${pay} gold.`);
      if (me.hull >= PAY.cleanHull) {
        pay += PAY.clean;
        lines.push(`A sound hull: +${PAY.clean}.`);
      }
      if (!S.boarded) {
        pay += PAY.unboarded;
        lines.push(`Never boarded: +${PAY.unboarded}.`);
      }
    }
    const res = { how, pay, hull: Math.round(me.hull), boarded: S.boarded, time: Math.round(S.t) };
    const T = {
      won: [
        'Off Gull Head',
        `A grey lugger shows a lantern twice, and Crake laughs out loud. The cargo goes over the side into Halemouth hands, the coin comes back up, and nobody asks anyone's name. "${me.hull >= PAY.cleanHull ? 'Not a scratch on her. ' : ''}You can sail with me again, wizard."`
      ],
      sunk: [
        'Foundered',
        'The Kittiwake settles by the head with her holds full of sea. You and Crake cling to a hatch-cover until a Gilden fishing boat hauls you out, half-drowned. "Fettle will kill me," she says. "Then he\'ll build me another."'
      ],
      taken: [
        'Taken',
        'The Varg leave you bruised on the deck and the hold empty. "A tenth, they said," Crake mutters, looking down into it. "That was all of it." The Kittiwake limps home to Gilden.'
      ],
      paid: [
        'The Toll Paid',
        "Crake counts out the Varg's tenth with a face like a wet week. The raider casts off, laughing. There's nothing left worth the lugger's while, and the Kittiwake turns for home."
      ],
      turned: [
        'Turned Back',
        'Crake puts about for Gilden without a word. The Varg will still be there tomorrow.'
      ]
    }[how];
    if (ctx && ctx.onEnd) {
      try {
        const extra = ctx.onEnd(res);
        if (extra) lines.push(extra);
      } catch (e) {}
    }
    if (how === 'sunk' && ctx) ctx.setHp(Math.max(1, Math.round(ctx.hp() * 0.75)));
    card(
      `<h2>${T[0]}</h2><p>${T[1]}</p>${lines.length ? '<p class="sl-pay">' + lines.join(' ') + '</p>' : ''}<p class="sl-stat">Hull ${res.hull}% · boarded ${res.boarded}× · ${Math.floor(res.time / 60)}:${String(res.time % 60).padStart(2, '0')} at the helm</p>`,
      ctx
        ? [{ label: '⚓ Back to Gilden', main: true, fn: close }]
        : [
            { label: '⛵ Sail again', main: true, fn: () => open({}) },
            { label: 'Close', fn: close }
          ]
    );
  }

  // ── drawing ──
  // the camera leads the ship along its heading (a third of the view), eased so turning doesn't jerk it
  function cam() {
    const me = S.me,
      lead = (Math.min(vw, vh) / zoom) * 0.28 * clamp(me.spd / 120, 0.3, 1);
    const tx = me.x + Math.cos(me.hd) * lead,
      ty = me.y - 90 + Math.sin(me.hd) * lead * 0.7;
    if (!S.cam) S.cam = { x: tx, y: ty };
    return S.cam;
  }
  function moveCam(dt) {
    const c = cam(),
      me = S.me,
      lead = (Math.min(vw, vh) / zoom) * 0.28 * clamp(me.spd / 120, 0.3, 1);
    const tx = me.x + Math.cos(me.hd) * lead,
      ty = me.y - 90 + Math.sin(me.hd) * lead * 0.7;
    const k = 1 - Math.exp(-dt * 2.5);
    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * k;
  }
  const W2S = (cm, x, y) => [(x - cm.x) * zoom + vw / 2, (y - cm.y) * zoom + vh / 2];

  function draw() {
    const c = c2,
      t = S.vis,
      cm = cam();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.shake > 0) c.translate((Math.random() - 0.5) * 10 * S.shake, (Math.random() - 0.5) * 10 * S.shake);
    // the sea
    const g = c.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, '#1d5a78');
    g.addColorStop(1, '#174a66');
    c.fillStyle = g;
    c.fillRect(-20, -20, vw + 40, vh + 40);
    c.save();
    c.translate(vw / 2, vh / 2);
    c.scale(zoom, zoom);
    c.translate(-cm.x, -cm.y);
    const x0 = cm.x - vw / 2 / zoom - 100,
      x1 = cm.x + vw / 2 / zoom + 100,
      y0 = cm.y - vh / 2 / zoom - 100,
      y1 = cm.y + vh / 2 / zoom + 100;
    drawWaves(c, x0, x1, y0, y1, t);
    drawShallows(c, x0, x1);
    drawCoast(c, x0, x1, y0, y1);
    for (const o of S.C.rocks) if (o.x > x0 - 300 && o.x < x1 + 300) drawRock(c, o, t);
    drawWake(c);
    drawGoal(c, t);
    // ships, back to front
    const ships = [S.me, ...S.raiders].filter(s => s.x > x0 - 400 && s.x < x1 + 400);
    ships.sort((a, b) => a.y - b.y);
    for (const s of ships) drawShip(c, s, t);
    for (const r of S.raiders) if (r.hook > 0) drawHooks(c, r);
    for (const b of S.bolts) drawBolt(c, b);
    drawFog(c, x0, x1, t);
    for (const f of S.floats) {
      f.life -= 1 / 60;
      c.globalAlpha = clamp(f.life, 0, 1);
      c.font = `bold ${Math.round((vw < 600 ? 15 : 20) / zoom)}px Georgia`;
      c.textAlign = 'center';
      c.lineWidth = 4 / zoom;
      c.strokeStyle = 'rgba(0,0,0,.7)';
      c.strokeText(f.text, f.x, f.y - (1.6 - f.life) * 40);
      c.fillStyle = f.col;
      c.fillText(f.text, f.x, f.y - (1.6 - f.life) * 40);
      c.globalAlpha = 1;
    }
    S.floats = S.floats.filter(f => f.life > 0);
    c.restore();
    drawOffscreen(c, cm);
  }

  function drawWaves(c, x0, x1, y0, y1, t) {
    // drifting wave crests on a grid, seeded by cell so they don't flicker
    c.strokeStyle = 'rgba(190,230,255,0.16)';
    c.lineWidth = 2;
    const step = 90;
    for (let gx = Math.floor(x0 / step) * step; gx < x1; gx += step)
      for (let gy = Math.floor(y0 / step) * step; gy < y1; gy += step) {
        const h = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453,
          f = h - Math.floor(h);
        const ph = t * 0.8 + f * 6;
        const a = 0.5 + 0.5 * Math.sin(ph);
        if (a < 0.25) continue;
        const x = gx + f * 60 + Math.sin(t * 0.3 + f * 9) * 12,
          y = gy + ((f * 7) % 1) * 60;
        c.globalAlpha = a;
        c.beginPath();
        c.moveTo(x - 14, y);
        c.quadraticCurveTo(x, y - 6, x + 14, y);
        c.stroke();
      }
    c.globalAlpha = 1;
  }
  function drawShallows(c, x0, x1) {
    const C = S.C;
    c.fillStyle = 'rgba(120,200,200,0.28)';
    for (const b of C.bars) {
      if (b.x + b.rx < x0 || b.x - b.rx > x1) continue;
      c.beginPath();
      c.ellipse(b.x, b.y, b.rx, b.ry, b.a, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(210,200,150,0.22)';
      c.beginPath();
      c.ellipse(b.x, b.y, b.rx * 0.6, b.ry * 0.45, b.a, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(120,200,200,0.28)';
    }
    // the shallow band along each coast
    for (const [fn, sgn] of [
      [C.north, 1],
      [C.south, -1]
    ]) {
      c.beginPath();
      for (let x = x0; x <= x1; x += 40) c.lineTo(x, fn(x));
      for (let x = x1; x >= x0; x -= 40) c.lineTo(x, fn(x) + sgn * SHALLOW);
      c.closePath();
      const gg = c.createLinearGradient(0, 0, 0, 1);
      c.fillStyle = 'rgba(110,190,195,0.3)';
      c.fill();
    }
  }
  function drawCoast(c, x0, x1, y0, y1) {
    const C = S.C;
    for (const [fn, edge] of [
      [C.north, y0 - 400],
      [C.south, y1 + 400]
    ]) {
      // beach
      c.beginPath();
      c.moveTo(x0, edge);
      for (let x = x0; x <= x1; x += 30) c.lineTo(x, fn(x) + (edge < 0 ? 0 : 0));
      c.lineTo(x1, edge);
      c.closePath();
      c.fillStyle = '#c9b582';
      c.fill();
      // land
      const inset = edge < fn(x0) ? -26 : 26;
      c.beginPath();
      c.moveTo(x0, edge);
      for (let x = x0; x <= x1; x += 30) c.lineTo(x, fn(x) + inset + 8 * Math.sin(x / 47));
      c.lineTo(x1, edge);
      c.closePath();
      c.fillStyle = edge < fn(x0) ? '#4f6b3a' : '#5d6e3c';
      c.fill();
      // foam line
      c.strokeStyle = 'rgba(240,250,255,0.55)';
      c.lineWidth = 3;
      c.beginPath();
      for (let x = x0; x <= x1; x += 30)
        c.lineTo(x, fn(x) + (inset < 0 ? 6 : -6) * (1 + 0.4 * Math.sin(x / 33 + S.vis * 2)));
      c.stroke();
      // trees, seeded by position
      for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) {
        const h = Math.sin(x * 3.17) * 9999,
          f = h - Math.floor(h);
        if (f < 0.35) continue;
        const ty = fn(x) + inset * (3 + f * 8);
        c.fillStyle = f > 0.7 ? '#3c5a2c' : '#476a33';
        c.beginPath();
        c.arc(x + f * 30, ty, 18 + f * 14, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Gilden's Harbour Light at the start, and Gull Head's cairn
    for (const mk of C.marks) {
      if (mk.x < x0 - 200 || mk.x > x1 + 200 || mk.side === 'm') continue;
      const y = mk.side === 'n' ? C.north(mk.x) - 60 : C.south(mk.x) + 80;
      if (mk.name === 'Gilden') {
        c.fillStyle = '#d8cfb8';
        c.fillRect(mk.x - 16, y - 90, 32, 90);
        c.fillStyle = '#ffd36a';
        c.beginPath();
        c.arc(mk.x, y - 100, 14 + 4 * Math.sin(S.vis * 3), 0, Math.PI * 2);
        c.fill();
      }
      c.font = 'italic 34px Georgia';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(30,25,15,0.7)';
      c.fillText(mk.name === 'Gilden' ? 'Gilden Light' : mk.name, mk.x, y + (mk.side === 'n' ? -120 : 40));
    }
  }
  function drawRock(c, o, t) {
    // foam ring
    c.strokeStyle = 'rgba(235,248,255,0.5)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(o.x, o.y, o.r + 8 + 3 * Math.sin(t * 2 + o.k * 9), 0, Math.PI * 2);
    c.stroke();
    // a lumpy rock
    c.fillStyle = o.isle ? '#7a6f5a' : '#5d5a58';
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        rr = o.r * (0.82 + 0.18 * Math.sin(a * 3 + o.k * 20));
      c.lineTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr);
    }
    c.fill();
    c.fillStyle = o.isle ? '#56743c' : '#8a8580';
    c.beginPath();
    c.ellipse(
      o.x - o.r * 0.15,
      o.y - o.r * 0.2,
      o.r * (o.isle ? 0.7 : 0.45),
      o.r * (o.isle ? 0.6 : 0.35),
      0,
      0,
      Math.PI * 2
    );
    c.fill();
    if (o.isle) {
      for (let i = 0; i < 5; i++) {
        const a = o.k * 30 + i * 1.3,
          d = o.r * 0.35 * ((i * 0.37 + o.k) % 1);
        c.fillStyle = '#3c5a2c';
        c.beginPath();
        c.arc(
          o.x + Math.cos(a) * d - o.r * 0.1,
          o.y + Math.sin(a) * d - o.r * 0.25,
          o.r * 0.18,
          0,
          Math.PI * 2
        );
        c.fill();
      }
    }
  }
  function drawWake(c) {
    for (const w of S.wake) {
      w.life -= 1 / 60 / (w.col ? 0.8 : 2.4);
      w.x += (w.vx || 0) / 60;
      w.y += (w.vy || 0) / 60;
      w.r += 0.25;
      c.globalAlpha = clamp(w.life, 0, 1) * 0.55;
      c.fillStyle = w.col || '#eef8ff';
      c.beginPath();
      c.ellipse(w.x, w.y, w.r * 1.4, w.r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    S.wake = S.wake.filter(w => w.life > 0);
    if (S.wake.length > 700) S.wake.splice(0, S.wake.length - 700);
  }
  function drawGoal(c, t) {
    // the lugger: a small grey sail and two lantern flashes
    const x = GOAL_X - 250,
      y = S.C.lane(GOAL_X - 250);
    c.fillStyle = 'rgba(255,220,120,0.15)';
    c.beginPath();
    c.arc(x, y, 160 + 20 * Math.sin(t * 2), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3b3530';
    c.beginPath();
    c.ellipse(x, y, 70, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#a9a294';
    c.beginPath();
    c.moveTo(x - 10, y - 10);
    c.lineTo(x - 10, y - 130);
    c.lineTo(x + 55, y - 20);
    c.closePath();
    c.fill();
    if (Math.sin(t * 3) > 0.3) {
      c.fillStyle = '#ffd36a';
      c.beginPath();
      c.arc(x + 50, y - 20, 9, 0, Math.PI * 2);
      c.fill();
    }
  }
  function drawShip(c, s, t) {
    const sh = SHIPS && SHIPS[s.kind];
    const oct = ((Math.round(s.hd / (Math.PI / 4)) % 8) + 8) % 8;
    const [view, flip] = viewFor(s.kind, oct);
    const key = view + (flip ? '-' : '+');
    if (s.view !== key) {
      s.prev = s.view;
      s.view = key;
      s.fadeT = 0.25;
    }
    s.fadeT = Math.max(0, (s.fadeT || 0) - 1 / 60);
    const H = SHIP_H[s.kind],
      alpha = s.fade == null ? 1 : s.fade;
    if (alpha <= 0) return;
    const bob = Math.sin(t * 1.6 + (s.bob || 0)) * 3,
      roll = Math.sin(t * 1.1 + (s.bob || 0)) * 0.025;
    // a shadow on the water
    c.fillStyle = 'rgba(5,25,40,0.35)';
    c.globalAlpha = alpha;
    c.beginPath();
    const vv = sh && sh.views[view];
    const wid = vv ? (vv.w / vv.h) * H : 200;
    c.ellipse(s.x, s.y + 6, wid * 0.45, 22, 0, 0, Math.PI * 2);
    c.fill();
    const drawView = (k, a) => {
      if (!k || !sh) return;
      const v = sh.views[k.slice(0, -1)],
        fl = k.endsWith('-');
      const im = img(v.src);
      if (!im.complete || !im.naturalWidth) return;
      const w = (v.w / v.h) * H;
      c.save();
      c.translate(s.x, s.y + bob);
      c.rotate(roll);
      if (fl) c.scale(-1, 1);
      // the part above the waterline in full, the hull below it faint, as if under the water
      const wl = v.wl * H;
      c.globalAlpha = a * alpha;
      c.save();
      c.beginPath();
      c.rect(-w / 2 - 5, -wl - 5, w + 10, wl + 5);
      c.clip();
      c.drawImage(im, -w / 2, -wl, w, H);
      c.restore();
      c.globalAlpha = a * alpha * 0.28;
      c.save();
      c.beginPath();
      c.rect(-w / 2 - 5, 0, w + 10, H - wl + 5);
      c.clip();
      c.drawImage(im, -w / 2, -wl, w, H);
      c.restore();
      c.restore();
    };
    const f = s.fadeT / 0.25;
    if (f > 0 && s.prev) drawView(s.prev, f);
    drawView(s.view, 1 - f * 0.5);
    // foam at the waterline
    c.globalAlpha = alpha * clamp(s.spd / 150, 0.25, 0.8);
    c.strokeStyle = '#f2fbff';
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(s.x, s.y + bob + 2, wid * 0.42, 12, 0, 0.1, Math.PI - 0.1);
    c.stroke();
    c.globalAlpha = 1;
    // a raider's name and how close it is to boarding
    if (s.kind === 'varg' && s.state !== 'gone') {
      c.font = `${Math.round(15 / zoom)}px Georgia`;
      c.textAlign = 'center';
      c.fillStyle = s.state === 'chase' ? '#ff9a7a' : 'rgba(230,220,200,0.85)';
      c.fillText((s.state === 'chase' ? '⚠ ' : '') + s.name, s.x, s.y + 40);
      if (s.slowed > 0) {
        c.fillStyle = '#ffe08a';
        c.fillText('rigging torn', s.x, s.y + 40 + 18 / zoom);
      }
    }
    if (s === S.me && S.gust > 0) {
      c.strokeStyle = elemCol();
      c.globalAlpha = 0.6;
      c.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = S.vis * 4 + i,
          r = 60 + ((i * 23) % 70);
        c.beginPath();
        c.arc(s.x - Math.cos(s.hd) * 40, s.y - 130 + Math.sin(a) * 30, r, a, a + 0.7);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
  }
  function drawHooks(c, r) {
    const me = S.me;
    c.strokeStyle = '#2a2018';
    c.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(r.x + (i - 1) * 30, r.y - 60);
      c.quadraticCurveTo((r.x + me.x) / 2, (r.y + me.y) / 2 - 20, me.x + (i - 1) * 30, me.y - 60);
      c.stroke();
    }
    // the boarding meter
    const f = r.hook / RAIDER.grappleS;
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(me.x - 60, me.y - 260, 120, 10);
    c.fillStyle = '#ff6a4a';
    c.fillRect(me.x - 60, me.y - 260, 120 * f, 10);
  }
  function drawBolt(c, b) {
    c.fillStyle = b.col;
    c.shadowColor = b.col;
    c.shadowBlur = 20;
    c.beginPath();
    c.arc(b.x, b.y, 12, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  }
  function drawFog(c, x0, x1, t) {
    const all = S.C.fog
      .map(f => ({ x: f.x, y: f.y, r: f.r, a: 0.55 }))
      .concat(S.mists.map(m => ({ x: m.x, y: m.y, r: m.r, a: 0.6 * Math.min(1, m.age / 1.5, m.life / 3) })));
    for (const f of all) {
      if (f.x + f.r < x0 || f.x - f.r > x1) continue;
      for (let i = 0; i < 4; i++) {
        const ox = Math.sin(t * 0.2 + i * 2) * f.r * 0.25,
          oy = Math.cos(t * 0.17 + i * 1.7) * f.r * 0.15;
        const g = c.createRadialGradient(f.x + ox, f.y + oy, 0, f.x + ox, f.y + oy, f.r * 0.8);
        g.addColorStop(0, `rgba(225,232,238,${f.a * 0.6})`);
        g.addColorStop(1, 'rgba(225,232,238,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(f.x + ox, f.y + oy, f.r * 0.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  // arrows at the screen's edge toward chasing raiders out of sight
  function drawOffscreen(c, cm) {
    for (const r of S.raiders) {
      if (r.state !== 'chase') continue;
      const [sx, sy] = W2S(cm, r.x, r.y - 80);
      if (sx > 0 && sx < vw && sy > 0 && sy < vh) continue;
      const a = Math.atan2(sy - vh / 2, sx - vw / 2);
      const ex = clamp(vw / 2 + Math.cos(a) * vw, 24, vw - 24),
        ey = clamp(vh / 2 + Math.sin(a) * vh, 24, vh - 24);
      c.save();
      c.translate(ex, ey);
      c.rotate(a);
      c.fillStyle = '#ff6a4a';
      c.beginPath();
      c.moveTo(14, 0);
      c.lineTo(-10, -10);
      c.lineTo(-10, 10);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  // ── the HUD ──
  function hud() {
    const me = S.me;
    const hb = $('sl-hull');
    hb.style.width = me.hull + '%';
    hb.style.background = me.hull > 60 ? '#6ac46a' : me.hull > 30 ? '#e0b040' : '#e05a40';
    // progress: Gilden on the right, the lugger on the left (you sail west)
    const p = $('sl-prog');
    if (!p.firstChild) {
      p.innerHTML =
        '<div class="sl-track"></div>' +
        S.C.marks
          .map(m => `<span class="sl-mark" style="left:${(m.x / L) * 100}%">${m.name}</span>`)
          .join('') +
        '<i class="sl-me"></i>';
      S._raidDots = [];
    }
    p.querySelector('.sl-me').style.left = clamp((me.x / L) * 100, 0, 100) + '%';
    // raider dots on the track once they're about
    p.querySelectorAll('.sl-rd').forEach(n => n.remove());
    for (const r of S.raiders)
      if (r.state === 'chase') {
        const d = document.createElement('b');
        d.className = 'sl-rd';
        d.style.left = clamp((r.x / L) * 100, 0, 100) + '%';
        p.appendChild(d);
      }
    // the wind rose
    const w = S.wind,
      rc = $('sl-rose').getContext('2d');
    rc.clearRect(0, 0, 96, 96);
    rc.save();
    rc.translate(48, 48);
    rc.strokeStyle = 'rgba(240,220,170,.6)';
    rc.lineWidth = 1.5;
    rc.beginPath();
    rc.arc(0, 0, 40, 0, Math.PI * 2);
    rc.stroke();
    rc.fillStyle = 'rgba(240,220,170,.85)';
    rc.font = 'bold 11px Georgia';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillText('N', 0, -33);
    // the ship's heading
    rc.strokeStyle = '#f3e1a8';
    rc.lineWidth = 3;
    rc.beginPath();
    rc.moveTo(0, 0);
    rc.lineTo(Math.cos(me.hd) * 26, Math.sin(me.hd) * 26);
    rc.stroke();
    // the wind: an arrow blowing in from where it comes
    rc.rotate(w.from + Math.PI);
    rc.fillStyle = '#9fd8ff';
    rc.beginPath();
    rc.moveTo(-36, -6);
    rc.lineTo(-10, -6);
    rc.lineTo(-10, -12);
    rc.lineTo(4, 0);
    rc.lineTo(-10, 12);
    rc.lineTo(-10, 6);
    rc.lineTo(-36, 6);
    rc.closePath();
    rc.fill();
    rc.restore();
    const off = angDiff(me.hd, w.from);
    $('sl-pos').innerHTML =
      `<b>${S.gust > 0 ? 'Magic wind!' : pointOfSail(off)}</b><span>${Math.round(me.spd / 24)} knots</span>`;
    $('sl-pos').classList.toggle('bad', S.gust <= 0 && Math.abs(off) < 0.7);
    updateSpellBtns();
  }

  // ── music: Gilden's theme under sail, the battle theme while the Varg chase ──
  const Music = {
    a: null,
    src: null,
    want() {
      if (!isOpen() || !musicOn() || !S) return null;
      if (!S.over && S.raiders.some(r => r.state === 'chase')) return 'audio/battle_theme.mp3';
      return 'audio/gilden_theme.mp3';
    },
    sync() {
      const want = this.want();
      if (want === this.src && this.a && !this.a.paused) return;
      this.stop();
      if (!want) return;
      try {
        const a = new Audio(want);
        a.loop = true;
        a.volume = 0.45;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
        this.a = a;
        this.src = want;
      } catch (e) {}
    },
    stop() {
      if (this.a)
        try {
          this.a.pause();
        } catch (e) {}
      this.a = null;
      this.src = null;
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    const b = $('btn-sail');
    if (b) b.addEventListener('click', () => open({}));
  });
  window.Sailing = {
    open,
    close,
    // for tests
    _state: () => S,
    _course: buildCourse,
    _step: dt => step(dt),
    _steer: (x, y) => (pointer = x == null ? null : { x, y }),
    _view: () => ({ vw, vh, zoom, cam: cam() }),
    POLAR: polar,
    SPELLS,
    PAY
  };
})();
