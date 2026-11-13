# Current-state findings and gaps

How the existing teacher-side observation flow works today, what is confirmed, and which gaps this concept addresses, each mapped to the demo's tour stop. Built from brightwheel's public pages (help center, October 2026 "What's new" PDF, product and multisite pages) and answers from brightwheel's own support chatbot. The chatbot is a secondary source and can be wrong; items resting only on it are marked.

Evidence labels: **Doc** = brightwheel's published page. **Bot** = support chatbot answer only. **Screen** = a screenshot brightwheel published or the support chatbot returned.

## What exists today

| Area | What it does | Source |
|---|---|---|
| Framework | Experience Developmental Continuum: 8 domains, 36 core skills, 73 sub-skills, benchmarks 1 (infant) to 8 (primary grades), 0 = not observed. Three-month assessment windows. Can switch to State Standards, Montessori or DRDP. | Doc, Bot |
| What counts as an assessment | An observation plus a benchmark. A benchmark is what makes it an assessment. | Doc (state checklist) |
| Capture path | Learning > activity > Log Activity > select children > Confirm and observe > + Milestones > Add observation, or Add Activity > Observation. | Doc |
| Smart observations | Type or dictate a note. It drafts the observation: the children (from names), milestones, a cleaned-up note, and benchmarks if the program has Experience Assessments. Mobile only. Nothing posts on its own. Teacher adds photos or video after. | Doc, Screen |
| Photo | Not used by the AI. Added after drafting. | Bot |
| Explanation | None. No "why this milestone", no confidence. | Bot |
| Prior ratings | Not used when suggesting a benchmark. | Bot |
| Sensitive notes | Handled like any other observation. May get milestone suggestions. | Bot |
| Visibility | Family-visible by default. Teacher can mark Staff-only per observation. No program-level default. | Bot |
| Coverage | Assessment Status Overview report on the web: students by skill, "+" where nothing is logged, last observation and total on hover. Also "No recent observation" under a child's name on the milestone screen. Pull-based. | Doc, Screen |
| Reminders and targets | None. No weekly target. | Bot |
| Director review | None. Two teachers' ratings of the same skill both stay in the record. | Bot |
| Edit or audit trail | Not described in documentation. | Bot (absence) |
| Offline | Cannot log offline. | Bot |
| Family report | Created per child by staff: Learning > Assessments > Select an action > Create family report. PDF. Explains progress and next milestones. Does not suggest home activities. | Doc, Bot |
| Multi-site | Assessment reports are per site only, PDF only, not in the multi-site dashboard. Marketing pages claim organization-wide visibility of observation activity. | Bot (contradicted in part by marketing) |
| Export | PDF only for assessment reports. Other reports can export CSV. | Bot, Doc |
| Price | "Starting at $10/mo", based on total enrollment, requires Premium. No district-level purchasing model. | Screen, Bot |

## The gaps, one by one

This document lists 15 gaps. The demo's guided tour has six stops, and a stop can cover several gaps. Each gap is written as its own row and mapped to the tour stop where you can see it. Two gaps, G12 and G15, are not in the demo, so they have no tour stop. Open the live demo, take the tour, and the stop number in the last column tells you which screen to look at. The tour stops are also numbered 1 to 6 in Builder mode.

Of the 15 gaps, 11 are addressed in the demo, 2 partly, and 2 are not built. Almost every row rests on a support-chatbot answer alone, so treat each as a claim to verify and not as established fact.

