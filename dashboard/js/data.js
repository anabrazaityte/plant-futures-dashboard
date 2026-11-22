/* ==========================================================================
   Institutional Real data, goals & roadmap
   Vendor rows are auto-generated from the client's spreadsheet
   (dashboard/data/Client_VendorsList_PlantFutures_FY27-Updated.xlsx) in
   js/vendor-data.js; emission factors from N_America_Emission_Factors.xlsx in
   js/emission-data.js. This file adds the institution goals, KPI definitions,
   and roadmap structure from the Implementation Roadmap
   (dashboard/data/Implementation_roadmap.pdf).
   ========================================================================== */
'use strict';

const DATA = (() => {

  /* ------------------------------------------------------------------ */
  /* 1. INSTITUTION 2030 GOALS                                           */
  /* ------------------------------------------------------------------ */
  const GOALS = {
    baselineYear: 2026,
    targetYear:   2030,
    cadence:      'Monthly (Phases 1-2) then quarterly',
    options: {
      label: 'Increase plant-based options by 30% by 2030',
      short: '+30% plant-based options',
      mode: 'relative',        // +30% relative to baseline (roadmap: "against [baseline]")
      targetPct: 30            // 30% relative increase in plant-based menu options
    },
    emissions: {
      label: 'Reduce food-related emissions by 25% by 2030',
      short: '\u221225% food emissions',
      targetPct: 25            // reduce by 25% vs baseline-year emissions
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. VENDORS (real — js/vendor-data.js)                               */
  /* ------------------------------------------------------------------ */
  const VENDORS = VENDOR_ROWS.map(v => ({ ...v }));

  /* institution-wide baseline from real menu-share data (unweighted mean) */
  const BASELINE_VEG_SHARE = 100 * VENDORS.reduce((s, v) => s + (v.vegShare != null ? v.vegShare : 0), 0) / VENDORS.length;
  const BASELINE_VEGAN_SHARE = 100 * VENDORS.reduce((s, v) => s + (v.veganShare != null ? v.veganShare : 0), 0) / VENDORS.length;

  /* group metadata for display (keyed by vendor.group) */
  const GROUP_META = {
    'Cafe / coffee shops':             { emoji: '\u2615', color: '#8DA335' },
    'Juice bars':                      { emoji: '\u{1f966}', color: '#a8b954' },
    'Fast casual & grab-and-go':       { emoji: '\u{1f35c}', color: '#6b791f' },
    'Full-service dining':             { emoji: '\u{1f372}', color: '#c3cf83' },
    'Full-service dining & bars':      { emoji: '\u{1f375}', color: '#574319' },
    'Casual sit-down & bars':          { emoji: '\u{1f379}', color: '#a8912f' },
    'Other':                           { emoji: '\u{1f960}', color: '#6f6e63' }
  };

  /* ------------------------------------------------------------------ */
  /* 3. EMISSION FACTORS (real — js/emission-data.js)                    */
  /*    Headline metric per the source workbook: "Supply chain total"    */
  /* ------------------------------------------------------------------ */
  const EMISSION_FACTORS = EMISSION_ROWS.map(f => ({ ...f }));

  const MILKS = EMISSION_FACTORS.filter(f => f.category === 'Milk'); // dairy + plant milks

  /* ------------------------------------------------------------------ */
  /* 4. IMPLEMENTATION ROADMAP (from Implementation_roadmap.pdf)         */
  /*    Three phases, each with progress KPIs from the "Measurement and  */
  /*    tracking" section plus the cross-cutting KPI groups.             */
  /* ------------------------------------------------------------------ */
  const ROADMAP = {
    timeline: {
      startYear: 2027,          // implementation starts early 2027
      window: 'Early 2027 \u2192 2030 (goal reached by start of 2030)'
    },
    phases: [
      {
        id: 'phase1',
        name: 'Phase 1 \u2014 Communication & Preparation',
        window: 'Through first half of 2027',
        pillars: 'All vendors',
        desc: 'Communicate expectations, review contracts, appoint sustainability leads, and establish baselines needed to measure progress.',
        kpis: [
          { id: 'contracts',     label: 'Vendor contracts reviewed (franchise approval paths confirmed)', metric: '# vendors', target: 35 },
          { id: 'leads',         label: 'Vendors with a named sustainability lead',                      metric: '# vendors', target: 35 },
          { id: 'targets',       label: 'Vendors with targets set',                                      metric: '# vendors', target: 35 },
          { id: 'sops',          label: 'Reporting SOPs distributed & institution reporting lead named', metric: '# sets',     target: 1 }
        ]
      },
      {
        id: 'phase2',
        name: 'Phase 2 \u2014 Early Implementation / Pilot & Training',
        window: 'Second half 2027 \u2013 second half of 2028',
        pillars: 'Coffee shops (2H 2027) \u00b7 Restaurants (planning 2H 2027, training 1H 2028, recipe testing by 2H 2028)',
        desc: 'Enact the coffee-shop plant-based milk default; pilot vendors, train staff with tastings, and test new dishes in small batches.',
        kpis: [
          { id: 'pilotVendors',  label: 'Vendors participating in the pilot (by track)',                metric: '# vendors', target: 35 },
          { id: 'staff',         label: 'Staff trained',                                                 metric: '# staff',   target: null },
          { id: 'dishes',        label: 'New plant-based dishes tested & finalized for rollout',         metric: '# dishes',  target: null }
        ]
      },
      {
        id: 'phase3',
        name: 'Phase 3 \u2014 Rollout & Promotion',
        window: 'First half of 2029, complete by end of 2029',
        pillars: 'All vendors (incl. any coffee shops not yet on board)',
        desc: 'Roll changes out institution-wide with coordinated promotion and rotating featured vendors.',
        kpis: [
          { id: 'launched',      label: 'Vendors that launched changes on schedule',                     metric: '# vendors', target: 35 },
          { id: 'items',         label: 'New plant-based items launched',                                metric: '# items',   target: null }
        ]
      }
    ],
    /* cross-cutting KPI groups (tracked from Phase 1, baselines established in Phase 1) */
    kpiGroups: [
      {
        id: 'milk', name: 'Plant-based milk KPIs', emoji: '\u2615',
        desc: 'Baselines for plant-based milk use to be established in Phase 1.',
        kpis: [
          { id: 'pb-default',        label: 'Vendors with a plant-based milk default',                          metric: '# vendors' },
          { id: 'keep-default',      label: 'Customer orders that keep the default plant-based milk choice',    metric: '% orders' },
          { id: 'pb-milk-share',     label: 'Plant-based milk share of all milk drinks, against baseline',      metric: '% drinks' },
          { id: 'liters-replaced',   label: 'Liters of dairy milk replaced by plant-based milk',                metric: 'L' },
          { id: 'co2-avoided-milk',  label: 'Kg of CO2e avoided (per liter of dairy milk replaced)',            metric: 'kg CO2e' }
        ]
      },
      {
        id: 'menu', name: 'Menu KPIs', emoji: '\u{1f372}',
        desc: 'Baseline menu share is available per vendor; institution target = +30% vs baseline.',
        kpis: [
          { id: 'menu-30',          label: 'Progress toward 2030 goal: +30% plant-based options institution-wide', metric: '% vs baseline' },
          { id: 'menu-share-vendor',label: 'Plant-based share of total menu items, per vendor',                    metric: '% menu' },
          { id: 'plant-mains',      label: 'Plant-protein mains per vendor',                                       metric: '# mains' },
          { id: 'ready-vegan',      label: 'Ready-as-listed vegan menu items',                                     metric: '# items' },
          { id: 'best-sellers',     label: 'Plant-based share of best-sellers and total sales',                    metric: '% sales' }
        ]
      },
      {
        id: 'emissions', name: 'Emissions', emoji: '\u{1f30d}',
        desc: 'Reduction toward the 25% goal, reported for the milk initiative, menu initiative, and combined.',
        kpis: [
          { id: 'co2-milk',     label: 'CO2e reduction \u2014 plant-based milk initiative',  metric: 'kg CO2e' },
          { id: 'co2-menu',     label: 'CO2e reduction \u2014 menu initiative',               metric: 'kg CO2e' },
          { id: 'co2-combined', label: 'CO2e reduction \u2014 combined toward 25% goal',      metric: 'kg CO2e' }
        ]
      },
      {
        id: 'waste', name: 'Food waste KPIs', emoji: '\u{1f9fa}',
        desc: 'Tracked from Phase 2 (testing/pilot); baselines established in Phase 1.',
        kpis: [
          { id: 'unsold-counts',  label: 'Daily unsold counts for new plant-based items',         metric: '# items/day' },
          { id: 'waste-split',    label: 'Share of unsold food donated or composted (donation preferred)', metric: '% unsold' },
          { id: 'recovery',       label: 'Vendors connected to a food recovery partner (if any)', metric: '# vendors' }
        ]
      },
      {
        id: 'experience', name: 'Customer & employee experience', emoji: '\u{1f465}',
        desc: 'Track satisfaction alongside operational KPIs.',
        kpis: [
          { id: 'customer-sat',  label: 'Customer satisfaction',                 metric: 'score' },
          { id: 'employee-sat',  label: 'Employee satisfaction & sense of contribution', metric: 'score' }
        ]
      }
    ],
    reporting: {
      cadence: 'Monthly vendor reporting during Phases 1-2; quarterly check-ins plus brief end-of-year reports after rollout.',
      definitions: 'SOPs standardize definitions and the per-vendor data set; a reporting lead translates vendor data into key metrics.'
    }
  };

  /* ------------------------------------------------------------------ */
  /* 5. SOURCES                                                          */
  /* ------------------------------------------------------------------ */
  const SOURCES = [
    { title: 'Vendor menu-share baseline data', meta: 'Client Client_VendorsList_PlantFutures_FY27-Updated.xlsx (sheet: "Prominent Vendor List") \u2014 35 vendors: cuisine, establishment type, vegetarian & vegan options and menu-share percentages. Business names removed for privacy.', url: null },
    { title: 'Emission factors (North America)', meta: 'Client N_America_Emission_Factors.xlsx \u2014 WRI Coolfood Pledge Calculator (version June 25, 2026; coolfood.org); methods in "Tracking Progress Toward the Coolfood Pledge, 2026 update" (wri.org). Underlying data: Poore & Nemecek (2018), Science 360(6392):987-992, North America regional averages. Unit: kg CO2e per kg of food purchased. Headline metric: Supply chain total (on-farm + off-farm); carbon opportunity cost intentionally excluded.', url: 'https://www.coolfood.org' },
    { title: 'Implementation roadmap', meta: 'Client Implementation_roadmap.pdf \u2014 three-phase plan (Communication & Preparation through 1H 2027; Early Implementation / Pilot & Training 2H 2027\u20132H 2028; Rollout & Promotion 1H 2029\u2013EOY 2029) with progress KPIs per phase, plant-based milk KPIs, menu KPIs, emissions, food-waste KPIs, and customer/employee experience metrics.', url: null }
  ];

  return {
    GOALS, VENDORS, BASELINE_VEG_SHARE, BASELINE_VEGAN_SHARE, GROUP_META,
    EMISSION_FACTORS, MILKS, ROADMAP, SOURCES
  };
})();

if (typeof module !== 'undefined') module.exports = DATA;
if (typeof window !== 'undefined') window.DATA = DATA;