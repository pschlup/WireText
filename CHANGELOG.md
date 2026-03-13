# Changelog

All notable changes to WireText are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
WireText uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] — 2026-03-13

### Added
- Initial release: WireText DSL renderer for Claude Code Desktop
- 67 components across 6 categories (primitives, form, data, navigation, containers, compound)
- `screen`, `journey`, `macro` block types
- Zone layout system (`@header`, `@sidebar`, `@main`, `@aside`, `@footer`)
- Overlay system — modals and drawers via `#id` anchors
- Interactive navigation JS for multi-screen flows
- 5 built-in themes (`saas-light`, `saas-dark`, `marketing`, `mobile-light`, `mobile-dark`)
- Self-contained renderer bundled into skill (`render.cjs` via esbuild)
- `/wiretext` Claude Code skill with `--install-skill` CLI flag
- `install.sh` for git-clone-based installs (no global CLI required)
