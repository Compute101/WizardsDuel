// Head-to-head ward-strategy test: one seat plays a strategy from tools/layer_strats_ai.js, the other the
// stock AI, every matchup, seats swapped. Over 50% means the strategy beats the stock AI.
//   node tools/layer_strats.js [strategies=stock,eager50,sealOnly,fortress] [gamesPerMatchup=8] ["WARD_RULES.stackTake=0.4"]
// The optional last argument is code run in the game first (try a rule switch). KEEN=a,b only lets those
// wizards play the strategy (more games per wizard for the same time). OPP=strategy sets the other seat's. About ±1.6 points of noise at 8.
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const HELPER=fs.readFileSync(path.join(__dirname,'layer_strats_ai.js'),'utf8');
const strats=(process.argv[2]||"stock,eager50,sealOnly,fortress").split(","), games=+process.argv[3]||8, PRE=process.argv[4]||"";
(async()=>{await new Promise(r=>server.listen(0,r));const b=await chromium.launch();const p=await b.newPage();
await p.goto(`http://localhost:${server.address().port}/tools/balance.html`);
await p.waitForFunction(()=>!document.getElementById('run').disabled,null,{timeout:60000});
await p.evaluate(h=>G.eval(h),HELPER); if(PRE) await p.evaluate(x=>G.eval(x),PRE);
for(const s of strats){
 const res=await p.evaluate(([s,games,KEEN,OPP])=>{
  const keys=Object.keys(STD_CHARS);const orig=G.elemAIChoose;let keen='p1';
  G.elemAIChoose=function(who){ if(G.__round()<=1&&who==='p1') G.__memo={}; const a=who===keen?G.__strat(who,s,orig):OPP?G.__strat(who,OPP,orig):orig(who); G.__note(who,a); return a; };
  let w=0,n=0,lk=0,lb=0,sk=0,rk=0,rounds=0;const per={};
  for(const a of keys)for(const c of keys){if(a===c)continue;for(let g=0;g<games;g++){keen=g%2?'p1':'p2'; if(KEEN&&!KEEN.includes(keen==='p1'?a:c)) continue;
   const r=G.simMatch(a,c,'normal');const o=keen==='p1'?'p2':'p1';const kk=keen==='p1'?a:c;
   const sc=r.winner===keen?1:r.winner===o?0:0.5;w+=sc;n++;rounds+=r.rounds;(per[kk]=per[kk]||[0,0]);per[kk][0]+=sc;per[kk][1]++;
   lk+=r.wards[keen].layered||0;lb+=r.wards[o].layered||0;sk+=r.wards[keen].sealed||0;rk+=r.wards[keen].raised||0;}}
  G.elemAIChoose=orig;
  const pr=Object.entries(per).map(([k,x])=>[k,100*x[0]/x[1]]).sort((a,b)=>b[1]-a[1]);
  return {per:Object.fromEntries(pr.map(x=>[x[0],+x[1].toFixed(1)])),win:w/n,lk:lk/n,lb:lb/n,sk:sk/n,rk:rk/n,rounds:rounds/n,top:pr.slice(0,3).map(x=>x[0]+' '+x[1].toFixed(0)).join(' '),bot:pr.slice(-3).map(x=>x[0]+' '+x[1].toFixed(0)).join(' ')};
 },[s,games,process.env.KEEN?process.env.KEEN.split(','):null,process.env.OPP||null]);
 (global.ALL=global.ALL||{})[s]=res.per; if(process.env.OUT) fs.writeFileSync(process.env.OUT,JSON.stringify(global.ALL));
 console.log(s.padEnd(14),'win',(res.win*100).toFixed(1)+'%','| keen wards',res.rk.toFixed(2),'layers',res.lk.toFixed(2),'seals',res.sk.toFixed(2),'(stock layers',res.lb.toFixed(2)+') rounds',res.rounds.toFixed(1),'| best',res.top,'| worst',res.bot);
}
await b.close();server.close();})();
