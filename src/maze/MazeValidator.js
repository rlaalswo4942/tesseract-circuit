import { evaluate } from './DifficultyEvaluator.js';

/**
 * Validates a maze against a difficulty config (optional). Checks every route, not just one solution:
 * shortest path length, and that each required face is unavoidable (removing it disconnects start/goal).
 */
export function validateMaze(maze, cfg = null) {
  const errors = [];
  const { topo, start, goal } = maze;

  if (!maze.isCircuit(start)) errors.push('start missing');
  if (!maze.isCircuit(goal)) errors.push('goal missing');
  if (start === goal) errors.push('start equals goal');
  if (errors.length) return { ok: false, errors, metrics: null };

  for (const [a, set] of maze.adj) {
    for (const b of set) {
      if (!maze.adj.get(b)?.has(a)) errors.push(`asymmetric edge ${a}-${b}`);
      if (!topo.neighbor(a, b)) errors.push(`non-adjacent edge ${a}-${b}`);
    }
  }

  // No orphan circuit islands: everything lit must be reachable from start.
  const seen = new Set([start]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    for (const nb of maze.adj.get(queue[i])) if (!seen.has(nb)) seen.add(nb), queue.push(nb);
  }
  if (seen.size !== maze.adj.size) errors.push(`disconnected circuit (${maze.adj.size - seen.size} cells)`);

  const shortest = maze.shortestPath();
  if (!shortest) {
    errors.push('no solution');
    return { ok: false, errors, metrics: null };
  }

  const endFaces = new Set([topo.cells[start].face, topo.cells[goal].face]);
  for (const f of maze.requiredFaces) {
    if (endFaces.has(f)) continue;
    if (maze.shortestPath(start, goal, (id) => topo.cells[id].face === f)) errors.push(`required face ${f} can be bypassed`);
  }

  const metrics = evaluate(maze, shortest);
  if (cfg) {
    if (topo.N !== cfg.gridSize) errors.push('grid size mismatch');
    if (metrics.length < cfg.minSolutionLength) errors.push('shortest path too short');
    if (maze.requiredFaces.length < cfg.requiredFaces) errors.push('too few required faces');
    if (metrics.transitions < cfg.minFaceTransitions) errors.push('too few face transitions');
    if (metrics.turns < cfg.targetTurns) errors.push('too few turns');
    if (metrics.branches < cfg.targetBranches) errors.push('too few branches');
    if (metrics.deadEnds < cfg.targetDeadEnds) errors.push('too few dead ends');
    if (metrics.revisits > cfg.allowedFaceRevisits) errors.push('too many face revisits');
  }
  return { ok: errors.length === 0, errors, metrics };
}
