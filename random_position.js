/** Random Keishi opening: eight distinct cells, no pre-existing square. */
import {Board} from './keishi_rules.js';
export function generateRandomOpening(rng=Math.random,maxAttempts=10000) {
  for(let attempt=0;attempt<maxAttempts;attempt++) {
    const cells=Array.from({length:25},(_,i)=>i);
    // Partial Fisher-Yates shuffle ensures each of the first eight cells is unique.
    for(let i=0;i<8;i++) {
      const v=rng();
      if(!(v>=0 && v<1)) throw Error('Invalid random value');
      const j=i+Math.floor(v*(25-i));
      [cells[i],cells[j]]=[cells[j],cells[i]];
    }
    const board=new Board(),stoneOrders={B:[],W:[]};
    for(let i=0;i<8;i++) {
      const cell=cells[i],side=i%2;
      board.set_stone(cell%5,Math.floor(cell/5),side);
      stoneOrders[side===0?'B':'W'].push(cell);
    }
    if(!board.is_square(0) && !board.is_square(1)) return {board,stoneOrders};
  }
  throw Error('Could not generate a valid random opening');
}
