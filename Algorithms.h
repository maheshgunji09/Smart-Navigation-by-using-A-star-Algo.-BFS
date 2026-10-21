#ifndef SNS_ALGORITHMS_H
#define SNS_ALGORITHMS_H

#include "Graph.h"
#include <functional>
#include <unordered_map>
#include <vector>
#include <chrono>

namespace sns {

using Weight = std::function<double(const Edge&)>;

struct AlgoResult {
    std::unordered_map<int, double> dist;
    std::unordered_map<int, int> prev;
    std::vector<int> visitedOrder;
    double timeMs{};
    std::size_t memoryApprox{};
    double cost{};
    std::string complexity;
    std::vector<int> path;
};

AlgoResult dijkstra(const Graph& g, int source, int target, const Weight& w);
AlgoResult bellmanFord(const Graph& g, int source, int target, const Weight& w);
AlgoResult aStar(const Graph& g, int source, int target, const Weight& w);
AlgoResult bfs(const Graph& g, int source, int target);
AlgoResult dfs(const Graph& g, int source, int target);
AlgoResult floydWarshallSubgraph(const Graph& g, int source, int target, const Weight& w, int k = 80);

std::vector<int> reconstructPath(const std::unordered_map<int, int>& prev, int source, int target);

// Weight selectors matching the JS frontend.
Weight weightBy(const std::string& criterion, double trafficMul);

} // namespace sns

#endif
