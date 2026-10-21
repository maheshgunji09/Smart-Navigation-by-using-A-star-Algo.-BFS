/* ═══════════════════════════════════════════════════
   map.js — High-Performance Indian Political Map Visualizer
   Renders smooth state polygons, political color fills, state labels,
   1,000 city nodes, road network, glowing paths & algorithm traversals.
   ═══════════════════════════════════════════════════ */

class MapVisualization {
  constructor(canvasId, graph) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.graph = graph;
    this.tooltip = document.getElementById('map-tooltip');

    // View & camera state
    this.zoom = 1.05;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };

    // Toggles
    this.showRoads = true;
    this.showPoliticalMap = false;
    this.showStateLabels = false;
    this.hoveredCity = null;
    this.hoveredState = null;

    // Route animation state
    this.highlightedRoutes = [];
    this.exploredNodes = new Set();
    this.animOffset = 0;

    // State colors lookup
    this.stateColors = (typeof IndiaMapData !== 'undefined' && IndiaMapData.stateColors)
      ? IndiaMapData.stateColors
      : {};

    // Geo bounds for India
    this.geoBounds = this._computeBounds();

    // Init canvas & listeners
    this._setupCanvas();
    this._bindEvents();
    this._startAnimationLoop();

    // First render
    this.render();
  }

  _computeBounds() {
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const [, city] of this.graph.nodes) {
      minLat = Math.min(minLat, city.lat);
      maxLat = Math.max(maxLat, city.lat);
      minLon = Math.min(minLon, city.lon);
      maxLon = Math.max(maxLon, city.lon);
    }
    const latPad = (maxLat - minLat) * 0.05;
    const lonPad = (maxLon - minLon) * 0.05;
    return {
      minLat: Math.min(7.0, minLat - latPad),
      maxLat: Math.max(37.5, maxLat + latPad),
      minLon: Math.min(67.0, minLon - lonPad),
      maxLon: Math.max(97.5, maxLon + lonPad)
    };
  }

  _setupCanvas() {
    const resize = () => {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const h = Math.max(480, rect.height - 50);
      this.canvas.width = rect.width * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.displayWidth = rect.width;
      this.displayHeight = h;
      this.render();
    };
    resize();
    window.addEventListener('resize', resize);
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.88 : 1.14;
      this.zoom = Math.max(0.5, Math.min(12, this.zoom * delta));
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragOffset = { x: this.offsetX, y: this.offsetY };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.offsetX = this.dragOffset.x + (e.clientX - this.dragStart.x);
        this.offsetY = this.dragOffset.y + (e.clientY - this.dragStart.y);
        this.render();
      } else {
        this._handleHover(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    });

    // Map control buttons
    document.getElementById('map-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(12, this.zoom * 1.3);
      this.render();
    });
    document.getElementById('map-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.5, this.zoom / 1.3);
      this.render();
    });
    document.getElementById('map-reset')?.addEventListener('click', () => {
      this.zoom = 1.05;
      this.offsetX = 0;
      this.offsetY = 0;
      this.render();
    });

    const roadsBtn = document.getElementById('map-toggle-roads');
    roadsBtn?.addEventListener('click', () => {
      this.showRoads = !this.showRoads;
      roadsBtn.classList.toggle('active', this.showRoads);
      this.render();
    });

    const polyBtn = document.getElementById('map-toggle-polygons');
    polyBtn?.addEventListener('click', () => {
      this.showPoliticalMap = !this.showPoliticalMap;
      polyBtn.classList.toggle('active', this.showPoliticalMap);
      this.render();
    });
  }

  _startAnimationLoop() {
    const animate = () => {
      this.animOffset = (this.animOffset + 0.5) % 26;
      if (this.highlightedRoutes.length > 0) {
        this.render();
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  _handleHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closest = null;
    let closestDist = 16;

    for (const [, city] of this.graph.nodes) {
      const p = this._geoToScreen(city.lat, city.lon);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < closestDist) {
        closestDist = d;
        closest = city;
      }
    }

    if (closest !== this.hoveredCity) {
      this.hoveredCity = closest;
      this.hoveredState = closest ? closest.state : null;

      if (closest) {
        const theme = this.stateColors[closest.state] || { stroke: '#00d4ff', fill: 'rgba(0,212,255,0.2)' };
        this.tooltip.innerHTML = `
          <div style="font-weight:700;font-size:0.95rem;color:#fff;display:flex;align-items:center;gap:6px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${theme.stroke};box-shadow:0 0 8px ${theme.stroke};display:inline-block"></span>
            ${closest.name} ${closest.isCapital ? '⭐ Capital' : ''}
          </div>
          <div style="color:${theme.stroke};font-size:0.82rem;font-weight:700;margin-top:2px">${closest.state}</div>
          <div style="font-family:'JetBrains Mono';font-size:0.75rem;opacity:0.8;margin-top:4px">
            📍 ${closest.lat.toFixed(4)}°N, ${closest.lon.toFixed(4)}°E
          </div>
          <div style="font-size:0.75rem;opacity:0.75;margin-top:2px">
            🛣️ ${this.graph.neighbors(closest.id).length} Highway Connections
          </div>`;
        this.tooltip.style.left = (mx + 18) + 'px';
        this.tooltip.style.top = (my - 12) + 'px';
        this.tooltip.classList.add('visible');
      } else {
        this.tooltip.classList.remove('visible');
      }
      this.render();
    }
  }

  _geoToScreen(lat, lon) {
    const b = this.geoBounds;
    const nx = (lon - b.minLon) / (b.maxLon - b.minLon);
    const ny = 1 - (lat - b.minLat) / (b.maxLat - b.minLat);

    const x = (nx * this.displayWidth) * this.zoom + this.offsetX + (this.displayWidth * (1 - this.zoom)) / 2;
    const y = (ny * this.displayHeight) * this.zoom + this.offsetY + (this.displayHeight * (1 - this.zoom)) / 2;
    return { x, y };
  }

  render() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Cosmic Ocean Background & Bathymetry Radial Gradient
    const oceanGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
    oceanGrad.addColorStop(0, '#091024');
    oceanGrad.addColorStop(0.6, '#050915');
    oceanGrad.addColorStop(1, '#020409');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Latitude / Longitude Grid
    this._drawGrid(ctx, w, h);

    // 3. Highway Road Network Lines
    if (this.showRoads) {
      this._drawRoads(ctx);
    }

    // 5. Algorithm Exploration Nodes
    if (this.exploredNodes.size > 0) {
      this._drawExplored(ctx);
    }

    // 6. Optimal Path & Route Beams
    if (this.highlightedRoutes.length > 0) {
      this._drawRoutes(ctx);
    }

    // 7. City Markers & Capitals
    this._drawCities(ctx);

    // 8. Map Overlay Legend & Status
    this._drawLegend();
  }

  _drawGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const step = 50 * this.zoom;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  _drawPoliticalMap(ctx) {
    if (!IndiaMapData.polygons) return;

    for (const poly of IndiaMapData.polygons) {
      if (!poly.path || poly.path.length < 3) continue;

      const isHovered = (this.hoveredState === poly.name);
      const theme = this.stateColors[poly.name] || {
        fill: "rgba(99, 102, 241, 0.35)", stroke: "#6366f1", text: "#c7d2fe"
      };

      const points = poly.path.map(([lat, lon]) => this._geoToScreen(lat, lon));

      // Draw smooth curve along state boundary points
      ctx.beginPath();
      points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else {
          const prev = points[i - 1];
          const mx = (prev.x + pt.x) / 2;
          const my = (prev.y + pt.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
      });
      ctx.closePath();

      // Polygon State Fill with radial glow
      if (poly.centroid) {
        const cp = this._geoToScreen(poly.centroid.lat, poly.centroid.lon);
        const rad = Math.max(40, 140 * this.zoom);
        const grad = ctx.createRadialGradient(cp.x, cp.y, 5, cp.x, cp.y, rad);
        const opacity = isHovered ? 0.65 : 0.38;

        grad.addColorStop(0, theme.fill.replace(/[\d\.]+\)$/, (opacity + 0.15) + ')'));
        grad.addColorStop(1, theme.fill.replace(/[\d\.]+\)$/, opacity + ')'));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = isHovered ? theme.fill.replace(/[\d\.]+\)$/, '0.65)') : theme.fill;
      }
      ctx.fill();

      // State Border Outline
      ctx.strokeStyle = isHovered ? '#ffffff' : theme.stroke;
      ctx.lineWidth = (isHovered ? 2.5 : 1.4) * Math.min(this.zoom * 0.5 + 0.5, 2.2);
      ctx.shadowColor = theme.stroke;
      ctx.shadowBlur = isHovered ? 12 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // State Name Typography Label
      if (this.showStateLabels && poly.centroid && this.zoom >= 0.7) {
        const cp = this._geoToScreen(poly.centroid.lat, poly.centroid.lon);
        const fontSize = Math.max(10, Math.min(15, 10 * Math.pow(this.zoom, 0.4)));

        ctx.fillStyle = isHovered ? '#ffffff' : theme.text;
        ctx.font = `800 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 6;
        ctx.fillText(poly.name.toUpperCase(), cp.x, cp.y);
        ctx.shadowBlur = 0;
      }
    }
  }

  _drawRoads(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.65;

    for (const [fromId, edges] of this.graph.adj) {
      const fromNode = this.graph.getNode(fromId);
      if (!fromNode) continue;
      const fp = this._geoToScreen(fromNode.lat, fromNode.lon);

      for (const edge of edges) {
        if (edge.to < fromId) continue;
        const toNode = this.graph.getNode(edge.to);
        if (!toNode) continue;
        const tp = this._geoToScreen(toNode.lat, toNode.lon);

        ctx.beginPath();
        ctx.moveTo(fp.x, fp.y);
        ctx.lineTo(tp.x, tp.y);
        ctx.stroke();
      }
    }
  }

  _drawCities(ctx) {
    for (const [, city] of this.graph.nodes) {
      const p = this._geoToScreen(city.lat, city.lon);
      const isHovered = this.hoveredCity && this.hoveredCity.id === city.id;
      const isOnRoute = this.highlightedRoutes.some(r => r.path && r.path.includes(city.id));
      const isExplored = this.exploredNodes.has(city.id);

      const stateTheme = this.stateColors[city.state] || { stroke: '#00d4ff' };

      let radius = city.isCapital ? 4.5 : 2.4;
      radius *= Math.min(this.zoom * 0.5 + 0.5, 2.4);

      if (isHovered) radius *= 2.4;
      if (isOnRoute) radius *= 2.0;

      // Glow Ring for Route cities or Capital cities
      if (city.isCapital || isOnRoute || isHovered) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = isOnRoute
          ? 'rgba(0, 242, 254, 0.4)'
          : isHovered
            ? 'rgba(255, 255, 255, 0.35)'
            : 'rgba(255, 215, 0, 0.3)';
        ctx.fill();
      }

      if (isExplored && !isOnRoute) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.fill();
      }

      // City core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isOnRoute
        ? '#00f2fe'
        : isExplored
          ? '#f97316'
          : city.isCapital
            ? '#ffd700'
            : stateTheme.stroke;
      ctx.fill();

      // Border outline for Capitals
      if (city.isCapital) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // City Text Label (for Capitals, Hovered, or Route nodes)
      if ((city.isCapital && this.zoom > 1.1) || isHovered || (isOnRoute && this.zoom > 0.8)) {
        ctx.fillStyle = isHovered ? '#ffffff' : isOnRoute ? '#00f2fe' : '#e2e8f0';
        ctx.font = `${isHovered ? '700' : '600'} ${isHovered ? 12 : 10}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 5;
        ctx.fillText(city.name, p.x, p.y - radius - 3);
        ctx.shadowBlur = 0;
      }
    }
  }

  _drawRoutes(ctx) {
    const routeColors = ['#00f2fe', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

    this.highlightedRoutes.forEach((route, ri) => {
      if (!route.path || route.path.length < 2) return;

      const color = routeColors[ri % routeColors.length];
      const width = (ri === 0 ? 4.5 : 2.8) * Math.min(this.zoom * 0.4 + 0.6, 2.2);

      const points = [];
      for (let i = 0; i < route.path.length; i++) {
        const node = this.graph.getNode(route.path[i]);
        if (!node) continue;
        points.push(this._geoToScreen(node.lat, node.lon));
      }

      if (points.length < 2) return;

      // Glow route beam
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = ri === 0 ? 18 : 8;

      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Flowing dash animation along primary route
      if (ri === 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = width * 0.55;
        ctx.setLineDash([10, 16]);
        ctx.lineDashOffset = -this.animOffset;
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Start Pin (S) & Destination Pin (D)
      if (ri === 0) {
        this._drawMarker(ctx, points[0].x, points[0].y, '#10b981', 'S');
        this._drawMarker(ctx, points[points.length - 1].x, points[points.length - 1].y, '#ef4444', 'D');
      }
    });
  }

  _drawMarker(ctx, x, y, color, letter) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  _drawExplored(ctx) {
    for (const nodeId of this.exploredNodes) {
      const node = this.graph.getNode(nodeId);
      if (!node) continue;
      const p = this._geoToScreen(node.lat, node.lon);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.65)';
      ctx.fill();
    }
  }

  _drawLegend() {
    const legend = document.getElementById('map-legend');
    if (!legend) return;
    const zoomPct = Math.round(this.zoom * 100);
    legend.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span><span style="color:#10b981;font-weight:700">●</span> Source</span>
        <span><span style="color:#ef4444;font-weight:700">●</span> Destination</span>
        <span><span style="color:#00f2fe;font-weight:700">●</span> Optimal Path</span>
        <span><span style="color:#f97316;font-weight:700">●</span> Explored</span>
        <span><span style="color:#ffd700;font-weight:700">⭐</span> State Capital</span>
        <span style="opacity:0.75;margin-left:auto;font-family:'JetBrains Mono'">${this.graph.nodeCount} Cities · ${this.graph.edgeCount} Highways · Zoom: ${zoomPct}%</span>
      </div>
    `;
  }

  setRoutes(routes) {
    this.highlightedRoutes = routes || [];
    this.render();
  }

  setExploredNodes(nodeIds) {
    this.exploredNodes = new Set(nodeIds || []);
    this.render();
  }

  clearHighlights() {
    this.highlightedRoutes = [];
    this.exploredNodes.clear();
    this.render();
  }

  focusOnRoute(route) {
    if (!route || !route.path || route.path.length === 0) return;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const nid of route.path) {
      const n = this.graph.getNode(nid);
      if (!n) continue;
      minLat = Math.min(minLat, n.lat);
      maxLat = Math.max(maxLat, n.lat);
      minLon = Math.min(minLon, n.lon);
      maxLon = Math.max(maxLon, n.lon);
    }
    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;
    const b = this.geoBounds;
    const scaleX = this.displayWidth / ((lonRange / (b.maxLon - b.minLon)) * this.displayWidth);
    const scaleY = this.displayHeight / ((latRange / (b.maxLat - b.minLat)) * this.displayHeight);
    this.zoom = Math.min(scaleX, scaleY) * 0.65;
    this.zoom = Math.max(0.8, Math.min(8, this.zoom));

    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerNx = (centerLon - b.minLon) / (b.maxLon - b.minLon);
    const centerNy = 1 - (centerLat - b.minLat) / (b.maxLat - b.minLat);
    this.offsetX = this.displayWidth / 2 - centerNx * this.displayWidth * this.zoom;
    this.offsetY = this.displayHeight / 2 - centerNy * this.displayHeight * this.zoom;

    this.render();
  }
}
