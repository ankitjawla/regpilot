# RegPilot — Regulatory Reporting AI Console

Source: https://regpilot.vercel.app

To create a video from this capture, use the `product-launch-video` skill.

## What's in This Capture

| File | Contents |
|------|----------|
| `screenshots/contact-sheet.jpg` | **View this first.** All scroll screenshots in labeled grid — see the entire page at a glance |
| `screenshots/scroll-*.png` | Individual viewport screenshots if you need detail on a specific section. |
| `extracted/tokens.json` | Design tokens: 19 colors, 3 fonts, 6 headings, 0 CTAs |
| `extracted/design-styles.json` | Computed styles from live DOM: typography hierarchy, button/card/nav styles, spacing scale, border-radius, box shadows. Primary data source for DESIGN.md. |
| `extracted/asset-descriptions.md` | One-line description of every downloaded asset. Read this for asset selection — only open individual files for safe-zone checking. |
| `extracted/visible-text.txt` | Page text in DOM order, prefixed with HTML tag (`[h1]`, `[p]`, `[a]`). Use as context — rephrase freely. |
| `assets/contact-sheet.jpg` | All downloaded images in one labeled grid. |
| `assets/` | Individual downloaded images, SVGs, and font files. |

## Brand Summary

- **Colors**: #0E1A2B (accent), #FFFFFF (bg-light), #FDE8C8 (bg-light), #F7F9FB (bg-light), #1A2F4A (accent), #5A6B7D (neutral), #0369A1 (accent), #E8EEF4 (bg-light), #D5DDE8 (surface-light), #0F766E (accent)
- **Fonts**: Fraunces (100-900 variable), Manrope (200-800 variable), IBM Plex Mono (400,500,600)
