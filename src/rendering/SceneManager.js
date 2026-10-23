import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from '../config/gameConfig.js';
import { FACES } from '../maze/CubeTopology.js';

/**
 * Renderer, camera, controls and the frame loop. Renders on demand: a frame is drawn only when
 * the camera moved, an animation is running, or the preset allows ambient motion.
 */
export class SceneManager {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // All materials are ShaderMaterials writing display colours directly.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(0x02060a, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.cube = new THREE.Group(); // everything inside is in cell units
    this.scene.add(this.cube);

    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.12, enablePan: false, rotateSpeed: 0.7,
      minPolarAngle: 0.05, maxPolarAngle: Math.PI - 0.05, // avoid gimbal flip at the poles
    });

    this.systems = []; // { update(dt, t) → boolean still animating }
    this.ambient = [];
    this.quality = { ambient: true, bloom: false };
    this.dirty = true;
    this.time = 0;
    this.onFrame = null;

    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize);
    this.resize();
    this.controls.addEventListener('change', () => (this.dirty = true));
  }

  setGrid(N) {
    this.cube.scale.setScalar(CONFIG.cubeWorldSize / N);
    this.dirty = true;
  }

  fitDistance() {
    const r = (CONFIG.cubeWorldSize * Math.sqrt(3)) / 2;
    const v = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * this.camera.aspect);
    return (r * 1.08) / Math.sin(Math.min(v, h));
  }

  /** Point the camera at a face, slightly tilted so neighbouring faces are visible. */
  resetView(face = 0) {
    const { normal, right, up } = FACES[face];
    const dir = new THREE.Vector3(...normal).addScaledVector(new THREE.Vector3(...up), 0.45).addScaledVector(new THREE.Vector3(...right), 0.35).normalize();
    const d = this.fitDistance();
    this.camera.position.copy(dir.multiplyScalar(d));
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = d * 0.3;
    this.controls.maxDistance = d * 1.8;
    this.controls.update();
    this.dirty = true;
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    if (this.controls) {
      const d = this.fitDistance();
      this.controls.minDistance = d * 0.3;
      this.controls.maxDistance = d * 1.8;
    }
    this.dirty = true;
  }

  applyQuality(p) {
    this.quality = p;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, p.pixelRatio));
    if (p.bloom && !this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.4, 0.6));
      this.composer.addPass(new OutputPass());
    } else if (!p.bloom && this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(innerWidth, innerHeight);
    this.dirty = true;
  }

  start() {
    let last = performance.now();
    let renderedLast = false;
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.time += dt;
      let busy = this.controls.update(dt);
      for (const s of this.systems) busy = s.update(dt, this.time) || busy;
      if (this.quality.ambient) {
        for (const a of this.ambient) a(dt, this.time);
        busy = true;
      }
      if (busy || this.dirty) {
        this.renderer.info.reset();
        if (this.composer) this.composer.render(dt);
        else this.renderer.render(this.scene, this.camera);
        this.dirty = false;
        this.onFrame?.(dt, renderedLast);
        renderedLast = true;
      } else {
        renderedLast = false;
      }
    };
    requestAnimationFrame(loop);
  }

  /** Screen position (CSS px) of a point in cube-local cell units. Used by tests/automation. */
  project(local) {
    const v = this.cube.localToWorld(new THREE.Vector3(...local)).project(this.camera);
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  }
}
