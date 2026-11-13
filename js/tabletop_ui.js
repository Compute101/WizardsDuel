// ── TABLETOP SCREEN ────────────────────────────────────────
// The "🎲 Tabletop" button on the title screen: a tutorial (wizards explaining the tiddlywink rules,
// plus each wizard's tabletop cards) and the full rulebook. Both are read from the tabletop files,
// so they stay in step with the engine:
//  - the rulebook is docs/tabletop-rules.md, rendered here (blocks between <!-- dev:start --> and
//    <!-- dev:end --> are for developers and left out);
//  - the tutorial runs in three stages, Beginner → Normal → Advanced (the rule sets in TT.PRESETS);
//    its numbers come from TT.rulesOf (js/tabletop.js), and the wizard cards
//    from tabletop.json.
// It only reads the tabletop rules; it never changes the standard game.
(function(){
'use strict';

let loaded=null;            // Promise: everything fetched and TT loaded
let rulesSections=[];       // [{id, title, html}]
let tab='tutorial', topic='welcome', stage='beginner';

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ELEM={fire:'Fire',ice:'Ice',lightning:'Lightning',arcane:'Arcane',physical:'Physical',dark:'Dark'};
const CAT={damage:'Damage',protect:'Protection',dispel:'Dispel'};
const LEVEL=['Lesser','Normal','Greater'];
const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];

// ── Tutorial ───────────────────────────────────────────────
// Three stages, learnt in order: Beginner (the fewest rules), Normal (every rule, the same flick) and
// Advanced (the flick for tiddlywinks masters). Each stage only teaches what's new in it.
const STAGES=[
  {id:'beginner', label:'🌱 Beginner', topics:[
    {id:'welcome',  label:'Welcome'},
    {id:'kit',      label:'Kit & Setup'},
    {id:'round',    label:'A Round'},
    {id:'spells',   label:'Spell Levels'},
    {id:'flick',    label:'The Flick'},
    {id:'wards',    label:'Wards & Dispels'},
    {id:'curses',   label:'Buffs & Curses'},
    {id:'roundend', label:'Round End'},
    {id:'next',     label:'Next: Normal'},
  ]},
  {id:'normal', label:'🪄 Normal', topics:[
    {id:'n-new',     label:"What's New"},
    {id:'n-elem',    label:'Elements'},
    {id:'n-layers',  label:'Layered Wards'},
    {id:'n-seals',   label:'Seals'},
    {id:'n-dispel',  label:'Greater Dispels'},
    {id:'n-cleanse', label:'Cleanse'},
    {id:'n-sputter', label:'Near Misses'},
    {id:'n-next',    label:'Next: Advanced'},
  ]},
  {id:'advanced', label:'🏆 Advanced', topics:[
    {id:'a-new',    label:"What's New"},
    {id:'a-flick',  label:'Pot Every Wink'},
    {id:'a-squops', label:'Squops'},
    {id:'a-lines',  label:'Handicap Lines'},
  ]},
];
const stageOf=t=>STAGES.find(s=>s.topics.some(x=>x.id===t));
// Built after TT has loaded, so the numbers are the engine's
function convos(){
  // Each rule set's numbers, without switching TT's current rules
  const B=TT.rulesOf('beginner'), N=TT.rulesOf('normal'), A=TT.rulesOf('advanced');
  const c=N.cats, budget=N.chances.budget;
  const flicks=i=>budget-c.damage.cost[i];
  const pct=p=>Math.round(p*100);
  const odds=n=>1-Math.pow(1-N.pot,n);
  const sd=N.suddenDeath, bCleanse=B.cleanseCost[0];
  const advHp=Object.values(TT.chars).filter(ch=>ch.alt.advanced&&ch.alt.advanced.hp!==ch.baseHp).length;
  return {
    // ── Beginner ──
    welcome:[
      {key:'eldrin', text:"Welcome to the table, mage. Tabletop is WizardsDuel played with real counters: the same secret picks of Damage, Protection and Dispel, but you cast by flicking tiddlywinks into a pot."},
      {key:'sylvara',text:"Your health, your mana and your ward are piles of winks. When you cast, you flick the very mana you just spent. Pot it and the spell goes off!"},
      {key:'ponder', text:"There are three ways to play, and you learn them in order. Beginner has the fewest rules. Normal adds the rest. Advanced is for tiddlywinks masters who pot nearly every flick."},
      {key:'ponder', text:"Start here, with 🌱 Beginner. Tap the topics above in turn, or a portrait below to see that wizard's spell cards."},
      {key:'eldrin', text:"Everything here comes from the rulebook, in the 📖 Rulebook tab. Keep it open at the table."},
    ],
    kit:[
      {key:'durin',  text:`You'll need tiddlywinks in three colours: red for health, blue for mana and white for your ward. 25 red winks do for both of you, since nobody has more than ${N.maxHp} health; about 25 blue and 25 white, shared, is enough for most games. Plus a pot, a squidger each and a six-sided die.`},
      {key:'durin',  text:"And a way to pick in secret: a dial, or face-down cards for Damage, Protection, Dispel and Meditate, with a note of the element and level. Mark each buff and curse with a token or its card."},
      {key:'gnash',  text:`Setup is quick. Take as many health winks as your wizard's HP (it's on their card below) and ${N.startMana} mana. Nobody can ever hold more than ${N.maxHp} health winks, or more than ${N.max} mana or ward winks.`},
      {key:'gnash',  text:"Then agree where each of you flicks from: your handicap line. A better flicker stands further back, so it's a fair fight."},
    ],
    round:[
      {key:'eldrin', text:"Each round, pick in secret: Damage, Protection or Dispel, with an element and a level (Lesser, Normal or Greater). Or one of your signature spells, a Cleanse to clear your curses, or Meditate."},
      {key:'skadi',  text:`Meditate skips your spell for ${N.meditate} mana. You can't do it two rounds running.`},
      {key:'eldrin', text:"Reveal together, then pay your spell's cost in mana winks and flick for it. If you can't afford your spell, it's lost and you pay nothing."},
      {key:'sylvara',text:"Then it all resolves in order: every Protection first, then every Dispel, then every Damage, then Meditate. A ward raised this round already blocks this round's strikes."},
      {key:'sylvara',text:"Then comes the round end. The moment a wizard reaches 0 HP, the game is over. If both fall together, it's a draw."},
    ],
    spells:[
      {key:'ponder', text:"Here's the rule to remember: every spell costs 2 mana for each level. Damage equals the cost. Wards and Dispels are double the cost."},
      {key:'cinder', text:[0,1,2].map(i=>`${LEVEL[i]}: ${c.damage.cost[i]} mana for ${c.damage.power[i]} damage, or a ${c.protect.power[i]} ward or dispel.`).join(' ')},
      {key:'ponder', text:"In Beginner rules the element is just for show (and some wizards can't cast some elements). Signature spells are fixed cards with their own cost and level. Tap a portrait below to read a wizard's cards."},
      {key:'cinder', text:"There's no free attack, so every spell is a choice: spend big now, or save for a bigger cast next round?"},
    ],
    flick:[
      {key:'zakkit', text:`Pay your spell's cost, then flick ${budget} minus the cost, quick-quick! A Lesser spell gets ${flicks(0)} flicks, Normal ${flicks(1)} and Greater ${flicks(2)}. Signature cards and Cleanse use their own cost.`},
      {key:'fizzwick',text:"Your first pot casts the spell, so stop flicking. No pot at all, and the spell fizzles: the mana you paid is lost."},
      {key:'fizzwick',text:`It's tuned for new flickers, who pot about ${pct(N.pot)}% of flicks: 7 pots in 57 on our first try. At that rate a Lesser spell goes off about ${pct(odds(flicks(0)))}% of the time, Normal ${pct(odds(flicks(1)))}% and Greater ${pct(odds(flicks(2)))}%. Small spells are safe, big ones a gamble.`},
      {key:'zakkit', text:"Pick up the winks you missed: nothing stays on the table between rounds."},
    ],
    wards:[
      {key:'eldrin', text:"A ward is a pile of ward winks. Strikes hit it first, and only what breaks through reaches your HP."},
      {key:'eldrin', text:"In Beginner rules you have one ward at a time: cast a new one and it replaces the old."},
      {key:'durin',  text:`A ward lasts until it runs out. It loses ${N.wardWear} wink at every round end, and strikes, dispels and ticks wear it down too.`},
      {key:'ponder', text:"A Dispel tears winks off the foe's ward equal to its power. With no ward up, it removes the foe's newest buff, and a Greater Dispel removes every buff."},
      {key:'valdris',text:"My skeletons stand in front of my ward. Each has 1 HP, so every point of damage kills one before anything reaches the ward. Dispels can't touch them."},
      {key:'daveron',text:"My graveguard are the same, but tougher: damage wears down the oldest first. Keep a die by each to track its HP."},
    ],
    curses:[
      {key:'mordant',text:"Curses are Dispel-type signature spells, and they land even through a ward. Nothing has a round timer: a curse stays until the cursed wizard Cleanses."},
      {key:'mary',   text:`Cleanse is a Dispel at yourself. In Beginner rules it costs ${bCleanse} mana and clears every curse on you.`},
      {key:'gretch', text:"Buffs stay until a Dispel removes them. \"Next strike\" and \"next pick\" effects, like Empower or Enthral, go as soon as they're used."},
      {key:'mary',   text:"\"Can't pick Damage next round\" lasts that one round only, and nobody can be locked two rounds running."},
    ],
    roundend:[
      {key:'gnash',  text:"At the round end, curses tick first (burns, poison, plague, Agony), then regeneration, then minions strike the foe."},
      {key:'korvath',text:`From round ${sd.round} it's sudden death: both wizards lose ${sd.dmg} HP every round end, and ${sd.dmg} more every ${sd.every} rounds after that. Nobody hides forever.`},
      {key:'gnash',  text:`Then every ward wears by ${N.wardWear} wink, and each wizard gains ${N.income} mana, less any curse that cuts income.`},
      {key:'korvath',text:"Games are short: about 10 or 11 rounds. Make every flick count!"},
    ],
    next:[
      {key:'ponder', text:"That's the whole Beginner game! Play a few duels until picking, paying and flicking feel easy."},
      {key:'eldrin', text:"Then move up to 🪄 Normal. You flick exactly the same way, so it doesn't ask for better flicking, just a few more rules: elements that matter, layered and sealed wards, and Cleanse by level."},
    ],
    // ── Normal ──
    'n-new':[
      {key:'eldrin', text:"Normal rules are the full game. The flick is the same as Beginner, so nothing here needs better aim."},
      {key:'ponder', text:"What's new: a ward's own element counts against it, wards top up and stack in layers, you can seal a ward, Greater Dispels break through layers, and Cleanse comes in three levels."},
      {key:'eldrin', text:"Everything else, from the spell levels to the round end, is just as you learnt it."},
    ],
    'n-elem':[
      {key:'cinder', text:`Now elements matter. A strike in a ward's own element counts +${N.wardMatch} against it: my Normal Fire strike of ${c.damage.power[1]} takes ${c.damage.power[1]+N.wardMatch} off a Fire ward.`},
      {key:'skadi',  text:`Dispels work the same way: +${N.wardMatch} against a ward of their own element. So pick your ward's element where the foe can't follow: I can't cast Fire, so a Fire ward is safe from me.`},
    ],
    'n-layers':[
      {key:'eldrin', text:`Cast a ward in the same element as one you have and it tops up, to at most half again what that cast gives (Lesser ${Math.round(c.protect.power[0]*N.wards.boostCap)}, Normal ${Math.round(c.protect.power[1]*N.wards.boostCap)}, Greater ${Math.round(c.protect.power[2]*N.wards.boostCap)}). It never makes the pile smaller.`},
      {key:'eldrin', text:`Cast a new element and it goes on the outside as a second pile, ${N.wards.layers} at most. All your piles together hold at most ${N.max} winks.`},
      {key:'durin',  text:"Strikes hit the outer pile first, and what breaks it carries on into the next (with that pile's own +2), then to HP. Every pile wears at round end."},
    ],
    'n-seals':[
      {key:'eldrin', text:`Seal Ward is a Protection you cast at yourself for ${N.wards.sealCost} mana: it seals your outer pile. Put a coin on it.`},
      {key:'eldrin', text:"A sealed pile doesn't wear, and a Dispel that meets a seal only breaks the seal, even a Greater one. So a sealed ward takes two Dispels. Mine seal every pile at once."},
      {key:'gnash',  text:"Seals don't stop strikes. Just hit it harder!"},
    ],
    'n-dispel':[
      {key:'ponder', text:"A Lesser or Normal Dispel stops at the pile it breaks. A Greater one carries what's left into the next pile (a seal there stops it)."},
      {key:'ponder', text:"And if a Greater Dispel breaks both piles with power to spare, it strips every buff too."},
    ],
    'n-cleanse':[
      {key:'mary',   text:`Cleanse now has levels, like any spell: ${list(N.cleanseCost.map(String))} mana for a Lesser, Normal or Greater cast, removing 1 curse, 2 curses or all of them. You choose which.`},
      {key:'mordant',text:"So pile them on. A wizard with three of my curses needs a Greater Cleanse, or several rounds of small ones."},
    ],
    'n-sputter':[
      {key:'fizzwick',text:"An optional rule, if fizzles annoy you: agree before the game what counts as a near miss, like a wink resting against the pot."},
      {key:'fizzwick',text:"If a spell would fizzle but you made a near miss, it sputters instead: a Normal or Greater spell is cast one level lower, a Lesser one at half power. Use it in Beginner rules too, if you like."},
    ],
    'n-next':[
      {key:'weizan', text:"Normal rules are the game most tables will always play. That's fine: there's no shame in it."},
      {key:'weizan', text:`But if you ever pot about ${pct(A.pot)}% of your flicks, three in every four, you've become a master of tiddlywinks. Then move on to 🏆 Advanced.`},
    ],
    // ── Advanced ──
    'a-new':[
      {key:'korvath',text:"Advanced rules keep every Normal rule, but change the flick for players who almost never miss."},
      {key:'korvath',text:`You pot one wink per level, pay to retry after a miss, and the winks you miss stay on the table for squops.`+(advHp?' A few wizards start with different HP; their cards below show it.':'')},
    ],
    'a-flick':[
      {key:'zakkit', text:`Flick-flick from your handicap line, and pot ${A.winks[0]} wink for a Lesser spell, ${A.winks[1]} for Normal and ${A.winks[2]} for Greater.`},
      {key:'zakkit', text:`Missed? Pay ${A.retryCost} more mana to go again, and your run carries on. Can't pay, or won't? The spell fizzles and its mana is lost-gone. Zakkit weeps.`},
      {key:'zakkit', text:"Missed winks stay where they land, round after round."},
    ],
    'a-squops':[
      {key:'weizan', text:"After the spells resolve, you take turns squopping the missed winks on the table: landing a wink on top of one."},
      {key:'weizan', text:`You get ${A.squops} attempts each a round, and every wink you squop is yours: ${A.squopGain} mana each, whoever missed it.`},
      {key:'weizan', text:"The closer handicap line goes first; if they're level, whoever potted more this round; then whoever has less HP."},
    ],
    'a-lines':[
      {key:'gnash',  text:"Handicap lines matter most here. A beginner might flick from 15 cm, a regular from 25 cm and an expert from 35 cm."},
      {key:'gnash',  text:"Move the lines between games until wins even out. Then nobody can blame their squidger!"},
    ],
  };
}
// A wizard's guide: their HP and every card, in their own voice
function cardConvo(k){
  const ch=TT.chars[k], msgs=[];
  const adv=ch.alt.advanced&&ch.alt.advanced.hp, beg=ch.alt.beginner&&ch.alt.beginner.hp;
  const other=[beg&&beg!==ch.baseHp?`${beg} in Beginner rules`:'', adv&&adv!==ch.baseHp?`${adv} in Advanced rules`:''].filter(Boolean);
  msgs.push({key:k, text:`At the table I start with ${ch.baseHp} HP`+(other.length?` (${other.join(', ')})`:'')+'. '
    +(ch.forbidden.length?`I can't cast ${list(ch.forbidden.map(e=>ELEM[e]))}.`:'I can cast every element.')});
  ch.spells.forEach(s=>msgs.push({key:k, title:s.name,
    sub:`${CAT[s.cat]} · ${ELEM[s.elem]} · ${LEVEL[s.ring-1]} · ${s.cost} mana`, text:s.text}));
  return msgs;
}

// ── Rulebook (a small Markdown renderer for the rulebook's own syntax) ──
function inline(t){
  return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
const indentOf=l=>l.match(/^ */)[0].length;
const listRe=/^ *([-*]|\d+\.) +/;
function renderList(lines,i,base){
  const ordered=/^\s*\d+\./.test(lines[i]), tag=ordered?'ol':'ul';
  let html='<'+tag+'>';
  while(i<lines.length&&lines[i].trim()&&indentOf(lines[i])>=base){
    const l=lines[i], ind=indentOf(l);
    if(ind===base&&listRe.test(l)){
      let item=l.replace(listRe,''), sub='';
      i++;
      while(i<lines.length&&lines[i].trim()&&indentOf(lines[i])>base){
        if(listRe.test(lines[i])){ const r=renderList(lines,i,indentOf(lines[i])); sub+=r.html; i=r.i; }
        else { item+=' '+lines[i].trim(); i++; }
      }
      html+='<li>'+inline(item)+sub+'</li>';
    } else break;
  }
  return {html:html+'</'+tag+'>', i};
}
function renderBlocks(lines){
  let html='', i=0;
  while(i<lines.length){
    const l=lines[i];
    if(!l.trim()){ i++; continue; }
    let m;
    if((m=/^(#{3,4}) +(.*)/.exec(l))){ const h=m[1].length; html+=`<h${h}>${inline(m[2])}</h${h}>`; i++; continue; }
    if(/^-{3,}\s*$/.test(l)){ html+='<hr>'; i++; continue; }
    if(/^\|/.test(l)){
      const rows=[];
      while(i<lines.length&&/^\|/.test(lines[i])){ rows.push(lines[i]); i++; }
      const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
      const head=cells(rows[0]);
      // Spell card tables (Spell … Effect) are too wide for a phone: show each row as a card
      if(head[0]==='Spell'&&head[head.length-1]==='Effect'){
        html+=rows.slice(2).map(r=>{ const c=cells(r);
          return '<div class="tt-card"><div class="tt-card-title">'+inline(c[0].replace(/\*\*/g,''))+'</div>'
            +'<div class="tt-card-sub">'+c.slice(1,-1).map((x,j)=>j===c.length-3?inline(x)+' mana':inline(x)).join(' · ')+'</div>'
            +'<div>'+inline(c[c.length-1])+'</div></div>'; }).join('');
        continue;
      }
      html+='<div class="tt-table"><table><thead><tr>'+cells(rows[0]).map(x=>'<th>'+inline(x)+'</th>').join('')+'</tr></thead><tbody>'
        +rows.slice(2).map(r=>'<tr>'+cells(r).map(x=>'<td>'+inline(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
      continue;
    }
    if(listRe.test(l)){ const r=renderList(lines,i,indentOf(l)); html+=r.html; i=r.i; continue; }
    const para=[];
    while(i<lines.length&&lines[i].trim()&&!/^(#|\||-{3,}\s*$)/.test(lines[i])&&!listRe.test(lines[i])){ para.push(lines[i].trim()); i++; }
    html+='<p>'+inline(para.join(' '))+'</p>';
  }
  return html;
}
function parseRulebook(md){
  md=md.replace(/<!-- dev:start[\s\S]*?<!-- dev:end -->\n?/g,'').replace(/<!--[\s\S]*?-->\n?/g,'');
  const parts=md.split(/^## +/m);
  const intro=parts.shift().split('\n').filter(l=>!/^# /.test(l));
  const secs=[{id:'about', title:'About', html:renderBlocks(intro)}];
  parts.forEach(p=>{
    const lines=p.split('\n'), title=lines.shift().trim();
    secs.push({id:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'), title, html:renderBlocks(lines)});
  });
  return secs;
}

// ── Screen ─────────────────────────────────────────────────
function el(tag,attrs,html){ const e=document.createElement(tag); Object.assign(e,attrs||{}); if(html!=null) e.innerHTML=html; return e; }
function buildModal(){
  const m=el('div',{id:'tt-modal'},`
    <div id="tt-panel">
      <div id="tt-header"><div class="tut-title-text">🎲 Tabletop</div><button class="tut-close-btn" id="tt-close">✕</button></div>
      <div id="tt-tabs"><button class="tt-tab" data-tab="tutorial">🎓 Tutorial</button><button class="tt-tab" data-tab="rules">📖 Rulebook</button></div>
      <div id="tt-stages"></div>
      <div id="tt-topic-bar"></div>
      <div id="tt-chars"><div class="tut-chars-label">★ Wizard Cards ★</div><div id="tt-char-bar"></div></div>
      <div id="tt-convo"></div>
      <div id="tt-rules"></div>
    </div>`);
  document.getElementById('app').appendChild(m);
  m.querySelector('#tt-close').addEventListener('click',()=>m.classList.remove('active'));
  m.querySelectorAll('.tt-tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  return m;
}
function setTab(t){
  tab=t;
  topic=t==='rules'?rulesSections[0].id:STAGES.find(s=>s.id===stage).topics[0].id;
  render();
}
function chip(id,label,active,onClick){
  const b=el('button',{className:'tut-topic-btn'+(active?' active':'')});
  b.textContent=label; b.addEventListener('click',onClick); return b;
}
function render(){
  const m=document.getElementById('tt-modal');
  m.querySelectorAll('.tt-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const bar=m.querySelector('#tt-topic-bar'); bar.innerHTML='';
  const rules=tab==='rules';
  const stages=m.querySelector('#tt-stages'); stages.innerHTML=''; stages.style.display=rules?'none':'';
  // The tutorial's stage: the one the shown topic is in (a wizard's cards keep the last stage)
  if(!rules){
    if(stageOf(topic)) stage=stageOf(topic).id;
    STAGES.forEach(s=>{
      const b=el('button',{className:'tt-stage'+(s.id===stage?' active':'')}); b.textContent=s.label;
      b.addEventListener('click',()=>{ stage=s.id; topic=s.topics[0].id; render(); });
      stages.appendChild(b);
    });
  }
  m.querySelector('#tt-chars').style.display=rules?'none':'';
  m.querySelector('#tt-convo').style.display=rules?'none':'';
  m.querySelector('#tt-rules').style.display=rules?'':'none';
  if(rules){
    rulesSections.forEach(s=>bar.appendChild(chip(s.id,s.title,s.id===topic,()=>{ topic=s.id; render(); })));
    renderRules();
  } else {
    STAGES.find(s=>s.id===stage).topics.forEach(t=>bar.appendChild(chip(t.id,t.label,t.id===topic,()=>{ topic=t.id; render(); })));
    renderCharBar(); renderConvo();
  }
  const act=bar.querySelector('.active'); if(act&&act.scrollIntoView) act.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderCharBar(){
  const bar=document.getElementById('tt-char-bar'); bar.innerHTML='';
  Object.keys(TT.chars).forEach(k=>{
    const ch=TT.chars[k], active=k===topic;
    const b=el('button',{className:'tut-char-btn'+(active?' active':'')});
    const img=el('img',{src:'portraits/small/'+k+'.jpg', alt:ch.name});
    img.style.borderColor=active?ch.col:'rgba(201,168,76,0.3)';
    const lbl=el('span',{className:'tut-char-name'}); lbl.style.color=ch.col; lbl.textContent=ch.name;
    b.append(img,lbl);
    b.addEventListener('click',()=>{ topic=k; render(); });
    bar.appendChild(b);
  });
}
function renderConvo(){
  const box=document.getElementById('tt-convo'); box.innerHTML='';
  const msgs=TT.chars[topic]?cardConvo(topic):(convos()[topic]||[]);
  msgs.forEach((msg,i)=>{
    const ch=TT.chars[msg.key]||{name:msg.key, col:'#f0cc6a'};
    const name=ch.name[0]+ch.name.slice(1).toLowerCase();
    const div=el('div',{className:'tut-msg'}); div.style.animationDelay=(i*0.06)+'s';
    const img=el('img',{className:'tut-msg-portrait', src:'portraits/small/'+msg.key+'.jpg', alt:name}); img.style.borderColor=ch.col;
    const bubble=el('div',{className:'tut-bubble'});
    const sp=el('div',{className:'tut-speaker'}); sp.style.color=ch.col; sp.textContent=name;
    bubble.appendChild(sp);
    if(msg.title){
      const t=el('div',{className:'tt-card-title'}); t.textContent=msg.title; bubble.appendChild(t);
      const s=el('div',{className:'tt-card-sub'}); s.textContent=msg.sub; bubble.appendChild(s);
    }
    const tx=el('div',{className:'tut-text'}); tx.textContent=msg.text; bubble.appendChild(tx);
    div.append(img,bubble); box.appendChild(div);
  });
  box.scrollTop=0;
}
function renderRules(){
  const box=document.getElementById('tt-rules');
  const s=rulesSections.find(x=>x.id===topic)||rulesSections[0];
  box.innerHTML='<h2>'+inline(s.title)+'</h2>'+s.html;
  // Bold names of other sections ("see **The flick**") jump to them
  box.querySelectorAll('b').forEach(b=>{
    const to=rulesSections.find(x=>x.title.toLowerCase()===b.textContent.toLowerCase()&&x!==s);
    if(to){ b.classList.add('tt-link'); b.addEventListener('click',()=>{ topic=to.id; render(); }); }
  });
  box.scrollTop=0;
}

function load(){
  if(loaded) return loaded;
  const get=(u,json)=>fetch(u).then(r=>{ if(!r.ok) throw new Error(u+' '+r.status); return json?r.json():r.text(); });
  loaded=Promise.all([get('characters.json',true),get('tabletop.json',true),get('docs/tabletop-rules.md')])
    .then(([chars,tt,md])=>{ TT.load(chars,tt); TT.useRules('normal'); rulesSections=parseRulebook(md); })
    .catch(err=>{ loaded=null; throw err; });
  return loaded;
}
function open(){
  const m=document.getElementById('tt-modal')||buildModal();
  m.classList.add('active');
  const box=document.getElementById('tt-convo');
  if(!rulesSections.length){ box.style.display=''; document.getElementById('tt-rules').style.display='none'; box.innerHTML='<div class="tt-loading">Loading…</div>'; }
  load().then(render).catch(err=>{ box.innerHTML='<div class="tt-loading">Couldn\'t load the tabletop rules.</div>'; console.error(err); });
}

window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('btn-tabletop');
  if(b) b.addEventListener('click',open);
});
window.TabletopUI={open, parseRulebook};
})();
