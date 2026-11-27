#!/usr/bin/env node
// Builds the Explore maps: runs each generator in tools/mapgen/ and writes maps/<id>.json,
// which js/explore.js loads. Re-run after changing a generator or re-cutting the tilesets
// (piece sizes come from sprites/ruins/ruins*.json).
//
//   node tools/build_maps.js            # every map
//   node tools/build_maps.js hollowmere # just one
'use strict';
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');

const rects = {};
for (const f of fs
  .readdirSync(path.join(ROOT, 'sprites/ruins'))
  .filter(f => /^(ruins\d*|sector_\w+)\.json$/.test(f))
  .sort())
  Object.assign(rects, JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites/ruins', f), 'utf8')));

const GENERATORS = {
  hollowmere: require('./mapgen/hollowmere'),
  corvanthe_road: require('./mapgen/corvanthe_road'),
  cindergate: require('./mapgen/cindergate'),
  heights: rects => require('./mapgen/sector')(rects, 'heights'),
  spirewatch: rects => require('./mapgen/sector')(rects, 'spirewatch'),
  collegium: rects => require('./mapgen/sector')(rects, 'collegium'),
  drowned_quarter: rects => require('./mapgen/sector')(rects, 'drowned_quarter'),
  quarry_ward: rects => require('./mapgen/sector')(rects, 'quarry_ward'),
  frostmarket: rects => require('./mapgen/sector')(rects, 'frostmarket'),
  gloamside: rects => require('./mapgen/sector')(rects, 'gloamside'),
  wrenford: require('./mapgen/wrenford'),
  elfhome: require('./mapgen/elfhome'),
  // the inner districts, between each sector's north barrier and the Wound
  ...Object.fromEntries(
    Object.entries(require('./mapgen/inner').INNER_IDS).map(([outer, id]) => [
      id,
      rects => require('./mapgen/inner')(rects, outer)
    ])
  )
};
const only = process.argv[2];
fs.mkdirSync(path.join(ROOT, 'maps'), { recursive: true });
for (const [id, gen] of Object.entries(GENERATORS)) {
  if (only && only !== id) continue;
  const map = gen(rects).toJSON();
  const out = path.join(ROOT, 'maps', id + '.json');
  // one object per line keeps diffs readable
  const txt = JSON.stringify(Object.assign({}, map, { objects: '@@OBJ@@', ground: '@@GROUND@@' }), null, 1)
    .replace('"@@GROUND@@"', '[\n' + map.ground.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n ]')
    .replace('"@@OBJ@@"', '[\n' + map.objects.map(o => '  ' + JSON.stringify(o)).join(',\n') + '\n ]');
  fs.writeFileSync(out, txt + '\n');
  console.log(
    id.padEnd(16),
    map.cols + 'x' + map.rows,
    String(map.objects.length).padStart(4),
    'pieces ->',
    path.relative(ROOT, out)
  );
}
