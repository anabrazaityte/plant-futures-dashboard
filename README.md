# Plant Futures — Institutional Plant-Forward Menu Project

Project for **Acterra · Plant Futures Challenge Lab**.

## Contents

- **`dashboard/`** — an interactive, offline-capable web dashboard that supports the institution's two
  2030 goals (+30% plant-based options, −25% food-related emissions) and the implementation roadmap.

## The dashboard

Built on the real client data in `dashboard/data/`:

- **Vendor baselines** — 35 vendors from `Vendor_List.xlsx` (cuisine, establishment type, veg/vegan menu
  options and menu-share percentages; names removed);
- **Emission factors** — North America factors from `N_America_Emission_Factors.xlsx`
  (WRI Coolfood / Poore & Nemecek 2018 regional averages);
- **Implementation roadmap** — the three phases and KPI framework from `Implementation_roadmap.pdf`,
  with progress tracked per phase and goal progress toward 2030.

Views: Overview · Vendors · Roadmap · Emissions · Data & sources.

### Run it (local / offline)

```bash
cd dashboard
python3 -m http.server 8000    # then open http://localhost:8000
# or simply open dashboard/index.html in a browser (works offline)
```

### GitHub Pages

The dashboard auto-deploys to GitHub Pages on every push to `main` via
`.github/workflows/pages.yml` (publishes the `dashboard/` folder at the site root).

## Status

- [x] Real vendor and emission data embedded from client spreadsheets
- [x] Roadmap KPI tracking (3 phases + cross-cutting KPI groups)
- [x] Headless smoke test — all views render, edits recalculate
- [ ] Confirm institution-wide baselines (milk use, emissions, food waste) in Phase 1
- [ ] Wire institutional branding / report pages when available