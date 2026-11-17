// Recolour check for the hero base figures: renders each through ExploreHero.def (the creator's real recolour)
// in five looks, six figures a sheet, into <out dir>/recolour_<n>.png. Files are served from the repo by
// Playwright request interception, so no web server is needed.
//   node tools/hero_recolour_sheet.js <out dir> [figure ids, comma-separated; default: every figure]
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=process.argv[2];
const IDS=process.argv[3]?process.argv[3].split(','):null;
const LOOKS=[
  {robe:'Violet',trim:'Gold',hair:'Silver',skin:'Natural',eyes:'Blue',elem:'water'},
  {robe:'Crimson',trim:'Silver',hair:'Black',skin:'Deep',eyes:'Green',elem:'fire'},
  {robe:'Midnight',trim:'Copper',hair:'Blonde',skin:'Pale',eyes:'Brown',elem:'lightning'},
  {robe:'Forest',trim:'Bone',hair:'Auburn',skin:'Olive',eyes:'Amber',elem:'earth'},
  {robe:'Black',trim:'Scarlet',hair:'White',skin:'Brown',eyes:'Grey',elem:'dark'},
];
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  await p.route('http://wd.local/**', r=>{ const f=path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if(!f.startsWith(ROOT)||!fs.existsSync(f)) return r.fulfill({status:404,body:''});
    const ct=f.endsWith('.png')?'image/png':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html';
    r.fulfill({status:200, contentType:ct, body:fs.readFileSync(f)}); });
  await p.route('http://wd.local/', r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body></body></html>'}));
  await p.goto('http://wd.local/'); await p.addScriptTag({url:'http://wd.local/js/explore_hero.js'});
  const sheets=await p.evaluate(async({IDS,LOOKS})=>{
    const H=window.ExploreHero; await H.loadBases(); const out=[];
    for(const id of (IDS||H.BASES.map(b=>b.id))){ const f=H.BASES.find(x=>x.id===id); const row=[];
      for(const L of LOOKS){ const d=await H.def(Object.assign({name:'x',sex:f.sex,age:f.age,fig:id},L)); row.push(d.sprite); }
      out.push({id,row}); }
    return out; },{IDS,LOOKS});
  // one sheet per 6 figures, each row a figure in the 5 looks, cropped to the upper body plus full figure
  for(let s=0;s<sheets.length;s+=6){
    const part=sheets.slice(s,s+6);
    const html='<body style="margin:0;background:#3a3a48;font:14px sans-serif;color:#fff">'+part.map(r=>
      `<div style="display:flex;align-items:center"><div style="width:110px;padding-left:6px">${r.id}</div>`+
      r.row.map(u=>`<div style="width:260px;height:300px;overflow:hidden"><img src="${u}" style="height:620px;margin-left:-20px"></div>`).join('')+'</div>').join('')+'</body>';
    await p.setViewportSize({width:110+5*260,height:300*part.length}); await p.setContent(html); await p.waitForTimeout(300);
    await p.screenshot({path:`${OUT}/recolour_${s/6+1}.png`});
  }
  await b.close();
})();
