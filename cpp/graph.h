#ifndef NAVI_GRAPH_H
#define NAVI_GRAPH_H

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <iostream>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace Navi {

/**
 * @struct CityNode
 * Represents a city in the Indian road network dataset.
 */
struct CityNode {
    int id;
    std::string name;
    std::string state;
    double lat;
    double lon;
    bool isCapital;

    CityNode() : id(-1), lat(0), lon(0), isCapital(false) {}
    CityNode(int id, std::string name, std::string state, double lat, double lon, bool isCapital)
        : id(id), name(std::move(name)), state(std::move(state)), lat(lat), lon(lon), isCapital(isCapital) {}
};

/**
 * @struct RoadEdge
 * Represents a multi-attribute road segment connecting two cities.
 */
struct RoadEdge {
    int from;
    int to;
    double distance;  // in km
    double time;      // in minutes
    double fuel;      // fuel cost in INR
    double toll;      // toll cost in INR
    double traffic;   // traffic factor multiplier
    std::string type; // Highway, National, State, Express
    std::string condition; // Smooth, Moderate, Rough
    double speed;     // average speed in km/h
    double risk;      // accident risk score 0.0 - 1.0

    RoadEdge() : from(-1), to(-1), distance(0), time(0), fuel(0), toll(0), traffic(1.0), speed(60), risk(0.1) {}
    RoadEdge(int u, int v, double dist, double t, double f, double toll_cost, double tr, std::string tp, std::string cond, double spd, double r)
        : from(u), to(v), distance(dist), time(t), fuel(f), toll(toll_cost), traffic(tr),
          type(std::move(tp)), condition(std::move(cond)), speed(spd), risk(r) {}

    double getWeight(const std::string& criterion, double trafficMultiplier = 1.0) const {
        double tr = traffic * trafficMultiplier;
        if (criterion == "distance") return distance;
        if (criterion == "time") return (time * tr);
        if (criterion == "fuel") return (fuel * tr);
        if (criterion == "toll") return toll;
        if (criterion == "traffic") return (distance * tr);
        if (criterion == "safest") return (distance * (1.0 + risk * 2.0));
        if (criterion == "scenic") return (distance * 0.8);
        // Balanced formula
        return (distance * 0.4) + (time * tr * 0.3) + (toll * 0.15) + (fuel * tr * 0.15);
    }
};

/**
 * @class Graph
 * Adjacency-list based Graph representation of 1,000+ Indian cities and highway connections.
 */
class Graph {
private:
    std::unordered_map<int, CityNode> nodes;
    std::unordered_map<int, std::vector<RoadEdge>> adjList;
    std::unordered_map<std::string, int> nameToIdMap;

public:
    Graph() = default;

    void addNode(const CityNode& node);
    void addEdge(const RoadEdge& edge, bool bidirectional = true);

    const CityNode* getNode(int id) const;
    int findCityByName(const std::string& name) const;
    const std::vector<RoadEdge>& getNeighbors(int id) const;
    const std::unordered_map<int, CityNode>& getAllNodes() const { return nodes; }

    size_t nodeCount() const { return nodes.size(); }
    size_t edgeCount() const {
        size_t count = 0;
        for (const auto& pair : adjList) {
            count += pair.second.size();
        }
        return count / 2; // Undirected
    }

    double calculateEuclideanDistance(int nodeA, int nodeB) const;
    double calculateHaversineDistance(int nodeA, int nodeB) const;
};

} // namespace Navi

#endif // NAVI_GRAPH_H
