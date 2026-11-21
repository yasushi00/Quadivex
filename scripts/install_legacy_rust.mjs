/** Optional locally installed upstream engine; original files are NOT MIT-licensed here. */
import fs from 'node:fs';
import path from 'node:path';

const base='https://licheng.sakura.ne.jp/webkc/pkg/';
const names=['webkc_rust.js','webkc_rust_bg.wasm'];
const args=process.argv.slice(2);
if(args.length>2 || (args.length && (args[0]!=='--from' || !args[1]))) {
  console.error('Usage: npm run setup:rust7 [-- --from /directory/with/upstream/files]');
  process.exit(2);
}
const files=new Map();
for(const name of names) {
  if(args[0]==='--from') {
    files.set(name,fs.readFileSync(path.join(args[1],name)));
  } else {
    const url=base+name;
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${url}`);
    files.set(name,Buffer.from(await response.arrayBuffer()));
  }
}
const script=files.get('webkc_rust.js').toString('utf8');
if(!script.includes('webkc_rust_bg.wasm') && !script.includes('initSync')) {
  throw new Error('Unexpected Rust JS wrapper; check that the file is from the upstream WebKC distribution.');
}
const wasm=files.get('webkc_rust_bg.wasm');
if(wasm.length<8 || !wasm.subarray(0,4).equals(Buffer.from([0,97,115,109]))) {
  throw new Error('Invalid WASM magic header; refusing to install.');
}
fs.mkdirSync('legacy_rust',{recursive:true});
for(const name of names) {
  const dest=path.join('legacy_rust',name);
  const tmp=dest+`.${process.pid}.tmp`;
  try {fs.writeFileSync(tmp,files.get(name));fs.renameSync(tmp,dest);}
  finally {if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  console.log(`Installed local ${dest}`);
}
console.log('These upstream files are excluded from MIT distribution and intended for local tests only.');
