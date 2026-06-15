import { test } from 'node:test';
import assert from 'node:assert/strict';
import { units, peers, isValidPlacement } from '../src/solver.js';

test('there are 27 units of 9 cells each', () => {
  assert.equal(units.length, 27);
  for (const u of units) assert.equal(u.length, 9);
});

test('every cell has exactly 20 peers', () => {
  assert.equal(peers.length, 81);
  for (const p of peers) assert.equal(p.size, 20);
  assert.ok(!peers[0].has(0));
});

test('isValidPlacement rejects a duplicate in a peer', () => {
  const grid = new Array(81).fill(0);
  grid[1] = 5; // same row as index 0
  assert.equal(isValidPlacement(grid, 0, 5), false);
  assert.equal(isValidPlacement(grid, 0, 6), true);
});

import { solve, countSolutions } from '../src/solver.js';

// A known puzzle with a unique solution.
const PUZZLE = (
  '530070000' + '600195000' + '098000060' +
  '800060003' + '400803001' + '700020006' +
  '060000280' + '000419005' + '000080079'
).split('').map(Number);

const SOLUTION = (
  '534678912' + '672195348' + '198342567' +
  '859761423' + '426853791' + '713924856' +
  '961537284' + '287419635' + '345286179'
).split('').map(Number);

test('solve returns the correct unique solution', () => {
  const result = solve(PUZZLE);
  assert.deepEqual(result, SOLUTION);
});

test('countSolutions returns 1 for a unique puzzle', () => {
  assert.equal(countSolutions(PUZZLE, 2), 1);
});

test('countSolutions returns >= 2 for an empty grid', () => {
  assert.equal(countSolutions(new Array(81).fill(0), 2), 2);
});
