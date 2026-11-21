/** Stable user-facing engine identifiers used in CLI comparisons. */
import fs from 'node:fs';
import {EnhancedKeishiAI} from '../enhanced_ai.js';
import {QuadZenithAI} from '../guadzenith_ai.js';

const valid = /^(?:QDX[1-3]|QZ[1-3]|RUST7)$/;
export function parseEngine(name) {
    if (!valid.test(name)) throw Error(`Invalid engine '${name}'. Use QDX1, QDX2, QDX3, QZ1, QZ2, QZ3, RUST7`);
    const family = name === 'RUST7' ? 'rust' : name.startsWith('QDX') ? 'qdx' : 'qz';
    const level = family === 'rust' ? 7 : 7 + Number(name.at(-1));
    return {id:name, family, level, name:family === 'rust' ? 'WebKC Rust Level 7' : family === 'qdx' ? `Quadivex ${name}` : `QuadZenith ${name}`};
}

export async function createEngine(spec) {
    const parsed = typeof spec === 'string' ? parseEngine(spec) : spec;
    if (parsed.family === 'rust') {
        const {LegacyRust7} = await import('./legacy_rust7.mjs');
        const ai = await LegacyRust7.create();
        return {spec:parsed, getNextMove: s => ({move:ai.getNextMove(s), nodes:null, depth:null, ms:null}), close:()=>ai.close()};
    }
    const ctor = parsed.family === 'qdx' ? EnhancedKeishiAI : QuadZenithAI;
    const file = parsed.family === 'qdx' ? '../enhanced_engine.wasm' : '../guadzenith_engine.wasm';
    const wasmBytes = fs.readFileSync(new URL(file, import.meta.url));
    const ai = await ctor.create({wasmBytes});
    return {
        spec:parsed,
        getNextMove: (s, limits) => ai.getNextMove(s,parsed.level,limits.timeMs,{nodes:limits.nodeLimit,depth:limits.depthLimit}),
        isLegal: (s,from,to) => ai.isLegal(s,from,to),
        close:()=>{}
    };
}
