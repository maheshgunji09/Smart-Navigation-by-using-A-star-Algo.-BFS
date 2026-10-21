#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include "graph.h"
#include "algorithms.h"

using namespace Navi;

bool loadDataset(Graph& graph, const std::string& citiesFile, const std::string& roadsFile) {
    std::ifstream cFile(citiesFile);
    if (!cFile.is_open()) {
        std::cerr << "[Error] Failed to open " << citiesFile << std::endl;
        return false;
    }

    std::string line;
    while (std::getline(cFile, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) {
            parts.push_back(token);
        }
        if (parts.size() >= 6) {
            int id = std::stoi(parts[0]);
            std::string name = parts[1];
            std::string state = parts[2];
            double lat = std::stod(parts[3]);
            double lon = std::stod(parts[4]);
            bool isCapital = (std::stoi(parts[5]) == 1);
            graph.addNode(CityNode(id, name, state, lat, lon, isCapital));
        }
    }

    std::ifstream rFile(roadsFile);
    if (!rFile.is_open()) {
        std::cerr << "[Error] Failed to open " << roadsFile << std::endl;
        return false;
    }

    while (std::getline(rFile, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(ss, token, '|')) {
            parts.push_back(token);
        }
        if (parts.size() >= 11) {
            int u = std::stoi(parts[0]);
            int v = std::stoi(parts[1]);
            double dist = std::stod(parts[2]);
            double t = std::stod(parts[3]);
            double f = std::stod(parts[4]);
            double toll = std::stod(parts[5]);
            double tr = std::stod(parts[6]);
            std::string tp = parts[7];
            std::string cond = parts[8];
            double spd = std::stod(parts[9]);
            double r = std::stod(parts[10]);
            graph.addEdge(RoadEdge(u, v, dist, t, f, toll, tr, tp, cond, spd, r));
        }
    }

    return true;
}

