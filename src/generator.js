import { isValidPlacement, countSolutions } from './solver.js';
import { logicalSolve, level2 } from './rate.js';

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

// Each difficulty is defined by a clue floor (how many givens remain) plus a
// technique ceiling (the hardest solving logic the puzzle may require). The clue
// floor is the primary, visible difficulty lever; the ceiling keeps an "easy"
// board from secretly needing advanced logic.
const TARGET = {
  easy: { level: 1, clues: 38 },
  medium: { level: 2, clues: 30 },
  hard: { level: 3, clues: 25 },
};

function dig(solution, targetLevel, targetClues) {
  const puzzle = solution.slice();
  let clues = 81;
  for (const i of shuffled([...Array(81).keys()])) {
    if (clues <= targetClues) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = backup;
      continue;
    }
    if (targetLevel < 3) {
      // uniqueness already confirmed above; reject removals that push the puzzle
      // past the technique ceiling for this difficulty.
      const lvl = logicalSolve(puzzle, 1) ? 1 : logicalSolve(puzzle, 2, level2) ? 2 : 3;
      if (lvl > targetLevel) { puzzle[i] = backup; continue; }
    }
    clues--;
  }
  return puzzle;
}

export function generatePuzzle(difficulty) {
  const { level, clues } = TARGET[difficulty];
  const solution = generateSolved();
  // dig guarantees uniqueness at every step, so a single pass suffices.
  const puzzle = dig(solution, level, clues);
  return { puzzle, solution, difficulty };
}
