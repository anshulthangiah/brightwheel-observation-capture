// Shared by run-evals.js and the unit test. Scores one eval case against one matcher result.
const fs = require("fs"), path = require("path");

function loadCases() {
  return ["cases.json", "cases-heldout.json"].map((f) => path.join(__dirname, f)).filter((f) => fs.existsSync(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
}

// One case, seven checks. A case passes only if every check that applies to it passes.
function scoreCase(c, res) {
  const e = c.expect, sug = res.suggestions || [];
  const flagged = res.status === "needs_attention";
  const checks = {
    status: e.status.includes(res.status),
    children: JSON.stringify([...res.children].sort()) === JSON.stringify([...e.children].sort()),
    // a flagged note is Staff-only and goes to an incident record; anything else defaults to families
    visibility: flagged ? res.visibility === "staff_only" && res.route === "Incident" : res.visibility === "family",
    // every suggestion must be a skill a careful reader would accept, and a flagged note gets none
    sound: flagged ? sug.length === 0 : sug.every((s) => (e.accept || []).includes(s.goalId)),
    found: e.requireSuggestion ? sug.some((s) => (e.accept || []).includes(s.goalId)) : true,
    // one piece of evidence must never reach High (High needs two)
    confidence: e.noHigh ? !sug.some((s) => s.confidence === "High") : true,
    cap: sug.length <= 2
  };
  return { checks, pass: Object.values(checks).every(Boolean) };
}

module.exports = { loadCases, scoreCase };
