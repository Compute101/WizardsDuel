// Winks balance check: node tools/winks_sim.js [games per matchup] [scores: daddy|b|pooled|rate:0.4]
// The starting six play every matchup with both sides drawing from the same real scores.
const TT=require('../js/tabletop.js');
TT.load(require('../characters.json'),require('../tabletop.json'),require('../fighters.json'));
TT.useRules('winks');
const SIX=['eldrin','mal','cinder','skadi','gnash','valdris'];
const games=+process.argv[2]||100, src=process.argv[3]||'daddy';   // 'daddy', 'b', 'pooled' or 'rate:0.4'
let sc=null;
if(src.startsWith('rate:')) TT.RULES.pot=+src.slice(5);
else sc=src==='pooled'?TT.WINK_SCORES.daddy.concat(TT.WINK_SCORES.b):TT.WINK_SCORES[src];
const opts=sc?{scores:{p1:sc,p2:sc}}:null;
// Overall stats from a sample of games
let rounds=[], picks={}, n=0, timeouts=0;
SIX.forEach(a=>SIX.forEach(b=>{ if(a===b) return; for(let g=0;g<20;g++){
  const r=TT.simMatch(a,b,'normal',opts); n++; rounds.push(r.rounds); if(r.winner==='timeout') timeouts++;
  ['p1','p2'].forEach(w=>Object.entries(r.picks[w]).forEach(([k,v])=>picks[k]=(picks[k]||0)+v));
}}));
rounds.sort((x,y)=>x-y);
const tot=Object.values(picks).reduce((a,b)=>a+b,0);
console.log(`scores ${src}: rounds avg ${(rounds.reduce((a,b)=>a+b,0)/n).toFixed(1)}, median ${rounds[n>>1]}, 90% ${rounds[Math.floor(n*.9)]}, timeouts ${timeouts}`);
console.log('picks:',Object.entries(picks).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+(v/tot*100).toFixed(1)+'%').join(', '));
console.log(TT.balance(games,'normal',SIX,opts).map(r=>`${r.name.padEnd(10)} ${r.winRate}%  ${r.rounds} rounds`).join('\n'));
// Daddy against B: every pairing, each side with its own player's scores
if(sc&&TT.WINK_SCORES.b){
  let w=0,n=0;
  SIX.forEach(a=>SIX.forEach(b=>{ for(let g=0;g<20;g++){ const r=TT.simMatch(a,b,'normal',{scores:{p1:TT.WINK_SCORES.daddy,p2:TT.WINK_SCORES.b}}); n++; if(r.winner==='p1') w++; else if(r.winner!=='p2') w+=0.5; } }));
  console.log(`Daddy's scores against B's: Daddy wins ${(w/n*100).toFixed(1)}%`);
}
