// Corvanthe's inner districts: the ring of streets between each sector's north barrier and the Wound.
// One generator for all eight, content per district in INNER, built from sheets 14–23 (the town props
// sheet for all of them, then one sheet a district; tileset14..23_source.png → ruins14..23).
// You come in through the arch in the outer sector's north barrier and arrive at the south edge; the
// Inner Circuit runs west–east along the south and leads round the ring to the neighbouring inner
// districts (INNER_RING, in the wheel's order like the outer ring); the north edge is the Rim, where
// the Wound begins. The Last Gate through it is barred for now: the centre isn't built yet.
// Everything here is further gone than the outer ring, and the Echoes are veterans to champions.
'use strict';
const { MapBuilder, T, P } = require('./builder');
const { City, variedStyle, HOUSE_RE } = require('./city');
const { OWN_LORE } = require('./own');
const sector = require('./sector');
const { river, RING } = sector;

const INNER_IDS = {
  cindergate: 'crucible',
  heights: 'drift',
  spirewatch: 'conductory',
  collegium: 'old_schools',
  drowned_quarter: 'sunken_harbour',
  quarry_ward: 'deep_cut',
  frostmarket: 'winter_fair',
  gloamside: 'necropolis'
};
const INNER_RING = RING.map(k => INNER_IDS[k]);
const NAMES = {
  crucible: 'The Crucible',
  drift: 'The Drift',
  conductory: 'The Conductory',
  old_schools: 'The Old Schools',
  sunken_harbour: 'The Sunken Harbour',
  deep_cut: 'The Deep Cut',
  winter_fair: 'The Winter Fair',
  necropolis: 'The Necropolis'
};
const EL = {
  crucible: 'fire',
  drift: 'air',
  conductory: 'lightning',
  old_schools: 'arcane',
  sunken_harbour: 'water',
  deep_cut: 'earth',
  winter_fair: 'ice',
  necropolis: 'dark'
};

// the town props every district shares (sheet 14), by how many of each to try for
const COMMON = [
  ['cratesProduce', 2],
  ['sacksGrain', 2],
  ['barrelsTrio', 2],
  ['cartLoaded', 1],
  ['wagonCovered', 1],
  ['washLine1', 1],
  ['washLine2', 1],
  ['well', 1],
  ['benchBack', 1],
  ['benchPlain', 1],
  ['noticeBoard', 1],
  ['lanternPostBroken', 2],
  ['lanternSmashed', 2],
  ['handcartSacks', 1],
  ['handcartGreens', 1],
  ['barrowStone', 1],
  ['chestOld', 1],
  ['basketApples', 1],
  ['crow1', 2],
  ['crow2', 2],
  ['crowFlying', 2],
  ['crowPerch', 2],
  ['catGinger', 1],
  ['catTabby', 1],
  ['catBlack', 1],
  ['catSleeping', 1]
];
const SIGNS = ['signTavern', 'signApothecary', 'signSmith', 'signBaker', 'signBooks', 'signTemple'];

