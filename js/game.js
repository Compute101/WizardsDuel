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
];

// ── CHARACTER DEFINITIONS (loaded from characters.json) ───────
let CHAR_DEFS={};
let p1Key='eldrad', p2Key='mal';
let p1Cfg, p2Cfg;

const CHAR_DISPLAY={
  eldrad:{
    stats:[['❤ HP','115'],['🛡 Shield','60 HP / 10T'],['⚡ Counter','20 reflect'],['🔰 Ward','Block next status / 3T']],
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
    stats:[['❤ HP','105'],['🩸 War Paint','33% resist / 5T'],['⚔️ Charge','32 pierce all'],['💢 Frenzy','2× strike, locked 3T']],
    flavour:'Blood and bone. No magic — just fury.'
  },
  emberic:{
    stats:[['❤ HP','83'],['🎱 Fireball','10–26 random fire dmg'],['🛡️ Flame Shield','6–12 fire retaliate / 5T'],['🕯️ Candle','Channel → catch fire / 4T']],
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
    stats:[['❤ HP','82'],['💀 Agony','3 mana → 12 dmg on any non-channel action / 4T'],['🔇 Silence','2 mana → 45% spell failure / 4T'],['☠️ Corruption','3 mana → healing converts to damage / 3T']],
    flavour:'The hex is already written. You just haven\'t felt it yet.'
  },
  ponder:{
    stats:[['❤ HP','85'],['👻 Vanish','Invisible 3T'],['🌀 Siphon','Steal 4 mana'],['💫 Blink','Next hit auto-misses']],
    flavour:"Young but fierce — vanish from sight and plunder your foe's magic."
  }
};

// ── DIFFICULTY ─────────────────────────────────────────────
let diffMult=1.0, diffName='normal';

// ── TOURNAMENT ─────────────────────────────────────────────
let tournamentQueue=[];   // ordered opponent keys; gnash always last
let tournamentIndex=0;    // index of current opponent in queue

// ── STATE ──────────────────────────────────────────────────
let gs={}, puzzleCB=null, aiTid=null;
let bW=0, bH=0;
let mazeRAF=null, mazeTid=null;
let retryCountdownId=null;

// ── 2 PLAYER MODE ─────────────────────────────────────────
let twoPlayerMode=false;
let twoPlayerPhase=1; // 1=p1 picking, 2=p2 picking
let matchRound=0;
let p1MatchWins=0, p2MatchWins=0;

function newState(){
  gs={
    p1:{hp:p1Cfg.hp, maxHp:p1Cfg.hp, mana:p1Cfg.startMana,
        shield:0, shieldHp:0, burn:0, frozen:0, regen:null,
        counter:false, empowered:false, foresight:false, timeDrain:0, resist:0, invisible:0,
        ward:0, vineWhip:0, haste:0, frenzied:0, blink:0, frostArmor:0, blizzard:0, flameShield:0, candle:0, charge:0, conductivity:0, agony:0, agonyDmg:0, silence:0, corruption:0},
    p2:{hp:p2Cfg.hp, maxHp:p2Cfg.hp, mana:p2Cfg.startMana,
        shield:0, shieldHp:0, burn:0, frozen:0, regen:null,
        counter:false, empowered:false, foresight:false, timeDrain:0, resist:0, invisible:0,
        ward:0, vineWhip:0, haste:0, frenzied:0, blink:0, frostArmor:0, blizzard:0, flameShield:0, candle:0, charge:0, conductivity:0, agony:0, agonyDmg:0, silence:0, corruption:0},
    round:1, myTurn:true, busy:false,
    p1anim:'idle', p2anim:'idle',
    parts:[], floats:[], projs:[], beams:[],
    pendingAction:null, skipAITurn:false,
    turnPlayer:'p1', lastAnimEnd:0,
  };
}

// ── SCREENS ────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── TOURNAMENT BRACKET ─────────────────────────────────────
function buildBracket(){
  const track=document.getElementById('bracket-track');
  track.innerHTML='';
  tournamentQueue.forEach((oppKey,i)=>{
    const oppCfg=CHAR_DEFS[oppKey];
    const isFinal=i===tournamentQueue.length-1;
    const col=document.createElement('div');
    col.className='bracket-round';
    col.dataset.round=i;
    if(isFinal) col.classList.add('is-final');
    col.innerHTML=
      '<div class="bracket-rlabel">'+(isFinal?'☆ FINAL ☆':'Round '+(i+1))+'</div>'+
      '<div class="bracket-slot bslot-player"><img src="portraits/'+p1Key+'.png" alt="'+p1Cfg.name+'"></div>'+
      '<div class="bracket-cross">⚔</div>'+
      '<div class="bracket-slot bslot-opp" id="bopp-'+i+'">'+
        '<img src="portraits/'+oppKey+'.png" alt="'+oppCfg.name+'">'+
        '<div class="bslot-name">'+oppCfg.name+'</div>'+
        (isFinal?'<div class="bslot-boss">BOSS</div>':'')+
      '</div>';
    track.appendChild(col);
    if(i<tournamentQueue.length-1){
      const arr=document.createElement('div');
      arr.className='bracket-arrow';
      arr.textContent='▶';
      track.appendChild(arr);
    }
  });
}

function showBracket(animate){
  buildBracket();
  const nextKey=tournamentQueue[tournamentIndex];
  const nextCfg=CHAR_DEFS[nextKey];
  const btn=document.getElementById('bracket-btn');
  btn.textContent=animate?('⚔ Fight '+nextCfg.name+' →'):'⚔ Begin Tournament';
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

  if(animate){
    setTimeout(()=>{
      const activeCol=document.querySelector('#bracket-track .bracket-round.br-active');
      if(activeCol) activeCol.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },400);
  }

  showScreen('tournament-screen');
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
    skadi:drawBG_winter,emberic:drawBG_embers,zacharius:drawBG_arc,mary:drawBG_holy,mordant:drawBG_abyss}[p2Key]||drawBG_moonlight)();
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
      bx.lineTo(ax+(Math.random()-.5)*bW*0.07, ay+bH*0.65*(i/steps));
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
      bx.lineTo(ax2+(Math.random()-.5)*bW*0.05, ay2+bH*0.55*(i/steps));
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
    for(let i=0;i<6;i++){
      const a=t/500+i/6*Math.PI*2, r=sz*(0.72+0.08*Math.sin(t/300+i));
      bx.globalAlpha=0.6+0.3*Math.sin(t/220+i*1.5);
      bx.fillStyle=i%2?'#aaff44':'#88ffcc'; bx.shadowColor='#aaff44'; bx.shadowBlur=6;
      bx.beginPath(); bx.arc(x+Math.cos(a)*r,wy+Math.sin(a)*r*0.5,sz*.032,0,Math.PI*2); bx.fill();
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

function spawnParts(x,y,col,n=16){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=1.5+Math.random()*3.5;
    gs.parts.push({x,y,col,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,sz:2+Math.random()*3,life:1,dec:.022+Math.random()*.03});
  }
}

function tickFloats(){
  gs.floats=gs.floats.filter(f=>f.life>0);
  gs.floats.forEach(f=>{
    f.y-=1.1; f.life-=.016;
    bx.globalAlpha=Math.min(1,f.life*3); bx.fillStyle=f.col;
    bx.font=`bold ${f.sz}px Cinzel,serif`; bx.textAlign='center';
    bx.shadowColor=f.col; bx.shadowBlur=10;
    bx.fillText(f.t,f.x,f.y); bx.shadowBlur=0; bx.globalAlpha=1;
  });
}

function addFloat(x,y,t,col,sz=17){gs.floats.push({x,y,t,col,sz,life:1});}

// ── SPELL PROJECTILES ──────────────────────────────────────
function spawnProj(x1,y1,x2,y2,element,col,cb){
  const speeds={fire:0.055,lightning:0.3,ice:0.065,arcane:0.06,physical:0.09};
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
        const mx=p.x1+dx*i+nx*jitter*(i%2?1:-1)*(0.5+Math.random()*.9);
        const my=p.y1+dy*i+ny*jitter*(i%2?1:-1)*(0.5+Math.random()*.9);
        bx.lineTo(mx,my);
      }
      bx.lineTo(p.x2,p.y2);
      bx.strokeStyle='#ffffff'; bx.lineWidth=2.5;
      bx.shadowColor='#ffee44'; bx.shadowBlur=18;
      bx.globalAlpha=0.8+0.2*Math.random(); bx.stroke();
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
    }
    if(p.progress>=1){ p.done=true; if(p.cb) p.cb(); }
  });
}

