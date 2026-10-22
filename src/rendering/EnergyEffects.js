// Power-restore sequence: goal flare → current races along the player's path → core → faces → done.
// Pure uniform animation, so it costs nothing extra on low quality (bloom just isn't there).

const smooth = (t) => t * t * (3 - 2 * t);
const seg = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));

export class EnergyEffects {
  constructor(cube, circuit) {
    this.cube = cube;
    this.circuit = circuit;
    this.t = -1;
  }

  reset() {
    this.t = -1;
    this.apply(0, 0, 0, -10);
  }

  apply(tip, core, faces, pulse) {
    const u = this.circuit.pathMat.uniforms;
    u.uTipBoost.value = tip;
    u.uPulse.value = pulse;
    u.uPower.value = faces;
    this.circuit.staticMat.uniforms.uPower.value = faces;
    this.cube.setCorePower(core);
    this.cube.setPower(faces);
  }

  play(pathLength, onDone) {
    const travel = Math.min(1.2, Math.max(0.5, pathLength * 0.03));
    // Sequence marks (s): 1 goal flare, 2 current runs start→goal, 3 core, 4 faces, 5 full light, 6 text.
    this.marks = [0.35, 0.35 + travel, 0.85 + travel, 1.45 + travel, 1.75 + travel];
    this.len = pathLength;
    this.onDone = onDone;
    this.t = 0;
  }

  /** Returns true while the sequence runs. */
  update(dt) {
    if (this.t < 0) return false;
    this.t += dt;
    const [m1, m2, m3, m4, m5] = this.marks;
    const t = this.t;
    const run = seg(t, m1, m2);
    this.apply(seg(t, 0, m1), seg(t, m2, m3), seg(t, m3, m4), run > 0 && run < 1 ? run * (this.len + 1) : -10);
    if (t >= m5) {
      this.t = -1;
      this.onDone?.();
    }
    return true;
  }
}
