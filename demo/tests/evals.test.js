const test = require("node:test");
const assert = require("node:assert");
const DATA = require("../data.js");
const { loadCases, scoreCase } = require("../../evals/score.js");
const after = { matcher: require("../matcher.js"), framework: require("../framework.js") };
const before = { matcher: require("../../evals/v1/matcher.js"), framework: require("../../evals/v1/framework.js") };

const cases = loadCases();
const run = (v, c) => scoreCase(c, v.matcher.mapObservation(c.note, DATA.roster, v.framework, c.photoTags || []));
const failing = (v, set) => cases.filter((c) => c.set === set && !run(v, c).pass).map((c) => c.id);

test("the eval set is 20 cases: 14 used for tuning and 6 held out, with unique ids", () => {
  assert.strictEqual(cases.length, 20);
  assert.strictEqual(cases.filter((c) => c.set === "tuning").length, 14);
  assert.strictEqual(cases.filter((c) => c.set === "held-out").length, 6);
  assert.strictEqual(new Set(cases.map((c) => c.id)).size, 20);
  cases.forEach((c) => assert.ok(c.note && c.expect && c.expect.status && c.why, c.id + " is missing a field"));
});

test("the frozen 'before' rules still score 4 of 14 on tuning and 1 of 6 held-out (do not edit evals/v1)", () => {
  assert.strictEqual(14 - failing(before, "tuning").length, 4);
  assert.strictEqual(6 - failing(before, "held-out").length, 1);
});

test("the tuned rules pass every tuning case, and every injury, illness or safeguarding case in both sets", () => {
  assert.deepStrictEqual(failing(after, "tuning"), []);
  cases.filter((c) => c.area.startsWith("Safety")).forEach((c) =>
    assert.strictEqual(after.matcher.mapObservation(c.note, DATA.roster, after.framework, []).status, "needs_attention", c.id));
});

test("no harmless look-alike note is flagged as sensitive", () => {
  cases.filter((c) => c.area.startsWith("Look-alike")).forEach((c) =>
    assert.notStrictEqual(after.matcher.mapObservation(c.note, DATA.roster, after.framework, []).status, "needs_attention", c.id));
});

test("the one held-out case still failing is H06 (one phrase counted as two pieces of evidence). If you fix it, update evals/README.md", () => {
  assert.deepStrictEqual(failing(after, "held-out"), ["H06"]);
});

test("tuning did not change any of the 10 scripted demo moments", () => {
  DATA.captures.forEach((c) => {
    const a = JSON.stringify(after.matcher.mapObservation(c.note, DATA.roster, after.framework, c.vision.tags));
    const b = JSON.stringify(before.matcher.mapObservation(c.note, DATA.roster, before.framework, c.vision.tags));
    assert.strictEqual(a, b, c.id);
  });
});
