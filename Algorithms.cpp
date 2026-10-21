#include "Algorithms.h"
#include "PriorityQueue.h"
#include <limits>
#include <queue>
#include <stack>
#include <unordered_set>
#include <algorithm>

namespace sns {

using Clock = std::chrono::high_resolution_clock;
static constexpr double INF = std::numeric_limits<double>::infinity();

std::vector<int> reconstructPath(const std::unordered_map<int, int>& prev, int source, int target) {
    std::vector<int> out;
    int cur = target;
    while (true) {
        out.push_back(cur);
        if (cur == source) break;
        auto it = prev.find(cur);
        if (it == prev.end() || it->second < 0) return {};
        cur = it->second;
    }
    std::reverse(out.begin(), out.end());
    return out;
}

AlgoResult dijkstra(const Graph& g, int source, int target, const Weight& w) {
    auto t0 = Clock::now();
    AlgoResult r;
    for (const auto& kv : g.nodes()) { r.dist[kv.first] = INF; r.prev[kv.first] = -1; }
    r.dist[source] = 0;
    MinHeap<double, int> pq;
    pq.push({0.0, source});
    std::unordered_set<int> visited;
    while (!pq.empty()) {
        auto [d, u] = pq.pop();
        if (visited.count(u)) continue;
        visited.insert(u);
        r.visitedOrder.push_back(u);
        if (u == target) break;
        for (const auto& e : g.neighbors(u)) {
            double nd = d + w(e);
            if (nd < r.dist[e.to]) {
                r.dist[e.to] = nd;
                r.prev[e.to] = u;
                pq.push({nd, e.to});
            }
        }
    }
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = r.dist.size() * (sizeof(int) + sizeof(double)) + r.visitedOrder.size() * sizeof(int);
    r.cost = r.dist[target];
    r.complexity = "O((V+E) log V)";
    r.path = reconstructPath(r.prev, source, target);
    return r;
}

AlgoResult bellmanFord(const Graph& g, int source, int target, const Weight& w) {
    auto t0 = Clock::now();
    AlgoResult r;
    for (const auto& kv : g.nodes()) { r.dist[kv.first] = INF; r.prev[kv.first] = -1; }
    r.dist[source] = 0;
    int V = g.size();
    r.visitedOrder.push_back(source);
    for (int i = 0; i < V - 1; ++i) {
        bool updated = false;
        for (const auto& e : g.allEdges()) {
            double du = r.dist[e.from];
            if (du == INF) continue;
            double nd = du + w(e);
            if (nd < r.dist[e.to]) {
                r.dist[e.to] = nd;
                r.prev[e.to] = e.from;
                r.visitedOrder.push_back(e.to);
                updated = true;
            }
        }
        if (!updated) break;
    }
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = r.dist.size() * (sizeof(int) + sizeof(double));
    r.cost = r.dist[target];
    r.complexity = "O(V*E)";
    r.path = reconstructPath(r.prev, source, target);
    return r;
}

AlgoResult aStar(const Graph& g, int source, int target, const Weight& w) {
    auto t0 = Clock::now();
    AlgoResult r;
    std::unordered_map<int, double> f;
    for (const auto& kv : g.nodes()) { r.dist[kv.first] = INF; f[kv.first] = INF; r.prev[kv.first] = -1; }
    r.dist[source] = 0;
    f[source] = g.heuristic(source, target);
    MinHeap<double, int> pq;
    pq.push({f[source], source});
    std::unordered_set<int> closed;
    while (!pq.empty()) {
        auto [_, u] = pq.pop();
        if (closed.count(u)) continue;
        closed.insert(u);
        r.visitedOrder.push_back(u);
        if (u == target) break;
        for (const auto& e : g.neighbors(u)) {
            double tent = r.dist[u] + w(e);
            if (tent < r.dist[e.to]) {
                r.dist[e.to] = tent;
                r.prev[e.to] = u;
                double nf = tent + g.heuristic(e.to, target);
                f[e.to] = nf;
                pq.push({nf, e.to});
            }
        }
    }
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = r.dist.size() * (sizeof(int) + sizeof(double)) * 2;
    r.cost = r.dist[target];
    r.complexity = "O(E) with admissible heuristic";
    r.path = reconstructPath(r.prev, source, target);
    return r;
}

AlgoResult bfs(const Graph& g, int source, int target) {
    auto t0 = Clock::now();
    AlgoResult r;
    for (const auto& kv : g.nodes()) { r.dist[kv.first] = INF; r.prev[kv.first] = -1; }
    r.dist[source] = 0;
    std::queue<int> q;
    q.push(source);
    std::unordered_set<int> visited{source};
    while (!q.empty()) {
        int u = q.front(); q.pop();
        r.visitedOrder.push_back(u);
        if (u == target) break;
        for (const auto& e : g.neighbors(u)) {
            if (!visited.count(e.to)) {
                visited.insert(e.to);
                r.prev[e.to] = u;
                r.dist[e.to] = r.dist[u] + 1;
                q.push(e.to);
            }
        }
    }
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = visited.size() * sizeof(int);
    r.cost = r.dist[target];
    r.complexity = "O(V+E)";
    r.path = reconstructPath(r.prev, source, target);
    return r;
}

AlgoResult dfs(const Graph& g, int source, int target) {
    auto t0 = Clock::now();
    AlgoResult r;
    for (const auto& kv : g.nodes()) { r.prev[kv.first] = -1; }
    std::stack<int> st;
    st.push(source);
    std::unordered_set<int> visited;
    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (visited.count(u)) continue;
        visited.insert(u);
        r.visitedOrder.push_back(u);
        if (u == target) break;
        for (const auto& e : g.neighbors(u)) {
            if (!visited.count(e.to)) {
                if (r.prev[e.to] < 0 && e.to != source) r.prev[e.to] = u;
                st.push(e.to);
            }
        }
    }
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = visited.size() * sizeof(int);
    r.cost = 0;
    r.complexity = "O(V+E) — not shortest path";
    r.path = reconstructPath(r.prev, source, target);
    return r;
}

