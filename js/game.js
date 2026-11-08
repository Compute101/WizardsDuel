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
let p1Key='eldrin', p2Key='mal';
let p1Cfg, p2Cfg;

// One-line pitch on the character detail screen (stats come from characters.json)
const CHAR_FLAVOUR={
  eldrin:'Outlast your foe with arcane endurance.',
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
  valdris:'His skeletons stand in front of his ward and soak your damage, and dispels can\'t touch them, so batter through with strikes. Cleanse Soul Tithe first, or each skeleton you kill costs you mana.',
  mirel:'Simulacra strike every round until dispelled. Bewitch turns the next strike against its caster.',
  thessaly:'Enthral calls their next move — guess right and it is lost, its mana yours. Spellbind taxes their favourite move — strike her over and over, and it is your strikes that cost more. Weave wards her, then turns strikes into mana denial.',
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
    effects:[], usedSig:{}, lastElem:null, catCounts:{}, lastLockedRound:null, lastRoundLoss:0,
    blades:0, skeletons:[], simulacra:[]};   // minion counts mirrored for drawWiz
}
function newState(){
  gs={
    round:1, myTurn:true, busy:false,
    p1anim:'idle', p2anim:'idle', p1xOff:0, p2xOff:0,
    parts:[], floats:[], projs:[], beams:[], manaBurnFires:[], shadowCircles:[], darkRituals:[], wardUnravels:[], siphons:[], fireballs:[], explosions:[], iceCrystals:[], iceShards:[], boulders:[], storms:[], quake:null,
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
      '<div class="bracket-slot bslot-player"><img src="portraits/small/'+p1Key+'.jpg" alt="'+p1Cfg.name+'"></div>'+
      '<div class="bracket-cross">⚔</div>'+
      '<div class="bracket-slot bslot-opp" id="bopp-'+i+'">'+
        '<img src="portraits/small/'+oppKey+'.jpg" alt="'+oppCfg.name+'">'+
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
  ({eldrin:drawBG_moonlight,mal:drawBG_hellfire,sylvara:drawBG_forest,
    aurelia:drawBG_dawn,gnash:drawBG_storm,ponder:drawBG_astral,
    skadi:drawBG_winter,cinder:drawBG_embers,zacharius:drawBG_arc,mary:drawBG_holy,mordant:drawBG_abyss,
    durin:drawBG_stone}[p2Key]||drawBG_moonlight)();
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// sy < 1 flattens the ring onto the floor (seen in perspective)
function runeRing(cx,cy,r,c,sy=1){
  bx.save(); bx.translate(cx,cy); bx.scale(1,sy); bx.translate(-cx,-cy);
  bx.strokeStyle=c; bx.lineWidth=1;
  bx.beginPath(); bx.arc(cx,cy,r,0,Math.PI*2); bx.stroke();
  bx.beginPath(); bx.arc(cx,cy,r*.6,0,Math.PI*2); bx.stroke();
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;
    bx.beginPath(); bx.moveTo(cx+Math.cos(a)*r*.6,cy+Math.sin(a)*r*.6);
    bx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); bx.stroke();
  }
  bx.restore();
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
const SPRITE_SCALE=1.2;   // battle sprite height relative to drawWiz's sz
// A character's optional "spriteHeight" in characters.json shrinks its battle sprite (e.g. Durin
// is a dwarf, so 0.72 of a man's height). Feet stay on the floor; only the drawn figure changes.
function seatSpriteHeight(who){ const c=who&&seatCfg(who); return (c&&c.spriteHeight)||1; }
// Optional "spriteWidth": stretches the battle sprite sideways (Durin is a stocky dwarf: 1.2).
function seatSpriteWidth(who){ const c=who&&seatCfg(who); return (c&&c.spriteWidth)||1; }
// Where the wizards stand and how big they are, in scene coordinates. Feet sit low on the arena
// floor so the (large) wizards use the ground below the horizon. WIZ_GROW enlarges them over the
// original size; minions keep the original layout (see drawWiz). 3–4 seats grow less so neighbours
// don't overlap.
const WIZ_GROW=1.5, WIZ_GROW_MANY=1.25;
const AURA_SX=.7, AURA_SY=.9;   // drawWiz squashes its round auras into an oval around the sprite
function wizGrow(){ return PLAYERS.length>2?WIZ_GROW_MANY:WIZ_GROW; }
function wizFeetY(){ return bH*(PLAYERS.length>2?.88:.92); }
// wizSize(at) / wizMidY(at): pass a seat ('p1'…) or an x position (the nearest seat) to get that
// wizard's own size, which includes its spriteHeight (Durin the dwarf is short). With no argument
// they give the standard full-height wizard.
function wizSize(at){
  const base=Math.min(bH*.4,bW*.28)*(PLAYERS.length>2?.68:1)*wizGrow();
  return at==null?base:base*seatSpriteHeight(seatOf(at));
}
function seatOf(at){
  if(typeof at!=='number') return at;
  let best=null,bd=Infinity;
  PLAYERS.forEach(w=>{ const d=Math.abs(seatX(w)-at); if(d<bd){ bd=d; best=w; } });
  return best;
}
// Upper body: where strikes land and effects play on a wizard
function wizMidY(at){ return wizFeetY()-wizSize(at)*.8; }
// Two sprite kinds: the old 4x5 spritesheets above (facing left), or a single
// full-body still of any other size (facing right, animated by drawWiz's bob/lift/shake).
function isSpriteSheet(img){
  return img.naturalWidth===SPRITE_CFG.frameW*4&&img.naturalHeight===SPRITE_CFG.frameH*5;
}
// Draws a sprite standing at (x,y), sz tall. flip = the p1 seat (face right).
function drawSprite(img,animName,frame,x,y,sz,flip,wMul=1){
  bx.save();
  if(isSpriteSheet(img)){
    const cfg=SPRITE_CFG;
    const row=cfg.animRows[animName]??cfg.animRows.idle;
    const srcX=frame*cfg.frameW, srcY=row*cfg.frameH;
    const scale=sz/cfg.frameH, dw=cfg.frameW*scale*wMul, dh=cfg.frameH*scale;
    if(flip){ bx.scale(-1,1); x=-x; }
    bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,x-dw/2,y-dh,dw,dh);
  } else {
    const dh=sz*1.04, dw=dh*img.naturalWidth/img.naturalHeight*wMul;
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
// Skeleton summons (Valdris's Raise Dead): one still per cast strength — inner / middle / outer ring.
// Same format as the full-body character stills: any size, facing right, feet at the bottom edge.
// A missing file just keeps the plain circle for that tier.
const SKELETON_SPRITES=['sprites/skeleton1.png','sprites/skeleton2.png','sprites/skeleton3.png'];
const SKELETON_HEIGHT=[0.50,0.68,0.74];   // fraction of the master's drawn height, by tier (the ragged one hunches lower)
// Where each skeleton stands, in fill order: [distance toward the foe, height offset (negative =
// back row, further up the floor), scale], in units of the master's drawn height
const SKELETON_SLOTS=[[0.39,0,1],[0.14,0,1],[0.64,0,1],[0.26,-.06,.88],[0.52,-.06,.88]];
const skeletonImgs=SKELETON_SPRITES.map(src=>{
  const rec={img:new Image(),ready:false};
  rec.img.onload=()=>{ rec.ready=true; };
  rec.img.src=src;
  return rec;
});
function skeletonSprite(tier){
  const rec=skeletonImgs[Math.min(3,Math.max(1,tier||2))-1];
  return rec&&rec.ready?rec.img:null;
}
// Each seat's rune circle on the arena floor
function seatRunes(){
  if(PLAYERS.length<=2||!gs[PLAYERS[0]]){
    const fy=bH*.92, r=Math.min(bW*.13,bH*.2);   // flat on the floor under the wizards' feet (wizFeetY)
    runeRing(bW*.25,fy,r,`rgba(${hexToRgb(p1Cfg.col)},0.16)`,.3);
    if(p2Cfg) runeRing(bW*.75,fy,r,`rgba(${hexToRgb(p2Cfg.col)},0.16)`,.3);
    return;
  }
  PLAYERS.forEach(w=>runeRing(seatX(w),wizFeetY(),bW*.08,`rgba(${hexToRgb(seatCfg(w).col)},0.16)`,.3));
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

// When each aura first appeared, per wizard, so new wards and buffs fade in instead of popping
const auraSince={}, AURA_FADE_MS=700;
function auraFade(who,key,on){
  const m=auraSince[who]||(auraSince[who]={});
  if(!on){ delete m[key]; return 0; }
  if(m[key]==null) m[key]=Date.now();
  const k=Math.min(1,(Date.now()-m[key])/AURA_FADE_MS);
  return k*k*(3-2*k);
}

// ── WARD ORBITERS ──────────────────────────────────────────
// A ward's elemental "electrons": one object per 10 ward HP left (rounded up, max 9) orbits the
// wizard on three tilted rings like an atom. Slots are fixed (ring = i%3, place on ring = i/3),
// so losing HP removes the last orbiter without the others jumping. Objects on the far side of
// a ring are drawn behind the sprite ('back' layer), the near side in front ('front' layer).
const WARD_ORBIT_MAX=9, WARD_ORBIT_TILTS=[0,-1.05,1.05];
const WARD_ORBIT_SPEED={physical:1/1500, ice:1/1150, dark:1/1300, fire:1/1000, lightning:1/330, arcane:1/1250};
const DARK_ORBIT_RUNES=['☽','⊗','∇','Ω'];
// Cheap deterministic noise (keeps the replay RNG untouched)
function orbNoise(n){ const s=Math.sin(n*12.9898)*43758.5453; return s-Math.floor(s); }
function wardOrbitCount(hp){ return hp>0?Math.min(WARD_ORBIT_MAX,Math.ceil(hp/10)):0; }
// Point on ring `ring` at angle th around (cx,cy). z>0 = near side.
function orbitPt(cx,cy,sz,ring,th){
  const A=sz*.8, B=A*.3, px=Math.cos(th)*A, py=Math.sin(th)*B, tl=WARD_ORBIT_TILTS[ring];
  const c=Math.cos(tl), s=Math.sin(tl);
  return {x:cx+(px*c-py*s)*.85, y:cy+(px*s+py*c)*1.05, z:Math.sin(th)};
}
function drawWardOrbiters(x,cy,sz,state,layer,fade,t){
  const elem=state&&state.wardElem, n=wardOrbitCount(state&&state.wardHp);
  if(!elem||!n||fade<=0) return;
  const speed=WARD_ORBIT_SPEED[elem]||1/1300, front=layer==='front';
  bx.save();
  // Lightning: the faint "wires" the sparks run along, split into near and far halves
  if(elem==='lightning'){
    bx.lineWidth=1; bx.strokeStyle=`rgba(255,238,68,${0.16*fade})`;
    for(let ring=0;ring<Math.min(3,n);ring++){
      bx.beginPath();
      const th0=front?0:Math.PI;
      for(let k=0;k<=24;k++){
        const p=orbitPt(x,cy,sz,ring,th0+k/24*Math.PI);
        k?bx.lineTo(p.x,p.y):bx.moveTo(p.x,p.y);
      }
      bx.stroke();
    }
  }
  for(let i=0;i<n;i++){
    const ring=i%3, slot=Math.floor(i/3);
    const dir=ring===1?-1:1;
    const th=dir*t*speed*(1+ring*.12)+slot*Math.PI*2/3+ring*.9;
    const p=orbitPt(x,cy,sz,ring,th);
    if((p.z>=0)!==front) continue;
    const depth=1+.2*p.z, a=fade*(.6+.4*(p.z+1)/2);
    // Direction of travel, for shapes that point or trail
    const q=orbitPt(x,cy,sz,ring,th+dir*.05), ang=Math.atan2(q.y-p.y,q.x-p.x);
    bx.globalAlpha=a;
    if(elem==='physical'){
      // Boulder: lumpy rock tumbling as it goes
      const r=sz*.09*depth;
      bx.save(); bx.translate(p.x,p.y); bx.rotate(t/700*dir+i*1.7);
      const g=bx.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r*1.1);
      g.addColorStop(0,'#c8a878'); g.addColorStop(.6,'#8b6b45'); g.addColorStop(1,'#4a3820');
      bx.fillStyle=g; bx.shadowColor='rgba(0,0,0,.5)'; bx.shadowBlur=4;
      bx.beginPath();
      for(let j=0;j<7;j++){
        const va=j/7*Math.PI*2, vr=r*(.72+.32*orbNoise(i*7+j));
        j?bx.lineTo(Math.cos(va)*vr,Math.sin(va)*vr):bx.moveTo(Math.cos(va)*vr,Math.sin(va)*vr);
      }
      bx.closePath(); bx.fill(); bx.shadowBlur=0;
      bx.strokeStyle='rgba(60,40,20,.6)'; bx.lineWidth=1;
      bx.beginPath(); bx.moveTo(-r*.3,-r*.1); bx.lineTo(r*.1,r*.2); bx.lineTo(r*.35,r*.05); bx.stroke();
      bx.restore();
    } else if(elem==='ice'){
      // Ice shard: a long crystal pointing the way it flies, glinting
      const L=sz*.14*depth, W=sz*.04*depth, glint=.5+.5*Math.sin(t/180+i*2.3);
      bx.save(); bx.translate(p.x,p.y); bx.rotate(ang);
      bx.shadowColor='#aaeeff'; bx.shadowBlur=8;
      bx.fillStyle='rgba(170,230,255,.85)';
      bx.beginPath(); bx.moveTo(L,0); bx.lineTo(L*.1,-W); bx.lineTo(-L*.7,0); bx.lineTo(L*.1,W); bx.closePath(); bx.fill();
      bx.shadowBlur=0;
      bx.strokeStyle=`rgba(255,255,255,${.5+.5*glint})`; bx.lineWidth=1;
      bx.beginPath(); bx.moveTo(L,0); bx.lineTo(-L*.7,0); bx.stroke();
      bx.restore();
    } else if(elem==='dark'){
      // Glowing runes from the Dark set, pulsing as they circle
      const pulse=.65+.35*Math.sin(t/260+i*1.9);
      bx.globalAlpha=a*pulse;
      bx.font=`bold ${Math.round(sz*.16*depth)}px serif`; bx.textAlign='center'; bx.textBaseline='middle';
      bx.shadowColor='#bb55ff'; bx.shadowBlur=12;
      bx.fillStyle='#e6c8ff'; bx.fillText(DARK_ORBIT_RUNES[i%4],p.x,p.y);
      bx.shadowBlur=0;
    } else if(elem==='fire'){
      // Flame: a flickering teardrop whose tip streams back along the orbit and up
      const fl=1+.25*Math.sin(t/55+i*3.1)+.15*Math.sin(t/31+i), r=sz*.055*depth;
      const back=ang+Math.PI, tipA=Math.atan2(Math.sin(back)*.6-.8,Math.cos(back)*.6);
      // Embers left in its wake
      for(let k=1;k<=3;k++){
        const e=orbitPt(x,cy,sz,ring,th-dir*k*.09);
        bx.globalAlpha=a*(.5-k*.13); bx.fillStyle=k%2?'#ffaa33':'#ff5500';
        bx.beginPath(); bx.arc(e.x+Math.sin(t/90+k+i)*1.5,e.y-k*1.5,r*(.45-k*.09),0,Math.PI*2); bx.fill();
      }
      bx.globalAlpha=a;
      bx.save(); bx.translate(p.x,p.y); bx.rotate(tipA+Math.PI/2);
      const h=r*2.6*fl, wob=Math.sin(t/70+i*2)*r*.25;
      bx.shadowColor='#ff4400'; bx.shadowBlur=10;
      bx.fillStyle='#ff5a10';
      bx.beginPath(); bx.moveTo(0,-h);
      bx.quadraticCurveTo(r*1.1+wob,-h*.3,r,0); bx.arc(0,0,r,0,Math.PI);
      bx.quadraticCurveTo(-r*1.1+wob,-h*.3,0,-h); bx.fill();
      bx.shadowBlur=0; bx.fillStyle='#ffd040';
      bx.beginPath(); bx.moveTo(0,-h*.55);
      bx.quadraticCurveTo(r*.55,-h*.15,r*.5,0); bx.arc(0,0,r*.5,0,Math.PI);
      bx.quadraticCurveTo(-r*.55,-h*.15,0,-h*.55); bx.fill();
      bx.restore();
    } else if(elem==='lightning'){
      // Spark zipping along its wire: bright head, fading trail, a crackle of tiny forks
      for(let k=8;k>=1;k--){
        const e=orbitPt(x,cy,sz,ring,th-dir*k*.05);
        bx.globalAlpha=a*(1-k/9)*.8; bx.fillStyle='#ffee44';
        bx.beginPath(); bx.arc(e.x,e.y,sz*.022*(1-k/10)*depth,0,Math.PI*2); bx.fill();
      }
      bx.globalAlpha=a; bx.shadowColor='#ffee44'; bx.shadowBlur=14;
      bx.fillStyle='#ffffff';
      bx.beginPath(); bx.arc(p.x,p.y,sz*.032*depth,0,Math.PI*2); bx.fill();
      const tick=Math.floor(t/45);
      bx.strokeStyle='#fff6aa'; bx.lineWidth=1.2;
      for(let f=0;f<2;f++){
        const seed=tick*31+i*7+f*13, fa=orbNoise(seed)*Math.PI*2, fr=sz*(.05+.05*orbNoise(seed+1));
        bx.beginPath(); bx.moveTo(p.x,p.y);
        bx.lineTo(p.x+Math.cos(fa+.5)*fr*.5,p.y+Math.sin(fa+.5)*fr*.5);
        bx.lineTo(p.x+Math.cos(fa)*fr,p.y+Math.sin(fa)*fr); bx.stroke();
      }
      bx.shadowBlur=0;
    } else if(elem==='arcane'){
      // Glowing blue sphere, pulsing
      const pulse=.8+.3*Math.sin(t/240+i*1.6), r=sz*.05*depth*pulse;
      const g=bx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.4);
      g.addColorStop(0,'rgba(220,240,255,1)'); g.addColorStop(.3,'rgba(90,160,255,.9)');
      g.addColorStop(.6,'rgba(50,100,255,.35)'); g.addColorStop(1,'rgba(40,80,255,0)');
      bx.fillStyle=g; bx.beginPath(); bx.arc(p.x,p.y,r*2.4,0,Math.PI*2); bx.fill();
    }
  }
  bx.restore();
}

function drawWiz(x,y,sz,col,flip,animName,shielded,wardActive,who,foresightActive,state){
  const x0=x;
  bx.save();
  // Auras (wards, buffs, debuffs) are drawn as circles around (x, y-sz*.5); squash them into an
  // upright oval centred on the sprite, so they hug the tall figure and stay on screen
  bx.save();
  bx.translate(x,y-sz*.62); bx.scale(AURA_SX,AURA_SY); bx.translate(-x,-(y-sz*.5));
  const t=Date.now();
  const fShield=auraFade(who,'shield',shielded>0), fWard=auraFade(who,'ward',wardActive>0),
    fSight=auraFade(who,'foresight',!!foresightActive), fCounter=auraFade(who,'counter',!!(state&&state.counter));
  if(foresightActive){
    bx.globalAlpha=fSight;
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
    bx.globalAlpha=1;
  }
  if(shielded>0){
    const boosted=state&&state.counter, wc=hexToRgb((state&&state.wardCol)||'#4af0ff');
    const gv=0.08+0.05*Math.sin(t/300);
    bx.globalAlpha=fShield;
    bx.beginPath(); bx.arc(x,y-sz*.5,sz*(.6+.15*fShield),0,Math.PI*2);
    if(boosted){
      // Gold-cyan blend fill with higher opacity when counter is active
      bx.fillStyle=`rgba(180,240,120,${gv*2.5})`; bx.fill();
      bx.shadowColor='#ffd700'; bx.shadowBlur=18;
      bx.strokeStyle=`rgba(255,215,0,${0.55+0.35*Math.sin(t/200)})`; bx.lineWidth=3; bx.stroke();
      bx.shadowBlur=0;
      // Second inner ring for depth
      bx.beginPath(); bx.arc(x,y-sz*.5,sz*.6,0,Math.PI*2);
      bx.strokeStyle=`rgba(${wc},${gv*4})`; bx.lineWidth=1.5; bx.stroke();
    } else {
      bx.fillStyle=`rgba(${wc},${gv*1.3})`; bx.fill();
      bx.shadowColor=`rgb(${wc})`; bx.shadowBlur=10;
      bx.strokeStyle=`rgba(${wc},${gv*6})`; bx.lineWidth=1.8; bx.stroke(); bx.shadowBlur=0;
    }
    bx.globalAlpha=1;
  }
  if(wardActive>0){
    const gv=0.06+0.04*Math.sin(t/280);
    bx.save();
    bx.translate(x,y-sz*.5);
    bx.rotate(t/1200);
    bx.globalAlpha=fWard; bx.scale(.8+.2*fWard,.8+.2*fWard);
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
      const a=rot+i/4*Math.PI*2, alpha=(0.65+0.30*Math.sin(t/220+i))*fCounter;
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
  if(state&&state.stoneskin>0&&state.stoneskinHp>0&&!state.wardElem){
    // Three chunky rock chunks (only without ward orbiters, which draw a boulder per 10 HP instead) orbiting in an ellipse
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
  // Arcane Weave: one Arcane rune (Ω ∞ Ψ θ) orbits per empowered strike left, joined by a faint
  // woven thread; each charge used drops a rune. Runes passing behind the wizard dim and shrink.
  if(state&&state.arcaneWeave>0){
    const n=Math.min(state.arcaneWeave,4), runes=['Ω','∞','Ψ','θ'];
    const rx=sz*.78, ry=sz*.2, cy=wy+sz*.12;
    bx.save();
    bx.strokeStyle=`rgba(210,160,255,${0.35+0.1*Math.sin(t/400)})`; bx.lineWidth=1.5;
    bx.setLineDash([sz*.04,sz*.05]); bx.lineDashOffset=-t/40;
    bx.beginPath(); bx.ellipse(x,cy,rx,ry,0,0,Math.PI*2); bx.stroke(); bx.setLineDash([]);
    bx.textAlign='center'; bx.textBaseline='middle';
    for(let i=0;i<n;i++){
      const a=t/1100+i/n*Math.PI*2, depth=(Math.sin(a)+1)/2;   // 0 = behind, 1 = in front
      const gx=x+Math.cos(a)*rx, gy=cy+Math.sin(a)*ry;
      bx.globalAlpha=(0.5+0.5*depth)*(0.85+0.15*Math.sin(t/260+i*1.7));
      bx.font=`bold ${Math.round(sz*(.15+.07*depth))}px serif`;
      bx.shadowColor="#bb66ff"; bx.shadowBlur=14;
      bx.fillStyle='#ffe9a8'; bx.fillText(runes[i],gx,gy);
    }
    bx.restore();
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
  // Dread: a dark shadow pooling and pulsing around the wizard
  if(state&&state.dread){
    bx.globalAlpha=0.14+0.08*Math.sin(t/240); bx.fillStyle='#3a0a5a';
    bx.beginPath(); bx.arc(x,wy,sz*.66,0,Math.PI*2); bx.fill(); bx.globalAlpha=1;
    bx.strokeStyle=`rgba(150,60,210,${0.35+0.2*Math.sin(t/320)})`; bx.lineWidth=1.5;
    bx.shadowColor='#6a1aa0'; bx.shadowBlur=8;
    bx.beginPath(); bx.arc(x,wy,sz*.66,0,Math.PI*2); bx.stroke(); bx.shadowBlur=0;
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
  bx.restore();   // end of the aura oval
  // Ward orbiters on the far side, behind the sprite
  if(shielded>0) drawWardOrbiters(x,y-sz*.62,sz,state,'back',fShield,t);
  // Minions keep the original (pre-WIZ_GROW) size and spacing, standing on the same floor
  const minionDir=flip?1:-1, msz=sz/seatSpriteHeight(who)/wizGrow(), mwy=y-msz*.5;
  // Simulacra (Mirel): ghostly wizard clones, same sprite/animation as the caster
  if(state&&state.simulacra&&state.simulacra.length>0){
    const simSz=msz*.62;
    state.simulacra.forEach((sim,i)=>{
      const sx=x+minionDir*(i===0?msz*1.5:msz*2.6);
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
        bx.beginPath(); bx.arc(sx,mwy,msz*.22,0,Math.PI*2); bx.fill();
        bx.font=`${Math.round(msz*.16)}px serif`;
        bx.textAlign='center'; bx.fillText('👤',sx,mwy+msz*.07);
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
    // Drawn a bit taller than sz: the auras around it (radius ~0.82×sz) still enclose it
    drawSprite(img,animName,animState[who].frame,x,y+lift+shake+bob,sz*SPRITE_SCALE,flip,seatSpriteWidth(who));
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
  // Ward orbiters on the near side, in front of the sprite (x0: the fallback figure flips x)
  if(shielded>0) drawWardOrbiters(x0,y-sz*.62,sz,state,'front',fShield,t);
  // Skeletons stand in front of their master and his ward, so they're drawn last
  if(state&&state.skeletons&&state.skeletons.length) drawSkeletons(x,y,sz,who,flip,state.skeletons,t);
}
// Skeletons (Valdris): one sprite per summon strength (see SKELETON_SPRITES), or a bone-coloured
// circle if that art is missing. Up to five stand guard on the foe's side of their master
// (SKELETON_SLOTS), back row first so the front row overlaps it, with the tallest in the back row. Sized from the master's drawn
// height, so they shrink with him on small screens and in 3–4 seat duels.
function drawSkeletons(x,y,sz,who,flip,skels,t){
  const dir=flip?1:-1, hsz=sz*SPRITE_SCALE/seatSpriteHeight(who);
  // Back-row slots (drawn first) go to the tallest skeletons, so the short ones in front never hide them
  const slots=SKELETON_SLOTS.slice(0,skels.length).slice().sort((a,b)=>a[1]-b[1]);
  const order=skels.map((k,i)=>i).sort((a,b)=>(skels[b].tier||2)-(skels[a].tier||2));
  slots.forEach((s,j)=>{
    const i=order[j], skel=skels[i], [dx,dy,sc]=s;
    const sx=x+dir*hsz*dx, fy=y+dy*hsz, h=hsz*SKELETON_HEIGHT[(skel.tier||2)-1]*sc;
    const img=skeletonSprite(skel.tier);
    if(img){
      // Stands on the floor and faces the same way as its master; stronger summons stand taller
      const bob=Math.sin(t/450+i*1.7)*hsz*.004;
      bx.save(); bx.globalAlpha=0.97;
      drawSprite(img,'idle',0,sx,fy+bob,h,flip);
      bx.restore();
      return;
    }
    const r=h*.22, cy=fy-r;
    bx.globalAlpha=0.85; bx.fillStyle='#ccccbb'; bx.shadowColor='#aaaaaa'; bx.shadowBlur=4;
    bx.beginPath(); bx.arc(sx,cy,r,0,Math.PI*2); bx.fill();
    bx.fillStyle='#333'; bx.font=`${Math.round(r*.8)}px serif`;
    bx.textAlign='center'; bx.fillText('💀',sx,cy+r*.3);
    bx.globalAlpha=1; bx.shadowBlur=0;
  });
}

function tickParts(){
  gs.parts=gs.parts.filter(p=>p.life>0);
  gs.parts.forEach(p=>{
    p.x+=p.vx*fk; p.y+=p.vy*fk; if(!p.noGrav) p.vy+=.18*fk; p.life-=p.dec*fk;
    bx.globalAlpha=p.fin?p.life*Math.min(1,(1-p.life)/p.fin):p.life;   // p.fin: share of its life spent fading in
    bx.fillStyle=p.col; bx.shadowColor=p.col; bx.shadowBlur=8;
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
    f.y-=0.55*fk; f.life-=.016*fk;
    bx.globalAlpha=Math.min(1,f.life*3); bx.fillStyle=f.col;
    bx.font=`bold ${f.sz}px Cinzel,serif`; bx.textAlign='center';
    bx.shadowColor=f.col; bx.shadowBlur=10;
    bx.fillText(f.t,f.x,f.y); bx.shadowBlur=0; bx.globalAlpha=1;
  });
}

function addFloat(x,y,t,col,sz=17){ gs.floats.push({x,y,t,col,sz,life:1}); }

// ── SPELL PROJECTILES ──────────────────────────────────────
// o.arc: peak height (px) of a parabolic flight path instead of a straight line
function spawnProj(x1,y1,x2,y2,element,col,cb,o={}){
  if(simMode){ if(cb) cb(); return; }
  const speeds={fire:0.038,lightning:0.22,ice:0.045,arcane:0.042,physical:0.065,dispel:0.05,manaburn:0.056,dark:0.048,arcaneOrb:0.03};
  gs.projs.push({x1,y1,x2,y2,progress:0,speed:speeds[element]||0.045,element,col,cb,done:false,arc:o.arc||0,
    phase:_rng()*Math.PI*2});
}

// Arcane strikes: pulsating blue orbs lobbed one after another, each on a parabola with its own
// random peak height. The strike's damage is split into ARCANE_ORB_DMG-point hits, one per orb
// (see elemStrikeVolley). onOrb(i) runs as orb i lands, then done() after the last.
const ARCANE_ORB_DMG=5, ARCANE_ORB_GAP=140;
function spawnArcaneVolley(x1,y1,x2,y2,n,onOrb,done){
  if(simMode){ for(let i=0;i<n;i++) onOrb(i); done(); return; }
  let landed=0;
  for(let i=0;i<n;i++){
    setTimeout(()=>{
      const arc=bH*(.08+_rng()*.3);   // random max height for each orb
      spawnProj(x1,y1,x2,y2,'arcaneOrb','#4499ff',()=>{
        onOrb(landed);
        if(++landed===n) done();
      },{arc});
    },i*ARCANE_ORB_GAP);
  }
}

function tickProjs(){
  gs.projs=gs.projs.filter(p=>!p.done);
  gs.projs.forEach(p=>{
    p.progress=Math.min(1,p.progress+p.speed*fk);
    const px=p.x1+(p.x2-p.x1)*p.progress;
    const py=p.y1+(p.y2-p.y1)*p.progress-(p.arc?4*p.arc*p.progress*(1-p.progress):0);
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
    } else if(p.element==='arcaneOrb'){
      // Pulsating blue orb with a faint trail
      const t=Date.now(), pulse=.75+.25*Math.sin(t/90+p.phase);
      bx.save(); bx.translate(px,py);
      bx.beginPath(); bx.arc(0,0,bH*.02*pulse,0,Math.PI*2);
      bx.fillStyle='#3388ff'; bx.shadowColor='#55aaff'; bx.shadowBlur=22*pulse; bx.globalAlpha=.9; bx.fill();
      bx.beginPath(); bx.arc(0,0,bH*.008*pulse,0,Math.PI*2);
      bx.fillStyle='#e8f4ff'; bx.shadowBlur=8; bx.globalAlpha=1; bx.fill();
      bx.shadowBlur=0; bx.restore();
      if(_rng()<.5*fk) gs.parts.push({x:px,y:py,col:'#66aaff',vx:(_rng()-.5)*.6,vy:(_rng()-.5)*.6,
        sz:1.5+_rng()*1.5,life:.7,dec:.04,noGrav:true});
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
    } else if(p.element==='dark'){
      // Shadow orb with the four Dark runes circling it, as in the Shadow Circle minigame
      const t=Date.now();
      bx.save(); bx.translate(px,py);
      bx.beginPath(); bx.arc(0,0,bH*.016,0,Math.PI*2);
      bx.fillStyle='#1a0628'; bx.shadowColor='#aa44ff'; bx.shadowBlur=18; bx.fill();
      bx.font=`bold ${Math.round(bH*.034)}px serif`; bx.textAlign='center'; bx.textBaseline='middle';
      DARK_RUNES.forEach((g,i)=>{
        const a=t/220+i/4*Math.PI*2, r=bH*.045;
        bx.globalAlpha=.9; bx.fillStyle='#ffffff'; bx.shadowColor=g.glow; bx.shadowBlur=10;
        bx.fillText(g.sym,Math.cos(a)*r,Math.sin(a)*r*.6);
      });
      bx.shadowBlur=0; bx.globalAlpha=1; bx.textBaseline='alphabetic'; bx.restore();
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
  enthral:'enthralled', arcaneweave:'arcaneWeave', spellbind:'spellbound', bewitch:'bewitched', chill:'frozen', frostbite:'frozen', dread:'dread',
  warpaint:'resist', ironpatience:'resist', heal:'regen'};
function wizVisuals(st){
  const v={blades:st.blades, skeletons:st.skeletons, simulacra:st.simulacra};
  st.effects.forEach(e=>{
    const k=WIZ_VISUAL_BY_ID[e.id];
    if(k) v[k]=e.type==='weave'?e.charges:(e.rounds||1);
    if(e.type==='empower') v.empowered=true;
    if(e.type==='dot'&&e.id.startsWith('dot-')) v[e.elem==='fire'?'burn':'poison']=1;   // strike riders
  });
  if(st.shieldType){ v.wardCol=wardCol(st); v.wardElem=st.shieldType; v.wardHp=st.shieldHp; }
  if(st.wardSig==='flameshield') v.flameShield=1;
  if(st.wardSig==='stoneskin'){ v.stoneskin=1; v.stoneskinHp=st.shieldHp; }
  return v;
}

// ── BATTLE LOOP ────────────────────────────────────────────
let battleRunning=false, gameEnded=false;
// Only ever one battle loop: starting it again (e.g. after each minigame) replaces the old one.
// Stacked loops used to tick every effect several times per frame, so attacks flashed by.
let battleRAF=0;
function startBattleLoop(){
  cancelAnimationFrame(battleRAF);
  lastFrameTime=0;
  battleRAF=requestAnimationFrame(battleLoop);
}
// Per-frame VFX steps are tuned for 60 fps; fk scales them by real elapsed time
let fk=1;
function battleLoop(ts){
  if(!battleRunning) return;
  battleRAF=requestAnimationFrame(battleLoop);
  const dt=lastFrameTime?Math.min(ts-lastFrameTime,100):16;
  lastFrameTime=ts;
  fk=Math.min(dt,50)/16.67;
  PLAYERS.forEach(w=>tickAnimFrame(w,dt));
  resizeBC();
  bx.setTransform(1,0,0,1,0,0);
  const q=quakeOffset();
  bx.save(); bx.translate(q.x,bOffY+q.y); drawBG(); bx.restore();
  fillSceneBands();
  bx.setTransform(1,0,0,1,q.x,bOffY+q.y);   // everything else draws in scene coordinates
  // Wizard height: capped by width so shield bubbles stay (mostly) on screen on tall phones
  const many=PLAYERS.length>2, gy=wizFeetY();
  PLAYERS.forEach(w=>{
    const st=gs[w], hasFx=id=>st.effects.some(e=>e.id===id);
    drawWiz(seatX(w)+(gs[w+'xOff']||0),gy,wizSize(w),seatCfg(w).col,seatFacesRight(w),gs[w+'anim'],
      hasWard(st),hasFx('ward'),w,hasFx('foresight'),wizVisuals(st));
    if(many){   // name tags, so everyone can tell the wizards apart
      bx.globalAlpha=st.out?.35:.9; bx.fillStyle=seatCfg(w).col;
      bx.font='bold 9px Cinzel,serif'; bx.textAlign='center';
      bx.fillText(seatCfg(w).name,seatX(w),gy+bH*.05);
      bx.globalAlpha=1;
    }
  });
  tickProjs(); tickBeams(); tickManaBurnFire(); tickShadowCircles(); tickDarkRituals(); tickWardUnravels(); tickSiphons(); tickFireballs(); tickExplosions(); tickIceCrystals(); tickIceShards(); tickBoulders(); tickStorms(); tickParts(); tickFloats();
  if(!gs.myTurn&&!gs.busy&&!passPhone()){
    bx.fillStyle=`rgba(${hexToRgb(p2Cfg.col)},0.7)`; bx.font='bold 10px Cinzel,serif';
    bx.textAlign='center'; bx.fillText((PLAYERS.length>2?'RIVALS ARE':p2Cfg.name+' IS')+' CASTING…',bW*.5,bH*.08);
  }
  if(passPhone()&&gs.myTurn){
    const twoCfg=seatCfg(gs.turnPlayer);
    const twoNum=PLAYERS.indexOf(gs.turnPlayer)+1;
    bx.fillStyle=`rgba(${hexToRgb(twoCfg.col)},0.75)`;
    bx.font='bold 9px Cinzel,serif'; bx.textAlign='center';
    bx.fillText('PLAYER '+twoNum+' — YOUR TURN',bW*.5,bH*.08);
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
      `<img class="mh-img" src="portraits/small/${seatKey(w)}.jpg" alt=""><span class="mh-name">${cfg.name}</span>`+
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
    document.getElementById('bel-meditate-cost').textContent=gs[who].meditatedRound===gs.round-1?'Rested':'+'+meditateGain(who)+' Mana';
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
    state.hp=1; state.deathlessSaved=true;   // ends an arcane volley's remaining hits
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
    b.ttl-=fk;
    bx.globalAlpha=Math.max(0,b.ttl/8);
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

// Fire Strike fireball (plain Fire damage off the wheel), drawn by tickFireballs.
// Purely visual, so it uses Math.random, never the replayable _rng.
// Charge: it swells in front of the caster to a size set by the damage it will deal.
// Flight: it streaks across trailing flame. On arrival cb() runs the strike, whose
// impact (ELEM_IMPACT_VFX.fire) is spawnFireExplosion, scaled by the damage dealt.
const FIREBALL_CHARGE_MS=900, FIREBALL_FLIGHT_MS=420;
function fireballRadius(dmg){ return bH*Math.min(.085,.012+.0016*Math.max(1,dmg)); }
// The damage a strike is about to deal, before the target's defences — for sizing the fireball
function previewStrikeDmg(who,elem,power){
  const st=gs[who];
  let m=seatCfg(who).dmgMult||1;
  const emp=effectsOf(st,'empower').find(e=>!e.elem||e.elem===elem);
  if(emp) m*=emp.mult;
  const fr=effectsOf(st,'frenzy')[0]; if(fr) m*=fr.mult;
  const wv=effectsOf(st,'weave')[0];
  return Math.round((power*m+(wv?wv.bonus:0))*suddenDeathMult());
}
function spawnFireball(who,tgt,dmg,cb){
  if(simMode){ if(cb) cb(); return; }
  const dir=seatX(tgt)>=seatX(who)?1:-1;
  const x1=seatX(who)+dir*wizSize(who)*.28, y1=wizMidY(who)-bH*.02;
  anim(who,'cast',FIREBALL_CHARGE_MS+FIREBALL_FLIGHT_MS);
  gs.fireballs.push({x1,y1,x2:seatX(tgt),y2:wizMidY(tgt),R:fireballRadius(dmg),start:Date.now(),cb,done:false,lx:x1,ly:y1});
}
function drawFireballCore(x,y,r,t){
  const flick=1+.08*Math.sin(t/45)+.05*Math.sin(t/23);
  const rr=r*flick;
  const g=bx.createRadialGradient(x,y,0,x,y,rr*1.9);
  g.addColorStop(0,'rgba(255,170,40,.55)'); g.addColorStop(1,'rgba(255,60,0,0)');
  bx.fillStyle=g; bx.beginPath(); bx.arc(x,y,rr*1.9,0,Math.PI*2); bx.fill();
  const c=bx.createRadialGradient(x-rr*.2,y-rr*.2,0,x,y,rr);
  c.addColorStop(0,'#ffffee'); c.addColorStop(.3,'#ffdd55'); c.addColorStop(.7,'#ff7711'); c.addColorStop(1,'#cc2200');
  bx.fillStyle=c; bx.shadowColor='#ff5500'; bx.shadowBlur=rr*1.2;
  bx.beginPath(); bx.arc(x,y,rr,0,Math.PI*2); bx.fill(); bx.shadowBlur=0;
}
function tickFireballs(){
  const now=Date.now();
  gs.fireballs=gs.fireballs.filter(f=>!f.done);
  gs.fireballs.forEach(f=>{
    const el=now-f.start;
    let x,y,r;
    if(el<FIREBALL_CHARGE_MS){
      // Charging: grows (ease-out) with flame motes spiralling in
      const k=el/FIREBALL_CHARGE_MS, e=1-Math.pow(1-k,2);
      x=f.x1; y=f.y1; r=f.R*(.15+.85*e);
      if(Math.random()<.7*fk){
        const a=Math.random()*Math.PI*2, d=f.R*(2.2+Math.random()*1.5);
        gs.parts.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,col:Math.random()<.5?'#ffaa22':'#ff5511',
          vx:-Math.cos(a)*d/14,vy:-Math.sin(a)*d/14,sz:1.5+Math.random()*2,life:1,dec:.07,noGrav:true});
      }
    } else {
      const k=Math.min(1,(el-FIREBALL_CHARGE_MS)/FIREBALL_FLIGHT_MS), e=k*k;   // accelerates away
      x=f.x1+(f.x2-f.x1)*e; y=f.y1+(f.y2-f.y1)*e-Math.sin(k*Math.PI)*bH*.03; r=f.R;
      // Flame trail along the path travelled since last frame
      const steps=Math.max(1,Math.ceil(Math.hypot(x-f.lx,y-f.ly)/(r*.5)));
      for(let i=0;i<steps;i++){
        const s=i/steps, tx=f.lx+(x-f.lx)*s, ty=f.ly+(y-f.ly)*s;
        gs.parts.push({x:tx+(Math.random()-.5)*r,y:ty+(Math.random()-.5)*r,col:['#ffdd55','#ff8822','#ff4411','#552211'][Math.floor(Math.random()*4)],
          vx:(Math.random()-.5)*.6,vy:-.4-Math.random()*.8,sz:r*(.25+Math.random()*.35),life:1,dec:.05+Math.random()*.04,noGrav:true});
      }
      if(k>=1){ f.done=true; if(f.cb) f.cb(); return; }
    }
    f.lx=x; f.ly=y;
    drawFireballCore(x,y,r,now);
  });
}
// Physical Strike boulder (plain Physical damage off the wheel), drawn by tickBoulders.
// Purely visual, so it uses Math.random, never the replayable _rng.
// Form: grit and pebbles spiral in above the caster's head and pack into a boulder
// sized by the damage. Flight: it heaves up and over, then drops near-vertically onto
// the target under gravity. On arrival cb() runs the strike, whose impact
// (ELEM_IMPACT_VFX.physical) is spawnBoulderImpact: shattering rock, dust and a quake.
const BOULDER_FORM_MS=950, BOULDER_FLIGHT_MS=620;
function boulderRadius(dmg){ return bH*Math.min(.09,.024+.0018*Math.max(1,dmg)); }
function spawnBoulder(who,tgt,dmg,cb){
  if(simMode){ if(cb) cb(); return; }
  const x1=seatX(who), y1=wizFeetY()-wizSize(who)*1.25;
  anim(who,'cast',BOULDER_FORM_MS+BOULDER_FLIGHT_MS);
  const verts=[]; for(let j=0;j<9;j++) verts.push(.74+.3*Math.random());
  gs.boulders.push({x1,y1,x2:seatX(tgt),y2:wizMidY(tgt),R:boulderRadius(dmg),start:Date.now(),cb,done:false,
    verts,spin:(seatX(tgt)>=x1?1:-1)*(.004+Math.random()*.002),rot:Math.random()*6.3,lx:x1,ly:y1});
}
function drawBoulderCore(x,y,r,rot,verts,alpha){
  bx.save(); bx.translate(x,y); bx.rotate(rot); bx.globalAlpha=alpha;
  const g=bx.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r*1.15);
  g.addColorStop(0,'#d4b488'); g.addColorStop(.55,'#8b6b45'); g.addColorStop(1,'#3e2e1a');
  bx.fillStyle=g; bx.shadowColor='rgba(0,0,0,.55)'; bx.shadowBlur=r*.5;
  bx.beginPath();
  verts.forEach((v,j)=>{ const a=j/verts.length*Math.PI*2, vr=r*v;
    j?bx.lineTo(Math.cos(a)*vr,Math.sin(a)*vr):bx.moveTo(Math.cos(a)*vr,Math.sin(a)*vr); });
  bx.closePath(); bx.fill(); bx.shadowBlur=0;
  // Cracks and a glowing rune scar of the earth magic holding it together
  bx.strokeStyle='rgba(50,32,16,.7)'; bx.lineWidth=Math.max(1,r*.06);
  bx.beginPath(); bx.moveTo(-r*.45,-r*.15); bx.lineTo(-r*.05,r*.2); bx.lineTo(r*.4,r*.05);
  bx.moveTo(-r*.05,r*.2); bx.lineTo(r*.05,r*.55); bx.stroke();
  bx.strokeStyle='rgba(255,200,110,.55)'; bx.lineWidth=Math.max(1,r*.05);
  bx.beginPath(); bx.moveTo(r*.1,-r*.5); bx.lineTo(r*.3,-r*.2); bx.lineTo(r*.15,-r*.05); bx.stroke();
  bx.restore(); bx.globalAlpha=1;
}
function tickBoulders(){
  const now=Date.now();
  gs.boulders=gs.boulders.filter(b=>!b.done);
  gs.boulders.forEach(b=>{
    const el=now-b.start;
    let x,y,r=b.R,a=1;
    if(el<BOULDER_FORM_MS){
      // Forming: grows (ease-out) and fades in, with earth motes spiralling in
      const k=el/BOULDER_FORM_MS, e=1-Math.pow(1-k,2);
      x=b.x1+Math.sin(el/90)*r*.04*k; y=b.y1; r=b.R*(.2+.8*e); a=.35+.65*e;
      if(Math.random()<.8*fk){
        const ang=Math.random()*Math.PI*2, d=b.R*(2+Math.random()*1.6);
        gs.parts.push({x:x+Math.cos(ang)*d,y:y+Math.sin(ang)*d,col:['#c8a878','#8b6b45','#6b5235'][Math.floor(Math.random()*3)],
          vx:-Math.cos(ang)*d/13,vy:-Math.sin(ang)*d/13,sz:1.5+Math.random()*2.5,life:1,dec:.075,noGrav:true});
      }
      b.rot+=b.spin*.4*16*fk;
    } else {
      // Flight: across fast (done by 70%), height on a high lob that ends in a heavy drop
      const k=Math.min(1,(el-BOULDER_FORM_MS)/BOULDER_FLIGHT_MS);
      const kx=Math.min(1,k/.7), ex=1-Math.pow(1-kx,2);
      x=b.x1+(b.x2-b.x1)*ex;
      const apex=Math.max(b.R*2.6,Math.min(b.y1,b.y2)-bH*.09);   // high, but kept inside the scene
      // Rise to the apex in the first 45%, then fall with gravity (quadratic) onto the target
      y=k<.45 ? b.y1+(apex-b.y1)*(1-Math.pow(1-k/.45,2)) : apex+(b.y2-apex)*Math.pow((k-.45)/.55,2);
      b.rot+=b.spin*16*fk;
      // Dust trail while falling
      if(k>.45&&Math.random()<.9*fk) gs.parts.push({x:x+(Math.random()-.5)*r,y:y-r*.6,col:'#9b8060',
        vx:(Math.random()-.5)*.4,vy:-.3,sz:r*(.15+Math.random()*.2),life:.8,dec:.04,noGrav:true});
      if(k>=1){ b.done=true; if(b.cb) b.cb(); return; }
    }
    b.lx=x; b.ly=y;
    drawBoulderCore(x,y,r,b.rot,b.verts,a);
  });
}
// Boulder impact on a target, sized by the damage: rock shards flying, a dust cloud and a quake
function spawnBoulderImpact(x,y,dmg){
  if(simMode) return;
  const R=boulderRadius(dmg), n=Math.round(10+dmg*.7);
  for(let i=0;i<n;i++){
    const a=-Math.PI*(.05+.9*Math.random()), sp=(2+Math.random()*4)*(R/(bH*.05));
    gs.parts.push({x:x+(Math.random()-.5)*R,y,col:['#e0c498','#c8a878','#a08058','#8b6b45'][Math.floor(Math.random()*4)],
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2.5+Math.random()*R*.3,life:1,dec:.016+Math.random()*.02});
  }
  vfxDrift(x,y,['#9b8060','#7a6448','#b09878'],Math.round(8+dmg*.35),{w:.1,lift:-.6,dec:.012});
  quake(Math.min(14,4+dmg*.3),380+dmg*8);
}
// Brief screen shake (the battle loop offsets the whole scene by quakeOffset())
function quake(amp,ms){ if(simMode) return; gs.quake={start:Date.now(),amp,ms}; }
function quakeOffset(){
  const q=gs.quake; if(!q) return {x:0,y:0};
  const el=Date.now()-q.start; if(el>=q.ms){ gs.quake=null; return {x:0,y:0}; }
  const a=q.amp*Math.pow(1-el/q.ms,2);
  return {x:a*Math.sin(el*.09),y:a*.6*Math.cos(el*.13)};
}
// Fiery explosion on a target, sized by the damage: a white-hot flash, an expanding
// shockwave ring, a billowing fireball and flying embers, then rising smoke
const FIRE_EXPLOSION_MS=750;
function spawnFireExplosion(x,y,dmg){
  if(simMode) return;
  const R=fireballRadius(dmg)*2.6;
  gs.explosions.push({x,y,R,start:Date.now()});
  const n=Math.round(14+dmg*.9);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=(2+Math.random()*4.5)*(R/(bH*.09));
    gs.parts.push({x,y,col:['#ffffaa','#ffcc33','#ff7711','#ff3300'][Math.floor(Math.random()*4)],
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5,sz:1.5+Math.random()*3,life:1,dec:.018+Math.random()*.025});
  }
  vfxDrift(x,y,['#443322','#554433','#332222'],Math.round(6+dmg*.3),{w:.08,lift:-1.2,dec:.012});
}
function tickExplosions(){
  const now=Date.now();
  gs.explosions=gs.explosions.filter(e=>now-e.start<FIRE_EXPLOSION_MS);
  gs.explosions.forEach(e=>{
    const k=(now-e.start)/FIRE_EXPLOSION_MS, out=1-Math.pow(1-k,3);
    bx.save();
    // Shockwave ring
    bx.globalAlpha=(1-k)*.8; bx.strokeStyle='#ffcc66'; bx.lineWidth=Math.max(1,e.R*.12*(1-k));
    bx.shadowColor='#ff8800'; bx.shadowBlur=16;
    bx.beginPath(); bx.ellipse(e.x,e.y,e.R*1.5*out,e.R*1.1*out,0,0,Math.PI*2); bx.stroke();
    // Billowing fireball: swells fast, then fades and darkens
    const r=e.R*(.4+.8*out), a=Math.max(0,1-k*1.15);
    const g=bx.createRadialGradient(e.x,e.y,0,e.x,e.y,r);
    g.addColorStop(0,`rgba(255,255,220,${a})`); g.addColorStop(.25,`rgba(255,210,80,${a})`);
    g.addColorStop(.6,`rgba(255,100,20,${a*.85})`); g.addColorStop(1,'rgba(160,30,0,0)');
    bx.globalAlpha=1; bx.shadowBlur=0; bx.fillStyle=g;
    bx.beginPath(); bx.arc(e.x,e.y,r,0,Math.PI*2); bx.fill();
    // Initial white-hot flash
    if(k<.2){ bx.globalAlpha=1-k/.2; bx.fillStyle='#ffffff'; bx.beginPath(); bx.arc(e.x,e.y,e.R*.5,0,Math.PI*2); bx.fill(); }
    bx.restore();
  });
}

// Ice Strike (plain Ice damage off the wheel), drawn by tickIceCrystals: no projectile.
// A snowflake crystallises over the target: six arms grow out from a hexagonal core,
// sprouting side branches as they pass, while it turns slowly. Then cracks run along
// the arms, cb() runs the strike, and its impact (ELEM_IMPACT_VFX.ice) is spawnIceShatter,
// scaled by the damage dealt. Purely visual, so it uses Math.random.
const ICE_FORM_MS=1000, ICE_CRACK_MS=240, ICE_SHARD_MS=900;
function iceScale(dmg){ return .7+Math.min(.6,Math.max(1,dmg)/50); }
function spawnIceCrystals(who,tgt,dmg,cb){
  if(simMode){ if(cb) cb(); return; }
  const sz=wizSize(tgt), s=iceScale(dmg);
  // Branches along each arm: position on the arm, length, and when they start growing
  const nb=s>1.05?3:2;
  const branches=Array.from({length:nb},(_,i)=>{
    const at=.35+i*(.45/nb)+Math.random()*.05;
    return {at,len:(.42-i*.09)*(.9+Math.random()*.2)};
  });
  anim(who,'cast',ICE_FORM_MS+ICE_CRACK_MS);
  gs.iceCrystals.push({cx:seatX(tgt),cy:wizMidY(tgt)+sz*.05,R:sz*.36*s,s,branches,
    rot:Math.random()*Math.PI/3,spin:(Math.random()<.5?-1:1)*.00035,start:Date.now(),cb,done:false});
}
// One arm of the snowflake along +x, grown to g (0..1)
function snowflakeArm(R,g,branches){
  const L=R*g;
  bx.moveTo(0,0); bx.lineTo(L,0);
  branches.forEach(b=>{
    const p=R*b.at; if(L<=p) return;
    const bl=R*b.len*Math.min(1,(L-p)/(R*.25));
    const dx=Math.cos(Math.PI/3)*bl, dy=Math.sin(Math.PI/3)*bl;
    bx.moveTo(p,0); bx.lineTo(p+dx,-dy); bx.moveTo(p,0); bx.lineTo(p+dx,dy);
  });
  if(g>=.98){   // little diamond at the tip once the arm is complete
    const d=R*.06;
    bx.moveTo(L,0); bx.lineTo(L-d,-d*.7); bx.lineTo(L-d*2,0); bx.lineTo(L-d,d*.7); bx.closePath();
  }
}
function tickIceCrystals(){
  const now=Date.now();
  gs.iceCrystals=gs.iceCrystals.filter(f=>!f.done);
  gs.iceCrystals.forEach(f=>{
    const el=now-f.start, k=Math.min(1,el/ICE_FORM_MS);
    const crack=el<ICE_FORM_MS?0:Math.min(1,(el-ICE_FORM_MS)/ICE_CRACK_MS);
    if(crack>=1){ f.done=true; if(f.cb) f.cb(); return; }
    // Frost motes drawn in toward the flake while it forms
    if(k<1&&Math.random()<.8*fk){
      const a=Math.random()*Math.PI*2, d=f.R*(1.1+Math.random()*.5);
      gs.parts.push({x:f.cx+Math.cos(a)*d,y:f.cy+Math.sin(a)*d,col:Math.random()<.5?'#ddf6ff':'#88ddff',
        vx:-Math.cos(a)*d/18,vy:-Math.sin(a)*d/18,sz:1+Math.random()*2,life:1,dec:.06,noGrav:true});
    }
    const g=1-Math.pow(1-Math.min(1,k/.85),3);   // arms grow ease-out, done just before the crack
    const shake=crack*f.R*.03;
    bx.save();
    bx.translate(f.cx+(Math.random()-.5)*shake,f.cy+(Math.random()-.5)*shake);
    bx.rotate(f.rot+el*f.spin);
    // Soft cold glow behind it
    const gl=bx.createRadialGradient(0,0,0,0,0,f.R*1.15);
    gl.addColorStop(0,`rgba(190,235,255,${.3*k})`); gl.addColorStop(1,'rgba(120,200,255,0)');
    bx.fillStyle=gl; bx.beginPath(); bx.arc(0,0,f.R*1.15,0,Math.PI*2); bx.fill();
    bx.lineCap='round'; bx.lineJoin='round';
    const path=()=>{
      bx.beginPath();
      for(let i=0;i<6;i++){ bx.save(); bx.rotate(i*Math.PI/3); snowflakeArm(f.R,g,f.branches); bx.restore(); }
      // Hexagonal core
      const hr=f.R*.13*Math.min(1,k*3);
      for(let i=0;i<=6;i++){ const a=i*Math.PI/3+Math.PI/6; i?bx.lineTo(Math.cos(a)*hr,Math.sin(a)*hr):bx.moveTo(Math.cos(a)*hr,Math.sin(a)*hr); }
    };
    // Thick blue body, then a thin white-hot core line
    path(); bx.strokeStyle='rgba(120,200,255,.75)'; bx.shadowColor='#66ccff'; bx.shadowBlur=14;
    bx.lineWidth=Math.max(2,f.R*.07); bx.stroke();
    path(); bx.strokeStyle=crack>0?'#ffffff':'rgba(240,252,255,.95)'; bx.shadowBlur=6;
    bx.lineWidth=Math.max(1,f.R*.025*(1+crack*1.5)); bx.stroke();
    // Bright flare at the centre as it is about to burst
    if(crack>0){
      bx.globalAlpha=crack; bx.fillStyle='#ffffff'; bx.shadowColor='#bbeeff'; bx.shadowBlur=20;
      bx.beginPath(); bx.arc(0,0,f.R*.12*(1+crack),0,Math.PI*2); bx.fill();
    }
    bx.restore();
  });
}
// The snowflake bursts: spinning ice shards fly out and fall, a cold flash and drifting frost mist
function spawnIceShatter(x,y,dmg){
  if(simMode) return;
  const s=iceScale(dmg), sz=wizSize(x);
  const n=Math.round(12+Math.max(1,dmg)*.7);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=(2+Math.random()*5)*s;
    const d=Math.random()*sz*.36*s;   // spread over the snowflake
    gs.iceShards.push({x:x+Math.cos(a)*d,y:y+sz*.05+Math.sin(a)*d,
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,rot:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.4,
      L:sz*(.03+Math.random()*.06)*s,start:Date.now(),ms:ICE_SHARD_MS*(.6+Math.random()*.4)});
  }
  vfxRing(x,y,['#ffffff','#aaddff'],Math.round(14*s),{r:.06*s,ry:.04*s,out:true,noGrav:true});
  vfxDrift(x,y,['#cceeff','#aaddff','#ffffff'],Math.round(8+dmg*.3),{w:.08,lift:-.6,dec:.014});
}
function tickIceShards(){
  const now=Date.now();
  gs.iceShards=gs.iceShards.filter(p=>now-p.start<p.ms);
  gs.iceShards.forEach(p=>{
    p.x+=p.vx*fk; p.y+=p.vy*fk; p.vy+=.22*fk; p.rot+=p.spin*fk;
    const a=1-(now-p.start)/p.ms;
    bx.save(); bx.translate(p.x,p.y); bx.rotate(p.rot); bx.globalAlpha=a;
    // A broken-off piece of a snowflake arm: a stem with one pair of side branches
    const h=p.L*.5, b=p.L*.28;
    bx.beginPath(); bx.moveTo(-h,0); bx.lineTo(h,0);
    bx.moveTo(0,0); bx.lineTo(b*.5,-b*.87); bx.moveTo(0,0); bx.lineTo(b*.5,b*.87);
    bx.lineCap='round'; bx.shadowColor='#66ccff'; bx.shadowBlur=10;
    bx.strokeStyle='rgba(120,200,255,.8)'; bx.lineWidth=Math.max(2,p.L*.14); bx.stroke();
    bx.strokeStyle='#ffffff'; bx.lineWidth=Math.max(1,p.L*.05); bx.stroke();
    bx.restore();
  });
}

// Lightning Strike (plain Lightning damage off the wheel), drawn by tickStorms: no projectile.
// Form: a dark storm cloud swirls together over the target's head (puffs spiral inward and
// spin, sparks flicker inside it), sized by the damage. Discharge: cb() runs the strike and a
// jagged, branching bolt cracks down from the cloud into the target, its width and branches
// set by the damage; it flickers twice, then the cloud breaks up. The impact
// (ELEM_IMPACT_VFX.lightning) is spawnLightningImpact. Purely visual, so it uses Math.random.
const STORM_FORM_MS=1050, STORM_BOLT_MS=420, STORM_FADE_MS=520;
function stormScale(dmg){ return .7+Math.min(.7,Math.max(1,dmg)/40); }
function boltWidth(dmg){ return Math.max(1.5,bH*Math.min(.016,.004+.0003*Math.max(1,dmg))); }
function spawnStormCloud(who,tgt,dmg,cb){
  if(simMode){ if(cb) cb(); return; }
  const sz=wizSize(tgt), s=stormScale(dmg), R=sz*.28*s;
  // Just above the hat; a big storm may spill off the top of the scene, like a real sky
  const cx=seatX(tgt), cy=Math.max(bH*.05,wizFeetY()-sz*1.2-R*.3);
  const np=Math.round(9+s*5);
  const puffs=Array.from({length:np},(_,i)=>({
    a:i/np*Math.PI*2+Math.random()*.4, d:.2+Math.random()*.7, r:.28+Math.random()*.22,
    shade:Math.random()}));
  anim(who,'cast',STORM_FORM_MS);
  gs.storms.push({cx,cy,R,s,dmg,puffs,tx:cx,ty:wizMidY(tgt),start:Date.now(),cb,fired:false,
    spin:(Math.random()<.5?-1:1),bolt:null,flick:0});
}
// A jagged line by midpoint displacement: [[x,y],…]
function boltPath(x1,y1,x2,y2,rough,depth){
  let pts=[[x1,y1],[x2,y2]];
  const len=Math.hypot(x2-x1,y2-y1), nx=-(y2-y1)/len, ny=(x2-x1)/len;
  let amp=len*rough;
  for(let d=0;d<depth;d++){
    const out=[pts[0]];
    for(let i=1;i<pts.length;i++){
      const [ax,ay]=pts[i-1],[bx2,by2]=pts[i], o=(Math.random()-.5)*amp;
      out.push([(ax+bx2)/2+nx*o,(ay+by2)/2+ny*o],pts[i]);
    }
    pts=out; amp*=.55;
  }
  return pts;
}
function makeBolt(f){
  const x1=f.cx+(Math.random()-.5)*f.R*.3, y1=f.cy+f.R*.15;
  const main=boltPath(x1,y1,f.tx,f.ty,.18,6);
  const branches=[], nb=Math.min(6,1+Math.round(f.dmg/8));
  for(let i=0;i<nb;i++){
    const at=Math.floor(main.length*(.15+Math.random()*.55)), [bx1,by1]=main[at];
    const side=Math.random()<.5?-1:1, L=(f.ty-f.cy)*(.2+Math.random()*.25);
    branches.push(boltPath(bx1,by1,bx1+side*L*(.5+Math.random()*.6),by1+L,.25,4));
  }
  return {main,branches};
}
function strokeBolt(pts,w,col,alpha){
  bx.beginPath(); pts.forEach(([x,y],i)=>i?bx.lineTo(x,y):bx.moveTo(x,y));
  bx.globalAlpha=alpha*.45; bx.strokeStyle=col; bx.lineWidth=w*3.2; bx.shadowColor=col; bx.shadowBlur=w*6; bx.stroke();
  bx.globalAlpha=alpha; bx.strokeStyle='#ffffff'; bx.lineWidth=w; bx.shadowBlur=w*3; bx.stroke();
}
function drawStormCloud(f,el,k,a){
  // Puffs spiral in from wide to packed while forming, and the whole cloud keeps turning
  const gather=1.7-.7*k, rot=f.spin*el*.0032;
  bx.save(); bx.translate(f.cx,f.cy);
  const glow=bx.createRadialGradient(0,0,0,0,0,f.R*1.4);
  glow.addColorStop(0,`rgba(90,80,140,${.3*a*k})`); glow.addColorStop(1,'rgba(40,40,80,0)');
  bx.fillStyle=glow; bx.beginPath(); bx.ellipse(0,0,f.R*1.5,f.R*.6,0,0,Math.PI*2); bx.fill();
  f.puffs.forEach(p=>{
    const ang=p.a+rot*(1.4-p.d*.6), d=f.R*p.d*gather;
    const x=Math.cos(ang)*d, y=Math.sin(ang)*d*.3, r=f.R*p.r*(.5+.5*k);
    const c=Math.round(22+p.shade*28);
    const g=bx.createRadialGradient(x,y-r*.3,r*.1,x,y,r);
    g.addColorStop(0,`rgba(${c+28},${c+26},${c+55},${a})`); g.addColorStop(.7,`rgba(${c},${c},${c+22},${a*.95})`);
    g.addColorStop(1,`rgba(${c},${c},${c+22},0)`);
    bx.fillStyle=g; bx.beginPath(); bx.arc(x,y,r,0,Math.PI*2); bx.fill();
  });
  // Lit from inside: flickers more and more as it charges
  if(f.flick>0){
    const g=bx.createRadialGradient(0,f.R*.1,0,0,f.R*.1,f.R*1.1);
    g.addColorStop(0,`rgba(255,255,240,${.6*f.flick*a})`); g.addColorStop(.5,`rgba(200,190,255,${.22*f.flick*a})`);
    g.addColorStop(1,'rgba(200,190,255,0)');
    bx.fillStyle=g; bx.beginPath(); bx.ellipse(0,f.R*.1,f.R*1.2,f.R*.45,0,0,Math.PI*2); bx.fill();
  }
  bx.restore();
}
function tickStorms(){
  const now=Date.now();
  gs.storms=gs.storms.filter(f=>!f.fired||now-f.start<STORM_FORM_MS+Math.max(STORM_FADE_MS,STORM_BOLT_MS));   // never drop one before its strike lands
  gs.storms.forEach(f=>{
    const el=now-f.start, k=Math.min(1,el/STORM_FORM_MS), e=1-Math.pow(1-k,2);
    const after=el-STORM_FORM_MS;
    // Inner flicker: rare at first, near-constant just before the discharge
    if(after<0&&Math.random()<(.03+.3*k*k)*fk) f.flick=.5+Math.random()*.5;
    else f.flick=Math.max(0,f.flick-.18*fk);
    if(after<0){
      // Wind and sparks drawn into the swirl
      if(Math.random()<.7*fk){
        const a=Math.random()*Math.PI*2, d=f.R*(1.6+Math.random()*.8);
        gs.parts.push({x:f.cx+Math.cos(a)*d,y:f.cy+Math.sin(a)*d*.45,col:Math.random()<.25?'#ffee44':'#8a8aa8',
          vx:-Math.cos(a)*d/16+f.spin*Math.sin(a)*2,vy:-Math.sin(a)*d*.45/16,sz:1+Math.random()*1.8,life:1,dec:.06,noGrav:true});
      }
      // Tiny arcs crackling inside the cloud as it charges
      if(k>.55&&Math.random()<.35*fk){
        const ax=f.cx+(Math.random()-.5)*f.R*1.4, ay=f.cy+(Math.random()-.4)*f.R*.5;
        bx.save(); strokeBolt(boltPath(ax,ay,ax+(Math.random()-.5)*f.R*.8,ay+f.R*(.1+Math.random()*.3),.3,3),1,'#ffee44',.8); bx.restore();
      }
      drawStormCloud(f,el,e,.35+.65*e);
      return;
    }
    // Discharge: the strike lands as the bolt hits
    if(!f.fired){ f.fired=true; f.bolt=makeBolt(f); f.flick=1; if(f.cb) f.cb(); }
    const fade=Math.max(0,1-after/STORM_FADE_MS);
    drawStormCloud(f,el,1+after/STORM_FADE_MS*.5,fade);
    if(after<STORM_BOLT_MS){
      const bk=after/STORM_BOLT_MS;
      // Two flashes, re-forking for the second, then it fades
      if(bk>.3&&!f.rebolt){ f.rebolt=true; f.bolt=makeBolt(f); }
      const alpha=bk<.18?1:bk<.3?.25:bk<.5?1:Math.max(0,1-(bk-.5)/.5);
      const w=boltWidth(f.dmg);
      bx.save(); bx.lineCap='round'; bx.lineJoin='round';
      f.bolt.branches.forEach(b=>strokeBolt(b,w*.45,'#ffee44',alpha*.8));
      strokeBolt(f.bolt.main,w,'#ffee44',alpha);
      // Light thrown on the target where it strikes
      const gl=bx.createRadialGradient(f.tx,f.ty,0,f.tx,f.ty,f.R*1.3);
      gl.addColorStop(0,`rgba(255,255,230,${.6*alpha})`); gl.addColorStop(1,'rgba(255,238,68,0)');
      bx.globalAlpha=1; bx.shadowBlur=0; bx.fillStyle=gl; bx.beginPath(); bx.arc(f.tx,f.ty,f.R*1.3,0,Math.PI*2); bx.fill();
      bx.restore(); bx.globalAlpha=1;
    }
  });
}
// The bolt's impact, sized by the damage: a burst of sparks, a crackling ring and, for big hits, a jolt
function spawnLightningImpact(x,y,dmg){
  if(simMode) return;
  const s=stormScale(dmg), n=Math.round(12+Math.max(1,dmg)*.8);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=(2+Math.random()*5)*s;
    gs.parts.push({x,y,col:['#ffffff','#ffffaa','#ffee44','#ccccff'][Math.floor(Math.random()*4)],
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,sz:1+Math.random()*2.2,life:1,dec:.03+Math.random()*.03});
  }
  vfxRing(x,y,['#ffffff','#ffee44'],Math.round(12*s),{r:.05*s,ry:.03*s,out:true,noGrav:true,spd:1.6,dec:.03});
  if(dmg>=18) quake(Math.min(8,2+dmg*.15),220+dmg*4);
}

// Shadow circle on a target (Dark strikes, drawn by tickShadowCircles): a purple ring opens,
// the Dark runes ☽ ⊗ ∇ Ω rise from its centre one by one and orbit it, then collapse inward
// into a burst — the battle-screen version of the Shadow Circle minigame's watch phase.
const DARK_RUNES=[{sym:'☽',glow:'#aaddff'},{sym:'⊗',glow:'#ff44aa'},{sym:'∇',glow:'#44aaff'},{sym:'Ω',glow:'#ff4444'}];
const SHADOW_CIRCLE_MS=1500;
function spawnShadowCircle(x,y,big){
  gs.shadowCircles.push({x,y,start:Date.now(),big:!!big,base:_rng()*Math.PI*2,burst:false});
  vfxDrift(x,y+bH*.06,['#5a2280','#6a2a90','#cc88ff'],big?16:10,{w:.1,lift:-1.2,dec:.014});
}
function tickShadowCircles(){
  const now=Date.now();
  gs.shadowCircles=gs.shadowCircles.filter(c=>now-c.start<SHADOW_CIRCLE_MS);
  gs.shadowCircles.forEach(c=>{
    const el=now-c.start, t=el/SHADOW_CIRCLE_MS;
    const R=bH*.11*(c.big?1.25:1), RY=R*.5;
    const COLLAPSE=.72, k=t<COLLAPSE?0:(t-COLLAPSE)/(1-COLLAPSE);   // 0 → 1 as the runes fall in
    const alpha=Math.min(1,t/.12)*(1-k);
    bx.save(); bx.translate(c.x,c.y);
    // The circle: dark fill, two glowing rings and a slow-turning dashed band between them
    bx.globalAlpha=alpha*.35; bx.fillStyle='#1a0628';
    bx.beginPath(); bx.ellipse(0,0,R*1.1,RY*1.1,0,0,Math.PI*2); bx.fill();
    bx.globalAlpha=alpha; bx.strokeStyle='#aa66ee'; bx.shadowColor='#aa44ff'; bx.shadowBlur=14; bx.lineWidth=2;
    bx.beginPath(); bx.ellipse(0,0,R*1.15,RY*1.15,0,0,Math.PI*2); bx.stroke();
    bx.lineWidth=1.2; bx.beginPath(); bx.ellipse(0,0,R*.55,RY*.55,0,0,Math.PI*2); bx.stroke();
    bx.setLineDash([4,6]); bx.lineDashOffset=-el/40; bx.strokeStyle='#6a2a90';
    bx.beginPath(); bx.ellipse(0,0,R*.95,RY*.95,0,0,Math.PI*2); bx.stroke(); bx.setLineDash([]);
    // The runes: rise from the centre in turn, orbit, then spiral in
    bx.font=`bold ${Math.round(bH*.048*(c.big?1.15:1))}px serif`; bx.textAlign='center'; bx.textBaseline='middle';
    DARK_RUNES.forEach((g,i)=>{
      const rise=Math.max(0,Math.min(1,(el-i*120)/300));
      if(rise<=0) return;
      const a=c.base+i/4*Math.PI*2+el/350*(1+k*2);
      const r=rise*(1-k);
      const depth=.65+.35*Math.sin(a);   // runes on the far side of the ring are dimmer
      bx.globalAlpha=rise*(1-k*.6)*depth; bx.fillStyle='#ffffff'; bx.shadowColor=g.glow; bx.shadowBlur=14;
      bx.fillText(g.sym,Math.cos(a)*R*r,Math.sin(a)*RY*r);
    });
    bx.shadowBlur=0; bx.globalAlpha=1; bx.textBaseline='alphabetic'; bx.restore();
    if(k>=.85&&!c.burst){
      c.burst=true;
      spawnParts(c.x,c.y,'#cc44ff',c.big?22:14); spawnParts(c.x,c.y,'#ffffff',6);
    }
  });
}

// Dark ritual circle (Dark strikes, drawn by tickDarkRituals). No projectile: a ring of Dark
// runes appears on the ground at the target's feet and whirls around them, fast at first and slowing to a stop;
// the stilled runes then glow white-hot and burn out in purple embers, and the damage lands
// as they burn (cb). big: a heavier strike (bigger runes, longer spin).
const DARK_RITUAL_SPIN_MS=1150, DARK_RITUAL_GLOW_MS=380, DARK_RITUAL_BURN_MS=420, DARK_RITUAL_TURNS=1.25;   // opening speed is 3×TURNS per spin, ~3.3 turns/s
function spawnDarkRitual(who,tgt,big,cb){
  if(simMode){ if(cb) cb(); return; }
  const sz=wizSize(tgt), x=seatX(tgt);
  gs.darkRituals.push({x,y:wizFeetY()-sz*.02,rx:sz*.55*AURA_SX,ry:sz*.12,big:!!big,start:Date.now(),
    base:_rng()*Math.PI*2,dir:_rng()<.5?-1:1,spin:DARK_RITUAL_SPIN_MS*(big?1.15:1),cb,fired:false});
  anim(who,'cast',900);
  vfxDrift(seatX(who),wizMidY(who),['#5a2280','#cc88ff'],8,{w:.05,lift:-1,dec:.02});
}
function tickDarkRituals(){
  const now=Date.now();
  gs.darkRituals.forEach(c=>{
    const el=now-c.start, spinEnd=c.spin, glowEnd=spinEnd+DARK_RITUAL_GLOW_MS, end=glowEnd+DARK_RITUAL_BURN_MS;
    if(el>=end){ c.done=true; return; }
    // Spin: angular speed falls off as (1-s)², so the runes whirl, slow and settle with no jolt
    const s=Math.min(1,el/spinEnd);
    const rot=c.base+c.dir*DARK_RITUAL_TURNS*Math.PI*2*(1-Math.pow(1-s,3));
    const glow=el<spinEnd?0:Math.min(1,(el-spinEnd)/DARK_RITUAL_GLOW_MS);   // 0 → 1 once stopped
    const burn=el<glowEnd?0:(el-glowEnd)/DARK_RITUAL_BURN_MS;               // 0 → 1 as it burns out
    if(burn>0&&!c.fired){
      c.fired=true;
      spawnParts(c.x,c.y,'#cc44ff',c.big?24:16); spawnParts(c.x,c.y,'#ffffff',c.big?10:6);
      vfxDrift(c.x,c.y,['#cc88ff','#6a2a90','#ffffff'],c.big?18:12,{w:.14,lift:-1.6,dec:.014});
      if(c.cb) c.cb();
    }
    const appear=Math.min(1,el/180), alpha=appear*(1-burn);
    const spinBlur=1-s;   // fast runes leave a smear behind them
    bx.save(); bx.translate(c.x,c.y);
    // The circle itself: a faint dark disc and two rings that brighten as the spin stops
    bx.globalAlpha=alpha*(.25+.2*glow); bx.fillStyle='#1a0628';
    bx.beginPath(); bx.ellipse(0,0,c.rx*1.05,c.ry*1.05,0,0,Math.PI*2); bx.fill();
    const ringCol=glow>.5?'#e6c8ff':'#aa66ee';
    bx.globalAlpha=alpha*(.6+.4*glow); bx.strokeStyle=ringCol; bx.shadowColor='#aa44ff';
    bx.shadowBlur=10+26*glow; bx.lineWidth=1.5+2*glow;
    bx.beginPath(); bx.ellipse(0,0,c.rx*1.12,c.ry*1.12,0,0,Math.PI*2); bx.stroke();
    bx.lineWidth=1+glow; bx.beginPath(); bx.ellipse(0,0,c.rx*.82,c.ry*.82,0,0,Math.PI*2); bx.stroke();
    // The runes: the four Dark runes twice over, evenly spaced on the ring
    const N=8, fs=bH*.05*(c.big?1.2:1)*(1+.25*glow+.35*burn)*(1-.6*burn);
    bx.font=`bold ${Math.round(fs)}px serif`; bx.textAlign='center'; bx.textBaseline='middle';
    for(let i=0;i<N;i++){
      const g=DARK_RUNES[i%4], a=rot+i/N*Math.PI*2;
      const depth=.55+.45*Math.sin(a);   // the far side of the ring is dimmer and smaller
      // Motion smear: a few fading copies trailing the way it came
      if(spinBlur>.15){
        for(let k=1;k<=3;k++){
          const ta=a-c.dir*k*.13*spinBlur;
          bx.globalAlpha=alpha*depth*spinBlur*(.35-k*.09); bx.fillStyle='#bb55ff'; bx.shadowBlur=0;
          bx.fillText(g.sym,Math.cos(ta)*c.rx,Math.sin(ta)*c.ry);
        }
      }
      bx.globalAlpha=alpha*(depth+(1-depth)*glow);
      bx.fillStyle=glow>0?'#ffffff':'#e6c8ff';
      bx.shadowColor=glow>.4?'#ffffff':g.glow; bx.shadowBlur=12+30*glow;
      bx.save(); bx.translate(Math.cos(a)*c.rx,Math.sin(a)*c.ry); bx.scale(.75+.25*depth,.75+.25*depth);
      bx.fillText(g.sym,0,0);
      if(glow>0){ bx.globalAlpha*=.6*glow; bx.shadowColor='#cc44ff'; bx.shadowBlur=40; bx.fillText(g.sym,0,0); }
      bx.restore();
      // Burning out: each rune sheds an ember or two
      if(burn>0&&_rng()<.35) gs.parts.push({x:c.x+Math.cos(a)*c.rx,y:c.y+Math.sin(a)*c.ry,
        vx:(_rng()-.5)*.8,vy:-.6-_rng()*1.2,life:1,dec:.03,col:_rng()<.5?'#cc88ff':'#ffffff',sz:2,noGrav:true});
    }
    bx.shadowBlur=0; bx.globalAlpha=1; bx.textBaseline='alphabetic'; bx.restore();
  });
  gs.darkRituals=gs.darkRituals.filter(c=>!c.done);
}

// Lifesteal siphon (drawn by tickSiphons): blood motes are torn out of the target's body and
// stream across to the caster along gently curving paths, each with a fading trail, and soak
// into the caster with a soft red glow as they arrive. More healing, more motes.
const SIPHON_MS=1500, SIPHON_TRAVEL_MS=750;
const SIPHON_BLOOD={cols:['#ff6666','#aa0000','#dd1a1a'],glow:'#ff1111',core:'#ffd0d0'};
// pal: {cols:[light, dark, mid], glow, core}; a spell sets it as SPELL_VFX[id].siphon
function spawnSiphon(who,tgt,heal,pal){
  pal=pal||SIPHON_BLOOD;
  if(!tgt||tgt===who) return;
  const sx=seatX(tgt), sy=wizMidY(tgt), ex=seatX(who), ey=wizMidY(who);
  const ssz=wizSize(tgt), esz=wizSize(who), n=Math.max(16,Math.min(44,12+(heal||0)*3));
  const motes=[];
  for(let i=0;i<n;i++){
    const delay=(i/n)*(SIPHON_MS-SIPHON_TRAVEL_MS)+_rng()*80;
    motes.push({delay, ms:SIPHON_TRAVEL_MS*(.8+_rng()*.4),
      ox:(_rng()-.5)*ssz*.35, oy:(_rng()-.5)*ssz*.45,     // where in the target's body it's pulled from
      lx:(_rng()-.5)*esz*.2, ly:(_rng()-.5)*esz*.25,      // where it lands on the caster
      bend:(_rng()-.5)*bH*.32-bH*.06,                     // curve of its path (mostly arcing upward)
      wob:_rng()*Math.PI*2, sz:2.2+_rng()*2.2, col:_rng()<.25?pal.cols[0]:_rng()<.5?pal.cols[1]:pal.cols[2]});
  }
  gs.siphons.push({sx,sy,ex,ey,motes,pal,start:Date.now(),ms:SIPHON_MS+SIPHON_TRAVEL_MS*.3});
}
function tickSiphons(){
  if(!gs.siphons||!gs.siphons.length) return;
  const now=Date.now();
  gs.siphons=gs.siphons.filter(s=>now-s.start<s.ms);
  bx.save();
  gs.siphons.forEach(s=>{
    const el=now-s.start;
    const at=(m,k)=>{   // k: 0 leaving the target → 1 reaching the caster
      const x0=s.sx+m.ox, y0=s.sy+m.oy, x1=s.ex+m.lx, y1=s.ey+m.ly;
      const mx=(x0+x1)/2, my=(y0+y1)/2+m.bend, u=1-k;
      const w=Math.sin(k*Math.PI)*Math.sin(m.wob+k*9)*bH*.012;
      return [u*u*x0+2*u*k*mx+k*k*x1, u*u*y0+2*u*k*my+k*k*y1+w];
    };
    s.motes.forEach(m=>{
      const t=(el-m.delay)/m.ms;
      if(t<0||t>1.15) return;
      if(t>1){   // arrived: a brief red glow soaking into the caster
        const g=1-(t-1)/.15, [x,y]=at(m,1);
        bx.globalAlpha=g*.6; bx.fillStyle=s.pal.cols[0]; bx.shadowColor=s.pal.glow; bx.shadowBlur=14;
        bx.beginPath(); bx.arc(x,y,m.sz*(1.5+(1-g)*2),0,Math.PI*2); bx.fill();
        return;
      }
      const k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;   // ease in-out: torn loose, rushes across, slows to soak in
      const fadeIn=Math.min(1,t/.15);
      // Trail: a few fading points behind the mote
      for(let j=4;j>=1;j--){
        const kk=Math.max(0,k-j*.035), [x,y]=at(m,kk);
        bx.globalAlpha=fadeIn*(.5-j*.1); bx.fillStyle=m.col; bx.shadowBlur=0;
        bx.beginPath(); bx.arc(x,y,m.sz*(1-j*.15),0,Math.PI*2); bx.fill();
      }
      const [x,y]=at(m,k);
      bx.globalAlpha=fadeIn; bx.fillStyle=m.col; bx.shadowColor=s.pal.glow; bx.shadowBlur=10;
      bx.beginPath(); bx.arc(x,y,m.sz,0,Math.PI*2); bx.fill();
      bx.globalAlpha=fadeIn*.8; bx.fillStyle=s.pal.core; bx.shadowBlur=0;
      bx.beginPath(); bx.arc(x,y,m.sz*.4,0,Math.PI*2); bx.fill();
    });
  });
  bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
}

// Ward unravelling (a dispel or curse wearing at a ward, drawn by tickWardUnravels): threads of
// the ward's own colour and dispel pink peel off the bubble's edge and spiral outward, shedding
// motes as they unwind. No flash, burst or hit animation, so it never reads as anyone being hurt.
// big: the ward is fully unravelled (more threads, flung further).
const WARD_UNRAVEL_MS=1300;
function wardBubble(x){
  const sz=wizSize(x);
  return {cy:wizFeetY()-sz*.62, rx:sz*.75*AURA_SX, ry:sz*.75*AURA_SY};
}
function spawnWardUnravel(x,col,big){
  const b=wardBubble(x);
  gs.wardUnravels.push({x,y:b.cy,rx:b.rx,ry:b.ry,col,big:!!big,start:Date.now(),
    base:_rng()*Math.PI*2,dir:_rng()<.5?-1:1,ms:WARD_UNRAVEL_MS*(big?1.25:1)});
}
function tickWardUnravels(){
  const now=Date.now();
  gs.wardUnravels=gs.wardUnravels.filter(u=>now-u.start<u.ms);
  gs.wardUnravels.forEach(u=>{
    const t=(now-u.start)/u.ms, ease=1-Math.pow(1-t,2);
    const arms=u.big?6:3, sweep=Math.PI*1.4, out=(u.big?.75:.45)*ease, SEG=22;
    const alpha=Math.min(1,t/.1)*(1-Math.pow(t,3));
    const cols=[u.col,'#ffaaff'];
    bx.save(); bx.lineCap='round';
    for(let i=0;i<arms;i++){
      const head=u.base+i/arms*Math.PI*2+u.dir*t*Math.PI*1.6;
      const col=cols[i%2];
      const pt=k=>{   // k: 0 tail (still on the bubble) → 1 head (flung outward)
        const a=head-u.dir*(1-k)*sweep, rf=1+out*(k*k+t*.4);
        return [u.x+Math.cos(a)*u.rx*rf, u.y+Math.sin(a)*u.ry*rf];
      };
      bx.strokeStyle=col; bx.shadowColor=col; bx.shadowBlur=10;
      let [px,py]=pt(0);
      for(let s=1;s<=SEG;s++){
        const k=s/SEG, [nx,ny]=pt(k);
        bx.globalAlpha=alpha*k; bx.lineWidth=.8+k*2.2*(u.big?1.2:1);
        bx.beginPath(); bx.moveTo(px,py); bx.lineTo(nx,ny); bx.stroke();
        px=nx; py=ny;
      }
      // A bright mote at the loose end, shedding sparks along the spiral
      bx.globalAlpha=alpha; bx.fillStyle='#ffffff'; bx.shadowColor=col; bx.shadowBlur=14;
      bx.beginPath(); bx.arc(px,py,2.2*(u.big?1.3:1),0,Math.PI*2); bx.fill();
      if(t<.85&&_rng()<.5*fk){
        const [qx,qy]=pt(.97), tx=px-qx, ty=py-qy, d=Math.hypot(tx,ty)||1;
        gs.parts.push({x:px,y:py,col:_rng()<.5?col:'#ffffff',vx:tx/d*1.2,vy:ty/d*1.2,
          sz:1+_rng()*1.6,life:1,dec:.03+_rng()*.02,noGrav:true});
      }
    }
    bx.shadowBlur=0; bx.globalAlpha=1; bx.restore();
  });
}

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
// Motes that fade in around the wizard and drift slowly inward to settle (wards and buffs).
// No burst, gravity or flash, so it never reads like a hit.
function vfxPhaseIn(x,y,cols,n,o={}){
  // Spread over the whole wizard (y is the usual chest-height effect point)
  const k=PLAYERS.length>2?.68:1, rx=bH*(o.r||.15)*k, ry=bH*(o.ry||.19)*k, cy=y+bH*.12*k, dec=o.dec||.014;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+_rng()*.6, d=.6+_rng()*.5, sx=Math.cos(a)*rx*d, sy=Math.sin(a)*ry*d;
    gs.parts.push({x:x+sx,y:cy+sy,col:cols[i%cols.length],vx:-sx*dec*.75,vy:-sy*dec*.75-(o.lift||.25),
      sz:1.5+_rng()*(o.sz||2),life:1,dec:dec*(.85+_rng()*.3),fin:.4,noGrav:true});
  }
}
function vfxStrikeAnim(who,tgt,ms=800){ anim(who,'cast',ms); if(tgt&&tgt!==who) anim(tgt,'hit',ms); }

// ── Reactions shared by every spell ──
const VFX={
  wardRaise:(x,col)=>vfxPhaseIn(x,wizMidY(x),[col,col,'#ffffff'],18),
  wardBlock:(x,col='#4af0ff')=>{ spawnParts(x,wizMidY(x),col,8); spawnParts(x,wizMidY(x),'#ffffff',4); },
  wardShatter:(x,col='#4af0ff')=>{ spawnParts(x,wizMidY(x),col,22); spawnParts(x,wizMidY(x),'#ffffff',8); },
  // A dispel wearing at a ward: threads spiral off the bubble (no burst — nobody is hurt)
  wardUnravel:(x,col='#4af0ff')=>spawnWardUnravel(x,col,false),
  wardUnravelled:(x,col='#4af0ff')=>spawnWardUnravel(x,col,true),
  absorbed:(x,col)=>{ spawnParts(x,wizMidY(x),'#ffcc44',18); spawnParts(x,wizMidY(x),col,10); spawnParts(x,wizMidY(x),'#ffffff',6); },
  vanished:x=>spawnParts(x,wizMidY(x),'#b8a0e8',12),
  dodged:x=>{ spawnParts(x,wizMidY(x),'#9988cc',22); spawnParts(x,wizMidY(x),'#ffffff',8); flash('#9988cc'); },
  curseWarded:x=>spawnParts(x,wizMidY(x),'#ffcc44',14),
  // Skeletons cut down in front of the ward: bones clatter to the floor
  minionFall:(x,n)=>vfxDrift(x,wizMidY(x),['#e8e0cc','#bbb3a0','#9966cc'],Math.min(30,6*n),{spd:1.6,lift:-.3,dec:.02,grav:true}),
  resisted:x=>vfxDrip(x,bH*.34,'#665522',8,{vx:1.5,vy:0,vyVar:2,dec:.025}),
  bewitched:who=>{ const x=seatX(who); spawnParts(x,wizMidY(x),'#b86ef4',20); spawnParts(x,wizMidY(x),'#ffffff',8); flash('#b86ef4'); anim(who,'hit',800); },
  agony:x=>{ spawnParts(x,wizMidY(x),'#9944cc',12); flash('#330033'); },
  candle:x=>vfxFountain(x,wizMidY(x),['#ff6622','#ff9900'],8,{spread:.7,min:1.5,var:2.5,w:.04,sz:2.5,dec:.02}),
  // Dispel: pink burst at the target; stripped buffs float away in a white spray
  dispelHit:x=>{ flash('#ffaaff'); spawnParts(x,wizMidY(x),'#ffaaff',20); },
  stripped:x=>vfxFountain(x,wizMidY(x),['#ffddee','#ffffff','#ffffff','#ffffff'],28,{spread:.55,min:.7,var:1.8,w:.08,h:.05,dec:.010,decVar:.009}),
  cleanse:x=>{ spawnParts(x,wizMidY(x),'#ffaaff',30);
    vfxFountain(x,wizMidY(x),['#ffddee','#ffffff','#ffffff','#ffffff'],32,{spread:.55,min:.6,var:1.8,w:.08,h:.05,dec:.010,decVar:.009}); },
  arc:(x,col)=>spawnParts(x,wizMidY(x),col,8),
  // Life drained from the target streams across to the caster (spawnSiphon)
  lifesteal:(who,tgt,heal,pal)=>spawnSiphon(who,tgt,heal,pal),
  // Retaliation, by the enchantment or ward that hit back
  retaliate:{
    counter:(fromX,toX)=>{ spawnParts(toX,wizMidY(toX),'#4af0ff',16); spawnBeam(fromX,wizMidY(fromX),toX,wizMidY(toX),'#4af0ff'); },
    flameshield:(fromX,toX)=>spawnParts(toX,wizMidY(toX),'#ff6600',8),
    frostarmor:(fromX,toX)=>spawnParts(toX,wizMidY(toX),'#88ddff',8),
    dragonscales:(fromX,toX)=>spawnParts(toX,wizMidY(toX),'#cc6622',8),
  },
};

// Plain element strikes off the wheel (the original Inferno / Lightning Bolt / Frost Nova /
// Arcane Surge impacts; Dark the ritual circle burn-out, Physical a falling boulder). An empowered hit bursts bigger.
const ELEM_IMPACT_VFX={
  fire:     (c,n,dmg)=>{ spawnFireExplosion(c.tx,c.ty,dmg!=null?dmg:(n>30?30:15)); flash('#ff6622'); },
  ice:      (c,n,dmg)=>{ spawnIceShatter(c.tx,c.ty,dmg!=null?dmg:(n>30?30:15)); spawnParts(c.tx,c.ty,'#ddf6ff',Math.round(n*.5)); flash('#88ddff'); },
  lightning:(c,n,dmg)=>{ spawnLightningImpact(c.tx,c.ty,dmg!=null?dmg:(n>30?30:15)); flash('#ffee44'); },
  arcane:   (c,n)=>{ spawnParts(c.tx,c.ty,'#4499ff',n); spawnParts(c.tx,c.ty,'#ddeeff',6); flash('#4499ff'); },
  physical: (c,n,dmg)=>{ spawnBoulderImpact(c.tx,c.ty,dmg!=null?dmg:(n>30?30:15)); spawnParts(c.tx,c.ty,'#d0a060',Math.round(n*.5)); flash('#d0a060'); },
  dark:     (c,n)=>{ spawnParts(c.tx,c.ty,'#cc44ff',n); flash('#cc44ff'); },   // the ritual circle (spawnDarkRitual) already burned out
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
  counter:  {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#4af0ff','#4af0ff','#ffffff'],18); anim(c.who,'shield',700); }},
  ward:     {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#ffcc44','#ffcc44','#ffffff'],18); anim(c.who,'shield',700); }},
  // Malachar
  empower:  {self:c=>{ vfxPhaseIn(c.cx,c.cy,[c.col],12); anim(c.who,'cast',700); }},
  bloodpact:{self:c=>{ vfxDrip(c.cx,c.cy,'#cc1111',8); vfxFountain(c.cx,c.cy,['#8844ff'],10,{spread:.6,min:1.5,var:2.5,w:.04,sz:2,dec:.02}); anim(c.who,'cast',700); }},
  drain:    {hit:c=>{ spawnParts(c.tx,c.ty,'#cc1111',14); flash('#cc1111'); vfxStrikeAnim(c.who,c.tgt); }},   // the blood stream itself is the lifesteal siphon
  // Sylvara
  heal:     {self:c=>{ vfxFountain(c.cx,c.cy,['#88ffcc','#44ee88'],14); anim(c.who,'cast',700); }},
  entangle: {hit:c=>{ vfxRing(c.tx,c.ty,['#44cc88'],10,{spd:.9,sz:2}); spawnParts(c.tx,c.ty,'#44cc88',8); anim(c.who,'cast',800); }},
  vinewhip: {hit:c=>{ vfxRing(c.tx,c.ty,['#44cc88'],12,{r:.07,sz:2}); spawnParts(c.tx,c.ty,'#44cc88',10); vfxStrikeAnim(c.who,c.tgt); }},
  // Aurelia
  foresight:{self:c=>{ vfxPhaseIn(c.cx,c.cy,[c.col,c.col,'#ffffff'],18); anim(c.who,'shield',700); }},
  timedrain:{hit:c=>{ spawnParts(c.tx,c.ty,'#cc88ff',12); spawnParts(c.tx,c.ty,c.col,6); anim(c.who,'cast',700); }},
  haste:    {self:c=>{ vfxPhaseIn(c.cx,c.cy,[c.col,'#ffffff'],16); anim(c.who,'shield',700); }},   // Rewind
  // Gnash
  warpaint: {self:c=>{ vfxDrip(c.cx,bH*.35,'#cc1111',8,{vx:1.5,vy:1,vyVar:2.5,dec:.025}); vfxPhaseIn(c.cx,c.cy,[c.col],12); anim(c.who,'shield',700); }},
  charge:   {delivery:'lunge', hit:c=>{ spawnParts(c.tx,c.ty,c.col,22); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  frenzy:   {self:c=>{ vfxPhaseIn(c.cx,c.cy,[c.col],18); vfxDrip(c.cx,bH*.35,'#cc1111',6,{vx:1.5,vy:1,vyVar:2.5,dec:.025}); anim(c.who,'cast',700); }},
  // Cinder
  fireball: {hit:c=>{ vfxRing(c.tx,c.ty,['#ffaa00','#ff6600'],18,{spd:1.4,lift:-.5,sz:3}); spawnParts(c.tx,c.ty,'#ff6600',20); flash('#ff6600'); vfxStrikeAnim(c.who,c.tgt); }},
  flameshield:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#ffaa00','#ff6600'],20,{lift:.5}); anim(c.who,'shield',700); }},
  candle:   {hit:c=>{ vfxDrift(c.tx,c.ty,['#ffaa00','#ff6600'],12,{w:.05,spd:.7,lift:-1.5,dec:.018}); spawnParts(c.tx,c.ty,'#ff6600',10); anim(c.who,'cast',800); }},
  // Skadi
  icelance: {hit:c=>{ vfxRing(c.tx,c.ty,['#88ddff'],16,{r:.05,ry:.03}); spawnParts(c.tx,c.ty,'#88ddff',18); flash('#88ddff'); vfxStrikeAnim(c.who,c.tgt); }},
  frostarmor:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#88ddff','#88ddff','#aaeeff','#ffffff'],20,{lift:0}); anim(c.who,'shield',700); }},
  blizzard: {hit:c=>{
    for(let i=0;i<20;i++){
      const a=_rng()*Math.PI*2, r=bH*(0.05+_rng()*0.08);
      gs.parts.push({x:c.tx+Math.cos(a)*r,y:c.ty+Math.sin(a)*r*0.5,col:'#88ddff',
        vx:Math.cos(a)*0.6+(_rng()-.5)*0.8,vy:Math.sin(a)*0.6-1-_rng()*2,sz:1.5+_rng()*2.5,life:1,dec:.012,noGrav:true});
    }
    spawnParts(c.tx,c.ty,'#88ddff',12); spawnParts(c.tx,c.ty,'#aaeeff',6); anim(c.who,'cast',800); }},
  // Zacharius
  galvanize:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#88ffcc','#aaff44','#aaff44','#ffffff'],18); anim(c.who,'shield',700); }},
  chainlightning:{hit:c=>{ vfxRing(c.tx,c.ty,['#ffffff','#aaff44'],14,{r:.05,ry:.03,spd:1.5,sz:2,dec:.022}); spawnBeam(c.cx,c.cy,c.tx,c.ty,c.col); spawnParts(c.tx,c.ty,c.col,18); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  conductivity:{hit:c=>{ vfxDrift(c.tx,c.ty,['#88ffcc','#aaff44'],14,{w:.06,lift:-1.2}); spawnParts(c.tx,c.ty,c.col,10); anim(c.who,'cast',800); }},
  // Mary
  divineheal:{self:c=>{ vfxFountain(c.cx,c.cy,['#fff8c0','#ffe090'],16,{spread:.9}); flash(c.col); anim(c.who,'cast',700); }},
  purge:    {self:c=>{ spawnParts(c.cx,c.cy,'#fffde0',18); spawnParts(c.cx,c.cy,'#ffffff',8); flash('#fffff0'); anim(c.who,'shield',700); }},
  radiant:  {hit:c=>{ spawnParts(c.tx,c.ty,c.col,16); spawnBeam(c.cx,c.cy,c.tx,c.ty,c.col); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  // Mordant (the three hexes share one look)
  agony:     {hit:c=>SPELL_VFX._hex(c)},
  silence:   {hit:c=>SPELL_VFX._hex(c)},
  corruption:{hit:c=>SPELL_VFX._hex(c)},
  _hex:c=>{ spawnParts(c.tx,c.ty,c.col,18); spawnParts(c.tx,c.ty,'#110011',8); spawnBeam(c.cx,c.cy,c.tx,c.ty,c.col); flash(c.col); vfxStrikeAnim(c.who,c.tgt); },
  // Ponder
  vanish:   {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#b8a0e8','#b8a0e8','#ffffff'],18); anim(c.who,'shield',700); }},
  manasiphon:{self:c=>{ spawnParts(c.tx,c.ty,'#b8a0e8',14); spawnParts(c.cx,c.cy,'#b8a0e8',8); anim(c.who,'cast',700); }},
  blink:    {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#9988cc','#9988cc','#ffffff'],22); anim(c.who,'shield',700); }},
  // Durin
  stoneskin:{self:c=>{
    // Three waves of rocks fly in and coat the caster
    [0,220,440].forEach((delay,wave)=>setTimeout(()=>{
      if(!battleRunning) return;
      const angle=wave/3*Math.PI*2+Math.PI/6, srcDist=bH*0.22;
      for(let j=0;j<4;j++){
        const a=angle+j/4*Math.PI*2;
        const srcX=c.cx+Math.cos(a)*srcDist, srcY=c.cy+Math.sin(a)*srcDist*0.55, speed=0.06+_rng()*0.04;
        gs.parts.push({x:srcX,y:srcY,col:j%2?'#8b7355':'#a08060',vx:(c.cx-srcX)*speed,vy:(c.cy-srcY)*speed,
          sz:3+_rng()*3,life:1,dec:.028,noGrav:true});
      }
      vfxPhaseIn(c.cx,c.cy,[c.col],4,{r:.1,ry:.13});
    },delay));
    anim(c.who,'shield',900); }},
  stonesoul:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#b08040','#8b6914','#c8a060','#ffffff'],18,{lift:0}); anim(c.who,'shield',700); }},
  rockfall: {delivery:{volley:3,gap:350},
    pre:c=>{ spawnParts(c.cx,c.cy,c.col,12); anim(c.who,'cast',900); },
    each:c=>{ vfxRing(c.tx,c.ty,['#8b6914','#b08040'],10,{r:.04,ry:.03,lift:-.3,sz:3,dec:.022}); spawnParts(c.tx,c.ty,c.col,10); flash(c.col); vfxStrikeAnim(c.who,c.tgt,600); }},
  // Weizan
  conjureblade:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#aaaadd','#aaaadd','#ffffff'],18); anim(c.who,'cast',700); }},
  bladestorm:{delivery:{volley:'blades',gap:320,proj:'physical',col:'#aaaadd'},
    pre:c=>{ spawnParts(c.cx,c.cy,'#aaaadd',16); anim(c.who,'cast',900); },
    each:c=>spawnParts(c.tx,c.ty,c.col,10),
    hit:c=>{ flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  ironpatience:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#888899','#888899','#ffffff'],16,{lift:0}); anim(c.who,'shield',700); }},
  // Gretch
  plague:     {hit:c=>{ spawnParts(c.tx,c.ty,'#55aa33',16); spawnParts(c.tx,c.ty,'#aaddaa',5); anim(c.who,'cast',800); }},
  maggotcloud:{hit:c=>{ spawnParts(c.tx,c.ty,'#55aa33',14); spawnParts(c.tx,c.ty,'#aaddaa',5); anim(c.who,'cast',800); }},
  bonetotem:  {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#55aa33','#55aa33','#aaddaa'],18); anim(c.who,'shield',700); }},
  // Valdris
  raisedead:    {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#8844cc','#8844cc','#ffffff'],18); anim(c.who,'cast',800); }},
  // siphon: the lifesteal stream's colours (spawnSiphon); without one it's blood red
  necroticdrain:{siphon:{cols:['#b366ff','#6a1fb0','#8844cc'],glow:'#9933ff',core:'#ecd6ff'},
    hit:c=>{ spawnParts(c.tx,c.ty,'#8844cc',16); flash('#8844cc'); vfxStrikeAnim(c.who,c.tgt); }},
  soultithe:    {hit:c=>{ spawnBeam(c.cx,c.cy,c.tx,c.ty,'#aa88ff'); vfxDrip(c.tx,c.ty,'#aa88ff',10,{vx:1,vy:1,vyVar:1.5,dec:.02}); }},
  reinforce:    {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#8844cc'],12); anim(c.who,'cast',700); }},
  // Mirel
  simulacrum:{self:c=>{ vfxPhaseIn(c.cx,c.cy,['#b86ef4','#b86ef4','#ffffff'],20); anim(c.who,'shield',800); }},
  bewitch:   {hit:c=>{ spawnParts(c.tx,c.ty,c.col,18); spawnParts(c.tx,c.ty,'#ffffff',6); anim(c.who,'cast',800); }},
  feint:     {hit:c=>{ spawnParts(c.tx,c.ty,c.col,18); flash(c.col); vfxStrikeAnim(c.who,c.tgt); }},
  // Thessaly
  enthral:    {hit:c=>{ spawnParts(c.tx,c.ty,c.col,18); spawnParts(c.tx,c.ty,'#ffffff',6); anim(c.who,'cast',800); }},
  arcaneweave:{self:c=>{ vfxPhaseIn(c.cx,c.cy,[c.col,c.col,'#ffdd88'],18); anim(c.who,'cast',700); }},
  spellbind:  {hit:c=>{ spawnParts(c.tx,c.ty,c.col,16); spawnParts(c.tx,c.ty,'#ffdd88',5); anim(c.who,'cast',800); }},
  // Korvath
  dragonscales:  {self:c=>{ vfxPhaseIn(c.cx,c.cy,['#cc6622','#cc6622','#dd8844','#ffcc88'],20,{lift:0}); anim(c.who,'shield',700); }},
  wyrmfirebreath:{hit:c=>{ spawnParts(c.tx,c.ty,'#ff6622',18); spawnParts(c.tx,c.ty,'#ffaa44',8); flash('#ff6622'); vfxStrikeAnim(c.who,c.tgt); }},
  ancientwrath:  {hit:c=>{ spawnParts(c.tx,c.ty,'#ff4400',24); spawnParts(c.tx,c.ty,'#ffaa00',10); flash('#ff4400'); vfxStrikeAnim(c.who,c.tgt); }},
  // Fizzwick
  causticbomb:       {hit:c=>{ spawnParts(c.tx,c.ty,'#88dd44',18); spawnParts(c.tx,c.ty,'#55aa33',8); flash('#88dd44'); vfxStrikeAnim(c.who,c.tgt); }},
  volatiletonic:     {self:c=>{
    if(c.healed) vfxFountain(c.cx,c.cy,['#88ffcc','#44ee88'],14);
    else { spawnParts(c.cx,c.cy,'#88dd44',10); spawnParts(c.cx,c.cy,'#55aa33',6); }
    anim(c.who,'cast',700); }},
  unstableconcoction:{hit:c=>{ spawnParts(c.tx,c.ty,'#cc66ff',22); spawnParts(c.tx,c.ty,'#88dd44',8); flash('#cc66ff'); vfxStrikeAnim(c.who,c.tgt); }},
  // Nyxara
  singularity: {hit:c=>{ vfxRing(c.tx,c.ty,['#6633aa'],16,{dec:.018}); spawnParts(c.tx,c.ty,'#aa66ff',10); spawnParts(c.tx,c.ty,'#330055',6); anim(c.who,'cast',800); }},
  gravitywell: {hit:c=>{ spawnParts(c.tx,c.ty,'#aa66ff',22); spawnParts(c.tx,c.ty,'#6633aa',8); flash('#6633aa'); vfxStrikeAnim(c.who,c.tgt); }},
  eventhorizon:{hit:c=>{ spawnParts(c.cx,c.cy,'#6633aa',12); spawnParts(c.tx,c.ty,'#aa66ff',22); spawnParts(c.tx,c.ty,'#6633aa',8); flash('#6633aa'); vfxStrikeAnim(c.who,c.tgt); }},
};
function vfxCtx(who,tgt,extra){
  return Object.assign({who,tgt,cx:seatX(who),tx:seatX(tgt||who),y:wizMidY(who),cy:wizMidY(who),ty:wizMidY(tgt||who),col:seatCfg(who).col},extra);
}

// ── ROUND FLOW ─────────────────────────────────────────────
// Every round: each seat picks in secret → all picks are revealed together →
// the round resolves on the shared screen → round-end ticks → next pick phase.

// A seat carries its own character once the duel starts; before that, fall back to the picks
function seatCfg(who){ return (gs&&gs[who]&&gs[who].cfg)||(who==='p1'?p1Cfg:p2Cfg); }
function seatKey(who){ return (gs&&gs[who]&&gs[who].key)||(who==='p1'?p1Key:p2Key); }
// 3–4 seats stand in a row across the arena, team-mates side by side
function seatX(who){
  if(PLAYERS.length<=2) return who==='p1'?bW*.25:bW*.75;
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
      `<div class="rv-face rv-back"><img class="rv-portrait" src="portraits/small/${seatKey(who)}.jpg" alt=""><span class="rv-q">?</span><span class="rv-name">${label}</span></div>`+
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
    // Counter (holdWard) braces the ward: it doesn't wear away while Counter lasts
    if(st.shield>0&&!effectsOf(st,'counter').some(e=>e.holdWard)) st.shieldHp=Math.max(1,Math.round(st.shieldHp*ELEM_WARD_DECAY));
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
// Element riders on strikes. Plain strikes never lock (hard locks are for signature spells); a
// chance roll waits for the target's next pick, so neither side can plan around it.
//   Lightning burns mana (even through a ward) · Ice frostbites and Dark dreads (a Damage / Protection
//   pick next round may be lost) · Fire scorches (a burn) · Physical crushes wards (no off-element
//   resistance) · Arcane unweaves buffs (rounds off their timers).
// The riders that need HP reached also need ELEM_RIDER_MIN_TIER or more. ELEM_RIDERS switches each off.
const ELEM_RIDERS={frostbite:true, dread:true, scorch:true, crush:true, unweave:true};
const ELEM_RIDER_MIN_TIER=2;
const ELEM_CHILL_MIN_TIER=2;    // Ice Lance (el.chill) chills (a hard lock) at this strength or more
const ELEM_RISK_PCT={frostbite:0.5, dread:0.5};   // chance the covered pick next round is lost
const ELEM_SCORCH=[null,{dmg:2,rounds:2},{dmg:3,rounds:2}];   // burn by tier (inner ring: none)
const ELEM_LIGHTNING_BURN=[1,2,3]; // mana burned by Lightning per tier, ward or not
const ELEM_LOCK_ROUNDS=2;       // a lock applied this round blocks the target's next pick
const ELEM_DISPEL_ALL_TIER=3;
const ELEM_CURSE_DISPEL=0.5;
// Share of a strike's damage a ward loses: match = a strike in the ward's own element, off = any other element
const ELEM_WARD_TAKE={match:1.5, off:0.75, crush:1};   // wards resist other elements; their own unravels them; Physical strikes crush through the resistance

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

// Casting minigame per element
const ELEM_MINIGAME={fire:launchPatternEcho, ice:launchIcePattern, lightning:launchLightningPattern,
  arcane:launchArcanePattern, physical:launchRockfallPattern, dark:launchShadowCirclePattern};
const ELEM_GLYPHS={physical:[1,2,3,8], dark:[6,9,2,4]};   // Δ ∇ Ψ ⊕ (stone) / ☽ ⊗ ∇ Ω (necromancy)
const ELEM_WARD_THEME={fire:'flameshield', ice:'frostarmor', lightning:'shield',
  arcane:'foresight', physical:'stoneskin', dark:'warpaint'};
const ELEM_PROJ={fire:'fire', ice:'ice', lightning:'lightning', arcane:'arcane', physical:'physical', dark:'dark'};

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
  st.skeletons=effectsOf(st,'minion').filter(e=>e.minion==='skeleton').map(e=>({tier:e.tier||2}));
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
  // Same enchantment again refreshes it; minions stack instead (`raise` at a time, up to `max`)
  if(eff.type==='minion'){
    const n=Math.min(eff.raise||1,(eff.max||Infinity)-countMinions(st,eff.minion));
    if(n<=0) return false;
    for(let i=0;i<n;i++) st.effects.push(Object.assign({from:fromWho},eff,eff.soak?{hp:eff.soak}:{}));
    syncMinionVisuals(st);
    addFloat(x,bH*.26,eff.icon+' '+eff.name+(n>1?' ×'+n:'')+'!','#88ffcc',13);
    return true;
  }
  st.effects=st.effects.filter(e=>e.id!==eff.id);
  st.effects.push(Object.assign({from:fromWho},eff));
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
// Enthral: the caster secretly calls the foe's next category. Call it right and that spell is lost,
// its mana going to the caster (up to the spell's steal). The call stays hidden until it plays out.
const ENTHRAL_CALLS=['damage','protect','dispel'];
// Curses worth cleansing: Enthral springs as the next spell is paid for, so cleansing it then is too late
function cleansableCurses(st){ return cursesOf(st).filter(e=>e.type!=='enthral'); }
// Spellbind binds the category a wizard has cast most this duel; ties go to Damage
function mostUsedCat(st){
  return ENTHRAL_CALLS.reduce((a,c)=>(st.catCounts[c]||0)>(st.catCounts[a]||0)?c:a,'damage');
}
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
  if(e&&e.soak){ e.raise=Math.max(1,(e.raise||1)+tier-2); }
  else if(e){
    ['perRound','retaliate','dmg','n','bonus','burn','extra','steal'].forEach(k=>{ if(e[k]) e[k]=n(e[k]); });
    if(e.ramp) e.ramp=e.ramp.map(n);
    if(e.pct) e.pct=pct(e.pct,0.7);
    if(e.mult) e.mult=mult(e.mult);
    if(['absorbNext','warding','bewitch'].includes(e.type)) e.rounds=Math.max(1,e.rounds+tier-2);
    if(e.extend&&tier===3) e.extend++;   // Counter: the outer ring holds the ward one round longer
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
// Income-drain curses (Time Drain, Corruption, Maggot Cloud) cut the gain too, as they cut Channel in Classic.
const MEDITATE={gain:3};
function meditateGain(who){ return Math.max(0,MEDITATE.gain-incomeDrainOf(who)); }
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
    damage:'A ward\'s own element unravels it · Lightning burns mana · Physical crushes wards · strong hits that land: Ice frostbites, Dark dreads, Fire scorches, Arcane unweaves buffs',
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
  const x=seatX(who), y=wizMidY(who);
  tgts.slice(1).forEach(t=>spawnProj(x,y,seatX(t),wizMidY(t),proj,col,()=>{}));
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
      `<img src="portraits/small/${seatKey(w)}.jpg" alt=""><span class="tg-name">${cfg.name}${w===who?' (you)':''}</span>`+
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
  const cast=call=>{
    const commit=ok=>chooseTarget(who,Object.assign({type:'el',cat:el.cat,elem:elemId,tier,sig:id,ok},call?{call}:{}));
    if(el.cat==='dispel') launchDispelPattern(spell,commit);
    else if(el.kind==='strike') ELEM_MINIGAME[elemId](spell,commit);
    else launchBuffTileMatch(spell,ELEM_WARD_THEME[elemId],who,ok=>commit(ok));
  };
  gs.busy=true;
  if(el.effect&&el.effect.type==='enthral') showCallPicker(cast);
  else cast();
}
// Enthral: secretly call the category the foe will pick next round
function showCallPicker(cb){
  let ov=document.getElementById('target-overlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='target-overlay';
    ov.innerHTML='<div class="tg-box"><div class="tg-title"></div><div class="tg-list"></div></div>';
    document.body.appendChild(ov);
  }
  const hint={damage:'Their strike is lost',protect:'Their ward never rises',dispel:'Their dispel or curse is lost'};
  ov.querySelector('.tg-title').textContent='Call their next move';
  ov.querySelector('.tg-list').innerHTML=ENTHRAL_CALLS.map(c=>
    `<button class="tg-foe tg-call" data-cat="${c}"><span class="tg-ico">${ELEM_CATS[c].icon}</span>`+
    `<span class="tg-name">${ELEM_CATS[c].name}</span><span class="tg-ward">${hint[c]}</span></button>`).join('');
  ov.querySelectorAll('.tg-call').forEach(b=>b.onclick=()=>{ ov.classList.remove('show'); cb(b.dataset.cat); });
  ov.classList.add('show');
}

// ── Resolution ──
function elemFloatDmg(who,n,icon,col){
  if(n<=0) return;
  dealDmgToPlayer(who,n,seatX(who),wizMidY(who));
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
  const ent=takeEffect(st,'enthral');
  if(ent) action.enthral={call:ent.call,from:ent.from};
  if(action.cat==='pass') return;
  if(action.cat==='meditate'){ st.meditatedRound=gs.round; return; }
  const sp=action.sig?sigById(who,action.sig):null;
  const cost=action.cat==='phase'?PHASE.cost:sp?sigCost(who,sp,action.tier):elemCost(who,action.cat,action.tier);
  const silence=effectsOf(st,'silence')[0];
  const risk=effectsOf(st,'risk').find(e=>e.cat===action.cat);   // Frostbite / Dread
  if(risk) st.effects=st.effects.filter(e=>e!==risk);   // one roll, on the next pick it covers
  if(!action.ok){ st.mana=Math.max(0,st.mana-1); action.outcome='fizzle'; }
  else if(silence&&_rng()<silence.pct) action.outcome='silenced';
  else if(risk&&_rng()<risk.pct){ action.outcome='risked'; action.riskId=risk.id; }
  else if(cost>st.mana) action.outcome='nomana';
  else { st.mana-=cost; action.outcome='cast'; action.paid=cost; }
  if(ent&&action.outcome==='cast'&&action.cat===ent.call&&!gs[ent.from].out){
    const gain=Math.min(action.paid,ent.steal,MAX_MANA-gs[ent.from].mana);
    gs[ent.from].mana+=gain;
    action.outcome='enthralled'; action.enthral.gain=gain;
  }
}
// The Enthral call plays out: the spell it named is lost, or the call is shown as a misread
function showEnthral(who,action){
  const en=action.enthral, x=seatX(who), c=ELEM_CATS[en.call];
  if(action.outcome==='enthralled'){
    addFloat(x,bH*.3,'🌀 Called it! '+c.icon+' '+c.name+' lost','#cc88ff',14);
    spawnParts(x,wizMidY(x),'#cc88ff',18); spawnParts(x,wizMidY(x),'#ffdd88',6);
    if(en.gain) addFloat(seatX(en.from),bH*.3,'+'+en.gain+' Mana 🌀','#ffdd88',13);
  } else addFloat(x,bH*.24,'🌀 Enthral called '+c.icon+' '+c.name+' — misread','#aaaacc',11);
}
function quickSteal(who,action){
  const a=sigAtTier(sigById(who,action.sig),action.tier).action, ts=gs[action.target], st=gs[who];
  if(!a||a.type!=='siphon'||isPhased(action.target)) return;
  const n=Math.min(ts.mana,a.amt);
  ts.mana-=n; st.mana=Math.min(MAX_MANA,st.mana+n);
  action.stolen=n;
}
// Agony bites whatever the foe does: casting, failing, waiting or shifting. Meditate is the one
// escape, unless Corruption has spoiled it too.
function agonyBites(who,action){
  if(action.cat!=='meditate') return true;
  return effectsOf(gs[who],'incomeDrain').some(e=>e.id==='corruption');
}
function executeElemental(who,action,cb){
  const st=gs[who], x=seatX(who);
  const agony=effectsOf(st,'agony')[0];
  if(agony&&agonyBites(who,action)){ dmgSource=agony.from; elemFloatDmg(who,agony.dmg,'💀 Agony','#9944cc'); VFX.agony(x); dmgSource=who; }
  if(agony&&st.hp<=0){ combatTimeout(cb,700); return; }   // Agony knocked them out before they could act
  if(action.enthral){ showEnthral(who,action); if(action.outcome==='enthralled'){ anim(who,'cast',600); combatTimeout(cb,1000); return; } }
  if(action.cat==='pass'){ addFloat(x,bH*.33,'… Waits','#aaaacc',12); combatTimeout(cb,500); return; }
  if(action.cat==='meditate'){
    const n=Math.min(meditateGain(who),MAX_MANA-st.mana);
    st.mana+=n;
    anim(who,'cast',600);
    vfxFountain(x,wizMidY(x),['#7fb2ff','#b8d4ff','#ffffff'],14,{spread:.35,min:.6,var:1.4,w:.08,lift:-.3,sz:2.5,dec:.01});
    const drains=effectsOf(st,'incomeDrain').map(e=>e.icon).join('');
    addFloat(x,bH*.33,'🧘 Meditates'+(n>0?' +'+n+' Mana':'')+(drains?' · '+drains+' Drained':''),'#7fb2ff',13);
    // Candle: resting by the flame sets you alight, as warding does
    const candle=effectsOf(st,'candle')[0];
    if(candle){ dmgSource=candle.from; elemFloatDmg(who,candle.dmg,'🕯️','#ff6622'); VFX.candle(x); dmgSource=who; }
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

  dmgSource=who;
  // Paid (or not) when the round began — see payForAction
  if(action.outcome==='fizzle'){ addFloat(x,bH*.33,'Fizzled!','#ff8844',13); combatTimeout(cb,700); return; }
  if(action.outcome==='silenced'){ showSilenceBlock(x,bH*.33); combatTimeout(cb,900); return; }
  if(action.outcome==='risked'){ showRiskBlock(x,bH*.33,action.riskId); combatTimeout(cb,900); return; }
  if(action.outcome==='nomana'){ addFloat(x,bH*.33,'Out of mana!','#ff8844',13); combatTimeout(cb,700); return; }
  anim(who,'cast',600);
  st.catCounts[action.cat]=(st.catCounts[action.cat]||0)+1;   // what Spellbind binds, and what Enthral reads
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
  const st=gs[who], x=seatX(who), y=wizMidY(who);
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
    elemCleanse(who,false);
    combatTimeout(cb,800);
    return;
  }
  const tgt=action.target, tx=seatX(tgt);
  if(action.cat==='damage') st.lastElem=action.elem;
  const tgts=action.cat==='damage'?strikeTargets(who,action):[tgt];
  if(action.cat==='damage'&&action.elem==='arcane'){
    elemStrikeVolley(who,tgts,{elem:action.elem,tier:action.tier,power},()=>combatTimeout(cb,600));
    return;
  }
  const land=()=>{
    if(action.cat==='dispel') elemDispelHit(tgt,action.elem,power,action.tier);
    else elemStrike(who,tgts,{elem:action.elem,tier:action.tier,power});
    combatTimeout(cb,600);
  };
  if(action.cat==='damage'&&action.elem==='fire'){
    // Fire Strike: a fireball swells in the caster's hands (bigger for more damage), then flies
    const dmg=previewStrikeDmg(who,'fire',power);
    tgts.slice(1).forEach(t=>spawnFireball(who,t,dmg,()=>{}));
    spawnFireball(who,tgt,dmg,land);
    return;
  }
  if(action.cat==='damage'&&action.elem==='physical'){
    // Physical Strike: a boulder forms above the caster (bigger for more damage), then drops on the target
    const dmg=previewStrikeDmg(who,'physical',power);
    tgts.slice(1).forEach(t=>spawnBoulder(who,t,dmg,()=>{}));
    spawnBoulder(who,tgt,dmg,land);
    return;
  }
  if(action.cat==='damage'&&action.elem==='ice'){
    // Ice Strike: crystals freeze over each target (bigger for more damage), then shatter
    const dmg=previewStrikeDmg(who,'ice',power);
    tgts.slice(1).forEach(t=>spawnIceCrystals(who,t,dmg,()=>{}));
    spawnIceCrystals(who,tgt,dmg,land);
    return;
  }
  if(action.cat==='damage'&&action.elem==='lightning'){
    // Lightning Strike: a storm swirls up over each target (bigger for more damage), then a bolt
    // discharges into them, as thick and forked as the damage is high
    const dmg=previewStrikeDmg(who,'lightning',power);
    tgts.slice(1).forEach(t=>spawnStormCloud(who,t,dmg,()=>{}));
    spawnStormCloud(who,tgt,dmg,land);
    return;
  }
  if(action.cat==='damage'&&action.elem==='dark'){
    // Dark Strike: no projectile — a ritual circle of runes spins around each target, stops,
    // glows and burns out, and the damage lands as it burns
    const big=previewStrikeDmg(who,'dark',power)>=20;
    tgts.slice(1).forEach(t=>spawnDarkRitual(who,t,big,()=>{}));
    spawnDarkRitual(who,tgt,big,land);
    return;
  }
  fanOut(who,tgts,ELEM_PROJ[action.elem],el.col);
  spawnProj(x,y,tx,wizMidY(tx),action.cat==='dispel'?'dispel':ELEM_PROJ[action.elem],el.col,land);
}

function executeSignature(who,sp,action,cb){
  const st=gs[who], x=seatX(who), y=wizMidY(who), el=sigAtTier(sp,action.tier);
  const tgt=action.target, ts=gs[tgt], tx=seatX(tgt);
  const e=elemById(el.elem||'arcane');
  const fx=SPELL_VFX[sp.id]||{}, ctx=vfxCtx(who,tgt);
  const effect=(overrides)=>Object.assign({id:sp.id,name:sigName(sp),icon:sigIcon(sp),tier:el.tier},el.effect,overrides);
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
    const d=fx.delivery;
    // Arcane strikes fly as an orb volley that deals the damage in ARCANE_ORB_DMG-point hits
    if(el.elem==='arcane'&&!d){
      elemStrikeVolley(who,tgts,Object.assign({},el,{power,name:sigName(sp),vfx:fx.hit,siphon:fx.siphon}),()=>combatTimeout(cb,600));
      return;
    }
    // Dark strikes are a ritual circle of runes around each target, not a projectile
    const ritual=el.elem==='dark'&&!d;
    if(!ritual) fanOut(who,tgts,ELEM_PROJ[el.elem],e.col);
    // A volley's own per-projectile effects stand in for the default impact burst
    const vfx=fx.hit||(d&&d.volley?()=>{}:null);
    const land=()=>{
      elemStrike(who,tgts,Object.assign({},el,{power,name:sigName(sp),vfx,siphon:fx.siphon}));
      combatTimeout(cb,600);
    };
    if(d==='lunge'){ lunge(who,0.12,land); return; }
    if(d&&d.volley){
      const n=Math.max(1,d.volley==='blades'?blades:d.volley);
      if(fx.pre) fx.pre(ctx);
      let i=0;
      const fire=()=>{
        const yOff=bH*[-0.04,0,0.04][i%3];
        spawnProj(x,y+yOff,tx,wizMidY(tx)+yOff,d.proj||ELEM_PROJ[el.elem],d.col||e.col,()=>{
          if(fx.each) fx.each(Object.assign({},ctx,{y:y+yOff}));
          if(++i<n) combatTimeout(fire,d.gap); else land();
        });
      };
      fire();
      return;
    }
    if(ritual){
      const big=previewStrikeDmg(who,'dark',power)>=20;
      tgts.slice(1).forEach(t=>spawnDarkRitual(who,t,big,()=>{}));
      spawnDarkRitual(who,tgt,big,land);
      return;
    }
    spawnProj(x,y,tx,wizMidY(tx),ELEM_PROJ[el.elem],e.col,land);
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
    addEffect(mine?who:ally,effect({kind:el.effect.kind||'buff'}),who);
    // A buff that also raises a light ward (Blink) — never replaces a stronger ward already up
    if(el.ward&&!(hasWard(as)&&as.shieldHp>=el.ward)){ raiseWard(ally,el.elem,el.ward,0); as.wardSig=sp.id; }
    // A buff that holds up a ward already standing (Counter): it lasts longer
    if(el.effect.extend&&hasWard(as)){ as.shield+=el.effect.extend; addFloat(seatX(ally),bH*.34,'🛡 Ward +'+el.effect.extend+' round'+(el.effect.extend>1?'s':''),wardCol(as),12); }
    if(fx.self) fx.self(mine?ctx:actx); else { vfxPhaseIn(seatX(mine?who:ally),wizMidY(mine?who:ally),[e.col],14); anim(mine?who:ally,'shield',700); }
    combatTimeout(cb,900);
    return;
  }
  if(el.kind==='curse'){
    spawnProj(x,y,tx,wizMidY(tx),ELEM_PROJ[el.elem||'arcane'],e.col,()=>{
      if(el.chance!=null&&_rng()>el.chance){ addFloat(tx,bH*.3,sigIcon(sp)+' Resisted','#cccccc',12); VFX.resisted(tx); }
      else {
        const eff=effect({kind:'curse'});
        if(!eff.elem) eff.elem=el.elem;   // a curse's ticks meet wards as its element
        if(eff.type==='spellbind'){ eff.cat=mostUsedCat(ts); eff.name+=' '+ELEM_CATS[eff.cat].icon; }
        if(eff.type==='enthral') eff.call=action.call||'damage';
        if(addEffect(tgt,eff,who)){ if(fx.hit) fx.hit(ctx); else spawnParts(tx,wizMidY(tx),e.col,16); }
      }
      if(el.drainNow){ const d=Math.min(ts.mana,el.drainNow); ts.mana-=d; if(d) addFloat(tx,bH*.42,'−'+d+' Mana','#88aaff',12); }
      // A curse is a weak dispel too: it wears at the foe's ward (never strips buffs)
      // Warding stops that wear too, and isn't used up by it
      if(hasWard(ts)&&!effectsOf(ts,'warding').length) elemWardDispel(tgt,el.elem,Math.round(ELEM_CATS.dispel.power[action.tier-1]*ELEM_CURSE_DISPEL));
      combatTimeout(cb,700);
    });
    return;
  }
  // Instants
  const a=el.action;
  if(a.type==='heal') elemHeal(ally,a.amt);
  else if(a.type==='bloodpact'){ st.mana=Math.min(MAX_MANA,st.mana+a.mana); addFloat(x,bH*.3,'+'+a.mana+' Mana','#88aaff',13); }
  else if(a.type==='cleanse'){ elemCleanse(who,true); if(a.heal) elemHeal(who,a.heal); }
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

// A ward's bubble and its block / shatter sparks take its element's colour
function wardCol(st){ return st.shieldType?elemById(st.shieldType).col:'#4af0ff'; }
function raiseWard(who,elem,power,retaliate){
  const st=gs[who], el=elemById(elem);
  st.shield=ELEM_WARD_ROUNDS;
  st.shieldHp=power; st.shieldType=elem; st.wardRetaliate=retaliate; st.wardSig=null;
  addFloat(seatX(who),bH*.28,'🛡 '+el.name+' Ward '+power,el.col,14);
  VFX.wardRaise(seatX(who),el.col);
}
// unravel: a dispel took it down, so it comes apart in spiralling threads instead of shattering
function breakWard(st,x,unravel){
  const col=wardCol(st);
  st.shield=0; st.shieldHp=0; st.shieldType=null; st.wardRetaliate=0; st.wardSig=null;
  addFloat(x,bH*.24,unravel?'🛡 UNRAVELLED!':'🛡 SHATTERED!',col,18);
  (unravel?VFX.wardUnravelled:VFX.wardShatter)(x,col);
}
// Cleanse Self clears only the newest curse (so an older Agony can hide behind a fresh Silence);
// all: Mary's Purge clears every one
function elemCleanse(who,all){
  const st=gs[who], curses=all?cursesOf(st):cursesOf(st).slice(-1);
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
  if(ts.shieldHp<=0) breakWard(ts,tx,true);
  else VFX.wardUnravel(tx,wardCol(ts));
}
function elemDispelHit(tgt,elem,power,tier){
  const ts=gs[tgt], tx=seatX(tgt);
  // Warding (Eldrin's Ward) takes the dispel in place of the ward and every other buff
  const warding=effectsOf(ts,'warding');
  if(warding.length){ VFX.dispelHit(tx); removeEffects(tgt,warding,'✦ Ward takes the dispel'); return; }
  if(hasWard(ts)){ elemWardDispel(tgt,elem,power); return; }
  VFX.dispelHit(tx);
  const buffs=buffsOf(ts);
  if(!buffs.length){ addFloat(tx,bH*.3,'✦ Nothing to dispel','#ffaaff',12); return; }
  removeEffects(tgt,tier>=ELEM_DISPEL_ALL_TIER?buffs:[buffs[buffs.length-1]],'✦ Dispelled');
}

// Soak minions (Valdris's skeletons) stand in front of the ward: damage wears them down, oldest
// first, before anything reaches the ward. Dispels can't touch them (kind 'minion', not a buff).
// Soul Tithe: whoever kills them while cursed by their owner loses mana for each one.
function soakMinions(tgt,dmg){
  const ts=gs[tgt], tx=seatX(tgt);
  const wall=effectsOf(ts,'minion').filter(m=>m.soak);
  if(!wall.length||dmg<=0) return dmg;
  let soaked=0; const dead=[];
  for(const m of wall){
    if(dmg<=0) break;
    const d=Math.min(dmg,m.hp);
    m.hp-=d; dmg-=d; soaked+=d;
    if(m.hp<=0) dead.push(m);
  }
  if(dead.length){
    ts.effects=ts.effects.filter(e=>!dead.includes(e));
    syncMinionVisuals(ts);
    VFX.minionFall(tx,dead.length);
    const killer=dmgSource;
    if(killer&&killer!==tgt&&gs[killer]){
      const n=effectsOf(gs[killer],'tithe').filter(e=>e.from===tgt).reduce((a,e)=>a+e.n,0)*dead.length;
      const lost=Math.min(gs[killer].mana,n);
      if(lost>0){ gs[killer].mana-=lost; addFloat(seatX(killer),bH*.42,'🪙 Tithe −'+lost+' Mana','#aa88ff',12); }
    }
  }
  addFloat(tx,bH*.2,'💀 −'+soaked+(dead.length?' ('+dead.length+' fall'+(dead.length>1?'':'s')+')':''),'#ccccdd',12);
  return dmg;
}

// Damage that meets the target's skeletons, then its ward. Returns {hp, warded}.
// wear: {blocked,worn}, shared by the hits of one split strike (an arcane volley) so the ward
// wears exactly as it would from one big hit — rounding once, with the 1-point minimum once.
function elemIncoming(tgt,dmg,elem,icon,col,quiet,wear,strike){
  const ts=gs[tgt], tx=seatX(tgt);
  let warded=false;
  dmg=soakMinions(tgt,dmg);
  if(hasWard(ts)&&dmg>0){
    // The ward loses only its take share of what it stops, so a resistant ward stops more.
    // Crush: a Physical strike (not ticks or minions) ignores an off-element ward's resistance.
    const take=ELEM_WARD_TAKE[ts.shieldType===elem?'match':strike&&elem==='physical'&&ELEM_RIDERS.crush?'crush':'off'];
    const blocked=Math.min(dmg,Math.floor(ts.shieldHp/take));
    if(wear){
      wear.blocked+=blocked;
      const worn=Math.max(1,Math.ceil(wear.blocked*take));
      ts.shieldHp-=worn-wear.worn; wear.worn=worn;
    }
    else ts.shieldHp-=Math.max(1,Math.ceil(blocked*take));
    dmg-=blocked; warded=true;
    addFloat(tx,bH*.24,'🛡 −'+blocked+(take<1?' resisted':take>1?' unravels':' blocked'),wardCol(ts),12);
    VFX.wardBlock(tx,wardCol(ts));
    if(ts.shieldHp<=0) breakWard(ts,tx);
  }
  if(dmg>0){
    dealDmgToPlayer(tgt,dmg,tx,wizMidY(tgt));
    addFloat(tx,bH*.33,icon+' −'+dmg,col,16);
    if(!quiet) spawnParts(tx,wizMidY(tx),col,16);
  }
  return {hp:Math.max(0,dmg),warded};
}

// o: {elem,tier,power, lifesteal, dot, manaburn, recoil, arc, name, vfx (signature impact)}
// tgts: one seat, or several — a Greater strike in a 3–4 seat duel hits every foe (strikeTargets).
// Bewitch, the caster's boosts (Empower, Frenzy, Weave) and recoil apply once for the whole cast.
function elemStrike(who,tgts,o){
  const p=strikePrep(who,tgts,o);
  p.tgts.forEach(t=>strikeOne(who,t,o,p.b));
  if(o.recoil) elemFloatDmg(who,o.recoil,'💥','#ff6644');
}
// An arcane strike: resolved up front (dodge, Vanish, resistances — once for the whole strike),
// then each target's damage arrives as a volley of ARCANE_ORB_DMG-point hits, one per orb.
// Wards wear as from one hit, and the riders (mana burn, lifesteal, DoTs, retaliation) apply
// once, after the last orb. A Deathless save or a knock-out ends that target's volley.
function elemStrikeVolley(who,tgts,o,cb){
  const p=strikePrep(who,tgts,o), x=seatX(who), y=wizMidY(who);
  let left=p.tgts.length;
  p.tgts.forEach(t=>{
    const r=strikeResolve(who,t,o,p.b), ts=gs[t];
    const n=r.miss?1:Math.max(1,Math.ceil(r.dmg/ARCANE_ORB_DMG));
    const wear={blocked:0,worn:0}, hit={hp:0,warded:false};
    let dealt=0, stopped=false;
    ts.deathlessSaved=false;
    spawnArcaneVolley(x,y,seatX(t),wizMidY(t),n,i=>{
      if(r.miss||stopped) return;
      const chunk=Math.min(ARCANE_ORB_DMG,r.dmg-dealt); dealt+=chunk;
      if(chunk<=0) return;
      dmgSource=who;
      const h=strikeChunk(who,r,o,chunk,wear);
      hit.hp+=h.hp; hit.warded=hit.warded||h.warded;
      if(ts.hp<=0||ts.deathlessSaved) stopped=true;
      if(i<n-1&&!stopped) anim(t,'hit',250);
    },()=>{
      dmgSource=who;
      if(r.miss) strikeMiss(who,r,o);
      else strikeFinish(who,r,o,p.b,hit);
      if(--left===0){
        if(o.recoil) elemFloatDmg(who,o.recoil,'💥','#ff6644');
        cb();
      }
    });
  });
}
// Bewitch and the caster's boosts (Empower, Frenzy, Weave): once per cast
function strikePrep(who,tgts,o){
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
  return {tgts,b};
}
function strikeOne(who,tgt,o,b){
  const r=strikeResolve(who,tgt,o,b);
  if(r.miss) return strikeMiss(who,r,o);
  strikeFinish(who,r,o,b,strikeChunk(who,r,o,r.dmg));
}
// How much a strike deals this target, or how it misses. Rolls and spends, but draws nothing.
function strikeResolve(who,tgt,o,b){
  const ts=gs[tgt];
  let base=o.power;
  if(o.pctHp) base=Math.max(base,Math.round(ts.hp*o.pctHp));   // Nyxara: a share of this target's HP
  let dmg=(base*b.mult+b.bonus)*suddenDeathMult();
  if(tgt!==who){
    // Dodge rolls first, so a dodged strike leaves Vanish / Foresight waiting for the next one
    const dodge=effectsOf(ts,'dodge')[0];
    if(dodge&&_rng()<dodge.pct) return {tgt,miss:'dodge'};
    const absorb=takeEffect(ts,'absorbNext');
    if(absorb) return {tgt,miss:absorb.id==='vanish'?'vanish':'absorb'};
  }
  effectsOf(ts,'vuln').forEach(e=>{ dmg*=1+e.pct; });
  const resist=effectsOf(ts,'resist').filter(e=>!(e.magicOnly&&o.elem==='physical'))
    .reduce((m,e)=>Math.max(m,e.pct),0);
  return {tgt,dmg:Math.round(dmg*(1-resist))};
}
function strikeMiss(who,r,o){
  const tx=seatX(r.tgt);
  if(r.miss==='dodge'){ addFloat(tx,bH*.28,'💫 Dodged!','#b8a0e8',15); VFX.dodged(tx); }
  else {
    addFloat(tx,bH*.28,r.miss==='vanish'?'👻 Missed!':'🔮 Absorbed!','#ffcc44',15);
    if(r.miss==='vanish') VFX.vanished(tx); else VFX.absorbed(tx,elemById(o.elem).col);
  }
  anim(who,'cast',600);
}
// One hit of a strike's damage (the whole of it, or one orb's share of an arcane volley)
function strikeChunk(who,r,o,dmg,wear){
  const el=elemById(o.elem);
  return elemIncoming(r.tgt,dmg,o.elem,el.icon,el.col,true,wear,true);
}
// The element riders of a strike that reached HP (see ELEM_RIDERS). Signature strikes get them too,
// except that one with its own DoT doesn't also scorch.
function elemStrikeRiders(who,tgt,o){
  const tier=o.tier||2, ts=gs[tgt];
  if(o.elem==='ice'&&o.chill&&tier>=ELEM_CHILL_MIN_TIER){
    addEffect(tgt,{id:'chill',type:'lock',cat:'damage',kind:'curse',name:'Chilled',icon:'❄️',rounds:ELEM_LOCK_ROUNDS},who);
    return;
  }
  if(tier<ELEM_RIDER_MIN_TIER) return;
  const risk=(id,cat,name,icon)=>{
    if(ELEM_RIDERS[id]&&!catLocked(tgt,cat))
      addEffect(tgt,{id,type:'risk',cat,pct:ELEM_RISK_PCT[id],kind:'curse',name,icon,rounds:ELEM_LOCK_ROUNDS},who);
  };
  if(o.elem==='ice') risk('frostbite','damage','Frostbitten','🥶');
  if(o.elem==='dark') risk('dread','protect','Dread','😱');
  if(o.elem==='fire'&&ELEM_RIDERS.scorch&&!o.dot)
    addEffect(tgt,Object.assign({id:'dot-scorch',type:'dot',kind:'curse',elem:'fire',name:'Scorched',icon:'🔥'},ELEM_SCORCH[Math.min(3,tier)-1]),who);
  if(o.elem==='arcane'&&ELEM_RIDERS.unweave&&tgt!==who){
    // Middle ring: a round off the newest timed buff; outer ring: a round off every one
    const timed=ts.effects.filter(e=>e.kind==='buff'&&e.rounds!=null&&e.rounds>0);
    const hit=tier>=3?timed:timed.slice(-1);
    if(hit.length){
      hit.forEach(e=>e.rounds--);
      const gone=hit.filter(e=>e.rounds<=0);
      ts.effects=ts.effects.filter(e=>!gone.includes(e));
      if(gone.length) syncMinionVisuals(ts);
      addFloat(seatX(tgt),bH*.3,'🌀 Unweave: '+hit.map(e=>e.icon).join(' ')+' −1','#cc88ff',12);
      VFX.stripped(seatX(tgt));
    }
  }
}
// After the damage: impact look, riders, mana burn, arcs and retaliation — once per strike
function strikeFinish(who,r,o,b,hit){
  const tgt=r.tgt, ts=gs[tgt], tx=seatX(tgt), el=elemById(o.elem);
  const burn=(o.elem==='lightning'?ELEM_LIGHTNING_BURN[(o.tier||2)-1]:0)+b.burn;
  const ctx=vfxCtx(who,tgt);
  if(o.vfx) o.vfx(ctx);
  else { ELEM_IMPACT_VFX[o.elem](ctx,b.emp?38:22,r.dmg); vfxStrikeAnim(who,tgt); }
  if(hit.hp>0){
    if(o.lifesteal){   // only what got past skeletons and the ward feeds the drain
      const heal=Math.round(hit.hp*o.lifesteal);
      if(heal>0){ elemHeal(who,heal,'🩸'); VFX.lifesteal(who,tgt,heal,o.siphon); }
    }
    if(o.dot) addEffect(tgt,Object.assign({id:'dot-'+(o.name||o.elem),type:'dot',kind:'curse',elem:o.elem,name:o.name||el.name,icon:el.icon},o.dot),who);
    elemStrikeRiders(who,tgt,o);
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
    let back=0, orbs=0;
    sources.forEach(r=>{
      // Counter hits back with an arcane strike's orb volley, so the striker sees it land
      if(r.id==='counter'){ orbs+=r.n; return; }
      back+=r.n; const f=VFX.retaliate[r.id]; if(f) f(tx,seatX(who));
    });
    if(back>0){ const src=dmgSource; dmgSource=tgt; elemFloatDmg(who,back,'↩️','#ff8844'); dmgSource=src; }
    if(orbs>0) counterVolley(tgt,who,orbs);
  }
}

// Counter's retaliation as an arcane orb volley from `from` back at the striker `to`. The damage
// is dealt at once (resolution and knock-outs stay in step); the flinch and number show as the orbs land.
function counterVolley(from,to,n){
  const src=dmgSource; dmgSource=from;
  dealDmgToPlayer(to,n,seatX(to),wizMidY(to));
  dmgSource=src;
  const ctx=vfxCtx(from,to), orbs=Math.max(1,Math.ceil(n/ARCANE_ORB_DMG));
  anim(from,'cast',600);
  spawnArcaneVolley(ctx.cx,ctx.cy,ctx.tx,ctx.ty,orbs,i=>{
    if(i<orbs-1) anim(to,'hit',250);
  },()=>{
    ELEM_IMPACT_VFX.arcane(ctx,16,n);
    anim(to,'hit',800);
    addFloat(seatX(to),bH*.36,'↩️ −'+n,'#4499ff',13);
  });
}

// Round-end effects on `who` (Elemental rules): DoTs, regen, the foe's minions, then durations tick down
function elemTickEffects(who){
  const st=gs[who], x=seatX(who);
  effectsOf(st,'dot').forEach(e=>{
    dmgSource=e.from;
    e.tick=(e.tick||0)+1;
    const dmg=Math.round((e.ramp?e.ramp[Math.min(e.tick,e.ramp.length)-1]:e.dmg)*suddenDeathMult());
    // Ticks hit a ward first, like any damage — unless the effect seeps past wards (Caustic Bomb's poison)
    if(e.bypassWard||(!hasWard(st)&&!effectsOf(st,'minion').some(m=>m.soak))){
      if(e.bypassWard&&hasWard(st)) addFloat(x,bH*.3,e.icon+' Seeps past the ward!','#99dd55',11);
      elemFloatDmg(who,dmg,e.icon,'#cc88ff');
    }
    else elemIncoming(who,dmg,e.elem||'arcane',e.icon,'#cc88ff',true);
    const tick=TICK_VFX[e.id]||TICK_VFX[e.elem];
    if(tick) tick(x,wizMidY(x));
    if(e.manaDrain){ const d=Math.min(st.mana,e.manaDrain); st.mana-=d; if(d) addFloat(x,bH*.46,'−'+d+' Mana','#88aaff',11); }
  });
  effectsOf(st,'regen').forEach(e=>{
    if(st.hp<=0) return;
    elemHeal(who,e.perRound,e.icon);
    (TICK_VFX[e.id]||TICK_VFX.regen)(x,wizMidY(x));
  });
  activeSeats().filter(o=>o!==who&&minionTarget(o)===who).forEach(owner=>{
    effectsOf(gs[owner],'minion').forEach(m=>{
      const el=elemById(m.elem||'physical');
      dmgSource=owner;
      elemIncoming(who,Math.round(m.dmg*suddenDeathMult()),m.elem||'physical',m.icon,el.col,true);
      if(MINION_VFX[m.minion]) MINION_VFX[m.minion](x,wizMidY(x));
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
function incomeDrainOf(who){ return effectsOf(gs[who],'incomeDrain').reduce((a,e)=>a+e.n,0); }
function elemIncome(who){
  return Math.max(0,ELEM_INCOME-incomeDrainOf(who))+suddenDeathMana();
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
// Soak minions (Valdris's skeletons): the signature spell that raises them, and how many stand
function guardSpell(who){ return sigSpells(who,'protect').find(sp=>sp.el.effect&&sp.el.effect.type==='minion'&&sp.el.effect.soak); }
function guardCount(st){ return effectsOf(st,'minion').filter(m=>m.soak).length; }
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
    if(a.type==='cleanse') return cleansableCurses(st).length>0;
    if(a.type==='siphon') return ts.mana>=3;
  }
  return true;
}
// Enthral's call: read the foe's next pick from the same pressures that steer the AI's own picks.
// Easy guesses at random; Normal leans toward the likeliest pick without becoming predictable.
function aiEnthralCall(who,tgt,smart){
  if(!smart) return ENTHRAL_CALLS[Math.floor(_rng()*ENTHRAL_CALLS.length)];
  const me=gs[who], ts=gs[tgt];
  const w={damage:1.0, protect:0.55, dispel:0.15};
  if(hasWard(me)){ w.dispel+=1.5; w.damage=0.5; }
  else if(buffsOf(me).length) w.dispel+=0.9;
  if(cleansableCurses(ts).length) w.dispel+=0.5;
  if(ts.effects.some(e=>e.type==='empower'||e.type==='frenzy'||e.type==='weave')) w.damage+=0.9;
  if(hasWard(ts)&&ts.shieldHp>=15) w.protect=0.2;
  else {
    if(me.mana+elemIncome(who)>=elemCost(who,'damage',2)) w.protect+=0.35;
    if(ts.hp<ts.maxHp*0.35) w.protect+=0.35;
  }
  // Habits: what they've cast most this duel
  const casts=ENTHRAL_CALLS.reduce((a,c)=>a+(ts.catCounts[c]||0),0);
  if(casts) ENTHRAL_CALLS.forEach(c=>{ w[c]*=0.5+1.5*(ts.catCounts[c]||0)/casts; });
  ENTHRAL_CALLS.forEach(c=>{ w[c]=catLocked(tgt,c)?0:Math.pow(w[c]/(1+spellbindExtra(tgt,c)/4),2); });
  let r=_rng()*ENTHRAL_CALLS.reduce((a,c)=>a+w[c],0);
  return ENTHRAL_CALLS.find(c=>(r-=w[c])<=0)||'damage';
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
  const oppWard=hasWard(opp), oppBuffs=buffsOf(opp).length, myCurses=cleansableCurses(me).length;
  // Meditate when short of mana, more readily when the foe can't afford a strike or my ward, buffs
  // and curses are doing the work for me — and less when I'm close to dying
  // Income drains shrink the gain, and Candle burns a wizard who meditates
  const medGain=meditateGain(who);
  // Agony bites anything but a Meditate: rest through it whenever allowed (not two rounds running).
  // Even a light Agony is worth it — the rest dodges the hit and banks mana (tested in the sim)
  const agonyOn=effectsOf(me,'agony')[0];
  if(agonyOn&&canMeditate(who)&&!agonyBites(who,{cat:'meditate'})&&_rng()<(smart?0.7:0.35))
    return {type:'el',cat:'meditate',ok:true};
  if(canMeditate(who)&&medGain>0&&me.mana<elemCost(who,'damage',2)){
    let p=(me.mana<elemCost(who,'damage',1)?0.4:0.2)*medGain/MEDITATE.gain;
    if(!foesOf(who).some(f=>gs[f].mana>=elemCost(f,'damage',1))) p+=0.3;
    if(hasWard(me)&&me.shieldHp>=15) p+=0.15;
    p+=Math.min(0.2,0.1*(buffsOf(me).length+cursesOf(opp).length));
    if(me.hp<me.maxHp*0.3) p*=0.5;
    if(effectsOf(me,'candle').length) p*=smart?0.2:0.5;
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
  // Called shots (Enthral) are easiest while my ward invites a dispel, or a Spellbind already steers their pick
  const callShot=smart&&sigSpells(who,'dispel').some(sp=>sp.el.effect&&sp.el.effect.type==='enthral'&&!sigBlocked(who,sp,1)&&aiSigSensible(who,sp,tgt));
  if(callShot&&(hasWard(me)||effectsOf(opp,'spellbind').length)) w.dispel+=0.5;
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
  // Keep a screen of skeletons up; batter through the foe's (dispels can't touch them)
  const guardSp=guardSpell(who), myGuards=guardCount(me), oppGuards=guardCount(opp);
  if(guardSp&&myGuards<=2) w.protect+=smart?1.2:0.6;
  if(oppGuards){ w.damage+=(smart?0.25:0.1)*oppGuards; if(!oppWard) w.dispel*=0.5; }
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
    if(e.type==='warding'&&hasWard(me)&&!effectsOf(me,'warding').length) v+=2;
    if(e.extend&&hasWard(me)) v+=2;   // Counter holds a standing ward up longer   // Ward takes the next dispel for the ward
    if(sp===siphon&&(siphonNow||cover.length)) v+=2;
    if(e.type==='enthral'&&(hasWard(me)||effectsOf(opp,'spellbind').length)) v+=2;
    return v;
  };
  const combo=sigs.some(x=>sigWeight(x.sp)>1);
  let choice=null;
  // A plain dispel with no ward or buff to hit does nothing: cast a curse instead when there's one to cast
  const idleDispel=cat==='dispel'&&!oppWard&&!oppBuffs;
  const guardSec=cat==='protect'&&guardSp&&myGuards<=2&&sigs.find(x=>x.sp===guardSp);
  if(guardSec&&_rng()<(smart?0.85:0.5)) choice=guardSec;
  else if(sigs.length&&(!plain.length||idleDispel||_rng()<(smart?(combo?0.8:0.45):0.3))){
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
  if(choice.sp&&choice.sp.el.effect&&choice.sp.el.effect.type==='enthral') pick.call=aiEnthralCall(who,aimTgt,smart);
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
    document.getElementById('retry-portrait').src='portraits/small/'+p2Key+'.jpg';
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
  const px=seatX('p1'), py=bH*0.65;
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
  startBattleLoop();
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
    gs.parts=[]; gs.floats=[]; gs.projs=[]; gs.beams=[]; gs.wardUnravels=[]; gs.siphons=[]; gs.fireballs=[]; gs.explosions=[]; gs.iceCrystals=[]; gs.iceShards=[]; gs.boulders=[]; gs.storms=[]; gs.quake=null;
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
  startBattleLoop();
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
// Every sequence glyph stays on screen for at least MG_GLYPH_MS (half the watch window).
const MG_GLYPH_MS=MG_WATCH_MS/2;
// Stagger n glyph spawns across the watch window, leaving `tail` ms to study the last one.
function mgSpawnInterval(n,delay,tail){ return n>1?(MG_WATCH_MS-delay-tail)/(n-1):0; }

// ── MINIGAME END MOMENT (shared) ───────────────────────────
// Every casting minigame ends through mgEnd: instead of cutting straight back to the
// battle, it holds the last frame for a moment so the player can see what happened.
// Failure: the canvas greys out and shakes, the wrong key flashes red, the key that was
// wanted pulses gold, the slot row reveals the rest of the sequence, and a FIZZLED banner
// says why. Success: a short gold flash and SPELL WOVEN.
const MG_SYMS=['ϟ','Δ','∇','Ψ','Ω','∞','☽','✸','⊕','⊗','θ','Φ'];
const MG_FAIL_MS=1300, MG_WIN_MS=750;
const MG_SLOT=26, MG_SLOT_GAP=6;
const MG_REASONS={
  wrong:'Wrong rune!', forbidden:"Not this spell's rune!",
  timeout:'Too slow!', strikes:'Too many mismatches!',
};
let mgSlotPop={n:0,t:0};

function mgSlotX(cw,n,i){ return cw/2-(n*MG_SLOT+(n-1)*MG_SLOT_GAP)/2+i*(MG_SLOT+MG_SLOT_GAP); }
function mgSlotY(tileTop){ return tileTop-MG_SLOT-8; }

// One slot of the sequence row. state: empty | done | wrong | answer | missed
// accent tints the in-game row to the spell's colours (gold by default).
function mgDrawSlot(x,y,sym,state,scale,alpha,accent){
  const S=MG_SLOT, cx=x+S/2, cy=y+S/2;
  const ac=accent||'#ffcc00';
  const st={
    empty: {bg:'#120e0a',edge:ac+'55',txt:null,glow:0},
    done:  {bg:accent?'#10141c':'#3a2a00',edge:ac,txt:accent?'#ffffff':'#ffe680',glow:8},
    wrong: {bg:'#3a0505',edge:'#ff3333',txt:'#ff6666',glow:10},
    answer:{bg:'#14141c',edge:'rgba(255,255,255,0.35)',txt:'rgba(255,255,255,0.75)',glow:0},
    missed:{bg:'#3a0505',edge:'#ff3333',txt:'rgba(255,255,255,0.75)',glow:10},
  }[state];
  mx.save();
  mx.globalAlpha=alpha==null?1:alpha;
  mx.translate(cx,cy); mx.scale(scale||1,scale||1);
  mx.shadowColor=st.edge; mx.shadowBlur=st.glow;
  mx.fillStyle=st.bg;
  mx.beginPath(); mx.roundRect(-S/2,-S/2,S,S,4); mx.fill();
  mx.shadowBlur=0;
  mx.strokeStyle=st.edge; mx.lineWidth=1.5;
  mx.beginPath(); mx.roundRect(-S/2,-S/2,S,S,4); mx.stroke();
  if(sym&&st.txt){
    mx.fillStyle=st.txt;
    mx.font='bold 17px serif';
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.fillText(sym,0,1);
  }
  if(state==='wrong'){ // strike through the wrong glyph
    mx.strokeStyle='#ff3333'; mx.lineWidth=2.5; mx.lineCap='round';
    mx.beginPath(); mx.moveTo(-S/2+5,S/2-5); mx.lineTo(S/2-5,-S/2+5); mx.stroke();
  }
  mx.restore();
}

// The sequence row above the keyboard, drawn every input frame: entered glyphs fill in gold
// (the newest pops in), the rest wait as empty slots.
function mgDrawSlots(seq,playerSeq,cw,tileTop,accent){
  const n=playerSeq.length, now=performance.now();
  if(n!==mgSlotPop.n) mgSlotPop={n,t:n>mgSlotPop.n?now:0};
  const y=mgSlotY(tileTop);
  for(let i=0;i<seq.length;i++){
    let scale=1;
    if(i===n-1&&mgSlotPop.t){
      const k=Math.min(1,(now-mgSlotPop.t)/220);
      scale=1+0.35*(1-k);
    }
    mgDrawSlot(mgSlotX(cw,seq.length,i),y,i<n?MG_SYMS[playerSeq[i]]:null,i<n?'done':'empty',scale,1,accent);
  }
}

function mgDrawKey(x,y,TS,sym,bg,edge,txt,glow){
  mx.save();
  mx.shadowColor=edge; mx.shadowBlur=glow;
  mx.fillStyle=bg;
  mx.beginPath(); mx.roundRect(x,y,TS,TS,5); mx.fill();
  mx.shadowBlur=0;
  mx.strokeStyle=edge; mx.lineWidth=2.5;
  mx.beginPath(); mx.roundRect(x,y,TS,TS,5); mx.stroke();
  mx.fillStyle=txt; mx.shadowColor=txt; mx.shadowBlur=glow*0.6;
  mx.font=`bold ${Math.round(TS*.42)}px serif`;
  mx.textAlign='center'; mx.textBaseline='middle';
  mx.fillText(sym,x+TS/2,y+TS/2);
  mx.restore();
}

// Big banner text on a dark band.
function mgBanner(cw,y,text,col,sub,e,start){
  const k=Math.max(0,Math.min(1,(e-start)/200));
  if(k<=0) return;
  const scale=1.4-0.4*k;
  mx.save();
  mx.globalAlpha=k*0.75; mx.fillStyle='#000';
  mx.fillRect(0,y-24,cw,sub?52:48);
  mx.globalAlpha=k;
  mx.translate(cw/2,y); mx.scale(scale,scale);
  mx.fillStyle=col; mx.shadowColor=col; mx.shadowBlur=16;
  mx.font='bold 26px Cinzel,serif';
  mx.textAlign='center'; mx.textBaseline='middle';
  mx.fillText(text,0,sub?-5:0);
  if(sub){
    mx.shadowBlur=4; mx.fillStyle='#ffd0c0';
    mx.font='bold 10px Cinzel,serif';
    mx.fillText(sub,0,15);
  }
  mx.restore();
}

// Pick the gap between keyboard rows furthest from the highlighted keys, so the banner
// never hides the wrong key or the wanted one.
function mgBannerY(info,keys){
  if(!info.tPos) return info.bannerY||info.ch/2;
  const {TS,tileTop}=info, step=TS+(info.tPos[3].y-info.tPos[0].y-TS);
  let best=tileTop+2*step, bestD=-1;
  for(let r=1;r<=3;r++){
    const gy=tileTop+r*step-(step-TS)/2;
    const d=keys.length?Math.min(...keys.map(ai=>Math.abs(info.tPos[ai].y+TS/2-gy))):0;
    if(d>bestD){bestD=d;best=gy;}
  }
  return best;
}

function mgDrawFail(info,snap,e,expect){
  const {cw,ch}=info;
  const dim=Math.min(1,e/250);
  const shake=e<320?(1-e/320)*5:0;
  mx.save();
  mx.fillStyle='#000'; mx.fillRect(0,0,cw,ch);
  mx.filter=`grayscale(${dim})`;
  mx.drawImage(snap,shake*Math.sin(e*0.09),shake*0.5*Math.cos(e*0.13),cw,ch);
  mx.filter='none';
  mx.fillStyle=`rgba(0,0,0,${0.5*dim})`; mx.fillRect(0,0,cw,ch);
  const vg=mx.createRadialGradient(cw/2,ch/2,ch*0.25,cw/2,ch/2,ch*0.75);
  vg.addColorStop(0,'rgba(200,0,0,0)');
  vg.addColorStop(1,`rgba(200,0,0,${0.45*dim})`);
  mx.fillStyle=vg; mx.fillRect(0,0,cw,ch);
  mx.restore();

  const keys=[];
  if(info.tPos){
    const {tPos,TS}=info;
    // The key that was wanted pulses gold
    if(expect>=0){
      keys.push(expect);
      const a=Math.min(1,Math.max(0,(e-150)/200));
      if(a>0){
        const p=0.6+0.4*Math.sin(e/90);
        mx.save(); mx.globalAlpha=a;
        mgDrawKey(tPos[expect].x,tPos[expect].y,TS,MG_SYMS[expect],'#3a2a00','#ffcc00','#ffe680',10+14*p);
        mx.restore();
      }
    }
    // The wrong key flashes red, shakes and is crossed out
    const w=info.wrongAi;
    if(w!=null&&w>=0){
      keys.push(w);
      const jx=e<450?Math.sin(e*0.12)*6*(1-e/450):0;
      const tp=tPos[w], flash=e<300&&Math.floor(e/75)%2===0;
      mgDrawKey(tp.x+jx,tp.y,TS,MG_SYMS[w],flash?'#aa1111':'#4a0808','#ff3333','#ff8888',16);
      mx.save();
      mx.strokeStyle='#ff3333'; mx.lineWidth=4; mx.lineCap='round';
      mx.shadowColor='#ff0000'; mx.shadowBlur=8;
      const m=14;
      mx.beginPath();
      mx.moveTo(tp.x+jx+m,tp.y+m); mx.lineTo(tp.x+jx+TS-m,tp.y+TS-m);
      mx.moveTo(tp.x+jx+TS-m,tp.y+m); mx.lineTo(tp.x+jx+m,tp.y+TS-m);
      mx.stroke(); mx.restore();
    }
    // Slot row: what was entered, where it broke, and the rest of the answer
    if(info.seq){
      const {seq,playerSeq,tileTop}=info, n=playerSeq.length;
      mx.save(); mx.fillStyle='rgba(8,2,2,0.92)'; mx.fillRect(0,0,cw,tileTop-3); mx.restore();
      const y=mgSlotY(tileTop), reveal=Math.min(1,Math.max(0,(e-400)/250));
      for(let i=0;i<seq.length;i++){
        const x=mgSlotX(cw,seq.length,i);
        if(i<n) mgDrawSlot(x,y,MG_SYMS[playerSeq[i]],'done',1);
        else if(i===n&&w!=null&&w>=0) mgDrawSlot(x,y,MG_SYMS[w],'wrong',1);
        else if(i===n){
          // Timed out here: blink, then show the glyph that was wanted
          const on=reveal>0||Math.floor(e/160)%2===0;
          mgDrawSlot(x,y,reveal>0?MG_SYMS[seq[i]]:null,on?'missed':'empty',1);
        }
        else mgDrawSlot(x,y,MG_SYMS[seq[i]],reveal>0?'answer':'empty',1,reveal>0?reveal:1);
      }
    }
  }
  // Why it failed, in place of the status line
  mx.save();
  mx.fillStyle='#ff5544'; mx.shadowColor='#ff0000'; mx.shadowBlur=6;
  mx.font='bold 11px Cinzel,serif';
  mx.textAlign='center'; mx.textBaseline='top';
  mx.fillText(MG_REASONS[info.reason]||'The ritual breaks!',cw/2,info.tPos?4:info.ch-18);
  mx.restore();
  mgBanner(cw,mgBannerY(info,keys),'FIZZLED','#ff5533','The ritual breaks',e,300);
}

function mgDrawWin(info,snap,e,dur){
  const {cw,ch}=info;
  mx.drawImage(snap,0,0,cw,ch);
  if(info.seq){
    const {seq,tileTop}=info;
    for(let i=0;i<seq.length;i++){
      const k=Math.min(1,Math.max(0,(e-i*60)/220));
      mgDrawSlot(mgSlotX(cw,seq.length,i),mgSlotY(tileTop),MG_SYMS[seq[i]],'done',1+0.3*Math.sin(k*Math.PI));
    }
  }
  const f=Math.max(0,1-e/(dur*0.7));
  const g=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,ch*0.7);
  g.addColorStop(0,`rgba(255,230,140,${0.55*f})`);
  g.addColorStop(1,`rgba(255,200,0,${0.15*f})`);
  mx.fillStyle=g; mx.fillRect(0,0,cw,ch);
  mgBanner(cw,mgBannerY(info,[]),'SPELL WOVEN','#ffcc33',null,e,60);
}

// Hold the minigame canvas for the end moment, then return to the battle.
// info: {cw, ch, reason, and for glyph games: seq, playerSeq, tPos, TS, tileTop, wrongAi;
// or bannerY for layouts without a keyboard}. Runs on mazeRAF so the training-mode exit
// button still cancels it.
function mgEnd(ok,info,cb){
  const snap=document.createElement('canvas');
  snap.width=mc.width; snap.height=mc.height;
  snap.getContext('2d').drawImage(mc,0,0);
  const dur=ok?MG_WIN_MS:MG_FAIL_MS;
  const expect=!ok&&info.seq?info.seq[info.playerSeq.length]:-1;
  if(!ok){
    if(info.reason==='timeout') document.getElementById('pztimer').classList.add('urgent');
    try{ if(navigator.vibrate) navigator.vibrate([70,50,110]); }catch(err){}
  }
  const t0=performance.now();
  function frame(){
    const e=performance.now()-t0;
    if(e>=dur){ mazeRAF=null; puzzleFinish(ok,cb); return; }
    if(ok) mgDrawWin(info,snap,e,dur); else mgDrawFail(info,snap,e,expect);
    mazeRAF=requestAnimationFrame(frame);
  }
  mazeRAF=requestAnimationFrame(frame);
}

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
      if(timeLeft<=0) finish(false,'timeout');
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
          if(strikes>=MAX_STRIKES) finish(false,'strikes');
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
  function finish(ok,reason){
    if(done)return;done=true;cleanup();const perf=strikes===0;
    mgEnd(ok,{cw,ch,reason,bannerY:CY},r=>cb(r,perf));
  }

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
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const RISE_SPD=0.054,FADE_IN=300; // px/ms; time-based so refresh rate can't speed it up
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;
  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:xSlots[i],y:ch-20,spawnAt:SPAWN_DELAY+i*SPAWN_INTERVAL,idx:i,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai); // wrong glyph in hard = fail
          return;                              // easy/normal: silently ignore
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

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
        const age=elapsed-s.spawnAt;
        if(age<0) return;
        s.y=ch-20-age*RISE_SPD;
        let alpha=Math.min(1,age/FADE_IN);
        if(s.y<55) alpha=Math.min(alpha,Math.max(0,s.y/55));
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

      // Sequence slots — sit between status text and keyboard
      mgDrawSlots(seq,playerSeq,cw,tileTop);
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ROCKFALL PATTERN (Physical) ────────────────────
// Rune-carved boulders drop from the cave roof and slam into the floor, then rest there.
function launchRockfallPattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Stone Rune Fall';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff'},{sym:'Δ',glowCol:'#ff9944'},{sym:'∇',glowCol:'#44aaff'},
    {sym:'Ψ',glowCol:'#aaff88'},{sym:'Ω',glowCol:'#ff4444'},{sym:'∞',glowCol:'#44ffcc'},
    {sym:'☽',glowCol:'#aaddff'},{sym:'✸',glowCol:'#ffff55'},{sym:'⊕',glowCol:'#ffee77'},
    {sym:'⊗',glowCol:'#ff44aa'},{sym:'θ',glowCol:'#88ff88'},{sym:'Φ',glowCol:'#dd88ff'},
  ];

  // Physical owns Δ(1) ∇(2) Ψ(3) ⊕(8) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[1,2,3,8];
  // Stone colours assigned per SPELL_IDX position (0-3)
  const STONE_COLS=[
    {col:'#7a5a36',lit:'#e0b070'},
    {col:'#5c4a3a',lit:'#c8a888'},
    {col:'#6b5530',lit:'#d8b060'},
    {col:'#8a6a40',lit:'#f0c880'},
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

  // Easy: prefix of the canonical Physical word: Δ ∇ Ψ ⊕
  const seq=mgSeq(spell,[1,2,3,8],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  const FLOOR_Y=ch-40;
  // Noise pebbles — all 12 arcana glyphs tumble down in dull stone colours (px/ms)
  const NOISE_COLS=['#5a4a3a','#6b5a44','#4a3e32','#7a6650','#554433'];
  function newPebble(y){
    return {x:_rng()*cw, y, vy:0.05+_rng()*0.12, sz:9+_rng()*11, ai:Math.floor(_rng()*12),
      col:NOISE_COLS[Math.floor(_rng()*5)], rot:_rng()*Math.PI*2, spin:(_rng()-.5)*0.006, alpha:0.2+_rng()*0.3};
  }
  const noise=Array.from({length:30},()=>newPebble(_rng()*FLOOR_Y));
  const dust=[], cracks=[];
  function spawnDust(x,n,big){
    for(let i=0;i<n;i++){
      const a=Math.PI+_rng()*Math.PI, sp=(big?0.06:0.03)+_rng()*(big?0.12:0.05);
      dust.push({x:x+(_rng()-.5)*(big?40:10),y:FLOOR_Y-2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
        sz:(big?3:1.5)+_rng()*(big?5:2),life:1,dec:(big?0.0012:0.002)+_rng()*0.001});
    }
  }
  function addCrack(x){
    for(let side=-1;side<=1;side+=2){
      let px=x,py=FLOOR_Y;
      const arm=[{x:px,y:py}];
      for(let k=0;k<4;k++){ px+=side*(5+_rng()*9); py+=2+_rng()*6; arm.push({x:px,y:py}); }
      cracks.push(arm);
    }
  }

  // Sequence boulders — fall under gravity, slam into the floor, then rest there.
  // Landing spots are shuffled, so the order has to be read from the drops (and badges), not left to right.
  const xSlots=Array.from({length:SEQ_LEN},(_,i)=>{
    const frac=(i+0.5)/SEQ_LEN;
    return Math.max(30,Math.min(cw-30,cw*frac+(_rng()-0.5)*16));
  });
  for(let i=xSlots.length-1;i>0;i--){ const j=Math.floor(_rng()*(i+1)); [xSlots[i],xSlots[j]]=[xSlots[j],xSlots[i]]; }
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const ROCK_R=26, START_Y=-ROCK_R-4, REST_Y=FLOOR_Y-ROCK_R+4;
  const FALL_MS=550, GRAV=2*(REST_Y-START_Y)/(FALL_MS*FALL_MS);   // px/ms²
  const BOUNCE_MS=220, SHAKE_MS=300, QUAKE_PX=3.5;
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false, shakeAt=-1e9, lastT=startTime;
  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:xSlots[i],y:START_Y,spawnAt:SPAWN_DELAY+i*SPAWN_INTERVAL,idx:i,landed:false,
    tilt:(_rng()-.5)*0.25, wob:0,
    rock:Array.from({length:9},(_,k)=>({a:k/9*Math.PI*2+(_rng()-.5)*0.3, r:ROCK_R*(0.82+_rng()*0.3)})),
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai); // wrong glyph in hard = fail
          return;                              // easy/normal: silently ignore
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

  function drawRock(s,alpha){
    mx.save();
    mx.globalAlpha=alpha;
    mx.translate(s.x,s.y); mx.rotate(s.tilt+s.wob);
    mx.beginPath();
    s.rock.forEach((p,k)=>{const px=Math.cos(p.a)*p.r,py=Math.sin(p.a)*p.r; k?mx.lineTo(px,py):mx.moveTo(px,py);});
    mx.closePath();
    const rg=mx.createRadialGradient(-8,-10,2,0,0,ROCK_R*1.1);
    rg.addColorStop(0,'#8a7a66'); rg.addColorStop(0.6,'#4e4236'); rg.addColorStop(1,'#2a221a');
    mx.fillStyle=rg; mx.fill();
    mx.strokeStyle='#1a140e'; mx.lineWidth=2; mx.stroke();
    // Carved rune — white with the glyph's glow
    mx.rotate(-s.tilt*0.5);
    mx.shadowColor=s.glowCol; mx.shadowBlur=24;
    mx.fillStyle='#ffffff';
    mx.font='bold 32px serif';
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.fillText(s.sym,0,1);
    mx.restore();
  }

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;
    const dt=Math.min(50,t-lastT); lastT=t;

    // Background — dim cave
    const bg=mx.createRadialGradient(cw/2,ch*.45,0,cw/2,ch*.45,cw*.95);
    bg.addColorStop(0,'#2a2018');
    bg.addColorStop(0.6,'#16100b');
    bg.addColorStop(1,'#070504');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    if(phase==='watch'){
      // Earthquake — a constant rumble that surges in waves, plus a jolt on each impact (decays over SHAKE_MS)
      const sinceShake=elapsed-shakeAt;
      const jolt=sinceShake<SHAKE_MS?7*(1-sinceShake/SHAKE_MS):0;
      const quake=QUAKE_PX*(0.55+0.45*Math.sin(elapsed/420)*Math.sin(elapsed/1130));
      mx.save();
      mx.translate(Math.sin(elapsed/23)*quake+(_rng()-.5)*jolt*2,
                   Math.sin(elapsed/31+1.7)*quake*0.6+(_rng()-.5)*jolt);

      // Floor
      const fg=mx.createLinearGradient(0,FLOOR_Y,0,ch);
      fg.addColorStop(0,'#5a4632'); fg.addColorStop(0.15,'#3a2c1e'); fg.addColorStop(1,'#1a120a');
      mx.fillStyle=fg; mx.fillRect(-10,FLOOR_Y,cw+20,ch-FLOOR_Y+10);
      mx.strokeStyle='#8a6a48'; mx.lineWidth=1.5;
      mx.beginPath(); mx.moveTo(-10,FLOOR_Y); mx.lineTo(cw+10,FLOOR_Y); mx.stroke();
      mx.strokeStyle='#0e0904'; mx.lineWidth=1.5;
      cracks.forEach(arm=>{ mx.beginPath(); arm.forEach((p,k)=>k?mx.lineTo(p.x,p.y):mx.moveTo(p.x,p.y)); mx.stroke(); });

      // Falling pebble noise
      mx.save();
      noise.forEach(f=>{
        f.vy+=0.0004*dt; f.y+=f.vy*dt; f.rot+=f.spin*dt;
        if(f.y>FLOOR_Y-f.sz*0.4){ spawnDust(f.x,2,false); Object.assign(f,newPebble(-20)); }
        mx.save();
        mx.globalAlpha=f.alpha;
        mx.translate(f.x,f.y); mx.rotate(f.rot);
        mx.fillStyle=f.col; mx.shadowColor='#000'; mx.shadowBlur=3;
        mx.font=`bold ${f.sz}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[f.ai].sym,0,0);
        mx.restore();
      });
      mx.restore();

      // Sequence boulders
      symStates.forEach(s=>{
        const age=elapsed-s.spawnAt;
        if(age<0) return;
        if(age<FALL_MS){
          s.y=START_Y+0.5*GRAV*age*age;
        } else {
          if(!s.landed){ s.landed=true; shakeAt=elapsed; spawnDust(s.x,16,true); addCrack(s.x); }
          const b=age-FALL_MS;
          s.y=REST_Y-(b<BOUNCE_MS?Math.sin(Math.PI*b/BOUNCE_MS)*10*(1-b/BOUNCE_MS):0);
          s.wob=Math.sin(elapsed/55+s.idx*2.1)*0.05;   // rattles in the quake
        }
        // Shadow on the floor grows as the boulder nears it
        const near=Math.max(0,Math.min(1,(s.y-START_Y)/(REST_Y-START_Y)));
        mx.save();
        mx.globalAlpha=0.15+0.35*near;
        mx.fillStyle='#000';
        mx.beginPath(); mx.ellipse(s.x,FLOOR_Y+2,ROCK_R*(0.4+0.6*near),4,0,0,Math.PI*2); mx.fill();
        mx.restore();
        drawRock(s,1);
        mx.save();
        mx.shadowColor='#ffcc00'; mx.shadowBlur=10;
        mx.fillStyle='#ffcc00';
        mx.font='bold 11px Cinzel,serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.idx+1,s.x+20,s.y-ROCK_R-6);
        mx.restore();
      });

      // Dust puffs
      for(let i=dust.length-1;i>=0;i--){
        const d=dust[i];
        d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=0.00008*dt; d.life-=d.dec*dt;
        if(d.life<=0){ dust.splice(i,1); continue; }
        mx.globalAlpha=d.life*0.5;
        mx.fillStyle='#a08668';
        mx.beginPath(); mx.arc(d.x,d.y,d.sz*(1.6-d.life*0.6),0,Math.PI*2); mx.fill();
      }
      mx.globalAlpha=1;
      mx.restore();

      mx.fillStyle='#e0b070';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the rune stones fall!',cw/2,4);
    }

    if(phase==='input'){
      // Faint ambient pebbles
      mx.save();
      noise.slice(0,12).forEach(f=>{
        f.y+=f.vy*0.3*dt;
        if(f.y>ch+20) Object.assign(f,newPebble(-20));
        mx.globalAlpha=f.alpha*0.3;
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
          // Spell glyphs: stone colours by SPELL_IDX position
          bgCol=STONE_COLS[si].col; bgDark='#140e08';
          strokeCol=STONE_COLS[si].col+'88'; textCol=STONE_COLS[si].lit;
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
      mx.fillStyle='#e0b070';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Sequence slots — sit between status text and keyboard
      mgDrawSlots(seq,playerSeq,cw,tileTop);
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

  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const BOLT_DUR=300;     // bolt flash visible
  const GLYPH_HOLD=1500;  // glyph at full brightness after strike
  const GLYPH_FADE=1000;  // afterglow fade duration (hold+fade = MG_GLYPH_MS)
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
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

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

      // Sequence slots
      mgDrawSlots(seq,playerSeq,cw,tileTop,'#88ccff');
    }
  }

  function frame(){if(done)return;draw();mazeRAF=requestAnimationFrame(frame);}
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: SHADOW CIRCLE PATTERN (Dark) ──────────────────
// Runes rise out of the centre of a slowly turning purple moon circle, then orbit it.
function launchShadowCirclePattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Shadow Circle';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  // Indices: 0=ϟ 1=Δ 2=∇ 3=Ψ 4=Ω 5=∞ 6=☽ 7=✸ 8=⊕ 9=⊗ 10=θ 11=Φ
  const ALPHABET=[
    {sym:'ϟ',glowCol:'#ccffff'},{sym:'Δ',glowCol:'#ff9944'},{sym:'∇',glowCol:'#44aaff'},
    {sym:'Ψ',glowCol:'#aaff88'},{sym:'Ω',glowCol:'#ff4444'},{sym:'∞',glowCol:'#44ffcc'},
    {sym:'☽',glowCol:'#aaddff'},{sym:'✸',glowCol:'#ffff55'},{sym:'⊕',glowCol:'#ffee77'},
    {sym:'⊗',glowCol:'#ff44aa'},{sym:'θ',glowCol:'#88ff88'},{sym:'Φ',glowCol:'#dd88ff'},
  ];

  // Dark owns ☽(6) ⊗(9) ∇(2) Ω(4) — see CLAUDE.md
  const SPELL_IDX=spell.glyphs||[6,9,2,4];
  // Shadow colours assigned per SPELL_IDX position (0-3)
  const SHADOW_COLS=[
    {col:'#4a1a6a',lit:'#cc88ff'},
    {col:'#3a1a5a',lit:'#aa88ff'},
    {col:'#552070',lit:'#dd99ff'},
    {col:'#2e1a55',lit:'#9999ff'},
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

  // Easy: prefix of the canonical Dark word: ☽ ⊗ ∇ Ω
  const seq=mgSeq(spell,[6,9,2,4],SPELL_IDX);
  const SEQ_LEN=seq.length;
  const playerSeq=[];
  let phase='watch';
  let timeLeft=MG_INPUT_S;

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // The circle
  const CX=cw/2, CY=ch*0.5;
  const R_OUTER=104, R_ORBIT=80, R_INNER=50;
  const SPIN=Math.PI*2/24000;   // circle drawing turns once every 24 s (rad/ms)
  const ORBIT=Math.PI*2/7000;   // sequence runes orbit once every 7 s (rad/ms)

  // Noise — faint purple runes counter-orbit on the outer and inner rings
  const NOISE_COLS=['#5a2280','#4a1a6a','#6a2a90','#442066','#3a1258'];
  const noise=[
    ...Array.from({length:16},(_,i)=>({r:R_OUTER+(_rng()-.5)*10, a:i/16*Math.PI*2, w:-Math.PI*2/(9000+_rng()*3000)})),
    ...Array.from({length:8}, (_,i)=>({r:R_INNER-14+(_rng()-.5)*8, a:i/8*Math.PI*2,  w:-Math.PI*2/(5000+_rng()*2000)})),
  ].map(n=>({...n, sz:9+_rng()*8, ai:Math.floor(_rng()*12), col:NOISE_COLS[Math.floor(_rng()*5)],
    ph:_rng()*Math.PI*2, alpha:0.4+_rng()*0.35}));
  // Shadow wisps drifting up out of the circle
  const wisps=Array.from({length:22},()=>({x:CX+(_rng()-.5)*R_OUTER*2, y:_rng()*ch, vy:0.008+_rng()*0.02,
    sz:1.5+_rng()*2.5, ph:_rng()*Math.PI*2}));

  // Sequence runes — evenly spaced slots around the orbit, shuffled so the order
  // has to be read from when each one rises (and the badges), not around the ring.
  const slots=Array.from({length:SEQ_LEN},(_,i)=>i/SEQ_LEN*Math.PI*2-Math.PI/2);
  for(let i=slots.length-1;i>0;i--){ const j=Math.floor(_rng()*(i+1)); [slots[i],slots[j]]=[slots[j],slots[i]]; }
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const RISE_MS=650;            // centre → orbit
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false, lastT=startTime, pulseAt=-1e9;
  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    base:slots[i],spawnAt:SPAWN_DELAY+i*SPAWN_INTERVAL,idx:i,risen:false,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai); // wrong glyph in hard = fail
          return;                              // easy/normal: silently ignore
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

  // A moon phase (0 new … 4 full … 7 waning) of radius r at x,y: lit disc, then a shadow disc slid across it
  function drawMoon(x,y,r,k){
    mx.fillStyle='#e6d0ff';
    mx.beginPath(); mx.arc(x,y,r,0,Math.PI*2); mx.fill();
    const off=r*2*(1-Math.abs(k-4)/4)*(k<4?-1:1);
    mx.fillStyle='#14081f';
    mx.beginPath(); mx.arc(x+off,y,r*1.02,0,Math.PI*2); mx.fill();
    mx.strokeStyle='#7a44aa'; mx.lineWidth=0.8;
    mx.beginPath(); mx.arc(x,y,r,0,Math.PI*2); mx.stroke();
  }

  // Purple moon circle: double outer ring with tick marks, an inner ring of moon phases, a crescent at the heart
  function drawCircle(elapsed,strength){
    const rot=elapsed*SPIN;
    const sincePulse=elapsed-pulseAt;
    const pulse=sincePulse<500?1-sincePulse/500:0;
    const throb=0.75+0.25*Math.sin(elapsed/600);
    mx.save();
    mx.translate(CX,CY);
    mx.globalAlpha=strength*(throb+pulse*0.6);
    mx.shadowColor='#bb66ff'; mx.shadowBlur=10+pulse*18;
    mx.strokeStyle='#9944cc'; mx.lineWidth=2;
    mx.beginPath(); mx.arc(0,0,R_OUTER+12,0,Math.PI*2); mx.stroke();
    mx.lineWidth=1;
    mx.beginPath(); mx.arc(0,0,R_OUTER-12,0,Math.PI*2); mx.stroke();
    mx.rotate(rot);
    for(let k=0;k<36;k++){
      const a=k/36*Math.PI*2, long=k%3===0;
      mx.beginPath();
      mx.moveTo(Math.cos(a)*(R_OUTER+12),Math.sin(a)*(R_OUTER+12));
      mx.lineTo(Math.cos(a)*(R_OUTER+(long?2:7)),Math.sin(a)*(R_OUTER+(long?2:7)));
      mx.stroke();
    }
    mx.rotate(-rot*2.5);
    mx.strokeStyle='#7a33aa'; mx.lineWidth=1.3;
    mx.beginPath(); mx.arc(0,0,R_INNER,0,Math.PI*2); mx.stroke();
    mx.shadowBlur=6+pulse*10;
    for(let k=0;k<8;k++){
      const a=k/8*Math.PI*2-Math.PI/2;
      drawMoon(Math.cos(a)*R_INNER,Math.sin(a)*R_INNER,6,k);
    }
    mx.rotate(rot*2.5);
    // Crescent at the heart
    mx.shadowColor='#cc99ff'; mx.shadowBlur=14+pulse*16;
    mx.fillStyle='#e6d0ff';
    mx.beginPath(); mx.arc(0,0,14,0,Math.PI*2); mx.fill();
    mx.shadowBlur=0;
    mx.fillStyle='#14081f';
    mx.beginPath(); mx.arc(6,-3,12.5,0,Math.PI*2); mx.fill();
    mx.restore();
    // Core glow
    const cg=mx.createRadialGradient(CX,CY,0,CX,CY,R_INNER);
    cg.addColorStop(0,`rgba(150,70,210,${(0.22+pulse*0.4)*strength})`);
    cg.addColorStop(1,'rgba(150,70,210,0)');
    mx.fillStyle=cg; mx.fillRect(CX-R_INNER,CY-R_INNER,R_INNER*2,R_INNER*2);
  }

  function drawNoise(t,dt,dim){
    mx.save();
    noise.forEach(n=>{
      n.a+=n.w*dt;
      const pulse=0.55+0.45*Math.abs(Math.sin(t/700+n.ph));
      mx.globalAlpha=n.alpha*pulse*dim;
      mx.fillStyle=n.col; mx.shadowColor=n.col; mx.shadowBlur=6;
      mx.font=`bold ${n.sz}px serif`;
      mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText(ALPHABET[n.ai].sym,CX+Math.cos(n.a)*n.r,CY+Math.sin(n.a)*n.r);
    });
    mx.restore();
  }

  function draw(){
    const t=Date.now();
    const elapsed=t-startTime;
    const dt=Math.min(50,t-lastT); lastT=t;

    // Background — night sky with a violet heart
    const bg=mx.createRadialGradient(CX,CY,0,CX,CY,cw*.9);
    bg.addColorStop(0,'#1e0a2e');
    bg.addColorStop(0.55,'#0c0416');
    bg.addColorStop(1,'#030106');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    if(phase==='watch'&&!watchDone&&elapsed>=watchDuration){
      watchDone=true; phase='input';
      timerEl.textContent=timeLeft; startTimer();
    }

    // Wisps
    mx.save();
    wisps.forEach(w=>{
      w.y-=w.vy*dt;
      if(w.y<-6){ w.y=ch+6; w.x=CX+(_rng()-.5)*R_OUTER*2; }
      mx.globalAlpha=(phase==='watch'?0.35:0.15)*(0.5+0.5*Math.sin(t/500+w.ph));
      mx.fillStyle='#b077ff'; mx.shadowColor='#b077ff'; mx.shadowBlur=8;
      mx.beginPath(); mx.arc(w.x+Math.sin(t/900+w.ph)*6,w.y,w.sz,0,Math.PI*2); mx.fill();
    });
    mx.restore();

    if(phase==='watch'){
      drawCircle(elapsed,1);
      drawNoise(t,dt,1);

      // Sequence runes — rise out of the centre, then orbit
      symStates.forEach(s=>{
        const age=elapsed-s.spawnAt;
        if(age<0) return;
        if(!s.risen){ s.risen=true; pulseAt=elapsed; }
        const a=s.base+elapsed*ORBIT;
        const p=Math.min(1,age/RISE_MS);
        const ease=1-Math.pow(1-p,3);
        const r=R_ORBIT*ease;
        const x=CX+Math.cos(a)*r, y=CY+Math.sin(a)*r;
        const alpha=Math.min(1,age/300);
        const scale=0.5+0.5*ease;
        mx.save();
        mx.globalAlpha=alpha;
        mx.translate(x,y); mx.scale(scale,scale);
        mx.shadowColor='#aa55ff'; mx.shadowBlur=26;
        mx.fillStyle='rgba(60,15,95,0.6)';
        mx.beginPath(); mx.arc(0,0,22,0,Math.PI*2); mx.fill();
        mx.shadowColor=s.glowCol; mx.shadowBlur=28;
        mx.fillStyle='#ffffff';
        mx.font='bold 36px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,0,1);
        mx.restore();
        if(p>=1){
          mx.save();
          mx.shadowColor='#ffcc00'; mx.shadowBlur=10;
          mx.fillStyle='#ffcc00';
          mx.font='bold 11px Cinzel,serif';
          mx.textAlign='center'; mx.textBaseline='middle';
          mx.fillText(s.idx+1,x+21,y-21);
          mx.restore();
        }
      });

      mx.fillStyle='#cc99ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Watch the runes rise from the circle!',cw/2,4);
    }

    if(phase==='input'){
      // The circle smoulders faintly behind the keyboard
      drawCircle(elapsed,0.25);
      drawNoise(t,dt,0.3);

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
          // Spell glyphs: shadow colours by SPELL_IDX position
          bgCol=SHADOW_COLS[si].col; bgDark='#0a0412';
          strokeCol=SHADOW_COLS[si].col+'88'; textCol=SHADOW_COLS[si].lit;
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
      mx.fillStyle='#cc99ff';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText(`Repeat the sequence: ${playerSeq.length}/${seq.length}`,cw/2,4);

      // Sequence slots — sit between status text and keyboard
      mgDrawSlots(seq,playerSeq,cw,tileTop);
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

  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const FADE_IN=400,HOLD=1600,FADE_OUT=500; // sums to MG_GLYPH_MS
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
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

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

      // Sequence slots — sit between status text and keyboard
      mgDrawSlots(seq,playerSeq,cw,tileTop,'#88ddff');
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
  const DRIFT_SPEED=0.05,FADE_IN=400;  // px/ms — time-based, consistent across all sequence glyphs
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const watchDuration=MG_WATCH_MS;
  const startTime=Date.now();
  let watchDone=false;

  const Y_BANDS=[0.12,0.30,0.48,0.22,0.40,0.55,0.18];
  const ySlots=Array.from({length:SEQ_LEN},(_,i)=>
    Math.max(30,Math.min(ch*0.72, ch*Y_BANDS[i%Y_BANDS.length]+(_rng()-0.5)*25))
  );

  const symStates=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    x:10, y:ySlots[i],
    spawnAt:SPAWN_DELAY+i*SPAWN_INTERVAL, idx:i,
  }));

  function startTimer(){
    if(mazeTid) clearInterval(mazeTid);
    mazeTid=setInterval(()=>{
      if(done) return;
      timeLeft--; timerEl.textContent=timeLeft;
      if(timeLeft<=2) timerEl.classList.add('urgent');
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

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
        const age=elapsed-s.spawnAt;
        if(age<0) return;
        s.x=10+age*DRIFT_SPEED;
        if(s.x>cw+30) return;  // drifted off-screen — don't wrap

        let alpha=Math.min(1,age/FADE_IN);
        if(s.x>cw-50) alpha=Math.min(alpha,Math.max(0,(cw+30-s.x)/80));
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

      // Sequence slots
      mgDrawSlots(seq,playerSeq,cw,tileTop,'#cc99ff');
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

  // Ring radii
  const R_OUTER=110, R_MID=72, R_INNER=40;
  const INNER_FONT=40;

  // Layer fade timings (ms) — the noise rings now linger for the whole watch
  const OUTER_FADE_START=3800, OUTER_FADE_DUR=1200;
  const MID_FADE_START=4200,   MID_FADE_DUR=800;
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

  // Inner ring: the sequence glyphs are unveiled one at a time, each in a shuffled
  // slot of a 6-slot ring, with no order badge — the only clue to the order is
  // when each one appears. Each stays MG_GLYPH_MS (fade in + hold + fade out).
  const INNER_SLOTS=6;
  const slotOrder=Array.from({length:INNER_SLOTS},(_,i)=>i);
  for(let i=slotOrder.length-1;i>0;i--){const j=Math.floor(_rng()*(i+1));[slotOrder[i],slotOrder[j]]=[slotOrder[j],slotOrder[i]];}
  const SPAWN_DELAY=300,SPAWN_INTERVAL=mgSpawnInterval(SEQ_LEN,SPAWN_DELAY,MG_GLYPH_MS);
  const G_IN=300,G_HOLD=1500,G_OUT=700; // sums to MG_GLYPH_MS
  const innerGlyphs=seq.map((ai,i)=>({
    ai,sym:ALPHABET[ai].sym,glowCol:ALPHABET[ai].glowCol,
    angle:(slotOrder[i]/INNER_SLOTS)*Math.PI*2-Math.PI/2,
    at:SPAWN_DELAY+i*SPAWN_INTERVAL,
    idx:i,
  }));
  // False threads: Dispel's own glyphs flare briefly in the middle ring, tinted violet
  // rather than white — the greyed-out keyboard can't rule them out.
  const DECOY_N=diffName==='easy'?2:diffName==='hard'?5:3;
  const DECOY_DUR=900;
  const decoys=Array.from({length:DECOY_N},(_,i)=>({
    ai:SPELL_IDX[Math.floor(_rng()*SPELL_IDX.length)],
    angle:_rng()*Math.PI*2,
    at:200+(i+_rng())*(MG_WATCH_MS-DECOY_DUR-400)/DECOY_N,
  }));
  // 0→1→0 envelope for a glyph shown from `at` for fadeIn+hold+fadeOut ms
  function veilAlpha(el,at,fi,hold,fo){
    const d=el-at;
    if(d<0||d>fi+hold+fo) return 0;
    if(d<fi) return d/fi;
    if(d<fi+hold) return 1;
    return 1-(d-fi-hold)/fo;
  }

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
      if(timeLeft<=0) finish(false,'timeout');
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
          if(diffName==='hard') finish(false,'forbidden',ai);
          return;
        }
        if(ai!==seq[playerSeq.length]){finish(false,'wrong',ai);return;}
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
  function finish(ok,reason,wrongAi){
    if(done)return;done=true;cleanup();draw();
    mgEnd(ok,{cw,ch,seq,playerSeq,tPos,TS,tileTop,reason,wrongAi},cb);
  }

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
      // Faint concentric circle guides — the onion skin boundaries
      drawRingCircle(R_OUTER+14,outerA);
      drawRingCircle(R_MID+12,midA);
      drawRingCircle(R_INNER+22,1);

      // Outer ring — clockwise rotation
      if(outerA>0.01){
        const rot=rotT*0.12;
        mx.save();
        mx.font='bold 18px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        outerNoise.forEach(g=>{
          const a=g.angle+rot;
          mx.globalAlpha=outerA*0.32;
          mx.fillStyle='#bdb8cc';
          mx.shadowBlur=0;
          mx.fillText(ALPHABET[g.ai].sym,cx+R_OUTER*Math.cos(a),cy+R_OUTER*Math.sin(a));
        });
        mx.restore();
      }

      // Middle ring — counter-clockwise, faster
      const midRot=-rotT*0.22;
      if(midA>0.01){
        mx.save();
        mx.font='bold 24px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        midNoise.forEach(g=>{
          const a=g.angle+midRot;
          mx.globalAlpha=midA*0.42;
          mx.fillStyle='#ccc8dc';
          mx.shadowBlur=0;
          mx.fillText(ALPHABET[g.ai].sym,cx+R_MID*Math.cos(a),cy+R_MID*Math.sin(a));
        });
        mx.restore();
      }

      // False threads — Dispel glyphs flaring violet in the middle ring
      decoys.forEach(d=>{
        const al=veilAlpha(elapsed,d.at,200,400,300);
        if(al<=0.01) return;
        const a=d.angle+midRot;
        mx.save();
        mx.globalAlpha=al*0.85;
        mx.shadowColor='#aa66ff'; mx.shadowBlur=18;
        mx.fillStyle='#c9a8ff';
        mx.font='bold 30px serif';
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(ALPHABET[d.ai].sym,cx+R_MID*Math.cos(a),cy+R_MID*Math.sin(a));
        mx.restore();
      });

      // Soft centre glow — drawn before inner glyphs so glyphs sit on top
      {
        const grd=mx.createRadialGradient(cx,cy,0,cx,cy,R_INNER*1.2);
        grd.addColorStop(0,'rgba(180,140,220,0.07)');
        grd.addColorStop(1,'rgba(0,0,0,0)');
        mx.fillStyle=grd; mx.fillRect(0,0,cw,ch);
      }

      // Inner ring — the true sequence, unveiled one glyph at a time (no order badge)
      const rot=-rotT*0.15;
      innerGlyphs.forEach(s=>{
        const al=veilAlpha(elapsed,s.at,G_IN,G_HOLD,G_OUT);
        if(al<=0.01) return;
        const a=s.angle+rot;
        const gx=cx+R_INNER*Math.cos(a);
        const gy=cy+R_INNER*Math.sin(a);
        const osc=Math.sin(t/1000+s.idx)*0.04;
        mx.save();
        mx.globalAlpha=al;
        mx.translate(gx,gy); mx.rotate(osc);
        mx.shadowColor=s.glowCol; mx.shadowBlur=30;
        mx.fillStyle='#ffffff';
        mx.font=`bold ${INNER_FONT}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(s.sym,0,0);
        mx.restore();
      });
      mx.globalAlpha=1; mx.shadowBlur=0;

      mx.fillStyle='#cc99ee';
      mx.font='bold 10px Cinzel,serif';
      mx.textAlign='center'; mx.textBaseline='top';
      mx.fillText('Mark the order the white glyphs appear',cw/2,4);
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

      // Sequence slots
      mgDrawSlots(seq,playerSeq,cw,tileTop,'#cc99ff');
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
// Frostbite's or Dread's coin flip came up: the pick is lost before it's cast (no mana spent)
function showRiskBlock(cx,y,id){
  const [title,sub,c1,c2]=id==='dread'?['😱 FALTERED!','Spell lost','#bb66ee','#2a0840']:['🥶 FROZEN!','Strike lost','#aaddff','#ffffff'];
  addFloat(cx,y,title,c1,22);
  addFloat(cx,y+bH*.07,sub,c1,13);
  spawnParts(cx,wizMidY(cx),c1,16);
  spawnParts(cx,wizMidY(cx),c2,8);
}
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
  portrait.src='portraits/medium/'+key+'.jpg';
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
      document.getElementById('tp-p1-portrait').src='portraits/small/'+key+'.jpg';
      document.getElementById('tp-p1-name').textContent=p1Cfg.name;
    } else if(trainingPickPhase==='p2'){
      p2Key=key; p2Cfg=CHAR_DEFS[key];
      document.getElementById('tp-p2-portrait').src='portraits/small/'+key+'.jpg';
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
  document.getElementById('p1-portrait').src='portraits/small/'+p1Key+'.jpg';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name+' (P2)';
  document.getElementById('p2-portrait').src='portraits/small/'+p2Key+'.jpg';
  newState();
  gs.myTurn=false; gs.busy=true;
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  startBattleLoop();
  setTimeout(beginPickPhase,200);
}

function showHandoffOverlay(toPlayer, callback){
  const cfg=seatCfg(toPlayer);
  const num=PLAYERS.indexOf(toPlayer)+1;
  document.getElementById('handoff-player-num').textContent='Player '+num;
  document.getElementById('handoff-char-name').textContent=cfg.name.toUpperCase();
  const portrait=document.getElementById('handoff-portrait');
  portrait.src='portraits/small/'+seatKey(toPlayer)+'.jpg';
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
  document.getElementById('p1-portrait').src='portraits/small/'+p1Key+'.jpg';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name;
  document.getElementById('p2-portrait').src='portraits/small/'+p2Key+'.jpg';
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
  startBattleLoop();
}

function startTrainingBattle(){
  tournamentQueue=[]; tournamentIndex=0; twoPlayerMode=false;
  loadSprites();
  updateActionBar(p1Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name;
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/small/'+p1Key+'.jpg';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name;
  document.getElementById('p2-portrait').src='portraits/small/'+p2Key+'.jpg';
  const fightLbl=document.getElementById('fightlbl');
  if(fightLbl) fightLbl.textContent='Training';
  document.getElementById('btn-training-menu').style.display='block';
  newState();
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  startBattleLoop();
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
    gs.parts=[]; gs.floats=[]; gs.beams=[]; gs.manaBurnFires=[]; gs.shadowCircles=[]; gs.darkRituals=[]; gs.wardUnravels=[]; gs.siphons=[]; gs.fireballs=[]; gs.explosions=[]; gs.iceCrystals=[]; gs.iceShards=[]; gs.boulders=[]; gs.storms=[]; gs.quake=null;
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
      gs.parts=[]; gs.floats=[]; gs.beams=[]; gs.manaBurnFires=[]; gs.shadowCircles=[]; gs.darkRituals=[]; gs.wardUnravels=[]; gs.siphons=[]; gs.fireballs=[]; gs.explosions=[]; gs.iceCrystals=[]; gs.iceShards=[]; gs.boulders=[]; gs.storms=[]; gs.quake=null;
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
  eldrin:'#4af0ff',mal:'#ff4a6e',sylvara:'#44cc88',aurelia:'#ffcc44',
  gnash:'#dd8822',cinder:'#ff6600',skadi:'#88ddff',zacharius:'#aaff44',
  mary:'#f0d8a0',mordant:'#9944cc',ponder:'#9988cc',durin:'#b08040',
  weizan:'#aabbee',gretch:'#55aa33',valdris:'#8899cc',mirel:'#cc88ff',thessaly:'#ffdd88',
  korvath:'#cc6622',fizzwick:'#99cc44',nyxara:'#6633aa'
};
const CHAR_NAMES_TUT={
  eldrin:'Eldrin',mal:'Malachar',sylvara:'Sylvara',aurelia:'Aurelia',
  gnash:'Gnash',cinder:'Cinder',skadi:'Skadi',zacharius:'Zacharius',
  mary:'Mary',mordant:'Mordant',ponder:'Ponder',durin:'Durin',
  weizan:'Weizan',gretch:'Gretch',valdris:'Valdris',mirel:'Mirel',thessaly:'Thessaly',
  korvath:'Korvath',fizzwick:'Fizzwick',nyxara:'Nyxara'
};
const CHAR_KEYS_TUT=['eldrin','mal','sylvara','aurelia','gnash','cinder','skadi','zacharius','mary','mordant','ponder','durin','weizan','gretch','valdris','mirel','thessaly','korvath','fizzwick','nyxara'];

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
    {key:'eldrin', text:"Greetings, young mage. Welcome to the arena of wizards — a place where reading your rival matters as much as raw power."},
    {key:'sylvara',text:"Every round, each wizard chooses a spell in secret. When everyone has chosen, the spells are revealed together — like turning over cards — and then they all play out."},
    {key:'ponder', text:"Use the topics above to learn how it works, then tap any portrait below to hear that wizard explain their own spells. I'm Ponder — come find me!"},
    {key:'eldrin', text:"Learn the rules, then learn your rivals. We are all here to help."},
  ],
  'health-mana':[
    {key:'eldrin', text:"Every wizard has Health and Mana. When your HP reaches zero, the duel is over. HP differs between wizards — Gnash and Durin are hardy, Malachar and Fizzwick are fragile."},
    {key:'sylvara',text:"Everyone starts with the same mana and gains more at the end of every round. There are no free attacks — every spell costs something."},
    {key:'skadi',  text:"Short of mana? 🧘 Meditate instead of casting: you gain 3 extra mana that round. But you cast nothing, so if your rival strikes, it lands. You can't meditate two rounds in a row."},
    {key:'ponder', text:"Even the cheapest spell costs only a little, so you can always do something. The question is whether to spend big now or save for a stronger cast next round."},
    {key:'sylvara',text:"Watch your rival's mana bar! If they can't afford a big ward, they won't cast one. Reading their mana is half the game."},
  ],
  triangle:[
    {key:'eldrin', text:"There are three kinds of spell: ⚔️ Damage, 🛡 Protection and ✦ Dispel. They work like rock, paper, scissors."},
    {key:'eldrin', text:"Protection beats Damage: a ward soaks up strikes, and it's raised before any damage lands — even in the same round. Strike into a ward and you've wasted your mana."},
    {key:'ponder', text:"Dispel beats Protection: dispels are cheap and tear through wards. Your rival spends a lot of mana on a ward, you break it for a little."},
    {key:'sylvara',text:"And Damage beats Dispel: if you dispel and your rival simply strikes, you've spent your round on nothing and taken the hit. Damage is also the surest way to win."},
    {key:'eldrin', text:"Each round resolves in that order — every Protection first, then every Dispel, then every Damage. So the trick is guessing what your rival will choose."},
    {key:'mal',    text:"With three or four of us, whoever deals the most damage to a wizard in the round they fall claims a bounty: HP and mana. Gang up on someone if you like — but your ally wants that kill as much as you do."},
    {key:'gnash',  text:"Duel drag on too long? Normally it ends in a draw at the round limit. Pick SUDDEN DEATH in Options instead: from round 30 — round 20 with three or four of us — every round hits harder and brings more mana. Wards don't grow. Somebody falls soon."},
    {key:'ponder', text:"Think they're all coming for you? Tap 🌀 Phase. Everything aimed at you that round misses, and you soak up the mana they spent on it. Catch two or more spells and your next spell is free — any ring! Guess wrong and you've lost your turn and 4 mana."},
  ],
  wheel:[
    {key:'ponder', text:"Pick a category and a wheel appears. It has six elements — Fire, Ice, Lightning, Arcane, Physical and Dark — and three rings."},
    {key:'ponder', text:"Tap closer to the edge for a stronger spell. The inner ring is cheap and weak, the outer ring is costly and powerful, and it's a longer casting ritual too. With more than one rival, an outer-ring strike hits every one of them."},
    {key:'skadi',  text:"The element matters. A ward resists every element but its own — its own element unravels it, and a dispel of its element does double. So ward in an element your rival can't cast: some wizards are barred from whole elements."},
    {key:'zacharius',text:"Every element carries an extra effect. Lightning burns your rival's mana, even through a ward. Physical crushes wards: they can't resist it as they resist other elements."},
    {key:'skadi',  text:"The rest need a strong hit — middle ring or more — that reaches them. Ice frostbites: if they pick Damage next round, it's a coin flip whether it freezes and is lost. Dark fills them with dread: the same, for Protection."},
    {key:'cinder', text:"Fire sets them burning for a couple of rounds. Arcane unweaves their enchantments — a round off their newest buff, or off every buff from the outer ring. Burns, frostbite and dread are curses: Cleanse Self clears them, one at a time."},
    {key:'eldrin', text:"Wards last three rounds and fade a little each round. Raising a new one replaces the old one. Damage over time — poison, burns, vines, plague — hits your ward first too."},
    {key:'mary',   text:"In a team duel, your wards, buffs and heals can go on a team-mate instead — after the ritual you choose who to protect. Summoned minions always serve whoever summoned them, though."},
    {key:'sylvara',text:"Each wizard's own spells take over some sectors of the wheel — they're outlined in gold, and listed under the wheel with their costs. That's where a wizard's personality shows."},
  ],
  enchant:[
    {key:'mary',   text:"Some wizards cast enchantments. Buffs — like Regen, War Paint or a skeleton servant — sit on the Protection wheel and last a while."},
    {key:'mordant',text:"Curses — like Silence, Plague or Agony — sit on the Dispel wheel. As well as their hex, every curse wears at the target's ward a little, like a weak dispel."},
    {key:'ponder', text:"A Dispel against a rival with no ward strips their newest buff — or all of them, from the outer ring. If they have a ward, the dispel hits the ward instead. Wards protect your buffs!"},
    {key:'mary',   text:"Cursed? Open the Dispel wheel and tap Cleanse Self. It removes your newest curse for very little mana — just one, so mind the order they land in."},
    {key:'sylvara',text:"Locks — like my Entangle or Skadi's Ice Lance — stop you choosing one category next round. They can't land two rounds in a row, so you'll always get a turn free."},
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
    {key:'eldrin', text:"Wards use a different ritual: match the pairs of tiles after studying them face-up. Get the ritual wrong and the spell fizzles, costing you a little mana."},
    {key:'sylvara',text:"Your rival can't see your ritual — only the spell you chose, when the cards are revealed."},
  ],
  difficulty:[
    {key:'ponder',text:"Difficulty changes how the rituals behave. On Easy, each element always uses the same glyphs in the same order, so you can learn them by heart."},
    {key:'ponder',text:"On Easy and Normal, glyphs that don't belong to the spell are greyed out on the keyboard. On Normal the order is random every cast."},
    {key:'ponder',text:"On Hard, all twelve glyphs are active and a single wrong tap breaks the ritual. You are relying entirely on memory and focus. Good luck!"},
  ],
  eldrin:[
    {key:'eldrin',text:"I am Eldrin — the Stalwart. My wards cost less than anyone else's. Endurance is my philosophy: I make you spend, and spend, until you have nothing left."},
    {key:'eldrin',text:"My Shield takes the Arcane sector of my Protection wheel — a far larger ward than most wizards can raise."},
    {key:'eldrin',text:"Counter, in the Lightning sector, punishes anyone who strikes me for a few rounds — and braces my Shield, so it lasts longer and stops wearing away. Ward, in the Ice sector, makes me immune to curses, and the next dispel thrown at me only breaks the Ward — my Shield stays up."},
    {key:'eldrin',text:"Dispels are my weakness. Keep a ward between your buffs and their unbinding, and I am very hard to wear down."},
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
    {key:'aurelia',text:"Time Drain is an Arcane curse on my Dispel wheel. My rival gains less mana each round for a while — and less from Meditate too. Stolen resources compound."},
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
    {key:'cinder',text:"Candle is a Fire curse on my Dispel wheel. While it burns, my rival takes fire damage whenever they raise a ward or meditate. Suddenly the safe moves aren't safe."},
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
    {key:'mordant',text:"Agony is Dark: whatever you do, you suffer — only a Meditate escapes it. Silence is Arcane: your spells may simply fail."},
    {key:'mordant',text:"Corruption is Physical: the rot slows the mana you gain each round, and it spoils a Meditate — under Corruption, even meditating feeds my Agony. Starve them, and watch their options narrow to nothing."},
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
    {key:'gretch',text:"Plague is a Dark curse — damage every round for a while. Maggot Cloud is a Physical curse — it drains mana now and slows your mana for a couple of rounds. Meditating won't save you."},
    {key:'gretch',text:"Bone Totem, in the Dark sector of my Protection wheel, heals me every round. Protect it with a ward or a Dispel will strip it."},
    {key:'gretch',text:"Not elegant. Not subtle. Just results. Plague them, drain them, totem up, and let time finish the job."},
  ],
  valdris:[
    {key:'valdris',text:"I am Valdris, the Undying. I do not fight alone — the dead stand between you and me."},
    {key:'valdris',text:"Raise Dead, in the Dark sector of my Protection wheel, raises three skeletons — up to five at once. They stand in front of my ward and soak your damage until it cuts them down, and dispels can't touch them. Every one still standing strikes you each round."},
    {key:'valdris',text:"Necrotic Drain is my Dark strike — it heals me for part of the damage dealt. Soul Tithe, on my Dispel wheel, curses you: each skeleton you kill costs you mana."},
    {key:'valdris',text:"Cut through my dead, and you may yet reach me. Leave them standing, and they will grind you to dust."},
  ],
  mirel:[
    {key:'mirel',text:"Nothing you see is real. I am Mirel. Simulacrum, in the Arcane sector of my Protection wheel, creates a copy of me that strikes my rival every round. I can have two."},
    {key:'mirel',text:"Bewitch is my Arcane curse. The next strike my rival makes rebounds onto themselves. Every attack becomes a gamble."},
    {key:'mirel',text:"Feint is my Arcane strike. It burns my rival's mana as it lands."},
    {key:'mirel',text:"My simulacra can be dispelled — that is the counterplay. So I keep a ward up, and let my copies do the work."},
  ],
  thessaly:[
    {key:'thessaly',text:"I don't fight you. I rearrange the battlefield until you can no longer fight me effectively."},
    {key:'thessaly',text:"Enthral is my Arcane curse. I secretly call your next move — Damage, Protection or Dispel. Choose what I called and your spell is lost, its mana mine. Choose otherwise and I misread you. Nobody cleanses it in time: it springs the moment you cast."},
    {key:'thessaly',text:"Spellbind is my Dark curse — whatever you cast most often costs more for a while. Lean on one move and I'll make you pay for it."},
    {key:'thessaly',text:"Arcane Weave, in the Arcane sector of my Protection wheel, raises a light ward, then empowers my next few strikes and makes each one burn your mana."},
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
    img.src='portraits/small/'+key+'.jpg';
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
    portrait.src='portraits/small/'+msg.key+'.jpg';
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
      document.getElementById('tp-p1-portrait').src='portraits/small/'+p1Key+'.jpg';
      document.getElementById('tp-p1-name').textContent=CHAR_DEFS[p1Key].name;
    }
    if(CHAR_DEFS[p2Key]){
      document.getElementById('tp-p2-portrait').src='portraits/small/'+p2Key+'.jpg';
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

  document.getElementById('pick-eldrin').addEventListener('click',()=>showWizardDetail('eldrin'));
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
