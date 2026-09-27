---
format: 1920x1080
duration: 30s
message: "See why the gate stopped the letter."
arc: "Hook → Pain → Product → Gate → Desk → CTA"
audience: "Bank exam and compliance operators"
mode: autonomous
music: none
captions: skipped (silent typographic cut — Kokoro deps missing)
---

## Video direction

- palette: ink ground `{colors.green}` `#0E1A2B`; paper `{colors.cream}` `#EEF2F6`; sage accent `{colors.pink}` `#0F766E`; sage wash `{colors.cream-2}` `#D7F0EC`. No amber, no coral, no gradients, no shadows.
- type: display Fraunces 500; body Manrope 400; chrome IBM Plex Mono 500 uppercase. Every frame has a mono topbar (label left, counter right).
- motion: long-tail `power3`. Reveals land on the beat named in each Scene. No front-load. Holds are still. Signature moves stay recognizable.
- rhythm: Frames 1, 2, 4 are kinetic relays. Frame 3 is the name bloom. Frame 5 is the held read (the breather before the ask). Frame 6 is the only frame with a settle, not an exit tween on the others.
- negative: no purple AI glow, no browser chrome, no invented bank, no invented KPI, no narration sentence on screen. Visible copy is the short words named in each Scene. The favicon is a 28px chrome mark, never the hero.
- keep-out: content stays above y=900.

## Frame 1 — The letter

- status: animated
- src: compositions/frames/01-letter.html
- duration: 5s
- poster: 3.6s
- transition_in: cut
- scene: Three center words on paper — LETTER, then STOPPED, then WHY.
- voiceover: "The letter stopped. See why."
- type: hook
- persuasion: Tension
- beat: open
- blueprint: kinetic-type-beats (Adapt)
- focal: favicon.ico
- roles: favicon.ico = supporting
- asset_candidates: favicon.ico

Adapt: keep the centered-beat triptych (each word alone, then it clears). Drop the logo snap. Paper ground, not a gradient.

Scene 1 (0.0–1.6s): paper field `{colors.cream}`. Topbar `EXAMINATION` / `01`. The word LETTER (Fraunces display, ink) hard-cuts in dead center. Favicon sits in the topbar at 28px. Nothing else.
Scene 2 (1.6–3.2s): LETTER clears by a quick scale-down. STOPPED lands alone in the same center, ink, with a 2px sage underline drawing left to right.
Scene 3 (3.2–5.0s): STOPPED clears. WHY lands in sage and holds still. No exit.

## Frame 2 — What the memo hides

- status: animated
- src: compositions/frames/02-exceptions.html
- duration: 6s
- poster: 4.2s
- transition_in: cut
- scene: Three pain words, one at a time, on ink — CITATION, GAP, HAZARD.
- voiceover: "A citation. A playbook gap. A hazard."
- type: pain_point
- persuasion: Pain
- beat: buried
- blueprint: kinetic-type-beats (Adapt)
- focal: favicon.ico
- roles: favicon.ico = supporting
- asset_candidates: favicon.ico

Adapt: problem relay — each pain word alone on ink, then it clears. No product name yet.

Scene 1 (0.0–2.0s): ink field `{colors.green}`. Topbar `THE MEMO` / `02` in cream. CITATION (Fraunces, cream) pops to center. Favicon 28px in the topbar.
Scene 2 (2.0–4.0s): CITATION clears by a quick scale-down. GAP lands alone, cream, with a sage 2px rule under it.
Scene 3 (4.0–6.0s): GAP clears. HAZARD lands in sage and holds. No exit.

## Frame 3 — The name

- status: animated
- src: compositions/frames/03-regpilot.html
- duration: 5s
- poster: 3.4s
- transition_in: cut
- scene: DECIDES clears. REGPILOT blooms with the favicon. SYSTEM ONE sits under it.
- voiceover: "RegPilot. System One decides. Azure only drafts."
- type: product_intro
- persuasion: Name the instrument
- beat: lockup
- blueprint: logo-assemble-lockup (Adapt)
- focal: favicon.ico
- roles: favicon.ico = cutout
- asset_candidates: favicon.ico

