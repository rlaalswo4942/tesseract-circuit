import { DIFFICULTY } from '../config/difficultyConfig.js';

// Stage list: per difficulty tier, a few pinned seeds (easiest first). Adding a stage = adding a seed here.
// Seeds were picked so the difficulty score rises at every stage; tests/stages.test.js verifies this.
const TIER_SEEDS = {
  initiation: [2, 3, 44],
  connection: [10, 3, 41],
  junction: [55, 30, 9],
  crossCircuit: [17, 53, 2],
  relay: [2, 5, 25],
  network: [12, 26, 34],
  gridLock: [58, 12, 15],
  fullCircuit: [46, 23, 1],
  coreRestoration: [33, 2, 1],
  singularity: [41, 8, 32],
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const STAGES = Object.entries(TIER_SEEDS).flatMap(([difficulty, seeds], tier) =>
  seeds.map((seed, k) => ({ name: `${DIFFICULTY[difficulty].name} ${ROMAN[k]}`, difficulty, tier, seed })),
);

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
