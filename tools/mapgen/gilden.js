// Gilden: Albra's richest city, on the south-east coast where the Narrows meet the Wolf Sea. The Ore Road
// comes in at the Ore Gate (north-west) through the Caravanserai, where the merchant houses' caravans load
// and the Charterhouse hires escorts; the Hill along the north holds the four great houses' palaces
// (Ashcombe, Vellacourt, Varenne, Quarrender); the Exchange sits in the middle of the city; and the whole south
// half is the Docks: the Ropewalk, the Fish Market, the Customs House, the Long Quay and five piers out
// into the harbour, the Harbour Light on its mole. The Skyport on Beacon Hill (north-east) is the only
// place on Albra where a gnome airship may moor. Design: docs/gilden-design.md. People: js/explore_gilden.js.
// A safe town (no Echoes, rooms hold no fights); the houses' feuds are fought on the roads (charters).
'use strict';
const { MapBuilder, T, P } = require('./builder');
const { City } = require('./city');
// stand-in art (js/placeholders.js): a piece named there is used once it's been cut into an atlas
const PH = require('../../js/placeholders.js');

const COLS = 64,
  ROWS = 50;
const QUAY = 37; // the Long Quay's top row; the harbour is below row 39
const SEA = 40;
const PIERS = [
  [4, 6],
  [15, 17],
  [26, 28],
  [41, 43],
  [50, 52]
];

