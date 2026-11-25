#!/usr/bin/env node
// The Moriquende's fights, led yourself or left to play out, side by side.
//   node tools/forest_duel_sim.js [duelsPerWizard=6] [ai=normal]
// For each typical fight it sets up a forest year with the band and your elves in one hex, then prints
// how often the fight is won left to play out (ForestEngine.autoOdds) and how often your wizard wins
// it as a duel (the same seats the screen builds: battleSetup → Forest.duelSpec → exploreSeats,
// played AI against AI with simMatchN) across the roster. The point (docs/forest-design.md): small
// fights are fine either way; a big band is much likelier to fall if you lead it yourself.
'use strict';
const http=require('http'), fs=require('fs'), path=require('path');
const {chromium}=require('playwright');
const per=+(process.argv[2]||6), ai=process.argv[3]||'normal';
const root=path.join(__dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});
// fac, n, gobs, at Elfhome?, Talons with you, Sylvara with you, attack or raid, an orc state
const CASES=[
  {name:'Goblin raid (5), you alone',        fac:'gob',  n:5},
  {name:'Goblin raid (5), you and a Talon',  fac:'gob',  n:5, talons:1},
  {name:'Hungry Varg (4), you alone',        fac:'varg', n:4},
  {name:'Hungry Varg (6), you and 2 Talons', fac:'varg', n:6, talons:2},
  {name:'Orc band (7) at camp, you + 2 Talons', fac:'orc', n:7, talons:2, kind:'attack', state:'camp'},
  {name:'Orc band (7) catches you alone',    fac:'orc',  n:7, state:'camp'},
  {name:'Orcs raid Sylvara (7), you with her', fac:'orc', n:7, syl:true, state:'camp'},
  {name:'Warhost (12 + 6 gobs) at Elfhome, 3 Talons', fac:'orc', n:12, gobs:6, home:true, talons:3, state:'march'},
  {name:'Warhost (16 + 4 gobs) at Elfhome, 3 Talons', fac:'orc', n:16, gobs:4, home:true, talons:3, state:'march'},
  {name:'Warhost (16) at Elfhome, Sylvara home',  fac:'orc', n:16, home:true, talons:3, syl:true, state:'march'},
];
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const browser=await chromium.launch(), page=await browser.newPage();
  page.on('pageerror',e=>console.error('page error:',e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(()=>Object.keys(CHAR_DEFS).length&&Object.keys(FIGHTER_DEFS).length&&window.ForestEngine&&window.Forest,null,{timeout:60000});
  if(process.env.PRE) await page.evaluate(process.env.PRE);
  const out=await page.evaluate(([CASES,per,ai])=>{
    const F=ForestEngine;
    const wizzes=Object.keys(CHAR_DEFS).filter(k=>k!=='sylvara'&&!CHAR_DEFS[k].fighter);
    function make(c,seed){
      const S=F.newYear({seed, handFights:true});
      const k=c.home?F.HOME:Object.keys(S.hexes).find(x=>F.dist(x,F.HOME)===3&&S.hexes[x].t==='wood'&&S.hexes[x].tree==null);
      const away=Object.keys(S.hexes).find(x=>F.dist(x,F.HOME)===4&&S.hexes[x].t!=='lake'&&x!==k);
      S.bands=S.bands.filter(b=>b.k!==k); S.warrens=S.warrens.filter(w=>w.k!==k);
      // only the elves named stand in the hex; at Elfhome the others are at home too, unless they're Talons or Sylvara
      let t=c.talons||0;
      for(const e of S.elves){
        if(e.role==='wizard') e.pos=k;
        else if(e.role==='sylvara') e.pos=c.syl?k:away;
        else if(e.role==='talon') e.pos=t-->0?k:away;
        else e.pos=c.home?F.HOME:away;
      }
      S.bands.push({id:'bX', fac:c.fac, k, n:c.n, gobs:c.gobs||0, state:c.state||null, camp:c.state==='camp'?k:null, name:'the test band',
        goal:{kind:c.state==='march'?'march':'raid', k}, hunger:6, harry:0, totem:1, drums:0});
      S.pending={kind:c.kind||'raid', k, foeId:'bX'};
      return S;
    }
    return CASES.map(c=>{
      const S=make(c,11), set=F.battleSetup(S), spec=Forest.duelSpec(set);
      const auto=F.autoOdds(S,300);
      let won=0, n=0, foeLeft=0, rounds=0, led=0;
      for(const wk of wizzes) for(let i=0;i<per;i++){
        const seats=exploreSeats({wizKey:wk, foes:spec.foes, allies:spec.allies, human:false});
        const r=simMatchN(seats,ai); n++; rounds+=r.rounds;
        const win=r.winner==='A'; if(win) won++;
        const sw=seats.map((x,j)=>'p'+(j+1)), fo=sw.filter((w,j)=>seats[j].team==='B'), al=sw.filter((w,j)=>j>0&&seats[j].team==='A');
        const left=fo.reduce((t,w)=>t+Math.max(0,r.hp[w]),0)/fo.reduce((t,w)=>t+gs[w].maxHp,0);
        foeLeft+=left;
        // settle it in the forest, as the screen does: a lost duel leaves the rest to fight on
        const C=make(c,11+i*31); F.resolvePending(C,{won:win, foeLeft:left, hpEnd:Math.max(0,r.hp.p1), maxHp:gs.p1.maxHp, allyHp:al.map(w=>Math.max(0,r.hp[w]))});
        const f=F.foeById(C,'bX'), fights=C.log.filter(l=>l.kind==='fight'||l.kind==='end').map(l=>l.text).join(' | ');
        if(!C.over&&(win||!f||/driven off|thrown back|rout/.test(fights))) led++;
      }
      return {name:c.name, auto, duel:won/n, led:led/n, foeLeft:foeLeft/n, rounds:rounds/n,
        seats:spec.foes.map(f=>`${f.key}${f.level?'+'+f.level:''}${f.hpMul>1?'×'+f.hpMul.toFixed(1):''}`).join(', ')+(spec.allies.length?' | '+spec.allies.map(a=>a.key+(a.level?'+'+a.level:'')).join(', '):'')};
    });
  },[CASES,per,ai]);
  await browser.close(); server.close();
  console.log(`\nLeft to play out vs led yourself (${per} duels a wizard, AI ${ai})\n`);
  for(const r of out) console.log(`  ${r.name.padEnd(44)} auto ${(r.auto*100).toFixed(0).padStart(3)}%   duel ${(r.duel*100).toFixed(0).padStart(3)}%   led ${(r.led*100).toFixed(0).padStart(3)}%  (foes left ${(r.foeLeft*100).toFixed(0)}%, ${r.rounds.toFixed(0)} rounds)   ${r.seats}`);
})();
