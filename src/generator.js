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

const TARGET_LEVEL = { easy: 1, medium: 2, hard: 3 };
const levelOf = (cls) => (cls === 'easy' ? 1 : cls === 'medium' ? 2 : cls === 'hard' ? 3 : 99);

function dig(solution, targetLevel) {
  const puzzle = solution.slice();
  for (const i of shuffled([...Array(81).keys()])) {
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = backup;
      continue;
    }
    if (targetLevel < 3 && levelOf(classify(puzzle)) > targetLevel) {
      puzzle[i] = backup;
    }
  }
  return puzzle;
}

export function generatePuzzle(difficulty) {
  const targetLevel = TARGET_LEVEL[difficulty];
  let last = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = generateSolved();
    const puzzle = dig(solution, targetLevel);
    const got = classify(puzzle);
    last = { puzzle, solution, difficulty: got };
    if (got === difficulty) return last;
  }
  // Fallback: return the closest attempt we produced, labelled by its real class.
  return last;
}