// ── BEAM FLASH EFFECTS ─────────────────────────────────────
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
  drawWiz(bW*.22,gy,wsz,p1Cfg.col,true, gs.p1anim,gs.p1.shield,gs.p1.ward,'p1',gs.p1.foresight,gs.p1);
  drawWiz(bW*.78,gy,wsz,p2Cfg.col,false,gs.p2anim,gs.p2.shield,gs.p2.ward,'p2',gs.p2.foresight,gs.p2);
  tickProjs(); tickBeams(); tickParts(); tickFloats();
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
  if(spellId==='warpaint')   return casterState.resist>0||casterState.hp<=(casterCfg.frenzyHpCost||15);
  if(spellId==='vanish')     return casterState.invisible>0;
  if(spellId==='manasiphon') return !casterState.invisible||targetState.mana<=0;
  if(spellId==='ward')       return casterState.ward>0;
  if(spellId==='drain')      return false;
  if(spellId==='vinewhip')   return targetState.vineWhip>0;
  if(spellId==='haste')      return casterState.haste>0;
  if(spellId==='frenzy')     return casterState.frenzied>0||casterState.hp<=(casterCfg.frenzyHpCost||15);
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
  if(spellId==='purge')          return !(casterState.burn>0||casterState.frozen>0||casterState.blizzard>0||casterState.vineWhip>0||casterState.timeDrain>0||casterState.conductivity>0||casterState.candle>0);
  if(spellId==='agony')          return targetState.agony>0;
  if(spellId==='silence')        return targetState.silence>0;
  if(spellId==='corruption')     return targetState.corruption>0;
  return false;
}

