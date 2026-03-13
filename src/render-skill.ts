#!/usr/bin/env node
// render-skill.ts — Minimal standalone renderer bundled into skill/tools/render.cjs
// Called by the /wiretext Claude skill:
//   node ~/.claude/skills/wiretext/render.cjs <input.md> [output.html]
//
// Intentionally avoids import.meta so it can be bundled as CJS (required by happy-dom's
// internal require() calls).

import { Window } from "happy-dom"
import { readFileSync, writeFileSync } from "fs"
import { parseDocument, renderDocument } from "./index.js"

const win = new Window()
Object.assign(globalThis, {
  document:    win.document,
  window:      win,
  HTMLElement: win.HTMLElement,
  Node:        win.Node,
})

const [, , inputFile, outputFile] = process.argv

if (!inputFile) {
  console.error("Usage: node render.cjs <input.md> [output.html]")
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
