// ── CONSTANTS ──────────────────────────────────────────────
const MAX_MANA=20;

// ── BUFF TILE-MATCH GLYPH SETS ──────────────────────────────
// 4 glyphs (indices into ALPHABET) per buff spell — thematic choices
const BUFF_TILE_GLYPHS={
  shield:      [4,8,10,11], // Ω ⊕ θ Φ — arch, binding, crystal, polar axis
  foresight:   [5,7,6,1],   // ∞ ✸ ☽ Δ — eternity, radiance, crescent, clarity
  flameshield: [0,4,7,8],   // ϟ Ω ✸ ⊕ — bolt, arch, burst, solar ward
  frostarmor:  [10,11,2,6], // θ Φ ∇ ☽ — crystal, axis, cold descent, frost moon
  stoneskin:   [1,2,3,8],   // Δ ∇ Ψ ⊕ — stone layers, fork, binding
  warpaint:    [0,3,9,7],   // ϟ Ψ ⊗ ✸ — bolt, trident, X-slash, burst
};

// ── CHARACTER DEFINITIONS (loaded from characters.json) ───────
let CHAR_DEFS={};
let p1Key='eldrad', p2Key='mal';
let p1Cfg, p2Cfg;

// One-line pitch on the character detail screen (stats come from characters.json)
const CHAR_FLAVOUR={
  eldrad:'Outlast your foe with arcane endurance.',
  mal:'Strike hard. Strike first. No mercy.',
  sylvara:"Sustain and control with nature's power.",
  aurelia:'Bend time — foresee attacks and drain your foe.',
  gnash:'Blood and bone. No magic — just fury.',
  cinder:'Roll the dice. Fan the flames. Win big or burn together.',
  skadi:'Glacial patience. Frozen fury. Every strike against her has a price.',
  zacharius:'Store the storm. Spend it wisely. Let them come to you.',
  mary:'Faith is the only shield that never breaks.',
  mordant:'The hex is already written. You just haven\'t felt it yet.',
  ponder:"Young but fierce — vanish from sight and plunder your foe's magic.",
  durin:'The mountain endures. Outlast every spell — stone by stone.',
  weizan:'Build blades slowly. Release all at once. Dispel kills your investment — protect it.',
  gretch:'Infect and drain. The totem heals you — guard it with a ward, or a Dispel will strip it.',
  valdris:'Deathless: a killing blow costs him 8 mana instead, while he has it. Drain his mana to kill him. Dispel his skeletons — but each dying skeleton heals him.',
  mirel:'Simulacra strike every round until dispelled. Bewitch turns the next strike against its caster.',
  thessaly:'Enthral blocks their wards. Spellbind taxes their favourite move. Weave turns strikes into mana denial.',
  korvath:'A dragon-bonded sorcerer who endures and burns. Save Ancient Wrath for the killing blow — you only get one.',
  fizzwick:'A goblin alchemist whose kit is a gamble — Caustic Bomb wears them down, Volatile Tonic patches you up or arms your next hit, and Unstable Concoction can swing wildly either way.',
  nyxara:'A void sorceress whose damage scales with what remains — Gravity Well and Event Horizon hit hardest early and taper off as HP drops, while Singularity grinds them down over time.',
};

// ── DIFFICULTY ─────────────────────────────────────────────
let diffName='normal';
let aiDifficulty='normal';

// ── ARCADE ─────────────────────────────────────────────────
const ARCADE_BOSSES=['gnash','zacharius','mal','mordant']; // fixed final-4 in arcade mode
let tournamentQueue=[];   // ordered opponent keys
let tournamentIndex=0;    // index of current opponent in queue

// ── STATE ──────────────────────────────────────────────────
let gs={}, aiTid=null;
let bW=0, bH=0;
let mazeRAF=null, mazeTid=null;
let retryCountdownId=null;

// ── 2 PLAYER MODE ─────────────────────────────────────────
let twoPlayerMode=false;
// 3–4 wizard duels on one device: multiSetup is chosen on the setup screen, multiPicks on the character screen
let multiMode=false, multiPicks=[];
const multiSetup={n:4, format:'ffa', human:[true,true,false,false]};
let twoPlayerPhase=1; // 1=p1 picking, 2=p2 picking
let matchRound=0;
let p1MatchWins=0, p2MatchWins=0;

// ── SIMULTANEOUS TURNS ────────────────────────────────────
// Seats in pick order. Everything round-based (picking, reveal, ticks, resolution)
// iterates this list so 3–4 player duels only need more seats here.
const PLAYERS=['p1','p2'];
// A 3–4 seat duel: [{who,key,team}]. null = the usual two seats from the p1 / p2 picks.
// Seats sharing a team are allies; with no team every seat fights alone (free-for-all).
let seatSetup=null;
function setupSeats(list){
  seatSetup=list?list.map((st,i)=>Object.assign({who:'p'+(i+1)},st)):null;
  PLAYERS.length=0;
  (seatSetup||[{who:'p1'},{who:'p2'}]).forEach(st=>PLAYERS.push(st.who));
}
let _rng=Math.random;       // replaceable RNG for deterministic replay
let deferWinCheck=false;    // suppress checkWin during double-KO resolution
let pendingWin=null;        // {won} accumulated during deferred win check

// ── TRAINING MODE ──────────────────────────────────────────
let trainingMode=false;
let trainingAI=true;
let trainingPickPhase=null; // 'p1' or 'p2' — which side is being chosen

function newSeat(cfg,key){
  return {key, cfg, hp:cfg.hp, maxHp:cfg.hp, mana:ELEM_START_MANA,
    shield:0, shieldHp:0, shieldType:null, wardRetaliate:0, wardSig:null,   // ward (shield = rounds left)
    effects:[], usedSig:{}, lastElem:null, lastCat:null, lastLockedRound:null, lastRoundLoss:0,
    blades:0, skeletons:[], simulacra:[]};   // minion counts mirrored for drawWiz
}
function newState(){
  gs={
    round:1, myTurn:true, busy:false,
    p1anim:'idle', p2anim:'idle', p1xOff:0, p2xOff:0,
    parts:[], floats:[], projs:[], beams:[], manaBurnFires:[],
    pending:{},   // who → committed action {type:'el',cat,elem,tier,sig?,self?,target,ok}, hidden until reveal
    turnPlayer:'p1', lastAnimEnd:0,
  };
  const seats=seatSetup||[{who:'p1',cfg:p1Cfg,key:p1Key},{who:'p2',cfg:p2Cfg,key:p2Key}];
  seats.forEach(st=>{
    gs[st.who]=newSeat(st.cfg||CHAR_DEFS[st.key],st.key);
    gs[st.who].team=st.team||st.who;
    if(gs[st.who+'anim']==null){ gs[st.who+'anim']='idle'; gs[st.who+'xOff']=0; }
  });
}

// ── SCREENS ────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const pzExit=document.getElementById('btn-pz-exit');
  if(pzExit) pzExit.style.display=(id==='puzzle-screen'&&trainingMode)?'':'none';
}

// ── ARCADE LADDER ──────────────────────────────────────────
function buildBracket(){
  const track=document.getElementById('bracket-track');
  track.innerHTML='';
  tournamentQueue.forEach((oppKey,i)=>{
    const oppCfg=CHAR_DEFS[oppKey];
    const isFinal=i===tournamentQueue.length-1;
    const isBossRound=ARCADE_BOSSES.includes(oppKey);
    const col=document.createElement('div');
    col.className='bracket-round';
    col.dataset.round=i;
    if(isFinal) col.classList.add('is-final');
    let rlabel;
    if(isFinal) rlabel='☆ FINAL ☆';
    else if(isBossRound){
      const bossIdx=i-(tournamentQueue.length-ARCADE_BOSSES.length)+1;
      rlabel='Boss '+bossIdx;
    } else rlabel='Round '+(i+1);
    col.innerHTML=
      '<div class="bracket-rlabel">'+rlabel+'</div>'+
      '<div class="bracket-slot bslot-player"><img src="portraits/'+p1Key+'.png" alt="'+p1Cfg.name+'"></div>'+
      '<div class="bracket-cross">⚔</div>'+
      '<div class="bracket-slot bslot-opp" id="bopp-'+i+'">'+
        '<img src="portraits/'+oppKey+'.png" alt="'+oppCfg.name+'">'+
        '<div class="bslot-name">'+oppCfg.name+'</div>'+
        (isBossRound||isFinal?'<div class="bslot-boss">'+(isFinal?'FINAL BOSS':'BOSS')+'</div>':'')+
      '</div>';
    track.appendChild(col);
    if(i<tournamentQueue.length-1){
      const arr=document.createElement('div');
      arr.className='bracket-arrow';
      arr.textContent='▲';
      track.appendChild(arr);
    }
  });
}

function showBracket(animate){
  buildBracket();
  const nextKey=tournamentQueue[tournamentIndex];
  const nextCfg=CHAR_DEFS[nextKey];
  const btn=document.getElementById('bracket-btn');
  btn.textContent=animate?('⚔ Fight '+nextCfg.name+' →'):'⚔ Begin Arcade';
  btn.style.borderColor=nextCfg.col||'#c9a84c';
  btn.style.color=nextCfg.col||'#c9a84c';

  tournamentQueue.forEach((oppKey,i)=>{
    const col=document.querySelector('#bracket-track .bracket-round[data-round="'+i+'"]');
    if(!col) return;
    if(i<tournamentIndex){
      col.classList.add('br-won');
    } else if(i===tournamentIndex){
      const oppSlot=col.querySelector('.bslot-opp');
      oppSlot.style.borderColor=CHAR_DEFS[oppKey].col||'#c9a84c';
      if(animate){
        col.classList.add('br-upcoming');
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          col.classList.remove('br-upcoming');
          col.classList.add('br-active','br-arrive');
          setTimeout(()=>col.classList.remove('br-arrive'),650);
        }));
      } else {
        col.classList.add('br-active');
      }
    } else {
      col.classList.add('br-upcoming');
    }
  });

  showScreen('tournament-screen');

  if(animate){
    setTimeout(()=>{
      const activeCol=document.querySelector('#bracket-track .bracket-round.br-active');
      if(activeCol) activeCol.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    },400);
  }
}

// ── BATTLE CANVAS ──────────────────────────────────────────
const bc=document.getElementById('bcanvas');
const bx=bc.getContext('2d');

// The canvas fills the stage between HUD and action bar. The scene itself (bW × bH) is at most
// BC_MAX_ASPECT × the width tall — wizards, projectiles and floats are placed as fractions of bH,
// so a taller scene would leave effects floating far above the wizards and push shield bubbles
// off the sides. The scene is centred (bOffY) and its sky and ground are stretched into the
// bands above and below it.
const BC_MIN_ASPECT=0.52, BC_MAX_ASPECT=0.85;
let bOffY=0;
function resizeBC(){
  const stage=bc.parentElement;
  bW=stage.clientWidth;
  bH=Math.round(Math.max(bW*BC_MIN_ASPECT,Math.min(stage.clientHeight,bW*BC_MAX_ASPECT)));
  const fullH=Math.max(bH,stage.clientHeight);
  bOffY=Math.round((fullH-bH)/2);
  bc.width=bW; bc.height=fullH;
}

// Extend the scene's top and bottom pixel rows through the bands around it
function fillSceneBands(){
  const below=bc.height-bOffY-bH;
  if(bOffY>0) bx.drawImage(bc,0,bOffY,bW,1,0,0,bW,bOffY);
  if(below>0) bx.drawImage(bc,0,bOffY+bH-1,bW,1,0,bOffY+bH,bW,below);
}

function drawBG(){
  ({eldrad:drawBG_moonlight,mal:drawBG_hellfire,sylvara:drawBG_forest,
    aurelia:drawBG_dawn,gnash:drawBG_storm,ponder:drawBG_astral,
    skadi:drawBG_winter,cinder:drawBG_embers,zacharius:drawBG_arc,mary:drawBG_holy,mordant:drawBG_abyss,
    durin:drawBG_stone}[p2Key]||drawBG_moonlight)();
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function runeRing(cx,cy,r,c){
  bx.strokeStyle=c; bx.lineWidth=1;
  bx.beginPath(); bx.arc(cx,cy,r,0,Math.PI*2); bx.stroke();
  bx.beginPath(); bx.arc(cx,cy,r*.6,0,Math.PI*2); bx.stroke();
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;
    bx.beginPath(); bx.moveTo(cx+Math.cos(a)*r*.6,cy+Math.sin(a)*r*.6);
    bx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); bx.stroke();
  }
}

function drawBG_moonlight(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#09041a'); g.addColorStop(1,'#1a0830');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  [[20,10],[80,15],[140,8],[200,20],[300,6],[380,18],[440,12],[60,30],[250,25],[420,5]].forEach(([sx,sy])=>{
    bx.globalAlpha=0.3+0.4*Math.sin(Date.now()/900+sx);
    bx.fillStyle='#fff'; bx.fillRect(sx*(bW/480),sy*(bH/250),1.5,1.5);
  });
  bx.globalAlpha=1;
  bx.fillStyle='#e8d4a0'; bx.shadowColor='#e8d4a0'; bx.shadowBlur=20;
  bx.beginPath(); bx.arc(bW*.5,bH*.16,bH*.1,0,Math.PI*2); bx.fill();
  bx.fillStyle='#09041a'; bx.shadowBlur=0;
  bx.beginPath(); bx.arc(bW*.5+bH*.04,bH*.14,bH*.09,0,Math.PI*2); bx.fill();
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#1a0a30'); gg.addColorStop(1,'#0a0418');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(138,58,170,0.38)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_hellfire(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#0d0000'); g.addColorStop(1,'#2d0606');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  [[30],[90],[150],[230],[310],[370],[440],[60],[200],[420]].forEach(([ex],i)=>{
    const rise=((t/2000+i*0.3)%1);
    const y=bH*(0.72-rise*0.65);
    bx.globalAlpha=(rise<0.8?0.7*Math.abs(Math.sin(t/300+i))*(1-rise/0.8):0);
    bx.fillStyle=rise<0.3?'#ff6600':rise<0.6?'#ff3300':'#cc1100';
    bx.shadowColor=bx.fillStyle; bx.shadowBlur=4;
    bx.fillRect(ex*(bW/480),y,1.5,1.5);
  });
  bx.globalAlpha=1; bx.shadowBlur=0;
  bx.fillStyle='#cc2200'; bx.shadowColor='#ff2200'; bx.shadowBlur=25;
  bx.beginPath(); bx.arc(bW*.5,bH*.16,bH*.09,0,Math.PI*2); bx.fill();
  bx.shadowBlur=0;
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#2d0808'); gg.addColorStop(1,'#150202');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(200,50,20,0.5)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_forest(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#010c04'); g.addColorStop(1,'#051a0a');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  [[40,20],[110,35],[180,15],[260,28],[320,18],[390,32],[450,22],[70,40],[220,12],[410,38]].forEach(([fx,fy],i)=>{
    bx.globalAlpha=0.2+0.8*Math.abs(Math.sin(t/1200+i*1.3));
    bx.fillStyle='#88ffaa'; bx.shadowColor='#44ff88'; bx.shadowBlur=6;
    bx.fillRect(fx*(bW/480),fy*(bH/250),2,2);
  });
  bx.globalAlpha=1; bx.shadowBlur=0;
  bx.fillStyle='#c8e8d0'; bx.shadowColor='#88ddaa'; bx.shadowBlur=18;
  bx.beginPath(); bx.arc(bW*.75,bH*.15,bH*.075,0,Math.PI*2); bx.fill();
  bx.fillStyle='#010c04'; bx.shadowBlur=0;
  bx.beginPath(); bx.arc(bW*.75+bH*.035,bH*.13,bH*.065,0,Math.PI*2); bx.fill();
  bx.fillStyle='#020d04';
  [[0.05,0.04,0.18],[0.12,0.035,0.16],[0.19,0.03,0.14],
   [0.81,0.04,0.18],[0.88,0.035,0.16],[0.95,0.03,0.14]].forEach(([cx,hw,ht])=>{
    bx.beginPath(); bx.moveTo(bW*cx,bH*(0.72-ht));
    bx.lineTo(bW*(cx-hw),bH*0.72); bx.lineTo(bW*(cx+hw),bH*0.72);
    bx.closePath(); bx.fill();
  });
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#051a08'); gg.addColorStop(1,'#020c04');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(44,120,60,0.4)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_dawn(){
  const g=bx.createLinearGradient(0,0,0,bH*.72);
  g.addColorStop(0,'#08051a'); g.addColorStop(0.5,'#2a0f00'); g.addColorStop(1,'#8b3a00');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH*.72);
  [[20,10],[80,15],[140,8],[200,20],[380,18],[440,12]].forEach(([sx,sy])=>{
    bx.globalAlpha=0.15+0.1*Math.sin(Date.now()/900+sx);
    bx.fillStyle='#fff'; bx.fillRect(sx*(bW/480),sy*(bH/250),1.5,1.5);
  });
  bx.globalAlpha=1;
  const sunY=bH*.72;
  bx.fillStyle='#ffdd44'; bx.shadowColor='#ffaa00'; bx.shadowBlur=30;
  bx.beginPath(); bx.arc(bW*.5,sunY,bH*.1,Math.PI,2*Math.PI); bx.fill();
  bx.shadowBlur=0;
  bx.strokeStyle='rgba(255,200,50,0.15)'; bx.lineWidth=bH*.02;
  for(let i=0;i<9;i++){
    const a=Math.PI+i*(Math.PI/8);
    bx.beginPath(); bx.moveTo(bW*.5+Math.cos(a)*bH*.12,sunY+Math.sin(a)*bH*.12);
    bx.lineTo(bW*.5+Math.cos(a)*bH*.3,sunY+Math.sin(a)*bH*.3); bx.stroke();
  }
  const hg=bx.createLinearGradient(0,bH*.5,0,bH*.72);
  hg.addColorStop(0,'rgba(200,80,0,0)'); hg.addColorStop(1,'rgba(200,80,0,0.3)');
  bx.fillStyle=hg; bx.fillRect(0,bH*.5,bW,bH*.22);
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#2a1200'); gg.addColorStop(1,'#120800');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(200,120,30,0.5)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_storm(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#06050a'); g.addColorStop(1,'#1a1408');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  bx.fillStyle='#1a1820';
  [[0.2,0.12,0.18,0.1],[0.5,0.08,0.22,0.12],[0.75,0.14,0.16,0.09]].forEach(([cx,cy,cw,ch])=>{
    bx.beginPath(); bx.ellipse(bW*cx,bH*cy,bW*cw,bH*ch,0,0,Math.PI*2); bx.fill();
  });
  const t=Date.now();
  for(let i=0;i<20;i++){
    const rx=((i*47+t/30)%480)*(bW/480);
    const ry=((i*31+t/20)%130)*(bH/180);
    bx.globalAlpha=0.2+0.1*Math.sin(t/200+i);
    bx.strokeStyle='#7788aa'; bx.lineWidth=0.5;
    bx.beginPath(); bx.moveTo(rx,ry); bx.lineTo(rx-2*(bW/480),ry+8*(bH/250)); bx.stroke();
  }
  bx.globalAlpha=1;
  const flash=Math.sin(t/400)*Math.sin(t/137)*Math.sin(t/71);
  if(flash>0.7){
    bx.globalAlpha=(flash-0.7)*3*0.3;
    bx.fillStyle='#aabbff'; bx.fillRect(0,0,bW,bH*.72);
    bx.globalAlpha=1;
  }
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#1a1206'); gg.addColorStop(1,'#0a0804');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(150,130,80,0.4)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_astral(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#020006'); g.addColorStop(1,'#080014');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  [[20,10],[80,15],[140,8],[200,20],[300,6],[380,18],[440,12],[60,30],[250,25],[420,5],
   [35,22],[120,5],[170,28],[280,14],[340,22],[400,8],[460,18],[15,38],[290,35],[370,28]].forEach(([sx,sy],i)=>{
    bx.globalAlpha=0.2+0.6*Math.abs(Math.sin(t/1100+i*0.7));
    bx.fillStyle=i%3===0?'#ddaaff':i%3===1?'#aaddff':'#fff';
    bx.fillRect(sx*(bW/480),sy*(bH/250),1.5,1.5);
  });
  bx.globalAlpha=1;
  const nb=bx.createRadialGradient(bW*.5,bH*.25,0,bW*.5,bH*.25,bW*.25);
  nb.addColorStop(0,'rgba(80,20,140,0.15)'); nb.addColorStop(0.5,'rgba(40,10,80,0.08)'); nb.addColorStop(1,'rgba(0,0,0,0)');
  bx.fillStyle=nb; bx.fillRect(0,0,bW,bH*.6);
  [[0.3,0.2],[0.65,0.15],[0.5,0.35]].forEach(([ox,oy],i)=>{
    const pulse=0.4+0.3*Math.sin(t/800+i*2.1);
    bx.globalAlpha=pulse*0.6;
    bx.fillStyle='#cc88ff'; bx.shadowColor='#9944ee'; bx.shadowBlur=12;
    bx.beginPath();
    bx.arc(bW*ox+Math.cos(t/2000+i)*bW*0.02,bH*oy+Math.sin(t/1800+i)*bH*0.02,bH*.012,0,Math.PI*2);
    bx.fill();
  });
  bx.globalAlpha=1; bx.shadowBlur=0;
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#0c0020'); gg.addColorStop(1,'#050010');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(120,60,200,0.45)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

const BG_EMBER_X=[40,100,170,240,320,390,450,70,200,420,130,310];
const BG_WINTER_STARS=[[30,5],[90,12],[150,7],[220,18],[300,4],[370,15],[440,10],[60,28],[240,22],[410,8],[20,35],[110,3],[180,25],[280,11],[340,20],[400,6],[460,16]];

function drawBG_embers(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#0d0500'); g.addColorStop(1,'#1a0a02');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  BG_EMBER_X.forEach((ex,i)=>{
    const rise=((t/1800+i*0.37)%1);
    const y=bH*(0.9-rise*0.8);
    bx.globalAlpha=(rise<0.7?0.9*(1-rise/0.7):0)*Math.abs(Math.sin(t/200+i));
    bx.fillStyle=rise<0.4?'#ffaa00':rise<0.6?'#ff6600':'#ff3300';
    bx.shadowColor=bx.fillStyle; bx.shadowBlur=4;
    bx.beginPath(); bx.arc(ex*(bW/480),y,1.5,0,Math.PI*2); bx.fill();
  });
  bx.globalAlpha=1; bx.shadowBlur=0;
  bx.fillStyle='#ff8800'; bx.shadowColor='#ff5500'; bx.shadowBlur=28;
  bx.beginPath(); bx.arc(bW*.5,bH*.16,bH*.085,0,Math.PI*2); bx.fill();
  bx.shadowBlur=0;
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#1a0800'); gg.addColorStop(1,'#0d0400');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(200,80,20,0.5)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_winter(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#010820'); g.addColorStop(1,'#030f2a');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  BG_WINTER_STARS.forEach(([sx,sy],i)=>{
    bx.globalAlpha=0.25+0.5*Math.abs(Math.sin(t/700+i*0.9));
    bx.fillStyle='#ccddff'; bx.fillRect(sx*(bW/480),sy*(bH/250),1.5,1.5);
  });
  bx.globalAlpha=1;
  bx.fillStyle='#ddeeff'; bx.shadowColor='#aaccff'; bx.shadowBlur=22;
  bx.beginPath(); bx.arc(bW*.5,bH*.14,bH*.09,0,Math.PI*2); bx.fill();
  bx.shadowBlur=0;
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#0a1835'); gg.addColorStop(1,'#04101f');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(136,200,255,0.35)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  [[0.15,0.75,0.04],[0.35,0.78,0.03],[0.65,0.76,0.035],[0.85,0.74,0.042]].forEach(([cx2,cy2,cr])=>{
    bx.strokeStyle=`rgba(136,221,255,${0.22+0.1*Math.sin(t/600+cx2*10)})`;
    bx.lineWidth=1;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      bx.beginPath(); bx.moveTo(bW*cx2,bH*cy2);
      bx.lineTo(bW*cx2+Math.cos(a)*bW*cr,bH*cy2+Math.sin(a)*bH*cr*0.6); bx.stroke();
    }
  });
  seatRunes();
}

function drawBG_arc(){
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#030810'); g.addColorStop(1,'#060d14');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  const t=Date.now();
  // Distant storm clouds
  [[0.15,0.18],[0.42,0.12],[0.68,0.20],[0.88,0.14]].forEach(([cx2,cy2],i)=>{
    bx.globalAlpha=0.12+0.05*Math.sin(t/900+i);
    bx.fillStyle='#1a2244';
    bx.beginPath(); bx.ellipse(bW*cx2,bH*cy2,bW*0.18,bH*0.07,0,0,Math.PI*2); bx.fill();
  });
  bx.globalAlpha=1;
  // Electric arc flashes
  const arcPhase=(t%2200)/2200;
  if(arcPhase<0.12){
    const bright=Math.sin(arcPhase/0.12*Math.PI);
    bx.globalAlpha=bright*0.55;
    bx.strokeStyle='#aaff44'; bx.lineWidth=1.5; bx.shadowColor='#aaff44'; bx.shadowBlur=12;
    const ax=bW*(0.3+Math.sin(t/370)*0.25), ay=0, steps=7;
    bx.beginPath(); bx.moveTo(ax,ay);
    for(let i=1;i<=steps;i++){
      bx.lineTo(ax+(_rng()-.5)*bW*0.07, ay+bH*0.65*(i/steps));
    }
    bx.stroke();
    bx.shadowBlur=0;
  }
  const arc2Phase=((t+1100)%2200)/2200;
  if(arc2Phase<0.10){
    const bright=Math.sin(arc2Phase/0.10*Math.PI);
    bx.globalAlpha=bright*0.45;
    bx.strokeStyle='#88ffdd'; bx.lineWidth=1; bx.shadowColor='#88ffdd'; bx.shadowBlur=8;
    const ax2=bW*(0.6+Math.cos(t/510)*0.2), ay2=bH*0.05, steps=5;
    bx.beginPath(); bx.moveTo(ax2,ay2);
    for(let i=1;i<=steps;i++){
      bx.lineTo(ax2+(_rng()-.5)*bW*0.05, ay2+bH*0.55*(i/steps));
    }
    bx.stroke();
    bx.shadowBlur=0;
  }
  bx.globalAlpha=1;
  // Ground glow
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#0a1a0a'); gg.addColorStop(1,'#040a04');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle=`rgba(170,255,68,${0.25+0.1*Math.sin(t/400)})`; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  seatRunes();
}

function drawBG_abyss(){
  const t=Date.now();
  // Dark void with purple depth
  const sg=bx.createLinearGradient(0,0,0,bH);
  sg.addColorStop(0,'#080010'); sg.addColorStop(1,'#100018');
  bx.fillStyle=sg; bx.fillRect(0,0,bW,bH);
  // Drifting skull-like dark clouds
  [[0.2,0.15],[0.55,0.10],[0.8,0.20],[0.4,0.25]].forEach(([cx2,cy2],i)=>{
    bx.globalAlpha=0.08+0.04*Math.sin(t/1100+i);
    bx.fillStyle='#330044';
    bx.beginPath(); bx.ellipse(bW*cx2+Math.sin(t/4000+i)*bW*0.02,bH*cy2,bW*0.13,bH*0.055,0,0,Math.PI*2); bx.fill();
  });
  bx.globalAlpha=1;
  // Floating dark motes drifting upward
  const seed=Math.floor(t/5000);
  for(let i=0;i<14;i++){
    const px=((seed*19+i*41)%100)/100*bW;
    const drift=((t/1800+i*0.7)%1)*bH*0.6;
    const py=bH*0.6-drift;
    bx.globalAlpha=(0.3+0.2*Math.sin(t/500+i))*0.55;
    bx.fillStyle=i%3===0?'#9944cc':i%3===1?'#440066':'#661199';
    bx.shadowColor=bx.fillStyle; bx.shadowBlur=5;
    bx.beginPath(); bx.arc(px,py,1.2,0,Math.PI*2); bx.fill();
  }
  bx.globalAlpha=1; bx.shadowBlur=0;
  // Purple ground with hex-crack glow
  const gg=bx.createLinearGradient(0,bH*.68,0,bH);
  gg.addColorStop(0,'#12001a'); gg.addColorStop(1,'#080010');
  bx.fillStyle=gg; bx.fillRect(0,bH*.68,bW,bH*.32);
  bx.strokeStyle=`rgba(153,68,204,${0.22+0.1*Math.sin(t/700)})`; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.68); bx.lineTo(bW,bH*.68); bx.stroke();
  seatRunes();
}

function drawBG_holy(){
  const t=Date.now();
  // Dark cathedral sky
  const sg=bx.createLinearGradient(0,0,0,bH*.65);
  sg.addColorStop(0,'#120e04'); sg.addColorStop(1,'#1a1408');
  bx.fillStyle=sg; bx.fillRect(0,0,bW,bH*.65);
  // Ground
  const gg=bx.createLinearGradient(0,bH*.65,0,bH);
  gg.addColorStop(0,'#1a1200'); gg.addColorStop(1,'#0a0800');
  bx.fillStyle=gg; bx.fillRect(0,bH*.65,bW,bH*.35);
  // Slow rotating light rays from above
  bx.save();
  bx.translate(bW*.5,-bH*.05);
  for(let i=0;i<8;i++){
    const angle=(i/8)*Math.PI*2+t/10000;
    bx.fillStyle=`rgba(240,210,120,${0.03+0.015*Math.sin(t/2000+i)})`;
    bx.beginPath();
    bx.moveTo(0,0);
    const sp=0.13;
    bx.lineTo(Math.cos(angle-sp)*bH*1.4,Math.sin(angle-sp)*bH*1.4);
    bx.lineTo(Math.cos(angle+sp)*bH*1.4,Math.sin(angle+sp)*bH*1.4);
    bx.closePath(); bx.fill();
  }
  bx.restore();
  // Golden horizon glow
  bx.globalAlpha=0.12+0.04*Math.sin(t/2500);
  bx.fillStyle='#f0d060'; bx.fillRect(0,bH*.58,bW,bH*.12);
  bx.globalAlpha=1;
  // Floating holy motes
  const seed=Math.floor(t/4000);
  for(let i=0;i<10;i++){
    const px=((seed*17+i*43)%100)/100*bW;
    const py=bH*(0.08+((seed*11+i*31)%55)/100);
    bx.globalAlpha=(0.25+0.2*Math.sin(t/700+i*1.4))*0.6;
    bx.fillStyle='#ffe090'; bx.shadowColor='#ffe090'; bx.shadowBlur=5;
    bx.beginPath(); bx.arc(px,py,1.5,0,Math.PI*2); bx.fill();
  }
  bx.globalAlpha=1; bx.shadowBlur=0;
  // Ground horizon line
  bx.strokeStyle=`rgba(240,210,120,${0.2+0.08*Math.sin(t/1800)})`; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.65); bx.lineTo(bW,bH*.65); bx.stroke();
  seatRunes();
}

function drawBG_stone(){
  const t=Date.now();
  const g=bx.createLinearGradient(0,0,0,bH);
  g.addColorStop(0,'#100d08'); g.addColorStop(0.6,'#1c1508'); g.addColorStop(1,'#0a0804');
  bx.fillStyle=g; bx.fillRect(0,0,bW,bH);
  // Stone floor
  const fg=bx.createLinearGradient(0,bH*.68,0,bH);
  fg.addColorStop(0,'#2a1e0e'); fg.addColorStop(1,'#160e06');
  bx.fillStyle=fg; bx.fillRect(0,bH*.68,bW,bH*.32);
  // Crack lines in the floor
  bx.strokeStyle='rgba(180,130,60,0.1)'; bx.lineWidth=1;
  [[0.1,0.75,0.22,0.82],[0.35,0.70,0.45,0.78],[0.55,0.73,0.62,0.85],[0.78,0.71,0.88,0.79]].forEach(([x1,y1,x2,y2])=>{
    bx.beginPath(); bx.moveTo(bW*x1,bH*y1); bx.lineTo(bW*x2,bH*y2); bx.stroke();
  });
  // Floating stone dust motes
  const seed=Math.floor(t/5000);
  for(let i=0;i<12;i++){
    const px=((seed*13+i*37)%100)/100*bW;
    const py=bH*(0.15+((seed*7+i*29)%50)/100);
    bx.globalAlpha=(0.15+0.1*Math.sin(t/900+i*1.7))*0.7;
    bx.fillStyle='#c09050';
    bx.beginPath(); bx.arc(px,py,1.2,0,Math.PI*2); bx.fill();
  }
  bx.globalAlpha=1;
  // Amber cave glow from below
  const rg=bx.createRadialGradient(bW*.5,bH*.9,bH*.02,bW*.5,bH*.9,bH*.55);
  rg.addColorStop(0,'rgba(176,128,64,0.07)'); rg.addColorStop(1,'rgba(0,0,0,0)');
  bx.fillStyle=rg; bx.fillRect(0,0,bW,bH);
  // Horizon line
  bx.strokeStyle=`rgba(176,128,64,${0.18+0.06*Math.sin(t/2200)})`; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.68); bx.lineTo(bW,bH*.68); bx.stroke();
  seatRunes();
}

// ── SPRITESHEET CONFIG ─────────────────────────────────────
const SPRITE_CFG={
  frameW:48, frameH:64, frames:4,
  animRows:{idle:0,cast:1,hit:2,shield:3,death:4},
};
// Two sprite kinds: the old 4x5 spritesheets above (facing left), or a single
// full-body still of any other size (facing right, animated by drawWiz's bob/lift/shake).
function isSpriteSheet(img){
  return img.naturalWidth===SPRITE_CFG.frameW*4&&img.naturalHeight===SPRITE_CFG.frameH*5;
}
// Draws a sprite standing at (x,y), sz tall. flip = the p1 seat (face right).
function drawSprite(img,animName,frame,x,y,sz,flip){
  bx.save();
  if(isSpriteSheet(img)){
    const cfg=SPRITE_CFG;
    const row=cfg.animRows[animName]??cfg.animRows.idle;
    const srcX=frame*cfg.frameW, srcY=row*cfg.frameH;
    const scale=sz/cfg.frameH, dw=cfg.frameW*scale, dh=cfg.frameH*scale;
    if(flip){ bx.scale(-1,1); x=-x; }
    bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,x-dw/2,y-dh,dw,dh);
  } else {
    const dh=sz*1.04, dw=dh*img.naturalWidth/img.naturalHeight;
    if(!flip){ bx.scale(-1,1); x=-x; }
    if(animName==='death') bx.globalAlpha*=0.45;
    bx.drawImage(img,x-dw/2,y-dh,dw,dh);
  }
  bx.restore();
}
const sprites={p1:null,p2:null};
const spriteStatus={p1:'loading',p2:'loading'};

function loadSprites(){
  const seats=seatSetup?seatSetup.map(st=>[st.who,CHAR_DEFS[st.key]]):[['p1',p1Cfg],['p2',p2Cfg]];
  ['p1','p2','p3','p4'].forEach(w=>{ sprites[w]=null; spriteStatus[w]='failed'; });
  seats.forEach(([w,cfg])=>{
    if(!cfg) return;
    spriteStatus[w]='loading';
    const img=new Image();
    img.onload =()=>{sprites[w]=img; spriteStatus[w]='ready';};
    img.onerror=()=>{spriteStatus[w]='failed';};
    img.src=cfg.sprite;
  });
}
// Each seat's rune circle on the arena floor
function seatRunes(){
  if(PLAYERS.length<=2||!gs[PLAYERS[0]]){
    runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
    if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
    return;
  }
  PLAYERS.forEach(w=>runeRing(seatX(w),bH*.83,20,`rgba(${hexToRgb(seatCfg(w).col)},0.13)`));
}

const animState={p1:{frame:0,timer:0},p2:{frame:0,timer:0}};
const FRAME_MS=180;
const ANIM_FRAMES={idle:3,cast:4,hit:2,shield:2,death:4};

function tickAnimFrame(who,dt){
  const a=animState[who]||(animState[who]={frame:0,timer:0});
  a.timer+=dt;
  if(a.timer>=FRAME_MS){
    a.timer-=FRAME_MS;
    const animName=gs[who+'anim'];
    const frameCount=ANIM_FRAMES[animName]??SPRITE_CFG.frames;
    const next=a.frame+1;
    a.frame=animName==='death'?Math.min(next,frameCount-1):next%frameCount;
  }
}

let lastFrameTime=0;

