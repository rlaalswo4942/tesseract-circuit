// Stage list. Adding a stage = adding an entry here (preset + seed). No engine changes needed.
// Seeds are pinned: each gives a maze near its level's median difficulty score (verified by tests/stages.test.js).
export const STAGES = [
  { name: 'Initiation', difficulty: 1, seed: 701 },
  { name: 'Connection', difficulty: 2, seed: 2602 },
  { name: 'Relay', difficulty: 3, seed: 503 },
  { name: 'Cross Circuit', difficulty: 4, seed: 2004 },
  { name: 'Junction', difficulty: 5, seed: 2105 },
  { name: 'Network', difficulty: 6, seed: 106 },
  { name: 'Feedback Loop', difficulty: 7, seed: 3007 },
  { name: 'Parallel', difficulty: 8, seed: 508 },
  { name: 'Full Circuit', difficulty: 9, seed: 909 },
  { name: 'Capacitor', difficulty: 10, seed: 910 },
  { name: 'Inductor', difficulty: 11, seed: 1711 },
  { name: 'Resonance', difficulty: 12, seed: 2812 },
  { name: 'Overload', difficulty: 13, seed: 2313 },
  { name: 'Short Circuit', difficulty: 14, seed: 1414 },
  { name: 'Phase Shift', difficulty: 15, seed: 1015 },
  { name: 'Interference', difficulty: 16, seed: 1516 },
  { name: 'Flux', difficulty: 17, seed: 3217 },
  { name: 'Singularity', difficulty: 18, seed: 2418 },
  { name: 'Tesseract', difficulty: 19, seed: 2319 },
  { name: 'Core Restoration', difficulty: 20, seed: 3920 },
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
