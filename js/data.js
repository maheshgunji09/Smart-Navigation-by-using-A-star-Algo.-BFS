/* ═══════════════════════════════════════════════════
   data.js — Dataset loader & parser
   Fetches cities.txt, roads.txt, traffic.txt and
   parses pipe-delimited format into JS objects.
   ═══════════════════════════════════════════════════ */

const NaviData = {
  cities: [],
  roads: [],
  traffic: {},

  async load() {
    const [citiesTxt, roadsTxt, trafficTxt] = await Promise.all([
      fetch('data/cities.txt').then(r => r.text()),
      fetch('data/roads.txt').then(r => r.text()),
      fetch('data/traffic.txt').then(r => r.text())
    ]);

    this.cities = this._parseCities(citiesTxt);
    this.roads = this._parseRoads(roadsTxt);
    this.traffic = this._parseTraffic(trafficTxt);

    console.log(`[NaviData] Loaded ${this.cities.length} cities, ${this.roads.length} roads, ${Object.keys(this.traffic).length} traffic scenarios`);
    return this;
  },

  _parseCities(txt) {
    const cities = [];
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('|');
      if (parts.length < 6) continue;
      cities.push({
        id: parseInt(parts[0], 10),
        name: parts[1].trim(),
        state: parts[2].trim(),
        lat: parseFloat(parts[3]),
        lon: parseFloat(parts[4]),
        isCapital: parseInt(parts[5], 10) === 1
      });
    }
    return cities;
  },

  _parseRoads(txt) {
    const roads = [];
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const p = trimmed.split('|');
      if (p.length < 11) continue;
      roads.push({
        from: parseInt(p[0], 10),
        to: parseInt(p[1], 10),
        distance: parseFloat(p[2]),
        time: parseFloat(p[3]),
        fuel: parseFloat(p[4]),
        toll: parseFloat(p[5]),
        traffic: parseFloat(p[6]),
        type: p[7].trim(),
        condition: p[8].trim(),
        speed: parseFloat(p[9]),
        risk: parseFloat(p[10])
      });
    }
    return roads;
  },

  _parseTraffic(txt) {
    const scenarios = {};
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('|');
      if (parts.length >= 2) {
        scenarios[parts[0].trim()] = parseFloat(parts[1]);
      }
    }
    return scenarios;
  }
};
