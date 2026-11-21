/** QuadZenith: independent C/WASM Keishi engine, separate from Quadivex and Rust7. */
export class QuadZenithAI {
    constructor(instance) {
        this.wasm = instance.exports;
    }

    static async create({wasmBytes} = {}) {
        const bytes = wasmBytes ?? await fetch(new URL('./guadzenith_engine.wasm', import.meta.url)).then(r => {
            if (!r.ok) throw Error(`guadzenith_engine.wasm: HTTP ${r.status}`);
            return r.arrayBuffer();
        });
        const {instance} = await WebAssembly.instantiate(bytes, {
            env: {now: () => performance.now()}
        });
        if (instance.exports.keishi_square_count() !== 50) throw Error('QuadZenith square count != 50');
        return new QuadZenithAI(instance);
    }

    getNextMove(board, level = 8, timeMs, limits = {}) {
        const {black_stones, white_stones, turn, lastB = -1, lastW = -1} = board;
        const nodes = limits.nodes ?? 0;
        const depth = limits.depth ?? 0;
        const fixed = nodes > 0 || depth > 0;
        const ms = timeMs === undefined ? (fixed ? -1 : 0) : timeMs;
        const start = performance.now();
        const move = fixed ? this.wasm.keishi_search_limited(
            black_stones, white_stones, turn, lastB, lastW, level, ms, nodes, depth
        ) : this.wasm.keishi_search(
            black_stones, white_stones, turn, lastB, lastW, level, ms || 0
        );
        return {
            move, from: move < 0 ? -1 : Math.floor(move / 25), to: move < 0 ? -1 : move % 25,
            depth: this.wasm.keishi_depth(), score: this.wasm.keishi_score(),
            nodes: this.wasm.keishi_nodes(), ttHits: this.wasm.keishi_tt_hits(),
            ms: Math.round(performance.now() - start)
        };
    }

    isLegal(board, from, to) {
        return !!this.wasm.keishi_legal(
            board.black_stones, board.white_stones, board.turn,
            board.lastB ?? -1, board.lastW ?? -1, from * 25 + to
        );
    }
}
