/*
 * Keishi stronger engine, C11, no dependencies / independent WASM module.
 * Four stones per side on 5x5. Unrestricted movement to an adjacent empty
 * square except immediate reversal of that player's previous move.
 * The original WebKC Rust module is NOT modified or linked into this engine.
 * Compile with clang --target=wasm32 -O3 -nostdlib ...
 */
#include <stdint.h>
#ifdef __wasm__
__attribute__((import_module("env"), import_name("now"))) extern double clock_now(void);
#else
#include <time.h>
static double clock_now(void) {return 1000.0*(double)clock()/CLOCKS_PER_SEC;}
#endif
#define TT_BITS 18
#define TT_SIZE (1u<<TT_BITS)
#define MAX_PLY 120
#define INF 1000200
#define MATE 1000000
#define MATEBOUND 900000
#define WINFLAG 0
#define LOWFLAG 1
#define UPFLAG 2
#define ALLMASK ((1u<<25)-1u)

typedef struct {uint64_t hash; int32_t value; uint16_t move; int8_t depth,flag;} TT;
typedef struct {uint16_t m;int32_t rank;} Scored;
typedef struct {uint64_t key; int16_t last;} Undo;
static TT tt[TT_SIZE];
static uint32_t squares[50];
static int square_count=0;
static uint8_t near[25][8],near_count[25],adj[25][25];
static uint32_t BIT[25];
static uint64_t zob[2][25],zlast[2][626],zturn;
static int32_t hist[2][625];
static uint16_t killer[2][MAX_PLY];
static int setup_done=0;
static uint32_t black,white;
static int turn,lastMove[2];
static uint64_t hash;
static uint32_t nodes,tt_hits;
static uint32_t node_limit;
static double deadline,search_start;
static int cutoff, finished_depth,finished_score;
static int value_trace;

