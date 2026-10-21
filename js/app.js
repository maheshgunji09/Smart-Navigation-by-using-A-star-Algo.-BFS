/* ═══════════════════════════════════════════════════
   app.js — Main application initialization
   Loads data, builds graph, initializes UI & map,
   applies localStorage overlay, and particle effects.
   ═══════════════════════════════════════════════════ */

(async function () {
  'use strict';

  /* ─── Particle Background ─── */
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const count = 60;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ─── Load & Initialize ─── */
  try {
    initParticles();

    // Load data
    const loaderText = document.querySelector('.loader-text');
    if (loaderText) loaderText.textContent = 'Loading 1,000 cities…';

    await NaviData.load();

    // Build graph
    if (loaderText) loaderText.textContent = 'Building adjacency list…';
    const graph = new Graph(NaviData.cities, NaviData.roads);

    console.log(`[Navi] Graph built: ${graph.nodeCount} nodes, ${graph.edgeCount} edges`);

    // Init traffic manager
    if (loaderText) loaderText.textContent = 'Initializing traffic scenarios…';
    const trafficMgr = new TrafficManager();

    // Init map visualization
    if (loaderText) loaderText.textContent = 'Rendering map…';
    const map = new MapVisualization('map-canvas', graph);

    // Init UI controller
    if (loaderText) loaderText.textContent = 'Ready!';
    const ui = new UIController(graph, map, trafficMgr);

    // Store global reference
    window.Navi = { graph, map, ui, traffic: trafficMgr, data: NaviData };

    // Hide loading overlay
    setTimeout(() => {
      document.body.classList.add('loaded');
    }, 400);

    console.log('[Navi] Dashboard ready ✓');

  } catch (err) {
    console.error('[Navi] Initialization failed:', err);
    const loaderText = document.querySelector('.loader-text');
    const loaderTitle = document.querySelector('.loader-title');
    if (loaderText) {
      loaderText.textContent = 'Failed to load. Please serve via a local HTTP server (e.g. Live Server).';
      loaderText.style.color = '#ef4444';
    }
    if (loaderTitle) {
      loaderTitle.style.background = 'linear-gradient(135deg, #ef4444, #f59e0b)';
      loaderTitle.style.webkitBackgroundClip = 'text';
    }
  }
})();
