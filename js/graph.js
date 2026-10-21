/* ============================================================
 *  graph.js — Weighted undirected graph for Indian road network
 *  1000 nodes (cities) · multi-attribute edges (roads)
 * ============================================================ */

class Graph {
  /**
   * @param {Array<{id:number, name:string, state:string, lat:number, lon:number, isCapital:boolean}>} cities
   * @param {Array<{from:number, to:number, distance:number, time:number, fuel:number, toll:number, traffic:number, type:string, condition:string, speed:number, risk:number}>} roads
   */
  constructor(cities, roads) {
    /** @type {Map<number, object>} id → city object */
    this.nodes = new Map();
    /** @type {Map<number, Array<object>>} id → [{to, distance, time, fuel, toll, traffic, type, condition, speed, risk}] */
    this.adj = new Map();
    /** @type {Map<string, number>} lowercase name → id */
    this.nameToId = new Map();
    this.nodeCount = 0;
    this.edgeCount = 0;

    // Build the graph
    for (const city of cities) {
      this.addNode(city);
    }
    for (const road of roads) {
      this.addEdge(road);
    }
  }

  /* ---------------------------------------------------------- */
  /*  Mutation helpers                                           */
  /* ---------------------------------------------------------- */

  /**
   * Register a city node.
   * @param {{id:number, name:string, state:string, lat:number, lon:number, isCapital:boolean}} city
   */
  addNode(city) {
    if (this.nodes.has(city.id)) return;
    this.nodes.set(city.id, city);
    this.adj.set(city.id, []);
    this.nameToId.set(city.name.toLowerCase().trim(), city.id);
    this.nodeCount++;
  }

  /**
   * Add an undirected edge (both directions).
   * @param {{from:number, to:number, distance:number, time:number, fuel:number, toll:number, traffic:number, type:string, condition:string, speed:number, risk:number}} road
   */
  addEdge(road) {
    const forward = {
      to: road.to,
      distance: road.distance,
      time: road.time,
      fuel: road.fuel,
      toll: road.toll,
      traffic: road.traffic,
      type: road.type,
      condition: road.condition,
      speed: road.speed,
      risk: road.risk
    };

    const backward = {
      to: road.from,
      distance: road.distance,
      time: road.time,
      fuel: road.fuel,
      toll: road.toll,
      traffic: road.traffic,
      type: road.type,
      condition: road.condition,
      speed: road.speed,
      risk: road.risk
    };

    if (!this.adj.has(road.from)) this.adj.set(road.from, []);
    if (!this.adj.has(road.to)) this.adj.set(road.to, []);

    this.adj.get(road.from).push(forward);
    this.adj.get(road.to).push(backward);
    this.edgeCount++;
  }

  /* ---------------------------------------------------------- */
  /*  Query helpers                                              */
  /* ---------------------------------------------------------- */

  /**
   * Return the neighbor edge list for a node.
   * @param {number} id
   * @returns {Array<object>}
   */
  neighbors(id) {
    return this.adj.get(id) || [];
  }

  /**
   * Return the city object for a node id.
   * @param {number} id
   * @returns {object|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Exact city name lookup (case-insensitive).
   * @param {string} name
   * @returns {number|undefined} city id
   */
  findCity(name) {
    return this.nameToId.get(name.toLowerCase().trim());
  }

  /**
   * Fuzzy prefix + contains search for autocomplete.
   * Returns up to 10 matching city objects, prefix matches first.
   * @param {string} query
   * @returns {Array<object>}
   */
  searchCities(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = [];
    const addedIds = new Set();

    // Pass 1: prefix matches
    for (const [id, city] of this.nodes) {
      if (city.name.toLowerCase().startsWith(q)) {
        results.push(city);
        addedIds.add(id);
      }
      if (results.length >= 10) break;
    }

    // Pass 2: contains matches (only if still room)
    if (results.length < 10) {
      for (const [id, city] of this.nodes) {
        if (addedIds.has(id)) continue;
        if (city.name.toLowerCase().includes(q)) {
          results.push(city);
          addedIds.add(id);
        }
        if (results.length >= 10) break;
      }
    }

    return results;
  }

  /* ---------------------------------------------------------- */
  /*  Haversine distance (km)                                    */
  /* ---------------------------------------------------------- */

  /**
   * Great-circle distance between two nodes in km.
   * Used as A* heuristic.
   * @param {number} id1
   * @param {number} id2
   * @returns {number}
   */
  haversine(id1, id2) {
    const n1 = this.nodes.get(id1);
    const n2 = this.nodes.get(id2);
    if (!n1 || !n2) return 0;

    const R = 6371; // Earth radius in km
    const toRad = (deg) => deg * Math.PI / 180;

    const dLat = toRad(n2.lat - n1.lat);
    const dLon = toRad(n2.lon - n1.lon);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(n1.lat)) * Math.cos(toRad(n2.lat)) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------------------------------------------------------- */
  /*  Weight functions                                           */
  /* ---------------------------------------------------------- */

  /**
   * Return a weight function (edge → number) for the given criterion.
   * @param {string} criterion  One of: distance, time, fuel, toll, traffic, safest, scenic, balanced
   * @param {number} trafficMul Traffic scenario multiplier (applied to time-related fields)
   * @returns {function(object): number}
   */
  weightFn(criterion, trafficMul = 1.0) {
    switch (criterion) {
      case 'distance':
        return (e) => e.distance;
      case 'time':
        return (e) => e.time * trafficMul;
      case 'fuel':
        return (e) => e.fuel;
      case 'toll':
        return (e) => e.toll;
      case 'traffic':
        return (e) => e.traffic * trafficMul;
      case 'safest':
        return (e) => e.risk; // lower risk = better
      case 'scenic':
        return (e) => 5 - e.traffic; // invert: high traffic = less scenic
      case 'balanced':
      default:
        return (e) => 0.4 * e.distance + 0.3 * (e.time * trafficMul) + 0.2 * e.fuel + 0.1 * e.toll;
    }
  }

  /* ---------------------------------------------------------- */
  /*  Utility                                                    */
  /* ---------------------------------------------------------- */

  /**
   * All unique states sorted alphabetically.
   * @returns {string[]}
   */
  getStates() {
    const states = new Set();
    for (const [, c] of this.nodes) {
      states.add(c.state);
    }
    return [...states].sort();
  }

  /**
   * Degree (number of edges) for a node.
   * @param {number} id
   * @returns {number}
   */
  degree(id) {
    return (this.adj.get(id) || []).length;
  }
}
