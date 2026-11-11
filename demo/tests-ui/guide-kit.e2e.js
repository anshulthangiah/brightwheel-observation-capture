// Generic end-to-end test for the Product Builder guide kit (Take a Tour + Builder mode).
// It reads window.GUIDE from the page, so the same file tests any project that uses the kit.
//   node tests-ui/guide-kit.js [folder-with-index.html] [start-file]
// Needs playwright + chromium. Pass criteria are the signature rules in the take-a-tour and builder-mode skills.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const START = process.argv[3] || "index.html";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".png": "image/png", ".json": "application/json" };
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(root, u === "/" ? START : u); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", mime[path.extname(f)] || "text/plain"); r.end(d); } }); });
const results = []; const ok = (n, c, extra) => results.push((c ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : ""));
const shot = (pg, n) => pg.screenshot({ path: "/tmp/guide-kit-" + n + ".png" });

(async () => {
  const port = await new Promise((r) => srv.listen(0, () => r(srv.address().port)));
  const base = "http://localhost:" + port + "/";
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await pg.addInitScript(() => { window.SIM_SPEED = 0.05; });
  const vis = (s) => pg.locator(s).isVisible();
  const text = (s) => pg.locator(s).innerText();
  const box = (sel) => pg.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.offsetWidth || e.offsetHeight || e.getClientRects().length); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
  const overlap = (a, c) => !(a.x + a.width <= c.x || a.x >= c.x + c.width || a.y + a.height <= c.y || a.y >= c.y + c.height);
  const mascotLoaded = (scope) => pg.evaluate((scope) => { const i = document.querySelector(scope + " img.mascot"); return !!i && i.naturalWidth > 0; }, scope);
  const visibleMascots = () => pg.evaluate(() => [...document.querySelectorAll("img[src*='mascot']")].filter((i) => i.offsetWidth || i.offsetHeight).length);

  // ================================================================ Take a Tour
  await pg.goto(base + (START === "index.html" ? "" : START));
  await pg.waitForSelector("#tour-card:not([hidden])", { timeout: 5000 });
  const C = await pg.evaluate(() => JSON.parse(JSON.stringify(window.GUIDE)));
  const N = C.STEPS.length, name = C.MASCOT.name;
  ok("first visit opens the welcome card by itself", await vis("#tour-card"));
  ok("welcome names the guide and shows his picture", new RegExp(name).test(await text("#tour-card")) && (await mascotLoaded("#tour-card")));
  ok("welcome offers Start (N stops) and Skip", new RegExp("Start \\(" + N + " stops\\)").test(await text("#t-next")) && (await vis("#t-skip")));
  await shot(pg, "welcome");
  await pg.locator("#t-next").click();

  for (let i = 0; i < N; i++) {
    const s = C.STEPS[i], tag = "stop " + (i + 1) + ": ";
    await pg.waitForTimeout(450);
    const t = await text("#tour-card");
    ok(tag + "title and 'Stop " + (i + 1) + " of " + N + "'", t.includes(s.title) && new RegExp("Stop " + (i + 1) + " of " + N).test(t));
    ok(tag + "one source label", (await pg.locator("#tour-card .srcchip").count()) === 1);
    const order = (await pg.locator("#tour-card dt").allInnerTexts()).map((x) => x.toLowerCase()).join("|");
    ok(tag + "four rows in the signature order, one column", order === "today|what i built|why it should work|how i would measure it", order);
    ok(tag + "guide picture and name in the card header", (await mascotLoaded("#tour-card .thead")) && new RegExp(name).test(await text("#tour-card .thead")));
    const tgt = await box(s.target), rb = await pg.locator("#tour-ring").boundingBox(), cb = await pg.locator("#tour-card").boundingBox();
    ok(tag + "the live feature exists on screen", !!tgt, s.target);
    if (tgt && rb) {
      ok(tag + "spotlight ring sits on the feature", rb.x <= tgt.x + 1 && rb.y <= tgt.y + 1 && rb.x + rb.width >= tgt.x + tgt.width - 1 && rb.y + rb.height >= tgt.y + tgt.height - 1);
      ok(tag + "the feature is on screen, not scrolled away", tgt.y >= 0 && tgt.y + Math.min(tgt.height, 40) <= 900);
      ok(tag + "the card never covers the feature", !overlap(cb, rb));
    }
    ok(tag + "card is docked at the right, full height, same place as every stop", Math.abs(cb.x + cb.width - 1268) <= 2 && cb.width >= 370 && cb.width <= 390 && cb.y <= 14, JSON.stringify([cb.x, cb.y, cb.width, cb.height].map(Math.round)));
    ok(tag + "Back and Next are on screen", await pg.evaluate(() => { const r = document.getElementById("t-next").getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
    const y0 = await pg.evaluate(() => scrollY);
    await pg.mouse.move(300, 400); await pg.mouse.wheel(0, 700); await pg.keyboard.press("PageDown"); await pg.waitForTimeout(150);
    ok(tag + "the page cannot be scrolled by hand during the tour", (await pg.evaluate(() => scrollY)) === y0);
    if (i === 0 || i === N - 1) await shot(pg, "stop" + (i + 1));
    await pg.locator("#t-next").click();
  }

  // wrap-up
  await pg.waitForTimeout(250);
  const A = C.CLOSE.ctas;
  ok("wrap-up shows the guide, the points and what is not proven", (await mascotLoaded("#tour-card")) && (await pg.locator("#tour-card .tclose li").count()) === C.CLOSE.points.length && /What this does not prove/.test(await text("#tour-card")));
  ok("wrap-up shows the plan as rows, not a paragraph", (await pg.locator("#tour-card .planlist > div").count()) === C.CLOSE.plan.length);
  ok("wrap-up has exactly two big actions, each a verb plus a one-line result", (await pg.locator("#tour-card .cta").count()) === 2 && (await text("#t-try")).includes(A.try.title) && (await text("#t-try")).includes(A.try.desc) && (await text("#t-builder")).includes(A.builder.title) && (await text("#t-builder")).includes(A.builder.desc));
  ok("wrap-up fits without inner scrolling", await pg.evaluate(() => { const c = document.getElementById("tour-card"); return c.scrollHeight <= c.clientHeight + 1; }));
  await shot(pg, "wrapup");
  await pg.locator("#t-try").click(); await pg.waitForTimeout(300);
  ok("'Try the prototype' closes the tour cleanly", !(await vis("#tour-card")) && !(await vis("#tour-ring")) && !(await vis("#tour-dim")));
  ok("the page can scroll again and is not squeezed", await pg.evaluate(() => getComputedStyle(document.documentElement).overflow !== "hidden" && getComputedStyle(document.body).paddingRight === "0px"));
  ok("no guide picture is visible once the tour is closed and Builder mode is off", (await visibleMascots()) === 0);

  // remembered, replay, keys
  await pg.reload(); await pg.waitForTimeout(900);
  ok("the tour does not reopen once it has been seen", !(await vis("#tour-card")));
  await pg.locator("#tour-start").click();
  ok("'" + C.META.tourButton + "' reopens it", await vis("#tour-card"));
  await pg.keyboard.press("Escape");
  ok("Escape closes it", !(await vis("#tour-card")) && !(await vis("#tour-dim")));
  await pg.locator("#tour-start").click(); await pg.keyboard.press("ArrowRight");
  ok("ArrowRight advances", /Stop 1 of/.test(await text("#tour-card")));
  await pg.keyboard.press("ArrowLeft");
  ok("ArrowLeft goes back", new RegExp(C.WELCOME.title).test(await text("#tour-card")));
  await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab");
  ok("Tab keeps focus inside the card", await pg.evaluate(() => document.getElementById("tour-card").contains(document.activeElement)));
  await pg.locator("#t-next").click(); await pg.locator("#t-skip").click(); await pg.waitForTimeout(700);
  ok("skipping right after a stop leaves no ring, no dimming, no lock", !(await vis("#tour-ring")) && !(await vis("#tour-dim")) && (await pg.evaluate(() => getComputedStyle(document.documentElement).overflow !== "hidden")));

  // ================================================================ Builder mode
  const sw = "#builder-toggle";
  ok("Builder mode starts Off: the switch says so and nothing is drawn", /off/i.test(await text(sw)) && (await pg.locator(sw).getAttribute("aria-checked")) === "false" && (await pg.locator(".bmark").count()) === 0 && !(await vis("#builder-legend")));
  await pg.locator(sw).click(); await pg.waitForTimeout(350);
  ok("the switch says On and turns orange", /on/i.test(await text(sw)) && !/off/i.test(await text(sw)) && (await pg.locator(sw).getAttribute("aria-checked")) === "true" && (await pg.evaluate(() => getComputedStyle(document.querySelector("#builder-toggle .bsw-track")).backgroundColor)) === "rgb(255, 106, 61)");
  const ms = await pg.locator(".bmark").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { n: e.textContent.trim(), id: e.dataset.step, x: r.x, y: r.y, w: r.width, h: r.height }; }));
  ok("every number is shown the moment it is switched on, with nothing loaded", ms.length === N && ms.map((m) => m.n).sort().join("") === C.STEPS.map((s) => s.n).sort().join(""), ms.map((m) => m.n).join(","));
  ok("every number is fully on screen", ms.every((m) => m.x >= 0 && m.y >= 0 && m.x + m.w <= 1280 && m.y + m.h <= 900));
  let clash = false; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (Math.abs(ms[i].x - ms[j].x) < 28 && Math.abs(ms[i].y - ms[j].y) < 28) clash = true;
  ok("no two numbers overlap", !clash);
  ok("the legend lists every gap, with the guide picture", (await pg.locator("#builder-legend .lgbtn").count()) === N && (await mascotLoaded("#builder-legend")));
  const hint = await text("#builder-legend .lghint");
  ok("the hint starts 'Tap a number for the detail.' and says where numbers are", /^Tap a number for the detail\./.test(hint) && hint.length > 40, hint);
  await shot(pg, "builder-on");
  await pg.locator('.bmark[data-step="' + C.STEPS[0].id + '"]').click(); await pg.waitForTimeout(250);
  const bc = await pg.locator("#builder-card").boundingBox();
  ok("a number opens its card with the same four rows in the same order", (await text("#builder-card")).includes(C.STEPS[0].title) && (await pg.locator("#builder-card dt").allInnerTexts()).map((x) => x.toLowerCase()).join("|") === "today|what i built|why it should work|how i would measure it");
  ok("the card is docked in the same place as the tour card", Math.abs(bc.x + bc.width - 1268) <= 2 && bc.width >= 370 && bc.width <= 390);
  const pin = await box(C.STEPS[0].pin);
  ok("the card does not cover the feature it describes", !pin || !overlap(bc, pin));
  ok("the guide picture is in the legend only: not in the card, the header or the app", (await pg.locator("#builder-card img").count()) === 0 && (await pg.locator("header img, main img[src*='mascot']").count()) === 0 && (await mascotLoaded("#builder-legend")));
  await shot(pg, "builder-card");
  await pg.keyboard.press("Escape");
  ok("Escape closes the card", !(await vis("#builder-card")));
  await pg.locator('#builder-legend .lgbtn[data-step="' + C.STEPS[N - 1].id + '"]').click(); await pg.waitForTimeout(200);
  ok("the legend opens any gap, even when its feature is not on this screen", await vis("#builder-card") && (await text("#builder-card")).includes(C.STEPS[N - 1].title));
  await pg.locator("#builder-show").click(); await pg.waitForTimeout(400);
  ok("'Show me' closes the card and brings the feature into view", !(await vis("#builder-card")) && !!(await box(C.STEPS[N - 1].pin)));
  await pg.locator(sw).click(); await pg.waitForTimeout(250);
  ok("switching Builder mode off clears every number and the legend", (await pg.locator(".bmark").count()) === 0 && !(await vis("#builder-legend")) && (await visibleMascots()) === 0);

  console.log(results.join("\n")); console.log("page errors:", JSON.stringify(errs));
  console.log("SUMMARY pass=" + results.filter((x) => x.startsWith("PASS")).length + " fail=" + results.filter((x) => x.startsWith("FAIL")).length);
  await b.close(); srv.close(); process.exit(results.some((x) => x.startsWith("FAIL")) || errs.length ? 1 : 0);
})().catch((e) => { console.log(results.join("\n")); console.log("CRASH", e.message); process.exit(1); });
