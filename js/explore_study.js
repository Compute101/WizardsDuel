// The Library's primers (Explore's University Year, docs/world-design.md): a study card of a set's
// four glyphs, then a short flash-card test at the Keeper's desk. Pass it and the glyphs are yours.
// ExploreStudy.primer(root, {id, title, keeper}) → Promise<{passed, score, of}>
(function(){
'use strict';

// the twelve glyphs (indices as in the game: MG_SYMS), their names in Wrenford and glow colours
const GLYPHS = ['ϟ','Δ','∇','Ψ','Ω','∞','☽','✸','⊕','⊗','θ','Φ'];
const NAMES  = ['the Bolt','the Peak','the Well','the Fork','the Arch','the Knot','the Moon','the Star','the Wheel','the Seal','the Eye','the Spindle'];
const GLOW   = ['#ccffff','#ff9944','#44aaff','#aaff88','#ff4444','#44ffcc','#aaddff','#ffff55','#ffee77','#ff44aa','#88ff88','#dd88ff'];
// each primer: its four glyphs in the order they're written (the easy-mode word), and what each means in it
const PRIMERS = {
  fire:      {name:'Fire',      set:[0,1,8,4],  means:['the spark','the rising flame','the sun','the consuming end']},
  lightning: {name:'Lightning', set:[3,2,9,7],  means:['the forked strike','the descent','the impact','the burst']},
  ice:       {name:'Ice',       set:[10,11,6,5],means:['the crystal','the polar axis','the frost moon','the eternal cold']},
  arcane:    {name:'Arcane',    set:[4,5,3,10], means:['the cosmos','eternity','the spirit','the hidden']},
  earth:     {name:'Earth',     set:[1,2,3,8],  means:['the rising stone','the sinking stone','the roots','the binding']},
  dark:      {name:'Dark',      set:[6,9,2,4],  means:['the moon','the void','the descent','the ending']},
  air:       {name:'Air',       set:[1,0,7,11], means:['the rising','the gust','the burst','the axis']},
  water:     {name:'Water',     set:[2,5,4,11], means:['the descent','the flow','the depths','the tide']},
  dispel:    {name:'Dispel',    set:[5,8,2,10], means:['the eternal cycle','the unbinding','the descent','the dissolution']},
};
const QUESTIONS = 6, PASS = 5;
const ORD = ['first','second','third','fourth'];
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random()*a.length)];
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const glyph = (i,big) => `<span class="st-g${big?' big':''}" style="--gc:${GLOW[i]}">${GLYPHS[i]}</span>`;

// six questions over the set: its glyphs by name, names by glyph, and the order of the word
function makeQuiz(P){
  const qs=[], set=P.set, others=GLYPHS.map((_,i)=>i).filter(i=>!set.includes(i));
  const kinds=shuffle(['name','glyph','order','name','glyph','order']);
  const used={};
  kinds.forEach(k=>{
    const pos=pick([0,1,2,3].filter(p=>!(used[k]||[]).includes(p)).concat(used[k]&&used[k].length>=4?[0,1,2,3]:[]));
    (used[k]=used[k]||[]).push(pos);
    const g=set[pos];
    if(k==='name'){        // a glyph: which is its name?
      const opts=shuffle([g].concat(shuffle(GLYPHS.map((_,i)=>i).filter(i=>i!==g)).slice(0,3)));
      qs.push({ask:'What is this glyph called?', show:glyph(g,true), opts:opts.map(i=>({html:esc(NAMES[i]), right:i===g}))});
    } else if(k==='glyph'){ // a name and its meaning here: which glyph? (one wrong answer from outside the set, to tempt)
      const opts=shuffle([g].concat(shuffle(set.filter(i=>i!==g)).slice(0,2), [pick(others)]));
      qs.push({ask:'Which is '+NAMES[g]+', '+P.means[pos]+'?', opts:opts.map(i=>({html:glyph(i), right:i===g}))});
    } else {               // the word's order
      const opts=shuffle(set.slice());
      qs.push({ask:'Which glyph is written '+ORD[pos]+' in the word of '+P.name+'?', opts:opts.map(i=>({html:glyph(i), right:i===g}))});
    }
  });
  return qs.slice(0,QUESTIONS);
}

