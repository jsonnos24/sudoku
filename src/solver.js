export const N = 9;

export const units = (() => {
  const u = [];
  for (let r = 0; r < 9; r++) u.push([...Array(9)].map((_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) u.push([...Array(9)].map((_, r) => r * 9 + c));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) box.push((br * 3 + r) * 9 + (bc * 3 + c));
      u.push(box);
    }
  }
  return u;
})();

export const peers = (() => {
  const p = Array.from({ length: 81 }, () => new Set());
  for (const unit of units)
    for (const i of unit)
      for (const j of unit)
        if (i !== j) p[i].add(j);
  return p;
})();

export function isValidPlacement(grid, i, val) {
  for (const j of peers[i]) if (grid[j] === val) return false;
  return true;
}

function pickCell(g) {
  let best = -1, bestCands = null;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const cands = [];
    for (let v = 1; v <= 9; v++) if (isValidPlacement(g, i, v)) cands.push(v);
    if (cands.length === 0) return { best: -2, cands: null }; // dead end
    if (bestCands === null || cands.length < bestCands.length) {
      best = i; bestCands = cands;
      if (cands.length === 1) break;
    }
  }
  return { best, cands: bestCands };
}

export function solve(grid) {
  const g = grid.slice();
  function rec() {
    const { best, cands } = pickCell(g);
    if (best === -2) return false;
    if (best === -1) return true; // no empties: solved
    for (const v of cands) {
      g[best] = v;
      if (rec()) return true;
      g[best] = 0;
    }
    return false;
  }
  return rec() ? g : null;
}

export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  function rec() {
    if (count >= limit) return;
    const { best, cands } = pickCell(g);
    if (best === -2) return;
    if (best === -1) { count++; return; }
    for (const v of cands) {
      g[best] = v;
      rec();
      g[best] = 0;
      if (count >= limit) return;
    }
  }
  rec();
  return count;
}
