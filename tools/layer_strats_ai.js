// Strategies for tools/layer_strats.js, run inside the game page (G.eval), so game globals are in scope.
window.__note=function(who,a){ const m=G_memo(); m[who]=m[who]||{}; m[who].prev=m[who].last; m[who].last=a&&a.cat; };
function G_memo(){ return window.__memo||(window.__memo={}); }
window.__lastCat=function(w){ const m=G_memo()[w]; return m&&m.last; };
// a plain ward pick in a new element, at the biggest affordable ring (min tier minT)
window.__layerAct=function(who,minT,maxT){
  const me=gs[who], opp=gs[foesOf(who)[0]];
  if(!hasWard(me)||wardLayers(me)>=WARD_RULES.layers) return null;
  let els=ELEMENTS.map(e=>e.id).filter(e=>e!==me.shieldType&&!sigAt(who,'protect',e)&&sectorOk(who,'protect',e,minT||1));
  if(!els.length) return null;
  const safe=els.filter(e=>foesCantCast(who,e)); if(safe.length) els=safe;
  else { const off=els.filter(e=>e!==opp.lastElem); if(off.length) els=off; }
  const elem=els[Math.floor(_rng()*els.length)];
  let t=maxT||3; while(t>1&&!sectorOk(who,'protect',elem,t)) t--;
  if(t<(minT||1)) return null;
  return {type:'el',cat:'protect',elem,tier:t,self:false,target:foesOf(who)[0],ok:_rng()<0.9};
};
window.__sealAct=function(who){ const me=gs[who]; if(!(sealTargetable(who)&&canSeal(who))) return null;
  return {type:'el',cat:'protect',elem:me.shieldType,tier:1,self:true,target:who,ok:_rng()<0.9}; };
window.__strat=function(who,s,orig){
  const me=gs[who], f=foesOf(who)[0], opp=gs[f];
  const strikeReady=opp.mana>=elemCost(f,'damage',2);
  const L=(minT,maxT)=>window.__layerAct(who,minT,maxT);
  switch(s){
    case 'stock': return orig(who);
    case 'never': { const a=orig(who); if(a.cat==='protect'&&!a.self&&!a.sig&&hasWard(me)&&a.elem!==me.shieldType){
        if(sectorOk(who,'protect',me.shieldType,a.tier)) a.elem=me.shieldType; } return a; }
    case 'eager50': { if(me.shieldHp>=15&&_rng()<0.5){ const a=L(2); if(a) return a; } return orig(who); }
    case 'eager80': { if(me.shieldHp>=15&&_rng()<0.8){ const a=L(2); if(a) return a; } return orig(who); }
    case 'big': { if(me.shieldHp>=15&&_rng()<0.7){ const a=L(3,3); if(a) return a; } return orig(who); }
    case 'readStrike': { // layer when the foe can strike and didn't just dispel
        if(strikeReady&&__lastCat(f)!=='dispel'&&_rng()<0.7){ const a=L(2); if(a) return a; } return orig(who); }
    case 'hurt': { if(me.hp<me.maxHp*0.5&&_rng()<0.7){ const a=L(2); if(a) return a; } return orig(who); }
    case 'fortress': { // ward -> seal -> layer -> seal
        if(hasWard(me)&&!me.wardSealed&&me.shieldHp>=15&&_rng()<0.7){ const a=window.__sealAct(who); if(a) return a; }
        if(me.wardSealed&&_rng()<0.7){ const a=L(2); if(a) return a; }
        return orig(who); }
    case 'sealOnly': { if(hasWard(me)&&!me.wardSealed&&me.shieldHp>=15&&_rng()<0.7){ const a=window.__sealAct(who); if(a) return a; }
        const a=orig(who); if(a.cat==='protect'&&!a.self&&!a.sig&&hasWard(me)&&a.elem!==me.shieldType&&sectorOk(who,'protect',me.shieldType,a.tier)) a.elem=me.shieldType; return a; }
    case 'fortressLite': {
        if(hasWard(me)&&!me.wardSealed&&me.shieldHp>=15&&_rng()<0.5){ const a=window.__sealAct(who); if(a) return a; }
        if(me.wardSealed&&wardLayers(me)<2&&_rng()<0.4){ const a=L(2); if(a) return a; }
        return orig(who); }
    case 'fortressBig': {   // seal, then layer only at the outer ring
        if(hasWard(me)&&!me.wardSealed&&me.shieldHp>=15&&_rng()<0.7){ const a=window.__sealAct(who); if(a) return a; }
        if(me.wardSealed&&_rng()<0.7){ const a=L(3,3); if(a) return a; }
        return orig(who); }
    case 'fortressRead': {  // seal; layer only when the foe can strike
        if(hasWard(me)&&!me.wardSealed&&me.shieldHp>=15&&_rng()<0.7){ const a=window.__sealAct(who); if(a) return a; }
        if(me.wardSealed&&strikeReady&&_rng()<0.7){ const a=L(2); if(a) return a; }
        return orig(who); }
    case 'wardStrike': { // with a ward up, hit while the foe wastes turns dispelling
        const a=orig(who); if(hasWard(me)&&me.shieldHp>=15&&a.cat!=='damage'&&!a.sig&&elemCanPick(who,'damage')&&_rng()<0.5){
          let t=3; while(t>1&&elemCost(who,'damage',t)>me.mana) t--; const els=ELEMENTS.map(e=>e.id).filter(e=>!sigAt(who,'damage',e)&&sectorOk(who,'damage',e,t));
          if(els.length) return {type:'el',cat:'damage',elem:els[Math.floor(_rng()*els.length)],tier:t,self:false,target:f,ok:_rng()<0.9}; }
        return a; }
  }
  return orig(who);
};
window.__round=()=>gs.round;
