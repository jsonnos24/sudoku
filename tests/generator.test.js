import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSolved } from '../src/generator.js';
import { units } from '../src/solver.js';

test('generateSolved returns a fully valid 81-cell grid', () => {
  const g = generateSolved();
  assert.equal(g.length, 81);
  assert.ok(g.every((v) => v >= 1 && v <= 9));
  for (const unit of units) {
    assert.equal(new Set(unit.map((i) => g[i])).size, 9);
  }
});

test('generateSolved produces different grids', () => {
  assert.notDeepEqual(generateSolved(), generateSolved());
});

import { generatePuzzle } from '../src/generator.js';
import { countSolutions } from '../src/solver.js';
import { classify } from '../src/rate.js';

// Clue floors per difficulty: a puzzle never has fewer givens than its target.
const CLUE_TARGET = { easy: 38, medium: 30, hard: 25 };
// Technique ceiling: a puzzle is never harder than these classes allow.
const ALLOWED_CLASS = {
  easy: new Set(['easy']),
  medium: new Set(['easy', 'medium']),
  hard: new Set(['easy', 'medium', 'hard']),
};

for (const difficulty of ['easy', 'medium', 'hard']) {
  test(`generatePuzzle('${difficulty}') yields a unique, on-target puzzle`, () => {
    const { puzzle, solution, difficulty: got } = generatePuzzle(difficulty);
    assert.equal(puzzle.length, 81);
    assert.equal(solution.length, 81);
    // puzzle is a subset of the solution
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) assert.equal(puzzle[i], solution[i]);
    }
    assert.equal(countSolutions(puzzle, 2), 1);
    assert.equal(got, difficulty);

    // Clue floor: at least the target number of givens.
    const clues = puzzle.filter((v) => v !== 0).length;
    assert.ok(
      clues >= CLUE_TARGET[difficulty],
      `${difficulty}: ${clues} clues, expected >= ${CLUE_TARGET[difficulty]}`,
    );

    // Technique ceiling: not harder than the difficulty allows.
    assert.ok(
      ALLOWED_CLASS[difficulty].has(classify(puzzle)),
      `${difficulty}: classified as ${classify(puzzle)}`,
    );
  });
}
