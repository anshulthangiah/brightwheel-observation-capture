/*
 * Builder mode: a switch that pins numbered markers onto the live screens. Needs guide-common.js.
 *
 * Rules that make it feel the same in every project:
 *   - turning it on shows every number at once, on every screen (a number sits on its live feature when that is on screen,
 *     otherwise on the tab or panel that leads to it), so the screen is never empty
 *   - a number opens the same four-row card the tour uses, docked in the same place
 *   - a legend lists all stops at all times; its hint says where each number is on THIS screen, so it never describes something that is not there
 *   - "Show me where this is" jumps to the feature, loading only what is missing
 *   - numbers never overlap each other and never sit on the text they mark
 * It reacts to the tour through events: tour:open (hide), tour:close (redraw), builder:request-on (turn on).
 */
(function () {
  const G = window.Guide; if (!G) return;
  const { $, esc, firstVisible, rows, mimg, srcChip, host, content: C } = G;
  const S = { on: false, markerOpen: null, hint: "" };
  const B = C.BUILDER, SLOT = B.slot;

  // ---------- DOM
  const root = document.createElement("div");
  root.id = "builder-root";
  root.innerHTML = `<div id="builder-markers"></div><div id="builder-card" class="dock" role="dialog" aria-labelledby="builder-title" tabindex="-1" hidden></div>`;
  document.body.appendChild(root);
  const markers = $("#builder-markers"), card = $("#builder-card");
  const legend = document.createElement("div");
  legend.id = "builder-legend"; legend.hidden = true; document.body.appendChild(legend);

  const sw = document.createElement("button");
  sw.id = "builder-toggle"; sw.type = "button"; sw.className = "bswitch"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-checked", "false"); sw.setAttribute("aria-label", C.META.builderAria);
  sw.innerHTML = `<span class="bsw-track" aria-hidden="true"><span class="bsw-knob"></span></span><span class="bsw-text">${esc(C.META.builderLabel)}</span><span class="bsw-state" aria-hidden="true">Off</span>`;
  G.controls().appendChild(sw);

  function setOn(on) {
    S.on = on; G.state.builderOn = on;
    sw.setAttribute("aria-checked", String(on)); sw.classList.toggle("on", on); sw.querySelector(".bsw-state").textContent = on ? "On" : "Off";
    document.body.classList.toggle("builder-on", on); closeCard(); draw();
  }

  // ---------- where a number goes
  function anchorFor(s) {
    const live = firstVisible(s.pin);
    if (live) return { el: live, kind: "live" };
    for (const sel of s.fallback || []) {
      const el = firstVisible(sel); if (!el) continue;
      // The feature lives on a screen that is not open. Its number goes in one labelled row, so it never looks like it belongs to the open screen.
      if (SLOT && el.matches(SLOT.when)) { const row = firstVisible(SLOT.into); if (row) return { el: row, kind: "slot" }; }
      return { el, kind: el.tagName === "BUTTON" ? "badge" : "corner" };
    }
    return null;
  }
  const range = (ns) => { ns = ns.slice().sort((a, b) => a - b); const out = []; let i = 0; while (i < ns.length) { let j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++; out.push(j > i ? ns[i] + "-" + ns[j] : String(ns[i])); i = j + 1; } return out.join(", "); };
  function hintFor(items) {
    const by = (k) => items.filter((it) => it.kind === k), one = (a) => a.length === 1;
    const parts = ["Tap a number for the detail."];
    const live = by("live"), slot = by("slot"), corner = by("corner");
    if (live.length) parts.push(`Stop${one(live) ? "" : "s"} ${range(live.map((i) => i.s.n))} ${one(live) ? "is" : "are"} marked on the feature itself.`);
    if (corner.length) parts.push(`Stop${one(corner) ? "" : "s"} ${range(corner.map((i) => i.s.n))} ${one(corner) ? "appears" : "appear"} ${B.cornerHint}.`);
    if (slot.length) parts.push(`Stop${one(slot) ? "" : "s"} ${range(slot.map((i) => i.s.n))} ${one(slot) ? "is" : "are"} on ${SLOT.where}, so open ${SLOT.open} to see ${one(slot) ? "it" : "them"}.`);
    by("badge").forEach((it) => parts.push(`Stop ${it.s.n} is on the ${it.label} tab.`));
    return parts.join(" ");
  }

  // ---------- draw the numbers
  function draw() {
    markers.innerHTML = "";
    if (!S.on || G.state.tourOpen) { S.hint = ""; drawLegend(); return; }
    const vw = window.innerWidth, STEP = 34, PER_ROW = 5, items = [], caps = [], groups = new Map();
    C.STEPS.forEach((s) => {   // numbers that share an anchor sit in one tidy row, in ascending order
      const a = anchorFor(s); if (!a) return;
      const r = a.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (!groups.has(a.el)) groups.set(a.el, { a, r, steps: [] });
      groups.get(a.el).steps.push(s);
    });
    groups.forEach(({ a, r, steps }) => {
      steps.sort((p, q) => p.n - q.n);
      for (let row = 0; row * PER_ROW < steps.length; row++) {
        const chunk = steps.slice(row * PER_ROW, row * PER_ROW + PER_ROW), width = (chunk.length - 1) * STEP;
        // live: just outside the feature's left edge, so it never covers its text. badge, corner and slot: the row ends at the right edge.
        let start = a.kind === "live" ? r.left - 30 : a.kind === "badge" ? r.right - 16 - width : a.kind === "slot" ? r.right - 20 - width : r.right - 44 - width;
        start = Math.max(6, Math.min(vw - 34 - width, start));   // clamp the whole row, so markers can never pile up
        const y = Math.max(6, (a.kind === "corner" ? r.top + 8 : a.kind === "badge" ? r.top - 14 : a.kind === "slot" ? r.top + (r.height - 28) / 2 : r.top - 12) + row * STEP);
        const label = a.kind === "badge" ? ((a.el.childNodes[0] && a.el.childNodes[0].textContent) || a.el.textContent).trim() : "";
        chunk.forEach((s, i) => items.push({ s, kind: a.kind, label, x: start + i * STEP, y, fixed: a.kind !== "live" }));
        if (a.kind === "slot" && row === 0) caps.push({ right: vw - start + 8, top: y + 3 });
      }
    });
    const placed = [];   // two numbers must never touch: live ones that sit too close step further out to the left
    items.forEach((it) => {
      for (let k = 0; k < 6 && placed.some((p) => Math.abs(p.x - it.x) < 30 && Math.abs(p.y - it.y) < 30); k++) { if (!it.fixed && it.x - STEP >= 6) it.x -= STEP; else it.y += STEP; }
      placed.push(it);
      const b = document.createElement("button");
      b.type = "button"; b.className = "bmark"; b.textContent = it.s.n; b.dataset.step = it.s.id; b.dataset.where = it.kind;
      b.setAttribute("aria-label", `Stop ${it.s.n}: ${it.s.title}`);
      b.style.left = it.x + "px"; b.style.top = it.y + "px";
      markers.appendChild(b);
    });
    caps.forEach((c) => { const cap = document.createElement("span"); cap.className = "bcap"; cap.textContent = SLOT.caption; cap.style.right = c.right + "px"; cap.style.top = c.top + "px"; markers.appendChild(cap); });
    S.hint = hintFor(items); drawLegend();
  }

  function drawLegend() {
    legend.hidden = !S.on || G.state.tourOpen;
    if (legend.hidden) return;
    legend.innerHTML = `<div class="lghead">${mimg("wave", 40)}<div class="lgtitle">${esc(B.title)}: ${C.STEPS.length} stops</div></div><div class="lgrow">${C.STEPS.map((s) =>
      `<button type="button" class="lgbtn ${S.markerOpen === s.id ? "on" : ""}" data-step="${s.id}" title="${esc(s.title)}" aria-label="Stop ${s.n}: ${esc(s.title)}">${s.n}</button>`).join("")}</div>
      <div class="lghint">${esc(S.hint || "Tap a number for the detail.")}</div>`;
  }

  // ---------- the card
  function openCard(id) {
    const s = C.STEPS.find((x) => x.id === id); if (!s) return;
    S.markerOpen = id;
    const target = firstVisible(s.pin);
    card.className = "dock"; card.style.cssText = "";
    card.innerHTML = `<div class="thead"><span class="tstep">Stop ${s.n}</span>${srcChip(s.src)}<button id="builder-x" class="x" type="button" aria-label="Close">&times;</button></div>
      <h2 id="builder-title">${esc(s.title)}</h2><div class="tscroll">${rows(s)}</div>
      <div class="tfoot"><div class="tbtns"><button id="builder-show" class="primary" type="button" data-step="${s.id}">${target ? "Scroll to it" : "Show me where this is"}</button></div></div>`;
    card.hidden = false; document.body.classList.add("builder-docked");
    card.focus({ preventScroll: true });
    requestAnimationFrame(draw);
  }
  function closeCard() { card.hidden = true; S.markerOpen = null; document.body.classList.remove("builder-docked"); requestAnimationFrame(draw); }

  // take the viewer to the live feature for a stop, loading just enough of the app to show it
  function showMe(id) {
    const s = C.STEPS.find((x) => x.id === id); if (!s) return;
    host.show(s.setup);
    const el = firstVisible(s.pin) || firstVisible(s.target);
    closeCard();
    if (el) requestAnimationFrame(() => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - Math.max(80, (window.innerHeight - r.height) / 3)); draw(); });
  }

  legend.addEventListener("click", (e) => { const b = e.target.closest(".lgbtn"); if (!b) return; S.markerOpen === b.dataset.step ? closeCard() : openCard(b.dataset.step); });
  markers.addEventListener("click", (e) => { const b = e.target.closest(".bmark"); if (b) { S.markerOpen === b.dataset.step ? closeCard() : openCard(b.dataset.step); } });
  card.addEventListener("click", (e) => { if (e.target.closest("#builder-x")) closeCard(); const sm = e.target.closest("#builder-show"); if (sm) showMe(sm.dataset.step); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !G.state.tourOpen && !card.hidden) closeCard(); });
  window.addEventListener("resize", draw);
  window.addEventListener("scroll", () => { if (S.on) draw(); }, { passive: true });
  // keep the numbers in step with the app as it changes
  new MutationObserver(() => { if (S.on && !G.state.tourOpen) { clearTimeout(window.__bT); window.__bT = setTimeout(draw, 60); } })
    .observe(document.querySelector("main") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

  sw.addEventListener("click", () => setOn(!S.on));
  G.on("tour:open", () => { closeCard(); draw(); });
  G.on("tour:close", draw);
  G.on("builder:request-on", () => setOn(true));
  G.builder = { setOn, state: S };
})();
