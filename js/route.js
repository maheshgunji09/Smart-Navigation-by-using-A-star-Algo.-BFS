/* ============================================================
 *  route.js — Yen's K-shortest paths + route scoring
 *  Builds up to K alternative routes with summary metrics
 * ============================================================ */

/* ---------------------------------------------------------- */
/*  computeRouteMetrics — sum edge attributes along a path     */
/* ---------------------------------------------------------- */

/**
 * Sum distance, time, fuel, toll, traffic, and risk for all edges in a path.
 * @param {Graph}    graph
 * @param {number[]} path  Array of node ids forming the route
 * @returns {{distance:number, time:number, fuel:number, toll:number, traffic:number, risk:number}}
 */
function computeRouteMetrics(graph, path) {
  const metrics = { distance: 0, time: 0, fuel: 0, toll: 0, traffic: 0, risk: 0 };
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.neighbors(path[i]).find(e => e.to === path[i + 1]);
    if (edge) {
      metrics.distance += edge.distance;
      metrics.time += edge.time;
      metrics.fuel += edge.fuel;
      metrics.toll += edge.toll;
      metrics.traffic += edge.traffic;
      metrics.risk += edge.risk;
    }
  }
  return metrics;
}

/* ---------------------------------------------------------- */
/*  Internal: modified Dijkstra that respects blocked edges     */
/* ---------------------------------------------------------- */

/**
 * Dijkstra that skips a set of blocked edges and blocked root nodes.
 * Used as the inner subroutine of Yen's algorithm.
 *
 * @param {Graph}             graph
 * @param {number}            source
 * @param {number}            target
 * @param {function}          weightFn
 * @param {Set<string>}       blockedEdges   Set of "from-to" keys to skip
 * @param {Set<number>}       blockedNodes   Set of node ids to avoid (except source & target)
 * @returns {{path:number[], cost:number}|null}
 */
function _dijkstraBlocked(graph, source, target, weightFn, blockedEdges, blockedNodes) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  // Inline MinHeap to avoid cross-file dependency
  const heap = [];
  function heapPush(key, value) {
    heap.push({ key, value });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[i].key < heap[p].key) {
        const tmp = heap[i]; heap[i] = heap[p]; heap[p] = tmp;
        i = p;
      } else break;
    }
  }
  function heapPop() {
    if (heap.length === 0) return undefined;
    const min = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last !== undefined) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let s = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < heap.length && heap[l].key < heap[s].key) s = l;
        if (r < heap.length && heap[r].key < heap[s].key) s = r;
        if (s !== i) {
          const tmp = heap[i]; heap[i] = heap[s]; heap[s] = tmp;
          i = s;
        } else break;
      }
    }
    return min;
  }

  dist.set(source, 0);
  prev.set(source, null);
  heapPush(0, source);

  while (heap.length > 0) {
    const { key: d, value: u } = heapPop();
    if (visited.has(u)) continue;
    visited.add(u);

    if (u === target) {
      // Reconstruct
      const path = [];
      let cur = target;
      while (cur !== null && cur !== undefined) {
        path.push(cur);
        if (cur === source) break;
        cur = prev.get(cur);
      }
      if (path[path.length - 1] !== source) return null;
      path.reverse();
      return { path, cost: d };
    }

    for (const edge of graph.neighbors(u)) {
      if (visited.has(edge.to)) continue;
      if (blockedNodes.has(edge.to)) continue;
      const edgeKey = u + '-' + edge.to;
      if (blockedEdges.has(edgeKey)) continue;

      const nd = d + weightFn(edge);
      if (!dist.has(edge.to) || nd < dist.get(edge.to)) {
        dist.set(edge.to, nd);
        prev.set(edge.to, u);
        heapPush(nd, edge.to);
      }
    }
  }

  return null;
}

/* ---------------------------------------------------------- */
/*  Yen's K-Shortest Paths                                     */
/* ---------------------------------------------------------- */

/**
 * Compare two paths for equality.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {boolean}
 */
function _pathsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Build up to K alternative routes using Yen's K-shortest paths algorithm.
 *
 * @param {Graph}    graph
 * @param {number}   source
 * @param {number}   target
 * @param {function} weightFn  Edge → numeric weight
 * @param {number}   [K=5]     Maximum number of routes to find
 * @returns {Array<{path:number[], cost:number, distance:number, time:number, fuel:number, toll:number, traffic:number, risk:number, score:number, labels:string[]}>}
 */
