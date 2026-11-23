import {DaiPunch, Move, Position} from './keishi_rules.js';

const SIZE = 5;
const COLORS = ['black', 'white'];
const STONE_NAMES = ['黒石', '白石'];

export function positionFromPointer(clientX, clientY, rect) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  if (!(x >= 0 && x < 1 && y >= 0 && y < 1)) return null;
  return new Position(Math.floor(x * SIZE), Math.floor(y * SIZE));
}

function circle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

function drawArrow(ctx, move, color, originOccupied) {
  const dx = move.to.x - move.from.x;
  const dy = move.to.y - move.from.y;
  const distance = Math.hypot(dx, dy);
  const ux = dx / distance;
  const uy = dy / distance;
  const originX = move.from.x + 0.5;
  const originY = move.from.y + 0.5;
  const offset = originOccupied ? 0.42 : 0;
  const length = originOccupied ? distance - 0.42 : distance / 2;
  const tipX = originX + ux * length;
  const tipY = originY + uy * length;
  const headLength = Math.min(0.18, (length - offset) * 0.6);
  const baseX = tipX - ux * headLength;
  const baseY = tipY - uy * headLength;
  const halfWidth = headLength * 0.55;

  ctx.strokeStyle = color;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(originX + ux * offset, originY + uy * offset);
  ctx.lineTo(baseX, baseY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX - uy * halfWidth, baseY + ux * halfWidth);
  ctx.lineTo(baseX + uy * halfWidth, baseY - ux * halfWidth);
  ctx.closePath();
  ctx.fill();
}

function draw(canvas, ctx, board, cells) {
  const cssSize = canvas.getBoundingClientRect().width;
  if (!cssSize) return;
  const pixels = Math.max(1, Math.round(cssSize * window.devicePixelRatio));
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = canvas.height = pixels;
  }
  const scale = pixels / SIZE;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = 'darkturquoise';
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (const {x, y, selected, winning} of cells) {
    if (selected || winning) {
      ctx.fillStyle = winning ? 'deeppink' : 'gold';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.strokeStyle = 'black';
  ctx.lineWidth = SIZE / cssSize;
  const inset = ctx.lineWidth / 2;
  ctx.beginPath();
  ctx.rect(inset, inset, SIZE - 2 * inset, SIZE - 2 * inset);
  for (let i = 1; i < SIZE; i++) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, SIZE);
    ctx.moveTo(0, i);
    ctx.lineTo(SIZE, i);
  }
  ctx.stroke();

  for (const {x, y, target, punches, stone} of cells) {
    const cx = x + 0.5;
    const cy = y + 0.5;
    if (target) circle(ctx, cx, cy, 0.225, 'gold');
    if (punches.length === 1) circle(ctx, cx, cy, 0.175, COLORS[punches[0]]);
    if (punches.length === 2) {
      circle(ctx, cx - 0.09, cy, 0.085, COLORS[0]);
      circle(ctx, cx + 0.09, cy, 0.085, COLORS[1]);
    }
    if (stone >= 0) circle(ctx, cx, cy, 0.4, COLORS[stone]);
  }

  for (const [side, color] of COLORS.entries()) {
    const move = board.last_move(side);
    if (move !== Move.none()) {
      drawArrow(ctx, move, color, !board.is_no_stone(move.from));
    }
  }
}

export function mountCanvasBoard(canvas, grid, activate) {
  const ctx = canvas.getContext('2d');
  const daiPunch = new DaiPunch();
  let board, cells;
  let focused = 0;
  const elements = [];
  for (let y = 0; y < SIZE; y++) {
    const row = document.createElement('div');
    row.setAttribute('role', 'row');
    for (let x = 0; x < SIZE; x++) {
      const cell = document.createElement('div');
      cell.setAttribute('role', 'gridcell');
      cell.tabIndex = elements.length === focused ? 0 : -1;
      elements.push(cell);
      row.append(cell);
    }
    grid.append(row);
  }

  function focusCell(index) {
    elements[focused].tabIndex = -1;
    focused = index;
    elements[focused].tabIndex = 0;
    elements[focused].focus({preventScroll: true});
  }

  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const pos = positionFromPointer(event.clientX, event.clientY, canvas.getBoundingClientRect());
    if (!pos) return;
    event.preventDefault();
    focusCell(pos.y * SIZE + pos.x);
    activate(pos);
  });

  grid.addEventListener('keydown', event => {
    const pos = cells?.[elements.indexOf(event.target)];
    if (!pos || event.altKey || event.metaKey || event.ctrlKey) return;
    let {x, y} = pos;
    switch (event.key) {
      case 'ArrowLeft': x = Math.max(0, x - 1); break;
      case 'ArrowRight': x = Math.min(SIZE - 1, x + 1); break;
      case 'ArrowUp': y = Math.max(0, y - 1); break;
      case 'ArrowDown': y = Math.min(SIZE - 1, y + 1); break;
      case 'Home': x = 0; break;
      case 'End': x = SIZE - 1; break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!event.repeat) activate(new Position(x, y));
        return;
      default: return;
    }
    event.preventDefault();
    focusCell(y * SIZE + x);
  });

  // Assistive technologies can activate a cell by synthesizing a click.
  grid.addEventListener('click', event => {
    const index = elements.indexOf(event.target);
    if (!cells || index < 0 || event.detail !== 0) return;
    focusCell(index);
    const {x, y} = cells[index];
    activate(new Position(x, y));
  });

  const redraw = () => { if (ctx && board) draw(canvas, ctx, board, cells); };
  new ResizeObserver(redraw).observe(canvas);
  function watchResolution() {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', () => {
      redraw();
      watchResolution();
    }, {once: true});
  }
  watchResolution();

  return function render(snapshot, selected, winner) {
    board = snapshot;
    daiPunch.check(board);
    const lastMoves = COLORS.map((_, side) => board.last_move(side));
    cells = elements.map((cell, index) => {
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      const stone = board.get_stone(x, y);
      const isSelected = selected?.x === x && selected.y === y;
      const target = selected !== null && board.is_available_move(selected, new Position(x, y));
      const winning = stone === winner;
      const punches = [];
      if (winner === null) {
        const bit = 1 << index;
        if (daiPunch.positions.black_stones & bit) punches.push(0);
        if (daiPunch.positions.white_stones & bit) punches.push(1);
      }
      const flags = [target && '移動可能', winning && '完成した正方形',
        ...punches.map(side => `${STONE_NAMES[side]}の大パンチ`)].filter(Boolean);
      for (const [side, {from, to}] of lastMoves.entries()) {
        if (from.x === x && from.y === y) {
          flags.push(`${STONE_NAMES[side]}の直前の着手、移動先は${to.x + 1},${to.y + 1}`);
        }
      }
      const label = [`${x + 1},${y + 1} ${STONE_NAMES[stone] ?? '空き'}`, ...flags].join('、');
      if (cell.getAttribute('aria-label') !== label) cell.setAttribute('aria-label', label);
      if (cell.getAttribute('aria-selected') !== String(isSelected)) {
        cell.setAttribute('aria-selected', String(isSelected));
      }
      return {x, y, stone, selected: isSelected, target, winning, punches};
    });
    redraw();
  };
}
