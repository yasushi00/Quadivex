import assert from 'node:assert/strict';
import {Board,Move} from '../keishi_rules.js';
import {outcome} from '../game_state.js';

export function prohibitedReturnGame(){
 const f=new Board();f.reset_with(20972064,9502848);const snapshots=[f.clone_js()];
for(const v of [568,176,467,410,239,516,446,412,545,307,515,25,136,188,618,334,280,597,358,6,203]){assert.equal(outcome(f,snapshots.length-1).reason,'playing');f.do_move(Move.from_u32(v));snapshots.push(f.clone_js());}
 assert.deepEqual(outcome(f,21),{reason:'prohibited_return',winner:0});
 return {snapshots,reason:'prohibited_return',winner:0};
}
