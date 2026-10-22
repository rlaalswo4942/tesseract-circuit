// Player path state. Pure logic: no rendering, no DOM.
//   click on the end's connected neighbour → extend
//   click on a cell already in the path    → cut that cell and everything after it (start always stays)
//   anything else                          → no change
export class PathManager {
  constructor(maze) {
    this.maze = maze;
    this.path = [maze.start];
    this.completed = false;
  }

  get end() {
    return this.path[this.path.length - 1];
  }

  /** Returns { type: 'extend' | 'retract' | 'complete' | 'none', removed?: number[] }. */
  click(id) {
    if (this.completed || !this.maze.isCircuit(id)) return { type: 'none' };
    const idx = this.path.indexOf(id);
    if (idx !== -1) {
      const keep = Math.max(1, idx);
      if (keep === this.path.length) return { type: 'none' };
      return { type: 'retract', removed: this.path.splice(keep) };
    }
    if (!this.maze.connected(this.end, id)) return { type: 'none' };
    this.path.push(id);
    if (id === this.maze.goal) {
      this.completed = true;
      return { type: 'complete' };
    }
    return { type: 'extend' };
  }

  reset() {
    if (this.completed || this.path.length === 1) return { type: 'none' };
    return { type: 'retract', removed: this.path.splice(1) };
  }
}
