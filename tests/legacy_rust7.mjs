/** Compatibility adapter for original WebKC Rust/WASM level 7.
 * Test infrastructure ONLY: never imported by the browser UI/worker.
 */
import fs from 'node:fs';
import init, {Engine, Board, Move, Position} from '../legacy_rust/webkc_rust.js';

const decodeIndex = i => new Position(i % 5, Math.floor(i / 5));
function toRustMove(code) {
  if (code === -1 || code === 0xffffffff || code == null) return Move.none();
  if (!Number.isInteger(code) || code < 0 || code >= 625) throw Error(`Bad Quadivex move: ${code}`);
  return new Move(decodeIndex(Math.floor(code / 25)), decodeIndex(code % 25));
}
export class LegacyRust7 {
  static async create() {
    const bytes = fs.readFileSync(new URL('../legacy_rust/webkc_rust_bg.wasm', import.meta.url));
    await init({module_or_path: bytes});
    return new LegacyRust7(new Engine());
  }
  constructor(engine) { this.engine = engine; }
  getNextMove(s) {
    const board = new Board();
    try {
      board.reset_with(s.black_stones,s.white_stones);
      board.turn = s.turn;
      board.last_move_b = toRustMove(s.lastB);
      board.last_move_w = toRustMove(s.lastW);
      const result = this.engine.get_next_move(board,7,s.turn);
      try {
        const from = result.from, to = result.to;
        try {
          if (from.x >= 5 || from.y >= 5 || to.x >= 5 || to.y >= 5) return -1;
          return (from.y * 5 + from.x) * 25 + (to.y * 5 + to.x);
        } finally { from.free(); to.free(); }
      } finally { result.free(); }
    } finally { board.free(); }
  }
  close() { this.engine.free(); }
}
