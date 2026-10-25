import { describe, it, expect } from 'vitest';
import { getStage, stageCount } from '../src/core/StageManager.js';
import { validateMaze } from '../src/maze/MazeValidator.js';
import { PathManager } from '../src/core/PathManager.js';

const stages = Array.from({ length: stageCount() }, (_, i) => getStage(i));

describe('stages', () => {
  it('has 30 stages over 10 difficulty tiers, all generated (no fallback)', () => {
    expect(stages.length).toBe(30);
    expect(new Set(stages.map((s) => s.cfg)).size).toBe(10);
    for (const s of stages) expect(s.fallback, s.name).toBe(false);
  });

  it.each(stages.map((s) => [s.name, s]))('%s meets its difficulty config', (_, s) => {
    const v = validateMaze(s.maze, s.cfg);
    expect(v.errors).toEqual([]);
    expect(s.maze.topo.N).toBe(s.cfg.gridSize);
    expect(s.maze.requiredFaces.length).toBe(s.cfg.requiredFaces);
  });

  it.each(stages.map((s) => [s.name, s]))('%s is completable by clicking its solution', (_, s) => {
    const pm = new PathManager(s.maze);
    const sol = s.maze.shortestPath();
    const results = sol.slice(1).map((c) => pm.click(c).type);
    expect(results.at(-1)).toBe('complete');
    expect(pm.completed).toBe(true);
  });

  it('difficulty score strictly increases level by level', () => {
    const scores = stages.map((s) => s.metrics.score);
    for (let i = 1; i < scores.length; i++) expect(scores[i], `L${i + 1} vs L${i}`).toBeGreaterThan(scores[i - 1]);
  });

  it('prints the stage table', () => {
    console.table(
      stages.map((s) => ({
        stage: s.name, tier: s.cfg.name, N: s.maze.topo.N, len: s.metrics.length, faces: s.maze.requiredFaces.length,
        trans: s.metrics.transitions, turns: s.metrics.turns, branches: s.metrics.branches,
        deadEnds: s.metrics.deadEnds, loops: s.metrics.loops, revisits: s.metrics.revisits,
        cells: s.metrics.circuitCells, score: s.metrics.score,
      })),
    );
  });
});
