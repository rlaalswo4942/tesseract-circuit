import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveProgress } from '../src/core/GameState.js';
import { QualityManager } from '../src/rendering/QualityManager.js';

describe('progress storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
  });

  it('defaults when empty or corrupt', () => {
    expect(loadProgress(6)).toEqual({ unlocked: 1, cleared: [], quality: 'auto' });
    store['tesseract-circuit:v1'] = '{not json';
    expect(loadProgress(6)).toEqual({ unlocked: 1, cleared: [], quality: 'auto' });
    store['tesseract-circuit:v1'] = JSON.stringify({ unlocked: 99, cleared: [0, 0, 7, 'x', 2], quality: 'ultra' });
    expect(loadProgress(6)).toEqual({ unlocked: 6, cleared: [0, 2], quality: 'auto' });
  });

  it('round-trips', () => {
    saveProgress({ unlocked: 3, cleared: [0, 1], quality: 'low' });
    expect(loadProgress(6)).toEqual({ unlocked: 3, cleared: [0, 1], quality: 'low' });
  });

  it('survives storage that throws', () => {
    globalThis.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadProgress(6).unlocked).toBe(1);
    expect(() => saveProgress({ unlocked: 1, cleared: [], quality: 'auto' })).not.toThrow();
  });
});

describe('auto quality', () => {
  const make = () => {
    const applied = [];
    const qm = new QualityManager({ applyQuality: (p) => applied.push(p) });
    qm.apply('high');
    qm.auto = true;
    return { qm, applied };
  };
  const run = (qm, fps, seconds) => {
    for (let t = 0; t < seconds; t += 1 / fps) qm.sample(1 / fps);
  };

  it('ignores short hitches', () => {
    const { qm } = make();
    run(qm, 60, 6);
    run(qm, 10, 0.5); // half-second stall
    run(qm, 60, 6);
    expect(qm.preset).toBe('high');
  });

  it('steps down one level after sustained low fps, then waits out a cooldown', () => {
    const { qm } = make();
    run(qm, 30, 5 + 4.2); // cooldown + two bad 2s windows
    expect(qm.preset).toBe('medium');
    run(qm, 20, 4); // still inside the new cooldown → no further change
    expect(qm.preset).toBe('medium');
    run(qm, 20, 5);
    expect(qm.preset).toBe('low');
  });

  it('never steps up on its own and does nothing when manual', () => {
    const { qm } = make();
    qm.auto = false;
    run(qm, 10, 20);
    expect(qm.preset).toBe('high');
  });
});