// per district:
//   ground: {open, street, square} kinds (default G / R / P);  pal: the outer sector's palette (null = none)
//   center: what stands in the square;  lamp: the street lamp at its corners;  land: big pieces on street-facing plots
//   props: [kind, n, where?] scattered after the houses ('O' = on the flooded plots);  float: [kind, n] drifting overhead
//   decals: [kind, n, 'street'|'ground', block?];  runs: lava channels;  rails: a mine track;  pits: holes onto the Wound
const INNER = {
  crucible: {
    outer: 'cindergate',
    seed: 7101,
    ground: { open: 'a', street: 'c', square: 'f' },
    burnt: true,
    fx: 'embers',
    haze: '90,30,8,0.2',
    glow: '255,120,40',
    river: { c0: 44, flow: 'N', glow: '255,150,70' },
    center: 'lavaWell',
    lamp: 'lanternPostBroken',
    land: ['foundry', 'stallBurnt', 'foundry', 'crucibleHoist', 'chainHoist', 'forge'],
    props: [
      ['slagHeap1', 3],
      ['slagHeap2', 4],
      ['slagHeap3', 6],
      ['anvilBlock', 3],
      ['bellowsGreat', 2],
      ['oreCart', 2],
      ['oreCartHot', 3],
      ['anvil', 2],
      ['slag', 3]
    ],
    runs: 3,
    signs: ['signSmith', 'signTavern'],
    lore: {
      line: [
        'The Rim of the Wound',
        "The street ends in a lip of fused stone, and past it the ground simply isn't. The light coming up from below is the colour of the inside of a furnace."
      ],
      lastGate: [
        'The Crucible Gate',
        'The last gate before the Wound. Its iron has run like wax and set again into a shape like a closed hand. It will not open. Not yet.'
      ],
      archIn: [
        'The Furnace Arch',
        'Back out to Cindergate. From this side the arch is black with soot, and someone has chalked a tally of the days on it, and stopped.'
      ],
      square: [
        "Founders' Pour",
        'Where the great bells and cannon were cast, in pits in the ground. The pits are still full, and still molten, and something swims in one.'
      ],
      center: [
        'The Molten Well',
        'The foundries drew their water here to quench the steel. The well has filled up with fire from underneath, and the bucket still goes down and comes up, by itself.'
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here it runs between foundries, and the cobbles are warm through your boots.'
      ]
    }
  },
  drift: {
    outer: 'heights',
    seed: 7201,
    pal: 'gale',
    fx: 'wind',
    haze: '210,215,240,0.1',
    glow: '210,220,255',
    center: 'kite3',
    lamp: 'lanternPost',
    land: ['fallenDome', 'townhouse', 'gazebo', 'townhouse'],
    props: [
      ['kite1', 3],
      ['kite2', 2],
      ['vaneGriffin', 2],
      ['vaneBird', 2],
      ['vaneSmall', 3],
      ['awningPurple', 2],
      ['awningCream', 2],
      ['awningRed', 2],
      ['bannerFrame', 3],
      ['sail1', 2],
      ['sail2', 2],
      ['windmillSails', 1],
      ['urnBroken', 3],
      ['bench', 3]
    ],
    float: [
      ['skyRock1', 3],
      ['skyRock2', 4],
      ['skyRock3', 4],
      ['skyRock4', 5],
      ['floatHouse1', 1],
      ['floatHouse2', 1],
      ['floatHouse3', 2],
      ['floatIsle1', 2],
      ['floatIsle3', 3],
      ['floatRoof', 2]
    ],
    pits: 5,
    signs: ['signTavern', 'signBooks'],
    lore: {
      line: [
        'The Rim of the Wound',
        'The hill ends in the sky. The streets run on past the edge as rubble hanging in the air, a little higher every year, toward the light.'
      ],
      lastGate: [
        'The Sky Gate',
        'An arch with nothing on the far side but drifting stone and violet light. Every so often a step forms in the air beyond it, and falls. Not yet.'
      ],
      archIn: [
        'The Weathervane Gate',
        'Back down to the Heights. The weathervane on this side points away from the Wound, always, as if it wants to leave too.'
      ],
      square: [
        'Kite Green',
        'The rich flew silk kites here on feast days. The kites are still up, on lines that run down to nothing and are pulled taut all the same.'
      ],
      center: [
        'The Great Kite',
        'A kite as big as a sail, lashed to a stone post with chains. It strains toward the Wound day and night, and the bells on it never stop.'
      ],
      circuit: [
        'The Inner Circuit',
        "The ring road round the inner city. Here the paving has lifted off in places, and you walk on stones that drift a hand's breadth up and down."
      ]
    }
  },
  conductory: {
    outer: 'spirewatch',
    seed: 7301,
    pal: 'storm',
    fx: 'rain',
    storm: true,
    haze: '40,50,100,0.16',
    glow: '160,180,255',
    center: 'coilBig',
    lamp: 'stormLamp1',
    land: ['spireTower', 'fallenSpire', 'spireTower', 'coilBig', 'bellTower'],
    props: [
      ['coil1', 3],
      ['coil2', 3],
      ['rodTall', 3],
      ['rodSpire', 3],
      ['rodFork', 3],
      ['stormLamp2', 3],
      ['stormLamp3', 3],
      ['rainBarrel', 3],
      ['barrelPlain', 3],
      ['cartWrecked', 2],
      ['lightningRod', 2]
    ],
    decals: [
      ['glaze2', 5, 'street'],
      ['glaze3', 3, 'street'],
      ['glaze4', 3, 'street']
    ],
    signs: ['signSmith', 'signApothecary'],
    lore: {
      line: [
        'The Rim of the Wound',
        'Every bolt that falls on Spirewatch comes from here. The edge is glass, fused and refused, and it sings when the lightning finds it.'
      ],
      lastGate: [
        'The Copper Gate',
        'Sheathed in copper to draw the storm off the inner city. It glows blue-white, and the air in front of it tastes of pennies. Not yet.'
      ],
      archIn: [
        'The Belfry Arch',
        'Back out to Spirewatch. The bells are louder on this side, as if the sound has nowhere to go but out.'
      ],
      square: [
        "Conductors' Yard",
        "Where the city's lightning engineers tested their coils. The coils are still charging. Nobody has found where they discharge to."
      ],
      center: [
        'The Great Coil',
        'The engineers built it to catch the storms and store them. It caught the Unweaving instead. The globe on top is full of something that moves.'
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here the cobbles have been glazed by lightning, and the rain stands on them like on a mirror.'
      ]
    }
  },
  old_schools: {
    outer: 'collegium',
    seed: 7401,
    pal: 'aether',
    fx: 'motes',
    haze: '100,40,150,0.14',
    glow: '190,140,255',
    center: 'armillary',
    lamp: 'lanternPost',
    land: ['lectureBenches', 'portalRuin', 'hall', 'scrollRack', 'portal'],
    props: [
      ['scholarHeadless', 2],
      ['scrollRack', 2],
      ['scrollBin', 3],
      ['arcCrystal1', 2],
      ['arcCrystal2', 3],
      ['arcCrystal3', 4],
      ['crateBooks', 3],
      ['tableBooks', 3],
      ['bookshelves', 2],
      ['cartPotions', 2]
    ],
    float: [['flyingBooks', 6]],
    decals: [
      ['runeCircleL', 2, 'ground'],
      ['runeCircleM', 3, 'street'],
      ['runeCircleS', 5, 'street']
    ],
    signs: ['signBooks', 'signApothecary'],
    lore: {
      line: [
        'The Rim of the Wound',
        'This is where the lecture was given. The floor of the hall is still here, at the edge; the hall, the lecturer and the rest of the district are not.'
      ],
      lastGate: [
        "The Examiners' Gate",
        'Only those who had passed went through it. A slate beside it lists the names of everyone who has, and the newest name is still being written. Not yet.'
      ],
      archIn: [
        "The Scholars' Gate",
        'Back out to the Collegium. The motto over this side is the same, backwards, and it makes more sense.'
      ],
      square: [
        'The Old Quad',
        'The oldest courtyard of the university, older than the city round it. The flagstones have moved into a pattern, and the pattern is a sum.'
      ],
      center: [
        'The Armillary',
        "The university's model of the heavens, in brass, still turning. One ring has come loose and lies in the grass, and the rest turn round the gap where it was."
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here it passed between the oldest schools, and pages blow along it that were never written by anyone.'
      ]
    }
  },
  sunken_harbour: {
    outer: 'drowned_quarter',
    seed: 7501,
    pal: 'drowned',
    ground: { street: 'F' },
    fx: 'rain',
    flood: true,
    haze: '20,60,90,0.18',
    glow: '110,200,230',
    center: 'seaGod',
    lamp: 'lanternPost',
    riverFromOuter: 'S',
    land: ['wreckMarket', 'drownedShrine', 'sunkHouse', 'sunkHouse', 'seaMaiden'],
    props: [
      ['rowboat', 2, 'O'],
      ['rowboatSunk', 2, 'O'],
      ['rowboatWreck', 2, 'O'],
      ['pile1', 3],
      ['pile2', 3],
      ['pilesRope', 3],
      ['netFrame1', 2],
      ['netFrame2', 2],
      ['lobsterPots1', 2],
      ['lobsterPots2', 2],
      ['lobsterPot', 3],
      ['boat', 2],
      ['nets', 2]
    ],
    signs: ['signTavern', 'signBaker'],
    lore: {
      line: [
        'The Rim of the Wound',
        "The harbour's water wells up out of the Wound here, over a lip of drowned stone, without a sound. Nobody has ever seen where it comes from."
      ],
      lastGate: [
        'The Sea Gate',
        'The old water-gate of the inner harbour, its portcullis rusted down. On the far side the water stands up in a wall. Not yet.'
      ],
      archIn: [
        'The Harbour Arch',
        'Back out to the Drowned Quarter. On this side the scoring at the waterline is deeper, and fresher.'
      ],
      square: [
        'The Old Exchange',
        'Where the ship-owners met to trade. The water here is knee-deep and perfectly clear, and the coins on the bottom are all face up.'
      ],
      center: [
        'The Sea-Father',
        "The harbour's patron, on his throne with his trident. The water round his feet is warm, and turns slowly, the wrong way."
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here the tide has come up into it and stayed, and you wade.'
      ]
    }
  },
  deep_cut: {
    outer: 'quarry_ward',
    seed: 7601,
    pal: 'quarry',
    fx: 'dust',
    haze: '130,95,55,0.15',
    glow: '230,190,120',
    center: 'giantHead',
    lamp: 'lanternPost',
    land: ['mineHead', 'scaffold1', 'scaffold2', 'quarryCrane', 'tiltedHouse'],
    props: [
      ['boulder1', 3],
      ['boulder2', 4],
      ['boulder3', 5],
      ['boulder4', 5],
      ['boulder5', 6],
      ['masonBench', 2],
      ['grindstone', 2],
      ['stonePallet', 3],
      ['rockSpire1', 3],
      ['rockSpire2', 3],
      ['rockSpire3', 2],
      ['mineCart', 1]
    ],
    decals: [
      ['crackSmall', 4, 'street'],
      ['crackWide', 3, 'street'],
      ['rift', 2, 'ground', true]
    ],
    rails: true,
    signs: ['signSmith', 'signTavern'],
    lore: {
      line: [
        'The Rim of the Wound',
        'The quarry went down, and down, and at the bottom it went through. The rock at the edge is still being cut, by nothing, in long clean strokes.'
      ],
      lastGate: [
        'The Deep Gate',
        "Hewn from a single block and still standing, though the ground has dropped a man's height on the far side. Not yet."
      ],
      archIn: [
        "The Masons' Gate",
        'Back out to the Quarry Ward. It leans a little further every time you pass through it.'
      ],
      square: [
        "The Hewers' Pit",
        'Where the biggest blocks were raised. One of them was the face of a statue for the city gate. It came up, and it is looking at you.'
      ],
      center: [
        'The Fallen Face',
        'Carved for the great gate and never raised. Since the Unweaving its eyes have opened, very slightly, and they follow the Wound.'
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here it runs on the old ore line, and the carts still roll down it by themselves at night.'
      ]
    }
  },
  winter_fair: {
    outer: 'frostmarket',
    seed: 7701,
    pal: 'frost',
    ground: { open: 'S' },
    fx: 'snow',
    haze: '190,220,255,0.14',
    glow: '170,220,255',
    center: 'iceFountain',
    lamp: 'frostLamp1',
    land: ['furTent', 'stallStripe', 'stallFish', 'stallMeat', 'frostStall'],
    props: [
      ['iceCrystal1', 2],
      ['iceCrystal2', 3],
      ['iceCrystal3', 4],
      ['iceCrystal4', 5],
      ['sled', 2],
      ['sledFurs', 2],
      ['iceBarrel1', 2],
      ['iceBarrel2', 3],
      ['iceBarrel3', 3],
      ['frostLamp2', 3],
      ['frostLamp3', 3],
      ['iceSpire1', 2],
      ['iceSpire2', 2],
      ['stallStripe', 1],
      ['stallMeat', 1]
    ],
    signs: ['signBaker', 'signTavern'],
    lore: {
      line: [
        'The Rim of the Wound',
        'The ice ends in a cliff, sheer and blue and lit from inside. Frozen in it, far down, are lanterns from the fair, still burning.'
      ],
      lastGate: [
        'The Rime Gate',
        'Frozen shut, and the ice on it is a hand thick and perfectly clear. Through it you can see the street beyond, and someone standing in it, looking back. Not yet.'
      ],
      archIn: [
        'The Market Gate',
        'Back out to Frostmarket. Someone has added another line to the tolls on this side: "PRICE OF LEAVING: NOTHING. GO."'
      ],
      square: [
        'The Fair Ground',
        'The winter fair was in full swing: furs, fish, mulled wine, a dancing bear. The snow has kept it all exactly, except the bear, which got away.'
      ],
      center: [
        'The Fountain of the Water-Bearer',
        "She pours, and the water freezes as it leaves the jar, and the ice grows a finger's length every winter. One day it will reach the basin."
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here it is packed snow over cobbles, and sled tracks run along it that are always fresh.'
      ]
    }
  },
  necropolis: {
    outer: 'gloamside',
    seed: 7801,
    pal: 'gloom',
    fx: 'shade',
    haze: '30,10,55,0.26',
    glow: '170,90,230',
    center: 'graveAngel',
    lamp: 'gloomLamp1',
    land: ['tombGrand', 'cryptGate', 'tomb', 'cemeteryGate', 'tomb', 'mausoleum'],
    props: [
      ['grave1', 5],
      ['grave2', 5],
      ['grave3', 5],
      ['graveCross', 4],
      ['graveCross2', 4],
      ['graveObelisk', 3],
      ['graveArch', 3],
      ['gloomTree1', 2],
      ['gloomTree2', 3],
      ['gloomStump', 3],
      ['crowPost', 2],
      ['crowArch', 2],
      ['crowRubble', 2],
      ['brazier', 4],
      ['gloomLamp2', 3],
      ['gloomLamp3', 2],
      ['cemeteryFence', 4],
      ['cemeteryWicket', 2]
    ],
    decals: [
      ['shadowPool1', 4, 'street'],
      ['shadowPool2', 3, 'street'],
      ['shadowPool3', 2, 'ground', true],
      ['shadowPool4', 2, 'ground', true]
    ],
    signs: ['signTemple'],
    lore: {
      line: [
        'The Rim of the Wound',
        'The graves go right up to the edge, and over it. The dead were buried facing the sunrise. Every one of them has turned to face the Wound.'
      ],
      lastGate: [
        'The Gate of the Last Rite',
        'The procession gate, where the dead went in and the mourners turned back. It has been barred from the other side. Not yet.'
      ],
      archIn: [
        'The Catacomb Gate',
        'Back out to Gloamside. Your name is still carved on this side of it. Someone has started carving a date beside it.'
      ],
      square: [
        "The Mourners' Walk",
        'Where the families waited while the priests went in. The benches are worn hollow, and still faintly warm, as if they have only just stood up.'
      ],
      center: [
        'The Weeping Angel',
        'She kneels with her hands together and her face hidden. Nobody has seen her face. Everybody who tries says the same thing: she was looking.'
      ],
      circuit: [
        'The Inner Circuit',
        'The ring road round the inner city. Here it is the old funeral road, and the lamps along it burn violet, with no oil in them.'
      ]
    }
  }
};

