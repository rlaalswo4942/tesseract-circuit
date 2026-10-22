// Difficulty presets. Lengths are in moves along the shortest solution.
// requiredFaces: how many distinct faces every solution must cross (6 = all).
// branchDepth: how deep each side branch (wrong turn) may run; Infinity keeps the whole maze tree.
// loops: extra edges that form cycles; each one is only kept if it adds no shortcut or face bypass.
export const DIFFICULTY = {
  initiation: {
    gridSize: 4, minSolutionLength: 7, maxSolutionLength: 12, requiredFaces: 2, minFaceTransitions: 1,
    targetBranches: 2, branchDepth: 2, targetDeadEnds: 2, targetTurns: 2, allowedFaceRevisits: 0, loops: 0,
  },
  connection: {
    gridSize: 4, minSolutionLength: 10, maxSolutionLength: 18, requiredFaces: 3, minFaceTransitions: 2,
    targetBranches: 4, branchDepth: 3, targetDeadEnds: 4, targetTurns: 4, allowedFaceRevisits: 0, loops: 0,
  },
  crossCircuit: {
    gridSize: 5, minSolutionLength: 16, maxSolutionLength: 28, requiredFaces: 4, minFaceTransitions: 3,
    targetBranches: 7, branchDepth: 4, targetDeadEnds: 7, targetTurns: 7, allowedFaceRevisits: 0, loops: 0,
  },
  network: {
    gridSize: 5, minSolutionLength: 22, maxSolutionLength: 36, requiredFaces: 5, minFaceTransitions: 4,
    targetBranches: 10, branchDepth: 6, targetDeadEnds: 10, targetTurns: 10, allowedFaceRevisits: 1, loops: 1,
  },
  fullCircuit: {
    gridSize: 6, minSolutionLength: 30, maxSolutionLength: 50, requiredFaces: 6, minFaceTransitions: 5,
    targetBranches: 14, branchDepth: 8, targetDeadEnds: 14, targetTurns: 14, allowedFaceRevisits: 2, loops: 2,
  },
  coreRestoration: {
    gridSize: 6, minSolutionLength: 42, maxSolutionLength: 75, requiredFaces: 6, minFaceTransitions: 7,
    targetBranches: 20, branchDepth: Infinity, targetDeadEnds: 20, targetTurns: 20, allowedFaceRevisits: 3, loops: 3,
  },
};
