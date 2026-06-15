import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setValue, toggleMark, erase, undo, redo } from '../src/gameState.js';

function newGame() {
  const puzzle = new Array(81).fill(0);
  puzzle[0] = 5; // a given
  const solution = new Array(81).fill(1); // dummy
  solution[0] = 5;
  return createGame({ puzzle, solution, difficulty: 'easy' });
}

test('createGame marks givens immutable and others empty', () => {
  const g = newGame();
  assert.equal(g.cells[0].value, 5);
  assert.equal(g.cells[0].given, true);
  assert.equal(g.cells[1].value, null);
  assert.equal(g.cells[1].given, false);
});

test('setValue ignores givens and sets non-givens', () => {
  const g = newGame();
  setValue(g, 0, 9);
  assert.equal(g.cells[0].value, 5); // unchanged
  setValue(g, 1, 7);
  assert.equal(g.cells[1].value, 7);
});

test('setValue toggles off when repeating the same value', () => {
  const g = newGame();
  setValue(g, 1, 7);
  setValue(g, 1, 7);
  assert.equal(g.cells[1].value, null);
});

test('toggleMark adds/removes center and corner marks', () => {
  const g = newGame();
  toggleMark(g, 'center', 1, 3);
  toggleMark(g, 'corner', 1, 8);
  assert.deepEqual([...g.cells[1].center], [3]);
  assert.deepEqual([...g.cells[1].corner], [8]);
  toggleMark(g, 'center', 1, 3);
  assert.deepEqual([...g.cells[1].center], []);
});

test('marks cannot be added to a cell with a value', () => {
  const g = newGame();
  setValue(g, 1, 7);
  toggleMark(g, 'center', 1, 3);
  assert.deepEqual([...g.cells[1].center], []);
});

test('erase clears a non-given cell', () => {
  const g = newGame();
  setValue(g, 1, 7);
  erase(g, 1);
  assert.equal(g.cells[1].value, null);
});

test('undo reverts the last move; redo reapplies it', () => {
  const g = newGame();
  setValue(g, 1, 7);
  setValue(g, 2, 4);
  undo(g);
  assert.equal(g.cells[2].value, null);
  assert.equal(g.cells[1].value, 7);
  undo(g);
  assert.equal(g.cells[1].value, null);
  redo(g);
  assert.equal(g.cells[1].value, 7);
});

test('undo with empty history is a no-op', () => {
  const g = newGame();
  undo(g); // should not throw
  assert.equal(g.cells[1].value, null);
});
