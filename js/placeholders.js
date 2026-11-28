// ═══════════════════════════════════════════════════════════════════════
// PLACEHOLDERS: every piece of art the game is standing in for, in one list.
// Each entry names the file the real art goes to (`file`, and `face` for a dialog / HUD face). The game
// looks for that file (`probe`, a HEAD request) and uses it when it's there; until then it uses the stand-in
// the entry describes. So swapping in real art is: drop the file at its path, reload. Nothing else to edit.
//   node tools/placeholders.js          what's still a stand-in, and where each real file goes
//   ?placeholders on the URL (or localStorage wd-show-ph = 1) tags stand-ins on the map in pink
// kinds: 'person' (a map figure; also its battle sprite when it fights), 'arena' (a battle backdrop,
// backgrounds/<name>.jpg), 'piece' (a map piece from a tileset sheet: the generator checks for the piece
// name in the atlases, `piece`, at build time; re-run tools/build_maps.js after cutting the sheet).
// Prompts for each are in docs/art-prompts.md (the row names the placeholder's id).
// Loaded by index.html before the Explore scripts; also require()-able from Node.
// ═══════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const LIST = [
    // ── Gilden (docs/gilden-design.md) ──
    // people: real art is a full figure facing the viewer (or right), feet on the bottom edge, transparent
    // background, about 768 px tall, plus a 256×256 face crop
    ...[
      ['gd_charter', 'Ezra Pollock, Master of the Charterhouse'],
      ['gd_ashcombe', 'Dame Constance Ashcombe, head of House Ashcombe'],
      ['gd_varenne', 'Gaspard Varenne, head of House Varenne'],
      ['gd_quarrender', 'Perpetua Quarrender, head of House Quarrender'],
      ['gd_harbour', 'Captain Morwen Hask, Harbourmaster of Gilden'],
      ['gd_fishwife', 'Mag Thrush, a fishwife on the quay'],
      ['gd_sky', 'Tibbet Quillaby, the gnome at the Sky Office (drawn at scale 0.6 on the map)']
    ].map(([id, what]) => ({
      id,
      kind: 'person',
      what,
      file: 'sprites/gilden/' + id + '.png',
      face: 'portraits/small/' + id + '.jpg',
      standIn: 'painted from the hero figures (`look` in PEOPLE, js/explore_gilden.js)',
      usedBy: 'PEOPLE.' + id + ' in js/explore_gilden.js'
    })),
    {
      id: 'gd_guard1',
      kind: 'person',
      what: "Brask, Thessaly's Varg bodyguard",
      file: 'sprites/gilden/gd_guard1.png',
      face: 'portraits/small/gd_guard1.jpg',
      standIn: 'the halberdier (sprites/halberdier.png)',
      usedBy: 'PEOPLE.gd_guard1 in js/explore_gilden.js'
    },
    {
      id: 'gd_guard2',
      kind: 'person',
      what: "Oddny, Thessaly's bodyguard",
      file: 'sprites/gilden/gd_guard2.png',
      face: 'portraits/small/gd_guard2.jpg',
      standIn: 'the halberdier (sprites/halberdier.png)',
      usedBy: 'PEOPLE.gd_guard2 in js/explore_gilden.js'
    },
    // the house wizards (MAGI in js/explore_gilden.js): battle sprite (facing right) and a face
    ...[
      [
        'gd_magus_quarrender',
        'Nimble Cogglesworth, the Windwright: a gnome air mage, House Quarrender',
        'a dwarf hero figure painted teal, drawn small'
      ],
      [
        'gd_magus_varenne',
        'Vigdis Tidegrim, the Sea-Witch: a Varg pirate witch, House Varenne',
        "the forest's Varg (sprites/forest/varg.png)"
      ],
      [
        'gd_magus_ashcombe',
        'Grozdak Emberfist, the Forge-Mage: an orc warrior wizard, House Ashcombe',
        "the forest's big orc (sprites/forest/orc_bigun.png)"
      ]
    ].map(([id, what, standIn]) => ({
      id,
      kind: 'person',
      what,
      file: 'sprites/' + id + '.png',
      face: 'portraits/small/' + id + '.jpg',
      standIn,
      usedBy: 'MAGI / prep() in js/explore_gilden.js'
    })),
    // the houses' hired mages: battle sprites (facing right, feet on the bottom edge, like the roster's stills)
    ...['ashcombe', 'varenne', 'quarrender'].map(h => ({
      id: 'gd_hire_' + h,
      kind: 'person',
      what: 'the hired mage of House ' + h.charAt(0).toUpperCase() + h.slice(1) + ' (fights for it)',
      file: 'sprites/gilden/gd_hire_' + h + '.png',
      face: 'portraits/small/gd_hire_' + h + '.jpg',
      standIn: 'painted from the hero figures (`hire` in HOUSES, js/explore_gilden.js)',
      usedBy: 'prep() in js/explore_gilden.js'
    })),
    {
      id: 'arena_gilden',
      kind: 'arena',
      map: 'gilden',
      name: 'gilden',
      what: "Gilden's battle backdrop (1672×941 JPEG)",
      file: 'backgrounds/gilden.jpg',
      standIn: "Hollowmere's painting (ARENA_MAPS.gilden in js/explore.js)",
      usedBy: 'arenaHere() in js/explore.js'
    },
    {
      id: 'piece_airship',
      kind: 'piece',
      piece: 'airship',
      what: 'a gnome airship moored at the Skyport mast',
      file: 'sprites/ruins/tileset29_source.png (cut as piece `airship`)',
      standIn: 'nothing: the Mooring Mast stands empty',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_palace',
      kind: 'piece',
      piece: 'palace',
      what: "a merchant palace (the Hill's great houses)",
      file: 'sprites/ruins/tileset29_source.png (cut as piece `palace`)',
      standIn: 'the townhouse and the hall',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_warehouse',
      kind: 'piece',
      piece: 'warehouse',
      what: 'a dockside warehouse with a hoist beam',
      file: 'sprites/ruins/tileset29_source.png (cut as piece `warehouse`)',
      standIn: 'ordinary houses along the quay',
      usedBy: 'tools/mapgen/gilden.js'
    },
    // Gilden, second pass (docs/art-prompts.md, "Gilden, second pass")
    {
      id: 'piece_gd_lighterRed',
      kind: 'piece',
      piece: 'lighterRed',
      what: 'a lighter (rowing boat) in House Ashcombe red',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `lighterRed`)',
      standIn: 'the mossy Sunken Harbour rowboat',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_lighterBlue',
      kind: 'piece',
      piece: 'lighterBlue',
      what: 'a lighter in House Varenne blue',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `lighterBlue`)',
      standIn: 'the mossy Sunken Harbour rowboat',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_lighterViolet',
      kind: 'piece',
      piece: 'lighterViolet',
      what: 'a lighter in House Quarrender violet',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `lighterViolet`)',
      standIn: 'the mossy Sunken Harbour rowboat',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_pierPiles',
      kind: 'piece',
      piece: 'pierPiles',
      what: 'mooring piles at a pier end',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `pierPiles`)',
      standIn: 'pilesRope (drowned piles)',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_bollard',
      kind: 'piece',
      piece: 'bollard',
      what: 'an iron bollard',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `bollard`)',
      standIn: 'postRing',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_dockCrane',
      kind: 'piece',
      piece: 'dockCrane',
      what: 'a treadwheel dock crane',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `dockCrane`)',
      standIn: 'the small sheet-2 crane',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_fishStall',
      kind: 'piece',
      piece: 'gdFishStall',
      what: 'the Fish Market stall',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `gdFishStall`)',
      standIn: 'torn burnt awnings from Cindergate',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_netRack',
      kind: 'piece',
      piece: 'netRack',
      what: 'nets drying on a rack',
      file: 'sprites/ruins/tileset32_source.png (cut as piece `netRack`)',
      standIn: 'mossy nets from the Drowned Quarter',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_slipHull',
      kind: 'piece',
      piece: 'slipHull',
      what: "a hull on the slipway at Fettle's Yard",
      file: 'sprites/ruins/tileset32_source.png (cut as piece `slipHull`)',
      standIn: 'a boat and scaffolds',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_exchange',
      kind: 'piece',
      piece: 'exchange',
      what: 'the Gilded Exchange',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `exchange`)',
      standIn: 'the gothic temple',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_customsHouse',
      kind: 'piece',
      piece: 'customsHouse',
      what: 'the Customs House',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `customsHouse`)',
      standIn: 'the hall',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_guildhall',
      kind: 'piece',
      piece: 'guildhall',
      what: 'the Guildhall',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `guildhall`)',
      standIn: 'the hall',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_harbourLight',
      kind: 'piece',
      piece: 'harbourLight',
      what: 'the Harbour Light (lighthouse)',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `harbourLight`)',
      standIn: 'a ruined watchTower',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_skyOffice',
      kind: 'piece',
      piece: 'skyOffice',
      what: 'the Sky Office',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `skyOffice`)',
      standIn: 'a watchTower',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_oreGate',
      kind: 'piece',
      piece: 'oreGate',
      what: 'the Ore Gate',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `oreGate`)',
      standIn: 'a stone arch',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_seaGodStatue',
      kind: 'piece',
      piece: 'seaGodStatue',
      what: 'the Old Man of the Narrows',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `seaGodStatue`)',
      standIn: 'the mossy drowned seaGod',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_palaceShut',
      kind: 'piece',
      piece: 'palaceShut',
      what: 'Vellacourt House, shut up',
      file: 'sprites/ruins/tileset33_source.png (cut as piece `palaceShut`)',
      standIn: 'house3_dusk',
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_gdHouse1',
      kind: 'piece',
      piece: 'gdHouse1',
      what: 'a Gilden merchant house (stepped gable)',
      file: 'sprites/ruins/tileset34_source.png (cut as piece `gdHouse1`)',
      standIn: "Hollowmere's cottages",
      usedBy: 'tools/mapgen/gilden.js'
    },
    {
      id: 'piece_gd_countingHouse',
      kind: 'piece',
      piece: 'countingHouse',
      what: 'a counting-house',
      file: 'sprites/ruins/tileset34_source.png (cut as piece `countingHouse`)',
      standIn: "Hollowmere's cottages",
      usedBy: 'tools/mapgen/gilden.js'
    }
  ];
  const BY = Object.fromEntries(LIST.map(e => [e.id, e]));
  const found = {}; // url → true / false once probed
  async function exists(url) {
    if (url in found) return found[url];
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      found[url] = r.ok;
    } catch (e) {
      found[url] = false;
    }
    return found[url];
  }
  const Placeholders = {
    LIST,
    get: id => BY[id] || null,
    // look for the real files of these placeholders (all of them if none given)
    probe: ids =>
      Promise.all(
        (ids || LIST.map(e => e.id))
          .map(id => BY[id])
          .filter(e => e && e.kind !== 'piece')
          .flatMap(e => [exists(e.file), e.face ? exists(e.face) : null])
      ),
    // the real sprite / face once it's there (after probe), else null: use the stand-in
    real: id => (BY[id] && found[BY[id].file] ? BY[id].file : null),
    realFace: id => (BY[id] && BY[id].face && found[BY[id].face] ? BY[id].face : null),
    // a map's backdrop name when its real painting is in
    arena: mapId => {
      const e = LIST.find(x => x.kind === 'arena' && x.map === mapId);
      return e && found[e.file] ? e.name : null;
    },
    // is the stand-in still being used? (probed placeholders only)
    standing: id => !!(BY[id] && BY[id].file in found && !found[BY[id].file]),
    show: () => {
      try {
        return /[?&]placeholders\b/.test(location.search) || localStorage.getItem('wd-show-ph') === '1';
      } catch (e) {
        return false;
      }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Placeholders;
  else root.Placeholders = Placeholders;
})(typeof window !== 'undefined' ? window : this);