Adapt: text-clears-then-mark-blooms. Skip 3D and camera push. Flat paper. Favicon is the mark beside the wordmark, not a drawn logo.

Scene 1 (0.0–1.4s): paper field. Topbar `CONSOLE` / `03`. The word DECIDES (Fraunces, ink) is already readable at center by 0.4s and holds.
Scene 2 (1.4–3.0s): DECIDES fades and shrinks to zero. Favicon blooms from zero at center, then slides left. REGPILOT (Fraunces display, ink) reveals to its right. A sage 2px rule draws under the lockup.
Scene 3 (3.0–5.0s): mono line SYSTEM ONE fades in under the lockup and holds still. No exit.

## Frame 4 — The gate

- status: animated
- src: compositions/frames/04-gate.html
- duration: 5s
- poster: 3.8s
- transition_in: cut
- scene: Three step tiles assemble — JEV, AZURE, GATE — then GATE is the one in sage.
- voiceover: "Jev calls it. Azure drafts it. The gate holds it."
- type: feature_showcase
- persuasion: Mechanism
- beat: three calls
- blueprint: grid-card-assemble (Adapt)
- focal: favicon.ico
- roles: favicon.ico = supporting
- asset_candidates: favicon.ico

Adapt: three step tiles in a row, staggered cascade, then the third tile fills sage. No camera zoom. No extra tiles.

Scene 1 (0.0–1.6s): paper field. Topbar `PIPELINE` / `04`. Headline CALLS (Fraunces, ink) sits upper third. First tile JEV slides up into the left slot — mono ordinal 01, serif title, 2px ink border, 8px radius.
Scene 2 (1.6–3.2s): tile AZURE arrives in the center slot the same way. Favicon stays 28px in the topbar.
Scene 3 (3.2–5.0s): tile GATE arrives on the right and its fill becomes sage, title cream. The row holds. No exit.

## Frame 5 — The line

- status: animated
- src: compositions/frames/05-the-line.html
- duration: 5s
- poster: 2.4s
- transition_in: cut
- scene: One held statement. THE LINE, then a mono caption DESK.
- voiceover: "The desk shows the line."
- type: benefit_highlight
- persuasion: Payoff
- beat: held read
- blueprint: titlecard-reveal (Adapt)
- focal: favicon.ico
- roles: favicon.ico = supporting
- asset_candidates: favicon.ico

Adapt: one restrained slide-up. This is the held breather. After the title lands, nothing else moves.

Scene 1 (0.0–1.2s): ink field. Topbar `EXCEPTION DESK` / `05` in cream. Empty center.
Scene 2 (1.2–2.4s): THE LINE (Fraunces display-hero, cream) slides up into center. A 2px sage rule draws under it.
Scene 3 (2.4–5.0s): mono caption DESK (sage) fades in beneath the rule. Hold still through 5.0s. No exit.

## Frame 6 — See why

- status: animated
- src: compositions/frames/06-see-why.html
- duration: 4s
- poster: 2.6s
- transition_in: cut
- scene: SEE WHY, then the domain, with the favicon lockup. End card.
- voiceover: "See why the gate stopped the letter."
- type: cta
- persuasion: Ask
- beat: close
- blueprint: kinetic-type-beats (Adapt)
- focal: favicon.ico
- roles: favicon.ico = cutout
- asset_candidates: favicon.ico

Adapt: two beats then a held URL. Last beat is the longest hold. This is the final frame, so a quiet settle is allowed. No exit fade to black.

Scene 1 (0.0–1.2s): paper field. Topbar `REGPILOT` / `06`. SEE WHY (Fraunces, ink) slams to center.
Scene 2 (1.2–2.2s): SEE WHY lifts slightly and shrinks. Favicon (48px) and the domain `regpilot.vercel.app` (IBM Plex Mono, sage) land under it.
Scene 3 (2.2–4.0s): the lockup holds still. No fade-out.
