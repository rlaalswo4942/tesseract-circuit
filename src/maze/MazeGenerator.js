import { createTopology } from './CubeTopology.js';
import { MazeGraph } from './MazeGraph.js';
import { validateMaze } from './MazeValidator.js';
import { pathMetrics } from './DifficultyEvaluator.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = next.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return next;
}

/**
 * "Growing tree" spanning tree over the whole cube surface. mix = 0 → pure DFS (long winding
 * corridors); mix → 1 → Prim-like (bushy, many short dead ends). Mixing the two per step makes the
 * texture irregular: corridors that suddenly break into thickets.
 */
export function spanningTree(topo, rng, mix = 0) {
  const tree = topo.cells.map(() => []);
  const visited = new Uint8Array(topo.cells.length);
  const root = rng.int(topo.cells.length);
  const active = [root];
  visited[root] = 1;
  while (active.length) {
    const i = mix > 0 && rng() < mix ? rng.int(active.length) : active.length - 1;
    const cur = active[i];
    const open = topo.cells[cur].neighbors.filter((n) => !visited[n.id]);
    if (!open.length) {
      active.splice(i, 1);
      continue;
    }
    const nb = open[rng.int(open.length)].id;
    visited[nb] = 1;
    tree[cur].push(nb);
    tree[nb].push(cur);
    active.push(nb);
  }
  return tree;
}

function pathFits(m, cfg) {
  const faceOk = cfg.requiredFaces >= 6 ? m.faces.length === 6 : m.faces.length === cfg.requiredFaces;
  return (
    faceOk &&
    m.transitions >= cfg.minFaceTransitions &&
    m.turns >= cfg.targetTurns &&
    m.revisits <= cfg.allowedFaceRevisits
  );
}

/** One attempt. Returns a MazeGraph or a failure-reason string. */
function tryBuild(topo, cfg, rng) {
  const tree = spanningTree(topo, rng, cfg.mix);
  const start = rng.int(topo.cells.length);

  // Tree distances from start.
  const parent = new Int32Array(topo.cells.length).fill(-2);
  const dist = new Int32Array(topo.cells.length);
  parent[start] = -1;
  const order = [start];
  for (let i = 0; i < order.length; i++) {
    for (const nb of tree[order[i]]) {
      if (parent[nb] !== -2) continue;
      parent[nb] = order[i];
      dist[nb] = dist[order[i]] + 1;
      order.push(nb);
    }
  }

  const scratch = new MazeGraph(topo);
  const candidates = rng.shuffle(order.filter((id) => dist[id] >= cfg.minSolutionLength && dist[id] <= cfg.maxSolutionLength));
  let solution = null;
  for (const goal of candidates.slice(0, 80)) {
    const path = [];
    for (let c = goal; c !== -1; c = parent[c]) path.push(c);
    path.reverse();
    if (pathFits(pathMetrics(scratch, path), cfg)) {
      solution = path;
      break;
    }
  }
  if (!solution) return 'no goal fits path constraints';

  const maze = new MazeGraph(topo);
  maze.start = start;
  maze.goal = solution[solution.length - 1];
  for (let i = 1; i < solution.length; i++) maze.connect(solution[i - 1], solution[i]);
  maze.requiredFaces = pathMetrics(maze, solution).faces;

  // Side branches: subtrees hanging off the solution, trimmed to branchDepth.
  const onPath = new Set(solution);
  const roots = [];
  for (const id of solution) for (const nb of tree[id]) if (!onPath.has(nb)) roots.push([id, nb]);
  rng.shuffle(roots);
  for (const [from, root] of roots.slice(0, cfg.targetBranches)) {
    maze.connect(from, root);
    const frontier = [[root, from, 1]];
    while (frontier.length) {
      const [cur, prev, depth] = frontier.pop();
      if (depth >= cfg.branchDepth) continue;
      for (const nb of tree[cur]) {
        if (nb === prev || onPath.has(nb)) continue;
        maze.connect(cur, nb);
        frontier.push([nb, cur, depth + 1]);
      }
    }
  }

  // Optional loops between lit cells: only kept if they create no shortcut / face bypass.
  if (cfg.loops > 0) {
    const pairs = [];
    for (const id of maze.adj.keys()) {
      for (const n of topo.cells[id].neighbors) {
        if (id < n.id && maze.isCircuit(n.id) && !maze.connected(id, n.id)) pairs.push([id, n.id]);
      }
    }
    rng.shuffle(pairs);
    let added = 0;
    for (const [a, b] of pairs) {
      if (added >= cfg.loops) break;
      maze.connect(a, b);
      if (validateMaze(maze, cfg).ok) added++;
      else maze.disconnect(a, b);
    }
  }
  return maze;
}

/**
 * Deterministic: same (cfg, seed) → same maze. Bounded: throws after maxAttempts with failure counts,
 * so a caller can fall back to a fixed maze instead of looping forever.
 */
export function generateMaze(cfg, seed, maxAttempts = 300) {
  // Every face change either enters a new face or re-enters an old one.
  if (cfg.minFaceTransitions > cfg.requiredFaces - 1 + cfg.allowedFaceRevisits) {
    const err = new Error('impossible config: minFaceTransitions > requiredFaces - 1 + allowedFaceRevisits');
    err.failures = { 'impossible transitions/revisits': 1 };
    throw err;
  }
  const topo = createTopology(cfg.gridSize);
  const failures = {};
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = mulberry32((seed * 2654435761 + attempt * 40503) >>> 0);
    const result = tryBuild(topo, cfg, rng);
    if (typeof result === 'string') {
      failures[result] = (failures[result] || 0) + 1;
      continue;
    }
    const v = validateMaze(result, cfg);
    if (v.ok) return { maze: result, attempt, metrics: v.metrics };
    for (const e of v.errors) failures[e] = (failures[e] || 0) + 1;
  }
  const err = new Error(`maze generation failed after ${maxAttempts} attempts: ${JSON.stringify(failures)}`);
  err.failures = failures;
  throw err;
}

/** Builds a maze from hand-written traces: { N, start:[face,row,col], goal, traces:[[[f,r,c],...],...] }. */
export function mazeFromData(data) {
  const topo = createTopology(data.N);
  const id = ([f, r, c]) => topo.cellAt(f, r, c);
  const maze = new MazeGraph(topo);
  for (const trace of data.traces) for (let i = 1; i < trace.length; i++) maze.connect(id(trace[i - 1]), id(trace[i]));
  maze.start = id(data.start);
  maze.goal = id(data.goal);
  maze.requiredFaces = pathMetrics(maze, maze.shortestPath()).faces;
  return maze;
}
