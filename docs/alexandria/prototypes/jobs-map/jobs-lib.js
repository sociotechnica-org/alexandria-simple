// Shared derivations over window.JOBS_DATA, so the map and the roadmap view agree.
window.JOBS_LIB = (function () {
  const D = window.JOBS_DATA;
  const DIMS = ["better", "cheaper", "faster"], DL = { better: "B", cheaper: "C", faster: "F" };
  const jobsById = Object.fromEntries(D.jobs.map((j) => [j.id, j]));
  const phasesById = Object.fromEntries(D.phases.map((p) => [p.id, p]));
  const cellsBy = Object.fromEntries(D.cells.map((c) => [c.job + "/" + c.dimension, c]));
  // cell status is derived from built features, never typed
  const status = {};
  for (const f of D.features) {
    if (f.status === "proposed") continue;
    for (const s of f.serves) { const k = s.job + "/" + s.dimension; status[k] = s.coverage === "full" ? "served" : status[k] || "partial"; }
  }
  const stOf = (j, d) => (cellsBy[j + "/" + d] && !cellsBy[j + "/" + d].applies) ? "na" : status[j + "/" + d] || "open";
  // priority: value × urgency × gap. Urgency comes from the phase's status (set by the owner), not its dates.
  const w = D.priority.weights, boost = D.priority.nextBoost;
  function score(f) {
    if (f.status !== "proposed") return null;
    const value = f.serves.reduce((a, s) => a + (jobsById[s.job].importance || 0) * w[s.dimension], 0);
    const ps = f.dueBy ? phasesById[f.dueBy].status : "later";
    const urg = ps === "past" ? 0 : 1 + (ps === "next" ? boost : 0);
    const gap = f.serves.filter((s) => stOf(s.job, s.dimension) !== "served").length / f.serves.length;
    return value * urg * gap;
  }
  // what serves a job today, fullest coverage first; what is planned, highest score first
  const covRank = { full: 0, partial: 1 };
  const serving = (job) => D.features.filter((f) => f.status !== "proposed" && f.serves.some((s) => s.job === job))
    .map((f) => ({ f, serves: f.serves.filter((s) => s.job === job) }))
    .sort((a, b) => Math.min(...a.serves.map((s) => covRank[s.coverage])) - Math.min(...b.serves.map((s) => covRank[s.coverage])) || b.serves.length - a.serves.length);
  const planned = (job) => D.features.filter((f) => f.status === "proposed" && f.serves.some((s) => s.job === job))
    .map((f) => ({ f, serves: f.serves.filter((s) => s.job === job), score: score(f) })).sort((a, b) => b.score - a.score);
  return { D, DIMS, DL, jobsById, phasesById, cellsBy, stOf, score, serving, planned };
})();
