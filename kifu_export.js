import {SQUARE_MASKS} from './keishi_rules.js';
/** Keishi Stadium CSV export.
 * Initial stone order is preserved (via stoneOrders) and a move changes only
 * the corresponding stone's coordinate column. WIN is official Stadium syntax.
 * Cutoffs and non-square results are only recorded in KJF.
 */
export const ENGINE_NAME = 'Quadivex v1.0.0';
const color = c => c===0 || c==='B' ? 'B' : c===1 || c==='W' ? 'W' : (()=>{throw Error('Invalid color')})();
const cleanName = s => {
  if(typeof s!=='string' || !s.trim() || /[\r\n,()[\]]/.test(s)) throw Error('Invalid program name');
  return s.trim();
};
const eol = rows => rows.join('\r\n')+'\r\n';
const bit = n => 1<<n;
const countBits = x => {let count=0;while(x){x&=x-1;count++;}return count;};
const coords = index => `${index%5+1}${Math.floor(index/5)+1}`;
function getOrder(bits, explicit) {
  const order = explicit ? [...explicit] : Array.from({length:25},(_,i)=>i).filter(i=>bits&bit(i));
  if(order.length!==4 || new Set(order).size!==4 || order.some(i=>!Number.isInteger(i)||i<0||i>=25)) {
    throw Error('Invalid four-stone coordinate order');
  }
  const actual = order.reduce((mask,i)=>mask|bit(i),0);
  if(actual!==bits) throw Error(`Stone order does not match board mask: ${actual} != ${bits}`);
  return order;
}
export function formatStones(prefix,bits,stoneOrder) {
  if(prefix!=='B' && prefix!=='W') throw Error('Invalid color');
  return `${prefix}${getOrder(bits,stoneOrder).map(coords).join(',')}`;
}
export function stadiumGameRows(snapshots, {
  ply=snapshots.length-1, blackName=ENGINE_NAME, whiteName='Human',
  secondLeg=false, winner=null, startingColor=secondLeg?'W':'B',
  stoneOrders=null, drawReason=null
}={}) {
  if(!snapshots?.length || !Number.isInteger(ply) || ply<0 || ply>=snapshots.length) throw Error('Invalid history');
  const first=color(startingColor);
  if(first !== (secondLeg?'W':'B')) throw Error('First leg must start Black; second leg must start White');
  const names={B:cleanName(blackName),W:cleanName(whiteName)};
  const wrap=n => secondLeg?`[${n}]`:`(${n})`;
  const initial=snapshots[0];
  const bits=(s,c)=>c==='B'?s.black_stones:s.white_stones;
  const other=first==='B'?'W':'B';
  const order={
    B:getOrder(bits(initial,'B'),stoneOrders?.B),
    W:getOrder(bits(initial,'W'),stoneOrders?.W)
  };
  const rows=[`${formatStones(first,bits(initial,first),order[first])},${wrap(names[first])}`,
              `${formatStones(other,bits(initial,other),order[other])},${wrap(names[other])}`];
  for(let n=1;n<=ply;n++) {
    const mover=n%2===1?first:other;
    const oldBits=bits(snapshots[n-1],mover),newBits=bits(snapshots[n],mover);
    if(bits(snapshots[n-1],mover==='B'?'W':'B')!==bits(snapshots[n],mover==='B'?'W':'B')) {
      throw Error(`Ply ${n}: opponent stones changed unexpectedly`);
    }
    const removed=oldBits&~newBits, added=newBits&~oldBits;
    if(countBits(removed)!==1 || countBits(added)!==1) throw Error(`Ply ${n}: expected exactly one moved stone`);
    const from=31-Math.clz32(removed),to=31-Math.clz32(added);
    const slot=order[mover].indexOf(from);
    if(slot<0) throw Error(`Ply ${n}: moved stone not tracked`);
    order[mover][slot]=to;
    rows.push(formatStones(mover,newBits,order[mover]));
  }
  if(winner!=null && drawReason!=null)throw Error('A game cannot have both WIN and cutoff');
  if(winner!=null) {
    const w=color(winner),last=ply%2===1?first:other;
    if(ply===0 || last!==w) throw Error('WIN must name the player who made the final move');
    if(!SQUARE_MASKS.includes(bits(snapshots[ply],w)))throw Error('WIN requires a square');
    rows.push(`WIN,,,,${wrap(names[w])}`);
  }
  // No nonstandard terminal rows. Caller must disclose omitted result information.
  return rows;
}
export function exportStadiumCsv(snapshots,opts={}) {return eol(stadiumGameRows(snapshots,opts));}
export function exportStadiumPairCsv(first,second) {
  const rows=(game,secondLeg)=>stadiumGameRows(game.snapshots,{...game,secondLeg,winner:game.reason==='square'?game.winner:null});
  // Replay requires a square WIN before leg 2. Preserve the full match in KJF.
  if(first.reason!=='square')return eol(rows(first,false));
  return eol([...rows(first,false),...rows(second,true)]);
}
/** Browser export of current timeline: leave games in progress without DRAW. */
export function exportKifuCsv(snapshots,ply=snapshots.length-1,opts={}) {
  return exportStadiumCsv(snapshots,{...opts,ply});
}
export function downloadKifuCsv(snapshots,ply,filename,opts={}) {
  const csv=exportKifuCsv(snapshots,ply,opts);
  const link=document.createElement('a');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  link.href=url;link.download=filename;
  document.body.appendChild(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