static inline int pop32(uint32_t a){return __builtin_popcount(a);}
static inline int firstbit(uint32_t a){return __builtin_ctz(a);}
static uint64_t random64(void){
 static uint64_t x=0xD838A2A3ED3E457BULL;
 x^=x<<13;x^=x>>7;x^=x<<17;return x;
}
static void init_data(void){
 if(setup_done)return;
 for(int i=0;i<25;i++)BIT[i]=1u<<i;
 for(int i=0;i<25;i++)for(int j=0;j<25;j++){
  int x=i%5,y=i/5, xx=j%5,yy=j/5;
  if(i==j)continue;
  if(xx>=x-1&&xx<=x+1&&yy>=y-1&&yy<=y+1){
   near[i][near_count[i]++]=(uint8_t)j;
   adj[i][j]=1;
  }
 }
 for(int a=0;a<25;a++)for(int b=a+1;b<25;b++){
  int x=a%5,y=a/5,dx=b%5-x,dy=b/5-y;
  for(int sign=-1;sign<=1;sign+=2){
   int vx=sign*(-dy),vy=sign*dx;
   int xx=x+vx,yy=y+vy,xb=x+dx+vx,yb=y+dy+vy;
   if(xx<0||xx>=5||yy<0||yy>=5||xb<0||xb>=5||yb<0||yb>=5)continue;
   uint32_t mask=BIT[a]|BIT[b]|BIT[xx+yy*5]|BIT[xb+yb*5];
   int seen=0;for(int k=0;k<square_count;k++)if(squares[k]==mask){seen=1;break;}
   if(!seen&&square_count<50)squares[square_count++]=mask;
  }
 }
 for(int p=0;p<2;p++){
  for(int i=0;i<25;i++)zob[p][i]=random64();
  for(int i=0;i<626;i++)zlast[p][i]=random64();
 }
 zturn=random64();
 setup_done=1;
}
static inline uint32_t mine(int p){return p==0?black:white;}
static inline uint32_t opponent(int p){return p==0?white:black;}
static inline int square(uint32_t m){for(int i=0;i<square_count;i++)if(squares[i]==m)return 1;return 0;}
static void setup(uint32_t b,uint32_t w,int side,int lb,int lw){
 init_data();black=b&ALLMASK;white=w&ALLMASK;turn=side&1;
 lastMove[0]=(lb>=0&&lb<625)?lb:-1;
 lastMove[1]=(lw>=0&&lw<625)?lw:-1;
 hash=0;uint32_t t=black;
 while(t){int p=firstbit(t);t&=t-1;hash^=zob[0][p];}
 t=white;while(t){int p=firstbit(t);t&=t-1;hash^=zob[1][p];}
 hash^=zlast[0][lastMove[0]+1]^zlast[1][lastMove[1]+1];
 if(turn)hash^=zturn;
}
static inline int do_move(int mv, Undo *undo){
 int f=mv/25,t=mv%25,side=turn;
 undo->key=hash;undo->last=lastMove[side];
 if(side==0)black=(black^BIT[f])|BIT[t];
 else white=(white^BIT[f])|BIT[t];
 hash^=zob[side][f]^zob[side][t];
 hash^=zlast[side][lastMove[side]+1]^zlast[side][mv+1]^zturn;
 lastMove[side]=mv;turn^=1;
 return square(mine(side));
}
static inline void undo_move(int mv, const Undo *undo){
 turn^=1;int side=turn,f=mv/25,t=mv%25;
 if(side==0)black=(black^BIT[t])|BIT[f];
 else white=(white^BIT[t])|BIT[f];
 lastMove[side]=undo->last;hash=undo->key;
}
static int legal_moves(int moves[32]){
 int n=0,p=turn;
 uint32_t m=mine(p),occupied=black|white;
 int last=lastMove[p],badFrom=last>=0?last%25:-1,badTo=last>=0?last/25:-1;
 while(m){
  int f=firstbit(m);m&=m-1;
  for(int i=0;i<near_count[f];i++){
   int to=near[f][i];
   if(occupied&BIT[to])continue;
   if(f==badFrom&&to==badTo)continue;
   moves[n++]=f*25+to;
  }
 }
 return n;
}
static int winning_move(int p){
 uint32_t my=mine(p),opp=opponent(p);
 int last=lastMove[p],badFrom=last>=0?last%25:-1,badTo=last>=0?last/25:-1;
 for(int i=0;i<square_count;i++){
  uint32_t s=squares[i];if(s&opp)continue;
  uint32_t have=s&my;if(pop32(have)!=3)continue;
  uint32_t missing=s^have, piece=my^have;
  if((missing&(opp|my))||pop32(piece)!=1)continue;
  int f=firstbit(piece),t=firstbit(missing);
  if(adj[f][t]&&!(f==badFrom&&t==badTo))return f*25+t;
 }
 return -1;
}
static const int16_t weight[5]={0,1,12,115,0};
static int evaluation(void){
 int score[2]={0,0},n3[2]={0,0};
 for(int i=0;i<square_count;i++){
  uint32_t s=squares[i];
  int b=pop32(s&black),w=pop32(s&white);
  if(!w){score[0]+=weight[b];n3[0]+=(b==3);}
  if(!b){score[1]+=weight[w];n3[1]+=(w==3);}
 }
 score[0]+=(n3[0]>3?3:n3[0])*18;
 score[1]+=(n3[1]>3?3:n3[1])*18;
 if(winning_move(0)>=0)score[0]+=2200;
 if(winning_move(1)>=0)score[1]+=2200;
 return score[turn]-score[turn^1];
}
static int rank_move(int mv,int ttmove,int ply){
 if(mv==ttmove)return 200000000;
 if(mv==killer[0][ply])return 1200000;
 if(mv==killer[1][ply])return 900000;
 int f=mv/25,to=mv%25,side=turn;
 uint32_t my=mine(side),opp=opponent(side),next=(my^BIT[f])|BIT[to];
 if(square(next))return 100000000;
 int score=hist[side][mv];
 for(int i=0;i<square_count;i++){
  uint32_t s=squares[i];
  if(!(s&opp)){
   int n=pop32(next&s),p=pop32(my&s);
   score+=(weight[n]-weight[p])*10;
  } else if(pop32(s&opp)==3 && !(s&my) && (s&BIT[to]))score+=450;
 }
 return score;
}
static void sort_moves(Scored *a,int count){
 for(int i=1;i<count;i++){
  Scored v=a[i];int j=i;
  while(j>0&&a[j-1].rank<v.rank){a[j]=a[j-1];j--;}
  a[j]=v;
 }
}
static inline int should_stop(void){
 /* Enforce an exact search-node ceiling for reproducible fixed-node runs.
  * The wall-clock check is deliberately less frequent, as in v1.5.4.
  * deadline <= 0 disables the wall-clock cutoff. */
 if(nodes>=node_limit){cutoff=1;return 1;}
 if(deadline>0 && (nodes&2047u)==0u && clock_now()>=deadline){
  cutoff=1;return 1;
 }
 return 0;
}
/* One-ply threat evasion at the horizon. If the opponent has a legal
 * immediate win, search every legal defensive move. Return a forced mate
 * only when no defense removes the immediate threat. */
