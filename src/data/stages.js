// Stage list. Adding a stage = adding an entry here (preset + seed). No engine changes needed.
// Seeds are pinned and verified by tests/stages.test.js.
export const STAGES = [
  { name: 'Initiation', difficulty: 'initiation', seed: 1 },
  { name: 'Connection', difficulty: 'connection', seed: 2 },
  { name: 'Cross Circuit', difficulty: 'crossCircuit', seed: 3 },
  { name: 'Network', difficulty: 'network', seed: 4 },
  { name: 'Full Circuit', difficulty: 'fullCircuit', seed: 5 },
  { name: 'Core Restoration', difficulty: 'coreRestoration', seed: 6 },
];

// Hand-verified fallback (front → top, 4×4) used if generation ever fails. [face, row, col]; 0=front, 4=top.
export const FIXED_MAZE = {
  N: 4,
  start: [0, 3, 0],
  goal: [4, 1, 3],
  traces: [
    [[0, 3, 0], [0, 2, 0], [0, 2, 1], [0, 1, 1], [0, 0, 1], [4, 3, 1], [4, 2, 1], [4, 2, 2], [4, 1, 2], [4, 1, 3]],
    [[0, 2, 1], [0, 2, 2], [0, 3, 2]],
    [[4, 2, 1], [4, 2, 0]],
  ],
};
