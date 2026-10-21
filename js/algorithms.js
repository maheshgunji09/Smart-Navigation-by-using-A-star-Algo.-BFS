/* ============================================================
 *  algorithms.js — 6 routing algorithms + MinHeap + comparator
 *  Dijkstra · Bellman-Ford · A* · BFS · DFS · Floyd-Warshall
 * ============================================================ */

/* ---------------------------------------------------------- */
/*  MinHeap — array-based binary min-heap                      */
/* ---------------------------------------------------------- */

class MinHeap {
  constructor() {
    /** @type {Array<{key:number, value:*}>} */
    this.heap = [];
  }

  /**
   * Insert an element with the given priority key.
   * @param {number} key   Priority (lower = higher priority)
   * @param {*}      value Payload
   */
  push(key, value) {
    this.heap.push({ key, value });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Extract the element with the smallest key.
   * @returns {{key:number, value:*}|undefined}
   */
  pop() {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  /** @returns {number} */
  get size() {
    return this.heap.length;
  }

  /** @private */
  _swap(i, j) {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }

  /** @private */
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].key < this.heap[parent].key) {
        this._swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  /** @private */
  _bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].key < this.heap[smallest].key) {
        smallest = left;
      }
      if (right < n && this.heap[right].key < this.heap[smallest].key) {
        smallest = right;
      }
      if (smallest !== i) {
        this._swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }
}

/* ---------------------------------------------------------- */
/*  Helper: reconstruct path from prev map                     */
/* ---------------------------------------------------------- */

function _reconstructPath(prev, source, target) {
  const path = [];
  let cur = target;
  while (cur !== undefined && cur !== null) {
    path.push(cur);
    if (cur === source) break;
    cur = prev.get(cur);
  }
  if (path[path.length - 1] !== source) return []; // unreachable
  path.reverse();
  return path;
}

/* ============================================================
 *  1. Dijkstra's Algorithm
 * ============================================================ */

/**
 * Dijkstra's shortest-path with a binary min-heap.
 * @param {Graph}    graph
 * @param {number}   source   Source node id
 * @param {number}   target   Target node id
 * @param {function} weightFn Edge → numeric weight
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function dijkstra(graph, source, target, weightFn) {
  const t0 = performance.now();

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  let visitedCount = 0;

  dist.set(source, 0);
  prev.set(source, null);
  heap.push(0, source);

  while (heap.size > 0) {
    const { key: d, value: u } = heap.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    visitedCount++;

    if (u === target) {
      return {
        path: _reconstructPath(prev, source, target),
        cost: d,
        visited: visitedCount,
        timeMs: performance.now() - t0
      };
    }

    for (const edge of graph.neighbors(u)) {
      if (visited.has(edge.to)) continue;
      const nd = d + weightFn(edge);
      if (!dist.has(edge.to) || nd < dist.get(edge.to)) {
        dist.set(edge.to, nd);
        prev.set(edge.to, u);
        heap.push(nd, edge.to);
      }
    }
  }

  return {
    path: [],
    cost: Infinity,
    visited: visitedCount,
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  2. Bellman-Ford Algorithm
 * ============================================================ */

/**
 * Bellman-Ford shortest-path (V-1 edge-relaxation iterations).
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function bellmanFord(graph, source, target, weightFn) {
  const t0 = performance.now();

  const dist = new Map();
  const prev = new Map();
  let totalRelaxations = 0;

  // Collect all node ids
  const nodeIds = [...graph.nodes.keys()];
  const V = nodeIds.length;

  // Initialise
  for (const id of nodeIds) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(source, 0);

  // Collect directed edge list (each undirected edge stored both ways in adj)
  const edges = [];
  for (const u of nodeIds) {
    for (const edge of graph.neighbors(u)) {
      edges.push({ from: u, to: edge.to, edge });
    }
  }

  // V-1 iterations
  for (let i = 0; i < V - 1; i++) {
    let changed = false;
    for (const { from, to, edge } of edges) {
      totalRelaxations++;
      const w = weightFn(edge);
      if (dist.get(from) + w < dist.get(to)) {
        dist.set(to, dist.get(from) + w);
        prev.set(to, from);
        changed = true;
      }
    }
    // Early exit if nothing changed
    if (!changed) break;
  }

  const path = _reconstructPath(prev, source, target);
  const cost = dist.get(target);

  return {
    path: cost === Infinity ? [] : path,
    cost: cost,
    visited: totalRelaxations,
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  3. A* Algorithm
 * ============================================================ */

