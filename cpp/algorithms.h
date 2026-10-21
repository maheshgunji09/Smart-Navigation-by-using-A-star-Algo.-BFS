#ifndef NAVI_ALGORITHMS_H
#define NAVI_ALGORITHMS_H

#include "graph.h"
#include <vector>
#include <string>
#include <chrono>
#include <limits>
#include <queue>
#include <stack>
#include <unordered_set>
#include <unordered_map>
#include <cmath>

namespace Navi {

/**
 * @struct AlgorithmResult
 * Stores the solution output, statistics, and execution timing of a graph algorithm.
 */
struct AlgorithmResult {
    std::string algorithmName;
    std::vector<int> path;
    double cost = 0.0;
    double totalCost = 0.0;
    double totalDistance = 0.0;
    double totalTime = 0.0;
    double totalFuel = 0.0;
    double totalToll = 0.0;
    size_t visitedNodes = 0;
    double runtimeUs = 0.0; // Execution time in microseconds
    bool pathFound = false;

    void calculateMetrics(const Graph& graph) {
        if (path.size() < 2) return;
        totalDistance = 0.0;
        totalTime = 0.0;
        totalFuel = 0.0;
        totalToll = 0.0;

        for (size_t i = 0; i < path.size() - 1; ++i) {
            int u = path[i];
            int v = path[i + 1];
            for (const auto& edge : graph.getNeighbors(u)) {
                if (edge.to == v) {
                    totalDistance += edge.distance;
                    totalTime += edge.time;
                    totalFuel += edge.fuel;
                    totalToll += edge.toll;
                    break;
                }
            }
        }
    }
};

class Algorithms {
public:
    /**
     * Dijkstra's Algorithm (Min-Heap Priority Queue)
     * Time Complexity: O((V + E) log V), Space Complexity: O(V)
     */
    static AlgorithmResult dijkstra(const Graph& graph, int source, int target,
                                     const std::string& criterion = "distance", double trafficMult = 1.0);

    /**
     * A* Search Algorithm (Spatial Haversine Heuristic)
     * Time Complexity: O(E), Space Complexity: O(V)
     */
    static AlgorithmResult aStar(const Graph& graph, int source, int target,
                                 const std::string& criterion = "distance", double trafficMult = 1.0);

    /**
     * Bellman-Ford Algorithm (Handles negative edge weights / cost adjustments)
     * Time Complexity: O(V * E), Space Complexity: O(V)
     */
    static AlgorithmResult bellmanFord(const Graph& graph, int source, int target,
                                       const std::string& criterion = "distance", double trafficMult = 1.0);

    /**
     * Breadth-First Search (BFS) (Fewest Hops Pathfinding)
     * Time Complexity: O(V + E), Space Complexity: O(V)
     */
    static AlgorithmResult bfs(const Graph& graph, int source, int target);

    /**
     * Depth-First Search (DFS) (Exhaustive Path Traversal)
     * Time Complexity: O(V + E), Space Complexity: O(V)
     */
    static AlgorithmResult dfs(const Graph& graph, int source, int target);

    /**
     * Floyd-Warshall Algorithm (All-Pairs Shortest Path Matrix)
     * Time Complexity: O(V^3), Space Complexity: O(V^2)
     */
    static AlgorithmResult floydWarshall(const Graph& graph, int source, int target,
                                         const std::string& criterion = "distance");
};

} // namespace Navi

#endif // NAVI_ALGORITHMS_H
