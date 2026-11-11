/*
 * Product Builder guide kit: shared core. Used by tour.js (Take a Tour) and builder.js (Builder mode).
 * Loads after guide-content.js and the app, before tour.js and builder.js.
 *
 * The kit never reaches into the app. It talks to it only through window.GuideHost:
 *   reset()          clear the app to a clean state
 *   home()           go to the app's first screen
 *   snapshot()       return the viewer's own work, so the tour can put it back
 *   restore(snap)    put that work back
 *   setup(setup)     put the app in the state a tour step needs (the step's `setup` object, defined in the content file)
 *   show(setup)      Builder mode's "Show me where this is": load only what is missing
 * Everything written for the reader (steps, wording, the guide's name and pictures) is in window.GUIDE (guide-content.js).
 */
(function () {
  const G = (window.Guide = window.Guide || {});
  G.content = window.GUIDE;
  G.host = window.GuideHost;
  if (!G.content || !G.host) { console.error("Guide kit: guide-content.js and a GuideHost are both required."); return; }
  // sensible defaults, so a project that has nothing special to say about Builder mode still works
  G.content.BUILDER = Object.assign({ title: "Builder mode", cornerHint: "in this panel", slot: null }, G.content.BUILDER || {});

  // ---- tiny event bus, so the two modes can react to each other without knowing each other's code
  const listeners = {};
  G.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
  G.emit = (name, data) => { (listeners[name] || []).forEach((fn) => fn(data)); };

  G.state = { tourOpen: false, builderOn: false };

  // ---- helpers
  G.$ = (sel) => document.querySelector(sel);
  G.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  G.vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  G.firstVisible = (sel) => [...document.querySelectorAll(sel)].find(G.vis) || null;
  G.narrow = () => window.innerWidth <= 900;

  // ---- the controls (Take the tour, Builder mode switch) go in #guide-controls. If the page has none, float them top right.
  G.controls = () => {
    let c = G.$("#guide-controls");
    if (!c) { c = document.createElement("div"); c.id = "guide-controls"; c.className = "guide-controls floating"; document.body.appendChild(c); }
    return c;
  };

  // ---- the four rows every card has, always in this order. This is part of the signature look.
  G.ROWS = [["today", "Today"], ["built", "What I built"], ["why", "Why it should work"], ["measure", "How I would measure it"]];
  G.rows = (s) => `<dl class="trows">${G.ROWS.map(([k, label]) => `<div><dt>${label}</dt><dd>${G.esc(s[k])}</dd></div>`).join("")}</dl>`;

  // ---- the guide character
  const M = G.content.MASCOT;
  G.mimg = (pose, px) => `<img class="mascot" src="${M[pose]}" width="${px}" height="${px}" alt="" onerror="this.style.display='none'">`;
  G.intro = (pose, px, sub) => `<div class="mintro">${G.mimg(pose, px)}<div class="mwho"><b>${G.esc(M.name)}</b><span>${G.esc(sub)}</span></div></div>`;
  G.srcChip = (id) => `<span class="srcchip src-${id}" title="${G.esc(G.content.SOURCES[id].full)}">${G.esc(G.content.SOURCES[id].short)}</span>`;
})();
