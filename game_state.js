/** Shared game adjudication; search engines remain unchanged. */
import {Board,Move,Position,SQUARE_MASKS} from './keishi_rules.js';
export const STADIUM_MAXPLY=1000;
const pos=i=>new Position(i%5,Math.floor(i/5));
export function validateOpening(b,w){
 for(const m of [b,w])if(!Number.isInteger(m)||m<0||m>=2**25||m.toString(2).replace(/0/g,'').length!==4)throw Error('Invalid four-stone opening');
 if(b&w)throw Error('Overlapping opening');
 if(SQUARE_MASKS.includes(b)||SQUARE_MASKS.includes(w))throw Error('Initial square');
}
export function legalMoves(board){
 const moves=[];
 for(let i=0;i<25;i++)if(board.is_my_stone(pos(i)))for(let j=0;j<25;j++)if(board.is_available_move(pos(i),pos(j)))moves.push(new Move(pos(i),pos(j)));
 return moves;
}
function hasWinningMove(board){return legalMoves(board).some(m=>{const b=board.clone_js(),side=b.turn;b.do_move(m);return b.is_square(side);});}
// Conservative interpretation of the original prohibited-return loss: the forbidden
// reversal would avoid every immediate square, but no legal response can do so.
export function prohibitedReturnLoss(board){
 const side=board.turn,prev=board.last_move(side);
 if(prev===Move.none())return false;
 const reverse=new Move(prev.to,prev.from),relaxed=board.clone_js();
 if(side===0)relaxed.last_move_b=Move.none();else relaxed.last_move_w=Move.none();
 if(!relaxed.is_available_move(reverse.from,reverse.to))return false;
 const opponent=board.clone_js();opponent.turn^=1;
 if(!hasWinningMove(opponent))return false;
 const saves=(b,m)=>{const c=b.clone_js();c.do_move(m);return c.is_square(side)||!hasWinningMove(c);};
 return saves(relaxed,reverse)&&!legalMoves(board).some(m=>saves(board,m));
}
export function outcome(board,ply,maxPly=STADIUM_MAXPLY){
 if(board.is_square(0))return {reason:'square',winner:0};
 if(board.is_square(1))return {reason:'square',winner:1};
 if(prohibitedReturnLoss(board))return {reason:'prohibited_return',winner:board.turn^1};
 if(ply>=maxPly)return {reason:'maxPly',winner:null};
 if(!legalMoves(board).length)return {reason:'noMove',winner:null};
 return {reason:'playing',winner:null};
}
export const finished=g=>['square','prohibited_return','resignation'].includes(g.reason);
export function matchHeader(startedAt,endedAt,extra={}){
 return {site:'Quadivex',...extra,...(startedAt?{date:startedAt.slice(0,10),startedAt}:{}),...(endedAt?{endedAt}:{})};
}
// Controls are captured at start; export always uses the complete authoritative game.
export class MatchSession {
 constructor(opening,side,engine){this.opening=opening;this.side=side;this.engine=engine;const b=new Board();b.reset_with(opening.b,opening.w);this.history=[b];this.cursor=0;this.startedAt=null;this.endedAt=null;this.reason='playing';this.winner=null;}
 get active(){return this.startedAt!==null&&this.reason==='playing';}
 get board(){return this.history.at(-1);}
 get display(){return this.history[this.cursor];}
 start(){if(this.startedAt)throw Error('Already started');this.startedAt=new Date().toISOString();this.check();}
 end(reason,winner=null){this.reason=reason;this.winner=winner;this.endedAt=new Date().toISOString();}
 check(){const r=outcome(this.board,this.history.length-1);if(r.reason!=='playing')this.end(r.reason,r.winner);}
 apply(m){if(!this.active||this.cursor!==this.history.length-1)throw Error('Not at live position');const b=this.board.clone_js();b.do_move(m);this.history.push(b);this.cursor=this.history.length-1;this.check();}
 exportGame(){return {snapshots:this.history,ply:this.history.length-1,startingColor:'B',stoneOrders:this.opening.orders,reason:this.reason,winner:this.winner};}
}
