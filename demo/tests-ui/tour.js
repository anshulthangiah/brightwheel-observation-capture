// Real-browser test of the first-run tour and Builder mode. Run: npm run test:tour (needs playwright + chromium)
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(root, u === "/" ? "index.html" : u); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", mime[path.extname(f)] || "text/plain"); r.end(d); } }); });
const results = []; const ok = (n, c, extra) => results.push((c ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : ""));
const shot = (pg, n) => pg.screenshot({ path: "/tmp/oc-" + n + ".png" });

(async () => {
  await new Promise((r) => srv.listen(8797, r));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await pg.addInitScript(() => { window.SIM_SPEED = 0.05; });
  const vis = (s) => pg.locator(s).isVisible();
  const text = (s) => pg.locator(s).innerText();

  // ---- first visit opens the welcome card by itself
  await pg.goto("http://localhost:8797/");
  await pg.waitForSelector("#tour-card:not([hidden])", { timeout: 4000 });
  ok("first visit opens the tour welcome", (await vis("#tour-card")) && /A two-minute tour/.test(await text("#tour-card")));
  ok("welcome says what it is and that it is simulated and unaffiliated", /Smart observations/.test(await text("#tour-card")) && /synthetic/.test(await text("#tour-card")) && /Not affiliated with brightwheel/.test(await text("#tour-card")));
  ok("welcome shows the guide: image loaded and named Product Builder Anshul", (await pg.evaluate(() => { const i = document.querySelector("#tour-card img.mascot"); return !!i && i.naturalWidth > 0; })) && /Product Builder Anshul/.test(await text("#tour-card")));
  await shot(pg, "t0-welcome");

  // ---- walk all six stops
  await pg.locator("#t-next").click();
  const wants = [/Every suggestion says why/, /A benchmark for each child/, /Who is still missing/, /Who sees it is a choice/, /A review teachers will actually finish/, /district or state can see/];
  const targets = ["#stage .goal .why", "#stage .levels", "#stage .nudge", "#stage .visctl", "#groupbar", "#district .distwrap"];
  for (let i = 0; i < 6; i++) {
    const t = await text("#tour-card");
    ok("stop " + (i + 1) + " title and 'Stop " + (i + 1) + " of 6'", wants[i].test(t) && new RegExp("Stop " + (i + 1) + " of 6").test(t));
    ok("stop " + (i + 1) + " has Current scenario, What I built, Why it should work, How I would measure it", /current scenario/i.test(t) && /what i built/i.test(t) && /why it should work/i.test(t) && /how i would measure it/i.test(t));
    ok("stop " + (i + 1) + " shows a source label", (await pg.locator("#tour-card .srcchip").count()) === 1);
    await pg.waitForTimeout(450);
    const ringOk = await vis("#tour-ring");
    const tgt = await pg.locator(targets[i]).first().boundingBox();
    const rb = await pg.locator("#tour-ring").boundingBox();
    ok("stop " + (i + 1) + " spotlight sits on the live feature", ringOk && tgt && rb && rb.x <= tgt.x + 1 && rb.y <= tgt.y + 1 && rb.x + rb.width >= tgt.x + tgt.width - 1 && rb.y + rb.height >= tgt.y + tgt.height - 1, JSON.stringify({ rb: [rb.x, rb.y, rb.width, rb.height].map(Math.round), tgt: [tgt.x, tgt.y, tgt.width, tgt.height].map(Math.round) }));
    ok("stop " + (i + 1) + " the highlighted feature is on screen, not scrolled away", tgt.y >= 0 && tgt.y + Math.min(tgt.height, 40) <= 900);
    const cb = await pg.locator("#tour-card").boundingBox();
    ok("stop " + (i + 1) + " card is docked on the right, full height, in the same place as every other stop", Math.abs(cb.x + cb.width - 1268) <= 2 && cb.width >= 370 && cb.width <= 390 && cb.y <= 14, JSON.stringify([cb.x, cb.y, cb.width, cb.height].map(Math.round)));
    const overlap = !(cb.x + cb.width <= rb.x || cb.x >= rb.x + rb.width || cb.y + cb.height <= rb.y || cb.y >= rb.y + rb.height);
    ok("stop " + (i + 1) + " card does not cover the spotlight", !overlap);
    ok("stop " + (i + 1) + " shows the guide in the dock header, image loaded and named", (await pg.evaluate(() => { const i = document.querySelector("#tour-card .thead img.mascot"); return !!i && i.naturalWidth > 0; })) && /Product Builder Anshul/.test(await text("#tour-card .thead")));
    const order = await pg.locator("#tour-card dt").allInnerTexts();
    ok("stop " + (i + 1) + " rows are in the same order, one column", order.map((x) => x.toLowerCase()).join("|") === "current scenario|what i built|why it should work|how i would measure it");
    ok("stop " + (i + 1) + " next and back buttons are on screen", await pg.evaluate(() => { const r = document.getElementById("t-next").getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
    // the viewer cannot scroll the page away from the feature
    const y0 = await pg.evaluate(() => scrollY);
    await pg.mouse.move(300, 400); await pg.mouse.wheel(0, 700); await pg.keyboard.press("PageDown"); await pg.waitForTimeout(150);
    ok("stop " + (i + 1) + " page does not scroll during the tour", (await pg.evaluate(() => scrollY)) === y0);
    if (i <= 5) await shot(pg, "t" + (i + 1) + "-stop");
    if (i === 1) ok("stop 2: the spotlighted feature itself says 'Jump of 3 levels', the term the card uses", /Jump of 3 levels/.test(await pg.locator("#stage .levels").first().innerText()) && /% of big jumps/.test(await text("#tour-card")));
    if (i === 4) {
      const g = await pg.locator("#groupbar .gchip").allInnerTexts();
      ok("stop 5 spotlight shows all four review groups with counts", g.length === 4 && /Needs your attention/.test(g[0]) && /Check the level/.test(g[1]) && /Clear matches/.test(g[2]) && /Needs your choice/.test(g[3]) && (await pg.locator("#groupbar .gchip.zero").count()) === 0, g.join(" / "));
    }
    await pg.locator("#t-next").click();
  }

  // ---- wrap-up
  ok("wrap-up shows how I work and what is not proven", /What this shows about how I work/.test(await text("#tour-card")) && /What this does not prove/.test(await text("#tour-card")) && /no sponsor has been asked/.test(await text("#tour-card")));
  ok("wrap-up shows the first 90 days as four short rows, not a paragraph", (await pg.locator("#tour-card .planlist > div").count()) === 4 && /What I would do first/.test(await text("#tour-card")) && (await pg.locator("#tour-card .planlist dt").allInnerTexts()).join("|") === "Weeks 1-2|Weeks 3-4|Weeks 5-8|Weeks 9-12");
  ok("the wrap-up card needs no inner scrolling, so both buttons are visible", await pg.evaluate(() => { const c = document.getElementById("tour-card"); return c.scrollHeight <= c.clientHeight + 1; }));
  ok("wrap-up has two clear actions, each with a verb and a one-line result", (await vis("#t-try")) && (await vis("#t-builder")) && /Try the prototype/.test(await text("#t-try")) && /Capture a moment yourself/.test(await text("#t-try")) && /Turn on Builder mode/.test(await text("#t-builder")) && /marked on the live screens/.test(await text("#t-builder")));
  ok("the primary action is visually the strongest", await pg.evaluate(() => getComputedStyle(document.getElementById("t-try")).backgroundColor !== getComputedStyle(document.getElementById("t-builder")).backgroundColor));
  ok("wrap-up fits on screen", await pg.evaluate(() => { const r = document.getElementById("tour-card").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  ok("wrap-up shows the guide, image loaded", await pg.evaluate(() => { const i = document.querySelector("#tour-card img.mascot"); return !!i && i.naturalWidth > 0; }));
  await shot(pg, "t7-wrap");
  await pg.locator("#t-try").click();
  ok("'Try the prototype' closes the tour and leaves the clean Teacher capture page", !(await vis("#tour-card")) && (await vis("#tab-capture")) && (await text("#badge")).trim() === "0");
  ok("with the tour closed and Builder mode off, no guide image is visible anywhere", (await pg.evaluate(() => [...document.querySelectorAll("img[src*='mascot']")].filter((i) => i.offsetWidth || i.offsetHeight).length)) === 0);
  ok("the page can scroll again after the tour", await pg.evaluate(() => getComputedStyle(document.documentElement).overflow !== "hidden"));
  ok("tour state did not leave drafts behind", (await pg.locator("#capture-list li.done").count()) === 0);

  // a fast skip must not leave the spotlight or dimming behind (a delayed step used to redraw the ring after close)
  await pg.locator("#tour-start").click(); await pg.locator("#t-next").click(); await pg.locator("#t-skip").click();
  await pg.waitForTimeout(700);
  ok("skipping right after a stop leaves no spotlight ring and no dimming", !(await vis("#tour-ring")) && !(await vis("#tour-dim")) && !(await vis("#tour-card")));
  ok("and the page is not locked or squeezed", await pg.evaluate(() => getComputedStyle(document.documentElement).overflow !== "hidden" && getComputedStyle(document.body).paddingRight === "0px"));
  await pg.locator("#tour-start").click(); await pg.waitForTimeout(150);
  ok("the welcome card is centred and does not squeeze the page", await pg.evaluate(() => getComputedStyle(document.body).paddingRight === "0px"));
  await pg.locator("#t-skip").click();

  // ---- remembered: a reload does not reopen it
  await pg.reload(); await pg.waitForTimeout(900);
  ok("tour does not reopen after it has been seen", !(await vis("#tour-card")));
  await pg.locator("#tour-start").click();
  ok("'Take the tour' reopens it", await vis("#tour-card"));

  // ---- Escape, skip and keyboard
  await pg.keyboard.press("Escape");
  ok("Escape closes the tour", !(await vis("#tour-card")) && !(await vis("#tour-dim")));
  await pg.locator("#tour-start").click(); await pg.keyboard.press("ArrowRight");
  ok("ArrowRight advances", /Stop 1 of 6/.test(await text("#tour-card")));
  await pg.keyboard.press("ArrowLeft");
  ok("ArrowLeft goes back", /A two-minute tour/.test(await text("#tour-card")));
  await pg.locator("#t-skip").click();
  ok("Skip closes it", !(await vis("#tour-card")));
  // focus stays in the card
  await pg.locator("#tour-start").click(); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab");
  ok("Tab keeps focus inside the tour card", await pg.evaluate(() => document.getElementById("tour-card").contains(document.activeElement)));
  await pg.keyboard.press("Escape");

  // ---- the tour restores what the viewer was doing
  await pg.locator("#capture-list li").nth(1).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click();
  await pg.waitForFunction(() => document.querySelector("#stage").dataset.phase === "ready");
  await pg.locator("#make-draft").click();
  const before = (await text("#badge")).trim();
  await pg.locator("#tour-start").click(); await pg.locator("#t-next").click(); await pg.locator("#t-skip").click();
  ok("a draft the viewer made is restored after the tour", (await text("#badge")).trim() === before && before === "1", before);

  // ---- Builder mode shows all six numbers as soon as it is switched on, even with nothing loaded yet
  await pg.locator("#builder-toggle").click(); await pg.waitForTimeout(300);
  {
    const read = () => pg.locator(".bmark").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { n: e.textContent.trim(), where: e.dataset.where, x: r.x, y: r.y, w: r.width, h: r.height }; }));
    const near = (m, b, pad = 28) => m.x + m.w / 2 >= b.x - pad && m.x + m.w / 2 <= b.x + b.width + pad && m.y + m.h / 2 >= b.y - pad && m.y + m.h / 2 <= b.y + b.height + pad;
    const noClash = (ms) => { for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (Math.abs(ms[i].x - ms[j].x) < 28 && Math.abs(ms[i].y - ms[j].y) < 28) return false; return true; };
    let ms = await read();
    ok("switching Builder mode on shows all six numbers at once, with no capture loaded", ms.length === 6 && ms.map((m) => m.n).sort().join("") === "123456", JSON.stringify(ms.map((m) => m.n + ":" + m.where)));
    ok("every number is fully on screen", ms.every((m) => m.x >= 0 && m.y >= 0 && m.x + m.w <= 1280 && m.y + m.h <= 900));
    ok("no two numbers overlap", noClash(ms));
    const row = ms.filter((m) => ["1", "2", "3", "4"].includes(m.n)).sort((p, q) => p.x - q.x).map((m) => m.n).join("");
    ok("the numbers on the Capture panel read left to right as 1 2 3 4", row === "1234", row);
    const cd = await pg.locator("#capture-detail").boundingBox(), rv = await pg.locator(".subnav button[data-tab=review]").boundingBox(), dt = await pg.locator(".topnav button[data-tab=district]").boundingBox();
    ok("1 to 4 sit on the Capture panel, 5 on the Review tab and 6 on the District tab", ["1", "2", "3", "4"].every((n) => near(ms.find((m) => m.n === n), cd)) && near(ms.find((m) => m.n === "5"), rv) && near(ms.find((m) => m.n === "6"), dt));
    const hint0 = await text("#builder-legend .lghint");
    ok("hint (idle Teacher screen) says where each number is: 1-4 in this panel, 5 on the Review tab, 6 on the District tab", /Stops 1-4 appear in this panel/.test(hint0) && /Stop 5 is on the Review tab/.test(hint0) && /Stop 6 is on the District tab/.test(hint0), hint0);
    await shot(pg, "b0-idle-markers");
    await pg.locator('.bmark[data-step="review"]').click(); await pg.waitForTimeout(250);
    ok("tapping 5 explains it and offers 'Show me where this is'", /A review teachers will actually finish/.test(await text("#builder-card")) && /Show me where this is/.test(await text("#builder-show")));
    await pg.keyboard.press("Escape");
    await pg.locator(".topnav button[data-tab=district]").click(); await pg.waitForTimeout(300);
    ms = await read();
    ok("on the District screen all six numbers are still shown, without overlap", ms.length === 6 && noClash(ms) && ms.every((m) => m.x >= 0 && m.y >= 0 && m.x + m.w <= 1280), ms.map((m) => m.n + ":" + m.where).join(" "));
    {
      const g = ms.filter((m) => m.where === "slot").sort((p, q) => p.x - q.x);
      ok("District: numbers 1 to 5 sit together in ONE row, in order, none wrapped onto a second row", g.map((m) => m.n).join("") === "12345" && g.every((m) => Math.abs(m.y - g[0].y) < 2) && g.every((m, i) => i === 0 || Math.abs(m.x - g[i - 1].x - 34) < 2), JSON.stringify(g.map((m) => [m.n, Math.round(m.x), Math.round(m.y)])));
      ok("District: that row is labelled 'On the Teacher screens' and clear of both tabs", (await vis(".bcap")) && /On the Teacher screens/.test(await text(".bcap")) && await pg.evaluate(() => { const c = document.querySelector(".bcap").getBoundingClientRect(); return [...document.querySelectorAll(".topnav button")].every((t) => { const r = t.getBoundingClientRect(); return c.left >= r.right || c.right <= r.left; }); }));
      const tb = await pg.locator("#district .distwrap").boundingBox(); const six = ms.find((m) => m.n === "6");
      ok("District: number 6 sits on the district table", six.where === "live" && near(six, tb, 30));
    }
    const hint6 = await text("#builder-legend .lghint");
    ok("hint (District screen) says 1-5 are on the Teacher screens and 6 is on the feature, and no longer claims a number is on a tab", /Stops 1-5 are on the Teacher screens/.test(hint6) && /Stop 6 is marked on the feature itself/.test(hint6) && !/on a tab means/i.test(hint6) && !/tab\./.test(hint6), hint6);
    await shot(pg, "b1-district-markers");
    await pg.locator(".topnav button[data-tab=teacher]").click(); await pg.waitForTimeout(250);
    for (const [tab, name] of [["review", "Review"], ["metrics", "Your numbers"]]) {
      await pg.locator(".subnav button[data-tab=" + tab + "]").click(); await pg.waitForTimeout(300);
      ms = await read();
      ok("on " + name + " all six numbers are shown, in bounds and not overlapping", ms.length === 6 && ms.map((m) => m.n).sort().join("") === "123456" && noClash(ms) && ms.every((m) => m.x >= 0 && m.y >= 0 && m.x + m.w <= 1280), ms.map((m) => m.n + ":" + m.where).join(" "));
      const hk = await text("#builder-legend .lghint");
      ok("on " + name + " the hint only describes numbers that are really there", ms.length === 6 && /Tap a number for the detail\./.test(hk) && !/on a tab means/i.test(hk) && (tab !== "review" || (/Stop 5 is marked on the feature itself|Stops? [\d, -]*5[\d, -]* (is|are) marked on the feature itself/.test(hk))), hk);
      await shot(pg, "b2-" + tab + "-markers");
    }
    await pg.locator(".subnav button[data-tab=capture]").click(); await pg.waitForTimeout(250);
    await pg.locator("#builder-toggle").click(); await pg.waitForTimeout(250);
    ok("switching Builder mode off clears every number", (await pg.locator(".bmark").count()) === 0 && !(await vis("#builder-legend")));
  }

  // ---- Builder mode
  await pg.locator("#capture-list li").nth(0).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click();
  await pg.waitForFunction(() => document.querySelector("#stage").dataset.phase === "ready");
  ok("no leftover dimming before Builder mode starts", !(await vis("#tour-ring")) && !(await vis("#tour-dim")));
  ok("Builder mode is off by default", (await pg.locator(".bmark").count()) === 0 && !(await vis("#builder-legend")));
  ok("Builder switch says Off before it is turned on", /off/i.test(await text("#builder-toggle")) && (await pg.locator("#builder-toggle").getAttribute("aria-checked")) === "false");
  await pg.locator("#builder-toggle").click();
  await pg.waitForTimeout(250);
  ok("Builder switch says On and is orange once turned on", /on/i.test(await text("#builder-toggle")) && !/off/i.test(await text("#builder-toggle")) && (await pg.locator("#builder-toggle").getAttribute("aria-checked")) === "true" && (await pg.evaluate(() => getComputedStyle(document.querySelector("#builder-toggle .bsw-track")).backgroundColor)) === "rgb(255, 106, 61)");
  await shot(pg, "p0-toggle-on");
  ok("Builder mode shows a legend of all six stops even before anything is in view", (await vis("#builder-legend")) && (await pg.locator("#builder-legend .lgbtn").count()) === 6);
  await pg.locator("#stage .goal .why").first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(250);
  const n = await pg.locator(".bmark").count();
  ok("Builder mode pins numbered markers onto the live capture screen", n >= 3, n + " markers");
  await shot(pg, "p1-pm-capture");
  await pg.locator('.bmark[data-step="why"]').click(); await pg.waitForTimeout(250);
  ok("clicking a marker opens its stop card", (await vis("#builder-card")) && /Every suggestion says why/.test(await text("#builder-card")) && /how i would measure it/i.test(await text("#builder-card")));
  const whyTxt = await pg.locator("#stage .goal .why").first().innerText();
  ok("the Why line does not repeat 'the photo shows'", (whyTxt.match(/the photo shows/g) || []).length <= 1, whyTxt);
  {
    const cb = await pg.locator("#builder-card").boundingBox(); const tb = await pg.locator("#stage .goal .why").first().boundingBox();
    const ov = !(cb.x + cb.width <= tb.x || cb.x >= tb.x + tb.width || cb.y + cb.height <= tb.y || cb.y >= tb.y + tb.height);
    ok("the stop card does not cover the feature it describes", !ov, JSON.stringify({ card: [cb.x, cb.y, cb.width, cb.height].map(Math.round), target: [tb.x, tb.y, tb.width, tb.height].map(Math.round) }));
    const boxes = await pg.locator(".bmark").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y]; }));
    let clash = false; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (Math.abs(boxes[i][0] - boxes[j][0]) < 26 && Math.abs(boxes[i][1] - boxes[j][1]) < 26) clash = true;
    ok("Builder markers do not overlap each other", !clash, JSON.stringify(boxes.map((b) => b.map(Math.round))));
  }
  ok("the guide appears only in the legend: not in the stop card, the header or the prototype screens", (await pg.locator("#builder-card img").count()) === 0 && (await pg.locator("header img, main img[src*='mascot'], .dock:not(#tour-card) img").count()) === 0 && (await pg.evaluate(() => { const i = document.querySelector("#builder-legend img.mascot"); return !!i && i.naturalWidth > 0; })));
  await shot(pg, "p2-pm-card");
  const pcb = await pg.locator("#builder-card").boundingBox();
  ok("the stop card is fully on screen", pcb.x >= 0 && pcb.y >= 0 && pcb.x + pcb.width <= 1280 && pcb.y + pcb.height <= 900);
  await pg.keyboard.press("Escape");
  ok("Escape closes the stop card", !(await vis("#builder-card")));
  ok("Builder mode does not block the prototype: Save draft still works", await (async () => { await pg.locator("#make-draft").click(); return (await text("#badge")).trim() === "2"; })());
  await pg.locator(".subnav button[data-tab=review]").click(); await pg.waitForTimeout(250); await pg.locator("#queue .goal").first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(250);
  ok("markers follow to the Review screen", (await pg.locator(".bmark").count()) >= 1);
  await pg.locator(".topnav button[data-tab=district]").click(); await pg.waitForTimeout(250);
  ok("district view gets its own marker", (await pg.locator('.bmark[data-step="district"]').count()) === 1);
  await shot(pg, "p3-pm-district");
  // legend works with nothing on screen: open a stop that lives on another screen and use "Show me"
  await pg.locator(".topnav button[data-tab=teacher]").click(); await pg.locator(".subnav button[data-tab=capture]").click(); await pg.waitForTimeout(250);
  await pg.locator('#builder-legend .lgbtn[data-step="benchmark"]').click();
  ok("legend opens a stop card", (await vis("#builder-card")) && /A benchmark for each child/.test(await text("#builder-card")));
  await pg.locator("#builder-show").click(); await pg.waitForTimeout(350);
  ok("'Show me' brings the feature into view and closes the card", (await pg.locator("#stage .levels").first().isVisible()) && !(await vis("#builder-card")));
  ok("and pins its marker", (await pg.locator('.bmark[data-step="benchmark"]').count()) === 1);
  await shot(pg, "p4-showme");
  await pg.locator("#builder-toggle").click(); await pg.waitForTimeout(200);
  ok("turning Builder mode off removes the markers", (await pg.locator(".bmark").count()) === 0 && !(await vis("#builder-card")) && !(await vis("#builder-legend")));

  // ---- small screen
  await pg.setViewportSize({ width: 390, height: 800 });
  await pg.locator(".topnav button[data-tab=teacher]").click();
  await pg.locator("#tour-start").click(); await pg.locator("#t-next").click(); await pg.waitForTimeout(250);
  const mb = await pg.locator("#tour-card").boundingBox();
  ok("on a phone the tour card fits the screen", mb.x >= 0 && mb.x + mb.width <= 390 && mb.y >= 0 && mb.y + mb.height <= 800, JSON.stringify(mb));
  await shot(pg, "t8-phone");
  await pg.keyboard.press("Escape");

  console.log(results.join("\n")); console.log("page errors:", JSON.stringify(errs));
  await b.close(); srv.close(); process.exit(results.some((x) => x.startsWith("FAIL")) || errs.length ? 1 : 0);
})().catch((e) => { console.log(results.join("\n")); console.log("CRASH", e.message); process.exit(1); });
