/** Independent Quadivex interface. */
import {Move} from './keishi_rules.js';
import {generateRandomOpening} from './random_position.js';
import {downloadKifuCsv} from './kifu_export.js';
import {exportKjf,downloadKjf} from './kjf_export.js';
import {MatchSession,matchHeader} from './game_state.js';
import {parseOpenings} from './opening_csv.js';
import {mountCanvasBoard} from './board_canvas.js';
const $=id=>document.getElementById(id);
let worker,openingData=[],opening,session,selected=null;
const renderBoard=mountCanvasBoard($('board'),$('board-grid'),activateCell);
const fallback=()=>{const r=generateRandomOpening();return {b:r.board.black_stones,w:r.board.white_stones,orders:r.stoneOrders};};
const notice=s=>$('notice').textContent=s;
function stopWorker(){
 const stoppedWorker=worker;
 worker=null;
 stoppedWorker?.terminate();
}
async function loadOpenings(){try{const res=await fetch('./InitialPosition.csv',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);openingData=parseOpenings(await res.text(),{expected:96,strict:true});openingData.forEach((_,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`WebKC 96番勝負 ${i+1}番`;$('opening').append(opt);});$('opening').value='0';}catch(e){notice('同梱の96初期配置を読み込めませんでした。ランダム初期配置で対局できます。');}}
function preview(regenerate=false){stopWorker();if(regenerate||!opening){const idx=$('opening').value;opening=idx==='random'?fallback():openingData[Number(idx)]??fallback();}session=new MatchSession(opening,Number($('side').value),$('engine').value);selected=null;render();}
const canPlay=()=>session?.canApply&&!worker&&session.display.turn===session.side;
function render(){const b=session.display,own=session.side;
 const r=session.atLatest?session.reason:'playing';
 renderBoard(b,canPlay()?selected:null,r==='square'?session.winner:null);
 const who=session.winner===own?'あなた':'CPU';
 const status=!session.startedAt?'対局前':r==='square'?`${who}の勝ち`:r==='prohibited_return'?`${who}の勝ち（禁手負け）`:r==='resignation'?`${who}の勝ち（投了）`:r==='maxPly'?'1,000手上限：対局中断':r==='noMove'||r==='interrupted'?'対局中断':worker?'CPU思考中':b.turn===own?'あなたの番':session.atLatest?'CPUの番（停止中）':'CPUの番';
 const message=`${session.cursor}/${session.history.length-1}手目 / ${status}${session.atLatest?'':'（履歴表示中・棋譜は全手保存）'}`;
 if($('status').textContent!==message)$('status').textContent=message;
 for(const id of ['engine','side','opening','start'])$(id).disabled=session.canApply;
 $('refresh').disabled=session.canApply||$('opening').value!=='random';$('back').disabled=!session.cursor;$('next').disabled=session.atLatest;$('resign').disabled=!session.active||!session.atLatest;$('saveCsv').disabled=!session.startedAt;$('saveKjf').disabled=!session.startedAt;
}
function afterMove(){
 selected=null;
 if(session.active&&session.board.turn!==session.side){
  requestAi();
  return;
 }
 if(session.reason==='maxPly')notice('警告：1,000手に達したため中断しました（引き分けではありません）。');
 render();
}
function activateCell(pos){
 if(!canPlay())return;
 const board=session.display;
 if(board.is_my_stone(pos)){
  selected=selected?.x===pos.x&&selected.y===pos.y?null:pos;
  render();
 }else if(selected&&board.is_available_move(selected,pos)){
  const branching=!session.atLatest;
  session.apply(new Move(selected,pos));
  if(branching)notice('');
  afterMove();
 }
}
function requestAi(){
 if(worker||!session.active||!session.atLatest||session.board.turn===session.side)return;
 const w=new Worker('./worker.js',{type:'module'});
 worker=w;
 const interrupt=message=>{
  session.end('interrupted');
  notice(message);
  render();
 };
 w.onmessage=({data})=>{
  if(worker!==w)return;
  stopWorker();
  if(data.status!=='ok'){
   interrupt('AI error: '+data.error);
   return;
  }
  const m=Move.from_u32(data.result);
  if(!session.board.is_available_move(m.from,m.to)){
   interrupt('AI illegal move');
   return;
  }
  session.apply(m);
  afterMove();
 };
 w.onerror=e=>{
  if(worker!==w)return;
  stopWorker();
  interrupt('AI error: '+e.message);
 };
 const b=session.board,unpack=m=>m===Move.none()?0xffffffff:m.to_u32();
 w.postMessage({command:'getNextMove',engine:session.engine.startsWith('QZ')?'QZ':'QDX',level:7+Number(session.engine.at(-1)),board_obj:{black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,last_move_b:unpack(b.last_move_b),last_move_w:unpack(b.last_move_w)}});
 render();
}
$('start').onclick=()=>{preview();notice('');session.start();afterMove();};
$('refresh').onclick=()=>preview(true);$('opening').onchange=()=>preview(true);$('side').onchange=()=>preview();$('engine').onchange=()=>preview();
$('back').onclick=()=>{if(session.cursor>0){stopWorker();session.back();selected=null;render();}};
$('next').onclick=()=>{if(!session.atLatest){session.next();selected=null;render();}};
$('resign').onclick=()=>{if(session.active&&session.atLatest){stopWorker();session.end('resignation',session.side^1);render();}};
const names=()=>({blackName:session.side===0?'Human':session.engine,whiteName:session.side===1?'Human':session.engine});
$('saveCsv').onclick=()=>{try{const g=session.exportGame();if(g.reason!=='square'&&g.reason!=='playing')notice('CSVには終局理由・勝敗を保存できません。完全な記録はKJFを保存してください。');downloadKifuCsv(g.snapshots,g.ply,`keishiscore_${Date.now()}.csv`,{...names(),stoneOrders:g.stoneOrders,winner:g.reason==='square'?g.winner:null});}catch(e){notice(String(e));}};
$('saveKjf').onclick=()=>{try{const player={name:session.engine,type:'engine',engine:{version:'1.0.1',level:7+Number(session.engine.at(-1)),parameters:{engineId:session.engine}}},human={name:'Human',type:'human'};const players=session.side===0?{p1:human,p2:player}:{p1:player,p2:human};const doc=exportKjf({first:session.exportGame(),players,matchType:'single',header:matchHeader(session.startedAt,session.endedAt,{event:'Quadivex Web match'})});downloadKjf(doc,`keishi_${Date.now()}.kjf.json`);}catch(e){notice(String(e));}};
await loadOpenings();
preview(true);
