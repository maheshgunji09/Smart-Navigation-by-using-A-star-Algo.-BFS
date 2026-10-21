/* ============================================================
 *  traffic.js — Traffic scenario manager
 *  10 Indian-road traffic scenarios with time multipliers
 * ============================================================ */

class TrafficManager {
  constructor() {
    /**
     * Scenario name → time-cost multiplier.
     * Values > 1 mean slower travel; < 1 mean faster.
     * @type {Object<string, number>}
     */
    this.scenarios = {
      morning: 1.4,        // morning rush hour
      afternoon: 1.1,      // light midday traffic
      evening: 1.6,        // evening rush hour
      night: 0.8,          // low traffic at night
      weekend: 1.2,        // moderate weekend traffic
      festival: 1.8,       // festival season congestion
      rain: 1.5,           // monsoon / heavy rain
      accident: 2.0,       // road accident ahead
      construction: 1.7,   // road construction zone
      vip_movement: 1.9    // VIP convoy / road closure
    };
  }

  /**
   * Return the time multiplier for a given scenario name.
   * Returns 1.0 (no change) for unknown scenarios.
   * @param {string} scenario
   * @returns {number}
   */
  getMultiplier(scenario) {
    return this.scenarios[scenario] || 1.0;
  }

  /**
   * Return all scenarios as an array of { name, multiplier } objects.
   * @returns {Array<{name:string, multiplier:number}>}
   */
  getScenarios() {
    return Object.entries(this.scenarios).map(([name, multiplier]) => ({
      name,
      multiplier
    }));
  }
}