AlgoResult floydWarshallSubgraph(const Graph& g, int source, int target, const Weight& w, int k) {
    auto t0 = Clock::now();
    AlgoResult r;
    std::unordered_set<int> setIds{source, target};
    std::queue<int> q;
    q.push(source); q.push(target);
    while (!q.empty() && (int)setIds.size() < k) {
        int u = q.front(); q.pop();
        for (const auto& e : g.neighbors(u)) {
            if (!setIds.count(e.to)) {
                setIds.insert(e.to);
                q.push(e.to);
                if ((int)setIds.size() >= k) break;
            }
        }
    }
    std::vector<int> ids(setIds.begin(), setIds.end());
    std::unordered_map<int, int> idx;
    for (int i = 0; i < (int)ids.size(); ++i) idx[ids[i]] = i;
    int n = ids.size();
    std::vector<std::vector<double>> D(n, std::vector<double>(n, INF));
    std::vector<std::vector<int>> NX(n, std::vector<int>(n, -1));
    for (int i = 0; i < n; ++i) D[i][i] = 0;
    for (int u : ids) {
        for (const auto& e : g.neighbors(u)) {
            auto it = idx.find(e.to);
            if (it == idx.end()) continue;
            int i = idx[u], j = it->second;
            double wt = w(e);
            if (wt < D[i][j]) { D[i][j] = wt; NX[i][j] = j; }
        }
    }
    for (int m = 0; m < n; ++m)
        for (int i = 0; i < n; ++i) {
            if (D[i][m] == INF) continue;
            for (int j = 0; j < n; ++j) {
                double alt = D[i][m] + D[m][j];
                if (alt < D[i][j]) { D[i][j] = alt; NX[i][j] = NX[i][m]; }
            }
        }
    int si = idx[source], ti = idx[target];
    r.cost = D[si][ti];
    if (r.cost != INF && NX[si][ti] != -1) {
        int cur = si;
        std::vector<int> path{ids[cur]};
        while (cur != ti) {
            int nxt = NX[cur][ti];
            if (nxt == -1) { path.clear(); break; }
            path.push_back(ids[nxt]);
            cur = nxt;
        }
        r.path = path;
    }
    r.visitedOrder = ids;
    r.timeMs = std::chrono::duration<double, std::milli>(Clock::now() - t0).count();
    r.memoryApprox = static_cast<std::size_t>(n) * n * sizeof(double);
    r.complexity = "O(V^3) on subgraph";
    return r;
}

Weight weightBy(const std::string& c, double trafficMul) {
    if (c == "distance") return [](const Edge& e){ return e.distance; };
    if (c == "time")     return [trafficMul](const Edge& e){ return e.time * (1 + (e.traffic - 1) * 0.15) * trafficMul; };
    if (c == "fuel")     return [](const Edge& e){ return e.fuel; };
    if (c == "toll")     return [](const Edge& e){ return e.toll + 0.01; };
    if (c == "traffic")  return [](const Edge& e){ return e.traffic * e.distance; };
    if (c == "safest")   return [](const Edge& e){ return e.risk * e.distance; };
    if (c == "scenic")   return [](const Edge& e){ return (6 - e.risk) * e.distance + (e.type == "National Highway" ? 50.0 : 0.0); };
    // balanced default
    return [](const Edge& e){
        return 0.4 * e.distance + 0.3 * e.time + 0.2 * (e.fuel / 5.0) + 0.1 * e.traffic * 20.0;
    };
}

} // namespace sns
