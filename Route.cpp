#include "Route.h"
#include <algorithm>
#include <sstream>
#include <unordered_set>

namespace sns {

Route summarizePath(const Graph& g, const std::vector<int>& path, double trafficMul) {
    Route r;
    r.path = path;
    for (std::size_t i = 0; i + 1 < path.size(); ++i) {
        const auto& list = g.neighbors(path[i]);
        auto it = std::find_if(list.begin(), list.end(),
            [&](const Edge& e){ return e.to == path[i + 1]; });
        if (it == list.end()) { r.path.clear(); return r; }
        r.distance += it->distance;
        r.time     += it->time * (1 + (it->traffic - 1) * 0.15) * trafficMul;
        r.fuel     += it->fuel;
        r.toll     += it->toll;
        r.avgTraffic += it->traffic;
        r.avgRisk    += it->risk;
        r.hops++;
    }
    if (r.hops) { r.avgTraffic /= r.hops; r.avgRisk /= r.hops; }
    return r;
}

static std::string pathKey(const std::vector<int>& p) {
    std::ostringstream oss;
    for (int x : p) { oss << x << ','; }
    return oss.str();
}

std::vector<std::vector<int>> kShortestPaths(const Graph& g, int source, int target, const Weight& w, int K) {
    std::vector<std::vector<int>> A;
    auto d0 = dijkstra(g, source, target, w);
    if (d0.path.empty()) return A;
    A.push_back(d0.path);
    std::unordered_set<std::string> seen{pathKey(d0.path)};

    struct Cand { std::vector<int> p; double cost; };
    std::vector<Cand> B;

    auto costOf = [&](const std::vector<int>& p) {
        double c = 0;
        for (std::size_t i = 0; i + 1 < p.size(); ++i) {
            const auto& list = g.neighbors(p[i]);
            auto it = std::find_if(list.begin(), list.end(),
                [&](const Edge& e){ return e.to == p[i + 1]; });
            if (it == list.end()) return std::numeric_limits<double>::infinity();
            c += w(*it);
        }
        return c;
    };

    // Yen's algorithm with a per-run subgraph: we simulate edge/node removal
    // by running a Dijkstra variant that skips forbidden nodes/edges via a set.
    // For simplicity we copy the graph and mutate it.
    for (int k = 1; k < K; ++k) {
        const auto& prevPath = A[k - 1];
        for (std::size_t i = 0; i + 1 < prevPath.size(); ++i) {
            int spurNode = prevPath[i];
            std::vector<int> rootPath(prevPath.begin(), prevPath.begin() + i + 1);

            // We can't mutate `g` (const), so we implement Yen's edge/node
            // removal by wrapping the weight function to return infinity for
            // forbidden edges. This is functionally equivalent for Dijkstra.

            // Because `Graph` doesn't expose edge removal, run Dijkstra with a
            // wrapped weight that forbids reused edges and root-path nodes.
            std::unordered_set<long long> forbid;
            for (const auto& p : A) {
                if (p.size() > i && std::equal(rootPath.begin(), rootPath.end(), p.begin())) {
                    long long key = (long long)p[i] * 1000003LL + p[i + 1];
                    forbid.insert(key);
                }
            }
            std::unordered_set<int> rootNodes(rootPath.begin(), rootPath.end() - 1);
            Weight wp = [&](const Edge& e) {
                long long key = (long long)e.from * 1000003LL + e.to;
                if (forbid.count(key)) return std::numeric_limits<double>::infinity();
                if (rootNodes.count(e.to)) return std::numeric_limits<double>::infinity();
                return w(e);
            };
            auto spur = dijkstra(g, spurNode, target, wp);
            if (spur.path.empty()) continue;
            std::vector<int> total(rootPath.begin(), rootPath.end() - 1);
            for (int x : spur.path) total.push_back(x);
            std::string kkey = pathKey(total);
            if (seen.count(kkey)) continue;
            B.push_back({total, costOf(total)});
        }
        if (B.empty()) break;
        std::sort(B.begin(), B.end(), [](const Cand& a, const Cand& b){ return a.cost < b.cost; });
        A.push_back(B.front().p);
        seen.insert(pathKey(B.front().p));
        B.erase(B.begin());
    }
    return A;
}

static void scoreAndLabel(std::vector<Route>& routes) {
    if (routes.empty()) return;
    double minD = routes[0].distance, minT = routes[0].time, minF = routes[0].fuel, minTr = routes[0].avgTraffic;
    for (const auto& r : routes) {
        minD = std::min(minD, r.distance);
        minT = std::min(minT, r.time);
        minF = std::min(minF, r.fuel);
        minTr = std::min(minTr, r.avgTraffic);
    }
    for (auto& r : routes) {
        double d = r.distance / (minD > 0 ? minD : 1);
        double t = r.time / (minT > 0 ? minT : 1);
        double f = r.fuel / (minF > 0 ? minF : 1);
        double tr = r.avgTraffic / (minTr > 0 ? minTr : 1);
        double raw = 0.4 * d + 0.3 * t + 0.2 * f + 0.1 * tr;
        r.score = static_cast<int>((1.0 / raw) * 100.0);
    }
    // labels
    auto tag = [&](std::vector<Route>::iterator it, const std::string& tag) {
        if (it == routes.end()) return;
        it->labels.push_back(tag);
    };
    tag(std::max_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.score < b.score; }), "Best");
    tag(std::min_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.time < b.time; }), "Fastest");
    tag(std::min_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.fuel + a.toll < b.fuel + b.toll; }), "Cheapest");
    tag(std::min_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.distance < b.distance; }), "Shortest");
    tag(std::min_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.avgTraffic < b.avgTraffic; }), "Least Traffic");
    tag(std::min_element(routes.begin(), routes.end(),
        [](const Route& a, const Route& b){ return a.toll < b.toll; }), "Least Toll");
}

std::vector<Route> buildRoutes(const Graph& g, int source, int target, const Weight& w, double trafficMul, int K) {
    auto paths = kShortestPaths(g, source, target, w, K);
    std::vector<Route> out;
    for (const auto& p : paths) {
        auto r = summarizePath(g, p, trafficMul);
        if (!r.path.empty()) out.push_back(r);
    }
    scoreAndLabel(out);
    return out;
}

} // namespace sns
