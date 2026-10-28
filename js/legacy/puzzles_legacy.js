// ── LEGACY PUZZLES ─────────────────────────────────────────
// Original puzzle implementations for Lightning Bolt, Frost Nova and Arcane
// Surge, plus the Mana Burn minigame (Dark used it before the Blood Circle).
// Not loaded by the game. To re-enable one, load this file in index.html and point the element's entry in ELEM_MINIGAME (js/game.js) at it.

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
  let timeLeft=Math.max(Math.round(7.1875*diffMult),Math.round(pathLen*.71875*diffMult));
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

