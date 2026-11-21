import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EnhancedKeishiAI} from '../enhanced_ai.js';
import {Board, Move} from '../keishi_rules.js';
import {readQdxLimits} from './qdx_limits.mjs';

const keys=['NODES','DEPTH','BUDGET'];
const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function config(vars,defaultMs=100){
  for(const k of keys) delete process.env[k];
  Object.assign(process.env,vars);
  return readQdxLimits(defaultMs);
}
try {
  assert.deepEqual(config({}),{timeMs:100,nodeLimit:0,depthLimit:0,budgetMs:100,mode:'time'});
  assert.deepEqual(config({NODES:'1234'}),{timeMs:-1,nodeLimit:1234,depthLimit:0,budgetMs:null,mode:'fixed'});
  assert.deepEqual(config({DEPTH:'5'}),{timeMs:-1,nodeLimit:0,depthLimit:5,budgetMs:null,mode:'fixed'});
  assert.deepEqual(config({NODES:'1234',DEPTH:'5',BUDGET:'300'}),{timeMs:300,nodeLimit:1234,depthLimit:5,budgetMs:300,mode:'fixed-with-timeout'});
  for(const [key,val] of [['NODES','-1'],['NODES','0'],['DEPTH','0'],['DEPTH','61'],['BUDGET','0']]){
    assert.throws(()=>config({[key]:val}));
  }
} finally {
  for(const k of keys) prior[k]===undefined?delete process.env[k]:process.env[k]=prior[k];
}
const data=JSON.parse(fs.readFileSync(new URL('./official_96_positions.json',import.meta.url),'utf8'));
const initial=data[0];
const state={black_stones:initial.b,white_stones:initial.w,turn:0,lastB:-1,lastW:-1};
const wasmBytes=fs.readFileSync(new URL('../enhanced_engine.wasm',import.meta.url));
const ai=await EnhancedKeishiAI.create({wasmBytes});
function verify(r){
  const b=new Board();b.reset_with(initial.b,initial.w);
  if(r.move<0)throw Error('no legal move in initial position');
  const m=Move.from_u32(r.move);
  assert.ok(b.is_available_move(m.from,m.to));
}
const d=ai.getNextMove(state,8,-1,{depth:1});
verify(d);assert.equal(d.depth,1);
const n=ai.getNextMove(state,8,-1,{nodes:1024});
verify(n);assert.ok(n.nodes<=1024,`nodes=${n.nodes}`);
const both=ai.getNextMove(state,8,-1,{nodes:2000,depth:2});
verify(both);assert.ok(both.nodes<=2000 && both.depth<=2);
const legacy=ai.getNextMove(state,8,3);
verify(legacy);
// Deterministic fixed-depth search from clean, independent engines.
const a=await EnhancedKeishiAI.create({wasmBytes});
const b=await EnhancedKeishiAI.create({wasmBytes});
const one=a.getNextMove(state,8,-1,{depth:2});
const two=b.getNextMove(state,8,-1,{depth:2});
assert.deepEqual([one.move,one.depth,one.score,one.nodes],[two.move,two.depth,two.score,two.nodes]);
console.log('PASS: QDX-only NODES/DEPTH/BUDGET parsing, WASM limits, legal moves, deterministic fixed-depth baseline');