const INNER_LORE = {
  well: [
    'A Street Well',
    'The rope is new. The bucket comes up full every time, of water so cold it hurts, and it smells faintly of violets.'
  ],
  noticeBoard: [
    'A Notice Board',
    'Rents due, a lost dog, a cure for the ague, a lecture at the Collegium "on a new and safe method of drawing quintessence." The date is the day of the Unweaving.'
  ],
  catGinger: [
    'A Ginger Cat',
    'It watches you with complete indifference. The cats came back to Corvanthe first, and they have never said what they know.'
  ],
  catTabby: [
    'A Tabby Cat',
    'It walks a careful circle round you, then sits down where you were standing as if it has won something.'
  ],
  catBlack: ['A Black Cat', 'It is washing a paw that is, for a moment, translucent, then not.'],
  catSleeping: [
    'A Sleeping Cat',
    'Asleep in the one patch of ordinary sunlight in the street. Echoes walk round it.'
  ],
  crowPerch: ['A Crow', "It says a word, quite clearly, in a dead man's voice. It is your name."],
  cartPotions: [
    "A Hawker's Cart",
    'Phials of every colour, all stoppered and all empty. Each one is labelled in the same hand: "PROOF AGAINST THE UNWEAVING."'
  ],
  lavaWell: INNER.crucible.lore.center,
  foundry: [
    'A Great Foundry',
    "Bells, cannon and the city's iron gates were cast here. The furnace is still lit, and in the moulds on the floor the metal is still taking shape."
  ],
  stallBurnt: [
    'A Burnt Stall',
    "A smith's stall, its awning dripping with molten iron that never cools enough to fall."
  ],
  crucibleHoist: [
    'The Crucible Hoist',
    'The pot still hangs over the fire, and still glows. Whatever was poured last never set.'
  ],
  chainHoist: ['A Chain Hoist', 'Its hook still swings, slowly, though nothing has touched it in years.'],
  lavaSpring: [
    'A Fire Spring',
    'Molten rock wells up between the stones and runs off along the old quench channels, as if the foundries never stopped.'
  ],
  lavaRun: ['A Quench Channel', 'Cut to carry water from the well to the foundries. It carries fire now.'],
  slagHeap1: ['A Slag Heap', 'Still hot enough to cook on. The gleaners do.'],
  fallenDome: [
    'The Fallen Observatory',
    'Its dome came down with the great bell inside it. The bell still rings when the wind blows, which here is always.'
  ],
  kite3: INNER.drift.lore.center,
  skyRock1: [
    'Drifting Stone',
    'A piece of street, cobbles and all, hanging at head height. Its shadow is in the right place. Its stones are not.'
  ],
  floatHouse1: [
    'A Drifting House',
    "Somebody's house, turning slowly overhead with its lights on. It has drifted in from the Wound, and it is heading back."
  ],
  floatHouse2: [
    'A Drifting House',
    'Upside down, roof first, with a garden still on the bottom of it. The flowers are in bloom.'
  ],
  floatHouse3: [
    'A Drifting Cottage',
    'The smallest house in the Heights, and the only one still with a family in it, by the shapes at the window.'
  ],
  bannerFrame: [
    'A Guild Banner',
    'The Kitemakers\' Guild. Their motto, sewn in gold: "We hold the sky by a thread."'
  ],
  windmillSails: [
    'Windmill Sails',
    'Torn from a mill out on the hill, they came to rest here, and still turn when no wind blows.'
  ],
  coilBig: INNER.conductory.lore.center,
  spireTower: [
    'A Signal Tower',
    'The watchmen signalled the storms across the city from here. The fire on top went out the day of the Unweaving and lit again on its own, blue.'
  ],
  fallenSpire: [
    'The Fallen Spire',
    'The copper cap of the tallest belfry, lying in the street where it fell. It is still warm, and still struck, from time to time, by lightning.'
  ],
  coil1: [
    'A Storm Coil',
    "One of the engineers' coils. The globe on top crackles when you come near, and the hairs on your arms rise to meet it."
  ],
  rainBarrel: [
    'A Rain Barrel',
    'The water in it is perfectly still in the storm, and the reflection in it is a clear blue sky.'
  ],
  armillary: INNER.old_schools.lore.center,
  lectureBenches: [
    'The Lecture Tiers',
    'The tiered benches of the oldest lecture hall, standing in the open now. The notes on the desks are all of the same lecture, and all stop at the same word.'
  ],
  portalRuin: [
    'The Broken Door',
    'An archway onto purple light. On the other side it is the same street, but everything in it is a little to the left.'
  ],
  scholarHeadless: [
    'The Statue of the Dean',
    'His head came off in the Unweaving and was never found. His hand is still raised, mid-point, and he is pointing at you.'
  ],
  scrollRack: [
    'A Scroll Rack',
    'Every scroll in it is the same spell. Every copy has the same mistake, in the same place, underlined.'
  ],
  arcCrystal1: [
    'A Spill Crystal',
    'Raw quintessence, grown out of the paving like frost. It hums at a pitch you feel in your teeth.'
  ],
  flyingBooks: [
    'Flying Books',
    'Books from the libraries, flapping over the streets like birds, never landing. Now and then a page falls.'
  ],
  seaGod: INNER.sunken_harbour.lore.center,
  seaMaiden: [
    'The Harbour Maiden',
    'She held a lantern out to sea for the ships coming home. The lantern is gone, and her hand is still out, waiting.'
  ],
  wreckMarket: [
    'The Wreck Market',
    'A ship came up the flooded street on the night of the Unweaving and ran aground here, and the fishwives set up shop in it. The awnings are still out.'
  ],
  drownedShrine: [
    'The Shrine of the Drowned',
    'The hooded mother of sailors, holding out a bowl. The water in it glows, and the drowned are said to drink from it.'
  ],
  rowboat: ['A Rowboat', 'Moored, and bailed out, recently. Nobody has seen who keeps it.'],
  netFrame1: ['Drying Nets', 'Hung out to dry, and never dry. What is caught in the mesh is not fish.'],
  lobsterPots1: [
    'Lobster Pots',
    'Still baited. Something has been taking the bait and leaving the pots shut.'
  ],
  giantHead: INNER.deep_cut.lore.center,
  mineHead: [
    'The Pithead',
    'The winding gear over the deepest shaft in the Ward. The bucket comes up every hour, full of stone that was not there before.'
  ],
  scaffold1: [
    "Masons' Scaffold",
    'Built round the face of the great statue, to raise it. The rope still hangs from the pulley, and twitches.'
  ],
  masonBench: [
    "A Mason's Bench",
    'The block on it is half dressed. The chisel marks on the unfinished half are fresh.'
  ],
  grindstone: ['A Grindstone', 'It turns by itself, slowly, sharpening nothing.'],
  railH: [
    'The Ore Line',
    'Rails for the quarry carts. They run on into the Wound, and the carts that went down them came back empty.'
  ],
  rift: ['A Rift', 'The ground split here and never closed. Warm air breathes up out of it, in and out.'],
  iceFountain: INNER.winter_fair.lore.center,
  furTent: [
    "The Furrier's Tent",
    'The finest furs in the north, and a chest of coin under the counter. The furrier is still inside, frozen in the act of counting it.'
  ],
  stallFish: [
    'A Fish Stall',
    'The fish are frozen so fresh their eyes are still bright. One of them is watching you.'
  ],
  stallMeat: [
    "A Butcher's Stall",
    'Hams hang frozen from the beam. The frost on them grows in feathers, very slowly, toward the Wound.'
  ],
  stallStripe: ['A Bread Stall', 'Loaves under the ice, still steaming inside it.'],
  sledFurs: [
    'A Fur Sled',
    "Loaded and lashed for the road home, and the road home is the one way the snow won't let it go."
  ],
  iceCrystal1: [
    'Rime Crystal',
    'The ice has grown into spars of blue crystal taller than a man, and they ring faintly when the snow touches them.'
  ],
  graveAngel: INNER.necropolis.lore.center,
  tombGrand: [
    'The Great Tomb',
    "The tomb of the city's founding families. The doors stand open a hand's breadth. They were shut this morning."
  ],
  cryptGate: [
    'The Crypt Mouth',
    'The way down into the oldest catacombs. The bones by the door have been arranged, very neatly, by size.'
  ],
  cemeteryGate: [
    'The Cemetery Gate',
    'Two hooded keepers hold the braziers either side. The flames are violet and cold, and lean toward you as you pass.'
  ],
  tomb: [
    'A Family Tomb',
    'Someone has left fresh flowers on the step. Nobody living has been here in years.'
  ],
  brazier: [
    'A Grave Brazier',
    'Violet fire, burning on nothing. It gives no heat at all, and casts your shadow the wrong way.'
  ],
  gloomTree1: [
    'The Old Yew',
    'Dead, and hung with moss, and it still drops leaves. They are all the same leaf.'
  ],
  crowPost: [
    'A Crow on a Post',
    "It has been watching you since the gate. Crows here don't fly away. They wait."
  ],
  shadowPool3: [
    'A Pool of Shadow',
    'The paving gave way to darkness, flat and still. Things move in it, under the surface, at a great depth.'
  ]
};

