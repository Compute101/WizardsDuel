// ═══ EXPLORE: THE INTRODUCTION SCROLL ═════════════════════════════════
// Shown once, after you make your wizard for a new game: what happened to Corvanthe, why
// quintessence (spill) matters, how the University's Finders found you, and what to do first
// (matriculate: the Senior Tutor in Founders' Quad). Parts of it follow your wizard: your
// element (the sign the Finder heard about) and your age (young, middle-aged or old).
// ExploreIntro.play(root, hero) → Promise, resolved when the player taps Begin or Skip.
// The parchment rolls up by itself (SPEED px/s); touching, dragging or the wheel takes over
// for PAUSE_MS, and prefers-reduced-motion leaves it still. Styles: "Explore: introduction" in css/style.css.
(function(){
'use strict';

const SPEED = 26;          // px a second the scroll rolls up by itself
const PAUSE_MS = 4000;     // after the player scrolls it by hand

// the sign of the gift, by element: what the Finder heard about in your village
const OMENS = {
  fire:     'the hearth fire that leaned towards you whenever you came in, and once burned all night on no wood at all',
  air:      'the washing that lifted on the line when there was no wind, and the doors that swung open before you reached them',
  lightning:'the sparks that jumped from your fingers in dry weather, and the storms you could feel coming a day before anyone else',
  arcane:   'the lamps that burned brighter when you read beside them, and the locks that sometimes simply forgot to be locked',
  water:    'the well whose water rose to meet your bucket, and the rain that seemed to follow you home',
  earth:    'the fields where the plough never turned up a stone once you had walked them, and the old wall that held when the flood came',
  ice:      'the frost that drew ferns on the window wherever you breathed, even at midsummer',
  dark:     'the shadows that stayed behind a moment after you left a room, and the dogs that would not bark at you at night',
};

// the Finder and your age: anyone can begin, and magic keeps its own time
const AGES = {
  young: [
    'You were young, younger than most who are sent, and you said so. The Finder only nodded. “Good. You have less to unlearn.”',
  ],
  middle: [
    'You had a life already: a trade, a roof, and more years behind you than you cared to count. You said it was surely too late.',
    '“Magic doesn’t care when you begin,” said the Finder. “Only that you do. Half the Fellows at Wrenford came to it later than you.”',
  ],
  old: [
    'You have seen a good many winters, and you said that a gift found this late was a gift wasted. The Finder only smiled.',
    '“Magic keeps its own time. Those who use it outlive the rest of us by a long way: the Masters at Wrenford were old when my grandmother was a girl, and they’ll see me buried. You have years enough. More than you think.”',
  ],
};

const esc = t => String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function text(hero){
  const H=window.ExploreHero, el=(H&&H.ELEMS.find(e=>e.id===hero.elem))||{name:'magic',col:'#c9a84c'};
  const name=esc(hero.name||'Wizard'), ages=AGES[hero.age]||AGES.young, omen=OMENS[hero.elem]||OMENS.arcane;
  const P=t=>'<p>'+t+'</p>';
  return '<h2>The Unweaving</h2>'+
    P('For seven hundred years <b>Corvanthe</b> was the greatest seat of learning in the world: a city of spires and lecture halls, held together by a Great Weave of magic older than its walls.')+
    P('In its last year a curse lay on the city. Its Council found, in the oldest of its books, a Word that would unpick the curse, and voted seven to one to speak it. Only Magister Orrin voted no. “You do not know what it will unweave,” he said.')+
    P('At the hour of lowest tide, beneath the Collegium, the Archmage spoke the Unweaving Word. <i>The Word did not know where to stop.</i>')+
    P('In one bright hour the Weave came apart. The heart of the city became <b>the Wound</b>. Its eight districts burned and froze, flooded and fell, each soaked through with a single element. And the people of Corvanthe, scholars and bakers, lamplighters and children, were remade as <b>Echoes</b>: shapes of living fire and stone and storm that still walk the streets they knew, and cannot die. Break one and it gathers itself again at the Wound, and walks home.')+
    '<div class="xi-rule">✦</div>'+
    '<h2>Quintessence</h2>'+
    P('What an Echo leaves behind when it breaks is <b>quintessence</b>: elemental matter in its rawest form. Cinderglass and rimeheart, stormglass and nightglass. On the street they call it <b>spill</b>.')+
    P('Every potion-maker, enchanter and spellwright in the world wants it, it is worth more than its weight in gold, and there is only one place it comes from.')+
    P('So the gleaner crews came, to hunt the Echoes for their spill. Most were sellswords, and most of them did not come back. It soon became plain that the ruins favour those with a gift for magic, and the training to use it: a little talent, well taught, could walk where soldiers died. Every mage who could be found was suddenly in demand.')+
    '<div class="xi-rule">✦</div>'+
    '<h2>The Finder</h2>'+
    P('So the University sent out its <b>Finders</b>: quiet men and women with an eye for the gift, who travel the market towns and listen for the stories nobody else believes.')+
    P('In your village the story was about you: <span class="xi-omen" style="--xc:'+el.col+'">'+omen+'</span>. A Finder heard it, came to see, and stayed watching a while longer than was polite. There was a gift in you, a small one, with the colour of <b class="xi-omen" style="--xc:'+el.col+'">'+esc(el.name)+'</b> in it.')+
    ages.map(P).join('')+
    P('The Finder wrote you a letter of introduction to the University of <b>Wrenford</b>, founded by the scholars of Corvanthe who were away on the day of the Unweaving, and who swore that nothing like it would ever be done again.')+
    '<div class="xi-rule">✦</div>'+
    '<h2>Wrenford</h2>'+
    P('Now, after many days on the road, you stand at the edge of Wrenford with the letter in your hand, <b>'+name+'</b>. Before anyone will let you near Corvanthe, you must <b>matriculate</b>: be enrolled, tested, and taught the first things every mage must know.')+
    '<div class="xi-goal"><b>Your first task</b>Report to the Senior Tutor, <b>Dr Penhallow</b>, in <b>Founders’ Quad</b>. The Head Porter by the Lodge will point the way. And keep off the grass.</div>'+
    '<div class="xi-help"><span>Tap or click where you want to walk (or WASD / arrows)</span><span>Walk up to people and things, then tap the action button (or E) to talk or look</span><span>🎒 Your satchel holds your journal, tasks and what you carry</span></div>';
}

function play(root, hero){
  return new Promise(resolve=>{
    const box=document.createElement('div'); box.className='xi';
    box.innerHTML='<div class="xi-scroll"><div class="xi-roll xi-roll-top"></div>'+
      '<div class="xi-page" tabindex="0"><div class="xi-text"><div class="xi-pad"></div>'+text(hero)+'<div class="xi-end"></div></div></div>'+
      '<div class="xi-roll xi-roll-bot"></div></div>'+
      '<div class="xi-foot"><button type="button" class="ex-btn xi-skip">Skip ▸</button><button type="button" class="ex-btn xi-go">Enter Wrenford</button></div>';
    root.appendChild(box);
    const page=box.querySelector('.xi-page'), go=box.querySelector('.xi-go');
    let held=0, last=performance.now(), done=false, acc=0;
    const still=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold=()=>{ held=performance.now()+PAUSE_MS; };
    ['wheel','touchstart','pointerdown','keydown'].forEach(ev=>page.addEventListener(ev,hold,{passive:true}));
    function tick(now){
      if(done) return;
      const dt=Math.min(0.1,(now-last)/1000); last=now;
      const end=page.scrollHeight-page.clientHeight;
      if(!still&&now>held&&page.scrollTop<end-1){ acc+=SPEED*dt; const s=Math.floor(acc); if(s){ acc-=s; page.scrollTop+=s; } }
      if(page.scrollTop>=end-40) go.classList.add('ready');
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    const finish=()=>{ if(done) return; done=true; box.classList.add('leaving'); setTimeout(()=>{ box.remove(); resolve(); },450); };
    box.querySelector('.xi-skip').addEventListener('click',finish);
    go.addEventListener('click',finish);
    setTimeout(()=>{ try{ page.focus({preventScroll:true}); }catch(e){} },50);
  });
}

window.ExploreIntro={play, text, OMENS, AGES};
})();
