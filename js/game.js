// ── CONSTANTS ──────────────────────────────────────────────
const MAX_MANA=20, SHIELD_COST=3, BURN_DMG=5, BURN_ROUNDS=2;

const SPELLS=[
  {name:'Inferno',        element:'fire',      icon:'🔥', dmg:38, cost:12, col:'#ff6622',
   effectLabel:'Burns 5 dmg × 2 rounds', area:true},
  {name:'Lightning Bolt', element:'lightning', icon:'⚡', dmg:30, cost:9,  col:'#ffee44',
   effectLabel:'Pierces shields fully'},
  {name:'Frost Nova',     element:'ice',       icon:'❄️',  dmg:18, cost:6,  col:'#88ddff',
   effectLabel:'Freezes — skip next turn'},
  {name:'Arcane Surge',   element:'arcane',    icon:'🌀', dmg:0,  cost:9,  col:'#cc88ff',
   effectLabel:'Wild: 15–55 damage'},
  {name:'Dispel',         element:'dispel',    icon:'🌸', dmg:0,  cost:5,  col:'#ffaaff',
   effectLabel:'Choose: cleanse 1 own debuff, or 70% strip one opp buff'},
  {name:'Mana Burn',      element:'manaburn',  icon:'🔮', dmg:0,  cost:8,  col:'#cc44ff',
   effectLabel:'Deal 2× opp mana as dmg; drain 4 mana (pierces shields)'},
];

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

const CHAR_DISPLAY={
  eldrad:{
    stats:[['❤ HP','115'],['🛡 Shield','60 HP / 10T'],['⚡ Counter','20 reflect / 2M'],['🔰 Ward','Block next status / 3T']],
    flavour:'Outlast your foe with arcane endurance.'
  },
  mal:{
    stats:[['❤ HP','80'],['💪 Empower','+50% / Free'],['🩸 Blood Pact','−22/+15 mana'],['💀 Drain','~20 dmg, heal 45%']],
    flavour:'Strike hard. Strike first. No mercy.'
  },
  sylvara:{
    stats:[['❤ HP','92'],['💚 Regen','+40 HP/10T'],['🌿 Entangle','75% freeze 1-3T'],['🌱 Vine Whip','~10 dmg/turn × 3T']],
    flavour:"Sustain and control with nature's power."
  },
  aurelia:{
    stats:[['❤ HP','90'],['🔮 Foresight','Block next spell'],['⏳ Time Drain','to +2 ch / 5T'],['💨 Haste','25% dodge / 3T']],
    flavour:'Bend time — foresee attacks and drain your foe.'
  },
  gnash:{
    stats:[['❤ HP','105'],['🩸 War Paint','3 mana → 33% resist + reduces self-harm / 5T'],['⚔️ Charge','15 HP (10 w/ War Paint) → 32 pierce all'],['💢 Frenzy','15 HP (10 w/ War Paint) → 3× rapid strikes']],
    flavour:'Blood and bone. No magic — just fury.'
  },
  cinder:{
    stats:[['❤ HP','83'],['🎱 Fireball','18–28 random fire dmg'],['🛡️ Flame Shield','16 fire retaliate / 5T'],['🕯️ Candle','Channel → catch fire / 4T']],
    flavour:'Roll the dice. Fan the flames. Win big or burn together.'
  },
  skadi:{
    stats:[['❤ HP','88'],['🧊 Ice Lance','28 dmg / 35% freeze'],['🛡️ Frost Armor','30% resist + 8 retaliate / 4T'],['🌨️ Blizzard','5 dmg + 3 mana drain / turn × 5T']],
    flavour:'Glacial patience. Frozen fury. Every strike against her has a price.'
  },
  zacharius:{
    stats:[['❤ HP','86'],['🔋 Galvanize','4 mana → 8 charge; discharge on phys hit'],['🌩️ Chain Lightning','24 dmg + 35% arc 10 more (costs 8 charge)'],['💡 Conductivity','+35% dmg taken / 3T']],
    flavour:'Store the storm. Spend it wisely. Let them come to you.'
  },
  mary:{
    stats:[['❤ HP','88'],['💛 Heal','4 mana → instantly restore 40 HP'],['✨ Purge','2 mana → remove all active debuffs'],['☀️ Radiant','3 mana → 12 holy damage']],
    flavour:'Faith is the only shield that never breaks.'
  },
  mordant:{
    stats:[['❤ HP','82'],['💀 Agony','3 mana → 12 dmg on any non-channel action / 5T'],['🔇 Silence','2 mana → 45% spell failure / 5T'],['☠️ Corruption','3 mana → −2 mana per channel / 3T']],
    flavour:'The hex is already written. You just haven\'t felt it yet.'
  },
  ponder:{
    stats:[['❤ HP','85'],['👻 Vanish','Invisible 3T'],['🌀 Siphon','Steal 4 mana'],['💫 Blink','Next hit auto-misses']],
    flavour:"Young but fierce — vanish from sight and plunder your foe's magic."
  },
  durin:{
    stats:[['❤ HP','110'],['🧱 Stoneskin','10 absorb/hit, 30 HP total, 10T'],['💎 Stonesoul','40% magic reduction / 5T'],['⛰️ Rockfall','3×9 phys dmg']],
    flavour:'The mountain endures. Outlast every spell — stone by stone.'
  }
};

// ── DIFFICULTY ─────────────────────────────────────────────
let diffMult=1.0, diffName='normal';
let aiDifficulty='easy';

// ── TOURNAMENT ─────────────────────────────────────────────
const ARCADE_BOSSES=['gnash','zacharius','mal','mordant']; // fixed final-4 in arcade mode
let arcadeMode=false;
let tournamentQueue=[];   // ordered opponent keys
let tournamentIndex=0;    // index of current opponent in queue

// ── TOURNEY MODE ────────────────────────────────────────────
let watchMode=false;        // both players AI-controlled
let tourneyMode=false;      // live tourney match (watch or play)
let tourneyPickMode=false;  // picking character for tourney bracket
let tourneyBracket=null;    // {playerKey, rounds:[[{p1Key,p2Key,winner}]]}
let tourneyCurrentMatch=null;  // {round,matchIdx} — which match is live
let tourneyPendingResult=null; // {round,matchIdx,winnerKey} — set after live match
let headless=false;            // suppress all visuals for instant AI-vs-AI simulation
let headlessWinner=null;       // set by endGame() when headless

// ── STATE ──────────────────────────────────────────────────
let gs={}, puzzleCB=null, aiTid=null;
let bW=0, bH=0;
let dispelSelf=false;
let mazeRAF=null, mazeTid=null;
let retryCountdownId=null;

// ── 2 PLAYER MODE ─────────────────────────────────────────
let twoPlayerMode=false;
let twoPlayerPhase=1; // 1=p1 picking, 2=p2 picking
let matchRound=0;
let p1MatchWins=0, p2MatchWins=0;

// ── SIMULTANEOUS TURNS ────────────────────────────────────
let simCallback=null;       // intercepted by endMyTurn/finishAI during resolution
let pendingP1Action=null;   // {type,ok,dispelSelf,perfect,...} collected action
let pendingP2Action=null;   // same for ai/p2
let skipAIAction=false;     // when true, doAI skips decision → finishAI (ticks only)
let _rng=Math.random;       // replaceable RNG for deterministic replay
let deferWinCheck=false;    // suppress checkWin during double-KO resolution
let pendingWin=null;        // {won} accumulated during deferred win check

// ── P2P MODE ──────────────────────────────────────────────
let p2pMode=false;
let p2pRole=null;           // 'host' (=p1) | 'guest' (=p2)
let p2pMyCharSelected=false;
let p2pTheirCharKey=null;
let p2pLastAction=null;
let p2pGameOverReceived=false;

// ── TRAINING MODE ──────────────────────────────────────────
let trainingMode=false;
let trainingAI=true;
let trainingPickPhase=null; // 'p1' or 'p2' — which side is being chosen

function newState(){
  gs={
    p1:{hp:p1Cfg.hp, maxHp:p1Cfg.hp, mana:p1Cfg.startMana,
        shield:0, shieldHp:0, burn:0, frozen:0, regen:null,
        counter:false, empowered:false, foresight:false, timeDrain:0, resist:0, invisible:0,
        ward:0, vineWhip:0, haste:0, frenzied:0, blink:0, frostArmor:0, blizzard:0, flameShield:0, candle:0, charge:0, conductivity:0, agony:0, agonyDmg:0, silence:0, corruption:0,
        stoneskin:0, stoneskinHp:0, stonesoul:0},
    p2:{hp:p2Cfg.hp, maxHp:p2Cfg.hp, mana:p2Cfg.startMana,
        shield:0, shieldHp:0, burn:0, frozen:0, regen:null,
        counter:false, empowered:false, foresight:false, timeDrain:0, resist:0, invisible:0,
        ward:0, vineWhip:0, haste:0, frenzied:0, blink:0, frostArmor:0, blizzard:0, flameShield:0, candle:0, charge:0, conductivity:0, agony:0, agonyDmg:0, silence:0, corruption:0,
        stoneskin:0, stoneskinHp:0, stonesoul:0},
    round:1, myTurn:true, busy:false,
    p1anim:'idle', p2anim:'idle', p1xOff:0, p2xOff:0,
    parts:[], floats:[], projs:[], beams:[], manaBurnFires:[],
    pendingAction:null, skipAITurn:false,
    turnPlayer:'p1', lastAnimEnd:0,
  };
}

// ── SCREENS ────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const pzExit=document.getElementById('btn-pz-exit');
  if(pzExit) pzExit.style.display=(id==='puzzle-screen'&&trainingMode)?'':'none';
}

