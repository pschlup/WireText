// parseBody() public API — dispatches to the component tree parser or theme key-value parser.
// Theme blocks: flat key-value token definitions.
// Screen/macro/journey blocks: indentation-based component tree via tokenizer + tree builder.
import type { ParsedBody, BlockType, ParseError } from "../types.js"
import { tokenize } from "./tokenizer.js"
import { buildTree } from "./tree-builder.js"

export interface BodyParseResult {
  body:   ParsedBody
  errors: ParseError[]
}

// Known theme token keys per PROJECT.md §Theme Tokens
const KNOWN_THEME_TOKENS = new Set([
  "primary", "surface", "border", "text", "muted", "danger", "success",
  "radius", "font", "size",
])

/**
 * Parse a block body string into a ParsedBody, given the block type.
 *
 * - `theme` blocks: body is flat key-value lines; populates tokens, leaves zones/overlays/screens empty.
 * - `screen`/`macro`/`journey` blocks: body is the indentation-based component DSL.
 *
 * Errors are collected and returned alongside partial results — invalid input never throws.
 */
export function parseBody(
  bodyStr:       string,
  blockType:     BlockType,
  blockPosition: number = 0,
): BodyParseResult {
  if (blockType === "theme") {
    return parseThemeBody(bodyStr, blockPosition)
  }

  const { tokens, errors: tokenErrors } = tokenize(bodyStr, blockPosition)
  const { body,   errors: treeErrors }  = buildTree(tokens, blockType, blockPosition)

  return {
    body,
    errors: [...tokenErrors, ...treeErrors],
  }
}

// ---------------------------------------------------------------------------
// Theme body: flat key-value lines  (key: value)
// ---------------------------------------------------------------------------

function parseThemeBody(bodyStr: string, blockPosition: number): BodyParseResult {
  const errors: ParseError[] = []
  const themeTokens: Record<string, string> = {}
  const lines = bodyStr.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line    = lines[i]!.trim()

    if (line === "" || line.startsWith("//") || line.startsWith("#")) continue

    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) {
      errors.push({
        severity:      "warn",
        message:       `Unrecognized theme token line: "${line}"`,
        line:          lineNum,
        blockPosition,
      })
      continue
    }

    const key   = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    if (!KNOWN_THEME_TOKENS.has(key)) {
      errors.push({
        severity:      "warn",
        message:       `Unknown theme token key "${key}" — valid keys: ${[...KNOWN_THEME_TOKENS].join(", ")}`,
        line:          lineNum,
        blockPosition,
      })
      continue
    }

    themeTokens[key] = value
  }

  if (Object.keys(themeTokens).length === 0) {
    errors.push({
      severity:      "warn",
      message:       `Theme body contains no recognizable token definitions`,
      line:          1,
      blockPosition,
    })
  }

  const body: ParsedBody = {
    zones:    new Map(),
    overlays: new Map(),
    screens:  new Map(),
    tokens:   themeTokens,
  }

  return { body, errors }
}
