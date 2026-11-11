(function () {
  const { mapObservation, findChildren } = Matcher;
  const UX = UXLogic;
  const roster = DATA.roster;
  const nameOf = (id) => (roster.find((c) => c.id === id) || {}).first || id;
  const goalOf = (id) => FRAMEWORK.goals.find((g) => g.id === id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (s) => document.querySelector(s);

  const state = {
    tab: "capture", top: "teacher", capChildren: new Set(),
    drafts: [], records: [],
    stats: { approvedNoEdit: 0, edited: 0, rejected: 0, captureSecs: [], taps: [], flagsConfirmed: 0 },
    openedAt: null, tapCount: 0, keepOk: new Set(), cap: null
  };

  // ---------- undo support
  const snap = () => JSON.parse(JSON.stringify({ drafts: state.drafts, records: state.records, stats: state.stats }));
  const restore = (s) => { state.drafts = s.drafts; state.records = s.records; state.stats = s.stats; };
  let toastTimer;
  function toast(msg, undoSnap) {
    const el = $("#toast");
    el.innerHTML = esc(msg) + (undoSnap ? ' <button id="undo" class="ghost">Undo</button>' : "") + ' <button class="x" id="toast-x" aria-label="Dismiss">&times;</button>';
    el.hidden = false;
    $("#toast-x").onclick = () => { el.hidden = true; };
    if (undoSnap) $("#undo").onclick = () => { restore(undoSnap); render(); toast("Undone."); };
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), undoSnap ? 8000 : 3000);
  }

  // ---------- tabs: two top-level views (Teacher, District); the teacher has a smaller sub-menu
  const SUBTABS = ["capture", "review", "metrics"];
  state.sub = "capture";
  function setTab(t) {
    if (t === "district") { state.top = "district"; }
    else { state.top = "teacher"; if (SUBTABS.includes(t)) state.sub = t; }
    state.tab = state.top === "district" ? "district" : state.sub;
    document.querySelectorAll(".topnav button").forEach((x) => x.classList.toggle("active", x.dataset.tab === state.top));
    document.querySelectorAll(".subnav button").forEach((x) => x.classList.toggle("active", x.dataset.tab === state.sub));
    $("#view-teacher").hidden = state.top !== "teacher";
    $("#view-district").hidden = state.top !== "district";
    if (state.top === "district") $("#toast").hidden = true;
    SUBTABS.forEach((n) => ($("#tab-" + n).hidden = n !== state.sub));
    render();
  }
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  // ---------- derived facts for a draft
  const goalsOfDraft = (d) => d.chosen.map((g) => goalOf(g)).filter(Boolean);
  function computeFlags(d) {
    let flags = [];
    d.chosen.forEach((g) => { flags = flags.concat(Trust.levelFlags(DATA.history, g, (d.levels || {})[g] || {})); });
    return flags;
  }
  function sessionObserved(goalId) {
    const ids = [];
    state.records.forEach((r) => { if (r.goalIds.includes(goalId)) r.childIds.forEach((c) => ids.push(c)); });
    return ids;
  }

  // ---------- edit helpers: the check shown before an edit is saved
  const DEMO_RULES = "In this demo, editing re-matches skills with simple keyword rules, not an AI model. Unusual wording may return no suggestion.";
  function editModel(oldText, newText, selected) {
    const clean = String(newText || "").replace(/\s+/g, " ").trim();
    const named = findChildren(clean, roster); const sel = [...selected];
    const missing = named.filter((id) => !sel.includes(id));
    const stray = named.length ? sel.filter((id) => !named.includes(id)) : [];   // a note that names nobody is never a mismatch
    return { clean, named, sel, missing, stray, mismatch: missing.length > 0 || stray.length > 0, changed: clean !== oldText };
  }
  // attr(kind) returns the attributes for a button of that kind: "go", "go-note", "go-sel", "back"
  function confirmHtml(m, oldText, attr) {
    const list = (a) => a.length ? a.map(nameOf).join(", ") : "nobody";
    const warn = m.mismatch ? `<div class="warn" role="alert"><b>Check who this is about.</b> Your note names ${esc(list(m.named))}, but ${esc(list(m.sel))} ${m.sel.length === 1 ? "is" : "are"} selected.</div>` : "";
    const buttons = m.mismatch
      ? `<button type="button" class="primary" ${attr("go-note")}>Use the note: ${esc(list(m.named))}</button>
         <button type="button" class="ghost" ${attr("go-sel")}>Keep my selection: ${esc(list(m.sel))}</button>`
      : `<button type="button" class="primary" ${attr("go")}>Yes, save changes</button>`;
    return `<div class="editor confirm" role="alertdialog" aria-label="Save these changes?">
      <div class="ctitle">Save these changes?</div>${warn}
      <dl class="diff"><div><dt>Before</dt><dd>${esc(oldText)}</dd></div><div><dt>After</dt><dd>${esc(m.clean)}</dd></div><div><dt>About</dt><dd>${esc(list(m.sel))}</dd></div></dl>
      <div class="simnote">${esc(DEMO_RULES)}</div>
      <div class="draftbtns">${buttons}<button type="button" class="ghost" ${attr("back")}>Keep editing</button></div></div>`;
  }

  // ---------- capture: a scripted simulation (no typing, no real AI)
  const SPEED = typeof window.SIM_SPEED === "number" ? window.SIM_SPEED : 1;   // tests set 0
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
  const STEPS = ["Transcribing your voice note", "Reading the photo", "Matching to skills and suggesting a benchmark for each child"];
  let runId = 0;

  function renderList() {
    $("#capture-list").innerHTML = DATA.captures.map((c) => {
      const done = state.drafts.some((d) => d.captureId === c.id);
      const active = state.cap && state.cap.id === c.id;
      return `<li data-id="${c.id}" class="${active ? "sel" : ""} ${done ? "done" : ""}">
        <img src="${c.photo}" alt=""><div><div class="t">${c.time}${done ? " &#10003; saved" : ""}</div><div class="n">${esc(c.vision.caption)}</div></div></li>`;
    }).join("");
    document.querySelectorAll("#capture-list li").forEach((li) => li.addEventListener("click", () => select(li.dataset.id)));
  }
  function renderChips() {
    $("#chips").innerHTML = roster.map((c) =>
      `<button type="button" class="chipbtn ${state.capChildren.has(c.id) ? "on" : ""}" data-child="${c.id}" aria-pressed="${state.capChildren.has(c.id)}"><span class="dot" style="background:${c.color}"></span>${esc(c.first)}</button>`).join("");
  }
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-child]"); if (!b) return;
    const id = b.dataset.child; state.capChildren.has(id) ? state.capChildren.delete(id) : state.capChildren.add(id);
    state.tapCount++; $("#conflict").hidden = true; renderChips(); renderStage();
  });

  // The coverage nudge shown at capture time, for the skill the assistant matched.
  function nudgeHtml(cap) {
    const s = cap.result && cap.result.suggestions[0]; if (!s) return "";
    const g = Trust.coverageGap(DATA.history, roster, s.goalId, sessionObserved(s.goalId));
    const names = g.missing.map(nameOf);
    if (!names.length) return `<div class="nudge ok"><b>${esc(s.sub)}:</b> every child has an observation in this window.</div>`;
    return `<div class="nudge"><b>${esc(s.sub)}:</b> ${g.observed} of ${g.total} children have an observation in this three-month window. Nothing yet for ${names.map(esc).join(", ")}.</div>`;
  }

  function draftPreviewObj() {
    const cap = state.cap; const ids = [...state.capChildren];
    const chosen = cap.result.suggestions.filter((s) => s.confidence === "High").map((s) => s.goalId);
    const levels = {};
    Object.keys(cap.c.levels || {}).forEach((g) => { levels[g] = {}; Object.keys(cap.c.levels[g]).forEach((k) => { if (ids.includes(k)) levels[g][k] = cap.c.levels[g][k]; }); });
    const o = { note: cap.note, photo: cap.c.photo, time: cap.c.time, result: cap.result, childIds: ids,
      visibility: cap.visibility || "family", chosen, levels, flags: [] };
    o.flags = computeFlags(o);   // so a big jump is named at capture, not only in review
    return o;
  }
  function renderStage() {
    const el = $("#stage"); const cap = state.cap;
    $("#make-draft").disabled = !(cap && cap.phase === "ready");
    el.dataset.phase = cap ? cap.phase : "idle";
    if (!cap) { el.innerHTML = `<div class="empty-stage">Pick a moment from the list to start.</div>`; return; }
    const c = cap.c; const p = cap.phase;
    const taken = p !== "camera";
    let html = `<div class="viewfinder ${taken ? "taken" : "live"}"><img src="${c.photo}" alt="${esc(c.vision.caption)}">
      <span class="vf-label">${taken ? "Photo saved" : "Camera (simulated)"}</span></div>`;
    if (p === "camera") html += `<div class="shutter-row"><button id="shutter" class="shutter" aria-label="Take photo"></button><span class="hint">Tap to take the photo</span></div>`;
    if (p === "photo") html += `<button id="record" class="primary big">&#127908; Tap and say what happened</button><p class="feedforward">One sentence is enough.</p>`;
    if (p === "recording") html += `<div class="listening"><div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b>Listening...</b></div>`;
    if (p === "processing" || p === "ready") {
      const s = cap.step;
      const row = (i, label, extra) => `<li class="${s > i ? "done" : s === i && p === "processing" ? "active" : ""}"><span class="tick">${s > i ? "&#10003;" : ""}</span><div><div>${label}</div>${extra || ""}</div></li>`;
      html += `<div class="ai-badge">Simulated AI assistant</div><ul class="steps">
        ${row(0, STEPS[0], `<div class="transcript">&ldquo;${esc(cap.shown)}${s === 0 ? '<span class="caret"></span>' : ""}&rdquo;</div>`)}
        ${row(1, STEPS[1], s > 1 ? `<div class="vtags">${c.vision.tags.map((t) => `<span class="vtag">${esc(t)}</span>`).join("")}</div>` : "")}
        ${row(2, STEPS[2])}</ul>`;
    }
    if (p === "ready") {
      const sens = cap.result.status === "needs_attention";
      const vis = cap.visibility || "family";
      html += `<div class="draft-head"><span class="ai-badge">Draft for you to check</span><audio controls src="${c.audio}"></audio></div>`;
      if (cap.editing) {
        const m = editModel(cap.note, cap.editText, state.capChildren);
        html += cap.confirming
          ? confirmHtml(m, cap.note, (k) => `id="ed-${k}"`)
          : `<div class="editor"><label for="ed-text">Edit what was heard</label>
          <textarea id="ed-text" rows="3" aria-describedby="ed-hint">${esc(cap.editText)}</textarea>
          <div id="ed-hint" class="hint">To change who it is about, tap the names below.</div>
          <div class="simnote">${esc(DEMO_RULES)}</div>
          <div class="draftbtns"><button id="ed-save" class="primary" type="button">Save changes</button><button id="ed-cancel" class="ghost" type="button">Cancel</button></div></div>`;
      } else {
        html += `${visControl(vis, sens, "stage")}
        ${sens ? "" : nudgeHtml(cap)}${renderCard(draftPreviewObj(), true)}
        ${cap.edited ? `<div class="hint">You edited this note. The suggestions were re-matched with simple keyword rules (demo), not an AI model.</div>` : ""}
        <div class="draftbtns"><button id="edit-note" class="ghost" type="button">Edit the note</button><button id="redo" class="ghost" type="button">Start over with this moment</button><button id="discard" class="danger" type="button">Discard this draft</button></div>`;
      }
    }
    el.innerHTML = html;
  }

  // Who can see an observation once it is logged. Brightwheel's default is family-visible; a teacher has to
  // remember to switch to Staff-only. Here it is an explicit choice, and sensitive notes are locked Staff-only.
  function visControl(vis, locked, where, key) {
    const attr = (v) => `data-vis="${v}" data-where="${where}"${key ? ` data-key="${key}"` : ""}`;
    return `<div class="visctl" role="group" aria-label="Who can see this once logged">
      <div class="vislabel">Who can see this once logged?</div>
      <div class="seg">
        <button type="button" ${attr("family")} class="${vis === "family" ? "on" : ""}" aria-pressed="${vis === "family"}" ${locked ? "disabled" : ""}>Families and staff</button>
        <button type="button" ${attr("staff_only")} class="${vis === "staff_only" ? "on staff" : ""}" aria-pressed="${vis === "staff_only"}" ${locked ? "disabled" : ""}>Staff only</button>
      </div>
      <div class="vishint">${locked ? "Locked to Staff only. This note mentions an injury or illness, so it is routed to an incident record and never goes to families."
        : vis === "family" ? "Parents will see this in the child's feed once you log it." : "Only staff will see this. Parents will not."}</div>
    </div>`;
  }

  function select(id) {
    runId++;
    const c = DATA.captures.find((x) => x.id === id);
    state.cap = { id, c, phase: "camera", shown: "", step: 0, result: null, note: c.note, edited: false, editing: false, editText: "" };
    state.capChildren = new Set(); state.keepOk.clear(); $("#conflict").hidden = true;
    state.openedAt = Date.now(); state.tapCount = 0; $("#draft-preview").innerHTML = ""; $("#capture-msg").textContent = "";
    renderList(); renderChips(); renderStage();
  }
  $("#stage").addEventListener("click", (e) => {
    const cap = state.cap; if (!cap) return;
    const v = e.target.closest("[data-vis]");
    if (v && v.dataset.where === "stage" && !v.disabled) { cap.visibility = v.dataset.vis; state.tapCount++; renderStage(); return; }
    if (e.target.closest("#shutter")) { cap.phase = "photo"; state.tapCount++; renderStage(); }
    else if (e.target.closest("#record")) simulateAI();
    else if (e.target.closest("#redo")) select(cap.id);
    else if (e.target.closest("#edit-note")) { cap.editing = true; cap.confirming = false; cap.editText = cap.note; state.tapCount++; renderStage(); const t = $("#ed-text"); if (t) t.focus(); }
    else if (e.target.closest("#ed-cancel")) { cap.editing = false; cap.confirming = false; renderStage(); }
    else if (e.target.closest("#ed-save")) requestCaptureSave();
    else if (e.target.closest("#ed-back")) { cap.confirming = false; renderStage(); const t = $("#ed-text"); if (t) t.focus(); }
    else if (e.target.closest("#ed-go")) applyCaptureEdit();
    else if (e.target.closest("#ed-go-note")) applyCaptureEdit("note");
    else if (e.target.closest("#ed-go-sel")) applyCaptureEdit("sel");
    else if (e.target.closest("#discard")) discardCapture();
  });
  $("#stage").addEventListener("input", (e) => { if (e.target.id === "ed-text" && state.cap) state.cap.editText = e.target.value; });

  // Saving an edit always asks first, and shows what changes and any mismatch between the note and the children.
  function requestCaptureSave() {
    const cap = state.cap; if (!cap) return;
    const m = editModel(cap.note, cap.editText, state.capChildren);
    if (!m.clean) { toast("A note cannot be empty. Discard the draft instead."); return; }
    if (!m.changed) { cap.editing = false; toast("No changes to save."); renderStage(); return; }
    cap.confirming = true; renderStage();
    const g = $("#ed-go, #ed-go-note"); if (g) g.focus();
  }
  // Editing what was heard re-runs the same offline rules on the new words. No model is involved.
  function applyCaptureEdit(choice) {
    const cap = state.cap; if (!cap) return;
    const m = editModel(cap.note, cap.editText, state.capChildren);
    cap.note = m.clean; cap.edited = true; cap.editing = false; cap.confirming = false; state.tapCount++;
    cap.result = mapObservation(m.clean, roster, FRAMEWORK, cap.c.vision.tags);
    if (cap.result.status === "needs_attention") cap.visibility = "staff_only";
    if (choice === "note" && m.named.length) state.capChildren = new Set(m.named);
    state.keepOk.clear(); $("#conflict").hidden = true;
    renderChips(); renderStage();
  }
  function discardCapture() {
    runId++; state.cap = null; state.capChildren = new Set(); state.keepOk.clear(); state.openedAt = null;
    $("#conflict").hidden = true; $("#draft-preview").innerHTML = ""; $("#capture-msg").textContent = "";
    toast("Draft discarded. Nothing was saved."); render();
  }

  async function simulateAI() {
    const my = ++runId; const cap = state.cap;
    cap.phase = "recording"; state.tapCount++; renderStage();
    await sleep(2600); if (my !== runId) return;
    cap.phase = "processing"; cap.step = 0; cap.shown = ""; renderStage();
    for (const w of cap.c.note.split(" ")) {
      cap.shown += (cap.shown ? " " : "") + w; renderStage(); await sleep(55); if (my !== runId) return;
    }
    cap.step = 1; renderStage(); await sleep(800); if (my !== runId) return;
    cap.step = 2; renderStage(); await sleep(800); if (my !== runId) return;
    cap.result = mapObservation(cap.c.note, roster, FRAMEWORK, cap.c.vision.tags);
    finishCapture(cap);
  }

  // Shared by the animated capture and by the tour's instant jump-to-ready.
  function finishCapture(cap) {
    cap.result = cap.result || mapObservation(cap.note, roster, FRAMEWORK, cap.c.vision.tags);
    cap.visibility = cap.result.visibility || "family";
    findChildren(cap.note, roster).forEach((id) => state.capChildren.add(id));   // names heard in the voice note
    cap.step = 3; cap.phase = "ready"; renderChips(); renderStage();
  }

  // Ask again when a selected child is not in the voice note but other children are.
  const mentioned = () => (state.cap ? findChildren(state.cap.note, roster) : []);
  const conflictsNow = () => UX.chipConflicts([...state.capChildren], mentioned()).filter((id) => !state.keepOk.has(id));
  function renderConflict(list) {
    const named = mentioned().map(nameOf).join(" and ");
    const el = $("#conflict"); el.hidden = false;
    el.innerHTML = list.map((id) => `<div class="conf-row"><div><b>${esc(nameOf(id))}</b> is selected, but your voice note is about ${esc(named)}. Keep ${esc(nameOf(id))} on this observation?</div>
      <div class="row"><button class="primary" data-keep="${id}">Keep ${esc(nameOf(id))}</button><button class="ghost" data-remove="${id}">Remove ${esc(nameOf(id))}</button></div></div>`).join("");
    if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
  $("#conflict").addEventListener("click", (e) => {
    const k = e.target.closest("[data-keep]"), r = e.target.closest("[data-remove]");
    if (!k && !r) return;
    if (k) state.keepOk.add(k.dataset.keep); else state.capChildren.delete(r.dataset.remove);
    state.tapCount++; renderChips(); renderStage();
    const left = conflictsNow();
    if (left.length) renderConflict(left); else saveDraft();
  });
  $("#make-draft").addEventListener("click", () => saveDraft());

  function saveDraft() {
    const cap = state.cap; if (!cap || cap.phase !== "ready") return;
    const conf = conflictsNow();
    if (conf.length) { renderConflict(conf); return; }
    $("#conflict").hidden = true; state.keepOk.clear();
    const result = cap.result; const childIds = [...state.capChildren]; result.children = childIds;
    const secs = state.openedAt ? Math.max(1, Math.round((Date.now() - state.openedAt) / 1000)) : null;
    if (secs) state.stats.captureSecs.push(secs);
    const before = snap();
    const levels = {};
    Object.keys(cap.c.levels || {}).forEach((g) => { levels[g] = {}; Object.keys(cap.c.levels[g]).forEach((k) => { if (childIds.includes(k)) levels[g][k] = cap.c.levels[g][k]; }); });
    const d = { key: "d" + Date.now() + Math.random().toString(16).slice(2, 5), captureId: cap.id,
      note: cap.note, photo: cap.c.photo, time: cap.c.time, result, childIds, chosen: [], levels,
      visibility: result.status === "needs_attention" ? "staff_only" : (cap.visibility || "family"), edited: !!cap.edited, confirmed: false, flags: [], taps: state.tapCount + 1 };
    result.suggestions.forEach((s) => { if (s.confidence === "High") d.chosen.push(s.goalId); });   // High pre-selected; Medium needs a choice
    d.flags = computeFlags(d);
    state.drafts.push(d);
    state.cap = null; state.capChildren = new Set(); state.openedAt = null; runId++;
    $("#draft-preview").innerHTML = renderCard(d, true);
    toast("Draft saved. " + UX.openDrafts(state.drafts).length + " waiting for review.", before);
    render();
  }

  // ---------- reminder (self-initiated trigger; the prompt carries what to do next)
  $("#preview-remind").addEventListener("click", () => {
    const open = UX.openDrafts(state.drafts); const el = $("#notif");
    const when = $("#remind").value.split(" (")[0];
    el.hidden = false;
    el.innerHTML = open.length
      ? `<b>${when}</b> &middot; ${open.length} drafts ready. Review takes ${UX.formatEstimate(UX.estimateReviewSeconds(state.drafts))}. <button class="primary" id="notif-go">Review now</button>`
      : `<b>${when}</b> &middot; Nothing to review. Capture a moment first.`;
    const go = $("#notif-go"); if (go) go.onclick = () => setTab("review");
  });

  // ---------- evidence highlight (R6)
  function highlight(note, phrases) {
    let html = esc(note);
    phrases.forEach((p) => { html = html.replace(new RegExp("(" + esc(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"), "<mark>$1</mark>"); });
    return html;
  }
  const goalList = (d) => {
    const have = d.result.suggestions.map((s) => s.goalId);
    const extras = d.chosen.filter((id) => !have.includes(id)).map((id) => {
      const g = goalOf(id);
      return { goalId: id, code: g.code, domain: g.domain, sub: g.sub, text: g.text, confidence: "Your choice", evidence: [], photoEvidence: [] };
    });
    return [...d.result.suggestions, ...extras];
  };
  const codeLabel = (s) => `<span class="code real" title="${esc(s.domain)}">${esc(s.code)}</span>`;

  // per-child benchmark rows for one suggested skill (the benchmark is the assessment)
  function levelRows(d, s, editable) {
    const ids = d.childIds; const lv = (d.levels || {})[s.goalId] || {};
    if (!ids.length) return "";
    return `<div class="levels">` + ids.map((c) => {
      const cur = lv[c]; const prior = Trust.latestPrior(DATA.history, s.goalId, c);
      const jump = (d.flags || []).find((f) => f.childId === c && f.goalId === s.goalId); const flagged = !!jump;
      const sel = editable
        ? `<select data-act="level" data-key="${d.key}" data-goal="${s.goalId}" data-child="${c}" aria-label="Benchmark for ${esc(nameOf(c))}"><option value="">Set benchmark</option>${FRAMEWORK.benchmarks.map((b) => `<option value="${b}" ${cur === b ? "selected" : ""}>${b}</option>`).join("")}</select>`
        : (cur === undefined ? `<b class="unset">not set yet, you set it in review</b>` : `<b>${cur}</b>`);
      return `<div class="lvrow ${flagged ? "flag" : ""}"><span>${esc(nameOf(c))}</span><span class="lvnow">Benchmark ${sel}</span><span class="lvprev">${prior ? "last: " + prior.level + " (" + prior.date + ", " + esc(prior.by) + ")" : "no earlier observation"}</span>${jump ? `<span class="jumptag">Jump of ${Math.abs(jump.diff)} levels. Needs a check.</span>` : ""}</div>`;
    }).join("") + `</div>`;
  }
  function flagHtml(d) {
    if (!(d.flags || []).length) return "";
    return `<div class="flagbox"><b>Check before logging.</b> ` + d.flags.map((f) => `${esc(nameOf(f.childId))}: ${f.from} to ${f.to} on ${esc(goalOf(f.goalId).sub)} (last rated ${esc(f.by)}, ${esc(f.date)}). That is a jump of ${f.diff}.`).join(" ") + `</div>`;
  }

  function editorCard(d) {
    const text = d.editText !== undefined ? d.editText : d.note;
    const kids = d.editKids || d.childIds.slice();
    if (d.confirming) {
      const m = editModel(d.note, text, kids);
      return `<div class="card editing"><div class="who">Edit this draft <span class="ev">${d.time}</span></div>${confirmHtml(m, d.note, (k) => `data-act="ed${k}" data-key="${d.key}"`)}</div>`;
    }
    return `<div class="card editing"><div class="who">Edit this draft <span class="ev">${d.time}</span></div>
      <div class="editor"><label for="ed-${d.key}">What was heard</label>
        <textarea id="ed-${d.key}" rows="3" data-act="ednote" data-key="${d.key}">${esc(text)}</textarea>
        <label>Who is it about?</label>
        <div class="chips">${roster.map((c) => `<button type="button" class="chipbtn ${kids.includes(c.id) ? "on" : ""}" data-act="edkid" data-key="${d.key}" data-child="${c.id}" aria-pressed="${kids.includes(c.id)}"><span class="dot" style="background:${c.color}"></span>${esc(c.first)}</button>`).join("")}</div>
        <div class="simnote">${esc(DEMO_RULES)}</div>
        <div class="draftbtns"><button class="primary" type="button" data-act="edsave" data-key="${d.key}">Save changes</button><button class="ghost" type="button" data-act="edcancel" data-key="${d.key}">Cancel</button></div></div></div>`;
  }
  function clearEditState(d) { d.editing = false; d.confirming = false; delete d.editText; delete d.editKids; }
  function requestReviewSave(d) {
    const text = d.editText !== undefined ? d.editText : d.note;
    const kids = d.editKids || d.childIds;
    const m = editModel(d.note, text, kids);
    if (!m.clean) { toast("A note cannot be empty. Delete the draft instead."); return; }
    const sameKids = kids.length === d.childIds.length && kids.every((k) => d.childIds.includes(k));
    if (!m.changed && sameKids) { clearEditState(d); toast("No changes to save."); renderReview(); return; }
    d.confirming = true; renderReview();
    const g = document.querySelector('#queue [data-act="edgo"], #queue [data-act="edgo-note"]'); if (g) g.focus();
  }
  function applyReviewEdit(d, choice) {
    const kidsNow = d.editKids || d.childIds;
    const m = editModel(d.note, d.editText !== undefined ? d.editText : d.note, kidsNow);
    const cap = DATA.captures.find((x) => x.id === d.captureId);
    const res = mapObservation(m.clean, roster, FRAMEWORK, cap ? cap.vision.tags : []);
    const kids = choice === "note" && m.named.length ? m.named.slice() : kidsNow.slice();
    const levels = {};
    res.suggestions.forEach((s) => {
      levels[s.goalId] = {};
      kids.forEach((k) => {
        const old = (d.levels || {})[s.goalId]; const base = cap && cap.levels && cap.levels[s.goalId];
        const v = old && old[k] !== undefined ? old[k] : base && base[k] !== undefined ? base[k] : undefined;
        if (v !== undefined) levels[s.goalId][k] = v;
      });
    });
    res.children = kids;
    Object.assign(d, { note: m.clean, result: res, childIds: kids, levels, chosen: res.suggestions.filter((s) => s.confidence === "High").map((s) => s.goalId),
      visibility: res.status === "needs_attention" ? "staff_only" : (d.visibility || "family"), edited: true, confirmed: false });
    d.taps = (d.taps || 1) + 1; d.flags = computeFlags(d);
    clearEditState(d);
    return true;
  }

  function renderCard(d, preview) {
    if (!preview && d.editing) return editorCard(d);
    const r = d.result; const kind = UX.classify(d);
    const kids = d.childIds.length ? d.childIds.map(nameOf).join(", ") : "Who is this about?";
    const photo = d.photo ? `<img src="${d.photo}" alt="" class="thumb">` : "";
    const vis = d.visibility === "staff_only" ? `<span class="vis staff">Staff only${r.status === "needs_attention" ? " &middot; Incident" : ""}</span>` : `<span class="vis fam">Families and staff</span>`;
    let body = "";
    if (kind === "attention") {
      body = `<div class="attn-title">Needs your attention. Not mapped to skills.</div>
        <div class="ev">Reason: ${esc(r.reason)}. Kept Staff-only and routed to an incident record. Follow your program's procedure.</div>`;
    } else {
      if (r.status === "no_match") body += `<span class="chip none">No suggestion</span><div class="ev">${esc(r.reason)}</div>`;
      body += goalList(d).map((s) => {
        const on = d.chosen.includes(s.goalId);
        const wordsPart = s.evidence.map((e) => "you said &ldquo;" + esc(e) + "&rdquo;").join(" and ");
        const photoPart = (s.photoEvidence || []).length ? "the photo shows " + s.photoEvidence.map((p) => "&ldquo;" + esc(p) + "&rdquo;").join(" and ") : "";
        const why = (wordsPart || photoPart) ? `<div class="ev why">Why: ${[wordsPart, photoPart].filter(Boolean).join("; ")}.</div>` : "";
        return `<div class="goal"><span class="chip ${s.confidence.replace(" ", "")}">${s.confidence}</span>${codeLabel(s)} <b>${esc(s.sub)}</b> <span class="ev">(${esc(s.domain)})</span>
          ${why}${on || preview ? levelRows(d, s, !preview && on) : ""}
          ${preview ? "" : `<label class="use"><input type="checkbox" data-act="toggle" data-key="${d.key}" data-goal="${s.goalId}" ${on ? "checked" : ""}> Use this skill</label>`}</div>`;
      }).join("");
    }
    let actions = "";
    if (!preview) {
      if (kind === "attention") {
        actions = `<label class="use"><input type="checkbox" data-act="ack" data-key="${d.key}"> I have followed our procedure for this</label>
          <div class="row"><button class="danger" data-act="handled" data-key="${d.key}" disabled>Mark as handled</button><button class="ghost" data-act="edit" data-key="${d.key}">Edit the note</button></div>`;
      } else {
        const who = d.childIds.length ? "" : `<select data-act="who" data-key="${d.key}" aria-label="Who is this about"><option value="">Who is this about?</option>${roster.map((c) => `<option value="${c.id}">${esc(c.first)}</option>`).join("")}</select>`;
        const domains = [...new Set(FRAMEWORK.goals.map((g) => g.domain))];
        const groupsHtml = domains.map((dom) => `<optgroup label="${esc(dom)}">${FRAMEWORK.goals.filter((g) => g.domain === dom).map((g) => `<option value="${g.id}">${esc(g.code)} ${esc(g.sub)}</option>`).join("")}</optgroup>`).join("");
        const confirmBtn = kind === "check" ? `<button class="primary" data-act="confirmflag" data-key="${d.key}">Yes, that level is right</button>` : "";
        actions = `${flagHtml(d)}${visControl(d.visibility || "family", false, "queue", d.key)}<div class="row">
          ${kind === "check" ? confirmBtn : `<button class="good" data-act="approve" data-key="${d.key}">Looks right</button>`}
          <select data-act="pick" data-key="${d.key}" aria-label="Add a different skill"><option value="">Add a different skill...</option>${groupsHtml}</select>
          ${who}
          </div><div class="cardbtns"><button class="ghost" data-act="edit" data-key="${d.key}">Edit note and children</button><button class="danger" data-act="reject" data-key="${d.key}">Delete draft</button></div>`;
      }
    }
    return `<div class="card ${kind === "attention" ? "attn" : ""} ${kind === "check" ? "chk" : ""}">${photo}<div class="who">${esc(kids)} <span class="ev">${d.time}</span> ${vis}</div>
      <div class="note">${highlight(d.note, r.suggestions.flatMap((s) => s.evidence))}</div>${body}${actions}<div style="clear:both"></div></div>`;
  }

  // ---------- review
  function approve(d) {
    if (!d.chosen.length) { toast("Choose at least one skill, or skip this one."); return false; }
    if (!d.childIds.length) { toast("Choose who this is about first."); return false; }
    const missing = d.chosen.some((g) => d.childIds.some((c) => ((d.levels || {})[g] || {})[c] === undefined));
    if (missing) { toast("Set a benchmark for every child on every skill first."); return false; }
    d.taps = (d.taps || 1) + 1;
    const goals = goalsOfDraft(d);
    state.records.push({ kids: d.childIds.map(nameOf).join(", "), childIds: d.childIds, note: d.note, time: d.time, goals, goalIds: d.chosen.slice(),
      levels: JSON.parse(JSON.stringify(d.levels || {})), edited: d.edited, visibility: d.visibility });
    d.edited ? state.stats.edited++ : state.stats.approvedNoEdit++;
    state.stats.taps.push(d.taps); d.done = true; d.outcome = "approved";
    return true;
  }
  const levelText = (r) => r.goals.map((g) => g.sub + ": " + r.childIds.map((c) => nameOf(c) + " " + ((r.levels[g.id] || {})[c] ?? "?")).join(", ")).join(" | ");

  function renderReview() {
    const open = UX.openDrafts(state.drafts).sort((a, b) => a.time.localeCompare(b.time));
    const total = state.drafts.length; const done = total - open.length;
    $("#progress").innerHTML = total ? `<div class="bar"><div style="width:${Math.round(100 * done / total)}%"></div></div>
      <div class="hint">${done} of ${total} reviewed &middot; ${UX.formatEstimate(UX.estimateReviewSeconds(state.drafts))} left</div>` : "";

    const by = (k) => open.filter((d) => UX.classify(d) === k);
    const att = by("attention"), chk = by("check"), clear = by("clear"), choose = by("choose");
    let html = "";
    if (open.length) {
      const chip = (cls, id, label, n) => `<button type="button" class="gchip ${cls} ${n ? "" : "zero"}" data-jump="${id}" ${n ? "" : "disabled"}><b>${n}</b>${label}</button>`;
      html += `<div id="groupbar" class="groupbar" role="group" aria-label="Review groups"><div class="gtitle">Your review, grouped by what each draft needs</div>
        ${chip("attn", "sec-attn", "Needs your attention", att.length)}${chip("chk", "sec-chk", "Check the level", chk.length)}${chip("clr", "sec-clear", "Clear matches", clear.length)}${chip("", "sec-choose", "Needs your choice", choose.length)}</div>`;
    }
    if (att.length) html += `<h3 id="sec-attn" class="sec attn-h">Needs your attention (${att.length})</h3>` + att.map((d) => renderCard(d, false)).join("");
    if (chk.length) html += `<h3 id="sec-chk" class="sec chk-h">Check the level (${chk.length})</h3><p class="hint">A benchmark moved a lot since the last observation. Confirm it, or change it.</p>` + chk.map((d) => renderCard(d, false)).join("");
    if (clear.length) {
      const bulk = UX.bulkEligible(state.drafts);
      html += `<h3 id="sec-clear" class="sec">Clear matches (${clear.length})</h3>
        ${bulk.length > 1 ? `<div class="bulk"><button class="primary big" data-act="bulk">Approve all ${bulk.length} clear matches</button>
          <div class="hint">${bulk.map((d) => d.childIds.map(nameOf).join(" + ")).join(", ")}. Each shows why it was suggested. You can undo.</div></div>` : ""}`
        + clear.map((d) => renderCard(d, false)).join("");
    }
    if (choose.length) html += `<h3 id="sec-choose" class="sec">Needs your choice (${choose.length})</h3><p class="hint">Not sure enough to pick for you. Choose the closest skill, or skip.</p>` + choose.map((d) => renderCard(d, false)).join("");
    if (!html) {
      if (!total) html = `<div class="empty"><b>Nothing to review yet.</b><div class="hint">Capture a moment and it will show up here.</div></div>`;
      else {
        const cov = UX.coverage(roster, state.drafts);
        html = `<div class="done-panel"><div class="big-check">&#10003;</div><h3>Review complete</h3>
          <p>${state.records.length} observation${state.records.length === 1 ? "" : "s"} recorded for ${cov.observed.length} of ${roster.length} children.</p>
          ${cov.missing.length ? `<p class="gap"><b>No learning observation yet today:</b> ${cov.missing.map(nameOf).join(", ")}.<br><span class="hint">A quick note tomorrow morning would close the gap.</span></p>` : `<p>Every child has an observation today.</p>`}</div>`;
      }
    }
    $("#queue").innerHTML = html;
    $("#records").innerHTML = state.records.length ? state.records.map((r) => `<div class="card"><div class="who">${esc(r.kids)} <span class="ev">${r.time}</span></div>
      <div>${esc(r.note)}</div><div class="ev">${esc(levelText(r))}</div>${r.goals.map((g) => `<span class="chip High">${esc(g.sub)}</span>`).join("")}${r.edited ? '<span class="chip none">edited</span>' : ""}</div>`).join("") : `<p class="hint">Nothing approved yet.</p>`;
  }

  $("#queue").addEventListener("click", (e) => {
    const jump = e.target.closest("[data-jump]");
    if (jump && !jump.disabled) { const t = document.getElementById(jump.dataset.jump); if (t) t.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    const vb = e.target.closest("[data-vis]");
    if (vb && vb.dataset.where === "queue" && !vb.disabled) {
      const dd = state.drafts.find((x) => x.key === vb.dataset.key);
      if (dd) { dd.visibility = vb.dataset.vis; dd.taps = (dd.taps || 1) + 1; renderReview(); }
      return;
    }
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act; const d = state.drafts.find((x) => x.key === el.dataset.key);
    if (act === "bulk") {
      const before = snap(); const list = UX.bulkEligible(state.drafts); let n = 0;
      list.forEach((x) => { x.taps = (x.taps || 1) - 1 + 1 / list.length; if (approve(x)) n++; });
      toast(n + " observations approved.", before); render(); return;
    }
    if (!d) return;
    if (act === "approve") { const before = snap(); if (approve(d)) { toast("Approved for " + d.childIds.map(nameOf).join(", ") + ".", before); render(); } }
    if (act === "confirmflag") { const before = snap(); d.confirmed = true; state.stats.flagsConfirmed++; if (approve(d)) toast("Level confirmed and approved.", before); render(); }
    if (act === "reject") { const before = snap(); state.stats.rejected++; d.done = true; d.outcome = "rejected"; toast("Draft deleted.", before); render(); }
    if (act === "edit") { d.editing = true; d.confirming = false; d.editText = d.note; d.editKids = d.childIds.slice(); renderReview(); const t = document.getElementById("ed-" + d.key); if (t) t.focus(); }
    if (act === "edcancel") { clearEditState(d); renderReview(); }
    if (act === "edkid") { const k = el.dataset.child; d.editKids = d.editKids || d.childIds.slice(); d.editKids = d.editKids.includes(k) ? d.editKids.filter((x) => x !== k) : d.editKids.concat(k); renderReview(); }
    if (act === "edsave") requestReviewSave(d);
    if (act === "edback") { d.confirming = false; renderReview(); const t = document.getElementById("ed-" + d.key); if (t) t.focus(); }
    if (act === "edgo" || act === "edgo-note" || act === "edgo-sel") {
      const before = snap(); const bd = before.drafts.find((x) => x.key === d.key);
      if (bd) { bd.editing = false; bd.confirming = false; delete bd.editText; delete bd.editKids; }   // undo returns to the draft as it was, not to the editor
      if (applyReviewEdit(d, act === "edgo-note" ? "note" : "sel")) { toast("Draft updated.", before); render(); }
    }
    if (act === "handled") { const before = snap(); d.done = true; d.outcome = "handled"; toast("Marked as handled.", before); render(); }
  });
  $("#queue").addEventListener("input", (e) => { if (e.target.dataset && e.target.dataset.act === "ednote") { const d = state.drafts.find((x) => x.key === e.target.dataset.key); if (d) d.editText = e.target.value; } });
  $("#queue").addEventListener("change", (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act; const d = state.drafts.find((x) => x.key === el.dataset.key); if (!d) return;
    if (act === "toggle") { d.taps = (d.taps || 1) + 1; const g = el.dataset.goal; d.chosen = el.checked ? [...new Set([...d.chosen, g])] : d.chosen.filter((x) => x !== g); d.edited = true; d.flags = computeFlags(d); d.confirmed = false; renderReview(); }
    if (act === "pick" && el.value) { d.taps = (d.taps || 1) + 1; if (!d.chosen.includes(el.value)) d.chosen.push(el.value); d.edited = true; d.flags = computeFlags(d); renderReview(); }
    if (act === "level") {
      d.taps = (d.taps || 1) + 1; d.levels[el.dataset.goal] = d.levels[el.dataset.goal] || {};
      if (el.value === "") delete d.levels[el.dataset.goal][el.dataset.child]; else d.levels[el.dataset.goal][el.dataset.child] = Number(el.value);
      d.edited = true; d.confirmed = false; d.flags = computeFlags(d); renderReview();
    }
    if (act === "who" && el.value) { d.childIds = [el.value]; d.result.children = [el.value]; renderReview(); }
    if (act === "ack") { const b = el.closest(".card").querySelector('[data-act="handled"]'); b.disabled = !el.checked; }
  });

  // ---------- district view (concept, synthetic)
  function renderDistrict() {
    const rows = Trust.districtRows(DATA.sites);
    $("#district").innerHTML = `<table class="dist"><thead><tr><th>Site</th><th>Type</th><th>Children</th><th>Children observed (30 days)</th><th>Observations per child</th><th>With photo</th><th>Avg. skills assessed (of 73)</th><th>Flags</th></tr></thead><tbody>` +
      rows.map((r) => `<tr class="${r.flags === "None" ? "" : "warnrow"}"><td><b>${esc(r.site)}</b></td><td>${esc(r.type)}</td><td>${r.children}</td>
        <td><div class="minibar"><div style="width:${r.children_observed_pct}%"></div></div>${r.children_observed_pct}%</td><td>${r.obs_per_child}</td><td>${r.obs_with_photo_pct}%</td><td>${r.avg_skills_assessed_of_73}</td>
        <td>${r.flags === "None" ? '<span class="chip High">None</span>' : esc(r.flags)}</td></tr>`).join("") + `</tbody></table>`;
  }
  $("#export-csv").addEventListener("click", () => {
    const csv = Trust.toCsv(Trust.districtRows(DATA.sites));
    const pre = $("#csv-preview"); pre.hidden = false; pre.textContent = csv;
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "district-evidence-quality.csv"; a.click(); } catch (e) { /* preview only */ }
  });

  // ---------- metrics
  function renderMetrics() {
    const s = state.stats; const decided = s.approvedNoEdit + s.edited + s.rejected;
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const fmt = (v, u) => (v === null ? "n/a" : Math.round(v * 10) / 10 + (u || ""));
    const cards = [
      ["Drafts created", state.drafts.length, "Captured this session"],
      ["Approved", state.records.length, "Attached to a child record"],
      ["Approved without edit", decided ? Math.round(100 * s.approvedNoEdit / decided) + "%" : "n/a", "Spec target: 70%+ for High"],
      ["Deleted", s.rejected, "Drafts you chose not to keep"],
      ["Level jumps caught", state.drafts.filter((d) => (d.flags || []).length).length, "Flagged before logging"],
      ["Level jumps confirmed", s.flagsConfirmed, "Teacher checked and kept"],
      ["Avg. seconds to capture", fmt(avg(s.captureSecs), "s"), "Includes the simulated waiting"],
      ["Avg. taps per approval", fmt(avg(s.taps)), "Photo, record, save + approve (bulk shares one tap)"],
      ["Needs attention", state.drafts.filter((d) => d.result.status === "needs_attention").length, "Never mapped, Staff-only"]
    ];
    $("#metrics").innerHTML = cards.map((c) => `<div class="stat"><b>${c[1]}</b>${c[0]}<br><span>${c[2]}</span></div>`).join("");
  }

  // ---------- chrome: safety banner, coverage chip, prompt, badge
  function renderChrome() {
    const open = UX.openDrafts(state.drafts);
    const att = open.filter((d) => UX.classify(d) === "attention");
    const b = $("#banner");
    const teacherView = state.top !== "district";
    if (att.length && teacherView) {
      b.hidden = false;
      b.innerHTML = `<b>${att.length} note${att.length > 1 ? "s need" : " needs"} your attention:</b> ${att.map((d) => d.childIds.map(nameOf).join(", ") || "unassigned").join("; ")}. Not mapped to skills. Kept Staff-only. ${state.tab === "review" ? "" : '<button class="ghost" id="banner-go">Open</button>'}`;
      const g = $("#banner-go"); if (g) g.onclick = () => setTab("review");
    } else b.hidden = true;
    const cov = UX.coverage(roster, state.drafts);
    $("#coverage-chip").textContent = state.drafts.length && teacherView ? cov.observed.length + " of " + roster.length + " children captured today" : "";
    $("#badge").textContent = open.length; $("#badge").classList.toggle("alert", att.length > 0);
    const p = $("#prompt");
    if (open.length && state.tab === "capture") {
      p.hidden = false;
      p.innerHTML = `<b>${open.length} draft${open.length > 1 ? "s" : ""} waiting.</b> Review takes ${UX.formatEstimate(UX.estimateReviewSeconds(state.drafts))}. <button class="primary" id="prompt-go">Review now</button>`;
      $("#prompt-go").onclick = () => setTab("review");
    } else p.hidden = true;
  }

  function render() { renderChrome(); renderList(); renderChips(); renderStage(); renderReview(); renderDistrict(); renderMetrics(); }
  // ---------- the host adapter for the guide (Take a Tour and Builder mode). This is the ONLY place the guide touches the app.
  // Contract: reset(), home(), snapshot(), restore(snap), setup(setup), show(setup). It jumps the app to a state and adds no behaviour.
  function fastCapture(id) {
    select(id);
    const cap = state.cap; cap.shown = cap.c.note;
    finishCapture(cap);
  }
  function clearTransient() { runId++; state.cap = null; state.capChildren = new Set(); state.keepOk.clear(); $("#conflict").hidden = true; $("#draft-preview").innerHTML = ""; $("#toast").hidden = true; }
  window.GuideHost = {
    reset() {
      clearTransient(); state.drafts = []; state.records = [];
      state.stats = { approvedNoEdit: 0, edited: 0, rejected: 0, captureSecs: [], taps: [], flagsConfirmed: 0 };
      render();
    },
    home() { setTab("capture"); },
    snapshot() { return snap(); },
    restore(s) { clearTransient(); restore(s); render(); },
    // put the app in the state a tour step needs: { view, capture?, seed? }
    setup(st) {
      this.reset();
      if (st.seed) { setTab("capture"); st.seed.forEach((id) => { fastCapture(id); saveDraft(); }); $("#toast").hidden = true; }
      if (st.capture) { setTab("capture"); fastCapture(st.capture); }
      setTab(st.view);
      if (st.view === "capture" && st.capture) fastCapture(st.capture);
    },
    // Builder mode's "Show me where this is": load only what is missing, without wiping the viewer's own work
    show(st) {
      setTab(st.view);
      if (st.view === "capture" && st.capture && !document.querySelector("#stage .goal")) fastCapture(st.capture);
      if (st.view === "review" && st.seed && !document.querySelector("#queue .card")) { setTab("capture"); st.seed.forEach((id) => { fastCapture(id); saveDraft(); }); $("#toast").hidden = true; setTab("review"); }
    }
  };

  render();
})();
