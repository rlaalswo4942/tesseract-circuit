import { describe, it, expect } from 'vitest';
import { PathManager } from '../src/core/PathManager.js';
import { mazeFromData } from '../src/maze/MazeGenerator.js';
import { FIXED_MAZE } from '../src/data/stages.js';

const maze = mazeFromData(FIXED_MAZE);
const id = (f, r, c) => maze.topo.cellAt(f, r, c);
// Solution: F30 F20 F21 F11 F01 | T31 T21 T22 T12 T13 (front=0, top=4)
const S = [[0, 3, 0], [0, 2, 0], [0, 2, 1], [0, 1, 1], [0, 0, 1], [4, 3, 1], [4, 2, 1], [4, 2, 2], [4, 1, 2], [4, 1, 3]].map((c) => id(...c));

describe('PathManager', () => {
  it('starts with only the start cell', () => {
    expect(new PathManager(maze).path).toEqual([S[0]]);
  });

  it('extends from the start and along connected cells', () => {
    const pm = new PathManager(maze);
    expect(pm.click(S[1]).type).toBe('extend');
    expect(pm.click(S[2]).type).toBe('extend');
    expect(pm.path).toEqual(S.slice(0, 3));
  });

  it('ignores unconnected cells, non-circuit cells and repeated end-adjacent jumps', () => {
    const pm = new PathManager(maze);
    pm.click(S[1]);
    expect(pm.click(S[4]).type).toBe('none'); // circuit but not adjacent to end
    expect(pm.click(id(0, 0, 0)).type).toBe('none'); // no circuit there
    expect(pm.click(id(1, 0, 0)).type).toBe('none'); // other face, not connected
    expect(pm.click(-1).type).toBe('none');
    expect(pm.path).toEqual(S.slice(0, 2));
  });

  it('clicking a middle cell removes it and everything after', () => {
    const pm = new PathManager(maze);
    for (const c of S.slice(1, 6)) pm.click(c);
    const r = pm.click(S[3]);
    expect(r).toEqual({ type: 'retract', removed: S.slice(3, 6) });
    expect(pm.path).toEqual(S.slice(0, 3));
  });

  it('clicking the last cell removes only that cell', () => {
    const pm = new PathManager(maze);
    for (const c of S.slice(1, 4)) pm.click(c);
    pm.click(S[3]);
    expect(pm.path).toEqual(S.slice(0, 3));
  });

  it('clicking start keeps only the start', () => {
    const pm = new PathManager(maze);
    for (const c of S.slice(1, 5)) pm.click(c);
    expect(pm.click(S[0]).type).toBe('retract');
    expect(pm.path).toEqual([S[0]]);
    expect(pm.click(S[0]).type).toBe('none');
  });

  it('can take a new branch after retracting', () => {
    const pm = new PathManager(maze);
    for (const c of S.slice(1, 5)) pm.click(c);
    pm.click(S[3]); // back to F21
    expect(pm.click(id(0, 2, 2)).type).toBe('extend'); // side branch
    expect(pm.click(id(0, 3, 2)).type).toBe('extend');
    expect(pm.path.slice(-2)).toEqual([id(0, 2, 2), id(0, 3, 2)]);
  });

  it('completes on goal and then blocks all edits', () => {
    const pm = new PathManager(maze);
    const types = S.slice(1).map((c) => pm.click(c).type);
    expect(types.at(-1)).toBe('complete');
    expect(types.slice(0, -1).every((t) => t === 'extend')).toBe(true);
    expect(pm.completed).toBe(true);
    expect(pm.click(S[2]).type).toBe('none');
    expect(pm.reset().type).toBe('none');
    expect(pm.path).toEqual(S);
  });

  it('never contains duplicates', () => {
    const pm = new PathManager(maze);
    for (const c of [...S.slice(1, 6), S[4], S[5], S[2], S[3]]) pm.click(c);
    expect(new Set(pm.path).size).toBe(pm.path.length);
  });
});
