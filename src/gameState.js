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

export function undo(state) {
  if (state.history.length === 0) return;
  state.future.push(cloneCells(state.cells));
  state.cells = state.history.pop();
}

export function redo(state) {
  if (state.future.length === 0) return;
  state.history.push(cloneCells(state.cells));
  state.cells = state.future.pop();
}

export function findConflicts(state) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    const v = state.cells[i].value;
    if (v == null) continue;
    for (const j of peers[i]) {
      if (state.cells[j].value === v) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export function findWrong(state) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    const v = state.cells[i].value;
    if (v != null && v !== state.solution[i]) bad.add(i);
  }
  return bad;
}

export function isComplete(state) {
  return state.cells.every((c, i) => c.value === state.solution[i]);
}

export function hint(state, i) {
  const cell = state.cells[i];
  if (cell.given || cell.value === state.solution[i]) return;
  pushHistory(state);
  cell.value = state.solution[i];
  cell.center.clear();
  cell.corner.clear();
}
