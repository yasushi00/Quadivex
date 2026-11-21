/** Official paired match: A=QZ1 B=RUST7 STARTS=96 NODES=1000000 npm run test:match
 * The original Rust7 is CLI-only. Stadium leg 2 swaps initial masks, White starts.
 * WIN = actual square victory; cutoffs are KJF/summary only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Board,Move} from '../keishi_rules.js';
import {exportStadiumPairCsv,exportStadiumCsv} from '../kifu_export.js';
import {exportKjf} from '../kjf_export.js';
import {outcome,finished,matchHeader} from '../game_state.js';
import {parseOpenings} from '../opening_csv.js';
import {scorePair} from './pair_result.mjs';
import {readQdxLimits} from './qdx_limits.mjs';
import {parseEngine,createEngine} from './engine_registry.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const num=(key,d,min,max)=>{const n=Number(process.env[key]??d);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`${key}: expected integer ${min}..${max}`);return n;};
const specA=parseEngine((process.env.A??'QZ1').toUpperCase());
const specB=parseEngine((process.env.B??'RUST7').toUpperCase());
const mode=process.env.MODE??'benchmark';
if(!['stadium','benchmark'].includes(mode))throw Error('MODE must be stadium or benchmark');
const starts=num('STARTS',2,1,96),maxPly=mode==='stadium'?1000:num('MAXPLY',80,1,1000);
if(mode==='stadium'&&process.env.MAXPLY!==undefined)console.warn('MODE=stadium: MAXPLY ignored; using 1000');
const limits=readQdxLimits(100);
// Keep engine identity distinct in CSV even if matching identical level versus itself.
const nameA=`${specA.name} A`,nameB=`${specB.name} B`;
const output=path.resolve(process.env.OUTPUT_DIR??path.join(here,`results_${specA.id.toLowerCase()}_vs_${specB.id.toLowerCase()}`));
fs.mkdirSync(output,{recursive:true});
const positionCsv=path.resolve(process.env.POSITION_FILE??'InitialPosition.csv');
if (!fs.existsSync(positionCsv)) throw Error(`Initial positions not installed: ${positionCsv}. See README.md setup section.`);
const pool=parseOpenings(fs.readFileSync(positionCsv,'utf8'));
const orders=pool.map(p=>p.orders);
if(starts>pool.length)throw Error(`STARTS=${starts} exceeds ${pool.length} positions in ${positionCsv}`);
const a=await createEngine(specA),b=await createEngine(specB);
const last=m=>m===Move.none()?-1:m.to_u32();
const rows=[],pairs=[];
function play(p,order,secondLeg){
    const board=new Board();
    board.reset_with(secondLeg?p.w:p.b,secondLeg?p.b:p.w);
    if(secondLeg)board.turn=1;
    const snapshots=[board.clone_js()];
    const stoneOrders=secondLeg?{B:order.W,W:order.B}:order;
    const times={A:0,B:0};
    let {reason,winner}=outcome(board,0,maxPly);
    for(let ply=0;ply<maxPly&&reason==='playing';ply++){
        const state={black_stones:board.black_stones,white_stones:board.white_stones,turn:board.turn,
            lastB:last(board.last_move_b),lastW:last(board.last_move_w)};
        const isA=board.turn===0;
        const eng=isA?a:b;
        const t=performance.now();
        const result=eng.getNextMove(state,limits);
        times[isA?'A':'B']+=performance.now()-t;
        if(result.move<0){reason='noMove';break;}
        const m=Move.from_u32(result.move);
        if(!board.is_available_move(m.from,m.to))throw Error(`Illegal move by ${eng.spec.id}: ${result.move}, position=${p.number}, leg=${secondLeg?2:1} ply=${ply}`);
        const mover=board.turn;
        board.do_move(m);snapshots.push(board.clone_js());
        ({reason,winner}=outcome(board,snapshots.length-1,maxPly));
    }
    return {snapshots,blackName:nameA,whiteName:nameB,winner,reason,ply:snapshots.length-1,
        startingColor:secondLeg?'W':'B',stoneOrders,times};
}
try {
    for(let i=0;i<starts;i++){
        const startedAt=new Date().toISOString();
        const first=play({...pool[i],number:i+1},orders[i],false);
        const second=finished(first) ? play({...pool[i],number:i+1},orders[i],true) : null;
        const pair=second ? {position:i+1,...scorePair(first,second,nameA,nameB)} : {position:i+1,result:'unfinished',winner:null,firstWinner:null,secondWinner:null};
        pairs.push(pair);
        const filename=`keishiscore_${String(i+1).padStart(3,'0')}.csv`;
        fs.writeFileSync(path.join(output,filename),second?exportStadiumPairCsv(first,second):exportStadiumCsv(first.snapshots,{...first,winner:first.reason==='square'?first.winner:null}),'utf8');
        const kjf=exportKjf({first,second,matchType:'two-game',
          players:{
            p1:{name:nameA,type:'engine',engine:specA.family==='rust'?{level:7}:{version:'1.0.0',level:specA.level,parameters:{engineId:specA.id,budgetUnit:'ms',budgetMs:limits.budgetMs,nodeLimit:limits.nodeLimit||null,depthLimit:limits.depthLimit||null}}},
            p2:{name:nameB,type:'engine',engine:specB.family==='rust'?{level:7}:{version:'1.0.0',level:specB.level,parameters:{engineId:specB.id,budgetUnit:'ms',budgetMs:limits.budgetMs,nodeLimit:limits.nodeLimit||null,depthLimit:limits.depthLimit||null}}}},
          header:matchHeader(startedAt,second||!finished(first)?new Date().toISOString():undefined,{event:'Quadivex engine comparison',comment:`CLI, MODE=${mode}, Opening ${i+1}, MAXPLY=${maxPly}. maxPly/noMove records are interrupted, not draws.`})});
        fs.writeFileSync(path.join(output,`kjf_${String(i+1).padStart(3,'0')}.json`),JSON.stringify(kjf,null,2)+'\n','utf8');
        if(first.reason!=='square'||(second&&second.reason!=='square'))console.warn(`Opening ${i+1}: CSV is partial; see KJF for all results and legs.`);
        for(const [leg,g] of [[1,first],...(second?[[2,second]]:[])]){
            const winnerName=g.winner===null?null:g.winner===0?nameA:nameB;
            const row={position:i+1,leg,firstColor:leg===1?'black':'white',
                result:!finished(g)?'unfinished':winnerName===nameA?'A':'B',winner:winnerName,
                reason:g.reason,csvIncluded:leg===1||first.reason==='square',csvResultRecorded:(leg===1||first.reason==='square')&&g.reason==='square',plies:g.ply,engineAMs:Math.round(g.times.A),engineBMs:Math.round(g.times.B),filename};
            if(!finished(g))console.warn(`Opening ${i+1}, leg ${leg}: interrupted (${g.reason})`);
            rows.push(row);console.log(JSON.stringify(row));
        }
    }
    const count=x=>rows.filter(g=>g.result===x).length;
    const pc=x=>pairs.filter(p=>p.result===x).length;
    const summary={engineA:specA.id,engineB:specB.id,engineAName:nameA,engineBName:nameB,
        positions:starts,games:rows.length,engineAWins:count('A'),engineBWins:count('B'),unfinished:count('unfinished'),
        pairs:{total:starts,engineAWins:pc('A'),engineBWins:pc('B'),draws:pc('draw'),unfinished:pc('unfinished')},
        outputDirectory:output,kjfFormat:'KJF 1.0',conditions:{budgetMs:limits.budgetMs,nodes:limits.nodeLimit||null,
            depth:limits.depthLimit||null,mode,searchMode:limits.mode,maxPly}};
    fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({summary,games:rows,pairs},null,2)+'\n');
    console.log('SUMMARY',JSON.stringify(summary));
} finally {a.close();b.close();}
