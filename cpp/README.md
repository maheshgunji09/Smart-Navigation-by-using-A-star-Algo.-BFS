# NAVI 2.0 — C++ Graph Data Structures & Algorithms Engine

This directory contains the native **C++ implementation** of the NAVI Smart Navigation & Graph Optimization System.

## 🚀 Built-in C++ Algorithms

1. **Dijkstra's Algorithm** (`dijkstra`)
   - Uses `std::priority_queue` min-heap.
   - Time Complexity: $\mathcal{O}((V + E) \log V)$
   - Space Complexity: $\mathcal{O}(V)$

2. **A\* Search Algorithm** (`aStar`)
   - Spatial shortest-path optimizer using Haversine distance heuristic.
   - Time Complexity: $\mathcal{O}(E)$
   - Space Complexity: $\mathcal{O}(V)$

3. **Bellman-Ford Algorithm** (`bellmanFord`)
   - Single-source shortest path algorithm capable of handling negative weights.
   - Time Complexity: $\mathcal{O}(V \cdot E)$
   - Space Complexity: $\mathcal{O}(V)$

4. **Breadth-First Search** (`bfs`)
   - Unweighted queue-based shortest-hop traversal.
   - Time Complexity: $\mathcal{O}(V + E)$
   - Space Complexity: $\mathcal{O}(V)$

5. **Depth-First Search** (`dfs`)
   - Stack-based exhaustive graph exploration.
   - Time Complexity: $\mathcal{O}(V + E)$
   - Space Complexity: $\mathcal{O}(V)$

6. **Floyd-Warshall Algorithm** (`floydWarshall`)
   - Dynamic Programming all-pairs shortest path matrix algorithm.
   - Time Complexity: $\mathcal{O}(V^3)$
   - Space Complexity: $\mathcal{O}(V^2)$

---

## 🛠️ How to Compile & Run

### Using `g++` directly:
```bash
g++ -std=c++17 -O3 cpp/graph.cpp cpp/algorithms.cpp cpp/navi_dsa.cpp -o navi_dsa
./navi_dsa data/cities.txt data/roads.txt Kadapa Vijayawada
```

### Using `make`:
```bash
cd cpp
make
./navi_dsa ../data/cities.txt ../data/roads.txt Kadapa Vijayawada
```

### Using `cmake`:
```bash
mkdir build && cd build
cmake ../cpp
make
./navi_dsa
```
