/* ==========================================================================
   Plant Futures — Institutional Plant-Forward Menu Dashboard
   Main application: state, navigation, views, interactions, charts.
   Data-driven from the client's Vendor_List and emission-factors
   spreadsheets and the Implementation Roadmap.
   ========================================================================== */
'use strict';

const App = (() => {

  const STORAGE_KEY = 'plantfutures-dashboard-v2';

  /* ---------------- state ---------------- */
  function defaultState() {
    const current = {};
    DATA.VENDORS.forEach(v => { current[v.id] = (v.vegShare != null ? v.vegShare : 0); });
    let roadmap = {};
    DATA.ROADMAP.phases.forEach(p => {
      roadmap[p.id] = {};
      p.kpis.forEach(k => { roadmap[p.id][k.id] = 0; });
    });
    return {
      current,
      baselineEmissions: '',
      currentEmissions: '',
      roadmap
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const d = defaultState();
      const merged = { ...d, ...saved };
      merged.current = { ...d.current, ...(saved.current || {}) };
      merged.roadmap = mergeRoadmap(d.roadmap || {}, (saved && saved.roadmap) || {});
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function mergeRoadmap(def, saved) {
    const out = {};
    Object.keys(def).forEach(pid => {
      out[pid] = { ...def[pid], ...((saved && saved[pid]) || {}) };
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

  /* ---------------- navigation ---------------- */
  const NAV = [
    ['overview', 'Overview', 'M3 12h18 M12 3v18'],
    ['vendors', 'Vendors', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
    ['roadmap', 'Roadmap', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
    ['emissions', 'Emissions', 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1'],
    ['sources', 'Data & sources', 'M4 4h11v7H4zM15 4h5v16H4v-4']
  ];

  let activeSection = 'overview';

  const renderers = {};

  function show(id) {
    activeSection = id;
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.section === id));
    const crumb = NAV.find(n => n[0] === id);
    document.getElementById('crumb-name').textContent = crumb ? crumb[1] : '';
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById('view-' + id);
    if (el) el.classList.remove('hidden');
    if (renderers[id]) renderers[id]();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const st = Calc.institutionStats(state.current);
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

    const phasePcts = DATA.ROADMAP.phases.map(p => ({
      p, pct: Calc.phaseProgress(p, state.roadmap[p.id])
    }));
    const roadmapOverall = phasePcts.length ? phasePcts.reduce((s, x) => s + x.pct, 0) / phasePcts.length : 0;
    const rCls = roadmapOverall >= 100 ? 'ok' : (roadmapOverall >= 40 ? 'warn' : '');

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
        ${kpiBox('Baseline plant-based menu share', fmtPct(st.baselineShare, 1), 'Weighted-mean vegetarian share across vendors', { color: Charts.PALETTE.forest })}
        ${kpiBox('Current measured share', fmtPct(st.currentShare, 1), 'Editable per vendor in the Vendors view', { color: Charts.PALETTE.plant })}
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
            The ${DATA.GOALS.targetYear} emissions baseline will be measured in <strong>Phase 1</strong> of the roadmap;
            until then the emissions progress bar uses the baseline/current values you enter on the Emissions view.
          </div>
        </div>
        <div class="card">
          <h3>Roadmap at a glance</h3>
          <div class="card-sub">Three phases to reach the 2030 goals</div>
          ${phasePcts.map(({ p, pct }) => {
            const s = statusFromPct(pct);
            return `<div class="goal-block">
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
          <h3>Reporting cadence to ${DATA.GOALS.targetYear}</h3>
          <div class="card-sub">Check-ins against roadmap KPIs</div>
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

    /* charts */
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
            : (f.pillar === 'Coffee shops (milk)' ? Charts.PALETTE.amber
              : (f.total >= 6 ? Charts.PALETTE.animal : (f.category === 'Plant proteins & substitutes' ? Charts.PALETTE.plant : Charts.PALETTE.sage)))), borderRadius: 6 }]
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

  function timelineHTML() {
    const items = [];
    const stops = [
      [DATA.GOALS.baselineYear, 'baseline'],
      [2027, 'Phase 1'],
      [2028, 'Phase 2'],
      [2029, 'Phase 3'],
      [DATA.GOALS.targetYear, '2030 goal']
    ];
    const yearNow = new Date().getFullYear();
    stops.forEach(([y, d]) => {
      const done = y < yearNow, active = y === yearNow;
      items.push(`<div class="tl-item ${done ? 'done' : ''} ${active ? 'active' : ''}">
        <div class="tl-dot"></div><div class="tl-t">${y}</div>
        <div class="tl-d">${done ? (y <= DATA.GOALS.baselineYear ? 'baseline' : 'phase') : (active ? 'now' : d)}</div>
      </div>`);
    });
    return `<div class="timeline">${items.join('')}</div>`;
  }

  /* ================================================================
     VENDORS
     ================================================================ */
  renderers.vendors = function renderVendors() {
    const el = document.getElementById('view-vendors');
    const optsTarget = Calc.optionsTargetShare(Calc.institutionStats(state.current).baselineShare);

    const groups = {};
    DATA.VENDORS.forEach(v => { (groups[v.group] = groups[v.group] || []).push(v); });

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Vendors</h2>
          <div class="sub">${DATA.VENDORS.length} vendors from the client vendor list \u00b7 business names removed \u00b7 update "measured now" as you record data</div>
        </div>
        <div class="spacer"></div>
        <div class="meta">portfolio target: ${fmtPct(optsTarget, 1)} plant-based by ${DATA.GOALS.targetYear}</div>
      </div>
      <div class="callout info">
        <strong>How to read this.</strong> Each card shows the vendor\u2019s <em>baseline</em> vegetarian/vegan menu share
        (from Vendor_List.xlsx). The <em>measured now</em> field is editable and feeds the institution\u2019s goal progress —
        update it as you record menu audits or POS data.
      </div>
      ${Object.entries(groups).map(([g, vs]) => `
        <div class="mt2">
          <div class="flex-between" style="margin-bottom:10px">
            <h3 style="font-size:18px">${groupMeta(g).emoji} ${esc(g)}</h3>
            <span class="pill forest">${vs.length} vendor${vs.length > 1 ? 's' : ''}</span>
          </div>
          <div class="vendor-cards">${vs.map(v => vendorCardHTML(v)).join('')}</div>
        </div>
      `).join('')}

      <div class="mt2 card">
        <h3>Full vendor list</h3>
        <div class="table-wrap mt1">
          <table class="tbl">
            <thead><tr><th>#</th><th>Cuisine</th><th>Establishment type</th><th class="num">Opened</th><th class="num">Veg share</th><th class="num">Vegan share</th><th>Popular menu items</th><th>Hours</th></tr></thead>
            <tbody>
              ${DATA.VENDORS.map(v => `<tr>
                <td><strong>${v.id.replace('v', '')}</strong></td>
                <td>${esc(v.cuisine)}${v.track === 'coffee' ? ' <span class="pill gray">coffee shop</span>' : ''}</td>
                <td>${esc(v.type)}</td>
                <td class="num">${esc(v.opened)}</td>
                <td class="num">${v.vegShare != null ? fmt(v.vegShare, 0) + '%' : '\u2014'}</td>
                <td class="num">${v.veganShare != null ? fmt(v.veganShare, 0) + '%' : '\u2014'}</td>
                <td class="small">${esc(v.popular)}</td>
                <td class="small muted">${esc(v.hours)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    DATA.VENDORS.forEach(v => {
      const inp = document.getElementById('vn-' + v.id);
      if (inp) inp.addEventListener('input', () => {
        const val = Number(inp.value);
        state.current[v.id] = val >= 0 && val <= 100 ? val : 0;
        persist();
        updateVendorMeasured(v.id);
      });
    });
  };

  function vendorCardHTML(v) {
    const cur = state.current[v.id] != null ? state.current[v.id] : v.vegShare;
    return `
      <div class="vendor" id="vendor-${v.id}">
        <div class="v-head">
          <div class="v-emoji">${groupMeta(v.group).emoji}</div>
          <div style="flex:1">
            <div class="v-name">${esc(v.label)}</div>
            <div class="v-cat">${esc(v.cuisine)}${v.track === 'coffee' ? ' \u00b7 coffee shop' : ''} \u00b7 opened ${esc(v.opened)}</div>
          </div>
          <span class="pill gray">${esc(v.type.split('/')[0].trim())}</span>
        </div>
        <div class="v-stat">
          <div class="st"><div class="l">Veg menu baseline</div><div class="v">${v.vegShare != null ? fmt(v.vegShare, 0) + '%' : '\u2014'}</div></div>
          <div class="st"><div class="l">Vegan menu baseline</div><div class="v">${v.veganShare != null ? fmt(v.veganShare, 0) + '%' : '\u2014'}</div></div>
          <div class="st"><div class="l">Measured now</div><div class="v" id="vn-val-${v.id}">${fmt(cur, 0)}%</div></div>
          <div class="st"><div class="l">Hours</div><div class="v" style="font-size:12px">${esc(v.hours)}</div></div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.5">
          <div><strong>Popular:</strong> ${esc(v.popular)}</div>
          ${v.commitments ? `<div style="margin-top:3px"><strong>Efforts:</strong> ${esc(v.commitments)}</div>` : ''}
        </div>
        <div class="control-row" style="padding:6px 0 0">
          <label style="flex:0 0 130px">Measured plant share</label>
          <input type="number" id="vn-${v.id}" min="0" max="100" step="1" value="${cur}">
          <span class="ctl-val">%</span>
        </div>
        <div class="grid cols-2" style="font-size:11.5px;color:var(--muted);gap:8px;margin-top:2px">
          <div><strong style="color:var(--forest-700)">Vegetarian options:</strong> ${esc(truncate(v.vegOptions, 90))}</div>
          <div><strong style="color:var(--forest-700)">Vegan options:</strong> ${esc(truncate(v.veganOptions, 90))}</div>
        </div>
        ${v.notes ? `<div class="card-foot" style="margin-top:6px">${esc(v.notes)}</div>` : ''}
      </div>`;
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '\u2026' : s; }

  function updateVendorMeasured(id) {
    const val = state.current[id];
    const el = document.getElementById('vn-val-' + id);
    if (el) el.textContent = fmt(val, 0) + '%';
  }

  /* ================================================================
     ROADMAP (new)
     ================================================================ */
  renderers.roadmap = function renderRoadmap() {
    const el = document.getElementById('view-roadmap');
    const R = DATA.ROADMAP;
    const overall = R.phases.reduce((s, p) => s + Calc.phaseProgress(p, state.roadmap[p.id]), 0) / R.phases.length;

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Implementation roadmap</h2>
          <div class="sub">${esc(R.timeline.window)} \u00b7 edit KPI values to visualize progress along the plan</div>
        </div>
        <div class="spacer"></div>
        <div class="meta">overall: ${fmt(overall, 0)}%</div>
      </div>

      <div class="card">
        <div class="flex-between" style="margin-bottom:8px">
          <h3>Roadmap timeline</h3>
          <span class="badge-util">${new Date().getFullYear()} \u2192 ${DATA.GOALS.targetYear}</span>
        </div>
        ${timelineHTML()}
      </div>

      ${R.phases.map(phaseHTML).join('')}

      <div class="mt2">
        <h3>Cross-cutting KPI groups</h3>
        <div class="sub" style="color:var(--muted);font-size:13px;margin:2px 0 12px">Tracked against baselines to be established in Phase 1 (see "Baselines, targets &amp; reporting" below).</div>
        <div class="grid cols-2">${R.kpiGroups.map(g => kpiGroupHTML(g)).join('')}</div>
      </div>

      <div class="card mt2">
        <h3>Baselines, targets &amp; reporting</h3>
        <div style="line-height:1.7;font-size:13.5px;color:var(--ink-soft);margin-top:6px">
          <p style="margin:0 0 8px"><strong>Baseline menu share</strong> is already available per vendor and institution-wide
          (${fmtPct(Calc.institutionStats(state.current).baselineShare, 1)} on average, from the vendor list). Vendor-specific
          baselines for <strong>plant-based milk use, emissions, and unsold food</strong> are <strong>not yet available</strong> —
          they will be established in Phase 1, and vendor-specific targets set against them.</p>
          <p style="margin:0 0 8px"><strong>Reporting:</strong> ${esc(R.reporting.cadence)}</p>
          <p style="margin:0"><strong>Definitions:</strong> ${esc(R.reporting.definitions)}</p>
        </div>
      </div>
    `;

    /* wire phase KPI inputs */
    DATA.ROADMAP.phases.forEach(p => {
      p.kpis.forEach(k => {
        const inp = document.getElementById('kpi-' + p.id + '-' + k.id);
        if (inp) inp.addEventListener('input', () => {
          state.roadmap[p.id][k.id] = Number(inp.value) || 0;
          persist();
          updatePhaseKpi(p.id, k.id);
          updateRoadmapOverall();
        });
      });
    });
  };

  function phaseHTML(p) {
    const values = state.roadmap[p.id] || {};
    const pct = Calc.phaseProgress(p, values);
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
        <div class="roadmap-kpi">
          <div class="rk-head">
            <span style="flex:1">KPI</span>
            <span style="width:70px">Metric</span>
            <span style="width:90px">Target</span>
            <span style="width:110px">Now</span>
            <span style="flex:0 0 160px">Progress</span>
          </div>
          ${p.kpis.map(k => kpiRowHTML(p, k, values)).join('')}
        </div>
      </div>`;
  }

  function kpiRowHTML(p, k, values) {
    const cur = values[k.id] != null ? values[k.id] : 0;
    const prog = Calc.kpiProgress(k, cur);
    const t = k.target;
    const barOrNA = prog == null
      ? `<span class="muted small">no fixed target \u2014 \u2212</span>`
      : `<div class="bar-inline"><div class="track"><span class="${prog >= 100 ? 'ok' : (prog >= 40 ? 'warn' : '')}" style="width:${prog}%"></span></div>
         <span class="muted small">${fmt(prog, 0)}%</span></div>`;
    return `
      <div class="rk-row">
        <span style="flex:1">${esc(k.label)}</span>
        <span style="width:70px" class="muted small">${esc(k.metric)}</span>
        <span style="width:90px" class="mono">${t != null ? t : 'TBD \u2014 count KPI'}</span>
        <span style="width:110px">
          <input type="number" id="kpi-${p.id}-${k.id}" min="0" step="1" value="${cur}">
        </span>
        <span style="flex:0 0 160px">${barOrNA}</span>
      </div>`;
  }

  function updateRoadmapOverall() {
    const overall = DATA.ROADMAP.phases.reduce((s, p) => s + Calc.phaseProgress(p, state.roadmap[p.id]), 0) / DATA.ROADMAP.phases.length;
    const meta = document.querySelector('#view-roadmap .section-head .meta');
    if (meta) meta.textContent = 'overall: ' + fmt(overall, 0) + '%';
  }

  function updatePhaseKpi(pid, kpid) {
    const p = DATA.ROADMAP.phases.find(x => x.id === pid);
    if (!p) return;
    const pct = Calc.phaseProgress(p, state.roadmap[pid]);
    const head = document.querySelector('#phase-' + pid + ' .pill');
    if (head) {
      const s = statusFromPct(pct);
      head.className = 'pill ' + s.cls;
      head.textContent = s.label;
    }
    const meta = document.querySelector('#phase-' + pid + ' .meta');
    if (meta) meta.textContent = fmt(pct, 0) + '% complete';
    const bar = document.querySelector('#phase-' + pid + ' > .progress > span');
    if (bar) {
      bar.className = pct >= 100 ? 'ok' : (pct >= 40 ? 'warn' : '');
      bar.style.width = pct + '%';
    }
  }

  function kpiGroupHTML(g) {
    return `<div class="card">
      <h3 style="font-size:16px">${g.emoji} ${esc(g.name)}</h3>
      <div class="card-sub">${esc(g.desc)}</div>
      <ul style="padding-left:18px;margin:6px 0 0;line-height:1.8;font-size:13px;color:var(--ink-soft)">
        ${g.kpis.map(k => `<li><strong>${esc(k.label)}</strong> <span class="pill gray" style="margin-left:6px">${esc(k.metric)}</span></li>`).join('')}
      </ul>
    </div>`;
  }

  /* ================================================================
     EMISSIONS
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

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Food-related emissions</h2>
          <div class="sub">North America emission factors (WRI Coolfood) \u00b7 headline metric: supply-chain total (kg CO\u2082e / kg food purchased)</div>
        </div>
      </div>

      <div class="grid cols-3">
        <div class="card">
          <h3>Baseline &amp; target ${DATA.GOALS.targetYear} emissions</h3>
          <div class="card-sub">Enter the measured baseline and current annual emissions (kg CO\u2082e) to track the −${DATA.GOALS.emissions.targetPct}% goal</div>
          <div class="control-row">
            <label style="flex:0 0 150px">Baseline year (${DATA.GOALS.baselineYear}) CO\u2082e</label>
            <input type="number" id="em-baseline" min="0" step="any" placeholder="kg CO\u2082e / yr — measured Phase 1">
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
              ${DATA.EMISSION_FACTORS.sort((a, b) => b.total - a.total).map(f => `<tr>
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

  /* ================================================================
     DATA & SOURCES
     ================================================================ */
  renderers.sources = function renderSources() {
    const el = document.getElementById('view-sources');
    const foods = [...DATA.EMISSION_FACTORS].sort((a, b) => b.total - a.total);

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Data &amp; sources</h2>
          <div class="sub">Everything in the dashboard, with provenance and caveats</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <h3>Emissions factors (kg CO\u2082e / kg — supply-chain total)</h3>
          <div class="chart-box chart-md"><canvas id="src-ghg"></canvas></div>
        </div>
        <div class="card">
          <h3>Methodology &amp; caveats</h3>
          <ol style="padding-left:18px;margin:0;line-height:1.7;font-size:13px;color:var(--ink-soft)">
            <li><strong>Vendor baseline</strong> — mean vegetarian menu share across ${DATA.VENDORS.length} vendors, unweighted by volume (no sales data yet). Replace with weighted menu/volume audits when available.</li>
            <li><strong>Emission factors</strong> — Coolfood Pledge Calculator (North America), headline column = supply-chain total (on-farm + off-farm). sLUC and carbon opportunity cost excluded per the source workbook.</li>
            <li><strong>2030 emissions baseline</strong> — to be established in Phase 1; the Emissions view accepts measured kg CO\u2082e for tracking.</li>
            <li><strong>Goal math</strong> — options goal: +${DATA.GOALS.options.targetPct}% relative to baseline menu share; emissions goal: −${DATA.GOALS.emissions.targetPct}% vs baseline-year.</li>
            <li><strong>Roadmap</strong> — phases and KPIs from the Implementation Roadmap PDF; progress values are user-entered.</li>
          </ol>
        </div>
      </div>

      <div class="card mt2">
        <h3>All emission factors</h3>
        <div class="table-wrap mt1">
          <table class="tbl">
            <thead><tr><th>Food</th><th>Category</th><th class="num">On-farm</th><th class="num">Off-farm</th><th class="num">Supply-chain total</th><th class="num">sLUC</th><th class="num">Total + sLUC</th></tr></thead>
            <tbody>
              ${foods.map(f => `<tr>
                <td>${esc(f.food)}</td>
                <td>${esc(f.category)}</td>
                <td class="num">${fmt(f.onFarm, 2)}</td>
                <td class="num">${fmt(f.offFarm, 2)}</td>
                <td class="num" style="font-weight:700">${fmt(f.total, 2)}</td>
                <td class="num">${fmt(f.sluc, 4)}</td>
                <td class="num">${fmt(f.totalSluc, 2)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt2">
        <h3>References</h3>
        ${DATA.SOURCES.map(s => `
          <div class="source">
            <div class="s-title">${esc(s.title)}</div>
            <div class="s-meta">${esc(s.meta)}</div>
            ${s.url ? `<div class="mt1"><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>` : ''}
          </div>`).join('')}
      </div>
    `;

    Charts.upsert('src-ghg', {
      type: 'bar',
      data: { labels: foods.map(f => f.food), datasets: [{ data: foods.map(f => f.total),
        backgroundColor: foods.map(f => f.category === 'Milk' ? Charts.PALETTE.dairy
          : (f.category === 'Meat, seafood, dairy & eggs' ? Charts.PALETTE.animal
            : (f.category === 'Plant proteins & substitutes' ? Charts.PALETTE.plant : Charts.PALETTE.sage))), borderRadius: 6 }] },
      options: { indexAxis: 'y', scales: { x: { grid: { color: Charts.PALETTE.grid }, title: { display: true, text: 'kg CO\u2082e per kg food' } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } } }
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

  return { init, go, show, state, persist };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);