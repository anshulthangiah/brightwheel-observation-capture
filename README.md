# Observation Capture

**Observations a teacher can trust and a state can see.**

Voice drafting already makes early-learning observations quick to write. This concept covers what comes next: each suggestion is explained and checkable at the moment of capture, teachers are steered to the children and skills still missing, and the evidence rolls up into something a district or state sponsor can see and export.

**[Try the live demo](https://anshulthangiah.github.io/brightwheel-observation-capture/)** (opens a short guided tour)

This is an independent portfolio project (product spec plus a working demo). It is not affiliated with brightwheel and was built without access to any brightwheel system. Product facts come from public pages and brightwheel's own support chatbot.

## What is in here

| Path | What it is |
|---|---|
| [`spec/SPEC.md`](spec/SPEC.md) | Product spec: starting point, rules, scope, metrics, evaluation plan, business case, 90-day validation plan, and sequence diagrams of the key user journeys |
| [`docs/CURRENT_STATE_AND_GAPS.md`](docs/CURRENT_STATE_AND_GAPS.md) | How the current flow works, with a source and confidence label for every claim, and the gaps this concept addresses |
| `demo/` | Working browser demo with synthetic children, photos, voices and school figures |
| `demo/tests/` | 63 automated tests of the rules, the framework structure, the trust logic, the review logic and the tour and Builder mode content |
| `demo/guide-content.js` | All the words for the tour and Builder mode: six gap cards, one source of content |
| `demo/guide-common.js`, `demo/tour.js`, `demo/builder.js` and their `.css` files | The reusable guide kit: Take a Tour and Builder mode. The same code runs in my other projects |
| `demo/tests-ui/` | Real-Chromium tests: the prototype flow (76 checks), the tour and Builder mode on this product (131 checks), and a generic test of the guide kit (98 checks) |

## Run the demo

**Easiest way:** open the live demo link at the top of this page. Nothing to install.

**To run it on your own computer**, you need Node 18 or newer and Python 3. There is no install step, no API key and no internet needed. Developed and tested with Node 25.

The demo is a few plain web files (HTML, CSS, JavaScript). Double-clicking `demo/index.html` usually works too (checked in Chromium). The local web server below is the safer route, because it behaves like a real website, which is how the live demo runs.

```bash
cd demo                           # go into the demo folder
python3 -m http.server 8765       # start a local web server on port 8765 (Python is used only for this)
# then open http://localhost:8765 in your browser. Stop the server with Ctrl+C.
```

To run the tests:

```bash
cd demo
node --test                       # fast checks of the matching rules, review logic and tour text. Needs nothing installed
```

The next set is optional. It opens a real (hidden) Chromium browser and clicks through the demo like a person would, which catches screen bugs the fast tests cannot:

```bash
npm install                       # downloads the Playwright test tool
npx playwright install chromium   # downloads the browser it controls
npm run test:browser              # the prototype flow: capture, review, edit, district
npm run test:tour                 # the first-run tour and Builder mode on this product
npm run test:guide                # the generic guide-kit test (the same file tests any project that uses the kit)
```

The demo uses pre-made synthetic photos and voice notes that are already in `demo/media/`. If you want to regenerate them (macOS only, since it uses the built-in `say` voice and `ffmpeg`): `cd demo && node make-media.js`

## What the demo shows

A scripted simulation. Nothing is typed and no AI model runs. The speech, photo-reading and suggestions are staged to show how the product would feel.

0. **Tour and Builder mode.** A cartoon guide, Product Builder Anshul, walks you through. He appears only in the tour, its welcome and wrap-up cards, and the Builder mode legend, never inside the product screens. First visit opens a six-stop tour (Today, What I built, Why it should work, How I would measure it). "Take the tour" replays it. The **Builder mode** switch pins numbered markers on the live screens; tap one for its gap card. Add `?notour` to the URL to skip the tour.
1. **Edit and delete.** Before a draft is logged you can edit what was heard, change who it is about, start over, or discard it, at capture and again in review. Saving an edit asks "Save these changes?" first, shows before and after, and warns if the note names different children from the ones selected. Editing re-runs the same keyword rules on the new words (not an AI model, and the screen says so). Undo works.
1. **Two views.** The page has two top-level tabs: **Teacher** (open by default, on the Capture page, with Capture, Review and Your numbers beneath it) and **District** (a separate sponsor-facing view).
2. **Capture.** Pick a moment, tap the shutter, tap to record. The transcript appears, the photo is "read", and the children are picked from the names spoken. Select a child the note does not mention and it asks whether to keep or remove them.
3. **Choose who sees it.** An explicit "Who can see this once logged?" choice (Families and staff, or Staff only) at capture and again in review. Brightwheel's default is family-visible unless the teacher remembers to switch.
4. **Explain.** Each suggested skill says why: the words said, and what the photo shows.
5. **Check.** Each child gets their own benchmark, shown beside the last one, who gave it and when. A jump of two or more levels needs a confirmation and can never be bulk-approved.
6. **Nudge.** The matched skill shows how many children have an observation in this window and who has none.
7. **Route.** Notes about injury or illness are never mapped, are locked to Staff only and go to an incident record.
8. **Review.** An end-of-day queue with undo and a completion screen that lists who has no observation yet.
9. **District.** Made-up site figures for evidence quality, with a CSV export.

## Honest limits

- The AI is simulated. Transcripts, photo tags and benchmarks are scripted per moment, and the matcher is keyword rules. The demo shows the workflow, the guardrails and the feel, not production accuracy.
- Skill names and codes come from the published Experience Developmental Continuum of Skills (© Experience Early Learning Co.), names only, with attribution. Benchmark descriptors are not reproduced. The keyword rules that stand in for the AI are mine, and only some skills have them.
- The demo rates at skill level with benchmarks 0 to 8 and does not use age bands, because the published age bands overlap the benchmark columns.
- All children, photos, voices, schools and numbers are synthetic. Every target in the spec is an assumption to validate.
- The district view shows evidence quality, not child outcomes, on purpose.
- Several gaps rest on support-chatbot answers, which can be wrong. The gaps document labels each one.

License: MIT for the code and documents. The mascot images in `demo/assets/` are a personal avatar of the author, are not covered by the MIT licence, and may not be reused.
