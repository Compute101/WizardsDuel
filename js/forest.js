// ═══════════════════════════════════════════════════════════════════════
// THE MORIQUENDE: the forest strategy year (screen). Rules live in js/forest_engine.js.
// 🌲 Moriquende in the title screen's Test menu opens it. Placeholder art: hexes and tokens are
// drawn on a canvas until the real hex tiles and figures arrive (docs/forest-design.md, Art).
// Saved on the device (localStorage wd-forest-save); joins the Explore save in step 3.
// ═══════════════════════════════════════════════════════════════════════
(function(){
'use strict';
const F = window.ForestEngine;
const $ = id => document.getElementById(id);
const SAVE = 'wd-forest-save';
const ELEMS = [
  ['fire','🔥','Fire'],['air','🌬','Air'],['lightning','⚡','Lightning'],['arcane','🔮','Arcane'],
  ['water','🌊','Water'],['earth','🪨','Earth'],['ice','❄️','Ice'],['dark','🌑','Dark'],
];
const TCOL = {home:'#b89a52', wood:'#2f6b34', old:'#1c4a25', glade:'#7fae55', hill:'#6f7d3c', marsh:'#3f6d62', crag:'#7c7568', lake:'#2f5f8f'};
const SIGN_ICON = {smoke:'💨', timber:'🪓', drums:'🥁', waaagh:'🥁', howl:'🐺', birds:'🐦', silence:'🤫', fire:'🔥'};
const TOKEN = {gob:'👺', varg:'🐺', orc:'👹', herd:'🦌', warren:'🕳'};
// ── The map art (the user's sheets, cut by tools/cut_forest_art.py): a hex tile per terrain and a figure
// for each thing on the map; the canvas drawing and emoji stand in until each picture has loaded ──
const ART_V='?v=1', ART={};
function art(src){ let a=ART[src]; if(!a){ a=ART[src]={img:new Image(), ok:false}; a.img.onload=()=>{ a.ok=true; }; a.img.src=src; } return a.ok?a.img:null; }
const HEX_KINDS=['old','wood','glade','hill','marsh','crag','lake','felled','burnt','home','hamlet','talan','ancient'];
const TOK_KINDS=['goblin','shaman','varg','orc','totem','deer','seer','talon','charm','guild'];
function hexArt(hx){
  const k=hx.burnt?'burnt':hx.felled?'felled':hx.t==='home'?'home':hx.hamlet?'hamlet':hx.tree!=null?(S.trees[hx.tree].dead?'felled':'ancient'):hx.talan&&!hx.build?'talan':hx.t;
  return art('sprites/forest/hex_'+k+'.png'+ART_V);
}
const tokArt=k=>art('sprites/forest/tok_'+k+'.png'+ART_V);
const WILD_ART={gob:'goblin', varg:'varg', orc:'orc', herd:'deer'};
// your wizard and Sylvara stand as their own battle sprites
function elfArt(e){
  if(e.role==='sylvara') return art('sprites/sylvara.png');
  if(e.role==='wizard'){ const d=S.wizKey&&typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS[S.wizKey]; return d&&d.sprite?art(d.sprite):null; }
  return tokArt(e.role);
}
function preloadArt(){ HEX_KINDS.forEach(k=>art('sprites/forest/hex_'+k+'.png'+ART_V)); TOK_KINDS.forEach(tokArt); art('sprites/sylvara.png'); }

let lastPanel='', S=null, weekStart=null, ui={sel:null, elf:null, spell:null, ring:2}, view={zoom:1, ox:0, oy:0}, raf=0;

// ── Save ─────────────────────────────────────────────────────────────
// ctx: opened from Explore (Mother Agathe's errand, js/explore.js openForest): the year lives in the Explore
// save, your wizard is Explore's own, and closing goes back to Wrenford's West Road
let ctx=null;
function save(){ if(ctx){ ctx.onSave(S); return; } try{ localStorage.setItem(SAVE, JSON.stringify(S)); }catch(e){} }
function loadSave(){ try{ const s=JSON.parse(localStorage.getItem(SAVE)||'null'); return s&&s.v===1?s:null; }catch(e){ return null; } }

// ── Screen ───────────────────────────────────────────────────────────
function build(){
  const d=document.createElement('div'); d.id='fr-screen'; d.className='fr';
  d.innerHTML=`
    <div class="fr-top">
      <div class="fr-title">🌲 Moriquende <span id="fr-when"></span></div>
      <div class="fr-stats" id="fr-stats"></div>
      <div class="fr-top-btns">
        <button class="fr-btn" id="fr-help" type="button">?</button>
        <button class="fr-btn" id="fr-new" type="button" title="A new year">↺</button>
        <button class="fr-btn" id="fr-close" type="button">✕</button>
      </div>
    </div>
    <div class="fr-main">
      <div class="fr-map" id="fr-map"><canvas id="fr-cv"></canvas>
        <div class="fr-zoom"><button class="fr-btn" id="fr-zin" type="button">+</button><button class="fr-btn" id="fr-zout" type="button">−</button></div>
        <div class="fr-hint" id="fr-hint"></div>
      </div>
      <div class="fr-side">
        <div class="fr-panel" id="fr-panel"></div>
        <div class="fr-bar">
          <button class="fr-btn" id="fr-elves" type="button">🧝 Elves</button>
          <button class="fr-btn" id="fr-spell" type="button">✨ Spell</button>
          <button class="fr-btn" id="fr-undo" type="button" title="Take back this week's orders">↶</button>
          <button class="fr-btn big" id="fr-end" type="button">End week ▸</button>
        </div>
      </div>
    </div>
    <div class="fr-modal" id="fr-modal" hidden><div class="fr-card" id="fr-card"></div></div>`;
  document.body.appendChild(d);
  $('fr-close').onclick=close;
  $('fr-new').onclick=()=>setupPanel(true);
  $('fr-help').onclick=helpPanel;
  $('fr-end').onclick=endWeek;
  $('fr-undo').onclick=()=>{ if(weekStart&&!S.pending&&S.step==null){ S=F.clone(weekStart); ui.elf=null; ui.spell=null; F.vision(S); save(); render(); } };
  $('fr-elves').onclick=rosterPanel;
  $('fr-spell').onclick=spellPanel;
  $('fr-zin').onclick=()=>zoomBy(1.3);
  $('fr-zout').onclick=()=>zoomBy(1/1.3);
  const cv=$('fr-cv');
  cv.addEventListener('pointerdown',pDown); cv.addEventListener('pointermove',pMove);
  cv.addEventListener('pointerup',pUp); cv.addEventListener('pointercancel',pUp);
  cv.addEventListener('wheel',e=>{ e.preventDefault(); zoomBy(e.deltaY<0?1.12:1/1.12, e.offsetX, e.offsetY); },{passive:false});
  window.addEventListener('resize',()=>{ if(isOpen()) { fitCanvas(); draw(); } });
  window.addEventListener('keydown',e=>{ if(!isOpen()) return; if(e.key==='Escape'){ if(!$('fr-modal').hidden) closeModal(); else if(ui.spell||ui.elf){ ui.spell=null; ui.elf=null; render(); } } });
  return d;
}
const isOpen=()=>{ const d=$('fr-screen'); return !!d&&d.classList.contains('active'); };
function open(opts){
  const d=$('fr-screen')||build(); d.classList.add('active');
  ctx=opts&&opts.explore||null;
  d.classList.toggle('fr-explore',!!ctx);
  if(window.Explore&&Explore.titleMusic) Explore.titleMusic();
  preloadArt();
  S=ctx?(ctx.state||null):loadSave();
  fitCanvas(); view={zoom:1,ox:0,oy:0}; ui={sel:F.HOME, elf:null, spell:null, ring:2};
  if(S&&!S.over){ syncIn(); weekStart=F.clone(S); F.vision(S); render(); if(S.pending) fightPrompt(); }
  else if(ctx&&S&&S.over){ F.vision(S); render(); yearOverPanel(); }
  else if(ctx) beginStory();
  else setupPanel(false);
  loop();
}
function close(){
  const d=$('fr-screen'); if(d) d.classList.remove('active'); cancelAnimationFrame(raf);
  if(ctx){ save(); const c=ctx; ctx=null; c.onClose(S); return; }
  if(window.Explore&&Explore.titleMusic) Explore.titleMusic();
}
// ── From Explore: Agathe's errand ────────────────────────────────────
function beginStory(){
  S=F.newYear({element:ctx.element, heroName:ctx.name, wizKey:ctx.wizKey, handFights:true, selfHeal:false});
  syncIn(); weekStart=F.clone(S); save(); render();
  reportPanel(1);
}
// your wizard's HP is Explore's (one pool): the year starts from it, and writes wounds back after each week
// and fight. S.wizHpSync is the forest HP last agreed with Explore ('w' while wounded), so a precise duel
// result isn't rounded over by the forest's coarser 12-point HP.
const meOf = () => S&&S.elves.find(e=>e.role==='wizard');
function syncIn(){
  const me=meOf(); if(!ctx||!me||me.wounded) return;
  const max=F.ROLES.wizard.hp; me.hp=Math.max(1,Math.min(max,Math.round(max*ctx.hp()/ctx.maxHp()))); S.wizHpSync=me.hp;
}
function syncOut(){
  const me=meOf(); if(!ctx||!me) return;
  if(me.wounded){ if(S.wizHpSync!=='w'){ ctx.setHp(Math.max(1,ctx.maxHp()*0.25)); S.wizHpSync='w'; } return; }
  if(me.hp!==S.wizHpSync){ ctx.setHp(ctx.maxHp()*me.hp/F.ROLES.wizard.hp); S.wizHpSync=me.hp; }
}
function yearOverPanel(){
  const sc=F.score(S), E=F.ENDINGS[sc.ending];
  modal(`<h2>${E.name}</h2><p>${esc(E.text)}</p>${endText()}${S.rewardText?`<p>${esc(S.rewardText)}</p>`:''}
    <p class="fr-note">${sc.ending==='song'?'The Moriquende will always have room for you.':'Sylvara would welcome you back next spring, if you\u2019d try the year again.'}</p>
    <div class="fr-row"><button class="fr-btn" type="button" id="fr-back">Back to Wrenford</button>${sc.ending==='song'?'':'<button class="fr-btn big" type="button" id="fr-again">Try another year</button>'}</div>`);
  $('fr-back').onclick=()=>{ closeModal(); close(); };
  if($('fr-again')) $('fr-again').onclick=()=>{ closeModal(); beginStory(); };   // (another year, the same way Sylvara offers it)
}
// the year's end pays out once (Explore decides what: js/explore.js forestEnd)
function settleYear(){
  if(!ctx||!S.over||S.rewarded) return;
  S.rewarded=true; S.rewardText=ctx.onEnd(S,F.score(S))||''; save();
}

// ── Panels ───────────────────────────────────────────────────────────
function modal(html){ $('fr-card').innerHTML=html; $('fr-modal').hidden=false; }
function closeModal(){ $('fr-modal').hidden=true; }
const titleCase=t=>String(t||'').toLowerCase().replace(/(^|[\s-])\S/g,c=>c.toUpperCase());
// the Test menu's quick year: no wizard of your own to lead fights (that's Explore's, via Elfhome), so every
// fight plays itself out
function setupPanel(canCancel){
  let el='earth';
  modal(`<h2>The Moriquende</h2>
    <p>Sylvara has asked you to keep the watch over the Moriquende for a year, while she tends its four ancient trees.
    Keep Elfhome standing, keep the wild in balance, and keep Sylvara safe until every tree has been tended.</p>
    <p class="fr-note">A test year: fights play themselves out. In a real game you get here from Elfhome, with your own wizard.</p>
    <p class="fr-lbl">Your element</p>
    <div class="fr-elems" id="fr-elems">${ELEMS.map(([k,i,n])=>`<button class="fr-btn${k===el?' on':''}" data-el="${k}" type="button">${i} ${n}</button>`).join('')}</div>
    <p class="fr-note" id="fr-elnote"></p>
    <div class="fr-row"><button class="fr-btn big" id="fr-go" type="button">Begin the year</button>${canCancel&&S&&!S.over?'<button class="fr-btn" id="fr-cancel" type="button">Back</button>':''}</div>`);
  const note=()=>{ $('fr-elnote').textContent=el==='fire'?'Careful: a Fire strike in the trees can set the wood alight.':''; };
  $('fr-elems').onclick=e=>{ const b=e.target.closest('[data-el]'); if(!b) return; el=b.dataset.el; [...$('fr-elems').children].forEach(x=>x.classList.toggle('on',x===b)); note(); };
  note();
  $('fr-go').onclick=()=>{
    S=F.newYear({element:el, heroName:heroName()}); weekStart=F.clone(S); ui={sel:F.HOME, elf:null, spell:null, ring:2}; view={zoom:1,ox:0,oy:0}; save(); closeModal(); render(); reportPanel(1); };
  if($('fr-cancel')) $('fr-cancel').onclick=closeModal;
}
function heroName(){ try{ const p=typeof Profiles!=='undefined'&&Profiles.active&&Profiles.active(); return p&&p.name||'You'; }catch(e){ return 'You'; } }
function helpPanel(){
  modal(`<h2>How the year goes</h2>
  <ul>
    <li><b>A turn is a week</b>, a year 24 weeks. Move your elves, give them tasks, cast one spell, then <b>End week</b>. The wild moves while you can't see it.</li>
    <li><b>Watch.</b> You can never see the whole wood. A Seer sees their own hex clearly and the ring around it dimly (something moves, but what?). In a sentry post they see a ring clearly and two dimly, more from hills. Old growth hides what's in it.</li>
    <li><b>Signs.</b> The wood tells you about hexes you can't see: smoke, the crash of a felled tree, drums from a direction, howling, birds starting up. Goblin shamans light false fires.</li>
    <li><b>Sylvara</b> walks to each ancient tree and tends it for ${F.TEND} weeks. She keeps clear of danger your watchers can see, but she can't avoid what nobody saw. All four must be tended by the year's end.</li>
    <li><b>The Varg</b> (wolfmen) follow the deer and eat goblins. Fed, they leave you alone; starved, they raid. Killing them in their dens angers the wood.</li>
    <li><b>Goblins</b> breed fast and split off new warrens. Goblins that reach the orcs join them.</li>
    <li><b>Orcs</b> come from the east from summer on. They camp and fell the trees. Harry their camp (Talons next to it, arrows, strikes) and they move on. A big band with a war-totem beats the drums: three weeks later, a <b>Waaagh</b> marches on Elfhome. Dispel the totem to stop the drums.</li>
    <li><b>Your elves:</b> 👁 Seers watch. 🏹 Talons fight, hunt, and man sentry posts (which shoot at whatever passes). 🦌 Beast-speakers herd deer and calm Varg. 🔨 Builders raise sentry posts and thorn hedges. A youth can train in any calling (${F.TRAIN_COST} food, ${F.TRAIN_TURNS} weeks).</li>
    <li><b>You</b> can fight too: you're stronger than any Talon. It's never required, but against a big band it helps.</li>
    <li><b>The Wood</b> keeps score. Felled and burnt trees, slaughter and overgrazing hurt it; quiet weeks mend it. A content wood fights orcs in the old growth; an angry one starves you.</li>
  </ul>
  <div class="fr-row"><button class="fr-btn big" type="button" onclick="document.getElementById('fr-modal').hidden=true">Back to the wood</button></div>`);
}
function reportPanel(turn){
  const lines=S.log.filter(l=>l.turn===turn), signs=S.signs;
  const se=F.SEASONS[F.seasonOf(S.turn)], wk=F.weekOf(S.turn);
  modal(`<h2>${S.over?'The year ends':`Dawn: ${se}, week ${wk}`}</h2>
    ${lines.length?`<ul class="fr-log">${lines.map(l=>`<li class="k-${l.kind}">${esc(l.text)}</li>`).join('')}</ul>`:'<p>A quiet week.</p>'}
    ${signs.length?`<p class="fr-lbl">Signs from the wood</p><ul class="fr-log">${signs.map(s=>`<li>${SIGN_ICON[s.kind]||'•'} ${esc(signText(s))}</li>`).join('')}</ul>`:''}
    ${S.over?endText():''}
    ${S.over&&S.rewardText?`<p><b>${esc(S.rewardText)}</b></p>`:''}
    <div class="fr-row"><button class="fr-btn big" type="button" id="fr-ok">${S.over?(ctx?'Back to Wrenford':'Close'):'To the wood'}</button>${S.over&&!ctx?'<button class="fr-btn" type="button" id="fr-again">A new year</button>':''}</div>`);
  $('fr-ok').onclick=()=>{ closeModal(); if(S.over&&ctx) close(); };
  if($('fr-again')) $('fr-again').onclick=()=>setupPanel(false);
}
function endText(){
  const sc=F.score(S), E=F.ENDINGS[sc.ending];
  return `<div class="fr-end"><h3>${E.name}</h3><p>Score <b>${sc.pts}</b> · the wood ${sc.wood} · trees tended ${sc.trees} of ${F.TREES} · balance kept ${sc.bal}% of weeks · elves lost ${sc.lost}</p></div>`;
}
function signText(s){ const t=F.SIGN_TEXT[s.kind]||s.kind; return s.dir!=null?`${t}, to the ${F.DIR_NAMES[s.dir]}.`:`${t}: ${F.placeName(S,s.k)}.`; }
function rosterPanel(){
  const row=e=>{ const R=F.ROLES[e.role]; const st=e.wounded?`wounded, ${e.wounded} wk`:e.moved?'moved':e.task?e.task.label||e.task.t:''; return `<button class="fr-elf${e.wounded?' hurt':''}" data-id="${e.id}" type="button"><span>${R.icon}</span> ${esc(e.name)} <small>${R.name}${st?' · '+esc(st):''}</small></button>`; };
  modal(`<h2>The elves of Elfhome</h2>
    <div class="fr-roster">${S.elves.map(row).join('')}</div>
    <p class="fr-lbl">Youths: ${S.youths}${S.training.length?` · in training: ${S.training.map(t=>F.ROLES[t.role].name+' ('+t.left+' wk)').join(', ')}`:''}</p>
    ${S.youths?`<div class="fr-row">${F.TRAINABLE.map(r=>`<button class="fr-btn" data-train="${r}" type="button">${F.ROLES[r].icon} Train a ${F.ROLES[r].name}</button>`).join('')}</div><p class="fr-note">${F.TRAIN_COST} food and ${F.TRAIN_TURNS} weeks.</p>`:''}
    <div class="fr-row"><button class="fr-btn" type="button" id="fr-ok">Close</button></div>`);
  $('fr-card').onclick=e=>{
    const b=e.target.closest('[data-id]'); if(b){ const el=S.elves.find(x=>x.id===b.dataset.id); selectElf(el); closeModal(); return; }
    const t=e.target.closest('[data-train]'); if(t){ const err=F.train(S,t.dataset.train); if(err) toast(err); else { save(); rosterPanel(); render(); } }
    if(e.target.id==='fr-ok') closeModal();
  };
}
function spellPanel(){
  if(S.spellUsed){ toast('You have cast this week’s spell.'); return; }
  const sp=F.SPELLS, m=S.mana;
  // from Explore, a wizard still at the University casts only what it has learnt (category and ring)
  const unlearnt=(id,ring)=>!!(ctx&&ctx.cats&&(!ctx.cats.includes(sp[id].cat)||(ring&&ring>(ctx.rings||1))));
  const b=(id,ring,label,cost)=>`<button class="fr-btn" data-sp="${id}" data-ring="${ring||''}" type="button" ${m<cost||unlearnt(id,ring)?'disabled':''}>${label} <small>${unlearnt(id,ring)?'not learnt yet':cost+' mana'}</small></button>`;
  modal(`<h2>✨ Cast a spell</h2><p>Mana ${m} of ${F.MANA_MAX}. One spell a week.</p>
    <div class="fr-spells">
      ${b('strike',1,'⚔ Lesser Strike (3)',sp.strike.cost[1])}${b('strike',2,'⚔ Strike (6)',sp.strike.cost[2])}${b('strike',3,'⚔ Greater Strike (10)',sp.strike.cost[3])}
      ${b('ward',0,'🛡 Ward a hex: a thicket for '+sp.ward.turns+' weeks',sp.ward.cost)}
      ${b('dispel',0,'✖ Dispel: a fetish, a war-totem or a fire',sp.dispel.cost)}
    </div>
    <p class="fr-note">Strike and Dispel need a hex your watchers see clearly.${S.element==='fire'?' A Fire strike in the trees may set them alight.':''}</p>
    <div class="fr-row"><button class="fr-btn" type="button" id="fr-ok">Cancel</button></div>`);
  $('fr-card').onclick=e=>{ const x=e.target.closest('[data-sp]'); if(x&&!x.disabled){ ui.spell=x.dataset.sp; ui.ring=+x.dataset.ring||2; ui.elf=null; closeModal(); render(); } if(e.target.id==='fr-ok') closeModal(); };
}
function esc(t){ return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
let toastT=0; function toast(t){ const h=$('fr-hint'); h.textContent=t; h.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>{ h.classList.remove('on'); render(); },2600); }

// ── Turn ─────────────────────────────────────────────────────────────
function endWeek(){
  if(!S||S.over||S.pending) return;
  ui.elf=null; ui.spell=null;
  S.weekOf=S.turn; runWeek();
}
// run the rest of the week; a fight your wizard stands in stops it for the prompt
function runWeek(){
  const t=S.weekOf||S.turn;
  F.endTurn(S); syncOut();
  if(S.pending){ save(); render(); fightPrompt(); return; }
  weekStart=F.clone(S); settleYear(); save(); render();
  reportPanel(S.over?S.turn:t);
}

// ── Leading a fight yourself (a duel in the battle engine) ───────────
// The band's seats and your ally seat (F.battleSetup) as startExploreBattle wants them. Shared with
// tools/forest_duel_sim.js, so the sim plays exactly these duels.
function duelSpec(set){
  const D=typeof FIGHTER_DEFS!=='undefined'?FIGHTER_DEFS:{};
  const foes=set.foes.map(f=>({key:f.key, level:f.level, hpMul:f.hpMul,
    name:f.m>=1.5&&D[f.key]?`${D[f.key].name} \u00d7${Math.round(f.m)}`:undefined}));
  const allies=set.allies.map(a=>a.wizard?{key:a.key, wizard:true, hp:Math.max(1,Math.round(CHAR_DEFS[a.key].hp*a.hpFrac))}
    :{key:a.key, level:a.level, hpMul:a.hpMul, name:a.name});
  return {foes, allies};
}
function fightPrompt(){
  const set=F.battleSetup(S), odds=F.autoOdds(S,40), wk=S.wizKey;
  const where=F.placeName(S,set.k), cap=where[0].toUpperCase()+where.slice(1);
  const foe=F.foeById(S,S.pending.foeId);
  const what=set.warren?`a goblin warren of about ${foe.n}`:foe.fac==='orc'?`${foe.name}: ${foe.n} orcs${foe.gobs?' and '+foe.gobs+' goblins':''}`:`${foe.n} ${F.FAC[foe.fac].name.toLowerCase()}`;
  const withYou=F.elfAt(S,set.k).filter(e=>e.role!=='wizard').map(e=>e.name);
  const pct=Math.round(odds*100), word=pct>=75?'likely to win':pct>=45?'a close thing':pct>=20?'likely to lose':'all but lost';
  modal(`<h2>⚔ ${S.pending.kind==='attack'?'Your attack':'An attack'}: ${esc(cap)}</h2>
    <p>${S.pending.kind==='attack'?'You go in against':'You are set upon by'} <b>${esc(what)}</b>.${withYou.length?` With you: ${esc(withYou.join(', '))}.`:' You are alone.'}${set.k===F.HOME?' Elfhome\u2019s walls stand with you.':''}</p>
    <p>Left to play out, it's <b>${word}</b> (about ${pct}%).</p>
    <p class="fr-note">Lead it yourself and you fight it as a duel: ${set.foes.length} of them${set.allies.length?', with '+esc(set.allies.map(a=>titleCase(a.name)).join(' and '))+' beside you':''}. Win, and the band is broken. Lose, and you're carried home wounded; whoever's left fights on.</p>
    <div class="fr-row"><button class="fr-btn big" id="fr-lead-go" type="button">⚔ Lead it yourself</button><button class="fr-btn" id="fr-auto" type="button">Let it play out</button></div>
    <label class="fr-check"><input type="checkbox" id="fr-noask"> Don't ask again this year</label>`);
  const noask=()=>{ if($('fr-noask').checked) S.handFights=false; };
  $('fr-auto').onclick=()=>{ noask(); closeModal(); F.resolvePending(S,null); runWeek(); };
  $('fr-lead-go').onclick=()=>{ noask(); closeModal(); leadFight(set,wk); };
  if(typeof startExploreBattle!=='function'||!wk||!CHAR_DEFS[wk]){ $('fr-lead-go').disabled=true; }
}
function leadFight(set,wk){
  const spec=duelSpec(set), d=CHAR_DEFS[wk];
  const foe=F.foeById(S,S.pending.foeId);
  $('fr-screen').classList.remove('active'); cancelAnimationFrame(raf);
  if(ctx&&ctx.beforeBattle) ctx.beforeBattle();
  startExploreBattle({wizKey:wk, foes:spec.foes, allies:spec.allies, hp:ctx?Math.max(1,ctx.hp()):Math.max(1,Math.round(d.hp*set.hpFrac)), arena:'forest',
    text:{winTitle:'The Moriquende Holds', win:`The ${foe.fac==='orc'?'orcs':F.FAC[foe.fac||'gob'].name.toLowerCase()} break and scatter into the trees.`,
      loseTitle:'Carried Home', lose:`${titleCase(d.name)} falls. The elves carry you back to Elfhome.`},
    onEnd:(won,low,allyHp,info)=>{
      $('fr-screen').classList.add('active'); fitCanvas(); loop();
      if(window.Explore&&Explore.titleMusic) Explore.titleMusic();
      F.resolvePending(S,{won, foeLeft:info.foeLeft, hpEnd:info.hpEnd, maxHp:info.maxHp, allyHp});
      // the duel's own HP is exact: Explore keeps it (a lost duel leaves you wounded, at a quarter)
      if(ctx){ const me=meOf(); if(me&&!me.wounded){ ctx.setHp(Math.max(1,info.hpEnd)); S.wizHpSync=me.hp; } else syncOut(); }
      runWeek();
    }});
}
function selectElf(e){ ui.elf=e?e.id:null; ui.spell=null; if(e){ ui.sel=e.pos; centreOn(e.pos); } render(); }

// ── Side panel ───────────────────────────────────────────────────────
function render(){
  if(!S) return;
  const se=F.SEASONS[F.seasonOf(S.turn)];
  $('fr-when').textContent=`· ${se}, week ${F.weekOf(S.turn)} (${S.turn}/${F.YEAR})`;
  const mood=F.mood(S), mi={content:'🌳',uneasy:'🍂',angry:'🥀'}[mood];
  const elves=S.elves.filter(e=>e.role!=='sylvara');
  $('fr-stats').innerHTML=`<span title="Food">🍖 ${Math.floor(S.food)}</span><span title="Mana">✨ ${S.mana}</span><span title="The Wood: ${mood}">${mi} Wood ${Math.round(S.wood)}</span><span title="Elves (youths)">🧝 ${elves.length}${S.youths?'+'+S.youths:''}</span><span title="Ancient trees tended">🌲 ${S.trees.filter(t=>t.done).length}/${F.TREES}</span><span title="Seen clearly / at all">👁 ${Math.round(F.coverage(S)*100)}%</span>`;
  $('fr-spell').disabled=S.spellUsed||!!S.over||!!S.pending; $('fr-end').disabled=!!S.over||!!S.pending;
  const h=$('fr-hint');
  if(!h.classList.contains('on')) h.textContent=ui.spell?`Tap a hex to ${ui.spell==='strike'?'strike':ui.spell}. (Esc to cancel)`:(()=>{ const e=ui.elf&&S.elves.find(x=>x.id===ui.elf); return e&&!e.moved&&!e.wounded&&e.role!=='sylvara'?'Tap a lit hex to move there.':''; })();
  h.style.display=h.textContent?'':'none';
  const pk=ui.elf+'|'+ui.sel, pn=$('fr-panel'); pn.innerHTML=panelHtml(); if(pk!==lastPanel){ pn.scrollTop=0; lastPanel=pk; }
  wirePanel();
  draw();
}
function panelHtml(){
  const k=ui.sel||F.HOME, hx=S.hexes[k], vis=S.vis[k];
  const e=ui.elf&&S.elves.find(x=>x.id===ui.elf);
  let h='';
  if(e){
    const R=F.ROLES[e.role];
    h+=`<div class="fr-sel"><b>${R.icon} ${esc(e.name)}</b> <small>${R.name}${R.house?' of the '+R.house:''} · ${e.hp}/${R.hp} HP</small></div>`;
    if(e.role==='sylvara'){
      const next=S.trees.filter(t=>!t.done&&!t.dead).sort((a,b)=>F.dist(a.k,e.pos)-F.dist(b.k,e.pos))[0];
      h+=`<p>${e.wounded?`Wounded: resting at Elfhome for ${e.wounded} more weeks.`:next?`On her way to ${next.name}${next.tended?` (tended ${next.tended} of ${F.TEND} weeks)`:''}.`:'Every tree is tended.'}</p>`;
      if(!e.wounded&&next&&S.turn>=2) h+=`<button class="fr-btn" id="fr-wait" type="button" ${S.sylWait?'disabled':''}>${S.sylWait?'She will wait this week':'Ask her to wait a week'}</button>`;
    } else if(e.wounded) h+=`<p>Wounded: resting at Elfhome for ${e.wounded} more weeks.</p>`;
    else {
      h+=`<p class="fr-note">${e.moved?'Moved this week.':'Tap a lit hex to move (up to '+R.move+').'}</p>`;
      const ts=F.tasksFor(S,e);
      if(ts.length) h+=`<div class="fr-tasks">${ts.map((t,i)=>`<button class="fr-btn${e.task&&e.task.t===t.t&&(e.task.id===t.id)&&(e.task.to===t.to)?' on':''}" data-task="${i}" type="button">${esc(t.label)}</button>`).join('')}${e.task?'<button class="fr-btn" data-task="-1" type="button">No task</button>':''}</div>`;
      else if(e.role==='seer') h+=`<p class="fr-note">${hx.talan&&!hx.build?'Watching from the sentry post.':'Watching. A sentry post here would let them see further.'}</p>`;
    }
    h+=`<button class="fr-btn" id="fr-desel" type="button">Done</button><hr>`;
  }
  // the hex
  const name=F.placeName(S,k); const t=F.TERRAIN[hx.t].name;
  h+=`<div class="fr-sel"><b>${esc(name[0].toUpperCase()+name.slice(1))}</b> <small>${t}${hx.felled?' · felled':''}${hx.burnt?' · burnt':''}${hx.talan?hx.build?' · sentry post (building)':' · sentry post':''}${hx.thicket?' · thicket '+hx.thicket+' wk':''}</small></div>`;
  if(hx.tree!=null){ const tr=S.trees[hx.tree]; h+=`<p>🌳 ${tr.dead?'Dead.':tr.done?'Tended: it will live.':`Needs tending (${tr.tended} of ${F.TEND} weeks).`}</p>`; }
  const hm=S.hamlets.find(x=>x.k===k); if(hm&&hm.sacked) h+=`<p>Sacked: no food from here for ${hm.sacked} weeks.</p>`;
  if(vis==='clear'){ const c=F.vision&&S.intel[k]?S.intel[k].what:[]; h+=c.length?`<p>${c.map(whatText).join('<br>')}</p>`:'<p class="fr-note">Nothing stirs.</p>'; }
  else if(vis==='dim') h+=`<p class="fr-note">Seen dimly. ${S.intel[k]&&S.intel[k].turn===S.turn?'':''}${dimMoves(k)?'Something moves there.':'Nothing seems to move.'}</p>`;
  else h+=`<p class="fr-note">Unwatched.</p>`;
  if(vis!=='clear'&&S.intel[k]&&S.intel[k].what.length){ const age=S.turn-S.intel[k].turn; h+=`<p class="fr-note">Last seen ${age===0?'this week':age===1?'a week ago':age+' weeks ago'}: ${S.intel[k].what.map(whatText).join(', ')}.</p>`; }
  const here=S.elves.filter(x=>x.pos===k&&!x.wounded);
  if(here.length) h+=`<div class="fr-roster">${here.map(x=>`<button class="fr-elf${x.id===ui.elf?' on':''}" data-id="${x.id}" type="button"><span>${F.ROLES[x.role].icon}</span> ${esc(x.name)}${x.task?` <small>${esc(x.task.label||x.task.t)}</small>`:''}</button>`).join('')}</div>`;
  const hurt=k===F.HOME?S.elves.filter(x=>x.wounded):[];
  if(hurt.length) h+=`<p class="fr-note">Resting: ${hurt.map(x=>esc(x.name)+' ('+x.wounded+' wk)').join(', ')}</p>`;
  return h;
}
function whatText(w){
  if(w.t==='warren') return `🕳 A goblin warren, about ${w.n}${w.fetish?' (a shaman’s fetish)':''}`;
  if(w.t==='herd') return `🦌 Deer, ${w.n}`;
  if(w.t==='gob') return `👺 ${w.n} goblins on the move`;
  if(w.t==='varg') return `🐺 A Varg pack of ${w.n}`;
  if(w.t==='orc') return `👹 ${w.n} orcs${w.gobs?' and '+w.gobs+' goblins':''}${w.camp?', camped':''}${w.totem?', a war-totem':''}${w.drums?', drums beating':''}${w.march?', MARCHING':''}${w.leave?', leaving':''}`;
  return w.t;
}
function dimMoves(k){ return F.bandsAt(S,k).length||F.warrenAt(S,k)||F.herdAt(S,k); }
function wirePanel(){
  const p=$('fr-panel');
  p.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectElf(S.elves.find(x=>x.id===b.dataset.id)));
  p.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{ const e=S.elves.find(x=>x.id===ui.elf); const i=+b.dataset.task; F.setTask(S,e.id,i<0?null:F.tasksFor(S,e)[i]); save(); render(); });
  if($('fr-desel')) $('fr-desel').onclick=()=>{ ui.elf=null; render(); };
  if($('fr-wait')) $('fr-wait').onclick=()=>{ S.sylWait=true; save(); render(); };
}

