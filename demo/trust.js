/*
 * Trust and evidence logic, kept free of the DOM so it can be unit tested.
 * Everything here works on SYNTHETIC data. History format: { goalId: { childId: [ {date, level, by} ] } }.
 */
(function (root) {
  const JUMP = 2;   // levels. A change this large between observations is worth a second look.

  function latestPrior(history, goalId, childId) {
    const arr = ((history || {})[goalId] || {})[childId] || [];
    return arr.length ? arr[arr.length - 1] : null;
  }

  // levels: { childId: level }. Returns one flag per child whose new level moved a lot.
  function levelFlags(history, goalId, levels) {
    const flags = [];
    Object.keys(levels || {}).forEach((childId) => {
      const lv = levels[childId];
      if (lv === null || lv === "" || lv === undefined) return;
      const prior = latestPrior(history, goalId, childId);
      if (!prior) return;
      const diff = Number(lv) - prior.level;
      if (Math.abs(diff) >= JUMP) flags.push({ childId, goalId, from: prior.level, to: Number(lv), date: prior.date, by: prior.by, diff });
    });
    return flags;
  }

  // Who has nothing logged for this skill in the current window (history plus anything approved today).
  function coverageGap(history, roster, goalId, sessionObserved) {
    const seen = new Set(Object.keys((history || {})[goalId] || {}).concat(sessionObserved || []));
    const missing = roster.filter((c) => !seen.has(c.id)).map((c) => c.id);
    return { total: roster.length, observed: roster.length - missing.length, missing };
  }

  // Who has nothing logged in a whole learning area (any skill in it) in the current window. This is what the nudge at capture counts,
  // so it asks "does this child have any recent observation in Mathematics?" and not "...for this one skill?".
  function areaCoverage(history, roster, goalIds, sessionObserved) {
    const seen = new Set(sessionObserved || []);
    (goalIds || []).forEach((g) => Object.keys((history || {})[g] || {}).forEach((c) => seen.add(c)));
    const missing = roster.filter((c) => !seen.has(c.id)).map((c) => c.id);
    return { total: roster.length, observed: roster.length - missing.length, missing };
  }

  // A move up is a Jump and a move down is a Drop. The size is never negative.
  function changeLabel(diff) {
    const n = Math.abs(diff);
    return (diff < 0 ? "Drop" : "Jump") + " of " + n + " level" + (n === 1 ? "" : "s");
  }

  // Site-level evidence-quality rows. Deliberately NOT outcomes: it shows how much and how consistently
  // evidence is being recorded, because results are only trustworthy once that is.
  function districtRows(sites) {
    return sites.map((s) => {
      const pctObserved = Math.round(100 * s.kidsObserved / s.children);
      const pctPhoto = Math.round(100 * s.obsWithPhoto / s.obs);
      const flags = [];
      if (pctObserved < 60) flags.push("Low coverage");
      if (s.sparseRooms > 0) flags.push(s.sparseRooms + " room" + (s.sparseRooms > 1 ? "s" : "") + " with no observation in 21+ days");
      return { site: s.name, type: s.type, rooms: s.rooms, children: s.children, observations_30d: s.obs,
        children_observed_pct: pctObserved, obs_per_child: Math.round(10 * s.obs / s.children) / 10,
        obs_with_photo_pct: pctPhoto, avg_skills_assessed_of_73: s.avgSkills, sparse_rooms: s.sparseRooms,
        flags: flags.join("; ") || "None" };
    });
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    const q = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [cols.join(",")].concat(rows.map((r) => cols.map((c) => q(r[c])).join(","))).join("\n") + "\n";
  }

  const api = { JUMP, latestPrior, levelFlags, coverageGap, areaCoverage, changeLabel, districtRows, toCsv };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Trust = api;
})(typeof self !== "undefined" ? self : this);
