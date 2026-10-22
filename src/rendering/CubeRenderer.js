import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';

// Visual layers of the energy cube (built once, rescaled per grid size):
//   shell (translucent walls + engraved grid, fresnel rim) · edges · core · particles.
// The shell box doubles as the click target: FrontSide raycasts only hit the face nearest the camera.

const SHELL_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying float vFacing;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vLocal = position;
    vNormalL = normal;
    vFacing = dot(normalize(mat3(modelMatrix) * normal), normalize(cameraPosition - wp.xyz));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SHELL_FRAG = /* glsl */ `
  uniform float uN;
  uniform float uPower;
  uniform vec3 uColor;
  varying vec3 vLocal;
  varying vec3 vNormalL;
  varying float vFacing;
  void main() {
    vec3 p = vLocal * uN;
    vec3 an = abs(vNormalL);
    vec2 uv = an.x > 0.5 ? p.zy : (an.y > 0.5 ? p.xz : p.xy);
    vec2 f = fract(uv + uN * 0.5);
    vec2 d = min(f, 1.0 - f) / fwidth(uv);
    float grid = 1.0 - clamp(min(d.x, d.y) - 0.5, 0.0, 1.0);
    float rim = pow(1.0 - clamp(vFacing, 0.0, 1.0), 2.5);
    float a = 0.06 + rim * 0.18 + grid * 0.10 + uPower * 0.10;
    vec3 c = uColor * (0.3 + rim * 0.5 + grid * 0.4 + uPower * 0.5);
    gl_FragColor = vec4(c, a);
  }
`;

const FLAT_VERT = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FLAT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  void main() { gl_FragColor = vec4(uColor * (1.0 + uPower * 0.8), 1.0); }
`;

const CORE_VERT = /* glsl */ `
  varying float vFacing;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vFacing = dot(normalize(mat3(modelMatrix) * normal), normalize(cameraPosition - wp.xyz));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const CORE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uPulse;
  varying float vFacing;
  void main() {
    float glow = pow(max(vFacing, 0.0), 2.0);
    gl_FragColor = vec4(uColor * glow * (0.14 + uPulse * 0.05 + uPower * 1.3), 1.0);
  }
`;

const POINTS_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  void main() {
    float a = uTime * 0.15 + position.y * 3.0;
    vec3 p = vec3(position.x * cos(a) - position.z * sin(a), position.y, position.x * sin(a) + position.z * cos(a));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const POINTS_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor * (1.0 - d * 2.0) * (0.5 + uPower), 1.0);
  }
`;

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const color = (c) => ({ value: new THREE.Color(...c) });

export class CubeRenderer {
  constructor(parent) {
    const C = CONFIG.colors;
    this.shell = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.ShaderMaterial({
        vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false,
        uniforms: { uN: { value: 4 }, uPower: { value: 0 }, uColor: color(C.shell) },
      }),
    );
    this.shell.renderOrder = 1;

    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: FLAT_FRAG, uniforms: { uColor: color(C.edge), uPower: { value: 0 } } }),
    );

    this.core = new THREE.Group();
    this.coreGlow = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 2),
      new THREE.ShaderMaterial({ vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, ...additive, uniforms: { uColor: color(C.core), uPower: { value: 0 }, uPulse: { value: 0 } } }),
    );
    this.coreWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.6)),
      new THREE.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: FLAT_FRAG, ...additive, uniforms: { uColor: color([0.08, 0.35, 0.45]), uPower: { value: 0 } } }),
    );
    this.core.add(this.coreGlow, this.coreWire);
    this.core.renderOrder = 0;

    const n = 260;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < pts.length; i++) pts[i] = (Math.random() - 0.5) * 0.85;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.particles = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({ vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG, ...additive, uniforms: { uTime: { value: 0 }, uScale: { value: 60 }, uColor: color([0.15, 0.6, 0.75]), uPower: { value: 0 } } }),
    );
    this.particles.frustumCulled = false;

    this.layers = { shell: this.shell, edges: this.edges, core: this.core, particles: this.particles };
    parent.add(this.core, this.shell, this.edges, this.particles);
  }

  /** Rescale for a grid size (everything lives in cell units). */
  setGrid(N) {
    this.shell.scale.setScalar(N);
    this.shell.material.uniforms.uN.value = N;
    this.edges.scale.setScalar(N * 1.002);
    this.core.scale.setScalar(N * 0.1);
    this.particles.scale.setScalar(N);
  }

  setPower(p) {
    this.shell.material.uniforms.uPower.value = p;
    this.edges.material.uniforms.uPower.value = p;
    this.particles.material.uniforms.uPower.value = p;
  }

  setCorePower(p) {
    this.coreGlow.material.uniforms.uPower.value = p;
    this.coreWire.material.uniforms.uPower.value = p * 3;
  }

  /** Ambient motion (only called when the quality preset allows idle animation). */
  animate(dt, time) {
    this.coreWire.rotation.y += dt * 0.4;
    this.coreWire.rotation.x += dt * 0.15;
    this.coreGlow.material.uniforms.uPulse.value = Math.sin(time * 2);
    this.particles.material.uniforms.uTime.value = time;
  }
}
