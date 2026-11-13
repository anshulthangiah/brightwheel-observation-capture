// v1.2.0 browser tests. Written to FAIL on v1.1.0 (the things the user reported on a real phone) and pass on v1.2.0.
//   node tests-ui/v120.js
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".png": "image/png" };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(root, u === "/" ? "index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", mime[path.extname(f)] || "application/octet-stream"); r.end(d); } }); });
const results = []; const ok = (n, c, extra) => results.push((c ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : ""));

(async () => {
  const port = await new Promise((r) => srv.listen(0, () => r(srv.address().port)));
  const base = "http://localhost:" + port + "/?notour";
  const b = await chromium.launch();
  const errs = [];

  // ------------------------------------------------------------ PHONE
  for (const [label, w, h] of [["phone 375x667", 375, 667], ["phone 390x844", 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message)); await pg.addInitScript(() => { window.SIM_SPEED = 0.05; });
    await pg.goto(base); await pg.waitForTimeout(400);
    const view = () => pg.evaluate(() => { const r = document.getElementById("capture-detail").getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });

    // the tap on a moment must bring the Capture panel into view
    await pg.evaluate(() => window.scrollTo(0, 300));
    await pg.tap('#capture-list li[data-id="c1"]'); await pg.waitForTimeout(900);
    let v = await view();
    ok(label + ": tapping a moment brings the Capture panel into view (its top is on screen, near the top)", v.top >= -2 && v.top < v.vh * 0.5, JSON.stringify(v));
    ok(label + ": after the tap the panel shows the camera step, not an empty prompt", /Tap to take the photo/.test(await pg.locator("#stage").innerText()));
    // and again from the list's bottom: tap the last moment
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(100);
    await pg.evaluate(() => document.querySelector('#capture-list li[data-id="c10"]').scrollIntoView({ block: "center" })); await pg.waitForTimeout(150);
    await pg.tap('#capture-list li[data-id="c10"]'); await pg.waitForTimeout(900);
    v = await view();
    ok(label + ": tapping the last moment in the list also brings the panel into view", v.top >= -2 && v.top < v.vh * 0.5, JSON.stringify(v));
    ok(label + ": the shared page is not wider than the screen", (await pg.evaluate(() => document.documentElement.scrollWidth)) <= w + 1);
    await ctx.close();
  }
  // wide screen: tapping a moment must NOT scroll the page
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message));
    await pg.goto(base); await pg.waitForTimeout(300); const y0 = await pg.evaluate(() => scrollY);
    await pg.locator('#capture-list li[data-id="c1"]').click(); await pg.waitForTimeout(500);
    ok("wide screen: tapping a moment does not scroll the page", (await pg.evaluate(() => scrollY)) === y0);
    await ctx.close();
  }

  // ------------------------------------------------------------ DESKTOP flows
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message)); await pg.addInitScript(() => { window.SIM_SPEED = 0.05; });
  await pg.goto(base);
  const text = (s) => pg.locator(s).innerText();
  const vis = (s) => pg.locator(s).isVisible();
  const play = async (i) => { await pg.locator("#capture-list li").nth(i).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click(); await pg.waitForFunction(() => document.querySelector("#stage").dataset.phase === "ready"); };

  // the nudge counts the learning area
  await play(0);   // c1 Leo, Verbally counts numbers (Mathematics)
  const nudge = await text("#stage .nudge");
  ok("nudge names the learning area (Mathematics), not the skill 'Verbally counts numbers'", /^Mathematics:/.test(nudge) && !/Verbally counts numbers/.test(nudge), nudge);
  ok("nudge says 'in this learning area' so it cannot be read as one exact skill", /6 of 10 children have an observation in this learning area in the last three months/.test(nudge) && /Nothing yet for Noah, Omar, Zara, Ben/.test(nudge), nudge);

  // an unset benchmark must not read as contradicting the last rating
  await pg.locator("#make-draft").click();

  // Maya + Noah: pick both for the tower moment, save, review
  await pg.locator(".subnav button[data-tab=capture]").click();
  await pg.locator("#capture-list li").nth(0).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click();
  await pg.waitForFunction(() => document.querySelector("#stage").dataset.phase === "ready");
  // the tower moment names Leo. The teacher adds Maya and Noah, and answers "Keep?" for each (exactly the case in the user's phone screenshot)
  await pg.locator('#chips [data-child="maya"]').click(); await pg.locator('#chips [data-child="noah"]').click();
  await pg.locator("#make-draft").click();
  await pg.locator("[data-keep=maya]").click(); await pg.locator("[data-keep=noah]").click();
  await pg.locator('.subnav button[data-tab="review"]').click();
  const card = pg.locator("#queue .card", { hasText: "Maya" }).first();
  // Maya's own row for "Verbally counts numbers": her last rating is 4 (Oct 12, Ms. Rivera) and no new benchmark is set yet
  const mayaRow = card.locator(".lvrow", { has: pg.locator('select[data-child="maya"][data-goal="M1a"]') });
  const mayaText = (await mayaRow.innerText()).replace(/\s+/g, " ");
  ok("Maya's row: a dropdown that says 'Set benchmark' beside 'Last rating: 4 (Oct 12, Ms. Rivera)', so 'not set yet' is the new benchmark and the 4 is the old one", /Set benchmark/.test(mayaText) && /Last rating: 4 \(Oct 12, Ms\. Rivera\)/.test(mayaText), mayaText.slice(0, 140));
  ok("the old wording 'last: 4' is gone", !/\blast: \d/.test(await text("#queue")));

  // a drop is labelled a drop
  const sel = card.locator('select[data-child="maya"][data-goal="M1a"]');
  await sel.selectOption("1"); await pg.waitForTimeout(200);
  const card2 = pg.locator("#queue .card", { hasText: "Maya" }).first();
  const tags = await card2.locator('.lvrow:has(select[data-child="maya"][data-goal="M1a"]) .jumptag').allInnerTexts();
  ok("Maya 4 to 1 shows 'Drop of 3 levels. Needs a check.' and never 'Jump of 3 levels'", tags.length === 1 && /^Drop of 3 levels\. Needs a check\.$/.test(tags[0]), tags.join(" | "));
  const flag = await card2.locator(".flagbox").innerText();
  ok("Check before logging has one list item per child and skill", (await card2.locator(".flagbox li").count()) >= 1);
  ok("each item gives the last rating, the new benchmark and the change on its own line", /Last rating 4 \(Ms\. Rivera, Oct 12\)\. New benchmark 1\. Drop of 3 levels\./.test(flag), flag.replace(/\n/g, " / "));
  ok("a drop is never written as 'a jump of -3'", !/jump of -\d/i.test(flag) && !/-\d/.test(flag.replace(/Oct \d+/g, "")), flag.replace(/\n/g, " / "));
  const li = await card2.locator(".flagbox li").first().evaluate((el) => ({ br: el.querySelectorAll("br").length, h: el.getBoundingClientRect().height }));
  ok("the two parts of an item are on separate lines (a line break between them)", li.br === 1 && li.h > 30);
  await pg.screenshot({ path: "/tmp/v120-flagbox.png" });
  // a rise is still a jump
  await sel.selectOption("7"); await pg.waitForTimeout(200);
  const up = await pg.locator("#queue .card", { hasText: "Maya" }).first().locator('.lvrow:has(select[data-child="maya"][data-goal="M1a"]) .jumptag').allInnerTexts();
  ok("Maya 4 to 7 still shows 'Jump of 3 levels'", up.some((t) => /^Jump of 3 levels\. Needs a check\.$/.test(t)), up.join(" | "));

  // export CSV
  await pg.locator('.topnav button[data-tab="district"]').click();
  ok("before any tap the CSV data box is closed and the status line is empty", !(await vis("#csv-preview")) && (await text("#csv-status")).trim() === "");
  const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 4000 }).catch(() => null), pg.locator("#export-csv").click()]);
  ok("Export CSV hands a real .csv file to the browser", !!dl && /\.csv$/.test(dl ? dl.suggestedFilename() : ""), dl ? dl.suggestedFilename() : "no download");
  ok("Export CSV does NOT open the data box", !(await vis("#csv-preview")));
  ok("Export CSV says what happened, in one line", /Sent to your browser as district-evidence-quality\.csv \(3 sites\)\. Check your downloads\./.test(await text("#csv-status")), await text("#csv-status"));
  await pg.locator("#show-csv").click();
  ok("'Show the data' opens the data and the button says 'Hide the data'", (await vis("#csv-preview")) && /^site,type,rooms/.test(await text("#csv-preview")) && /Hide the data/.test(await text("#show-csv")) && (await pg.locator("#show-csv").getAttribute("aria-expanded")) === "true");
  await pg.locator("#show-csv").click();
  ok("'Hide the data' closes it again", !(await vis("#csv-preview")) && /Show the data/.test(await text("#show-csv")));

  console.log(results.join("\n")); console.log("page errors:", JSON.stringify(errs));
  console.log("SUMMARY pass=" + results.filter((x) => x.startsWith("PASS")).length + " fail=" + results.filter((x) => x.startsWith("FAIL")).length);
  await b.close(); srv.close(); process.exit(results.some((x) => x.startsWith("FAIL")) || errs.length ? 1 : 0);
})().catch((e) => { console.log(results.join("\n")); console.log("CRASH", e.message); process.exit(1); });
