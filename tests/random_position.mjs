import assert from 'node:assert/strict';
import {generateRandomOpening} from '../random_position.js';
let seed=0x12345678;
const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
for(let n=0;n<2000;n++) {
 const {board,stoneOrders}=generateRandomOpening(rng);
 assert.equal(board.black_stones & board.white_stones,0);
 assert.equal(stoneOrders.B.length,4);assert.equal(stoneOrders.W.length,4);
 assert.equal(new Set([...stoneOrders.B,...stoneOrders.W]).size,8);
 assert.equal(board.is_square(0),false);
 assert.equal(board.is_square(1),false);
 assert.equal(stoneOrders.B.reduce((m,i)=>m|(1<<i),0),board.black_stones);
 assert.equal(stoneOrders.W.reduce((m,i)=>m|(1<<i),0),board.white_stones);
}
assert.throws(()=>generateRandomOpening(()=>1),/Invalid random value/);
console.log('PASS: 2000 random non-square legal openings, with stable source stone order');
