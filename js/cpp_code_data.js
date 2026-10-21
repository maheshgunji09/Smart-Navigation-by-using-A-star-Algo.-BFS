/* ═══════════════════════════════════════════════════════════
   cpp_code_data.js — Production C++ Source Code Repository
   Contains complete C++ algorithm implementations for the
   in-browser C++ Code Engine & Explorer tab.
   ═══════════════════════════════════════════════════════════ */

const CppCodeRepository = {
  dijkstra: {
    title: "Dijkstra's Algorithm (Min-Heap Priority Queue)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
    description: "Greedy single-source shortest path algorithm using std::priority_queue (Min-Heap) to find optimal route on non-negative weighted graphs.",
    code: `#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <limits>

struct AlgorithmResult {
    std::vector<int> path;
    double cost = 0.0;
    size_t visitedNodes = 0;
    double runtimeUs = 0.0;
    bool pathFound = false;
};

// Dijkstra's Algorithm in C++ (Min-Heap)
AlgorithmResult dijkstra(const Graph& graph, int source, int target, const std::string& criterion) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    std::unordered_map<int, double> dist;
    std::unordered_map<int, int> prev;
    std::unordered_set<int> visited;

    typedef std::pair<double, int> PQElement; // (distance, node_id)
    std::priority_queue<PQElement, std::vector<PQElement>, std::greater<PQElement>> pq;

    dist[source] = 0.0;
    prev[source] = -1;
    pq.push(std::make_pair(0.0, source));

    while (!pq.empty()) {
        PQElement top = pq.top();
        pq.pop();
        double d = top.first;
        int u = top.second;

        if (visited.find(u) != visited.end()) continue;
        visited.insert(u);
        result.visitedNodes++;

        if (u == target) {
            result.pathFound = true;
            result.cost = d;
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) != visited.end()) continue;
            double weight = edge.getWeight(criterion);
            double newDist = d + weight;

            if (dist.find(edge.to) == dist.end() || newDist < dist[edge.to]) {
                dist[edge.to] = newDist;
                prev[edge.to] = u;
                pq.push(std::make_pair(newDist, edge.to));
            }
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();
    return result;
}`
  },

  aStar: {
    title: "A* Search Algorithm (Spatial Heuristic)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O(E) average",
    spaceComplexity: "O(V)",
    description: "Informed spatial search algorithm using Haversine straight-line distance heuristic h(n) + cost g(n) to guide traversal toward target city.",
    code: `#include <vector>
#include <queue>
#include <unordered_map>
#include <cmath>

// A* Search Algorithm in C++ with Haversine Heuristic
AlgorithmResult aStar(const Graph& graph, int source, int target, const std::string& criterion) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    std::unordered_map<int, double> gScore;
    std::unordered_map<int, double> fScore;
    std::unordered_map<int, int> prev;
    std::unordered_set<int> visited;

    typedef std::pair<double, int> PQElement;
    std::priority_queue<PQElement, std::vector<PQElement>, std::greater<PQElement>> openSet;

    gScore[source] = 0.0;
    fScore[source] = graph.calculateHaversineDistance(source, target);
    prev[source] = -1;
    openSet.push(std::make_pair(fScore[source], source));

    while (!openSet.empty()) {
        PQElement top = openSet.top();
        openSet.pop();
        int u = top.second;

        if (visited.find(u) != visited.end()) continue;
        visited.insert(u);
        result.visitedNodes++;

        if (u == target) {
            result.pathFound = true;
            result.cost = gScore[u];
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) != visited.end()) continue;
            double weight = edge.getWeight(criterion);
            double tentativeG = gScore[u] + weight;

            if (gScore.find(edge.to) == gScore.end() || tentativeG < gScore[edge.to]) {
                prev[edge.to] = u;
                gScore[edge.to] = tentativeG;
                double h = graph.calculateHaversineDistance(edge.to, target);
                fScore[edge.to] = tentativeG + h;
                openSet.push(std::make_pair(fScore[edge.to], edge.to));
            }
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();
    return result;
}`
  },

  bellmanFord: {
    title: "Bellman-Ford Algorithm (Edge Relaxation)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O(V * E)",
    spaceComplexity: "O(V)",
    description: "Dynamic programming shortest-path algorithm relaxing all edges V-1 times. Can handle negative weight edges and detect negative cycles.",
    code: `#include <vector>
#include <unordered_map>
#include <limits>

// Bellman-Ford Algorithm in C++
AlgorithmResult bellmanFord(const Graph& graph, int source, int target, const std::string& criterion) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    std::unordered_map<int, double> dist;
    std::unordered_map<int, int> prev;
    const auto& nodes = graph.getAllNodes();

    for (const auto& pair : nodes) {
        dist[pair.first] = std::numeric_limits<double>::infinity();
    }
    dist[source] = 0.0;
    prev[source] = -1;

    size_t V = nodes.size();
    bool updated = false;

    // Relax all edges V - 1 times
    for (size_t i = 0; i < V - 1; ++i) {
        updated = false;
        result.visitedNodes++;
        for (const auto& pair : nodes) {
            int u = pair.first;
            if (dist[u] == std::numeric_limits<double>::infinity()) continue;

            for (const auto& edge : graph.getNeighbors(u)) {
                double weight = edge.getWeight(criterion);
                if (dist[u] + weight < dist[edge.to]) {
                    dist[edge.to] = dist[u] + weight;
                    prev[edge.to] = u;
                    updated = true;
                }
            }
        }
        if (!updated) break; // Early termination if converged
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (dist[target] != std::numeric_limits<double>::infinity()) {
        result.pathFound = true;
        result.cost = dist[target];
    }
    return result;
}`
  },

  bfs: {
    title: "Breadth-First Search (Fewest Hops)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    description: "Level-order queue traversal finding the route with the absolute fewest city layovers/hops.",
    code: `#include <queue>
#include <unordered_set>
#include <unordered_map>

// Breadth-First Search (BFS) in C++
AlgorithmResult bfs(const Graph& graph, int source, int target) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    std::queue<int> q;
    std::unordered_set<int> visited;
    std::unordered_map<int, int> prev;

    q.push(source);
    visited.insert(source);
    prev[source] = -1;

    while (!q.empty()) {
        int u = q.front();
        q.pop();
        result.visitedNodes++;

        if (u == target) {
            result.pathFound = true;
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) == visited.end()) {
                visited.insert(edge.to);
                prev[edge.to] = u;
                q.push(edge.to);
            }
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();
    return result;
}`
  },

  dfs: {
    title: "Depth-First Search (Deep Exploration)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    description: "Stack-based recursive/iterative traversal exploring paths deeply to their end before backtracking.",
    code: `#include <stack>
#include <unordered_set>
#include <unordered_map>

// Depth-First Search (DFS) in C++
AlgorithmResult dfs(const Graph& graph, int source, int target) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    std::stack<int> s;
    std::unordered_set<int> visited;
    std::unordered_map<int, int> prev;

    s.push(source);
    prev[source] = -1;

    while (!s.empty()) {
        int u = s.top();
        s.pop();

        if (visited.find(u) != visited.end()) continue;
        visited.insert(u);
        result.visitedNodes++;

        if (u == target) {
            result.pathFound = true;
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) == visited.end()) {
                prev[edge.to] = u;
                s.push(edge.to);
            }
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();
    return result;
}`
  },

  floydWarshall: {
    title: "Floyd-Warshall Algorithm (All-Pairs Shortest Path)",
    file: "cpp/algorithms.cpp",
    timeComplexity: "O(V^3)",
    spaceComplexity: "O(V^2)",
    description: "Dynamic programming matrix algorithm calculating all-pairs shortest paths between every city pair in the graph.",
    code: `#include <vector>
#include <limits>

// Floyd-Warshall Algorithm in C++
AlgorithmResult floydWarshall(const Graph& graph, int source, int target, const std::string& criterion) {
    AlgorithmResult result;
    auto start = std::chrono::high_resolution_clock::now();

    const auto& allNodes = graph.getAllNodes();
    size_t V = allNodes.size();
    constexpr double INF = 1e9;

    std::vector<std::vector<double>> dist(V, std::vector<double>(V, INF));
    std::vector<std::vector<int>> next(V, std::vector<int>(V, -1));

    for (size_t i = 0; i < V; ++i) {
        dist[i][i] = 0.0;
        next[i][i] = static_cast<int>(i);
    }

    // Initialize edge weights
    for (size_t i = 0; i < V; ++i) {
        for (const auto& edge : graph.getNeighbors(i)) {
            double w = edge.getWeight(criterion);
            dist[i][edge.to] = w;
            next[i][edge.to] = edge.to;
        }
    }

    // 3 nested loops O(V^3)
    for (size_t k = 0; k < V; ++k) {
        for (size_t i = 0; i < V; ++i) {
            for (size_t j = 0; j < V; ++j) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();
    return result;
}`
  },

  graphDataStructure: {
    title: "Graph Data Structure (Adjacency List)",
    file: "cpp/graph.h",
    timeComplexity: "O(1) Add Node/Edge",
    spaceComplexity: "O(V + E)",
    description: "C++ Graph class holding CityNode structs and RoadEdge vectors with Haversine distance functions.",
    code: `namespace Navi {

struct CityNode {
    int id;
    std::string name;
    std::string state;
    double lat;
    double lon;
    bool isCapital;
};

struct RoadEdge {
    int from;
    int to;
    double distance;
    double time;
    double fuel;
    double toll;
    double traffic;
    std::string type;
    std::string condition;
    double speed;
    double risk;

    double getWeight(const std::string& criterion, double trafficMultiplier = 1.0) const {
        double tr = traffic * trafficMultiplier;
        if (criterion == "distance") return distance;
        if (criterion == "time") return (time * tr);
        if (criterion == "fuel") return (fuel * tr);
        if (criterion == "toll") return toll;
        return (distance * 0.4) + (time * tr * 0.3) + (toll * 0.15) + (fuel * tr * 0.15);
    }
};

class Graph {
private:
    std::unordered_map<int, CityNode> nodes;
    std::unordered_map<int, std::vector<RoadEdge>> adjList;
public:
    void addNode(const CityNode& node);
    void addEdge(const RoadEdge& edge, bool bidirectional = true);
    const std::vector<RoadEdge>& getNeighbors(int id) const;
    double calculateHaversineDistance(int nodeA, int nodeB) const;
};

}`
  }
};
