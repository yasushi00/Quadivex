import assert from 'node:assert/strict';
import {parseOpenings} from '../opening_csv.js';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const csv = fs.readFileSync(new URL('../InitialPosition.csv',import.meta.url));
const rows=csv.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/);
const mask=(s,expected,index)=>{
 if(!new RegExp(`^${expected}[1-5][1-5](,[1-5][1-5]){3}$`).test(s)) throw Error(`${index}: bad ${expected} row: ${s}`);
 let bits=0;
 for(const part of s.slice(1).split(',')) {
  const x=+part[0]-1,y=+part[1]-1,b=1<<(y*5+x);
  if(bits&b) throw Error(`${index}: duplicate ${expected} piece`);
  bits|=b;
 }
 return bits;
};
const list=[];
for(let i=0;i<96;i++) {
 const b=mask(rows[i*3], 'B',i+1),w=mask(rows[i*3+1],'W',i+1);
 if(i<95 && rows[i*3+2]?.trim())throw Error(`${i+1}: missing blank separator`);
 if(b&w)throw Error(`${i+1}: overlapping pieces`);
 list.push({b,w});
}
if(rows.slice(287).some(s=>s.trim()))throw Error('Unexpected content after 96 openings');
const pool=parseOpenings(csv.toString('utf8'),{expected:96,strict:true});
assert.deepEqual(pool.map(({b,w})=>({b,w})),list);
console.log('PASS: 96 bundled openings, independently checked masks and shared parser');
console.log('CSV SHA256:',createHash('sha256').update(csv).digest('hex'));
console.log('UTF-8 BOM:',csv.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf]))?'present':'absent');
