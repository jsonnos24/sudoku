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

for (const difficulty of ['easy', 'medium', 'hard']) {
  test(`generatePuzzle('${difficulty}') yields a unique puzzle of that difficulty`, () => {
    const { puzzle, solution, difficulty: got } = generatePuzzle(difficulty);
    assert.equal(puzzle.length, 81);
    assert.equal(solution.length, 81);
    // puzzle is a subset of the solution
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) assert.equal(puzzle[i], solution[i]);
    }
    assert.equal(countSolutions(puzzle, 2), 1);
    assert.equal(got, difficulty);
    assert.equal(classify(puzzle), difficulty);
  });
}
