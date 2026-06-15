import { isValidPlacement, countSolutions } from './solver.js';
import { classify } from './rate.js';

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fill(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isValidPlacement(grid, i, v)) {
        grid[i] = v;
        if (fill(grid)) return true;
        grid[i] = 0;
      }
    }
    return false;
  }
  return true;
}

export function generateSolved() {
  const grid = new Array(81).fill(0);
  fill(grid);
  return grid;
}
