import {Board,Move,Position} from './keishi_rules.js';
import {validateOpening,prohibitedReturnLoss} from './game_state.js';
/** KJF v1.0 serializer for local Keishi game snapshots.
 * KJF spec: https://github.com/yasushi00/keishi-kjf
 * Does not change the search engine or game rules.
 */
const other = c => c === 'B' ? 'W' : 'B';
const bit = i => 1 << i;
const xy = i => `${i % 5 + 1}${Math.floor(i / 5) + 1}`;
const bits = (s, c) => c === 'B' ? s.black_stones : s.white_stones;
const count = n => {let z=0; for(let x=n >>> 0;x;x&=x-1)z++;return z;};
function initialOrder(s, order) {
  const out = {};
  for (const color of ['B', 'W']) {
    const a = order?.[color] ? [...order[color]] : Array.from({length:25},(_,i)=>i).filter(i=>bits(s,color)&bit(i));
    if (a.length !== 4 || new Set(a).size !== 4 || a.some(x=>!Number.isInteger(x)||x<0||x>24)) throw Error(`Bad ${color} stone order`);
    if (a.reduce((m,i)=>m|bit(i),0)!==bits(s,color)) throw Error(`Order mismatch for ${color}`);
    out[color] = a;
  }
  return out;
}
const plain = o => ({B:o.B.map(xy), W:o.W.map(xy)});
function encodeGame(g, gameNo) {
  if(!g?.snapshots?.length) throw Error('Missing snapshots');
  const first = g.startingColor ?? (gameNo === 2 ? 'W' : 'B');
  if(!['B','W'].includes(first))throw Error('Invalid starting color');
  if(first !== (gameNo === 2 ? 'W' : 'B') && g.matchType!=='single')throw Error('Unexpected starting color');
  const order = initialOrder(g.snapshots[0],g.stoneOrders);
  const initial = {first,board:plain(order)};
  const moves=[];
  validateOpening(g.snapshots[0].black_stones,g.snapshots[0].white_stones);
  const replay=new Board();replay.reset_with(g.snapshots[0].black_stones,g.snapshots[0].white_stones);replay.turn=first==='B'?0:1;
  const pos=i=>new Position(i%5,Math.floor(i/5));
  const ply = g.ply ?? g.snapshots.length-1;
  if(!Number.isInteger(ply) || ply < 0 || ply >= g.snapshots.length)throw Error('Bad ply');
  for(let i=1;i<=ply;i++){
    if(replay.is_square(0)||replay.is_square(1))throw Error('Move after square');
    const actor = i%2 ? first : other(first);
    const before=g.snapshots[i-1], after=g.snapshots[i];
    if(bits(before,other(actor))!==bits(after,other(actor)))throw Error(`Ply ${i}: opponent changed`);
    const removed=bits(before,actor)&~bits(after,actor), added=bits(after,actor)&~bits(before,actor);
    if(count(removed)!==1 || count(added)!==1)throw Error(`Ply ${i}: invalid move masks`);
    const from=31-Math.clz32(removed), to=31-Math.clz32(added);
    const slot=order[actor].indexOf(from);
    if(slot < 0)throw Error(`Ply ${i}: stone identity lost`);
    if(Math.max(Math.abs(from%5-to%5),Math.abs(Math.floor(from/5)-Math.floor(to/5))) !== 1)throw Error(`Ply ${i}: nonadjacent move`);
    if((bits(before,'B')|bits(before,'W'))&bit(to))throw Error(`Ply ${i}: destination occupied`);
    replay.do_move(new Move(pos(from),pos(to)));
    if(replay.black_stones!==after.black_stones||replay.white_stones!==after.white_stones)throw Error('Snapshot mismatch');
    order[actor][slot]=to;
    moves.push({color:actor,board:plain(order)});
  }
  let result;
  const square=replay.is_square(0)?0:replay.is_square(1)?1:null;
  if(square!==null&&(g.reason!=='square'||g.winner!==square))throw Error('Square result mismatch');
  if(g.reason==='square'&&(square===null||g.winner!==square))throw Error('Square result mismatch');
  if(g.reason==='prohibited_return'&&(!prohibitedReturnLoss(replay)||g.winner!==(replay.turn^1)))throw Error('Invalid prohibited-return result');
  if(g.reason==='square'){
    if(g.winner!==0 && g.winner!==1)throw Error('Square ending without a winner');
    result={status:'finished',winner:g.winner===0?'p1':'p2',reason:'square'};
  }else if(g.reason==='resignation'||g.reason==='prohibited_return'){
    if(g.winner!==0 && g.winner!==1)throw Error('Resignation without winner');
    result={status:'finished',winner:g.winner===0?'p1':'p2',reason:g.reason};
  }else if(g.reason==='draw' || g.reason==='move_limit'){
    result={status:'finished',winner:null,reason:g.reason};
  }else if(g.reason==='playing' || g.reason===undefined){
    result={status:'playing',winner:null,reason:null};
  }else if(g.reason==='maxPly' || g.reason==='noMove' || g.reason==='interrupted'){
    // Simulator cutoffs are not a formal draw unless a rule actually declared one.
    result={status:'interrupted',winner:null,reason:'interrupted'};
  }else throw Error(`Unknown ending: ${g.reason}`);
  return {gameNo,black:'p1',white:'p2',initial,moves,result};
}
function matchResult(games, matchType) {
  const a=games[0].result;
  if(matchType==='single')return a.status==='finished'
    ? {status:'finished',winner:a.winner,reason:'single_game'}
    : {status:a.status,winner:null,reason:a.status==='interrupted'?'interrupted':null};
  if(games.length===1)return a.status==='interrupted'
    ? {status:'interrupted',winner:null,reason:'interrupted'}
    : {status:'playing',winner:null,reason:null};
  const b=games[1].result;
  if(a.status!=='finished')throw Error('Game 2 cannot start until game 1 finishes');
  if(b.status==='interrupted')return {status:'interrupted',winner:null,reason:'interrupted'};
  if(b.status==='playing')return {status:'playing',winner:null,reason:null};
  if(a.winner===null||b.winner===null)return {status:'finished',winner:null,reason:'drawn_game'};
  if(a.winner===b.winner)return {status:'finished',winner:a.winner,reason:'two_wins'};
  return {status:'finished',winner:null,reason:'split'};
}
export function exportKjf({first,second=null,players,header={},matchType='two-game'}) {
  if(!first || !players?.p1 || !players?.p2)throw Error('Missing players or first game');
  if(matchType!=='single'&&matchType!=='two-game')throw Error('Bad matchType');
  if(matchType==='single'&&second)throw Error('Single match cannot have second game');
  const games=[encodeGame({...first,matchType},1)];
  if(second){
    if(games[0].result.status!=='finished')throw Error('Cannot export game 2 after an unfinished game 1');
    const g2=encodeGame({...second,matchType},2);
    if(JSON.stringify(g2.initial.board.B)!==JSON.stringify(games[0].initial.board.W) ||
       JSON.stringify(g2.initial.board.W)!==JSON.stringify(games[0].initial.board.B))throw Error('Game 2 initial positions must swap B/W with original index order');
    games.push(g2);
  }
  return {format:'KJF',version:'1.0',header:{...header,matchType,rules:'jun-keishi'},players,games,result:matchResult(games,matchType)};
}
export function downloadKjf(doc,filename) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)+'\n'],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
