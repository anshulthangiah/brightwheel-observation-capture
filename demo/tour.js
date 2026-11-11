/*
 * Take a Tour: the first-run guided walkthrough. Needs guide-common.js.
 *
 * Flow: welcome card -> one stop per step (the live feature is spotlit, the card is docked at the side) -> wrap-up card.
 * Rules that make it feel the same in every project:
 *   - the card sits in one fixed place with the four rows in one fixed order; the page makes room, so it never covers the feature
 *   - the page cannot be scrolled by hand during the tour, so the viewer never loses the highlighted feature
 *   - it is offered once per browser (storage key from the content file), never forced, skippable at any time, Escape closes it
 *   - it puts the viewer's own work back when it ends
 *   - ?notour in the address skips the first-run offer (used by tests and by people who have seen it)
 * It talks to Builder mode only through events: it emits tour:open, tour:close, builder:request-on.
 */
(function () {
  const G = window.Guide; if (!G) return;
  const { $, esc, firstVisible, narrow, rows, intro, mimg, srcChip, host, content: C } = G;
  const html = document.documentElement;
  const KEY = C.META.storageKey;
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set: () => { try { localStorage.setItem(KEY, "1"); } catch (e) { /* private mode */ } } };
  const S = { i: -1, saved: null, lastFocus: null, token: 0 };

  // ---------- DOM
  const root = document.createElement("div");
  root.id = "tour-root";
  root.innerHTML = `<div id="tour-dim" hidden></div><div id="tour-ring" hidden></div>
    <div id="tour-card" class="dock" role="dialog" aria-modal="false" aria-labelledby="tour-title" tabindex="-1" hidden></div>`;
  document.body.appendChild(root);
  const dim = $("#tour-dim"), ring = $("#tour-ring"), card = $("#tour-card");

  const startBtn = document.createElement("button");
  startBtn.id = "tour-start"; startBtn.type = "button"; startBtn.className = "ghost"; startBtn.textContent = C.META.tourButton;
  G.controls().appendChild(startBtn);

  // ---------- the spotlight: a ring around the feature, with the rest of the page dimmed by the ring's own shadow
  function ringTo(el) {
    const r = el.getBoundingClientRect(), pad = 6;
    ring.hidden = false; dim.classList.add("clear");
    Object.assign(ring.style, { left: Math.max(4, r.left - pad) + "px", top: Math.max(4, r.top - pad) + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
  }
  // bring the feature into the free part of the screen (the part not under the dock), then put the ring on it
  function focusFeature(el, token) {
    if (!G.state.tourOpen || (token !== undefined && token !== S.token)) return;   // the tour closed or moved on while this was waiting
    if (!el) { ring.hidden = true; dim.classList.remove("clear"); return; }
    const vh = window.innerHeight, freeH = narrow() ? vh * 0.5 : vh, r = el.getBoundingClientRect();
    const target = r.height > freeH - 40 ? 12 : Math.max(12, (freeH - r.height) / 2);
    window.scrollBy(0, r.top - target);
    requestAnimationFrame(() => { if (G.state.tourOpen && (token === undefined || token === S.token)) ringTo(el); });
  }

  const dots = (n, total) => `<div class="tdots" aria-hidden="true">${Array.from({ length: total }, (_, k) => `<i class="${k === n ? "on" : k < n ? "done" : ""}"></i>`).join("")}</div>`;
  const lock = (on) => { html.classList.toggle("tour-lock", on); if (!on) document.body.classList.remove("tour-open"); };
  const dockSpace = (on) => document.body.classList.toggle("tour-open", on);
  const centerCard = (w) => { card.className = "dock center"; card.style.cssText = ""; card.style.width = Math.min(w, window.innerWidth - 24) + "px"; };
  const focusCard = () => { const b = card.querySelector("#t-next, #t-try"); if (b) b.focus({ preventScroll: true }); };

  function openTour() {
    S.lastFocus = document.activeElement;
    S.saved = host.snapshot();
    G.state.tourOpen = true; S.i = -1;
    G.emit("tour:open");
    lock(true); dim.hidden = false; card.hidden = false; render();
  }
  function closeTour(markSeen) {
    S.token++; G.state.tourOpen = false; dim.hidden = true; ring.hidden = true; card.hidden = true; dim.classList.remove("clear");
    lock(false);
    if (markSeen) store.set();
    if (S.saved) { host.restore(S.saved); S.saved = null; }
    host.home(); window.scrollTo(0, 0);
    if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus({ preventScroll: true });
    G.emit("tour:close");
  }

  function render() {
    const total = C.STEPS.length; S.token++;
    if (S.i === -1) {   // welcome
      dockSpace(false); ring.hidden = true; dim.classList.remove("clear"); centerCard(480);
      card.innerHTML = `${intro("wave", 96, "Your guide for this tour")}<div class="tkicker">${esc(C.WELCOME.kicker)}</div>
        <h2 id="tour-title">${esc(C.WELCOME.title)}</h2>
        <p>${esc(C.WELCOME.p1)}</p><p>${esc(C.WELCOME.p2)}</p>
        <p class="tnote">${esc(C.WELCOME.note)}</p>
        <div class="tbtns"><button id="t-skip" class="ghost" type="button">Skip tour</button><button id="t-next" class="primary" type="button">Start (${total} stops)</button></div>`;
      return focusCard();
    }
    if (S.i >= total) {   // wrap-up: what this shows, what it does not prove, what I would do first, then two clear actions
      dockSpace(false); host.reset(); host.home(); ring.hidden = true; dim.classList.remove("clear"); centerCard(520);
      const A = C.CLOSE.ctas;
      card.innerHTML = `${intro("thumbs", 72, "That was the tour")}<div class="tkicker">Wrap-up</div><h2 id="tour-title">${esc(C.CLOSE.title)}</h2>
        <ul class="tclose">${C.CLOSE.points.map((p) => `<li><b>${esc(p[0])}</b> ${esc(p[1])}</li>`).join("")}</ul>
        <p class="tnote"><b>What this does not prove.</b> ${esc(C.CLOSE.limits)}</p>
        <div class="tnote plan"><b class="ptitle">What I would do first</b>
          <dl class="planlist">${C.CLOSE.plan.map((p) => `<div><dt>${esc(p[0])}</dt><dd>${esc(p[1])}</dd></div>`).join("")}</dl></div>
        <div class="ctas" role="group" aria-label="What would you like to do next">
          <button id="t-try" class="cta primary" type="button"><span class="ctat">${esc(A.try.title)}</span><span class="ctad">${esc(A.try.desc)}</span></button>
          <button id="t-builder" class="cta" type="button"><span class="ctat">${esc(A.builder.title)}</span><span class="ctad">${esc(A.builder.desc)}</span></button>
        </div>
        <div class="tlinks"><button id="t-back" class="link" type="button">Back to stop ${total}</button><button id="t-replay" class="link" type="button">Replay the tour</button></div>`;
      return focusCard();
    }
    const s = C.STEPS[S.i];
    dockSpace(true); host.setup(s.setup);
    card.className = "dock"; card.style.cssText = "";
    card.innerHTML = `<div class="thead">${mimg("thumbs", 44)}<div class="mwho"><b>${esc(C.MASCOT.name)}</b><span class="tstep">Stop ${s.n} of ${total}</span></div><button id="t-skip" class="x" type="button" aria-label="Close the tour">&times;</button></div>
      <div class="srcrow">${srcChip(s.src)}</div>
      <h2 id="tour-title">${esc(s.title)}</h2><div class="tscroll">${rows(s)}</div>
      <div class="tfoot">${dots(S.i, total)}
        <div class="tbtns"><button id="t-back" class="ghost" type="button">Back</button><button id="t-next" class="primary" type="button">${S.i === total - 1 ? "Finish" : "Next"}</button></div></div>`;
    const my = ++S.token;
    requestAnimationFrame(() => requestAnimationFrame(() => focusFeature(firstVisible(s.target), my)));
    focusCard();
  }

  card.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    const id = btn.id;
    if (id === "t-next") { S.i++; render(); }
    else if (id === "t-back") { S.i = Math.max(-1, S.i - 1); render(); }
    else if (id === "t-skip") closeTour(true);
    else if (id === "t-try") { closeTour(true); const sel = C.CLOSE.ctas.try.focus; const t = sel ? firstVisible(sel) : null; if (t && t.focus) t.focus(); }
    else if (id === "t-builder") { closeTour(true); G.emit("builder:request-on"); }
    else if (id === "t-replay") { S.i = -1; render(); }
  });
  // the dim layer blocks the app while the tour is open; a stray click on it does not close the tour, so the viewer keeps their place
  ["wheel", "touchmove"].forEach((ev) => dim.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener("keydown", (e) => {
    if (!G.state.tourOpen) return;
    if (e.key === "Escape") closeTour(true);
    else if (e.key === "ArrowRight") { e.preventDefault(); const b = card.querySelector("#t-next"); if (b) b.click(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); const b = card.querySelector("#t-back"); if (b) b.click(); }
    else if ([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"].includes(e.key) && !e.target.closest("button")) e.preventDefault();
    else if (e.key === "Tab") {   // keep focus inside the card while the tour is open
      const f = [...card.querySelectorAll("button")]; if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("resize", () => { if (G.state.tourOpen && S.i >= 0 && S.i < C.STEPS.length) focusFeature(firstVisible(C.STEPS[S.i].target)); });

  startBtn.addEventListener("click", openTour);
  G.tour = { open: openTour, close: closeTour, state: S };

  // first visit: offer the tour, never force it, unless the page was opened with ?notour
  if (!store.get() && !/[?&]notour/.test(location.search)) setTimeout(openTour, 500);
})();