// ── The map ──────────────────────────────────────────────────────────
let cw=0, ch=0, dpr=1;
function fitCanvas(){ const m=$('fr-map'), cv=$('fr-cv'); dpr=Math.min(2,window.devicePixelRatio||1); cw=m.clientWidth; ch=m.clientHeight; cv.width=cw*dpr; cv.height=ch*dpr; cv.style.width=cw+'px'; cv.style.height=ch+'px'; }
function hexSize(){ const R=F.R; const fit=Math.min(cw/(Math.sqrt(3)*(2*R+1)+1), ch/(1.5*(2*R)+2.2)); return fit*view.zoom; }
function hexXY(k){ const [q,r]=F.unkey(k), s=hexSize(); return [cw/2+view.ox+s*Math.sqrt(3)*(q+r/2), ch/2+view.oy+s*1.5*r]; }
function pixToHex(x,y){
  const s=hexSize(); const px=(x-cw/2-view.ox)/s, py=(y-ch/2-view.oy)/s;
  let q=(Math.sqrt(3)/3*px-py/3), r=2/3*py; let x3=q, z3=r, y3=-x3-z3;
  let rx=Math.round(x3), ry=Math.round(y3), rz=Math.round(z3);
  const dx=Math.abs(rx-x3), dy=Math.abs(ry-y3), dz=Math.abs(rz-z3);
  if(dx>dy&&dx>dz) rx=-ry-rz; else if(dy>dz) ry=-rx-rz; else rz=-rx-ry;
  const k=F.key(rx,rz); return S.hexes[k]?k:null;
}
function zoomBy(f,x,y){ const z=Math.max(1,Math.min(3.5,view.zoom*f)); const fx=x==null?cw/2:x, fy=y==null?ch/2:y; const r=z/view.zoom;
  view.ox=(view.ox+cw/2-fx)*r-(cw/2-fx); view.oy=(view.oy+ch/2-fy)*r-(ch/2-fy); view.zoom=z; clampView(); draw(); }
