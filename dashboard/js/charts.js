/* ==========================================================================
   Institutional Chart helpers (Chart.js wrapper, design-system themed)
   ========================================================================== */
'use strict';

const Charts = (() => {

  const PALETTE = {
    plant: '#8DA335',
    plantLight: '#c3cf83',
    animal: '#574319',
    dairy: '#a8912f',
    ink: '#1F1717',
    muted: '#6f6e63',
    grid: 'rgba(111,110,99,0.18)',
    forest: '#6b791f',
    sage: '#a8b954',
    cream: '#FEFFF8'
  };

  Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = PALETTE.muted;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.animation.duration = 500;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(14,36,28,0.92)';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '700' };

  const registry = {};

  /* create or update a chart by canvas id */
  function build(id, config) {
    const el = document.getElementById(id);
    if (!el || registry[id]) return;
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: (config.options && config.options.legend !== false) },
        tooltip: { enabled: true }
      }
    };
    const merged = { ...config, options: { ...base.options, ...(config.options || {}) } };
    const ctx = el.getContext && el.getContext('2d');
    if (!ctx) return;
    registry[id] = new Chart(ctx, merged);
  }

  function upsert(id, config) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (registry[id]) {
      registry[id].data = config.data;
      registry[id].options = config.options;
      registry[id].update();
      return registry[id];
    }
    // defer until the canvas is laid out so charts don't render blank on load
    if (el.clientWidth === 0 || el.clientHeight === 0) {
      const tryBuild = () => {
        if (registry[id]) return;
        if (el.clientWidth === 0) { requestAnimationFrame(tryBuild); return; }
        build(id, config);
      };
      requestAnimationFrame(tryBuild);
      return null;
    }
    build(id, config);
    return registry[id] || null;
  }

  function destroy(id) {
    if (registry[id]) { registry[id].destroy(); delete registry[id]; }
  }

  function fmt(n, d = 0) {
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  return { PALETTE, upsert, destroy, fmt };
})();

if (typeof window !== 'undefined') window.Charts = Charts;
