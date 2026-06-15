# Sudoku Webapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Sudoku game that ships as a single self-contained HTML file, with three difficulty levels, an on-the-fly generator, and two-layer (corner + center) pencil-mark notation.

**Architecture:** Core logic (solver, difficulty rater, generator, game state) is written as DOM-free ES modules in `src/` and unit-tested with Node's built-in test runner. Browser-only code (rendering, input, UI) lives in sibling modules. A small Node build script inlines every module + CSS into a single distributable `sudoku.html` — the build runs at dev time only; the shipped artifact needs no build step or server to run.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML, CSS. Node.js ≥ 18 for the test runner (`node --test`) and the build script. No third-party runtime or dev dependencies.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | `"type": "module"` + `test`/`build` scripts. |
| `src/solver.js` | Units/peers tables, placement validity, backtracking solver, solution counting. |
| `src/rate.js` | Candidate engine + human techniques (singles, naked pairs, pointing pairs); `classify(grid)`. |
| `src/generator.js` | Full solved-grid generator; hole-digging that preserves uniqueness and targets a difficulty. |
| `src/gameState.js` | 81-cell model, value/mark/erase actions, auto-clear, undo/redo, conflict & solution checks, hints. |
| `src/persist.js` | Serialize/deserialize game state to/from plain JSON (for `localStorage`). |
| `src/render.js` | Draw board + notes from state into the DOM (browser). |
| `src/input.js` | Keyboard/mouse/touch handling → game-state actions (browser). |
| `src/ui.js` | Controls, number pad, difficulty picker, timer, stats, toggles, persistence wiring (browser). |
| `src/styles.css` | All styling. |
| `index.html` | Dev entry: page skeleton + `<!--STYLES-->` / `<!--SCRIPT-->` markers, loads modules for local dev. |
| `build.js` | Node script that inlines modules + CSS into `sudoku.html`. |
| `tests/*.test.js` | Unit tests for the DOM-free modules. |

DOM-free modules (`solver`, `rate`, `generator`, `gameState`, `persist`) never import browser globals, so they run under `node --test`.

---

## Conventions used throughout

- A **grid** is a plain `Array(81)` of integers, `0` = empty, index `= row*9 + col`.
- A **cell** (in game state) is `{ value: number|null, given: boolean, center: Set<number>, corner: Set<number> }`.
- Difficulty strings: `'easy' | 'medium' | 'hard'`.

---

## Task 1: Project scaffolding + test runner

**Files:**
- Create: `package.json`
- Create: `tests/smoke.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sudoku-webapp",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "build": "node build.js"
  }
}
```

- [ ] **Step 2: Write a smoke test that proves the runner works**

`tests/smoke.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: Run it**

Run: `npm test`
Expected: PASS — 1 test passing.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/smoke.test.js
git commit -m "chore: scaffold project and test runner"
```

---

## Task 2: Solver — units, peers, placement validity

**Files:**
- Create: `src/solver.js`
- Test: `tests/solver.test.js`

- [ ] **Step 1: Write the failing test**

`tests/solver.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/solver.test.js`
Expected: FAIL — cannot find module `../src/solver.js`.

- [ ] **Step 3: Implement**

`src/solver.js`:
```js
export const N = 9;

export const units = (() => {
  const u = [];
  for (let r = 0; r < 9; r++) u.push([...Array(9)].map((_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) u.push([...Array(9)].map((_, r) => r * 9 + c));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) box.push((br * 3 + r) * 9 + (bc * 3 + c));
      u.push(box);
    }
  }
  return u;
})();

export const peers = (() => {
  const p = Array.from({ length: 81 }, () => new Set());
  for (const unit of units)
    for (const i of unit)
      for (const j of unit)
        if (i !== j) p[i].add(j);
  return p;
})();

export function isValidPlacement(grid, i, val) {
  for (const j of peers[i]) if (grid[j] === val) return false;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/solver.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/solver.js tests/solver.test.js
git commit -m "feat: solver units, peers and placement validity"
```

---

## Task 3: Solver — backtracking solve + solution counting

**Files:**
- Modify: `src/solver.js`
- Test: `tests/solver.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/solver.test.js`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/solver.test.js`
Expected: FAIL — `solve`/`countSolutions` not exported.

- [ ] **Step 3: Implement**

Append to `src/solver.js`:
```js
function pickCell(g) {
  let best = -1, bestCands = null;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const cands = [];
    for (let v = 1; v <= 9; v++) if (isValidPlacement(g, i, v)) cands.push(v);
    if (cands.length === 0) return { best: -2, cands: null }; // dead end
    if (bestCands === null || cands.length < bestCands.length) {
      best = i; bestCands = cands;
      if (cands.length === 1) break;
    }
  }
  return { best, cands: bestCands };
}

export function solve(grid) {
  const g = grid.slice();
  function rec() {
    const { best, cands } = pickCell(g);
    if (best === -2) return false;
    if (best === -1) return true; // no empties: solved
    for (const v of cands) {
      g[best] = v;
      if (rec()) return true;
      g[best] = 0;
    }
    return false;
  }
  return rec() ? g : null;
}