| ID | Gap | Source | What the concept does | Status | Tour stop |
|---|---|---|---|---|---|
| | **Trust in each suggestion** | | | | |
| G01 | Suggestions come with no reason | Bot | Every suggestion shows why: the words said and, where relevant, what the photo shows | Addressed in the demo | Stop 1 |
| G02 | Suggestions come with no confidence | Bot | Each suggestion shows High or Medium confidence. High is pre-selected. Medium needs the teacher's choice | Addressed in the demo | Stop 1 |
| G03 | The photo is added after drafting and plays no part in the suggestion | Bot | The photo can be the second piece of evidence. It can never create a suggestion alone | Addressed in the demo | Stop 1 |
| G04 | Suggestions ignore the child's earlier benchmark | Bot | Shows the last benchmark, who gave it and when, beside the new one | Addressed in the demo | Stop 2 |
| G05 | Nothing flags a large jump in a child's level | Bot | A jump or a drop of 2 or more levels asks for a check before logging and is never bulk-approved. The threshold of 2 is an assumption | Addressed in the demo | Stop 2 |
| G06 | Two teachers can rate the same skill differently and both ratings stay, with nothing to flag it | Bot | Shows who gave the last rating and flags a jump or a drop of 2 or more levels. A one-level difference between two teachers is not flagged | Partly addressed | Stop 2 |
| G07 | One note about several children | Bot (the answer says per-child benchmarks can already differ) | A separate benchmark for each child, each with its own history and flag | Addressed in the demo | Stop 2 |
| | **Capturing and covering every child** | | | | |
| G08 | Coverage is a web report the teacher has to go and open | Doc, Bot | A nudge at capture: how many children have an observation in this learning area in the last three months, and who has none | Addressed in the demo | Stop 3 |
| G09 | No reminders or weekly targets | Bot | A teacher-chosen review reminder. The demo only previews it, and no reminder is sent. No weekly targets | Partly addressed | Stop 3 |
| | **Safety and privacy** | | | | |
| G10 | Notes about an injury or illness are treated like any other and may get skill suggestions | Bot | Never mapped to skills, locked to Staff only, and sent to an incident record | Addressed in the demo | Stop 4 |
| G11 | Observations are family-visible by default, and the teacher must switch each one | Bot | An explicit choice at capture and again in review: Families and staff, or Staff only | Addressed in the demo | Stop 4 |
| | **Directors and sponsors** | | | | |
| G12 | No director approval or reconciliation step before an observation shows in reports | Bot | Not built. The demo has the teacher's own review only | Not built | Not in the demo |
| G13 | Assessment reports are per site and not in the multi-site dashboard | Bot (marketing pages partly disagree) | A district view of evidence quality across sites | Addressed in the demo | Stop 6 |
| G14 | Assessment reports export as PDF only | Bot, Doc | A CSV export of the district view | Addressed in the demo | Stop 6 |
| G15 | No purchasing model built for a state or district sponsor | Screen, Bot | Concept only: sponsor-paid assessments on multi-year terms. See the business case in the spec | Not built | Not in the demo |

## Which tour stop shows which gaps

| Tour stop | What it shows | Gaps it covers | What to look at |
|---|---|---|---|
| 1 | Every suggestion says why, and the photo counts | G01, G02, G03 | The "Why" line under each suggested skill, and its High or Medium label |
| 2 | A benchmark for each child, with their history | G04, G05, G06, G07 | The benchmark rows for each child, with the last rating beside them |
| 3 | Who is still missing, shown while capturing | G08, G09 | The nudge that names who has no observation yet, and the reminder setting below the capture panel |
| 4 | Who sees it is a choice, and injuries are never mapped | G10, G11 | The "Who can see this once logged?" choice, and the incident route |
| 5 | A review teachers will actually finish | None. See the note below | The review groups bar on the Review tab |
| 6 | Something a district or state can see and export | G13, G14 | The District tab: the table and the export |

Stop 5 fixes none of the gaps in this table. It shows a design idea of mine: a review grouped into four sets (needs attention, check the level, clear matches, needs your choice) so that a teacher finishes it. No source says brightwheel's review is ungrouped. The measure that tests it is minutes spent in review per day, in the spec. G12 (a director approval step) and G15 (a purchasing model for sponsors) are not in the demo.

## What is not claimed

- Brightwheel has the voice-to-draft feature. This concept does not claim to invent it. It addresses what happens after drafting.
- Absence of documentation is not proof of absence of a feature (edit history, offline behaviour).
- No measure of rater agreement is claimed to be missing from brightwheel's published research. Only internal-consistency evidence was read; the full report was not.
- All school, child and result numbers in the demo are synthetic. Skill names and codes come from the published continuum (names only). An earlier draft of this project used invented skill codes; they were replaced with the published ones.
