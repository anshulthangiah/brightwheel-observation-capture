// Generic unit test for the content file (guide-content.js) used by the Product Builder guide kit.
// Checks the signature rules that do not depend on the product. Copy it with the kit; run with `node --test`.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const G = require("../guide-content.js");

test("META and BUILDER settings exist and the mode is called Builder mode", () => {
  ["storageKey", "tourButton", "builderLabel", "builderAria"].forEach((k) => assert.ok(typeof G.META[k] === "string" && G.META[k].length, "META." + k));
  assert.strictEqual(G.META.builderLabel, "Builder mode");
  assert.ok(G.BUILDER && typeof G.BUILDER.title === "string" && typeof G.BUILDER.cornerHint === "string");
  if (G.BUILDER.slot) ["when", "into", "caption", "where", "open"].forEach((k) => assert.ok(G.BUILDER.slot[k], "BUILDER.slot." + k));
});

test("steps are numbered 1..N in order, with unique ids and every field the cards need", () => {
  assert.ok(G.STEPS.length >= 3 && G.STEPS.length <= 8, "between 3 and 8 stops");
  assert.deepStrictEqual(G.STEPS.map((s) => s.n), G.STEPS.map((_, i) => i + 1));
  assert.strictEqual(new Set(G.STEPS.map((s) => s.id)).size, G.STEPS.length);
  G.STEPS.forEach((s) => {
    ["id", "title", "scenario", "built", "why", "measure", "target", "pin"].forEach((f) => assert.ok(typeof s[f] === "string" && s[f].length, s.id + " missing " + f));
    assert.ok(G.SOURCES[s.src], s.id + " has an unknown source label");
    assert.ok(s.setup && typeof s.setup.view === "string", s.id + " needs setup.view");
    assert.ok(Array.isArray(s.fallback) && s.fallback.length >= 1, s.id + " needs a fallback anchor so its number always shows");
  });
});

test("cards stay short enough to read in a tour", () => {
  G.STEPS.forEach((s) => {
    assert.ok(s.title.length <= 70, s.id + " title too long");
    ["scenario", "built", "why", "measure"].forEach((f) => assert.ok(s[f].length <= 400, s.id + "." + f + " is " + s[f].length + " chars"));
    assert.ok(s.measure.length >= 40, s.id + " measure is too thin");
  });
});

test("plain wording: rates as %, no 'share', no 'flag', no 'domain' jargon in measures", () => {
  G.STEPS.forEach((s) => {
    assert.ok(!/\bshare\b/i.test(s.measure), s.id + " measure says 'share', write a % instead");
    assert.ok(!/\bflag/i.test(s.measure), s.id + " measure says 'flag', use the word the screen shows");
    assert.ok(!/\bdomain\b/i.test(s.measure), s.id + " measure uses 'domain'");
  });
});

test("no emojis and no claims the work has not earned", () => {
  const all = JSON.stringify(G);
  assert.ok(!/\p{Extended_Pictographic}/u.test(all), "emoji found");
  ["proven", "guarantee", "increases revenue", "ai-powered", "see the spec"].forEach((w) => assert.ok(!all.toLowerCase().includes(w), "contains: " + w));
});

test("sources: chatbot-only claims are marked unverified", () => {
  assert.match(G.SOURCES.bot.short, /unverified/i);
  assert.match(G.SOURCES.bot.full, /can be wrong/i);
  assert.match(G.SOURCES.both.full, /unverified/i);
});

test("welcome and wrap-up state what is simulated, what is not proven, and what comes next", () => {
  assert.match(G.WELCOME.note, /synthetic|simulat/i);
  assert.match(G.WELCOME.note, /not affiliated/i);
  assert.ok(G.CLOSE.points.length >= 3 && G.CLOSE.points.length <= 6);
  assert.match(G.CLOSE.limits, /simulat/i);
  assert.ok(G.CLOSE.plan.length >= 3 && G.CLOSE.plan.length <= 6);
  G.CLOSE.plan.forEach((p) => { assert.ok(p[0].length <= 14, p[0]); assert.ok(p[1].length <= 90 && /\.$/.test(p[1]), p[1]); });
  ["try", "builder"].forEach((k) => { assert.ok(G.CLOSE.ctas[k].title && G.CLOSE.ctas[k].desc, "ctas." + k); });
  assert.ok(G.CLOSE.ctas.try.title.length <= 28 && G.CLOSE.ctas.builder.title.length <= 28);
});

test("the guide is named, and both pictures exist, are real PNG files and are light enough for a web page", () => {
  assert.ok(G.MASCOT.name && /\w+ \w+/.test(G.MASCOT.name));
  ["wave", "thumbs"].forEach((k) => {
    const f = path.join(__dirname, "..", G.MASCOT[k]);
    assert.ok(fs.existsSync(f), k + " image missing: " + G.MASCOT[k]);
    assert.strictEqual(fs.readFileSync(f).slice(0, 8).toString("hex"), "89504e470d0a1a0a", k + " is not a real PNG");
    assert.ok(fs.statSync(f).size < 200 * 1024, k + " image is too heavy");
  });
});

test("the guide kit files and styles are all present and the page loads them in order", () => {
  const dir = path.join(__dirname, "..");
  ["guide-common.js", "tour.js", "builder.js", "guide.css", "tour.css", "builder.css", "guide-content.js"].forEach((f) => assert.ok(fs.existsSync(path.join(dir, f)), f + " missing"));
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const pos = (s) => html.indexOf(s);
  assert.ok(pos("guide-content.js") > -1 && pos("guide-content.js") < pos("guide-common.js") && pos("guide-common.js") < pos("tour.js") && pos("tour.js") < pos("builder.js"), "script order: content, common, tour, builder");
  assert.ok(html.includes('id="guide-controls"'), "index.html needs <div id=\"guide-controls\"></div> for the two buttons");
});
