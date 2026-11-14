// Encounter balance: every wizard against every band (BANDS in js/game.js), AI on both sides.
//
//   node tools/encounter_sim.js [gamesPerPair=40] [bands=all] [ai=normal]
//
// Prints each band's win rate for the wizards (target: about 50% for an average wizard, i.e. the
// roster mean), the spread across wizards, the average rounds, and what the wizards picked.
// Tune a band with its `scale` (fighters' HP) in BANDS, or the fighters in fighters.json.
// PRE='js code' runs in the page first (e.g. PRE="BANDS[0].scale=1.2").
const http=require('http'), fs=require('fs'), path=require('path');
const {chromium}=require('playwright');
const games=+(process.argv[2]||40), bandArg=process.argv[3]||'all', ai=process.argv[4]||'normal';
const root=path.join(__dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const browser=await chromium.launch(), page=await browser.newPage();
  page.on('pageerror',e=>console.error('page error:',e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(()=>Object.keys(CHAR_DEFS).length&&Object.keys(FIGHTER_DEFS).length,null,{timeout:60000});
  if(process.env.PRE) await page.evaluate(process.env.PRE);
  const out=await page.evaluate(([games,bandArg,ai])=>{
    const bands=bandArg==='all'?BANDS.map(b=>b.id):bandArg.split(',');
    const wiz=Object.keys(CHAR_DEFS), res={};
    const orig=elemAIChoose; let picks={};
    window.elemAIChoose=w=>{ const a=orig(w);
      if(w==='p1'&&a){ const k=a.act||(a.skin?'skin':null)||a.sig||(a.cat==='meditate'||a.cat==='pass'?a.cat:a.cat+(a.self?'-self':'')); picks[k]=(picks[k]||0)+1; }
      return a; };
    bands.forEach(b=>{
      picks={}; const per={}; let rounds=0;
      wiz.forEach(k=>{ let w=0; for(let i=0;i<games;i++){ const r=simEncounter(k,b,ai); if(r.won) w++; rounds+=r.rounds; } per[k]=w/games; });
      res[b]={per,rounds:rounds/(games*wiz.length),picks};
    });
    window.elemAIChoose=orig;
    return res;
  },[games,bandArg,ai]);
  await browser.close(); server.close();
  for(const [b,r] of Object.entries(out)){
    const v=Object.values(r.per), mean=v.reduce((a,x)=>a+x,0)/v.length;
    const sorted=Object.entries(r.per).sort((a,b)=>b[1]-a[1]);
    const tot=Object.values(r.picks).reduce((a,x)=>a+x,0);
    console.log(`\n${b}: wizards win ${(mean*100).toFixed(1)}%, ${r.rounds.toFixed(1)} rounds`);
    console.log('  '+sorted.map(([k,x])=>`${k} ${(x*100).toFixed(0)}`).join(' · '));
    console.log('  picks: '+Object.entries(r.picks).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,x])=>`${k} ${(x/tot*100).toFixed(0)}%`).join(' · '));
  }
})();
