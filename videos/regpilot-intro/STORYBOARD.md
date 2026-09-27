---
format: 1920x1080
duration: 30s
message: "See why the gate stopped the letter."
arc: "Name → Letter → Exceptions → Decides → Line → Ask"
audience: "Bank exam and compliance operators"
mode: autonomous
music: none
captions: skipped (silent — HeyGen signed out, Kokoro not installed)
---

## Video direction

- palette: black `#000000` field, type `#f5f5f7`, secondary `#86868b`. No sage, no paper, no ink-blue panels.
- type: Manrope only. Headlines weight 500, tracking `-0.045em`. The URL is weight 400 in the secondary gray. No serif, no mono topbar, no counters, no favicon.
- motion: one slow camera push per shot (`scale` 1.03 → 1 across the whole frame) and one fade-up (`y` 18 → 0, `power3.out`). Holds are still. Dissolves between frames. No slams, underlines, tiles, or word-scale pops.
- rhythm: the name holds longest. The three exception words are the only in-frame replacements. Every other shot is one line.
- negative: no gradients, vignettes, shadows, browser chrome, or invented figures.
- keep-out: the line sits on the optical center, above y=900.

## Frame 1 — The name

- status: animated
- src: compositions/frames/01-letter.html
- duration: 6s
- poster: 2.2s
- transition_in: cut
- scene: RegPilot, alone, centered on black.
- voiceover: "RegPilot."
- type: product_intro
- blueprint: titlecard-reveal (Adapt)
- focal: none
- asset_candidates: favicon.ico

Scene 1 (0.0–1.1s): black field. The word RegPilot fades up to center.
Scene 2 (1.1–6.0s): the word holds. The stage eases in from a slight scale. No exit.

## Frame 2 — The letter

- status: animated
- src: compositions/frames/02-exceptions.html
- duration: 5s
- poster: 2s
- transition_in: crossfade 0.7s
- scene: One line. The letter stopped.
- voiceover: "The letter stopped."
- type: hook
- blueprint: titlecard-reveal (Adapt)
- focal: none
- asset_candidates: favicon.ico

Scene 1 (0.0–1.0s): The letter stopped. fades up, centered.
Scene 2 (1.0–5.0s): hold, with the same slow push. No exit.

## Frame 3 — The exceptions

- status: animated
- src: compositions/frames/03-regpilot.html
- duration: 7s
- poster: 5.4s
- transition_in: crossfade 0.7s
- scene: Three words, one at a time. Citation, then Gap, then Hazard.
- voiceover: "A citation. A gap. A hazard."
- type: pain_point
- blueprint: kinetic-type-beats (Adapt)
- focal: none
- asset_candidates: favicon.ico

Adapt: the swap stays, the slam goes. Each word fades up and the previous fades away. No scale punch.

Scene 1 (0.0–2.2s): Citation fades up and holds.
Scene 2 (2.2–4.5s): Citation fades. Gap fades up and holds.
Scene 3 (4.5–7.0s): Gap fades. Hazard fades up and holds. No exit.

## Frame 4 — Decides

- status: animated
- src: compositions/frames/04-gate.html
- duration: 4s
- poster: 1.8s
- transition_in: crossfade 0.7s
- scene: One line. System One decides.
- voiceover: "System One decides."
- type: feature_showcase
- blueprint: titlecard-reveal (Adapt)
- focal: none
- asset_candidates: favicon.ico

Scene 1 (0.0–1.0s): System One decides. fades up.
Scene 2 (1.0–4.0s): hold. No exit.

## Frame 5 — The line

- status: animated
- src: compositions/frames/05-the-line.html
- duration: 4s
- poster: 1.8s
- transition_in: crossfade 0.7s
- scene: One line. The line.
- voiceover: "The desk shows the line."
- type: benefit_highlight
- blueprint: titlecard-reveal (Adapt)
- focal: none
- asset_candidates: favicon.ico

Scene 1 (0.0–1.0s): The line. fades up.
Scene 2 (1.0–4.0s): hold. No exit.

## Frame 6 — See why

- status: animated
- src: compositions/frames/06-see-why.html
- duration: 4s
- poster: 2.4s
- transition_in: crossfade 0.7s
- scene: See why. Then the domain, smaller and gray.
- voiceover: "See why."
- type: cta
- blueprint: titlecard-reveal (Adapt)
- focal: none
- asset_candidates: favicon.ico

Scene 1 (0.0–1.0s): See why. fades up.
Scene 2 (1.0–1.8s): regpilot.vercel.app fades in beneath it.
Scene 3 (1.8–4.0s): both hold. No fade to black.
