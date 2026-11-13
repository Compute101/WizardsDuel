// Layered-wards scaffolding: runs the standard-game balance sim headless (Playwright + tools/balance.html)
// once per ward-rule preset and prints each character's win rate side by side, plus ward use.
//
//   node tools/ward_compare.js [gamesPerMatchup=40] [presets=off,layers1,game] [ai=normal]
//
// Presets are the WARD_PRESETS names in tools/balance.html (game, off, boost, boost1, boost2, …).
// The first preset is the baseline the others are compared with. Two runs of the same rules differ by
// up to about 3 points per character at 40 games per matchup, so read small deltas as noise.
// Keep every character within ±8% of 50% (CLAUDE.md) before turning a rule on in js/game.js.
const http=require('http'), fs=require('fs'), path=require('path');
const {chromium}=require('playwright');

const games=+(process.argv[2]||40);
const presets=(process.argv[3]||'off,layers1,game').split(',');
const ai=process.argv[4]||'normal';
const root=path.join(__dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.md':'text/markdown'};

const server=http.createServer((req,res)=>{
  const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});

(async()=>{
  await new Promise(r=>server.listen(0,r));
  const port=server.address().port;
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.goto(`http://localhost:${port}/tools/balance.html`);
  await page.waitForFunction(()=>!document.getElementById('run').disabled,null,{timeout:60000});
  const runs={};
  for(const p of presets){
    const t0=Date.now();
    runs[p]=await page.evaluate(([g,a,w])=>window.runBalance(g,a,'standard',w),[games,ai,p]);
    console.error(`${p}: ${((Date.now()-t0)/1000).toFixed(0)} s`);
  }
  await browser.close(); server.close();

  const base=runs[presets[0]], pad=(s,n)=>String(s).padEnd(n), num=(v,n)=>String(v).padStart(n);
  const by=p=>Object.fromEntries(runs[p].map(r=>[r.key,r]));
  const idx=Object.fromEntries(presets.map(p=>[p,by(p)]));
  const order=base.slice().sort((a,b)=>b.winRate-a.winRate).map(r=>r.key);
  console.log(`\n${games} games per matchup, AI ${ai}. Win % (Δ vs ${presets[0]}) · boosts / layers per game\n`);
  console.log(pad('Character',12)+presets.map(p=>pad(p,24)).join(''));
  order.forEach(k=>{
    let line=pad(idx[presets[0]][k].name,12);
    presets.forEach((p,i)=>{
      const r=idx[p][k], wr=(r.winRate*100).toFixed(1);
      const d=i?` (${r.winRate>=idx[presets[0]][k].winRate?'+':''}${((r.winRate-idx[presets[0]][k].winRate)*100).toFixed(1)})`:'';
      const flag=Math.abs(r.winRate-0.5)>0.08?'!':' ';
      line+=pad(`${flag}${wr}${d} ·${r.wards.boosted.toFixed(1)}/${(r.wards.layered||0).toFixed(1)}`,24);
    });
    console.log(line);
  });
  presets.forEach(p=>{
    const w=runs[p].map(r=>r.winRate*100), rounds=runs[p].reduce((a,r)=>a+r.rounds,0)/runs[p].length;
    const peak=runs[p].reduce((a,r)=>a+r.wards.peak,0)/runs[p].length;
    console.log(`\n${pad(p,8)} range ${Math.min(...w).toFixed(1)}–${Math.max(...w).toFixed(1)}%, `+
      `avg ${rounds.toFixed(1)} rounds, peak ward ${peak.toFixed(0)} HP, `+
      `${runs[p].filter(r=>Math.abs(r.winRate-0.5)>0.08).length} outside ±8%`);
  });
})().catch(e=>{ console.error(e); server.close(); process.exit(1); });
