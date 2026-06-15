import { findConflicts, findWrong } from './gameState.js';

const CORNER_ORDER = [0, 1, 2, 3, 4, 5, 6, 7]; // index into the 8 placed slots

export function render(state, root, flags = {}) {
  const conflicts = findConflicts(state);
  const wrong = flags.checkWrong ? findWrong(state) : new Set();
  const sel = state.selected;
  const selVal = sel != null ? state.cells[sel].value : null;
  const peerSet = sel != null ? peersForHighlight(sel) : null;

  root.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = state.cells[i];
    const row = Math.floor(i / 9);
    const col = i % 9;
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.index = String(i);
    if (row % 3 === 0) el.classList.add('bt');
    if (col % 3 === 0) el.classList.add('bl');

    if (sel != null) {
      if (i === sel) el.classList.add('sel');
      else if (peerSet.has(i)) el.classList.add('peer');
      if (selVal != null && cell.value === selVal && i !== sel) el.classList.add('same');
    }

    if (cell.value != null) {
      el.textContent = String(cell.value);
      el.classList.add(cell.given ? 'value-given' : 'value-entry');
      if (conflicts.has(i) || wrong.has(i)) el.classList.add('bad');
    } else {
      if (cell.corner.size) {
        const wrap = document.createElement('div');
        wrap.className = 'corner-marks';
        const digits = [...cell.corner].sort((a, b) => a - b);
        digits.slice(0, 8).forEach((d, slot) => {
          const s = document.createElement('span');
          s.className = 'p' + CORNER_ORDER[slot];
          s.textContent = String(d);
          wrap.appendChild(s);
        });
        el.appendChild(wrap);
      }
      if (cell.center.size) {
        const wrap = document.createElement('div');
        wrap.className = 'center-marks';
        wrap.textContent = [...cell.center].sort((a, b) => a - b).join('');
        el.appendChild(wrap);
      }
    }
    root.appendChild(el);
  }
}

function peersForHighlight(i) {
  // row, col, box of i (excluding i itself)
  const set = new Set();
  const r = Math.floor(i / 9), c = i % 9;
  for (let k = 0; k < 9; k++) { set.add(r * 9 + k); set.add(k * 9 + c); }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) set.add((br + dr) * 9 + (bc + dc));
  set.delete(i);
  return set;
}
