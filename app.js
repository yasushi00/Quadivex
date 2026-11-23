/** Independent Quadivex interface. */
import {Move,Position} from './keishi_rules.js';
import {generateRandomOpening} from './random_position.js';
import {downloadKifuCsv} from './kifu_export.js';
import {exportKjf,downloadKjf} from './kjf_export.js';
import {MatchSession,matchHeader} from './game_state.js';
import {parseOpenings} from './opening_csv.js';
const $=id=>document.getElementById(id),boardEl=$('board');
let worker,openingData=[],opening,session,busy=false,selected=null;
const fallback=()=>{const r=generateRandomOpening();return {b:r.board.black_stones,w:r.board.white_stones,orders:r.stoneOrders};};
const notice=s=>$('notice').textContent=s;
function stopWorker(){worker?.terminate();worker=null;busy=false;}
async function loadOpenings(){try{const res=await fetch('./InitialPosition.csv',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);openingData=parseOpenings(await res.text(),{expected:96,strict:true});openingData.forEach((_,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=`WebKC 96番勝負 ${i+1}番`;$('opening').append(opt);});$('opening').value='0';}catch(e){notice('同梱の96初期配置を読み込めませんでした。ランダム初期配置で対局できます。');}}
function preview(regenerate=false){stopWorker();if(regenerate||!opening){const idx=$('opening').value;opening=idx==='random'?fallback():openingData[Number(idx)]??fallback();}session=new MatchSession(opening,Number($('side').value),$('engine').value);selected=null;render();}
const pos=i=>new Position(i%5,Math.floor(i/5));
const live=()=>session.cursor===session.history.length-1;
function render(){const b=session.display,own=session.side,canPlay=session.active&&live()&&!busy&&b.turn===own;boardEl.replaceChildren();for(let i=0;i<25;i++){const v=b.get_stone(i%5,Math.floor(i/5)),e=document.createElement('button');e.type='button';e.textContent=v===0?'●':v===1?'○':'';e.ariaLabel=`${i%5+1},${Math.floor(i/5)+1} ${v===0?'黒':v===1?'白':'空'}`;if(selected===i)e.classList.add('sel');if(canPlay&&selected!==null&&b.is_available_move(pos(selected),pos(i)))e.classList.add('target');if(live()&&session.reason==='square'&&session.winner===v)e.classList.add('win');e.onclick=()=>click(i);boardEl.append(e);}
 const r=session.reason,who=session.winner===own?'あなた':'CPU';const status=!session.startedAt?'対局前':r==='square'?`${who}の勝ち`:r==='prohibited_return'?`${who}の勝ち（禁手負け）`:r==='resignation'?`${who}の勝ち（投了）`:r==='maxPly'?'1,000手上限：対局中断':r==='noMove'||r==='interrupted'?'対局中断':busy?'CPU思考中':b.turn===own?'あなたの番':'CPUの番';
 $('status').textContent=`${session.cursor}/${session.history.length-1}手目 / ${status}${live()?'':'（履歴表示中・棋譜は全手保存）'}`;
 for(const id of ['engine','side','opening','refresh','start'])$(id).disabled=session.active;
 $('refresh').disabled=session.active||$('opening').value!=='random';$('back').disabled=!session.cursor;$('next').disabled=live();$('resign').disabled=!session.active;$('saveCsv').disabled=!session.startedAt;$('saveKjf').disabled=!session.startedAt;
}
function afterMove(){selected=null;if(!session.active){stopWorker();if(session.reason==='maxPly')notice('警告：1,000手に達したため中断しました（引き分けではありません）。');}render();if(session.active&&live()&&session.board.turn!==session.side)requestAi();}
function click(i){if(!session.active||!live()||busy||session.board.turn!==session.side)return;const b=session.board,p=pos(i);if(b.is_my_stone(p)){selected=selected===i?null:i;render();return;}if(selected!==null&&b.is_available_move(pos(selected),p)){session.apply(new Move(pos(selected),p));afterMove();}}
function requestAi(){if(busy||!session.active||!live()||session.board.turn===session.side)return;busy=true;const w=new Worker('./worker.js',{type:'module'});worker=w;w.onmessage=({data})=>{if(worker!==w||!session.active||!busy)return;stopWorker();if(data.status!=='ok'){session.end('interrupted');notice('AI error: '+data.error);render();return;}const m=Move.from_u32(data.result);if(!session.board.is_available_move(m.from,m.to)){session.end('interrupted');notice('AI illegal move');render();return;}session.apply(m);afterMove();};w.onerror=e=>{if(worker!==w)return;stopWorker();session.end('interrupted');notice('AI error: '+e.message);render();};const b=session.board,unpack=m=>m===Move.none()?0xffffffff:m.to_u32();w.postMessage({command:'getNextMove',engine:session.engine.startsWith('QZ')?'QZ':'QDX',level:7+Number(session.engine.at(-1)),board_obj:{black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,last_move_b:unpack(b.last_move_b),last_move_w:unpack(b.last_move_w)}});render();}
$('start').onclick=()=>{preview();notice('');session.start();afterMove();};
$('refresh').onclick=()=>preview(true);$('opening').onchange=()=>preview(true);$('side').onchange=()=>preview();$('engine').onchange=()=>preview();
$('back').onclick=()=>{if(session.cursor>0){stopWorker();session.cursor--;selected=null;render();}};
$('next').onclick=()=>{if(!live()){session.cursor++;selected=null;render();if(live())requestAi();}};
$('resign').onclick=()=>{if(session.active){stopWorker();session.end('resignation',session.side^1);render();}};
const names=()=>({blackName:session.side===0?'Human':session.engine,whiteName:session.side===1?'Human':session.engine});
$('saveCsv').onclick=()=>{try{const g=session.exportGame();if(g.reason!=='square'&&g.reason!=='playing')notice('CSVには終局理由・勝敗を保存できません。完全な記録はKJFを保存してください。');downloadKifuCsv(g.snapshots,g.ply,`keishiscore_${Date.now()}.csv`,{...names(),stoneOrders:g.stoneOrders,winner:g.reason==='square'?g.winner:null});}catch(e){notice(String(e));}};
$('saveKjf').onclick=()=>{try{const player={name:session.engine,type:'engine',engine:{version:'1.0.1',level:7+Number(session.engine.at(-1)),parameters:{engineId:session.engine}}},human={name:'Human',type:'human'};const players=session.side===0?{p1:human,p2:player}:{p1:player,p2:human};const doc=exportKjf({first:session.exportGame(),players,matchType:'single',header:matchHeader(session.startedAt,session.endedAt,{event:'Quadivex Web match'})});downloadKjf(doc,`keishi_${Date.now()}.kjf.json`);}catch(e){notice(String(e));}};
await loadOpenings();
preview(true);
