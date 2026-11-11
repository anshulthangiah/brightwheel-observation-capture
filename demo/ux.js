/*
 * UX logic kept separate from the DOM so it can be tested.
 * Time estimates are assumptions (seconds per draft), to be replaced by pilot data.
 */
(function (root) {
  const SECONDS = { clear: 5, check: 15, choose: 20, attention: 30 };

  // attention: safety note. check: a clear match whose level jumped and is not yet confirmed.
  // clear: High-confidence draft with a child and no open flag. choose: everything else.
  function classify(d) {
    const r = d.result;
    if (r.status === "needs_attention") return "attention";
    if (r.status === "draft" && r.suggestions.some((s) => s.confidence === "High") && (d.childIds || []).length >= 1) {
      const flagged = (d.flags || []).length > 0 && !d.confirmed;
      return flagged ? "check" : "clear";
    }
    return "choose";
  }

  function openDrafts(drafts) { return drafts.filter((d) => !d.done); }

  function estimateReviewSeconds(drafts) {
    return openDrafts(drafts).reduce((t, d) => t + SECONDS[classify(d)], 0);
  }

  function formatEstimate(sec) {
    if (sec <= 0) return "nothing left";
    if (sec < 60) return "under 1 min";
    return "about " + Math.round(sec / 60) + " min";
  }

  // A child counts as observed once a learning observation is approved,
  // or is a pending draft with a real suggestion. Safety notes never count.
  function coverage(roster, drafts) {
    const seen = new Set();
    drafts.forEach((d) => {
      if (d.outcome === "rejected" || d.outcome === "handled") return;
      const counts = d.outcome === "approved" || (!d.outcome && d.result.status === "draft");
      if (counts) (d.childIds || []).forEach((id) => seen.add(id));
    });
    return {
      observed: roster.filter((c) => seen.has(c.id)).map((c) => c.id),
      missing: roster.filter((c) => !seen.has(c.id)).map((c) => c.id)
    };
  }

  // Bulk approval only covers clear matches the teacher has not changed. Flagged drafts never qualify.
  function bulkEligible(drafts) {
    return openDrafts(drafts).filter((d) => classify(d) === "clear" && !d.edited);
  }

  // Child chips the teacher selected that the voice note never mentions, but only when the
  // note names other children. A note with no names at all raises no question.
  function chipConflicts(selectedIds, mentionedIds) {
    if (!mentionedIds.length) return [];
    return selectedIds.filter((id) => !mentionedIds.includes(id));
  }

  const api = { chipConflicts, classify, openDrafts, estimateReviewSeconds, formatEstimate, coverage, bulkEligible, SECONDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UXLogic = api;
})(typeof self !== "undefined" ? self : this);
