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

export function classify(grid) {
  if (logicalSolve(grid, 1)) return 'easy';
  // level-2 techniques are wired in Task 5 via `level2`
  if (level2 && logicalSolve(grid, 2, level2)) return 'medium';
  if (countSolutions(grid, 2) === 1) return 'hard';
  return null;
}

// Populated in Task 5.
export let level2 = null;
export function _setLevel2(techniques) { level2 = techniques; }
