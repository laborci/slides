---
name: powermd
description: Write, edit and check PowerMD (pwmd) slide decks kept in the GitHub repo laborci/slides. Use when the user asks for a presentation, deck or slides (prezentáció, diasor, előadás), or to change, fix or check one in that repo, or mentions PowerMD / pwmd / POWER.md.
---

# PowerMD decks (laborci/slides)

PowerMD turns Markdown into a 16:9 presentation that runs entirely in the browser at https://powermd.atom-forge.eu/. Before writing directives, fetch the current syntax reference: https://powermd.atom-forge.eu/syntax.md (it changes; don't rely on memory).

## Where decks live

The public repo `laborci/slides` (branch `main`):

```
courses/<course>/<deck>/POWER.md     one folder per deck, the deck is always POWER.md
courses/<course>/<deck>/images/…     assets next to it, referenced as ./images/x.png
tools/render-check.mjs               layout checker (see below)
skills/powermd/SKILL.md              this skill
```

- A translation is a separate deck folder with a language suffix: `frontend-frameworks/` (Hungarian) and `frontend-frameworks-en/`.
- Folder names are lowercase kebab-case, ASCII only.
- A deck that doesn't belong to a course goes under a new top-level folder; ask the user which one.

## Getting the files

Pick the lightest way that fits the environment:

- **Repo already checked out:** work there; `git pull` first.
- **One deck, with git:**
  ```bash
  git clone --filter=blob:none --sparse git@github.com:laborci/slides.git
  cd slides && git sparse-checkout set tools courses/<course>/<deck>
  ```
- **One file, no clone (gh CLI):**
  - read: `gh api repos/laborci/slides/contents/<path> -q .content | base64 -d`
  - write: `gh api -X PUT repos/laborci/slides/contents/<path> -f message=… -f content="$(base64 -i POWER.md)" -f sha=<sha from the read>`
  - A stale `sha` is rejected, so a concurrent change is never overwritten.

Edit the source file only. Never paste into the PowerMD web editor as a way of editing.

## Showing a deck

Once pushed, a deck opens straight from GitHub:

```
https://powermd.atom-forge.eu/play?src=https://raw.githubusercontent.com/laborci/slides/main/courses/<course>/<deck>/POWER.md
```

Relative asset paths resolve against that URL. raw.githubusercontent.com may serve the old version for a few minutes after a push. A query string doesn't bypass that cache, so to check a fresh push, put the commit SHA in place of `main` in the URL.

## Checking a deck (do this after every edit)

`tools/render-check.mjs` pastes the deck into https://powermd.atom-forge.eu/render in headless Chrome. It prints every layout problem and saves one PNG per slide (with every reveal step shown) into `render-out/` next to the deck. That folder is gitignored.

```bash
cd tools && npm install        # once; needs puppeteer-core and a local Chrome
node tools/render-check.mjs courses/<course>/<deck>/POWER.md [--no-images] [--json] [--out dir]
```

- **Chrome location:** set `CHROME_PATH` if Chrome isn't at the macOS default path.
- **Exit codes:** 0 = no errors, 1 = errors, 2 = the script itself failed.
- **Severity:** `error` means content is cut off; `warning` means content reaches into the bottom padding ("crowded").
- **Goal:** 0 errors and 0 warnings. Then look at the PNGs of the slides you touched, because the checker can't see a diagram that fits but is too small to read.
- **Limit:** /render gets the text only, with no base URL. Relative images therefore don't load there; check those slides in /play.

No Chrome or Node available (e.g. a sandbox without a browser)? Say so. Keep the slides conservative using the sizing notes below, and ask the user to open the /play link.

## House style

- **Frontmatter:** `title:` plus `code-scale: 70%` for code-heavy decks.
- **Presenter notes:** every slide gets one, as an `<!-- @note -->` blockquote. Facts that don't fit on the slide go there.
- **Opening:**
  - Start with a title slide.
  - No agenda slide unless asked.
  - **Length:** a course chapter fits in **20–30 slides**. Don't give each subchapter its own divider slide; put a small `## 8.x` label at the top of the slide instead. Use one shared misconceptions slide per chapter, not one per subchapter, and move detail into the notes.
  - Each subchapter gets its own accent colour (`@slide-theme <base> <accent> <frame>`).
- **Content:**
  - One idea per panel.
  - 3–6 short bullets, not paragraphs.
  - Prefer a table or a two-panel comparison over a wall of text.
  - Use `@reveal` for a punchline or a question.
- **Facts:** check anything recent (versions, acquisitions, release years) on the web before stating it.

## Sizing notes (learned the hard way)

- **Canvas:** 1920×1080, and all text is relative to its width, so the same deck looks identical everywhere.
- **Code at `code-scale: 70%`:**
  - about 37 characters per line in a half-width panel;
  - about 44 per line in the wide panel of an `AABBB` layout.
  - `@contain` clips code instead of shrinking it, so shorten lines or lower the scale.
- **Narrow panels:** in quarter-width panels (e.g. `AAAA/BCDE`), long Hungarian words overflow; use `@set-scale 85%` there.
- **Tables:**
  - 4+ columns: 70–85%;
  - 6 columns or long cells: 65–70%.
  - Set `@set-scale` before the table.
- **Mermaid inside `@contain`:** the diagram scales to the panel width. A wide, short diagram (longer labels, `LR`) fits better than a tall one. `@width 90%` before it sometimes helps and sometimes makes it overflow, so check.
- **Mermaid `timeline` (history slides):**
  - It renders huge, black boxes by default, and `@contain` alone does not shrink it.
  - Working recipe, about 4 periods with 1–2 short events each (no `:` or `**` inside events):
    - `@layout A/B/B/B/B/B collapse`;
    - panel A holds `@scale 80%` and the `#` heading;
    - panel B holds `@contain` and the mermaid block;
    - the first line of the mermaid block is `%%{init: {"themeVariables": {"fontSize": "14px", "cScale0": "<accent-900 hex>", "cScaleLabel0": "#ffffff", …}}}%%`, with the same pair repeated for cScale1–3.
- **Video (`@youtube`):**
  - Headless /render shows an empty frame, and it does not flag a video that runs off the slide, so check the PNG.
  - House style: one video per slide, no text, `<!-- @cover -->` then `<!-- @youtube -->` and the link. The video fills the whole slide. Before it, a title slide with only `# <Name> in 100 seconds`, centred between two `@space` directives. For a video that isn't from the 100-seconds series, the title slide shows the video's own title.
  - A vertical YouTube Short goes in the middle third of the slide: `<!-- @layout .A. collapse -->`, then `@cover` and `@youtube` as above. To tell whether a video is a Short, check its page for `"isShortsEligible":true`.
- **Callouts:** a callout below a table or code is the usual cause of "crowded" warnings. Move the extra sentence into the note first.
- **Order of fixes for a crowded slide:** move text to the note, then split the slide, then reduce scale. Don't go below about 65%.
