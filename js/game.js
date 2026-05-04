// ── CONSTANTS ──────────────────────────────────────────────
const MAX_MANA=20, SHIELD_COST=3, BURN_DMG=5, BURN_ROUNDS=2;

const SPELLS=[
  {name:'Inferno',        element:'fire',      icon:'🔥', dmg:38, cost:12, col:'#ff6622',
   effectLabel:'Burns 5 dmg × 2 rounds'},
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
    stats:[['❤ HP','115'],['🛡 Shield','70% absorb'],['⚡ Counter','20 reflect'],['✨ Channel','+4 Mana']],
    flavour:'Outlast your foe with arcane endurance.'
  },
  mal:{
    stats:[['❤ HP','80'],['💪 Empower','+50% / Free'],['🩸 Blood Pact','−22/+7 mana'],['✨ Channel','+4 Mana']],
    flavour:'Strike hard. Strike first. No mercy.'
  },
  sylvara:{
    stats:[['❤ HP','92'],['💚 Heal','+20 HP'],['🌿 Entangle','12+freeze'],['✨ Channel','+4 Mana']],
    flavour:"Sustain and control with nature's power."
  },
  aurelia:{
    stats:[['❤ HP','90'],['✨ Ward','2-turn barrier'],['🌀 Weaken','−35% spell'],['✨ Channel','+4 Mana']],
    flavour:'Control the field with light and debuffs.'
  },
  ponder:{
    stats:[['❤ HP','999'],['✨ Channel','+4 Mana'],['🎯 Mode','Solo practice'],['⚔ Opponent','None']],
    flavour:'A quiet space to learn your spells without consequence.'
  }
};

// ── DIFFICULTY ─────────────────────────────────────────────
let diffMult=1.0, diffName='normal';

// ── PRACTICE MODE ──────────────────────────────────────────
let ponderMode=false;

// ── STATE ──────────────────────────────────────────────────
let gs={}, puzzleCB=null, aiTid=null;
let bW=0, bH=0;
let mazeRAF=null, mazeTid=null;

function newState(){
  gs={
    p1:{hp:p1Cfg.hp, maxHp:p1Cfg.hp, mana:p1Cfg.startMana,
        shield:0, burn:0, frozen:false,
        counter:false, empowered:false, ward:0, weakened:false},
    p2: p2Cfg
      ? {hp:p2Cfg.hp, maxHp:p2Cfg.hp, mana:p2Cfg.startMana,
         shield:0, burn:0, frozen:false,
         counter:false, empowered:false, ward:0, weakened:false}
      : {hp:999, maxHp:999, mana:0,
         shield:0, burn:0, frozen:false,
         counter:false, empowered:false, ward:0, weakened:false},
    round:1, myTurn:true, busy:false,
    p1anim:'idle', p2anim:'idle',
    parts:[], floats:[],
  };
}

// ── SCREENS ────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
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
    const frameCount=ANIM_FRAMES[gs[who+'anim']]??SPRITE_CFG.frames;
    a.frame=(a.frame+1)%frameCount;
  }
}

let lastFrameTime=0;

