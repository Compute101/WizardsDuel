// ═══════════════════════════════════════════════════════════════════
//  EXPLORE HERO — character creation (step 7 of docs/world-design.md).
//  You make your own wizard: a man or a woman, young, middle-aged or old
//  (humans only for now), one of the base figures for that, robes, hair,
//  an element (your magic's colour now; your first spells and your one
//  barred element later) and a name. Looks are recolours of base figures
//  in the house style, as the doc decided (no layered hats and robes):
//  the purple robe and the blue magic of a base move to the chosen colours,
//  and the silver hair inside its hair box to the chosen hair colour.
//  open(root, {hero, edit}) → Promise of the hero record; def(hero) →
//  Promise of a character entry (sprite and face as data URLs) that the
//  duel engine and Explore use under the key 'hero'.
// ═══════════════════════════════════════════════════════════════════
(function(){
'use strict';
// Base figures: 512×768-ish stills facing right, feet on the bottom edge, purple robe and hat, blue
// magic, silver hair. hair / face: boxes as fractions (x0, y0, x1, y1) and (x, y, size of width).
// skin: boxes round the face and hands (skin tones only change in there; a fifth number caps the
// saturation in that box, so a staff held in the hand stays wood); noTrim: boxes where the gold
// isn't trim (the staff, the belt and pouches, the boots): trim is gold that touches the robe outside them.
// Two per sex and age are wanted (the art brief in docs/world-design.md, "Character creation");
// until a slot has its own, the same sex's figures stand in (standIn in the creator).
// The figures from the user's art are in sprites/hero/figures.json (cut, with their boxes, by
// tools/cut_hero_figures.py; trimLo: their gold trim sits above wood and leather in hue, so they need
// no noTrim boxes). The old witch (Wrenford's dons' base) is old woman figure 1, hand-boxed here.
const BASES = [
  {id:'f_old_1', sex:'f', age:'old', src:'sprites/folk/source/old_witch.png',  hair:[0.18,0.18,0.60,0.42], face:[0.37,0.15,0.30],
    skin:[[0.44,0.20,0.62,0.345],[0.10,0.33,0.22,0.41,0.88],[0.70,0.30,0.87,0.42,0.88]], noTrim:[[0,0,0.22,1],[0.28,0.43,0.66,0.62],[0,0.9,1,1]]},
];
let basesReady=null;
function loadBases(){
  return basesReady||(basesReady=fetch('sprites/hero/figures.json').then(r=>r.json()).then(list=>{
    const order=['young','middle','old'];
    list.sort((a,b)=>order.indexOf(a.age)-order.indexOf(b.age)||a.id.localeCompare(b.id));
    for(const f of list) if(!BASES.some(b=>b.id===f.id)) BASES.push(f);
    BASES.sort((a,b)=>order.indexOf(a.age)-order.indexOf(b.age)||(a.id==='f_old_1'?-1:b.id==='f_old_1'?1:a.id.localeCompare(b.id)));
  }).catch(()=>{}));
}
const AGES = [['young','Young'],['middle','Middle-aged'],['old','Old']];
// trim: hue°, saturation ×, value × (null keeps the gold)
const TRIMS = [
  {name:'Gold', t:null, sw:'#e0a830'}, {name:'Silver', t:[220,0.12,1.08], sw:'#c8ccd8'}, {name:'Copper', t:[16,0.95,0.85], sw:'#c0602a'},
  {name:'Bone', t:[40,0.25,1.15], sw:'#e8dcc0'}, {name:'Black', t:[260,0.15,0.38], sw:'#2a2630'}, {name:'Scarlet', t:[358,0.95,0.9], sw:'#c0202a'},
  {name:'Jade', t:[140,0.8,0.8], sw:'#2a9a5a'}, {name:'Sky', t:[200,0.75,1.05], sw:'#4aa8e8'},
];
// skin: the base's skin, light to dark mapped onto a shadow → highlight pair (null keeps it)
const SKINS = [
  {name:'Natural', k:null, sw:'#e0a080'}, {name:'Pale', k:['#5a3830','#f8dccc'], sw:'#f6d8c8'}, {name:'Fair', k:['#6e4230','#f8d0aa'], sw:'#eec09a'},
  {name:'Olive', k:['#4e3218','#dcae7a'], sw:'#c89a68'}, {name:'Tan', k:['#42260f','#cc8e5a'], sw:'#b07848'},
  {name:'Brown', k:['#2e1608','#a86c40'], sw:'#8a5530'}, {name:'Deep', k:['#1a0c06','#7e4c2c'], sw:'#5e3620'},
];
// robe: hue°, saturation ×, value × (null keeps the base's purple)
const ROBES = [
  {name:'Violet', r:null, sw:'#7a3cc8'}, {name:'Crimson', r:[355,0.95,0.85], sw:'#b01e2a'}, {name:'Midnight', r:[225,0.65,0.55], sw:'#22336e'},
  {name:'Forest', r:[140,0.7,0.62], sw:'#1f6a3a'}, {name:'Russet', r:[24,0.75,0.8], sw:'#9a4a1e'}, {name:'Ochre', r:[42,0.85,0.9], sw:'#b8862a'},
  {name:'Teal', r:[180,0.75,0.62], sw:'#1e7a7a'}, {name:'Black', r:[250,0.12,0.42], sw:'#22202a'}, {name:'Ash', r:[0,0.04,0.78], sw:'#8a8a90'},
  {name:'Rose', r:[335,0.55,0.95], sw:'#b85c88'},
];
// hair: the base's silver, light to dark mapped onto a dark → light pair (null keeps it)
const HAIRS = [
  {name:'Silver', h:null, sw:'#c8c8d0'}, {name:'White', h:['#9a9aa0','#ffffff'], sw:'#f4f4f4'}, {name:'Black', h:['#0c0a10','#4a4650'], sw:'#1a181e'},
  {name:'Brown', h:['#2a160a','#8a5a32'], sw:'#5a3618'}, {name:'Auburn', h:['#3a0e06','#b0482a'], sw:'#8a2c16'},
  {name:'Blonde', h:['#6a4a1a','#f0d890'], sw:'#d8b860'}, {name:'Copper', h:['#5a1a04','#f08a3a'], sw:'#d0622a'},
];
// element: its colour, and the magic's new hue (hue°, sat ×, val ×; null keeps the base's blue)
const ELEMS = [
  {id:'fire', name:'Fire', col:'#ff6622', m:[18,1,1.05]},        {id:'air', name:'Air', col:'#c8f4ec', m:[165,0.35,1.15]},
  {id:'lightning', name:'Lightning', col:'#ffee44', m:[52,1,1.15]},{id:'arcane', name:'Arcane', col:'#cc88ff', m:[275,0.8,1.05]},
  {id:'water', name:'Water', col:'#3a8cff', m:null},             {id:'earth', name:'Earth', col:'#d0a060', m:[35,0.75,0.9]},
  {id:'ice', name:'Ice', col:'#88ddff', m:[192,0.55,1.15]},       {id:'dark', name:'Dark', col:'#9944cc', m:[285,0.95,0.7]},
];
const opposite = id => ELEMS[(ELEMS.findIndex(e=>e.id===id)+4)%8];
const NAMES = {
  m:['Aldous','Bram','Corwin','Edric','Fenwick','Garrow','Hal','Ivo','Jory','Lucan','Merrick','Osric','Pell','Rowan','Silas','Tobin','Wystan','Anselm','Cuthbert','Leofric'],
  f:['Ada','Briony','Cressida','Elsbeth','Fenna','Greta','Hesper','Isaut','Juniper','Linnet','Maud','Nessa','Odile','Rosamund','Sabine','Tamsin','Avice','Mildred','Orla','Petronel'],
};
const AGE_HAIR = {young:'Brown', middle:'Black', old:'Silver'};   // a new look's starting hair

const figuresFor = (sex,age) => { const own=BASES.filter(b=>b.sex===sex&&b.age===age); return own.length?{list:own,standIn:false}:{list:BASES.filter(b=>b.sex===sex),standIn:true}; };
const rnd = a => a[Math.floor(Math.random()*a.length)];

// ── recolouring ──
const imgCache = {};
function loadImg(src){ return imgCache[src]||(imgCache[src]=new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; })); }
function hsv2rgb(h,s,v){ const f=n=>{ const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); }; return [f(5),f(3),f(1)]; }
function rgb2hsv(r,g,b){ const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0;
  if(d){ h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0) h+=360; }
  return [h, mx?d/mx:0, mx]; }
