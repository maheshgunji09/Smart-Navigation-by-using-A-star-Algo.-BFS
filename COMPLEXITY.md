# Complexity summary

| Operation | Time | Space |
| --- | --- | --- |
| Load dataset | O(V + E) | O(V + E) |
| Adjacency list neighbours | O(deg(u)) | O(V + E) |
| Min-heap push / pop | O(log n) | O(n) |
| Dijkstra | O((V+E) log V) | O(V) |
| Bellman-Ford | O(V·E) | O(V) |
| A* | O(E) best · O((V+E) log V) worst | O(V) |
| BFS | O(V+E) | O(V) |
| DFS | O(V+E) | O(V) |
| Floyd-Warshall (V'=80) | O(V'³) | O(V'²) |
| Yen's K-shortest-paths | O(K·V·(V+E) log V) | O(K·V) |

## Empirical numbers (Kadapa → Vijayawada, this dataset)

| Algorithm | Cost | Visited | Time |
| --- | --- | --- | --- |
| Dijkstra | 367.7 | 41 | ~0.15 ms |
| Bellman-Ford | 367.7 | 2984 | ~0.6 ms |
| A* | 367.7 | 13 | ~0.24 ms |
| BFS (hops) | 2 hops | 18 | ~0.12 ms |
| Floyd-Warshall (V=80 subgraph) | 367.7 | 80 | ~0.36 ms |

Numbers vary by machine; run `./sns data` menu option 2 to reproduce on yours.
