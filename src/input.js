import { setValue, toggleMark, erase, undo, redo } from './gameState.js';

const MODE_LAYER = { corner: 'corner', center: 'center' };

export function applyDigit(state, v) {
  const i = state.selected;
  if (i == null) return;
  if (state.mode === 'normal') setValue(state, i, v);
  else toggleMark(state, MODE_LAYER[state.mode], i, v);
}

export function attachInput(getState, boardEl, refresh, onChange) {
  const changed = () => { refresh(); onChange && onChange(); };

  boardEl.addEventListener('click', (e) => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    getState().selected = Number(cellEl.dataset.index);
    refresh();
  });

  document.addEventListener('keydown', (e) => {
    const state = getState();
    if (e.key >= '1' && e.key <= '9') { applyDigit(state, Number(e.key)); changed(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (state.selected != null) { erase(state, state.selected); changed(); }
      return;
    }
    if (state.selected != null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      state.selected = moveSelection(state.selected, e.key);
      refresh();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'n') { state.mode = 'normal'; refresh(); }
    else if (k === 'c') { state.mode = 'corner'; refresh(); }
    else if (k === 'x' || k === 'm') { state.mode = 'center'; refresh(); }
    else if (k === 'z' && (e.ctrlKey || e.metaKey)) { undo(state); changed(); }
    else if (k === 'y' && (e.ctrlKey || e.metaKey)) { redo(state); changed(); }
  });
}

function moveSelection(i, key) {
  let r = Math.floor(i / 9), c = i % 9;
  if (key === 'ArrowUp') r = (r + 8) % 9;
  if (key === 'ArrowDown') r = (r + 1) % 9;
  if (key === 'ArrowLeft') c = (c + 8) % 9;
  if (key === 'ArrowRight') c = (c + 1) % 9;
  return r * 9 + c;
}
