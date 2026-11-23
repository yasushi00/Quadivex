import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MatchSession} from '../game_state.js';
import {Move, Position} from '../keishi_rules.js';
import {parseOpenings} from '../opening_csv.js';

const opening = 'B11,12,21,32\nW33,34,43,55';
const openings = readFileSync(new URL('../InitialPosition.csv', import.meta.url), 'utf8')
  .replace(/^[^\r\n]+\r?\n[^\r\n]+/, opening);
const point = coord => new Position(Number(coord[0]) - 1, Number(coord[1]) - 1);
const move = (from, to) => new Move(point(from), point(to));

class Element {
  children = [];
  attributes = new Map();
  listeners = new Map();
  append(child) { this.children.push(child); }
  appendChild(child) { this.append(child); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  dispatch(name, event) { this.listeners.get(name)({preventDefault() {}, ...event}); }
  getBoundingClientRect() { return {left: 0, top: 0, width: 500, height: 500}; }
  click() { if (!this.disabled) this.onclick?.(); }
  focus() {}
  remove() {}
}

class CanvasContext {
  setTransform() {
    this.circles = [];
    this.strokes = [];
    this.rectangles = [];
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push([x, y]); }
  lineTo(x, y) { this.path.push([x, y]); }
  arc(x, y, radius) { this.circles.push([this.fillStyle, x, y, radius]); }
  stroke() { this.strokes.push([this.strokeStyle, this.path]); }
  fillRect(x, y, width, height) { this.rectangles.push([this.fillStyle, x, y, width, height]); }
  fill() {}
  rect() {}
  closePath() {}
}

let appInstance = 0;
async function openApp(t, side = '0') {
  const context = new CanvasContext();
  const elements = new Map();
  const getElementById = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const canvas = getElementById('board');
  canvas.getContext = () => context;
  getElementById('engine').value = 'QDX1';
  getElementById('side').value = side;

  const workers = [];
  class Worker {
    constructor() { workers.push(this); }
    postMessage(data) { this.request = data; }
    terminate() { this.terminated = true; }
    reply(from, to) { this.onmessage({data: {status: 'ok', result: move(from, to).to_u32()}}); }
  }
  const globals = {
    document: {getElementById, createElement: () => new Element(), body: new Element()},
    window: {devicePixelRatio: 1, matchMedia: () => new Element()},
    ResizeObserver: class { observe() {} },
    Worker,
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {configurable: true, value});
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  t.mock.method(globalThis, 'fetch', async () => new Response(openings));
  const downloads = [];
  t.mock.method(URL, 'createObjectURL', blob => {
    downloads.push(blob);
    return 'blob:takeback-test';
  });

  await import(`../app.js?test=${appInstance++}`);
  getElementById('start').click();

  const grid = getElementById('board-grid');
  const cell = coord => {
    const {x, y} = point(coord);
    return grid.children[y].children[x];
  };
  const pressCell = (coord, key) => {
    if (key) {
      grid.dispatch('keydown', {target: cell(coord), key});
      return;
    }
    const {x, y} = point(coord);
    canvas.dispatch('pointerdown', {
      isPrimary: true, button: 0, clientX: 50 + x * 100, clientY: 50 + y * 100,
    });
  };
  const press = id => getElementById(id).click();
  return {
    context, workers, press, cell, pressCell,
    play(from, to, key) { pressCell(from, key); pressCell(to, key); },
    label: coord => cell(coord).getAttribute('aria-label'),
    status: () => getElementById('status').textContent,
    disabled: id => getElementById(id).disabled,
    async exportFiles() {
      press('saveCsv');
      press('saveKjf');
      const [csv, kjf] = await Promise.all(downloads.splice(0).map(blob => blob.text()));
      return {csv, kjf: JSON.parse(kjf)};
    },
  };
}

test('A: a completed human and CPU pair can be replaced, followed by a new CPU reply', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  app.workers[0].reply('55', '54');
  assert.equal(app.status(), '2/2手目 / あなたの番');
  app.press('back');
  assert.match(app.status(), /^0\/2手目 \/ あなたの番/);
  assert.equal(app.workers.length, 1);
  app.play('32', '41');
  assert.equal(app.status(), '1/1手目 / CPU思考中');
  assert.equal(app.workers[1].request.board_obj.last_move_b, move('32', '41').to_u32());
  app.workers[1].reply('55', '54');
  assert.equal(app.status(), '2/2手目 / あなたの番');
  assert.match(app.label('41'), /黒石/);
  assert.match(app.label('54'), /白石/);
});

