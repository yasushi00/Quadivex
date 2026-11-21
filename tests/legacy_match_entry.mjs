/** Backward-compatible wrappers around unified KJF+CSV comparison. */
import {spawnSync} from 'node:child_process';
const kind=process.argv[2];
const env={...process.env};
if(kind==='rust7'){
 const level=Number(env.QDX??8);
 if(![8,9,10].includes(level))throw Error('QDX must be 8, 9 or 10');
 env.A=`QDX${level-7}`;env.B='RUST7';env.OUTPUT_DIR??='tests/results_rust7';
}else if(kind==='selfplay'){
 const b=Number(env.BLACK??8),w=Number(env.WHITE??10);
 if(![8,9,10].includes(b)||![8,9,10].includes(w))throw Error('BLACK/WHITE must be 8, 9 or 10');
 env.A=`QDX${b-7}`;env.B=`QDX${w-7}`;env.OUTPUT_DIR??='tests/results';
}else throw Error('Expected rust7 or selfplay');
const result=spawnSync(process.execPath,['tests/compare_engines.mjs'],{env,stdio:'inherit'});
process.exit(result.status??1);
