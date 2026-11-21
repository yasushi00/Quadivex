/** Two-game pair: two wins => winner, one each => draw, cutoff => unfinished. */
export function scorePair(first,second,nameA,nameB) {
  if(nameA===nameB)throw Error('Pair requires distinct player names');
  const resolve = g => {
    if(!['square','prohibited_return','resignation'].includes(g.reason)||g.winner==null)return null;
    const name=g.winner===0?g.blackName:g.whiteName;
    if(name!==nameA&&name!==nameB)throw Error(`Unknown winner ${name}`);
    return name;
  };
  const winnerFirst=resolve(first),winnerSecond=resolve(second);
  const result=winnerFirst===null||winnerSecond===null?'unfinished'
    :winnerFirst===winnerSecond?(winnerFirst===nameA?'A':'B'):'draw';
  return {result,winner:result==='A'?nameA:result==='B'?nameB:null,
    firstWinner:winnerFirst,secondWinner:winnerSecond};
}
