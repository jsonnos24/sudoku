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
