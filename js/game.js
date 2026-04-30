// ── CONSTANTS ──────────────────────────────────────────────
const MAX_HP=100, MAX_MANA=5, SHIELD_COST=1, SPELL_COST=3, SHIELD_TURNS=2;
const SPELLS=[
  {name:'Lightning Bolt',icon:'⚡',dmg:35,col:'#ffff44'},
  {name:'Frost Nova',    icon:'❄', dmg:28,col:'#88ddff'},
  {name:'Arcane Surge',  icon:'🌀',dmg:40,col:'#cc88ff'},
  {name:'Inferno',       icon:'🔥',dmg:32,col:'#ff8844'},
];

// ── STATE ──────────────────────────────────────────────────
let gs={}, pendingSpell=null, puzzleCB=null, aiTid=null;
let bW=0, bH=0;
let mazeRAF=null, mazeTid=null;

function newState(){
  gs={
    p1:{hp:MAX_HP,mana:2,shield:0},
    p2:{hp:MAX_HP,mana:2,shield:0},
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
  // stars
  [[20,10],[80,15],[140,8],[200,20],[300,6],[380,18],[440,12],[60,30],[250,25],[420,5]].forEach(([sx,sy])=>{
    bx.globalAlpha=0.3+0.4*Math.sin(Date.now()/900+sx);
    bx.fillStyle='#fff'; bx.fillRect(sx*(bW/480),sy*(bH/250),1.5,1.5);
  });
  bx.globalAlpha=1;
  // moon
  bx.fillStyle='#e8d4a0'; bx.shadowColor='#e8d4a0'; bx.shadowBlur=20;
  bx.beginPath(); bx.arc(bW*.5,bH*.16,bH*.1,0,Math.PI*2); bx.fill();
  bx.fillStyle='#09041a'; bx.shadowBlur=0;
  bx.beginPath(); bx.arc(bW*.5+bH*.04,bH*.14,bH*.09,0,Math.PI*2); bx.fill();
  // ground
  const gg=bx.createLinearGradient(0,bH*.72,0,bH);
  gg.addColorStop(0,'#1a0a30'); gg.addColorStop(1,'#0a0418');
  bx.fillStyle=gg; bx.fillRect(0,bH*.72,bW,bH*.28);
  bx.strokeStyle='rgba(138,58,170,0.38)'; bx.lineWidth=1;
  bx.beginPath(); bx.moveTo(0,bH*.72); bx.lineTo(bW,bH*.72); bx.stroke();
  runeRing(bW*.22,bH*.83,28,'rgba(74,240,255,0.13)');
  runeRing(bW*.78,bH*.83,28,'rgba(255,74,110,0.13)');
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
const SPRITE_CFG = {
  p1: { url: 'sprites/mage-light.png' },
  p2: { url: 'sprites/mage-dark.png'  },
  frameW: 48, frameH: 64, frames: 4,
  animRows: { idle: 0, cast: 1, hit: 2, shield: 3, death: 4 },
};

const sprites = { p1: null, p2: null };
const spriteStatus = { p1: 'loading', p2: 'loading' };

function loadSprites() {
  ['p1','p2'].forEach(who => {
    const img = new Image();
    img.onload  = () => { sprites[who] = img; spriteStatus[who] = 'ready'; };
    img.onerror = () => { spriteStatus[who] = 'failed'; };
    img.src = SPRITE_CFG[who].url;
  });
}
loadSprites();

const animState = {
  p1: { frame: 0, timer: 0 },
  p2: { frame: 0, timer: 0 },
};
const FRAME_MS = 180;
const ANIM_FRAMES = { idle: 3, cast: 4, hit: 2, shield: 2, death: 4 };

function tickAnimFrame(who, dt) {
  const a = animState[who];
  a.timer += dt;
  if(a.timer >= FRAME_MS) {
    a.timer -= FRAME_MS;
    const frameCount = ANIM_FRAMES[gs[who+'anim']] ?? SPRITE_CFG.frames;
    a.frame = (a.frame + 1) % frameCount;
  }
}

let lastFrameTime = 0;

function drawWiz(x, y, sz, col, flip, anim, shielded, who) {
  bx.save();

  if(shielded > 0) {
    const gv = 0.08 + 0.05 * Math.sin(Date.now() / 300);
    bx.beginPath(); bx.arc(x, y - sz * 0.5, sz * 0.75, 0, Math.PI * 2);
    bx.fillStyle   = `rgba(74,240,255,${gv})`; bx.fill();
    bx.strokeStyle = `rgba(74,240,255,${gv * 5})`; bx.lineWidth = 1.5; bx.stroke();
  }

  const img = sprites[who];
  if(img && spriteStatus[who] === 'ready') {
    const cfg    = SPRITE_CFG;
    const row    = cfg.animRows[anim] ?? cfg.animRows.idle;
    const frame  = animState[who].frame;
    const srcX   = frame * cfg.frameW;
    const srcY   = row   * cfg.frameH;

    const scale  = sz / cfg.frameH;
    const dw     = cfg.frameW * scale;
    const dh     = cfg.frameH * scale;

    const lift  = anim === 'cast' ? -sz * 0.06 : 0;
    const shake = anim === 'hit'  ? Math.sin(Date.now() / 60) * sz * 0.03 : 0;
    const bob   = anim === 'idle' ? Math.sin(Date.now() / 500 + x) * sz * 0.015 : 0;
    const dy    = lift + shake + bob;

    if(flip) {
      bx.scale(-1, 1);
      bx.drawImage(img, srcX, srcY, cfg.frameW, cfg.frameH,
                   -x - dw / 2, y - dh + dy, dw, dh);
    } else {
      bx.drawImage(img, srcX, srcY, cfg.frameW, cfg.frameH,
                   x - dw / 2, y - dh + dy, dw, dh);
    }
  } else {
    // Fallback: drawn wizard
    if(flip){bx.scale(-1,1); x=-x;}
    const bob   = anim==='idle' ? Math.sin(Date.now()/500+x)*.015*sz : 0;
    const lift  = anim==='cast' ? -sz*.06 : 0;
    const shake = anim==='hit'  ? Math.sin(Date.now()/60)*.03*sz : 0;
    const dy    = bob+lift+shake;
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
    const sfx=x+sz*.3, stopY=y-sz*.88+dy+(anim==='cast'?-sz*.07:0);
    bx.strokeStyle='#8B6914'; bx.lineWidth=2.5;
    bx.beginPath(); bx.moveTo(sfx,y+dy); bx.lineTo(sfx,stopY); bx.stroke();
    const op=.5+.5*Math.sin(Date.now()/400);
    bx.fillStyle=anim==='cast'?`rgba(255,220,50,${.8+op*.2})`:col;
    bx.shadowColor=anim==='cast'?'#ffff88':col; bx.shadowBlur=anim==='cast'?18:7;
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
    const a=Math.random()*Math.PI*2,sp=1.5+Math.random()*3.5;
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

let battleRunning=false;
function battleLoop(ts){
  if(!battleRunning) return;
  requestAnimationFrame(battleLoop);
  const dt = lastFrameTime ? Math.min(ts - lastFrameTime, 100) : 16;
  lastFrameTime = ts;
  tickAnimFrame('p1', dt);
  tickAnimFrame('p2', dt);
  resizeBC();
  drawBG();
  const gy=bH*.74, wsz=bH*.3;
  drawWiz(bW*.22,gy,wsz,'#4af0ff',true, gs.p1anim,gs.p1.shield,'p1');
  drawWiz(bW*.78,gy,wsz,'#ff4a6e',false,gs.p2anim,gs.p2.shield,'p2');
  tickParts(); tickFloats();
  if(!gs.myTurn&&!gs.busy){
    bx.fillStyle='rgba(255,74,110,0.7)'; bx.font='bold 10px Cinzel,serif';
    bx.textAlign='center'; bx.fillText('MALACHAR IS CASTING…',bW*.5,bH*.56);
  }
  refreshHUD();
}

// ── HUD ────────────────────────────────────────────────────
function refreshHUD(){
  document.getElementById('p1hpf').style.width=Math.max(0,gs.p1.hp/MAX_HP*100)+'%';
  document.getElementById('p2hpf').style.width=Math.max(0,gs.p2.hp/MAX_HP*100)+'%';
  document.getElementById('sh1').style.opacity=gs.p1.shield>0?'1':'0.18';
  document.getElementById('sh2').style.opacity=gs.p2.shield>0?'1':'0.18';
  document.getElementById('roundlbl').textContent='Round '+gs.round;
  pips('mp1',gs.p1.mana); pips('mp2',gs.p2.mana);
  const busy=!gs.myTurn||gs.busy;
  document.getElementById('bshield').classList.toggle('off',  busy||gs.p1.mana<SHIELD_COST);
  document.getElementById('bchannel').classList.toggle('off', busy);
  document.getElementById('bspell').classList.toggle('off',   busy||gs.p1.mana<SPELL_COST);
}

function pips(id,val){
  const el=document.getElementById(id); el.innerHTML='';
  for(let i=0;i<MAX_MANA;i++){
    const d=document.createElement('div');
    d.className='pip'+(i<val?' on':''); el.appendChild(d);
  }
}

// ── PLAYER ACTIONS ─────────────────────────────────────────
function act(type){
  if(!gs.myTurn||gs.busy) return;
  if(type==='channel'){
    gs.p1.mana=Math.min(MAX_MANA,gs.p1.mana+2);
    addFloat(bW*.22,bH*.38,'+2 Mana','#88aaff',13);
    anim('p1','cast',700); endMyTurn(); return;
  }
  if(type==='shield'){
    if(gs.p1.mana<SHIELD_COST) return;
    gs.p1.mana-=SHIELD_COST; gs.p1.shield=SHIELD_TURNS;
    addFloat(bW*.22,bH*.33,'🛡 Shielded!','#4af0ff',12);
    anim('p1','shield',700); endMyTurn(); return;
  }
  if(type==='spell'){
    if(gs.p1.mana<SPELL_COST) return;
    const spell=SPELLS[Math.floor(Math.random()*SPELLS.length)];
    pendingSpell=spell;
    launchMaze(spell,ok=>{
      if(ok){
        gs.p1.mana-=SPELL_COST;
        castSpell(spell,gs.p2,bW*.78,bH*.38,'p1');
      } else {
        addFloat(bW*.22,bH*.33,'Fizzled!','#ff8844',13);
        gs.p1.mana=Math.max(0,gs.p1.mana-1);
      }
      endMyTurn();
    });
  }
}

function castSpell(spell,target,tx,ty,caster){
  let dmg=spell.dmg;
  if(target.shield>0){dmg=Math.round(dmg*.3); target.shield--; addFloat(tx,ty-20,'🛡 Absorbed!','#4af0ff',11);}
  target.hp=Math.max(0,target.hp-dmg);
  spawnParts(tx,ty,spell.col,22);
  addFloat(tx,ty,'-'+dmg,spell.col,22);
  flash(spell.col);
  if(caster==='p1'){anim('p1','cast',800); anim('p2','hit',800);}
  else             {anim('p2','cast',800); anim('p1','hit',800);}
  checkWin();
}

function anim(who,state,ms){
  gs[who+'anim']=state;
  setTimeout(()=>{ if(gs[who+'anim']!=='death') gs[who+'anim']='idle'; },ms);
}

function endMyTurn(){
  gs.myTurn=false;
  if(gs.p1.shield>0) gs.p1.shield--;
  gs.round++; gs.busy=true;
  if(aiTid) clearTimeout(aiTid);
  aiTid=setTimeout(doAI,1400);
}

// ── AI TURN ────────────────────────────────────────────────
function doAI(){
  if(!gs||!battleRunning) return;
  gs.busy=false;
  const ai=gs.p2;
  let action;
  if(ai.mana>=SPELL_COST)                                      action='spell';
  else if(ai.mana>=SHIELD_COST&&ai.shield===0&&Math.random()<.3) action='shield';
  else                                                           action='channel';

  if(action==='channel'){
    ai.mana=Math.min(MAX_MANA,ai.mana+2);
    addFloat(bW*.78,bH*.38,'+2 Mana','#ff8888',13);
    anim('p2','cast',700);
  } else if(action==='shield'){
    ai.mana-=SHIELD_COST; ai.shield=SHIELD_TURNS;
    addFloat(bW*.78,bH*.33,'🛡 Shield!','#ff4a6e',12);
    anim('p2','shield',700);
  } else {
    const spell=SPELLS[Math.floor(Math.random()*SPELLS.length)];
    addFloat(bW*.78,bH*.26,spell.icon+' '+spell.name+'!',spell.col,12);
    anim('p2','cast',800);
    setTimeout(()=>{
      if(Math.random()<.8){ai.mana-=SPELL_COST; castSpell(spell,gs.p1,bW*.22,bH*.38,'p2');}
      else{addFloat(bW*.78,bH*.33,'Fizzled!','#ff8844',12); ai.mana=Math.max(0,ai.mana-1);}
      finishAI();
    },700);
    return;
  }
  if(ai.shield>0) ai.shield--;
  finishAI();
}

function finishAI(){gs.myTurn=true; gs.busy=false; checkWin();}

function checkWin(){
  if(gs.p1.hp<=0) endGame(false);
  else if(gs.p2.hp<=0) endGame(true);
}

function endGame(won){
  gs.myTurn=false; gs.busy=true;
  gs[won?'p2anim':'p1anim']='death';
  setTimeout(()=>{
    document.getElementById('ovico').textContent=won?'🏆':'💀';
    document.getElementById('ovtitle').textContent=won?'Victory!':'Defeated!';
    document.getElementById('ovtitle').style.color=won?'#f0cc6a':'#ff4a6e';
    document.getElementById('ovdesc').textContent=won?'Malachar falls before your arcane might!':'Your magic was not enough. Study and return!';
    document.getElementById('overlay').classList.add('active');
  }, 900);
}

// ── MAZE PUZZLE ────────────────────────────────────────────
const mc=document.getElementById('mcanvas');
const mx=mc.getContext('2d');
const CELL=24, COLS=15, ROWS=15;
const DR=[-1,0,1,0], DC=[0,1,0,-1]; // N E S W

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

function braidMaze(walls, factor=0.5){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const open=[0,1,2,3].filter(d=>canGo(walls,c,r,d));
    if(open.length===1 && Math.random()<factor){
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
        const nc=col+DC[d], nr=row+DR[d];
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&dist[nr][nc]===-1){
          dist[nr][nc]=dist[row][col]+1; q.push([nc,nr]);
        }
      }
    }
  }
  return ROWS+COLS;
}

function launchMaze(spell,cb){
  puzzleCB=cb;
  document.getElementById('pzspell').textContent=spell.icon+' Casting: '+spell.name;
  const walls=genMaze();
  braidMaze(walls);
  const cw=COLS*CELL+2, ch=ROWS*CELL+2;
  mc.width=cw; mc.height=ch;
  const mw=Math.min(cw,(window.innerWidth||360)-32);
  mc.style.width=mw+'px'; mc.style.height='auto';

  const mk={x:.5,y:.5,dir:1,spd:.05};
  const goal={col:COLS-1,row:ROWS-1};
  const sparkles=Array.from({length:28},()=>({
    x:Math.random()*cw, y:Math.random()*ch,
    speed:0.15+Math.random()*.45,
    size:0.7+Math.random()*1.5,
    phase:Math.random()*Math.PI*2,
  }));
  const pathLen=shortestPathLength(walls);
  let done=false, timeLeft=Math.max(15,Math.round(pathLen/3*3));

  const timerEl=document.getElementById('pztimer');
  timerEl.textContent=timeLeft; timerEl.classList.remove('urgent');

  if(mazeTid) clearInterval(mazeTid);
  mazeTid=setInterval(()=>{
    if(done) return;
    timeLeft--; timerEl.textContent=timeLeft;
    if(timeLeft<=5) timerEl.classList.add('urgent');
    if(timeLeft<=0) finish(false);
  },1000);

  function setDir(d){ mk.dir = d; }
  const dpMap = { 'dp-n':0, 'dp-e':1, 'dp-s':2, 'dp-w':3 };
  const dpEls = {};
  Object.keys(dpMap).forEach(id=>{
    const el = document.getElementById(id);
    dpEls[id] = el;
    el.addEventListener('pointerdown', e=>{ e.preventDefault(); setDir(dpMap[id]); el.classList.add('pressed'); });
    el.addEventListener('pointerup',   e=>{ el.classList.remove('pressed'); });
  });
  function onKD(e){
    const m={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};
    if(m[e.key]!==undefined){setDir(m[e.key]); e.preventDefault();}
  }
  window.addEventListener('keydown',onKD);

  function cleanup(){
    window.removeEventListener('keydown',onKD);
    if(mazeRAF){cancelAnimationFrame(mazeRAF); mazeRAF=null;}
    if(mazeTid){clearInterval(mazeTid); mazeTid=null;}
    Object.values(dpEls).forEach(el=>el.classList.remove('pressed'));
  }

  function finish(ok){
    if(done)return; done=true; cleanup();
    battleRunning=true;
    showScreen('battle-screen');
    requestAnimationFrame(battleLoop);
    if(puzzleCB){puzzleCB(ok); puzzleCB=null;}
  }

  function update(){
    const col = Math.floor(mk.x);
    const row = Math.floor(mk.y);
    const cx = col + 0.5;
    const cy = row + 0.5;

    if(mk.dir === 1 || mk.dir === 3){
      mk.y += (cy - mk.y) * 0.2;
      const step = mk.dir === 1 ? mk.spd : -mk.spd;
      const leading = mk.x + step + (mk.dir === 1 ? 0.5 : -0.5);
      const nextCol = Math.floor(leading);
      if(nextCol !== col && !canGo(walls, col, row, mk.dir)){
        mk.x = cx;
      } else {
        mk.x += step;
      }
    } else {
      mk.x += (cx - mk.x) * 0.2;
      const step = mk.dir === 2 ? mk.spd : -mk.spd;
      const leading = mk.y + step + (mk.dir === 2 ? 0.5 : -0.5);
      const nextRow = Math.floor(leading);
      if(nextRow !== row && !canGo(walls, col, row, mk.dir)){
        mk.y = cy;
      } else {
        mk.y += step;
      }
    }

    mk.x = Math.max(0.05, Math.min(COLS - 0.05, mk.x));
    mk.y = Math.max(0.05, Math.min(ROWS - 0.05, mk.y));
    if(Math.floor(mk.x) === goal.col && Math.floor(mk.y) === goal.row) finish(true);
  }

  function drawMaze(){
    const ox=1,oy=1;
    const t=Date.now();
    const W=mc.width, H=mc.height;

    // Atmospheric background gradient
    const bg=mx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.65);
    bg.addColorStop(0,'#32106a'); bg.addColorStop(0.5,'#1a0638'); bg.addColorStop(1,'#06011a');
    mx.fillStyle=bg; mx.fillRect(0,0,W,H);

    // Arcane ritual circles (slowly rotating spokes)
    mx.save();
    mx.lineWidth=1.5;
    [[W*.22,0.35],[W*.4,0.22],[W*.56,0.13]].forEach(([r,a])=>{
      mx.strokeStyle=`rgba(160,70,220,${a})`;
      mx.beginPath(); mx.arc(W/2,H/2,r,0,Math.PI*2); mx.stroke();
    });
    mx.lineWidth=1;
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+t/9000;
      mx.strokeStyle='rgba(200,120,255,0.32)';
      mx.beginPath();
      mx.moveTo(W/2+Math.cos(a)*W*.18,H/2+Math.sin(a)*H*.18);
      mx.lineTo(W/2+Math.cos(a)*W*.58,H/2+Math.sin(a)*H*.58);
      mx.stroke();
    }
    mx.restore();

    // Drifting sparkles
    mx.save();
    sparkles.forEach(s=>{
      s.y-=s.speed;
      if(s.y<-4){s.y=H+4; s.x=Math.random()*W;}
      mx.globalAlpha=0.12+0.32*Math.abs(Math.sin(t/850+s.phase));
      mx.fillStyle='#b090ff';
      mx.shadowColor='#8844ff'; mx.shadowBlur=5;
      mx.beginPath(); mx.arc(s.x,s.y,s.size,0,Math.PI*2); mx.fill();
    });
    mx.globalAlpha=1; mx.shadowBlur=0;
    mx.restore();

    // Goal pulsing aura rings + floor glow + star
    const gx=ox+goal.col*CELL+CELL/2, gy=oy+goal.row*CELL+CELL/2;
    const pulse=0.5+0.5*Math.sin(t/350);
    mx.save();
    [CELL*1.9,CELL*1.35].forEach((r,i)=>{
      mx.strokeStyle=`rgba(201,168,76,${(0.13+0.1*pulse)*(1-i*.45)})`;
      mx.lineWidth=1;
      mx.beginPath(); mx.arc(gx,gy,r,0,Math.PI*2); mx.stroke();
    });
    mx.restore();
    mx.fillStyle='rgba(201,168,76,0.14)'; mx.fillRect(ox+goal.col*CELL,oy+goal.row*CELL,CELL,CELL);
    mx.fillStyle='#f0cc6a'; mx.font=`${CELL*.55}px serif`;
    mx.textAlign='center'; mx.textBaseline='middle';
    mx.shadowColor='#c9a84c'; mx.shadowBlur=8+7*pulse;
    mx.fillText('★',gx,gy); mx.shadowBlur=0;

    // Maze walls (batched single draw call)
    mx.beginPath();
    mx.strokeStyle='rgba(160,70,210,0.88)'; mx.lineWidth=1.5;
    for(let r=0;r<=ROWS;r++) for(let c=0;c<COLS;c++) if(walls.H[r][c]){
      mx.moveTo(ox+c*CELL,oy+r*CELL); mx.lineTo(ox+(c+1)*CELL,oy+r*CELL);
    }
    for(let r=0;r<ROWS;r++) for(let c=0;c<=COLS;c++) if(walls.V[r][c]){
      mx.moveTo(ox+c*CELL,oy+r*CELL); mx.lineTo(ox+c*CELL,oy+(r+1)*CELL);
    }
    mx.stroke();

    // Player orb + direction arrow
    const px=ox+mk.x*CELL, py=oy+mk.y*CELL;
    const pulseO=.65+.35*Math.sin(t/200);
    mx.fillStyle=`rgba(74,240,255,${pulseO})`;
    mx.shadowColor='#4af0ff'; mx.shadowBlur=14;
    mx.beginPath(); mx.arc(px,py,CELL*.26,0,Math.PI*2); mx.fill(); mx.shadowBlur=0;
    const al=CELL*.22, adx=DC[mk.dir]*al, ady=DR[mk.dir]*al;
    const ang=Math.atan2(ady,adx);
    mx.strokeStyle='rgba(255,255,255,0.8)'; mx.lineWidth=1.5;
    mx.beginPath(); mx.moveTo(px,py); mx.lineTo(px+adx,py+ady); mx.stroke();
    mx.fillStyle='rgba(255,255,255,0.8)';
    mx.beginPath();
    mx.moveTo(px+adx,py+ady);
    mx.lineTo(px+adx-Math.cos(ang-.4)*al*.45,py+ady-Math.sin(ang-.4)*al*.45);
    mx.lineTo(px+adx-Math.cos(ang+.4)*al*.45,py+ady-Math.sin(ang+.4)*al*.45);
    mx.closePath(); mx.fill();
  }

  function frame(){if(done)return; update(); drawMaze(); mazeRAF=requestAnimationFrame(frame);}

  showScreen('puzzle-screen');
  mazeRAF=requestAnimationFrame(frame);
}

// ── FLASH ──────────────────────────────────────────────────
function flash(col){
  const el=document.getElementById('flash');
  el.style.background=col; el.classList.add('on');
  setTimeout(()=>el.classList.remove('on'),120);
}

// ── BUTTON WIRING ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-start').addEventListener('click',()=>{
    newState();
    battleRunning=true;
    resizeBC();
    showScreen('battle-screen');
    requestAnimationFrame(battleLoop);
  });

  document.getElementById('btn-help').addEventListener('click',()=>{
    document.getElementById('helpmodal').style.display='flex';
  });
  document.getElementById('btn-closehelp').addEventListener('click',()=>{
    document.getElementById('helpmodal').style.display='none';
  });

  document.getElementById('bshield').addEventListener('click', ()=>act('shield'));
  document.getElementById('bchannel').addEventListener('click',()=>act('channel'));
  document.getElementById('bspell').addEventListener('click',  ()=>act('spell'));

  document.getElementById('btn-continue').addEventListener('click',()=>{
    battleRunning=false;
    document.getElementById('overlay').classList.remove('active');
    showScreen('title-screen');
  });

  window.addEventListener('resize',()=>{ if(battleRunning) resizeBC(); });
});
