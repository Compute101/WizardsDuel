// ═══════════════════════════════════════════════════════════════════
//  EXPLORE PIECES — what every map piece is, shared by the game
//  (js/explore.js) and the map generators (tools/mapgen/, run by
//  tools/build_maps.js in Node). Footprints, light spots, bridge decks,
//  the tile size and prop scale, and a seeded random.
//  Piece sizes come from the atlases' .json (sprites/ruins/ruins*.json).
// ═══════════════════════════════════════════════════════════════════
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.ExplorePieces = m;
})(this, function () {
  'use strict';

  const T = 64; // ground tile size, world px
  const PS = 0.62; // prop scale: atlas px → world px (a ground tile is ~100 atlas px)

  // ── draw scale for pieces drawn bigger than the first sheets (14–23: about twice the size), so a well isn't
  // the size of a cottage. Atlas px → world px, in place of PS; an object's own `scale` still wins (scaleOf).
  const KIND_SCALE = {
    // town props (sheet 14)
    signTavern: 0.26,
    signApothecary: 0.26,
    signSmith: 0.26,
    signBaker: 0.26,
    signBooks: 0.26,
    signTemple: 0.26,
    cratesProduce: 0.3,
    sacksGrain: 0.32,
    sacksPurple: 0.32,
    barrelsTrio: 0.3,
    cartLoaded: 0.36,
    wagonCovered: 0.42,
    washLine1: 0.36,
    washLine2: 0.36,
    well: 0.36,
    benchBack: 0.32,
    benchPlain: 0.32,
    noticeBoard: 0.34,
    lanternPost: 0.5,
    lanternPostBroken: 0.5,
    lanternSmashed: 0.3,
    catGinger: 0.28,
    catTabby: 0.28,
    catBlack: 0.28,
    catSleeping: 0.28,
    crow1: 0.3,
    crow2: 0.3,
    crowFlying: 0.32,
    crowPerch: 0.32,
    handcartSacks: 0.36,
    handcartGreens: 0.36,
    barrowStone: 0.34,
    cartPotions: 0.38,
    crateBooks: 0.36,
    tableBooks: 0.36,
    chestOld: 0.32,
    basketApples: 0.28,
    // the Wound (sheet 15)
    floatIsle1: 0.42,
    floatIsle2: 0.42,
    floatIsle3: 0.42,
    floatIsle4: 0.42,
    floatHouse1: 0.48,
    floatHouse2: 0.48,
    floatHouse3: 0.48,
    floatStairway: 0.45,
    crystalFire: 0.34,
    crystalWater: 0.34,
    crystalIce: 0.34,
    crystalLightning: 0.34,
    crystalEarth: 0.34,
    crystalAir: 0.34,
    crystalArcane: 0.34,
    crystalDark: 0.34,
    // the Necropolis (16)
    cemeteryGate: 0.4,
    cemeteryFence: 0.4,
    cemeteryWicket: 0.4,
    tomb: 0.46,
    tombGrand: 0.5,
    grave1: 0.4,
    grave2: 0.4,
    grave3: 0.4,
    graveCross: 0.4,
    graveAngel: 0.55,
    graveObelisk: 0.4,
    graveCross2: 0.4,
    graveArch: 0.4,
    brazier: 0.42,
    gloomLamp1: 0.46,
    gloomLamp2: 0.46,
    gloomLamp3: 0.46,
    gloomTree1: 0.5,
    gloomTree2: 0.5,
    gloomStump: 0.42,
    crowPost: 0.4,
    crowArch: 0.4,
    crowRubble: 0.4,
    cryptGate: 0.4,
    shadowPool1: 0.45,
    shadowPool2: 0.45,
    shadowPool3: 0.45,
    shadowPool4: 0.45,
    // the Winter Fair (17)
    stallStripe: 0.46,
    stallFish: 0.46,
    stallMeat: 0.46,
    frostLamp1: 0.38,
    frostLamp2: 0.38,
    frostLamp3: 0.38,
    iceFountain: 0.44,
    iceCrystal1: 0.4,
    iceCrystal2: 0.4,
    iceCrystal3: 0.4,
    iceCrystal4: 0.4,
    sledFurs: 0.38,
    sled: 0.38,
    iceBarrel1: 0.28,
    iceBarrel2: 0.3,
    iceBarrel3: 0.3,
    furTent: 0.36,
    // the Deep Cut (18)
    boulder1: 0.44,
    boulder2: 0.44,
    boulder3: 0.44,
    boulder4: 0.44,
    boulder5: 0.44,
    mineHead: 0.42,
    masonBench: 0.38,
    grindstone: 0.38,
    stonePallet: 0.38,
    crackSmall: 0.5,
    crackWide: 0.5,
    rift: 0.5,
    scaffold1: 0.42,
    scaffold2: 0.42,
    giantHead: 0.42,
    // the Sunken Harbour (19)
    rowboat: 0.42,
    rowboatSunk: 0.42,
    rowboatWreck: 0.42,
    pile1: 0.36,
    pilesRope: 0.36,
    pile2: 0.36,
    netFrame1: 0.4,
    netFrame2: 0.4,
    seaGod: 0.5,
    seaMaiden: 0.46,
    lobsterPots1: 0.34,
    lobsterPots2: 0.34,
    lobsterPot: 0.34,
    drownedShrine: 0.4,
    wreckMarket: 0.38,
    // the Old Schools (20)
    flyingBooks: 0.38,
    armillary: 0.38,
    runeCircleL: 0.45,
    runeCircleM: 0.45,
    runeCircleS: 0.45,
    lectureBenches: 0.4,
    portalRuin: 0.38,
    scholarHeadless: 0.42,
    scrollRack: 0.38,
    scrollBin: 0.38,
    arcCrystal1: 0.36,
    arcCrystal2: 0.36,
    arcCrystal3: 0.36,
    // the Drift (21)
    windmillSails: 0.44,
    sail1: 0.44,
    sail2: 0.44,
    ropeBridgeBroken: 0.45,
    kite1: 0.42,
    kite2: 0.42,
    kite3: 0.55,
    vaneGriffin: 0.4,
    vaneBird: 0.4,
    vaneSmall: 0.4,
    skyRock1: 0.48,
    skyRock2: 0.48,
    skyRock3: 0.48,
    skyRock4: 0.48,
    fallenDome: 0.4,
    awningPurple: 0.42,
    awningCream: 0.42,
    awningRed: 0.42,
    bannerFrame: 0.42,
    // the Conductory (22)
    rodTall: 0.45,
    rodSpire: 0.45,
    rodFork: 0.45,
    glaze1: 0.5,
    glaze2: 0.5,
    glaze3: 0.5,
    glaze4: 0.5,
    spireTower: 0.55,
    fallenSpire: 0.42,
    coil1: 0.45,
    coilBig: 0.5,
    coil2: 0.45,
    stormLamp1: 0.36,
    stormLamp2: 0.36,
    stormLamp3: 0.36,
    rainBarrel: 0.36,
    barrelPlain: 0.32,
    cartWrecked: 0.4,
    // the Crucible (23)
    slagHeap1: 0.4,
    slagHeap2: 0.4,
    slagHeap3: 0.4,
    lavaRun: 0.45,
    lavaBend: 0.45,
    lavaEnd: 0.45,
    foundry: 0.4,
    anvilBlock: 0.38,
    bellowsGreat: 0.42,
    chainHoist: 0.42,
    oreCart: 0.36,
    oreCartHot: 0.36,
    crucibleHoist: 0.44,
    stallBurnt: 0.44,
    lavaWell: 0.44,
    lavaSpring: 0.45,
    bannerAnvil: 0.38,
    bannerHammers: 0.38,
    bannerFlame: 0.38,
    bannerAshen: 0.38,
    // Gilden's great buildings (sheet 29) and the market stalls (30), from the user
    palace: 0.66,
    airship: 0.62,
    warehouse: 0.46,
    galleon: 0.72,
    stallCloth: 0.34,
    stallLamps: 0.34,
    stallBakery: 0.34,
    stallTools: 0.34,
    stallCharms: 0.34,
    // one ship at rest from five sides (sheet 31), hulls cut at the waterline
    shipBow: 0.8,
    shipFront: 0.8,
    shipBack: 0.8,
    shipStern: 0.8,
    shipSide: 0.8
  };
  function scaleOf(kind, sc) {
    return sc || KIND_SCALE[kind] || KIND_SCALE[kind.split('_')[0]] || PS;
  }

  // ── footprints: the part of each piece you can't walk through ──
  // ox = centre across the width (0–1), w = width fraction, h = depth in world px
  // (h < 1 is a fraction of the drawn height). Looked up by exact name, else the
  // longest matching prefix (footOf).
  const FOOT = {
    // Gilden (sheet 29) and the market stalls (30)
    palace: [{ w: 0.9, h: 0.36 }],
    warehouse: [{ ox: 0.47, w: 0.86, h: 0.36 }],
    airship: [{ ox: 0.79, w: 0.2, h: 0.2 }],
    galleon: [{ w: 1, h: 0.14 }],
    stall: [{ w: 0.86, h: 0.3 }],
    ship: [{ w: 0.8, h: 0.12 }], // afloat: the water round it blocks you anyway
    // Elfhome (sheets 27 and 28, tools/mapgen/elfhome.js)
    efHeartTree: [{ w: 0.42, h: 40 }],
    efTalan: [{ w: 0.28, h: 16 }],
    efHealing: [{ w: 0.8, h: 0.3 }],
    efWorkshop: [{ w: 0.9, h: 0.22 }],
    efLodge: [{ w: 0.92, h: 0.3 }],
    efBeastLodge: [{ w: 0.8, h: 0.3 }],
    efElders: [{ w: 0.85, h: 0.28 }],
    efCottage: [{ w: 0.85, h: 0.4 }],
    efWatchTable: [{ w: 0.85, h: 30 }],
    efLantern: [{ ox: 0.3, w: 0.22, h: 10 }],
    efTarget: [{ w: 0.6, h: 12 }],
    efBowRack: [{ w: 0.9, h: 14 }],
    efHerbRack: [{ w: 0.9, h: 14 }],
    efBeehive: [{ w: 0.7, h: 14 }],
    efRope: [{ w: 0.8, h: 14 }],
    efLadders: [{ w: 0.9, h: 16 }],
    efSpring: [{ w: 0.85, h: 0.5 }],
    efLog: [{ w: 0.9, h: 18 }],
    efFern: [{ w: 0.5, h: 10 }],
    efToadstools: [{ w: 0.4, h: 6 }],
    efBlossom: [{ w: 0.6, h: 12 }],
    efFoxgloves: [{ w: 0.5, h: 12 }],
    efStump: [{ w: 0.6, h: 14 }],
    efStone: [{ w: 0.6, h: 14 }],
    house: [{ w: 0.9, h: 0.5 }],
    tree: [{ w: 0.22, h: 16 }],
    deadtree: [{ w: 0.2, h: 16 }],
    bush: [{ w: 0.7, h: 20 }],
    flowerbush: [{ w: 0.7, h: 20 }],
    crate1: [{ w: 0.85, h: 24 }],
    crate2: [{ w: 0.85, h: 22 }],
    barrel: [{ w: 0.8, h: 20 }],
    rubble: [{ w: 0.88, h: 26 }],
    ruinWall: [{ w: 0.9, h: 30 }],
    wallLow: [{ w: 0.95, h: 22 }],
    lowwall: [{ w: 0.95, h: 22 }],
    rocks: [{ w: 0.85, h: 18 }],
    stone: [{ w: 0.7, h: 12 }],
    stump: [{ w: 0.6, h: 14 }],
    lamppost: [{ ox: 0.2, w: 0.18, h: 10 }],
    post: [{ ox: 0.22, w: 0.2, h: 10 }],
    banner: [{ ox: 0.19, w: 0.18, h: 10 }],
    statue: [{ w: 0.85, h: 28 }],
    shrine: [{ w: 0.85, h: 26 }],
    brokenStatue: [{ w: 0.85, h: 26 }],
    pillar: [{ w: 0.85, h: 18 }],
    arch: [
      { ox: 0.11, w: 0.22, h: 22 },
      { ox: 0.89, w: 0.22, h: 22 }
    ],
    fence: [{ w: 0.95, h: 14 }],
    brokenFence: [{ w: 0.9, h: 14 }],
    logs: [{ w: 0.8, h: 16 }],
    wheel: [{ w: 0.7, h: 12 }],
    // river & docks sheet
    crate: [{ w: 0.85, h: 22 }],
    crateStand: [{ w: 0.85, h: 20 }],
    sacks: [{ w: 0.85, h: 18 }],
    planks: [{ w: 0.8, h: 14 }],
    wagon: [{ w: 0.85, h: 26 }],
    cart: [{ w: 0.8, h: 22 }],
    brokenCart: [{ w: 0.8, h: 22 }],
    gravel: [{ w: 0.7, h: 10 }],
    chainFence: [{ w: 0.95, h: 12 }],
    postTall: [{ w: 0.8, h: 14 }],
    post2: [{ w: 0.8, h: 12 }],
    postRing: [{ w: 0.8, h: 12 }],
    bannerP: [{ ox: 0.5, w: 0.2, h: 10 }],
    bannerTorn: [{ ox: 0.5, w: 0.2, h: 10 }],
    lamp2: [{ ox: 0.72, w: 0.2, h: 10 }],
    lamp3: [{ ox: 0.5, w: 0.3, h: 10 }],
    lamp4: [{ ox: 0.72, w: 0.2, h: 10 }],
    blocks: [{ w: 0.85, h: 20 }],
    stoneArch: [
      { ox: 0.12, w: 0.24, h: 22 },
      { ox: 0.88, w: 0.24, h: 22 }
    ],
    woodArch: [
      { ox: 0.15, w: 0.2, h: 12 },
      { ox: 0.85, w: 0.2, h: 12 }
    ],
    brokenArch: [
      { ox: 0.2, w: 0.34, h: 20 },
      { ox: 0.82, w: 0.34, h: 20 }
    ],
    crane: [
      { ox: 0.07, w: 0.12, h: 14 },
      { ox: 0.93, w: 0.12, h: 14 },
      { ox: 0.5, w: 0.34, h: 14 }
    ],
    craneBroken: [
      { ox: 0.3, w: 0.2, h: 14 },
      { ox: 0.75, w: 0.15, h: 14 }
    ],
    gallowsHook: [
      { ox: 0.2, w: 0.15, h: 14 },
      { ox: 0.7, w: 0.15, h: 14 }
    ],
    gallows: [{ ox: 0.85, w: 0.18, h: 14 }],
    // buildings sheet: backs, sides, the big three
    back: [{ w: 0.9, h: 0.45 }],
    side: [{ w: 0.88, h: 0.45 }],
    tavern: [{ w: 0.86, h: 0.4 }],
    chapel: [{ w: 0.82, h: 0.4 }],
    tower: [
      { ox: 0.4, w: 0.62, h: 0.32 },
      { ox: 0.82, w: 0.34, h: 0.22 }
    ],
    // each sector's own pieces (sheets 6–9)
    iceSpire: [{ w: 0.6, h: 18 }],
    frostStall: [{ w: 0.9, h: 24 }],
    frozenFountain: [{ w: 0.8, h: 0.3 }],
    iceCart: [{ w: 0.85, h: 26 }],
    iceWall: [{ w: 0.95, h: 20 }],
    snowdrift: [{ w: 0.85, h: 24 }],
    sunkHouse: [{ w: 0.9, h: 0.45 }],
    boat: [{ w: 0.8, h: 22 }],
    nets: [{ w: 0.85, h: 22 }],
    figurehead: [{ w: 0.6, h: 18 }],
    moorings: [
      { ox: 0.12, w: 0.12, h: 10 },
      { ox: 0.5, w: 0.12, h: 10 },
      { ox: 0.88, w: 0.12, h: 10 }
    ],
    floatRoom: [{ w: 0.4, h: 10 }],
    floatStairs: [{ w: 0.4, h: 8 }],
    floatRoof: [{ w: 0.4, h: 8 }], // only their shadows touch the ground
    townhouse: [{ w: 0.9, h: 0.4 }],
    gazebo: [{ w: 0.85, h: 0.25 }],
    weathervane: [{ w: 0.3, h: 10 }],
    urn: [{ w: 0.6, h: 14 }],
    bench: [{ w: 0.9, h: 14 }],
    rockSpire: [{ w: 0.7, h: 0.25 }],
    quarryCrane: [
      { ox: 0.2, w: 0.3, h: 16 },
      { ox: 0.75, w: 0.25, h: 14 }
    ],
    stoneYard: [{ w: 0.9, h: 26 }],
    tiltedHouse: [{ w: 0.85, h: 0.4 }],
    mineCart: [{ w: 0.9, h: 18 }],
    bellTower: [{ w: 0.8, h: 0.12 }],
    fallenBell: [{ w: 0.85, h: 26 }],
    lightningRod: [{ w: 0.3, h: 14 }],
    watchTower: [{ w: 0.8, h: 0.12 }],
    bellFrames: [{ w: 0.85, h: 22 }],
    hall: [{ w: 0.9, h: 0.35 }],
    orrery: [{ w: 0.6, h: 20 }],
    bookshelves: [{ w: 0.85, h: 22 }],
    runeCircle: [{ w: 0.7, h: 20 }],
    scholarStatue: [{ w: 0.7, h: 20 }],
    portal: [
      { ox: 0.15, w: 0.25, h: 20 },
      { ox: 0.85, w: 0.25, h: 20 }
    ],
    temple: [{ w: 0.9, h: 0.3 }],
    catacomb: [
      { ox: 0.15, w: 0.25, h: 22 },
      { ox: 0.85, w: 0.25, h: 22 }
    ],
    graves: [{ w: 0.85, h: 24 }],
    mausoleum: [{ w: 0.85, h: 0.3 }],
    candles: [{ w: 0.85, h: 20 }],
    hoodedShrine: [{ w: 0.85, h: 22 }],
    forge: [{ w: 0.9, h: 0.35 }],
    anvil: [{ w: 0.8, h: 20 }],
    slag: [{ w: 0.8, h: 20 }],
    bellows: [{ w: 0.85, h: 22 }],
    swordRack: [{ w: 0.9, h: 18 }],
    // inner districts (sheets 14–23): town props for all of them, then one sheet a district
    sign: [{ ox: 0.12, w: 0.14, h: 10 }],
    cratesProduce: [{ w: 0.9, h: 24 }],
    washLine: [
      { ox: 0.05, w: 0.07, h: 10 },
      { ox: 0.95, w: 0.07, h: 10 }
    ],
    well: [{ w: 0.75, h: 0.3 }],
    noticeBoard: [{ w: 0.85, h: 14 }],
    lanternPost: [{ ox: 0.16, w: 0.2, h: 10 }],
    lanternSmashed: [{ w: 0.5, h: 6 }],
    cat: [{ w: 0.5, h: 6 }],
    crow: [{ w: 0.4, h: 6 }],
    crowFlying: [{ w: 0.1, h: 2 }],
    handcart: [{ w: 0.85, h: 22 }],
    barrowStone: [{ w: 0.85, h: 20 }],
    tableBooks: [{ w: 0.85, h: 18 }],
    basketApples: [{ w: 0.7, h: 14 }],
    crystal: [{ w: 0.6, h: 16 }],
    crystalDisplay: [{ w: 0.8, h: 16 }],
    floatIsle: [{ w: 0.3, h: 6 }],
    floatHouse: [{ w: 0.3, h: 6 }],
    floatStairway: [{ w: 0.2, h: 6 }],
    cemeteryGate: [{ w: 0.95, h: 20 }],
    cemeteryFence: [{ w: 0.95, h: 14 }],
    cemeteryWicket: [{ w: 0.9, h: 14 }],
    tomb: [{ w: 0.85, h: 0.3 }],
    grave: [{ w: 0.75, h: 14 }],
    brazier: [{ w: 0.5, h: 12 }],
    gloomLamp: [{ w: 0.35, h: 10 }],
    gloomTree: [{ w: 0.25, h: 16 }],
    gloomStump: [{ w: 0.5, h: 16 }],
    crowPost: [{ w: 0.5, h: 16 }],
    crowArch: [
      { ox: 0.2, w: 0.3, h: 16 },
      { ox: 0.85, w: 0.25, h: 16 }
    ],
    crowRubble: [{ w: 0.85, h: 18 }],
    cryptGate: [{ w: 0.9, h: 0.3 }],
    stall: [{ w: 0.9, h: 24 }],
    frostLamp: [{ w: 0.3, h: 10 }],
    frostLamp3: [{ ox: 0.3, w: 0.3, h: 10 }],
    iceFountain: [{ w: 0.85, h: 0.3 }],
    iceCrystal: [{ w: 0.7, h: 16 }],
    sled: [{ w: 0.85, h: 14 }],
    iceBarrel: [{ w: 0.8, h: 18 }],
    furTent: [{ w: 0.9, h: 0.3 }],
    boulder: [{ w: 0.85, h: 0.3 }],
    mineHead: [{ w: 0.9, h: 0.3 }],
    masonBench: [{ w: 0.9, h: 20 }],
    grindstone: [{ w: 0.9, h: 20 }],
    stonePallet: [{ w: 0.9, h: 20 }],
    scaffold: [{ w: 0.9, h: 0.25 }],
    giantHead: [{ w: 0.85, h: 0.35 }],
    rowboat: [{ w: 0.85, h: 22 }],
    pile: [{ w: 0.5, h: 10 }],
    pilesRope: [
      { ox: 0.15, w: 0.25, h: 10 },
      { ox: 0.85, w: 0.25, h: 10 }
    ],
    netFrame: [
      { ox: 0.1, w: 0.12, h: 12 },
      { ox: 0.9, w: 0.12, h: 12 }
    ],
    seaGod: [{ w: 0.7, h: 24 }],
    seaMaiden: [{ w: 0.7, h: 24 }],
    lobsterPot: [{ w: 0.85, h: 16 }],
    drownedShrine: [{ w: 0.8, h: 0.35 }],
    wreckMarket: [{ w: 0.9, h: 0.35 }],
    flyingBooks: [{ w: 0.3, h: 6 }],
    armillary: [{ w: 0.7, h: 0.25 }],
    lectureBenches: [{ w: 0.9, h: 0.4 }],
    portalRuin: [
      { ox: 0.2, w: 0.25, h: 22 },
      { ox: 0.82, w: 0.25, h: 22 }
    ],
    scholarHeadless: [{ w: 0.6, h: 22 }],
    scrollRack: [{ w: 0.9, h: 20 }],
    scrollBin: [{ w: 0.9, h: 18 }],
    arcCrystal: [{ w: 0.7, h: 16 }],
    windmillSails: [{ w: 0.4, h: 14 }],
    sail: [{ w: 0.6, h: 10 }],
    ropeBridge: [
      { ox: 0.08, w: 0.14, h: 18 },
      { ox: 0.92, w: 0.14, h: 18 }
    ],
    kite: [{ w: 0.3, h: 12 }],
    vane: [{ w: 0.4, h: 12 }],
    skyRock: [{ w: 0.4, h: 8 }],
    fallenDome: [{ w: 0.85, h: 0.3 }],
    awning: [
      { ox: 0.08, w: 0.08, h: 10 },
      { ox: 0.92, w: 0.08, h: 10 }
    ],
    bannerFrame: [
      { ox: 0.1, w: 0.12, h: 10 },
      { ox: 0.9, w: 0.12, h: 10 }
    ],
    rod: [{ w: 0.4, h: 12 }],
    spireTower: [{ w: 0.8, h: 0.15 }],
    fallenSpire: [{ w: 0.85, h: 0.3 }],
    coil: [{ w: 0.6, h: 16 }],
    stormLamp: [{ w: 0.3, h: 10 }],
    stormLamp3: [{ ox: 0.35, w: 0.3, h: 10 }],
    rainBarrel: [{ w: 0.8, h: 20 }],
    cartWrecked: [{ w: 0.85, h: 24 }],
    slagHeap: [{ w: 0.85, h: 0.3 }],
    foundry: [{ w: 0.9, h: 0.35 }],
    chainHoist: [
      { ox: 0.08, w: 0.12, h: 12 },
      { ox: 0.92, w: 0.12, h: 12 }
    ],
    oreCart: [{ w: 0.85, h: 20 }],
    crucibleHoist: [
      { ox: 0.1, w: 0.12, h: 12 },
      { ox: 0.9, w: 0.12, h: 12 }
    ],
    lavaWell: [{ w: 0.75, h: 0.3 }],
    lavaSpring: [{ w: 0.85, h: 0.3 }],
    bannerHung: [{ w: 0.2, h: 4 }],
    // interiors (sheets 10–13; furniture drawn at ExploreRooms.FS, walls at RS)
    bed: [{ w: 0.85, h: 0.4 }],
    diningTable: [{ w: 0.9, h: 0.3 }],
    roundTable: [{ w: 0.8, h: 0.3 }],
    counter: [{ w: 0.95, h: 0.35 }],
    safeTable: [{ w: 0.9, h: 0.3 }],
    hearthPot: [{ w: 0.9, h: 0.25 }],
    workbench: [{ w: 0.9, h: 0.25 }],
    pantry: [{ w: 0.9, h: 0.3 }],
    bookcase: [{ w: 0.9, h: 0.15 }],
    wardrobe: [{ w: 0.9, h: 0.15 }],
    cupboard: [{ w: 0.9, h: 0.15 }],
    altar: [{ w: 0.9, h: 0.2 }],
    pew: [{ w: 0.9, h: 0.35 }],
    brokenBed: [{ w: 0.85, h: 0.3 }],
    brokenTable: [{ w: 0.8, h: 0.3 }],
    wallRubble: [{ w: 0.5, h: 0.2 }],
    chest: [{ w: 0.85, h: 0.4 }],
    q_: [{ w: 0.6, h: 0.3 }],
    sewerCrates: [{ w: 0.9, h: 0.35 }],
    crystalChest: [{ w: 0.85, h: 0.4 }],
    sewerCandles: [{ w: 0.8, h: 10 }],
    drainGrate: [{ w: 0.1, h: 2 }],
    // the lecture theatre (sheet 25): desks keep their front, the demonstration bench and lectern their foot
    lt_bench: [{ w: 0.98, h: 0.45 }],
    lt_benchEnd: [{ w: 0.9, h: 0.3 }],
    lt_demo: [{ w: 0.95, h: 0.35 }],
    lt_lectern: [{ w: 0.8, h: 0.2 }],
    lt_wall: [{ w: 1, h: 0.2 }],
    // small things on the floor (ExploreRooms.ITEM_SCALE): a sliver to stand by, barely in the way
    letter: [{ w: 0.6, h: 6 }],
    scroll: [{ w: 0.6, h: 6 }],
    journal: [{ w: 0.6, h: 6 }],
    bookOpen: [{ w: 0.6, h: 6 }],
    bookClosed: [{ w: 0.6, h: 6 }],
    key: [{ w: 0.6, h: 6 }],
    coins: [{ w: 0.6, h: 6 }],
    pouch: [{ w: 0.6, h: 6 }],
    potion: [{ w: 0.6, h: 6 }],
    crockery: [{ w: 0.7, h: 6 }]
  };
  function footOf(kind) {
    if (FOOT[kind]) return FOOT[kind];
    let best = null;
    for (const k in FOOT) if (kind.startsWith(k) && (!best || k.length > best.length)) best = k;
    return best ? FOOT[best] : [{ w: 0.8, h: 16 }];
  }

  // light sources inside a piece, in atlas px of its trimmed crop ('lamp' = a lantern, bigger)
  const LIGHTS = {
    // Elfhome (fractions of the piece's size): windows, and the lanterns hung about the Heart Tree and posts
    efHeartTree: [
      [0.11, 0.62, 'lamp'],
      [0.22, 0.73, 'lamp'],
      [0.18, 0.44, 'lamp'],
      [0.34, 0.39, 'lamp'],
      [0.59, 0.26, 'lamp'],
      [0.69, 0.51, 'lamp'],
      [0.87, 0.6, 'lamp'],
      [0.5, 0.48],
      [0.49, 0.63]
    ],
    efTalan: [
      [0.18, 0.31, 'lamp'],
      [0.8, 0.46, 'lamp'],
      [0.54, 0.2]
    ],
    efHealing: [
      [0.15, 0.75],
      [0.31, 0.75],
      [0.83, 0.74]
    ],
    efLodge: [
      [0.14, 0.45],
      [0.5, 0.27],
      [0.86, 0.45]
    ],
    efCottage1: [
      [0.6, 0.22],
      [0.4, 0.47],
      [0.8, 0.47]
    ],
    efCottage2: [
      [0.47, 0.26],
      [0.22, 0.69],
      [0.4, 0.69]
    ],
    efLantern: [[0.74, 0.47, 'lamp']],
    // Gilden (fractions of the piece's size)
    palace: [
      [0.5, 0.54],
      [0.36, 0.42],
      [0.64, 0.42],
      [0.08, 0.56],
      [0.92, 0.56],
      [0.2, 0.56],
      [0.8, 0.56],
      [0.5, 0.2]
    ],
    warehouse: [
      [0.14, 0.27],
      [0.39, 0.27],
      [0.37, 0.6],
      [0.08, 0.86],
      [0.8, 0.32, 'lamp']
    ],
    airship: [
      [0.5, 0.65],
      [0.9, 0.3, 'lamp']
    ],
    galleon: [
      [0.26, 0.47],
      [0.37, 0.47],
      [0.33, 0.14, 'lamp'],
      [0.53, 0.18, 'lamp']
    ],
    shipSide: [
      [0.05, 0.25, 'lamp'],
      [0.1, 0.2, 'lamp'],
      [0.22, 0.24, 'lamp'],
      [0.12, 0.6],
      [0.3, 0.6]
    ],
    shipBow: [
      [0.81, 0.4, 'lamp'],
      [0.95, 0.43, 'lamp'],
      [0.4, 0.6, 'lamp'],
      [0.88, 0.66],
      [0.78, 0.68]
    ],
    shipFront: [
      [0.17, 0.56, 'lamp'],
      [0.83, 0.56, 'lamp']
    ],
    shipBack: [
      [0.22, 0.42, 'lamp'],
      [0.78, 0.42, 'lamp'],
      [0.5, 0.65],
      [0.3, 0.65],
      [0.7, 0.65]
    ],
    shipStern: [
      [0.15, 0.38, 'lamp'],
      [0.4, 0.37, 'lamp'],
      [0.2, 0.6],
      [0.48, 0.6]
    ],
    stallLamps: [
      [0.24, 0.42, 'lamp'],
      [0.4, 0.42],
      [0.55, 0.4],
      [0.19, 0.62]
    ],
    efLanternCrook: [[0.76, 0.42, 'lamp']],
    efLanternBlue: [[0.5, 0.26, 'lamp']],
    house1: [[165, 208]],
    house2: [
      [70, 205],
      [158, 205]
    ],
    house3: [[170, 205]],
    house4: [[170, 208]],
    house5: [[180, 190]],
    house6: [[77, 185]],
    tavern: [
      [114, 218],
      [288, 218],
      [92, 332],
      [153, 332],
      [280, 332],
      [337, 330, 'lamp']
    ],
    chapel: [
      [196, 175],
      [128, 258],
      [273, 258],
      [124, 364],
      [274, 362]
    ],
    tower: [
      [106, 234],
      [198, 330],
      [232, 326],
      [106, 406]
    ],
    backTerra1: [[142, 176]],
    backSlate: [[116, 173]],
    backPurple: [
      [76, 178],
      [155, 178]
    ],
    sideSlate: [[92, 138]],
    // sheets 6–9: values of 1 or less are fractions of the piece's width / height
    sunkHouse: [
      [0.3, 0.82],
      [0.62, 0.82]
    ],
    townhouse: [
      [0.36, 0.4],
      [0.62, 0.4],
      [0.25, 0.75],
      [0.78, 0.75]
    ],
    floatRoom: [[0.4, 0.4, 'lamp']],
    forge: [[0.5, 0.75, 'lamp']],
    candles: [[0.5, 0.3, 'lamp']],
    portal: [[0.5, 0.6, 'lamp']],
    runeCircle: [[0.5, 0.6, 'lamp']],
    lavaCrack: [[0.5, 0.5, 'lamp']],
    slag: [[0.5, 0.5]],
    swordRack: [[0.5, 0.6]],
    hall: [
      [0.5, 0.55],
      [0.3, 0.55],
      [0.7, 0.55]
    ],
    temple: [[0.5, 0.35]],
    hoodedShrine: [[0.5, 0.75]],
    bellTower: [
      [0.5, 0.2],
      [0.5, 0.85]
    ],
    watchTower: [[0.5, 0.9]],
    tiltedHouse: [
      [0.45, 0.55],
      [0.7, 0.5]
    ],
    catacomb: [[0.5, 0.6]],
    lightningRod: [[0.5, 0.08, 'lamp']],
    glassPatch: [[0.5, 0.5]],
    frozenFountain: [[0.5, 0.4]],
    wallPlasterWin: [[0.5, 0.4]],
    wallStoneWin: [[0.5, 0.4]],
    wallHearth: [[0.5, 0.75, 'lamp']],
    hearthPot: [[0.5, 0.6, 'lamp']],
    safeHearth: [[0.5, 0.65, 'lamp']],
    lt_wallWindow: [[0.5, 0.35]],
    lt_demo: [[0.2, 0.12, 'lamp']],
    lt_lectern: [[0.5, 0.15]],
    readingDesk: [[0.8, 0.12]],
    diningTable: [[0.45, 0.08]],
    roundTable: [[0.5, 0.12]],
    altar: [[0.5, 0.4, 'lamp']],
    cauldron: [[0.5, 0.7]],
    crystalDisplay: [[0.5, 0.35]],
    sewerCandles: [[0.5, 0.3, 'lamp']],
    crystalChest: [[0.5, 0.35]],
    safeTable: [[0.45, 0.25]],
    q_fire: [[0.5, 0.5]],
    q_water: [[0.5, 0.5]],
    q_ice: [[0.5, 0.5]],
    q_lightning: [[0.5, 0.5]],
    q_earth: [[0.5, 0.5]],
    q_air: [[0.5, 0.5]],
    q_arcane: [[0.5, 0.5]],
    q_dark: [[0.5, 0.5]],
    // inner districts
    lanternPost: [[0.72, 0.55, 'lamp']],
    cartPotions: [[0.5, 0.35]],
    crystalFire: [[0.5, 0.45]],
    crystalWater: [[0.5, 0.45]],
    crystalIce: [[0.5, 0.45]],
    crystalLightning: [[0.5, 0.45]],
    crystalEarth: [[0.5, 0.45]],
    crystalAir: [[0.5, 0.45]],
    crystalArcane: [[0.5, 0.45]],
    crystalDark: [[0.5, 0.45]],
    floatHouse1: [
      [0.45, 0.35],
      [0.25, 0.6]
    ],
    floatHouse2: [[0.5, 0.4]],
    floatHouse3: [[0.55, 0.4]],
    cemeteryGate: [
      [0.12, 0.55],
      [0.88, 0.55]
    ],
    brazier: [[0.5, 0.12, 'lamp']],
    gloomLamp1: [[0.75, 0.45, 'lamp']],
    gloomLamp2: [[0.22, 0.45, 'lamp']],
    gloomLamp3: [
      [0.12, 0.4],
      [0.88, 0.4]
    ],
    cryptGate: [[0.5, 0.6]],
    tombGrand: [[0.5, 0.65]],
    frostLamp1: [[0.5, 0.2, 'lamp']],
    frostLamp2: [
      [0.15, 0.35],
      [0.85, 0.35]
    ],
    frostLamp3: [[0.8, 0.45, 'lamp']],
    stallStripe: [[0.12, 0.5]],
    furTent: [[0.5, 0.65]],
    iceCrystal1: [[0.5, 0.5]],
    iceCrystal2: [[0.5, 0.5]],
    iceFountain: [[0.5, 0.6]],
    mineHead: [[0.4, 0.62]],
    drownedShrine: [[0.48, 0.78, 'lamp']],
    runeCircleL: [[0.5, 0.5, 'lamp']],
    runeCircleM: [[0.5, 0.5, 'lamp']],
    runeCircleS: [[0.5, 0.5]],
    portalRuin: [[0.5, 0.6, 'lamp']],
    arcCrystal1: [[0.5, 0.5]],
    arcCrystal2: [[0.5, 0.5]],
    arcCrystal3: [[0.5, 0.5]],
    flyingBooks: [[0.5, 0.5]],
    coil1: [[0.5, 0.15, 'lamp']],
    coil2: [[0.5, 0.15, 'lamp']],
    coilBig: [[0.5, 0.1, 'lamp']],
    stormLamp1: [[0.5, 0.15, 'lamp']],
    glaze3: [[0.5, 0.5]],
    glaze4: [[0.5, 0.5]],
    spireTower: [[0.5, 0.55]],
    kite3: [[0.5, 0.2]],
    slagHeap1: [[0.5, 0.5]],
    slagHeap2: [[0.5, 0.5]],
    slagHeap3: [[0.5, 0.5]],
    lavaRun: [[0.5, 0.5, 'lamp']],
    lavaBend: [[0.5, 0.5, 'lamp']],
    lavaEnd: [[0.5, 0.5, 'lamp']],
    foundry: [[0.48, 0.75, 'lamp']],
    oreCartHot: [[0.5, 0.3]],
    crucibleHoist: [[0.5, 0.78]],
    stallBurnt: [[0.5, 0.6]],
    lavaWell: [[0.5, 0.62, 'lamp']],
    lavaSpring: [[0.6, 0.72, 'lamp']],
    lamppost: [[79, 65, 'lamp']],
    lamp2: [[23, 45, 'lamp']],
    lamp3: [[20, 41, 'lamp']],
    lamp4: [[21, 41, 'lamp']]
  };
  // recoloured pieces ('house1_slate') share their base piece's lights and footprint
  const baseKind = k => k.split('_')[0];
  function lightsOf(kind) {
    return LIGHTS[kind] || LIGHTS[baseKind(kind)] || null;
  }

  // ── bridges, drawn from above and laid across water as walkable decals ──
  // walk = spans you can stand on, as fractions of the width (a broken one has a gap);
  // band = the deck between the parapets, as fractions of the height from the top.
  const BRIDGE = {
    bridgeTopStone: { walk: [[0, 1]], band: [0.3, 0.8] },
    bridgeTopWood: { walk: [[0, 1]], band: [0.22, 0.78] },
    bridgeTopStoneBroken: {
      walk: [
        [0, 0.4],
        [0.62, 1]
      ],
      band: [0.3, 0.8]
    },
    bridgeTopWoodBroken: {
      walk: [
        [0, 0.37],
        [0.63, 1]
      ],
      band: [0.22, 0.78]
    }
  };

  function sizeOf(rects, kind, sc) {
    const q = rects[kind];
    sc = scaleOf(kind, sc);
    return { w: q[2] * sc, h: q[3] * sc };
  }
  // a piece's blocking boxes in world px; o = {kind, x (centre), y (base)}
  function footBoxes(rects, o) {
    const s = sizeOf(rects, o.kind, o.scale),
      out = []; // o.scale: interiors draw smaller
    for (const f of footOf(o.kind)) {
      const fw = f.w * s.w,
        fh = f.h < 1 ? f.h * s.h : f.h,
        cx = o.x - s.w / 2 + (f.ox ?? 0.5) * s.w;
      out.push({ x: cx - fw / 2, y: o.y - fh, w: fw, h: fh });
    }
    return out;
  }
  // a bridge's walkable deck boxes; o = {kind, x, y, scale}
  function bridgeDeck(rects, o) {
    const s = sizeOf(rects, o.kind, o.scale),
      B = BRIDGE[o.kind],
      top = o.y - s.h;
    return B.walk.map(([a, b]) => ({
      x: o.x - s.w / 2 + a * s.w,
      y: top + s.h * B.band[0],
      w: (b - a) * s.w,
      h: s.h * (B.band[1] - B.band[0])
    }));
  }
  const overlap = (a, b, m = 0) =>
    a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

  // ── seeded random ──
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  return {
    T,
    PS,
    KIND_SCALE,
    scaleOf,
    FOOT,
    footOf,
    LIGHTS,
    lightsOf,
    baseKind,
    BRIDGE,
    sizeOf,
    footBoxes,
    bridgeDeck,
    overlap,
    rng,
    pick
  };
});
