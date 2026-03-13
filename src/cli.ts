#!/usr/bin/env node
// wiretext CLI — renders a wiretext markdown file to a standalone HTML preview.
// Usage:
//   wiretext <input.md> [output.html]    Render wiretext to HTML
//   wiretext --install-skill             Copy the Claude Code skill to ~/.claude/skills/wiretext/

import { Window } from "happy-dom"
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { createRequire } from "module"
import { parseDocument, renderDocument } from "./index.js"

// Read version from package.json at runtime (avoids hardcoding it here).
const require = createRequire(import.meta.url)
const { version } = require("../package.json") as { version: string }

// Bootstrap a DOM shim before renderDocument is called.
// The renderer uses document.createElement internally; component registrations
// are lazy (closures) so this only needs to be set before the first render call.
const win = new Window()
Object.assign(globalThis, {
  document:    win.document,
  window:      win,
  HTMLElement: win.HTMLElement,
  Node:        win.Node,
})

const [, , arg1, arg2] = process.argv

// ── --version / --help ───────────────────────────────────────────────────────
if (arg1 === "--version" || arg1 === "-v") {
  console.log(`wiretext v${version}`)
  process.exit(0)
}

if (arg1 === "--help" || arg1 === "-h") {
  console.log(`wiretext v${version} — UI mocking DSL renderer`)
  console.log("")
  console.log("Usage:")
  console.log("  wiretext <input.md> [output.html]   Render wiretext to HTML")
  console.log("  wiretext --install-skill             Install the Claude Code skill")
  console.log("  wiretext --version                   Print version")
  process.exit(0)
}

// ── --install-skill ─────────────────────────────────────────────────────────
// Copies skill/SKILL.md from the npm package to ~/.claude/skills/wiretext/
// so Claude Code Desktop can discover it as the /wiretext slash command.
if (arg1 === "--install-skill") {
  // dist/cli.js is at <package>/dist/cli.js → ../skill/SKILL.md resolves to <package>/skill/SKILL.md
  const skillSrc  = new URL("../skill/SKILL.md", import.meta.url)
  const home      = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "~"
  const skillDir  = join(home, ".claude", "skills", "wiretext")
  const skillDest = join(skillDir, "SKILL.md")

  if (!existsSync(fileURLToPath(skillSrc))) {
    console.error("Skill file not found at", fileURLToPath(skillSrc))
    console.error("Try reinstalling wiretext: npm install -g wiretext")
    process.exit(1)
  }

  mkdirSync(skillDir, { recursive: true })
  copyFileSync(fileURLToPath(skillSrc), skillDest)
  console.log("✅ Skill installed to", skillDest)
  console.log("   Restart Claude Code Desktop and try: /wiretext a SaaS dashboard")
  process.exit(0)
}

// ── render mode ─────────────────────────────────────────────────────────────
const inputFile  = arg1
const outputFile = arg2

if (!inputFile) {
  console.error("Usage:")
  console.error("  wiretext <input.md> [output.html]   Render wiretext to HTML")
  console.error("  wiretext --install-skill             Install the Claude Code skill")
  process.exit(1)
}

const outFile = outputFile ?? inputFile.replace(/\.md$/, ".html")

const markdown = readFileSync(inputFile, "utf-8")
const { blocks, errors: parseErrors } = parseDocument(markdown)

if (parseErrors.length > 0) {
  console.error("Parse errors:", JSON.stringify(parseErrors, null, 2))
}

if (blocks.length === 0) {
  console.error("No wiretext blocks found in", inputFile)
  process.exit(1)
}

const { html, errors: renderErrors } = renderDocument(blocks)

if (renderErrors.length > 0) {
  console.error("Render errors:", JSON.stringify(renderErrors, null, 2))
}

writeFileSync(outFile, html, "utf-8")
console.log(`Wrote ${outFile} (${html.length} bytes, ${blocks.length} block(s))`)