function drawWiz(x,y,sz,col,flip,animName,shielded,wardActive,who,foresightActive,state){
  bx.save();
  const t=Date.now();
  if(foresightActive){
    const cy=y-sz*.5;
    for(let i=0;i<3;i++){
      const a=t/900+i/3*Math.PI*2;
      const ox=Math.cos(a)*sz*.85, oy=Math.sin(a)*sz*.45;
      const pulse=0.55+0.35*Math.sin(t/400+i*2.1);
      bx.beginPath(); bx.arc(x+ox,cy+oy,sz*.09,0,Math.PI*2);
      bx.fillStyle=`rgba(255,204,68,${pulse})`; bx.fill();
      bx.strokeStyle=`rgba(255,240,160,${pulse*0.8})`; bx.lineWidth=1; bx.stroke();
    }
    const halo=0.07+0.04*Math.sin(t/350);
    bx.beginPath(); bx.arc(x,cy,sz*.8,0,Math.PI*2);
    bx.strokeStyle=`rgba(255,204,68,${halo*5})`; bx.lineWidth=2; bx.stroke();
  }
  if(shielded>0){
    const boosted=state&&state.counter;
    const gv=0.08+0.05*Math.sin(t/300);
    bx.beginPath(); bx.arc(x,y-sz*.5,sz*.75,0,Math.PI*2);
    if(boosted){
      // Gold-cyan blend fill with higher opacity when counter is active
      bx.fillStyle=`rgba(180,240,120,${gv*2.5})`; bx.fill();
      bx.shadowColor='#ffd700'; bx.shadowBlur=18;
      bx.strokeStyle=`rgba(255,215,0,${0.55+0.35*Math.sin(t/200)})`; bx.lineWidth=3; bx.stroke();
      bx.shadowBlur=0;
      // Second inner ring for depth
      bx.beginPath(); bx.arc(x,y-sz*.5,sz*.6,0,Math.PI*2);
      bx.strokeStyle=`rgba(74,240,255,${gv*4})`; bx.lineWidth=1.5; bx.stroke();
    } else {
      bx.fillStyle=`rgba(74,240,255,${gv})`; bx.fill();
      bx.strokeStyle=`rgba(74,240,255,${gv*5})`; bx.lineWidth=1.5; bx.stroke();
    }
  }
  if(wardActive>0){
    const gv=0.06+0.04*Math.sin(t/280);
    bx.save();
    bx.translate(x,y-sz*.5);
    bx.rotate(t/1200);
    bx.strokeStyle=`rgba(255,204,68,${gv*6})`; bx.lineWidth=1.5;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;
      bx.beginPath();
      bx.moveTo(Math.cos(a)*sz*.5,Math.sin(a)*sz*.5);
      bx.lineTo(Math.cos(a)*sz*.75,Math.sin(a)*sz*.75);
      bx.stroke();
    }
    bx.beginPath(); bx.arc(0,0,sz*.75,0,Math.PI*2);
    bx.strokeStyle=`rgba(255,204,68,${gv*4})`; bx.stroke();
    bx.restore();
  }
  const wy=y-sz*.5; // wizard vertical centre
  if(state&&state.timeDrain>0){
    const period=1400;
    for(let off=0;off<2;off++){
      const phase=((t+off*period/2)%period)/period;
      const r=sz*(0.35+phase*0.75);
      const alpha=(1-phase)*(off===0?0.55:0.35);
      bx.beginPath(); bx.arc(x,wy,r,0,Math.PI*2);
      bx.strokeStyle=`rgba(200,120,255,${alpha})`; bx.lineWidth=1.5; bx.stroke();
    }
  }
  if(state&&state.counter){
    const rot=-t/420;
    for(let i=0;i<4;i++){
      const a=rot+i/4*Math.PI*2, alpha=0.65+0.30*Math.sin(t/220+i);
      bx.beginPath(); bx.arc(x,wy,sz*.82,a,a+Math.PI*.38);
      bx.strokeStyle=`rgba(255,215,0,${alpha})`; bx.lineWidth=3;
      bx.shadowColor='#ffd700'; bx.shadowBlur=10; bx.stroke();
    }
    bx.shadowBlur=0;
  }
  if(state&&state.empowered){
    const pulse=0.12+0.08*Math.sin(t/150);
    bx.beginPath(); bx.arc(x,wy,sz*.82,0,Math.PI*2);
    bx.strokeStyle=`rgba(${hexToRgb(col)},${pulse*3.5})`; bx.lineWidth=2.5;
    bx.shadowColor=col; bx.shadowBlur=10; bx.stroke(); bx.shadowBlur=0;
    for(let i=0;i<4;i++){
      const a=t/350+i/4*Math.PI*2;
      bx.globalAlpha=0.65+0.35*Math.sin(t/200+i);
      bx.fillStyle=col; bx.shadowColor=col; bx.shadowBlur=8;
      bx.beginPath(); bx.arc(x+Math.cos(a)*sz*.72,wy+Math.sin(a)*sz*.4,sz*.038,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.regen){
    bx.globalAlpha=0.07+0.04*Math.sin(t/700);
    bx.fillStyle='#44cc88'; bx.beginPath(); bx.arc(x,wy,sz*.7,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    for(let i=0;i<3;i++){
      const phase=((t/1100+i*0.333)%1);
      const px=x+Math.sin(t/500+i*2.3)*sz*.22, py=y-sz*.1-phase*sz*.85;
      const alpha=phase<0.7?Math.min(1,phase*2)*0.7:(1-phase)*2.3*0.7;
      if(alpha<=0) continue;
      bx.globalAlpha=alpha; bx.fillStyle='#44ee88'; bx.shadowColor='#44cc88'; bx.shadowBlur=6;
      bx.beginPath(); bx.arc(px,py,sz*.025,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.frozen>0){
    bx.globalAlpha=0.18+0.07*Math.sin(t/350); bx.fillStyle='#88ddff';
    bx.beginPath(); bx.arc(x,wy,sz*.65,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    bx.save(); bx.translate(x,y);
    for(let i=0;i<6;i++){
      const a=-Math.PI/2+i/6*Math.PI*2, alpha=0.5+0.2*Math.sin(t/500+i);
      bx.strokeStyle=`rgba(180,240,255,${alpha})`; bx.lineWidth=1.5;
      bx.beginPath(); bx.moveTo(Math.cos(a)*sz*.12,Math.sin(a)*sz*.08);
      bx.lineTo(Math.cos(a)*sz*.38,Math.sin(a)*sz*.25); bx.stroke();
    }
    bx.restore();
    bx.strokeStyle=`rgba(136,221,255,${0.55+0.2*Math.sin(t/400)})`; bx.lineWidth=1.5;
    bx.beginPath(); bx.ellipse(x,y,sz*.35,sz*.08,0,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.candle>0){
    bx.globalAlpha=0.07+0.04*Math.sin(t/250); bx.fillStyle='#ff6600';
    bx.beginPath(); bx.arc(x,wy,sz*.65,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    const fx=x+sz*.18, fy=wy-sz*.58, flicker=Math.sin(t/110+1.5)*sz*.04;
    bx.globalAlpha=0.7+0.3*Math.sin(t/90); bx.fillStyle='#ffaa00';
    bx.shadowColor='#ff6600'; bx.shadowBlur=6;
    bx.beginPath(); bx.moveTo(fx,fy+sz*.12);
    bx.quadraticCurveTo(fx-sz*.06+flicker,fy+sz*.04,fx,fy-sz*.08);
    bx.quadraticCurveTo(fx+sz*.06+flicker,fy+sz*.04,fx,fy+sz*.12);
    bx.fill(); bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.blizzard>0){
    for(let i=0;i<6;i++){
      const a=t/700+i/6*Math.PI*2, r=sz*(0.62+0.1*Math.sin(t/400+i));
      bx.globalAlpha=0.5+0.25*Math.sin(t/350+i*1.3);
      bx.fillStyle='#88ddff'; bx.shadowColor='#aaeeff'; bx.shadowBlur=4;
      bx.beginPath(); bx.arc(x+Math.cos(a)*r,wy+Math.sin(a)*r*0.5,sz*.03,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.burn>0){
    bx.globalAlpha=0.1+0.06*Math.sin(t/180); bx.fillStyle='#ff4400';
    bx.beginPath(); bx.arc(x,wy,sz*.6,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    for(let i=0;i<4;i++){
      const phase=((t/700+i*0.25)%1);
      const ex=x+Math.sin(t/300+i*1.6)*sz*.28, ey=y-phase*sz*.9;
      const alpha=phase<0.6?phase*1.4:Math.max(0,(1-phase)*3.5);
      bx.globalAlpha=alpha*0.85; bx.fillStyle=i%2?'#ff9900':'#ff4422';
      bx.shadowColor='#ff4400'; bx.shadowBlur=5;
      bx.beginPath(); bx.arc(ex,ey,sz*.028,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.poison>0){
    bx.globalAlpha=0.1+0.06*Math.sin(t/180); bx.fillStyle='#55aa33';
    bx.beginPath(); bx.arc(x,wy,sz*.6,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    for(let i=0;i<4;i++){
      const phase=((t/700+i*0.25)%1);
      const ex=x+Math.sin(t/300+i*1.6)*sz*.28, ey=y-phase*sz*.9;
      const alpha=phase<0.6?phase*1.4:Math.max(0,(1-phase)*3.5);
      bx.globalAlpha=alpha*0.85; bx.fillStyle=i%2?'#88dd44':'#55aa33';
      bx.shadowColor='#55aa33'; bx.shadowBlur=5;
      bx.beginPath(); bx.arc(ex,ey,sz*.028,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.voidCollapse>0){
    bx.save(); bx.translate(x,wy);
    for(let i=0;i<5;i++){
      const phase=((t/900+i*0.2)%1);
      const r=sz*.85*(1-phase);
      const a=t/250+i*(Math.PI*2/5);
      const px=Math.cos(a)*r, py=Math.sin(a)*r*0.5;
      bx.globalAlpha=phase*0.9; bx.fillStyle=i%2?'#aa66ff':'#6633aa';
      bx.shadowColor='#aa66ff'; bx.shadowBlur=6;
      bx.beginPath(); bx.arc(px,py,sz*.03,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=0.12+0.05*Math.sin(t/220); bx.fillStyle='#330055';
    bx.beginPath(); bx.arc(0,0,sz*.18,0,Math.PI*2); bx.fill();
    bx.globalAlpha=1; bx.shadowBlur=0;
    bx.restore();
  }
  if(state&&state.resist>0){
    bx.save(); bx.translate(x,wy);
    bx.globalAlpha=0.45+0.1*Math.sin(t/350); bx.strokeStyle='#cc3300'; bx.lineWidth=2.5;
    bx.shadowColor='#ff4400'; bx.shadowBlur=5;
    for(let i=0;i<3;i++){
      const ox=(i-1)*sz*.22;
      bx.beginPath(); bx.moveTo(ox-sz*.1,-sz*.4); bx.lineTo(ox+sz*.1,sz*.15); bx.stroke();
    }
    bx.globalAlpha=1; bx.shadowBlur=0; bx.restore();
    bx.strokeStyle=`rgba(180,100,40,${0.4+0.15*Math.sin(t/300)})`; bx.lineWidth=1.5;
    bx.beginPath(); bx.ellipse(x,y,sz*.38,sz*.09,0,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.flameShield>0){
    for(let i=0;i<5;i++){
      const a=t/550+i/5*Math.PI*2, r=sz*(0.68+0.06*Math.sin(t/280+i));
      bx.globalAlpha=0.55+0.25*Math.sin(t/260+i*1.4);
      bx.fillStyle=i%2?'#ff6600':'#ffaa00'; bx.shadowColor='#ff4400'; bx.shadowBlur=5;
      bx.beginPath(); bx.arc(x+Math.cos(a)*r,wy+Math.sin(a)*r*0.5,sz*.042,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.frostArmor>0){
    bx.save(); bx.translate(x,wy);
    bx.rotate(-t/2400);
    bx.globalAlpha=0.55+0.15*Math.sin(t/280); bx.strokeStyle='#88ddff'; bx.lineWidth=1.8;
    bx.shadowColor='#88ddff'; bx.shadowBlur=7;
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      bx.beginPath(); bx.moveTo(Math.cos(a)*sz*.52,Math.sin(a)*sz*.30);
      bx.lineTo(Math.cos(a)*sz*.74,Math.sin(a)*sz*.43); bx.stroke();
    }
    bx.beginPath(); bx.arc(0,0,sz*.74,0,Math.PI*2);
    bx.strokeStyle=`rgba(136,221,255,${0.35+0.1*Math.sin(t/240)})`; bx.stroke();
    bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
  }
  if(state&&state.dragonScales>0){
    bx.save(); bx.translate(x,wy);
    bx.globalAlpha=0.5+0.15*Math.sin(t/300); bx.strokeStyle='#cc6622'; bx.fillStyle='rgba(204,102,34,0.18)';
    bx.lineWidth=1.5; bx.shadowColor='#ff8844'; bx.shadowBlur=6;
    for(let row=-1;row<=1;row++){
      for(let col=-2;col<=2;col++){
        const sx=col*sz*.18, sy=row*sz*.20+sz*.05;
        const r=Math.sqrt(sx*sx+(sy*1.6)*(sy*1.6));
        if(r>sz*.78) continue;
        bx.beginPath(); bx.arc(sx,sy,sz*.10,0.15*Math.PI,0.85*Math.PI); bx.fill(); bx.stroke();
      }
    }
    bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
  }
  if(state&&state.charge>0){
    const n=state.charge;
    for(let i=0;i<n;i++){
      const a=t/700+i/n*Math.PI*2, r=sz*(0.78+0.06*Math.sin(t/300+i));
      bx.globalAlpha=0.55+0.3*Math.sin(t/220+i*1.3);
      bx.fillStyle=i%2?'#aaff44':'#88ffcc'; bx.shadowColor='#aaff44'; bx.shadowBlur=6;
      bx.beginPath(); bx.arc(x+Math.cos(a)*r,wy+Math.sin(a)*r*0.5,sz*.025,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.conductivity>0){
    bx.globalAlpha=0.08+0.05*Math.sin(t/200); bx.fillStyle='#aaff44';
    bx.beginPath(); bx.arc(x,wy,sz*.7,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    bx.strokeStyle=`rgba(170,255,68,${0.35+0.15*Math.sin(t/180)})`; bx.lineWidth=1.5;
    bx.beginPath(); bx.ellipse(x,y,sz*.38,sz*.09,0,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.agony>0){
    // Dark red pulsing rings radiating outward
    const aPulse=(t%900)/900;
    bx.strokeStyle=`rgba(160,20,80,${0.6*(1-aPulse)})`; bx.lineWidth=2;
    bx.beginPath(); bx.arc(x,wy,sz*(0.55+aPulse*0.45),0,Math.PI*2); bx.stroke();
    bx.strokeStyle=`rgba(100,0,40,${0.35+0.2*Math.sin(t/280)})`; bx.lineWidth=1.5;
    bx.beginPath(); bx.arc(x,wy,sz*.62,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.silence>0){
    // Grey bars across the wizard (silenced)
    bx.globalAlpha=0.18+0.08*Math.sin(t/400);
    bx.fillStyle='#444444';
    for(let i=0;i<3;i++){
      bx.fillRect(x-sz*.4,wy-sz*.3+i*sz*.28,sz*.8,sz*.07);
    }
    bx.globalAlpha=1;
    bx.strokeStyle=`rgba(80,80,80,${0.4+0.15*Math.sin(t/320)})`; bx.lineWidth=1;
    bx.beginPath(); bx.arc(x,wy,sz*.72,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.corruption>0){
    // Dark purple swirl beneath the wizard
    bx.globalAlpha=0.12+0.06*Math.sin(t/350); bx.fillStyle='#550077';
    bx.beginPath(); bx.arc(x,wy,sz*.68,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    for(let i=0;i<4;i++){
      const a=t/600+i/4*Math.PI*2;
      bx.globalAlpha=0.4+0.2*Math.sin(t/300+i*1.6);
      bx.fillStyle=i%2?'#9944cc':'#330044'; bx.shadowColor='#9944cc'; bx.shadowBlur=4;
      bx.beginPath(); bx.arc(x+Math.cos(a)*sz*.55,wy+Math.sin(a)*sz*.3,sz*.025,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  if(state&&state.invisible>0){
    const gv=0.18+0.12*Math.sin(t/280);
    bx.beginPath(); bx.arc(x,wy,sz*.78,0,Math.PI*2);
    bx.strokeStyle=`rgba(180,160,232,${gv*3})`; bx.lineWidth=1.5;
    bx.shadowColor='#b8a0e8'; bx.shadowBlur=8; bx.stroke(); bx.shadowBlur=0;
    for(let i=0;i<3;i++){
      const a=t/700+i/3*Math.PI*2;
      const ox=Math.cos(a)*sz*.5, oy=Math.sin(a)*sz*.28;
      bx.globalAlpha=0.3+0.2*Math.sin(t/350+i*2.1);
      bx.fillStyle='#b8a0e8'; bx.beginPath(); bx.arc(x+ox,wy+oy,sz*.045,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1;
  }
  if(state&&state.stoneskin>0&&state.stoneskinHp>0){
    // Three chunky rock chunks orbiting in an ellipse
    const rockCols=[['#8b7355','#6b5335'],['#a08060','#7a6040'],['#7a6244','#5a4a2c']];
    const rockVerts=[[1.0,0.62,0.88,0.70,0.82],[0.78,1.0,0.65,0.85,0.72],[0.90,0.68,1.0,0.74,0.80]];
    for(let i=0;i<3;i++){
      const angle=t/1400+i/3*Math.PI*2;
      const orbitR=sz*0.82;
      const rx=x+Math.cos(angle)*orbitR;
      const ry=wy+Math.sin(angle)*orbitR*0.48;
      const rockSz=sz*(0.058+0.008*i);
      bx.save();
      bx.translate(rx,ry);
      bx.rotate(t/900+i*1.4);
      bx.globalAlpha=0.82+0.15*Math.sin(t/500+i*1.3);
      bx.fillStyle=rockCols[i][0]; bx.shadowColor=rockCols[i][1]; bx.shadowBlur=5;
      bx.beginPath();
      const verts=rockVerts[i];
      for(let j=0;j<5;j++){
        const a=j/5*Math.PI*2;
        const r=rockSz*verts[j];
        if(j===0) bx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
        else bx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      bx.closePath(); bx.fill();
      bx.shadowBlur=0; bx.restore();
    }
    bx.globalAlpha=1;
  }
  if(state&&state.stonesoul>0){
    bx.globalAlpha=0.07+0.04*Math.sin(t/600); bx.fillStyle='#b08040';
    bx.beginPath(); bx.arc(x,wy,sz*.72,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    bx.strokeStyle=`rgba(176,128,64,${0.28+0.1*Math.sin(t/700)})`; bx.lineWidth=2;
    bx.beginPath(); bx.arc(x,wy,sz*.72,0,Math.PI*2); bx.stroke();
  }
  if(state&&state.blink>0){
    const wy2=y-sz*.5;
    for(let off=0;off<2;off++){
      const phase=((t+off*700)%1400)/1400;
      const r=sz*(0.55+phase*0.35);
      const alpha=(1-phase)*0.5;
      bx.beginPath(); bx.arc(x,wy2,r,0,Math.PI*2);
      bx.strokeStyle=`rgba(180,140,255,${alpha})`; bx.lineWidth=1.5; bx.stroke();
    }
    const gv=0.06+0.04*Math.sin(t/250);
    bx.beginPath(); bx.arc(x,y-sz*.5,sz*.72,0,Math.PI*2);
    bx.strokeStyle=`rgba(200,160,255,${gv*4})`; bx.lineWidth=2;
    bx.shadowColor='#cc99ff'; bx.shadowBlur=8; bx.stroke(); bx.shadowBlur=0;
  }
  // Plague: green toxic aura
  if(state&&state.plague>0){
    bx.globalAlpha=0.09+0.05*Math.sin(t/280); bx.fillStyle='#33bb22';
    bx.beginPath(); bx.arc(x,wy,sz*.7,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    for(let i=0;i<4;i++){
      const phase=((t/900+i*0.25)%1);
      const px=x+Math.sin(t/400+i*1.7)*sz*.2, py=y-phase*sz*.85;
      const alpha=phase<0.6?phase*1.2:Math.max(0,(1-phase)*3)*0.7;
      bx.globalAlpha=alpha; bx.fillStyle='#44dd22'; bx.shadowColor='#33bb22'; bx.shadowBlur=4;
      bx.beginPath(); bx.arc(px,py,sz*.022,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  // Maggot Cloud: buzzing dark dots
  if(state&&state.maggotCloud>0){
    for(let i=0;i<6;i++){
      const a=(t/400+i/6*Math.PI*2)%(Math.PI*2);
      const r=sz*(0.65+0.08*Math.sin(t/220+i*1.3));
      bx.globalAlpha=0.5+0.25*Math.sin(t/180+i);
      bx.fillStyle='#334400'; bx.shadowColor='#667700'; bx.shadowBlur=3;
      bx.beginPath(); bx.arc(x+Math.cos(a)*r,wy+Math.sin(a)*r*0.45,sz*.018,0,Math.PI*2); bx.fill();
    }
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  // Bone Totem: small skull circle below wizard
  if(state&&state.boneTotem>0){
    const tx2=x, ty2=y+sz*.18;
    bx.globalAlpha=0.8+0.15*Math.sin(t/400);
    bx.fillStyle='#cccc88'; bx.shadowColor='#aa9944'; bx.shadowBlur=6;
    bx.beginPath(); bx.arc(tx2,ty2,sz*.09,0,Math.PI*2); bx.fill();
    bx.fillStyle='#553300'; bx.beginPath(); bx.arc(tx2,ty2,sz*.035,0,Math.PI*2); bx.fill();
    bx.strokeStyle='#aa9944'; bx.lineWidth=1.5;
    bx.beginPath(); bx.arc(tx2,ty2,sz*.13,0,Math.PI*2); bx.stroke();
    bx.globalAlpha=1; bx.shadowBlur=0;
  }
  // Enthralled: purple swirl rings
  if(state&&state.enthralled>0){
    for(let off=0;off<2;off++){
      const phase=((t/800+off*0.5)%1);
      const r=sz*(0.55+phase*0.35);
      bx.beginPath(); bx.arc(x,wy,r,0,Math.PI*2);
      bx.strokeStyle=`rgba(180,80,255,${(1-phase)*0.5})`; bx.lineWidth=2; bx.stroke();
    }
    const rot=t/500;
    bx.strokeStyle=`rgba(180,80,255,${0.35+0.15*Math.sin(t/280)})`; bx.lineWidth=1.5;
    bx.beginPath(); bx.arc(x,wy,sz*.72,rot,rot+Math.PI*.7); bx.stroke();
    bx.beginPath(); bx.arc(x,wy,sz*.72,rot+Math.PI,rot+Math.PI*1.7); bx.stroke();
  }
  // Arcane Weave: golden shimmer threads
  if(state&&state.arcaneWeave>0){
    bx.save(); bx.translate(x,wy);
    for(let i=0;i<state.arcaneWeave;i++){
      const a=t/600+i/3*Math.PI*2;
      bx.globalAlpha=0.6+0.25*Math.sin(t/250+i*1.5);
      bx.strokeStyle='#ffdd44'; bx.lineWidth=1.5; bx.shadowColor='#ffdd44'; bx.shadowBlur=6;
      bx.beginPath(); bx.moveTo(Math.cos(a)*sz*.3,Math.sin(a)*sz*.18);
      bx.lineTo(Math.cos(a+.9)*sz*.65,Math.sin(a+.9)*sz*.4); bx.stroke();
    }
    bx.globalAlpha=1; bx.shadowBlur=0; bx.restore();
  }
  // Spellbound: pulsing purple chain on this wizard (they have the debuff)
  if(state&&state.spellbound){
    bx.strokeStyle=`rgba(140,40,200,${0.45+0.2*Math.sin(t/350)})`; bx.lineWidth=2;
    bx.shadowColor='#8822cc'; bx.shadowBlur=8;
    bx.beginPath(); bx.arc(x,wy,sz*.76,0,Math.PI*2); bx.stroke();
    bx.shadowBlur=0;
    bx.globalAlpha=0.55+0.2*Math.sin(t/300); bx.fillStyle='#aa44ff';
    bx.font=`${Math.round(sz*.15)}px serif`; bx.textAlign='center';
    bx.fillText('⛓', x, wy-sz*.58);
    bx.globalAlpha=1;
  }
  // Bewitched: mirror shimmer
  if(state&&state.bewitched){
    bx.globalAlpha=0.12+0.07*Math.sin(t/300); bx.fillStyle='#ff88ff';
    bx.beginPath(); bx.arc(x,wy,sz*.68,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    bx.strokeStyle=`rgba(255,140,255,${0.4+0.2*Math.sin(t/280)})`; bx.lineWidth=1.5;
    bx.shadowColor='#ff88ff'; bx.shadowBlur=7;
    bx.beginPath(); bx.arc(x,wy,sz*.68,0,Math.PI*2); bx.stroke(); bx.shadowBlur=0;
  }
  // Blades (Weizan): orbiting silver blades
  if(state&&state.blades>0){
    const n=state.blades;
    for(let i=0;i<n;i++){
      const a=t/800+i/n*Math.PI*2;
      const bx2=x+Math.cos(a)*sz*.82, by2=wy+Math.sin(a)*sz*.46;
      bx.save(); bx.translate(bx2,by2); bx.rotate(a+Math.PI/4);
      bx.globalAlpha=0.85+0.12*Math.sin(t/300+i*1.4);
      bx.fillStyle='#ccddff'; bx.shadowColor='#aabbee'; bx.shadowBlur=6;
      bx.beginPath(); bx.moveTo(0,-sz*.075); bx.lineTo(sz*.018,sz*.075);
      bx.lineTo(-sz*.018,sz*.075); bx.closePath(); bx.fill();
      bx.shadowBlur=0; bx.restore();
    }
    bx.globalAlpha=1;
  }
  // Skeletons (Valdris): small bone-coloured circles beside wizard
  const minionDir=flip?1:-1;
  if(state&&state.skeletons&&state.skeletons.length>0){
    state.skeletons.forEach((skel,i)=>{
      const sx=x+minionDir*(i===0?sz*1.3:sz*2.1), sy=wy;
      bx.globalAlpha=0.85; bx.fillStyle='#ccccbb'; bx.shadowColor='#aaaaaa'; bx.shadowBlur=4;
      bx.beginPath(); bx.arc(sx,sy,sz*.18,0,Math.PI*2); bx.fill();
      bx.fillStyle='#333'; bx.font=`${Math.round(sz*.14)}px serif`;
      bx.textAlign='center'; bx.fillText('💀',sx,sy+sz*.06);
      bx.globalAlpha=1; bx.shadowBlur=0;
    });
  }
  // Simulacra (Mirel): ghostly wizard clones, same sprite/animation as the caster
  if(state&&state.simulacra&&state.simulacra.length>0){
    const simSz=sz*.62;
    state.simulacra.forEach((sim,i)=>{
      const sx=x+minionDir*(i===0?sz*1.5:sz*2.6);
      const pulse=0.5+0.15*Math.sin(t/600+i);
      const bob=Math.sin(t/500+i*2)*simSz*.04;
      bx.save();
      bx.globalAlpha=pulse;
      const img=sprites[who];
      if(img&&spriteStatus[who]==='ready'){
        bx.shadowColor='#4466dd'; bx.shadowBlur=12;
        drawSprite(img,'idle',animState[who].frame%ANIM_FRAMES.idle,sx,y+bob,simSz,flip);
        bx.shadowBlur=0;
      } else {
        bx.fillStyle='#88aaff'; bx.shadowColor='#4466dd'; bx.shadowBlur=8;
        bx.beginPath(); bx.arc(sx,wy,sz*.22,0,Math.PI*2); bx.fill();
        bx.font=`${Math.round(sz*.16)}px serif`;
        bx.textAlign='center'; bx.fillText('👤',sx,wy+sz*.07);
        bx.shadowBlur=0;
      }
      bx.restore();
      bx.globalAlpha=1;
    });
  }
  if(state&&state.invisible>0) bx.globalAlpha=0.35;
  else if(state&&state.blink>0) bx.globalAlpha=0.3+0.7*(0.5+0.5*Math.sin(t/350));
  if(state&&state.stoneskin>0&&state.stoneskinHp>0) bx.filter='grayscale(0.75) sepia(0.15)';
  const img=sprites[who];
  if(img&&spriteStatus[who]==='ready'){
    const lift=animName==='cast'?-sz*.06:0;
    const shake=animName==='hit'?Math.sin(t/60)*sz*.03:0;
    const bob=animName==='idle'?Math.sin(t/500+x)*sz*.015:0;
    drawSprite(img,animName,animState[who].frame,x,y+lift+shake+bob,sz,flip);
  } else {
    if(flip){bx.scale(-1,1); x=-x;}
    const bob=animName==='idle'?Math.sin(t/500+x)*.015*sz:0;
    const lift=animName==='cast'?-sz*.06:0;
    const shake=animName==='hit'?Math.sin(t/60)*.03*sz:0;
    const dy=bob+lift+shake;
    bx.fillStyle=col;
    bx.beginPath(); bx.moveTo(x-sz*.33,y+dy); bx.lineTo(x-sz*.27,y-sz*.48+dy);
    bx.lineTo(x+sz*.27,y-sz*.48+dy); bx.lineTo(x+sz*.33,y+dy); bx.closePath(); bx.fill();
    bx.beginPath(); bx.moveTo(x-sz*.27,y-sz*.48+dy); bx.lineTo(x,y-sz*1.12+dy);
    bx.lineTo(x+sz*.27,y-sz*.48+dy); bx.closePath(); bx.fill();
    bx.fillStyle='rgba(0,0,0,0.25)'; bx.fillRect(x-sz*.31,y-sz*.5+dy,sz*.62,sz*.07);
    bx.fillStyle='#f5deb3'; bx.beginPath(); bx.ellipse(x,y-sz*.63+dy,sz*.19,sz*.21,0,0,Math.PI*2); bx.fill();
    bx.fillStyle='#222';
    bx.fillRect(x-sz*.1,y-sz*.68+dy,sz*.055,sz*.055);
    bx.fillRect(x+sz*.04,y-sz*.68+dy,sz*.055,sz*.055);
    const sfx=x+sz*.3, stopY=y-sz*.88+dy+(animName==='cast'?-sz*.07:0);
    bx.strokeStyle='#8B6914'; bx.lineWidth=2.5;
    bx.beginPath(); bx.moveTo(sfx,y+dy); bx.lineTo(sfx,stopY); bx.stroke();
    const op=.5+.5*Math.sin(t/400);
    bx.fillStyle=animName==='cast'?`rgba(255,220,50,${.8+op*.2})`:col;
    bx.shadowColor=animName==='cast'?'#ffff88':col; bx.shadowBlur=animName==='cast'?18:7;
    bx.beginPath(); bx.arc(sfx,stopY,sz*.09,0,Math.PI*2); bx.fill(); bx.shadowBlur=0;
    bx.fillStyle='#2a1a4a';
    bx.fillRect(x-sz*.24,y-sz*.02+dy,sz*.17,sz*.08);
    bx.fillRect(x+sz*.07,y-sz*.02+dy,sz*.17,sz*.08);
  }
  bx.restore();
}

function tickParts(){
  gs.parts=gs.parts.filter(p=>p.life>0);
  gs.parts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy; if(!p.noGrav) p.vy+=.18; p.life-=p.dec;
    bx.globalAlpha=p.life; bx.fillStyle=p.col; bx.shadowColor=p.col; bx.shadowBlur=8;
    bx.beginPath(); bx.arc(p.x,p.y,p.sz,0,Math.PI*2); bx.fill(); bx.shadowBlur=0; bx.globalAlpha=1;
  });
}

const MANA_BURN_FIRE_COLS=['#44aaff','#66ccff','#0088ff','#aaddff','#2299ee'];
function tickManaBurnFire(){
  const now=Date.now();
  gs.manaBurnFires=gs.manaBurnFires.filter(f=>now<f.end);
  gs.manaBurnFires.forEach(f=>{
    const n=2+(_rng()<0.4?1:0);
    for(let i=0;i<n;i++){
      const col=MANA_BURN_FIRE_COLS[Math.floor(_rng()*MANA_BURN_FIRE_COLS.length)];
      const spread=bW*.018;
      gs.parts.push({
        x:f.x+(_rng()-.5)*spread*2,
        y:f.y+(_rng()-.5)*spread,
        col,
        vx:(_rng()-.5)*1.2,
        vy:-(2.5+_rng()*3.5),
        sz:1.5+_rng()*3,
        life:1,
        dec:.018+_rng()*.022,
      });
    }
  });
}

function spawnParts(x,y,col,n=16){
  for(let i=0;i<n;i++){
    const a=_rng()*Math.PI*2, sp=1.5+_rng()*3.5;
    gs.parts.push({x,y,col,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,sz:2+_rng()*3,life:1,dec:.022+_rng()*.03});
  }
}

function tickFloats(){
  gs.floats=gs.floats.filter(f=>f.life>0);
  gs.floats.forEach(f=>{
    f.y-=0.55; f.life-=.016;
    bx.globalAlpha=Math.min(1,f.life*3); bx.fillStyle=f.col;
    bx.font=`bold ${f.sz}px Cinzel,serif`; bx.textAlign='center';
    bx.shadowColor=f.col; bx.shadowBlur=10;
    bx.fillText(f.t,f.x,f.y); bx.shadowBlur=0; bx.globalAlpha=1;
  });
}

function addFloat(x,y,t,col,sz=17){ gs.floats.push({x,y,t,col,sz,life:1}); }

// ── SPELL PROJECTILES ──────────────────────────────────────
function spawnProj(x1,y1,x2,y2,element,col,cb){
  if(simMode){ if(cb) cb(); return; }
  const speeds={fire:0.055,lightning:0.3,ice:0.065,arcane:0.06,physical:0.09,dispel:0.07,manaburn:0.08};
  gs.projs.push({x1,y1,x2,y2,progress:0,speed:speeds[element]||0.065,element,col,cb,done:false});
}

function tickProjs(){
  gs.projs=gs.projs.filter(p=>!p.done);
  gs.projs.forEach(p=>{
    p.progress=Math.min(1,p.progress+p.speed);
    const px=p.x1+(p.x2-p.x1)*p.progress;
    const py=p.y1+(p.y2-p.y1)*p.progress;
    if(p.element==='fire'){
      bx.save();
      bx.beginPath(); bx.arc(px,py,bH*.028,0,Math.PI*2);
      bx.fillStyle='#ff5500'; bx.shadowColor='#ff6622'; bx.shadowBlur=22; bx.fill();
      bx.beginPath(); bx.arc(px,py,bH*.012,0,Math.PI*2);
      bx.fillStyle='#ffcc44'; bx.shadowBlur=10; bx.fill();
      bx.restore();
    } else if(p.element==='lightning'){
      const segs=7;
      const dx=(p.x2-p.x1)/segs, dy=(p.y2-p.y1)/segs;
      const len=Math.hypot(p.x2-p.x1,p.y2-p.y1)||1;
      const nx=-(p.y2-p.y1)/len, ny=(p.x2-p.x1)/len;
      const jitter=bH*.022;
      bx.beginPath(); bx.moveTo(p.x1,p.y1);
      for(let i=1;i<segs;i++){
        const mx=p.x1+dx*i+nx*jitter*(i%2?1:-1)*(0.5+_rng()*.9);
        const my=p.y1+dy*i+ny*jitter*(i%2?1:-1)*(0.5+_rng()*.9);
        bx.lineTo(mx,my);
      }
      bx.lineTo(p.x2,p.y2);
      bx.strokeStyle='#ffffff'; bx.lineWidth=2.5;
      bx.shadowColor='#ffee44'; bx.shadowBlur=18;
      bx.globalAlpha=0.8+0.2*_rng(); bx.stroke();
      bx.beginPath(); bx.moveTo(p.x1,p.y1); bx.lineTo(p.x2,p.y2);
      bx.strokeStyle='#ffff99'; bx.lineWidth=1; bx.shadowBlur=8; bx.stroke();
      bx.shadowBlur=0; bx.globalAlpha=1;
    } else if(p.element==='ice'){
      bx.save(); bx.translate(px,py); bx.rotate(p.progress*Math.PI*3);
      bx.strokeStyle='#aaeeff'; bx.lineWidth=2; bx.shadowColor='#88ddff'; bx.shadowBlur=14;
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2;
        bx.beginPath(); bx.moveTo(0,0);
        bx.lineTo(Math.cos(a)*bH*.026,Math.sin(a)*bH*.026); bx.stroke();
      }
      bx.beginPath(); bx.arc(0,0,bH*.008,0,Math.PI*2);
      bx.fillStyle='#ddf8ff'; bx.fill(); bx.shadowBlur=0; bx.restore();
    } else if(p.element==='arcane'){
      const t=Date.now();
      const cols=['#cc88ff','#ff88cc','#88ccff','#ffcc44'];
      bx.save(); bx.translate(px,py);
      for(let i=0;i<4;i++){
        const a=t/250+i/4*Math.PI*2, r=bH*.018*(0.5+0.5*Math.sin(t/300+i));
        bx.globalAlpha=0.75; bx.fillStyle=cols[i]; bx.shadowColor=cols[i]; bx.shadowBlur=10;
        bx.beginPath(); bx.arc(Math.cos(a)*r,Math.sin(a)*r,bH*.013,0,Math.PI*2); bx.fill();
      }
      bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
    } else if(p.element==='physical'){
      const dir=Math.atan2(p.y2-p.y1,p.x2-p.x1);
      bx.save(); bx.translate(px,py); bx.rotate(dir);
      bx.strokeStyle=p.col; bx.lineWidth=2.5; bx.shadowColor=p.col; bx.shadowBlur=8; bx.globalAlpha=0.85;
      for(let i=0;i<3;i++){
        const off=(i-1)*bH*.013;
        bx.beginPath(); bx.moveTo(-bH*.035,off); bx.lineTo(bH*.035,off); bx.stroke();
      }
      bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
    } else if(p.element==='dispel'){
      const t=Date.now();
      bx.save(); bx.translate(px,py);
      const pulse=0.8+0.2*Math.sin(t/120);
      bx.beginPath(); bx.arc(0,0,bH*.024*pulse,0,Math.PI*2);
      bx.fillStyle='#ffaaff'; bx.shadowColor='#ff88ff'; bx.shadowBlur=20*pulse; bx.globalAlpha=0.85; bx.fill();
      bx.beginPath(); bx.arc(0,0,bH*.010*pulse,0,Math.PI*2);
      bx.fillStyle='#ffffff'; bx.shadowBlur=8; bx.globalAlpha=0.9; bx.fill();
      bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
    } else if(p.element==='manaburn'){
      const t=Date.now();
      bx.save(); bx.translate(px,py);
      const pulse=0.7+0.3*Math.sin(t/100);
      bx.beginPath(); bx.arc(0,0,bH*.026*pulse,0,Math.PI*2);
      bx.fillStyle='#cc44ff'; bx.shadowColor='#aa00ff'; bx.shadowBlur=24*pulse; bx.globalAlpha=0.9; bx.fill();
      bx.beginPath(); bx.arc(0,0,bH*.010,0,Math.PI*2);
      bx.fillStyle='#220033'; bx.shadowBlur=0; bx.globalAlpha=1; bx.fill();
      bx.restore();
    }
    if(p.progress>=1){ p.done=true; if(p.cb) p.cb(); }
  });
}

// ── STATUS BAR ─────────────────────────────────────────────
function refreshStatusBar(){
  document.getElementById('statusbar').innerHTML=elemStatusTags().join('');
}

// drawWiz draws status visuals from these field names (originally per-spell state); map each
// enchantment, by the spell id that cast it, onto the visual that fits it
const WIZ_VISUAL_BY_ID={timedrain:'timeDrain', counter:'counter', candle:'candle', blizzard:'blizzard',
  singularity:'voidCollapse', frostarmor:'frostArmor', dragonscales:'dragonScales', stonesoul:'stonesoul',
  galvanize:'charge', conductivity:'conductivity', agony:'agony', silence:'silence', corruption:'corruption',
  vanish:'invisible', blink:'blink', plague:'plague', maggotcloud:'maggotCloud', bonetotem:'boneTotem',
  enthral:'enthralled', arcaneweave:'arcaneWeave', spellbind:'spellbound', bewitch:'bewitched', chill:'frozen',
  warpaint:'resist', ironpatience:'resist', heal:'regen'};
function wizVisuals(st){
  const v={blades:st.blades, skeletons:st.skeletons, simulacra:st.simulacra};
  st.effects.forEach(e=>{
    const k=WIZ_VISUAL_BY_ID[e.id];
    if(k) v[k]=e.rounds||1;
    if(e.type==='empower') v.empowered=true;
    if(e.type==='dot'&&e.id.startsWith('dot-')) v[e.elem==='fire'?'burn':'poison']=1;   // strike riders
  });
  if(st.wardSig==='flameshield') v.flameShield=1;
  if(st.wardSig==='stoneskin'){ v.stoneskin=1; v.stoneskinHp=st.shieldHp; }
  return v;
}

// ── BATTLE LOOP ────────────────────────────────────────────
let battleRunning=false, gameEnded=false;
function battleLoop(ts){
  if(!battleRunning) return;
  requestAnimationFrame(battleLoop);
  const dt=lastFrameTime?Math.min(ts-lastFrameTime,100):16;
  lastFrameTime=ts;
  PLAYERS.forEach(w=>tickAnimFrame(w,dt));
  resizeBC();
  bx.setTransform(1,0,0,1,0,0);
  bx.save(); bx.translate(0,bOffY); drawBG(); bx.restore();
  fillSceneBands();
  bx.setTransform(1,0,0,1,0,bOffY);   // everything else draws in scene coordinates
  const many=PLAYERS.length>2, gy=bH*.74, wsz=bH*.3*(many?.68:1);
  PLAYERS.forEach(w=>{
    const st=gs[w], hasFx=id=>st.effects.some(e=>e.id===id);
    drawWiz(seatX(w)+(gs[w+'xOff']||0),gy,wsz,seatCfg(w).col,seatFacesRight(w),gs[w+'anim'],
      hasWard(st),hasFx('ward'),w,hasFx('foresight'),wizVisuals(st));
    if(many){   // name tags, so everyone can tell the wizards apart
      bx.globalAlpha=st.out?.35:.9; bx.fillStyle=seatCfg(w).col;
      bx.font='bold 9px Cinzel,serif'; bx.textAlign='center';
      bx.fillText(seatCfg(w).name,seatX(w),gy+bH*.05);
      bx.globalAlpha=1;
    }
  });
  tickProjs(); tickBeams(); tickManaBurnFire(); tickParts(); tickFloats();
  if(!gs.myTurn&&!gs.busy&&!passPhone()){
    bx.fillStyle=`rgba(${hexToRgb(p2Cfg.col)},0.7)`; bx.font='bold 10px Cinzel,serif';
    bx.textAlign='center'; bx.fillText((PLAYERS.length>2?'RIVALS ARE':p2Cfg.name+' IS')+' CASTING…',bW*.5,bH*.56);
  }
  if(passPhone()&&gs.myTurn){
    const twoCfg=seatCfg(gs.turnPlayer);
    const twoNum=PLAYERS.indexOf(gs.turnPlayer)+1;
    bx.fillStyle=`rgba(${hexToRgb(twoCfg.col)},0.75)`;
    bx.font='bold 9px Cinzel,serif'; bx.textAlign='center';
    bx.fillText('PLAYER '+twoNum+' — YOUR TURN',bW*.5,bH*.57);
  }
  refreshHUD();
  refreshStatusBar();
}

// ── HUD ────────────────────────────────────────────────────
function refreshHUD(){
  if(PLAYERS.length>2){ refreshMultiHUD(); refreshActionBar(); return; }
  document.getElementById('p1hpf').style.height=Math.max(0,gs.p1.hp/gs.p1.maxHp*100)+'%';
  document.getElementById('p2hpf').style.height=Math.max(0,gs.p2.hp/gs.p2.maxHp*100)+'%';
  document.getElementById('sh1').style.opacity=hasWard(gs.p1)?'1':'0.18';
  document.getElementById('sh2').style.opacity=hasWard(gs.p2)?'1':'0.18';
  const fs2=document.getElementById('fs2'); if(fs2) fs2.style.opacity=effectsOf(gs.p2,'absorbNext').length?'1':'0';
  const ct1=document.getElementById('ct1'); if(ct1) ct1.classList.toggle('active',effectsOf(gs.p1,'counter').length>0);
  const ct2=document.getElementById('ct2'); if(ct2) ct2.classList.toggle('active',effectsOf(gs.p2,'counter').length>0);
  document.getElementById('roundlbl').textContent='Round '+gs.round;
  if(twoPlayerMode){
    const fightLbl=document.getElementById('fightlbl');
    if(fightLbl){
      const p1s='★'.repeat(Math.min(2,p1MatchWins))+'☆'.repeat(Math.max(0,2-p1MatchWins));
      const p2s='★'.repeat(Math.min(2,p2MatchWins))+'☆'.repeat(Math.max(0,2-p2MatchWins));
      fightLbl.textContent='P1 '+p1s+' vs P2 '+p2s;
    }
  }
  refreshMana('mfill1','mval1',gs.p1.mana);
  refreshMana('mfill2','mval2',gs.p2.mana);
  refreshActionBar();
}

// 3–4 wizards: one compact card per seat (built by buildMultiHUD when the duel starts)
function buildMultiHUD(){
  document.getElementById('mhud').innerHTML=PLAYERS.map(w=>{
    const cfg=seatCfg(w), team=seatSetup&&seatSetup.find(st=>st.who===w).team;
    return `<div class="mh-card" id="mh-${w}" style="--mh-col:${cfg.col}">`+
      `<img class="mh-img" src="portraits/${seatKey(w)}.png" alt=""><span class="mh-name">${cfg.name}</span>`+
      (team?`<span class="mh-team">Team ${team}</span>`:'')+
      `<div class="mh-bar mh-hp"><div class="mh-fill"></div></div><div class="mh-bar mh-mana"><div class="mh-fill"></div></div>`+
      `<div class="mh-nums"><span class="mh-hpn"></span><span class="mh-mn"></span><span class="mh-ward"></span></div></div>`;
  }).join('');
}
function refreshMultiHUD(){
  PLAYERS.forEach(w=>{
    const card=document.getElementById('mh-'+w), st=gs[w];
    if(!card) return;
    card.classList.toggle('out',!!st.out);
    card.classList.toggle('turn',gs.myTurn&&gs.turnPlayer===w);
    card.querySelector('.mh-hp .mh-fill').style.width=Math.max(0,st.hp/st.maxHp*100)+'%';
    card.querySelector('.mh-mana .mh-fill').style.width=(st.mana/MAX_MANA*100)+'%';
    card.querySelector('.mh-hpn').textContent='❤'+st.hp;
    card.querySelector('.mh-mn').textContent='✦'+st.mana;
    card.querySelector('.mh-ward').textContent=hasWard(st)?'🛡'+st.shieldHp:'';
  });
}

function refreshMana(fillId,valId,val){
  document.getElementById(fillId).style.height=(val/MAX_MANA*100)+'%';
  document.getElementById(valId).textContent=val;
}

function refreshActionBar(){
  const who=gs.turnPlayer||'p1';
  const busy=!gs.myTurn||gs.busy;
  Object.keys(ELEM_CATS).forEach(cat=>{
    const btn=document.getElementById('bel-'+cat);
    if(btn) btn.classList.toggle('off',busy||!elemCanPick(who,cat));
  });
  const ph=document.getElementById('bel-phase');
  if(ph){
    ph.style.display=PHASE.enabled&&PLAYERS.length>2?'':'none';
    document.getElementById('bel-phase-cost').textContent=PHASE.cost+' Mana';
    ph.classList.toggle('off',busy||!phaseReady(who)||hasFreeSpell(who));
  }
  const med=document.getElementById('bel-meditate');
  if(med){
    document.getElementById('bel-meditate-cost').textContent=gs[who].meditatedRound===gs.round-1?'Rested':'+'+MEDITATE.gain+' Mana';
    med.classList.toggle('off',busy||!canMeditate(who));
  }
}












// ── DEATHLESS (Valdris passive) ────────────────────────────
// Any seat whose character has a deathlessCost survives a killing blow by paying that much mana
function checkDeathless(who,x,y){
  const state=gs[who], cost=seatCfg(who).deathlessCost;
  if(!cost) return;
  if(state.hp<=0&&state.mana>=cost){
    state.mana=Math.max(0,state.mana-cost);
    state.hp=1;
    addFloat(x,y-30,'💀 DEATHLESS! −'+cost+' Mana','#8844cc',16);
    spawnParts(x,y,'#8844cc',24); spawnParts(x,y,'#ffffff',10);
    flash('#8844cc');
  }
}



// Unified damage-to-player helper: routes through simulacra redirect then skeletons then Deathless
// Who is dealing the damage right now, so a knock-out can pay its bounty to the right wizard
let dmgSource=null;
function dealDmgToPlayer(who,dmg,x,y){
  if(dmg<=0) return;
  // Damage in a round is simultaneous, so a knock-out is credited to whoever hurt them most this round
  if(dmgSource&&dmgSource!==who){ const d=gs.roundDmg||(gs.roundDmg={}), m=d[who]||(d[who]={}); m[dmgSource]=(m[dmgSource]||0)+dmg; }
  gs[who].hp=Math.max(0,gs[who].hp-dmg);
  checkDeathless(who,x,y);
}














function anim(who,state,ms){
  if(simMode) return;
  gs[who+'anim']=state;
  gs.lastAnimEnd=Math.max(gs.lastAnimEnd||0, Date.now()+ms);
  setTimeout(()=>{if(gs[who+'anim']!=='death') gs[who+'anim']='idle';},ms);
}


// Balance simulator (tools/balance.html): when true, rounds resolve instantly with no animation or UI
let simMode=false, simOutcome=null;

function combatTimeout(fn,delay){ if(simMode) fn(); else setTimeout(fn,delay); }


// ── VFX LIBRARY ────────────────────────────────────────────
// Every effect from the original per-spell code, kept as reusable pieces. The full original
// spell code (with these effects in context) is archived in js/legacy/classic_spells.js.

// Beam flash between two points (Drain, Radiant, curses, Counter, Chain Lightning)
function spawnBeam(x1,y1,x2,y2,col){
  gs.beams.push({x1,y1,x2,y2,col,ttl:8});
}
function tickBeams(){
  gs.beams=gs.beams.filter(b=>b.ttl>0);
  gs.beams.forEach(b=>{
    b.ttl--;
    bx.globalAlpha=b.ttl/8;
    bx.strokeStyle=b.col; bx.lineWidth=2.5;
    bx.shadowColor=b.col; bx.shadowBlur=12;
    bx.beginPath(); bx.moveTo(b.x1,b.y1); bx.lineTo(b.x2,b.y2); bx.stroke();
    bx.shadowBlur=0; bx.globalAlpha=1;
  });
}
// Step toward the foe and back (melee strikes)
function lunge(who,amt,cb){
  if(simMode){ if(cb) cb(); return; }
  const dir=seatFacesRight(who)?1:-1;
  gs[who+'xOff']=dir*bW*amt*(PLAYERS.length>2?.5:1);
  anim(who,'cast',300);
  setTimeout(()=>{ gs[who+'xOff']=0; if(cb) cb(); },180);
}
// Column of blue mana-fire on a target (drawn by tickManaBurnFire)
function spawnManaBurnFire(x,y){ gs.manaBurnFires.push({x,y,end:Date.now()+2800}); }

// Particles on an ellipse around (x,y). o.out flies outward (auras), otherwise inward (impacts).
function vfxRing(x,y,cols,n,o={}){
  const r=bH*(o.r||.06), ry=bH*(o.ry||.04), spd=o.spd||1.2, dir=o.out?0:Math.PI;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2;
    gs.parts.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*ry,col:cols[i%cols.length],
      vx:Math.cos(a+dir)*spd,vy:Math.sin(a+dir)*spd+(o.lift||0),sz:2+_rng()*(o.sz||2.5),
      life:1,dec:o.dec||.02,noGrav:!!o.noGrav});
  }
}
// Upward spray (heals, drain siphon, tick bursts)
function vfxFountain(x,y,cols,n,o={}){
  const spread=o.spread||0.8;
  for(let i=0;i<n;i++){
    const a=-Math.PI/2+(-spread+_rng()*spread*2), sp=(o.min||1)+_rng()*(o.var||2.5);
    gs.parts.push({x:x+(_rng()-.5)*bH*(o.w||.05),y:y+(o.h?(_rng()-.5)*bH*o.h:0),col:cols[i%cols.length],
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+(o.lift||0),sz:1.5+_rng()*(o.sz||3),
      life:1,dec:(o.dec||.014)+_rng()*(o.decVar||0),noGrav:!o.grav});
  }
}
// Slow drift in random directions with a lift (curse clouds, embers, sparks)
function vfxDrift(x,y,cols,n,o={}){
  for(let i=0;i<n;i++){
    const a=_rng()*Math.PI*2, spd=o.spd||0.8;
    gs.parts.push({x:x+(_rng()-.5)*bH*(o.w||.06),y,col:cols[i%cols.length],
      vx:Math.cos(a)*spd,vy:Math.sin(a)*spd+(o.lift||-1),sz:1.5+_rng()*(o.sz||2),
      life:1,dec:o.dec||.016,noGrav:o.grav?false:true});
  }
}
// Falling drops (blood)
function vfxDrip(x,y,col,n,o={}){
  for(let i=0;i<n;i++)
    gs.parts.push({x:x+(_rng()-.5)*bH*.05,y,col,vx:(_rng()-.5)*(o.vx||1),vy:(o.vy||1.5)+_rng()*(o.vyVar||3),
      sz:2+_rng()*2,life:1,dec:o.dec||.02});
}
function vfxStrikeAnim(who,tgt,ms=800){ anim(who,'cast',ms); if(tgt&&tgt!==who) anim(tgt,'hit',ms); }

// ── Reactions shared by every spell ──
const VFX={
  wardRaise:(x,col)=>{ spawnParts(x,bH*.38,col,18); spawnParts(x,bH*.38,'#ffffff',6); },
  wardBlock:x=>{ spawnParts(x,bH*.38,'#4af0ff',8); spawnParts(x,bH*.38,'#ffffff',4); },
  wardShatter:x=>{ spawnParts(x,bH*.38,'#4af0ff',22); spawnParts(x,bH*.38,'#ffffff',8); },
  absorbed:(x,col)=>{ spawnParts(x,bH*.38,'#ffcc44',18); spawnParts(x,bH*.38,col,10); spawnParts(x,bH*.38,'#ffffff',6); },
  vanished:x=>spawnParts(x,bH*.38,'#b8a0e8',12),
  dodged:x=>{ spawnParts(x,bH*.38,'#9988cc',22); spawnParts(x,bH*.38,'#ffffff',8); flash('#9988cc'); },
  curseWarded:x=>spawnParts(x,bH*.38,'#ffcc44',14),
  resisted:x=>vfxDrip(x,bH*.34,'#665522',8,{vx:1.5,vy:0,vyVar:2,dec:.025}),
  bewitched:who=>{ const x=seatX(who); spawnParts(x,bH*.38,'#b86ef4',20); spawnParts(x,bH*.38,'#ffffff',8); flash('#b86ef4'); anim(who,'hit',800); },
  agony:x=>{ spawnParts(x,bH*.38,'#9944cc',12); flash('#330033'); },
  candle:x=>vfxFountain(x,bH*.38,['#ff6622','#ff9900'],8,{spread:.7,min:1.5,var:2.5,w:.04,sz:2.5,dec:.02}),
  // Dispel: pink burst at the target; stripped buffs float away in a white spray
  dispelHit:x=>{ flash('#ffaaff'); spawnParts(x,bH*.38,'#ffaaff',20); },
  stripped:x=>vfxFountain(x,bH*.38,['#ffddee','#ffffff','#ffffff','#ffffff'],28,{spread:.55,min:.7,var:1.8,w:.08,h:.05,dec:.010,decVar:.009}),
  cleanse:x=>{ spawnParts(x,bH*.38,'#ffaaff',30);
    vfxFountain(x,bH*.38,['#ffddee','#ffffff','#ffffff','#ffffff'],32,{spread:.55,min:.6,var:1.8,w:.08,h:.05,dec:.010,decVar:.009}); },
  arc:(x,col)=>spawnParts(x,bH*.38,col,8),
  lifesteal:(x)=>vfxFountain(x,bH*.38,['#cc1111'],10,{spread:.6,min:1.5,var:2.5,w:.04,sz:2,dec:.018}),
  // Retaliation, by the enchantment or ward that hit back
  retaliate:{
    counter:(fromX,toX)=>{ spawnParts(toX,bH*.38,'#4af0ff',16); spawnBeam(fromX,bH*.38,toX,bH*.38,'#4af0ff'); },
    flameshield:(fromX,toX)=>spawnParts(toX,bH*.38,'#ff6600',8),
    frostarmor:(fromX,toX)=>spawnParts(toX,bH*.38,'#88ddff',8),
    dragonscales:(fromX,toX)=>spawnParts(toX,bH*.38,'#cc6622',8),
  },
};

// Plain element strikes off the wheel (the original Inferno / Lightning Bolt / Frost Nova /
// Arcane Surge impacts; Dark uses Mana Burn's, Physical the melee sparks). An empowered hit bursts bigger.
const ELEM_IMPACT_VFX={
  fire:     (c,n)=>{ spawnParts(c.tx,c.y,'#ff6622',n); flash('#ff6622'); },
  ice:      (c,n)=>{ spawnParts(c.tx,c.y,'#88ddff',n); flash('#88ddff'); },
  lightning:(c,n)=>{ spawnParts(c.tx,c.y,'#ffee44',n); spawnParts(c.tx,c.y,'#ffffff',8); flash('#ffee44'); },
  arcane:   (c,n)=>{ spawnParts(c.tx,c.y,'#cc88ff',n); flash('#cc88ff'); },
  physical: (c,n)=>{ spawnParts(c.tx,c.y,'#d0a060',n); flash('#d0a060'); },
  dark:     (c,n)=>{ spawnParts(c.tx,c.y,'#cc44ff',n); spawnParts(c.tx,c.y,'#ff88ff',10); spawnManaBurnFire(c.tx,c.y); flash('#cc44ff'); },
};

// Damage-over-time ticks, by the effect that deals them (fallback: by element)
const TICK_VFX={
  singularity:(x,y)=>vfxFountain(x,y,['#aa66ff','#6633aa','#6633aa'],14,{spread:.75,min:2,var:3.5,sz:3,dec:.026,decVar:.02,grav:true}),
  plague:     (x,y)=>vfxDrift(x,y,['#44bb22'],8,{w:.05,lift:-1,dec:.02}),
  blizzard:   (x,y)=>vfxDrift(x,y,['#88ddff'],10,{spd:.6,lift:-1.8,dec:.016}),
  fire:       (x,y)=>vfxFountain(x,y,['#ff9900','#ff4400','#ff4400'],14,{spread:.75,min:2,var:3.5,sz:3,dec:.026,decVar:.02,grav:true}),
  dark:       (x,y)=>vfxFountain(x,y,['#88dd44','#55aa33','#55aa33'],14,{spread:.75,min:2,var:3.5,sz:3,dec:.026,decVar:.02,grav:true}),
  physical:   (x,y)=>vfxDrift(x,y,['#22aa66','#44cc88'],10,{spd:1.2,lift:-.5,sz:2.5,dec:.02,grav:true}),
  regen:      (x,y)=>vfxFountain(x,y,['#88ffcc','#44ee88'],10,{spread:.55,min:.8,var:1.8,w:.06,lift:-.5,sz:2.5,dec:.011,decVar:.01}),
  bonetotem:  (x,y)=>vfxFountain(x,y,['#55aa33'],6,{spread:.6,min:.7,var:0,w:.04,lift:-.3,sz:2,dec:.016}),
};
const MINION_VFX={
  blade:(x,y)=>vfxDrift(x,y,['#aaaadd'],4,{spd:1.2,lift:-.5,dec:.022,grav:true}),
  skeleton:(x,y)=>vfxDrift(x,y,['#9966cc'],6,{spd:1,lift:-.5,dec:.022,grav:true}),
  simulacrum:(x,y)=>spawnParts(x,y,'#b86ef4',10),
};

// Each signature spell's own look, ported from its original effect.
//   self(c): cast on yourself (wards, buffs, instants)  ·  hit(c): lands on the target (strikes, curses)
//   delivery: how a strike travels — 'lunge' (melee) or {volley:n|'blades', gap} (several projectiles)
// c = {who, tgt, cx, tx, y, col (caster colour), healed (Volatile Tonic outcome)}
const SPELL_VFX={
  // Eldrin
  shield:   {self:c=>anim(c.who,'shield',700)},
  counter:  {self:c=>{ spawnParts(c.cx,c.y,'#4af0ff',16); spawnParts(c.cx,c.y,'#ffffff',6); anim(c.who,'shield',700); }},
  ward:     {self:c=>{ spawnParts(c.cx,c.y,'#ffcc44',14); spawnParts(c.cx,c.y,'#ffffff',6); anim(c.who,'shield',700); }},
  // Malachar
  empower:  {self:c=>{ spawnParts(c.cx,c.y,c.col,10); anim(c.who,'cast',700); }},
  bloodpact:{self:c=>{ vfxDrip(c.cx,c.y,'#cc1111',8); vfxFountain(c.cx,c.y,['#8844ff'],10,{spread:.6,min:1.5,var:2.5,w:.04,sz:2,dec:.02}); anim(c.who,'cast',700); }},
  drain:    {hit:c=>{ spawnBeam(c.cx,c.y,c.tx,c.y,'#cc1111'); spawnParts(c.tx,c.y,'#cc1111',18); flash('#cc1111'); vfxStrikeAnim(c.who,c.tgt); }},
  // Sylvara
  heal:     {self:c=>{ vfxFountain(c.cx,c.y,['#88ffcc','#44ee88'],14); anim(c.who,'cast',700); }},
  entangle: {hit:c=>{ vfxRing(c.tx,c.y,['#44cc88'],10,{spd:.9,sz:2}); spawnParts(c.tx,c.y,'#44cc88',8); anim(c.who,'cast',800); }},
  vinewhip: {hit:c=>{ vfxRing(c.tx,c.y,['#44cc88'],12,{r:.07,sz:2}); spawnParts(c.tx,c.y,'#44cc88',10); vfxStrikeAnim(c.who,c.tgt); }},
  // Aurelia
  foresight:{self:c=>{ spawnParts(c.cx,c.y,c.col,14); spawnParts(c.cx,c.y,'#ffffff',6); anim(c.who,'shield',700); }},
  timedrain:{hit:c=>{ spawnParts(c.tx,c.y,'#cc88ff',12); spawnParts(c.tx,c.y,c.col,6); anim(c.who,'cast',700); }},
  haste:    {self:c=>{ vfxFountain(c.cx,c.y,[c.col,'#ffffff'],14,{spread:1,min:1.5,var:3,w:0,sz:2.5,dec:.016}); anim(c.who,'shield',700); }},   // Rewind
  // Gnash
  warpaint: {self:c=>{ vfxDrip(c.cx,bH*.35,'#cc1111',8,{vx:1.5,vy:1,vyVar:2.5,dec:.025}); spawnParts(c.cx,c.y,c.col,10); anim(c.who,'shield',700); }},
  charge:   {delivery:'lunge', hit:c=>{ spawnParts(c.tx,c.y,c.col,22); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  frenzy:   {self:c=>{ spawnParts(c.cx,c.y,c.col,18); vfxDrip(c.cx,bH*.35,'#cc1111',6,{vx:1.5,vy:1,vyVar:2.5,dec:.025}); anim(c.who,'cast',700); }},
  // Cinder
  fireball: {hit:c=>{ vfxRing(c.tx,c.y,['#ffaa00','#ff6600'],18,{spd:1.4,lift:-.5,sz:3}); spawnParts(c.tx,c.y,'#ff6600',20); flash('#ff6600'); vfxStrikeAnim(c.who,c.tgt); }},
  flameshield:{self:c=>{ vfxRing(c.cx,c.y,['#ffaa00','#ff6600'],14,{out:true,spd:1,lift:-.5,dec:.018,noGrav:true}); spawnParts(c.cx,c.y,'#ff6600',8); spawnParts(c.cx,c.y,'#ffaa00',4); anim(c.who,'shield',700); }},
  candle:   {hit:c=>{ vfxDrift(c.tx,c.y,['#ffaa00','#ff6600'],12,{w:.05,spd:.7,lift:-1.5,dec:.018}); spawnParts(c.tx,c.y,'#ff6600',10); anim(c.who,'cast',800); }},
  // Skadi
  icelance: {hit:c=>{ vfxRing(c.tx,c.y,['#88ddff'],16,{r:.05,ry:.03}); spawnParts(c.tx,c.y,'#88ddff',18); flash('#88ddff'); vfxStrikeAnim(c.who,c.tgt); }},
  frostarmor:{self:c=>{ vfxRing(c.cx,c.y,['#88ddff'],16,{out:true,spd:.8,lift:-.5,dec:.016,noGrav:true}); spawnParts(c.cx,c.y,'#aaeeff',8); spawnParts(c.cx,c.y,'#ffffff',4); anim(c.who,'shield',700); }},
  blizzard: {hit:c=>{
    for(let i=0;i<20;i++){
      const a=_rng()*Math.PI*2, r=bH*(0.05+_rng()*0.08);
      gs.parts.push({x:c.tx+Math.cos(a)*r,y:c.y+Math.sin(a)*r*0.5,col:'#88ddff',
        vx:Math.cos(a)*0.6+(_rng()-.5)*0.8,vy:Math.sin(a)*0.6-1-_rng()*2,sz:1.5+_rng()*2.5,life:1,dec:.012,noGrav:true});
    }
    spawnParts(c.tx,c.y,'#88ddff',12); spawnParts(c.tx,c.y,'#aaeeff',6); anim(c.who,'cast',800); }},
  // Zacharius
  galvanize:{self:c=>{ vfxRing(c.cx,c.y,['#88ffcc','#aaff44'],12,{out:true,spd:.9,lift:-.5,dec:.018,noGrav:true}); spawnParts(c.cx,c.y,'#aaff44',8); spawnParts(c.cx,c.y,'#ffffff',4); anim(c.who,'shield',700); }},
  chainlightning:{hit:c=>{ vfxRing(c.tx,c.y,['#ffffff','#aaff44'],14,{r:.05,ry:.03,spd:1.5,sz:2,dec:.022}); spawnBeam(c.cx,c.y,c.tx,c.y,c.col); spawnParts(c.tx,c.y,c.col,18); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  conductivity:{hit:c=>{ vfxDrift(c.tx,c.y,['#88ffcc','#aaff44'],14,{w:.06,lift:-1.2}); spawnParts(c.tx,c.y,c.col,10); anim(c.who,'cast',800); }},
  // Mary
  divineheal:{self:c=>{ vfxFountain(c.cx,c.y,['#fff8c0','#ffe090'],16,{spread:.9}); flash(c.col); anim(c.who,'cast',700); }},
  purge:    {self:c=>{ spawnParts(c.cx,c.y,'#fffde0',18); spawnParts(c.cx,c.y,'#ffffff',8); flash('#fffff0'); anim(c.who,'shield',700); }},
  radiant:  {hit:c=>{ spawnParts(c.tx,c.y,c.col,16); spawnBeam(c.cx,c.y,c.tx,c.y,c.col); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  // Mordant (the three hexes share one look)
  agony:     {hit:c=>SPELL_VFX._hex(c)},
  silence:   {hit:c=>SPELL_VFX._hex(c)},
  corruption:{hit:c=>SPELL_VFX._hex(c)},
  _hex:c=>{ spawnParts(c.tx,c.y,c.col,18); spawnParts(c.tx,c.y,'#110011',8); spawnBeam(c.cx,c.y,c.tx,c.y,c.col); flash(c.col); vfxStrikeAnim(c.who,c.tgt); },
  // Ponder
  vanish:   {self:c=>{ spawnParts(c.cx,c.y,'#b8a0e8',14); spawnParts(c.cx,c.y,'#ffffff',6); anim(c.who,'shield',700); }},
  manasiphon:{self:c=>{ spawnParts(c.tx,c.y,'#b8a0e8',14); spawnParts(c.cx,c.y,'#b8a0e8',8); anim(c.who,'cast',700); }},
  blink:    {self:c=>{ spawnParts(c.cx,c.y,'#9988cc',22); spawnParts(c.cx,c.y,'#ffffff',8); anim(c.who,'shield',700); }},
  // Durin
  stoneskin:{self:c=>{
    // Three waves of rocks fly in and coat the caster
    [0,220,440].forEach((delay,wave)=>setTimeout(()=>{
      if(!battleRunning) return;
      const angle=wave/3*Math.PI*2+Math.PI/6, srcDist=bH*0.22;
      for(let j=0;j<4;j++){
        const a=angle+j/4*Math.PI*2;
        const srcX=c.cx+Math.cos(a)*srcDist, srcY=c.y+Math.sin(a)*srcDist*0.55, speed=0.06+_rng()*0.04;
        gs.parts.push({x:srcX,y:srcY,col:j%2?'#8b7355':'#a08060',vx:(c.cx-srcX)*speed,vy:(c.y-srcY)*speed,
          sz:3+_rng()*3,life:1,dec:.028,noGrav:true});
      }
      spawnParts(c.cx,c.y,c.col,4);
    },delay));
    anim(c.who,'shield',900); }},
  stonesoul:{self:c=>{ vfxRing(c.cx,c.y,['#b08040','#8b6914','#c8a060'],14,{out:true,r:.07,ry:.05,spd:.7,lift:-.3,dec:.015,noGrav:true}); spawnParts(c.cx,c.y,'#c8a060',8); spawnParts(c.cx,c.y,'#ffffff',4); anim(c.who,'shield',700); }},
  rockfall: {delivery:{volley:3,gap:350},
    pre:c=>{ spawnParts(c.cx,c.y,c.col,12); anim(c.who,'cast',900); },
    each:c=>{ vfxRing(c.tx,c.y,['#8b6914','#b08040'],10,{r:.04,ry:.03,lift:-.3,sz:3,dec:.022}); spawnParts(c.tx,c.y,c.col,10); flash(c.col); vfxStrikeAnim(c.who,c.tgt,600); }},
  // Weizan
  conjureblade:{self:c=>{ spawnParts(c.cx,c.y,'#aaaadd',14); spawnParts(c.cx,c.y,'#ffffff',5); anim(c.who,'cast',700); }},
  bladestorm:{delivery:{volley:'blades',gap:320,proj:'physical',col:'#aaaadd'},
    pre:c=>{ spawnParts(c.cx,c.y,'#aaaadd',16); anim(c.who,'cast',900); },
    each:c=>spawnParts(c.tx,c.y,c.col,10),
    hit:c=>{ flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  ironpatience:{self:c=>{ spawnParts(c.cx,c.y,'#888899',12); spawnParts(c.cx,c.y,'#ffffff',4); anim(c.who,'shield',700); }},
  // Gretch
  plague:     {hit:c=>{ spawnParts(c.tx,c.y,'#55aa33',16); spawnParts(c.tx,c.y,'#aaddaa',5); anim(c.who,'cast',800); }},
  maggotcloud:{hit:c=>{ spawnParts(c.tx,c.y,'#55aa33',14); spawnParts(c.tx,c.y,'#aaddaa',5); anim(c.who,'cast',800); }},
  bonetotem:  {self:c=>{ spawnParts(c.cx,c.y,'#55aa33',14); spawnParts(c.cx,c.y,'#aaddaa',6); anim(c.who,'shield',700); }},
  // Valdris
  raisedead:    {self:c=>{ spawnParts(c.cx,c.y,'#8844cc',14); spawnParts(c.cx,c.y,'#ffffff',5); anim(c.who,'cast',800); }},
  necroticdrain:{hit:c=>{ spawnParts(c.tx,c.y,'#8844cc',16); spawnBeam(c.cx,c.y,c.tx,c.y,'#8844cc'); flash('#8844cc'); vfxStrikeAnim(c.who,c.tgt); }},
  reinforce:    {self:c=>{ spawnParts(c.cx,c.y,'#8844cc',10); anim(c.who,'cast',700); }},
  // Mirel
  simulacrum:{self:c=>{ spawnParts(c.cx,c.y,'#b86ef4',16); spawnParts(c.cx,c.y,'#ffffff',6); anim(c.who,'shield',800); }},
  bewitch:   {hit:c=>{ spawnParts(c.tx,c.y,c.col,18); spawnParts(c.tx,c.y,'#ffffff',6); anim(c.who,'cast',800); }},
  feint:     {hit:c=>{ spawnParts(c.tx,c.y,c.col,18); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  // Thessaly
  enthral:    {hit:c=>{ spawnParts(c.tx,c.y,c.col,18); spawnParts(c.tx,c.y,'#ffffff',6); anim(c.who,'cast',800); }},
  arcaneweave:{self:c=>{ spawnParts(c.cx,c.y,c.col,14); spawnParts(c.cx,c.y,'#ffdd88',5); anim(c.who,'cast',700); }},
  spellbind:  {hit:c=>{ spawnParts(c.tx,c.y,c.col,16); spawnParts(c.tx,c.y,'#ffdd88',5); anim(c.who,'cast',800); }},
  // Korvath
  dragonscales:  {self:c=>{ vfxRing(c.cx,c.y,['#cc6622'],16,{out:true,spd:.8,lift:-.5,dec:.016,noGrav:true}); spawnParts(c.cx,c.y,'#dd8844',8); spawnParts(c.cx,c.y,'#ffcc88',4); anim(c.who,'shield',700); }},
  wyrmfirebreath:{hit:c=>{ spawnParts(c.tx,c.y,'#ff6622',18); spawnParts(c.tx,c.y,'#ffaa44',8); flash('#ff6622'); vfxStrikeAnim(c.who,c.tgt); }},
  ancientwrath:  {hit:c=>{ spawnParts(c.tx,c.y,'#ff4400',24); spawnParts(c.tx,c.y,'#ffaa00',10); flash('#ff4400'); vfxStrikeAnim(c.who,c.tgt); }},
  // Fizzwick
  causticbomb:       {hit:c=>{ spawnParts(c.tx,c.y,'#88dd44',18); spawnParts(c.tx,c.y,'#55aa33',8); flash('#88dd44'); vfxStrikeAnim(c.who,c.tgt); }},
  volatiletonic:     {self:c=>{
    if(c.healed) vfxFountain(c.cx,c.y,['#88ffcc','#44ee88'],14);
    else { spawnParts(c.cx,c.y,'#88dd44',10); spawnParts(c.cx,c.y,'#55aa33',6); }
    anim(c.who,'cast',700); }},
  unstableconcoction:{hit:c=>{ spawnParts(c.tx,c.y,'#cc66ff',22); spawnParts(c.tx,c.y,'#88dd44',8); flash('#cc66ff'); vfxStrikeAnim(c.who,c.tgt); }},
  // Nyxara
  singularity: {hit:c=>{ vfxRing(c.tx,c.y,['#6633aa'],16,{dec:.018}); spawnParts(c.tx,c.y,'#aa66ff',10); spawnParts(c.tx,c.y,'#330055',6); anim(c.who,'cast',800); }},
  gravitywell: {hit:c=>{ spawnParts(c.tx,c.y,'#aa66ff',22); spawnParts(c.tx,c.y,'#6633aa',8); flash('#6633aa'); vfxStrikeAnim(c.who,c.tgt); }},
  eventhorizon:{hit:c=>{ spawnParts(c.cx,c.y,'#6633aa',12); spawnParts(c.tx,c.y,'#aa66ff',22); spawnParts(c.tx,c.y,'#6633aa',8); flash('#6633aa'); vfxStrikeAnim(c.who,c.tgt); }},
};
function vfxCtx(who,tgt,extra){
  return Object.assign({who,tgt,cx:seatX(who),tx:seatX(tgt||who),y:bH*.38,col:seatCfg(who).col},extra);
}

// ── ROUND FLOW ─────────────────────────────────────────────
// Every round: each seat picks in secret → all picks are revealed together →
// the round resolves on the shared screen → round-end ticks → next pick phase.

// A seat carries its own character once the duel starts; before that, fall back to the picks
function seatCfg(who){ return (gs&&gs[who]&&gs[who].cfg)||(who==='p1'?p1Cfg:p2Cfg); }
function seatKey(who){ return (gs&&gs[who]&&gs[who].key)||(who==='p1'?p1Key:p2Key); }
// 3–4 seats stand in a row across the arena, team-mates side by side
function seatX(who){
  if(PLAYERS.length<=2) return who==='p1'?bW*.22:bW*.78;
  const order=PLAYERS.slice().sort((a,b)=>String(seatTeam(a)).localeCompare(String(seatTeam(b)))||PLAYERS.indexOf(a)-PLAYERS.indexOf(b));
  return bW*(0.13+0.74*order.indexOf(who)/(PLAYERS.length-1));
}
function seatFacesRight(who){ return PLAYERS.length<=2?who==='p1':seatX(who)<bW*.5; }
// Teams and targets. A seat knocked out of a 3–4 seat duel is `out` and takes no further part.
function seatTeam(who){ return (gs[who]&&gs[who].team)||who; }
function activeSeats(){ return PLAYERS.filter(w=>gs[w]&&!gs[w].out); }
function foesOf(who){ return activeSeats().filter(w=>seatTeam(w)!==seatTeam(who)); }
function alliesOf(who){ return activeSeats().filter(w=>w!==who&&seatTeam(w)===seatTeam(who)); }
// Does this pick aim at a foe? Strikes, dispels, curses and Mana Siphon do; wards, buffs and heals don't.
function needsTarget(who,action){
  if(action.self||action.cat==='pass'||action.cat==='meditate') return false;
  const sp=action.sig&&sigById(who,action.sig);
  if(!sp) return action.cat==='damage'||action.cat==='dispel';
  return sp.el.kind==='strike'||sp.el.kind==='curse'||!!(sp.el.action&&sp.el.action.type==='siphon');
}
// Team games: a ward, buff or heal can go on an ally instead. Not minions (they serve their owner),
// Blood Pact or Purge.
function canShareProtection(who,action){
  if(action.cat!=='protect'||action.self) return false;
  const sp=action.sig&&sigById(who,action.sig);
  if(!sp) return true;
  const el=sp.el;
  if(el.kind==='ward') return true;
  if(el.kind==='buff') return el.effect.type!=='minion';
  if(el.kind==='instant') return ['heal','tonic'].includes(el.action.type);
  return false;
}
// Who a Protection pick lands on: the chosen ally while they're still standing, else the caster
function protectTarget(who,action){
  const a=action.ally;
  return a&&a!==who&&gs[a]&&!gs[a].out?a:who;
}
// The foe with the least HP (ties go to a random one, so no seat is everyone's default)
function weakestFoe(who){
  const foes=foesOf(who);
  if(foes.length<=1) return foes[0];
  const low=Math.min(...foes.map(w=>gs[w].hp)), tied=foes.filter(w=>gs[w].hp===low);
  return tied[Math.floor(_rng()*tied.length)];
}
// Minions attack whoever their owner last aimed at, else the weakest foe
function minionTarget(owner){
  const last=gs[owner].lastTarget;
  return foesOf(owner).includes(last)?last:weakestFoe(owner);
}
function isHumanSeat(who){
  if(seatSetup&&multiMode) return !!seatSetup.find(st=>st.who===who).human;
  return twoPlayerMode||who==='p1';
}
// Several people share the device: picks are handed over and kept secret
// Several people still in the duel share the device: picks are handed over and kept secret.
// A knocked-out player is out — their go is skipped — so this counts only players still standing.
function passPhone(){ return twoPlayerMode||(multiMode&&!!seatSetup&&activeSeats().filter(isHumanSeat).length>1); }

function beginPickPhase(){
  if(!battleRunning||gameEnded) return;
  gs.pending={};
  promptNextPicker();
}

// Hand over to the next seat that hasn't picked; reveal once everyone has.
function promptNextPicker(){
  if(!battleRunning||gameEnded) return;
  const who=activeSeats().find(w=>!gs.pending[w]);
  if(!who){ showReveal(); return; }
  if(!isHumanSeat(who)){
    gs.pending[who]=aiChooseSync(who);
    promptNextPicker();
  } else if(passPhone()){
    showHandoffOverlay(who,()=>startPlayerTurn(who));
  } else {
    startPlayerTurn(who);
  }
}

function startPlayerTurn(who){
  if(!battleRunning||gameEnded) return;
  gs.turnPlayer=who;
  updateActionBar(seatCfg(who));
  gs.myTurn=true; gs.busy=false;
}

function commitPick(who,action){
  gs.pending[who]=action;
  gs.myTurn=false; gs.busy=true;
  // Short beat so the picker sees their choice register before the handoff covers it
  setTimeout(promptNextPicker,passPhone()?500:0);
}

function describeAction(who,action){ return describeElemAction(action,who); }

const REVEAL_TO_FIGHT_MS=1200;   // pause on the battlefield between the reveal closing and the first action

// Card-game style reveal: every seat's pick flips face-up at once, then the round plays out.
// Pass-the-phone waits for a tap so the device can be put where everyone can see it.
function showReveal(){
  const overlay=document.getElementById('reveal-overlay');
  const cards=document.getElementById('rv-cards');
  const btn=document.getElementById('rv-btn');
  cards.innerHTML=activeSeats().map(who=>{
    const cfg=seatCfg(who), act=gs.pending[who], d=describeAction(who,act);
    const label=!passPhone()?cfg.name:isHumanSeat(who)?'Player '+(PLAYERS.indexOf(who)+1):cfg.name+' (AI)';
    // With more than one foe, say who each spell is aimed at
    const aim=foesOf(who).length>1&&needsTarget(who,act)?`<span class="rv-aim">→ ${hitsAllFoes(who,act)?'All foes':seatCfg(act.target).name}</span>`:
      act.ally&&act.ally!==who?`<span class="rv-aim">→ ${seatCfg(act.ally).name}</span>`:'';
    return `<div class="rv-card" style="--rv-col:${cfg.col}"><div class="rv-inner">`+
      `<div class="rv-face rv-back"><img class="rv-portrait" src="portraits/${seatKey(who)}.png" alt=""><span class="rv-q">?</span><span class="rv-name">${label}</span></div>`+
      `<div class="rv-face rv-front"><span class="rv-ico">${d.icon}</span><span class="rv-spell">${d.name}</span>${aim}<span class="rv-name">${label}</span></div>`+
      `</div></div>`;
  }).join('');
  overlay.classList.toggle('rv-quick',!passPhone());
  overlay.classList.add('active');

  let fightTid=null, started=false;
  const fight=()=>{
    if(started) return; started=true;
    clearTimeout(fightTid);
    overlay.classList.remove('active');
    // Let everyone take in the battlefield before the first spell flies
    addFloat(bW*.5,bH*.3,'⚔ Round '+gs.round,'#f0cc6a',20);
    setTimeout(()=>{ if(battleRunning&&!gameEnded) resolveSimRound(); },REVEAL_TO_FIGHT_MS);
  };
  const flip=()=>{
    cards.querySelectorAll('.rv-card').forEach((c,i)=>setTimeout(()=>c.classList.add('flipped'),i*180));
    document.getElementById('rv-sub').textContent='Tap to begin';
    btn.textContent='⚔ Fight!';
    btn.onclick=fight;
    overlay.onclick=fight;
    fightTid=setTimeout(fight,passPhone()?3500:1800);
  };
  overlay.onclick=null;
  if(passPhone()){
    document.getElementById('rv-title').textContent='All Spells Chosen';
    document.getElementById('rv-sub').textContent='Place the phone where every wizard can see';
    btn.textContent='✨ Reveal!';
    btn.onclick=e=>{ e.stopPropagation(); flip(); };
  } else {
    document.getElementById('rv-title').textContent='Spells Revealed';
    btn.textContent='⚔ Fight!';
    btn.onclick=fight;
    setTimeout(flip,300);
  }
}

// Resolve every committed action. Seats are grouped into ACTION_PRIORITY tiers
// (lower acts first); actions within a tier are simultaneous, so win checks wait
// until the whole tier has acted (double KO → draw).
function resolveSimRound(){
  if(activeSeats().some(w=>!gs.pending[w])) return;
  const acts=gs.pending;
  gs.pending={};
  gs.myTurn=false; gs.busy=true;
  const seatsIn=activeSeats();
  gs.roundDmg={};
  seatsIn.forEach(w=>{ gs[w].hpAtRoundStart=gs[w].hp; });
  // What each seat could see before this round: was it ganged, could it phase, did it?
  seatsIn.forEach(w=>{
    const st=gs[w];
    if(phaseReady(w)){ st.phaseChances=(st.phaseChances||0)+1; if(acts[w].cat==='phase') st.phaseUses=(st.phaseUses||0)+1; }
  });
  // Phasing seats step out of the round before anything, even a quick spell, can reach them
  seatsIn.forEach(w=>{ if(acts[w].cat==='phase'){ gs[w].phasedRound=gs.round; gs[w].phasedCount=0; } });
  // Who aims at whom this round (a Greater strike at every foe isn't focusing on anyone); the AI reads it next round
  gs.focus={};
  seatsIn.forEach(w=>{ const a=acts[w]; if(needsTarget(w,a)&&a.target&&a.target!==w&&!hitsAllFoes(w,a)) (gs.focus[a.target]=gs.focus[a.target]||[]).push(w); });
  // How many aimed at each seat, round by round — what a wizard can read before betting on Phase Shift
  seatsIn.forEach(w=>{ (gs[w].aimHistory||(gs[w].aimHistory=[])).push((gs.focus[w]||[]).length); });
  // Quick spells (Mana Siphon) are paid and steal first, so their target pays from what's left
  const isQuick=w=>{ const a=acts[w], sp=a.sig&&sigById(w,a.sig); return !!(sp&&sp.el.quick); };
  seatsIn.filter(isQuick).forEach(w=>{ payForAction(w,acts[w]); if(acts[w].outcome==='cast') quickSteal(w,acts[w]); });
  seatsIn.filter(w=>!isQuick(w)).forEach(w=>payForAction(w,acts[w]));

  const tiers=[];
  seatsIn.forEach(who=>{
    const pri=actionPriority(acts[who]);
    let tier=tiers.find(t=>t.pri===pri);
    if(!tier){ tier={pri,seats:[]}; tiers.push(tier); }
    tier.seats.push(who);
  });
  tiers.sort((a,b)=>a.pri-b.pri);


  let ti=0;
  const runTier=()=>{
    if(!battleRunning||gameEnded) return;
    if(ti>=tiers.length){ endSimRound(); return; }
    const tier=tiers[ti++], seats=tier.seats;
    if(ELEM_STAGE_BANNERS[tier.pri]) addFloat(bW*.5,bH*.14,ELEM_STAGE_BANNERS[tier.pri],'#f0cc6a',15);
    let si=0;
    deferWinCheck=true;
    const next=()=>{
      if(!battleRunning) return;
      if(si>=seats.length){
        settleWin();
        runTier();
        return;
      }
      const who=seats[si++];
      if(gs[who].out){ next(); return; }   // knocked out earlier this round
      executeElemental(who,acts[who],next);
    };
    next();
  };
  runTier();
}

// Round-end effects on `who`: DoTs, regen, the foe's minions, durations, then mana income.
// Callers defer win checks so simultaneous tick deaths resolve as a draw.
function tickRound(who){
  elemTickEffects(who);
  gs[who].mana=Math.min(MAX_MANA,gs[who].mana+elemIncome(who));
}

function runRoundTicks(){
  deferWinCheck=true;
  activeSeats().forEach(tickRound);
  activeSeats().forEach(w=>{ const st=gs[w]; st.lastRoundLoss=Math.max(0,(st.hpAtRoundStart??st.hp)-st.hp); });
  settleWin();
}

// End-of-round cleanup, then round-end ticks on the shared screen, then the next pick phase.
function endSimRound(){
  if(!battleRunning||gameEnded) return;
  gs.myTurn=false; gs.busy=true;
  PLAYERS.forEach(w=>{
    const st=gs[w];
    if(st.shield>0){ st.shield--; if(st.shield<=0){ st.shieldHp=0; st.shieldType=null; st.wardRetaliate=0; st.wardSig=null; } }
    if(st.shield>0) st.shieldHp=Math.max(1,Math.round(st.shieldHp*ELEM_WARD_DECAY));
  });
  gs.round++;
  if(GAME_OPTIONS.longDuels==='draw'&&gs.round>GAME_OPTIONS.roundLimit){ timeUp(); return; }
  if(suddenDeathLevel()===1&&!simMode){ addFloat(bW*.5,bH*.22,'⚡ SUDDEN DEATH ⚡','#ff5566',22); flash('#ff3344'); }
  if(simMode){ runRoundTicks(); return; }

  const delay=Math.max(0,(gs.lastAnimEnd||0)-Date.now())+600;
  if(aiTid) clearTimeout(aiTid);
  aiTid=setTimeout(()=>{
    if(!battleRunning||gameEnded) return;
    const floatsBefore=gs.floats.length;
    runRoundTicks();
    if(!battleRunning||gameEnded) return;
    // Give any tick numbers time to be read before the screen is handed over
    aiTid=setTimeout(beginPickPhase,gs.floats.length>floatsBefore?1300:200);
  },delay);
}


// ── ELEMENTAL DUEL (Damage / Protection / Dispel) ──────────
// Protection beats Damage, Dispel beats Protection, Damage beats Dispel.
// Rounds resolve in stages — every Protection pick, then every Dispel, then every Damage —
// so a ward raised this round already stops this round's damage. See docs/rps-duel-design.md.
const ELEM_START_MANA=6;
const ELEM_INCOME=4;            // mana every seat gains at the end of each round
const ELEM_WARD_ROUNDS=3;       // a ward lasts the round it is raised + 2 more
const ELEM_WARD_DECAY=0.75;     // ward HP kept at each round end
const ELEM_CHILL_MIN_TIER=2;    // Ice of this strength or more chills when it reaches HP
const ELEM_LIGHTNING_BURN=[1,2,3]; // mana burned by Lightning per tier, ward or not
const ELEM_LOCK_ROUNDS=2;       // a lock applied this round blocks the target's next pick
const ELEM_DISPEL_ALL_TIER=3;
const ELEM_CURSE_DISPEL=0.5;
// Share of a strike's damage a ward loses: match = a strike in the ward's own element, off = any other element
const ELEM_WARD_TAKE={match:1.5, off:0.75};   // wards resist other elements; their own unravels them

const ELEMENTS=[
  {id:'fire',      name:'Fire',      icon:'🔥', col:'#ff6622'},
  {id:'ice',       name:'Ice',       icon:'❄️', col:'#88ddff'},
  {id:'lightning', name:'Lightning', icon:'⚡', col:'#ffee44'},
  {id:'arcane',    name:'Arcane',    icon:'🌀', col:'#cc88ff'},
  {id:'physical',  name:'Physical',  icon:'👊', col:'#d0a060'},
  {id:'dark',      name:'Dark',      icon:'💀', col:'#9944cc'},
];
const ELEM_CATS={
  //       cost / power per tier (inner, middle, outer ring); stage = resolution order
  protect:{name:'Protection', verb:'Ward',   icon:'🛡', cost:[5,8,12], power:[20,35,55], stage:1, unit:'ward HP'},
  dispel: {name:'Dispel',     verb:'Dispel', icon:'✦',  cost:[1,2,4],  power:[15,30,50], stage:2, unit:'vs ward'},
  damage: {name:'Damage',     verb:'Strike', icon:'⚔️', cost:[3,5,8],  power:[8,15,26],  stage:3, unit:'dmg'},
};
const ELEM_TIER_NAMES=['Lesser ','','Greater '];
const ELEM_STAGE_BANNERS={1:'🛡 Protection',2:'✦ Dispel',3:'⚔️ Damage'};

// Casting minigame per element (Physical and Dark borrow a minigame with their own glyphs)
const ELEM_MINIGAME={fire:launchPatternEcho, ice:launchIcePattern, lightning:launchLightningPattern,
  arcane:launchArcanePattern, physical:launchPatternEcho, dark:launchManaBurnPattern};
const ELEM_GLYPHS={physical:[1,2,3,8], dark:[6,9,2,4]};   // Δ ∇ Ψ ⊕ (stone) / ☽ ⊗ ∇ Ω (necromancy)
const ELEM_WARD_THEME={fire:'flameshield', ice:'frostarmor', lightning:'shield',
  arcane:'foresight', physical:'stoneskin', dark:'warpaint'};
const ELEM_PROJ={fire:'fire', ice:'ice', lightning:'lightning', arcane:'arcane', physical:'physical', dark:'manaburn'};

// Elements a character can't cast at all (characters.json "forbidden"): their sectors are locked
// on every wheel. Never one of the character's own signature sectors.
function elemForbidden(who,elem){ return (seatCfg(who).forbidden||[]).includes(elem); }
function foesCantCast(who,elem){ return foesOf(who).every(w=>elemForbidden(w,elem)); }
function elemById(id){ return ELEMENTS.find(e=>e.id===id)||ELEMENTS[3]; }
function hasWard(st){ return st.shield>0&&st.shieldHp>0; }

// ── Signature spells: each character spell with an `el` block in characters.json ──
// el.cat (damage/protect/dispel) sets the wheel it is listed under, its resolution stage, and
// which locks/spellbinds affect it. el.kind: strike | ward | buff (enchantment on self) |
// curse (enchantment on the foe) | instant.
function sigSpells(who,cat){ return (seatCfg(who).spells||[]).filter(s=>s.el&&(!cat||s.el.cat===cat)); }
function sigById(who,id){ return (seatCfg(who).spells||[]).find(s=>s.id===id&&s.el); }
function sigName(sp){ return sp.el.name||sp.name; }
function sigIcon(sp){ return sp.el.icon||sp.icon; }

// ── Enchantments: st.effects = [{id,type,kind:'buff'|'curse',name,icon,rounds|null,...params}] ──
function effectsOf(st,type){ return (st&&st.effects||[]).filter(e=>e.type===type); }
function takeEffect(st,type,pred){
  const i=(st.effects||[]).findIndex(e=>e.type===type&&(!pred||pred(e)));
  if(i<0) return null;
  return st.effects.splice(i,1)[0];
}
function countMinions(st,minion){ return effectsOf(st,'minion').filter(e=>e.minion===minion).length; }
function syncMinionVisuals(st){
  // drawWiz draws blades / skeletons / simulacra from these fields
  st.blades=countMinions(st,'blade');
  st.skeletons=effectsOf(st,'minion').filter(e=>e.minion==='skeleton').map(()=>({hp:25}));
  st.simulacra=effectsOf(st,'minion').filter(e=>e.minion==='simulacrum').map(()=>({}));
}
function addEffect(who,eff,fromWho){
  const st=gs[who], x=seatX(who);
  if(eff.kind==='curse'&&effectsOf(st,'warding').length){
    addFloat(x,bH*.3,'🔰 '+eff.name+' resisted!','#88ccff',12);
    VFX.curseWarded(x);
    return false;
  }
  if(eff.type==='lock'){
    if(catLocked(who,eff.cat)) return false;
    // No back-to-back locks: the round this would block must not follow a locked round
    if(st.lastLockedRound!=null&&gs.round+1-st.lastLockedRound<2){
      addFloat(x,bH*.3,'💪 Breaks free!','#cccccc',12);
      return false;
    }
    st.lastLockedRound=gs.round+1;   // the round the lock actually blocks
  }
  // Same enchantment again refreshes it; minions stack instead
  if(eff.type!=='minion') st.effects=st.effects.filter(e=>e.id!==eff.id);
  st.effects.push(Object.assign({from:fromWho},eff));
  if(eff.type==='minion') syncMinionVisuals(st);
  addFloat(x,bH*.26,eff.icon+' '+eff.name+'!',eff.kind==='curse'?'#cc88ff':'#88ffcc',13);
  return true;
}
function removeEffects(who,list,reason){
  const st=gs[who], x=seatX(who);
  list.forEach(e=>{
    st.effects=st.effects.filter(f=>f!==e);
    if(e.type==='minion'&&e.healOnRemove){
      st.hp=Math.min(st.maxHp,st.hp+e.healOnRemove);
      addFloat(x,bH*.42,'+'+e.healOnRemove+' 💀','#88ffcc',11);
    }
  });
  if(list.length){
    addFloat(x,bH*.3,reason+': '+list.map(e=>e.icon).join(' '),'#ffaaff',12);
    if(reason==='✦ Dispelled') VFX.stripped(x);
  }
  syncMinionVisuals(st);
}
function buffsOf(st){ return (st.effects||[]).filter(e=>e.kind==='buff'); }
function cursesOf(st){ return (st.effects||[]).filter(e=>e.kind==='curse'); }

function catLocked(who,cat){ return effectsOf(gs[who],'lock').some(e=>e.cat===cat); }
function spellbindExtra(who,cat){
  return effectsOf(gs[who],'spellbind').filter(e=>e.cat===cat).reduce((a,e)=>a+e.extra,0);
}
// A Phase Shift that caught two or more spells makes the phaser's next pick free, at any ring
function hasFreeSpell(who){ return !!(gs&&gs[who]&&gs[who].freeSpellRound===gs.round); }
function elemCost(who,cat,tier){
  if(hasFreeSpell(who)) return 0;
  const mod=cat==='protect'?(seatCfg(who).shieldCostMod||0):0;
  return Math.max(1,ELEM_CATS[cat].cost[tier-1]+mod)+spellbindExtra(who,cat);
}
// A signature spell's numbers are written for the middle ring; the inner and outer rings scale them
const SIG_COST_SCALE=[0.6,1,1.6], SIG_POWER_SCALE=[0.6,1,1.5];
function sigAtTier(sp,tier){
  const s=SIG_POWER_SCALE[tier-1], el=JSON.parse(JSON.stringify(sp.el));
  const n=v=>Math.max(1,Math.round(v*s));
  const pct=(v,cap)=>Math.min(cap,Math.round(v*s*100)/100);
  const mult=v=>Math.round((1+(v-1)*s)*100)/100;
  el.tier=tier;
  if(el.cost>0) el.cost=Math.max(1,Math.round(el.cost*SIG_COST_SCALE[tier-1]));
  ['power','ward','retaliate','perSkeleton','perBlade','rewind','manaburn','drainNow','hpCost'].forEach(k=>{ if(el[k]) el[k]=n(el[k]); });
  if(el.variance) el.variance=el.variance.map(n);
  if(el.pctHp) el.pctHp=pct(el.pctHp,0.6);
  if(el.dot) el.dot.dmg=n(el.dot.dmg);
  if(el.arc) el.arc.dmg=n(el.arc.dmg);
  if(el.chance!=null) el.chance=pct(el.chance,1);
  const e=el.effect;
  if(e){
    ['perRound','retaliate','dmg','n','bonus','burn','extra'].forEach(k=>{ if(e[k]) e[k]=n(e[k]); });
    if(e.ramp) e.ramp=e.ramp.map(n);
    if(e.pct) e.pct=pct(e.pct,0.7);
    if(e.mult) e.mult=mult(e.mult);
    if(['absorbNext','warding','bewitch'].includes(e.type)) e.rounds=Math.max(1,e.rounds+tier-2);
  }
  const a=el.action;
  if(a){ ['amt','mana','heal'].forEach(k=>{ if(a[k]) a[k]=n(a[k]); }); if(a.mult) a.mult=mult(a.mult); }
  return el;
}
// The character's signature spell occupying this sector of the category's wheel, if any
function sigAt(who,cat,elem){ return sigSpells(who,cat).find(sp=>sp.el.elem===elem)||null; }
function sigCost(who,sp,tier){ return hasFreeSpell(who)?0:Math.max(0,sigAtTier(sp,tier).cost+spellbindExtra(who,sp.el.cat)); }
function sectorOk(who,cat,elem,tier){
  if(elemForbidden(who,elem)) return false;
  const sp=sigAt(who,cat,elem);
  return sp?!sigBlocked(who,sp,tier):elemCost(who,cat,tier)<=gs[who].mana;
}
// Why a signature spell can't be cast at this ring right now ('' = it can)
function sigBlocked(who,sp,tier){
  const st=gs[who], el=sigAtTier(sp,tier);
  if(sigCost(who,sp,tier)>st.mana) return 'Not enough mana';
  if(el.oncePerDuel&&st.usedSig[sp.id]) return 'Once per duel';
  if(el.requires==='blades'&&countMinions(st,'blade')===0) return 'Needs a blade';
  if(el.kind==='buff'&&el.effect.type==='minion'&&countMinions(st,el.effect.minion)>=el.effect.max) return 'Maximum reached';
  if(el.hpCost&&st.hp<=el.hpCost) return 'Not enough HP';
  return '';
}
function elemCanPick(who,cat){
  if(catLocked(who,cat)) return false;
  if(cat==='dispel'&&elemCost(who,cat,1)<=gs[who].mana) return true;   // Cleanse Self
  return ELEMENTS.some(e=>sectorOk(who,cat,e.id,1));
}
// Phase Shift (3–4 seats): a bet that you're about to be targeted. Everything aimed at you this round misses,
// and you gain the mana each caster spent on it. Priced near the cost of a typical aimed spell, so one
// attacker is roughly break-even, nobody is a loss (mana and your turn), and a gang pays you.
const PHASE={enabled:true, cost:4, smartAI:true, freeAt:2};
function phaseReady(who){ return PHASE.enabled&&PLAYERS.length>2&&gs[who].mana>=PHASE.cost; }
function phaseCaught(who){
  const st=gs[who];
  if(++st.phasedCount===PHASE.freeAt&&PHASE.freeAt){
    st.freeSpellRound=gs.round+1;
    addFloat(seatX(who),bH*.18,'✨ Free spell next round!','#f0cc6a',13);
  }
}
function phaseGain(who,n){
  if(n<=0) return;
  const st=gs[who]; n=Math.min(n,MAX_MANA-st.mana);
  st.mana+=n; st.phaseGained=(st.phaseGained||0)+n;
  if(n>0) addFloat(seatX(who),bH*.44,'🌀 +'+n+' Mana','#b8a0e8',12);
}
function isPhased(who){ return gs[who]&&gs[who].phasedRound===gs.round; }
// Meditate: skip your spell to gain mana on top of income, a bet that the foe won't strike this round.
// It resolves after every Damage, so this round's mana burns can't touch it. Not two rounds in a row.
const MEDITATE={gain:3};
function canMeditate(who){
  const st=gs[who];
  return st.meditatedRound!==gs.round-1&&st.mana<MAX_MANA&&!hasFreeSpell(who);
}
function actionPriority(action){ return action.cat==='phase'?0:ELEM_CATS[action.cat]?ELEM_CATS[action.cat].stage:4; }
function describeElemAction(action,who){
  if(action.cat==='pass') return {icon:'…',name:'Waits'};
  if(action.cat==='meditate') return {icon:'🧘',name:'Meditate'};
  if(action.cat==='phase') return {icon:'🌀',name:'Phase Shift'};
  const cat=ELEM_CATS[action.cat];
  if(action.sig){
    const sp=sigById(who,action.sig);
    return {icon:cat.icon+(sp?sigIcon(sp):'★'),name:ELEM_TIER_NAMES[(action.tier||2)-1]+(sp?sigName(sp):action.sig)};
  }
  if(action.self) return {icon:'✦',name:'Cleanse Self'};
  const el=elemById(action.elem);
  return {icon:cat.icon+el.icon,name:ELEM_TIER_NAMES[action.tier-1]+el.name+' '+cat.verb};
}

// ── Pick UI: three category buttons → strength wheel (+ signature spells) → minigame ──
let wheelCat=null;
function openElemWheel(cat){
  if(!gs.myTurn||gs.busy) return;
  const who=gs.turnPlayer;
  if(!elemCanPick(who,cat)) return;
  wheelCat=cat;
  const c=ELEM_CATS[cat], st=gs[who];
  document.getElementById('wheel-title').textContent=c.icon+' '+c.name;
  document.getElementById('wheel-mana').textContent='Mana: '+st.mana;
  const selfBtn=document.getElementById('wheel-self');
  selfBtn.style.display=cat==='dispel'?'':'none';
  selfBtn.textContent='✦ Cleanse Self ('+elemCost(who,'dispel',1)+' Mana)';
  const ruleText={
    damage:'A ward\'s own element unravels it · Lightning also burns mana · Ice (middle ring or stronger) chills: no Damage next round',
    protect:'Wards last 3 rounds, fading each round · they resist other elements, but their own element unravels them',
    dispel:'Breaks wards (double vs the same element) · with no ward up, strips an enchantment · curses also weaken wards',
  }[cat];
  document.getElementById('wheel-rule').textContent=ruleText;
  document.getElementById('wheel-legend').innerHTML=[0,1,2].map(t=>{
    const cost=elemCost(who,cat,t+1), off=cost>st.mana;
    return `<div class="wl-row${off?' off':''}"><span>${['Inner','Middle','Outer'][t]}</span><span>${cost} Mana</span><span>${c.power[t]} ${c.unit}</span></div>`;
  }).join('');
  // Signature spells replace their element's sector; list what each one does
  const sigs=sigSpells(who,cat);
  document.getElementById('wheel-sig').innerHTML=sigs.length?
    `<div class="wsig-label">★ ${seatCfg(who).name}'s spells on this wheel</div>`+sigs.map(sp=>{
      const e=elemById(sp.el.elem), why=sigBlocked(who,sp,1);
      const costs=[1,2,3].map(t=>sigCost(who,sp,t)).join(' / ');
      return `<div class="wsig-row${why?' off':''}"><span class="wsig-ico">${sigIcon(sp)}</span>`+
        `<span class="wsig-name">${sigName(sp)} <small>${e.icon} ${e.name}</small></span>`+
        `<span class="wsig-cost">${costs} Mana</span>`+
        `<span class="wsig-desc">${why&&why!=='Not enough mana'?why:sp.el.desc||''} <small>(middle ring)</small></span></div>`;
    }).join(''):'';
  buildWheelSvg(who,cat);
  document.getElementById('wheel-overlay').classList.add('active');
}
function closeElemWheel(){
  document.getElementById('wheel-overlay').classList.remove('active');
  wheelCat=null;
}

const WHEEL_RINGS=[[38,82],[82,124],[124,166]];
function buildWheelSvg(who,cat){
  const svg=document.getElementById('wheel-svg');
  const pt=(r,a)=>(r*Math.cos(a)).toFixed(1)+' '+(r*Math.sin(a)).toFixed(1);
  const step=Math.PI*2/ELEMENTS.length;
  let html='';
  ELEMENTS.forEach((el,i)=>{
    const a0=-Math.PI/2-step/2+i*step, a1=a0+step, am=(a0+a1)/2;
    const sp=sigAt(who,cat,el.id), banned=elemForbidden(who,el.id);
    WHEEL_RINGS.forEach(([r0,r1],t)=>{
      const off=!sectorOk(who,cat,el.id,t+1);
      const d=`M${pt(r0,a0)} L${pt(r1,a0)} A${r1} ${r1} 0 0 1 ${pt(r1,a1)} L${pt(r0,a1)} A${r0} ${r0} 0 0 0 ${pt(r0,a0)} Z`;
      html+=`<path class="wseg${off?' off':''}${sp?' sig':''}" d="${d}" data-elem="${el.id}" data-tier="${t+1}" `+
        `style="fill:${off?'#2a2a33':el.col};fill-opacity:${off?0.5:[0.22,0.42,0.68][t]}"/>`;
    });
    const label=banned?'⛔ '+el.name:sp?'★'+sigName(sp).split(' ')[0]:el.name;
    html+=`<text class="wicon${banned?' wicon-banned':''}" x="${(145*Math.cos(am)).toFixed(1)}" y="${(145*Math.sin(am)).toFixed(1)}">${sp?sigIcon(sp):el.icon}</text>`;
    html+=`<text class="wname${banned?' wname-banned':sp?' wname-sig':''}" x="${(103*Math.cos(am)).toFixed(1)}" y="${(103*Math.sin(am)).toFixed(1)}">${label}</text>`;
  });
  html+=`<circle class="wcentre" r="36"/><text class="wcentre-ico" y="2">${ELEM_CATS[cat].icon}</text>`;
  svg.innerHTML=html;
}
function onWheelTap(e){
  const seg=e.target.closest('.wseg');
  if(!seg||seg.classList.contains('off')||!wheelCat) return;
  const cat=wheelCat;
  closeElemWheel();
  castElemental(cat,seg.dataset.elem,+seg.dataset.tier,false);
}
function castElemental(cat,elemId,tier,self){
  const who=gs.turnPlayer;
  const sp=self?null:sigAt(who,cat,elemId);
  if(sp){ castSignature(sp.id,tier); return; }
  if(elemCost(who,cat,tier)>gs[who].mana||catLocked(who,cat)||(!self&&elemForbidden(who,elemId))) return;
  const el=elemById(elemId);
  const spell={name:describeElemAction({cat,elem:elemId,tier,self}).name, icon:el.icon,
    element:elemId, col:el.col, tier, glyphs:cat==='damage'?ELEM_GLYPHS[elemId]:undefined};
  const commit=ok=>chooseTarget(who,{type:'el',cat,elem:elemId,tier,self,ok});
  gs.busy=true;
  if(cat==='protect') launchBuffTileMatch(spell,ELEM_WARD_THEME[elemId],who,ok=>commit(ok));
  else if(cat==='dispel') launchDispelPattern(spell,commit);
  else ELEM_MINIGAME[elemId](spell,commit);
}

// A Greater (outer ring) strike hits every foe once there's more than one
const ELEM_GREATER_HITS_ALL_TIER=3;
function hitsAllFoes(who,action){
  return action.cat==='damage'&&needsTarget(who,action)&&action.tier>=ELEM_GREATER_HITS_ALL_TIER&&foesOf(who).length>1;
}
// Who a strike lands on: its target, then (for a Greater strike) every other foe
function strikeTargets(who,action){
  const foes=foesOf(who);
  if(!hitsAllFoes(who,action)||!foes.includes(action.target)) return [action.target];
  return [action.target].concat(foes.filter(w=>w!==action.target)).filter(w=>!isPhased(w));
}
// Extra projectiles, for show, toward every target after the first
function fanOut(who,tgts,proj,col){
  const x=seatX(who), y=bH*.38;
  tgts.slice(1).forEach(t=>spawnProj(x,y,seatX(t),y,proj,col,()=>{}));
}

// After the ritual: with more than one foe, the picker taps who the spell is aimed at
function chooseTarget(who,action){
  const foes=foesOf(who);
  const done=t=>{ action.target=t; commitPick(who,action); };
  if(action.self) done(who);
  else if(action.ok&&canShareProtection(who,action)&&alliesOf(who).length)
    showTargetPicker(who,[who].concat(alliesOf(who)),t=>{ action.ally=t; done(foes[0]); },'Protect who?');
  else if(!action.ok||!needsTarget(who,action)||foes.length<=1) done(foes[0]);
  else if(hitsAllFoes(who,action)) done(weakestFoe(who));   // no need to choose: it hits them all
  else showTargetPicker(who,foes,done);
}
function showTargetPicker(who,foes,cb,title='Choose a target'){
  let ov=document.getElementById('target-overlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='target-overlay';
    ov.innerHTML='<div class="tg-box"><div class="tg-title">Choose a target</div><div class="tg-list"></div></div>';
    document.body.appendChild(ov);
  }
  ov.querySelector('.tg-title').textContent=title;
  ov.querySelector('.tg-list').innerHTML=foes.map(w=>{
    const st=gs[w], cfg=seatCfg(w), el=st.shieldType&&elemById(st.shieldType);
    const ward=hasWard(st)?`<span class="tg-ward">🛡 ${el.icon} ${st.shieldHp}</span>`:'';
    const ban=(cfg.forbidden||[]).map(id=>elemById(id).icon).join('');
    return `<button class="tg-foe" data-who="${w}" style="--tg-col:${cfg.col}">`+
      `<img src="portraits/${seatKey(w)}.png" alt=""><span class="tg-name">${cfg.name}${w===who?' (you)':''}</span>`+
      `<span class="tg-hp">❤ ${st.hp} / ${st.maxHp}</span>${ward}`+
      (ban?`<span class="tg-ban">⛔ ${ban}</span>`:'')+`</button>`;
  }).join('');
  ov.querySelectorAll('.tg-foe').forEach(b=>b.onclick=()=>{ ov.classList.remove('show'); cb(b.dataset.who); });
  ov.classList.add('show');
}

function castSignature(id,tier){
  const who=gs.turnPlayer, sp=sigById(who,id);
  if(!sp||sigBlocked(who,sp,tier)||catLocked(who,sp.el.cat)) return;
  const el=sp.el, elemId=el.elem||'arcane', e=elemById(elemId);
  const spell={name:ELEM_TIER_NAMES[tier-1]+sigName(sp), icon:sigIcon(sp), element:elemId, col:e.col, tier,
    glyphs:el.kind==='strike'?ELEM_GLYPHS[elemId]:undefined};
  const commit=ok=>chooseTarget(who,{type:'el',cat:el.cat,elem:elemId,tier,sig:id,ok});
  gs.busy=true;
  if(el.cat==='dispel') launchDispelPattern(spell,commit);
  else if(el.kind==='strike') ELEM_MINIGAME[elemId](spell,commit);
  else launchBuffTileMatch(spell,ELEM_WARD_THEME[elemId],who,ok=>commit(ok));
}

// ── Resolution ──
function elemFloatDmg(who,n,icon,col){
  if(n<=0) return;
  dealDmgToPlayer(who,n,seatX(who),bH*.38);
  addFloat(seatX(who),bH*.36,icon+' −'+n,col,13);
}
function elemHeal(who,n,icon){
  const st=gs[who], before=st.hp;
  st.hp=Math.min(st.maxHp,st.hp+n);
  if(st.hp>before) addFloat(seatX(who),bH*.42,'+'+(st.hp-before)+' '+(icon||'💚'),'#44ee88',12);
}

// Every seat pays for its pick as the round begins, before anything resolves: the picks were
// simultaneous, so nobody's mana can be burned or drained before they pay. Sets action.outcome.
function payForAction(who,action){
  const st=gs[who];
  if(action.cat==='pass') return;
  if(action.cat==='meditate'){ st.meditatedRound=gs.round; return; }
  const sp=action.sig?sigById(who,action.sig):null;
  const cost=action.cat==='phase'?PHASE.cost:sp?sigCost(who,sp,action.tier):elemCost(who,action.cat,action.tier);
  const silence=effectsOf(st,'silence')[0];
  if(!action.ok){ st.mana=Math.max(0,st.mana-1); action.outcome='fizzle'; }
  else if(silence&&_rng()<silence.pct) action.outcome='silenced';
  else if(cost>st.mana) action.outcome='nomana';
  else { st.mana-=cost; action.outcome='cast'; action.paid=cost; }
}
function quickSteal(who,action){
  const a=sigAtTier(sigById(who,action.sig),action.tier).action, ts=gs[action.target], st=gs[who];
  if(!a||a.type!=='siphon'||isPhased(action.target)) return;
  const n=Math.min(ts.mana,a.amt);
  ts.mana-=n; st.mana=Math.min(MAX_MANA,st.mana+n);
  action.stolen=n;
}
function executeElemental(who,action,cb){
  const st=gs[who], x=seatX(who);
  if(action.cat==='pass'){ addFloat(x,bH*.33,'… Waits','#aaaacc',12); combatTimeout(cb,500); return; }
  if(action.cat==='meditate'){
    const n=Math.min(MEDITATE.gain,MAX_MANA-st.mana);
    st.mana+=n;
    anim(who,'cast',600);
    vfxFountain(x,bH*.38,['#7fb2ff','#b8d4ff','#ffffff'],14,{spread:.35,min:.6,var:1.4,w:.08,lift:-.3,sz:2.5,dec:.01});
    addFloat(x,bH*.33,'🧘 Meditates'+(n>0?' +'+n+' Mana':''),'#7fb2ff',13);
    combatTimeout(cb,700); return;
  }
  const sp=action.sig?sigById(who,action.sig):null;
  // A foe knocked out earlier in the round: the spell goes to another foe instead
  if(action.target&&action.target!==who&&gs[action.target].out){
    const t=weakestFoe(who);
    if(t) action.target=t;
  }
  if(action.target&&action.target!==who&&needsTarget(who,action)) st.lastTarget=action.target;
  if(action.cat==='phase'){
    addFloat(x,bH*.3,'🌀 Phase Shift','#b8a0e8',15); VFX.vanished(x);
    combatTimeout(cb,700); return;
  }
  // Aimed at a wizard who phased out: it misses and they gain what it cost. A Greater strike still hits
  // everyone else, and each phased foe gains their share of its cost.
  if(action.outcome==='cast'&&needsTarget(who,action)&&action.target!==who){
    if(hitsAllFoes(who,action)){
      const all=foesOf(who), ph=all.filter(isPhased);
      ph.forEach(p=>{ addFloat(seatX(p),bH*.3,'💨 Phased!','#b8a0e8',14); phaseGain(p,Math.round((action.paid||0)/all.length)); phaseCaught(p); });
      if(ph.length===all.length){ anim(who,'cast',600); combatTimeout(cb,700); return; }
    } else if(isPhased(action.target)){
      addFloat(seatX(action.target),bH*.3,'💨 Phased!','#b8a0e8',14); phaseGain(action.target,action.paid||0); phaseCaught(action.target);
      anim(who,'cast',600); combatTimeout(cb,700); return;
    }
  }

  const agony=effectsOf(st,'agony')[0];
  if(agony){ dmgSource=agony.from; elemFloatDmg(who,agony.dmg,'💀 Agony','#9944cc'); VFX.agony(x); }
  dmgSource=who;
  // Paid (or not) when the round began — see payForAction
  if(action.outcome==='fizzle'){ addFloat(x,bH*.33,'Fizzled!','#ff8844',13); combatTimeout(cb,700); return; }
  if(action.outcome==='silenced'){ showSilenceBlock(x,bH*.33); combatTimeout(cb,900); return; }
  if(action.outcome==='nomana'){ addFloat(x,bH*.33,'Out of mana!','#ff8844',13); combatTimeout(cb,700); return; }
  anim(who,'cast',600);
  st.lastCat=action.cat;   // what Spellbind targets
  if(sp){
    st.usedSig[sp.id]=true;
    const hpCost=sigAtTier(sp,action.tier).hpCost;
    if(hpCost) elemFloatDmg(who,hpCost,'🩸','#ff4444');
  }

  const isWard=sp?sp.el.kind==='ward':(action.cat==='protect');
  const candle=effectsOf(st,'candle')[0];
  if(isWard&&candle){ dmgSource=candle.from; elemFloatDmg(who,candle.dmg,'🕯️','#ff6622'); VFX.candle(x); dmgSource=who; }

  if(sp) executeSignature(who,sp,action,cb);
  else executeWheel(who,action,cb);
}

function executeWheel(who,action,cb){
  const st=gs[who], x=seatX(who), y=bH*.38;
  const cat=ELEM_CATS[action.cat], el=elemById(action.elem);
  const power=cat.power[action.tier-1];
  if(action.cat==='protect'){
    const ally=protectTarget(who,action);
    raiseWard(ally,action.elem,power,0);
    anim(ally,'shield',700);
    combatTimeout(cb,900);
    return;
  }
  if(action.self){
    elemCleanse(who);
    combatTimeout(cb,800);
    return;
  }
  const tgt=action.target, tx=seatX(tgt);
  if(action.cat==='damage') st.lastElem=action.elem;
  const tgts=action.cat==='damage'?strikeTargets(who,action):[tgt];
  fanOut(who,tgts,ELEM_PROJ[action.elem],el.col);
  spawnProj(x,y,tx,y,action.cat==='dispel'?'dispel':ELEM_PROJ[action.elem],el.col,()=>{
    if(action.cat==='dispel') elemDispelHit(tgt,action.elem,power,action.tier);
    else elemStrike(who,tgts,{elem:action.elem,tier:action.tier,power});
    combatTimeout(cb,600);
  });
}

function executeSignature(who,sp,action,cb){
  const st=gs[who], x=seatX(who), y=bH*.38, el=sigAtTier(sp,action.tier);
  const tgt=action.target, ts=gs[tgt], tx=seatX(tgt);
  const e=elemById(el.elem||'arcane');
  const fx=SPELL_VFX[sp.id]||{}, ctx=vfxCtx(who,tgt);
  const effect=(overrides)=>Object.assign({id:sp.id,name:sigName(sp),icon:sigIcon(sp)},el.effect,overrides);
  if(el.kind==='strike'){
    st.lastElem=el.elem;
    let power=el.power||0;
    if(el.variance) power=el.variance[0]+Math.round(_rng()*(el.variance[1]-el.variance[0]));
    const tgts=strikeTargets(who,action);
    const blades=countMinions(st,'blade');
    if(el.perBlade){
      power=el.perBlade*blades;
      removeEffects(who,effectsOf(st,'minion').filter(m=>m.minion==='blade'),'Launched');
    }
    fanOut(who,tgts,ELEM_PROJ[el.elem],e.col);
    const d=fx.delivery;
    // A volley's own per-projectile effects stand in for the default impact burst
    const vfx=fx.hit||(d&&d.volley?()=>{}:null);
    const land=()=>{
      elemStrike(who,tgts,Object.assign({},el,{power,name:sigName(sp),vfx}));
      combatTimeout(cb,600);
    };
    if(d==='lunge'){ lunge(who,0.12,land); return; }
    if(d&&d.volley){
      const n=Math.max(1,d.volley==='blades'?blades:d.volley);
      if(fx.pre) fx.pre(ctx);
      let i=0;
      const fire=()=>{
        const yOff=bH*[-0.04,0,0.04][i%3];
        spawnProj(x,y+yOff,tx,y+yOff,d.proj||ELEM_PROJ[el.elem],d.col||e.col,()=>{
          if(fx.each) fx.each(Object.assign({},ctx,{y:y+yOff}));
          if(++i<n) combatTimeout(fire,d.gap); else land();
        });
      };
      fire();
      return;
    }
    spawnProj(x,y,tx,y,ELEM_PROJ[el.elem],e.col,land);
    return;
  }
  const ally=protectTarget(who,action), as=gs[ally], actx=ally===who?ctx:vfxCtx(ally,ally);
  if(el.kind==='ward'){
    let power=el.power;
    if(el.perSkeleton) power+=el.perSkeleton*countMinions(st,'skeleton');
    raiseWard(ally,el.elem,power,el.retaliate||0);
    as.wardSig=sp.id;
    if(fx.self) fx.self(actx); else anim(ally,'shield',700);
    if(el.rewind){
      const back=Math.min(el.rewind,as.lastRoundLoss||0);
      if(back>0) elemHeal(ally,back,'⏪');
    }
    combatTimeout(cb,900);
    return;
  }
  if(el.kind==='buff'){
    const mine=el.effect.type==='minion';   // minions always serve their owner
    addEffect(mine?who:ally,effect({kind:'buff'}),who);
    // A buff that also raises a light ward (Blink) — never replaces a stronger ward already up
    if(el.ward&&!(hasWard(as)&&as.shieldHp>=el.ward)){ raiseWard(ally,el.elem,el.ward,0); as.wardSig=sp.id; }
    if(fx.self) fx.self(mine?ctx:actx); else { spawnParts(seatX(mine?who:ally),y,e.col,14); anim(mine?who:ally,'shield',700); }
    combatTimeout(cb,900);
    return;
  }
  if(el.kind==='curse'){
    spawnProj(x,y,tx,y,ELEM_PROJ[el.elem||'arcane'],e.col,()=>{
      if(el.chance!=null&&_rng()>el.chance){ addFloat(tx,bH*.3,sigIcon(sp)+' Resisted','#cccccc',12); VFX.resisted(tx); }
      else {
        const eff=effect({kind:'curse'});
        if(!eff.elem) eff.elem=el.elem;   // a curse's ticks meet wards as its element
        if(eff.type==='spellbind') eff.cat=ts.lastCat||'damage';
        if(addEffect(tgt,eff,who)){ if(fx.hit) fx.hit(ctx); else spawnParts(tx,y,e.col,16); }
      }
      if(el.drainNow){ const d=Math.min(ts.mana,el.drainNow); ts.mana-=d; if(d) addFloat(tx,bH*.42,'−'+d+' Mana','#88aaff',12); }
      // A curse is a weak dispel too: it wears at the foe's ward (never strips buffs)
      if(hasWard(ts)) elemWardDispel(tgt,el.elem,Math.round(ELEM_CATS.dispel.power[action.tier-1]*ELEM_CURSE_DISPEL));
      combatTimeout(cb,700);
    });
    return;
  }
  // Instants
  const a=el.action;
  if(a.type==='heal') elemHeal(ally,a.amt);
  else if(a.type==='bloodpact'){ st.mana=Math.min(MAX_MANA,st.mana+a.mana); addFloat(x,bH*.3,'+'+a.mana+' Mana','#88aaff',13); }
  else if(a.type==='cleanse'){ elemCleanse(who); if(a.heal) elemHeal(who,a.heal); }
  else if(a.type==='rewind'){ elemHeal(who,Math.min(a.max,st.lastRoundLoss||0),'⏪'); if(!st.lastRoundLoss) addFloat(x,bH*.3,'⏪ Nothing to undo','#cccccc',12); }
  else if(a.type==='siphon'){
    // A quick siphon already stole as the round began (quickSteal); this only shows it
    const n=action.stolen!=null?action.stolen:Math.min(ts.mana,a.amt);
    if(action.stolen==null){ ts.mana-=n; st.mana=Math.min(MAX_MANA,st.mana+n); }
    addFloat(tx,bH*.42,'🌀 −'+n+' Mana','#88aaff',12); addFloat(x,bH*.42,'+'+n+' Mana','#88aaff',12);
  }
  else if(a.type==='tonic'){
    ctx.healed=_rng()<0.5;
    if(ctx.healed) elemHeal(ally,a.heal,'⚗️');
    else addEffect(ally,{id:sp.id,type:'empower',kind:'buff',name:'Empowered',icon:'💪',mult:a.mult,rounds:null},who);
  }
  if(fx.self) fx.self(['heal','tonic'].includes(a.type)?actx:ctx); else { spawnParts(x,y,e.col,12); anim(who,'cast',700); }
  combatTimeout(cb,900);
}

function raiseWard(who,elem,power,retaliate){
  const st=gs[who], el=elemById(elem);
  st.shield=ELEM_WARD_ROUNDS;
  st.shieldHp=power; st.shieldType=elem; st.wardRetaliate=retaliate; st.wardSig=null;
  addFloat(seatX(who),bH*.28,'🛡 '+el.name+' Ward '+power,el.col,14);
  VFX.wardRaise(seatX(who),el.col);
}
function breakWard(st,x){
  st.shield=0; st.shieldHp=0; st.shieldType=null; st.wardRetaliate=0; st.wardSig=null;
  addFloat(x,bH*.24,'🛡 SHATTERED!','#88ffff',18);
  VFX.wardShatter(x);
}
function elemCleanse(who){
  const st=gs[who], curses=cursesOf(st);
  if(curses.length) removeEffects(who,curses,'✦ Cleansed');
  else addFloat(seatX(who),bH*.28,'✦ Nothing to cleanse','#ffaaff',13);
  VFX.cleanse(seatX(who));
  anim(who,'shield',700);
}

// A ward takes the hit first; strip enchantments only when there's no ward to protect them
function elemWardDispel(tgt,elem,power){
  const ts=gs[tgt], tx=seatX(tgt);
  const match=ts.shieldType===elem;
  const dmg=power*(match?2:1);
  ts.shieldHp-=dmg;
  addFloat(tx,bH*.3,'✦ −'+dmg+' ward'+(match?' (matched!)':''),'#ffaaff',14);
  spawnParts(tx,bH*.38,'#ffaaff',12);
  if(ts.shieldHp<=0) breakWard(ts,tx);
}
function elemDispelHit(tgt,elem,power,tier){
  const ts=gs[tgt], tx=seatX(tgt);
  VFX.dispelHit(tx);
  if(hasWard(ts)){ elemWardDispel(tgt,elem,power); return; }
  const buffs=buffsOf(ts);
  if(!buffs.length){ addFloat(tx,bH*.3,'✦ Nothing to dispel','#ffaaff',12); return; }
  removeEffects(tgt,tier>=ELEM_DISPEL_ALL_TIER?buffs:[buffs[buffs.length-1]],'✦ Dispelled');
}

// Damage that meets the target's ward first. Returns {hp, warded}.
function elemIncoming(tgt,dmg,elem,icon,col,quiet){
  const ts=gs[tgt], tx=seatX(tgt);
  let warded=false;
  if(hasWard(ts)&&dmg>0){
    // The ward loses only its take share of what it stops, so a resistant ward stops more
    const take=ELEM_WARD_TAKE[ts.shieldType===elem?'match':'off'];
    const blocked=Math.min(dmg,Math.floor(ts.shieldHp/take));
    ts.shieldHp-=Math.max(1,Math.ceil(blocked*take));
    dmg-=blocked; warded=true;
    addFloat(tx,bH*.24,'🛡 −'+blocked+(take<1?' resisted':take>1?' unravels':' blocked'),'#4af0ff',12);
    VFX.wardBlock(tx);
    if(ts.shieldHp<=0) breakWard(ts,tx);
  }
  if(dmg>0){
    dealDmgToPlayer(tgt,dmg,tx,bH*.38);
    addFloat(tx,bH*.33,icon+' −'+dmg,col,16);
    if(!quiet) spawnParts(tx,bH*.38,col,16);
  }
  return {hp:Math.max(0,dmg),warded};
}

// o: {elem,tier,power, lifesteal, dot, manaburn, recoil, arc, name, vfx (signature impact)}
// tgts: one seat, or several — a Greater strike in a 3–4 seat duel hits every foe (strikeTargets).
// Bewitch, the caster's boosts (Empower, Frenzy, Weave) and recoil apply once for the whole cast.
function elemStrike(who,tgts,o){
  const st=gs[who];
  tgts=[].concat(tgts);
  if(takeEffect(st,'bewitch')){
    addFloat(seatX(who),bH*.24,'🪞 Bewitched — it rebounds!','#cc88ff',13);
    VFX.bewitched(who);
    tgts=[who];
  }
  const b={mult:seatCfg(who).dmgMult||1, bonus:0, burn:o.manaburn||0, emp:false};
  const emp=takeEffect(st,'empower',e=>!e.elem||e.elem===o.elem);
  if(emp){ b.mult*=emp.mult; b.emp=true; addFloat(seatX(who),bH*.24,'💪 Empowered!','#ffcc44',11); }
  const frenzy=effectsOf(st,'frenzy')[0];
  if(frenzy){ b.mult*=frenzy.mult; elemFloatDmg(who,frenzy.selfDmg,'💢','#dd8822'); }
  const weave=effectsOf(st,'weave')[0];
  if(weave){
    b.bonus+=weave.bonus; b.burn+=weave.burn;
    if(--weave.charges<=0) st.effects=st.effects.filter(e=>e!==weave);
  }
  tgts.forEach(t=>strikeOne(who,t,o,b));
  if(o.recoil) elemFloatDmg(who,o.recoil,'💥','#ff6644');
}
function strikeOne(who,tgt,o,b){
  const ts=gs[tgt], tx=seatX(tgt), el=elemById(o.elem);
  let base=o.power;
  if(o.pctHp) base=Math.max(base,Math.round(ts.hp*o.pctHp));   // Nyxara: a share of this target's HP
  let dmg=(base*b.mult+b.bonus)*suddenDeathMult();
  const burn=(o.elem==='lightning'?ELEM_LIGHTNING_BURN[(o.tier||2)-1]:0)+b.burn;

  if(tgt!==who){
    // Dodge rolls first, so a dodged strike leaves Vanish / Foresight waiting for the next one
    const dodge=effectsOf(ts,'dodge')[0];
    if(dodge&&_rng()<dodge.pct){ addFloat(tx,bH*.28,'💫 Dodged!','#b8a0e8',15); VFX.dodged(tx); anim(who,'cast',600); return; }
    const absorb=takeEffect(ts,'absorbNext');
    if(absorb){
      addFloat(tx,bH*.28,absorb.id==='vanish'?'👻 Missed!':'🔮 Absorbed!','#ffcc44',15);
      if(absorb.id==='vanish') VFX.vanished(tx); else VFX.absorbed(tx,el.col);
      anim(who,'cast',600);
      return;
    }
  }
  effectsOf(ts,'vuln').forEach(e=>{ dmg*=1+e.pct; });
  const resist=effectsOf(ts,'resist').filter(e=>!(e.magicOnly&&o.elem==='physical'))
    .reduce((m,e)=>Math.max(m,e.pct),0);
  dmg=Math.round(dmg*(1-resist));

  const hit=elemIncoming(tgt,dmg,o.elem,el.icon,el.col,true);
  const ctx=vfxCtx(who,tgt);
  if(o.vfx) o.vfx(ctx);
  else { ELEM_IMPACT_VFX[o.elem](ctx,b.emp?38:22); vfxStrikeAnim(who,tgt); }
  if(hit.hp>0){
    if(o.lifesteal){ elemHeal(who,Math.round(hit.hp*o.lifesteal),'🩸'); VFX.lifesteal(seatX(who)); }
    if(o.dot) addEffect(tgt,Object.assign({id:'dot-'+(o.name||o.elem),type:'dot',kind:'curse',elem:o.elem,name:o.name||el.name,icon:el.icon},o.dot),who);
    if(o.elem==='ice'&&(o.tier||2)>=ELEM_CHILL_MIN_TIER)
      addEffect(tgt,{id:'chill',type:'lock',cat:'damage',kind:'curse',name:'Chilled',icon:'❄️',rounds:ELEM_LOCK_ROUNDS},who);
  }
  if(burn>0){
    const n=Math.min(ts.mana,burn);
    if(n>0){ ts.mana-=n; addFloat(tx,bH*.42,'⚡ −'+n+' Mana','#ffee44',12); }
  }
  if(o.arc&&_rng()<o.arc.chance){
    addFloat(tx,bH*.2,'⚡ Arcs!','#ffee44',13);
    elemIncoming(tgt,o.arc.dmg,o.elem,el.icon,el.col,true);
    VFX.arc(tx,seatCfg(who).col);
  }
  if(tgt!==who){
    // Retaliation from the target's ward and enchantments, each with its own look
    const sources=[];
    if(hit.warded&&ts.wardRetaliate) sources.push({id:ts.wardSig,n:ts.wardRetaliate});
    effectsOf(ts,'resist').concat(effectsOf(ts,'counter')).forEach(e=>{ if(e.retaliate) sources.push({id:e.id,n:e.retaliate}); });
    let back=0;
    sources.forEach(r=>{ back+=r.n; const f=VFX.retaliate[r.id]; if(f) f(tx,seatX(who)); });
    if(back>0){ const src=dmgSource; dmgSource=tgt; elemFloatDmg(who,back,'↩️','#ff8844'); dmgSource=src; }
  }
}

// Round-end effects on `who` (Elemental rules): DoTs, regen, the foe's minions, then durations tick down
function elemTickEffects(who){
  const st=gs[who], x=seatX(who);
  effectsOf(st,'dot').forEach(e=>{
    dmgSource=e.from;
    e.tick=(e.tick||0)+1;
    const dmg=Math.round((e.ramp?e.ramp[Math.min(e.tick,e.ramp.length)-1]:e.dmg)*suddenDeathMult());
    // Ticks hit a ward first, like any damage — unless the effect seeps past wards (Caustic Bomb's poison)
    if(e.bypassWard||!hasWard(st)){
      if(e.bypassWard&&hasWard(st)) addFloat(x,bH*.3,e.icon+' Seeps past the ward!','#99dd55',11);
      elemFloatDmg(who,dmg,e.icon,'#cc88ff');
    }
    else elemIncoming(who,dmg,e.elem||'arcane',e.icon,'#cc88ff',true);
    const tick=TICK_VFX[e.id]||TICK_VFX[e.elem];
    if(tick) tick(x,bH*.38);
    if(e.manaDrain){ const d=Math.min(st.mana,e.manaDrain); st.mana-=d; if(d) addFloat(x,bH*.46,'−'+d+' Mana','#88aaff',11); }
  });
  effectsOf(st,'regen').forEach(e=>{
    if(st.hp<=0) return;
    elemHeal(who,e.perRound,e.icon);
    (TICK_VFX[e.id]||TICK_VFX.regen)(x,bH*.38);
  });
  activeSeats().filter(o=>o!==who&&minionTarget(o)===who).forEach(owner=>{
    effectsOf(gs[owner],'minion').forEach(m=>{
      const el=elemById(m.elem||'physical');
      dmgSource=owner;
      elemIncoming(who,Math.round(m.dmg*suddenDeathMult()),m.elem||'physical',m.icon,el.col,true);
      if(MINION_VFX[m.minion]) MINION_VFX[m.minion](x,bH*.38);
    });
  });
  const expired=[];
  st.effects.forEach(e=>{ if(e.rounds!=null&&--e.rounds<=0) expired.push(e); });
  if(expired.length){ st.effects=st.effects.filter(e=>!expired.includes(e)); syncMinionVisuals(st); }
}
// ── OPTIONS (⚙ on the title screen; kept in this browser) ──
// longDuels: 'draw' ends a duel that reaches roundLimit as a draw; 'sudden' starts sudden death instead
// diff / ai: ritual difficulty (diffName) and opponent AI (aiDifficulty)
const GAME_OPTIONS={longDuels:'draw', roundLimit:50, diff:'normal', ai:'normal'};
try{ Object.assign(GAME_OPTIONS,JSON.parse(localStorage.getItem('wd-options')||'{}')); }catch(e){}
diffName=GAME_OPTIONS.diff; aiDifficulty=GAME_OPTIONS.ai;
function saveOptions(){ try{ localStorage.setItem('wd-options',JSON.stringify(GAME_OPTIONS)); }catch(e){} }

// Sudden death: from a set round, every round ramps up — more mana, and every hit and tick lands harder
// (wards don't grow) — so long duels come to an end
const SUDDEN_DEATH={round:{duel:30, multi:20}, manaPerRound:1, maxMana:5, dmgPerRound:0.15};
function suddenDeathLevel(){
  if(!gs||!gs.round||GAME_OPTIONS.longDuels!=='sudden') return 0;
  return Math.max(0,gs.round-SUDDEN_DEATH.round[PLAYERS.length>2?'multi':'duel']+1);
}
function suddenDeathMult(){ return 1+SUDDEN_DEATH.dmgPerRound*suddenDeathLevel(); }
function suddenDeathMana(){ return Math.min(SUDDEN_DEATH.maxMana,SUDDEN_DEATH.manaPerRound*suddenDeathLevel()); }
function elemIncome(who){
  const drain=effectsOf(gs[who],'incomeDrain').reduce((a,e)=>a+e.n,0);
  return Math.max(0,ELEM_INCOME-drain)+suddenDeathMana();
}

// ── Elemental AI: a weighted mixed strategy so it can't be read every round ──
// Would casting this signature spell do anything useful right now?
// Which foe to aim at: the weakest-looking (HP plus ward), with some noise so it can't be read
let GANG_AWARE_AI=true;   // the simulator switches it off to compare
function aiPickTarget(who){
  const foes=foesOf(who);
  if(foes.length<=1) return foes[0];
  const noise=aiDifficulty==='normal'?10:40;
  const score=Object.fromEntries(foes.map(w=>[w,gs[w].hp+(hasWard(gs[w])?gs[w].shieldHp:0)+_rng()*noise]));
  return foes.reduce((a,b)=>score[a]<=score[b]?a:b);
}
function aiSigSensible(who,sp,tgt=weakestFoe(who)){
  const st=gs[who], ts=gs[tgt], el=sp.el;
  const active=(s,id)=>(s.effects||[]).some(e=>e.id===id);
  if(el.kind==='buff') return el.effect.type==='minion'||!active(st,sp.id);
  if(el.kind==='curse') return !active(ts,sp.id)&&!(el.effect.type==='lock'&&catLocked(tgt,el.effect.cat));
  if(el.kind==='instant'){
    const a=el.action;
    if(a.type==='heal'||a.type==='tonic') return st.hp<st.maxHp*0.7;
    if(a.type==='bloodpact') return st.mana<6&&st.hp>40;
    if(a.type==='rewind') return (st.lastRoundLoss||0)>=10;
    if(a.type==='cleanse') return cursesOf(st).length>0;
    if(a.type==='siphon') return ts.mana>=3;
  }
  return true;
}
function elemAIChoose(who){
  // Several foes aimed at me last round: hit back at the weakest of them, and turtle
  const gangedBy=(gs.focus&&gs.focus[who]||[]).filter(f=>foesOf(who).includes(f));
  const ganged=GANG_AWARE_AI&&gangedBy.length>=2;
  // Phase Shift: bet on it when you expect two or more spells your way — read from how many aimed at you
  // lately, capped by how many foes can afford to — and more readily when hurt
  if(phaseReady(who)&&!hasFreeSpell(who)){
    const st=gs[who], h=(st.aimHistory||[]).slice(-3);
    const armed=foesOf(who).filter(f=>gs[f].mana>=elemCost(f,'dispel',1)).length;
    const expected=Math.min(armed,h.length?h.reduce((a,b)=>a+b,0)/h.length:0);
    const hurt=1.3-0.6*st.hp/st.maxHp;
    const p=PHASE.smartAI?Math.min(0.8,Math.max(0,(expected-1)*0.9*hurt)):0.15;
    if(_rng()<p) return {type:'el',cat:'phase',ok:true,target:who};
  }
  const me=gs[who], tgt=ganged?gangedBy.reduce((a,b)=>gs[a].hp<=gs[b].hp?a:b):aiPickTarget(who), opp=gs[tgt];
  const smart=aiDifficulty==='normal';
  const oppWard=hasWard(opp), oppBuffs=buffsOf(opp).length, myCurses=cursesOf(me).length;
  // Meditate when short of mana, more readily when the foe can't afford a strike or my ward, buffs
  // and curses are doing the work for me — and less when I'm close to dying
  if(canMeditate(who)&&me.mana<elemCost(who,'damage',2)){
    let p=me.mana<elemCost(who,'damage',1)?0.4:0.2;
    if(!foesOf(who).some(f=>gs[f].mana>=elemCost(f,'damage',1))) p+=0.3;
    if(hasWard(me)&&me.shieldHp>=15) p+=0.15;
    p+=Math.min(0.2,0.1*(buffsOf(me).length+cursesOf(opp).length));
    if(me.hp<me.maxHp*0.3) p*=0.5;
    if(!smart) p*=0.6;
    if(_rng()<p) return {type:'el',cat:'meditate',ok:true};
  }
  const w={damage:1.0, protect:0.55, dispel:0.08};
  if(oppWard){ w.dispel=smart?1.7:1.0; w.damage=0.5; }
  else if(oppBuffs) w.dispel+=smart?0.9:0.4;
  if(myCurses) w.dispel+=0.5;
  // Cash in a pending strike boost (Empower, Galvanize, Frenzy, Arcane Weave)
  const boost=me.effects.find(e=>e.type==='empower'||e.type==='frenzy'||e.type==='weave');
  if(boost) w.damage+=0.9;
  // Curse-casters open the Dispel wheel for their hexes, not only to break wards
  const hexes=sigSpells(who,'dispel').filter(sp=>sp.el.kind==='curse'&&!sigBlocked(who,sp,1)&&aiSigSensible(who,sp,tgt)).length;
  if(hexes) w.dispel+=(smart?0.35:0.2)*hexes;
  if(hasWard(me)&&me.shieldHp>=15) w.protect=0.2;
  else {
    if(foesOf(who).some(f=>gs[f].mana>=elemCost(f,'damage',2))) w.protect+=0.35;
    if(me.hp<me.maxHp*0.35) w.protect+=0.35;
  }
  // A pending miss (Vanish, Foresight) already covers the next strike: protecting again is mostly wasted
  if(smart&&effectsOf(me,'absorbNext').length) w.protect*=0.45;
  // Siphon a foe who has saved up: the steal can leave them short of the spell they saved for
  const siphon=sigSpells(who,'dispel').find(sp=>sp.el.action&&sp.el.action.type==='siphon'&&!sigBlocked(who,sp,1));
  const siphonNow=smart&&siphon&&opp.mana>=elemCost(tgt,'damage',3);
  if(siphonNow) w.dispel+=0.6;
  // Last round of my miss/dodge cover: spend it on a Siphon or a strike — the foe's strike would be wasted
  const cover=me.effects.filter(e=>e.type==='dodge'||e.type==='absorbNext');
  if(smart&&cover.length&&cover.every(e=>e.rounds===1)){
    w.protect*=0.3; w.damage+=0.5;
    if(siphon) w.dispel+=0.6;
  }
  if(ganged){ w.protect+=hasWard(me)&&me.shieldHp>=25?0.4:1.2; w.damage*=0.8; }
  const free=hasFreeSpell(who);
  if(free) w.damage+=1.2;   // a free spell: make it a big strike
  // Bewitched: my next strike would hit me, so don't strike — cleanse it, or play around it
  if(effectsOf(me,'bewitch').length){ w.damage*=smart?0.15:0.6; w.dispel+=smart?0.8:0.3; }
  const cats=Object.keys(w).filter(c=>elemCanPick(who,c)&&w[c]>0);
  if(!cats.length) return {type:'el',cat:'pass',ok:true};
  let r=_rng()*cats.reduce((sum,c)=>sum+w[c],0), cat=cats[0];
  for(const c of cats){ r-=w[c]; if(r<=0){ cat=c; break; } }
  const ok=_rng()<(smart?0.9:0.78);
  // Aiming at a wizard who can phase: if they usually do, hold off — hit someone else, or ward up instead
  let aimTgt=tgt;
  if(PHASE.smartAI&&phaseReady(tgt)&&(cat==='damage'||cat==='dispel')){
    const ts=gs[tgt], rate=((ts.phaseUses||0)+0.5)/((ts.phaseChances||0)+4);
    if(_rng()<rate*(smart?1.5:0.7)){
      const others=foesOf(who).filter(f=>f!==tgt&&!phaseReady(f));
      if(others.length) aimTgt=others.reduce((a,b)=>gs[a].hp<=gs[b].hp?a:b);
      else if(elemCanPick(who,'protect')) cat='protect';
    }
  }

  // Each sector of the wheel is a plain element or one of this character's signature spells
  const sectors=ELEMENTS.map(e=>({elem:e.id,sp:sigAt(who,cat,e.id)})).filter(x=>sectorOk(who,cat,x.elem,1));
  const plain=sectors.filter(x=>!x.sp);
  const sigs=sectors.filter(x=>x.sp&&aiSigSensible(who,x.sp,tgt));
  const cleanseOk=cat==='dispel'&&myCurses&&elemCost(who,'dispel',1)<=me.mana;
  if(cleanseOk&&((smart&&effectsOf(me,'bewitch').length)||(!oppWard&&!oppBuffs))&&_rng()<0.7)
    return {type:'el',cat,elem:'arcane',tier:1,self:true,target:who,ok};
  // Combos: a pending miss behind a dodge survives the strikes it dodges (Blink, then Vanish),
  // and a buff that raises a ward shields the buffs already up from Dispel (Vanish, then Blink)
  const sigWeight=sp=>{
    if(!smart) return 1;
    const e=sp.el.effect||{};
    let v=1;
    if(e.type==='absorbNext'&&effectsOf(me,'dodge').length) v+=2;
    if(sp.el.ward&&buffsOf(me).length&&!hasWard(me)) v+=2;
    if(sp===siphon&&(siphonNow||cover.length)) v+=2;
    return v;
  };
  const combo=sigs.some(x=>sigWeight(x.sp)>1);
  let choice=null;
  if(sigs.length&&(!plain.length||_rng()<(smart?(combo?0.8:0.45):0.3))){
    let r=_rng()*sigs.reduce((a,x)=>a+sigWeight(x.sp),0);
    choice=sigs.find(x=>(r-=sigWeight(x.sp))<=0)||sigs[0];
  }
  else if(plain.length){
    const pickFrom=list=>list[Math.floor(_rng()*list.length)];
    const has=id=>plain.find(x=>x.elem===id);
    choice=pickFrom(plain);
    if(cat==='dispel'&&oppWard&&has(opp.shieldType)&&_rng()<(smart?0.8:0.4)) choice=has(opp.shieldType);
    // Strike with whichever element the foe's ward takes more from
    const matchHurts=ELEM_WARD_TAKE.match>ELEM_WARD_TAKE.off;
    if(cat==='damage'&&oppWard&&smart){
      const best=matchHurts?plain.filter(x=>x.elem===opp.shieldType):plain.filter(x=>x.elem!==opp.shieldType);
      if(best.length) choice=pickFrom(best);
    }
    if(cat==='protect'){
      const roll=_rng();
      if(matchHurts||ELEM_WARD_TAKE.match===ELEM_WARD_TAKE.off){
        // A ward in an element the foe can't cast can't be unravelled or matched by their dispels
        const safe=plain.filter(x=>foesCantCast(who,x.elem));
        if(safe.length&&roll<(smart?0.7:0.25)) choice=pickFrom(safe);
        else if(opp.lastElem&&roll<(smart?0.8:0.4)){ const off=plain.filter(x=>x.elem!==opp.lastElem); if(off.length) choice=pickFrom(off); }
      }
      else if(opp.lastElem&&has(opp.lastElem)&&!elemForbidden(tgt,opp.lastElem)&&roll<(smart?0.8:0.4)) choice=has(opp.lastElem);
    }
  }
  else if(sectors.length) choice=sectors[Math.floor(_rng()*sectors.length)];   // anything beats waiting
  if(cat==='damage'&&boost&&boost.elem){ const s=sectors.find(x=>x.elem===boost.elem); if(s) choice=s; }
  if(!choice) return cleanseOk?{type:'el',cat,elem:'arcane',tier:1,self:true,target:who,ok}:{type:'el',cat:'pass',ok:true};

  let tier=3;
  while(tier>1&&!sectorOk(who,cat,choice.elem,tier)) tier--;
  // Sometimes hold mana back — but not when ganged up on: big wards, and Greater strikes that hit them all
  if(tier>1&&!free&&!(ganged&&cat!=='dispel')&&_rng()<0.4) tier--;
  const elem=choice.elem;
  const pick=choice.sp?{type:'el',cat,elem,tier,sig:choice.sp.id,target:aimTgt,ok}:{type:'el',cat,elem,tier,self:false,target:aimTgt,ok};
  // Team games: shield a team-mate who's worse off — lower on HP, unwarded, or the one the foes went for
  if(cat==='protect'&&canShareProtection(who,pick)){
    const need=w=>gs[w].hp/gs[w].maxHp-(hasWard(gs[w])?0.2:0)-((gs.focus&&gs.focus[w]||[]).length>=2?0.25:0);
    const mate=alliesOf(who).filter(a=>need(a)<need(who)-0.15).sort((a,b)=>need(a)-need(b))[0];
    if(mate&&_rng()<(smart?0.75:0.4)) pick.ally=mate;
  }
  return pick;
}

function elemStatusTags(){
  const tags=[];
  if(suddenDeathLevel()) tags.push(`<span class="status-tag sudden">⚡ SUDDEN DEATH · damage ×${suddenDeathMult().toFixed(2)} · +${suddenDeathMana()} mana</span>`);
  PLAYERS.forEach(w=>{
    const st=gs[w], name=seatCfg(w).name;
    if(hasFreeSpell(w)) tags.push(`<span class="status-tag ward">✨ ${name} FREE SPELL</span>`);
    if(hasWard(st)){
      const el=elemById(st.shieldType);
      tags.push(`<span class="status-tag ward">🛡 ${name} ${el.icon} ${el.name.toUpperCase()} WARD ${st.shieldHp} (${st.shield})</span>`);
    }
    (st.effects||[]).filter(e=>e.type!=='minion').forEach(e=>{
      tags.push(`<span class="status-tag ${e.kind==='curse'?'timedrain':'regen'}">${e.icon} ${name} ${e.name.toUpperCase()}${e.rounds!=null?' ('+e.rounds+')':''}</span>`);
    });
    const minions=effectsOf(st,'minion');
    if(minions.length) tags.push(`<span class="status-tag foresight">${minions.map(m=>m.icon).join('')} ${name} ×${minions.length}</span>`);
  });
  return tags;
}



// Returns committed action object for AI without executing — used by simultaneous resolution
function aiChooseSync(who){
  if(trainingMode&&!trainingAI) return {type:'el',cat:'pass',ok:true};
  return elemAIChoose(who);
}

// ── RETRY SCREEN ───────────────────────────────────────────
function showRetryScreen(){
  if(retryCountdownId){clearInterval(retryCountdownId); retryCountdownId=null;}
  const overlay=document.getElementById('retry-overlay');
  const cdEl=document.getElementById('retry-countdown');
  const btn=document.getElementById('retry-btn');
  let timeLeft=10;

  // Populate opponent taunt
  if(p2Cfg && p2Cfg.taunts && p2Cfg.taunts.length){
    const taunt=p2Cfg.taunts[Math.floor(_rng()*p2Cfg.taunts.length)];
    document.getElementById('retry-portrait').src='portraits/'+p2Key+'.png';
    document.getElementById('retry-portrait').alt=p2Cfg.name;
    document.getElementById('retry-taunt-text').textContent='“'+taunt+'”';
    document.getElementById('retry-taunt-attr').textContent='— '+p2Cfg.name+', '+p2Cfg.title;
    document.getElementById('retry-taunt-attr').style.color=p2Cfg.col||'#f0cc6a';
    document.getElementById('retry-taunt-bubble').style.borderColor=p2Cfg.col||'#f0cc6a';
  }

  overlay.style.animation='none';
  overlay.offsetHeight; // force reflow to restart CSS animation
  overlay.classList.add('active');
  cdEl.textContent=timeLeft;
  cdEl.classList.remove('urgent');

  retryCountdownId=setInterval(()=>{
    timeLeft--;
    cdEl.textContent=timeLeft;
    if(timeLeft<=3) cdEl.classList.add('urgent');
    if(timeLeft<=0){
      clearInterval(retryCountdownId);
      retryCountdownId=null;
      onRetryExpired(overlay);
    }
  },1000);

  btn.onclick=()=>{
    clearInterval(retryCountdownId);
    retryCountdownId=null;
    onRetryContinue(overlay);
  };
}

function onRetryContinue(overlay){
  overlay.classList.remove('active');
  anim('p1','cast',1200);
  const px=bW*0.22, py=bH*0.65;
  spawnParts(px,py,p1Cfg.col,28);
  spawnParts(px,py-bH*0.06,'#ffffff',14);
  addFloat(px,py,'✨ CONTINUE!','#f0cc6a',14);
  setTimeout(()=>{
    battleRunning=false;
    startNextBattle();
  },1400);
}

function onRetryExpired(overlay){
  if(aiTid){clearTimeout(aiTid); aiTid=null;}
  overlay.style.transition='background 0.8s ease-in';
  overlay.style.background='rgba(0,0,0,0.96)';
  setTimeout(()=>{
    battleRunning=false;
    gameEnded=false;
    overlay.classList.remove('active');
    overlay.style.transition='';
    overlay.style.background='';
    showScreen('title-screen');
  },900);
}

// The round limit is reached (long duels set to Draw): nobody wins
function timeUp(){
  gs.timeUp=true;
  if(simMode){ gameEnded=true; simOutcome='draw'; return; }
  if(PLAYERS.length>2) showMultiEnd(null);
  else endGame('draw');
}
// 3–4 seats: whoever lands a knock-out claims a bounty, so allies race each other for the kill
const ELEM_KO_BOUNTY={hp:20, mana:5};
// 3–4 seats: knock out every seat at 0 HP; the duel ends when one team (or nobody) is left
function eliminateSeats(){
  dmgSource=null;
  const down=activeSeats().filter(w=>gs[w].hp<=0);
  down.forEach((w,i)=>{
    const st=gs[w];
    st.out=true; st.effects=[]; st.shield=0; st.shieldHp=0; st.shieldType=null;
    syncMinionVisuals(st);
    gs[w+'anim']='death';
    (gs.outOrder||(gs.outOrder=[])).push({who:w,round:gs.round});
    addFloat(seatX(w),bH*(.2+.06*i),'☠ '+seatCfg(w).name+' is out!','#ff6677',15);
  });
  down.forEach(w=>{
    const by=(gs.roundDmg||{})[w]||{}, most=Math.max(0,...Object.values(by));
    const top=Object.keys(by).filter(src=>by[src]===most&&most>0&&gs[src]&&!gs[src].out);
    const k=top.length?top[Math.floor(_rng()*top.length)]:null, ks=k&&gs[k];
    if(!ks||ks.out||ks.hp<=0||!ELEM_KO_BOUNTY.hp&&!ELEM_KO_BOUNTY.mana) return;
    ks.hp=Math.min(ks.maxHp,ks.hp+ELEM_KO_BOUNTY.hp); ks.mana=Math.min(MAX_MANA,ks.mana+ELEM_KO_BOUNTY.mana);
    (gs.koBy||(gs.koBy={}))[w]=k;
    addFloat(seatX(k),bH*.26,'🏆 Bounty +'+ELEM_KO_BOUNTY.hp+' HP +'+ELEM_KO_BOUNTY.mana+' Mana','#f0cc6a',12);
  });
  const teams=[...new Set(activeSeats().map(seatTeam))];
  if(teams.length>1) return;
  if(simMode){ gameEnded=true; simOutcome=teams.length?teams[0]:'draw'; return; }
  if(multiMode) showMultiEnd(teams[0]||null);
  else endGame(teams.length?teams[0]===seatTeam('p1'):'draw');
}
// Results of a 3–4 wizard duel: the winner(s), then everyone else by when they were knocked out
function showMultiEnd(team){
  if(gameEnded) return;
  gameEnded=true;
  gs.myTurn=false; gs.busy=true;
  const winners=team?PLAYERS.filter(w=>seatTeam(w)===team):[];
  const names=ws=>ws.map(w=>seatCfg(w).name).join(' & ');
  const out=(gs.outOrder||[]).slice().reverse().filter(o=>!winners.includes(o.who));
  const places=[];
  if(winners.length) places.push(names(winners));
  else if(gs.timeUp) places.push(names(activeSeats()));   // everyone still standing shares first
  out.forEach((o,i)=>{ if(i&&o.round===out[i-1].round) places[places.length-1]+=' & '+seatCfg(o.who).name; else places.push(seatCfg(o.who).name); });
  setTimeout(()=>{
    battleRunning=false;
    document.getElementById('ovico').textContent=winners.length?'🏆':'⚡';
    const title=document.getElementById('ovtitle');
    title.textContent=!winners.length?(gs.timeUp?'⌛ Time\'s Up — A Draw!':'Everyone Fell — A Draw!'):
      team.length===1?'Team '+team+' Wins!':names(winners)+(winners.length>1?' Win!':' Wins!');
    title.style.color=winners.length?seatCfg(winners[0]).col:'#ff8844';
    document.getElementById('ovdesc').textContent=places.map((n,i)=>['1st','2nd','3rd','4th'][i]+' '+n).join('  ·  ');
    document.getElementById('btn-continue').textContent='Back to Title';
    document.getElementById('overlay').classList.add('active');
  },1800);
}
function endMultiMode(){
  multiMode=false; multiPicks=[];
  setupSeats(null);
  document.getElementById('battle-screen').classList.remove('multi');
  document.getElementById('hud').classList.remove('multi');
  document.getElementById('btn-continue').textContent='Continue';
}
function startMultiBattle(){
  const seats=multiPicks.map((key,i)=>({key,human:multiSetup.human[i],
    team:multiSetup.format==='2v2'?(i<2?'A':'B'):undefined}));
  setupSeats(seats);
  p1Key=seats[0].key; p1Cfg=CHAR_DEFS[p1Key]; p2Key=seats[1].key; p2Cfg=CHAR_DEFS[p2Key];
  tournamentQueue=[]; twoPlayerMode=false; trainingMode=false;
  document.getElementById('btn-training-menu').style.display='none';
  document.getElementById('battle-screen').classList.add('multi');
  document.getElementById('hud').classList.add('multi');
  loadSprites();
  newState();
  buildMultiHUD();
  updateActionBar(seatCfg('p1'));
  gs.myTurn=false; gs.busy=true;
  gameEnded=false; battleRunning=true; lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
  setTimeout(beginPickPhase,200);
}
// Setup screen: how many wizards, the format, and who is played by a person
function renderMultiSetup(){
  const ov=document.getElementById('multi-overlay');
  if(multiSetup.n<4) multiSetup.format='ffa';
  ov.querySelectorAll('[data-n]').forEach(b=>b.classList.toggle('on',+b.dataset.n===multiSetup.n));
  ov.querySelectorAll('[data-format]').forEach(b=>{
    b.classList.toggle('on',b.dataset.format===multiSetup.format);
    b.disabled=b.dataset.format==='2v2'&&multiSetup.n<4;
  });
  let html='';
  for(let i=0;i<multiSetup.n;i++){
    const team=multiSetup.format==='2v2'?(i<2?'Team A':'Team B'):'';
    html+=`<div class="mo-row"><span class="mo-lbl">Wizard ${i+1}</span><span class="mo-seat-team">${team}</span>`+
      `<button class="mo-opt${multiSetup.human[i]?' on':''}" data-seat="${i}" data-human="1">Player</button>`+
      `<button class="mo-opt${multiSetup.human[i]?'':' on'}" data-seat="${i}" data-human="0"${i===0?' disabled':''}>AI</button></div>`;
  }
  document.getElementById('mo-seats').innerHTML=html;
}
function labelMultiPick(){
  const i=multiPicks.length, lbl=document.getElementById('char-player-label');
  const team=multiSetup.format==='2v2'?' · Team '+(i<2?'A':'B'):'';
  lbl.textContent='Wizard '+(i+1)+(multiSetup.human[i]?'':' (AI)')+team+': Choose';
  lbl.style.display='';
}
function checkWin(){
  if(PLAYERS.length>2){ if(!deferWinCheck) eliminateSeats(); return; }
  const p1Dead=gs.p1.hp<=0, p2Dead=gs.p2.hp<=0;
  if(!p1Dead&&!p2Dead) return;
  // Deferred: remember every KO seen until settleWin (a later heal doesn't undo it)
  if(deferWinCheck){
    pendingWin={p1Dead:p1Dead||!!(pendingWin&&pendingWin.p1Dead), p2Dead:p2Dead||!!(pendingWin&&pendingWin.p2Dead)};
    return;
  }
  declareKO(p1Dead,p2Dead);
}

// End a deferred-win window (simultaneous tier or round ticks) and apply any KOs.
function settleWin(){
  deferWinCheck=false;
  if(PLAYERS.length>2){ eliminateSeats(); return; }
  const pw=pendingWin; pendingWin=null;
  if(pw) declareKO(pw.p1Dead||gs.p1.hp<=0, pw.p2Dead||gs.p2.hp<=0);
  else checkWin();
}

function declareKO(p1Dead,p2Dead){
  if(simMode){ gameEnded=true; simOutcome=p1Dead&&p2Dead?'draw':p1Dead?'p2':'p1'; return; }
  if(p1Dead&&p2Dead){
    endGame('draw'); return;
  }
  if(p1Dead){
    if(trainingMode){ resetTrainingRound('p1'); return; }
    endGame(false);
  } else {
    if(trainingMode){ resetTrainingRound('p2'); return; }
    endGame(true);
  }
}

function resetTrainingRound(knockedOut){
  if(gameEnded) return;
  gameEnded=true;
  gs.myTurn=false; gs.busy=true;
  if(aiTid){ clearTimeout(aiTid); aiTid=null; }
  gs[knockedOut+'anim']='death';

  setTimeout(()=>{
    if(!battleRunning) return;
    gs.p1=newSeat(p1Cfg,p1Key);
    gs.p2=newSeat(p2Cfg,p2Key);
    gs.p1anim='idle'; gs.p2anim='idle';
    gs.parts=[]; gs.floats=[]; gs.projs=[]; gs.beams=[];
    gs.pending={};
    const winner=knockedOut==='p1'?p2Cfg.name:p1Cfg.name;
    addFloat(bW*.5,bH*.35,'✨ '+winner+' wins — Reset!','#f0cc6a',14);
    gameEnded=false;
    gs.myTurn=true; gs.busy=false;
  },950);
}

function endGame(won){
  if(gameEnded) return;
  gameEnded=true;
  const isDraw=won==='draw';
  gs.myTurn=false; gs.busy=true;
  if(isDraw){ gs.p1anim='death'; gs.p2anim='death'; }
  else { gs[won?'p2anim':'p1anim']='death'; }

  setTimeout(()=>{
    if(twoPlayerMode){
      battleRunning=false;
      if(isDraw){ /* no win points on draw */ }
      else { if(won) p1MatchWins++; else p2MatchWins++; }
      const isMatchOver=isDraw||(p1MatchWins>=2||p2MatchWins>=2||matchRound>=3);
      const winnerCfg=isDraw?null:(won?p1Cfg:p2Cfg);
      const winnerNum=isDraw?0:(won?1:2);
      const continueBtn=document.getElementById('btn-continue');
      document.getElementById('ovico').textContent=isMatchOver?'🏆':'⚔️';
      if(isDraw){
        document.getElementById('ovtitle').textContent=gs.timeUp?'⌛ Time\'s Up — A Draw!':'⚡ Double Knock-Out!';
        document.getElementById('ovtitle').style.color='#ff8844';
      } else {
        document.getElementById('ovtitle').textContent=
          isMatchOver?'Player '+winnerNum+' Wins the Match!':'Player '+winnerNum+' Wins Round '+matchRound+'!';
        document.getElementById('ovtitle').style.color=winnerCfg.col;
      }
      const p1s='★'.repeat(Math.min(2,p1MatchWins))+'☆'.repeat(Math.max(0,2-p1MatchWins));
      const p2s='★'.repeat(Math.min(2,p2MatchWins))+'☆'.repeat(Math.max(0,2-p2MatchWins));
      document.getElementById('ovdesc').textContent=
        p1Cfg.name+' (P1): '+p1s+'  vs  '+p2Cfg.name+' (P2): '+p2s;
      continueBtn.textContent=isMatchOver?'Back to Title':'Fight Round '+(matchRound+1)+' →';
      document.getElementById('overlay').classList.add('active');
      return;
    }
    const inTournament=tournamentQueue.length>0;
    const isLastFight=tournamentIndex>=tournamentQueue.length-1;
    const continueBtn=document.getElementById('btn-continue');
    if((!won||isDraw)&&inTournament){   // a draw doesn't advance the Arcade: fight again
      showRetryScreen();
      return;
    }
    battleRunning=false;
    if(isDraw){
      document.getElementById('ovico').textContent=gs.timeUp?'⌛':'⚡';
      document.getElementById('ovtitle').textContent=gs.timeUp?'Time\'s Up — A Draw!':'Double Knock-Out!';
      document.getElementById('ovtitle').style.color='#ff8844';
      document.getElementById('ovdesc').textContent='Neither wizard could finish the other.';
      continueBtn.textContent='Back to Title';
    } else if(!won){
      document.getElementById('ovico').textContent='💀';
      document.getElementById('ovtitle').textContent='Defeated!';
      document.getElementById('ovtitle').style.color='#ff4a6e';
      document.getElementById('ovdesc').textContent='Your magic was not enough. Study and return!';
      continueBtn.textContent='Back to Title';
    } else if(inTournament&&isLastFight){
      document.getElementById('ovico').textContent='🏆';
      document.getElementById('ovtitle').textContent='Arcade Champion!';
      document.getElementById('ovtitle').style.color='#f0cc6a';
      document.getElementById('ovdesc').textContent='You defeated all challengers and claimed the Arcade trophy!';
      continueBtn.textContent='Back to Title';
    } else if(inTournament){
      const nextKey=tournamentQueue[tournamentIndex+1];
      const nextName=CHAR_DEFS[nextKey].name;
      document.getElementById('ovico').textContent='⚔️';
      document.getElementById('ovtitle').textContent='Victory!';
      document.getElementById('ovtitle').style.color='#f0cc6a';
      document.getElementById('ovdesc').textContent=p2Cfg.name+' falls! Up next: '+nextName;
      continueBtn.textContent='Fight '+nextName+' →';
    } else {
      document.getElementById('ovico').textContent='🏆';
      document.getElementById('ovtitle').textContent='Victory!';
      document.getElementById('ovtitle').style.color='#f0cc6a';
      document.getElementById('ovdesc').textContent=p2Cfg.name+' falls before your arcane might!';
      continueBtn.textContent='Continue';
    }
    document.getElementById('overlay').classList.add('active');
  },900);
}

// ── SHARED PUZZLE HELPERS ──────────────────────────────────
const mc=document.getElementById('mcanvas');
const mx=mc.getContext('2d');

function puzzleFinish(ok,cb){
  battleRunning=true;
  lastFrameTime=0;
  showScreen('battle-screen');
  if(cb){cb(ok);}
  requestAnimationFrame(battleLoop);
}

function setDpadVisible(v){
  document.getElementById('dpad').style.display=v?'':'none';
}

// ── PUZZLE: BUFF TILE MATCH ─────────────────────────────────
// Circular memory-match minigame for protective buff spells (Shield, Foresight).
// 8 tiles (4 glyph pairs) arranged in a ring. 3 strikes before failure.
// ── MINIGAME PACING (shared) ───────────────────────────────
// Every casting minigame: MG_WATCH_MS to study the glyphs, then MG_INPUT_S to enter them.
const MG_WATCH_MS=5000, MG_INPUT_S=5;
// Glyph count follows cast strength: spell.tier 1 (inner ring) … 3 (outer ring) → 2…4 glyphs.
// Casts without a tier use the middle ring.
function mgSeqLen(spell){ return Math.max(1,Math.min(3,spell.tier||2))+1; }
// Easy: the spell's canonical word (spell.glyphs overrides it), trimmed to length. Normal/hard: random from the spell's glyphs.
function mgSeq(spell,canon,spellIdx){
  const n=mgSeqLen(spell);
  return diffName==='easy'
    ?(spell.glyphs||canon).slice(0,n)
    :Array.from({length:n},()=>spellIdx[Math.floor(_rng()*spellIdx.length)]);
}
// Stagger n glyph spawns across the watch window, leaving `tail` ms to study the last one.
function mgSpawnInterval(n,delay,tail){ return n>1?(MG_WATCH_MS-delay-tail)/(n-1):0; }

function launchBuffTileMatch(spell,spellId,who,cb){
  let done=false;

  const SPELL_THEMES={
    //                                                                         back RGB (for closed tile face)
    shield:      {title:'Ward Rune Trial',     bg1:'#001a33',bg2:'#000810',accent:'#4af0ff',rgb:'74,240,255',  tile:'#001833',back:'0,28,56'},
    foresight:   {title:'Seer\'s Rune Trial',  bg1:'#201400',bg2:'#0a0600',accent:'#ffcc44',rgb:'255,204,68', tile:'#1a1000',back:'38,24,0'},
    flameshield: {title:'Pyre Seal Trial',     bg1:'#2a0a00',bg2:'#100200',accent:'#ff6622',rgb:'255,102,34', tile:'#1e0800',back:'42,12,0'},
    frostarmor:  {title:'Permafrost Trial',    bg1:'#001828',bg2:'#000a12',accent:'#88ddff',rgb:'136,221,255',tile:'#001020',back:'0,22,38'},
    stoneskin:   {title:'Stone Rite Trial',    bg1:'#1a1200',bg2:'#080600',accent:'#c09050',rgb:'192,144,80', tile:'#140e00',back:'26,18,0'},
    warpaint:    {title:'Blood Rite Trial',    bg1:'#200a00',bg2:'#0a0300',accent:'#dd8822',rgb:'221,136,34', tile:'#180800',back:'32,12,0'},
  };
  const th=SPELL_THEMES[spellId]||SPELL_THEMES.shield;

  document.getElementById('pztitle').textContent=th.title;
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // Full 12-glyph alphabet (sym + glow colour per CLAUDE.md)
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff'},{sym:'Δ',glowCol:'#ff9944'},
    {sym:'∇',glowCol:'#44aaff'},{sym:'Ψ',glowCol:'#aaff88'},
    {sym:'Ω',glowCol:'#ff4444'},{sym:'∞',glowCol:'#44ffcc'},
    {sym:'☽',glowCol:'#aaddff'},{sym:'✸',glowCol:'#ffff55'},
    {sym:'⊕',glowCol:'#ffee77'},{sym:'⊗',glowCol:'#ff44aa'},
    {sym:'θ',glowCol:'#88ff88'},{sym:'Φ',glowCol:'#dd88ff'},
  ];

  // One pair per glyph; cast strength sets how many of the spell's 4 glyphs are used (2–4 pairs)
  const glyphIdxs=BUFF_TILE_GLYPHS[spellId].slice(0,mgSeqLen(spell));
  const deck=[...glyphIdxs,...glyphIdxs].sort(()=>_rng()-.5);
  const TILE_N=deck.length;

  const TS=54, R=90;
  const cw=284, ch=334;
  const CX=cw/2, CY=ch*0.53;

  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Place tiles evenly in a ring, starting at the top
  const tiles=deck.map((gIdx,i)=>{
    const angle=i/TILE_N*Math.PI*2-Math.PI/2;
    return {gIdx,i,angle,
      x:CX+Math.cos(angle)*R, y:CY+Math.sin(angle)*R,
      flipped:false, matched:false, mismatch:false};
  });

  let revealed=[];
  let locked=false;
  let strikes=0;
  const MAX_STRIKES=diffName==='hard'?2:3;

  // Face-up study window, then MG_INPUT_S to match every pair
  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');
  let timeLeft=MG_INPUT_S;
  let previewActive=true;
  tiles.forEach(t=>t.flipped=true);
  setTimeout(()=>{
    if(done) return;
    previewActive=false;
    tiles.forEach(t=>{if(!t.matched)t.flipped=false;});
    timerEl.textContent=timeLeft;
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  },MG_WATCH_MS);

  const sparks=Array.from({length:20},()=>({
    x:_rng()*cw, y:_rng()*ch,
    speed:0.08+_rng()*.25, size:0.5+_rng()*1.3,
    phase:_rng()*Math.PI*2,
  }));

  function tileAt(px,py){
    const hs=TS/2;
    for(const t of tiles){
      if(t.matched) continue;
      if(Math.abs(px-t.x)<=hs&&Math.abs(py-t.y)<=hs) return t;
    }
    return null;
  }

  function onPointer(e){
    if(done||locked||previewActive) return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    const tile=tileAt(px,py);
    if(!tile||tile.flipped||tile.matched) return;
    tile.flipped=true;
    revealed.push(tile);
    if(revealed.length===2){
      locked=true;
      if(revealed[0].gIdx===revealed[1].gIdx){
        // Matched pair
        setTimeout(()=>{
          revealed.forEach(t=>t.matched=true);
          revealed=[]; locked=false;
          if(tiles.every(t=>t.matched)) finish(true);
        },250);
      } else {
        // Mismatch — mark for red flash, then flip back
        revealed.forEach(t=>t.mismatch=true);
        strikes++;
        setTimeout(()=>{
          revealed.forEach(t=>{t.flipped=false; t.mismatch=false;});
          revealed=[]; locked=false;
          if(strikes>=MAX_STRIKES) finish(false);
        },550);
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();const perf=strikes===0;puzzleFinish(ok,r=>cb(r,perf));}

  function draw(ts){
    if(done) return;
    const W=cw, H=ch;

    // Radial background
    const bg=mx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.72);
    bg.addColorStop(0,th.bg1);
    bg.addColorStop(1,th.bg2);
    mx.fillStyle=bg; mx.fillRect(0,0,W,H);

    const accentCol=th.accent;
    const accentRgb=th.rgb;

    // Ritual ring guides + spokes
    mx.save();
    mx.strokeStyle=`rgba(${accentRgb},0.18)`; mx.lineWidth=1.5;
    mx.beginPath(); mx.arc(CX,CY,R+TS*.6,0,Math.PI*2); mx.stroke();
    mx.beginPath(); mx.arc(CX,CY,R-TS*.6,0,Math.PI*2); mx.stroke();
    mx.lineWidth=0.8;
    for(let i=0;i<TILE_N;i++){
      const a=i/TILE_N*Math.PI*2;
      mx.beginPath();
      mx.moveTo(CX+Math.cos(a)*(R-TS*.52),CY+Math.sin(a)*(R-TS*.52));
      mx.lineTo(CX+Math.cos(a)*(R+TS*.52),CY+Math.sin(a)*(R+TS*.52));
      mx.stroke();
    }
    // Slow rotating inner glyph
    const rotA=ts/12000;
    mx.strokeStyle=`rgba(${accentRgb},0.12)`; mx.lineWidth=1.2;
    for(let k=0;k<4;k++){
      const a=k/4*Math.PI+rotA;
      mx.beginPath();
      mx.moveTo(CX+Math.cos(a)*(R-TS*.55),CY+Math.sin(a)*(R-TS*.55));
      mx.lineTo(CX+Math.cos(a+Math.PI)*(R-TS*.55),CY+Math.sin(a+Math.PI)*(R-TS*.55));
      mx.stroke();
    }
    mx.restore();

    // Ambient sparks
    mx.save();
    sparks.forEach(s=>{
      s.y-=s.speed; if(s.y<-4){s.y=H+4;s.x=_rng()*W;}
      mx.globalAlpha=0.07+0.18*Math.abs(Math.sin(ts/900+s.phase));
      mx.fillStyle=accentCol; mx.shadowColor=accentCol; mx.shadowBlur=4;
      mx.beginPath(); mx.arc(s.x,s.y,s.size,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    // Strike indicator dots
    const dotR=7, dotSpacing=22;
    const dotsLeft=W/2-(MAX_STRIKES-1)*dotSpacing/2;
    for(let i=0;i<MAX_STRIKES;i++){
      const sdx=dotsLeft+i*dotSpacing, sdy=18;
      mx.beginPath(); mx.arc(sdx,sdy,dotR,0,Math.PI*2);
      mx.fillStyle=i<strikes?'#ff3333':'rgba(255,255,255,0.08)';
      mx.fill();
      mx.strokeStyle=i<strikes?'#ff8888':accentCol;
      mx.lineWidth=1.5; mx.stroke();
    }

    // Pairs counter
    const matchedPairs=tiles.filter(t=>t.matched).length/2;
    mx.fillStyle=accentCol; mx.font='bold 11px Cinzel,serif';
    mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText('Pairs: '+matchedPairs+' / '+(TILE_N/2),W/2,34);

    if(previewActive){
      mx.fillStyle='rgba(255,255,255,0.55)';
      mx.font='10px Cinzel,serif';
      mx.fillText('Memorise the runes…',W/2,52);
    }

    // Tiles
    const hs=TS/2;
    tiles.forEach(t=>{
      const tx=t.x, ty=t.y;
      if(t.matched){
        // Ghost form — matched glyph lingers faintly
        const gl=ALPHABET[t.gIdx];
        mx.save();
        mx.globalAlpha=0.18+0.07*Math.sin(ts/700+t.i*.9);
        mx.fillStyle=gl.glowCol; mx.shadowColor=gl.glowCol; mx.shadowBlur=6;
        mx.font=`${TS*.52}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(gl.sym,tx,ty);
        mx.restore();
      } else if(t.flipped){
        // Front face — show the glyph
        const gl=ALPHABET[t.gIdx];
        const bc=t.mismatch?'#ff4444':gl.glowCol;
        mx.fillStyle=th.tile;
        mx.shadowColor=bc; mx.shadowBlur=16;
        mx.beginPath(); mx.roundRect(tx-hs,ty-hs,TS,TS,7); mx.fill();
        mx.strokeStyle=bc; mx.lineWidth=t.mismatch?2.5:2;
        mx.beginPath(); mx.roundRect(tx-hs,ty-hs,TS,TS,7); mx.stroke();
        mx.shadowBlur=0;
        mx.fillStyle=t.mismatch?'#ff9999':'#ffffff';
        mx.font=`${TS*.52}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(gl.sym,tx,ty);
      } else {
        // Back face — decorated with a small concentric pattern
        const pulse=0.35+0.12*Math.sin(ts/700+t.i*.6);
        mx.fillStyle=`rgba(${th.back},${pulse+0.22})`;
        mx.shadowColor=`rgba(${accentRgb},0.3)`; mx.shadowBlur=5;
        mx.beginPath(); mx.roundRect(tx-hs,ty-hs,TS,TS,7); mx.fill();
        mx.strokeStyle=`rgba(${accentRgb},0.6)`; mx.lineWidth=1.5;
        mx.beginPath(); mx.roundRect(tx-hs,ty-hs,TS,TS,7); mx.stroke();
        mx.shadowBlur=0;
        // Inner circle + spokes pattern on back
        mx.strokeStyle=`rgba(${accentRgb},0.22)`; mx.lineWidth=0.8;
        mx.beginPath(); mx.arc(tx,ty,TS*.22,0,Math.PI*2); mx.stroke();
        mx.beginPath(); mx.arc(tx,ty,TS*.1,0,Math.PI*2); mx.stroke();
        for(let k=0;k<4;k++){
          const a=k/4*Math.PI*2+ts/5000;
          mx.beginPath();
          mx.moveTo(tx+Math.cos(a)*TS*.1,ty+Math.sin(a)*TS*.1);
          mx.lineTo(tx+Math.cos(a)*TS*.22,ty+Math.sin(a)*TS*.22);
          mx.stroke();
        }
      }
    });

    mazeRAF=requestAnimationFrame(draw);
  }

  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(draw);
}

// ── PUZZLE: PATTERN ECHO (Fire) ────────────────────────────
function launchPatternEcho(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Ember Rune Rising';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff',col:'#cc3300',lit:'#ff6622'}, // 0
    {sym:'Δ',glowCol:'#ff9944',col:'#991100',lit:'#ff5533'}, // 1
    {sym:'∇',glowCol:'#44aaff',col:'#1a2a44',lit:'#4477aa'}, // 2
    {sym:'Ψ',glowCol:'#aaff88',col:'#1a3a1a',lit:'#44aa44'}, // 3
    {sym:'Ω',glowCol:'#ff4444',col:'#880000',lit:'#cc2200'}, // 4
    {sym:'∞',glowCol:'#44ffcc',col:'#003a3a',lit:'#009977'}, // 5
    {sym:'☽',glowCol:'#aaddff',col:'#1a2a3a',lit:'#4488cc'}, // 6
    {sym:'✸',glowCol:'#ffff55',col:'#333300',lit:'#998800'}, // 7
    {sym:'⊕',glowCol:'#ffee77',col:'#aa7700',lit:'#ffcc00'}, // 8
    {sym:'⊗',glowCol:'#ff44aa',col:'#330022',lit:'#882244'}, // 9
    {sym:'θ',glowCol:'#88ff88',col:'#003322',lit:'#006644'}, // 10
    {sym:'Φ',glowCol:'#dd88ff',col:'#220033',lit:'#660088'}, // 11
  ];

  // Inferno owns ϟ(0) Δ(1) Ω(4) ⊕(8) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[0,1,4,8];
  // Fire colours assigned per SPELL_IDX position (0-3)
  const FIRE_COLS=[
    {col:'#cc3300',lit:'#ff6622'},
    {col:'#991100',lit:'#ff5533'},
    {col:'#880000',lit:'#cc2200'},
    {col:'#aa7700',lit:'#ffcc00'},
  ];

  // Canvas: 3-col × 4-row keyboard grid
  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;  // 248 px
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Keyboard tile positions — bottom-aligned
  const tileAreaH=TS*4+GAP*3;        // 306 px
  const tileTop=ch-PAD-tileAreaH;    // 64 px
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Sequence (stored as alphabet indices)
  // Easy: prefix of the canonical Inferno word: ϟ Δ Ω ⊕
  const seq=mgSeq(spell,[0,1,4,8],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Noise flames — all 12 arcana glyphs rise in deep red
  const NOISE_COLS=['#bb1100','#991100','#cc2200','#aa1500','#881000'];
  const noise=Array.from({length:44},()=>({
    x:_rng()*cw, y:_rng()*ch,
    spd:0.6+_rng()*1.4,
    sz:9+_rng()*13,
    ai:Math.floor(_rng()*12),
    col:NOISE_COLS[Math.floor(_rng()*5)],
    ph:_rng()*Math.PI*2,
    alpha:0.1+_rng()*0.28,
  }));

  // White sequence symbols
  const xSlots=Array.from({length:SEQ_LEN},(_,i)=>{
    const frac=(i+0.5)/SEQ_LEN;
    return Math.max(28,Math.min(cw-28,cw*frac+(_rng()-0.5)*22));
  });
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,1500),RISE_SPD=0.9;
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;
  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:xSlots[i],y:ch+30,spawned:false,idx:i,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false); // wrong glyph in hard = fail
          return;                              // easy/normal: silently ignore
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;

    // Background
    const bg=mx.createRadialGradient(cw/2,ch*.55,0,cw/2,ch*.55,cw*.9);
    bg.addColorStop(0,'#2a0800');
    bg.addColorStop(0.6,'#140300');
    bg.addColorStop(1,'#050000');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      // Rising noise — all 12 arcana glyphs in red
      mx.save();
      noise.forEach(f=>{
        f.y-=f.spd;
        if(f.y<-24){f.y=ch+10;f.x=_rng()*cw;f.ai=Math.floor(_rng()*12);}
        const pulse=0.55+0.45*Math.abs(Math.sin(t/650+f.ph));
        mx.globalAlpha=f.alpha*pulse;
        mx.fillStyle=f.col; mx.shadowColor=f.col; mx.shadowBlur=7;
        mx.font=`bold ${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1; mx.shadowBlur=0;
      mx.restore();

      // White sequence symbols — coloured glow, oscillating, numbered
      symStates.forEach(s=>{
        if(!s.spawned&&elapsed>=SPAWN_DELAY+s.idx*SPAWN_INTERVAL){
          s.spawned=true; s.y=ch+30;
        }
        if(!s.spawned) return;
        s.y-=RISE_SPD;
        let alpha=1;
        if(ch-s.y<50) alpha=(ch-s.y)/50;
        if(s.y<55) alpha=Math.max(0,s.y/55);
        if(alpha<=0.01) return;
        const osc=Math.sin(t/900+s.idx*1.3)*0.12;
        mx.save();
        mx.globalAlpha=alpha;
        mx.translate(s.x,s.y); mx.rotate(osc);
        mx.shadowColor=s.glowCol; mx.shadowBlur=32;
        mx.fillStyle='#ffffff';
        mx.font='bold 40px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,0,0);
        mx.restore();
        mx.save();
        mx.globalAlpha=alpha;
        mx.shadowColor='#ffcc00'; mx.shadowBlur=10;
        mx.fillStyle='#ffcc00';
        mx.font='bold 11px Cinzel,serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.idx+1,s.x+22,s.y-22);
        mx.restore();
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      mx.fillStyle='#ffcc00';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the white runes rise!',cw/2,4);
    }

    if(phase==='input'){
      // Faint ambient flames
      mx.save();
      noise.slice(0,14).forEach(f=>{
        f.y-=f.spd*0.35;
        if(f.y<-24){f.y=ch+10;f.x=_rng()*cw;}
        mx.globalAlpha=f.alpha*0.22;
        mx.fillStyle=f.col;
        mx.font=`${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1;
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai); // -1 if not spell glyph
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          // All glyphs show as neutral arcane — player must rely on memory
          bgCol='#2d1a3d'; bgDark='#100820';
          strokeCol='#44285888'; textCol='#7755aa';
          blur=4; textAlpha=1;
        } else if(isSpell){
          // Spell glyphs: fire colours by SPELL_IDX position
          bgCol=FIRE_COLS[si].col; bgDark='#1a0400';
          strokeCol=FIRE_COLS[si].col+'88'; textCol=FIRE_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          // Non-spell glyphs: ghosted out
          bgCol='#0f0f0f'; bgDark='#050505';
          strokeCol='#1e1e1e'; textCol='#2a2a2a';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      // Status label
      mx.fillStyle='#ff8844';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Progress dots — sit between status text and keyboard
      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#ffcc00';mx.shadowColor='#ffcc00';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(255,204,0,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: LIGHTNING PATTERN ─────────────────────────────
function launchLightningPattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Thunderstrike Glyph';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff',col:'#05091a',lit:'#33aadd'}, // 0
    {sym:'Δ',glowCol:'#ff9944',col:'#0a0a1a',lit:'#334488'}, // 1
    {sym:'∇',glowCol:'#44aaff',col:'#040818',lit:'#4488dd'}, // 2 — lightning
    {sym:'Ψ',glowCol:'#aaff88',col:'#05092a',lit:'#55aaff'}, // 3 — lightning
    {sym:'Ω',glowCol:'#ff4444',col:'#0a0512',lit:'#332255'}, // 4
    {sym:'∞',glowCol:'#44ffcc',col:'#04121a',lit:'#1a5566'}, // 5
    {sym:'☽',glowCol:'#aaddff',col:'#06090f',lit:'#224455'}, // 6
    {sym:'✸',glowCol:'#ffff55',col:'#141200',lit:'#ffdd44'}, // 7 — lightning
    {sym:'⊕',glowCol:'#ffee77',col:'#0f0a00',lit:'#443300'}, // 8
    {sym:'⊗',glowCol:'#ff44aa',col:'#160010',lit:'#ff55bb'}, // 9 — lightning
    {sym:'θ',glowCol:'#88ff88',col:'#051210',lit:'#1a5544'}, // 10
    {sym:'Φ',glowCol:'#dd88ff',col:'#100515',lit:'#442255'}, // 11
  ];

  // Lightning owns Ψ(3) ∇(2) ⊗(9) ✸(7) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[3,2,9,7];
  // Lightning colours assigned per SPELL_IDX position (0-3)
  const LIGHTNING_COLS=[
    {col:'#05092a',lit:'#55aaff'}, // Ψ — electric blue
    {col:'#040818',lit:'#4488dd'}, // ∇ — storm blue
    {col:'#160010',lit:'#ff55bb'}, // ⊗ — impact pink
    {col:'#141200',lit:'#ffdd44'}, // ✸ — burst yellow
  ];

  // Canvas: 3-col × 4-row keyboard grid
  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;  // 248 px
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Keyboard tile positions — bottom-aligned
  const tileAreaH=TS*4+GAP*3;
  const tileTop=ch-PAD-tileAreaH;
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Easy: prefix of the canonical Lightning word: Ψ ∇ ⊗ ✸
  const seq=mgSeq(spell,[3,2,9,7],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Pre-generate jagged bolt path from top to glyph position
  function genBolt(x1,y1,x2,y2){
    const pts=[{x:x1,y:y1}];
    const segs=7+Math.floor(_rng()*4);
    for(let i=1;i<segs;i++){
      const t=i/segs;
      pts.push({
        x:x1+(x2-x1)*t+(_rng()-0.5)*28,
        y:y1+(y2-y1)*t,
      });
    }
    pts.push({x:x2,y:y2});
    return pts;
  }

  const xSlots=Array.from({length:SEQ_LEN},(_,i)=>{
    const frac=(i+0.5)/SEQ_LEN;
    return Math.max(28,Math.min(cw-28,cw*frac+(_rng()-0.5)*22));
  });
  const Y_BANDS=[0.38,0.55,0.42,0.60,0.48,0.52,0.45];
  const ySlots=Array.from({length:SEQ_LEN},(_,i)=>
    Math.max(50,Math.min(ch-60,ch*Y_BANDS[i%Y_BANDS.length]+(_rng()-0.5)*28))
  );

  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,1500);
  const BOLT_DUR=300;     // bolt flash visible
  const GLYPH_HOLD=200;   // glyph at full brightness after strike
  const GLYPH_FADE=1800;  // afterglow fade duration
  const GLYPH_DUR=GLYPH_HOLD+GLYPH_FADE;
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  const symStates=seq.map((ai,i)=>{
    const gx=xSlots[i],gy=ySlots[i];
    const topX=gx+(_rng()-0.5)*30;
    return {
      ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
      x:gx,y:gy,
      boltPath:genBolt(topX,0,gx,gy),
      spawnAt:startTime+SPAWN_DELAY+i*SPAWN_INTERVAL,
      idx:i,
    };
  });

  // Noise: distant storm flashes — random glyphs briefly illuminated then gone
  const STORM_COLS=['#aaccff','#88bbff','#ccddff','#7799dd','#99bbff'];
  const noise=Array.from({length:32},()=>({
    x:_rng()*cw, y:_rng()*ch,
    sz:8+_rng()*12,
    ai:Math.floor(_rng()*12),
    col:STORM_COLS[Math.floor(_rng()*5)],
    flashAt:Date.now()+_rng()*4000+300,
    flashDur:80+_rng()*160,
    interval:1500+_rng()*4000,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;

    // Background — stormy dark navy
    const bg=mx.createRadialGradient(cw/2,ch*.5,0,cw/2,ch*.5,cw*.9);
    bg.addColorStop(0,'#060810');
    bg.addColorStop(0.6,'#030509');
    bg.addColorStop(1,'#010204');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      // Distant storm noise — each glyph flashes briefly at irregular intervals
      mx.save();
      noise.forEach(f=>{
        const age=t-f.flashAt;
        if(age>=0&&age<f.flashDur){
          const a=(1-age/f.flashDur)*0.65;
          mx.globalAlpha=a;
          mx.fillStyle=f.col; mx.shadowColor=f.col; mx.shadowBlur=9;
          mx.font=`bold ${f.sz}px serif`;
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
        } else if(age>=f.flashDur){
          // Reschedule next flash at a new random position
          f.flashAt=t+f.interval+_rng()*1000;
          f.ai=Math.floor(_rng()*12);
          f.x=_rng()*cw; f.y=_rng()*ch;
        }
      });
      mx.globalAlpha=1; mx.shadowBlur=0;
      mx.restore();

      // Sequence glyphs — bolt strikes then glyph afterglow
      symStates.forEach(s=>{
        const age=t-s.spawnAt;
        if(age<0) return;

        // Lightning bolt — visible for BOLT_DUR with a flicker pattern
        if(age<BOLT_DUR){
          let boltAlpha;
          if(age<70)       boltAlpha=1;           // instant on
          else if(age<120) boltAlpha=0.25;         // brief dim
          else if(age<170) boltAlpha=0.9;          // second flash
          else             boltAlpha=1-(age-170)/(BOLT_DUR-170); // fade out
          mx.save();
          mx.globalAlpha=boltAlpha;
          // Outer glow
          mx.strokeStyle='#cceeff'; mx.lineWidth=2.5;
          mx.shadowColor=s.glowCol; mx.shadowBlur=20;
          mx.beginPath();
          s.boltPath.forEach((p,i)=>i===0?mx.moveTo(p.x,p.y):mx.lineTo(p.x,p.y));
          mx.stroke();
          // Bright core
          mx.shadowBlur=0;
          mx.strokeStyle='#ffffff'; mx.lineWidth=1;
          mx.stroke();
          mx.restore();
        }

        // Glyph — snaps to full brightness on strike, then fades as afterglow
        let glyphAlpha;
        if(age<GLYPH_HOLD){
          glyphAlpha=1;
        } else if(age<GLYPH_DUR){
          glyphAlpha=1-(age-GLYPH_HOLD)/GLYPH_FADE;
        } else {
          // Persistent faint echo
          glyphAlpha=0.08+0.05*Math.abs(Math.sin((age-GLYPH_DUR)/3000+s.idx));
        }
        if(glyphAlpha<=0.01) return;

        mx.save();
        mx.globalAlpha=glyphAlpha;
        mx.shadowColor=s.glowCol; mx.shadowBlur=glyphAlpha>0.5?42:18;
        mx.fillStyle='#ffffff';
        mx.font='bold 40px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,s.x,s.y);
        mx.restore();

        // Order badge — visible while glyph is bright
        if(glyphAlpha>0.35&&age<GLYPH_HOLD+600){
          mx.save();
          mx.globalAlpha=Math.min(glyphAlpha,0.9);
          mx.shadowColor='#88ccff'; mx.shadowBlur=8;
          mx.fillStyle='#88ccff';
          mx.font='bold 11px Cinzel,serif';
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.idx+1,s.x+22,s.y-22);
          mx.restore();
        }
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      mx.fillStyle='#88ccff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the lightning runes strike!',cw/2,4);
    }

    if(phase==='input'){
      // Faint distant flickers during input phase
      mx.save();
      noise.slice(0,10).forEach(f=>{
        const age=t-f.flashAt;
        if(age>=0&&age<f.flashDur){
          mx.globalAlpha=(1-age/f.flashDur)*0.07;
          mx.fillStyle=f.col;
          mx.font=`${f.sz}px serif`;
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
        } else if(age>=f.flashDur){
          f.flashAt=t+f.interval+_rng()*1000;
          f.ai=Math.floor(_rng()*12);
        }
      });
      mx.globalAlpha=1;
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai);
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          bgCol='#0d1020'; bgDark='#05080f';
          strokeCol='#1a2a4088'; textCol='#3355aa';
          blur=4; textAlpha=1;
        } else if(isSpell){
          bgCol=LIGHTNING_COLS[si].col; bgDark='#010208';
          strokeCol=LIGHTNING_COLS[si].col+'88'; textCol=LIGHTNING_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          bgCol='#080a0e'; bgDark='#030408';
          strokeCol='#111522'; textCol='#1a2030';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      // Status label
      mx.fillStyle='#88ccff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Progress dots
      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#88ccff';mx.shadowColor='#88ccff';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(136,204,255,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: MANA BURN PATTERN (Arcane Surge Glyph) ───────────────────────
function launchManaBurnPattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Arcane Surge Glyph';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff',col:'#0d0830',lit:'#5566cc'}, // 0
    {sym:'Δ',glowCol:'#ff9944',col:'#0a0828',lit:'#4455bb'}, // 1
    {sym:'∇',glowCol:'#44aaff',col:'#060830',lit:'#5577dd'}, // 2 — mana burn
    {sym:'Ψ',glowCol:'#aaff88',col:'#0a0535',lit:'#8855dd'}, // 3 — mana burn
    {sym:'Ω',glowCol:'#ff4444',col:'#0a0425',lit:'#442288'}, // 4
    {sym:'∞',glowCol:'#44ffcc',col:'#040e28',lit:'#334499'}, // 5
    {sym:'☽',glowCol:'#aaddff',col:'#06082a',lit:'#334477'}, // 6
    {sym:'✸',glowCol:'#ffff55',col:'#0e0a28',lit:'#9966ff'}, // 7 — mana burn
    {sym:'⊕',glowCol:'#ffee77',col:'#0c0828',lit:'#553399'}, // 8
    {sym:'⊗',glowCol:'#ff44aa',col:'#130530',lit:'#cc44cc'}, // 9 — mana burn
    {sym:'θ',glowCol:'#88ff88',col:'#060e28',lit:'#445599'}, // 10
    {sym:'Φ',glowCol:'#dd88ff',col:'#0e0530',lit:'#8844cc'}, // 11
  ];

  // Mana Burn uses Ψ(3) ∇(2) ⊗(9) ✸(7)
  const SPELL_IDX=spell.glyphs||[3,2,9,7];
  const MANABURN_COLS=[
    {col:'#180028',lit:'#cc44ff'}, // Ψ
    {col:'#0a0020',lit:'#8844ff'}, // ∇
    {col:'#1a0028',lit:'#ff44cc'}, // ⊗
    {col:'#100022',lit:'#aa55ff'}, // ✸
  ];

  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const tileAreaH=TS*4+GAP*3;
  const tileTop=ch-PAD-tileAreaH;
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Easy: prefix of the canonical Mana Burn word: Ψ ∇ ⊗ ✸
  const seq=mgSeq(spell,[3,2,9,7],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Watch phase timing
  const STATIC_HOLD=2500;        // glyphs static before burning starts
  const NOISE_RISE_DELAY=0;      // noise starts rising immediately when burn begins
  const SPELL_RISE_DELAY=600;    // spell glyphs ignite shortly after noise
  const NOISE_RISE_SPD=2.6;      // noise rises quickly
  const SPELL_RISE_SPD=3.4;      // spell glyphs burn off before the watch window ends
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  // Noise glyphs — all 12 arcana scattered across bottom half, faint blue
  const NOISE_BLUE=['#1133bb','#2244cc','#0d2eaa','#1a44dd','#2233bb'];
  const noise=Array.from({length:44},()=>{
    const y=ch*0.5+_rng()*ch*0.5;
    return {
      x:_rng()*cw,
      y,
      startY:y,
      sz:9+_rng()*14,
      ai:Math.floor(_rng()*12),
      col:NOISE_BLUE[Math.floor(_rng()*5)],
      ph:_rng()*Math.PI*2,
      alpha:0.12+_rng()*0.22,
      spd:NOISE_RISE_SPD*(0.7+_rng()*0.65),
    };
  });

  // Spell glyphs — spread horizontally at the very bottom, all visible from start
  const xSlots=Array.from({length:SEQ_LEN},(_,i)=>{
    const frac=(i+0.5)/SEQ_LEN;
    return Math.max(30,Math.min(cw-30,cw*frac+(_rng()-0.5)*12));
  });
  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:xSlots[i],
    y:ch-22,
    idx:i,
    spd:SPELL_RISE_SPD*(0.85+_rng()*0.3),
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;

    // Background — deep arcane indigo
    const bg=mx.createRadialGradient(cw/2,ch*.6,0,cw/2,ch*.6,cw*.9);
    bg.addColorStop(0,'#0d0020');
    bg.addColorStop(0.6,'#070012');
    bg.addColorStop(1,'#030008');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      const noiseBurning=elapsed>=(STATIC_HOLD+NOISE_RISE_DELAY);
      const spellBurning=elapsed>=(STATIC_HOLD+SPELL_RISE_DELAY);
      // How far into the burn phase (0→1 over 1200ms) for glow ramp
      const burnT=noiseBurning?Math.min(1,(elapsed-STATIC_HOLD)/1200):0;

      // Noise glyphs — bottom half, faint blue; burn phase: rise bright
      mx.save();
      noise.forEach(f=>{
        if(noiseBurning){
          f.y-=f.spd;
          if(f.y<-24){f.y=ch+10;f.x=_rng()*cw;f.ai=Math.floor(_rng()*12);}
        }
        const pulse=0.55+0.45*Math.abs(Math.sin(t/680+f.ph));
        const brightAlpha=f.alpha+burnT*f.alpha*2.2;
        mx.globalAlpha=Math.min(0.88,brightAlpha*pulse);
        mx.fillStyle=f.col; mx.shadowColor=f.col;
        mx.shadowBlur=noiseBurning?10+burnT*14:3;
        mx.font=`bold ${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1; mx.shadowBlur=0;
      mx.restore();

      // Spell glyphs — white at bottom; burn phase: rise bright white
      symStates.forEach(s=>{
        if(spellBurning) s.y-=s.spd;
        if(s.y<-30) return;

        const riseProgress=spellBurning
          ?Math.min(1,(ch-22-s.y)/(ch*0.75)):0;
        const pulse=Math.sin(t/820+s.idx*1.4)*0.1;

        let alpha=0.8+pulse;
        if(s.y<55) alpha=Math.max(0,s.y/55);
        if(alpha<=0.01) return;

        const glowSize=spellBurning?20+riseProgress*36:14;
        const glowCol=spellBurning?'#ffffff':s.glowCol;

        mx.save();
        mx.globalAlpha=alpha;
        mx.shadowColor=glowCol; mx.shadowBlur=glowSize;
        mx.fillStyle='#ffffff';
        mx.font='bold 40px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,s.x,s.y);
        // Second pass for extra core brightness when burning
        if(spellBurning&&riseProgress>0.1){
          mx.shadowBlur=glowSize*0.6;
          mx.fillText(s.sym,s.x,s.y);
        }
        mx.restore();

        // Order badge
        if(alpha>0.25){
          mx.save();
          mx.globalAlpha=alpha*0.9;
          mx.shadowColor='#cc88ff'; mx.shadowBlur=8;
          mx.fillStyle='#cc88ff';
          mx.font='bold 11px Cinzel,serif';
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.idx+1,s.x+20,s.y-20);
          mx.restore();
        }
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      // Status hint
      const hint=spellBurning?'The mana burns!':
                 noiseBurning?'Memorise the white runes...':
                              'Read the mana runes...';
      mx.fillStyle=spellBurning?'#ff88ff':'#aa88ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(hint,cw/2,4);
    }

    if(phase==='input'){
      // Faint lingering drift
      mx.save();
      noise.slice(0,14).forEach(f=>{
        f.y-=f.spd*0.18;
        if(f.y<-24){f.y=ch+10;f.x=_rng()*cw;}
        mx.globalAlpha=f.alpha*0.14;
        mx.fillStyle=f.col;
        mx.font=`${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1;
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai);
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          bgCol='#180a22'; bgDark='#0a0412';
          strokeCol='#33194488'; textCol='#8855cc';
          blur=4; textAlpha=1;
        } else if(isSpell){
          bgCol=MANABURN_COLS[si].col; bgDark='#050010';
          strokeCol=MANABURN_COLS[si].col+'88'; textCol=MANABURN_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          bgCol='#080810'; bgDark='#030305';
          strokeCol='#111120'; textCol='#1a1a28';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      mx.fillStyle='#cc88ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#cc88ff';mx.shadowColor='#cc88ff';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(204,136,255,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ICE PATTERN (Frost Crystal Glyph) ────────────────────────────
function launchIcePattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Frost Crystal Glyph';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff',col:'#0a1825',lit:'#336688'}, // 0
    {sym:'Δ',glowCol:'#ff9944',col:'#0a1422',lit:'#2a5577'}, // 1
    {sym:'∇',glowCol:'#44aaff',col:'#081522',lit:'#225577'}, // 2
    {sym:'Ψ',glowCol:'#aaff88',col:'#081420',lit:'#224455'}, // 3
    {sym:'Ω',glowCol:'#ff4444',col:'#09121e',lit:'#223355'}, // 4
    {sym:'∞',glowCol:'#44ffcc',col:'#082820',lit:'#1a6655'}, // 5
    {sym:'☽',glowCol:'#aaddff',col:'#091828',lit:'#1a4466'}, // 6
    {sym:'✸',glowCol:'#ffff55',col:'#0a1420',lit:'#225566'}, // 7
    {sym:'⊕',glowCol:'#ffee77',col:'#09182a',lit:'#225577'}, // 8
    {sym:'⊗',glowCol:'#ff44aa',col:'#091020',lit:'#1a2a44'}, // 9
    {sym:'θ',glowCol:'#88ff88',col:'#062e20',lit:'#1a6644'}, // 10
    {sym:'Φ',glowCol:'#dd88ff',col:'#14082a',lit:'#3a1266'}, // 11
  ];

  // Ice owns θ(10) Φ(11) ☽(6) ∞(5) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[10,11,6,5];
  // Ice colours assigned per SPELL_IDX position (0-3)
  const ICE_COLS=[
    {col:'#062e20',lit:'#55ffcc'}, // θ — teal ice crystal
    {col:'#14082a',lit:'#cc88ff'}, // Φ — violet frost
    {col:'#091828',lit:'#aaddff'}, // ☽ — ice-blue moon
    {col:'#082820',lit:'#44ffcc'}, // ∞ — eternal teal
  ];

  // Canvas: 3-col × 4-row keyboard grid
  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;  // 248 px
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Keyboard tile positions — bottom-aligned
  const tileAreaH=TS*4+GAP*3;        // 306 px
  const tileTop=ch-PAD-tileAreaH;    // 64 px
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Easy: prefix of the canonical Ice word: θ Φ ☽ ∞
  const seq=mgSeq(spell,[10,11,6,5],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Frost noise — all 12 arcana glyphs slowly crystallize and dissolve
  const FROST_COLS=['#336688','#2a5577','#224466','#1a3355','#2a4466'];
  const noise=Array.from({length:40},()=>({
    x:_rng()*cw, y:_rng()*ch,
    sz:8+_rng()*14,
    ai:Math.floor(_rng()*12),
    col:FROST_COLS[Math.floor(_rng()*5)],
    ph:_rng()*Math.PI*2,
    period:5000+_rng()*7000,
  }));

  // Sequence glyph positions scattered across the full canvas
  const xSlots=Array.from({length:SEQ_LEN},(_,i)=>{
    const frac=(i+0.5)/SEQ_LEN;
    return Math.max(30,Math.min(cw-30,cw*frac+(_rng()-0.5)*22));
  });
  const Y_BANDS=[0.18,0.38,0.58,0.28,0.48,0.68,0.22];
  const ySlots=Array.from({length:SEQ_LEN},(_,i)=>
    Math.max(35,Math.min(ch-50,ch*Y_BANDS[i%Y_BANDS.length]+(_rng()-0.5)*35))
  );

  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,1500);
  const FADE_IN=500,HOLD=1000,FADE_OUT=800;
  const GLYPH_DUR=FADE_IN+HOLD+FADE_OUT;
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:xSlots[i],y:ySlots[i],
    spawnAt:startTime+SPAWN_DELAY+i*SPAWN_INTERVAL,
    idx:i,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;

    // Background — icy deep blue
    const bg=mx.createRadialGradient(cw/2,ch*.45,0,cw/2,ch*.45,cw*.9);
    bg.addColorStop(0,'#020b14');
    bg.addColorStop(0.6,'#010508');
    bg.addColorStop(1,'#000304');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      // Frost noise — glyphs crystallize and dissolve on a slow triangle-wave cycle
      mx.save();
      noise.forEach(f=>{
        const cycle=(t/f.period+f.ph/(Math.PI*2))%1;
        const tri=cycle<0.5?cycle*2:(1-cycle)*2;
        mx.globalAlpha=tri*0.14;
        mx.fillStyle=f.col; mx.shadowColor=f.col; mx.shadowBlur=5;
        mx.font=`bold ${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1; mx.shadowBlur=0;
      mx.restore();

      // Sequence glyphs — crystallize (fade+scale in), hold, then melt (fade+scale out)
      symStates.forEach(s=>{
        const age=t-s.spawnAt;
        if(age<0) return;
        let alpha,scale;
        if(age<FADE_IN){
          const p=age/FADE_IN;
          alpha=p; scale=0.75+0.25*p;
        } else if(age<FADE_IN+HOLD){
          alpha=1; scale=1;
        } else if(age<GLYPH_DUR){
          const p=(age-FADE_IN-HOLD)/FADE_OUT;
          alpha=1-p; scale=1-0.15*p;
        } else {
          // After full cycle: persistent faint echo
          alpha=0.15+0.08*Math.abs(Math.sin((age-GLYPH_DUR)/2500+s.idx));
          scale=0.9;
        }
        if(alpha<=0.01) return;

        // Subtle ice shimmer — gentle lateral drift like frost under breath
        const shimX=Math.sin(t/2000+s.idx*2.3)*1.8;
        const shimY=Math.cos(t/2600+s.idx*1.8)*1.2;

        mx.save();
        mx.globalAlpha=alpha;
        mx.translate(s.x+shimX,s.y+shimY);
        mx.scale(scale,scale);
        mx.shadowColor=s.glowCol; mx.shadowBlur=30;
        mx.fillStyle='#dff4ff';
        mx.font='bold 40px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,0,0);
        mx.restore();

        // Order badge — visible during crystallize and hold phases
        if(alpha>0.3&&age<FADE_IN+HOLD+300){
          mx.save();
          mx.globalAlpha=Math.min(alpha,0.95);
          mx.shadowColor='#88ddff'; mx.shadowBlur=8;
          mx.fillStyle='#88ddff';
          mx.font='bold 11px Cinzel,serif';
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.idx+1,s.x+22,s.y-22);
          mx.restore();
        }
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      mx.fillStyle='#88ddff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the frost runes crystallize!',cw/2,4);
    }

    if(phase==='input'){
      // Faint ambient frost — very subdued during input
      mx.save();
      noise.slice(0,10).forEach(f=>{
        const cycle=(t/f.period+f.ph/(Math.PI*2))%1;
        const tri=cycle<0.5?cycle*2:(1-cycle)*2;
        mx.globalAlpha=tri*0.06;
        mx.fillStyle=f.col;
        mx.font=`${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1;
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai);
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          // All glyphs neutral icy — player must rely on memory
          bgCol='#0a1825'; bgDark='#030810';
          strokeCol='#1a3a5888'; textCol='#2a6888';
          blur=4; textAlpha=1;
        } else if(isSpell){
          // Spell glyphs: ice colours by SPELL_IDX position
          bgCol=ICE_COLS[si].col; bgDark='#000810';
          strokeCol=ICE_COLS[si].col+'88'; textCol=ICE_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          // Non-spell glyphs: ghosted out
          bgCol='#070e16'; bgDark='#02050a';
          strokeCol='#0f1e2a'; textCol='#162230';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      // Status label
      mx.fillStyle='#88ddff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Progress dots — sit between status text and keyboard
      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#88ddff';mx.shadowColor='#88ddff';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(136,221,255,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ARCANE PATTERN (Ether Drift) ─────────────────────────────
function launchArcanePattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Ether Drift Sigil';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff',col:'#1a0830',lit:'#9966cc'}, // 0
    {sym:'Δ',glowCol:'#ff9944',col:'#150626',lit:'#8855bb'}, // 1
    {sym:'∇',glowCol:'#44aaff',col:'#0e0820',lit:'#7744aa'}, // 2
    {sym:'Ψ',glowCol:'#aaff88',col:'#14002a',lit:'#dd55ff'}, // 3 — arcane
    {sym:'Ω',glowCol:'#ff4444',col:'#1a0035',lit:'#cc44ff'}, // 4 — arcane
    {sym:'∞',glowCol:'#44ffcc',col:'#0d0025',lit:'#aa66ff'}, // 5 — arcane
    {sym:'☽',glowCol:'#aaddff',col:'#100620',lit:'#7755bb'}, // 6
    {sym:'✸',glowCol:'#ffff55',col:'#120620',lit:'#6644aa'}, // 7
    {sym:'⊕',glowCol:'#ffee77',col:'#130728',lit:'#7744bb'}, // 8
    {sym:'⊗',glowCol:'#ff44aa',col:'#180328',lit:'#9933bb'}, // 9
    {sym:'θ',glowCol:'#88ff88',col:'#100020',lit:'#9955ee'}, // 10 — arcane
    {sym:'Φ',glowCol:'#dd88ff',col:'#160028',lit:'#bb55ff'}, // 11
  ];

  // Arcane owns Ω(4) ∞(5) Ψ(3) θ(10) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[4,5,3,10];
  const ARCANE_COLS=[
    {col:'#1a0035',lit:'#cc44ff'}, // Ω — radiant purple
    {col:'#0d0025',lit:'#aa66ff'}, // ∞ — soft violet
    {col:'#14002a',lit:'#dd55ff'}, // Ψ — magenta-purple
    {col:'#100020',lit:'#9955ee'}, // θ — deep violet
  ];

  // Canvas: 3-col × 4-row keyboard grid
  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;  // 248 px
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Keyboard tile positions — bottom-aligned
  const tileAreaH=TS*4+GAP*3;        // 306 px
  const tileTop=ch-PAD-tileAreaH;    // 64 px
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Easy: prefix of the canonical Arcane word: Ω ∞ Ψ θ
  const seq=mgSeq(spell,[4,5,3,10],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Noise glyphs — float in random directions, lilac purple
  const LILAC_COLS=['#bb88dd','#cc99ee','#aa77cc','#cc88ee','#b080d8'];
  const noise=Array.from({length:44},()=>{
    const angle=_rng()*Math.PI*2;
    const spd=0.35+_rng()*0.7;
    return {
      x:_rng()*cw, y:_rng()*ch,
      dx:Math.cos(angle)*spd, dy:Math.sin(angle)*spd,
      sz:8+_rng()*13,
      ai:Math.floor(_rng()*12),
      col:LILAC_COLS[Math.floor(_rng()*5)],
      ph:_rng()*Math.PI*2,
      alpha:0.1+_rng()*0.25,
    };
  });

  // White sequence glyphs — all drift rightward at the same speed, various heights
  const DRIFT_SPEED=0.5;  // px/frame — consistent across all sequence glyphs
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,1500);
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  const Y_BANDS=[0.12,0.30,0.48,0.22,0.40,0.55,0.18];
  const ySlots=Array.from({length:SEQ_LEN},(_,i)=>
    Math.max(30,Math.min(ch*0.72, ch*Y_BANDS[i%Y_BANDS.length]+(_rng()-0.5)*25))
  );

  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:-30, y:ySlots[i],
    spawned:false, idx:i,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;

    // Background — deep purple ether
    const bg=mx.createRadialGradient(cw/2,ch*.45,0,cw/2,ch*.45,cw*.9);
    bg.addColorStop(0,'#1a0030');
    bg.addColorStop(0.6,'#0d0020');
    bg.addColorStop(1,'#050010');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      // Noise glyphs — lilac, drifting in all directions, wrapping at edges
      mx.save();
      noise.forEach(f=>{
        f.x+=f.dx; f.y+=f.dy;
        if(f.x<-20) f.x=cw+20;
        else if(f.x>cw+20) f.x=-20;
        if(f.y<-20) f.y=ch+20;
        else if(f.y>ch+20) f.y=-20;
        const pulse=0.5+0.5*Math.abs(Math.sin(t/800+f.ph));
        mx.globalAlpha=f.alpha*pulse;
        mx.fillStyle=f.col; mx.shadowColor=f.col; mx.shadowBlur=6;
        mx.font=`bold ${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1; mx.shadowBlur=0;
      mx.restore();

      // White sequence glyphs — all drift rightward at same speed, various heights
      symStates.forEach(s=>{
        if(!s.spawned&&elapsed>=SPAWN_DELAY+s.idx*SPAWN_INTERVAL){
          s.spawned=true; s.x=-30;
        }
        if(!s.spawned) return;
        s.x+=DRIFT_SPEED;
        if(s.x>cw+30) return;  // drifted off-screen — don't wrap

        let alpha=1;
        if(s.x<50) alpha=Math.max(0,(s.x+30)/80);
        else if(s.x>cw-50) alpha=Math.max(0,(cw+30-s.x)/80);
        if(alpha<=0.01) return;

        const osc=Math.sin(t/1100+s.idx*1.7)*0.07;
        mx.save();
        mx.globalAlpha=alpha;
        mx.translate(s.x,s.y); mx.rotate(osc);
        mx.shadowColor=s.glowCol; mx.shadowBlur=35;
        mx.fillStyle='#ffffff';
        mx.font='bold 40px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,0,0);
        mx.restore();
        // Order badge
        mx.save();
        mx.globalAlpha=alpha;
        mx.shadowColor='#dd99ff'; mx.shadowBlur=10;
        mx.fillStyle='#dd99ff';
        mx.font='bold 11px Cinzel,serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.idx+1,s.x+22,s.y-22);
        mx.restore();
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      mx.fillStyle='#cc99ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the arcane runes drift!',cw/2,4);
    }

    if(phase==='input'){
      // Faint ambient drift during input phase
      mx.save();
      noise.slice(0,14).forEach(f=>{
        f.x+=f.dx*0.4; f.y+=f.dy*0.4;
        if(f.x<-20) f.x=cw+20;
        else if(f.x>cw+20) f.x=-20;
        if(f.y<-20) f.y=ch+20;
        else if(f.y>ch+20) f.y=-20;
        mx.globalAlpha=f.alpha*0.18;
        mx.fillStyle=f.col;
        mx.font=`${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,f.x,f.y);
      });
      mx.globalAlpha=1;
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai);
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          bgCol='#1a0035'; bgDark='#090015';
          strokeCol='#3a106588'; textCol='#8844cc';
          blur=4; textAlpha=1;
        } else if(isSpell){
          bgCol=ARCANE_COLS[si].col; bgDark='#050010';
          strokeCol=ARCANE_COLS[si].col+'88'; textCol=ARCANE_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          bgCol='#0d0020'; bgDark='#040008';
          strokeCol='#1e1030'; textCol='#2d1545';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      // Status label
      mx.fillStyle='#cc99ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Progress dots
      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#cc99ff';mx.shadowColor='#cc99ff';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(204,153,255,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: DISPEL PATTERN (Veil Unravelling) ─────────────────────────────
function launchDispelPattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Veil Unravelling';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // ── Full 12-glyph Arcana Alphabet (grid order: 3 cols × 4 rows) ──────
  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff'}, // 0
    {sym:'Δ',glowCol:'#ff9944'}, // 1
    {sym:'∇',glowCol:'#44aaff'}, // 2
    {sym:'Ψ',glowCol:'#aaff88'}, // 3
    {sym:'Ω',glowCol:'#ff4444'}, // 4
    {sym:'∞',glowCol:'#44ffcc'}, // 5
    {sym:'☽',glowCol:'#aaddff'}, // 6
    {sym:'✸',glowCol:'#ffff55'}, // 7
    {sym:'⊕',glowCol:'#ffee77'}, // 8
    {sym:'⊗',glowCol:'#ff44aa'}, // 9
    {sym:'θ',glowCol:'#88ff88'}, // 10
    {sym:'Φ',glowCol:'#dd88ff'}, // 11
  ];

  // Dispel owns ∞(5) ⊕(8) ∇(2) θ(10) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[5,8,2,10];
  const DISPEL_COLS=[
    {col:'#1a0030',lit:'#cc88ff'}, // ∞ — violet
    {col:'#2a1800',lit:'#ffcc66'}, // ⊕ — gold
    {col:'#001520',lit:'#66aadd'}, // ∇ — slate blue
    {col:'#001a15',lit:'#66cc99'}, // θ — mint
  ];

  // Canvas: 3-col × 4-row keyboard grid
  const TS=72,GAP=6,PAD=10;
  const cw=PAD*2+TS*3+GAP*2;  // 248 px
  const ch=380;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  // Keyboard tile positions — bottom-aligned
  const tileAreaH=TS*4+GAP*3;
  const tileTop=ch-PAD-tileAreaH;
  const tPos=Array.from({length:12},(_,i)=>({
    x:PAD+(i%3)*(TS+GAP),
    y:tileTop+Math.floor(i/3)*(TS+GAP),
  }));

  // Easy: prefix of the canonical Dispel word: ∞ ⊕ ∇ θ
  const seq=mgSeq(spell,[5,8,2,10],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Watch phase center — upper portion of canvas
  const cx=cw/2, cy=ch*0.40;

  // Ring radii — inner scales slightly with sequence length to avoid crowding
  const R_OUTER=110, R_MID=72;
  const R_INNER=SEQ_LEN<=4?38:SEQ_LEN<=5?48:64;
  const INNER_FONT=SEQ_LEN<=4?52:SEQ_LEN<=5?44:36;

  // Layer fade timings (ms)
  const OUTER_FADE_START=1000, OUTER_FADE_DUR=1000;  // outer fades 1–2 s
  const MID_FADE_START=2200,   MID_FADE_DUR=1300;    // middle fades 2.2–3.5 s
  const INNER_FADE_START=3600, INNER_FADE_DUR=1300;  // inner fades 3.6–4.9 s
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  // Pre-generated static noise rings — random glyph symbols, evenly spread with tiny jitter
  const outerNoise=Array.from({length:12},(_,i)=>({
    ai:Math.floor(_rng()*12),
    angle:(i/12)*Math.PI*2+(_rng()-0.5)*0.1,
  }));
  const midNoise=Array.from({length:8},(_,i)=>({
    ai:Math.floor(_rng()*12),
    angle:(i/8)*Math.PI*2+(_rng()-0.5)*0.15,
  }));

  // Inner ring: sequence glyphs, starting at top (−π/2), clockwise
  const innerGlyphs=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    angle:(i/SEQ_LEN)*Math.PI*2-Math.PI/2,
    idx:i,
  }));

  function ringFade(elapsed,fadeStart,fadeDur){
    if(elapsed<fadeStart) return 1;
    if(elapsed>fadeStart+fadeDur) return 0;
    return 1-(elapsed-fadeStart)/fadeDur;
  }

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false);
    },1000);
  }

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width,sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    for(let ai=0;ai<12;ai++){
      const tp=tPos[ai];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        const isSpell=SPELL_IDX.includes(ai);
        if(!isSpell){
          if(diffName==='hard') finish(false);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false);return;}
        playerSeq.push(ai);
        if(playerSeq.length===seq.length) finish(true);
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid);mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  }
  function finish(ok){if(done)return;done=true;cleanup();puzzleFinish(ok,cb);}

  function drawRingCircle(r,alpha){
    if(alpha<=0.01) return;
    mx.save();
    mx.globalAlpha=alpha*0.10;
    mx.strokeStyle='#c0b8d4';
    mx.lineWidth=0.8;
    mx.shadowBlur=0;
    mx.beginPath(); mx.arc(cx,cy,r,0,Math.PI*2); mx.stroke();
    mx.restore();
  }

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;
    const rotT=elapsed/1000;

    // Background — very dark, near-black with a faint cool tint
    const bg=mx.createRadialGradient(cw/2,ch*.45,0,cw/2,ch*.45,cw*.85);
    bg.addColorStop(0,'#0f0d16');
    bg.addColorStop(0.65,'#090810');
    bg.addColorStop(1,'#050408');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      const outerA=ringFade(elapsed,OUTER_FADE_START,OUTER_FADE_DUR);
      const midA=ringFade(elapsed,MID_FADE_START,MID_FADE_DUR);
      const innerA=ringFade(elapsed,INNER_FADE_START,INNER_FADE_DUR);

      // Faint concentric circle guides — the onion skin boundaries
      drawRingCircle(R_OUTER+14,outerA);
      drawRingCircle(R_MID+12,midA);
      drawRingCircle(R_INNER+18,innerA);

      // Outer ring — slow clockwise rotation, fades first
      if(outerA>0.01){
        const rot=rotT*0.05;
        mx.save();
        mx.font='bold 18px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        outerNoise.forEach(g=>{
          const a=g.angle+rot;
          mx.globalAlpha=outerA*0.20;
          mx.fillStyle='#bdb8cc';
          mx.shadowBlur=0;
          mx.fillText(ALPHABET[g.ai].sym,cx+R_OUTER*Math.cos(a),cy+R_OUTER*Math.sin(a));
        });
        mx.restore();
      }

      // Middle ring — counter-clockwise, slightly faster, fades second
      if(midA>0.01){
        const rot=-rotT*0.09;
        mx.save();
        mx.font='bold 24px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        midNoise.forEach(g=>{
          const a=g.angle+rot;
          mx.globalAlpha=midA*0.30;
          mx.fillStyle='#ccc8dc';
          mx.shadowBlur=0;
          mx.fillText(ALPHABET[g.ai].sym,cx+R_MID*Math.cos(a),cy+R_MID*Math.sin(a));
        });
        mx.restore();
      }

      // Soft centre glow — drawn before inner glyphs so glyphs sit on top
      if(innerA>0.01){
        const grd=mx.createRadialGradient(cx,cy,0,cx,cy,R_INNER*0.8);
        grd.addColorStop(0,`rgba(180,140,220,${0.06*innerA})`);
        grd.addColorStop(1,'rgba(0,0,0,0)');
        mx.fillStyle=grd; mx.fillRect(0,0,cw,ch);

        // Inner ring — spell sequence glyphs, very slow rotation, fades last
        const rot=rotT*0.03;
        innerGlyphs.forEach(s=>{
          const a=s.angle+rot;
          const gx=cx+R_INNER*Math.cos(a);
          const gy=cy+R_INNER*Math.sin(a);
          const osc=Math.sin(t/1000+s.idx)*0.04;
          mx.save();
          mx.globalAlpha=innerA;
          mx.translate(gx,gy); mx.rotate(osc);
          mx.shadowColor=s.glowCol; mx.shadowBlur=30;
          mx.fillStyle='#ffffff';
          mx.font=`bold ${INNER_FONT}px serif`;
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.sym,0,0);
          mx.restore();
          // Order badge
          mx.save();
          mx.globalAlpha=innerA;
          mx.shadowColor='#eeddff'; mx.shadowBlur=8;
          mx.fillStyle='#eeddff';
          mx.font='bold 11px Cinzel,serif';
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.idx+1,gx+20,gy-18);
          mx.restore();
        });
        mx.globalAlpha=1; mx.shadowBlur=0;
      }

      mx.fillStyle='#cc99ee';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the veil unravel!',cw/2,4);
    }

    if(phase==='input'){
      // Ghost of the outer ring lingers very faintly
      const rot=(elapsed/1000)*0.05;
      mx.save();
      mx.font='bold 18px serif';
      mx.textAlign='center'; mx.textBaseline='middle';
      outerNoise.forEach(g=>{
        const a=g.angle+rot;
        mx.globalAlpha=0.04;
        mx.fillStyle='#bdb8cc';
        mx.fillText(ALPHABET[g.ai].sym,cx+R_OUTER*Math.cos(a),cy+R_OUTER*Math.sin(a));
      });
      mx.restore();

      // 12-glyph keyboard
      const isHard=diffName==='hard';
      for(let ai=0;ai<12;ai++){
        const tp=tPos[ai];
        const g=ALPHABET[ai];
        const si=SPELL_IDX.indexOf(ai);
        const isSpell=si!==-1;

        let bgCol,bgDark,strokeCol,textCol,blur,textAlpha;
        if(isHard){
          bgCol='#1a0a2a'; bgDark='#0a0415';
          strokeCol='#40186888'; textCol='#9966cc';
          blur=4; textAlpha=1;
        } else if(isSpell){
          bgCol=DISPEL_COLS[si].col; bgDark='#030208';
          strokeCol=DISPEL_COLS[si].col+'88'; textCol=DISPEL_COLS[si].lit;
          blur=8; textAlpha=1;
        } else {
          bgCol='#0a0810'; bgDark='#050408';
          strokeCol='#161220'; textCol='#261838';
          blur=0; textAlpha=0.35;
        }

        mx.save();
        mx.shadowColor=bgCol; mx.shadowBlur=blur;
        const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,3,tp.x+TS/2,tp.y+TS/2,TS*.6);
        tg.addColorStop(0,bgCol); tg.addColorStop(1,bgDark);
        mx.fillStyle=tg;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.fill();
        mx.shadowBlur=0;
        mx.strokeStyle=strokeCol; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,5); mx.stroke();
        mx.globalAlpha=textAlpha;
        mx.fillStyle=textCol;
        mx.font=`bold ${Math.round(TS*.42)}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(g.sym,tp.x+TS/2,tp.y+TS/2);
        mx.restore();
      }

      // Status label
      mx.fillStyle='#cc99ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Progress dots
      const dotY=tileTop-10,dsp=14;
      const ds=cw/2-(seq.length-1)*dsp/2;
      for(let i=0;i<seq.length;i++){
        mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
        if(i<playerSeq.length){mx.fillStyle='#cc99ff';mx.shadowColor='#cc99ff';mx.shadowBlur=6;}
        else{mx.fillStyle='rgba(204,153,255,0.2)';mx.shadowBlur=0;}
        mx.fill(); mx.shadowBlur=0;
      }
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── FLASH ──────────────────────────────────────────────────
function flash(col){
  if(simMode) return;
  const el=document.getElementById('flash');
  el.style.background=col; el.classList.add('on');
  setTimeout(()=>el.classList.remove('on'),120);
}

// ── SILENCE BLOCK VISUAL ───────────────────────────────────
function showSilenceBlock(cx,y){
  addFloat(cx,y,'🔇 SILENCED!','#cc44ff',22);
  addFloat(cx,y+bH*.07,'Spell Blocked','#9944cc',13);
  spawnParts(cx,y,'#cc44ff',18);
  spawnParts(cx,y,'#440066',12);
  flash('#1a0033');
}


// ── ACTION BAR SETUP ───────────────────────────────────────
function updateActionBar(cfg){
  const who=gs&&gs.turnPlayer||'p1';
  Object.keys(ELEM_CATS).forEach(cat=>{
    const btn=document.getElementById('bel-'+cat);
    btn.style.borderColor=cfg.col; btn.style.color=cfg.col;
    document.getElementById('bel-'+cat+'-cost').textContent=
      hasFreeSpell(who)?'✨ Free!':elemCost(who,cat,1)+'–'+elemCost(who,cat,3)+' Mana';
  });
}

// ── BUTTON WIRING ──────────────────────────────────────────
function showWizardDetail(key){
  const cfg=CHAR_DEFS[key]||{};
  const col=cfg.col||'#f0cc6a';
  const portrait=document.getElementById('wd-portrait');
  portrait.style.display='';
  portrait.src='portraits/'+key+'.png';
  const nameEl=document.getElementById('wd-name');
  nameEl.textContent=cfg.name||key.toUpperCase();
  nameEl.style.color=col;
  document.getElementById('wd-epithet').textContent=cfg.title||'';
  document.getElementById('wd-stats').innerHTML=elemCharStats(cfg)
    .map(([l,r])=>`<div class="cstat"><span class="cstat-l">${l}</span><span class="cstat-r">${r}</span></div>`)
    .join('');
  document.getElementById('wd-flavour').textContent=CHAR_FLAVOUR[key]||'';
  const chooseBtn=document.getElementById('wd-choose');
  chooseBtn.style.borderColor=col;
  chooseBtn.style.color=col;
  chooseBtn.dataset.key=key;
  document.getElementById('wizard-detail').classList.add('active');
}

function pickCharacter(key){
  if(trainingMode){
    if(trainingPickPhase==='p1'){
      p1Key=key; p1Cfg=CHAR_DEFS[key];
      document.getElementById('tp-p1-portrait').src='portraits/'+key+'.png';
      document.getElementById('tp-p1-name').textContent=p1Cfg.name;
    } else if(trainingPickPhase==='p2'){
      p2Key=key; p2Cfg=CHAR_DEFS[key];
      document.getElementById('tp-p2-portrait').src='portraits/'+key+'.png';
      document.getElementById('tp-p2-name').textContent=p2Cfg.name;
    }
    trainingPickPhase=null;
    document.getElementById('char-player-label').style.display='none';
    showScreen('training-screen');
    return;
  }
  if(multiMode){
    multiPicks.push(key);
    if(multiPicks.length<multiSetup.n){ labelMultiPick(); return; }
    document.getElementById('char-player-label').style.display='none';
    startMultiBattle();
    return;
  }
  if(twoPlayerMode){
    if(twoPlayerPhase===1){
      p1Key=key; p1Cfg=CHAR_DEFS[key];
      twoPlayerPhase=2;
      const lbl=document.getElementById('char-player-label');
      lbl.textContent='Player 2: Choose Your Wizard';
      lbl.style.display='';
      return;
    } else {
      p2Key=key; p2Cfg=CHAR_DEFS[key];
      twoPlayerPhase=1;
      document.getElementById('char-player-label').style.display='none';
      startTwoPlayerMatch();
      return;
    }
  }
  p1Key=key;
  p1Cfg=CHAR_DEFS[key];
  // Arcade: 4 random non-boss opponents, then 4 fixed bosses in order
  const pool=Object.keys(CHAR_DEFS).filter(k=>k!==key&&!ARCADE_BOSSES.includes(k));
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(_rng()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  const earlyFoes=pool.slice(0,4);
  const bossList=ARCADE_BOSSES.filter(k=>k!==key);
  tournamentQueue=[...earlyFoes,...bossList];
  tournamentIndex=0;
  p2Key=tournamentQueue[0];
  p2Cfg=CHAR_DEFS[p2Key];
  showBracket(false);
}

// ── 2 PLAYER MATCH FLOW ────────────────────────────────────
function startTwoPlayerMatch(){
  matchRound=0; p1MatchWins=0; p2MatchWins=0;
  tournamentQueue=[];
  startNextTwoPlayerRound();
}

function startNextTwoPlayerRound(){
  matchRound++;
  startTwoPlayerBattle();
}

function startTwoPlayerBattle(){
  document.getElementById('btn-training-menu').style.display='none';
  loadSprites();
  updateActionBar(p1Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name+' (P1)';
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/'+p1Key+'.png';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name+' (P2)';
  document.getElementById('p2-portrait').src='portraits/'+p2Key+'.png';
  newState();
  gs.myTurn=false; gs.busy=true;
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
  setTimeout(beginPickPhase,200);
}

function showHandoffOverlay(toPlayer, callback){
  const cfg=seatCfg(toPlayer);
  const num=PLAYERS.indexOf(toPlayer)+1;
  document.getElementById('handoff-player-num').textContent='Player '+num;
  document.getElementById('handoff-char-name').textContent=cfg.name.toUpperCase();
  const portrait=document.getElementById('handoff-portrait');
  portrait.src='portraits/'+seatKey(toPlayer)+'.png';
  portrait.style.borderColor=cfg.col;
  const p1s='★'.repeat(Math.min(2,p1MatchWins))+'☆'.repeat(Math.max(0,2-p1MatchWins));
  const p2s='★'.repeat(Math.min(2,p2MatchWins))+'☆'.repeat(Math.max(0,2-p2MatchWins));
  const team=multiMode&&seatSetup&&seatSetup.find(st=>st.who===toPlayer).team;
  document.getElementById('handoff-match-info').textContent=multiMode
    ?'Round '+gs.round+(team?'  ·  Team '+team:'')
    :'Match Round '+matchRound+' of 3  ·  P1 '+p1s+'  vs  P2 '+p2s;
  const overlay=document.getElementById('handoff-overlay');
  const btn=document.getElementById('handoff-btn');
  btn.onclick=null;
  overlay.classList.add('active');
  btn.onclick=()=>{ overlay.classList.remove('active'); if(callback) callback(); };
}

function startNextBattle(){
  document.getElementById('btn-training-menu').style.display='none';
  p2Cfg=CHAR_DEFS[p2Key];
  loadSprites();
  updateActionBar(p1Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name;
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/'+p1Key+'.png';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name;
  document.getElementById('p2-portrait').src='portraits/'+p2Key+'.png';
  // Show fight progress in HUD
  const fightLbl=document.getElementById('fightlbl');
  if(fightLbl){
    if(tournamentQueue.length>1) fightLbl.textContent='Fight '+(tournamentIndex+1)+' / '+tournamentQueue.length;
    else fightLbl.textContent='';
  }
  newState();
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
}

function startTrainingBattle(){
  tournamentQueue=[]; tournamentIndex=0; twoPlayerMode=false;
  loadSprites();
  updateActionBar(p1Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name;
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/'+p1Key+'.png';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name;
  document.getElementById('p2-portrait').src='portraits/'+p2Key+'.png';
  const fightLbl=document.getElementById('fightlbl');
  if(fightLbl) fightLbl.textContent='Training';
  document.getElementById('btn-training-menu').style.display='block';
  newState();
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
}

// ── BALANCE SIMULATOR ──────────────────────────────────────
// Used by tools/balance.html: AI vs AI duels on the real rules, resolved instantly.
// Returns {winner:'p1'|'p2'|'draw'|'timeout', rounds, hp:{p1,p2}, picks:{p1:{key:count},p2:{…}}}
// where pick keys are a signature spell id, or 'damage' / 'protect' / 'dispel' / 'cleanse' / 'meditate' / 'pass'.
const SIM_MAX_ROUNDS=60;
// The tool page reads the game through an iframe, where only function declarations are visible
function simInfo(){ return {options:GAME_OPTIONS, suddenDeath:SUDDEN_DEATH, chars:CHAR_DEFS, maxRounds:SIM_MAX_ROUNDS, wardTake:ELEM_WARD_TAKE, bounty:ELEM_KO_BOUNTY, phase:PHASE,
  setGangAware:v=>{ GANG_AWARE_AI=v; }}; }
function simMatch(k1,k2,ai){
  simMode=true; simOutcome=null;
  twoPlayerMode=false; trainingMode=false;
  aiDifficulty=ai||'normal';
  p1Key=k1; p1Cfg=CHAR_DEFS[k1]; p2Key=k2; p2Cfg=CHAR_DEFS[k2];
  newState();
  if(!bW){ bW=400; bH=300; }
  battleRunning=true; gameEnded=false;
  const picks={p1:{},p2:{}};
  while(!gameEnded&&gs.round<=SIM_MAX_ROUNDS){
    PLAYERS.forEach(w=>{
      const a=elemAIChoose(w);
      gs.pending[w]=a;
      const key=a.sig||(a.self?'cleanse':a.cat);
      picks[w][key]=(picks[w][key]||0)+1;
    });
    resolveSimRound();
    gs.parts=[]; gs.floats=[]; gs.beams=[]; gs.manaBurnFires=[];
  }
  const out={winner:simOutcome||'timeout',rounds:gs.round-1,hp:{p1:gs.p1.hp,p2:gs.p2.hp},picks};
  battleRunning=false; simMode=false;
  return out;
}

// 3–4 seat version: seats [{key,team?}]. Returns the winning team ('p1'… for free-for-all), 'draw' or 'timeout'.
function simMatchN(seats,ai){
  simMode=true; simOutcome=null;
  twoPlayerMode=false; trainingMode=false;
  aiDifficulty=ai||'normal';
  setupSeats(seats);
  try{
    newState();
    if(!bW){ bW=400; bH=300; }
    battleRunning=true; gameEnded=false;
    const outRound={};
    while(!gameEnded&&gs.round<=SIM_MAX_ROUNDS){
      activeSeats().forEach(w=>{ gs.pending[w]=elemAIChoose(w); });
      resolveSimRound();
      PLAYERS.forEach(w=>{ if(gs[w].out&&outRound[w]==null) outRound[w]=gs.round-1; });
      gs.parts=[]; gs.floats=[]; gs.beams=[]; gs.manaBurnFires=[];
    }
    return {winner:simOutcome||'timeout',rounds:gs.round-1,outRound,koBy:gs.koBy||{},
      hp:Object.fromEntries(PLAYERS.map(w=>[w,gs[w].hp]))};
  } finally {
    battleRunning=false; simMode=false;
    setupSeats(null);
  }
}

// ── TUTORIAL ─────────────────────────────────────────────────────────────────
const CHAR_COLORS_TUT={
  eldrad:'#4af0ff',mal:'#ff4a6e',sylvara:'#44cc88',aurelia:'#ffcc44',
  gnash:'#dd8822',cinder:'#ff6600',skadi:'#88ddff',zacharius:'#aaff44',
  mary:'#f0d8a0',mordant:'#9944cc',ponder:'#9988cc',durin:'#b08040',
  weizan:'#aabbee',gretch:'#55aa33',valdris:'#8899cc',mirel:'#cc88ff',thessaly:'#ffdd88',
  korvath:'#cc6622',fizzwick:'#99cc44',nyxara:'#6633aa'
};
const CHAR_NAMES_TUT={
  eldrad:'Eldrin',mal:'Malachar',sylvara:'Sylvara',aurelia:'Aurelia',
  gnash:'Gnash',cinder:'Cinder',skadi:'Skadi',zacharius:'Zacharius',
  mary:'Mary',mordant:'Mordant',ponder:'Ponder',durin:'Durin',
  weizan:'Weizan',gretch:'Gretch',valdris:'Valdris',mirel:'Mirel',thessaly:'Thessaly',
  korvath:'Korvath',fizzwick:'Fizzwick',nyxara:'Nyxara'
};
const CHAR_KEYS_TUT=['eldrad','mal','sylvara','aurelia','gnash','cinder','skadi','zacharius','mary','mordant','ponder','durin','weizan','gretch','valdris','mirel','thessaly','korvath','fizzwick','nyxara'];

// Character guides describe each spell's effect and wheel sector rather than exact numbers,
// which live in characters.json and are shown on the wheel itself.
const TUTORIAL_TOPICS=[
  {id:'welcome',     label:'Welcome'},
  {id:'health-mana', label:'Health & Mana'},
  {id:'triangle',    label:'Strike · Ward · Dispel'},
  {id:'wheel',       label:'The Wheel'},
  {id:'enchant',     label:'Buffs & Curses'},
  {id:'alphabet',    label:'The Alphabet'},
  {id:'watching',    label:'Casting Rituals'},
  {id:'difficulty',  label:'Difficulty'},
];

const TUTORIAL_CONVOS={
  welcome:[
    {key:'eldrad', text:"Greetings, young mage. Welcome to the arena of wizards — a place where reading your rival matters as much as raw power."},
    {key:'sylvara',text:"Every round, each wizard chooses a spell in secret. When everyone has chosen, the spells are revealed together — like turning over cards — and then they all play out."},
    {key:'ponder', text:"Use the topics above to learn how it works, then tap any portrait below to hear that wizard explain their own spells. I'm Ponder — come find me!"},
    {key:'eldrad', text:"Learn the rules, then learn your rivals. We are all here to help."},
  ],
  'health-mana':[
    {key:'eldrad', text:"Every wizard has Health and Mana. When your HP reaches zero, the duel is over. HP differs between wizards — Gnash and Durin are hardy, Malachar and Fizzwick are fragile."},
    {key:'sylvara',text:"Everyone starts with the same mana and gains more at the end of every round. There are no free attacks — every spell costs something."},
    {key:'skadi',  text:"Short of mana? 🧘 Meditate instead of casting: you gain 3 extra mana that round. But you cast nothing, so if your rival strikes, it lands. You can't meditate two rounds in a row."},
    {key:'ponder', text:"Even the cheapest spell costs only a little, so you can always do something. The question is whether to spend big now or save for a stronger cast next round."},
    {key:'sylvara',text:"Watch your rival's mana bar! If they can't afford a big ward, they won't cast one. Reading their mana is half the game."},
  ],
  triangle:[
    {key:'eldrad', text:"There are three kinds of spell: ⚔️ Damage, 🛡 Protection and ✦ Dispel. They work like rock, paper, scissors."},
    {key:'eldrad', text:"Protection beats Damage: a ward soaks up strikes, and it's raised before any damage lands — even in the same round. Strike into a ward and you've wasted your mana."},
    {key:'ponder', text:"Dispel beats Protection: dispels are cheap and tear through wards. Your rival spends a lot of mana on a ward, you break it for a little."},
    {key:'sylvara',text:"And Damage beats Dispel: if you dispel and your rival simply strikes, you've spent your round on nothing and taken the hit. Damage is also the surest way to win."},
    {key:'eldrad', text:"Each round resolves in that order — every Protection first, then every Dispel, then every Damage. So the trick is guessing what your rival will choose."},
    {key:'mal',    text:"With three or four of us, whoever deals the most damage to a wizard in the round they fall claims a bounty: HP and mana. Gang up on someone if you like — but your ally wants that kill as much as you do."},
    {key:'gnash',  text:"Duel drag on too long? Normally it ends in a draw at the round limit. Pick SUDDEN DEATH in Options instead: from round 30 — round 20 with three or four of us — every round hits harder and brings more mana. Wards don't grow. Somebody falls soon."},
    {key:'ponder', text:"Think they're all coming for you? Tap 🌀 Phase. Everything aimed at you that round misses, and you soak up the mana they spent on it. Catch two or more spells and your next spell is free — any ring! Guess wrong and you've lost your turn and 4 mana."},
  ],
  wheel:[
    {key:'ponder', text:"Pick a category and a wheel appears. It has six elements — Fire, Ice, Lightning, Arcane, Physical and Dark — and three rings."},
    {key:'ponder', text:"Tap closer to the edge for a stronger spell. The inner ring is cheap and weak, the outer ring is costly and powerful, and it's a longer casting ritual too. With more than one rival, an outer-ring strike hits every one of them."},
    {key:'skadi',  text:"The element matters. A ward resists every element but its own — its own element unravels it, and a dispel of its element does double. So ward in an element your rival can't cast: some wizards are barred from whole elements."},
    {key:'zacharius',text:"Some elements carry extra effects. Lightning burns your rival's mana even if it hits a ward. A strong Ice strike that reaches them chills them, so they can't pick Damage next round."},
    {key:'eldrad', text:"Wards last three rounds and fade a little each round. Raising a new one replaces the old one. Damage over time — poison, burns, vines, plague — hits your ward first too."},
    {key:'mary',   text:"In a team duel, your wards, buffs and heals can go on a team-mate instead — after the ritual you choose who to protect. Summoned minions always serve whoever summoned them, though."},
    {key:'sylvara',text:"Each wizard's own spells take over some sectors of the wheel — they're outlined in gold, and listed under the wheel with their costs. That's where a wizard's personality shows."},
  ],
  enchant:[
    {key:'mary',   text:"Some wizards cast enchantments. Buffs — like Regen, War Paint or a skeleton servant — sit on the Protection wheel and last a while."},
    {key:'mordant',text:"Curses — like Silence, Plague or Agony — sit on the Dispel wheel. As well as their hex, every curse wears at the target's ward a little, like a weak dispel."},
    {key:'ponder', text:"A Dispel against a rival with no ward strips their newest buff — or all of them, from the outer ring. If they have a ward, the dispel hits the ward instead. Wards protect your buffs!"},
    {key:'mary',   text:"Cursed? Open the Dispel wheel and tap Cleanse Self. It removes every curse on you for very little mana."},
    {key:'sylvara',text:"Locks — like Ice's chill, my Entangle or Thessaly's Enthral — stop you choosing one category next round. They can't land two rounds in a row, so you'll always get a turn free."},
  ],
  alphabet:[
    {key:'sylvara',text:"Every casting ritual uses symbols from the Arcane Alphabet — twelve sacred glyphs that form the language of magic itself."},
    {key:'ponder', text:"The twelve glyphs are: ϟ Δ ∇ Ψ Ω ∞ ☽ ✸ ⊕ ⊗ θ Φ. Each element's ritual draws upon four of them."},
    {key:'sylvara',text:"Fire uses ϟ Δ ⊕ Ω, Lightning uses Ψ ∇ ⊗ ✸, Ice uses θ Φ ☽ ∞, Physical uses Δ ∇ Ψ ⊕, and Dark uses ☽ ⊗ ∇ Ω. The symbols have meaning — they are not random."},
    {key:'ponder', text:"Arcane is special — it shares a glyph with the other elements, because Arcane is the force beneath all magic. That makes it the hardest set to memorise!"},
    {key:'sylvara',text:"Dispel also draws one glyph from each element: ∞, ⊕, ∇ and θ. A universal unbinding built from universal symbols."},
  ],
  watching:[
    {key:'ponder', text:"Every spell needs a casting ritual. You get five seconds to watch the glyphs appear, then five seconds to tap them back in the same order."},
    {key:'sylvara',text:"Ignore the faint noise glyphs. Your sequence glows brightly, with a small number showing its order."},
    {key:'ponder', text:"The ring you chose sets the length: two glyphs on the inner ring, three on the middle, four on the outer. Bigger magic, harder ritual."},
    {key:'eldrad', text:"Wards use a different ritual: match the pairs of tiles after studying them face-up. Get the ritual wrong and the spell fizzles, costing you a little mana."},
    {key:'sylvara',text:"Your rival can't see your ritual — only the spell you chose, when the cards are revealed."},
  ],
  difficulty:[
    {key:'ponder',text:"Difficulty changes how the rituals behave. On Easy, each element always uses the same glyphs in the same order, so you can learn them by heart."},
    {key:'ponder',text:"On Easy and Normal, glyphs that don't belong to the spell are greyed out on the keyboard. On Normal the order is random every cast."},
    {key:'ponder',text:"On Hard, all twelve glyphs are active and a single wrong tap breaks the ritual. You are relying entirely on memory and focus. Good luck!"},
  ],
  eldrad:[
    {key:'eldrad',text:"I am Eldrin — the Stalwart. My wards cost less than anyone else's. Endurance is my philosophy: I make you spend, and spend, until you have nothing left."},
    {key:'eldrad',text:"My Shield takes the Arcane sector of my Protection wheel — a far larger ward than most wizards can raise."},
    {key:'eldrad',text:"Counter, in the Lightning sector, punishes anyone who strikes me for a few rounds. Ward, in the Ice sector, makes me immune to curses."},
    {key:'eldrad',text:"Dispels are my weakness. Keep a ward between your buffs and their unbinding, and I am very hard to wear down."},
  ],
  mal:[
    {key:'mal',text:"Pain is power. Empower, in the Fire sector of my Protection wheel, makes my next strike hit far harder. Cast it, then make them pay."},
    {key:'mal',text:"Blood Pact, in the Dark sector, costs no mana — only my blood. I trade health for mana instantly. Reckless? No. Efficient."},
    {key:'mal',text:"Drain is my Dark strike. It heals me for part of the damage that gets through. Empower it and I take their health to keep my own."},
    {key:'mal',text:"I have little HP, so I cannot trade hits carelessly. Strike first, strike hard, and never let up."},
  ],
  sylvara:[
    {key:'sylvara',text:"Hello! I'm Sylvara. I prefer patience and control over brute force — nature always wins in the end."},
    {key:'sylvara',text:"Regen, in the Physical sector of my Protection wheel, heals me a little every round for several rounds. It's a buff, so keep a ward up to stop it being dispelled."},
    {key:'sylvara',text:"Entangle sits on my Dispel wheel. It's a curse with a good chance to stop my rival choosing Damage next round — and like every curse, it wears at their ward too."},
    {key:'sylvara',text:"Vine Whip is my Physical strike. If it gets through, the vines keep hurting them for a few rounds afterwards."},
  ],
  aurelia:[
    {key:'aurelia',text:"I see three moves ahead. Foresight, in the Lightning sector of my Protection wheel, makes the next strike against me do nothing at all."},
    {key:'aurelia',text:"Time Drain is an Arcane curse on my Dispel wheel. My rival gains less mana each round for a while. Stolen resources compound."},
    {key:'aurelia',text:"Rewind takes my Arcane ward sector. It raises a ward and also gives back the HP I lost last round — the past undone, and the future guarded."},
    {key:'aurelia',text:"I have already foreseen how this duel ends. I need only wait for you to arrive at the conclusion I have prepared."},
  ],
  gnash:[
    {key:'gnash',text:"GNASH NOT WIZARD. Gnash warrior-mage! Gnash has lots of HP and very effective fists."},
    {key:'gnash',text:"War Paint, Physical sector of Protection wheel — Gnash takes less damage for a few rounds. Frenzy, Fire sector — Gnash hits much harder for two rounds, but it hurts Gnash too."},
    {key:'gnash',text:"Savage Charge is Gnash's Physical strike. Big smash, and it burns their mana. Magic tricks? HAH."},
    {key:'gnash',text:"Little mage thinks Gnash simple? Gnash simple but Gnash EFFECTIVE."},
  ],
  cinder:[
    {key:'cinder',text:"You thought the heat would break me? I am the heat. I hit hard and I hit fast."},
    {key:'cinder',text:"Fireball is my Fire strike — the damage is random. Sometimes barely a singe, sometimes the arena goes up. Never bet against fire."},
    {key:'cinder',text:"Flame Shield is my Fire ward. Anyone who strikes it gets burned. You want to throw punches at me? Go ahead."},
    {key:'cinder',text:"Candle is a Fire curse on my Dispel wheel. While it burns, my rival takes fire damage whenever they raise a ward. Suddenly the safe move isn't safe."},
  ],
  skadi:[
    {key:'skadi',text:"Patience. The cold does not rush. I let the fight come to me."},
    {key:'skadi',text:"Ice Lance is my Ice strike — strong enough to chill whoever it reaches, so they can't strike back next round."},
    {key:'skadi',text:"Frost Armor, in the Ice sector of my Protection wheel, cuts the damage I take and hurts anyone who strikes me."},
    {key:'skadi',text:"Blizzard is my Ice curse. Damage every round and a steady drain on their mana. By the end they have no mana and no hope."},
  ],
  zacharius:[
    {key:'zacharius',text:"I had already won before you cast your first spell. You simply hadn't realised it yet."},
    {key:'zacharius',text:"Galvanize, in the Lightning sector of my Protection wheel, charges my next Lightning strike with far more power."},
    {key:'zacharius',text:"Chain Lightning is my Lightning strike. It burns mana like all lightning, and it may arc for extra damage."},
    {key:'zacharius',text:"Conductivity is my Lightning curse — my rival takes extra damage from every strike for a few rounds. Then the mathematics are no longer in your favour."},
  ],
  mary:[
    {key:'mary',text:"I am a healer first, a combatant second. I endure and outlast through faith and restoration."},
    {key:'mary',text:"Heal, in the Arcane sector of my Protection wheel, restores HP at once."},
    {key:'mary',text:"Purge takes the Arcane sector of my Dispel wheel. It removes every curse on me and heals me a little. Hex me all you like."},
    {key:'mary',text:"Radiant is my Arcane strike. It burns my rival's mana as the light strikes them."},
  ],
  mordant:[
    {key:'mordant',text:"Do not think of me as aggressive. I am patient. Half my Dispel wheel is curses — and every one of them wears at your ward too."},
    {key:'mordant',text:"Agony is Dark: whenever you cast anything, you suffer. Silence is Arcane: your spells may simply fail."},
    {key:'mordant',text:"Corruption is Physical: the rot slows the mana you gain each round. Starve them, and watch their options narrow to nothing."},
    {key:'mordant',text:"Cleanse Self is the answer to me. Make them spend their rounds cleansing instead of striking. The hex is already written."},
  ],
  ponder:[
    {key:'ponder',text:"Hi! I'm Ponder — yes, the apprentice. My spells are all about misdirection and stealing mana."},
    {key:'ponder',text:"Vanish, in the Arcane sector of my Protection wheel, makes the next strike miss me entirely. Blink, in the Lightning sector, gives me a chance to dodge every strike for a few rounds, behind a light ward. Blink first, then Vanish: every strike I dodge leaves Vanish waiting for the next."},
    {key:'ponder',text:"Mana Siphon takes the Arcane sector of my Dispel wheel. It's quick: I steal mana as the round begins, before my rival pays for their spell — if they can't afford it any more, it fails!"},
    {key:'ponder',text:"By the time they catch me, I've drained their mana and they can't afford to finish the job. Surprise!"},
  ],
  durin:[
    {key:'durin',text:"I am Durin. I have more HP than anyone in the arena. When spells come, they barely scratch me."},
    {key:'durin',text:"Stoneskin is my Physical ward — a sturdy one. Stonesoul, in the Arcane sector, cuts all damage I take for a few rounds — and I'll never touch Lightning, so warding in Lightning against me is safe."},
    {key:'durin',text:"Rockfall is my Physical strike — a heavy one, with a long ritual."},
    {key:'durin',text:"I am slow. I am deliberate. And when I am ready... the mountain falls."},
  ],
  weizan:[
    {key:'weizan',text:"I am Weizan. I build up blades one by one, then release them all at once."},
    {key:'weizan',text:"Conjure Blade, in the Physical sector of my Protection wheel, summons a blade that strikes my rival every round. Up to three can orbit me."},
    {key:'weizan',text:"Bladestorm is my Physical strike. It launches every blade at once — the more I have, the harder it hits. Iron Patience, in the Arcane sector, cuts the damage I take while I build."},
    {key:'weizan',text:"My blades are buffs, so a Dispel can strip them. Keep a ward up while you build the storm."},
  ],
  gretch:[
    {key:'gretch',text:"Heh. Come closer. My kit is about poison and drain — I infect you, starve you, and keep myself alive while you rot."},
    {key:'gretch',text:"Plague is a Dark curse — damage every round for a while. Maggot Cloud is a Physical curse — it drains mana now and slows your mana for a couple of rounds."},
    {key:'gretch',text:"Bone Totem, in the Dark sector of my Protection wheel, heals me every round. Protect it with a ward or a Dispel will strip it."},
    {key:'gretch',text:"Not elegant. Not subtle. Just results. Plague them, drain them, totem up, and let time finish the job."},
  ],
  valdris:[
    {key:'valdris',text:"I am Valdris. The Deathless. While I have 8 mana or more, a killing blow takes 8 mana instead of ending me."},
    {key:'valdris',text:"Raise Dead, in the Dark sector of my Protection wheel, summons a skeleton that strikes every round. I can have two. If they are dispelled, their death heals me."},
    {key:'valdris',text:"Necrotic Drain is my Dark strike — it heals me for part of the damage dealt. Reinforce is my Physical ward, and it grows stronger for every skeleton at my side."},
    {key:'valdris',text:"Burn my mana and the Deathless can fall. Fail, and I will outlast you."},
  ],
  mirel:[
    {key:'mirel',text:"Nothing you see is real. I am Mirel. Simulacrum, in the Arcane sector of my Protection wheel, creates a copy of me that strikes my rival every round. I can have two."},
    {key:'mirel',text:"Bewitch is my Arcane curse. The next strike my rival makes rebounds onto themselves. Every attack becomes a gamble."},
    {key:'mirel',text:"Feint is my Arcane strike. It burns my rival's mana as it lands."},
    {key:'mirel',text:"My simulacra can be dispelled — that is the counterplay. So I keep a ward up, and let my copies do the work."},
  ],
  thessaly:[
    {key:'thessaly',text:"I don't fight you. I rearrange the battlefield until you can no longer fight me effectively."},
    {key:'thessaly',text:"Enthral is my Arcane curse — you can't raise Protection next round. Spellbind is my Dark curse — whatever category you used last costs more for a while."},
    {key:'thessaly',text:"Arcane Weave, in the Arcane sector of my Protection wheel, empowers my next few strikes and makes each one burn your mana."},
    {key:'thessaly',text:"By the time you understand what I've done, you've already run out of answers."},
  ],
  korvath:[
    {key:'korvath',text:"My ancestors bonded with dragons before your kingdom had a name. I am built to outlast you — and to end you, once, when it matters most."},
    {key:'korvath',text:"Dragon Scales, in the Fire sector of my Protection wheel, cuts the damage I take and burns anyone who strikes me."},
    {key:'korvath',text:"Wyrmfire Breath is my Fire strike — it leaves my rival burning for a couple of rounds."},
    {key:'korvath',text:"Ancient Wrath takes my Physical strike sector — an enormous blow I can only call on once per duel. Make it count."},
  ],
  fizzwick:[
    {key:'fizzwick',text:"Heh — a satchel full of things that probably shouldn't mix. Sometimes I'm not sure what they'll do until it's too late."},
    {key:'fizzwick',text:"Caustic Bomb is my Dark strike. If it gets through to them, the poison is in their blood — it seeps straight past any ward they raise after. Unstable Concoction is my Arcane strike — completely random damage. Could be a dud. Could end the fight."},
    {key:'fizzwick',text:"Volatile Tonic, in the Physical sector of my Protection wheel, either heals me or empowers my next strike. Either way, something good happens to me."},
    {key:'fizzwick',text:"Most duellists plan for consistency. I bring chaos in a bottle."},
  ],
  nyxara:[
    {key:'nyxara',text:"My magic doesn't care how strong you are — only how much of you is left."},
    {key:'nyxara',text:"Singularity is my Dark curse — a rift that collapses over three rounds, hurting more each time."},
    {key:'nyxara',text:"Gravity Well is my Dark strike, and Event Horizon is my Arcane strike. Both tear away a share of your current HP — the fuller you are, the more they take. Event Horizon hurts me too."},
    {key:'nyxara',text:"So don't stay healthy for long. Either way, I win."},
  ],
};

// Character select stats, from each spell's `el` block
function elemCharStats(cfg){
  const rows=[['❤ HP',String(cfg.hp)]];
  if(cfg.forbidden&&cfg.forbidden.length)
    rows.push(['⛔ Can\'t cast',cfg.forbidden.map(id=>{ const e=elemById(id); return e.icon+' '+e.name; }).join(', ')]);
  (cfg.spells||[]).filter(s=>s.el).forEach(s=>{
    const el=s.el, e=elemById(el.elem), cat=ELEM_CATS[el.cat];
    rows.push([(el.icon||s.icon)+' '+(el.name||s.name),cat.icon+' '+e.name+' · '+el.desc]);
  });
  return rows;
}


let activeTutTopic='welcome';

function buildTutorialUI(){
  const topicBar=document.getElementById('tut-topic-bar');
  topicBar.innerHTML='';
  TUTORIAL_TOPICS.forEach(t=>{
    const btn=document.createElement('button');
    btn.className='tut-topic-btn'+(t.id===activeTutTopic?' active':'');
    btn.textContent=t.label;
    btn.dataset.topic=t.id;
    btn.addEventListener('click',()=>setTutTopic(t.id));
    topicBar.appendChild(btn);
  });

  const charBar=document.getElementById('tut-char-bar');
  charBar.innerHTML='';
  CHAR_KEYS_TUT.forEach(key=>{
    const btn=document.createElement('button');
    btn.className='tut-char-btn'+(key===activeTutTopic?' active':'');
    btn.dataset.topic=key;
    const col=CHAR_COLORS_TUT[key];
    const name=CHAR_NAMES_TUT[key];
    const img=document.createElement('img');
    img.src='portraits/'+key+'.png';
    img.alt=name;
    img.style.borderColor=key===activeTutTopic?col:'rgba(201,168,76,0.3)';
    const lbl=document.createElement('span');
    lbl.className='tut-char-name';
    lbl.style.color=col;
    lbl.textContent=name;
    btn.appendChild(img);
    btn.appendChild(lbl);
    btn.addEventListener('click',()=>setTutTopic(key));
    charBar.appendChild(btn);
  });

  renderTutConvo();
}

function setTutTopic(id){
  activeTutTopic=id;
  document.querySelectorAll('.tut-topic-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.topic===id);
  });
  document.querySelectorAll('.tut-char-btn').forEach(btn=>{
    const isActive=btn.dataset.topic===id;
    btn.classList.toggle('active',isActive);
    const img=btn.querySelector('img');
    if(img) img.style.borderColor=isActive?CHAR_COLORS_TUT[id]:'rgba(201,168,76,0.3)';
  });
  renderTutConvo();
}

function renderTutConvo(){
  const convo=document.getElementById('tut-convo');
  const msgs=TUTORIAL_CONVOS[activeTutTopic]||[];
  convo.innerHTML='';
  msgs.forEach((msg,i)=>{
    const col=CHAR_COLORS_TUT[msg.key]||'#f0cc6a';
    const name=CHAR_NAMES_TUT[msg.key]||msg.key;
    const div=document.createElement('div');
    div.className='tut-msg';
    div.style.animationDelay=(i*0.06)+'s';
    const portrait=document.createElement('img');
    portrait.className='tut-msg-portrait';
    portrait.src='portraits/'+msg.key+'.png';
    portrait.alt=name;
    portrait.style.borderColor=col;
    const bubble=document.createElement('div');
    bubble.className='tut-bubble';
    const speaker=document.createElement('div');
    speaker.className='tut-speaker';
    speaker.style.color=col;
    speaker.textContent=name;
    const text=document.createElement('div');
    text.className='tut-text';
    text.textContent=msg.text;
    bubble.appendChild(speaker);
    bubble.appendChild(text);
    div.appendChild(portrait);
    div.appendChild(bubble);
    convo.appendChild(div);
  });
  convo.scrollTop=0;
}

window.addEventListener('DOMContentLoaded', ()=>{
  // Wire up all buttons immediately — independent of the fetch below
  // Phase Shift needs no ritual: it's a bet on being targeted, committed straight away
  document.getElementById('bel-phase').addEventListener('click',e=>{
    const who=gs.turnPlayer;
    if(e.currentTarget.classList.contains('off')||!gs.myTurn||gs.busy) return;
    gs.busy=true;
    commitPick(who,{type:'el',cat:'phase',ok:true,target:who});
  });
  // Meditate is a plain choice too: no ritual, no target
  document.getElementById('bel-meditate').addEventListener('click',e=>{
    const who=gs.turnPlayer;
    if(e.currentTarget.classList.contains('off')||!gs.myTurn||gs.busy) return;
    gs.busy=true;
    commitPick(who,{type:'el',cat:'meditate',ok:true});
  });
  document.querySelectorAll('.abtn-elem').forEach(btn=>{
    btn.addEventListener('click',()=>openElemWheel(btn.dataset.cat));
  });
  document.getElementById('wheel-svg').addEventListener('click',onWheelTap);
  document.getElementById('wheel-cancel').addEventListener('click',closeElemWheel);
  document.getElementById('wheel-self').addEventListener('click',()=>{
    closeElemWheel();
    castElemental('dispel','arcane',1,true);
  });
  document.querySelectorAll('.diff-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      diffName=GAME_OPTIONS.diff=btn.dataset.diff;
      if(diffName==='normal'||diffName==='hard'){
        aiDifficulty=GAME_OPTIONS.ai='normal';
        document.querySelectorAll('.ai-btn').forEach(b=>{
          b.classList.toggle('active', b.dataset.ai==='normal');
        });
        const hint=document.getElementById('training-ai-hint');
        if(hint&&trainingAI) hint.textContent='Opponent plays smart combos';
      }
      saveOptions();
    });
  });
  document.querySelectorAll('.ai-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.ai-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      aiDifficulty=GAME_OPTIONS.ai=btn.dataset.ai;
      const hint=document.getElementById('training-ai-hint');
      if(hint&&trainingAI) hint.textContent=aiDifficulty==='normal'?'Opponent plays smart combos':'Opponent plays normally';
      saveOptions();
    });
  });
  // Show the saved choices
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.toggle('active',b.dataset.diff===diffName));
  document.querySelectorAll('.ai-btn').forEach(b=>b.classList.toggle('active',b.dataset.ai===aiDifficulty));

  const duelOverlay=document.getElementById('duel-overlay');
  document.getElementById('btn-duel').addEventListener('click',()=>{
    duelOverlay.style.display='flex';
  });
  document.getElementById('btn-duel-back').addEventListener('click',()=>{
    duelOverlay.style.display='none';
  });
  document.getElementById('btn-duel-arcade').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    trainingMode=false; twoPlayerMode=false; twoPlayerPhase=1;
    document.getElementById('char-player-label').style.display='none';
    showScreen('char-screen');
  });
  const optOv=document.getElementById('options-overlay');
  const renderOptions=()=>{
    optOv.querySelectorAll('[data-long]').forEach(b=>b.classList.toggle('on',b.dataset.long===GAME_OPTIONS.longDuels));
    optOv.querySelectorAll('[data-limit]').forEach(b=>b.classList.toggle('on',+b.dataset.limit===GAME_OPTIONS.roundLimit));
    document.getElementById('op-limit-group').style.display=GAME_OPTIONS.longDuels==='draw'?'':'none';
    document.getElementById('op-long-help').textContent=GAME_OPTIONS.longDuels==='draw'
      ?'A duel still going after round '+GAME_OPTIONS.roundLimit+' ends in a draw.'
      :'From round '+SUDDEN_DEATH.round.duel+' (round '+SUDDEN_DEATH.round.multi+' with 3–4 wizards) every round hits harder and brings more mana, until someone falls.';
  };
  document.getElementById('btn-options').addEventListener('click',()=>{ renderOptions(); optOv.classList.add('show'); });
  document.getElementById('btn-options-done').addEventListener('click',()=>optOv.classList.remove('show'));
  optOv.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b) return;
    if(b.dataset.long) GAME_OPTIONS.longDuels=b.dataset.long;
    else if(b.dataset.limit) GAME_OPTIONS.roundLimit=+b.dataset.limit;
    else return;
    saveOptions(); renderOptions();
  });
  document.getElementById('btn-duel-multi').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    renderMultiSetup();
    document.getElementById('multi-overlay').classList.add('show');
  });
  document.getElementById('multi-overlay').addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b||b.disabled) return;
    if(b.dataset.n) multiSetup.n=+b.dataset.n;
    else if(b.dataset.format) multiSetup.format=b.dataset.format;
    else if(b.dataset.seat) multiSetup.human[+b.dataset.seat]=b.dataset.human==='1';
    else return;
    renderMultiSetup();
  });
  document.getElementById('btn-multi-back').addEventListener('click',()=>{
    document.getElementById('multi-overlay').classList.remove('show');
    duelOverlay.style.display='flex';
  });
  document.getElementById('btn-multi-go').addEventListener('click',()=>{
    document.getElementById('multi-overlay').classList.remove('show');
    trainingMode=false; twoPlayerMode=false; multiMode=true; multiPicks=[];
    labelMultiPick();
    showScreen('char-screen');
  });
  document.getElementById('btn-duel-2player').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    trainingMode=false; twoPlayerMode=true; twoPlayerPhase=1;
    const lbl=document.getElementById('char-player-label');
    lbl.textContent='Player 1: Choose Your Wizard';
    lbl.style.display='';
    showScreen('char-screen');
  });

  document.getElementById('btn-practice').addEventListener('click',()=>{
    trainingMode=true; trainingAI=true; trainingPickPhase=null;
    twoPlayerMode=false;
    // Initialise with defaults (updated once CHAR_DEFS loads)
    if(CHAR_DEFS[p1Key]){
      document.getElementById('tp-p1-portrait').src='portraits/'+p1Key+'.png';
      document.getElementById('tp-p1-name').textContent=CHAR_DEFS[p1Key].name;
    }
    if(CHAR_DEFS[p2Key]){
      document.getElementById('tp-p2-portrait').src='portraits/'+p2Key+'.png';
      document.getElementById('tp-p2-name').textContent=CHAR_DEFS[p2Key].name;
    }
    document.getElementById('tai-on').classList.add('active');
    document.getElementById('tai-off').classList.remove('active');
    document.getElementById('training-ai-hint').textContent=aiDifficulty==='normal'?'Opponent plays smart combos':'Opponent plays normally';
    showScreen('training-screen');
  });
  document.getElementById('btn-training-back').addEventListener('click',()=>{
    trainingMode=false; trainingPickPhase=null;
    showScreen('title-screen');
  });
  document.getElementById('tp-change-p1').addEventListener('click',()=>{
    trainingPickPhase='p1';
    const lbl=document.getElementById('char-player-label');
    lbl.textContent='Choose Your Wizard';
    lbl.style.display='';
    showScreen('char-screen');
  });
  document.getElementById('tp-change-p2').addEventListener('click',()=>{
    trainingPickPhase='p2';
    const lbl=document.getElementById('char-player-label');
    lbl.textContent='Choose Your Opponent';
    lbl.style.display='';
    showScreen('char-screen');
  });
  document.getElementById('tai-on').addEventListener('click',()=>{
    trainingAI=true;
    document.getElementById('tai-on').classList.add('active');
    document.getElementById('tai-off').classList.remove('active');
    document.getElementById('training-ai-hint').textContent=aiDifficulty==='normal'?'Opponent plays smart combos':'Opponent plays normally';
  });
  document.getElementById('tai-off').addEventListener('click',()=>{
    trainingAI=false;
    document.getElementById('tai-on').classList.remove('active');
    document.getElementById('tai-off').classList.add('active');
    document.getElementById('training-ai-hint').textContent='Opponent only waits';
  });
  document.getElementById('btn-begin-training').addEventListener('click',()=>{
    if(!CHAR_DEFS[p1Key]||!CHAR_DEFS[p2Key]) return;
    p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key];
    startTrainingBattle();
  });
  function exitTrainingToMenu(){
    if(aiTid){ clearTimeout(aiTid); aiTid=null; }
    if(mazeRAF){ cancelAnimationFrame(mazeRAF); mazeRAF=null; }
    if(mazeTid){ clearInterval(mazeTid); mazeTid=null; }
    battleRunning=false; gameEnded=false; trainingMode=false;
    document.getElementById('btn-training-menu').style.display='none';
    showScreen('title-screen');
  }
  document.getElementById('btn-training-menu').addEventListener('click', exitTrainingToMenu);
  document.getElementById('btn-pz-exit').addEventListener('click', exitTrainingToMenu);
  document.getElementById('btn-back').addEventListener('click',()=>{
    if(multiMode){
      if(multiPicks.length){ multiPicks.pop(); labelMultiPick(); return; }
      multiMode=false;
      document.getElementById('char-player-label').style.display='none';
      showScreen('title-screen');
      document.getElementById('multi-overlay').classList.add('show');
      return;
    }
    if(trainingMode){
      trainingPickPhase=null;
      document.getElementById('char-player-label').style.display='none';
      showScreen('training-screen');
    } else if(twoPlayerMode&&twoPlayerPhase===2){
      twoPlayerPhase=1;
      const lbl=document.getElementById('char-player-label');
      lbl.textContent='Player 1: Choose Your Wizard';
    } else {
      twoPlayerMode=false; twoPlayerPhase=1;
      document.getElementById('char-player-label').style.display='none';
      showScreen('title-screen');
    }
  });

  document.getElementById('pick-eldrad').addEventListener('click',()=>showWizardDetail('eldrad'));
  document.getElementById('pick-mal').addEventListener('click',()=>showWizardDetail('mal'));
  document.getElementById('pick-sylvara').addEventListener('click',()=>showWizardDetail('sylvara'));
  document.getElementById('pick-aurelia').addEventListener('click',()=>showWizardDetail('aurelia'));
  document.getElementById('pick-gnash').addEventListener('click',()=>showWizardDetail('gnash'));
  document.getElementById('pick-skadi').addEventListener('click',()=>showWizardDetail('skadi'));
  document.getElementById('pick-cinder').addEventListener('click',()=>showWizardDetail('cinder'));
  document.getElementById('pick-zacharius').addEventListener('click',()=>showWizardDetail('zacharius'));
  document.getElementById('pick-mary').addEventListener('click',()=>showWizardDetail('mary'));
  document.getElementById('pick-mordant').addEventListener('click',()=>showWizardDetail('mordant'));
  document.getElementById('pick-ponder').addEventListener('click',()=>showWizardDetail('ponder'));
  document.getElementById('pick-durin').addEventListener('click',()=>showWizardDetail('durin'));
  document.getElementById('pick-weizan').addEventListener('click',()=>showWizardDetail('weizan'));
  document.getElementById('pick-gretch').addEventListener('click',()=>showWizardDetail('gretch'));
  document.getElementById('pick-valdris').addEventListener('click',()=>showWizardDetail('valdris'));
  document.getElementById('pick-mirel').addEventListener('click',()=>showWizardDetail('mirel'));
  document.getElementById('pick-thessaly').addEventListener('click',()=>showWizardDetail('thessaly'));
  document.getElementById('pick-korvath').addEventListener('click',()=>showWizardDetail('korvath'));
  document.getElementById('pick-fizzwick').addEventListener('click',()=>showWizardDetail('fizzwick'));
  document.getElementById('pick-nyxara').addEventListener('click',()=>showWizardDetail('nyxara'));

  document.getElementById('wd-back').addEventListener('click',()=>{
    document.getElementById('wizard-detail').classList.remove('active');
  });
  document.getElementById('wd-choose').addEventListener('click',()=>{
    const key=document.getElementById('wd-choose').dataset.key;
    document.getElementById('wizard-detail').classList.remove('active');
    pickCharacter(key);
  });

  document.getElementById('btn-tutorial').addEventListener('click',()=>{
    document.getElementById('tutorial-modal').classList.add('active');
    buildTutorialUI();
  });
  document.getElementById('btn-closetutorial').addEventListener('click',()=>{
    document.getElementById('tutorial-modal').classList.remove('active');
  });

  document.getElementById('btn-continue').addEventListener('click',()=>{
    document.getElementById('overlay').classList.remove('active');
    if(multiMode){ battleRunning=false; gameEnded=false; endMultiMode(); showScreen('title-screen'); return; }
    if(twoPlayerMode){
      const isMatchOver=p1MatchWins>=2||p2MatchWins>=2||matchRound>=3;
      if(isMatchOver){
        battleRunning=false; gameEnded=false;
        twoPlayerMode=false; twoPlayerPhase=1;
        document.getElementById('btn-continue').textContent='Continue';
        showScreen('title-screen');
      } else {
        startNextTwoPlayerRound();
      }
      return;
    }
    const advancing=document.getElementById('btn-continue').textContent.startsWith('Fight');
    if(advancing){
      tournamentIndex++;
      p2Key=tournamentQueue[tournamentIndex];
      p2Cfg=CHAR_DEFS[p2Key];
      showBracket(true);
    } else {
      battleRunning=false;
      document.getElementById('btn-continue').textContent='Continue';
      showScreen('title-screen');
    }
  });

  document.getElementById('bracket-btn').addEventListener('click',()=>{
    startNextBattle();
  });

  window.addEventListener('resize',()=>{ if(battleRunning) resizeBC(); });

  // Load character data — must complete before a character can be picked
  fetch('characters.json')
    .then(r=>r.json())
    .then(data=>{ CHAR_DEFS=data; p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key]; loadSprites(); })
    .catch(err=>console.error('Failed to load characters.json:', err));
});
