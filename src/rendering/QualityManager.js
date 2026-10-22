import { CONFIG } from '../config/gameConfig.js';

export const PRESETS = {
  low: { pixelRatio: 0.8, bloom: false, particles: false, ambient: false, flow: 0 },
  medium: { pixelRatio: 1.5, bloom: false, particles: false, ambient: true, flow: 1 },
  high: { pixelRatio: 2, bloom: true, particles: true, ambient: true, flow: 1 },
};
const ORDER = ['low', 'medium', 'high'];

/**
 * Applies presets and, in auto mode, steps down one level after sustained low FPS.
 * Never steps back up on its own → no oscillation.
 */
export class QualityManager {
  constructor(sceneManager, onChange) {
    this.sm = sceneManager;
    this.onChange = onChange;
    this.auto = true;
    this.preset = 'high';
    this.resetWindow();
    this.cooldown = 0;
  }

  resetWindow() {
    this.frames = 0;
    this.elapsed = 0;
    this.bad = 0;
  }

  set(mode) {
    this.auto = mode === 'auto';
    const preset = this.auto ? (matchMedia('(pointer: coarse)').matches ? 'medium' : 'high') : mode;
    this.apply(preset);
  }

  apply(preset) {
    this.preset = preset;
    const p = PRESETS[preset];
    this.sm.applyQuality(p);
    this.resetWindow();
    this.cooldown = CONFIG.autoQuality.cooldownSec;
    this.onChange?.(preset, this.auto);
  }

  /** Feed only frames that were actually rendered back-to-back. */
  sample(dt) {
    if (!this.auto || this.preset === 'low') return;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.frames++;
    this.elapsed += dt;
    const A = CONFIG.autoQuality;
    if (this.elapsed < A.windowSec) return;
    const fps = this.frames / this.elapsed;
    this.bad = fps < A.minFps[this.preset] ? this.bad + 1 : 0;
    this.frames = 0;
    this.elapsed = 0;
    if (this.bad >= A.badWindows) {
      console.info(`[quality] ${fps.toFixed(1)} fps sustained → stepping down from ${this.preset}`);
      this.apply(ORDER[ORDER.indexOf(this.preset) - 1]);
    }
  }
}
