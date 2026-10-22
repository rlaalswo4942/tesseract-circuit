// Cube surface as one graph. Units: 1 = one cell. Cube spans [-N/2, N/2] on every axis.
//
// Each face has an outward normal n and an in-plane basis (right, up) with right × up = n.
// Cell (row, col) centre: p = n*N/2 + right*(col - (N-1)/2) + up*((N-1)/2 - row)
//   -> row 0 is the "top" row of the face, col 0 the left column, as seen from outside.
//
// Neighbour rule (no lookup tables): step by a unit in-plane direction d.
//   inside the face  : q = p + d
//   across an edge   : q = p + d/2 - n/2   (lands on the face whose normal is d)
// The shared-edge waypoint is p + d/2, which both faces compute identically.

export const FACES = [
  { id: 'front',  normal: [0, 0, 1],  right: [1, 0, 0],  up: [0, 1, 0] },
  { id: 'back',   normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
  { id: 'right',  normal: [1, 0, 0],  right: [0, 0, -1], up: [0, 1, 0] },
  { id: 'left',   normal: [-1, 0, 0], right: [0, 0, 1],  up: [0, 1, 0] },
  { id: 'top',    normal: [0, 1, 0],  right: [1, 0, 0],  up: [0, 0, -1] },
  { id: 'bottom', normal: [0, -1, 0], right: [1, 0, 0],  up: [0, 0, 1] },
];

export const FACE_INDEX = Object.fromEntries(FACES.map((f, i) => [f.id, i]));

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Positions are always multiples of 1/2, so 2*p is an exact integer key.
const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)},${Math.round(p[2] * 2)}`;

/** Face index whose normal matches the dominant axis of a point on (or near) the surface. */
export function faceOfPoint(p) {
  const ax = Math.abs(p[0]), ay = Math.abs(p[1]), az = Math.abs(p[2]);
  if (ax >= ay && ax >= az) return p[0] > 0 ? FACE_INDEX.right : FACE_INDEX.left;
  if (ay >= az) return p[1] > 0 ? FACE_INDEX.top : FACE_INDEX.bottom;
  return p[2] > 0 ? FACE_INDEX.front : FACE_INDEX.back;
}

export function createTopology(N) {
  const h = N / 2;
  const c = (N - 1) / 2;
  const cells = [];
  const byKey = new Map();

  FACES.forEach((face, f) => {
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const position = add(add(scale(face.normal, h), scale(face.right, col - c)), scale(face.up, c - row));
        const cell = { id: cells.length, face: f, faceId: face.id, row, col, position, neighbors: [] };
        cells.push(cell);
        byKey.set(key(position), cell.id);
      }
    }
  });

  for (const cell of cells) {
    const { normal, right, up } = FACES[cell.face];
    for (const d of [up, scale(up, -1), scale(right, -1), right]) {
      const step = add(cell.position, d);
      const inside = Math.abs(dot(step, right)) < h && Math.abs(dot(step, up)) < h;
      if (inside) {
        cell.neighbors.push({ id: byKey.get(key(step)), dir: d, arrive: d, via: null });
      } else {
        const via = add(cell.position, scale(d, 0.5));
        const q = add(via, scale(normal, -0.5));
        // On the next face we travel inward, i.e. along -n of the face we left.
        cell.neighbors.push({ id: byKey.get(key(q)), dir: d, arrive: scale(normal, -1), via });
      }
    }
  }

  return {
    N,
    cells,
    cellAt(face, row, col) {
      return face * N * N + row * N + col;
    },
    /** Cell under a surface point in cell units, or -1. */
    cellAtPoint(p) {
      const f = faceOfPoint(p);
      const { right, up } = FACES[f];
      const col = Math.floor(dot(p, right) + h);
      const row = Math.floor(h - dot(p, up));
      if (row < 0 || row >= N || col < 0 || col >= N) return -1;
      return f * N * N + row * N + col;
    },
    neighbor(a, b) {
      return cells[a].neighbors.find((n) => n.id === b) || null;
    },
  };
}
