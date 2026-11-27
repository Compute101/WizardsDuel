#!/usr/bin/env node
// What art is still a stand-in, and where the real file goes (the list is js/placeholders.js).
//   node tools/placeholders.js         every placeholder: STAND-IN or REAL, its file and what stands in now
//   node tools/placeholders.js todo    only the ones still standing in
// A person or backdrop is REAL once its file is at the path; a map piece once its name is in an atlas
// (cut the sheet with tools/cut_ruins_tileset.py, then re-run tools/build_maps.js so the map uses it).
'use strict';
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const PH = require('../js/placeholders.js');

const pieces = {};
for (const f of fs.readdirSync(path.join(ROOT, 'sprites/ruins')).filter(f => /^ruins\d*\.json$/.test(f)))
  Object.assign(pieces, JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites/ruins', f), 'utf8')));
const has = f => fs.existsSync(path.join(ROOT, f));

const todo = process.argv[2] === 'todo';
let left = 0;
for (const e of PH.LIST) {
  const real = e.kind === 'piece' ? !!pieces[e.piece] : has(e.file);
  const faceOk = !e.face || has(e.face);
  if (!real) left++;
  if (todo && real && faceOk) continue;
  const tag = real ? (faceOk ? 'REAL     ' : 'NO FACE  ') : 'STAND-IN ';
  console.log(tag + e.id.padEnd(18) + e.what);
  console.log(' '.repeat(9) + 'goes to: ' + e.file + (e.face ? '  (face: ' + e.face + ')' : ''));
  if (!real) console.log(' '.repeat(9) + 'now:     ' + e.standIn);
}
console.log('\n' + left + ' of ' + PH.LIST.length + ' still standing in.');