/**
 * A* search using haversine as the admissible heuristic.
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function aStar(graph, source, target, weightFn) {
  const t0 = performance.now();

  const gScore = new Map();
  const prev = new Map();
  const closed = new Set();
  const heap = new MinHeap();
  let visitedCount = 0;

  gScore.set(source, 0);
  prev.set(source, null);
  const h0 = graph.haversine(source, target);
  heap.push(h0, source);

  while (heap.size > 0) {
    const { value: u } = heap.pop();
    if (closed.has(u)) continue;
    closed.add(u);
    visitedCount++;

    if (u === target) {
      return {
        path: _reconstructPath(prev, source, target),
        cost: gScore.get(target),
        visited: visitedCount,
        timeMs: performance.now() - t0
      };
    }

    const gU = gScore.get(u);

    for (const edge of graph.neighbors(u)) {
      if (closed.has(edge.to)) continue;
      const tentativeG = gU + weightFn(edge);
      if (!gScore.has(edge.to) || tentativeG < gScore.get(edge.to)) {
        gScore.set(edge.to, tentativeG);
        prev.set(edge.to, u);
        const f = tentativeG + graph.haversine(edge.to, target);
        heap.push(f, edge.to);
      }
    }
  }

  return {
    path: [],
    cost: Infinity,
    visited: visitedCount,
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  4. BFS (Breadth-First Search)
 * ============================================================ */

/**
 * Standard BFS — hop-count path (ignores edge weights).
 * Cost = number of hops.
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn  (unused, for API consistency)
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function bfs(graph, source, target, weightFn) {
  const t0 = performance.now();

  const visited = new Set();
  const prev = new Map();
  const queue = [];
  let visitedCount = 0;

  visited.add(source);
  prev.set(source, null);
  queue.push(source);

  while (queue.length > 0) {
    const u = queue.shift();
    visitedCount++;

    if (u === target) {
      const path = _reconstructPath(prev, source, target);
      return {
        path,
        cost: path.length - 1, // hop count
        visited: visitedCount,
        timeMs: performance.now() - t0
      };
    }

    for (const edge of graph.neighbors(u)) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        prev.set(edge.to, u);
        queue.push(edge.to);
      }
    }
  }

  return {
    path: [],
    cost: Infinity,
    visited: visitedCount,
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  5. DFS (Depth-First Search) — iterative
 * ============================================================ */

/**
 * Iterative DFS — returns first path found (not necessarily shortest).
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn  (unused, for API consistency)
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function dfs(graph, source, target, weightFn) {
  const t0 = performance.now();

  const visited = new Set();
  const prev = new Map();
  const stack = [];
  let visitedCount = 0;

  prev.set(source, null);
  stack.push(source);

  while (stack.length > 0) {
    const u = stack.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    visitedCount++;

    if (u === target) {
      const path = _reconstructPath(prev, source, target);
      // Compute weighted cost along the path found
      let cost = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = graph.neighbors(path[i]).find(e => e.to === path[i + 1]);
        if (edge) cost += weightFn(edge);
      }
      return {
        path,
        cost,
        visited: visitedCount,
        timeMs: performance.now() - t0
      };
    }

    const nbrs = graph.neighbors(u);
    // Push in reverse to process first neighbor first (standard iterative DFS)
    for (let i = nbrs.length - 1; i >= 0; i--) {
      const edge = nbrs[i];
      if (!visited.has(edge.to)) {
        prev.set(edge.to, u);
        stack.push(edge.to);
      }
    }
  }

  return {
    path: [],
    cost: Infinity,
    visited: visitedCount,
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  6. Floyd-Warshall (subgraph version)
 * ============================================================ */

/**
 * Floyd-Warshall on a BFS-collected subgraph (~80 nodes around source & target).
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn
 * @returns {{path:number[], cost:number, visited:number, timeMs:number}}
 */
