import { STAGES, FIXED_MAZE } from '../data/stages.js';
import { DIFFICULTY } from '../config/difficultyConfig.js';
import { generateMaze, mazeFromData } from '../maze/MazeGenerator.js';
import { validateMaze } from '../maze/MazeValidator.js';

const cache = new Map();

/** Builds (once) and returns { index, name, cfg, maze, metrics, fallback }. */
export function getStage(index) {
  if (cache.has(index)) return cache.get(index);
  const stage = STAGES[index];
  if (!stage) throw new Error(`no stage ${index}`);
  const cfg = DIFFICULTY[stage.difficulty];
  let result;
  try {
    const { maze, metrics } = generateMaze(cfg, stage.seed);
    result = { index, name: stage.name, cfg, maze, metrics, fallback: false };
  } catch (err) {
    console.warn(`[stage ${index + 1}] ${err.message}; using fixed fallback maze`);
    const maze = mazeFromData(FIXED_MAZE);
    result = { index, name: stage.name, cfg, maze, metrics: validateMaze(maze).metrics, fallback: true };
  }
  cache.set(index, result);
  return result;
}

export const stageCount = () => STAGES.length;
