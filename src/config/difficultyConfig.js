// Difficulty presets, keyed by level. Lengths are in moves along the shortest solution.
//   N        grid cells per face edge (finer sections at higher levels)
//   len      shortest-solution length range [min, max]
//   faces    distinct faces every solution must cross (6 = all)
//   trans    min face transitions · turns: min direction changes on the solution
//   br/depth side branches (wrong turns) kept and how deep each may run (Infinity = whole maze tree)
//   dead     min dead ends · rev: max times the solution re-enters a face it already left
//            (transitions = faces - 1 + revisits, so trans must be ≤ faces - 1 + rev)
//   loops    decoy cycles; each is only kept if it adds no shortcut or face bypass
//   mix      maze texture: 0 = long DFS corridors … 1 = bushy Prim-style thickets (irregularity)
const COLS = ['gridSize', 'minSolutionLength', 'maxSolutionLength', 'requiredFaces', 'minFaceTransitions', 'targetBranches', 'branchDepth', 'targetDeadEnds', 'targetTurns', 'allowedFaceRevisits', 'loops', 'mix'];

// prettier-ignore
const ROWS = [
  //  N  len.min max faces trans  br depth dead turns rev loops mix
  [   5,   8,  16,   2,    1,    3,   2,    3,   3,   0,   0,  0    ], //  1
  [   5,  12,  22,   3,    2,    5,   3,    5,   5,   0,   0,  0.1  ], //  2
  [   6,  16,  28,   3,    2,    7,   3,    7,   7,   0,   0,  0.15 ], //  3
  [   6,  20,  34,   4,    3,    9,   4,    9,   9,   0,   1,  0.2  ], //  4
  [   7,  24,  40,   4,    3,   11,   4,   11,  11,   1,   1,  0.25 ], //  5
  [   7,  28,  46,   5,    4,   13,   5,   13,  13,   1,   1,  0.3  ], //  6
  [   8,  32,  52,   5,    4,   15,   5,   15,  15,   1,   2,  0.3  ], //  7
  [   8,  36,  58,   6,    5,   17,   6,   17,  17,   1,   2,  0.35 ], //  8
  [   9,  40,  66,   6,    5,   19,   6,   19,  19,   2,   2,  0.35 ], //  9
  [   9,  44,  72,   6,    6,   21,   7,   21,  21,   2,   3,  0.4  ], // 10
  [   9,  48,  78,   6,    6,   23,   8,   23,  23,   2,   3,  0.4  ], // 11
  [  10,  52,  86,   6,    7,   25,   8,   25,  25,   2,   3,  0.45 ], // 12
  [  10,  56,  92,   6,    7,   27,   9,   27,  27,   3,   4,  0.45 ], // 13
  [  10,  60,  98,   6,    8,   29,  10,   29,  29,   3,   4,  0.5  ], // 14
  [  11,  64, 106,   6,    8,   31,  10,   31,  31,   3,   4,  0.5  ], // 15
  [  11,  68, 112,   6,    9,   33,  12,   33,  33,   4,   5,  0.5  ], // 16
  [  11,  72, 120,   6,    9,   35,  14,   35,  35,   4,   5,  0.55 ], // 17
  [  12,  76, 128,   6,    9,   38,  16,   38,  38,   5,   6,  0.55 ], // 18
  [  12,  80, 136,   6,   10,   41,  20,   41,  41,   6,   6,  0.6  ], // 19
  [  12,  85, 150,   6,   10,   45, Infinity, 45, 45,  6,   7,  0.6  ], // 20
];

export const DIFFICULTY = Object.fromEntries(ROWS.map((row, i) => [i + 1, Object.fromEntries(COLS.map((c, j) => [c, row[j]]))]));
