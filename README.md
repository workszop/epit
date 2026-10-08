# epit
1 day prototype

## 🫀 Triglyceride Defense

A sarcastic browser game: rogue triglycerides are swimming toward your heart to blow it up, and your only weapon is clicking.

**Play:** https://workszop.github.io/epit/heart-defense/

- Click / tap the fat molecules before they reach the heart.
- Chain hits for combo multipliers; misses reset them.
- Power-ups: 🐟 Omega-3 (screen nuke), 💊 Statin (slow-mo), 🥗 Salad (heal), 🏃 Cardio (splash clicks).
- Every 5th wave: **The Deep Fryer** boss.
- Keys: `P` / `Esc` pause, `M` mute.

Plain HTML/CSS/JS with no build step or dependencies. Source is in [`heart-defense/`](heart-defense/).
To run locally, open `heart-defense/index.html` in a browser.

### GitHub Pages

The repo is served as-is (`.nojekyll` disables Jekyll processing). To enable it:
**Settings → Pages → Build and deployment → Source: "Deploy from a branch" → `main` / `(root)` → Save.**
The game will then be at `/epit/heart-defense/`, and the existing e-PIT viewer stays at `/epit/`.
