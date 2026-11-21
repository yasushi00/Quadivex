/** Validate local official opening CSV and build the CLI pool.
 * Original positions are external data; this script does not license them.
 */
import fs from 'node:fs';
import path from 'node:path';

import {parseOpenings} from '../opening_csv.js';
export function parseOfficialPositions(input) {
 return parseOpenings(input,{expected:96,strict:true}).map(({b,w})=>({b,w}));
}

export function writePositionsJson(text, destination='tests/official_96_positions.json') {
  const positions=parseOfficialPositions(text);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,JSON.stringify(positions,null,2)+'\n');
  return positions.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const csvPath=process.argv[2] || 'InitialPosition.csv';
  const count=writePositionsJson(fs.readFileSync(csvPath,'utf8'));
  console.log(`Validated ${count} official positions. Created tests/official_96_positions.json`);
}
