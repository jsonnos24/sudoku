# Sudoku Webapp — Design

**Date:** 2026-06-15
**Status:** Approved

## Overview

A single, self-contained HTML file implementing a playable Sudoku game with three
difficulty levels (Easy, Medium, Difficult), an on-the-fly puzzle generator, and a
two-layer pencil-mark notation system (corner marks + center marks) matching the
look of standard advanced Sudoku apps.

No server, no build step, no external runtime dependencies. The entire app ships as
one `.html` file with inline CSS and JS.

## Goals

- Fully playable Sudoku in one HTML file, opened directly in a browser.
- Three difficulty levels driven by required solving techniques.
- Two independent pencil-mark layers: **corner** and **center**.
- Works well on both desktop (keyboard-first) and touch (number pad), responsive.
- Quality-of-life features: mistake checking, hints, undo/redo/erase, timer & stats,
  auto-save.

## Non-Goals (YAGNI)

- No accounts, no backend, no online/multiplayer.
- No puzzle import/export or sharing codes (can revisit later).
- No theming system beyond the single light theme.
- No color-marking layer (just corner + center notes).

## Architecture

Vanilla HTML/CSS/JS in one file. No framework — a framework would require a build
step or a large CDN dependency, defeating the single-file goal.

The JS is organized into clearly separated, independently testable sections:

| Section | Responsibility |
| --- | --- |
| `solver` | Given a grid, count solutions / find the solution; report which techniques are needed. |
| `generator` | Produce a full solved grid, dig holes while keeping a unique solution, target a difficulty. |
| `gameState` | The 81-cell model, move history (undo/redo), current selection and input mode. |
| `render` | Draw the board and notes from `gameState` into the DOM. |
| `input` | Keyboard + touch/mouse event handling, translate into `gameState` actions. |
| `ui` | Controls (mode buttons, number pad, difficulty picker, timer, toggles), persistence. |

Logic sections (`solver`, `generator`, `gameState`) must not touch the DOM, so they
can be unit-tested in isolation.

## Data Model

### Cell

Each of the 81 cells is an object:

```
{
  value:   number | null,   // confirmed digit 1-9, or null
  given:   boolean,         // true for original clues (immutable)
  center:  Set<number>,     // center pencil marks
  corner:  Set<number>      // corner pencil marks
}
```

The board is a flat array of 81 cells (index = row*9 + col), plus a stored
`solution` grid (the unique solution) used by hints and check-against-solution.

### Display rules

- If `value` is set: show the big number, hide both note layers.
  - `given` cells render in black; user-entered values render in blue.
- If `value` is null: show corner and center marks together (both may be present).
- **Center marks:** digits grouped/centered in the middle of the cell, ascending.
- **Corner marks:** digits pinned to corners, filled in fixed order:
  top-left, top-right, bottom-left, bottom-right, top-center, bottom-center,
  middle-left, middle-right (supports up to 8–9 marks).
- Mistake highlighting (when enabled): conflicting values shown in a warning color.

## Input & Controls

Responsive layout supporting keyboard and touch equally.

### Modes

A mode selector chooses what a number entry does:
- **Normal** — place/replace the cell's confirmed value.
- **Corner** — toggle the digit in the corner-mark layer.
- **Center** — toggle the digit in the center-mark layer.
- **Erase** — clear value or notes from the selected cell.

### Desktop / keyboard

- Click a cell to select it; arrow keys move the selection.
- Number keys `1–9` apply per the current mode.
- Hotkeys switch mode (e.g. `N` normal, `C` corner, `Z`/`X` center) — exact keys
  finalized during implementation; a modifier-hold shortcut for quick note entry is
  acceptable.
- `Delete`/`Backspace` erases.

### Touch / mobile

- Tap a cell to select; tap the on-screen number pad to apply per mode.
- Mode buttons and number pad are large, thumb-friendly tap targets.

### Selection feedback

Selecting a cell highlights its row, column, and 3×3 box peers, and highlights all
cells sharing the selected cell's value.

### Auto-clear notes

When a confirmed value is placed, that digit is removed from the corner/center notes
of peer cells in the same row, column, and box. Controlled by a toggle (default on).

## Puzzle Generation & Difficulty

1. Build a complete valid solved grid (randomized).
2. Remove cells one at a time, after each removal verifying via `solver` that the
   puzzle still has exactly **one** solution. Reject removals that break uniqueness.
3. Rate difficulty by the hardest technique the `solver` must use to solve it:
   - **Easy** — solvable with naked/hidden singles only.
   - **Medium** — requires pairs / pointing pairs / box-line reduction.
   - **Difficult** — requires harder techniques (e.g. naked/hidden triples, X-Wing).
   - A clue-count range per difficulty acts as a guardrail.
4. Regenerate when the user picks "New Game" + a difficulty.

If generation for a target difficulty is slow, it retries within a reasonable budget
and falls back to the closest achievable rating.

## Features

- **Mistake checking** — toggle. Highlights entries that conflict with a peer in the
  same row/column/box. Optional secondary check that compares against the stored
  solution.
- **Hints** — button reveals the correct value (from the stored solution) for the
  currently selected cell.
- **Undo / Redo / Erase** — full move history; undo and redo step through it; erase
  clears the selected cell.
- **Timer & stats** — live game timer; best completion time per difficulty saved to
  `localStorage` and shown to the player.
- **Auto-save** — the current game (board, notes, timer, settings) is persisted to
  `localStorage` so reloading the page resumes in progress.

## Layout & Visual Style

- Centered 9×9 board with thin cell borders and bold borders separating the 3×3
  boxes.
- Light theme matching the reference: black given clues, blue user entries, smaller
  grey/blue pencil marks, a warning color for flagged mistakes.
- Control bar (mode buttons, number pad, difficulty picker, action buttons, timer,
  toggles) positioned below the board on narrow screens and beside it on wide
  screens.

## Testing

- Unit tests for DOM-free logic:
  - `solver` finds the correct unique solution and correctly counts solutions.
  - `generator` always produces puzzles with exactly one solution.
  - Difficulty rating matches the technique requirement.
  - Mistake detection flags the right cells.
- Manual / smoke verification of rendering, input modes, and responsive layout in a
  browser.

## Open Questions / Deferred

- Exact keyboard hotkey assignments (finalized in implementation).
- Whether to expose the auto-clear-notes toggle in the UI or keep it fixed-on.
