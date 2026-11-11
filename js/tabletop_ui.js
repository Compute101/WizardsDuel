// ── TABLETOP SCREEN ────────────────────────────────────────
// The "🎲 Tabletop" button on the title screen: a tutorial (wizards explaining the tiddlywink rules,
// plus each wizard's tabletop cards) and the full rulebook. Both are read from the tabletop files,
// so they stay in step with the engine:
//  - the rulebook is docs/tabletop-rules.md, rendered here (blocks between <!-- dev:start --> and
//    <!-- dev:end --> are for developers and left out);
//  - the tutorial's numbers come from TT.RULES / TT.PRESETS (js/tabletop.js), and the wizard cards
//    from tabletop.json.
// It only reads the tabletop rules; it never changes the standard game.
(function(){
'use strict';

let loaded=null;            // Promise: everything fetched and TT loaded
let rulesSections=[];       // [{id, title, html}]
let tab='tutorial', topic='welcome';

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ELEM={fire:'Fire',ice:'Ice',lightning:'Lightning',arcane:'Arcane',physical:'Physical',dark:'Dark'};
const CAT={damage:'Damage',protect:'Protection',dispel:'Dispel'};
const LEVEL=['Lesser','Normal','Greater'];
const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];

// ── Tutorial ───────────────────────────────────────────────
const TOPICS=[
  {id:'welcome',  label:'Welcome'},
  {id:'kit',      label:'Kit & Setup'},
  {id:'round',    label:'A Round'},
  {id:'spells',   label:'Spell Levels'},
  {id:'flick',    label:'The Flick'},
  {id:'beginner', label:'Beginner Rules'},
  {id:'wards',    label:'Wards & Dispels'},
  {id:'curses',   label:'Buffs & Curses'},
  {id:'roundend', label:'Round End'},
];
// Built after TT has loaded, so the numbers are the engine's
function convos(){
  // Copies of the two rule sets' numbers, without switching TT's current rules
  const R=TT.RULES, B=Object.assign({},R,TT.PRESETS.beginner);
  const c=R.cats, budget=B.chances.budget;
  const flicks=i=>budget-c.damage.cost[i];
  const odds=n=>1-Math.pow(1-B.pot,n);
  const sd=R.suddenDeath;
  return {
    welcome:[
      {key:'eldrin', text:"Welcome to the table, mage. Tabletop is WizardsDuel played with real counters: the same secret picks of Damage, Protection and Dispel, but you cast by flicking tiddlywinks into a pot."},
      {key:'sylvara',text:"Your health, your mana and your ward are piles of winks. When you cast, you flick the very mana you just spent. Pot it and the spell goes off!"},
      {key:'ponder', text:"New to flicking? So am I! There are Beginner rules for players who don't pot much yet. Tap the topics above to learn the game, or a portrait below to see that wizard's spell cards."},
      {key:'eldrin', text:"Everything here comes from the rulebook, in the 📖 Rulebook tab. Keep it open at the table."},
    ],
    kit:[
      {key:'durin',  text:`You'll need tiddlywinks in three colours, up to ${R.max} of each per player: red for health, blue for mana and white for your ward. Plus a pot, a squidger each and a six-sided die.`},
      {key:'durin',  text:"And a way to pick in secret: a dial, or face-down cards for Damage, Protection, Dispel and Meditate, with a note of the element and level. Mark each buff and curse with a token or its card."},
      {key:'gnash',  text:`Setup is quick. Take as many health winks as your wizard's HP (it's on their card below) and ${R.startMana} mana. Nobody can ever hold more than ${R.max} health, mana or ward winks.`},
      {key:'gnash',  text:"Then agree where each of you flicks from: your handicap line. A better flicker stands further back, so it's a fair fight."},
    ],
    round:[
      {key:'eldrin', text:"Each round, pick in secret: Damage, Protection or Dispel, with an element and a level (Lesser, Normal or Greater). Or one of your signature spells, a Cleanse to clear your curses, or Meditate."},
      {key:'skadi',  text:`Meditate skips your spell for ${R.meditate} mana. You can't do it two rounds running.`},
      {key:'eldrin', text:"Reveal together, then pay your spell's cost in mana winks and flick for it. If you can't afford your spell, it's lost and you pay nothing."},
      {key:'sylvara',text:"Then it all resolves in order: every Protection first, then every Dispel, then every Damage, then Meditate. A ward raised this round already blocks this round's strikes."},
      {key:'sylvara',text:"Last come squops (full rules only) and the round end. The moment a wizard reaches 0 HP, the game is over. If both fall together, it's a draw."},
    ],
    spells:[
      {key:'ponder', text:"Here's the rule to remember: every spell costs 2 mana for each wink you'd have to pot. Damage equals the cost. Wards and Dispels are double the cost."},
      {key:'cinder', text:[0,1,2].map(i=>`${LEVEL[i]}: ${c.damage.cost[i]} mana for ${c.damage.power[i]} damage, or a ${c.protect.power[i]} ward or dispel.`).join(' ')},
      {key:'ponder', text:"Signature spells are fixed cards with their own cost and level. Tap a portrait below to read a wizard's cards."},
      {key:'cinder', text:"There's no free attack, so every spell is a choice: spend big now, or save for a bigger cast next round?"},
    ],
    flick:[
      {key:'zacharius',text:`In the full rules, you flick from your handicap line and must pot ${R.winks[0]} wink for a Lesser spell, ${R.winks[1]} for Normal and ${R.winks[2]} for Greater.`},
      {key:'zacharius',text:`Missed? Pay ${R.retryCost} more mana to go again, and your run carries on. Can't pay, or won't? The spell fizzles and its mana is lost.`},
      {key:'weizan', text:"Missed winks stay where they land, round after round. After the spells resolve, you take turns squopping them: landing a wink on top of one."},
      {key:'weizan', text:`You get ${R.squops} attempts each a round, and every wink you squop is yours: ${R.squopGain} mana each, whoever missed it. The closer handicap line goes first.`},
    ],
    beginner:[
      {key:'ponder', text:`Beginner rules are for new flickers. They're tuned to a first trial of 7 pots in 57 flicks, about ${Math.round(B.pot*100)}%.`},
      {key:'ponder', text:`Pay your spell's cost, then flick ${budget} minus the cost. A Lesser spell gets ${flicks(0)} flicks, Normal ${flicks(1)} and Greater ${flicks(2)}. Signature cards and Cleanse use their own cost.`},
      {key:'fizzwick',text:"Your first pot casts the spell, so stop flicking. No pot at all, and the spell fizzles: the mana you paid is lost."},
      {key:'fizzwick',text:`At ${Math.round(B.pot*100)}%, a Lesser spell goes off about ${Math.round(odds(flicks(0))*100)}% of the time, Normal ${Math.round(odds(flicks(1))*100)}% and Greater ${Math.round(odds(flicks(2))*100)}%. Small spells are safe, big ones a gamble.`},
      {key:'ponder', text:"There are no squops: pick up the winks you missed. A few wizards also start with different HP in Beginner rules; their cards below show it."},
      {key:'ponder', text:"When you're potting about half your flicks, move up to the full rules!"},
    ],
    wards:[
      {key:'eldrin', text:`A ward is a pile of ward winks, and a new ward replaces the old one. Strikes hit the ward first; what's left over goes to HP. A strike in the ward's own element counts +${R.wardMatch} against it.`},
      {key:'durin',  text:`A ward lasts until it runs out. It loses ${R.wardWear} wink at every round end, and strikes, dispels and ticks wear it down too.`},
      {key:'ponder', text:`A Dispel tears ward winks off equal to its power, +${R.wardMatch} in the ward's own element. With no ward up, it removes the foe's newest buff, and a Greater Dispel removes every buff.`},
      {key:'valdris',text:"My skeletons stand in front of my ward. Each has 1 HP, so every point of damage kills one before anything reaches the ward. Dispels can't touch them."},
      {key:'daveron',text:"My graveguard are the same, but tougher: damage wears down the oldest first. Keep a die by each to track its HP."},
    ],
    curses:[
      {key:'mordant',text:"Curses are Dispel-type signature spells, and they land even through a ward. Nothing has a round timer: a curse stays until the cursed wizard Cleanses."},
      {key:'mary',   text:`Cleanse is a Dispel at yourself. It costs ${list(R.cleanseCost.map(String))} mana for a Lesser, Normal or Greater cast, and removes 1 curse, 2 curses or all of them.`},
      {key:'gretch', text:"Buffs stay until a Dispel removes them. \"Next strike\" and \"next pick\" effects, like Empower or Enthral, go as soon as they're used."},
      {key:'mary',   text:"\"Can't pick Damage next round\" lasts that one round only, and nobody can be locked two rounds running."},
    ],
    roundend:[
      {key:'gnash',  text:"At the round end, curses tick first (burns, poison, plague, Agony), then regeneration, then minions strike the foe."},
      {key:'korvath',text:`From round ${sd.round} it's sudden death: both wizards lose ${sd.dmg} HP every round end, and ${sd.dmg} more every ${sd.every} rounds after that. Nobody hides forever.`},
      {key:'gnash',  text:`Then wards wear by ${R.wardWear} wink, and each wizard gains ${R.income} mana, less any curse that cuts income.`},
      {key:'korvath',text:"Games are short: about 11 rounds. Make every flick count!"},
    ],
  };
}
// A wizard's guide: their HP and every card, in their own voice
function cardConvo(k){
  const ch=TT.chars[k], msgs=[];
  const beg=ch.alt.beginner&&ch.alt.beginner.hp;
  msgs.push({key:k, text:`At the table I start with ${ch.baseHp} HP`+(beg&&beg!==ch.baseHp?` (${beg} in Beginner rules)`:'')+'. '
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
  topic=t==='rules'?rulesSections[0].id:'welcome';
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
  m.querySelector('#tt-chars').style.display=rules?'none':'';
  m.querySelector('#tt-convo').style.display=rules?'none':'';
  m.querySelector('#tt-rules').style.display=rules?'':'none';
  if(rules){
    rulesSections.forEach(s=>bar.appendChild(chip(s.id,s.title,s.id===topic,()=>{ topic=s.id; render(); })));
    renderRules();
  } else {
    TOPICS.forEach(t=>bar.appendChild(chip(t.id,t.label,t.id===topic,()=>{ topic=t.id; render(); })));
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
    .then(([chars,tt,md])=>{ TT.load(chars,tt); TT.useRules('standard'); rulesSections=parseRulebook(md); })
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
