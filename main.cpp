// Smart Navigation System — DSA Route Optimizer
// Interactive CLI. Loads the India road network from ./data/*.txt and lets
// the user plan routes, compare algorithms, or view statistics.

#include "NavigationSystem.h"
#include "Statistics.h"
#include <iostream>
#include <iomanip>
#include <string>

int main(int argc, char** argv) {
    std::string dataDir = "data";
    if (argc > 1) dataDir = argv[1];

    sns::NavigationSystem nav;
    if (!nav.loadFromDirectory(dataDir)) {
        std::cerr << "Failed to load dataset from '" << dataDir << "'.\n";
        return 1;
    }
    std::cout << "Loaded " << nav.graph().size() << " cities and "
              << nav.graph().edgeCount() << " roads.\n";

    while (true) {
        std::cout << "\n=== Smart Navigation System ===\n"
                  << "  1) Find routes (source -> destination)\n"
                  << "  2) Compare all algorithms\n"
                  << "  3) Show network statistics\n"
                  << "  0) Quit\n"
                  << "> " << std::flush;
        int choice; if (!(std::cin >> choice)) break;
        std::cin.ignore(1024, '\n');
        if (choice == 0) break;
        if (choice == 3) { sns::Statistics::print(nav.graph(), std::cout); continue; }

        std::string src, dst, criterion, scenario;
        std::cout << "Source city     : "; std::getline(std::cin, src);
        std::cout << "Destination     : "; std::getline(std::cin, dst);
        std::cout << "Optimize (distance/time/fuel/toll/traffic/safest/scenic/balanced) [balanced]: ";
        std::getline(std::cin, criterion); if (criterion.empty()) criterion = "balanced";
        std::cout << "Traffic scenario (morning/afternoon/evening/night/rain/festival/...) [afternoon]: ";
        std::getline(std::cin, scenario);  if (scenario.empty()) scenario = "afternoon";

        if (choice == 2) { nav.compareAlgorithms(src, dst, criterion, scenario); continue; }

        auto routes = nav.findRoutes(src, dst, criterion, scenario, 5);
        if (routes.empty()) { std::cout << "No route found.\n"; continue; }
        int idx = 1;
        for (const auto& r : routes) {
            std::cout << "\nRoute " << idx++ << " — score " << r.score
                      << "  [";
            for (std::size_t i = 0; i < r.labels.size(); ++i) {
                std::cout << (i ? ", " : "") << r.labels[i];
            }
            std::cout << "]\n"
                      << std::fixed << std::setprecision(1)
                      << "  distance: " << r.distance << " km   time: " << r.time
                      << " min   fuel: Rs " << r.fuel << "   toll: Rs " << r.toll
                      << "   traffic: " << r.avgTraffic << "/5   segments: " << r.hops << "\n"
                      << "  path: ";
            for (std::size_t i = 0; i < r.path.size(); ++i) {
                std::cout << (i ? " -> " : "") << nav.graph().node(r.path[i]).name;
            }
            std::cout << "\n";
        }
    }
    std::cout << "Bye.\n";
    return 0;
}
