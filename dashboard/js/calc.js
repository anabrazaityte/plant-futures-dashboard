/* ==========================================================================
   Institutional Calculation helpers (real data)
   Pure functions over the real vendor menu-share baselines, the North
   America Coolfood emission factors, and the implementation-roadmap KPIs.
   ========================================================================== */
'use strict';

const Calc = (() => {

  const { GOALS, VENDORS } = DATA;

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  /* ---------------- 2030 goals ---------------- */

  /* Goal 1: +30% plant-based menu options relative to baseline.
     Baseline = institution-wide mean vegetarian menu share. */
  function optionsTargetShare(baselineShare) { // baselineShare in percent (0-100)
    return baselineShare * (1 + GOALS.options.targetPct / 100);
  }
  function optionsProgress(currentShare, baselineShare) { // percentages
    const target = optionsTargetShare(baselineShare);
    if (target <= baselineShare) return currentShare >= target ? 100 : 0;
    return clamp((currentShare - baselineShare) / (target - baselineShare) * 100, 0, 100);
  }

  /* Goal 2: -25% food-related emissions vs baseline-year emissions.
     Baseline/current are kg CO2e entered by the institution (measured in Phase 1). */
  function emissionsTarget(baselineKg) {
    return baselineKg * (1 - GOALS.emissions.targetPct / 100);
  }
  function emissionsProgress(currentKg, baselineKg) {
    if (!baselineKg) return 0;
    const target = emissionsTarget(baselineKg);
    if (baselineKg <= target) return currentKg <= target ? 100 : 0;
    return clamp((baselineKg - currentKg) / (baselineKg - target) * 100, 0, 100);
  }

  /* ---------------- institution menu-share stats ---------------- */
  /* Plant-based = vegan only (vegan dishes are always vegetarian; vegetarian
     is not plant-based). Baseline and current share are measured on vegan share. */

  function institutionStats(current) { // current = { vendorId: plantSharePercent }
    let sum = 0, plantSum = 0, vegSum = 0, n = VENDORS.length;
    VENDORS.forEach(v => {
      const cur = current && current[v.id] != null ? Number(current[v.id]) : (v.veganShare != null ? v.veganShare : 0);
      sum += clamp(cur, 0, 100);
      plantSum += v.veganShare != null ? v.veganShare : 0;
      vegSum += v.vegShare != null ? v.vegShare : 0;
    });
    return {
      currentShare: n ? sum / n : 0,
      baselineShare: n ? plantSum / n : 0,     // plant-based baseline = vegan menu share
      veganBaseline: n ? plantSum / n : 0,
      vegBaseline: n ? vegSum / n : 0           // context only (not plant-based)
    };
  }

  /* ---------------- roadmap KPI progress ---------------- */

  /* progress 0-100 for a single KPI given its current value and (optionally) target.
     Returns null when no numeric target is set (count-only KPI). */
  function kpiPct(now, target) {
    const n = +now || 0;
    const t = target != null && target !== '' ? +target : null;
    if (t == null || !(t > 0)) return null;
    return clamp(n / t * 100, 0, 100);
  }

  /* average % progress across a list of KPIs, resolving each via resolver(k) -> {now, target} */
  function avgPct(kpis, resolver) {
    const pcts = (kpis || []).map(k => kpiPct(resolver(k).now, resolver(k).target)).filter(x => x != null);
    return pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  }

  return {
    clamp, optionsTargetShare, optionsProgress,
    emissionsTarget, emissionsProgress,
    institutionStats, kpiPct, avgPct
  };
})();

if (typeof module !== 'undefined') module.exports = Calc;
if (typeof window !== 'undefined') window.Calc = Calc;