import { describe, it, expect } from 'vitest';
import { generateMaze, mazeFromData } from '../src/maze/MazeGenerator.js';
import { validateMaze } from '../src/maze/MazeValidator.js';
import { MazeGraph } from '../src/maze/MazeGraph.js';
import { createTopology } from '../src/maze/CubeTopology.js';
import { FIXED_MAZE } from '../src/data/stages.js';
import { DIFFICULTY } from '../src/config/difficultyConfig.js';

describe('fixed fallback maze', () => {
  const maze = mazeFromData(FIXED_MAZE);
  it('is valid and crosses front → top', () => {
    // The fallback is a fixed 4×4 board, independent of the (denser) generated presets.
    const cfg = {
      gridSize: 4, minSolutionLength: 7, maxSolutionLength: 12, requiredFaces: 2, minFaceTransitions: 1,
      targetBranches: 2, branchDepth: 2, targetDeadEnds: 2, targetTurns: 2, allowedFaceRevisits: 0, loops: 0,
    };
    const v = validateMaze(maze, cfg);
    expect(v.errors).toEqual([]);
    expect(maze.requiredFaces).toEqual([0, 4]);
    expect(v.metrics.length).toBe(9);
  });
});

describe('validator', () => {
  it('detects a face bypass created by a shortcut loop', () => {
    // Ring around the front/right/back/left belt at row 1 plus a top detour: start on front, goal on back.
    const topo = createTopology(4);
    const m = new MazeGraph(topo);
    const ring = [];
    for (const f of [0, 2, 1, 3]) for (let c = 0; c < 4; c++) ring.push(topo.cellAt(f, 1, c));
    for (let i = 1; i < ring.length; i++) m.connect(ring[i - 1], ring[i]);
    m.connect(ring.at(-1), ring[0]);
    m.start = ring[0];
    m.goal = ring[8];
    m.requiredFaces = [0, 1, 2]; // claim "right" is required, but the left side bypasses it
    expect(validateMaze(m).errors).toContain('required face 2 can be bypassed');
  });

  it('detects disconnected circuit and missing solution', () => {
    const topo = createTopology(4);
    const m = new MazeGraph(topo);
    m.connect(topo.cellAt(0, 0, 0), topo.cellAt(0, 0, 1));
    m.connect(topo.cellAt(0, 3, 0), topo.cellAt(0, 3, 1));
    m.start = topo.cellAt(0, 0, 0);
    m.goal = topo.cellAt(0, 3, 1);
    const v = validateMaze(m);
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('no solution');
  });

  it('rejects non-adjacent edges at construction', () => {
    const topo = createTopology(4);
    expect(() => new MazeGraph(topo).connect(topo.cellAt(0, 0, 0), topo.cellAt(0, 2, 2))).toThrow();
  });
});

describe('generator', () => {
  it('is deterministic per seed', () => {
    const a = generateMaze(DIFFICULTY.network, 42).maze.toJSON();
    const b = generateMaze(DIFFICULTY.network, 42).maze.toJSON();
    expect(a).toEqual(b);
  });

  it('produces valid mazes across many seeds for every preset', () => {
    for (const [name, cfg] of Object.entries(DIFFICULTY)) {
      for (let seed = 100; seed < 115; seed++) {
        const { maze } = generateMaze(cfg, seed);
        const v = validateMaze(maze, cfg);
        expect(v.errors, `${name} seed ${seed}`).toEqual([]);
      }
    }
  });

  it('gives up with a reason instead of looping on impossible constraints', () => {
    const impossible = { ...DIFFICULTY.initiation, minSolutionLength: 500, maxSolutionLength: 600 };
    expect(() => generateMaze(impossible, 1, 20)).toThrow(/failed after 20 attempts/);
  });
});
