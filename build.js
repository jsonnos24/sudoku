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
