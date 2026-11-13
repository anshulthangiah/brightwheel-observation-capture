# Changelog

All notable changes to this project, newest first. Each version links to the problems fixed and still open in the README's [Known issues and backlog](README.md#known-issues-and-backlog). The GitHub Release for each version uses the same text.

## v1.2.0

Fixes from testing the live demo on a real phone, and a fix to the keyword rules that the evals had found.

### Fixed
- Tapping a moment on a phone now scrolls to the Capture panel, so the teacher can see that something happened. Wide screens do not move (B23).
- The coverage nudge now names a learning area, for example "Mathematics: 6 of 10 children have an observation in this learning area in the last three months." It no longer reads as if it counted one exact skill (B24).
- "Benchmark not set yet" no longer looks like it contradicts the earlier rating. The earlier rating reads "Last rating: 4 (Oct 12, Ms. Rivera)" or "No earlier rating" (B25).
- A fall in level is now called a drop. Moving Maya from 4 to 1 shows "Drop of 3 levels", not "Jump of 3 levels" or "a jump of -3". The two metrics are renamed "Level changes caught" and "Level changes confirmed" (B26).
- The Check before logging box is a list with one item for each child and skill, and each item has the last rating, the new benchmark and the change on its own line (B27).
- Export CSV no longer opens a box of raw data. It sends the file and says so in one line. A separate Show the data button opens the data (B28).
- The keyword rules count one phrase as one piece of evidence, so Maya's paint note shows Medium, not High, for "Asks questions and makes predictions". Held-out cases passed: 6 of 6 (was 5 of 6). One of the 10 scripted demo moments changed and the other nine did not (B01).

### Changed
- The Stop 2 and Stop 3 cards, the spec and the gaps document use the new wording for jumps, drops and the nudge.
- The animation at the top of the README is remade from the live demo, so Stops 2 and 3 show the new wording.
- The evals README says that H06 was used to drive a change in v1.2.0, so it is no longer a held-out case in the strict sense. The v1.1.0 rules scored 5 of 5 on the other five held-out cases.

### Still open
- Some injury and safeguarding wording is still missed, such as "scraped his knee" and "scared to go home tonight" (B02).
- Six more items are listed in the README (B03 to B08).

### Tests
79 unit tests (was 69). A new browser suite of 25 checks covers the phone, nudge, drop, list and export fixes, and fails on the v1.1.0 code. The other three browser suites still have 76, 131 and 120 checks.

## v1.1.0

Phone fixes, clearer labels, a rebuilt gaps document, tested keyword rules and a rewritten README.

### Fixed
- Tour on phones: the spotlight was in the wrong place because a rule meant for wide screens also applied on phones. It now applies to wide screens only, and a new test checks every tour stop on three phone sizes (B09).
- The review controls no longer run off the edge of a phone screen (B10).
- The district table scrolls sideways inside its own box instead of making the page wider than the screen, and the tour highlights that box (B11).
- Notes about injury, illness or safeguarding are caught more reliably. "Threw up", "nosebleed", "her dad hits her" and "fell off" now flag. On the 6 eval notes of this kind, 6 are flagged (was 2) (B17).
- Harmless notes such as "fell asleep", "hit the drum" and "fall leaves" are no longer flagged. Of 5 such eval notes, 0 are wrongly flagged (was 5) (B18).
- Things the child did not do no longer count as evidence. "Did not count" no longer suggests counting, and "didn't give up" still counts as persistence (B19).
- Unusual wording such as "tripod grasp" and "a really big tall tower" now matches (B20).
- The spec's success measures now say "%" and "learning area" (B22).

### Changed
- The "Today" row on each tour card is now "Current scenario" (B12).
- Builder mode calls the tour's steps "Stop 1 to 6" instead of "Gap 1 to 6", so they no longer clash with the gap numbers in the gaps document (B13).
- The gaps document lists 15 gaps one by one, each with its source, a status (11 addressed, 2 partly, 2 not built) and the tour stop that shows it. Two gaps are marked "Not in the demo" (B14).
- The README is rewritten as a short product brief: the problem, who it is for, why a model helps and where it must stop, what is in scope and left out, how to measure it, and honest limits (B15).

### Added
- A 35-second animation of the tour in the README, made from the live demo by `demo/make-gif.js` (B16).
- An evals folder: 20 tricky notes (14 for tuning, 6 held out), a frozen copy of the original rules, a scoring script, results, and a README that says what the numbers do not prove. Held-out cases passed: 5 of 6 (was 1 of 6) (B21).
- A Known issues and backlog section in the README, and this changelog.

### Still open
- One phrase can count as two pieces of evidence, so the demo's own Maya example shows High confidence when it should be Medium (B01).
- Some injury and safeguarding wording is still missed, such as "scraped his knee" and "scared to go home tonight" (B02).
- Six more items are listed in the README (B03 to B08).

### Tests
69 unit tests (was 63). The generic browser test has 120 checks (was 98) and now covers three phone sizes. The other two browser suites still have 76 and 131 checks.

## v1.0.0

First public release.

### Added
- A product spec with the rules, scope, success measures, an evaluation plan, a business case, a 90-day plan and five sequence diagrams of the key user journeys.
- A gaps document that labels the source of every claim about the existing product.
- A working demo: a scripted simulation with synthetic data and no AI model. It covers capture, review, edit and delete before logging, and a district view with a CSV export.
- A first-run tour of six stops and Builder mode, with the guide character Product Builder Anshul.
- A link to a live demo on GitHub Pages in the README.

### Tests
63 unit tests, and browser checks of 76 (the prototype), 131 (the tour and Builder mode) and 98 (the generic guide-kit test).
