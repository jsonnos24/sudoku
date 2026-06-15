import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logicalSolve, classify, nakedPair, pointingPair, level2 } from '../src/rate.js';

const EASY = (
  '530070000' + '600195000' + '098000060' +
  '800060003' + '400803001' + '700020006' +
  '060000280' + '000419005' + '000080079'
).split('').map(Number);

test('logicalSolve(level 1) solves a singles-only puzzle', () => {
  assert.equal(logicalSolve(EASY, 1), true);
});

test('classify labels a singles-only puzzle easy', () => {
  assert.equal(classify(EASY), 'easy');
});

test('classify returns null for a non-unique (empty) grid', () => {
  assert.equal(classify(new Array(81).fill(0)), null);
});

test('level2 technique list is wired up', () => {
  assert.ok(Array.isArray(level2));
  assert.equal(level2.length, 2);
});

test('nakedPair eliminates the pair digits from other cells in a unit', () => {
  // Build candidate sets for row 0 by hand.
  const grid = new Array(81).fill(0);
  const cands = Array.from({ length: 81 }, () => new Set());
  cands[0] = new Set([1, 2]);
  cands[1] = new Set([1, 2]);
  cands[2] = new Set([1, 2, 3]); // should lose 1 and 2 -> {3}
  for (let c = 3; c < 9; c++) cands[c] = new Set([4]);
  const progress = nakedPair(grid, cands);
  assert.equal(progress, true);
  assert.deepEqual([...cands[2]], [3]);
});

test('nakedPair eliminates the pair digits from a box peer', () => {
  const grid = new Array(81).fill(0);
  const cands = Array.from({ length: 81 }, () => new Set());
  // Pair in cells 0 and 1 (same row AND same box 0)
  cands[0] = new Set([1, 2]);
  cands[1] = new Set([1, 2]);
  cands[10] = new Set([1, 2, 5]); // box 0, different row -> should lose 1 and 2 -> {5}
  const progress = nakedPair(grid, cands);
  assert.equal(progress, true);
  assert.deepEqual([...cands[10]], [5]);
});