function drawWiz(x,y,sz,col,flip,animName,shielded,wardActive,who){
  bx.save();
  if(shielded>0){
    const gv=0.08+0.05*Math.sin(Date.now()/300);
    bx.beginPath(); bx.arc(x,y-sz*.5,sz*.75,0,Math.PI*2);
    bx.fillStyle=`rgba(74,240,255,${gv})`; bx.fill();
    bx.strokeStyle=`rgba(74,240,255,${gv*5})`; bx.lineWidth=1.5; bx.stroke();
  }
  if(wardActive>0){
    const t=Date.now();
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
  const img=sprites[who];
  if(img&&spriteStatus[who]==='ready'){
    const cfg=SPRITE_CFG;
    const row=cfg.animRows[animName]??cfg.animRows.idle;
    const frame=animState[who].frame;
    const srcX=frame*cfg.frameW, srcY=row*cfg.frameH;
    const scale=sz/cfg.frameH, dw=cfg.frameW*scale, dh=cfg.frameH*scale;
    const lift=animName==='cast'?-sz*.06:0;
    const shake=animName==='hit'?Math.sin(Date.now()/60)*sz*.03:0;
    const bob=animName==='idle'?Math.sin(Date.now()/500+x)*sz*.015:0;
    const dy=lift+shake+bob;
    if(flip){
      bx.scale(-1,1);
      bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,-x-dw/2,y-dh+dy,dw,dh);
    } else {
      bx.drawImage(img,srcX,srcY,cfg.frameW,cfg.frameH,x-dw/2,y-dh+dy,dw,dh);
    }
  } else {
    if(flip){bx.scale(-1,1); x=-x;}
    const bob=animName==='idle'?Math.sin(Date.now()/500+x)*.015*sz:0;
    const lift=animName==='cast'?-sz*.06:0;
    const shake=animName==='hit'?Math.sin(Date.now()/60)*.03*sz:0;
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
    const op=.5+.5*Math.sin(Date.now()/400);
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
    p.x+=p.vx; p.y+=p.vy; p.vy+=.18; p.life-=p.dec;
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

// ── STATUS BAR ─────────────────────────────────────────────
function refreshStatusBar(){
  const el=document.getElementById('statusbar');
  const tags=[];
  if(gs.p1.burn>0)      tags.push(`<span class="status-tag burn">🔥 ${p1Cfg.name} BURNING (${gs.p1.burn})</span>`);
  if(gs.p1.frozen)      tags.push(`<span class="status-tag freeze">❄️ ${p1Cfg.name} FROZEN</span>`);
  if(gs.p1.empowered)   tags.push(`<span class="status-tag empower">💪 ${p1Cfg.name} EMPOWERED</span>`);
  if(gs.p1.counter)     tags.push(`<span class="status-tag counter">⚡ ${p1Cfg.name} COUNTER</span>`);
  if(gs.p1.ward>0)      tags.push(`<span class="status-tag ward">✨ ${p1Cfg.name} WARDED (${gs.p1.ward})</span>`);
  if(gs.p1.weakened)    tags.push(`<span class="status-tag weakened">🌀 ${p1Cfg.name} WEAKENED</span>`);
  if(p2Cfg){
    if(gs.p2.burn>0)    tags.push(`<span class="status-tag burn">🔥 ${p2Cfg.name} BURNING (${gs.p2.burn})</span>`);
    if(gs.p2.frozen)    tags.push(`<span class="status-tag freeze">❄️ ${p2Cfg.name} FROZEN</span>`);
    if(gs.p2.empowered) tags.push(`<span class="status-tag empower">💪 ${p2Cfg.name} EMPOWERED</span>`);
    if(gs.p2.ward>0)    tags.push(`<span class="status-tag ward">✨ ${p2Cfg.name} WARDED (${gs.p2.ward})</span>`);
    if(gs.p2.weakened)  tags.push(`<span class="status-tag weakened">🌀 ${p2Cfg.name} WEAKENED</span>`);
  }
  el.innerHTML=tags.join('');
  el.style.padding=tags.length?'3px 12px':'0';
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
  drawWiz(bW*.22,gy,wsz,p1Cfg.col,true, gs.p1anim,gs.p1.shield,gs.p1.ward,'p1');
  if(!ponderMode) drawWiz(bW*.78,gy,wsz,p2Cfg.col,false,gs.p2anim,gs.p2.shield,gs.p2.ward,'p2');
  tickParts(); tickFloats();
  if(!gs.myTurn&&!gs.busy&&!ponderMode){
    bx.fillStyle=`rgba(${hexToRgb(p2Cfg.col)},0.7)`; bx.font='bold 10px Cinzel,serif';
    bx.textAlign='center'; bx.fillText(p2Cfg.name+' IS CASTING…',bW*.5,bH*.56);
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
  document.getElementById('roundlbl').textContent='Round '+gs.round;
  refreshMana('mfill1','mval1',gs.p1.mana);
  refreshMana('mfill2','mval2',gs.p2.mana);
  refreshActionBar();
}

function refreshMana(fillId,valId,val){
  document.getElementById(fillId).style.height=(val/MAX_MANA*100)+'%';
  document.getElementById(valId).textContent=val;
}

function refreshActionBar(){
  const busy=!gs.myTurn||gs.busy;
  document.getElementById('bchannel').classList.toggle('off',busy);
  // Specials
  const s1=p1Cfg.specials[0], s2=p1Cfg.specials[1];
  const sp1Disabled=busy||gs.p1.mana<s1.cost||specialBlocked(p1Key,0);
  const sp2Disabled=busy||gs.p1.mana<s2.cost||specialBlocked(p1Key,1);
  document.getElementById('bspecial1').classList.toggle('off',sp1Disabled);
  document.getElementById('bspecial2').classList.toggle('off',sp2Disabled);
  // Spell buttons
  SPELLS.forEach(spell=>{
    const btn=document.getElementById('bspell-'+spell.element);
    if(btn) btn.classList.toggle('off',busy||gs.p1.mana<spell.cost);
  });
}

function specialBlocked(key,idx){
  if(key==='eldrad'||key==='ponder'){
    if(idx===0) return gs.p1.shield>0;        // already shielded
    if(idx===1) return !gs.p1.shield;          // need shield to counter
  }
  if(key==='mal'){
    if(idx===0) return gs.p1.empowered;        // already empowered
    if(idx===1) return gs.p1.hp<=16;           // too low HP for Blood Pact
  }
  if(key==='sylvara'){
    if(idx===0) return gs.p1.hp>=gs.p1.maxHp; // already full HP
    if(idx===1) return gs.p2.frozen;           // already frozen
  }
  if(key==='aurelia'){
    if(idx===0) return gs.p1.ward>0;           // already warded
    if(idx===1) return gs.p2.weakened;         // already weakened
  }
  return false;
}

// ── PLAYER ACTIONS ─────────────────────────────────────────
function act(type){
  if(!gs.myTurn||gs.busy) return;

  if(type==='channel'){
    gs.p1.mana=Math.min(MAX_MANA,gs.p1.mana+p1Cfg.channelAmt);
    addFloat(bW*.22,bH*.38,'+'+p1Cfg.channelAmt+' Mana','#88aaff',13);
    anim('p1','cast',700); endMyTurn(); return;
  }

  // Spell direct-launch (no picker screen)
  const spell=SPELLS.find(s=>s.element===type);
  if(spell){
    if(gs.p1.mana<spell.cost) return;
    gs.busy=true;
    const launchers={
      fire:      launchPatternEcho,
      lightning: launchMaze,
      ice:       launchIceSlide,
      arcane:    launchMemoryRunes,
    };
    launchers[type](spell, ok=>{
      if(ok){
        gs.p1.mana-=spell.cost;
        castSpell(spell,gs.p2,bW*.78,bH*.38,'p1');
      } else {
        addFloat(bW*.22,bH*.33,'Fizzled!','#ff8844',13);
        gs.p1.mana=Math.max(0,gs.p1.mana-1);
      }
      endMyTurn();
    });
    return;
  }

  if(type==='special1') actSpecial(p1Key,0);
  if(type==='special2') actSpecial(p1Key,1);
}

// ── CHARACTER SPECIALS ─────────────────────────────────────
function actSpecial(charKey,idx){
  if(!gs.myTurn||gs.busy) return;

  const sp=p1Cfg.specials;

  if(charKey==='eldrad'||charKey==='ponder'){
    if(idx===0){ // Shield
      if(gs.p1.mana<sp[0].cost||gs.p1.shield>0) return;
      gs.p1.mana-=sp[0].cost; gs.p1.shield=p1Cfg.shieldHits;
      addFloat(bW*.22,bH*.33,'🛡 Shielded!','#4af0ff',12);
      anim('p1','shield',700); endMyTurn();
    } else { // Counter
      if(gs.p1.mana<sp[1].cost||!gs.p1.shield) return;
      gs.p1.mana-=sp[1].cost; gs.p1.counter=true;
      addFloat(bW*.22,bH*.33,'⚡ Counter Ready!','#4af0ff',12);
      anim('p1','shield',700); endMyTurn();
    }
    return;
  }

  if(charKey==='mal'){
    if(idx===0){ // Empower
      if(gs.p1.empowered) return;
      gs.p1.empowered=true;
      addFloat(bW*.22,bH*.33,'💪 Empowered!','#ff4a6e',12);
      spawnParts(bW*.22,bH*.38,'#ff4a6e',10);
      anim('p1','cast',700); endMyTurn();
    } else { // Blood Pact
      if(gs.p1.hp<=p1Cfg.bpCost) return;
      gs.p1.hp=Math.max(1,gs.p1.hp-p1Cfg.bpCost);
      gs.p1.mana=Math.min(MAX_MANA,gs.p1.mana+p1Cfg.bpGain);
      addFloat(bW*.22,bH*.33,'🩸 -'+p1Cfg.bpCost+'HP +'+p1Cfg.bpGain+' Mana','#ff4a6e',11);
      spawnParts(bW*.22,bH*.38,'#ff4a6e',10);
      anim('p1','cast',700); refreshHUD(); endMyTurn();
    }
    return;
  }

  if(charKey==='sylvara'){
    if(idx===0){ // Heal
      if(gs.p1.mana<sp[0].cost||gs.p1.hp>=gs.p1.maxHp) return;
      gs.p1.mana-=sp[0].cost;
      const healed=Math.min(p1Cfg.healAmt,gs.p1.maxHp-gs.p1.hp);
      gs.p1.hp=Math.min(gs.p1.maxHp,gs.p1.hp+p1Cfg.healAmt);
      addFloat(bW*.22,bH*.33,'+'+healed+' HP 💚','#44cc88',14);
      spawnParts(bW*.22,bH*.38,'#44cc88',14);
      anim('p1','cast',700); endMyTurn();
    } else { // Entangle
      if(gs.p1.mana<sp[1].cost||gs.p2.frozen) return;
      gs.p1.mana-=sp[1].cost;
      gs.p2.hp=Math.max(0,gs.p2.hp-p1Cfg.entangleDmg); gs.p2.frozen=true;
      spawnParts(bW*.78,bH*.38,'#44cc88',14);
      addFloat(bW*.78,bH*.33,'-'+p1Cfg.entangleDmg+' 🌿 Entangled!','#44cc88',11);
      anim('p1','cast',800); anim('p2','hit',800);
      checkWin(); endMyTurn();
    }
    return;
  }

  if(charKey==='aurelia'){
    if(idx===0){ // Ward
      if(gs.p1.mana<sp[0].cost||gs.p1.ward>0) return;
      gs.p1.mana-=sp[0].cost; gs.p1.ward=p1Cfg.wardTurns;
      addFloat(bW*.22,bH*.33,'✨ Ward Active!','#ffcc44',12);
      spawnParts(bW*.22,bH*.38,'#ffcc44',10);
      anim('p1','shield',700); endMyTurn();
    } else { // Weaken
      if(gs.p1.mana<sp[1].cost||gs.p2.weakened) return;
      gs.p1.mana-=sp[1].cost; gs.p2.weakened=true;
      addFloat(bW*.78,bH*.33,'🌀 Weakened!','#ffcc44',12);
      spawnParts(bW*.78,bH*.38,'#ffcc44',10);
      anim('p1','cast',700); endMyTurn();
    }
    return;
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

  // Caster: Empower
  if(casterState.empowered){
    const pct=Math.round((casterCfg.empowerMult-1)*100);
    dmg=Math.round(dmg*casterCfg.empowerMult);
    casterState.empowered=false;
    addFloat(tx,ty-36,'💪 +'+pct+'% Empowered!',casterCfg.col,10);
  }

  // Caster: Weakened
  if(casterState.weakened){
    const pct=Math.round((1-oppCfg.weakenMult)*100);
    dmg=Math.round(dmg*oppCfg.weakenMult);
    casterState.weakened=false;
    addFloat(tx,ty-36,'🌀 Weakened −'+pct+'%','#ffcc44',10);
  }

  // Target: Ward
  if(targetState.ward>0){
    if(Math.random()<targetCfg.wardFizzle){
      addFloat(tx,ty-20,'✨ Fizzled!','#ffcc44',11);
      targetState.ward--;
      if(caster==='p1'){anim('p1','cast',600);} else {anim('p2','cast',600);}
      return;
    }
    const pct=Math.round(targetCfg.wardAbsorb*100);
    dmg=Math.round(dmg*(1-targetCfg.wardAbsorb));
    addFloat(tx,ty-20,'✨ Warded −'+pct+'%!','#ffcc44',11);
    targetState.ward--;
  }

  // Target: Counter (check BEFORE shield breaks)
  const counterTriggered=targetState.counter&&targetState.shield>0;

  // Target: Shield
  if(targetState.shield>0){
    if(spell.element==='lightning'){
      targetState.shield=0;
      addFloat(tx,ty-20,'⚡ Pierced!','#ffee44',11);
    } else {
      const pct=Math.round(targetCfg.shieldAbsorb*100);
      dmg=Math.round(dmg*(1-targetCfg.shieldAbsorb));
      targetState.shield=0;
      addFloat(tx,ty-20,'🛡 −'+pct+'% Absorbed!','#4af0ff',11);
    }
  }

  // Counter reflect
  if(counterTriggered){
    const casterX=caster==='p1'?bW*.22:bW*.78;
    casterState.hp=Math.max(0,casterState.hp-targetCfg.counterDmg);
    targetState.counter=false;
    addFloat(casterX,bH*.33,'⚡ Counter! −'+targetCfg.counterDmg,'#4af0ff',11);
    spawnParts(casterX,bH*.38,'#4af0ff',8);
    checkWin(); if(!battleRunning) return;
  }

  targetState.hp=Math.max(0,targetState.hp-dmg);
  spawnParts(tx,ty,spell.col,22);
  addFloat(tx,ty,'-'+dmg,spell.col,22);
  flash(spell.col);

  if(spell.element==='fire'){
    targetState.burn=BURN_ROUNDS;
    addFloat(tx,ty+28,'🔥 Burning!','#ff6622',10);
  }
  if(spell.element==='ice'){
    targetState.frozen=true;
    addFloat(tx,ty+28,'❄️ Frozen!','#88ddff',10);
  }

  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
  checkWin();
}

function processBurn(target,tx,ty){
  if(target.burn<=0) return;
  target.hp=Math.max(0,target.hp-BURN_DMG);
  target.burn--;
  spawnParts(tx,ty,'#ff4400',8);
  addFloat(tx,ty,'🔥 -'+BURN_DMG,'#ff6622',13);
}

function anim(who,state,ms){
  gs[who+'anim']=state;
  setTimeout(()=>{if(gs[who+'anim']!=='death') gs[who+'anim']='idle';},ms);
}

function endMyTurn(){
  gs.myTurn=false; gs.busy=false;
  if(gs.p1.shield>0) gs.p1.shield--;
  if(gs.p1.ward>0)   gs.p1.ward--;
  gs.round++;
  if(aiTid) clearTimeout(aiTid);
  if(ponderMode){
    aiTid=setTimeout(()=>{ gs.myTurn=true; gs.busy=false; },600);
  } else {
    aiTid=setTimeout(doAI,1400);
  }
}

// ── AI TURN ────────────────────────────────────────────────
function doAI(){
  if(!gs||!battleRunning||gameEnded||ponderMode) return;

  // Burn tick for AI
  if(gs.p2.burn>0){
    processBurn(gs.p2,bW*.78,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Frozen: skip turn
  if(gs.p2.frozen){
    gs.p2.frozen=false;
    addFloat(bW*.78,bH*.38,'❄️ Frozen!','#88ddff',13);
    setTimeout(finishAI,1200);
    return;
  }

  const ai=gs.p2;
  const affordable=SPELLS.filter(s=>ai.mana>=s.cost);
  let usedSpecial=false;

  // ── AI specials by character ──
  const asp=p2Cfg.specials;
  if(p2Key==='eldrad'){
    if(ai.shield===0 && ai.mana>=asp[0].cost && ai.hp<75 && Math.random()<0.60){
      ai.mana-=asp[0].cost; ai.shield=p2Cfg.shieldHits;
      addFloat(bW*.78,bH*.33,'🛡 Shield!','#4af0ff',12);
      anim('p2','shield',700); usedSpecial=true;
    } else if(ai.shield>0 && !ai.counter && ai.mana>=asp[1].cost && Math.random()<0.50){
      ai.mana-=asp[1].cost; ai.counter=true;
      addFloat(bW*.78,bH*.33,'⚡ Counter!','#4af0ff',12);
      anim('p2','shield',700); usedSpecial=true;
    }
  } else if(p2Key==='mal'){
    const bpAvail=ai.hp>p2Cfg.bpCost && ai.mana===0;
    const empAvail=!ai.empowered && affordable.find(s=>s.element==='fire');
    if(bpAvail){
      ai.hp=Math.max(1,ai.hp-p2Cfg.bpCost); ai.mana=Math.min(MAX_MANA,ai.mana+p2Cfg.bpGain);
      addFloat(bW*.78,bH*.33,'🩸 Blood Pact!','#ff4a6e',11);
      spawnParts(bW*.78,bH*.38,'#ff4a6e',8);
      anim('p2','cast',700); usedSpecial=true;
    } else if(empAvail && Math.random()<0.55){
      ai.empowered=true;
      addFloat(bW*.78,bH*.33,'💪 Empowered!','#ff4a6e',12);
      anim('p2','cast',700); usedSpecial=true;
    }
  } else if(p2Key==='sylvara'){
    if(ai.hp<50 && ai.mana>=asp[0].cost && Math.random()<0.70){
      ai.mana-=asp[0].cost; ai.hp=Math.min(ai.maxHp,ai.hp+p2Cfg.healAmt);
      addFloat(bW*.78,bH*.33,'+'+p2Cfg.healAmt+' HP 💚','#44cc88',13);
      spawnParts(bW*.78,bH*.38,'#44cc88',10);
      anim('p2','cast',700); usedSpecial=true;
    } else if(gs.p1.mana>=9 && ai.mana>=asp[1].cost && !gs.p1.frozen && Math.random()<0.55){
      ai.mana-=asp[1].cost;
      gs.p1.hp=Math.max(0,gs.p1.hp-p2Cfg.entangleDmg); gs.p1.frozen=true;
      spawnParts(bW*.22,bH*.38,'#44cc88',14);
      addFloat(bW*.22,bH*.33,'-'+p2Cfg.entangleDmg+' 🌿 Entangled!','#44cc88',11);
      anim('p2','cast',800); anim('p1','hit',800);
      checkWin(); if(!battleRunning) return;
      usedSpecial=true;
    }
  } else if(p2Key==='aurelia'){
    if(ai.ward===0 && ai.mana>=asp[0].cost && Math.random()<0.45){
      ai.mana-=asp[0].cost; ai.ward=p2Cfg.wardTurns;
      addFloat(bW*.78,bH*.33,'✨ Ward!','#ffcc44',12);
      anim('p2','shield',700); usedSpecial=true;
    } else if(!gs.p1.weakened && ai.mana>=asp[1].cost && gs.p1.mana>=9 && Math.random()<0.50){
      ai.mana-=asp[1].cost; gs.p1.weakened=true;
      addFloat(bW*.22,bH*.33,'🌀 Weakened!','#ffcc44',12);
      spawnParts(bW*.22,bH*.38,'#ffcc44',8);
      anim('p2','cast',700); usedSpecial=true;
    }
  }

  if(usedSpecial){
    if(ai.shield>0) ai.shield--;
    if(ai.ward>0)   ai.ward--;
    setTimeout(finishAI,900);
    return;
  }

  // ── Spell / channel logic ──
  let spell=null, action='channel';

  if(affordable.length>0){
    if(gs.p1.shield>0 && affordable.find(s=>s.element==='lightning')){
      spell=affordable.find(s=>s.element==='lightning');
    } else if(!gs.p1.shield && affordable.find(s=>s.element==='fire')){
      spell=affordable.find(s=>s.element==='fire');
    } else if(gs.p1.mana>=3 && affordable.find(s=>s.element==='ice')){
      spell=affordable.find(s=>s.element==='ice');
    } else {
      spell=affordable[Math.floor(Math.random()*affordable.length)];
    }
    action='spell';
  }

  if(action==='channel'){
    ai.mana=Math.min(MAX_MANA,ai.mana+p2Cfg.channelAmt);
    addFloat(bW*.78,bH*.38,'+'+p2Cfg.channelAmt+' Mana','#ff8888',13);
    anim('p2','cast',700);
  } else {
    addFloat(bW*.78,bH*.26,spell.icon+' '+spell.name+'!',spell.col,12);
    anim('p2','cast',800);
    setTimeout(()=>{
      if(!battleRunning) return;
      if(Math.random()<0.8){
        ai.mana-=spell.cost;
        castSpell(spell,gs.p1,bW*.22,bH*.38,'p2');
      } else {
        addFloat(bW*.78,bH*.33,'Fizzled!','#ff8844',12);
        ai.mana=Math.max(0,ai.mana-1);
      }
      finishAI();
    },700);
    return;
  }
  if(ai.shield>0) ai.shield--;
  if(ai.ward>0)   ai.ward--;
  finishAI();
}

function finishAI(){
  if(!battleRunning||gameEnded) return;
  checkWin(); if(!battleRunning) return;

  // Burn tick for player
  if(gs.p1.burn>0){
    processBurn(gs.p1,bW*.22,bH*.38);
    checkWin(); if(!battleRunning) return;
  }

  // Frozen: auto-skip player turn
  if(gs.p1.frozen){
    gs.p1.frozen=false;
    addFloat(bW*.22,bH*.38,'❄️ Frozen!','#88ddff',13);
    setTimeout(()=>{ gs.round++; if(aiTid) clearTimeout(aiTid); aiTid=setTimeout(doAI,1200); },1200);
    return;
  }

  gs.myTurn=true; gs.busy=false;
}

function checkWin(){
  if(ponderMode) return;
  if(gs.p1.hp<=0) endGame(false);
  else if(gs.p2.hp<=0) endGame(true);
}

function endGame(won){
  gameEnded=true;
  gs.myTurn=false; gs.busy=true;
  gs[won?'p2anim':'p1anim']='death';
  setTimeout(()=>{
    battleRunning=false;
    document.getElementById('ovico').textContent=won?'🏆':'💀';
    document.getElementById('ovtitle').textContent=won?'Victory!':'Defeated!';
    document.getElementById('ovtitle').style.color=won?'#f0cc6a':'#ff4a6e';
    document.getElementById('ovdesc').textContent=won
      ?p2Cfg.name+' falls before your arcane might!'
      :'Your magic was not enough. Study and return!';
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

// ── PUZZLE: MAZE (Lightning) ───────────────────────────────
const CELL=24, COLS=15, ROWS=15;
const DR=[-1,0,1,0], DC=[0,1,0,-1];

function genMaze(){
  const H=Array.from({length:ROWS+1},()=>Array(COLS).fill(true));
  const V=Array.from({length:ROWS},()=>Array(COLS+1).fill(true));
  const vis=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  function carve(r,c){
    vis[r][c]=true;
    [0,1,2,3].sort(()=>Math.random()-.5).forEach(d=>{
      const nr=r+DR[d],nc=c+DC[d];
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!vis[nr][nc]){
        if(d===0)H[r][c]=false; if(d===2)H[r+1][c]=false;
        if(d===1)V[r][c+1]=false; if(d===3)V[r][c]=false;
        carve(nr,nc);
      }
    });
  }
  carve(0,0); return{H,V};
}

function canGo(w,col,row,d){
  if(d===0)return!w.H[row][col]; if(d===2)return!w.H[row+1][col];
  if(d===1)return!w.V[row][col+1]; if(d===3)return!w.V[row][col]; return false;
}

function braidMaze(walls,factor=0.5){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const open=[0,1,2,3].filter(d=>canGo(walls,c,r,d));
    if(open.length===1&&Math.random()<factor){
      const closed=[0,1,2,3].filter(d=>!canGo(walls,c,r,d));
      const d=closed[Math.floor(Math.random()*closed.length)];
      if(d===0)walls.H[r][c]=false;
      else if(d===2)walls.H[r+1][c]=false;
      else if(d===1)walls.V[r][c+1]=false;
      else if(d===3)walls.V[r][c]=false;
    }
  }
}

function shortestPathLength(walls){
  const dist=Array.from({length:ROWS},()=>Array(COLS).fill(-1));
  const q=[[0,0]]; dist[0][0]=0;
  while(q.length){
    const [col,row]=q.shift();
    if(col===COLS-1&&row===ROWS-1) return dist[row][col];
    for(let d=0;d<4;d++){
      if(canGo(walls,col,row,d)){
        const nc=col+DC[d],nr=row+DR[d];
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&dist[nr][nc]===-1){
          dist[nr][nc]=dist[row][col]+1; q.push([nc,nr]);
        }
      }
    }
  }
  return ROWS+COLS;
}

function launchMaze(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Arc Conduit';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(true);

  const walls=genMaze();
  braidMaze(walls);
  const cw=COLS*CELL+2, ch=ROWS*CELL+2;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const mk={col:0,row:0,x:0.5,y:0.5,fromX:0.5,fromY:0.5,dir:-1,moving:false,moveT:0,held:false,tapPending:false};
  const goal={col:COLS-1,row:ROWS-1};
  const trail=[];
  const MOVE_DUR=160;

  const sparks=Array.from({length:28},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    speed:0.3+Math.random()*.9, size:0.6+Math.random()*1.4,
    phase:Math.random()*Math.PI*2,
    col:Math.random()<0.4?'#ffffff':Math.random()<0.5?'#ffff88':'#aaddff',
  }));

  const pathLen=shortestPathLength(walls);
  let timeLeft=Math.max(Math.round(5.75*diffMult),Math.round(pathLen*.575*diffMult));
  const timerEl=document.getElementById('pztimer');
  timerEl.textContent=timeLeft; timerEl.classList.remove('urgent');

  if(mazeTid) clearInterval(mazeTid);
  mazeTid=setInterval(()=>{
    if(done) return;
    timeLeft--; timerEl.textContent=timeLeft;
    if(timeLeft<=5) timerEl.classList.add('urgent');
    if(timeLeft<=0) finish(false);
  },1000);

  function pressDir(d){ mk.dir=d; mk.held=true; mk.tapPending=true; }
  function releaseDir(){ mk.held=false; }
  const dpMap={'dp-n':0,'dp-e':1,'dp-s':2,'dp-w':3};
  const dpEls={};
  Object.keys(dpMap).forEach(id=>{
    const el=document.getElementById(id); dpEls[id]=el;
    el.addEventListener('pointerdown',e=>{e.preventDefault(); pressDir(dpMap[id]); el.classList.add('pressed');});
    el.addEventListener('pointerup',()=>{ releaseDir(); el.classList.remove('pressed'); });
    el.addEventListener('pointercancel',()=>{ releaseDir(); el.classList.remove('pressed'); });
  });
  function onKD(e){
    const m={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};
    if(m[e.key]!==undefined&&!e.repeat){ pressDir(m[e.key]); e.preventDefault(); }
  }
  function onKU(e){
    const m={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};
    if(m[e.key]!==undefined) releaseDir();
  }
  window.addEventListener('keydown',onKD);
  window.addEventListener('keyup',onKU);

  function cleanup(){
    window.removeEventListener('keydown',onKD);
    window.removeEventListener('keyup',onKU);
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    Object.values(dpEls).forEach(el=>el.classList.remove('pressed'));
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  function update(dt){
    if(mk.moving){
      mk.moveT+=dt;
      const p=Math.min(1,mk.moveT/MOVE_DUR);
      mk.x=mk.fromX+(mk.col+0.5-mk.fromX)*p;
      mk.y=mk.fromY+(mk.row+0.5-mk.fromY)*p;
      if(p>=1){
        mk.x=mk.col+0.5; mk.y=mk.row+0.5;
        mk.moving=false;
        if(mk.col===goal.col&&mk.row===goal.row) finish(true);
      }
    }
    if(!mk.moving&&(mk.held||mk.tapPending)&&mk.dir>=0){
      mk.tapPending=false;
      if(canGo(walls,mk.col,mk.row,mk.dir)){
        trail.push({x:mk.x,y:mk.y,life:1});
        mk.fromX=mk.x; mk.fromY=mk.y;
        mk.col+=DC[mk.dir]; mk.row+=DR[mk.dir];
        mk.moving=true; mk.moveT=0;
      }
    }
    for(let i=trail.length-1;i>=0;i--){
      trail[i].life-=dt/700;
      if(trail[i].life<=0) trail.splice(i,1);
    }
  }

  function drawMazeFrame(){
    const ox=1,oy=1, t=Date.now(), W=mc.width, H=mc.height;

    const bg=mx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0c0e1a'); bg.addColorStop(0.5,'#060810'); bg.addColorStop(1,'#030408');
    mx.fillStyle=bg; mx.fillRect(0,0,W,H);

    mx.save();
    const boltPaths=[[W*.08,H*.05,W*.35,H*.95],[W*.48,0,W*.62,H],[W*.78,H*.08,W*.38,H*.88],[W*.18,H*.42,W*.86,H*.58],[W*.62,0,W*.22,H*.52]];
    const boltSeeds=[0,1.5,3.2,4.8,6.1];
    boltPaths.forEach(([x1,y1,x2,y2],bi)=>{
      const alpha=0.04+0.08*Math.abs(Math.sin(t/280+boltSeeds[bi]));
      mx.strokeStyle=`rgba(160,210,255,${alpha})`;
      mx.lineWidth=0.9; mx.shadowColor='rgba(80,160,255,0.3)'; mx.shadowBlur=3;
      mx.beginPath(); mx.moveTo(x1,y1);
      for(let si=1;si<=7;si++){
        const tt=si/7, seed=boltSeeds[bi]+t/9000;
        mx.lineTo(x1+(x2-x1)*tt+Math.sin(seed+si*2.1)*22*(1-tt*.5),
                  y1+(y2-y1)*tt+Math.cos(seed+si*1.8)*14*(1-tt*.5));
      }
      mx.stroke();
    });
    mx.shadowBlur=0; mx.restore();

    mx.save();
    sparks.forEach(s=>{
      s.y-=s.speed; if(s.y<-4){s.y=H+4; s.x=Math.random()*W;}
      mx.globalAlpha=0.08+0.45*Math.abs(Math.sin(t/280+s.phase));
      mx.fillStyle=s.col; mx.shadowColor='#ffee44'; mx.shadowBlur=6;
      mx.beginPath(); mx.arc(s.x,s.y,s.size,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    const gx=ox+goal.col*CELL+CELL/2, gy=oy+goal.row*CELL+CELL/2;
    const pulse=0.5+0.5*Math.sin(t/350);
    mx.save();
    [CELL*1.9,CELL*1.35].forEach((r,i)=>{
      mx.strokeStyle=`rgba(255,240,80,${(0.13+0.1*pulse)*(1-i*.45)})`;
      mx.lineWidth=1; mx.beginPath(); mx.arc(gx,gy,r,0,Math.PI*2); mx.stroke();
    });
    mx.restore();
    mx.fillStyle='rgba(255,240,80,0.14)'; mx.fillRect(ox+goal.col*CELL,oy+goal.row*CELL,CELL,CELL);
    mx.fillStyle='#ffee44'; mx.font=`${CELL*.55}px serif`;
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.shadowColor='#ffcc00'; mx.shadowBlur=8+7*pulse;
    mx.fillText('⚡',gx,gy); mx.shadowBlur=0;

    mx.beginPath();
    mx.strokeStyle='rgba(80,160,255,0.82)'; mx.lineWidth=1.5;
    for(let r=0;r<=ROWS;r++) for(let c=0;c<COLS;c++) if(walls.H[r][c]){
      mx.moveTo(ox+c*CELL,oy+r*CELL); mx.lineTo(ox+(c+1)*CELL,oy+r*CELL);
    }
    for(let r=0;r<ROWS;r++) for(let c=0;c<=COLS;c++) if(walls.V[r][c]){
      mx.moveTo(ox+c*CELL,oy+r*CELL); mx.lineTo(ox+c*CELL,oy+(r+1)*CELL);
    }
    mx.stroke();

    trail.forEach(tr=>{
      const tx=ox+tr.x*CELL, ty=oy+tr.y*CELL;
      mx.globalAlpha=tr.life*0.55;
      mx.fillStyle='#ffee44';
      mx.shadowColor='#ffff88'; mx.shadowBlur=8;
      mx.beginPath(); mx.arc(tx,ty,CELL*0.18*tr.life,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;

    const px=ox+mk.x*CELL, py=oy+mk.y*CELL;
    const boltPulse=0.6+0.4*Math.sin(t/150);
    mx.font=`bold ${Math.round(CELL*0.85)}px serif`;
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.fillStyle='#ffffff';
    mx.shadowColor='#ffee44'; mx.shadowBlur=18+10*boltPulse;
    mx.fillText('⚡',px,py);
    mx.shadowBlur=0;
  }

  let lastMazeTs=0;
  function frame(ts){ if(done) return; const dt=lastMazeTs?Math.min(ts-lastMazeTs,100):16; lastMazeTs=ts; update(dt); drawMazeFrame(); mazeRAF=requestAnimationFrame(frame); }
  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── PUZZLE: ICE SLIDE ──────────────────────────────────────
function launchIceSlide(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Frozen Labyrinth';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(true);

  const GCOLS=8, GROWS=8, GC=36, GPAD=4;
  const cw=GCOLS*GC+GPAD*2, ch=GROWS*GC+GPAD*2;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const CORNER_SETUPS=[
    {sc:0,       sr:0,       gc:GCOLS-1,gr:GROWS-1},
    {sc:GCOLS-1, sr:0,       gc:0,      gr:GROWS-1},
    {sc:GCOLS-1, sr:GROWS-1, gc:0,      gr:0      },
    {sc:0,       sr:GROWS-1, gc:GCOLS-1,gr:0      },
  ];
  const setup=CORNER_SETUPS[Math.floor(Math.random()*4)];
  const goal={c:setup.gc,r:setup.gr};
  let walls, pc=setup.sc, pr=setup.sr;
  const ROCK_COUNT=diffName==='easy'?10:diffName==='hard'?22:16;
  const MIN_SLIDES=diffName==='easy'?2:diffName==='hard'?6:3;
  const NUM_CP=diffName==='easy'?0:diffName==='hard'?2:1;

  function minSlidesCount(w,sc,sr,gc,gr){
    const vis=Array.from({length:GROWS},()=>Array(GCOLS).fill(false));
    const q=[[sc,sr,0]]; vis[sr][sc]=true;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    while(q.length){
      const [c,r,dist]=q.shift();
      if(c===gc&&r===gr) return dist;
      for(const [dc,dr] of dirs){
        let nc=c+dc,nr=r+dr;
        while(nc>=0&&nc<GCOLS&&nr>=0&&nr<GROWS&&!w[nr][nc]){nc+=dc;nr+=dr;}
        nc-=dc; nr-=dr;
        if(!vis[nr][nc]){vis[nr][nc]=true; q.push([nc,nr,dist+1]);}
      }
    }
    return 0;
  }

  function hasPathAvoidingDetour(w,sc,sr,gc,gr){
    const vis=Array.from({length:GROWS},()=>Array(GCOLS).fill(false));
    const q=[[sc,sr]]; vis[sr][sc]=true;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    while(q.length){
      const [c,r]=q.shift();
      if(c===gc&&r===gr) return true;
      const curDist=Math.abs(c-gc)+Math.abs(r-gr);
      for(const [dc,dr] of dirs){
        let nc=c+dc,nr=r+dr;
        while(nc>=0&&nc<GCOLS&&nr>=0&&nr<GROWS&&!w[nr][nc]){nc+=dc;nr+=dr;}
        nc-=dc; nr-=dr;
        const newDist=Math.abs(nc-gc)+Math.abs(nr-gr);
        if(newDist<=curDist&&!vis[nr][nc]){vis[nr][nc]=true; q.push([nc,nr]);}
      }
    }
    return false;
  }

  function pickOffDiagonalCell(w,fc,fr,gc,gr,exclude){
    const vis=Array.from({length:GROWS},()=>Array(GCOLS).fill(false));
    const q=[[fc,fr]]; vis[fr][fc]=true;
    const candidates=[];
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    while(q.length){
      const [c,r]=q.shift();
      const excl=(c===fc&&r===fr)||(c===gc&&r===gr)||exclude.some(e=>e.c===c&&e.r===r);
      if(!excl) candidates.push({c,r});
      for(const [dc,dr] of dirs){
        let nc=c+dc,nr=r+dr;
        while(nc>=0&&nc<GCOLS&&nr>=0&&nr<GROWS&&!w[nr][nc]){nc+=dc;nr+=dr;}
        nc-=dc; nr-=dr;
        if(!vis[nr][nc]){vis[nr][nc]=true; q.push([nc,nr]);}
      }
    }
    if(!candidates.length) return null;
    const dx=gc-fc, dy=gr-fr, len=Math.sqrt(dx*dx+dy*dy)||1;
    const scored=candidates.map(({c,r})=>({c,r,score:Math.abs(dx*(r-fr)-dy*(c-fc))/len}));
    scored.sort((a,b)=>b.score-a.score);
    const pool=scored.slice(0,Math.max(1,Math.floor(scored.length*0.35)));
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function totalSlides(w,cps){
    let tot=0, c=setup.sc, r=setup.sr;
    for(const cp of cps){tot+=minSlidesCount(w,c,r,cp.c,cp.r); c=cp.c; r=cp.r;}
    return tot+minSlidesCount(w,c,r,goal.c,goal.r);
  }

  function generatePuzzle(){
    for(let attempt=0;attempt<600;attempt++){
      const w=Array.from({length:GROWS},()=>Array(GCOLS).fill(false));
      for(let i=0;i<ROCK_COUNT;i++){
        let r,c,tries=0;
        do{r=Math.floor(Math.random()*GROWS);c=Math.floor(Math.random()*GCOLS);tries++;}
        while(((r===setup.sr&&c===setup.sc)||(r===goal.r&&c===goal.c)||w[r][c])&&tries<50);
        if(tries<50) w[r][c]=true;
      }
      if(!isIceSolvable(w,setup.sc,setup.sr,goal.c,goal.r)) continue;
      const cps=[]; let prevC=setup.sc, prevR=setup.sr, valid=true;
      for(let i=0;i<NUM_CP;i++){
        const exclude=[{c:setup.sc,r:setup.sr},{c:goal.c,r:goal.r},...cps];
        const cp=pickOffDiagonalCell(w,prevC,prevR,goal.c,goal.r,exclude);
        if(!cp||!isIceSolvable(w,cp.c,cp.r,goal.c,goal.r)){valid=false; break;}
        cps.push(cp); prevC=cp.c; prevR=cp.r;
      }
      if(!valid||totalSlides(w,cps)<MIN_SLIDES) continue;
      if(diffName==='hard'&&hasPathAvoidingDetour(w,setup.sc,setup.sr,goal.c,goal.r)) continue;
      return {walls:w, checkpoints:cps};
    }
    return {walls:Array.from({length:GROWS},()=>Array(GCOLS).fill(false)), checkpoints:[]};
  }

  function isIceSolvable(w,sc,sr,gc,gr){
    const vis=Array.from({length:GROWS},()=>Array(GCOLS).fill(false));
    const q=[[sc,sr]]; vis[sr][sc]=true;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    while(q.length){
      const [c,r]=q.shift();
      if(c===gc&&r===gr) return true;
      for(const [dc,dr] of dirs){
        let nc=c+dc,nr=r+dr;
        while(nc>=0&&nc<GCOLS&&nr>=0&&nr<GROWS&&!w[nr][nc]){nc+=dc;nr+=dr;}
        nc-=dc; nr-=dr;
        if(!vis[nr][nc]){vis[nr][nc]=true; q.push([nc,nr]);}
      }
    }
    return false;
  }

  let checkpoints=[], nextCpIdx=0;
  ({walls,checkpoints}=generatePuzzle());

  let sliding=false, slideFrom={c:setup.sc,r:setup.sr}, slideTo={c:setup.sc,r:setup.sr}, slideT=0;
  const SLIDE_DUR=180;
  let visualC=setup.sc, visualR=setup.sr;

  let timeLeft=Math.round(30*diffMult);
  const timerEl=document.getElementById('pztimer');
  timerEl.textContent=timeLeft; timerEl.classList.remove('urgent');

  if(mazeTid) clearInterval(mazeTid);
  mazeTid=setInterval(()=>{
    if(done) return;
    timeLeft--; timerEl.textContent=timeLeft;
    if(timeLeft<=5) timerEl.classList.add('urgent');
    if(timeLeft<=0) finish(false);
  },1000);

  function doSlide(dc,dr){
    if(sliding||done) return;
    let nc=pc+dc, nr=pr+dr;
    while(nc>=0&&nc<GCOLS&&nr>=0&&nr<GROWS&&!walls[nr][nc]){nc+=dc;nr+=dr;}
    nc-=dc; nr-=dr;
    if(nc===pc&&nr===pr) return;
    slideFrom={c:pc,r:pr}; slideTo={c:nc,r:nr};
    pc=nc; pr=nr; sliding=true; slideT=0;
    if(checkpoints[nextCpIdx]?.c===pc&&checkpoints[nextCpIdx]?.r===pr) nextCpIdx++;
    if(pc===goal.c&&pr===goal.r&&nextCpIdx>=checkpoints.length)
      setTimeout(()=>finish(true),SLIDE_DUR+50);
  }

  const dpMap={'dp-n':[0,-1],'dp-e':[1,0],'dp-s':[0,1],'dp-w':[-1,0]};
  const dpEls={};
  Object.keys(dpMap).forEach(id=>{
    const el=document.getElementById(id); dpEls[id]=el;
    el.addEventListener('pointerdown',e=>{
      e.preventDefault(); const [dc,dr]=dpMap[id]; doSlide(dc,dr); el.classList.add('pressed');
    });
    el.addEventListener('pointerup',()=>el.classList.remove('pressed'));
  });
  const kMap={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]};
  function onKD(e){
    if(kMap[e.key]){const [dc,dr]=kMap[e.key]; doSlide(dc,dr); e.preventDefault();}
  }
  window.addEventListener('keydown',onKD);

  function cleanup(){
    window.removeEventListener('keydown',onKD);
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    Object.values(dpEls).forEach(el=>el.classList.remove('pressed'));
  }
  function finish(ok){ if(done) return; done=true; cleanup(); puzzleFinish(ok,cb); }

  let lastTs=0;
  function draw(ts){
    if(done) return;
    const dt=lastTs?Math.min(ts-lastTs,100):16; lastTs=ts;

    if(sliding){
      slideT+=dt;
      const p=Math.min(1,slideT/SLIDE_DUR);
      visualC=slideFrom.c+(slideTo.c-slideFrom.c)*p;
      visualR=slideFrom.r+(slideTo.r-slideFrom.r)*p;
      if(p>=1) sliding=false;
    } else {
      visualC=pc; visualR=pr;
    }

    const t=ts;
    const bg=mx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*.7);
    bg.addColorStop(0,'#081828'); bg.addColorStop(0.6,'#040c14'); bg.addColorStop(1,'#010408');
    mx.fillStyle=bg; mx.fillRect(0,0,cw,ch);

    for(let r=0;r<GROWS;r++) for(let c=0;c<GCOLS;c++){
      const x=GPAD+c*GC, y=GPAD+r*GC;
      if(walls[r][c]){
        mx.fillStyle='#1a3040';
        mx.fillRect(x+1,y+1,GC-2,GC-2);
        mx.strokeStyle='rgba(100,180,220,0.3)'; mx.lineWidth=1;
        mx.strokeRect(x+1,y+1,GC-2,GC-2);
        mx.fillStyle='rgba(180,220,255,0.25)';
        mx.fillRect(x+2,y+2,GC-4,6);
      } else {
        const icePulse=0.03+0.02*Math.sin(t/800+c*0.7+r*0.5);
        mx.fillStyle=`rgba(100,180,220,${icePulse})`;
        mx.fillRect(x,y,GC,GC);
        mx.strokeStyle='rgba(180,240,255,0.07)'; mx.lineWidth=0.5;
        mx.beginPath(); mx.moveTo(x,y); mx.lineTo(x+GC,y); mx.stroke();
        mx.beginPath(); mx.moveTo(x,y); mx.lineTo(x,y+GC); mx.stroke();
      }
    }

    const srtX=GPAD+setup.sc*GC+GC/2, srtY=GPAD+setup.sr*GC+GC/2;
    mx.strokeStyle='rgba(136,221,255,0.22)'; mx.lineWidth=1.2;
    mx.beginPath(); mx.arc(srtX,srtY,GC*.34,0,Math.PI*2); mx.stroke();
    mx.beginPath(); mx.arc(srtX,srtY,GC*.18,0,Math.PI*2); mx.stroke();

    const cpCols=['#ffdd44','#ff9944','#ff5599'];
    const cpIcons=['①','②','③'];
    checkpoints.forEach((cp,i)=>{
      const cpx=GPAD+cp.c*GC, cpy=GPAD+cp.r*GC;
      if(i<nextCpIdx){
        mx.fillStyle='rgba(255,200,100,0.07)';
        mx.fillRect(cpx,cpy,GC,GC);
      } else {
        const cpPulse=0.5+0.5*Math.sin(t/380+i*1.3);
        mx.fillStyle=`rgba(255,200,80,${0.1+0.07*cpPulse})`;
        mx.fillRect(cpx,cpy,GC,GC);
        mx.fillStyle=cpCols[i]; mx.font=`${GC*.58}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.shadowColor=cpCols[i]; mx.shadowBlur=8+5*cpPulse;
        mx.fillText(cpIcons[i],cpx+GC/2,cpy+GC/2); mx.shadowBlur=0;
      }
    });

    const gx=GPAD+goal.c*GC, gy=GPAD+goal.r*GC;
    const gPulse=0.5+0.5*Math.sin(t/400);
    const goalOpen=nextCpIdx>=checkpoints.length;
    mx.fillStyle=`rgba(136,221,255,${(0.18+0.1*gPulse)*(goalOpen?1:0.28)})`;
    mx.fillRect(gx,gy,GC,GC);
    mx.fillStyle=goalOpen?'#88ddff':'#336688'; mx.font=`${GC*.6}px serif`;
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.shadowColor=goalOpen?'#88ddff':'#224455';
    mx.shadowBlur=goalOpen?(10+5*gPulse):2;
    mx.fillText('★',gx+GC/2,gy+GC/2); mx.shadowBlur=0;

    const px=GPAD+visualC*GC+GC/2, py=GPAD+visualR*GC+GC/2;
    const pPulse=0.7+0.3*Math.sin(t/200);
    mx.fillStyle=`rgba(136,221,255,${pPulse})`;
    mx.shadowColor='#88ddff'; mx.shadowBlur=14;
    mx.beginPath(); mx.arc(px,py,GC*.28,0,Math.PI*2); mx.fill();
    mx.shadowBlur=0;
    mx.fillStyle='#ffffff';
    mx.beginPath(); mx.arc(px,py,GC*.1,0,Math.PI*2); mx.fill();

    mazeRAF=requestAnimationFrame(draw);
  }

  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(draw);
}

// ── PUZZLE: MEMORY RUNES (Arcane) ─────────────────────────
function launchMemoryRunes(spell,cb){
  let done=false;
  document.getElementById('pztitle').textContent='Arcane Memory';
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  setDpadVisible(false);

  const RUNES=['⚡','❄️','🔥','🌀','✨','🌙','⭐','🔮'];
  const deck=[...RUNES,...RUNES].sort(()=>Math.random()-.5);
  const GCOLS=4, GROWS=4, CS=56, CGAP=7, CPAD=10;
  const cw=CPAD*2+GCOLS*(CS+CGAP)-CGAP;
  const ch=CPAD*2+GROWS*(CS+CGAP)-CGAP+16;

  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const cards=deck.map((rune,i)=>({
    rune, idx:i,
    col:Math.floor(i/GCOLS)%GCOLS===0?i%GCOLS:i%GCOLS,
    row:Math.floor(i/GCOLS),
    flipped:false, matched:false,
    flipProg:0,
  }));
  cards.forEach((c,i)=>{ c.col=i%GCOLS; c.row=Math.floor(i/GCOLS); });

  let revealed=[];
  let locked=false;
  let matchedCount=0;
  let timeLeft=Math.round(50*diffMult);

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent=timeLeft; timerEl.classList.remove('urgent');

  if(mazeTid) clearInterval(mazeTid);
  mazeTid=setInterval(()=>{
    if(done) return;
    timeLeft--; timerEl.textContent=timeLeft;
    if(timeLeft<=8) timerEl.classList.add('urgent');
    if(timeLeft<=0) finish(false);
  },1000);

  const sparks=Array.from({length:32},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    speed:0.12+Math.random()*.35, size:0.7+Math.random()*1.5,
    phase:Math.random()*Math.PI*2,
  }));

  function cardAt(px,py){
    for(const c of cards){
      if(c.matched) continue;
      const cx=CPAD+c.col*(CS+CGAP), cy=16+CPAD+c.row*(CS+CGAP);
      if(px>=cx&&px<cx+CS&&py>=cy&&py<cy+CS) return c;
    }
    return null;
  }

  function onPointer(e){
    if(done||locked) return;
    e.preventDefault();
    const rect=mc.getBoundingClientRect();
    const sx=mc.width/rect.width, sy=mc.height/rect.height;
    const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
    const card=cardAt(px,py);
    if(!card||card.flipped||card.matched) return;
    card.flipped=true;
    revealed.push(card);
    if(revealed.length===2){
      locked=true;
      if(revealed[0].rune===revealed[1].rune){
        setTimeout(()=>{
          revealed.forEach(c=>c.matched=true);
          revealed=[];
          matchedCount++;
          locked=false;
          if(matchedCount===RUNES.length) finish(true);
        },400);
      } else {
        setTimeout(()=>{
          revealed.forEach(c=>{c.flipped=false;});
          revealed=[]; locked=false;
        },800);
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

  function draw(ts){
    if(done) return;
    const t=ts||Date.now();
    const W=cw, H=ch;

    const bg=mx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.65);
    bg.addColorStop(0,'#32106a'); bg.addColorStop(0.5,'#1a0638'); bg.addColorStop(1,'#06011a');
    mx.fillStyle=bg; mx.fillRect(0,0,W,H);

    mx.save();
    mx.lineWidth=1.5;
    [[W*.22,0.35],[W*.4,0.22],[W*.56,0.13]].forEach(([r,a])=>{
      mx.strokeStyle=`rgba(160,70,220,${a})`;
      mx.beginPath(); mx.arc(W/2,H/2,r,0,Math.PI*2); mx.stroke();
    });
    mx.lineWidth=1;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+t/9000;
      mx.strokeStyle='rgba(200,120,255,0.28)';
      mx.beginPath();
      mx.moveTo(W/2+Math.cos(a)*W*.18,H/2+Math.sin(a)*H*.18);
      mx.lineTo(W/2+Math.cos(a)*W*.58,H/2+Math.sin(a)*H*.58);
      mx.stroke();
    }
    mx.restore();

    mx.save();
    sparks.forEach(s=>{
      s.y-=s.speed; if(s.y<-4){s.y=H+4; s.x=Math.random()*W;}
      mx.globalAlpha=0.1+0.28*Math.abs(Math.sin(t/850+s.phase));
      mx.fillStyle='#b090ff'; mx.shadowColor='#8844ff'; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.size,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    mx.fillStyle='#cc88ff'; mx.font='bold 10px Cinzel,serif';
    mx.textAlign='center'; mx.textBaseline='top';
    mx.fillText(`Pairs found: ${matchedCount} / ${RUNES.length}`, W/2, 3);

    cards.forEach(c=>{
      const cx=CPAD+c.col*(CS+CGAP), cy=16+CPAD+c.row*(CS+CGAP);
      if(c.matched){
        mx.fillStyle='rgba(200,136,255,0.12)';
        mx.strokeStyle='rgba(200,136,255,0.3)'; mx.lineWidth=1;
        mx.beginPath(); mx.roundRect(cx,cy,CS,CS,6); mx.fill(); mx.stroke();
        mx.fillStyle='rgba(200,136,255,0.35)';
        mx.font=`${CS*.5}px serif`; mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(c.rune,cx+CS/2,cy+CS/2);
        return;
      }
      if(c.flipped){
        const fg=mx.createLinearGradient(cx,cy,cx+CS,cy+CS);
        fg.addColorStop(0,'#3a1060'); fg.addColorStop(1,'#1a0440');
        mx.fillStyle=fg;
        mx.shadowColor='#cc88ff'; mx.shadowBlur=10;
        mx.beginPath(); mx.roundRect(cx,cy,CS,CS,6); mx.fill();
        mx.strokeStyle='#cc88ff'; mx.lineWidth=1.5;
        mx.beginPath(); mx.roundRect(cx,cy,CS,CS,6); mx.stroke();
        mx.shadowBlur=0;
        mx.fillStyle='#fff'; mx.font=`${CS*.5}px serif`;
        mx.textAlign='center'; mx.textBaseline='middle';
        mx.fillText(c.rune,cx+CS/2,cy+CS/2);
      } else {
        const runeBackPulse=0.4+0.15*Math.sin(t/600+c.idx*.4);
        mx.fillStyle=`rgba(60,20,90,${runeBackPulse+0.3})`;
        mx.shadowColor='rgba(120,60,180,0.4)'; mx.shadowBlur=5;
        mx.beginPath(); mx.roundRect(cx,cy,CS,CS,6); mx.fill();
        mx.strokeStyle=`rgba(160,80,220,0.6)`; mx.lineWidth=1.2;
        mx.beginPath(); mx.roundRect(cx,cy,CS,CS,6); mx.stroke();
        mx.shadowBlur=0;
        mx.strokeStyle=`rgba(180,100,255,${0.25+0.1*Math.sin(t/400+c.idx)})`;
        mx.lineWidth=0.8;
        mx.beginPath(); mx.arc(cx+CS/2,cy+CS/2,CS*.28,0,Math.PI*2); mx.stroke();
        mx.beginPath(); mx.arc(cx+CS/2,cy+CS/2,CS*.15,0,Math.PI*2); mx.stroke();
        for(let i=0;i<4;i++){
          const a=i/4*Math.PI*2+t/4000;
          mx.beginPath();
          mx.moveTo(cx+CS/2+Math.cos(a)*CS*.15,cy+CS/2+Math.sin(a)*CS*.15);
          mx.lineTo(cx+CS/2+Math.cos(a)*CS*.28,cy+CS/2+Math.sin(a)*CS*.28);
          mx.stroke();
        }
      }
    });

    mazeRAF=requestAnimationFrame(draw);
  }

  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(draw);
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
  const s1=cfg.specials[0], s2=cfg.specials[1];
  document.getElementById('spec1-ico').textContent=s1.ico;
  document.getElementById('spec1-name').textContent=s1.label;
  document.getElementById('spec1-cost').textContent=s1.costLabel;
  document.getElementById('spec2-ico').textContent=s2.ico;
  document.getElementById('spec2-name').textContent=s2.label;
  document.getElementById('spec2-cost').textContent=s2.costLabel;
  // Color the special buttons by character
  const col=cfg.col;
  ['bspecial1','bspecial2'].forEach(id=>{
    const btn=document.getElementById(id);
    btn.style.borderColor=col;
    btn.style.color=col;
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
  p1Key=key;
  p1Cfg=CHAR_DEFS[key];
  ponderMode=(key==='ponder');
  if(ponderMode){
    p2Key=null; p2Cfg=null;
  } else {
    const others=Object.keys(CHAR_DEFS).filter(k=>k!==key&&k!=='ponder');
    p2Key=others[Math.floor(Math.random()*others.length)];
    p2Cfg=CHAR_DEFS[p2Key];
  }
  loadSprites();
  updateActionBar(p1Cfg);
  document.getElementById('p1name').textContent=p1Cfg.name;
  document.getElementById('p1-portrait').style.visibility='';
  document.getElementById('p1-portrait').src='portraits/'+p1Key+'.png';
  const p2hud=document.querySelector('.phud-p2');
  if(ponderMode){
    p2hud.style.visibility='hidden';
  } else {
    p2hud.style.visibility='';
    document.getElementById('p2name').textContent=p2Cfg.name;
    document.getElementById('p2-portrait').src='portraits/'+p2Key+'.png';
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

  document.getElementById('btn-start').addEventListener('click',()=>showScreen('char-screen'));
  document.getElementById('btn-back').addEventListener('click',()=>showScreen('title-screen'));

  document.getElementById('pick-eldrad').addEventListener('click',()=>showWizardDetail('eldrad'));
  document.getElementById('pick-mal').addEventListener('click',()=>showWizardDetail('mal'));
  document.getElementById('pick-sylvara').addEventListener('click',()=>showWizardDetail('sylvara'));
  document.getElementById('pick-aurelia').addEventListener('click',()=>showWizardDetail('aurelia'));
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
  document.getElementById('bspecial1').addEventListener('click',()=>act('special1'));
  document.getElementById('bspecial2').addEventListener('click',()=>act('special2'));

  SPELLS.forEach(spell=>{
    const btn=document.getElementById('bspell-'+spell.element);
    if(btn) btn.addEventListener('click',()=>act(spell.element));
  });

  document.getElementById('sp-cancel').addEventListener('click',()=>{
    gs.busy=false;
    showScreen('battle-screen');
  });

  document.getElementById('btn-continue').addEventListener('click',()=>{
    battleRunning=false;
    document.getElementById('overlay').classList.remove('active');
    showScreen('title-screen');
  });

  window.addEventListener('resize',()=>{ if(battleRunning) resizeBC(); });

  // Load character data — must complete before a character can be picked
  fetch('characters.json')
    .then(r=>r.json())
    .then(data=>{ CHAR_DEFS=data; p1Cfg=CHAR_DEFS[p1Key]; p2Cfg=CHAR_DEFS[p2Key]; loadSprites(); })
    .catch(err=>console.error('Failed to load characters.json:', err));
});