// ── PLAYER ACTIONS ─────────────────────────────────────────
function act(type){
  if(!gs.myTurn||gs.busy) return;

  const who=twoPlayerMode?gs.turnPlayer:'p1';
  const whoCfg=who==='p1'?p1Cfg:p2Cfg;
  const whoState=gs[who];
  const oppState=who==='p1'?gs.p2:gs.p1;
  const cx=who==='p1'?bW*.22:bW*.78;
  const tx=who==='p1'?bW*.78:bW*.22;

  // Aurelia haste: AI acts first before the player's action resolves (AI mode only)
  if(!twoPlayerMode&&gs.p2&&gs.p2.haste>0&&!gs.skipAITurn){
    gs.myTurn=false; gs.busy=true;
    gs.pendingAction=type;
    doAI();
    return;
  }

  // Agony: player takes damage for any non-channel action
  if(type!=='channel'&&whoState.agony>0){
    const agonDmg=whoState.agonyDmg||12;
    whoState.hp=Math.max(0,whoState.hp-agonDmg);
    addFloat(cx,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(cx,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }

  if(type==='channel'){
    if(whoState.timeDrain>0){
      whoState.mana=Math.min(MAX_MANA,whoState.mana+2);
      addFloat(cx,bH*.38,'⏳ Drained! +2 Mana','#ffcc44',13);
    } else {
      whoState.mana=Math.min(MAX_MANA,whoState.mana+whoCfg.channelAmt);
      addFloat(cx,bH*.38,'+'+whoCfg.channelAmt+' Mana','#88aaff',13);
    }
    if(whoState.candle>0) triggerCandleBurn(whoState,cx);
    anim(who,'cast',700); endMyTurn(); return;
  }

  // Universal spell (with puzzle)
  const spell=SPELLS.find(s=>s.element===type);
  if(spell){
    if(whoState.mana<spell.cost) return;
    if(whoState.frenzied>0) return;
    if(whoState.silence>0&&Math.random()<0.45){
      addFloat(cx,bH*.33,'🔇 Silenced!','#9944cc',15);
      spawnParts(cx,bH*.38,'#9944cc',10); anim(who,'cast',600);
      endMyTurn(); return;
    }
    gs.busy=true;
    const launchers={
      fire:      launchPatternEcho,
      lightning: launchLightningPattern,
      ice:       launchIcePattern,
      arcane:    launchArcanePattern,
    };
    launchers[type](spell, ok=>{
      if(ok){
        if(whoState.invisible>0){
          whoState.invisible=0;
          addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
        }
        whoState.mana-=spell.cost;
        spawnProj(cx,bH*.38,tx,bH*.38,spell.element,spell.col,()=>{
          castSpell(spell,oppState,tx,bH*.38,who);
          endMyTurn();
        });
      } else {
        addFloat(cx,bH*.33,'Fizzled!','#ff8844',13);
        whoState.mana=Math.max(0,whoState.mana-1);
        endMyTurn();
      }
    });
    return;
  }

  // Character spell (instant)
  const charSpell=whoCfg.spells&&whoCfg.spells.find(s=>s.id===type);
  if(charSpell){
    if(whoState.mana<charSpell.cost) return;
    if(charSpellBlocked(type,whoState,whoCfg,oppState)) return;
    if(charSpell.cost>0&&whoState.silence>0&&Math.random()<0.45){
      addFloat(cx,bH*.33,'🔇 Silenced!','#9944cc',15);
      spawnParts(cx,bH*.38,'#9944cc',10); anim(who,'cast',600);
      endMyTurn(); return;
    }
    resolveCharSpell(type,who);
  }
}

// ── CHARACTER SPELLS (instant) ─────────────────────────────
function resolveCharSpell(spellId,caster){
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
    casterState.shieldHp=casterCfg.shieldMaxHp||60;
    addFloat(cx,bH*.33,'🛡 Shielded! ('+casterState.shieldHp+' HP)','#4af0ff',12);
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
      gs.parts.push({x:cx+(Math.random()-.5)*bH*.05,y:bH*.38,col:'#cc1111',
        vx:(Math.random()-.5),vy:1.5+Math.random()*3,sz:2+Math.random()*2,life:1,dec:.02});
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+(-0.6+Math.random()*1.2), sp=1.5+Math.random()*2.5;
      gs.parts.push({x:cx+(Math.random()-.5)*bH*.04,y:bH*.38,col:'#8844ff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+Math.random()*2,life:1,dec:.02,noGrav:true});
    }
    anim(caster,'cast',700); refreshHUD();
  } else if(spellId==='heal'){
    casterState.regen={remaining:casterCfg.healAmt,turns:10};
    addFloat(cx,bH*.33,'💚 Regenerating!','#44cc88',14);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-0.8+Math.random()*1.6), sp=1+Math.random()*2.5;
      gs.parts.push({x:cx+(Math.random()-.5)*bH*.05,y:bH*.38,col:i%2?'#44ee88':'#88ffcc',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+Math.random()*3,life:1,dec:.014,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='entangle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14);
      anim(caster,'cast',600);
    } else {
      if(Math.random()<0.75){
        targetState.frozen=Math.floor(Math.random()*3)+1;
        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          gs.parts.push({x:tx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
            vx:Math.cos(a+Math.PI)*.9,vy:Math.sin(a+Math.PI)*.9,sz:2+Math.random()*2,life:1,dec:.02});
        }
        spawnParts(tx,bH*.38,'#44cc88',8);
        addFloat(tx,bH*.33,'🌿 Entangled!','#44cc88',13);
      } else {
        for(let i=0;i<8;i++)
          gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:bH*.38-bH*.04,col:'#665522',
            vx:(Math.random()-.5)*1.5,vy:Math.random()*2,sz:2,life:1,dec:.025});
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
    } else if(targetState.haste>0&&Math.random()<0.25){
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
    casterState.hp=Math.max(1,casterState.hp-casterCfg.frenzyHpCost);
    casterState.resist=5;
    addFloat(cx,bH*.33,'🩸 War Paint! -33% dmg',casterCfg.col,12);
    for(let i=0;i<8;i++)
      gs.parts.push({x:cx+(Math.random()-.5)*bH*.05,y:bH*.35,col:'#cc1111',
        vx:(Math.random()-.5)*1.5,vy:1+Math.random()*2.5,sz:2+Math.random()*2,life:1,dec:.025});
    spawnParts(cx,bH*.38,casterCfg.col,10);
    anim(caster,'shield',700);
    refreshHUD();
  } else if(spellId==='charge'){
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    let dmg=Math.round(casterCfg.chargeDmg*casterCfg.dmgMult);
    if(targetState.foresight){
      addFloat(tx,bH*.38-20,'🔮 Foreseen!','#ffcc44',15);
      targetState.foresight=false;
      spawnParts(tx,bH*.38,'#ffcc44',18);
      spawnParts(tx,bH*.38,casterCfg.col,10);
      spawnParts(tx,bH*.38,'#ffffff',6);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else if(targetState.invisible>0){
      addFloat(tx,bH*.38-20,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else if(targetState.blink>0&&Math.random()<0.5){
      addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else {
      // Dust trail along charge path
      for(let d=0;d<5;d++){
        const pct=(d+1)/6;
        gs.parts.push({x:cx+(tx-cx)*pct,y:bH*.38+bH*.01,col:'#aa7722',
          vx:(Math.random()-.5)*2,vy:-1-Math.random()*2,sz:3+Math.random()*3,life:1,dec:.018});
      }
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed;
        dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
    refreshHUD();
    checkWin();
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
    } else if(targetState.haste>0&&Math.random()<0.25){
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
      let drainBase=dmg;
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed; drainBase-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
        const a=-Math.PI/2+(-0.6+Math.random()*1.2),sp=1.5+Math.random()*2.5;
        gs.parts.push({x:cx+(Math.random()-.5)*bH*.04,y:bH*.38,col:'#cc1111',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+Math.random()*2,life:1,dec:.018,noGrav:true});
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else {
      targetState.vineWhip=3;
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        gs.parts.push({x:tx+Math.cos(a)*bH*.07,y:bH*.38+Math.sin(a)*bH*.04,col:'#44cc88',
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+Math.random()*2,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#44cc88',10);
      addFloat(tx,bH*.33,'🌱 Vine Whip! (3T)','#44cc88',13);
      anim(caster,'cast',800);
    }
  } else if(spellId==='haste'){
    casterState.haste=3;
    addFloat(cx,bH*.33,'💨 Haste! (3T)',casterCfg.col,13);
    for(let i=0;i<14;i++){
      const a=-Math.PI/2+(-1.0+Math.random()*2.0),sp=1.5+Math.random()*3;
      gs.parts.push({x:cx,y:bH*.38,col:i%2?casterCfg.col:'#ffffff',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+Math.random()*2.5,life:1,dec:.016,noGrav:true});
    }
    anim(caster,'cast',700);
  } else if(spellId==='frenzy'){
    casterState.hp=Math.max(1,casterState.hp-casterCfg.frenzyHpCost);
    if(casterState.invisible>0){
      casterState.invisible=0;
      addFloat(cx,bH*.33,'👻 Revealed!','#b8a0e8',11);
    }
    casterState.frenzied=4;
    gs.busy=true;
    addFloat(cx,bH*.28,'💢 FRENZY!',casterCfg.col,16);
    spawnParts(cx,bH*.38,casterCfg.col,18);
    doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
    refreshHUD(); checkWin(); if(!battleRunning) return;
    setTimeout(()=>{
      if(!battleRunning) return;
      doFrenzyHit(caster,casterState,casterCfg,targetState,targetCfg,cx,tx);
      refreshHUD(); checkWin(); if(!battleRunning) return;
      if(caster==='p1'||twoPlayerMode){
        endMyTurn();
      } else {
        tickStatuses(casterState);
        setTimeout(finishAI,900);
      }
    },700);
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
    const baseRoll=10+Math.floor(Math.random()*17);
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&Math.random()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
          vx:Math.cos(a+Math.PI)*1.4,vy:Math.sin(a+Math.PI)*1.4-0.5,sz:2+Math.random()*3,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#ff6600',20);
      addFloat(tx,bH*.38,'-'+dmg,'#ff6600',20);
      flash('#ff6600');
      if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
      else             {anim('p2','cast',800); anim('p1','hit',800);}
      refreshHUD(); checkWin();
    }
  } else if(spellId==='flameshield'){
    casterState.flameShield=5;
    addFloat(cx,bH*.33,'🔥 Flame Shield! (5T)',casterCfg.col,13);
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:i%2?'#ff6600':'#ffaa00',
        vx:Math.cos(a)*1.0,vy:Math.sin(a)*1.0-0.5,sz:2+Math.random()*2.5,life:1,dec:.018,noGrav:true});
    }
    spawnParts(cx,bH*.38,'#ff6600',8); spawnParts(cx,bH*.38,'#ffaa00',4);
    anim(caster,'shield',700);
  } else if(spellId==='candle'){
    if(targetState.invisible>0){
      addFloat(tx,bH*.33,'👻 Missed!','#b8a0e8',15);
      spawnParts(tx,bH*.38,'#b8a0e8',12);
      anim(caster,'cast',600);
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.ward>0){
      targetState.ward=0;
      addFloat(tx,bH*.33,'🔰 Warded!','#ffcc44',13);
      spawnParts(tx,bH*.38,'#ffcc44',14); spawnParts(cx,bH*.38,'#ff6600',6);
      anim(caster,'cast',600);
    } else {
      targetState.candle=4;
      for(let i=0;i<12;i++){
        const a=Math.random()*Math.PI*2;
        gs.parts.push({x:tx+(Math.random()-.5)*bH*.05,y:bH*.38,col:i%2?'#ff6600':'#ffaa00',
          vx:Math.cos(a)*0.7,vy:Math.sin(a)*0.7-1.5,sz:1.5+Math.random()*2,life:1,dec:.018,noGrav:true});
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&Math.random()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)     dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0) dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
          vx:Math.cos(a+Math.PI)*1.2,vy:Math.sin(a+Math.PI)*1.2,sz:2+Math.random()*2.5,life:1,dec:.02});
      }
      spawnParts(tx,bH*.38,'#88ddff',18);
      addFloat(tx,bH*.38,'-'+dmg,'#88ddff',20);
      flash('#88ddff');
      if(Math.random()<(casterCfg.iceLanceFreeze||0.35)&&targetState.frozen<=0){
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
    casterState.frostArmor=casterCfg.frostArmorDur||4;
    addFloat(cx,bH*.33,'❄️ Frost Armor! ('+casterState.frostArmor+'T)','#88ddff',13);
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2;
      gs.parts.push({x:cx+Math.cos(a)*bH*.06,y:bH*.38+Math.sin(a)*bH*.04,col:'#88ddff',
        vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-0.5,sz:2+Math.random()*2.5,life:1,dec:.016,noGrav:true});
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
        const a=Math.random()*Math.PI*2, r=bH*(0.05+Math.random()*0.08);
        gs.parts.push({x:tx+Math.cos(a)*r,y:bH*.38+Math.sin(a)*r*0.5,col:'#88ddff',
          vx:Math.cos(a)*0.6+(Math.random()-.5)*0.8,vy:Math.sin(a)*0.6-1-Math.random()*2,
          sz:1.5+Math.random()*2.5,life:1,dec:.012,noGrav:true});
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
        vx:Math.cos(a)*0.9,vy:Math.sin(a)*0.9-0.5,sz:2+Math.random()*2.5,life:1,dec:.018,noGrav:true});
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&Math.random()<0.5){
      addFloat(tx,bH*.33,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc'); anim(caster,'cast',600);
    } else {
      if(targetState.resist>0)       dmg=Math.round(dmg*0.67);
      if(targetState.frostArmor>0)   dmg=Math.round(dmg*0.70);
      if(targetState.conductivity>0) dmg=Math.round(dmg*1.35);
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed; dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
          vx:Math.cos(a+Math.PI)*1.5,vy:Math.sin(a+Math.PI)*1.5,sz:2+Math.random()*2,life:1,dec:.022});
      }
      spawnBeam(cx,bH*.38,tx,bH*.38,casterCfg.col);
      spawnParts(tx,bH*.38,casterCfg.col,18);
      addFloat(tx,bH*.38,'-'+dmg,casterCfg.col,20);
      flash(casterCfg.col);
      // Arc chance
      if(Math.random()<(casterCfg.chainArcChance||0.35)){
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
    } else if(targetState.haste>0&&Math.random()<0.25){
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
        const a=Math.random()*Math.PI*2;
        gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:bH*.38,col:i%2?'#aaff44':'#88ffcc',
          vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8-1.2,sz:1.5+Math.random()*2,life:1,dec:.016,noGrav:true});
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
    } else if(targetState.haste>0&&Math.random()<0.25){
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
    if(casterState.corruption>0){
      casterState.hp=Math.max(0,casterState.hp-healAmt);
      addFloat(cx,bH*.33,'☠️ Corrupted! −'+healAmt,'#9944cc',14);
      spawnParts(cx,bH*.38,'#9944cc',16); flash('#330033');
      anim(caster,'hit',700); refreshHUD(); checkWin();
    } else {
      const actual=Math.min(healAmt, casterState.maxHp-casterState.hp);
      casterState.hp=Math.min(casterState.maxHp, casterState.hp+healAmt);
      addFloat(cx,bH*.33,'💛 +'+actual+' Healed!',casterCfg.col,14);
      for(let i=0;i<16;i++){
        const a=-Math.PI/2+(-0.9+Math.random()*1.8), sp=1+Math.random()*2.5;
        gs.parts.push({x:cx+(Math.random()-.5)*bH*.05,y:bH*.38,col:i%2?'#ffe090':'#fff8c0',
          vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+Math.random()*3,life:1,dec:.014,noGrav:true});
      }
      flash(casterCfg.col);
      anim(caster,'cast',700); refreshHUD();
    }
  } else if(spellId==='purge'){
    const cleared=[];
    if(casterState.burn>0)        {casterState.burn=0;         cleared.push('🔥');}
    if(casterState.frozen>0)      {casterState.frozen=0;       cleared.push('❄️');}
    if(casterState.blizzard>0)    {casterState.blizzard=0;     cleared.push('🌨️');}
    if(casterState.vineWhip>0)    {casterState.vineWhip=0;     cleared.push('🌿');}
    if(casterState.timeDrain>0)   {casterState.timeDrain=0;    cleared.push('⏳');}
    if(casterState.conductivity>0){casterState.conductivity=0; cleared.push('💡');}
    if(casterState.candle>0)      {casterState.candle=0;       cleared.push('🕯️');}
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.33,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      anim(caster,'cast',600);
    } else if(targetState.blink>0&&Math.random()<0.5){
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
    } else if(targetState.haste>0&&Math.random()<0.25){
      addFloat(tx,bH*.38-20,'💨 Dodged!','#ffcc44',15);
      spawnParts(tx,bH*.38,'#ffcc44',12);
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else if(targetState.blink>0&&Math.random()<0.5){
      addFloat(tx,bH*.38-20,'💫 Blinked!','#cc99ff',18);
      spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
      flash('#9988cc');
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    } else {
      const counterTriggered=!isPhysical&&targetState.counter&&targetState.shield>0;
      if(targetState.shield>0){
        const absorbed=Math.min(dmg,targetState.shieldHp);
        targetState.shieldHp-=absorbed;
        dmg-=absorbed;
        if(targetState.shieldHp<=0){
          targetState.shield=0;
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
  }

  if(caster==='p1'||twoPlayerMode){
    endMyTurn(spellId==='counter');
  } else {
    if(spellId!=='counter' && casterState.shield>0){
      casterState.shield--;
      if(casterState.shield<=0) casterState.shieldHp=0;
    }
    tickStatuses(casterState);
    setTimeout(finishAI,900);
  }
}

// ── CAST SPELL ─────────────────────────────────────────────
function castSpell(spell,target,tx,ty,caster){
  const casterCfg=caster==='p1'?p1Cfg:p2Cfg;
  const casterState=caster==='p1'?gs.p1:gs.p2;
  const targetState=target; // gs.p1 or gs.p2 passed directly

  const targetCfg=target===gs.p1?p1Cfg:p2Cfg;
  const oppCfg   =caster==='p1'?p2Cfg:p1Cfg;

  let dmg=Math.round(spell.dmg*casterCfg.dmgMult);
  if(spell.element==='arcane') dmg=Math.round((15+Math.floor(Math.random()*41))*casterCfg.dmgMult);

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
  if(targetState.haste>0&&Math.random()<0.25){
    addFloat(tx,ty,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,ty,'#ffcc44',12);
    if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
    return;
  }

  // Target: Counter (check BEFORE shield breaks)
  const counterTriggered=targetState.counter&&targetState.shield>0;

  // Target: Shield
  if(targetState.shield>0){
    if(spell.element==='lightning'){
      targetState.shield=0;
      targetState.shieldHp=0;
      addFloat(tx,ty-20,'⚡ Pierced!','#ffee44',15);
      spawnParts(tx,ty,'#ffee44',18); spawnParts(tx,ty,'#4af0ff',12); spawnParts(tx,ty,'#ffffff',8);
    } else {
      const absorbed=Math.min(dmg,targetState.shieldHp);
      targetState.shieldHp-=absorbed;
      dmg-=absorbed;
      if(targetState.shieldHp<=0){
        targetState.shield=0;
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
    const a=-Math.PI/2+(-0.75+Math.random()*1.5);
    const sp=2+Math.random()*3.5;
    gs.parts.push({x:tx+(Math.random()-.5)*bH*.05,y:ty,col:i%3?'#ff4400':'#ff9900',
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:2+Math.random()*3,life:1,dec:.026+Math.random()*.02});
  }
  addFloat(tx,ty,'🔥 -'+BURN_DMG,'#ff6622',13);
}

function processRegen(target,tx,ty){
  if(!target.regen) return;
  const healThis=Math.ceil(target.regen.remaining/target.regen.turns);
  target.regen.remaining-=healThis;
  target.regen.turns--;
  if(target.regen.turns<=0) target.regen=null;
  if(target.corruption>0){
    target.hp=Math.max(0,target.hp-healThis);
    for(let i=0;i<8;i++){
      const a=Math.random()*Math.PI*2, sp=0.8+Math.random()*1.5;
      gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:ty,col:'#9944cc',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:1.5+Math.random()*2,life:1,dec:.015,noGrav:true});
    }
    addFloat(tx,ty,'☠️ −'+healThis+' Corrupted!','#9944cc',12);
  } else {
    target.hp=Math.min(target.maxHp,target.hp+healThis);
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+(-0.55+Math.random()*1.1), sp=0.8+Math.random()*1.8;
      gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:ty,col:i%2?'#44ee88':'#88ffcc',
        vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.5,sz:1.5+Math.random()*2.5,life:1,dec:.011+Math.random()*.01,noGrav:true});
    }
    addFloat(tx,ty,'+'+healThis+' 💚','#44cc88',12);
  }
}

