/* FROZEN COPY of the rules as they were before tuning (see evals/README.md). Do not edit: the 'before' scores depend on it. */
/*
 * Rule-based stand-in for the AI mapper. Offline, no key, deterministic.
 * Rules: R2 High needs two evidence items; R2b a photo can be the second item but never creates a
 * suggestion on its own; R3 abstain; R4 at most two goals; R5 sensitive notes are not mapped and are
 * kept Staff-only; R6 evidence is always shown; R9 names only from the roster.
 * Interface a real model would sit behind: mapObservation(note, roster, framework, photoTags).
 */
(function (root) {
  const SENSITIVE = /\b(bump(ed)?|hit|hitting|bit (him|her|them|me|another|a friend|into)|bite|bitten|biting|injur\w*|hurt|bleed\w*|bruis\w*|fever|vomit\w*|sick|allerg\w*|rash|fell|fall(ing)?|abuse\w*|unsafe|scared of (mom|dad|home)|marks? on (his|her|their)|choking|seizure)\b/i;

  function findChildren(note, roster) {
    const found = [];
    for (const c of roster) {
      if (new RegExp("\\b" + c.first + "\\b", "i").test(note)) found.push(c.id);
    }
    return found;
  }

  function scoreGoal(goal, note) {
    const hits = [];
    for (const cue of goal.cues) {
      const m = note.match(cue.re);
      if (m) hits.push({ cue: cue.id, phrase: m[0].trim() });
    }
    return hits;
  }

  function mapObservation(note, roster, framework, photoTags) {
    const text = String(note || "").trim();
    const tags = Array.isArray(photoTags) ? photoTags : [];
    const children = findChildren(text, roster);

    // R5: sensitive notes are never mapped; they stay Staff-only and are routed to an incident record.
    const s = text.match(SENSITIVE);
    if (s) {
      return { status: "needs_attention", reason: "Mentions \"" + s[0] + "\"", children, suggestions: [],
        visibility: "staff_only", route: "Incident" };
    }

    const scored = [];
    framework.goals.forEach((goal, order) => {
      const hits = scoreGoal(goal, text);
      if (!hits.length) return;                                   // photo alone never creates a suggestion
      const photoEvidence = goal.photo ? tags.filter((t) => goal.photo.test(t)) : [];
      scored.push({ goal, hits, photoEvidence, order, weight: hits.length + (photoEvidence.length ? 1 : 0) });
    });
    scored.sort((a, b) => b.weight - a.weight || a.order - b.order);

    const suggestions = scored.slice(0, 2).map((x) => ({
      goalId: x.goal.id, code: x.goal.code,
      domain: x.goal.domain, sub: x.goal.sub, text: x.goal.text,
      confidence: x.weight >= 2 ? "High" : "Medium",
      evidence: x.hits.map((h) => h.phrase),
      photoEvidence: x.photoEvidence
    }));

    if (!suggestions.length) {
      return { status: "no_match", reason: "No skill matched. Choose one or skip.", children, suggestions: [], visibility: "family" };
    }
    return { status: "draft", children, suggestions, visibility: "family" };
  }

  const api = { mapObservation, findChildren, SENSITIVE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Matcher = api;
})(typeof self !== "undefined" ? self : this);
