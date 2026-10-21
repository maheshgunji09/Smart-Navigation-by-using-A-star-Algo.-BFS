# Algorithm reference

## Dijkstra

Single-source shortest path on a graph with **non-negative** edge weights.
Repeatedly extract the min-distance frontier node from a priority queue and
relax its outgoing edges. Because a settled node's distance is final, Dijkstra
never revisits nodes — each edge is relaxed at most once.

- Data structures: min-heap PQ, `dist[]`, `prev[]`, visited set
- Complexity: **O((V + E) log V)** with a binary heap
- Correct if all edge weights ≥ 0

## Bellman-Ford

Handles arbitrary (including negative) edge weights and detects negative
cycles. Relaxes every edge V-1 times.

- Complexity: **O(V·E)**
- Slower than Dijkstra but strictly more general

## A*

Best-first search using `f(n) = g(n) + h(n)` where `h(n)` is an admissible
(never over-estimating) heuristic. We use straight-line haversine distance to
the target, which is admissible for the "distance" criterion.

- Complexity: **O(E)** in the best case with a good heuristic; degenerates to
  Dijkstra when `h ≡ 0`
- Fewer node expansions than Dijkstra on geographically laid-out graphs

## BFS

Level-order traversal from the source. Gives the **hop-count** shortest path —
useful when every road is treated equally.

- Data structure: FIFO queue
- Complexity: **O(V + E)**

## DFS

Depth-first traversal using an explicit stack. Returns *some* path from source
to target, not necessarily the shortest. Included for completeness.

- Data structure: LIFO stack
- Complexity: **O(V + E)**

## Floyd-Warshall

All-pairs shortest paths via dynamic programming over an intermediate-vertex
index. For V = 1000, a full run is O(V³) ≈ 10⁹ ops which is impractical for an
interactive demo, so we invoke it on an 80-node subgraph gathered around the
source and target by BFS expansion.

- Complexity: **O(V³)** — quadratic memory as well
- Useful when you need every-pair distances, not a single pair

## Yen's K-Shortest Paths (for multi-route)

Builds on Dijkstra. Starting from the shortest path, iteratively:

1. For each node `v_i` in the last accepted path, mark the edges of previously
   accepted paths sharing the same prefix as forbidden.
2. Run Dijkstra from `v_i` to target with those forbidden edges.
3. Splice the root prefix with the new spur path — this is a candidate.
4. Choose the lowest-cost candidate not yet seen as the next accepted path.

We wrap the weight function to return `∞` for forbidden edges/nodes, avoiding
a graph mutation.
