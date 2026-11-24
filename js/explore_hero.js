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
    skin:[[0.44,0.20,0.62,0.345],[0.10,0.33,0.22,0.41,0.88],[0.70,0.30,0.87,0.42,0.88]], noTrim:[[0,0,0.22,1],[0.28,0.43,0.66,0.62],[0,0.9,1,1]], staffMask:'sprites/hero/f_old_1_staff.png', headMask:'sprites/hero/f_old_1_head.png'},
];
let basesReady=null;
function loadBases(){
  return basesReady||(basesReady=fetch('sprites/hero/figures.json',{cache:'no-cache'}).then(r=>r.json()).then(list=>{
    const order=['young','middle','old'];
    list.sort((a,b)=>order.indexOf(a.age)-order.indexOf(b.age)||a.id.localeCompare(b.id));
    for(const f of list) if(!BASES.some(b=>b.id===f.id)) BASES.push(f);
    return fetch('sprites/hero/f_old_1_topper.json',{cache:'no-cache'}).then(r=>r.json()).then(a=>{ BASES.find(b=>b.id==='f_old_1').topper=a; }).catch(()=>{});
  }).then(()=>fetch('sprites/hero/toppers/toppers.json',{cache:'no-cache'}).then(r=>r.json()).then(t=>{ TOPPERS.length=1; TOPPERS.push(...t); }).catch(()=>{})).then(()=>{
    const order=['young','middle','old'];
    BASES.sort((a,b)=>order.indexOf(a.age)-order.indexOf(b.age)||(a.id==='f_old_1'?-1:b.id==='f_old_1'?1:a.id.localeCompare(b.id)));
  }).catch(()=>{}));
}
// staff toppers (tools/cut_toppers.py from the user's sheets): they replace the painted staff head and flame
// (the figure's headMask), drawn behind the figure along the staff's line (its topper anchor). The first is the painted head.
const TOPPERS = [{id:'', name:'Painted'}];
const TOPPER_H = 0.2;   // a topper's height, a fraction of the figure's
// toppers anyone can choose; the rest are earned in Explore (the save's `toppers`, passed to open() as opts.toppers)
const STARTER_TOPPERS = ['', 'crystal', 'hoop', 'crescent', 'crook'];
// an NPC's look nudged off yours, so nobody in the world looks like you: another figure of the same sex and
// age if they'd share yours, and the next robe colour if they'd share yours
function avoidLook(look, hero){
  if(!hero) return look;
  const L=Object.assign({}, look);
  if(L.fig===hero.fig){
    const alts=BASES.filter(b=>b.id!==hero.fig&&b.sex===L.sex&&(b.race==='elf'||b.age===L.age)&&raceOf(b)===(L.race||raceOf(BASES.find(x=>x.id===L.fig))));
    if(alts.length) L.fig=alts[(L.name||'').length%alts.length].id;
  }
  if((L.robe||'Violet')===(hero.robe||'Violet')){ const i=ROBES.findIndex(r=>r.name===(L.robe||'Violet')); L.robe=ROBES[(i+3)%ROBES.length].name; }
  return L;
}
const AGES = [['young','Young'],['middle','Middle-aged'],['old','Old']];
// races: dwarves are figures cut from sprites/hero/source/dwarf_*.png (race 'dwarf' in figures.json); humans carry no race.
// size: the battle sprite's spriteHeight / spriteWidth: as short as Durin (0.72), but not widened like him (1.2),
// since the dwarf figures are already drawn stocky, so a dwarf stands short in battle and in Explore
// elves (race 'elf') are ageless to look at: their figures serve every age (figuresFor)
const RACES = [['human','Human'],['dwarf','Dwarf'],['elf','Elf']];
const RACE_SIZE = {dwarf:{h:0.72, w:1}};
const raceOf = b => (b&&b.race)||'human';
// staff wood: hue°, saturation ×, value × (null keeps the oak); the wood's own shading is kept as offsets from its middle hue (20°)
const STAVES = [
  {name:'Oak', w:null, sw:'#9a5a24'}, {name:'Ebony', w:[18,0.45,0.42], sw:'#3a2a22'}, {name:'Ash', w:[34,0.38,1.18], sw:'#d8c4a0'},
  {name:'Mahogany', w:[6,0.95,0.72], sw:'#7a2a18'}, {name:'Silverwood', w:[215,0.12,1.12], sw:'#c8ccd4'}, {name:'Blackthorn', w:[275,0.3,0.4], sw:'#3a3040'},
  {name:'Bloodwood', w:[352,0.95,0.78], sw:'#8a1a22'}, {name:'Driftwood', w:[30,0.18,0.95], sw:'#a8a090'},
];
// trim: hue°, saturation ×, value × (null keeps the gold)
const TRIMS = [
  {name:'Gold', t:null, sw:'#e0a830'}, {name:'Silver', t:[220,0.12,1.08], sw:'#c8ccd8'}, {name:'Copper', t:[16,0.95,0.85], sw:'#c0602a'},
  {name:'Bone', t:[40,0.25,1.15], sw:'#e8dcc0'}, {name:'Black', t:[260,0.15,0.38], sw:'#2a2630'}, {name:'Scarlet', t:[358,0.95,0.9], sw:'#c0202a'},
  {name:'Jade', t:[140,0.8,0.8], sw:'#2a9a5a'}, {name:'Sky', t:[200,0.75,1.05], sw:'#4aa8e8'},
];
// eyes: the blue painted inside the face box, moved to an eye colour (hue°, sat ×, val ×; null keeps the blue)
const EYES = [
  {name:'Blue', e:null, sw:'#3a7ae0'}, {name:'Grey', e:[210,0.18,0.95], sw:'#9aa4b0'}, {name:'Green', e:[125,0.75,0.85], sw:'#3a9a4a'},
  {name:'Hazel', e:[50,0.7,0.75], sw:'#9a8a3a'}, {name:'Brown', e:[24,0.8,0.55], sw:'#6a3a1a'}, {name:'Amber', e:[38,0.95,1.05], sw:'#d8962a'},
  {name:'Dark', e:[20,0.5,0.3], sw:'#2a1a12'},
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
// dwarf names (none shared with townsfolk, story characters or the roster: Durin is taken)
const DWARF_NAMES = {
  m:['Brokk','Hargrim','Torvald','Baldric','Orsik','Dunstan','Kazrik','Haldor','Ulfgar','Rurik','Gundar','Morrik','Thrandur','Bofri','Grimbald'],
  f:['Helga','Brunhild','Sigrun','Dagny','Inga','Hilde','Ragna','Gudrun','Thyra','Ylva','Ingrith','Kelda','Brynja','Solveig','Hulda'],
};
const namesFor = (sex,race) => (race==='dwarf'?DWARF_NAMES:NAMES)[sex];
const AGE_HAIR = {young:'Brown', middle:'Black', old:'Silver'};   // a new look's starting hair

// the creator's figures for a sex and age; figures marked npc (the ragged bandits) are for NPCs only, though def() still paints them
// (and race: a hero made before races is human)
const figuresFor = (sex,age,race) => { const ok=BASES.filter(b=>!b.npc&&raceOf(b)===(race||'human')), own=ok.filter(b=>b.sex===sex&&(b.race==='elf'||b.age===age)); return own.length?{list:own,standIn:false}:{list:ok.filter(b=>b.sex===sex),standIn:true}; };
const rnd = a => a[Math.floor(Math.random()*a.length)];

// ── recolouring ──
const imgCache = {};
// through LoadBar when it's there, so the figures' bytes move Explore's loading bar (estimates: a mask, a topper, a figure)
function loadImg(src){ return imgCache[src]||(imgCache[src]=window.LoadBar&&!/^(data|blob):/.test(src)
  ? LoadBar.image(src,/_(hair|skin|staff|head)\.png$/.test(src)?3000:/toppers\//.test(src)?220000:550000)
  : new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; })); }
