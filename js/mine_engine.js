// ═══════════════════════════════════════════════════════════════════════
// THE STONEHEART DELVE: Durin's mine at Stonedeep (rules; the screen is js/mine.js).
// Design: docs/mine-design.md. Pure: no DOM, runs in Node (tools/mine_sim.js).
// Build step 1: one layer, digging, dwarves walking and hauling, stockpiles, rooms and furniture,
// food / ale / sleep, the Ledger of Grudges, the Mason's Eye. No cave-ins, quotas or elementals yet.
// Every number is at the top.
// ═══════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  // Five layers, stacked in one tall grid: each layer is LH rows, with a row of bedrock between layers
  // (never dug, never shown), so a tile's x and y mean the same on every layer and a layer is a band of rows.
  // Stairs link the layers (S.links), so paths and hauls run through them.
  const W = 36,
    LH = 26,
    STRIDE = LH + 1;
  // roof: the roof holds this many tiles from rock, a pillar or a wall (an open span of twice that is safe)
  const LAYERS = [
    {
      name: 'The Topstone',
      stone: 'granite',
      roof: 3,
      hard: 0,
      quota: { copper: 8, tin: 6 },
      gen: [
        ['blob', 'soil', 2, 1.8, 2.8, true],
        ['vein', 'cu', 4, 10, 16],
        ['vein', 'sn', 3, 8, 13],
        ['blob', 'c', 3, 1.2, 2.0]
      ]
    },
    {
      name: 'The Ironroots',
      stone: 'basalt',
      roof: 4,
      hard: 0.15,
      quota: { iron: 10 },
      gen: [
        ['blob', 'soil', 2, 1.5, 2.4],
        ['vein', 'fe', 4, 10, 16],
        ['blob', 'c', 3, 1.2, 2.0],
        ['blob', 'li', 2, 1.5, 2.5]
      ]
    },
    {
      name: 'The Glimmerdark',
      stone: 'quartz-shot stone',
      roof: 2,
      hard: 0.25,
      quota: { silver: 6, gems: 3 },
      gen: [
        ['vein', 'ag', 3, 8, 12],
        ['blob', 'gm', 3, 0.9, 1.5],
        ['vein', 'ga', 2, 6, 10]
      ]
    },
    {
      name: 'The Emberdeep',
      stone: 'hot stone',
      roof: 2,
      hard: 0.35,
      quota: { gold: 6 },
      gen: [
        ['vein', 'au', 3, 8, 12],
        ['blob', 'c', 2, 1.2, 2.0]
      ]
    },
    {
      name: 'The Heartstone',
      stone: 'living rock',
      roof: 3,
      hard: 0.45,
      quota: { heartsilver: 3 },
      gen: [
        ['blob', 'hs', 2, 1.0, 1.6],
        ['vein', 'au', 1, 8, 8]
      ]
    }
  ];
  const H = LAYERS.length * STRIDE - 1;
  const layerOf = y => Math.max(0, Math.min(LAYERS.length - 1, Math.floor(y / STRIDE)));
  const topOf = z => z * STRIDE;

  const STEP = 0.1; // game seconds a simulation step
  const DAY = 240; // game seconds in a day at ×1 (four minutes)
  // Cave-ins: every CAVE.check seconds the roof is looked over; a span unsound for CAVE.grace may come down
  // (CAVE.chance a look), never before CAVE.start. Anyone under it dies CAVE.kill of the time, else is hurt.
  const CAVE = { check: 10, grace: DAY * 0.5, chance: 0.08, start: DAY * 0.75, kill: 0.3 };
  const STAIR_STEPS = 6; // a stair counts as this many tiles of walking (it's a long way down)
  const RUBBLE_DIG = 0.6; // rubble digs this fraction of soft rock's time
  const DAMP = 4; // damp patches on each layer
  const MOURN_S = 5; // a mourning dwarf's visit to the Wall of Remembrance
  const START_HOUR = 6; // the first day starts at 06:00
  const WALK = 3.2; // tiles a second
  const DIG_S = [0, 2.5, 4, 6]; // seconds to dig rock of hardness 1 / 2 / 3 (a novice)
  const ORE_DIG = 1.5; // ore takes this much longer
  const BUILDS = {
    wall: { name: 'wall', inRoom: false },
    pillar: { name: 'pillar', inRoom: true },
    door: { name: 'door', inRoom: true },
    well: { name: 'well', inRoom: true, damp: true } // only on a damp spot
  };
  const SMOOTH_S = 3.5,
    BUILD_S = 4,
    PLANT_S = 2.5,
    HARVEST_S = 2,
    BREW_S = 6,
    EAT_S = 4,
    DRINK_S = 3;
  const SLEEP_S = DAY * 0.22; // a night's sleep
  const GROW_S = DAY * 0.45; // planted to ripe
  const HARVEST = { cap: 2, barley: 2 }; // what a ripe soil tile gives (they alternate)
  const BREW_ALE = 3; // ale from one barley
  const STONE_CHANCE = 0.35; // a dug rock tile leaves a stone block this often (ore always leaves ore)
  const NEED = { food: DAY * 1.0, ale: DAY * 1.4, sleep: DAY * 1.2 }; // seconds for a need to fall from 100 to 0
  const LOW = { food: 35, ale: 35, sleep: 25 }; // a dwarf sees to a need below this
  const BED_WORTH = { bedroom: 100, dorm: 50, star: 10 }; // a private bedroom always beats a dormitory
  const BED_NEAR = 0.2; // a tile's walk counts this much against a bed
  const BED_MOVE = 5; // a dwarf moves beds only for one this much better
  const GRACE = DAY * 1.5; // no grudges for floor meals or floor beds before this (time to build)
  const GRUDGE_DAYS = 3; // an unsettled grudge fades after this many days
  const GRUMBLE = 3,
    DOWN_TOOLS = 5; // open grudges at which a dwarf works slowly / stops working
  const GRUMBLE_SPEED = 0.6;
  const LEVELS = [
    { name: 'Novice', xp: 0, speed: 1 },
    { name: 'Journeyman', xp: 40, speed: 1.3 },
    { name: 'Master', xp: 140, speed: 1.6 }
  ];
  const PROSPECT_R = 5; // Durin's prospecting reveals this radius, once a day
  const START_STOCK = {
    food: 36,
    ale: 28,
    stone: 4,
    block: 0,
    copper: 0,
    tin: 0,
    coal: 0,
    barley: 0,
    meal: 0,
    bronze: 0,
    pick: 0,
    water: 6 // the wagon's water barrels, enough for the first brews
  };
  // Rough stone (from digging) is cut into dressed blocks at a mason's workshop; everything built takes a
  // block, except the workshop's own bench, which is roughed out of rough stone (or there'd be no first bench)
  const CUT_S = 3; // seconds to cut a block (a novice)
  const BLOCK_SPARE = 3; // the mason keeps this many blocks cut ahead of the building ordered
  // Crafts: a dwarf of the trade fetches what the recipe takes from the stock to the room's furniture, works it,
  // and leaves what it makes there to be hauled. Each is made only while it's wanted.
  const RECIPES = {
    cut: {
      at: 'bench',
      takes: { stone: 1 },
      makes: { block: 1 },
      s: 3,
      act: 'Cutting stone blocks',
      want: S => blocksWanted(S) > 0
    },
    brew: {
      at: 'still',
      takes: { barley: 1, water: 1 },
      makes: { ale: 3 },
      s: 6,
      act: 'Brewing',
      want: () => true
    },
    // water: drawn from a well (dug on a damp spot), or, with no well, meltwater fetched from outside the
    // gate, slowly. Wells never freeze or fail: the Delve has no winter, and the crew drink ale, not water.
    draw: {
      atTile: (S, i, t) => t.wl,
      takes: {},
      makes: { water: 2 },
      s: 3,
      act: 'Drawing water at the well',
      want: S => waterWanted(S)
    },
    melt: {
      atTile: (S, i) => S.gate.includes(i),
      takes: {},
      makes: { water: 1 },
      s: 30, // out of the gate and down to the beck and back
      act: 'Fetching meltwater from outside',
      want: S => waterWanted(S) && !S.tiles.some(t => t.wl)
    },
    // two deepcaps make three meals: a kitchen stretches the food as well as pleasing the crew
    cook: {
      at: 'hearth',
      takes: { food: 2 },
      makes: { meal: 3 },
      s: 5,
      act: 'Cooking',
      want: S => stockOf(S, 'meal') < S.dwarves.length * 2
    },
    smelt: {
      at: 'anvil',
      takes: { copper: 1, tin: 1, coal: 1 },
      makes: { bronze: 2 },
      s: 7,
      act: 'Smelting bronze',
      want: S => stockOf(S, 'bronze') < 2
    },
    hammer: {
      at: 'anvil',
      takes: { bronze: 2 },
      makes: { hammer: 1 },
      s: 8,
      act: 'Forging a war-hammer',
      want: S => gearWanted(S, 'w', 1)
    },
    ironhammer: {
      at: 'anvil',
      takes: { iron: 2, coal: 1 },
      makes: { ironhammer: 1 },
      s: 10,
      act: 'Forging an iron war-hammer',
      want: S => gearWanted(S, 'w', 2)
    },
    mail: {
      at: 'anvil',
      takes: { iron: 3, coal: 1 },
      makes: { mail: 1 },
      s: 12,
      act: 'Forging iron mail',
      want: S => gearWanted(S, 'a', 1)
    },
    rune: {
      at: 'bench',
      takes: { block: 1 },
      makes: { rune: 1 },
      s: 6,
      act: 'Cutting a rune-stone',
      want: S => S.soldiersCame && stockOf(S, 'rune') < RUNES.keep
    },
    // the runesmith's (a trade that only comes by application): silver runes, and Air in a hammer's head
    silverrune: {
      at: 'runeanvil',
      takes: { block: 1, silver: 1 },
      makes: { silverrune: 1 },
      s: 8,
      act: 'Inlaying a silver rune',
      want: S => S.depth >= 2 && stockOf(S, 'silverrune') < RUNES.keepSilver
    },
    airhammer: {
      at: 'runeanvil',
      takes: { iron: 2, galestone: 1, silver: 1 },
      makes: { airhammer: 1 },
      s: 14,
      act: 'Setting Air in a hammer',
      want: S => gearWanted(S, 'w', 3)
    },
    forge: {
      at: 'anvil',
      takes: { bronze: 1 },
      makes: { pick: 1 },
      s: 6,
      act: 'Forging a pick',
      want: S => stockOf(S, 'pick') < 2
    }
  };
  // picks wear out; a miner without one digs at NO_PICK. The crew arrive with old iron picks.
  const PICKS = {
    old: { name: 'old iron pick', speed: 1, uses: 70 },
    bronze: { name: 'bronze pick', speed: 1.4, uses: 90 }
  };
  const NO_PICK = 0.45;
  // digging hard rock (hardness 3) or ore now and then hurts a dwarf: they work at HURT_SPEED until healed
  const HURT_CHANCE = 0.04;
  const HURT_SPEED = 0.5;
  const HEAL_COT = DAY * 0.25; // abed in an infirmary cot
  const HEAL_WALK = DAY * 1.5; // walking it off with no cot
  const TAVERN_SETTLE = 0.4; // a drink at the tavern's keg strikes out a grudge this often
  // earth elementals (step 3): kinds, where they sleep and wander, how fights go
  // every dwarf starts at DWARF_HP; a warrior's training and fighting (d.fx) builds it up to WARRIOR_HP
  // by the veteran level (FIGHT.levels[2]), and they keep it if stood down
  const DWARF_HP = 30;
  const WARRIOR_HP = 50;
  const FOES = {
    wight: { name: 'shard-wight', hp: 30, atk: 3, speed: 1.6, col: '#a8acb4' },
    stonewake: { name: 'stonewake', hp: 80, atk: 9, speed: 1.2, col: '#8a7a68' },
    crystal: { name: 'crystal wight', hp: 55, atk: 7, speed: 1.5, col: '#c8a0ff' },
    ember: { name: 'ember-wake', hp: 70, atk: 10, speed: 1.4, col: '#ff8a40' }
  };
  const CHAMBERS = [2, 2, 3, 3, 3]; // sleeping hollows on each layer
  const CHAMBER_FOES = [
    ['wight'],
    ['wight', 'stonewake'],
    ['crystal', 'stonewake'],
    ['ember', 'stonewake'],
    ['stonewake', 'ember']
  ];
  const WANDER_FOES = [
    ['wight'],
    ['wight', 'wight', 'stonewake'],
    ['wight', 'crystal'],
    ['ember', 'wight'],
    ['stonewake', 'ember']
  ];
  // the first wanderer `first` after the soldiers come, then one every `every`, sooner the deeper
  const WANDER = { first: DAY, every: DAY * 2, deeper: 0.25 };
  const TREMOR = { r: 3, again: DAY * 0.4, show: 25 }; // dig within r of a hollow and it trembles
  const FOE_ROCK = 0.6; // an elemental swims through rock at this fraction of its speed
  const FOE_SIGHT = 40; // how far (in tiles of its own path) an elemental looks for prey
  const FOE_GIVE_UP = DAY * 0.5; // a wanderer with no way in sinks back after this
  const FLEE_R = 7;
  const FLEE_RUN = 24; // how far a fleeing dwarf will run, in steps
  const WAR_R = 15; // a warrior goes after an elemental this close on their layer // a dwarf who isn't a warrior runs from an elemental this close
  const FIGHT = { tick: 1.5, base: 1, pick: 2, warrior: 4, retreat: 0.4, levels: [0, 30, 90] }; // fists, a miner's pick; combat levels
  const GEAR = {
    hammer: { name: 'bronze war-hammer', hit: 8, slot: 'w', rank: 1 },
    ironhammer: { name: 'iron war-hammer', hit: 12, slot: 'w', rank: 2 },
    // strikes as Air, the earth elementals' opposite: half again on anything that rises from the stone
    airhammer: { name: 'Air-runed war-hammer', hit: 18, slot: 'w', rank: 3 },
    mail: { name: 'iron mail', take: 0.6, slot: 'a', rank: 1 }
  };
  const maxHp = d => DWARF_HP + (WARRIOR_HP - DWARF_HP) * Math.min(1, (d.fx || 0) / FIGHT.levels[2]);
  const TRAIN_S = 20; // a warrior's stint at the barracks' racks
  const SERVE_S = 30; // a keeper's stint behind the bar before looking round
  // a taproom only slakes thirst. A pint at a tavern (with its keeper behind the bar) leaves a dwarf merry
  // for MERRY.s: working MERRY.speed faster, and shrugging off the next everyday grudge (not grief or a cave-in)
  const MERRY = { s: DAY, speed: 1.15 };
  const DEEP_GRUDGES = /^(Mourning |The roof came down)/; // too heavy to shrug off
  const GREAT_HALL_MIN = 40; // tiles of floor a Great Hall needs
  const EYE_MIN_FLOOR = 30; // the Mason's Eye judges once there's this much worked floor

  const ROOMS = {
    stockpile: { name: 'Stockpile', col: '#c9a04a', furn: null, open: true },
    bedroom: { name: 'Bedroom', col: '#6f8fd0', furn: 'bed', count: () => 1, good: 4 },
    workshop: {
      name: "Mason's workshop",
      col: '#a8a098',
      furn: 'bench',
      count: () => 1,
      good: 6,
      open: true
    },
    dorm: {
      name: 'Dormitory',
      col: '#5a78b0',
      furn: 'bed',
      count: a => Math.max(1, Math.ceil(a / 3)),
      good: 9
    },
    dining: {
      name: 'Dining hall',
      col: '#d07a4a',
      furn: 'table',
      count: a => Math.max(1, Math.ceil(a / 6)),
      good: 12
    },
    farm: { name: 'Mushroom farm', col: '#6aa84f', furn: null, good: 6, open: true },
    brewery: { name: 'Brewery', col: '#a0702a', furn: 'still', count: () => 1, good: 4, open: true },
    kitchen: { name: 'Kitchen', col: '#d0a060', furn: 'hearth', count: () => 1, good: 4, open: true },
    forge: { name: 'Forge', col: '#c05030', furn: 'anvil', count: () => 1, good: 6, open: true },
    tavern: {
      name: 'Tavern hall',
      col: '#b05a7a',
      furn: 'keg',
      count: a => Math.max(1, Math.ceil(a / 8)),
      good: 9
    },
    // a taproom: kegs in an open room, no door wanted, but never as good as a tavern
    taproom: {
      name: 'Taproom',
      col: '#8a5a6a',
      furn: 'keg',
      count: a => Math.max(1, Math.ceil(a / 8)),
      good: 6,
      open: true
    },
    infirmary: {
      name: 'Infirmary',
      col: '#e0e0e0',
      furn: 'cot',
      count: a => Math.max(1, Math.ceil(a / 4)),
      good: 8
    },
    barracks: {
      name: 'Barracks',
      col: '#8a8aa8',
      furn: 'rack',
      count: a => Math.max(1, Math.ceil(a / 4)),
      good: 12
    },
    runehall: {
      name: "Runesmith's hall",
      col: '#7ab0d8',
      furn: 'runeanvil',
      count: () => 1,
      good: 6,
      open: true
    },
    memorial: {
      name: 'Wall of Remembrance',
      col: '#9aa8c0',
      furn: 'plaque',
      count: () => 1,
      good: 4,
      open: true
    },
    greathall: {
      name: 'Great Hall',
      col: '#e8c050',
      furn: 'table',
      count: a => Math.max(1, Math.ceil(a / 6)),
      good: 60,
      one: true,
      min: GREAT_HALL_MIN
    }
  };
  const TRADES = {
    miner: { name: 'Miner', col: '#c8c8c8', icon: '⛏' },
    mason: { name: 'Mason', col: '#d8b070', icon: '🧱' },
    farmer: { name: 'Farmer', col: '#7cc060', icon: '🍄' },
    brewer: { name: 'Brewer', col: '#d0a040', icon: '🍺' },
    smith: { name: 'Smith', col: '#e07040', icon: '🔨' },
    // comes up from Stonedeep when the first tavern is furnished (hireKeeper); a tavern only pours while
    // its keeper is behind the bar. A taproom's kegs serve themselves.
    keeper: { name: 'Tavern keeper', col: '#c05a7a', icon: '🍻' },
    // the Thane's two soldiers, sent up once the delve is under way and before the first elemental can
    // rise (SOLDIERS); their whole job is to train at the barracks and guard the crew, and they can't stand down
    soldier: { name: 'Soldier', col: '#b04040', icon: '🛡' },
    // trades that only come by application (SPECIAL)
    bonesetter: { name: 'Bonesetter', col: '#e8dcc8', icon: '🩹' },
    runesmith: { name: 'Runesmith', col: '#7ab0d8', icon: '💠' },
    engraver: { name: 'Engraver', col: '#c8b0e0', icon: '🖋' }
  };
  // the soldiers' arrival, a scripted event: once the hold can feed them (a farm sown, a well sunk and a
  // brewery's still furnished: soldiersReady), or at SOLDIERS.late whatever, or at once if something wakes
  // in a hollow. Wanderers only rise WANDER.first after they've come, so the soldiers always come first.
  const SOLDIERS = { late: DAY * 6, n: 2, fx: 30, gear: { w: 'hammer' } };
  const GUARD_S = 20; // a soldier's watch beside the crew before looking round
  // ── Newcomers (step 5): every WAVE.every from WAVE.first a party comes up from Stonedeep. The dead are
  // replaced, trade for trade, on the first wave a day after they fell (WAVE.mourn); and the Delve's
  // renown (renown()) brings more on top, by RENOWN_TIERS, up to WAVE.max dwarves in all. Each newcomer
  // brings WAVE.bring of food and ale, so a wave doesn't empty the stores the day it comes.
  const LETTERS = {
    first: DAY * 3,
    every: DAY * 2,
    road: DAY * 0.25, // an accepted applicant's walk up from Stonedeep
    safe: 14, // no one walks in while an awake elemental is this close to the gate
    kinMax: 2, // kin of the dead in a letter at most
    mourn: DAY,
    max: 20,
    bring: { food: 4, ale: 3 }
  };
  const ORDINARY = ['miner', 'miner', 'mason', 'farmer', 'brewer', 'smith'];
  // trades that only come by application, once the Delve can use them and has the renown
  const SPECIAL = {
    soldier: { renown: 12, max: 4 },
    bonesetter: {
      renown: 12,
      max: 1,
      needs: S => S.rooms.some(r => r.type === 'infirmary'),
      lacks: 'an infirmary'
    },
    runesmith: { renown: 20, max: 1, needs: S => S.depth >= 2, lacks: 'the Glimmerdark opened' },
    engraver: { renown: 28, max: 2 }
  };
  const PITCH = {
    miner: [
      'I can follow a vein by the sound of it.',
      'Twenty years at the face, and both hands still.',
      'Give me hard rock and a good pick.'
    ],
    mason: ['I cut true, and I cut fast.', 'Every block I lay is square.', 'I set the arches at Coldforge.'],
    farmer: [
      'Deepcaps grow fat for me.',
      'I can feed a hold from a damp cellar.',
      'I know my barley from my bracket.'
    ],
    brewer: [
      'My ale is spoken of at Anvilmoot.',
      "Barley, water and patience: that's all it takes.",
      'No dwarf goes thirsty where I brew.'
    ],
    smith: [
      'I can smelt anything that comes out of a hill.',
      'My hammers ring true.',
      'Bronze, iron, whatever you dig.'
    ],
    soldier: [
      'I stood the Gate at Stonedeep three winters.',
      "I've broken stonewakes before.",
      'Point me at what wakes.'
    ],
    bonesetter: [
      'I set bones and stitch cuts; your hurt will mend twice as fast.',
      'I tended the miners at Coldforge.'
    ],
    runesmith: [
      "I set runes in silver, and Air in a hammer's head.",
      "Galestone sings for me. I can make your warriors' hammers tear stone."
    ],
    engraver: [
      "Smooth walls are a waste of stone till they're carved.",
      'I carve the old tales in the rock. The hold will talk of it.'
    ]
  };
  // what kin of the dead say: {dead} is the fallen, {kin} how the applicant was related (by their sex)
  const KIN_LINES = [
    '{dead} was my {kin}. Let me finish their work.',
    "I am {dead}'s {kin}. I would take up where they fell.",
    '{dead} wrote to me of the Delve before the end. I want to see it.',
    'My {kin} {dead} died down there. Someone of our blood should carry on.'
  ];
  const KIN = { m: ['brother', 'cousin', 'son', 'uncle'], f: ['sister', 'cousin', 'daughter', 'aunt'] };
  const ENGRAVE_S = 25;
  const TEND_S = 30;
  // renown at or above each figure brings one more newcomer a wave (0 at the bottom)
  const RENOWN_TIERS = [12, 28, 48, 72];
  const RENOWN_W = {
    eye: 0.12,
    pattern: 3,
    star: 1,
    starCap: 16,
    layer: 6,
    bound: 3,
    slain: 1,
    slainCap: 12,
    engrave: 1 / 6, // a point for every six walls carved
    engraveCap: 14,
    dead: -4
  };
  // ── Durin's binding (step 4): Durin is the one who binds an elemental, once it's worn down below `at` of
  // its strength. He chants for BIND.s[kind] seconds (×`worked` with no raw rock beside it, where it can't
  // slip away; in a raw tunnel it may slip into the stone, `slip` a second). It costs a rune-stone (a silver
  // rune for the big ones from the Glimmerdark down, `silver`), taken as he starts. Struck for `breakAt` or
  // more while he chants, the binding breaks and the elemental is enraged (`rage`: hits ×`rageMul`). A bound
  // elemental serves as a stone-servant for SERVANT.s, digging marked rock, then sinks back at peace.
  const BIND = {
    at: 0.5,
    s: { wight: 6, stonewake: 12, crystal: 10, ember: 14 },
    worked: 0.6,
    slip: 0.04,
    silver: { crystal: true, ember: true },
    breakAt: 10,
    standOff: 3.5, // how close he comes before it's worn down
    rage: DAY * 0.25,
    rageMul: 1.5
  };
  const SERVANT = { s: DAY * 2, dig: 3, speed: 2 }; // a stone-servant digs a marked tile every `dig` seconds
  // Durin fights with his runes when he isn't binding; downed, he's carried to Stonedeep for `rest`
  const DURIN = { hp: 60, hit: 6, rest: DAY * 0.5 };
  const RUNES = { keep: 2, keepSilver: 1 };
  // no name shared with the hero creator's dwarf names (js/explore_hero.js DWARF_NAMES), the roster or townsfolk
  const NAMES = {
    m: ['Odric', 'Fennick', 'Varrin', 'Tobbe', 'Ambrin', 'Esko', 'Grell', 'Hobb', 'Dunmar', 'Ottar'],
    f: ['Mabbet', 'Wenneth', 'Agga', 'Fridda', 'Osla', 'Tamsa', 'Berrit', 'Hesk', 'Ulla', 'Merra']
  };
  const SURNAMES = [
    'Flintbrow',
    'Cragmantle',
    'Copperbraid',
    'Coalbuckle',
    'Tinwhistle',
    'Gravelbeard',
    'Slatefoot',
    'Orebright',
    'Lampwick',
    'Deepbuckle',
    'Ironcask',
    'Seamfinder'
  ];
  const START_CREW = ['miner', 'miner', 'miner', 'mason', 'farmer', 'brewer', 'smith'];
  const ORES = {
    cu: { name: 'copper', col: '#d0783a' },
    sn: { name: 'tin', col: '#a8b8c8' },
    c: { name: 'coal', col: '#1a1a1a' },
    fe: { name: 'iron', col: '#a0583c' },
    li: { name: 'limestone', col: '#e0dcc8' },
    ag: { name: 'silver', col: '#e8eef4' },
    gm: { name: 'gems', col: '#4ad0a0' },
    ga: { name: 'galestone', col: '#a0e0ff' },
    au: { name: 'gold', col: '#f0c838' },
    hs: { name: 'heartsilver', col: '#c8a0ff' }
  };
  const ORE_ITEMS = new Set(Object.values(ORES).map(o => o.name));

  // The Mason's Eye: weights of its parts (0–1 each; a part with nothing to judge drops out)
  const EYE_W = { lines: 0.25, order: 0.2, sym: 0.2, rhythm: 0.15, worked: 0.2 };
  const EYE_WASTE = 3,
    EYE_WASTE_MAX = 15; // points off a dead end that found nothing
  const PATTERNS = {
    gallery: { name: 'The Long Gallery', desc: 'a straight passage twenty long' },
    cross: { name: "The Thane's Cross", desc: 'four equal arms from one hub' },
    colonnade: { name: 'The Colonnade', desc: 'a hall with its pillars in a true lattice, mirrored' },
    ninefold: { name: 'The Ninefold Hall', desc: 'nine rooms alike, three by three' },
    cloister: { name: 'The Cloister', desc: 'a pillared court with a room on each of its four sides' },
    spiral: { name: 'The Spiral Stair', desc: 'the stair down cut as a spiral (comes with the stair)' },
    vein: { name: 'The Vein-follower', desc: 'a straight passage eight long, cut along a vein of ore' },
    wellhead: { name: 'The Wellhead Court', desc: 'a well at the very heart of a room' }
  };

  // ── seeded random (the state lives in S so a save carries on the same) ──
  function rnd(S) {
    let t = (S.rs = (S.rs + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (S, a, b) => a + Math.floor(rnd(S) * (b - a + 1));
  const pick = (S, a) => a[Math.floor(rnd(S) * a.length)];

  const idx = (x, y) => y * W + x;
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const D4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const D8 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ];
  const isFloor = (S, x, y) => inB(x, y) && S.tiles[idx(x, y)].k === 'f';

  // ── a new Delve ───────────────────────────────────────────────────
  function newGame(seed) {
    seed = (seed == null ? Math.floor(Math.random() * 1e9) : seed) >>> 0;
    const S = {
      v: 10,
      seed,
      rs: seed,
      layer: 1,
      W,
      H,
      t: 0,
      nextId: 1,
      tiles: [],
      dwarves: [],
      items: [],
      rooms: [],
      stock: Object.assign({}, START_STOCK),
      log: [],
      found: {},
      prospectDay: 0,
      gate: [],
      depth: 0, // the deepest layer reached
      deep: [], // each layer's deep spot (the middle of its 3 × 3), where the stair down must go
      deepSeen: {},
      links: [], // stairs: pairs of tiles a dwarf steps between
      stairs: [], // {z, c, done}
      got: {}, // ore carried to the stock, all told (the Thane's quota counts this)
      quotaDone: {},
      dead: [], // the fallen: {name, trade, day, how}
      caveT: 0,
      foes: [], // earth elementals: {id, kind, x, y, hp, max, state 'sleep' | 'awake', chamber, wander, …}
      chambers: [], // hidden hollows: {id, z, cells, woke, tremor}
      tremors: [], // recent tremor markers for the map: {x, y, t}
      wanderT: 0,
      fightT: 0,
      foeKills: 0
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.tiles.push(newTile(y % STRIDE === LH));
    for (let z = 0; z < LAYERS.length; z++) genLayer(S, z);
    const gy = Math.floor(LH / 2);
    // the gate: a short tunnel in from the mountainside, the wagon's supplies stacked there
    for (let x = 0; x < 3; x++)
      for (let y = gy - 1; y <= gy; y++) {
        const t = S.tiles[idx(x, y)];
        t.k = 'f';
        t.o = '';
        S.gate.push(idx(x, y));
      }
    for (let z = 0; z < LAYERS.length - 1; z++) placeDeep(S, z);
    for (let z = 0; z < LAYERS.length; z++) placeChambers(S, z);
    for (const i of S.gate) reveal(S, i % W, (i / W) | 0);
    // the crew
    const used = {};
    START_CREW.forEach((trade, n) => {
      const sex = n % 2 ? 'f' : 'm';
      let nm;
      do {
        nm = pick(S, NAMES[sex]) + ' ' + pick(S, SURNAMES);
      } while (used[nm]);
      used[nm] = 1;
      S.dwarves.push(newDwarf(S, nm, sex, trade, 1 + (n % 3), gy - 1 + (n % 2)));
    });
    S.durin = { x: 1, y: gy, path: [], act: 'At the gate', hp: DURIN.hp, bind: null, down: 0 };
    logMsg(S, 'Durin: "Here we cut the Stoneheart Delve. Mark me some good straight passages, planner."');
    logMsg(S, 'Durin: "And a mason\'s workshop early on: nothing gets built without dressed stone."');
    logMsg(
      S,
      'Durin: "Sow a farm, sink a well and set up a brewery, and the Thane will send us soldiers. There\'s things in this mountain that wake."'
    );
    logMsg(
      S,
      'Durin: "The water barrels won\'t last either: find damp stone (a blue shimmer) and sink a well."'
    );
    logMsg(
      S,
      'Durin: "Those old iron picks won\'t last. Find copper, tin and coal, and give the smith a forge."'
    );
    return S;
  }
  function newTile(bedrock) {
    return {
      k: bedrock ? 'x' : 'r',
      h: 1,
      o: '',
      s: false,
      d: false,
      p: false,
      m: false,
      w: false,
      r: 0,
      fu: '',
      fb: false,
      g: 0,
      gt: 0,
      cl: 0,
      wo: false,
      cr: 0, // seconds this floor's roof has been unsound
      rb: false, // rubble from a cave-in
      sr: '', // a stair: 'down' on the layer above, 'up' on the one below
      dm: false, // damp stone: a well can be sunk here once it's dug
      wl: false // a well
    };
  }
  // one layer's stone and ore, from the seed: rock hardness from a coarse value noise (soft near the gate,
  // harder further in and further down), then its veins and blobs
  function genLayer(S, z) {
    const L = LAYERS[z],
      y0 = topOf(z),
      gy = Math.floor(LH / 2);
    const cs = 6,
      gw = Math.ceil(W / cs) + 2,
      gh = Math.ceil(LH / cs) + 2,
      grid = [];
    for (let i = 0; i < gw * gh; i++) grid.push(rnd(S));
    const noise = (x, y) => {
      const gx = x / cs,
        gy2 = y / cs,
        x0 = Math.floor(gx),
        yy0 = Math.floor(gy2),
        fx = gx - x0,
        fy = gy2 - yy0;
      const g = (a, b) => grid[b * gw + a],
        sm = v => v * v * (3 - 2 * v),
        u = sm(fx),
        w = sm(fy);
      return (
        (g(x0, yy0) * (1 - u) + g(x0 + 1, yy0) * u) * (1 - w) +
        (g(x0, yy0 + 1) * (1 - u) + g(x0 + 1, yy0 + 1) * u) * w
      );
    };
    for (let y = 0; y < LH; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x, y) + (x / W) * 0.35 + L.hard,
          t = S.tiles[idx(x, y0 + y)];
        t.h = n < 0.5 ? 1 : n < 0.85 ? 2 : 3;
      }
    const inL = (x, y) => x >= 0 && y >= 0 && x < W && y < LH;
    const setO = (x, y, o) => {
      if (inL(x, y) && x > 3) S.tiles[idx(x, y0 + y)].o = o;
    };
    const vein = (o, n, l0, l1) => {
      const len = ri(S, l0, l1);
      for (let v = 0; v < n; v++) {
        let x = ri(S, 6, W - 2),
          y = ri(S, 1, LH - 2),
          dx = pick(S, [-1, 1]),
          dy = 0;
        if (rnd(S) < 0.5) {
          dy = dx;
          dx = 0;
        }
        for (let k = 0; k < len; k++) {
          setO(x, y, o);
          if (rnd(S) < 0.25) {
            const t = dx;
            dx = dy;
            dy = t;
            if (rnd(S) < 0.5) {
              dx = -dx;
              dy = -dy;
            }
          }
          if (rnd(S) < 0.3) {
            if (dx) y += pick(S, [-1, 1]);
            else x += pick(S, [-1, 1]);
          }
          x += dx;
          y += dy;
          if (!inL(x, y)) {
            x = Math.max(1, Math.min(W - 2, x));
            y = Math.max(1, Math.min(LH - 2, y));
            dx = -dx;
            dy = -dy;
          }
        }
      }
    };
    const blob = (o, n, r0, r1, near) => {
      for (let b = 0; b < n; b++) {
        const cx = near && !b ? ri(S, 8, 15) : ri(S, 7, W - 3),
          cy = near && !b ? gy + pick(S, [-1, 1]) * ri(S, 4, 6) : ri(S, 2, LH - 3),
          r = r0 + rnd(S) * (r1 - r0);
        for (let y = 0; y < LH; y++)
          for (let x = 0; x < W; x++) {
            const dd = Math.hypot(x - cx, (y - cy) * 1.2) + rnd(S) * 0.9;
            if (dd < r) setO(x, y, o);
          }
      }
    };
    // (the first loam pocket on the Topstone always lies within reach of the gate, so a farm is always possible)
    for (const [kind, o, ...a] of L.gen) (kind === 'vein' ? vein : blob)(o, ...a);
    damp(S, z);
  }
  // damp spots: a few small patches of wet stone on each layer, where a well can be sunk (DAMP per layer)
  function damp(S, z) {
    const y0 = topOf(z);
    for (let b = 0; b < DAMP; b++) {
      const cx = ri(S, 5, W - 3),
        cy = ri(S, 2, LH - 3);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 1 && rnd(S) < 0.6) continue;
          const t = S.tiles[idx(cx + dx, y0 + cy + dy)];
          if (t.k === 'r' && !t.bt) t.dm = true;
        }
    }
  }
  // a layer's deep spot: a 3 × 3 of undug rock, away from the gate, where the stone thins
  function placeDeep(S, z) {
    const y0 = topOf(z);
    for (let tries = 0; tries < 400; tries++) {
      const cx = ri(S, z ? 6 : 14, W - 4),
        cy = ri(S, 3, LH - 4);
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const t = S.tiles[idx(cx + dx, y0 + cy + dy)];
          if (t.k !== 'r' || t.r || t.p || t.bt) ok = false;
        }
      if (ok) {
        S.deep[z] = idx(cx, y0 + cy);
        return;
      }
    }
    S.deep[z] = idx(W - 6, y0 + Math.floor(LH / 2));
  }
  function newDwarf(S, name, sex, trade, x, y) {
    return {
      id: S.nextId++,
      name,
      sex,
      trade,
      x,
      y,
      path: [],
      job: null,
      needs: { food: 80 + rnd(S) * 20, ale: 75 + rnd(S) * 25, sleep: 70 + rnd(S) * 30 },
      grudges: [],
      xp: 0,
      bed: -1,
      act: 'Arriving',
      lack: {},
      pick: trade === 'miner' ? { kind: 'old', uses: PICKS.old.uses } : null,
      hurt: 0,
      hp: DWARF_HP,
      drafted: false, // a warrior: hunts awake elementals, trains at the barracks
      gear: {}, // w: weapon, a: armour (GEAR keys)
      fx: 0 // fighting experience
    };
  }
  function logMsg(S, msg) {
    S.log.push({ t: S.t, msg });
    if (S.log.length > 80) S.log.shift();
  }

  function reveal(S, x, y) {
    for (const [dx, dy] of D8.concat([[0, 0]])) {
      const a = x + dx,
        b = y + dy;
      if (inB(a, b)) S.tiles[idx(a, b)].s = true;
    }
  }

  // ── time ──
  const dayOf = S => Math.floor(S.t / DAY) + 1;
  const clockOf = S => {
    const h = (START_HOUR + ((S.t % DAY) / DAY) * 24) % 24;
    return { h: Math.floor(h), m: Math.floor((h % 1) * 60) };
  };

  // ── paths: a breadth-first search over floor (pillars and furniture: pillars block, furniture doesn't) ──
  function distMap(S, sx, sy) {
    const N = W * H,
      dist = new Int32Array(N).fill(-1),
      prev = new Int32Array(N).fill(-1),
      q = new Int32Array(N);
    sx = Math.round(sx);
    sy = Math.round(sy);
    if (!isFloor(S, sx, sy)) return { dist, prev };
    let h = 0,
      tl = 0;
    const s0 = idx(sx, sy);
    dist[s0] = 0;
    q[tl++] = s0;
    const lm = linkMap(S);
    while (h < tl) {
      const c = q[h++],
        cx = c % W,
        cy = (c / W) | 0;
      for (const [dx, dy] of D4) {
        const nx = cx + dx,
          ny = cy + dy;
        if (!isFloor(S, nx, ny)) continue;
        const n = idx(nx, ny);
        if (dist[n] < 0) {
          dist[n] = dist[c] + 1;
          prev[n] = c;
          q[tl++] = n;
        }
      }
      // a stair: one step down (or up) to the layer beyond
      const o = lm.get(c);
      if (o !== undefined && dist[o] < 0 && S.tiles[o].k === 'f') {
        dist[o] = dist[c] + STAIR_STEPS;
        prev[o] = c;
        q[tl++] = o;
      }
    }
    return { dist, prev };
  }
  // the stairs as a map from each end to the other (rebuilt only when a stair is added)
  const LINKS = new WeakMap();
  function linkMap(S) {
    let m = LINKS.get(S);
    if (!m || m.n !== S.links.length) {
      m = new Map();
      for (const [a, b] of S.links) {
        m.set(a, b);
        m.set(b, a);
      }
      m.n = S.links.length;
      LINKS.set(S, m);
    }
    return m;
  }
  function pathTo(dm, i) {
    const p = [];
    if (dm.dist[i] < 0) return null;
    while (i >= 0 && dm.dist[i] > 0) {
      p.unshift(i);
      i = dm.prev[i];
    }
    return p;
  }
  // the nearest reachable floor tile next to rock tile i (to stand on while working it)
  function standBy(S, dm, i) {
    const x = i % W,
      y = (i / W) | 0;
    let best = -1,
      bd = 1e9;
    for (const [dx, dy] of D4) {
      const a = x + dx,
        b = y + dy;
      if (!isFloor(S, a, b)) continue;
      const n = idx(a, b);
      const d = dm.dist[n];
      if (d >= 0 && d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  // ── rooms ─────────────────────────────────────────────────────────
  function roomTiles(S, r) {
    const out = [];
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) out.push(idx(x, y));
    return out;
  }
  const roomById = (S, id) => S.rooms.find(r => r.id === id);
  function roomArea(S, r) {
    return roomTiles(S, r).filter(i => S.tiles[i].k === 'f').length;
  }
  function makeRoom(S, type, x0, y0, x1, y1) {
    if (!ROOMS[type]) return { ok: false, why: 'No such room.' };
    [x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)];
    [y0, y1] = [Math.min(y0, y1), Math.max(y0, y1)];
    const r = { id: S.nextId++, type, x0, y0, x1, y1 },
      ts = roomTiles(S, r);
    let floor = 0,
      soil = 0;
    for (const i of ts) {
      const t = S.tiles[i];
      if (t.r) return { ok: false, why: 'That overlaps another room.' };
      if (t.sr) return { ok: false, why: 'Keep the stair clear.' };
      if (S.gate.includes(i)) return { ok: false, why: 'Keep the gate clear.' };
      if (t.k === 'f') {
        floor++;
        if (t.o === 'soil') soil++;
      } else if (!t.p)
        return { ok: false, why: 'Dig it out first: a room can hold only dug floor and pillars.' };
    }
    if (!floor) return { ok: false, why: 'Dig it out first.' };
    if (type === 'farm' && !soil)
      return { ok: false, why: 'A farm needs soil: dig out a loam pocket (the brown stone) first.' };
    if (ROOMS[type].one && S.rooms.some(x => x.type === type))
      return { ok: false, why: 'A Delve has only one ' + ROOMS[type].name + '.' };
    if (ROOMS[type].min && floor < ROOMS[type].min)
      return {
        ok: false,
        why:
          'A ' + ROOMS[type].name + ' needs ' + ROOMS[type].min + ' tiles of floor (that has ' + floor + ').'
      };
    for (const i of ts) S.tiles[i].r = r.id;
    const R = ROOMS[type];
    if (R.furn) {
      const need = R.count(floor),
        floors = ts.filter(i => S.tiles[i].k === 'f');
      const grid = floors.filter(i => ((i % W) - x0) % 2 === 0 && (((i / W) | 0) - y0) % 2 === 0),
        rest = floors.filter(i => !grid.includes(i));
      grid
        .concat(rest)
        .slice(0, need)
        .forEach(i => {
          S.tiles[i].fu = R.furn;
          S.tiles[i].fb = false;
        });
    }
    S.rooms.push(r);
    return { ok: true, room: r };
  }
  function removeRoom(S, id) {
    const r = roomById(S, id);
    if (!r) return;
    for (const i of roomTiles(S, r)) {
      const t = S.tiles[i];
      if (t.fb) S.stock[matOf(t)] = have(S, matOf(t)) + 1;
      t.r = 0;
      t.fu = '';
      t.fb = false;
      t.g = 0;
      t.gt = 0;
    }
    for (const d of S.dwarves) if (d.bed >= 0 && !S.tiles[d.bed].fu) d.bed = -1;
    S.rooms = S.rooms.filter(x => x !== r);
  }
  function roomAt(S, x, y) {
    const t = inB(x, y) && S.tiles[idx(x, y)];
    return t && t.r ? roomById(S, t.r) : null;
  }
  // the ways into a room with no door: floor outside it beside its floor, where neither tile is a built door
  // (a door can hang on the room's edge or just outside it). Rooms marked `open` don't need doors: the
  // stockpile, the farm, the workshops (mason's workshop, brewery, kitchen, forge), which are open places of work,
  // and the taproom (a tavern needs its doors).
  function roomOpenings(S, r) {
    if (ROOMS[r.type].open) return [];
    const T = S.tiles,
      out = new Set();
    for (const i of roomTiles(S, r)) {
      if (T[i].k !== 'f' || T[i].dr) continue;
      const x = i % W,
        y = (i / W) | 0;
      for (const [dx, dy] of D4) {
        const a = x + dx,
          b = y + dy;
        if (!isFloor(S, a, b) || (a >= r.x0 && a <= r.x1 && b >= r.y0 && b <= r.y1)) continue;
        if (!T[idx(a, b)].dr) out.add(idx(a, b));
      }
    }
    return [...out];
  }
  // stars (1–3): a clean rectangle of the right size with its furniture in and a door on every way in,
  // then worked walls
  function roomStars(S, r) {
    const R = ROOMS[r.type],
      ts = roomTiles(S, r);
    let stars = 1;
    const furnDone = ts.every(i => !S.tiles[i].fu || S.tiles[i].fb),
      area = roomArea(S, r);
    if (furnDone && area >= (R.good || 1) && !roomOpenings(S, r).length) stars++;
    const walls = roomWalls(S, r);
    if (walls.length && walls.filter(i => S.tiles[i].w).length / walls.length >= 0.8 && stars >= 2) stars++;
    return stars;
  }
  // the rock tiles round a room's edge and its pillars: what a mason smooths
  function roomWalls(S, r) {
    const set = new Set();
    for (const i of roomTiles(S, r)) {
      const t = S.tiles[i];
      if (t.k === 'r') {
        set.add(i);
        continue;
      }
      const x = i % W,
        y = (i / W) | 0;
      for (const [dx, dy] of D4) {
        const a = x + dx,
          b = y + dy;
        if (inB(a, b) && S.tiles[idx(a, b)].k === 'r') set.add(idx(a, b));
      }
    }
    return [...set];
  }

  // ── designations (drag a rectangle) ───────────────────────────────
  function designate(S, tool, x0, y0, x1, y1) {
    [x0, x1] = [Math.max(0, Math.min(x0, x1)), Math.min(W - 1, Math.max(x0, x1))];
    [y0, y1] = [Math.max(0, Math.min(y0, y1)), Math.min(H - 1, Math.max(y0, y1))];
    if (tool.startsWith('room:')) return makeRoom(S, tool.slice(5), x0, y0, x1, y1);
    let n = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = idx(x, y),
          t = S.tiles[i];
        if (t.k === 'x' || t.sr) continue; // bedrock between layers; the stair
        if (tool === 'dig') {
          if (t.k === 'r' && !t.p && !t.d) {
            t.d = true;
            t.m = false;
            n++;
          }
        } else if (tool === 'pillar') {
          if (t.k === 'f') {
            // on dug floor: the mason builds one
            if (!t.b && !t.dr && !t.fu && !S.gate.includes(i)) {
              t.b = 'pillar';
              n++;
            }
          } else if (!t.p) {
            t.p = true;
            t.d = false;
            release(S, i);
            n++;
          }
        } else if (tool === 'smooth') {
          if (t.k === 'r' && !t.d && !t.w && !t.m) {
            t.m = true;
            n++;
          }
        } else if (tool.startsWith('build:')) {
          const what = tool.slice(6);
          if (!BUILDS[what] || t.k !== 'f' || t.b || t.dr || t.wl || t.fu || S.gate.includes(i)) continue;
          if (BUILDS[what].damp && !t.dm) continue;
          if (t.r && !BUILDS[what].inRoom) continue; // a wall would cut a room in two
          t.b = what;
          n++;
        } else if (tool === 'cancel') {
          if (t.dr || t.wl) {
            // a built door or well comes out again, its stone back in the stock
            t.dr = false;
            t.wl = false;
            S.stock.block = have(S, 'block') + 1;
            n++;
          }
          if (t.d || t.p || t.m || t.b) {
            t.d = false;
            t.p = false;
            t.m = false;
            t.b = '';
            release(S, i);
            n++;
          }
        }
      }
    return { ok: true, n };
  }
  // a job's claim is dropped when its tile's designation goes
  function release(S, i) {
    const t = S.tiles[i];
    if (!t.cl) return;
    const d = S.dwarves.find(w => w.id === t.cl);
    if (d && d.job && d.job.tile === i) {
      d.job = null;
      d.path = [];
    }
    t.cl = 0;
  }

  // ── stock and stockpiles ──
  // a bonesetter is in the infirmary: the hurt mend twice as fast there
  function tended(S) {
    return S.dwarves.some(d => d.trade === 'bonesetter' && d.job && d.job.type === 'tend' && !d.path.length);
  }
  // a tavern is open while its keeper stands behind its bar
  function served(S, r) {
    return S.dwarves.some(
      d =>
        d.job && d.job.type === 'serve' && !d.path.length && roomAt(S, Math.round(d.x), Math.round(d.y)) === r
    );
  }
  // the first tavern furnished brings a keeper up from Stonedeep
  // a newcomer's name, not one the hold already has (living or dead)
  function newName(S, sex) {
    const used = new Set(S.dwarves.map(d => d.name).concat(S.dead.map(d => d.name)));
    let nm,
      n = 0;
    do {
      nm = pick(S, NAMES[sex]) + ' ' + pick(S, SURNAMES);
    } while (used.has(nm) && ++n < 50);
    return nm;
  }
  // the scripted event: the Thane's soldiers come up from Stonedeep, armed and blooded
  // ── Renown: what the hold says of the Delve. Live, from the work itself, so it can fall as well as rise.
  function renown(S) {
    const R = RENOWN_W,
      parts = [];
    let eye = 0;
    for (let z = 0; z <= S.depth; z++) eye = Math.max(eye, masonEye(S, z).score || 0);
    parts.push(["The Mason's Eye (best layer " + Math.round(eye) + ')', eye * R.eye]);
    const pats = Object.keys(S.found || {}).length;
    if (pats) parts.push([pats + ' named pattern' + (pats > 1 ? 's' : ''), pats * R.pattern]);
    const stars = Math.min(
      R.starCap,
      S.rooms.reduce((n, r) => n + Math.max(0, roomStars(S, r) - 1), 0)
    );
    if (stars) parts.push(['Fine rooms (stars past the first)', stars * R.star]);
    if (S.depth) parts.push([S.depth + ' layer' + (S.depth > 1 ? 's' : '') + ' opened', S.depth * R.layer]);
    if (S.bound)
      parts.push([S.bound + ' elemental' + (S.bound > 1 ? 's' : '') + ' bound', S.bound * R.bound]);
    if (S.foeKills)
      parts.push([
        S.foeKills + ' elemental' + (S.foeKills > 1 ? 's' : '') + ' slain',
        Math.min(R.slainCap, S.foeKills * R.slain)
      ]);
    if (S.engraved)
      parts.push([
        S.engraved + ' wall' + (S.engraved > 1 ? 's' : '') + ' engraved',
        Math.min(R.engraveCap, S.engraved * R.engrave)
      ]);
    if (S.dead.length) parts.push([S.dead.length + ' of the crew lost', S.dead.length * R.dead]);
    const total = Math.max(0, Math.round(parts.reduce((n, p) => n + p[1], 0)));
    let tier = 0;
    while (tier < RENOWN_TIERS.length && total >= RENOWN_TIERS[tier]) tier++;
    return {
      total,
      parts: parts.map(([why, n]) => [why, Math.round(n)]),
      tier,
      next: RENOWN_TIERS[tier] || null
    };
  }
  // the trade the Delve most needs (for a newcomer who isn't replacing someone)
  function neededTrade(S) {
    const n = tr => S.dwarves.filter(d => d.trade === tr).length,
      crew = S.dwarves.length;
    if (have(S, 'food') + have(S, 'meal') < crew * 3 && n('farmer') < 3) return 'farmer';
    if (have(S, 'ale') < crew * 2 && n('brewer') < 2) return 'brewer';
    const builds = S.tiles.filter(t => t.b || (t.fu && !t.fb)).length;
    if (builds > 12 && n('mason') < 3) return 'mason';
    const marked = S.tiles.filter(t => t.d).length;
    if (marked > 20 || n('miner') < 3) return 'miner';
    return rnd(S) < 0.5 ? 'miner' : 'mason';
  }
  // ── Applications: dwarves don't just turn up. A letter from Stonedeep every LETTERS.every brings
  // applicants (kin of the dead asking to take their place, then one a renown tier, and once a trade is
  // unlocked, a specialist); the planner accepts or turns each away. An accepted one takes LETTERS.road to
  // walk up, waiting at Stonedeep while the road in isn't safe; unanswered ones withdraw at the next letter.
  function roadUnsafe(S) {
    const g0 = S.gate[0];
    return S.foes.find(
      f =>
        f.state === 'awake' &&
        f.hp > 0 &&
        (Math.hypot(f.x - (g0 % W), f.y - ((g0 / W) | 0)) < LETTERS.safe || S.t - (f.killT || -1e9) < DAY)
    );
  }
  const crewCount = (S, tr) =>
    S.dwarves.filter(d => d.trade === tr).length +
    (S.coming || []).filter(a => a.trade === tr).length +
    (S.apps || []).filter(a => a.trade === tr).length;
  // why a specialist trade can't apply yet ('' if it can)
  function specialWhy(S, tr) {
    const X = SPECIAL[tr];
    if (renown(S).total < X.renown) return 'renown ' + X.renown;
    if (X.needs && !X.needs(S)) return X.lacks;
    if (crewCount(S, tr) >= X.max) return 'enough of them';
    return '';
  }
  function applicant(S, trade, kin) {
    const sex = rnd(S) < 0.5 ? 'm' : 'f';
    let name = newName(S, sex);
    // kin share the dead's surname
    if (kin) name = name.split(' ')[0] + ' ' + kin.name.split(' ').slice(1).join(' ');
    const lines = PITCH[trade] || ["I work hard and I don't complain."];
    const line = kin
      ? pick(S, KIN_LINES).replace('{dead}', kin.for).replace('{kin}', pick(S, KIN[sex]))
      : lines[(rnd(S) * lines.length) | 0];
    return { id: S.nextId++, name, sex, trade, line, kin: kin ? kin.for : null };
  }
  function letterStep(S) {
    if (S.letterT == null) S.letterT = LETTERS.first;
    // arrivals: accepted applicants walking up the road
    if (S.coming && S.coming.length) {
      const bad = roadUnsafe(S);
      for (const a of S.coming.slice()) {
        if (S.t < a.at) continue;
        if (bad) {
          if (!a.held)
            logMsg(
              S,
              '🎒 ' +
                a.name.split(' ')[0] +
                ' waits at Stonedeep: a ' +
                FOES[bad.kind].name +
                (S.t - (bad.killT || -1e9) < DAY
                  ? ' that has killed is loose in the Delve.'
                  : ' prowls near the gate.')
            );
          a.held = true;
          continue;
        }
        S.coming.splice(S.coming.indexOf(a), 1);
        const g = S.gate[0],
          d = newDwarf(S, a.name, a.sex, a.trade, g % W, (g / W) | 0);
        if (a.trade === 'soldier')
          Object.assign(d, { drafted: true, fx: 0, gear: Object.assign({}, SOLDIERS.gear) });
        d.hp = maxHp(d);
        S.dwarves.push(d);
        for (const k in LETTERS.bring) addStock(S, k, LETTERS.bring[k]);
        S.arrived = (S.arrived || 0) + 1;
        logMsg(
          S,
          '🎒 ' +
            a.name +
            ' arrives from Stonedeep, ' +
            TRADES[a.trade].name.toLowerCase() +
            (a.kin ? ', in ' + a.kin + "'s place" : '') +
            ', with a little food and ale.'
        );
      }
    }
    if (S.t < S.letterT) return;
    S.letterT = S.t + LETTERS.every;
    // the last letter's applicants who weren't answered find work elsewhere
    if (S.apps && S.apps.length) {
      for (const a of S.apps) if (a.kin) (S.owed || []).forEach(o => o.for === a.kin && (o.asked = false));
      logMsg(
        S,
        '📜 ' +
          S.apps.length +
          ' applicant' +
          (S.apps.length > 1 ? 's' : '') +
          ' heard nothing back, and found work elsewhere.'
      );
    }
    S.apps = [];
    const room = LETTERS.max - S.dwarves.length - (S.coming || []).length;
    if (room <= 0) {
      logMsg(S, '📜 A letter from Stonedeep: they know the Delve is full, and send no one.');
      return;
    }
    // kin of the dead, mourned a day
    for (const o of S.owed || []) {
      if (S.apps.length >= Math.min(room, LETTERS.kinMax)) break;
      if (o.asked || S.t - o.t < LETTERS.mourn) continue;
      o.asked = true;
      const dead = S.dead.find(d => d.name.split(' ')[0] === o.for) || { name: o.for + ' Stonedeep' };
      S.apps.push(applicant(S, o.trade, { for: o.for, name: dead.name }));
    }
    // ordinary applicants, one a renown tier: the trade most needed first, then a spread to choose from
    const tier = renown(S).tier;
    for (let k = 0; k < tier && S.apps.length < room; k++) {
      let tr = k === 0 ? neededTrade(S) : pick(S, ORDINARY);
      if (k > 0 && S.apps.some(a => a.trade === tr)) tr = pick(S, ORDINARY);
      S.apps.push(applicant(S, tr));
    }
    // and one specialist, once their trade is open to the Delve
    if (S.apps.length < room) {
      const open = Object.keys(SPECIAL).filter(tr => !specialWhy(S, tr));
      if (open.length) S.apps.push(applicant(S, pick(S, open)));
    }
    if (S.apps.length)
      logMsg(
        S,
        '📜 A letter from Stonedeep: ' +
          S.apps.length +
          ' dwarf' +
          (S.apps.length > 1 ? 's ask' : ' asks') +
          ' to join the Delve. Read it on the Letters tab, and answer before the next one comes.'
      );
    else
      logMsg(
        S,
        "📜 A letter from Stonedeep: no one asks to join yet. The Delve hasn't the renown: fine halls, named patterns and deeper layers would draw them."
      );
  }
  function acceptApp(S, id) {
    const a = (S.apps || []).find(x => x.id === id);
    if (!a) return { ok: false, why: 'That applicant has gone.' };
    if (S.dwarves.length + (S.coming || []).length >= LETTERS.max)
      return { ok: false, why: 'The Delve is full: ' + LETTERS.max + ' dwarves.' };
    S.apps.splice(S.apps.indexOf(a), 1);
    if (a.kin) S.owed = (S.owed || []).filter(o => o.for !== a.kin);
    (S.coming = S.coming || []).push(Object.assign(a, { at: S.t + LETTERS.road }));
    logMsg(
      S,
      '📜 You take on ' +
        a.name +
        ', ' +
        TRADES[a.trade].name.toLowerCase() +
        '. They set out from Stonedeep.'
    );
    return { ok: true };
  }
  function declineApp(S, id) {
    const a = (S.apps || []).find(x => x.id === id);
    if (!a) return;
    S.apps.splice(S.apps.indexOf(a), 1);
    if (a.kin) S.owed = (S.owed || []).filter(o => o.for !== a.kin);
  }
  // what the Thane wants to see before sending soldiers; each is remembered once done
  function soldiersReady(S) {
    const R = (S.ready = S.ready || {});
    if (!R.farm)
      R.farm = S.tiles.some(
        t => t.r && t.o === 'soil' && t.g >= 1 && (roomById(S, t.r) || {}).type === 'farm'
      );
    if (!R.well) R.well = S.tiles.some(t => t.wl);
    if (!R.brewery) R.brewery = S.tiles.some(t => t.fu === 'still' && t.fb);
    return R;
  }
  function soldiersArrive(S, why) {
    if (S.soldiersCame) return;
    S.soldiersCame = true;
    S.soldiersT = S.t;
    const g = S.gate[0],
      names = [];
    for (let k = 0; k < SOLDIERS.n; k++) {
      const sex = k % 2 ? 'f' : 'm',
        nm = newName(S, sex),
        d = newDwarf(S, nm, sex, 'soldier', g % W, (g / W) | 0);
      Object.assign(d, { drafted: true, fx: SOLDIERS.fx, gear: Object.assign({}, SOLDIERS.gear) });
      d.hp = maxHp(d);
      S.dwarves.push(d);
      names.push(nm);
    }
    logMsg(
      S,
      '🛡 ' +
        names.join(' and ') +
        " come up from Stonedeep with bronze war-hammers: the Thane's soldiers. " +
        (why || "They'll train at the barracks and stand guard over the crew.")
    );
    logMsg(
      S,
      '⚔ Durin: "The Thane doesn\'t send soldiers for nothing. There\'s things in this stone that wake. Raise them a barracks and two more beds, and keep the rest of the crew behind worked walls when they come."'
    );
  }
  function hireKeeper(S) {
    if (S.dwarves.some(d => d.trade === 'keeper') || S.keeperHired) return;
    S.keeperHired = true;
    const sex = rnd(S) < 0.5 ? 'm' : 'f';
    const nm = newName(S, sex);
    const g = S.gate[0];
    S.dwarves.push(newDwarf(S, nm, sex, 'keeper', g % W, (g / W) | 0));
    logMsg(
      S,
      '🍻 ' + nm + " comes up from Stonedeep to keep your tavern. It pours only while they're behind the bar."
    );
  }
  function stockTiles(S) {
    const out = S.gate.slice();
    for (const r of S.rooms)
      if (r.type === 'stockpile') for (const i of roomTiles(S, r)) if (S.tiles[i].k === 'f') out.push(i);
    return out;
  }
  function nearest(dm, list) {
    let best = -1,
      bd = 1e9;
    for (const i of list) {
      const d = dm.dist[i];
      if (d >= 0 && d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }
  function addItem(S, i, kind, n) {
    S.items.push({ id: S.nextId++, i, kind, n: n || 1, cl: 0 });
  }

  // ── skill ──
  function levelOf(d) {
    let L = LEVELS[0];
    for (const l of LEVELS) if (d.xp >= l.xp) L = l;
    return L;
  }
  function speedOf(S, d) {
    return (
      levelOf(d).speed *
      (openGrudges(d) >= GRUMBLE ? GRUMBLE_SPEED : 1) *
      (d.hurt ? HURT_SPEED : 1) *
      (merry(S, d) ? MERRY.speed : 1)
    );
  }
  // how fast a dwarf digs, before skill: a miner by his pick, anyone else at 0.6
  function digRate(d) {
    if (d.trade !== 'miner') return 0.6;
    return d.pick ? PICKS[d.pick.kind].speed : NO_PICK;
  }
  const openGrudges = d => d.grudges.length;
  const merry = (S, d) => !!(S && d.merry && d.merry > S.t);
  function addGrudge(S, d, why) {
    if (d.grudges.some(g => g.why === why && S.t - g.t < DAY)) return;
    if (merry(S, d) && !DEEP_GRUDGES.test(why)) {
      // a merry dwarf laughs it off, and the merriment with it
      d.merry = 0;
      logMsg(S, '🍻 ' + d.name.split(' ')[0] + ' shrugs off "' + why + '": still merry from the tavern.');
      return;
    }
    d.grudges.push({ why, t: S.t });
    logMsg(S, '📕 ' + d.name.split(' ')[0] + ': "' + why + '." (in the Ledger)');
  }
  function settleGrudge(S, d, how) {
    if (!d.grudges.length) return;
    const g = d.grudges.shift();
    logMsg(S, '✔ ' + d.name.split(' ')[0] + ' struck out "' + g.why + '": ' + how + '.');
  }

  // ── choosing work ────────────────────────────────────────────────
  function chooseJob(S, d) {
    const tx = Math.round(d.x),
      ty = Math.round(d.y),
      dm = distMap(S, tx, ty);
    const go = (job, dest) => {
      const p = dest === idx(tx, ty) ? [] : pathTo(dm, dest);
      if (!p) return false;
      d.job = job;
      d.path = p;
      return true;
    };
    const stocks = stockTiles(S);
    // an elemental close by: a warrior goes for it, anyone else runs
    const fighting = d.drafted && d.hp > maxHp(d) * FIGHT.retreat; // a badly hurt warrior falls back
    const foe = fighting && S.t - (d.huntFail || -1e9) < 5 ? null : danger(S, d, fighting ? WAR_R : FLEE_R);
    if (foe && !fighting) {
      // somewhere it can't follow (behind worked stone or a door) if there's such a place within a run,
      // else as far from it as the run allows, and towards the warriors
      const fd = foeDist(S, foe.x, foe.y).dist;
      const guards = S.dwarves.filter(w => w.drafted && w.hp > maxHp(w) * FIGHT.retreat);
      let best = -1,
        bd = -1e9;
      dm.dist.forEach((v, i) => {
        if (v < 0 || v > FLEE_RUN) return;
        const x = i % W,
          y = (i / W) | 0,
          dd = Math.hypot(x - foe.x, y - foe.y);
        if (dd < 2) return;
        let c = fd[i] < 0 ? 1000 - v : dd + (fd[i] >= 0 ? fd[i] * 0.3 : 0) - v * 0.15;
        if (fd[i] >= 0 && guards.some(w => Math.hypot(w.x - x, w.y - y) < 3)) c += 4;
        if (c > bd) {
          bd = c;
          best = i;
        }
      });
      if (best >= 0 && go({ type: 'flee', tile: -1, ph: 1, w: 3 }, best)) return;
    }
    if (foe && fighting) {
      // to a floor tile beside it (it may be in the rock)
      const fx = Math.round(foe.x),
        fy = Math.round(foe.y);
      let best = -1,
        bd = 1e9;
      for (const [dx, dy] of D8.concat([[0, 0]])) {
        const a = fx + dx,
          b = fy + dy;
        if (!inB(a, b)) continue;
        const i = idx(a, b),
          v = dm.dist[i];
        if (v >= 0 && v < bd) {
          bd = v;
          best = i;
        }
      }
      if (best >= 0 && go({ type: 'hunt', tile: -1, foe: foe.id, ph: 1, w: 2 }, best)) return;
      d.huntFail = S.t; // no way to it: back to work for a few seconds
    }
    // needs first
    if (d.needs.sleep < LOW.sleep) {
      // the best free bed: a bedroom of their own over a dormitory, more stars over fewer, nearer as a
      // tie-break. A dwarf already in a bed moves out of it as soon as a better one is free.
      const have = d.bed >= 0 && S.tiles[d.bed].fu === 'bed' && S.tiles[d.bed].fb ? d.bed : -1;
      const taken = new Set(S.dwarves.filter(w => w !== d).map(w => w.bed));
      let bed = have,
        best = have >= 0 ? bedWorth(S, have) - BED_NEAR * Math.max(0, dm.dist[have]) : -1e9;
      S.tiles.forEach((t, i) => {
        if (t.fu !== 'bed' || !t.fb || taken.has(i) || i === have || dm.dist[i] < 0) return;
        const v = bedWorth(S, i) - BED_NEAR * dm.dist[i];
        // only move house for a clearly better bed, not one a few steps nearer
        if (v > best + (have >= 0 ? BED_MOVE : 0)) {
          best = v;
          bed = i;
        }
      });
      if (bed !== have && bed >= 0) {
        const r = roomAt(S, bed % W, (bed / W) | 0);
        if (have >= 0 && r && r.type === 'bedroom')
          logMsg(
            S,
            '🛏 ' + d.name.split(' ')[0] + ' moves out of the dormitory into a bedroom of their own.'
          );
        d.bed = bed;
      }
      if (bed >= 0 && go({ type: 'sleep', tile: bed, ph: 1, w: SLEEP_S }, bed)) return;
      d.job = { type: 'sleep', tile: -1, ph: 1, w: SLEEP_S, floor: true };
      d.path = [];
      return;
    }
    for (const need of ['food', 'ale']) {
      if (d.needs[need] < LOW[need]) {
        const there = need === 'food' ? stockOf(S, 'food') + stockOf(S, 'meal') : stockOf(S, 'ale');
        if (there > 0) {
          const st = nearest(dm, stocks);
          if (st >= 0 && go({ type: need === 'food' ? 'eat' : 'drink', ph: 0, tile: st }, st)) return;
        } else d.lack[need] = true;
      }
    }
    // hurt: to a free infirmary cot if there is one
    if (d.hurt) {
      const cot = nearest(
        dm,
        S.tiles.map((t, i) => (t.fu === 'cot' && t.fb && !t.cl ? i : -1)).filter(i => i >= 0)
      );
      if (cot >= 0 && go({ type: 'heal', tile: cot, ph: 1, w: HEAL_COT }, cot)) {
        S.tiles[cot].cl = d.id;
        return;
      }
    }
    // mourning: to the Wall of Remembrance, if there is one, to carve a word for the fallen
    const grief = d.grudges.find(g => /^Mourning /.test(g.why));
    if (grief) {
      const wall = nearest(
        dm,
        S.tiles.map((t, i) => (t.fu === 'plaque' && t.fb ? i : -1)).filter(i => i >= 0)
      );
      if (wall >= 0 && go({ type: 'mourn', tile: -1, at: wall, ph: 1, w: MOURN_S, why: grief.why }, wall))
        return;
    }
    if (openGrudges(d) >= DOWN_TOOLS) {
      d.act = 'Has downed tools';
      idle(S, d, dm);
      return;
    }
    const order = {
      miner: ['getpick', 'dig', 'haul'],
      mason: ['rune', 'build', 'construct', 'cut', 'smooth', 'haul', 'dig'],
      farmer: ['harvest', 'plant', 'cook', 'haul', 'dig'],
      brewer: ['brew', 'draw', 'melt', 'cook', 'haul', 'dig'],
      smith: ['ironhammer', 'hammer', 'mail', 'forge', 'smelt', 'haul', 'dig'],
      keeper: ['serve', 'haul'],
      soldier: [],
      bonesetter: ['tend', 'haul'],
      runesmith: ['silverrune', 'airhammer', 'haul'],
      engraver: ['engrave', 'smooth', 'haul']
    }[d.trade] || ['haul'];
    // a warrior arms first, keeps to their trade, and trains when there's nothing else; a soldier only
    // trains and guards, turn about
    const all =
      d.trade === 'soldier'
        ? ['arm'].concat(rnd(S) < 0.5 ? ['train', 'guard'] : ['guard', 'train'])
        : d.drafted
          ? ['arm'].concat(order, ['train'])
          : order;
    for (const kind of all) if (findWork(S, d, dm, kind, stocks, go)) return;
    idle(S, d, dm);
  }
  // what a piece is built from: the bench from rough stone, everything else from dressed blocks
  const matOf = t => (t.fu === 'bench' ? 'stone' : 'block');
  const have = (S, k) => S.stock[k] || 0;
  const stockOf = have;
  // gear's wanted while a warrior has worse than it in that slot, counting what's already made
  function gearWanted(S, slot, rank) {
    const kind = Object.keys(GEAR).find(k => GEAR[k].slot === slot && GEAR[k].rank === rank);
    const short = S.dwarves.filter(
      d => d.drafted && !((d.gear && d.gear[slot] && GEAR[d.gear[slot]].rank) >= rank)
    ).length;
    const lying = S.items.filter(it => it.kind === kind).reduce((n, it) => n + it.n, 0);
    return have(S, kind) + lying < short;
  }
  // water's wanted while the brewery could use it: under four buckets in store or lying about
  function waterWanted(S) {
    if (!S.tiles.some(t => t.fu === 'still' && t.fb)) return false;
    const lying = S.items.filter(it => it.kind === 'water').reduce((n, it) => n + it.n, 0);
    return have(S, 'water') + lying < 4;
  }
  // blocks still wanted: unbuilt furniture and building orders, and a few spare, less what's cut already
  function blocksWanted(S) {
    let want = BLOCK_SPARE;
    for (const t of S.tiles) if ((t.fu && !t.fb && t.fu !== 'bench') || t.b) want++;
    want -= have(S, 'block') + S.items.filter(it => it.kind === 'block').reduce((n, it) => n + it.n, 0);
    for (const d of S.dwarves) if (d.carry && d.carry.kind === 'block') want--;
    return want;
  }
  // how much a dwarf wants a bed: its room's kind, then the room's stars
  function bedWorth(S, i) {
    const r = roomAt(S, i % W, (i / W) | 0);
    if (!r) return 0;
    return (r.type === 'bedroom' ? BED_WORTH.bedroom : BED_WORTH.dorm) + BED_WORTH.star * roomStars(S, r);
  }
  function idle(S, d, dm) {
    d.job = { type: 'idle', ph: 1, w: 3 + rnd(S) * 4 };
    d.path = [];
    if (!/downed/.test(d.act)) d.act = 'Idle';
  }
  function findWork(S, d, dm, kind, stocks, go) {
    const T = S.tiles;
    if (kind === 'dig' || kind === 'smooth') {
      let best = -1,
        stand = -1,
        bd = 1e9;
      for (let i = 0; i < T.length; i++) {
        const t = T[i];
        if (t.cl || t.k !== 'r') continue;
        if (kind === 'dig' ? !t.d : !t.m || t.w) continue;
        const s = standBy(S, dm, i);
        if (s < 0) continue;
        const c = dm.dist[s];
        if (c < bd) {
          bd = c;
          best = i;
          stand = s;
        }
      }
      if (best < 0) return false;
      const t = T[best],
        w =
          kind !== 'dig'
            ? SMOOTH_S
            : t.rb
              ? DIG_S[1] * RUBBLE_DIG
              : DIG_S[t.h] * (t.o && t.o !== 'soil' ? ORE_DIG : 1);
      if (!go({ type: kind, tile: best, ph: 1, w }, stand)) return false;
      t.cl = d.id;
      return true;
    }
    if (kind === 'haul') {
      let best = null,
        bd = 1e9;
      for (const it of S.items) {
        if (it.cl) continue;
        const c = dm.dist[it.i];
        if (c >= 0 && c < bd) {
          bd = c;
          best = it;
        }
      }
      if (!best || !stocks.length) return false;
      if (!go({ type: 'haul', item: best.id, ph: 0, tile: best.i }, best.i)) return false;
      best.cl = d.id;
      return true;
    }
    if (kind === 'build') {
      let best = -1,
        bd = 1e9;
      T.forEach((t, i) => {
        if (t.fu && !t.fb && !t.cl && have(S, matOf(t)) >= 1 && dm.dist[i] >= 0 && dm.dist[i] < bd) {
          bd = dm.dist[i];
          best = i;
        }
      });
      if (best < 0) return false;
      const st = nearest(dm, stocks);
      if (st < 0) return false;
      if (!go({ type: 'build', tile: best, ph: 0, st }, st)) return false;
      T[best].cl = d.id;
      return true;
    }
    if (kind === 'construct') {
      if (have(S, 'block') < 1) return false;
      let best = -1,
        stand = -1,
        bd = 1e9;
      for (let i = 0; i < T.length; i++) {
        const t = T[i];
        if (!t.b || t.cl || t.k !== 'f') continue;
        const s = standBy(S, dm, i);
        if (s < 0) continue;
        if (dm.dist[s] < bd) {
          bd = dm.dist[s];
          best = i;
          stand = s;
        }
      }
      if (best < 0) return false;
      const st = nearest(dm, stocks);
      if (st < 0) return false;
      if (!go({ type: 'construct', tile: best, ph: 0, st, stand }, st)) return false;
      T[best].cl = d.id;
      return true;
    }
    if (RECIPES[kind]) {
      const R = RECIPES[kind];
      if (!R.want(S)) return false;
      for (const k in R.takes) if (have(S, k) < R.takes[k]) return false;
      let best = -1,
        bd = 1e9;
      const atOk = (t, i) => (R.atTile ? R.atTile(S, i, t) : t.fu === R.at && t.fb);
      T.forEach((t, i) => {
        if (atOk(t, i) && !t.cl && dm.dist[i] >= 0 && dm.dist[i] < bd) {
          bd = dm.dist[i];
          best = i;
        }
      });
      if (best < 0) return false;
      const st = nearest(dm, stocks);
      if (st < 0) return false;
      // nothing to carry: straight to the well (or the gate)
      if (!Object.keys(R.takes).length) {
        if (!go({ type: 'craft', rec: kind, tile: best, ph: 1, w: R.s, st }, best)) return false;
        T[best].cl = d.id;
        return true;
      }
      if (!go({ type: 'craft', rec: kind, tile: best, ph: 0, st }, st)) return false;
      T[best].cl = d.id;
      return true;
    }
    if (kind === 'arm') {
      // a better weapon or armour waiting in the stock
      const want = Object.keys(GEAR).find(
        k => have(S, k) > 0 && GEAR[k].rank > ((d.gear[GEAR[k].slot] && GEAR[d.gear[GEAR[k].slot]].rank) || 0)
      );
      if (!want) return false;
      const st = nearest(dm, stocks);
      if (st < 0) return false;
      return go({ type: 'arm', tile: -1, gear: want, ph: 1, w: 1 }, st);
    }
    if (kind === 'train') {
      let best = -1,
        bd = 1e9;
      T.forEach((t, i) => {
        if (t.fu === 'rack' && t.fb && !t.cl && dm.dist[i] >= 0 && dm.dist[i] < bd) {
          bd = dm.dist[i];
          best = i;
        }
      });
      if (best < 0) return false;
      if (!go({ type: 'train', tile: best, ph: 1, w: TRAIN_S }, best)) return false;
      T[best].cl = d.id;
      return true;
    }
    if (kind === 'guard') {
      // stand watch near one of the crew, the ones furthest out first (they dig into the unknown)
      const crew = S.dwarves.filter(o => o.trade !== 'soldier' && !(o.job && o.job.type === 'sleep'));
      if (!crew.length) return false;
      crew.sort((a, b) => layerOf(Math.round(b.y)) - layerOf(Math.round(a.y)));
      const o = crew[rnd(S) < 0.6 ? 0 : (rnd(S) * crew.length) | 0];
      const ox = Math.round(o.x),
        oy = Math.round(o.y);
      let best = -1,
        bd = 1e9;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (!inB(ox + dx, oy + dy)) continue;
          const i = idx(ox + dx, oy + dy),
            dd = Math.hypot(dx, dy);
          if (T[i].k !== 'f' || T[i].fu || dm.dist[i] < 0 || dd < 1.5) continue;
          const c = Math.abs(dd - 2.5) + rnd(S);
          if (c < bd) {
            bd = c;
            best = i;
          }
        }
      if (best < 0) return false;
      return go({ type: 'guard', tile: -1, at: best, ph: 1, w: GUARD_S, who: o.id }, best);
    }
    if (kind === 'tend') {
      // the bonesetter keeps to the infirmary: any floor of one, not a cot
      let best = -1,
        bd = 1e9;
      for (const r of S.rooms) {
        if (r.type !== 'infirmary') continue;
        for (const i of roomTiles(S, r))
          if (T[i].k === 'f' && !T[i].fu && dm.dist[i] >= 0 && dm.dist[i] < bd) {
            bd = dm.dist[i];
            best = i;
          }
      }
      if (best < 0) return false;
      return go({ type: 'tend', tile: -1, at: best, ph: 1, w: TEND_S }, best);
    }
    if (kind === 'engrave') {
      // a smoothed wall bordering a room's floor, not yet carved: stand on the floor beside it
      let best = -1,
        wall = -1,
        bd = 1e9;
      T.forEach((t, i) => {
        if (t.k !== 'r' || !t.w || t.en || t.cl) return;
        const x = i % W,
          y = (i / W) | 0;
        for (const [dx, dy] of D4) {
          if (!inB(x + dx, y + dy)) continue;
          const n = idx(x + dx, y + dy);
          if (T[n].k === 'f' && T[n].r && dm.dist[n] >= 0 && dm.dist[n] < bd) {
            bd = dm.dist[n];
            best = n;
            wall = i;
          }
        }
      });
      if (best < 0) return false;
      if (!go({ type: 'engrave', tile: wall, at: best, ph: 1, w: ENGRAVE_S }, best)) return false;
      T[wall].cl = d.id;
      return true;
    }
    if (kind === 'serve') {
      // behind the bar: a floor tile of a tavern beside one of its kegs
      let best = -1,
        bd = 1e9;
      for (const r of S.rooms) {
        if (r.type !== 'tavern') continue;
        for (const i of roomTiles(S, r)) {
          const t = T[i];
          if (t.k !== 'f' || t.fu || dm.dist[i] < 0 || dm.dist[i] >= bd) continue;
          const x = i % W,
            y = (i / W) | 0;
          if (
            !D8.some(
              ([dx, dy]) =>
                inB(x + dx, y + dy) && T[idx(x + dx, y + dy)].fu === 'keg' && T[idx(x + dx, y + dy)].fb
            )
          )
            continue;
          bd = dm.dist[i];
          best = i;
        }
      }
      if (best < 0) return false;
      return go({ type: 'serve', tile: -1, at: best, ph: 1, w: SERVE_S }, best);
    }
    if (kind === 'getpick') {
      // a miner swaps a worn-out or old iron pick for a bronze one from the stock
      if (have(S, 'pick') < 1 || (d.pick && d.pick.kind === 'bronze')) return false;
      const st = nearest(dm, stocks);
      if (st < 0) return false;
      return go({ type: 'getpick', ph: 1, tile: -1 }, st);
    }
    if (kind === 'harvest' || kind === 'plant') {
      let best = -1,
        bd = 1e9;
      T.forEach((t, i) => {
        if (!t.r || t.cl || t.k !== 'f' || t.o !== 'soil') return;
        const r = roomById(S, t.r);
        if (!r || r.type !== 'farm') return;
        if (kind === 'harvest' ? t.g !== 2 : t.g !== 0) return;
        const c = dm.dist[i];
        if (c >= 0 && c < bd) {
          bd = c;
          best = i;
        }
      });
      if (best < 0) return false;
      if (!go({ type: kind, tile: best, ph: 1, w: kind === 'harvest' ? HARVEST_S : PLANT_S }, best))
        return false;
      T[best].cl = d.id;
      return true;
    }
    return false;
  }

  // ── doing it ─────────────────────────────────────────────────────
  function walk(S, d, dt) {
    let left = dt * WALK;
    while (d.path.length && left > 0) {
      const n = d.path[0],
        nx = n % W,
        ny = (n / W) | 0;
      if (!isFloor(S, nx, ny)) {
        d.path = [];
        break;
      }
      const dx = nx - d.x,
        dy = ny - d.y,
        dist = Math.hypot(dx, dy);
      if (Math.abs(dy) > 2) {
        // down (or up) the stair: STAIR_STEPS tiles' walk on the steps, then out on the other layer
        d.stairT = (d.stairT || 0) + left;
        left = 0;
        if (d.stairT < STAIR_STEPS) break;
        d.stairT = 0;
        d.x = nx;
        d.y = ny;
        d.path.shift();
        break;
      }
      if (dist <= left) {
        d.x = nx;
        d.y = ny;
        left -= dist;
        d.path.shift();
      } else {
        d.x += (dx / dist) * left;
        d.y += (dy / dist) * left;
        left = 0;
      }
    }
    return !d.path.length;
  }
  const ACT = {
    dig: 'Digging',
    smooth: 'Smoothing a wall',
    haul: 'Hauling',
    build: 'Building',
    construct: 'Building',
    cut: 'Cutting stone blocks',
    plant: 'Planting deepcaps',
    harvest: 'Harvesting',
    brew: 'Brewing',
    eat: 'Eating',
    drink: 'Drinking',
    sleep: 'Sleeping',
    getpick: 'Fetching a bronze pick',
    mourn: 'At the Wall of Remembrance',
    serve: 'Serving behind the bar',
    tend: 'Tending the infirmary',
    engrave: 'Engraving a wall',
    flee: 'Running from an elemental!',
    hunt: 'Going after an elemental',
    arm: 'Taking up arms',
    train: 'Training at the barracks',
    guard: 'Standing guard',
    heal: 'Abed in the infirmary'
  };
  const actOf = j => (j.type === 'craft' ? RECIPES[j.rec].act : ACT[j.type]);
  function work(S, d, dt) {
    const j = d.job,
      T = S.tiles;
    if (!walk(S, d, dt)) {
      d.act = (actOf(j) || 'Walking') + '…';
      return;
    }
    const here = idx(Math.round(d.x), Math.round(d.y)),
      stocks = stockTiles(S);
    const goTo = dest => {
      const dm = distMap(S, d.x, d.y),
        p = pathTo(dm, dest);
      if (!p) {
        drop(S, d);
        return false;
      }
      d.path = p;
      return true;
    };
    switch (j.type) {
      case 'idle':
        j.w -= dt;
        if (j.w <= 0) d.job = null;
        return;
      case 'dig':
      case 'smooth': {
        const t = T[j.tile];
        if (!t || t.k !== 'r' || (j.type === 'dig' ? !t.d : !t.m)) {
          drop(S, d);
          return;
        }
        d.act = ACT[j.type];
        j.w -= dt * (j.type === 'dig' ? digRate(d) : 1) * speedOf(S, d);
        if (j.w > 0) return;
        t.cl = 0;
        d.job = null;
        d.xp += j.type === 'dig' ? 2 : 3;
        if (j.type === 'smooth') {
          t.m = false;
          t.w = true;
          return;
        }
        const hard = !t.bt && (t.h === 3 || (t.o && t.o !== 'soil'));
        dig(S, j.tile);
        wearPick(S, d);
        if (hard && !d.hurt && rnd(S) < HURT_CHANCE) {
          d.hurt = S.t;
          logMsg(
            S,
            '🩹 ' +
              d.name.split(' ')[0] +
              ' is hurt by a fall of hard stone' +
              (S.tiles.some(x => x.fu === 'cot' && x.fb) ? '.' : ': an infirmary would mend them quicker.')
          );
        }
        return;
      }
      case 'haul': {
        const it = S.items.find(x => x.id === j.item);
        if (j.ph === 0) {
          if (!it) {
            drop(S, d);
            return;
          }
          S.items = S.items.filter(x => x !== it);
          d.carry = { kind: it.kind, n: it.n };
          j.ph = 1;
          const dm = distMap(S, d.x, d.y),
            st = nearest(dm, stocks);
          if (st < 0) {
            addItem(S, here, it.kind, it.n);
            d.carry = null;
            drop(S, d);
            return;
          }
          d.path = pathTo(dm, st) || [];
          return;
        }
        if (d.carry) {
          addStock(S, d.carry.kind, d.carry.n);
          d.carry = null;
        }
        d.job = null;
        return;
      }
      case 'construct': {
        const t = T[j.tile];
        if (!t || !t.b || t.k !== 'f') {
          drop(S, d);
          return;
        }
        if (j.ph === 0) {
          if (have(S, 'block') < 1) {
            drop(S, d);
            return;
          }
          S.stock.block--;
          d.carry = { kind: 'block', n: 1 };
          j.ph = 1;
          j.w = BUILD_S;
          // stand beside it, never on it (or the mason would wall himself in)
          const dm = distMap(S, d.x, d.y),
            s = standBy(S, dm, j.tile);
          const p = s >= 0 ? pathTo(dm, s) : null;
          if (!p) {
            drop(S, d);
            return;
          }
          d.path = p;
          return;
        }
        if (here === j.tile) {
          // somehow standing on it: step off first
          const dm = distMap(S, d.x, d.y),
            s = standBy(S, dm, j.tile);
          if (s < 0) {
            drop(S, d);
            return;
          }
          d.path = [s];
          return;
        }
        d.act = ACT.construct;
        j.w -= dt * speedOf(S, d);
        if (j.w > 0) return;
        d.carry = null;
        t.cl = 0;
        d.job = null;
        d.xp += 3;
        construct(S, j.tile, here);
        return;
      }
      case 'build': {
        const t = T[j.tile];
        const want = t ? matOf(t) : 'block';
        if (!t || !t.fu || t.fb) {
          drop(S, d);
          return;
        }
        if (j.ph === 0) {
          if (have(S, want) < 1) {
            drop(S, d);
            return;
          }
          S.stock[want]--;
          d.carry = { kind: want, n: 1 };
          j.ph = 1;
          j.w = BUILD_S;
          goTo(j.tile);
          return;
        }
        d.act = ACT.build;
        j.w -= dt * speedOf(S, d);
        if (j.w > 0) return;
        d.carry = null;
        t.cl = 0;
        d.job = null;
        d.xp += 3;
        t.fb = true;
        const r = roomById(S, t.r);
        if (r && roomTiles(S, r).every(i => !T[i].fu || T[i].fb))
          logMsg(S, '🏠 ' + ROOMS[r.type].name + ' is furnished.');
        if (r && r.type === 'tavern') hireKeeper(S);
        return;
      }
      case 'craft': {
        const t = T[j.tile],
          R = RECIPES[j.rec];
        if (!R || !t || !(R.atTile ? R.atTile(S, j.tile, t) : t.fu === R.at && t.fb)) {
          drop(S, d);
          return;
        }
        if (j.ph === 0) {
          for (const k in R.takes)
            if (have(S, k) < R.takes[k]) {
              drop(S, d);
              return;
            }
          for (const k in R.takes) S.stock[k] -= R.takes[k];
          j.took = Object.assign({}, R.takes);
          d.carry = { kind: Object.keys(R.takes)[0], n: 1 };
          j.ph = 1;
          j.w = R.s;
          goTo(j.tile);
          return;
        }
        d.act = R.act;
        j.w -= dt * speedOf(S, d);
        if (j.w > 0) return;
        d.carry = null;
        j.took = null;
        t.cl = 0;
        d.job = null;
        d.xp += 3;
        for (const k in R.makes) addItem(S, j.tile, k, R.makes[k]);
        return;
      }
      case 'getpick': {
        d.job = null;
        if (have(S, 'pick') < 1) return;
        S.stock.pick--;
        const was = d.pick;
        d.pick = { kind: 'bronze', uses: PICKS.bronze.uses };
        logMsg(
          S,
          '⛏ ' +
            d.name.split(' ')[0] +
            (was ? ' trades the old iron pick for a bronze one.' : ' takes up a new bronze pick.')
        );
        return;
      }
      case 'flee':
        d.act = ACT.flee;
        j.w -= dt;
        if (j.w <= 0) d.job = null;
        return;
      case 'hunt': {
        const f = S.foes.find(x => x.id === j.foe && x.hp > 0);
        d.act = f ? 'Fighting a ' + FOES[f.kind].name : 'Looking for the elemental';
        j.w -= dt;
        // look again every couple of seconds: it moves
        if (!f || j.w <= 0) d.job = null;
        return;
      }
      case 'arm': {
        d.job = null;
        if (have(S, j.gear) < 1) return;
        const G = GEAR[j.gear],
          old = d.gear[G.slot];
        S.stock[j.gear]--;
        if (old) S.stock[old] = have(S, old) + 1;
        d.gear[G.slot] = j.gear;
        logMsg(S, '⚔ ' + d.name.split(' ')[0] + ' takes up a ' + G.name + '.');
        return;
      }
      case 'train': {
        d.act = ACT.train;
        j.w -= dt;
        if (j.w > 0) return;
        T[j.tile].cl = 0;
        d.job = null;
        d.fx = (d.fx || 0) + 4;
        return;
      }
      case 'guard': {
        const o = S.dwarves.find(w => w.id === j.who);
        d.act = o ? 'Standing guard over ' + o.name.split(' ')[0] : ACT.guard;
        j.w -= dt;
        // the one they're guarding has moved on: follow
        if (j.w <= 0 || !o || Math.hypot(o.x - d.x, o.y - d.y) > 6) d.job = null;
        return;
      }
      case 'tend': {
        d.act = ACT.tend;
        j.w -= dt;
        if (j.w <= 0) d.job = null;
        return;
      }
      case 'engrave': {
        const t = T[j.tile];
        if (!t || t.k !== 'r' || !t.w || t.en) {
          drop(S, d);
          return;
        }
        d.act = ACT.engrave;
        j.w -= dt * speedOf(S, d);
        if (j.w > 0) return;
        t.cl = 0;
        t.en = true;
        d.job = null;
        d.xp += 3;
        S.engraved = (S.engraved || 0) + 1;
        return;
      }
      case 'serve': {
        d.act = ACT.serve;
        j.w -= dt;
        if (j.w <= 0) d.job = null; // looks round for anything more pressing, then likely back to the bar
        return;
      }
      case 'mourn': {
        d.act = ACT.mourn;
        j.w -= dt;
        if (j.w > 0) return;
        d.job = null;
        const k = d.grudges.findIndex(g => g.why === j.why);
        if (k >= 0) {
          d.grudges.splice(k, 1);
          logMsg(
            S,
            '🕯 ' +
              d.name.split(' ')[0] +
              ' carves a word for ' +
              j.why.slice(9) +
              ' on the Wall of Remembrance, and is the easier for it.'
          );
        }
        return;
      }
      case 'heal': {
        const t = T[j.tile];
        if (!t || t.fu !== 'cot' || !t.fb || !d.hurt) {
          drop(S, d);
          return;
        }
        d.act = ACT.heal;
        j.w -= dt * (tended(S) ? 2 : 1);
        d.needs.sleep = Math.min(100, d.needs.sleep + (dt / SLEEP_S) * 100);
        if (j.w > 0) return;
        t.cl = 0;
        d.job = null;
        d.hurt = 0;
        d.hp = maxHp(d);
        logMsg(S, '🩹 ' + d.name.split(' ')[0] + ' is back on their feet, mended in the infirmary.');
        return;
      }
      case 'plant':
      case 'harvest': {
        const t = T[j.tile];
        d.act = ACT[j.type];
        j.w -= dt * speedOf(S, d);
        if (j.w > 0) return;
        t.cl = 0;
        d.job = null;
        d.xp += 2;
        if (j.type === 'plant') {
          t.g = 1;
          t.gt = 0;
          t.crop = t.crop === 'cap' ? 'barley' : 'cap';
        } else {
          const c = t.crop || 'cap';
          addItem(S, j.tile, c === 'cap' ? 'food' : 'barley', HARVEST[c]);
          t.g = 0;
        }
        return;
      }
      case 'eat':
      case 'drink': {
        const need = j.type === 'eat' ? 'food' : 'ale';
        if (j.ph === 0) {
          // a cooked meal before raw deepcaps
          const item = j.type === 'eat' ? (have(S, 'meal') > 0 ? 'meal' : 'food') : 'ale';
          j.item2 = item;
          if (have(S, item) < 1) {
            d.lack[need] = true;
            d.job = null;
            return;
          }
          S.stock[item]--;
          d.carry = { kind: item, n: 1 };
          j.ph = 1;
          // to a table (the Great Hall's first), or for a drink to the tavern's keg first
          const dm = distMap(S, d.x, d.y);
          let seat = -1,
            bd = 1e9;
          T.forEach((t, i) => {
            if (!t.fb || dm.dist[i] < 0) return;
            let c;
            if (t.fu === 'table') {
              const r = roomById(S, t.r);
              c = dm.dist[i] - (r && r.type === 'greathall' ? 30 : 0);
            } else if (t.fu === 'keg' && j.type === 'drink') {
              // a tavern's keg before a taproom's, but a tavern pours only with its keeper behind the bar
              const r = roomById(S, t.r);
              if (r && r.type === 'tavern' && !served(S, r)) return;
              c = dm.dist[i] - (r && r.type === 'tavern' ? 40 : 25);
            } else return;
            if (c < bd) {
              bd = c;
              seat = i;
            }
          });
          j.hall = seat >= 0;
          j.w = j.type === 'eat' ? EAT_S : DRINK_S;
          if (seat >= 0) d.path = pathTo(dm, seat) || [];
          return;
        }
        d.act = ACT[j.type];
        j.w -= dt;
        if (j.w > 0) return;
        d.carry = null;
        d.needs[need] = 100;
        d.lack[need] = false;
        d.job = null;
        const r = roomAt(S, Math.round(d.x), Math.round(d.y));
        if (j.type === 'eat') {
          const meal = j.item2 === 'meal';
          if (!j.hall) {
            if (S.t > GRACE) addGrudge(S, d, 'Ate off the floor like a goblin');
          } else if (r && r.type === 'greathall') settleGrudge(S, d, 'a feast in the Great Hall');
          else if (r && rnd(S) < (roomStars(S, r) >= 2 ? 0.5 : 0) + (meal ? 0.4 : 0))
            settleGrudge(S, d, meal ? 'a hot meal at a good table' : 'a good meal in a fine hall');
        } else if (r && r.type === 'tavern') {
          // a taproom only slakes thirst; a tavern lifts the spirits
          d.merry = S.t + MERRY.s;
          if (rnd(S) < TAVERN_SETTLE) settleGrudge(S, d, 'a pint with friends in the tavern');
        }
        return;
      }
      case 'sleep': {
        d.act = j.floor ? 'Sleeping on the floor' : 'Sleeping';
        j.w -= dt;
        d.needs.sleep = Math.min(100, d.needs.sleep + (dt / SLEEP_S) * 100);
        if (j.w > 0) return;
        d.job = null;
        if (j.floor) {
          if (S.t > GRACE) addGrudge(S, d, 'Slept on the cold floor');
          return;
        }
        const r = roomAt(S, Math.round(d.x), Math.round(d.y));
        if (r && r.type === 'bedroom' && roomStars(S, r) >= 2)
          settleGrudge(S, d, 'a night in a fine bedroom');
        return;
      }
    }
  }
  function drop(S, d) {
    const j = d.job;
    if (j && j.tile >= 0 && S.tiles[j.tile] && S.tiles[j.tile].cl === d.id) S.tiles[j.tile].cl = 0;
    if (j && j.item) {
      const it = S.items.find(x => x.id === j.item);
      if (it) it.cl = 0;
    }
    if (j && j.took) {
      for (const k in j.took) S.stock[k] = have(S, k) + j.took[k];
      d.carry = null;
    }
    if (d.carry) {
      S.stock[d.carry.kind] = (S.stock[d.carry.kind] || 0) + d.carry.n;
      d.carry = null;
    }
    d.job = null;
    d.path = [];
  }
  // a dug tile wears a miner's pick; a worn-out pick is thrown on the slag heap
  function wearPick(S, d) {
    if (d.trade !== 'miner' || !d.pick) return;
    if (--d.pick.uses > 0) return;
    logMsg(
      S,
      '⛏ ' +
        d.name.split(' ')[0] +
        "'s " +
        PICKS[d.pick.kind].name +
        (have(S, 'pick')
          ? ' is worn out. A new one from the stock.'
          : ' is worn out: a forge could make bronze ones.')
    );
    d.pick = null;
  }
  // a wall or pillar turns floor into worked stone; a door stays floor (anyone can walk through it)
  function construct(S, i, aside) {
    const t = S.tiles[i],
      what = t.b;
    t.b = '';
    if (what === 'door') {
      t.dr = true;
      return;
    }
    if (what === 'well') {
      t.wl = true;
      return;
    }
    // whatever lies there goes into the stock, and anyone standing there steps aside to the builder's tile
    for (const it of S.items.filter(it => it.i === i)) addStock(S, it.kind, it.n);
    S.items = S.items.filter(it => it.i !== i);
    for (const who of S.dwarves.concat([S.durin]))
      if (Math.round(who.x) === i % W && Math.round(who.y) === ((i / W) | 0)) {
        who.x = aside % W;
        who.y = (aside / W) | 0;
        who.path = [];
      }
    t.k = 'r';
    t.h = 2;
    t.o = '';
    t.w = true;
    t.bt = true;
    t.g = 0;
    if (what === 'pillar') t.p = true;
  }
  function dig(S, i) {
    const t = S.tiles[i],
      x = i % W,
      y = (i / W) | 0;
    const built = t.bt,
      rubble = t.rb;
    t.k = 'f';
    t.d = false;
    t.m = false;
    t.w = false;
    t.bt = false;
    t.rb = false;
    t.cr = 0;
    if (built)
      addItem(S, i, 'block', 1); // a built wall or pillar gives its dressed block back
    else if (rubble)
      addItem(S, i, 'stone', 1); // cave-in rubble is all rough stone
    else if (t.o && ORES[t.o]) {
      addItem(S, i, ORES[t.o].name, 1);
      t.wo = true;
      t.o = '';
    } else if (t.o !== 'soil' && rnd(S) < STONE_CHANCE) addItem(S, i, 'stone', 1);
    reveal(S, x, y);
    if (t.sr === 'down') stairCheck(S);
    chamberNews(S, x, y);
  }

  // ── stock, the Thane's quota and the stair down ──────────────────
  // anything carried into the stock; ore also counts toward the quota
  function addStock(S, kind, n) {
    S.stock[kind] = have(S, kind) + n;
    if (ORE_ITEMS.has(kind)) {
      S.got[kind] = (S.got[kind] || 0) + n;
      quotaCheck(S);
    }
  }
  function quotaOf(S, z) {
    const q = LAYERS[z].quota;
    return Object.keys(q).map(k => ({ kind: k, need: q[k], got: Math.min(q[k], S.got[k] || 0) }));
  }
  const quotaMet = (S, z) => quotaOf(S, z).every(q => q.got >= q.need);
  function quotaCheck(S) {
    const z = S.depth;
    if (S.quotaDone[z] || !quotaMet(S, z)) return;
    S.quotaDone[z] = true;
    logMsg(
      S,
      z < LAYERS.length - 1
        ? '📜 Durin: "The Thane\'s quota for ' +
            LAYERS[z].name +
            ' is met! Now we may cut the stair down, at the deep spot."'
        : '📜 Durin: "The heartsilver is won. The Mountain\'s Heart lies below us… but that\'s a tale for another day."'
    );
  }
  // the deep spot's nine tiles
  function deepTiles(S, z) {
    const c = S.deep[z];
    if (c == null) return [];
    const x = c % W,
      y = (c / W) | 0,
      out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(idx(x + dx, y + dy));
    return out;
  }
  // found once Durin has prospected near it, or anyone has dug beside it
  const deepKnown = (S, z) => !!S.deepSeen[z] || deepTiles(S, z).some(i => S.tiles[i].s);
  function stairOf(S, z) {
    return S.stairs.find(s => s.z === z) || null;
  }
  // why the stair down from layer z can't be cut yet, or '' if it can
  function stairWhy(S, z) {
    if (z >= LAYERS.length - 1) return "This is the deepest layer: below lies the Mountain's Heart.";
    if (stairOf(S, z)) return '';
    if (z !== S.depth) return 'Only the deepest layer reached can be cut deeper.';
    if (!quotaMet(S, z)) return "The Thane's quota for this layer isn't met yet.";
    if (!deepKnown(S, z)) return "The deep spot isn't found yet: have Durin prospect, or dig about.";
    if (deepTiles(S, z).some(i => S.tiles[i].r)) return 'A room lies over the deep spot: remove it first.';
    return '';
  }
  function cutStair(S, z) {
    const why = stairWhy(S, z);
    if (why) return { ok: false, why };
    if (stairOf(S, z)) return { ok: false, why: 'The stair is already marked.' };
    for (const i of deepTiles(S, z)) {
      const t = S.tiles[i];
      release(S, i);
      t.sr = 'down';
      t.b = '';
      t.m = false;
      t.p = false;
      if (t.k === 'r') t.d = true;
    }
    S.stairs.push({ z, c: S.deep[z], done: false });
    logMsg(S, '🪜 Durin: "Cut the stair here, lads: three by three, down to ' + LAYERS[z + 1].name + '."');
    stairCheck(S);
    return { ok: true };
  }
  function stairCheck(S) {
    for (const st of S.stairs) {
      if (st.done || !deepTiles(S, st.z).every(i => S.tiles[i].k === 'f')) continue;
      st.done = true;
      // the landing on the layer below: dug out, with a stair back up
      const below = st.c + STRIDE * W,
        bx = below % W,
        by = (below / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const t = S.tiles[idx(bx + dx, by + dy)];
          t.k = 'f';
          t.o = '';
          t.d = false;
          t.sr = 'up';
          reveal(S, bx + dx, by + dy);
        }
      S.links.push([st.c, below]);
      S.depth = Math.max(S.depth, st.z + 1);
      logMsg(
        S,
        '🪜 The stair is cut! ' +
          LAYERS[st.z + 1].name +
          ' lies open below (' +
          LAYERS[st.z + 1].stone +
          '). Durin: "Mind the roof down there: it holds ' +
          LAYERS[st.z + 1].roof +
          ' tiles from rock or a pillar."'
      );
      quotaCheck(S);
    }
  }

  // ── cave-ins ──────────────────────────────────────────────────────
  // how far each floor tile is from anything holding the roof up (rock, a pillar, a wall, the stair, the
  // map's edge), counted in king's moves
  function roofDist(S) {
    const N = W * H,
      dist = new Int32Array(N).fill(-1),
      q = new Int32Array(N);
    let h = 0,
      tl = 0;
    S.tiles.forEach((t, i) => {
      if (t.k !== 'f' || t.sr) {
        dist[i] = 0;
        q[tl++] = i;
      } else {
        const x = i % W;
        if (x === 0 || x === W - 1) {
          dist[i] = 1;
          q[tl++] = i;
        }
      }
    });
    while (h < tl) {
      const c = q[h++],
        cx = c % W,
        cy = (c / W) | 0;
      for (const [dx, dy] of D8) {
        const nx = cx + dx,
          ny = cy + dy;
        if (!inB(nx, ny)) continue;
        const n = idx(nx, ny);
        if (dist[n] < 0) {
          dist[n] = dist[c] + 1;
          q[tl++] = n;
        }
      }
    }
    return dist;
  }
  const unsound = (S, dist, i) => S.tiles[i].k === 'f' && dist[i] > LAYERS[layerOf((i / W) | 0)].roof;
  function roofCheck(S) {
    const dist = roofDist(S),
      T = S.tiles;
    T.forEach((t, i) => {
      if (t.k !== 'f') return;
      if (unsound(S, dist, i)) t.cr += CAVE.check;
      else t.cr = 0;
    });
    if (S.t < CAVE.start) return;
    // each unsound span, as one piece (tiles touching), may come down once it has been unsound long enough
    const seen = new Set();
    T.forEach((t, i) => {
      if (!t.cr || seen.has(i)) return;
      const cells = [i];
      seen.add(i);
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k],
          cx = c % W,
          cy = (c / W) | 0;
        for (const [dx, dy] of D4) {
          const nx = cx + dx,
            ny = cy + dy;
          if (!inB(nx, ny)) continue;
          const n = idx(nx, ny);
          if (!seen.has(n) && T[n].cr) {
            seen.add(n);
            cells.push(n);
          }
        }
      }
      if (Math.max(...cells.map(c => T[c].cr)) >= CAVE.grace && rnd(S) < CAVE.chance) caveIn(S, cells);
    });
  }
  function caveIn(S, cells) {
    const T = S.tiles,
      set = new Set(cells),
      z = layerOf((cells[0] / W) | 0);
    const rooms = new Set(cells.map(i => T[i].r).filter(Boolean)),
      where = rooms.size
        ? 'the ' + ROOMS[roomById(S, [...rooms][0]).type].name.toLowerCase()
        : 'the workings';
    for (const i of cells) {
      const t = T[i];
      release(S, i);
      t.k = 'r';
      t.h = 1;
      t.rb = true;
      t.o = '';
      t.w = false;
      t.fu = '';
      t.fb = false;
      t.b = '';
      t.dr = false;
      t.wl = false;
      t.g = 0;
      t.cr = 0;
      t.d = false;
      t.m = false;
    }
    const lost = S.items.filter(it => set.has(it.i)).length;
    S.items = S.items.filter(it => !set.has(it.i));
    for (const d of S.dwarves) if (d.bed >= 0 && set.has(d.bed)) d.bed = -1;
    // whoever was under it
    const here = who => set.has(idx(Math.round(who.x), Math.round(who.y)));
    const out = who => {
      let best = -1,
        bd = 1e9;
      for (const i of cells) {
        const x = i % W,
          y = (i / W) | 0;
        for (const [dx, dy] of D8) {
          const n = idx(x + dx, y + dy);
          if (inB(x + dx, y + dy) && T[n].k === 'f' && !set.has(n)) {
            const dd = Math.hypot(x + dx - who.x, y + dy - who.y);
            if (dd < bd) {
              bd = dd;
              best = n;
            }
          }
        }
      }
      if (best < 0) best = S.gate[0];
      who.x = best % W;
      who.y = (best / W) | 0;
      who.path = [];
    };
    const killed = [];
    for (const d of S.dwarves.slice()) {
      if (d.path.some(i => set.has(i))) drop(S, d);
      if (!here(d)) continue;
      if (rnd(S) < CAVE.kill) {
        killed.push(d);
        continue;
      }
      drop(S, d);
      out(d);
      d.hurt = S.t || 1;
    }
    if (here(S.durin)) out(S.durin);
    logMsg(
      S,
      '💥 Cave-in! The roof came down in ' +
        where +
        ' on ' +
        LAYERS[z].name +
        ' (' +
        cells.length +
        ' tile' +
        (cells.length > 1 ? 's' : '') +
        (lost ? ', ' + lost + ' load' + (lost > 1 ? 's' : '') + ' buried' : '') +
        '). Durin: "A span too wide. Pillars, planner!"'
    );
    for (const d of killed) killDwarf(S, d, 'crushed in a cave-in on ' + LAYERS[z].name);
    for (const d of S.dwarves) addGrudge(S, d, 'The roof came down');
    S.caveIns = (S.caveIns || 0) + 1;
  }
  function killDwarf(S, d, how) {
    drop(S, d);
    S.dwarves = S.dwarves.filter(w => w !== d);
    S.dead.push({ name: d.name, trade: d.trade, day: dayOf(S), how, warrior: !!d.drafted });
    // the Thane sends someone to take their place, once they've been mourned
    (S.owed = S.owed || []).push({ trade: d.trade, t: S.t, for: d.name.split(' ')[0] });
    const first = d.name.split(' ')[0];
    logMsg(S, '🕯 ' + d.name + ' was ' + how + '.');
    for (const o of S.dwarves) addGrudge(S, o, 'Mourning ' + first);
    if (!S.dwarves.length) logMsg(S, '🕯 The Delve is silent. Not one of the crew is left.');
  }

  // ── Leading a big fight yourself (step 4) ──
  // A hollow waking or an elemental in the quarters pauses the Delve (S.pending) when the screen can run a
  // duel (S.canLead, set by js/mine.js) and the planner hasn't said "don't ask" (S.handFights false). The
  // duel's seats: your wizard, Durin, maybe a warrior, and up to LEAD.foes of the elementals (the rest
  // hang back in the rock and fight on on the map).
  const LEAD = {
    foes: 2,
    key: { wight: 'mine_wight', stonewake: 'mine_stonewake', crystal: 'mine_crystal', ember: 'mine_ember' },
    woundAfter: 0.25, // a lost duel leaves your wizard at a quarter
    mend: DAY // your wizard mends to full over a day
  };
  function askLead(S, foes, why) {
    if (!S.canLead || S.handFights === false || S.pending) return;
    const ids = foes.filter(f => f.hp > 0 && f.state === 'awake').map(f => f.id);
    if (ids.length) S.pending = { foes: ids, why, t: S.t };
  }
  // what the duel would be: the elementals as fighters, Durin and a warrior beside you
  function leadSetup(S) {
    const P = S.pending;
    if (!P) return null;
    const all = P.foes.map(id => S.foes.find(f => f.id === id)).filter(f => f && f.hp > 0);
    const foes = all
      .slice()
      .sort((a, b) => b.hp - a.hp)
      .slice(0, LEAD.foes);
    const D = S.durin,
      allies = [];
    if (!D.down) allies.push({ who: 'durin', key: 'durin', wizard: true, hpFrac: D.hp / DURIN.hp });
    // a warrior too, if there's a seat (4 in all) and one's fit to fight on that layer
    if (1 + allies.length + foes.length < 4) {
      const z = layerOf(Math.round(foes[0] ? foes[0].y : 0));
      const w = S.dwarves
        .filter(d => d.drafted && d.hp > maxHp(d) * FIGHT.retreat && layerOf(Math.round(d.y)) === z)
        .sort((a, b) => b.hp - a.hp)[0];
      if (w)
        allies.push({
          who: w.id,
          key: 'mine_warrior',
          name: w.name.split(' ')[0],
          hpFrac: w.hp / maxHp(w),
          dwarf: w
        });
    }
    return { foes, allies, left: all.length - foes.length };
  }
  // the battle engine's result back on the map. res null: let it play out on the map as before
  function resolvePending(S, res) {
    const P = S.pending;
    S.pending = null;
    if (!P || !res) return;
    const set = res.set;
    set.foes.forEach((f, i) => {
      if (!S.foes.includes(f) || f.hp <= 0) return;
      if ((res.bound || []).includes(i)) return boundNow(S, f);
      const left = res.foeHp[i] == null ? 1 : res.foeHp[i];
      f.hp = Math.round(f.max * left);
      if (f.hp <= 0)
        foeDies(
          S,
          f,
          set.allies.filter(a => a.dwarf).map(a => a.dwarf)
        );
    });
    S.foes = S.foes.filter(f => f.hp > 0 || f.state === 'sleep' || f.state === 'servant');
    // the runes Durin set in the duel come out of the stock
    for (const k of ['rune', 'silverrune'])
      if (res.runesUsed && res.runesUsed[k]) S.stock[k] = Math.max(0, (S.stock[k] || 0) - res.runesUsed[k]);
    // allies' wounds: Durin and the warrior keep what the duel left them
    set.allies.forEach((a, i) => {
      const frac = res.allyHp && res.allyHp[i] != null ? res.allyHp[i] : null;
      if (frac == null) return;
      if (a.who === 'durin') {
        if (frac <= 0) hitDurin(S, { kind: 'wight' }, S.durin.hp + 1);
        else S.durin.hp = Math.max(1, Math.round(DURIN.hp * frac));
      } else if (a.dwarf && S.dwarves.includes(a.dwarf)) {
        if (frac <= 0)
          ((a.dwarf.hp = Math.max(1, Math.round(maxHp(a.dwarf) * 0.1))),
            (a.dwarf.hurt = a.dwarf.hurt || S.t || 1));
        else a.dwarf.hp = Math.max(1, Math.round(maxHp(a.dwarf) * frac));
        a.dwarf.fx = (a.dwarf.fx || 0) + 5;
      }
    });
    S.led = (S.led || 0) + 1;
    if (res.won) {
      S.ledWon = (S.ledWon || 0) + 1;
      logMsg(
        S,
        '⚔ You lead the fight yourself, and the Delve holds.' +
          (res.bound && res.bound.length ? ' Durin binds ' + res.bound.length + ' of them.' : '')
      );
      for (const d of S.dwarves) settleGrudge(S, d, 'saw the planner fight for the Delve');
    } else
      logMsg(
        S,
        "⚔ The fight goes against you; your wizard is carried back to the gate. What's left of the elementals is still loose."
      );
  }
  const heldBy = (S, f) => !!(S.durin.bind && S.durin.bind.foe === f.id && S.durin.bind.ph === 'chant');
  // worn down, and Durin's set on binding it: the warriors hold it rather than finish it
  const spared = (S, f) => !!(S.durin.bind && S.durin.bind.foe === f.id && f.hp <= f.max * BIND.at);
  const runeFor = f => (BIND.silver[f.kind] ? 'silverrune' : 'rune');
  // why Durin can't bind this one now (or '' if he can set out to)
  function bindWhy(S, f) {
    if (!f || f.hp <= 0) return 'There is nothing there to bind.';
    if (f.state === 'servant') return 'It is already bound, and serving the hold.';
    if (f.state !== 'awake') return 'It sleeps in its hollow. Wake it, wear it down, then bind it.';
    if (S.durin.down) return 'Durin is mending at Stonedeep.';
    if (layerOf(Math.round(f.y)) !== layerOf(Math.round(S.durin.y)) && !S.links.length)
      return "Durin can't reach that layer yet.";
    const r = runeFor(f);
    if (!have(S, r))
      return r === 'rune'
        ? 'No rune-stone in the stock: the mason cuts them at the workshop bench (a dressed block each).'
        : 'A ' +
            FOES[f.kind].name +
            " needs a silver rune: a runesmith inlays them in a Runesmith's hall (a block and a silver). Runesmiths come by application, once the Glimmerdark is open.";
    return '';
  }
  function bind(S, id) {
    const f = S.foes.find(x => x.id === id && x.hp > 0);
    const why = bindWhy(S, f);
    if (why) return { ok: false, why };
    S.durin.bind = { foe: f.id, ph: 'go', t: 0, took: 0, need: 0, repath: 0 };
    S.durin.act = 'Going to bind the ' + FOES[f.kind].name;
    return { ok: true };
  }
  function stopBind(S, msg) {
    const B = S.durin.bind;
    if (!B) return;
    S.durin.bind = null;
    S.durin.path = [];
    S.durin.act = 'Watching the work';
    if (msg) logMsg(S, msg);
  }
  // no raw rock beside it: it can't slip away, and the binding goes quicker
  function boxedIn(S, f) {
    const x = Math.round(f.x),
      y = Math.round(f.y);
    return !D8.concat([[0, 0]]).some(([dx, dy]) => {
      if (!inB(x + dx, y + dy)) return false;
      const t = S.tiles[idx(x + dx, y + dy)];
      return t.k === 'r' && !t.w;
    });
  }
  function hitDurin(S, f, dmg) {
    const D = S.durin;
    D.hp -= dmg;
    D.hitT = S.t;
    if (D.bind && D.bind.ph === 'chant') {
      D.bind.took += dmg;
      if (D.bind.took >= BIND.breakAt) {
        f.rage = S.t + BIND.rage;
        stopBind(
          S,
          '💥 The ' + FOES[f.kind].name + " tears free of Durin's chant, enraged! Hold it off him next time."
        );
      }
    }
    if (D.hp <= 0) {
      stopBind(S);
      const g = S.gate[0];
      Object.assign(D, { hp: 0, down: S.t + DURIN.rest, path: [], x: g % W, y: (g / W) | 0 });
      D.act = 'Carried up to Stonedeep to mend';
      logMsg(
        S,
        "🩸 Durin is struck down! The crew carry him up to Stonedeep to mend. No bindings till he's back."
      );
      for (const d of S.dwarves) addGrudge(S, d, 'Saw Durin struck down');
    }
  }
  function durinStep(S, dt) {
    const D = S.durin;
    if (D.hp == null) Object.assign(D, { hp: DURIN.hp, bind: null, down: 0 });
    if (D.down) {
      if (S.t < D.down) return;
      D.down = 0;
      D.hp = DURIN.hp;
      D.act = 'Back from Stonedeep';
      logMsg(S, '🪨 Durin is back on his feet: "Right. Where were we?"');
    }
    if (D.hp < DURIN.hp && S.t - (D.hitT || 0) > 15) D.hp = Math.min(DURIN.hp, D.hp + dt / 6);
    const B = D.bind;
    if (B) {
      const f = S.foes.find(x => x.id === B.foe && x.hp > 0 && x.state === 'awake');
      if (!f) return stopBind(S);
      const K = FOES[f.kind],
        near = Math.hypot(D.x - f.x, D.y - f.y) < 1.6;
      if (B.ph === 'go' || B.ph === 'wait') {
        // he keeps a few tiles off until the warriors have worn it down, then closes in
        const worn = f.hp <= f.max * BIND.at,
          dist = Math.hypot(D.x - f.x, D.y - f.y);
        if (!worn && dist < BIND.standOff) {
          B.ph = 'wait';
          D.path = [];
          D.act = 'Waiting for the ' + K.name + ' to be worn down';
          return;
        }
        if (!near) {
          B.ph = 'go';
          B.repath -= dt;
          if (B.repath <= 0 || !D.path.length) {
            B.repath = 2;
            // a floor tile beside it
            const dm = distMap(S, D.x, D.y),
              fx = Math.round(f.x),
              fy = Math.round(f.y);
            let best = -1,
              bd = 1e9;
            for (const [dx, dy] of D8.concat([[0, 0]])) {
              if (!inB(fx + dx, fy + dy)) continue;
              const i = idx(fx + dx, fy + dy);
              if (dm.dist[i] >= 0 && dm.dist[i] < bd) {
                bd = dm.dist[i];
                best = i;
              }
            }
            if (best < 0) return stopBind(S, '🪨 Durin: "I can\'t get at the ' + K.name + ' from here."');
            D.path = pathTo(dm, best) || [];
          }
          D.act = 'Going to bind the ' + K.name;
          walk(S, D, dt);
        } else {
          D.path = [];
          if (f.hp > f.max * BIND.at) {
            B.ph = 'wait';
            D.act = 'Waiting for the ' + K.name + ' to be worn down';
          } else {
            // the chant begins: the rune is set in the stone now
            const r = runeFor(f);
            if (!have(S, r))
              return stopBind(
                S,
                '🪨 Durin: "No ' +
                  (r === 'rune' ? 'rune-stone' : 'silver rune') +
                  ' left! I can\'t bind without one."'
              );
            S.stock[r]--;
            B.ph = 'chant';
            B.t = 0;
            B.took = 0;
            B.need = BIND.s[f.kind] * (boxedIn(S, f) ? BIND.worked : 1);
            D.act = 'Binding the ' + K.name;
            logMsg(
              S,
              '🪨 Durin sets a ' +
                (r === 'rune' ? 'rune-stone' : 'silver rune') +
                ' and begins to chant over the ' +
                K.name +
                '.'
            );
          }
        }
      }
      if (B.ph === 'chant') {
        B.t += dt;
        // in a raw tunnel it may slip away into the stone
        if (!boxedIn(S, f) && rnd(S) < BIND.slip * dt) {
          const x = Math.round(f.x),
            y = Math.round(f.y);
          const out = D8.map(([dx, dy]) => [x + dx, y + dy]).filter(
            ([a, b]) => inB(a, b) && S.tiles[idx(a, b)].k === 'r' && !S.tiles[idx(a, b)].w
          );
          if (out.length) {
            const [a, b] = out[(rnd(S) * out.length) | 0];
            f.x = a;
            f.y = b;
            f.path = [];
            f.repath = 0;
            return stopBind(
              S,
              '〰 The ' +
                K.name +
                " slips into the raw stone and Durin's chant breaks. (Bind them where the walls are worked.)"
            );
          }
        }
        if (B.t >= B.need) boundNow(S, f);
      }
      return;
    }
    walk(S, D, dt);
    if (!D.path.length && D.act === 'Walking') D.act = 'Watching the work';
  }
  function boundNow(S, f) {
    const K = FOES[f.kind];
    S.durin.bind = null;
    S.durin.act = 'Watching the work';
    f.state = 'servant';
    f.until = S.t + SERVANT.s;
    f.path = [];
    f.task = -1;
    f.digT = 0;
    S.bound = (S.bound || 0) + 1;
    logMsg(
      S,
      '✨ Durin binds the ' +
        K.name +
        '! It serves the hold as a stone-servant for ' +
        Math.round(SERVANT.s / DAY) +
        ' days, digging what you mark.'
    );
    for (const d of S.dwarves) settleGrudge(S, d, "proud of Durin's binding");
    // the kin of those it killed take the binding as justice done
    for (const v of f.victims)
      for (const d of S.dwarves) {
        const k = d.grudges.findIndex(g => g.why === 'Mourning ' + v);
        if (k >= 0) d.grudges.splice(k, 1);
      }
  }
  // stone-servants: they swim through the rock to marked tiles and dig them out, then go back at peace
  function servantsStep(S, dt) {
    for (const f of S.foes) {
      if (f.state !== 'servant') continue;
      if (S.t >= f.until) {
        f.hp = 0;
        f.gone = true;
        logMsg(S, '🌙 The bound ' + FOES[f.kind].name + ' sinks back into the mountain, at peace.');
        continue;
      }
      let t = f.task >= 0 ? S.tiles[f.task] : null;
      if (!t || t.k !== 'r' || !t.d || (t.cl && t.cl !== -f.id)) {
        if (t && t.cl === -f.id) t.cl = 0;
        // the nearest marked rock on its layer, beside dug floor first
        const z = layerOf(Math.round(f.y));
        let best = -1,
          bd = 1e9;
        for (let y = topOf(z); y < topOf(z) + LH; y++)
          for (let x = 0; x < W; x++) {
            const i = idx(x, y),
              tt = S.tiles[i];
            if (tt.k !== 'r' || !tt.d || tt.cl) continue;
            const open = D4.some(([dx, dy]) => inB(x + dx, y + dy) && S.tiles[idx(x + dx, y + dy)].k === 'f');
            const c = Math.hypot(x - f.x, y - f.y) + (open ? 0 : 30);
            if (c < bd) {
              bd = c;
              best = i;
            }
          }
        f.task = best;
        f.digT = 0;
        if (best < 0) continue;
        t = S.tiles[best];
        t.cl = -f.id;
      }
      const tx = f.task % W,
        ty = (f.task / W) | 0,
        dx = tx - f.x,
        dy = ty - f.y,
        dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const st = Math.min(dist, dt * SERVANT.speed);
        f.x += (dx / dist) * st;
        f.y += (dy / dist) * st;
        continue;
      }
      f.digT += dt;
      if (f.digT >= SERVANT.dig) {
        t.cl = 0;
        dig(S, f.task);
        f.task = -1;
      }
    }
    S.foes = S.foes.filter(f => !(f.state === 'servant' && f.hp <= 0));
  }

  // ── Durin (a piece you move; he prospects once a day) ──
  function durinMove(S, x, y) {
    if (S.durin.down) return false;
    if (S.durin.bind) stopBind(S);
    const dm = distMap(S, S.durin.x, S.durin.y),
      p = pathTo(dm, idx(x, y));
    if (!p) return false;
    S.durin.path = p;
    S.durin.act = 'Walking';
    return true;
  }
  function canProspect(S) {
    return S.prospectDay < dayOf(S);
  }
  function prospect(S) {
    if (!canProspect(S)) return { ok: false, why: 'Durin has prospected today. He can again tomorrow.' };
    const cx = Math.round(S.durin.x),
      cy = Math.round(S.durin.y);
    let ore = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (Math.hypot(x - cx, y - cy) <= PROSPECT_R) {
          const t = S.tiles[idx(x, y)];
          if (!t.s && t.o && t.o !== 'soil') ore++;
          t.s = true;
        }
    S.prospectDay = dayOf(S);
    S.durin.act = 'Prospecting';
    const z = layerOf(cy),
      dc = S.deep[z];
    if (dc != null && !S.deepSeen[z] && Math.hypot((dc % W) - cx, ((dc / W) | 0) - cy) <= PROSPECT_R + 2) {
      S.deepSeen[z] = true;
      logMsg(
        S,
        '🔍 Durin: "Hear that? The stone thins here. This is where the stair goes down." (the deep spot)'
      );
    }
    logMsg(
      S,
      ore
        ? '🔍 Durin taps the stone and listens: "' + ore + ' seams of ore hereabouts."'
        : '🔍 Durin taps the stone: "Nothing but rock this way."'
    );
    return { ok: true, ore };
  }

  // ── earth elementals (step 3) ────────────────────────────────────
  // They swim through raw stone (rock that isn't smoothed, built or a pillar) and walk the floor, but
  // worked stone and doors stop them, so a smoothed, doored living quarter is safe. Some sleep in hidden
  // hollows (chambers) that wake when a miner breaks in; digging near one sends tremors. Wanderers rise
  // through the rock now and then, more the deeper the Delve. Warriors (drafted dwarves) hunt them;
  // everyone else runs. Durin and binding come with step 4.
  const foePass = t => (t.k === 'f' && !t.dr) || (t.k === 'r' && !t.w && !t.bt && !t.p);
  function foeAt(S, i) {
    return S.foes.find(f => f.hp > 0 && idx(Math.round(f.x), Math.round(f.y)) === i);
  }
  function newFoe(S, kind, x, y, sleep, chamber) {
    const K = FOES[kind];
    const f = {
      id: S.nextId++,
      kind,
      x,
      y,
      hp: K.hp,
      max: K.hp,
      path: [],
      state: sleep ? 'sleep' : 'awake',
      chamber: chamber == null ? -1 : chamber,
      wander: !sleep && chamber == null,
      idleT: 0,
      repath: 0,
      victims: []
    };
    S.foes.push(f);
    return f;
  }
  // a few hidden hollows on a layer, each with its sleepers, away from the gate and the deep spot
  function placeChambers(S, z) {
    const y0 = topOf(z),
      deep = new Set(z < LAYERS.length - 1 ? deepTiles(S, z) : []);
    for (let c = 0; c < CHAMBERS[z]; c++)
      for (let tries = 0; tries < 200; tries++) {
        const cx = ri(S, z ? 6 : 12, W - 4),
          cy = ri(S, 3, LH - 4);
        const cells = [];
        let ok = true;
        for (let dy = -2; dy <= 2 && ok; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const i = idx(cx + dx, y0 + cy + dy),
              t = S.tiles[i];
            // the hollow and a skin of rock round it must be untouched stone
            if (t.k !== 'r' || t.s || t.r || t.p || t.bt || t.d || deep.has(i)) {
              ok = false;
              break;
            }
            if (
              Math.abs(dx) <= 1 &&
              Math.abs(dy) <= 1 &&
              !(Math.abs(dx) + Math.abs(dy) === 2 && rnd(S) < 0.4)
            )
              cells.push(i);
          }
        if (!ok) continue;
        for (const i of cells) Object.assign(S.tiles[i], { k: 'f', o: '', vd: true, d: false, m: false });
        const ch = { id: S.chambers.length, z, cells, woke: false, tremor: -1e9 };
        S.chambers.push(ch);
        const kinds = CHAMBER_FOES[z];
        const n = z === 0 ? 1 : ri(S, 1, 2);
        for (let k = 0; k < n; k++) {
          const i = cells[k % cells.length];
          newFoe(S, pick(S, kinds), i % W, (i / W) | 0, true, ch.id);
        }
        break;
      }
  }
  // a tile has just been dug: tremors from a hollow close by, or a breach that wakes it
  function chamberNews(S, x, y) {
    for (const ch of S.chambers) {
      if (ch.woke || ch.z !== layerOf(y)) continue;
      let near = 1e9;
      for (const i of ch.cells) near = Math.min(near, Math.abs((i % W) - x) + Math.abs(((i / W) | 0) - y));
      if (near <= 1) {
        ch.woke = true;
        for (const i of ch.cells) reveal(S, i % W, (i / W) | 0);
        const woken = S.foes.filter(f => f.chamber === ch.id && f.hp > 0);
        for (const f of woken) f.state = 'awake';
        soldiersArrive(S, 'They heard the stone stir, and came at a run.');
        logMsg(
          S,
          '⚠ The miners broke into a hollow on ' +
            LAYERS[ch.z].name +
            '! ' +
            (woken.length > 1
              ? woken.length + ' ' + FOES[woken[0].kind].name + 's wake'
              : 'A ' + FOES[woken[0].kind].name + ' wakes') +
            '. Warriors to arms; everyone else, run.'
        );
        askLead(S, woken, 'hollow');
      } else if (near <= TREMOR.r && S.t - ch.tremor > TREMOR.again) {
        ch.tremor = S.t;
        const c = ch.cells[(ch.cells.length / 2) | 0];
        S.tremors.push({ x: c % W, y: (c / W) | 0, t: S.t, sleep: true });
        logMsg(
          S,
          "〰 A tremor in the stone: something sleeps close by. Dig on and you'll wake it, or go round."
        );
      }
    }
  }
  // a wanderer rises through the rock on one of the layers reached, near the workings
  function wanderer(S) {
    const z = ri(S, 0, S.depth),
      y0 = topOf(z),
      T = S.tiles;
    const spots = [];
    for (let y = y0; y < y0 + LH; y++)
      for (let x = 1; x < W - 1; x++) {
        const t = T[idx(x, y)];
        if (t.k !== 'r' || !foePass(t)) continue;
        // 3 to 7 tiles from dug floor
        let best = 99;
        for (let dy = -7; dy <= 7; dy++)
          for (let dx = -7; dx <= 7; dx++) {
            const a = x + dx,
              b = y + dy;
            if (inB(a, b) && layerOf(b) === z && T[idx(a, b)].k === 'f' && T[idx(a, b)].s && !T[idx(a, b)].vd)
              best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
          }
        if (best >= 3 && best <= 7) spots.push(idx(x, y));
      }
    if (!spots.length) return;
    const i = pick(S, spots),
      kind = pick(S, WANDER_FOES[z]);
    newFoe(S, kind, i % W, (i / W) | 0, false);
    S.tremors.push({ x: i % W, y: (i / W) | 0, t: S.t });
    logMsg(S, '〰 A tremor on ' + LAYERS[z].name + ': a ' + FOES[kind].name + ' is rising through the rock.');
  }
  // a breadth-first search through what an elemental can cross, from (x, y)
  function foeDist(S, x, y) {
    const N = W * H,
      dist = new Int32Array(N).fill(-1),
      prev = new Int32Array(N).fill(-1),
      q = new Int32Array(N);
    const s0 = idx(Math.round(x), Math.round(y));
    let h = 0,
      tl = 0;
    dist[s0] = 0;
    q[tl++] = s0;
    while (h < tl) {
      const c = q[h++],
        cx = c % W,
        cy = (c / W) | 0;
      if (dist[c] > FOE_SIGHT) continue;
      for (const [dx, dy] of D4) {
        const nx = cx + dx,
          ny = cy + dy;
        if (!inB(nx, ny)) continue;
        const n = idx(nx, ny);
        if (dist[n] < 0 && foePass(S.tiles[n])) {
          dist[n] = dist[c] + 1;
          prev[n] = c;
          q[tl++] = n;
        }
      }
    }
    return { dist, prev };
  }
  function foesStep(S, dt) {
    for (const f of S.foes) {
      if (f.hp <= 0 || f.state !== 'awake') continue;
      if (heldBy(S, f)) continue; // held fast by Durin's chant
      const K = FOES[f.kind];
      f.repath -= dt;
      if (f.repath <= 0) {
        f.repath = 2;
        // the nearest dwarf it can reach on its layer
        const dm = foeDist(S, f.x, f.y);
        let best = null,
          bd = 1e9;
        for (const d of S.dwarves.concat(S.durin.down ? [] : [S.durin])) {
          const i = idx(Math.round(d.x), Math.round(d.y)),
            dd = dm.dist[i];
          if (dd >= 0 && dd < bd) {
            bd = dd;
            best = i;
          }
        }
        f.path = best >= 0 && best != null ? pathTo(dm, best) || [] : [];
        if (best == null) {
          f.idleT += 2;
          if (f.wander && f.idleT > FOE_GIVE_UP) {
            f.hp = 0;
            f.gone = true;
            logMsg(S, '〰 The ' + K.name + ' found no way in, and sinks back into the deep.');
          }
        } else f.idleT = 0;
      }
      // into the quarters: a room that wants doors (living space, not a workshop) is a breach
      if (!f.breached) {
        const t = S.tiles[idx(Math.round(f.x), Math.round(f.y))],
          r = t.r && roomById(S, t.r);
        if (r && !ROOMS[r.type].open) {
          f.breached = true;
          logMsg(S, '⚠ A ' + K.name + ' has broken into the ' + ROOMS[r.type].name.toLowerCase() + '!');
          askLead(S, [f], 'breach');
        }
      }
      // walk the path, slower through rock; stop beside its prey
      let left = dt * K.speed;
      while (f.path.length > 1 && left > 0) {
        const n = f.path[0],
          nx = n % W,
          ny = (n / W) | 0;
        if (!foePass(S.tiles[n])) {
          f.path = [];
          break;
        }
        const inRock = S.tiles[n].k === 'r',
          dx = nx - f.x,
          dy = ny - f.y,
          dist = Math.hypot(dx, dy),
          step = left * (inRock ? FOE_ROCK : 1);
        if (dist <= step) {
          f.x = nx;
          f.y = ny;
          left -= dist / (inRock ? FOE_ROCK : 1);
          f.path.shift();
        } else {
          f.x += (dx / dist) * step;
          f.y += (dy / dist) * step;
          left = 0;
        }
      }
    }
  }
  // how hard a dwarf hits: a warrior's hammer, a miner's pick, or bare fists; better with practice
  function hitOf(d) {
    let h = FIGHT.base;
    if (d.gear && d.gear.w) h = GEAR[d.gear.w].hit;
    else if (d.drafted) h = FIGHT.warrior;
    else if (d.trade === 'miner' && d.pick) h = FIGHT.pick;
    const lv = d.fx >= FIGHT.levels[2] ? 1.6 : d.fx >= FIGHT.levels[1] ? 1.3 : 1;
    return h * lv;
  }
  function fights(S) {
    for (const f of S.foes) {
      if (f.hp <= 0 || f.state !== 'awake') continue;
      const K = FOES[f.kind];
      const close = S.dwarves.filter(d => Math.hypot(d.x - f.x, d.y - f.y) < 1.6);
      const D = S.durin,
        durinNear = !D.down && Math.hypot(D.x - f.x, D.y - f.y) < 1.6;
      if (!close.length && !durinNear) continue;
      const rage = f.rage > S.t ? BIND.rageMul : 1;
      const fighters = close.filter(d => d.drafted);
      // the one Durin's binding: it strikes at him unless a warrior stands over it, holding it
      const held = heldBy(S, f);
      if (durinNear && (held ? !fighters.length : !close.length)) {
        hitDurin(S, f, K.atk * rage);
        if (!D.down && !D.bind) f.hp -= DURIN.hit; // Durin answers with his runes when he isn't chanting
        if (f.hp <= 0) foeDies(S, f, fighters);
        continue;
      }
      if (!D.bind && durinNear) f.hp -= DURIN.hit;
      // it strikes a warrior first if one stands against it
      const target = close.find(d => d.drafted) || close[0];
      let dmg = K.atk * rage * (target.gear && target.gear.a ? GEAR[target.gear.a].take : 1);
      target.hp = (target.hp == null ? maxHp(target) : target.hp) - dmg;
      target.hitT = S.t;
      if (!target.hurt) target.hurt = S.t || 1;
      if (target.hp <= 0) {
        f.victims.push(target.name.split(' ')[0]);
        f.killT = S.t;
        killDwarf(S, target, 'slain by a ' + K.name + ' on ' + LAYERS[layerOf(Math.round(f.y))].name);
      }
      // only warriors hit back: the rest of the crew are miners and brewers, and run. Once it's worn down and
      // Durin's coming to bind it, the warriors only hold it (pin it, take its blows) until he's done.
      if (!spared(S, f))
        for (const d of fighters) {
          if (!S.dwarves.includes(d)) continue;
          f.hp -= hitOf(d);
          d.fx = (d.fx || 0) + 1;
        }
      if (f.hp <= 0) foeDies(S, f, fighters);
    }
    S.foes = S.foes.filter(f => f.hp > 0 || f.state === 'sleep');
  }
  function foeDies(S, f, by) {
    if (S.durin.bind && S.durin.bind.foe === f.id) {
      S.durin.bind = null;
      S.durin.act = 'Watching the work';
      logMsg(S, '🪨 Durin: "Ach! Struck down before I could bind it. The chance is gone."');
    }
    const K = FOES[f.kind],
      i = idx(Math.round(f.x), Math.round(f.y));
    S.foeKills = (S.foeKills || 0) + 1;
    const at = S.tiles[i].k === 'f' ? i : by.length ? idx(Math.round(by[0].x), Math.round(by[0].y)) : i;
    addItem(S, at, 'stone', 2);
    const names = by.filter(d => S.dwarves.includes(d)).map(d => d.name.split(' ')[0]);
    logMsg(
      S,
      '⚔ The ' +
        K.name +
        ' falls' +
        (names.length ? ' to ' + names.join(' and ') : '') +
        ', and crumbles to rubble.'
    );
    // the kin of those it killed are avenged
    for (const v of f.victims)
      for (const d of S.dwarves) {
        const k = d.grudges.findIndex(g => g.why === 'Mourning ' + v);
        if (k >= 0) {
          d.grudges.splice(k, 1);
          logMsg(S, '✔ ' + d.name.split(' ')[0] + ' struck out "Mourning ' + v + '": ' + v + ' is avenged.');
        }
      }
  }
  // an awake elemental near this dwarf, on the same layer, within r (straight-line), that has found a way
  // to someone (one stuck behind worked stone is no danger, and nobody runs from it)
  function danger(S, d, r) {
    let best = null,
      bd = r;
    for (const f of S.foes) {
      if (f.hp <= 0 || f.state !== 'awake' || !f.path.length) continue;
      if (layerOf(Math.round(f.y)) !== layerOf(Math.round(d.y))) continue;
      const dd = Math.hypot(f.x - d.x, f.y - d.y);
      if (dd < bd) {
        bd = dd;
        best = f;
      }
    }
    return best;
  }
  function draft(S, id, on) {
    const d = S.dwarves.find(w => w.id === id);
    if (!d || d.trade === 'soldier') return;
    d.drafted = !!on;
    d.fx = d.fx || 0;
    if (d.job && (d.job.type === 'hunt' || d.job.type === 'train')) drop(S, d);
    logMsg(
      S,
      on
        ? '⚔ ' +
            d.name.split(' ')[0] +
            " takes up arms: they'll go out against any elemental that wakes, and train at the barracks when idle."
        : '⚔ ' + d.name.split(' ')[0] + ' stands down and goes back to their trade.'
    );
  }

  // ── a tick ───────────────────────────────────────────────────────
  function tick(S, dt) {
    if (S.pending) return; // a big fight waits on the planner: lead it, or let it play out
    let left = dt;
    while (left > 1e-6) {
      const s = Math.min(STEP, left);
      left -= s;
      step(S, s);
    }
  }
  function step(S, dt) {
    S.t += dt;
    for (const t of S.tiles)
      if (t.g === 1) {
        t.gt += dt;
        if (t.gt >= GROW_S) t.g = 2;
      }
    durinStep(S, dt);
    servantsStep(S, dt);
    S.caveT = (S.caveT || 0) + dt;
    if (S.caveT >= CAVE.check) {
      S.caveT -= CAVE.check;
      roofCheck(S);
    }
    // the elementals: wanderers rise now and then, the awake ones hunt, and blows are traded
    if (!S.soldiersCame && Math.floor(S.t / 5) !== Math.floor((S.t - dt) / 5)) {
      const R = soldiersReady(S);
      if (R.farm && R.well && R.brewery)
        soldiersArrive(
          S,
          "The hold can feed them now: they'll train at the barracks and stand guard over the crew."
        );
      else if (S.t >= SOLDIERS.late)
        soldiersArrive(
          S,
          "The Thane would wait no longer: they'll train at the barracks and stand guard over the crew."
        );
    }
    letterStep(S);
    S.wanderT += dt;
    if (
      S.soldiersCame &&
      S.t - S.soldiersT > WANDER.first &&
      S.wanderT >= WANDER.every / (1 + WANDER.deeper * S.depth)
    ) {
      S.wanderT = 0;
      wanderer(S);
    }
    foesStep(S, dt);
    S.fightT += dt;
    if (S.fightT >= FIGHT.tick) {
      S.fightT -= FIGHT.tick;
      fights(S);
    }
    S.tremors = S.tremors.filter(m => S.t - m.t < TREMOR.show);
    for (const d of S.dwarves.slice()) {
      for (const k of ['food', 'ale', 'sleep'])
        if (!(d.job && d.job.type === 'sleep' && k === 'sleep'))
          d.needs[k] = Math.max(0, d.needs[k] - (dt / NEED[k]) * 100);
      if (d.needs.food <= 0) addGrudge(S, d, 'Went hungry');
      if (d.needs.ale <= 0) addGrudge(S, d, 'Not a drop of ale in the hold');
      d.grudges = d.grudges.filter(g => S.t - g.t < GRUDGE_DAYS * DAY);
      if (d.hurt && !(d.job && d.job.type === 'heal') && S.t - d.hurt >= HEAL_WALK) {
        d.hurt = 0;
        logMsg(S, '🩹 ' + d.name.split(' ')[0] + ' has walked off the hurt at last.');
        if (S.t > GRACE && !S.tiles.some(t => t.fu === 'cot' && t.fb))
          addGrudge(S, d, 'Nursed a wound with nobody to tend it');
      }
      // wounds mend slowly away from a fight
      if (d.hp < maxHp(d) && S.t - (d.hitT || 0) > 15) d.hp = Math.min(maxHp(d), d.hp + dt / 8);
      // an elemental closing in: anyone not already running or fighting drops what they're doing
      const fighting = d.drafted && d.hp > maxHp(d) * FIGHT.retreat;
      if (d.job && d.job.type === 'hunt' && !fighting) drop(S, d); // too hurt: fall back
      if (
        d.job &&
        d.job.type !== 'flee' &&
        d.job.type !== 'hunt' &&
        !(fighting && S.t - (d.huntFail || -1e9) < 5) &&
        danger(S, d, fighting ? WAR_R : FLEE_R)
      ) {
        const j = d.job.type;
        if (!(d.drafted && (j === 'sleep' || j === 'eat' || j === 'drink' || j === 'heal'))) drop(S, d);
      }
      if (!d.job) {
        chooseJob(S, d);
        if (!d.job) continue;
      }
      work(S, d, dt);
    }
  }

  // ── the Mason's Eye ──────────────────────────────────────────────
  // judged a layer at a time (z); its named patterns are looked for on every layer
  function masonEye(S, z) {
    z = z || 0;
    const T = S.tiles,
      gate = new Set(S.gate),
      onZ = i => layerOf((i / W) | 0) === z;
    const floor = [],
      passage = [];
    T.forEach((t, i) => {
      if (t.k !== 'f' || !t.s || !onZ(i)) return;
      floor.push(i);
      if (!t.r && !gate.has(i) && !t.sr) passage.push(i);
    });
    const isPass = (x, y) => {
      if (!inB(x, y)) return false;
      const i = idx(x, y),
        t = T[i];
      return t.k === 'f' && t.s && !t.r && !gate.has(i) && !t.sr;
    };
    const marks = { jag: [], blob: [], dead: [] };
    // true lines: corners where a passage turns (a staircase tunnel is all corners)
    let corners = 0;
    for (const i of passage) {
      const x = i % W,
        y = (i / W) | 0,
        n = D4.map(([dx, dy]) => isFloor(S, x + dx, y + dy));
      const cnt = n.filter(Boolean).length;
      if (cnt === 2 && !(n[0] && n[1]) && !(n[2] && n[3])) {
        corners++;
        marks.jag.push(i);
      }
    }
    // order: passage that isn't a corridor but a shapeless hole (in a 3×3 of open passage)
    const blob = new Set();
    for (const i of passage) {
      const x = i % W,
        y = (i / W) | 0;
      for (let oy = -2; oy <= 0; oy++)
        for (let ox = -2; ox <= 0; ox++) {
          let all = true;
          for (let b = 0; b < 3 && all; b++)
            for (let a = 0; a < 3 && all; a++) if (!isPass(x + ox + a, y + oy + b)) all = false;
          if (all)
            for (let b = 0; b < 3; b++) for (let a = 0; a < 3; a++) blob.add(idx(x + ox + a, y + oy + b));
        }
    }
    marks.blob = [...blob];
    // dead ends that found nothing (no ore dug or seen beside them)
    let waste = 0;
    for (const i of passage) {
      const x = i % W,
        y = (i / W) | 0;
      if (D4.filter(([dx, dy]) => isFloor(S, x + dx, y + dy)).length !== 1) continue;
      let ore = false;
      for (const [dx, dy] of D8.concat([[0, 0]])) {
        const a = x + dx,
          b = y + dy;
        if (!inB(a, b)) continue;
        const t = T[idx(a, b)];
        if (t.wo || (t.s && t.o && t.o !== 'soil')) ore = true;
      }
      if (!ore && !T[i].d) {
        waste++;
        marks.dead.push(i);
      }
    }
    // symmetry, pillars and worked walls, room by room
    let symA = 0,
      symW = 0,
      rhyA = 0,
      rhyW = 0,
      wk = 0,
      wkN = 0;
    for (const r of S.rooms) {
      if (layerOf(r.y0) !== z) continue;
      const w = r.x1 - r.x0 + 1,
        h = r.y1 - r.y0 + 1,
        area = w * h;
      const cell = (x, y) => {
        const t = T[idx(x, y)];
        return t.k === 'f' ? 0 : t.p ? 1 : 2;
      };
      let mh = 0,
        mv = 0;
      for (let y = r.y0; y <= r.y1; y++)
        for (let x = r.x0; x <= r.x1; x++) {
          const c = cell(x, y);
          if (c === cell(r.x1 - (x - r.x0), y)) mh++;
          if (c === cell(x, r.y1 - (y - r.y0))) mv++;
        }
      symA += (Math.max(mh, mv) / area) * area;
      symW += area;
      const pil = roomTiles(S, r).filter(i => T[i].k === 'r' && T[i].p);
      if (pil.length >= 2) {
        rhyA += lattice(pil) * area;
        rhyW += area;
      }
      for (const i of roomWalls(S, r)) {
        wkN++;
        if (T[i].w) wk++;
      }
    }
    const parts = {};
    if (passage.length >= 4) parts.lines = Math.max(0, Math.min(1, 1 - (3 * corners) / passage.length));
    if (floor.length) parts.order = 1 - blob.size / floor.length;
    if (symW) parts.sym = symA / symW;
    if (rhyW) parts.rhythm = rhyA / rhyW;
    if (wkN) parts.worked = wk / wkN;
    let sw = 0,
      sv = 0;
    for (const k in parts) {
      sw += EYE_W[k];
      sv += EYE_W[k] * parts[k];
    }
    const penalty = Math.min(EYE_WASTE_MAX, waste * EYE_WASTE);
    const ready = floor.length >= EYE_MIN_FLOOR;
    const score = ready && sw ? Math.max(0, Math.round((sv / sw) * 100 - penalty)) : null;
    return { score, parts, waste, penalty, marks, ready, patterns: findPatterns(S, isPass) };
  }
  // pillars in a true lattice: every crossing of their columns and rows filled, at even spacing
  function lattice(pil) {
    const xs = [...new Set(pil.map(i => i % W))].sort((a, b) => a - b),
      ys = [...new Set(pil.map(i => (i / W) | 0))].sort((a, b) => a - b);
    const even = a => a.length < 3 || a.slice(1).every((v, k) => v - a[k] === a[1] - a[0]);
    const full = pil.length === xs.length * ys.length;
    return (full ? 0.6 : 0.2) + (even(xs) ? 0.2 : 0) + (even(ys) ? 0.2 : 0);
  }
  function findPatterns(S, isPass) {
    const T = S.tiles,
      got = [];
    // the Long Gallery: twenty passage tiles in a straight line
    let gal = false;
    for (let y = 0; y < H && !gal; y++) {
      let run = 0;
      for (let x = 0; x < W; x++) {
        run = isPass(x, y) ? run + 1 : 0;
        if (run >= 20) gal = true;
      }
    }
    for (let x = 0; x < W && !gal; x++) {
      let run = 0;
      for (let y = 0; y < H; y++) {
        run = isPass(x, y) ? run + 1 : 0;
        if (run >= 20) gal = true;
      }
    }
    if (gal) got.push('gallery');
    // the Thane's Cross: a hub with four one-wide arms of the same length, four or more
    outer: for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!isPass(x, y)) continue;
        const arms = D4.map(([dx, dy]) => {
          let n = 0;
          while (isPass(x + dx * (n + 1), y + dy * (n + 1))) n++;
          return n;
        });
        if (Math.min(...arms) < 4 || Math.max(...arms) !== Math.min(...arms)) continue;
        let narrow = true;
        D4.forEach(([dx, dy]) => {
          for (let k = 2; k <= 3; k++) {
            const ax = x + dx * k,
              ay = y + dy * k;
            if (isFloor(S, ax + dy, ay + dx) || isFloor(S, ax - dy, ay - dx)) narrow = false;
          }
        });
        if (narrow) {
          got.push('cross');
          break outer;
        }
      }
    // the Colonnade: a mirrored hall with four or more pillars in a full, even lattice
    for (const r of S.rooms) {
      const pil = roomTiles(S, r).filter(i => T[i].k === 'r' && T[i].p);
      if (pil.length < 4 || lattice(pil) < 0.99) continue;
      let ok = true;
      for (const i of pil) {
        const x = i % W,
          y = (i / W) | 0,
          mx = r.x1 - (x - r.x0),
          my = r.y1 - (y - r.y0);
        if (!T[idx(mx, y)].p || !T[idx(x, my)].p) ok = false;
      }
      if (ok) {
        got.push('colonnade');
        break;
      }
    }
    // the Ninefold Hall: nine rooms the same size, three by three at even spacing
    nine: for (const a of S.rooms) {
      const w = a.x1 - a.x0,
        h = a.y1 - a.y0;
      if (w < 1 || h < 1) continue; // rooms of 2×2 and up, a wall between
      const same = S.rooms.filter(r => r.x1 - r.x0 === w && r.y1 - r.y0 === h);
      if (same.length < 9) continue;
      const at = (x, y) => same.some(r => r.x0 === x && r.y0 === y);
      for (const b of same) {
        const sx = b.x0 - a.x0;
        if (b.y0 !== a.y0 || sx <= w + 1) continue;
        for (const c of same) {
          const sy = c.y0 - a.y0;
          if (c.x0 !== a.x0 || sy <= h + 1) continue;
          let all = true;
          for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++) if (!at(a.x0 + k * sx, a.y0 + j * sy)) all = false;
          if (all) {
            got.push('ninefold');
            break nine;
          }
        }
      }
    }
    // the Cloister: a court of pillars in a lattice with a room on each of its four sides (within 3 tiles)
    cloister: for (const c of S.rooms) {
      const pil = roomTiles(S, c).filter(i => T[i].k === 'r' && T[i].p);
      if (pil.length < 4 || lattice(pil) < 0.99) continue;
      const near = (r, side) => {
        const across = side === 'n' || side === 's';
        const overlap = across ? r.x0 <= c.x1 && r.x1 >= c.x0 : r.y0 <= c.y1 && r.y1 >= c.y0;
        if (!overlap) return false;
        if (side === 'n') return c.y0 - r.y1 >= 1 && c.y0 - r.y1 <= 3;
        if (side === 's') return r.y0 - c.y1 >= 1 && r.y0 - c.y1 <= 3;
        if (side === 'w') return c.x0 - r.x1 >= 1 && c.x0 - r.x1 <= 3;
        return r.x0 - c.x1 >= 1 && r.x0 - c.x1 <= 3;
      };
      if (['n', 's', 'w', 'e'].every(side => S.rooms.some(r => r !== c && near(r, side)))) {
        got.push('cloister');
        break cloister;
      }
    }
    // the Vein-follower: eight passage tiles in a straight line, six of them cut from ore
    const oreRun = cells => {
      let run = 0,
        ore = 0;
      for (const [x, y] of cells) {
        if (isPass(x, y)) {
          run++;
          if (T[idx(x, y)].wo) ore++;
          if (run >= 8 && ore >= 6) return true;
        } else run = ore = 0;
      }
      return false;
    };
    let vein = false;
    for (let y = 0; y < H && !vein; y++) vein = oreRun(Array.from({ length: W }, (_, x) => [x, y]));
    for (let x = 0; x < W && !vein; x++) vein = oreRun(Array.from({ length: H }, (_, y) => [x, y]));
    if (vein) got.push('vein');
    // the Wellhead Court: a room of 3 × 3 or more, odd both ways, with a well on its very middle tile
    if (
      S.rooms.some(r => {
        const w = r.x1 - r.x0 + 1,
          h = r.y1 - r.y0 + 1;
        return w >= 3 && h >= 3 && w % 2 && h % 2 && T[idx((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)].wl;
      })
    )
      got.push('wellhead');
    return got;
  }
  // call now and then: names any pattern found for the first time (for Durin to remark on)
  function notePatterns(S, z) {
    const eye = masonEye(S, z),
      fresh = [],
      all = new Set(eye.patterns);
    for (let k = 0; k <= S.depth; k++)
      if (k !== (z || 0)) for (const p of masonEye(S, k).patterns) all.add(p);
    for (const p of all)
      if (!S.found[p]) {
        S.found[p] = dayOf(S);
        fresh.push(p);
        logMsg(S, '✨ Durin: "That\'s ' + PATTERNS[p].name + '! I\'ll have it written in the Delve-book."');
      }
    return { eye, fresh };
  }

  // an older save: the new stock, picks and wounds, and the smith who came with the new rooms
  function migrate(S) {
    if (!S || S.v >= 10) return S;
    if (S.v < 9)
      S.owed = S.dead.map(d => ({ trade: d.trade, t: S.t - LETTERS.mourn, for: d.name.split(' ')[0] }));
    if (S.v < 8) migrate8(S);
    // applications: the next letter soon, kin of the dead among the first
    S.apps = [];
    S.coming = [];
    S.letterT = Math.max(LETTERS.first, S.t + DAY * 0.5);
    delete S.waveT;
    S.v = 10;
    return S;
  }
  function migrate8(S) {
    if (S.v < 7) migrate7(S);
    // soldiers now wait for a farm, a well and a brewery; ones already here keep the wanderers coming
    if (S.soldiersCame && S.soldiersT == null) S.soldiersT = 0;
    S.v = 8;
  }
  function migrate7(S) {
    if (S.v < 6) migrate6(S);
    // the Thane's soldiers: a save with something already awake gets them now
    if (S.foes.some(f => f.state === 'awake')) soldiersArrive(S);
    S.v = 7;
  }
  function migrate6(S) {
    if (S.v < 5) migrate5(S);
    // the elementals: hollows in stone not yet dug, fighting state on every dwarf
    Object.assign(S, { foes: [], chambers: [], tremors: [], wanderT: 0, fightT: 0, foeKills: 0 });
    for (const d of S.dwarves) Object.assign(d, { hp: DWARF_HP, drafted: false, gear: {}, fx: 0 });
    for (let z = 0; z < LAYERS.length; z++) placeChambers(S, z);
    S.v = 6;
    logMsg(
      S,
      '⚠ Durin: "There\'s things asleep in this mountain. Raise a barracks, draft some warriors, and work the walls round where we sleep."'
    );
  }
  function migrate5(S) {
    if (S.v < 4) migrate4(S);
    // the tavern keeper: an older save with a furnished tavern gets one now
    if (
      S.rooms.some(
        r => r.type === 'tavern' && roomTiles(S, r).some(i => S.tiles[i].fu === 'keg' && S.tiles[i].fb)
      )
    )
      hireKeeper(S);
    S.v = 5;
  }
  function migrate4(S) {
    if (S.v < 3) migrate3(S);
    // wells: damp spots on every layer (in stone not yet dug), and the wagon's water
    for (let z = 0; z < LAYERS.length; z++) damp(S, z);
    if (S.stock.water == null) S.stock.water = START_STOCK.water;
    S.v = 4;
    logMsg(S, '💧 Durin: "The brewer wants water. Look for damp stone and sink a well there."');
  }
  function migrate3(S) {
    if (S.v < 2) migrate2(S);
    // step 2: the layers below, the quota and the stair, cave-ins and the dead
    for (const t of S.tiles) Object.assign(t, { cr: t.cr || 0, rb: !!t.rb, sr: t.sr || '' });
    for (let y = S.tiles.length / W; y < H; y++)
      for (let x = 0; x < W; x++) S.tiles.push(newTile(y % STRIDE === LH));
    for (let z = 1; z < LAYERS.length; z++) genLayer(S, z);
    Object.assign(S, {
      depth: 0,
      deep: [],
      deepSeen: {},
      links: [],
      stairs: [],
      got: {},
      quotaDone: {},
      dead: []
    });
    S.caveT = 0;
    for (const k of ORE_ITEMS) if (S.stock[k]) S.got[k] = S.stock[k];
    for (let z = 0; z < LAYERS.length - 1; z++) placeDeep(S, z);
    S.v = 3;
    logMsg(
      S,
      '📜 A letter from the Thane: the Delve is to go five layers deep. Durin: "Mind the roofs, planner."'
    );
    quotaCheck(S);
  }
  function migrate2(S) {
    for (const k in START_STOCK) if (S.stock[k] == null) S.stock[k] = k === 'pick' ? 0 : START_STOCK[k];
    for (const d of S.dwarves) {
      // jobs of the old kinds (brew, cut) are dropped, their stock given back
      if (d.job && (d.job.type === 'brew' || d.job.type === 'cut' || d.job.type === 'build')) drop(S, d);
      if (d.pick === undefined) d.pick = d.trade === 'miner' ? { kind: 'old', uses: PICKS.old.uses } : null;
      if (d.hurt === undefined) d.hurt = 0;
    }
    if (!S.dwarves.some(d => d.trade === 'smith')) {
      const used = new Set(S.dwarves.map(d => d.name));
      let nm;
      do {
        nm = pick(S, NAMES.m) + ' ' + pick(S, SURNAMES);
      } while (used.has(nm));
      const g = S.gate[0];
      S.dwarves.push(newDwarf(S, nm, 'm', 'smith', g % W, (g / W) | 0));
      logMsg(S, '🔨 ' + nm + ', a smith, comes up the road to the gate. Give him a forge.');
    }
    S.v = 2;
  }

  const API = {
    W,
    H,
    DAY,
    STEP,
    ROOMS,
    TRADES,
    ORES,
    PATTERNS,
    LEVELS,
    EYE_W,
    GRUMBLE,
    DOWN_TOOLS,
    PROSPECT_R,
    RECIPES,
    PICKS,
    LH,
    STRIDE,
    LAYERS,
    CAVE,
    layerOf,
    topOf,
    quotaOf,
    quotaMet,
    deepTiles,
    deepKnown,
    stairOf,
    stairWhy,
    cutStair,
    roofDist,
    FOES,
    GEAR,
    DWARF_HP,
    WARRIOR_HP,
    SOLDIERS,
    soldiersArrive,
    soldiersReady,
    maxHp,
    TREMOR,
    draft,
    hitOf,
    NO_PICK,
    GREAT_HALL_MIN,
    MERRY,
    merry,
    newGame,
    migrate,
    tick,
    designate,
    makeRoom,
    removeRoom,
    roomAt,
    roomStars,
    roomOpenings,
    roomArea,
    roomWalls,
    durinMove,
    LEAD,
    LETTERS,
    SPECIAL,
    specialWhy,
    RENOWN_TIERS,
    renown,
    acceptApp,
    declineApp,
    leadSetup,
    resolvePending,
    bind,
    bindWhy,
    stopBind,
    BIND,
    SERVANT,
    DURIN,
    RUNES,
    runeFor,
    prospect,
    canProspect,
    masonEye,
    notePatterns,
    dayOf,
    clockOf,
    levelOf,
    idx,
    inB,
    isFloor,
    distMap,
    stockTiles
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MineEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
