// Difficulty tiers, easiest first. Each tier holds several stages (see src/data/stages.js).
// name: tier title shown in the menu. Lengths are in moves along the shortest solution.
// requiredFaces: how many distinct faces every solution must cross (6 = all).
// branchDepth: how deep each side branch (wrong turn) may run; Infinity keeps the whole maze tree.
// loops: extra edges that form cycles; each one is only kept if it adds no shortcut or face bypass.
export const DIFFICULTY = {
  initiation: {
    name: 'Initiation',
    gridSize: 5, minSolutionLength: 7, maxSolutionLength: 14, requiredFaces: 2, minFaceTransitions: 1,
    targetBranches: 2, branchDepth: 2, targetDeadEnds: 2, targetTurns: 2, allowedFaceRevisits: 0, loops: 0,
  },
  connection: {
    name: 'Connection',
    gridSize: 5, minSolutionLength: 10, maxSolutionLength: 18, requiredFaces: 2, minFaceTransitions: 1,
    targetBranches: 4, branchDepth: 3, targetDeadEnds: 4, targetTurns: 4, allowedFaceRevisits: 0, loops: 0,
  },
  junction: {
    name: 'Junction',
    gridSize: 6, minSolutionLength: 14, maxSolutionLength: 26, requiredFaces: 3, minFaceTransitions: 2,
    targetBranches: 6, branchDepth: 3, targetDeadEnds: 6, targetTurns: 6, allowedFaceRevisits: 0, loops: 0,
  },
  crossCircuit: {
    name: 'Cross Circuit',
    gridSize: 7, minSolutionLength: 20, maxSolutionLength: 36, requiredFaces: 3, minFaceTransitions: 2,
    targetBranches: 9, branchDepth: 4, targetDeadEnds: 9, targetTurns: 9, allowedFaceRevisits: 0, loops: 0,
  },
  relay: {
    name: 'Relay',
    gridSize: 7, minSolutionLength: 24, maxSolutionLength: 42, requiredFaces: 4, minFaceTransitions: 3,
    targetBranches: 11, branchDepth: 5, targetDeadEnds: 11, targetTurns: 12, allowedFaceRevisits: 0, loops: 1,
  },
  network: {
    name: 'Network',
    gridSize: 8, minSolutionLength: 32, maxSolutionLength: 56, requiredFaces: 5, minFaceTransitions: 4,
    targetBranches: 15, branchDepth: 7, targetDeadEnds: 15, targetTurns: 16, allowedFaceRevisits: 1, loops: 2,
  },
  gridLock: {
    name: 'Grid Lock',
    gridSize: 9, minSolutionLength: 40, maxSolutionLength: 75, requiredFaces: 5, minFaceTransitions: 5,
    targetBranches: 19, branchDepth: 8, targetDeadEnds: 19, targetTurns: 20, allowedFaceRevisits: 1, loops: 2,
  },
  fullCircuit: {
    name: 'Full Circuit',
    gridSize: 9, minSolutionLength: 44, maxSolutionLength: 100, requiredFaces: 6, minFaceTransitions: 5,
    targetBranches: 22, branchDepth: 10, targetDeadEnds: 22, targetTurns: 22, allowedFaceRevisits: 2, loops: 3,
  },
  coreRestoration: {
    name: 'Core Restoration',
    gridSize: 10, minSolutionLength: 60, maxSolutionLength: 120, requiredFaces: 6, minFaceTransitions: 7,
    targetBranches: 30, branchDepth: Infinity, targetDeadEnds: 30, targetTurns: 30, allowedFaceRevisits: 3, loops: 4,
  },
  singularity: {
    name: 'Singularity',
    gridSize: 11, minSolutionLength: 75, maxSolutionLength: 150, requiredFaces: 6, minFaceTransitions: 8,
    targetBranches: 36, branchDepth: Infinity, targetDeadEnds: 36, targetTurns: 38, allowedFaceRevisits: 3, loops: 5,
  },
};
