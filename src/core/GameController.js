import { SceneManager } from '../rendering/SceneManager.js';
import { CubeRenderer } from '../rendering/CubeRenderer.js';
import { CircuitRenderer } from '../rendering/CircuitRenderer.js';
import { EnergyEffects } from '../rendering/EnergyEffects.js';
import { QualityManager, PRESETS } from '../rendering/QualityManager.js';
import { InputController } from '../input/InputController.js';
import { UIController } from '../ui/UIController.js';
import { PerformancePanel } from '../ui/PerformancePanel.js';
import { PathManager } from './PathManager.js';
import { getStage, stageCount } from './StageManager.js';
import { loadProgress, saveProgress } from './GameState.js';

/** Wires pure game state (stage + path) to rendering, input and UI. All objects are created once. */
export class GameController {
  constructor(canvas) {
    this.sm = new SceneManager(canvas);
    this.cubeView = new CubeRenderer(this.sm.cube);
    this.sm.shell = this.cubeView.shell;
    this.circuit = new CircuitRenderer(this.sm.cube);
    this.effects = new EnergyEffects(this.cubeView, this.circuit);
    this.sm.systems.push(this.circuit, this.effects);
    this.sm.ambient.push((dt, t) => this.cubeView.animate(dt, t));

    this.progress = loadProgress(stageCount());
    this.stage = null;
    this.path = null;
    this.playing = false; // false in menu and during the power-up sequence

    this.ui = new UIController(this);
    this.quality = new QualityManager(this.sm, (preset, auto) => {
      this.cubeView.particles.visible = PRESETS[preset].particles;
      this.circuit.pathMat.uniforms.uFlow.value = PRESETS[preset].flow;
      this.ui.setQuality(preset, auto);
    });
    this.quality.set(this.progress.quality);
    this.perf = new PerformancePanel(this);
    this.sm.onFrame = (dt, consecutive) => {
      if (consecutive) this.quality.sample(dt);
      this.perf.frame(dt);
    };
    this.input = new InputController(canvas, this.sm, () => this.stage?.maze.topo, (id) => this.onCell(id));

    this.preview(this.progress.unlocked - 1);
    this.ui.showMenu();
    this.sm.start();
  }

  /** Show a stage behind the menu, slowly rotating, without starting play. */
  preview(index) {
    this.load(index);
    this.playing = false;
    this.sm.controls.autoRotate = true;
  }

  load(index) {
    this.stage = getStage(index);
    const { maze } = this.stage;
    this.sm.setGrid(maze.topo.N);
    this.cubeView.setGrid(maze.topo.N);
    this.circuit.setMaze(maze);
    this.effects.reset();
    this.path = new PathManager(maze);
    this.sm.resetView(maze.topo.cells[maze.start].face);
  }

  play(index) {
    if (index >= stageCount()) return this.openMenu();
    this.load(index);
    this.sm.controls.autoRotate = false;
    this.playing = true;
    this.startedAt = performance.now();
    this.ui.showGame(this.stage);
    this.updateHud();
  }

  onCell(id) {
    if (!this.playing) return;
    const result = this.path.click(id);
    if (result.type === 'none') return;
    this.circuit.setPath(this.path.path);
    this.sm.dirty = true;
    this.updateHud();
    if (result.type === 'complete') this.complete();
  }

  complete() {
    this.playing = false;
    const seconds = (performance.now() - this.startedAt) / 1000;
    const i = this.stage.index;
    const p = this.progress;
    if (!p.cleared.includes(i)) p.cleared.push(i);
    p.unlocked = Math.min(stageCount(), Math.max(p.unlocked, i + 2));
    saveProgress(p);
    this.ui.selected = Math.min(i + 1, stageCount() - 1);
    this.effects.play(this.path.path.length - 1, () => {
      this.sm.controls.autoRotate = true;
      this.ui.showComplete(this.stage, this.path.path.length - 1, seconds);
    });
  }

  updateHud() {
    const { topo, requiredFaces } = this.stage.maze;
    const visited = new Set(this.path.path.map((id) => topo.cells[id].face));
    this.ui.updateHud(this.path.path.length - 1, requiredFaces.filter((f) => visited.has(f)).length, requiredFaces.length);
  }

  resetPath() {
    if (!this.playing || this.path.reset().type === 'none') return;
    this.circuit.setPath(this.path.path);
    this.updateHud();
  }

  resetView() {
    this.sm.resetView(this.stage.maze.topo.cells[this.stage.maze.start].face);
  }

  openMenu() {
    this.playing = false;
    this.sm.controls.autoRotate = true;
    this.ui.showMenu();
  }

  setQuality(mode) {
    this.progress.quality = mode;
    saveProgress(this.progress);
    this.quality.set(mode);
  }

  layers() {
    const c = this.cubeView.layers;
    return { shell: c.shell, edges: c.edges, core: c.core, particles: c.particles, circuit: this.circuit.staticLayer, path: this.circuit.pathLayer };
  }
}