// ── TOURNAMENT BRACKET ─────────────────────────────────────
function buildBracket(){
  const track=document.getElementById('bracket-track');
  track.innerHTML='';
  tournamentQueue.forEach((oppKey,i)=>{
    const oppCfg=CHAR_DEFS[oppKey];
    const isFinal=i===tournamentQueue.length-1;
    const isBossRound=arcadeMode&&ARCADE_BOSSES.includes(oppKey);
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
  btn.textContent=animate?('⚔ Fight '+nextCfg.name+' →'):(arcadeMode?'⚔ Begin Arcade':'⚔ Begin Iron Man');
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

// ── TOURNEY BRACKET ────────────────────────────────────────
function buildTourneyBracket(playerKey){
  const others=Object.keys(CHAR_DEFS).filter(k=>k!==playerKey);
  for(let i=others.length-1;i>0;i--){
    const j=Math.floor(_rng()*(i+1));
    [others[i],others[j]]=[others[j],others[i]];
  }
  const opp=others.slice(0,7);
  tourneyBracket={
    playerKey,
    rounds:[
      [
        {p1Key:playerKey, p2Key:opp[0], winner:null},
        {p1Key:opp[1],    p2Key:opp[2], winner:null},
        {p1Key:opp[3],    p2Key:opp[4], winner:null},
        {p1Key:opp[5],    p2Key:opp[6], winner:null},
      ],
      [
        {p1Key:null, p2Key:null, winner:null},
        {p1Key:null, p2Key:null, winner:null},
      ],
      [
        {p1Key:null, p2Key:null, winner:null},
      ],
    ],
  };
}

function renderTourneyBracket(){
  const container=document.getElementById('tourney-bracket');
  container.innerHTML='';
  const roundLabels=['Quarter-Finals','Semi-Finals','Final'];
  const tb=tourneyBracket;

  tb.rounds.forEach((matches,rIdx)=>{
    const roundDiv=document.createElement('div');
    roundDiv.className='tourney-round';

    const labelEl=document.createElement('div');
    labelEl.className='tourney-round-label';
    labelEl.textContent=roundLabels[rIdx]||('Round '+(rIdx+1));
    roundDiv.appendChild(labelEl);

    matches.forEach((match,mIdx)=>{
      const matchDiv=document.createElement('div');
      matchDiv.className='tourney-match';
      if(match.winner) matchDiv.classList.add('match-done');

      const bothKnown=match.p1Key&&match.p2Key;

      function makeSide(key,isWinner,isLoser){
        const side=document.createElement('div');
        side.className='tourney-combatant';
        if(isWinner) side.classList.add('winner');
        if(isLoser) side.classList.add('loser');
        if(key&&key===tb.playerKey) side.classList.add('is-player');

        if(key){
          const img=document.createElement('img');
          img.className='tourney-portrait';
          img.src='portraits/'+key+'.png';
          img.alt=CHAR_DEFS[key]?CHAR_DEFS[key].name:key;
          side.appendChild(img);
          const name=document.createElement('span');
          name.className='tourney-name';
          name.textContent=CHAR_DEFS[key]?CHAR_DEFS[key].name:key;
          name.style.color=(CHAR_DEFS[key]&&CHAR_DEFS[key].col)||'#f0cc6a';
          side.appendChild(name);
        } else {
          const ph=document.createElement('div');
          ph.className='tourney-tbd-portrait';
          ph.textContent='?';
          side.appendChild(ph);
          const name=document.createElement('span');
          name.className='tourney-name tourney-tbd';
          name.textContent='TBD';
          side.appendChild(name);
        }
        return side;
      }

      const isP1Win=match.winner===match.p1Key;
      const isP2Win=match.winner===match.p2Key;

      const combRow=document.createElement('div');
      combRow.className='tourney-combatants';
      combRow.appendChild(makeSide(match.p1Key,isP1Win,match.winner&&!isP1Win));
      const vsEl=document.createElement('span');
      vsEl.className='tourney-vs';
      vsEl.textContent='VS';
      combRow.appendChild(vsEl);
      combRow.appendChild(makeSide(match.p2Key,isP2Win,match.winner&&!isP2Win));
      matchDiv.appendChild(combRow);

      if(!match.winner){
        const actDiv=document.createElement('div');
        actDiv.className='tourney-actions';

        const simBtn=document.createElement('button');
        simBtn.className='tourney-btn tourney-sim-btn';
        simBtn.textContent='⚡ Simulate';
        simBtn.disabled=!bothKnown;
        simBtn.addEventListener('click',()=>simulateTourneyMatch(rIdx,mIdx));
        actDiv.appendChild(simBtn);

        const watchBtn=document.createElement('button');
        watchBtn.className='tourney-btn tourney-watch-btn';
        watchBtn.textContent='👁 Watch';
        watchBtn.disabled=!bothKnown;
        watchBtn.addEventListener('click',()=>startWatchTourneyMatch(rIdx,mIdx));
        actDiv.appendChild(watchBtn);

        const playerIn=match.p1Key===tb.playerKey||match.p2Key===tb.playerKey;
        const playBtn=document.createElement('button');
        playBtn.className='tourney-btn tourney-play-btn';
        playBtn.textContent='⚔ Play';
        playBtn.disabled=!bothKnown||!playerIn;
        playBtn.addEventListener('click',()=>startPlayTourneyMatch(rIdx,mIdx));
        actDiv.appendChild(playBtn);

        matchDiv.appendChild(actDiv);
      } else {
        const resultEl=document.createElement('div');
        resultEl.className='tourney-result';
        const wCfg=CHAR_DEFS[match.winner];
        resultEl.textContent=(wCfg?wCfg.name:match.winner)+' advances';
        resultEl.style.color=(wCfg&&wCfg.col)||'#f0cc6a';
        matchDiv.appendChild(resultEl);
      }

      roundDiv.appendChild(matchDiv);
    });

    container.appendChild(roundDiv);
  });
}

function showTourneyScreen(){
  renderTourneyBracket();
  showScreen('tourney-screen');
}

function setTourneyMatchWinner(round,matchIdx,winnerKey){
  tourneyBracket.rounds[round][matchIdx].winner=winnerKey;
  // Propagate winner to next round
  if(round===0){
    const sfIdx=Math.floor(matchIdx/2);
    const slot=matchIdx%2===0?'p1Key':'p2Key';
    tourneyBracket.rounds[1][sfIdx][slot]=winnerKey;
  } else if(round===1){
    const slot=matchIdx===0?'p1Key':'p2Key';
    tourneyBracket.rounds[2][0][slot]=winnerKey;
  }
  renderTourneyBracket();
  // Tournament champion
  if(round===2) setTimeout(()=>showTourneyChampion(winnerKey),600);
}

function showTourneyChampion(winnerKey){
  const cfg=CHAR_DEFS[winnerKey];
  const isPlayer=winnerKey===tourneyBracket.playerKey;
  document.getElementById('ovico').textContent='🏆';
  document.getElementById('ovtitle').textContent=(cfg?cfg.name:winnerKey)+' wins the Tournament!';
  document.getElementById('ovtitle').style.color=(cfg&&cfg.col)||'#f0cc6a';
  document.getElementById('ovdesc').textContent=isPlayer?
    'Your wizard has triumphed over all challengers!':
    (cfg?cfg.name:winnerKey)+' is the Tournament Champion!';
  document.getElementById('btn-continue').textContent='Back to Title';
  document.getElementById('overlay').classList.add('active');
}

function simulateTourneyMatch(round,matchIdx){
  const match=tourneyBracket.rounds[round][matchIdx];
  if(!match.p1Key||!match.p2Key||match.winner) return;
  const winnerKey=simulateMatch(match.p1Key,match.p2Key);
  setTourneyMatchWinner(round,matchIdx,winnerKey);
}

function startWatchTourneyMatch(round,matchIdx){
  const match=tourneyBracket.rounds[round][matchIdx];
  if(!match.p1Key||!match.p2Key||match.winner) return;
  watchMode=true; tourneyMode=true;
  tourneyCurrentMatch={round,matchIdx};
  p1Key=match.p1Key; p2Key=match.p2Key;
  p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key];
  tournamentQueue=[]; tournamentIndex=0;
  trainingMode=false; twoPlayerMode=false; arcadeMode=false;
  startNextBattle();
  // Override myTurn so AI drives p1's first move
  gs.myTurn=false; gs.busy=true;
  document.getElementById('actionbar').style.display='none';
  setTimeout(()=>(aiDifficulty==='normal'?doAINormal:doAI)('p1'),1200);
}

function startPlayTourneyMatch(round,matchIdx){
  const match=tourneyBracket.rounds[round][matchIdx];
  if(!match.p1Key||!match.p2Key||match.winner) return;
  const tb=tourneyBracket;
  watchMode=false; tourneyMode=true;
  tourneyCurrentMatch={round,matchIdx};
  // Player's character is always p1 for play mode
  if(match.p1Key===tb.playerKey){
    p1Key=match.p1Key; p2Key=match.p2Key;
  } else {
    p1Key=match.p2Key; p2Key=match.p1Key;
  }
  p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key];
  tournamentQueue=[]; tournamentIndex=0;
  trainingMode=false; twoPlayerMode=false; arcadeMode=false;
  document.getElementById('actionbar').style.display='';
  startNextBattle();
}

// ── BATTLE CANVAS ──────────────────────────────────────────
const bc=document.getElementById('bcanvas');
const bx=bc.getContext('2d');

function resizeBC(){
  bW=bc.offsetWidth;
  bH=Math.round(bW*0.52);
  bc.width=bW; bc.height=bH;
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
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
  runeRing(bW*.22,bH*.83,28,`rgba(${hexToRgb(p1Cfg.col)},0.13)`);
  if(p2Cfg) runeRing(bW*.78,bH*.83,28,`rgba(${hexToRgb(p2Cfg.col)},0.13)`);
}

// ── SPRITESHEET CONFIG ─────────────────────────────────────
const SPRITE_CFG={
  frameW:48, frameH:64, frames:4,
  animRows:{idle:0,cast:1,hit:2,shield:3,death:4},
};
const sprites={p1:null,p2:null};
const spriteStatus={p1:'loading',p2:'loading'};

function loadSprites(){
  sprites.p1=null; sprites.p2=null;
  spriteStatus.p1='loading'; spriteStatus.p2='loading';
  const img1=new Image();
  img1.onload =()=>{sprites.p1=img1; spriteStatus.p1='ready';};
  img1.onerror=()=>{spriteStatus.p1='failed';};
  img1.src=p1Cfg.sprite;
  if(p2Cfg){
    const img2=new Image();
    img2.onload =()=>{sprites.p2=img2; spriteStatus.p2='ready';};
    img2.onerror=()=>{spriteStatus.p2='failed';};
    img2.src=p2Cfg.sprite;
  } else {
    spriteStatus.p2='failed';
  }
}

const animState={p1:{frame:0,timer:0},p2:{frame:0,timer:0}};
const FRAME_MS=180;
const ANIM_FRAMES={idle:3,cast:4,hit:2,shield:2,death:4};

function tickAnimFrame(who,dt){
  const a=animState[who];
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
  if(state&&state.invisible>0) bx.globalAlpha=0.35;
  else if(state&&state.blink>0) bx.globalAlpha=0.3+0.7*(0.5+0.5*Math.sin(t/350));
  if(state&&state.stoneskin>0&&state.stoneskinHp>0) bx.filter='grayscale(0.75) sepia(0.15)';
  const img=sprites[who];
  if(img&&spriteStatus[who]==='ready'){
    const cfg=SPRITE_CFG;
    const row=cfg.animRows[animName]??cfg.animRows.idle;
    const frame=animState[who].frame;
    const srcX=frame*cfg.frameW, srcY=row*cfg.frameH;
    const scale=sz/cfg.frameH, dw=cfg.frameW*scale, dh=cfg.frameH*scale;
    const lift=animName==='cast'?-sz*.06:0;
    const shake=animName==='hit'?Math.sin(t/60)*sz*.03:0;
    const bob=animName==='idle'?Math.sin(t/500+x)*sz*.015:0;
    const dy=lift+shake+bob;
    if(flip){
      bx.scale(-1,1);
      bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,-x-dw/2,y-dh+dy,dw,dh);
    } else {
      bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,x-dw/2,y-dh+dy,dw,dh);
    }
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
  if(headless) return;
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

function addFloat(x,y,t,col,sz=17){ if(headless) return; gs.floats.push({x,y,t,col,sz,life:1}); }

// ── SPELL PROJECTILES ──────────────────────────────────────
function spawnProj(x1,y1,x2,y2,element,col,cb){
  if(headless){ if(cb) cb(); return; }
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

// ── BEAM FLASH EFFECTS ─────────────────────────────────────
function spawnBeam(x1,y1,x2,y2,col){
  if(headless) return;
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

// ── STATUS BAR ─────────────────────────────────────────────
function refreshStatusBar(){
  const el=document.getElementById('statusbar');
  const tags=[];
  if(gs.p1.resist>0)      tags.push(`<span class="status-tag resist">🩸 ${p1Cfg.name} RESIST (${gs.p1.resist})</span>`);
  if(gs.p1.burn>0)        tags.push(`<span class="status-tag burn">🔥 ${p1Cfg.name} BURNING (${gs.p1.burn})</span>`);
  if(gs.p1.frozen>0)      tags.push(`<span class="status-tag freeze">❄️ ${p1Cfg.name} FROZEN (${gs.p1.frozen})</span>`);
  if(gs.p1.empowered)     tags.push(`<span class="status-tag empower">💪 ${p1Cfg.name} EMPOWERED</span>`);
  if(gs.p1.foresight)     tags.push(`<span class="status-tag foresight">🔮 ${p1Cfg.name} FORESIGHT</span>`);
  if(gs.p1.regen)         tags.push(`<span class="status-tag regen">💚 ${p1Cfg.name} REGEN (${gs.p1.regen.turns}t)</span>`);
  if(gs.p1.timeDrain>0)   tags.push(`<span class="status-tag timedrain">⏳ ${p1Cfg.name} DRAINED (${gs.p1.timeDrain})</span>`);
  if(gs.p1.ward>0)        tags.push(`<span class="status-tag ward">🔰 ${p1Cfg.name} WARDED (${gs.p1.ward})</span>`);
  if(gs.p1.vineWhip>0)   tags.push(`<span class="status-tag burn">🌱 ${p1Cfg.name} VINE WHIP (${gs.p1.vineWhip})</span>`);
  if(gs.p1.haste>0)      tags.push(`<span class="status-tag foresight">💨 ${p1Cfg.name} HASTE (${gs.p1.haste})</span>`);
  if(gs.p1.frenzied>0)   tags.push(`<span class="status-tag resist">💢 ${p1Cfg.name} FRENZIED (${gs.p1.frenzied})</span>`);
  if(gs.p1.blink>0)      tags.push(`<span class="status-tag blink">💫 ${p1Cfg.name} BLINK (${gs.p1.blink})</span>`);
  if(gs.p1.weakened)     tags.push(`<span class="status-tag weakened">🌀 ${p1Cfg.name} WEAKENED</span>`);
  if(gs.p1.invisible>0)  tags.push(`<span class="status-tag invisible">👻 ${p1Cfg.name} INVISIBLE (${gs.p1.invisible})</span>`);
  if(gs.p1.frostArmor>0)  tags.push(`<span class="status-tag freeze">🛡️ ${p1Cfg.name} FROST ARMOR (${gs.p1.frostArmor})</span>`);
  if(gs.p1.blizzard>0)    tags.push(`<span class="status-tag freeze">🌨️ ${p1Cfg.name} BLIZZARD (${gs.p1.blizzard})</span>`);
  if(gs.p1.flameShield>0) tags.push(`<span class="status-tag burn">🛡️ ${p1Cfg.name} FLAME SHIELD (${gs.p1.flameShield})</span>`);
  if(gs.p1.candle>0)        tags.push(`<span class="status-tag burn">🕯️ ${p1Cfg.name} CANDLE (${gs.p1.candle})</span>`);
  if(gs.p1.charge>0)        tags.push(`<span class="status-tag foresight">⚡ ${p1Cfg.name} CHARGED (${gs.p1.charge})</span>`);
  if(gs.p1.conductivity>0)  tags.push(`<span class="status-tag burn">💡 ${p1Cfg.name} CONDUCTIVE (${gs.p1.conductivity})</span>`);
  if(gs.p1.agony>0)         tags.push(`<span class="status-tag burn">💀 ${p1Cfg.name} AGONY (${gs.p1.agony})</span>`);
  if(gs.p1.silence>0)       tags.push(`<span class="status-tag timedrain">🔇 ${p1Cfg.name} SILENCED (${gs.p1.silence})</span>`);
  if(gs.p1.corruption>0)    tags.push(`<span class="status-tag burn">☠️ ${p1Cfg.name} CORRUPTED (${gs.p1.corruption})</span>`);
  if(p2Cfg){
    if(gs.p2.resist>0)    tags.push(`<span class="status-tag resist">🩸 ${p2Cfg.name} RESIST (${gs.p2.resist})</span>`);
    if(gs.p2.burn>0)      tags.push(`<span class="status-tag burn">🔥 ${p2Cfg.name} BURNING (${gs.p2.burn})</span>`);
    if(gs.p2.frozen>0)    tags.push(`<span class="status-tag freeze">❄️ ${p2Cfg.name} FROZEN (${gs.p2.frozen})</span>`);
    if(gs.p2.empowered)   tags.push(`<span class="status-tag empower">💪 ${p2Cfg.name} EMPOWERED</span>`);
    if(gs.p2.foresight)   tags.push(`<span class="status-tag foresight">🔮 ${p2Cfg.name} FORESIGHT</span>`);
    if(gs.p2.regen)       tags.push(`<span class="status-tag regen">💚 ${p2Cfg.name} REGEN (${gs.p2.regen.turns}t)</span>`);
    if(gs.p2.timeDrain>0) tags.push(`<span class="status-tag timedrain">⏳ ${p2Cfg.name} DRAINED (${gs.p2.timeDrain})</span>`);
    if(gs.p2.ward>0)      tags.push(`<span class="status-tag ward">🔰 ${p2Cfg.name} WARDED (${gs.p2.ward})</span>`);
    if(gs.p2.vineWhip>0)  tags.push(`<span class="status-tag burn">🌱 ${p2Cfg.name} VINE WHIP (${gs.p2.vineWhip})</span>`);
    if(gs.p2.haste>0)     tags.push(`<span class="status-tag foresight">💨 ${p2Cfg.name} HASTE (${gs.p2.haste})</span>`);
    if(gs.p2.frenzied>0)  tags.push(`<span class="status-tag resist">💢 ${p2Cfg.name} FRENZIED (${gs.p2.frenzied})</span>`);
    if(gs.p2.blink>0)     tags.push(`<span class="status-tag blink">💫 ${p2Cfg.name} BLINK (${gs.p2.blink})</span>`);
    if(gs.p2.weakened)    tags.push(`<span class="status-tag weakened">🌀 ${p2Cfg.name} WEAKENED</span>`);
    if(gs.p2.invisible>0) tags.push(`<span class="status-tag invisible">👻 ${p2Cfg.name} INVISIBLE (${gs.p2.invisible})</span>`);
    if(gs.p2.frostArmor>0)  tags.push(`<span class="status-tag freeze">🛡️ ${p2Cfg.name} FROST ARMOR (${gs.p2.frostArmor})</span>`);
    if(gs.p2.blizzard>0)    tags.push(`<span class="status-tag freeze">🌨️ ${p2Cfg.name} BLIZZARD (${gs.p2.blizzard})</span>`);
    if(gs.p2.flameShield>0) tags.push(`<span class="status-tag burn">🛡️ ${p2Cfg.name} FLAME SHIELD (${gs.p2.flameShield})</span>`);
    if(gs.p2.candle>0)        tags.push(`<span class="status-tag burn">🕯️ ${p2Cfg.name} CANDLE (${gs.p2.candle})</span>`);
    if(gs.p2.charge>0)        tags.push(`<span class="status-tag foresight">⚡ ${p2Cfg.name} CHARGED (${gs.p2.charge})</span>`);
    if(gs.p2.conductivity>0)  tags.push(`<span class="status-tag burn">💡 ${p2Cfg.name} CONDUCTIVE (${gs.p2.conductivity})</span>`);
    if(gs.p2.agony>0)         tags.push(`<span class="status-tag burn">💀 ${p2Cfg.name} AGONY (${gs.p2.agony})</span>`);
    if(gs.p2.silence>0)       tags.push(`<span class="status-tag timedrain">🔇 ${p2Cfg.name} SILENCED (${gs.p2.silence})</span>`);
    if(gs.p2.corruption>0)    tags.push(`<span class="status-tag burn">☠️ ${p2Cfg.name} CORRUPTED (${gs.p2.corruption})</span>`);
  }
  el.innerHTML=tags.join('');
}

// ── BATTLE LOOP ────────────────────────────────────────────
let battleRunning=false, gameEnded=false;
function battleLoop(ts){
  if(!battleRunning) return;
  requestAnimationFrame(battleLoop);
  const dt=lastFrameTime?Math.min(ts-lastFrameTime,100):16;
  lastFrameTime=ts;
  tickAnimFrame('p1',dt);
  tickAnimFrame('p2',dt);
  resizeBC();
  drawBG();
  const gy=bH*.74, wsz=bH*.3;
  drawWiz(bW*.22+(gs.p1xOff||0),gy,wsz,p1Cfg.col,true, gs.p1anim,gs.p1.shield,gs.p1.ward,'p1',gs.p1.foresight,gs.p1);
  drawWiz(bW*.78+(gs.p2xOff||0),gy,wsz,p2Cfg.col,false,gs.p2anim,gs.p2.shield,gs.p2.ward,'p2',gs.p2.foresight,gs.p2);
  tickProjs(); tickBeams(); tickManaBurnFire(); tickParts(); tickFloats();
  if(!gs.myTurn&&!gs.busy&&!twoPlayerMode){
    bx.fillStyle=`rgba(${hexToRgb(p2Cfg.col)},0.7)`; bx.font='bold 10px Cinzel,serif';
    bx.textAlign='center'; bx.fillText(p2Cfg.name+' IS CASTING…',bW*.5,bH*.56);
  }
  if(twoPlayerMode&&gs.myTurn){
    const twoCfg=gs.turnPlayer==='p1'?p1Cfg:p2Cfg;
    const twoNum=gs.turnPlayer==='p1'?1:2;
    bx.fillStyle=`rgba(${hexToRgb(twoCfg.col)},0.75)`;
    bx.font='bold 9px Cinzel,serif'; bx.textAlign='center';
    bx.fillText('PLAYER '+twoNum+' — YOUR TURN',bW*.5,bH*.57);
  }
  refreshHUD();
  refreshStatusBar();
}

// ── HUD ────────────────────────────────────────────────────
function refreshHUD(){
  if(headless) return;
  document.getElementById('p1hpf').style.height=Math.max(0,gs.p1.hp/gs.p1.maxHp*100)+'%';
  document.getElementById('p2hpf').style.height=Math.max(0,gs.p2.hp/gs.p2.maxHp*100)+'%';
  document.getElementById('sh1').style.opacity=gs.p1.shield>0||gs.p1.ward>0?'1':'0.18';
  document.getElementById('sh2').style.opacity=gs.p2.shield>0||gs.p2.ward>0?'1':'0.18';
  const fs2=document.getElementById('fs2'); if(fs2) fs2.style.opacity=gs.p2.foresight?'1':'0';
  const ct1=document.getElementById('ct1'); if(ct1) ct1.classList.toggle('active',!!gs.p1.counter);
  const ct2=document.getElementById('ct2'); if(ct2) ct2.classList.toggle('active',!!gs.p2.counter);
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

function refreshMana(fillId,valId,val){
  document.getElementById(fillId).style.height=(val/MAX_MANA*100)+'%';
  document.getElementById(valId).textContent=val;
}

function refreshActionBar(){
  const who=twoPlayerMode?gs.turnPlayer:'p1';
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const busy=!gs.myTurn||gs.busy;
  const frenzied=whoState.frenzied>0;
  document.getElementById('bchannel').classList.toggle('off',busy||frenzied);
  document.getElementById('bcastspell').classList.toggle('off',busy||frenzied);
  (whoCfg.spells||[]).forEach(spell=>{
    const btn=document.getElementById('bspell-'+spell.id);
    if(!btn) return;
    const blocked=charSpellBlocked(spell.id,whoState,whoCfg,oppState);
    btn.classList.toggle('off',busy||whoState.mana<spell.cost||blocked);
  });
}

function charSpellBlocked(spellId,casterState,casterCfg,targetState){
  if(casterState.frenzied>0&&spellId!=='basicattack') return true;
  if(spellId==='shield')     return casterState.shield>0;
  if(spellId==='counter')    return !casterState.shield || casterState.counter;
  if(spellId==='empower')    return casterState.empowered;
  if(spellId==='bloodpact')  return casterState.hp<=(casterCfg.bpCost||0);
  if(spellId==='heal')       return casterState.regen!==null||casterState.hp>=casterState.maxHp;
  if(spellId==='entangle')   return targetState.frozen>0;
  if(spellId==='foresight')  return casterState.foresight;
  if(spellId==='timedrain')  return targetState.timeDrain>0;
  if(spellId==='warpaint')   return casterState.resist>0;
  if(spellId==='charge'){
    const cost=casterState.resist>0?Math.round((casterCfg.frenzyHpCost||15)*0.67):(casterCfg.frenzyHpCost||15);
    return casterState.hp<=cost;
  }
  if(spellId==='vanish')     return casterState.invisible>0;
  if(spellId==='manasiphon') return !casterState.invisible||targetState.mana<=0;
  if(spellId==='ward')       return casterState.ward>0;
  if(spellId==='drain')      return false;
  if(spellId==='vinewhip')   return targetState.vineWhip>0;
  if(spellId==='haste')      return casterState.haste>0;
  if(spellId==='frenzy'){
    const cost=casterState.resist>0?Math.round((casterCfg.frenzyHpCost||15)*0.67):(casterCfg.frenzyHpCost||15);
    return casterState.hp<=cost;
  }
  if(spellId==='blink')      return casterState.blink>0;
  if(spellId==='icelance')    return false;
  if(spellId==='frostarmor')  return casterState.frostArmor>0;
  if(spellId==='blizzard')    return targetState.blizzard>0;
  if(spellId==='fireball')    return false;
  if(spellId==='flameshield')    return casterState.flameShield>0;
  if(spellId==='candle')         return targetState.candle>0;
  if(spellId==='galvanize')      return false;
  if(spellId==='chainlightning') return casterState.charge<(casterCfg.chainLightningChargeCost||8);
  if(spellId==='conductivity')   return targetState.conductivity>0;
  if(spellId==='divineheal')     return casterState.hp>=casterState.maxHp;
  if(spellId==='purge')          return !(casterState.burn>0||casterState.frozen>0||casterState.blizzard>0||casterState.vineWhip>0||casterState.timeDrain>0||casterState.conductivity>0||casterState.candle>0||casterState.agony>0||casterState.corruption>0||casterState.silence>0);
  if(spellId==='agony')          return targetState.agony>0;
  if(spellId==='silence')        return targetState.silence>0;
  if(spellId==='corruption')     return targetState.corruption>0;
  if(spellId==='stoneskin')      return casterState.stoneskin>0;
  if(spellId==='stonesoul')      return casterState.stonesoul>0;
  if(spellId==='rockfall')       return false;
  return false;
}

// ── PLAYER ACTIONS ─────────────────────────────────────────
function act(type){
  if(!gs.myTurn||gs.busy) return;
  resizeBC();
  if(p2pMode) p2pLastAction=type;

  const who=twoPlayerMode?gs.turnPlayer:'p1';
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const cx=who==='p1'?bW*.22:bW*.78;
  const tx=who==='p1'?bW*.78:bW*.22;

  // Commit action and hand off to resolution phase.
  // 2P: endMyTurn() shows next-player handoff or triggers resolveSimRound.
  // AI mode: grab AI decision synchronously then call resolveSimRound directly.
  const commitAction=action=>{
    if(who==='p1') pendingP1Action=action;
    else pendingP2Action=action;
    if(twoPlayerMode){
      endMyTurn();
    } else {
      pendingP2Action=aiChooseSync('p2');
      resolveSimRound();
    }
  };

  if(type==='channel'){
    commitAction({type:'channel', channelGain:whoState.timeDrain>0?2:whoCfg.channelAmt});
    return;
  }

  // Universal spell (with puzzle minigame)
  const spell=SPELLS.find(s=>s.element===type);
  if(spell){
    if(whoState.mana<spell.cost) return;
    if(whoState.frenzied>0) return;
    if(whoState.silence>0&&_rng()<0.45){
      commitAction({type, ok:false, silenced:true});
      return;
    }
    const launchers={
      fire:      launchPatternEcho,
      lightning: launchLightningPattern,
      ice:       launchIcePattern,
      arcane:    launchArcanePattern,
      dispel:    launchDispelPattern,
      manaburn:  launchManaBurnPattern,
    };
    const doLaunch=()=>{
      gs.busy=true;
      launchers[type](spell, ok=>{
        commitAction({type, ok, dispelSelf});
      });
    };
    if(type==='dispel'){
      gs.busy=true;
      showDispelTarget(selfTarget=>{ gs.busy=false; dispelSelf=selfTarget; doLaunch(); });
    } else {
      doLaunch();
    }
    return;
  }

  // Character spell
  const charSpell=whoCfg.spells&&whoCfg.spells.find(s=>s.id===type);
  if(charSpell){
    if(whoState.mana<charSpell.cost) return;
    if(charSpellBlocked(type,whoState,whoCfg,oppState)) return;
    if(charSpell.cost>0&&whoState.silence>0&&_rng()<0.45){
      commitAction({type, ok:false, silenced:true});
      return;
    }
    if(BUFF_TILE_GLYPHS[type]){
      gs.busy=true;
      launchBuffTileMatch(charSpell,type,who,(ok,perfect)=>{
        commitAction({type, ok, perfect, isCharSpell:true});
      });
      return;
    }
    commitAction({type, ok:true, isCharSpell:true});
  }
}

// ── CHARACTER SPELLS (instant) ─────────────────────────────
function resolveCharSpell(spellId,caster,perfect=false){
  const casterState=caster==='p1'?gs.p1:gs.p2;
  const casterCfg  =caster==='p1'?p1Cfg:p2Cfg;
  const targetState=caster==='p1'?gs.p2:gs.p1;
  const targetCfg  =caster==='p1'?p2Cfg:p1Cfg;
  const cx=caster==='p1'?bW*.22:bW*.78;
  const tx=caster==='p1'?bW*.78:bW*.22;

  const spell=casterCfg.spells.find(s=>s.id===spellId);
  casterState.mana=Math.max(0,casterState.mana-spell.cost);

  if(spellId==='shield'){
    casterState.shield=casterCfg.shieldDuration||10;
    casterState.shieldHp=(casterCfg.shieldMaxHp||60)+(perfect?5:0);
    addFloat(cx,bH*.33,'🛡 Shielded! ('+casterState.shieldHp+' HP)','#4af0ff',12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +5 HP','#ffff88',11);
    anim(caster,'shield',700);
  } else if(spellId==='counter'){
    casterState.counter=true;
    addFloat(cx,bH*.33,'⚡ Counter Ready!','#4af0ff',16);
    spawnParts(cx,bH*.38,'#4af0ff',16); spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='empower'){
    casterState.empowered=true;
    addFloat(cx,bH*.33,'💪 Empowered!',casterCfg.col,12);
    spawnParts(cx,bH*.38,casterCfg.col,10);
    anim(caster,'cast',700);
  } else if(spellId==='bloodpact'){
    casterState.hp=Math.max(1,casterState.hp-casterCfg.bpCost);
    casterState.mana=Math.min(MAX_MANA,casterState.mana+casterCfg.bpGain);
    addFloat(cx,bH*.33,'🩸 -'+casterCfg.bpCost+'HP +'+casterCfg.bpGain+' Mana',casterCfg.col,11);
    for(let i=0;i<8;i++)
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:'#cc1111',
        vx:(_rng()-.5),vy:1.5+_rng()*3,sz:2+_rng()*2,life:1,dec:.02});
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+(-0.6+_rng()*1.2), sp=1.5+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,col:'#8844ff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*2,life:1,dec:.02,noGrav:true});
    }
    anim(caster,'cast',700); refreshHUD();
  } else if(spellId==='heal'){
    casterState.regen={remaining:casterCfg.healAmt,turns:10};
    addFloat(cx,bH*.33,'💚 Regenerating!','#44cc88',14);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-0.8+_rng()*1.6), sp=1+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#44ee88':'#88ffcc',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.014,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='entangle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      if(_rng()<0.75){
        targetState.frozen=Math.floor(_rng()*3)+1;
        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
            vx:Math.cos(a+Math.PI)*.9,vy:Math.sin(a+Math.PI)*.9,sz:2+_rng()*2,life:1,dec:.02});
        }
        spawnParts(tx,bH*.38,'#44cc88',8);
        addFloat(tx,bH*.33,'🌿 Entangled!','#44cc88',13);
      } else {
        for(let i=0;i<8;i++)
          gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:bH*.38-bH*.04,col:'#665522',
            vx:(_rng()-.5)*1.5,vy:_rng()*2,sz:2,life:1,dec:.025});
        addFloat(tx,bH*.33,'🌿 Resisted!','#888866',11);
      }
      anim(caster,'cast',800);
    }
  } else if(spellId==='foresight'){
    casterState.foresight=true;
    addFloat(cx,bH*.33,'🔮 Foresight Active!',casterCfg.col,12);
    spawnParts(cx,bH*.38,casterCfg.col,14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='timedrain'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      targetState.timeDrain=casterCfg.timeDrainTurns;
      addFloat(tx,bH*.33,'⏳ Time Drain!',casterCfg.col,12);
      spawnParts(tx,bH*.38,'#cc88ff',12);
      spawnParts(tx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',700);
    }
  } else if(spellId==='vanish'){
    casterState.invisible=3;
    addFloat(cx,bH*.33,'👻 Vanished! (3T)','#b8a0e8',12);
    spawnParts(cx,bH*.38,'#b8a0e8',14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='manasiphon'){
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Absorbed!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      spawnParts(cx,bH*.38,'#b8a0e8',6);
      anim(caster,'cast',600);
    } else if(targetState.shield>0){
      addFloat(tx,bH*.33,'🛡 Shielded!','#4af0ff',12);
      spawnParts(tx,bH*.38,'#4af0ff',10);
      anim(caster,'cast',600);
    } else {
      const steal=Math.min(4,targetState.mana);
      targetState.mana=Math.max(0,targetState.mana-steal);
      casterState.mana=Math.min(MAX_MANA,casterState.mana+steal);
      addFloat(cx,bH*.33,'🌀 +'+steal+' Mana Stolen!','#b8a0e8',13);
      addFloat(tx,bH*.33,'−'+steal+' Mana','#b8a0e8',11);
      spawnParts(tx,bH*.38,'#b8a0e8',14);
      spawnParts(cx,bH*.38,'#b8a0e8',8);
      anim(caster,'cast',700);
      refreshHUD();
    }
  } else if(spellId==='warpaint'){
    casterState.resist=5+(perfect?1:0);
    addFloat(cx,bH*.33,'🩸 War Paint! -33% dmg',casterCfg.col,12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<8;i++)
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.35,col:'#cc1111',
        vx:(_rng()-.5)*1.5,vy:1+_rng()*2.5,sz:2+_rng()*2,life:1,dec:.025});
    spawnParts(cx,bH*.38,casterCfg.col,10);
    anim(caster,'shield',700);
    refreshHUD();
  } else if(spellId==='charge'){
    const chargeSelfCost=casterState.resist>0?Math.round(casterCfg.frenzyHpCost*0.67):casterCfg.frenzyHpCost;
    casterState.hp=Math.max(1,casterState.hp-chargeSelfCost);
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round(casterCfg.chargeDmg*casterCfg.dmgMult);
    gs.busy=true;
    lunge(caster,()=>{
      if(!battleRunning) return;
      if(targetState.foresight){
        addFloat(tx,bH*.38-20,'🔮 Foreseen!','#ffcc44',15);
        targetState.foresight=false;
        spawnParts(tx,bH*.38,'#ffcc44',18);
        spawnParts(tx,bH*.38,casterCfg.col,10);
        spawnParts(tx,bH*.38,'#ffffff',6);
      } else if(targetState.invisible>0){
        addFloat(tx,bH*.38-20,'👻 Missed!','#b8a0e8',15);
        spawnParts(tx,bH*.38,'#b8a0e8',12);
      } else if(targetState.haste>0&&_rng()<0.25){
        addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',12);
      } else if(targetState.blink>0&&_rng()<0.5){
        addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
        spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
        flash('#9988cc');
      } else {
        if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
        if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
        const [chDmg,chSkin]=applyTargetSkins(targetState,dmg,true);
        dmg=chDmg;
        if(chSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+chSkin+' Skin','#b08040',10);
        if(targetState.shield>0){
          const absorbed=Math.min(dmg,targetState.shieldHp);
          targetState.shieldHp-=absorbed;
          dmg-=absorbed;
          if(targetState.shieldHp<=0){
            targetState.shield=0; targetState.counter=false;
            addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
            spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
          } else {
            addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
            spawnParts(tx,bH*.38,'#4af0ff',8); spawnParts(tx,bH*.38,'#ffffff',4);
          }
        }
        targetState.hp=Math.max(0,targetState.hp-dmg);
        if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
        if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
        if(targetState.charge>0){
          applyDischarge(targetState,casterState,cx,tx);
          checkWin(); if(!battleRunning) return;
        }
        spawnParts(tx,bH*.38,casterCfg.col,22);
        addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,22);
        flash(casterCfg.col);
        if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
        else             {anim('p2','cast',800); anim('p1','hit',800);}
      }
      refreshHUD(); checkWin(); if(!battleRunning) return;
      if(caster==='p1'||twoPlayerMode){ endMyTurn(); }
      else { if(!simCallback) tickStatuses(casterState); combatTimeout(finishAI,900); }
    });
    return;
  } else if(spellId==='ward'){
    casterState.ward=3;
    addFloat(cx,bH*.33,'🔰 Warded! (3T)',casterCfg.col,13);
    spawnParts(cx,bH*.38,'#ffcc44',14);
    spawnParts(cx,bH*.38,'#ffffff',6);
    anim(caster,'shield',700);
  } else if(spellId==='drain'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      let dmg=Math.round(18*casterCfg.dmgMult);
      if(casterState.empowered){
        dmg=Math.round(dmg*(casterCfg.empowerMult||1.5));
        casterState.empowered=false;
        addFloat(tx,bH*.33-20,'💪 Empowered!',casterCfg.col,10);
      }
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [drainDmg2,drainSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=drainDmg2;
      if(drainSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+drainSkin+' Skin','#b08040',10);
      let drainBase=dmg;
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed; drainBase-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      const healAmt=Math.max(0,Math.round(drainBase*0.45));
      casterState.hp=Math.min(casterState.maxHp,casterState.hp+healAmt);
      spawnBeam(cx,bH*.38,tx,bH*.38,'#cc1111');
      spawnParts(tx,bH*.38,'#cc1111',18);
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+(-0.6+_rng()*1.2),sp=1.5+_rng()*2.5;
        gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,col:'#cc1111',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*2,life:1,dec:.018,noGrav:true});
      }
      addFloat(tx,bH*.38,'-'+dmg,'#cc1111',20);
      addFloat(cx,bH*.33,'+'+healAmt+' 🩸',casterCfg.col,14);
      flash('#cc1111');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='vinewhip'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      targetState.vineWhip=3;
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.07,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+_rng()*2,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#44cc88',10);
      addFloat(tx,bH*.33,'🌱 Vine Whip! (3T)','#44cc88',13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='haste'){
    casterState.haste=3;
    addFloat(cx,bH*.33,'💨 Haste! (3T)',casterCfg.col,13);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-1.0+_rng()*2.0),sp=1.5+_rng()*3;
      gs.parts.push({x:cx,y:bH*.38,col:i%2?casterCfg.col:'#ffffff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*2.5,life:1,dec:.016,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='frenzy'){
    const frenzySelfCost=casterState.resist>0?Math.round(casterCfg.frenzyHpCost*0.67):casterCfg.frenzyHpCost;
    casterState.hp=Math.max(1,casterState.hp-frenzySelfCost);
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    gs.busy=true;
    addFloat(cx,bH*.28,'💢 FRENZY!',casterCfg.col,16);
    spawnParts(cx,bH*.38,casterCfg.col,18);
    let frenzyHitsDone=0;
    function doFrenzyStrike(){
      if(!battleRunning) return;
      lunge(caster,0.12,()=>{
        if(!battleRunning) return;
        doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
        refreshHUD(); checkWin(); if(!battleRunning) return;
        frenzyHitsDone++;
        if(frenzyHitsDone<3){
          combatTimeout(doFrenzyStrike,300);
        } else {
          if(caster==='p1'||twoPlayerMode){
            endMyTurn();
          } else {
            if(!simCallback) tickStatuses(casterState);
            combatTimeout(finishAI,900);
          }
        }
      });
    }
    doFrenzyStrike();
    return;
  } else if(spellId==='blink'){
    casterState.blink=3;
    addFloat(cx,bH*.33,'💫 Blink! (3T)',casterCfg.col,17);
    spawnParts(cx,bH*.38,'#9988cc',22); spawnParts(cx,bH*.38,'#ffffff',8);
    anim(caster,'shield',700);
  } else if(spellId==='fireball'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const baseRoll=16+Math.floor(_rng()*9);
    let dmg=Math.round(baseRoll*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6600',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [fbDmg,fbSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=fbDmg;
      if(fbSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+fbSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#ff6600':'#ffaa00',
          vx:Math.cos(a+Math.PI)*1.4,vy:Math.sin(a+Math.PI)*1.4-0.5,sz:2+_rng()*3,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#ff6600',20);
      addFloat(tx,bH*.38,'-'+dmg,'#ff6600',20);
      flash('#ff6600');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='flameshield'){
    casterState.flameShield=5+(perfect?1:0);
    addFloat(cx,bH*.33,'🔥 Flame Shield! ('+casterState.flameShield+'T)',casterCfg.col,13);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#ff6600':'#ffaa00',
        vx:Math.cos(a)*1.0,vy:Math.sin(a)*1.0-0.5,sz:2+_rng()*2.5,life:1,dec:.018,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#ff6600',8); spawnParts(cx,bH*.38,'#ffaa00',4);
    anim(caster,'shield',700);
  } else if(spellId==='candle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6600',6);
      anim(caster,'cast',600);
    } else {
      targetState.candle=3;
      for(let i=0;i<12;i++){
        const a=_rng()*Math.PI*2;
        gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#ff6600':'#ffaa00',
          vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-1.5,sz:1.5+_rng()*2,life:1,dec:.018,noGrav:true});
      }
      spawnParts(tx,bH*.38,'#ff6600',10);
      addFloat(tx,bH*.33,'🕯️ Candle! (4T)',casterCfg.col,13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='icelance'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round((casterCfg.iceLanceDmg||28)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#88ddff',6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [ilDmg,ilSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=ilDmg;
      if(ilSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+ilSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      for(let i=0;i<16;i++){
        const a=i/16*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.05,y:bH*.38+Math.sin(a)*bH*.03,col:'#88ddff',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+_rng()*2.5,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#88ddff',18);
      addFloat(tx,bH*.38,'-'+dmg,'#88ddff',20);
      flash('#88ddff');
      if(_rng()<(casterCfg.iceLanceFreeze||0.35)&&targetState.frozen<=0){
        if(targetState.ward>0){
          targetState.ward=0;
          addFloat(tx,bH*.33+20,'🔰 Warded!','#ffcc44',11);
        } else {
          targetState.frozen=1;
          addFloat(tx,bH*.33+20,'❄️ Frozen!','#88ddff',12);
        }
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='frostarmor'){
    casterState.frostArmor=(casterCfg.frostArmorDur||4)+(perfect?1:0);
    addFloat(cx,bH*.33,'❄️ Frost Armor! ('+casterState.frostArmor+'T)','#88ddff',13);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +1 Turn','#ffff88',11);
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#88ddff',
        vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-0.5,sz:2+_rng()*2.5,life:1,dec:.016,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#aaeeff',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  } else if(spellId==='blizzard'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#88ddff',6);
      anim(caster,'cast',600);
    } else {
      targetState.blizzard=casterCfg.blizzardDur||5;
      for(let i=0;i<20;i++){
        const a=_rng()*Math.PI*2, r=bH*(0.05+_rng()*0.08);
        gs.parts.push({x:tx+Math.cos(a)*r,y:bH*.38+Math.sin(a)*r*0.5,col:'#88ddff',
          vx:Math.cos(a)*0.6+(_rng()-.5)*0.8,vy:Math.sin(a)*0.6-1-_rng()*2,
          sz:1.5+_rng()*2.5,life:1,dec:.012,noGrav:true});
      }
      spawnParts(tx,bH*.38,'#88ddff',12); spawnParts(tx,bH*.38,'#aaeeff',6);
      addFloat(tx,bH*.33,'🌨️ Blizzard! ('+targetState.blizzard+'T)','#88ddff',13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='galvanize'){
    const gain=casterCfg.galvanizeChargeGain||8;
    casterState.charge=(casterState.charge||0)+gain;
    addFloat(cx,bH*.33,'🔋 +'+gain+' Charge!',casterCfg.col,13);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#aaff44':'#88ffcc',
        vx:Math.cos(a)*0.9,vy:Math.sin(a)*0.9-0.5,sz:2+_rng()*2.5,life:1,dec:.018,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#aaff44',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  } else if(spellId==='chainlightning'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    const chargeCost=casterCfg.chainLightningChargeCost||8;
    casterState.charge=Math.max(0,casterState.charge-chargeCost);
    let dmg=Math.round((casterCfg.chainLightningDmg||24)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)       dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0)   dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      const [clDmg,clSkin]=applyTargetSkins(targetState,dmg,false);
      dmg=clDmg;
      if(clSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+clSkin+' Skin','#b08040',10);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0; targetState.counter=false;
          addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
          spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
        } else {
          addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
          spawnParts(tx,bH*.38,'#4af0ff',8);
        }
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      // Lightning arc visual
      for(let i=0;i<14;i++){
        const a=i/14*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.05,y:bH*.38+Math.sin(a)*bH*.03,col:i%2?'#aaff44':'#ffffff',
          vx:Math.cos(a+Math.PI)*1.5,vy:Math.sin(a+Math.PI)*1.5,sz:2+_rng()*2,life:1,dec:.022});
      }
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col);
      spawnParts(tx,bH*.38,casterCfg.col,18);
      addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,20);
      flash(casterCfg.col);
      // Arc chance
      if(_rng()<(casterCfg.chainArcChance||0.35)){
        const arcDmg=casterCfg.chainArcDmg||10;
        if(targetState.hp>0){
          targetState.hp=Math.max(0,targetState.hp-arcDmg);
          addFloat(tx,bH*.33+20,'⚡ Arc! −'+arcDmg,casterCfg.col,13);
          spawnParts(tx,bH*.38,casterCfg.col,8);
        }
      }
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='conductivity'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,casterCfg.col,6);
      anim(caster,'cast',600);
    } else {
      targetState.conductivity=casterCfg.conductivityDur||3;
      for(let i=0;i<14;i++){
        const a=_rng()*Math.PI*2;
        gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:bH*.38,col:i%2?'#aaff44':'#88ffcc',
          vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-1.2,sz:1.5+_rng()*2,life:1,dec:.016,noGrav:true});
      }
      spawnParts(tx,bH*.38,casterCfg.col,10);
      addFloat(tx,bH*.33,'💡 Conductive! ('+targetState.conductivity+'T)',casterCfg.col,13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='agony'||spellId==='silence'||spellId==='corruption'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false; spawnParts(tx,bH*.38,'#ffcc44',14); anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15); spawnParts(tx,bH*.38,'#b8a0e8',12); anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15); spawnParts(tx,bH*.38,'#ffcc44',12); anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward--;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13); spawnParts(tx,bH*.38,'#ffcc44',14); anim(caster,'cast',600);
    } else {
      if(spellId==='agony'){
        targetState.agony=casterCfg.agonyDur||4; targetState.agonyDmg=casterCfg.agonyDmg||12;
        addFloat(tx,bH*.33,'💀 Agony! ('+targetState.agony+'T)',casterCfg.col,14);
      } else if(spellId==='silence'){
        targetState.silence=casterCfg.silenceDur||4;
        addFloat(tx,bH*.33,'🔇 Silenced! ('+targetState.silence+'T)',casterCfg.col,14);
      } else {
        targetState.corruption=casterCfg.corruptionDur||3;
        addFloat(tx,bH*.33,'☠️ Corrupted! ('+targetState.corruption+'T)',casterCfg.col,14);
      }
      spawnParts(tx,bH*.38,casterCfg.col,18); spawnParts(tx,bH*.38,'#110011',8);
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col); flash(casterCfg.col);
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
    refreshHUD();
  } else if(spellId==='divineheal'){
    const healAmt=casterCfg.healAmt||40;
    const actual=Math.min(healAmt, casterState.maxHp-casterState.hp);
    casterState.hp=Math.min(casterState.maxHp, casterState.hp+healAmt);
    addFloat(cx,bH*.33,'💛 +'+actual+' Healed!',casterCfg.col,14);
    for(let i=0;i<16;i++){
      const a=-Math.PI/2+(-0.9+_rng()*1.8), sp=1+_rng()*2.5;
      gs.parts.push({x:cx+(_rng()-.5)*bH*.05,y:bH*.38,col:i%2?'#ffe090':'#fff8c0',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.014,noGrav:true});
    }
    flash(casterCfg.col);
    anim(caster,'cast',700); refreshHUD();
  } else if(spellId==='purge'){
    const cleared=[];
    if(casterState.burn>0)        {casterState.burn=0;         cleared.push('🔥');}
    if(casterState.frozen>0)      {casterState.frozen=0;       cleared.push('❄️');}
    if(casterState.blizzard>0)    {casterState.blizzard=0;     cleared.push('🌨️');}
    if(casterState.vineWhip>0)    {casterState.vineWhip=0;     cleared.push('🌿');}
    if(casterState.timeDrain>0)   {casterState.timeDrain=0;    cleared.push('⏳');}
    if(casterState.conductivity>0){casterState.conductivity=0; cleared.push('💡');}
    if(casterState.candle>0)      {casterState.candle=0;       cleared.push('🕯️');}
    if(casterState.agony>0)       {casterState.agony=0;        cleared.push('💀');}
    if(casterState.corruption>0)  {casterState.corruption=0;   cleared.push('☠️');}
    if(casterState.silence>0)     {casterState.silence=0;      cleared.push('🔇');}
    addFloat(cx,bH*.33,'✨ Purged! '+cleared.join(''),casterCfg.col,13);
    spawnParts(cx,bH*.38,'#fffde0',18); spawnParts(cx,bH*.38,'#ffffff',8);
    flash('#fffff0');
    anim(caster,'shield',700);
    refreshHUD();
  } else if(spellId==='radiant'){
    if(casterState.invisible>0){ casterState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    let dmg=Math.round((casterCfg.radiantDmg||12)*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.33,'🔮 Foreseen!','#ffcc44',13);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&_rng()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&_rng()<0.5){
      addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      const counterTriggered=targetState.counter&&targetState.shield>0;
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        addFloat(tx,bH*.38-20,'☀️ Bypassed!',casterCfg.col,15);
        spawnParts(tx,bH*.38,casterCfg.col,12); spawnParts(tx,bH*.38,'#ffffff',6);
      }
      if(counterTriggered){
        casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
        targetState.counter=false;
        addFloat(cx,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
        spawnParts(cx,bH*.38,'#4af0ff',16);
        spawnBeam(tx,bH*.38,cx,bH*.38,'#4af0ff');
        checkWin(); if(!battleRunning) return;
      }
      targetState.hp=Math.max(0,targetState.hp-dmg);
      if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
      spawnParts(tx,bH*.38,casterCfg.col,16);
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col);
      addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
      flash(casterCfg.col);
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
    }
    refreshHUD(); checkWin();
  } else if(spellId==='stoneskin'){
    casterState.stoneskin=casterCfg.stoneskinDuration||10;
    casterState.stoneskinHp=(casterCfg.stoneskinHpMax||30)+(perfect?5:0);
    addFloat(cx,bH*.33,'🧱 Stoneskin! ('+casterState.stoneskin+'T / '+casterState.stoneskinHp+' HP)',casterCfg.col,12);
    if(perfect) addFloat(cx,bH*.26,'✨ Flawless! +5 HP','#ffff88',11);
    // Three waves of rocks fly inward and "coat" the caster
    [0,220,440].forEach((delay,wave)=>{
      setTimeout(()=>{
        if(!battleRunning) return;
        const angle=wave/3*Math.PI*2+Math.PI/6;
        const srcDist=bH*0.22;
        for(let j=0;j<4;j++){
          const a=angle+j/4*Math.PI*2;
          const srcX=cx+Math.cos(a)*srcDist, srcY=bH*.38+Math.sin(a)*srcDist*0.55;
          const speed=0.06+_rng()*0.04;
          gs.parts.push({x:srcX,y:srcY,col:j%2?'#8b7355':'#a08060',
            vx:(cx-srcX)*speed,vy:(bH*.38-srcY)*speed,
            sz:3+_rng()*3,life:1,dec:.028,noGrav:true});
        }
        spawnParts(cx,bH*.38,casterCfg.col,4);
      },delay);
    });
    anim(caster,'shield',900);
  } else if(spellId==='stonesoul'){
    casterState.stonesoul=casterCfg.stonesoulDuration||4;
    addFloat(cx,bH*.33,'💎 Stonesoul! ('+casterState.stonesoul+'T)',casterCfg.col,12);
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.07,y:bH*.38+Math.sin(a)*bH*.05,
        col:i%3===0?'#b08040':i%3===1?'#8b6914':'#c8a060',
        vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-0.3,
        sz:1.5+_rng()*2.5,life:1,dec:.015,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#c8a060',8); spawnParts(cx,bH*.38,'#ffffff',4);
    anim(caster,'shield',700);
  } else if(spellId==='rockfall'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    gs.busy=true;
    addFloat(cx,bH*.28,'⛰️ ROCKFALL!',casterCfg.col,16);
    spawnParts(cx,bH*.38,casterCfg.col,12);
    anim(caster,'cast',900);
    let rocksDone=0;
    function fireRock(){
      if(!battleRunning) return;
      const yOff=bH*(rocksDone===0?-0.04:rocksDone===1?0:0.04);
      spawnProj(cx,bH*.38+yOff,tx,bH*.38+yOff,'physical',casterCfg.col,()=>{
        if(!battleRunning) return;
        doRockfallHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
        refreshHUD(); checkWin(); if(!battleRunning) return;
        rocksDone++;
        if(rocksDone<3){
          combatTimeout(fireRock,350);
        } else {
          if(caster==='p1'||twoPlayerMode){
            endMyTurn();
          } else {
            if(!simCallback) tickStatuses(casterState);
            combatTimeout(finishAI,900);
          }
        }
      });
    }
    fireRock();
    return;
  } else if(spellId==='basicattack'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    const basicSpell=casterCfg.spells.find(s=>s.id==='basicattack');
    let dmg=Math.round((basicSpell.dmg||8)*casterCfg.dmgMult);
    const isPhysical=!!basicSpell.physical;
    if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
    if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
    if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
    function resolveBasicAttack(){
      if(targetState.foresight){
        addFloat(tx,bH*.38-20,'🔮 Absorbed!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',18);
        spawnParts(tx,bH*.38,casterCfg.col,10);
        spawnParts(tx,bH*.38,'#ffffff',6);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.invisible>0){
        addFloat(tx,bH*.38-20,'👻 Missed!','#b8a0e8',15);
        spawnParts(tx,bH*.38,'#b8a0e8',12);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.haste>0&&_rng()<0.25){
        addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
        spawnParts(tx,bH*.38,'#ffcc44',12);
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else if(targetState.blink>0&&_rng()<0.5){
        addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
        spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
        flash('#9988cc');
        if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      } else {
        const [baDmg,baSkin]=applyTargetSkins(targetState,dmg,isPhysical);
        dmg=baDmg;
        if(baSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+baSkin+' Skin','#b08040',10);
        const counterTriggered=!isPhysical&&targetState.counter&&targetState.shield>0;
        if(targetState.shield>0){
          const absorbed=Math.min(dmg,targetState.shieldHp);
          targetState.shieldHp-=absorbed;
          dmg-=absorbed;
          if(targetState.shieldHp<=0){
            targetState.shield=0; targetState.counter=false;
            addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
            spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
          } else {
            addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
            spawnParts(tx,bH*.38,'#4af0ff',8); spawnParts(tx,bH*.38,'#ffffff',4);
          }
        }
        if(counterTriggered){
          const casterX=cx;
          casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
          targetState.counter=false;
          addFloat(casterX,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
          spawnParts(casterX,bH*.38,'#4af0ff',16);
          spawnBeam(tx,bH*.38,casterX,bH*.38,'#4af0ff');
          checkWin(); if(!battleRunning) return;
        }
        targetState.hp=Math.max(0,targetState.hp-dmg);
        if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
        if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
        if(isPhysical&&!basicSpell.piercesDischarge&&targetState.charge>0){
          applyDischarge(targetState,casterState,cx,tx);
          checkWin(); if(!battleRunning) return;
        }
        spawnParts(tx,bH*.38,casterCfg.col,14);
        addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
        flash(casterCfg.col);
        if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
        else             {anim('p2','cast',800); anim('p1','hit',800);}
      }
      refreshHUD();
      checkWin();
      if(!battleRunning) return;
      if(basicSpell.lungeAmt){
        if(caster==='p1'||twoPlayerMode){ endMyTurn(); }
        else { if(!simCallback) tickStatuses(casterState); combatTimeout(finishAI,900); }
      }
    }
    if(basicSpell.lungeAmt){
      gs.busy=true;
      lunge(caster,basicSpell.lungeAmt,resolveBasicAttack);
      return;
    } else {
      resolveBasicAttack();
    }
  }

  if(caster==='p1'||twoPlayerMode){
    endMyTurn(spellId==='counter');
  } else {
    if(!simCallback){
      if(spellId!=='counter' && casterState.shield>0){
        casterState.shield--;
        if(casterState.shield<=0){ casterState.shieldHp=0; casterState.counter=false; }
      }
      tickStatuses(casterState);
    }
    combatTimeout(finishAI,900);
  }
}

// ── CAST SPELL ─────────────────────────────────────────────
function castSpell(spell,target,tx,ty,caster){
  const casterCfg=caster==='p1'?p1Cfg:p2Cfg;
  const casterState=caster==='p1'?gs.p1:gs.p2;
  const targetState=target; // gs.p1 or gs.p2 passed directly

  const targetCfg=target===gs.p1?p1Cfg:p2Cfg;
  const oppCfg   =caster==='p1'?p2Cfg:p1Cfg;

  // Dispel: player chose to cleanse self OR strip one opp buff (dispelSelf flag set at targeting)
  if(spell.element==='dispel'){
    const casterX=caster==='p1'?bW*.22:bW*.78;
    flash('#ffaaff');
    if(dispelSelf){
      const DEBUFF_NAMES={agony:'Agony',corruption:'Corruption',silence:'Silence',burn:'Burn',
        frozen:'Freeze',blizzard:'Blizzard',vineWhip:'Vine Whip',timeDrain:'Time Drain',
        conductivity:'Conductivity',candle:'Candle'};
      const activeDebuffs=[];
      ['agony','corruption','silence','burn','frozen','blizzard','vineWhip','timeDrain','conductivity','candle'].forEach(s=>{
        if(casterState[s]) activeDebuffs.push(s);
      });
      spawnParts(casterX,bH*.38,'#ffaaff',30);
      for(let i=0;i<32;i++){
        const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.6+_rng()*1.8;
        gs.parts.push({x:casterX+(_rng()-.5)*bH*.08,y:bH*.38+(_rng()-.5)*bH*.05,
          col:i%4===0?'#ffddee':'#ffffff',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.010+_rng()*.009,noGrav:true});
      }
      if(activeDebuffs.length>0){
        const cleansed=activeDebuffs[Math.floor(_rng()*activeDebuffs.length)];
        casterState[cleansed]=0;
        addFloat(casterX,bH*.38,'🌸 '+DEBUFF_NAMES[cleansed]+' Cleansed!','#ffaaff',18);
      } else {
        addFloat(casterX,bH*.38,'🌸 Nothing to Cleanse!','#cc88aa',18);
      }
    } else {
      const dispelTargetX=caster==='p1'?bW*.78:bW*.22;
      const BUFF_NAMES={shield:'Shield',foresight:'Foresight',regen:'Regen',resist:'Resist',
        frostArmor:'Frost Armor',flameShield:'Flame Shield',empowered:'Empower',
        ward:'Ward',haste:'Haste',blink:'Blink',invisible:'Vanish',counter:'Counter',
        stoneskin:'Stoneskin',stonesoul:'Stonesoul'};
      const oppBuffs=[];
      if(targetState.shield>0)      oppBuffs.push('shield');
      if(targetState.foresight)     oppBuffs.push('foresight');
      if(targetState.regen)         oppBuffs.push('regen');
      if(targetState.resist>0)      oppBuffs.push('resist');
      if(targetState.frostArmor>0)  oppBuffs.push('frostArmor');
      if(targetState.flameShield>0) oppBuffs.push('flameShield');
      if(targetState.empowered)     oppBuffs.push('empowered');
      if(targetState.ward>0)        oppBuffs.push('ward');
      if(targetState.haste>0)       oppBuffs.push('haste');
      if(targetState.blink>0)       oppBuffs.push('blink');
      if(targetState.invisible>0)   oppBuffs.push('invisible');
      if(targetState.counter)       oppBuffs.push('counter');
      if(targetState.stoneskin>0)   oppBuffs.push('stoneskin');
      if(targetState.stonesoul>0)   oppBuffs.push('stonesoul');
      spawnParts(dispelTargetX,ty,'#ffaaff',20);
      if(oppBuffs.length>0){
        if(_rng()<0.70){
          const stripped=oppBuffs[Math.floor(_rng()*oppBuffs.length)];
          if(stripped==='shield'){targetState.shield=0; targetState.shieldHp=0; targetState.counter=false;}
          else if(stripped==='foresight') targetState.foresight=false;
          else if(stripped==='regen')     targetState.regen=null;
          else if(stripped==='empowered') targetState.empowered=false;
          else if(stripped==='counter')   targetState.counter=false;
          else targetState[stripped]=0;
          for(let i=0;i<28;i++){
            const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.7+_rng()*1.8;
            gs.parts.push({x:dispelTargetX+(_rng()-.5)*bH*.08,y:ty+(_rng()-.5)*bH*.05,
              col:i%4===0?'#ffddee':'#ffffff',
              vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+_rng()*3,life:1,dec:.010+_rng()*.009,noGrav:true});
          }
          addFloat(dispelTargetX,ty,'🌸 '+BUFF_NAMES[stripped]+' Stripped!','#ffaaff',14);
        } else {
          addFloat(dispelTargetX,ty,'🌸 Resisted!','#cc88aa',13);
        }
      } else {
        addFloat(dispelTargetX,ty,'🌸 No Buffs to Strip!','#cc88aa',13);
      }
    }
    if(caster==='p1'){anim('p1','cast',800);}else{anim('p2','cast',800);}
    return;
  }

  let dmg=Math.round(spell.dmg*casterCfg.dmgMult);
  if(spell.element==='arcane') dmg=Math.round((15+Math.floor(_rng()*41))*casterCfg.dmgMult);

  let impactCount=22;

  // Caster: Empower
  if(casterState.empowered){
    const pct=Math.round((casterCfg.empowerMult-1)*100);
    dmg=Math.round(dmg*casterCfg.empowerMult);
    casterState.empowered=false;
    addFloat(tx,ty-36,'💪 +'+pct+'% Empowered!',casterCfg.col,10);
    impactCount=38;
  }

  // Target: Damage Resistance
  if(targetState.resist>0){
    dmg=Math.round(dmg*0.67);
    addFloat(tx,ty-36,'🩸 -33% Resist!',targetCfg.col,10);
  }
  if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);

  // Target: Foresight — fully blocks the incoming spell
  if(targetState.foresight){
    addFloat(tx,ty-20,'🔮 Foreseen!','#ffcc44',15);
    targetState.foresight=false;
    spawnParts(tx,ty,'#ffcc44',18);
    spawnParts(tx,ty,spell.col,12);
    spawnParts(tx,ty,'#ffffff',6);
    if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    return;
  }

  // Mana Burn: psychic drain — bypasses invisibility, haste, shields; blocked by foresight
  if(spell.element==='manaburn'){
    let burnDmg=Math.round(targetState.mana*2*casterCfg.dmgMult);
    if(casterState.empowered){
      burnDmg=Math.round(burnDmg*(casterCfg.empowerMult||1.5));
      casterState.empowered=false;
      addFloat(tx,ty-36,'💪 Empowered!',casterCfg.col,10);
    }
    if(targetState.conductivity>0) burnDmg=Math.round(burnDmg*1.35);
    const drained=Math.min(4,targetState.mana);
    targetState.mana=Math.max(0,targetState.mana-drained);
    targetState.hp=Math.max(0,targetState.hp-burnDmg);
    spawnParts(tx,ty,'#cc44ff',22); spawnParts(tx,ty,'#ff88ff',10);
    const mbFireX=caster==='p1'?bW*.78:bW*.22;
    gs.manaBurnFires.push({x:mbFireX, y:ty, end:Date.now()+2800});
    addFloat(tx,ty,'-'+burnDmg,'#cc44ff',22);
    if(drained>0) addFloat(tx,ty+28,'🔮 −'+drained+' Mana','#cc44ff',14);
    flash('#cc44ff');
    if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
    else             {anim('p2','cast',800); anim('p1','hit',800);}
    checkWin();
    return;
  }

  // Target: Invisible — area spells hit anyway, others miss
  if(targetState.invisible>0){
    if(spell.area){
      addFloat(tx,ty-20,'🔥 Area!','#ff6622',13);
    } else {
      addFloat(tx,ty,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,ty,'#b8a0e8',12);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      return;
    }
  }

  // Target: Haste — 25% dodge
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,ty,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,ty,'#ffcc44',12);
    if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    return;
  }

  // Stonesoul (50% magic reduction) + Stoneskin (10 per-hit absorption)
  const [csDmg,csSkin]=applyTargetSkins(targetState,dmg,false); // universal spells are magical
  dmg=csDmg;
  if(csSkin>0) addFloat(tx,ty-20,'🧱 -'+csSkin+' Skin','#b08040',10);

  // Target: Counter (check BEFORE shield breaks)
  const counterTriggered=targetState.counter&&targetState.shield>0;

  // Target: Shield
  if(targetState.shield>0){
    if(spell.element==='lightning'){
      targetState.shield=0; targetState.counter=false;
      targetState.shieldHp=0;
      addFloat(tx,ty-20,'⚡ Pierced!','#ffee44',15);
      spawnParts(tx,ty,'#ffee44',18); spawnParts(tx,ty,'#4af0ff',12); spawnParts(tx,ty,'#ffffff',8);
    } else {
      const absorbed=Math.min(dmg,targetState.shieldHp);
      targetState.shieldHp-=absorbed;
      dmg-=absorbed;
      if(targetState.shieldHp<=0){
        targetState.shield=0; targetState.counter=false;
        addFloat(tx,ty-20,'🛡 SHATTERED!','#88ffff',22);
        spawnParts(tx,ty,'#4af0ff',24); spawnParts(tx,ty,'#ffffff',10);
      } else {
        addFloat(tx,ty-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
        spawnParts(tx,ty,'#4af0ff',8); spawnParts(tx,ty,'#ffffff',4);
      }
    }
  }

  // Counter reflect
  if(counterTriggered){
    const casterX=caster==='p1'?bW*.22:bW*.78;
    casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
    targetState.counter=false;
    addFloat(casterX,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',14);
    spawnParts(casterX,bH*.38,'#4af0ff',16);
    spawnBeam(tx,bH*.38,casterX,bH*.38,'#4af0ff');
    checkWin(); if(!battleRunning) return;
  }

  targetState.hp=Math.max(0,targetState.hp-dmg);
  const rx=caster==='p1'?bW*.22:bW*.78;
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,rx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,rx);
  spawnParts(tx,ty,spell.col,impactCount);
  addFloat(tx,ty,'-'+dmg,spell.col,22);
  flash(spell.col);

  if(spell.element==='fire'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,ty+28,'🔰 Warded!','#ffcc44',10);
    } else {
      targetState.burn=BURN_ROUNDS;
      addFloat(tx,ty+28,'🔥 Burning!','#ff6622',10);
    }
  }
  if(spell.element==='ice'){
    if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,ty+28,'🔰 Warded!','#ffcc44',10);
    } else {
      targetState.frozen=Math.max(targetState.frozen,1);
      addFloat(tx,ty+28,'❄️ Frozen!','#88ddff',10);
    }
  }

  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
  checkWin();
}

