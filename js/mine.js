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
    H = M.H;

  let S = null,
    raf = 0,
    last = 0,
    speed = 1,
    eye = null,
    eyeAt = 0,
    saveAt = 0,
    logSeen = 0;
  const ui = { tool: 'look', sel: null, tab: 'crew', overlay: false, menu: null, drag: null };
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
      'Drag over rock to keep it as pillars, or over dug floor to have the mason build one (a dressed block each).'
    ],
    [
      'door',
      '🚪',
      'Door',
      'Drag over dug floor for the mason to hang a door (a dressed block each). Clear takes one out.'
    ]
  ];
  const ROOM_HELP = {
    stockpile: 'Hauls go here. The gate counts as one, but a stockpile nearer the work saves walking.',
    bedroom: 'One bed. A dwarf with a fine bedroom (2★) sleeps off a grudge.',
    dorm: 'A bed for every 3 tiles. Cheaper than bedrooms, never as good.',
    dining: 'A table for every 6 tiles. Eating anywhere else is a grudge after the first day and a half.',
    farm: 'Needs soil (the brown loam you dig out). The farmer grows deepcaps (food) and cave barley (for ale), turn about.',
    brewery: 'One still. The brewer turns a barley into ' + 3 + ' ale.',
    workshop:
      "One mason's bench, roughed out of rough stone. Here the mason cuts rough stone into dressed blocks, and every bed, table, still, wall, pillar and door takes a block: make this first."
  };
  const STOCK_ICON = [
    ['food', '🍄', 'Food'],
    ['ale', '🍺', 'Ale'],
    ['stone', '🪨', 'Rough stone (from digging)'],
    ['block', '🧱', "Dressed blocks (cut at the mason's workshop; everything built takes one)"],
    ['copper', '🟠', 'Copper ore'],
    ['tin', '⚪', 'Tin ore'],
    ['coal', '⚫', 'Coal'],
    ['barley', '🌾', 'Cave barley']
  ];

  // ── Save ──
  function save() {
    try {
      localStorage.setItem(SAVE, JSON.stringify(S));
    } catch (e) {}
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE) || 'null');
      return s && s.v === 1 ? s : null;
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
          <button class="mn-btn" id="mn-eye" type="button" title="Show what the Mason's Eye dislikes">👁</button></div>
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
      } else {
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
    eye = null;
    if (fresh) save();
    fitCanvas(true);
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
      const r = M.notePatterns(S);
      eye = r.eye;
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
    const st = STOCK_ICON.map(([k, i, n]) => `<span title="${n}">${i} ${S.stock[k] || 0}</span>`).join('');
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
  const isBuild = t => t === 'wall' || t === 'pillar' || t === 'door';
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
        ['eye', "Mason's Eye"],
        ['log', 'Log']
      ];
    const body = { crew: crewHtml, ledger: ledgerHtml, eye: eyeHtml, log: logHtml }[ui.tab]();
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
            renderSide(true);
          })
      );
    const bk = $('mn-book');
    if (bk) bk.onclick = delveBook;
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
      return `${x}<b>${d.name}</b> <small>${T.icon} ${M.levelOf(d).name} ${T.name.toLowerCase()}</small><p>${d.act}. Mood: ${mood}.</p>
      <div class="mn-needs"><span>🍄 Food</span>${bar(d.needs.food, needCol(d.needs.food))}<span>🍺 Ale</span>${bar(d.needs.ale, needCol(d.needs.ale))}<span>💤 Sleep</span>${bar(d.needs.sleep, needCol(d.needs.sleep))}</div>
      ${g ? '<p class="mn-note">📕 ' + d.grudges.map(x => x.why).join('; ') + '</p>' : ''}`;
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
              : (t.o === 'soil'
                  ? 'Loam (soft; leaves soil to farm)'
                  : t.o
                    ? M.ORES[t.o].name[0].toUpperCase() + M.ORES[t.o].name.slice(1) + ' ore'
                    : ['', 'Soft', 'Firm', 'Hard'][t.h] + ' rock') + (t.w ? ', smoothed' : '');
      return `${x}<b>${what}</b>${t.d ? '<p class="mn-note">Marked for digging.</p>' : ''}${t.m ? '<p class="mn-note">Marked for smoothing.</p>' : ''}${t.b ? '<p class="mn-note">The mason is to build a ' + t.b + ' here (a dressed block).</p>' : ''}`;
    }
    return '';
  }
  function crewHtml() {
    return (
      '<div class="mn-list">' +
      S.dwarves
        .map(d => {
          const T = M.TRADES[d.trade],
            g = d.grudges.length;
          return `<button class="mn-item${ui.sel && ui.sel.id === d.id ? ' on' : ''}" data-dw="${d.id}" type="button">${T.icon} <b>${d.name}</b> <small>${M.levelOf(d).name} ${T.name.toLowerCase()}</small><br><small>${d.act}${g ? ' · 📕' + g : ''}</small></button>`;
        })
        .join('') +
      '</div>' +
      `<p class="mn-note">Miners dig. The mason builds furniture and smooths walls. The farmer grows food and barley; the brewer makes ale. Everyone hauls, and digs when there's nothing else.</p>`
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
        : '<p>The Ledger is clean. Long may it last.</p>')
    );
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
      <li><b>🏠 Room</b> opens a menu of rooms; pick one, then drag over dug floor. Bedrooms, a dining hall, a mushroom farm on soil, a brewery, a stockpile, and the <b>mason's workshop</b>.</li>
      <li><b>The mason's workshop comes first</b>: its bench is roughed out of rough stone, and there the mason cuts rough stone into <b>dressed blocks</b> (🧱 in the stock). Every bed, table, still, wall, pillar and door takes a block, and he cuts only as many as your building needs.</li>
      <li><b>✨ Smooth</b>: the mason smooths walls and pillars. Finer rooms, and worked stone will keep elementals out.</li>
      <li><b>Durin</b>: tap him, then tap floor to send him there; he prospects the stone round him once a day.</li>
      <li><b>The Ledger</b>: hungry, dry or floor-sleeping dwarves hold grudges. Too many and they slow down, then stop.</li>
      <li><b>The Mason's Eye</b>: Durin scores the look of the Delve, and names fine patterns when he sees them. The Delve-book (on the Mason's Eye tab) shows what each one is.</li>
    </ul>
    <p class="mn-note">Space pauses. Keys: D dig, B build menu (W wall, P pillar, O door), S smooth, R room menu, C clear, L look. This is the first layer only: cave-ins, quotas, the stair down and the elementals come next.</p>
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
    spiral: {
      how: 'Cut the stair down to the next layer as a spiral. It comes with the stair, which isn\u2019t built yet.',
      plan: ['#####', '#~~~#', '#~#~#', '#~~##', '#####']
    }
  };
  const PLAN_COL = {
    '#': '#4b4450',
    '.': '#8a7d6e',
    o: '#cfc2ad',
    R: '#b98c5e',
    $: '#d0783a',
    '~': '#7a8fb0'
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
    base = Math.min(w / W, (h - 8) / H);
    if (reset) {
      view.zoom = Math.max(1, Math.min(4, MIN_TILE / base));
      const s = ts(),
        gy = Math.floor(H / 2);
      view.ox = (w - W * s) / 2;
      view.oy = (h - H * s) / 2;
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
      mh = H * s;
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
  const toTile = (px, py) => ({ x: Math.floor((px - view.ox) / ts()), y: Math.floor((py - view.oy) / ts()) });

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
      const tool = ui.tool === 'wall' || ui.tool === 'door' ? 'build:' + ui.tool : ui.tool;
      const r = M.designate(S, tool, g.x0, g.y0, g.x1, g.y1);
      if (r && r.ok === false) say(r.why);
      else if (r && r.n === 0 && (ui.tool === 'wall' || ui.tool === 'door'))
        say(
          ui.tool === 'wall'
            ? 'Walls go on dug floor, outside rooms and clear of furniture and the gate.'
            : 'Doors go on dug floor, clear of furniture and the gate.'
        );
      else if (r && r.n && /^(wall|door|pillar)$/.test(ui.tool) && !(S.stock.block > 0)) say(blockNews());
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
      fy = (py - view.oy) / ts() - 0.5;
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
    if (Math.hypot(fx - S.durin.x, fy - S.durin.y) < 0.75) {
      ui.sel = { kind: 'durin' };
      renderSide(true);
      return;
    }
    let best = null,
      bd = 0.7;
    for (const d of S.dwarves) {
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
  const ROCK = ['', '#6e6056', '#5a5359', '#46414b'],
    ROCK_W = ['', '#8d7d70', '#787078', '#625b68'];
  let durinImg = null;
  function draw() {
    const c = cx,
      s = ts();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#08070a';
    c.fillRect(0, 0, cw, ch);
    c.save();
    c.translate(view.ox, view.oy);
    const T = S.tiles,
      gate = new Set(S.gate);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = T[M.idx(x, y)],
          X = x * s,
          Y = y * s;
        if (!t.s) {
          c.fillStyle = '#0d0c10';
          c.fillRect(X, Y, s + 0.5, s + 0.5);
          // stone-sense: a faint shimmer of ore one tile into the dark
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
          if (!t.w)
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
        drawMarks(c, t, X, Y, s);
        if (t.fu) drawFurn(c, t, X, Y, s);
        if (t.dr) drawDoor(c, X, Y, s, x, y, 1);
        if (t.g) drawCrop(c, t, X, Y, s, x, y);
      }
    // daylight at the gate
    const gy = Math.floor(H / 2);
    const dl = c.createLinearGradient(0, 0, s * 3, 0);
    dl.addColorStop(0, 'rgba(255,240,190,.35)');
    dl.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = dl;
    c.fillRect(0, (gy - 1) * s, s * 3, s * 2);
    // rooms: a tint and a border, the name on top
    for (const r of S.rooms) {
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
      }
    }
    // items lying about
    for (const it of S.items) {
      const x = it.i % W,
        y = (it.i / W) | 0;
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
    for (const d of S.dwarves) drawDwarf(c, d, s);
    drawDurin(c, s);
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
        barley: '#e0c050'
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
      for (const i of S.durin.path) c.lineTo(((i % W) + 0.5) * s, (((i / W) | 0) + 0.5) * s);
      c.stroke();
      c.setLineDash([]);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const b = $('btn-mine');
    if (b) b.addEventListener('click', open);
  });
  window.Mine = { open, close, _state: () => S, _speed: setSpeed };
})();
