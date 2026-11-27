#!/usr/bin/env node
// The Moriquende year, played by scripted strategies, for tuning js/forest_engine.js.
//   node tools/forest_sim.js [games] [bot,bot,...]
// Bots: idle (does nothing), turtle (everyone stays home), exterminate (hunts down every warren
// and den), balance (watches, guards Sylvara, harries orcs, keeps the wild in check).
// Targets (docs/forest-design.md): idle loses nearly always; exterminate survives but scores worse
// than balance; turtle survives scarred; balance gets "The Wood in Song" about half the time.
'use strict';
const F = require('../js/forest_engine.js');
const games = +process.argv[2] || 200;
const bots = (process.argv[3] || 'idle,turtle,exterminate,balance').split(',');

const free = S => S.elves.filter(e => !e.wounded && e.role !== 'sylvara');
const seen = (S, k) => S.vis[k] === 'clear';
function goToward(S, e, k) {
  if (e.pos === k) return;
  const r = F.reachable(S, e.pos, F.ROLES[e.role].move);
  let best = null,
    bd = 99;
  for (const x in r) {
    const d = F.dist(x, k);
    if (d < bd) {
      bd = d;
      best = x;
    }
  }
  if (best && best !== e.pos) F.move(S, e.id, best);
}
function attackHere(S, e) {
  const t = F.tasksFor(S, e).filter(t => t.t === 'attack');
  // prefer bands over warrens, orcs over the rest
  t.sort((a, b) => rank(S, b) - rank(S, a));
  if (t.length) F.setTask(S, e.id, t[0]);
  return t.length > 0;
}
function rank(S, t) {
  const b = S.bands.find(x => x.id === t.id);
  return b ? (b.fac === 'orc' ? 3 : b.fac === 'gob' ? 2 : 1) : 0;
}

const BOTS = {
  idle() {},
  turtle(S) {
    for (const e of free(S)) if (e.pos !== F.HOME) goToward(S, e, F.HOME);
    if (S.youths) F.train(S, 'talon');
  },
  exterminate(S) {
    // seers spread out; talons and the wizard go after whatever is seen
    const ring = F.nbrs(F.HOME)
      .map(k => {
        const [q, r] = F.unkey(k);
        return F.key(q * 3, r * 3);
      })
      .filter(k => S.hexes[k] && S.hexes[k].t !== 'lake');
    free(S)
      .filter(e => e.role === 'seer')
      .forEach((e, i) => goToward(S, e, ring[i % ring.length]));
    const foes = [...S.warrens.map(w => w.k), ...S.bands.map(b => b.k)].filter(k => seen(S, k) || S.intel[k]);
    for (const e of free(S).filter(e => e.role === 'talon' || e.role === 'wizard')) {
      if (attackHere(S, e)) continue;
      const tgt = foes.sort((a, b) => F.dist(a, e.pos) - F.dist(b, e.pos))[0];
      if (tgt) {
        goToward(S, e, tgt);
        attackHere(S, e);
      }
    }
    for (const k of foes)
      if (!S.spellUsed && seen(S, k) && !F.canCast(S, 'strike', k, 3)) F.cast(S, 'strike', k, 3);
    if (S.youths) F.train(S, 'talon');
  },
  balance(S) {
    const H = S.hexes,
      syl = F.syl(S);
    // builders put sentry posts on a ring at distance 2–3, hills first
    const posts = Object.keys(H).filter(k => H[k].talan && !H[k].build);
    for (const e of free(S).filter(e => e.role === 'guild')) {
      if (e.task && e.task.t === 'talan') continue;
      if (H[e.pos].build) {
        F.setTask(S, e.id, { t: 'talan' });
        continue;
      }
      const want = Object.keys(H)
        .filter(k => {
          const d = F.dist(k, F.HOME);
          return (
            d >= 2 &&
            d <= 3 &&
            !H[k].talan &&
            H[k].t !== 'lake' &&
            !H[k].hamlet &&
            posts.every(p => F.dist(p, k) >= 3)
          );
        })
        .sort((a, b) => (H[b].t === 'hill') - (H[a].t === 'hill') || F.dist(a, e.pos) - F.dist(b, e.pos));
      if (want[0]) {
        goToward(S, e, want[0]);
        if (e.pos === want[0]) F.setTask(S, e.id, { t: 'talan' });
      }
    }
    // seers: one on each sentry post, then one by Sylvara's next tree, then spread
    const seers = free(S).filter(e => e.role === 'seer');
    const taken = new Set();
    const spots = posts.filter(k => k !== F.HOME);
    const nextTree = S.trees
      .filter(t => !t.done && !t.dead)
      .sort((a, b) => F.dist(a.k, syl.pos) - F.dist(b.k, syl.pos))[0];
    if (nextTree) spots.push(nextTree.k);
    const orcs = S.bands.filter(b => b.fac === 'orc');
    orcs.forEach(o => spots.push(o.k));
    for (const k of spots) {
      const e = seers.filter(x => !taken.has(x.id)).sort((a, b) => F.dist(a.pos, k) - F.dist(b.pos, k))[0];
      if (!e) break;
      taken.add(e.id);
      goToward(S, e, k);
    }
    // talons: two escort Sylvara, the rest harry orcs or meet raids
    const talons = free(S).filter(e => e.role === 'talon');
    const wizard = F.wiz(S);
    const raids = S.bands.filter(
      b =>
        (b.fac === 'gob' && b.goal && b.goal.kind === 'raid') ||
        (b.fac === 'varg' && b.goal && b.goal.kind === 'raid')
    );
    talons.forEach((e, i) => {
      if (attackHere(S, e) && S.bands.some(b => b.k === e.pos && b.fac !== 'varg')) return;
      if (i < 2 && !syl.wounded) {
        goToward(S, e, syl.pos);
        return;
      }
      const o = orcs
        .filter(o => o.state !== 'leave')
        .sort((a, b) => F.dist(a.k, e.pos) - F.dist(b.k, e.pos))[0];
      if (o) {
        const adj = F.nbrs(o.k)
          .filter(k => S.hexes[k] && S.hexes[k].t !== 'lake')
          .sort((a, b) => F.dist(a, e.pos) - F.dist(b, e.pos))[0];
        goToward(S, e, o.state === 'march' ? o.k : adj);
        if (e.pos === o.k) attackHere(S, e);
        return;
      }
      const r = raids.sort((a, b) => F.dist(a.k, e.pos) - F.dist(b.k, e.pos))[0];
      if (r) {
        goToward(S, e, r.k);
        attackHere(S, e);
        return;
      }
      const h = S.herds.filter(h => h.n >= 3).sort((a, b) => F.dist(a.k, e.pos) - F.dist(b.k, e.pos))[0];
      if (S.food < 20 && h) {
        goToward(S, e, h.k);
        if (e.pos === h.k) F.setTask(S, e.id, { t: 'hunt' });
      }
    });
    // the wizard goes after the biggest orc band
    if (wizard && !wizard.wounded) {
      const o = orcs.filter(o => o.state !== 'leave').sort((a, b) => F.bandPower(b) - F.bandPower(a))[0];
      if (o) {
        goToward(S, wizard, o.k);
        if (wizard.pos === o.k) attackHere(S, wizard);
      } else if (!syl.wounded) goToward(S, wizard, syl.pos);
    }
    // spells: break a totem, strike orcs, ward Sylvara
    for (const o of orcs)
      if (!S.spellUsed && o.totem && !F.canCast(S, 'dispel', o.k)) F.cast(S, 'dispel', o.k);
    for (const o of orcs.sort((a, b) => F.bandPower(b) - F.bandPower(a)))
      if (!S.spellUsed && !F.canCast(S, 'strike', o.k, 3)) F.cast(S, 'strike', o.k, 3);
    const danger = S.bands.some(b => b.fac !== 'varg' && F.dist(b.k, syl.pos) <= 2);
    if (danger && !S.spellUsed && !F.canCast(S, 'ward', syl.pos)) F.cast(S, 'ward', syl.pos);
    for (const w of S.warrens)
      if (!S.spellUsed && w.fetish && !F.canCast(S, 'dispel', w.k)) F.cast(S, 'dispel', w.k);
    // beast-speakers calm hungry Varg; lead herds toward big warrens
    for (const e of free(S).filter(e => e.role === 'charm')) {
      const v = S.bands
        .filter(b => b.fac === 'varg' && b.hunger >= 3 && !b.calm)
        .sort((a, b) => F.dist(a.k, e.pos) - F.dist(b.k, e.pos))[0];
      if (v) {
        goToward(S, e, v.k);
        const t = F.tasksFor(S, e).find(t => t.t === 'calm');
        if (t) {
          F.setTask(S, e.id, t);
          continue;
        }
      }
    }
    if (S.youths) F.train(S, free(S).filter(e => e.role === 'seer').length < 6 ? 'seer' : 'talon');
  }
};