function processBurn(target,tx,ty){
  if(target.burn<=0) return;
  target.hp=Math.max(0,target.hp-BURN_DMG);
  target.burn--;
  for(let i=0;i<14;i++){
    const a=-Math.PI/2+(-0.75+_rng()*1.5);
    const sp=2+_rng()*3.5;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.05,y:ty,col:i%3?'#ff4400':'#ff9900',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+_rng()*3,life:1,dec:.026+_rng()*.02});
  }
  addFloat(tx,ty,'🔥 -'+BURN_DMG,'#ff6622',13);
}

function processRegen(target,tx,ty){
  if(!target.regen) return;
  const healThis=Math.ceil(target.regen.remaining/target.regen.turns);
  target.regen.remaining-=healThis;
  target.regen.turns--;
  if(target.regen.turns<=0) target.regen=null;
  target.hp=Math.min(target.maxHp,target.hp+healThis);
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+(-0.55+_rng()*1.1), sp=0.8+_rng()*1.8;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:i%2?'#44ee88':'#88ffcc',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.5,sz:1.5+_rng()*2.5,life:1,dec:.011+_rng()*.01,noGrav:true});
  }
  addFloat(tx,ty,'+'+healThis+' 💚','#44cc88',12);
}

function processVineWhip(target,tx,ty){
  if(!target.vineWhip||target.vineWhip<=0) return;
  let dmg=7;
  target.vineWhip--;
  if(target.shield>0){
    const absorbed=Math.min(dmg,target.shieldHp);
    target.shieldHp-=absorbed; dmg-=absorbed;
    if(target.shieldHp<=0){
      target.shield=0; target.counter=false;
      addFloat(tx,ty-20,'🛡 SHATTERED!','#88ffff',18);
      spawnParts(tx,ty,'#4af0ff',16);
    } else {
      addFloat(tx,ty-20,'🛡 −'+absorbed+' ('+target.shieldHp+' left)','#4af0ff',10);
      spawnParts(tx,ty,'#4af0ff',6);
    }
  }
  if(dmg>0){
    target.hp=Math.max(0,target.hp-dmg);
    for(let i=0;i<10;i++){
      const a=_rng()*Math.PI*2;
      gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:i%2?'#44cc88':'#22aa66',
        vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2-0.5,sz:2+_rng()*2.5,life:1,dec:.02});
    }
    addFloat(tx,ty,'🌱 -'+dmg,'#44cc88',13);
  }
}