function clampView(){ const lim=(view.zoom-1)*Math.max(cw,ch)*0.6; view.ox=Math.max(-lim,Math.min(lim,view.ox)); view.oy=Math.max(-lim,Math.min(lim,view.oy)); if(view.zoom<=1){ view.ox=0; view.oy=0; } }
function centreOn(k){ if(view.zoom<=1) return; const [x,y]=hexXY(k); view.ox+=cw/2-x; view.oy+=ch/2-y; clampView(); }
const ptrs=new Map(); let drag=null;
function pDown(e){ $('fr-cv').setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY}); drag={x:e.offsetX,y:e.offsetY,ox:view.ox,oy:view.oy,moved:false,pinch:ptrs.size===2?pinchD():0,z:view.zoom}; }
function pinchD(){ const [a,b]=[...ptrs.values()]; return Math.hypot(a.x-b.x,a.y-b.y); }
function pMove(e){ if(!ptrs.has(e.pointerId)||!drag) return; ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(ptrs.size===2&&drag.pinch){ const z=drag.z*pinchD()/drag.pinch; zoomBy(z/view.zoom); drag.moved=true; return; }
  const dx=e.offsetX-drag.x, dy=e.offsetY-drag.y; if(Math.hypot(dx,dy)>7) drag.moved=true;
  if(drag.moved&&view.zoom>1){ view.ox=drag.ox+dx; view.oy=drag.oy+dy; clampView(); draw(); } }
