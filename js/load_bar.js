// ── LoadBar: an honest loading bar (Explore's #exl-fill) ──────────────────────────────────────────
// The bar follows the work really done, not a timer. A load is planned as stages, run one after
// another, each with an estimate of its size in bytes (begin(fill, ests), next(est) to move on and
// refine the next one's estimate). Inside a stage the bar moves with the bytes downloaded so far:
// image() streams a picture with fetch, so a big sheet moves the bar as it arrives, json() counts a
// data file, and step(w) counts work that isn't a download (painting a figure) as w bytes' worth.
// A stage's share is got / max(estimate, what its downloads turned out to be), so a stage that's
// smaller than its estimate jumps ahead at its end rather than stalling. The drawn bar eases toward
// the true figure and never goes backwards. Loaders that aren't inside a load (prefetching) work
// the same; their bytes simply count toward nothing.
window.LoadBar = (function(){
  const recs = {};                       // src → {got, total} of a streamed picture, shared by every caller
  let on = false, fill = null, stages = [], cur = -1, shown = 0, raf = 0, last = 0;

  function addItem(it){ if(on && stages[cur]) stages[cur].items.push(it); return it; }
  function target(){
    let tot = 0, done = 0;
    stages.forEach((s, i) => {
      tot += s.est;
      if(i < cur) done += s.est;
      else if(i === cur){
        let g = 0, t = 0;
        for(const it of s.items){ const T = it.total() || it.est; g += Math.min(it.got(), T); t += T; }
        done += s.est * Math.min(1, g / Math.max(s.est, t, 1));
      }
    });
    return tot ? Math.min(1, done / tot) : 0;
  }
  function paint(){ if(fill) fill.style.width = (shown * 100).toFixed(2) + '%'; }
  function tick(now){
    raf = 0; if(!on) return;
    const dt = Math.min(100, now - (last || now)); last = now;
    const t = target();
    if(t > shown) shown += (t - shown) * (1 - Math.exp(-dt / 140));   // ease in, never back
    paint();
    raf = requestAnimationFrame(tick);
  }

  // a picture, streamed so its bytes count as they arrive; falls back to a plain <img> load
  function plain(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src; }); }
  function image(src, est){
    est = est || 400000;
    if(/^(data|blob):/.test(src)) return plain(src);
    let r = recs[src];
    if(!r){
      r = recs[src] = {got:0, total:0};
      r.p = fetch(src).then(async resp => {
        if(!resp.ok) throw new Error('image ' + src);
        r.total = +resp.headers.get('content-length') || 0;
        let blob;
        if(resp.body && r.total){
          const rd = resp.body.getReader(), parts = [];
          for(;;){ const {done, value} = await rd.read(); if(done) break; parts.push(value); r.got += value.length; }
          blob = new Blob(parts, {type: resp.headers.get('content-type') || ''});
        } else blob = await resp.blob();
        r.got = r.total = Math.max(r.total, blob.size, 1);
        const url = URL.createObjectURL(blob), img = new Image();
        img.src = url;
        try{ await img.decode(); } finally { URL.revokeObjectURL(url); }
        return img;
      }).catch(() => plain(src)).then(img => { r.got = r.total = r.total || est; r.ok = true; return img; });
    }
    if(!r.ok) addItem({est, got:() => r.got, total:() => r.total});
    return r.p;
  }
  // a data file: counted when it lands (they're small)
  function json(url, opts, est){
    const it = addItem({est: est || 20000, g:0, got(){ return this.g; }, total(){ return 0; }});
    return fetch(url, opts).then(r => { if(!r.ok) throw new Error(url); return r.json(); }).finally(() => { it.g = it.est; });
  }
  // work that isn't a download, worth w bytes; returns done()
  function step(w){
    const it = addItem({est: w, g:0, got(){ return this.g; }, total(){ return 0; }});
    return () => { it.g = w; };
  }
  function begin(el, ests){
    on = true; fill = el; stages = (ests || [1]).map(e => ({est: Math.max(1, e), items: []})); cur = 0; shown = 0; last = 0;
    if(fill){ fill.style.transition = 'none'; paint(); }
    if(!raf) raf = requestAnimationFrame(tick);
  }
  // move on to the next stage (a stage can be skipped by calling it again); est refines its estimate
  function next(est){
    if(!on) return;
    if(cur < stages.length - 1) cur++; else stages.push({est: 1, items: []}), cur = stages.length - 1;
    if(est != null) stages[cur].est = Math.max(1, est);
  }
  // the work's done: run the bar to the end, quickly
  function finish(ms){
    if(!on) return Promise.resolve();
    cur = stages.length;
    const from = Math.max(shown, target()), t0 = performance.now(); ms = ms || 160;
    on = false; cancelAnimationFrame(raf); raf = 0;
    return new Promise(res => { const f = now => { const k = Math.min(1, (now - t0) / ms); shown = from + (1 - from) * k; paint(); if(k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  }
  function stop(){ on = false; cancelAnimationFrame(raf); raf = 0; }
  return {image, json, step, begin, next, finish, stop, get active(){ return on; }, get value(){ return shown; }};
})();