static int threat_leaf(int ply){
 int oppwin=winning_move(turn^1);
 if(oppwin<0)return evaluation();
 int moves[32],count=legal_moves(moves),best=-INF,defenses=0;
 for(int i=0;i<count;i++){
  Undo u;int mv=moves[i],win=do_move(mv,&u);
  if(win){undo_move(mv,&u);return MATE-ply-1;}
  int threatened=winning_move(turn)>=0;
  if(!threatened){
   defenses++;
   int v=-evaluation();
   if(v>best)best=v;
  }
  undo_move(mv,&u);
 }
 if(!defenses)return -MATE+ply+2;
 return best;
}
static int search(int depth,int alpha,int beta,int ply){
 nodes++;if(should_stop())return 0;
 int direct=winning_move(turn);
 if(direct>=0)return MATE-ply-1;
 if(depth<=0||ply>=MAX_PLY-1)return threat_leaf(ply);
 uint32_t slot=(uint32_t)(hash^(hash>>32))&(TT_SIZE-1);
 TT *entry=&tt[slot];int ttmove=-1;
 int original=alpha;
 if(entry->hash==hash){
  ttmove=entry->move;
  if(entry->depth>=depth){
   tt_hits++;
   int v=entry->value;
   if(v>MATEBOUND)v-=ply;
   if(v< -MATEBOUND)v+=ply;
   if(entry->flag==WINFLAG)return v;
   if(entry->flag==LOWFLAG&&v>=beta)return v;
   if(entry->flag==UPFLAG&&v<=alpha)return v;
  }
 }
 int moves[32],cnt=legal_moves(moves);
 if(!cnt)return -MATE+ply;
 Scored list[32];for(int i=0;i<cnt;i++)list[i]=(Scored){(uint16_t)moves[i],rank_move(moves[i],ttmove,ply)};
 sort_moves(list,cnt);
 int best=-INF,bestmove=list[0].m;
 for(int k=0;k<cnt;k++){
  int mv=list[k].m;
  Undo u;int win=do_move(mv,&u),v;
  if(win)v=MATE-ply-1;
  else if(k==0)v=-search(depth-1,-beta,-alpha,ply+1);
  else{
   v=-search(depth-1,-alpha-1,-alpha,ply+1);
   if(!cutoff&&v>alpha&&v<beta)v=-search(depth-1,-beta,-alpha,ply+1);
  }
  undo_move(mv,&u);
  if(cutoff)return 0;
  if(v>best){best=v;bestmove=mv;}
  if(v>alpha)alpha=v;
  if(alpha>=beta){
   int32_t add=depth*depth;
   hist[turn][mv]+=add;
   if(hist[turn][mv]>1000000)for(int i=0;i<625;i++)hist[turn][i]/=2;
   if(killer[0][ply]!=mv){killer[1][ply]=killer[0][ply];killer[0][ply]=mv;}
   break;
  }
 }
 int oldDepth=entry->depth;
 if(entry->hash==hash || oldDepth<=depth || ((nodes&7)==0)){
  int value=best;
  if(value>MATEBOUND)value+=ply;
  if(value< -MATEBOUND)value-=ply;
  *entry=(TT){hash,value,(uint16_t)bestmove,(int8_t)depth,
     (int8_t)(best<=original?UPFLAG:best>=beta?LOWFLAG:WINFLAG)};
 }
 return best;
}
static int root(int depth,int previous,int *resultScore){
 int moves[32],cnt=legal_moves(moves);
 if(!cnt){*resultScore=-MATE;return -1;}
 Scored list[32];for(int i=0;i<cnt;i++)list[i]=(Scored){(uint16_t)moves[i],rank_move(moves[i],previous,0)};
 sort_moves(list,cnt);
 int alpha=-INF,beta=INF,best=-INF,bestmove=list[0].m;
 for(int i=0;i<cnt;i++){
  int mv=list[i].m;Undo u;
  int win=do_move(mv,&u),v;
  if(win)v=MATE-1;
  else if(i==0)v=-search(depth-1,-beta,-alpha,1);
  else{
    v=-search(depth-1,-alpha-1,-alpha,1);
    if(!cutoff&&v>alpha&&v<beta)v=-search(depth-1,-beta,-alpha,1);
  }
  undo_move(mv,&u);
  if(cutoff)return -1;
  if(v>best){best=v;bestmove=mv;}
  if(v>alpha)alpha=v;
 }
 *resultScore=best;
 return bestmove;
}
#ifdef __wasm__
#define API __attribute__((visibility("default")))
#else
#define API
#endif
/* QDX-only CLI evaluation entry point.
 * ms > 0 : explicit wall-clock limit in milliseconds
 * ms == 0: default per-level wall-clock limit (as before)
 * ms < 0 : no wall-clock limit (for reproducible NODES/DEPTH runs)
 * max_nodes==0 : default safety limit of 15 million nodes
 * max_depth==0 : default depth by QDX level (12/18/30)
 * A searched depth is committed only after its whole iteration completes.
 */
