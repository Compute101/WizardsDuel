// ═══════════════════════════════════════════════════════════════════════
// THE STONEHEART DELVE (screen). Rules live in js/mine_engine.js; design in docs/mine-design.md.
// ⛏ Stoneheart Delve in the title screen's Test menu opens it. Drawn on a canvas until the tile art
// arrives (docs/mine-design.md, "Art needed"). Saved on the device (localStorage wd-mine-save).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const M = window.MineEngine;
  const $ = id => document.getElementById(id);
  const SAVE = 'wd-mine-save';
  const W = M.W,
    LH = M.LH; // one layer's rows; the layers are stacked in one tall grid, and the map shows one at a time

  let S = null,
    raf = 0,
    last = 0,
    speed = 1,
    eye = null,
    eyeAt = 0,
    saveAt = 0,
    logSeen = 0;
  const ui = { tool: 'look', sel: null, tab: 'crew', overlay: false, menu: null, drag: null, lz: 0 };
  const Y0 = () => M.topOf(ui.lz); // the first row of the layer on screen
  const onView = y => M.layerOf(Math.round(y)) === ui.lz;
  function showLayer(z) {
    z = Math.max(0, Math.min(S.depth, z));
    if (z === ui.lz) return;
    ui.lz = z;
    eye = null;
    eyeAt = 0;
    renderLayer();
    renderSide(true);
  }
  function renderLayer() {
    const L = M.LAYERS[ui.lz];
    $('mn-lz').textContent = ui.lz + 1;
    $('mn-lz').title = L.name + ' (' + L.stone + ')';
    $('mn-up').disabled = ui.lz === 0;
    $('mn-down').disabled = ui.lz >= S.depth;
    $('mn-lzname').textContent = 'Layer ' + (ui.lz + 1) + ' · ' + L.name;
    $('mn-layers').hidden = !S.depth;
  }
  const view = { zoom: 1, ox: 0, oy: 0 };
  let cv,
    cx,
    cw = 0,
    ch = 0,
    dpr = 1,
    base = 20;
  const MIN_TILE = 22; // on a small screen the map opens zoomed in on the gate, at least this many px a tile

  const TOOLS = [
    ['look', '✋', 'Look', 'Tap a dwarf, Durin, a room or a tile. Drag to move the map.'],
    ['dig', '⛏', 'Dig', 'Drag over rock to mark it for digging. Miners take the nearest.'],
    ['build', '🧱', 'Build', 'Pick what to build.'],
    [
      'smooth',
      '✨',
      'Smooth',
      'Drag over walls and pillars for the mason to smooth. Worked stone is finer, and (later) elementals can’t pass it.'
    ],
    ['room', '🏠', 'Room', 'Pick a room.'],
    [
      'cancel',
      '✖',
      'Clear',
      'Drag to clear marks: digging, pillars, smoothing and building. Takes out a built door. Built walls and pillars are dug out.'
    ]
  ];
  // what the Build button's menu offers (the tool in hand is then 'wall', 'pillar' or 'door')
  const BUILD_MENU = [
    [
      'wall',
      '🧱',
      'Wall',
      'Drag over dug floor for the mason to wall it back up (a dressed block each). Not inside a room. Dig it out again to undo.'
    ],
    [
      'pillar',
      '🏛',
      'Pillar',
      'Drag over rock to keep it as pillars, or over dug floor to have the mason build one (a dressed block each). Pillars hold the roof up: on the Topstone no floor may lie more than 3 tiles from rock or a pillar.'
    ],
    [
      'door',
      '🚪',
      'Door',
      'Drag over dug floor for the mason to hang a door (a dressed block each). Clear takes one out.'
    ],
    [
      'well',
      '💧',
      'Well',
      'Tap dug damp floor (the blue-flecked stone) for the mason to sink a well (a dressed block). The brewer draws water there.'
    ]
  ];
  const ROOM_HELP = {
    stockpile: 'Hauls go here. The gate counts as one, but a stockpile nearer the work saves walking.',
    bedroom: 'One bed. A dwarf with a fine bedroom (2★) sleeps off a grudge.',
    dorm: 'A bed for every 3 tiles. Cheaper than bedrooms, never as good.',
    dining: 'A table for every 6 tiles. Eating anywhere else is a grudge after the first day and a half.',
    farm: 'Needs soil (the brown loam you dig out). The farmer grows deepcaps (food) and cave barley (for ale), turn about.',
    brewery:
      'One still. The brewer turns a barley and a bucket of water into 3 ale. Water comes from a well on damp stone, or, slowly, as meltwater from outside the gate.',
    workshop:
      "One mason's bench, roughed out of rough stone. Here the mason cuts rough stone into dressed blocks, and every bed, table, still, wall, pillar and door takes a block: make this first.",
    kitchen:
      'One hearth. The farmer or brewer cooks 2 deepcaps into 3 meals: the food goes further, and a hot meal at a table settles grudges.',
    forge:
      'One anvil. The smith smelts a copper, a tin and a coal into 2 bronze, and forges a bronze pick from 1 bronze. The old iron picks wear out, and a miner with none digs at half pace.',
    tavern:
      'A keg for every 8 tiles. The crew drink here before anywhere else, and a pint there leaves a dwarf merry for a day (working faster, shrugging off the next everyday grudge) and often strikes out a grudge too. A proper hall: it wants a door on every way in, and a tavern keeper behind the bar (one comes up from Stonedeep when your first tavern is furnished). Closed while the keeper eats or sleeps.',
    taproom:
      'Kegs in an open room that serve themselves: no door or keeper needed, but it only slakes thirst: no merriment, no grudges struck out. The crew go to an open tavern first.',
    infirmary:
      'A cot for every 4 tiles. Hard rock and ore sometimes hurt a dwarf, who works at half pace until mended: a quarter of a day in a cot, a day and a half walking it off.',
    barracks:
      'A weapon rack for every 4 tiles. Draft a dwarf as a warrior (tap them, ⚔ Draft) and they train here when idle, getting better with every bout, and go after any elemental that wakes on their layer. The smith forges their war-hammers and mail.',
    memorial:
      'A carved plaque. When a dwarf falls, the rest mourn: here they carve a word for the dead and are the easier for it. Needs no door.',
    greathall:
      'The pride of the Delve: one only, at least 40 tiles (60 for its second star), a table for every 6. The crew eat here before anywhere else, and every meal in it strikes out a grudge.'
  };
  const STOCK_ICON = [
    ['food', '🍄', 'Food'],
    ['ale', '🍺', 'Ale'],
    ['stone', '🪨', 'Rough stone (from digging)'],
    ['block', '🧱', "Dressed blocks (cut at the mason's workshop; everything built takes one)"],
    ['copper', '🟠', 'Copper ore'],
    ['tin', '⚪', 'Tin ore'],
    ['coal', '⚫', 'Coal'],
    ['barley', '🌾', 'Cave barley'],
    ['water', '💧', 'Water, in buckets (from a well, or meltwater from outside the gate)'],
    ['meal', '🍲', 'Meals (cooked at the kitchen; eaten before raw deepcaps)'],
    ['bronze', '🟫', 'Bronze (smelted at the forge)'],
    ['pick', '⛏', 'Bronze picks in the stock (forged at the forge)'],
    ['hammer', '🔨', 'Bronze war-hammers, for warriors (2 bronze at the forge)'],
    ['ironhammer', '⚒', 'Iron war-hammers (2 iron and a coal)'],
    ['mail', '🛡', 'Iron mail: a warrior takes 40% less from every blow (3 iron and a coal)'],
    ['iron', '🟤', 'Iron ore'],
    ['limestone', '⬜', 'Limestone'],
    ['silver', '🥈', 'Silver ore'],
    ['gems', '💎', 'Gems'],
    ['galestone', '🌀', 'Galestone (air-touched ore)'],
    ['gold', '🟡', 'Gold ore'],
    ['heartsilver', '✨', 'Heartsilver']
  ];
  const STOCK_ALWAYS = new Set(['food', 'ale', 'water', 'stone', 'block']); // the rest show once there's some

  // ── Save ──
  function save() {
    try {
      localStorage.setItem(SAVE, JSON.stringify(S));
    } catch (e) {}
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE) || 'null');
      return s && s.v >= 1 ? M.migrate(s) : null; // any version: migrate brings it up to date
    } catch (e) {
      return null;
    }
  }

  // ── Screen ──
  function build() {
    const d = document.createElement('div');
    d.id = 'mn-screen';
    d.className = 'mn';
    d.innerHTML = `
    <div class="mn-top">
      <div class="mn-title">⛏ The Stoneheart Delve <span id="mn-when"></span></div>
      <div class="mn-stock" id="mn-stock"></div>
      <div class="mn-top-btns">
        <span class="mn-speed" id="mn-speed"></span>
        <button class="mn-btn" id="mn-help" type="button">?</button>
        <button class="mn-btn" id="mn-new" type="button" title="Start a new Delve">↺</button>
        <button class="mn-btn" id="mn-close" type="button">✕</button>
      </div>
    </div>
    <div class="mn-main">
      <div class="mn-map" id="mn-map"><canvas id="mn-cv"></canvas>
        <div class="mn-zoom"><button class="mn-btn" id="mn-zin" type="button">+</button><button class="mn-btn" id="mn-zout" type="button">−</button>
          <button class="mn-btn" id="mn-eye" type="button" title="Show what the Mason's Eye dislikes">👁</button>
          <span class="mn-layers" id="mn-layers" hidden><button class="mn-btn" id="mn-up" type="button" title="The layer above">▲</button><span class="mn-lz" id="mn-lz">1</span><button class="mn-btn" id="mn-down" type="button" title="The layer below">▼</button></span></div>
        <div class="mn-lzname" id="mn-lzname"></div>
        <div class="mn-tools" id="mn-tools"></div>
        <div class="mn-toast" id="mn-toast" title="Tap to dismiss"></div>
        <div class="mn-hint" id="mn-hint"></div>
        <div class="mn-menu" id="mn-menu" hidden></div>
      </div>
      <div class="mn-side">
        <div class="mn-sel" id="mn-sel"></div>
        <div class="mn-tabs" id="mn-tabs"></div>
        <div class="mn-panel" id="mn-panel"></div>
      </div>
    </div>
    <div class="mn-modal" id="mn-modal" hidden><div class="mn-card" id="mn-card"></div></div>`;
    document.body.appendChild(d);
    $('mn-close').onclick = close;
    $('mn-help').onclick = help;
    $('mn-new').onclick = () =>
      modal(
        `<h3>A new Delve?</h3><p>This one will be lost.</p>
    <div class="mn-row"><button class="mn-btn" id="mn-yes">Start again</button><button class="mn-btn" id="mn-no">Keep digging</button></div>`,
        () => {
          $('mn-yes').onclick = () => {
            closeModal();
            start(true);
          };
          $('mn-no').onclick = closeModal;
        }
      );
    $('mn-zin').onclick = () => zoomBy(1.4);
    $('mn-zout').onclick = () => zoomBy(1 / 1.4);
    $('mn-toast').onclick = dismissToast;
    $('mn-up').onclick = () => showLayer(ui.lz - 1);
    $('mn-down').onclick = () => showLayer(ui.lz + 1);
    $('mn-eye').onclick = () => {
      ui.overlay = !ui.overlay;
      $('mn-eye').classList.toggle('on', ui.overlay);
    };
    cv = $('mn-cv');
    cx = cv.getContext('2d');
    cv.addEventListener('pointerdown', pDown);
    cv.addEventListener('pointermove', pMove);
    cv.addEventListener('pointerup', pUp);
    cv.addEventListener('pointercancel', pUp);
    cv.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY);
      },
      { passive: false }
    );
    window.addEventListener('resize', () => {
      if (isOpen()) fitCanvas();
    });
    if (window.ResizeObserver)
      new ResizeObserver(() => {
        if (isOpen()) fitCanvas();
      }).observe($('mn-map'));
    window.addEventListener('keydown', e => {
      if (!isOpen() || !$('mn-modal').hidden) return;
      if (e.key === ' ') {
        e.preventDefault();
        setSpeed(speed ? 0 : 1);
      } else if (e.key === 'Escape') {
        ui.tool = 'look';
        ui.menu = null;
        ui.sel = null;
        renderTools();
        renderSide(true);
      } else if (e.key === '[' || e.key === 'PageUp') showLayer(ui.lz - 1);
      else if (e.key === ']' || e.key === 'PageDown') showLayer(ui.lz + 1);
      else {
        const k = {
          d: 'dig',
          p: 'pillar',
          w: 'wall',
          o: 'door',
          b: 'build',
          s: 'smooth',
          r: 'room',
          c: 'cancel',
          l: 'look'
        }[e.key.toLowerCase()];
        if (k) pickTool(k);
      }
    });
    return d;
  }
  const isOpen = () => {
    const d = $('mn-screen');
    return !!(d && d.classList.contains('active'));
  };

  function open() {
    if (!$('mn-screen')) build();
    $('mn-screen').classList.add('active');
    if (window.Explore && Explore.titleMusic)
      try {
        Explore.titleMusic();
      } catch (e) {}
    start(false);
  }
  function close() {
    if (S) save();
    cancelAnimationFrame(raf);
    raf = 0;
    $('mn-screen').classList.remove('active');
    if (window.Explore && Explore.titleMusic)
      try {
        Explore.titleMusic();
      } catch (e) {}
  }
  function start(fresh) {
    S = (!fresh && loadSave()) || M.newGame();
    logSeen = S.log.length;
    ui.sel = null;
    ui.tool = 'look';
    ui.menu = null;
    ui.lz = 0;
    eye = null;
    if (fresh) save();
    fitCanvas(true);
    renderLayer();
    renderTools();
    renderSpeed();
    renderSide(true);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    if (fresh || !S.t) setTimeout(help, 50);
  }

  // ── the clock ──
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const real = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!isOpen()) return;
    if (speed && $('mn-modal').hidden) M.tick(S, real * speed);
    if (now - eyeAt > 1500) {
      eyeAt = now;
      const r = M.notePatterns(S, ui.lz);
      eye = r.eye;
      if ($('mn-layers').hidden === !!S.depth) renderLayer();
    }
    if (now - saveAt > 5000) {
      saveAt = now;
      save();
    }
    while (logSeen < S.log.length) toast(S.log[logSeen++].msg);
    draw();
    renderTop();
    renderSide(false);
  }
  function setSpeed(v) {
    speed = v;
    renderSpeed();
  }
  function renderSpeed() {
    $('mn-speed').innerHTML = [
      [0, '⏸'],
      [1, '▶'],
      [2, '▶▶'],
      [4, '▶▶▶']
    ]
      .map(
        ([v, l]) =>
          `<button class="mn-btn sm${speed === v ? ' on' : ''}" data-sp="${v}" type="button">${l}</button>`
      )
      .join('');
    $('mn-speed')
      .querySelectorAll('[data-sp]')
      .forEach(b => (b.onclick = () => setSpeed(+b.dataset.sp)));
  }
  let topLast = '';
  function renderTop() {
    const c = M.clockOf(S),
      s = `Day ${M.dayOf(S)} · ${String(c.h).padStart(2, '0')}:${String(c.m).padStart(2, '0')}`;
    const st = STOCK_ICON.filter(([k]) => STOCK_ALWAYS.has(k) || S.stock[k] > 0)
      .map(([k, i, n]) => `<span title="${n}">${i} ${S.stock[k] || 0}</span>`)
      .join('');
    const key = s + st;
    if (key === topLast) return;
    topLast = key;
    $('mn-when').textContent = s;
    $('mn-stock').innerHTML = st;
  }

  // ── toasts (the log's news) ──
  let toastQ = [],
    toastT = 0;
  const TOAST_MS = 2200,
    TOAST_PER_CHAR = 25,
    TOAST_MAX = 6000;
  function toast(msg) {
    if (toastQ.includes(msg)) return;
    toastQ.push(msg);
    if (toastQ.length > 3) toastQ.splice(1, 1); // drop the oldest waiting, keep the one on screen
    if (toastQ.length === 1) showToast();
  }
  function dismissToast() {
    clearTimeout(toastT);
    toastQ.shift();
    showToast();
  }
  function showToast() {
    const el = $('mn-toast');
    if (!toastQ.length) {
      el.classList.remove('on');
      return;
    }
    el.textContent = toastQ[0];
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(
      () => {
        toastQ.shift();
        showToast();
      },
      Math.min(TOAST_MAX, TOAST_MS + toastQ[0].length * TOAST_PER_CHAR)
    );
  }
  function say(msg) {
    toastQ.unshift(msg);
    showToast();
  }

  // why nothing's being built yet: no workshop, no bench, or no rough stone to cut
  function blockNews() {
    const shop = S.rooms.find(r => r.type === 'workshop');
    if (!shop) return "No dressed blocks yet. Make a mason's workshop: the mason cuts them there.";
    if (!S.tiles.some(t => t.fu === 'bench' && t.fb))
      return "The mason will build once the workshop's bench is up (it takes a rough stone).";
    if (!(S.stock.stone > 0)) return 'No rough stone to cut: the miners bring it in as they dig.';
    return 'The mason is cutting blocks at the workshop.';
  }

  // ── tools ──
  const isBuild = t => t === 'wall' || t === 'pillar' || t === 'door' || t === 'well';
  // the tool bar button a tool belongs to
  const barOf = t => (isBuild(t) ? 'build' : t.startsWith('room') ? 'room' : t);
  function pickTool(t) {
    if (t === 'build' || t === 'room') {
      // open (or close) that button's menu; the tool in hand stays until something is picked
      ui.menu = ui.menu === t ? null : t;
      if (t === 'build' && ui.menu && !isBuild(ui.tool)) ui.sel = null;
    } else {
      ui.tool = t;
      ui.menu = null;
    }
    renderTools();
    renderSide(true);
  }
  function pickFromMenu(t) {
    ui.tool = t;
    ui.menu = null;
    renderTools();
    renderSide(true);
  }
  // what the tool in hand does, in a line over the tool bar (it changes with the tool; no need to dismiss it)
  function renderHint() {
    let text = '';
    if (ui.menu === 'build')
      text = 'What should the mason build? A dressed block each, cut at a mason\u2019s workshop.';
    else if (ui.menu === 'room') text = 'Which room? Then drag over dug floor.';
    else if (ui.tool.startsWith('room:')) {
      const k = ui.tool.slice(5);
      text = 'Drag over dug floor to make a ' + M.ROOMS[k].name.toLowerCase() + '. ' + ROOM_HELP[k];
    } else {
      const T = BUILD_MENU.concat(TOOLS).find(x => x[0] === ui.tool);
      text = T ? T[3] : '';
    }
    const el = $('mn-hint');
    el.textContent = text;
    el.hidden = !text || (ui.tool === 'look' && !ui.menu);
    // sit above the tool bar, and above the menu when one is open
    const bar = $('mn-tools'),
      m = $('mn-menu');
    el.style.bottom = bar.offsetHeight + 12 + (m.hidden ? 0 : m.offsetHeight + 8) + 'px';
    m.style.bottom = bar.offsetHeight + 14 + 'px';
  }
  function renderTools() {
    const cur = barOf(ui.tool);
    $('mn-tools').innerHTML = TOOLS.map(([k, i, n]) => {
      // Build shows what it's set to build, once something is picked
      if (k === 'build' && isBuild(ui.tool)) [, i, n] = BUILD_MENU.find(b => b[0] === ui.tool);
      if (k === 'room' && ui.tool.startsWith('room:')) n = M.ROOMS[ui.tool.slice(5)].name.split(' ')[0];
      const on = ui.menu ? ui.menu === k : cur === k; // an open menu lights only its own button
      const more = k === 'build' || k === 'room' ? ' ▴' : '';
      return `<button class="mn-btn${on ? ' on' : ''}" data-tool="${k}" type="button" title="${n}">${i}<small>${n}${more}</small></button>`;
    }).join('');
    $('mn-tools')
      .querySelectorAll('[data-tool]')
      .forEach(b => (b.onclick = () => pickTool(b.dataset.tool)));
    // the open menu: big buttons, easy to hit with a thumb
    const m = $('mn-menu');
    m.hidden = !ui.menu;
    if (ui.menu === 'build')
      m.innerHTML = BUILD_MENU.map(
        ([k, i, n]) =>
          `<button class="mn-btn${ui.tool === k ? ' on' : ''}" data-pick="${k}" type="button">${i}<small>${n}</small></button>`
      ).join('');
    else if (ui.menu === 'room')
      m.innerHTML = Object.entries(M.ROOMS)
        .map(
          ([k, R]) =>
            `<button class="mn-btn${ui.tool === 'room:' + k ? ' on' : ''}" data-pick="room:${k}" type="button"><span class="mn-swatch" style="background:${R.col}"></span><small>${R.name}</small></button>`
        )
        .join('');
    m.querySelectorAll('[data-pick]').forEach(b => (b.onclick = () => pickFromMenu(b.dataset.pick)));
    renderHint();
  }

  // ── the side panel ──
  let sideLast = '';
  function renderSide(force) {
    const sel = selHtml(),
      tabs = [
        ['crew', 'Crew'],
        ['ledger', 'Ledger'],
        ['quota', 'Quota'],
        ['eye', "Mason's Eye"],
        ['log', 'Log']
      ];
    const body = { crew: crewHtml, ledger: ledgerHtml, quota: quotaHtml, eye: eyeHtml, log: logHtml }[
      ui.tab
    ]();
    const key = sel + '|' + ui.tab + '|' + body;
    if (!force && key === sideLast) return;
    sideLast = key;
    $('mn-sel').innerHTML = sel;
    $('mn-sel').hidden = !sel;
    $('mn-tabs').innerHTML = tabs
      .map(
        ([k, n]) =>
          `<button class="mn-tab${ui.tab === k ? ' on' : ''}" data-tab="${k}" type="button">${n}</button>`
      )
      .join('');
    $('mn-panel').innerHTML = body;
    $('mn-tabs')
      .querySelectorAll('[data-tab]')
      .forEach(
        b =>
          (b.onclick = () => {
            ui.tab = b.dataset.tab;
            renderSide(true);
          })
      );
    $('mn-panel')
      .querySelectorAll('[data-dw]')
      .forEach(
        b =>
          (b.onclick = () => {
            ui.sel = { kind: 'dwarf', id: +b.dataset.dw };
            const d = S.dwarves.find(w => w.id === ui.sel.id);
            if (d) showLayer(M.layerOf(Math.round(d.y)));
            renderSide(true);
          })
      );
    const bk = $('mn-book');
    if (bk) bk.onclick = delveBook;
    const sc = $('mn-stair');
    if (sc)
      sc.onclick = () => {
        const r = M.cutStair(S, S.depth);
        if (!r.ok) say(r.why);
        renderSide(true);
      };
    const gd = $('mn-godeep');
    if (gd)
      gd.onclick = () => {
        showLayer(+gd.dataset.z);
        const c0 = S.deep[+gd.dataset.z];
        if (c0 != null) {
          const s2 = ts();
          view.ox = cw / 2 - ((c0 % W) + 0.5) * s2;
          view.oy = ch / 2 - (((c0 / W) | 0) - Y0() + 0.5) * s2;
          clampView();
        }
      };
    const dr = $('mn-draft');
    if (dr)
      dr.onclick = () => {
        M.draft(S, +dr.dataset.id, dr.dataset.on === '1');
        renderSide(true);
      };
    const pr = $('mn-prospect');
    if (pr)
      pr.onclick = () => {
        const r = M.prospect(S);
        if (!r.ok) say(r.why);
        renderSide(true);
      };
    const rm = $('mn-rmroom');
    if (rm)
      rm.onclick = () => {
        M.removeRoom(S, +rm.dataset.id);
        ui.sel = null;
        renderSide(true);
      };
    const cs = $('mn-selx');
    if (cs)
      cs.onclick = () => {
        ui.sel = null;
        renderSide(true);
      };
  }
  const bar = (v, col) =>
    `<span class="mn-bar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></span>`;
  const needCol = v => (v < 25 ? '#d0503a' : v < 50 ? '#d0a040' : '#7cc060');
  function selHtml() {
    const s = ui.sel;
    if (!s) return '';
    const x = '<button class="mn-btn sm mn-x" id="mn-selx" type="button">✕</button>';
    if (s.kind === 'durin') {
      const can = M.canProspect(S);
      return `${x}<b>Durin Stoneheart</b> <small>master of the Delve</small><p>${S.durin.act}.</p>
      <p class="mn-note">Tap dug floor to send him there. Prospecting reveals the stone ${M.PROSPECT_R} tiles round him, once a day.</p>
      <button class="mn-btn" id="mn-prospect" type="button"${can ? '' : ' disabled'}>🔍 Prospect${can ? '' : ' (tomorrow)'}</button>`;
    }
    if (s.kind === 'dwarf') {
      const d = S.dwarves.find(w => w.id === s.id);
      if (!d) return '';
      const T = M.TRADES[d.trade],
        g = d.grudges.length;
      const mood =
        g >= M.DOWN_TOOLS
          ? '<span class="mn-bad">has downed tools</span>'
          : g >= M.GRUMBLE
            ? '<span class="mn-warn">grumbling (works slowly)</span>'
            : 'content';
      const kit =
        d.trade === 'miner'
          ? d.pick
            ? '<p class="mn-note">⛏ ' +
              M.PICKS[d.pick.kind].name +
              ', good for ' +
              d.pick.uses +
              ' more tiles.</p>'
            : '<p class="mn-note mn-warn">⛏ No pick: digging at half pace. The forge makes bronze ones.</p>'
          : '';
      const hurt = d.hurt
        ? '<p class="mn-note mn-warn">🩹 Hurt: working at half pace until mended (an infirmary cot heals quickest).</p>'
        : '';
      const cheer = M.merry(S, d)
        ? '<p class="mn-note">🍻 Merry from the tavern: working faster, and they\'ll shrug off the next everyday grudge.</p>'
        : '';
      const where = S.depth ? ' <small>(layer ' + (M.layerOf(Math.round(d.y)) + 1) + ')</small>' : '';
      return `${x}<b>${d.name}</b> <small>${T.icon} ${M.levelOf(d).name} ${T.name.toLowerCase()}</small>${where}<p>${d.act}${d.act.endsWith('…') ? '' : '.'} Mood: ${mood}.</p>${cheer}${kit}${hurt}${warHtml(d)}
      <div class="mn-needs"><span>❤ Health</span>${bar((d.hp / M.maxHp(d)) * 100, needCol((d.hp / M.maxHp(d)) * 100))}<span>🍄 Food</span>${bar(d.needs.food, needCol(d.needs.food))}<span>🍺 Ale</span>${bar(d.needs.ale, needCol(d.needs.ale))}<span>💤 Sleep</span>${bar(d.needs.sleep, needCol(d.needs.sleep))}</div>
      ${g ? '<p class="mn-note">📕 ' + d.grudges.map(x => x.why).join('; ') + '</p>' : ''}`;
    }
    if (s.kind === 'foe') {
      const f = S.foes.find(q => q.id === s.id && q.hp > 0);
      return f ? foeHtml(f, x) : '';
    }
    if (s.kind === 'room') {
      const r = S.rooms.find(x => x.id === s.id);
      if (!r) return '';
      const R = M.ROOMS[r.type],
        st = M.roomStars(S, r),
        ts = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x2 = r.x0; x2 <= r.x1; x2++) ts.push(S.tiles[M.idx(x2, y)]);
      const fu = ts.filter(t => t.fu),
        done = fu.filter(t => t.fb).length,
        walls = M.roomWalls(S, r),
        wk = walls.filter(i => S.tiles[i].w).length;
      const tips = [];
      if (fu.length && done < fu.length)
        tips.push(
          'the mason has ' +
            (fu.length - done) +
            ' ' +
            R.furn +
            (fu.length - done > 1 ? 's' : '') +
            (R.furn === 'bench' ? ' to rough out (1 rough stone)' : ' to build (1 dressed block each)')
        );
      if (R.good && M.roomArea(S, r) < R.good)
        tips.push('it wants ' + R.good + ' tiles of floor for a second star');
      const open = M.roomOpenings(S, r);
      if (open.length)
        tips.push(
          'hang a door on every way in, or wall it up, for a second star (' +
            open.length +
            (open.length > 1 ? ' ways' : ' way') +
            ' in with no door, marked in red)'
        );
      if (walls.length && wk / walls.length < 0.8)
        tips.push('smooth its walls for a third star (' + wk + ' / ' + walls.length + ' worked)');
      return `${x}<b>${R.name}</b> <small>${'★'.repeat(st)}${'☆'.repeat(3 - st)} · ${M.roomArea(S, r)} tiles${fu.length ? ' · ' + done + '/' + fu.length + ' ' + R.furn + 's' : ''}</small>
      <p class="mn-note">${ROOM_HELP[r.type]}</p>${tips.length ? '<p class="mn-note">To make it finer: ' + tips.join('; ') + '.</p>' : ''}
      <button class="mn-btn sm" id="mn-rmroom" data-id="${r.id}" type="button">Remove room</button>`;
    }
    if (s.kind === 'tile') {
      const t = S.tiles[M.idx(s.x, s.y)];
      if (!t.s)
        return `${x}<b>Unknown stone</b><p class="mn-note">Dig beside it, or have Durin prospect, to see what's there.</p>`;
      const what =
        t.k === 'f'
          ? t.dr
            ? 'A door (✖ Clear takes it out)'
            : t.o === 'soil'
              ? 'Dug soil (farmable)'
              : 'Dug floor'
          : t.bt
            ? (t.p ? 'A built pillar' : 'A built wall') + ' (dig it out to undo; you get the stone back)'
            : t.p
              ? 'A pillar' + (t.w ? ', smoothed' : '')
              : t.rb
                ? 'Rubble'
                : (t.o === 'soil'
                    ? 'Loam (soft; leaves soil to farm)'
                    : t.o
                      ? M.ORES[t.o].name[0].toUpperCase() + M.ORES[t.o].name.slice(1) + ' ore'
                      : ['', 'Soft', 'Firm', 'Hard'][t.h] + ' rock') + (t.w ? ', smoothed' : '');
      const roof = M.LAYERS[M.layerOf(s.y)].roof;
      const extra =
        (t.wl
          ? '<p class="mn-note">💧 A well. The brewer draws water here. ✖ Clear takes it out.</p>'
          : t.dm
            ? '<p class="mn-note">💧 Damp stone: ' +
              (t.k === 'f'
                ? 'a well can be sunk here (Build ▴ → Well).'
                : 'dig it out, and a well can be sunk here.') +
              '</p>'
            : '') +
        (t.sr ? '<p class="mn-note">🪜 The stair ' + (t.sr === 'down' ? 'down' : 'up') + '.</p>' : '') +
        (t.rb
          ? '<p class="mn-note">Rubble from a cave-in: quick to dig, all rough stone. Dig it out and the roof is open again.</p>'
          : '') +
        (t.cr && t.k === 'f'
          ? `<p class="mn-note mn-bad">⚠ Unsound roof: nothing holds it within ${roof} tiles. Keep rock, or build a pillar, nearer, or it will come down.</p>`
          : '') +
        (S.deep[M.layerOf(s.y)] != null &&
        M.deepTiles(S, M.layerOf(s.y)).includes(M.idx(s.x, s.y)) &&
        M.deepKnown(S, M.layerOf(s.y))
          ? '<p class="mn-note">The deep spot: the stair down goes here.</p>'
          : '');
      return `${x}<b>${what}</b>${extra}${t.d ? '<p class="mn-note">Marked for digging.</p>' : ''}${t.m ? '<p class="mn-note">Marked for smoothing.</p>' : ''}${t.b ? '<p class="mn-note">The mason is to build a ' + t.b + ' here (a dressed block).</p>' : ''}`;
    }
    return '';
  }
  // a dwarf's fighting: drafted or not, their gear, how hard they hit, and the button to change it
  function warHtml(d) {
    const g = d.gear || {},
      gear = [g.w && M.GEAR[g.w].name, g.a && M.GEAR[g.a].name].filter(Boolean).join(' and ');
    const lv = d.fx >= 90 ? 'a veteran' : d.fx >= 30 ? 'blooded' : 'green';
    if (d.trade === 'soldier')
      return `<p class="mn-note">🛡 One of the Thane's soldiers (${lv}): ${gear || 'no gear yet'}, hits for ${Math.round(M.hitOf(d))}, health ${Math.round(M.maxHp(d))} of ${M.WARRIOR_HP}. Their whole job is to train at the barracks and stand guard over the crew, and they go after any elemental on their layer. Training and fighting toughen them.</p>`;
    return d.drafted
      ? `<p class="mn-note">⚔ A warrior (${lv}): ${gear || 'no gear yet'}, hits for ${Math.round(M.hitOf(d))}, health ${Math.round(M.maxHp(d))} of ${M.WARRIOR_HP}. Training and fighting toughen them. They go after elementals on their layer, fall back when badly hurt, and train at the barracks when idle.</p>
      <button class="mn-btn sm" id="mn-draft" data-id="${d.id}" data-on="0" type="button">Stand down</button>`
      : `<button class="mn-btn sm" id="mn-draft" data-id="${d.id}" data-on="1" type="button">⚔ Draft as a warrior</button>`;
  }
  // an elemental's panel
  function foeHtml(f, x) {
    const K = M.FOES[f.kind];
    return `${x}<b>A ${K.name}</b> <small>${f.state === 'sleep' ? 'asleep in its hollow' : 'awake'}</small>
    <div class="mn-needs"><span>Strength</span>${bar((f.hp / f.max) * 100, '#c86a50')}</div>
    <p class="mn-note">An earth elemental: it swims through raw rock and walks the floor, but can't pass smoothed or built stone, pillars or doors. It hits for ${K.atk}. ${f.wander ? 'It rose through the rock, and sinks back if it finds no way in.' : ''}</p>`;
  }
  function crewHtml() {
    return (
      '<div class="mn-list">' +
      S.dwarves
        .map(d => {
          const T = M.TRADES[d.trade],
            g = d.grudges.length;
          return `<button class="mn-item${ui.sel && ui.sel.id === d.id ? ' on' : ''}" data-dw="${d.id}" type="button">${T.icon} <b>${d.name}</b> <small>${M.levelOf(d).name} ${T.name.toLowerCase()}</small><br><small>${S.depth ? 'L' + (M.layerOf(Math.round(d.y)) + 1) + ' · ' : ''}${d.drafted ? '⚔ ' : ''}${d.act}${M.merry(S, d) ? ' · 🍻' : ''}${d.hp < M.maxHp(d) * 0.6 ? ' · ❤' + Math.round(d.hp) : ''}${g ? ' · 📕' + g : ''}</small></button>`;
        })
        .join('') +
      '</div>' +
      `<p class="mn-note">Miners dig. The mason builds furniture and smooths walls. The farmer grows food and barley; the brewer makes ale. The tavern keeper serves behind the bar. Everyone hauls, and digs when there's nothing else.</p>`
    );
  }
  function ledgerHtml() {
    const rows = [];
    S.dwarves.forEach(d =>
      d.grudges.forEach(g =>
        rows.push(
          `<li><b>${d.name.split(' ')[0]}</b>: ${g.why} <small>(day ${Math.floor(g.t / M.DAY) + 1})</small></li>`
        )
      )
    );
    return (
      `<p class="mn-note">Durin's Ledger of Grudges. ${M.GRUMBLE} open grudges and a dwarf grumbles (works slowly); ${M.DOWN_TOOLS} and they down tools. A grudge fades after 3 days, or is struck out by a good meal in a fine hall or a night in a fine bedroom.</p>` +
      (rows.length
        ? '<ul class="mn-ledger">' + rows.join('') + '</ul>'
        : '<p>The Ledger is clean. Long may it last.</p>') +
      (S.dead.length
        ? '<p><b>🕯 The fallen</b></p><ul class="mn-ledger">' +
          S.dead
            .map(
              f =>
                `<li><b>${f.name}</b>, ${M.TRADES[f.trade].name.toLowerCase()}: ${f.how} <small>(day ${f.day})</small></li>`
            )
            .join('') +
          '</ul>' +
          (S.tiles.some(t => t.fu === 'plaque' && t.fb)
            ? ''
            : '<p class="mn-note">A Wall of Remembrance would ease the mourning.</p>')
        : '')
    );
  }
  // the Thane's quota for the deepest layer, the deep spot and the stair down; then the layers so far
  function quotaHtml() {
    const z = S.depth,
      L = M.LAYERS[z],
      last = z >= M.LAYERS.length - 1;
    const bars = M.quotaOf(S, z)
      .map(q => {
        const ic = (STOCK_ICON.find(r => r[0] === q.kind) || [0, ''])[1];
        return `<span>${ic} ${q.kind}</span><span>${bar((q.got / q.need) * 100, q.got >= q.need ? '#7cc060' : '#e2b84c')} <small>${q.got} / ${q.need}</small></span>`;
      })
      .join('');
    const st = M.stairOf(S, z),
      why = M.stairWhy(S, z);
    let stair = '';
    if (last)
      stair = `<p class="mn-note">${M.quotaMet(S, z) ? "The Mountain's Heart lies below. That descent comes later." : "This is the deepest layer. Below it lies the Mountain's Heart."}</p>`;
    else if (st && !st.done) {
      const dug = M.deepTiles(S, z).filter(i => S.tiles[i].k === 'f').length;
      stair = `<p>🪜 The stair is being cut: ${dug} / 9.</p>`;
    } else if (!st)
      stair =
        `<button class="mn-btn" id="mn-stair" type="button"${why ? ' disabled' : ''}>🪜 Cut the stair down</button>` +
        (why
          ? `<p class="mn-note">${why}</p>`
          : '<p class="mn-note">The miners will dig a 3 × 3 stair at the deep spot.</p>');
    const deep = last
      ? ''
      : M.deepKnown(S, z)
        ? `<p class="mn-note">The deep spot is found. <button class="mn-btn sm" id="mn-godeep" data-z="${z}" type="button">Show me</button></p>`
        : `<p class="mn-note">Somewhere on this layer the stone thins: that's the deep spot, where the stair must go. Durin's prospecting finds it if he's near, or a miner digging beside it.</p>`;
    const layers = M.LAYERS.slice(0, z + 1)
      .map(
        (l, k) =>
          `<li><b>${k + 1}. ${l.name}</b> <small>${l.stone}; the roof holds ${l.roof} tiles from rock or a pillar (an open span of ${l.roof * 2})</small></li>`
      )
      .join('');
    let thane = '';
    if (!S.soldiersCame) {
      const R = M.soldiersReady(S),
        tick = (ok, s) => `<li>${ok ? '✓' : '○'} ${s}</li>`;
      thane = `<p><b>🛡 The Thane's soldiers</b></p>
      <p class="mn-note">Two soldiers come up from Stonedeep once the hold can feed them (by day ${Math.round(M.SOLDIERS.late / M.DAY) + 1} at the latest). The elementals start rising a day after they come.</p>
      <ul class="mn-ledger">${tick(R.farm, 'A farm sown')}${tick(R.well, 'A well sunk on damp stone')}${tick(R.brewery, 'A brewery with its still')}</ul>`;
    }
    return `${thane}<p><b>Layer ${z + 1}: ${L.name}</b></p>
    <p class="mn-note">The Thane's quota: ore carried to the stockpile. Meet it to cut the stair down.</p>
    <div class="mn-needs">${bars}</div>${deep}${stair}
    <p><b>The layers so far</b></p><ul class="mn-ledger">${layers}</ul>
    <p class="mn-note">Cave-ins: a roof left open wider than its stone can span cracks (red hairlines), and after a while comes down, burying what's under it. Pillars, walls or rock left standing hold it.</p>`;
  }
  function eyeHtml() {
    const e = eye || M.masonEye(S);
    const P = {
      lines: 'True lines',
      order: 'Order',
      sym: 'Symmetry',
      rhythm: 'Pillars in rhythm',
      worked: 'Worked stone'
    };
    const parts = Object.keys(P)
      .map(k =>
        e.parts[k] == null
          ? `<span>${P[k]}</span><span class="mn-note">nothing to judge</span>`
          : `<span>${P[k]}</span>${bar(e.parts[k] * 100, '#e2b84c')}`
      )
      .join('');
    const pats = Object.entries(M.PATTERNS)
      .map(([k, p]) =>
        S.found[k]
          ? `<li class="got">✨ <b>${p.name}</b> <small>day ${S.found[k]}: ${p.desc}</small></li>`
          : `<li>${p.name}</li>`
      )
      .join('');
    return `<div class="mn-score">${e.score == null ? '—' : e.score}<small>${e.ready ? ' / 100' : ' (dig more first)'}</small></div>
    <div class="mn-needs">${parts}</div>${e.penalty ? `<p class="mn-note">−${e.penalty} for ${e.waste} dead end${e.waste > 1 ? 's' : ''} that found nothing.</p>` : ''}
    <p class="mn-note">Durin judges the workings: straight passages that turn square, no shapeless holes (mark them as rooms), rooms mirrored, pillars in a lattice, walls smoothed. 👁 on the map shows what he dislikes.</p>
    <p><b>Named patterns</b> <small>(Durin spots them himself)</small></p><ul class="mn-pats">${pats}</ul>
    <button class="mn-btn" id="mn-book" type="button">📖 The Delve-book: what each pattern is</button>`;
  }
  function logHtml() {
    return (
      '<ul class="mn-log">' +
      S.log
        .slice()
        .reverse()
        .map(l => `<li><small>d${Math.floor(l.t / M.DAY) + 1}</small> ${l.msg}</li>`)
        .join('') +
      '</ul>'
    );
  }
  // ── modal and help ──
  function modal(html, after) {
    $('mn-card').innerHTML = html;
    $('mn-modal').hidden = false;
    if (after) after();
  }
  function closeModal() {
    $('mn-modal').hidden = true;
  }
  function help() {
    modal(
      `<h3>⛏ The Stoneheart Delve</h3>
    <p>Durin has the Thane's leave to cut a new mine under Stonedeep. You're his planner: mark the digging, lay out the rooms, and keep the crew fed, watered and rested.</p>
    <ul>
      <li><b>⛏ Dig</b>: drag over rock. Miners dig the nearest marked stone they can reach. Ore and rough stone are hauled to a stockpile.</li>
      <li><b>🧱 Build</b> opens a menu: <b>Wall</b> or <b>Door</b> on dug floor, or a <b>Pillar</b> (on rock, rock you keep; on dug floor, the mason builds one). A dressed block each; built walls count as worked stone, and pillars will soon hold the roof up.</li>
      <li><b>Put a mistake right</b>: dug too much? Wall it back up. A built wall or pillar can be dug out again (you get the stone back); ✖ Clear takes out a door and any mark.</li>
      <li><b>🏠 Room</b> opens a menu of rooms; pick one, then drag over dug floor. Bedrooms, a dining hall, a mushroom farm on soil, a brewery, a stockpile, the <b>mason's workshop</b>, a kitchen, a forge, a tavern hall (or a plainer taproom), an infirmary, a barracks and, once you've room for it, the Great Hall.</li>
      <li><b>Stars</b>: a room earns its second star once it's furnished, big enough and has a door on every way in (wall up any others); its third once its walls are smoothed. Tap a room to see what it lacks: ways in with no door show in red. Stockpiles, farms, the workshops (mason's workshop, brewery, kitchen and forge) and the taproom need no door; a tavern does.</li>
      <li><b>The mason's workshop comes first</b>: its bench is roughed out of rough stone, and there the mason cuts rough stone into <b>dressed blocks</b> (🧱 in the stock). Every bed, table, still, wall, pillar and door takes a block, and he cuts only as many as your building needs.</li>
      <li><b>The trades</b>: the farmer and brewer cook meals at a kitchen's hearth; the smith smelts copper, tin and coal into bronze at a forge's anvil and forges picks, for the old iron ones wear out. Hard rock sometimes hurts a dwarf: an infirmary mends them.</li>
      <li><b>Water</b>: the brewer needs a bucket of water for every brew. Until there's a well he fetches meltwater from outside the gate, which is slow. Damp stone shows as a blue shimmer in the dark: dig it out, then 🧱 Build ▴ → Well. A well never runs dry.</li>
      <li><b>Earth elementals</b>: they swim through raw rock and walk the floor, but can't pass smoothed or built stone, pillars or doors, so a worked, doored living quarter is safe. Some sleep in hidden hollows: digging close sends a tremor (purple rings), and breaking in wakes them. Others rise through the rock now and then (orange rings), more the deeper you go. Once you've sown a farm, sunk a well and set up a brewery (the Quota tab keeps the list), the Thane sends two soldiers from Stonedeep, and the elementals only start rising a day later: they train at the barracks and stand guard over the crew. Only soldiers and warriors fight; everyone else runs, behind worked stone or a door if one's near, or towards the soldiers. To have more, tap a dwarf and ⚔ Draft them as a warrior (they keep their trade, go after elementals, fall back when badly hurt and train when idle). The smith forges war-hammers (bronze, then iron) and iron mail for them.</li>
      <li><b>Mind the roof</b>: each stone spans only so far. Floor more than 3 tiles from rock, a wall or a pillar (on the Topstone) is unsound: red hairline cracks show, and after a while it comes down. Rubble is quick to dig out, but anyone under it may die, and the crew mourn. A Wall of Remembrance eases that.</li>
      <li><b>Going deeper</b>: the Thane sets each layer a quota of ore (the Quota tab). Meet it, find the layer's deep spot (Durin's prospecting, or digging nearby), and cut the stair down. Five layers, each harder stone. ▲ ▼ by the map, or [ and ], change the layer you see.</li>
      <li><b>✨ Smooth</b>: the mason smooths walls and pillars. Finer rooms, and worked stone will keep elementals out.</li>
      <li><b>Durin</b>: tap him, then tap floor to send him there; he prospects the stone round him once a day.</li>
      <li><b>The Ledger</b>: hungry, dry or floor-sleeping dwarves hold grudges. Too many and they slow down, then stop.</li>
      <li><b>The Mason's Eye</b>: Durin scores the look of the Delve, and names fine patterns when he sees them. The Delve-book (on the Mason's Eye tab) shows what each one is.</li>
    </ul>
    <p class="mn-note">Space pauses. Keys: D dig, B build menu (W wall, P pillar, O door), S smooth, R room menu, C clear, L look. Leading a fight yourself, Durin's binding of elementals, and the Mountain's Heart below the fifth layer come next.</p>
    <div class="mn-row"><button class="mn-btn" id="mn-ok" type="button">To work</button></div>`,
      () => {
        $('mn-ok').onclick = closeModal;
      }
    );
  }

  // ── the Delve-book: what each named pattern is, with a little plan of one ──
  // # rock, . passage, o pillar, R room floor, $ ore dug out along the way, ~ the stair (step 2)
  const BOOK = {
    gallery: {
      how: 'One straight passage, twenty tiles long, not part of a room. Durin likes a tunnel that goes where it means to.',
      plan: ['##############', '..............', '##############']
    },
    cross: {
      how: 'A hub with four arms, north, south, east and west, all one tile wide and all the same length (four or more), with rock either side of each arm.',
      plan: [
        '####.####',
        '####.####',
        '####.####',
        '####.####',
        '.........',
        '####.####',
        '####.####',
        '####.####',
        '####.####'
      ]
    },
    colonnade: {
      how: 'A room with four or more pillars standing in a full grid at even spacing, mirrored so the hall looks the same from either end.',
      plan: ['#########', '#RRRRRRR#', '#RoRoRoR#', '#RRRRRRR#', '#RoRoRoR#', '#RRRRRRR#', '#########']
    },
    ninefold: {
      how: 'Nine rooms of the same size (2 × 2 or bigger), three by three, evenly spaced, with at least one tile between neighbours. They can be any kind of room. The gaps are yours: rock, doorways or passages, so long as the marked rooms themselves line up. Here, a passage runs along each row.',
      plan: ['RR#RR#RR', 'RR#RR#RR', '........', 'RR#RR#RR', 'RR#RR#RR', '........', 'RR#RR#RR', 'RR#RR#RR']
    },
    cloister: {
      how: 'A court: a room whose pillars stand in a full, even grid, with another room on each of its four sides, no more than three tiles away.',
      plan: [
        '####RRRRR####',
        '####RRRRR####',
        '#############',
        'RR#RRRRRRR#RR',
        'RR#RoRRRoR#RR',
        'RR#RRRRRRR#RR',
        'RR#RoRRRoR#RR',
        'RR#RRRRRRR#RR',
        '#############',
        '####RRRRR####',
        '####RRRRR####'
      ]
    },
    vein: {
      how: 'Follow a vein of ore with a straight passage: eight tiles in a line, six or more of them cut out of ore.',
      plan: ['##########', '$$$$$$$$..', '##########']
    },
    wellhead: {
      how: 'A room three tiles or more each way, an odd number both ways, with a well sunk on its very middle tile. Any room will do, so long as the well is dead centre. Look for damp stone where you want the court.',
      plan: ['#######', '#RRRRR#', '#RRRRR#', '#RRwRR#', '#RRRRR#', '#RRRRR#', '#######']
    },
    spiral: {
      how: 'Cut the stair down to the next layer as a spiral. Durin can\u2019t judge a spiral stair yet.',
      plan: ['#####', '#~~~#', '#~#~#', '#~~##', '#####']
    }
  };
  const PLAN_COL = {
    '#': '#4b4450',
    '.': '#8a7d6e',
    o: '#cfc2ad',
    R: '#b98c5e',
    $: '#d0783a',
    '~': '#7a8fb0',
    w: '#3a6aa8'
  };
  function planHtml(rows) {
    const w = Math.max(...rows.map(r => r.length));
    return (
      `<div class="mn-plan" style="grid-template-columns:repeat(${w},12px)">` +
      rows
        .map(r =>
          r
            .padEnd(w, '#')
            .split('')
            .map(
              ch =>
                `<i class="${ch === 'o' ? 'pil' : ''}" style="background:${ch === 'o' ? PLAN_COL.R : PLAN_COL[ch]}"></i>`
            )
            .join('')
        )
        .join('') +
      '</div>'
    );
  }
  function delveBook() {
    const entries = Object.entries(M.PATTERNS)
      .map(([k, p]) => {
        const b = BOOK[k];
        return `<div class="mn-bookent${S.found[k] ? ' got' : ''}"><div><b>${S.found[k] ? '✨ ' : ''}${p.name}</b>${S.found[k] ? ` <small>found on day ${S.found[k]}</small>` : ''}
          <p>${b.how}</p></div>${planHtml(b.plan)}</div>`;
      })
      .join('');
    modal(
      `<h3>📖 The Delve-book</h3><p class="mn-note">Durin's book of the patterns a dwarf is proud to cut. Dig one and he'll name it and write it in.</p>
      <p class="mn-note mn-key"><i style="background:${PLAN_COL['#']}"></i> rock <i style="background:${PLAN_COL['.']}"></i> passage <i style="background:${PLAN_COL.R}"></i> room <i class="pil" style="background:${PLAN_COL.R}"></i> pillar <i style="background:${PLAN_COL.$}"></i> dug ore</p>
      ${entries}<div class="mn-row"><button class="mn-btn" id="mn-ok" type="button">Close</button></div>`,
      () => {
        $('mn-ok').onclick = closeModal;
      }
    );
  }

  // ── the map ──
  function fitCanvas(reset) {
    const m = $('mn-map');
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = m.clientWidth,
      h = m.clientHeight;
    if (!w || !h) return;
    cw = w;
    ch = h;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    base = Math.min(w / W, (h - 8) / LH);
    if (reset) {
      view.zoom = Math.max(1, Math.min(4, MIN_TILE / base));
      const s = ts(),
        gy = Math.floor(LH / 2);
      view.ox = (w - W * s) / 2;
      view.oy = (h - LH * s) / 2;
      if (view.zoom > 1) {
        view.ox = 20;
        view.oy = h / 2 - gy * s;
      }
    }
    clampView();
  }
  const ts = () => base * view.zoom;
  function clampView() {
    const s = ts(),
      mw = W * s,
      mh = LH * s;
    view.ox = mw < cw ? (cw - mw) / 2 : Math.min(40, Math.max(cw - mw - 40, view.ox));
    view.oy = mh < ch ? (ch - mh) / 2 : Math.min(40, Math.max(ch - mh - 40, view.oy));
  }
  function zoomBy(f, px, py) {
    if (px == null) {
      px = cw / 2;
      py = ch / 2;
    }
    const z = Math.max(1, Math.min(4, view.zoom * f)),
      k = z / view.zoom;
    view.ox = px - (px - view.ox) * k;
    view.oy = py - (py - view.oy) * k;
    view.zoom = z;
    clampView();
  }
  // screen to tile, on the layer on screen (a drag can't run off it into another layer)
  const toTile = (px, py) => ({
    x: Math.floor((px - view.ox) / ts()),
    y: Y0() + Math.max(0, Math.min(LH - 1, Math.floor((py - view.oy) / ts())))
  });

  const pts = new Map();
  let pinch = null;
  function pDown(e) {
    cv.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pts.size === 2) {
      ui.drag = null;
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    const t = toTile(e.offsetX, e.offsetY),
      mark = ui.tool !== 'look' && ui.tool !== 'room';
    ui.drag = {
      sx: e.offsetX,
      sy: e.offsetY,
      x0: t.x,
      y0: t.y,
      x1: t.x,
      y1: t.y,
      mark,
      moved: false,
      ox: view.ox,
      oy: view.oy
    };
  }
  function pMove(e) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y),
        mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      view.ox += mx - pinch.mx;
      view.oy += my - pinch.my;
      zoomBy(d / pinch.d, mx, my);
      pinch = { d, mx, my };
      return;
    }
    const g = ui.drag;
    if (!g) return;
    if (Math.hypot(e.offsetX - g.sx, e.offsetY - g.sy) > 6) g.moved = true;
    if (g.mark) {
      const t = toTile(e.offsetX, e.offsetY);
      g.x1 = t.x;
      g.y1 = t.y;
    } else if (g.moved) {
      view.ox = g.ox + e.offsetX - g.sx;
      view.oy = g.oy + e.offsetY - g.sy;
      clampView();
    }
  }
  function pUp(e) {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    const g = ui.drag;
    ui.drag = null;
    if (!g || pts.size) return;
    if (g.mark) {
      const tool = /^(wall|door|well)$/.test(ui.tool) ? 'build:' + ui.tool : ui.tool;
      const r = M.designate(S, tool, g.x0, g.y0, g.x1, g.y1);
      if (r && r.ok === false) say(r.why);
      else if (r && r.n === 0 && /^(wall|door|well)$/.test(ui.tool))
        say(
          ui.tool === 'wall'
            ? 'Walls go on dug floor, outside rooms and clear of furniture and the gate.'
            : ui.tool === 'well'
              ? 'A well goes on dug damp floor: dig out stone with a blue shimmer first.'
              : 'Doors go on dug floor, clear of furniture and the gate.'
        );
      else if (r && r.n && /^(wall|door|pillar|well)$/.test(ui.tool) && !(S.stock.block > 0))
        say(blockNews());
      else if (r && r.room) {
        const R = M.ROOMS[r.room.type];
        say(
          R.name +
            ' marked out.' +
            (R.furn && R.furn !== 'bench' && !(S.stock.block > 0) ? ' ' + blockNews() : '')
        );
        ui.sel = { kind: 'room', id: r.room.id };
        ui.tool = 'look';
        renderTools();
      }
      renderSide(true);
      eyeAt = 0;
      return;
    }
    if (!g.moved) tap(g.x0, g.y0, e.offsetX, e.offsetY);
  }
  function tap(x, y, px, py) {
    if (!M.inB(x, y)) return;
    const fx = (px - view.ox) / ts() - 0.5,
      fy = (py - view.oy) / ts() - 0.5 + Y0();
    // Durin selected: a tap on floor sends him
    if (
      ui.sel &&
      ui.sel.kind === 'durin' &&
      M.isFloor(S, x, y) &&
      Math.hypot(fx - S.durin.x, fy - S.durin.y) > 0.8
    ) {
      if (!M.durinMove(S, x, y)) say('Durin can’t get there.');
      return;
    }
    if (onView(S.durin.y) && Math.hypot(fx - S.durin.x, fy - S.durin.y) < 0.75) {
      ui.sel = { kind: 'durin' };
      renderSide(true);
      return;
    }
    let best = null,
      bd = 0.7;
    for (const d of S.dwarves) {
      if (!onView(d.y)) continue;
      const dd = Math.hypot(fx - d.x, fy - d.y);
      if (dd < bd) {
        bd = dd;
        best = d;
      }
    }
    if (best) {
      ui.sel = { kind: 'dwarf', id: best.id };
      renderSide(true);
      return;
    }
    const foe = S.foes.find(
      f => f.hp > 0 && f.state === 'awake' && onView(f.y) && Math.hypot(fx - f.x, fy - f.y) < 0.8
    );
    if (foe) {
      ui.sel = { kind: 'foe', id: foe.id };
      renderSide(true);
      return;
    }
    const r = M.roomAt(S, x, y);
    if (r) {
      ui.sel = { kind: 'room', id: r.id };
      renderSide(true);
      return;
    }
    ui.sel = { kind: 'tile', x, y };
    renderSide(true);
  }

  // ── drawing ──
  const hash = (x, y, k) => {
    let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // each layer's stone, soft / firm / hard, and smoothed: granite, basalt, quartz-shot, hot stone, living rock
  const ROCKS = [
    [
      ['', '#6e6056', '#5a5359', '#46414b'],
      ['', '#8d7d70', '#787078', '#625b68']
    ],
    [
      ['', '#4e535e', '#41454f', '#33363f'],
      ['', '#6c727e', '#5e6470', '#4f5460']
    ],
    [
      ['', '#8a8496', '#787286', '#666076'],
      ['', '#aaa4b6', '#9a94a8', '#888298']
    ],
    [
      ['', '#7a4e3e', '#6a4032', '#5a3428'],
      ['', '#9a6c5a', '#8a5e4c', '#7a5040']
    ],
    [
      ['', '#3e5652', '#344a48', '#2a3e40'],
      ['', '#5c7672', '#506a66', '#445e5c']
    ]
  ];
  let ROCK = ROCKS[0][0],
    ROCK_W = ROCKS[0][1];
  let durinImg = null;
  function draw() {
    const c = cx,
      s = ts();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#08070a';
    c.fillRect(0, 0, cw, ch);
    c.save();
    const y0 = Y0();
    c.translate(view.ox, view.oy - y0 * s);
    [ROCK, ROCK_W] = ROCKS[ui.lz] || ROCKS[0];
    const T = S.tiles,
      gate = new Set(S.gate);
    for (let y = y0; y < y0 + LH; y++)
      for (let x = 0; x < W; x++) {
        const t = T[M.idx(x, y)],
          X = x * s,
          Y = y * s;
        if (!t.s) {
          c.fillStyle = '#0d0c10';
          c.fillRect(X, Y, s + 0.5, s + 0.5);
          // stone-sense: a faint shimmer of ore one tile into the dark
          if (t.dm && nearSeen(x, y)) {
            c.fillStyle = 'rgba(110,170,255,.22)';
            c.beginPath();
            c.arc(X + s * 0.35, Y + s * 0.6, s * 0.12, 0, 7);
            c.arc(X + s * 0.65, Y + s * 0.4, s * 0.1, 0, 7);
            c.fill();
          }
          if (t.o && t.o !== 'soil' && nearSeen(x, y)) {
            c.fillStyle = M.ORES[t.o].col;
            c.globalAlpha = 0.18;
            c.beginPath();
            c.arc(X + s / 2, Y + s / 2, s * 0.18, 0, 7);
            c.fill();
            c.globalAlpha = 1;
          }
          if (t.d || t.p || t.m) drawMarks(c, t, X, Y, s);
          continue;
        }
        if (t.k === 'f' || t.p) {
          // floor (pillars stand on it)
          c.fillStyle = t.o === 'soil' ? '#6b4e30' : gate.has(t.r ? -1 : M.idx(x, y)) ? '#94886c' : '#8a7d6e';
          c.fillRect(X, Y, s + 0.5, s + 0.5);
          c.strokeStyle = 'rgba(0,0,0,.12)';
          c.lineWidth = 1;
          c.strokeRect(X + 0.5, Y + 0.5, s - 1, s - 1);
          if (t.o === 'soil') {
            c.fillStyle = '#4c3520';
            for (let k = 0; k < 4; k++)
              c.fillRect(X + hash(x, y, k) * s * 0.85, Y + hash(x, y, k + 9) * s * 0.85, s * 0.08, s * 0.08);
          }
        }
        if (t.k === 'r' && !t.p) {
          c.fillStyle = (t.w ? ROCK_W : ROCK)[t.h];
          c.fillRect(X, Y, s + 0.5, s + 0.5);
          if (t.o === 'soil') {
            c.fillStyle = '#5a4028';
            c.fillRect(X, Y, s + 0.5, s + 0.5);
          }
          if (t.rb) {
            // cave-in rubble: a heap of broken stone
            c.fillStyle = '#3a3430';
            c.fillRect(X, Y, s + 0.5, s + 0.5);
            for (let k = 0; k < 6; k++) {
              c.fillStyle = k % 2 ? ROCK[1] : ROCK[2];
              const rx = X + (0.1 + hash(x, y, k) * 0.7) * s,
                ry = Y + (0.1 + hash(x, y, k + 7) * 0.7) * s,
                rs = s * (0.18 + hash(y, x, k) * 0.14);
              c.beginPath();
              c.moveTo(rx, ry + rs * 0.5);
              c.lineTo(rx + rs * 0.4, ry);
              c.lineTo(rx + rs, ry + rs * 0.3);
              c.lineTo(rx + rs * 0.8, ry + rs);
              c.lineTo(rx + rs * 0.1, ry + rs);
              c.closePath();
              c.fill();
            }
          } else if (!t.w)
            for (let k = 0; k < 3; k++) {
              c.fillStyle = 'rgba(0,0,0,.18)';
              c.fillRect(X + hash(x, y, k) * s * 0.85, Y + hash(x, y, k + 5) * s * 0.85, s * 0.1, s * 0.1);
            }
          else if (t.bt) {
            // a built wall: dressed blocks in courses, so it reads as masonry, not smoothed rock
            c.fillStyle = '#8a7f74';
            c.fillRect(X, Y, s + 0.5, s + 0.5);
            c.strokeStyle = 'rgba(40,34,30,.55)';
            c.lineWidth = Math.max(1, s * 0.04);
            c.beginPath();
            for (let r = 1; r < 3; r++) {
              c.moveTo(X, Y + (s * r) / 3);
              c.lineTo(X + s, Y + (s * r) / 3);
            }
            for (let r = 0; r < 3; r++) {
              const off = r % 2 ? s / 2 : 0;
              for (let k = off; k < s; k += s / 2) {
                if (k === 0) continue;
                c.moveTo(X + k, Y + (s * r) / 3);
                c.lineTo(X + k, Y + (s * (r + 1)) / 3);
              }
            }
            c.stroke();
          } else {
            c.strokeStyle = 'rgba(255,240,210,.28)';
            c.lineWidth = Math.max(1, s * 0.05);
            c.strokeRect(X + s * 0.12, Y + s * 0.12, s * 0.76, s * 0.76);
          }
          if (t.o && t.o !== 'soil') {
            c.fillStyle = M.ORES[t.o].col;
            for (let k = 0; k < 4; k++) {
              c.beginPath();
              c.arc(
                X + (0.2 + hash(x, y, k) * 0.6) * s,
                Y + (0.2 + hash(x, y, k + 3) * 0.6) * s,
                s * 0.09,
                0,
                7
              );
              c.fill();
            }
            if (t.o === 'c') {
              c.strokeStyle = 'rgba(255,255,255,.15)';
              c.lineWidth = 1;
              c.strokeRect(X + 1, Y + 1, s - 2, s - 2);
            }
          }
          // a dug edge casts a shadow onto the floor beside it
        }
        if (t.p) {
          // a pillar
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.beginPath();
          c.ellipse(X + s * 0.55, Y + s * 0.6, s * 0.38, s * 0.3, 0, 0, 7);
          c.fill();
          const g = c.createRadialGradient(
            X + s * 0.4,
            Y + s * 0.38,
            s * 0.05,
            X + s / 2,
            Y + s / 2,
            s * 0.42
          );
          g.addColorStop(0, t.w ? '#d8ccb8' : '#a2968a');
          g.addColorStop(1, t.w ? '#857a6c' : ROCK[t.h]);
          c.fillStyle = g;
          c.beginPath();
          c.arc(X + s / 2, Y + s / 2, s * 0.38, 0, 7);
          c.fill();
          if (t.w) {
            c.strokeStyle = '#e8d49a';
            c.lineWidth = Math.max(1, s * 0.05);
            c.beginPath();
            c.arc(X + s / 2, Y + s / 2, s * 0.3, 0, 7);
            c.stroke();
          }
        }
        if (t.sr && t.k === 'f') drawStair(c, t, X, Y, s, x, y);
        if (t.cr && t.k === 'f') drawCrack(c, t, X, Y, s, x, y);
        drawMarks(c, t, X, Y, s);
        if (t.fu) drawFurn(c, t, X, Y, s);
        if (t.dm && !t.wl) drawDamp(c, t, X, Y, s, x, y);
        if (t.wl) drawWell(c, X, Y, s);
        if (t.dr) drawDoor(c, X, Y, s, x, y, 1);
        if (t.g) drawCrop(c, t, X, Y, s, x, y);
      }
    // daylight at the gate
    if (ui.lz === 0) {
      const gy = Math.floor(LH / 2);
      const dl = c.createLinearGradient(0, 0, s * 3, 0);
      dl.addColorStop(0, 'rgba(255,240,190,.35)');
      dl.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = dl;
      c.fillRect(0, (gy - 1) * s, s * 3, s * 2);
    }
    // the deep spot, once found and until the stair is marked there
    if (ui.lz < M.LAYERS.length - 1 && M.deepKnown(S, ui.lz) && !M.stairOf(S, ui.lz)) {
      const c0 = S.deep[ui.lz],
        X = ((c0 % W) - 1) * s,
        Y = (((c0 / W) | 0) - 1) * s,
        pulse = 0.55 + 0.35 * Math.sin(performance.now() / 400);
      c.save();
      c.setLineDash([s * 0.25, s * 0.15]);
      c.strokeStyle = `rgba(255,220,120,${pulse})`;
      c.lineWidth = Math.max(1.5, s * 0.08);
      c.strokeRect(X + 2, Y + 2, s * 3 - 4, s * 3 - 4);
      c.setLineDash([]);
      c.fillStyle = `rgba(255,220,120,${pulse})`;
      c.beginPath();
      c.moveTo(X + s * 1.5, Y + s * 2.05);
      c.lineTo(X + s * 1.15, Y + s * 1.55);
      c.lineTo(X + s * 1.85, Y + s * 1.55);
      c.closePath();
      c.fill();
      if (s >= 14) {
        c.font = `bold ${Math.max(9, Math.floor(s * 0.36))}px Georgia,serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('deep spot', X + s * 1.5, Y + s * 0.9);
      }
      c.restore();
    }
    // rooms: a tint and a border, the name on top
    for (const r of S.rooms) {
      if (M.layerOf(r.y0) !== ui.lz) continue;
      const R = M.ROOMS[r.type],
        X = r.x0 * s,
        Y = r.y0 * s,
        w = (r.x1 - r.x0 + 1) * s,
        h = (r.y1 - r.y0 + 1) * s;
      c.fillStyle = R.col;
      c.globalAlpha = 0.13;
      c.fillRect(X, Y, w, h);
      c.globalAlpha = 0.85;
      c.strokeStyle = R.col;
      c.lineWidth = Math.max(1, s * 0.07);
      c.strokeRect(X + 1, Y + 1, w - 2, h - 2);
      c.globalAlpha = 1;
      if (s >= 14) {
        c.font = `bold ${Math.max(9, Math.floor(s * 0.42))}px Georgia,serif`;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        // the name and stars where they fit, else the stars alone, else nothing (tap the room to read it).
        // Written on the wall just above the room, so it never covers the furniture in its top corner
        // (inside the room only when it's against the top of the map).
        const st = '★'.repeat(M.roomStars(S, r));
        let lab = R.name + ' ' + st;
        if (c.measureText(lab).width > w - 6) lab = c.measureText(st).width <= w - 6 ? st : '';
        if (lab) {
          const fh = Math.max(9, Math.floor(s * 0.42)),
            ly = r.y0 > 0 ? Y - fh * 0.62 : Y + fh * 0.7,
            lw = c.measureText(lab).width;
          c.fillStyle = 'rgba(12,10,14,.62)';
          c.fillRect(X + 1, ly - fh * 0.62, lw + 6, fh * 1.24);
          c.fillStyle = '#ffe9b0';
          c.fillText(lab, X + 4, ly);
        }
      }
      if (ui.sel && ui.sel.kind === 'room' && ui.sel.id === r.id) {
        c.strokeStyle = '#fff3b0';
        c.lineWidth = 2;
        c.strokeRect(X - 1, Y - 1, w + 2, h + 2);
        // the ways in that still want a door
        c.save();
        c.setLineDash([s * 0.15, s * 0.1]);
        c.strokeStyle = '#ff6050';
        c.fillStyle = 'rgba(255,80,60,.18)';
        for (const i of M.roomOpenings(S, r)) {
          const ox = (i % W) * s,
            oy = ((i / W) | 0) * s;
          c.fillRect(ox + 2, oy + 2, s - 4, s - 4);
          c.strokeRect(ox + 2, oy + 2, s - 4, s - 4);
        }
        c.restore();
      }
    }
    // items lying about
    for (const it of S.items) {
      const x = it.i % W,
        y = (it.i / W) | 0;
      if (!onView(y)) continue;
      drawItem(
        c,
        it.kind,
        x * s + s * 0.5 + (hash(x, y, it.id) - 0.5) * s * 0.4,
        y * s + s * 0.5 + (hash(y, x, it.id) - 0.5) * s * 0.4,
        s * 0.16
      );
    }
    // the Mason's Eye overlay
    if (ui.overlay && eye) {
      for (const i of eye.marks.blob) {
        c.fillStyle = 'rgba(220,60,40,.28)';
        c.fillRect((i % W) * s, ((i / W) | 0) * s, s, s);
      }
      for (const i of eye.marks.jag) {
        c.strokeStyle = 'rgba(255,150,40,.9)';
        c.lineWidth = 2;
        c.strokeRect((i % W) * s + 3, ((i / W) | 0) * s + 3, s - 6, s - 6);
      }
      for (const i of eye.marks.dead) {
        const X = (i % W) * s,
          Y = ((i / W) | 0) * s;
        c.strokeStyle = '#ff5040';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(X + s * 0.25, Y + s * 0.25);
        c.lineTo(X + s * 0.75, Y + s * 0.75);
        c.moveTo(X + s * 0.75, Y + s * 0.25);
        c.lineTo(X + s * 0.25, Y + s * 0.75);
        c.stroke();
      }
    }
    // the crew and Durin
    for (const d of S.dwarves) if (onView(d.y)) drawDwarf(c, d, s);
    for (const f of S.foes)
      if (
        f.hp > 0 &&
        onView(f.y) &&
        (f.state === 'awake' || S.tiles[M.idx(Math.round(f.x), Math.round(f.y))].s)
      )
        drawFoe(c, f, s);
    for (const m of S.tremors) if (onView(m.y)) drawTremor(c, m, s);
    if (onView(S.durin.y)) drawDurin(c, s);
    // the rectangle being dragged
    const g = ui.drag;
    if (g && g.mark) {
      const x0 = Math.min(g.x0, g.x1),
        x1 = Math.max(g.x0, g.x1),
        y0 = Math.min(g.y0, g.y1),
        y1 = Math.max(g.y0, g.y1);
      const col =
        ui.tool === 'dig'
          ? '#f0c850'
          : isBuild(ui.tool)
            ? '#e8d096'
            : ui.tool === 'smooth'
              ? '#8cc8ff'
              : ui.tool === 'cancel'
                ? '#ff7060'
                : (M.ROOMS[ui.tool.slice(5)] || {}).col || '#fff';
      c.fillStyle = col;
      c.globalAlpha = 0.18;
      c.fillRect(x0 * s, y0 * s, (x1 - x0 + 1) * s, (y1 - y0 + 1) * s);
      c.globalAlpha = 1;
      c.strokeStyle = col;
      c.lineWidth = 2;
      c.strokeRect(x0 * s, y0 * s, (x1 - x0 + 1) * s, (y1 - y0 + 1) * s);
      c.font = 'bold 13px sans-serif';
      c.fillStyle = '#fff';
      c.textAlign = 'left';
      c.textBaseline = 'bottom';
      c.fillText(x1 - x0 + 1 + ' × ' + (y1 - y0 + 1), x0 * s + 2, y0 * s - 2);
    }
    c.restore();
  }
  // digging (gold hatching), smoothing (blue dashes) and pillars kept in the dark (a dashed ring)
  // a stair: steps cut down (or up) through the stone, an arrow in the middle one
  function drawStair(c, t, X, Y, s, x, y) {
    c.fillStyle = t.sr === 'down' ? '#5a5048' : '#9a8c7a';
    c.fillRect(X, Y, s + 0.5, s + 0.5);
    c.strokeStyle = 'rgba(20,16,12,.55)';
    c.lineWidth = Math.max(1, s * 0.05);
    c.beginPath();
    for (let k = 1; k < 4; k++) {
      c.moveTo(X, Y + (s * k) / 4);
      c.lineTo(X + s, Y + (s * k) / 4);
    }
    c.stroke();
    const st = S.stairs.find(q => {
      const lo = q.c + (t.sr === 'up' ? M.STRIDE * W : 0);
      return M.idx(x, y) === lo;
    });
    if (!st) return;
    c.fillStyle = '#ffe9b0';
    c.beginPath();
    if (t.sr === 'down') {
      c.moveTo(X + s * 0.5, Y + s * 0.85);
      c.lineTo(X + s * 0.2, Y + s * 0.35);
      c.lineTo(X + s * 0.8, Y + s * 0.35);
    } else {
      c.moveTo(X + s * 0.5, Y + s * 0.15);
      c.lineTo(X + s * 0.2, Y + s * 0.65);
      c.lineTo(X + s * 0.8, Y + s * 0.65);
    }
    c.closePath();
    c.fill();
  }
  // an unsound roof: hairline cracks on the floor, darker and redder the longer it's been unsound
  function drawCrack(c, t, X, Y, s, x, y) {
    const k = Math.min(1, t.cr / M.CAVE.grace);
    c.save();
    c.strokeStyle = `rgba(${120 + 110 * k},${60 - 30 * k},40,${0.35 + 0.5 * k})`;
    c.lineWidth = Math.max(1, s * (0.03 + 0.04 * k));
    c.beginPath();
    let px = X + hash(x, y, 1) * s,
      py = Y;
    c.moveTo(px, py);
    for (let j = 1; j <= 4; j++) {
      px = X + (0.15 + hash(x, y, j + 2) * 0.7) * s;
      py = Y + (s * j) / 4;
      c.lineTo(px, py);
    }
    if (k > 0.5) {
      c.moveTo(X + s * 0.2, Y + s * 0.5);
      c.lineTo(X + s * 0.8, Y + s * (0.3 + hash(y, x, 3) * 0.4));
    }
    c.stroke();
    c.restore();
  }
  // damp stone: blue flecks and a sheen of wet, on rock and on dug floor alike
  function drawDamp(c, t, X, Y, s, x, y) {
    c.fillStyle = t.k === 'f' ? 'rgba(70,120,190,.18)' : 'rgba(80,140,220,.14)';
    c.fillRect(X, Y, s + 0.5, s + 0.5);
    c.fillStyle = 'rgba(150,200,255,.7)';
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(
        X + (0.2 + hash(x, y, k + 20) * 0.6) * s,
        Y + (0.2 + hash(x, y, k + 30) * 0.6) * s,
        s * 0.05,
        0,
        7
      );
      c.fill();
    }
  }
  // a well: a ring of dressed stone round dark water, a little winch over it
  function drawWell(c, X, Y, s) {
    const cx = X + s / 2,
      cy = Y + s / 2;
    c.fillStyle = '#8a7f74';
    c.beginPath();
    c.arc(cx, cy, s * 0.42, 0, 7);
    c.fill();
    c.strokeStyle = '#d8ccb6';
    c.lineWidth = Math.max(1, s * 0.05);
    c.stroke();
    const g = c.createRadialGradient(cx, cy, s * 0.02, cx, cy, s * 0.28);
    g.addColorStop(0, '#3a6aa8');
    g.addColorStop(1, '#14243a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, s * 0.28, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(190,220,255,.6)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, s * (0.1 + 0.08 * ((performance.now() / 900) % 1)), 0, 7);
    c.stroke();
    c.strokeStyle = '#6a4a2c';
    c.lineWidth = Math.max(1.5, s * 0.06);
    c.beginPath();
    c.moveTo(X + s * 0.12, cy);
    c.lineTo(X + s * 0.88, cy);
    c.stroke();
  }
  // a door: planks in a stone frame, turned to run across the passage it stands in
  function drawDoor(c, X, Y, s, x, y, alpha) {
    const across = M.isFloor(S, x - 1, y) || M.isFloor(S, x + 1, y); // the passage runs east–west, so the door runs north–south
    c.save();
    c.globalAlpha = alpha;
    c.translate(X + s / 2, Y + s / 2);
    if (across) c.rotate(Math.PI / 2);
    c.fillStyle = '#5a5058';
    c.fillRect(-s * 0.5, -s * 0.16, s * 0.12, s * 0.32);
    c.fillRect(s * 0.38, -s * 0.16, s * 0.12, s * 0.32);
    c.fillStyle = '#7a5432';
    c.fillRect(-s * 0.38, -s * 0.12, s * 0.76, s * 0.24);
    c.strokeStyle = '#3e2a18';
    c.lineWidth = Math.max(1, s * 0.03);
    for (let k = -1; k <= 1; k++) {
      c.beginPath();
      c.moveTo(k * s * 0.19, -s * 0.12);
      c.lineTo(k * s * 0.19, s * 0.12);
      c.stroke();
    }
    c.fillStyle = '#d8b070';
    c.beginPath();
    c.arc(s * 0.26, 0, s * 0.035, 0, 7);
    c.fill();
    c.restore();
  }
  // what the mason has been asked to build here: a dashed ghost of it
  function drawBuildMark(c, t, X, Y, s) {
    const x = Math.round(X / s),
      y = Math.round(Y / s);
    c.save();
    c.setLineDash([s * 0.12, s * 0.1]);
    c.strokeStyle = 'rgba(232,208,150,.9)';
    c.lineWidth = Math.max(1, s * 0.06);
    if (t.b === 'wall') {
      c.fillStyle = 'rgba(120,112,120,.45)';
      c.fillRect(X + s * 0.08, Y + s * 0.08, s * 0.84, s * 0.84);
      c.strokeRect(X + s * 0.08, Y + s * 0.08, s * 0.84, s * 0.84);
    } else if (t.b === 'pillar') {
      c.beginPath();
      c.arc(X + s / 2, Y + s / 2, s * 0.36, 0, 7);
      c.stroke();
    } else if (t.b === 'well') {
      c.beginPath();
      c.arc(X + s / 2, Y + s / 2, s * 0.4, 0, 7);
      c.stroke();
      c.beginPath();
      c.arc(X + s / 2, Y + s / 2, s * 0.26, 0, 7);
      c.stroke();
    } else if (t.b === 'door') {
      c.restore();
      drawDoor(c, X, Y, s, x, y, 0.45);
      return;
    }
    c.restore();
  }
  function drawMarks(c, t, X, Y, s) {
    if (t.b) drawBuildMark(c, t, X, Y, s);
    if (t.d) {
      c.save();
      c.beginPath();
      c.rect(X, Y, s, s);
      c.clip();
      c.strokeStyle = 'rgba(240,200,80,.75)';
      c.lineWidth = Math.max(1, s * 0.07);
      c.beginPath();
      for (let k = -1; k <= 1; k += 0.5) {
        c.moveTo(X + s * k, Y + s);
        c.lineTo(X + s * (k + 1), Y);
      }
      c.stroke();
      c.restore();
      c.strokeStyle = 'rgba(240,200,80,.55)';
      c.lineWidth = 1;
      c.strokeRect(X + 1, Y + 1, s - 2, s - 2);
      if (t.cl) {
        c.fillStyle = '#ffe08a';
        c.font = `${Math.floor(s * 0.55)}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('⛏', X + s / 2, Y + s / 2);
      }
    }
    if (t.m && !t.w) {
      c.setLineDash([s * 0.15, s * 0.12]);
      c.strokeStyle = 'rgba(140,200,255,.85)';
      c.lineWidth = Math.max(1, s * 0.06);
      c.strokeRect(X + s * 0.15, Y + s * 0.15, s * 0.7, s * 0.7);
      c.setLineDash([]);
    }
    if (t.p && !t.s) {
      c.setLineDash([3, 3]);
      c.strokeStyle = 'rgba(230,230,230,.7)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(X + s / 2, Y + s / 2, s * 0.36, 0, 7);
      c.stroke();
      c.setLineDash([]);
    }
  }
  function nearSeen(x, y) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const a = x + dx,
        b = y + dy;
      if (M.inB(a, b) && S.tiles[M.idx(a, b)].s) return true;
    }
    return false;
  }
  function drawFurn(c, t, X, Y, s) {
    c.save();
    if (!t.fb) {
      c.globalAlpha = 0.45;
      c.setLineDash([3, 3]);
    }
    if (t.fu === 'bed') {
      c.fillStyle = t.fb ? '#5f3d24' : 'transparent';
      c.strokeStyle = '#d8c090';
      c.lineWidth = 1.5;
      c.fillRect(X + s * 0.18, Y + s * 0.1, s * 0.64, s * 0.8);
      c.strokeRect(X + s * 0.18, Y + s * 0.1, s * 0.64, s * 0.8);
      if (t.fb) {
        c.fillStyle = '#4f6fb0';
        c.fillRect(X + s * 0.22, Y + s * 0.38, s * 0.56, s * 0.48);
        c.fillStyle = '#eee2c8';
        c.fillRect(X + s * 0.26, Y + s * 0.15, s * 0.48, s * 0.18);
      }
    } else if (t.fu === 'table') {
      c.fillStyle = t.fb ? '#7a5532' : 'transparent';
      c.strokeStyle = '#d8c090';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(X + s / 2, Y + s / 2, s * 0.3, 0, 7);
      c.fill();
      c.stroke();
      if (t.fb) {
        c.fillStyle = '#5a3d22';
        for (const [a, b] of [
          [0.12, 0.5],
          [0.88, 0.5],
          [0.5, 0.12],
          [0.5, 0.88]
        ]) {
          c.beginPath();
          c.arc(X + s * a, Y + s * b, s * 0.09, 0, 7);
          c.fill();
        }
      }
    } else if (t.fu === 'bench') {
      // a mason's bench: a slab on trestles with a block on it, a mallet and chisel beside
      c.fillStyle = t.fb ? '#8a7f74' : 'transparent';
      c.strokeStyle = '#e0d4bc';
      c.lineWidth = 1.5;
      c.fillRect(X + s * 0.1, Y + s * 0.3, s * 0.8, s * 0.42);
      c.strokeRect(X + s * 0.1, Y + s * 0.3, s * 0.8, s * 0.42);
      if (t.fb) {
        c.fillStyle = '#d8ccb6';
        c.fillRect(X + s * 0.22, Y + s * 0.36, s * 0.26, s * 0.22);
        c.fillStyle = '#6a4a2c';
        c.fillRect(X + s * 0.58, Y + s * 0.4, s * 0.24, s * 0.08);
        c.fillStyle = '#9aa0a8';
        c.fillRect(X + s * 0.6, Y + s * 0.56, s * 0.2, s * 0.05);
      }
    } else if (t.fu === 'hearth') {
      // a stone hearth with a pot over the fire
      c.fillStyle = t.fb ? '#6a625a' : 'transparent';
      c.strokeStyle = '#e0d4bc';
      c.lineWidth = 1.5;
      c.fillRect(X + s * 0.12, Y + s * 0.15, s * 0.76, s * 0.7);
      c.strokeRect(X + s * 0.12, Y + s * 0.15, s * 0.76, s * 0.7);
      if (t.fb) {
        const f = 0.5 + 0.5 * Math.sin(performance.now() / 160 + X);
        c.fillStyle = `rgba(255,${140 + f * 60},40,0.95)`;
        c.beginPath();
        c.moveTo(X + s * 0.3, Y + s * 0.78);
        c.quadraticCurveTo(X + s * 0.5, Y + s * (0.42 - f * 0.06), X + s * 0.7, Y + s * 0.78);
        c.fill();
        c.fillStyle = '#2a2420';
        c.beginPath();
        c.arc(X + s * 0.5, Y + s * 0.42, s * 0.18, 0, 7);
        c.fill();
      }
    } else if (t.fu === 'anvil') {
      // an anvil on a block, a glowing bar of bronze on it
      c.fillStyle = t.fb ? '#3a3e46' : 'transparent';
      c.strokeStyle = '#c8ccd4';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(X + s * 0.12, Y + s * 0.32);
      c.lineTo(X + s * 0.88, Y + s * 0.32);
      c.lineTo(X + s * 0.7, Y + s * 0.5);
      c.lineTo(X + s * 0.64, Y + s * 0.8);
      c.lineTo(X + s * 0.36, Y + s * 0.8);
      c.lineTo(X + s * 0.32, Y + s * 0.5);
      c.closePath();
      c.fill();
      c.stroke();
      if (t.fb) {
        c.fillStyle = '#ff9a40';
        c.fillRect(X + s * 0.38, Y + s * 0.26, s * 0.24, s * 0.06);
      }
    } else if (t.fu === 'keg') {
      // a barrel on its side
      c.fillStyle = t.fb ? '#8a5a2a' : 'transparent';
      c.strokeStyle = '#f0c890';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(X + s / 2, Y + s / 2, s * 0.36, s * 0.26, 0, 0, 7);
      c.fill();
      c.stroke();
      if (t.fb) {
        c.strokeStyle = '#3a2a1a';
        c.beginPath();
        c.moveTo(X + s * 0.32, Y + s * 0.27);
        c.lineTo(X + s * 0.32, Y + s * 0.73);
        c.moveTo(X + s * 0.68, Y + s * 0.27);
        c.lineTo(X + s * 0.68, Y + s * 0.73);
        c.stroke();
        c.fillStyle = '#d8c090';
        c.beginPath();
        c.arc(X + s * 0.86, Y + s * 0.5, s * 0.05, 0, 7);
        c.fill();
      }
    } else if (t.fu === 'cot') {
      // a narrow cot with a white sheet and a red cross
      c.fillStyle = t.fb ? '#8a7050' : 'transparent';
      c.strokeStyle = '#e8e8e8';
      c.lineWidth = 1.5;
      c.fillRect(X + s * 0.26, Y + s * 0.1, s * 0.48, s * 0.8);
      c.strokeRect(X + s * 0.26, Y + s * 0.1, s * 0.48, s * 0.8);
      if (t.fb) {
        c.fillStyle = '#eeeeea';
        c.fillRect(X + s * 0.3, Y + s * 0.34, s * 0.4, s * 0.52);
        c.fillStyle = '#d02828';
        c.fillRect(X + s * 0.46, Y + s * 0.48, s * 0.08, s * 0.24);
        c.fillRect(X + s * 0.38, Y + s * 0.56, s * 0.24, s * 0.08);
      }
    } else if (t.fu === 'rack') {
      // a weapon rack: a frame with an axe and a spear
      c.strokeStyle = '#d8c090';
      c.lineWidth = 1.5;
      c.fillStyle = t.fb ? '#5a3d24' : 'transparent';
      c.fillRect(X + s * 0.14, Y + s * 0.7, s * 0.72, s * 0.12);
      c.strokeRect(X + s * 0.14, Y + s * 0.7, s * 0.72, s * 0.12);
      if (t.fb) {
        c.strokeStyle = '#6a4a2c';
        c.lineWidth = Math.max(1.5, s * 0.05);
        c.beginPath();
        c.moveTo(X + s * 0.35, Y + s * 0.72);
        c.lineTo(X + s * 0.35, Y + s * 0.18);
        c.moveTo(X + s * 0.65, Y + s * 0.72);
        c.lineTo(X + s * 0.65, Y + s * 0.12);
        c.stroke();
        c.fillStyle = '#b8bcc4';
        c.beginPath();
        c.moveTo(X + s * 0.35, Y + s * 0.2);
        c.quadraticCurveTo(X + s * 0.14, Y + s * 0.3, X + s * 0.35, Y + s * 0.42);
        c.fill();
        c.beginPath();
        c.moveTo(X + s * 0.65, Y + s * 0.04);
        c.lineTo(X + s * 0.71, Y + s * 0.16);
        c.lineTo(X + s * 0.59, Y + s * 0.16);
        c.fill();
      }
    } else if (t.fu === 'plaque') {
      // a carved memorial stone, a candle burning before it
      c.fillStyle = t.fb ? '#7c8494' : 'transparent';
      c.strokeStyle = '#d8dce8';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(X + s * 0.2, Y + s * 0.85);
      c.lineTo(X + s * 0.2, Y + s * 0.3);
      c.quadraticCurveTo(X + s * 0.5, Y + s * 0.05, X + s * 0.8, Y + s * 0.3);
      c.lineTo(X + s * 0.8, Y + s * 0.85);
      c.closePath();
      c.fill();
      c.stroke();
      if (t.fb) {
        c.strokeStyle = 'rgba(30,30,40,.6)';
        c.lineWidth = 1;
        for (let k = 0; k < Math.min(4, S.dead.length || 1); k++) {
          c.beginPath();
          c.moveTo(X + s * 0.32, Y + s * (0.38 + k * 0.1));
          c.lineTo(X + s * 0.68, Y + s * (0.38 + k * 0.1));
          c.stroke();
        }
        c.fillStyle = `rgba(255,${190 + 40 * Math.sin(performance.now() / 200)},90,.95)`;
        c.beginPath();
        c.arc(X + s * 0.5, Y + s * 0.92, s * 0.05, 0, 7);
        c.fill();
      }
    } else if (t.fu === 'still') {
      c.fillStyle = t.fb ? '#b8743a' : 'transparent';
      c.strokeStyle = '#f0c890';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(X + s * 0.45, Y + s * 0.55, s * 0.28, 0, 7);
      c.fill();
      c.stroke();
      if (t.fb) {
        c.strokeStyle = '#d8a060';
        c.lineWidth = Math.max(1.5, s * 0.07);
        c.beginPath();
        c.moveTo(X + s * 0.6, Y + s * 0.3);
        c.quadraticCurveTo(X + s * 0.9, Y + s * 0.15, X + s * 0.88, Y + s * 0.6);
        c.stroke();
      }
    }
    c.restore();
  }
  function drawCrop(c, t, X, Y, s, x, y) {
    if (t.g === 1) {
      c.fillStyle = '#7cc060';
      for (let k = 0; k < 4; k++)
        c.fillRect(
          X + (0.2 + hash(x, y, k) * 0.6) * s,
          Y + (0.25 + hash(x, y, k + 2) * 0.5) * s,
          s * 0.06,
          s * 0.16
        );
      return;
    }
    if (t.crop === 'barley') {
      c.strokeStyle = '#e0c050';
      c.lineWidth = Math.max(1, s * 0.05);
      c.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = X + (0.15 + k * 0.17) * s;
        c.moveTo(a, Y + s * 0.85);
        c.lineTo(a + s * 0.04, Y + s * 0.2);
      }
      c.stroke();
      return;
    }
    for (let k = 0; k < 3; k++) {
      const a = X + (0.25 + k * 0.25) * s,
        b = Y + (0.4 + hash(x, y, k) * 0.3) * s;
      c.fillStyle = '#e8dcc0';
      c.fillRect(a - s * 0.03, b, s * 0.06, s * 0.16);
      c.fillStyle = '#c98f5a';
      c.beginPath();
      c.ellipse(a, b, s * 0.12, s * 0.07, 0, Math.PI, 0);
      c.fill();
    }
  }
  function drawItem(c, kind, x, y, r) {
    const col =
      {
        stone: '#8a8078',
        block: '#d8ccb6',
        copper: '#d0783a',
        tin: '#b8c8d8',
        coal: '#222',
        food: '#d8b890',
        ale: '#8a5a2a',
        barley: '#e0c050',
        meal: '#c87840',
        bronze: '#b07a3a',
        pick: '#9aa0a8',
        water: '#5a9ae0',
        iron: '#a0583c',
        limestone: '#e0dcc8',
        silver: '#e8eef4',
        gems: '#4ad0a0',
        galestone: '#a0e0ff',
        gold: '#f0c838',
        heartsilver: '#c8a0ff'
      }[kind] || '#fff';
    c.fillStyle = col;
    c.strokeStyle = 'rgba(0,0,0,.6)';
    c.lineWidth = 1;
    if (kind === 'ale') {
      c.beginPath();
      c.ellipse(x, y, r * 0.8, r, 0, 0, 7);
      c.fill();
      c.stroke();
    } else if (kind === 'stone') {
      // rough stone: a lumpy, uncut rock
      c.beginPath();
      c.moveTo(x - r, y + r * 0.2);
      c.lineTo(x - r * 0.5, y - r * 0.8);
      c.lineTo(x + r * 0.6, y - r * 0.6);
      c.lineTo(x + r, y + r * 0.3);
      c.lineTo(x + r * 0.2, y + r * 0.8);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (kind === 'meal') {
      // a bowl of stew
      c.fillStyle = '#6a4a2c';
      c.beginPath();
      c.arc(x, y - r * 0.1, r, 0, Math.PI);
      c.fill();
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y - r * 0.1, r, r * 0.35, 0, 0, 7);
      c.fill();
    } else if (kind === 'bronze') {
      // an ingot
      c.beginPath();
      c.moveTo(x - r, y + r * 0.5);
      c.lineTo(x - r * 0.6, y - r * 0.5);
      c.lineTo(x + r * 0.6, y - r * 0.5);
      c.lineTo(x + r, y + r * 0.5);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (kind === 'pick') {
      c.strokeStyle = '#6a4a2c';
      c.lineWidth = Math.max(1.5, r * 0.35);
      c.beginPath();
      c.moveTo(x - r * 0.7, y + r);
      c.lineTo(x + r * 0.4, y - r * 0.5);
      c.stroke();
      c.strokeStyle = col;
      c.beginPath();
      c.moveTo(x - r * 0.4, y - r * 0.9);
      c.quadraticCurveTo(x + r * 0.5, y - r * 0.8, x + r, y);
      c.stroke();
    } else if (kind === 'block') {
      // a dressed block: square-cut
      c.fillRect(x - r, y - r * 0.7, r * 2, r * 1.4);
      c.strokeRect(x - r, y - r * 0.7, r * 2, r * 1.4);
    } else {
      c.beginPath();
      c.arc(x, y, r, 0, 7);
      c.fill();
      c.stroke();
    }
  }
  function drawDwarf(c, d, s) {
    const X = (d.x + 0.5) * s,
      Y = (d.y + 0.5) * s,
      r = s * 0.32,
      T = M.TRADES[d.trade],
      asleep = d.job && d.job.type === 'sleep' && !d.path.length;
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath();
    c.ellipse(X, Y + r * 0.8, r, r * 0.4, 0, 0, 7);
    c.fill();
    c.fillStyle = T.col;
    c.beginPath();
    c.arc(X, Y, r, 0, 7);
    c.fill();
    c.fillStyle = '#e6b894';
    c.beginPath();
    c.arc(X, Y - r * 0.25, r * 0.5, 0, 7);
    c.fill();
    c.fillStyle = d.sex === 'f' ? '#a0522d' : '#8a5a30';
    c.beginPath();
    c.arc(X, Y + r * 0.05, r * 0.42, 0, Math.PI);
    c.fill(); // beard (or braids)
    c.fillStyle = '#5a4030';
    c.beginPath();
    c.arc(X, Y - r * 0.45, r * 0.5, Math.PI, 0);
    c.fill(); // cap
    if (d.carry) drawItem(c, d.carry.kind, X + r * 0.8, Y - r * 0.6, s * 0.12);
    if (d.hurt) {
      // a bandage: a small red cross on the shoulder
      const b = s * 0.09;
      c.fillStyle = '#fff';
      c.fillRect(X - r * 0.95 - b * 1.5, Y - b * 1.5, b * 3, b * 3);
      c.fillStyle = '#d02828';
      c.fillRect(X - r * 0.95 - b * 1.2, Y - b * 0.4, b * 2.4, b * 0.8);
      c.fillRect(X - r * 0.95 - b * 0.4, Y - b * 1.2, b * 0.8, b * 2.4);
    }
    if (d.grudges.length >= M.GRUMBLE) {
      c.fillStyle = d.grudges.length >= M.DOWN_TOOLS ? '#ff5040' : '#f0a030';
      c.font = `bold ${Math.floor(s * 0.45)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText('!', X + r, Y - r * 0.4);
    }
    if (asleep) {
      c.fillStyle = '#cfe0ff';
      c.font = `bold ${Math.floor(s * 0.4)}px sans-serif`;
      c.textAlign = 'left';
      c.textBaseline = 'bottom';
      c.fillText('z', X + r * 0.6, Y - r * 0.6 - Math.sin(performance.now() / 400) * 2);
    }
    if (ui.sel && ui.sel.kind === 'dwarf' && ui.sel.id === d.id) {
      c.strokeStyle = '#fff3b0';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X, Y, r + 3, 0, 7);
      c.stroke();
      if (d.job && d.job.tile >= 0) {
        const i = d.job.tile;
        c.strokeStyle = 'rgba(255,243,176,.6)';
        c.setLineDash([4, 4]);
        c.strokeRect((i % W) * s + 2, ((i / W) | 0) * s + 2, s - 4, s - 4);
        c.setLineDash([]);
      }
    }
  }
  // an earth elemental: a craggy lump of the layer's stone with glowing eyes; half sunk when in the rock
  function drawFoe(c, f, s) {
    const K = M.FOES[f.kind],
      X = (f.x + 0.5) * s,
      Y = (f.y + 0.5) * s,
      inRock = S.tiles[M.idx(Math.round(f.x), Math.round(f.y))].k === 'r',
      r = s * (f.kind === 'stonewake' || f.kind === 'ember' ? 0.46 : 0.38),
      now = performance.now();
    c.save();
    if (f.state === 'sleep') c.globalAlpha = 0.55;
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath();
    c.ellipse(X, Y + r * 0.7, r, r * 0.35, 0, 0, 7);
    c.fill();
    // the body: a ring of jagged points round the middle, gently heaving
    c.fillStyle = K.col;
    c.strokeStyle = 'rgba(20,14,10,.8)';
    c.lineWidth = Math.max(1, s * 0.05);
    c.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2,
        rr = r * (0.75 + (0.25 * ((k * 37 + f.id) % 5)) / 4) * (1 + 0.04 * Math.sin(now / 300 + k));
      const px = X + Math.cos(a) * rr,
        py = Y + Math.sin(a) * rr * 0.9;
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
    c.fill();
    c.stroke();
    // cracks of inner light
    c.strokeStyle = f.kind === 'ember' ? '#ffd080' : f.kind === 'crystal' ? '#f0e0ff' : '#c8e0ff';
    c.globalAlpha *= 0.6;
    c.beginPath();
    c.moveTo(X - r * 0.4, Y + r * 0.2);
    c.lineTo(X - r * 0.1, Y - r * 0.1);
    c.lineTo(X + r * 0.3, Y + r * 0.3);
    c.stroke();
    c.globalAlpha = f.state === 'sleep' ? 0.55 : 1;
    // eyes: shut when asleep
    c.fillStyle = f.kind === 'ember' ? '#ffcc40' : '#9fe8ff';
    for (const ex of [-0.28, 0.28]) {
      c.beginPath();
      if (f.state === 'sleep') c.fillRect(X + ex * r - r * 0.12, Y - r * 0.25, r * 0.24, r * 0.05);
      else c.arc(X + ex * r, Y - r * 0.22, r * 0.11, 0, 7);
      c.fill();
    }
    // half sunk in the stone: rock drawn over its lower half
    if (inRock) {
      c.fillStyle = 'rgba(40,34,30,.7)';
      c.fillRect(X - r * 1.1, Y + r * 0.1, r * 2.2, r * 1.1);
    }
    // its strength, once hurt
    if (f.hp < f.max) {
      c.globalAlpha = 1;
      c.fillStyle = '#200';
      c.fillRect(X - r, Y - r * 1.35, r * 2, Math.max(2, s * 0.08));
      c.fillStyle = '#e05a3a';
      c.fillRect(X - r, Y - r * 1.35, r * 2 * (f.hp / f.max), Math.max(2, s * 0.08));
    }
    if (ui.sel && ui.sel.kind === 'foe' && ui.sel.id === f.id) {
      c.strokeStyle = '#ff8a6a';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X, Y, r + 4, 0, 7);
      c.stroke();
    }
    c.restore();
  }
  // a tremor: rings shaking out from where something stirs in the dark
  function drawTremor(c, m, s) {
    const age = (S.t - m.t) / M.TREMOR.show,
      X = (m.x + 0.5) * s,
      Y = (m.y + 0.5) * s,
      j = Math.sin(performance.now() / 40) * s * 0.05;
    c.save();
    c.strokeStyle = m.sleep ? 'rgba(200,180,255,' : 'rgba(255,190,120,';
    for (let k = 0; k < 3; k++) {
      const ph = (performance.now() / 900 + k / 3) % 1;
      c.strokeStyle =
        (m.sleep ? 'rgba(200,180,255,' : 'rgba(255,190,120,') + (1 - ph) * (1 - age) * 0.8 + ')';
      c.lineWidth = Math.max(1, s * 0.06);
      c.beginPath();
      c.arc(X + j, Y, s * (0.4 + ph * 1.6), 0, 7);
      c.stroke();
    }
    c.restore();
  }
  function drawDurin(c, s) {
    const X = (S.durin.x + 0.5) * s,
      Y = (S.durin.y + 0.5) * s,
      r = s * 0.42;
    c.fillStyle = 'rgba(0,0,0,.4)';
    c.beginPath();
    c.ellipse(X, Y + r * 0.8, r, r * 0.4, 0, 0, 7);
    c.fill();
    if (!durinImg) {
      durinImg = new Image();
      durinImg.src = 'portraits/small/durin.jpg';
    }
    c.save();
    c.beginPath();
    c.arc(X, Y, r, 0, 7);
    c.clip();
    if (durinImg.complete && durinImg.naturalWidth) c.drawImage(durinImg, X - r, Y - r, r * 2, r * 2);
    else {
      c.fillStyle = '#b08040';
      c.fillRect(X - r, Y - r, r * 2, r * 2);
    }
    c.restore();
    c.strokeStyle = ui.sel && ui.sel.kind === 'durin' ? '#fff3b0' : '#e2b84c';
    c.lineWidth = ui.sel && ui.sel.kind === 'durin' ? 3 : 2;
    c.beginPath();
    c.arc(X, Y, r, 0, 7);
    c.stroke();
    if (S.durin.path.length) {
      c.strokeStyle = 'rgba(226,184,76,.5)';
      c.setLineDash([3, 4]);
      c.beginPath();
      c.moveTo(X, Y);
      for (const i of S.durin.path) {
        if (!onView((i / W) | 0)) break;
        c.lineTo(((i % W) + 0.5) * s, (((i / W) | 0) + 0.5) * s);
      }
      c.stroke();
      c.setLineDash([]);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const b = $('btn-mine');
    if (b) b.addEventListener('click', open);
  });
  // _select({kind:'room', id}) etc. is for tests
  window.Mine = {
    open,
    close,
    _state: () => S,
    _speed: setSpeed,
    _select: sel => {
      ui.sel = sel;
      renderSide(true);
    }
  };
})();
