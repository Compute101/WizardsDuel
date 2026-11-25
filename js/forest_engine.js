// ═══════════════════════════════════════════════════════════════════════
// THE MORIQUENDE: the forest strategy year (engine). Plan: docs/forest-design.md.
// Pure state + rules + the wild's AI; no DOM. Runs in the browser (window.ForestEngine)
// and in Node (tools/forest_sim.js). The screen is js/forest.js.
//
// A turn is a week; a year is 24 (four seasons of 6). The player places elves and casts one
// spell (orders), then endTurn() runs: orders → Sylvara → the wild → night (sentry posts shoot,
// raids) → upkeep → the next dawn's sight and signs. Everything random goes through S.seed,
// so a saved game or a sim run replays the same.
// ═══════════════════════════════════════════════════════════════════════
(function(root){
'use strict';

// ── Numbers (tune with node tools/forest_sim.js) ─────────────────────
const R = 5;                       // map radius: 91 hexes
const YEAR = 24, SEASON = 6;
const SEASONS = ['Spring','Summer','Autumn','Winter'];
const FORAGE = [1.0, 1.2, 1.0, 0.4];   // by season: food from each living hex within 2 of Elfhome
const FORAGE_PER_HEX = 0.45;
const HAMLET_FOOD = 2;
const EAT = 1, YOUTH_EAT = 0.5;
const HUNT_FOOD = 5;               // one beast
const TRAIN_COST = 6, TRAIN_TURNS = 3;
const YOUTH_EVERY = 6, YOUTH_FOOD = 25;   // a youth comes of age every 6 weeks while stores hold 25+
const MANA_MAX = 10, MANA_REGEN = 2;
const SPELLS = {
  strike: {name:'Strike', cat:'damage', cost:[0,2,3,5], dmg:[0,3,6,10]},
  ward:   {name:'Ward',   cat:'protect', cost:2, turns:5},
  dispel: {name:'Dispel', cat:'dispel', cost:3},
};
const FIRE_CHANCE = 0.25;          // a Fire strike in the trees can set them alight
const ROLES = {
  seer:   {name:'Seer',          house:'Seers',    hp:3, atk:1, move:3, icon:'👁'},
  talon:  {name:'Talon',         house:'Talons',   hp:6, atk:4, move:2, icon:'🏹'},
  charm:  {name:'Beast-speaker', house:'Charming', hp:3, atk:1, move:2, icon:'🦌'},
  guild:  {name:'Builder',       house:'Guild',    hp:4, atk:1, move:2, icon:'🔨'},
  wizard: {name:'You',           house:'',         hp:12, atk:7, move:2, icon:'🧙'},
  sylvara:{name:'Sylvara',       house:'',         hp:14, atk:7, move:2, icon:'🌿'},
};
const TRAINABLE = ['seer','talon','charm','guild'];
// the wild: per member
const FAC = {
  gob:  {name:'Goblins', hp:1, atk:0.6, move:1, icon:'👺'},
  varg: {name:'Varg',    hp:3, atk:1.5, move:2, icon:'🐺'},   // wolfmen; rename here
  orc:  {name:'Orcs',    hp:4, atk:2.5, move:2, icon:'👹'},
};
const WARREN = {grow:0.12, cap:12, fetishGrow:1.5, split:6, raidChance:0.05, foulAt:10, decoy:0.3};
const VARG = {packMax:6, breedEvery:4, hungry:3, raid:5, calm:5, eatGoblins:2};
const ORC = {
  arrive:[7,10,13,16,19], size:[6,8],     // weeks a warband walks in, and its size
  fellEvery:1, moveAfter:4, waaagh:10, drums:3, totemAfter:2, totemRebuild:3,
  gobJoin:3, gobWorth:0.5, harryTalon:1, stubborn:1.5, raidR:2, raidChance:0.5, rally:3,
};
const WOOD = {start:75, fell:2, ancient:12, burn:2, raze:3, slaughter:1, foul:0.3, overgraze:0.5,
  empty:0.3, noVarg:0.5, quiet:0.25, regrow:0.03, tend:3, content:65, angry:35};
const BANDS = {varg:[2,4], warrens:[2,6], game:[10,28]};
const TREES = 4, TEND = 3, SYL_START = 2, SYL_WOUND = 3;
const WOUND_TURNS = 3, WOUND_HEALER = 2, KILL_CHANCE = 0.2;
const HOME_WALLS = {hp:15, atk:4}, HAMLET_WALLS = {hp:5, atk:2};
const TALAN_BUILD = 2, TALAN_SHOT = 1.5, THICKET_TURNS = 6;
const TREANT_DMG = 2;

const TERRAIN = {
  home:  {name:'Elfhome',      pass:true},
  wood:  {name:'Woodland',     pass:true, forest:true},
  old:   {name:'Old growth',   pass:true, forest:true, deep:true},
  glade: {name:'Glade',        pass:true},
  hill:  {name:'Hills',        pass:true, forest:true, high:true},
  marsh: {name:'Marsh',        pass:true},
  crag:  {name:'Crags',        pass:true},
  lake:  {name:'Lake',         pass:false},
};

// names from the old Elfhome project (Moriquende Mardi): Seers Manx, Talons Breton, Guild Irish, the rest Welsh
const NAMES = {
  seer:{m:['Doolish','Filip','Rody','Gilno','Kerron','Bretan','Aspallan','Aldyn','Miall','Felys','Teige','Aslac','Donal','Carbry','Dolyn','Erling'],
        f:['Tosha','Aelid','Lula','Onnee','Carree','Catreena','Calybride','Creena','Conla','Moirrey','Ranhilda','Ealisaid','Averick','Diorval','Effrica','Brenta'],
        s:['Wybren','Haul','Noson','Gwener','Lleuad','Golau','Galaeth','Derwydd','Awyr','Mellt','Seren','Hud']},
  talon:{m:['Erwan','Budoc','Youenn','Marzhin','Goulwen','Aodren','Gwenneg','Abran','Ronec','Gwilherm','Gurvan','Brieg','Elouan','Briac','Arzhur','Perig'],
        f:['Aodrena','Argantael','Yuna','Enora','Klervi','Arzhela','Rozenn','Loana','Azilis','Solenn','Maiwenn','Soizic','Katell','Tifenn','Bleuenn','Azelice'],
        s:['Hebog','Bigyn','Llwynog','Saethwr','Chudyll','Bwa','Draenen','Tylluan','Blaidd','Eryr','Arth','Cleddyf']},
  guild:{m:['Kendul','Erinn','Kennan','Cullin','Darick','Keefer','Kendon','Quin','Dacey','Trinian','Cray','Doyne','Kori','Rusk'],
        f:['Erline','Mackenna','Leanna','Fineen','Alanna','Mairghread','Rosina','Marsali','Ethne','Dymphna','Kiara','Erian','Kiandre','Delanie'],
        s:['Saer','Cylchwr','Gwastrawd','Teiliwr','Pobydd','Crefft','Masnachwr','Ysgolhaig','Canhwyllbren']},
  charm:{m:['Hywel','Afon','Folant','Arawn','Griff','Ceri','Elidyr','Bran','Cadell','Arwel','Madog','Iestin','Ifan','Maldwyn'],
        f:['Angwen','Nesta','Tesni','Essyllt','Gwennan','Aneira','Mabli','Druantia','Madlen','Eilwen','Marged','Eilian','Olwen'],
        s:['Bedw','Coeden','Celyn','Dryslwyn','Glaw','Collen','Derwen','Gwern','Criafol','Cyll']},
};

// ── Hex helpers (axial, pointy-top) ──────────────────────────────────
const DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const DIR_NAMES = ['east','north-east','north-west','west','south-west','south-east'];
const key = (q,r) => q+','+r;
const unkey = k => k.split(',').map(Number);
const dist = (a,b) => { const [aq,ar]=unkey(a),[bq,br]=unkey(b); return (Math.abs(aq-bq)+Math.abs(ar-br)+Math.abs(aq+ar-bq-br))/2; };
const nbrs = k => { const [q,r]=unkey(k); return DIRS.map(([dq,dr])=>key(q+dq,r+dr)); };
const ring0 = (q,r) => Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
const HOME = key(0,0);
// the direction (of the six) a hex lies in from Elfhome
function dirOf(k){
  const [q,r]=unkey(k); const x=Math.sqrt(3)*(q+r/2), y=1.5*r;
  const a=Math.atan2(-y,x); let i=Math.round(a/(Math.PI/3)); i=((i%6)+6)%6; return i;
}

// ── Seeded random ────────────────────────────────────────────────────
function rand(S){ let t=(S.seed+=0x6D2B79F5)|0; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }
const rint = (S,a,b) => a+Math.floor(rand(S)*(b-a+1));
const pick = (S,a) => a[Math.floor(rand(S)*a.length)];
function shuffle(S,a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand(S)*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ── The map ──────────────────────────────────────────────────────────
function makeMap(S){
  const hexes={};
  for(let q=-R;q<=R;q++) for(let r=-R;r<=R;r++) if(ring0(q,r)<=R) hexes[key(q,r)]={k:key(q,r),t:'wood',felled:0,burnt:0,thicket:0,talan:0,build:0};
  const H=S.hexes=hexes, all=Object.keys(H);
  const at=(d0,d1)=>all.filter(k=>{ const d=dist(k,HOME); return d>=d0&&d<=d1; });
  const blob=(t,n,d0,d1,size)=>{ for(let i=0;i<n;i++){ let k=pick(S,at(d0,d1).filter(x=>H[x].t==='wood')); if(!k) continue; const s=rint(S,size[0],size[1]);
    const got=[k]; H[k].t=t; while(got.length<s){ const nb=nbrs(pick(S,got)).filter(x=>H[x]&&H[x].t==='wood'&&dist(x,HOME)>=d0); if(!nb.length) break; const x=pick(S,nb); H[x].t=t; got.push(x); } } };
  blob('old',5,2,R,[4,7]);
  blob('marsh',2,3,R,[3,4]);
  blob('hill',3,2,R,[2,3]);
  blob('lake',2,2,R-1,[1,2]);
  for(let i=0;i<5;i++){ const k=pick(S,at(3,R).filter(x=>H[x].t==='wood'||H[x].t==='hill')); if(k) H[k].t='crag'; }
  for(let i=0;i<12;i++){ const k=pick(S,at(1,R).filter(x=>H[x].t==='wood')); if(k) H[k].t='glade'; }
  H[HOME].t='home'; nbrs(HOME).forEach(k=>{ if(H[k].t==='lake') H[k].t='wood'; });
  // hamlets: three, every other direction at distance 2
  const off=rint(S,0,1); S.hamlets=[];
  for(let i=0;i<3;i++){ const [dq,dr]=DIRS[(i*2+off)%6]; const k=key(dq*2,dr*2); H[k].t=H[k].t==='lake'?'glade':H[k].t; H[k].hamlet=['the Herb Garden','the Shrine','the Lodge'][i]; S.hamlets.push({k, name:H[k].hamlet, sacked:0}); }
  // the ancient trees: four, spread round the wood at 3–4 out
  S.trees=[]; const start=rint(S,0,5);
  for(let i=0;i<TREES;i++){
    const want=(start+Math.round(i*1.5))%6;
    let opts=at(3,4).filter(k=>dirOf(k)===want&&H[k].t!=='lake'&&!H[k].hamlet);
    if(!opts.length) opts=at(3,4).filter(k=>H[k].t!=='lake'&&!H[k].hamlet&&!S.trees.some(t=>t.k===k));
    const k=pick(S,opts); H[k].t='old'; H[k].tree=S.trees.length;
    S.trees.push({k, name:['the Eldest Oak','the Silver Yew','the Weeping Ash','the Moonbeech'][i], tended:0, done:false, dead:false});
  }
  // everything must be reachable from Elfhome
  const seen=new Set([HOME]), q=[HOME];
  while(q.length){ const k=q.shift(); for(const n of nbrs(k)) if(H[n]&&H[n].t!=='lake'&&!seen.has(n)){ seen.add(n); q.push(n); } }
  return all.every(k=>H[k].t==='lake'||seen.has(k));
}

const isForest = h => TERRAIN[h.t].forest && !h.felled && !h.burnt;
const passable = (S,k) => !!S.hexes[k] && TERRAIN[S.hexes[k].t].pass;
// the shortest walk (BFS) from a to b; null if none. avoid: a set of hexes to keep off (but b is allowed)
function path(S,a,b,avoid){
  if(a===b) return [a];
  const prev={[a]:null}, q=[a];
  while(q.length){ const k=q.shift();
    for(const n of nbrs(k)){ if(prev[n]!==undefined||!passable(S,n)) continue; if(avoid&&avoid.has(n)&&n!==b) continue;
      prev[n]=k; if(n===b){ const p=[b]; let c=k; while(c!==null){ p.unshift(c); c=prev[c]; } return p; } q.push(n); } }
  return null;
}
const walkDist = (S,a,b) => { const p=path(S,a,b); return p?p.length-1:99; };
function reachable(S,from,steps){
  const d={[from]:0}, q=[from];
  while(q.length){ const k=q.shift(); if(d[k]>=steps) continue; for(const n of nbrs(k)) if(d[n]===undefined&&passable(S,n)){ d[n]=d[k]+1; q.push(n); } }
  return d;
}

// ── A new year ───────────────────────────────────────────────────────
let uid=1;
function elfName(S,role){ const L=NAMES[role]||NAMES.charm; const sex=rand(S)<0.5?'m':'f'; return pick(S,L[sex])+' '+pick(S,L.s); }
function addElf(S,role,pos){ const R0=ROLES[role]; const u={id:'e'+(S.nextId++), role, name:role==='wizard'?S.heroName:role==='sylvara'?'Sylvara':elfName(S,role), pos:pos||HOME, hp:R0.hp, wounded:0, moved:false, task:null}; S.elves.push(u); return u; }

function newYear(opts){
  opts=opts||{};
  let seed=opts.seed!=null?opts.seed>>>0:(Math.random()*2**32)>>>0;
  let S;
  for(let tries=0;tries<50;tries++){
    S={v:1, seed0:seed, seed, turn:1, over:null, log:[], signs:[], intel:{}, elves:[], bands:[], warrens:[], herds:[], nextId:1,
       food:30, mana:6, wood:WOOD.start, youths:1, training:[], lost:0, killedNative:0, bandWeeks:{varg:0,warrens:0,game:0},
       element:opts.element||'earth', heroName:opts.heroName||'Your wizard', spellUsed:false, sylWait:false, hints:true, stats:{},
       wizKey:opts.wizKey||null, handFights:!!opts.handFights, pending:null, step:null,
       wizSelfHeal:opts.selfHeal!==false};   // from Explore, your wizard heals only at the Healing House
    if(makeMap(S)) break; seed=(seed*1103515245+12345)>>>0;
  }
  // the wild
  const H=S.hexes, all=Object.keys(H);
  const free=(k)=>!H[k].hamlet&&H[k].tree==null&&H[k].t!=='home'&&H[k].t!=='lake';
  const glades=shuffle(S,all.filter(k=>H[k].t==='glade'&&free(k)));
  for(let i=0;i<6;i++){ const k=glades[i%glades.length]; S.herds.push({id:'h'+(S.nextId++), k, n:rint(S,2,4)}); }
  const crags=shuffle(S,all.filter(k=>H[k].t==='crag'));
  for(let i=0;i<2;i++){ const k=crags[i]; S.bands.push({id:'b'+(S.nextId++), fac:'varg', k, den:k, n:3, hunger:0, calm:0, breed:0, goal:null}); }
  const lairs=shuffle(S,all.filter(k=>(H[k].t==='marsh'||H[k].t==='crag')&&free(k)&&dist(k,HOME)>=3&&!S.bands.some(b=>b.den===k)));
  for(let i=0;i<3;i++){ const k=lairs[i]; if(k) S.warrens.push({id:'w'+(S.nextId++), k, n:rint(S,4,6), shaman:i===0, fetish:i===0?1:0, fetishWait:0}); }
  // the elves
  for(let i=0;i<4;i++) addElf(S,'seer');
  for(let i=0;i<3;i++) addElf(S,'talon');
  addElf(S,'charm'); addElf(S,'guild');
  addElf(S,'wizard');
  addElf(S,'sylvara');
  H[HOME].talan=1;
  S.orcPlan=ORC.arrive.slice();
  say(S,'dawn',`Spring comes to the Moriquende. Sylvara meets you at Elfhome's gate.`);
  if(S.hints) say(S,'sylvara',`“We can never watch all of the wood, so choose where to look. Seers see furthest from a sentry post in the trees. Watch the goblins, but don't hate them: the Varg keep them down, and the Varg are part of the wood. The ones I fear are the orcs who will come from the east.”`);
  vision(S);
  return S;
}

// ── Log ──────────────────────────────────────────────────────────────
function say(S,kind,text,k){ S.log.push({turn:S.turn, kind, text, k}); }
const seasonOf = t => Math.min(3,Math.floor((t-1)/SEASON));
const weekOf = t => (t-1)%SEASON+1;
const elfAt = (S,k) => S.elves.filter(e=>e.pos===k&&!e.wounded);
const bandsAt = (S,k) => S.bands.filter(b=>b.k===k&&b.n>0);
const warrenAt = (S,k) => S.warrens.find(w=>w.k===k&&w.n>0);
const herdAt = (S,k) => S.herds.find(h=>h.k===k&&h.n>0);
const syl = S => S.elves.find(e=>e.role==='sylvara');
const wiz = S => S.elves.find(e=>e.role==='wizard');
const mood = S => S.wood>=WOOD.content?'content':S.wood<WOOD.angry?'angry':'uneasy';
const bandPower = b => b.fac==='orc' ? b.n+(b.gobs||0)*ORC.gobWorth : b.n;

// ── Sight ────────────────────────────────────────────────────────────
// clear: you see what's there; dim: you see that something moves. Old growth further than
// the watcher's own hex is only ever dim. Mist (an uneasy wood) hides a hex altogether.
function vision(S){
  const H=S.hexes, V={};
  const mark=(k,lvl)=>{ if(!H[k]||k===S.mist) return; if(lvl==='dim'&&V[k]==='clear') return; V[k]=lvl; };
  const look=(from,clearR,dimR)=>{
    for(const k in H){ const d=dist(from,k); if(d>dimR) continue;
      let lvl=d<=clearR?'clear':'dim'; if(lvl==='clear'&&d>0&&TERRAIN[H[k].t].deep&&!H[k].felled) lvl='dim'; mark(k,lvl); } };
  look(HOME,1,2);
  S.hamlets.forEach(h=>look(h.k,0,1));
  for(const e of S.elves){ if(e.wounded) continue;
    if(e.role==='seer'){ const h=H[e.pos]; const up=h.talan&&!h.build; const hi=TERRAIN[h.t].high?1:0;
      if(up) look(e.pos,1+hi,2+hi); else look(e.pos,0,1+hi); }
    else if(e.role==='sylvara') look(e.pos,1,1);
    else look(e.pos,0,0); }
  S.vis=V;
  // what the clear hexes show is remembered
  for(const k in V) if(V[k]==='clear') S.intel[k]={turn:S.turn, what:contents(S,k)};
  return V;
}
function contents(S,k){
  const w=[]; const wr=warrenAt(S,k); if(wr) w.push({t:'warren', n:wr.n, fetish:!!wr.fetish});
  for(const b of bandsAt(S,k)) w.push({t:b.fac, n:b.n, gobs:b.gobs||0, camp:b.camp===k, totem:!!b.totem, drums:b.drums>0, id:b.id, march:b.state==='march', leave:b.state==='leave'});
  const h=herdAt(S,k); if(h) w.push({t:'herd', n:h.n});
  return w;
}
// the share of the wood you see: clearly, and at all (dim included)
const coverage = (S,dimToo) => Object.keys(S.vis).filter(k=>dimToo||S.vis[k]==='clear').length/Object.keys(S.hexes).filter(k=>S.hexes[k].t!=='lake').length;

// ── Signs: what the wood tells you about the hexes you can't see ─────
function sign(S,kind,k,opts){
  opts=opts||{};
  if(S.vis[k]==='clear'&&!opts.always) return;
  const near=S.elves.some(e=>!e.wounded&&dist(e.pos,k)<=(opts.range||3))||dist(HOME,k)<=(opts.range||3);
  if(!near&&!opts.anywhere) return;
  S.signs.push({kind, k:opts.dir?null:k, dir:opts.dir?dirOf(k):null, turn:S.turn, decoy:!!opts.decoy});
}
const SIGN_TEXT = {
  smoke:'Smoke rises', timber:'The crash of a felled tree', drums:'Goblin drums', waaagh:'War drums: a Waaagh is brewing',
  howl:'Howling', birds:'Birds start up from the trees', silence:'The wood falls silent', fire:'The trees are burning',
};

// ── Orders (the UI calls these; each returns an error string or '') ─
function canMove(S,e,k){
  if(e.role==='sylvara') return 'Sylvara goes where the trees need her.';
  if(e.wounded) return 'Wounded: resting at Elfhome.';
  if(e.moved) return 'Already moved this week.';
  if(!passable(S,k)) return 'No way through.';
  const d=reachable(S,e.pos,ROLES[e.role].move)[k]; if(d==null) return 'Too far for one week.';
  return '';
}
function move(S,id,k){ const e=S.elves.find(x=>x.id===id); if(!e) return 'No such elf.'; const err=canMove(S,e,k); if(err) return err;
  if(e.pos!==k){ e.pos=k; e.moved=true; if(e.task&&e.task.t!=='attack') e.task=null; } vision(S); return ''; }
// tasks: hunt, attack, herd (to an adjacent hex), calm, talan, thorn
function tasksFor(S,e){
  const k=e.pos, out=[]; if(e.wounded||e.role==='sylvara') return out;
  const h=herdAt(S,k), seen=S.vis[k]==='clear';
  const foes=bandsAt(S,k), wr=warrenAt(S,k);
  if((e.role==='talon'||e.role==='wizard')&&seen){
    for(const b of foes) out.push({t:'attack', id:b.id, label:`Attack the ${FAC[b.fac].name.toLowerCase()} (${b.n})`});
    if(wr) out.push({t:'attack', id:wr.id, label:`Raze the warren (${wr.n})`});
  }
  if(e.role==='talon'&&h&&h.n>=2) out.push({t:'hunt', label:'Hunt (+'+HUNT_FOOD+' food)'});
  if(e.role==='charm'){
    if(h) nbrs(k).filter(n=>passable(S,n)).forEach((n,i)=>out.push({t:'herd', to:n, label:'Herd them '+DIR_NAMES[nbrs(k).indexOf(n)]}));
    for(const b of foes) if(b.fac==='varg') out.push({t:'calm', id:b.id, label:'Calm the Varg pack'});
  }
  if(e.role==='guild'){
    const hx=S.hexes[k];
    if(!hx.talan&&hx.t!=='lake'&&(isForest(hx)||hx.t==='glade'||hx.t==='home')) out.push({t:'talan', label:'Build a sentry post ('+TALAN_BUILD+' weeks)'});
    if(!hx.thicket&&hx.t!=='home') out.push({t:'thorn', label:'Plant a thorn hedge'});
  }
  return out;
}
function setTask(S,id,task){ const e=S.elves.find(x=>x.id===id); if(!e) return 'No such elf.'; e.task=task||null; return ''; }
function canCast(S,spell,k,ring){
  if(S.spellUsed) return 'One spell a week.';
  const sp=SPELLS[spell]; const cost=spell==='strike'?sp.cost[ring||2]:sp.cost; if(S.mana<cost) return 'Not enough mana.';
  if(!S.hexes[k]) return 'Nowhere.';
  if(spell==='strike'){ if(S.vis[k]!=='clear') return 'You must see your target.'; if(!bandsAt(S,k).length&&!warrenAt(S,k)) return 'Nothing to strike there.'; }
  if(spell==='ward'&&S.hexes[k].t==='lake') return 'Not on water.';
  if(spell==='dispel'){ if(S.vis[k]!=='clear') return 'You must see your target.';
    const w=warrenAt(S,k), o=bandsAt(S,k).find(b=>b.fac==='orc'&&b.totem), burn=S.hexes[k].fire;
    if(!(w&&w.fetish)&&!o&&!burn) return 'No fetish, war-totem or fire there.'; }
  return '';
}
function cast(S,spell,k,ring){
  const err=canCast(S,spell,k,ring); if(err) return err;
  const sp=SPELLS[spell], H=S.hexes[k];
  if(spell==='strike'){ ring=ring||2; S.mana-=sp.cost[ring]; const dmg=sp.dmg[ring];
    const tgt=bandsAt(S,k).sort((a,b)=>bandPower(b)-bandPower(a))[0]||warrenAt(S,k);
    hurtWild(S,tgt,dmg,'your strike'); if(tgt.fac==='orc') tgt.harry=(tgt.harry||0)+dmg/2;
    if(S.element==='fire'&&isForest(H)&&rand(S)<FIRE_CHANCE) setFire(S,k);
  }
  if(spell==='ward'){ S.mana-=sp.cost; H.thicket=Math.max(H.thicket,sp.turns); H.warded=sp.turns; say(S,'spell',`You ward ${placeName(S,k)}: a thicket rises.`,k); }
  if(spell==='dispel'){ S.mana-=sp.cost; const w=warrenAt(S,k), o=bandsAt(S,k).find(b=>b.fac==='orc'&&b.totem);
    if(H.fire){ H.fire=0; say(S,'spell','You quench the fire.',k); }
    else if(o){ o.totem=0; o.totemWait=ORC.totemRebuild; if(o.drums>0){ o.drums=0; say(S,'spell','You break the orcs’ war-totem. The drums stop.',k); } else say(S,'spell','You break the orcs’ war-totem.',k); }
    else if(w){ w.fetish=0; w.fetishWait=5; say(S,'spell','You break the goblin shaman’s fetish.',k); } }
  S.spellUsed=true; vision(S); return '';
}
function train(S,role){ if(!TRAINABLE.includes(role)) return 'Not a calling.'; if(S.youths<1) return 'No youths ready.'; if(S.food<TRAIN_COST) return 'Not enough food.';
  S.youths--; S.food-=TRAIN_COST; S.training.push({role,left:TRAIN_TURNS}); return ''; }

function placeName(S,k){ const h=S.hexes[k]; if(h.hamlet) return h.hamlet; if(h.t==='home') return 'Elfhome'; if(h.tree!=null) return S.trees[h.tree].name; return 'the '+TERRAIN[h.t].name.toLowerCase()+' '+DIR_NAMES[dirOf(k)]+' of Elfhome'; }

// ── Fighting ─────────────────────────────────────────────────────────
// A fight is up to three exchanges. Each side deals half its attack (×0.7–1.3) a time; a
// side below 40% of the strength it started with breaks. Elves at 0 are wounded (sometimes
// killed). Returns {won:'elves'|'wild'|'a'|'b', ...}.
function hurtWild(S,b,dmg,why){
  if(!b) return 0; const f=b.fac?FAC[b.fac]:FAC.gob;
  // orc bands lose their goblins first
  if(b.fac==='orc'&&b.gobs){ const g=Math.min(b.gobs,Math.floor(dmg/FAC.gob.hp)); b.gobs-=g; dmg-=g*FAC.gob.hp; }
  b.dmg=(b.dmg||0)+dmg; const kill=Math.min(b.n,Math.floor(b.dmg/f.hp)); b.n-=kill; b.dmg-=kill*f.hp;
  if(b.n<=0){ b.n=0; b.dmg=0; }
  return kill;
}
const wildAtk = b => b.n*FAC[b.fac||'gob'].atk + (b.gobs||0)*FAC.gob.atk;
const wildHp = b => b.n*FAC[b.fac||'gob'].hp - (b.dmg||0) + (b.gobs||0)*FAC.gob.hp;
function fightElves(S,k,foe,opts){
  opts=opts||{};
  const H=S.hexes[k], elves=elfAt(S,k);
  const walls=H.t==='home'?{...HOME_WALLS}:H.hamlet?{...HAMLET_WALLS}:null;
  let wallHp=walls?walls.hp:0;
  const talanMult=H.talan&&!H.build&&!opts.attacking?1.5:1;
  const ward=H.warded?2:0;
  const elfHp0=elves.reduce((s,e)=>s+e.hp,0)+wallHp, foeHp0=wildHp(foe);
  const foeMult=opts.lair?1.5:1;
  const fac=foe.fac||'gob'; let dealt=0;
  for(let x=0;x<3;x++){
    const live=elves.filter(e=>e.hp>0); if(!live.length&&wallHp<=0) break; if(foe.n<=0) break;
    const ea=(live.reduce((s,e)=>s+ROLES[e.role].atk,0)*talanMult+(walls&&wallHp>0?walls.atk:0))*(0.7+rand(S)*0.6)/2;
    let fa=wildAtk(foe)*foeMult*(0.7+rand(S)*0.6)/2 - ward;
    const before=foe.n; hurtWild(S,foe,ea); dealt+=ea;
    // the wild hits walls first, then Talons, then whoever's left
    fa=Math.max(0,fa); if(wallHp>0){ const w=Math.min(wallHp,fa); wallHp-=w; fa-=w; }
    const order=live.slice().sort((a,b)=>(b.role==='talon')-(a.role==='talon')||b.hp-a.hp);
    for(const e of order){ if(fa<=0) break; const t=Math.min(e.hp,fa); e.hp-=t; fa-=t; }
    const elfHp=elves.reduce((s,e)=>s+Math.max(0,e.hp),0)+Math.max(0,wallHp);
    if(foe.n<=0||wildHp(foe)<foeHp0*0.4){ return endFight(S,k,elves,foe,'elves',dealt); }
    if(elfHp<elfHp0*0.4) return endFight(S,k,elves,foe,'wild',dealt);
  }
  // nobody broke: whoever has more of their strength left holds the field
  const elfLeft=(elves.reduce((s,e)=>s+Math.max(0,e.hp),0)+Math.max(0,wallHp))/Math.max(1,elfHp0), foeLeft=wildHp(foe)/Math.max(1,foeHp0);
  return endFight(S,k,elves,foe,elfLeft>=foeLeft?'elves':'wild',dealt);
}
function endFight(S,k,elves,foe,won,dealt){
  const out={won, wounded:[], killed:[], foe:foe.fac||'gob', left:foe.n};
  for(const e of elves){
    if(e.hp<=0){
      if(e.role!=='wizard'&&e.role!=='sylvara'&&rand(S)<KILL_CHANCE){ out.killed.push(e); S.elves=S.elves.filter(x=>x!==e); S.lost++; }
      else { e.wounded=e.role==='sylvara'?SYL_WOUND:WOUND_TURNS; e.pos=HOME; e.task=null; out.wounded.push(e); }
    } else if(won==='wild'&&e.pos!==HOME&&!S.hexes[k].hamlet){ e.pos=retreatTo(S,k); }
  }
  // a fight at least scratches whoever lost; heal the survivors a little after
  for(const e of S.elves) if(!e.wounded) e.hp=Math.min(ROLES[e.role].hp, Math.max(e.hp,1));
  if(foe.fac==='orc') foe.harry=(foe.harry||0)+dealt/2;
  return out;
}
function retreatTo(S,k){ let best=HOME, bd=99; for(const h of S.hamlets){ const d=dist(h.k,k); if(d<bd&&!h.sacked){ bd=d; best=h.k; } } return dist(HOME,k)<=bd?HOME:best; }
// two wild bands meet: same rules, no walls
function clash(S,a,b,k){
  const a0=wildHp(a), b0=wildHp(b);
  for(let x=0;x<3;x++){
    if(a.n<=0||b.n<=0) break;
    const da=wildAtk(a)*(0.7+rand(S)*0.6)/2, db=wildAtk(b)*(0.7+rand(S)*0.6)/2;
    hurtWild(S,b,da); hurtWild(S,a,db);
    if(wildHp(a)<a0*0.4||wildHp(b)<b0*0.4) break;
  }
  const win=wildHp(a)/Math.max(1,a0)>=wildHp(b)/Math.max(1,b0)?a:b;
  return win;
}

// ── End the week ─────────────────────────────────────────────────────
// The week runs in phases. A fight your wizard is in can pause it (S.pending, when S.handFights is on):
// the screen offers a duel or the usual settling, calls resolvePending, then endTurn again, which carries
// on from the phase it stopped in (S.step). Every phase that can pause marks what it has done this week.
const PHASES = ['orders','sylvara','herds','varg','goblins','orcs','move','meet','arrows','raids','upkeep'];
const PHASE_FN = {orders:doOrders, sylvara:sylvaraActs, herds:herdsAct, varg:vargAct, goblins:goblinsAct, orcs:orcsAct,
  move:moveBands, meet:wildMeets, arrows:nightArrows, raids:raids, upkeep:upkeep};
function endTurn(S){
  if(S.over||S.pending) return S;
  if(S.step==null){ S.step=0; S.signs=[]; }
  while(S.step<PHASES.length){
    const ph=PHASES[S.step];
    if(S.over&&ph!=='upkeep'){ S.step++; continue; }
    if(PHASE_FN[ph](S)==='pause') return S;
    S.step++;
  }
  S.step=null;
  if(!S.over){
    S.turn++;
    if(S.turn>YEAR) endYear(S);
    else {
      if(weekOf(S.turn)===1) say(S,'dawn',`${SEASONS[seasonOf(S.turn)]} comes to the Moriquende.`);
      S.mist=mood(S)==='uneasy'?pick(S,Object.keys(S.hexes).filter(k=>k!==HOME)):null;
    }
  }
  for(const e of S.elves){ e.moved=false; if(e.task&&e.task.t!=='talan') e.task=null; }
  S.spellUsed=false; S.sylWait=false;
  vision(S); dawnSigns(S);
  tallyBands(S);
  return S;
}

function doOrders(S){
  for(const e of S.elves.slice()){
    const t=e.task; if(!t||e.wounded||t.week===S.turn) continue; const k=e.pos;
    t.week=S.turn;
    if(t.t==='hunt'){ const h=herdAt(S,k); if(h&&h.n>=2){ const angry=mood(S)==='angry'; h.n--; const got=angry?Math.floor(HUNT_FOOD/2):HUNT_FOOD; S.food+=got; say(S,'elf',`${e.name} brings down a deer (+${got} food).`,k); } }
    if(t.t==='herd'){ const h=herdAt(S,k); if(h&&passable(S,t.to)){ h.k=t.to; say(S,'elf',`${e.name} leads the herd on.`,t.to); } }
    if(t.t==='calm'){ const b=S.bands.find(x=>x.id===t.id&&x.k===k); if(b){ b.calm=VARG.calm; b.goal=null; say(S,'elf',`${e.name} sings to the Varg. They quieten.`,k); } }
    if(t.t==='talan'){ const h=S.hexes[k]; if(!h.talan){ h.talan=1; h.build=TALAN_BUILD; } if(h.build>0){ h.build--; if(h.build===0){ say(S,'elf',`${e.name} finishes a sentry post.`,k); e.task=null; } } }
    if(t.t==='thorn'){ S.hexes[k].thicket=THICKET_TURNS; say(S,'elf',`${e.name} plants a thorn hedge.`,k); }
    if(t.t==='attack'){
      const foe=foeById(S,t.id); if(!foe||foe.k!==k) continue;
      // everyone else ordered to attack the same foe joins this one fight
      for(const o of S.elves) if(o.task&&o.task.t==='attack'&&o.task.id===t.id) o.task.week=S.turn;
      if(handHere(S,k)){ S.pending={kind:'attack', k, foeId:t.id}; return 'pause'; }
      attackFight(S,k,foe);
    }
  }
  S.warrens=S.warrens.filter(w=>w.n>0); S.bands=S.bands.filter(b=>b.n>0);
}
const foeById = (S,id) => S.bands.find(x=>x.id===id&&x.n>0)||S.warrens.find(x=>x.id===id&&x.n>0);
const isWarren = (S,f) => S.warrens.includes(f);
// a fight here asks the player first: your wizard is standing in it
const handHere = (S,k) => { const w=wiz(S); return !!(S.handFights&&w&&!w.wounded&&w.pos===k); };
// your elves attack a band or a warren; r (from a duel) skips the settling
function attackFight(S,k,foe,r){
  const w=isWarren(S,foe), b=w?null:foe;
  if(w) foe.fac='gob';
  r=r||fightElves(S,k,foe,{attacking:true, lair:w});
  for(const o of S.elves) if(o.task&&o.task.t==='attack'&&o.task.id===foe.id) o.task=null;
  const name=w?'the goblin warren':FAC[foe.fac].name.toLowerCase();
  if(w&&foe.n<=0){ say(S,'fight',`Your elves raze the goblin warren.`,k); S.wood-=WOOD.raze; S.killedNative++; }
  else say(S,'fight',r.won==='elves'?`Your elves rout ${name}${foe.n>0?' ('+foe.n+' flee)':''}.`:`Your elves are beaten back by ${name}.`,k);
  fightNotes(S,r,k);
  if(b&&b.fac==='varg'&&b.k===b.den&&!(b.goal&&b.goal.kind==='raid')){ S.wood-=WOOD.slaughter; S.killedNative++; }
  if(b&&b.n>0&&r.won==='elves'){ b.goal={kind:'home', k:b.den||b.k}; if(b.fac==='gob') b.goal={kind:'home',k:(S.warrens.find(x=>x.id===b.from)||{k:b.k}).k}; }
  S.warrens=S.warrens.filter(x=>x.n>0); S.bands=S.bands.filter(x=>x.n>0);
}
function fightNotes(S,r,k){
  for(const e of r.wounded) say(S,'hurt',`${e.name} is wounded and carried home.`,k);
  for(const e of r.killed) say(S,'dead',`${e.name} falls. The Moriquende mourns.`,k);
}

function sylvaraActs(S){
  const s=syl(S); if(!s) return;
  if(s.wounded) return;
  if(S.turn<SYL_START) return;
  const todo=S.trees.filter(t=>!t.done&&!t.dead);
  if(!todo.length){ if(s.pos!==HOME){ s.pos=stepToward(S,s.pos,HOME,2,dangerSet(S)); } return; }
  const here=todo.find(t=>t.k===s.pos);
  if(here){ here.tended++; if(here.tended>=TEND){ here.done=true; S.wood+=WOOD.tend; say(S,'sylvara',`Sylvara finishes tending ${here.name}. ${S.trees.filter(t=>t.done).length} of ${TREES} trees will live.`,here.k); } else say(S,'sylvara',`Sylvara tends ${here.name}.`,here.k); return; }
  if(S.sylWait){ say(S,'sylvara','Sylvara waits a week, as you asked.',s.pos); return; }
  const tgt=todo.slice().sort((a,b)=>walkDist(S,s.pos,a.k)-walkDist(S,s.pos,b.k))[0];
  const was=s.pos; s.pos=stepToward(S,s.pos,tgt.k,ROLES.sylvara.move,dangerSet(S));
  if(s.pos!==was&&weekOf(S.turn)%2===1) say(S,'sylvara',`Sylvara walks toward ${tgt.name}.`,s.pos);
}
// what the elves can see of the wild: Sylvara keeps clear of it (she knows only what your watchers know)
function dangerSet(S){ const d=new Set(); for(const b of S.bands) if(S.vis[b.k]==='clear'&&!(b.fac==='varg'&&b.calm)) { d.add(b.k); } for(const w of S.warrens) if(S.vis[w.k]==='clear') d.add(w.k); return d; }
function stepToward(S,from,to,steps,avoid){
  const p=path(S,from,to,avoid)||path(S,from,to); if(!p) return from;
  return p[Math.min(steps,p.length-1)];
}

function herdsAct(S){
  const sp=seasonOf(S.turn)===0;
  for(const h of S.herds){
    if(sp&&h.n>=2&&S.turn%2===0) h.n=Math.min(6,h.n+1);
    if(rand(S)<0.25){ const opts=nbrs(h.k).filter(k=>passable(S,k)&&S.hexes[k].t!=='home'); const g=opts.filter(k=>S.hexes[k].t==='glade'); const k=pick(S,g.length&&rand(S)<0.6?g:opts); if(k){ h.k=k; sign(S,'birds',k,{range:2}); } }
  }
  // a big herd splits; a dead one is gone
  for(const h of S.herds.slice()) if(h.n>=6){ const nb=nbrs(h.k).filter(k=>passable(S,k)); if(nb.length){ h.n=3; S.herds.push({id:'h'+(S.nextId++), k:pick(S,nb), n:3}); } }
  S.herds=S.herds.filter(h=>h.n>0);
}
const gameTotal = S => S.herds.reduce((s,h)=>s+h.n,0);

function vargAct(S){
  for(const b of S.bands.filter(x=>x.fac==='varg')){
    if(b.calm>0) b.calm--;
    // eat: a herd within reach
    const reach=b.hunger>=VARG.hungry?4:2;
    const herds=S.herds.filter(h=>h.n>0&&dist(h.k,b.k)<=reach).sort((x,y)=>dist(x.k,b.k)-dist(y.k,b.k));
    const gobs=[...S.warrens.filter(w=>w.n>0&&dist(w.k,b.k)<=reach), ...S.bands.filter(x=>x.fac==='gob'&&dist(x.k,b.k)<=reach)];
    if(b.goal&&b.goal.kind==='raid'){ /* already on the way */ }
    else if(herds.length&&(b.hunger>=1||rand(S)<0.5)){ b.goal={kind:'hunt', k:herds[0].k}; }
    else if(gobs.length&&b.hunger>=1&&rand(S)<0.4){ b.goal={kind:'gobs', k:gobs[0].k}; }
    else if(b.hunger>=VARG.raid&&!b.calm){
      const tgts=[...S.elves.filter(e=>!e.wounded&&e.pos!==HOME).map(e=>e.pos), ...S.hamlets.map(h=>h.k)].filter(k=>dist(k,b.k)<=5).sort((x,y)=>dist(x,b.k)-dist(y,b.k));
      if(tgts.length){ b.goal={kind:'raid', k:tgts[0]}; sign(S,'howl',b.k,{dir:true, anywhere:true}); }
    } else if(!b.goal||b.goal.kind!=='home') b.goal={kind:'home', k:b.den};
    if(b.hunger>=VARG.hungry) sign(S,'howl',b.k,{dir:true, anywhere:true});
    b.hunger++;
    // breed when fed
    if(b.hunger<=1){ b.breed++; if(b.breed>=VARG.breedEvery&&b.n<VARG.packMax){ b.n++; b.breed=0; } }
    // a full pack splits off a new one, if the wood can feed it
    if(b.n>=VARG.packMax&&gameTotal(S)>=14){ const den=Object.keys(S.hexes).filter(k=>S.hexes[k].t==='crag'&&!S.bands.some(x=>x.den===k)); if(den.length){ const d=pick(S,den); b.n-=3; S.bands.push({id:'b'+(S.nextId++), fac:'varg', k:b.k, den:d, n:3, hunger:0, calm:0, breed:0, goal:{kind:'home',k:d}}); } }
  }
}

function goblinsAct(S){
  const H=S.hexes;
  for(const w of S.warrens.slice()){
    if(w.shaman&&!w.fetish){ if(w.fetishWait>0) w.fetishWait--; else w.fetish=1; }
    const g=Math.max(1,Math.round(w.n*WARREN.grow*(w.fetish?WARREN.fetishGrow:1)));
    w.n=Math.min(WARREN.cap,w.n+(rand(S)<0.7?g:0));
    if(w.fetish&&rand(S)<WARREN.decoy){ const k=pick(S,nbrs(w.k).filter(x=>H[x])); if(k) sign(S,'smoke',k,{decoy:true, range:4}); }
    if(w.n>=WARREN.cap){
      // split: half go off to dig a new warren 2–3 hexes away
      const opts=Object.keys(H).filter(k=>{ const d=dist(k,w.k); return d>=2&&d<=3&&(H[k].t==='marsh'||H[k].t==='crag'||H[k].t==='old'||H[k].t==='wood')&&!H[k].hamlet&&H[k].t!=='home'&&H[k].tree==null&&!warrenAt(S,k)&&dist(k,HOME)>=2; });
      const best=opts.filter(k=>H[k].t==='marsh'||H[k].t==='crag'); const k=pick(S,best.length?best:opts);
      if(k){ const n=WARREN.split; w.n-=n; S.bands.push({id:'b'+(S.nextId++), fac:'gob', k:w.k, n, goal:{kind:'found', k}, from:w.id, shaman:rand(S)<0.3}); sign(S,'drums',w.k,{dir:true, range:4}); }
    }
    // raids
    if(rand(S)<WARREN.raidChance*w.n/4){
      const tgts=[...S.elves.filter(e=>!e.wounded&&e.pos!==HOME).map(e=>e.pos), ...S.hamlets.filter(h=>!h.sacked).map(h=>h.k)].filter(k=>dist(k,w.k)<=3).sort((x,y)=>dist(x,w.k)-dist(y,w.k));
      if(tgts.length&&w.n>=5){ const n=Math.min(w.n-2,rint(S,3,5)); w.n-=n; S.bands.push({id:'b'+(S.nextId++), fac:'gob', k:w.k, n, goal:{kind:'raid', k:tgts[0]}, from:w.id}); sign(S,'drums',w.k,{dir:true, range:4}); }
    }
    if(w.n>WARREN.foulAt) S.wood-=WOOD.foul;
  }
}

function orcsAct(S){
  const H=S.hexes;
  // arrivals from the eastern edge
  if(S.orcPlan.length&&S.turn>=S.orcPlan[0]){
    S.orcPlan.shift();
    const edge=Object.keys(H).filter(k=>ring0(...unkey(k))===R&&passable(S,k)&&[0,1,5].includes(dirOf(k)));
    const k=pick(S,edge); const n=rint(S,ORC.size[0],ORC.size[1]);
    S.bands.push({id:'b'+(S.nextId++), fac:'orc', k, n, gobs:0, state:'arrive', camp:null, fell:0, harry:0, totem:0, totemWait:ORC.totemAfter, drums:0, goal:null, name:orcName(S)});
    say(S,'orc',`Orcs have entered the Moriquende from the east: the ${S.bands[S.bands.length-1].name}.`);
    sign(S,'smoke',k,{anywhere:true});
  }
  for(const b of S.bands.filter(x=>x.fac==='orc')){
    if(b.state==='leave'){ b.goal={kind:'leave', k:edgeNear(S,b.k)}; continue; }
    if(b.state==='march'){ b.goal={kind:'march', k:HOME}; continue; }
    // harried enough, they move on
    if((b.harry||0)>=bandPower(b)*ORC.stubborn){ b.state='leave'; b.camp=null; b.drums=0; say(S,'orc',`The ${b.name} have had enough of the Moriquende and are moving on.`,b.k); continue; }
    if(b.state==='arrive'){
      if(!b.goal){ const glades=Object.keys(H).filter(k=>(H[k].t==='glade'||H[k].felled)&&dist(k,HOME)>=2&&dist(k,b.k)<=4&&!H[k].hamlet&&!S.bands.some(o=>o!==b&&o.fac==='orc'&&o.camp===k)&&nbrs(k).some(n=>H[n]&&isForest(H[n])))
          .sort((x,y)=>dist(x,HOME)+dist(x,b.k)*0.5-dist(y,HOME)-dist(y,b.k)*0.5); b.goal={kind:'camp', k:glades[0]||b.k}; }
      if(b.k===b.goal.k){ b.state='camp'; b.camp=b.k; b.goal=null; b.fell=0; }
      continue;
    }
    if(b.drums>0&&b.totem){ b.drums--; sign(S,'waaagh',b.k,{dir:true, anywhere:true});
      if(b.drums<=0){ b.state='march'; b.goal={kind:'march',k:HOME}; say(S,'orc',`WAAAGH! The ${b.name} march on Elfhome!`);
        // every orc band within reach rallies to it
        for(const o of S.bands) if(o!==b&&o.fac==='orc'&&o.state!=='leave'&&dist(o.k,b.k)<=ORC.rally){ b.n+=o.n; b.gobs=(b.gobs||0)+(o.gobs||0); o.n=0; say(S,'orc','Another orc band rallies to the Waaagh.'); }
        continue; } }
    if(b.state==='camp'){
      // out from camp after any elf in reach, Sylvara above all
      if(b.goal&&b.goal.kind==='raid') continue;
      const prey=S.elves.filter(e=>!e.wounded&&e.pos!==HOME&&dist(e.pos,b.k)<=ORC.raidR&&dist(e.pos,b.k)>0).sort((x,y)=>(y.role==='sylvara')-(x.role==='sylvara')||dist(x.pos,b.k)-dist(y.pos,b.k));
      if(prey.length&&rand(S)<ORC.raidChance){ b.goal={kind:'raid', k:prey[0].pos}; continue; }
      // fell a tree a week
      const trees=nbrs(b.k).filter(k=>H[k]&&isForest(H[k])&&k!==HOME);
      if(trees.length){ const anc=trees.find(k=>H[k].tree!=null); const k=anc&&rand(S)<0.3?anc:pick(S,trees); fell(S,k,b); b.fell++; }
      sign(S,'smoke',b.k,{range:4});
      // the totem goes up after a while; a big enough band with one beats the drums
      if(!b.totem){ if(b.totemWait>0) b.totemWait--; else b.totem=1; }
      if(bandPower(b)>=ORC.waaagh&&b.totem){
        if(!b.drums){ b.drums=ORC.drums; say(S,'orc',`War drums from the ${b.name}: a Waaagh is brewing.`); sign(S,'waaagh',b.k,{dir:true, anywhere:true}); }
      }
      // goblins near the camp join
      for(const w of S.warrens) if(w.n>0&&dist(w.k,b.k)<=2){ const n=Math.min(w.n,ORC.gobJoin); w.n-=n; b.gobs=(b.gobs||0)+n; }
      if(!trees.length||b.fell>=ORC.moveAfter){ b.state='arrive'; b.camp=null; b.goal=null; }
    }
  }
  S.warrens=S.warrens.filter(w=>w.n>0);
}
function orcName(S){ return pick(S,['Xagg','Urth','Kold','Xanthus','Nekro','Daimon','Gorr','Skarr','Mogg'])+pick(S,['ugg','akk','orn','urr','oll'])+'’s band'; }
function edgeNear(S,k){ const e=Object.keys(S.hexes).filter(x=>ring0(...unkey(x))===R&&passable(S,x)); return e.sort((a,b)=>dist(a,k)-dist(b,k))[0]; }
function fell(S,k,b){
  const h=S.hexes[k]; h.felled=1;
  S.wood-=WOOD.fell; sign(S,'timber',k,{anywhere:true});
  if(h.tree!=null){ const t=S.trees[h.tree]; if(!t.dead){ t.dead=true; S.wood-=WOOD.ancient; say(S,'tree',`The orcs have felled ${t.name}. Sylvara weeps.`,k); } }
  else if(S.vis[k]==='clear') say(S,'orc','Orcs fell the trees.',k);
}
function setFire(S,k){ const h=S.hexes[k]; if(h.fire||!isForest(h)) return; h.fire=2; say(S,'fire','Your fire catches in the trees!',k); }

function moveBands(S){
  const H=S.hexes;
  for(const b of S.bands){
    if(!b.goal||b.n<=0) continue;
    if(b.held){ b.held=0; continue; }
    let steps=FAC[b.fac].move;
    const avoid=b.fac==='varg'?new Set(S.bands.filter(o=>o.fac==='orc').map(o=>o.k)):null;
    const p=path(S,b.k,b.goal.k,avoid)||path(S,b.k,b.goal.k); if(!p) { b.goal=null; continue; }
    for(let i=1;i<p.length&&steps>0;i++){
      b.k=p[i]; steps--; sign(S,'birds',b.k,{range:2});
      if(H[b.k].thicket){ b.held=1; break; }
      if(elfAt(S,b.k).length&&b.fac!=='varg'&&!(b.fac==='orc'&&b.state==='leave')) break;
    }
    if(b.k===b.goal.k){
      const g=b.goal;
      if(g.kind==='found'){ S.warrens.push({id:'w'+(S.nextId++), k:b.k, n:b.n, shaman:!!b.shaman, fetish:0, fetishWait:2}); b.n=0; sign(S,'drums',b.k,{dir:true,range:4}); }
      else if(g.kind==='home'&&b.fac==='gob'){ const w=S.warrens.find(x=>x.k===b.k); if(w){ w.n+=b.n; b.n=0; } else b.goal=null; }
      else if(g.kind==='home') b.goal=null;
      // a raid that finds no one turns for home
      else if(g.kind==='raid'&&!elfAt(S,b.k).length&&!H[b.k].hamlet&&b.k!==HOME) b.goal=b.fac==='orc'?(b.camp?{kind:'home',k:b.camp}:null):b.fac==='varg'?{kind:'home',k:b.den}:{kind:'home',k:(S.warrens.find(x=>x.id===b.from)||{k:b.k}).k};
      else if(g.kind==='leave'){ say(S,'orc',`The ${b.name} leave the Moriquende.`); b.n=0; }
    }
  }
  S.bands=S.bands.filter(b=>b.n>0);
}

// who meets whom in the wild
function wildMeets(S){
  const H=S.hexes;
  for(const b of S.bands.slice()){
    if(b.n<=0) continue;
    // varg on a herd eat; on goblins, they hunt them
    if(b.fac==='varg'){
      const h=herdAt(S,b.k); if(h&&b.goal&&b.goal.kind==='hunt'){ h.n--; b.hunger=0; b.goal={kind:'home',k:b.den}; if(rand(S)<0.4) sign(S,'howl',b.k,{dir:true,anywhere:true}); }
      const w=warrenAt(S,b.k); const gb=S.bands.find(x=>x.fac==='gob'&&x.k===b.k&&x.n>0);
      const prey=gb||w;
      if(prey){ const eaten=Math.min(prey.n,VARG.eatGoblins+Math.floor(b.n/3)); prey.n-=eaten; b.hunger=Math.max(0,b.hunger-2); if(S.vis[b.k]==='clear') say(S,'wild',`The Varg fall on the goblins (${eaten} taken).`,b.k); b.goal={kind:'home',k:b.den}; }
    }
    // goblin bands next to orcs join them
    if(b.fac==='gob'){ const o=S.bands.find(x=>x.fac==='orc'&&x.n>0&&x.state!=='leave'&&dist(x.k,b.k)<=1); if(o){ o.gobs=(o.gobs||0)+b.n; b.n=0; if(S.vis[o.k]) say(S,'orc','Goblins join the orcs.',o.k); } }
    // orcs meeting orcs: two bands become one
    if(b.fac==='orc'&&b.state!=='leave'){ const o=S.bands.find(x=>x!==b&&x.fac==='orc'&&x.n>0&&x.state!=='leave'&&dist(x.k,b.k)<=1); if(o){ b.n+=o.n; b.gobs=(b.gobs||0)+(o.gobs||0); b.totem=b.totem||o.totem; o.n=0; say(S,'orc',`Two orc bands have joined: the ${b.name} grow.`); } }
    // orcs and Varg fight
    if(b.fac==='orc'){ const v=S.bands.find(x=>x.fac==='varg'&&x.n>0&&dist(x.k,b.k)<=1); if(v){ const win=clash(S,b,v,b.k); if(v.n>0) v.goal={kind:'home',k:v.den}; if(S.vis[b.k]||S.vis[v.k]) say(S,'wild',`Orcs and Varg fight. ${win===b?'The orcs':'The Varg'} hold.`,b.k); else sign(S,'howl',v.k,{dir:true,anywhere:true}); } }
    if(b.fac==='orc'&&b.state!=='leave'){ const h=S.herds.find(x=>x.n>0&&dist(x.k,b.k)<=1); if(h&&rand(S)<0.5) h.n--; }
  }
  S.bands=S.bands.filter(b=>b.n>0); S.warrens=S.warrens.filter(w=>w.n>0); S.herds=S.herds.filter(h=>h.n>0);
}

function nightArrows(S){
  const H=S.hexes;
  // sentry posts with Talons in them shoot at the wild passing by
  for(const k in H){ const h=H[k]; if(!h.talan||h.build) continue;
    const talons=S.elves.filter(e=>e.pos===k&&!e.wounded&&e.role==='talon').length + (k===HOME?1:0);
    if(!talons) continue;
    for(const b of S.bands) if(dist(b.k,k)<=1&&b.fac!=='varg'&&b.n>0&&(S.vis[b.k]==='clear')){ const before=b.n; hurtWild(S,b,TALAN_SHOT*talons); if(b.fac==='orc') b.harry=(b.harry||0)+TALAN_SHOT*talons/2; if(b.n<before) say(S,'fight',`Arrows from the sentry post: ${before-b.n} ${FAC[b.fac].name.toLowerCase()} fall.`,b.k); }
  }
  // Talons out in the wood harry any orc camp next to them
  for(const b of S.bands) if(b.fac==='orc'&&b.camp) b.harry=(b.harry||0)+S.elves.filter(e=>e.role==='talon'&&!e.wounded&&dist(e.pos,b.k)===1).length*ORC.harryTalon;
  // a content wood fights for itself: the trees in old growth strike raiders
  if(mood(S)==='content') for(const b of S.bands) if(b.fac==='orc'&&H[b.k].t==='old'&&!H[b.k].felled){ hurtWild(S,b,TREANT_DMG); if(S.vis[b.k]) say(S,'wood','The trees themselves strike at the orcs.',b.k); }
  // fire spreads, then burns out
  for(const k in H){ const h=H[k]; if(!h.fire) continue; h.fire--; if(!h.burnt){ h.burnt=1; S.wood-=WOOD.burn; sign(S,'fire',k,{anywhere:true}); if(h.tree!=null&&!S.trees[h.tree].dead){ S.trees[h.tree].dead=true; S.wood-=WOOD.ancient; say(S,'tree',`${S.trees[h.tree].name} burns!`,k); } }
    if(h.fire>0&&rand(S)<0.3){ const n=pick(S,nbrs(k).filter(x=>H[x]&&isForest(H[x])&&!H[x].thicket)); if(n) H[n].fire=2; } }
  S.bands=S.bands.filter(b=>b.n>0);
}
// raids: the wild in a hex with elves (or at a hamlet, or Elfhome) attacks
function raids(S){
  const H=S.hexes;
  for(const b of S.bands.slice()){
    if(b.n<=0||b.raided===S.turn) continue;
    const k=b.k, elves=elfAt(S,k), hx=H[k];
    const hostile=b.fac==='orc'?b.state!=='leave':b.fac==='gob'?true:(b.goal&&b.goal.kind==='raid'&&!b.calm);
    if(!hostile) continue;
    if(!elves.length&&!hx.hamlet&&k!==HOME) continue;
    if(hx.hamlet&&!elves.length&&S.hamlets.find(h=>h.k===k).sacked) continue;
    b.raided=S.turn;
    if(handHere(S,k)){ S.pending={kind:'raid', k, foeId:b.id}; return 'pause'; }
    raidFight(S,b);
    if(S.over) return;
  }
  S.bands=S.bands.filter(b=>b.n>0);
}
function raidFight(S,b,r){
  const H=S.hexes, k=b.k, hx=H[k];
  r=r||fightElves(S,k,b);
  {
    const who=b.fac==='orc'?`The ${b.name}`:FAC[b.fac].name;
    if(k===HOME){
      if(r.won==='wild'){ S.over='fallen'; say(S,'end',`${who} break into Elfhome. The Moriquende has lost its heart.`,k); return; }
      say(S,'fight',`${who} attack Elfhome and are thrown back.`,k);
      if(b.fac==='orc'){ b.state='leave'; b.drums=0; }
    } else if(hx.hamlet&&r.won==='wild'){ const h=S.hamlets.find(x=>x.k===k); h.sacked=4; const stole=Math.min(S.food,6); S.food-=stole; say(S,'fight',`${who} sack ${h.name}${stole?' and carry off '+stole+' food':''}.`,k); }
    else say(S,'fight',r.won==='elves'?`${who} attack your elves and are driven off.`:`${who} overrun your elves.`,k);
    fightNotes(S,r,k);
    if(b.n>0&&b.fac==='orc'&&b.camp&&b.state==='camp') b.goal={kind:'home',k:b.camp};
    if(b.n>0){ if(b.fac==='gob') b.goal={kind:'home', k:(S.warrens.find(x=>x.id===b.from)||{k:b.k}).k}; else if(b.fac==='varg'){ b.goal={kind:'home',k:b.den}; if(r.won==='wild') b.hunger=0; } }
  }
  S.bands=S.bands.filter(b=>b.n>0);
}

// ── Fighting it yourself (a duel in the battle engine) ───────────────
// battleSetup describes the duel for the pending fight: the band becomes up to three seats, each standing
// for several of them (`level` from SURVIVAL_LEVELS and `hpMul` for the rest); the elves beside you
// become one ally seat (Sylvara herself if she's there, else the Talons, stronger behind Elfhome's walls
// or a hamlet's). The screen turns this into startExploreBattle's seats.
// per: how many of a band one seat stands for; walls: an Elfhome / hamlet ally seat's extra levels and HP
const DUEL = {seatsMax:3, levelAt:[1.2,2.2,3.2], hpPer:0.15, per:{gob:2, varg:2, orc:2.5}, wallHp:[1,1.3,1.8]};
function battleSetup(S,p){
  p=p||S.pending; const foe=foeById(S,p.foeId), k=p.k, H=S.hexes[k];
  const me=wiz(S), here=elfAt(S,k).filter(e=>e!==me);
  const sy=here.find(e=>e.role==='sylvara'), talons=here.filter(e=>e.role==='talon');
  const walls=k===HOME?2:H.hamlet?1:0;
  const cands=[];
  if(sy) cands.push({key:'sylvara', wizard:true, hpFrac:sy.hp/ROLES.sylvara.hp, represent:[sy.id], name:'SYLVARA'});
  if(talons.length||walls) cands.push({key:'elf_talon', level:Math.min(3,Math.max(0,talons.length-1+walls)), represent:talons.map(e=>e.id),
    hpMul:DUEL.wallHp[walls]*(1+0.15*Math.max(0,talons.length-1)),
    name:talons.length?(talons.length>1?talons.length+' TALONS':'TALON'):'ELFHOME\u2019S WARDENS'});
  // the band's seats
  const fac=foe.fac||'gob', gobs=foe.gobs||0;
  const members=fac==='orc'?foe.n:foe.n;
  const want=Math.ceil(members/DUEL.per[fac])+(gobs>=3?1:0);
  const room=DUEL.seatsMax-(cands.length?1:0);
  const nSeats=Math.max(1,Math.min(room,want));
  const keys=[];
  if(fac==='gob') for(let i=0;i<nSeats;i++) keys.push('goblin');
  if(fac==='varg') for(let i=0;i<nSeats;i++) keys.push(i===0&&members>=4?'varg_alpha':'varg');
  if(fac==='orc'){ const lead=foe.state==='march'||bandPower(foe)>=ORC.waaagh?'orc_warboss':members>=5?'orc_bigun':'orc';
    const gobSeat=gobs>=3&&nSeats>=2;
    for(let i=0;i<nSeats;i++) keys.push(i===0?lead:gobSeat&&i===nSeats-1?'goblin':'orc'); }
  // share the members out: goblins in an orc band get their own seat
  const orcSeats=keys.filter(x=>x!=='goblin').length, gobSeats=keys.length-orcSeats;
  const foes=keys.map(key=>{
    const m=key==='goblin'&&fac==='orc'?gobs/gobSeats:fac==='orc'?members/orcSeats:members/nSeats;
    const level=m<=DUEL.levelAt[0]?0:m<=DUEL.levelAt[1]?1:m<=DUEL.levelAt[2]?2:3;
    return {key, level, hpMul:m>4?1+DUEL.hpPer*(m-4):1, m:Math.round(m*10)/10};
  });
  const allies=cands.slice(0,DUEL.seatsMax-foes.length);
  return {foes, allies, hpFrac:me.hp/ROLES.wizard.hp, k, kind:p.kind, foeName:fac==='orc'?foe.name:FAC[fac].name, warren:isWarren(S,foe),
    represent:allies.reduce((a,x)=>a.concat(x.represent),[])};
}
// the auto-settled chance of winning, for the fight prompt: the same fight played out on copies
function autoOdds(S,tries){
  const p=S.pending; let won=0; tries=tries||40;
  for(let i=0;i<tries;i++){ const C=api.clone(S); C.seed=(C.seed+i*7919)>>>0; const f=foeById(C,p.foeId);
    const r=fightElves(C,p.k,f,p.kind==='attack'?{attacking:true,lair:isWarren(C,f)}:{}); if(r.won==='elves') won++; }
  return won/tries;
}
// settle the pending fight: out=null settles it as usual; else a duel's result
// {won, foeLeft (0–1 of the band's seats' HP), hpEnd, maxHp, allyHp:[…]}
function resolvePending(S,out){
  const p=S.pending; if(!p) return; S.pending=null;
  const foe=foeById(S,p.foeId); if(!foe) return;
  const run=r=>p.kind==='attack'?attackFight(S,p.k,foe,r):raidFight(S,foe,r);
  if(!out){ run(); return; }
  const set=battleSetup(S,p), me=wiz(S);
  const hp0=wildHp(foe), dealt=out.won?hp0+1:hp0*Math.max(0,1-(out.foeLeft==null?1:out.foeLeft));
  hurtWild(S,foe,dealt);   // (endFight adds the orcs' harry)
  // you, and the elves your ally seat stood for
  me.hp=out.won?Math.max(1,Math.round(ROLES.wizard.hp*(out.hpEnd||0)/(out.maxHp||1))):0;
  const allyDown=out.won?(out.allyHp||[]).map(h=>h<=0):set.allies.map(()=>true);
  set.allies.forEach((a,i)=>{ if(allyDown[i]) for(const id of a.represent){ const e=S.elves.find(x=>x.id===id); if(e) e.hp=0; } });
  say(S,'duel',out.won?`You lead the fight yourself, and win it.`:`You lead the fight yourself, and fall.`,p.k);
  if(out.won||foe.n<=0){ run(endFight(S,p.k,elfAt(S,p.k),foe,'elves',dealt)); return; }
  // beaten: those who fell are carried home; whoever's left (and any walls) fight on as usual
  const down=elfAt(S,p.k).filter(e=>e.hp<=0), r0=endFight(S,p.k,down,foe,'wild',dealt);
  fightNotes(S,r0,p.k);
  const H=S.hexes[p.k];
  if(foe.n>0&&(elfAt(S,p.k).length||p.k===HOME||H.hamlet)) run();
  else run({won:'wild', wounded:[], killed:[], foe:foe.fac||'gob', left:foe.n});
}

function upkeep(S){
  const H=S.hexes, se=seasonOf(S.turn);
  // food
  let forage=0; for(const k in H) if(dist(k,HOME)<=2&&isForest(H[k])||dist(k,HOME)<=2&&H[k].t==='glade') forage+=FORAGE_PER_HEX;
  forage*=FORAGE[se]*(mood(S)==='angry'?0.5:1);
  forage+=S.hamlets.filter(h=>!h.sacked).length*HAMLET_FOOD;
  const mouths=S.elves.filter(e=>e.role!=='sylvara').length*EAT+S.youths*YOUTH_EAT;
  S.food=Math.round((S.food+forage-mouths)*10)/10;
  if(S.food<0){ S.food=0; const e=pick(S,S.elves.filter(x=>x.role!=='wizard'&&x.role!=='sylvara')); if(e){ S.elves=S.elves.filter(x=>x!==e); S.lost++; say(S,'dead',`Hunger: ${e.name} leaves for a grove that can feed them.`); } }
  // youths, training, wounds, hamlets
  if(S.turn%YOUTH_EVERY===0&&S.food>=YOUTH_FOOD){ S.youths++; say(S,'elf','A youth of Elfhome comes of age and is ready to learn a calling.'); }
  for(const t of S.training.slice()){ if(--t.left<=0){ const e=addElf(S,t.role); say(S,'elf',`${e.name} joins the ${ROLES[t.role].house}.`); S.training=S.training.filter(x=>x!==t); } }
  const healers=0;
  const selfHeal=e=>e.role!=='wizard'||S.wizSelfHeal!==false;
  for(const e of S.elves) if(e.wounded){ e.wounded--; if(!e.wounded) { e.hp=selfHeal(e)?ROLES[e.role].hp:Math.ceil(ROLES[e.role].hp/4); say(S,'elf',selfHeal(e)?`${e.name} is well again.`:`${e.name} is back on their feet, just. The Healing House could do more.`); } }
  for(const e of S.elves) if(!e.wounded&&selfHeal(e)) e.hp=Math.min(ROLES[e.role].hp,e.hp+1);
  for(const h of S.hamlets) if(h.sacked) h.sacked--;
  for(const k in H){ const h=H[k]; if(h.thicket) h.thicket--; if(h.warded) h.warded--;
    if((h.felled||h.burnt)&&h.tree==null&&rand(S)<WOOD.regrow){ h.felled=0; h.burnt=0; } }
  // mana
  S.mana=Math.min(MANA_MAX,S.mana+MANA_REGEN+(mood(S)==='content'?1:0));
  // the wood's balance
  const g=gameTotal(S);
  if(g>BANDS.game[1]) S.wood-=WOOD.overgraze; if(g<BANDS.game[0]) S.wood-=WOOD.empty;
  if(!S.bands.some(b=>b.fac==='varg')) S.wood-=WOOD.noVarg;
  if(!S.signs.some(s=>s.kind==='timber'||s.kind==='fire')) S.wood+=WOOD.quiet;
  S.wood=Math.max(0,Math.min(100,Math.round(S.wood*100)/100));
}

function dawnSigns(S){
  // silence where a herd was eaten out; signs that are already in plain view aren't news
  S.signs=S.signs.filter((s,i,a)=>a.findIndex(x=>x.kind===s.kind&&x.k===s.k&&x.dir===s.dir)===i);
}

function tallyBands(S){
  const v=S.bands.filter(b=>b.fac==='varg').length, w=S.warrens.length, g=gameTotal(S);
  if(v>=BANDS.varg[0]&&v<=BANDS.varg[1]) S.bandWeeks.varg++;
  if(w>=BANDS.warrens[0]&&w<=BANDS.warrens[1]) S.bandWeeks.warrens++;
  if(g>=BANDS.game[0]&&g<=BANDS.game[1]) S.bandWeeks.game++;
}

function endYear(S){
  S.turn=YEAR;
  for(const t of S.trees) if(!t.done&&!t.dead){ t.dead=true; S.wood-=WOOD.ancient/2; say(S,'tree',`${t.name} was never tended. It dies with the year.`,t.k); }
  const sc=score(S);
  S.over=sc.ending;
  say(S,'end',ENDINGS[sc.ending].text);
}
const ENDINGS = {
  song:    {name:'The Wood in Song', text:'Winter ends. Sylvara walks the wood with you and listens. “It is singing,” she says. “I will come with you, when you go.”'},
  endures: {name:'The Wood Endures', text:'Winter ends. The Moriquende is hurt, but it stands. Sylvara thanks you, and says she will find you when the wood can spare her.'},
  scarred: {name:'The Wood Scarred', text:'Winter ends. Elfhome stands, but the wood is scarred. Sylvara will stay to mend it.'},
  fallen:  {name:'Elfhome Falls', text:'Elfhome has fallen. Sylvara leads the survivors deeper into the wood.'},
};
function score(S){
  const trees=S.trees.filter(t=>t.done&&!t.dead).length;
  const bal=(S.bandWeeks.varg+S.bandWeeks.warrens+S.bandWeeks.game)/(3*YEAR);
  const pts=Math.round(S.wood + bal*30 + trees*10 - S.lost*5);
  let ending='scarred';
  if(S.over==='fallen') ending='fallen';
  else if(trees===TREES&&S.wood>=70&&bal>=0.7) ending='song';
  else if(trees>=3&&S.wood>=45) ending='endures';
  return {pts, trees, bal:Math.round(bal*100), wood:Math.round(S.wood), lost:S.lost, ending};
}

// ── Counsel: the Eldest's advice from what your watchers know ────────
// Reads only what the player can know (clear sight, memory up to COUNSEL.memory weeks old, this week's
// signs, the log's public news), never the hidden state. Returns advice, most urgent first:
// [{pri, house, text}]. Olwen gives it in Elfhome (js/explore_elfhome.js).
const COUNSEL = {memory:3, escort:2, posts:3, seersWanted:6, foodLow:15, foodHunt:20, warrensMany:6};
function counsel(S){
  const H=S.hexes, out=[], add=(pri,house,text)=>out.push({pri,house,text}), at=k=>placeName(S,k);
  if(S.over) return out;
  // what is known of each hex: seen now, or remembered
  const known={};
  for(const k in S.intel){ const m=S.intel[k]; if(S.turn-m.turn<=COUNSEL.memory) known[k]={...m, now:S.vis[k]==='clear'}; }
  const seenOf=t=>Object.keys(known).flatMap(k=>known[k].what.filter(w=>w.t===t).map(w=>({...w, k, now:known[k].now, age:S.turn-known[k].turn})));
  const orcs=seenOf('orc').filter(o=>!o.leave), warrens=seenOf('warren'), varg=seenOf('varg');
  const me=wiz(S), s=syl(S), up=e=>e&&!e.wounded;
  const free=role=>S.elves.filter(e=>e.role===role&&!e.wounded);
  const mana=S.mana, spell=!S.spellUsed;
  const sign=kind=>S.signs.filter(x=>x.kind===kind);
  const dirs=list=>[...new Set(list.map(x=>x.dir!=null?DIR_NAMES[x.dir]:x.k?DIR_NAMES[dirOf(x.k)]:null).filter(Boolean))].join(' and ');
  const ago=w=>w.now?'':' (seen '+(w.age===1?'last week':w.age+' weeks ago')+')';

  // 1. a Waaagh on the march
  const march=orcs.filter(o=>o.march);
  if(march.length) add(100,'Talons','The Waaagh is marching on us'+(march[0].now?' from '+at(march[0].k):'')+'. Bring every Talon home and stand with them yourself: Elfhome\'s walls fight beside you. Ward Elfhome if the mana is there, so they stop a week at the thicket.');
  // 2. the drums: break the totem
  const drums=orcs.filter(o=>o.drums&&o.totem&&!o.march), drumSigns=sign('waaagh');
  const totemNow=drums.find(o=>o.now);
  if(totemNow) add(95,'Spell',spell&&mana>=SPELLS.dispel.cost?'War drums at '+at(totemNow.k)+', and we can see the totem. Dispel it this week ('+SPELLS.dispel.cost+' mana): the drums stop, and they\'re weeks from raising another.':'War drums at '+at(totemNow.k)+'. Save '+SPELLS.dispel.cost+' mana and Dispel that totem next week, before they march.');
  else if(drums.length||drumSigns.length) add(92,'Seers','War drums '+(drumSigns.length?'from the '+dirs(drumSigns):'at '+at(drums[0].k))+'. A Waaagh is coming. Send a Seer that way to find the totem, so you can see it to Dispel it.');
  // 3. Sylvara
  const trees=S.trees.filter(t=>!t.done&&!t.dead);
  if(up(s)&&trees.length&&S.turn>=SYL_START){
    const next=trees.slice().sort((a,b)=>dist(a.k,s.pos)-dist(b.k,s.pos))[0];
    const danger=[...orcs, ...warrens, ...seenOf('gob')].filter(w=>w.now&&(dist(w.k,s.pos)<=2||dist(w.k,next.k)<=1));
    const escort=S.elves.filter(e=>!e.wounded&&(e.role==='talon'||e.role==='wizard')&&dist(e.pos,s.pos)<=1).length;
    if(danger.length){
      const d=danger.find(w=>w.t==='orc')||danger[0], what=d.t==='orc'?'there are orcs':d.t==='warren'?'there is a goblin warren':'there are goblins';
      add(d.t==='orc'?90:72,'Sylvara','Sylvara walks toward '+next.name+', and '+what+' at '+at(d.k)+', close to her. '+(spell&&mana>=SPELLS.ward.cost&&!H[s.pos].thicket?'Ward her hex ('+SPELLS.ward.cost+' mana): anything that comes at her there stops a week in the thicket.':'Put Talons beside her.'));
    }
    if(escort<COUNSEL.escort) add(danger.length?75:55,'Talons','Sylvara walks toward '+next.name+' with '+(escort?'only one':'nobody')+' to guard her. Keep two Talons, or yourself, on her hex or next to it. '+(S.log.some(l=>l.kind==='orc')?'The orcs go for her before anyone.':'Goblins raid anyone walking alone, and the orcs, when they come, go for her first.'));
    if(S.vis[next.k]!=='clear'&&!free('seer').some(e=>dist(e.pos,next.k)<=1)) add(50,'Seers','Nobody watches the way to '+next.name+'. Sylvara steers round only the danger we can see, so put a Seer near it.');
  }
  if(s&&s.wounded&&trees.length) add(60,'Healers','Sylvara is in the Healing House with '+trees.length+' tree'+(trees.length>1?'s':'')+' still to tend. Rest there yourself: Essyllt\'s healers take weeks off every wound, hers included, once a week.');
  // 4. orc camps: harry them till they leave
  for(const o of orcs.filter(o=>o.now&&!o.march&&o.camp).sort((a,b)=>b.n-a.n)){
    const harriers=S.elves.filter(e=>!e.wounded&&e.role==='talon'&&dist(e.pos,o.k)===1).length;
    if(!harriers) add(70,'Talons','Orcs camped at '+at(o.k)+' ('+o.n+(o.gobs?' and '+o.gobs+' goblins':'')+'), felling a tree a week. Put Talons in the trees next to the camp: every night they harry it, and harried enough, orcs move on. You don\'t have to kill them.');
    if(spell&&mana>=SPELLS.strike.cost[3]&&!totemNow) add(58,'Spell','Strike the orcs at '+at(o.k)+' at full strength ('+SPELLS.strike.cost[3]+' mana). Every blow counts toward driving them out.');
    break;
  }
  if(!orcs.length&&!drumSigns.length&&S.bands.some(b=>b.fac==='orc'&&b.state!=='leave'&&b.n>0)&&S.log.some(l=>l.kind==='orc'))
    add(65,'Seers','There are orcs in the wood and nobody can see them. They come from the east: send a Seer that way, to a hill if there is one.');
  if(!S.log.some(l=>l.kind==='orc')&&S.turn>=ORC.arrive[0]-2) add(40,'Guild','The orcs will come from the east any week now. Have a sentry post on that side, with a Seer in it.');
  // 5. goblins near orcs: the one time to fight goblins
  for(const w of warrens){ const o=orcs.find(o=>dist(o.k,w.k)<=2);
    if(o){ add(68,'Talons','Goblins at '+at(w.k)+ago(w)+' are within reach of the orcs at '+at(o.k)+'. Orcs take goblins in, and that\'s how a Waaagh grows. Raze that warren, or Strike it. This is the one time to fight goblins.'); break; } }
  // a burning wood
  const fire=Object.keys(H).find(k=>H[k].fire&&S.vis[k]==='clear');
  if(fire) add(85,'Spell','The wood is burning at '+at(fire)+'. Dispel the fire before it spreads.');
  // 6. watch: posts and seers
  const posts=Object.keys(H).filter(k=>H[k].talan&&!H[k].build&&k!==HOME);
  const empty=posts.filter(k=>!S.elves.some(e=>!e.wounded&&e.role==='seer'&&e.pos===k));
  if(empty.length&&free('seer').length) add(62,'Seers','The sentry post at '+at(empty[0])+' has no Seer in it. A Seer in a post sees a ring clearly and two dimly, three on a hill.');
  const builders=free('guild'), idle=builders.filter(e=>!(e.task&&e.task.t==='talan')&&!H[e.pos].build);
  if(idle.length&&posts.length+Object.keys(H).filter(k=>H[k].build>0).length<COUNSEL.posts)
    add(52,'Guild','Kennan\'s builders are idle. Put sentry posts two or three hexes out from Elfhome, on hills when you can, about three apart: '+(posts.length?posts.length+' up so far.':'there are none yet.'));
  const cov=coverage(S);
  if(cov<0.25) add(45,'Seers','We see only '+Math.round(cov*100)+'% of the wood clearly. Spread the Seers out: one on foot sees only her own hex clearly.');
  // 7. the Varg and the deer
  const howl=sign('howl');
  if(howl.length&&free('charm').length) add(57,'Charming','Howling from the '+dirs(howl)+': a hungry Varg pack. '+(varg.find(v=>v.now)?'Send Ifan\'s beast-speaker to calm the pack at '+at(varg.find(v=>v.now).k)+', or it will come for our hunters.':'Find it and send a beast-speaker to calm it, or it will come for our hunters.'));
  const game=gameTotal(S);
  if(game<BANDS.game[0]) add(54,'Charming','Too few deer ('+game+'). Stop hunting: hungry Varg raid us, and starved Varg let the goblins breed. Feed the elves from the stores and foraging.');
  else if(game>BANDS.game[1]) add(44,'Talons','Too many deer ('+game+'): they\'re stripping the glades. Let the Talons hunt.');
  if(!S.bands.some(b=>b.fac==='varg')&&S.log.length) add(70,'Charming','There are no Varg left. Nothing keeps the goblins down now, and the wood mourns them every week.');
  else if(varg.some(v=>v.now)&&S.elves.some(e=>!e.wounded&&(e.role==='talon'||e.role==='wizard')&&varg.some(v=>v.now&&v.k===e.pos))) add(48,'Elders','Leave the Varg be. They belong here, they keep the goblins down, and killing them angers the wood.');
  // 8. goblins
  if(warrens.length>COUNSEL.warrensMany) add(46,'Talons','Goblin warrens all over the wood ('+warrens.length+' that we know of). Raze the ones nearest Elfhome and the orcs; leave the far ones to the Varg.');
  const fetish=warrens.find(w=>w.now&&w.fetish);
  if(fetish&&spell&&mana>=SPELLS.dispel.cost&&!orcs.some(o=>o.now)) add(30,'Spell','The shaman\'s fetish at '+at(fetish.k)+' makes that warren breed fast and lights false fires. With nothing more pressing, Dispel it.');
  // 9. food, youths, the wood's mood, mana
  if(S.food<COUNSEL.foodLow) add(64,'Elders','The stores are low ('+Math.floor(S.food)+'). Send a Talon to hunt a herd of three or more, or elves will leave us for a grove that can feed them.');
  if(S.youths>0) add(S.food>=TRAIN_COST?42:20,'Elders',S.food>=TRAIN_COST?'A youth is ready for a calling. '+(free('seer').length+S.training.filter(t=>t.role==='seer').length<COUNSEL.seersWanted?'Make a Seer: the more eyes, the less the wood can hide.':'Make a Talon.'):'A youth is ready, but training takes '+TRAIN_COST+' food we haven\'t got.');
  const md=mood(S);
  if(md==='angry') add(66,'Elders','The wood is angry. Stop killing its own: Varg, goblins far from the orcs, the deer. Quiet weeks with no felling calm it.');
  if(spell&&mana>=MANA_MAX&&!out.some(a=>a.house==='Spell')) add(35,'Spell','Your mana is full and does nothing in the pouch. Ward Sylvara\'s path, or break a fetish.');
  // 10. your wizard
  if(me&&me.wounded) add(60,'Healers','You\'re wounded for '+me.wounded+' more week'+(me.wounded>1?'s':'')+'. Rest in the Healing House: Essyllt mends faster than time.');
  else if(me&&me.hp<ROLES.wizard.hp/2) add(50,'Healers','You\'re hurt. Rest in the Healing House before you lead another fight.');
  const hurt=S.elves.filter(e=>e.wounded>1);
  if(hurt.length&&S.healedWeek!==S.turn&&!(me&&me.wounded)&&!(s&&s.wounded)) add(36,'Healers',(hurt.length>1?hurt.length+' of ours lie':'One of ours lies')+' wounded. Rest in the Healing House this week and Essyllt\'s healers will have them up sooner.');
  if(!out.length) add(10,'Elders','The wood is quiet. Keep the Seers in their posts, Sylvara guarded, and the goblins away from the orcs. That\'s all the keeping there is.');
  return out.sort((a,b)=>b.pri-a.pri);
}

// ── Public ───────────────────────────────────────────────────────────
const api = {
  newYear, endTurn, resolvePending, battleSetup, autoOdds, foeById, move, canMove, tasksFor, setTask, cast, canCast, train, vision, score, reachable,
  coverage, mood, seasonOf, weekOf, placeName, dist, nbrs, unkey, key, dirOf, gameTotal, bandPower, path,
  herdAt, warrenAt, bandsAt, elfAt, syl, wiz, counsel, COUNSEL,
  R, YEAR, SEASON, SEASONS, ROLES, FAC, TERRAIN, SPELLS, TRAIN_COST, TRAIN_TURNS, TREES, TEND, WOOD, BANDS, ENDINGS,
  SIGN_TEXT, DIR_NAMES, ORC, HOME, MANA_MAX, TRAINABLE, DUEL,
  clone: S => JSON.parse(JSON.stringify(S)),
};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.ForestEngine=api;
})(typeof window!=='undefined'?window:globalThis);
