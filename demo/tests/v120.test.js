// v1.2.0 red tests: written BEFORE the fixes. They describe what the user reported on a real phone and in the B01 backlog item.
const test = require("node:test");
const assert = require("node:assert");
const FRAMEWORK = require("../framework.js");
const DATA = require("../data.js");
const Trust = require("../trust.js");
const { mapObservation } = require("../matcher.js");

const run = (note, tags) => mapObservation(note, DATA.roster, FRAMEWORK, tags || []);
const cap = (id) => DATA.captures.find((c) => c.id === id);
const areaIds = (domain) => FRAMEWORK.goals.filter((g) => g.domain === domain).map((g) => g.id);
const nameOf = (id) => DATA.roster.find((c) => c.id === id).first;

// ---------------------------------------------------------------- B01: one phrase is one piece of evidence
test("B01: one phrase matched by two overlapping rules counts once, so it is Medium, not High", () => {
  const r = run("Maya asked what happens if we add red.");
  assert.strictEqual(r.suggestions[0].goalId, "SCI1a");
  assert.strictEqual(r.suggestions[0].confidence, "Medium");
  assert.strictEqual(r.suggestions[0].evidence.length, 1);
});

test("B01: the demo's own Maya moment (c2) is Medium for 'Asks questions and makes predictions'", () => {
  const r = run(cap("c2").note, cap("c2").vision.tags);
  const s = r.suggestions.find((x) => x.goalId === "SCI1a");
  assert.strictEqual(s.confidence, "Medium");
  assert.strictEqual(s.evidence.length, 1);
});

test("B01: two separate phrases are still two pieces of evidence, so High still works", () => {
  const r = run(cap("c1").note, cap("c1").vision.tags);   // 'counted' and 'one to five' do not overlap
  assert.strictEqual(r.suggestions[0].goalId, "M1a");
  assert.strictEqual(r.suggestions[0].confidence, "High");
  assert.strictEqual(r.suggestions[0].evidence.length, 2);
});

test("B01: no suggestion ever lists two pieces of evidence that overlap on the same words", () => {
  const notes = DATA.captures.map((c) => c.note).concat(["Maya asked what happens if we add red.", "Noah worked on the puzzle for ten minutes and tried again."]);
  notes.forEach((n) => {
    run(n, []).suggestions.forEach((s) => {
      const spans = s.evidence.map((e) => [n.indexOf(e), n.indexOf(e) + e.length]);
      spans.forEach((a, i) => spans.forEach((b, j) => { if (i < j) assert.ok(a[1] <= b[0] || b[1] <= a[0], "overlap in: " + n + " -> " + JSON.stringify(s.evidence)); }));
    });
  });
});

// ---------------------------------------------------------------- the coverage nudge counts a learning area, not one skill
test("area coverage: Leo's tower (Verbally counts numbers) is judged by Mathematics, 6 of 10, nothing yet for Noah, Omar, Zara, Ben", () => {
  assert.strictEqual(typeof Trust.areaCoverage, "function");
  const g = Trust.areaCoverage(DATA.history, DATA.roster, areaIds("Mathematics"), []);
  assert.strictEqual(g.observed, 6);
  assert.strictEqual(g.total, 10);
  assert.deepStrictEqual(g.missing.map(nameOf).sort(), ["Ben", "Noah", "Omar", "Zara"]);
});

test("area coverage: a child with an observation for ANY skill in the area counts, and the answer differs by area", () => {
  const sci = Trust.areaCoverage(DATA.history, DATA.roster, areaIds("Science"), []);
  assert.strictEqual(sci.observed, 3);
  const pd = Trust.areaCoverage(DATA.history, DATA.roster, areaIds("Physical Development"), []);
  assert.strictEqual(pd.observed, 8);
  assert.deepStrictEqual(pd.missing.map(nameOf).sort(), ["Ben", "Zara"]);
});

test("area coverage: something approved today in the area counts too", () => {
  const g = Trust.areaCoverage(DATA.history, DATA.roster, areaIds("Mathematics"), ["noah"]);
  assert.strictEqual(g.observed, 7);
  assert.ok(!g.missing.includes("noah"));
});

// ---------------------------------------------------------------- a drop is a drop, not a jump
test("change label: up is a Jump, down is a Drop, and the size is never negative", () => {
  assert.strictEqual(typeof Trust.changeLabel, "function");
  assert.strictEqual(Trust.changeLabel(3), "Jump of 3 levels");
  assert.strictEqual(Trust.changeLabel(-3), "Drop of 3 levels");
  assert.strictEqual(Trust.changeLabel(2), "Jump of 2 levels");
  assert.strictEqual(Trust.changeLabel(-2), "Drop of 2 levels");
  assert.ok(!/-/.test(Trust.changeLabel(-3)));
});

test("a drop of 3 levels (Maya 4 to 1 on Verbally counts numbers) is flagged and labelled as a drop", () => {
  const f = Trust.levelFlags(DATA.history, "M1a", { maya: 1 });
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].diff, -3);
  assert.strictEqual(Trust.changeLabel(f[0].diff), "Drop of 3 levels");
});

test("a drop of 1 level is still not flagged", () => {
  assert.strictEqual(Trust.levelFlags(DATA.history, "M1a", { maya: 3 }).length, 0);
});
