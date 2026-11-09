# Slides

[PowerMD](https://powermd.atom-forge.eu/) presentations ([syntax](https://powermd.atom-forge.eu/syntax.md)). Every deck has its own folder with the deck in `POWER.md` and its assets next to it.

```
courses/
  web-programming-1/
    07-allapot-identitas-hozzaferes/POWER.md   7. fejezet: Állapot, identitás és hozzáférés
    08-webbiztonsagi-alapok/POWER.md           8. fejezet: Webbiztonsági alapok
    08-webbiztonsagi-alapok-en/POWER.md        Chapter 8: Web Security Basics
    frontend-frameworks/POWER.md               Frontend keretrendszerek és renderelési stratégiák
    frontend-frameworks-en/POWER.md            Frontend frameworks and rendering strategies
tools/
  render-check.mjs                             layout check + PNG export via /render
skills/powermd/SKILL.md                        Claude skill: how decks are written and checked
```

## Checking a deck

```bash
cd tools && npm install
node tools/render-check.mjs courses/web-programming-1/frontend-frameworks/POWER.md
```

Prints layout errors and warnings, and saves one PNG per slide to `render-out/` next to the deck.

Open a deck: `https://powermd.atom-forge.eu/play?src=https://raw.githubusercontent.com/laborci/slides/main/<path>/POWER.md`