module.exports = function inner(rects, outerId) {
  const D = INNER[INNER_IDS[outerId]],
    id = INNER_IDS[outerId],
    el = EL[id];
  // where the outer ring's arch is (you come through it), and where the Hollow runs, from the outer map itself
  const outer = outerId === 'cindergate' ? require('./cindergate')(rects) : sector(rects, outerId);
  const oarch = outer.objs.find(o => /^brokenArch/.test(o.kind) && o.y < 5 * T);
  const ARCH_X = oarch.x,
    AX0 = Math.round(ARCH_X / T) - 1;
  const m = new MapBuilder(rects, { id, name: 'Corvanthe: ' + NAMES[id], cols: 56, rows: 44, seed: D.seed });
  const { W, H } = m,
    r = m.r,
    rnd = (a, b) => a + r() * (b - a);
  m.palette = D.pal || null;
  m.fx = D.fx;
  m.haze = D.haze;
  m.windowGlow = D.glow;
  if (D.storm) m.storm = 1;
  m.music = outer.music;
  m.city = 1;
  m.depth = [0.55, 1];
  m.lore = {
    ...OWN_LORE,
    ...INNER_LORE,
    ...D.lore,
    wall: [
      'The Inner Barrier',
      'The far side of the barrier you came through. From in here it looks less like rubble and more like a wall someone built, in a hurry, to keep something in.'
    ],
    crane: OWN_LORE.quarryCrane,
    gallows: ['The Quarry Hoist', 'The rope is still running, slowly, up out of the ground.']
  };
  const G = { open: 'G', street: 'R', square: 'P', ...(D.ground || {}) };
  const sty = D.burnt
    ? k => (rects[k + '_burnt'] ? k + '_burnt' : k)
    : k => (rects[k + '_' + D.pal] ? k + '_' + D.pal : k);
  const ruin = (x, y) => Math.max(0, Math.min(1, 0.4 + 0.62 * (1 - y / H)));
  const city = new City(m, {
    street: G.street,
    square: G.square,
    ruin,
    style: variedStyle(rects, D.burnt ? 'burnt' : D.pal, D.seed + 77)
  });
  m.fill(0, 0, m.cols - 1, m.rows - 1, G.open);
  m.fill(0, 0, m.cols - 1, 0, 'X'); // the Wound, glimpsed over the Rim

  // ── streets: the Inner Circuit along the south, a street under the Rim, the avenue between the
  //    two gates, cross streets and lanes ──
  city.road(
    [
      [0, 38],
      [14, 38 + Math.round(rnd(-1, 1))],
      [28, 38],
      [42, 38 + Math.round(rnd(-1, 1))],
      [55, 38]
    ],
    { w: 2, bend: 1, wander: 0.8 }
  );
  city.road(
    [
      [0, 5],
      [18, 6],
      [36, 5],
      [55, 6]
    ],
    { w: 2, bend: 1, wander: 0.6 }
  );
  if (D.rails) {
    // the ore line: dead straight, for the rails
    m.railY = Math.round(rnd(17, 20));
    city.road(
      [
        [2, m.railY],
        [53, m.railY]
      ],
      { w: 1, bend: 0 }
    );
  }
  const LX = Math.round(rnd(20, 34));
  const avenue = [
    [AX0, 41],
    [AX0, 37]
  ];
  for (const y of [30, 22, 14]) avenue.push([Math.round(rnd(16, 38)), y]);
  avenue.push([LX, 5]);
  city.road(avenue, { w: 2, bend: 1, wander: 1.2 });
  const crossY = [Math.round(rnd(11, 14)), Math.round(rnd(21, 24)), Math.round(rnd(29, 32))].map(y =>
    D.rails && Math.abs(y - m.railY) < 3 ? y + 4 : y
  );
  for (const y of crossY) {
    const pts = [[0, y]];
    for (let x = 10; x < 55; x += Math.round(rnd(9, 14))) pts.push([x, y + Math.round(rnd(-2, 2))]);
    pts.push([55, y + Math.round(rnd(-1, 1))]);
    city.road(pts, { w: 2 });
  }
  const bands = [5, ...crossY, 38];
  for (let i = 0; i < bands.length - 1; i++)
    for (let n = 0; n < 3; n++) {
      const x = Math.round(rnd(3, 52));
      if (Math.abs(x - LX) < 5) continue;
      city.road(
        [
          [x, bands[i] + 1],
          [x + Math.round(rnd(-3, 3)), bands[i + 1]]
        ],
        { w: 1 }
      );
    }
  const mid = avenue[3],
    SQ = { x: mid[0] + 1.5, y: crossY[1] + 1 };
  city.square(SQ.x, SQ.y, rnd(3.8, 4.6), rnd(2.9, 3.4));
  city.square(rnd(8, 14), crossY[0] + 1, 2.4, 1.8, G.street);
  city.square(rnd(42, 48), crossY[2] + 1, 2.4, 1.8, G.street);
  // the Hollow: into the Wound from Cindergate, out of it through the Drowned Quarter to the sea (same columns as the outer ring)
  const gaps = [];
  if (D.river) gaps.push(riverWith(D.river.c0, D.river.flow, D.river.glow).gap);
  if (D.riverFromOuter) {
    const c0 = outer.k[2].indexOf('W');
    if (c0 >= 0) gaps.push(riverWith(c0, D.riverFromOuter).gap);
  }
  function riverWith(c0, flow, glow) {
    const rv = river(m, city, c0, c0 + 2, flow);
    m.fill(c0 - 2, 0, c0 + 4, 0, 'W'); // it pours over the Rim
    if (glow)
      for (let y = 3 * T; y < 42 * T; y += 150 + r() * 120)
        m.glows.push({ x: rv.mid(Math.floor(y / T)), y, r: 140, c: glow });
    return rv;
  }
  if (D.flood)
    for (let i = 0; i < 10; i++) {
      // flooded plots, where the boats are
      const cx = Math.round(rnd(4, 51)),
        cy = Math.round(rnd(8, 35));
      if (
        [...Array(4)].some((_, dy) =>
          [...Array(5)].some(
            (_, dx) => city.isStreet(cx + dx - 1, cy + dy - 1) || m.at(cx + dx - 1, cy + dy - 1) === 'W'
          )
        )
      )
        continue;
      m.fill(cx, cy, cx + Math.round(rnd(1, 3)), cy + Math.round(rnd(1, 2)), 'O');
    }

  // ── the square and its centrepiece ──
  const SX = SQ.x * T,
    SY = SQ.y * T;
  city.reserve(SX - 4.8 * T, SX + 4.8 * T, SY - 4.2 * T, SY + 3.4 * T);
  m.place(D.center, SX, SY + 30, { lore: 'center' });
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ])
    m.place(D.lamp, SX + dx * 200, SY + dy * 120 + 40);
  m.place('gravel', SX - 90, SY - 100, { lore: 'square' });

  // ── the Rim to the north: the barrier, and the Last Gate, barred ──
  const LAST_X = avenue[avenue.length - 1][0] * T + T;
  m.place('brokenArch', LAST_X, 4 * T + 20, { lore: 'lastGate' });
  const bits = D.burnt
    ? ['rubble2', 'rubble3', 'ruinWall1', 'rubble4', 'blocks1', 'slagHeap2', 'ruinWall2']
    : ['rubble2', 'rubble3', 'ruinWall1', 'rubble4', 'blocks1', 'rubble1', 'ruinWall2', 'rubble9'];
  m.wallRun(4 * T + 20, 0, W, [[LAST_X - 90, LAST_X + 90], ...gaps], bits);
  m.objs
    .filter(o => o.y < 5 * T && /^(rubble2|ruinWall1|blocks1)/.test(o.kind))
    .forEach((o, i) => {
      if (i % 3 === 0) o.lore = 'line';
    });
  m.blocks.push({ x: 0, y: 0, w: W, h: 4 * T + 24 });
  city.reserve(0, W, 0, 5 * T);
  for (let x = 60; x < W; x += 180 + r() * 110)
    m.glows.push({ x, y: T * 0.6 + r() * T, r: 220 + r() * 90, c: '170,80,255' }); // the Wound's light
  m.glows.push({ x: LAST_X, y: 3 * T, r: 320, c: '190,110,255' });
  for (let x = 80; x < W; x += 260 + r() * 140)
    m.glows.push({ x, y: 3 * T + r() * T, r: 160 + r() * 60, c: D.glow });
  // ── the barrier to the south, seen from inside, with the arch you came in by ──
  const WALL_Y = 42 * T + 30;
  m.place('brokenArch', ARCH_X, WALL_Y, { lore: 'archIn' });
  m.wallRun(
    WALL_Y,
    0,
    W,
    [[ARCH_X - 90, ARCH_X + 90], ...gaps],
    ['rubble2', 'ruinWall1', 'rubble3', 'wallLow1', 'ruinWall2', 'rubble4']
  );
  m.objs
    .filter(o => o.y > 42 * T && !/^brokenArch/.test(o.kind))
    .forEach((o, i) => {
      if (i % 5 === 2) o.lore = 'wall';
    });
  m.blocks.push({ x: 0, y: 42 * T + 40, w: W, h: 2 * T });
  city.reserve(0, W, 41 * T, H);

  // ── before the terraces: lava channels, holes onto the Wound, the ore line, rifts, the big pieces ──
  if (D.runs) for (let i = 0; i < D.runs; i++) lavaRun(m, city);
  if (D.pits) for (let i = 0; i < D.pits; i++) woundPit(m, city, i < 3);
  if (D.rails) railLine(m, city);
  for (const d of D.decals || []) if (d[3]) placeDecal(m, city, d, true);
  const spots = [
    [30, 10],
    [9, 18],
    [47, 12],
    [17, 33],
    [40, 30],
    [6, 30],
    [50, 34],
    [33, 19]
  ];
  D.land.forEach((k, i) => {
    const [tx, ty] = spots[i % spots.length],
      kk = sty(k);
    try {
      city.landmark(kk, tx, ty, m.lore[k] ? k : undefined);
    } catch (e) {
      /* no room: skip it */
    }
  });

  city.build({ gap: 0.1 });
  // hanging signs by some of the house fronts that still stand
  const fronts = m.objs.filter(o => /^house[1-4]/.test(o.kind));
  for (const o of fronts)
    if (r() < 0.22) {
      const s = m.size(o.kind),
        k = P.pick(r, D.signs && r() < 0.6 ? D.signs : SIGNS),
        ks = m.size(k);
      const x = o.x + s.w * 0.5 - ks.w * 0.15,
        y = o.y + 6;
      if (
        !m.boxes.some(b => P.overlap(b, { x: x - ks.w * 0.2, y: y - 10, w: ks.w * 0.15, h: 10 }, 2)) &&
        x + ks.w / 2 < W - 8
      )
        m.place(k, x, y);
    }

  // ── after: the district's props, the common ones, things drifting overhead, ground art ──
  for (const [k, n, where] of D.props) scatter(m, city, k, n, where);
  for (const [k, n] of COMMON)
    scatter(m, city, k, D.burnt && /^(cat|basket|handcartGreens|washLine)/.test(k) ? 0 : n);
  for (const [k, n] of D.float || []) {
    let left = n;
    for (let i = 0; i < n * 80 && left > 0; i++) {
      const x = T + r() * (W - 2 * T),
        y = 7 * T + r() * (H - 14 * T),
        s = m.size(k);
      if (m.objs.some(o => Math.abs(o.x - x) < s.w * 0.8 && Math.abs(o.y - y) < 60)) continue;
      const o = m.place(k, x, y);
      if (m.lore[k]) o.lore = k;
      left--;
    }
  }
  for (const d of D.decals || []) if (!d[3]) placeDecal(m, city, d, false);
  for (const o of m.objs) if (!o.decal && !HOUSE_RE.test(o.kind)) o.kind = sty(o.kind);
  if (D.burnt)
    for (const o of m.objs)
      if (/^(slagHeap|rubble|blocks)/.test(o.kind) && o.y > 5 * T && r() < 0.3)
        m.glows.push({ x: o.x, y: o.y - 20, r: 100 + r() * 60, c: '255,100,30' });

  // ── Echoes: veterans by the barrier, champions by the Rim ──
  const open = [];
  for (let y = 7; y < 37; y++)
    for (let x = 1; x < m.cols - 2; x++)
      if (city.isStreet(x, y) && city.isStreet(x + 1, y)) open.push([x, y]);
  let tries = 0;
  while (m.echoes.length < 18 && tries++ < 5000) {
    const [tx, ty] = open[Math.floor(r() * open.length)],
      x = (tx + 1) * T,
      y = ty * T + T / 2 + 10;
    if (Math.hypot(x - ARCH_X, y - 41 * T) < 7 * T) continue; // the arch you came in by stays quiet
    if (m.echoes.some(e => Math.hypot(e.x - x, e.y - y) < 7 * T)) continue;
    const v = ruin(x, y),
      e = echoEl(id, x, W, r),
      w = 'echo_' + e + '_weak',
      st = 'echo_' + e + '_strong';
    const foes =
      v < 0.62
        ? r() < 0.5
          ? [
              [st, 1],
              [w, 1]
            ]
          : [
              [w, 1],
              [w, 1],
              [w, 1]
            ]
        : v < 0.8
          ? r() < 0.5
            ? [
                [st, 2],
                [w, 2]
              ]
            : [
                [st, 1],
                [st, 1]
              ]
          : r() < 0.5
            ? [
                [st, 3],
                [w, 2],
                [w, 2]
              ]
            : [
                [st, 3],
                [st, 2]
              ];
    m.echoes.push({
      id: id.slice(0, 4) + m.echoes.length,
      el: e,
      foes,
      x: Math.round(x),
      y: Math.round(y),
      r: 150
    });
  }

  // ── ways out: back through the arch, and round the Inner Circuit ──
  m.spawns.arch = [ARCH_X, 40 * T + 20];
  m.exits.push({
    x: ARCH_X - 40,
    y: 42 * T + 14,
    w: 80,
    h: 40,
    dir: 'S',
    label: 'Corvanthe: ' + (outer.name.split(': ')[1] || outer.name),
    to: { map: outerId, spawn: 'inner' }
  });
  const i = INNER_RING.indexOf(id),
    west = INNER_RING[(i + 7) % 8],
    east = INNER_RING[(i + 1) % 8];
  m.spawns.west = [90, 38.5 * T + 10];
  m.spawns.east = [W - 90, 38.5 * T + 10];
  m.spawns.start = m.spawns.arch;
  m.exits.push({
    x: 0,
    y: 37 * T,
    w: 48,
    h: 4 * T,
    label: 'The Inner Circuit to ' + NAMES[west],
    to: { map: west, spawn: 'east' }
  });
  m.exits.push({
    x: W - 48,
    y: 37 * T,
    w: 48,
    h: 4 * T,
    label: 'The Inner Circuit to ' + NAMES[east],
    to: { map: east, spawn: 'west' }
  });
  m.objs
    .filter(o => o.kind.startsWith(sty(D.lamp)) && !o.lore)
    .slice(0, 1)
    .forEach(o => {
      o.lore = 'circuit';
    });
  return m;
};

