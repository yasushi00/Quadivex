import {bundledOpenings} from './bundled_openings.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Board,Move,Position,DaiPunch,SQUARE_MASKS} from '../keishi_rules.js';
import {EnhancedKeishiAI} from '../enhanced_ai.js';
import {exportKifuCsv} from '../kifu_export.js';
const bytes=fs.readFileSync(new URL('../enhanced_engine.wasm',import.meta.url));
const ai=await EnhancedKeishiAI.create({wasmBytes:bytes});
const positions=bundledOpenings;
assert.equal(SQUARE_MASKS.length,50);
let tests=0, played=0;
for(let opening=0;opening<96;opening++){
 const b=new Board();b.reset_with(positions[opening].b,positions[opening].w);
 const history=[b.clone_js()];
 for(let ply=0;ply<10;ply++){
  const last=(mv)=>mv===Move.none()?-1:mv.to_u32();
  const s={black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,lastB:last(b.last_move_b),lastW:last(b.last_move_w)};
  const moves=[];
  for(let f=0;f<25;f++)for(let t=0;t<25;t++) {
   let expected=b.is_available_move(new Position(f%5,Math.floor(f/5)),new Position(t%5,Math.floor(t/5)));
   assert.equal(ai.isLegal(s,f,t),expected,`opening=${opening+1} ply=${ply} ${f}->${t}`);
   tests++;
   if(expected)moves.push(f*25+t);
  }
  if(!moves.length)break;
  const best=ai.getNextMove(s,8,3);
  assert.ok(moves.includes(best.move),`AI illegal move ${best.move}`);
  const m=Move.from_u32(best.move);
  b.do_move(m);history.push(b.clone_js());played++;
  const punch=new DaiPunch();punch.check(b);
  assert.equal(typeof punch.get_stone(2,2),'number');
  if(b.is_square(b.turn^1))break;
 }
 assert.ok(exportKifuCsv(history).startsWith('B'));
}
console.log(`PASS: ${tests} legality checks, ${played} AI moves, 96 openings, CSV export, standalone rules`);
