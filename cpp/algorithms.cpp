#include "algorithms.h"
#include <algorithm>
#include <iostream>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace Navi {

using Clock = std::chrono::high_resolution_clock;

static std::vector<int> reconstructPath(const std::unordered_map<int, int>& prev, int source, int target) {
    std::vector<int> path;
    int current = target;
    while (current != -1) {
        path.push_back(current);
        if (current == source) break;
        auto it = prev.find(current);
        if (it == prev.end()) return {}; // Path broken
        current = it->second;
    }
    if (path.empty() || path.back() != source) return {};
    std::reverse(path.begin(), path.end());
    return path;
}

// -----------------------------------------------------------------------------
// 1. Dijkstra's Algorithm
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::dijkstra(const Graph& graph, int source, int target,
                                    const std::string& criterion, double trafficMult) {
    AlgorithmResult result;
    result.algorithmName = "Dijkstra's Algorithm";
    auto start = Clock::now();

    if (!graph.getNode(source) || !graph.getNode(target)) {
        return result;
    }

    std::unordered_map<int, double> dist;
    std::unordered_map<int, int> prev;
    std::unordered_set<int> visited;

    // Min-heap pair: (distance, node_id)
    typedef std::pair<double, int> PQElement;
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
            result.totalCost = d;
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) != visited.end()) continue;

            double weight = edge.getWeight(criterion, trafficMult);
            double newDist = d + weight;

            if (dist.find(edge.to) == dist.end() || newDist < dist[edge.to]) {
                dist[edge.to] = newDist;
                prev[edge.to] = u;
                pq.push(std::make_pair(newDist, edge.to));
            }
        }
    }

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (result.pathFound) {
        result.path = reconstructPath(prev, source, target);
        result.calculateMetrics(graph);
    }

    return result;
}

