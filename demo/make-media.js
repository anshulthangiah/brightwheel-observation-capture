#!/usr/bin/env node
// Generates synthetic "photos" (simple SVG scenes) and synthetic voice notes (macOS `say` + ffmpeg).
// No real children, no real voices. Run: node make-media.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const DATA = require("./data.js");

const out = path.join(__dirname, "media");
fs.mkdirSync(out, { recursive: true });

const wrap = (bg, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" role="img" aria-label="${label}">
<rect width="320" height="220" fill="${bg}"/><rect y="170" width="320" height="50" fill="#d9c7a3"/>${body}
<text x="10" y="212" font-family="sans-serif" font-size="10" fill="#6b5b3e">Synthetic illustration</text></svg>`;
const kid = (x, c) => `<circle cx="${x}" cy="120" r="16" fill="#f1c9a5"/><rect x="${x - 14}" y="136" width="28" height="34" rx="8" fill="${c}"/>`;

const scenes = {
  c1: wrap("#e8f1ff", `${[0,1,2,3,4].map(i=>`<rect x="${110+i*0}" y="${150-i*18}" width="40" height="18" fill="${["#e55","#fb4","#5b5","#58f","#b5e"][i]}"/>`).join("")}${kid(210,"#4f7cff")}`, "Child with a tower of five blocks"),
  c2: wrap("#fff6e0", `<ellipse cx="130" cy="165" rx="40" ry="10" fill="#fff"/><circle cx="115" cy="160" r="12" fill="#3a6df0"/><circle cx="145" cy="160" r="12" fill="#f2d000"/><circle cx="130" cy="152" r="12" fill="#3cb44b"/>${kid(220,"#ff7a59")}`, "Child mixing paint"),
  c3: wrap("#eefaf2", `<rect x="100" y="140" width="80" height="30" fill="#fff" stroke="#999"/><rect x="108" y="146" width="20" height="18" fill="#e55"/><rect x="132" y="146" width="20" height="18" fill="#58f"/>${kid(220,"#2fb67c")}`, "Child at a puzzle"),
  c4: wrap("#f6eeff", `${kid(120,"#b066ff")}${kid(190,"#f2a900")}<circle cx="155" cy="150" r="8" fill="#8a5a44"/>`, "Two children, one holding a teddy"),
  c5: wrap("#e6f8fb", `<rect x="100" y="140" width="60" height="32" fill="#fff" stroke="#999"/><text x="118" y="164" font-size="22" font-family="sans-serif" fill="#e55">S</text>${kid(210,"#00a3bf")}`, "Child with a book showing the letter S"),
  c6: wrap("#ffeef4", `<path d="M90 160 q30 -40 60 0 t60 0" stroke="#333" stroke-width="3" fill="none" stroke-dasharray="6 4"/>${kid(240,"#e0457b")}`, "Child cutting along a curved line"),
  c7: wrap("#f1f3f6", `<rect x="110" y="150" width="24" height="20" fill="#e55"/><rect x="140" y="150" width="24" height="20" fill="#e55"/><rect x="125" y="130" width="24" height="20" fill="#58f"/>${kid(220,"#6b7a8f")}`, "Child stacking cups"),
  c8: wrap("#eaf7ea", `<rect x="80" y="155" width="130" height="8" fill="#8a5a44"/>${kid(240,"#3d9970")}`, "Child on a balance beam"),
  c9: wrap("#f3f3f3", `<rect x="80" y="100" width="90" height="70" fill="#b8a07a"/>${kid(220,"#8a5a44")}`, "Child near a shelf"),
  c10: wrap("#eef1f6", `<rect x="60" y="60" width="200" height="6" fill="#89a"/><circle cx="110" cy="40" r="3" fill="#69f"/><circle cx="150" cy="30" r="3" fill="#69f"/><circle cx="200" cy="45" r="3" fill="#69f"/>`, "Rainy window"),
};

for (const c of DATA.captures) {
  fs.writeFileSync(path.join(out, c.id + ".svg"), scenes[c.id]);
  const aiff = path.join(out, c.id + ".aiff");
  execFileSync("say", ["-v", "Samantha", "-o", aiff, c.note]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ac", "1", "-b:a", "48k", path.join(out, c.id + ".mp3")]);
  fs.unlinkSync(aiff);
  console.log("made", c.id);
}