let box=null;
function primer(root, o){
  const P=PRIMERS[o.id]; if(!P) return Promise.resolve({passed:false,score:0,of:0});
  const keeper=o.keeper||'The Keeper';
  return new Promise(resolve=>{
    if(box) box.remove();
    box=document.createElement('div'); box.className='st-wrap';
    root.appendChild(box);
    const close=r=>{ box.remove(); box=null; resolve(r); };
    // 1. the study card
    function study(){
      box.innerHTML=`<div class="st-card"><div class="st-title">A Primer of ${esc(P.name)}</div>`+
        `<div class="st-sub">Learn the four glyphs, in the order they're written.</div>`+
        `<div class="st-row">`+P.set.map((g,i)=>`<div class="st-cell"><small>${i+1}</small>${glyph(g,true)}<b>${esc(NAMES[g])}</b><em>${esc(P.means[i])}</em></div>`).join('')+`</div>`+
        `<div class="st-word">The word: ${P.set.map(g=>glyph(g)).join(' ')}</div>`+
        `<div class="st-foot"><button class="ex-btn st-later" type="button">Later</button><button class="ex-btn st-go" type="button">I'm ready to be tested</button></div></div>`;
      box.querySelector('.st-later').onclick=()=>close({passed:false,score:0,of:0,left:true});
      box.querySelector('.st-go').onclick=quiz;
    }
    // 2. the test at the desk
    function quiz(){
      const qs=makeQuiz(P); let n=0, score=0;
      function ask(){
        if(n>=qs.length){ done(); return; }
        const q=qs[n];
        box.innerHTML=`<div class="st-card"><div class="st-title">${esc(keeper)}'s test · ${n+1} of ${qs.length}</div>`+
          (q.show?`<div class="st-show">${q.show}</div>`:'')+`<div class="st-ask">${esc(q.ask)}</div>`+
          `<div class="st-opts">`+q.opts.map((a,i)=>`<button class="ex-btn st-opt" data-i="${i}" type="button">${a.html}</button>`).join('')+`</div>`+
          `<div class="st-score">${score} right so far · ${PASS} of ${qs.length} to pass</div></div>`;
        box.querySelectorAll('.st-opt').forEach(b=>b.onclick=()=>{
          if(box.dataset.lock) return; box.dataset.lock='1';
          const a=q.opts[+b.dataset.i];
          if(a.right) score++;
          b.classList.add(a.right?'right':'wrong');
          box.querySelectorAll('.st-opt').forEach((x,i)=>{ if(q.opts[i].right) x.classList.add('right'); });
          setTimeout(()=>{ delete box.dataset.lock; n++; ask(); }, a.right?550:1300);
        });
      }
      function done(){
        const passed=score>=PASS;
        box.innerHTML=`<div class="st-card"><div class="st-title">${passed?'Passed':'Not yet'}</div>`+
          `<div class="st-big">${score} of ${qs.length}</div>`+
          `<div class="st-sub">${passed?esc(keeper)+' initials the slip. "The glyphs of '+esc(P.name)+' are yours. Don\'t forget them; they won\'t forget you."':esc(keeper)+' takes the primer back, not unkindly. "Again, when you\'re ready. Nobody has ever run out of tries in this library."'}</div>`+
          `<div class="st-foot">${passed?'':'<button class="ex-btn st-again" type="button">Study it again</button>'}<button class="ex-btn st-ok" type="button">${passed?'Thank you':'Leave it for now'}</button></div></div>`;
        box.querySelector('.st-ok').onclick=()=>close({passed,score,of:qs.length});
        const ag=box.querySelector('.st-again'); if(ag) ag.onclick=study;
      }
      ask();
    }
    study();
  });
}

window.ExploreStudy={primer, PRIMERS, NAMES, GLYPHS, GLOW};
})();
