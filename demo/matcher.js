/*
 * Rule-based stand-in for the AI mapper. Offline, no key, deterministic.
 * Rules: R2 High needs two evidence items; R2b a photo can be the second item but never creates a
 * suggestion on its own; R3 abstain; R4 at most two goals; R5 sensitive notes are not mapped and are
 * kept Staff-only; R6 evidence is always shown; R9 names only from the roster.
 * Interface a real model would sit behind: mapObservation(note, roster, framework, photoTags).
 */
(function (root) {
  // R5. Tuned on the eval cases (evals/). Recall matters more than precision here: a missed safeguarding note is worse than a false alarm.
  //  - "hit/hits/hitting" only counts when it is done to a person or to a body part; "fell/fall" only when someone fell down or off something.
  const SENSITIVE = new RegExp([
    "\\b(bump(ed)?|bit (him|her|them|me|another|a friend|into)|bite|bitten|biting|injur\\w*|hurt|bleed\\w*|bruis\\w*|fever|vomit\\w*|sick|allerg\\w*|rash|abuse\\w*|unsafe|scared of (mom|dad|home)|marks? on (his|her|their)|choking|seizure|nurse)\\b",
    "nose-?bleed\\w*|\\bdiarrh\\w*|\\bthr(ew|ow|owing|ows|own) up\\b|\\bpuk(e|ed|ing)\\b",
    "\\b(hit|hits|hitting)\\s+(him|her|them|me|us|another|a friend|a child|a classmate)\\b",
    "\\b(hit|hits|hitting)\\s+(his|her|their|my)\\s+(head|arm|leg|face|knee|nose|mouth|hand|chin|eye)\\b",
    "\\b(fell|falls|fallen|falling)\\s+(off|down|over|from|out|onto|into|hard|backwards?|forwards?|and)\\b",
    "\\b(fell|fallen)\\s*([.,!]|$)",
    "\\b(had|took|has) an? (bad |nasty )?(fall|tumble)\\b"
  ].join("|"), "i");

  function findChildren(note, roster) {
    const found = [];
    for (const c of roster) {
      if (new RegExp("\\b" + c.first + "\\b", "i").test(note)) found.push(c.id);
    }
    return found;
  }

  // True when the words just before a match say the child did NOT do it. The look-back stops at the start of the sentence or at "but".
  // "didn't give up" is the opposite: a negated quitting word is positive evidence, so it is not treated as a negation.
  const NEGATION = /\b(did not|didn'?t|does not|doesn'?t|do not|don'?t|would not|wouldn'?t|could not|couldn'?t|can'?t|cannot|will not|won'?t|refused to|unable to|not able to|never)\b/i;
  const NEG_POSITIVE = /\b(did not|didn'?t|never|wouldn'?t|couldn'?t)\s+(give up|quit|stop|forget|hesitate)\b/i;
  function negatedAt(note, index) {
    const before = note.slice(0, index);
    const start = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf(";"), before.toLowerCase().lastIndexOf(" but "));
    const clause = before.slice(start + 1).slice(-40);
    return NEGATION.test(clause) && !NEG_POSITIVE.test(clause);
  }

  // One phrase is one piece of evidence. When two cues match the same words ("asked what happens if we add red" and
  // "what happens if"), only the longer match counts, so High needs two pieces of evidence that do not overlap.
  function scoreGoal(goal, note) {
    const found = [];
    for (const cue of goal.cues) {
      const m = note.match(cue.re);
      if (m && !negatedAt(note, m.index)) found.push({ cue: cue.id, phrase: m[0].trim(), start: m.index, end: m.index + m[0].length, order: found.length });
    }
    const keep = [];
    [...found].sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.order - b.order).forEach((h) => {
      if (!keep.some((k) => h.start < k.end && k.start < h.end)) keep.push(h);
    });
    return keep.sort((a, b) => a.order - b.order).map(({ cue, phrase }) => ({ cue, phrase }));
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
