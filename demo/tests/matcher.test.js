const test = require("node:test");
const assert = require("node:assert");
const FRAMEWORK = require("../framework.js");
const DATA = require("../data.js");
const { mapObservation } = require("../matcher.js");

const cap = (id) => DATA.captures.find((c) => c.id === id);
const run = (note, tags) => mapObservation(note, DATA.roster, FRAMEWORK, tags);
const byId = (id) => run(cap(id).note, cap(id).vision.tags);
const noPhoto = (id) => run(cap(id).note, []);

test("c1 Leo: counting High, spatial Medium", () => {
  const r = byId("c1");
  assert.strictEqual(r.status, "draft");
  assert.deepStrictEqual(r.children, ["leo"]);
  assert.strictEqual(r.suggestions[0].goalId, "M1a");
  assert.strictEqual(r.suggestions[0].confidence, "High");
  assert.strictEqual(r.suggestions[1].goalId, "M2a");
  assert.strictEqual(r.suggestions[1].confidence, "Medium");
});

test("c3 Noah: persistence and regulation both High", () => {
  const ids = byId("c3").suggestions.map((s) => s.goalId).sort();
  assert.deepStrictEqual(ids, ["ATL1b", "SED2a"]);
  assert.ok(byId("c3").suggestions.every((s) => s.confidence === "High"));
});

test("c4 Aisha and Omar: empathy High, peers Medium, both children found", () => {
  const r = byId("c4");
  assert.strictEqual(r.suggestions[0].goalId, "SED3d");
  assert.strictEqual(r.suggestions[0].confidence, "High");
  assert.deepStrictEqual(r.children.sort(), ["aisha", "omar"]);
});

test("c6 Ria: fine motor High from the words alone", () => {
  const r = noPhoto("c6");
  assert.strictEqual(r.suggestions[0].goalId, "PD2");
  assert.strictEqual(r.suggestions[0].confidence, "High");
});

test("c8 Jay: gross motor High", () => {
  assert.strictEqual(byId("c8").suggestions[0].goalId, "PD1");
  assert.strictEqual(byId("c8").suggestions[0].confidence, "High");
});

test("c7 Zara: one word cue is Medium without the photo (R2)", () => {
  const r = noPhoto("c7");
  assert.strictEqual(r.suggestions.length, 1);
  assert.strictEqual(r.suggestions[0].confidence, "Medium");
});

test("c7 Zara: the photo is the second piece of evidence, so it becomes High and says so", () => {
  const r = byId("c7");
  assert.strictEqual(r.suggestions[0].goalId, "PD2");
  assert.strictEqual(r.suggestions[0].confidence, "High");
  assert.ok(r.suggestions[0].photoEvidence.length >= 1);
});

test("a photo alone never creates a suggestion", () => {
  const r = run("The class had a quiet morning.", ["3 cups", "stacked", "5 stacked blocks"]);
  assert.strictEqual(r.status, "no_match");
  assert.strictEqual(r.suggestions.length, 0);
});

test("c9 Ben: sensitive note not mapped, kept Staff-only, routed to Incident (R5)", () => {
  const r = byId("c9");
  assert.strictEqual(r.status, "needs_attention");
  assert.strictEqual(r.suggestions.length, 0);
  assert.strictEqual(r.visibility, "staff_only");
  assert.strictEqual(r.route, "Incident");
});

test("ordinary learning notes default to family-visible", () => {
  assert.strictEqual(byId("c1").visibility, "family");
});

test("c10 room note abstains (R3), and 'a bit loud' is not a bite", () => {
  const r = byId("c10");
  assert.strictEqual(r.status, "no_match");
  assert.strictEqual(r.suggestions.length, 0);
});

test("never more than two suggestions (R4)", () => {
  DATA.captures.forEach((c) => assert.ok(byId(c.id).suggestions.length <= 2));
});

test("evidence words always appear in the note (R6)", () => {
  DATA.captures.forEach((c) => byId(c.id).suggestions.forEach((s) => {
    assert.ok(s.evidence.length >= 1);
    s.evidence.forEach((e) => assert.ok(c.note.toLowerCase().includes(e.toLowerCase())));
  }));
});

test("High always has two or more pieces of evidence, words or photo (R2)", () => {
  DATA.captures.forEach((c) => byId(c.id).suggestions.forEach((s) => {
    if (s.confidence === "High") assert.ok(s.evidence.length + s.photoEvidence.length >= 2);
  }));
});

test("sensitive wording overrides any learning match", () => {
  assert.strictEqual(run("Leo counted blocks one to five then fell and hurt his knee.", []).status, "needs_attention");
});

test("names not on the roster are not matched (R9)", () => {
  assert.deepStrictEqual(run("Priya counted to ten.", []).children, []);
});

test("framework is the published structure: 73 sub-skills with the published per-domain counts", () => {
  assert.strictEqual(FRAMEWORK.goals.length, 73);
  const counts = {};
  FRAMEWORK.goals.forEach((g) => { counts[g.domain] = (counts[g.domain] || 0) + 1; });
  assert.deepStrictEqual(counts, {
    "Social & Emotional Development": 12, "Approaches to Learning": 4, "Physical Development": 6,
    "Language & Literacy Development": 15, "Mathematics": 12, "Science": 7, "Social Studies": 8, "Creative Arts": 9
  });
});

test("skill codes are unique and the two codes seen in brightwheel's app match the published names", () => {
  const codes = FRAMEWORK.goals.map((g) => g.code);
  assert.strictEqual(new Set(codes).size, 73);
  const by = Object.fromEntries(FRAMEWORK.goals.map((g) => [g.code, g.sub]));
  assert.strictEqual(by["SED 1a"], "Knows self and expresses confidence");
  assert.strictEqual(by["ATL 2a"], "Shows flexibility");
});

test("framework carries names and codes only: no benchmark descriptor text", () => {
  FRAMEWORK.goals.forEach((g) => assert.ok(!("benchmarkText" in g) && !("descriptors" in g)));
  assert.deepStrictEqual(FRAMEWORK.benchmarks, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.match(FRAMEWORK.attribution, /Experience Early Learning/);
});

test("every scripted level is a valid benchmark and belongs to a goal in the note's suggestions", () => {
  DATA.captures.forEach((c) => {
    const ids = byId(c.id).suggestions.map((s) => s.goalId);
    Object.keys(c.levels).forEach((g) => {
      assert.ok(ids.includes(g), c.id + " scripted level for " + g + " has no matching suggestion");
      Object.values(c.levels[g]).forEach((v) => assert.ok(FRAMEWORK.benchmarks.includes(v)));
    });
  });
});
