import { peers } from './solver.js';

export function createGame({ puzzle, solution, difficulty }) {
  const cells = puzzle.map((v) => ({
    value: v === 0 ? null : v,
    given: v !== 0,
    center: new Set(),
    corner: new Set(),
  }));
  return {
    cells,
    solution,
    difficulty,
    selected: null,
    mode: 'normal', // 'normal' | 'corner' | 'center'
    history: [],
    future: [],
    autoClear: true,
  };
}

function cloneCells(cells) {
  return cells.map((c) => ({
    value: c.value,
    given: c.given,
    center: new Set(c.center),
    corner: new Set(c.corner),
  }));
}

function pushHistory(state) {
  state.history.push(cloneCells(state.cells));
  if (state.history.length > 300) state.history.shift();
  state.future = [];
}

export function setValue(state, i, v) {
  const cell = state.cells[i];
  if (cell.given) return;
  pushHistory(state);
  if (cell.value === v) {
    cell.value = null;
    return;
  }
  cell.value = v;
  cell.center.clear();
  cell.corner.clear();
  if (state.autoClear) {
    for (const j of peers[i]) {
      state.cells[j].center.delete(v);
      state.cells[j].corner.delete(v);
    }
  }
}

export function toggleMark(state, layer, i, v) {
  const cell = state.cells[i];
  if (cell.given || cell.value !== null) return;
  pushHistory(state);
  const set = cell[layer];
  if (set.has(v)) set.delete(v);
  else set.add(v);
}

export function erase(state, i) {
  const cell = state.cells[i];
  if (cell.given) return;
  pushHistory(state);
  cell.value = null;
  cell.center.clear();
  cell.corner.clear();
}
