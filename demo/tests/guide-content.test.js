const test = require("node:test");
const assert = require("node:assert");
const P = require("../guide-content.js");

test("six gap steps in order, each numbered 1 to 6", () => {
  assert.deepStrictEqual(P.STEPS.map((s) => s.id), ["why", "benchmark", "coverage", "visibility", "review", "district"]);
  assert.deepStrictEqual(P.STEPS.map((s) => s.n), [1, 2, 3, 4, 5, 6]);
});

test("every step has all the fields the cards need", () => {
  P.STEPS.forEach((s) => {
    ["title", "scenario", "built", "why", "measure", "target", "pin"].forEach((f) => assert.ok(typeof s[f] === "string" && s[f].length > 0, s.id + " missing " + f));
    assert.ok(["capture", "review", "district"].includes(s.setup.view), s.id + " bad view");
    assert.ok(P.SOURCES[s.src], s.id + " has an unknown source");
  });
});

test("cards stay short enough to read in a tour", () => {
  P.STEPS.forEach((s) => {
    assert.ok(s.title.length <= 70, s.id + " title too long");
    ["scenario", "built", "why", "measure"].forEach((f) => assert.ok(s[f].length <= 400, s.id + "." + f + " is " + s[f].length + " chars"));
  });
});

test("every brightwheel claim is labelled with a source, and chatbot sources are marked unverified", () => {
  assert.match(P.SOURCES.bot.short, /unverified/i);
  assert.match(P.SOURCES.bot.full, /can be wrong/i);
  assert.match(P.SOURCES.both.full, /unverified/i);
  assert.ok(P.STEPS.every((s) => s.src));
});

test("the district step says its gap is partly unconfirmed", () => {
  const d = P.STEPS.find((s) => s.id === "district");
  assert.match(d.scenario, /partly unconfirmed/);
});

test("the welcome and wrap-up state what is simulated and what is not proven", () => {
  assert.match(P.WELCOME.note, /synthetic/);
  assert.match(P.WELCOME.note, /Not affiliated with brightwheel/);
  assert.match(P.WELCOME.p1, /Smart observations/);
  assert.match(P.CLOSE.limits, /scripted simulation/);
  assert.match(P.CLOSE.limits, /no sponsor has been asked/);
  assert.deepStrictEqual(P.CLOSE.plan.map((p) => p[0]), ["Weeks 1-2", "Weeks 3-4", "Weeks 5-8", "Weeks 9-12"]);
  assert.strictEqual(P.CLOSE.points.length, 5);
});

test("the guide is named, and both images exist and are real PNG files", () => {
  const fs = require("fs"), path = require("path");
  assert.strictEqual(P.MASCOT.name, "Product Builder Anshul");
  ["wave", "thumbs"].forEach((k) => {
    const f = path.join(__dirname, "..", P.MASCOT[k]);
    assert.ok(fs.existsSync(f), k + " image missing: " + P.MASCOT[k]);
    assert.strictEqual(fs.readFileSync(f).slice(0, 8).toString("hex"), "89504e470d0a1a0a", k + " is not a PNG");
    assert.ok(fs.statSync(f).size < 200 * 1024, k + " image is too heavy for a web page");
  });
});

test("the mode is called Builder mode in every visible string", () => {
  const fs = require("fs"), path = require("path");
  ["index.html", "tour.js", "builder.js", "guide-content.js"].forEach((f) => {
    const t = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    assert.ok(!/PM mode/.test(t.replace(/\/\*[\s\S]*?\*\//g, "")), f + " still says PM mode");
  });
});

test("no emojis in any tour text", () => {
  const all = JSON.stringify(P);
  assert.ok(!/\p{Extended_Pictographic}/u.test(all));
});

test("the tour does not claim things it has not done", () => {
  const all = JSON.stringify(P).toLowerCase();
  ["proven", "guarantee", "increases revenue", "ai-powered"].forEach((w) => assert.ok(!all.includes(w), "contains: " + w));
});

test("jargon is explained in plain words: no unexplained 'domain' in measures", () => {
  P.STEPS.forEach((s) => assert.ok(!/\bdomain\b/i.test(s.measure), s.id + " measure uses 'domain'"));
  const cov = P.STEPS.find((s) => s.id === "coverage");
  assert.match(cov.measure, /learning area/);
  assert.ok(!/review reminder/i.test(cov.built), "coverage step should not mention the reminder");
});

test("every measure says what to do with the number, not just what to count", () => {
  P.STEPS.forEach((s) => assert.ok(s.measure.length >= 60, s.id + " measure is too thin"));
  const d = P.STEPS.find((s) => s.id === "district");
  assert.match(d.measure, /two minutes/);
  assert.match(d.measure, /paid pilot/);
});

test("the review step targets the groups overview and names all four groups", () => {
  const r = P.STEPS.find((s) => s.id === "review");
  assert.strictEqual(r.target, "#groupbar");
  ["needs attention", "check the level", "clear matches", "needs your choice"].forEach((g) => assert.ok(r.built.toLowerCase().includes(g), "missing group: " + g));
  assert.strictEqual(r.setup.seed.length, 6);
});

test("measures use % for rates, not the word 'share'", () => {
  P.STEPS.forEach((s) => assert.ok(!/\bshare\b/i.test(s.measure), s.id + " measure says 'share'"));
  assert.match(P.STEPS.find((s) => s.id === "why").measure, /^% of drafts/);
  assert.match(P.STEPS.find((s) => s.id === "coverage").measure, /^% of children/);
  assert.match(P.STEPS.find((s) => s.id === "review").measure, /% of drafts approved without changes/);
});

test("a measure only uses terms the screen shows: 'jump' yes, 'flag' no", () => {
  const b = P.STEPS.find((s) => s.id === "benchmark");
  assert.match(b.measure, /jumps? \(2 or more levels\)/);
  assert.match(b.measure, /after the check/);
  P.STEPS.forEach((s) => assert.ok(!/\bflag/i.test(s.measure), s.id + " measure says 'flag'"));
});

test("the injury and illness measure is short and has two clear percentages", () => {
  const v = P.STEPS.find((s) => s.id === "visibility");
  assert.ok(v.measure.length <= 200, "too long: " + v.measure.length);
  assert.strictEqual((v.measure.match(/%/g) || []).length, 3);   // two rates and the 100% target
  assert.ok(!/two numbers|how often an entry/i.test(v.measure));
});

test("the business point reads plainly", () => {
  const t = P.CLOSE.points.find((p) => /business/i.test(p[0]));
  assert.ok(t[1].length <= 140);
  assert.ok(!/sponsor-paid/i.test(t[1]));
  assert.match(t[1], /multi-year contract/);
});

test("the 90-day plan is four short rows: a period and one sentence each", () => {
  assert.strictEqual(P.CLOSE.plan.length, 4);
  P.CLOSE.plan.forEach((p) => { assert.match(p[0], /^Weeks \d+-\d+$/); assert.ok(p[1].length <= 80, p[1]); assert.match(p[1], /\.$/); });
  assert.ok(!("next" in P.CLOSE));
});

test("every step has a fallback place for its number, so all six show when Builder mode is on", () => {
  P.STEPS.forEach((s) => { assert.ok(Array.isArray(s.fallback) && s.fallback.length >= 1 && s.fallback.every((x) => typeof x === "string" && x.length), s.id + " has no fallback"); });
  assert.ok(P.STEPS.find((s) => s.id === "district").fallback[0].includes("district"));
  assert.ok(P.STEPS.find((s) => s.id === "review").fallback[0].includes("review"));
});