// -----------------------------------------------------------------------------
// 2. A* Search Algorithm
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::aStar(const Graph& graph, int source, int target,
                                  const std::string& criterion, double trafficMult) {
    AlgorithmResult result;
    result.algorithmName = "A* Search Algorithm";
    auto start = Clock::now();

    if (!graph.getNode(source) || !graph.getNode(target)) {
        return result;
    }

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

        double currentF = top.first;
        int u = top.second;
        (void)currentF;

        if (visited.find(u) != visited.end()) continue;
        visited.insert(u);
        result.visitedNodes++;

        if (u == target) {
            result.pathFound = true;
            result.cost = gScore[u];
            result.totalCost = gScore[u];
            break;
        }

        for (const auto& edge : graph.getNeighbors(u)) {
            if (visited.find(edge.to) != visited.end()) continue;

            double weight = edge.getWeight(criterion, trafficMult);
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

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (result.pathFound) {
        result.path = reconstructPath(prev, source, target);
        result.calculateMetrics(graph);
    }

    return result;
}

// -----------------------------------------------------------------------------
// 3. Bellman-Ford Algorithm
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::bellmanFord(const Graph& graph, int source, int target,
                                         const std::string& criterion, double trafficMult) {
    AlgorithmResult result;
    result.algorithmName = "Bellman-Ford Algorithm";
    auto start = Clock::now();

    if (!graph.getNode(source) || !graph.getNode(target)) {
        return result;
    }

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

    // Relax edges V-1 times
    for (size_t i = 0; i < V - 1; ++i) {
        updated = false;
        result.visitedNodes++;
        for (const auto& pair : nodes) {
            int u = pair.first;
            if (dist[u] == std::numeric_limits<double>::infinity()) continue;

            for (const auto& edge : graph.getNeighbors(u)) {
                double weight = edge.getWeight(criterion, trafficMult);
                if (dist[u] + weight < dist[edge.to]) {
                    dist[edge.to] = dist[u] + weight;
                    prev[edge.to] = u;
                    updated = true;
                }
            }
        }
        if (!updated) break; // Early termination
    }

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (dist[target] != std::numeric_limits<double>::infinity()) {
        result.pathFound = true;
        result.cost = dist[target];
        result.totalCost = dist[target];
        result.path = reconstructPath(prev, source, target);
        result.calculateMetrics(graph);
    }

    return result;
}

// -----------------------------------------------------------------------------
// 4. Breadth-First Search (BFS)
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::bfs(const Graph& graph, int source, int target) {
    AlgorithmResult result;
    result.algorithmName = "Breadth-First Search (BFS)";
    auto start = Clock::now();

    if (!graph.getNode(source) || !graph.getNode(target)) {
        return result;
    }

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

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (result.pathFound) {
        result.path = reconstructPath(prev, source, target);
        result.calculateMetrics(graph);
        result.cost = result.totalDistance;
        result.totalCost = result.totalDistance;
    }

    return result;
}

// -----------------------------------------------------------------------------
// 5. Depth-First Search (DFS)
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::dfs(const Graph& graph, int source, int target) {
    AlgorithmResult result;
    result.algorithmName = "Depth-First Search (DFS)";
    auto start = Clock::now();

    if (!graph.getNode(source) || !graph.getNode(target)) {
        return result;
    }

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

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    if (result.pathFound) {
        result.path = reconstructPath(prev, source, target);
        result.calculateMetrics(graph);
        result.cost = result.totalDistance;
        result.totalCost = result.totalDistance;
    }

    return result;
}

// -----------------------------------------------------------------------------
// 6. Floyd-Warshall Algorithm (All-Pairs Shortest Path)
// -----------------------------------------------------------------------------
AlgorithmResult Algorithms::floydWarshall(const Graph& graph, int source, int target,
                                          const std::string& criterion) {
    AlgorithmResult result;
    result.algorithmName = "Floyd-Warshall Algorithm";
    auto start = Clock::now();

    const auto& allNodes = graph.getAllNodes();
    std::vector<int> nodeIds;
    std::unordered_map<int, size_t> idToIndex;
    for (const auto& pair : allNodes) {
        idToIndex[pair.first] = nodeIds.size();
        nodeIds.push_back(pair.first);
    }

    size_t V = nodeIds.size();
    if (idToIndex.find(source) == idToIndex.end() || idToIndex.find(target) == idToIndex.end()) {
        return result;
    }

    constexpr double INF = 1e9;
    std::vector<std::vector<double>> dist(V, std::vector<double>(V, INF));
    std::vector<std::vector<int>> next(V, std::vector<int>(V, -1));

    for (size_t i = 0; i < V; ++i) {
        dist[i][i] = 0.0;
        next[i][i] = static_cast<int>(i);
    }

    for (size_t i = 0; i < V; ++i) {
        int u = nodeIds[i];
        for (const auto& edge : graph.getNeighbors(u)) {
            size_t j = idToIndex[edge.to];
            double w = edge.getWeight(criterion);
            if (w < dist[i][j]) {
                dist[i][j] = w;
                next[i][j] = static_cast<int>(j);
            }
        }
    }

    for (size_t k = 0; k < V; ++k) {
        result.visitedNodes++;
        for (size_t i = 0; i < V; ++i) {
            for (size_t j = 0; j < V; ++j) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    auto end = Clock::now();
    result.runtimeUs = std::chrono::duration<double, std::micro>(end - start).count();

    size_t srcIdx = idToIndex[source];
    size_t dstIdx = idToIndex[target];

    if (dist[srcIdx][dstIdx] < INF / 2) {
        result.pathFound = true;
        result.cost = dist[srcIdx][dstIdx];
        result.totalCost = dist[srcIdx][dstIdx];

        size_t curr = srcIdx;
        while (curr != dstIdx) {
            result.path.push_back(nodeIds[curr]);
            int nxt = next[curr][dstIdx];
            if (nxt == -1) break;
            curr = static_cast<size_t>(nxt);
        }
        result.path.push_back(nodeIds[dstIdx]);
        result.calculateMetrics(graph);
    }

    return result;
}

} // namespace Navi
