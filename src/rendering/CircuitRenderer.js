import * as THREE from 'three';
import { FACES } from '../maze/CubeTopology.js';
import { CONFIG } from '../config/gameConfig.js';

// Two meshes per stage, one draw call each:
//   static  — every trace, pad and grid dot merged into one geometry (rebuilt only on stage change)
//   path    — the player's energy body; preallocated, only changed steps are rewritten.
// Every step between neighbouring cells is exactly 1 unit long (centre→centre, or centre→edge→centre),
// so path arc length at cell k is k. The shader hides fragments beyond uLen → growth/retraction is
// just animating one uniform.

const SURFACE_VERT = /* glsl */ `
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aArc;
  attribute float aSide;
  varying vec3 vColor;
  varying float vArc;
  varying float vSide;
  varying float vFacing;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vFacing = dot(normalize(mat3(modelMatrix) * aNormal), normalize(cameraPosition - wp.xyz));
    vColor = aColor;
    vArc = aArc;
    vSide = aSide;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const STATIC_FRAG = /* glsl */ `
  uniform float uPower;
  uniform float uBack;
  varying vec3 vColor;
  varying float vSide;
  varying float vFacing;
  void main() {
    float face = mix(uBack, 1.0, smoothstep(-0.15, 0.25, vFacing));
    float core = 1.0 - vSide * vSide * 0.7;
    vec3 lit = mix(vColor, vec3(0.3, 0.9, 1.0), uPower * 0.6);
    gl_FragColor = vec4(lit * core * (1.0 + uPower * 0.8), face);
  }
`;

const PATH_FRAG = /* glsl */ `
  uniform float uLen;
  uniform float uTime;
  uniform float uFlow;
  uniform float uPulse;
  uniform float uTipBoost;
  uniform float uPower;
  uniform vec3 uColor;
  varying float vArc;
  varying float vSide;
  varying float vFacing;
  void main() {
    if (vArc > uLen) discard;
    float face = mix(0.3, 1.0, smoothstep(-0.15, 0.25, vFacing));
    float core = pow(1.0 - abs(vSide), 1.5);
    float flow = 0.75 + 0.25 * sin(vArc * 5.0 - uTime * 7.0) * uFlow;
    float tip = smoothstep(0.8, 0.0, uLen - vArc) * (0.6 + uTipBoost * 1.5);
    float pulse = exp(-pow((vArc - uPulse) * 1.6, 2.0)) * 2.0;
    vec3 c = uColor * (0.45 + 0.4 * core * flow) + vec3(0.8, 1.0, 1.0) * (core * (0.5 * tip + pulse) + uPower * 0.15);
    gl_FragColor = vec4(min(c, vec3(1.3)), face);
  }
