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
  attachInput(() => state, boardEl, refresh, onChange);

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
