#!/usr/bin/env npx tsx
// CLI render script — reads a .md file and writes the HTML artifact.
// Uses happy-dom to provide the DOM environment that renderDocument needs.
import { readFileSync, writeFileSync } from "fs"
import { Window } from "happy-dom"

// Bootstrap a global DOM so renderDocument can use document.createElement etc.
const window = new Window()
Object.assign(globalThis, {
  document:  window.document,
  window,
  HTMLElement: window.HTMLElement,
  Node:        window.Node,
})

// Import after DOM is available — renderer modules register on import.
const { parseDocument, renderDocument } = await import("./src/index.js")

const inputFile  = process.argv[2] ?? "test.md"
const outputFile = process.argv[3] ?? inputFile.replace(/\.md$/, ".html")

const markdown = readFileSync(inputFile, "utf-8")
const { blocks, errors: parseErrors } = parseDocument(markdown)

if (parseErrors.length > 0) {
  console.error("Parse errors:", parseErrors)
}

if (blocks.length === 0) {
  console.error("No wiretext blocks found in", inputFile)
  process.exit(1)
}

const { html, errors: renderErrors } = renderDocument(blocks)

if (renderErrors.length > 0) {
  console.error("Render errors:", renderErrors)
}

writeFileSync(outputFile, html, "utf-8")
console.log(`Wrote ${outputFile} (${html.length} bytes, ${blocks.length} block(s))`)
