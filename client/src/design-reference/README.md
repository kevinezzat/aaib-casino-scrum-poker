# Design Reference

This directory contains the **static HTML prototype** for the AAIB Casino Scrum Poker app.
It is **not** part of the Vite/React build — it exists solely as a visual reference.

## Files

| File | Description |
|---|---|
| `index.html` | Full casino table UI — desktop + mobile views, all Tailwind tokens, animations |
| `stitch-assets/desktop-table-refined-light.html` | Stitch desktop screen export |
| `stitch-assets/desktop-table-refined-light.png` | Desktop screenshot |
| `stitch-assets/mobile-voter-light.html` | Stitch mobile screen export |
| `stitch-assets/mobile-voter-light.png` | Mobile screenshot |

## How to view

Open `index.html` directly in any browser — it loads Tailwind via CDN and needs no build step.

> **Do not delete these files.** They are the source of truth for the design system tokens
> (colours, spacing, typography) that have been ported into `tailwind.config.js`.
