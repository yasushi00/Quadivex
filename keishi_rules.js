/** Standalone rules for the 5x5 Keishi board. No dependency on original Rust module. */
const FULL = (1 << 25) - 1;
const index = (p) => p.y * 5 + p.x;
const pos = (i) => new Position(i % 5, Math.floor(i / 5));
const adjacent = (a,b) => a !== b && Math.abs(a % 5 - b % 5) <= 1 && Math.abs(Math.floor(a/5) - Math.floor(b/5)) <= 1;
const SQUARES = (() => {
 const out = new Set();
 for(let a=0;a<25;a++) for(let b=a+1;b<25;b++) {
  const x=a%5,y=Math.floor(a/5),dx=b%5-x,dy=Math.floor(b/5)-y;
  for(const sign of [-1,1]) {
   const vx=sign*-dy,vy=sign*dx;
   const c=[x+vx,y+vy],d=[x+dx+vx,y+dy+vy];
   if([...c,...d].some(v=>v<0||v>4))continue;
   out.add((1<<a)|(1<<b)|(1<<(c[1]*5+c[0]))|(1<<(d[1]*5+d[0])));
  }
 }
 return [...out];
})();
if(SQUARES.length!==50)throw Error(`Expected 50 squares, found ${SQUARES.length}`);
export class Position {
 constructor(x,y) {this.x=x;this.y=y;}
 static none() {return NONE_POSITION;}
}
const NONE_POSITION = new Position(-1,-1);
export class Move {
 constructor(from,to) {this.from=from;this.to=to;}
 static none() {return NONE_MOVE;}
 static from_u32(v) {if(v===0xffffffff||v<0)return NONE_MOVE;return new Move(pos(Math.floor(v/25)),pos(v%25));}
 to_u32() {return this===NONE_MOVE ? 0xffffffff : index(this.from)*25+index(this.to);}
}
const NONE_MOVE = new Move(NONE_POSITION,NONE_POSITION);
export class Board {
 constructor() {this.reset();}
 reset() {this.black_stones=0;this.white_stones=0;this.turn=0;this.last_move_b=NONE_MOVE;this.last_move_w=NONE_MOVE;}
 reset_with(black,white) {this.reset();this.black_stones=black>>>0;this.white_stones=white>>>0;if((this.black_stones&this.white_stones)!==0)throw Error('Overlapping stones');}
 clone_js() {const b=new Board();b.black_stones=this.black_stones;b.white_stones=this.white_stones;b.turn=this.turn;b.last_move_b=this.last_move_b;b.last_move_w=this.last_move_w;return b;}
 get_stone(x,y) {if(x<0||y<0||x>=5||y>=5)return -1;let bit=1<<(y*5+x);return (this.black_stones&bit)?0:(this.white_stones&bit)?1:-1;}
 set_stone(x,y,owner) {this.clear_stone(x,y);if(owner===0)this.black_stones|=1<<(y*5+x);else if(owner===1)this.white_stones|=1<<(y*5+x);}
 clear_stone(x,y) {let bit=~(1<<(y*5+x));this.black_stones&=bit;this.white_stones&=bit;}
 is_no_stone(p) {return this.get_stone(p.x,p.y)<0;}
 is_my_stone(p) {return this.get_stone(p.x,p.y)===this.turn;}
 last_move(player) {return player===0?this.last_move_b:this.last_move_w;}
 is_available_move(from,to) {
  const f=index(from),t=index(to);
  if(from.x<0||from.x>=5||from.y<0||from.y>=5||to.x<0||to.x>=5||to.y<0||to.y>=5)return false;
  if(!adjacent(f,t)||!this.is_my_stone(from)||!this.is_no_stone(to))return false;
  const prev=this.last_move(this.turn);
  return prev===NONE_MOVE || !(index(prev.to)===f && index(prev.from)===t);
 }
 do_move(m) {if(!this.is_available_move(m.from,m.to))throw Error(`Illegal move ${m.to_u32()}`);
  const f=1<<index(m.from),t=1<<index(m.to);
  if(this.turn===0){this.black_stones=((this.black_stones^f)|t)>>>0;this.last_move_b=m;}
  else {this.white_stones=((this.white_stones^f)|t)>>>0;this.last_move_w=m;}
  this.turn^=1;
 }
 is_square(player) {let mask=player===0?this.black_stones:this.white_stones;return SQUARES.includes(mask);}
}
export class DaiPunch {
 constructor() {this.reset();}
 reset() {this.positions=new Board();}
 check(board) {
  this.reset();
  const occupied=board.black_stones|board.white_stones;
  for(let side=0;side<2;side++) {
   const mine=side===0?board.black_stones:board.white_stones;
   const opp=side===0?board.white_stones:board.black_stones;
   for(const square of SQUARES) {
    if(square&opp)continue;
    const held=square&mine;
    if(popcount(held)!==3)continue;
    const missing=square&~occupied;
    if(popcount(missing)!==1)continue;
    const excluded=mine&~held;
    if(popcount(excluded)!==1)continue;
    const from=Math.log2(excluded),to=Math.log2(missing);
    const previous=board.last_move(side);
    if(adjacent(from,to)&&(previous===NONE_MOVE||index(previous.to)!==from||index(previous.from)!==to)) {
     if(side===0)this.positions.black_stones|=missing;
     else this.positions.white_stones|=missing;
    }
   }
  }
 }
 get_stone(x,y) {return this.positions.get_stone(x,y);}
}
function popcount(x) {let n=0;while(x){x&=x-1;n++;}return n;}
export const SQUARE_MASKS = SQUARES;
