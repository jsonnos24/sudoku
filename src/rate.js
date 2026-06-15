import { units, peers, countSolutions } from './solver.js';

function computeCandidates(grid) {
  const cands = Array.from({ length: 81 }, () => new Set());
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    for (let v = 1; v <= 9; v++) {
      let ok = true;
      for (const j of peers[i]) if (grid[j] === v) { ok = false; break; }
      if (ok) cands[i].add(v);
    }
  }
  return cands;
}

function place(grid, cands, i, v) {
  grid[i] = v;
  cands[i].clear();
  for (const j of peers[i]) cands[j].delete(v);
}

function nakedSingle(grid, cands) {
  let progress = false;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0 && cands[i].size === 1) {
      place(grid, cands, i, [...cands[i]][0]);
      progress = true;
    }
  }
  return progress;
}

function hiddenSingle(grid, cands) {
  let progress = false;
  for (const unit of units) {
    for (let v = 1; v <= 9; v++) {
      let spot = -1, count = 0;
      for (const i of unit) {
        if (grid[i] === 0 && cands[i].has(v)) { spot = i; count++; }
      }
      if (count === 1 && grid[spot] === 0) {
        place(grid, cands, spot, v);
        progress = true;
      }
    }
  }
  return progress;
}

const solved = (grid) => grid.every((v) => v !== 0);

// maxLevel 1 = singles only; 2 = singles + naked pairs + pointing pairs.
export function logicalSolve(grid, maxLevel, extra = null) {
  const g = grid.slice();
  const cands = computeCandidates(g);
  let progress = true;
  while (progress && !solved(g)) {
    progress = false;
    if (nakedSingle(g, cands)) { progress = true; continue; }
    if (hiddenSingle(g, cands)) { progress = true; continue; }
    if (maxLevel >= 2 && extra) {
      for (const technique of extra) {
        if (technique(g, cands)) { progress = true; break; }
      }
    }
  }
  return solved(g);
}

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function nakedPair(grid, cands) {
  let progress = false;
  for (const unit of units) {
    const empties = unit.filter((i) => grid[i] === 0);
    for (let a = 0; a < empties.length; a++) {
      const ca = cands[empties[a]];
      if (ca.size !== 2) continue;
      for (let b = a + 1; b < empties.length; b++) {
        const cb = cands[empties[b]];
        if (cb.size === 2 && setEq(ca, cb)) {
          for (const i of unit) {
            if (i === empties[a] || i === empties[b] || grid[i] !== 0) continue;
            for (const v of ca) if (cands[i].delete(v)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

export function pointingPair(grid, cands) {
  let progress = false;
  for (let b = 0; b < 9; b++) {
    const box = units[18 + b];
    for (let v = 1; v <= 9; v++) {
      const spots = box.filter((i) => grid[i] === 0 && cands[i].has(v));
      if (spots.length < 2) continue;
      const rows = new Set(spots.map((i) => Math.floor(i / 9)));
      const cols = new Set(spots.map((i) => i % 9));
      if (rows.size === 1) {
        const r = [...rows][0];
        for (let c = 0; c < 9; c++) {
          const i = r * 9 + c;
          if (!box.includes(i) && grid[i] === 0 && cands[i].delete(v)) progress = true;
        }
      }
      if (cols.size === 1) {
        const c = [...cols][0];
        for (let r = 0; r < 9; r++) {
          const i = r * 9 + c;
          if (!box.includes(i) && grid[i] === 0 && cands[i].delete(v)) progress = true;
        }
      }
    }
  }
  return progress;
}

export const level2 = [nakedPair, pointingPair];

export function classify(grid) {
  if (logicalSolve(grid, 1)) return 'easy';
  // level2 holds the techniques beyond singles, used to detect medium puzzles
  if (level2 && logicalSolve(grid, 2, level2)) return 'medium';
  if (countSolutions(grid, 2) === 1) return 'hard';
  return null;
}