const LORE = {
  // the docks
  quay: [
    'The Long Quay',
    'Half a mile of granite, worn smooth by four hundred years of barrels. Everything Albra sells goes out across these stones, and everything it buys comes in. The gulls know the difference between a full sack and an empty one.'
  ],
  pier: [
    'A Pier',
    'Tarred planks on oak piles, numbered in brass. The houses rent them by the tide. A chalk board at the root says whose ship is in and whose is overdue.'
  ],
  crane: [
    'A Dock Crane',
    'A treadwheel crane: two men walk inside the wheel and a ton of copper rises out of a hold. They are paid by the lift, and they sing.'
  ],
  customs: [
    'The Customs House',
    'Where the city weighs, counts and taxes everything that crosses the quay, and where the four houses send their cleverest clerks to argue about it. Over the door: "THE SEA IS FREE. THE QUAY IS NOT."'
  ],
  harbourLight: [
    'The Harbour Light',
    'The lighthouse on the mole. Its lamp burns whale oil, never a spell: the Varg reavers took it for a signal, once, and the houses have paid them a sea-toll every year since so that it never happens again.'
  ],
  fishmarket: [
    'The Fish Market',
    "Herring, cod, eels by the bucket and a crab the size of a shield that nobody will buy. The fishwives' prices are not negotiable and neither are their opinions."
  ],
  ropewalk: [
    'The Ropewalk',
    "The docks' long street, where rope was once twisted along its whole length. Now it is chandlers, sailmakers, net-menders, dockers' lodgings and taverns, and the rope is made in a shed at the end."
  ],
  cargo: [
    'Cargo',
    'Crates stencilled with house marks: an anchor (Varenne), a flame over a hammer (Ashcombe), a winged scale (Quarrender). Somebody has chalked a fourth mark, a gold coin, on one of them, and somebody else has scrubbed most of it off.'
  ],
  quint: [
    'A Strongbox',
    'Iron-bound, sealed in three places, guarded by a man who will not meet your eye. Quintessence, going south to the Brazen Dominion, where they pay for it in silver and spend it on their war.'
  ],
  nets: [
    'Nets',
    'Drying in the wind. The net-menders sit among them all day with bone needles, and they hear everything said on the quay.'
  ],
  shipyard: [
    "Fettle's Yard",
    "The last shipyard in Gilden that isn't owned by a house: a hull on the slip, half planked, and old Fettle shouting at it. Varenne wants the yard. Fettle wants Varenne in the harbour with a stone tied to him."
  ],
  boats: [
    'Rowing Boats',
    'Lighters and jolly-boats for taking cargo out to the ships too big for the piers. Each house paints its own a different colour, so a boat on the wrong side of the harbour is an argument.'
  ],
  seaGod: [
    'The Old Man of the Narrows',
    'A sea-god nobody prays to any more, except the dockers, and the fishwives, and the captains, and the houses before a big cargo goes out. Coins in the basin at his feet.'
  ],
  saltpurse: [
    'The Salt Purse',
    "The dockers' tavern on the Ropewalk, low-beamed and loud, with beds upstairs for sailors between ships and wizards between jobs. The landlady keeps a cudgel under the bar with each house's mark carved on it, so nobody can say she favours one."
  ],
  shipping: [
    'The Narrows Office',
    'House Varenne\'s shipping office, where passage is sold to the Mainland and beyond. A slate by the door lists the sailings: Halemouth (Hallowmark: no magic aboard), Brassmouth (the Dominion), Varrow, "and further, for a price".'
  ],
  // the middle
  exchange: [
    'The Gilded Exchange',
    'A temple to money, and nobody pretends otherwise: the dome is gilt, the floor is marble, and at noon the four houses send their factors to shout prices at each other under it. Three of the four statues in its niches are of living people. The fourth niche is empty.'
  ],
  exchangeSq: [
    'Exchange Square',
    'The busiest square on Albra: money-changers, notaries, letter-writers, porters with handcarts and pickpockets with handcarts. A clock on a post tells the time to the minute, which is the only honest thing in the square.'
  ],
  guildhall: [
    'The Guildhall',
    "Where Gilden's guilds meet: carters, coopers, chandlers, lightermen, and the newest, the Guild of Hired Wizards, which the houses pretend not to have noticed. Its noticeboard is mostly fines."
  ],
  counting: [
    'Counting-house Row',
    'Narrow fronts, deep cellars, iron shutters. Every house on the row belongs to one of the four houses, or to someone who owes them money, which is the same thing.'
  ],
  well: [
    'A Well',
    'The water is good. The bucket costs a copper. The copper goes to House Ashcombe, who dug it.'
  ],
  lamp: [
    'A Lantern Post',
    'Lit at dusk by the city watch, who are paid by all four houses and trusted by none of them.'
  ],
  // the Hill
  hill: [
    'Hill Street',
    'The street of palaces. Each house has its gate, its gardens and its bravos on the gate; a stranger walking from one end to the other is watched by four different people, and noted in four different ledgers.'
  ],
  ashcombe: [
    'Ashcombe Hall',
    'The seat of House Ashcombe: copper, tin and quintessence, down the Ore Road from the Anvilfells. A flame over a hammer on every banner. Its bravos wear red, and its carters swear by it.'
  ],
  varenne: [
    'Varenne House',
    'The seat of House Varenne, who own the fleet: half the ships in the harbour fly the silver anchor. It is House Varenne that pays the Varg their sea-toll every spring, and House Varenne that never lets anyone forget it.'
  ],
  quarrender: [
    'Quarrender House',
    "The seat of House Quarrender, the newest of the great houses: bankers, and agents to the gnomes of Gimbaldry, whose airships moor on Beacon Hill. A winged scale on the banners. Their money is younger than the others', and they are the only house that doesn't mind saying so."
  ],
  vellacourt: [
    'Vellacourt House',
    'A palace with its banners taken down. The gate is chained, the garden gone to seed, and the gilt on the shutters has been scraped off by somebody with a knife. A gold coin is carved over the door; someone has tried to chisel it out and given up.'
  ],
  garden: [
    'A Palace Garden',
    'Clipped hedges, gravel walks, a fountain with a house mark in the basin. A gardener rakes the gravel smooth behind you as you go.'
  ],
  bravo: [
    'A House Banner',
    "Silk, in the house's colours. In Gilden you can tell who a man works for by the colour of his sash, and who he used to work for by the colour of the bruise."
  ],
  // the Caravanserai
  oregate: [
    'The Ore Gate',
    'Where the Ore Road comes in from Chepstead and Hollowmere, and the Anvilfells beyond. Copper and tin come in, salt, silver and cloth go out, and quintessence comes in sealed, under guard, and never stops moving.'
  ],
  yard: [
    'The Caravanserai',
    "The great yard inside the Ore Gate, where caravans load and unload: wagons, oxen, mules, carters, and the houses' guards counting everything twice. It smells of tar, dung and money."
  ],
  charters: [
    'The Charter Board',
    'Every caravan leaving Gilden posts a charter here: the house, the road, the cargo, the pay. Below them all in red: "BANDITS ON THE ORE ROAD. ESCORTS WANTED. WIZARDS PREFERRED, PAID DOUBLE." Below that, smaller, in another hand: "Ask who hired the bandits."'
  ],
  charterhouse: [
    'The Charterhouse',
    'Where escorts are hired, paid and, now and then, buried. The Master of the Charterhouse keeps a ledger of every wizard who has ridden for every house, and the houses pay him well to read it.'
  ],
  wagons: [
    'A Caravan Wagon',
    'Iron-tyred, tarred canvas, a house mark painted on the tailboard. The axle has been greased with something that smells of the Anvilfells.'
  ],
  ore: [
    'An Ore Cart',
    "Copper ore from Copperhythe, green-streaked and heavy. The dwarves won't sell it smelted; they say it's better smelted, and they're right."
  ],
  // the Skyport
  skyport: [
    'The Skyport',
    'Beacon Hill, levelled and paved by the gnomes of Gimbaldry, who will moor nowhere else on Albra. When an airship is due, the whole hill is cleared, the mast lit, and the porters wait with their faces turned up like flowers.'
  ],
  mast: [
    'The Mooring Mast',
    "A tower of iron lattice and brass, with a ring at the top for an airship's nose. The gnomes built it in a week and charge the city rent for it."
  ],
  skyOffice: [
    'The Sky Office',
    'House Quarrender sells passage on the gnome airships here. The prices on the board are in gold, and they are not a misprint.'
  ],
  kites: [
    'Wind Kites',
    'The gnomes fly them from the mast to read the wind before a ship comes in. Children chase their shadows across the paving.'
  ],
  // ways out
  galleon: [
    'The Silver Anchor',
    "House Varenne's flagship, moored at the deep-water stage where nothing else in the harbour is allowed to tie up. Gilt on the stern, cannon behind the gunports, and a captain who has never once paid the Varg's sea-toll out of his own pocket."
  ],
  airship: [
    'A Gnome Airship',
    "Moored nose-in to the gnomes' mast: a gasbag of patched silk under brass hoops, a gondola of riveted copper, a propeller as tall as a man. It hums. The gnomes say that is the engine. The porters say that is the gnomes."
  ],
  stallCloth: [
    'A Cloth Stall',
    "Bolts of Mainland wool, Southland silk and dyed linen from the Ropewalk's vats, and a tapestry with a gold star on it that the clothier swears was woven for a queen. Which queen, he can't say."
  ],
  stallBakery: [
    'A Pie Stall',
    'Mutton pies, eel pies, apple pies and a loaf the length of your arm. The baker counts the Exchange clock by her ovens: when the noon shouting starts, the pies go up a penny.'
  ],
  stallCharms: [
    'A Charm Stall',
    "Bottled cures, a skull of doubtful origin, a little brass orrery and a crystal 'charged under three moons'. None of it is magic. The stallholder knows that, and knows the sailors don't, and charges accordingly."
  ],
  stallLamps: [
    "A Chandler's Stall",
    'Rope by the coil and the fathom, lanterns, wicks and a spool of tarred twine. Every ship that leaves Gilden buys something here; every ship that comes back buys more.'
  ],
  stallTools: [
    "A Tinker's Stall",
    'Hammers, tongs, crowbars and a box of nails sold by weight. Carters mend their wagons here before the Ore Road, and the tinker mends whatever they bring back.'
  ],
  coast: [
    'The Coast Road',
    "West along the shore to Ferryhythe, where Hallowmark's witch-finders search everyone off the ferry. The milestone says FERRYHYTHE 40; someone has scratched under it, WIZARDS 0."
  ]
};

