import {validateOpening} from './game_state.js';
/** Parse original B/W rows without sorting away stone identities. */
export function parseOpenings(text,{expected,strict=false}={}){
 const raw=text.replace(/^\uFEFF/,'').split(/\r?\n/);while(raw.length&&!raw.at(-1).trim())raw.pop();
 if(strict&&raw.length!==287)throw Error(`Expected 287 lines, got ${raw.length}`);
 if(strict)for(let i=2;i<raw.length;i+=3)if(raw[i].trim())throw Error('Missing blank separator');
 const lines=raw.filter(s=>s.trim());if(!lines.length||lines.length%2)throw Error('Expected B/W opening pairs');
 const seen=new Set(),out=[];
 const row=(line,c)=>{if(!new RegExp(`^${c}[1-5][1-5](,[1-5][1-5]){3}$`).test(line))throw Error(`Invalid opening row: ${line}`);return line.slice(1).split(',').map(s=>(+s[1]-1)*5+ +s[0]-1);};
 const mask=a=>a.reduce((n,i)=>n|(1<<i),0);
 for(let i=0;i<lines.length;i+=2){const B=row(lines[i],'B'),W=row(lines[i+1],'W'),b=mask(B),w=mask(W);validateOpening(b,w);const key=`${b}:${w}`;if(seen.has(key))throw Error(`Duplicate opening ${i/2+1}`);seen.add(key);out.push({b,w,orders:{B,W}});}
 if(expected!==undefined&&out.length!==expected)throw Error(`Expected ${expected} openings, got ${out.length}`);return out;
}
