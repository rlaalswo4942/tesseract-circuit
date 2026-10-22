import { describe, it, expect } from 'vitest';
import { createTopology, FACES } from '../src/maze/CubeTopology.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('face bases', () => {
  it('are orthonormal and right × up = normal', () => {
    for (const f of FACES) {
      expect(dot(f.right, f.up)).toBe(0);
      expect(dot(f.right, f.normal)).toBe(0);
      expect(cross(f.right, f.up).map((v) => v + 0)).toEqual(f.normal);
    }
  });
});

describe.each([4, 5, 6])('topology N=%i', (N) => {
  const topo = createTopology(N);

  it('has 6 faces × N² unique cells', () => {
    expect(topo.cells.length).toBe(6 * N * N);
    expect(new Set(topo.cells.map((c) => c.id)).size).toBe(6 * N * N);
    expect(new Set(topo.cells.map((c) => c.position.join())).size).toBe(6 * N * N);
    for (let f = 0; f < 6; f++) expect(topo.cells.filter((c) => c.face === f).length).toBe(N * N);
  });

  it('every cell has exactly 4 distinct neighbours', () => {
    for (const c of topo.cells) {
      const ids = c.neighbors.map((n) => n.id);
      expect(ids.every((id) => id !== undefined && id !== c.id)).toBe(true);
      expect(new Set(ids).size).toBe(4);
    }
  });

  it('adjacency is symmetric and edge waypoints agree from both sides', () => {
    for (const c of topo.cells) {
      for (const n of c.neighbors) {
        const back = topo.neighbor(n.id, c.id);
        expect(back).not.toBeNull();
        if (n.via) expect(back.via).toEqual(n.via);
        else expect(back.via).toBeNull();
      }
    }
  });

  it('only connects faces that really share an edge (never opposite faces, no diagonals)', () => {
    for (const c of topo.cells) {
      for (const n of c.neighbors) {
        const o = topo.cells[n.id];
        if (o.face === c.face) {
          expect(dist(c.position, o.position)).toBeCloseTo(1); // orthogonal step on the face
        } else {
          // Adjacent faces have perpendicular normals; centres are each half a cell from the shared edge.
          expect(dot(FACES[c.face].normal, FACES[o.face].normal)).toBe(0);
          expect(dist(c.position, n.via)).toBeCloseTo(0.5);
          expect(dist(o.position, n.via)).toBeCloseTo(0.5);
          expect(Math.max(...n.via.map(Math.abs))).toBeCloseTo(N / 2); // waypoint lies on a cube edge
        }
      }
    }
  });

  it('each face borders exactly 4 other faces with N cells per edge', () => {
    for (let f = 0; f < 6; f++) {
      const counts = {};
      for (const c of topo.cells.filter((c) => c.face === f)) {
        for (const n of c.neighbors) {
          const of = topo.cells[n.id].face;
          if (of !== f) counts[of] = (counts[of] || 0) + 1;
        }
      }
      expect(Object.keys(counts).length).toBe(4);
      expect(Object.values(counts).every((v) => v === N)).toBe(true);
    }
  });

  it('corner cells have 2 cross-edge neighbours on different faces (vertex-only contact excluded)', () => {
    const corner = topo.cells[topo.cellAt(0, 0, 0)];
    const cross = corner.neighbors.filter((n) => n.via);
    expect(cross.length).toBe(2);
    expect(new Set(cross.map((n) => topo.cells[n.id].face)).size).toBe(2);
  });

  it('cellAtPoint inverts cell positions', () => {
    for (const c of topo.cells) expect(topo.cellAtPoint(c.position)).toBe(c.id);
  });
});

it('known mapping: front top row crosses to top bottom row (N=4)', () => {
  const topo = createTopology(4);
  const f01 = topo.cellAt(0, 0, 1);
  const up = topo.cells[f01].neighbors[0];
  expect(topo.cells[up.id]).toMatchObject({ faceId: 'top', row: 3, col: 1 });
  // Reversed orientation edge: front right column → right face left column, same row.
  const f13 = topo.cellAt(0, 1, 3);
  const east = topo.cells[f13].neighbors[3];
  expect(topo.cells[east.id]).toMatchObject({ faceId: 'right', row: 1, col: 0 });
});
