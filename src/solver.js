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
