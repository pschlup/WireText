# WireText — TODO & Roadmap

Remaining gaps, known issues, and future features. MVP = what we're shipping now (Claude Code Desktop). V1 = first public release. V2+ = later.

---

## MVP (in progress)

- [x] Core library — block parser, body DSL parser, layout engine, 53 component renderers, theme system, macro composition, interactions
- [x] Layout CSS injection bug fixed (`WIRETEXT_CSS` now passed to `assembleArtifact`)
- [ ] Claude skill (`/wiretext`) generates DSL **and** renders via bash → HTML artifact in Claude Code Desktop
- [ ] Spec behavioral gaps fixed (overlay chaining, `!back` disabled state, N>4 row inference, breadcrumb last-item transition, link `|url` vs `→` precedence)
- [ ] README rewrite — installation, setup, Claude Code Desktop workflow
- [ ] All PRD epics marked done
- [ ] Choose a license. Not MIT? MIT for generated HTML, something else for the library?

---

## V1 — First Public Release

### Distribution
- [ ] Publish to npm (`npm publish`)
- [ ] `npx wiretext render <file.md>` CLI — takes markdown, writes self-contained HTML to stdout or a file
- [ ] Build browser bundle (IIFE/UMD) for CDN use — `renderDocument()` has no Node.js dependencies, will work in browser
- [ ] jsDelivr CDN availability auto-follows npm publish

### Web Playground (wiretext.org)
- [ ] Live editor: WireText DSL on the left, rendered preview on the right
- [ ] Shareable URLs (DSL encoded in hash or short-link)
- [ ] Example gallery — dashboard, onboarding journey, settings, pricing, empty states
- [ ] "Open in Claude Code" button that copies the prompt to clipboard

### Rendered Artifact UX
- [ ] "Copy markup" button in rendered artifact — copies raw WireText back to clipboard for editing (closes the iteration loop)
- [ ] "Download HTML" button — exports the self-contained prototype as a `.html` file
- [ ] Dark mode toggle button in rendered output (saas-dark theme is already built)
- [ ] Better inline error display — parse errors shown as styled callouts inside the render, not raw text

### Chart Rendering
- [ ] Real per-type chart skeletons using inline SVG — currently all chart types render an identical placeholder `<div>`
  - `line` → simple SVG polyline trend
  - `bar` → SVG bar columns
  - `pie`/`donut` → SVG arc slices
  - `area` → SVG filled area

### Developer Experience
- [ ] `WireTextPlugin` interface actually implemented as a class (currently defined in types but nothing uses it — good for third-party renderers)
- [ ] Improve error messages with line numbers and column positions
- [ ] `vitest --coverage` and enforce a coverage threshold

---

## V2 — Ecosystem & Editor Integration

### Claude.ai (Web) Rendering
- [ ] The skill produces a self-rendering HTML artifact that loads the renderer from CDN
- [ ] Requires: browser bundle + npm publish (both V1 prereqs)

### Editor Plugins
- [ ] **VS Code extension** — inline preview of `wiretext` fenced blocks, like Mermaid's VS Code integration
- [ ] **Obsidian plugin** — renders wiretext blocks inside notes
- [ ] Language support extension — syntax highlighting for `.wiretext` files

### Markdown Ecosystem Plugins
- [ ] `remark-wiretext` — renders wiretext blocks in Remark pipelines (Astro, Docusaurus, Next.js MDX, etc.)
- [ ] `rehype-wiretext` — Rehype version for HTML pipelines
- [ ] `markdown-it-wiretext` — for Vitepress, Hexo, etc.
- [ ] GitHub rendering — requires a GitHub App or GitHub to natively support wiretext (long shot; remark plugin is the practical path)

### File-Based Projects (Phase 3 from spec)
- [ ] `{id}.wiretext` file lookup — `use:` and `screens:` resolved from files, not just document blocks
- [ ] Filename/ID validation (warn when filename doesn't match block ID)
- [ ] Unresolved `screens:` reference in file project → error (vs. warn+skip in document context)
- [ ] `wiretext validate <dir>` CLI command

---

## V3 — Collaborative & Advanced

### Theme Ecosystem
- [ ] **User-defined local themes** — load `.wiretext` theme files from a well-known directory (e.g. `~/.claude/skills/wiretext/themes/`) so personal or project themes are available to the skill without being defined inline in every document. The skill would scan that folder at render time and pass discovered theme blocks to the resolver before processing the document.
- [ ] Theme sharing via npm package (`wiretext-theme-<name>`)
- [ ] Theme sharing via URL reference in `extends:` header
- [ ] Community theme registry

### Export & Handoff
- [ ] Export journey as animated GIF / video walkthrough
- [ ] Export to HTML prototype with real routing (React or plain HTML)
- [ ] "Open in Figma" — experimental; map WireText components to Figma primitives via Figma REST API

### Journey Enhancements
- [ ] Animated screen transitions (CSS transitions between journey screens)
- [ ] Journey progress indicator (step N of M shown automatically)
- [ ] Conditional branching in journeys (show different screens based on a choice — requires minimal state model)

### Collaboration
- [ ] Multi-user live editing in the web playground
- [ ] Comments on screens (`// comment` lines ignored by renderer)
- [ ] Version history for `.wiretext` files (git-friendly diff format)

---

## Known Spec / Debt Items

- [x] README `theme:` example block was missing `tokens:` wrapper — fixed
- [x] `CONTRIBUTING.md` did not exist — created
- [x] "For AI systems" section in README was empty — filled in
- [ ] Skill (`skill/SKILL.md`) hardcodes an absolute path (`/Users/pschlup/Projects/WireText/dist/index.js`) — needs to be made portable before the skill is useful to anyone else. V1 CLI would fix this naturally.
- [ ] `open` command in skill Step 4 is macOS-only — Linux needs `xdg-open`, Windows needs `start`
- [ ] Plugin interface (`WireTextPlugin`, `Resolver`) is exported from `types.ts` but no concrete implementation exists — fine for now, needed for V2 plugins
- [ ] `saas-dark` theme exists and works but is not demonstrated anywhere in docs or examples
