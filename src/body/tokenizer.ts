// Tokenizer for the WireText body DSL — converts raw body lines into indent-level tokens.
// Validates indentation rules: 2-space multiples, no tabs, no jump > 1 level upward.
import type { ParseError } from "../types.js"

/** A single tokenized body line with indentation level and trimmed content. */
export interface LineToken {
  /** Indentation level (0-indexed). Each level = 2 leading spaces. */
  indent:  number
  /** Trimmed line content. */
  content: string
  /** 1-indexed original line number within the block body. */
  lineNum: number
}

/**
 * Tokenize a block body string into indent-level tokens.
 * Blank lines are skipped. Invalid indentation produces ParseError entries.
 * The returned tokens array may be incomplete when errors occur, but partial
 * results are always returned alongside errors.
 */
export function tokenize(
  body: string,
  blockPosition: number,
): { tokens: LineToken[]; errors: ParseError[] } {
  const lines  = body.split("\n")
  const tokens: LineToken[] = []
  const errors: ParseError[] = []
  let prevIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const raw     = lines[i] ?? ""

    // Skip fully blank lines
    if (raw.trim() === "") continue

    // Detect tab characters in indentation prefix
    const firstNonWhitespace = raw.search(/[^ \t]/)
    const indentStr = firstNonWhitespace === -1 ? raw : raw.slice(0, firstNonWhitespace)

    if (indentStr.includes("\t")) {
      errors.push({
        severity:      "error",
        message:       "Tab character in indentation — use 2 spaces per level",
        line:          lineNum,
        blockPosition,
      })
      // Still try to parse the content with best-effort tab-to-space conversion
      const content = raw.trim()
      const tabCount = (indentStr.match(/\t/g) ?? []).length
      const spaceCount = (indentStr.match(/ /g) ?? []).length
      if (tabCount > 0 && spaceCount > 0) {
        errors.push({
          severity:      "error",
          message:       "Mixed tabs and spaces in indentation",
          line:          lineNum,
          blockPosition,
        })
      }
      // Best effort: count tabs as one level each
      const indent = tabCount
      tokens.push({ indent, content, lineNum })
      prevIndent = indent
      continue
    }

    // Count leading spaces
    const spaceCount = indentStr.length
    if (spaceCount % 2 !== 0) {
      errors.push({
        severity:      "error",
        message:       `Indentation must be a multiple of 2 spaces (found ${spaceCount})`,
        line:          lineNum,
        blockPosition,
      })
      // Best effort: round down to nearest valid level
      const indent  = Math.floor(spaceCount / 2)
      const content = raw.trim()
      tokens.push({ indent, content, lineNum })
      prevIndent = indent
      continue
    }

    const indent  = spaceCount / 2
    const content = raw.trim()

    // Validate: indent jump > 1 level upward is an error
    // (de-indenting by multiple levels is valid — it closes multiple nesting levels)
    if (indent > prevIndent + 1) {
      errors.push({
        severity:      "error",
        message:       `Indentation jump too large: went from level ${prevIndent} to level ${indent} (max +1)`,
        line:          lineNum,
        blockPosition,
      })
      // Best effort: clamp to prevIndent + 1
      const clampedIndent = prevIndent + 1
      tokens.push({ indent: clampedIndent, content, lineNum })
      prevIndent = clampedIndent
      continue
    }

    tokens.push({ indent, content, lineNum })
    prevIndent = indent
  }

  return { tokens, errors }
}
