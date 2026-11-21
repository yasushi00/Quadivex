import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formatStones,exportKifuCsv,exportStadiumCsv,exportStadiumPairCsv,ENGINE_NAME} from '../kifu_export.js';
const bits=items=>items.reduce((mask,i)=>mask|(1<<i),0);
const index=s=>(Number(s[1])-1)*5+Number(s[0])-1;
const mask=coords=>bits(coords.map(index));
const B=mask(['22','41','43','24']),W=mask(['23','34','42','44']);
const B1=mask(['12','41','43','24']),W1=mask(['13','34','42','44']);
const B2=mask(['12','41','53','24']);
const original={B:['22','41','43','24'].map(index),W:['23','34','42','44'].map(index)};
const history=[{black_stones:B,white_stones:W},{black_stones:B1,white_stones:W},
 {black_stones:B1,white_stones:W1},{black_stones:B2,white_stones:W1}];
const first=exportKifuCsv(history,3,{blackName:ENGINE_NAME,whiteName:'Human',stoneOrders:original});
assert.deepEqual(first.trim().split('\r\n'),[
 `B22,41,43,24,(${ENGINE_NAME})`,'W23,34,42,44,(Human)',
 'B12,41,43,24','W13,34,42,44','B12,41,53,24']);
assert.equal(exportKifuCsv(history,2,{stoneOrders:original}).trim().split('\r\n').length,4);
assert.equal(formatStones('B',B,original.B),'B22,41,43,24');
assert.throws(()=>formatStones('B',B,[0,1,2,3]),/does not match/);
assert.throws(()=>exportStadiumCsv(history,{ply:2,winner:0,stoneOrders:original}),/WIN must name/);
assert.throws(()=>exportStadiumCsv(history,{ply:1,winner:0,stoneOrders:original}),/requires a square/);
assert.ok(!exportStadiumCsv(history,{ply:2,stoneOrders:original}).includes('DRAW'));

// First leg uses original positions; second leg swaps the initial masks and
// coordinates, White first (engine B), preserving the original column order.
const squareB=mask(['11','12','21','32']),squareW=mask(['33','34','43','55']),won=mask(['11','12','21','22']);
const order={B:['11','12','21','32'].map(index),W:['33','34','43','55'].map(index)};
const g1={snapshots:[{black_stones:squareB,white_stones:squareW},{black_stones:won,white_stones:squareW}],blackName:'QDX',whiteName:'Rust',winner:0,reason:'square',stoneOrders:order};
const g2={snapshots:[{black_stones:squareW,white_stones:squareB},{black_stones:squareW,white_stones:won}],blackName:'QDX',whiteName:'Rust',winner:1,reason:'square',stoneOrders:{B:order.W,W:order.B}};
const pair=exportStadiumPairCsv(g1,g2);
assert.ok(pair.includes('WIN,,,,(QDX)\r\nW11,12,21,32,[Rust]\r\nB33,34,43,55,[QDX]\r\nW11,12,21,22\r\nWIN,,,,[Rust]'));
const capped={...g1,snapshots:g1.snapshots.slice(0,1),winner:null,reason:'maxPly'};
assert.equal(exportStadiumPairCsv(capped,g2),exportStadiumCsv(capped.snapshots,capped));
assert.ok(!exportStadiumCsv(history,{ply:1,drawReason:'maxPly'}).includes('DRAW'));
assert.throws(()=>exportStadiumCsv(g1.snapshots,{winner:0,drawReason:'maxPly'}),/both WIN and cutoff/);
const poolFile=new URL('./official_96_positions.json',import.meta.url);
if(fs.existsSync(poolFile)){const pool=JSON.parse(fs.readFileSync(poolFile));const {readOfficialOrders}=await import("./opening_orders.mjs");const orders=readOfficialOrders(pool);assert.equal(orders.length,96);assert.deepEqual(orders[0],original);}
console.log('PASS: coordinate identity, square WIN, second leg, partial CSV, no DRAW');