function play(bot, seed) {
  const S = F.newYear({ seed });
  S.hints = false;
  let sylHurt = 0,
    cov = 0,
    covAll = 0;
  while (!S.over) {
    BOTS[bot](S);
    const s = F.syl(S);
    const w = s.wounded;
    cov += F.coverage(S);
    covAll += F.coverage(S, true);
    F.endTurn(S);
    if (!w && s.wounded) sylHurt++;
  }
  const sc = F.score(S);
  return {
    ...sc,
    turn: S.turn,
    cover: cov / S.turn,
    coverAll: covAll / S.turn,
    sylHurt,
    warrens: S.warrens.length,
    varg: S.bands.filter(b => b.fac === 'varg').length,
    game: F.gameTotal(S),
    felled: Object.values(S.hexes).filter(h => h.felled || h.burnt).length,
    elves: S.elves.length,
    food: S.food
  };
}

for (const bot of bots) {
  const R = [];
  for (let i = 0; i < games; i++) R.push(play(bot, 1000 + i));
  const n = R.length,
    avg = f => R.reduce((s, r) => s + f(r), 0) / n;
  const end = {};
  R.forEach(r => (end[r.ending] = (end[r.ending] || 0) + 1));
  const fell = R.filter(r => r.ending === 'fallen');
  console.log(
    `${bot.padEnd(12)} ${Object.entries(end)
      .map(([k, v]) => k + ' ' + ((100 * v) / n).toFixed(0) + '%')
      .join('  ')}` +
      `\n   score ${avg(r => r.pts).toFixed(0)}  wood ${avg(r => r.wood).toFixed(0)}  trees ${avg(r => r.trees).toFixed(1)}  bal ${avg(r => r.bal).toFixed(0)}%  lost ${avg(r => r.lost).toFixed(1)}  syl hurt ${avg(r => r.sylHurt).toFixed(1)}` +
      `  felled ${avg(r => r.felled).toFixed(1)}  warrens ${avg(r => r.warrens).toFixed(1)}  varg ${avg(r => r.varg).toFixed(1)}  game ${avg(r => r.game).toFixed(0)}  food ${avg(r => r.food).toFixed(0)}  seen ${(100 * avg(r => r.cover)).toFixed(0)}% clear / ${(100 * avg(r => r.coverAll)).toFixed(0)}% at all` +
      (fell.length
        ? `  falls in week ${(fell.reduce((s, r) => s + r.turn, 0) / fell.length).toFixed(1)}`
        : '')
  );
}
