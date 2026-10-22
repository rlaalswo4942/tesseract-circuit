import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';

/**
 * Tap/click → cell id. Drags and multi-touch gestures belong to OrbitControls and never select.
 * Hit test runs once per click: ray vs the shell box (FrontSide → nearest visible face only),
 * then the hit point is mapped to a cell in cube-local cell units.
 */
export class InputController {
  constructor(canvas, sceneManager, getTopology, onCell) {
    this.sm = sceneManager;
    this.getTopology = getTopology;
    this.onCell = onCell;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.down = new Map(); // pointerId → {x, y}
    this.gesture = false; // a second finger joined: whole gesture is not a click

    canvas.addEventListener('pointerdown', (e) => {
      this.down.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.down.size > 1) this.gesture = true;
    });
    const end = (e) => {
      const start = this.down.get(e.pointerId);
      this.down.delete(e.pointerId);
      const wasGesture = this.gesture;
      if (this.down.size === 0) this.gesture = false;
      if (!start || wasGesture || e.type === 'pointercancel' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CONFIG.dragThresholdPx) return;
      const id = this.pick(e.clientX, e.clientY);
      if (id >= 0) this.onCell(id);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  pick(x, y) {
    const topo = this.getTopology();
    if (!topo) return -1;
    this.ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.sm.camera);
    const hit = this.raycaster.intersectObject(this.sm.shell, false)[0];
    if (!hit) return -1;
    const p = this.sm.cube.worldToLocal(hit.point.clone());
    return topo.cellAtPoint([p.x, p.y, p.z]);
  }
}
