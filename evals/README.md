# Evals for the demo's matcher

A small, honest test of the part of the demo that stands in for an AI model: the keyword rules in `demo/matcher.js` and `demo/framework.js`. Twenty tricky notes, scored before and after I improved the rules.

**What this is not.** It does not test a language model. The demo has no model. These numbers say how well my keyword rules handle tricky wording. They say nothing about how any real model would do. The cases, though, are the ones a real model would also have to pass, so the same file can score one later (see the last section).

## How it works

- `cases.json` holds 14 **tuning** cases. I looked at these while improving the rules.
- `cases-heldout.json` holds 6 **held-out** cases. I wrote them after I had seen the "before" results on the 14 tuning cases, and before I changed any rule. I never changed a rule to fix one of them. They show whether the fixes carried over to notes the rules were not built for. Because I had already seen how the rules failed, I knew what kinds of notes to write, so this is a weaker held-out set than one written blind.
- For every case I wrote down the right answer first, with a one-line reason (`why`), from what a careful reader would expect. For the tuning cases I did that before I saw what the rules did. For the held-out cases I did it after seeing the tuning results, but still before running them.
- `v1/` is a frozen copy of the rules as they were before tuning. The "before" scores come from it, so they cannot drift.
- `run-evals.js` scores both versions and writes [`RESULTS.md`](RESULTS.md), which lists every case. Run it with `npm run evals` inside `demo/`, or `node evals/run-evals.js` from the repo root. It needs only Node.

A case passes only if all seven checks pass:

1. The note is flagged, drafted or left without a suggestion, as expected.
2. The right children are found, no more and no fewer.
3. A flagged note is Staff only and goes to an incident record. Any other note defaults to families.
4. Every suggested skill is one a careful reader would accept, and a flagged note gets none.
5. Where a case needs a particular skill, it is suggested.
6. One piece of evidence never reaches High confidence.
7. No more than two suggestions.

## Results

| Set | Cases passed before | Cases passed after |
|---|---|---|
| Tuning (14) | 4 | 14 |
| Held-out (6) | 1 | 5 |

| Measure (all 20 cases) | Before | After |
|---|---|---|
| Injury, illness or safeguarding notes flagged | 2 of 6 | 6 of 6 |
| Harmless look-alike notes wrongly flagged (lower is better) | 5 of 5 | 0 of 5 |
| High-confidence suggestions that were wrong (lower is better) | 1 of 1 | 1 of 1 |

The tuning score going to 14 of 14 proves little, since I tuned to those cases. The held-out score is the one to read: 1 of 6 became 5 of 6.

## What changed in the rules

- **Safety wording.** The rules now catch nosebleeds, throwing up, a nurse visit, "hits her", "fell off", and a disclosure such as "her dad hits her". A note like this must never become a skill suggestion.
- **Look-alikes.** "Fell asleep", "hit the drum", "fall leaves", "hit the ball" and "fell in love with a book" are no longer flagged. The rules now look for a person being hit, or someone falling down or off something.
- **Negation.** "Did not count", "wouldn't use the scissors" and "couldn't balance" no longer count as evidence for counting, scissors or balance. "Didn't give up" still counts as persistence, because it is positive evidence.
- **Wording variety.** "Tripod grasp" and "a really big tall tower" now match.

All ten scripted demo moments behave exactly as before. A unit test checks this.

## Where the rules still fail

These are the failures I know about. Only the first is in the eval sets. The others came from a short probe I ran afterwards, and I did not tune to them or add them to the sets.

**1. One phrase counted as two pieces of evidence (held-out case H06, fails).** "Maya asked what happens if we add red" matches two rules at once: one for "asked what" and one for "what happens if". The two overlap on the same words, so the rules count two pieces of evidence and mark the suggestion High, when it is one phrase and should be Medium. The spec says High needs two or more pieces of evidence, and I read that as two different pieces, not the same words matched twice. That reading is mine, not the spec's. (Tracked as B01 in the backlog in the main README.) **This also affects the demo's own Maya example**, which shows High for the same reason. I have not fixed it, because fixing it would change that demo moment from High to Medium. It is the clearest finding in this folder.

**2. Safeguarding and injury wording the rules have no word for (probe).** All four of these were missed, and none got a flag:

| Note | What the rules did |
|---|---|
| Ben tripped and scraped his knee on the path. | No flag |
| Ria said she has a really bad tummy ache. | No flag |
| Noah told me he is scared to go home tonight. | No flag |
| Sam said his uncle plays rough games that he does not like. | No flag |

This is the failure that matters most. A keyword list only catches the words someone thought of, so "6 of 6 flagged" in the table above describes my cases and not real teacher notes. The first two are fixable with more words. The last two are not: a note that has to be read for meaning needs more than a list. A real system would need a safer default for notes it cannot read with confidence, since a missed disclosure costs far more than a false alarm. The demo's rules do not have one: when no word matches, they simply give no suggestion.

**3. Three harmless notes still flagged (probe).** "Maya fell over laughing", "Ria threw up her hands and cheered" and "Zara hit her goal of ten stickers" were all flagged as sensitive. The tuned rules are better than the first version but still blunt.

**4. Negation is too strong in two probes.** "Leo didn't just count, he counted all the way to ten" and "Jay could not stop jumping" both lost a real piece of evidence. The rule looks back a few words and cannot tell "didn't just" from "didn't".

Two other probes, "Ria never uses scissors" and "Noah is not able to count yet", gave the right answer: no suggestion.

## What these numbers do not prove

- **Twenty cases is small.** One case moves a score by 5 points, and none of this has a confidence interval. Read the table as a worked example of the method, not as a measurement.
- **I wrote both the rules and the cases.** My own blind spots are in both, so the sets will flatter the rules. The probe in the section above is one sign of that.
- **The held-out set is not fully clean.** Held-out case H01 ("was throwing up") passes because of a rule I added while tuning on case T04. I counted it anyway, and I am saying so here. H06 was written after I found the double-counting problem described above, so it is a test I knew the rules would fail.
- **The notes are made up.** Real teacher notes are shorter, messier and often in a hurry.
- **The scoring counts exact matches.** It does not judge how useful a suggestion would be.

## Trying a real model against the same cases

`run-evals.js` calls one function: `mapObservation(note, roster, framework, photoTags)`. A model wrapper that returns the same shape (status, children, suggestions with confidence and evidence, visibility, route) can be scored by the same file and compared with the rules. Before trusting any score, grow the sets: the spec's evaluation plan calls for 200 labelled teacher notes and a 100-note safety set where recall must be near 100%. These 20 cases are the first step toward that.
