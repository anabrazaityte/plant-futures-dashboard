/* ==========================================================================
   Plant Futures — Real data, goals & roadmap
   Vendor/emission rows are auto-generated from the client's spreadsheets
   (dashboard/data/Vendor_List.xlsx and N_America_Emission_Factors.xlsx) in
   js/vendor-data.js and js/emission-data.js. This file adds the institution
   goals, KPI definitions, and roadmap structure from the Implementation
   Roadmap (dashboard/data/Implementation_roadmap.pdf).
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
    'Cafe / coffee shops':             { emoji: '\u2615', color: '#7a5c3d' },
    'Full-service dining':             { emoji: '\u{1f372}', color: '#5a3d8a' },
    'Full-service dining & bars':      { emoji: '\u{1f375}', color: '#a35a2b' },
    'Casual sit-down & bars':          { emoji: '\u{1f379}', color: '#b4493c' },
    'Bars':                            { emoji: '\u{1f378}', color: '#7a4a2b' },
    'Fast casual & grab-and-go':       { emoji: '\u{1f35c}', color: '#3b6f8f' },
    'Grab-and-go, deli & market':      { emoji: '\u{1f9fa}', color: '#6b7a3d' },
    'Juice bars':                      { emoji: '\u{1f966}', color: '#3e825e' },
    'Other':                           { emoji: '\u{1f960}', color: '#46584e' }
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
        desc: 'Communicate expectations (goals, minimum contributions, timeline), review contracts and flag franchise/ending-contract limitations, appoint internal sustainability leads, and establish the baselines needed to measure progress (plant-based milk share, plant-based sales share, estimated emissions baseline, unsold-food volumes and destinations). Distribute vendor toolkits; lay out the CO2e calculation method.',
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
        desc: 'Enact the plant-based milk default at coffee shops (as soon as possible; countertop signage; employee training and FAQs; track unsold/spoiled milk). Restaurants: willing/eager vendors pilot first; sustainability leads plan changes; group trainings incl. taste tests; test more dishes than will roll out, launch new items in small batches and track daily unsold counts and destination. Implement priority techniques: taste-focused messaging, improved flavor/appeal, environmental messaging, higher menu ratio, more variety.',
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
        desc: 'Review results of the first two phases and adjust. Roll menu changes out in a coordinated manner with institution-wide promotional messaging. Promote the initiative as a whole and rotate featured vendors to incentivize participation and signal to environmentally conscious clientele how they can support the goals.',
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
        desc: 'Baseline plant-based menu share per vendor is available today (Vendor_List.xlsx); institution target = +30% vs baseline.',
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
        desc: 'Reduction in kg CO2e against [baseline year] emissions toward the 25% goal \u2014 reported separately for the milk initiative, the menu initiative, and combined. Emissions baseline to be established in Phase 1.',
        kpis: [
          { id: 'co2-milk',     label: 'CO2e reduction \u2014 plant-based milk initiative',  metric: 'kg CO2e' },
          { id: 'co2-menu',     label: 'CO2e reduction \u2014 menu initiative',               metric: 'kg CO2e' },
          { id: 'co2-combined', label: 'CO2e reduction \u2014 combined toward 25% goal',      metric: 'kg CO2e' }
        ]
      },
      {
        id: 'waste', name: 'Food waste KPIs', emoji: '\u{1f9fa}',
        desc: 'Tracked from Phase 2 during testing/pilot; baselines established in Phase 1.',
        kpis: [
          { id: 'unsold-counts',  label: 'Daily unsold counts for new plant-based items',         metric: '# items/day' },
          { id: 'waste-split',    label: 'Share of unsold food donated or composted (donation preferred)', metric: '% unsold' },
          { id: 'recovery',       label: 'Vendors connected to a food recovery partner (if any)', metric: '# vendors' }
        ]
      },
      {
        id: 'experience', name: 'Customer & employee experience', emoji: '\u{1f465}',
        desc: 'Track satisfaction alongside the operational KPIs.',
        kpis: [
          { id: 'customer-sat',  label: 'Customer satisfaction',                 metric: 'score' },
          { id: 'employee-sat',  label: 'Employee satisfaction & sense of contribution', metric: 'score' }
        ]
      }
    ],
    reporting: {
      cadence: 'Monthly vendor reporting during Phases 1-2; quarterly check-ins plus brief end-of-year reports after rollout.',
      definitions: 'SOPs ensure shared definitions (vegan main, ready-as-listed, etc.) and a standardized data set per vendor (item-level sales tagged by category), with an institution reporting lead responsible for translating vendor data into key metrics.'
    }
  };

  /* ------------------------------------------------------------------ */
  /* 5. SOURCES                                                          */
  /* ------------------------------------------------------------------ */
  const SOURCES = [
    { title: 'Vendor menu-share baseline data', meta: 'Client Vendor_List.xlsx (sheet: "Prominent Vendor List") \u2014 35 vendors: cuisine, establishment type, date opened, sustainability commitments, hours, popular menu items, vegetarian & vegan options and menu-share percentages. Business names removed for privacy.', url: null },
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