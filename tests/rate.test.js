import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logicalSolve, classify } from '../src/rate.js';

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
