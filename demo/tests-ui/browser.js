// Real-browser test (Chromium via Playwright). Catches CSS bugs jsdom cannot, e.g. the [hidden] attribute
// being overridden. Run: npm install && npx playwright install chromium && npm run test:browser
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(root, u === "/" ? "index.html" : u); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader("content-type", mime[path.extname(f)] || "text/plain"); r.end(d); } }); });
const results = []; const ok = (n, c, extra) => results.push((c ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : ""));
const shot = (pg, n, full) => pg.screenshot({ path: "/tmp/oc-" + n + ".png", fullPage: !!full });

(async () => {
  await new Promise((r) => srv.listen(8799, r));
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await pg.addInitScript(() => { window.SIM_SPEED = 0.05; });
  await pg.goto("http://localhost:8799/?notour");
  const vis = (s) => pg.locator(s).isVisible();
  const text = (s) => pg.locator(s).innerText();
  const play = async (i) => { await pg.locator("#capture-list li").nth(i).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click(); await pg.waitForFunction(() => document.querySelector("#stage").dataset.phase === "ready"); };

  ok("hidden elements are really hidden on load", !(await vis("#banner")) && !(await vis("#toast")) && !(await vis("#prompt")) && !(await vis("#conflict")));
  ok("two top tabs, Teacher first and open by default", (await pg.locator(".topnav button").count()) === 2 && /Teacher/.test(await pg.locator(".topnav button").first().innerText()) && (await vis("#view-teacher")) && !(await vis("#view-district")));
  ok("Teacher opens on the Observation Capture page", (await vis("#tab-capture")) && /Capture/.test(await text(".subnav button.active")));
  ok("District is not in the teacher menu", !/District/i.test(await text(".subnav")));

  // c1 Leo: count jump 2 -> 5, nudge, why line, per-child benchmark, family-visible
  await play(0);
  ok("why line names the words", /Why: you said .*counted/.test(await text("#stage")));
  ok("per-child benchmark shown with the earlier one", /Leo\s+Benchmark\s*5/.test(await text("#stage")) && /last: 2/.test(await text("#stage")));
  ok("a jump of 2 or more levels is named where the teacher decides: 'Jump of 3 levels. Needs a check.'", /Jump of 3 levels\. Needs a check\./.test(await text("#stage")) && (await pg.locator("#stage .jumptag").count()) === 1);
  ok("coverage nudge names who has nothing yet", /children have an observation in this three-month window/.test(await text("#stage")) && /Nothing yet for/.test(await text("#stage")));
  ok("visibility control with both options visible", (await vis('#stage [data-vis="family"]')) && (await vis('#stage [data-vis="staff_only"]')) && /Who can see this once logged/.test(await text("#stage")));
  ok("default is Families and staff", (await pg.locator('#stage [data-vis="family"]').getAttribute("aria-pressed")) === "true");
  // layout: the draft badge and the audio player sit on one row, and the label text is not squeezed
  const hb = await pg.locator("#stage .draft-head .ai-badge").boundingBox(); const ab = await pg.locator("#stage .draft-head audio").boundingBox();
  ok("draft badge sits beside the audio player on one row", Math.abs((hb.y + hb.height / 2) - (ab.y + ab.height / 2)) < 30 && hb.x < ab.x, JSON.stringify([hb.y, ab.y]));
  await pg.locator('#stage [data-vis="staff_only"]').click();
  ok("can switch to Staff only", (await pg.locator('#stage [data-vis="staff_only"]').getAttribute("aria-pressed")) === "true" && /Only staff will see this/.test(await text("#stage")));
  await shot(pg, "n1b-visibility");
  await pg.locator('#stage [data-vis="family"]').click();
  await shot(pg, "n1-capture");
  await pg.locator("#make-draft").click();

  // c7 Zara: the photo is the second piece of evidence
  await play(6);
  ok("photo evidence appears in the why line", /the photo shows/.test(await text("#stage")));
  await shot(pg, "n2-photo-evidence");
  await pg.locator("#make-draft").click();

  // c9 Ben: Staff-only and routed to Incident
  await play(8);
  ok("safety note is locked to Staff only and routed to incident", /Locked to Staff only/.test(await text("#stage")) && /incident/i.test(await text("#stage")));
  ok("the Families option is disabled for a safety note", await pg.locator('#stage [data-vis="family"]').isDisabled() && (await pg.locator('#stage [data-vis="staff_only"]').getAttribute("aria-pressed")) === "true");
  ok("no benchmark rows or skills for a safety note", !(await pg.locator("#stage .levels").count()));
  await pg.locator("#make-draft").click();
  ok("safety banner visible with Staff-only wording", (await vis("#banner")) && /Staff-only/.test(await text("#banner")));

  // c6 Ria: two-rater disagreement
  await play(5); await pg.locator("#make-draft").click();

  await pg.locator('.subnav button[data-tab="review"]').click();
  ok("review has a 'Check the level' group", /Check the level \(2\)/.test(await text("#queue")));
  ok("review shows the jump label on both flagged drafts", (await pg.locator("#queue .jumptag").count()) === 2 && /Jump of 2 levels/.test(await text("#queue")));
  ok("flag names who rated earlier", /Mr\. Diaz/.test(await text("#queue")) && /jump of 3/.test(await text("#queue")) && /jump of 2/.test(await text("#queue")));
  await shot(pg, "n3-review", true);
  // flagged drafts are not bulk-approvable
  ok("no bulk button while only flagged drafts are clear", (await pg.locator('[data-act="bulk"]').count()) === 0);
  // confirm Leo's jump
  const leoCard = pg.locator("#queue .card", { hasText: "Leo built" });
  await leoCard.locator('[data-act="confirmflag"]').click();
  ok("confirming a jump approves with the level recorded", /Leo 5/.test(await text("#records")));
  // change Ria's level to 4 (jump of 1) and the flag clears
  const ria = pg.locator("#queue .card", { hasText: "Ria cut" });
  await ria.locator('select[data-act="level"]').first().selectOption("4");
  ok("changing the level to within one step clears the flag", !/Check the level \(\d+\)/.test(await text("#queue")) && (await pg.locator("#groupbar .gchip.chk.zero").count()) === 1);
  ok("the jump label disappears once the level is within one step", (await ria.locator(".jumptag").count()) === 0);
  await ria.locator('[data-act="approve"]').click();
  ok("Ria approved at benchmark 4", /Ria 4/.test(await text("#records")));
  // Zara (photo makes it High) approves cleanly
  await pg.locator("#queue .card", { hasText: "Zara stacked" }).locator('[data-act="approve"]').click();
  ok("Zara approved", /Zara 3/.test(await text("#records")));
  await pg.locator("#undo").click();
  ok("undo works", !/Zara 3/.test(await text("#records")));

  // visibility chosen at capture carries into review, can be changed there, and is recorded
  await pg.locator('.topnav button[data-tab="teacher"]').click(); await pg.locator('.subnav button[data-tab="capture"]').click();
  await play(7); await pg.locator('#stage [data-vis="staff_only"]').click(); await pg.locator("#make-draft").click();
  await pg.locator('.subnav button[data-tab="review"]').click();
  const jay = pg.locator("#queue .card", { hasText: "Jay balanced" });
  ok("Staff only chosen at capture shows in review", (await jay.locator('[data-vis="staff_only"]').getAttribute("aria-pressed")) === "true" && /Staff only/.test(await jay.locator(".who").innerText()));
  await jay.locator('[data-vis="family"]').click();
  ok("visibility can be changed in review", (await pg.locator("#queue .card", { hasText: "Jay balanced" }).locator('[data-vis="family"]').getAttribute("aria-pressed")) === "true");
  await shot(pg, "n3b-review-visibility", true);

  // district view
  await pg.locator('.topnav button[data-tab="district"]').click();
  ok("District is its own top-level view", (await vis("#view-district")) && !(await vis("#view-teacher")));
  ok("no teacher content leaks into District: banner, coverage chip and toast are hidden", !(await vis("#banner")) && !(await vis("#toast")) && (await text("#coverage-chip")).trim() === "");
  ok("district view lists three sites with flags", (await pg.locator("table.dist tbody tr").count()) === 3 && /Low coverage/.test(await text("#district")));
  ok("district view shows no outcome scores", !/average level|outcome score/i.test(await text("#district")));
  await shot(pg, "n4-district");
  await pg.locator("#export-csv").click();
  ok("CSV preview shown", (await vis("#csv-preview")) && /^site,type,rooms/.test(await text("#csv-preview")));
  await pg.locator('.topnav button[data-tab="teacher"]').click();
  ok("back to Teacher restores the safety banner", await vis("#banner"));

  // metrics
  await pg.locator('.topnav button[data-tab="teacher"]').click(); await pg.locator('.subnav button[data-tab="metrics"]').click();
  ok("metrics tab shows level jumps caught", /Level jumps caught/.test(await text("#metrics")));

  // ---- Keep / Remove question when a selected child is not in the voice note
  await pg.locator('.subnav button[data-tab="capture"]').click();
  const badge = async () => (await text("#badge")).trim();
  const before = Number(await badge());
  await play(1);                                                   // Maya's moment
  ok("Maya picked from the voice note", await pg.locator('#chips [data-child="maya"].on').count() === 1);
  await pg.locator('#chips [data-child="leo"]').click();                  // teacher adds Leo by mistake
  await pg.locator("#make-draft").click();
  ok("asks to keep or remove Leo, nothing saved yet", (await vis("#conflict")) && /Leo is selected, but your voice note is about Maya/.test(await text("#conflict")) && Number(await badge()) === before);
  await pg.locator("[data-remove=leo]").click();
  ok("Remove: saved for Maya only", Number(await badge()) === before + 1 && !(await vis("#conflict")));
  await play(3);                                                   // Aisha and Omar
  await pg.locator('#chips [data-child="leo"]').click();
  await pg.locator("#make-draft").click();
  await pg.locator("[data-keep=leo]").click();
  ok("Keep: saved with Leo kept", Number(await badge()) === before + 2);
  await play(9);                                                   // room note, names nobody
  await pg.locator('#chips [data-child="zara"]').click();
  await pg.locator("#make-draft").click();
  ok("no question when the note names nobody", !(await vis("#conflict")) && Number(await badge()) === before + 3);
  await play(0); await pg.locator('#chips [data-child="sam"]').click(); await pg.locator('#chips [data-child="ben"]').click();
  await pg.locator("#make-draft").click();
  ok("two stray children give two questions", (await pg.locator("#conflict .conf-row").count()) === 2);
  await pg.locator("[data-remove=sam]").click(); await pg.locator("[data-remove=ben]").click();
  ok("saved once both are answered", Number(await badge()) === before + 4);

  // ---- edit and discard a draft before it is logged (at capture)
  await pg.locator('.subnav button[data-tab="capture"]').click();
  await play(1);                                                   // Maya's moment
  ok("capture draft offers Edit, Start over and Discard", (await vis("#edit-note")) && (await vis("#redo")) && (await vis("#discard")));
  await pg.locator("#edit-note").click();
  ok("Edit opens a text box holding what was heard", (await vis("#ed-text")) && /Maya mixed blue and yellow paint/.test(await pg.locator("#ed-text").inputValue()));
  await shot(pg, "e1-edit-capture");
  await pg.locator("#ed-text").fill("");
  await pg.locator("#ed-save").click();
  ok("an empty note is refused", (await vis("#ed-text")) && /cannot be empty/.test(await text("#toast")));
  ok("capture editor carries the demo-rules disclaimer", /simple keyword rules, not an AI model/.test(await text("#stage .editor")) && /Unusual wording may return no suggestion/.test(await text("#stage .editor")));
  await pg.locator("#ed-text").fill("Maya and Ria counted seven blocks and lined them up in a row.");
  await pg.locator("#ed-save").click();
  ok("saving asks 'Save these changes?' first, and shows before and after", (await vis("#stage .confirm")) && /Save these changes\?/.test(await text("#stage .confirm")) && /before/i.test(await text("#stage .confirm")) && /after/i.test(await text("#stage .confirm")) && /Maya and Ria counted seven blocks/.test(await text("#stage .confirm")));
  ok("the confirm panel flags that the note names Ria but only Maya is selected", /Check who this is about/.test(await text("#stage .confirm")) && /names Maya, Ria/.test(await text("#stage .confirm")) && /Maya is selected/.test(await text("#stage .confirm")));
  ok("nothing is saved until the viewer answers", !/Maya and Ria counted seven blocks/.test(await text("#stage .draft-head")) && (await pg.locator("#stage .goal").count()) === 0);
  await shot(pg, "e3-confirm-capture");
  await pg.locator("#ed-back").click();
  ok("Keep editing returns to the text with the words kept", (await vis("#ed-text")) && /Maya and Ria counted seven blocks/.test(await pg.locator("#ed-text").inputValue()));
  await pg.locator("#ed-save").click();
  await pg.locator("#ed-go-note").click();
  ok("saving the edit shows the new words and suggestions from them", /Maya and Ria counted seven blocks/.test(await text("#stage")) && /Verbally counts numbers|counts/i.test(await text("#stage")));
  ok("children named in the edited note are selected", (await pg.locator('#chips [data-child="ria"].on').count()) === 1 && (await pg.locator('#chips [data-child="maya"].on').count()) === 1);
  ok("it says the note was edited", /You edited this note/.test(await text("#stage")));
  await pg.locator("#edit-note").click(); await pg.locator("#ed-text").fill("changed my mind"); await pg.locator("#ed-cancel").click();
  ok("Cancel keeps the earlier text", /Maya and Ria counted seven blocks/.test(await text("#stage")));
  const draftsBefore = Number(await badge());
  await pg.locator("#discard").click();
  ok("Discard removes the draft without saving anything", /Pick a moment/.test(await text("#stage")) && /discarded/i.test(await text("#toast")) && Number(await badge()) === draftsBefore);
  ok("the discarded moment is not marked saved", (await pg.locator("#capture-list li.done").count()) === (await pg.locator("#capture-list li.done").count()));

  // ---- edit and delete in the review list
  await play(1); await pg.locator("#make-draft").click();
  await pg.locator('.subnav button[data-tab="review"]').click();
  const mayaCard = pg.locator("#queue .card", { hasText: "Maya mixed" }).first();   // Maya was also saved earlier in this run
  ok("each review card has Edit and Delete", (await mayaCard.locator('[data-act="edit"]').count()) === 1 && (await mayaCard.locator('[data-act="reject"]').count()) === 1 && /Delete draft/.test(await mayaCard.innerText()));
  await mayaCard.locator('[data-act="edit"]').click();
  ok("review edit shows the note and the children", (await vis("#queue textarea")) && (await pg.locator('#queue [data-act="edkid"]').count()) === 10);
  await shot(pg, "e2-edit-review");
  await pg.locator("#queue textarea").fill("Maya mixed red and yellow paint and said it made orange.");
  await pg.locator('#queue [data-act="edkid"][data-child="noah"]').click();
  ok("review editor carries the demo-rules disclaimer", /simple keyword rules, not an AI model/.test(await text("#queue .editor")));
  await pg.locator('#queue [data-act="edsave"]').click();
  ok("review save also asks first, with a mismatch warning (note names Maya, Noah is also selected)", (await vis("#queue .confirm")) && /Save these changes\?/.test(await text("#queue .confirm")) && /Check who this is about/.test(await text("#queue .confirm")));
  await pg.locator('#queue [data-act="edgo-sel"]').click();
  const edited = pg.locator("#queue .card", { hasText: "made orange" });
  ok("review edit saved: new note and extra child", (await edited.count()) === 1 && /Maya, Noah/.test(await edited.locator(".who").innerText()));
  await edited.locator('[data-act="edit"]').click(); await pg.locator('#queue [data-act="edcancel"]').click();
  ok("review edit Cancel leaves it as it was", (await pg.locator("#queue .card", { hasText: "made orange" }).count()) === 1);
  const q0 = (await pg.locator("#queue .card").count());
  await pg.locator("#queue .card", { hasText: "made orange" }).locator('[data-act="reject"]').click();
  ok("Delete draft removes it from the list", (await pg.locator("#queue .card").count()) === q0 - 1 && /Draft deleted/.test(await text("#toast")));
  await pg.locator("#undo").click();
  ok("Undo brings a deleted draft back", (await pg.locator("#queue .card", { hasText: "made orange" }).count()) === 1);

  // the case from the screenshot: the note says NOAH but Leo is selected
  const leoCard2 = () => pg.locator("#queue .card", { hasText: "Leo built" }).first();
  await leoCard2().locator('[data-act="edit"]').click();
  await pg.locator("#queue textarea").fill("NOAH built a tall tower with five blocks and counted them out loud, one to five.");
  await pg.locator('#queue [data-act="edsave"]').click();
  const cf = await text("#queue .confirm");
  ok("note says Noah but Leo is selected: the viewer is asked before anything is saved", /Check who this is about/.test(cf) && /names Noah/.test(cf) && /Leo is selected/.test(cf));
  ok("two clear choices plus a way back", /Use the note: Noah/.test(cf) && /Keep my selection: Leo/.test(cf) && /Keep editing/.test(cf));
  ok("nothing changed yet", (await pg.locator("#queue .note", { hasText: "NOAH" }).count()) === 0);
  await shot(pg, "e4-confirm-mismatch");
  await pg.locator('#queue [data-act="edback"]').click();
  ok("Keep editing returns to the editor with the typed words kept", /NOAH built a tall tower/.test(await pg.locator("#queue textarea").inputValue()));
  await pg.locator('#queue [data-act="edsave"]').click(); await pg.locator('#queue [data-act="edgo-note"]').click();
  const noahCard = pg.locator("#queue .card", { hasText: "NOAH built" }).first();
  ok("Use the note: the draft is now about Noah", /^Noah/.test((await noahCard.locator(".who").innerText()).trim()));
  await noahCard.locator('[data-act="edit"]').click(); await pg.locator('#queue [data-act="edsave"]').click();
  ok("saving with nothing changed says so and does not ask", !(await vis("#queue .confirm")) && /No changes to save/.test(await text("#toast")));
  await pg.locator("#queue .card", { hasText: "NOAH built" }).first().locator('[data-act="edit"]').click();
  await pg.locator("#queue textarea").fill("NOAH built a tall tower.");
  await pg.locator('#queue [data-act="edsave"]').click();
  ok("when the note and the children agree there is no warning, one clear Yes button", (await vis("#queue .confirm")) && !/Check who this is about/.test(await text("#queue .confirm")) && (await vis('#queue [data-act="edgo"]')) && /Yes, save changes/.test(await text("#queue .confirm")));
  await shot(pg, "e5-confirm-clean");
  await pg.locator('#queue [data-act="edgo"]').click();
  ok("after Yes the edit is saved", (await pg.locator("#queue .note", { hasText: "NOAH built a tall tower." }).count()) === 1);
  await pg.locator("#undo").click();
  ok("Undo returns to the draft as it was, not to the editor", !(await vis("#queue .editor")) && (await pg.locator("#queue .note", { hasText: "NOAH built a tall tower with five blocks" }).count()) === 1);
  await pg.locator('.subnav button[data-tab="capture"]').click();

  // ---- simulated capture has no typing, and switching moments mid-run resets cleanly
  ok("no text box is open unless you choose to edit", (await pg.locator("textarea, input[type=text]").count()) === 0);
  await pg.locator("#capture-list li").nth(4).click(); await pg.locator("#shutter").click(); await pg.locator("#record").click();
  await pg.locator("#capture-list li").nth(5).click();
  ok("switching moment mid-recording resets to the camera", (await pg.locator("#stage").getAttribute("data-phase")) === "camera");

  console.log(results.join("\n")); console.log("page errors:", JSON.stringify(errs));
  await b.close(); srv.close(); process.exit(results.some((x) => x.startsWith("FAIL")) || errs.length ? 1 : 0);
})().catch((e) => { console.log(results.join("\n")); console.log("CRASH", e.message); process.exit(1); });