function processVineWhip(target,tx,ty){
  if(!target.vineWhip||target.vineWhip<=0) return;
  let dmg=7;
  target.vineWhip--;
  if(target.shield>0){
    const absorbed=Math.min(dmg,target.shieldHp);
    target.shieldHp-=absorbed; dmg-=absorbed;
    if(target.shieldHp<=0){
      target.shield=0;
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
      const a=Math.random()*Math.PI*2;
      gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:ty,col:i%2?'#44cc88':'#22aa66',
        vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2-0.5,sz:2+Math.random()*2.5,life:1,dec:.02});
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
    const a=Math.random()*Math.PI*2;
    gs.parts.push({x:tx+(Math.random()-.5)*bH*.06,y:ty,col:'#88ddff',
      vx:Math.cos(a)*0.6,vy:Math.sin(a)*0.6-1.8,sz:1.5+Math.random()*2,life:1,dec:.016,noGrav:true});
  }
  addFloat(tx,ty,'❄️ -5','#88ddff',13);
  if(drained>0) addFloat(tx,ty+22,'−'+drained+' Mana','#88ddff',11);
  if(Math.random()<0.15&&target.frozen<=0) target.frozen=1;
}

const STATUS_TIMERS=['timeDrain','resist','ward','haste','frenzied','frostArmor','flameShield','candle','conductivity','agony','silence','corruption','blink'];
function tickStatuses(state){
  STATUS_TIMERS.forEach(k=>{ if(state[k]>0) state[k]--; });
}

