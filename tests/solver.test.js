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
