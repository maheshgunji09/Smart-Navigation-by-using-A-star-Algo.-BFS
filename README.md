# Smart Navigation System — DSA Route Optimizer

A final-year Computer Science project that solves route planning across the
Indian road network **using graph algorithms only** — no Google Maps, no
OpenStreetMap routing, no external APIs. The dataset, the graph, the shortest-path
search, and the visualisation are all built from scratch.

## Two runnable frontends

| Frontend | Files | How to run |
| --- | --- | --- |
| **C++ backend** (interactive CLI) | `main.cpp`, `include/`, `src/`, `Makefile` | `make && ./sns data` |
| **HTML/CSS/JS dashboard** | `public/app/` at the project root | Serve `public/app/` with any static server (or open `index.html` via a local server) |

Both frontends use the same dataset (`data/cities.txt`, `data/roads.txt`,
`data/traffic.txt`, `data/config.txt`) and implement the same six algorithms.

## Data structures used

- Adjacency list (`unordered_map<int, vector<Edge>>`) — graph representation
- Weighted edges with 9 attributes (distance, time, fuel, toll, traffic, road type, condition, speed limit, risk)
- **Min-heap priority queue** — custom implementation in `include/PriorityQueue.h` used by Dijkstra and A*
- **Hash map** — `unordered_map` for `dist`, `prev`, name-to-id lookups
- **Queue** — BFS (`std::queue`)
- **Stack** — DFS (`std::stack`)
- **Vector** — path storage, edge lists
- **Pair** — heap entries `(cost, nodeId)`
- **Set** — visited-node tracking (`unordered_set`)

## Algorithms implemented

| Algorithm | Complexity | Notes |
| --- | --- | --- |
| Dijkstra | O((V+E) log V) | Uses the custom min-heap PQ. |
| Bellman-Ford | O(V·E) | Detects negative cycles (not present in this dataset). |
| A* | O(E) with admissible heuristic | Straight-line (haversine) distance heuristic. |
| BFS | O(V+E) | Unweighted shortest path in hops. |
| DFS | O(V+E) | Educational — returns first path found, not shortest. |
| Floyd-Warshall | O(V³) | Run on an 80-node subgraph around source/target — a full 1000³ pass is ~10⁹ ops. |

## Multi-route & scoring

`buildRoutes()` runs **Yen's k-shortest-paths** on top of Dijkstra to yield up
to 5 diverse routes, then scores each one:

```
score ∝ 1 / (0.40·distance + 0.30·time + 0.20·fuel + 0.10·traffic)
```

Each route is tagged with descriptive labels: `Best`, `Fastest`, `Cheapest`,
`Shortest`, `Least Traffic`, `Least Toll`.

## Optimisation criteria

`distance`, `time`, `fuel`, `toll`, `traffic`, `safest`, `scenic`, `balanced`.

## Traffic scenarios

Multipliers applied to travel time: `morning`, `afternoon`, `evening`, `night`,
`weekend`, `festival`, `rain`, `accident`, `construction`, `vip_movement`.

## Dataset

- **1000 cities** across all 28 states (curated real-city seeds + procedurally
  generated satellite towns, jittered around each seed).
- **~3400 undirected roads** built from:
  - each city's 4 nearest same-state neighbours
  - every city linked to its state capital
  - each capital linked to its 4 nearest capitals plus a longitude-sorted ring
    guaranteeing a single connected component

## Project structure

```
SmartNavigationSystem/
├── main.cpp
├── Makefile
├── include/
│   ├── Graph.h
│   ├── Algorithms.h
│   ├── PriorityQueue.h
│   ├── Route.h
│   ├── TrafficManager.h
│   ├── NavigationSystem.h
│   ├── Statistics.h
│   └── Admin.h
├── src/
│   ├── Graph.cpp
│   ├── Algorithms.cpp
│   ├── Route.cpp
│   ├── TrafficManager.cpp
│   ├── NavigationSystem.cpp
│   ├── Statistics.cpp
│   └── Admin.cpp
├── data/
│   ├── cities.txt
│   ├── roads.txt
│   ├── traffic.txt
│   └── config.txt
└── docs/
    ├── ALGORITHMS.md
    ├── COMPLEXITY.md
    ├── ARCHITECTURE.md
    ├── USER_MANUAL.md
    └── INSTALLATION.md
```

## Build & run

```bash
cd SmartNavigationSystem
make            # builds ./sns
./sns data      # loads data/ and starts the interactive CLI
```

Sample session:

```
> 1
Source city     : Kadapa
Destination     : Vijayawada
Optimize        : balanced
Traffic scenario: afternoon

Route 1 — score 98  [Best, Fastest, Shortest]
  distance: 367.7 km   time: 352.9 min   fuel: Rs 1892   toll: Rs 237
  path: Kadapa -> Amaravati -> Vijayawada
...
```

Menu option `2` prints the six-algorithm comparison table.

## Web dashboard

Open `public/app/index.html` through a local static server. It performs every
computation client-side using the same algorithms translated to JavaScript.
Features:

- Search with autocomplete over 1000 cities
- 8 optimisation criteria and 10 traffic scenarios
- Animated graph visualisation with per-algorithm highlight colours
- 6-algorithm comparison table (timing, visited nodes, memory, complexity)
- Multi-route cards with labels and score
- Statistics dashboard
- Admin panel (add city, overlay stored in localStorage)
- Search history and favourites
- Print / CSV export
- Dark & light themes, keyboard shortcuts

## Constraints (as required by the assignment)

- No Google Maps / OpenStreetMap routing.
- No external routing API.
- All shortest-path calculations are performed by the implemented DSA algorithms.
