/* ==========================================================================
   Institutional Chart helpers (Chart.js wrapper, design-system themed)
   ========================================================================== */
'use strict';

const Charts = (() => {

  const PALETTE = {
    plant: '#4a6b52',
    plantLight: '#9fb2a4',
    animal: '#b97a43',
    dairy: '#a9913f',
    ink: '#20251e',
    muted: '#7a8076',
    grid: 'rgba(122,128,118,0.16)',
    forest: '#31493a',
    sage: '#7d9487',
    cream: '#f7f6f2'
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
  function upsert(id, config) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (registry[id]) {
      registry[id].data = config.data;
      registry[id].options = config.options;
      registry[id].update();
      return registry[id];
    }
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: (config.options && config.options.legend !== false) },
        tooltip: { enabled: true }
      }
    };
    const merged = { ...config, options: { ...base.options, ...(config.options || {}) } };
    const chart = new Chart(el.getContext('2d'), merged);
    registry[id] = chart;
    return chart;
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
