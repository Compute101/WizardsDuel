// ═══════════════════════════════════════════════════════════════════
//  EXPLORE BANDS — the gleaner warbands (step 6 of docs/world-design.md).
//  Rival crews who scavenge Corvanthe for spill. Each works one map: it
//  walks the streets, hunts Echo groups (and wins or loses), carries what
//  it has gleaned, and meets you. A 'toll' crew wants paying to let you
//  pass; a 'hostile' one comes at you on sight. Beat a crew and its purse
//  and haul are yours; lose and it takes half of yours. A broken crew is
//  back, with new blood, after BAND_RULES.respawnMs.
//  This file is data and small pure helpers; js/explore.js runs them.
// ═══════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const BAND_RULES = {
    wander: 58,
    chase: 104,
    sight: 250,
    touch: 34, // px/s and px (you walk at 175, so you can outrun them)
    respawnMs: 20 * 60 * 1000,
    tollMs: 10 * 60 * 1000, // a broken crew regroups; a paid toll lasts
    hunt: 0.6, // chance a crew heads for the nearest Echo group when it picks a new way
    clashMs: 2600, // how long a fight with Echoes lasts on the map
    gold: [14, 24, 38, 56],
    toll: [6, 10, 15, 22], // by level
    robGold: 0.5,
    robSpill: 0.5 // what they take when they beat you
  };
  // level: SURVIVAL_LEVELS index (0 recruit … 3 champion). bandit: the hostile crews' leader, a bandit mage
  // painted from the NPC-only eyepatch figures (js/explore_hero.js); js/explore.js makes the look (nudged off
  // yours), registers it as 'bandit_<id>' and sets the crew's `wizard` to that key. Beating the crew wins
  // their staff's topper. (A crew may still carry a roster `wizard` key instead.)
  const BANDS = [
    {
      id: 'roadwardens',
      map: 'corvanthe_road',
      name: 'the Roadwardens',
      mood: 'toll',
      level: 0,
      members: ['soldier', 'soldier'],
      col: '#9aa4b4',
      leader: 'Sergeant Brask',
      toll: '"The Wardens are gone, but the road still has a toll. Ours, now."',
      beaten: '"Fine. Fine! The road\'s yours."'
    },
    {
      id: 'ashen_crows',
      map: 'cindergate',
      name: 'the Ashen Crows',
      mood: 'toll',
      level: 0,
      members: ['soldier', 'archer'],
      col: '#c8643c',
      leader: 'Corla Vane',
      toll: '"Cindergate\'s ash is ours to sift. Pay the Crows, or turn around."',
      beaten: '"Take it. There\'s always more ash."'
    },
    {
      id: 'kettle_boys',
      map: 'cindergate',
      name: 'the Kettle Boys',
      mood: 'hostile',
      level: 1,
      members: ['soldier', 'halberdier', 'archer'],
      col: '#e0402a',
      leader: 'Big Kettle',
      shout: '"A wizard! Wizards carry the good stuff!"',
      beaten: '"Kettle don\'t forget a face."'
    },
    {
      id: 'kite_lords',
      map: 'heights',
      name: 'the Kite Lords',
      mood: 'toll',
      level: 1,
      members: ['archer', 'archer', 'soldier'],
      col: '#c8e0f0',
      leader: 'Lady Pell',
      toll: '"These were our houses before they took to the air. The rent is due."',
      beaten: '"Insufferable. Do mind the drop."'
    },
    {
      id: 'cloudcutters',
      map: 'heights',
      name: 'the Cloudcutters',
      mood: 'hostile',
      level: 2,
      members: ['halberdier', 'archer'],
      col: '#8fb8e8',
      bandit: {
        name: 'Granny Squall',
        sex: 'f',
        age: 'old',
        fig: 'old_woman_5',
        elem: 'air',
        robe: 'Teal',
        trim: 'Bone',
        staff: 'Driftwood',
        topper: 'feathers',
        hair: 'White',
        skin: 'Fair',
        eyes: 'Grey'
      },
      leader: 'Granny Squall',
      shout: '"Wind told me you were coming, dearie. Wind tells me everything."',
      beaten: '"Blow me down. Well. There\'s always another gust."'
    },
    {
      id: 'bellringers',
      map: 'spirewatch',
      name: 'the Bellringers',
      mood: 'toll',
      level: 1,
      members: ['soldier', 'soldier'],
      col: '#a8b8ff',
      leader: 'Old Tolly',
      toll: '"Every bell in Spirewatch is ours, and so\'s every street under them."',
      beaten: '"Ring a bell for us, wizard. We\'ll hear it."'
    },
    {
      id: 'stormwrights',
      map: 'spirewatch',
      name: 'the Stormwrights',
      mood: 'hostile',
      level: 2,
      members: ['soldier', 'archer'],
      col: '#7080ff',
      bandit: {
        name: 'Brannoc Ashwell',
        sex: 'm',
        age: 'middle',
        fig: 'mid_man_7',
        elem: 'lightning',
        robe: 'Midnight',
        trim: 'Silver',
        staff: 'Blackthorn',
        topper: 'blade',
        hair: 'Black',
        skin: 'Tan',
        eyes: 'Amber'
      },
      leader: 'Brannoc Ashwell',
      shout: '"Lightning picked me once. Left me this face. Let\'s see what it leaves on yours."',
      beaten: '"Struck twice. Never thought I\'d see it."'
    },
    {
      id: 'inkstained',
      map: 'collegium',
      name: 'the Inkstained',
      mood: 'toll',
      level: 1,
      members: ['archer', 'soldier'],
      col: '#c090ff',
      leader: 'Magister-That-Never-Was',
      toll: '"Failed our exams the week before it happened. We\'re auditing the place now. Fees apply."',
      beaten: '"We\'ll appeal."'
    },
    {
      id: 'last_proctors',
      map: 'collegium',
      name: 'the Last Proctors',
      mood: 'hostile',
      level: 2,
      members: ['halberdier', 'soldier'],
      col: '#a070e0',
      bandit: {
        name: 'Proctor Vell',
        sex: 'm',
        age: 'old',
        fig: 'old_man_5',
        elem: 'arcane',
        robe: 'Black',
        trim: 'Gold',
        staff: 'Ebony',
        topper: 'skull',
        hair: 'Silver',
        skin: 'Pale',
        eyes: 'Blue'
      },
      leader: 'Proctor Vell',
      shout:
        '"Unlicensed spellwork in the Collegium! I was a Proctor here. I still am. There\'s nobody left to say otherwise."',
      beaten: '"This will go on your record. If anyone ever reads it again."'
    },
    {
      id: 'riverrats',
      map: 'drowned_quarter',
      name: 'the Riverrats',
      mood: 'toll',
      level: 1,
      members: ['archer', 'archer'],
      col: '#58a0d0',
      leader: 'Wet Annet',
      toll: '"Every jetty in the Quarter\'s ours. Coin for the ferryman, love."',
      beaten: '"No hard feelings. The river don\'t keep grudges."'
    },
    {
      id: 'undertow_crew',
      map: 'drowned_quarter',
      name: 'the Undertow Crew',
      mood: 'hostile',
      level: 2,
      members: ['soldier', 'halberdier'],
      col: '#3878c0',
      bandit: {
        name: 'Saltjaw Meg',
        sex: 'f',
        age: 'middle',
        fig: 'mid_woman_8',
        elem: 'water',
        robe: 'Forest',
        trim: 'Copper',
        staff: 'Driftwood',
        topper: 'antlers',
        hair: 'Auburn',
        skin: 'Olive',
        eyes: 'Green'
      },
      leader: 'Saltjaw Meg',
      shout: '"The harbour\'s mine, and everything that washes up in it. Today, that\'s you."',
      beaten: '"Back to the boats! Back! The tide\'ll turn, wizard."'
    },
    {
      id: 'rubble_kings',
      map: 'quarry_ward',
      name: 'the Rubble Kings',
      mood: 'toll',
      level: 1,
      members: ['soldier', 'halberdier'],
      col: '#b89060',
      leader: 'King Dunner',
      toll: '"Every stone in the Ward belongs to the Kings. Even the ones you\'re standing on."',
      beaten: '"Long live the... ow."'
    },
    {
      id: 'deepcut',
      map: 'quarry_ward',
      name: 'the Deepcut',
      mood: 'hostile',
      level: 2,
      members: ['halberdier', 'halberdier', 'soldier'],
      col: '#8a6a40',
      leader: 'Foreman Grall',
      shout: '"Lodestone don\'t dig itself, and neither do graves."',
      beaten: '"Down the shafts! Leave it!"'
    },
    {
      id: 'frostbitten',
      map: 'frostmarket',
      name: 'the Frostbitten',
      mood: 'toll',
      level: 1,
      members: ['soldier', 'archer'],
      col: '#b0e0ff',
      leader: 'Nine-Fingers Hollis',
      toll: '"Market\'s closed, friend. Except to us, and to anyone who pays us."',
      beaten: '"Keep your fingers warm. I didn\'t."'
    },
    {
      id: 'white_ledger',
      map: 'frostmarket',
      name: 'the White Ledger',
      mood: 'hostile',
      level: 2,
      members: ['archer', 'soldier'],
      col: '#e8f4ff',
      bandit: {
        name: 'Ysolde Rime',
        sex: 'f',
        age: 'middle',
        fig: 'mid_woman_7',
        elem: 'ice',
        robe: 'Ash',
        trim: 'Silver',
        staff: 'Silverwood',
        topper: 'feathers',
        hair: 'Blonde',
        skin: 'Pale',
        eyes: 'Grey'
      },
      leader: 'Ysolde Rime',
      shout: '"Every debt in Frostmarket is written down in my hand. Yours is due."',
      beaten: '"The Ledger remembers. So do I."'
    },
    {
      id: 'lantern_guild',
      map: 'gloamside',
      name: 'the Lantern Guild',
      mood: 'toll',
      level: 2,
      members: ['soldier', 'archer', 'halberdier'],
      col: '#e8c060',
      leader: 'Mother Kell',
      toll: '"In Gloamside, light costs. You\'ve been walking in ours."',
      beaten: '"Mind the dark on your way out."'
    },
    {
      id: 'hollow_choir',
      map: 'gloamside',
      name: 'the Hollow Choir',
      mood: 'hostile',
      level: 3,
      members: ['halberdier', 'soldier'],
      col: '#7a4aa0',
      bandit: {
        name: 'Cantor Morrow',
        sex: 'm',
        age: 'middle',
        fig: 'mid_man_8',
        elem: 'dark',
        robe: 'Crimson',
        trim: 'Black',
        staff: 'Bloodwood',
        topper: 'skull',
        hair: 'Silver',
        skin: 'Brown',
        eyes: 'Dark'
      },
      leader: 'Cantor Morrow',
      shout: '"Sing with us. You\'ll have the voice for it soon."',
      beaten: '"The song goes on without us. It always does."'
    }
  ];
  // a crew's fighting weight, for its fights with Echoes off the duel screen: HP times Attack, levelled
  const LV = [
    { hp: 1, atk: 0 },
    { hp: 1.2, atk: 0 },
    { hp: 1.45, atk: 1 },
    { hp: 1.75, atk: 2 }
  ]; // SURVIVAL_LEVELS in js/game.js
  function weight(fighters, key, level, chars) {
    if (chars && chars[key] && !fighters[key]) return (chars[key].hp || 50) * 9; // a hired wizard: worth a lot
    const f = fighters[key];
    if (!f) return 0;
    const L = LV[level || 0];
    return f.hp * L.hp * ((f.phys && f.phys.atk) || 4) + L.atk * f.hp * L.hp;
  }
  // a crew against an Echo group: the crew's chance to win
  function clashOdds(fighters, chars, band, alive, echoFoes) {
    let a =
      alive.reduce((s, k) => s + weight(fighters, k, band.level), 0) +
      (band.wizard ? weight(fighters, band.wizard, 0, chars) : 0);
    let b = echoFoes.reduce((s, [k, lv]) => s + weight(fighters, k, lv), 0);
    return a / (a + b * 1.15); // Echoes fight in their own ground: a slight edge
  }
  // the lone bandit mages who lead rival crews met in rooms ('rogue_<n>'): the same six figures, other colours
  const ROGUES = [
    {
      name: 'A Renegade Mage',
      sex: 'm',
      age: 'middle',
      fig: 'mid_man_7',
      elem: 'fire',
      robe: 'Russet',
      trim: 'Black',
      staff: 'Oak',
      topper: 'blade',
      hair: 'Brown',
      skin: 'Natural',
      eyes: 'Brown'
    },
    {
      name: 'A Hedge-Witch',
      sex: 'f',
      age: 'old',
      fig: 'old_woman_5',
      elem: 'earth',
      robe: 'Ochre',
      trim: 'Copper',
      staff: 'Oak',
      topper: 'antlers',
      hair: 'Silver',
      skin: 'Tan',
      eyes: 'Hazel'
    },
    {
      name: 'A Renegade Mage',
      sex: 'f',
      age: 'middle',
      fig: 'mid_woman_8',
      elem: 'dark',
      robe: 'Black',
      trim: 'Scarlet',
      staff: 'Ebony',
      topper: 'skull',
      hair: 'Black',
      skin: 'Deep',
      eyes: 'Dark'
    },
    {
      name: 'A Hedge-Wizard',
      sex: 'm',
      age: 'old',
      fig: 'old_man_5',
      elem: 'fire',
      robe: 'Crimson',
      trim: 'Gold',
      staff: 'Mahogany',
      topper: 'feathers',
      hair: 'White',
      skin: 'Fair',
      eyes: 'Blue'
    },
    {
      name: 'A Renegade Mage',
      sex: 'f',
      age: 'middle',
      fig: 'mid_woman_7',
      elem: 'lightning',
      robe: 'Rose',
      trim: 'Silver',
      staff: 'Ash',
      topper: 'blade',
      hair: 'Copper',
      skin: 'Brown',
      eyes: 'Amber'
    },
    {
      name: 'A Renegade Mage',
      sex: 'm',
      age: 'middle',
      fig: 'mid_man_8',
      elem: 'ice',
      robe: 'Teal',
      trim: 'Bone',
      staff: 'Silverwood',
      topper: 'antlers',
      hair: 'Silver',
      skin: 'Olive',
      eyes: 'Grey'
    }
  ];
  const api = { BANDS, BAND_RULES, ROGUES, clashOdds, weight };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ExploreBands = api;
})(typeof window !== 'undefined' ? window : globalThis);