function pUp(e){ const d=drag; ptrs.delete(e.pointerId); if(ptrs.size) return; drag=null; if(d&&!d.moved) tap(e.offsetX,e.offsetY); }
function tap(x,y){
  const k=pixToHex(x,y); if(!k||!S||S.over) return;
  if(ui.spell){ const err=F.cast(S,ui.spell,k,ui.ring); if(err) toast(err); else { ui.spell=null; save(); ui.sel=k; } render(); return; }
  const e=ui.elf&&S.elves.find(x=>x.id===ui.elf);
  if(e&&e.role!=='sylvara'&&!e.wounded&&!e.moved&&k!==e.pos){ const err=F.canMove(S,e,k); if(!err){ F.move(S,e.id,k); ui.sel=k; save(); render(); return; } }
  ui.sel=k;
  // tapping a hex with one of your elves in it picks the first if none is picked
  if(!e){ const here=S.elves.filter(x=>x.pos===k&&!x.wounded&&x.role!=='sylvara'); if(here.length===1){ ui.elf=here[0].id; } }
  else if(k!==e.pos) ui.elf=null;
  render();
}

function loop(){ cancelAnimationFrame(raf); const f=()=>{ if(!isOpen()) return; draw(); raf=requestAnimationFrame(f); }; raf=requestAnimationFrame(f); }
function hexPath(c,x,y,s){ c.beginPath(); for(let i=0;i<6;i++){ const a=Math.PI/180*(60*i-30); c.lineTo(x+s*Math.cos(a), y+s*Math.sin(a)); } c.closePath(); }
function hash(k,n){ let h=2166136261; const s=k+':'+n; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/4294967296; }
function draw(){
  if(!S||!cw) return;
  const c=$('fr-cv').getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  c.fillStyle='#0d1a10'; c.fillRect(0,0,cw,ch);
  const s=hexSize(), T=performance.now();
  const e=ui.elf&&S.elves.find(x=>x.id===ui.elf);
  const reach=e&&!e.moved&&!e.wounded&&e.role!=='sylvara'?F.reachable(S,e.pos,F.ROLES[e.role].move):null;
  for(const k in S.hexes){
    const hx=S.hexes[k], [x,y]=hexXY(k); if(x<-s||y<-s||x>cw+s||y>ch+s) continue;
    const tile=hexArt(hx);
    if(tile) c.drawImage(tile,x-Math.sqrt(3)/2*s,y-s,Math.sqrt(3)*s,2*s);
    else { hexPath(c,x,y,s*0.98); c.fillStyle=hx.burnt?'#2d2a26':hx.felled?'#6b5233':TCOL[hx.t]; c.fill(); }
    terrainMarks(c,k,hx,x,y,s,!!tile);
    // fog
    const v=S.vis[k];
    if(v!=='clear'){ hexPath(c,x,y,s*0.98); c.fillStyle=v==='dim'?'rgba(5,12,8,0.32)':'rgba(5,12,8,0.6)'; c.fill(); }
    if(k===S.mist){ hexPath(c,x,y,s*0.98); c.fillStyle='rgba(200,210,220,0.35)'; c.fill(); }
    if(hx.thicket){ hexPath(c,x,y,s*0.86); c.setLineDash([3,3]); c.strokeStyle=hx.warded?'#9fe8a0':'#5aa04a'; c.lineWidth=2.5; c.stroke(); c.setLineDash([]); }
    if(hx.fire){ hexPath(c,x,y,s*0.9); c.fillStyle=`rgba(255,${100+60*Math.sin(T/120)},20,0.45)`; c.fill(); }
    if(reach&&reach[k]!=null&&k!==e.pos){ hexPath(c,x,y,s*0.9); c.strokeStyle='rgba(255,236,150,0.85)'; c.lineWidth=2; c.stroke(); }
    hexPath(c,x,y,s*0.98); c.strokeStyle='rgba(0,0,0,0.35)'; c.lineWidth=1; c.stroke();
  }
  // Sylvara's way to her next tree
  const sy=F.syl(S);
  if(sy&&!sy.wounded){ const next=S.trees.filter(t=>!t.done&&!t.dead).sort((a,b)=>F.dist(a.k,sy.pos)-F.dist(b.k,sy.pos))[0];
    if(next&&next.k!==sy.pos){ const p=F.path(S,sy.pos,next.k); if(p){ c.beginPath(); p.forEach((k,i)=>{ const [x,y]=hexXY(k); i?c.lineTo(x,y):c.moveTo(x,y); }); c.setLineDash([5,5]); c.strokeStyle='rgba(140,255,170,0.7)'; c.lineWidth=2; c.stroke(); c.setLineDash([]); } } }
  for(const k in S.hexes) drawContents(c,k,s,T);
  // signs
  for(const sg of S.signs){
    if(sg.k){ const [x,y]=hexXY(sg.k); const p=0.5+0.5*Math.sin(T/300); c.beginPath(); c.arc(x,y,s*(0.55+0.15*p),0,7); c.strokeStyle=`rgba(255,220,120,${0.35+0.4*p})`; c.lineWidth=2; c.stroke(); emoji(c,SIGN_ICON[sg.kind],x+s*0.45,y-s*0.45,s*0.42); }
    else { const a=-Math.PI/3*sg.dir; const r=Math.min(cw,ch)/2-14; const x=cw/2+view.ox*0+Math.cos(a)*r, y=ch/2+Math.sin(a)*r;
      c.beginPath(); c.arc(x,y,14,0,7); c.fillStyle='rgba(30,20,10,0.75)'; c.fill(); c.strokeStyle=sg.kind==='waaagh'?'#ff5544':'#e8c872'; c.lineWidth=2; c.stroke(); emoji(c,SIGN_ICON[sg.kind],x,y,16); }
  }
  // the selected hex
  if(ui.sel){ const [x,y]=hexXY(ui.sel); hexPath(c,x,y,s*0.98); c.strokeStyle='#ffe58a'; c.lineWidth=3; c.stroke(); }
}
function terrainMarks(c,k,hx,x,y,s,tiled){
  const r=(n)=>hash(k,n);
  c.save();
  if(tiled){   // the tile shows the ground; only what changes over the year goes on top
    if(hx.tree!=null){ const t=S.trees[hx.tree]; c.beginPath(); c.arc(x,y,s*0.72,-Math.PI/2,-Math.PI/2+Math.PI*2*(t.done?1:t.tended/F.TEND)); c.strokeStyle=t.dead?'#888':t.done?'#ffd76a':'#8cffaa'; c.lineWidth=3; c.stroke(); }
    if(hx.talan&&hx.build){ c.setLineDash([4,3]); c.strokeStyle='#e0b070'; c.lineWidth=2; c.strokeRect(x-s*0.18,y-s*0.85,s*0.36,s*0.3); c.setLineDash([]); }
    c.restore(); return;
  }
  if(hx.felled||hx.burnt){ for(let i=0;i<4;i++){ c.beginPath(); c.arc(x+(r(i)-0.5)*s*1.1,y+(r(i+9)-0.5)*s*1.0,s*0.08,0,7); c.fillStyle=hx.burnt?'#151311':'#a5845a'; c.fill(); } }
  else if(hx.t==='wood'||hx.t==='old'||hx.t==='hill'){ const n=hx.t==='old'?7:hx.t==='hill'?2:4; for(let i=0;i<n;i++){ const tx=x+(r(i)-0.5)*s*1.15, ty=y+(r(i+9)-0.5)*s*1.0; c.beginPath(); c.arc(tx,ty,s*(hx.t==='old'?0.2:0.16),0,7); c.fillStyle=hx.t==='old'?'#0f3018':'#1e4f26'; c.fill(); }
    if(hx.t==='hill'){ c.beginPath(); c.arc(x,y+s*0.35,s*0.55,Math.PI*1.1,Math.PI*1.9); c.strokeStyle='#3e4a1e'; c.lineWidth=2; c.stroke(); } }
  else if(hx.t==='glade'){ c.strokeStyle='#5d8a3a'; c.lineWidth=1; for(let i=0;i<5;i++){ const tx=x+(r(i)-0.5)*s, ty=y+(r(i+5)-0.5)*s*0.8; c.beginPath(); c.moveTo(tx,ty); c.lineTo(tx+2,ty-5); c.stroke(); } }
  else if(hx.t==='marsh'){ c.strokeStyle='#76b3c0'; c.lineWidth=1.5; for(let i=0;i<3;i++){ const ty=y+(i-1)*s*0.3; c.beginPath(); c.moveTo(x-s*0.4,ty); c.quadraticCurveTo(x,ty-4,x+s*0.4,ty); c.stroke(); } }
  else if(hx.t==='crag'){ c.fillStyle='#55504a'; for(let i=0;i<3;i++){ const tx=x+(r(i)-0.5)*s, ty=y+(r(i+3)-0.4)*s*0.7; c.beginPath(); c.moveTo(tx-s*0.18,ty+s*0.15); c.lineTo(tx,ty-s*0.22); c.lineTo(tx+s*0.18,ty+s*0.15); c.fill(); } }
  else if(hx.t==='lake'){ c.strokeStyle='rgba(200,230,255,0.4)'; c.lineWidth=1; c.beginPath(); c.moveTo(x-s*0.3,y); c.lineTo(x+s*0.1,y); c.stroke(); }
  if(hx.t==='home'){ emoji(c,'🏰',x,y,s*0.9); }
  if(hx.hamlet){ emoji(c,'🏡',x,y-s*0.1,s*0.7); }
  if(hx.tree!=null){ const t=S.trees[hx.tree]; emoji(c,t.dead?'🪵':'🌳',x,y-s*0.05,s*0.85);
    c.beginPath(); c.arc(x,y,s*0.6,-Math.PI/2,-Math.PI/2+Math.PI*2*(t.done?1:t.tended/F.TEND)); c.strokeStyle=t.dead?'#888':t.done?'#ffd76a':'#8cffaa'; c.lineWidth=3; c.stroke(); }
  if(hx.talan&&hx.t!=='home'){ c.fillStyle=hx.build?'rgba(160,110,60,0.5)':'#8a5a2b'; c.fillRect(x-s*0.12,y-s*0.85,s*0.24,s*0.3); c.fillRect(x-s*0.2,y-s*0.9,s*0.4,s*0.08); }
  c.restore();
}
function emoji(c,t,x,y,size){ c.font=`${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign='center'; c.textBaseline='middle'; c.fillText(t,x,y); }
function token(c,icon,x,y,r,col,n,alpha){
  c.save(); c.globalAlpha=alpha==null?1:alpha;
  c.beginPath(); c.arc(x,y,r,0,7); c.fillStyle=col; c.fill(); c.lineWidth=1.5; c.strokeStyle='rgba(0,0,0,0.6)'; c.stroke();
  emoji(c,icon,x,y+1,r*1.25);
  if(n!=null){ c.font=`bold ${Math.round(r*0.85)}px sans-serif`; c.fillStyle='#fff'; c.strokeStyle='#000'; c.lineWidth=3; c.strokeText(n,x+r*0.75,y+r*0.7); c.fillText(n,x+r*0.75,y+r*0.7); }
  c.restore();
}
// a figure standing on a little round base, feet at the base's middle; n is a count badge
function figure(c,img,x,y,r,col,n,alpha,base){
  c.save(); c.globalAlpha=alpha==null?1:alpha;
  const fy=y+r*0.55;
  if(base!==false){ c.beginPath(); c.ellipse(x,fy,r*0.95,r*0.36,0,0,7); c.fillStyle=col; c.fill(); c.lineWidth=1.2; c.strokeStyle='rgba(0,0,0,0.65)'; c.stroke(); }
  const h=r*2.6, w=h*img.width/img.height; c.drawImage(img,x-w/2,fy-h*0.97,w,h);
  if(n!=null){ c.font=`bold ${Math.round(r*0.85)}px sans-serif`; c.fillStyle='#fff'; c.strokeStyle='#000'; c.lineWidth=3; c.textAlign='center'; c.textBaseline='middle'; c.strokeText(n,x+r*0.85,fy-r*0.1); c.fillText(n,x+r*0.85,fy-r*0.1); }
  c.restore();
}
function drawContents(c,k,s,T){
  const [x,y]=hexXY(k), v=S.vis[k], r=Math.max(7,s*0.27);
  const slots=[[-0.42,0.3],[0.42,0.3],[0,-0.45],[-0.42,-0.15],[0.42,-0.15],[0,0.5]];
  let i=0; const put=()=>{ const p=slots[i++%slots.length]; return [x+p[0]*s, y+p[1]*s]; };
  // the wild: seen now, or remembered, faded
  let what=null, alpha=1;
  if(v==='clear') what=S.intel[k]&&S.intel[k].what||[];
  else if(S.intel[k]&&S.intel[k].what.length){ what=S.intel[k].what; alpha=Math.max(0.25,0.6-0.06*(S.turn-S.intel[k].turn)); }
  if(what) for(const w of what){ const [tx,ty]=put();
    const col=w.t==='orc'?(w.march?'#c0241b':'#7a2a1f'):w.t==='varg'?'#5c5a6e':w.t==='herd'?'#8a6a3a':'#4d5a20';
    const img=tokArt(w.t==='warren'?(w.fetish?'shaman':'goblin'):WILD_ART[w.t]);
    const n=w.t==='orc'&&w.gobs?w.n+'+':w.n;
    if(img){
      if(w.t==='orc'&&w.totem){ const tt=tokArt('totem'); if(tt) figure(c,tt,tx-r*1.05,ty-r*0.2,r*0.85,col,null,alpha,false); }
      figure(c,img,tx,ty,r,w.t==='warren'?'#3a2a14':col,n,alpha);
    } else token(c,TOKEN[w.t]||'?',tx,ty,r,col,n,alpha);
    if(w.t==='orc'&&w.drums&&alpha===1){ c.beginPath(); c.ellipse(tx,ty+r*0.55,r*(1.25+0.2*Math.sin(T/150)),r*(0.5+0.08*Math.sin(T/150)),0,0,7); c.strokeStyle='#ff4433'; c.lineWidth=2; c.stroke(); } }
  if(v==='dim'&&dimMoves(k)){ emoji(c,'❔',x,y,s*0.55); }
  // your elves
  const elves=S.elves.filter(e=>e.pos===k&&!e.wounded);
  for(const e of elves){ const [tx,ty]=put();
    const col=e.role==='sylvara'?'#2e9a55':e.role==='wizard'?'#5b3c99':'#c9a84c';
    const img=elfArt(e), rr=e.role==='sylvara'||e.role==='wizard'?r*1.15:r;
    if(img) figure(c,img,tx,ty,rr,col,null,1); else token(c,F.ROLES[e.role].icon,tx,ty,rr,col,null,1);
    if(e.id===ui.elf){ c.beginPath(); c.ellipse(tx,ty+rr*0.55,rr*1.2,rr*0.48,0,0,7); c.strokeStyle='#fff'; c.lineWidth=2; c.stroke(); }
    if(e.task&&e.task.t==='attack'){ emoji(c,'⚔',tx+r,ty-r,r); } }
}

window.addEventListener('DOMContentLoaded',()=>{ const b=$('btn-forest'); if(b) b.addEventListener('click',open); });
window.Forest={open, close, duelSpec, isOpen, _peek:()=>({S, ui, view, ctx})};   // _peek: for tests
})();