function hsv2rgb(h,s,v){ const f=n=>{ const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); }; return [f(5),f(3),f(1)]; }
function rgb2hsv(r,g,b){ const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0;
  if(d){ h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0) h+=360; }
  return [h, mx?d/mx:0, mx]; }
const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
// the look on a canvas: robe (purple 255–320°), magic (cyan to blue 165–255°: the newer figures' flames have cyan highlights),
// hair (pale and unsaturated, inside the hair box)
function paint(img, base, look){
  const W=img.naturalWidth, H=img.naturalHeight, c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  const robe=(ROBES.find(r=>r.name===look.robe)||ROBES[0]).r, hair=(HAIRS.find(h=>h.name===look.hair)||HAIRS[0]).h;
  const magic=(ELEMS.find(e=>e.id===look.elem)||ELEMS[4]).m;
  const trim=(TRIMS.find(t=>t.name===look.trim)||TRIMS[0]).t, skin=(SKINS.find(k=>k.name===look.skin)||SKINS[0]).k;
  const eye=(EYES.find(e=>e.name===look.eyes)||EYES[0]).e, hm=base._hairMask, hr=base._hairRim, sm=base._skinMask, stm=base._staffMask;
  const wood=(STAVES.find(w=>w.name===look.staff)||STAVES[0]).w;
  if(!robe&&!hair&&!magic&&!trim&&!skin&&!eye&&!wood) return c;
  const d=x.getImageData(0,0,W,H), p=d.data, hb=base.hair.map((f,i)=>Math.round(f*(i%2?H:W)));
  const hd=hair&&hex(hair[0]), hl=hair&&hex(hair[1]), kd=skin&&hex(skin[0]), kl=skin&&hex(skin[1]);
  const box=b=>[b[0]*W,b[1]*H,b[2]*W,b[3]*H,b[4]||1], inBox=(b,px,py)=>px>=b[0]&&px<=b[2]&&py>=b[1]&&py<=b[3], inAny=(bs,px,py)=>bs.some(b=>inBox(b,px,py));
  const stB=base.staffBox&&box(base.staffBox), skinB=(base.skin||[]).map(box), noTrimB=(base.noTrim||[]).map(box), faceB=skinB[0];
  // the robe as it was (before any recolour), grown by a few pixels: gold touching it is trim
  let nearRobe=null, inRobe=null;
  {
    const R=4, m=new Uint8Array(W*H), g2=new Uint8Array(W*H);
    for(let i=0,j=0;i<p.length;i+=4,j++){ if(!p[i+3]) continue; const [h,s]=rgb2hsv(p[i]/255,p[i+1]/255,p[i+2]/255); if(h>=255&&h<=320&&s>0.22) m[j]=1; }
    for(let y=0;y<H;y++){ let run=-1e9; for(let x0=0;x0<W;x0++){ if(m[y*W+x0]) run=x0; if(x0-run<=R) g2[y*W+x0]=1; } run=1e9; for(let x0=W-1;x0>=0;x0--){ if(m[y*W+x0]) run=x0; if(run-x0<=R) g2[y*W+x0]=1; } }
    nearRobe=new Uint8Array(W*H);
    for(let x0=0;x0<W;x0++){ let run=-1e9; for(let y=0;y<H;y++){ if(g2[y*W+x0]) run=y; if(y-run<=R) nearRobe[y*W+x0]=1; } run=1e9; for(let y=H-1;y>=0;y--){ if(g2[y*W+x0]) run=y; if(run-y<=R) nearRobe[y*W+x0]=1; } }
    inRobe=grow(m,W,H,14);                                         // a patch sewn on the robe lies well inside it
  }
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3]) continue;
    const r=p[i]/255, g=p[i+1]/255, b=p[i+2]/255, [h,s,v]=rgb2hsv(r,g,b);
    let out=null;
    if(hm&&hm[i/4]){                                               // the figure's own hair mask: hair, whatever its tint
      if(hair){ const t=Math.min(1,Math.max(0,(v-0.16)/0.84)); p[i]=hd[0]+(hl[0]-hd[0])*t; p[i+1]=hd[1]+(hl[1]-hd[1])*t; p[i+2]=hd[2]+(hl[2]-hd[2])*t; }
      continue;
    }
    if(hair&&hr&&hr[i/4]&&h>=320&&h<352&&s>0.25&&v<0.6){              // the dark mauve rim just round the hair: the hair's own shadow
      const t=Math.min(1,Math.max(0,(v-0.16)/0.84)); p[i]=hd[0]+(hl[0]-hd[0])*t; p[i+1]=hd[1]+(hl[1]-hd[1])*t; p[i+2]=hd[2]+(hl[2]-hd[2])*t; continue;
    }
    if(faceB&&h>=165&&h<255&&s>0.25){                              // blue in the face is eyes (or an earring's gem), not magic
      const j=i/4, px=j%W, py=Math.floor(j/W);
      if(px>=faceB[0]&&px<=faceB[2]&&py>=faceB[1]&&py<=faceB[3]){
        if(eye){ out=hsv2rgb(eye[0],Math.min(1,s*eye[1]),Math.min(1,v*eye[2])); p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; }
        continue;
      }
    }
    // skin sits below 30° (its pale highlights to 40°, the newer figures' bright ones to 46°); gold trim and jewellery, above 30°,
    // are strongly saturated; the dark mauve of wrinkles and outlines is skin too
    if((skin||trim)&&(h<30||h>=345||(h<40&&s<0.7)||(h<46&&s<0.82&&v>0.85)||(h<56&&s<0.5&&v>0.85)||(h>=320&&v<0.55))&&s>0.15){
      const j=i/4, px=j%W, py=Math.floor(j/W);
      const bx=skinB.find(b=>inBox(b,px,py));                       // inside a hand box its saturation cap keeps the staff's wood out
      const sb=sm?(sm[j]&&(!bx||!base.capHands||s<=bx[4])):(bx&&s<=bx[4]);           // the figure's skin mask (boxes widened, the forearms, the staff left out), else its boxes
      if(sb){                                            // skin: face and hands
        // all of the skin, outlines and flushed shadows too, but not the mauve-grey hair
        if(skin&&v>0.08&&(s>0.3||h>=12)){ const L=0.299*r+0.587*g+0.114*b, t=Math.max(0,(L-0.04)/0.7);   /* perceived lightness, not HSV value: bright skin is shaded by how deep its orange is; past the ramp's light end a highlight brightens the skin's own colour (toward white went ashy on dark skin) */ if(t<=1){ const u=Math.pow(t,1.15); p[i]=kd[0]+(kl[0]-kd[0])*u; p[i+1]=kd[1]+(kl[1]-kd[1])*u; p[i+2]=kd[2]+(kl[2]-kd[2])*u; } else { const u=Math.min(1,(t-1)/0.25)*0.32; p[i]=Math.min(255,kl[0]*(1+u)); p[i+1]=Math.min(255,kl[1]*(1+u)); p[i+2]=Math.min(255,kl[2]*(1+u)); } }
        continue;
      }
    }
    if(wood&&(stm?stm[i/4]:(stB&&h<=46&&s>0.3&&v>0.1&&inBox(stB,(i/4)%W,Math.floor(i/4/W))))){   // the staff's wood (its mask; the witch, a box)
      const dh=(h>=300?h-360:h)-20; out=hsv2rgb((wood[0]+dh+360)%360,Math.min(1,s*wood[1]),Math.min(1,v*wood[2])); p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; continue;
    }
    if((h<15||h>=350)&&s>0.45&&v>0.55&&inRobe[i/4]){                // a salmon-red robe patch: brown leather, whatever the robe
      out=hsv2rgb(22,Math.min(1,s*0.8),v*0.62); p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; continue;
    }
    if(trim&&h>=(base.trimLo||8)&&h<=60&&s>0.35&&v>0.3){                         // trim: gold on the robe, not the staff, belt or boots
      const j=i/4, px=j%W, py=Math.floor(j/W);
      if(nearRobe[j]&&!inAny(noTrimB,px,py)){ out=hsv2rgb(trim[0],Math.min(1,s*trim[1]),Math.min(1,v*trim[2])); p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; continue; }
    }
    if(robe&&h>=255&&h<=340&&s>0.22) out=hsv2rgb(robe[0],Math.min(1,s*robe[1]),Math.min(1,v*robe[2]));
    else if(magic&&h>=165&&h<255&&s>0.25) out=hsv2rgb(magic[0],Math.min(1,s*magic[1]),Math.min(1,v*magic[2]));
    else if(hair&&!hm&&v>0.16&&(s<0.16||(s<0.34&&(h>=190||h<12)))){   // no mask (the old witch): silver hair, with its blue- and mauve-grey shadows
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
// a topper recoloured to the look: blue glow → the element, gold → the trim, wood → the staff (its neck, or all of it)
function paintTopper(img, t, look){
  const W=img.naturalWidth, H=img.naturalHeight, c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  const magic=(ELEMS.find(e=>e.id===look.elem)||ELEMS[4]).m, trim=(TRIMS.find(q=>q.name===look.trim)||TRIMS[0]).t, wood=(STAVES.find(w=>w.name===look.staff)||STAVES[0]).w;
  if(!magic&&!trim&&!wood) return c;
  const d=x.getImageData(0,0,W,H), p=d.data, neckY=H*0.8;
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3]) continue;
    const [h,s,v]=rgb2hsv(p[i]/255,p[i+1]/255,p[i+2]/255); let out=null;
    if(magic&&h>=165&&h<255&&s>0.25) out=hsv2rgb(magic[0],Math.min(1,s*magic[1]),Math.min(1,v*magic[2]));
    else if(wood&&(h<30||h>=345)&&s>0.35&&(t.wood==='all'||Math.floor(i/4/W)>neckY)){ const dh=(h>=300?h-360:h)-20; out=hsv2rgb((wood[0]+dh+360)%360,Math.min(1,s*wood[1]),Math.min(1,v*wood[2])); }
    else if(trim&&h>=30&&h<=60&&s>0.35) out=hsv2rgb(trim[0],Math.min(1,s*trim[1]),Math.min(1,v*trim[2]));
    if(out){ p[i]=out[0]*255; p[i+1]=out[1]*255; p[i+2]=out[2]*255; }
  }
  x.putImageData(d,0,0); return c;
}
// where an image's magic sits: the middle and spread of its blue (165–255°) pixels, optionally only
// inside a mask; null if it has none
function blueSpot(img, mask){
  const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height, c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.drawImage(img,0,0); const p=x.getImageData(0,0,W,H).data;
  let n=0, sx=0, sy=0, sxx=0, syy=0;
  for(let j=0;j<W*H;j++){
    const i=j*4; if(p[i+3]<128||(mask&&!mask[j])) continue;
    const [h,s,v]=rgb2hsv(p[i]/255,p[i+1]/255,p[i+2]/255);
    if(h>=165&&h<255&&s>0.3&&v>0.45){ const px=j%W, py=(j-px)/W; n++; sx+=px; sy+=py; sxx+=px*px; syy+=py*py; }
  }
  if(n<12) return null;
  const mx=sx/n, my=sy/n, sd=Math.sqrt(Math.max(1,(sxx/n-mx*mx)+(syy/n-my*my)));
  return {x:mx, y:my, r:sd};
}
// puts a topper on a painted figure: the head and flame cleared, then the topper and a shaft down to the fist
// drawn behind what's left (so the hand grips it), turned to the staff's lean
async function fitTopper(cv, base, look){
  const t=TOPPERS.find(q=>q.id&&q.id===look.topper), a=base.topper;
  if(!t||!a||!base.headMask) return null;
  const W=cv.width, H=cv.height, x=cv.getContext('2d');
  const hm=await hairMaskOf(base,'headMask'); if(!hm) return null;
  const d=x.getImageData(0,0,W,H), p=d.data;
  for(let j=0;j<hm.length;j++) if(hm[j]) p[j*4+3]=0;
  x.putImageData(d,0,0);
  const img=await loadImg(t.src), tc=paintTopper(img,t,look), tw=tc.width, th=tc.height;
  const sl=a.line[2]*W/H, ang=-Math.atan(sl), cos=Math.cos(ang);              // the staff's lean, dx per dy in pixels
  const lineX=y=>(a.line[0]+a.line[2]*(y/H-a.line[1]))*W;
  const ht=TOPPER_H*H, wd=tw*ht/th;                                           // every topper the same height on every figure
  const topY=Math.max(2,a.top*H), gripY=a.grip*H+0.03*H;
  let neckY=topY+ht*cos; if(neckY>gripY-6){ neckY=gripY-6; }
  const px=lineX(neckY), shaft=(gripY-neckY)/cos;
  x.save(); x.globalCompositeOperation='destination-over'; x.translate(px,neckY); x.rotate(ang);
  if(shaft>0) x.drawImage(tc,0,th-6,tw,4,-t.neck[0]*wd,-1,wd,shaft+1);          // the shaft: the neck's foot stretched down to the fist
  x.drawImage(tc,-t.neck[0]*wd,-ht,wd,ht);
  x.restore();
  // the topper's magic, carried to the figure: its blue in topper pixels → scaled, turned, placed
  const b=blueSpot(img); if(!b) return null;
  const k=wd/tw, lx=(b.x-t.neck[0]*tw)*k, ly=(b.y-th)*k, ca=Math.cos(ang), sa=Math.sin(ang);
  return {x:(px+lx*ca-ly*sa)/W, y:(neckY+lx*sa+ly*ca)/H, r:Math.max(0.018,b.r*k/H)};
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
const maskCache={};
async function hairMaskOf(base, key='hairMask'){   // the figure's hair (or skin) mask as one byte a pixel (non-zero = in it)
  if(!base[key]) return null;
  const ck=base.id+':'+key; if(maskCache[ck]) return maskCache[ck];
  const img=await loadImg(base[key]), c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
  const x=c.getContext('2d'); x.drawImage(img,0,0); const d=x.getImageData(0,0,c.width,c.height).data, m=new Uint8Array(c.width*c.height);
  for(let i=0;i<m.length;i++) m[i]=d[i*4]>127?1:0;
  return maskCache[ck]=m;
}
function grow(m, W, H, R){                      // a mask grown by R px (a square brush)
  const g=new Uint8Array(W*H), out=new Uint8Array(W*H);
  for(let y=0;y<H;y++){ let run=-1e9; for(let x=0;x<W;x++){ if(m[y*W+x]) run=x; if(x-run<=R) g[y*W+x]=1; } run=1e9; for(let x=W-1;x>=0;x--){ if(m[y*W+x]) run=x; if(run-x<=R) g[y*W+x]=1; } }
  for(let x=0;x<W;x++){ let run=-1e9; for(let y=0;y<H;y++){ if(g[y*W+x]) run=y; if(y-run<=R) out[y*W+x]=1; } run=1e9; for(let y=H-1;y>=0;y--){ if(g[y*W+x]) run=y; if(run-y<=R) out[y*W+x]=1; } }
  return out;
}
function hairRimOf(base, m, W, H){ return m&&grow(m,W,H,3); }   // the hair mask grown by 3 px: where the hair's dark mauve edge lies
async function def(hero){
  await loadBases();
  const k=JSON.stringify(hero); if(defCache[k]) return defCache[k];
  const base=BASES.find(b=>b.id===hero.fig)||figuresFor(hero.sex,hero.age,hero.race).list[0];   // a figure that's gone (Eldrin's old sprite) gives way to the slot's first
  const img=await loadImg(base.src); base._hairMask=await hairMaskOf(base);
  base._skinMask=await hairMaskOf(base,'skinMask'); base._staffMask=await hairMaskOf(base,'staffMask');
  if(base._hairMask&&!base._hairRim) base._hairRim=hairRimOf(base,base._hairMask,img.naturalWidth,img.naturalHeight);
  const cv=paint(img,base,hero);
  let spot=hero.topper?await fitTopper(cv,base,hero):null;
  if(!spot&&base.headMask){                                                   // the painted flame
    const hm=await hairMaskOf(base,'headMask'), b=hm&&blueSpot(img,hm);
    if(b) spot={x:b.x/img.naturalWidth, y:b.y/img.naturalHeight, r:Math.max(0.018,b.r/img.naturalHeight)};
  }
  const el=ELEMS.find(e=>e.id===hero.elem)||ELEMS[0], robe=ROBES.find(r=>r.name===hero.robe)||ROBES[0];
  return defCache[k]={
    name:hero.name.toUpperCase(), title:{young:'Novice',middle:'Journeyman',old:'Hedge-Mage'}[hero.age]+' of '+el.name,
    sprite:cv.toDataURL('image/png'), face:faceOf(cv,base), col:robe.sw==='#22202a'?'#9a90b0':robe.sw,
    hp:48, phys:{atk:4}, dmgMult:1, race:raceOf(base), spriteHeight:(RACE_SIZE[raceOf(base)]||{}).h, spriteWidth:(RACE_SIZE[raceOf(base)]||{}).w, forbidden:[], spells:[], arena:'library', element:el.id, hero:true,
    taunts:['My turn.','I came a long way for this.','Watch closely.'],
    // the staff's living light (js/staff_glow.js): where on the sprite, how big, the element; a lantern lights further at night
    glow:spot&&{x:spot.x, y:spot.y, r:spot.r, col:el.col, elem:el.id, lamp:hero.topper==='lantern'||hero.topper==='crook'},
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
    const st=h0?Object.assign({},h0):{sex, race:'human', age:'young', fig:null, robe:'Violet', trim:'Gold', staff:'Oak', hair:'Brown', skin:'Natural', eyes:'Brown', elem:rnd(ELEMS).id, name:rnd(NAMES[sex])};
    st.race=st.race||raceOf(BASES.find(b=>b.id===st.fig));   // heroes made before races
    if(!st.fig||!figuresFor(st.sex,st.age,st.race).list.some(b=>b.id===st.fig)) st.fig=figuresFor(st.sex,st.age,st.race).list[0].id;
    st.trim=st.trim||'Gold'; st.staff=st.staff||'Oak'; st.skin=st.skin||'Natural'; st.eyes=st.eyes||'Blue';   // heroes made before trim, skin and eyes
    if(box) box.remove();
    box=document.createElement('div'); box.className='hc'; root.appendChild(box);
    box.innerHTML=`<div class="hc-box">
      <div class="hc-head">${opts.edit?'Change Your Look':'Who Are You?'}</div>
      <div class="hc-main">
        <div class="hc-preview"><canvas class="hc-cv" width="300" height="420"></canvas><div class="hc-who"></div><div class="hc-note"></div></div>
        <div class="hc-opts"></div>
      </div>
      <div class="hc-foot"><button class="ex-btn hc-rand" type="button" title="A random wizard">🎲 Random</button>${opts.edit?'<button class="ex-btn hc-cancel" type="button">Cancel</button>':''}<button class="ex-btn hc-go" type="button">${opts.edit?'Keep this look':'Begin'}</button></div>
    </div>`;
    const $=s=>box.querySelector(s), cv=$('.hc-cv'), ctx=cv.getContext('2d');
    let drawn=0;
    const draw=async()=>{
      const n=++drawn, d=await def(st); if(n!==drawn) return;
      const img=await loadImg(d.sprite); if(n!==drawn) return;
      shown={img, d, el:ELEMS.find(e=>e.id===st.elem)};
      if(!anim) anim=requestAnimationFrame(frame);
      $('.hc-who').textContent=(st.name||'?')+', '+d.title;
    };
    // the preview, redrawn every frame so the staff's light lives (js/staff_glow.js)
    let shown=null, anim=0;
    const frame=t=>{
      anim=0; if(!box||!shown||!document.body.contains(cv)) return;
      const {img,d,el}=shown;
      ctx.clearRect(0,0,300,420);
      const g=ctx.createRadialGradient(150,250,10,150,250,190); g.addColorStop(0,el.col+'44'); g.addColorStop(1,'#00000000');
      ctx.fillStyle=g; ctx.fillRect(0,0,300,420);
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(150,404,80,10,0,0,Math.PI*2); ctx.fill();
      const hh=392, w=hh*img.width/img.height, x0=150-w/2, y0=408-hh; ctx.drawImage(img,x0,y0,w,hh);
      if(d.glow&&window.StaffGlow) StaffGlow.draw(ctx,x0+d.glow.x*w,y0+d.glow.y*hh,Math.max(d.glow.r*hh,hh*0.03),d.glow.col,d.glow.elem,t,1);
      anim=requestAnimationFrame(frame);
    };
    const pills=(key,items,cls)=>`<div class="hc-row"><span class="hc-lab">${cls}</span><div class="hc-pills">`+items.map(([v,l])=>`<button type="button" class="hc-pill${st[key]===v?' on':''}" data-k="${key}" data-v="${v}">${l}</button>`).join('')+`</div></div>`;
    const swatches=(key,items,lab)=>`<div class="hc-row"><span class="hc-lab">${lab}</span><div class="hc-sw">`+items.map(it=>`<button type="button" class="hc-swb${st[key]===it.name?' on':''}" data-k="${key}" data-v="${it.name}" title="${it.name}" style="background:${it.sw}"></button>`).join('')+`<span class="hc-swname">${st[key]}</span></div></div>`;
    // 🎲 Random: a whole new look (and, for a new wizard, sex, element and name; Change look keeps those)
    // the toppers on offer: the starters, and any this wizard has earned (opts.toppers)
    const topList=()=>TOPPERS.filter(q=>STARTER_TOPPERS.includes(q.id)||(opts.toppers||[]).includes(q.id)||q.id===st.topper);
    const randomize=()=>{
      if(!opts.edit){ st.sex=rnd(['m','f']); st.race=rnd(['human','human','human','human','dwarf','elf']); st.elem=rnd(ELEMS).id; st.name=rnd(namesFor(st.sex,st.race)); }
      st.age=rnd(AGES)[0]; st.fig=rnd(figuresFor(st.sex,st.age,st.race).list).id;
      st.robe=rnd(ROBES).name; st.trim=rnd(TRIMS).name; st.skin=rnd(SKINS).name; st.eyes=rnd(EYES).name;
      st.hair=(st.age==='old'&&Math.random()<0.6)?rnd(['Silver','White']):rnd(HAIRS).name;   // the old mostly grey
    };
    const render=()=>{
      const F=figuresFor(st.sex,st.age,st.race), i=Math.max(0,F.list.findIndex(b=>b.id===st.fig)), op=opposite(st.elem);
      $('.hc-opts').innerHTML=
        `<div class="hc-row"><span class="hc-lab">Name</span><div class="hc-name"><input class="hc-in" maxlength="16" value="${(st.name||'').replace(/"/g,'&quot;')}" aria-label="Name"><button type="button" class="ex-btn hc-dice" title="Another name">↻</button></div></div>`+
        (opts.edit?'':pills('sex',[['m','Man'],['f','Woman']],'I am')+pills('race',RACES,'Race'))+
        pills('age',AGES,'Age')+
        `<div class="hc-row"><span class="hc-lab">Figure</span><div class="hc-pills"><button type="button" class="hc-pill" data-fig="-1">‹</button><span class="hc-figno">${i+1} of ${F.list.length}</span><button type="button" class="hc-pill" data-fig="1">›</button></div></div>`+
        (topList().length>1?`<div class="hc-row"><span class="hc-lab">Topper</span><div class="hc-pills"><button type="button" class="hc-pill" data-top="-1">‹</button><span class="hc-figno">${(TOPPERS.find(q=>q.id===(st.topper||''))||TOPPERS[0]).name}</span><button type="button" class="hc-pill" data-top="1">›</button></div></div>`:'')+
        swatches('robe',ROBES,'Robes')+swatches('trim',TRIMS,'Trim')+swatches('staff',STAVES,'Staff')+swatches('hair',HAIRS,'Hair')+swatches('skin',SKINS,'Skin')+swatches('eyes',EYES,'Eyes')+
        (opts.edit?'':`<div class="hc-row"><span class="hc-lab">Element</span><div class="hc-pills">`+ELEMS.map(e=>`<button type="button" class="hc-pill hc-el${st.elem===e.id?' on':''}" data-k="elem" data-v="${e.id}"><i style="background:${e.col}"></i>${e.name}</button>`).join('')+`</div></div>`+
        `<div class="hc-elnote">Your magic burns ${ELEMS.find(e=>e.id===st.elem).name.toLowerCase()}-coloured. Your first spells will be ${ELEMS.find(e=>e.id===st.elem).name}, and in time ${op.name}, its opposite, will come hardest to you.</div>`);
      $('.hc-note').textContent=F.standIn?'Stand-in figure: the art for '+(st.age==='middle'?'a middle-aged':'a '+st.age)+' '+(st.race!=='human'?st.race+' ':'')+(st.sex==='m'?'man':'woman')+' is still to come.':'';
      draw();
    };
    box.addEventListener('click',e=>{
      const t=e.target.closest('button'); if(!t) return;
      if(t.classList.contains('hc-rand')){ randomize(); render(); return; }
      if(t.classList.contains('hc-dice')){ st.name=rnd(namesFor(st.sex,st.race).filter(n=>n!==st.name)); render(); return; }
      if(t.dataset.top){ const T=topList(), i=Math.max(0,T.findIndex(q=>q.id===(st.topper||''))); st.topper=T[(i+(+t.dataset.top)+T.length)%T.length].id; render(); return; }
      if(t.dataset.fig){ const F=figuresFor(st.sex,st.age,st.race).list, i=F.findIndex(b=>b.id===st.fig); st.fig=F[(i+(+t.dataset.fig)+F.length)%F.length].id; render(); return; }
      if(t.dataset.k){
        const k=t.dataset.k; st[k]=t.dataset.v;
        if(k==='sex'||k==='age'||k==='race'){ const L=figuresFor(st.sex,st.age,st.race).list; if(k!=='age'||!L.some(f=>f.id===st.fig)) st.fig=L[0].id;   // an elf keeps her figure through an age change
          if(!opts.edit||k==='age') st.hair=AGE_HAIR[st.age]; if(k==='sex'||k==='race') st.name=rnd(namesFor(st.sex,st.race)); }
        render(); return;
      }
      if(t.classList.contains('hc-cancel')){ box.remove(); box=null; resolve(null); return; }
      if(t.classList.contains('hc-go')){
        st.name=(st.name||'').trim()||rnd(namesFor(st.sex,st.race));
        box.remove(); box=null; resolve(st);
      }
    });
    box.addEventListener('input',e=>{ if(e.target.classList.contains('hc-in')){ st.name=e.target.value; $('.hc-who').textContent=(st.name||'?'); } });
    box.addEventListener('keydown',e=>e.stopPropagation());   // typing a name doesn't walk the wizard
    render();
  });
}
// a whole random new wizard, as 🎲 Random makes one in the creator (the Test menu's random graduate,
// js/explore.js open({random:true}))
async function randomHero(){
  await loadBases();
  const st={sex:rnd(['m','f']), race:rnd(['human','human','human','human','dwarf','elf']), elem:rnd(ELEMS).id};
  st.name=rnd(namesFor(st.sex,st.race)); st.age=rnd(AGES)[0]; st.fig=rnd(figuresFor(st.sex,st.age,st.race).list).id;
  st.robe=rnd(ROBES).name; st.trim=rnd(TRIMS).name; st.skin=rnd(SKINS).name; st.eyes=rnd(EYES).name;
  st.hair=(st.age==='old'&&Math.random()<0.6)?rnd(['Silver','White']):rnd(HAIRS).name;
  st.staff=rnd(STAVES).name; st.topper=rnd(STARTER_TOPPERS);
  return st;
}
window.ExploreHero={open, def, randomHero, loadBases, avoidLook, STARTER_TOPPERS, BASES, ROBES, TRIMS, STAVES, TOPPERS, HAIRS, SKINS, EYES, ELEMS, NAMES, DWARF_NAMES, RACES};
})();
