#include "graph.h"
#include <algorithm>
#include <cctype>

namespace Navi {

static std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return std::tolower(c); });
    return s;
}

void Graph::addNode(const CityNode& node) {
    nodes[node.id] = node;
    nameToIdMap[toLower(node.name)] = node.id;
    if (adjList.find(node.id) == adjList.end()) {
        adjList[node.id] = {};
    }
}

void Graph::addEdge(const RoadEdge& edge, bool bidirectional) {
    adjList[edge.from].push_back(edge);
    if (bidirectional) {
        RoadEdge revEdge = edge;
        revEdge.from = edge.to;
        revEdge.to = edge.from;
        adjList[edge.to].push_back(revEdge);
    }
}

const CityNode* Graph::getNode(int id) const {
    auto it = nodes.find(id);
    if (it != nodes.end()) {
        return &(it->second);
    }
    return nullptr;
}

int Graph::findCityByName(const std::string& name) const {
    auto it = nameToIdMap.find(toLower(name));
    if (it != nameToIdMap.end()) {
        return it->second;
    }
    return -1;
}

static const std::vector<RoadEdge> EMPTY_EDGES;

const std::vector<RoadEdge>& Graph::getNeighbors(int id) const {
    auto it = adjList.find(id);
    if (it != adjList.end()) {
        return it->second;
    }
    return EMPTY_EDGES;
}

double Graph::calculateEuclideanDistance(int nodeA, int nodeB) const {
    const CityNode* a = getNode(nodeA);
    const CityNode* b = getNode(nodeB);
    if (!a || !b) return 0.0;
    double dlat = a->lat - b->lat;
    double dlon = a->lon - b->lon;
    return std::sqrt(dlat * dlat + dlon * dlon) * 111.0; // approx km per degree
}

double Graph::calculateHaversineDistance(int nodeA, int nodeB) const {
    const CityNode* a = getNode(nodeA);
    const CityNode* b = getNode(nodeB);
    if (!a || !b) return 0.0;

    constexpr double R = 6371.0; // Earth radius in km
    double lat1 = a->lat * M_PI / 180.0;
    double lat2 = b->lat * M_PI / 180.0;
    double dlat = (b->lat - a->lat) * M_PI / 180.0;
    double dlon = (b->lon - a->lon) * M_PI / 180.0;

    double h = std::sin(dlat / 2.0) * std::sin(dlat / 2.0) +
               std::cos(lat1) * std::cos(lat2) *
               std::sin(dlon / 2.0) * std::sin(dlon / 2.0);

    return 2.0 * R * std::asin(std::sqrt(h));
}

} // namespace Navi