// the city's houses, all standing (it's rich): townhouses on the Hill and Counting-house Row, cottages in
// five colours, and the docks in slate and green
const SETS = {
  fronts: {
    0: [
      'house1',
      'house1_slate',
      'house1_sand',
      'house1_moss',
      'house2',
      'house2_slate',
      'house2_sand',
      'house4_slate',
      'townhouse'
    ],
    1: ['house1_slate', 'house2_moss', 'house4', 'house4_moss', 'house2_slate'],
    2: ['house1_dusk', 'house2_dusk']
  },
  backs: {
    0: ['backTerra1', 'backTerra2', 'backSlate', 'backPurple', 'backSlate'],
    1: ['backSlate', 'backTerra2'],
    2: ['backSlate']
  },
  sides: { 0: ['sideTerra', 'sideSlate', 'sidePurple'], 1: ['sideSlate', 'sideTerra'], 2: ['sideSlate'] },
  yard: {
    0: ['barrel', 'crate1', 'crate2', 'flowerbush', 'bush', 'fence', 'urn', 'lowwall', 'barrel2'],
    1: ['barrel', 'crate1', 'crate3', 'sacks', 'barrel2', 'crate5', 'planks1', 'barrelsTrio', 'logs'],
    2: ['barrel', 'crate2']
  }
};