function floydWarshall(graph, source, target, weightFn) {
  const t0 = performance.now();

  // 1. BFS-expand from source and target to collect nearby nodes
  const subNodes = new Set();

  function bfsExpand(start, maxNodes) {
    const q = [start];
    const seen = new Set([start]);
    while (q.length > 0 && subNodes.size + seen.size < maxNodes) {
      const u = q.shift();
      subNodes.add(u);
      for (const edge of graph.neighbors(u)) {
        if (!seen.has(edge.to) && !subNodes.has(edge.to)) {
          seen.add(edge.to);
          q.push(edge.to);
        }
      }
    }
    // Add remaining seen nodes
    for (const s of seen) subNodes.add(s);
  }

  bfsExpand(source, 50);
  bfsExpand(target, 80);

  // Ensure source and target are included
  subNodes.add(source);
  subNodes.add(target);

  // 2. Map subgraph node IDs to indices 0..N-1
  const indexMap = new Map();
  const idList = [...subNodes];
  const N = idList.length;
  for (let i = 0; i < N; i++) {
    indexMap.set(idList[i], i);
  }

  // 3. Initialise distance and next-hop matrices
  const dist = Array.from({ length: N }, () => new Float64Array(N).fill(Infinity));
  const next = Array.from({ length: N }, () => new Int32Array(N).fill(-1));

  // Self-loops
  for (let i = 0; i < N; i++) {
    dist[i][i] = 0;
    next[i][i] = i;
  }

  // Fill in edges that stay within the subgraph
  for (const u of idList) {
    const ui = indexMap.get(u);
    for (const edge of graph.neighbors(u)) {
      if (indexMap.has(edge.to)) {
        const vi = indexMap.get(edge.to);
        const w = weightFn(edge);
        if (w < dist[ui][vi]) {
          dist[ui][vi] = w;
          next[ui][vi] = vi;
        }
      }
    }
  }

  // 4. Floyd-Warshall DP: O(N^3)
  for (let k = 0; k < N; k++) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const via = dist[i][k] + dist[k][j];
        if (via < dist[i][j]) {
          dist[i][j] = via;
          next[i][j] = next[i][k];
        }
      }
    }
  }

  // 5. Reconstruct path
  const si = indexMap.get(source);
  const ti = indexMap.get(target);
  const cost = dist[si][ti];

  if (cost === Infinity || next[si][ti] === -1) {
    return {
      path: [],
      cost: Infinity,
      visited: N,
      timeMs: performance.now() - t0
    };
  }

  const path = [];
  let cur = si;
  const safetyLimit = N + 1;
  let steps = 0;
  while (cur !== ti && steps < safetyLimit) {
    path.push(idList[cur]);
    cur = next[cur][ti];
    steps++;
  }
  path.push(idList[ti]);

  return {
    path: steps >= safetyLimit ? [] : path,
    cost: cost,
    visited: N, // subgraph size
    timeMs: performance.now() - t0
  };
}

/* ============================================================
 *  compareAlgorithms — run all 6 and return labelled results
 * ============================================================ */

/**
 * Run all 6 algorithms on the same (source, target, weightFn) and return
 * an array of result objects with colours and complexity labels.
 *
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn
 * @returns {Array<{name:string, color:string, path:number[], cost:number, visited:number, timeMs:number, timeComplexity:string, spaceComplexity:string}>}
 */
function compareAlgorithms(graph, source, target, weightFn) {
  const V = graph.nodeCount;
  const E = graph.edgeCount;

  const algorithms = [
    {
      name: 'Dijkstra',
      color: '#00d4ff',
      fn: dijkstra,
      timeComplexity: `O((V+E) log V)  ≈ O(${V + E} × ${Math.ceil(Math.log2(V || 1))})`,
      spaceComplexity: `O(V)  ≈ O(${V})`
    },
    {
      name: 'Bellman-Ford',
      color: '#7c3aed',
      fn: bellmanFord,
      timeComplexity: `O(V × E)  ≈ O(${V} × ${E})`,
      spaceComplexity: `O(V)  ≈ O(${V})`
    },
    {
      name: 'A*',
      color: '#10b981',
      fn: aStar,
      timeComplexity: `O((V+E) log V)  ≈ O(${V + E} × ${Math.ceil(Math.log2(V || 1))})`,
      spaceComplexity: `O(V)  ≈ O(${V})`
    },
    {
      name: 'BFS',
      color: '#f59e0b',
      fn: bfs,
      timeComplexity: `O(V + E)  ≈ O(${V + E})`,
      spaceComplexity: `O(V)  ≈ O(${V})`
    },
    {
      name: 'DFS',
      color: '#ef4444',
      fn: dfs,
      timeComplexity: `O(V + E)  ≈ O(${V + E})`,
      spaceComplexity: `O(V)  ≈ O(${V})`
    },
    {
      name: 'Floyd-Warshall',
      color: '#3b82f6',
      fn: floydWarshall,
      timeComplexity: `O(N³)  subgraph N ≈ 80`,
      spaceComplexity: `O(N²)  subgraph N ≈ 80`
    }
  ];

  const results = [];

  for (const algo of algorithms) {
    const result = algo.fn(graph, source, target, weightFn);
    results.push({
      name: algo.name,
      color: algo.color,
      path: result.path,
      cost: result.cost,
      visited: result.visited,
      timeMs: result.timeMs,
      timeComplexity: algo.timeComplexity,
      spaceComplexity: algo.spaceComplexity
    });
  }

  return results;
}