function triggerCandleBurn(state,cx){
  state.burn=BURN_ROUNDS;
  addFloat(cx,bH*.38,'🕯️ Candle!','#ff6622',12);
  for(let i=0;i<8;i++){
    const a=-Math.PI/2+(-0.7+Math.random()*1.4),sp=1.5+Math.random()*2.5;
    gs.parts.push({x:cx+(Math.random()-.5)*bH*.04,y:bH*.38,
      col:i%2?'#ff6622':'#ff9900',vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      sz:1.5+Math.random()*2.5,life:1,dec:.02,noGrav:true});
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
  targetState.charge=0;
  casterState.hp=Math.max(0,casterState.hp-dischargeDmg);
  addFloat(casterX,bH*.33,'⚡ Discharge! −'+dischargeDmg,'#aaff44',14);
  spawnParts(casterX,bH*.38,'#aaff44',14);
  spawnBeam(targetX,bH*.38,casterX,bH*.38,'#aaff44');
  flash('#aaff44');
}

function applyFlameShieldRetaliation(casterState,cx){
  const fireDmg=6+Math.floor(Math.random()*7);
  casterState.hp=Math.max(0,casterState.hp-fireDmg);
  addFloat(cx,bH*.33,'🔥 Flame! −'+fireDmg,'#ff6622',12);
  spawnParts(cx,bH*.38,'#ff6600',8);
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
  if(targetState.haste>0&&Math.random()<0.25){
    addFloat(tx,bH*.38,'💨 Dodged!','#ffcc44',15);
    spawnParts(tx,bH*.38,'#ffcc44',10);
    return;
  }
  if(targetState.blink>0&&Math.random()<0.5){
    addFloat(tx,bH*.38,'💫 Blinked!','#cc99ff',18);
    spawnParts(tx,bH*.38,'#9988cc',22); spawnParts(tx,bH*.38,'#ffffff',8);
    flash('#9988cc');
    return;
  }
  if(targetState.shield>0){
    const absorbed=Math.min(dmg,targetState.shieldHp);
    targetState.shieldHp-=absorbed; dmg-=absorbed;
    if(targetState.shieldHp<=0){
      targetState.shield=0;
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

function anim(who,state,ms){
  gs[who+'anim']=state;
  gs.lastAnimEnd=Math.max(gs.lastAnimEnd||0, Date.now()+ms);
  setTimeout(()=>{if(gs[who+'anim']!=='death') gs[who+'anim']='idle';},ms);
}

function endMyTurn(skipShieldDecrement=false){
  gs.myTurn=false; gs.busy=false;
  if(twoPlayerMode){
    const who=gs.turnPlayer;
    const whoState=gs[who];
    if(!skipShieldDecrement&&whoState.shield>0){
      whoState.shield--;
      if(whoState.shield<=0) whoState.shieldHp=0;
    }
    tickStatuses(whoState);
    gs.round++;
    const nextPlayer=who==='p1'?'p2':'p1';
    if(!gameEnded){
      const delay=Math.max(0,(gs.lastAnimEnd||0)-Date.now())+600;
      setTimeout(()=>{
        if(!gameEnded) showHandoffOverlay(nextPlayer,()=>startPlayerTurn(nextPlayer));
      }, delay);
    }
  } else {
    if(!skipShieldDecrement&&gs.p1.shield>0){
      gs.p1.shield--;
      if(gs.p1.shield<=0) gs.p1.shieldHp=0;
    }
    tickStatuses(gs.p1);
    gs.round++;
    if(aiTid) clearTimeout(aiTid);
    aiTid=setTimeout(doAI, gs.p2&&gs.p2.haste>0 ? 400 : 1400);
  }
}

// ── AI TURN ────────────────────────────────────────────────
function doAI(){
  if(!gs||!battleRunning||gameEnded) return;

  // AI already acted this round (haste interrupt) — skip to end-of-round cleanup
  if(gs.skipAITurn){
    gs.skipAITurn=false;
    finishAI();
    return;
  }

  // Decrement invisible counters once per round (at the round boundary)
  if(gs.p1.invisible>0) gs.p1.invisible--;
  if(gs.p2.invisible>0) gs.p2.invisible--;

  // Vine whip tick for AI
  if(gs.p2.vineWhip>0){
    processVineWhip(gs.p2,bW*.78,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Blizzard tick for AI
  if(gs.p2.blizzard>0){
    processBlizzard(gs.p2,bW*.78,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Burn tick for AI
  if(gs.p2.burn>0){
    processBurn(gs.p2,bW*.78,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Regen tick for AI
  if(gs.p2.regen) processRegen(gs.p2,bW*.78,bH*.38);

  // Passive mana regen
  gs.p2.mana=Math.min(MAX_MANA,gs.p2.mana+1);

  // Frozen: skip turn
  if(gs.p2.frozen>0){
    gs.p2.frozen--;
    addFloat(bW*.78,bH*.38,'❄️ Frozen!','#88ddff',13);
    setTimeout(finishAI,1200);
    return;
  }

  const ai=gs.p2;
  const allSpells=[...SPELLS,...(p2Cfg.spells||[])];

  // Build available list: affordable, not blocked, respecting aiHint
  // Don't use attack spells if player is invisible
  const available=allSpells.filter(s=>{
    if(ai.mana<s.cost) return false;
    if(s.id&&charSpellBlocked(s.id,ai,p2Cfg,gs.p1)) return false;
    if(s.aiHint==='mana_restore'&&ai.mana>=10) return false;
    if(s.aiHint==='mana_steal'&&!ai.invisible) return false;
    if(s.aiHint==='drain'&&ai.hp>ai.maxHp*0.75) return false;
    if(ai.frenzied>0&&s.element) return false;
    if(gs.p1.invisible>0&&(s.element&&!s.area||s.id==='basicattack'||s.id==='charge'||s.id==='entangle'||s.id==='timedrain'||s.id==='drain'||s.id==='vinewhip'||s.id==='agony'||s.id==='silence'||s.id==='corruption')) return false;
    return true;
  });

  const charSpells=available.filter(s=>s.id);
  const universalSpells=available.filter(s=>s.element);

  // Select a spell using heuristics
  let chosen=null;
  // Mordant: channel when under agony; otherwise favour hexes
  if(p2Key==='mordant'&&ai.agony>0) chosen=null;
  else if(p2Key==='mordant'&&!chosen){
    const hexSpells=charSpells.filter(s=>['agony','silence','corruption'].includes(s.id));
    if(hexSpells.length>0&&Math.random()<0.65) chosen=hexSpells[Math.floor(Math.random()*hexSpells.length)];
  }
  // Mary: purge debuffs first, heal when hurt
  if(p2Key==='mary'){
    const hasDebuff=ai.burn>0||ai.frozen>0||ai.blizzard>0||ai.vineWhip>0||ai.timeDrain>0||ai.conductivity>0||ai.candle>0;
    const canPurge=charSpells.find(s=>s.id==='purge');
    const canHeal=charSpells.find(s=>s.id==='divineheal');
    if(hasDebuff&&canPurge)                        chosen=canPurge;
    else if(ai.hp<ai.maxHp*0.60&&canHeal)          chosen=canHeal;
  }
  // Zacharius: prioritise galvanize to build charge, spend it with chain lightning
  if(p2Key==='zacharius'){
    const chainReady=charSpells.find(s=>s.id==='chainlightning');
    const canGalvanize=charSpells.find(s=>s.id==='galvanize');
    if(chainReady&&ai.charge>=(p2Cfg.chainLightningChargeCost||8)){
      chosen=chainReady;
    } else if(canGalvanize&&ai.charge<(p2Cfg.chainLightningChargeCost||8)){
      chosen=canGalvanize;
    }
  }
  if(!chosen&&available.length>0){
    if(charSpells.length>0&&Math.random()<0.40){
      chosen=charSpells[Math.floor(Math.random()*charSpells.length)];
    } else if(universalSpells.length>0){
      if(gs.p1.shield>0&&universalSpells.find(s=>s.element==='lightning')){
        chosen=universalSpells.find(s=>s.element==='lightning');
      } else if(!gs.p1.shield&&universalSpells.find(s=>s.element==='fire')){
        chosen=universalSpells.find(s=>s.element==='fire');
      } else if(gs.p1.mana>=3&&universalSpells.find(s=>s.element==='ice')){
        chosen=universalSpells.find(s=>s.element==='ice');
      } else {
        chosen=universalSpells[Math.floor(Math.random()*universalSpells.length)];
      }
    } else {
      chosen=charSpells[Math.floor(Math.random()*charSpells.length)];
    }
  }

  if(!chosen){
    // Channel
    if(ai.timeDrain>0){
      ai.mana=Math.min(MAX_MANA,ai.mana+2);
      addFloat(bW*.78,bH*.38,'⏳ Drained! +2 Mana','#ffcc44',13);
    } else {
      ai.mana=Math.min(MAX_MANA,ai.mana+p2Cfg.channelAmt);
      addFloat(bW*.78,bH*.38,'+'+p2Cfg.channelAmt+' Mana','#ff8888',13);
    }
    if(ai.candle>0) triggerCandleBurn(ai,bW*.78);
    anim('p2','cast',700);
    if(ai.shield>0){
      ai.shield--;
      if(ai.shield<=0) ai.shieldHp=0;
    }
    tickStatuses(ai);
    finishAI();
    return;
  }

  // Agony: AI takes damage for any non-channel action
  if(ai.agony>0){
    const agonDmg=ai.agonyDmg||12;
    ai.hp=Math.max(0,ai.hp-agonDmg);
    addFloat(bW*.78,bH*.38,'💀 Agony! −'+agonDmg,'#9944cc',14);
    spawnParts(bW*.78,bH*.38,'#9944cc',12); flash('#330033');
    checkWin(); if(!battleRunning) return;
  }

  // Silence: 45% chance mana-cost spells fizzle
  if(chosen.id&&chosen.cost>0&&ai.silence>0&&Math.random()<0.45){
    addFloat(bW*.78,bH*.33,'🔇 Silenced!','#9944cc',15);
    spawnParts(bW*.78,bH*.38,'#9944cc',10); anim('p2','cast',600);
    tickStatuses(ai); finishAI(); return;
  }
  if(!chosen.id&&ai.silence>0&&Math.random()<0.45){
    addFloat(bW*.78,bH*.33,'🔇 Silenced!','#9944cc',15);
    spawnParts(bW*.78,bH*.38,'#9944cc',10); anim('p2','cast',600);
    ai.mana=Math.max(0,ai.mana-1); tickStatuses(ai); finishAI(); return;
  }

  if(chosen.id){
    // Character spell (instant)
    resolveCharSpell(chosen.id,'p2');
    return;
  }

  // Universal spell
  addFloat(bW*.78,bH*.26,chosen.icon+' '+chosen.name+'!',chosen.col,12);
  anim('p2','cast',800);
  setTimeout(()=>{
    if(!battleRunning) return;
    tickStatuses(ai);
    if(Math.random()<0.8){
      ai.mana-=chosen.cost;
      spawnProj(bW*.78,bH*.38,bW*.22,bH*.38,chosen.element,chosen.col,()=>{
        if(!battleRunning) return;
        castSpell(chosen,gs.p1,bW*.22,bH*.38,'p2');
        finishAI();
      });
    } else {
      addFloat(bW*.78,bH*.33,'Fizzled!','#ff8844',12);
      ai.mana=Math.max(0,ai.mana-1);
      finishAI();
    }
  },700);
}

function finishAI(){
  if(!battleRunning||gameEnded) return;
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

  // Frozen: auto-skip player turn
  if(gs.p1.frozen>0){
    gs.p1.frozen--;
    addFloat(bW*.22,bH*.38,'❄️ Frozen!','#88ddff',13);
    setTimeout(()=>{ gs.round++; if(aiTid) clearTimeout(aiTid); aiTid=setTimeout(doAI,1200); },1200);
    return;
  }

  gs.myTurn=true; gs.busy=false;
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
    const taunt=p2Cfg.taunts[Math.floor(Math.random()*p2Cfg.taunts.length)];
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
  if(gs.p1.hp<=0) endGame(false);
  else if(gs.p2.hp<=0) endGame(true);
}

function endGame(won){
  if(gameEnded) return;
  gameEnded=true;
  gs.myTurn=false; gs.busy=true;
  gs[won?'p2anim':'p1anim']='death';
  setTimeout(()=>{
    if(twoPlayerMode){
      battleRunning=false;
      if(won) p1MatchWins++; else p2MatchWins++;
      const winnerCfg=won?p1Cfg:p2Cfg;
      const winnerNum=won?1:2;
      const isMatchOver=p1MatchWins>=2||p2MatchWins>=2||matchRound>=3;
      const continueBtn=document.getElementById('btn-continue');
      document.getElementById('ovico').textContent=isMatchOver?'🏆':'⚔️';
      document.getElementById('ovtitle').textContent=
        isMatchOver?'Player '+winnerNum+' Wins the Match!':'Player '+winnerNum+' Wins Round '+matchRound+'!';
      document.getElementById('ovtitle').style.color=winnerCfg.col;
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
      document.getElementById('ovtitle').textContent='Tournament Champion!';
      document.getElementById('ovtitle').style.color='#f0cc6a';
      document.getElementById('ovdesc').textContent='You have defeated every wizard and claimed the tournament!';
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

// ── PUZZLE: PATTERN ECHO (Fire) ────────────────────────────
function launchPatternEcho(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Ember Rune Pattern';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  const TILES=[
    {col:'#cc3300', lit:'#ff6622', sym:'△'},
    {col:'#991100', lit:'#ff3311', sym:'◆'},
    {col:'#aa7700', lit:'#ffcc00', sym:'◯'},
    {col:'#880000', lit:'#cc2200', sym:'✦'},
  ];
  const TS=108, GAP=8, PAD=12;
  const cw=PAD*2+TS*2+GAP, ch=PAD*2+TS*2+GAP+20;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const tPos=[
    {x:PAD,y:PAD+20},{x:PAD+TS+GAP,y:PAD+20},
    {x:PAD,y:PAD+20+TS+GAP},{x:PAD+TS+GAP,y:PAD+20+TS+GAP},
  ];

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=Array.from({length:SEQ_LEN},()=>Math.floor(Math.random()*4));
  const playerSeq=[];
  let phase='watch', watchStep=0, litTile=-1;
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  const sparks=Array.from({length:22},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    spd:0.25+Math.random()*0.5, sz:0.8+Math.random()*1.8,
    ph:Math.random()*Math.PI*2,
    col:Math.random()<0.5?'#ff6622':'#ffcc00',
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

  function showNext(){
    if(done) return;
    if(watchStep>=seq.length){ phase='input'; timerEl.textContent=timeLeft; startTimer(); return; }
    litTile=seq[watchStep++];
    setTimeout(()=>{ litTile=-1; setTimeout(showNext,220); },580);
  }
  setTimeout(showNext,500);

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    for(let i=0;i<4;i++){
      const tp=tPos[i];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        playerSeq.push(i);
        const idx=playerSeq.length-1;
        if(playerSeq[idx]!==seq[idx]){finish(false); return;}
        if(playerSeq.length===seq.length){finish(true);}
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  function draw(){
    const t=Date.now();
    const bg=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*.7);
    bg.addColorStop(0,'#2a0800'); bg.addColorStop(0.6,'#140300'); bg.addColorStop(1,'#050000');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    mx.save();
    sparks.forEach(s=>{
      s.y-=s.spd; if(s.y<-4){s.y=ch+4; s.x=Math.random()*cw;}
      mx.globalAlpha=0.1+0.3*Math.abs(Math.sin(t/700+s.ph));
      mx.fillStyle=s.col; mx.shadowColor=s.col; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.sz,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    mx.fillStyle=phase==='watch'?'#ffcc00':'#ff8844';
    mx.font='bold 10px Cinzel,serif'; mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText(
      phase==='watch'?`Memorise: ${watchStep}/${seq.length}`:`Repeat: ${playerSeq.length}/${seq.length}`,
      cw/2, 4
    );

    for(let i=0;i<4;i++){
      const tp=tPos[i], tile=TILES[i], lit=(litTile===i);
      mx.save();
      mx.shadowColor=tile.col; mx.shadowBlur=lit?28:5;
      const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,4,tp.x+TS/2,tp.y+TS/2,TS*.6);
      tg.addColorStop(0,lit?tile.lit:tile.col);
      tg.addColorStop(1,lit?tile.col:'#1a0400');
      mx.fillStyle=tg;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.fill();
      mx.strokeStyle=lit?tile.lit:tile.col+'88'; mx.lineWidth=lit?2.5:1.5;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.stroke();
      mx.shadowBlur=0;
      mx.fillStyle=lit?'#fff':tile.lit+'cc';
      mx.font=`bold ${TS*.42}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText(tile.sym,tp.x+TS/2,tp.y+TS/2);
      mx.restore();
    }

    const dotY=ch-7, dsp=14, ds=cw/2-(seq.length-1)*dsp/2;
    for(let i=0;i<seq.length;i++){
      mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
      if(i<playerSeq.length){ mx.fillStyle='#ffcc00'; mx.shadowColor='#ffcc00'; mx.shadowBlur=6; }
      else { mx.fillStyle='rgba(255,204,0,0.2)'; mx.shadowBlur=0; }
      mx.fill(); mx.shadowBlur=0;
    }
  }

  function frame(){ if(done) return; draw(); mazeRAF=requestAnimationFrame(frame); }
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: LIGHTNING PATTERN ─────────────────────────────
function launchLightningPattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Stormrune Sequence';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  const TILES=[
    {col:'#1a2240', lit:'#44aaff', sym:'◆'},
    {col:'#332800', lit:'#ffee44', sym:'△'},
    {col:'#102030', lit:'#88ddff', sym:'◯'},
    {col:'#221800', lit:'#ffcc00', sym:'✦'},
  ];
  const TS=108, GAP=8, PAD=12;
  const cw=PAD*2+TS*2+GAP, ch=PAD*2+TS*2+GAP+20;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const tPos=[
    {x:PAD,y:PAD+20},{x:PAD+TS+GAP,y:PAD+20},
    {x:PAD,y:PAD+20+TS+GAP},{x:PAD+TS+GAP,y:PAD+20+TS+GAP},
  ];

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=Array.from({length:SEQ_LEN},()=>Math.floor(Math.random()*4));
  const playerSeq=[];
  let phase='watch', watchStep=0, litTile=-1;
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  const sparks=Array.from({length:22},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    spd:0.25+Math.random()*0.5, sz:0.8+Math.random()*1.8,
    ph:Math.random()*Math.PI*2,
    col:Math.random()<0.5?'#44aaff':'#ffee44',
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

  function showNext(){
    if(done) return;
    if(watchStep>=seq.length){ phase='input'; timerEl.textContent=timeLeft; startTimer(); return; }
    litTile=seq[watchStep++];
    setTimeout(()=>{ litTile=-1; setTimeout(showNext,220); },580);
  }
  setTimeout(showNext,500);

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    for(let i=0;i<4;i++){
      const tp=tPos[i];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        playerSeq.push(i);
        const idx=playerSeq.length-1;
        if(playerSeq[idx]!==seq[idx]){finish(false); return;}
        if(playerSeq.length===seq.length){finish(true);}
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  function draw(){
    const t=Date.now();
    const bg=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*.7);
    bg.addColorStop(0,'#060c1a'); bg.addColorStop(0.6,'#020608'); bg.addColorStop(1,'#000204');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    mx.save();
    sparks.forEach(s=>{
      s.y-=s.spd; if(s.y<-4){s.y=ch+4; s.x=Math.random()*cw;}
      mx.globalAlpha=0.1+0.3*Math.abs(Math.sin(t/700+s.ph));
      mx.fillStyle=s.col; mx.shadowColor=s.col; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.sz,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    mx.fillStyle=phase==='watch'?'#88ddff':'#ffee44';
    mx.font='bold 10px Cinzel,serif'; mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText(
      phase==='watch'?`Memorise: ${watchStep}/${seq.length}`:`Repeat: ${playerSeq.length}/${seq.length}`,
      cw/2, 4
    );

    for(let i=0;i<4;i++){
      const tp=tPos[i], tile=TILES[i], lit=(litTile===i);
      mx.save();
      mx.shadowColor=tile.col; mx.shadowBlur=lit?28:5;
      const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,4,tp.x+TS/2,tp.y+TS/2,TS*.6);
      tg.addColorStop(0,lit?tile.lit:tile.col);
      tg.addColorStop(1,lit?tile.col:'#010408');
      mx.fillStyle=tg;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.fill();
      mx.strokeStyle=lit?tile.lit:tile.col+'88'; mx.lineWidth=lit?2.5:1.5;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.stroke();
      mx.shadowBlur=0;
      mx.fillStyle=lit?'#fff':tile.lit+'cc';
      mx.font=`bold ${TS*.42}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText(tile.sym,tp.x+TS/2,tp.y+TS/2);
      mx.restore();
    }

    const dotY=ch-7, dsp=14, ds=cw/2-(seq.length-1)*dsp/2;
    for(let i=0;i<seq.length;i++){
      mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
      if(i<playerSeq.length){ mx.fillStyle='#88ddff'; mx.shadowColor='#88ddff'; mx.shadowBlur=6; }
      else { mx.fillStyle='rgba(136,221,255,0.2)'; mx.shadowBlur=0; }
      mx.fill(); mx.shadowBlur=0;
    }
  }

  function frame(){ if(done) return; draw(); mazeRAF=requestAnimationFrame(frame); }
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ICE PATTERN ───────────────────────────────────
function launchIcePattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Frostbind Sequence';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  const TILES=[
    {col:'#0a2030', lit:'#88ddff', sym:'△'},
    {col:'#062028', lit:'#44ccee', sym:'◆'},
    {col:'#152535', lit:'#aaeeff', sym:'◯'},
    {col:'#0e1e2c', lit:'#66bbdd', sym:'✦'},
  ];
  const TS=108, GAP=8, PAD=12;
  const cw=PAD*2+TS*2+GAP, ch=PAD*2+TS*2+GAP+20;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const tPos=[
    {x:PAD,y:PAD+20},{x:PAD+TS+GAP,y:PAD+20},
    {x:PAD,y:PAD+20+TS+GAP},{x:PAD+TS+GAP,y:PAD+20+TS+GAP},
  ];

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=Array.from({length:SEQ_LEN},()=>Math.floor(Math.random()*4));
  const playerSeq=[];
  let phase='watch', watchStep=0, litTile=-1;
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  const sparks=Array.from({length:22},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    spd:0.15+Math.random()*0.3, sz:0.8+Math.random()*1.8,
    ph:Math.random()*Math.PI*2,
    col:Math.random()<0.5?'#88ddff':'#ccf4ff',
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

  function showNext(){
    if(done) return;
    if(watchStep>=seq.length){ phase='input'; timerEl.textContent=timeLeft; startTimer(); return; }
    litTile=seq[watchStep++];
    setTimeout(()=>{ litTile=-1; setTimeout(showNext,220); },580);
  }
  setTimeout(showNext,500);

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    for(let i=0;i<4;i++){
      const tp=tPos[i];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        playerSeq.push(i);
        const idx=playerSeq.length-1;
        if(playerSeq[idx]!==seq[idx]){finish(false); return;}
        if(playerSeq.length===seq.length){finish(true);}
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  function draw(){
    const t=Date.now();
    const bg=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*.7);
    bg.addColorStop(0,'#051018'); bg.addColorStop(0.6,'#02080e'); bg.addColorStop(1,'#010406');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    mx.save();
    sparks.forEach(s=>{
      s.y+=s.spd; if(s.y>ch+4){s.y=-4; s.x=Math.random()*cw;}
      mx.globalAlpha=0.1+0.3*Math.abs(Math.sin(t/900+s.ph));
      mx.fillStyle=s.col; mx.shadowColor=s.col; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.sz,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    mx.fillStyle=phase==='watch'?'#aaeeff':'#88ddff';
    mx.font='bold 10px Cinzel,serif'; mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText(
      phase==='watch'?`Memorise: ${watchStep}/${seq.length}`:`Repeat: ${playerSeq.length}/${seq.length}`,
      cw/2, 4
    );

    for(let i=0;i<4;i++){
      const tp=tPos[i], tile=TILES[i], lit=(litTile===i);
      mx.save();
      mx.shadowColor=tile.col; mx.shadowBlur=lit?28:5;
      const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,4,tp.x+TS/2,tp.y+TS/2,TS*.6);
      tg.addColorStop(0,lit?tile.lit:tile.col);
      tg.addColorStop(1,lit?tile.col:'#010810');
      mx.fillStyle=tg;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.fill();
      mx.strokeStyle=lit?tile.lit:tile.col+'88'; mx.lineWidth=lit?2.5:1.5;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.stroke();
      mx.shadowBlur=0;
      mx.fillStyle=lit?'#fff':tile.lit+'cc';
      mx.font=`bold ${TS*.42}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText(tile.sym,tp.x+TS/2,tp.y+TS/2);
      mx.restore();
    }

    const dotY=ch-7, dsp=14, ds=cw/2-(seq.length-1)*dsp/2;
    for(let i=0;i<seq.length;i++){
      mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
      if(i<playerSeq.length){ mx.fillStyle='#88ddff'; mx.shadowColor='#88ddff'; mx.shadowBlur=6; }
      else { mx.fillStyle='rgba(136,221,255,0.2)'; mx.shadowBlur=0; }
      mx.fill(); mx.shadowBlur=0;
    }
  }

  function frame(){ if(done) return; draw(); mazeRAF=requestAnimationFrame(frame); }
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ARCANE PATTERN ────────────────────────────────
function launchArcanePattern(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Arcane Sigil Sequence';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  const TILES=[
    {col:'#2a0044', lit:'#cc44ff', sym:'◆'},
    {col:'#1a0030', lit:'#aa22ff', sym:'△'},
    {col:'#330028', lit:'#ff44cc', sym:'◯'},
    {col:'#1c0038', lit:'#8833ff', sym:'✦'},
  ];
  const TS=108, GAP=8, PAD=12;
  const cw=PAD*2+TS*2+GAP, ch=PAD*2+TS*2+GAP+20;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const tPos=[
    {x:PAD,y:PAD+20},{x:PAD+TS+GAP,y:PAD+20},
    {x:PAD,y:PAD+20+TS+GAP},{x:PAD+TS+GAP,y:PAD+20+TS+GAP},
  ];

  const SEQ_LEN=diffName==='easy'?4:diffName==='hard'?7:5;
  const seq=Array.from({length:SEQ_LEN},()=>Math.floor(Math.random()*4));
  const playerSeq=[];
  let phase='watch', watchStep=0, litTile=-1;
  let timeLeft=Math.round(20*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent='—'; timerEl.classList.remove('urgent');

  const sparks=Array.from({length:22},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    spd:0.2+Math.random()*0.45, sz:0.8+Math.random()*1.8,
    ph:Math.random()*Math.PI*2,
    col:Math.random()<0.5?'#cc44ff':'#ff44cc',
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

  function showNext(){
    if(done) return;
    if(watchStep>=seq.length){ phase='input'; timerEl.textContent=timeLeft; startTimer(); return; }
    litTile=seq[watchStep++];
    setTimeout(()=>{ litTile=-1; setTimeout(showNext,220); },580);
  }
  setTimeout(showNext,500);

  function onPointer(e){
    if(done||phase!=='input') return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    for(let i=0;i<4;i++){
      const tp=tPos[i];
      if(px>=tp.x&&px<tp.x+TS&&py>=tp.y&&py<tp.y+TS){
        playerSeq.push(i);
        const idx=playerSeq.length-1;
        if(playerSeq[idx]!==seq[idx]){finish(false); return;}
        if(playerSeq.length===seq.length){finish(true);}
        return;
      }
    }
  }
  mc.addEventListener('pointerdown',onPointer);

  function cleanup(){
    mc.removeEventListener('pointerdown',onPointer);
    setDpadVisible(true);
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  function draw(){
    const t=Date.now();
    const bg=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*.7);
    bg.addColorStop(0,'#0e0018'); bg.addColorStop(0.6,'#06000e'); bg.addColorStop(1,'#020005');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    mx.save();
    sparks.forEach(s=>{
      s.y-=s.spd; if(s.y<-4){s.y=ch+4; s.x=Math.random()*cw;}
      mx.globalAlpha=0.1+0.3*Math.abs(Math.sin(t/700+s.ph));
      mx.fillStyle=s.col; mx.shadowColor=s.col; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.sz,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    mx.fillStyle=phase==='watch'?'#cc44ff':'#ff44cc';
    mx.font='bold 10px Cinzel,serif'; mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText(
      phase==='watch'?`Memorise: ${watchStep}/${seq.length}`:`Repeat: ${playerSeq.length}/${seq.length}`,
      cw/2, 4
    );

    for(let i=0;i<4;i++){
      const tp=tPos[i], tile=TILES[i], lit=(litTile===i);
      mx.save();
      mx.shadowColor=tile.col; mx.shadowBlur=lit?28:5;
      const tg=mx.createRadialGradient(tp.x+TS/2,tp.y+TS/2,4,tp.x+TS/2,tp.y+TS/2,TS*.6);
      tg.addColorStop(0,lit?tile.lit:tile.col);
      tg.addColorStop(1,lit?tile.col:'#060008');
      mx.fillStyle=tg;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.fill();
      mx.strokeStyle=lit?tile.lit:tile.col+'88'; mx.lineWidth=lit?2.5:1.5;
      mx.beginPath(); mx.roundRect(tp.x,tp.y,TS,TS,7); mx.stroke();
      mx.shadowBlur=0;
      mx.fillStyle=lit?'#fff':tile.lit+'cc';
      mx.font=`bold ${TS*.42}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
      mx.fillText(tile.sym,tp.x+TS/2,tp.y+TS/2);
      mx.restore();
    }

    const dotY=ch-7, dsp=14, ds=cw/2-(seq.length-1)*dsp/2;
    for(let i=0;i<seq.length;i++){
      mx.beginPath(); mx.arc(ds+i*dsp,dotY,4,0,Math.PI*2);
      if(i<playerSeq.length){ mx.fillStyle='#cc44ff'; mx.shadowColor='#cc44ff'; mx.shadowBlur=6; }
      else { mx.fillStyle='rgba(204,68,255,0.2)'; mx.shadowBlur=0; }
      mx.fill(); mx.shadowBlur=0;
    }
  }

  function frame(){ if(done) return; draw(); mazeRAF=requestAnimationFrame(frame); }
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── FLASH ──────────────────────────────────────────────────
function flash(col){
  const el=document.getElementById('flash');
  el.style.background=col; el.classList.add('on');
  setTimeout(()=>el.classList.remove('on'),120);
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
  // Build round-robin queue: all opponents except player, gnash always last
  const others=Object.keys(CHAR_DEFS).filter(k=>k!==key&&k!=='gnash');
  for(let i=others.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [others[i],others[j]]=[others[j],others[i]];
  }
  if(CHAR_DEFS['gnash']) others.push('gnash');
  tournamentQueue=others;
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

  // Frozen: skip this player's turn
  if(whoState.frozen>0){
    whoState.frozen--;
    addFloat(tx,bH*.38,'❄️ Frozen — turn skipped!','#88ddff',13);
    const nextPlayer=who==='p1'?'p2':'p1';
    setTimeout(()=>{
      if(!battleRunning||gameEnded) return;
      gs.round++;
      showHandoffOverlay(nextPlayer,()=>startPlayerTurn(nextPlayer));
    },1400);
    return;
  }

  gs.turnPlayer=who;
  updateActionBar(who==='p1'?p1Cfg:p2Cfg);
  gs.myTurn=true; gs.busy=false;
}

function startNextBattle(){
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
  // Show fight progress in HUD (e.g. "Fight 2 / 4")
  const fightLbl=document.getElementById('fightlbl');
  if(fightLbl){
    if(tournamentQueue.length>1){
      fightLbl.textContent='Fight '+(tournamentIndex+1)+' / '+tournamentQueue.length;
    } else {
      fightLbl.textContent='';
    }
  }
  newState();
  gameEnded=false;
  battleRunning=true;
  lastFrameTime=0;
  resizeBC();
  showScreen('battle-screen');
  requestAnimationFrame(battleLoop);
}

window.addEventListener('DOMContentLoaded', ()=>{
  // Wire up all buttons immediately — independent of the fetch below
  document.querySelectorAll('.diff-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      diffName=btn.dataset.diff;
      diffMult=diffName==='easy'?1.6:diffName==='hard'?0.55:1.0;
    });
  });

  document.getElementById('btn-start').addEventListener('click',()=>{
    twoPlayerMode=false; twoPlayerPhase=1;
    document.getElementById('char-player-label').style.display='none';
    showScreen('char-screen');
  });
  document.getElementById('btn-2player').addEventListener('click',()=>{
    twoPlayerMode=true; twoPlayerPhase=1;
    const lbl=document.getElementById('char-player-label');
    lbl.textContent='Player 1: Choose Your Wizard';
    lbl.style.display='';
    showScreen('char-screen');
  });
  document.getElementById('btn-back').addEventListener('click',()=>{
    if(twoPlayerMode&&twoPlayerPhase===2){
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
  document.getElementById('pick-emberic').addEventListener('click',()=>showWizardDetail('emberic'));
  document.getElementById('pick-zacharius').addEventListener('click',()=>showWizardDetail('zacharius'));
  document.getElementById('pick-mary').addEventListener('click',()=>showWizardDetail('mary'));
  document.getElementById('pick-mordant').addEventListener('click',()=>showWizardDetail('mordant'));
  document.getElementById('pick-ponder').addEventListener('click',()=>showWizardDetail('ponder'));

  document.getElementById('wd-back').addEventListener('click',()=>{
    document.getElementById('wizard-detail').classList.remove('active');
  });
  document.getElementById('wd-choose').addEventListener('click',()=>{
    const key=document.getElementById('wd-choose').dataset.key;
    document.getElementById('wizard-detail').classList.remove('active');
    pickCharacter(key);
  });

  document.getElementById('btn-help').addEventListener('click',()=>{
    document.getElementById('helpmodal').style.display='flex';
  });
  document.getElementById('btn-closehelp').addEventListener('click',()=>{
    document.getElementById('helpmodal').style.display='none';
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
