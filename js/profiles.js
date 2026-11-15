// ── PLAYER PROFILES ────────────────────────────────────────
// Named player profiles saved on this device (localStorage 'wd-profiles'): win rates, who you've
// beaten, favourite wizards, rank/XP progression and recent matches. game.js reports results through
// Profiles.record*() and maps seats to profiles with Profiles.seats; training and the balance sim never record.
// Uses game.js globals (CHAR_DEFS, SURVIVAL_WAVES) only at call time, so it can load before game.js.
const Profiles=(()=>{
  const KEY='wd-profiles', HISTORY=25, NAME_MAX=16;
  // XP for a result, and the ranks it climbs through
  const XP={win:100, draw:40, loss:25, newFoe:50, arcadeStage:15, arcadeClear:300, encounterWin:60, survivalWave:20};
  const RANKS=[
    {xp:0,     name:'Novice',         ico:'🕯'},
    {xp:300,   name:'Apprentice',     ico:'📜'},
    {xp:800,   name:'Initiate',       ico:'🔮'},
    {xp:1600,  name:'Adept',          ico:'✨'},
    {xp:3000,  name:'Magus',          ico:'🌙'},
    {xp:5000,  name:'Sorcerer',       ico:'🔥'},
    {xp:8000,  name:'Archmage',       ico:'⚡'},
    {xp:12000, name:'Grand Archmage', ico:'👑'},
  ];
  const MODE_NAMES={arcade:'Arcade', versus:'2 Player', multi:'3–4 Wizards', encounter:'Survival', duel:'Duel'};

  let db={v:1, active:null, list:{}};
  try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.list) db=d; }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(db)); }catch(e){} }

  const rec=()=>({g:0,w:0,l:0,d:0});
  function blank(name){
    return {id:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), name, created:Date.now(), lastPlayed:null,
      xp:0, games:0, wins:0, losses:0, draws:0, rounds:0, streak:0, bestStreak:0,
      modes:{}, played:{}, vsChar:{}, vsPlayer:{}, bands:{}, arcade:{runs:0, clears:0, best:0, clearedWith:{}}, history:[]};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanName=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,NAME_MAX);
  const byName=n=>Object.values(db.list).find(p=>p.name.toLowerCase()===n.toLowerCase());

  function rankOf(xp){
    let i=0; while(i+1<RANKS.length&&xp>=RANKS[i+1].xp) i++;
    const r=RANKS[i], next=RANKS[i+1];
    return {i, name:r.name, ico:r.ico, next, pct:next?(xp-r.xp)/(next.xp-r.xp):1};
  }
  const pct=r=>r.g?Math.round(100*r.w/r.g):0;
  const charName=k=>(typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS[k]&&CHAR_DEFS[k].name)||k;
  const charCol=k=>(typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS[k]&&CHAR_DEFS[k].col)||'#f0cc6a';
  const isChar=k=>typeof CHAR_DEFS!=='undefined'&&!!CHAR_DEFS[k];

  // ── Profile management ──
  function create(name){
    name=cleanName(name);
    if(!name) return {error:'Enter a name.'};
    if(byName(name)) return {error:'That name is taken.'};
    const p=blank(name); db.list[p.id]=p; save();
    return {profile:p};
  }
  function rename(id,name){
    name=cleanName(name); const p=db.list[id];
    if(!p||!name) return {error:'Enter a name.'};
    const o=byName(name); if(o&&o.id!==id) return {error:'That name is taken.'};
    p.name=name; save(); return {profile:p};
  }
  function remove(id){
    delete db.list[id];
    Object.values(db.list).forEach(p=>delete p.vsPlayer[id]);
    if(db.active===id) db.active=null;
    try{ localStorage.removeItem('wd-explore-save:'+id); }catch(e){}   // their Explore game goes with them
    save();
  }
  function setActive(id){ db.active=id&&db.list[id]?id:null; db.asked=true; save(); refreshChip(); }
  const active=()=>db.list[db.active]||null;
  const get=id=>db.list[id]||null;
  const all=()=>Object.values(db.list).sort((a,b)=>(b.lastPlayed||b.created)-(a.lastPlayed||a.created));

  // Seat → profile id for the match being played ({p1:id, p2:id|null, …}); null seats are guests or AI
  let seats={};
  function setSeats(map){ seats=Object.assign({},map); }
  function nameOf(who){ const p=db.list[seats[who]]; return p?p.name:null; }

  // ── Recording ──
  function bump(r,result){ r.g++; r[result==='win'?'w':result==='loss'?'l':'d']++; }
  // One finished game for one profile. o: {mode, char, result:'win'|'loss'|'draw', rounds,
  //   foes:[{char, pid}] (who they fought; a foe beaten when result is 'win'), place, band, arcadeStage, arcadeClear}
  // Returns what changed, for the end-of-game summary.
  function recordGame(pid,o){
    const p=db.list[pid]; if(!p) return null;
    const before=rankOf(p.xp);
    let xp=XP[o.result]||0;
    const newFoes=[];
    p.games++; p.rounds+=o.rounds||0; p.lastPlayed=Date.now();
    if(o.result==='win'){ p.wins++; p.streak=p.streak>0?p.streak+1:1; p.bestStreak=Math.max(p.bestStreak,p.streak); }
    else if(o.result==='loss'){ p.losses++; p.streak=0; }
    else p.draws++;
    bump(p.modes[o.mode]=p.modes[o.mode]||rec(),o.result);
    if(o.char) bump(p.played[o.char]=p.played[o.char]||rec(),o.result);
    (o.foes||[]).forEach(f=>{
      if(f.char&&isChar(f.char)){
        const v=p.vsChar[f.char]=p.vsChar[f.char]||rec();
        if(o.result==='win'&&!v.w){ newFoes.push(f.char); xp+=XP.newFoe; }
        bump(v,o.result);
      }
      if(f.pid&&f.pid!==pid&&db.list[f.pid]){
        const h=p.vsPlayer[f.pid]=p.vsPlayer[f.pid]||{w:0,l:0,d:0};
        h[o.result==='win'?'w':o.result==='loss'?'l':'d']++;
      }
    });
    // Survival runs: waves cleared (XP for each) and the best run
    if(o.waves!=null){
      const sv=p.survival=p.survival||{runs:0, best:0, bestWith:null, clears:0};
      sv.runs++; xp+=XP.survivalWave*o.waves;
      if(o.waves>sv.best){ sv.best=o.waves; sv.bestWith=o.char; }
      if(o.result==='win') sv.clears++;
    }
    if(o.band){
      const b=p.bands[o.band]=p.bands[o.band]||{g:0,w:0};
      b.g++; if(o.result==='win'){ b.w++; xp+=XP.encounterWin; }
    }
    if(o.arcadeStage&&o.result==='win'){
      p.arcade.best=Math.max(p.arcade.best,o.arcadeStage); xp+=XP.arcadeStage*o.arcadeStage;
    }
    if(o.arcadeClear){ p.arcade.clears++; p.arcade.clearedWith[o.char]=(p.arcade.clearedWith[o.char]||0)+1; xp+=XP.arcadeClear; }
    p.xp+=xp;
    p.history.unshift({t:Date.now(), mode:o.mode, char:o.char, foes:(o.foes||[]).map(f=>f.char), band:o.band||null, waves:o.waves!=null?o.waves:null,
      result:o.result, place:o.place||null, rounds:o.rounds||0, clear:!!o.arcadeClear});
    p.history.length=Math.min(p.history.length,HISTORY);
    save();
    const after=rankOf(p.xp);
    return {pid, name:p.name, xp, result:o.result, rankUp:after.i>before.i?after:null, newFoes, streak:p.streak};
  }
  function arcadeRun(pid){ const p=db.list[pid]; if(p){ p.arcade.runs++; save(); } }

  // The line under the win/lose overlay: XP, rank-ups and first wins over a wizard
  function showSummary(results){
    const el=document.getElementById('ovprof'); if(!el) return;
    results=(results||[]).filter(Boolean);
    el.innerHTML=results.map(r=>{
      const bits=[`<b>${esc(r.name)}</b> +${r.xp} XP`];
      if(r.streak>=3) bits.push(`🔥 ${r.streak} wins in a row`);
      if(r.newFoes.length) bits.push('First win over '+r.newFoes.map(k=>`<span style="color:${charCol(k)}">${esc(charName(k))}</span>`).join(', ')+'!');
      if(r.rankUp) bits.push(`<span class="pf-rankup">${r.rankUp.ico} Rank up: ${r.rankUp.name}!</span>`);
      return `<div class="ovp-line">${bits.join(' · ')}</div>`;
    }).join('');
    el.style.display=results.length?'':'none';
  }

  // ── UI ──
  const $=id=>document.getElementById(id);
  let view='main', viewId=null, pickCb=null, pickCancel=null, pickExclude=[];

  function refreshChip(){
    const chip=$('btn-profile'); if(!chip) return;
    const p=active();
    if(p){ const r=rankOf(p.xp); chip.innerHTML=`<span class="pfc-ico">${r.ico}</span><span class="pfc-txt"><b>${esc(p.name)}</b><small>${r.name}</small></span>`; }
    else chip.innerHTML='<span class="pfc-ico">👤</span><span class="pfc-txt"><b>Guest</b><small>Tap to sign in</small></span>';
  }
  function open(v,id){ view=v||'main'; viewId=id||null; render(); $('profile-overlay').classList.add('show'); }
  function close(){ $('profile-overlay').classList.remove('show'); pickCb=null; if(!db.asked){ db.asked=true; save(); } refreshChip(); }

  function newForm(btnLabel){
    return `<form class="pf-new" id="pf-new-form" autocomplete="off">
      <input id="pf-new-name" maxlength="${NAME_MAX}" placeholder="Enter your name" aria-label="Your name">
      <button class="mo-opt on" type="submit">${btnLabel||'Create'}</button></form><div class="pf-err" id="pf-err"></div>`;
  }
  function profileRow(p,attrs,extra){
    const r=rankOf(p.xp);
    return `<button class="pf-row" ${attrs}><span class="pf-row-ico">${r.ico}</span>`+
      `<span class="pf-row-txt"><b>${esc(p.name)}</b><small>${r.name} · ${p.games} games · ${pct({g:p.games,w:p.wins})}% won</small></span>${extra||''}</button>`;
  }
  function render(){
    const box=$('pf-body'); if(!box) return;
    if(view==='pick'){ box.innerHTML=renderPick(); return; }
    if(view==='stats'){ box.innerHTML=renderStats(db.list[viewId]); return; }
    const list=all(), a=active();
    box.innerHTML=`<div class="mo-title">Wizard Profiles</div><div class="mo-sub">★ Saved on this device ★</div>`+
      (list.length?`<div class="pf-section">Who's playing?</div>`+list.map(p=>profileRow(p,`data-use="${p.id}"`,
        (p.id===db.active?'<span class="pf-tag">Active</span>':'')+`<span class="pf-stats-btn" data-stats="${p.id}" role="button" aria-label="Stats">📊</span>`)).join(''):
        `<div class="pf-intro">Enter your name to keep your win rate, the wizards you've beaten and your rank.</div>`)+
      `<div class="pf-section">New player</div>`+newForm()+
      (a?`<button class="btn" data-stats="${a.id}">📊 ${esc(a.name)}'s Stats</button>`:'')+
      `<button class="btn btn-training-back-btn" data-act="guest">${a?'Sign out (Guest)':'Play as Guest'}</button>`+
      `<button class="btn btn-training-back-btn" data-act="close">Done</button>`;
  }
  // Choosing the profile for another player seat (2 Player, 3–4 Wizards)
  let pickLabel='';
  function renderPick(){
    const list=all().filter(p=>!pickExclude.includes(p.id));
    return `<div class="mo-title">${esc(pickLabel)}</div><div class="mo-sub">★ Who's playing this seat? ★</div>`+
      list.map(p=>profileRow(p,`data-pick="${p.id}"`)).join('')+
      `<div class="pf-section">New player</div>`+newForm('Add')+
      `<button class="btn btn-training-back-btn" data-pick="">Guest (no stats)</button>`+
      `<button class="btn btn-training-back-btn" data-act="pick-cancel">← Back</button>`;
  }
  function recordTable(rows,head){
    if(!rows.length) return '<div class="pf-empty">Nothing yet.</div>';
    return `<table class="pf-table"><tr><th>${head}</th><th>P</th><th>W</th><th>L</th><th>%</th></tr>`+
      rows.map(([k,r])=>`<tr><td><img src="portraits/small/${esc(k)}.jpg" alt=""><span style="color:${charCol(k)}">${esc(charName(k))}</span></td>`+
        `<td>${r.g}</td><td>${r.w}</td><td>${r.l}</td><td>${pct(r)}</td></tr>`).join('')+'</table>';
  }
  // their Explore game (js/explore.js keeps one save per profile)
  function exploreStats(id,tile){
    let s=null; try{ s=JSON.parse(localStorage.getItem('wd-explore-save:'+id)||'null'); }catch(e){}
    if(!s) return '';
    const books=window.ExploreRooms?window.ExploreRooms.BOOKS.length:20;
    const spill=Object.values(s.spill||{}).reduce((a,b)=>a+b,0);
    return `<div class="pf-section">Corvanthe</div><div class="pf-tiles">${tile(s.gold||0,'Gold')}${tile(spill,'Quintessence')}${tile((s.visited||[]).length,'Places')}`+
      `${tile((s.booksRead||[]).length+' / '+books,'Lore')}${tile((s.allies||[]).length,'Allies')}${tile(Object.keys(s.cleared||{}).length,'Echo groups broken')}</div>`;
  }
  function renderStats(p){
    if(!p) return '';
    const r=rankOf(p.xp);
    const keys=typeof CHAR_DEFS!=='undefined'?Object.keys(CHAR_DEFS):[];
    const beaten=keys.filter(k=>p.vsChar[k]&&p.vsChar[k].w);
    const played=Object.entries(p.played).sort((a,b)=>b[1].g-a[1].g);
    const foes=Object.entries(p.vsChar).filter(([k])=>isChar(k)).sort((a,b)=>b[1].g-a[1].g);
    const nemesis=foes.filter(([,v])=>v.l>v.w).sort((a,b)=>(b[1].l-b[1].w)-(a[1].l-a[1].w))[0];
    const modes=Object.entries(p.modes);
    const h2h=Object.entries(p.vsPlayer).filter(([id])=>db.list[id]);
    const bands=Object.entries(p.bands);
    const bandName=id=>{ const b=typeof BANDS!=='undefined'&&BANDS.find(x=>x.id===id); return b?b.icon+' '+b.name:id; };
    const tile=(n,l)=>`<div class="pf-tile"><b>${n}</b><small>${l}</small></div>`;
    const hist=p.history.map(h=>{
      const res=h.result==='win'?'W':h.result==='loss'?'L':'D';
      const vs=h.waves!=null?'the waves ('+h.waves+' cleared)':h.band?bandName(h.band):h.foes.map(charName).join(', ');
      const d=new Date(h.t);
      return `<div class="pf-hist pf-${h.result}"><span class="pf-res">${res}</span>`+
        `<img src="portraits/small/${esc(h.char)}.jpg" alt=""><span class="pf-hist-txt">${esc(charName(h.char))} vs ${esc(vs)}`+
        `<small>${MODE_NAMES[h.mode]||h.mode}${h.place?' · '+['1st','2nd','3rd','4th'][h.place-1]:''}${h.clear?' · 🏆 Cleared':''} · ${h.rounds} rds · ${d.toLocaleDateString()}</small></span></div>`;
    }).join('');
    return `<div class="mo-title">${esc(p.name)}</div>
      <div class="pf-rank">${r.ico} ${r.name}</div>
      <div class="pf-xpbar"><div style="width:${Math.round(r.pct*100)}%"></div></div>
      <div class="pf-xptxt">${p.xp} XP${r.next?' · '+(r.next.xp-p.xp)+' to '+r.next.name:' · Highest rank'}</div>
      <div class="pf-tiles">${tile(p.games,'Games')}${tile(pct({g:p.games,w:p.wins})+'%','Win rate')}${tile(`${p.wins}-${p.losses}-${p.draws}`,'W-L-D')}
        ${tile(p.streak,'Streak')}${tile(p.bestStreak,'Best streak')}${tile(p.arcade.clears,'Arcade clears')}</div>
      <div class="pf-section">Wizards defeated · ${beaten.length} / ${keys.length}</div>
      <div class="pf-grid">${keys.map(k=>`<img src="portraits/small/${esc(k)}.jpg" alt="${esc(charName(k))}" title="${esc(charName(k))}${p.vsChar[k]?` (${p.vsChar[k].w}-${p.vsChar[k].l})`:''}" class="${p.vsChar[k]&&p.vsChar[k].w?'won':''}">`).join('')}</div>
      ${nemesis?`<div class="pf-nemesis">☠ Nemesis: <span style="color:${charCol(nemesis[0])}">${esc(charName(nemesis[0]))}</span> (${nemesis[1].w}-${nemesis[1].l})</div>`:''}
      ${modes.length?`<div class="pf-section">By mode</div><table class="pf-table"><tr><th>Mode</th><th>P</th><th>W</th><th>L</th><th>%</th></tr>${modes.map(([m,v])=>`<tr><td>${MODE_NAMES[m]||m}</td><td>${v.g}</td><td>${v.w}</td><td>${v.l}</td><td>${pct(v)}</td></tr>`).join('')}</table>`:''}
      ${p.arcade.runs?`<div class="pf-note">Arcade: ${p.arcade.runs} runs, furthest stage ${p.arcade.best}${p.arcade.clears?', cleared with '+Object.keys(p.arcade.clearedWith).map(charName).join(', '):''}</div>`:''}
      <div class="pf-section">Your wizards</div>${recordTable(played,'Wizard')}
      <div class="pf-section">Against</div>${recordTable(foes,'Opponent')}
      ${h2h.length?`<div class="pf-section">Head to head</div><table class="pf-table"><tr><th>Player</th><th>W</th><th>L</th><th>D</th></tr>${h2h.map(([id,v])=>`<tr><td>${esc(db.list[id].name)}</td><td>${v.w}</td><td>${v.l}</td><td>${v.d}</td></tr>`).join('')}</table>`:''}
      ${p.survival&&p.survival.runs?`<div class="pf-section">Survival</div><div class="pf-tiles">${tile(p.survival.runs,'Runs')}${tile(p.survival.best,'Best wave')}${tile(p.survival.clears,'Full clears')}</div>${p.survival.bestWith?`<div class="pf-xptxt">Best run with ${esc(charName(p.survival.bestWith))}</div>`:''}`:''}
      ${bands.length?`<div class="pf-section">Encounters (old bands)</div><table class="pf-table"><tr><th>Band</th><th>P</th><th>W</th><th>%</th></tr>${bands.map(([id,v])=>`<tr><td>${esc(bandName(id))}</td><td>${v.g}</td><td>${v.w}</td><td>${pct(v)}</td></tr>`).join('')}</table>`:''}
      ${exploreStats(p.id,tile)}
      <div class="pf-section">Recent matches</div>${hist||'<div class="pf-empty">No matches yet. Training doesn\'t count.</div>'}
      <div class="pf-section">Manage</div>
      <form class="pf-new" id="pf-rename-form" autocomplete="off"><input id="pf-rename" maxlength="${NAME_MAX}" value="${esc(p.name)}" aria-label="Name"><button class="mo-opt" type="submit">Rename</button></form>
      <div class="pf-err" id="pf-err"></div>
      <button class="mo-opt pf-del" data-del="${p.id}">Delete profile</button>
      <button class="btn btn-training-back-btn" data-act="back">← Back</button>`;
  }

  // Ask for the profile behind each extra player seat, one at a time; done(ids) with null for guests
  function choosePlayers(labels,done,cancel){
    pickCancel=cancel||null;
    const ids=[]; const exclude=db.active?[db.active]:[];
    const next=()=>{
      if(ids.length>=labels.length){ close(); done(ids); return; }
      pickLabel=labels[ids.length]; pickExclude=exclude.concat(ids.filter(Boolean));
      pickCb=id=>{ ids.push(id||null); next(); };
      open('pick');
    };
    if(!labels.length){ done([]); return; }
    next();
  }

  function wire(){
    const ov=$('profile-overlay'); if(!ov) return;
    $('btn-profile').addEventListener('click',()=>open('main'));
    ov.addEventListener('submit',e=>{
      e.preventDefault();
      const err=$('pf-err');
      if(e.target.id==='pf-new-form'){
        const res=create($('pf-new-name').value);
        if(res.error){ err.textContent=res.error; return; }
        if(view==='pick'&&pickCb){ pickCb(res.profile.id); return; }
        setActive(res.profile.id); render();
      } else if(e.target.id==='pf-rename-form'){
        const res=rename(viewId,$('pf-rename').value);
        if(res.error){ err.textContent=res.error; return; }
        render(); refreshChip();
      }
    });
    ov.addEventListener('click',e=>{
      const t=e.target.closest('[data-stats],[data-use],[data-pick],[data-act],[data-del]'); if(!t) return;
      if(t.dataset.stats){ e.stopPropagation(); view='stats'; viewId=t.dataset.stats; render(); ov.querySelector('.pf-box').scrollTop=0; return; }
      if(t.dataset.use){ setActive(t.dataset.use); render(); return; }
      if(t.dataset.pick!==undefined&&view==='pick'&&pickCb){ pickCb(t.dataset.pick||null); return; }
      if(t.dataset.del){
        const p=db.list[t.dataset.del];
        if(p&&confirm('Delete '+p.name+'\'s profile and all its stats?')){ remove(p.id); view='main'; render(); refreshChip(); }
        return;
      }
      const a=t.dataset.act;
      if(a==='close') close();
      else if(a==='guest'){ setActive(null); close(); }
      else if(a==='back'){ view='main'; render(); }
      else if(a==='pick-cancel'){ const c=pickCancel; pickCancel=null; close(); if(c) c(); }
    });
    refreshChip();
    // First visit: ask for a name
    // (wait until the splash screen's Play is pressed, so it doesn't cover the art)
    const firstVisit=()=>{ if(!db.asked&&!all().length) open('main'); };
    const splash=document.getElementById('splash-screen');
    if(splash&&splash.classList.contains('active')) document.addEventListener('wd-splash-done',firstVisit,{once:true});
    else firstVisit();
  }
  document.addEventListener('DOMContentLoaded',wire);

  return {create, rename, remove, setActive, active, get, all, rankOf, RANKS, XP,
    setSeats, get seats(){ return seats; }, nameOf,
    recordGame, arcadeRun, showSummary, choosePlayers, open, refreshChip};
})();