function processBlizzard(target,tx,ty){
  if(!target.blizzard||target.blizzard<=0) return;
  target.hp=Math.max(0,target.hp-5);
  const drained=Math.min(2,target.mana);
  target.mana=Math.max(0,target.mana-drained);
  target.blizzard--;
  for(let i=0;i<10;i++){
    const a=_rng()*Math.PI*2;
    gs.parts.push({x:tx+(_rng()-.5)*bH*.06,y:ty,col:'#88ddff',
      vx:Math.cos(a)*0.6,vy:Math.sin(a)*0.6-1.8,sz:1.5+_rng()*2,life:1,dec:.016,noGrav:true});
  }
  addFloat(tx,ty,'❄️ -5','#88ddff',13);
  if(drained>0) addFloat(tx,ty+22,'−'+drained+' Mana','#88ddff',11);
  if(_rng()<0.15&&target.frozen<=0) target.frozen=1;
}

const STATUS_TIMERS=['timeDrain','resist','ward','haste','frenzied','frostArmor','flameShield','candle','conductivity','agony','silence','corruption','blink','stonesoul','stoneskin'];
function tickStatuses(state){
  STATUS_TIMERS.forEach(k=>{ if(state[k]>0) state[k]--; });
  if(state.stoneskin<=0) state.stoneskinHp=0;
}

function triggerCandleBurn(state,cx){
  state.burn=BURN_ROUNDS;
  addFloat(cx,bH*.38,'🕯️ Candle!','#ff6622',12);
  for(let i=0;i<8;i++){
    const a=-Math.PI/2+(-0.7+_rng()*1.4),sp=1.5+_rng()*2.5;
    gs.parts.push({x:cx+(_rng()-.5)*bH*.04,y:bH*.38,
      col:i%2?'#ff6622':'#ff9900',vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      sz:1.5+_rng()*2.5,life:1,dec:.02,noGrav:true});
  }
}

function applyFrostArmorRetaliation(casterState,targetCfg,cx){
  const retDmg=targetCfg.frostArmorRetaliationDmg||8;
  casterState.hp=Math.max(0,casterState.hp-retDmg);
  addFloat(cx,bH*.33,'❄️ Frost! −'+retDmg,'#88ddff',12);
  spawnParts(cx,bH*.38,'#88ddff',8);
}

function applyDischarge(targetState,casterState,casterX,targetX){
  const dischargeDmg=targetState.charge;
  targetState.charge=Math.floor(targetState.charge/2);
  casterState.hp=Math.max(0,casterState.hp-dischargeDmg);
  addFloat(casterX,bH*.33,'⚡ Discharge! −'+dischargeDmg,'#aaff44',14);
  spawnParts(casterX,bH*.38,'#aaff44',14);
  spawnBeam(targetX,bH*.38,casterX,bH*.38,'#aaff44');
  flash('#aaff44');
}

function applyFlameShieldRetaliation(casterState,cx){
  const fireDmg=16;
  casterState.hp=Math.max(0,casterState.hp-fireDmg);
  addFloat(cx,bH*.33,'🔥 Flame! −'+fireDmg,'#ff6622',12);
  spawnParts(cx,bH*.38,'#ff6600',8);
}

function applyTargetSkins(targetState,dmg,isPhysical){
  if(!isPhysical&&targetState.stonesoul>0) dmg=Math.round(dmg*0.6);
  let skinAbsorbed=0;
  if(targetState.stoneskin>0&&targetState.stoneskinHp>0){
    skinAbsorbed=Math.min(10,Math.min(targetState.stoneskinHp,dmg));
    targetState.stoneskinHp=Math.max(0,targetState.stoneskinHp-skinAbsorbed);
    dmg=Math.max(0,dmg-skinAbsorbed);
    if(targetState.stoneskinHp<=0) targetState.stoneskin=0;
  }
  return [dmg,skinAbsorbed];
}

function doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx){
  const basicSpell=casterCfg.spells.find(s=>s.id==='basicattack');
  let dmg=Math.round((basicSpell.dmg||9)*casterCfg.dmgMult);
  if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
  if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
  if(targetState.foresight){
    addFloat(tx,bH*.38-20,'🔮 Absorbed!','#ffcc44',15);
    spawnParts(tx,bH*.38,'#ffcc44',14);
    if(caster==='p1') anim('p1','cast',600); else anim('p2','cast',600);
    return;
  }
  if(targetState.invisible>0){
    addFloat(tx,bH*.38,'👻 Missed!','#b8a0e8',15);
    spawnParts(tx,bH*.38,'#b8a0e8',10);
    return;
  }
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,bH*.38,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,bH*.38,'#ffcc44',10);
    return;
  }
  if(targetState.blink>0&&_rng()<0.5){
    addFloat(tx,bH*.38,'💫 Blinked!','#cc99ff',18);
    spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
    flash('#9988cc');
    return;
  }
  const [fDmg,fSkin]=applyTargetSkins(targetState,dmg,!!basicSpell.physical);
  dmg=fDmg;
  if(fSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+fSkin+' Skin','#b08040',10);
  if(targetState.shield>0){
    const absorbed=Math.min(dmg,targetState.shieldHp);
    targetState.shieldHp-=absorbed; dmg-=absorbed;
    if(targetState.shieldHp<=0){
      targetState.shield=0; targetState.counter=false;
      addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',22);
      spawnParts(tx,bH*.38,'#4af0ff',22); spawnParts(tx,bH*.38,'#ffffff',8);
    } else {
      addFloat(tx,bH*.38-20,'🛡 −'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',11);
      spawnParts(tx,bH*.38,'#4af0ff',8);
    }
  }
  targetState.hp=Math.max(0,targetState.hp-dmg);
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
  if(basicSpell.physical&&!basicSpell.piercesDischarge&&targetState.charge>0){
    applyDischarge(targetState,casterState,cx,tx);
  }
  spawnParts(tx,bH*.38,casterCfg.col,14);
  addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,18);
  flash(casterCfg.col);
  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
}

function doRockfallHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx){
  let dmg=Math.round((casterCfg.rockfallDmg||9)*casterCfg.dmgMult);
  if(targetState.resist>0)       dmg=Math.round(dmg*0.67);
  if(targetState.frostArmor>0)   dmg=Math.round(dmg*0.70);
  if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
  if(targetState.foresight){
    targetState.foresight=false;
    addFloat(tx,bH*.38,'🔮 Absorbed!','#ffcc44',13);
    spawnParts(tx,bH*.38,'#ffcc44',10);
    return;
  }
  if(targetState.invisible>0){
    addFloat(tx,bH*.38,'👻 Missed!','#b8a0e8',13);
    spawnParts(tx,bH*.38,'#b8a0e8',8);
    return;
  }
  if(targetState.haste>0&&_rng()<0.25){
    addFloat(tx,bH*.38,'💨 Dodged!','#ffcc44',13);
    spawnParts(tx,bH*.38,'#ffcc44',8);
    return;
  }
  if(targetState.blink>0&&_rng()<0.5){
    addFloat(tx,bH*.38,'💫 Blinked!','#cc99ff',15);
    spawnParts(tx,bH*.38,'#9988cc',14); spawnParts(tx,bH*.38,'#ffffff',5);
    flash('#9988cc');
    return;
  }
  const [rDmg,rSkin]=applyTargetSkins(targetState,dmg,true); // physical
  dmg=rDmg;
  if(rSkin>0) addFloat(tx,bH*.38-20,'🧱 -'+rSkin+' Skin','#b08040',10);
  if(targetState.shield>0){
    const absorbed=Math.min(dmg,targetState.shieldHp);
    targetState.shieldHp-=absorbed; dmg-=absorbed;
    if(targetState.shieldHp<=0){
      targetState.shield=0; targetState.counter=false;
      addFloat(tx,bH*.38-20,'🛡 SHATTERED!','#88ffff',18);
      spawnParts(tx,bH*.38,'#4af0ff',18); spawnParts(tx,bH*.38,'#ffffff',6);
    } else {
      addFloat(tx,bH*.38-20,'🛡 -'+absorbed+' ('+targetState.shieldHp+' left)','#4af0ff',9);
      spawnParts(tx,bH*.38,'#4af0ff',5);
    }
  }
  targetState.hp=Math.max(0,targetState.hp-dmg);
  if(targetState.frostArmor>0&&dmg>0) applyFrostArmorRetaliation(casterState,targetCfg,cx);
  if(targetState.flameShield>0&&dmg>0) applyFlameShieldRetaliation(casterState,cx);
  if(targetState.charge>0) applyDischarge(targetState,casterState,cx,tx);
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    gs.parts.push({x:tx+Math.cos(a)*bH*.04,y:bH*.38+Math.sin(a)*bH*.03,
      col:i%2?'#b08040':'#8b6914',vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2-0.3,
      sz:2+_rng()*3,life:1,dec:.022});
  }
  spawnParts(tx,bH*.38,casterCfg.col,10);
  addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,16);
  flash(casterCfg.col);
  if(caster==='p1'){anim('p1','cast',600); anim('p2','hit',600);}
  else             {anim('p2','cast',600); anim('p1','hit',600);}
}

function anim(who,state,ms){
  if(headless) return;
  gs[who+'anim']=state;
  gs.lastAnimEnd=Math.max(gs.lastAnimEnd||0, Date.now()+ms);
  setTimeout(()=>{if(gs[who+'anim']!=='death') gs[who+'anim']='idle';},ms);
}

function lunge(who,amt,cb){
  // Normalize: charge spell passes callback as 2nd arg with no lungeAmt
  const lungeAmt=typeof amt==='function'?0.12:amt;
  const callback=typeof amt==='function'?amt:cb;
  if(headless){ if(callback) callback(); return; }
  const dir=who==='p1'?1:-1;
  gs[who+'xOff']=dir*bW*lungeAmt;
  anim(who,'cast',300);
  setTimeout(()=>{ gs[who+'xOff']=0; if(callback) callback(); },180);
}

function combatTimeout(fn,delay){ if(headless){fn();}else{setTimeout(fn,delay);} }

// ── SIMULTANEOUS RESOLUTION ────────────────────────────────

