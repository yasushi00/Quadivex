/** Independent QDX / QZ C/WASM Worker; legacy Rust is CLI-only. */
import {EnhancedKeishiAI} from './enhanced_ai.js';
import {QuadZenithAI} from './guadzenith_ai.js';
const enginePromises = new Map();
const engine = (name) => {
  if (name !== 'QDX' && name !== 'QZ') throw Error(`Unsupported Web engine: ${name}`);
  if (!enginePromises.has(name)) {
    enginePromises.set(name, name === 'QDX' ? EnhancedKeishiAI.create() : QuadZenithAI.create());
  }
  return enginePromises.get(name);
};
self.onmessage = async ({data}) => {
  if(data.command !== 'getNextMove') return;
  try {
    const engineName = data.engine || 'QDX';
    const ai=await engine(engineName);
    const b=data.board_obj;
    const unpack=v=>v===0xffffffff?-1:v;
    const result=ai.getNextMove({
      black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,
      lastB:unpack(b.last_move_b),lastW:unpack(b.last_move_w)
    }, data.level);
    if(result.move<0) throw Error('No legal move');
    if(!ai.isLegal({black_stones:b.black_stones,white_stones:b.white_stones,turn:b.turn,
      lastB:unpack(b.last_move_b),lastW:unpack(b.last_move_w)},result.from,result.to)) {
      throw Error('Engine returned an illegal move');
    }
    self.postMessage({status:'ok',result:result.move,stats:result});
  } catch(e) {
    enginePromises.delete(data.engine || 'QDX');
    self.postMessage({status:'error',error:String(e)});
  }
};
