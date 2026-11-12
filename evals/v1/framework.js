/* FROZEN COPY of the rules as they were before tuning (see evals/README.md). Do not edit: the 'before' scores depend on it. */
/*
 * Skill structure of the Experience Developmental Continuum of Skills, as published in Experience Early
 * Learning's 2025 state-alignment documents: 8 domains, 73 sub-skills. NAMES AND CODES ONLY.
 * Skill names and codes are (c) Experience Early Learning Co. and are used here for reference with
 * attribution. Benchmark descriptors are deliberately NOT reproduced; benchmarks are plain numbers 0 to 8.
 * Not affiliated with, or endorsed by, Experience Early Learning or brightwheel.
 *
 * The "cues" below are MY keyword rules for the demo's stand-in matcher. They are not from the continuum.
 * Only some skills have cues; the rest exist so the "add a different skill" list shows the full structure.
 */
(function (root) {
  const DOMAINS = {
    SED: "Social & Emotional Development", ATL: "Approaches to Learning", PD: "Physical Development",
    LLD: "Language & Literacy Development", M: "Mathematics", SCI: "Science", SS: "Social Studies", CA: "Creative Arts"
  };
  // [code, skill, sub-skill name]
  const SKILLS = [
    ["SED 1a", "Self-Awareness", "Knows self and expresses confidence"], ["SED 1b", "Self-Awareness", "Expresses needs and preferences"],
    ["SED 1c", "Self-Awareness", "Completes tasks independently"], ["SED 1d", "Self-Awareness", "Identifies emotions"],
    ["SED 2a", "Self-Regulation", "Manages feelings and behavior"], ["SED 2b", "Self-Regulation", "Follows routines and transitions"],
    ["SED 3a", "Social Relationships", "Develops relationships with adults"], ["SED 3b", "Social Relationships", "Develops relationships with peers"],
    ["SED 3c", "Social Relationships", "Participates cooperatively in groups"], ["SED 3d", "Social Relationships", "Identifies and respects emotions of others"],
    ["SED 4a", "Problem-Solving", "Solves problems"], ["SED 4b", "Problem-Solving", "Responsible decision-making"],
    ["ATL 1a", "Attention & Persistence", "Attends"], ["ATL 1b", "Attention & Persistence", "Persists"],
    ["ATL 2a", "Flexibility & Play", "Shows flexibility"], ["ATL 2b", "Flexibility & Play", "Engages in play"],
    ["PD 1", "Gross Motor", "Builds strength, coordination and balance of large muscles"], ["PD 2", "Fine Motor", "Builds strength and coordination of small movements"],
    ["PD 3", "Safety", "Demonstrates safe practices"], ["PD 4a", "Personal Care", "Implements self-care routines"],
    ["PD 4b", "Personal Care", "Understands bodily functions"], ["PD 5", "Nutrition", "Follows healthy nutrition routines"],
    ["LLD 1a", "Listening", "Understands and interprets language"], ["LLD 1b", "Listening", "Follows directions"],
    ["LLD 2a", "Communication", "Uses language to express information and ask/answer questions"], ["LLD 2b", "Communication", "Uses conversational skills"],
    ["LLD 2c", "Communication", "Uses sentence structure"], ["LLD 2d", "Communication", "Uses and expands vocabulary"],
    ["LLD 3a", "Phonological Awareness", "Rhyme"], ["LLD 3b", "Phonological Awareness", "Hears large units of sound"],
    ["LLD 3c", "Phonological Awareness", "Hears small units of sound"], ["LLD 4", "Alphabetic Knowledge", "Identifies letters, makes letter-sound connections and decodes"],
    ["LLD 5", "Concepts of Print", "Uses print concepts and explores books and other text"], ["LLD 6a", "Reading Comprehension", "Responds to text"],
    ["LLD 6b", "Reading Comprehension", "Retells, asks and answers questions about a text or story"], ["LLD 7a", "Writing", "Emergent writing"],
    ["LLD 7b", "Writing", "Uses writing to represent meaning"],
    ["M 1a", "Number Sense", "Verbally counts numbers"], ["M 1b", "Number Sense", "Identifies and writes numerals"],
    ["M 1c", "Number Sense", "Counting one-to-one, and composing and decomposing numbers"], ["M 1d", "Number Sense", "Number quantities and comparison"],
    ["M 1e", "Number Sense", "Addition and subtraction"], ["M 2a", "Spatial Awareness", "Understands how objects move in space"],
    ["M 2b", "Spatial Awareness", "Determines object location"], ["M 3", "Shapes", "Identifies shapes and their characteristics"],
    ["M 4a", "Measurement", "Measures and estimates"], ["M 4b", "Measurement", "Compares and orders"],
    ["M 5", "Patterns", "Copies, creates and extends patterns"], ["M 6", "Classification", "Sorts and graphs"],
    ["SCI 1a", "Investigation & Inquiry", "Asks questions and makes predictions"], ["SCI 1b", "Investigation & Inquiry", "Observes, describes and records"],
    ["SCI 2a", "Natural & Earth Science", "Understanding living and nonliving things"], ["SCI 2b", "Natural & Earth Science", "Demonstrates knowledge of Earth's environment"],
    ["SCI 3a", "Physical Science", "Explores forces and motion"], ["SCI 3b", "Physical Science", "Explores the physical properties of materials"],
    ["SCI 4", "Technology", "Uses tools and technology to perform tasks"],
    ["SS 1a", "Culture & Community", "Identifies community and family roles"], ["SS 1b", "Culture & Community", "Explores and respects cultures and traditions"],
    ["SS 1c", "Culture & Community", "Respect diversity"], ["SS 2a", "Civics & Economics", "Follows rules, limits and expectations"],
    ["SS 2b", "Civics & Economics", "Understands concepts of money and economics"], ["SS 3a", "Geography", "Identifies types of places"],
    ["SS 3b", "Geography", "Interacts with maps"], ["SS 4", "History & Sense of Time", "Develops sense of time"],
    ["CA 1a", "Music", "Expresses through music"], ["CA 1b", "Music", "Develops rhythm"], ["CA 1c", "Music", "Develops tone"],
    ["CA 2a", "Dance & Movement", "Expresses through dance"], ["CA 2b", "Dance & Movement", "Develops movement techniques"],
    ["CA 3a", "Visual Arts", "Expresses through 2D and 3D visual art"], ["CA 3b", "Visual Arts", "Develops visual art techniques"],
    ["CA 4a", "Drama", "Participates in dramatic and symbolic play"], ["CA 4b", "Drama", "Uses and creates props to represent other objects or ideas"]
  ];

  // Demo-only keyword rules (mine). "photo" is the pattern a photo tag must match to count as a second piece of evidence.
  const CUES = {
    "SED 1a": { cues: [{ id: "proud", re: /(proud|showed everyone|said (she|he) did it|I did it)/i }, { id: "conf", re: /confident\w*/i }] },
    "SED 2a": { cues: [{ id: "frus", re: /(frustrat\w*|upset|angry)/i }, { id: "breath", re: /(took a (deep )?breath|calm(ed)? (down|himself|herself)|used (his|her) words)/i }] },
    "SED 3b": { cues: [{ id: "together", re: /(played together|took turns|invited [^.]{0,20}to play|worked together)/i }, { id: "shared", re: /shared (the|his|her|their)? ?\w+/i }] },
    "SED 3d": { cues: [{ id: "noticed", re: /noticed [^.]{0,30}(sad|upset|crying|lonely)/i }, { id: "comfort", re: /(comforted|gave (him|her|them) [^.]{0,20}|hugged)/i }] },
    "ATL 1b": { cues: [{ id: "long", re: /worked on [^.]{0,40}(minutes|a long time)/i }, { id: "again", re: /(tried again|didn'?t give up|kept (trying|going|working)|stuck with it)/i }, { id: "persist", re: /persist\w*/i }] },
    "ATL 2a": { cues: [{ id: "shift", re: /(changed (his|her|the|their) plan|tried a different|switched|shifted)/i }, { id: "adapt", re: /(adapted|new idea)/i }] },
    "PD 1": { cues: [{ id: "balance", re: /balanc\w*/i }, { id: "jump", re: /(jump\w*|hopp?\w*|climb\w*|kicked|pedal\w*)/i }] },
    "PD 2": { photo: /(cups|scissors|beads|stacked)/i, cues: [{ id: "scissors", re: /scissors/i }, { id: "cutalong", re: /cut along [^.]{0,25}/i }, { id: "grip", re: /(tripod grip|pincer|pinch\w*|grip)/i }, { id: "stack", re: /(stack(ed|ing)?|threaded|beads?|poured)/i }] },
    "LLD 2a": { cues: [{ id: "told", re: /(told|retold) (a|the|us|me) (\w+ ){0,2}(story|about)/i }, { id: "sent", re: /(\w+ )?sentences?/i }, { id: "described", re: /(described|explained)/i }] },
    "LLD 4": { cues: [{ id: "letter", re: /letters?\b( \w)?/i }] },
    "LLD 5": { cues: [{ id: "page", re: /(turned the pages?|pretend[- ]read|held the book)/i }, { id: "predict", re: /(predicted|guessed what (would|will) happen)/i }] },
    "LLD 7a": { cues: [{ id: "wrote", re: /(wrote|traced|tracing|scribbl\w*)/i }] },
    "M 1a": { photo: /\d+ [a-z ]*(blocks|cups|beads)/i, cues: [{ id: "counted", re: /count(ed|ing|s)?\b/i }, { id: "oneto", re: /(one to \w+|how many|one, two)/i }] },
    "M 1d": { cues: [{ id: "compare", re: /(more than|fewer than|the same number)/i }] },
    "M 2a": { cues: [{ id: "built", re: /built (a |an )?(\w+ )?(tower|structure|wall|bridge)/i }] },
    "M 3": { cues: [{ id: "shape", re: /(circle|square|triangle|rectangle|symmetr\w*)/i }] },
    "M 6": { cues: [{ id: "sorted", re: /(sorted|matched) [^.]{0,25}/i }] },
    "SCI 1a": { cues: [{ id: "asked", re: /asked (what|why|how|if)\b[^.!?]{0,40}/i }, { id: "whatif", re: /what happens if/i }, { id: "predicted", re: /predicted/i }] },
    "SCI 1b": { cues: [{ id: "mixed", re: /mixed [^.]{0,30}/i }, { id: "float", re: /(float\w*|sink\w*|melt\w*|experiment\w*)/i }] }
  };

  const goals = SKILLS.map(([code, skill, sub]) => {
    const prefix = code.split(" ")[0];
    const extra = CUES[code] || { cues: [] };
    return { id: code.replace(" ", ""), code, skill, sub, domain: DOMAINS[prefix], text: sub, cues: extra.cues, photo: extra.photo };
  });

  const FRAMEWORK = {
    name: "Experience Developmental Continuum of Skills (names and codes only, (c) Experience Early Learning Co.)",
    attribution: "Skill names and codes: (c) Experience Early Learning Co. Used for reference. Benchmark descriptors not reproduced.",
    benchmarks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    domains: DOMAINS,
    goals
  };

  if (typeof module !== "undefined" && module.exports) module.exports = FRAMEWORK;
  else root.FRAMEWORK = FRAMEWORK;
})(typeof self !== "undefined" ? self : this);
