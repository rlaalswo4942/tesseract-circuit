// Circuit graph laid over the cube topology. A cell is a circuit node iff it has an adjacency entry.
// Pure data: rendering reads it, never the other way around.

export class MazeGraph {
  constructor(topo) {
    this.topo = topo;
    this.adj = new Map();
    this.start = -1;
    this.goal = -1;
    this.requiredFaces = [];
  }

  addNode(id) {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
  }

  connect(a, b) {
    if (!this.topo.neighbor(a, b)) throw new Error(`cells ${a} and ${b} are not surface neighbours`);
    this.addNode(a);
    this.addNode(b);
    this.adj.get(a).add(b);
    this.adj.get(b).add(a);
  }

  disconnect(a, b) {
    this.adj.get(a)?.delete(b);
    this.adj.get(b)?.delete(a);
  }

  isCircuit(id) {
    return this.adj.has(id);
  }

  connected(a, b) {
    return !!this.adj.get(a)?.has(b);
  }

  /** Each undirected edge once, as [a, b] with a < b. */
  edges() {
    const out = [];
    for (const [a, set] of this.adj) for (const b of set) if (a < b) out.push([a, b]);
    return out;
  }

  /** BFS shortest path start→goal (cell ids) or null. `blocked(id)` excludes nodes. */
  shortestPath(from = this.start, to = this.goal, blocked = null) {
    const prev = new Map([[from, -1]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      if (cur === to) break;
      for (const nb of this.adj.get(cur) || []) {
        if (prev.has(nb) || (blocked && blocked(nb))) continue;
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
    if (!prev.has(to)) return null;
    const path = [];
    for (let c = to; c !== -1; c = prev.get(c)) path.push(c);
    return path.reverse();
  }

  toJSON() {
    return { N: this.topo.N, start: this.start, goal: this.goal, requiredFaces: this.requiredFaces, edges: this.edges() };
  }
}
