// Prints the tabletop matchup table (Markdown): each cell is the row wizard's win % against the
// column wizard, from AI-vs-AI games on the tabletop rules, half on each side.
// Usage:   node tools/tabletop_matchups.js [games per pairing, default 400] [ai: normal|easy] [rules: standard|beginner|beginnerCost]
const path=require('path');
const root=path.join(__dirname,'..');
const TT=require(path.join(root,'js/tabletop.js'));
TT.load(require(path.join(root,'characters.json')),require(path.join(root,'tabletop.json')));
const N=Math.max(2,+process.argv[2]||400), ai=process.argv[3]||'normal';
TT.useRules(process.argv[4]||'standard');
const keys=Object.keys(TT.chars), m={}, tot={};
keys.forEach(k=>{ m[k]={}; tot[k]={w:0,n:0}; });
for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){
  const a=keys[i], b=keys[j];
  let w=0;
  for(let g=0;g<N;g++){
    const r=g%2?TT.simMatch(a,b,ai):TT.simMatch(b,a,ai), seat=g%2?'p1':'p2';
    if(r.winner===seat) w++; else if(r.winner!=='p1'&&r.winner!=='p2') w+=0.5;
  }
  m[a][b]=w/N; m[b][a]=1-w/N;
  tot[a].w+=w; tot[a].n+=N; tot[b].w+=N-w; tot[b].n+=N;
}
const rate=k=>tot[k].w/tot[k].n;
const order=keys.slice().sort((x,y)=>rate(y)-rate(x));
const ab=k=>TT.chars[k].name.slice(0,3);
const nm=k=>TT.chars[k].name[0]+TT.chars[k].name.slice(1).toLowerCase();
let out=`| | Overall | Wins | ${order.map(ab).join(' | ')} |\n|---|---|---|${order.map(()=>'---').join('|')}|\n`;
order.forEach(r=>{
  const wins=order.filter(c=>c!==r&&m[r][c]>0.5).length;
  out+=`| **${nm(r)}** | **${Math.round(rate(r)*100)}** | ${wins} | ${order.map(c=>c===r?'—':Math.round(m[r][c]*100)).join(' | ')} |\n`;
});
const pairs=[];
keys.forEach(a=>keys.forEach(b=>{ if(a<b) pairs.push([a,b,m[a][b]]); }));
pairs.sort((x,y)=>Math.abs(y[2]-0.5)-Math.abs(x[2]-0.5));
out+='\nMost lopsided:\n'+pairs.slice(0,6).map(([a,b,p])=>p>=0.5?`- ${nm(a)} beats ${nm(b)} ${Math.round(p*100)}–${Math.round((1-p)*100)}`:`- ${nm(b)} beats ${nm(a)} ${Math.round((1-p)*100)}–${Math.round(p*100)}`).join('\n');
console.log(out);
