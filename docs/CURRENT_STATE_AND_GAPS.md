# Current-state findings and gaps

How the existing teacher-side observation flow works today, what is confirmed, and which gaps this concept addresses. Built from brightwheel's public pages (help center, October 2026 "What's new" PDF, product and multisite pages) and answers from brightwheel's own support chatbot. The chatbot is a secondary source and can be wrong; items resting only on it are marked.

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

## The gaps, in order of strength

| # | Gap | Evidence | What the concept does |
|---|---|---|---|
| 1 | **No combined view or spreadsheet export of assessment evidence across sites** | Bot (two answers agree), marketing partly disagrees | District view with site-level evidence-quality rows and a CSV export |
| 2 | **Suggestions are unexplained** | Bot | Every suggestion says why: the words said and, where relevant, what the photo shows |
| 3 | **Suggestions ignore the photo** | Bot | The photo can be the second piece of evidence. It can never create a suggestion alone. |
| 4 | **Suggestions ignore prior ratings, and nothing flags a disagreement** | Bot | Shows the last benchmark, who gave it and when. Flags a jump of 2 or more levels. Never bulk-approves a flagged draft. |
| 5 | **Coverage is a report the teacher must go and run** | Doc, Bot | A nudge at capture: how many children have an observation for this skill in the window, and who has none |
| 6 | **Sensitive notes get the family-visible default and may get milestones** | Bot | Sensitive notes are never mapped, stay Staff-only, and are routed to an incident record |
| 7 | **One note about several children** | Bot (answer says benchmarks can differ per child) | A separate benchmark per child, each with its own history and flag |
| 8 | **No reminders or targets** | Bot | A teacher-chosen review reminder with a time estimate |
| 9 | **No contract shape for a sponsor** | Bot | Concept only; see the business case in the spec |

## What is not claimed

- Brightwheel has the voice-to-draft feature. This concept does not claim to invent it. It addresses what happens after drafting.
- Absence of documentation is not proof of absence of a feature (edit history, offline behaviour).
- No measure of rater agreement is claimed to be missing from brightwheel's published research. Only internal-consistency evidence was read; the full report was not.
- All school, child and result numbers in the demo are synthetic. Skill names and codes come from the published continuum (names only). An earlier draft of this project used invented skill codes; they were replaced with the published ones.
