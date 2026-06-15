import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setValue, toggleMark } from '../src/gameState.js';
import { serialize, deserialize } from '../src/persist.js';

test('serialize -> deserialize round-trips the game', () => {
  const puzzle = new Array(81).fill(0);
  puzzle[0] = 5;
  const solution = new Array(81).fill(1);
  solution[0] = 5;
  const g = createGame({ puzzle, solution, difficulty: 'medium' });
  setValue(g, 1, 7);
  toggleMark(g, 'center', 2, 3);
  toggleMark(g, 'corner', 2, 8);
  g.elapsed = 42;

  const restored = deserialize(JSON.parse(JSON.stringify(serialize(g))));
  assert.equal(restored.difficulty, 'medium');
  assert.equal(restored.cells[1].value, 7);
  assert.deepEqual([...restored.cells[2].center], [3]);
  assert.deepEqual([...restored.cells[2].corner], [8]);
  assert.deepEqual(restored.solution, solution);
  assert.equal(restored.elapsed, 42);
});
