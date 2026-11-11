/*
 * Content for Take a Tour and Builder mode. This is the ONLY file that is specific to a project.
 * One source of truth: the tour walks through these steps in order, and Builder mode pins the same cards onto the live screens.
 * Every claim about brightwheel is labelled with where it came from. "bot" means a brightwheel support chatbot
 * answer that has not been verified against documentation, and is shown to the viewer as such.
 * Plain data, no DOM, so it can be unit tested in Node.
 */
(function (root) {
  // Settings the shared guide code reads. Change these per project, nothing else in the guide needs editing.
  const META = {
    storageKey: "oc_tour_seen_v1",          // remembers that the tour has been seen in this browser
    tourButton: "Take the tour",
    builderLabel: "Builder mode",
    builderAria: "Builder mode, shows the gaps and fixes on every screen"
  };

  // Builder mode wording that depends on the product's screens.
  //   slot: when a step's feature lives on a screen that is not open (the "when" element is what leads to it), its number
  //         goes in one labelled row inside the "into" element, so it never looks like it belongs to the wrong tab.
  const BUILDER = {
    title: "Builder mode",
    cornerHint: "in this panel once you load a moment",
    slot: { when: ".topnav button[data-tab=teacher]", into: ".tabrow", caption: "On the Teacher screens", where: "the Teacher screens", open: "the Teacher tab" }
  };

  const SOURCES = {
    page: { short: "Published page", full: "Taken from a published brightwheel help-center or product page." },
    bot: { short: "Support chatbot, unverified", full: "Taken from an answer by brightwheel's own support chatbot. Chatbot answers can be wrong and have not been verified against documentation." },
    both: { short: "Help center and chatbot", full: "Partly from a published brightwheel page and partly from its support chatbot. The chatbot part is unverified." }
  };

  // The guide. Shown only in the tour dock, the welcome and wrap-up cards, and the Builder mode legend.
  const MASCOT = { name: "Product Builder Anshul", wave: "assets/mascot-wave.png", thumbs: "assets/mascot-thumbs.png" };

  const WELCOME = {
    id: "welcome",
    kicker: "Portfolio concept",
    title: "A two-minute tour",
    p1: "Brightwheel already ships Smart observations: say or type a note and it drafts the observation. This concept is about the step after that: observations a teacher can trust, and results a district or state can see.",
    p2: "Six stops. Each shows one gap: what exists today, what I built, why it should work, and how I would measure it.",
    note: "Built by Anshul Thangiah as a portfolio concept for the Principal Product Manager, Education role. A scripted simulation: no AI model runs, and every child, photo, voice and school figure is synthetic. Not affiliated with brightwheel. Where a claim comes from is labelled, and support-chatbot answers are marked unverified."
  };

  // Where a step's number goes when its live feature is not on the current screen: a panel or a tab that leads to it.
  const CAPTURE_HOME = ["#capture-detail", ".subnav button[data-tab=capture]", ".topnav button[data-tab=teacher]"];

  const STEPS = [
    {
      id: "why", n: 1, title: "Every suggestion says why, and the photo counts", src: "both",
      today: "Smart observations reads only the words typed or spoken, and suggests skills and benchmarks with no reason or confidence. The photo is added afterwards and plays no part.",
      built: "Each suggested skill shows the words you said and what the photo shows. A photo can be the second piece of evidence that makes a suggestion High confidence, but it can never create a suggestion on its own.",
      why: "Recognition over recall: checking a reason you can see is faster than working one out. A teacher can judge a suggestion at a glance.",
      measure: "% of drafts a teacher approves without changing them, and seconds spent per draft in review.",
      setup: { capture: "c7", view: "capture" },
      target: "#stage .goal .why", pin: "#stage .goal .why, #queue .goal .why", fallback: CAPTURE_HOME
    },
    {
      id: "benchmark", n: 2, title: "A benchmark for each child, with their history", src: "bot",
      today: "The suggested benchmark ignores the child's earlier ones. If two teachers rate the same skill differently, both ratings stay in the record and nothing flags it.",
      built: "Each child gets their own benchmark, with the last one, who gave it and when, shown beside it. A jump of 2 or more levels asks the teacher to check it before it is logged.",
      why: "Feedback loop: seeing what the last rating was lets the teacher decide whether a change is real, instead of trusting the suggestion blindly.",
      measure: "% of big jumps (2 or more levels) that the teacher changes after the check. Near 0% means the check is noise. A high % means it catches real mistakes or disagreement between teachers.",
      setup: { capture: "c1", view: "capture" },
      target: "#stage .levels", pin: "#stage .levels, #queue .levels", fallback: CAPTURE_HOME
    },
    {
      id: "coverage", n: 3, title: "Who is still missing, shown while capturing", src: "both",
      today: "Coverage lives in a web report the teacher has to open. The rating screen shows 'No recent observation' per child, but there are no reminders or weekly targets.",
      built: "While capturing, the matched skill shows how many children already have an observation in the last three months, and names the children who have none.",
      why: "Zeigarnik effect: people remember unfinished things. Showing who is still missing at the moment of capture turns a hidden report into a visible to-do.",
      measure: "% of children with at least one recent observation in each learning area (for example Math, or Language and Literacy). A child with none in an area is a gap.",
      setup: { capture: "c1", view: "capture" },
      target: "#stage .nudge", pin: "#stage .nudge", fallback: CAPTURE_HOME
    },
    {
      id: "visibility", n: 4, title: "Who sees it is a choice, and injuries are never mapped", src: "bot",
      today: "Observations are family-visible by default, and the teacher must switch each one to Staff only. A note about an injury is treated like any other and may get skill suggestions.",
      built: "An explicit choice at capture and in review. Notes about injury or illness are not mapped to skills, are locked to Staff only, and go to an incident record.",
      why: "Default bias: people mostly keep the default. When the default is risky, safety should not depend on a teacher remembering to change it.",
      measure: "% of injury or illness notes correctly kept off learning records (target near 100%). % of entries switched to Staff only after families already saw them (lower is better).",
      setup: { capture: "c9", view: "capture" },
      target: "#stage .visctl", pin: "#stage .visctl, #queue .visctl", fallback: CAPTURE_HOME
    },
    {
      id: "review", n: 5, title: "A review teachers will actually finish", src: "both",
      today: "There is no director approval or reconciliation step before an observation shows in reports. The teacher reviews each draft before logging it.",
      built: "Drafts are sorted into four groups: needs attention, check the level, clear matches, and needs your choice. Big jumps wait for a check and are never bulk-approved. Clear matches can be approved together. Everything can be undone.",
      why: "Chunking and decision fatigue: a few grouped decisions get finished, and a long mixed list gets abandoned. An unfinished review means missing observations.",
      measure: "Minutes a teacher spends in review per day (target under 3), and % of drafts approved without changes.",
      setup: { seed: ["c9", "c1", "c6", "c2", "c7", "c10"], view: "review" },
      target: "#groupbar", pin: "#groupbar", fallback: [".subnav button[data-tab=review]", ".topnav button[data-tab=teacher]"]
    },
    {
      id: "district", n: 6, title: "Something a district or state can see and export", src: "both",
      today: "Assessment reports are per site and export as PDF only. They are not in the multi-site dashboard. Brightwheel's own pages describe organization-wide visibility of activity, so this gap is partly unconfirmed.",
      built: "A sponsor view of evidence quality across sites, with a CSV export. It shows coverage and consistency, not child outcomes, on purpose: results mean little until the evidence behind them is consistent.",
      why: "A buyer funds what it can verify. A sponsor who can see consistent evidence across a whole network has a reason to pay for assessments there, which makes multi-year terms testable.",
      measure: "Product test: a sponsor finds the lowest-coverage site and exports the data in under two minutes, without help. Business test: of the first three sponsors shown this view, how many agree to a paid pilot.",
      setup: { view: "district" },
      target: "#district table.dist", pin: "#district table.dist", fallback: [".topnav button[data-tab=district]"]
    }
  ];

  const CLOSE = {
    id: "close",
    title: "What this shows about how I work",
    points: [
      ["Start from what exists.", "I read the help center, product pages and published research first, and labelled every claim by where it came from."],
      ["Separate known from assumed.", "Several gaps rest on support-chatbot answers. Each is marked unverified, and every target in the spec is an assumption to test."],
      ["Design for the outcome, then measure it.", "Each change names the objective it protects and the metric that would show it worked."],
      ["Build it, and test it.", "A working prototype with automated unit tests and real-browser checks, not a slide."],
      ["Tie it to the business.", "First model to test: a state or district sponsor pays for assessments across its programs, on a multi-year contract."]
    ],
    ctas: {
      try: { title: "Try the prototype", desc: "Capture a moment yourself, start to finish", focus: "#capture-list li" },
      builder: { title: "Turn on Builder mode", desc: "See each gap marked on the live screens" }
    },
    limits: "It is a scripted simulation with synthetic data and a rule-based stand-in for the AI. It does not show real accuracy, and no sponsor has been asked yet.",
    plan: [
      ["Weeks 1-2", "Interview 10 teachers, 5 directors and 3 network or state contacts."],
      ["Weeks 3-4", "Test on sample notes in 3 volunteer rooms."],
      ["Weeks 5-8", "Pilot in 10 rooms."],
      ["Weeks 9-12", "Show the combined view to 3 sponsors."]
    ]
  };

  const api = { META, BUILDER, SOURCES, MASCOT, WELCOME, STEPS, CLOSE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GUIDE = api;
})(typeof self !== "undefined" ? self : this);
