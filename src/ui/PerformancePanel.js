// Dev overlay: open with ?debug in the URL or the ` key. Refreshes twice a second, not every frame.
export class PerformancePanel {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('perf');
    this.times = new Float32Array(300); // last rendered frame times (ms)
    this.count = 0;
    this.since = 0;
    this.visible = new URLSearchParams(location.search).has('debug');
    this.el.hidden = !this.visible;
    this.el.replaceChildren(document.createTextNode(''));
    if (this.visible) this.renderLayerToggles();
    addEventListener('keydown', (e) => {
      if (e.key === '`') this.toggle();
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.el.hidden = !this.visible;
    if (this.visible) this.renderLayerToggles();
  }

  frame(dt) {
    this.times[this.count++ % this.times.length] = dt * 1000;
    this.since += dt;
    if (!this.visible || this.since < 0.5) return;
    this.since = 0;
    this.el.firstChild.textContent = this.text();
  }

  stats() {
    const n = Math.min(this.count, this.times.length);
    const arr = Array.from(this.times.subarray(0, n)).sort((a, b) => a - b);
    const avg = arr.reduce((s, v) => s + v, 0) / (n || 1);
    const recent = [];
    for (let i = 1; i <= Math.min(30, n); i++) recent.push(this.times[(this.count - i) % this.times.length]);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / (recent.length || 1);
    const info = this.game.sm.renderer.info;
    return {
      fps: 1000 / recentAvg,
      avgFps: 1000 / avg,
      p95: arr[Math.floor(n * 0.95)] || 0,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }

  text() {
    const s = this.stats();
    const g = this.game;
    if (!this.gpu) {
      const gl = g.sm.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      this.gpu = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    }
    return [
      `GPU ${this.gpu}`,
      `FPS ${s.fps.toFixed(0)}  avg(300f) ${s.avgFps.toFixed(1)}`,
      `p95 ${s.p95.toFixed(1)} ms`,
      `draw calls ${s.calls}  tris ${s.triangles}`,
      `geom ${s.geometries}  tex ${s.textures}`,
      `stage ${g.stage ? g.stage.index + 1 : '-'}  preset ${g.quality.preset}${g.quality.auto ? ' (auto)' : ''}`,
      `path ${g.path ? g.path.path.length - 1 : 0}`,
      '(FPS counts rendered frames; idle frames are skipped)',
    ].join('\n');
  }

  renderLayerToggles() {
    if (this.el.childNodes.length > 1) return;
    const layers = this.game.layers();
    const box = document.createElement('div');
    for (const [name, obj] of Object.entries(layers)) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = obj.visible;
      cb.onchange = () => {
        obj.visible = cb.checked;
        this.game.sm.dirty = true;
      };
      label.append(cb, name);
      box.append(label);
    }
    this.el.append(box);
  }
}
