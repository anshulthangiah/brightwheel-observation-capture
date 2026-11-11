/* ALL DATA IS SYNTHETIC. No real children, photos, voices, schools or results.
 * "vision.tags" is the scripted result of the simulated photo-reading step. No model is run.
 * "levels" is the scripted benchmark the simulated assistant proposes per child (0 to 8).
 * "history" is made-up earlier observations in the current three-month window.
 * "sites" is made-up site-level evidence counts for the concept district view. */
(function (root) {
  const DATA = {
    room: "Sunflower Room (synthetic)",
    teacher: "Ms. Rivera (synthetic)",
    roster: [
      { id: "leo", first: "Leo", color: "#4f7cff" },
      { id: "maya", first: "Maya", color: "#ff7a59" },
      { id: "noah", first: "Noah", color: "#2fb67c" },
      { id: "aisha", first: "Aisha", color: "#b066ff" },
      { id: "omar", first: "Omar", color: "#f2a900" },
      { id: "sam", first: "Sam", color: "#00a3bf" },
      { id: "ria", first: "Ria", color: "#e0457b" },
      { id: "zara", first: "Zara", color: "#6b7a8f" },
      { id: "ben", first: "Ben", color: "#8a5a44" },
      { id: "jay", first: "Jay", color: "#3d9970" }
    ],
    captures: [
      { id: "c1", time: "7:41 AM", photo: "media/c1.svg", audio: "media/c1.mp3",
        vision: { caption: "A child next to a stack of five coloured blocks", tags: ["5 stacked blocks", "tower standing", "1 child"] },
        note: "Leo built a tall tower with five blocks and counted them out loud, one to five.",
        levels: { "M1a": { leo: 5 }, "M2a": { leo: 3 } } },
      { id: "c2", time: "8:20 AM", photo: "media/c2.svg", audio: "media/c2.mp3",
        vision: { caption: "A child with paint in blue, yellow and green", tags: ["blue paint", "yellow paint", "green mixed", "1 child"] },
        note: "Maya mixed blue and yellow paint and said it made green. She asked what happens if we add red.",
        levels: { "SCI1a": { maya: 4 }, "SCI1b": { maya: 4 } } },
      { id: "c3", time: "9:05 AM", photo: "media/c3.svg", audio: "media/c3.mp3",
        vision: { caption: "A child at a table with a two-colour puzzle", tags: ["puzzle", "seated at table", "1 child"] },
        note: "Noah worked on the puzzle for ten minutes. He got frustrated, took a deep breath, and tried again by himself.",
        levels: { "ATL1b": { noah: 3 }, "SED2a": { noah: 3 } } },
      { id: "c4", time: "9:48 AM", photo: "media/c4.svg", audio: "media/c4.mp3",
        vision: { caption: "Two children close together, one holding a small brown toy", tags: ["2 children", "teddy bear", "close together"] },
        note: "Aisha noticed Omar was sad and gave him her teddy. They played together after.",
        levels: { "SED3d": { aisha: 5 }, "SED3b": { aisha: 4, omar: 4 } } },
      { id: "c5", time: "10:12 AM", photo: "media/c5.svg", audio: "media/c5.mp3",
        vision: { caption: "A child beside a book with the letter S on the cover", tags: ["book", "letter S", "1 child"] },
        note: "Sam told the story of his fishing trip in three sentences and pointed to the letter S on the book cover.",
        levels: { "LLD2a": { sam: 4 }, "LLD4": { sam: 3 } } },
      { id: "c6", time: "10:40 AM", photo: "media/c6.svg", audio: "media/c6.mp3",
        vision: { caption: "A child beside a dashed curved line on paper", tags: ["curved line", "paper", "1 child"] },
        note: "Ria cut along a curved line with safety scissors and held her crayon with a tripod grip.",
        levels: { "PD2": { ria: 5 } } },
      { id: "c7", time: "11:02 AM", photo: "media/c7.svg", audio: "media/c7.mp3",
        vision: { caption: "A child beside three stacked cups", tags: ["3 cups", "stacked", "1 child"] },
        note: "Zara stacked cups.",
        levels: { "PD2": { zara: 3 } } },
      { id: "c8", time: "11:30 AM", photo: "media/c8.svg", audio: "media/c8.mp3",
        vision: { caption: "A child next to a low balance beam", tags: ["balance beam", "outdoor play area", "1 child"] },
        note: "Jay balanced on the beam and jumped off with both feet.",
        levels: { "PD1": { jay: 4 } } },
      { id: "c9", time: "12:15 PM", photo: "media/c9.svg", audio: "media/c9.mp3",
        vision: { caption: "A child standing near a shelf", tags: ["shelf", "1 child"] },
        note: "Ben bumped his head on the shelf and cried. Told the director.", levels: {} },
      { id: "c10", time: "12:50 PM", photo: "media/c10.svg", audio: "media/c10.mp3",
        vision: { caption: "A rainy window with no children in view", tags: ["window", "rain", "no children"] },
        note: "The group was a bit loud this morning after the rain.", levels: {} }
    ],
    // goalId -> childId -> earlier observations in this window
    history: {
      "M1a": { leo: [{ date: "Oct 6", level: 2, by: "Ms. Rivera" }], maya: [{ date: "Oct 12", level: 4, by: "Ms. Rivera" }], aisha: [{ date: "Oct 15", level: 4, by: "Ms. Rivera" }],
                sam: [{ date: "Oct 21", level: 3, by: "Mr. Diaz" }], ria: [{ date: "Oct 22", level: 3, by: "Mr. Diaz" }], jay: [{ date: "Nov 1", level: 4, by: "Ms. Rivera" }] },
      "PD2": { ria: [{ date: "Oct 20", level: 3, by: "Mr. Diaz" }], noah: [{ date: "Oct 3", level: 3, by: "Ms. Rivera" }], aisha: [{ date: "Oct 17", level: 3, by: "Ms. Rivera" }],
                jay: [{ date: "Oct 30", level: 4, by: "Ms. Rivera" }], maya: [{ date: "Oct 10", level: 3, by: "Ms. Rivera" }], sam: [{ date: "Nov 4", level: 4, by: "Mr. Diaz" }],
                leo: [{ date: "Oct 8", level: 3, by: "Ms. Rivera" }], omar: [{ date: "Oct 13", level: 3, by: "Mr. Diaz" }] },
      "ATL1b": { noah: [{ date: "Oct 14", level: 3, by: "Ms. Rivera" }], leo: [{ date: "Oct 2", level: 3, by: "Ms. Rivera" }], maya: [{ date: "Oct 11", level: 2, by: "Ms. Rivera" }],
                aisha: [{ date: "Oct 16", level: 3, by: "Ms. Rivera" }], jay: [{ date: "Oct 29", level: 3, by: "Ms. Rivera" }] },
      "SCI1a": { maya: [{ date: "Oct 28", level: 3, by: "Ms. Rivera" }], leo: [{ date: "Oct 7", level: 3, by: "Ms. Rivera" }], sam: [{ date: "Oct 20", level: 2, by: "Mr. Diaz" }] },
      "SED3d": { aisha: [{ date: "Oct 9", level: 4, by: "Ms. Rivera" }], omar: [{ date: "Oct 19", level: 3, by: "Mr. Diaz" }], jay: [{ date: "Nov 2", level: 3, by: "Ms. Rivera" }],
                maya: [{ date: "Oct 23", level: 4, by: "Ms. Rivera" }], ria: [{ date: "Oct 24", level: 3, by: "Mr. Diaz" }], leo: [{ date: "Oct 5", level: 3, by: "Ms. Rivera" }], sam: [{ date: "Nov 5", level: 3, by: "Mr. Diaz" }] },
      "SED2a": { leo: [{ date: "Oct 9", level: 3, by: "Ms. Rivera" }], maya: [{ date: "Oct 14", level: 3, by: "Ms. Rivera" }] },
      "SED3b": { jay: [{ date: "Oct 21", level: 3, by: "Ms. Rivera" }], sam: [{ date: "Oct 27", level: 4, by: "Mr. Diaz" }] },
      "LLD2a": { maya: [{ date: "Oct 15", level: 4, by: "Ms. Rivera" }], leo: [{ date: "Oct 22", level: 4, by: "Ms. Rivera" }], ria: [{ date: "Oct 29", level: 3, by: "Mr. Diaz" }] },
      "LLD4": { ria: [{ date: "Oct 30", level: 3, by: "Mr. Diaz" }] },
      "SCI1b": { leo: [{ date: "Oct 12", level: 3, by: "Ms. Rivera" }] },
      "PD1": { leo: [{ date: "Oct 3", level: 3, by: "Ms. Rivera" }], noah: [{ date: "Oct 25", level: 3, by: "Ms. Rivera" }] },
      "M2a": { leo: [{ date: "Oct 6", level: 3, by: "Ms. Rivera" }], maya: [{ date: "Oct 18", level: 3, by: "Ms. Rivera" }] }
    },
    // Concept district view. Evidence quality only, no outcomes.
    sites: [
      { name: "Maple Street Center", type: "Center", rooms: 6, children: 72, kidsObserved: 61, obs: 214, obsWithPhoto: 168, sparseRooms: 0, avgSkills: 18 },
      { name: "Riverside Learning Center", type: "Center", rooms: 8, children: 96, kidsObserved: 52, obs: 131, obsWithPhoto: 70, sparseRooms: 3, avgSkills: 11 },
      { name: "Oak Park Home Network", type: "Home-based network", rooms: 12, children: 58, kidsObserved: 31, obs: 62, obsWithPhoto: 20, sparseRooms: 7, avgSkills: 6 }
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.DATA = DATA;
})(typeof self !== "undefined" ? self : this);
