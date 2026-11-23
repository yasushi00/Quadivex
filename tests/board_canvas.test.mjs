import assert from 'node:assert/strict';
import test from 'node:test';
import {positionFromPointer} from '../board_canvas.js';
import {Position} from '../keishi_rules.js';

test('maps CSS pixels to every cell independently of backing resolution', () => {
  const rect = {left: 43.25, top: -17.5, width: 312.5, height: 312.5};
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const clientX = rect.left + (x + 0.5) * rect.width / 5;
      const clientY = rect.top + (y + 0.5) * rect.height / 5;
      assert.deepEqual(positionFromPointer(clientX, clientY, rect), new Position(x, y));
    }
  }
});

test('uses the rendered width and height independently', () => {
  const rect = {left: 125, top: 25, width: 400, height: 250};
  assert.deepEqual(positionFromPointer(125, 25, rect), new Position(0, 0));
  assert.deepEqual(positionFromPointer(205, 125, rect), new Position(1, 2));
  assert.deepEqual(positionFromPointer(524.99, 274.99, rect), new Position(4, 4));
});

test('rejects positions outside the half-open board and empty client rectangles', () => {
  const rect = {left: 125, top: 25, width: 400, height: 250};
  for (const [x, y] of [[124.99, 125], [205, 24.99], [525, 125], [205, 275], [NaN, 125]]) {
    assert.equal(positionFromPointer(x, y, rect), null);
  }
  assert.equal(positionFromPointer(125, 25, {...rect, width: 0}), null);
  assert.equal(positionFromPointer(125, 25, {...rect, height: 0}), null);
});
