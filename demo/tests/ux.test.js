const test = require("node:test");
const assert = require("node:assert");
const FRAMEWORK = require("../framework.js");
const DATA = require("../data.js");
const { mapObservation } = require("../matcher.js");
const UX = require("../ux.js");
const Trust = require("../trust.js");

const mk = (id) => {
  const c = DATA.captures.find((x) => x.id === id);
  const result = mapObservation(c.note, DATA.roster, FRAMEWORK, c.vision.tags);
  return { key: id, note: c.note, result, childIds: result.children.slice(), chosen: [], flags: [] };
};
const all = () => DATA.captures.map((c) => mk(c.id));

// ---------------- review UX
test("classify: safety, clear and choose", () => {
  assert.strictEqual(UX.classify(mk("c9")), "attention");
  assert.strictEqual(UX.classify(mk("c1")), "clear");
  assert.strictEqual(UX.classify(mk("c10")), "choose");
});

test("a flagged draft is 'check' until confirmed, and is never bulk-approvable", () => {
  const d = mk("c1"); d.flags = [{ childId: "leo" }];
  assert.strictEqual(UX.classify(d), "check");
  assert.ok(!UX.bulkEligible([d]).length);
  d.confirmed = true;
  assert.strictEqual(UX.classify(d), "clear");
});

test("a High draft with no child identified is not 'clear'", () => {
  const d = mk("c1"); d.childIds = [];
  assert.strictEqual(UX.classify(d), "choose");
});

test("review estimate for the full demo day stays within 3 minutes", () => {
  assert.ok(UX.estimateReviewSeconds(all()) <= 180);
});

test("estimate ignores finished drafts", () => {
  const d = all(); d.forEach((x) => (x.done = true));
  assert.strictEqual(UX.estimateReviewSeconds(d), 0);
  assert.strictEqual(UX.formatEstimate(0), "nothing left");
});

test("coverage: safety notes and rejected drafts do not count as observed", () => {
  const d = all();
  assert.ok(UX.coverage(DATA.roster, d).missing.includes("ben"));
  d.find((x) => x.key === "c1").outcome = "rejected";
  assert.ok(UX.coverage(DATA.roster, d).missing.includes("leo"));
});

test("chip conflicts: selected child missing from a note that names others", () => {
  assert.deepStrictEqual(UX.chipConflicts(["leo"], ["maya"]), ["leo"]);
  assert.deepStrictEqual(UX.chipConflicts(["leo"], ["leo"]), []);
  assert.deepStrictEqual(UX.chipConflicts(["leo"], []), []);
});

// ---------------- trust logic
test("level jump flag: a move of 2 or more levels from the last observation is flagged", () => {
  const f = Trust.levelFlags(DATA.history, "M1a", { leo: 5 });       // prior 2 by Ms. Rivera
  assert.strictEqual(f.length, 1);
  assert.deepStrictEqual([f[0].from, f[0].to, f[0].diff], [2, 5, 3]);
});

test("level jump flag: a move of 1 level or no history is not flagged", () => {
  assert.strictEqual(Trust.levelFlags(DATA.history, "SCI1a", { maya: 4 }).length, 0);   // prior 3
  assert.strictEqual(Trust.levelFlags(DATA.history, "PD1", { jay: 4 }).length, 0);    // no prior
});

test("level jump flag names who recorded the earlier level (two-rater disagreement)", () => {
  const f = Trust.levelFlags(DATA.history, "PD2", { ria: 5 });       // prior 3 by Mr. Diaz
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].by, "Mr. Diaz");
});

test("level flags work per child inside one group observation", () => {
  const f = Trust.levelFlags(DATA.history, "SED3b", { aisha: 4, omar: 4 });
  assert.strictEqual(f.length, 0);
  const g = Trust.levelFlags(DATA.history, "M1a", { leo: 5, maya: 4, sam: 6 });
  assert.deepStrictEqual(g.map((x) => x.childId).sort(), ["leo", "sam"]);
});

test("coverage gap for a skill: who has nothing in this window", () => {
  const g = Trust.coverageGap(DATA.history, DATA.roster, "PD2", []);
  assert.deepStrictEqual(g.missing.sort(), ["ben", "zara"]);
  assert.strictEqual(g.observed, 8);
});

test("coverage gap shrinks when something is approved today", () => {
  const g = Trust.coverageGap(DATA.history, DATA.roster, "PD2", ["zara"]);
  assert.deepStrictEqual(g.missing, ["ben"]);
});

test("district rows: percentages, flags and no outcome scores", () => {
  const rows = Trust.districtRows(DATA.sites);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0].children_observed_pct, 85);
  assert.strictEqual(rows[0].flags, "None");
  assert.match(rows[1].flags, /3 rooms with no observation in 21\+ days/);
  assert.match(rows[2].flags, /Low coverage/);
  rows.forEach((r) => assert.ok(!("average_level" in r) && !("score" in r)));
});

test("CSV export: header, quoting and row count", () => {
  const csv = Trust.toCsv(Trust.districtRows(DATA.sites));
  const lines = csv.trim().split("\n");
  assert.strictEqual(lines.length, 4);
  assert.match(lines[0], /^site,type,rooms,children,observations_30d/);
  assert.match(csv, /Low coverage; 7 rooms with no observation in 21\+ days\n/);
  assert.strictEqual(Trust.toCsv([{ a: "x,y", b: 'say "hi"' }]), 'a,b\n"x,y","say ""hi"""\n');
});