module.exports = function gilden(rects) {
  const m = new MapBuilder(rects, { id: 'gilden', name: 'Gilden', cols: COLS, rows: ROWS, seed: 9311 });
  m.lore = LORE;
  m.safe = true;
  m.flow = 'N'; // swell rolling in to the quay
  m.music = 'audio/gilden_theme.mp3'; // tools/music/gilden.py: B♭ major, a 97.9 s loop
  m.greet = [
    'Mind the cart!',
    'Fish! Fresh fish!',
    'Which house are you with?',
    'Copper is up again.',
    'Out the way, wizard.',
    'Good day to you.',
    'Ship in from Brassmouth!',
    'Penny for the Old Man?',
    "Don't stand on the rope.",
    'Ashcombe pays, Varenne pays more.',
    'Airship due Thursday, they say.',
    'Lovely day for a sailing.',
    'Mind your purse round here.',
    'Herring, three a penny!'
  ];
  // the Docks are busy, the Hill isn't: rich houses don't stroll
  const city = new City(m, { street: 'R', square: 'P', ruin: (x, y) => (y > 26 * T ? 0.45 : 0) });
  const RES = (x0, x1, y0, y1) => city.reserve(x0 * T, x1 * T, y0 * T, y1 * T);
  const put = (k, tx, ty, lore, o) =>
    m.place(k, tx * T, ty * T, Object.assign(lore ? { lore } : {}, o || {}));
  // place on paving or planks (tryPlace only stands things on grass) if it clears everything already down
  const drop = (k, tx, ty, lore, o) => {
    const ob = Object.assign({ kind: k, x: tx * T, y: ty * T }, o || {});
    for (const b of P.footBoxes(m.rects, ob)) {
      if (b.x < 4 || b.y < 4 || b.x + b.w > m.W - 4 || b.y + b.h > m.H - 4) return false;
      for (const c of m.boxes) if (P.overlap(b, c, 4)) return false;
      if (m.tileAt(b.x + b.w / 2, b.y + b.h / 2) === 'W') return false;
    }
    m.place(k, tx * T, ty * T, Object.assign(lore ? { lore } : {}, o || {}));
    return true;
  };
  const road = (pts, o) => city.road(pts, Object.assign({ bend: 0 }, o || {}));

  // ── the sea: the harbour along the south, the headland's water down the east edge ──
  m.fill(0, SEA, COLS - 1, ROWS - 1, 'W');
  for (let y = 22; y < SEA; y++) m.fill(y < 26 ? COLS - 2 : COLS - 3, y, COLS - 1, y, 'W');
  // the Long Quay: three rows of flagstones along the whole waterfront
  m.fill(0, QUAY, COLS - 4, SEA - 1, 'P');
  // five piers out into the harbour, plank decks on piles
  for (const [a, b] of PIERS) m.fill(a, SEA, b, SEA + 5 + ((a * 7) % 3), 'K');
  // the deep-water stage: a stone walk out from the third pier, where House Varenne's galleon moors (the
  // user's sheet 29; the stage's bollards are drawn with the ship)
  const GALLEON = 'galleon' in rects;
  if (GALLEON) {
    m.fill(29, 46, 39, 47, 'P');
    RES(28.5, 40, 41, 48.5); // no terrace on the stage
  }
  // the mole: a stone arm round the east of the harbour, the Harbour Light at its end
  m.fill(56, SEA, 58, 46, 'P');
  m.fill(56, 46, 60, 47, 'P');

  // ── streets ──
  road(
    [
      [3, 0],
      [3, 12]
    ],
    { w: 3 }
  ); // the Ore Road in through the Ore Gate
  road(
    [
      [3, 12],
      [COLS - 6, 12]
    ],
    { w: 2 }
  ); // Hill Street
  road(
    [
      [31, 12],
      [31, QUAY]
    ],
    { w: 2 }
  ); // the Gilt Way, from the Hill down to the quay
  road(
    [
      [3, 12],
      [3, 24],
      [10, 24]
    ],
    { w: 2 }
  ); // the Ore Road on down through the city
  road(
    [
      [10, 24],
      [COLS - 5, 24]
    ],
    { w: 2 }
  ); // Counting-house Row
  road(
    [
      [0, 30],
      [COLS - 5, 30]
    ],
    { w: 2 }
  ); // the Ropewalk
  road(
    [
      [COLS - 6, 4],
      [COLS - 6, 24]
    ],
    { w: 2 }
  ); // Beacon Lane, up to the Skyport
  for (const x of [10, 21, 44])
    road(
      [
        [x, 24],
        [x, QUAY]
      ],
      { w: 1 }
    ); // dockside lanes: Tarry Lane, Gut Lane, Chain Lane
  road(
    [
      [52, 24],
      [52, QUAY]
    ],
    { w: 1 }
  ); // Salt Lane
  road(
    [
      [16, 12],
      [16, 24]
    ],
    { w: 1 }
  ); // Mint Steps
  road(
    [
      [44, 12],
      [44, 24]
    ],
    { w: 1 }
  ); // Lamb's Steps
  road(
    [
      [10, 18],
      [31, 18]
    ],
    { w: 1 }
  );
  road(
    [
      [33, 18],
      [55, 18]
    ],
    { w: 1 }
  );

  // squares: Exchange Square, the Fish Market, the Caravanserai yard, the Skyport, Customs Square
  m.fill(26, 19, 38, 23, 'P'); // Exchange Square
  city.square(21.6, 33.6, 3.4, 1.8); // the Fish Market
  m.fill(1, 2, 11, 9, 'D'); // the Caravanserai yard
  m.fill(1, 9, 11, 10, 'P');
  m.fill(52, 2, COLS - 4, 9, 'P'); // the Skyport on Beacon Hill
  city.square(34.5, 34.6, 3.2, 1.5); // Customs Square

  // ── landmarks ──
  // the Hill: four palaces north of Hill Street, each in its gardens
  const realPiece = id => (rects[PH.get(id).piece] ? PH.get(id).piece : null);
  // the great houses' palaces: a townhouse / the hall stand in (placeholder piece_palace)
  const palace = (kind0, tx, lore, sc0, banners, x0, x1) => {
    const real = lore !== 'vellacourt' && realPiece('piece_palace'),
      // the user's palace, in each house's stone (palace_sand, palace_rose: recolours in the cutter)
      kind = real ? (PALACE_LOOK[lore] in rects ? PALACE_LOOK[lore] : 'palace') : kind0,
      sc = real ? undefined : sc0;
    m.fill(x0, 3, x1, 11, 'G');
    m.fill(Math.floor(tx), 10, Math.floor(tx) + 1, 11, 'P'); // the drive
    put(kind, tx, 9.6, lore, sc ? { scale: sc } : null);
    for (const [x, y] of [
      [x0 + 0.8, 11.9],
      [x1 + 0.2, 11.9]
    ])
      put(banners, x, y, 'bravo');
    for (let x = x0 + 0.5; x < x1 + 0.6; x += 1)
      if (Math.abs(x - tx) > 1.4 && Math.abs(x - (tx + 1)) > 1.4) put('lowwall', x, 11.95);
    for (const [x, y] of [
      [x0 + 1.2, 6.4],
      [x1 - 0.4, 6.8],
      [x0 + 1.8, 8.6]
    ])
      m.tryPlace(P.pick(m.r, ['flowerbush', 'bush', 'urn', 'tree']), x * T, y * T, 4);
    RES(x0, x1 + 1, 2, 12);
  };
  const PALACE_LOOK = { ashcombe: 'palace_sand', varenne: 'palace', quarrender: 'palace_rose' };
  palace('hall', 18, 'ashcombe', 1.0, 'bannerAnvil', 14, 22);
  palace('house3_dusk', 27.5, 'vellacourt', 1.45, 'post', 24, 30);
  palace('townhouse', 38, 'varenne', 1.15, 'bannerFrame', 34, 42);
  palace('townhouse', 48.4, 'quarrender', 1.1, 'bannerP', 45, 51);
  if (!realPiece('piece_palace')) {
    // stand-in flourishes that the palaces themselves now cover
    put('tower', 51.2, 8.6, 'quarrender', { scale: 0.55 });
    put('frozenFountain', 40.6, 7.6, 'garden', { scale: 0.42 }); // Varenne's fountain (a frosted stand-in)
    put('scholarStatue', 15.4, 7.4, 'garden', { scale: 0.5 });
  }

  // the Exchange and the Guildhall on Exchange Square
  put('temple', 32, 18.9, 'exchange', { scale: 0.92 });
  RES(28.4, 35.6, 13, 19);
  put('hall', 24.4, 18.9, 'guildhall', { scale: 0.8 });
  RES(21.8, 27, 13.5, 19);
  for (const [x, y] of [
    [26.6, 22.6],
    [37.6, 22.2]
  ])
    put('lanternPost', x, y, 'lamp');
  put('well', 36.6, 20.6, 'well', { scale: 0.7 });
  // market stalls round the square (the user's sheet 30): cloth and charms for the factors' wives, pies for
  // everyone
  for (const [k, x, y, l] of [
    ['stallCloth', 29.0, 21.5, 'stallCloth'],
    ['stallCharms', 29.0, 23.95, 'stallCharms'],
    ['stallBakery', 35.4, 23.95, 'stallBakery']
  ])
    if (k in rects) put(k, x, y, l);
  for (const [k, x, y] of [
    ['benchPlain', 32.4, 23.6],
    ['catGinger', 32.6, 21.2]
  ])
    put(k, x, y, 'exchangeSq', { scale: k === 'catGinger' ? 0.5 : 0.7 });
  RES(26, 39, 19, 24);

  // the Caravanserai: the yard inside the Ore Gate, the Charterhouse facing it, wagons everywhere
  put('stoneArch', 4.5, 1.2, 'oregate', { scale: 1.2 });
  put('townhouse', 8.6, 5.2, 'charterhouse', { scale: 0.85 });
  put('noticeBoard', 6.3, 6.6, 'charters');
  for (const [k, x, y, l] of [
    ['wagonCovered', 2.2, 8.4, 'wagons'],
    ['wagonCovered', 9.6, 8.6, 'wagons'],
    'stallTools' in rects ? ['stallTools', 1.9, 5.0, 'stallTools'] : ['wagon', 2.4, 5.2, 'wagons'],
    ['cartLoaded', 6.2, 9.4, 'wagons'],
    ['oreCart', 10.2, 10.2, 'ore'],
    ['oreCart', 1.9, 10.4, 'ore'],
    ['sacksGrain', 4.6, 9.8],
    ['barrelsTrio', 8, 9.9],
    ['handcartGreens', 5.2, 3.4],
    ['stonePallet', 10.4, 3.2, 'ore'],
    ['lanternPost', 1.2, 6.6, 'lamp']
  ])
    put(k, x, y, l);
  RES(0, 12, 0, 11);

  // the Skyport on Beacon Hill: the mast, the Sky Office, kites, the porters' cargo
  // the user's airship comes with its own lattice mast and landing stage; till then a spire stands in, empty
  if (realPiece('piece_airship')) put('airship', 57.9, 8.7, 'airship');
  else put('spireTower', 58.4, 7.6, 'mast', { scale: 1.05 });
  put('watchTower', 53.6, 9.4, 'skyOffice', { scale: 0.62 });
  for (const [k, x, y] of [
    ['kite1', 56.2, 4.2],
    ['kite2', 60.6, 4.8],
    ['kite3', 57.4, 3],
    ['rodTall', 60.8, 9.1]
  ])
    put(k, x, y, 'kites', { scale: 0.8 });
  for (const [k, x, y] of [
    ['crate4', 56, 9.3],
    ['crateStand', 56.8, 9.4],
    ['sacksPurple', 59.6, 9.6],
    ['barrel2', 55.6, 9.8]
  ])
    put(k, x, y, 'skyport');
  RES(52, COLS, 0, 11);

  // the Docks: the Customs House on Customs Square, the Harbourmaster's tower, the Narrows Office,
  // the Fish Market's awnings, the Old Man of the Narrows
  put('hall', 34.6, QUAY - 0.1, 'customs', { scale: 0.86 });
  RES(32.4, 36.8, 31.5, QUAY + 0.2);
  put('seaGod', 37.6, 35.8, 'seaGod', { scale: 0.62 });
  for (const [k, x, y] of [
    ['awningRed', 19.2, 33.2],
    ['awningCream', 21, 32.8],
    ['awningPurple', 23.4, 33.1],
    ['awningRed', 24.4, 35.4],
    ['lobsterPots1', 18.6, 35.2],
    ['basketApples', 20.4, 35.4],
    ['barrel3', 22.6, 35.6],
    ['catTabby', 21.8, 34.4]
  ])
    put(k, x, y, 'fishmarket', { scale: /awning/.test(k) ? 0.85 : 0.75 });
  RES(17.6, 25.6, 31.6, 36);
  // the waterfront: cranes, cargo and boats along the quay and its piers
  const cargo = [
    'crate1',
    'crate2',
    'crate3',
    'crate5',
    'barrel',
    'barrel2',
    'sacks',
    'barrelsTrio',
    'crate6'
  ];
  for (const [a, b] of PIERS) {
    const mx = (a + b + 1) / 2;
    put('crane', a + 0.4, SEA + 0.6, 'crane');
    put('postRing', b + 0.9, SEA + 1.2, 'pier', { scale: 0.8 });
    // no boats where the galleon lies, between the third and fourth piers
    const byShip = x => GALLEON && x > 29 && x < 40.5;
    if (!byShip(b + 2.2))
      put(P.pick(m.r, ['rowboat', 'rowboat', 'boat']), b + 2.2, SEA + 3.4, 'boats', { scale: 0.8 });
    if (a > 10 && !byShip(a - 1.4)) put('rowboat', a - 1.4, SEA + 2.4, 'boats', { scale: 0.7 });
    put(P.pick(m.r, cargo), mx, SEA + 2.6, 'cargo');
    put('pilesRope', mx + 0.3, SEA + 4.4, 'pier', { scale: 0.8 });
  }
  // the chandler's stall on the quay by the Customs House (placed before the loose cargo so it has room)
  if ('stallLamps' in rects) drop('stallLamps', 46.4, QUAY + 2.2, 'stallLamps');
  for (let x = 1.5; x < COLS - 5; x += 1.6 + m.r() * 1.8) {
    if (x > 32 && x < 37.5) continue;
    const k = P.pick(m.r, cargo.concat(['nets', 'netFrame1', 'cartLoaded', 'crane', 'moorings']));
    const y = k === 'moorings' || k === 'crane' ? SEA - 0.05 : QUAY + 1 + m.r() * 1.4;
    const lore = /crate|barrel|sacks/.test(k)
      ? 'cargo'
      : /net/.test(k)
        ? 'nets'
        : k === 'crane'
          ? 'crane'
          : k === 'cartLoaded'
            ? 'wagons'
            : 'quay';
    drop(k, x, y, lore);
  }
  put('chestOld', 30.2, QUAY + 2.2, 'quint', { scale: 0.7 });
  put('halberdStand' in rects ? 'halberdStand' : 'swordRack', 29.2, QUAY + 2.3, 'quint', { scale: 0.5 });
  // the shipyard at the west end of the quay: a hull on the slip, timber, tar and rope
  m.fill(0, 31, 8, QUAY - 1, 'D');
  RES(0, 9.2, 30.6, QUAY + 0.2);
  for (const [k, x, y, l, sc] of [
    ['boat', 4.2, 35.6, 'shipyard', 1.1],
    ['scaffold1', 2, 34.6, 'shipyard', 0.6],
    ['scaffold2', 6.6, 34.4, 'shipyard', 0.6],
    ['logs', 1.6, 36.6, 'shipyard'],
    ['planksPile', 7.4, 36.4, 'shipyard'],
    ['planks2', 5.6, 32.6, 'shipyard'],
    ['barrel3', 1.2, 32.4, 'shipyard'],
    ['netFrame2', 8, 32.8, 'nets', 0.8],
    ['rowboatWreck', 3.6, 32.6, 'shipyard', 0.7]
  ])
    drop(k, x, y, l, sc ? { scale: sc } : null);
  if (GALLEON) put('galleon', 34.4, 46.6, 'galleon');
  // the mole and the Harbour Light
  put('watchTower', 58.2, 47.4, 'harbourLight', { scale: 0.7 });
  put('figurehead', 56.8, 43.2, 'harbourLight', { scale: 0.6 });
  for (const y of [41.4, 44.2]) put('postRing', 58.8, y, 'quay', { scale: 0.8 });
  // lanterns along the quay
  for (let x = 3; x < COLS - 6; x += 7) drop('lanternPost', x + 0.3, QUAY + 0.25, 'lamp');

  // the docks' landmarks and the town's houses: terraces along every street, warehouses on the quay
  city.landmark('tavern', 13, 29, 'saltpurse');
  // warehouses facing the quay (placeholder piece_warehouse: ordinary houses line it till then)
  if (realPiece('piece_warehouse'))
    for (const x of [8, 26, 48]) city.landmark('warehouse', x, QUAY - 1, 'cargo');
  const ship = city.landmark('townhouse', 46, 36, 'shipping');
  m.place('noticeBoard', ship.cx + 120, ship.base + 30, { lore: 'shipping', scale: 0.8 });
  city.landmark('tower', 48, 30, 'pier');
  city.build({ sets: SETS, gap: 0.04, yards: 0.22 });
  for (const o of m.objs) if (/lanternPost/.test(o.kind) && !o.lore) o.lore = 'lamp';
  // lanterns along the main streets
  for (let x = 6; x < COLS - 6; x += 7) {
    if (m.at(x, 23) !== 'R' && m.at(x, 24) === 'R') m.tryPlace('lanternPost', x * T + 20, 24 * T - 2, 4);
    if (m.at(x, 29) !== 'R' && m.at(x, 30) === 'R') m.tryPlace('lanternPost', x * T + 20, 30 * T - 2, 4);
  }
  for (const o of m.objs) if (o.kind === 'lanternPost' && !o.lore) o.lore = 'lamp';
  // the grass that's left: trees in the gardens and along the cliff behind the Skyport
  m.scatter(90, [
    ['tree', 4],
    ['bush', 2],
    ['flowerbush', 2]
  ]);
  m.edgeWoods(120, T * 1.2, () => 'tree');

  // ── people (js/explore_gilden.js) ──
  m.npcs = [
    { role: 'gd_charter', x: 5.3 * T, y: 7.6 * T }, // the Master of the Charterhouse, at the charter board
    { role: 'gd_ashcombe', x: 19.6 * T, y: 10.9 * T }, // Dame Ottoline, on the drive of Ashcombe Hall
    { role: 'gd_ashmagus', x: 21.1 * T, y: 10.5 * T }, // Grozdak, Ashcombe's forge mage
    { role: 'gd_varmagus', x: 41 * T, y: 10.5 * T }, // Vigdis, Varenne's sea-witch
    { role: 'gd_quarmagus', x: 47.1 * T, y: 10.7 * T, scale: 0.6 }, // Cogglesworth, Quarrender's gnome
    { role: 'thessaly', x: 28.4 * T, y: 13.1 * T }, // Thessaly, outside her chained gate
    { role: 'gd_guard1', x: 26.6 * T, y: 12.8 * T }, // her two hired bodyguards
    { role: 'gd_guard2', x: 30.2 * T, y: 12.8 * T },
    { role: 'gd_varenne', x: 39.6 * T, y: 10.9 * T }, // Gaspard Varenne
    { role: 'gd_quarrender', x: 49.9 * T, y: 10.9 * T }, // Perpetua Quarrender
    { role: 'gd_harbour', x: 39.2 * T, y: (QUAY + 1.6) * T }, // the Harbourmaster, on the quay by the Customs House
    { role: 'gd_sky', x: 55.6 * T, y: 10.4 * T, scale: 0.6 }, // the gnome at the Sky Office
    { role: 'gd_fishwife', x: 22.2 * T, y: 34.3 * T } // a fishwife who hears everything
  ];

  // night light: the Harbour Light, the mast, the Exchange's dome
  m.glows.push(
    { x: 58.2 * T, y: 42.5 * T, r: 320, c: '255,215,140' },
    'airship' in rects
      ? { x: 59.2 * T, y: 5.4 * T, r: 220, c: '255,210,140' } // the airship's mast lantern
      : { x: 58.4 * T, y: 3 * T, r: 220, c: '200,170,255' },
    { x: 32 * T, y: 14 * T, r: 200, c: '255,220,150' }
  );

  // ── arrivals and ways out ──
  m.spawns = {
    north: [4.5 * T, 2.4 * T], // in at the Ore Gate
    west: [1.6 * T, 30.9 * T], // in by the Coast Road
    start: [4.5 * T, 2.4 * T],
    charter: [6.5 * T, 8.2 * T] // back from a charter, in the Caravanserai
  };
  m.exits = [
    { x: 3 * T, y: 0, w: 3 * T, h: 44, label: 'The Ore Road (Chepstead, Hollowmere)', to: 'world' },
    { x: 0, y: 30 * T, w: 44, h: 2 * T, label: 'The Coast Road (Ferryhythe)', to: 'world' }
  ];
  put('milestone' in rects ? 'milestone' : 'post', 1.4, 29.6, 'coast');
  return m;
};
