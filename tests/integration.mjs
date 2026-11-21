/** Run against upstream repositories and fail if any dependency is missing. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {exportKjf} from '../kjf_export.js';
import {exportStadiumCsv} from '../kifu_export.js';
import {prohibitedReturnGame} from './prohibited_return_fixture.mjs';

const kjfRoot = path.resolve(process.env.KJF_ROOT ?? '../keishi-kjf');
const replayRoot = path.resolve(process.env.REPLAY_ROOT ?? '../keishi-replay');
for (const repo of [kjfRoot, replayRoot]) {
  console.log(path.basename(repo), execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim());
}
const {parseStadiumCsv} = await import(pathToFileURL(path.join(replayRoot, 'lib/csv/stadium-import.js')));
const {parseKjf} = await import(pathToFileURL(path.join(replayRoot, 'lib/kjf/kjf-import.js')));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'quadivex-integration-'));

function verify(file, csv) {
  execFileSync(process.env.PYTHON ?? 'python3', [path.join(kjfRoot, 'tools/kjf_validate.py'), file], {stdio:'inherit'});
  assert.doesNotMatch(csv, /^DRAW/m);
  const kjf = parseKjf(fs.readFileSync(file, 'utf8'));
  const replay = parseStadiumCsv(csv);
  assert.equal(replay.games.length, kjf.games[0].result.reason === 'prohibited_return' ? 1 : kjf.games.length);
  const boards = game => game.snapshots.map(({black, white, turn}) => ({black, white, turn}));
  const moves = game => game.moves.map(({color, fromCoord, toCoord}) => ({color, fromCoord, toCoord}));
  for (const [i, game] of replay.games.entries()) {
    const expected = kjf.games[i];
    assert.deepEqual(game.initial, expected.initial);
    assert.deepEqual(moves(game), moves(expected));
    assert.deepEqual(boards(game), boards(expected));
    assert.equal(game.winner, expected.result.reason === 'square' ? expected.winner : null);
  }
  return kjf;
}

try {
  for (const mode of ['stadium', 'benchmark']) {
    const out = path.join(temp, mode);
    execFileSync(process.execPath, ['tests/compare_engines.mjs'], {
      stdio:'inherit',
      env:{...process.env, A:'QZ1', B:'QDX1', POSITION_FILE:'examples/demo_positions.csv',
        STARTS:mode === 'stadium' ? '1' : '2', DEPTH:'2', MODE:mode, MAXPLY:'1', OUTPUT_DIR:out}
    });
    const {summary} = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
    assert.equal(summary.conditions.maxPly, mode === 'stadium' ? 1000 : 1);
    for (const index of mode === 'stadium' ? ['001'] : ['001', '002']) {
      const kjf = verify(path.join(out, `kjf_${index}.json`), fs.readFileSync(path.join(out, `keishiscore_${index}.csv`), 'utf8'));
      assert.equal(kjf.header.site, 'Quadivex');
      assert.ok(kjf.header.startedAt);
      if (index === '002') {
        assert.equal(kjf.games.length, 1);
        assert.equal(kjf.games[0].moves.length, 1);
        assert.deepEqual(kjf.games[0].result, {status:'interrupted', winner:null, reason:'interrupted'});
      } else {
        assert.equal(kjf.games.length, 2);
        assert.deepEqual(kjf.result, {status:'finished', winner:null, reason:'split'});
      }
    }
  }
  const first = prohibitedReturnGame();
  const players = {p1:{name:'A', type:'human'}, p2:{name:'B', type:'human'}};
  const file = path.join(temp, 'prohibited.kjf.json');
  fs.writeFileSync(file, JSON.stringify(exportKjf({first, players, matchType:'single'})));
  const parsed = verify(file, exportStadiumCsv(first.snapshots, {blackName:'A', whiteName:'B'}));
  assert.deepEqual(parsed.games[0].result, {status:'finished', winner:'p1', reason:'prohibited_return'});
  console.log('PASS: upstream schema, semantic validator, replay boards, moves and results');
} finally {
  fs.rmSync(temp, {recursive:true, force:true});
}
