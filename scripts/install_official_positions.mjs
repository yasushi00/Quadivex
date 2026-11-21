/** Optional local-only installation; does not redistribute original data. */
import fs from 'node:fs';
import path from 'node:path';
import {parseOfficialPositions} from './build_official_positions.mjs';

const url='https://licheng.sakura.ne.jp/webkc/InitialPosition.csv';
const args=process.argv.slice(2);
if(args.length>2 || (args.length && (args[0]!=='--from' || !args[1]))) {
  console.error('Usage: npm run setup:positions [-- --from /path/to/InitialPosition.csv]');
  process.exit(2);
}
let data;
if(args[0]==='--from') {
  data=fs.readFileSync(args[1],'utf8');
  console.log(`Reading user-supplied original CSV: ${args[1]}`);
} else {
  const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error(`HTTP ${res.status}: ${url}`);
  data=await res.text();
}
const rows=parseOfficialPositions(data);
const csvTarget='InitialPosition.csv', jsonTarget='tests/official_96_positions.json';
fs.mkdirSync(path.dirname(jsonTarget),{recursive:true});
const stamp=`.${process.pid}.tmp`;
try {
  fs.writeFileSync(csvTarget+stamp,data);
  fs.writeFileSync(jsonTarget+stamp,JSON.stringify(rows,null,2)+'\n');
  fs.renameSync(csvTarget+stamp,csvTarget);
  fs.renameSync(jsonTarget+stamp,jsonTarget);
} finally {
  for(const f of [csvTarget+stamp,jsonTarget+stamp])if(fs.existsSync(f))fs.unlinkSync(f);
}
console.log(`Installed ${rows.length} validated openings for browser and CLI.`);
console.log('Original data is external and is not covered by this repository MIT license.');