// an Echo's element: the district's, but strays from next door near the ends of the Circuit
function echoEl(id, x, W, r) {
  const i = INNER_RING.indexOf(id);
  if (x < 10 * T && r() < 0.4) return EL[INNER_RING[(i + 7) % 8]];
  if (x > W - 10 * T && r() < 0.4) return EL[INNER_RING[(i + 1) % 8]];
  return EL[id];
}
// a prop on open ground (or on the flooded plots, where='O'), clear of everything
function scatter(m, city, k, n, where) {
  let left = n;
  for (let i = 0; i < n * 90 && left > 0; i++) {
    const px = 64 + m.r() * (m.W - 128),
      py = 7 * T + m.r() * (m.H - 13 * T);
    if (city.reserved.some(q => px > q.x0 && px < q.x1 && py > q.y0 && py < q.y1)) continue;
    let ok;
    if (where === 'O') {
      if (m.tileAt(px, py) !== 'O' || m.tileAt(px - 30, py) !== 'O' || m.tileAt(px + 30, py) !== 'O')
        continue;
      const o = { kind: k, x: px, y: py };
      ok = !P.footBoxes(m.rects, o).some(b => m.boxes.some(c => P.overlap(b, c, 10)));
      if (ok) m.place(k, px, py);
    } else ok = m.tryPlace(k, px, py, 12);
    if (ok) {
      left--;
      const o = m.objs[m.objs.length - 1];
      if (m.lore[k]) o.lore = k;
    }
  }
}
// flat ground art: on a street, or on open ground (`block`: can't be crossed, and claimed before the houses)
function placeDecal(m, city, [k, n, where, block], early) {
  const s = m.size(k);
  let left = n;
  for (let i = 0; i < n * 220 && left > 0; i++) {
    const x = T + m.r() * (m.W - 2 * T),
      y = 7 * T + m.r() * (m.H - 13 * T);
    const x0 = x - s.w / 2,
      x1 = x + s.w / 2,
      y0 = y - s.h;
    const ok = (px, py) => {
      const tx = Math.floor(px / T),
        ty = Math.floor(py / T),
        c = m.at(tx, ty);
      return where === 'street'
        ? city.isStreet(tx, ty)
        : !city.isStreet(tx, ty) && !['W', 'O', 'X'].includes(c);
    };
    if (
      ![
        [x0, y0],
        [x1, y0],
        [x0, y],
        [x1, y],
        [x, y - s.h / 2],
        [x0, y - s.h / 2],
        [x1, y - s.h / 2]
      ].every(([px, py]) => ok(px, py))
    )
      continue;
    const box = { x: x0, y: y0, w: s.w, h: s.h };
    if (m.boxes.some(b => P.overlap(b, box, 8))) continue;
    if (city.reserved.some(q => x0 < q.x1 && x1 > q.x0 && y0 < q.y1 && y > q.y0)) continue;
    if (m.objs.some(o => o.decal && Math.abs(o.x - x) < s.w && Math.abs(o.y - y) < s.h)) continue;
    const o = m.place(k, x, y, { decal: 1 });
    if (m.lore[k]) o.lore = k;
    if (block) m.blocks.push({ x: x0 + s.w * 0.15, y: y0 + s.h * 0.22, w: s.w * 0.7, h: s.h * 0.56 });
    if (early) city.reserve(x0 - 20, x1 + 20, y0 - 20, y + 20);
    left--;
  }
}
// a quench channel full of lava: a fire spring at its head, channel pieces running east, a rounded end
function lavaRun(m, city) {
  const body = m.size('lavaRun'),
    tail = m.size('lavaEnd'),
    head = m.size('lavaSpring');
  for (let i = 0; i < 400; i++) {
    const n = 2 + Math.floor(m.r() * 3),
      len = head.w * 0.7 + n * body.w + tail.w;
    const x0 = T + m.r() * (m.W - 2 * T - len),
      cy = 8 * T + m.r() * (m.H - 16 * T);
    const box = { x: x0 - 10, y: cy - head.h, w: len + 20, h: head.h + 50 };
    let clear = true;
    for (let px = box.x; px <= box.x + box.w && clear; px += T / 2)
      for (let py = box.y; py <= box.y + box.h; py += T / 2) {
        const tx = Math.floor(px / T),
          ty = Math.floor(py / T);
        if (city.isStreet(tx, ty) || m.at(tx, ty) === 'W') {
          clear = false;
          break;
        }
      }
    if (
      !clear ||
      m.boxes.some(b => P.overlap(b, box, 6)) ||
      city.reserved.some(q => box.x < q.x1 && box.x + box.w > q.x0 && box.y < q.y1 && box.y + box.h > q.y0)
    )
      continue;
    let x = x0 + head.w * 0.7;
    m.place('lavaSpring', x0 + head.w / 2, cy + head.h * 0.3, { lore: 'lavaSpring' });
    for (let j = 0; j < n; j++) {
      m.place('lavaRun', x + body.w / 2, cy + body.h / 2, {
        decal: 1,
        lore: j === 0 ? 'lavaRun' : undefined
      });
      x += body.w - 2;
    }
    m.place('lavaEnd', x + tail.w / 2, cy + tail.h / 2, { decal: 1 });
    m.blocks.push({
      x: x0 + head.w * 0.6,
      y: cy - body.h * 0.32,
      w: x + tail.w - (x0 + head.w * 0.6) - 8,
      h: body.h * 0.64
    });
    m.glows.push({ x: x0 + len / 2, y: cy, r: len * 0.5, c: '255,120,40' });
    city.reserve(box.x, box.x + box.w, box.y - 20, box.y + box.h);
    return;
  }
}
// a hole torn in the ground where the street floated off, onto the Wound's light; `bridged` ones
// are on a cross street, with a rope bridge you can walk over; the rest are pits in the yards
function woundPit(m, city, bridged) {
  for (let i = 0; i < 600; i++) {
    const tx = 2 + Math.floor(m.r() * (m.cols - 7)),
      ty = 8 + Math.floor(m.r() * 26),
      w = 3 + Math.floor(m.r() * 2);
    if (bridged) {
      // a two-tile-high run of street, w long, with open ground above and below it
      let ok = true;
      for (let x = tx - 1; x <= tx + w && ok; x++)
        ok =
          city.isStreet(x, ty) &&
          city.isStreet(x, ty + 1) &&
          !city.isStreet(x, ty - 1) &&
          !city.isStreet(x, ty + 2) &&
          !city.isStreet(x, ty + 3) &&
          !city.isStreet(x, ty - 2);
      if (!ok) continue;
      const box = { x: tx * T, y: (ty - 1) * T, w: w * T, h: 4 * T };
      if (
        m.boxes.some(b => P.overlap(b, box, 6)) ||
        m.objs.some(
          o => o.decal && Math.abs(o.x - (tx + w / 2) * T) < 6 * T && Math.abs(o.y - ty * T) < 4 * T
        )
      )
        continue;
      m.fill(tx, ty - 1, tx + w - 1, ty + 1, 'X');
      const span = w * T + 90,
        sc = span / m.rects.ropeBridge[2],
        s = m.size('ropeBridge', sc);
      m.place('ropeBridge', (tx + w / 2) * T, (ty + 1) * T + s.h * 0.42, {
        scale: sc,
        decal: 1,
        lore: 'pitBridge'
      });
      m.walk.push({ x: tx * T - 8, y: ty * T - 4, w: w * T + 16, h: 2 * T + 8 });
      city.reserve(tx * T - T, (tx + w + 1) * T, (ty - 2) * T, (ty + 6) * T); // nothing below it either: it would stand over the hole
      m.lore.pitBridge = [
        'A Rope Bridge',
        'The street floated away from under the houses here, and the gleaners strung a bridge across. Below it there is no ground at all: just violet light, a long way down.'
      ];
      return;
    }
    const h = 2 + Math.floor(m.r() * 2);
    let ok = true;
    for (let y = ty - 1; y <= ty + h && ok; y++)
      for (let x = tx - 1; x <= tx + w; x++)
        if (city.isStreet(x, y) || m.at(x, y) !== 'G') {
          ok = false;
          break;
        }
    if (!ok) continue;
    const box = { x: (tx - 0.5) * T, y: (ty - 0.5) * T, w: (w + 1) * T, h: (h + 1) * T };
    if (
      m.boxes.some(b => P.overlap(b, box, 6)) ||
      city.reserved.some(q => box.x < q.x1 && box.x + box.w > q.x0 && box.y < q.y1 && box.y + box.h > q.y0)
    )
      continue;
    m.fill(tx, ty, tx + w - 1, ty + h - 1, 'X');
    city.reserve(box.x, box.x + box.w, box.y, box.y + box.h + T);
    m.glows.push({ x: (tx + w / 2) * T, y: (ty + h / 2) * T, r: 150, c: '170,80,255' });
    return;
  }
}
// the ore line: rails along the dead-straight street, an ore cart or two on them, a crossing where the avenue meets it
function railLine(m, city) {
  const y = m.railY,
    sc = (2 * T) / m.rects.railH[2],
    s = m.size('railH', sc);
  let first = true;
  for (let x = 2; x < 54; x += 2) {
    if (!city.isStreet(x, y) || !city.isStreet(x + 1, y)) continue;
    const vert = city.isStreet(x, y - 1) && city.isStreet(x, y + 1) && city.isStreet(x + 1, y - 1);
    const k = vert ? 'railCross' : 'railH',
      ss = vert ? m.size('railCross', (2 * T) / m.rects.railCross[2]) : s;
    m.place(k, (x + 1) * T, (y + 0.5) * T + ss.h / 2, {
      scale: vert ? (2 * T) / m.rects.railCross[2] : sc,
      decal: 1,
      lore: first ? 'railH' : undefined
    });
    first = false;
  }
  for (const fx of [0.3, 0.72]) {
    const x = Math.round(m.cols * fx) * T;
    if (city.isStreet(Math.floor(x / T), y)) m.place('oreCart', x, (y + 0.5) * T + 20);
  }
}
module.exports.INNER = INNER;
module.exports.INNER_IDS = INNER_IDS;
module.exports.INNER_RING = INNER_RING;
module.exports.NAMES = NAMES;
