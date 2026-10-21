# Architecture

```
+------------------------------------------------------------+
|                     User (CLI or Browser)                  |
+------------------------------------------------------------+
                |                              |
                v                              v
+--------------------------+     +--------------------------+
|   NavigationSystem       |     |     public/app/js        |
|   (main.cpp + include)   |     |  (main.js + modules)     |
+--------------------------+     +--------------------------+
                |                              |
                +--------------+---------------+
                               v
                +--------------------------+
                |         Graph            |
                |  adjacency list (Node,   |
                |  Edge), name -> id map   |
                +--------------------------+
                               |
                               v
    +---------------------------------------------------------+
    | Algorithms: Dijkstra, Bellman-Ford, A*, BFS, DFS,        |
    | Floyd-Warshall subgraph, Yen's K-Shortest-Paths          |
    +---------------------------------------------------------+
                               |
                               v
    +---------------------------------------------------------+
    | Route: score = 0.4·distance + 0.3·time +                 |
    |               0.2·fuel + 0.1·traffic (labels applied)    |
    +---------------------------------------------------------+
                               |
                               v
                +--------------------------+
                |    TrafficManager        |
                | scenario -> multiplier   |
                +--------------------------+
```

## Class responsibilities

| Class | File | Responsibility |
| --- | --- | --- |
| `Node` | `Graph.h` | POD: id, name, state, lat, lon, isCapital |
| `Edge` | `Graph.h` | POD: from, to, distance, time, fuel, toll, traffic, type, condition, speed, risk |
| `Graph` | `Graph.h/.cpp` | Owns nodes, adjacency list, name index, haversine heuristic |
| `MinHeap<K,V>` | `PriorityQueue.h` | Binary min-heap; used by Dijkstra & A* |
| `TrafficManager` | `TrafficManager.h/.cpp` | Maps scenario name to multiplier |
| `Route` | `Route.h/.cpp` | Path + summary metrics + labels; Yen's k-shortest-paths lives here |
| `Statistics` | `Statistics.h/.cpp` | Print network stats to any `ostream` |
| `Admin` | `Admin.h/.cpp` | Save graph back to text files; add city / road |
| `NavigationSystem` | `NavigationSystem.h/.cpp` | Loads data, orchestrates route search & algorithm comparison |

## Data flow

1. `NavigationSystem::loadFromDirectory("data")` parses `cities.txt` and
   `roads.txt` into `Graph`.
2. User picks source, destination, criterion, scenario.
3. `weightBy(criterion, mul)` returns a lambda `(Edge) -> double`.
4. `buildRoutes(g, s, t, weight, mul, K)` runs Yen's k-shortest-paths using
   Dijkstra as the base solver, then scores & labels the resulting routes.
5. Results are printed (CLI) or rendered into cards + canvas (web).