const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
// the look on a canvas: robe (purple 255–320°), magic (blue 185–255°), hair (pale and unsaturated, inside the hair box)
function paint(img, base, look){
  const W=img.naturalWidth, H=img.naturalHeight, c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  const robe=(ROBES.find(r=>r.name===look.robe)||ROBES[0]).r, hair=(HAIRS.find(h=>h.name===look.hair)||HAIRS[0]).h;
  const magic=(ELEMS.find(e=>e.id===look.elem)||ELEMS[4]).m;
  const trim=(TRIMS.find(t=>t.name===look.trim)||TRIMS[0]).t, skin=(SKINS.find(k=>k.name===look.skin)||SKINS[0]).k;
  if(!robe&&!hair&&!magic&&!trim&&!skin) return c;
  const d=x.getImageData(0,0,W,H), p=d.data, hb=base.hair.map((f,i)=>Math.round(f*(i%2?H:W)));
  const hd=hair&&hex(hair[0]), hl=hair&&hex(hair[1]), kd=skin&&hex(skin[0]), kl=skin&&hex(skin[1]);
  const box=b=>[b[0]*W,b[1]*H,b[2]*W,b[3]*H,b[4]||1], inBox=(b,px,py)=>px>=b[0]&&px<=b[2]&&py>=b[1]&&py<=b[3], inAny=(bs,px,py)=>bs.some(b=>inBox(b,px,py));
  const skinB=(base.skin||[]).map(box), noTrimB=(base.noTrim||[]).map(box);
  // the robe as it was (before any recolour), grown by a few pixels: gold touching it is trim
  let nearRobe=null;
  if(trim){
    const R=4, m=new Uint8Array(W*H), g2=new Uint8Array(W*H);
    for(let i=0,j=0;i<p.length;i+=4,j++){ if(!p[i+3]) continue; const [h,s]=rgb2hsv(p[i]/255,p[i+1]/255,p[i+2]/255); if(h>=255&&h<=320&&s>0.22) m[j]=1; }
    for(let y=0;y<H;y++){ let run=-1e9; for(let x0=0;x0<W;x0++){ if(m[y*W+x0]) run=x0; if(x0-run<=R) g2[y*W+x0]=1; } run=1e9; for(let x0=W-1;x0>=0;x0--){ if(m[y*W+x0]) run=x0; if(run-x0<=R) g2[y*W+x0]=1; } }
    nearRobe=new Uint8Array(W*H);
    for(let x0=0;x0<W;x0++){ let run=-1e9; for(let y=0;y<H;y++){ if(g2[y*W+x0]) run=y; if(y-run<=R) nearRobe[y*W+x0]=1; } run=1e9; for(let y=H-1;y>=0;y--){ if(g2[y*W+x0]) run=y; if(run-y<=R) nearRobe[y*W+x0]=1; } }
  }
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3]) continue;
    const r=p[i]/255, g=p[i+1]/255, b=p[i+2]/255, [h,s,v]=rgb2hsv(r,g,b);
    let out=null;
    if((skin||trim)&&(h<30||h>=345||(h<40&&s<0.7))&&s>0.15){   // skin sits below 30° (its pale highlights to 40°); gold trim and jewellery, above 30°, are strongly saturated
      const j=i/4, px=j%W, py=Math.floor(j/W);
      const sb=skinB.find(b=>inBox(b,px,py));
      if(sb&&s<=sb[4]){                                            // skin: face and hands
        // all of the skin, outlines and flushed shadows too, but not the mauve-grey hair
        if(skin&&v>0.08&&(s>0.3||h>=12)){ const t=Math.pow(Math.min(1,(v-0.08)/0.92),1.15); p[i]=kd[0]+(kl[0]-kd[0])*t; p[i+1]=kd[1]+(kl[1]-kd[1])*t; p[i+2]=kd[2]+(kl[2]-kd[2])*t; }
        continue;
      }
    }
    if(trim&&h>=(base.trimLo||8)&&h<=60&&s>0.35&&v>0.3){                         // trim: gold on the robe, not the staff, belt or boots
      const j=i/4, px=j%W, py=Math.floor(j/W);
      if(nearRobe[j]&&!inAny(noTrimB,px,py)){ out=hsv2rgb(trim[0],Math.min(1,s*trim[1]),Math.min(1,v*trim[2])); p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; continue; }
    }
    if(robe&&h>=255&&h<=320&&s>0.22) out=hsv2rgb(robe[0],Math.min(1,s*robe[1]),Math.min(1,v*robe[2]));
    else if(magic&&h>=185&&h<255&&s>0.25) out=hsv2rgb(magic[0],Math.min(1,s*magic[1]),Math.min(1,v*magic[2]));
    else if(hair&&v>0.16&&(s<0.16||(s<0.34&&(h>=190||h<12)))){   // silver hair, with its blue- and mauve-grey shadows
      const px=(i/4)%W, py=Math.floor(i/4/W);
      if(px>=hb[0]&&px<=hb[2]&&py>=hb[1]&&py<=hb[3]){
        const t=Math.min(1,Math.max(0,(v-0.16)/0.84));
        p[i]=hd[0]+(hl[0]-hd[0])*t; p[i+1]=hd[1]+(hl[1]-hd[1])*t; p[i+2]=hd[2]+(hl[2]-hd[2])*t; continue;
      }
    }
    if(out){ p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; }
  }
  x.putImageData(d,0,0);
  return c;
}
function faceOf(canvas, base){
  const W=canvas.width, [fx,fy,fs]=base.face, n=Math.round(fs*W), f=document.createElement('canvas'); f.width=f.height=256;
  const x=f.getContext('2d'); x.fillStyle='#18141e'; x.fillRect(0,0,256,256);
  x.drawImage(canvas,Math.round(fx*W),Math.round(fy*canvas.height),n,n,0,0,256,256);
  return f.toDataURL('image/jpeg',0.9);
}
const defCache = {};
// the character entry for the duel engine and Explore. A new wizard is plain: the wheel's spells
// and the free Actions, no signatures yet, nothing barred yet (step 7's magic comes next).
async function def(hero){
  await loadBases();
  const k=JSON.stringify(hero); if(defCache[k]) return defCache[k];
  const base=BASES.find(b=>b.id===hero.fig)||figuresFor(hero.sex,hero.age).list[0];   // a figure that's gone (Eldrin's old sprite) gives way to the slot's first
  const img=await loadImg(base.src), cv=paint(img,base,hero);
  const el=ELEMS.find(e=>e.id===hero.elem)||ELEMS[0], robe=ROBES.find(r=>r.name===hero.robe)||ROBES[0];
  return defCache[k]={
    name:hero.name.toUpperCase(), title:{young:'Novice',middle:'Journeyman',old:'Hedge-Mage'}[hero.age]+' of '+el.name,
    sprite:cv.toDataURL('image/png'), face:faceOf(cv,base), col:robe.sw==='#22202a'?'#9a90b0':robe.sw,
    hp:48, phys:{atk:4}, dmgMult:1, forbidden:[], spells:[], arena:'library', element:el.id, hero:true,
    taunts:['My turn.','I came a long way for this.','Watch closely.'],
  };
}