export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  function rec() {
    if (count >= limit) return;
    const { best, cands } = pickCell(g);
    if (best === -2) return;
    if (best === -1) { count++; return; }
    for (const v of cands) {
      g[best] = v;
      rec();
      g[best] = 0;
      if (count >= limit) return;
    }
  }
  rec();
  return count;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/solver.test.js`
Expected: PASS — all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/solver.js tests/solver.test.js
git commit -m "feat: backtracking solver and solution counting"
```

---

## Task 4: Difficulty rater — candidate engine + singles

**Files:**
- Create: `src/rate.js`
- Test: `tests/rate.test.js`

- [ ] **Step 1: Write failing tests**

`tests/rate.test.js`:
```js
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
```

> The `EASY` grid above is solvable with naked + hidden singles. If `logicalSolve(EASY, 1)` returns false during implementation, the puzzle is not actually singles-only — swap in a known easy puzzle; do not weaken the test.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/rate.test.js`
Expected: FAIL — `../src/rate.js` not found.

- [ ] **Step 3: Implement candidate engine + singles + classify**

`src/rate.js`:
```js
import { units, peers, countSolutions } from './solver.js';

function computeCandidates(grid) {
  const cands = Array.from({ length: 81 }, () => new Set());
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    for (let v = 1; v <= 9; v++) {
      let ok = true;
      for (const j of peers[i]) if (grid[j] === v) { ok = false; break; }
      if (ok) cands[i].add(v);
    }
  }
  return cands;
}

function place(grid, cands, i, v) {
  grid[i] = v;
  cands[i].clear();
  for (const j of peers[i]) cands[j].delete(v);
}

function nakedSingle(grid, cands) {
  let progress = false;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0 && cands[i].size === 1) {
      place(grid, cands, i, [...cands[i]][0]);
      progress = true;
    }
  }
  return progress;
}

function hiddenSingle(grid, cands) {
  let progress = false;
  for (const unit of units) {
    for (let v = 1; v <= 9; v++) {
      let spot = -1, count = 0;
      for (const i of unit) {
        if (grid[i] === 0 && cands[i].has(v)) { spot = i; count++; }
      }
      if (count === 1 && grid[spot] === 0) {
        place(grid, cands, spot, v);
        progress = true;
      }
    }
  }
  return progress;
}

const solved = (grid) => grid.every((v) => v !== 0);

// maxLevel 1 = singles only; 2 = singles + naked pairs + pointing pairs.
export function logicalSolve(grid, maxLevel, extra = null) {
  const g = grid.slice();
  const cands = computeCandidates(g);
  let progress = true;
  while (progress && !solved(g)) {
    progress = false;
    if (nakedSingle(g, cands)) { progress = true; continue; }
    if (hiddenSingle(g, cands)) { progress = true; continue; }
    if (maxLevel >= 2 && extra) {
      for (const technique of extra) {
        if (technique(g, cands)) { progress = true; break; }
      }
    }
  }
  return solved(g);
}

export function classify(grid) {
  if (logicalSolve(grid, 1)) return 'easy';
  // level-2 techniques are wired in Task 5 via `level2`
  if (level2 && logicalSolve(grid, 2, level2)) return 'medium';
  if (countSolutions(grid, 2) === 1) return 'hard';
  return null;
}

