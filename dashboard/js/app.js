/* ==========================================================================
   Plant Futures — Institutional Plant-Forward Menu Dashboard
   Main application: state, navigation, views, interactions, charts.
   Data-driven from the client's vendor spreadsheet and emission factors and
   the Implementation Roadmap.
   ========================================================================== */
'use strict';

const App = (() => {

  const STORAGE_KEY = 'plantfutures-dashboard-v3';

  /* ---------------- state ---------------- */
  function defaultState() {
    const measured = {};
    DATA.VENDORS.forEach(v => { measured[v.id] = (v.vegShare != null ? v.vegShare : 0); });
    const kpi = {};
    DATA.ROADMAP.phases.forEach(p => {
      kpi[p.id] = {};
      p.kpis.forEach(k => { kpi[p.id][k.id] = { now: 0, target: (k.target != null ? k.target : '') }; });
    });
    DATA.ROADMAP.kpiGroups.forEach(g => {
      kpi[g.id] = {};
      g.kpis.forEach(k => { kpi[g.id][k.id] = { now: 0, target: (k.target != null ? k.target : '') }; });
    });
    return {
      measured,
      baselineEmissions: '',
      currentEmissions: '',
      kpi
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const d = defaultState();
      const merged = { ...d, ...saved };
      merged.measured = { ...d.measured, ...(saved.measured || {}) };
      merged.kpi = mergeKpi(d.kpi || {}, (saved.kpi || {}));
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function mergeKpi(def, saved) {
    const out = {};
    Object.keys(def).forEach(parent => {
      out[parent] = {};
      Object.keys(def[parent]).forEach(kid => {
        const s = saved[parent] && saved[parent][kid];
        const d = def[parent][kid];
        const target = (s && s.target != null && s.target !== '') ? s.target : d.target;
        out[parent][kid] = { now: (s && s.now != null) ? s.now : d.now, target };
      });
    });
    return out;
  }

  let state = loadState();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------------- helpers ---------------- */
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = (n, d = 0) => fmt(n, d) + '%';
  const fmtT = kg => (kg / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' t';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const groupMeta = g => DATA.GROUP_META[g] || DATA.GROUP_META['Other'];

  function statusFromPct(pct) {
    return pct >= 100 ? { cls: 'green', label: 'Complete' }
      : (pct >= 40 ? { cls: 'amber', label: 'In progress' } : { cls: 'gray', label: 'Not yet started' });
  }

  const kpiParent = (id, kid) => (state.kpi[id] && state.kpi[id][kid]) || { now: 0, target: '' };
  const kpiResolve = (parentId, k) => kpiParent(parentId, k.id);

  /* ---------------- navigation ---------------- */
  const NAV = [
    ['overview', 'Overview', 'M3 12h18 M12 3v18'],
    ['vendors', 'Vendors', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    ['roadmap', 'Roadmap', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
    ['emissions', 'Emissions & data', 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1']
  ];

  let activeSection = 'overview';
  const renderers = {};

  function show(id) {
    activeSection = id;
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.section === id));
    const crumb = NAV.find(n => n[0] === id);
    document.getElementById('crumb-name').textContent = crumb ? crumb[1] : '';
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById(id === 'sources' ? 'view-emissions' : 'view-' + id);
    if (!el) { document.getElementById('view-' + NAV[0][0]).classList.remove('hidden'); renderers[NAV[0][0]](); return; }
    el.classList.remove('hidden');
    const rid = id === 'sources' ? 'emissions' : id;
    if (renderers[rid]) renderers[rid]();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToAnchor(sel) {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function gotoHash(target) {
    if (document.getElementById('view-roadmap').classList.contains('hidden')) {
      show('roadmap');
      setTimeout(() => scrollToAnchor(target), 120);
    } else {
      scrollToAnchor(target);
    }
  }

  /* clickable timeline helpers */
  function bindAnchors() {
    document.querySelectorAll('[data-jump]').forEach(el => el.addEventListener('click', () => gotoHash(el.getAttribute('data-jump'))));
  }

  /* ---------------- generic builders ---------------- */
  function goalBlock(label, current, target, pct, cls) {
    return `<div class="goal-block">
      <div class="goal-meta">
        <div class="t">${label}</div>
        <div class="v">${current} \u2192 target ${target} by ${DATA.GOALS.targetYear}</div>
      </div>
      <div class="goal-track">
        <div class="progress"><span class="${cls}" style="width:${pct}%"></span></div>
      </div>
      <div class="goal-pct">${fmt(pct, 1)}%</div>
    </div>`;
  }

  function kpiBox(label, value, note, opts) {
    const color = opts && opts.color ? `style="color:${opts.color}"` : '';
    return `<div class="card kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" ${color}>${value}</div>
      <div class="kpi-note">${note}</div>
    </div>`;
  }

  /* ================================================================
     OVERVIEW
     ================================================================ */
  renderers.overview = function renderOverview() {
    const st = Calc.institutionStats(state.measured);
    const optsTarget = Calc.optionsTargetShare(st.baselineShare);
    const oPct = Calc.optionsProgress(st.currentShare, st.baselineShare);
    const oCls = oPct >= 100 ? 'ok' : (oPct >= 40 ? 'warn' : '');

    const stateEmiss = state.baselineEmissions !== '' ? Number(state.baselineEmissions) : 0;
    const currEmiss = state.currentEmissions !== '' ? Number(state.currentEmissions) : 0;
    const hasEmiss = stateEmiss > 0;
    const ghgTarget = hasEmiss ? Calc.emissionsTarget(stateEmiss) : null;
    const ePct = hasEmiss ? Calc.emissionsProgress(currEmiss, stateEmiss) : 0;
    const eCls = ePct >= 100 ? 'ok' : (ePct >= 40 ? 'warn' : '');

    const topFoods = [...DATA.EMISSION_FACTORS].sort((a, b) => b.total - a.total).slice(0, 6);

    const phasePcts = DATA.ROADMAP.phases.map(p => ({ p, pct: Calc.avgPct(p.kpis, k => kpiResolve(p.id, k)) }));
    const roadmapOverall = phasePcts.length ? phasePcts.reduce((s, x) => s + x.pct, 0) / phasePcts.length : 0;

    const el = document.getElementById('view-overview');
    el.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Plant Futures \u00b7 Institutional dashboard</div>
        <h1>Plant-forward food service — 2030 goals &amp; implementation roadmap</h1>
        <p>A working dashboard built on the institution\u2019s real vendor menu data, North America emission factors,
        and the implementation roadmap. Baselines to be confirmed and measured in Phase&nbsp;1 of the roadmap.</p>
        <div class="chips">
          <span class="chip">${DATA.VENDORS.length} vendors</span>
          <span class="chip">${fmtPct(st.baselineShare, 1)} baseline plant-based menu share</span>
          <span class="chip">${fmtPct(st.veganBaseline, 1)} baseline vegan menu share</span>
          <span class="chip">Target ${fmtPct(optsTarget, 1)} by ${DATA.GOALS.targetYear}</span>
          <span class="chip">${DATA.EMISSION_FACTORS.length} food emission factors (North America)</span>
        </div>
      </section>

      <div class="grid cols-4">
        ${kpiBox('Baseline plant-based menu share', fmtPct(st.baselineShare, 1), 'Mean vegetarian share across vendors', { color: Charts.PALETTE.forest })}
        ${kpiBox('Current recorded share', fmtPct(st.currentShare, 1), 'Editable per vendor in the Vendors view', { color: Charts.PALETTE.plant })}
        ${kpiBox('2030 options target', fmtPct(optsTarget, 1), '+30% plant-based options vs baseline', { color: Charts.PALETTE.forest })}
        ${kpiBox('Roadmap overall progress', fmtPct(roadmapOverall, 0), 'Avg across the three roadmap phases', {})}
      </div>

      <div class="grid cols-3-2 mt2">
        <div class="card">
          <h3>Progress toward ${DATA.GOALS.targetYear} goals</h3>
          <div class="card-sub">Baseline year ${DATA.GOALS.baselineYear} \u00b7 cadence: ${DATA.GOALS.cadence}</div>
          ${goalBlock(DATA.GOALS.options.short, fmtPct(st.currentShare, 1) + ' men\u00fc share', fmtPct(optsTarget, 1), oPct, oCls)}
          ${goalBlock(DATA.GOALS.emissions.short, hasEmiss ? fmtT(currEmiss) + ' CO\u2082e' : 'baseline TBD (Phase 1)', hasEmiss ? fmtT(ghgTarget) : '\u2014', ePct, eCls)}
          <div class="callout ok" style="margin:12px 0 0">
            <strong>Where we are.</strong> The institution\u2019s baseline plant-based menu share is
            <strong>${fmtPct(st.baselineShare, 1)}</strong> (mean of ${DATA.VENDORS.length} vendors; vegan-only subset
            ${fmtPct(st.veganBaseline, 1)}%). The 2030 goal is a <strong>+30%</strong> increase in plant-based options.
            The ${DATA.GOALS.targetYear} emissions baseline will be measured in <strong>Phase 1</strong> of the roadmap.
          </div>
        </div>
        <div class="card">
          <h3>Roadmap at a glance</h3>
          <div class="card-sub">Three phases to reach the 2030 goals</div>
          ${phasePcts.map(({ p, pct }) => {
            const s = statusFromPct(pct);
            return `<div class="goal-block" data-jump="#phase-${p.id}" style="cursor:pointer" title="Jump to phase">
              <div class="goal-meta">
                <div class="t">${esc(p.name)}</div>
                <div class="v">${esc(p.window)}</div>
              </div>
              <div class="goal-track">
                <div class="progress"><span class="${pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : '')}" style="width:${pct}%"></span></div>
              </div>
              <div class="goal-pct"><span class="pill ${s.cls}">${s.label}</span></div>
            </div>`;
          }).join('')}
          <div class="mt1">
            <button class="btn primary" onclick="App.go('roadmap')">Open roadmap \u2192</button>
            <button class="btn" onclick="App.go('vendors')">Vendor data \u2192</button>
          </div>
        </div>
      </div>

      <div class="grid cols-2 mt2">
        <div class="card">
          <h3>Plant-based menu share by establishment type</h3>
          <div class="card-sub">Baseline % from the vendor list</div>
          <div class="chart-box chart-md"><canvas id="ov-groups"></canvas></div>
        </div>
        <div class="card">
          <h3>Highest-impact foods — supply-chain kg CO\u2082e / kg</h3>
          <div class="card-sub">North America Coolfood emission factors</div>
          <div class="chart-box chart-md"><canvas id="ov-foods"></canvas></div>
        </div>
      </div>

      <div class="grid cols-2 mt2">
        <div class="card">
          <h3>Reporting timeline to ${DATA.GOALS.targetYear}</h3>
          <div class="card-sub">Click a dot to jump to that phase</div>
          <div class="mt2">${timelineHTML()}</div>
        </div>
        <div class="card">
          <h3>Coming next</h3>
          <ul style="padding-left:18px;margin:0;line-height:1.9;font-size:13.5px;color:var(--ink-soft)">
            <li><strong>Phase 1:</strong> review contracts, name sustainability leads, set targets, distribute reporting SOPs.</li>
            <li><strong>Phase 1:</strong> measure baselines (plant-based milk use, sales share, emissions, unsold food).</li>
            <li><strong>Phase 2:</strong> plant-based milk default pilot at coffee shops; restaurant training &amp; dish testing.</li>
            <li><strong>Phase 3:</strong> coordinated menu rollout and campaign promotion through EOY 2029.</li>
          </ul>
          <div class="callout tip mt1"><strong>What this dashboard tracks:</strong> the roadmap\u2019s phase KPIs, plant-based milk KPIs, menu KPIs, emissions, food-waste KPIs, and customer/employee experience.</div>
        </div>
      </div>
    `;

    bindAnchors();

    const groupStats = {};
    DATA.VENDORS.forEach(v => {
      groupStats[v.group] = groupStats[v.group] || { sum: 0, n: 0 };
      groupStats[v.group].sum += (v.vegShare != null ? v.vegShare : 0);
      groupStats[v.group].n += 1;
    });
    const gRows = Object.entries(groupStats)
      .map(([g, s]) => ({ g, share: s.sum / s.n, n: s.n }))
      .sort((a, b) => b.share - a.share);
    Charts.upsert('ov-groups', {
      type: 'bar',
      data: {
        labels: gRows.map(r => groupMeta(r.g).emoji + ' ' + r.g),
        datasets: [{ data: gRows.map(r => +r.share.toFixed(1)),
          backgroundColor: gRows.map(r => groupMeta(r.g).color), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', scales: {
          x: { title: { display: true, text: '% plant-based menu items' }, min: 0, max: 100, grid: { color: Charts.PALETTE.grid } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw, 1) + '% (n=' + gRows[c.dataIndex].n + ')' } } }
      }
    });

    Charts.upsert('ov-foods', {
      type: 'bar',
      data: {
        labels: topFoods.map(f => f.food),
        datasets: [{ data: topFoods.map(f => f.total),
          backgroundColor: topFoods.map(f => f.category === 'Milk' ? Charts.PALETTE.dairy
            : (f.total >= 6 ? Charts.PALETTE.animal
              : (f.category === 'Plant proteins & substitutes' ? Charts.PALETTE.plant : Charts.PALETTE.sage))), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', scales: {
          x: { title: { display: true, text: 'kg CO\u2082e per kg food' }, grid: { color: Charts.PALETTE.grid } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw, 2) + ' kg CO\u2082e/kg' } } }
      }
    });
  };

  /* clickable countdown timeline: 2026..2030, moves with current year, jumps on click */
  function timelineHTML() {
    const yearNow = new Date().getFullYear();
    const stops = [
      [DATA.GOALS.baselineYear, 'baseline', '#rm-top'],
      [2027, 'Phase 1', '#phase-phase1'],
      [2028, 'Phase 2', '#phase-phase2'],
      [2029, 'Phase 3', '#phase-phase3'],
      [DATA.GOALS.targetYear, '2030 goal', '#em-top']
    ];
    const items = stops.map(([y, d, target]) => {
      const done = y < yearNow, active = y === yearNow;
      return `<div class="tl-item ${done ? 'done' : ''} ${active ? 'active' : ''}" data-jump="${target}" title="Jump to ${d} (${y})" style="cursor:pointer">
        <div class="tl-dot"></div><div class="tl-t">${y}</div>
        <div class="tl-d">${done ? 'passed' : (active ? 'now \u00b7 ' + d : d)}</div>
      </div>`;
    });
    return `<div class="timeline">${items.join('')}</div>`;
  }

  /* ================================================================
     VENDORS
     ================================================================ */
  const vendorUI = { group: 'all', sort: 'veg', options: 'none' };

  renderers.vendors = function renderVendors() {
    const el = document.getElementById('view-vendors');
    const optsTarget = Calc.optionsTargetShare(Calc.institutionStats(state.measured).baselineShare);
    const groups = [...new Set(DATA.VENDORS.map(v => v.group))].sort();

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Vendors</h2>
          <div class="sub">${DATA.VENDORS.length} vendors \u00b7 business names removed \u00b7 filter, sort &amp; record progress</div>
        </div>
        <div class="spacer"></div>
        <div class="meta">portfolio target: ${fmtPct(optsTarget, 1)} plant-based by ${DATA.GOALS.targetYear}</div>
      </div>

      <div class="card vendor-controls">
        <div class="grid cols-3">
          <div class="control-field">
            <label>Service type</label>
            <select id="vf-group">
              <option value="all">All service types</option>
              ${groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
            </select>
          </div>
          <div class="control-field">
            <label>Sort / rank</label>
            <select id="vf-sort">
              <option value="veg">Plant-based share (high \u2192 low)</option>
              <option value="vegan">Vegan share (high \u2192 low)</option>
              <option value="title">Service type (A\u2192Z)</option>
            </select>
          </div>
          <div class="control-field">
            <label>Menu options shown</label>
            <select id="vf-options">
              <option value="none">None (compact)</option>
              <option value="veg">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
        <div class="badge-util" id="vf-count" style="margin-top:10px"></div>
      </div>

      <div id="vendor-list"></div>
    `;

    const groupSel = document.getElementById('vf-group');
    const sortSel = document.getElementById('vf-sort');
    const optSel = document.getElementById('vf-options');
    groupSel.value = vendorUI.group; sortSel.value = vendorUI.sort; optSel.value = vendorUI.options;

    groupSel.addEventListener('change', () => { vendorUI.group = groupSel.value; renderVendorList(); });
    sortSel.addEventListener('change', () => { vendorUI.sort = sortSel.value; renderVendorList(); });
    optSel.addEventListener('change', () => { vendorUI.options = optSel.value; renderVendorList(); });

    renderVendorList();
  };

  function filteredVendors() {
    let vs = DATA.VENDORS.filter(v => vendorUI.group === 'all' || v.group === vendorUI.group);
    if (vendorUI.sort === 'veg') vs = vs.slice().sort((a, b) => (b.vegShare || 0) - (a.vegShare || 0));
    else if (vendorUI.sort === 'vegan') vs = vs.slice().sort((a, b) => (b.veganShare || 0) - (a.veganShare || 0));
    else vs = vs.slice().sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
    return vs;
  }

  function renderVendorList() {
    const list = document.getElementById('vendor-list');
    if (!list) return;
    const vs = filteredVendors();
    const count = document.getElementById('vf-count');
    if (count) count.textContent = vs.length + ' of ' + DATA.VENDORS.length + ' vendors';
    list.innerHTML = `<div class="vendor-cards">${vs.map(v => vendorCardHTML(v)).join('')}</div>`;

    // bind measured sliders
    vs.forEach(v => {
      const slider = document.getElementById('vm-' + v.id);
      const readout = document.getElementById('vmr-' + v.id);
      if (slider) slider.addEventListener('input', () => {
        const val = Number(slider.value);
        state.measured[v.id] = val;
        persist();
        if (readout) readout.textContent = fmt(val, 0) + '%';
      });
    });
  }

  function vendorCardHTML(v) {
    const cur = state.measured[v.id] != null ? state.measured[v.id] : v.vegShare;
    const base = v.vegShare != null ? v.vegShare : 0;
    const showOpts = vendorUI.options;
    return `
      <div class="vendor" id="vendor-${v.id}">
        <div class="v-head">
          <div class="v-emoji">${groupMeta(v.group).emoji}</div>
          <div style="flex:1">
            <div class="v-name">${esc(v.label)}</div>
            <div class="v-cat">${esc(v.cuisine)}${v.track === 'coffee' ? ' \u00b7 coffee shop' : ''}</div>
          </div>
          <span class="pill gray">${esc(v.group)}</span>
        </div>
        <div class="v-stat">
          <div class="st"><div class="l">Plant-based menu baseline</div><div class="v">${fmt(base, 0)}%</div></div>
          <div class="st"><div class="l">Vegan menu baseline</div><div class="v">${v.veganShare != null ? fmt(v.veganShare, 0) + '%' : '\u2014'}</div></div>
        </div>
        <div class="control-row vendor-slider">
          <label style="flex:0 0 150px">Record current</label>
          <input type="range" id="vm-${v.id}" min="0" max="100" step="1" value="${cur}">
          <span class="ctl-val" id="vmr-${v.id}">${fmt(cur, 0)}%</span>
        </div>
        ${showOpts === 'none' ? '' : `
          <div class="grid cols-2 vendor-opts">
            ${(showOpts === 'veg' || showOpts === 'both') ? `<div><strong>Vegetarian:</strong> ${esc(v.vegOptions || '\u2014')}</div>` : ''}
            ${(showOpts === 'vegan' || showOpts === 'both') ? `<div><strong>Vegan:</strong> ${esc(v.veganOptions || '\u2014')}</div>` : ''}
          </div>`}
      </div>`;
  }

  /* ================================================================
     ROADMAP
     ================================================================ */
  renderers.roadmap = function renderRoadmap() {
    const el = document.getElementById('view-roadmap');
    const R = DATA.ROADMAP;
    const overall = R.phases.reduce((s, p) => s + Calc.avgPct(p.kpis, k => kpiResolve(p.id, k)), 0) / R.phases.length;

    el.innerHTML = `
      <div class="section-head" id="rm-top">
        <div>
          <h2>Implementation roadmap</h2>
          <div class="sub">${esc(R.timeline.window)} \u00b7 click timeline dots to jump &nbsp;\u00b7 edit KPI values to visualize progress</div>
        </div>
        <div class="spacer"></div>
        <div class="meta">overall: ${fmt(overall, 0)}%</div>
      </div>

      <div class="card">
        <div class="flex-between" style="margin-bottom:8px">
          <h3>Baselines, targets &amp; reporting</h3>
          <span class="badge-util">${new Date().getFullYear()} \u2192 ${DATA.GOALS.targetYear}</span>
        </div>
        <div style="line-height:1.7;font-size:13.5px;color:var(--ink-soft);margin-top:6px">
          <p style="margin:0 0 8px"><strong>Where progress is measured.</strong> Baseline plant-based menu share is already
          available per vendor and institution-wide (${fmtPct(Calc.institutionStats(state.measured).baselineShare, 1)} on
          average). Vendor baselines for <strong>plant-based milk use, emissions, and unsold food</strong> are not yet
          available \u2014 they will be established in Phase 1, and vendor-specific targets set against them.</p>
          <p style="margin:0 0 8px"><strong>How to use this page.</strong> Each KPI has an editable <em>now</em> value and an
          editable <em>target</em>. Enter the current count as you measure it, and the progress bar and phase completion update
          automatically. Values are saved in your browser.</p>
          <p style="margin:0 0 8px"><strong>Reporting:</strong> ${esc(R.reporting.cadence)}</p>
          <p style="margin:0"><strong>Definitions:</strong> ${esc(R.reporting.definitions)}</p>
        </div>
      </div>

      <div class="card mt2">
        <div class="flex-between" style="margin-bottom:8px">
          <h3>Roadmap timeline</h3>
          <span class="badge-util">${new Date().getFullYear()} \u2192 ${DATA.GOALS.targetYear}</span>
        </div>
        ${timelineHTML()}
      </div>

      ${R.phases.map(phaseHTML).join('')}

      <div class="mt2">
        <h3>Cross-cutting KPI groups</h3>
        <div class="sub" style="color:var(--muted);font-size:13px;margin:2px 0 12px">Interactive trackers \u2014 set <em>now</em> and <em>target</em> per KPI.</div>
        <div class="grid cols-2">${R.kpiGroups.map(g => kpiGroupHTML(g)).join('')}</div>
      </div>
    `;

    bindAnchors();
    wireAllKpiInputs();
  };

  function phaseHTML(p) {
    const pct = Calc.avgPct(p.kpis, k => kpiResolve(p.id, k));
    const s = statusFromPct(pct);
    return `
      <div class="card mt2 roadmap-phase" id="phase-${p.id}">
        <div class="flex-between" style="margin-bottom:8px">
          <div>
            <h2 style="font-size:19px">${esc(p.name)}</h2>
            <div class="sub" style="font-size:12.5px;color:var(--muted)">${esc(p.window)} \u00b7 ${esc(p.pillars)}</div>
          </div>
          <div style="text-align:right">
            <span class="pill ${s.cls}">${s.label}</span>
            <div class="meta" style="margin-top:4px">${fmt(pct, 0)}% complete</div>
          </div>
        </div>
        <div class="progress mb2"><span class="${pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : '')}" style="width:${pct}%"></span></div>
        <div class="card-sub" style="margin-bottom:10px">${esc(p.desc)}</div>
        ${kpiTableHTML(p, p.kpis)}
      </div>`;
  }

  function kpiGroupHTML(g) {
    return `<div class="card" id="group-${g.id}">
      <h3 style="font-size:16px">${g.emoji} ${esc(g.name)}</h3>
      <div class="card-sub">${esc(g.desc)}</div>
      ${kpiTableHTML(g, g.kpis, true)}
    </div>`;
  }

  function kpiTableHTML(parent, kpis, compact) {
    const pcts = kpis.map(k => Calc.kpiPct(kpiResolve(parent.id, k).now, kpiResolve(parent.id, k).target));
    const groupPct = pcts.filter(x => x != null);
    const pct = groupPct.length ? groupPct.reduce((a, b) => a + b, 0) / groupPct.length : 0;
    return `
      <div class="roadmap-kpi">
        <div class="rk-head">
          <span style="flex:1">KPI</span>
          <span style="width:70px">Metric</span>
          <span style="width:96px">Now</span>
          <span style="width:96px">Target</span>
          <span style="flex:0 0 150px">Progress</span>
        </div>
        ${kpis.map(k => kpiRowHTML(parent, k)).join('')}
        ${!compact ? '' : `<div class="rk-row rk-total"><span style="flex:1"><strong>Group progress</strong></span><span style="width:70px"></span><span style="width:96px"></span><span style="width:96px"></span><span style="flex:0 0 150px" class="kpi-prog">
          <div class="bar-inline"><div class="track"><span class="${pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : '')}" style="width:${pct}%"></span></div><span class="muted small">${groupPct.length ? fmt(pct, 0) + '%' : '\u2014'}</span></div>
        </span></div>`}
      </div>`;
  }

  function kpiRowHTML(parent, k) {
    const rec = kpiResolve(parent.id, k);
    const prog = Calc.kpiPct(rec.now, rec.target);
    const barOrNA = prog == null
      ? `<span class="muted small">set target \u2192 \u2212</span>`
      : `<div class="bar-inline"><div class="track"><span class="${prog >= 100 ? 'ok' : (prog >= 40 ? 'warn' : '')}" style="width:${prog}%"></span></div>
         <span class="muted small">${fmt(prog, 0)}%</span></div>`;
    return `
      <div class="rk-row" data-parent="${esc(parent.id)}" data-kid="${esc(k.id)}">
        <span style="flex:1">${esc(k.label)}</span>
        <span style="width:70px" class="muted small">${esc(k.metric)}</span>
        <span style="width:96px"><input type="number" class="kpi-now" min="0" step="1" value="${rec.now}"></span>
        <span style="width:96px"><input type="number" class="kpi-target" min="0" step="1" placeholder="\u2014" value="${rec.target === '' ? '' : rec.target}"></span>
        <span style="flex:0 0 150px" class="kpi-prog">${barOrNA}</span>
      </div>`;
  }

  /* update one row's progress cell + its input values from state */
  function refreshRow(row, parent) {
    const kid = row.getAttribute('data-kid');
    const rec = state.kpi[parent] && state.kpi[parent][kid];
    if (!rec) return;
    const nowInp = row.querySelector('.kpi-now');
    const tgtInp = row.querySelector('.kpi-target');
    if (nowInp && nowInp !== document.activeElement) nowInp.value = rec.now;
    if (tgtInp && tgtInp !== document.activeElement) tgtInp.value = rec.target === '' ? '' : rec.target;
    const prog = Calc.kpiPct(rec.now, rec.target);
    const box = row.querySelector('.kpi-prog');
    if (box) {
      if (prog == null) box.innerHTML = `<span class="muted small">set target \u2192 \u2212</span>`;
      else box.innerHTML = `<div class="bar-inline"><div class="track"><span class="${prog >= 100 ? 'ok' : (prog >= 40 ? 'warn' : '')}" style="width:${prog}%"></span></div>
        <span class="muted small">${fmt(prog, 0)}%</span></div>`;
    }
  }

  /* refresh one phase card (state already updated): header pill, bar, % complete, per-row cells */
  function refreshPhase(pid) {
    const p = DATA.ROADMAP.phases.find(x => x.id === pid);
    if (!p) return;
    const card = document.getElementById('phase-' + pid);
    if (!card) return;
    const pct = Calc.avgPct(p.kpis, k => kpiResolve(pid, k));
    const pill = card.querySelector('.pill');
    if (pill) { const s = statusFromPct(pct); pill.className = 'pill ' + s.cls; pill.textContent = s.label; }
    const meta = card.querySelector('.meta'); if (meta) meta.textContent = fmt(pct, 0) + '% complete';
    const bar = card.querySelector('> .progress > span'); if (bar) { bar.className = pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : ''); bar.style.width = pct + '%'; }
    card.querySelectorAll('.rk-row').forEach(row => refreshRow(row, pid));
  }

  /* refresh one KPI group card (section) */
  function refreshGroup(gid) {
    const g = DATA.ROADMAP.kpiGroups.find(x => x.id === gid);
    if (!g) return;
    const card = document.getElementById('group-' + gid);
    if (!card) return;
    const pcts = g.kpis.map(k => Calc.kpiPct(kpiResolve(gid, k).now, kpiResolve(gid, k).target)).filter(x => x != null);
    const pct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    card.querySelectorAll('.rk-row').forEach(row => refreshRow(row, gid));
    const totalRow = card.querySelector('.rk-total');
    if (totalRow) {
      const box = totalRow.querySelector('.kpi-prog');
      if (box) box.innerHTML = `<div class="bar-inline"><div class="track"><span class="${pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : '')}" style="width:${pct}%"></span></div>
        <span class="muted small">${pcts.length ? fmt(pct, 0) + '%' : '\u2014'}</span></div>`;
    }
  }

  function refreshAllPct() {
    DATA.ROADMAP.phases.forEach(p => refreshPhase(p.id));
    DATA.ROADMAP.kpiGroups.forEach(g => refreshGroup(g.id));
    const overall = DATA.ROADMAP.phases.reduce((s, p) => s + Calc.avgPct(p.kpis, k => kpiResolve(p.id, k)), 0) / DATA.ROADMAP.phases.length;
    const overallMeta = document.querySelector('#view-roadmap .section-head .meta');
    if (overallMeta) overallMeta.textContent = 'overall: ' + fmt(overall, 0) + '%';
  }

  function wireAllKpiInputs() {
    document.querySelectorAll('.kpi-now').forEach(inp => inp.addEventListener('input', () => {
      const row = inp.closest('.rk-row');
      const parent = row.getAttribute('data-parent');
      const kid = row.getAttribute('data-kid');
      state.kpi[parent][kid].now = Number(inp.value) || 0;
      persist();
      refreshRow(row, parent);
      if (document.getElementById('phase-' + parent)) refreshPhase(parent);
      else refreshGroup(parent);
      refreshOveralls();
    }));
    document.querySelectorAll('.kpi-target').forEach(inp => inp.addEventListener('input', () => {
      const row = inp.closest('.rk-row');
      const parent = row.getAttribute('data-parent');
      const kid = row.getAttribute('data-kid');
      state.kpi[parent][kid].target = inp.value === '' ? '' : Number(inp.value);
      persist();
      refreshRow(row, parent);
      if (document.getElementById('phase-' + parent)) refreshPhase(parent);
      else refreshGroup(parent);
      refreshOveralls();
    }));
  }

  function refreshOveralls() {
    const overall = DATA.ROADMAP.phases.reduce((s, p) => s + Calc.avgPct(p.kpis, k => kpiResolve(p.id, k)), 0) / DATA.ROADMAP.phases.length;
    const overallMeta = document.querySelector('#view-roadmap .section-head .meta');
    if (overallMeta) overallMeta.textContent = 'overall: ' + fmt(overall, 0) + '%';
  }

  /* ================================================================
     EMISSIONS & DATA (merged)
     ================================================================ */
  renderers.emissions = function renderEmissions() {
    const el = document.getElementById('view-emissions');
    const base = state.baselineEmissions !== '' ? Number(state.baselineEmissions) : null;
    const cur = state.currentEmissions !== '' ? Number(state.currentEmissions) : null;
    const has = base != null && base > 0;
    const target = has ? Calc.emissionsTarget(base) : null;
    const ePct = has ? Calc.emissionsProgress(cur || 0, base) : 0;

    const cats = {};
    DATA.EMISSION_FACTORS.forEach(f => { (cats[f.category] = cats[f.category] || []).push(f); });
    const milks = DATA.MILKS.slice().sort((a, b) => a.total - b.total);
    const foods = [...DATA.EMISSION_FACTORS].sort((a, b) => b.total - a.total);

    el.innerHTML = `
      <div class="section-head" id="em-top">
        <div>
          <h2>Food-related emissions &amp; data</h2>
          <div class="sub">North America emission factors (WRI Coolfood) \u00b7 headline: supply-chain total (kg CO\u2082e / kg food)</div>
        </div>
      </div>

      <div class="grid cols-3">
        <div class="card">
          <h3>Baseline &amp; target ${DATA.GOALS.targetYear} emissions</h3>
          <div class="card-sub">Enter measured baseline and current annual emissions (kg CO\u2082e) to track the −${DATA.GOALS.emissions.targetPct}% goal</div>
          <div class="control-row">
            <label style="flex:0 0 150px">Baseline year (${DATA.GOALS.baselineYear}) CO\u2082e</label>
            <input type="number" id="em-baseline" min="0" step="any" placeholder="kg CO\u2082e / yr">
            <span class="ctl-val"></span>
          </div>
          <div class="control-row">
            <label style="flex:0 0 150px">Current CO\u2082e</label>
            <input type="number" id="em-current" min="0" step="any" placeholder="kg CO\u2082e / yr">
            <span class="ctl-val"></span>
          </div>
          <div style="margin-top:10px">
            ${has ? goalBlock('Emissions vs ' + DATA.GOALS.baselineYear, fmtT(cur || 0) + ' CO\u2082e', fmtT(target) + ' CO\u2082e', ePct, ePct >= 100 ? 'ok' : (ePct >= 40 ? 'warn' : ''))
              : `<div class="callout warn" style="margin-top:0"><strong>Emissions baseline not yet established.</strong> Per the roadmap, the institution\u2019s food-emissions baseline is measured in Phase 1. Until then, use the factors below as the reference data set.</div>`}
          </div>
        </div>
        <div class="card">
          <h3>Plant-based milk — per-liter CO\u2082e</h3>
          <div class="card-sub">Coffee-shop pillar (kg CO\u2082e per kg \u2248 liter of milk)</div>
          <div class="chart-box chart-md"><canvas id="em-milks"></canvas></div>
          <div class="card-foot">Switching from dairy to the lowest-GHG plant milk cuts ~${milks[0] ? fmt((milks.find(m => m.food === 'Dairy milk') ? milks.find(m => m.food === 'Dairy milk').total : 2.17) - milks[0].total, 2) : '—'} kg CO\u2082e per liter.</div>
        </div>
        <div class="card">
          <h3>Food categories — supply-chain total</h3>
          <div class="card-sub">Mean kg CO\u2082e / kg by category group</div>
          <div class="chart-box chart-md"><canvas id="em-cats"></canvas></div>
        </div>
      </div>

      <div class="card mt2">
        <h3>All emission factors</h3>
        <div class="card-sub">Source: N_America_Emission_Factors.xlsx \u00b7 Coolfood Pledge Calculator (NA) \u00b7 sLUC reported separately, excluded from the headline metric</div>
        <div class="table-wrap mt1">
          <table class="tbl">
            <thead><tr><th>Food</th><th>Category</th><th>Pillar</th><th class="num">On-farm</th><th class="num">Off-farm</th><th class="num">Supply-chain total</th><th class="num">sLUC</th><th class="num">Total + sLUC</th></tr></thead>
            <tbody>
              ${foods.map(f => `<tr>
                <td>${esc(f.food)}</td>
                <td>${esc(f.category)}</td>
                <td>${esc(f.pillar)}</td>
                <td class="num">${fmt(f.onFarm, 2)}</td>
                <td class="num">${fmt(f.offFarm, 2)}</td>
                <td class="num" style="font-weight:700">${fmt(f.total, 2)}</td>
                <td class="num">${fmt(f.sluc, 4)}</td>
                <td class="num">${fmt(f.totalSluc, 2)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-foot">Unit: kg CO\u2082e per kg of food purchased (retail weight; meats in boneless equivalent; milks ~1 kg ≈ 1 L). Per-kg figures are regional averages by food category, not vendor- or product-specific.</div>
      </div>

      <div class="grid cols-2 mt2">
        <div class="card">
          <h3>Methodology &amp; caveats</h3>
          <ol style="padding-left:18px;margin:0;line-height:1.7;font-size:13px;color:var(--ink-soft)">
            <li><strong>Vendor baseline</strong> — mean vegetarian menu share across ${DATA.VENDORS.length} vendors, unweighted by volume (no sales data yet). Replace with weighted menu/volume audits when available.</li>
            <li><strong>Emission factors</strong> — Coolfood Pledge Calculator (North America), headline column = supply-chain total (on-farm + off-farm). sLUC and carbon opportunity cost excluded per the source workbook.</li>
            <li><strong>2030 emissions baseline</strong> — to be established in Phase 1; this view accepts measured kg CO\u2082e for tracking.</li>
            <li><strong>Goal math</strong> — options goal: +${DATA.GOALS.options.targetPct}% relative to baseline menu share; emissions goal: −${DATA.GOALS.emissions.targetPct}% vs baseline-year.</li>
            <li><strong>Roadmap</strong> — phases and KPIs from the Implementation Roadmap PDF; progress values are user-entered.</li>
          </ol>
        </div>
        <div class="card">
          <h3>References</h3>
          ${DATA.SOURCES.map(s => `
            <div class="source">
              <div class="s-title">${esc(s.title)}</div>
              <div class="s-meta">${esc(s.meta)}</div>
              ${s.url ? `<div class="mt1"><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>` : ''}
            </div>`).join('')}
        </div>
      </div>
    `;

    const bInp = document.getElementById('em-baseline');
    const cInp = document.getElementById('em-current');
    if (bInp) bInp.value = state.baselineEmissions;
    if (cInp) cInp.value = state.currentEmissions;
    if (bInp) bInp.addEventListener('input', () => { state.baselineEmissions = bInp.value; persist(); });
    if (cInp) cInp.addEventListener('input', () => { state.currentEmissions = cInp.value; persist(); });

    Charts.upsert('em-milks', {
      type: 'bar',
      data: { labels: milks.map(f => f.food), datasets: [{ data: milks.map(f => f.total),
        backgroundColor: milks.map(f => f.food === 'Dairy milk' ? Charts.PALETTE.animal : Charts.PALETTE.plant), borderRadius: 6 }] },
      options: { indexAxis: 'y', scales: { x: { title: { display: true, text: 'kg CO\u2082e per liter' }, grid: { color: Charts.PALETTE.grid } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw, 3) + ' kg CO\u2082e/L' } } } }
    });

    const cRows = Object.entries(cats).map(([c, fs]) => ({ c, mean: fs.reduce((s, f) => s + f.total, 0) / fs.length, n: fs.length })).sort((a, b) => b.mean - a.mean);
    Charts.upsert('em-cats', {
      type: 'bar',
      data: { labels: cRows.map(r => r.c), datasets: [{ data: cRows.map(r => +r.mean.toFixed(2)),
        backgroundColor: cRows.map(r => r.c === 'Milk' ? Charts.PALETTE.dairy : (r.c === 'Meat, seafood, dairy & eggs' ? Charts.PALETTE.animal : Charts.PALETTE.plant)), borderRadius: 6 }] },
      options: { scales: { y: { title: { display: true, text: 'mean kg CO\u2082e/kg' }, grid: { color: Charts.PALETTE.grid } }, x: { grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw, 2) + ' kg CO\u2082e/kg (n=' + cRows[c.dataIndex].n + ')' } } } }
    });
  };

  /* ---------------- boot ---------------- */
  function init() {
    const nav = document.getElementById('main-nav');
    nav.innerHTML = NAV.map(([id, label, path]) => `
      <a href="#${id}" data-section="${id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>
        ${label}
      </a>`).join('');
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      show(a.dataset.section);
    }));
    const brandYear = document.getElementById('brand-year');
    if (brandYear) brandYear.textContent = new Date().getFullYear();
    show('overview');
  }

  function go(id) {
    show(id);
  }

  return { init, go, show, state, persist, scrollToAnchor, gotoHash };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);