// Builds docs/assets/demo-tour.gif for the README by driving the real demo in a hidden browser.
//   cd demo && npm install && npx playwright install chromium    (once)
//   node make-gif.js                                              (needs ffmpeg: brew install ffmpeg)
// Frames: welcome, the six tour stops, the wrap-up, then Builder mode switched on. Nothing is faked: every frame is the live page.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");

const root = __dirname;
const out = path.join(root, "..", "docs", "assets", "demo-tour.gif");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "oc-gif-"));
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".png": "image/png" };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]), f = path.join(root, u === "/" ? "index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", mime[path.extname(f)] || "application/octet-stream"); r.end(d); });
});

(async () => {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch (e) { console.error("ffmpeg is needed: brew install ffmpeg"); process.exit(1); }
  const port = await new Promise((r) => srv.listen(0, () => r(srv.address().port)));
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 })).newPage();
  const frames = [];   // [file, seconds]
  const snap = async (secs) => { const f = path.join(work, "f" + String(frames.length).padStart(2, "0") + ".png"); await page.screenshot({ path: f }); frames.push([f, secs]); };

  await page.goto("http://localhost:" + port + "/index.html");
  await page.waitForSelector("#tour-card:not([hidden])");
  await page.waitForTimeout(600); await snap(3);                       // welcome
  await page.click("#t-next");
  const n = await page.evaluate(() => window.GUIDE.STEPS.length);
  for (let i = 0; i < n; i++) { await page.waitForTimeout(900); await snap(4); if (i < n - 1) await page.click("#t-next"); }
  await page.click("#t-next"); await page.waitForTimeout(500); await snap(4);   // wrap-up
  await page.click("#t-builder"); await page.waitForTimeout(900); await snap(3.5); // Builder mode on
  await b.close(); srv.close();

  // one global palette keeps the file small and the text crisp
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const list = path.join(work, "list.txt");
  fs.writeFileSync(list, frames.map(([f, s]) => "file '" + f + "'\nduration " + s).join("\n") + "\nfile '" + frames[frames.length - 1][0] + "'\n");
  const pal = path.join(work, "pal.png");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=1000:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=full", pal]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", pal, "-lavfi", "scale=1000:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", out]);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log("wrote " + path.relative(process.cwd(), out) + " (" + kb + " KB, " + frames.length + " frames, " + frames.reduce((a, f) => a + f[1], 0) + " s)");
  fs.rmSync(work, { recursive: true, force: true });
})();
