# Difficulty Differentiation & Equal Grid Rendering — Design

Date: 2026-06-25

## Problem

Two user-reported bugs:

1. **Easy / Medium / Difficult settings produce visually identical boards.** The
   difficulty selector is wired correctly and the generator does classify
   puzzles by solving technique, but every difficulty digs cells down to a
   near-minimal clue count (~24–25 givens). Since perceived Sudoku difficulty is
   dominated by the number of givens, all three levels look the same even though
   an "easy" board is technically singles-solvable.

   Measured clue counts (5 samples each):

   | Difficulty | Clue counts |
   |---|---|
   | Easy | 25, 24, 25, 25, 24 |
   | Medium | 24, 22, 23, 23, 24 |
   | Hard | 24, 23, 26, 24, 24 |

2. **Board sometimes renders with unequal rows/columns.** `.cell` elements are
   CSS grid items, which default to `min-width: auto` / `min-height: auto`. A
   track refuses to shrink below its content's intrinsic size, so a content-heavy
   cell (wrapped center pencil marks, large digits on a narrow viewport) grows
   past its `1fr` share and the other tracks shrink to compensate. This is why it
   is intermittent.

## Decisions

- Difficulty model: **clue-count target + technique ceiling** (not technique
  alone).
- Clue targets: **Easy 38 / Medium 30 / Hard 25** givens.

## Design

### Change 1 — Difficulty = clue target + technique ceiling (`src/generator.js`)

Define per-difficulty targets:

```js
const TARGET = {
  easy:   { level: 1, clues: 38 },
  medium: { level: 2, clues: 30 },
  hard:   { level: 3, clues: 25 },
};
```

`dig(solution, targetLevel, targetClues)`:

- Track the number of remaining clues (starts at 81).
- Walk all 81 cells in random order. For each cell:
  - Tentatively remove it.
  - If the puzzle is no longer uniquely solvable (`countSolutions(puzzle, 2) !== 1`),
    restore the cell and continue.
  - If `targetLevel < 3` (easy/medium) and removing the cell pushes the puzzle
    past the technique ceiling, restore the cell and continue. The ceiling check
    is the existing logic: `logicalSolve(puzzle, 1) ? 1 : logicalSolve(puzzle, 2, level2) ? 2 : 3`,
    rejected when `lvl > targetLevel`.
  - Otherwise keep the removal and decrement the clue count.
  - **Break out of the loop as soon as `clues <= targetClues`.**

`generatePuzzle(difficulty)`:

- Look up `{ level, clues }` from `TARGET`.
- Generate one solved grid, dig to target, and return
  `{ puzzle, solution, difficulty }` labelled by the **requested** difficulty.
- Remove the existing 40-attempt retry loop that required
  `classify(puzzle) === difficulty` and fell back to a mislabeled puzzle. Digging
  guarantees uniqueness at every step, so a single pass suffices. The clue floor,
  not an exact technique match, is now the primary difficulty lever.

Net effect: Easy ≈ 38 givens and singles-solvable; Medium ≈ 30 givens and never
needs more than pairs; Hard ≈ 25 givens with no technique ceiling. The boards are
visibly different.

Note: `dig` may stop above the target if it runs out of safely-removable cells.
That only makes a puzzle easier (more clues than target), which is acceptable.

### Change 2 — Equal grid cells (`src/styles.css`)

Add to the `.cell` rule:

```css
min-width: 0;
min-height: 0;
```

This lets every grid track honor its `1fr` share regardless of cell content,
fixing the intermittent unequal rows/columns.

### Change 3 — Update `tests/generator.test.js`

The exact `classify(puzzle) === difficulty` assertion no longer holds (a 30-clue
medium puzzle may still be singles-solvable). Replace it with the guarantees the
new model actually makes, per difficulty:

- `got === difficulty` (label by request) — unchanged.
- Puzzle is a subset of the solution and `countSolutions(puzzle, 2) === 1` —
  unchanged.
- Clue count meets the target: at or near the target and never below it (a small
  tolerance is acceptable since `dig` may stop early).
- Difficulty is not *harder* than the ceiling:
  - easy ⇒ `classify(puzzle) === 'easy'`
  - medium ⇒ `classify(puzzle) ∈ {'easy', 'medium'}`
  - hard ⇒ any uniquely-solvable puzzle (no ceiling assertion).

### Rebuild

Run `npm run build` to regenerate the single-file `sudoku.html` from `src/`.

## Out of scope

- No change to the solver, rating techniques, persistence, or UI wiring.
- No new solving techniques (e.g. X-wing) added to the rater.