// Populated in Task 5.
export let level2 = null;
export function _setLevel2(techniques) { level2 = techniques; }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/rate.test.js`
Expected: PASS — 3 tests. (`level2` is `null` for now; `classify` falls through to the `hard`/`null` branches, which the current tests don't exercise.)

- [ ] **Step 5: Commit**

```bash
git add src/rate.js tests/rate.test.js
git commit -m "feat: candidate engine, singles, and difficulty classify"
```

---

## Task 5: Difficulty rater — naked pairs + pointing pairs (level 2)

**Files:**
- Modify: `src/rate.js`
- Test: `tests/rate.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/rate.test.js`:
```js
import { nakedPair, pointingPair, level2 } from '../src/rate.js';

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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/rate.test.js`
Expected: FAIL — `nakedPair`/`pointingPair`/`level2` not exported as expected (`level2` currently `null`).

- [ ] **Step 3: Implement the techniques and wire `level2`**

In `src/rate.js`, add these functions (above the `level2` declaration) and replace the `level2`/`_setLevel2` block:
```js
function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function nakedPair(grid, cands) {
  let progress = false;
  for (const unit of units) {
    const empties = unit.filter((i) => grid[i] === 0);
    for (let a = 0; a < empties.length; a++) {
      const ca = cands[empties[a]];
      if (ca.size !== 2) continue;
      for (let b = a + 1; b < empties.length; b++) {
        const cb = cands[empties[b]];
        if (cb.size === 2 && setEq(ca, cb)) {
          for (const i of unit) {
            if (i === empties[a] || i === empties[b] || grid[i] !== 0) continue;
            for (const v of ca) if (cands[i].delete(v)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

export function pointingPair(grid, cands) {
  let progress = false;
  for (let b = 0; b < 9; b++) {
    const box = units[18 + b];
    for (let v = 1; v <= 9; v++) {
      const spots = box.filter((i) => grid[i] === 0 && cands[i].has(v));
      if (spots.length < 2) continue;
      const rows = new Set(spots.map((i) => Math.floor(i / 9)));
      const cols = new Set(spots.map((i) => i % 9));
      if (rows.size === 1) {
        const r = [...rows][0];
        for (let c = 0; c < 9; c++) {
          const i = r * 9 + c;
          if (!box.includes(i) && grid[i] === 0 && cands[i].delete(v)) progress = true;
        }
      }
      if (cols.size === 1) {
        const c = [...cols][0];
        for (let r = 0; r < 9; r++) {
          const i = r * 9 + c;
          if (!box.includes(i) && grid[i] === 0 && cands[i].delete(v)) progress = true;
        }
      }
    }
  }
  return progress;
}
```

Then replace:
```js
// Populated in Task 5.
export let level2 = null;
export function _setLevel2(techniques) { level2 = techniques; }
```
with:
```js
export const level2 = [nakedPair, pointingPair];
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/rate.test.js`
Expected: PASS — all 5 tests in this file.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — every test green.

- [ ] **Step 6: Commit**

```bash
git add src/rate.js tests/rate.test.js
git commit -m "feat: naked-pair and pointing-pair techniques for medium rating"
```

---

## Task 6: Generator — full solved grid

**Files:**
- Create: `src/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Write failing test**

`tests/generator.test.js`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/generator.test.js`
Expected: FAIL — `../src/generator.js` not found.

- [ ] **Step 3: Implement**

`src/generator.js`:
```js
import { isValidPlacement, countSolutions } from './solver.js';
import { classify } from './rate.js';

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
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/generator.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/generator.js tests/generator.test.js
git commit -m "feat: full solved-grid generator"
```

---

## Task 7: Generator — dig holes and target a difficulty

**Files:**
- Modify: `src/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/generator.test.js`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/generator.test.js`
Expected: FAIL — `generatePuzzle` not exported.

- [ ] **Step 3: Implement**

Append to `src/generator.js`:
```js
const TARGET_LEVEL = { easy: 1, medium: 2, hard: 3 };
const levelOf = (cls) => (cls === 'easy' ? 1 : cls === 'medium' ? 2 : cls === 'hard' ? 3 : 99);

function dig(solution, targetLevel) {
  const puzzle = solution.slice();
  for (const i of shuffled([...Array(81).keys()])) {
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = backup;
      continue;
    }
    if (targetLevel < 3 && levelOf(classify(puzzle)) > targetLevel) {
      puzzle[i] = backup;
    }
  }
  return puzzle;
}

export function generatePuzzle(difficulty) {
  const targetLevel = TARGET_LEVEL[difficulty];
  let last = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = generateSolved();
    const puzzle = dig(solution, targetLevel);
    const got = classify(puzzle);
    last = { puzzle, solution, difficulty: got };
    if (got === difficulty) return last;
  }
  // Fallback: return the closest attempt we produced, labelled by its real class.
  return last;
}
```

> Note on `hard`: digging with `targetLevel === 3` only enforces uniqueness, so most results classify as `hard` (not solvable by singles/pairs). The retry loop re-rolls until `classify` matches exactly; 40 attempts is ample. If a difficulty is flaky in practice, widen the loop — do not relax the test.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/generator.test.js`
Expected: PASS — all generator tests (may take a few seconds for `hard`).

- [ ] **Step 5: Commit**

```bash
git add src/generator.js tests/generator.test.js
git commit -m "feat: difficulty-targeted puzzle generation"
```

---

## Task 8: Game state — model, value, marks, erase

**Files:**
- Create: `src/gameState.js`
- Test: `tests/gameState.test.js`

- [ ] **Step 1: Write failing tests**

`tests/gameState.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setValue, toggleMark, erase } from '../src/gameState.js';

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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/gameState.test.js`
Expected: FAIL — `../src/gameState.js` not found.

- [ ] **Step 3: Implement**

`src/gameState.js`:
```js
import { peers } from './solver.js';

export function createGame({ puzzle, solution, difficulty }) {
  const cells = puzzle.map((v) => ({
    value: v === 0 ? null : v,
    given: v !== 0,
    center: new Set(),
    corner: new Set(),
  }));
  return {
    cells,
    solution,
    difficulty,
    selected: null,
    mode: 'normal', // 'normal' | 'corner' | 'center'
    history: [],
    future: [],
    autoClear: true,
  };
}

function cloneCells(cells) {
  return cells.map((c) => ({
    value: c.value,
    given: c.given,
    center: new Set(c.center),
    corner: new Set(c.corner),
  }));
}

function pushHistory(state) {
  state.history.push(cloneCells(state.cells));
  if (state.history.length > 300) state.history.shift();
  state.future = [];
}

export function setValue(state, i, v) {
  const cell = state.cells[i];
  if (cell.given) return;
  pushHistory(state);
  if (cell.value === v) {
    cell.value = null;
    return;
  }
  cell.value = v;
  cell.center.clear();
  cell.corner.clear();
  if (state.autoClear) {
    for (const j of peers[i]) {
      state.cells[j].center.delete(v);
      state.cells[j].corner.delete(v);
    }
  }
}

export function toggleMark(state, layer, i, v) {
  const cell = state.cells[i];
  if (cell.given || cell.value !== null) return;
  pushHistory(state);
  const set = cell[layer];
  if (set.has(v)) set.delete(v);
  else set.add(v);
}

export function erase(state, i) {
  const cell = state.cells[i];
  if (cell.given) return;
  pushHistory(state);
  cell.value = null;
  cell.center.clear();
  cell.corner.clear();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/gameState.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/gameState.js tests/gameState.test.js
git commit -m "feat: game state model with value, marks, and erase"
```

---

## Task 9: Game state — undo/redo

**Files:**
- Modify: `src/gameState.js`
- Test: `tests/gameState.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/gameState.test.js`:
```js
import { undo, redo } from '../src/gameState.js';

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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/gameState.test.js`
Expected: FAIL — `undo`/`redo` not exported.

- [ ] **Step 3: Implement**

Append to `src/gameState.js`:
```js
export function undo(state) {
  if (state.history.length === 0) return;
  state.future.push(cloneCells(state.cells));
  state.cells = state.history.pop();
}

export function redo(state) {
  if (state.future.length === 0) return;
  state.history.push(cloneCells(state.cells));
  state.cells = state.future.pop();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/gameState.test.js`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/gameState.js tests/gameState.test.js
git commit -m "feat: undo/redo history"
```

---

## Task 10: Game state — conflicts, wrong-cell check, completion, hint

**Files:**
- Modify: `src/gameState.js`
- Test: `tests/gameState.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/gameState.test.js`:
```js
import { findConflicts, findWrong, isComplete, hint } from '../src/gameState.js';

test('findConflicts flags both cells of a duplicate in a row', () => {
  const g = newGame();
  setValue(g, 1, 9);
  setValue(g, 2, 9); // same row as cell 1
  const bad = findConflicts(g);
  assert.ok(bad.has(1) && bad.has(2));
});

test('findWrong flags values that disagree with the solution', () => {
  const g = newGame(); // dummy solution is all 1s (except cell 0 = 5)
  setValue(g, 1, 7); // solution[1] is 1, so 7 is wrong
  const wrong = findWrong(g);
  assert.ok(wrong.has(1));
});

test('hint fills the selected cell with the solution value', () => {
  const g = newGame();
  hint(g, 1); // solution[1] = 1
  assert.equal(g.cells[1].value, 1);
});

test('isComplete is true only when every value matches the solution', () => {
  const puzzle = new Array(81).fill(0);
  const solution = new Array(81).fill(1);
  const g = createGame({ puzzle, solution, difficulty: 'easy' });
  assert.equal(isComplete(g), false);
  for (let i = 0; i < 81; i++) g.cells[i].value = 1;
  assert.equal(isComplete(g), true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/gameState.test.js`
Expected: FAIL — `findConflicts`/`findWrong`/`isComplete`/`hint` not exported.

- [ ] **Step 3: Implement**

Append to `src/gameState.js`:
```js
export function findConflicts(state) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    const v = state.cells[i].value;
    if (v == null) continue;
    for (const j of peers[i]) {
      if (state.cells[j].value === v) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export function findWrong(state) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    const v = state.cells[i].value;
    if (v != null && v !== state.solution[i]) bad.add(i);
  }
  return bad;
}

export function isComplete(state) {
  return state.cells.every((c, i) => c.value === state.solution[i]);
}

export function hint(state, i) {
  const cell = state.cells[i];
  if (cell.given || cell.value === state.solution[i]) return;
  pushHistory(state);
  cell.value = state.solution[i];
  cell.center.clear();
  cell.corner.clear();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/gameState.test.js`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/gameState.js tests/gameState.test.js
git commit -m "feat: conflict/solution checks, completion, and hints"
```

---

## Task 11: Persistence — serialize/deserialize state

**Files:**
- Create: `src/persist.js`
- Test: `tests/persist.test.js`

- [ ] **Step 1: Write failing test**

`tests/persist.test.js`:
```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/persist.test.js`
Expected: FAIL — `../src/persist.js` not found.

- [ ] **Step 3: Implement**

`src/persist.js`:
```js
export function serialize(state) {
  return {
    difficulty: state.difficulty,
    solution: state.solution,
    elapsed: state.elapsed ?? 0,
    autoClear: state.autoClear,
    cells: state.cells.map((c) => ({
      value: c.value,
      given: c.given,
      center: [...c.center],
      corner: [...c.corner],
    })),
  };
}

export function deserialize(data) {
  return {
    difficulty: data.difficulty,
    solution: data.solution,
    elapsed: data.elapsed ?? 0,
    autoClear: data.autoClear ?? true,
    selected: null,
    mode: 'normal',
    history: [],
    future: [],
    cells: data.cells.map((c) => ({
      value: c.value,
      given: c.given,
      center: new Set(c.center),
      corner: new Set(c.corner),
    })),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/persist.test.js`
Expected: PASS — 1 test.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/persist.js tests/persist.test.js
git commit -m "feat: game-state serialization for localStorage"
```

---

## Task 12: Styling

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: Write the stylesheet**

`src/styles.css`:
```css
:root {
  --given: #1a1a1a;
  --entry: #2563eb;
  --mark: #555;
  --bad: #dc2626;
  --sel: #cfe3ff;
  --peer: #e8eef7;
  --same: #bcd4ff;
  --line: #b9b9b9;
  --box: #444;
  --bg: #f7f7f8;
}
* { box-sizing: border-box; }
body {
  margin: 0; font-family: system-ui, sans-serif; background: var(--bg);
  color: #111; display: flex; justify-content: center;
}
.app {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 16px; width: 100%; max-width: 920px;
}
.topbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center; }
.topbar select, .topbar button { font-size: 15px; padding: 6px 12px; }
.timer { font-variant-numeric: tabular-nums; font-weight: 600; }
.layout { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; align-items: flex-start; }

.board {
  display: grid; grid-template-columns: repeat(9, 1fr);
  width: min(92vw, 540px); aspect-ratio: 1;
  border: 3px solid var(--box); background: var(--box); gap: 1px;
  touch-action: manipulation;
}
.cell {
  position: relative; background: #fff; display: flex;
  align-items: center; justify-content: center; cursor: pointer;
  user-select: none; font-size: clamp(18px, 5.2vw, 30px);
}
/* thick box separators */
.cell.bt { border-top: 2px solid var(--box); }
.cell.bl { border-left: 2px solid var(--box); }
.cell.value-given { color: var(--given); font-weight: 600; }
.cell.value-entry { color: var(--entry); }
.cell.sel { background: var(--sel); }
.cell.peer { background: var(--peer); }
.cell.same { background: var(--same); }
.cell.bad { color: var(--bad); }

.center-marks {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; flex-wrap: wrap; gap: 0 3px;
  font-size: clamp(9px, 2.4vw, 13px); color: var(--mark); padding: 2px;
  line-height: 1.1;
}
.corner-marks {
  position: absolute; inset: 3px; display: grid;
  grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
  font-size: clamp(9px, 2.4vw, 13px); color: var(--mark); pointer-events: none;
}
.corner-marks span { display: flex; align-items: center; justify-content: center; }
/* corner fill order: TL, TR, BL, BR, TC, BC, ML, MR */
.corner-marks .p0 { grid-area: 1 / 1; justify-content: flex-start; align-items: flex-start; }
.corner-marks .p1 { grid-area: 1 / 3; justify-content: flex-end; align-items: flex-start; }
.corner-marks .p2 { grid-area: 3 / 1; justify-content: flex-start; align-items: flex-end; }
.corner-marks .p3 { grid-area: 3 / 3; justify-content: flex-end; align-items: flex-end; }
.corner-marks .p4 { grid-area: 1 / 2; align-items: flex-start; }
.corner-marks .p5 { grid-area: 3 / 2; align-items: flex-end; }
.corner-marks .p6 { grid-area: 2 / 1; justify-content: flex-start; }
.corner-marks .p7 { grid-area: 2 / 3; justify-content: flex-end; }

.controls { display: flex; flex-direction: column; gap: 12px; }
.modes, .actions { display: flex; gap: 8px; flex-wrap: wrap; }
.modes button.active { background: var(--entry); color: #fff; }
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.numpad button { font-size: 22px; padding: 14px; min-width: 56px; cursor: pointer; }
button { cursor: pointer; border: 1px solid #bbb; border-radius: 6px; background: #fff; }
.toggles { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.win { font-weight: 700; color: #15803d; }

@media (max-width: 620px) {
  .layout { flex-direction: column; align-items: center; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: stylesheet for board, marks, and controls"
```

---

## Task 13: Rendering

**Files:**
- Create: `src/render.js`

This module is browser-only (touches the DOM) and is verified manually after Task 16. It exposes one function, `render(state, root, flags)`, that rebuilds the board.

- [ ] **Step 1: Implement `render.js`**

`src/render.js`:
```js
import { findConflicts, findWrong } from './gameState.js';

const CORNER_ORDER = [0, 1, 2, 3, 4, 5, 6, 7]; // index into the 8 placed slots

export function render(state, root, flags = {}) {
  const conflicts = findConflicts(state);
  const wrong = flags.checkWrong ? findWrong(state) : new Set();
  const sel = state.selected;
  const selVal = sel != null ? state.cells[sel].value : null;
  const peerSet = sel != null ? peersForHighlight(sel) : null;

  root.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = state.cells[i];
    const row = Math.floor(i / 9);
    const col = i % 9;
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.index = String(i);
    if (row % 3 === 0) el.classList.add('bt');
    if (col % 3 === 0) el.classList.add('bl');

    if (sel != null) {
      if (i === sel) el.classList.add('sel');
      else if (peerSet.has(i)) el.classList.add('peer');
      if (selVal != null && cell.value === selVal && i !== sel) el.classList.add('same');
    }

    if (cell.value != null) {
      el.textContent = String(cell.value);
      el.classList.add(cell.given ? 'value-given' : 'value-entry');
      if (conflicts.has(i) || wrong.has(i)) el.classList.add('bad');
    } else {
      if (cell.corner.size) {
        const wrap = document.createElement('div');
        wrap.className = 'corner-marks';
        const digits = [...cell.corner].sort((a, b) => a - b);
        digits.slice(0, 8).forEach((d, slot) => {
          const s = document.createElement('span');
          s.className = 'p' + CORNER_ORDER[slot];
          s.textContent = String(d);
          wrap.appendChild(s);
        });
        el.appendChild(wrap);
      }
      if (cell.center.size) {
        const wrap = document.createElement('div');
        wrap.className = 'center-marks';
        wrap.textContent = [...cell.center].sort((a, b) => a - b).join('');
        el.appendChild(wrap);
      }
    }
    root.appendChild(el);
  }
}

function peersForHighlight(i) {
  // row, col, box of i (excluding i itself)
  const set = new Set();
  const r = Math.floor(i / 9), c = i % 9;
  for (let k = 0; k < 9; k++) { set.add(r * 9 + k); set.add(k * 9 + c); }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) set.add((br + dr) * 9 + (bc + dc));
  set.delete(i);
  return set;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render.js
git commit -m "feat: board rendering with two-layer pencil marks"
```

---

## Task 14: Input handling

**Files:**
- Create: `src/input.js`

Browser-only; verified manually after Task 16. Wires DOM events to game-state actions, then calls a supplied `refresh()` callback.

- [ ] **Step 1: Implement `input.js`**

`src/input.js`:
```js
import { setValue, toggleMark, erase, undo, redo } from './gameState.js';

const MODE_LAYER = { corner: 'corner', center: 'center' };

export function applyDigit(state, v) {
  const i = state.selected;
  if (i == null) return;
  if (state.mode === 'normal') setValue(state, i, v);
  else toggleMark(state, MODE_LAYER[state.mode], i, v);
}

export function attachInput(state, boardEl, refresh, onChange) {
  const changed = () => { refresh(); onChange && onChange(); };

  boardEl.addEventListener('click', (e) => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    state.selected = Number(cellEl.dataset.index);
    refresh();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      applyDigit(state, Number(e.key));
      changed();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (state.selected != null) { erase(state, state.selected); changed(); }
      return;
    }
    if (state.selected != null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      state.selected = moveSelection(state.selected, e.key);
      refresh();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'n') { state.mode = 'normal'; refresh(); }
    else if (k === 'c') { state.mode = 'corner'; refresh(); }
    else if (k === 'x' || k === 'm') { state.mode = 'center'; refresh(); }
    else if (k === 'z' && (e.ctrlKey || e.metaKey)) { undo(state); changed(); }
    else if (k === 'y' && (e.ctrlKey || e.metaKey)) { redo(state); changed(); }
  });
}

function moveSelection(i, key) {
  let r = Math.floor(i / 9), c = i % 9;
  if (key === 'ArrowUp') r = (r + 8) % 9;
  if (key === 'ArrowDown') r = (r + 1) % 9;
  if (key === 'ArrowLeft') c = (c + 8) % 9;
  if (key === 'ArrowRight') c = (c + 1) % 9;
  return r * 9 + c;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/input.js
git commit -m "feat: keyboard and click input handling"
```

---

## Task 15: UI wiring (controls, timer, stats, persistence)

**Files:**
- Create: `src/ui.js`
- Create: `index.html`

Browser-only; verified manually after the build in Task 16.

- [ ] **Step 1: Implement `ui.js`**

`src/ui.js`:
```js
import { generatePuzzle } from './generator.js';
import { createGame, undo, redo, erase, hint, isComplete } from './gameState.js';
import { applyDigit, attachInput } from './input.js';
import { render } from './render.js';
import { serialize, deserialize } from './persist.js';

const SAVE_KEY = 'sudoku.save.v1';
const STATS_KEY = 'sudoku.stats.v1';

let state = null;
let flags = { checkWrong: false };
let timerId = null;
let boardEl, timerEl, statusEl;

function refresh() {
  render(state, boardEl, flags);
  document.querySelectorAll('.modes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
}

function onChange() {
  save();
  if (isComplete(state)) win();
}

function save() {
  const data = serialize(state);
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    state.elapsed = (state.elapsed ?? 0) + 1;
    renderTimer();
    if (state.elapsed % 5 === 0) save();
  }, 1000);
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
function renderTimer() {
  const t = state.elapsed ?? 0;
  const m = String(Math.floor(t / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

function win() {
  stopTimer();
  statusEl.textContent = `Solved in ${timerEl.textContent}!`;
  statusEl.className = 'win';
  recordBest(state.difficulty, state.elapsed ?? 0);
}

function recordBest(difficulty, elapsed) {
  const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  if (stats[difficulty] == null || elapsed < stats[difficulty]) {
    stats[difficulty] = elapsed;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }
}

function newGame(difficulty) {
  const { puzzle, solution } = generatePuzzle(difficulty);
  state = createGame({ puzzle, solution, difficulty });
  state.elapsed = 0;
  statusEl.textContent = '';
  statusEl.className = '';
  refresh();
  renderTimer();
  startTimer();
  save();
}

function restoreOrNew() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      state = deserialize(JSON.parse(raw));
      refresh();
      renderTimer();
      if (!isComplete(state)) startTimer();
      return;
    } catch { /* fall through to a fresh game */ }
  }
  newGame('easy');
}

export function init(root) {
  root.innerHTML = `
    <div class="topbar">
      <label>Difficulty
        <select id="difficulty">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Difficult</option>
        </select>
      </label>
      <button id="new">New Game</button>
      <span class="timer" id="timer">00:00</span>
      <span id="status"></span>
    </div>
    <div class="layout">
      <div class="board" id="board"></div>
      <div class="controls">
        <div class="modes">
          <button data-mode="normal">Normal</button>
          <button data-mode="corner">Corner</button>
          <button data-mode="center">Center</button>
        </div>
        <div class="numpad" id="numpad">
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-num="${n}">${n}</button>`).join('')}
        </div>
        <div class="actions">
          <button id="undo">Undo</button>
          <button id="redo">Redo</button>
          <button id="erase">Erase</button>
          <button id="hint">Hint</button>
        </div>
        <div class="toggles">
          <label><input type="checkbox" id="checkWrong"> Highlight mistakes</label>
        </div>
      </div>
    </div>`;

  boardEl = root.querySelector('#board');
  timerEl = root.querySelector('#timer');
  statusEl = root.querySelector('#status');

  restoreOrNew();
  attachInput(state, boardEl, refresh, onChange);

  root.querySelector('#new').addEventListener('click', () => {
    newGame(root.querySelector('#difficulty').value);
  });
  root.querySelector('#difficulty').value = state.difficulty;
  root.querySelector('#numpad').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    applyDigit(state, Number(btn.dataset.num));
    refresh(); onChange();
  });
  root.querySelectorAll('.modes button').forEach((b) => {
    b.addEventListener('click', () => { state.mode = b.dataset.mode; refresh(); });
  });
  root.querySelector('#undo').addEventListener('click', () => { undo(state); refresh(); onChange(); });
  root.querySelector('#redo').addEventListener('click', () => { redo(state); refresh(); onChange(); });
  root.querySelector('#erase').addEventListener('click', () => {
    if (state.selected != null) { erase(state, state.selected); refresh(); onChange(); }
  });
  root.querySelector('#hint').addEventListener('click', () => {
    if (state.selected != null) { hint(state, state.selected); refresh(); onChange(); }
  });
  root.querySelector('#checkWrong').addEventListener('change', (e) => {
    flags.checkWrong = e.target.checked; refresh();
  });
}
```

> Note: `attachInput` is called once with the initial `state` object, but `newGame` reassigns the module-level `state`. Because `undo`/`redo` reassign `state.cells` (not `state` itself) and `newGame` replaces the whole object, the input handler closes over the *variable* via the functions that read `state` — to keep this correct, the keyboard handler in `input.js` reads from the `state` reference passed in. After `newGame`, re-attach is unnecessary for clicks/keys because those handlers reference the live module-level `state` through the closure in `ui.js`? They do not. **Therefore:** in `input.js`, the handlers must read the current state. Handle this by having `ui.js` own input instead — see Step 2.

- [ ] **Step 2: Fix the state-reference issue — route input through a getter**

Replace `attachInput(state, ...)` usage: change `src/input.js` `attachInput` signature to take a `getState` function, and update `ui.js` accordingly.

In `src/input.js`, change the signature and every `state` reference inside the listeners to use `getState()`:
```js
export function attachInput(getState, boardEl, refresh, onChange) {
  const changed = () => { refresh(); onChange && onChange(); };

  boardEl.addEventListener('click', (e) => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;
    getState().selected = Number(cellEl.dataset.index);
    refresh();
  });

  document.addEventListener('keydown', (e) => {
    const state = getState();
    if (e.key >= '1' && e.key <= '9') { applyDigit(state, Number(e.key)); changed(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (state.selected != null) { erase(state, state.selected); changed(); }
      return;
    }
    if (state.selected != null && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      state.selected = moveSelection(state.selected, e.key);
      refresh();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'n') { state.mode = 'normal'; refresh(); }
    else if (k === 'c') { state.mode = 'corner'; refresh(); }
    else if (k === 'x' || k === 'm') { state.mode = 'center'; refresh(); }
    else if (k === 'z' && (e.ctrlKey || e.metaKey)) { undo(state); changed(); }
    else if (k === 'y' && (e.ctrlKey || e.metaKey)) { redo(state); changed(); }
  });
}
```

In `src/ui.js`, change the call to:
```js
  attachInput(() => state, boardEl, refresh, onChange);
```
and delete the long note from Step 1 (it described the bug now fixed). `applyDigit` keeps its `(state, v)` signature and is still called directly from the numpad handler.

- [ ] **Step 3: Create the dev entry `index.html`**

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sudoku</title>
  <!--STYLES--><link rel="stylesheet" href="src/styles.css"><!--/STYLES-->
</head>
<body>
  <div class="app" id="app"></div>
  <!--SCRIPT--><script type="module">
    import { init } from './src/ui.js';
    init(document.getElementById('app'));
  </script><!--/SCRIPT-->
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/ui.js src/input.js index.html
git commit -m "feat: UI wiring, timer, stats, and persistence"
```

---

## Task 16: Build script → single `sudoku.html`, then manual verification

**Files:**
- Create: `build.js`

- [ ] **Step 1: Implement the build script**

`build.js`:
```js
import { readFileSync, writeFileSync } from 'node:fs';

// Dependency order matters: dependencies before dependents.
const MODULE_ORDER = [
  'src/solver.js',
  'src/rate.js',
  'src/generator.js',
  'src/gameState.js',
  'src/persist.js',
  'src/render.js',
  'src/input.js',
  'src/ui.js',
];

function stripModuleSyntax(code) {
  return code
    .split('\n')
    .filter((line) => !/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(line))
    .map((line) => line.replace(/^\s*export\s+(const|function|let|class)\s/, '$1 '))
    .join('\n');
}

const bundledJs = MODULE_ORDER
  .map((f) => `// ===== ${f} =====\n${stripModuleSyntax(readFileSync(f, 'utf8'))}`)
  .join('\n\n');

const css = readFileSync('src/styles.css', 'utf8');

const script = `(() => {\n${bundledJs}\n\ninit(document.getElementById('app'));\n})();`;

const html = readFileSync('index.html', 'utf8')
  .replace(/<!--STYLES-->[\s\S]*?<!--\/STYLES-->/, `<style>\n${css}\n</style>`)
  .replace(/<!--SCRIPT-->[\s\S]*?<!--\/SCRIPT-->/, `<script>\n${script}\n</script>`);

writeFileSync('sudoku.html', html);
console.log('Wrote sudoku.html');
```

> Why this works: every module uses `export` only as a leading keyword (`export const`/`export function`/`export let`) and all `import` lines match the stripped pattern, so concatenating in dependency order yields valid script-scope declarations. The IIFE keeps names off `window`. If a future edit adds `export { foo }` or a default export, extend `stripModuleSyntax` to handle it.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: `Wrote sudoku.html`, and `sudoku.html` exists at the repo root.

- [ ] **Step 3: Verify there is no leftover module syntax in the bundle**

Run: `grep -nE "^\s*(import |export )" sudoku.html || echo "clean"`
Expected: `clean` (no matches).

- [ ] **Step 4: Manual smoke test in a browser**

Open `sudoku.html` directly (double-click, or `open sudoku.html` on macOS). Verify:
- A puzzle renders with bold 3×3 box borders; givens are black.
- Selecting a cell highlights its row/column/box; cells sharing its value highlight.
- Normal mode + number key (and numpad) places a blue entry; repeating it clears it.
- Corner mode places digits in cell corners (TL, TR, BL, BR, then edges); Center mode groups digits in the middle; both can show together.
- Placing a value clears that digit from peer notes.
- Undo/Redo/Erase/Hint work; "Highlight mistakes" turns conflicting/wrong entries red.
- Timer counts up; "New Game" + difficulty regenerates; reloading the page resumes the saved game.
- Resize the window narrow: controls stack below the board and stay usable (touch targets large).

- [ ] **Step 5: Commit**

```bash
git add build.js sudoku.html
git commit -m "feat: build single-file sudoku.html and verify in browser"
```

---

## Task 17: README and final full-suite check

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

`README.md`:
```markdown
# Sudoku

A single-file Sudoku game. Open `sudoku.html` in any browser — no server, no install.

## Play
- **Difficulty:** Easy / Medium / Difficult, generated fresh each game.
- **Modes:** Normal (place a number), Corner and Center (two independent pencil-mark layers).
- **Keyboard:** click a cell, `1-9` to enter, arrows to move, `N`/`C`/`X` to switch modes, `Backspace` to erase, Ctrl/Cmd+`Z`/`Y` to undo/redo.
- **Touch:** tap a cell, then the on-screen number pad and mode buttons.
- Mistake highlighting, hints, undo/redo, timer, and best-time stats are built in. Your game auto-saves.

## Develop
- `npm test` — run the logic unit tests (`node --test`).
- `npm run build` — rebuild `sudoku.html` from `src/` and `index.html`.

Core logic lives in DOM-free modules under `src/` (`solver`, `rate`, `generator`, `gameState`, `persist`) and is unit-tested. `render`/`input`/`ui` are browser code. `build.js` inlines everything into `sudoku.html`.
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — every test across all files.

- [ ] **Step 3: Rebuild to ensure the artifact is current**

Run: `npm run build`
Expected: `Wrote sudoku.html`.

- [ ] **Step 4: Commit**

```bash
git add README.md sudoku.html
git commit -m "docs: add README"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** two-layer notation (Tasks 8, 13), corner fill order (Task 12 CSS + Task 13), three difficulties via techniques (Tasks 4–5, 7), on-the-fly generation (Tasks 6–7), keyboard+touch (Tasks 14–15), mistake checking (Tasks 10, 15), hints (Task 10), undo/redo/erase (Tasks 9, 15), timer & stats (Task 15), auto-save (Tasks 11, 15), single-file build (Task 16), responsive layout (Task 12).
- **Auto-clear-notes:** implemented as `state.autoClear` (default on). Per the spec's open question it is left fixed-on (no UI toggle); add a checkbox in Task 15's `.toggles` later if desired.
- **Naming consistency:** `setValue`, `toggleMark(state, layer, i, v)`, `erase`, `undo`, `redo`, `findConflicts`, `findWrong`, `isComplete`, `hint`, `serialize`/`deserialize`, `generatePuzzle`, `classify`, `logicalSolve`, `render(state, root, flags)`, `attachInput(getState, …)`, `applyDigit(state, v)` are used consistently across tasks.
```
