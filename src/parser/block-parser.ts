// Block detection and header parsing — PROJECT.md §Block Format
// Extracts ```wiretext fenced blocks from markdown, splits on ---, parses flat headers.

import type { WireTextBlock, BlockType, ParseError } from "../types.js"

export interface ParseResult {
  blocks: WireTextBlock[]
  errors: ParseError[]
}

// Valid block types as a set for O(1) lookup
const VALID_BLOCK_TYPES = new Set<BlockType>(["macro", "theme", "screen", "journey"])

// Valid header keys per block type — unrecognized keys produce a warn, not an error
const VALID_HEADER_KEYS: Record<BlockType, Set<string>> = {
  screen:  new Set(["theme", "use"]),
  macro:   new Set(["use"]),
  journey: new Set(["theme", "use", "screens"]),
  theme:   new Set(["extends"]),
}

// Array-valued header keys — parsed as string[] when present
const ARRAY_HEADER_KEYS = new Set(["use", "screens"])

// ID must be lowercase alphanumeric + dashes only
const VALID_ID_PATTERN = /^[a-z0-9-]+$/

/**
 * Scans a markdown string for ```wiretext fenced code blocks.
 * Returns each block's raw content (text between fences, fence lines excluded)
 * and its 0-indexed ordinal position in the document.
 *
 * Only backtick fences are supported — ~~~wiretext is intentionally ignored per spec.
 */
