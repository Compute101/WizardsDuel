// Rewrites the character section of docs/tabletop-rules.md from tabletop.json (and the base-spell
// table from the rules in js/tabletop.js), so the rulebook always matches what the simulator balanced.
// Run after any tabletop balance change:   node tools/tabletop_doc.js
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const TT=require(path.join(root,'js/tabletop.js'));
const chars=TT.load(require(path.join(root,'characters.json')),require(path.join(root,'tabletop.json')));
const R=TT.RULES;
const RING=['Lesser','Normal','Greater'];
const ELEM={fire:'Fire',ice:'Ice',lightning:'Lightning',arcane:'Arcane',physical:'Physical',dark:'Dark'};
const CAT={damage:'Damage',protect:'Protection',dispel:'Dispel'};

let base='| Level | Winks to pot | Cost | Damage | Ward | Dispel |\n|---|---|---|---|---|---|\n';
[0,1,2].forEach(i=>{
  base+=`| ${RING[i]} | ${R.winks[i]} | ${R.cats.damage.cost[i]} | ${R.cats.damage.power[i]} | ${R.cats.protect.power[i]} | ${R.cats.dispel.power[i]} |\n`;
});

let out='';
Object.values(chars).forEach(c=>{
  const notes=[];
  if(c.deathless) notes.push(`Deathless: when knocked to 0 HP, pay ${c.deathless} mana to stay on 1 HP`);
  if(c.forbidden.length) notes.push('Can\'t cast: '+c.forbidden.map(e=>ELEM[e]).join(', '));
  // Beginner HP, when a rule set changes it: Five Chances ('beginner') and Flick Your Mana ('beginnerCost')
  const bh=r=>c.alt[r]&&c.alt[r].hp!=null?c.alt[r].hp:c.baseHp;
  const beg=bh('beginner')!==c.baseHp||bh('beginnerCost')!==c.baseHp
    ?` (Beginner: Five Chances **${bh('beginner')}**, Flick Your Mana **${bh('beginnerCost')}**)`:'';
  out+=`### ${c.name} — ${c.title}\n**HP ${c.baseHp}**${beg}${notes.length?' · '+notes.join(' · '):''}\n\n`;
  out+='| Spell | Type | Element | Level | Cost | Effect |\n|---|---|---|---|---|---|\n';
  c.spells.forEach(s=>{ out+=`| **${s.name}** | ${CAT[s.cat]} | ${ELEM[s.elem]} | ${RING[s.ring-1]} | ${s.cost} | ${s.text} |\n`; });
  out+='\n';
});

const file=path.join(root,'docs/tabletop-rules.md');
let doc=fs.readFileSync(file,'utf8');
const swap=(name,body)=>{
  const re=new RegExp(`(<!-- ${name}:start -->\\n)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if(!re.test(doc)) throw new Error('markers missing: '+name);
  doc=doc.replace(re,`$1${body}$2`);
};
swap('base-spells',base);
swap('characters',out);
fs.writeFileSync(file,doc);
console.log('Updated',path.relative(root,file),'—',Object.keys(chars).length,'characters');
