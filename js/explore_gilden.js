// ═══════════════════════════════════════════════════════════════════════
// GILDEN: Albra's merchant city (maps/gilden.json, tools/mapgen/gilden.js; design in docs/gilden-design.md).
// Three great houses at each other's throats (Ashcombe: the Ore Road; Varenne: the fleet; Quarrender: the
// banks and the gnome airships), each with a powerful house wizard (a roster wizard) and lesser hired mages,
// and a fourth, fallen house: Thessaly's Vellacourts.
// What's built (step 1):
// - standing with each house (quests.gilden.st, -10..10, TIERS), shown by the fishwife and in the journal;
// - caravan charters at the Charterhouse: escort a house's wagons up the Ore Road and back. Each leg can be
//   ambushed; a house that dislikes you pays the bandits (and at Enemy, sends a hired mage with them). A job
//   for one house raises it and lowers the others (its rival most);
// - an Enemy house's bravos jump you in Gilden's streets, at most once a day;
// - gifts to mend a house's opinion of you (up to neutral);
// - the Narrows Office (ships) and the Sky Office (gnome airships) quote passage: the Mainland isn't built
//   yet, so nothing sails;
// - Thessaly at her chained gate, with her two bodyguards: her story's opening (the quest itself is open).
// Hooked into js/explore_folk.js like Elfhome: knows, title, sprite, face, talk, inspect, absent; plus prep
// (paints the house heads and hired mages), onMap and journal.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // the placeholder registry (js/placeholders.js); a do-nothing stand-in if it isn't loaded
  const PH = () =>
    window.Placeholders || {
      probe: async () => {},
      real: () => null,
      realFace: () => null,
      standing: () => false
    };

  // ── the houses ──
  // rival: the house whose trade it fights hardest for (a job for X lowers rival-of-X most)
  const HOUSES = {
    ashcombe: {
      name: 'House Ashcombe',
      short: 'Ashcombe',
      head: 'gd_ashcombe',
      magus: 'frederick',
      mark: 'a flame over a hammer',
      trade: 'copper, tin and quintessence down the Ore Road',
      rival: 'varenne',
      colour: 'red',
      hire: {
        name: 'Ashcombe Hireling',
        sex: 'm',
        age: 'middle',
        fig: 'mid_man_3',
        elem: 'fire',
        robe: 'Crimson',
        trim: 'Copper',
        staff: 'Bloodwood',
        topper: 'crystal',
        hair: 'Black',
        skin: 'Tan',
        eyes: 'Brown'
      }
    },
    varenne: {
      name: 'House Varenne',
      short: 'Varenne',
      head: 'gd_varenne',
      magus: 'mal',
      mark: 'a silver anchor',
      trade: 'the fleet, the sea-toll and the southern run',
      rival: 'quarrender',
      colour: 'blue',
      hire: {
        name: 'Varenne Hireling',
        sex: 'f',
        age: 'young',
        fig: 'young_woman_3',
        elem: 'water',
        robe: 'Teal',
        trim: 'Silver',
        staff: 'Driftwood',
        topper: 'hoop',
        hair: 'Auburn',
        skin: 'Fair',
        eyes: 'Grey'
      }
    },
    quarrender: {
      name: 'House Quarrender',
      short: 'Quarrender',
      head: 'gd_quarrender',
      magus: 'korvath',
      mark: 'a winged scale',
      trade: 'banking, and the gnome airships',
      rival: 'ashcombe',
      colour: 'purple',
      hire: {
        name: 'Quarrender Hireling',
        sex: 'm',
        age: 'young',
        fig: 'young_man_2',
        elem: 'air',
        robe: 'Violet',
        trim: 'Gold',
        staff: 'Silverwood',
        topper: 'crescent',
        hair: 'Blonde',
        skin: 'Pale',
        eyes: 'Blue'
      }
    }
  };
  const HKEYS = Object.keys(HOUSES);
  const hireKey = h => 'gd_hire_' + h;

  // standing: -10..10
  const TIERS = [
    [-6, 'Enemy', 'their bravos will come for you in the streets, and they pay bandits to hit your caravans'],
    [-3, 'Cold', "they won't hire you, and they pay bandits to hit your caravans"],
    [3, 'Neutral', 'business is business'],
    [6, 'Trusted', 'they offer you their better-paid runs'],
    [11, 'Favoured', 'their house wizard may ride with your caravan']
  ];
  const tierOf = v => (v <= -6 ? 0 : v <= -3 ? 1 : v < 3 ? 2 : v < 6 ? 3 : 4);
  const TIER_NAME = v => TIERS[tierOf(v)][1];

  // ── charters: the numbers ──
  const CHARTER = {
    routes: {
      chepstead: {
        name: 'the Chepstead run',
        legs: [
          ['the Ore Road north to Chepstead', 10 * 60],
          ['the Ore Road home from Chepstead', 10 * 60]
        ],
        stops: ['Chepstead'],
        pay: 22
      },
      hollowmere: {
        name: 'the Hollowmere run',
        legs: [
          ['the Ore Road north to Chepstead', 10 * 60],
          ['the Ore Road on to Hollowmere', 10 * 60],
          ['the Ore Road back down to Chepstead', 10 * 60],
          ['the Ore Road home to Gilden', 10 * 60]
        ],
        stops: ['Chepstead', 'Hollowmere', 'Chepstead'],
        pay: 44
      }
    },
    perDanger: 9, // gold a point of danger
    trustedBonus: 1.25, // pay at Trusted and above
    ambush: 0.22, // base chance a leg is ambushed
    ambushPerDanger: 0.1,
    sponsorCold: 0.12, // each Cold house adds this
    sponsorEnemy: 0.22, // each Enemy house adds this
    ambushCap: 0.8,
    gain: 2, // standing with the house you rode for
    rivalLoss: 2, // with that house's rival
    otherLoss: 1, // with the third
    failLoss: 2, // with your employer, if the cargo is lost
    bravoMs: 12 * 60 * 1000, // real time between an Enemy house's attacks in town (like the warbands' timers)
    offerMs: 15 * 60 * 1000, // the board is reposted this often, and after every run
    giftGold: 20 // a gift mends one point, up to neutral
  };
  const CARGO = {
    ashcombe: [
      'salt and silver for the mining towns',
      'smelted copper ingots',
      'a sealed quintessence strongbox'
    ],
    varenne: ['bolts of Dominion cloth', 'barrels of southern wine', 'ship-chandlery for Hollowmere'],
    quarrender: ["a banker's chest of coin", 'gnome clockwork in straw', 'letters of credit under seal']
  };

  // ── state (quests.gilden) ──
  function g(api) {
    const s = api.quest('gilden');
    if (!s.st) s.st = { ashcombe: 0, varenne: 0, quarrender: 0 };
    s.done = s.done || 0;
    s.lost = s.lost || 0;
    s.sponsors = s.sponsors || {}; // which houses you've caught paying bandits
    return s;
  }
  const stand = (api, h) => g(api).st[h] || 0;
  function shift(api, h, d) {
    const s = g(api);
    s.st[h] = Math.max(-10, Math.min(10, (s.st[h] || 0) + d));
    return s.st[h];
  }

  // ── people ──
  const PEOPLE = {
    gd_charter: {
      name: 'Ezra Pollock',
      title: 'Master of the Charterhouse',
      look: {
        name: 'Ezra',
        sex: 'm',
        age: 'old',
        fig: 'old_man_3',
        robe: 'Russet',
        trim: 'Bone',
        hair: 'Silver',
        skin: 'Natural',
        eyes: 'Grey',
        elem: 'earth',
        staff: 'Oak',
        topper: ''
      }
    },
    gd_ashcombe: {
      name: 'Dame Constance Ashcombe',
      title: 'Head of House Ashcombe',
      house: 'ashcombe',
      look: {
        name: 'Constance',
        sex: 'f',
        age: 'old',
        fig: 'old_woman_3',
        robe: 'Crimson',
        trim: 'Gold',
        hair: 'White',
        skin: 'Fair',
        eyes: 'Hazel',
        elem: 'fire',
        staff: 'Mahogany',
        topper: 'crystal'
      }
    },
    gd_varenne: {
      name: 'Gaspard Varenne',
      title: 'Head of House Varenne',
      house: 'varenne',
      look: {
        name: 'Gaspard',
        sex: 'm',
        age: 'middle',
        fig: 'mid_man_5',
        robe: 'Midnight',
        trim: 'Silver',
        hair: 'Black',
        skin: 'Olive',
        eyes: 'Dark',
        elem: 'water',
        staff: 'Ebony',
        topper: 'hoop'
      }
    },
    gd_quarrender: {
      name: 'Perpetua Quarrender',
      title: 'Head of House Quarrender',
      house: 'quarrender',
      look: {
        name: 'Perpetua',
        sex: 'f',
        age: 'middle',
        fig: 'mid_woman_4',
        robe: 'Violet',
        trim: 'Gold',
        hair: 'Auburn',
        skin: 'Brown',
        eyes: 'Amber',
        elem: 'arcane',
        staff: 'Silverwood',
        topper: 'crescent'
      }
    },
    gd_ashmagus: { roster: 'frederick', house: 'ashcombe', title: 'House Wizard to Ashcombe' },
    gd_varmagus: { roster: 'mal', house: 'varenne', title: 'House Wizard to Varenne' },
    gd_quarmagus: { roster: 'korvath', house: 'quarrender', title: 'On the Board of Quarrender' },
    thessaly: { roster: 'thessaly', title: 'The Last of the Vellacourts' },
    gd_guard1: { fighter: 'halberdier', name: 'Brask', title: "Thessaly's Bodyguard" },
    gd_guard2: { fighter: 'halberdier', name: 'Oddny', title: "Thessaly's Bodyguard" },
    gd_harbour: {
      name: 'Captain Morwen Hask',
      title: 'Harbourmaster of Gilden',
      look: {
        name: 'Morwen',
        sex: 'f',
        age: 'old',
        fig: 'old_woman_5',
        robe: 'Teal',
        trim: 'Bone',
        hair: 'Silver',
        skin: 'Tan',
        eyes: 'Blue',
        elem: 'water',
        staff: 'Driftwood',
        topper: ''
      }
    },
    gd_sky: {
      name: 'Tibbet Quillaby',
      title: 'Clerk of the Sky Office (a gnome of Gimbaldry)',
      // a dwarf figure stands in for the gnome until gnome art (docs/art-prompts.md); drawn small (map npc scale)
      look: {
        name: 'Tibbet',
        sex: 'm',
        age: 'young',
        race: 'dwarf',
        fig: 'dwarf_young_man_1',
        robe: 'Violet',
        trim: 'Sky',
        hair: 'Copper',
        skin: 'Fair',
        eyes: 'Green',
        elem: 'air',
        staff: 'Ash',
        topper: 'hoop'
      }
    },
    gd_fishwife: {
      name: 'Mag Thrush',
      title: 'A Fishwife',
      look: {
        name: 'Mag',
        sex: 'f',
        age: 'middle',
        fig: 'mid_woman_6',
        robe: 'Ochre',
        trim: 'Copper',
        hair: 'Copper',
        skin: 'Fair',
        eyes: 'Green',
        elem: 'water',
        staff: 'Driftwood',
        topper: ''
      }
    }
  };

  function knows(role) {
    return !!PEOPLE[role];
  }
  function title(n, api) {
    const P = PEOPLE[n.role];
    if (!P) return null;
    if (P.roster) {
      const c = api && api.chars[P.roster];
      const nm = c ? c.name.charAt(0) + c.name.slice(1).toLowerCase() : P.roster;
      return P.title + ' (' + nm + ')';
    }
    return P.title + ' (' + P.name + ')';
  }
  function sprite(n, api) {
    const P = PEOPLE[n.role];
    if (!P) return null;
    if (P.roster) {
      const c = api.chars[P.roster];
      return (c && c.sprite) || null;
    }
    if (P.fighter) return PH().real(n.role) || (api.fighters[P.fighter] || {}).sprite || null;
    return P._sprite || null;
  }
  function face(n) {
    const P = PEOPLE[n.role];
    if (!P) return null;
    if (P.roster) return 'portraits/small/' + P.roster + '.jpg';
    if (P.fighter) return PH().realFace(n.role) || 'portraits/small/' + P.fighter + '.jpg';
    return P._face || null;
  }
  // still a stand-in? (js/placeholders.js: the real art goes to the file it names; the roster's are real)
  function placeholder(n) {
    return !!PEOPLE[n.role] && PH().standing(n.role);
  }
  // a roster wizard isn't here if you're playing them
  function absent(n, api) {
    const P = PEOPLE[n.role];
    return !!(P && P.roster && api.wizKey() === P.roster);
  }

  // paint the people and register the houses' hired mages before Gilden's first draw
  // Every stand-in here is listed in js/placeholders.js under its role's id; when the real file is at the
  // path it names, it's used instead of the painted look (and the face crop likewise).
  async function prep(api) {
    await PH().probe(Object.keys(PEOPLE).concat(HKEYS.map(hireKey), ['arena_gilden']));
    const jobs = Object.entries(PEOPLE)
      .filter(([, P]) => P.look && !P._sprite)
      .map(async ([role, P]) => {
        const real = PH().real(role),
          realFace = PH().realFace(role);
        if (real && realFace) {
          P._sprite = real;
          P._face = realFace;
          return;
        }
        try {
          const d = await api.heroDef(P.look);
          if (d) {
            P._sprite = real || d.sprite;
            P._face = realFace || d.face;
          }
        } catch (e) {}
      });
    for (const h of HKEYS)
      if (!api.chars[hireKey(h)])
        jobs.push(
          (async () => {
            try {
              const H = HOUSES[h],
                d = await api.heroDef(H.hire);
              if (d)
                api.registerChar(
                  hireKey(h),
                  Object.assign(
                    {},
                    d,
                    PH().real(hireKey(h)) ? { sprite: PH().real(hireKey(h)) } : {},
                    PH().realFace(hireKey(h)) ? { face: PH().realFace(hireKey(h)) } : {},
                    {
                      name: H.hire.name.toUpperCase(),
                      title: 'Hired Mage of ' + H.name,
                      hp: 52,
                      phys: { atk: 4 },
                      hero: false,
                      bandit: true,
                      arena: 'road'
                    }
                  )
                );
            } catch (e) {}
          })()
        );
    await Promise.all(jobs);
  }

  // ── talking ──
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function standLine(api, h) {
    const v = stand(api, h);
    return HOUSES[h].short + ': ' + TIER_NAME(v) + ' (' + (v > 0 ? '+' : '') + v + ')';
  }
  function talk(n, api) {
    const P = PEOPLE[n.role],
      me = api.wizName();
    const say = (x, ch) => api.dialog(title(n, api), x, ch || []);
    if (P.house && !P.roster) return headTalk(n, api, P.house);
    if (P.roster && P.house) return magusTalk(n, api, P.house);
    switch (n.role) {
      case 'gd_charter':
        return charterTalk(n, api);
      case 'thessaly':
        return thessalyTalk(n, api);
      case 'gd_guard1':
        return say(
          'A broad Varg in a hired sash, halberd grounded, eyes on the street and not on you. "Brask. I watch the lady\'s left. Oddny watches her right. Nobody watches her back, because nobody gets behind her." He jerks his chin at the chained gate. "Paid to the end of the month. After that, we\'ll see."'
        );
      case 'gd_guard2':
        return say(
          'A woman in a battered breastplate, a halberd over her shoulder. "Oddny. I\'ve guarded richer people. I\'ve never guarded anyone who knew what every man on this street had in his pockets." She almost smiles. "Including you."'
        );
      case 'gd_harbour':
        return harbourTalk(n, api);
      case 'gd_sky':
        return skyTalk(n, api);
      case 'gd_fishwife':
        return fishwifeTalk(n, api);
    }
    say('"' + me + '." A nod.');
  }

  function headTalk(n, api, h) {
    const H = HOUSES[h],
      v = stand(api, h),
      t = tierOf(v),
      gold = api.gold();
    const say = (x, ch) => api.dialog(title(n, api), x, ch || []);
    const intro = {
      ashcombe:
        'A small, upright old woman in red, with copper dust in the creases of her gloves. "Ashcombe. We bring the mountain down to the sea: copper, tin, and since the Unweaving, Corvanthe itself, a crystal at a time. Varenne wants a toll on every cart that reaches the quay. Quarrender wants to bank the lot. Neither of them has ever loaded a wagon."',
      varenne:
        'A sleek man in midnight blue, a silver anchor at his throat. "Varenne. Half the ships in that harbour are mine and the other half wish they were. I pay the Varg every spring so that Gilden sleeps at night, and Quarrender thinks gnome balloons will make the sea unnecessary." He smiles. "The sea has opinions about that."',
      quarrender:
        'A woman in violet counting something on her fingers that she does not explain. "Quarrender. We\'re the new money, and the only house honest enough to say so. The gnomes moor on our hill, the other houses bank with us whether they like it or not, and Ashcombe still thinks a wagon is the height of invention."'
    }[h];
    const mood = [
      ' "You have a nerve, walking up my drive. My people know your face. So do some people who are not my people."',
      " \"I know your name, wizard, and I don't like what's written next to it. The Charterhouse won't give you my wagons.\"",
      ' "The Charterhouse posts our runs. Ride one well and I\'ll remember it."',
      ' "You\'ve done well by us. The better runs are yours, when they come up."',
      ' "You\'re one of ours now, as far as this street is concerned. That has a price, as well as a value."'
    ][t];
    const ch = [];
    if (v < 0)
      ch.push({
        label: '🎁 A gift, to mend things (' + CHARTER.giftGold + ' gold)',
        disabled: gold < CHARTER.giftGold,
        fn: () => {
          api.addGold(-CHARTER.giftGold);
          shift(api, h, 1);
          api.save();
          api.toast(H.name + ' accepts your gift. (' + standLine(api, h) + ')');
        }
      });
    ch.push({ label: '🏛 The houses of Gilden', fn: () => housesExplain(n, api) }, { label: 'Good day' });
    say(intro + mood, ch);
  }

  function magusTalk(n, api, h) {
    const H = HOUSES[h],
      v = stand(api, h);
    const say = (x, ch) => api.dialog(title(n, api), x, ch || []);
    const line = {
      ashcombe: [
        'Frederick the Black looks at you the way a furnace looks at ore. "Ashcombe pays me to keep its wagons whole. Bandits on the Ore Road have learned what that costs them." His fingers smoke. "So have one or two people who hired them."',
        'Frederick the Black doesn\'t look at you at all. "Dame Constance has mentioned your name. Twice. I am hoping for a third time, wizard, because the third time she won\'t be asking me to wait."'
      ],
      varenne: [
        'Malachar leans on his staff like a man at a graveside. "Varenne hired me for the sea-toll: someone has to stand on the deck when the Varg come for their money, and look as if he might not hand it over." His eyes are very still. "They always take the money."',
        'Malachar smiles, which is worse. "Gaspard keeps a list. I keep a shorter one. You\'re on both, wizard."'
      ],
      quarrender: [
        'A half-dragon noble in Wyrmreach silks, scaled and patient. "Korvath, of the Ember Throne. I bought a seat on the Quarrender board with my own gold, because the gnome sky-roads are the future, and I like to own the future before it arrives." He looks you over. "Wizards are an investment too."',
        'Korvath doesn\'t turn his head. "In Wyrmreach, wizard, we would have settled this already. Perpetua prefers ledgers. I am being patient. I am very rarely patient for long."'
      ]
    }[h];
    say(line[v <= -3 ? 1 : 0]);
  }

  function housesExplain(n, api) {
    const s = g(api);
    api.dialog(
      'The Houses of Gilden',
      HKEYS.map(
        h =>
          '• ' +
          HOUSES[h].name +
          ' (' +
          HOUSES[h].mark +
          '): ' +
          HOUSES[h].trade +
          '. Feuds hardest with ' +
          HOUSES[HOUSES[h].rival].short +
          '. You stand ' +
          TIER_NAME(stand(api, h)) +
          ' with them.'
      ).join('\n\n') +
        '\n\nRide a charter for one house and it thinks better of you; the others think worse, its rival most of all. A house that thinks little enough of you pays the bandits on the Ore Road to hit your caravans, and a house that hates you sends its own people.' +
        (Object.keys(s.sponsors).length
          ? '\n\nYou have caught ' +
            Object.keys(s.sponsors)
              .map(h => HOUSES[h].short)
              .join(' and ') +
            ' paying bandits.'
          : '')
    );
  }

  // ── the Charterhouse ──
  function offers(api) {
    const s = g(api),
      now = Date.now();
    if (s.offers && s.offerAt && now - s.offerAt < CHARTER.offerMs) return s.offers;
    s.offerAt = now;
    s.offers = [];
    const R = () => Math.random();
    for (const h of HKEYS) {
      if (stand(api, h) <= -3) continue;
      const route = R() < 0.55 ? 'chepstead' : 'hollowmere',
        danger = 1 + Math.floor(R() * 3),
        trusted = stand(api, h) >= 3;
      const cargo = CARGO[h][Math.floor(R() * CARGO[h].length)];
      let pay = CHARTER.routes[route].pay + danger * CHARTER.perDanger;
      if (/quintessence|coin|credit/.test(cargo)) pay += 6;
      if (trusted) pay = Math.round(pay * CHARTER.trustedBonus);
      s.offers.push({ id: h + now, house: h, route, danger, cargo, pay, taken: false });
    }
    return s.offers;
  }
  function ambushOdds(api, o) {
    let p = CHARTER.ambush + CHARTER.ambushPerDanger * o.danger;
    for (const h of HKEYS) {
      if (h === o.house) continue;
      const t = tierOf(stand(api, h));
      if (t === 0) p += CHARTER.sponsorEnemy;
      else if (t === 1) p += CHARTER.sponsorCold;
    }
    return Math.min(CHARTER.ambushCap, p);
  }
  function charterTalk(n, api) {
    const s = g(api),
      list = offers(api).filter(o => !o.taken);
    const say = (x, ch) => api.dialog(title(n, api), x, ch || []);
    const intro =
      'A grey man with a ledger the size of a door, chained to his wrist. "Pollock. The Charterhouse. Every house that sends a wagon up the Ore Road hires its escort through me, and pays me to remember who rode for whom." He licks a thumb and turns a page. "' +
      (s.done
        ? s.done +
          (s.done === 1 ? ' run' : ' runs') +
          ' on your page, wizard' +
          (s.lost ? ', ' + s.lost + ' cargo lost' : '') +
          '.'
        : "Your page is empty. Let's fill it.") +
      '"';
    const ch = list.map(o => ({
      label:
        '🐎 ' +
        HOUSES[o.house].short +
        ': ' +
        CHARTER.routes[o.route].name +
        ', ' +
        o.pay +
        ' gold' +
        ' ' +
        '⚔'.repeat(o.danger),
      fn: () => offerDetail(n, api, o)
    }));
    const cold = HKEYS.filter(h => stand(api, h) <= -3);
    say(
      intro +
        (list.length
          ? "\n\nToday's charters (⚔ = how bad the road is):"
          : '\n\n"Nothing for you today. Come back tomorrow."') +
        (cold.length
          ? '\n\n"' +
            cold.map(h => HOUSES[h].short).join(' and ') +
            (cold.length > 1 ? " won't" : " won't") +
            ' have you on their wagons."'
          : ''),
      ch.concat([{ label: '📒 How charters work', fn: () => charterHelp(n, api) }, { label: 'Not today' }])
    );
  }
  function charterHelp(n, api) {
    api.dialog(
      title(n, api),
      '"You ride with the wagons there and back. You sleep where they sleep. If bandits come, you fight beside the house\'s guards, and if you lose, the cargo\'s gone and so is your pay."\n\n"Every house has enemies, and every house knows a bandit who\'ll take its silver. Ride for Ashcombe and Varenne hears about it; ride for Varenne and Quarrender does. A house that thinks badly enough of you will pay to have your caravan hit. One that hates you will send its own people, on the road or in the street."\n\n"A bigger road pays more. So does a meaner one."',
      [{ label: 'Back to the board', fn: () => charterTalk(n, api) }]
    );
  }
  function offerDetail(n, api, o) {
    const H = HOUSES[o.house],
      R = CHARTER.routes[o.route];
    const odds = Math.round(ambushOdds(api, o) * 100);
    api.dialog(
      title(n, api),
      'Pollock reads it off the board. "' +
        H.name +
        ', ' +
        R.name +
        ': ' +
        o.cargo +
        '. ' +
        R.legs.length +
        ' days on the road, ' +
        (R.stops.length > 1 ? 'nights at ' + R.stops.join(', ') : 'a night at ' + R.stops[0]) +
        '. ' +
        o.pay +
        ' gold when the wagons are home." He taps the margin. "' +
        (odds >= 60
          ? "I'd say it'll be hit. More than once, maybe."
          : odds >= 40
            ? 'Even odds you meet someone on the road.'
            : "A quiet road, if you're lucky.") +
        '"\n\nRiding for ' +
        H.short +
        ' raises them ' +
        CHARTER.gain +
        ', lowers ' +
        HOUSES[H.rival].short +
        ' ' +
        CHARTER.rivalLoss +
        ' and ' +
        HOUSES[HKEYS.find(k => k !== o.house && k !== H.rival)].short +
        ' ' +
        CHARTER.otherLoss +
        '.',
      [
        { label: '✅ Take the charter (leaves at dawn)', fn: () => startCharter(api, o) },
        { label: 'Back to the board', fn: () => charterTalk(n, api) }
      ]
    );
  }

  // a bandit gang for a leg: scaled by the road's danger and how far into the run; a sponsor house
  // (the angriest house that isn't your employer) pays them, and at Enemy sends its hired mage, or its
  // house wizard at -8 or worse
  function ambushFor(api, o, legIdx) {
    const lvl = Math.min(3, Math.max(0, o.danger - 1 + (legIdx >= 2 ? 1 : 0)));
    const rivals = HKEYS.filter(h => h !== o.house)
      .map(h => [h, stand(api, h)])
      .sort((a, b) => a[1] - b[1]);
    const angry = rivals[0][1] <= -3 ? rivals[0][0] : null;
    const pool = ['soldier', 'archer', 'halberdier'];
    const n = o.danger >= 3 || angry ? 3 : 2;
    const foes = [];
    let wizard = null;
    if (angry && stand(api, angry) <= -6) {
      wizard =
        stand(api, angry) <= -8 && api.chars[HOUSES[angry].magus] && api.wizKey() !== HOUSES[angry].magus
          ? HOUSES[angry].magus
          : api.chars[hireKey(angry)]
            ? hireKey(angry)
            : null;
      if (wizard) foes.push({ key: wizard, wizard: true });
    }
    while (foes.length < n) {
      const k = pool[Math.floor(Math.random() * pool.length)];
      foes.push({ key: k, level: lvl, name: 'Road Bandit' });
    }
    // the caravan's guards fight beside you in whatever seats are left (4 in all)
    const allies = [];
    if (foes.length < 3) allies.push({ key: 'soldier', level: Math.max(0, lvl - 1), name: H_GUARD(o.house) });
    // a Favoured house's own wizard rides with you, once a run
    if (
      stand(api, o.house) >= 6 &&
      foes.length < 3 &&
      !o.magusRode &&
      api.wizKey() !== HOUSES[o.house].magus
    ) {
      o.magusRode = true;
      allies.length = 0;
      allies.push({ key: HOUSES[o.house].magus, wizard: true });
    }
    return { foes, allies, angry, wizard };
  }
  const H_GUARD = h => HOUSES[h].short + ' Guard';

  function startCharter(api, o) {
    const s = g(api);
    o.taken = true;
    s.run = {
      id: o.id,
      house: o.house,
      route: o.route,
      danger: o.danger,
      pay: o.pay,
      cargo: o.cargo,
      leg: 0
    };
    api.save();
    if (api.sleep) api.sleep(0.6);
    api.setClock(6 * 60); // the wagons roll at dawn
    const t = '06:00';
    api.dialog(
      'The Caravan Leaves',
      'You sleep in the Charterhouse loft' +
        (t ? ' and wake at ' + t : '') +
        '. In the grey before dawn the wagons roll out under the Ore Gate: ' +
        o.cargo +
        ', ' +
        HOUSES[o.house].mark +
        ' painted on every tailboard, one of ' +
        HOUSES[o.house].short +
        "'s guards on the box of the first one, and you.",
      [{ label: '🐎 On the road', fn: () => runLeg(api) }]
    );
  }
  function runLeg(api) {
    const s = g(api),
      r = s.run;
    if (!r) return;
    const R = CHARTER.routes[r.route];
    if (r.leg >= R.legs.length) return finishCharter(api, true);
    const [where, mins] = R.legs[r.leg];
    const o = { house: r.house, danger: r.danger, magusRode: r.magusRode };
    const hit = Math.random() < ambushOdds(api, o);
    api.passTime(Math.round(mins / 2));
    const arrive = () => {
      api.passTime(Math.round(mins / 2));
      r.leg++;
      if (r.leg >= R.legs.length) return finishCharter(api, true);
      const stop = R.stops[r.leg - 1];
      const t = api.sleep ? api.sleep(0.6) : null;
      api.save();
      api.dialog(
        stop,
        'The wagons pull into ' +
          stop +
          ' at dusk. ' +
          (stop === 'Hollowmere'
            ? 'The cargo is unloaded at the market, Master Orme counts it twice, and the return load goes on.'
            : 'The Wheatsheaf puts you in the hayloft over the carters, which is warm, and loud.') +
          ' You sleep' +
          (t ? ' and wake at ' + t : '') +
          '.',
        [{ label: '🐎 On the road', fn: () => runLeg(api) }]
      );
    };
    if (!hit) {
      api.dialog(cap(where), P_QUIET[Math.floor(Math.random() * P_QUIET.length)], [
        { label: 'Ride on', fn: arrive }
      ]);
      return;
    }
    const A = ambushFor(api, o, r.leg);
    r.magusRode = o.magusRode;
    const by = A.wizard && A.angry ? HOUSES[A.angry] : null;
    api.dialog(
      'Ambush!',
      P_AMBUSH[Math.floor(Math.random() * P_AMBUSH.length)] +
        (by
          ? ' Among them, a mage in ' +
            by.colour +
            ', not even troubling to hide the house mark on the clasp: ' +
            by.mark +
            '.'
          : '') +
        (A.allies.some(a => a.wizard)
          ? ' ' +
            cap(api.chars[A.allies[0].key].name.toLowerCase()) +
            ', riding with the caravan, steps down beside you.'
          : ''),
      [
        {
          label: '⚔ Defend the wagons',
          fn: () =>
            api.battle({
              foes: A.foes,
              allies: A.allies,
              arena: 'road',
              text: {
                win: 'The bandits break and run. The wagons roll on.',
                lose: 'The wagons are gone, and the cargo with them.'
              },
              onWin: () => {
                const loot = 3 + Math.floor(Math.random() * 6) * r.danger;
                api.addGold(loot);
                if (A.angry) g(api).sponsors[A.angry] = true;
                api.save();
                api.dialog(
                  'After the Fight',
                  "You go through the bandits' pockets: " +
                    loot +
                    ' gold' +
                    (A.angry
                      ? ', and a purse of new coin stamped with ' +
                        HOUSES[A.angry].mark +
                        '. ' +
                        HOUSES[A.angry].name +
                        ' paid for this.'
                      : ', and nothing to say who sent them.'),
                  [{ label: 'Ride on', fn: arrive }]
                );
              },
              onLose: () => finishCharter(api, false)
            })
        }
      ]
    );
  }
  const P_QUIET = [
    'A long day on the Ore Road: dust, oxen, a carter who sings the same verse over and over. Nobody comes out of the hedges.',
    'Rain all morning, the wagons in mud to the axles twice, and not a soul on the road but a pedlar going the other way.',
    'Riders on the skyline at noon, watching. They count the guards, and you, and turn away.',
    'A broken bridge, a two-hour detour by the ford, a lost wheel. Annoying. Not dangerous.'
  ];
  const P_AMBUSH = [
    'A tree across the road, and men coming out of the ditches on both sides.',
    'Arrows from the hedge. The lead ox goes down, the wagons jam, and the bandits come over the bank.',
    'At the ford, with the wagons half across, they come out of the reeds.',
    "A 'toll-gate' that wasn't there last week, and the toll-keepers have swords."
  ];
  function finishCharter(api, ok) {
    const s = g(api),
      r = s.run;
    if (!r) return;
    s.run = null;
    s.offerAt = 0; // a new board when you're back
    const H = HOUSES[r.house];
    const third = HKEYS.find(k => k !== r.house && k !== H.rival);
    if (ok) {
      api.addGold(r.pay);
      s.done++;
      shift(api, r.house, CHARTER.gain);
      shift(api, H.rival, -CHARTER.rivalLoss);
      shift(api, third, -CHARTER.otherLoss);
    } else {
      s.lost++;
      shift(api, r.house, -CHARTER.failLoss);
    }
    if (api.mapId() !== 'gilden') api.enterMap('gilden', 'charter');
    else {
      const sp = api.room().spawns && api.room().spawns.charter;
      if (sp) api.walkTo(sp[0], sp[1]);
    }
    api.save();
    api.dialog(
      ok ? 'Home Through the Ore Gate' : 'The Cargo Is Lost',
      ok
        ? 'The wagons roll in under the Ore Gate at dusk. Pollock counts the crates, signs your page and pays you: ' +
            r.pay +
            ' gold.\n\n' +
            HKEYS.map(h => standLine(api, h)).join('\n')
        : 'You come round in a ditch, the wagons gone. A carter finds you and brings you home to Gilden in the back of a turnip cart. ' +
            H.name +
            ' will hear of it before you reach the Ore Gate.\n\n' +
            standLine(api, r.house),
      []
    );
  }

  // ── passage: by sea, and by air ──
  const SAILINGS = [
    ['Halemouth, Hallowmark', 2, 40, 'magic is banned: they search the baggage'],
    ['Brassmouth, the Brazen Dominion', 5, 70, 'they draft wizards there, mind'],
    ['the Reaver Isles', 4, 90, 'the Varg sea-toll covers Varenne ships only']
  ];
  const FLIGHTS = [
    ['Varrow, over the Greatspine', 2, 250],
    ['Gimbal, Gimbaldry', 4, 400]
  ];
  function harbourTalk(n, api) {
    const v = stand(api, 'varenne'),
      off = v >= 3 ? 0.8 : v <= -3 ? 1.5 : 1;
    api.dialog(
      title(n, api),
      'A weathered woman with a spyglass and a slate of tides. "Hask, Harbourmaster. The quay is the city\'s, whatever the houses think; the ships are mostly Varenne\'s, and they set the prices." She runs a finger down the slate. "Passage south, on the next tide that suits:"\n\n' +
        SAILINGS.map(
          ([to, days, price, note]) =>
            '• ' + to + ': ' + days + ' days, ' + Math.round(price * off) + ' gold (' + note + ')'
        ).join('\n') +
        (off !== 1
          ? '\n\n' +
            (off < 1
              ? '"Varenne\'s friends sail cheaper."'
              : '"Varenne\'s ships charge their enemies double. Near enough."')
          : '') +
        "\n\n(The Mainland isn't built yet: nothing sails for now.)",
      SAILINGS.map(([to, , price]) => ({
        label: '⛵ ' + to + ' (' + Math.round(price * off) + ' gold)',
        disabled: true
      })).concat([{ label: 'Not today' }])
    );
  }
  function skyTalk(n, api) {
    const v = stand(api, 'quarrender'),
      off = v >= 6 ? 0.8 : v <= -3 ? 1.5 : 1;
    api.dialog(
      title(n, api),
      'A gnome on a tall stool behind a brass counter, goggles pushed up, a pencil behind each ear. "Quillaby, Sky Office, at your service, Quarrender\'s agency, Gimbaldry\'s ships. No further north than here, never over Hallowmark, and the price is the price." He spins a little brass globe. "Next ship due in from Varrow on the east wind."\n\n' +
        FLIGHTS.map(
          ([to, days, price]) => '• ' + to + ': ' + days + ' days aloft, ' + Math.round(price * off) + ' gold'
        ).join('\n') +
        '\n\n"You have ' +
        api.gold() +
        ' gold. ' +
        (api.gold() >= FLIGHTS[0][2] * off ? "That's a ticket!" : 'Keep saving.') +
        '"\n\n(The Mainland isn\'t built yet: no ship flies for now.)',
      FLIGHTS.map(([to, , price]) => ({
        label: '🎈 ' + to + ' (' + Math.round(price * off) + ' gold)',
        disabled: true
      })).concat([{ label: 'Not today' }])
    );
  }
  // the fishwife hears everything said on the quay: how the houses think of you, and who paid the bandits
  function fishwifeTalk(n, api) {
    const s = g(api);
    const worst = HKEYS.slice().sort((a, b) => stand(api, a) - stand(api, b))[0];
    api.dialog(
      title(n, api),
      'A broad woman gutting herring at a speed that makes you step back. "Thrush. Fish. Gossip\'s free." She points the knife up the hill. "Here\'s how the houses talk about you, dear:"\n\n' +
        HKEYS.map(h => '• ' + standLine(api, h) + ': ' + TIERS[tierOf(stand(api, h))][2] + '.').join('\n') +
        '\n\n' +
        (stand(api, worst) <= -3
          ? '"' +
            HOUSES[worst].short +
            '\'s men have been drinking with bandits at the Salt Purse. Your name came up."'
          : s.done
            ? '"Pollock says you ride a fair escort. That\'ll get round."'
            : '"Nobody knows you yet. Enjoy it."') +
        ' "And the Vellacourt girl\'s still up there at her own gate with her two hired lumps. Proud as a gull."',
      [{ label: 'Thank you' }]
    );
  }

  // ── Thessaly: the last of the Vellacourts. Her quest is open (docs/gilden-design.md, "Thessaly"). ──
  function thessalyTalk(n, api) {
    const s = g(api),
      first = !s.metThess;
    s.metThess = true;
    api.save();
    const ponderMet = !!(api.quest('met') || {}).ponder;
    api.dialog(
      title(n, api),
      (first
        ? 'A young woman in a gold-threaded gown, not a hair out of place, standing outside a chained gate as if she owned it. She does. "Thessaly Vellacourt. Of House Vellacourt, which you won\'t find in the Golden Ledger: somebody cut us out with a razor." She glances at the chain. "Seven years ago we were the fourth great house of Gilden. Then my father\'s ships went down in one night, all of them, and by morning the other three had our debts, our quay and our name. I have kept two things. This gate, and a list."'
        : 'Thessaly is reading a ledger that isn\'t hers, upside down, from across the street. "Still here, wizard? Good."') +
        (s.done && first
          ? ' "You\'ve been riding charters for the houses. I know: I know everything that crosses Pollock\'s ledger. That makes you useful."'
          : '') +
        (ponderMet
          ? ' Her eyes narrow. "You were at Wrenford. Did you meet a boy there called Ponder? He has something of mine. Tell him I\'m coming for it."'
          : ''),
      [
        {
          label: '📜 What happened to your house?',
          fn: () =>
            api.dialog(
              title(n, api),
              '"Every ship we had, one night, in a calm sea. Nobody drowns a whole fleet by accident." She doesn\'t say who. "Ashcombe bought our quay. Varenne bought our ships\' names and sailed new hulls under them. Quarrender bought our debts, which was the cleverest of the three. One of them did it. Possibly all of them. I mean to know which, and then I mean to have it all back." A cool smile. "When you\'ve earned enough of their trust to be let into their counting-rooms, come and see me. I\'ll have work for you."',
              [{ label: 'Good luck' }]
            )
        },
        { label: 'Good day' }
      ]
    );
  }

  // ── on the map ──
  function inspect() {
    return false;
  }
  // an Enemy house's bravos jump you in Gilden, at most once a day
  function onMap(api) {
    if (api.mapId() !== 'gilden') return;
    const s = g(api);
    if (!s.welcomed) {
      s.welcomed = true;
      api.toast('Gilden. The charter board is in the Caravanserai, just inside the Ore Gate.');
    }
    if (s.run) {
      setTimeout(
        () =>
          api.dialog(
            'Your Caravan',
            'The ' + HOUSES[s.run.house].short + ' wagons are waiting for you in the Caravanserai.',
            [{ label: '🐎 On the road', fn: () => runLeg(api) }]
          ),
        900
      );
      return;
    }
    const enemy = HKEYS.filter(h => stand(api, h) <= -6).sort((a, b) => stand(api, a) - stand(api, b))[0];
    if (!enemy || s.run) return;
    const now = Date.now();
    if (s.bravoAt && now - s.bravoAt < CHARTER.bravoMs) return;
    s.bravoAt = now;
    const H = HOUSES[enemy];
    setTimeout(() => {
      api.dialog(
        'Bravos of ' + H.name,
        'Three men in ' +
          H.colour +
          ' sashes step out of an alley and spread across the street. "' +
          H.name +
          ' sends its regards, wizard. You were warned."',
        [
          {
            label: '⚔ Fight',
            fn: () =>
              api.battle({
                foes: [
                  ...(api.chars[hireKey(enemy)] ? [{ key: hireKey(enemy), wizard: true }] : []),
                  { key: 'soldier', level: 1, name: H.short + ' Bravo' },
                  { key: 'soldier', level: 1, name: H.short + ' Bravo' }
                ].slice(0, 3),
                text: {
                  win: 'The bravos limp off to tell ' + H.short + ' what happened.',
                  lose: 'They leave you in the gutter with a bruise in ' + H.colour + '.'
                },
                onWin: () => {
                  api.addGold(8);
                  api.toast("+8 gold from the bravos' purses. " + H.short + ' will not like this.');
                },
                onLose: () => {
                  const t = Math.min(api.gold(), 15);
                  api.addGold(-t);
                  api.toast(H.short + "'s bravos took " + t + ' gold from you.');
                }
              })
          }
        ]
      );
    }, 1600);
  }
  // a line for the satchel's journal
  function journal(api) {
    const s = api.quest('gilden');
    if (!s.st) return '';
    const out = ['Gilden: ' + HKEYS.map(h => standLine(api, h)).join(', ') + '.'];
    if (s.done || s.lost)
      out.push(
        'Charters: ' +
          (s.done || 0) +
          ' run' +
          (s.done === 1 ? '' : 's') +
          (s.lost ? ', ' + s.lost + ' lost' : '') +
          '.'
      );
    if (s.metThess) out.push('Thessaly Vellacourt wants work done once the houses trust you.');
    return out.join(' ');
  }

  window.ExploreGilden = {
    knows,
    title,
    sprite,
    face,
    talk,
    inspect,
    absent,
    placeholder,
    prep,
    onMap,
    journal,
    PEOPLE,
    HOUSES,
    CHARTER,
    // for tests
    _stand: (api, h, v) => (g(api).st[h] = v)
  };
})();