export function extractBlocks(markdown: string): Array<{ content: string; position: number }> {
  const results: Array<{ content: string; position: number }> = []
  const lines = markdown.split("\n")

  let insideWiretext = false
  let blockLines: string[] = []
  let ordinal = 0

  for (const line of lines) {
    if (!insideWiretext) {
      // Opening fence: must be exactly ```wiretext (optionally with trailing whitespace)
      // Tilde fences (~~~wiretext) are explicitly not supported.
      if (/^```wiretext\s*$/.test(line)) {
        insideWiretext = true
        blockLines = []
      }
      // Any other fence (```js, ```mermaid, etc.) is ignored — we only extract wiretext blocks
    } else {
      // Closing fence: any line starting with ``` ends the block
      if (/^```\s*$/.test(line)) {
        results.push({ content: blockLines.join("\n"), position: ordinal++ })
        insideWiretext = false
        blockLines = []
      } else {
        blockLines.push(line)
      }
    }
  }

  // Unclosed fence: discard the incomplete block (no partial results)
  return results
}

/**
 * Parses a raw block content string (text between fences) into a WireTextBlock.
 *
 * Header/body are split on the first line that is exactly `---`.
 * Fatal errors (missing separator, invalid type) cause block: null to be returned.
 * Non-fatal issues (empty body, unrecognized header keys) produce warnings and
 * the block is still returned.
 */
export function parseBlock(
  content: string,
  position: number,
): { block: WireTextBlock | null; errors: ParseError[] } {
  const errors: ParseError[] = []
  const lines = content.split("\n")

  // Find the first occurrence of the --- separator
  const separatorIndex = lines.findIndex(line => line === "---")

  if (separatorIndex === -1) {
    errors.push({
      severity: "error",
      message: "Missing --- separator",
      line: 1,
      blockPosition: position,
    })
    return { block: null, errors }
  }

  const headerLines = lines.slice(0, separatorIndex)
  const bodyLines = lines.slice(separatorIndex + 1)

  // --- Parse the first header line: "type: id" ---

  const firstLine = headerLines[0]?.trim() ?? ""
  const typeIdMatch = firstLine.match(/^([^:]+):\s*(.+)$/)

  if (!typeIdMatch) {
    errors.push({
      severity: "error",
      message: `Invalid block header: expected "type: id", got "${firstLine}"`,
      line: 1,
      blockPosition: position,
    })
    return { block: null, errors }
  }

  const rawType = typeIdMatch[1]!.trim()
  const rawId = typeIdMatch[2]!.trim()

  // Validate block type
  if (!VALID_BLOCK_TYPES.has(rawType as BlockType)) {
    errors.push({
      severity: "error",
      message: `Unknown block type "${rawType}": expected one of macro, theme, screen, journey`,
      line: 1,
      blockPosition: position,
    })
    return { block: null, errors }
  }
  const blockType = rawType as BlockType

  // Validate block ID
  if (!VALID_ID_PATTERN.test(rawId)) {
    errors.push({
      severity: "error",
      message: `Invalid block ID "${rawId}": must match [a-z0-9-]+ (lowercase, alphanumeric, dashes only)`,
      line: 1,
      blockPosition: position,
    })
    return { block: null, errors }
  }

  // --- Parse remaining header lines: "key: value" pairs ---

  const header: Record<string, string | string[]> = {}
  const validKeys = VALID_HEADER_KEYS[blockType]

  for (let i = 1; i < headerLines.length; i++) {
    const rawLine = headerLines[i]!
    const trimmed = rawLine.trim()

    // Skip blank lines in the header section
    if (trimmed === "") continue

    const kvMatch = trimmed.match(/^([^:]+):\s*(.*)$/)
    if (!kvMatch) {
      errors.push({
        severity: "warn",
        message: `Skipping malformed header line: "${trimmed}"`,
        // Header lines are above the body, so line numbers here are 1-indexed within the header
        line: i + 1,
        blockPosition: position,
      })
      continue
    }

    const key = kvMatch[1]!.trim()
    const value = kvMatch[2]!.trim()

    // Warn on unrecognized header keys — but still store them, last-writer-wins
    if (!validKeys.has(key)) {
      errors.push({
        severity: "warn",
        message: `Unrecognized header key "${key}" for block type "${blockType}"`,
        line: i + 1,
        blockPosition: position,
      })
    }

    // Parse array syntax: "key: [a, b, c]"
    if (ARRAY_HEADER_KEYS.has(key) && value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1)
      // Split on ", " (comma + space) and trim each item to handle loose formatting
      const items = inner.split(",").map(s => s.trim()).filter(s => s.length > 0)
      header[key] = items
    } else {
      header[key] = value
    }
  }

  // --- Parse the body ---

  // Trim leading and trailing blank lines from the body, but preserve internal whitespace
  let bodyStart = 0
  let bodyEnd = bodyLines.length - 1

  while (bodyStart <= bodyEnd && bodyLines[bodyStart]!.trim() === "") {
    bodyStart++
  }
  while (bodyEnd >= bodyStart && bodyLines[bodyEnd]!.trim() === "") {
    bodyEnd--
  }

  const body = bodyStart > bodyEnd
    ? ""
    : bodyLines.slice(bodyStart, bodyEnd + 1).join("\n")

  if (body === "") {
    errors.push({
      severity: "warn",
      message: "Block body is empty",
      line: separatorIndex + 2, // line after the --- separator
      blockPosition: position,
    })
  }

  const block: WireTextBlock = {
    type:     blockType,
    id:       rawId,
    position,
    header,
    body,
  }

  return { block, errors }
}

/**
 * Top-level entry point: parse all wiretext blocks in a markdown document.
 *
 * Extracts all ```wiretext fenced blocks, parses each one, and accumulates
 * both the successfully parsed blocks and any errors encountered.
 * An error in one block never prevents parsing of subsequent blocks.
 */
export function parseDocument(markdown: string): ParseResult {
  const blocks: WireTextBlock[] = []
  const errors: ParseError[] = []

  for (const { content, position } of extractBlocks(markdown)) {
    const result = parseBlock(content, position)

    errors.push(...result.errors)

    if (result.block !== null) {
      blocks.push(result.block)
    }
  }

  return { blocks, errors }
}

// Exported for tests
export type { WireTextBlock, BlockType, ParseError }
