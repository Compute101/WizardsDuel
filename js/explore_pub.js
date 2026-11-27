// Winks at the Wren's Nest (the University Year, docs/world-design.md): the tabletop Wizard's Duel
// (js/tabletop.js) against Old Squop for a few gold. You pick a wizard's card, pick a spell each round,
// and flick for it: a marker sweeps across the table and you tap when it's over the cup. The number of
// flicks is the rule set's (Beginner and Normal: 10 minus the spell's cost); the first pot casts.
// ExplorePub.play(api, {rules, stake, foeName}) → Promise<{won} | null (left before it started)>
(function () {
  'use strict';

  const esc = s =>
    String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const up = s => s.charAt(0).toUpperCase() + s.slice(1);
  const shuffle = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const LEVEL = ['Lesser', 'Normal', 'Greater'];
  const CAT = { damage: 'Strike', protect: 'Ward', dispel: 'Dispel' };
  const ICON = {
    fire: '🔥',
    air: '💨',
    lightning: 'ϟ',
    arcane: '✦',
    water: '🌊',
    earth: '🪨',
    ice: '❄︎',
    dark: '☾︎'
  };
  const FLICK = { zone: 0.24, sweepMs: 1100 }; // the cup's share of the table, and how fast the marker crosses

  let loaded = null;
  function load() {
    if (loaded) return loaded;
    const get = f => fetch(f).then(r => r.json());
    loaded = Promise.all([get('characters.json'), get('tabletop.json'), get('fighters.json')]).then(
      ([c, t, f]) => {
        window.TT.load(c, t, f);
      }
    );
    return loaded;
  }

  let box = null;
  function play(api, o) {
    const TT = window.TT;
    if (!TT) return Promise.resolve(null);
    return load().then(
      () =>
        new Promise(resolve => {
          TT.useRules(o.rules || 'beginner');
          const root = document.getElementById('explore-screen');
          if (box) box.remove();
          box = document.createElement('div');
          box.className = 'st-wrap pub-wrap';
          root.appendChild(box);
          const close = r => {
            box.remove();
            box = null;
            resolve(r);
          };
          const keys = Object.keys(TT.chars),
            foeName = o.foeName || 'Squop';
          // 1. pick a card
          const offer = shuffle(keys).slice(0, 4);
          box.innerHTML =
            `<div class="st-card"><div class="st-title">Winks at the Wren's Nest</div>` +
            `<div class="st-sub">${esc(foeName)} fans out a battered deck of wizard cards. "Pick one. ${o.stake} gold on it." (${up(TT.rulesName)} rules)</div>` +
            `<div class="pub-cards">` +
            offer
              .map(k => {
                const c = TT.chars[k];
                return (
                  `<button class="ex-btn pub-card" data-k="${k}" type="button"><b>${esc(c.name)}</b><small>HP ${c.hp} · ` +
                  c.spells.map(s => esc(s.name)).join(' · ') +
                  `</small></button>`
                );
              })
              .join('') +
            `</div>` +
            `<div class="st-foot"><button class="ex-btn pub-leave" type="button">Leave the table</button></div></div>`;
          box.querySelector('.pub-leave').onclick = () => close(null);
          box.querySelectorAll('.pub-card').forEach(b => (b.onclick = () => start(b.dataset.k)));

          let gs = null,
            mine = null;
          function start(k) {
            mine = k;
            const his = shuffle(keys.filter(x => x !== k))[0];
            TT.newGame(k, his);
            gs = TT.state;
            gs.verbose = true;
            round('');
          }
          function seatLine(w, label) {
            const st = gs[w],
              ward = st.ward ? ` · ward ${st.ward.hp}${st.wardInner && st.wardInner.length ? '+' : ''}` : '';
            return `<div class="pub-seat"><b>${esc(label)}</b> <span>${esc(st.c.name)}</span><span class="pub-num">❤ ${st.hp} · ✦ ${st.mana}${ward}</span></div>`;
          }
          function choices() {
            const st = gs.p1,
              R = TT.RULES,
              out = [];
            const elems = TT.ELEMENTS.filter(e => !st.c.forbidden.includes(e));
            const add = (group, label, a, cost, tip) =>
              out.push({ group, label, a, ok: TT.canPick(st, a), cost, tip });
            add('Actions (free, no flick)', '⚔️ Attack', { cat: 'damage', act: 'attack', target: 'p2' }, 0);
            add('Actions (free, no flick)', '🛡 Guard', { cat: 'protect', act: 'guard', target: 'p2' }, 0);
            add('Actions (free, no flick)', '🤼 Grapple', { cat: 'dispel', act: 'grapple', target: 'p2' }, 0);
            add('Actions (free, no flick)', '🧘 Meditate (+' + R.meditate + ' mana)', { cat: 'meditate' }, 0);
            for (const sp of st.c.spells) {
              const a = { cat: sp.cat, sig: sp.id, target: 'p2' };
              add('Your cards', sp.name, a, TT.costOf(st, a), sp.text);
            }
            for (const cat of ['damage', 'protect', 'dispel'])
              for (let r = 1; r <= 3; r++) {
                const a = { cat, ring: r, elem: pubElem, target: 'p2' };
                add(
                  'Plain spells (' + ICON[pubElem] + ' ' + up(pubElem) + ')',
                  LEVEL[r - 1] + ' ' + CAT[cat],
                  a,
                  TT.costOf(st, a)
                );
              }
            return { out, elems };
          }
          let pubElem = null;
          function round(news) {
            if (gs.over || gs.round > TT.RULES.maxRounds) {
              finish();
              return;
            }
            const st = gs.p1;
            if (!pubElem || st.c.forbidden.includes(pubElem))
              pubElem = TT.ELEMENTS.find(e => !st.c.forbidden.includes(e));
            const { out, elems } = choices(),
              groups = [...new Set(out.map(c => c.group))];
            box.innerHTML =
              `<div class="st-card pub-table"><div class="st-title">Round ${gs.round}</div>` +
              seatLine('p1', 'You') +
              seatLine('p2', foeName) +
              (news ? `<div class="pub-news">${news}</div>` : '') +
              `<div class="pub-elems">Element: ` +
              elems
                .map(
                  e =>
                    `<button class="ex-btn pub-el${e === pubElem ? ' on' : ''}" data-e="${e}" type="button">${ICON[e]} ${up(e)}</button>`
                )
                .join('') +
              `</div>` +
              groups
                .map(
                  g =>
                    `<div class="pub-group"><small>${esc(g)}</small><div>` +
                    out
                      .map((c, i) =>
                        c.group === g
                          ? `<button class="ex-btn pub-pick" data-i="${i}" type="button"${c.tip ? ' title="' + esc(c.tip) + '"' : ''}${c.ok ? '' : ' disabled'}>${esc(c.label)}${c.cost ? ` <i>${c.cost}✦</i>` : ''}</button>`
                          : ''
                      )
                      .join('') +
                    `</div></div>`
                )
                .join('') +
              `<div class="st-foot"><button class="ex-btn pub-quit" type="button">Concede (lose the stake)</button></div></div>`;
            box.querySelectorAll('.pub-el').forEach(
              b =>
                (b.onclick = () => {
                  pubElem = b.dataset.e;
                  round(news);
                })
            );
            box.querySelector('.pub-quit').onclick = () => close({ won: false });
            box.querySelectorAll('.pub-pick').forEach(
              b =>
                (b.onclick = () => {
                  const c = out[+b.dataset.i];
                  if (!c.ok) return;
                  const flicks =
                    c.a.act || c.a.cat === 'meditate'
                      ? 0
                      : Math.max(1, ((TT.RULES.chances && TT.RULES.chances.budget) || 10) - c.cost);
                  if (!flicks) resolve1(c.a, null);
                  else flick(c, flicks, cast => resolve1(c.a, { cast }));
                })
            );
          }
          // the flick: a marker sweeps over the table; tap while it's over the cup
          function flick(c, n, done) {
            let i = 0,
              raf = 0;
            const draw = () => {
              box.innerHTML =
                `<div class="st-card"><div class="st-title">${esc(c.label)}</div>` +
                `<div class="st-sub">Flick ${i + 1} of ${n}. Tap <b>Flick!</b> when the wink is over the cup.</div>` +
                `<div class="pub-bar"><div class="pub-cup" style="left:${(0.5 - FLICK.zone / 2) * 100}%;width:${FLICK.zone * 100}%"></div><div class="pub-wink"></div></div>` +
                `<div class="st-foot"><button class="ex-btn pub-flick" type="button">Flick!</button></div></div>`;
              const wink = box.querySelector('.pub-wink'),
                t0 = performance.now();
              let pos = 0;
              const step = t => {
                const ph = ((t - t0) / FLICK.sweepMs) % 2;
                pos = ph < 1 ? ph : 2 - ph;
                wink.style.left = pos * 100 + '%';
                raf = requestAnimationFrame(step);
              };
              raf = requestAnimationFrame(step);
              const go = () => {
                cancelAnimationFrame(raf);
                document.removeEventListener('keydown', key);
                const potted = Math.abs(pos - 0.5) <= FLICK.zone / 2;
                box.querySelector('.pub-bar').classList.add(potted ? 'pot' : 'miss');
                setTimeout(
                  () => {
                    if (potted) done(true);
                    else if (++i < n) draw();
                    else done(false);
                  },
                  potted ? 500 : 420
                );
              };
              const key = e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  go();
                }
              };
              document.addEventListener('keydown', key);
              box.querySelector('.pub-flick').onclick = go;
            };
            draw();
          }
          function resolve1(a, given) {
            const before = { p1: { hp: gs.p1.hp, mana: gs.p1.mana }, p2: { hp: gs.p2.hp, mana: gs.p2.mana } },
              logAt = gs.log.length;
            const ai = TT.aiChoose('p2', 'normal');
            TT.playRound({ p1: a, p2: ai }, given ? { p1: given } : undefined);
            gs = TT.state;
            const name = x =>
              x.act
                ? up(x.act)
                : x.cat === 'meditate'
                  ? 'Meditate'
                  : x.cat === 'pass'
                    ? 'Nothing'
                    : x.sig
                      ? (gs.p2.c.spells.concat(gs.p1.c.spells).find(s => s.id === x.sig) || {}).name || x.sig
                      : LEVEL[(x.ring || 1) - 1] + ' ' + (x.elem ? up(x.elem) + ' ' : '') + CAT[x.cat];
            const d = (w, k) => {
              const v = gs[w][k] - before[w][k];
              return v ? (v > 0 ? '+' : '') + v : '±0';
            };
            const lines = gs.log
              .slice(logAt)
              .map(l => l.replace(/^R\d+ /, ''))
              .slice(-4);
            const news =
              `You: ${esc(name(a))}${given ? (given.cast ? ' (potted)' : ' (all flicks missed: fizzled)') : ''}. ${esc(foeName)}: ${esc(name(ai))}.<br>` +
              `You ${d('p1', 'hp')} HP, ${d('p1', 'mana')} mana · ${esc(foeName)} ${d('p2', 'hp')} HP, ${d('p2', 'mana')} mana` +
              (lines.length ? `<br><small>${lines.map(esc).join(' · ')}</small>` : '');
            round(news);
          }
          function finish() {
            const won = gs.over === 'p1',
              draw = !gs.over;
            box.innerHTML =
              `<div class="st-card"><div class="st-title">${won ? 'You win!' : draw ? 'Time, gentlemen!' : esc(foeName) + ' wins'}</div>` +
              `<div class="st-sub">${won ? esc(foeName) + ' pushes the coins across with a sigh. "Beginner\'s luck. Again sometime."' : draw ? 'The landlady calls time. Nobody wins; ' + esc(foeName) + ' keeps the stake, on principle.' : esc(foeName) + ' sweeps the counters back into the cup. "The thumb\'s still good."'}</div>` +
              `<div class="st-foot"><button class="ex-btn pub-ok" type="button">Back to the bar</button></div></div>`;
            box.querySelector('.pub-ok').onclick = () => close({ won });
          }
        })
    );
  }

  window.ExplorePub = { play, FLICK };
})();
