import { GameController } from './core/GameController.js';
import './styles/main.css';

const game = new GameController(document.getElementById('scene'));

// Read-only hooks for automated browser tests (tests/e2e). Harmless in production.
window.__tc = {
  game,
  solution: () => game.stage.maze.shortestPath(),
  pick: (x, y) => game.input.pick(x, y),
  cellScreen: (id) => game.sm.project(game.stage.maze.topo.cells[id].position),
  /** Look straight down the cell's position vector so it is the nearest visible surface. */
  focusCell: (id) => {
    const p = game.stage.maze.topo.cells[id].position;
    const k = game.sm.fitDistance() / Math.hypot(...p);
    game.sm.camera.position.set(p[0] * k, p[1] * k, p[2] * k);
    game.sm.controls.update();
    game.sm.dirty = true;
  },
};