test('B and F: a pending CPU reply is cancelled and cannot affect the new branch', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  const oldWorker = app.workers[0];
  app.press('back');
  assert.equal(oldWorker.terminated, true);
  assert.equal(app.workers.length, 1);
  assert.match(app.status(), /^0\/1手目 \/ あなたの番/);
  oldWorker.reply('55', '54');
  assert.match(app.status(), /^0\/1手目 \/ あなたの番/);
  app.play('32', '41', 'Enter');
  assert.equal(app.workers.length, 2);
  oldWorker.reply('55', '54');
  oldWorker.onerror({message: 'stale failure'});
  assert.equal(app.status(), '1/1手目 / CPU思考中');
  assert.match(app.label('55'), /白石/);
  assert.equal(app.workers[1].terminated, undefined);
  app.workers[1].reply('55', '54');
  assert.equal(app.status(), '2/2手目 / あなたの番');
});

test('C: forward restores the original positions one ply at a time', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  const pendingBoard = app.label('32');
  app.workers[0].reply('55', '54');
  const latestBoard = app.label('55');
  app.press('back');
  app.press('next');
  assert.equal(app.label('32'), pendingBoard);
  assert.match(app.status(), /^1\/2手目 \/ CPUの番/);
  app.play('55', '54');
  assert.match(app.status(), /^1\/2手目 \/ CPUの番/);
  app.press('next');
  assert.equal(app.label('55'), latestBoard);
  assert.equal(app.status(), '2/2手目 / あなたの番');
  assert.equal(app.disabled('next'), true);
  assert.equal(app.workers.length, 1);
});

test('forward to a previously cancelled CPU turn does not start a worker', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  app.press('back');
  app.press('next');
  assert.equal(app.status(), '1/1手目 / CPUの番（停止中）');
  assert.match(app.label('31'), /黒石/);
  assert.equal(app.workers.length, 1);
  app.press('back');
  app.play('32', '41');
  assert.equal(app.status(), '1/1手目 / CPU思考中');
  assert.equal(app.workers.length, 2);
});

test('D and G: a new move replaces the future in both downloaded records', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  app.workers[0].reply('55', '54');
  const original = await app.exportFiles();
  app.press('back');
  assert.deepEqual(await app.exportFiles(), original);
  app.play('32', '41');
  assert.equal(app.disabled('next'), true);
  const branch = await app.exportFiles();
  assert.deepEqual(branch.csv.trim().split('\r\n'), [
    'B11,12,21,32,(Human)', 'W33,34,43,55,(QDX1)', 'B11,12,21,41',
  ]);
  assert.deepEqual(branch.kjf.games[0].moves, [
    {color: 'B', board: {B: ['11', '12', '21', '41'], W: ['33', '34', '43', '55']}},
  ]);
  app.workers[1].reply('55', '45');
  const continued = await app.exportFiles();
  assert.deepEqual(continued.csv.trim().split('\r\n'), [
    'B11,12,21,32,(Human)', 'W33,34,43,55,(QDX1)', 'B11,12,21,41', 'W33,34,43,45',
  ]);
  assert.deepEqual(continued.kjf.games[0].moves, [
    ...branch.kjf.games[0].moves,
    {color: 'W', board: {B: ['11', '12', '21', '41'], W: ['33', '34', '43', '45']}},
  ]);
});

