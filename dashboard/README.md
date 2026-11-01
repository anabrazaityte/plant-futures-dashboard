# Plant Futures — Institutional 2030 Goals & Implementation Roadmap Dashboard

An interactive, self-contained web dashboard supporting the institutional feasibility report and the
implementation strategy for the two 2030 goals:

> **+30% plant-based options** and **−25% food-related emissions** by 2030.

The dashboard is built entirely on the **real client data** in `data/` — the vendor list spreadsheet, the
North America emission-factors spreadsheet, and the Implementation Roadmap PDF — and lets the institution
track progress along the roadmap and toward the 2030 goals.

Built with **no build step and no dependencies at runtime** — everything (Chart.js included) is vendored
locally, so the dashboard runs fully offline by opening `index.html` in any modern browser.

---

## Quick start

```
cd dashboard
python3 -m http.server 8000     # optional; a server avoids localStorage quirks in some browsers
# open http://localhost:8000   (or just double-click index.html)
```

- **Print / PDF** — use the button in the top bar (or Ctrl/Cmd+P). The sidebar is hidden in print output.
- **State persistence** — your inputs (measured vendor shares, roadmap KPI progress, emissions baseline/current)
  are saved to the browser's `localStorage` and restored on next load.

## The five views

| View | What it does |
|---|---|
| **Overview** | 2030 goals at a glance: institution-wide baseline plant-based menu share computed from the vendor list, the +30% target share, emissions tracking, roadmap overall progress, plant share by establishment type, and the highest-impact food categories. |
| **Vendors** | All 35 real vendors (names removed) grouped by establishment type — cuisine, hours, popular items, vegetarian/vegan options and baseline menu shares; each card has an editable **measured now** field that feeds institution goal progress. |
| **Roadmap** | The three implementation phases (Communication & Preparation → Pilot & Training → Rollout & Promotion) with their full KPI list, editable per-KPI progress values, per-phase completion, the cross-cutting KPI groups (plant-based milk, menu, emissions, food waste, customer/employee experience), and the baseline/targets/reporting notes. |
| **Emissions** | All North America emission factors (Coolfood): per-food table, supply-chain totals by category, plant-based milk per-liter comparison, and an editable baseline→current tracker toward the −25% goal. |
| **Data & sources** | Provenance and caveats for the vendor data, emission factors, and the roadmap. |

## Data

- **Vendors** — `data/Vendor_List.xlsx` (35 vendors). Baseline plant-based (vegetarian) menu share ≈ **28.8%**;
  vegan-only ≈ **9.9%**; 7 vendors on the coffee-shop track. Machine-readable in `js/vendor-data.js`.
- **Emission factors** — `data/N_America_Emission_Factors.xlsx`. WRI Coolfood Pledge Calculator NA, underlying
  Poore & Nemecek (2018) regional averages. Headline metric: **supply-chain total** (kg CO₂e / kg food).
  Machine-readable in `js/emission-data.js`.
- **Roadmap** — `data/Implementation_roadmap.pdf`. Three phases (2027 → 2030) and the KPI framework, encoded in
  `js/data.js` (`DATA.ROADMAP`).

See `data/sample-data.md` for the full tables, conversions, and caveats.

## Live site

Published to GitHub Pages (auto-deploys on every push to `main`):

**https://anabrazaityte.github.io/plant-futures-dashboard/**

## Methodology (transparent + editable)

- **Options goal** — baseline plant-based menu share from the vendor list; target = baseline × 1.30 (+30%
  relative increase). Current share is the mean of each vendor's *measured now* field.
- **Emissions goal** — the institution enters baseline-year and current annual kg CO₂e (measured in Phase 1 per
  the roadmap); progress toward −25%.
- **Roadmap progress** — per-KPI counts are entered manually each reporting period; phase progress is the
  average % of target over the target-based KPIs in that phase.
- **Emission factors** — displayed as the source workbook reports them (supply-chain total headline; sLUC
  separate). The dashboard does not model total annual emissions until the baseline is measured.

## Project structure

```
dashboard/
  index.html              # app shell
  css/styles.css          # design system
  js/vendor-data.js       # real vendor rows (auto-generated from Vendor_List.xlsx)
  js/emission-data.js     # real emission factors (auto-generated from N_America_Emission_Factors.xlsx)
  js/data.js              # goals, baselines, roadmap phases & KPIs, sources
  js/calc.js              # calculation helpers (pure functions)
  js/charts.js            # Chart.js helpers
  js/app.js               # views, state, interactions
  lib/chart.umd.min.js    # vendored Chart.js (offline)
  data/Vendor_List.xlsx   # source: client vendor spreadsheet
  data/N_America_Emission_Factors.xlsx  # source: emission factors
  data/Implementation_roadmap.pdf       # source: implementation roadmap
  data/sample-data.md     # human-readable reference of the real data
```

To regenerate the two data files from the spreadsheets, run `python3 /tmp/kilo/gen_data.py` (requires
`pandas` + `openpyxl`) and refresh this project's copy.

## Testing

The dashboard is validated with a headless jsdom smoke test (all five views render, roadmap KPI edits and
vendor measured-share edits recalculate, re-rendering is error-free). Run it with the Node binary:

```
/tmp/kilo/nodeenv/bin/node /tmp/kilo/jstest/smoke.js
```

---

*Companion tool for the institutional plant-forward feasibility report — Acterra · Plant Futures Challenge Lab.*