#ifndef SNS_GRAPH_H
#define SNS_GRAPH_H

#include <string>
#include <vector>
#include <unordered_map>
#include <utility>

namespace sns {

struct Node {
    int id{};
    std::string name;
    std::string state;
    double lat{};
    double lon{};
    bool isCapital{};
};

struct Edge {
    int from{};
    int to{};
    double distance{};   // km
    double time{};       // minutes
    double fuel{};       // INR
    double toll{};       // INR
    int traffic{};       // 1..5
    std::string type;    // road type
    std::string condition;
    int speed{};         // km/h
    int risk{};          // 1..5
};

class Graph {
public:
    void addNode(const Node& n);
    void addEdge(const Edge& e); // stores both directions

    const Node& node(int id) const;
    const std::vector<Edge>& neighbors(int id) const;

    int size() const { return static_cast<int>(nodes_.size()); }
    int edgeCount() const { return static_cast<int>(edges_.size() / 2); }
    const std::vector<Edge>& allEdges() const { return edges_; }
    const std::unordered_map<int, Node>& nodes() const { return nodes_; }

    // Look up an id by name (case-insensitive). Returns -1 if not found.
    int idByName(const std::string& name) const;

    // Straight-line (haversine) distance between two nodes — A* heuristic.
    double heuristic(int a, int b) const;

private:
    std::unordered_map<int, Node> nodes_;
    std::unordered_map<int, std::vector<Edge>> adj_;
    std::unordered_map<std::string, int> byName_;
    std::vector<Edge> edges_;
    std::vector<Edge> empty_;
};

} // namespace sns

#endif
