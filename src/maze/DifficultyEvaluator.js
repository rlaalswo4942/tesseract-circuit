// Structural metrics of a maze. Difficulty comes from graph shape, not cube size.

const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export function pathMetrics(maze, path) {
  const { topo } = maze;
  const faces = new Set();
  let transitions = 0;
  let revisits = 0;
  let turns = 0;
  const left = new Set();
  for (let i = 0; i < path.length; i++) {
    const f = topo.cells[path[i]].face;
    if (i > 0) {
      const pf = topo.cells[path[i - 1]].face;
      if (pf !== f) {
        transitions++;
        left.add(pf);
        if (left.has(f)) revisits++;
      }
    }
    faces.add(f);
    if (i > 0 && i < path.length - 1) {
      const arrive = topo.neighbor(path[i - 1], path[i]).arrive;
      const depart = topo.neighbor(path[i], path[i + 1]).dir;
      if (!same(arrive, depart)) turns++;
    }
  }
  return { length: path.length - 1, faces: [...faces].sort((a, b) => a - b), transitions, revisits, turns };
}

export function graphMetrics(maze) {
  let branches = 0;
  let deadEnds = 0;
  let edges = 0;
  for (const [id, set] of maze.adj) {
    const deg = set.size;
    edges += deg;
    const terminal = id === maze.start || id === maze.goal;
    branches += Math.max(0, deg - (terminal ? 1 : 2));
    if (deg === 1 && !terminal) deadEnds++;
  }
  edges /= 2;
  // Cyclomatic number for a connected graph = independent loops.
  const loops = edges - maze.adj.size + 1;
  return { circuitCells: maze.adj.size, branches, deadEnds, loops };
}

export function difficultyScore(m) {
  return (
    m.length +
    3 * m.transitions +
    0.5 * m.turns +
    2 * m.branches +
    1.5 * m.deadEnds +
    4 * m.requiredFaces +
    3 * m.loops +
    2 * m.revisits
  );
}

export function evaluate(maze, path) {
  const m = { ...pathMetrics(maze, path), ...graphMetrics(maze), requiredFaces: maze.requiredFaces.length };
  m.score = difficultyScore(m);
  return m;
}