// ── the creator ──
let box=null;
async function open(root, opts){
  opts=opts||{};
  await loadBases();
  return new Promise(resolve=>{
    const h0=opts.hero;
    const sex=h0?h0.sex:rnd(['m','f']);
    const st=h0?Object.assign({},h0):{sex, age:'young', fig:null, robe:'Violet', trim:'Gold', hair:'Brown', skin:'Natural', elem:rnd(ELEMS).id, name:rnd(NAMES[sex])};
    if(!st.fig||!BASES.some(b=>b.id===st.fig)) st.fig=figuresFor(st.sex,st.age).list[0].id;
    st.trim=st.trim||'Gold'; st.skin=st.skin||'Natural';   // heroes made before trim and skin
    if(box) box.remove();
    box=document.createElement('div'); box.className='hc'; root.appendChild(box);
    box.innerHTML=`<div class="hc-box">
      <div class="hc-head">${opts.edit?'Change Your Look':'Who Are You?'}</div>
      <div class="hc-main">
        <div class="hc-preview"><canvas class="hc-cv" width="300" height="420"></canvas><div class="hc-who"></div><div class="hc-note"></div></div>
        <div class="hc-opts"></div>
      </div>
      <div class="hc-foot">${opts.edit?'<button class="ex-btn hc-cancel" type="button">Cancel</button>':''}<button class="ex-btn hc-go" type="button">${opts.edit?'Keep this look':'Begin'}</button></div>
    </div>`;
    const $=s=>box.querySelector(s), cv=$('.hc-cv'), ctx=cv.getContext('2d');
    let drawn=0;
    const draw=async()=>{
      const n=++drawn, d=await def(st); if(n!==drawn) return;
      const img=await loadImg(d.sprite); if(n!==drawn) return;
      const el=ELEMS.find(e=>e.id===st.elem);
      ctx.clearRect(0,0,300,420);
      const g=ctx.createRadialGradient(150,250,10,150,250,190); g.addColorStop(0,el.col+'44'); g.addColorStop(1,'#00000000');
      ctx.fillStyle=g; ctx.fillRect(0,0,300,420);
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(150,404,80,10,0,0,Math.PI*2); ctx.fill();
      const hh=392, w=hh*img.width/img.height; ctx.drawImage(img,150-w/2,408-hh,w,hh);
      $('.hc-who').textContent=(st.name||'?')+', '+d.title;
    };
    const pills=(key,items,cls)=>`<div class="hc-row"><span class="hc-lab">${cls}</span><div class="hc-pills">`+items.map(([v,l])=>`<button type="button" class="hc-pill${st[key]===v?' on':''}" data-k="${key}" data-v="${v}">${l}</button>`).join('')+`</div></div>`;
    const swatches=(key,items,lab)=>`<div class="hc-row"><span class="hc-lab">${lab}</span><div class="hc-sw">`+items.map(it=>`<button type="button" class="hc-swb${st[key]===it.name?' on':''}" data-k="${key}" data-v="${it.name}" title="${it.name}" style="background:${it.sw}"></button>`).join('')+`<span class="hc-swname">${st[key]}</span></div></div>`;
    const render=()=>{
      const F=figuresFor(st.sex,st.age), i=Math.max(0,F.list.findIndex(b=>b.id===st.fig)), op=opposite(st.elem);
      $('.hc-opts').innerHTML=
        `<div class="hc-row"><span class="hc-lab">Name</span><div class="hc-name"><input class="hc-in" maxlength="16" value="${(st.name||'').replace(/"/g,'&quot;')}" aria-label="Name"><button type="button" class="ex-btn hc-dice" title="Another name">↻</button></div></div>`+
        (opts.edit?'':pills('sex',[['m','Man'],['f','Woman']],'I am'))+
        pills('age',AGES,'Age')+
        `<div class="hc-row"><span class="hc-lab">Figure</span><div class="hc-pills"><button type="button" class="hc-pill" data-fig="-1">‹</button><span class="hc-figno">${i+1} of ${F.list.length}</span><button type="button" class="hc-pill" data-fig="1">›</button></div></div>`+
        swatches('robe',ROBES,'Robes')+swatches('trim',TRIMS,'Trim')+swatches('hair',HAIRS,'Hair')+swatches('skin',SKINS,'Skin')+
        (opts.edit?'':`<div class="hc-row"><span class="hc-lab">Element</span><div class="hc-pills">`+ELEMS.map(e=>`<button type="button" class="hc-pill hc-el${st.elem===e.id?' on':''}" data-k="elem" data-v="${e.id}"><i style="background:${e.col}"></i>${e.name}</button>`).join('')+`</div></div>`+
        `<div class="hc-elnote">Your magic burns ${ELEMS.find(e=>e.id===st.elem).name.toLowerCase()}-coloured. Your first spells will be ${ELEMS.find(e=>e.id===st.elem).name}, and in time ${op.name}, its opposite, will come hardest to you.</div>`);
      $('.hc-note').textContent=F.standIn?'Stand-in figure: the art for '+(st.age==='middle'?'a middle-aged':'a '+st.age)+' '+(st.sex==='m'?'man':'woman')+' is still to come.':'';
      draw();
    };
    box.addEventListener('click',e=>{
      const t=e.target.closest('button'); if(!t) return;
      if(t.classList.contains('hc-dice')){ st.name=rnd(NAMES[st.sex].filter(n=>n!==st.name)); render(); return; }
      if(t.dataset.fig){ const F=figuresFor(st.sex,st.age).list, i=F.findIndex(b=>b.id===st.fig); st.fig=F[(i+(+t.dataset.fig)+F.length)%F.length].id; render(); return; }
      if(t.dataset.k){
        const k=t.dataset.k; st[k]=t.dataset.v;
        if(k==='sex'||k==='age'){ st.fig=figuresFor(st.sex,st.age).list[0].id; if(!opts.edit||k==='age') st.hair=AGE_HAIR[st.age]; if(k==='sex') st.name=rnd(NAMES[st.sex]); }
        render(); return;
      }
      if(t.classList.contains('hc-cancel')){ box.remove(); box=null; resolve(null); return; }
      if(t.classList.contains('hc-go')){
        st.name=(st.name||'').trim()||rnd(NAMES[st.sex]);
        box.remove(); box=null; resolve(st);
      }
    });
    box.addEventListener('input',e=>{ if(e.target.classList.contains('hc-in')){ st.name=e.target.value; $('.hc-who').textContent=(st.name||'?'); } });
    box.addEventListener('keydown',e=>e.stopPropagation());   // typing a name doesn't walk the wizard
    render();
  });
}
window.ExploreHero={open, def, loadBases, BASES, ROBES, TRIMS, HAIRS, SKINS, ELEMS, NAMES};
})();