`;

const V = THREE.Vector3;

function makeMaterial(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERT,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide, // far-side traces are seen from behind; the shader dims them
    // Normal blending: overlapping pads/ribbons don't pile up into white blobs.
  });
}

/** Growable attribute arrays for quads (4 verts / 6 indices each). */
class QuadWriter {
  constructor(quads) {
    this.pos = new Float32Array(quads * 12);
    this.nrm = new Float32Array(quads * 12);
    this.col = new Float32Array(quads * 12);
    this.arc = new Float32Array(quads * 4);
    this.side = new Float32Array(quads * 4);
  }

  // Corners in order: a-side, a+side, b-side, b+side
  quad(q, corners, normal, color, arcs, sides) {
    for (let i = 0; i < 4; i++) {
      const v = (q * 4 + i) * 3;
      this.pos.set([corners[i].x, corners[i].y, corners[i].z], v);
      this.nrm.set(normal, v);
      this.col.set(color, v);
      this.arc[q * 4 + i] = arcs[i];
      this.side[q * 4 + i] = sides[i];
    }
  }

  ribbon(q, a, b, normal, width, color, arcA, arcB) {
    const n = new V(...normal);
    const s = new V().subVectors(b, a).cross(n).normalize().multiplyScalar(width / 2);
    this.quad(q, [a.clone().sub(s), a.clone().add(s), b.clone().sub(s), b.clone().add(s)], normal, color, [arcA, arcA, arcB, arcB], [-1, 1, -1, 1]);
  }

  pad(q, center, face, size, color, arc) {
    const { normal, right, up } = FACES[face];
    const r = new V(...right).multiplyScalar(size / 2);
    const u = new V(...up).multiplyScalar(size / 2);
    const c = [center.clone().sub(r).sub(u), center.clone().add(r).sub(u), center.clone().sub(r).add(u), center.clone().add(r).add(u)];
    this.quad(q, c, normal, color, [arc, arc, arc, arc], [0, 0, 0, 0]);
  }

  /** Collapse a quad to a point so it draws nothing. */
  empty(q) {
    this.pos.fill(0, q * 12, q * 12 + 12);
  }

  geometry(quads) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aNormal', new THREE.BufferAttribute(this.nrm, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aArc', new THREE.BufferAttribute(this.arc, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    const idx = new (quads * 4 > 65535 ? Uint32Array : Uint16Array)(quads * 6);
    for (let q = 0; q < quads; q++) idx.set([q * 4, q * 4 + 2, q * 4 + 1, q * 4 + 1, q * 4 + 2, q * 4 + 3], q * 6);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }
}

export class CircuitRenderer {
  constructor(parent) {
    // Persistent layer groups so visibility toggles survive stage changes.
    this.staticLayer = new THREE.Group();
    this.pathLayer = new THREE.Group();
    parent.add(this.staticLayer, this.pathLayer);
    this.staticMat = makeMaterial(STATIC_FRAG, { uPower: { value: 0 }, uBack: { value: 0.18 } });
    this.pathMat = makeMaterial(PATH_FRAG, {
      uLen: { value: 0 }, uTime: { value: 0 }, uFlow: { value: 1 }, uPulse: { value: -10 },
      uTipBoost: { value: 0 }, uPower: { value: 0 }, uColor: { value: new THREE.Color(...CONFIG.colors.path) },
    });
    this.staticMesh = null;
    this.pathMesh = null;
    this.display = 0; // animated arc length shown
    this.target = 0;
    this.rate = 1;
  }

  /** Lifted surface point of a cell centre. */
  cellPoint(cell, lift) {
    return new V(...cell.position).addScaledVector(new V(...FACES[cell.face].normal), lift);
  }

  /** Lifted edge waypoint shared by two faces (lifted along both normals so ribbons meet exactly). */
  viaPoint(via, fa, fb, lift) {
    return new V(...via).addScaledVector(new V(...FACES[fa].normal), lift).addScaledVector(new V(...FACES[fb].normal), lift);
  }

  /** Writes the 1–2 ribbons for one step a→b into quads q, q+1. */
  writeStep(w, q, a, b, width, color, arcA, lift) {
    const { topo } = this.maze;
    const ca = topo.cells[a];
    const cb = topo.cells[b];
    const nb = topo.neighbor(a, b);
    const pa = this.cellPoint(ca, lift);
    const pb = this.cellPoint(cb, lift);
    if (!nb.via) {
      w.ribbon(q, pa, pb, FACES[ca.face].normal, width, color, arcA, arcA + 1);
      w.empty(q + 1);
    } else {
      const pv = this.viaPoint(nb.via, ca.face, cb.face, lift);
      w.ribbon(q, pa, pv, FACES[ca.face].normal, width, color, arcA, arcA + 0.5);
      w.ribbon(q + 1, pv, pb, FACES[cb.face].normal, width, color, arcA + 0.5, arcA + 1);
    }
  }

  setMaze(maze) {
    this.dispose();
    this.maze = maze;
    const { topo } = maze;
    const C = CONFIG.colors;

    const edges = maze.edges();
    const quads = edges.length * 2 + topo.cells.length;
    const w = new QuadWriter(quads);
    let q = 0;
    for (const [a, b] of edges) {
      this.writeStep(w, q, a, b, CONFIG.traceWidth, C.trace, 0, CONFIG.lift);
      q += 2;
    }
    for (const cell of topo.cells) {
      const p = this.cellPoint(cell, CONFIG.lift * 1.2);
      if (cell.id === maze.start) w.pad(q++, p, cell.face, CONFIG.padSize * 1.6, C.start, 0);
      else if (cell.id === maze.goal) w.pad(q++, p, cell.face, CONFIG.padSize * 1.6, C.goal, 0);
      else if (maze.isCircuit(cell.id)) w.pad(q++, p, cell.face, CONFIG.padSize, C.pad, 0);
      else w.pad(q++, p, cell.face, CONFIG.dotSize, C.dot, 0);
    }
    this.staticMesh = new THREE.Mesh(w.geometry(quads), this.staticMat);
    this.staticMesh.renderOrder = 2;
    this.staticLayer.add(this.staticMesh);

    // Path: 3 quads per slot (two ribbon halves + pad). Slot 0 is the start pad.
    this.capacity = topo.cells.length;
    this.pw = new QuadWriter(this.capacity * 3);
    this.pathGeom = this.pw.geometry(this.capacity * 3);
    for (const name of ['position', 'aNormal', 'aArc', 'aSide']) this.pathGeom.getAttribute(name).setUsage(THREE.DynamicDrawUsage);
    this.pathMesh = new THREE.Mesh(this.pathGeom, this.pathMat);
    this.pathMesh.frustumCulled = false;
    this.pathMesh.renderOrder = 3;
    this.pathLayer.add(this.pathMesh);
    this.built = [];
    this.written = 0;
    this.display = this.target = 0;
    this.pathMat.uniforms.uLen.value = 0;
    this.setPath([maze.start], true);
  }

  /** Sync the energy body with the path; only slots after the first changed cell are rewritten. */
  setPath(path, instant = false) {
    let first = 0;
    while (first < path.length && first < this.built.length && path[first] === this.built[first]) first++;
    const { topo } = this.maze;
    const pw = this.pw;
    for (let k = first; k < path.length; k++) {
      const q = k * 3;
      if (k === 0) {
        pw.empty(q);
        pw.empty(q + 1);
      } else {
        this.writeStep(pw, q, path[k - 1], path[k], CONFIG.pathWidth, CONFIG.colors.path, k - 1, CONFIG.pathLift);
      }
      pw.pad(q + 2, this.cellPoint(topo.cells[path[k]], CONFIG.pathLift * 1.1), topo.cells[path[k]].face, CONFIG.pathPad, CONFIG.colors.path, Math.max(0, k - 0.15));
    }
    if (first < path.length) {
      for (const name of ['position', 'aNormal', 'aArc', 'aSide']) {
        const attr = this.pathGeom.getAttribute(name);
        attr.clearUpdateRanges();
        attr.addUpdateRange(first * 12 * attr.itemSize, (path.length - first) * 12 * attr.itemSize);
        attr.needsUpdate = true;
      }
      // A different branch replaced old cells: never show the stale tail beyond the fork.
      if (first < this.built.length) this.display = Math.min(this.display, first);
    }
    this.built = path.slice();
    this.written = Math.max(this.written, path.length);
    this.pathGeom.setDrawRange(0, this.written * 18);

    this.target = path.length - 1;
    const diff = Math.abs(this.target - this.display);
    this.rate = Math.max(1 / CONFIG.extendDuration, diff / CONFIG.retractMaxDuration);
    if (instant) this.display = this.target;
    this.pathMat.uniforms.uLen.value = this.display;
  }

  /** Returns true while the body is still growing or shrinking. */
  update(dt, time) {
    this.pathMat.uniforms.uTime.value = time;
    if (this.display === this.target) return false;
    const step = this.rate * dt;
    this.display = Math.abs(this.target - this.display) <= step ? this.target : this.display + Math.sign(this.target - this.display) * step;
    this.pathMat.uniforms.uLen.value = this.display;
    if (this.display === this.target && this.written > this.built.length) {
      this.written = this.built.length;
      this.pathGeom.setDrawRange(0, this.written * 18);
    }
    return true;
  }

  dispose() {
    for (const m of [this.staticMesh, this.pathMesh]) {
      if (!m) continue;
      m.geometry.dispose();
      m.removeFromParent();
    }
    this.staticMesh = this.pathMesh = null;
  }
}
