import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QuadZenithAI} from '../guadzenith_ai.js';
import {EnhancedKeishiAI} from '../enhanced_ai.js';
import {Board,Move,Position} from '../keishi_rules.js';
import {parseEngine} from './engine_registry.mjs';

const input=JSON.parse(fs.readFileSync(new URL('./official_96_positions.json',import.meta.url),'utf8'));
const bytes=fs.readFileSync(new URL('../guadzenith_engine.wasm',import.meta.url));
const qz=await QuadZenithAI.create({wasmBytes:bytes});
const qdx=await EnhancedKeishiAI.create({wasmBytes:fs.readFileSync(new URL('../enhanced_engine.wasm',import.meta.url))});
for(const name of ['QZ1','QZ2','QZ3','QDX1','QDX2','QDX3','RUST7']) assert.equal(parseEngine(name).id,name);
assert.throws(()=>parseEngine('RUST8'),/Invalid/);
assert.throws(()=>parseEngine('QZ4'),/Invalid/);
const prev=m=>m===Move.none()?-1:m.to_u32();
let legalCount=0;
for(let opening=0;opening<input.length;opening++){
    const b=new Board();b.reset_with(input[opening].b,input[opening].w);
    for(let ply=0;ply<4;ply++){
        const s={black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,
            lastB:prev(b.last_move_b),lastW:prev(b.last_move_w)};
        for(let from=0;from<25;from++)for(let to=0;to<25;to++){
            const exp=b.is_available_move(new Position(from%5,Math.floor(from/5)),new Position(to%5,Math.floor(to/5)));
            assert.equal(qz.isLegal(s,from,to),exp,`QuadZenith illegal at position ${opening+1}, ply=${ply}, ${from}->${to}`);
            assert.equal(qz.isLegal(s,from,to),qdx.isLegal(s,from,to));
            legalCount++;
        }
        const r=qz.getNextMove(s,8,-1,{depth:2});
        assert.ok(r.move>=0 && r.depth<=2);
        assert.ok(qz.isLegal(s,r.from,r.to));
        const m=Move.from_u32(r.move);
        const mover=b.turn;
        b.do_move(m);
        if(b.is_square(mover))break;
    }
}
const position=input[0];
const state={black_stones:position.b,white_stones:position.w,turn:0,lastB:-1,lastW:-1};
const a=await QuadZenithAI.create({wasmBytes:bytes});
const c=await QuadZenithAI.create({wasmBytes:bytes});
const r1=a.getNextMove(state,8,-1,{depth:3});
const r2=c.getNextMove(state,8,-1,{depth:3});
assert.deepEqual([r1.move,r1.depth,r1.nodes,r1.score],[r2.move,r2.depth,r2.nodes,r2.score]);
const bounded=qz.getNextMove(state,8,-1,{nodes:2048,depth:12});
assert.ok(bounded.nodes<=2048 && bounded.depth<=12);
console.log(`PASS: QuadZenith vs independent rules / QDX: ${legalCount} position-moves, limits and deterministic depth`);