test('E: a square win stays recorded during replay and clears on a new branch', async t => {
  const app = await openApp(t);
  app.play('32', '22');
  assert.equal(app.status(), '1/1手目 / あなたの勝ち');
  assert.equal(app.context.rectangles.filter(([color]) => color === 'deeppink').length, 4);
  const finished = await app.exportFiles();
  assert.ok(finished.kjf.header.endedAt);
  assert.deepEqual(finished.kjf.games[0].result, {status: 'finished', winner: 'p1', reason: 'square'});
  app.press('back');
  assert.match(app.status(), /^0\/1手目 \/ あなたの番/);
  assert.equal(app.disabled('start'), true);
  assert.equal(app.context.rectangles.some(([color]) => color === 'deeppink'), false);
  assert.deepEqual(await app.exportFiles(), finished);
  app.press('next');
  assert.equal(app.status(), '1/1手目 / あなたの勝ち');
  app.press('back');
  app.play('32', '41');
  assert.equal(app.status(), '1/1手目 / CPU思考中');
  const reopened = await app.exportFiles();
  assert.equal(reopened.kjf.header.startedAt, finished.kjf.header.startedAt);
  assert.equal(reopened.kjf.header.endedAt, undefined);
  assert.deepEqual(reopened.kjf.games[0].result, {status: 'playing', winner: null, reason: null});
  assert.doesNotMatch(reopened.csv, /WIN/);
});

test('H: the displayed turn, stones, arrows, DaiPunch and legal targets follow the rewind', async t => {
  const app = await openApp(t);
  app.play('32', '31');
  app.workers[0].reply('55', '54');
  app.play('11', '22');
  app.workers[1].reply('54', '53');
  assert.match(app.label('22'), /黒石/);
  app.press('back');
  assert.match(app.status(), /^2\/4手目 \/ あなたの番/);
  assert.match(app.label('11'), /黒石/);
  assert.match(app.label('32'), /黒石の直前の着手、移動先は3,1/);
  assert.match(app.label('55'), /白石の直前の着手、移動先は5,4/);
  assert.match(app.label('22'), /空き、黒石の大パンチ/);
  assert.match(app.label('44'), /空き、白石の大パンチ/);
  assert.ok(app.context.circles.some(circle => circle.join() === 'black,0.5,0.5,0.4'));
  assert.ok(app.context.circles.some(circle => circle.join() === 'black,1.5,1.5,0.175'));
  assert.ok(app.context.circles.some(circle => circle.join() === 'white,3.5,3.5,0.175'));
  assert.deepEqual(app.context.strokes.slice(-2).map(([color, [origin]]) => [color, origin]), [
    ['black', [2.5, 1.5]], ['white', [4.5, 4.5]],
  ]);
  app.pressCell('31');
  assert.equal(app.cell('31').getAttribute('aria-selected'), 'true');
  assert.doesNotMatch(app.label('32'), /移動可能/);
  assert.match(app.label('41'), /移動可能/);
  app.pressCell('32');
  assert.match(app.status(), /^2\/4手目/);
  app.pressCell('41');
  assert.equal(app.status(), '3/3手目 / CPU思考中');
  assert.equal(app.cell('31').getAttribute('aria-selected'), 'false');
});

test('white can rewind to its prior turn or the initial board without restarting the CPU', async t => {
  const app = await openApp(t, '1');
  assert.equal(app.disabled('back'), true);
  app.workers[0].reply('32', '31');
  app.play('55', '54');
  app.workers[1].reply('31', '41');
  app.press('back');
  assert.match(app.status(), /^1\/3手目 \/ あなたの番/);
  app.press('back');
  assert.match(app.status(), /^0\/3手目 \/ CPUの番/);
  assert.equal(app.disabled('back'), true);
  assert.equal(app.workers.length, 2);
  app.press('next');
  assert.match(app.status(), /^1\/3手目 \/ あなたの番/);
});

test('MatchSession preserves a finished timeline on illegal input and adjudicates a new ending', () => {
  const [initial] = parseOpenings(opening);
  const session = new MatchSession(initial, 0, 'QDX1');
  session.start();
  session.apply(move('32', '31'));
  session.apply(move('55', '44'));
  assert.equal(session.winner, 1);
  const originalBoard = session.board;
  const originalEnd = session.endedAt;
  session.back();
  assert.throws(() => session.apply(move('32', '33')), /Illegal move/);
  assert.equal(session.board, originalBoard);
  assert.equal(session.winner, 1);
  assert.equal(session.endedAt, originalEnd);
  assert.equal(session.cursor, 0);
  session.apply(move('32', '22'));
  assert.equal(session.reason, 'square');
  assert.equal(session.winner, 0);
  assert.ok(session.endedAt);
  assert.equal(session.history.length, 2);
  assert.equal(session.active, false);
});