int main(int argc, char* argv[]) {
    std::cout << "=================================================================\n";
    std::cout << "  NAVI 2.0 — High-Performance C++ DSA Navigation Engine\n";
    std::cout << "  Graph Routing & Pathfinding Algorithm Benchmark Suite\n";
    std::cout << "=================================================================\n\n";

    Graph graph;
    std::string citiesPath = "data/cities.txt";
    std::string roadsPath = "data/roads.txt";

    if (argc >= 3) {
        citiesPath = argv[1];
        roadsPath = argv[2];
    }

    std::cout << "[Info] Loading graph data from " << citiesPath << " and " << roadsPath << "...\n";
    if (!loadDataset(graph, citiesPath, roadsPath)) {
        std::cout << "[Warn] Could not load dataset from disk. Creating fallback demo graph...\n";
        // Create demo graph
        graph.addNode(CityNode(0, "Kadapa", "Andhra Pradesh", 14.4753, 78.8298, false));
        graph.addNode(CityNode(1, "Vijayawada", "Andhra Pradesh", 16.5062, 80.6480, false));
        graph.addNode(CityNode(2, "Tirupati", "Andhra Pradesh", 13.6288, 79.4192, false));
        graph.addNode(CityNode(3, "Amaravati", "Andhra Pradesh", 16.5062, 80.6480, true));
        graph.addNode(CityNode(4, "Hyderabad", "Telangana", 17.3850, 78.4867, true));
        graph.addNode(CityNode(5, "Bengaluru", "Karnataka", 12.9716, 77.5946, true));

        graph.addEdge(RoadEdge(0, 2, 140, 180, 1200, 150, 1.0, "NH", "Smooth", 70, 0.05));
        graph.addEdge(RoadEdge(0, 1, 350, 360, 2800, 350, 1.1, "NH", "Smooth", 80, 0.05));
        graph.addEdge(RoadEdge(2, 5, 250, 270, 2000, 250, 1.2, "NH", "Smooth", 75, 0.08));
        graph.addEdge(RoadEdge(1, 3, 30, 35, 250, 40, 1.0, "State", "Smooth", 60, 0.02));
        graph.addEdge(RoadEdge(1, 4, 275, 300, 2200, 300, 1.3, "NH", "Smooth", 85, 0.06));
        graph.addEdge(RoadEdge(4, 5, 570, 540, 4500, 600, 1.2, "NH", "Smooth", 90, 0.04));
    }

    std::cout << "[Success] Graph initialized with " << graph.nodeCount()
              << " cities and " << graph.edgeCount() << " road segments.\n\n";

    std::string sourceCityName = "Kadapa";
    std::string destCityName = "Vijayawada";

    if (argc >= 5) {
        sourceCityName = argv[3];
        destCityName = argv[4];
    }

    int srcId = graph.findCityByName(sourceCityName);
    int dstId = graph.findCityByName(destCityName);

    if (srcId == -1) srcId = 0;
    if (dstId == -1) dstId = 1;

    const CityNode* srcNode = graph.getNode(srcId);
    const CityNode* dstNode = graph.getNode(dstId);

    std::cout << "-----------------------------------------------------------------\n";
    std::cout << " ROUTE BENCHMARK: " << (srcNode ? srcNode->name : "Source")
              << " (" << (srcNode ? srcNode->state : "") << ")"
              << "  --->  " << (dstNode ? dstNode->name : "Dest")
              << " (" << (dstNode ? dstNode->state : "") << ")\n";
    std::cout << "-----------------------------------------------------------------\n\n";

    std::vector<AlgorithmResult> results;
    results.push_back(Algorithms::dijkstra(graph, srcId, dstId, "balanced"));
    results.push_back(Algorithms::aStar(graph, srcId, dstId, "balanced"));
    results.push_back(Algorithms::bellmanFord(graph, srcId, dstId, "balanced"));
    results.push_back(Algorithms::bfs(graph, srcId, dstId));
    results.push_back(Algorithms::dfs(graph, srcId, dstId));

    if (graph.nodeCount() <= 150) {
        results.push_back(Algorithms::floydWarshall(graph, srcId, dstId, "balanced"));
    }

    // Print Header
    std::cout << std::left << std::setw(28) << "Algorithm"
              << std::setw(12) << "Status"
              << std::setw(12) << "Distance"
              << std::setw(12) << "Time (min)"
              << std::setw(12) << "Fuel (INR)"
              << std::setw(12) << "Nodes Vis"
              << std::setw(14) << "Runtime (us)"
              << "\n";
    std::cout << std::string(102, '-') << "\n";

    for (const auto& res : results) {
        std::cout << std::left << std::setw(28) << res.algorithmName
                  << std::setw(12) << (res.pathFound ? "SUCCESS" : "FAILED")
                  << std::setw(12) << (std::to_string(static_cast<int>(res.totalDistance)) + " km")
                  << std::setw(12) << (std::to_string(static_cast<int>(res.totalTime)) + " m")
                  << std::setw(12) << ("Rs. " + std::to_string(static_cast<int>(res.totalFuel)))
                  << std::setw(12) << res.visitedNodes
                  << std::setw(14) << std::fixed << std::setprecision(1) << res.runtimeUs
                  << "\n";
    }

    std::cout << std::string(102, '-') << "\n\n";

    if (!results.empty() && results[0].pathFound) {
        std::cout << "Optimal Path (" << results[0].algorithmName << "):\n  ";
        for (size_t i = 0; i < results[0].path.size(); ++i) {
            const CityNode* n = graph.getNode(results[0].path[i]);
            if (n) {
                std::cout << n->name;
                if (i < results[0].path.size() - 1) std::cout << " -> ";
            }
        }
        std::cout << "\n\n";
    }

    std::cout << "=================================================================\n";
    std::cout << " Benchmark completed successfully!\n";
    std::cout << "=================================================================\n";

    return 0;
}