function buildRoutes(graph, source, target, weightFn, K = 5) {
  // ---------------------------------------------------------
  // Step 1: Find the first shortest path via plain Dijkstra
  // ---------------------------------------------------------
  const firstResult = _dijkstraBlocked(graph, source, target, weightFn, new Set(), new Set());
  if (!firstResult || firstResult.path.length === 0) return [];

  /** @type {Array<{path:number[], cost:number}>} */
  const A = [firstResult]; // confirmed shortest paths

  /** @type {Array<{path:number[], cost:number}>} */
  const B = []; // candidate pool (sorted by cost)

  // Set to quickly check for duplicate candidate paths
  const pathSet = new Set();
  pathSet.add(firstResult.path.join(','));

  // ---------------------------------------------------------
  // Step 2: Yen's iterations to find paths 2..K
  // ---------------------------------------------------------
  for (let k = 1; k < K; k++) {
    const prevPath = A[k - 1].path;

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      // Compute root cost
      let rootCost = 0;
      for (let r = 0; r < rootPath.length - 1; r++) {
        const edge = graph.neighbors(rootPath[r]).find(e => e.to === rootPath[r + 1]);
        if (edge) rootCost += weightFn(edge);
      }

      // Block edges: for each already-found path that shares the same root,
      // block the edge leaving the spur node in that path.
      const blockedEdges = new Set();
      for (const confirmedPath of A) {
        if (confirmedPath.path.length > i) {
          // Check if root prefix matches
          let prefixMatch = true;
          for (let r = 0; r <= i; r++) {
            if (r >= confirmedPath.path.length || confirmedPath.path[r] !== rootPath[r]) {
              prefixMatch = false;
              break;
            }
          }
          if (prefixMatch && i + 1 < confirmedPath.path.length) {
            blockedEdges.add(confirmedPath.path[i] + '-' + confirmedPath.path[i + 1]);
          }
        }
      }

      // Block root path nodes (except spur node) to avoid loops
      const blockedNodes = new Set();
      for (let r = 0; r < i; r++) {
        blockedNodes.add(rootPath[r]);
      }

      // Run Dijkstra from spur node to target
      const spurResult = _dijkstraBlocked(graph, spurNode, target, weightFn, blockedEdges, blockedNodes);

      if (spurResult && spurResult.path.length > 0) {
        // Combine: root path (without spur node) + spur path
        const totalPath = rootPath.slice(0, rootPath.length - 1).concat(spurResult.path);
        const totalCost = rootCost + spurResult.cost;
        const key = totalPath.join(',');

        if (!pathSet.has(key)) {
          pathSet.add(key);
          B.push({ path: totalPath, cost: totalCost });
        }
      }
    }

    if (B.length === 0) break;

    // Sort candidates by cost and pick the best one
    B.sort((a, b) => a.cost - b.cost);
    const best = B.shift();
    A.push(best);
  }

  // ---------------------------------------------------------
  // Step 3: Compute summary metrics & score for each route
  // ---------------------------------------------------------
  const routes = A.map((route, idx) => {
    const metrics = computeRouteMetrics(graph, route.path);
    // Score formula: 100 / (1 + 0.001 * (0.4*distance + 0.3*time + 0.2*fuel + 0.1*traffic))
    const rawScore = 100 / (1 + 0.001 * (
      0.4 * metrics.distance +
      0.3 * metrics.time +
      0.2 * metrics.fuel +
      0.1 * metrics.traffic
    ));

    return {
      path: route.path,
      cost: route.cost,
      distance: metrics.distance,
      time: metrics.time,
      fuel: metrics.fuel,
      toll: metrics.toll,
      traffic: metrics.traffic,
      risk: metrics.risk,
      score: rawScore,
      labels: []
    };
  });

  if (routes.length === 0) return routes;

  // ---------------------------------------------------------
  // Step 4: Normalise scores to 0-100 range
  // ---------------------------------------------------------
  const maxScore = Math.max(...routes.map(r => r.score));
  const minScore = Math.min(...routes.map(r => r.score));
  const scoreRange = maxScore - minScore;
  for (const route of routes) {
    route.score = scoreRange > 0
      ? Math.round(((route.score - minScore) / scoreRange) * 100)
      : 100;
  }

  // ---------------------------------------------------------
  // Step 5: Assign labels
  // ---------------------------------------------------------
  // Route 0 (best by weight) always gets 'Best'
  routes[0].labels.push('Best');

  // Find minimums
  const labelCriteria = [
    { key: 'distance', label: 'Shortest' },
    { key: 'time', label: 'Fastest' },
    { key: 'fuel', label: 'Cheapest' },
    { key: 'toll', label: 'Least Toll' },
    { key: 'traffic', label: 'Least Traffic' }
  ];

  for (const { key, label } of labelCriteria) {
    let minVal = Infinity;
    let minIdx = 0;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i][key] < minVal) {
        minVal = routes[i][key];
        minIdx = i;
      }
    }
    if (!routes[minIdx].labels.includes(label)) {
      routes[minIdx].labels.push(label);
    }
  }

  return routes;
}