// Execute a pre-committed action for `who`. Calls cb() when done (via simCallback or directly).
function executeQueuedSpell(who, action, cb){
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const cx=who==='p1'?bW*.22:bW*.78;
  const tx=who==='p1'?bW*.78:bW*.22;

  if(action.type==='__frozen__'){
    addFloat(cx,bH*.38,'❄️ Frozen — turn skipped!','#88ddff',13);
    combatTimeout(cb,1200);
    return;
  }

  // Agony: damage for any non-channel action
  if(action.type!=='channel'&&whoState.agony>0){
    const agonDmg=whoState.agonyDmg||12;
    whoState.hp=Math.max(0,whoState.hp-agonDmg);
    addFloat(cx,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(cx,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }

  if(action.type==='channel'){
    let channelGain=action.channelGain!=null?action.channelGain:(whoState.timeDrain>0?2:whoCfg.channelAmt);
    if(whoState.corruption>0){ const d=Math.min(channelGain,2); channelGain=Math.max(0,channelGain-2); addFloat(cx,bH*.5,'☠️ −'+d+' Corrupted!','#9944cc',12); }
    whoState.mana=Math.min(MAX_MANA,whoState.mana+channelGain);
    addFloat(cx,bH*.38,'+'+(channelGain)+' Mana','#88aaff',13);
    if(whoState.candle>0) triggerCandleBurn(whoState,cx);
    anim(who,'cast',700);
    combatTimeout(cb,800);
    return;
  }

  // Universal spell
  const spell=SPELLS.find(s=>s.element===action.type);
  if(spell){
    if(!action.ok){
      addFloat(cx,bH*.33,'Fizzled!','#ff8844',13);
      whoState.mana=Math.max(0,whoState.mana-1);
      combatTimeout(cb,600);
      return;
    }
    if(action.silenced){
      showSilenceBlock(cx,bH*.33); anim(who,'cast',600);
      combatTimeout(cb,1200);
      return;
    }
    whoState.mana-=spell.cost;
    if(whoState.invisible>0){ whoState.invisible=0; addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11); }
    if(action.type==='dispel'&&action.dispelSelf){
      castSpell(spell,whoState,cx,bH*.38,who);
      combatTimeout(cb,500);
    } else {
      spawnProj(cx,bH*.38,tx,bH*.38,spell.element,spell.col,()=>{
        castSpell(spell,oppState,tx,bH*.38,who);
        combatTimeout(cb,500);
      });
    }
    return;
  }

  // Character spell
  const charSpell=whoCfg.spells&&whoCfg.spells.find(s=>s.id===action.type);
  if(charSpell){
    if(!action.ok){
      addFloat(cx,bH*.33,'Ritual Failed!','#ff8844',13);
      whoState.mana=Math.max(0,whoState.mana-1);
      combatTimeout(cb,600);
      return;
    }
    if(action.silenced){
      showSilenceBlock(cx,bH*.33); anim(who,'cast',600);
      combatTimeout(cb,1200);
      return;
    }
    // resolveCharSpell ends by calling endMyTurn/finishAI — intercept with simCallback
    simCallback=cb;
    resolveCharSpell(action.type,who,action.perfect||false);
    return;
  }

  combatTimeout(cb,200);
}

// Sort two actions by priority and execute in order. Lower priority number = acts first.
// If equal priority, both execute (defer win check for double-KO detection).
function resolveSimRound(){
  if(!pendingP1Action||!pendingP2Action) return;
  const p1Act=pendingP1Action, p2Act=pendingP2Action;
  pendingP1Action=null; pendingP2Action=null;
  gs.myTurn=false; gs.busy=true;

  const p1Pri=(ACTION_PRIORITY[p1Act.type]||4);
  const p2Pri=(ACTION_PRIORITY[p2Act.type]||4);
  const isTie=p1Pri===p2Pri;

  let firstWho,firstAct,secondWho,secondAct;
  if(p1Pri<=p2Pri){ firstWho='p1'; firstAct=p1Act; secondWho='p2'; secondAct=p2Act; }
  else             { firstWho='p2'; firstAct=p2Act; secondWho='p1'; secondAct=p1Act; }

  // Show priority order banner
  if(!headless&&!isTie&&firstAct.type!=='__frozen__'){
    const firstCfg=firstWho==='p1'?p1Cfg:p2Cfg;
    const firstCx=firstWho==='p1'?bW*.22:bW*.78;
    addFloat(firstCx,bH*.20,'⚡ Goes first!',firstCfg.col,11);
  }

  const frozenBefore={p1:gs.p1.frozen,p2:gs.p2.frozen};

  const afterFirst=()=>{
    if(!battleRunning) return;
    checkWin(); if(!battleRunning) return;

    // Interrupt: second actor was frozen by the first action
    const justFrozen=gs[secondWho].frozen>frozenBefore[secondWho];
    if(justFrozen&&secondAct.type!=='__frozen__'){
      const scx=secondWho==='p1'?bW*.22:bW*.78;
      addFloat(scx,bH*.24,'💨 Interrupted!','#ff6644',15);
      combatTimeout(endSimRound,1200);
      return;
    }

    if(isTie) deferWinCheck=true;
    executeQueuedSpell(secondWho,secondAct,()=>{
      deferWinCheck=false;
      if(!battleRunning) return;
      // Check deferred double-KO
      if(pendingWin){
        const pw=pendingWin; pendingWin=null;
        if(pw.p1Dead&&pw.p2Dead) endGame('draw');
        else if(pw.p1Dead) endGame(false);
        else if(pw.p2Dead) endGame(true);
        return;
      }
      checkWin(); if(!battleRunning) return;
      endSimRound();
    });
  };

  executeQueuedSpell(firstWho,firstAct,afterFirst);
}

// End-of-round cleanup after simultaneous resolution.
function endSimRound(){
  if(!battleRunning||gameEnded) return;
  gs.myTurn=false; gs.busy=false;
  // Tick both players' shields and status timers
  if(gs.p1.shield>0){ gs.p1.shield--; if(gs.p1.shield<=0){gs.p1.shieldHp=0;gs.p1.counter=false;} }
  tickStatuses(gs.p1);
  if(gs.p2.shield>0){ gs.p2.shield--; if(gs.p2.shield<=0){gs.p2.shieldHp=0;gs.p2.counter=false;} }
  tickStatuses(gs.p2);
  gs.round++;

  if(twoPlayerMode){
    // 2P: start next collection phase — P1 picks first each round
    if(!gameEnded){
      const delay=Math.max(0,(gs.lastAnimEnd||0)-Date.now())+600;
      setTimeout(()=>{
        if(!gameEnded){
          pendingP1Action=null; pendingP2Action=null;
          showHandoffOverlay('p1',()=>startPlayerTurn('p1'));
        }
      },delay);
    }
  } else {
    // AI mode: use skipAIAction so doAI runs DOT ticks but not decision
    skipAIAction=true;
    if(aiTid) clearTimeout(aiTid);
    const _fn=aiDifficulty==='normal'?doAINormal:doAI;
    if(headless){ _fn(); } else { aiTid=setTimeout(_fn,gs.p2&&gs.p2.haste>0?400:1400); }
  }
}

function endMyTurn(skipShieldDecrement=false){
  // Simultaneous resolution hook — skip normal turn-end logic
  if(simCallback){ gs.myTurn=false; gs.busy=false; const cb=simCallback; simCallback=null; cb(); return; }

  gs.myTurn=false; gs.busy=false;
  if(twoPlayerMode){
    const who=gs.turnPlayer;
    const whoState=gs[who];

    // Simultaneous 2P: after P1 commits, skip ticks and show P2 handoff for their input
    if(who==='p1'){
      const delay=Math.max(0,(gs.lastAnimEnd||0)-Date.now())+600;
      if(!gameEnded) setTimeout(()=>{
        if(!gameEnded) showHandoffOverlay('p2',()=>startPlayerTurn('p2'));
      }, delay);
      return;
    }

    // P2 just finished input — resolve both actions simultaneously
    resolveSimRound();

  } else {
    if(!skipShieldDecrement&&gs.p1.shield>0){
      gs.p1.shield--;
      if(gs.p1.shield<=0){ gs.p1.shieldHp=0; gs.p1.counter=false; }
    }
    tickStatuses(gs.p1);
    gs.round++;
    if(aiTid) clearTimeout(aiTid);
    const _fn=aiDifficulty==='normal'?doAINormal:doAI;
    if(headless){ _fn(); } else { aiTid=setTimeout(_fn, gs.p2&&gs.p2.haste>0 ? 400 : 1400); }
  }
}

// ── AI DECISION LOGIC (shared by doAI, doAINormal, aiChooseSync) ──
function aiDecideEasy(who){
  const opp=who==='p2'?'p1':'p2';
  const aiCfg=who==='p2'?p2Cfg:p1Cfg;
  const aiKey=who==='p2'?p2Key:p1Key;
  const ai=gs[who];
  const allSpells=[...SPELLS,...(aiCfg.spells||[])];
  const available=allSpells.filter(s=>{
    if(ai.mana<s.cost) return false;
    if(s.id&&charSpellBlocked(s.id,ai,aiCfg,gs[opp])) return false;
    if(s.aiHint==='mana_restore'&&ai.mana>=10) return false;
    if(s.aiHint==='mana_steal'&&!ai.invisible) return false;
    if(s.aiHint==='drain'&&ai.hp>ai.maxHp*0.75) return false;
    if(ai.frenzied>0&&s.element) return false;
    if(gs[opp].invisible>0&&(s.element&&!s.area&&s.element!=='dispel'&&s.element!=='manaburn'||s.id==='basicattack'||s.id==='charge'||s.id==='entangle'||s.id==='timedrain'||s.id==='drain'||s.id==='vinewhip'||s.id==='agony'||s.id==='silence'||s.id==='corruption'||s.id==='rockfall')) return false;
    return true;
  });
  const charSpells=available.filter(s=>s.id);
  const universalSpells=available.filter(s=>s.element);
  let chosen=null, aiDispelSelf=false;
  if(aiKey==='mordant'&&ai.agony>0) chosen=null;
  else if(aiKey==='mordant'){
    const hexSpells=charSpells.filter(s=>['agony','silence','corruption'].includes(s.id));
    if(hexSpells.length>0&&_rng()<0.65) chosen=hexSpells[Math.floor(_rng()*hexSpells.length)];
  }
  if(aiKey==='mary'){
    const hasDebuff=ai.burn>0||ai.frozen>0||ai.blizzard>0||ai.vineWhip>0||ai.timeDrain>0||ai.conductivity>0||ai.candle>0||ai.agony>0||ai.corruption>0||ai.silence>0;
    const canPurge=charSpells.find(s=>s.id==='purge');
    const canHeal=charSpells.find(s=>s.id==='divineheal');
    if(hasDebuff&&canPurge) chosen=canPurge;
    else if(ai.hp<ai.maxHp*0.60&&canHeal) chosen=canHeal;
  }
  if(aiKey==='zacharius'){
    const chainReady=charSpells.find(s=>s.id==='chainlightning');
    const canGalvanize=charSpells.find(s=>s.id==='galvanize');
    const canConductivity=charSpells.find(s=>s.id==='conductivity');
    if(chainReady&&ai.charge>=(aiCfg.chainLightningChargeCost||8)) chosen=chainReady;
    else if(canConductivity&&!gs[opp].conductivity&&ai.mana>=canConductivity.cost) chosen=canConductivity;
    else if(canGalvanize) chosen=canGalvanize;
  }
  if(aiKey==='durin'){
    const canStoneskin=charSpells.find(s=>s.id==='stoneskin');
    const canStonesoul=charSpells.find(s=>s.id==='stonesoul');
    const canRockfall=charSpells.find(s=>s.id==='rockfall');
    if(ai.stoneskin<=0&&canStoneskin&&ai.hp<ai.maxHp*0.85) chosen=canStoneskin;
    else if(ai.stonesoul<=0&&canStonesoul&&ai.hp<ai.maxHp*0.70) chosen=canStonesoul;
    else if(canRockfall&&_rng()<0.55) chosen=canRockfall;
  }
  if(!chosen){
    const dispelSpell=universalSpells.find(s=>s.element==='dispel');
    if(dispelSpell){
      const needsCleanse=ai.agony>0||ai.corruption>0||ai.silence>2||ai.blizzard>1||ai.vineWhip>1||ai.candle>1;
      const oppHasKeyBuff=gs[opp].shield>0||gs[opp].foresight||gs[opp].resist>1||gs[opp].invisible>1||gs[opp].stoneskin>0||gs[opp].stonesoul>0||gs[opp].ward>0||gs[opp].counter;
      if(needsCleanse||(oppHasKeyBuff&&_rng()<0.35)){ chosen=dispelSpell; aiDispelSelf=needsCleanse; }
    }
  }
  if(!chosen){
    const manaBurnSpell=universalSpells.find(s=>s.element==='manaburn');
    if(manaBurnSpell&&gs[opp].mana>=8) chosen=manaBurnSpell;
  }
  if(!chosen&&available.length>0){
    if(charSpells.length>0&&_rng()<0.40){
      chosen=charSpells[Math.floor(_rng()*charSpells.length)];
    } else if(universalSpells.length>0){
      if(gs[opp].shield>0&&universalSpells.find(s=>s.element==='lightning')) chosen=universalSpells.find(s=>s.element==='lightning');
      else if(!gs[opp].shield&&universalSpells.find(s=>s.element==='fire')) chosen=universalSpells.find(s=>s.element==='fire');
      else if(gs[opp].mana>=3&&universalSpells.find(s=>s.element==='ice')) chosen=universalSpells.find(s=>s.element==='ice');
      else { const randPool=universalSpells.filter(s=>s.element!=='dispel'); if(randPool.length>0) chosen=randPool[Math.floor(_rng()*randPool.length)]; }
    } else { chosen=charSpells[Math.floor(_rng()*charSpells.length)]; }
  }
  return {chosen, aiDispelSelf};
}

function aiDecideNormal(who){
  const opp=who==='p2'?'p1':'p2';
  const aiCfg=who==='p2'?p2Cfg:p1Cfg;
  const aiKey=who==='p2'?p2Key:p1Key;
  const ai=gs[who];
  const p1=gs[opp];
  const allSpells=[...SPELLS,...(aiCfg.spells||[])];
  const available=allSpells.filter(s=>{
    if(ai.mana<s.cost) return false;
    if(s.id&&charSpellBlocked(s.id,ai,aiCfg,p1)) return false;
    if(s.aiHint==='mana_restore'&&ai.mana>=10) return false;
    if(s.aiHint==='mana_steal'&&!ai.invisible) return false;
    if(s.aiHint==='drain'&&aiKey!=='mal'&&ai.hp>ai.maxHp*0.75) return false;
    if(ai.frenzied>0&&s.element) return false;
    if(p1.invisible>0&&(s.element&&!s.area&&s.element!=='dispel'&&s.element!=='manaburn'||s.id==='basicattack'||s.id==='charge'||s.id==='entangle'||s.id==='timedrain'||s.id==='drain'||s.id==='vinewhip'||s.id==='agony'||s.id==='silence'||s.id==='corruption'||s.id==='rockfall')) return false;
    return true;
  });
  const charSpells=available.filter(s=>s.id);
  const universalSpells=available.filter(s=>s.element);
  let chosen=null, aiDispelSelf=false, forceChannel=false;
  if(aiKey==='eldrad'&&!chosen){
    const canShield=charSpells.find(s=>s.id==='shield');
    const canCounter=charSpells.find(s=>s.id==='counter');
    const canWard=charSpells.find(s=>s.id==='ward');
    if(canShield) chosen=canShield;
    else if(canCounter) chosen=canCounter;
    else if(canWard) chosen=canWard;
    else if(!ai.shieldHp&&ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='mal'&&!chosen){
    const canBloodPact=charSpells.find(s=>s.id==='bloodpact');
    const canEmpower=charSpells.find(s=>s.id==='empower');
    const canDrain=charSpells.find(s=>s.id==='drain');
    if(ai.empowered&&canDrain) chosen=canDrain;
    else if(!ai.empowered&&canEmpower) chosen=canEmpower;
    else if(canBloodPact&&ai.mana<5&&ai.hp>(aiCfg.bpCost||22)+15) chosen=canBloodPact;
    else if(canDrain) chosen=canDrain;
    else if(ai.empowered&&ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='sylvara'&&!chosen){
    const canEntangle=charSpells.find(s=>s.id==='entangle');
    const canVineWhip=charSpells.find(s=>s.id==='vinewhip');
    const canRegen=charSpells.find(s=>s.id==='heal');
    if(ai.hp<ai.maxHp*0.50&&canRegen) chosen=canRegen;
    else if(canEntangle) chosen=canEntangle;
    else if(canVineWhip&&!p1.shield) chosen=canVineWhip;
    else if(!ai.regen&&canRegen&&ai.hp<ai.maxHp*0.80) chosen=canRegen;
    else if(!ai.regen&&ai.hp<ai.maxHp*0.65&&ai.mana<4&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='aurelia'&&!chosen){
    const canForesight=charSpells.find(s=>s.id==='foresight');
    const canTimeDrain=charSpells.find(s=>s.id==='timedrain');
    const canHaste=charSpells.find(s=>s.id==='haste');
    if(canForesight) chosen=canForesight;
    else if(canTimeDrain) chosen=canTimeDrain;
    else if(canHaste) chosen=canHaste;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
  }
  if(aiKey==='gnash'&&!chosen){
    const canWarpaint=charSpells.find(s=>s.id==='warpaint');
    const canFrenzy=charSpells.find(s=>s.id==='frenzy');
    const canCharge=charSpells.find(s=>s.id==='charge');
    if(canWarpaint) chosen=canWarpaint;
    else if(ai.resist>0){ if(canFrenzy) chosen=canFrenzy; else if(canCharge) chosen=canCharge; }
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.55) forceChannel=true;
    else { if(canFrenzy) chosen=canFrenzy; else if(canCharge) chosen=canCharge; }
  }
  if(aiKey==='cinder'&&!chosen){
    const canCandle=charSpells.find(s=>s.id==='candle');
    const canFlameShield=charSpells.find(s=>s.id==='flameshield');
    const canFireball=charSpells.find(s=>s.id==='fireball');
    if(canCandle) chosen=canCandle;
    else if(canFlameShield) chosen=canFlameShield;
    else if(canFireball) chosen=canFireball;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='skadi'&&!chosen){
    const canBlizzard=charSpells.find(s=>s.id==='blizzard');
    const canFrostArmor=charSpells.find(s=>s.id==='frostarmor');
    const canIceLance=charSpells.find(s=>s.id==='icelance');
    if(canBlizzard) chosen=canBlizzard;
    else if(canFrostArmor) chosen=canFrostArmor;
    else if(canIceLance) chosen=canIceLance;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.65) forceChannel=true;
  }
  if(aiKey==='zacharius'&&!chosen){
    const chainReady=charSpells.find(s=>s.id==='chainlightning');
    const canGalvanize=charSpells.find(s=>s.id==='galvanize');
    const canConductivity=charSpells.find(s=>s.id==='conductivity');
    if(chainReady&&ai.charge>=(aiCfg.chainLightningChargeCost||8)) chosen=chainReady;
    else if(canConductivity&&(!p1.conductivity||p1.conductivity<=1)) chosen=canConductivity;
    else if(canGalvanize) chosen=canGalvanize;
    else if(ai.mana<4&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='mary'&&!chosen){
    const canRadiant=charSpells.find(s=>s.id==='radiant');
    const canHeal=charSpells.find(s=>s.id==='divineheal');
    const canPurge=charSpells.find(s=>s.id==='purge');
    const hasDebuff=ai.burn>0||ai.frozen>0||ai.blizzard>0||ai.vineWhip>0||ai.timeDrain>0||ai.conductivity>0||ai.candle>0||ai.agony>0||ai.corruption>0||ai.silence>0;
    if(hasDebuff&&canPurge) chosen=canPurge;
    else if(ai.hp<ai.maxHp*0.55&&canHeal) chosen=canHeal;
    else if(canRadiant&&(p1.shield>0||p1.resist>0||p1.frostArmor>0)) chosen=canRadiant;
    else if(canRadiant&&_rng()<0.55) chosen=canRadiant;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.50&&_rng()<0.55) forceChannel=true;
  }
  if(aiKey==='mordant'&&!chosen){
    const canCorruption=charSpells.find(s=>s.id==='corruption');
    const canAgony=charSpells.find(s=>s.id==='agony');
    const canSilence=charSpells.find(s=>s.id==='silence');
    if(!ai.agony){
      if(canCorruption) chosen=canCorruption;
      else if(canAgony) chosen=canAgony;
      else if(canSilence) chosen=canSilence;
      else if(ai.mana<2&&ai.hp>ai.maxHp*0.45&&_rng()<0.60) forceChannel=true;
    }
  }
  if(aiKey==='ponder'&&!chosen){
    const canVanish=charSpells.find(s=>s.id==='vanish');
    const canManaSiphon=charSpells.find(s=>s.id==='manasiphon');
    const canBlink=charSpells.find(s=>s.id==='blink');
    if(ai.invisible>0){ if(canManaSiphon) chosen=canManaSiphon; }
    else { if(canVanish) chosen=canVanish; else if(canBlink) chosen=canBlink; else if(ai.mana<2&&ai.hp>ai.maxHp*0.45&&_rng()<0.55) forceChannel=true; }
  }
  if(aiKey==='durin'&&!chosen){
    const canStoneskin=charSpells.find(s=>s.id==='stoneskin');
    const canStonesoul=charSpells.find(s=>s.id==='stonesoul');
    const canRockfall=charSpells.find(s=>s.id==='rockfall');
    if(canStoneskin) chosen=canStoneskin;
    else if(canStonesoul) chosen=canStonesoul;
    else if(canRockfall&&_rng()<0.70) chosen=canRockfall;
    else if(ai.mana<3&&ai.hp>ai.maxHp*0.40&&_rng()<0.65) forceChannel=true;
  }
  if(!chosen){
    const dispelSpell=universalSpells.find(s=>s.element==='dispel');
    if(dispelSpell){
      const needsCleanse=ai.agony>0||ai.corruption>0||ai.silence>2||ai.blizzard>1||ai.vineWhip>1||ai.candle>1;
      const oppHasKeyBuff=p1.shield>0||p1.foresight||p1.resist>1||p1.invisible>1||p1.stoneskin>0||p1.stonesoul>0||p1.ward>0||p1.counter;
      if(needsCleanse){ chosen=dispelSpell; aiDispelSelf=true; forceChannel=false; }
      else if(!forceChannel&&oppHasKeyBuff&&_rng()<0.45){ chosen=dispelSpell; aiDispelSelf=false; }
    }
  }
  if(!chosen&&!forceChannel){
    const manaBurnSpell=universalSpells.find(s=>s.element==='manaburn');
    if(manaBurnSpell&&p1.mana>=7) chosen=manaBurnSpell;
  }
  if(!chosen&&!forceChannel&&available.length>0){
    if(charSpells.length>0&&_rng()<0.50){
      chosen=charSpells[Math.floor(_rng()*charSpells.length)];
    } else if(universalSpells.length>0){
      if(p1.shield>0&&universalSpells.find(s=>s.element==='lightning')) chosen=universalSpells.find(s=>s.element==='lightning');
      else if(!p1.shield&&universalSpells.find(s=>s.element==='fire')) chosen=universalSpells.find(s=>s.element==='fire');
      else if(p1.mana>=3&&universalSpells.find(s=>s.element==='ice')) chosen=universalSpells.find(s=>s.element==='ice');
      else { const randPool=universalSpells.filter(s=>s.element!=='dispel'); if(randPool.length>0) chosen=randPool[Math.floor(_rng()*randPool.length)]; }
    } else { chosen=charSpells[Math.floor(_rng()*charSpells.length)]; }
  }
  return {chosen, aiDispelSelf, forceChannel};
}

// Returns committed action object for AI without executing — used by simultaneous resolution
function aiChooseSync(who){
  const ai=gs[who];
  if(ai.frozen>0) return {type:'__frozen__', ok:true};
  const decide=aiDifficulty==='normal'?aiDecideNormal:aiDecideEasy;
  const {chosen, aiDispelSelf, forceChannel}=decide(who);
  if(!chosen||forceChannel) return {type:'channel', ok:true};
  if(chosen.id) return {type:chosen.id, ok:true, isCharSpell:true};
  return {type:chosen.element, ok:true, dispelSelf:!!aiDispelSelf};
}

// ── AI TURN ────────────────────────────────────────────────
function doAI(who='p2'){
  if(!gs||!battleRunning||gameEnded) return;

  const opp = who==='p2' ? 'p1' : 'p2';
  const aiCfg = who==='p2' ? p2Cfg : p1Cfg;
  const aiKey = who==='p2' ? p2Key : p1Key;
  const ai = gs[who];
  const ax = who==='p2' ? bW*.78 : bW*.22;
  const tx = who==='p2' ? bW*.22 : bW*.78;
  const endTurn = who==='p2' ? finishAI : ()=>endMyTurn(false);

  // AI already acted this round (haste interrupt) — skip to end-of-round cleanup
  if(who==='p2'&&gs.skipAITurn){
    gs.skipAITurn=false;
    finishAI();
    return;
  }

  // Training mode with AI off: opponent just channels every turn
  if(who==='p2'&&trainingMode&&!trainingAI){
    if(skipAIAction){
      skipAIAction=false;
      if(gs.p1.invisible>0) gs.p1.invisible--;
      if(gs.p2.invisible>0) gs.p2.invisible--;
      if(gs.p2.vineWhip>0){ processVineWhip(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.blizzard>0){ processBlizzard(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.burn>0){ processBurn(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.regen) processRegen(gs.p2,bW*.78,bH*.38);
      gs.p2.mana=Math.min(MAX_MANA,gs.p2.mana+1);
      if(gs.p2.frozen>0){ gs.p2.frozen--; }
      finishAI(); return;
    }
    if(gs.p1.invisible>0) gs.p1.invisible--;
    if(gs.p2.invisible>0) gs.p2.invisible--;
    if(gs.p2.vineWhip>0){ processVineWhip(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.blizzard>0){ processBlizzard(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.burn>0){ processBurn(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.regen) processRegen(gs.p2,bW*.78,bH*.38);
    gs.p2.mana=Math.min(MAX_MANA,gs.p2.mana+1);
    if(gs.p2.frozen>0){
      gs.p2.frozen--;
      addFloat(bW*.78,bH*.38,'❄️ Frozen!','#88ddff',13);
      setTimeout(finishAI,1200);
      return;
    }
    const aiNoAI=gs.p2;
    if(aiNoAI.timeDrain>0){
      aiNoAI.mana=Math.min(MAX_MANA,aiNoAI.mana+2);
      addFloat(bW*.78,bH*.38,'⏳ Drained! +2','#ffcc44',13);
    } else {
      aiNoAI.mana=Math.min(MAX_MANA,aiNoAI.mana+p2Cfg.channelAmt);
      addFloat(bW*.78,bH*.38,'✨ Channeling...','#aaaaff',13);
    }
    if(aiNoAI.candle>0) triggerCandleBurn(aiNoAI,bW*.78);
    anim('p2','cast',700);
    if(aiNoAI.shield>0){
      aiNoAI.shield--;
      if(aiNoAI.shield<=0){ aiNoAI.shieldHp=0; aiNoAI.counter=false; }
    }
    tickStatuses(aiNoAI);
    finishAI();
    return;
  }

  // Decrement invisible counters once per round (at the p2 AI's turn boundary)
  if(who==='p2'){
    if(gs.p1.invisible>0) gs.p1.invisible--;
    if(gs.p2.invisible>0) gs.p2.invisible--;
  }

  // Vine whip tick for AI
  if(ai.vineWhip>0){
    processVineWhip(ai,ax,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Blizzard tick for AI
  if(ai.blizzard>0){
    processBlizzard(ai,ax,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Burn tick for AI
  if(ai.burn>0){
    processBurn(ai,ax,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Regen tick for AI
  if(ai.regen) processRegen(ai,ax,bH*.38);

  // Passive mana regen
  ai.mana=Math.min(MAX_MANA,ai.mana+1);

  // Simultaneous: skip action; decrement frozen silently (float shown at execution time)
  if(skipAIAction){
    skipAIAction=false;
    if(ai.frozen>0){ ai.frozen--; }
    endTurn(); return;
  }

  // Frozen: skip turn (sequential path)
  if(ai.frozen>0){
    ai.frozen--;
    addFloat(ax,bH*.38,'❄️ Frozen!','#88ddff',13);
    combatTimeout(endTurn,1200);
    return;
  }

  const {chosen, aiDispelSelf}=aiDecideEasy(who);
  dispelSelf=aiDispelSelf;

  if(!chosen){
    // Channel
    if(ai.timeDrain>0){
      ai.mana=Math.min(MAX_MANA,ai.mana+2);
      addFloat(ax,bH*.38,'⏳ Drained! +2 Mana','#ffcc44',13);
    } else {
      ai.mana=Math.min(MAX_MANA,ai.mana+aiCfg.channelAmt);
      addFloat(ax,bH*.38,'+'+aiCfg.channelAmt+' Mana','#ff8888',13);
    }
    if(ai.candle>0) triggerCandleBurn(ai,ax);
    anim(who,'cast',700);
    if(ai.shield>0){
      ai.shield--;
      if(ai.shield<=0){ ai.shieldHp=0; ai.counter=false; }
    }
    tickStatuses(ai);
    endTurn();
    return;
  }

  // Agony: AI takes damage for any non-channel action
  if(ai.agony>0){
    const agonDmg=ai.agonyDmg||12;
    ai.hp=Math.max(0,ai.hp-agonDmg);
    addFloat(ax,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(ax,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }

  // Silence: 45% chance mana-cost spells fizzle
  if(chosen.id&&chosen.cost>0&&ai.silence>0&&_rng()<0.45){
    showSilenceBlock(ax,bH*.33); anim(who,'cast',600);
    tickStatuses(ai); endTurn(); return;
  }
  if(!chosen.id&&ai.silence>0&&_rng()<0.45){
    showSilenceBlock(ax,bH*.33); anim(who,'cast',600);
    ai.mana=Math.max(0,ai.mana-1); tickStatuses(ai); endTurn(); return;
  }

  if(chosen.id){
    // Character spell (instant)
    resolveCharSpell(chosen.id,who);
    return;
  }

  // Universal spell
  addFloat(ax,bH*.26,chosen.icon+' '+chosen.name+'!',chosen.col,12);
  anim(who,'cast',800);
  combatTimeout(()=>{
    if(!battleRunning) return;
    tickStatuses(ai);
    if(_rng()<0.8){
      ai.mana-=chosen.cost;
      if(chosen.element==='dispel'&&dispelSelf){
        castSpell(chosen,gs[who],ax,bH*.38,who);
        endTurn();
      } else {
        spawnProj(ax,bH*.38,tx,bH*.38,chosen.element,chosen.col,()=>{
          if(!battleRunning) return;
          castSpell(chosen,gs[opp],tx,bH*.38,who);
          endTurn();
        });
      }
    } else {
      addFloat(ax,bH*.33,'Fizzled!','#ff8844',12);
      ai.mana=Math.max(0,ai.mana-1);
      endTurn();
    }
  },700);
}

// ── NORMAL AI TURN (combo-aware) ───────────────────────────
function doAINormal(who='p2'){
  if(!gs||!battleRunning||gameEnded) return;

  const opp = who==='p2' ? 'p1' : 'p2';
  const aiCfg = who==='p2' ? p2Cfg : p1Cfg;
  const aiKey = who==='p2' ? p2Key : p1Key;
  const ai = gs[who];
  const ax = who==='p2' ? bW*.78 : bW*.22;
  const tx = who==='p2' ? bW*.22 : bW*.78;
  const endTurn = who==='p2' ? finishAI : ()=>endMyTurn(false);

  if(who==='p2'&&gs.skipAITurn){
    gs.skipAITurn=false;
    finishAI();
    return;
  }

  // Training mode with AI off: opponent just channels every turn
  if(who==='p2'&&trainingMode&&!trainingAI){
    if(skipAIAction){
      skipAIAction=false;
      if(gs.p1.invisible>0) gs.p1.invisible--;
      if(gs.p2.invisible>0) gs.p2.invisible--;
      if(gs.p2.vineWhip>0){ processVineWhip(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.blizzard>0){ processBlizzard(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.burn>0){ processBurn(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
      if(gs.p2.regen) processRegen(gs.p2,bW*.78,bH*.38);
      gs.p2.mana=Math.min(MAX_MANA,gs.p2.mana+1);
      if(gs.p2.frozen>0){ gs.p2.frozen--; }
      finishAI(); return;
    }
    if(gs.p1.invisible>0) gs.p1.invisible--;
    if(gs.p2.invisible>0) gs.p2.invisible--;
    if(gs.p2.vineWhip>0){ processVineWhip(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.blizzard>0){ processBlizzard(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.burn>0){ processBurn(gs.p2,bW*.78,bH*.38); checkWin(); if(!battleRunning) return; }
    if(gs.p2.regen) processRegen(gs.p2,bW*.78,bH*.38);
    gs.p2.mana=Math.min(MAX_MANA,gs.p2.mana+1);
    if(gs.p2.frozen>0){
      gs.p2.frozen--;
      addFloat(bW*.78,bH*.38,'❄️ Frozen!','#88ddff',13);
      setTimeout(finishAI,1200);
      return;
    }
    const aiNoAI=gs.p2;
    if(aiNoAI.timeDrain>0){
      aiNoAI.mana=Math.min(MAX_MANA,aiNoAI.mana+2);
      addFloat(bW*.78,bH*.38,'⏳ Drained! +2','#ffcc44',13);
    } else {
      aiNoAI.mana=Math.min(MAX_MANA,aiNoAI.mana+p2Cfg.channelAmt);
      addFloat(bW*.78,bH*.38,'✨ Channeling...','#aaaaff',13);
    }
    if(aiNoAI.candle>0) triggerCandleBurn(aiNoAI,bW*.78);
    anim('p2','cast',700);
    if(aiNoAI.shield>0){
      aiNoAI.shield--;
      if(aiNoAI.shield<=0){ aiNoAI.shieldHp=0; aiNoAI.counter=false; }
    }
    tickStatuses(aiNoAI);
    finishAI();
    return;
  }

  // Decrement invisible counters once per round (at the p2 AI's turn boundary)
  if(who==='p2'){
    if(gs.p1.invisible>0) gs.p1.invisible--;
    if(gs.p2.invisible>0) gs.p2.invisible--;
  }

  if(ai.vineWhip>0){ processVineWhip(ai,ax,bH*.38); checkWin(); if(!battleRunning) return; }
  if(ai.blizzard>0){ processBlizzard(ai,ax,bH*.38); checkWin(); if(!battleRunning) return; }
  if(ai.burn>0){ processBurn(ai,ax,bH*.38); checkWin(); if(!battleRunning) return; }
  if(ai.regen) processRegen(ai,ax,bH*.38);

  ai.mana=Math.min(MAX_MANA,ai.mana+1);

  // Simultaneous: skip action; decrement frozen silently (float shown at execution time)
  if(skipAIAction){
    skipAIAction=false;
    if(ai.frozen>0){ ai.frozen--; }
    endTurn(); return;
  }

  // Frozen: skip turn (sequential path)
  if(ai.frozen>0){
    ai.frozen--;
    addFloat(ax,bH*.38,'❄️ Frozen!','#88ddff',13);
    combatTimeout(endTurn,1200);
    return;
  }

  const {chosen, aiDispelSelf, forceChannel}=aiDecideNormal(who);
  dispelSelf=aiDispelSelf;
  // ── Channel fallback ────────────────────────────────────────
  if(!chosen){
    if(ai.timeDrain>0){
      ai.mana=Math.min(MAX_MANA,ai.mana+2);
      addFloat(ax,bH*.38,'⏳ Drained! +2 Mana','#ffcc44',13);
    } else {
      ai.mana=Math.min(MAX_MANA,ai.mana+aiCfg.channelAmt);
      addFloat(ax,bH*.38,'+'+aiCfg.channelAmt+' Mana','#ff8888',13);
    }
    if(ai.candle>0) triggerCandleBurn(ai,ax);
    anim(who,'cast',700);
    if(ai.shield>0){
      ai.shield--;
      if(ai.shield<=0){ ai.shieldHp=0; ai.counter=false; }
    }
    tickStatuses(ai);
    endTurn();
    return;
  }
  // Agony: AI takes damage for any non-channel action
  if(ai.agony>0){
    const agonDmg=ai.agonyDmg||12;
    ai.hp=Math.max(0,ai.hp-agonDmg);
    addFloat(ax,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(ax,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }
  // Silence: 45% chance mana-cost spells fizzle
  if(chosen.id&&chosen.cost>0&&ai.silence>0&&_rng()<0.45){
    showSilenceBlock(ax,bH*.33); anim(who,'cast',600);
    tickStatuses(ai); endTurn(); return;
  }
  if(!chosen.id&&ai.silence>0&&_rng()<0.45){
    showSilenceBlock(ax,bH*.33); anim(who,'cast',600);
    ai.mana=Math.max(0,ai.mana-1); tickStatuses(ai); endTurn(); return;
  }
  if(chosen.id){
    resolveCharSpell(chosen.id,who);
    return;
  }
  // Universal spell
  addFloat(ax,bH*.26,chosen.icon+' '+chosen.name+'!',chosen.col,12);
  anim(who,'cast',800);
  combatTimeout(()=>{
    if(!battleRunning) return;
    tickStatuses(ai);
    if(_rng()<0.8){
      ai.mana-=chosen.cost;
      if(chosen.element==='dispel'&&dispelSelf){
        castSpell(chosen,gs[who],ax,bH*.38,who);
        endTurn();
      } else {
        spawnProj(ax,bH*.38,tx,bH*.38,chosen.element,chosen.col,()=>{
          if(!battleRunning) return;
          castSpell(chosen,gs[opp],tx,bH*.38,who);
          endTurn();
        });
      }
    } else {
      addFloat(ax,bH*.33,'Fizzled!','#ff8844',12);
      ai.mana=Math.max(0,ai.mana-1);
      endTurn();
    }
  },700);
}
function finishAI(){
  if(simCallback){ const cb=simCallback; simCallback=null; cb(); return; }
  if(!battleRunning||gameEnded) return;
  // Safety: cap runaway battles in headless mode
  if(headless&&gs.round>400){ endGame(gs.p1.hp>=gs.p2.hp); return; }
  checkWin(); if(!battleRunning) return;

  // Haste interrupt: player has a queued action — run it now, defer end-of-round effects
  if(gs.pendingAction){
    const pa=gs.pendingAction;
    gs.pendingAction=null;
    gs.skipAITurn=true;
    gs.myTurn=true; gs.busy=false;
    act(pa);
    return;
  }

  // Vine whip tick for player
  if(gs.p1.vineWhip>0){
    processVineWhip(gs.p1,bW*.22,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Blizzard tick for player
  if(gs.p1.blizzard>0){
    processBlizzard(gs.p1,bW*.22,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Burn tick for player
  if(gs.p1.burn>0){
    processBurn(gs.p1,bW*.22,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Regen tick for player
  if(gs.p1.regen) processRegen(gs.p1,bW*.22,bH*.38);

  // Passive mana regen
  gs.p1.mana=Math.min(MAX_MANA,gs.p1.mana+1);

  // Frozen: auto-commit frozen action for P1; float shown at execution time
  if(gs.p1.frozen>0){
    gs.p1.frozen--;
    combatTimeout(()=>{
      if(!battleRunning||gameEnded) return;
      pendingP1Action={type:'__frozen__'};
      pendingP2Action=aiChooseSync('p2');
      resolveSimRound();
    }, 400);
    return;
  }

  if(watchMode){ combatTimeout(()=>(aiDifficulty==='normal'?doAINormal:doAI)('p1'),800); } else { gs.myTurn=true; gs.busy=false; }
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

function checkWin(){
  const p1Dead=gs.p1.hp<=0, p2Dead=gs.p2.hp<=0;
  if(!p1Dead&&!p2Dead) return;
  if(deferWinCheck){ pendingWin={p1Dead,p2Dead}; return; }
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
    function resetPlayer(st,cfg){
      st.hp=cfg.hp; st.maxHp=cfg.hp; st.mana=cfg.startMana;
      st.shield=0; st.shieldHp=0; st.burn=0; st.frozen=0; st.regen=null;
      st.counter=false; st.empowered=false; st.foresight=false; st.timeDrain=0;
      st.resist=0; st.invisible=0; st.ward=0; st.vineWhip=0; st.haste=0;
      st.frenzied=0; st.blink=0; st.frostArmor=0; st.blizzard=0; st.flameShield=0;
      st.candle=0; st.charge=0; st.conductivity=0; st.agony=0; st.agonyDmg=0;
      st.silence=0; st.corruption=0; st.stoneskin=0; st.stoneskinHp=0; st.stonesoul=0;
    }
    resetPlayer(gs.p1,p1Cfg);
    resetPlayer(gs.p2,p2Cfg);
    gs.p1anim='idle'; gs.p2anim='idle';
    gs.parts=[]; gs.floats=[]; gs.projs=[]; gs.beams=[];
    gs.pendingAction=null; gs.skipAITurn=false;
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
  if(headless){ battleRunning=false; headlessWinner=isDraw?null:(won?p1Key:p2Key); return; }
  gs.myTurn=false; gs.busy=true;
  if(isDraw){ gs.p1anim='death'; gs.p2anim='death'; }
  else { gs[won?'p2anim':'p1anim']='death'; }

  // Tourney live match (watch or play) — update bracket then return
  if(tourneyMode&&tourneyCurrentMatch!==null){
    const winnerKey=won?p1Key:p2Key;
    const {round,matchIdx}=tourneyCurrentMatch;
    tourneyPendingResult={round,matchIdx,winnerKey};
    setTimeout(()=>{
      battleRunning=false; watchMode=false; tourneyCurrentMatch=null;
      document.getElementById('actionbar').style.display='';
      const wCfg=CHAR_DEFS[winnerKey];
      document.getElementById('ovico').textContent='⚔️';
      document.getElementById('ovtitle').textContent=(wCfg?wCfg.name:winnerKey)+' wins!';
      document.getElementById('ovtitle').style.color=(wCfg&&wCfg.col)||'#f0cc6a';
      document.getElementById('ovdesc').textContent='';
      document.getElementById('btn-continue').textContent='← Back to Tournament';
      document.getElementById('overlay').classList.add('active');
    },1000);
    return;
  }

  setTimeout(()=>{
    if(twoPlayerMode){
      battleRunning=false;
      if(isDraw){ /* no win points on draw */ }
      else if(!p2pGameOverReceived){ if(won) p1MatchWins++; else p2MatchWins++; }
      if(!isDraw&&p2pMode&&WizardsP2P.isOpen()&&!p2pGameOverReceived){
        WizardsP2P.send({type:'game_over',winner:won?'p1':'p2',
          p1MatchWins,p2MatchWins,matchRound});
      }
      p2pGameOverReceived=false;
      p2pHideWaiting();
      const isMatchOver=isDraw||(p1MatchWins>=2||p2MatchWins>=2||matchRound>=3);
      const winnerCfg=isDraw?null:(won?p1Cfg:p2Cfg);
      const winnerNum=isDraw?0:(won?1:2);
      const continueBtn=document.getElementById('btn-continue');
      document.getElementById('ovico').textContent=isMatchOver?'🏆':'⚔️';
      if(isDraw){
        document.getElementById('ovtitle').textContent='⚡ Double Knock-Out!';
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
    if(!won&&inTournament){
      showRetryScreen();
      return;
    }
    battleRunning=false;
    if(!won){
      document.getElementById('ovico').textContent='💀';
      document.getElementById('ovtitle').textContent='Defeated!';
      document.getElementById('ovtitle').style.color='#ff4a6e';
      document.getElementById('ovdesc').textContent='Your magic was not enough. Study and return!';
      continueBtn.textContent='Back to Title';
    } else if(inTournament&&isLastFight){
      document.getElementById('ovico').textContent='🏆';
      document.getElementById('ovtitle').textContent=arcadeMode?'Arcade Champion!':'Iron Man Champion!';
      document.getElementById('ovtitle').style.color='#f0cc6a';
      document.getElementById('ovdesc').textContent=arcadeMode?'You defeated all challengers and claimed the Arcade trophy!':'You defeated every wizard — the Iron Man title is yours!';
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
  document.getElementById('pztimer').textContent='';
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

  // 4 glyphs × 2 copies = 8 tiles (4 pairs)
  const glyphIdxs=BUFF_TILE_GLYPHS[spellId];
  const deck=[...glyphIdxs,...glyphIdxs].sort(()=>_rng()-.5);
  const TILE_N=deck.length; // 8

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

  // Brief face-up preview at start (difficulty-dependent)
  const PREVIEW_MS=diffName==='easy'?3000:diffName==='hard'?0:1500;
  let previewActive=PREVIEW_MS>0;
  if(previewActive){
    tiles.forEach(t=>t.flipped=true);
    setTimeout(()=>{
      if(done) return;
      previewActive=false;
      tiles.forEach(t=>{if(!t.matched)t.flipped=false;});
    },PREVIEW_MS);
  }

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
        },500);
      } else {
        // Mismatch — mark for red flash, then flip back
        revealed.forEach(t=>t.mismatch=true);
        strikes++;
        setTimeout(()=>{
          revealed.forEach(t=>{t.flipped=false; t.mismatch=false;});
          revealed=[]; locked=false;
          if(strikes>=MAX_STRIKES) finish(false);
        },900);
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
  const SPELL_IDX=[0,1,4,8];
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
  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[0,1,4,8]  // canonical Inferno word: ϟ Δ Ω ⊕
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

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
  const SPAWN_DELAY=500,SPAWN_INTERVAL=3000,RISE_SPD=0.9;
  const watchDuration=SPAWN_DELAY+(SEQ_LEN-1)*SPAWN_INTERVAL+4000;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  const SPELL_IDX=[3,2,9,7];
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

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[3,2,9,7]  // canonical Lightning word: Ψ ∇ ⊗ ✸
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

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

  const SPAWN_DELAY=600,SPAWN_INTERVAL=3500;
  const BOLT_DUR=300;     // bolt flash visible
  const GLYPH_HOLD=200;   // glyph at full brightness after strike
  const GLYPH_FADE=2400;  // afterglow fade duration
  const GLYPH_DUR=GLYPH_HOLD+GLYPH_FADE;
  const watchDuration=SPAWN_DELAY+(SEQ_LEN-1)*SPAWN_INTERVAL+4500;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  const SPELL_IDX=[3,2,9,7];
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

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[3,2,9,7]  // canonical Mana Burn word: Ψ ∇ ⊗ ✸
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Watch phase timing
  const STATIC_HOLD=2800;        // glyphs static before burning starts
  const NOISE_RISE_DELAY=0;      // noise starts rising immediately when burn begins
  const SPELL_RISE_DELAY=600;    // spell glyphs ignite shortly after noise
  const NOISE_RISE_SPD=1.9;      // noise rises quickly
  const SPELL_RISE_SPD=2.5;      // spell glyphs burn off faster
  const watchDuration=STATIC_HOLD+5200;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  const SPELL_IDX=[10,11,6,5];
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

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[10,11,6,5]  // canonical Ice word: θ Φ ☽ ∞
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

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

  const SPAWN_DELAY=500,SPAWN_INTERVAL=3000;
  const FADE_IN=1800,HOLD=1400,FADE_OUT=1800;
  const GLYPH_DUR=FADE_IN+HOLD+FADE_OUT;
  const watchDuration=SPAWN_DELAY+(SEQ_LEN-1)*SPAWN_INTERVAL+4000;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  const SPELL_IDX=[4,5,3,10];
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

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[4,5,3,10]  // canonical Arcane word: Ω ∞ Ψ θ
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

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
  const SPAWN_DELAY=500,SPAWN_INTERVAL=3000;
  const watchDuration=SPAWN_DELAY+(SEQ_LEN-1)*SPAWN_INTERVAL+4000;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  const SPELL_IDX=[5,8,2,10];
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

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=diffName==='easy'
    ?[5,8,2,10]  // canonical Dispel word: ∞ ⊕ ∇ θ
    :Array.from({length:SEQ_LEN},()=>SPELL_IDX[Math.floor(_rng()*4)]);
  const playerSeq=[];
  let phase='watch';
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  // Watch phase center — upper portion of canvas
  const cx=cw/2, cy=ch*0.40;

  // Ring radii — inner scales slightly with sequence length to avoid crowding
  const R_OUTER=110, R_MID=72;
  const R_INNER=SEQ_LEN<=4?38:SEQ_LEN<=5?48:64;
  const INNER_FONT=SEQ_LEN<=4?52:SEQ_LEN<=5?44:36;

  // Layer fade timings (ms)
  const OUTER_FADE_START=2000, OUTER_FADE_DUR=2000;  // outer fades 2–4 s
  const MID_FADE_START=4500,   MID_FADE_DUR=2500;    // middle fades 4.5–7 s
  const INNER_FADE_START=7500, INNER_FADE_DUR=2500;  // inner fades 7.5–10 s
  const watchDuration=10500;
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
      if(timeLeft<=5) timerEl.classList.add('urgent');
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
  if(headless) return;
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

// ── DISPEL TARGET SELECTION ────────────────────────────────
function showDispelTarget(cb){
  const overlay=document.getElementById('dispel-target-overlay');
  overlay.classList.add('active');
  document.getElementById('dt-self').addEventListener('click',()=>{
    overlay.classList.remove('active'); cb(true);
  },{once:true});
  document.getElementById('dt-opp').addEventListener('click',()=>{
    overlay.classList.remove('active'); cb(false);
  },{once:true});
}

// ── ACTION BAR SETUP ───────────────────────────────────────
function updateActionBar(cfg){
  document.getElementById('channel-cost-label').textContent='+'+cfg.channelAmt+' Mana';

  // Character-specific abilities row
  const container=document.getElementById('spell-buttons');
  container.innerHTML='';
  (cfg.spells||[]).forEach(spell=>{
    const btn=document.createElement('button');
    btn.className='abtn abtn-ability';
    btn.id='bspell-'+spell.id;
    btn.innerHTML=`<span class="abtn-ico">${spell.icon}</span><span class="abtn-name">${spell.name}</span><span class="cost">${spell.costLabel||spell.cost}</span>`;
    btn.style.borderColor=cfg.col;
    btn.style.color=cfg.col;
    btn.title=spell.effectLabel||'';
    btn.addEventListener('click',()=>act(spell.id));
    container.appendChild(btn);
  });

  // Populate spell picker overlay cards
  const grid=document.getElementById('sp-grid');
  grid.innerHTML='';
  SPELLS.forEach(spell=>{
    const card=document.createElement('div');
    card.className='sp-card';
    card.dataset.el=spell.element;
    card.id='spcard-'+spell.element;
    card.innerHTML=`<span class="sp-card-icon">${spell.icon}</span><span class="sp-card-name">${spell.name}</span><span class="sp-card-cost">${spell.cost} Mana</span><span class="sp-card-effect">${spell.effectLabel}</span>`;
    card.addEventListener('click',()=>{
      if(card.classList.contains('disabled')) return;
      showScreen('battle-screen');
      act(spell.element);
    });
    grid.appendChild(card);
  });
}

// ── BUTTON WIRING ──────────────────────────────────────────
function showWizardDetail(key){
  const cfg=CHAR_DEFS[key]||{};
  const disp=CHAR_DISPLAY[key];
  const col=cfg.col||'#f0cc6a';
  const portrait=document.getElementById('wd-portrait');
  portrait.style.display='';
  portrait.src='portraits/'+key+'.png';
  const nameEl=document.getElementById('wd-name');
  nameEl.textContent=cfg.name||key.toUpperCase();
  nameEl.style.color=col;
  document.getElementById('wd-epithet').textContent=cfg.title||'';
  document.getElementById('wd-stats').innerHTML=disp.stats
    .map(([l,r])=>`<div class="cstat"><span class="cstat-l">${l}</span><span class="cstat-r">${r}</span></div>`)
    .join('');
  document.getElementById('wd-flavour').textContent=disp.flavour;
  const chooseBtn=document.getElementById('wd-choose');
  chooseBtn.style.borderColor=col;
  chooseBtn.style.color=col;
  chooseBtn.dataset.key=key;
  document.getElementById('wizard-detail').classList.add('active');
}

function pickCharacter(key){
  if(tourneyPickMode){
    tourneyPickMode=false;
    document.getElementById('char-player-label').style.display='none';
    buildTourneyBracket(key);
    showTourneyScreen();
    return;
  }
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
  if(p2pMode){ p2pHandleCharSelect(key); return; }
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
  if(arcadeMode){
    // 4 random non-boss opponents, then 4 fixed bosses in order
    const pool=Object.keys(CHAR_DEFS).filter(k=>k!==key&&!ARCADE_BOSSES.includes(k));
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(_rng()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    const earlyFoes=pool.slice(0,4);
    const bossList=ARCADE_BOSSES.filter(k=>k!==key);
    tournamentQueue=[...earlyFoes,...bossList];
  } else {
    // Iron Man: every opponent, fully randomised
    const others=Object.keys(CHAR_DEFS).filter(k=>k!==key);
    for(let i=others.length-1;i>0;i--){
      const j=Math.floor(_rng()*(i+1));
      [others[i],others[j]]=[others[j],others[i]];
    }
    tournamentQueue=others;
  }
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
  // P1 goes first in rounds 1 & 3, P2 goes first in round 2
  const firstPlayer=(matchRound===2)?'p2':'p1';
  startTwoPlayerBattle(firstPlayer);
}

function startTwoPlayerBattle(firstPlayer){
  p2pGameOverReceived=false;
  p2pLastAction=null;
  document.getElementById('btn-training-menu').style.display='none';
  loadSprites();
  updateActionBar(firstPlayer==='p1'?p1Cfg:p2Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name+' (P1)';
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/'+p1Key+'.png';
  const p2hud=document.querySelector('.phud-p2');
  p2hud.style.visibility='';
  document.getElementById('p2name').textContent=p2Cfg.name+' (P2)';
  document.getElementById('p2-portrait').src='portraits/'+p2Key+'.png';
  newState();
  gs.turnPlayer=firstPlayer;
  gs.myTurn=false; gs.busy=true;
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
  setTimeout(()=>showHandoffOverlay(firstPlayer,()=>{ gs.myTurn=true; gs.busy=false; }),200);
}

function showHandoffOverlay(toPlayer, callback){
  if(p2pMode){
    const me=p2pRole==='host'?'p1':'p2';
    if(toPlayer===me){
      // My turn — show a "Your Turn!" overlay (reuse handoff box, tweak text)
      const cfg=toPlayer==='p1'?p1Cfg:p2Cfg;
      document.getElementById('handoff-player-num').textContent='Your Turn!';
      document.getElementById('handoff-char-name').textContent=cfg.name.toUpperCase();
      const portrait=document.getElementById('handoff-portrait');
      portrait.src='portraits/'+(toPlayer==='p1'?p1Key:p2Key)+'.png';
      portrait.style.borderColor=cfg.col;
      const p1s='★'.repeat(Math.min(2,p1MatchWins))+'☆'.repeat(Math.max(0,2-p1MatchWins));
      const p2s='★'.repeat(Math.min(2,p2MatchWins))+'☆'.repeat(Math.max(0,2-p2MatchWins));
      document.getElementById('handoff-match-info').textContent=
        'Match Round '+matchRound+' of 3  ·  P1 '+p1s+'  vs  P2 '+p2s;
      document.getElementById('handoff-sub').textContent='Opponent is ready — cast your spells!';
      const overlay=document.getElementById('handoff-overlay');
      const btn=document.getElementById('handoff-btn');
      btn.textContent='⚔ Fight!';
      btn.onclick=null;
      overlay.classList.add('active');
      btn.onclick=()=>{
        overlay.classList.remove('active');
        btn.textContent='✓ I\'m Ready!';
        document.getElementById('handoff-sub').textContent='Pass the phone · tap when ready';
        if(callback) callback();
      };
    } else {
      // Opponent's turn — send state, show waiting overlay
      p2pSendTurnEnd(false, null);
      p2pShowWaiting();
    }
    return;
  }
  const cfg=toPlayer==='p1'?p1Cfg:p2Cfg;
  const num=toPlayer==='p1'?1:2;
  document.getElementById('handoff-player-num').textContent='Player '+num;
  document.getElementById('handoff-char-name').textContent=cfg.name.toUpperCase();
  const portrait=document.getElementById('handoff-portrait');
  portrait.src='portraits/'+(toPlayer==='p1'?p1Key:p2Key)+'.png';
  portrait.style.borderColor=cfg.col;
  const p1s='★'.repeat(Math.min(2,p1MatchWins))+'☆'.repeat(Math.max(0,2-p1MatchWins));
  const p2s='★'.repeat(Math.min(2,p2MatchWins))+'☆'.repeat(Math.max(0,2-p2MatchWins));
  document.getElementById('handoff-match-info').textContent=
    'Match Round '+matchRound+' of 3  ·  P1 '+p1s+'  vs  P2 '+p2s;
  const overlay=document.getElementById('handoff-overlay');
  const btn=document.getElementById('handoff-btn');
  btn.onclick=null;
  overlay.classList.add('active');
  btn.onclick=()=>{ overlay.classList.remove('active'); if(callback) callback(); };
}

function startPlayerTurn(who){
  if(!battleRunning||gameEnded) return;
  const whoState=gs[who];
  const tx=who==='p1'?bW*.22:bW*.78;

  // Decrement invisible once per full round (at P1→P2 transition)
  if(who==='p2'){
    if(gs.p1.invisible>0) gs.p1.invisible--;
    if(gs.p2.invisible>0) gs.p2.invisible--;
  }

  // DOT ticks for this player before they act
  if(whoState.vineWhip>0){
    processVineWhip(whoState,tx,bH*.38);
    checkWin(); if(!battleRunning) return;
  }
  if(whoState.blizzard>0){
    processBlizzard(whoState,tx,bH*.38);
    checkWin(); if(!battleRunning) return;
  }
  if(whoState.burn>0){
    processBurn(whoState,tx,bH*.38);
    checkWin(); if(!battleRunning) return;
  }
  if(whoState.regen) processRegen(whoState,tx,bH*.38);

  // Passive mana
  whoState.mana=Math.min(MAX_MANA,whoState.mana+1);

  // Frozen: auto-commit frozen action and advance to next input or resolution
  // Float shown at execution time by executeQueuedSpell
  if(whoState.frozen>0){
    whoState.frozen--;
    if(who==='p1'){
      pendingP1Action={type:'__frozen__'};
      setTimeout(()=>{
        if(!battleRunning||gameEnded) return;
        showHandoffOverlay('p2',()=>startPlayerTurn('p2'));
      },1400);
    } else {
      pendingP2Action={type:'__frozen__'};
      setTimeout(()=>{ if(!battleRunning||gameEnded) return; resolveSimRound(); },1400);
    }
    return;
  }

  gs.turnPlayer=who;
  updateActionBar(who==='p1'?p1Cfg:p2Cfg);
  gs.myTurn=true; gs.busy=false;
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
    if(watchMode) fightLbl.textContent='Watching';
    else if(tourneyMode) fightLbl.textContent='Tournament';
    else if(tournamentQueue.length>1) fightLbl.textContent='Fight '+(tournamentIndex+1)+' / '+tournamentQueue.length;
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

// ── TUTORIAL ─────────────────────────────────────────────────────────────────
const CHAR_COLORS_TUT={
  eldrad:'#4af0ff',mal:'#ff4a6e',sylvara:'#44cc88',aurelia:'#ffcc44',
  gnash:'#dd8822',cinder:'#ff6600',skadi:'#88ddff',zacharius:'#aaff44',
  mary:'#f0d8a0',mordant:'#9944cc',ponder:'#9988cc',durin:'#b08040'
};
const CHAR_NAMES_TUT={
  eldrad:'Eldrin',mal:'Malachar',sylvara:'Sylvara',aurelia:'Aurelia',
  gnash:'Gnash',cinder:'Cinder',skadi:'Skadi',zacharius:'Zacharius',
  mary:'Mary',mordant:'Mordant',ponder:'Ponder',durin:'Durin'
};
const CHAR_KEYS_TUT=['eldrad','mal','sylvara','aurelia','gnash','cinder','skadi','zacharius','mary','mordant','ponder','durin'];

const TUTORIAL_TOPICS=[
  {id:'welcome',     label:'Welcome'},
  {id:'health-mana', label:'Health & Mana'},
  {id:'channeling',  label:'Channeling'},
  {id:'casting',     label:'Casting Spells'},
  {id:'spells',      label:'Arcane Spells'},
  {id:'alphabet',    label:'The Alphabet'},
  {id:'watching',    label:'Watch Games'},
  {id:'difficulty',  label:'Difficulty'},
  {id:'p2p-duel',    label:'P2P Duel'},
];

const TUTORIAL_CONVOS={
  welcome:[
    {key:'eldrad', text:"Greetings, young mage. Welcome to the arena of wizards — a place where arcane knowledge and quick thinking decide everything."},
    {key:'sylvara',text:"Don't be intimidated! Every duel starts with the same foundation. Use the topics above to explore each part of how the game works."},
    {key:'ponder', text:"You can also tap any character portrait below to hear that wizard explain their own abilities. I'm Ponder — I'd love to tell you about mine when you're ready!"},
    {key:'eldrad', text:"Browse the mechanics guides, then seek out each wizard's own words. We are all here to help."},
  ],
  'health-mana':[
    {key:'eldrad', text:"Every wizard enters the duel with two vital resources: Health Points and Mana. When your HP reaches zero, the duel is over."},
    {key:'sylvara',text:"Mana is your casting energy. You need it to use abilities and spells. Each wizard starts with a different amount — I begin with 6, while Malachar starts with 7."},
    {key:'eldrad', text:"HP totals vary too. I stand at 90 HP. Gnash, being a warrior, has a hearty 105. Meanwhile Malachar trades resilience for aggression at just 80 HP."},
    {key:'sylvara',text:"Keep an eye on the HP and Mana bars at the top of the screen during battle. They tell you the entire story of the duel at a glance."},
  ],
  channeling:[
    {key:'ponder', text:"Channeling is the most important action you'll take! When you channel, you restore mana — and without mana, you can't cast spells or use most abilities."},
    {key:'sylvara',text:"By default, channeling restores 5 mana. Some wizards have abilities that change this — and some opponents can make your channeling painful or costly."},
    {key:'ponder', text:"Here's the catch: channeling skips your attack for that turn. You can't channel AND strike. So it's always a trade-off between power now and power later."},
    {key:'sylvara',text:"Timing your channels is everything. Channel too little and you'll run dry. Channel too often and you leave yourself open to free attacks!"},
  ],
  casting:[
    {key:'eldrad', text:"Every wizard has four unique personal abilities listed on the action bar during battle. Each has a mana cost — when you can afford it, tap 'Cast Spell' to use one."},
    {key:'ponder', text:"Beyond personal abilities, every wizard can cast five great elemental spells: Inferno, Lightning Bolt, Frost Nova, Arcane Surge, and Dispel. Shared by all!"},
    {key:'eldrad', text:"Elemental spells require a casting ritual — a minigame where you must prove your arcane focus. Choose your spell, perform the ritual, and unleash it."},
    {key:'ponder', text:"Each wizard also has a free basic attack that costs nothing. Useful when you're conserving mana between big plays!"},
  ],
  spells:[
    {key:'aurelia',text:"The five elemental spells are available to every wizard. Each demands a casting ritual, but the power they offer is well worth it."},
    {key:'aurelia',text:"🔥 Inferno (12 mana). Sets your foe ablaze for 5 damage per round over 2 rounds. Patient — not instant — but relentless. It burns through their health steadily."},
    {key:'aurelia',text:"⚡ Lightning Bolt (9 mana). Thirty direct damage, and it pierces shields entirely. The definitive answer to anyone relying on magical barriers."},
    {key:'aurelia',text:"❄️ Frost Nova (6 mana). Deals 18 damage and freezes your opponent — they skip their next turn entirely. Control is its own kind of power."},
    {key:'aurelia',text:"🌀 Arcane Surge (9 mana). The wild spell. Somewhere between 15 and 55 damage — you never know exactly. The ceiling is enormous, but so is the risk."},
    {key:'aurelia',text:"🌸 Dispel (5 mana). Choose: cleanse one of your own debuffs, or attempt a 70% strip of one of your opponent's active buffs. Exceptional utility."},
  ],
  alphabet:[
    {key:'sylvara',text:"Every casting ritual uses symbols from the Arcane Alphabet — twelve sacred glyphs that form the language of magic itself."},
    {key:'ponder', text:"The twelve glyphs are: ϟ Δ ∇ Ψ Ω ∞ ☽ ✸ ⊕ ⊗ θ Φ. Each spell's ritual draws upon four of these in its sequence."},
    {key:'sylvara',text:"Each spell has its own assigned glyphs: Inferno uses ϟ Δ ⊕ Ω, Lightning uses Ψ ∇ ⊗ ✸, Ice uses θ Φ ☽ ∞. The symbols have meaning — they are not random."},
    {key:'ponder', text:"Arcane Surge is special — it shares one glyph with every other element, because Arcane is the underlying force of all magic. That makes it the hardest set to memorise!"},
    {key:'sylvara',text:"Dispel also draws one glyph from each element: ∞ from Ice, ⊕ from Inferno, ∇ from Lightning, θ from Arcane. A universal spell built from universal symbols."},
  ],
  watching:[
    {key:'ponder', text:"When you cast an elemental spell, a ritual begins. First: the Watch Phase. Glyphs rise from the ground — red ones are noise, ignore them. White glowing ones are your sequence."},
    {key:'sylvara',text:"Each white glyph has a coloured glow and a small number badge showing its position. Watch carefully — they appear one by one, staggered three seconds apart."},
    {key:'ponder', text:"After the last glyph appears, you have four seconds before the Input Phase begins. A 3×4 keyboard of all twelve glyphs appears — tap them in the order you saw them."},
    {key:'sylvara',text:"Get the sequence right and the spell fires! Make a mistake and the ritual fails. Casting under pressure is a true test of arcane focus — you'll improve with practice."},
    {key:'ponder', text:"Tip: on Easy mode each spell uses the same fixed sequence every time, so you can memorise it. On Normal and Hard the sequence is randomised each cast."},
  ],
  difficulty:[
    {key:'ponder',text:"The difficulty setting changes how the casting ritual works. Easy mode uses a fixed 4-glyph sequence for each spell — the same every time, fully memorisable."},
    {key:'ponder',text:"On Easy, the keyboard also greys out glyphs that don't belong to that spell. You only see the four relevant symbols. Much more manageable for learning!"},
    {key:'ponder',text:"Normal mode uses a random 5-glyph sequence built from the spell's four symbols. The keyboard still greys out irrelevant glyphs, but you must watch each cast carefully."},
    {key:'ponder',text:"Hard mode is intense. A 7-glyph sequence. ALL twelve glyphs are active on the keyboard — nothing is greyed out. You are relying entirely on memory and focus. Good luck."},
  ],
  'p2p-duel':[
    {key:'ponder', text:"P2P Duel lets two phones battle each other directly — no server, no account, no internet required (as long as both phones are on the same Wi-Fi). Just tap ⚔ Duel → P2P Duel to get started!"},
    {key:'sylvara',text:"One phone is the Host and one is the Guest. The Host taps 'Host a Duel' — a connection code appears on screen. Share that code with your opponent however you like: copy it, or tap Share to send it via any messaging app."},
    {key:'ponder', text:"The Guest taps 'Join a Duel', pastes the Host's code, and taps 'Generate Answer'. A second code appears — share that one back to the Host. The Host pastes it and taps Connect. That's it — you're linked!"},
    {key:'sylvara',text:"Once connected, each player privately picks their own wizard. No peeking! The duel begins when both players have chosen. You'll see a 'Your Turn!' banner when it's time to act, and a waiting screen while your opponent is casting."},
    {key:'ponder', text:"The 'Different networks' checkbox is for the rare case where the two phones are on completely separate networks — like one on home Wi-Fi and one on mobile data. Ticking it asks a Google server to help the two phones find each other across the internet. That server only ever sees your IP address briefly — it never touches the game itself."},
    {key:'sylvara',text:"Leave that checkbox unticked when both phones are on the same Wi-Fi — it works fine without any outside help, and nothing leaves your local network. Tick it only when you truly need it."},
  ],
  eldrad:[
    {key:'eldrad',text:"I am Eldrin — the Stalwart. My philosophy is endurance. 90 HP, 5 starting mana. My abilities focus entirely on surviving long enough to outlast my foe."},
    {key:'eldrad',text:"Magic Missile is my free attack — about 8 damage per cast, no mana required. Useful for chipping away while I conserve resources for when it truly matters."},
    {key:'eldrad',text:"Shield creates a 60 HP barrier for 10 turns — it costs 5 mana, my entire starting pool, but I can cast it on the very first round. It absorbs damage in my place. Combined with my base HP, I can weather tremendous punishment."},
    {key:'eldrad',text:"Counter costs 2 mana and reflects 20 damage back to whoever strikes me — pair it with Shield and let my opponent injure themselves. Note: if the Shield is lost, Counter is lost with it. Ward protects me from the next status effect for 3 turns."},
    {key:'eldrad',text:"My strength is that I never go down easily. The fight is always on my terms. I wait, I endure, and eventually even the most aggressive foe runs out of mana."},
  ],
  mal:[
    {key:'mal',text:"Pain is power. I start with 7 mana and I intend to spend every drop. Empower is free — cast it before any ability for 50% more damage. No mana cost. No excuse not to use it."},
    {key:'mal',text:"Blood Pact is my centrepiece. I sacrifice 22 HP for 15 mana instantly. Reckless? No. Efficient. Health is just mana you haven't spent yet."},
    {key:'mal',text:"Drain hits for about 20 damage and heals me for 45% of it back. Pair it with Empower for a devastating, self-sustaining burst. I take their health and keep my own."},
    {key:'mal',text:"My weakness is raw HP — just 80. I cannot afford to trade hits carelessly. I strike first, I strike hard, and I never let up. The relentless always win."},
  ],
  sylvara:[
    {key:'sylvara',text:"Hello! I'm Sylvara, and I believe in working with nature rather than against it. 92 HP and 6 starting mana. I prefer patience and control over brute force."},
    {key:'sylvara',text:"Regen is my lifeline — 4 mana restores 40 HP over 10 turns. Combined with my high base HP, I can survive punishment that would flatten most opponents."},
    {key:'sylvara',text:"Entangle has a 75% chance to freeze my foe for 1 to 3 turns. On a lucky cast, that's three free attacks without them being able to respond. Very powerful."},
    {key:'sylvara',text:"Vine Whip deals damage over time for 3 turns, and it's blocked by shields — so it pairs well with Entangle while they're frozen and unable to set up defences."},
    {key:'sylvara',text:"I'm not the hardest hitter in the arena. But I'm still standing when they're not. The forest always reclaims what it's owed."},
  ],
  aurelia:[
    {key:'aurelia',text:"I see three moves ahead. Always. Foresight makes me immune to free attacks and absorbs the next paid spell entirely — at 4 mana, the most efficient defence in the game."},
    {key:'aurelia',text:"Time Drain is subtle but decisive. For 3 mana, my opponent's channels gain 2 less mana for 5 turns. That is stolen resources, compounding every single round."},
    {key:'aurelia',text:"Haste gives me a 25% dodge chance for 3 turns — and I act with greater speed. Combine it with Foresight and I become remarkably difficult to land a hit on."},
    {key:'aurelia',text:"Magic Missile is my free attack. 90 HP, 6 starting mana. I win by denying my opponent the resources and opportunities they need to finish the job."},
    {key:'aurelia',text:"I have already foreseen how this duel ends. I need only wait for you to arrive at the conclusion I have prepared."},
  ],
  gnash:[
    {key:'gnash',text:"GNASH NOT WIZARD. Gnash warrior-mage! Gnash hits. HARD. No fancy shields, no status tricks — Gnash has 105 HP and two very effective fists."},
    {key:'gnash',text:"Feral Strike — free, costs nothing, hits 9 damage. Pierces Counter AND Discharge. Magic reflect tricks? HAH. Gnash hit anyway! No exception for Gnash."},
    {key:'gnash',text:"War Paint — 3 mana, Gnash takes 33% less damage for 5 turns. Then Savage Charge — costs 15 HP, NOT mana — smashes for 32 damage and pierces everything."},
    {key:'gnash',text:"Frenzy — also costs 15 HP. Three rapid strikes, fast fast fast! Gnash also only channel 4 mana — less than most wizards! Fine. Gnash still has HP to spend. HP IS mana to Gnash!"},
    {key:'gnash',text:"Little mage thinks Gnash simple? Gnash simple but Gnash EFFECTIVE. You run out of spells. Gnash never runs out of fists."},
  ],
  cinder:[
    {key:'cinder',text:"You thought the heat would break me? I am the heat. 83 HP, 7 starting mana. I hit hard, I hit fast, and if the fire takes us both — well, I was born in it."},
    {key:'cinder',text:"Fireball rolls 18 to 28 damage. Sometimes barely a singe, sometimes the arena goes up. Roll the dice, fan the flames, and never bet against fire."},
    {key:'cinder',text:"Flame Shield is 3 mana — for 5 turns, anyone who strikes me takes 16 fire damage back. You want to throw punches at me? Go ahead. I want you to."},
    {key:'cinder',text:"Candle is 2 mana. For 3 turns, my opponent catches fire every time they channel. Suddenly the safe move isn't safe anymore. That's when the fun starts."},
    {key:'cinder',text:"Ember is my free attack — about 9 damage. Nothing flashy. I save the spectacle for when it counts. Still smouldering. Still standing."},
  ],
  skadi:[
    {key:'skadi',text:"Patience. That is the first lesson. The cold does not rush. I have 88 HP and 6 mana, and I am content to let the fight come to me."},
    {key:'skadi',text:"Frost Bolt is my free attack — 8 ice damage per cast. Ice Lance costs 4 mana for 28 damage with a 25% freeze chance. Straightforward. Results matter, not spectacle."},
    {key:'skadi',text:"Frost Armor is where I truly shine. 4 mana — 30% damage reduction for 5 turns, and anyone who strikes me takes 4 damage in return. Costlier to attack and harder to hurt."},
    {key:'skadi',text:"Blizzard. 4 mana. Five turns of 5 damage, 2 mana drain per turn, and a 15% freeze chance per turn. It compounds. It accumulates. By turn five, they have no mana and no hope."},
    {key:'skadi',text:"The permafrost claims all things eventually. Even stubborn wizards."},
  ],
  zacharius:[
    {key:'zacharius',text:"I had already won before you cast your first spell. You simply hadn't realised it yet. That is what it means to play the long game. 92 HP, 7 starting mana — and I channel 6 mana per turn, above the usual 5. Every advantage compounds."},
    {key:'zacharius',text:"Galvanize costs 4 mana and stores 16 charge — electrical energy held in reserve. Every joule of energy you waste attacking me, I absorb, shape, and return against you."},
    {key:'zacharius',text:"Chain Lightning costs 8 charge — not mana. After Galvanizing I strike for 24 damage with a 35% chance to arc for 10 more. The storm obeys me. Did you truly believe you wouldn't?"},
    {key:'zacharius',text:"Conductivity costs 2 mana — my opponent takes 35% extra damage from all sources for 3 turns. Stack it with a Lightning Bolt and the mathematics are no longer in your favour."},
    {key:'zacharius',text:"Spark is my free attack. 9 lightning damage. Think of it as priming the field. The outcome was never in doubt."},
  ],
  mary:[
    {key:'mary',text:"I am a healer first, a combatant second. 88 HP and 6 mana. My purpose is to endure and outlast through faith and restoration."},
    {key:'mary',text:"Heal instantly restores 40 HP for 4 mana. Simple and powerful. Combined with my base HP, I can absorb tremendous punishment and keep standing."},
    {key:'mary',text:"Purge removes ALL active debuffs from me for just 2 mana. Silence, Agony, Corruption, Entangle — gone. Every last one. A complete reset."},
    {key:'mary',text:"Radiant is unique — 3 mana for 15 holy damage that bypasses shields and resistances entirely. Against a fortified opponent, it is often the only direct damage I can reliably land."},
    {key:'mary',text:"The light does not yield. Neither do I."},
  ],
  mordant:[
    {key:'mordant',text:"Do not think of me as aggressive. I am patient. Agony costs 3 mana and places a hex — 12 damage every time my foe takes any non-channel action for 5 turns."},
    {key:'mordant',text:"Silence is 2 mana — 45% spell failure for 5 turns. Combined with Agony, my opponent cannot act freely in any direction. Cast a spell? Maybe it fails. Take any action? Take damage."},
    {key:'mordant',text:"Corruption is the slow kill. 3 mana — they gain 2 less mana per channel for 3 turns. Starve them of resources. Let them watch their options narrow to nothing."},
    {key:'mordant',text:"Dark Bolt is my free attack — 8 dark damage. 82 HP, 6 mana. I am not here for a fair fight. The hex is already written. You just haven't felt it yet."},
  ],
  ponder:[
    {key:'ponder',text:"Hi! I'm Ponder — yes, the apprentice. But don't underestimate me! My entire kit is about misdirection and resource theft. I'm far harder to catch than I look."},
    {key:'ponder',text:"Vanish makes me invisible for 3 turns. While invisible, attacks cannot reach me. And more importantly — while invisible, I can use Mana Siphon."},
    {key:'ponder',text:"Mana Siphon is only available while invisible. It steals 4 mana from my opponent — they lose it AND I gain it. That is an 8-point swing in a single action!"},
    {key:'ponder',text:"Blink gives me a 50% dodge chance for 3 turns. Half their attacks just... miss. Combined with Vanish and Siphon, I become very difficult to fight effectively."},
    {key:'ponder',text:"85 HP, 5 mana. Not the strongest. But by the time they catch me, I've already drained half their mana and they don't have enough left to finish the job. Surprise!"},
  ],
  durin:[
    {key:'durin',text:"I am Durin. I have 110 HP. I start with no mana and channel only 4 mana per turn — below the usual 5. Before you worry — I channel frequently. What matters is that when spells come, they barely scratch me."},
    {key:'durin',text:"Stoneskin absorbs 10 damage per hit for up to 30 total HP, lasting 10 turns — all for 3 mana. Against basic attacks, I become nearly impervious."},
    {key:'durin',text:"Stonesoul reduces magical damage by 40% for 5 turns. A Lightning Bolt that would kill a lesser wizard? A minor inconvenience to Durin."},
    {key:'durin',text:"Rockfall drops three boulders — about 9 damage each, all physical. It pierces magical shields and resistances entirely. 4 mana for a powerful, unavoidable attack."},
    {key:'durin',text:"I am slow. I am deliberate. I channel while others waste mana on panicked shields. And when I am ready... the mountain falls."},
  ],
};

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

// ── P2P GAME INTEGRATION ──────────────────────────────────

function p2pMyRoleKey()   { return p2pRole==='host'?'p1':'p2'; }
function p2pTheirRoleKey(){ return p2pRole==='host'?'p2':'p1'; }

function p2pExtractGS(){
  return {
    p1: Object.assign({},gs.p1),
    p2: Object.assign({},gs.p2),
    round: gs.round,
    matchRound, p1MatchWins, p2MatchWins,
  };
}

function p2pApplyGS(state){
  Object.assign(gs.p1, state.p1);
  Object.assign(gs.p2, state.p2);
  gs.round=state.round;
  matchRound=state.matchRound;
  p1MatchWins=state.p1MatchWins;
  p2MatchWins=state.p2MatchWins;
}

function p2pSendTurnEnd(gameOver, winner){
  WizardsP2P.send({
    type: 'turn_end',
    state: p2pExtractGS(),
    action: p2pLastAction,
    gameOver: gameOver||false,
    winner: winner||null,
  });
  p2pLastAction=null;
}

function p2pShowWaiting(sub){
  document.getElementById('p2p-wait-sub').textContent=sub||'Waiting…';
  document.getElementById('p2p-waiting-overlay').classList.add('active');
}

function p2pHideWaiting(){
  document.getElementById('p2p-waiting-overlay').classList.remove('active');
}

function p2pHandleCharSelect(key){
  if(p2pRole==='host'){ p1Key=key; p1Cfg=CHAR_DEFS[key]; }
  else                { p2Key=key; p2Cfg=CHAR_DEFS[key]; }
  p2pMyCharSelected=true;
  WizardsP2P.send({type:'char_select',key});
  const lbl=document.getElementById('char-player-label');
  lbl.textContent='Waiting for opponent…';
  lbl.style.display='';
  if(p2pTheirCharKey!==null){
    if(p2pRole==='host'){ p2Key=p2pTheirCharKey; p2Cfg=CHAR_DEFS[p2pTheirCharKey]; }
    else                { p1Key=p2pTheirCharKey; p1Cfg=CHAR_DEFS[p2pTheirCharKey]; }
    p2pBothCharsReady();
  }
}

function p2pBothCharsReady(){
  document.getElementById('char-player-label').style.display='none';
  twoPlayerMode=true;
  startTwoPlayerMatch();
}

function p2pReset(){
  p2pMode=false; p2pRole=null;
  p2pMyCharSelected=false; p2pTheirCharKey=null;
  p2pLastAction=null; p2pGameOverReceived=false;
}

function p2pCleanup(){
  WizardsP2P.cleanup();
  p2pReset();
}

function p2pOnMessage(msg){
  switch(msg.type){
    case 'char_select':
      p2pTheirCharKey=msg.key;
      if(p2pRole==='host'){ p2Key=msg.key; p2Cfg=CHAR_DEFS[msg.key]; }
      else                { p1Key=msg.key; p1Cfg=CHAR_DEFS[msg.key]; }
      if(p2pMyCharSelected) p2pBothCharsReady();
      break;

    case 'turn_end': {
      if(!battleRunning||gameEnded) break;
      p2pApplyGS(msg.state);
      p2pHideWaiting();
      if(msg.gameOver){
        p2pGameOverReceived=true;
        const won=(msg.winner==='p1');
        gameEnded=false; // allow endGame to run
        endGame(won);
        break;
      }
      const me=p2pMyRoleKey();
      const actionName=p2pActionLabel(msg.action);
      document.getElementById('p2p-wait-sub').textContent='Opponent: '+actionName;
      // Brief toast then start my turn
      setTimeout(()=>{
        if(battleRunning&&!gameEnded) startPlayerTurn(me);
      }, 800);
      break;
    }

    case 'game_over':
      if(gameEnded&&!p2pGameOverReceived) break; // already handled locally
      p2pGameOverReceived=true;
      p1MatchWins=msg.p1MatchWins;
      p2MatchWins=msg.p2MatchWins;
      matchRound=msg.matchRound;
      p2pHideWaiting();
      gameEnded=false;
      endGame(msg.winner==='p1');
      break;

    case 'next_round':
      if(!battleRunning) startNextTwoPlayerRound();
      break;
  }
}

function p2pActionLabel(type){
  const names={
    channel:'channelled mana',
    fire:'cast Inferno',lightning:'cast Lightning',
    ice:'cast Frost Nova',arcane:'cast Arcane Surge',
    dispel:'used Dispel',manaburn:'cast Mana Burn',
  };
  if(!type) return 'acted';
  return names[type]||('cast '+type);
}

function p2pEnterGame(role){
  p2pReset();
  p2pMode=true;
  p2pRole=role;
  WizardsP2P.onMessage=p2pOnMessage;
  WizardsP2P.onClose=(state)=>{
    if(p2pMode||twoPlayerMode){
      p2pHideWaiting();
      document.getElementById('handoff-overlay').classList.remove('active');
      alert('Opponent disconnected ('+state+'). Returning to title.');
      p2pCleanup();
      twoPlayerMode=false; battleRunning=false; gameEnded=true;
      showScreen('title-screen');
    }
  };
  // Show char select with appropriate label
  trainingMode=false; twoPlayerMode=false; twoPlayerPhase=1;
  const lbl=document.getElementById('char-player-label');
  lbl.textContent='Choose Your Wizard (You are Player '+(role==='host'?'1':'2')+')';
  lbl.style.display='';
  showScreen('char-screen');
}

// ── P2P SETUP UI helpers ──────────────────────────────────

function p2pShowPanel(id){
  ['p2p-role-panel','p2p-host-panel','p2p-join-panel'].forEach(pid=>{
    document.getElementById(pid).style.display=(pid===id)?'flex':'none';
  });
}

async function p2pStartHost(){
  p2pShowPanel('p2p-host-panel');
  document.getElementById('p2p-offer-code').value='';
  document.getElementById('p2p-offer-status').textContent='Generating offer…';
  document.getElementById('p2p-offer-actions').style.display='none';
  document.getElementById('p2p-answer-input').value='';
  try {
    const code=await WizardsP2P.host();
    document.getElementById('p2p-offer-code').value=code;
    document.getElementById('p2p-offer-status').textContent='Share this code with your opponent';
    document.getElementById('p2p-offer-actions').style.display='flex';
  } catch(e){
    document.getElementById('p2p-offer-status').textContent='Error: '+e.message;
  }
}

async function p2pStartJoin(){
  p2pShowPanel('p2p-join-panel');
  document.getElementById('p2p-offer-input').value='';
  const rev=document.getElementById('p2p-answer-reveal');
  rev.style.display='none';
}

function p2pCopyText(text, btn){
  navigator.clipboard.writeText(text).then(()=>{
    const orig=btn.textContent;
    btn.textContent='✓ Copied!';
    setTimeout(()=>{ btn.textContent=orig; },1800);
  }).catch(()=>{
    // Fallback: select the textarea
    const ta=document.getElementById('p2p-offer-code')||document.getElementById('p2p-answer-code');
    if(ta){ ta.select(); document.execCommand('copy'); }
  });
}

function p2pShareText(text, title){
  if(navigator.share){
    navigator.share({title, text}).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).catch(()=>{});
    alert('Code copied to clipboard — paste it to your opponent.');
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  // Wire up all buttons immediately — independent of the fetch below
  document.querySelectorAll('.diff-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      diffName=btn.dataset.diff;
      diffMult=diffName==='easy'?1.6:diffName==='hard'?0.55:1.0;
      if(diffName==='normal'||diffName==='hard'){
        aiDifficulty='normal';
        document.querySelectorAll('.ai-btn').forEach(b=>{
          b.classList.toggle('active', b.dataset.ai==='normal');
        });
        const hint=document.getElementById('training-ai-hint');
        if(hint&&trainingAI) hint.textContent='Opponent plays smart combos';
      }
    });
  });
  document.querySelectorAll('.ai-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.ai-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      aiDifficulty=btn.dataset.ai;
      const hint=document.getElementById('training-ai-hint');
      if(hint&&trainingAI) hint.textContent=aiDifficulty==='normal'?'Opponent plays smart combos':'Opponent plays normally';
    });
  });

  const duelOverlay=document.getElementById('duel-overlay');
  document.getElementById('btn-duel').addEventListener('click',()=>{
    duelOverlay.style.display='flex';
  });
  document.getElementById('btn-duel-back').addEventListener('click',()=>{
    duelOverlay.style.display='none';
  });
  document.getElementById('btn-duel-arcade').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    trainingMode=false; twoPlayerMode=false; twoPlayerPhase=1; arcadeMode=true;
    document.getElementById('char-player-label').style.display='none';
    showScreen('char-screen');
  });
  document.getElementById('btn-duel-ironman').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    trainingMode=false; twoPlayerMode=false; twoPlayerPhase=1; arcadeMode=false;
    document.getElementById('char-player-label').style.display='none';
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

  // ── P2P DUEL BUTTON ──
  document.getElementById('btn-duel-p2p').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    p2pShowPanel('p2p-role-panel');
    showScreen('p2p-screen');
  });

  // P2P screen navigation
  document.getElementById('p2p-btn-back').addEventListener('click',()=>{
    WizardsP2P.cleanup();
    showScreen('title-screen');
    duelOverlay.style.display='none';
  });
  document.getElementById('p2p-btn-host').addEventListener('click',()=>{
    WizardsP2P.useStun=document.getElementById('p2p-stun-toggle').checked;
    p2pStartHost();
  });
  document.getElementById('p2p-btn-join').addEventListener('click',()=>{
    WizardsP2P.useStun=document.getElementById('p2p-stun-toggle').checked;
    p2pStartJoin();
  });
  document.getElementById('p2p-host-back').addEventListener('click',()=>{
    WizardsP2P.cleanup();
    p2pShowPanel('p2p-role-panel');
  });
  document.getElementById('p2p-join-back').addEventListener('click',()=>{
    WizardsP2P.cleanup();
    p2pShowPanel('p2p-role-panel');
  });

  // Host: copy / share offer
  document.getElementById('p2p-copy-offer').addEventListener('click',function(){
    p2pCopyText(document.getElementById('p2p-offer-code').value, this);
  });
  document.getElementById('p2p-share-offer').addEventListener('click',()=>{
    p2pShareText(document.getElementById('p2p-offer-code').value, "Wizard's Duel — Join Code");
  });

  // Host: submit answer
  document.getElementById('p2p-submit-answer').addEventListener('click',async()=>{
    const code=document.getElementById('p2p-answer-input').value.trim();
    if(!code){ alert('Paste the answer code first.'); return; }
    const btn=document.getElementById('p2p-submit-answer');
    btn.textContent='Connecting…'; btn.disabled=true;
    try {
      await WizardsP2P.acceptAnswer(code);
      WizardsP2P.onOpen=()=>{ p2pEnterGame('host'); };
    } catch(e){
      alert('Connection failed: '+e.message);
      btn.textContent='⚔ Connect'; btn.disabled=false;
    }
  });

  // Guest: generate answer from host's offer
  document.getElementById('p2p-join-connect').addEventListener('click',async()=>{
    const code=document.getElementById('p2p-offer-input').value.trim();
    if(!code){ alert('Paste the host code first.'); return; }
    const btn=document.getElementById('p2p-join-connect');
    btn.textContent='Generating…'; btn.disabled=true;
    try {
      const answerCode=await WizardsP2P.join(code);
      document.getElementById('p2p-answer-code').value=answerCode;
      const rev=document.getElementById('p2p-answer-reveal');
      rev.style.display='flex';
      WizardsP2P.onOpen=()=>{ p2pEnterGame('guest'); };
      btn.textContent='Generate Answer →'; btn.disabled=false;
    } catch(e){
      alert('Failed to process host code: '+e.message);
      btn.textContent='Generate Answer →'; btn.disabled=false;
    }
  });

  // Guest: copy / share answer
  document.getElementById('p2p-copy-answer').addEventListener('click',function(){
    p2pCopyText(document.getElementById('p2p-answer-code').value, this);
  });
  document.getElementById('p2p-share-answer').addEventListener('click',()=>{
    p2pShareText(document.getElementById('p2p-answer-code').value, "Wizard's Duel — Answer Code");
  });
  document.getElementById('btn-duel-tourney').addEventListener('click',()=>{
    duelOverlay.style.display='none';
    trainingMode=false; twoPlayerMode=false; arcadeMode=false;
    tourneyPickMode=true; tourneyMode=false; watchMode=false;
    tourneyBracket=null; tourneyCurrentMatch=null; tourneyPendingResult=null;
    const lbl=document.getElementById('char-player-label');
    lbl.textContent='Choose Your Wizard';
    lbl.style.display='';
    showScreen('char-screen');
  });
  document.getElementById('btn-tourney-back').addEventListener('click',()=>{
    tourneyMode=false; watchMode=false; tourneyBracket=null;
    tourneyCurrentMatch=null; tourneyPendingResult=null;
    showScreen('title-screen');
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
    document.getElementById('training-ai-hint').textContent='Opponent only channels';
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
    if(tourneyPickMode){
      tourneyPickMode=false;
      document.getElementById('char-player-label').style.display='none';
      duelOverlay.style.display='flex';
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

  document.getElementById('bchannel').addEventListener('click',()=>act('channel'));

  document.getElementById('bcastspell').addEventListener('click',()=>{
    if(!gs.myTurn||gs.busy) return;
    const activeState=twoPlayerMode?gs[gs.turnPlayer]:gs.p1;
    SPELLS.forEach(spell=>{
      const card=document.getElementById('spcard-'+spell.element);
      if(card) card.classList.toggle('disabled', activeState.mana<spell.cost);
    });
    showScreen('spell-screen');
  });

  document.getElementById('sp-cancel').addEventListener('click',()=>{
    showScreen('battle-screen');
  });

  document.getElementById('btn-continue').addEventListener('click',()=>{
    document.getElementById('overlay').classList.remove('active');
    // Tourney live match result
    if(tourneyPendingResult){
      const {round,matchIdx,winnerKey}=tourneyPendingResult;
      tourneyPendingResult=null;
      gameEnded=false; battleRunning=false;
      document.getElementById('btn-continue').textContent='Continue';
      setTourneyMatchWinner(round,matchIdx,winnerKey);
      showTourneyScreen();
      return;
    }
    // Tourney champion overlay → back to title
    if(tourneyBracket&&document.getElementById('ovtitle').textContent.includes('Tournament')){
      tourneyMode=false; watchMode=false; tourneyBracket=null;
      gameEnded=false; battleRunning=false;
      document.getElementById('btn-continue').textContent='Continue';
      showScreen('title-screen');
      return;
    }
    if(twoPlayerMode){
      const isMatchOver=p1MatchWins>=2||p2MatchWins>=2||matchRound>=3;
      if(p2pMode){
        if(isMatchOver){
          // Match over — clean up P2P and go to title
          p2pMode=false; p2pRole=null;
          WizardsP2P.cleanup();
          battleRunning=false; gameEnded=false;
          twoPlayerMode=false; twoPlayerPhase=1;
          document.getElementById('btn-continue').textContent='Continue';
          showScreen('title-screen');
        } else {
          // Notify peer and start next round
          WizardsP2P.send({type:'next_round'});
          startNextTwoPlayerRound();
        }
        return;
      }
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


// ── HEADLESS MATCH SIMULATION ──────────────────────────────
// Runs a complete AI-vs-AI match using the real game engine with
// all visual/DOM calls no-oped. Returns the winning character key.
function simulateMatch(k1, k2) {
  const c1=CHAR_DEFS[k1], c2=CHAR_DEFS[k2];
  if(!c1||!c2) return k1;

  // Save all mutable state the battle engine will modify
  const saved={
    p1Key, p2Key, p1Cfg, p2Cfg, gs,
    battleRunning, gameEnded,
    watchMode, tourneyMode, tourneyCurrentMatch,
    trainingMode, twoPlayerMode, arcadeMode,
    aiTid, headless, headlessWinner,
  };

  // Configure headless battle
  headless=true; headlessWinner=null;
  p1Key=k1; p2Key=k2; p1Cfg=c1; p2Cfg=c2;
  watchMode=true; tourneyMode=false; tourneyCurrentMatch=null;
  trainingMode=false; twoPlayerMode=false; arcadeMode=false;
  aiTid=null;
  newState();
  gameEnded=false; battleRunning=true;

  // p1 acts first — mirrors startWatchTourneyMatch
  (aiDifficulty==='normal'?doAINormal:doAI)('p1');

  // endGame() sets headlessWinner; fall back to HP on timeout
  const winner=headlessWinner||(gs.p1.hp>=gs.p2.hp?k1:k2);

  // Restore pre-simulation state
  ({p1Key, p2Key, p1Cfg, p2Cfg, gs,
    battleRunning, gameEnded,
    watchMode, tourneyMode, tourneyCurrentMatch,
    trainingMode, twoPlayerMode, arcadeMode,
    aiTid, headless, headlessWinner}=saved);

  return winner;
}
  window.addEventListener('resize',()=>{ if(battleRunning) resizeBC(); });

  // Load character data — must complete before a character can be picked
  fetch('characters.json')
    .then(r=>r.json())
    .then(data=>{ CHAR_DEFS=data; p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key]; loadSprites(); })
    .catch(err=>console.error('Failed to load characters.json:', err));
});
