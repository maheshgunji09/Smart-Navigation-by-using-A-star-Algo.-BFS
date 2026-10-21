/* ═══════════════════════════════════════════════════
   ui.js — UI Controller
   Handles tabs, autocomplete, route rendering,
   algorithm comparison, statistics, admin, history.
   ═══════════════════════════════════════════════════ */

class UIController {
  constructor(graph, map, trafficMgr) {
    this.graph = graph;
    this.map = map;
    this.traffic = trafficMgr;
    this.history = JSON.parse(localStorage.getItem('navi_history') || '[]');
    this.favourites = JSON.parse(localStorage.getItem('navi_favourites') || '[]');

    this._bindTabs();
    this._bindSearch();
    this._bindTheme();
    this._bindKeyboard();
    this._bindPresets();
  }

  /* ─── TABS ─── */
  _bindTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = document.getElementById('tab-' + btn.dataset.tab);
        if (tab) tab.classList.add('active');
      });
    });
  }

  /* ─── AUTOCOMPLETE ─── */
  _bindSearch() {
    this._setupAutocomplete('source-input', 'source-suggestions');
    this._setupAutocomplete('dest-input', 'dest-suggestions');

    // Swap button
    document.getElementById('swap-btn')?.addEventListener('click', () => {
      const s = document.getElementById('source-input');
      const d = document.getElementById('dest-input');
      const tmp = s.value;
      s.value = d.value;
      d.value = tmp;
    });

    // Find routes button
    document.getElementById('find-routes-btn')?.addEventListener('click', () => this._findRoutes());
  }

  _setupAutocomplete(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = input.value.trim();
        if (q.length < 1) {
          dropdown.innerHTML = '';
          dropdown.style.display = 'none';
          return;
        }
        const results = this.graph.searchCities(q);
        if (results.length === 0) {
          dropdown.innerHTML = '';
          dropdown.style.display = 'none';
          return;
        }
        dropdown.innerHTML = results.map(c => `
          <div class="suggestion-item" data-name="${c.name}">
            <span class="city-name">${this._highlightMatch(c.name, q)}</span>
            <span class="city-state">${c.state}${c.isCapital ? ' ⭐' : ''}</span>
          </div>
        `).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            input.value = item.dataset.name;
            dropdown.innerHTML = '';
            dropdown.style.display = 'none';
          });
        });
      }, 100);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
      }, 200);
    });

    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.suggestion-item');
      const active = dropdown.querySelector('.suggestion-item.active');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!active && items.length) items[0].classList.add('active');
        else if (active && active.nextElementSibling) {
          active.classList.remove('active');
          active.nextElementSibling.classList.add('active');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active && active.previousElementSibling) {
          active.classList.remove('active');
          active.previousElementSibling.classList.add('active');
        }
      } else if (e.key === 'Enter' && active) {
        e.preventDefault();
        input.value = active.dataset.name;
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
      }
    });
  }

  _highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
  }

  /* ─── ROUTE FINDING ─── */
  _findRoutes() {
    const sourceName = document.getElementById('source-input').value.trim();
    const destName = document.getElementById('dest-input').value.trim();
    const criterion = document.getElementById('criterion-select').value;
    const scenario = document.getElementById('scenario-select').value;

    if (!sourceName || !destName) {
      this._toast('Please enter both source and destination', 'error');
      return;
    }

    const sourceId = this.graph.findCity(sourceName);
    const destId = this.graph.findCity(destName);

    if (sourceId === undefined) {
      this._toast(`City not found: "${sourceName}"`, 'error');
      return;
    }
    if (destId === undefined) {
      this._toast(`City not found: "${destName}"`, 'error');
      return;
    }
    if (sourceId === destId) {
      this._toast('Source and destination are the same city', 'error');
      return;
    }

    const mul = this.traffic.getMultiplier(scenario);
    const wFn = this.graph.weightFn(criterion, mul);

    // Build routes
    const routes = buildRoutes(this.graph, sourceId, destId, wFn, 5);

    if (routes.length === 0) {
      this._toast('No route found between these cities', 'error');
      document.getElementById('route-results').innerHTML = '<div class="glass-card"><p class="empty-state">No route found. The cities may not be connected.</p></div>';
      return;
    }

    // Save to history
    this._addHistory(sourceName, destName, criterion, scenario, routes[0]);

    // Render route cards
    this._renderRoutes(routes, sourceName, destName);

    // Highlight on map
    this.map.setRoutes(routes);
    this.map.focusOnRoute(routes[0]);

    this._toast(`Found ${routes.length} route${routes.length > 1 ? 's' : ''} from ${sourceName} to ${destName}`, 'success');
  }

  _renderRoutes(routes, sourceName, destName) {
    const container = document.getElementById('route-results');
    const borderColors = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];
    const labelColors = {
      'Best': '#10b981', 'Fastest': '#00d4ff', 'Cheapest': '#f59e0b',
      'Shortest': '#7c3aed', 'Least Traffic': '#3b82f6', 'Least Toll': '#ef4444'
    };

    container.innerHTML = routes.map((route, i) => {
      const pathNames = route.path.map(id => this.graph.getNode(id)?.name || id).join(' → ');
      return `
        <div class="route-card" style="border-left-color:${borderColors[i % borderColors.length]}" data-route-index="${i}">
          <div class="route-card-header">
            <div class="route-rank">#${i + 1}</div>
            <div class="route-score-wrap">
              <span class="route-score-label">Score</span>
              <div class="route-score-bar">
                <div class="route-score-fill" style="width:${route.score}%;background:${borderColors[i % borderColors.length]}"></div>
              </div>
              <span class="route-score-value">${route.score.toFixed(0)}</span>
            </div>
          </div>
          <div class="route-labels">
            ${route.labels.map(l => `<span class="route-label" style="background:${labelColors[l] || '#6b7280'}20;color:${labelColors[l] || '#6b7280'};border:1px solid ${labelColors[l] || '#6b7280'}40">${l}</span>`).join('')}
          </div>
          <div class="route-metrics">
            <div class="metric">
              <span class="metric-value">${route.distance.toFixed(1)}</span>
              <span class="metric-label">Distance (km)</span>
            </div>
            <div class="metric">
              <span class="metric-value">${route.time.toFixed(0)}</span>
              <span class="metric-label">Time (min)</span>
            </div>
            <div class="metric">
              <span class="metric-value">₹${route.fuel.toFixed(0)}</span>
              <span class="metric-label">Fuel Cost</span>
            </div>
            <div class="metric">
              <span class="metric-value">₹${route.toll.toFixed(0)}</span>
              <span class="metric-label">Toll</span>
            </div>
          </div>
          <div class="route-path">${pathNames}</div>
          <div class="route-actions">
            <button class="secondary-btn small fav-btn" data-source="${sourceName}" data-dest="${destName}" data-index="${i}">⭐ Favourite</button>
            <button class="secondary-btn small" onclick="navigator.clipboard.writeText('${pathNames.replace(/'/g, "\\'")}')">📋 Copy</button>
          </div>
        </div>
      `;
    }).join('');

    // Favourite buttons
    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this._addFavourite(btn.dataset.source, btn.dataset.dest, routes[idx]);
        this._toast('Added to favourites!', 'success');
      });
    });

    // Click route card to highlight on map
    container.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.route-actions')) return;
        const idx = parseInt(card.dataset.routeIndex);
        this.map.setRoutes([routes[idx]]);
        this.map.focusOnRoute(routes[idx]);
      });
    });

    // Animate score bars
    requestAnimationFrame(() => {
      container.querySelectorAll('.route-score-fill').forEach(fill => {
        fill.style.transition = 'width 1s cubic-bezier(0.4,0,0.2,1)';
      });
    });
  }



  /* ─── STATISTICS ─── */
  _renderStats() {
    const g = this.graph;
    const states = g.getStates();
    const degrees = [];
    const citiesByState = {};
    let totalDegree = 0;
    let maxDegree = 0;
    let maxDegreeCity = '';

    for (const [id, city] of g.nodes) {
      const deg = g.degree(id);
      degrees.push({ city: city.name, degree: deg });
      totalDegree += deg;
      if (deg > maxDegree) {
        maxDegree = deg;
        maxDegreeCity = city.name;
      }
      citiesByState[city.state] = (citiesByState[city.state] || 0) + 1;
    }

    const avgDegree = totalDegree / g.nodeCount;
    const capitalCount = [...g.nodes.values()].filter(c => c.isCapital).length;

    // Road type counts
    const roadTypes = {};
    const roadConditions = {};
    for (const [, edges] of g.adj) {
      for (const e of edges) {
        roadTypes[e.type] = (roadTypes[e.type] || 0) + 1;
        roadConditions[e.condition] = (roadConditions[e.condition] || 0) + 1;
      }
    }

    // Top 10 most connected cities
    degrees.sort((a, b) => b.degree - a.degree);
    const top10 = degrees.slice(0, 10);

    // State distribution (sorted by count)
    const stateEntries = Object.entries(citiesByState).sort((a, b) => b[1] - a[1]);
    const maxStateCities = Math.max(...stateEntries.map(s => s[1]));

    const container = document.getElementById('stats-content');
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${g.nodeCount.toLocaleString()}</div>
        <div class="stat-label">Cities</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${g.edgeCount.toLocaleString()}</div>
        <div class="stat-label">Roads</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${states.length}</div>
        <div class="stat-label">States</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${capitalCount}</div>
        <div class="stat-label">State Capitals</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${avgDegree.toFixed(1)}</div>
        <div class="stat-label">Avg. Degree</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value gradient-text">${maxDegree}</div>
        <div class="stat-label">Max Degree (${maxDegreeCity})</div>
      </div>

      <!-- Top 10 Connected Cities -->
      <div class="stat-chart glass-card" style="grid-column: 1 / -1">
        <h3 class="card-title"><span class="title-icon">🏆</span> Top 10 Most Connected Cities</h3>
        ${top10.map((d, i) => `
          <div class="stat-bar-row">
            <span class="stat-bar-rank">${i + 1}</span>
            <span class="stat-bar-label">${d.city}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${(d.degree / maxDegree * 100).toFixed(0)}%;background:linear-gradient(90deg,#00d4ff,#7c3aed)"></div>
            </div>
            <span class="stat-bar-value">${d.degree}</span>
          </div>
        `).join('')}
      </div>

      <!-- State Distribution -->
      <div class="stat-chart glass-card" style="grid-column: 1 / -1">
        <h3 class="card-title"><span class="title-icon">🗺️</span> Cities per State</h3>
        ${stateEntries.map(([state, count]) => `
          <div class="stat-bar-row">
            <span class="stat-bar-label" style="min-width:180px">${state}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${(count / maxStateCities * 100).toFixed(0)}%;background:linear-gradient(90deg,#10b981,#00d4ff)"></div>
            </div>
            <span class="stat-bar-value">${count}</span>
          </div>
        `).join('')}
      </div>

      <!-- Road Types -->
      <div class="stat-chart glass-card">
        <h3 class="card-title"><span class="title-icon">🛣️</span> Road Types</h3>
        ${Object.entries(roadTypes).sort((a,b) => b[1]-a[1]).map(([type, count]) => `
          <div class="stat-bar-row">
            <span class="stat-bar-label">${type}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${(count / Math.max(...Object.values(roadTypes)) * 100).toFixed(0)}%;background:#f59e0b"></div>
            </div>
            <span class="stat-bar-value">${count}</span>
          </div>
        `).join('')}
      </div>

      <!-- Road Conditions -->
      <div class="stat-chart glass-card">
        <h3 class="card-title"><span class="title-icon">🔧</span> Road Conditions</h3>
        ${Object.entries(roadConditions).sort((a,b) => b[1]-a[1]).map(([cond, count]) => `
          <div class="stat-bar-row">
            <span class="stat-bar-label">${cond}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${(count / Math.max(...Object.values(roadConditions)) * 100).toFixed(0)}%;background:#ec4899"></div>
            </div>
            <span class="stat-bar-value">${count}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Animate stat values with counter
    container.querySelectorAll('.stat-value').forEach(el => {
      const target = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
      if (isNaN(target)) return;
      const original = el.textContent;
      let current = 0;
      const duration = 1500;
      const start = performance.now();
      const isFloat = original.includes('.');

      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = target * eased;
        el.textContent = isFloat ? current.toFixed(1) : Math.round(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(animate);
        else el.textContent = original;
      };
      requestAnimationFrame(animate);
    });
  }



  /* ─── HISTORY & FAVOURITES ─── */
  _bindHistory() {
    document.getElementById('clear-history-btn')?.addEventListener('click', () => {
      this.history = [];
      localStorage.setItem('navi_history', '[]');
      this._renderHistory();
      this._toast('History cleared', 'info');
    });
  }

  _addHistory(source, dest, criterion, scenario, bestRoute) {
    this.history.unshift({
      source, dest, criterion, scenario,
      distance: bestRoute.distance.toFixed(1),
      time: bestRoute.time.toFixed(0),
      score: bestRoute.score.toFixed(0),
      timestamp: new Date().toISOString()
    });
    if (this.history.length > 50) this.history.pop();
    localStorage.setItem('navi_history', JSON.stringify(this.history));
    this._renderHistory();
  }

  _addFavourite(source, dest, route) {
    const pathNames = route.path.map(id => this.graph.getNode(id)?.name || id);
    this.favourites.unshift({
      source, dest,
      distance: route.distance.toFixed(1),
      time: route.time.toFixed(0),
      score: route.score.toFixed(0),
      path: pathNames.join(' → '),
      timestamp: new Date().toISOString()
    });
    if (this.favourites.length > 30) this.favourites.pop();
    localStorage.setItem('navi_favourites', JSON.stringify(this.favourites));
    this._renderFavourites();
  }

  _renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    if (this.history.length === 0) {
      list.innerHTML = '<p class="empty-state">No searches yet. Use the Route Planner to get started!</p>';
      return;
    }
    list.innerHTML = this.history.map(h => `
      <div class="history-item" data-source="${h.source}" data-dest="${h.dest}">
        <div class="history-route">
          <span class="history-from">${h.source}</span>
          <span class="history-arrow">→</span>
          <span class="history-to">${h.dest}</span>
        </div>
        <div class="history-meta">
          ${h.distance} km · ${h.time} min · Score ${h.score} · ${h.criterion} · ${this._timeAgo(h.timestamp)}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('source-input').value = item.dataset.source;
        document.getElementById('dest-input').value = item.dataset.dest;
        document.querySelector('[data-tab="planner"]')?.click();
      });
    });
  }

  _renderFavourites() {
    const list = document.getElementById('favourites-list');
    if (!list) return;
    if (this.favourites.length === 0) {
      list.innerHTML = '<p class="empty-state">No favourites yet. Star a route to save it!</p>';
      return;
    }
    list.innerHTML = this.favourites.map(f => `
      <div class="history-item" data-source="${f.source}" data-dest="${f.dest}">
        <div class="history-route">
          <span class="history-from">${f.source}</span>
          <span class="history-arrow">→</span>
          <span class="history-to">${f.dest}</span>
        </div>
        <div class="history-meta">
          ${f.distance} km · ${f.time} min · Score ${f.score}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('source-input').value = item.dataset.source;
        document.getElementById('dest-input').value = item.dataset.dest;
        document.querySelector('[data-tab="planner"]')?.click();
      });
    });
  }

  _timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  /* ─── THEME ─── */
  _bindTheme() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('navi_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = toggle?.querySelector('.theme-icon');
    if (icon) icon.textContent = saved === 'dark' ? '🌙' : '☀️';

    toggle?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('navi_theme', next);
      if (icon) icon.textContent = next === 'dark' ? '🌙' : '☀️';
      this.map.render();
    });
  }

  /* ─── KEYBOARD SHORTCUTS ─── */
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter = Find routes
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this._findRoutes();
      }
      // Ctrl/Cmd + K = Focus source input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('source-input')?.focus();
        document.querySelector('[data-tab="planner"]')?.click();
      }
    });
  }

  /* ─── TOAST NOTIFICATIONS ─── */
  _toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✗', info: 'ℹ' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  /* ─── QUICK ROUTE PRESETS ─── */
  _bindPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const src = btn.dataset.src;
        const dst = btn.dataset.dst;
        const srcInput = document.getElementById('source-input');
        const dstInput = document.getElementById('dest-input');

        if (srcInput && dstInput) {
          srcInput.value = src;
          dstInput.value = dst;
          this._toast(`Loaded preset: ${src} ➔ ${dst}`, 'info');
          this._findRoutes();
        }
      });
    });
  }

  /* ─── C++ CODE EXPLORER HUB ─── */
  _bindCppHub() {
    const renderCppCode = (key) => {
      if (typeof CppCodeRepository === 'undefined' || !CppCodeRepository[key]) return;
      const data = CppCodeRepository[key];

      const fileTitle = document.getElementById('cpp-file-title');
      const timeBadge = document.getElementById('cpp-time-badge');
      const spaceBadge = document.getElementById('cpp-space-badge');
      const codeContent = document.getElementById('cpp-code-content');
      const algoTitle = document.getElementById('cpp-algo-title');
      const algoDesc = document.getElementById('cpp-algo-desc');

      if (fileTitle) fileTitle.textContent = data.file;
      if (timeBadge) timeBadge.textContent = `Time: ${data.timeComplexity}`;
      if (spaceBadge) spaceBadge.textContent = `Space: ${data.spaceComplexity}`;
      if (codeContent) codeContent.textContent = data.code;
      if (algoTitle) algoTitle.textContent = data.title;
      if (algoDesc) algoDesc.textContent = data.description;
    };

    // Initial render default
    renderCppCode('dijkstra');

    document.querySelectorAll('.cpp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cpp-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCppCode(btn.dataset.algo);
      });
    });

    // Copy code button
    document.getElementById('cpp-copy-btn')?.addEventListener('click', () => {
      const activeBtn = document.querySelector('.cpp-tab-btn.active');
      const key = activeBtn ? activeBtn.dataset.algo : 'dijkstra';
      if (typeof CppCodeRepository !== 'undefined' && CppCodeRepository[key]) {
        navigator.clipboard.writeText(CppCodeRepository[key].code).then(() => {
          this._toast('C++ algorithm code copied to clipboard!', 'success');
        }).catch(() => {
          this._toast('Failed to copy code', 'error');
        });
      }
    });
  }
}
