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