API int keishi_search_limited(uint32_t b,uint32_t w,int side,int lb,int lw,
                              int level,double ms,uint32_t max_nodes,int max_depth){
 setup(b,w,side,lb,lw);
 int budgetDepth=level==8?12:level==9?18:30;
 if(level<8)budgetDepth=10;
 if(level>10)budgetDepth=30;
 if(max_depth>0){
  budgetDepth=max_depth>MAX_PLY-1?MAX_PLY-1:max_depth;
 }
 node_limit=max_nodes>0?max_nodes:15000000u;
 if(ms<0){
  deadline=0;
 } else {
  double limit=ms>0?ms:level==8?450:level==9?1600:4500;
  if(limit>30000)limit=30000;
  search_start=clock_now();deadline=search_start+limit;
 }
 nodes=0;tt_hits=0;cutoff=0;finished_depth=0;finished_score=0;
 int mv[32],n=legal_moves(mv);
 if(n==0)return -1;
 int wm=winning_move(turn);
 if(wm>=0){finished_depth=1;finished_score=MATE-1;return wm;}
 int best=mv[0];
 for(int depth=1;depth<=budgetDepth;depth++){
  int score=0,next=root(depth,best,&score);
  if(cutoff||next<0)break;
  best=next;finished_score=score;finished_depth=depth;
  if(score>=MATEBOUND || score<=-MATEBOUND)break;
 }
 return best;
}
/* Stable interface used by the browser (unchanged). */
API int keishi_search(uint32_t b,uint32_t w,int side,int lb,int lw,int level,double ms){
 return keishi_search_limited(b,w,side,lb,lw,level,ms,0,0);
}
API int keishi_nodes(void){return (int)nodes;}
API int keishi_depth(void){return finished_depth;}
API int keishi_score(void){return finished_score;}
API int keishi_tt_hits(void){return (int)tt_hits;}
API int keishi_square_count(void){init_data();return square_count;}
API int keishi_legal(uint32_t b,uint32_t w,int side,int lb,int lw,int mv){
 setup(b,w,side,lb,lw);int moves[32],n=legal_moves(moves);
 for(int i=0;i<n;i++)if(moves[i]==mv)return 1;
 return 0;
}
