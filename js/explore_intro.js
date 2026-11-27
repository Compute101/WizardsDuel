// ═══ EXPLORE: THE INTRODUCTION SCROLL ═════════════════════════════════
// Shown once, after you make your wizard for a new game: what happened to Corvanthe, why
// quintessence (spill) matters, how the University's Finders found you, and what to do first
// (matriculate: the Senior Tutor in Founders' Quad). Parts of it follow your wizard: your
// element (the sign the Finder heard about) and your age (young, middle-aged or old).
// ExploreIntro.play(root, hero) → Promise, resolved when the player taps Begin or Skip.
// The parchment rolls up by itself (SPEED px/s); touching, dragging or the wheel takes over
// for PAUSE_MS, and prefers-reduced-motion leaves it still. Styles: "Explore: introduction" in css/style.css.
(function () {
  'use strict';

  const SPEED = 26; // px a second the scroll rolls up by itself
  const PAUSE_MS = 4000; // after the player scrolls it by hand

  // the sign of the gift, by element: what the Finder heard about in your village
  const OMENS = {
    fire: 'the hearth fire that leaned towards you whenever you came in, and once burned all night on no wood at all',
    air: 'the washing that lifted on the line when there was no wind, and the doors that swung open before you reached them',
    lightning:
      'the sparks that jumped from your fingers in dry weather, and the storms you could feel coming a day before anyone else',
    arcane:
      'the lamps that burned brighter when you read beside them, and the locks that sometimes simply forgot to be locked',
    water: 'the well whose water rose to meet your bucket, and the rain that seemed to follow you home',
    earth:
      'the fields where the plough never turned up a stone once you had walked them, and the old wall that held when the flood came',
    ice: 'the frost that drew ferns on the window wherever you breathed, even at midsummer',
    dark: 'the shadows that stayed behind a moment after you left a room, and the dogs that would not bark at you at night'
  };

  // the Finder and your age: anyone can begin, and magic keeps its own time
  const AGES = {
    young: [
      'You were young, younger than most who are sent, and you said so. The Finder only nodded. “Good. You have less to unlearn.”'
    ],
    middle: [
      'You had a life already: a trade, a roof, and more years behind you than you cared to count. You said it was surely too late.',
      '“Magic doesn’t care when you begin,” said the Finder. “Only that you do. Half the Fellows at Wrenford came to it later than you.”'
    ],
    old: [
      'You have seen a good many winters, and you said that a gift found this late was a gift wasted. The Finder only smiled.',
      '“Magic keeps its own time. Those who use it outlive the rest of us by a long way: the Masters at Wrenford were old when my grandmother was a girl, and they’ll see me buried. You have years enough. More than you think.”'
    ]
  };

  // ── ink drawings ──────────────────────────────────────────────────────
  // One line drawing a section, in sepia ink with a hand-drawn wobble (the shared #xi-wobble
  // filter). Each stroke draws itself in (pathLength 1, dashoffset 1 → 0) when the drawing
  // scrolls into view, one after another; dark fills and hatching fade in after the lines.
  // A drawing is a viewBox and a list of [kind, attrs] (kind: 'p' path, 'c' circle, 'e' ellipse;
  // cls 'f' = solid ink fill, 'h' = hatched, 'w' = thin, 'g' = a glint that twinkles).
  const rays = (cx, cy, r0, r1, n, jag) =>
    Array.from({ length: n }, (_, i) => {
      const a = -Math.PI + ((i + 0.5) * Math.PI) / n,
        m = (r0 + r1) / 2,
        j = (i % 2 ? 1 : -1) * jag;
      const P = (r, o) => (cx + Math.cos(a + o) * r).toFixed(1) + ' ' + (cy + Math.sin(a + o) * r).toFixed(1);
      return ['p', { d: 'M' + P(r0, 0) + ' L' + P(m, j / m) + ' L' + P(r1 - (i % 3) * 8, 0) }];
    });
  const glint = (x, y, r) => ['p', { d: `M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}`, cls: 'g' }];
  const INK = {
    // Corvanthe's spires, and the Wound bursting open at its heart; the right side falling
    city: {
      vb: '0 0 600 210',
      items: [
        ['p', { d: 'M10 188 Q160 182 300 186 T590 188' }],
        ['p', { d: 'M48 186 V112 L60 74 L72 112 V186 M54 130 V140 M66 130 V140 M60 74 V62' }],
        [
          'p',
          { d: 'M80 186 V142 H140 V186 M76 142 L110 118 L144 142 M92 158 v12 M108 158 v12 M124 158 v12' }
        ],
        ['p', { d: 'M150 186 V150 H204 V186 M150 150 Q177 106 204 150 M177 122 V108 M172 112 H182' }],
        ['p', { d: 'M214 186 V92 L227 44 L240 92 V186 M227 44 V30 M221 110 v14 M233 110 v14' }],
        ['c', { cx: 300, cy: 150, r: 14, cls: 'f' }],
        ['c', { cx: 300, cy: 150, r: 24 }],
        ...rays(300, 150, 32, 70, 13, 9),
        [
          'p',
          {
            d: 'M300 186 L288 194 L276 191 L262 199 M300 186 L314 196 L330 193 L344 201 M300 186 L302 200',
            cls: 'w'
          }
        ],
        ['p', { d: 'M358 186 L362 108 L377 80 L384 92 L390 84 L392 110 L388 186 M370 128 v12 M381 128 v12' }],
        [
          'p',
          { d: 'M400 186 V150 H426 L432 160 L440 148 H462 V186 M396 150 L414 136 L420 142 M440 148 L452 138' }
        ],
        ['p', { d: 'M476 186 L480 98 L497 62 L508 100 L504 186 M490 116 v12' }],
        ['p', { d: 'M520 186 V160 H566 V186 M516 160 L541 142 L570 160 M536 170 h8 v16' }],
        [
          'p',
          {
            d: 'M392 186 l6 -6 l7 4 l-3 6 Z M466 186 l5 -8 l9 3 l-2 6 Z M350 186 l4 -5 l6 2 l0 4 Z',
            cls: 'h'
          }
        ],
        glint(256, 96, 5),
        glint(344, 92, 4),
        glint(318, 70, 3),
        glint(280, 66, 3)
      ]
    },
    // quintessence on the scales, outweighing a heap of gold
    scales: {
      vb: '0 0 600 200',
      items: [
        ['p', { d: 'M300 46 V172 M262 186 H338 L326 172 H274 Z' }],
        ['c', { cx: 300, cy: 58, r: 5, cls: 'f' }],
        ['p', { d: 'M198 72 L402 46' }],
        ['p', { d: 'M198 72 L172 124 M198 72 L224 124 M402 46 L376 98 M402 46 L428 98', cls: 'w' }],
        ['p', { d: 'M166 124 Q198 144 230 124 Z M370 98 Q402 118 434 98 Z' }],
        ['p', { d: 'M188 126 L190 96 L199 82 L208 96 L211 126 M199 82 V126 M190 96 L199 104 L208 96' }],
        ['p', { d: 'M210 126 L216 106 L224 102 L226 126 M216 106 L222 112 L224 102', cls: 'w' }],
        ['e', { cx: 392, cy: 98, rx: 10, ry: 3 }],
        ['e', { cx: 410, cy: 97, rx: 10, ry: 3 }],
        ['e', { cx: 401, cy: 93, rx: 10, ry: 3 }],
        ['e', { cx: 399, cy: 88, rx: 9, ry: 3 }],
        glint(178, 86, 5),
        glint(222, 80, 4),
        glint(200, 64, 3),
        ['p', { d: 'M270 186 l-10 -2 M330 186 l10 -2', cls: 'w' }]
      ]
    },
    // a hooded Finder with a lantern, on the road above your village
    finder: {
      vb: '0 0 600 210',
      items: [
        ['p', { d: 'M20 182 Q300 176 580 182' }],
        ['p', { d: 'M232 206 L282 182 M370 206 L318 182', cls: 'w' }],
        [
          'p',
          {
            d: 'M70 182 V160 H96 V182 M66 160 L83 146 L100 160 M104 182 V164 H124 V182 M100 164 L114 152 L128 164 M134 182 V150 L142 128 L150 150 V182 M142 128 V118 M138 122 H146 M156 182 V166 H178 V182 M152 166 L167 154 L182 166'
          }
        ],
        [
          'p',
          {
            d: 'M300 46 C290 52 282 62 282 76 C282 86 284 92 278 100 C270 112 266 140 258 180 L342 180 C334 140 330 112 322 100 C316 92 318 86 318 76 C318 62 310 52 300 46 Z'
          }
        ],
        ['p', { d: 'M290 74 Q300 63 310 74 Q310 89 300 93 Q290 89 290 74 Z', cls: 'f' }],
        [
          'p',
          { d: 'M300 102 Q297 140 291 178 M313 110 Q318 142 322 178 M284 118 Q280 150 272 178', cls: 'w' }
        ],
        ['p', { d: 'M318 104 Q332 110 346 102' }],
        ['c', { cx: 348, cy: 101, r: 3.5 }],
        ['p', { d: 'M346 40 L356 184 M346 40 q4 -12 14 -8 q6 4 0 12' }],
        ['p', { d: 'M360 44 V56 M352 58 H368 L366 78 H354 Z M354 58 Q360 51 366 58 M352 78 H368' }],
        ['c', { cx: 360, cy: 68, r: 3, cls: 'f' }],
        ['p', { d: 'M374 68 h10 M372 56 l8 -6 M372 80 l8 6 M346 70 h-6', cls: 'w' }],
        [
          'p',
          {
            d: 'M440 182 V150 M434 150 a12 14 0 1 1 12 0 M470 182 V156 M465 156 a10 12 0 1 1 10 0 M500 182 V146 M494 146 a13 16 0 1 1 12 0'
          }
        ],
        ['p', { d: 'M520 34 A16 16 0 1 0 536 56 A12 12 0 1 1 520 34 Z', cls: 'h' }],
        glint(470, 40, 3),
        glint(420, 62, 2),
        glint(560, 80, 2)
      ]
    },
    // Wrenford: a college gate tower over the bridge, and a wren
    wrenford: {
      vb: '0 0 600 236',
      items: [
        ['p', { d: 'M232 150 V78 H368 V150' }],
        [
          'p',
          {
            d: 'M232 78 V66 H246 V78 H260 V66 H274 V78 H288 V66 H302 V78 H316 V66 H330 V78 H344 V66 H358 V66 V78 M358 66 H368 V78'
          }
        ],
        ['p', { d: 'M284 150 V116 Q300 96 316 116 V150', cls: 'h' }],
        ['p', { d: 'M256 98 v14 M344 98 v14 M296 84 h8 v8 h-8 Z' }],
        ['p', { d: 'M214 150 V60 H232 M368 60 H386 V150 M211 60 L223 34 L235 60 M365 60 L377 34 L389 60' }],
        ['p', { d: 'M60 150 Q140 144 214 150 M386 150 Q470 146 560 150' }],
        [
          'p',
          {
            d: 'M90 150 V124 M82 126 a10 13 0 1 1 16 0 M150 150 V128 M143 130 a9 11 0 1 1 14 0 M470 150 V122 M462 124 a10 13 0 1 1 16 0 M520 150 V130 M514 132 a8 10 0 1 1 12 0'
          }
        ],
        ['p', { d: 'M40 164 H560 M40 172 H560 M40 164 V172 M560 164 V172' }],
        [
          'p',
          {
            d: 'M60 214 Q115 176 170 214 M180 214 Q235 176 290 214 M300 214 Q355 176 410 214 M420 214 Q475 176 530 214 M170 214 V172 M180 214 V172 M290 214 V172 M300 214 V172 M410 214 V172 M420 214 V172'
          }
        ],
        [
          'p',
          {
            d: 'M30 218 H570 M70 225 q20 -4 40 0 t40 0 M200 228 q20 -4 40 0 t40 0 M330 225 q20 -4 40 0 t40 0 M450 228 q20 -4 40 0 t40 0',
            cls: 'w'
          }
        ],
        [
          'p',
          {
            d: 'M140 164 l3 -12 l3 12 M143 152 v-10 M139 146 l4 -3 l4 3 M143 142 a3 3 0 1 1 0 -6 a3 3 0 1 1 0 6 M149 136 L151 164',
            cls: 'w'
          }
        ],
        ['p', { d: 'M452 58 q8 -8 16 -2 q6 -10 16 -6 q-8 2 -10 8 q-6 6 -22 0 Z M484 50 l8 -4', cls: 'f' }]
      ]
    }
  };
  function inkSvg(id) {
    const D = INK[id];
    if (!D) return '';
    let n = 0;
    const items = D.items
      .map(([k, a]) => {
        const attrs = Object.entries(a)
          .filter(([x]) => x !== 'cls')
          .map(([x, v]) => x + '="' + v + '"')
          .join(' ');
        const tag = k === 'c' ? 'circle' : k === 'e' ? 'ellipse' : 'path',
          i = n++;
        return (
          '<' + tag + ' ' + attrs + ' pathLength="1" class="' + (a.cls || '') + '" style="--i:' + i + '"/>'
        );
      })
      .join('');
    return (
      '<div class="xi-ink" aria-hidden="true"><svg viewBox="' +
      D.vb +
      '" preserveAspectRatio="xMidYMid meet"><g filter="url(#xi-wobble)">' +
      items +
      '</g></svg></div>'
    );
  }
  const INK_DEFS =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<filter id="xi-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>' +
    '<feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>' +
    '<pattern id="xi-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="5" stroke="#3a2410" stroke-width="1.1"/></pattern>' +
    '</defs></svg>';

  const esc = t =>
    String(t == null ? '' : t).replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
    );

  function text(hero) {
    const H = window.ExploreHero,
      el = (H && H.ELEMS.find(e => e.id === hero.elem)) || { name: 'magic', col: '#c9a84c' };
    const name = esc(hero.name || 'Wizard'),
      ages = AGES[hero.age] || AGES.young,
      omen = OMENS[hero.elem] || OMENS.arcane;
    const P = t => '<p>' + t + '</p>';
    return (
      inkSvg('city') +
      '<h2>The Unweaving</h2>' +
      P(
        'For seven hundred years <b>Corvanthe</b> was the greatest seat of learning in the world: a city of spires and lecture halls, held together by a Great Weave of magic older than its walls.'
      ) +
      P(
        'Fifteen years ago, in its last year, a curse lay on the city. Its Council found, in the oldest of its books, a Word that would unpick the curse, and voted seven to one to speak it. Only Magister Orrin voted no. “You do not know what it will unweave,” he said.'
      ) +
      P(
        "On Midsummer's Eve, at the hour of lowest tide, beneath the Collegium, the Archmage spoke the Unweaving Word. <i>The Word did not know where to stop.</i>"
      ) +
      P(
        'In one bright hour the Weave came apart. The heart of the city became <b>the Wound</b>. Its eight districts burned and froze, flooded and fell, each soaked through with a single element. And the people of Corvanthe, scholars and bakers, lamplighters and children, were remade as <b>Echoes</b>: shapes of living fire and stone and storm that still walk the streets they knew, and cannot die. Break one and it gathers itself again at the Wound, and walks home.'
      ) +
      inkSvg('scales') +
      '<h2>Quintessence</h2>' +
      P(
        'What an Echo leaves behind when it breaks is <b>quintessence</b>: elemental matter in its rawest form. Cinderglass and rimeheart, stormglass and nightglass. On the street they call it <b>spill</b>.'
      ) +
      P(
        'Every potion-maker, enchanter and spellwright in the world wants it, it is worth more than its weight in gold, and there is only one place it comes from.'
      ) +
      P(
        'So the gleaner crews came, to hunt the Echoes for their spill. Most were sellswords, and most of them did not come back. It soon became plain that the ruins favour those with a gift for magic, and the training to use it: a little talent, well taught, could walk where soldiers died. Every mage who could be found was suddenly in demand.'
      ) +
      inkSvg('finder') +
      '<h2>The Finder</h2>' +
      P(
        'So the University sent out its <b>Finders</b>: quiet men and women with an eye for the gift, who travel the market towns and listen for the stories nobody else believes.'
      ) +
      P(
        'In your village the story was about you: <span class="xi-omen" style="--xc:' +
          el.col +
          '">' +
          omen +
          '</span>. A Finder heard it, came to see, and stayed watching a while longer than was polite. There was a gift in you, a small one, with the colour of <b class="xi-omen" style="--xc:' +
          el.col +
          '">' +
          esc(el.name) +
          '</b> in it.'
      ) +
      ages.map(P).join('') +
      P(
        'The Finder wrote you a letter of introduction to the University of <b>Wrenford</b>, founded twelve years ago by the scholars of Corvanthe who were away on the day of the Unweaving, and who swore that nothing like it would ever be done again.'
      ) +
      inkSvg('wrenford') +
      '<h2>Wrenford</h2>' +
      P(
        'Now, after many days on the road, you stand at the edge of Wrenford with the letter in your hand, <b>' +
          name +
          '</b>. Before anyone will let you near Corvanthe, you must <b>matriculate</b>: be enrolled, tested, and taught the first things every mage must know.'
      ) +
      '<div class="xi-goal"><b>Your first task</b>Report to the Senior Tutor, <b>Dr Penhallow</b>, in <b>Founders’ Quad</b>. The Head Porter by the Lodge will point the way. And keep off the grass.</div>' +
      '<div class="xi-help"><span>Tap or click where you want to walk (or WASD / arrows)</span><span>Walk up to people and things, then tap the action button (or E) to talk or look</span><span>🎒 Your satchel holds your journal, tasks and what you carry</span></div>'
    );
  }

  function play(root, hero) {
    return new Promise(resolve => {
      const box = document.createElement('div');
      box.className = 'xi';
      box.innerHTML =
        '<div class="xi-scroll"><div class="xi-roll xi-roll-top"></div>' +
        '<div class="xi-page" tabindex="0">' +
        INK_DEFS +
        '<div class="xi-text"><div class="xi-pad"></div>' +
        text(hero) +
        '<div class="xi-end"></div></div></div>' +
        '<div class="xi-roll xi-roll-bot"></div></div>' +
        '<div class="xi-foot"><button type="button" class="ex-btn xi-skip">Skip ▸</button><button type="button" class="ex-btn xi-go">Enter Wrenford</button></div>';
      root.appendChild(box);
      const page = box.querySelector('.xi-page'),
        go = box.querySelector('.xi-go');
      let held = 0,
        last = performance.now(),
        done = false,
        acc = 0;
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // each drawing inks itself in as it comes into view
      const inks = [...box.querySelectorAll('.xi-ink')];
      if (still || !('IntersectionObserver' in window)) inks.forEach(d => d.classList.add('drawn'));
      else {
        const io = new IntersectionObserver(
          es =>
            es.forEach(e => {
              if (e.isIntersecting) {
                e.target.classList.add('drawn');
                io.unobserve(e.target);
              }
            }),
          { root: page, threshold: 0.35 }
        );
        inks.forEach(d => io.observe(d));
      }
      const hold = () => {
        held = performance.now() + PAUSE_MS;
      };
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(ev =>
        page.addEventListener(ev, hold, { passive: true })
      );
      function tick(now) {
        if (done) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const end = page.scrollHeight - page.clientHeight;
        if (!still && now > held && page.scrollTop < end - 1) {
          acc += SPEED * dt;
          const s = Math.floor(acc);
          if (s) {
            acc -= s;
            page.scrollTop += s;
          }
        }
        if (page.scrollTop >= end - 40) go.classList.add('ready');
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      const finish = () => {
        if (done) return;
        done = true;
        box.classList.add('leaving');
        setTimeout(() => {
          box.remove();
          resolve();
        }, 450);
      };
      box.querySelector('.xi-skip').addEventListener('click', finish);
      go.addEventListener('click', finish);
      setTimeout(() => {
        try {
          page.focus({ preventScroll: true });
        } catch (e) {}
      }, 50);
    });
  }

  window.ExploreIntro = { play, text, OMENS, AGES, INK, inkSvg };
})();
