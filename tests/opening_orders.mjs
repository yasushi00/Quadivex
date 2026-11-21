/** Read original CSV coordinate column order and cross-check bitboard masks. */
import fs from 'node:fs';
const lines=fs.readFileSync(new URL('../InitialPosition.csv',import.meta.url),'utf8')
 .replace(/^\uFEFF/,'').split(/\r?\n/);
function parse(line,side,index) {
 if(!new RegExp(`^${side}[1-5][1-5](,[1-5][1-5]){3}$`).test(line))throw Error(`Opening ${index}: invalid ${side} order`);
 const positions=line.slice(1).split(',').map(p=>(Number(p[1])-1)*5+Number(p[0])-1);
 if(new Set(positions).size!==4)throw Error(`Opening ${index}: duplicate coordinate`);
 return positions;
}
export function readOfficialOrders(pool) {
 if(pool.length!==96)throw Error('Expected 96 official positions');
 return pool.map((p,i)=>{
   const B=parse(lines[i*3],'B',i+1),W=parse(lines[i*3+1],'W',i+1);
   const mask=a=>a.reduce((m,n)=>m|(1<<n),0);
   if(mask(B)!==p.b||mask(W)!==p.w)throw Error(`Opening ${i+1}: order/mask mismatch`);
   return {B,W};
 });
}
