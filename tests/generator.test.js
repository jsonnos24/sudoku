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
