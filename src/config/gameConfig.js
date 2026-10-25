// Tunables. Distances are in cell units unless noted.
export const CONFIG = {
  cubeWorldSize: 4, // world units, independent of grid size
  lift: 0.02, // circuit height above the shell
  pathLift: 0.035,
  traceWidth: 0.09,
  padSize: 0.2,
  dotSize: 0.05,
  pathWidth: 0.18,
  pathPad: 0.28,

  dragThresholdPx: 7, // pointer travel above this = rotate, not click
  extendDuration: 0.2, // seconds per new step
  retractMaxDuration: 0.6, // long retractions never take longer than this

  autoQuality: { windowSec: 2, badWindows: 2, cooldownSec: 5, minFps: { high: 45, medium: 28 } },

  colors: {
    shell: [0.1, 0.75, 0.85],
    edge: [0.45, 1.0, 1.0],
    trace: [0.05, 0.32, 0.4],
    pad: [0.1, 0.5, 0.6],
    dot: [0.03, 0.1, 0.13],
    start: [0.6, 0.95, 1.0],
    goal: [1.0, 0.62, 0.15],
    path: [0.35, 1.0, 1.0],
    core: [0.2, 0.85, 1.0],
  },
};
